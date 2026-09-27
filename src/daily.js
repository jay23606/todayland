import { parseHeadline } from './parse.js'
import { buildWorld } from './world.js'

// Today's world: one real headline a day, the same for everyone, turned into a small explorable
// world. The headline comes from Wikipedia's "In the news" feed (no key, CORS-open, and free), which
// is a short list of real current events; a fallback list covers the day it cannot be reached.

const FEED = date => `https://en.wikipedia.org/api/rest_v1/feed/featured/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}`

// Plain, dated day keys, so "today" means the same thing in every timezone (UTC) and can be used as
// part of a seed or a cache key.
export const dayKey = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`

const stripHtml = s => String(s || '').replace(/<[^>]+>/g, '').trim()

// A few headlines to fall back on when the feed cannot be reached, so the game still has a world.
export const FALLBACK_HEADLINES = [
 'Scientists discover a new species deep in the ocean',
 'A record-breaking storm sweeps across the coast',
 'Historic peace talks begin in the capital city',
 'A tiny robot completes a journey across the desert',
 'Researchers report a breakthrough in space exploration',
 'A giant iceberg breaks free near the Antarctic coast'
]

// The single headline for a day: the first news story from the Wikipedia feed, stripped of markup.
// Returns null if the feed cannot be read, so the caller can fall back.
export async function fetchHeadline(date = new Date(), { fetchImpl = fetch } = {}) {
 try {
  const res = await fetchImpl(FEED(date))
  if (!res.ok) return null
  const data = await res.json()
  const story = data?.news?.[0]?.story
  const text = stripHtml(story)
  return text || null
} catch { return null }
}

// The headline for a day, real if it can be had, otherwise a fixed fallback chosen by the date itself
// (so a given day always falls back to the same headline, even offline).
export async function headlineFor(date = new Date(), opts = {}) {
 const real = await fetchHeadline(date, opts)
 if (real) return { text: real, real: true }
 const idx = Math.abs(hashDate(date)) % FALLBACK_HEADLINES.length
 return { text: FALLBACK_HEADLINES[idx], real: false }
}
const hashDate = d => { const k = dayKey(d); let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) | 0; return h }

// Today's world, built from today's headline. `seedExtra` lets a caller layer on the real headline's
// own text (useful once it is confirmed, without re-fetching) or force a specific day for testing.
export async function todaysWorld(date = new Date(), opts = {}) {
 const { text, real } = await headlineFor(date, opts)
 const concepts = parseHeadline(text)
 const world = buildWorld(concepts, `${dayKey(date)}|${text}`)
 return { ...world, day: dayKey(date), headline: text, headlineReal: real }
}
