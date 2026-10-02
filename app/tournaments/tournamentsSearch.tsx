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

const tierLabels: Record<TournamentTier, string> = {
  major: "Major",
  official: "Official",
  local: "Local",
  online: "Online",
};

const tierStyles: Record<
  TournamentTier,
  {
    active: string;
    inactive: string;
    dot: string;
  }
> = {
  major: {
    active: "border-yellow-400/30 bg-yellow-400 text-black",
    inactive:
      "border-yellow-400/10 bg-yellow-400/[0.04] text-yellow-400 hover:border-yellow-400/25 hover:bg-yellow-400/[0.08]",
    dot: "bg-yellow-400",
  },
  official: {
    active: "border-blue-400/30 bg-blue-400 text-black",
    inactive:
      "border-blue-400/10 bg-blue-400/[0.04] text-blue-400 hover:border-blue-400/25 hover:bg-blue-400/[0.08]",
    dot: "bg-blue-400",
  },
  local: {
    active: "border-purple-400/30 bg-purple-400 text-black",
    inactive:
      "border-purple-400/10 bg-purple-400/[0.04] text-purple-400 hover:border-purple-400/25 hover:bg-purple-400/[0.08]",
    dot: "bg-purple-400",
  },
  online: {
    active: "border-white/20 bg-zinc-200 text-black",
    inactive:
      "border-white/[0.08] bg-white/[0.025] text-zinc-500 hover:border-white/15 hover:bg-white/[0.06] hover:text-zinc-300",
    dot: "bg-zinc-500",
  },
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
    const normalizedSearch = search.toLowerCase().trim();

    return tournaments.filter((tournament) => {
      const matchesSearch = tournament.name
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
      {/* SEARCH */}

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-600">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </div>

        <input
          type="text"
          placeholder="Search tournaments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/[0.08] bg-[#09090b] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-400/30 focus:bg-[#0b0b0d] focus:shadow-[0_0_25px_rgba(250,204,21,0.04)]"
        />

        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute inset-y-0 right-3 flex items-center px-2 text-xs text-zinc-600 transition hover:text-white"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* FILTERS */}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTierFilter("all")}
          className={`rounded-lg border px-3.5 py-2 text-[11px] font-bold transition ${
            tierFilter === "all"
              ? "border-white/20 bg-white text-black shadow-[0_4px_15px_rgba(255,255,255,0.08)]"
              : "border-white/[0.08] bg-white/[0.02] text-zinc-500 hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          All
        </button>

        {(
          ["major", "official", "local", "online"] as TournamentTier[]
        ).map((tier) => {
          const isActive = tierFilter === tier;
          const styles = tierStyles[tier];

          return (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[11px] font-bold transition ${
                isActive
                  ? styles.active
                  : styles.inactive
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isActive
                    ? "bg-black/60"
                    : styles.dot
                }`}
              />

              {tier === "major" && "★ "}

              {tierLabels[tier]}
            </button>
          );
        })}
      </div>

      {/* RESULT COUNT */}

      <div className="mt-6 flex min-h-5 items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-300">
            {filteredTournaments.length}
          </span>

          <span className="text-xs text-zinc-600">
            {filteredTournaments.length === 1
              ? "tournament"
              : "tournaments"}
          </span>

          {tierFilter !== "all" && (
            <>
              <span className="text-zinc-800">•</span>

              <span className="text-xs text-zinc-600">
                {tierLabels[tierFilter]}
              </span>
            </>
          )}
        </div>

        {(search || tierFilter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setTierFilter("all");
            }}
            className="text-xs font-semibold text-zinc-600 transition hover:text-white"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* TOURNAMENT LIST */}

      {filteredTournaments.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#09090b]">
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
                tournament.tier ?? "online";

              const isMajor = tier === "major";

              return (
                <Link
                  key={tournament.id}
                  href={`/tournaments/${tournament.source_id}`}
                  className={`group relative flex flex-col gap-4 px-4 py-5 transition duration-200 hover:bg-white/[0.025] sm:px-5 ${
                    index !==
                    filteredTournaments.length - 1
                      ? "border-b border-white/[0.06]"
                      : ""
                  }`}
                >
                  {/* Major accent */}

                  {isMajor && (
                    <div className="absolute left-0 top-0 h-full w-0.5 bg-yellow-400/60 transition group-hover:bg-yellow-400" />
                  )}

                  <div className="flex min-w-0 items-start justify-between gap-5">
                    <div className="min-w-0 flex-1">
                      {/* BADGES */}

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-white/[0.06] bg-white/[0.035] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-yellow-400">
                          {tournament.game ?? "—"}
                        </span>

                        {tier === "major" && (
                          <span className="rounded-md border border-yellow-400/15 bg-yellow-400/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-yellow-400">
                            ★ Major
                          </span>
                        )}

                        {tier === "official" && (
                          <span className="rounded-md border border-blue-400/15 bg-blue-400/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-blue-400">
                            Official
                          </span>
                        )}

                        {tier === "local" && (
                          <span className="rounded-md border border-purple-400/15 bg-purple-400/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-purple-400">
                            Local
                          </span>
                        )}

                        {tier === "online" && (
                          <span className="rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600">
                            Online
                          </span>
                        )}

                        <span className="text-[10px] font-medium capitalize text-zinc-700">
                          {tournament.status ??
                            "unknown"}
                        </span>
                      </div>

                      {/* NAME */}

                      <h3
                        className={`mt-2.5 truncate text-sm font-black tracking-tight transition sm:text-[15px] ${
                          isMajor
                            ? "text-white group-hover:text-yellow-300"
                            : "text-zinc-200 group-hover:text-yellow-400"
                        }`}
                      >
                        {tournament.name}
                      </h3>

                      {/* METADATA */}

                      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-zinc-600">
                        <span>{formattedDate}</span>

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

                    {/* ARROW */}

                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-zinc-700 transition group-hover:border-yellow-400/20 group-hover:bg-yellow-400/[0.06] group-hover:text-yellow-400">
                      →
                    </div>
                  </div>
                </Link>
              );
            }
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/[0.07] bg-[#09090b] px-6 py-14 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.035] text-zinc-600">
            ⌕
          </div>

          <p className="mt-4 text-sm font-semibold text-zinc-400">
            No tournaments found
          </p>

          <p className="mt-1 text-xs text-zinc-700">
            Try changing your search or tier filter.
          </p>

          {(search || tierFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setTierFilter("all");
              }}
              className="mt-5 rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              Reset filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}