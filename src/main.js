import { todaysWorld } from './daily.js'
import { createPlayer, step, collectNearby } from './player.js'
import { createRenderer } from './render.js'
import { totalToFind, foundCount, isComplete } from './world.js'
import { freezeDay, recordVisit, recordFind, readVisits } from './supabase.js'

const $ = s => document.querySelector(s)

async function boot() {
 const world = await todaysWorld()

 // Try to freeze/read the shared headline for today; if the backend is not set up yet this is a
 // no-op and the client's own headline (already built into `world`) is what plays.
 const frozen = await freezeDay(world.day, world.headline, world.headlineReal)
 const state = { world, headline: frozen?.headline || world.headline }
 recordVisit(world.day)

 $('#headline').textContent = `“${state.headline}”`
 const canvas = $('#world')
 const renderer = createRenderer(canvas)
 let player = createPlayer(world.start)
 const input = { x: 0, y: 0 }
 const keys = new Set()

 const paintProgress = () => { $('#progress').textContent = `${foundCount(world)} / ${totalToFind(world)} found` }
 paintProgress()

 readVisits(world.day).then(row => {
  if (!row || !row.finds) return
  const el = $('#community')
  el.hidden = false
  el.textContent = `${row.finds.toLocaleString()} things found today`
 })

 const toast = text => {
  const el = $('#toast')
  el.textContent = text
  el.hidden = false
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''
  setTimeout(() => { el.hidden = true }, 1600)
 }

 const KEY_VECTORS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0]
 }
 addEventListener('keydown', e => { if (KEY_VECTORS[e.key]) { keys.add(e.key); updateInputFromKeys() } })
 addEventListener('keyup', e => { keys.delete(e.key); updateInputFromKeys() })
 function updateInputFromKeys() {
  let x = 0, y = 0
  for (const k of keys) { const v = KEY_VECTORS[k]; if (v) { x += v[0]; y += v[1] } }
  input.x = x; input.y = y
 }

 // Touch/mouse: drag anywhere on the stage, the player heads toward the pointer.
 let pointer = null
 const stage = $('#stage')
 const setPointer = e => {
  const rect = canvas.getBoundingClientRect()
  const p = e.touches ? e.touches[0] : e
  pointer = { x: ((p.clientX - rect.left) / rect.width) * canvas.width, y: ((p.clientY - rect.top) / rect.height) * canvas.height }
 }
 stage.addEventListener('pointerdown', e => { setPointer(e); stage.setPointerCapture?.(e.pointerId) })
 stage.addEventListener('pointermove', e => { if (e.buttons || e.pressure > 0) setPointer(e) })
 stage.addEventListener('pointerup', () => { pointer = null })
 stage.addEventListener('pointercancel', () => { pointer = null })

 let last = performance.now()
 function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  let vx = input.x, vy = input.y
  if (pointer) {
   const targetX = pointer.x / (canvas.width / world.w), targetY = pointer.y / (canvas.height / world.h)
   const dx = targetX - player.x, dy = targetY - player.y
   if (Math.hypot(dx, dy) > 0.15) { vx = dx; vy = dy }
  }
  if (!isComplete(world)) {
   player = step(player, { x: vx, y: vy }, dt)
   const found = collectNearby(player, world.objects)
   if (found.length) {
    paintProgress()
    toast(found.length === 1 ? 'Found something!' : `Found ${found.length} things!`)
    recordFind(world.day, found.length)
    if (isComplete(world)) onComplete()
   }
  }
  renderer.draw(world, player, now, dt)
  requestAnimationFrame(frame)
 }
 requestAnimationFrame(frame)

 if (import.meta.env.DEV) window.__td = { world, get player() { return player }, set player(p) { player = p }, collectNearby, step, paintProgress }

 function onComplete() {
  $('#complete').hidden = false
 }
 $('#share').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); toast('Link copied') } catch { toast(location.href) }
 }
}

boot().catch(err => {
 $('#headline').textContent = 'Todayland could not load today’s world. Try refreshing.'
 console.error(err)
})
