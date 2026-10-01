import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const limitlessTournamentId = "6aad0d0ae905c1db68744103";

async function main() {
  console.log(
    `Fetching pairings for Limitless tournament ${limitlessTournamentId}...`
  );

  const response = await fetch(
    `https://play.limitlesstcg.com/api/tournaments/${limitlessTournamentId}/pairings`
  );

  if (!response.ok) {
    throw new Error(
      `Limitless API error: ${response.status} ${response.statusText}`
    );
  }

  const pairings = await response.json();

  console.log(`Received ${pairings.length} pairings.`);

  const completePairings = pairings.filter(
    (pairing) => pairing.player1 && pairing.player2
  );

  console.log(
    `Pairings with two players: ${completePairings.length}`
  );

  // Get the Supabase tournament
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id, name")
    .eq("source", "limitless")
    .eq("source_id", limitlessTournamentId)
    .maybeSingle();

  if (tournamentError) {
    throw tournamentError;
  }

  if (!tournament) {
    throw new Error("Tournament not found in Supabase.");
  }

  console.log(`Database tournament: ${tournament.name}`);

  // Get all Limitless players
  const playerSourceIds = [
    ...new Set(
      completePairings.flatMap((pairing) => [
        pairing.player1,
        pairing.player2,
      ])
    ),
  ];

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, name, source_id")
    .eq("source", "limitless")
    .in("source_id", playerSourceIds);

  if (playersError) {
    throw playersError;
  }

  const playerMap = new Map(
    players.map((player) => [player.source_id, player])
  );

  let missingPlayers = 0;

  const rows = [];

  for (const pairing of completePairings) {
    const player1 = playerMap.get(pairing.player1);
    const player2 = playerMap.get(pairing.player2);

    if (!player1 || !player2) {
      missingPlayers++;

      console.log(
        `Skipping pairing because player was not found:`,
        pairing
      );

      continue;
    }

    const winner =
      pairing.winner && pairing.winner !== -1
        ? playerMap.get(pairing.winner)
        : null;

    const status =
      pairing.winner && pairing.winner !== -1
        ? "completed"
        : "scheduled";

    const sourceId = [
      limitlessTournamentId,
      pairing.phase ?? 0,
      pairing.round ?? 0,
      pairing.table ?? 0,
      pairing.player1,
      pairing.player2,
    ].join("-");

    rows.push({
      tournament_id: tournament.id,
      round: pairing.round ?? null,
      phase: pairing.phase ?? null,
      table_number: pairing.table ?? null,
      player1_id: player1.id,
      player2_id: player2.id,
      winner_id: winner?.id ?? null,
      status,
      source: "limitless",
      source_id: sourceId,
    });
  }

  console.log(`Rows ready for database: ${rows.length}`);
  console.log(`Missing players: ${missingPlayers}`);

  if (rows.length === 0) {
    throw new Error("No pairing rows were created.");
  }

  const { error: upsertError } = await supabase
    .from("matches")
    .upsert(rows, {
      onConflict: "source,source_id",
    });

  if (upsertError) {
    throw upsertError;
  }

  console.log("Pairings import complete.");
}

main().catch((error) => {
  console.error("IMPORT ERROR:", error);
  process.exit(1);
});