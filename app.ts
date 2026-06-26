import { store } from './store.ts'
import { initCanvas } from './canvas.ts'
import { initUI } from './ui.ts'
import { pushSnapshot } from './history.ts'

async function main() {
  const container = document.getElementById('canvas-container')!
  const rect = container.getBoundingClientRect()

  store.getState().resetCanvas(
    Math.max(400, Math.round(rect.width)),
    Math.max(300, Math.round(rect.height))
  )

  initCanvas()
  initUI()

  // Capture initial state
  pushSnapshot()

  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js')
    } catch {}
  }
}

main()
