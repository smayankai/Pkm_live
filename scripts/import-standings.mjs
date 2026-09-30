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

const limitlessTournamentId = process.argv[2];

if (!limitlessTournamentId) {
  throw new Error(
    "Missing tournament ID. Example: node scripts/import-standings.mjs YOUR_ID"
  );
}

const API_URL =
  `https://play.limitlesstcg.com/api/tournaments/${limitlessTournamentId}/standings`;

async function main() {
  console.log(
    `Fetching standings for Limitless tournament ${limitlessTournamentId}...`
  );

  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(
      `Limitless API returned ${response.status}`
    );
  }

  const standings = await response.json();

  console.log(
    `Received ${standings.length} player standings.`
  );

  const { data: tournament, error: tournamentError } =
    await supabase
      .from("tournaments")
      .select("id, name")
      .eq("source", "limitless")
      .eq("source_id", String(limitlessTournamentId))
      .maybeSingle();

  if (tournamentError) {
    throw tournamentError;
  }

  if (!tournament) {
    throw new Error(
      "Could not find this Limitless tournament in Supabase."
    );
  }

  console.log(`Database tournament: ${tournament.name}`);

  let playersImported = 0;
  let standingsImported = 0;

  for (const entry of standings) {
    const playerSourceId = String(entry.player);

    const { data: existingPlayer, error: playerLookupError } =
      await supabase
        .from("players")
        .select("id")
        .eq("source", "limitless")
        .eq("source_id", playerSourceId)
        .maybeSingle();

    if (playerLookupError) {
      throw playerLookupError;
    }

    let playerId;

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
    } else {
      const { data: newPlayer, error: playerInsertError } =
        await supabase
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

    const record = entry.record || {};

    const { error: standingsError } =
      await supabase
        .from("standings")
        .upsert(
          {
            tournament_id: tournament.id,
            player_id: playerId,
            rank: entry.placing ?? null,
            wins: record.wins ?? 0,
            losses: record.losses ?? 0,
            ties: record.ties ?? 0,

            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "tournament_id,player_id",
          }
        );

    if (standingsError) {
      throw standingsError;
    }

    standingsImported++;
  }

  console.log("");
  console.log("Standings import complete.");
  console.log(`New players: ${playersImported}`);
  console.log(`Standings processed: ${standingsImported}`);
}

main().catch((error) => {
  console.error("");
  console.error("IMPORT FAILED");
  console.error(error);
  process.exit(1);
});