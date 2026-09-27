import { OBJ_HALF_W, OBJ_HEIGHT } from './player.js'

// The laser: a cartoon beam fired toward wherever was clicked, that flies in a straight line and
// destroys the first object it touches. Pure functions over plain arrays, same spirit as player.js --
// nothing here holds a canvas or a timer, so a whole exchange of shots can be replayed in a test.

export const LASER_SPEED = 34 // tiles per second
export const LASER_LIFE = 0.55 // seconds before a beam that hit nothing fizzles out
export const FIRE_COOLDOWN = 0.18 // seconds between shots, so a held-down click is not a solid beam

let nextId = 1
export const resetLaserIds = () => { nextId = 1 } // test-only: keeps expected ids predictable

// Fires one beam from (x,y) toward (tx,ty) (world tile coordinates). `by` is whose shot this is (a
// player id), so a hit event can be attributed and a peer's own beam is not drawn twice.
export function fireLaser(x, y, tx, ty, by) {
 const angle = Math.atan2(ty - y, tx - x)
 return { id: nextId++, x, y, angle, life: LASER_LIFE, by, dead: false }
}

// Advances every live beam, kills any that have run out of life or left the world.
export function stepLasers(lasers, dt, bounds) {
 return lasers.map(l => {
  if (l.dead) return l
  const x = l.x + Math.cos(l.angle) * LASER_SPEED * dt
  const y = l.y + Math.sin(l.angle) * LASER_SPEED * dt
  const life = l.life - dt
  const outOfBounds = bounds && (x < -2 || x > bounds.w + 2 || y < -2 || y > bounds.h + 2)
  return { ...l, x, y, life, dead: life <= 0 || Boolean(outOfBounds) }
 })
}

export const liveLasers = lasers => lasers.filter(l => !l.dead)

// Any live beam that has now reached a not-yet-destroyed object: marks the object destroyed and the
// beam dead (mutating both, the same "objects are the source of truth" pattern the rest of the game
// uses), and returns a hit event per collision for the renderer's spark effect.
export function checkLaserHits(lasers, objects) {
 const hits = []
 for (const laser of lasers) {
  if (laser.dead) continue
  for (const o of objects) {
   if (o.destroyed) continue
   const halfW = OBJ_HALF_W * o.scale, halfH = (OBJ_HEIGHT * o.scale) / 2
   const cy = o.y - halfH
   if (Math.abs(laser.x - o.x) <= halfW && Math.abs(laser.y - cy) <= halfH) {
    o.destroyed = true
    laser.dead = true
    hits.push({ x: laser.x, y: laser.y, objectId: o.id, laserId: laser.id, by: laser.by })
    break
   }
  }
 }
 return hits
}
