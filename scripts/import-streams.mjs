import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({
  path: ".env.local",
});

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const YOUTUBE_API_KEY =
  process.env.YOUTUBE_API_KEY;

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

if (!YOUTUBE_API_KEY) {
  throw new Error(
    "Missing YOUTUBE_API_KEY in .env.local"
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

/*
  YouTube search.list uses quota.

  Keep some headroom for testing/manual searches.
*/
const MAX_YOUTUBE_SEARCHES = 80;

/*
  Candidates need to reach this score before
  being stored.
*/
const MIN_CONFIDENCE = 80;

/*
  Normalize text so tournament names and video
  titles can be compared consistently.
*/
function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
  Check whether normalized text contains any
  of the supplied words/phrases.
*/
function containsAny(text, words) {
  return words.some((word) =>
    text.includes(normalizeText(word))
  );
}

/*
  Calculate tournament-name similarity.

  Returns a score from 0 to 100.
*/
function similarityScore(
  tournamentName,
  videoTitle
) {
  const tournamentText =
    normalizeText(tournamentName);

  const videoText =
    normalizeText(videoTitle);

  if (!tournamentText || !videoText) {
    return 0;
  }

  const tournamentWords =
    tournamentText
      .split(" ")
      .filter(
        (word) => word.length >= 3
      );

  if (!tournamentWords.length) {
    return 0;
  }

  const matchedWords =
    tournamentWords.filter(
      (word) =>
        videoText.includes(word)
    );

  return Math.round(
    (matchedWords.length /
      tournamentWords.length) *
      100
  );
}

/*
  Score a YouTube candidate.

  Higher score = stronger evidence that the
  video is actually connected to this tournament.
*/
function scoreCandidate({
  tournament,
  title,
  description,
  channelName,
  liveBroadcastContent,
  publishedAt,
}) {
  const titleText =
    normalizeText(title);

  const descriptionText =
    normalizeText(description);

  const channelText =
    normalizeText(channelName);

  let score = 0;

  /*
    Pokémon/game-related signals.
  */
  if (
    containsAny(titleText, [
      "pokemon",
      "pokemon tcg",
      "pokemon vgc",
      "ptcg",
      "tcg",
      "vgc",
    ])
  ) {
    score += 10;
  }

  /*
    Strong stream/broadcast signals.
  */
  if (
    containsAny(titleText, [
      "live",
      "stream",
      "broadcast",
      "coverage",
      "round",
      "top cut",
      "top 8",
      "top 16",
      "finals",
      "final",
      "day 1",
      "day 2",
    ])
  ) {
    score += 20;
  }

  /*
    Description signals.
  */
  if (
    containsAny(descriptionText, [
      "live",
      "stream",
      "broadcast",
      "coverage",
      "tournament",
      "pokemon",
      "ptcg",
      "vgc",
    ])
  ) {
    score += 10;
  }

  /*
    Tournament-name overlap.

    similarityScore returns 0-100.
  */
  const similarity =
    similarityScore(
      tournament.name,
      title
    );

  if (similarity >= 80) {
    score += 45;
  } else if (similarity >= 60) {
    score += 35;
  } else if (similarity >= 40) {
    score += 20;
  }

  /*
    Actual YouTube live state is a strong signal.
  */
  if (
    liveBroadcastContent === "live"
  ) {
    score += 25;
  } else if (
    liveBroadcastContent === "upcoming"
  ) {
    score += 25;
  }

  /*
    Reject instructional / registration /
    announcement videos.
  */
  if (
    containsAny(titleText, [
      "how to enter",
      "how to join",
      "how to register",
      "registration",
      "register",
      "rules",
      "rule guide",
      "guide",
      "tutorial",
      "announcement",
      "announcement video",
      "deck guide",
      "decklist guide",
      "how to play",
      "format guide",
    ])
  ) {
    score -= 70;
  }

  /*
    Generic Pokémon videos without tournament
    evidence should not become streams.
  */
  if (
    similarity < 25 &&
    liveBroadcastContent === "none"
  ) {
    score -= 25;
  }

  /*
    Older unrelated uploads receive less trust.
  */
  if (publishedAt) {
    const published =
      new Date(publishedAt);

    if (
      !Number.isNaN(
        published.getTime()
      )
    ) {
      const ageDays =
        (Date.now() -
          published.getTime()) /
        (1000 * 60 * 60 * 24);

      if (ageDays > 90) {
        score -= 15;
      }
    }
  }

  /*
    Broadcaster/channel signals.
  */
  if (
    containsAny(channelText, [
      "pokemon",
      "pokemon tcg",
      "tcg",
      "vgc",
      "limitless",
      "tournament",
      "regional",
    ])
  ) {
    score += 10;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );
}

/*
  Determine whether a YouTube video is a live
  broadcast or a normal VOD.
*/
function getStreamType(
  liveBroadcastContent
) {
  if (
    liveBroadcastContent === "live" ||
    liveBroadcastContent === "upcoming"
  ) {
    return "live";
  }

  return "vod";
}

/*
  Search YouTube.
*/
async function youtubeSearch(query) {
  const url = new URL(
    "https://www.googleapis.com/youtube/v3/search"
  );

  url.searchParams.set(
    "part",
    "snippet"
  );

  url.searchParams.set(
    "q",
    query
  );

  url.searchParams.set(
    "type",
    "video"
  );

  url.searchParams.set(
    "maxResults",
    "10"
  );

  url.searchParams.set(
    "order",
    "relevance"
  );

  url.searchParams.set(
    "key",
    YOUTUBE_API_KEY
  );

  const response =
    await fetch(url);

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `YouTube search failed: ${response.status} ${body}`
    );
  }

  return response.json();
}

