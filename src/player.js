import { W, H } from './world.js'

// The player's movement and what it finds. Kept apart from rendering and input so it can be tested as
// plain data in, plain data out: a position, a direction, and which objects it has come close enough
// to. Movement is continuous (not tile-locked), in tiles per second.

export const SPEED = 4.2
export const FIND_RADIUS = 0.55

export function createPlayer(start) {
 return { x: start[0] + 0.5, y: start[1] + 0.5, dx: 0, dy: 0 }
}

// Applies one tick of movement from an input vector (each axis in [-1,1]), keeping the player on the
// grid. Returns the player unchanged in shape, moved in place is avoided -- a new object -- so callers
// can diff it easily in tests.
export function step(player, input, dt) {
 const len = Math.hypot(input.x, input.y) || 1
 const nx = input.x / len, ny = input.y / len
 const moving = Math.hypot(input.x, input.y) > 0.001
 const x = clamp(player.x + (moving ? nx : 0) * SPEED * dt, 0.5, W - 0.5)
 const y = clamp(player.y + (moving ? ny : 0) * SPEED * dt, 0.5, H - 0.5)
 return { x, y, dx: moving ? nx : player.dx, dy: moving ? ny : player.dy }
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Marks any not-yet-found object within reach as found, mutating the objects in place (the world is
// the single source of truth the renderer and the HUD both read from). Returns the ones just found.
export function collectNearby(player, objects) {
 const justFound = []
 for (const o of objects) {
  if (o.found) continue
  if (Math.hypot(o.x + 0.5 - player.x, o.y + 0.5 - player.y) <= FIND_RADIUS) { o.found = true; justFound.push(o) }
 }
 return justFound
}
