import { store, subscribeSelector } from './store.ts'
import {
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
} from './tools.ts'
import { compositeLayers } from './layers.ts'

let displayCanvas: HTMLCanvasElement
let displayCtx: CanvasRenderingContext2D
let previewCanvas: HTMLCanvasElement
let previewCtx: CanvasRenderingContext2D
let container: HTMLElement
let rafId: number

export function initCanvas() {
  container = document.getElementById('canvas-container')!
  displayCanvas = document.getElementById('display-canvas') as HTMLCanvasElement
  displayCtx = displayCanvas.getContext('2d')!
  previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement
  previewCtx = previewCanvas.getContext('2d')!

  resize()
  window.addEventListener('resize', resize)

  subscribeSelector((s) => [s.canvasWidth, s.canvasHeight], onSizeChange)
  subscribeSelector((s) => [s.layers, s.activeLayerIndex], scheduleRender)
  subscribeSelector((s) => s.viewport, scheduleRender)
  subscribeSelector((s) => s.showGrid, scheduleRender)

  setupPointerEvents()
  startRenderLoop()
}

function resize() {
  const rect = container.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  displayCanvas.width = rect.width * dpr
  displayCanvas.height = rect.height * dpr
  displayCanvas.style.width = rect.width + 'px'
  displayCanvas.style.height = rect.height + 'px'
  const s = store.getState()
  if (s.canvasWidth === 800 && s.canvasHeight === 600) {
    store.getState().resetCanvas(rect.width, rect.height)
  }
  scheduleRender()
}

function onSizeChange() {
  const s = store.getState()
  previewCanvas.width = s.canvasWidth
  previewCanvas.height = s.canvasHeight
  scheduleRender()
}

let renderScheduled = false
function scheduleRender() {
  if (!renderScheduled) {
    renderScheduled = true
    requestAnimationFrame(render)
  }
}

function render() {
  renderScheduled = false
  const s = store.getState()
  const containerRect = container.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const w = Math.round(containerRect.width * dpr)
  const h = Math.round(containerRect.height * dpr)

  if (displayCanvas.width !== w || displayCanvas.height !== h) {
    displayCanvas.width = w
    displayCanvas.height = h
    displayCanvas.style.width = containerRect.width + 'px'
    displayCanvas.style.height = containerRect.height + 'px'
  }

  displayCtx.save()
  displayCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
  displayCtx.fillStyle = '#0a0a14'
  displayCtx.fillRect(0, 0, containerRect.width, containerRect.height)

  const vp = s.viewport
  displayCtx.translate(vp.x, vp.y)
  displayCtx.scale(vp.zoom, vp.zoom)

  // Draw white canvas background
  displayCtx.fillStyle = 'white'
  displayCtx.fillRect(0, 0, s.canvasWidth, s.canvasHeight)

  // Composite layers
  compositeLayers(displayCtx)

  if (s.showGrid) {
    drawGrid(displayCtx, s.canvasWidth, s.canvasHeight, vp.zoom)
  }

  displayCtx.restore()
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  zoom: number
) {
  const gridSize = 20
  ctx.strokeStyle = 'rgba(0,0,255,0.08)'
  ctx.lineWidth = 1 / zoom
  for (let x = 0; x <= w; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let y = 0; y <= h; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
}

function startRenderLoop() {
  function loop() {
    render()
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
}

function setupPointerEvents() {
  const events = ['pointerdown', 'pointermove', 'pointerup', 'pointerleave'] as const
  for (const evt of events) {
    container.addEventListener(evt, (e: PointerEvent) => {
      const s = store.getState()
      if (s.tool === 'pan') {
        handlePan(e)
        return
      }
      if (e.pointerType === 'touch' && s.tool !== 'pan') {
        // Single touch = draw, two touches = pan/zoom
      }
      switch (evt) {
        case 'pointerdown':
          s.setIsDrawing(true)
          handlePointerDown(e.clientX, e.clientY)
          break
        case 'pointermove':
          handlePointerMove(e.clientX, e.clientY)
          break
        case 'pointerup':
        case 'pointerleave':
          if (s.isDrawing) {
            s.setIsDrawing(false)
            handlePointerUp(e.clientX, e.clientY)
            captureHistorySnapshot()
          }
          break
      }
    })
  }

  // Pinch zoom
  let lastPinchDist = 0
  container.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length === 2) {
      lastPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
    }
  })
  container.addEventListener('touchmove', (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      if (lastPinchDist > 0) {
        const scale = dist / lastPinchDist
        const rect = container.getBoundingClientRect()
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top
        const s = store.getState()
        const newZoom = Math.min(10, Math.max(0.1, s.viewport.zoom * scale))
        store.getState().setViewport({
          zoom: newZoom,
          x: cx - (cx - s.viewport.x) * (newZoom / s.viewport.zoom),
          y: cy - (cy - s.viewport.y) * (newZoom / s.viewport.zoom),
        })
      }
      lastPinchDist = dist
    }
  })
  container.addEventListener('touchend', () => {
    lastPinchDist = 0
  })

  // Scroll wheel zoom
  container.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault()
    const rect = container.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const delta = -e.deltaY * 0.001
    const s = store.getState()
    const newZoom = Math.min(10, Math.max(0.1, s.viewport.zoom * (1 + delta)))
    store.getState().setViewport({
      zoom: newZoom,
      x: cx - (cx - s.viewport.x) * (newZoom / s.viewport.zoom),
      y: cy - (cy - s.viewport.y) * (newZoom / s.viewport.zoom),
    })
  })
}

let panStart: { x: number; y: number } | null = null
let panViewport: { x: number; y: number } | null = null

function handlePan(e: PointerEvent) {
  switch (e.type) {
    case 'pointerdown':
      panStart = { x: e.clientX, y: e.clientY }
      panViewport = { ...store.getState().viewport }
      break
    case 'pointermove':
      if (panStart && panViewport) {
        const dx = e.clientX - panStart.x
        const dy = e.clientY - panStart.y
        store.getState().setViewport({
          x: panViewport.x + dx,
          y: panViewport.y + dy,
        })
      }
      break
    case 'pointerup':
    case 'pointerleave':
      panStart = null
      panViewport = null
      break
  }
}

function captureHistorySnapshot() {
  const s = store.getState()
  const layers = s.layers
  const entry = {
    layers: layers.map((l) => {
      const ctx = l.canvas.getContext('2d')!
      return ctx.getImageData(0, 0, l.canvas.width, l.canvas.height)
    }),
    width: s.canvasWidth,
    height: s.canvasHeight,
  }
  store.getState().pushHistory(entry)
}
