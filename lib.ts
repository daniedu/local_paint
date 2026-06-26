export interface Point {
  x: number
  y: number
  pressure?: number
}

export interface ViewportState {
  x: number
  y: number
  zoom: number
}

export interface Layer {
  id: string
  name: string
  visible: boolean
  opacity: number
  canvas: HTMLCanvasElement
}

export interface HistoryEntry {
  layers: ImageData[]
  width: number
  height: number
}

export type ToolType =
  | 'pen'
  | 'marker'
  | 'spray'
  | 'calligraphy'
  | 'airbrush'
  | 'eraser'
  | 'rect'
  | 'circle'
  | 'fill'
  | 'text'
  | 'pan'

export interface DrawingFile {
  id: string
  name: string
  thumbnail: Blob
  layers: { name: string; data: Blob }[]
  createdAt: string
  updatedAt: string
}

export interface AppState {
  tool: ToolType
  color: string
  size: number
  opacity: number
  layers: Layer[]
  activeLayerIndex: number
  history: HistoryEntry[]
  historyIndex: number
  viewport: ViewportState
  isFullscreen: boolean
  showGrid: boolean
  isDrawing: boolean
  canvasWidth: number
  canvasHeight: number
}

export interface AppActions {
  setTool: (tool: ToolType) => void
  setColor: (color: string) => void
  setSize: (size: number) => void
  setOpacity: (opacity: number) => void
  setActiveLayerIndex: (index: number) => void
  setViewport: (vp: Partial<ViewportState>) => void
  setIsFullscreen: (v: boolean) => void
  setShowGrid: (v: boolean) => void
  setIsDrawing: (v: boolean) => void
  resetCanvas: (width: number, height: number) => void
  addLayer: (layer: Layer) => void
  removeLayer: (id: string) => void
  reorderLayer: (from: number, to: number) => void
  setLayerVisibility: (id: string, visible: boolean) => void
  setLayerOpacity: (id: string, opacity: number) => void
  renameLayer: (id: string, name: string) => void
  pushHistory: (entry: HistoryEntry) => void
  undo: () => HistoryEntry | null
  redo: () => HistoryEntry | null
  clearHistory: () => void
}

export type AppStore = AppState & AppActions

export const CANVAS_DEFAULT_WIDTH = 800
export const CANVAS_DEFAULT_HEIGHT = 600
export const MAX_HISTORY = 50
export const MAX_LAYERS = 10
