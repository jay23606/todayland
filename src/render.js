import { TILE, W, H } from './world.js'

// Draws the world to a canvas and runs a light weather-particle system. Pure-ish: it reads the world
// and a player position and paints; it holds only its own particle state, nothing the game logic needs.

const shade = (hex, amt) => {
 const n = parseInt(hex.slice(1), 16)
 const r = Math.max(0, Math.min(255, (n >> 16) + amt))
 const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt))
 const b = Math.max(0, Math.min(255, (n & 0xff) + amt))
 return `rgb(${r},${g},${b})`
}

export function createRenderer(canvas) {
 const ctx = canvas.getContext('2d')
 canvas.width = W * TILE
 canvas.height = H * TILE
 let particles = []
 let seeded = false

 function seedParticles(weather) {
  particles = []
  if (weather === 'clear') return
  const count = weather === 'storm' ? 90 : weather === 'sparkle' ? 60 : 45
  for (let i = 0; i < count; i++) {
   particles.push({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    vy: weather === 'storm' ? 260 + Math.random() * 160 : weather === 'mist' ? 8 + Math.random() * 10 : -12 - Math.random() * 18,
    vx: weather === 'storm' ? -40 - Math.random() * 30 : (Math.random() - 0.5) * 12,
    size: weather === 'sparkle' ? 1.5 + Math.random() * 2 : weather === 'mist' ? 30 + Math.random() * 50 : 1 + Math.random() * 1.5,
    phase: Math.random() * Math.PI * 2
   })
  }
 }

 function drawTerrain(world) {
  const { palette } = world
  const colors = [palette.low, palette.base, palette.high]
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
   ctx.fillStyle = colors[world.terrain[y][x]]
   ctx.fillRect(x * TILE, y * TILE, TILE, TILE)
  }
  // a soft grid so tiles read as a place, not a flat wash
  ctx.strokeStyle = shade(palette.base, -14)
  ctx.lineWidth = 1
  for (let x = 0; x <= W; x++) { ctx.beginPath(); ctx.moveTo(x * TILE, 0); ctx.lineTo(x * TILE, canvas.height); ctx.globalAlpha = 0.12; ctx.stroke() }
  for (let y = 0; y <= H; y++) { ctx.beginPath(); ctx.moveTo(0, y * TILE); ctx.lineTo(canvas.width, y * TILE); ctx.globalAlpha = 0.12; ctx.stroke() }
  ctx.globalAlpha = 1
 }

 function drawObjects(world, t) {
  for (const o of world.objects) {
   if (o.found) continue
   const cx = o.x * TILE + TILE / 2, cy = o.y * TILE + TILE / 2
   const bob = Math.sin(t / 400 + o.id) * 3
   ctx.save()
   ctx.translate(cx, cy + bob)
   if (o.spin) ctx.rotate(Math.sin(t / 600 + o.id) * 0.25)
   ctx.scale(o.scale, o.scale)
   ctx.font = `${TILE * 0.85}px "Segoe UI Emoji","Noto Color Emoji",sans-serif`
   ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
   ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 6
   ctx.fillText(o.glyph, 0, 0)
   ctx.restore()
  }
 }

 function drawPlayer(pos, t) {
  const cx = pos.x * TILE + TILE / 2, cy = pos.y * TILE + TILE / 2
  const bob = Math.sin(t / 220) * 2
  ctx.save()
  ctx.translate(cx, cy + bob)
  ctx.font = `${TILE * 0.9}px "Segoe UI Emoji","Noto Color Emoji",sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 8
  ctx.fillText('🧭', 0, 0)
  ctx.restore()
 }

 function stepParticles(dt, weather) {
  for (const p of particles) {
   p.x += p.vx * dt; p.y += p.vy * dt
   if (weather === 'mist') p.phase += dt * 0.4
   if (p.y < -60 || p.y > canvas.height + 60 || p.x < -80 || p.x > canvas.width + 80) {
    p.x = Math.random() * canvas.width
    p.y = weather === 'sparkle' ? canvas.height + 10 : -10
   }
  }
 }

 function drawParticles(weather) {
  if (weather === 'clear') return
  ctx.save()
  if (weather === 'storm') { ctx.strokeStyle = 'rgba(200,220,255,.55)'; ctx.lineWidth = 1.4 }
  for (const p of particles) {
   if (weather === 'storm') {
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 8, p.y + 14); ctx.stroke()
   } else if (weather === 'sparkle') {
    ctx.fillStyle = `rgba(255,240,180,${0.5 + 0.5 * Math.sin(p.phase + p.y / 20)})`
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill()
   } else {
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.beginPath(); ctx.arc(p.x + Math.sin(p.phase) * 20, p.y, p.size, 0, 7); ctx.fill()
   }
  }
  ctx.restore()
 }

 return {
  draw(world, playerPos, t, dt) {
   if (!seeded) { seedParticles(world.weather); seeded = true }
   drawTerrain(world)
   drawObjects(world, t)
   drawPlayer(playerPos, t)
   stepParticles(dt, world.weather)
   drawParticles(world.weather)
  },
  resetWeather(weather) { seedParticles(weather) }
 }
}
