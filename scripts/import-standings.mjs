import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey
);

const requestedTournamentId = process.argv[2];

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
  const limitlessTournamentId = String(tournament.source_id);

  console.log("");
  console.log("========================================");
  console.log(`Tournament: ${tournament.name}`);
  console.log(`Limitless ID: ${limitlessTournamentId}`);
  console.log("========================================");

  /*
   * ---------------------------------------------------------
   * 1. Fetch tournament details
   * ---------------------------------------------------------
   */

  const detailsUrl =
    `${API_BASE}/${limitlessTournamentId}/details`;

  console.log("Fetching tournament details...");

  const details = await fetchJson(detailsUrl);

  console.log(
    `Decklist/teamlist submission enabled: ${
      details.decklists ? "YES" : "NO"
    }`
  );

  /*
   * ---------------------------------------------------------
   * 2. Fetch standings
   * ---------------------------------------------------------
   */

  const standingsUrl =
    `${API_BASE}/${limitlessTournamentId}/standings`;

  console.log("Fetching standings...");

  const standings = await fetchJson(standingsUrl);

  console.log(
    `Received ${standings.length} player standings.`
  );

  let playersImported = 0;
  let standingsImported = 0;
  let decklistsImported = 0;
  let decklistsMissing = 0;

  /*
   * ---------------------------------------------------------
   * 3. Import players + standings + available decklists
   * ---------------------------------------------------------
   */

  for (const entry of standings) {
    const playerSourceId = String(entry.player);

    /*
     * -------------------------------------------------------
     * Find existing player
     * -------------------------------------------------------
     */

    const {
      data: existingPlayer,
      error: playerLookupError,
    } = await supabase
      .from("players")
      .select("id")
      .eq("source", "limitless")
      .eq("source_id", playerSourceId)
      .maybeSingle();

    if (playerLookupError) {
      throw playerLookupError;
    }

    let playerId;

    /*
     * -------------------------------------------------------
     * Update existing player
     * -------------------------------------------------------
     */

    if (existingPlayer) {
      playerId = existingPlayer.id;

      const { error: playerUpdateError } =
        await supabase
          .from("players")
          .update({
            name: entry.name || entry.player,
            country: entry.country || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", playerId);

      if (playerUpdateError) {
        throw playerUpdateError;
      }
    }

    /*
     * -------------------------------------------------------
     * Create new player
     * -------------------------------------------------------
     */

    else {
      const {
        data: newPlayer,
        error: playerInsertError,
      } = await supabase
        .from("players")
        .insert({
          name: entry.name || entry.player,
          country: entry.country || null,
          source: "limitless",
          source_id: playerSourceId,
        })
        .select("id")
        .single();

      if (playerInsertError) {
        throw playerInsertError;
      }

      playerId = newPlayer.id;
      playersImported++;
    }

    /*
     * -------------------------------------------------------
     * Build standings record
     * -------------------------------------------------------
     */

    const record = entry.record || {};

    const standingsData = {
      tournament_id: tournament.id,
      player_id: playerId,
      rank: entry.placing ?? null,
      wins: record.wins ?? 0,
      losses: record.losses ?? 0,
      ties: record.ties ?? 0,
      updated_at: new Date().toISOString(),
    };

    /*
     * -------------------------------------------------------
     * IMPORTANT:
     *
     * Only write decklist when Limitless actually returned one.
     *
     * This prevents a null API response from deleting a
     * previously imported decklist.
     * -------------------------------------------------------
     */

    if (entry.decklist != null) {
      standingsData.decklist = entry.decklist;
      decklistsImported++;
    } else {
      decklistsMissing++;
    }

    /*
     * -------------------------------------------------------
     * Upsert standings
     * -------------------------------------------------------
     */

    const { error: standingsError } =
      await supabase
        .from("standings")
        .upsert(
          standingsData,
          {
            onConflict: "tournament_id,player_id",
          }
        );

    if (standingsError) {
      throw standingsError;
    }

    standingsImported++;
  }

  /*
   * ---------------------------------------------------------
   * Tournament summary
   * ---------------------------------------------------------
   */

  console.log("");
  console.log("Tournament import complete.");
  console.log(`New players: ${playersImported}`);
  console.log(`Standings processed: ${standingsImported}`);
  console.log(`Decklists imported: ${decklistsImported}`);
  console.log(`Decklists missing: ${decklistsMissing}`);

  return {
    name: tournament.name,
    limitlessId: limitlessTournamentId,
    players: standings.length,
    decklistsEnabled: details.decklists === true,
    decklistsImported,
    decklistsMissing,
  };
}

async function main() {
  /*
   * =========================================================
   * MODE 1:
   *
   * Specific tournament:
   *
   * node scripts/import-standings.mjs 6abb9a23880ed327106df304
   * =========================================================
   */

  if (requestedTournamentId) {
    console.log(
      `Running import for tournament ${requestedTournamentId}...`
    );

    const {
      data: tournament,
      error: tournamentError,
    } = await supabase
      .from("tournaments")
      .select("id, name, source, source_id")
      .eq("source", "limitless")
      .eq(
        "source_id",
        String(requestedTournamentId)
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

    await importTournament(tournament);

    return;
  }

  /*
   * =========================================================
   * MODE 2:
   *
   * No ID:
   *
   * node scripts/import-standings.mjs
   *
   * Import EVERY Limitless tournament in Supabase.
   * =========================================================
   */

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
    .select("id, name, source, source_id")
    .eq("source", "limitless")
    .order("start_date", {
      ascending: false,
    });

  if (tournamentsError) {
    throw tournamentsError;
  }

  if (!tournaments || tournaments.length === 0) {
    console.log(
      "No Limitless tournaments found in Supabase."
    );

    return;
  }

  console.log(
    `Found ${tournaments.length} Limitless tournaments.`
  );

  const results = [];

  /*
   * ---------------------------------------------------------
   * Process tournaments one at a time.
   *
   * This is intentionally sequential to reduce the chance
   * of hitting Limitless API rate limits.
   * ---------------------------------------------------------
   */

  for (const tournament of tournaments) {
    try {
      const result =
        await importTournament(tournament);

      results.push(result);
    } catch (error) {
      console.error("");
      console.error(
        `FAILED: ${tournament.name}`
      );
      console.error(error);

      results.push({
        name: tournament.name,
        limitlessId: tournament.source_id,
        error: true,
      });
    }
  }

  /*
   * ---------------------------------------------------------
   * FINAL SUMMARY
   * ---------------------------------------------------------
   */

  console.log("");
  console.log("");
  console.log("========================================");
  console.log("ALL TOURNAMENTS IMPORT COMPLETE");
  console.log("========================================");

  let totalPlayers = 0;
  let totalDecklists = 0;
  let totalMissing = 0;
  let failedTournaments = 0;

  for (const result of results) {
    if (result.error) {
      failedTournaments++;
      continue;
    }

    totalPlayers += result.players;
    totalDecklists += result.decklistsImported;
    totalMissing += result.decklistsMissing;

    console.log("");
    console.log(result.name);
    console.log(
      `Players: ${result.players}`
    );
    console.log(
      `Decklists: ${result.decklistsImported}`
    );
    console.log(
      `Missing: ${result.decklistsMissing}`
    );
    console.log(
      `Decklists enabled: ${
        result.decklistsEnabled
          ? "YES"
          : "NO"
      }`
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
}

main().catch((error) => {
  console.error("");
  console.error("IMPORT FAILED");
  console.error(error);
  process.exit(1);
});