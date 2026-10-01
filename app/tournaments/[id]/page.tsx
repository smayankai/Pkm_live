import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TournamentTabs from "../TournamentTabs";

type TournamentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TournamentPage({
  params,
}: TournamentPageProps) {
  const { id } = await params;

  // The URL can contain either the Supabase UUID
  // or the original Limitless tournament ID.
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id
    );

  const { data: tournament, error: tournamentError } =
    await supabase
      .from("tournaments")
      .select("*")
      .eq(isUuid ? "id" : "source_id", id)
      .maybeSingle();

  if (tournamentError) {
    console.error(
      "TOURNAMENT ERROR:",
      tournamentError
    );
  }

  if (!tournament) {
    notFound();
  }

  const { data: standings, error: standingsError } =
    await supabase
      .from("standings")
      .select(`
        player_id,
        rank,
        wins,
        losses,
        ties,
        players (
          name,
          country
        )
      `)
      .eq("tournament_id", tournament.id)
      .order("rank", {
        ascending: true,
      });

  if (standingsError) {
    console.error(
      "STANDINGS ERROR:",
      standingsError
    );
  }

  const {
    data: matches,
    error: matchesError,
  } = await supabase
    .from("matches")
    .select(`
      id,
      round,
      phase,
      table_number,
      status,
      winner_id,
      player1_id,
      player2_id
    `)
    .eq("tournament_id", tournament.id)
    .order("round", {
      ascending: true,
    })
    .order("table_number", {
      ascending: true,
    });

  if (matchesError) {
    console.error(
      "MATCHES ERROR:",
      matchesError
    );
  }

  console.log(
    "TOURNAMENT ID:",
    tournament.id
  );

  console.log(
    "MATCHES COUNT:",
    matches?.length ?? 0
  );

  const matchPlayerIds = [
    ...new Set(
      (matches ?? []).flatMap((match) =>
        [
          match.player1_id,
          match.player2_id,
          match.winner_id,
        ].filter(Boolean)
      )
    ),
  ];

  const {
    data: matchPlayers,
    error: matchPlayersError,
  } =
    matchPlayerIds.length > 0
      ? await supabase
          .from("players")
          .select(
            "id, name, country"
          )
          .in(
            "id",
            matchPlayerIds
          )
      : {
          data: [],
          error: null,
        };

  if (matchPlayersError) {
    console.error(
      "MATCH PLAYERS ERROR:",
      matchPlayersError
    );
  }

  const playerMap = new Map(
    (matchPlayers ?? []).map(
      (player) => [
        player.id,
        player,
      ]
    )
  );

  const pairings = (
    matches ?? []
  ).map((match) => ({
    ...match,

    player1:
      playerMap.get(
        match.player1_id
      ) ?? null,

    player2:
      playerMap.get(
        match.player2_id
      ) ?? null,

    winner:
      match.winner_id
        ? playerMap.get(
            match.winner_id
          ) ?? null
        : null,
  }));

  console.log(
    "PAIRINGS COUNT:",
    pairings.length
  );

  const formattedDate =
    tournament.start_date
      ? new Date(
          tournament.start_date
        ).toLocaleDateString(
          "en-IN",
          {
            day: "numeric",
            month: "long",
            year: "numeric",
          }
        )
      : "Date TBA";

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
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

          <Link
            href="/"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <section className="border-b border-white/10 bg-gradient-to-b from-[#111118] to-[#09090b]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-yellow-400">
              {tournament.game}
            </span>

            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium capitalize text-zinc-400">
              {tournament.status}
            </span>

            {tournament.tier === "major" && (
              <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-400">
                ★ Major
              </span>
            )}

            {tournament.tier === "official" && (
              <span className="rounded-full bg-blue-400/10 px-3 py-1 text-xs font-bold text-blue-400">
                Official
              </span>
            )}
          </div>

          <h2 className="max-w-4xl text-3xl font-black tracking-tight md:text-5xl">
            {tournament.name}
          </h2>

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-zinc-400">
            <span className="rounded-lg bg-white/5 px-3 py-2">
              📅 {formattedDate}
            </span>

            <span className="rounded-lg bg-white/5 px-3 py-2">
              👥 {tournament.player_count ?? 0} players
            </span>

            <span className="rounded-lg bg-white/5 px-3 py-2">
              📍 {tournament.location || "Location TBA"}
              {tournament.country
                ? `, ${tournament.country}`
                : ""}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <p className="text-sm text-zinc-500">
              Status
            </p>

            <p className="mt-2 text-xl font-bold capitalize">
              {tournament.status}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <p className="text-sm text-zinc-500">
              Game
            </p>

            <p className="mt-2 text-xl font-bold">
              {tournament.game}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <p className="text-sm text-zinc-500">
              Players
            </p>

            <p className="mt-2 text-xl font-bold">
              {tournament.player_count ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <p className="text-sm text-zinc-500">
              Source
            </p>

            <p className="mt-2 text-xl font-bold capitalize">
              {tournament.source || "Unknown"}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <TournamentTabs
            tournamentId={id}
            standings={standings ?? []}
            pairings={pairings ?? []}
            streamUrl={tournament.stream_url}
            status={tournament.status}
          />
        </div>
      </section>

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