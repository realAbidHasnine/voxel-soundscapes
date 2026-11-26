import { expect, test } from '@playwright/test'

test('renders a synced tree canvas and blooms it during playback', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')

  const canvas = page.getByRole('img', { name: /Fractal tree with \d+ branches/ })
  await expect(canvas).toBeVisible()

  // A silhouette should already be painted before the user presses Play.
  const paintedBeforePlay = async () => canvas.evaluate((node: HTMLCanvasElement) => {
    const ctx = node.getContext('2d')!
    const { data } = ctx.getImageData(0, 0, node.width, node.height)
    let opaque = 0
    for (let index = 3; index < data.length; index += 4) if (data[index] > 0) opaque++
    return opaque
  })
  expect(await paintedBeforePlay()).toBeGreaterThan(0)
  const before = await canvas.screenshot()

  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled()
  const progress = page.getByRole('progressbar', { name: 'Playback progress' })
  await expect.poll(async () => Number(await progress.getAttribute('value')), { timeout: 15_000 })
    .toBeGreaterThan(1.5)

  // More branches are drawn once levels bloom, so the canvas must change.
  const after = await canvas.screenshot()
  expect(Buffer.compare(before, after)).not.toBe(0)
  expect(await paintedBeforePlay()).toBeGreaterThan(0)
  await page.screenshot({ path: testInfo.outputPath('canvas-playing.png') })

  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(progress).toHaveAttribute('value', '0')
  await page.screenshot({ path: testInfo.outputPath('canvas.png') })
  expect(errors).toEqual([])
})

test('keeps the canvas inside the viewport on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const canvas = page.getByRole('img', { name: /Fractal tree/ })
  await expect(canvas).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const box = await canvas.boundingBox()
  expect(box?.width).toBeGreaterThan(0)
  expect(box?.height).toBeGreaterThan(0)
})
