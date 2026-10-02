import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

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

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey
);

async function main() {
  console.log("");
  console.log("========================================");
  console.log(
    "PKM LIVE - FIND MISSING PLAYERS"
  );
  console.log("========================================");
  console.log("");

  const {
    data: tournaments,
    error: tournamentsError,
  } = await supabase
    .from("tournaments")
    .select(
      "id, name, source_id, start_date"
    )
    .eq("source", "limitless")
    .not("source_id", "is", null)
    .order("start_date", {
      ascending: false,
    });

  if (tournamentsError) {
    throw tournamentsError;
  }

  if (
    !tournaments ||
    tournaments.length === 0
  ) {
    console.log(
      "No tournaments found."
    );
    return;
  }

  const {
    data: players,
    error: playersError,
  } = await supabase
    .from("players")
    .select(
      "id, name, source_id"
    )
    .eq("source", "limitless");

  if (playersError) {
    throw playersError;
  }

  const playerMap = new Map(
    (players ?? []).map(
      (player) => [
        player.source_id,
        player,
      ]
    )
  );

  const missingByPlayer = new Map();

  let tournamentsWithMissing =
    0;

  let totalMissingOccurrences = 0;

  for (
    const tournament of tournaments
  ) {
    const response = await fetch(
      "https://play.limitlesstcg.com/api/tournaments/" +
        tournament.source_id +
        "/pairings"
    );

    if (!response.ok) {
      console.log(
        "Skipping API failure: " +
          tournament.name +
          " (" +
          response.status +
          ")"
      );

      continue;
    }

    const pairings =
      await response.json();

    const tournamentMissing =
      new Map();

    for (
      const pairing of pairings
    ) {
      const playerIds = [
        pairing.player1,
        pairing.player2,
      ];

      for (
        const playerSourceId of playerIds
      ) {
        if (!playerSourceId) {
          continue;
        }

        if (
          playerMap.has(
            playerSourceId
          )
        ) {
          continue;
        }

        if (
          !tournamentMissing.has(
            playerSourceId
          )
        ) {
          tournamentMissing.set(
            playerSourceId,
            {
              playerSourceId,
              occurrences: 0,
              rounds: new Set(),
              tables: new Set(),
            }
          );
        }

        const missing =
          tournamentMissing.get(
            playerSourceId
          );

        missing.occurrences++;

        if (
          pairing.round !== null &&
          pairing.round !== undefined
        ) {
          missing.rounds.add(
            pairing.round
          );
        }

        if (
          pairing.table !== null &&
          pairing.table !== undefined
        ) {
          missing.tables.add(
            pairing.table
          );
        }
      }
    }

    if (
      tournamentMissing.size === 0
    ) {
      continue;
    }

    tournamentsWithMissing++;

    console.log("");
    console.log(
      "========================================"
    );

    console.log(
      "Tournament: " +
        tournament.name
    );

    console.log(
      "Limitless ID: " +
        tournament.source_id
    );

    console.log(
      "Missing players: " +
        tournamentMissing.size
    );

    console.log(
      "========================================"
    );

    for (
      const missing of
        tournamentMissing.values()
    ) {
      console.log("");

      console.log(
        "Player ID: " +
          missing.playerSourceId
      );

      console.log(
        "Occurrences: " +
          missing.occurrences
      );

      console.log(
        "Rounds: " +
          Array.from(
            missing.rounds
          ).join(", ")
      );

      console.log(
        "Tables: " +
          Array.from(
            missing.tables
          ).join(", ")
      );

      totalMissingOccurrences +=
        missing.occurrences;

      if (
        !missingByPlayer.has(
          missing.playerSourceId
        )
      ) {
        missingByPlayer.set(
          missing.playerSourceId,
          {
            playerSourceId:
              missing.playerSourceId,
            tournaments: new Set(),
          }
        );
      }

      missingByPlayer
        .get(
          missing.playerSourceId
        )
        .tournaments.add(
          tournament.name
        );
    }
  }

  console.log("");
  console.log("========================================");
  console.log(
    "MISSING PLAYER SUMMARY"
  );
  console.log("========================================");
  console.log("");

  console.log(
    "Tournaments with missing players: " +
      tournamentsWithMissing
  );

  console.log(
    "Unique missing player IDs: " +
      missingByPlayer.size
  );

  console.log(
    "Missing player occurrences: " +
      totalMissingOccurrences
  );

  console.log("");

  if (
    missingByPlayer.size > 0
  ) {
    console.log(
      "Unique missing player IDs:"
    );

    console.log("");

    for (
      const missing of
        missingByPlayer.values()
    ) {
      console.log(
        "- " +
          missing.playerSourceId
      );

      console.log(
        "  Tournaments: " +
          Array.from(
            missing.tournaments
          ).join(" | ")
      );
    }
  }

  console.log("");
  console.log("Done.");
}

main().catch((error) => {
  console.error("");
  console.error(
    "ERROR: " +
      (
        error instanceof Error
          ? error.message
          : String(error)
      )
  );

  process.exit(1);
});