# Pkm Live

**Competitive Pokémon, one screen.**

Pkm Live is a competitive Pokémon tournament tracking platform focused on bringing tournament discovery, live-event context, standings, pairings, results, player profiles, rankings, streams, and decklists into one fast dashboard.

## Current capabilities

- Tournament discovery and tournament detail pages
- Tournament tiers: Major, Official, Local, Online
- Limitless tournament data import
- Tournament standings
- Player profiles and tournament history
- Pairings and match results
- Round-based results display
- Player and opponent links
- Decklist data imported from Limitless when available
- Stream URL discovery and tournament stream UI
- Supabase/PostgreSQL data storage
- Master refresh command for the full data pipeline
- Tournament dates displayed in Japan Standard Time (JST, UTC+09:00)

## Tech stack

- Next.js 16
- React
- TypeScript
- Tailwind CSS
- Next.js App Router
- Supabase
- PostgreSQL
- Limitless TCG API

## Data pipeline

Pkm Live uses Limitless as the primary tournament data source.

```text
Limitless API
     ↓
Import scripts
     ↓
Supabase / PostgreSQL
     ↓
Next.js server components
     ↓
Pkm Live tournament UI
```

## Master data refresh

The three production import processes are combined into one master command:

```powershell
node .\scripts\refresh.mjs
```

The refresh runs sequentially:

1. `scripts/import-limitless.mjs`
2. `scripts/import-standings.mjs`
3. `scripts/import-pairings.mjs`

The pairing importer can process every Limitless tournament stored in Supabase or one tournament by Limitless ID:

```powershell
node .\scripts\import-pairings.mjs
node .\scripts\import-pairings.mjs <limitlessTournamentId>
```

The standings importer supports the same two modes:

```powershell
node .\scripts\import-standings.mjs
node .\scripts\import-standings.mjs <limitlessTournamentId>
```

The production refresh processes tournaments sequentially to reduce API pressure.

## Tournament tiers

Tournament records use a `tier` field:

- **Major** — World Championships, International Championships, Regional Championships
- **Official** — Special Events
- **Local** — Locals / weekly events
- **Online** — other online or unclassified events

The importer intentionally uses conservative classification so themed historical events are not incorrectly promoted to official major events.

## Current verified refresh

The latest verified full refresh processed:

- 59 tournaments
- 5,497 pairings received
- 5,127 matches imported/upserted
- 0 missing players
- 0 failed tournaments

This confirms the complete tournament → standings/players/decklists → pairings/matches pipeline is working end to end.

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

`test-pairing.mjs` is a diagnostic script and is not part of the master refresh.

## Development

Install dependencies:

```bash
npm install
```

Run the application:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Run a complete data refresh:

```powershell
node .\scripts\refresh.mjs
```

For a single tournament, use its Limitless `source_id`:

```powershell
node .\scripts\import-standings.mjs <limitlessTournamentId>
node .\scripts\import-pairings.mjs <limitlessTournamentId>
```

## Development principles

Pkm Live is being developed incrementally.

- Preserve working features.
- Prefer small, targeted changes.
- Test after each meaningful change.
- Avoid unnecessary architecture rewrites.
- Keep the existing data pipeline simple and understandable.
- Use server components where possible.
- Use client components only where interaction requires them.
- Make local edits by default; change GitHub directly only when explicitly requested.

## Design direction

The product is designed as a modern competitive/esports dashboard:

- Near-black/dark background
- White and zinc text
- Yellow accent
- Strong visual hierarchy
- Compact tournament information
- Clean horizontal statistics
- Minimal spreadsheet-like presentation
- Mobile-friendly tournament browsing

## Roadmap

Potential next areas include:

- Improved live tournament updates
- More reliable stream resolution and live embeds
- Tournament champion and Top 8 presentation
- Richer player statistics
- Decklist viewer and analysis
- Rankings
- Meta analysis
- Team/deck analytics
- Faster incremental synchronization
- Automatic refresh scheduling

## Author

smayankai
