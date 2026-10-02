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
    "Missing NEXT_PUBLIC_SUPABASE_URL"
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase =
  createClient(
    supabaseUrl,
    serviceRoleKey
  );

const requestedTournamentId =
  process.argv[2];

/* -------------------------------------------------------
   CONFIG
------------------------------------------------------- */

const API_BASE =
  "https://play.limitlesstcg.com/api/tournaments";

/*
  Normal refresh window.

  Refresh:
  - tournaments started within the last 3 days

  Upcoming tournaments are detected separately and
  skipped until they actually start.

  Historical tournaments older than 3 days are skipped.
*/
const DEEP_REFRESH_DAYS = 3;

/*
  Retry delays for Limitless rate limiting.
*/
const RETRY_DELAYS = [
  5000,
  10000,
  20000,
  40000,
  60000,
];

const MAX_RETRIES =
  RETRY_DELAYS.length;

/*
  Supabase bulk upsert size.
*/
const UPSERT_CHUNK_SIZE = 500;

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

/*
  Determines whether a tournament should receive
  a normal standings refresh.

  REFRESH:
  - tournaments started within the last 3 days

  SKIP:
  - upcoming tournaments
  - older historical tournaments
  - missing dates
  - invalid dates
*/
function isDeepRefreshTournament(
  startDate
) {
  if (!startDate) {
    return false;
  }

  const start =
    new Date(startDate);

  if (
    Number.isNaN(
      start.getTime()
    )
  ) {
    return false;
  }

  const now =
    new Date();

  /*
    Upcoming tournaments are handled separately.
  */
  if (start > now) {
    return false;
  }

  const cutoff =
    new Date();

  cutoff.setDate(
    cutoff.getDate() -
      DEEP_REFRESH_DAYS
  );

  return start >= cutoff;
}

/*
  Determines whether a tournament has not started yet.
*/
function isUpcomingTournament(
  startDate
) {
  if (!startDate) {
    return false;
  }

  const start =
    new Date(startDate);

  if (
    Number.isNaN(
      start.getTime()
    )
  ) {
    return false;
  }

  return start > new Date();
}

/* -------------------------------------------------------
   LIMITLESS API FETCH
------------------------------------------------------- */

