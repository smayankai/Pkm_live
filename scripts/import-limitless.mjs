import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({
  path: ".env.local",
});

/* -------------------------------------------------------
   CONFIG
------------------------------------------------------- */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const API_URL =
  "https://play.limitlesstcg.com/api/tournaments?limit=200";

/*
  Recent tournaments are refreshed deeply.

  This means stream/details discovery is only performed
  for tournaments that are upcoming or started within
  this many days.
*/
const DEEP_REFRESH_DAYS = 30;

const RETRY_DELAYS = [
  5000,
  10000,
  20000,
  40000,
  60000,
];

const MAX_RETRIES = RETRY_DELAYS.length;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase environment variables."
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function isDeepRefreshTournament(startDate) {
  if (!startDate) {
    return true;
  }

  const start = new Date(startDate);

  if (Number.isNaN(start.getTime())) {
    return true;
  }

  const cutoff = new Date();

  cutoff.setDate(
    cutoff.getDate() - DEEP_REFRESH_DAYS
  );

  /*
    Upcoming tournaments are always included.
  */

  if (start > new Date()) {
    return true;
  }

  /*
    Recently completed tournaments are included.
  */

  return start >= cutoff;
}

/* -------------------------------------------------------
   FETCH WITH RETRY
------------------------------------------------------- */

async function fetchWithRetry(url) {
  let attempt = 0;

  while (true) {
    const response = await fetch(url);

    if (response.ok) {
      return response;
    }

    if (response.status === 429) {
      if (attempt >= MAX_RETRIES) {
        throw new Error(
          `Limitless rate limit persisted after ${MAX_RETRIES} retries.`
        );
      }

      const delay =
        RETRY_DELAYS[attempt];

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
      `Limitless request failed: ${response.status} ${response.statusText}`
    );
  }
}

/* -------------------------------------------------------
   TOURNAMENT TIER DETECTION
------------------------------------------------------- */

function getTournamentTier(name) {
  const normalizedName = String(name ?? "")
    .toLowerCase()
    .trim();

  if (
    normalizedName.includes("world championships") ||
    normalizedName.includes("world championship")
  ) {
    return "major";
  }

  if (
    normalizedName.includes(
      "international championships"
    ) ||
    normalizedName.includes(
      "international championship"
    ) ||
    normalizedName.includes("international") ||
    /\bnaic\b/i.test(normalizedName) ||
    /\beuic\b/i.test(normalizedName) ||
    /\blaic\b/i.test(normalizedName) ||
    /\bocic\b/i.test(normalizedName)
  ) {
    return "major";
  }

  if (
    normalizedName.includes(
      "regional championships"
    ) ||
    normalizedName.includes(
      "regional championship"
    ) ||
    /\bregional\b/i.test(normalizedName)
  ) {
    return "major";
  }

  if (
    normalizedName.includes("special event") ||
    normalizedName.includes("special events")
  ) {
    return "official";
  }

  if (
    normalizedName.includes("local") ||
    normalizedName.includes("locals") ||
    normalizedName.includes("weekly")
  ) {
    return "local";
  }

  return "online";
}

/* -------------------------------------------------------
   GAME NORMALIZATION
------------------------------------------------------- */

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

/* -------------------------------------------------------
   STREAM DETECTION
------------------------------------------------------- */

