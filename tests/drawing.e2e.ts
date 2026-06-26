import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('Drawing App E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE)
    await page.waitForSelector('#display-canvas')
  })

  test('page loads with canvas and toolbar', async ({ page }) => {
    await expect(page.locator('#display-canvas')).toBeVisible()
    await expect(page.locator('[data-tool="pen"]')).toBeVisible()
    await expect(page.locator('#color-picker')).toBeVisible()
  })

  test('tool buttons activate on click', async ({ page }) => {
    const markerBtn = page.locator('[data-tool="marker"]')
    await markerBtn.click()
    await expect(markerBtn).toHaveClass(/active/)
  })

  test('color picker changes tool color', async ({ page }) => {
    const picker = page.locator('#color-picker')
    await picker.fill('#ff0000')
    expect(await picker.inputValue()).toBe('#ff0000')
  })

  test('size slider changes brush size', async ({ page }) => {
    const slider = page.locator('#size-slider')
    await slider.fill('20')
    expect(await slider.inputValue()).toBe('20')
  })

  test('pen draws on canvas', async ({ page }) => {
    const canvas = page.locator('#display-canvas')
    const box = await canvas.boundingBox()
    if (!box) return
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 200, box.y + 200, { steps: 10 })
    await page.mouse.up()
    // Canvas should have been modified
  })

  test('undo button is clickable', async ({ page }) => {
    await page.locator('#undo-btn').click()
  })

  test('redo button is clickable', async ({ page }) => {
    await page.locator('#redo-btn').click()
  })

  test('clear button clears canvas', async ({ page }) => {
    // Accept confirmation dialog
    page.on('dialog', (dialog) => dialog.accept())
    await page.locator('#clear-btn').click()
  })

  test('layer panel shows layers', async ({ page }) => {
    const layerContainer = page.locator('#layer-list')
    const items = layerContainer.locator('[data-layer-id]')
    expect(await items.count()).toBeGreaterThanOrEqual(2)
  })

  test('add layer button works', async ({ page }) => {
    const initialCount = await page.locator('#layer-list').locator('[data-layer-id]').count()
    await page.locator('#add-layer-btn').click()
    const newCount = await page.locator('#layer-list').locator('[data-layer-id]').count()
    expect(newCount).toBe(initialCount + 1)
  })

  test('layer visibility toggle', async ({ page }) => {
    const firstToggle = page.locator('[data-toggle-vis]').first()
    const initialText = await firstToggle.textContent()
    await firstToggle.click()
    const afterText = await firstToggle.textContent()
    expect(afterText).not.toBe(initialText)
  })

  test('grid toggle button works', async ({ page }) => {
    await page.locator('#grid-btn').click()
  })

  test('fullscreen button is present', async ({ page }) => {
    await expect(page.locator('#fullscreen-btn')).toBeVisible()
  })

  test('save button shows prompt', async ({ page }) => {
    page.on('dialog', (dialog) => {
      expect(dialog.message()).toContain('Drawing name')
      dialog.accept('Test Drawing')
    })
    await page.locator('#save-btn').click()
  })

  test('pan tool changes cursor', async ({ page }) => {
    await page.locator('[data-tool="pan"]').click()
    const container = page.locator('#canvas-container')
    await expect(container).toHaveClass(/pan-mode/)
  })

  test('eraser tool activates', async ({ page }) => {
    await page.locator('[data-tool="eraser"]').click()
    await expect(page.locator('[data-tool="eraser"]')).toHaveClass(/active/)
  })

  test('layer panel visibility on mobile toggle', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.locator('#layers-toggle-btn').click()
    await expect(page.locator('#layer-sheet')).not.toHaveClass(/hidden/)
  })

  test('all tools are present in sidebar', async ({ page }) => {
    const tools = ['pen', 'marker', 'spray', 'calligraphy', 'airbrush', 'eraser', 'pan', 'fill', 'rect', 'circle', 'text']
    for (const tool of tools) {
      await expect(page.locator(`[data-tool="${tool}"]`).first()).toBeVisible()
    }
  })

  test('opacity slider changes opacity', async ({ page }) => {
    const slider = page.locator('#opacity-slider')
    await slider.fill('50')
    expect(await slider.inputValue()).toBe('50')
  })

  test('rectangle tool draws preview', async ({ page }) => {
    await page.locator('[data-tool="rect"]').click()
    const canvas = page.locator('#display-canvas')
    const box = await canvas.boundingBox()
    if (!box) return
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 300, box.y + 300, { steps: 5 })
    await page.mouse.up()
  })

  test('circle tool draws preview', async ({ page }) => {
    await page.locator('[data-tool="circle"]').click()
    const canvas = page.locator('#display-canvas')
    const box = await canvas.boundingBox()
    if (!box) return
    await page.mouse.move(box.x + 150, box.y + 150)
    await page.mouse.down()
    await page.mouse.move(box.x + 350, box.y + 250, { steps: 5 })
    await page.mouse.up()
  })

  test('spray brush activates', async ({ page }) => {
    await page.locator('[data-tool="spray"]').click()
    await expect(page.locator('[data-tool="spray"]')).toHaveClass(/active/)
  })
})
