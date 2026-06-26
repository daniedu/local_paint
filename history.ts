import type { HistoryEntry } from './lib.ts'
import { store } from './store.ts'
import { MAX_HISTORY } from './lib.ts'

export function captureSnapshot(): HistoryEntry {
  const s = store.getState()
  return {
    layers: s.layers.map((l) => {
      const ctx = l.canvas.getContext('2d')!
      return ctx.getImageData(0, 0, l.canvas.width, l.canvas.height)
    }),
    width: s.canvasWidth,
    height: s.canvasHeight,
  }
}

export function applySnapshot(entry: HistoryEntry) {
  const s = store.getState()
  for (let i = 0; i < entry.layers.length && i < s.layers.length; i++) {
    const ctx = s.layers[i].canvas.getContext('2d')!
    ctx.putImageData(entry.layers[i], 0, 0)
  }
}

export function pushSnapshot() {
  store.getState().pushHistory(captureSnapshot())
}

export function undo() {
  const entry = store.getState().undo()
  if (entry) applySnapshot(entry)
}

export function redo() {
  const entry = store.getState().redo()
  if (entry) applySnapshot(entry)
}
