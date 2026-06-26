import { describe, it, expect } from 'vitest'
import type { DrawingFile } from '../lib'

function makeDrawingFile(overrides = {}): DrawingFile {
  return {
    id: 'test-1',
    name: 'Test Drawing',
    thumbnail: new Blob([''], { type: 'image/png' }),
    layers: [{ name: 'Layer 1', data: new Blob([''], { type: 'image/png' }) }],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('Storage', () => {
  it('drawing file has required fields', () => {
    const file = makeDrawingFile()
    expect(file.id).toBeDefined()
    expect(file.name).toBeDefined()
    expect(file.thumbnail).toBeDefined()
    expect(file.layers).toBeDefined()
    expect(file.createdAt).toBeDefined()
    expect(file.updatedAt).toBeDefined()
  })

  it('drawing file has at least 1 layer', () => {
    const file = makeDrawingFile()
    expect(file.layers.length).toBeGreaterThan(0)
  })

  it('thumbnail is a Blob', () => {
    const file = makeDrawingFile()
    expect(file.thumbnail).toBeInstanceOf(Blob)
  })

  it('layer data is a Blob', () => {
    const file = makeDrawingFile()
    for (const layer of file.layers) {
      expect(layer.data).toBeInstanceOf(Blob)
    }
  })

  it('drawing name is a string', () => {
    const file = makeDrawingFile()
    expect(typeof file.name).toBe('string')
    expect(file.name.length).toBeGreaterThan(0)
  })

  it('layer name is a string', () => {
    const file = makeDrawingFile()
    for (const layer of file.layers) {
      expect(typeof layer.name).toBe('string')
    }
  })

  it('dates are ISO format', () => {
    const file = makeDrawingFile()
    expect(new Date(file.createdAt).toISOString()).toBe(file.createdAt)
    expect(new Date(file.updatedAt).toISOString()).toBe(file.updatedAt)
  })

  it('can have multiple layers', () => {
    const file = makeDrawingFile({
      layers: [
        { name: 'Layer 1', data: new Blob(['a']) },
        { name: 'Layer 2', data: new Blob(['b']) },
        { name: 'Layer 3', data: new Blob(['c']) },
      ],
    })
    expect(file.layers.length).toBe(3)
  })

  it('thumbnail is JPEG or PNG', () => {
    const file = makeDrawingFile({
      thumbnail: new Blob([''], { type: 'image/jpeg' }),
    })
    expect(file.thumbnail.type).toMatch(/^image\/(png|jpeg)$/)
  })
})
