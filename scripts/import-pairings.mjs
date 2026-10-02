import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL in .env.local"
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
}

const supabase =
  createClient(
    supabaseUrl,
    serviceRoleKey
  );

const limitlessTournamentId =
  process.argv[2];

/* -------------------------------------------------------
   CONFIG
------------------------------------------------------- */

const DEEP_REFRESH_DAYS = 30;

const MAX_RETRIES = 5;

const RETRY_DELAYS = [
  5000,
  10000,
  20000,
  40000,
  60000,
];

const UPSERT_CHUNK_SIZE = 500;

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function isDeepRefreshTournament(
  startDate
) {
  if (!startDate) {
    return true;
  }

  const start =
    new Date(startDate);

  if (Number.isNaN(start.getTime())) {
    return true;
  }

  const now =
    new Date();

  /*
    Upcoming tournaments always refresh.
  */

  if (start > now) {
    return true;
  }

  const cutoff =
    new Date();

  cutoff.setDate(
    cutoff.getDate() -
      DEEP_REFRESH_DAYS
  );

  /*
    Recently completed tournaments refresh.
  */

  return start >= cutoff;
}

/* -------------------------------------------------------
   API
------------------------------------------------------- */

async function fetchPairings(
  tournamentSourceId
) {
  let attempt = 0;

  while (true) {
    const response =
      await fetch(
        "https://play.limitlesstcg.com/api/tournaments/" +
          tournamentSourceId +
          "/pairings"
      );

    if (response.ok) {
      return response.json();
    }

    if (
      response.status === 429
    ) {
      if (
        attempt >=
        MAX_RETRIES
      ) {
        throw new Error(
          "Limitless rate limit persisted after " +
            MAX_RETRIES +
            " retries."
        );
      }

      const delay =
        RETRY_DELAYS[
          attempt
        ];

      console.log("");
      console.log(
        "429 Too Many Requests."
      );

      console.log(
        "Waiting " +
          delay / 1000 +
          " seconds before retry " +
          (attempt + 1) +
          "/" +
          MAX_RETRIES +
          "..."
      );

      await sleep(delay);

      attempt++;

      continue;
    }

    if (
      response.status === 400 ||
      response.status === 404
    ) {
      return null;
    }

    throw new Error(
      "Limitless request failed: " +
        response.status +
        " " +
        response.statusText
    );
  }
}

/* -------------------------------------------------------
   CHUNKED UPSERT
------------------------------------------------------- */

async function upsertMatchRows(
  rows
) {
  for (
    let index = 0;
    index < rows.length;
    index +=
      UPSERT_CHUNK_SIZE
  ) {
    const chunk =
      rows.slice(
        index,
        index +
          UPSERT_CHUNK_SIZE
      );

    const {
      error: upsertError,
    } = await supabase
      .from("matches")
      .upsert(
        chunk,
        {
          onConflict:
            "source,source_id",
        }
      );

    if (upsertError) {
      throw upsertError;
    }
  }
}

/* -------------------------------------------------------
   IMPORT ONE TOURNAMENT
------------------------------------------------------- */

