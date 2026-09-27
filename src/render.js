import { TILE, H, groundAt, regionAt } from './world.js'
import { GRID } from './sprites.js'
import { spriteCanvas } from './sprite-cache.js'
import { OBJ_HEIGHT } from './player.js'

// Draws one frame: the sky, the ground and platforms, placed objects and the relation links between
// them, in-flight lasers and their impact sparks, the local player, and any peers -- all in one small
// window (the "camera") that scrolls to follow the player through the much wider world. Nothing here
// is pure/tested (it is a canvas, by nature); the world, player and weapon state it reads all are.

export const VIEW_W = 20 // tiles visible at once
export const VIEW_H = H

const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h >>> 0 }

export function createRenderer(canvas) {
 canvas.width = VIEW_W * TILE
 canvas.height = VIEW_H * TILE
 const ctx = canvas.getContext('2d')
 ctx.imageSmoothingEnabled = false

 function cameraX(world, player) {
  if (world.w <= VIEW_W) return 0
  return Math.max(0, Math.min(world.w - VIEW_W, player.x - VIEW_W / 2))
 }

 function drawSky(world, camX, now) {
  const region = regionAt(world, camX + VIEW_W / 2)
  const [top, bottom] = region.palette.sky
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height)
  g.addColorStop(0, top); g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  if (region.weather === 'sparkle') {
   for (let i = 0; i < 18; i++) {
    const sx = (i * 137 + now * 0.01) % canvas.width, sy = (i * 71) % (canvas.height * 0.6)
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(now / 300 + i)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(sx, sy, 2, 2)
   }
   ctx.globalAlpha = 1
  } else if (region.weather === 'storm') {
   ctx.fillStyle = `rgba(20,20,30,${0.15 + 0.1 * Math.sin(now / 220)})`
   ctx.fillRect(0, 0, canvas.width, canvas.height)
  } else if (region.weather === 'mist') {
   ctx.fillStyle = 'rgba(255,255,255,0.06)'
   for (let i = 0; i < 4; i++) ctx.fillRect(0, canvas.height * (0.3 + i * 0.15) + Math.sin(now / 900 + i) * 8, canvas.width, 30)
  }
 }

 function drawGround(world, camX) {
  const x0 = Math.floor(camX), x1 = Math.ceil(camX + VIEW_W) + 1
  for (let x = x0; x < x1; x++) {
   const gy = groundAt(world, x), region = regionAt(world, x)
   const sx = (x - camX) * TILE
   const h = canvas.height - gy * TILE
   ctx.fillStyle = region.palette.base
   ctx.fillRect(sx, gy * TILE, TILE + 1, h)
   ctx.fillStyle = region.palette.high
   ctx.fillRect(sx, gy * TILE, TILE + 1, Math.max(2, TILE * 0.12))
   if (x % 3 === 0) { ctx.fillStyle = region.palette.low; ctx.fillRect(sx, gy * TILE + TILE * 0.5, TILE + 1, TILE * 0.5) }
  }
 }

 function drawPlatforms(world, camX) {
  for (const p of world.platforms) {
   if (p.x + p.w < camX - 1 || p.x > camX + VIEW_W + 1) continue
   const region = regionAt(world, p.x)
   const sx = (p.x - camX) * TILE, sy = p.y * TILE
   ctx.fillStyle = region.palette.base
   ctx.fillRect(sx, sy, p.w * TILE, TILE * 0.5)
   ctx.fillStyle = region.palette.accent
   ctx.fillRect(sx, sy, p.w * TILE, TILE * 0.14)
  }
 }

 function drawRelations(world, camX, now) {
  const byId = new Map(world.objects.map(o => [o.id, o]))
  for (const r of world.relations) {
   const a = byId.get(r.a), b = byId.get(r.b)
   if (!a || !b || a.destroyed || b.destroyed) continue
   const ax = (a.x - camX) * TILE, ay = (a.y - OBJ_HEIGHT * a.scale * 0.5) * TILE
   const bx = (b.x - camX) * TILE, by = (b.y - OBJ_HEIGHT * b.scale * 0.5) * TILE
   ctx.save()
   ctx.strokeStyle = r.glow
   ctx.lineWidth = 3
   ctx.globalAlpha = 0.55 + 0.2 * Math.sin(now / 250)
   ctx.setLineDash([6, 6])
   ctx.lineDashOffset = -now / 40
   ctx.shadowColor = r.glow; ctx.shadowBlur = 8
   ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke()
   ctx.restore()
  }
 }

 function drawObject(o, camX, now) {
  if (o.destroyed) return
  const accent = o.glowColor || '#f2f2f2'
  const img = spriteCanvas(o.type, o.spriteSeed, accent)
  const w = TILE * 1.15 * o.scale, h = w
  let sx = (o.x - camX) * TILE - w / 2
  const sy = o.y * TILE - h
  if (o.jitter) sx += Math.sin(now / 40 + hash(o.id)) * 2
  ctx.save()
  if (o.glowColor) { ctx.shadowColor = o.glowColor; ctx.shadowBlur = 14 }
  ctx.drawImage(img, 0, 0, GRID, GRID, sx, sy, w, h)
  ctx.restore()
  if (o.label) {
   ctx.font = '10px monospace'
   ctx.fillStyle = '#ffffffcc'
   ctx.textAlign = 'center'
   ctx.fillText(o.label, sx + w / 2, sy - 4)
  }
 }

 function drawObjects(world, camX, now) {
  for (const o of world.objects) {
   if (o.x < camX - 2 || o.x > camX + VIEW_W + 2) continue
   drawObject(o, camX, now)
  }
 }

 function drawLasers(lasers, camX, colorOf) {
  for (const l of lasers) {
   if (l.dead) continue
   const sx = (l.x - camX) * TILE, sy = l.y * TILE
   const bx = sx - Math.cos(l.angle) * TILE * 1.1, by = sy - Math.sin(l.angle) * TILE * 1.1
   const color = colorOf ? colorOf(l.by) : '#66e0ff'
   ctx.save()
   ctx.lineCap = 'round'
   ctx.strokeStyle = color; ctx.globalAlpha = 0.35; ctx.lineWidth = 10
   ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(sx, sy); ctx.stroke()
   ctx.globalAlpha = 0.85; ctx.lineWidth = 5
   ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(sx, sy); ctx.stroke()
   ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2
   ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(sx, sy); ctx.stroke()
   ctx.restore()
  }
 }

 function drawParticles(particles, camX) {
  for (const p of particles) {
   const t = p.age / p.life
   if (t >= 1) continue
   const sx = (p.x - camX) * TILE, sy = p.y * TILE
   ctx.save()
   ctx.globalAlpha = 1 - t
   ctx.strokeStyle = p.color || '#ffd75d'
   ctx.lineWidth = 2
   ctx.beginPath(); ctx.arc(sx, sy, 4 + t * 16, 0, Math.PI * 2); ctx.stroke()
   ctx.restore()
  }
 }

 function drawPerson(x, y, facing, color, name, camX, now, running) {
  const sx = (x - camX) * TILE, sy = y * TILE
  const w = TILE * 1.05, h = w
  const bob = running ? Math.sin(now / 90) * 2 : 0
  ctx.save()
  ctx.translate(sx, sy + bob)
  if (facing < 0) ctx.scale(-1, 1)
  const img = spriteCanvas('people', color, color)
  ctx.drawImage(img, 0, 0, GRID, GRID, -w / 2, -h, w, h)
  ctx.restore()
  if (name) {
   ctx.font = 'bold 10px monospace'
   ctx.fillStyle = '#ffffffdd'
   ctx.textAlign = 'center'
   ctx.fillText(name, sx, sy - h - 3)
  }
 }

 function draw({ world, player, peers = [], lasers = [], particles = [], me }, now) {
  const camX = cameraX(world, player)
  drawSky(world, camX, now)
  drawGround(world, camX)
  drawPlatforms(world, camX)
  drawRelations(world, camX, now)
  drawObjects(world, camX, now)
  for (const p of peers) drawPerson(p.x, p.y, p.facing || 1, p.color || '#8ed0ad', p.name, camX, now, Math.abs(p.vx || 0) > 0.3)
  drawPerson(player.x, player.y, player.facing, me?.color || '#66e0ff', null, camX, now, Math.abs(player.vx) > 0.3)
  drawLasers(lasers, camX, by => (peers.find(p => p.id === by)?.color) || me?.color || '#66e0ff')
  drawParticles(particles, camX)
 }

 return { draw, cameraX, VIEW_W, VIEW_H }
}
