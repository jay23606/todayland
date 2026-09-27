import { groundAt } from './world.js'

// Side-scrolling movement: run, gravity, jump, and simple collision with the ground line, one-way
// platforms, and any solid (not-yet-destroyed) object. Kept apart from rendering and input so it can
// be tested as plain data in, plain data out -- a position and velocity, nothing that needs a canvas.

export const GRAVITY = 30
export const MOVE_ACCEL = 30
export const AIR_ACCEL = 16
export const FRICTION = 22
export const MAX_SPEED = 6.5
export const JUMP_SPEED = 11.5
export const HALF_W = 0.34
export const HEIGHT = 1.6
export const OBJ_HALF_W = 0.5
export const OBJ_HEIGHT = 1.2

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export function createPlayer(start) {
 return { x: start[0], y: start[1], vx: 0, vy: 0, onGround: false, facing: 1 }
}

// One tick of movement. `input` is {left,right,jump} booleans. `world` supplies the ground line, the
// world's width and its platforms; `objects` defaults to the world's own but can be overridden (a peer
// avatar collides with the same world without needing the destroyed-tracking that only the local
// player's copy carries).
export function step(player, input, world, dt, objects = world.objects) {
 const accel = player.onGround ? MOVE_ACCEL : AIR_ACCEL
 let vx = player.vx
 if (input.left) vx -= accel * dt
 if (input.right) vx += accel * dt
 if (!input.left && !input.right) {
  const f = FRICTION * dt
  vx = Math.abs(vx) <= f ? 0 : vx - Math.sign(vx) * f
 }
 vx = clamp(vx, -MAX_SPEED, MAX_SPEED)
 let vy = player.vy + GRAVITY * dt
 if (input.jump && player.onGround) vy = -JUMP_SPEED

 let x = clamp(player.x + vx * dt, HALF_W, world.w - HALF_W)
 const y0 = player.y
 let y = y0 + vy * dt

 // Landing: the ground line is always a candidate when falling; a platform only catches the player if
 // they were at or above its surface last tick and have now reached or passed through it (one-way).
 let support = vy >= 0 ? groundAt(world, x) : Infinity
 for (const p of world.platforms) {
  if (x + HALF_W < p.x || x - HALF_W > p.x + p.w) continue
  if (vy >= 0 && y0 <= p.y + 0.05 && y >= p.y && p.y < support) support = p.y
 }
 let onGround = false
 if (y >= support) { y = support; vy = 0; onGround = true }

 // Solid objects: after moving, push the player back out along whichever axis overlaps least.
 for (const o of objects) {
  if (o.destroyed) continue
  const ow = OBJ_HALF_W * o.scale, oh = OBJ_HEIGHT * o.scale
  const oTop = o.y - oh, oBottom = o.y, oLeft = o.x - ow, oRight = o.x + ow
  const pTop = y - HEIGHT, pBottom = y, pLeft = x - HALF_W, pRight = x + HALF_W
  if (pRight <= oLeft || pLeft >= oRight || pBottom <= oTop || pTop >= oBottom) continue
  const overlapX = Math.min(pRight, oRight) - Math.max(pLeft, oLeft)
  const overlapY = Math.min(pBottom, oBottom) - Math.max(pTop, oTop)
  if (overlapX < overlapY) { x += pLeft < oLeft ? -overlapX : overlapX; vx = 0 }
  else if (pBottom <= oBottom) { y -= overlapY; if (vy > 0) vy = 0; onGround = true }
  else { y += overlapY; if (vy < 0) vy = 0 }
 }

 const facing = vx > 0.05 ? 1 : vx < -0.05 ? -1 : player.facing
 return { x, y, vx, vy, onGround, facing }
}
