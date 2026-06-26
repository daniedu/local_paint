import { get, set, keys, del } from 'https://esm.sh/idb-keyval@6'
import type { DrawingFile } from './lib.ts'
import { store } from './store.ts'

const GALLERY_KEY = 'drawing-gallery'

export async function saveCurrentDrawing(name: string): Promise<string> {
  const s = store.getState()
  const id = `drawing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  const layerBlobs = await Promise.all(
    s.layers.map(async (l) => {
      const blob = await new Promise<Blob>((resolve) =>
        l.canvas.toBlob((b) => resolve(b!), 'image/png')
      )
      return { name: l.name, data: blob }
    })
  )

  const canvas = document.createElement('canvas')
  canvas.width = s.canvasWidth
  canvas.height = s.canvasHeight
  const ctx = canvas.getContext('2d')!
  const compositeCtx = canvas.getContext('2d')!
  for (const layer of s.layers) {
    if (layer.visible) {
      compositeCtx.globalAlpha = layer.opacity
      compositeCtx.drawImage(layer.canvas, 0, 0)
    }
  }
  const thumbnail = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.6)
  )

  const drawing: DrawingFile = {
    id,
    name,
    thumbnail,
    layers: layerBlobs,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await set(id, drawing)
  const gallery = await get<DrawingFile[]>(GALLERY_KEY) ?? []
  gallery.push(drawing)
  await set(GALLERY_KEY, gallery)
  return id
}

export async function loadDrawing(id: string): Promise<DrawingFile | null> {
  return (await get<DrawingFile>(id)) ?? null
}

export async function listDrawings(): Promise<DrawingFile[]> {
  return (await get<DrawingFile[]>(GALLERY_KEY)) ?? []
}

export async function deleteDrawing(id: string): Promise<void> {
  await del(id)
  const gallery = await listDrawings()
  await set(GALLERY_KEY, gallery.filter((d) => d.id !== id))
}

export async function openDrawingFromFile(file: File): Promise<DrawingFile | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const drawing = JSON.parse(reader.result as string) as DrawingFile
        resolve(drawing)
      } catch {
        reject(new Error('Invalid file'))
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
