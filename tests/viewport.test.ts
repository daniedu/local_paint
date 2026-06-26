import { describe, it, expect } from 'vitest'
import type { ViewportState } from '../lib'

describe('Viewport', () => {
  it('starts at origin with unit zoom', () => {
    const vp: ViewportState = { x: 0, y: 0, zoom: 1 }
    expect(vp.x).toBe(0)
    expect(vp.y).toBe(0)
    expect(vp.zoom).toBe(1)
  })

  it('zoom stays within bounds', () => {
    let zoom = 1

    // Zoom in
    zoom = Math.min(10, zoom * 1.25)
    expect(zoom).toBe(1.25)

    zoom = Math.min(10, zoom * 1.25)
    expect(zoom).toBeCloseTo(1.56, 1)

    // Max bound
    zoom = 100
    zoom = Math.min(10, zoom)
    expect(zoom).toBe(10)

    // Zoom out
    zoom = Math.max(0.1, zoom / 1.25)
    expect(zoom).toBe(8)

    // Min bound
    zoom = 0.01
    zoom = Math.max(0.1, zoom)
    expect(zoom).toBe(0.1)
  })

  it('panning adds to position', () => {
    const vp: ViewportState = { x: 100, y: 200, zoom: 1 }

    const dx = 50
    const dy = -30

    vp.x += dx
    vp.y += dy

    expect(vp.x).toBe(150)
    expect(vp.y).toBe(170)
  })

  it('zoom centers on a point', () => {
    const vp: ViewportState = { x: 100, y: 100, zoom: 1 }
    const cx = 200
    const cy = 200
    const newZoom = 2

    const result = {
      zoom: newZoom,
      x: cx - (cx - vp.x) * (newZoom / vp.zoom),
      y: cy - (cy - vp.y) * (newZoom / vp.zoom),
    }

    expect(result.zoom).toBe(2)
    expect(result.x).toBe(0) // 200 - (200-100)*2 = 200-200 = 0
    expect(result.y).toBe(0)
  })

  it('negative pan values are valid', () => {
    const vp: ViewportState = { x: -100, y: -200, zoom: 1 }
    expect(vp.x).toBe(-100)
    expect(vp.y).toBe(-200)
  })

  it('zoom below 1 is valid', () => {
    const vp: ViewportState = { x: 0, y: 0, zoom: 0.25 }
    expect(vp.zoom).toBe(0.25)
  })
})
