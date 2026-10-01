# Pkm Live — Development Handoff

Read `PROJECT_CONTEXT.md` before making substantial changes.

## Current state

Pkm Live is a working competitive Pokémon tournament dashboard backed by Supabase and Limitless.

The verified master refresh currently processes:

- 59 tournaments
- 5,497 pairings
- 5,127 imported/upserted matches
- 0 missing players
- 0 failed tournaments

## Master refresh

Use:

```powershell
node .\scripts\refresh.mjs
```

The master runs:

1. `scripts/import-limitless.mjs`
2. `scripts/import-standings.mjs`
3. `scripts/import-pairings.mjs`

Do not add another production data pipeline unless there is a clear reason.

## Important architecture

Frontend:

- Next.js App Router
- Server components where possible
- Client components only for interaction

Database:

- Supabase PostgreSQL

Source:

- Limitless TCG API

Important routes/components:

- `app/tournaments/[id]/page.tsx`
- `app/tournaments/TournamentTabs.tsx`
- `app/players/[id]/page.tsx`

Important scripts:

- `scripts/import-limitless.mjs`
- `scripts/import-standings.mjs`
- `scripts/import-pairings.mjs`
- `scripts/refresh.mjs`

## Development rules

Do not:

- Rewrite the architecture unnecessarily
- Replace working components without reason
- Create duplicate import pipelines
- Make large unrelated changes
- Assume a file exists in a different location than the documented structure

Always:

- Make small changes
- Identify the exact file
- Identify the exact block
- Test after changes
- Preserve existing working behavior

## Product direction

Pkm Live should remain a polished competitive/esports dashboard.

Prefer:

- Clear visual hierarchy
- Dark/near-black surfaces
- Yellow accent
- Zinc/white text
- Compact cards
- Horizontal stats
- Side-by-side information when useful

Avoid spreadsheet-like presentation.

## Next areas

Potential next work:

1. Improve live tournament synchronization
2. Improve stream handling
3. Add champion / Top 8 presentation
4. Improve player statistics
5. Add decklist viewing and analysis
6. Add rankings
7. Add meta and team analytics
