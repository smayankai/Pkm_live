import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey
);

const requestedTournamentId =
  process.argv[2];

const API_BASE =
  "https://play.limitlesstcg.com/api/tournaments";

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Limitless API returned ${response.status} for ${url}`
    );
  }

  return response.json();
}

async function importTournament(tournament) {
  const limitlessTournamentId =
    String(tournament.source_id);

  console.log("");
  console.log("========================================");
  console.log(
    `Tournament: ${tournament.name}`
  );
  console.log(
    `Limitless ID: ${limitlessTournamentId}`
  );
  console.log("========================================");

  const pairingsUrl =
    `${API_BASE}/${limitlessTournamentId}/pairings`;

  console.log(
    "Fetching pairings..."
  );

  const pairings =
    await fetchJson(pairingsUrl);

  console.log(
    `Received ${pairings.length} pairings.`
  );

  const completePairings =
    pairings.filter(
      (pairing) =>
        pairing.player1 &&
        pairing.player2
    );

  console.log(
    `Pairings with two players: ${completePairings.length}`
  );

  const playerSourceIds = [
    ...new Set(
      completePairings.flatMap(
        (pairing) => [
          pairing.player1,
          pairing.player2,
        ]
      )
    ),
  ];

  const {
    data: players,
    error: playersError,
  } = await supabase
    .from("players")
    .select(
      "id, name, source_id"
    )
    .eq("source", "limitless")
    .in(
      "source_id",
      playerSourceIds
    );

  if (playersError) {
    throw playersError;
  }

  const playerMap = new Map(
    (players ?? []).map(
      (player) => [
        player.source_id,
        player,
      ]
    )
  );

  let missingPlayers = 0;

  const rows = [];

  for (const pairing of completePairings) {
    const player1 =
      playerMap.get(
        pairing.player1
      );

    const player2 =
      playerMap.get(
        pairing.player2
      );

    if (!player1 || !player2) {
      missingPlayers++;

      console.log(
        "Skipping pairing because player was not found:",
        pairing
      );

      continue;
    }

    const winner =
      pairing.winner &&
      pairing.winner !== -1
        ? playerMap.get(
            pairing.winner
          )
        : null;

    const status =
      pairing.winner &&
      pairing.winner !== -1
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
      tournament_id:
        tournament.id,

      round:
        pairing.round ?? null,

      phase:
        pairing.phase ?? null,

      table_number:
        pairing.table ?? null,

      player1_id:
        player1.id,

      player2_id:
        player2.id,

      winner_id:
        winner?.id ?? null,

      status,

      source:
        "limitless",

      source_id:
        sourceId,
    });
  }

  console.log(
    `Rows ready for database: ${rows.length}`
  );

  console.log(
    `Missing players: ${missingPlayers}`
  );

  if (rows.length === 0) {
    throw new Error(
      "No pairing rows were created."
    );
  }

  const {
    error: upsertError,
  } = await supabase
    .from("matches")
    .upsert(
      rows,
      {
        onConflict:
          "source,source_id",
      }
    );

  if (upsertError) {
    throw upsertError;
  }

  console.log(
    `Pairings import complete. Imported ${rows.length} rows.`
  );

  return {
    name:
      tournament.name,

    limitlessId:
      limitlessTournamentId,

    pairings:
      pairings.length,

    imported:
      rows.length,

    missingPlayers,
  };
}

async function main() {
  if (requestedTournamentId) {
    console.log(
      `Running pairing import for tournament ${requestedTournamentId}...`
    );

    const {
      data: tournament,
      error: tournamentError,
    } = await supabase
      .from("tournaments")
      .select(
        "id, name, source, source_id"
      )
      .eq(
        "source",
        "limitless"
      )
      .eq(
        "source_id",
        String(
          requestedTournamentId
        )
      )
      .maybeSingle();

    if (tournamentError) {
      throw tournamentError;
    }

    if (!tournament) {
      throw new Error(
        "Could not find this Limitless tournament in Supabase."
      );
    }

    await importTournament(
      tournament
    );

    return;
  }

  console.log(
    "No tournament ID supplied."
  );

  console.log(
    "Loading all Limitless tournaments from Supabase..."
  );

  const {
    data: tournaments,
    error: tournamentsError,
  } = await supabase
    .from("tournaments")
    .select(
      "id, name, source, source_id"
    )
    .eq(
      "source",
      "limitless"
    )
    .order(
      "start_date",
      {
        ascending: false,
      }
    );

  if (tournamentsError) {
    throw tournamentsError;
  }

  if (
    !tournaments ||
    tournaments.length === 0
  ) {
    console.log(
      "No Limitless tournaments found in Supabase."
    );

    return;
  }

  console.log(
    `Found ${tournaments.length} Limitless tournaments.`
  );

  const results = [];

  for (const tournament of tournaments) {
    try {
      const result =
        await importTournament(
          tournament
        );

      results.push(result);
    } catch (error) {
      console.error("");
      console.error(
        `FAILED: ${tournament.name}`
      );
      console.error(error);

      results.push({
        name:
          tournament.name,

        limitlessId:
          tournament.source_id,

        error: true,
      });
    }
  }

  console.log("");
  console.log("");
  console.log("========================================");
  console.log(
    "ALL PAIRINGS IMPORT COMPLETE"
  );
  console.log("========================================");

  let totalPairings = 0;
  let totalImported = 0;
  let totalMissingPlayers = 0;
  let failedTournaments = 0;

  for (const result of results) {
    if (result.error) {
      failedTournaments++;
      continue;
    }

    totalPairings +=
      result.pairings;

    totalImported +=
      result.imported;

    totalMissingPlayers +=
      result.missingPlayers;

    console.log("");
    console.log(
      result.name
    );

    console.log(
      `Pairings: ${result.pairings}`
    );

    console.log(
      `Imported: ${result.imported}`
    );

    console.log(
      `Missing players: ${result.missingPlayers}`
    );
  }

  console.log("");
  console.log("========================================");
  console.log("TOTALS");
  console.log("========================================");

  console.log(
    `Tournaments processed: ${results.length}`
  );

  console.log(
    `Total pairings: ${totalPairings}`
  );

  console.log(
    `Total imported: ${totalImported}`
  );

  console.log(
    `Total missing players: ${totalMissingPlayers}`
  );

  console.log(
    `Failed tournaments: ${failedTournaments}`
  );
}

main().catch(
  (error) => {
    console.error("");
    console.error(
      "PAIRINGS IMPORT FAILED"
    );
    console.error(error);

    process.exit(1);
  }
);
