import { expect, test } from '@playwright/test'

test('regenerates the tree from the shape controls', async ({ page }) => {
  await page.goto('/')
  const canvas = page.getByRole('img', { name: /Fractal tree with \d+ branches/ })
  const branches = () => canvas.getAttribute('aria-label')
  await expect(canvas).toHaveAttribute('aria-label', /127 branches/)

  const depth = page.getByRole('slider', { name: 'Max depth' })
  await expect(depth).toHaveValue('6')
  await depth.focus()
  await page.keyboard.press('End')
  await expect(depth).toHaveValue('9')
  // Debounced regeneration keeps the old tree briefly, then applies the new one.
  await expect.poll(branches, { timeout: 10_000 }).toMatch(/1023 branches/)

  await page.getByRole('slider', { name: 'Branching' }).focus()
  await page.keyboard.press('End')
  await expect.poll(branches, { timeout: 15_000 }).toMatch(/349525 branches/)

  await page.getByRole('button', { name: 'Regrow' }).click()
  await expect(page.getByText(/^Seed \d+$/)).toBeVisible()
  await expect(canvas).toHaveAttribute('aria-label', /349525 branches/)
})

test('applies spread and tempo immediately and keeps them readable', async ({ page }) => {
  await page.goto('/')
  const spread = page.getByRole('slider', { name: 'Spread' })
  await spread.focus()
  await page.keyboard.press('Home')
  await expect(spread).toHaveValue('10')
  await expect(spread).toHaveAttribute('aria-valuetext', '10°')

  const tempo = page.getByRole('slider', { name: 'Tempo' })
  await tempo.focus()
  await page.keyboard.press('End')
  await expect(tempo).toHaveAttribute('aria-valuetext', '80 BPM')
  await expect(page.getByText('C major · 80 BPM')).toBeVisible()
})

test('keeps volume when the tree is regenerated', async ({ page }) => {
  await page.goto('/')
  const volume = page.getByRole('slider', { name: 'Volume' })
  await volume.focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowRight')
  await expect(volume).toHaveValue('1')

  await page.getByRole('slider', { name: 'Max depth' }).focus()
  await page.keyboard.press('End')
  await expect(page.getByRole('img', { name: /Fractal tree/ })).toHaveAttribute('aria-label', /1023 branches/)
  await expect(volume).toHaveValue('1')
  await expect(page.getByText('1%')).toBeVisible()
})

test('keeps the controls usable on mobile without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  for (const name of ['Max depth', 'Branching', 'Spread', 'Tempo', 'Volume']) {
    await expect(page.getByRole('slider', { name })).toBeVisible()
  }
  await expect(page.getByRole('button', { name: 'Regrow' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
