import Link from "next/link";
import { supabase } from "@/lib/supabase";

const liveEvents = [
  {
    name: "Baltimore Regional",
    game: "VGC",
    status: "LIVE",
    round: "Round 8",
    players: "412 players",
    viewers: "12.4K",
  },
  {
    name: "Indianapolis Regional",
    game: "TCG",
    status: "LIVE",
    round: "Round 6",
    players: "384 players",
    viewers: "8.7K",
  },
];

export default async function Home() {
  // Get tournaments from Supabase
  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: true });

  console.log("TOURNAMENTS:", tournaments);
  console.log("SUPABASE ERROR:", error);

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0d0d10]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
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
          </div>

          <nav className="hidden gap-6 text-sm text-zinc-400 md:flex">
            <a href="#" className="text-white">
              Dashboard
            </a>

            <a href="#" className="hover:text-white">
              Tournaments
            </a>

            <a href="#" className="hover:text-white">
              Players
            </a>

            <a href="#" className="hover:text-white">
              Rankings
            </a>
          </nav>

          <button className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
            Sign in
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-white/10 bg-gradient-to-b from-[#111118] to-[#09090b]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              LIVE COMPETITIVE POKÉMON
            </div>

            <h2 className="text-4xl font-black tracking-tight md:text-6xl">
              Everything happening
              <br />
              in competitive Pokémon.
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
              Discover tournaments, watch live streams, follow players, and
              track results — all from one place.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button className="rounded-xl bg-yellow-400 px-5 py-3 font-bold text-black hover:bg-yellow-300">
                Explore live events
              </button>

              <button className="rounded-xl border border-white/10 px-5 py-3 font-medium text-zinc-300 hover:bg-white/5">
                Browse tournaments
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard */}
      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* Live Events */}
        <div className="mb-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />

                <h3 className="text-2xl font-bold">
                  Live now
                </h3>
              </div>

              <p className="mt-1 text-sm text-zinc-500">
                Tournaments happening right now
              </p>
            </div>

            <button className="text-sm text-yellow-400 hover:text-yellow-300">
              View all →
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {liveEvents.map((event) => (
              <div
                key={event.name}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-[#111114] transition hover:border-white/20"
              >
                {/* Fake Stream Preview */}
                <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-[#202027] via-[#15151a] to-[#0b0b0e]">
                  <div className="absolute left-4 top-4 rounded-md bg-red-500 px-2 py-1 text-xs font-bold">
                    ● LIVE
                  </div>

                  <div className="text-center">
                    <div className="text-4xl">
                      ▶
                    </div>

                    <p className="mt-2 text-sm text-zinc-500">
                      Live stream
                    </p>
                  </div>
                </div>

                {/* Event Info */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
                        {event.game}
                      </span>

                      <h4 className="mt-1 text-xl font-bold">
                        {event.name}
                      </h4>
                    </div>

                    <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                      {event.round}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-white/5 p-3">
                      <p className="text-zinc-500">
                        Players
                      </p>

                      <p className="mt-1 font-semibold">
                        {event.players}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white/5 p-3">
                      <p className="text-zinc-500">
                        Watching
                      </p>

                      <p className="mt-1 font-semibold">
                        {event.viewers}
                      </p>
                    </div>
                  </div>

                  <button className="mt-4 w-full rounded-lg bg-white/5 py-3 text-sm font-semibold hover:bg-white/10">
                    Open tournament →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Tournaments */}
        <div>
          <div className="mb-5">
            <h3 className="text-2xl font-bold">
              Upcoming tournaments
            </h3>

            <p className="mt-1 text-sm text-zinc-500">
              See what's coming next
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111114]">

            {tournaments && tournaments.length > 0 ? (
              tournaments.map((event, index) => (
                <div
                  key={event.id}
                  className={`flex flex-col gap-4 p-5 transition hover:bg-white/[0.03] md:flex-row md:items-center md:justify-between ${
                    index !== tournaments.length - 1
                      ? "border-b border-white/10"
                      : ""
                  }`}
                >
                  {/* Tournament Info */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-xs font-bold text-zinc-400">
                      {event.game}
                    </div>

                    <div>
                      <h4 className="font-bold">
                        {event.name}
                      </h4>

                      <p className="text-sm text-zinc-500">
                        {event.location || "Location TBA"}
                        {event.country
                          ? `, ${event.country}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {/* Date + Button */}
                  <div className="flex items-center gap-5">
                    <span className="text-sm font-medium text-zinc-400">
                      {event.start_date
                        ? new Date(
                            event.start_date
                          ).toLocaleDateString()
                        : "Date TBA"}
                    </span>

                    <Link
  href={`/tournaments/${event.id}`}
  className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
>
  View event
</Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-zinc-500">
                  No upcoming tournaments found.
                </p>
              </div>
            )}

          </div>
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