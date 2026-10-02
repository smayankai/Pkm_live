import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

dotenv.config({
  path: process.env.GITHUB_ACTIONS
    ? undefined
    : ".env.local",
});

/* =========================================================
   CONFIG
========================================================= */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const LIMITLESS_API_BASE =
  "https://play.limitlesstcg.com/api";

const PAGE_SIZE = 200;

/*
 * Large online events:
 *
 * 500+ players:
 *   automatically accepted.
 *
 * 250-499 players:
 *   automatically accepted.
 *
 * 150-249 players:
 *   only accepted when the name/organizer contains
 *   a recognized major-event signal.
 *
 * Below 150:
 *   excluded by default.
 */

const ONLINE_AUTO_MIN_PLAYERS = 250;
const ONLINE_HIGH_MIN_PLAYERS = 500;
const ONLINE_RELEVANT_MIN_PLAYERS = 150;

const REQUEST_DELAY_MS = 250;

const MAX_RETRIES = 6;

const CHECKPOINT_FILE = path.join(
  process.cwd(),
  ".historical-import-checkpoint.json"
);

/*
 * Permanent archive marker.
 *
 * Requires this column in Supabase:
 *
 * alter table tournaments
 * add column if not exists historical_imported_at timestamptz;
 */

/* =========================================================
   VALIDATION
========================================================= */

if (!SUPABASE_URL) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL"
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

/* =========================================================
   HELPERS
========================================================= */

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGame(game) {
  if (!game) {
    return null;
  }

  const normalized =
    String(game)
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

function loadCheckpoint() {
  try {
    if (!fs.existsSync(CHECKPOINT_FILE)) {
      return {
        completed: [],
      };
    }

    const raw =
      fs.readFileSync(
        CHECKPOINT_FILE,
        "utf8"
      );

    const parsed = JSON.parse(raw);

    return {
      completed:
        Array.isArray(parsed.completed)
          ? parsed.completed
          : [],
    };
  } catch {
    return {
      completed: [],
    };
  }
}

function saveCheckpoint(completed) {
  fs.writeFileSync(
    CHECKPOINT_FILE,
    JSON.stringify(
      {
        updatedAt:
          new Date().toISOString(),
        completed,
      },
      null,
      2
    )
  );
}

/* =========================================================
   LIMITLESS API
========================================================= */

async function fetchJson(
  url,
  label = url
) {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    try {
      const response =
        await fetch(url, {
          headers: {
            Accept:
              "application/json",
            "User-Agent":
              "PKM-Live-Historical-Importer/1.0",
          },
        });

      if (response.ok) {
        await sleep(
          REQUEST_DELAY_MS
        );

        return response.json();
      }

      const retryable =
        response.status === 429 ||
        response.status >= 500;

      const body =
        await response.text();

      lastError =
        new Error(
          `${label}: HTTP ${response.status} ${body}`
        );

      if (!retryable) {
        throw lastError;
      }

      const retryAfter =
        Number(
          response.headers.get(
            "retry-after"
          )
        );

      const wait =
        Number.isFinite(
          retryAfter
        )
          ? retryAfter * 1000
          : Math.min(
              30000,
              1000 *
                Math.pow(
                  2,
                  attempt - 1
                )
            );

      console.log(
        `Rate/server limit for ${label}. Waiting ${wait}ms...`
      );

      await sleep(wait);
    } catch (error) {
      lastError = error;

      if (
        attempt === MAX_RETRIES
      ) {
        break;
      }

      const wait =
        Math.min(
          30000,
          1000 *
            Math.pow(
              2,
              attempt - 1
            )
        );

      console.log(
        `Request failed for ${label}. Retry ${attempt}/${MAX_RETRIES} in ${wait}ms...`
      );

      await sleep(wait);
    }
  }

  throw lastError;
}

/* =========================================================
   TOURNAMENT CLASSIFICATION
========================================================= */

