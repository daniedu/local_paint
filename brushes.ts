import type { Point } from './lib.ts'

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

function interpPoints(a: Point, b: Point): Point[] {
  const d = dist(a, b)
  const steps = Math.max(1, Math.ceil(d / 2))
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    pts.push(lerp(a, b, i / steps))
  }
  return pts
}

export type BrushFn = (
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
  size: number,
  opacity: number
) => void

export const pen: BrushFn = (ctx, from, to, color, size, opacity) => {
  ctx.strokeStyle = color
  ctx.globalAlpha = opacity
  ctx.lineWidth = size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
}

export const marker: BrushFn = (ctx, from, to, color, size, opacity) => {
  ctx.strokeStyle = color
  ctx.globalAlpha = opacity * 0.3
  ctx.lineWidth = size * 1.5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
}

export const spray: BrushFn = (ctx, from, to, color, size, opacity) => {
  ctx.fillStyle = color
  ctx.globalAlpha = opacity * 0.4
  const pts = interpPoints(from, to)
  const radius = size / 2
  for (const p of pts) {
    const density = Math.round(radius * 0.8)
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * radius
      const sx = p.x + Math.cos(angle) * r
      const sy = p.y + Math.sin(angle) * r
      ctx.beginPath()
      ctx.arc(sx, sy, Math.random() * 1.5 + 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export const calligraphy: BrushFn = (ctx, from, to, color, size, opacity) => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const len = dist(from, to)
  if (len < 0.5) {
    ctx.fillStyle = color
    ctx.globalAlpha = opacity
    ctx.beginPath()
    ctx.ellipse(from.x, from.y, size * 0.3, size * 0.7, angle, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  ctx.save()
  ctx.translate(from.x, from.y)
  ctx.rotate(angle)
  ctx.fillStyle = color
  ctx.globalAlpha = opacity
  const w = size * 0.3
  const h = size * 0.7
  ctx.beginPath()
  ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(len, 0, w, h, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.rect(0, -h, len, h * 2)
  ctx.fill()
  ctx.restore()
}

export const airbrush: BrushFn = (ctx, from, to, color, size, opacity) => {
  const pts = interpPoints(from, to)
  const radius = size * 1.5
  for (const p of pts) {
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius)
    const c = hexToRgba(color, opacity * 0.3)
    grad.addColorStop(0, c)
    grad.addColorStop(0.3, c)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
