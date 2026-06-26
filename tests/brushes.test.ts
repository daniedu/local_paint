import { describe, it, expect } from 'vitest'

describe('Brushes', () => {
  it('pen brush creates a line', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')!

    ctx.strokeStyle = '#000000'
    ctx.globalAlpha = 1
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(10, 10)
    ctx.lineTo(90, 90)
    ctx.stroke()

    const data = ctx.getImageData(0, 0, 100, 100).data
    // Some pixels should be drawn
    let nonWhite = 0
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) nonWhite++
    }
    expect(nonWhite).toBeGreaterThan(0)
  })

  it('brush respects strokeStyle color', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 50
    canvas.height = 50
    const ctx = canvas.getContext('2d')!

    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.moveTo(0, 25)
    ctx.lineTo(50, 25)
    ctx.stroke()

    const data = ctx.getImageData(25, 25, 1, 1).data
    expect(data[0]).toBe(255) // Red channel
    expect(data[1]).toBe(0)   // Green
    expect(data[2]).toBe(0)   // Blue
  })

  it('brush respects globalAlpha', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 50
    canvas.height = 50
    const ctx = canvas.getContext('2d')!

    ctx.strokeStyle = '#000000'
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.moveTo(0, 25)
    ctx.lineTo(50, 25)
    ctx.stroke()

    const data = ctx.getImageData(25, 25, 1, 1).data
    expect(data[3]).toBeLessThan(255) // Alpha channel
  })

  it('line width affects stroke thickness', () => {
    const thin = createLineCanvas(2)
    const thick = createLineCanvas(20)

    let thinPixels = countNonTransparent(thin)
    let thickPixels = countNonTransparent(thick)

    expect(thickPixels).toBeGreaterThan(thinPixels)
  })
})

function createLineCanvas(lineWidth: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 100
  canvas.height = 100
  const ctx = canvas.getContext('2d')!
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(50, 10)
  ctx.lineTo(50, 90)
  ctx.stroke()
  return canvas
}

function countNonTransparent(canvas: HTMLCanvasElement): number {
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
  let count = 0
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) count++
  }
  return count
}
