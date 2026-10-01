import Link from "next/link";
import { supabase } from "@/lib/supabase";
import TournamentSearch from "./tournamentsSearch";

export default async function TournamentsPage() {
  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select(
      "id, source_id, name, game, start_date, status, player_count, location, country, tier"
    )
    .order("start_date", { ascending: false });

  if (error) {
    console.error("TOURNAMENTS ERROR:", error);
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">

      {/* Header */}
      <header className="border-b border-white/10 bg-[#0d0d10]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <Link
            href="/"
            className="flex items-center gap-3"
          >
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

            <Link
              href="/"
              className="hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              href="/tournaments"
              className="text-white"
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
              className="hover:text-white"
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
              TOURNAMENTS
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Competitive tournaments
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              Browse tournaments, standings, pairings, results, and
              player performances.
            </p>

          </div>

        </div>

      </section>

      {/* Tournament directory */}
      <section className="mx-auto max-w-7xl px-6 py-10">

        <div className="max-w-4xl">

          <TournamentSearch
            tournaments={tournaments ?? []}
          />

        </div>

      </section>

      {/* Timezone Notice */}
      <section className="mx-auto max-w-7xl px-6 pb-8">

        <div className="rounded-xl border border-white/10 bg-[#111114] px-5 py-4">

          <p className="text-center text-xs text-zinc-500">
            Tournament times are shown in Japan Standard Time (JST, UTC+09:00).
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