async function findStream(tournamentId) {
  const url =
    `https://play.limitlesstcg.com/tournament/${tournamentId}/details`;

  try {
    const response =
      await fetchWithRetry(url);

    const html =
      await response.text();

    const normalizedHtml = html
      .replace(/\\u0026/g, "&")
      .replace(/\\\//g, "/")
      .replace(/&quot;/g, '"')
      .replace(/&#x2F;/gi, "/")
      .replace(/&#47;/g, "/");

    const streamContextPatterns = [
      /(?:stream|streams|streamed|broadcast|watch live|live stream|livestream).{0,800}(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|live\/|embed\/)|youtu\.be\/|twitch\.tv\/)[A-Za-z0-9_?=&./@-]+)/is,

      /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|live\/|embed\/)|youtu\.be\/|twitch\.tv\/)[A-Za-z0-9_?=&./@-]+).{0,800}(?:stream|streams|streamed|broadcast|watch live|live stream|livestream)/is,
    ];

    for (const pattern of streamContextPatterns) {
      const match =
        normalizedHtml.match(pattern);

      if (!match) {
        continue;
      }

      const possibleUrl =
        match[1] ?? match[2];

      if (!possibleUrl) {
        continue;
      }

      return possibleUrl.replace(
        /[),.;]+$/,
        ""
      );
    }

    return null;
  } catch (error) {
    console.error(
      `Failed to find stream for ${tournamentId}:`,
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}

/* -------------------------------------------------------
   MAIN IMPORT
------------------------------------------------------- */

async function main() {
  console.log("");
  console.log("========================================");
  console.log(
    "PKM LIVE — LIMITLESS TOURNAMENT IMPORT"
  );
  console.log("========================================");
  console.log("");

  console.log(
    "Fetching tournaments from Limitless..."
  );

  /*
    IMPORTANT:

    The tournament list is ALWAYS fetched.

    This is how Pkm Live discovers new tournaments.
  */

  const response =
    await fetchWithRetry(API_URL);

  const tournaments =
    await response.json();

  console.log(
    `Received ${tournaments.length} tournaments.`
  );

  /*
    Load existing tournaments in one query.

    This replaces one Supabase lookup per tournament.
  */

  const {
    data: existingTournaments,
    error: existingError,
  } = await supabase
    .from("tournaments")
    .select(
      "id, name, game, status, start_date, player_count, stream_url, tier, source_id"
    )
    .eq("source", "limitless");

  if (existingError) {
    throw existingError;
  }

  const existingMap =
    new Map(
      (existingTournaments ?? []).map(
        (tournament) => [
          String(tournament.source_id),
          tournament,
        ]
      )
    );

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let streamsFound = 0;
  let deepRefreshed = 0;

  let majorCount = 0;
  let officialCount = 0;
  let localCount = 0;
  let onlineCount = 0;

  for (
    let index = 0;
    index < tournaments.length;
    index++
  ) {
    const tournament =
      tournaments[index];

    const tournamentId =
      String(tournament.id);

    const game =
      normalizeGame(tournament.game);

    if (!game) {
      skipped++;

      console.log(
        `Skipping tournament because game could not be determined: ${tournament.name}`
      );

      continue;
    }

    const startDate =
      tournament.date
        ? new Date(
            tournament.date
          ).toISOString()
        : null;

    const status =
      startDate
        ? new Date(startDate) > new Date()
          ? "upcoming"
          : "completed"
        : "upcoming";

    const tier =
      getTournamentTier(
        tournament.name
      );

    if (tier === "major") {
      majorCount++;
    } else if (tier === "official") {
      officialCount++;
    } else if (tier === "local") {
      localCount++;
    } else {
      onlineCount++;
    }

    const existing =
      existingMap.get(
        tournamentId
      );

    const isNew =
      !existing;

    const deepRefresh =
      isNew ||
      isDeepRefreshTournament(
        startDate
      );

    let streamUrl =
      existing?.stream_url ?? null;

    /*
      Only perform the expensive HTML request when
      the tournament is new or recent/upcoming.
    */

    if (deepRefresh) {
      deepRefreshed++;

      console.log("");
      console.log(
        `[${index + 1}/${tournaments.length}] Deep refresh: ${tournament.name}`
      );

      const detectedStream =
        await findStream(
          tournamentId
        );

      if (detectedStream) {
        streamUrl =
          detectedStream;

        streamsFound++;

        console.log(
          `Stream found: ${streamUrl}`
        );
      } else {
        console.log(
          `No stream found: ${tournament.name}`
        );
      }
    } else {
      console.log(
        `[${index + 1}/${tournaments.length}] Historical metadata: ${tournament.name}`
      );
    }

    const updates = {
      name: tournament.name,
      game,
      status,
      start_date: startDate,
      player_count:
        tournament.players ?? 0,
      source: "limitless",
      source_id: tournamentId,
      stream_url: streamUrl,
      tier,
    };

    /*
      NEW TOURNAMENT
    */

    if (!existing) {
      const {
        data: insertedTournament,
        error: insertError,
      } = await supabase
        .from("tournaments")
        .insert(updates)
        .select(
          "id, name, game, status, start_date, player_count, stream_url, tier, source_id"
        )
        .single();

      if (insertError) {
        throw insertError;
      }

      existingMap.set(
        tournamentId,
        insertedTournament
      );

      inserted++;

      console.log(
        `Imported: ${tournament.name}`
      );

      continue;
    }

    /*
      EXISTING TOURNAMENT
    */

    const hasChanges =
      existing.name !== updates.name ||
      existing.game !== updates.game ||
      existing.status !== updates.status ||
      existing.start_date !==
        updates.start_date ||
      existing.player_count !==
        updates.player_count ||
      existing.stream_url !==
        updates.stream_url ||
      existing.tier !==
        updates.tier;

    if (!hasChanges) {
      unchanged++;
      continue;
    }

    const {
      error: updateError,
    } = await supabase
      .from("tournaments")
      .update({
        name: updates.name,
        game: updates.game,
        status: updates.status,
        start_date: updates.start_date,
        player_count:
          updates.player_count,
        stream_url:
          updates.stream_url,
        tier: updates.tier,
      })
      .eq(
        "id",
        existing.id
      );

    if (updateError) {
      throw updateError;
    }

    updated++;

    console.log(
      `Updated: ${tournament.name}`
    );
  }

  console.log("");
  console.log("========================================");
  console.log("IMPORT COMPLETE");
  console.log("========================================");
  console.log("");

  console.log(
    `Inserted:       ${inserted}`
  );

  console.log(
    `Updated:        ${updated}`
  );

  console.log(
    `Unchanged:      ${unchanged}`
  );

  console.log(
    `Skipped:        ${skipped}`
  );

  console.log(
    `Deep refreshed: ${deepRefreshed}`
  );

  console.log(
    `Streams found:  ${streamsFound}`
  );

  console.log("");

  console.log(
    "Tournament tiers:"
  );

  console.log(
    `Major:          ${majorCount}`
  );

  console.log(
    `Official:       ${officialCount}`
  );

  console.log(
    `Local:          ${localCount}`
  );

  console.log(
    `Online:         ${onlineCount}`
  );

  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("========================================");
  console.error("IMPORT FAILED");
  console.error("========================================");
  console.error("");

  console.error(
    error instanceof Error
      ? error.message
      : error
  );

  console.error("");

  process.exit(1);
});