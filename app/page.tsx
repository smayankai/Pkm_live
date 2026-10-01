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
  const now = new Date().toISOString();

  // Pkm Live uses Japan Standard Time (JST, UTC+09:00)
  // for displaying tournament dates and times.

  /* -------------------------------------------------------
     MAJOR TOURNAMENTS
  ------------------------------------------------------- */

  const { data: majorTournaments, error: majorError } =
    await supabase
      .from("tournaments")
      .select("*")
      .eq("tier", "major")
      .order("start_date", { ascending: false })
      .limit(5);

  /* -------------------------------------------------------
     UPCOMING TOURNAMENTS
  ------------------------------------------------------- */

  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("status", "upcoming")
    .gte("start_date", now)
    .order("start_date", { ascending: true })
    .limit(5);

  /* -------------------------------------------------------
     RECENT TOURNAMENTS
  ------------------------------------------------------- */

  const { data: recentTournaments, error: recentError } =
    await supabase
      .from("tournaments")
      .select("*")
      .eq("status", "completed")
      .order("start_date", { ascending: false })
      .limit(5);

  console.log(
    "MAJOR TOURNAMENTS:",
    majorTournaments
  );

  console.log(
    "MAJOR ERROR:",
    majorError
  );

  console.log(
    "UPCOMING TOURNAMENTS:",
    tournaments
  );

  console.log(
    "UPCOMING ERROR:",
    error
  );

  console.log(
    "RECENT TOURNAMENTS:",
    recentTournaments
  );

  console.log(
    "RECENT ERROR:",
    recentError
  );

  return (
    <main className="min-h-screen bg-[#09090b] text-white">

      {/* -------------------------------------------------------
         HEADER
      ------------------------------------------------------- */}

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

            <Link
              href="/"
              className="text-white hover:text-white"
            >
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

      {/* -------------------------------------------------------
         HERO
      ------------------------------------------------------- */}

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

              <Link
                href="/tournaments"
                className="rounded-xl bg-yellow-400 px-5 py-3 font-bold text-black hover:bg-yellow-300"
              >
                Explore live events
              </Link>

              <Link
                href="/tournaments"
                className="rounded-xl border border-white/10 px-5 py-3 font-medium text-zinc-300 hover:bg-white/5"
              >
                Browse tournaments
              </Link>

            </div>

          </div>

        </div>

      </section>

      {/* -------------------------------------------------------
         DASHBOARD
      ------------------------------------------------------- */}

      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* -------------------------------------------------------
           LIVE EVENTS
        ------------------------------------------------------- */}

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

            <Link
              href="/tournaments"
              className="text-sm text-yellow-400 hover:text-yellow-300"
            >
              View all →
            </Link>

          </div>

          <div className="grid gap-5 md:grid-cols-2">

            {liveEvents.map((event) => (

              <div
                key={event.name}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-[#111114] transition hover:border-white/20"
              >

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

                  <Link
                    href="/tournaments"
                    className="mt-4 block w-full rounded-lg bg-white/5 py-3 text-center text-sm font-semibold hover:bg-white/10"
                  >
                    Open tournament →
                  </Link>

                </div>

              </div>

            ))}

          </div>

        </div>

        {/* -------------------------------------------------------
           MAJOR EVENTS
        ------------------------------------------------------- */}

        <div className="mb-12">

          <div className="mb-5 flex items-end justify-between">

            <div>

              <div className="flex items-center gap-3">

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-400 text-sm font-black text-black">
                  ★
                </div>

                <div>

                  <h3 className="text-2xl font-bold">
                    Major events
                  </h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    Regionals, Internationals and World Championships
                  </p>

                </div>

              </div>

            </div>

            <Link
              href="/tournaments"
              className="text-sm text-yellow-400 hover:text-yellow-300"
            >
              View all →
            </Link>

          </div>

          {majorTournaments &&
          majorTournaments.length > 0 ? (

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

              {majorTournaments.map((event) => (

                <Link
                  key={event.id}
                  href={`/tournaments/${event.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-yellow-400/20 bg-gradient-to-br from-[#171714] via-[#111114] to-[#0d0d0f] p-5 transition hover:border-yellow-400/50 hover:shadow-[0_0_30px_rgba(250,204,21,0.08)]"
                >

                  {/* Gold accent */}

                  <div className="absolute left-0 top-0 h-full w-1 bg-yellow-400" />

                  <div className="flex items-start justify-between gap-4">

                    <div>

                      <div className="mb-3 flex items-center gap-2">

                        <span className="rounded-full bg-yellow-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-400">
                          Major
                        </span>

                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          {event.game}
                        </span>

                      </div>

                      <h4 className="text-lg font-bold leading-snug transition group-hover:text-yellow-300">
                        {event.name}
                      </h4>

                    </div>

                    <span className="text-xl text-yellow-400">
                      ★
                    </span>

                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">

                    <div>

                      <p className="text-xs text-zinc-500">
                        Date
                      </p>

                      <p className="mt-1 text-sm font-medium text-zinc-300">
                        {event.start_date
                          ? new Date(
                              event.start_date
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              timeZone: "Asia/Tokyo",
                            })
                          : "Date TBA"}
                      </p>

                    </div>

                    <span className="text-sm font-semibold text-yellow-400 transition group-hover:translate-x-1">
                      View →
                    </span>

                  </div>

                </Link>

              ))}

            </div>

          ) : (

            <div className="rounded-2xl border border-white/10 bg-[#111114] p-8 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400/10 text-xl text-yellow-400">
                ★
              </div>

              <p className="mt-4 font-medium text-zinc-300">
                No major events found.
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Major tournaments will appear here when available.
              </p>

            </div>

          )}

        </div>

        {/* -------------------------------------------------------
           UPCOMING TOURNAMENTS
        ------------------------------------------------------- */}

        <div>

          <div className="mb-5 flex items-end justify-between">

            <div>

              <h3 className="text-2xl font-bold">
                Upcoming tournaments
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                See what's coming next
              </p>

            </div>

            <Link
              href="/tournaments"
              className="text-sm text-yellow-400 hover:text-yellow-300"
            >
              View all →
            </Link>

          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111114]">

            {tournaments &&
            tournaments.length > 0 ? (

              tournaments.map((event, index) => (

                <div
                  key={event.id}
                  className={`flex flex-col gap-4 p-5 transition hover:bg-white/[0.03] md:flex-row md:items-center md:justify-between ${
                    index !== tournaments.length - 1
                      ? "border-b border-white/10"
                      : ""
                  }`}
                >

                  <div className="flex items-center gap-4">

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-xs font-bold text-zinc-400">
                      {event.game}
                    </div>

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <h4 className="font-bold">
                          {event.name}
                        </h4>

                        {event.tier === "major" && (

                          <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-400">
                            Major
                          </span>

                        )}

                        {event.tier === "official" && (

                          <span className="rounded-full bg-blue-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                            Official
                          </span>

                        )}

                      </div>

                      <p className="text-sm text-zinc-500">

                        {event.location || "Location TBA"}

                        {event.country
                          ? `, ${event.country}`
                          : ""}

                      </p>

                    </div>

                  </div>

                  <div className="flex items-center gap-5">

                    <span className="text-sm font-medium text-zinc-400">

                      {event.start_date
                        ? new Date(
                            event.start_date
                          ).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            timeZone: "Asia/Tokyo",
                          })
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

        {/* -------------------------------------------------------
           RECENT TOURNAMENTS
        ------------------------------------------------------- */}

        <div className="mt-12">

          <div className="mb-5 flex items-end justify-between">

            <div>

              <h3 className="text-2xl font-bold">
                Recent tournaments
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                The latest completed events
              </p>

            </div>

            <Link
              href="/tournaments"
              className="text-sm text-yellow-400 hover:text-yellow-300"
            >
              View all →
            </Link>

          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111114]">

            {recentTournaments &&
            recentTournaments.length > 0 ? (

              recentTournaments.map((event, index) => (

                <div
                  key={event.id}
                  className={`flex flex-col gap-4 p-5 transition hover:bg-white/[0.03] md:flex-row md:items-center md:justify-between ${
                    index !== recentTournaments.length - 1
                      ? "border-b border-white/10"
                      : ""
                  }`}
                >

                  <div className="flex items-center gap-4">

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-xs font-bold text-zinc-400">
                      {event.game}
                    </div>

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <h4 className="font-bold">
                          {event.name}
                        </h4>

                        {event.tier === "major" && (

                          <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-400">
                            Major
                          </span>

                        )}

                        {event.tier === "official" && (

                          <span className="rounded-full bg-blue-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                            Official
                          </span>

                        )}

                      </div>

                      <p className="text-sm text-zinc-500">

                        {event.location || "Location TBA"}

                        {event.country
                          ? `, ${event.country}`
                          : ""}

                      </p>

                    </div>

                  </div>

                  <div className="flex items-center gap-5">

                    <span className="text-sm font-medium text-zinc-400">

                      {event.start_date
                        ? new Date(
                            event.start_date
                          ).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            timeZone: "Asia/Tokyo",
                          })
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
                  No recent tournaments found.
                </p>

              </div>

            )}

          </div>

        </div>

        {/* -------------------------------------------------------
           TIMEZONE NOTICE
        ------------------------------------------------------- */}

        <div className="mt-8 rounded-xl border border-white/10 bg-[#111114] px-5 py-4">

          <p className="text-center text-xs text-zinc-500">
            Tournament times are shown in Japan Standard Time (JST, UTC+09:00).
          </p>

        </div>

      </section>

      {/* -------------------------------------------------------
         FOOTER
      ------------------------------------------------------- */}

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