"use client";

import { useState } from "react";
import Link from "next/link";

type TournamentTabsProps = {
  tournamentId: string;
  standings: any[];
  pairings: any[];
};

export default function TournamentTabs({
  tournamentId,
  standings,
  pairings,
}: TournamentTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRound, setSelectedRound] = useState("all");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "standings", label: "Standings" },
    { id: "pairings", label: "Pairings" },
    { id: "results", label: "Results" },
    { id: "stream", label: "Stream" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111114]">
      <div className="flex overflow-x-auto border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
        {activeTab === "overview" && (
          <div>
            <h3 className="text-2xl font-bold">
              Tournament overview
            </h3>

            <p className="mt-2 max-w-2xl text-zinc-500">
              Tournament data is being collected and normalized by Pkm Live.
            </p>

            <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-zinc-500">
                Tournament overview information will appear here.
              </p>
            </div>
          </div>
        )}

        {activeTab === "standings" && (
          <div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold">
                Standings
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                {standings.length} players imported from Limitless.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.03]">
                  <tr className="text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-5 py-4">Rank</th>
                    <th className="px-5 py-4">Player</th>
                    <th className="px-5 py-4">Country</th>
                    <th className="px-5 py-4">W</th>
                    <th className="px-5 py-4">L</th>
                    <th className="px-5 py-4">T</th>
                  </tr>
                </thead>

                <tbody>
                  {standings.map((entry: any, index: number) => {
                    const player = Array.isArray(entry.players)
                      ? entry.players[0]
                      : entry.players;

                    return (
                      <tr
                        key={`${entry.rank}-${index}`}
                        className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-4 font-bold text-zinc-300">
                          {entry.rank ?? index + 1}
                        </td>

                        <td className="px-5 py-4">
                          {player ? (
                            <Link
                              href={`/players/${entry.player_id}`}
                              className="font-semibold text-white hover:text-yellow-400"
                            >
                              {player.name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-white">
                              Unknown player
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-zinc-500">
                          {player?.country ?? "—"}
                        </td>

                        <td className="px-5 py-4 font-medium text-white">
                          {entry.wins ?? 0}
                        </td>

                        <td className="px-5 py-4 text-zinc-400">
                          {entry.losses ?? 0}
                        </td>

                        <td className="px-5 py-4 text-zinc-400">
                          {entry.ties ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!standings.length && (
              <div className="mt-6 rounded-xl border border-dashed border-white/10 p-10 text-center">
                <p className="text-zinc-500">
                  No standings are available yet.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "pairings" && (
  <div>
    <div className="mb-6">
      <h3 className="text-xl font-bold">Pairings</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Player matchups by round
      </p>
    </div>

    <div className="mb-6 flex flex-wrap gap-2">
  <button
    type="button"
    onClick={() => setSelectedRound("all")}
    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
      selectedRound === "all"
        ? "bg-yellow-400 text-black"
        : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
    }`}
  >
    All Rounds
  </button>

  {[...new Set(pairings.map((pairing) => pairing.round ?? 0))]
    .sort((a, b) => a - b)
    .map((round) => (
      <button
        key={round}
        type="button"
        onClick={() => setSelectedRound(String(round))}
        className={`rounded-lg px-4 py-2 text-sm font-semibold ${
          selectedRound === String(round)
            ? "bg-yellow-400 text-black"
            : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
        }`}
      >
        Round {round}
      </button>
    ))}
</div>

    {pairings.length === 0 ? (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <p className="text-zinc-500">
          No pairings available yet.
        </p>
      </div>
    ) : (
      <div className="space-y-6">
        {Object.entries(
  pairings
    .filter(
      (pairing) =>
        selectedRound === "all" ||
        String(pairing.round ?? 0) === selectedRound
    )
    .reduce(
            (groups: Record<string, any[]>, pairing) => {
              const round = pairing.round ?? 0;

              if (!groups[round]) {
                groups[round] = [];
              }

              groups[round].push(pairing);

              return groups;
            },
            {}
          )
        ).map(([round, roundPairings]) => (
          <div key={round}>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-yellow-400">
              Round {round}
            </h4>

            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="grid grid-cols-[70px_1fr_1fr_140px] border-b border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <span>Table</span>
                <span>Player 1</span>
                <span>Player 2</span>
                <span>Result</span>
              </div>

              {roundPairings.map((pairing) => (
                <div
                  key={pairing.id}
                  className="grid grid-cols-[70px_1fr_1fr_140px] items-center border-b border-white/5 px-4 py-4 last:border-b-0"
                >
                  <span className="text-sm text-zinc-500">
                    {pairing.table_number ?? "—"}
                  </span>

                  {pairing.player1 ? (
  <Link
    href={`/players/${pairing.player1.id}`}
    className="font-semibold hover:text-yellow-400"
  >
    {pairing.player1.name}
  </Link>
) : (
  <span className="font-semibold text-zinc-500">
    Unknown player
  </span>
)}

{pairing.player2 ? (
  <Link
    href={`/players/${pairing.player2.id}`}
    className="font-semibold hover:text-yellow-400"
  >
    {pairing.player2.name}
  </Link>
) : (
  <span className="font-semibold text-zinc-500">
    Unknown player
  </span>
)}

                  <span className="text-sm font-semibold">
  {pairing.status === "completed" ? (
    <>
      <span className="text-red-400">✓ Winner:</span>{" "}
      <span className="text-green-400">
        {pairing.winner?.name ?? "Completed"}
      </span>
    </>
  ) : (
    <span className="text-zinc-500">
      Scheduled
    </span>
  )}
</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}

        {activeTab === "results" && (
  <div>
    <div className="mb-6">
      <h3 className="text-2xl font-bold">
        Results
      </h3>
      <p className="mt-1 text-sm text-zinc-500">
        Completed match results by round
      </p>
    </div>

    {pairings.filter(
      (pairing) =>
        pairing.status === "completed" &&
        (selectedRound === "all" ||
          String(pairing.round ?? 0) === selectedRound)
    ).length === 0 ? (
      <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
        <p className="text-zinc-500">
          No completed results available yet.
        </p>
      </div>
    ) : (
      <div className="space-y-6">
        {Object.entries(
          pairings
            .filter(
              (pairing) =>
                pairing.status === "completed" &&
                (selectedRound === "all" ||
                  String(pairing.round ?? 0) === selectedRound)
            )
            .reduce(
              (groups: Record<string, any[]>, pairing) => {
                const round = pairing.round ?? 0;

                if (!groups[round]) {
                  groups[round] = [];
                }

                groups[round].push(pairing);

                return groups;
              },
              {}
            )
        ).map(([round, roundResults]) => (
          <div key={round}>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-yellow-400">
              Round {round}
            </h4>

            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="grid grid-cols-[70px_1fr_1fr_180px] border-b border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <span>Table</span>
                <span>Player 1</span>
                <span>Player 2</span>
                <span>Winner</span>
              </div>

              {roundResults.map((pairing) => (
                <div
                  key={pairing.id}
                  className="grid grid-cols-[70px_1fr_1fr_180px] items-center border-b border-white/5 px-4 py-4 last:border-b-0"
                >
                  <span className="text-sm text-zinc-500">
                    {pairing.table_number ?? "—"}
                  </span>

                  {pairing.player1 ? (
                    <Link
                      href={`/players/${pairing.player1.id}`}
                      className="font-semibold hover:text-yellow-400"
                    >
                      {pairing.player1.name}
                    </Link>
                  ) : (
                    <span className="text-zinc-500">
                      Unknown player
                    </span>
                  )}

                  {pairing.player2 ? (
                    <Link
                      href={`/players/${pairing.player2.id}`}
                      className="font-semibold hover:text-yellow-400"
                    >
                      {pairing.player2.name}
                    </Link>
                  ) : (
                    <span className="text-zinc-500">
                      Unknown player
                    </span>
                  )}

                  <span className="font-semibold">
                    <span className="text-red-400">
                      ✓ Winner:
                    </span>{" "}
                    <span className="text-green-400">
                      {pairing.winner?.name ?? "Unknown"}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
        {activeTab === "stream" && (
          <div>
            <h3 className="text-2xl font-bold">
              Stream
            </h3>

            <div className="mt-6 rounded-xl border border-dashed border-white/10 p-10 text-center">
              <p className="text-zinc-500">
                Stream information will appear here when an official tournament stream is available.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}