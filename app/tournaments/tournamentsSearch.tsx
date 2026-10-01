"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type TournamentTier =
  | "major"
  | "official"
  | "local"
  | "online";

type Tournament = {
  id: string;
  source_id: string;
  name: string;
  game: string | null;
  start_date: string | null;
  status: string | null;
  player_count: number | null;
  location: string | null;
  country: string | null;
  tier: TournamentTier | null;
};

const tierLabels: Record<
  TournamentTier,
  string
> = {
  major: "Major",
  official: "Official",
  local: "Local",
  online: "Online",
};

export default function TournamentSearch({
  tournaments,
}: {
  tournaments: Tournament[];
}) {
  const [search, setSearch] = useState("");

  const [tierFilter, setTierFilter] = useState<
    "all" | TournamentTier
  >("all");

  const filteredTournaments = useMemo(() => {
    const normalizedSearch =
      search.toLowerCase().trim();

    return tournaments.filter((tournament) => {
      const matchesSearch =
        tournament.name
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesTier =
        tierFilter === "all" ||
        tournament.tier === tierFilter;

      return matchesSearch && matchesTier;
    });
  }, [tournaments, search, tierFilter]);

  return (
    <div>

      {/* -------------------------------------------------------
         SEARCH
      ------------------------------------------------------- */}

      <div className="relative">

        <input
          type="text"
          placeholder="Search tournaments..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="w-full rounded-xl border border-white/10 bg-[#0d0d10] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/40 focus:bg-[#111114]"
        />

      </div>

      {/* -------------------------------------------------------
         FILTERS
      ------------------------------------------------------- */}

      <div className="mt-4 flex flex-wrap gap-2">

        <button
          onClick={() =>
            setTierFilter("all")
          }
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
            tierFilter === "all"
              ? "bg-white text-black"
              : "border border-white/10 bg-[#0d0d10] text-zinc-500 hover:bg-white/5 hover:text-white"
          }`}
        >
          All
        </button>

        <button
          onClick={() =>
            setTierFilter("major")
          }
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
            tierFilter === "major"
              ? "bg-yellow-400 text-black"
              : "border border-yellow-400/10 bg-[#0d0d10] text-yellow-400 hover:bg-yellow-400/10"
          }`}
        >
          ★ Major
        </button>

        <button
          onClick={() =>
            setTierFilter("official")
          }
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
            tierFilter === "official"
              ? "bg-blue-400 text-black"
              : "border border-blue-400/10 bg-[#0d0d10] text-blue-400 hover:bg-blue-400/10"
          }`}
        >
          Official
        </button>

        <button
          onClick={() =>
            setTierFilter("local")
          }
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
            tierFilter === "local"
              ? "bg-purple-400 text-black"
              : "border border-purple-400/10 bg-[#0d0d10] text-purple-400 hover:bg-purple-400/10"
          }`}
        >
          Local
        </button>

        <button
          onClick={() =>
            setTierFilter("online")
          }
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
            tierFilter === "online"
              ? "bg-zinc-200 text-black"
              : "border border-white/10 bg-[#0d0d10] text-zinc-500 hover:bg-white/5 hover:text-white"
          }`}
        >
          Online
        </button>

      </div>

      {/* -------------------------------------------------------
         RESULT COUNT
      ------------------------------------------------------- */}

      <div className="mt-5 flex items-center justify-between">

        <p className="text-sm text-zinc-500">

          {filteredTournaments.length}{" "}

          {filteredTournaments.length === 1
            ? "tournament"
            : "tournaments"}

        </p>

        {(search || tierFilter !== "all") && (

          <button
            onClick={() => {
              setSearch("");
              setTierFilter("all");
            }}
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            Clear filters
          </button>

        )}

      </div>

      {/* -------------------------------------------------------
         TOURNAMENT LIST
      ------------------------------------------------------- */}

      {filteredTournaments.length > 0 ? (

        <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-[#0d0d10]">

          {filteredTournaments.map(
            (tournament, index) => {

              const formattedDate =
                tournament.start_date
                  ? new Date(
                      tournament.start_date
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone:
                          "Asia/Tokyo",
                      }
                    )
                  : "Date TBA";

              const tier =
                tournament.tier ??
                "online";

              return (

                <Link
                  key={tournament.id}
                  href={`/tournaments/${tournament.source_id}`}
                  className={`group flex items-center justify-between gap-6 px-5 py-5 transition hover:bg-white/[0.03] ${
                    index !==
                    filteredTournaments.length - 1
                      ? "border-b border-white/10"
                      : ""
                  }`}
                >

                  <div className="min-w-0">

                    {/* Game + Tier + Status */}

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="rounded-md bg-yellow-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-400">
                        {tournament.game}
                      </span>

                      {/* Major */}

                      {tier === "major" && (

                        <span className="rounded-md border border-yellow-400/20 bg-yellow-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-400">
                          ★ Major
                        </span>

                      )}

                      {/* Official */}

                      {tier === "official" && (

                        <span className="rounded-md border border-blue-400/20 bg-blue-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                          Official
                        </span>

                      )}

                      {/* Local */}

                      {tier === "local" && (

                        <span className="rounded-md border border-purple-400/20 bg-purple-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                          Local
                        </span>

                      )}

                      {/* Online */}

                      {tier === "online" && (

                        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Online
                        </span>

                      )}

                      <span className="text-xs text-zinc-600">
                        {tournament.status}
                      </span>

                    </div>

                    {/* Tournament name */}

                    <h3
                      className={`mt-2 truncate font-semibold transition ${
                        tier === "major"
                          ? "text-white group-hover:text-yellow-400"
                          : "text-white group-hover:text-yellow-400"
                      }`}
                    >
                      {tournament.name}
                    </h3>

                    {/* Metadata */}

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">

                      <span>
                        {formattedDate}
                      </span>

                      <span>
                        {tournament.player_count ??
                          0}{" "}
                        players
                      </span>

                      {tournament.location && (

                        <span>
                          {tournament.location}

                          {tournament.country
                            ? `, ${tournament.country}`
                            : ""}
                        </span>

                      )}

                    </div>

                  </div>

                  {/* Arrow */}

                  <span className="shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-yellow-400">
                    →
                  </span>

                </Link>

              );
            }
          )}

        </div>

      ) : (

        <div className="mt-3 rounded-xl border border-white/10 bg-[#0d0d10] px-6 py-12 text-center">

          <p className="font-medium text-zinc-400">
            No tournaments found
          </p>

          <p className="mt-1 text-sm text-zinc-600">
            Try changing your search or tier filter.
          </p>

        </div>

      )}

    </div>
  );
}