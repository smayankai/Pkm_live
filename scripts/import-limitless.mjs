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
   TOURNAMENT TIER DETECTION
------------------------------------------------------- */

function getTournamentTier(name) {
  const normalizedName = String(name ?? "")
    .toLowerCase()
    .trim();

  /*
    MAJOR EVENTS

    World Championships
  */

  if (
    normalizedName.includes("world championships") ||
    normalizedName.includes("world championship")
  ) {
    return "major";
  }

  /*
    International Championships

    Also include the common event abbreviations:
    NAIC, EUIC, LAIC, OCIC
  */

  if (
    normalizedName.includes("international championships") ||
    normalizedName.includes("international championship") ||
    normalizedName.includes("international") ||
    /\bnaic\b/i.test(normalizedName) ||
    /\beuic\b/i.test(normalizedName) ||
    /\blaic\b/i.test(normalizedName) ||
    /\bocic\b/i.test(normalizedName)
  ) {
    return "major";
  }

  /*
    Regional Championships
  */

  if (
    normalizedName.includes("regional championships") ||
    normalizedName.includes("regional championship") ||
    /\bregional\b/i.test(normalizedName)
  ) {
    return "major";
  }

  /*
    OFFICIAL EVENTS
  */

  if (
    normalizedName.includes("special event") ||
    normalizedName.includes("special events")
  ) {
    return "official";
  }

  /*
    LOCAL EVENTS
  */

  if (
    normalizedName.includes("local") ||
    normalizedName.includes("locals") ||
    normalizedName.includes("weekly")
  ) {
    return "local";
  }

  /*
    DEFAULT

    Everything else is treated as an online event.
  */

  return "online";
}

/* -------------------------------------------------------
   STREAM DETECTION
------------------------------------------------------- */

