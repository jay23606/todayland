import { todaysWorld, TILE, totalTargets, destroyedCount, isCleared, regionAt } from './world.js'
import { createPlayer, step, HEIGHT } from './player.js'
import { createRenderer } from './render.js'
import { fireLaser, stepLasers, liveLasers, checkLaserHits, FIRE_COOLDOWN } from './weapons.js'
import { hostileFire, checkPlayerHits, checkContactDamage, MAX_HEALTH, HIT_INVULN, RESPAWN_INVULN } from './combat.js'
import { connect, updatePresence, broadcastLaser, broadcastHit, laserPayload, hitPayload, randomName, colorFor } from './multiplayer.js'
import { freezeDay, recordVisit, recordFind, readVisits } from './supabase.js'

const $ = s => document.querySelector(s)

const myId = () => { try { return crypto.randomUUID() } catch { return 'p' + Math.random().toString(36).slice(2) } }

async function boot() {
 const world = await todaysWorld()

 // Best-effort: freezes/reads the shared headline text so a late feed rotation doesn't desync who sees
 // what banner mid-day (the world itself was already built from this client's own fetch, same
 // trade-off the single-headline build made). A no-op until schema.sql's RPCs exist on the project.
 await freezeDay(world.day, JSON.stringify(world.headlines), world.headlinesReal)
 recordVisit(world.day)

 const canvas = $('#world')
 const renderer = createRenderer(canvas)
 let player = createPlayer(world.start)
 let lastRegion = -1
 let lasers = []
 let enemyLasers = []
 let particles = []
 let peers = []
 let lastShot = -Infinity
 let lastPresence = 0
 let health = MAX_HEALTH
 let invulnUntil = 0
 let damageFlash = 0

 const me = { id: myId(), name: randomName() }
 me.color = colorFor(me.id)

 const paintProgress = () => { $('#progress').textContent = `${destroyedCount(world)} / ${totalTargets(world)} cleared` }
 const paintPlayers = () => { $('#players').textContent = `${peers.length + 1} exploring now` }
 const paintHealth = () => {
  const pct = Math.max(0, Math.round((health / MAX_HEALTH) * 100))
  $('#health-fill').style.width = `${pct}%`
  $('#health-fill').classList.toggle('low', pct <= 30)
  $('#health-label').textContent = `${Math.max(0, Math.round(health))} / ${MAX_HEALTH}`
 }
 paintProgress(); paintPlayers(); paintHealth()

 readVisits(world.day).then(row => {
  if (!row || !row.finds) return
  const el = $('#community')
  el.hidden = false
  el.textContent = `${row.finds.toLocaleString()} things destroyed today`
 })

 const toast = (text) => {
  const el = $('#toast')
  el.textContent = text
  el.hidden = false
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''
  setTimeout(() => { el.hidden = true }, 2200)
 }

 const enterRegion = (index) => {
  if (index === lastRegion) return
  lastRegion = index
  const r = world.regions[index]
  $('#headline').textContent = `“${r.headline}”`
  toast(`Entering region ${index + 1} of ${world.regions.length} · ${r.concepts.biome} · ${r.concepts.mood}`)
 }
 enterRegion(regionAt(world, player.x).index)

 // ---- input: keyboard movement + jump, click/tap to fire ----
 const keys = new Set()
 const input = { left: false, right: false, jump: false }
 const LEFT_KEYS = new Set(['ArrowLeft', 'a', 'A'])
 const RIGHT_KEYS = new Set(['ArrowRight', 'd', 'D'])
 const JUMP_KEYS = new Set(['ArrowUp', 'w', 'W', ' '])
 const syncInput = () => {
  input.left = [...keys].some(k => LEFT_KEYS.has(k))
  input.right = [...keys].some(k => RIGHT_KEYS.has(k))
  input.jump = [...keys].some(k => JUMP_KEYS.has(k))
 }
 addEventListener('keydown', e => { if (LEFT_KEYS.has(e.key) || RIGHT_KEYS.has(e.key) || JUMP_KEYS.has(e.key)) { e.preventDefault(); keys.add(e.key); syncInput() } })
 addEventListener('keyup', e => { keys.delete(e.key); syncInput() })

 // touch/click buttons (mobile) mirror the keyboard, held while pressed
 const holdButton = (id, key) => {
  const el = $(id); if (!el) return
  const on = e => { e.preventDefault(); keys.add(key); syncInput() }
  const off = () => { keys.delete(key); syncInput() }
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off)
 }
 holdButton('#btn-left', 'ArrowLeft'); holdButton('#btn-right', 'ArrowRight'); holdButton('#btn-jump', 'ArrowUp')

 const spawnParticle = (x, y, color) => particles.push({ x, y, age: 0, life: 0.35, color })

 // Knocked out by hostile things: full health back, sent to the start of the region it happened in
 // (not all the way back to region 0 -- losing a fight should cost you the region, not the whole run),
 // and a moment of invulnerability so respawning doesn't just immediately kill you again.
 const respawn = (now) => {
  const region = world.regions[regionAt(world, player.x).index]
  player = createPlayer([region.x0 + 2, region.ground[2] - 1])
  health = MAX_HEALTH
  invulnUntil = now + RESPAWN_INVULN * 1000
  paintHealth()
  toast('Overwhelmed! Back to the start of the region.')
 }

 const applyDamage = (hits, now) => {
  if (!hits.length || now < invulnUntil) return
  const total = hits.reduce((n, h) => n + h.damage, 0)
  health -= total
  invulnUntil = now + HIT_INVULN * 1000
  damageFlash = 1
  spawnParticle(player.x, player.y - HEIGHT / 2, '#ff5d5d')
  paintHealth()
  if (health <= 0) respawn(now)
 }

 const applyHit = (objectId) => {
  const obj = world.objects.find(o => o.id === objectId)
  if (!obj || obj.destroyed) return
  obj.destroyed = true
  spawnParticle(obj.x, obj.y - 0.6, '#ffd75d')
  paintProgress()
  recordFind(world.day, 1)
  if (isCleared(world)) $('#complete').hidden = false
 }

 connect(world.day, { ...me, x: player.x, y: player.y, facing: player.facing, vx: 0 }, {
  onPresence: list => { peers = list; paintPlayers() },
  onLaser: payload => { if (payload.by === me.id) return; lasers.push(fireLaser(payload.x, payload.y, payload.tx, payload.ty, payload.by)) },
  onHit: payload => applyHit(payload.objectId)
 })

 const fireAt = (tx, ty) => {
  const now = performance.now()
  if (now - lastShot < FIRE_COOLDOWN * 1000) return
  lastShot = now
  const fromY = player.y - HEIGHT * 0.6
  const laser = fireLaser(player.x, fromY, tx, ty, me.id)
  lasers.push(laser)
  broadcastLaser(laserPayload(me.id, player.x, fromY, tx, ty))
  player = { ...player, facing: tx >= player.x ? 1 : -1 }
 }

 const pointToWorld = (clientX, clientY) => {
  const rect = canvas.getBoundingClientRect()
  const px = ((clientX - rect.left) / rect.width) * canvas.width
  const py = ((clientY - rect.top) / rect.height) * canvas.height
  const camX = renderer.cameraX(world, player)
  return { x: camX + px / TILE, y: py / TILE }
 }
 $('#stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.touch-controls')) return
  const p = pointToWorld(e.clientX, e.clientY)
  fireAt(p.x, p.y)
 })

 let last = performance.now()
 function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  tick(dt, now)
  renderer.draw({ world, player, peers, lasers, enemyLasers, particles, me, invulnerable: now < invulnUntil, damageFlash }, now)
  requestAnimationFrame(frame)
 }

 // One logic step, kept apart from drawing so it can be driven by requestAnimationFrame in play and by
 // hand (see window.__tl.tick in dev) for anything that needs to advance the simulation deterministically.
 function tick(dt, now) {
  player = step(player, input, world, dt)
  lasers = stepLasers(lasers, dt, { w: world.w, h: world.h })
  const hits = checkLaserHits(liveLasers(lasers), world.objects)
  for (const hit of hits) {
   spawnParticle(hit.x, hit.y, '#ffd75d')
   if (hit.by === me.id) { paintProgress(); recordFind(world.day, 1); broadcastHit(hitPayload(hit.objectId, me.id)); if (isCleared(world)) $('#complete').hidden = false }
  }
  lasers = lasers.filter(l => !l.dead)

  // things fighting back: hostile objects take their shot when the player is in range, and anything
  // hostile the player is still standing on deals contact damage -- both suppressed while invulnerable,
  // which also covers the moment right after a respawn.
  for (const shot of hostileFire(world.objects, player, now)) enemyLasers.push(fireLaser(shot.x, shot.y, shot.tx, shot.ty, shot.id))
  enemyLasers = stepLasers(enemyLasers, dt, { w: world.w, h: world.h })
  applyDamage([...checkPlayerHits(liveLasers(enemyLasers), player), ...checkContactDamage(world.objects, player, now)], now)
  enemyLasers = enemyLasers.filter(l => !l.dead)

  damageFlash = Math.max(0, damageFlash - dt * 2.5)
  particles.forEach(p => { p.age += dt })
  particles = particles.filter(p => p.age < p.life)
  enterRegion(regionAt(world, player.x).index)
  if (now - lastPresence > 130) { lastPresence = now; updatePresence({ ...me, x: player.x, y: player.y, facing: player.facing, vx: player.vx }) }
 }

 requestAnimationFrame(frame)

 if (import.meta.env.DEV) window.__tl = {
  world, get player() { return player }, get lasers() { return lasers }, get enemyLasers() { return enemyLasers }, get peers() { return peers },
  get health() { return health }, fireAt, applyHit, respawn, input, keys, syncInput, tick,
  draw: () => renderer.draw({ world, player, peers, lasers, enemyLasers, particles, me, invulnerable: performance.now() < invulnUntil, damageFlash }, performance.now())
 }

 $('#share').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); toast('Link copied') } catch { toast(location.href) }
 }
}

boot().catch(err => {
 $('#headline').textContent = 'Todayland could not load today’s world. Try refreshing.'
 console.error(err)
})
