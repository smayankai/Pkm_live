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

const API_URL =
  "https://play.limitlesstcg.com/api/tournaments?game=VGC&limit=50";

async function main() {
  console.log("Fetching VGC tournaments from Limitless...");

  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(
      `Limitless API returned ${response.status}`
    );
  }

  const tournaments = await response.json();

  console.log(
    `Received ${tournaments.length} tournaments.`
  );

  let inserted = 0;
  let skipped = 0;

  for (const tournament of tournaments) {
    const { data: existing, error: lookupError } =
      await supabase
        .from("tournaments")
        .select("id")
        .eq("source", "limitless")
        .eq("source_id", String(tournament.id))
        .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (existing) {
      skipped++;
      continue;
    }

    const startDate = tournament.date
      ? new Date(tournament.date).toISOString()
      : null;

    const status = startDate
      ? new Date(startDate) > new Date()
        ? "upcoming"
        : "completed"
      : "upcoming";

    const { error: insertError } =
      await supabase
        .from("tournaments")
        .insert({
          name: tournament.name,
          game: tournament.game,
          status,
          start_date: startDate,
          player_count: tournament.players ?? 0,
          source: "limitless",
          source_id: String(tournament.id),
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
  console.log("Import complete.");
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped: ${skipped}`);
}

main().catch((error) => {
  console.error("");
  console.error("IMPORT FAILED");
  console.error(error);
  process.exit(1);
});