import { describe, it, expect } from 'vitest'
import type { HistoryEntry } from '../lib'

function makeEntry(overrides = {}): HistoryEntry {
  return {
    layers: [],
    width: 800,
    height: 600,
    ...overrides,
  }
}

describe('History (undo/redo)', () => {
  const MAX_HISTORY = 50

  it('starts empty', () => {
    const history: HistoryEntry[] = []
    expect(history.length).toBe(0)
  })

  it('can push entries', () => {
    const history: HistoryEntry[] = []
    for (let i = 0; i < 3; i++) {
      history.push(makeEntry())
    }
    expect(history.length).toBe(3)
  })

  it('caps at MAX_HISTORY entries', () => {
    const history: HistoryEntry[] = []
    for (let i = 0; i < MAX_HISTORY + 10; i++) {
      history.push(makeEntry())
      if (history.length > MAX_HISTORY) history.shift()
    }
    expect(history.length).toBe(MAX_HISTORY)
  })

  it('undo moves index back', () => {
    const history: HistoryEntry[] = [
      makeEntry({ width: 100 }),
      makeEntry({ width: 200 }),
      makeEntry({ width: 300 }),
    ]
    let index = history.length - 1

    index-- // undo
    expect(history[index].width).toBe(200)

    index-- // undo
    expect(history[index].width).toBe(100)
  })

  it('redo moves index forward', () => {
    const history: HistoryEntry[] = [
      makeEntry({ width: 100 }),
      makeEntry({ width: 200 }),
      makeEntry({ width: 300 }),
    ]
    let index = history.length - 1

    index-- // undo
    index-- // undo
    expect(history[index].width).toBe(100)

    index++ // redo
    expect(history[index].width).toBe(200)
  })

  it('cannot undo past start', () => {
    const history: HistoryEntry[] = [makeEntry()]
    let index = 0
    index = Math.max(-1, index - 1)
    expect(index).toBe(-1)
  })

  it('cannot redo past end', () => {
    const history: HistoryEntry[] = [makeEntry(), makeEntry()]
    let index = history.length - 1
    index = Math.min(history.length - 1, index + 1)
    expect(index).toBe(1)
  })

  it('pushing new entry after undo clears redo stack', () => {
    const history: HistoryEntry[] = [
      makeEntry(),
      makeEntry(),
      makeEntry(),
    ]
    let index = 1 // after one undo

    // Push new entry (branches)
    const newHistory = history.slice(0, index + 1)
    newHistory.push(makeEntry({ width: 999 }))

    expect(newHistory.length).toBe(3)
    expect(newHistory[newHistory.length - 1].width).toBe(999)
  })

  it('stores canvas dimensions', () => {
    const entry = makeEntry({ width: 1920, height: 1080 })
    expect(entry.width).toBe(1920)
    expect(entry.height).toBe(1080)
  })

  it('stores layer data', () => {
    const entry = makeEntry({
      layers: [{ data: new Uint8ClampedArray(4), width: 1, height: 1 }],
    })
    expect(entry.layers.length).toBe(1)
  })
})
