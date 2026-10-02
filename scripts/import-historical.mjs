import dotenv from "dotenv";

dotenv.config({
  path: process.env.GITHUB_ACTIONS
    ? undefined
    : ".env.local",
});

import { createClient } from "@supabase/supabase-js";

/* =======================================================
   ENVIRONMENT
======================================================= */

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL"
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey
);

/* =======================================================
   CONFIG
======================================================= */

const API_BASE =
  "https://play.limitlesstcg.com/api/tournaments";

const PAGE_SIZE = 200;

const RETRY_DELAYS = [
  10000,
  30000,
  60000,
  120000,
  240000,
];

const MAX_RETRIES =
  RETRY_DELAYS.length;

const UPSERT_CHUNK_SIZE = 500;

const ONLINE_AUTO_MIN_PLAYERS = 250;
const ONLINE_RELEVANT_MIN_PLAYERS = 150;

const ONLINE_SIGNALS = [
  "limitless showdown",
  "limitless invitational",
  "limitless online",
  "special online",
  "online regional",
  "online international",
  "online championship",
  "online championships",
  "major online",
  "international online",
  "regional online",
  "worlds online",
];

const WORLD_SIGNALS = [
  "world championships",
  "world championship",
  "worlds",
];

const INTERNATIONAL_SIGNALS = [
  "international championships",
  "international championship",
  "naic",
  "euic",
  "laic",
  "ocic",
];

const REGIONAL_SIGNALS = [
  "regional championships",
  "regional championship",
];