/*
  Fetch detailed YouTube video information.
*/
async function youtubeVideos(
  videoIds
) {
  if (!videoIds.length) {
    return [];
  }

  const url = new URL(
    "https://www.googleapis.com/youtube/v3/videos"
  );

  url.searchParams.set(
    "part",
    "snippet,liveStreamingDetails"
  );

  url.searchParams.set(
    "id",
    videoIds.join(",")
  );

  url.searchParams.set(
    "key",
    YOUTUBE_API_KEY
  );

  const response =
    await fetch(url);

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `YouTube videos failed: ${response.status} ${body}`
    );
  }

  const data =
    await response.json();

  return data.items || [];
}

/*
  Load tournaments from Supabase.

  Oldest/unprocessed stream checks are prioritized
  later by priorityScore().
*/
async function getTournaments() {
  const { data, error } =
    await supabase
      .from("tournaments")
      .select(
        "id,source_id,name,start_date,tier,game,stream_checked_at"
      )
      .order(
        "stream_checked_at",
        {
          ascending: true,
          nullsFirst: true,
        }
      );

  if (error) {
    throw error;
  }

  return data || [];
}

/*
  Prioritize tournaments that are most likely
  to have useful stream coverage.
*/
function priorityScore(
  tournament
) {
  let score = 0;

  const start =
    tournament.start_date
      ? new Date(
          tournament.start_date
        )
      : null;

  if (
    start &&
    !Number.isNaN(
      start.getTime()
    )
  ) {
    const ageDays =
      Math.abs(
        (Date.now() -
          start.getTime()) /
          (1000 * 60 * 60 * 24)
      );

    if (ageDays <= 3) {
      score += 100;
    } else if (ageDays <= 7) {
      score += 80;
    } else if (ageDays <= 30) {
      score += 50;
    }
  }

  /*
    Tournament tier affects search priority,
    not whether a stream is allowed.
  */
  if (
    tournament.tier === "major"
  ) {
    score += 40;
  } else if (
    tournament.tier === "official"
  ) {
    score += 30;
  } else if (
    tournament.tier === "online"
  ) {
    score += 10;
  }

  const name =
    normalizeText(
      tournament.name
    );

  if (
    containsAny(name, [
      "stream",
      "live",
      "broadcast",
      "webcam",
      "coverage",
      "showdown",
      "cup",
      "championship",
      "regional",
      "international",
      "world",
      "open",
    ])
  ) {
    score += 20;
  }

  /*
    Never-checked tournaments get priority.
  */
  if (!tournament.stream_checked_at) {
    score += 50;
  }

  return score;
}

/*
  Build the YouTube search query.
*/
function buildSearchQuery(tournament) {
  const name = tournament.name || "";
  const game = normalizeText(tournament.game || "");

  if (tournament.tier === "major") {
    if (game === "tcg") {
      return `"${name}" Pokemon TCG live`;
    }

    if (game === "vgc") {
      return `"${name}" Pokemon VGC live`;
    }

    return `"${name}" Pokemon live`;
  }

  if (tournament.tier === "official") {
    if (game === "tcg") {
      return `"${name}" Pokemon TCG tournament`;
    }

    if (game === "vgc") {
      return `"${name}" Pokemon VGC tournament`;
    }

    return `"${name}" Pokemon tournament`;
  }

  if (tournament.tier === "online") {
    if (game === "tcg") {
      return `"${name}" PTCG`;
    }

    if (game === "vgc") {
      return `"${name}" VGC`;
    }

    return `"${name}" Pokemon`;
  }

  return `"${name}" Pokemon`;
}

