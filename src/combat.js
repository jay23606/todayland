import { HALF_W, HEIGHT, OBJ_HALF_W, OBJ_HEIGHT } from './player.js'

// What makes clearing a region a fight rather than a stroll: some objects are hostile (an "alarming"
// headline makes its whole region dangerous; a "clash" relation makes just that pair dangerous, set in
// world.js) and shoot back or hurt the player on contact. Same spirit as weapons.js and the rest of the
// game: plain functions over plain arrays, the objects themselves carrying whatever state they need
// (`lastFired`, `touchedAt`), mutated in place, so nothing here needs a class or a canvas.

export const MAX_HEALTH = 100
export const HOSTILE_RANGE = 9 // tiles: how far a hostile object senses the player and opens fire
export const FIRE_INTERVAL = 1.6 // seconds between one hostile object's shots
export const ENEMY_DAMAGE = 8
export const CONTACT_DAMAGE = 14
export const CONTACT_COOLDOWN = 0.8 // seconds before the same object can deal contact damage again
export const HIT_INVULN = 0.5 // seconds of invulnerability after any hit, so one collision can't chain
export const RESPAWN_INVULN = 1.5

export const isHostile = o => Boolean(o.hostile)

// Every hostile, undestroyed object within range whose cooldown has elapsed fires once, aimed at the
// player. Mutates each firer's `lastFired` (the same in-place-state pattern `destroyed` already uses)
// and returns a shot per firer for the caller to turn into a travelling beam.
export function hostileFire(objects, player, now) {
 const shots = []
 for (const o of objects) {
  if (o.destroyed || !isHostile(o)) continue
  const fromY = o.y - (OBJ_HEIGHT * o.scale) / 2
  if (Math.hypot(o.x - player.x, fromY - player.y) > HOSTILE_RANGE) continue
  if (o.lastFired !== undefined && now - o.lastFired < FIRE_INTERVAL * 1000) continue
  o.lastFired = now
  shots.push({ id: o.id, x: o.x, y: fromY, tx: player.x, ty: player.y - HEIGHT / 2 })
 }
 return shots
}

// Any live enemy beam that has reached the player: kills the beam and reports a hit for the caller to
// apply as damage (nothing here touches player health directly, so a caller can still say no --
// invulnerability, for instance -- without this module needing to know about it).
export function checkPlayerHits(lasers, player) {
 const hits = []
 for (const l of lasers) {
  if (l.dead) continue
  if (Math.abs(l.x - player.x) <= HALF_W + 0.3 && Math.abs(l.y - (player.y - HEIGHT / 2)) <= HEIGHT / 2 + 0.3) {
   l.dead = true
   hits.push({ x: l.x, y: l.y, damage: ENEMY_DAMAGE, by: l.by })
  }
 }
 return hits
}

// Any hostile, undestroyed object currently overlapping the player deals contact damage, at most once
// per CONTACT_COOLDOWN each (tracked on the object itself as `touchedAt`, so standing on one hurts
// repeatedly over time rather than once, and walking away and back resets nothing but the timer).
export function checkContactDamage(objects, player, now) {
 const hits = []
 for (const o of objects) {
  if (o.destroyed || !isHostile(o)) continue
  if (o.touchedAt !== undefined && now - o.touchedAt < CONTACT_COOLDOWN * 1000) continue
  const ow = OBJ_HALF_W * o.scale, oh = OBJ_HEIGHT * o.scale
  const oTop = o.y - oh, oBottom = o.y, oLeft = o.x - ow, oRight = o.x + ow
  const pTop = player.y - HEIGHT, pBottom = player.y, pLeft = player.x - HALF_W, pRight = player.x + HALF_W
  if (pRight <= oLeft || pLeft >= oRight || pBottom <= oTop || pTop >= oBottom) continue
  o.touchedAt = now
  hits.push({ objectId: o.id, damage: CONTACT_DAMAGE })
 }
 return hits
}
