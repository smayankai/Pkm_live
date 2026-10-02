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

  console.log("MAJOR TOURNAMENTS:", majorTournaments);
  console.log("MAJOR ERROR:", majorError);
  console.log("UPCOMING TOURNAMENTS:", tournaments);
  console.log("UPCOMING ERROR:", error);
  console.log("RECENT TOURNAMENTS:", recentTournaments);
  console.log("RECENT ERROR:", recentError);

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
              className="rounded-lg bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white"
            >
              Dashboard
            </Link>

            <Link
              href="/tournaments"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.09),transparent_32%),radial-gradient(circle_at_85%_30%,rgba(255,255,255,0.035),transparent_25%)]" />

        <div className="absolute right-[-120px] top-[-180px] h-[420px] w-[420px] rounded-full border border-yellow-400/[0.04]" />
        <div className="absolute right-[-40px] top-[-100px] h-[260px] w-[260px] rounded-full border border-yellow-400/[0.05]" />

        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20 lg:py-24">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              Live competitive Pokémon
            </div>

            <h2 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.04em] sm:text-5xl lg:text-7xl">
              Competitive Pokémon.
              <br />
              <span className="text-yellow-400">One screen.</span>
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
              Discover tournaments, watch live streams, follow players, and
              track results — all from one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/tournaments"
                className="group inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black shadow-[0_8px_30px_rgba(250,204,21,0.12)] transition hover:bg-yellow-300 hover:shadow-[0_10px_35px_rgba(250,204,21,0.18)]"
              >
                Explore tournaments
                <span className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>

              <Link
                href="/players"
                className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.02] px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
              >
                Find a player
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-600">
              <span>Live events</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>Major tournaments</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>Player results</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>Rankings</span>
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARD */}

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12">
        {/* LIVE EVENTS */}

        <div className="mb-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]" />

                <h3 className="text-xl font-black tracking-tight sm:text-2xl">
                  Live now
                </h3>
              </div>

              <p className="mt-1.5 text-xs text-zinc-600 sm:text-sm">
                Tournaments happening right now
              </p>
            </div>

            <Link
              href="/tournaments"
              className="shrink-0 text-xs font-semibold text-yellow-400 transition hover:text-yellow-300 sm:text-sm"
            >
              View all →
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {liveEvents.map((event) => (
              <div
                key={event.name}
                className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101012] shadow-[0_12px_50px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.16] hover:shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
              >
                <div className="relative flex aspect-[16/8] items-center justify-center overflow-hidden bg-gradient-to-br from-[#1c1c22] via-[#121216] to-[#0b0b0d]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_42%)]" />

                  <div className="absolute left-4 top-4 rounded-md bg-red-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-[0_0_18px_rgba(239,68,68,0.25)]">
                    ● Live
                  </div>

                  <div className="relative text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-lg transition group-hover:scale-110 group-hover:bg-white/[0.08]">
                      ▶
                    </div>

                    <p className="mt-3 text-xs font-medium text-zinc-600">
                      Live stream
                    </p>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-yellow-400">
                        {event.game}
                      </span>

                      <h4 className="mt-1 truncate text-lg font-black tracking-tight sm:text-xl">
                        {event.name}
                      </h4>
                    </div>

                    <span className="shrink-0 rounded-full border border-red-500/15 bg-red-500/[0.07] px-2.5 py-1 text-[10px] font-bold text-red-400">
                      {event.round}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.025] p-3.5">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                        Players
                      </p>

                      <p className="mt-1 text-sm font-bold text-zinc-200">
                        {event.players}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.025] p-3.5">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                        Watching
                      </p>

                      <p className="mt-1 text-sm font-bold text-zinc-200">
                        {event.viewers}
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/tournaments"
                    className="mt-3 block w-full rounded-xl border border-white/[0.06] bg-white/[0.035] py-3 text-center text-xs font-bold text-zinc-300 transition hover:border-white/[0.12] hover:bg-white/[0.07] hover:text-white"
                  >
                    Open tournament →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MAJOR EVENTS */}

        <div className="mb-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-sm font-black text-black shadow-[0_0_20px_rgba(250,204,21,0.12)]">
                ★
              </div>

              <div>
                <h3 className="text-xl font-black tracking-tight sm:text-2xl">
                  Major events
                </h3>

                <p className="mt-1 text-xs text-zinc-600 sm:text-sm">
                  Regionals, Internationals and World Championships
                </p>
              </div>
            </div>

            <Link
              href="/tournaments"
              className="shrink-0 text-xs font-semibold text-yellow-400 transition hover:text-yellow-300 sm:text-sm"
            >
              View all →
            </Link>
          </div>

          {majorTournaments && majorTournaments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {majorTournaments.map((event) => (
                <Link
                  key={event.id}
                  href={`/tournaments/${event.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-yellow-400/[0.12] bg-gradient-to-br from-[#171714] via-[#111113] to-[#0d0d0f] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-yellow-400/30 hover:shadow-[0_20px_60px_rgba(250,204,21,0.07)]"
                >
                  <div className="absolute left-0 top-0 h-full w-0.5 bg-yellow-400/70 transition group-hover:bg-yellow-400" />

                  <div className="absolute right-[-30px] top-[-40px] h-28 w-28 rounded-full bg-yellow-400/[0.035] blur-2xl transition group-hover:bg-yellow-400/[0.07]" />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-yellow-400/15 bg-yellow-400/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-yellow-400">
                            ★ Major
                          </span>

                          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">
                            {event.game}
                          </span>
                        </div>

                        <h4 className="line-clamp-2 text-base font-black leading-snug tracking-tight transition group-hover:text-yellow-300 sm:text-lg">
                          {event.name}
                        </h4>
                      </div>

                      <span className="shrink-0 text-lg text-yellow-400/60 transition group-hover:text-yellow-400">
                        ★
                      </span>
                    </div>

                    <div className="mt-6 flex items-end justify-between border-t border-white/[0.07] pt-4">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-600">
                          Date
                        </p>

                        <p className="mt-1 text-xs font-semibold text-zinc-300">
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

                      <span className="text-xs font-bold text-yellow-400 transition group-hover:translate-x-1">
                        View →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-[#101012] p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400/[0.07] text-xl text-yellow-400">
                ★
              </div>

              <p className="mt-4 text-sm font-semibold text-zinc-300">
                No major events found.
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Major tournaments will appear here when available.
              </p>
            </div>
          )}
        </div>

        {/* UPCOMING TOURNAMENTS */}

        <div>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-xl font-black tracking-tight sm:text-2xl">
                Upcoming tournaments
              </h3>

              <p className="mt-1 text-xs text-zinc-600 sm:text-sm">
                See what's coming next
              </p>
            </div>

            <Link
              href="/tournaments"
              className="shrink-0 text-xs font-semibold text-yellow-400 transition hover:text-yellow-300 sm:text-sm"
            >
              View all →
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101012]">
            {tournaments && tournaments.length > 0 ? (
              tournaments.map((event, index) => (
                <div
                  key={event.id}
                  className={`group flex flex-col gap-4 p-5 transition hover:bg-white/[0.025] md:flex-row md:items-center md:justify-between ${
                    index !== tournaments.length - 1
                      ? "border-b border-white/[0.07]"
                      : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035] text-[10px] font-black uppercase tracking-wide text-zinc-500 transition group-hover:border-white/[0.12] group-hover:text-zinc-300">
                      {event.game}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-sm font-bold text-zinc-200">
                          {event.name}
                        </h4>

                        {event.tier === "major" && (
                          <span className="rounded-full bg-yellow-400/[0.08] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-yellow-400">
                            Major
                          </span>
                        )}

                        {event.tier === "official" && (
                          <span className="rounded-full bg-blue-400/[0.08] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-400">
                            Official
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-xs text-zinc-600">
                        {event.location || "Location TBA"}
                        {event.country ? `, ${event.country}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <span className="text-xs font-medium text-zinc-500">
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
                      className="rounded-lg border border-white/[0.08] px-3 py-2 text-[11px] font-semibold text-zinc-400 transition hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white"
                    >
                      View event
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-xs text-zinc-600">
                  No upcoming tournaments found.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RECENT TOURNAMENTS */}

        <div className="mt-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-xl font-black tracking-tight sm:text-2xl">
                Recent tournaments
              </h3>

              <p className="mt-1 text-xs text-zinc-600 sm:text-sm">
                The latest completed events
              </p>
            </div>

            <Link
              href="/tournaments"
              className="shrink-0 text-xs font-semibold text-yellow-400 transition hover:text-yellow-300 sm:text-sm"
            >
              View all →
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101012]">
            {recentTournaments && recentTournaments.length > 0 ? (
              recentTournaments.map((event, index) => (
                <div
                  key={event.id}
                  className={`group flex flex-col gap-4 p-5 transition hover:bg-white/[0.025] md:flex-row md:items-center md:justify-between ${
                    index !== recentTournaments.length - 1
                      ? "border-b border-white/[0.07]"
                      : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035] text-[10px] font-black uppercase tracking-wide text-zinc-500 transition group-hover:border-white/[0.12] group-hover:text-zinc-300">
                      {event.game}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-sm font-bold text-zinc-200">
                          {event.name}
                        </h4>

                        {event.tier === "major" && (
                          <span className="rounded-full bg-yellow-400/[0.08] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-yellow-400">
                            Major
                          </span>
                        )}

                        {event.tier === "official" && (
                          <span className="rounded-full bg-blue-400/[0.08] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-400">
                            Official
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-xs text-zinc-600">
                        {event.location || "Location TBA"}
                        {event.country ? `, ${event.country}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <span className="text-xs font-medium text-zinc-500">
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
                      className="rounded-lg border border-white/[0.08] px-3 py-2 text-[11px] font-semibold text-zinc-400 transition hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white"
                    >
                      View event
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-xs text-zinc-600">
                  No recent tournaments found.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* TIMEZONE NOTICE */}

        <div className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.015] px-5 py-3.5">
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