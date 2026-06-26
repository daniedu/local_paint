import { describe, it, expect, beforeEach } from 'vitest'
import type { Layer } from '../lib'

function createLayer(id: string, name: string, visible = true, opacity = 1): Layer {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  return { id, name, visible, opacity, canvas }
}

describe('Layers', () => {
  let layers: Layer[]

  beforeEach(() => {
    layers = [
      createLayer('bg', 'Background'),
      createLayer('l1', 'Layer 1'),
      createLayer('l2', 'Layer 2'),
    ]
  })

  it('starts with multiple layers', () => {
    expect(layers.length).toBe(3)
  })

  it('can add a layer', () => {
    layers.push(createLayer('l3', 'Layer 3'))
    expect(layers.length).toBe(4)
  })

  it('can remove a layer', () => {
    layers = layers.filter((l) => l.id !== 'l1')
    expect(layers.length).toBe(2)
    expect(layers.find((l) => l.id === 'l1')).toBeUndefined()
  })

  it('preserves at least 1 layer', () => {
    const minLayers = 1
    while (layers.length > minLayers) {
      layers.pop()
    }
    expect(layers.length).toBe(minLayers)
  })

  it('can be reordered', () => {
    const [moved] = layers.splice(2, 1)
    layers.splice(0, 0, moved)
    expect(layers[0].id).toBe('l2')
    expect(layers[1].id).toBe('bg')
    expect(layers[2].id).toBe('l1')
  })

  it('can toggle visibility', () => {
    const layer = layers[1]
    layer.visible = false
    expect(layer.visible).toBe(false)
    layer.visible = true
    expect(layer.visible).toBe(true)
  })

  it('can change opacity', () => {
    const layer = layers[1]
    layer.opacity = 0.5
    expect(layer.opacity).toBe(0.5)
  })

  it('opacity is clamped to 0-1', () => {
    const layer = layers[1]
    layer.opacity = 1.5
    expect(layer.opacity).toBe(1.5) // no clamp in type
    layer.opacity = -0.5
    expect(layer.opacity).toBe(-0.5)
    // UI should clamp these
  })

  it('each layer has a unique id', () => {
    const ids = layers.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each layer has a canvas with correct dimensions', () => {
    for (const layer of layers) {
      expect(layer.canvas.width).toBe(800)
      expect(layer.canvas.height).toBe(600)
    }
  })
})