function getMajorType(name) {
  const normalized =
    normalizeText(name);

  /*
   * WORLD CHAMPIONSHIPS
   */

  if (
    normalized.includes(
      "world championships"
    ) ||
    normalized.includes(
      "world championship"
    ) ||
    /\bworlds\b/.test(
      normalized
    )
  ) {
    return "world";
  }

  /*
   * INTERNATIONAL CHAMPIONSHIPS
   */

  if (
    normalized.includes(
      "international championships"
    ) ||
    normalized.includes(
      "international championship"
    ) ||
    /\bnaic\b/.test(normalized) ||
    /\beuic\b/.test(normalized) ||
    /\blaic\b/.test(normalized) ||
    /\bocic\b/.test(normalized)
  ) {
    return "international";
  }

  /*
   * REGIONAL CHAMPIONSHIPS
   */

  if (
    normalized.includes(
      "regional championships"
    ) ||
    normalized.includes(
      "regional championship"
    )
  ) {
    return "regional";
  }

  return null;
}

function hasRelevantOnlineSignal(
  name,
  organizerName
) {
  const text = normalizeText(
    `${name} ${organizerName}`
  );

  /*
   * These are deliberately conservative.
   *
   * We do NOT treat every tournament containing
   * "cup", "series", "championship", etc. as major.
   */

  const signals = [
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
  ];

  return signals.some(
    (signal) =>
      text.includes(signal)
  );
}

function classifyTournament(
  tournament,
  details
) {
  const majorType =
    getMajorType(
      tournament.name
    );

  /*
   * Official major events are always
   * included regardless of player count.
   */

  if (majorType) {
    return {
      included: true,
      category: majorType,
      reason:
        "official major championship",
    };
  }

  /*
   * Online events need explicit confirmation
   * from the Limitless details endpoint.
   */

  const isOnline =
    details?.isOnline === true;

  if (!isOnline) {
    return {
      included: false,
      category: null,
      reason:
        "not a Regional, International or World Championship and not online",
    };
  }

  const players =
    Number(
      tournament.players ?? 0
    );

  /*
   * Very large online events.
   */

  if (
    players >=
    ONLINE_AUTO_MIN_PLAYERS
  ) {
    return {
      included: true,
      category: "online",
      reason:
        `large online event (${players} players)`,
    };
  }

  /*
   * 150-249 players requires an explicit
   * recognized-major signal.
   */

  if (
    players >=
      ONLINE_RELEVANT_MIN_PLAYERS &&
    hasRelevantOnlineSignal(
      tournament.name,
      details?.organizer?.name
    )
  ) {
    return {
      included: true,
      category: "online",
      reason:
        `relevant online event (${players} players + recognized signal)`,
    };
  }

  return {
    included: false,
    category: null,
    reason:
      `online event below archive relevance threshold (${players} players)`,
  };
}

/* =========================================================
   FETCH ALL HISTORICAL TOURNAMENTS
========================================================= */

async function fetchAllTournaments() {
  const all = [];

  let page = 1;

  while (true) {
    const url =
      `${LIMITLESS_API_BASE}/tournaments` +
      `?limit=${PAGE_SIZE}` +
      `&page=${page}`;

    console.log(
      `Fetching tournament page ${page}...`
    );

    const tournaments =
      await fetchJson(
        url,
        `tournament page ${page}`
      );

    if (
      !Array.isArray(
        tournaments
      ) ||
      tournaments.length === 0
    ) {
      break;
    }

    all.push(
      ...tournaments
    );

    console.log(
      `Received ${tournaments.length} tournaments. Total: ${all.length}`
    );

    if (
      tournaments.length <
      PAGE_SIZE
    ) {
      break;
    }

    page++;
  }

  return all;
}

/* =========================================================
   SUPABASE TOURNAMENT
========================================================= */

