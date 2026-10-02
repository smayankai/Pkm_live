import Link from "next/link";
import { supabase } from "@/lib/supabase";

type RankingRow = {
  player_id: string;
  wins: number | null;
  losses: number | null;
  ties: number | null;
  tournaments:
    | {
        status: string | null;
        game: string | null;
        start_date: string | null;
      }
    | {
        status: string | null;
        game: string | null;
        start_date: string | null;
      }[]
    | null;
  players:
    | {
        name: string;
        country: string | null;
      }
    | {
        name: string;
        country: string | null;
      }[]
    | null;
};

type RankingsPageProps = {
  searchParams: Promise<{
    game?: string;
    period?: string;
  }>;
};

export default async function RankingsPage({
  searchParams,
}: RankingsPageProps) {
  const params = await searchParams;

  const selectedGame =
    params.game === "VGC" || params.game === "TCG"
      ? params.game
      : "ALL";

  const selectedPeriod =
    params.period === "2026" || params.period === "30d"
      ? params.period
      : "ALL";

  const { data: standings, error } = await supabase
    .from("standings")
    .select(`
      player_id,
      wins,
      losses,
      ties,
      tournaments (
        status,
        game,
        start_date
      ),
      players (
        name,
        country
      )
    `);

  if (error) {
    console.error("RANKINGS ERROR:", error);
  }

  const now = new Date();

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const playerMap = new Map<
    string,
    {
      player_id: string;
      name: string;
      country: string | null;
      wins: number;
      losses: number;
      ties: number;
      matches: number;
      tournaments: number;
    }
  >();

  for (const row of (standings ?? []) as RankingRow[]) {
    const tournament = Array.isArray(row.tournaments)
      ? row.tournaments[0]
      : row.tournaments;

    const player = Array.isArray(row.players)
      ? row.players[0]
      : row.players;

    if (!tournament || !player) continue;

    // Only completed tournaments count.
    if (tournament.status !== "completed") continue;

    // Game filter.
    if (
      selectedGame !== "ALL" &&
      tournament.game !== selectedGame
    ) {
      continue;
    }

    // Period filter.
    if (selectedPeriod !== "ALL") {
      if (!tournament.start_date) continue;

      const tournamentDate = new Date(tournament.start_date);

      if (selectedPeriod === "2026") {
        if (tournamentDate.getFullYear() !== 2026) {
          continue;
        }
      }

      if (selectedPeriod === "30d") {
        if (tournamentDate < thirtyDaysAgo) {
          continue;
        }
      }
    }

    const wins = row.wins ?? 0;
    const losses = row.losses ?? 0;
    const ties = row.ties ?? 0;
    const matches = wins + losses + ties;

    const existing = playerMap.get(row.player_id);

    if (existing) {
      existing.wins += wins;
      existing.losses += losses;
      existing.ties += ties;
      existing.matches += matches;
      existing.tournaments += 1;
    } else {
      playerMap.set(row.player_id, {
        player_id: row.player_id,
        name: player.name,
        country: player.country,
        wins,
        losses,
        ties,
        matches,
        tournaments: 1,
      });
    }
  }

  const rankings = Array.from(playerMap.values())
    .map((player) => ({
      ...player,
      winRate:
        player.matches > 0
          ? ((player.wins + player.ties * 0.5) /
              player.matches) *
            100
          : 0,
    }))
    .sort((a, b) => {
      if (b.winRate !== a.winRate) {
        return b.winRate - a.winRate;
      }

      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      if (b.matches !== a.matches) {
        return b.matches - a.matches;
      }

      return a.name.localeCompare(b.name);
    });

  const filterLink = (
    game: string,
    period: string
  ) => {
    const query = new URLSearchParams();

    if (game !== "ALL") {
      query.set("game", game);
    }

    if (period !== "ALL") {
      query.set("period", period);
    }

    const queryString = query.toString();

    return queryString
      ? `/rankings?${queryString}`
      : "/rankings";
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d0d10]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400 font-black text-black">
              P
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Pkm Live
              </h1>

              <p className="text-xs text-zinc-500">
                Competitive Pokémon, one screen.
              </p>
            </div>
          </Link>

          <nav className="hidden gap-6 text-sm text-zinc-400 md:flex">
            <Link href="/" className="hover:text-white">
              Dashboard
            </Link>

            <Link
              href="/tournaments"
              className="hover:text-white"
            >
              Tournaments
            </Link>

            <Link
              href="/players"
              className="hover:text-white"
            >
              Players
            </Link>

            <Link
              href="/rankings"
              className="text-white"
            >
              Rankings
            </Link>
          </nav>

          <button className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
            Sign in
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-white/10 bg-gradient-to-b from-[#111118] to-[#09090b]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400">
              RANKINGS
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Player rankings
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              Performance across completed tournaments tracked by
              Pkm Live.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="mx-auto max-w-7xl px-6 pt-8">
        <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-[#111114] p-5 md:flex-row md:items-center md:justify-between">
          {/* Game */}
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
              Game
            </p>

            <div className="flex flex-wrap gap-2">
              {["ALL", "VGC", "TCG"].map((game) => {
                const active = selectedGame === game;

                return (
                  <Link
                    key={game}
                    href={filterLink(game, selectedPeriod)}
                    className={`rounded-lg border px-4 py-2 text-xs font-semibold transition ${
                      active
                        ? "border-yellow-400 bg-yellow-400 text-black"
                        : "border-white/10 bg-[#0d0d10] text-zinc-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {game === "ALL" ? "All games" : game}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Period */}
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
              Period
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                ["ALL", "All time"],
                ["2026", "2026"],
                ["30d", "Last 30 days"],
              ].map(([period, label]) => {
                const active = selectedPeriod === period;

                return (
                  <Link
                    key={period}
                    href={filterLink(selectedGame, period)}
                    className={`rounded-lg border px-4 py-2 text-xs font-semibold transition ${
                      active
                        ? "border-yellow-400 bg-yellow-400 text-black"
                        : "border-white/10 bg-[#0d0d10] text-zinc-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Rankings */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        {rankings.length > 0 ? (
          <div className="space-y-4">
            {/* Table header */}
            <div className="hidden rounded-xl border border-white/10 bg-[#0d0d10] px-6 py-3 md:grid md:grid-cols-[80px_minmax(0,1fr)_120px_120px_120px_120px] md:items-center">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Rank
              </span>

              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Player
              </span>

              <span className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Tournaments
              </span>

              <span className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Matches
              </span>

              <span className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Record
              </span>

              <span className="text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Win rate
              </span>
            </div>

            {rankings.map((player, index) => {
              const performanceWidth = Math.min(
                player.winRate,
                100
              );

              const rank = index + 1;

              return (
                <Link
                  key={player.player_id}
                  href={`/players/${player.player_id}`}
                  className="group block rounded-2xl border border-white/10 bg-[#111114] p-5 transition hover:border-yellow-400/30 hover:bg-[#131316] md:px-6"
                >
                  <div className="grid gap-5 md:grid-cols-[80px_minmax(0,1fr)_120px_120px_120px_120px] md:items-center">
                    {/* Rank */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
                          rank === 1
                            ? "bg-yellow-400 text-black"
                            : rank === 2
                              ? "bg-zinc-300 text-black"
                              : rank === 3
                                ? "bg-amber-700 text-white"
                                : "bg-white/5 text-zinc-500"
                        }`}
                      >
                        {String(rank).padStart(2, "0")}
                      </div>

                      <span className="text-xs text-zinc-700 md:hidden">
                        RANK
                      </span>
                    </div>

                    {/* Player */}
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-bold leading-tight text-white transition group-hover:text-yellow-400">
                        {player.name}
                      </h3>

                      {player.country && (
                        <p className="mt-1 text-xs text-zinc-600">
                          {player.country}
                        </p>
                      )}
                    </div>

                    {/* Tournaments */}
                    <div className="flex items-center justify-between md:block md:text-center">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600 md:hidden">
                        Tournaments
                      </span>

                      <span className="text-lg font-black text-white">
                        {player.tournaments}
                      </span>
                    </div>

                    {/* Matches */}
                    <div className="flex items-center justify-between md:block md:text-center">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600 md:hidden">
                        Matches
                      </span>

                      <span className="text-lg font-black text-white">
                        {player.matches}
                      </span>
                    </div>

                    {/* Record */}
                    <div className="flex items-center justify-between md:block md:text-center">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600 md:hidden">
                        Record
                      </span>

                      <span className="font-mono text-sm text-zinc-300">
                        {player.wins} - {player.losses} - {player.ties}
                      </span>
                    </div>

                    {/* Win rate */}
                    <div className="flex items-center justify-between md:block md:text-right">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600 md:hidden">
                        Win rate
                      </span>

                      <span className="text-xl font-black text-yellow-400">
                        {player.winRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Performance bar */}
                  <div className="mt-5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-yellow-400 transition-all duration-500 group-hover:bg-yellow-300"
                        style={{
                          width: `${performanceWidth}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-700">
                      {selectedGame === "ALL"
                        ? "All games"
                        : selectedGame}
                      {" · "}
                      {selectedPeriod === "ALL"
                        ? "All time"
                        : selectedPeriod === "30d"
                          ? "Last 30 days"
                          : selectedPeriod}
                    </span>

                    <span className="text-xs text-zinc-600 transition group-hover:translate-x-1 group-hover:text-yellow-400">
                      View profile →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#111114] px-6 py-16 text-center">
            <p className="font-medium text-zinc-400">
              No rankings available
            </p>

            <p className="mt-1 text-sm text-zinc-600">
              No completed tournament results match the selected
              filters.
            </p>
          </div>
        )}
      </section>

      {/* JST Notice */}
      <section className="mx-auto max-w-7xl px-6 pb-10">
        <div className="rounded-xl border border-white/10 bg-[#0d0d10] px-5 py-4">
          <p className="text-xs leading-5 text-zinc-600">
            Rankings are calculated from completed tournaments in
            Pkm Live. Tournament dates are displayed using Japan
            Standard Time (JST, UTC+09:00).
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-sm text-zinc-600 md:flex-row">
          <p>
            Pkm Live — Competitive Pokémon, one screen.
          </p>

          <p>
            Independent fan project.
          </p>
        </div>
      </footer>
    </main>
  );
}
