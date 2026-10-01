"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TournamentTabsProps = {
  tournamentId: string;
  standings: any[];
  pairings: any[];
  streamUrl?: string | null;
  status?: string | null;
};

export default function TournamentTabs({
  tournamentId,
  standings,
  pairings,
  streamUrl,
  status,
}: TournamentTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRound, setSelectedRound] = useState("all");

  const [resolvedYouTubeVideoId, setResolvedYouTubeVideoId] =
    useState<string | null>(null);

  const [youtubeChannelId, setYoutubeChannelId] =
    useState<string | null>(null);

  const [youtubeResolving, setYoutubeResolving] =
    useState(false);

  const [youtubeResolveError, setYoutubeResolveError] =
    useState<string | null>(null);

  const isUpcoming = status === "upcoming";

  const tabs = [
    { id: "overview", label: "Overview" },
    ...(!isUpcoming
      ? [
          { id: "standings", label: "Standings" },
          { id: "pairings", label: "Pairings" },
          { id: "results", label: "Results" },
        ]
      : []),
    { id: "stream", label: "Stream" },
  ];

  const rounds = Array.from(
    new Set(pairings.map((pairing) => pairing.round ?? 0))
  ).sort((a, b) => a - b);

  const filteredPairings =
    selectedRound === "all"
      ? pairings
      : pairings.filter(
          (pairing) =>
            String(pairing.round ?? 0) === selectedRound
        );

  const completedResults = filteredPairings.filter(
    (pairing) => pairing.status === "completed"
  );

  const groupByRound = (matches: any[]) => {
    const groups: Record<string, any[]> = {};

    matches.forEach((match) => {
      const round = String(match.round ?? 0);

      if (!groups[round]) {
        groups[round] = [];
      }

      groups[round].push(match);
    });

    return Object.entries(groups);
  };

  const getPlayer = (players: any) => {
    if (Array.isArray(players)) {
      return players[0] ?? null;
    }

    return players ?? null;
  };

  /*
   * -------------------------------------------------------
   * STREAM DETECTION
   * -------------------------------------------------------
   */

  const isYouTubeUrl = (url?: string | null) => {
    if (!url) {
      return false;
    }

    return /youtube\.com|youtu\.be/i.test(url);
  };

  const isYouTubeChannelUrl = (url?: string | null) => {
    if (!url) {
      return false;
    }

    try {
      const parsed = new URL(url);

      const hostname =
        parsed.hostname.toLowerCase();

      if (
        hostname !== "youtube.com" &&
        hostname !== "www.youtube.com" &&
        hostname !== "m.youtube.com"
      ) {
        return false;
      }

      return /^\/@[^/]+\/?$/.test(
        parsed.pathname
      );
    } catch {
      return false;
    }
  };

  const getYouTubeVideoId = (url: string) => {
    try {
      const parsed = new URL(url);

      const hostname =
        parsed.hostname.toLowerCase();

      if (
        hostname === "youtu.be" ||
        hostname === "www.youtu.be"
      ) {
        return (
          parsed.pathname
            .split("/")
            .filter(Boolean)[0] ?? null
        );
      }

      if (
        hostname === "youtube.com" ||
        hostname === "www.youtube.com" ||
        hostname === "m.youtube.com"
      ) {
        const videoId =
          parsed.searchParams.get("v");

        if (videoId) {
          return videoId;
        }

        const embedMatch =
          parsed.pathname.match(
            /^\/embed\/([^/?]+)/
          );

        if (embedMatch) {
          return embedMatch[1];
        }

        const liveMatch =
          parsed.pathname.match(
            /^\/live\/([^/?]+)/
          );

        if (liveMatch) {
          return liveMatch[1];
        }

        const shortsMatch =
          parsed.pathname.match(
            /^\/shorts\/([^/?]+)/
          );

        if (shortsMatch) {
          return shortsMatch[1];
        }
      }

      return null;
    } catch {
      return null;
    }
  };

  /*
   * -------------------------------------------------------
   * RESOLVE YOUTUBE CHANNEL
   * -------------------------------------------------------
   */

  useEffect(() => {
    if (!streamUrl) {
      return;
    }

    if (!isYouTubeUrl(streamUrl)) {
      return;
    }

    const directVideoId =
      getYouTubeVideoId(streamUrl);

    if (
      directVideoId &&
      !isYouTubeChannelUrl(streamUrl)
    ) {
      setResolvedYouTubeVideoId(
        directVideoId
      );

      return;
    }

    if (!isYouTubeChannelUrl(streamUrl)) {
      return;
    }

    let cancelled = false;

    const resolveChannel = async () => {
      setYoutubeResolving(true);
      setYoutubeResolveError(null);
      setResolvedYouTubeVideoId(null);

      try {
        const response =
          await fetch(
            `/api/youtube-live?url=${encodeURIComponent(
              streamUrl
            )}`,
            {
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          throw new Error(
            data?.error ??
              "Failed to resolve YouTube channel"
          );
        }

        setYoutubeChannelId(
          data.channelId ?? null
        );

        setResolvedYouTubeVideoId(
          data.videoId ?? null
        );

        if (!data.videoId) {
          setYoutubeResolveError(
            "No live YouTube broadcast is currently available."
          );
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "YouTube resolver error:",
          error
        );

        setYoutubeResolveError(
          "Unable to find the current YouTube broadcast."
        );
      } finally {
        if (!cancelled) {
          setYoutubeResolving(false);
        }
      }
    };

    resolveChannel();

    return () => {
      cancelled = true;
    };
  }, [streamUrl]);

  /*
   * -------------------------------------------------------
   * STREAM PROVIDER
   * -------------------------------------------------------
   */

  const streamProvider =
    streamUrl
      ? /twitch\.tv/i.test(streamUrl)
        ? "Twitch"
        : /youtube\.com|youtu\.be/i.test(
            streamUrl
          )
        ? "YouTube"
        : "Stream"
      : "Stream";

  /*
   * -------------------------------------------------------
   * TWITCH
   * -------------------------------------------------------
   */

  const getTwitchEmbedUrl = (
    url: string
  ) => {
    try {
      const parsed = new URL(url);

      const hostname =
        parsed.hostname.toLowerCase();

      if (
        hostname !== "twitch.tv" &&
        hostname !== "www.twitch.tv"
      ) {
        return null;
      }

      const parent =
        window.location.hostname;

      const videoMatch =
        parsed.pathname.match(
          /^\/videos\/(\d+)/
        );

      if (videoMatch) {
        return (
          `https://player.twitch.tv/` +
          `?video=${encodeURIComponent(
            videoMatch[1]
          )}` +
          `&parent=${encodeURIComponent(
            parent
          )}` +
          `&muted=false`
        );
      }

      const clipMatch =
        parsed.pathname.match(
          /^\/[^/]+\/clip\/([^/?]+)/
        );

      if (clipMatch) {
        return (
          `https://player.twitch.tv/` +
          `?clip=${encodeURIComponent(
            clipMatch[1]
          )}` +
          `&parent=${encodeURIComponent(
            parent
          )}` +
          `&muted=false`
        );
      }

      const channel =
        parsed.pathname
          .split("/")
          .filter(Boolean)[0];

      if (!channel) {
        return null;
      }

      const reservedPaths = [
        "videos",
        "directory",
        "search",
        "settings",
        "downloads",
        "jobs",
        "p",
        "subscriptions",
      ];

      if (
        reservedPaths.includes(
          channel.toLowerCase()
        )
      ) {
        return null;
      }

      return (
        `https://player.twitch.tv/` +
        `?channel=${encodeURIComponent(
          channel
        )}` +
        `&parent=${encodeURIComponent(
          parent
        )}` +
        `&muted=false`
      );
    } catch {
      return null;
    }
  };

  /*
   * -------------------------------------------------------
   * STREAM EMBED URL
   * -------------------------------------------------------
   */

  let streamEmbedUrl: string | null =
    null;

  if (streamUrl) {
    if (isYouTubeUrl(streamUrl)) {
      const directVideoId =
        getYouTubeVideoId(streamUrl);

      if (
        directVideoId &&
        !isYouTubeChannelUrl(streamUrl)
      ) {
        streamEmbedUrl =
          `https://www.youtube.com/embed/` +
          `${encodeURIComponent(
            directVideoId
          )}?rel=0`;
      }

      if (
        isYouTubeChannelUrl(streamUrl) &&
        resolvedYouTubeVideoId
      ) {
        streamEmbedUrl =
          `https://www.youtube.com/embed/` +
          `${encodeURIComponent(
            resolvedYouTubeVideoId
          )}` +
          `?rel=0&autoplay=0`;
      }
    }

    if (
      /twitch\.tv/i.test(streamUrl)
    ) {
      streamEmbedUrl =
        getTwitchEmbedUrl(streamUrl);
    }
  }

  /*
   * -------------------------------------------------------
   * MATCH CARD
   * -------------------------------------------------------
   */

  const MatchCard = ({
    pairing,
  }: {
    pairing: any;
  }) => {
    const player1 =
      pairing.player1 ?? null;

    const player2 =
      pairing.player2 ?? null;

    const winnerId =
      pairing.winner_id ?? null;

    const player1Winner =
      winnerId &&
      player1?.id === winnerId;

    const player2Winner =
      winnerId &&
      player2?.id === winnerId;

    return (
      <div className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d10] transition hover:border-yellow-400/20">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              Table{" "}
              {pairing.table_number ?? "—"}
            </span>

            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-yellow-400">
              Completed
            </span>
          </div>

          <span className="text-xs font-medium text-zinc-600">
            Round{" "}
            {pairing.round ?? "—"}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
          {player1 ? (
            <Link
              href={`/players/${player1.id}`}
              className={`relative flex min-h-[118px] items-center p-5 transition ${
                player1Winner
                  ? "bg-yellow-400/[0.055]"
                  : "hover:bg-white/[0.02]"
              }`}
            >
              {player1Winner && (
                <div className="absolute inset-y-0 left-0 w-0.5 bg-yellow-400" />
              )}

              <div className="flex w-full items-center justify-between gap-4">
                <div className="min-w-0">
                  <p
                    className={`truncate text-base font-bold md:text-lg ${
                      player1Winner
                        ? "text-yellow-400"
                        : "text-white"
                    }`}
                  >
                    {player1.name}
                  </p>

                  {player1.country && (
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600">
                      {player1.country}
                    </p>
                  )}
                </div>

                {player1Winner && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-400 text-xs font-black text-black">
                    W
                  </div>
                )}
              </div>
            </Link>
          ) : (
            <div className="flex min-h-[118px] items-center p-5">
              <span className="text-sm text-zinc-600">
                Unknown player
              </span>
            </div>
          )}

          <div className="flex w-16 items-center justify-center border-x border-white/10 bg-white/[0.015]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#111114]">
              <span className="text-[9px] font-black tracking-[0.15em] text-zinc-600">
                VS
              </span>
            </div>
          </div>

          {player2 ? (
            <Link
              href={`/players/${player2.id}`}
              className={`relative flex min-h-[118px] items-center p-5 text-right transition ${
                player2Winner
                  ? "bg-yellow-400/[0.055]"
                  : "hover:bg-white/[0.02]"
              }`}
            >
              {player2Winner && (
                <div className="absolute inset-y-0 right-0 w-0.5 bg-yellow-400" />
              )}

              <div className="flex w-full items-center justify-between gap-4">
                {player2Winner && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-400 text-xs font-black text-black">
                    W
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-base font-bold md:text-lg ${
                      player2Winner
                        ? "text-yellow-400"
                        : "text-white"
                    }`}
                  >
                    {player2.name}
                  </p>

                  {player2.country && (
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600">
                      {player2.country}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex min-h-[118px] items-center justify-end p-5">
              <span className="text-sm text-zinc-600">
                Unknown player
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-black/10 px-5 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
            Match result
          </span>

          <span className="text-xs font-bold text-yellow-400">
            {pairing.winner?.name
              ? `${pairing.winner.name} won`
              : "Completed"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111114]">
      {/* TABS */}
      <div className="flex overflow-x-auto border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() =>
              setActiveTab(tab.id)
            }
            className={`whitespace-nowrap px-5 py-4 text-sm font-semibold ${
              activeTab === tab.id
                ? "border-b-2 border-yellow-400 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6 md:p-8">
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div>
            <h3 className="text-2xl font-bold">
              Tournament overview
            </h3>

            <p className="mt-2 max-w-2xl text-zinc-500">
              {isUpcoming
                ? "This tournament has not started yet."
                : "Tournament data is being collected and normalized by Pkm Live."}
            </p>

            {standings.length > 0 && !isUpcoming ? (
              (() => {
                const leader =
                  standings.find(
                    (entry: any) =>
                      Number(entry.rank) === 1
                  ) ?? standings[0];

                const player =
                  getPlayer(
                    leader.players
                  );

                return (
                  <div className="mt-6 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.04] p-6">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                          Current leader
                        </p>

                        <h4 className="mt-2 text-2xl font-black">
                          {player?.name ??
                            "Unknown player"}
                        </h4>

                        <p className="mt-1 text-sm text-zinc-500">
                          {player?.country ??
                            "Country unavailable"}
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <div className="rounded-xl bg-white/5 px-4 py-3 text-center">
                          <p className="text-xs uppercase tracking-wider text-zinc-500">
                            Rank
                          </p>

                          <p className="mt-1 text-xl font-bold">
                            #
                            {leader.rank ??
                              1}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/5 px-4 py-3 text-center">
                          <p className="text-xs uppercase tracking-wider text-zinc-500">
                            Record
                          </p>

                          <p className="mt-1 text-xl font-bold">
                            {leader.wins ??
                              0}
                            -
                            {leader.losses ??
                              0}
                            {leader.ties
                              ? `-${leader.ties}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    {player && (
                      <Link
                        href={`/players/${leader.player_id}`}
                        className="mt-5 inline-flex text-sm font-semibold text-yellow-400 hover:text-yellow-300"
                      >
                        View player profile →
                      </Link>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-white/10 p-8 text-center">
                <p className="text-zinc-500">
                  {isUpcoming
                    ? "Standings and match results will appear once the tournament begins."
                    : "Tournament overview information will appear here."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* STANDINGS */}
        {activeTab === "standings" && !isUpcoming && (
          <div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold">
                Standings
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                {standings.length} players imported from Limitless.
              </p>
            </div>

            {standings.length > 0 && (
              <div className="mb-8">
                <h4 className="text-lg font-bold">
                  Top 8
                </h4>

                <p className="mt-1 text-sm text-zinc-500">
                  Current top players from the imported standings.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {standings
                    .slice(0, 8)
                    .map(
                      (
                        entry: any,
                        index: number
                      ) => {
                        const player =
                          getPlayer(
                            entry.players
                          );

                        return (
                          <Link
                            key={`${entry.player_id}-${index}`}
                            href={`/players/${entry.player_id}`}
                            className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-yellow-400/30"
                          >
                            <div className="flex items-center justify-between">
                              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-400/10 text-sm font-black text-yellow-400">
                                #
                                {entry.rank ??
                                  index + 1}
                              </span>

                              <span className="text-xs text-zinc-500">
                                {entry.wins ??
                                  0}
                                -
                                {entry.losses ??
                                  0}
                              </span>
                            </div>

                            <p className="mt-4 truncate font-bold">
                              {player?.name ??
                                "Unknown player"}
                            </p>

                            <p className="mt-1 text-sm text-zinc-500">
                              {player?.country ??
                                "Country unavailable"}
                            </p>
                          </Link>
                        );
                      }
                    )}
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.03]">
                  <tr className="text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-5 py-4">
                      Rank
                    </th>
                    <th className="px-5 py-4">
                      Player
                    </th>
                    <th className="px-5 py-4">
                      Country
                    </th>
                    <th className="px-5 py-4">
                      W
                    </th>
                    <th className="px-5 py-4">
                      L
                    </th>
                    <th className="px-5 py-4">
                      T
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {standings.map(
                    (
                      entry: any,
                      index: number
                    ) => {
                      const player =
                        getPlayer(
                          entry.players
                        );

                      return (
                        <tr
                          key={`${entry.player_id}-${index}`}
                          className="border-b border-white/5 last:border-0"
                        >
                          <td className="px-5 py-4 font-bold">
                            {entry.rank ??
                              index + 1}
                          </td>

                          <td className="px-5 py-4">
                            {player ? (
                              <Link
                                href={`/players/${entry.player_id}`}
                                className="font-semibold hover:text-yellow-400"
                              >
                                {player.name}
                              </Link>
                            ) : (
                              "Unknown player"
                            )}
                          </td>

                          <td className="px-5 py-4 text-zinc-500">
                            {player?.country ??
                              "—"}
                          </td>

                          <td className="px-5 py-4">
                            {entry.wins ??
                              0}
                          </td>

                          <td className="px-5 py-4 text-zinc-400">
                            {entry.losses ??
                              0}
                          </td>

                          <td className="px-5 py-4 text-zinc-400">
                            {entry.ties ??
                              0}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PAIRINGS */}
        {activeTab === "pairings" && !isUpcoming && (
          <div>
            <h3 className="text-2xl font-bold">
              Pairings
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Player matchups by round
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedRound("all")
                }
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  selectedRound === "all"
                    ? "bg-yellow-400 text-black"
                    : "bg-white/5 text-zinc-400"
                }`}
              >
                All Rounds
              </button>

              {rounds.map((round) => (
                <button
                  key={round}
                  type="button"
                  onClick={() =>
                    setSelectedRound(
                      String(round)
                    )
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    selectedRound ===
                    String(round)
                      ? "bg-yellow-400 text-black"
                      : "bg-white/5 text-zinc-400"
                  }`}
                >
                  Round {round}
                </button>
              ))}
            </div>

            {filteredPairings.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-white/10 p-10 text-center">
                <p className="text-zinc-500">
                  No pairings available yet.
                </p>
              </div>
            ) : (
              <div className="mt-8 space-y-8">
                {groupByRound(
                  filteredPairings
                ).map(
                  ([round, matches]) => (
                    <div key={round}>
                      <div className="mb-4 flex items-center gap-3">
                        <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-400">
                          Round {round}
                        </h4>

                        <div className="h-px flex-1 bg-white/10" />

                        <span className="text-xs text-zinc-600">
                          {matches.length} matches
                        </span>
                      </div>

                      <div className="space-y-3">
                        {matches.map(
                          (pairing: any) => (
                            <div
                              key={pairing.id}
                              className="rounded-xl border border-white/10 bg-white/5 p-4"
                            >
                              <p className="font-bold text-white">
                                {pairing.player1?.name ??
                                  "Unknown"}{" "}
                                VS{" "}
                                {pairing.player2?.name ??
                                  "Unknown"}
                              </p>

                              <p className="mt-1 text-xs text-zinc-500">
                                Table{" "}
                                {pairing.table_number ??
                                  "—"}{" "}
                                ·{" "}
                                {pairing.status}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* RESULTS */}
        {activeTab === "results" && !isUpcoming && (
          <div>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-2xl font-bold">
                  Results
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                  Completed tournament matches, organized by round.
                </p>
              </div>

              {completedResults.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
                  <span className="h-2 w-2 rounded-full bg-yellow-400" />

                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                    {completedResults.length} completed
                  </span>
                </div>
              )}
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedRound("all")
                }
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  selectedRound === "all"
                    ? "bg-yellow-400 text-black"
                    : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                }`}
              >
                All Rounds
              </button>

              {rounds.map((round) => (
                <button
                  key={round}
                  type="button"
                  onClick={() =>
                    setSelectedRound(
                      String(round)
                    )
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    selectedRound ===
                    String(round)
                      ? "bg-yellow-400 text-black"
                      : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  Round {round}
                </button>
              ))}
            </div>

            {completedResults.length === 0 ? (
              <div className="mt-8 overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/[0.015]">
                <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                    <span className="h-3 w-3 rounded-full bg-zinc-600" />
                  </div>

                  <h4 className="mt-5 text-lg font-bold text-white">
                    No completed results
                  </h4>

                  <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                    Completed match results will appear here once
                    they are available from the tournament data.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-8 space-y-10">
                {groupByRound(
                  completedResults
                ).map(
                  ([round, matches]) => (
                    <section key={round}>
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-8 items-center rounded-lg bg-yellow-400/10 px-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-400">
                            Round {round}
                          </span>
                        </div>

                        <div className="h-px flex-1 bg-white/10" />

                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">
                          {matches.length}{" "}
                          {matches.length === 1
                            ? "match"
                            : "matches"}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {matches.map(
                          (pairing: any) => (
                            <MatchCard
                              key={pairing.id}
                              pairing={pairing}
                            />
                          )
                        )}
                      </div>
                    </section>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* STREAM */}
        {activeTab === "stream" && (
          <div>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-400">
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  </span>

                  <h3 className="text-2xl font-bold">
                    Live Stream
                  </h3>
                </div>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
                  Watch the tournament broadcast while keeping standings,
                  pairings, and results close at hand.
                </p>
              </div>

              {streamUrl && (
                <span className="inline-flex w-fit items-center rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-400">
                  {streamProvider}
                </span>
              )}
            </div>

            {streamUrl &&
              isYouTubeChannelUrl(streamUrl) &&
              youtubeResolving && (
                <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-black">
                  <div className="flex aspect-video flex-col items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-yellow-400" />

                    <p className="mt-4 text-sm font-semibold text-zinc-400">
                      Finding live broadcast…
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      Resolving YouTube channel
                    </p>
                  </div>
                </div>
              )}

            {streamUrl &&
              streamEmbedUrl &&
              !youtubeResolving && (
                <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/30">
                  <div className="flex items-center justify-between border-b border-white/10 bg-[#0d0d10] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />

                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                        Live tournament broadcast
                      </span>
                    </div>

                    <a
                      href={streamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-zinc-500 transition hover:text-yellow-400"
                    >
                      Open externally ↗
                    </a>
                  </div>

                  <div className="aspect-video w-full bg-black">
                    <iframe
                      className="h-full w-full"
                      src={streamEmbedUrl}
                      title="Tournament live stream"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

            {streamUrl &&
              isYouTubeChannelUrl(streamUrl) &&
              !youtubeResolving &&
              !resolvedYouTubeVideoId && (
                <div className="mt-7 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-yellow-400" />

                        <p className="text-sm font-bold text-white">
                          YouTube channel detected
                        </p>
                      </div>

                      <p className="mt-2 text-sm text-zinc-500">
                        {youtubeResolveError ??
                          "There is currently no live broadcast available."}
                      </p>

                      {youtubeChannelId && (
                        <p className="mt-2 text-[10px] font-mono text-zinc-700">
                          Channel:{" "}
                          {youtubeChannelId}
                        </p>
                      )}
                    </div>

                    <a
                      href={streamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-fit items-center rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-300"
                    >
                      Open YouTube ↗
                    </a>
                  </div>
                </div>
              )}

            {streamUrl &&
              !isYouTubeChannelUrl(streamUrl) &&
              !streamEmbedUrl && (
                <div className="mt-7 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {streamProvider} stream available
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        This stream cannot be embedded here, but you can watch it directly.
                      </p>
                    </div>

                    <a
                      href={streamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-fit items-center rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-300"
                    >
                      Watch stream ↗
                    </a>
                  </div>
                </div>
              )}

            {!streamUrl && (
              <div className="mt-7 overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/[0.015]">
                <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                    <span className="h-3 w-3 rounded-full bg-zinc-600" />
                  </div>

                  <h4 className="mt-5 text-lg font-bold text-white">
                    No stream available
                  </h4>

                  <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                    There is currently no official tournament broadcast listed
                    for this event.
                  </p>
                </div>
              </div>
            )}

            {streamUrl && (
              <div className="mt-4 flex flex-col gap-2 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Stream detected automatically from Limitless.
                </span>

                <span>
                  {streamProvider} broadcast
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}