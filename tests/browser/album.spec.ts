import { expect, test } from '@playwright/test'

test('shows the frequency graph and the function trace under the tree', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: 'Live frequency graph of the music.' })).toBeVisible()
  await expect(page.getByText('grow()')).toBeVisible()
  await expect(page.getByText(/yield\* grow/)).toBeVisible()
  // Nothing is executing until sound starts.
  await expect(page.locator('[aria-current="step"]')).toHaveCount(0)
})

test('lights the working lines of the function while the soundscape plays', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled()

  // The generated soundscape walks the recursion, so lines light up by depth.
  await expect(page.locator('[aria-current="step"]').first()).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(page.locator('[aria-current="step"]')).toHaveCount(0)
})

test('shows the album source only when tracks exist', async ({ page }) => {
  await page.goto('/')
  const albumButton = page.getByRole('button', { name: 'Album', exact: true })
  const sourceGroup = page.getByRole('group', { name: 'Audio source' })

  // beta-album/ is gitignored, so a fresh clone has no tracks. Both states must work.
  if (await albumButton.count() === 0) {
    await expect(sourceGroup).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Generated', exact: true })).toHaveCount(0)
    return
  }
  await expect(sourceGroup).toBeVisible()
  await albumButton.click()
  await expect(page.locator('ul li').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generated', exact: true })).toHaveAttribute('aria-pressed', 'false')
})

test('keeps the new panels inside the viewport on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('img', { name: /Fractal tree/ })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Live frequency graph of the music.' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
