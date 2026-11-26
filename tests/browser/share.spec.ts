import { expect, test } from '@playwright/test'

const MIDNIGHT_LINK = '/?p=midnight&s=7&d=7&b=2&a=22&t=60&r=9&m=m'

test('opens a shared link into the exact soundscape', async ({ page }) => {
  await page.goto(MIDNIGHT_LINK)
  await expect(page.getByRole('button', { name: 'Midnight Rain' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('A minor · 60 BPM')).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Max depth' })).toHaveValue('7')
  await expect(page.getByRole('slider', { name: 'Spread' })).toHaveAttribute('aria-valuetext', '22°')
  await expect(page.getByRole('slider', { name: 'Branching' })).toHaveValue('2')
  await expect(page.getByRole('img', { name: /Fractal tree/ })).toHaveAttribute('aria-label', /255 branches/)
})

test('writes the current soundscape into the URL as it changes', async ({ page }) => {
  await page.goto('/')
  // The address bar reflects the initial state without a reload.
  await expect.poll(() => new URL(page.url()).searchParams.get('d')).toBe('6')
  expect(new URL(page.url()).searchParams.get('p')).toBe('forest')
  expect(new URL(page.url()).searchParams.get('m')).toBe('M')

  await page.getByRole('slider', { name: 'Max depth' }).focus()
  await page.keyboard.press('End')
  await expect.poll(() => new URL(page.url()).searchParams.get('d')).toBe('9')

  await page.getByRole('button', { name: 'Cherry Blossom' }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('p')).toBe('blossom')
  expect(new URL(page.url()).searchParams.get('r')).toBe('2')
})

test('a reload of the copied URL restores the same settings', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Cherry Blossom' }).click()
  await expect(page.getByText('D major · 66 BPM')).toBeVisible()

  await page.getByRole('slider', { name: 'Tempo' }).focus()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('slider', { name: 'Tempo' })).toHaveAttribute('aria-valuetext', '65 BPM')
  await expect.poll(() => new URL(page.url()).searchParams.get('t')).toBe('65')

  const shared = page.url()
  await page.goto(shared)
  await expect(page.getByText('D major · 65 BPM')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cherry Blossom' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('slider', { name: 'Branching' })).toHaveValue('3')
})

test('survives a hostile or truncated link', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const link of [
    '/?p=evil&s=-1&d=999&b=abc&a=&t=Infinity&r=99&m=zzz',
    '/?s=1',
    '/?p=midnight',
    '/?d=0&b=0',
  ]) {
    await page.goto(link)
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
    await expect(page.getByRole('img', { name: /Fractal tree/ })).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('counts the level as playback advances', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/^C major · 70 BPM$/)).toBeVisible()
  await expect(page.getByText(/Depth \d/)).toHaveCount(0)

  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByText(/Depth 0 of 6/)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(page.getByText(/Depth \d/)).toHaveCount(0)
})

test('offers a keyboard skip link and reachable controls', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to controls' })
  await expect(skip).toBeFocused()
  await skip.press('Enter')
  await expect(page.locator('#main')).toBeVisible()

  // Every control is reachable and labelled; no generic unlabelled inputs.
  for (const name of ['Play', 'Stop', 'Download', 'Zen', 'Share', 'Regrow', 'Volume']) {
    await expect(page.getByRole('button', { name, exact: true }).or(page.getByRole('slider', { name })).or(page.getByRole('slider', { name }))).toHaveCount(1)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
