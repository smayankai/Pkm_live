import Link from "next/link";
import { supabase } from "@/lib/supabase";

type RankingRow = {
  player_id: string;
  wins: number;
  losses: number;
  ties: number;
  tournaments:
    | {
        status: string | null;
      }
    | {
        status: string | null;
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

export default async function RankingsPage() {
  const { data: standings, error } = await supabase
    .from("standings")
    .select(`
      player_id,
      wins,
      losses,
      ties,
      tournaments (
        status
      ),
      players (
        name,
        country
      )
    `);

  if (error) {
    console.error("RANKINGS ERROR:", error);
  }

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

    // Only completed tournaments count toward global rankings.
    if (tournament.status !== "completed") continue;

    const existing = playerMap.get(row.player_id);

    if (existing) {
      existing.wins += row.wins ?? 0;
      existing.losses += row.losses ?? 0;
      existing.ties += row.ties ?? 0;
      existing.matches +=
        (row.wins ?? 0) +
        (row.losses ?? 0) +
        (row.ties ?? 0);
    } else {
      playerMap.set(row.player_id, {
        player_id: row.player_id,
        name: player.name,
        country: player.country,
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        ties: row.ties ?? 0,
        matches:
          (row.wins ?? 0) +
          (row.losses ?? 0) +
          (row.ties ?? 0),
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

      return b.wins - a.wins;
    });

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0d0d10]">
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
              Player performance across completed tournaments tracked by
              Pkm Live.
            </p>
          </div>
        </div>
      </section>

      {/* Rankings */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        {rankings.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {rankings.map((player, index) => {
              const performanceWidth = Math.min(
                player.winRate,
                100
              );

              return (
                <Link
                  key={player.player_id}
                  href={`/players/${player.player_id}`}
                  className="group rounded-2xl border border-white/10 bg-[#111114] p-6 transition hover:border-yellow-400/30 hover:bg-[#131316]"
                >
                  {/* Player heading */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
                        index < 3
                          ? "bg-yellow-400 text-black"
                          : "bg-white/5 text-zinc-500"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-xl font-bold leading-tight text-white transition group-hover:text-yellow-400">
                        {player.name}
                      </h3>

                      {player.country && (
                        <p className="mt-1 text-xs text-zinc-600">
                          {player.country}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xl font-black text-yellow-400">
                        {player.winRate.toFixed(1)}%
                      </p>

                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">
                        Win rate
                      </p>
                    </div>
                  </div>

                  {/* W / L / T */}
                  <div className="mt-7 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-[#0d0d10]">
                    <div className="px-4 py-4 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                        Wins
                      </p>

                      <p className="mt-2 text-2xl font-black text-white">
                        {player.wins}
                      </p>

                      <p className="mt-1 text-[10px] text-zinc-700">
                        W
                      </p>
                    </div>

                    <div className="px-4 py-4 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                        Losses
                      </p>

                      <p className="mt-2 text-2xl font-black text-white">
                        {player.losses}
                      </p>

                      <p className="mt-1 text-[10px] text-zinc-700">
                        L
                      </p>
                    </div>

                    <div className="px-4 py-4 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                        Ties
                      </p>

                      <p className="mt-2 text-2xl font-black text-white">
                        {player.ties}
                      </p>

                      <p className="mt-1 text-[10px] text-zinc-700">
                        T
                      </p>
                    </div>
                  </div>

                  {/* Performance */}
                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                        Performance
                      </span>

                      <span className="text-xs text-zinc-500">
                        {player.matches} matches
                      </span>
                    </div>

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
                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                      W / L / T
                    </span>

                    <span className="text-sm text-zinc-600 transition group-hover:translate-x-1 group-hover:text-yellow-400">
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
              Rankings will appear once completed tournament results have
              been imported.
            </p>
          </div>
        )}
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