import { store } from './store.ts'

export function zoomIn() {
  const s = store.getState()
  const newZoom = Math.min(10, s.viewport.zoom * 1.25)
  const container = document.getElementById('canvas-container')!
  const rect = container.getBoundingClientRect()
  const cx = rect.width / 2
  const cy = rect.height / 2
  store.getState().setViewport({
    zoom: newZoom,
    x: cx - (cx - s.viewport.x) * (newZoom / s.viewport.zoom),
    y: cy - (cy - s.viewport.y) * (newZoom / s.viewport.zoom),
  })
}

export function zoomOut() {
  const s = store.getState()
  const newZoom = Math.max(0.1, s.viewport.zoom / 1.25)
  const container = document.getElementById('canvas-container')!
  const rect = container.getBoundingClientRect()
  const cx = rect.width / 2
  const cy = rect.height / 2
  store.getState().setViewport({
    zoom: newZoom,
    x: cx - (cx - s.viewport.x) * (newZoom / s.viewport.zoom),
    y: cy - (cy - s.viewport.y) * (newZoom / s.viewport.zoom),
  })
}

export function zoomToFit() {
  const s = store.getState()
  const container = document.getElementById('canvas-container')!
  const rect = container.getBoundingClientRect()
  const scaleX = rect.width / s.canvasWidth
  const scaleY = rect.height / s.canvasHeight
  const zoom = Math.min(scaleX, scaleY) * 0.9
  store.getState().setViewport({
    zoom,
    x: (rect.width - s.canvasWidth * zoom) / 2,
    y: (rect.height - s.canvasHeight * zoom) / 2,
  })
}

export function resetViewport() {
  store.getState().setViewport({ x: 0, y: 0, zoom: 1 })
}
