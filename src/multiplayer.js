import { createClient } from '@supabase/supabase-js'

// The shared world: everyone who loads Todayland on the same day joins the same Realtime channel and
// sees each other move and fire. This is presence + broadcast only -- nothing is written to a table, so
// it needs no schema and works the moment Realtime is enabled on the project. It is best-effort in the
// same spirit as supabase.js: if the client can't be built, the channel never subscribes, or the
// project has Realtime off, every call here quietly does nothing and the game is exactly as playable
// solo as it always was.

const URL_BASE = 'https://zbtgonklxweikgukzukg.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpidGdvbmtseHdlaWtndWt6dWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NDUwODUsImV4cCI6MjA5OTAyMTA4NX0.xQlEuluDvwrIGgOCU7_AkT2Fc3wq5rMPIfP89-QntaA'

export const PEER_COLORS = ['#66e0ff', '#ff8ed0', '#ffd75d', '#8ed0ad', '#c9a0ff', '#ff9a6b']

export const randomName = () => `Wanderer ${Math.floor(100 + Math.random() * 900)}`
export const colorFor = id => PEER_COLORS[Math.abs([...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)) % PEER_COLORS.length]

// Presence gives back {key: [{...tracked, presence_ref}]}; this flattens it to one row per connected
// peer (there can briefly be more than one presence per key across a reconnect, so the newest wins),
// dropping anyone who is us.
export function presenceListFrom(state, selfId) {
 const out = []
 for (const [key, entries] of Object.entries(state || {})) {
  if (key === selfId || !entries?.length) continue
  out.push(entries[entries.length - 1])
 }
 return out
}

export const laserPayload = (by, x, y, tx, ty) => ({ by, x, y, tx, ty, t: Date.now() })
export const hitPayload = (objectId, by) => ({ objectId, by, t: Date.now() })

let client = null, channel = null

// Joins the day's shared room. `me` is {id,name,color,x,y,facing,vx} -- whatever the caller wants
// peers to see, tracked immediately on subscribe and again on every updatePresence call. Returns true
// if it managed to start connecting (not necessarily that it is live yet); false only means the SDK
// itself could not be constructed (e.g. blocked), never a network failure, which resolves later.
export function connect(day, me, handlers = {}) {
 try {
  client = createClient(URL_BASE, ANON_KEY, { realtime: { params: { eventsPerSecond: 8 } } })
  channel = client.channel(`td-room-${day}`, { config: { presence: { key: me.id }, broadcast: { self: false } } })
  channel.on('presence', { event: 'sync' }, () => handlers.onPresence?.(presenceListFrom(channel.presenceState(), me.id)))
  channel.on('broadcast', { event: 'laser' }, ({ payload }) => handlers.onLaser?.(payload))
  channel.on('broadcast', { event: 'hit' }, ({ payload }) => handlers.onHit?.(payload))
  channel.subscribe(status => { if (status === 'SUBSCRIBED') { try { channel.track(me) } catch { /* best-effort */ } } })
  return true
 } catch { return false }
}

export function updatePresence(me) { try { channel?.track(me) } catch { /* best-effort */ } }
export function broadcastLaser(payload) { try { channel?.send({ type: 'broadcast', event: 'laser', payload }) } catch { /* best-effort */ } }
export function broadcastHit(payload) { try { channel?.send({ type: 'broadcast', event: 'hit', payload }) } catch { /* best-effort */ } }
export function disconnect() { try { channel?.unsubscribe() } catch { /* best-effort */ } channel = null }
