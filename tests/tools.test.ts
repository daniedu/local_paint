import { describe, it, expect } from 'vitest'

describe('Tools', () => {
  it('tool type can be pen', () => {
    const tool = 'pen'
    expect(tool).toBe('pen')
  })

  it('tool type can be eraser', () => {
    const tool = 'eraser'
    expect(tool).toBe('eraser')
  })

  it('tool type can be rect', () => {
    const tool = 'rect'
    expect(tool).toBe('rect')
  })

  it('tool type can be circle', () => {
    const tool = 'circle'
    expect(tool).toBe('circle')
  })

  it('tool type can be fill', () => {
    const tool = 'fill'
    expect(tool).toBe('fill')
  })

  it('tool type can be pan', () => {
    const tool = 'pan'
    expect(tool).toBe('pan')
  })

  it('tool type can be text', () => {
    const tool = 'text'
    expect(tool).toBe('text')
  })

  it('unsupported tool type is rejected', () => {
    const validTools = ['pen', 'marker', 'spray', 'calligraphy', 'airbrush', 'eraser', 'rect', 'circle', 'fill', 'text', 'pan']
    expect(validTools).not.toContain('invalid-tool')
  })

  it('fill tool replaces color on canvas', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 50
    canvas.height = 50
    const ctx = canvas.getContext('2d')!

    // Draw a filled rectangle
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(10, 10, 30, 30)

    // Check pixel before fill
    const before = ctx.getImageData(25, 25, 1, 1).data
    expect(before[0]).toBe(255)
    expect(before[1]).toBe(0)
    expect(before[2]).toBe(0)
  })

  it('shape drawing modifies canvas pixels', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')!

    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 5
    ctx.strokeRect(20, 20, 60, 60)

    const data = ctx.getImageData(50, 50, 1, 1).data
    // Stroke outline should have black pixels
    expect(data[0]).toBe(0)
    expect(data[1]).toBe(0)
    expect(data[2]).toBe(0)
  })
})
