import { expect, test } from '@playwright/test'

test('switches presets, updating the sound label, tree, and palette', async ({ page }) => {
  await page.goto('/')
  const canvas = page.getByRole('img', { name: /Fractal tree with \d+ branches/ })
  const forest = page.getByRole('button', { name: 'Forest Canopy' })
  const midnight = page.getByRole('button', { name: 'Midnight Rain' })
  const blossom = page.getByRole('button', { name: 'Cherry Blossom' })

  const accentOf = () => page.evaluate(() => {
    const label = Array.from(document.querySelectorAll('p'))
      .find((node) => node.textContent?.trim() === 'Recursive Soundscapes')
    return label ? getComputedStyle(label).color : ''
  })

  await expect(forest).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('C major · 70 BPM')).toBeVisible()
  await expect(canvas).toHaveAttribute('aria-label', /127 branches/)
  const forestAccent = await accentOf()
  expect(forestAccent).toBe('rgb(167, 243, 208)')

  await midnight.click()
  await expect(midnight).toHaveAttribute('aria-pressed', 'true')
  await expect(forest).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('A minor · 60 BPM')).toBeVisible()
  // Midnight is depth 7 branching 2.
  await expect(canvas).toHaveAttribute('aria-label', /255 branches/)
  await expect(page.getByRole('slider', { name: 'Max depth' })).toHaveValue('7')
  await expect(page.getByRole('slider', { name: 'Tempo' })).toHaveAttribute('aria-valuetext', '60 BPM')
  const midnightAccent = await accentOf()
  expect(midnightAccent).not.toBe(forestAccent)
  expect(midnightAccent).toBe('rgb(165, 200, 240)')

  await blossom.click()
  await expect(page.getByText('D major · 66 BPM')).toBeVisible()
  // Blossom is depth 6 branching 3.
  await expect(canvas).toHaveAttribute('aria-label', /1093 branches/)
})

test('zen mode hides the interface and restores it', async ({ page }) => {
  await page.goto('/')
  const panel = page.getByRole('region', { name: 'A little room to slow down.' })
  await expect(panel).toBeVisible()

  await page.getByRole('button', { name: 'Zen', exact: true }).click()
  await expect(panel).toBeHidden()
  await expect(page.getByRole('button', { name: 'Zen', exact: true })).toBeHidden()
  // The tree stays, now filling the screen.
  const canvas = page.getByRole('img', { name: /Fractal tree/ })
  await expect(canvas).toBeVisible()
  const box = await canvas.boundingBox()
  expect(box!.height).toBeGreaterThan(600)

  await page.getByRole('button', { name: 'Leave zen mode' }).click()
  await expect(panel).toBeVisible()

  // Escape also leaves zen mode.
  await page.getByRole('button', { name: 'Zen', exact: true }).click()
  await expect(panel).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(panel).toBeVisible()
})

test('keeps presets and zen mode usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Cherry Blossom' }).click()
  await expect(page.getByText('D major · 66 BPM')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

  await page.getByRole('button', { name: 'Zen', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Leave zen mode' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
