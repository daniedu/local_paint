import { createStore } from 'https://esm.sh/zustand@5/vanilla'
import type {
  AppStore,
  ToolType,
  ViewportState,
  Layer,
  HistoryEntry,
} from './lib.ts'
import {
  CANVAS_DEFAULT_WIDTH,
  CANVAS_DEFAULT_HEIGHT,
  MAX_HISTORY,
} from './lib.ts'

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

let layerCounter = 0

function makeLayer(name: string, w: number, h: number): Layer {
  return {
    id: `layer-${++layerCounter}`,
    name,
    visible: true,
    opacity: 1,
    canvas: createLayerCanvas(w, h),
  }
}

export const store = createStore<AppStore>((set, get) => ({
  tool: 'pen',
  color: '#7c5cfc',
  size: 4,
  opacity: 1,
  layers: [],
  activeLayerIndex: 0,
  history: [],
  historyIndex: -1,
  viewport: { x: 0, y: 0, zoom: 1 },
  isFullscreen: false,
  showGrid: false,
  isDrawing: false,
  canvasWidth: CANVAS_DEFAULT_WIDTH,
  canvasHeight: CANVAS_DEFAULT_HEIGHT,

  setTool: (tool: ToolType) => set({ tool }),
  setColor: (color: string) => set({ color }),
  setSize: (size: number) => set({ size }),
  setOpacity: (opacity: number) => set({ opacity }),
  setActiveLayerIndex: (index: number) => set({ activeLayerIndex: index }),
  setViewport: (vp: Partial<ViewportState>) =>
    set((s) => ({ viewport: { ...s.viewport, ...vp } })),
  setIsFullscreen: (v: boolean) => set({ isFullscreen: v }),
  setShowGrid: (v: boolean) => set({ showGrid: v }),
  setIsDrawing: (v: boolean) => set({ isDrawing: v }),

  resetCanvas: (width: number, height: number) => {
    layerCounter = 0
    const bg = makeLayer('Background', width, height)
    const l1 = makeLayer('Layer 1', width, height)
    set({
      canvasWidth: width,
      canvasHeight: height,
      layers: [bg, l1],
      activeLayerIndex: 1,
      history: [],
      historyIndex: -1,
      viewport: { x: 0, y: 0, zoom: 1 },
    })
  },

  addLayer: (layer: Layer) =>
    set((s) => {
      if (s.layers.length >= 10) return s
      const layers = [...s.layers, layer]
      return { layers, activeLayerIndex: layers.length - 1 }
    }),

  removeLayer: (id: string) =>
    set((s) => {
      if (s.layers.length <= 2) return s
      const idx = s.layers.findIndex((l) => l.id === id)
      if (idx < 0) return s
      const layers = s.layers.filter((l) => l.id !== id)
      let activeLayerIndex = s.activeLayerIndex
      if (activeLayerIndex >= layers.length) activeLayerIndex = layers.length - 1
      if (idx < s.activeLayerIndex) activeLayerIndex--
      return { layers, activeLayerIndex }
    }),

  reorderLayer: (from: number, to: number) =>
    set((s) => {
      const layers = [...s.layers]
      const [moved] = layers.splice(from, 1)
      layers.splice(to, 0, moved)
      let activeLayerIndex = s.activeLayerIndex
      if (from === s.activeLayerIndex) {
        activeLayerIndex = to
      } else {
        if (from < s.activeLayerIndex && to >= s.activeLayerIndex)
          activeLayerIndex--
        if (from > s.activeLayerIndex && to <= s.activeLayerIndex)
          activeLayerIndex++
      }
      return { layers, activeLayerIndex }
    }),

  setLayerVisibility: (id: string, visible: boolean) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, visible } : l)),
    })),

  setLayerOpacity: (id: string, opacity: number) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, opacity } : l)),
    })),

  renameLayer: (id: string, name: string) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, name } : l)),
    })),

  pushHistory: (entry: HistoryEntry) =>
    set((s) => {
      const history = s.history.slice(0, s.historyIndex + 1)
      history.push(entry)
      if (history.length > MAX_HISTORY) history.shift()
      return { history, historyIndex: history.length - 1 }
    }),

  undo: () => {
    const s = get()
    if (s.historyIndex <= 0) return null
    const newIdx = s.historyIndex - 1
    set({ historyIndex: newIdx })
    return s.history[newIdx]
  },

  redo: () => {
    const s = get()
    if (s.historyIndex >= s.history.length - 1) return null
    const newIdx = s.historyIndex + 1
    set({ historyIndex: newIdx })
    return s.history[newIdx]
  },

  clearHistory: () => set({ history: [], historyIndex: -1 }),
}))

export function subscribeSelector<T>(
  selector: (state: AppStore) => T,
  callback: (value: T) => void
): () => void {
  let prev = selector(store.getState())
  return store.subscribe(() => {
    const curr = selector(store.getState())
    if (curr !== prev) {
      prev = curr
      callback(curr)
    }
  })
}
