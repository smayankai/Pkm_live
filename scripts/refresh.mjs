import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(
  __dirname,
  ".."
);

/*
 * ---------------------------------------------------------
 * RUN A SCRIPT
 * ---------------------------------------------------------
 */

function runScript(scriptPath, label) {
  return new Promise((resolve, reject) => {
    console.log("");
    console.log("========================================");
    console.log(label);
    console.log("========================================");
    console.log("");

    const child = spawn(
      process.execPath,
      [scriptPath],
      {
        cwd: projectRoot,
        stdio: "inherit",
        shell: false,
      }
    );

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${label} failed with exit code ${code}`
          )
        );
      }
    });
  });
}

/*
 * ---------------------------------------------------------
 * MAIN REFRESH
 * ---------------------------------------------------------
 */

async function main() {
const limitlessScript =
  path.join(
    projectRoot,
    "scripts",
    "import-limitless.mjs"
  );

  const standingsScript =
  path.join(
    projectRoot,
    "scripts",
    "import-standings.mjs"
  );

  const pairingsScript =
  path.join(
    projectRoot,
    "scripts",
    "import-pairings.mjs"
  );

  console.log("");
  console.log("========================================");
  console.log("PKM LIVE — MASTER REFRESH");
  console.log("========================================");
  console.log("");
  console.log(
    "Starting complete tournament data refresh..."
  );

  /*
   * -------------------------------------------------------
   * STEP 1
   *
   * Discover and import new Limitless tournaments.
   * -------------------------------------------------------
   */

  await runScript(
    limitlessScript,
    "STEP 1/3 — TOURNAMENTS"
  );

  /*
   * -------------------------------------------------------
   * STEP 2
   *
   * Import players, standings and decklists
   * for every Limitless tournament.
   * -------------------------------------------------------
   */

  await runScript(
    standingsScript,
    "STEP 2/3 — STANDINGS / PLAYERS / DECKLISTS"
  );

  /*
   * -------------------------------------------------------
   * STEP 3
   *
   * Import pairings and match results
   * for every Limitless tournament.
   * -------------------------------------------------------
   */

  await runScript(
    pairingsScript,
    "STEP 3/3 — PAIRINGS / MATCHES"
  );

  /*
   * -------------------------------------------------------
   * COMPLETE
   * -------------------------------------------------------
   */

  console.log("");
  console.log("========================================");
  console.log("PKM LIVE — REFRESH COMPLETE");
  console.log("========================================");
  console.log("");
  console.log(
    "Tournaments, standings, players, decklists and pairings are up to date."
  );
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("========================================");
  console.error("PKM LIVE — REFRESH FAILED");
  console.error("========================================");
  console.error("");
  console.error(error.message);
  console.error("");

  process.exit(1);
});

