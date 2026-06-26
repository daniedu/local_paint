import type { Layer } from './lib.ts'
import { store } from './store.ts'

let layerCounter = 0

function createLayerCanvas(
  width: number,
  height: number
): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const ctx = c.getContext('2d')!
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, width, height)
  return c
}

export function makeLayer(name: string, w: number, h: number): Layer {
  return {
    id: `layer-${++layerCounter}`,
    name,
    visible: true,
    opacity: 1,
    canvas: createLayerCanvas(w, h),
  }
}

export function compositeLayers(ctx: CanvasRenderingContext2D) {
  const s = store.getState()
  for (const layer of s.layers) {
    if (!layer.visible) continue
    ctx.globalAlpha = layer.opacity
    ctx.drawImage(layer.canvas, 0, 0)
  }
  ctx.globalAlpha = 1
}

export function duplicateLayer(id: string) {
  const s = store.getState()
  const idx = s.layers.findIndex((l) => l.id === id)
  if (idx < 0) return
  const src = s.layers[idx]
  const newCanvas = createLayerCanvas(s.canvasWidth, s.canvasHeight)
  const newCtx = newCanvas.getContext('2d')!
  newCtx.drawImage(src.canvas, 0, 0)
  const newLayer: Layer = {
    id: `layer-${++layerCounter}`,
    name: `${src.name} (copy)`,
    visible: true,
    opacity: src.opacity,
    canvas: newCanvas,
  }
  store.getState().addLayer(newLayer)
}

export function mergeDown(id: string) {
  const s = store.getState()
  const idx = s.layers.findIndex((l) => l.id === id)
  if (idx <= 0) return
  const upper = s.layers[idx]
  const lower = s.layers[idx - 1]
  if (!upper.visible) return
  const ctx = lower.canvas.getContext('2d')!
  ctx.globalAlpha = upper.opacity
  ctx.drawImage(upper.canvas, 0, 0)
  ctx.globalAlpha = 1
  store.getState().removeLayer(id)
}