/* =======================================================
   HELPERS
======================================================= */

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function normalizeGame(game) {
  if (!game) {
    return null;
  }

  const normalized = String(game)
    .trim()
    .toUpperCase();

  if (!normalized) {
    return null;
  }

  if (normalized === "PTCG") {
    return "TCG";
  }

  return normalized;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function containsAny(text, signals) {
  return signals.some((signal) =>
    text.includes(signal)
  );
}

function classifyTournament(tournament) {
  const name =
    normalizeText(tournament.name);

  const players =
    Number(tournament.players || 0);

  if (
    containsAny(
      name,
      WORLD_SIGNALS
    )
  ) {
    return {
      include: true,
      category: "worlds",
      reason: "World Championship",
    };
  }

  if (
    containsAny(
      name,
      INTERNATIONAL_SIGNALS
    )
  ) {
    return {
      include: true,
      category: "international",
      reason:
        "International Championship",
    };
  }

  if (
    containsAny(
      name,
      REGIONAL_SIGNALS
    )
  ) {
    return {
      include: true,
      category: "regional",
      reason:
        "Regional Championship",
    };
  }

  const hasOnlineSignal =
    containsAny(
      name,
      ONLINE_SIGNALS
    );

  if (
    players >=
    ONLINE_AUTO_MIN_PLAYERS
  ) {
    return {
      include: true,
      category: "online",
      reason:
        "Large tournament",
    };
  }

  if (
    players >=
      ONLINE_RELEVANT_MIN_PLAYERS &&
    hasOnlineSignal
  ) {
    return {
      include: true,
      category: "online",
      reason:
        "Relevant online tournament",
    };
  }

  return {
    include: false,
    category: null,
    reason: "Not relevant",
  };
}

/* =======================================================
   LIMITLESS API
======================================================= */

async function fetchJson(
  url,
  label
) {
  let attempt = 0;

  while (true) {
    let response;

    try {
      response =
        await fetch(url);
    } catch (error) {
      if (
        attempt >=
        MAX_RETRIES
      ) {
        throw error;
      }

      const delay =
        RETRY_DELAYS[attempt];

      console.log("");

      console.log(
        `Network error for ${label}. Waiting ${
          delay / 1000
        }s...`
      );

      await sleep(delay);

      attempt++;

      continue;
    }

    if (response.ok) {
      return response.json();
    }

    if (
      response.status === 429 ||
      response.status === 503 ||
      response.status === 502
    ) {
      if (
        attempt >=
        MAX_RETRIES
      ) {
        throw new Error(
          `Limitless server/rate limit persisted for ${label} after ${MAX_RETRIES} retries.`
        );
      }

      const delay =
        RETRY_DELAYS[attempt];

      console.log("");

      console.log(
        `Rate/server limit for ${label}. Waiting ${
          delay / 1000
        }s...`
      );

      await sleep(delay);

      attempt++;

      continue;
    }

    if (
      response.status === 404
    ) {
      throw new Error(
        `Limitless returned 404 for ${label}`
      );
    }

    let body = "";

    try {
      body =
        await response.text();
    } catch {
      body = "";
    }

    throw new Error(
      `Limitless API returned ${response.status} for ${label}${
        body
          ? `: ${body.slice(0, 500)}`
          : ""
      }`
    );
  }
}

/* =======================================================
   FETCH ALL TOURNAMENT LIST ENTRIES
======================================================= */

async function fetchAllTournamentListings() {
  const tournaments = [];

  let page = 1;

  while (true) {
    console.log(
      `Fetching tournament page ${page}...`
    );

    const url =
      `${API_BASE}?limit=${PAGE_SIZE}&page=${page}`;

    const batch =
      await fetchJson(
        url,
        `tournament page ${page}`
      );

    if (
      !Array.isArray(batch)
    ) {
      throw new Error(
        `Unexpected tournament list response on page ${page}.`
      );
    }

    tournaments.push(
      ...batch
    );

    console.log(
      `Received ${batch.length} tournaments. Total: ${tournaments.length}`
    );

    if (
      batch.length <
      PAGE_SIZE
    ) {
      break;
    }

    page++;

    await sleep(250);
  }

  return tournaments;
}

/* =======================================================
   SUPABASE HELPERS
======================================================= */

async function upsertChunks(
  table,
  rows,
  options
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

/* =======================================================
   EXISTING HISTORICAL TOURNAMENTS
======================================================= */

async function loadCompletedHistoricalIds() {
  const {
    data,
    error,
  } = await supabase
    .from("tournaments")
    .select(
      "source_id"
    )
    .eq(
      "source",
      "limitless"
    )
    .not(
      "historical_imported_at",
      "is",
      null
    );

  if (error) {
    throw error;
  }

  return new Set(
    (data || []).map(
      (row) =>
        String(
          row.source_id
        )
    )
  );
}

/* =======================================================
   TOURNAMENT UPSERT
======================================================= */

async function getOrCreateTournament(
  listing,
  details,
  classification
) {
  const sourceId =
    String(listing.id);

  const game =
    normalizeGame(
      details.game ||
        listing.game
    );

  const tournamentRow = {
    name:
      details.name ||
      listing.name,

    source:
      "limitless",

    source_id:
      sourceId,

    game,

    format:
      details.format ||
      listing.format ||
      null,

    start_date:
      details.date ||
      listing.date ||
      null,

    player_count:
      Number(
        details.players ??
          listing.players ??
          0
      ),

    tier:
      classification.category ===
      "online"
        ? "online"
        : "major",
  };

  const {
    data,
    error,
  } = await supabase
    .from("tournaments")
    .upsert(
      tournamentRow,
      {
        onConflict:
          "source,source_id",
      }
    )
    .select(
      "id, name, source_id"
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =======================================================
   PLAYERS + STANDINGS
======================================================= */

async function importStandings(
  tournament,
  standings
) {
  if (
    !Array.isArray(
      standings
    ) ||
    standings.length === 0
  ) {
    return {
      players: 0,
      decklists: 0,
      missingDecklists: 0,
    };
  }

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

  const {
    data: players,
    error:
      playersError,
  } = await supabase
    .from("players")
    .select(
      "id, source_id"
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
      (players || []).map(
        (player) => [
          String(
            player.source_id
          ),
          player.id,
        ]
      )
    );

  const standingsRows = [];

  let decklists =
    0;

  let missingDecklists =
    0;

  for (
    const entry of standings
  ) {
    const playerId =
      playerMap.get(
        String(
          entry.player
        )
      );

    if (!playerId) {
      throw new Error(
        `Player ${entry.player} could not be resolved.`
      );
    }

    const record =
      entry.record || {};

    const row = {
      tournament_id:
        tournament.id,

      player_id:
        playerId,

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

    if (
      entry.decklist !==
      null &&
      entry.decklist !==
        undefined
    ) {
      row.decklist =
        entry.decklist;

      decklists++;
    } else {
      missingDecklists++;
    }

    standingsRows.push(
      row
    );
  }

  await upsertChunks(
    "standings",
    standingsRows,
    {
      onConflict:
        "tournament_id,player_id",
    }
  );

  return {
    players:
      standings.length,

    decklists,

    missingDecklists,
  };
}

/* =======================================================
   MATCHES / PAIRINGS
======================================================= */

async function importPairings(
  tournament,
  pairings
) {
  if (
    !Array.isArray(
      pairings
    ) ||
    pairings.length === 0
  ) {
    return 0;
  }

  const completePairings =
    pairings.filter(
      (pairing) =>
        pairing.player1 &&
        pairing.player2
    );

  if (
    completePairings.length ===
    0
  ) {
    return 0;
  }

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
        ]
      )
    ),
  ];

  const {
    data: players,
    error:
      playersError,
  } = await supabase
    .from("players")
    .select(
      "id, source_id"
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
      (players || []).map(
        (player) => [
          String(
            player.source_id
          ),
          player.id,
        ]
      )
    );

  const matchRows = [];

  for (
    const pairing of
      completePairings
  ) {
    const player1Id =
      playerMap.get(
        String(
          pairing.player1
        )
      );

    const player2Id =
      playerMap.get(
        String(
          pairing.player2
        )
      );

    if (
      !player1Id ||
      !player2Id
    ) {
      continue;
    }

    let winnerId = null;

    if (
      pairing.winner !==
        null &&
      pairing.winner !==
        undefined &&
      pairing.winner !==
        0 &&
      pairing.winner !==
        -1
    ) {
      winnerId =
        playerMap.get(
          String(
            pairing.winner
          )
        ) || null;
    }

    const sourceId = [
      String(
        tournament.source_id
      ),
      String(
        pairing.phase ??
          0
      ),
      String(
        pairing.round ??
          0
      ),
      String(
        pairing.table ??
          0
      ),
      String(
        pairing.player1
      ),
      String(
        pairing.player2
      ),
    ].join("-");

    matchRows.push({
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
        player1Id,

      player2_id:
        player2Id,

      winner_id:
        winnerId,

      status:
        pairing.winner !==
            null &&
        pairing.winner !==
          undefined
          ? "completed"
          : "scheduled",

      source:
        "limitless",

      source_id:
        sourceId,
    });
  }

  if (
    matchRows.length >
    0
  ) {
    await upsertChunks(
      "matches",
      matchRows,
      {
        onConflict:
          "source,source_id",
      }
    );
  }

  return matchRows.length;
}

/* =======================================================
   IMPORT ONE HISTORICAL TOURNAMENT
======================================================= */

async function importTournament(
  listing,
  classification,
  index,
  total
) {
  const sourceId =
    String(listing.id);

  console.log("");
  console.log(
    "========================================"
  );

  console.log(
    `[${index}/${total}] ${listing.name}`
  );

  console.log(
    `Players: ${listing.players ?? 0}`
  );

  console.log(
    `Category: ${classification.category}`
  );

  console.log(
    `Reason: ${classification.reason}`
  );

  console.log(
    "========================================"
  );

  const detailsUrl =
    `${API_BASE}/${sourceId}/details`;

  console.log(
    "Fetching tournament details..."
  );

  const details =
    await fetchJson(
      detailsUrl,
      `${listing.name} details`
    );

  if (
    classification.category ===
      "online" &&
    details.isOnline !==
      true &&
    !containsAny(
      normalizeText(
        listing.name
      ),
      ONLINE_SIGNALS
    )
  ) {
    console.log(
      "Rejected: tournament is not marked online."
    );

    return {
      imported: false,
      reason:
        "Not actually online",
    };
  }

  const tournament =
    await getOrCreateTournament(
      listing,
      details,
      classification
    );

  console.log(
    "Fetching standings..."
  );

  const standings =
    await fetchJson(
      `${API_BASE}/${sourceId}/standings`,
      `${listing.name} standings`
    );

  if (
    !Array.isArray(
      standings
    )
  ) {
    throw new Error(
      `Unexpected standings response for ${listing.name}.`
    );
  }

  console.log(
    `Standings received: ${standings.length}`
  );

  const standingsResult =
    await importStandings(
      tournament,
      standings
    );

  console.log(
    "Fetching pairings..."
  );

  const pairings =
    await fetchJson(
      `${API_BASE}/${sourceId}/pairings`,
      `${listing.name} pairings`
    );

  if (
    !Array.isArray(
      pairings
    )
  ) {
    throw new Error(
      `Unexpected pairings response for ${listing.name}.`
    );
  }

  console.log(
    `Pairings received: ${pairings.length}`
  );

  const matchesImported =
    await importPairings(
      tournament,
      pairings
    );

  const {
    error:
      completedError,
  } = await supabase
    .from("tournaments")
    .update({
      historical_imported_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      tournament.id
    );

  if (completedError) {
    throw completedError;
  }

  console.log("");

  console.log(
    "✓ Historical tournament imported successfully."
  );

  console.log(
    `Players: ${standingsResult.players}`
  );

  console.log(
    `Decklists: ${standingsResult.decklists}`
  );

  console.log(
    `Missing decklists: ${standingsResult.missingDecklists}`
  );

  console.log(
    `Matches: ${matchesImported}`
  );

  return {
    imported: true,

    players:
      standingsResult.players,

    decklists:
      standingsResult.decklists,

    missingDecklists:
      standingsResult.missingDecklists,

    matches:
      matchesImported,
  };
}

/* =======================================================
   MAIN
======================================================= */

async function main() {
  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "PKM LIVE — HISTORICAL ARCHIVE IMPORT"
  );
  console.log(
    "========================================"
  );

  console.log("");

  console.log(
    "Archive policy:"
  );

  console.log(
    "✓ Regional Championships"
  );

  console.log(
    "✓ International Championships"
  );

  console.log(
    "✓ World Championships"
  );

  console.log(
    "✓ Large/relevant online tournaments"
  );

  console.log(
    "✗ Locals"
  );

  console.log(
    "✗ Weekly tournaments"
  );

  console.log(
    "✗ Small online tournaments"
  );

  console.log("");

  const completedIds =
    await loadCompletedHistoricalIds();

  console.log(
    `Previously completed tournaments: ${completedIds.size}`
  );

  const listings =
    await fetchAllTournamentListings();

  console.log("");

  console.log(
    `Total tournaments discovered: ${listings.length}`
  );

  const candidates = [];

  let worlds = 0;
  let internationals = 0;
  let regionals = 0;
  let online = 0;

  let alreadyCompleted = 0;
  let rejected = 0;

  for (
    const listing of listings
  ) {
    const sourceId =
      String(listing.id);

    if (
      completedIds.has(
        sourceId
      )
    ) {
      alreadyCompleted++;

      continue;
    }

    const classification =
      classifyTournament(
        listing
      );

    if (
      !classification.include
    ) {
      rejected++;

      continue;
    }

    candidates.push({
      listing,
      classification,
    });

    if (
      classification.category ===
      "worlds"
    ) {
      worlds++;
    }

    if (
      classification.category ===
      "international"
    ) {
      internationals++;
    }

    if (
      classification.category ===
      "regional"
    ) {
      regionals++;
    }

    if (
      classification.category ===
      "online"
    ) {
      online++;
    }
  }

  console.log("");

  console.log(
    "========================================"
  );

  console.log(
    "HISTORICAL CANDIDATE FILTER"
  );

  console.log(
    "========================================"
  );

  console.log("");

  console.log(
    `Total Limitless tournaments: ${listings.length}`
  );

  console.log(
    `Already completed: ${alreadyCompleted}`
  );

  console.log(
    `Rejected before details request: ${rejected}`
  );

  console.log(
    `Candidates requiring details: ${candidates.length}`
  );

  console.log("");

  console.log(
    `World Championships: ${worlds}`
  );

  console.log(
    `International Championships: ${internationals}`
  );

  console.log(
    `Regional Championships: ${regionals}`
  );

  console.log(
    `Large/relevant online candidates: ${online}`
  );

  console.log("");

  const candidatePercentage =
    listings.length > 0
      ? (
          candidates.length /
          listings.length
        ) *
        100
      : 0;

  if (
    listings.length >= 100 &&
    candidatePercentage >= 50
  ) {
    throw new Error(
      `Safety stop: ${candidates.length} of ${listings.length} tournaments (${candidatePercentage.toFixed(
        1
      )}%) were selected for expensive detail requests.`
    );
  }

  if (
    candidates.length ===
    0
  ) {
    console.log(
      "No new historical tournaments require importing."
    );

    return;
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  let totalPlayers = 0;
  let totalDecklists = 0;
  let totalMissingDecklists = 0;
  let totalMatches = 0;

  const failedTournaments = [];

  for (
    let index = 0;
    index < candidates.length;
    index++
  ) {
    const {
      listing,
      classification,
    } =
      candidates[index];

    try {
      const result =
        await importTournament(
          listing,
          classification,
          index + 1,
          candidates.length
        );

      if (
        result.imported
      ) {
        imported++;

        totalPlayers +=
          result.players;

        totalDecklists +=
          result.decklists;

        totalMissingDecklists +=
          result.missingDecklists;

        totalMatches +=
          result.matches;
      } else {
        skipped++;
      }
    } catch (error) {
      failed++;

      failedTournaments.push({
        listing,
        classification,
      });

      console.error("");

      console.error(
        `✗ FAILED: ${listing.name}`
      );

      if (
        error instanceof Error
      ) {
        console.error(
          error.stack ||
            error.message
        );
      } else {
        console.error(
          JSON.stringify(
            error,
            null,
            2
          )
        );
      }
    }
  }

  console.log("");

  console.log(
    "========================================"
  );

  console.log(
    "HISTORICAL ARCHIVE IMPORT COMPLETE"
  );

  console.log(
    "========================================"
  );

  console.log("");

  console.log(
    `Total tournaments discovered: ${listings.length}`
  );

  console.log(
    `Previously completed: ${alreadyCompleted}`
  );

  console.log(
    `Candidates evaluated: ${candidates.length}`
  );

  console.log(
    `Imported: ${imported}`
  );

  console.log(
    `Skipped: ${skipped}`
  );

  console.log(
    `Failed: ${failed}`
  );

  console.log("");

  console.log(
    `Player standings imported: ${totalPlayers}`
  );

  console.log(
    `Decklists imported: ${totalDecklists}`
  );

  console.log(
    `Decklists missing: ${totalMissingDecklists}`
  );

  console.log(
    `Matches imported: ${totalMatches}`
  );

  console.log("");

  if (
    failedTournaments.length >
    0
  ) {
    console.log(
      "Failed tournaments will be retried on the next historical run:"
    );

    for (
      const failedTournament of
        failedTournaments
    ) {
      console.log(
        ` - ${failedTournament.listing.name}`
      );
    }

    console.log("");
  }

  console.log(
    "Historical archive process finished."
  );

  console.log("");
}

/* =======================================================
   ERROR HANDLER
======================================================= */

main().catch((error) => {
  console.error("");

  console.error(
    "========================================"
  );

  console.error(
    "PKM LIVE — HISTORICAL IMPORT FAILED"
  );

  console.error(
    "========================================"
  );

  console.error("");

  if (error instanceof Error) {
    console.error(
      error.stack ||
        error.message
    );
  } else {
    console.error(
      JSON.stringify(
        error,
        null,
        2
      )
    );
  }

  console.error("");

  process.exit(1);
});