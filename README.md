# Pkm Live

**Competitive Pokémon, one screen.**

Pkm Live is a competitive Pokémon tournament tracking platform focused on bringing tournament data, standings, pairings, results, player profiles, and decklists into one fast dashboard.

## Current capabilities

- Tournament discovery and tournament detail pages
- Limitless tournament data import
- Tournament standings
- Player profiles and tournament history
- Pairings and match results
- Round-based results display
- Player and opponent links
- Decklist data imported from Limitless when available
- Supabase/PostgreSQL data storage
- Master refresh command for the full data pipeline

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

The three import processes are now combined into one master command:

```powershell
node .\scripts\refresh.mjs
```

The refresh runs sequentially:

1. `scripts/import-limitless.mjs`
2. `scripts/import-standings.mjs`
3. `scripts/import-pairings.mjs`

The pairing importer can process every Limitless tournament stored in Supabase. It can also be run for one tournament by passing its Limitless ID:

```powershell
node .\scripts\import-pairings.mjs
node .\scripts\import-pairings.mjs <limitlessTournamentId>
```

The all-tournament pairing import processes tournaments sequentially to reduce API pressure and upserts matches using the Limitless source identifiers.

## Current verified refresh

The latest successful full refresh processed:

- 59 tournaments
- 5,497 pairings received
- 5,127 matches imported/upserted
- 0 missing players
- 0 failed tournaments

This confirms the complete tournament → standings/players/decklists → pairings/matches pipeline is working end to end.

## Project structure

```text
app/
├── players/
│   ├── page.tsx
│   ├── PlayerSearch.tsx
│   └── [id]/
│       └── page.tsx
├── tournaments/
│   ├── page.tsx
│   ├── TournamentSearch.tsx
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

## Development principles

Pkm Live is being developed incrementally.

- Preserve working features.
- Prefer small, targeted changes.
- Test after each meaningful change.
- Avoid unnecessary architecture rewrites.
- Keep the existing data pipeline simple and understandable.
- Use server components where possible.
- Use client components only where interaction requires them.

## Design direction

The product is designed as a modern competitive/esports dashboard:

- Near-black/dark background
- White and zinc text
- Yellow accent
- Strong visual hierarchy
- Compact tournament information
- Clean horizontal statistics
- Minimal spreadsheet-like presentation

## Roadmap

Potential next areas include:

- Improved live tournament updates
- Stream integration
- Tournament champion and Top 8 presentation
- Richer player statistics
- Decklist viewer and analysis
- Rankings
- Meta analysis
- Team/deck analytics
- Faster incremental synchronization

## Author

smayankai
