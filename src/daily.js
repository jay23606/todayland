// Today's headlines: several real current-news stories, the same for everyone, each seeding one region
// of the shared world. There is no free, key-less, CORS-open feed of "trending X/Twitter" topics --
// X's own trends API is paid and requires server-side auth we don't have -- so this uses Wikipedia's
// "In the news" feed instead: a short, real, frequently-updated list of current stories, openly
// readable from the browser with no key. Same substitution the single-headline build made; see the
// README for why.

const FEED = date => `https://en.wikipedia.org/api/rest_v1/feed/featured/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}`

// Plain, dated day keys, so "today" means the same thing in every timezone (UTC) and can be used as
// part of a seed or a cache key.
export const dayKey = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`

const stripHtml = s => String(s || '').replace(/<[^>]+>/g, '').trim()
// A story paragraph often runs several sentences; a region is grown from just the first, headline-like one.
const firstSentence = s => (s.match(/^.*?[.!?](?=\s|$)/)?.[0] || s).trim()

export const MAX_REGIONS = 6

// A handful of headlines to fall back on when the feed cannot be reached, so the game still has a
// world -- together they become the fallback day's full set of regions.
export const FALLBACK_HEADLINES = [
 'Scientists discover a new species deep in the ocean',
 'A record-breaking storm sweeps across the coast',
 'Historic peace talks begin in the capital city',
 'A tiny robot completes a journey across the desert',
 'Researchers report a breakthrough in space exploration',
 'A giant iceberg breaks free near the Antarctic coast'
]

// The day's headlines, real if the feed can be read, in feed order, deduped and capped at MAX_REGIONS.
// Returns [] if the feed cannot be reached, so the caller can fall back.
export async function fetchHeadlines(date = new Date(), { fetchImpl = fetch } = {}) {
 try {
  const res = await fetchImpl(FEED(date))
  if (!res.ok) return []
  const data = await res.json()
  const stories = Array.isArray(data?.news) ? data.news : []
  const seen = new Set()
  const out = []
  for (const item of stories) {
   const text = firstSentence(stripHtml(item?.story))
   if (!text || seen.has(text)) continue
   seen.add(text)
   out.push(text)
   if (out.length >= MAX_REGIONS) break
  }
  return out
 } catch { return [] }
}

// The day's headlines, real if they could be had, otherwise the fixed fallback list (chosen entire,
// so a given day always falls back to the identical set, even offline).
export async function headlinesFor(date = new Date(), opts = {}) {
 const real = await fetchHeadlines(date, opts)
 if (real.length) return { texts: real, real: true }
 return { texts: FALLBACK_HEADLINES.slice(0, MAX_REGIONS), real: false }
}