async function findStream(tournamentId) {
  const url =
    `https://play.limitlesstcg.com/tournament/${tournamentId}/details`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.log(
        `Could not fetch tournament details for ${tournamentId}`
      );

      return null;
    }

    const html = await response.text();

    /*
      Limitless may expose stream URLs in normal HTML,
      embedded JSON, escaped JSON, or page data.

      Normalize common encodings first.
    */

    const normalizedHtml = html
      .replace(/\\u0026/g, "&")
      .replace(/\\\//g, "/")
      .replace(/&quot;/g, '"')
      .replace(/&#x2F;/gi, "/")
      .replace(/&#47;/g, "/");

    /*
      Supported stream URL patterns.
    */

    const streamPatterns = [
      // YouTube watch
      /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[A-Za-z0-9_-]+/i,

      // YouTube embed
      /https?:\/\/(?:www\.)?youtube\.com\/embed\/[A-Za-z0-9_-]+/i,

      // YouTube live
      /https?:\/\/(?:www\.)?youtube\.com\/live\/[A-Za-z0-9_-]+/i,

      // YouTube channel
      /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)[A-Za-z0-9_.@-]+/i,

      // YouTube short link
      /https?:\/\/youtu\.be\/[A-Za-z0-9_-]+/i,

      // Twitch
      /https?:\/\/(?:www\.)?twitch\.tv\/[A-Za-z0-9_]+/i,
    ];

    /*
      First pass:
      Search the normalized HTML directly.
    */

    for (const pattern of streamPatterns) {
      const match =
        normalizedHtml.match(pattern);

      if (match) {
        return match[0];
      }
    }

    /*
      Second pass:
      Extract all URLs from the page and inspect them.
    */

    const urls =
      normalizedHtml.match(
        /https?:\/\/[^\s"'<>\\]+/gi
      ) ?? [];

    for (const rawUrl of urls) {
      const cleanUrl = rawUrl.replace(
        /[),.;]+$/,
        ""
      );

      const isTwitch =
        /(?:www\.)?twitch\.tv\//i.test(
          cleanUrl
        );

      const isYouTube =
        /(?:www\.)?youtube\.com\//i.test(
          cleanUrl
        ) ||
        /youtu\.be\//i.test(
          cleanUrl
        );

      if (isTwitch || isYouTube) {
        return cleanUrl;
      }
    }

    /*
      Third pass:
      Look specifically around stream-related text.
    */

    const streamContextPatterns = [
      /stream.{0,500}(youtube|twitch).{0,500}/is,
      /(youtube|twitch).{0,500}stream.{0,500}/is,
    ];

    for (const pattern of streamContextPatterns) {
      const contextMatch =
        normalizedHtml.match(pattern);

      if (!contextMatch) {
        continue;
      }

      const contextUrls =
        contextMatch[0].match(
          /https?:\/\/[^\s"'<>\\]+/gi
        ) ?? [];

      for (const rawUrl of contextUrls) {
        const cleanUrl = rawUrl.replace(
          /[),.;]+$/,
          ""
        );

        if (
          /youtube\.com\//i.test(cleanUrl) ||
          /youtu\.be\//i.test(cleanUrl) ||
          /twitch\.tv\//i.test(cleanUrl)
        ) {
          return cleanUrl;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(
      `Failed to find stream for ${tournamentId}:`,
      error
    );

    return null;
  }
}

async function detectTournamentGame(tournamentId, fallbackGame) {
  const url =
    `https://play.limitlesstcg.com/tournament/${tournamentId}/details`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return fallbackGame;
    }

    const html = await response.text();

    const normalizedHtml = html
      .replace(/\\u0026/g, "&")
      .replace(/\\\//g, "/")
      .replace(/&quot;/g, '"')
      .replace(/&#x2F;/gi, "/")
      .replace(/&#47;/g, "/");

    const isPTCG =
      /value="PTCG"/i.test(normalizedHtml) ||
      (/Pokémon TCG/i.test(normalizedHtml) &&
        /Standard format/i.test(normalizedHtml));

    if (isPTCG) {
      return "TCG";
    }

    return fallbackGame;
  } catch (error) {
    console.log(
      `Could not detect game for ${tournamentId}:`,
      error.message
    );

    return fallbackGame;
  }
}

/* -------------------------------------------------------
   MAIN IMPORT
------------------------------------------------------- */

async function main() {
  console.log("");
  console.log("========================================");
  console.log("PKM LIVE — LIMITLESS TOURNAMENT IMPORT");
  console.log("========================================");
  console.log("");

  console.log(
    "Fetching VGC tournaments from Limitless..."
  );

  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(
      `Limitless API returned ${response.status}`
    );
  }

  const tournaments =
    await response.json();

  console.log(
    `Received ${tournaments.length} tournaments.`
  );

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let streamsFound = 0;

  let majorCount = 0;
  let officialCount = 0;
  let localCount = 0;
  let onlineCount = 0;

  for (const tournament of tournaments) {
    const tournamentId =
      String(tournament.id);

    const startDate = tournament.date
      ? new Date(
          tournament.date
        ).toISOString()
      : null;

    const status = startDate
      ? new Date(startDate) > new Date()
        ? "upcoming"
        : "completed"
      : "upcoming";

    /*
      Determine tournament tier.
    */

    const tier =
      getTournamentTier(tournament.name);

    /*
      Keep statistics for the import summary.
    */

    if (tier === "major") {
      majorCount++;
    } else if (tier === "official") {
      officialCount++;
    } else if (tier === "local") {
      localCount++;
    } else {
      onlineCount++;
    }

    console.log(
      `Tier: ${tier} | ${tournament.name}`
    );

    /*
      Always check Limitless for a stream.

      This allows a stream to be discovered even
      after the tournament was originally imported.
    */

    const streamUrl =
  await findStream(tournamentId);

const game =
  await detectTournamentGame(
    tournamentId,
    tournament.game
  );

    if (streamUrl) {
      streamsFound++;

      console.log(
        `Stream found: ${streamUrl}`
      );
    } else {
      console.log(
        `No stream found for: ${tournament.name}`
      );
    }

    /*
      Check whether tournament already exists.
    */

    const {
      data: existing,
      error: lookupError,
    } = await supabase
      .from("tournaments")
      .select(
        "id, name, game, status, start_date, player_count, stream_url, tier"
      )
      .eq("source", "limitless")
      .eq(
        "source_id",
        tournamentId
      )
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    /*
      EXISTING TOURNAMENT
    */

    if (existing) {
      const updates = {
        name: tournament.name,
        status,
        start_date: startDate,
        player_count:
          tournament.players ?? 0,
        stream_url: streamUrl,
        tier,
      };

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
        existing.tier !== updates.tier;

      if (!hasChanges) {
        unchanged++;

        console.log(
          `Unchanged: ${tournament.name}`
        );

        continue;
      }

      const {
        error: updateError,
      } = await supabase
        .from("tournaments")
        .update(updates)
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

      continue;
    }

    /*
      NEW TOURNAMENT
    */

    const {
      error: insertError,
    } = await supabase
      .from("tournaments")
      .insert({
        name: tournament.name,
        status,
        start_date: startDate,
        player_count:
          tournament.players ?? 0,
        source: "limitless",
        source_id: tournamentId,
        stream_url: streamUrl,
        tier,
      });

    if (insertError) {
      throw insertError;
    }

    inserted++;

    console.log(
      `Imported: ${tournament.name}`
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

/* -------------------------------------------------------
   RUN
------------------------------------------------------- */

main().catch((error) => {
  console.error("");
  console.error("========================================");
  console.error("IMPORT FAILED");
  console.error("========================================");
  console.error("");

  console.error(error);

  process.exit(1);
});