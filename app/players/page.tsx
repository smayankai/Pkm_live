import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PlayerSearch from "./PlayerSearch";

export default async function PlayersPage() {
  const { data: players, error } = await supabase
  .from("players")
  .select("id, name");

console.log("PLAYERS:", players);
console.log("PLAYERS ERROR:", error);

  if (error) {
    console.error("PLAYERS ERROR:", error);
  }

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

            <Link href="/tournaments" className="hover:text-white">
              Tournaments
            </Link>

            <Link href="/players" className="text-white">
              Players
            </Link>

            <Link href="/rankings" className="hover:text-white">
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
        PLAYERS
      </p>

      <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
        Player directory
      </h2>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
        Search competitive players and explore their tournament history,
        results, and decklists.
      </p>
    </div>
  </div>
</section>

      {/* Players */}
      <section className="mx-auto max-w-7xl px-6 py-10">
  <div className="max-w-3xl">
    <PlayerSearch players={players ?? []} />
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