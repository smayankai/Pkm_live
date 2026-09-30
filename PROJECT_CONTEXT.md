PROJECT_CONTEXT.md
# Pkm Live - Project Context


## Project Overview


Pkm Live is a competitive Pokémon tournament tracking platform.


The goal is to provide a single screen for competitive Pokémon players to view:


- Tournament information
- Standings
- Pairings
- Results
- Player profiles
- Decklists
- Tournament history


The project currently integrates tournament data from Limitless and stores normalized data in Supabase.


---


# Current Stack


## Frontend


- Next.js 16
- React
- TypeScript
- Tailwind CSS
- App Router


## Backend / Database


- Supabase
- PostgreSQL


## Data Source


Primary source:


- Limitless TCG tournament API


---


# Project Structure


Important files:


app/
├── tournaments/
│ ├── [id]/
│ │ └── page.tsx
│ └── TournamentTabs.tsx
│
├── players/
│ └── [id]/
│ └── page.tsx
│
└── page.tsx
scripts/
├── import-standings.mjs
├── import-pairings.mjs
└── test-pairing.mjs
lib/
└── supabase.ts


---


# Database Structure


Current important tables:


## tournaments


Stores tournament information.


Examples:


- id
- name
- game
- status
- source
- player_count
- start_date
- location
- country




## players


Stores player information.


Examples:


- id
- name
- country
- source
- source_id




## standings


Tournament player results.


Contains:


- tournament_id
- player_id
- rank
- wins
- losses
- ties




## matches


Stores imported pairings.


Contains:


- tournament_id
- round
- phase
- table number
- player1_id
- player2_id
- winner_id


---


# Completed Features


## Tournament Pages


Working:


- Tournament header
- Status
- Game
- Player count
- Source
- Tournament information




## Standings


Working:


- Imported from Limitless
- Sorted by rank
- Player names clickable
- Links to player profiles




## Player Profiles


Working:


- Player information
- Country
- Tournament history
- Placements
- Records




## Pairings Tab


Working:


- Imported Limitless pairings
- Player 1 / Player 2 display
- Player profile links
- Round filtering
- Winner display




Winner styling:


- "Winner:" = red
- Player name = green




## Results Tab


Working:


- Uses imported matches
- Grouped by round
- Shows tables
- Shows players
- Shows winner


---


# Current Data Flow


Limitless API
   ↓
Import Scripts
   ↓
Supabase PostgreSQL
   ↓
Next.js Server Components
   ↓
Tournament UI


---


# Import Scripts


## Standings


Run:


node scripts/import-standings.mjs <limitlessTournamentId>




## Pairings


Run:


node scripts/import-pairings.mjs


Current pairing importer:


- Fetches Limitless pairings
- Resolves player names
- Maps to Supabase player IDs
- Inserts matches


---


# Known Issues


## Supabase Permissions


When using service_role:


Need correct privileges:


Example:


GRANT SELECT, INSERT, UPDATE ON public.matches TO service_role;


For frontend access:


GRANT SELECT ON public.matches TO anon;


---


# Development Notes


Do not replace working features.


The project is currently stable.


Preferred development style:


1. Make small changes
2. Test
3. Refresh UI
4. Continue


Avoid large rewrites.


---


# Planned Features


## Near Future


- Stream tab
- Tournament champion card
- Top 8 display
- Better player statistics
- Decklist display




## Future


- Live tournament updates
- Automatic tournament syncing
- Player rankings
- Meta analysis
- Team/deck analytics


---


# Design Language


Current theme:


- Dark background
- White/zinc text
- Yellow accent
- Minimal esports dashboard style


Main branding:


Pkm Live


Tagline:


"Competitive Pokémon, one screen."
________________


HANDOFF_PROMPT.md
# Pkm Live Development Handoff Prompt


You are continuing development on the Pkm Live project.


Read PROJECT_CONTEXT.md first.


Your role:


Continue improving the existing application without breaking working features.


---


# Current State


The application is a working competitive Pokémon tournament dashboard.


Completed:


- Tournament pages
- Standings
- Player profiles
- Pairings
- Results
- Limitless imports


The current priority is incremental improvements.


---


# Important Rules


Do NOT:


- Rewrite existing architecture
- Replace working components
- Remove current features
- Create duplicate data pipelines


Always:


- Make the smallest required change
- Explain exactly which file changes
- Explain exactly which block changes
- Wait for confirmation after major edits


---


# Current Architecture


Frontend:


Next.js App Router


Main components:


app/tournaments/[id]/page.tsx
app/tournaments/TournamentTabs.tsx
app/players/[id]/page.tsx


Database:


Supabase PostgreSQL


Tables:


tournaments
players
standings
matches


---


# Current User Workflow


Tournament:


Dashboard
↓
Tournament Page
↓
Standings
↓
Player Profile
↓
Pairings
↓
Results


---


# Coding Style


Follow existing style:


- TypeScript
- Tailwind
- Server components where possible
- Client components only where interaction is required
- Minimal dependencies


---


# Before Editing


Always check:


1. Which file?
2. Which component?
3. Which exact block?


Do not provide vague instructions.


Example preferred:


"Open app/tournaments/TournamentTabs.tsx.


Find this block:


<code>


Replace it with:


<code>
"


---


# Current Development Roadmap


Next possible tasks:


1. Improve Stream tab
2. Add tournament champion section
3. Add Top 8 display
4. Add player statistics
5. Add decklist viewer
6. Add live tournament refresh


---


# Project Goal


Build the best competitive Pokémon tournament dashboard:


Pkm Live


"Competitive Pokémon, one screen."