async function importTournamentPairings(
  tournamentSourceId,
  index = null,
  total = null
) {
  const progress =
    index !== null &&
    total !== null
      ? `[${index}/${total}]`
      : "";

  console.log("");
  console.log(
    "========================================"
  );

  console.log(
    `${progress} Processing pairings`
  );

  console.log(
    "========================================"
  );

  console.log(
    "Fetching pairings for tournament " +
      tournamentSourceId +
      "..."
  );

  const pairings =
    await fetchPairings(
      tournamentSourceId
    );

  if (pairings === null) {
    console.log(
      "Skipped - pairings unavailable."
    );

    return {
      status: "skipped",
      rows: 0,
      missingPlayers: 0,
    };
  }

  console.log(
    "Received " +
      pairings.length +
      " pairings."
  );

  const completePairings =
    pairings.filter(
      (pairing) =>
        pairing.player1 &&
        pairing.player2
    );

  console.log(
    "Pairings with two players: " +
      completePairings.length
  );

  /*
    Find tournament.
  */

  const {
    data: tournament,
    error:
      tournamentError,
  } = await supabase
    .from("tournaments")
    .select(
      "id, name, start_date"
    )
    .eq(
      "source",
      "limitless"
    )
    .eq(
      "source_id",
      tournamentSourceId
    )
    .maybeSingle();

  if (tournamentError) {
    throw tournamentError;
  }

  if (!tournament) {
    throw new Error(
      "Tournament not found in Supabase."
    );
  }

  console.log(
    "Database tournament: " +
      tournament.name
  );

  const playerSourceIds = [
    ...new Set(
      completePairings.flatMap(
        (pairing) => [
          String(
            pairing.player1
          ),
          String(
            pairing.player2
          ),
          pairing.winner !==
              null &&
            pairing.winner !==
              undefined &&
            pairing.winner !== -1
            ? String(
                pairing.winner
              )
            : null,
        ].filter(Boolean)
      )
    ),
  ];

  if (
    playerSourceIds.length ===
    0
  ) {
    console.log(
      "No complete pairings found."
    );

    return {
      status: "skipped",
      rows: 0,
      missingPlayers: 0,
    };
  }

  /*
    BULK LOAD PLAYERS

    This is one Supabase query instead of one
    query per pairing/player.
  */

  const {
    data: players,
    error: playersError,
  } = await supabase
    .from("players")
    .select(
      "id, name, source_id"
    )
    .eq(
      "source",
      "limitless"
    )
    .in(
      "source_id",
      playerSourceIds
    );

  if (playersError) {
    throw playersError;
  }

  const playerMap =
    new Map(
      (
        players ?? []
      ).map(
        (player) => [
          String(
            player.source_id
          ),
          player,
        ]
      )
    );

  let missingPlayers = 0;

  const missingPlayerIds =
    new Set();

  const rows = [];

  /*
    Build all match rows in memory.
  */

  for (
    const pairing of completePairings
  ) {
    const player1 =
      playerMap.get(
        String(
          pairing.player1
        )
      );

    const player2 =
      playerMap.get(
        String(
          pairing.player2
        )
      );

    if (!player1 || !player2) {
      missingPlayers++;

      if (!player1) {
        missingPlayerIds.add(
          String(
            pairing.player1
          )
        );
      }

      if (!player2) {
        missingPlayerIds.add(
          String(
            pairing.player2
          )
        );
      }

      continue;
    }

    const hasWinner =
      pairing.winner !==
        null &&
      pairing.winner !==
        undefined &&
      pairing.winner !== -1;

    const winner =
      hasWinner
        ? playerMap.get(
            String(
              pairing.winner
            )
          ) ?? null
        : null;

    const status =
      hasWinner
        ? "completed"
        : "scheduled";

    const sourceId = [
      tournamentSourceId,
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
        pairing.round ??
        null,
      phase:
        pairing.phase ??
        null,
      table_number:
        pairing.table ??
        null,
      player1_id:
        player1.id,
      player2_id:
        player2.id,
      winner_id:
        winner?.id ??
        null,
      status,
      source:
        "limitless",
      source_id:
        sourceId,
    });
  }

  console.log(
    "Rows ready for database: " +
      rows.length
  );

  console.log(
    "Missing players: " +
      missingPlayers
  );

  if (
    missingPlayerIds.size >
    0
  ) {
    console.log(
      "Missing player IDs:"
    );

    for (
      const playerId of
        missingPlayerIds
    ) {
      console.log(
        " - " + playerId
      );
    }
  }

  if (
    rows.length === 0
  ) {
    console.log(
      "No pairing rows were created."
    );

    return {
      status: "skipped",
      rows: 0,
      missingPlayers,
    };
  }

  /*
    BULK UPSERT MATCHES
  */

  await upsertMatchRows(
    rows
  );

  console.log(
    "Pairings import complete."
  );

  return {
    status: "success",
    rows:
      rows.length,
    missingPlayers,
  };
}

/* -------------------------------------------------------
   LOAD TOURNAMENTS
------------------------------------------------------- */

