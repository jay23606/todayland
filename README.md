# Todayland

**[Play it live](https://jay23606.github.io/todayland/)**

A shared side-scrolling world, regrown every day from several real current news headlines. No account,
no image model, no per-day cost: each headline's own words pick a biome and a mood for one region of a
long strip world, its sentiment and actions become the glow/scale/colour of what's placed there, and
everyone who loads the game today runs and jumps through the same live world together, firing a cartoon
laser at whatever they find. Everything is worked out deterministically from the day and the headlines,
so a link to today's world is a link anyone can open and see the same terrain in.

**Controls:** A/D or the arrow keys (or the on-screen buttons) to run, W/↑/space to jump, click or tap
anywhere to fire. Regions are laid out left to right, biome by biome, headline by headline; walking into
a new one shows its headline as a banner.

## Why this instead of an actual image model

Illustrating a headline with a real AI image model would mean a server, an API key, and a real cost per
visitor per day -- for something that needs to run for free, forever, on a static host. Instead, each
headline is parsed into a short list of concepts with plain word lists (no network call, no cost), and
those concepts drive a small procedural generator: a seeded random stream turns "ocean, alarming,
animal, clash" into an actual ground line, a scattering of blocky pixel-art objects, and a glowing
relation between two of them, the same way a Minecraft seed turns a number into a whole world. It will
not always be a *sensible* illustration of the headline, but it is always an interesting one, and it
costs nothing to run.

## Why Wikipedia instead of X

The brief was trending X (Twitter) headlines. X's trends are behind a paid, keyed, server-side-only API
-- there is no free, anonymous, CORS-open way to read them from a static site with no backend of its own.
[Wikipedia's "In the news" feed](https://en.wikipedia.org/api/rest_v1/feed/featured) is the closest free
substitute: a small, real, frequently-updated list of current stories, openly readable straight from the
browser. `src/daily.js` takes every story in a day's feed (capped at `MAX_REGIONS`, currently 6) rather
than just the first one, so a single day's headlines become several regions instead of one. If the feed
cannot be reached, a fixed fallback list of headlines is used instead, chosen by the date so a given day
is still consistent for anyone who cannot reach the feed either.

## How the world is built

`src/parse.js` turns one headline's words into concepts (a biome, a mood, up to three kinds of thing, a
*relation* -- clash/bond/boost/flee/link, drawn from the headline's action words -- and an intensity)
with nothing but word lists and counting: pure, deterministic, fully covered by tests. `src/world.js`
takes a whole day's worth of these concepts and a seed (the day plus the headlines) and lays out one
region per headline, left to right: a smoothed ground line that joins seamlessly at each region's seam,
floating platforms, placed objects, and relations between object pairs whose headline sentiment becomes
their scale, glow colour, and (for "flee") how far apart they're placed. `src/sprites.js` draws every
creature and object as a small procedural pixel-art bitmap -- geometric primitives on a 16x16 grid, no
art files and no image model, seeded so the same object always looks the same. `src/player.js` is
side-scrolling physics: gravity, running, jumping, and collision with the ground, one-way platforms, and
solid objects. `src/weapons.js` is the laser: fire toward a point, travel, destroy the first object it
touches. `src/render.js` draws all of it to a scrolling camera; `src/multiplayer.js` is the shared part
(see below); `src/main.js` is the wiring: input, the game loop, and the HUD.

## Shared multiplayer (optional, best-effort)

Everyone who loads Todayland on the same day joins the same Supabase Realtime channel (presence +
broadcast, keyed by the day) and sees everyone else moving, jumping and firing live -- no table, no
schema, nothing to apply; it works the moment Realtime is on for the project, which it already is for
any Supabase project by default. It is best-effort in the same spirit as the rest of the backend: if the
client can't connect, or Realtime is off, every call in `src/multiplayer.js` quietly does nothing and
the game is exactly as playable solo as it always was. A laser you fire is drawn (and can land) on
everyone's screen; a hit converges everyone's copy of the world to the same destroyed objects without
needing a server to own the truth.

## Shared state (optional, best-effort, schema.sql)

Todayland shares the same Supabase project as some of the author's other small projects (`schema.sql`,
`td_`-prefixed tables so nothing collides). Unlike multiplayer above, this part *does* need its schema
applied (still outstanding -- see below) before it does anything:

- **Freezing the day's headlines.** The Wikipedia feed can move on to different top stories partway
  through the day; the first visitor of the day freezes today's headline list (as JSON, in the existing
  `headline` column -- no schema change needed for the move to several headlines) via `td_freeze_day`.
- **A shared "things destroyed today" counter**, purely for atmosphere -- nobody is tracked individually.

Every call in `src/supabase.js` is wrapped so a missing project, an unset-up schema, or a network
failure just means the enhancement quietly does not happen; the headlines still come straight from
Wikipedia (or the fallback list) and the world still builds and plays. **`schema.sql` has not been
applied to the shared project yet** -- it needs running once, by hand, in the Supabase SQL editor.

## Development

```
npm install
npm run dev      # http://localhost:5173
npm test         # node's own test runner, no dependencies
npm run lint     # eslint
npm run build    # -> dist/
```

Deploys to GitHub Pages from `main` via `.github/workflows/deploy.yml`; `.github/workflows/ci.yml` runs
lint, tests and a build on every pull request.

## Code layout

| File | What it does |
|---|---|
| `src/rng.js` | a small seeded generator, plus `pick`/`int`/`range` helpers |
| `src/parse.js` | one headline → concepts (biome, mood, creatures, relation, subjects, intensity) |
| `src/daily.js` | today's headlines (every story in Wikipedia's feed, with a dated fallback) |
| `src/world.js` | concepts list + seed → a multi-region strip world; `todaysWorld` composes daily+parse+world |
| `src/sprites.js` | procedural pixel-art sprite grids, no art files or image model |
| `src/sprite-cache.js` | turns a sprite grid into an actual `<canvas>`, cached |
| `src/player.js` | side-scrolling physics: gravity, run, jump, ground/platform/object collision |
| `src/weapons.js` | the laser: fire, travel, destroy the first object it touches |
| `src/multiplayer.js` | Supabase Realtime presence + broadcast: peers, shared shots, shared hits |
| `src/render.js` | canvas drawing: camera, sky/weather, ground, objects, relations, lasers, particles |
| `src/supabase.js` | best-effort shared headline freeze + a community counter |
| `src/main.js` | wiring: input, the game loop, the HUD |
| `schema.sql` | the two small `td_`-prefixed tables and functions, idempotent -- **not yet applied** |
