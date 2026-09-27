// A tiny REST wrapper around the shared Supabase project -- no SDK, just fetch, so the whole app stays
// a static site. Everything here is best-effort: if the project or the schema.sql functions are not
// there yet, every call resolves to null/false instead of throwing, and the game plays perfectly well
// on the headline alone (see daily.js). This is only an enhancement: it freezes today's headline so
// every visitor sees the identical world even if the news feed moves on mid-day, and keeps a small
// shared counter of how many things have been found today.

const URL_BASE = 'https://zbtgonklxweikgukzukg.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpidGdvbmtseHdlaWtndWt6dWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NDUwODUsImV4cCI6MjA5OTAyMTA4NX0.xQlEuluDvwrIGgOCU7_AkT2Fc3wq5rMPIfP89-QntaA'

async function rpc(fn, args, { fetchImpl = fetch } = {}) {
 try {
  const res = await fetchImpl(`${URL_BASE}/rest/v1/rpc/${fn}`, {
   method: 'POST',
   headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
   body: JSON.stringify(args)
  })
  if (!res.ok) return null
  return await res.json()
 } catch { return null }
}

// Freezes (or reads back) the day's headline. Returns {headline, is_real} or null if the backend is
// not reachable or not yet set up -- the caller keeps whatever headline it already has.
export async function freezeDay(day, headline, isReal, opts) {
 const rows = await rpc('td_freeze_day', { p_day: day, p_headline: headline, p_is_real: isReal }, opts)
 return rows?.[0] || null
}

export async function recordVisit(day, opts) { await rpc('td_record_visit', { p_day: day }, opts) }

// Returns the new shared total, or null if it could not be recorded.
export async function recordFind(day, count = 1, opts) { return await rpc('td_record_find', { p_day: day, p_count: count }, opts) }

export async function readVisits(day, { fetchImpl = fetch } = {}) {
 try {
  const res = await fetchImpl(`${URL_BASE}/rest/v1/td_visits?day=eq.${encodeURIComponent(day)}&select=finds,visitors`, {
   headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  })
  if (!res.ok) return null
  const rows = await res.json()
  return rows?.[0] || null
 } catch { return null }
}
