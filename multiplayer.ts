import type { Point } from './lib.ts'

interface StrokeMessage {
  type: 'stroke'
  layer: number
  tool: string
  points: Point[]
  color: string
  size: number
  opacity: number
}

interface UndoRedoMessage {
  type: 'undo' | 'redo'
}

interface ClearLayerMessage {
  type: 'clear-layer'
  layer: number
}

interface StateSyncMessage {
  type: 'state-sync'
  layers: ImageData[]
  width: number
  height: number
}

export type ServerMessage =
  | StrokeMessage
  | UndoRedoMessage
  | ClearLayerMessage
  | StateSyncMessage

type MessageHandler = (msg: ServerMessage) => void

export function createMultiplayerClient(roomId: string) {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  const host = location.host
  const url = `${protocol}://${host}/ws/${roomId}`

  let ws: WebSocket | null = null
  let handlers: MessageHandler[] = []
  let connected = false

  function connect() {
    ws = new WebSocket(url)
    ws.onopen = () => {
      connected = true
      console.log('[multiplayer] connected to room', roomId)
    }
    ws.onmessage = (e) => {
      try {
        const msg: ServerMessage = JSON.parse(e.data)
        handlers.forEach((h) => h(msg))
      } catch {}
    }
    ws.onclose = () => {
      connected = false
      ws = null
    }
    ws.onerror = () => {}
  }

  function disconnect() {
    if (ws) {
      ws.close()
      ws = null
    }
    connected = false
  }

  function send(msg: ServerMessage) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }

  function onMessage(handler: MessageHandler) {
    handlers.push(handler)
    return () => {
      handlers = handlers.filter((h) => h !== handler)
    }
  }

  return { connect, disconnect, send, onMessage, get connected() { return connected } }
}
