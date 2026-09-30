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
        )
      `)
      .eq("player_id", id)
      .order("rank", { ascending: true });

  if (resultsError) {
    console.error("PLAYER RESULTS ERROR:", resultsError);
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
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <p className="text-sm text-zinc-500">
              Tournaments played
            </p>

            <p className="mt-2 text-3xl font-bold">
              {tournamentResults?.length ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <p className="text-sm text-zinc-500">
              Best placing
            </p>

            <p className="mt-2 text-3xl font-bold">
              {tournamentResults?.length
                ? Math.min(
                    ...tournamentResults
                      .map((result: any) => result.rank)
                      .filter((rank: any) => rank != null)
                  )
                : "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <p className="text-sm text-zinc-500">
              Source
            </p>

            <p className="mt-2 text-3xl font-bold capitalize">
              {player.source || "Unknown"}
            </p>
          </div>
        </div>

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
                  <th className="px-6 py-4">Tournament</th>
                  <th className="px-6 py-4">Game</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Place</th>
                  <th className="px-6 py-4">Record</th>
                </tr>
              </thead>

              <tbody>
                {tournamentResults?.map(
                  (result: any, index: number) => {
                    const tournament = Array.isArray(
                      result.tournaments
                    )
                      ? result.tournaments[0]
                      : result.tournaments;

                    return (
                      <tr
                        key={`${tournament?.id}-${index}`}
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
                        </td>

                        <td className="px-6 py-5 text-zinc-400">
                          {tournament?.game || "—"}
                        </td>

                        <td className="px-6 py-5 text-zinc-400">
                          {tournament?.start_date
                            ? new Date(
                                tournament.start_date
                              ).toLocaleDateString("en-IN")
                            : "—"}
                        </td>

                        <td className="px-6 py-5 font-bold text-yellow-400">
                          {result.rank ?? "—"}
                        </td>

                        <td className="px-6 py-5 text-zinc-300">
                          {result.wins ?? 0}-
                          {result.losses ?? 0}-
                          {result.ties ?? 0}
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
      </section>

      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-sm text-zinc-600 md:flex-row">
          <p>Pkm Live — Competitive Pokémon, one screen.</p>
          <p>Independent fan project.</p>
        </div>
      </footer>
    </main>
  );
}