/*
  Save a confirmed stream.
*/
async function saveStream(
  tournament,
  candidate
) {
  const url =
    `https://www.youtube.com/watch?v=${candidate.videoId}`;

  const { error } =
    await supabase
      .from("tournament_streams")
      .upsert(
        {
          tournament_id:
            tournament.id,

          platform:
            "youtube",

          url,

          external_id:
            candidate.videoId,

          stream_type:
            candidate.streamType,

          status:
            candidate.status,

          title:
            candidate.title,

          channel_name:
            candidate.channelName,

          confidence:
            candidate.confidence,

          discovered_by:
            "youtube",

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "tournament_id,url",
        }
      );

  if (error) {
    throw error;
  }
}

/*
  Mark this tournament as checked.
*/
async function markChecked(
  tournament
) {
  const { error } =
    await supabase
      .from("tournaments")
      .update({
        stream_checked_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        tournament.id
      );

  if (error) {
    throw error;
  }
}

/*
  Import streams for one tournament.
*/
async function importTournament(
  tournament
) {
  console.log("");
  console.log(
    `Tournament: ${tournament.name}`
  );

  console.log(
    `Limitless ID: ${tournament.source_id}`
  );

  const query =
    buildSearchQuery(
      tournament
    );

  console.log(
    `YouTube search: ${query}`
  );

  const search =
    await youtubeSearch(query);

  const searchItems =
    search.items || [];

  if (!searchItems.length) {
    console.log(
      "No YouTube candidates."
    );

    await markChecked(
      tournament
    );

    return {
      candidates: 0,
      accepted: 0,
    };
  }

  const videoIds =
    searchItems
      .map(
        (item) =>
          item?.id?.videoId
      )
      .filter(Boolean);

  const videos =
    await youtubeVideos(
      videoIds
    );

  let accepted = 0;

  for (
    const video of videos
  ) {
    const snippet =
      video.snippet || {};

    const title =
      snippet.title || "";

    const description =
      snippet.description || "";

    const channelName =
      snippet.channelTitle || "";

    const liveBroadcastContent =
      snippet.liveBroadcastContent ||
      "none";

    const confidence =
      scoreCandidate({
        tournament,
        title,
        description,
        channelName,
        liveBroadcastContent,
        publishedAt:
          snippet.publishedAt,
      });

    console.log(
      `Candidate: ${title}`
    );

    console.log(
      `Channel: ${channelName}`
    );

    console.log(
      `Confidence: ${confidence}`
    );

    if (
      confidence <
      MIN_CONFIDENCE
    ) {
      console.log(
        "Rejected."
      );

      continue;
    }

    const streamType =
      getStreamType(
        liveBroadcastContent
      );

    /*
      Keep accepted videos active for now.
      Later we can add proper ended/unavailable
      status tracking.
    */
    const status =
      "active";

    await saveStream(
      tournament,
      {
        videoId:
          video.id,

        title,

        channelName,

        confidence,

        streamType,

        status,
      }
    );

    console.log(
      `ACCEPTED: ${streamType}`
    );

    accepted++;
  }

  await markChecked(
    tournament
  );

  return {
    candidates:
      videos.length,

    accepted,
  };
}

/*
  Main importer.
*/
async function main() {
  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "PKM LIVE — STREAM IMPORT"
  );
  console.log(
    "========================================"
  );
  console.log("");

  const tournaments =
    await getTournaments();

  console.log(
    `Tournaments available: ${tournaments.length}`
  );

  const sorted =
    tournaments
      .slice()
      .sort(
        (a, b) =>
          priorityScore(b) -
          priorityScore(a)
      );

  const selected =
    sorted.slice(
      0,
      MAX_YOUTUBE_SEARCHES
    );

  console.log(
    `YouTube searches this run: ${selected.length}`
  );

  let searched = 0;
  let candidates = 0;
  let accepted = 0;
  let failed = 0;

  for (
    const tournament of selected
  ) {
    try {
      const result =
        await importTournament(
          tournament
        );

      searched++;

      candidates +=
        result.candidates;

      accepted +=
        result.accepted;
    } catch (error) {
      failed++;

      console.error(
        `Stream import failed for ${tournament.name}`
      );

      console.error(
        error.message
      );
    }
  }

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "STREAM IMPORT COMPLETE"
  );
  console.log(
    "========================================"
  );
  console.log("");

  console.log(
    `Tournaments searched: ${searched}`
  );

  console.log(
    `Candidates found:    ${candidates}`
  );

  console.log(
    `Streams accepted:    ${accepted}`
  );

  console.log(
    `Failed tournaments:  ${failed}`
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
      "STREAM IMPORT FAILED"
    );
    console.error(
      "========================================"
    );
    console.error("");

    console.error(
      error.message
    );

    console.error("");

    process.exit(1);
  }
);