async function fetchJson(url) {
  let attempt = 0;

  while (true) {
    const response =
      await fetch(url);

    if (response.ok) {
      return response.json();
    }

    /*
      Limitless rate limiting.
    */
    if (
      response.status === 429
    ) {
      if (
        attempt >=
        MAX_RETRIES
      ) {
        throw new Error(
          `Limitless rate limit persisted after ${MAX_RETRIES} retries.`
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
        `Waiting ${delay / 1000} seconds before retry ${
          attempt + 1
        }/${MAX_RETRIES}...`
      );

      await sleep(delay);

      attempt++;

      continue;
    }

    throw new Error(
      `Limitless API returned ${response.status} for ${url}`
    );
  }
}

/* -------------------------------------------------------
   CHUNKED SUPABASE UPSERT
------------------------------------------------------- */

async function upsertChunks(
  table,
  rows,
  options
) {
  for (
    let index = 0;
    index < rows.length;
    index += UPSERT_CHUNK_SIZE
  ) {
    const chunk =
      rows.slice(
        index,
        index +
          UPSERT_CHUNK_SIZE
      );

    const {
      error,
    } = await supabase
      .from(table)
      .upsert(
        chunk,
        options
      );

    if (error) {
      throw error;
    }
  }
}

/* -------------------------------------------------------
   IMPORT ONE TOURNAMENT
------------------------------------------------------- */

async function importTournament(
  tournament
) {
  /*
    Upcoming tournaments may appear in the Limitless
    tournament list before their details/standings
    endpoints become available.

    Do not call the API for them yet.

    The tournament will automatically be picked up
    after its start date passes.
  */

  if (
    isUpcomingTournament(
      tournament.start_date
    )
  ) {
    console.log("");

    console.log(
      `Skipping upcoming tournament: ${tournament.name}`
    );

    console.log(
      `Starts: ${tournament.start_date}`
    );

    return {
      name:
        tournament.name,

      limitlessId:
        tournament.source_id,

      upcoming: true,

      players: 0,

      playersImported: 0,

      standingsImported: 0,

      decklistsImported: 0,

      decklistsMissing: 0,
    };
  }

  const limitlessTournamentId =
    String(
      tournament.source_id
    );

  console.log("");
  console.log(
    "========================================"
  );

  console.log(
    `Tournament: ${tournament.name}`
  );

  console.log(
    `Limitless ID: ${limitlessTournamentId}`
  );

  console.log(
    `Start date: ${
      tournament.start_date ??
      "Unknown"
    }`
  );

  console.log(
    "========================================"
  );

  /*
    -----------------------------------------------------
    1. TOURNAMENT DETAILS
    -----------------------------------------------------
  */

  const detailsUrl =
    `${API_BASE}/${limitlessTournamentId}/details`;

  console.log(
    "Fetching tournament details..."
  );

  const details =
    await fetchJson(
      detailsUrl
    );

  console.log(
    `Decklist/teamlist submission enabled: ${
      details.decklists
        ? "YES"
        : "NO"
    }`
  );

  /*
    -----------------------------------------------------
    2. STANDINGS
    -----------------------------------------------------
  */

  const standingsUrl =
    `${API_BASE}/${limitlessTournamentId}/standings`;

  console.log(
    "Fetching standings..."
  );

  const standings =
    await fetchJson(
      standingsUrl
    );

  console.log(
    `Received ${standings.length} player standings.`
  );

  /*
    No standings returned.
  */

  if (
    standings.length === 0
  ) {
    console.log(
      "No standings returned."
    );

    return {
      name:
        tournament.name,

      limitlessId:
        limitlessTournamentId,

      players: 0,

      playersImported: 0,

      standingsImported: 0,

      decklistsImported: 0,

      decklistsMissing: 0,
    };
  }

  /*
    -----------------------------------------------------
    3. COLLECT PLAYER SOURCE IDS
    -----------------------------------------------------
  */

  const playerSourceIds = [
    ...new Set(
      standings.map(
        (entry) =>
          String(
            entry.player
          )
      )
    ),
  ];

  /*
    -----------------------------------------------------
    4. BULK LOAD EXISTING PLAYERS
    -----------------------------------------------------
  */

  const {
    data: existingPlayers,
    error:
      existingPlayersError,
  } = await supabase
    .from("players")
    .select(
      "id, name, country, source_id"
    )
    .eq(
      "source",
      "limitless"
    )
    .in(
      "source_id",
      playerSourceIds
    );

  if (
    existingPlayersError
  ) {
    throw existingPlayersError;
  }

  const existingPlayerMap =
    new Map(
      (
        existingPlayers ??
        []
      ).map(
        (player) => [
          String(
            player.source_id
          ),
          player,
        ]
      )
    );

  /*
    -----------------------------------------------------
    5. BULK UPSERT PLAYERS
    -----------------------------------------------------
  */

  const playerRows =
    standings.map(
      (entry) => ({
        name:
          entry.name ||
          entry.player,

        country:
          entry.country ||
          null,

        source:
          "limitless",

        source_id:
          String(
            entry.player
          ),
      })
    );

  await upsertChunks(
    "players",
    playerRows,
    {
      onConflict:
        "source,source_id",
    }
  );

  /*
    Reload players so we have their Supabase UUIDs.
  */

  const {
    data: refreshedPlayers,
    error:
      refreshedPlayersError,
  } = await supabase
    .from("players")
    .select(
      "id, name, country, source_id"
    )
    .eq(
      "source",
      "limitless"
    )
    .in(
      "source_id",
      playerSourceIds
    );

  if (
    refreshedPlayersError
  ) {
    throw refreshedPlayersError;
  }

  const playerMap =
    new Map(
      (
        refreshedPlayers ??
        []
      ).map(
        (player) => [
          String(
            player.source_id
          ),
          player,
        ]
      )
    );

  /*
    -----------------------------------------------------
    6. BUILD STANDINGS ROWS
    -----------------------------------------------------
  */

  const standingsRows = [];

  let decklistsImported = 0;

  let decklistsMissing = 0;

  for (
    const entry of standings
  ) {
    const playerSourceId =
      String(
        entry.player
      );

    const player =
      playerMap.get(
        playerSourceId
      );

    if (!player) {
      throw new Error(
        `Player ${playerSourceId} was not available after bulk import.`
      );
    }

    const record =
      entry.record || {};

    const standingsData = {
      tournament_id:
        tournament.id,

      player_id:
        player.id,

      rank:
        entry.placing ??
        null,

      wins:
        record.wins ?? 0,

      losses:
        record.losses ?? 0,

      ties:
        record.ties ?? 0,

      updated_at:
        new Date().toISOString(),
    };

    /*
      Only send decklist when Limitless actually
      returned one.

      This prevents an existing decklist from being
      replaced with NULL.
    */

    if (
      entry.decklist !=
      null
    ) {
      standingsData.decklist =
        entry.decklist;

      decklistsImported++;
    } else {
      decklistsMissing++;
    }

    standingsRows.push(
      standingsData
    );
  }

  /*
    -----------------------------------------------------
    7. BULK UPSERT STANDINGS
    -----------------------------------------------------
  */

  await upsertChunks(
    "standings",
    standingsRows,
    {
      onConflict:
        "tournament_id,player_id",
    }
  );

  /*
    -----------------------------------------------------
    RESULT
    -----------------------------------------------------
  */

  console.log("");

  console.log(
    "Tournament import complete."
  );

  console.log(
    `Players processed: ${standings.length}`
  );

  console.log(
    `Decklists imported: ${decklistsImported}`
  );

  console.log(
    `Decklists missing: ${decklistsMissing}`
  );

  return {
    name:
      tournament.name,

    limitlessId:
      limitlessTournamentId,

    players:
      standings.length,

    playersImported:
      Math.max(
        0,
        standings.length -
          existingPlayerMap.size
      ),

    standingsImported:
      standingsRows.length,

    decklistsImported,

    decklistsMissing,
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
      "id, name, source, source_id, start_date, player_count"
    )
    .eq(
      "source",
      "limitless"
    )
    .order(
      "start_date",
      {
        ascending: false,
        nullsFirst: false,
      }
    );

  if (error) {
    throw error;
  }

  return tournaments ?? [];
}

/* -------------------------------------------------------
   FIND TOURNAMENTS THAT NEED REFRESH
------------------------------------------------------- */

function findTournamentsToRefresh(
  tournaments
) {
  return tournaments.filter(
    (tournament) =>
      isDeepRefreshTournament(
        tournament.start_date
      )
  );
}

/* -------------------------------------------------------
   MAIN
------------------------------------------------------- */

async function main() {
  /*
    =======================================================
    MODE 1 — SPECIFIC TOURNAMENT
    =======================================================

    A tournament ID supplied on the command line always
    forces a refresh.

    This is useful for manually refreshing an older
    tournament when needed.
  */

  if (
    requestedTournamentId
  ) {
    console.log("");
    console.log(
      "========================================"
    );

    console.log(
      "PKM LIVE - SINGLE STANDINGS IMPORT"
    );

    console.log(
      "========================================"
    );

    const {
      data: tournament,
      error:
        tournamentError,
    } = await supabase
      .from("tournaments")
      .select(
        "id, name, source, source_id, start_date, player_count"
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

    /*
      A manually requested tournament is intentionally
      passed directly to importTournament().

      If it is still upcoming, importTournament() will
      safely skip it.
    */

    await importTournament(
      tournament
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
    "PKM LIVE - STANDINGS REFRESH"
  );

  console.log(
    "========================================"
  );

  console.log("");

  console.log(
    `Deep refresh window: ${DEEP_REFRESH_DAYS} days`
  );

  console.log(
    "Upcoming tournaments are always detected and skipped until they start."
  );

  console.log(
    `Historical tournaments older than ${DEEP_REFRESH_DAYS} days are skipped.`
  );

  console.log(
    "Missing/invalid dates are skipped during normal refresh."
  );

  console.log("");

  /*
    Load tournament archive.
  */

  const tournaments =
    await loadTournaments();

  if (
    tournaments.length === 0
  ) {
    console.log(
      "No Limitless tournaments found in Supabase."
    );

    return;
  }

  console.log(
    `Found ${tournaments.length} Limitless tournaments in Supabase.`
  );

  /*
    -----------------------------------------------------
    DATE DIAGNOSTICS
    -----------------------------------------------------
  */

  const missingDateTournaments =
    tournaments.filter(
      (tournament) =>
        !tournament.start_date
    );

  const invalidDateTournaments =
    tournaments.filter(
      (tournament) => {
        if (
          !tournament.start_date
        ) {
          return false;
        }

        return Number.isNaN(
          new Date(
            tournament.start_date
          ).getTime()
        );
      }
    );

  const futureTournaments =
    tournaments.filter(
      (tournament) =>
        isUpcomingTournament(
          tournament.start_date
        )
    );

  /*
    Determine which tournaments need refreshing.
  */

  const tournamentsToRefresh =
    findTournamentsToRefresh(
      tournaments
    );

  const skippedCount =
    tournaments.length -
    tournamentsToRefresh.length;

  /*
    Helpful date diagnostics.
  */

  const datedTournaments =
    tournaments.filter(
      (tournament) =>
        tournament.start_date
    );

  const newestTournament =
    datedTournaments[0];

  const oldestTournament =
    datedTournaments[
      datedTournaments.length - 1
    ];

  console.log("");

  console.log(
    `Missing start dates: ${missingDateTournaments.length}`
  );

  console.log(
    `Invalid start dates: ${invalidDateTournaments.length}`
  );

  console.log(
    `Upcoming tournaments: ${futureTournaments.length}`
  );

  console.log("");

  console.log(
    `Newest tournament: ${
      newestTournament?.name ??
      "Unknown"
    }`
  );

  console.log(
    `Newest start date: ${
      newestTournament?.start_date ??
      "Unknown"
    }`
  );

  console.log(
    `Oldest tournament: ${
      oldestTournament?.name ??
      "Unknown"
    }`
  );

  console.log(
    `Oldest start date: ${
      oldestTournament?.start_date ??
      "Unknown"
    }`
  );

  console.log("");

  console.log(
    `Standings refresh required: ${tournamentsToRefresh.length}`
  );

  console.log(
    `Historical tournaments skipped: ${skippedCount}`
  );

  console.log("");

  /*
    -----------------------------------------------------
    SAFETY CHECK
    -----------------------------------------------------

    Prevent an accidental full-archive refresh.

    If the filter somehow selects 90% or more of the
    archive, stop before making API calls.
  */

  const refreshPercentage =
    tournaments.length > 0
      ? (
          tournamentsToRefresh.length /
          tournaments.length
        ) *
        100
      : 0;

  if (
    tournaments.length >= 50 &&
    refreshPercentage >= 90
  ) {
    throw new Error(
      `Safety stop: standings refresh selected ${tournamentsToRefresh.length} of ${tournaments.length} tournaments (${refreshPercentage.toFixed(
        1
      )}%). Historical archive refresh was aborted.`
    );
  }

  /*
    -----------------------------------------------------
    REFRESH LOOP
    -----------------------------------------------------
  */

  const results = [];

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

    console.log("");

    console.log(
      `Progress: ${index + 1}/${tournamentsToRefresh.length}`
    );

    try {
      const result =
        await importTournament(
          tournament
        );

      results.push(
        result
      );
    } catch (error) {
      console.error("");

      console.error(
        `FAILED: ${tournament.name}`
      );

      console.error(
        error instanceof Error
          ? error.message
          : String(error)
      );

      results.push({
        name:
          tournament.name,

        limitlessId:
          tournament.source_id,

        error: true,
      });
    }
  }

  /*
    -----------------------------------------------------
    FINAL SUMMARY
    -----------------------------------------------------
  */

  let totalPlayers = 0;

  let totalDecklists = 0;

  let totalMissing = 0;

  let failedTournaments = 0;

  let upcomingSkipped = 0;

  for (
    const result of results
  ) {
    if (result.upcoming) {
      upcomingSkipped++;

      continue;
    }

    if (result.error) {
      failedTournaments++;

      continue;
    }

    totalPlayers +=
      result.players;

    totalDecklists +=
      result.decklistsImported;

    totalMissing +=
      result.decklistsMissing;
  }

  console.log("");

  console.log(
    "========================================"
  );

  console.log(
    "STANDINGS REFRESH COMPLETE"
  );

  console.log(
    "========================================"
  );

  console.log("");

  console.log(
    `Tournaments in database: ${tournaments.length}`
  );

  console.log(
    `Tournaments refreshed: ${tournamentsToRefresh.length}`
  );

  console.log(
    `Tournaments skipped: ${skippedCount}`
  );

  console.log(
    `Upcoming tournaments skipped: ${upcomingSkipped}`
  );

  console.log(
    `Total player standings: ${totalPlayers}`
  );

  console.log(
    `Total decklists imported: ${totalDecklists}`
  );

  console.log(
    `Total decklists missing: ${totalMissing}`
  );

  console.log(
    `Failed tournaments: ${failedTournaments}`
  );

  console.log("");
}

/* -------------------------------------------------------
   ERROR HANDLING
------------------------------------------------------- */

main().catch(
  (error) => {
    console.error("");

    console.error(
      "========================================"
    );

    console.error(
      "PKM LIVE - STANDINGS REFRESH FAILED"
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

