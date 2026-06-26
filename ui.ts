import { store, subscribeSelector } from './store.ts'
import { makeLayer } from './layers.ts'
import { undo, redo, pushSnapshot } from './history.ts'
import { saveCurrentDrawing, listDrawings, deleteDrawing } from './storage.ts'
import { pushSnapshot } from './history.ts'
import type { DrawingFile, Layer } from './lib.ts'

export function initUI() {
  setupTools()
  setupColor()
  setupSize()
  setupOpacity()
  setupUndoRedo()
  setupClear()
  setupSave()
  setupFullscreen()
  setupGrid()
  setupLayers()
  setupLayerSheet()
  subscribeSelector((s) => s.layers, renderLayers)
  subscribeSelector((s) => s.activeLayerIndex, renderLayers)
  subscribeSelector((s) => s.tool, highlightTool)
}

function setupTools() {
  document.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tool = (btn as HTMLElement).dataset.tool!
      store.getState().setTool(tool as any)
      // Update cursor
      const container = document.getElementById('canvas-container')!
      container.classList.toggle('pan-mode', tool === 'pan')
    })
  })
}

function highlightTool(tool: string) {
  document.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.tool === tool)
  })
}

function setupColor() {
  const picker = document.getElementById('color-picker') as HTMLInputElement
  picker.addEventListener('input', () => store.getState().setColor(picker.value))
}

function setupSize() {
  const slider = document.getElementById('size-slider') as HTMLInputElement
  const display = document.getElementById('size-display')!
  slider.addEventListener('input', () => {
    const v = parseInt(slider.value)
    store.getState().setSize(v)
    display.style.width = display.style.height = Math.max(4, v * 0.6) + 'px'
  })
}

function setupOpacity() {
  const slider = document.getElementById('opacity-slider') as HTMLInputElement
  slider.addEventListener('input', () => {
    store.getState().setOpacity(parseInt(slider.value) / 100)
  })
}

function setupUndoRedo() {
  document.getElementById('undo-btn')!.addEventListener('click', undo)
  document.getElementById('redo-btn')!.addEventListener('click', redo)
}

function setupClear() {
  document.getElementById('clear-btn')!.addEventListener('click', () => {
    if (!confirm('Clear all layers?')) return
    const s = store.getState()
    for (const layer of s.layers) {
      const ctx = layer.canvas.getContext('2d')!
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    }
    pushSnapshot()
  })
}

async function setupSave() {
  document.getElementById('save-btn')!.addEventListener('click', async () => {
    const name = prompt('Drawing name:', `Drawing ${new Date().toLocaleDateString()}`)
    if (!name) return
    const id = await saveCurrentDrawing(name)
    showToast(`Saved "${name}"`)
  })
}

function setupFullscreen() {
  document.getElementById('fullscreen-btn')!.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      store.getState().setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      store.getState().setIsFullscreen(false)
    }
  })
}

function setupGrid() {
  document.getElementById('grid-btn')!.addEventListener('click', () => {
    const s = store.getState()
    store.getState().setShowGrid(!s.showGrid)
  })
}

function setupLayers() {
  const addBtn = document.getElementById('add-layer-btn')!
  addBtn.addEventListener('click', () => {
    const s = store.getState()
    const layer = makeLayer(`Layer ${s.layers.length}`, s.canvasWidth, s.canvasHeight)
    store.getState().addLayer(layer)
  })
}

function renderLayers() {
  const s = store.getState()
  const renderTo = (containerId: string) => {
    const container = document.getElementById(containerId)
    if (!container) return
    container.innerHTML = s.layers.map((l, i) => `
      <div class="flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
        i === s.activeLayerIndex ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-surface-2'
      }" data-layer-id="${l.id}">
        <button class="text-xs w-4 text-center ${l.visible ? 'text-white' : 'text-text-dim'}" data-toggle-vis>${l.visible ? '👁' : '—'}</button>
        <span class="text-xs truncate flex-1">${l.name}</span>
        <input type="range" min="0" max="100" value="${Math.round(l.opacity * 100)}" class="w-12 accent-primary" data-opacity />
      </div>
    `).join('')

    container.querySelectorAll('[data-layer-id]').forEach((el) => {
      const id = (el as HTMLElement).dataset.layerId!
      el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('[data-opacity]')) return
        if ((e.target as HTMLElement).closest('[data-toggle-vis]')) return
        const idx = s.layers.findIndex((l) => l.id === id)
        if (idx >= 0) store.getState().setActiveLayerIndex(idx)
      })
      el.querySelector('[data-toggle-vis]')?.addEventListener('click', (e) => {
        e.stopPropagation()
        const layer = s.layers.find((l) => l.id === id)
        if (layer) store.getState().setLayerVisibility(id, !layer.visible)
      })
      el.querySelector('[data-opacity]')?.addEventListener('input', (e) => {
        e.stopPropagation()
        const val = parseInt((e.target as HTMLInputElement).value) / 100
        store.getState().setLayerOpacity(id, val)
      })
    })
  }

  renderTo('layer-list')
  renderTo('layer-list-mobile')
}

function setupLayerSheet() {
  const layersBtn = document.getElementById('layers-toggle-btn')!
  const sheet = document.getElementById('layer-sheet')!
  const closeBtn = document.getElementById('close-layer-sheet')!
  const addBtn = document.getElementById('add-layer-btn-mobile')!

  layersBtn.addEventListener('click', () => {
    sheet.classList.toggle('hidden')
    sheet.classList.toggle('translate-y-full')
  })
  closeBtn.addEventListener('click', () => {
    sheet.classList.add('hidden')
    sheet.classList.remove('translate-y-full')
  })
  addBtn.addEventListener('click', () => {
    const s = store.getState()
    const layer = makeLayer(`Layer ${s.layers.length}`, s.canvasWidth, s.canvasHeight)
    store.getState().addLayer(layer)
  })
}

function showToast(msg: string) {
  const el = document.getElementById('toast')!
  el.textContent = msg
  el.classList.remove('opacity-0')
  el.classList.add('opacity-100')
  setTimeout(() => {
    el.classList.remove('opacity-100')
    el.classList.add('opacity-0')
  }, 2500)
}

;(window as any).__showToast = showToast