async function loadTournaments() {
  const {
    data: tournaments,
    error,
  } = await supabase
    .from("tournaments")
    .select(
      "id, name, source_id, start_date, player_count"
    )
    .eq(
      "source",
      "limitless"
    )
    .not(
      "source_id",
      "is",
      null
    )
    .order(
      "start_date",
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return tournaments ?? [];
}

/* -------------------------------------------------------
   FIND TOURNAMENTS THAT NEED PAIRINGS
------------------------------------------------------- */

async function findTournamentsToRefresh(
  tournaments
) {
  /*
    Load all tournament IDs that already have matches.

    This is one query instead of checking each tournament
    separately.
  */

  const {
    data: existingMatches,
    error,
  } = await supabase
    .from("matches")
    .select(
      "tournament_id"
    );

  if (error) {
    throw error;
  }

  const tournamentsWithMatches =
    new Set(
      (
        existingMatches ??
        []
      ).map(
        (row) =>
          String(
            row.tournament_id
          )
      )
    );

  return tournaments.filter(
    (tournament) => {
      const recent =
        isDeepRefreshTournament(
          tournament.start_date
        );

      const hasMatches =
        tournamentsWithMatches.has(
          String(
            tournament.id
          )
        );

      /*
        Refresh:
        - recent/upcoming tournaments
        - tournaments that have no matches yet
      */

      return (
        recent ||
        !hasMatches
      );
    }
  );
}

/* -------------------------------------------------------
   MAIN
------------------------------------------------------- */

async function main() {
  /*
    =======================================================
    MODE 1 — SINGLE TOURNAMENT
    =======================================================
  */

  if (
    limitlessTournamentId
  ) {
    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "PKM LIVE - SINGLE PAIRINGS IMPORT"
    );
    console.log(
      "========================================"
    );

    const result =
      await importTournamentPairings(
        limitlessTournamentId
      );

    console.log("");
    console.log(
      "Import finished."
    );

    console.log(
      "Rows imported: " +
        result.rows
    );

    console.log(
      "Missing players: " +
        result.missingPlayers
    );

    return;
  }

  /*
    =======================================================
    MODE 2 — NORMAL REFRESH
    =======================================================
  */

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "PKM LIVE - PAIRINGS / MATCHES REFRESH"
  );
  console.log(
    "========================================"
  );
  console.log("");

  const tournaments =
    await loadTournaments();

  if (
    tournaments.length ===
    0
  ) {
    console.log(
      "No tournaments found."
    );

    return;
  }

  console.log(
    "Total tournaments in database: " +
      tournaments.length
  );

  const tournamentsToRefresh =
    await findTournamentsToRefresh(
      tournaments
    );

  console.log(
    "Pairings refresh required for: " +
      tournamentsToRefresh.length
  );

  console.log(
    "Older tournaments skipped: " +
      (
        tournaments.length -
        tournamentsToRefresh.length
      )
  );

  let successful = 0;
  let skipped = 0;
  let failed = 0;

  let totalRows = 0;
  let totalMissingPlayers = 0;

  const failedTournaments = [];

  /*
    FIRST PASS
  */

  for (
    let index = 0;
    index <
      tournamentsToRefresh.length;
    index++
  ) {
    const tournament =
      tournamentsToRefresh[
        index
      ];

    const currentNumber =
      index + 1;

    console.log("");
    console.log(
      "Progress: " +
        currentNumber +
        "/" +
        tournamentsToRefresh.length
    );

    console.log(
      "Tournament: " +
        tournament.name
    );

    try {
      const result =
        await importTournamentPairings(
          tournament.source_id,
          currentNumber,
          tournamentsToRefresh.length
        );

      if (
        result.status ===
        "success"
      ) {
        successful++;

        totalRows +=
          result.rows;
      } else {
        skipped++;
      }

      totalMissingPlayers +=
        result.missingPlayers;
    } catch (error) {
      failed++;

      failedTournaments.push(
        tournament
      );

      console.error("");
      console.error(
        "FAILED [" +
          currentNumber +
          "/" +
          tournamentsToRefresh.length +
          "]: " +
          tournament.name
      );

      console.error(
        error instanceof Error
          ? error.message
          : String(error)
      );
    }
  }

  /*
    FINAL RETRY PASS
  */

  if (
    failedTournaments.length >
    0
  ) {
    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "FINAL RETRY PASS FOR FAILED TOURNAMENTS"
    );
    console.log(
      "========================================"
    );
    console.log("");

    console.log(
      "Failed tournaments to retry: " +
        failedTournaments.length
    );

    console.log(
      "Waiting 60 seconds before retry pass..."
    );

    await sleep(
      60000
    );

    for (
      let index = 0;
      index <
        failedTournaments.length;
      index++
    ) {
      const tournament =
        failedTournaments[
          index
        ];

      const retryNumber =
        index + 1;

      console.log("");
      console.log(
        "Retry progress: " +
          retryNumber +
          "/" +
          failedTournaments.length
      );

      console.log(
        "Retrying: " +
          tournament.name
      );

      try {
        const result =
          await importTournamentPairings(
            tournament.source_id,
            retryNumber,
            failedTournaments.length
          );

        if (
          result.status ===
          "success"
        ) {
          successful++;
          failed--;

          totalRows +=
            result.rows;

          totalMissingPlayers +=
            result.missingPlayers;

          console.log(
            "Final retry succeeded."
          );
        } else {
          skipped++;

          console.log(
            "Final retry skipped."
          );
        }
      } catch (error) {
        console.error("");
        console.error(
          "FINAL RETRY FAILED: " +
            tournament.name
        );

        console.error(
          error instanceof Error
            ? error.message
            : String(error)
        );
      }
    }
  }

  /*
    FINAL SUMMARY
  */

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "PAIRINGS / MATCHES COMPLETE"
  );
  console.log(
    "========================================"
  );
  console.log("");

  console.log(
    "Tournaments in database: " +
      tournaments.length
  );

  console.log(
    "Tournaments refreshed: " +
      tournamentsToRefresh.length
  );

  console.log(
    "Historical tournaments skipped: " +
      (
        tournaments.length -
        tournamentsToRefresh.length
      )
  );

  console.log(
    "Successful: " +
      successful
  );

  console.log(
    "Skipped: " +
      skipped
  );

  console.log(
    "Failed: " +
      failed
  );

  console.log(
    "Match rows imported: " +
      totalRows
  );

  console.log(
    "Missing players: " +
      totalMissingPlayers
  );

  console.log("");
}

main().catch(
  (error) => {
    console.error("");
    console.error(
      "========================================"
    );
    console.error(
      "PKM LIVE - PAIRINGS REFRESH FAILED"
    );
    console.error(
      "========================================"
    );
    console.error("");

    console.error(
      error instanceof Error
        ? error.message
        : String(error)
    );

    console.error("");

    process.exit(1);
  }
);