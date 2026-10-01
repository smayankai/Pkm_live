# Pkm Live — Project Context

## Project identity

Pkm Live is a competitive Pokémon tournament tracking platform.

Product idea:

> **Competitive Pokémon, one screen.**

The goal is to make tournament information fast to understand without forcing users through spreadsheet-like interfaces.

## Current status

The application has a working tournament data pipeline from Limitless → Supabase → Next.js.

The latest verified full refresh processed:

- 59 tournaments
- 5,497 pairings received
- 5,127 matches imported/upserted
- 0 missing players
- 0 failed tournaments

The full refresh is orchestrated by:

```powershell
node .\scripts\refresh.mjs
```

The current MVP includes tournament discovery, tier filtering, tournament detail pages, standings, pairings/results, player profiles, rankings, decklists, and stream information.

Tournament dates and times are displayed in **Japan Standard Time (JST, UTC+09:00)**.

## Stack

### Frontend

- Next.js 16
- React
- TypeScript
- Tailwind CSS
- App Router
- Server components where possible
- Client components only where interaction is required

### Backend / database

- Supabase
- PostgreSQL

### External data source

- Limitless TCG API

## Project structure

```text
app/
├── page.tsx
├── players/
│   ├── page.tsx
│   ├── PlayerSearch.tsx
│   └── [id]/
│       └── page.tsx
├── tournaments/
│   ├── page.tsx
│   ├── tournamentsSearch.tsx
│   ├── TournamentTabs.tsx
│   └── [id]/
│       └── page.tsx
└── rankings/
    └── page.tsx

scripts/
├── import-limitless.mjs
├── import-standings.mjs
├── import-pairings.mjs
├── refresh.mjs
└── test-pairing.mjs
```

Important: `TournamentTabs.tsx` is directly under `app/tournaments/`, not under `app/tournaments/[id]/`.

## Tournament routing

Tournament detail pages support both:

- Supabase tournament UUIDs
- Limitless `source_id` values

The page resolves the supplied route ID to the Supabase tournament record first.

Once the tournament is resolved, standings and matches use the Supabase tournament UUID because those tables reference `tournaments.id`.

## Database model

### tournaments

Stores tournament metadata.

Important fields include:

- `id`
- `name`
- `game`
- `status`
- `start_date`
- `player_count`
- `source`
- `source_id`
- `stream_url`
- `tier`

### players

Stores normalized player records.

Important fields include:

- `id`
- `name`
- `country`
- `source`
- `source_id`

### standings

Connects players to tournaments and stores tournament performance.

Important fields include:

- `tournament_id`
- `player_id`
- `rank`
- `wins`
- `losses`
- `ties`
- `decklist`

### matches

Stores imported Limitless pairings/results.

Important fields include:

- `id`
- `tournament_id`
- `round`
- `phase`
- `table_number`
- `player1_id`
- `player2_id`
- `winner_id`
- `status`
- `source`
- `source_id`

## Data pipeline

```text
Limitless API
     ↓
import-limitless.mjs
     ↓
tournaments
     ↓
import-standings.mjs
     ↓
players + standings + decklists
     ↓
import-pairings.mjs
     ↓
matches
     ↓
Next.js tournament UI
```

## Import scripts

### 1. Tournament importer

File:

```text
scripts/import-limitless.mjs
```

Purpose:

- Fetch VGC tournaments from Limitless
- Store tournament metadata in Supabase
- Determine initial tournament status
- Store player count
- Discover YouTube stream URLs from Limitless tournament detail pages when available
- Classify tournaments into Major, Official, Local, or Online tiers

The importer updates existing tournament records when appropriate and avoids duplicating source records.

### 2. Standings importer

File:

```text
scripts/import-standings.mjs
```

Purpose:

- Fetch Limitless tournament details and standings
- Upsert/update players
- Upsert tournament standings
- Preserve existing decklists when the current Limitless entry does not contain one
- Support processing individual tournaments or the complete tournament set

Single tournament:

```powershell
node .\scripts\import-standings.mjs <limitlessTournamentId>
```

All tournaments:

```powershell
node .\scripts\import-standings.mjs
```

### 3. Pairings importer

File:

```text
scripts/import-pairings.mjs
```

Purpose:

- Fetch Limitless pairings
- Resolve Limitless player source IDs to Supabase player IDs
- Convert pairings into `matches`
- Determine scheduled vs completed status from the Limitless winner value
- Upsert matches using `source,source_id`
- Process all Limitless tournaments when no tournament ID is supplied
- Process one tournament when a Limitless ID is supplied

