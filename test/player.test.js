import test from 'node:test'
import assert from 'node:assert/strict'
import { createPlayer, step, HALF_W, OBJ_HALF_W } from '../src/player.js'

const flatWorld = (w = 40, groundY = 10, platforms = []) => ({ w, ground: new Array(w).fill(groundY), platforms, objects: [] })
const noInput = { left: false, right: false, jump: false }
const settle = (world, p, input, ticks = 200, dt = 1 / 60) => { for (let i = 0; i < ticks; i++) p = step(p, input, world, dt); return p }

test('a player dropped in mid-air falls and comes to rest exactly on the ground', () => {
 const world = flatWorld()
 let p = createPlayer([5, 0])
 p = settle(world, p, noInput)
 assert.equal(p.y, 10)
 assert.equal(p.onGround, true)
 assert.equal(p.vy, 0)
})

test('holding right accelerates up to MAX_SPEED and moves the player right; letting go brings it to a stop', () => {
 const world = flatWorld()
 let p = createPlayer([5, 10])
 p = settle(world, p, { ...noInput, right: true }, 120)
 assert.ok(p.vx > 0 && p.x > 5)
 assert.equal(p.facing, 1)
 p = settle(world, p, noInput, 60)
 assert.equal(p.vx, 0)
})

test('holding left moves the player left and faces it left', () => {
 const world = flatWorld()
 let p = createPlayer([20, 10])
 p = settle(world, p, { ...noInput, left: true }, 60)
 assert.ok(p.vx < 0 && p.x < 20)
 assert.equal(p.facing, -1)
})

test('a jump from the ground rises then falls back to exactly the same ground level', () => {
 const world = flatWorld()
 let p = settle(world, createPlayer([5, 0]), noInput) // land first
 p = step(p, { ...noInput, jump: true }, world, 1 / 60)
 assert.ok(p.vy < 0 && p.onGround === false, 'left the ground moving up')
 p = settle(world, p, noInput, 200)
 assert.equal(p.y, 10)
 assert.equal(p.onGround, true)
})

test('jumping only works while on the ground: holding jump in mid-air does not launch again', () => {
 const world = flatWorld()
 let p = settle(world, createPlayer([5, 0]), noInput) // land first
 p = step(p, { ...noInput, jump: true }, world, 1 / 60) // leaves the ground
 const vyAfterFirstJump = p.vy
 p = step(p, { ...noInput, jump: true }, world, 1 / 60) // still held, still airborne
 assert.ok(p.vy > vyAfterFirstJump, 'gravity applied, no second jump boost')
})

test('a platform catches the player falling onto it from above, instead of passing through to the ground', () => {
 const world = flatWorld(40, 14, [{ x: 3, y: 8, w: 4 }])
 let p = createPlayer([5, 0])
 p = settle(world, p, noInput)
 assert.equal(p.y, 8, 'landed on the platform, not the ground at 14')
 assert.equal(p.onGround, true)
})

test('a platform does not catch a player already below it walking under it', () => {
 const world = flatWorld(40, 14, [{ x: 3, y: 8, w: 4 }])
 let p = createPlayer([5, 13])
 p = settle(world, p, noInput, 60)
 assert.equal(p.y, 14, 'fell through to the ground, the platform is one-way')
})

test('a solid object blocks horizontal movement into it', () => {
 const world = flatWorld()
 world.objects = [{ x: 10, y: 10, scale: 1, destroyed: false }]
 let p = createPlayer([5, 10])
 p = settle(world, p, { ...noInput, right: true }, 300)
 assert.ok(p.x < 10 - OBJ_HALF_W + 0.05, 'stopped before reaching the object')
})

test('a destroyed object is no longer solid', () => {
 const world = flatWorld()
 world.objects = [{ x: 10, y: 10, scale: 1, destroyed: true }]
 let p = createPlayer([5, 10])
 p = settle(world, p, { ...noInput, right: true }, 300)
 assert.ok(p.x > 10, 'walked straight through it')
})

test('the player never leaves the world through either edge', () => {
 const world = flatWorld(20)
 let p = createPlayer([1, 10])
 p = settle(world, p, { ...noInput, left: true }, 300)
 assert.ok(p.x >= HALF_W - 1e-9)
 p = createPlayer([18, 10])
 p = settle(world, p, { ...noInput, right: true }, 300)
 assert.ok(p.x <= 20 - HALF_W + 1e-9)
})