async function getOrCreateTournament(
  tournament,
  classification
) {
  const sourceId =
    String(tournament.id);

  const startDate =
    tournament.date
      ? new Date(
          tournament.date
        ).toISOString()
      : null;

  const status =
    startDate &&
    new Date(startDate) >
      new Date()
      ? "upcoming"
      : "completed";

  const game =
    normalizeGame(
      tournament.game
    );

  const {
    data: existing,
    error: lookupError,
  } = await supabase
    .from("tournaments")
    .select(
      "id, name, game, status, start_date, player_count, tier, historical_imported_at"
    )
    .eq(
      "source",
      "limitless"
    )
    .eq(
      "source_id",
      sourceId
    )
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  const data = {
    name:
      tournament.name,
    game,
    status,
    start_date:
      startDate,
    player_count:
      tournament.players ??
      0,
    source:
      "limitless",
    source_id:
      sourceId,
    tier:
      "major",
  };

  if (existing) {
    const {
      error,
    } = await supabase
      .from("tournaments")
      .update(data)
      .eq(
        "id",
        existing.id
      );

    if (error) {
      throw error;
    }

    return {
      ...existing,
      ...data,
    };
  }

  const {
    data: inserted,
    error,
  } = await supabase
    .from("tournaments")
    .insert(data)
    .select(
      "id, name, game, status, start_date, player_count, tier, historical_imported_at"
    )
    .single();

  if (error) {
    throw error;
  }

  return inserted;
}

/* =========================================================
   PLAYERS + STANDINGS + DECKLISTS
========================================================= */

