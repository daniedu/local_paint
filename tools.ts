import type { ToolType, Layer, Point } from './lib.ts'
import { store } from './store.ts'
import { pen, marker, spray, calligraphy, airbrush, type BrushFn } from './brushes.ts'

const brushMap: Record<string, BrushFn> = {
  pen,
  marker,
  spray,
  calligraphy,
  airbrush,
}

let prevPoint: Point | null = null
let isDrawing = false
let activeLayer: Layer | null = null

export function getActiveLayerCanvas(): HTMLCanvasElement | null {
  const s = store.getState()
  const layer = s.layers[s.activeLayerIndex]
  if (!layer) return null
  activeLayer = layer
  return layer.canvas
}

function getCanvasPoint(clientX: number, clientY: number): Point {
  const container = document.getElementById('canvas-container')!
  const rect = container.getBoundingClientRect()
  const s = store.getState()
  const vp = s.viewport
  return {
    x: (clientX - rect.left - vp.x) / vp.zoom,
    y: (clientY - rect.top - vp.y) / vp.zoom,
  }
}

export function handlePointerDown(clientX: number, clientY: number) {
  const s = store.getState()
  if (s.tool === 'pan') return

  const canvas = getActiveLayerCanvas()
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const pt = getCanvasPoint(clientX, clientY)

  if (s.tool === 'fill') {
    floodFill(ctx, Math.round(pt.x), Math.round(pt.y), s.color)
    s.setIsDrawing(false)
    return
  }

  if (s.tool === 'rect' || s.tool === 'circle') {
    isDrawing = true
    prevPoint = pt
    return
  }

  isDrawing = true
  prevPoint = pt
  ctx.save()

  const brush = brushMap[s.tool]
  if (brush) {
    brush(ctx, pt, pt, s.color, s.size, s.opacity)
  }
}

export function handlePointerMove(clientX: number, clientY: number) {
  if (!isDrawing || !prevPoint) return
  const s = store.getState()

  const canvas = getActiveLayerCanvas()
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const pt = getCanvasPoint(clientX, clientY)

  if (s.tool === 'rect' || s.tool === 'circle') {
    drawShapePreview(ctx, prevPoint, pt, s.tool, s.color, s.size)
    return
  }

  const brush = brushMap[s.tool]
  if (brush) {
    brush(ctx, prevPoint, pt, s.color, s.size, s.opacity)
  }
  prevPoint = pt
}

export function handlePointerUp(clientX: number, clientY: number) {
  if (!isDrawing) return
  isDrawing = false

  const s = store.getState()
  if (s.tool === 'rect' || s.tool === 'circle') {
    const canvas = getActiveLayerCanvas()
    if (!canvas || !prevPoint) return
    const ctx = canvas.getContext('2d')!
    const pt = getCanvasPoint(clientX, clientY)
    drawShape(ctx, prevPoint, pt, s.tool, s.color, s.size)
  }

  prevPoint = null
  store.getState().setIsDrawing(false)
}

function drawShapePreview(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  tool: ToolType,
  color: string,
  size: number
) {
  const preview = document.getElementById('preview-canvas') as HTMLCanvasElement
  if (!preview) return
  const s = store.getState()
  preview.width = s.canvasWidth
  preview.height = s.canvasHeight
  const pctx = preview.getContext('2d')!
  pctx.clearRect(0, 0, preview.width, preview.height)
  pctx.strokeStyle = color
  pctx.lineWidth = size
  if (tool === 'rect') {
    pctx.strokeRect(
      Math.min(from.x, to.x),
      Math.min(from.y, to.y),
      Math.abs(to.x - from.x),
      Math.abs(to.y - from.y)
    )
  } else {
    const cx = (from.x + to.x) / 2
    const cy = (from.y + to.y) / 2
    const rx = Math.abs(to.x - from.x) / 2
    const ry = Math.abs(to.y - from.y) / 2
    pctx.beginPath()
    pctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    pctx.stroke()
  }
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  tool: ToolType,
  color: string,
  size: number
) {
  ctx.strokeStyle = color
  ctx.lineWidth = size
  if (tool === 'rect') {
    ctx.strokeRect(
      Math.min(from.x, to.x),
      Math.min(from.y, to.y),
      Math.abs(to.x - from.x),
      Math.abs(to.y - to.y)
    )
  } else {
    const cx = (from.x + to.x) / 2
    const cy = (from.y + to.y) / 2
    const rx = Math.abs(to.x - from.x) / 2
    const ry = Math.abs(to.y - from.y) / 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  const preview = document.getElementById('preview-canvas') as HTMLCanvasElement
  if (preview) {
    const pctx = preview.getContext('2d')!
    pctx.clearRect(0, 0, preview.width, preview.height)
  }
}

function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColor: string
) {
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data

  const idx = (startY * w + startX) * 4
  const targetR = data[idx]
  const targetG = data[idx + 1]
  const targetB = data[idx + 2]
  const targetA = data[idx + 3]

  const fill = hexToRgba(fillColor, 1)
  const fillR = fill[0]
  const fillG = fill[1]
  const fillB = fill[2]
  const fillA = 255

  if (
    targetR === fillR &&
    targetG === fillG &&
    targetB === fillB &&
    targetA === fillA
  )
    return

  const visited = new Uint8Array(w * h)
  const stack: number[] = [startX, startY]
  const matchColor = (i: number) =>
    data[i] === targetR &&
    data[i + 1] === targetG &&
    data[i + 2] === targetB &&
    data[i + 3] === targetA

  while (stack.length > 0) {
    const y = stack.pop()!
    const x = stack.pop()!
    const i = y * w + x
    if (x < 0 || x >= w || y < 0 || y >= h) continue
    if (visited[i]) continue
    visited[i] = 1
    const pi = i * 4
    if (!matchColor(pi)) continue
    data[pi] = fillR
    data[pi + 1] = fillG
    data[pi + 2] = fillB
    data[pi + 3] = fillA
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1)
  }

  ctx.putImageData(imageData, 0, 0)
}

function hexToRgba(hex: string, alpha: number): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b, Math.round(alpha * 255)]
}
