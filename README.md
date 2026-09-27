# Todayland

**[Play it live](https://jay23606.github.io/todayland/)**

A new little world every day, grown from one real news headline. No account, no image model, no
per-day cost: the headline's own words pick a biome, a mood and a handful of things hidden in it, all
worked out deterministically from the headline and the date, so today's world is the same however many
times it is rebuilt, and the same for everyone who visits.

Walk around with **WASD**, the arrow keys, or by dragging/tapping, and find everything hidden in the
world. Every headline gives a different mix of biome (desert, ocean, ice, forest, mountain, city,
space, tech), mood (calm, bright, or alarming -- which becomes the weather: mist, sparkle, or storm),
and a few kinds of thing to find (people, animals, machines, treasure). A stronger, more dramatic
headline hides more things. Come back tomorrow and it is a different place.

## Why this instead of an actual image model

The idea behind Todayland was to build a world from a live news headline, the way an AI image model
might illustrate it. Doing that for real would mean a server, an API key, and a real cost per visitor
per day -- for something that needs to run for free, forever, on a static host. Instead, the headline is
parsed into a short list of concepts with plain word lists (no network call, no cost), and those
concepts drive a small procedural generator in the same spirit as world generation in other games: a
seeded random stream turns "ocean, alarming, animal" into an actual terrain grid and a scattering of
objects, the same way a Minecraft seed turns a number into a whole world. It will not always be a
*sensible* illustration of the headline, but it is always an interesting one, and it costs nothing.

## The headline

Each day's headline is the first story from [Wikipedia's "In the news" feed](https://en.wikipedia.org/api/rest_v1/feed/featured),
a small, real, free, key-less API with CORS already open, so it can be called straight from the
browser. If the feed cannot be reached (offline, or a bad day for Wikipedia), a small set of built-in
fallback headlines is used instead, chosen by the date, so a given day is still consistent for anyone
who cannot reach the feed either.

## How a world is built

`src/parse.js` turns the headline's words into concepts (a biome, a mood, up to three kinds of thing,
and an intensity) with nothing but word lists and counting -- pure, deterministic, and fully covered by
tests. `src/world.js` takes those concepts and a seed (the day plus the headline) and produces a
terrain grid, a palette, a weather, and a set of placed objects, all through `src/rng.js`'s small seeded
generator: the same seed always gives the same world, so a link to today's world is a link anyone can
open and see the same thing. `src/player.js` is the movement and "did I just find something" logic,
`src/render.js` draws it all to a canvas (including simple weather particles for storm/sparkle/mist),
and `src/main.js` is the wiring: input, the game loop, and the HUD.

## Shared state (optional, best-effort)

Todayland shares the same Supabase project as some of the author's other small projects
(`schema.sql`, `td_`-prefixed tables so nothing collides). It is used for two small things, both
optional -- the game plays perfectly well without either:

- **Freezing the day's headline.** The Wikipedia feed can move on to a different top story partway
  through the day; the first visitor of the day freezes it via `td_freeze_day`, and everyone after that
  reads the same frozen headline, so the day's world really is the same for everyone.
- **A shared "things found today" counter**, purely for atmosphere -- nobody is tracked individually.

Every call in `src/supabase.js` is wrapped so a missing project, an unset-up schema, or a network
failure just means the enhancement quietly does not happen; the headline still comes straight from
Wikipedia (or the fallback list) and the world still builds and plays.

## Development

```
npm install
npm run dev      # http://localhost:5173
npm test         # node's own test runner, no dependencies
npm run lint     # eslint
npm run build    # -> dist/
```

Deploys to GitHub Pages from `main` via `.github/workflows/deploy.yml`; `.github/workflows/ci.yml`
runs lint, tests and a build on every pull request.

## Code layout

| File | What it does |
|---|---|
| `src/rng.js` | a small seeded generator, plus `pick`/`int`/`range` helpers |
| `src/parse.js` | headline text → concepts (biome, mood, creatures, intensity) |
| `src/world.js` | concepts + seed → terrain, palette, weather, placed objects |
| `src/daily.js` | today's headline (Wikipedia feed, with a dated fallback) → today's world |
| `src/player.js` | movement and "found nearby" logic |
| `src/render.js` | canvas drawing, including weather particles |
| `src/supabase.js` | best-effort shared headline freeze + a community counter |
| `src/main.js` | wiring: input, the game loop, the HUD |
| `schema.sql` | the two small `td_`-prefixed tables and functions, idempotent |
