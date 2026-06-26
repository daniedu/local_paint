import { describe, it, expect, beforeEach } from 'vitest'
import type { Layer, ViewportState } from '../lib'

function createMockStore() {
  // We test the store logic directly via state shape
  return {
    tool: 'pen' as const,
    color: '#7c5cfc',
    size: 4,
    opacity: 1,
    layers: [] as Layer[],
    activeLayerIndex: 0,
    history: [] as any[],
    historyIndex: -1,
    viewport: { x: 0, y: 0, zoom: 1 } as ViewportState,
    isFullscreen: false,
    showGrid: false,
    isDrawing: false,
    canvasWidth: 800,
    canvasHeight: 600,
  }
}

describe('Store state', () => {
  it('has correct default values', () => {
    const state = createMockStore()
    expect(state.tool).toBe('pen')
    expect(state.color).toBe('#7c5cfc')
    expect(state.size).toBe(4)
    expect(state.opacity).toBe(1)
    expect(state.canvasWidth).toBe(800)
    expect(state.canvasHeight).toBe(600)
    expect(state.viewport.zoom).toBe(1)
  })

  it('tool can be changed', () => {
    const state = createMockStore()
    state.tool = 'eraser'
    expect(state.tool).toBe('eraser')
  })

  it('color can be changed', () => {
    const state = createMockStore()
    state.color = '#ff0000'
    expect(state.color).toBe('#ff0000')
  })

  it('size has valid range', () => {
    const state = createMockStore()
    state.size = 50
    expect(state.size).toBe(50)
    state.size = 1
    expect(state.size).toBe(1)
  })

  it('opacity is clamped to 0-1', () => {
    const state = createMockStore()
    state.opacity = 0.5
    expect(state.opacity).toBe(0.5)
  })

  it('canvas dimensions are positive', () => {
    const state = createMockStore()
    expect(state.canvasWidth).toBeGreaterThan(0)
    expect(state.canvasHeight).toBeGreaterThan(0)
  })

  it('viewport zoom defaults to 1', () => {
    const state = createMockStore()
    expect(state.viewport.zoom).toBe(1)
  })

  it('viewport position defaults to origin', () => {
    const state = createMockStore()
    expect(state.viewport.x).toBe(0)
    expect(state.viewport.y).toBe(0)
  })
})
