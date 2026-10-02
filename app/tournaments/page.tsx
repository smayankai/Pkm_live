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
    <main className="min-h-screen bg-[#08080a] text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#08080a]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 font-black text-black shadow-[0_0_24px_rgba(250,204,21,0.18)] transition group-hover:scale-105">
              P
            </div>

            <div>
              <h1 className="text-[15px] font-black tracking-tight">
                Pkm Live
              </h1>

              <p className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600 sm:block">
                Competitive Pokémon
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              href="/tournaments"
              className="rounded-lg bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white"
            >
              Tournaments
            </Link>

            <Link
              href="/players"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              Players
            </Link>

            <Link
              href="/rankings"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              Rankings
            </Link>
          </nav>

          <button className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white">
            Sign in
          </button>
        </div>
      </header>

      {/* HERO */}

      <section className="relative overflow-hidden border-b border-white/[0.07]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(250,204,21,0.08),transparent_32%),radial-gradient(circle_at_85%_30%,rgba(255,255,255,0.03),transparent_28%)]" />

        <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-400/10 bg-yellow-400/[0.05] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-400">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.7)]" />
              Tournament hub
            </div>

            <h2 className="text-4xl font-black tracking-[-0.035em] sm:text-5xl">
              Competitive tournaments.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-500 sm:text-base">
              Browse tournaments, standings, pairings, results, and player
              performances from across the competitive Pokémon scene.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-600">
              <span>Major events</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>Official events</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>Local tournaments</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>Online events</span>
            </div>
          </div>
        </div>
      </section>

      {/* TOURNAMENT DIRECTORY */}

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d0f] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.18)] sm:p-6">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-yellow-400">
                Directory
              </p>

              <h3 className="mt-1 text-xl font-black tracking-tight">
                All tournaments
              </h3>
            </div>

            <p className="text-xs text-zinc-600">
              Search and filter the full tournament database
            </p>
          </div>

          <TournamentSearch tournaments={tournaments ?? []} />
        </div>
      </section>

      {/* TIMEZONE NOTICE */}

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.015] px-5 py-3.5">
          <span className="text-[10px]">🕘</span>

          <p className="text-center text-[10px] font-medium text-zinc-600 sm:text-xs">
            Tournament times are shown in Japan Standard Time (JST, UTC+09:00).
          </p>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="border-t border-white/[0.07] px-5 py-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 text-[11px] text-zinc-700 sm:flex-row">
          <p>Pkm Live — Competitive Pokémon, one screen.</p>

          <p>Independent fan project.</p>
        </div>
      </footer>
    </main>
  );
}