async function importStandings(
  tournament,
  standings
) {
  if (
    !Array.isArray(
      standings
    )
  ) {
    return {
      players: 0,
      standings: 0,
      decklists: 0,
    };
  }

  const playerSourceIds = [
    ...new Set(
      standings
        .map((entry) =>
          String(
            entry.player
          )
        )
        .filter(Boolean)
    ),
  ];

  const playerMap =
    new Map();

  /*
   * Load existing players in batches.
   */

  for (
    let i = 0;
    i <
    playerSourceIds.length;
    i += 500
  ) {
    const batch =
      playerSourceIds.slice(
        i,
        i + 500
      );

    const {
      data,
      error,
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
        batch
      );

    if (error) {
      throw error;
    }

    for (const player of
      data ?? []) {
      playerMap.set(
        player.source_id,
        player.id
      );
    }
  }

  let newPlayers = 0;

  /*
   * Create missing players.
   */

  for (const entry of
    standings) {
    const sourceId =
      String(
        entry.player
      );

    if (
      playerMap.has(
        sourceId
      )
    ) {
      continue;
    }

    const {
      data,
      error,
    } = await supabase
      .from("players")
      .insert({
        name:
          entry.name ||
          entry.player,
        country:
          entry.country ||
          null,
        source:
          "limitless",
        source_id:
          sourceId,
      })
      .select(
        "id, source_id"
      )
      .single();

    if (error) {
      /*
       * Another run may have created
       * the player between our lookup
       * and insert.
       */

      if (
        error.code ===
        "23505"
      ) {
        const {
          data: existing,
          error:
            lookupError,
        } = await supabase
          .from("players")
          .select(
            "id, source_id"
          )
          .eq(
            "source",
            "limitless"
          )
          .eq(
            "source_id",
            sourceId
          )
          .single();

        if (lookupError) {
          throw lookupError;
        }

        playerMap.set(
          sourceId,
          existing.id
        );

        continue;
      }

      throw error;
    }

    playerMap.set(
      sourceId,
      data.id
    );

    newPlayers++;
  }

  /*
   * Update player display information.
   */

  for (const entry of
    standings) {
    const sourceId =
      String(
        entry.player
      );

    const playerId =
      playerMap.get(
        sourceId
      );

    if (!playerId) {
      continue;
    }

    const {
      error,
    } = await supabase
      .from("players")
      .update({
        name:
          entry.name ||
          entry.player,
        country:
          entry.country ||
          null,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        playerId
      );

    if (error) {
      throw error;
    }
  }

  /*
   * Build standings rows.
   */

  const standingsRows =
    standings.map(
      (entry) => {
        const playerId =
          playerMap.get(
            String(
              entry.player
            )
          );

        const record =
          entry.record ||
          {};

        const row = {
          tournament_id:
            tournament.id,
          player_id:
            playerId,
          rank:
            entry.placing ??
            null,
          wins:
            record.wins ??
            0,
          losses:
            record.losses ??
            0,
          ties:
            record.ties ??
            0,
          updated_at:
            new Date().toISOString(),
        };

        /*
         * Never overwrite an existing
         * decklist with null.
         */

        if (
          entry.decklist !=
          null
        ) {
          row.decklist =
            entry.decklist;
        }

        return row;
      }
    );

  /*
   * Upsert in chunks to avoid
   * oversized requests.
   */

  for (
    let i = 0;
    i <
    standingsRows.length;
    i += 500
  ) {
    const batch =
      standingsRows.slice(
        i,
        i + 500
      );

    const {
      error,
    } = await supabase
      .from("standings")
      .upsert(
        batch,
        {
          onConflict:
            "tournament_id,player_id",
        }
      );

    if (error) {
      throw error;
    }
  }

  const decklists =
    standings.filter(
      (entry) =>
        entry.decklist !=
        null
    ).length;

  return {
    players:
      newPlayers,
    standings:
      standingsRows.length,
    decklists,
  };
}

/* =========================================================
   MATCHES
========================================================= */

async function importPairings(
  tournament,
  pairings
) {
  if (
    !Array.isArray(
      pairings
    )
  ) {
    return {
      matches: 0,
      missingPlayers: 0,
    };
  }

  const completePairings =
    pairings.filter(
      (pairing) =>
        pairing.player1 &&
        pairing.player2
    );

  const sourceIds = [
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

  const playerMap =
    new Map();

  for (
    let i = 0;
    i <
    sourceIds.length;
    i += 500
  ) {
    const batch =
      sourceIds.slice(
        i,
        i + 500
      );

    const {
      data,
      error,
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
        batch
      );

    if (error) {
      throw error;
    }

    for (const player of
      data ?? []) {
      playerMap.set(
        player.source_id,
        player.id
      );
    }
  }

  const rows = [];

  let missingPlayers =
    0;

  for (const pairing of
    completePairings) {
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

    if (
      !player1 ||
      !player2
    ) {
      missingPlayers++;
      continue;
    }

    const winner =
      pairing.winner !=
        null &&
      pairing.winner !==
        0 &&
      pairing.winner !==
        -1
        ? playerMap.get(
            String(
              pairing.winner
            )
          )
        : null;

    const status =
      pairing.winner !=
        null &&
      pairing.winner !==
        0 &&
      pairing.winner !==
        -1
        ? "completed"
        : "scheduled";

    /*
     * Match labels are important for
     * live-bracket phases.
     */

    const sourceId =
      [
        String(
          tournament.source_id
        ),
        pairing.phase ??
          0,
        pairing.round ??
          0,
        pairing.table ??
          pairing.match ??
          0,
        String(
          pairing.player1
        ),
        String(
          pairing.player2
        ),
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
        player1,
      player2_id:
        player2,
      winner_id:
        winner ?? null,
      status,
      source:
        "limitless",
      source_id:
        sourceId,
    });
  }

  for (
    let i = 0;
    i <
    rows.length;
    i += 500
  ) {
    const batch =
      rows.slice(
        i,
        i + 500
      );

    const {
      error,
    } = await supabase
      .from("matches")
      .upsert(
        batch,
        {
          onConflict:
            "source,source_id",
        }
      );

    if (error) {
      throw error;
    }
  }

  return {
    matches:
      rows.length,
    missingPlayers,
  };
}

/* =========================================================
   TOURNAMENT IMPORT
========================================================= */

async function importTournament(
  tournament,
  classification
) {
  const sourceId =
    String(tournament.id);

  console.log("");
  console.log(
    "----------------------------------------"
  );
  console.log(
    `IMPORT: ${tournament.name}`
  );
  console.log(
    `Limitless ID: ${sourceId}`
  );
  console.log(
    `Category: ${classification.category}`
  );
  console.log(
    `Reason: ${classification.reason}`
  );
  console.log(
    "----------------------------------------"
  );

  const details =
    await fetchJson(
      `${LIMITLESS_API_BASE}/tournaments/${sourceId}/details`,
      `${tournament.name} details`
    );

  const dbTournament =
    await getOrCreateTournament(
      tournament,
      classification
    );

  /*
   * Standings
   */

  let standingsResult = {
    players: 0,
    standings: 0,
    decklists: 0,
  };

  try {
    const standings =
      await fetchJson(
        `${LIMITLESS_API_BASE}/tournaments/${sourceId}/standings`,
        `${tournament.name} standings`
      );

    standingsResult =
      await importStandings(
        dbTournament,
        standings
      );

    console.log(
      `Standings: ${standingsResult.standings}`
    );

    console.log(
      `New players: ${standingsResult.players}`
    );

    console.log(
      `Decklists: ${standingsResult.decklists}`
    );
  } catch (error) {
    console.error(
      `Standings failed for ${tournament.name}:`,
      error.message
    );

    throw error;
  }

  /*
   * Pairings
   */

  let pairingsResult = {
    matches: 0,
    missingPlayers: 0,
  };

  try {
    const pairings =
      await fetchJson(
        `${LIMITLESS_API_BASE}/tournaments/${sourceId}/pairings`,
        `${tournament.name} pairings`
      );

    pairingsResult =
      await importPairings(
        dbTournament,
        pairings
      );

    console.log(
      `Matches: ${pairingsResult.matches}`
    );

    console.log(
      `Missing players: ${pairingsResult.missingPlayers}`
    );
  } catch (error) {
    console.error(
      `Pairings failed for ${tournament.name}:`,
      error.message
    );

    throw error;
  }

  /*
   * Mark the tournament as
   * successfully archived.
   */

  const {
    error:
      markerError,
  } = await supabase
    .from("tournaments")
    .update({
      historical_imported_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      dbTournament.id
    );

  if (markerError) {
    throw markerError;
  }

  return {
    standings:
      standingsResult,
    pairings:
      pairingsResult,
  };
}

/* =========================================================
   MAIN
========================================================= */

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

  const checkpoint =
    loadCheckpoint();

  const completed =
    new Set(
      checkpoint.completed
    );

  console.log(
    `Previously completed tournaments: ${completed.size}`
  );

  /*
   * Fetch every historical page.
   */

  const allTournaments =
    await fetchAllTournaments();

  console.log("");
  console.log(
    `Total tournaments discovered: ${allTournaments.length}`
  );

  /*
   * Sort oldest → newest.
   *
   * This makes the archive easier to
   * resume and audit.
   */

  allTournaments.sort(
    (a, b) =>
      new Date(
        a.date ?? 0
      ) -
      new Date(
        b.date ?? 0
      )
  );

  let candidates = 0;
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  let regional = 0;
  let international = 0;
  let worlds = 0;
  let online = 0;

  let totalStandings = 0;
  let totalDecklists = 0;
  let totalMatches = 0;

  /*
   * ---------------------------------------------------------
   * First pass:
   *
   * Major events can be classified directly from their names.
   *
   * Online events require a details request because Limitless
   * exposes isOnline there.
   * ---------------------------------------------------------
   */

  for (
    const tournament of
      allTournaments
  ) {
    const sourceId =
      String(
        tournament.id
      );

    /*
     * Already archived.
     */

    if (
      completed.has(
        sourceId
      )
    ) {
      skipped++;
      continue;
    }

    /*
     * Get major classification
     * before making a details request.
     */

    const majorType =
      getMajorType(
        tournament.name
      );

    let details = null;
    let classification = null;

    if (majorType) {
      classification = {
        included: true,
        category:
          majorType,
        reason:
          "official major championship",
      };
    } else {
      /*
       * Online status is only available
       * reliably from tournament details.
       */

      try {
        details =
          await fetchJson(
            `${LIMITLESS_API_BASE}/tournaments/${sourceId}/details`,
            `${tournament.name} details`
          );
      } catch (error) {
        console.error(
          `Could not inspect ${tournament.name}: ${error.message}`
        );

        failed++;
        continue;
      }

      classification =
        classifyTournament(
          tournament,
          details
        );
    }

    if (
      !classification.included
    ) {
      skipped++;
      continue;
    }

    candidates++;

    if (
      classification.category ===
      "regional"
    ) {
      regional++;
    }

    if (
      classification.category ===
      "international"
    ) {
      international++;
    }

    if (
      classification.category ===
      "world"
    ) {
      worlds++;
    }

    if (
      classification.category ===
      "online"
    ) {
      online++;
    }

    /*
     * Import.
     *
     * Details may already have been fetched
     * during classification. The importer
     * fetches it again only for consistency
     * and because details can change.
     */

    try {
      const result =
        await importTournament(
          tournament,
          classification
        );

      imported++;

      totalStandings +=
        result.standings
          .standings;

      totalDecklists +=
        result.standings
          .decklists;

      totalMatches +=
        result.pairings
          .matches;

      completed.add(
        sourceId
      );

      saveCheckpoint(
        [...completed]
      );

      console.log(
        `✓ Archived: ${tournament.name}`
      );
    } catch (error) {
      failed++;

      console.error("");
      console.error(
        `✗ FAILED: ${tournament.name}`
      );
      console.error(
        error.message
      );

      /*
       * Continue to the next tournament.
       *
       * The failed ID is NOT placed in the
       * checkpoint, so a future run retries it.
       */

      continue;
    }
  }

  /*
   * ---------------------------------------------------------
   * FINAL SUMMARY
   * ---------------------------------------------------------
   */

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "HISTORICAL ARCHIVE COMPLETE"
  );
  console.log(
    "========================================"
  );
  console.log("");

  console.log(
    `Discovered:        ${allTournaments.length}`
  );

  console.log(
    `Archive candidates: ${candidates}`
  );

  console.log(
    `Imported:          ${imported}`
  );

  console.log(
    `Skipped:           ${skipped}`
  );

  console.log(
    `Failed:            ${failed}`
  );

  console.log("");

  console.log(
    "Archive categories:"
  );

  console.log(
    `Regionals:         ${regional}`
  );

  console.log(
    `Internationals:    ${international}`
  );

  console.log(
    `Worlds:            ${worlds}`
  );

  console.log(
    `Relevant online:   ${online}`
  );

  console.log("");

  console.log(
    "Imported data:"
  );

  console.log(
    `Standings:         ${totalStandings}`
  );

  console.log(
    `Decklists:         ${totalDecklists}`
  );

  console.log(
    `Matches:           ${totalMatches}`
  );

  console.log("");

  console.log(
    `Checkpoint: ${CHECKPOINT_FILE}`
  );

  console.log("");

  if (failed > 0) {
    console.log(
      "Some tournaments failed and were left out of the checkpoint."
    );

    console.log(
      "Run the importer again to retry them."
    );
  } else {
    console.log(
      "All selected historical tournaments were archived successfully."
    );
  }

  console.log("");
}

main().catch(
  (error) => {
    console.error("");
    console.error(
      "========================================"
    );
    console.error(
      "HISTORICAL IMPORT FAILED"
    );
    console.error(
      "========================================"
    );
    console.error("");
    console.error(error);
    console.error("");

    process.exit(1);
  }
);