All-tournament command:

```powershell
node .\scripts\import-pairings.mjs
```

Single-tournament command:

```powershell
node .\scripts\import-pairings.mjs <limitlessTournamentId>
```

The importer processes tournaments sequentially.

### 4. Master refresh

File:

```text
scripts/refresh.mjs
```

Purpose:

Run all three production import scripts sequentially:

```text
STEP 1/3 — TOURNAMENTS
STEP 2/3 — STANDINGS / PLAYERS / DECKLISTS
STEP 3/3 — PAIRINGS / MATCHES
```

Command:

```powershell
node .\scripts\refresh.mjs
```

The master runner stops with a failure if one of the child import scripts exits unsuccessfully.

### 5. Pairing diagnostic script

File:

```text
scripts/test-pairing.mjs
```

This is a diagnostic/test script only.

It is not part of the production refresh pipeline.

## Tournament tiers

The `tournaments.tier` field is used by the homepage and tournament browser.

Classification:

- **Major** — World Championships, International Championships, Regional Championships
- **Official** — Special Events
- **Local** — Locals / weekly events
- **Online** — other online or unclassified events

The classifier is intentionally conservative so themed historical tournaments do not become false major events.

## Tournament UI

The tournament detail page currently combines:

- Tournament metadata
- Tournament tier
- Standings
- Pairings
- Results
- Player links
- Stream information where available

The tournament browser supports:

- Search
- Tier filters
- Major / Official / Local / Online badges
- Tournament detail links

The homepage includes:

- Live-event presentation
- Major events
- Upcoming tournaments
- Recent tournaments
- Navigation to tournaments, players, and rankings

## Stream handling

Limitless stream URLs are stored in `tournaments.stream_url` when discovered.

The tournament UI supports:

- YouTube video URLs
- YouTube channel/handle URLs
- Twitch channel URLs
- External stream links for unsupported formats

YouTube channel URLs can be resolved server-side through:

```text
app/api/youtube-live/route.ts
```

The current stream system is still evolving because YouTube channel pages do not always expose a stable live video identifier.

## Current working features

### Tournament pages

- Tournament header
- Tournament status
- Game
- Player count
- Tournament information
- Tier badge
- Limitless-backed tournament routing

### Standings

- Imported from Limitless
- Sorted by rank
- Player names link to profiles
- Decklists preserved/imported when available

### Player profiles

- Player information
- Country
- Tournament history
- Placements
- Records

### Pairings

- Limitless pairings
- Player 1 / Player 2
- Player profile links
- Round information
- Table information
- Winner display

### Results

- Uses imported matches
- Grouped by round
- Shows tables
- Shows players
- Shows winners

### Rankings

- Dedicated rankings page exists
- Rankings UI can be expanded as ranking logic matures

## Current development rules

Preserve the working application.

Preferred workflow:

1. Identify the exact file.
2. Identify the exact block or component.
3. Make the smallest required change.
4. Save.
5. Run the relevant test/import.
6. Refresh the UI.
7. Continue only after the previous change works.

Avoid:

- Large rewrites
- Duplicate data pipelines
- Unnecessary dependencies
- Replacing working components
- Moving files without a concrete reason

Git workflow:

- Local development is the default.
- GitHub changes are made only when explicitly requested.
- Never force-push over remote work without explicit approval.
- Resolve remote divergence with a normal rebase/merge workflow.

## Design language

Pkm Live should feel like a competitive/esports product rather than an admin spreadsheet.

Current visual direction:

- Near-black background
- White/zinc text
- Yellow accent
- Clean cards
- Strong hierarchy
- Horizontal statistic distributions
- Side-by-side information where useful
- Compact but readable tournament information
- Responsive/mobile-friendly layouts

## Known considerations

### Limitless synchronization

The import system is functional, but future synchronization work may need to keep existing tournament records current when:

- status changes
- player count changes
- stream information becomes available
- other tournament metadata changes

### Live updates

The current pipeline is a refresh-based system rather than a continuous live-sync service.

Potential future work:

- Incremental synchronization
- Automatic refresh scheduling
- Live match updates
- Better stream detection
- Rankings
- Meta analysis
- Deck/team analytics

## Project goal

Build a reliable, polished competitive Pokémon tournament dashboard:

**Pkm Live — Competitive Pokémon, one screen.**
