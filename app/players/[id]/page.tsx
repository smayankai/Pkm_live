import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PlayerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PlayerPage({
  params,
}: PlayerPageProps) {
  const { id } = await params;

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (playerError) {
    console.error("PLAYER ERROR:", playerError);
  }

  if (!player) {
    notFound();
  }

  const { data: tournamentResults, error: resultsError } =
    await supabase
      .from("standings")
      .select(`
        rank,
        wins,
        losses,
        ties,
        tournaments (
          id,
          name,
          game,
          start_date,
          status
        ),
        decklist
      `)
      .eq("player_id", id)
      .order("rank", { ascending: true });

  if (resultsError) {
    console.error("PLAYER RESULTS ERROR:", resultsError);
  }

  console.log(
    "PLAYER TOURNAMENT RESULTS:",
    JSON.stringify(tournamentResults, null, 2)
  );

  /*
   * Match history
   *
   * Matches can contain the player as either
   * player1_id or player2_id, so fetch both.
   */
  const { data: playerMatches, error: matchesError } =
    await supabase
      .from("matches")
      .select(
        "id, tournament_id, round, player1_id, player2_id, player1_score, player2_score, status, winner_id, phase, table_number"
      )
      .or(`player1_id.eq.${id},player2_id.eq.${id}`)
      .order("round", { ascending: false });

  if (matchesError) {
    console.error("PLAYER MATCHES ERROR:", matchesError);
  }

  const opponentIds = Array.from(
    new Set(
      (playerMatches ?? [])
        .map((match: any) =>
          match.player1_id === id
            ? match.player2_id
            : match.player1_id
        )
        .filter(Boolean)
    )
  );

  const tournamentIds = Array.from(
    new Set(
      (playerMatches ?? [])
        .map((match: any) => match.tournament_id)
        .filter(Boolean)
    )
  );

  const { data: opponents } =
    opponentIds.length > 0
      ? await supabase
          .from("players")
          .select("id, name")
          .in("id", opponentIds)
      : { data: [] };

  const { data: matchTournaments } =
    tournamentIds.length > 0
      ? await supabase
          .from("tournaments")
          .select("id, name, game, start_date")
          .in("id", tournamentIds)
      : { data: [] };

  const opponentMap = new Map(
    (opponents ?? []).map((opponent: any) => [
      opponent.id,
      opponent.name,
    ])
  );

  const tournamentMap = new Map(
    (matchTournaments ?? []).map((tournament: any) => [
      tournament.id,
      tournament,
    ])
  );

  /*
   * Only completed tournaments count toward
   * career statistics.
   */
  const completedResults =
    tournamentResults?.filter((result: any) => {
      const tournament = Array.isArray(result.tournaments)
        ? result.tournaments[0]
        : result.tournaments;

      return tournament?.status === "completed";
    }) ?? [];

  const totalWins = completedResults.reduce(
    (total: number, result: any) =>
      total + (result.wins ?? 0),
    0
  );

  const totalLosses = completedResults.reduce(
    (total: number, result: any) =>
      total + (result.losses ?? 0),
    0
  );

  const totalTies = completedResults.reduce(
    (total: number, result: any) =>
      total + (result.ties ?? 0),
    0
  );

  const totalMatches =
    totalWins + totalLosses + totalTies;

  const winRate =
    totalMatches > 0
      ? ((totalWins + totalTies * 0.5) /
          totalMatches) *
        100
      : null;

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

          <Link
            href="/"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      {/* Player Header */}
      <section className="border-b border-white/10 bg-gradient-to-b from-[#111118] to-[#09090b]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-2xl font-black text-yellow-400">
              {player.name.charAt(0).toUpperCase()}
            </div>

            <div>
              <h2 className="text-3xl font-black tracking-tight md:text-5xl">
                {player.name}
              </h2>

              <p className="mt-2 text-zinc-500">
                {player.country || "Country unknown"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Player Stats */}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {/* Tournaments Played */}
          <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <p className="text-sm text-zinc-500">
              Tournaments played
            </p>

            <p className="mt-2 text-3xl font-bold">
              {completedResults.length}
            </p>
          </div>

          {/* Matches Played */}
          <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <p className="text-sm text-zinc-500">
              Matches played
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalMatches}
            </p>
          </div>

          {/* Best Placing */}
          <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <p className="text-sm text-zinc-500">
              Best placing
            </p>

            <p className="mt-2 text-3xl font-bold">
              {completedResults.length
                ? Math.min(
                    ...completedResults
                      .map(
                        (result: any) => result.rank
                      )
                      .filter(
                        (rank: any) =>
                          rank != null
                      )
                  )
                : "—"}
            </p>
          </div>

          {/* Win Rate */}
          <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <p className="text-sm text-zinc-500">
              Win rate
            </p>

            <p className="mt-2 text-3xl font-bold">
              {winRate !== null
                ? `${winRate.toFixed(1)}%`
                : "—"}
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              {totalWins}-{totalLosses}-{totalTies}
            </p>
          </div>
        </div>

        {/* Tournament History */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#111114]">
          <div className="border-b border-white/10 px-6 py-5">
            <h3 className="text-xl font-bold">
              Tournament history
            </h3>

            <p className="mt-1 text-sm text-zinc-500">
              Recorded results from Pkm Live.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03]">
                <tr className="text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-6 py-4">
                    Tournament
                  </th>

                  <th className="px-6 py-4">
                    Game
                  </th>

                  <th className="px-6 py-4">
                    Date
                  </th>

                  <th className="px-6 py-4">
                    Place
                  </th>

                  <th className="px-6 py-4">
                    Record
                  </th>
                </tr>
              </thead>

              <tbody>
                {tournamentResults?.map(
                  (result: any, index: number) => {
                    const tournament =
                      Array.isArray(
                        result.tournaments
                      )
                        ? result.tournaments[0]
                        : result.tournaments;

                    const isUpcoming =
                      tournament?.status ===
                      "upcoming";

                    return (
                      <tr
                        key={`${tournament?.id}-${index}`}
                        className="border-b border-white/5 last:border-b-0"
                      >
                        <td className="px-6 py-5">
                          {tournament ? (
                            <>
                              <Link
                                href={`/tournaments/${tournament.id}`}
                                className="font-semibold text-white hover:text-yellow-400"
                              >
                                {tournament.name}
                              </Link>

                              {isUpcoming && (
                                <div className="mt-2">
                                  <span className="rounded-md border border-yellow-400/30 bg-yellow-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-400">
                                    Upcoming
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            "Unknown tournament"
                          )}
                        </td>

                        <td className="px-6 py-5 text-zinc-400">
                          {tournament?.game || "—"}
                        </td>

                        <td className="px-6 py-5 text-zinc-400">
                          {tournament?.start_date
                            ? new Date(
                                tournament.start_date
                              ).toLocaleDateString(
                                "en-IN"
                              )
                            : "—"}
                        </td>

                        <td className="px-6 py-5 font-bold text-yellow-400">
                          {isUpcoming
                            ? "—"
                            : result.rank ?? "—"}
                        </td>

                        <td className="px-6 py-5 text-zinc-300">
                          {isUpcoming
                            ? "Not played"
                            : `${result.wins ?? 0}-${result.losses ?? 0}-${result.ties ?? 0}`}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          {!tournamentResults?.length && (
            <div className="p-10 text-center text-zinc-500">
              No tournament history available yet.
            </div>
          )}
        </div>

        {/* Match History */}
        <section className="mt-10">
          <div className="rounded-2xl border border-white/10 bg-[#111114]">
            <div className="border-b border-white/10 px-6 py-5">
              <h3 className="text-xl font-bold">
                Match history
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Recorded matches from imported tournaments.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.03]">
                  <tr className="text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-6 py-4">
                      Tournament
                    </th>

                    <th className="px-6 py-4">
                      Round
                    </th>

                    <th className="px-6 py-4">
                      Opponent
                    </th>

                    <th className="px-6 py-4">
                      Result
                    </th>

                    <th className="px-6 py-4">
                      Score
                    </th>

                    <th className="px-6 py-4">
                      Table
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {(playerMatches ?? []).map(
                    (match: any) => {
                      const isPlayer1 =
                        match.player1_id === id;

                      const opponentId =
                        isPlayer1
                          ? match.player2_id
                          : match.player1_id;

                      const opponentName =
                        opponentMap.get(opponentId) ??
                        "Unknown player";

                      const tournament =
                        tournamentMap.get(
                          match.tournament_id
                        );

                      const playerScore =
                        isPlayer1
                          ? match.player1_score
                          : match.player2_score;

                      const opponentScore =
                        isPlayer1
                          ? match.player2_score
                          : match.player1_score;

                      const hasRecordedScore =
                        playerScore != null &&
                        opponentScore != null &&
                        !(
                          Number(playerScore) === 0 &&
                          Number(opponentScore) === 0
                        );

                      let result = "—";

                      if (
                        match.status ===
                        "completed"
                      ) {
                        if (
                          match.winner_id === id
                        ) {
                          result = "WIN";
                        } else if (
                          match.winner_id ===
                          opponentId
                        ) {
                          result = "LOSS";
                        } else {
                          result = "DRAW";
                        }
                      }

                      const resultClass =
                        result === "WIN"
                          ? "text-green-400"
                          : result === "LOSS"
                          ? "text-red-400"
                          : "text-zinc-400";

                      return (
                        <tr
                          key={match.id}
                          className="border-b border-white/5 last:border-b-0"
                        >
                          <td className="px-6 py-5">
                            {tournament ? (
                              <Link
                                href={`/tournaments/${tournament.id}`}
                                className="font-semibold text-white hover:text-yellow-400"
                              >
                                {tournament.name}
                              </Link>
                            ) : (
                              "Unknown tournament"
                            )}

                            {tournament?.game && (
                              <p className="mt-1 text-xs text-zinc-600">
                                {tournament.game}
                              </p>
                            )}
                          </td>

                          <td className="px-6 py-5 text-zinc-400">
                            Round{" "}
                            {match.round ?? "—"}
                          </td>

                          <td className="px-6 py-5 font-medium text-zinc-200">
                            {opponentName}
                          </td>

                          <td
                            className={`px-6 py-5 font-bold ${resultClass}`}
                          >
                            {result}
                          </td>

                          <td className="px-6 py-5 font-mono text-zinc-300">
                            {hasRecordedScore
                              ? `${playerScore} - ${opponentScore}`
                              : "—"}
                          </td>

                          <td className="px-6 py-5 text-zinc-500">
                            {match.table_number ??
                              "—"}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {!playerMatches?.length && (
              <div className="p-10 text-center text-zinc-500">
                No match history available yet.
              </div>
            )}
          </div>
        </section>
      </section>

      {/* Decklists */}
      <section className="mx-auto mt-10 max-w-7xl px-6">
        <div className="rounded-2xl border border-white/10 bg-[#111114]">
          <div className="border-b border-white/10 px-6 py-5">
            <h3 className="text-xl font-bold">
              Decklists
            </h3>

            <p className="mt-1 text-sm text-zinc-500">
              Pokémon used in recorded tournaments.
            </p>
          </div>

          <div className="space-y-6 p-6">
            {tournamentResults?.map(
              (result: any, index: number) => {
                const tournament =
                  Array.isArray(
                    result.tournaments
                  )
                    ? result.tournaments[0]
                    : result.tournaments;

                /*
                 * Upcoming tournaments should not
                 * display decklists on the player page.
                 */
                if (
                  tournament?.status !==
                  "completed"
                ) {
                  return null;
                }

                let decklist: any;

                try {
                  decklist =
                    typeof result.decklist ===
                    "string"
                      ? JSON.parse(
                          result.decklist
                        )
                      : result.decklist;
                } catch {
                  decklist = null;
                }

                console.log(
                  "DECKLIST CHECK:",
                  tournament?.name,
                  decklist
                );

                if (
                  !Array.isArray(decklist) ||
                  decklist.length === 0
                ) {
                  return null;
                }

                return (
                  <div
                    key={`${tournament?.id ?? "tournament"}-${index}`}
                    className="rounded-xl border border-white/10 bg-[#0b0b0d] p-6"
                  >
                    <div className="mb-5">
                      <h4 className="text-lg font-semibold">
                        {tournament?.name ??
                          "Tournament"}
                      </h4>

                      <p className="mt-1 text-sm text-zinc-500">
                        Place #
                        {result.rank ?? "—"} ·{" "}
                        {result.wins ?? 0}-
                        {result.losses ?? 0}-
                        {result.ties ?? 0}
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {decklist.map(
                        (pokemon: any) => (
                          <div
                            key={pokemon.id}
                            className="rounded-xl border border-white/10 bg-[#111114] p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={`https://play.pokemonshowdown.com/sprites/gen5/${pokemon.id}.png`}
                                  alt={
                                    pokemon.name
                                  }
                                  className="h-16 w-16 object-contain"
                                />

                                <div>
                                  <h5 className="font-semibold text-white">
                                    {
                                      pokemon.name
                                    }
                                  </h5>

                                  <p className="mt-1 text-xs text-zinc-500">
                                    {pokemon.item ||
                                      "No item"}
                                  </p>
                                </div>
                              </div>

                              <span className="text-xs text-zinc-500">
                                {pokemon.nature ||
                                  "—"}
                              </span>
                            </div>

                            <div className="mt-4">
                              <p className="text-xs text-zinc-500">
                                Ability
                              </p>

                              <p className="mt-1 text-sm text-zinc-300">
                                {pokemon.ability ||
                                  "—"}
                              </p>
                            </div>

                            <div className="mt-4">
                              <p className="text-xs text-zinc-500">
                                Attacks
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {Array.isArray(
                                  pokemon.attacks
                                ) &&
                                  pokemon.attacks.map(
                                    (
                                      attack: string
                                    ) => (
                                      <span
                                        key={
                                          attack
                                        }
                                        className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-300"
                                      >
                                        {attack}
                                      </span>
                                    )
                                  )}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              }
            )}

            {!tournamentResults?.some(
              (result: any) => {
                const tournament =
                  Array.isArray(
                    result.tournaments
                  )
                    ? result.tournaments[0]
                    : result.tournaments;

                let decklist: any;

                try {
                  decklist =
                    typeof result.decklist ===
                    "string"
                      ? JSON.parse(
                          result.decklist
                        )
                      : result.decklist;
                } catch {
                  decklist = null;
                }

                return (
                  tournament?.status ===
                    "completed" &&
                  Array.isArray(decklist) &&
                  decklist.length > 0
                );
              }
            ) && (
              <div className="p-10 text-center text-zinc-500">
                No decklists available yet.
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