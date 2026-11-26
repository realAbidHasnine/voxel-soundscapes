import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

test('downloads a valid, audible WAV of the current soundscape', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')

  const downloadPromise = page.waitForEvent('download', { timeout: 120_000 })
  await page.getByRole('button', { name: 'Download' }).click()
  await expect(page.getByRole('button', { name: 'Rendering…' })).toBeDisabled()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('recursive-soundscape-seed-1.wav')
  const path = await download.path()
  expect(path).toBeTruthy()
  const wav = readFileSync(path!)
  expect(wav.byteLength).toBeGreaterThan(1_000_000)

  // Validate the header rather than trusting the browser's copy.
  expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
  expect(wav.toString('ascii', 8, 12)).toBe('WAVE')
  expect(wav.toString('ascii', 36, 40)).toBe('data')
  expect(wav.readUInt16LE(22)).toBe(2) // stereo
  expect(wav.readUInt32LE(24)).toBe(44_100)
  expect(wav.readUInt16LE(34)).toBe(16) // bit depth
  expect(wav.readUInt32LE(40)).toBe(wav.byteLength - 44)

  // The render must contain real signal and not just silence.
  let peak = 0
  let energy = 0
  const samples = (wav.byteLength - 44) / 2
  for (let index = 0; index < samples; index++) {
    const value = wav.readInt16LE(44 + index * 2) / 32768
    peak = Math.max(peak, Math.abs(value))
    energy += value * value
  }
  expect(peak).toBeGreaterThan(0.05)
  expect(peak).toBeLessThan(0.99) // the limiter should keep it from clipping
  expect(Math.sqrt(energy / samples)).toBeGreaterThan(0.001)

  await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled()
  expect(errors).toEqual([])
})

test('names the file after the current seed', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Seed 1')).toBeVisible()

  await page.getByRole('button', { name: 'Regrow' }).click()
  const seedLabel = page.getByText(/^Seed \d+$/)
  await expect.poll(async () => seedLabel.textContent(), { timeout: 10_000 }).not.toBe('Seed 1')
  const seed = Number((await seedLabel.textContent())!.replace('Seed ', ''))
  expect(seed).toBeGreaterThan(0)

  const downloadPromise = page.waitForEvent('download', { timeout: 120_000 })
  await page.getByRole('button', { name: 'Download' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(`recursive-soundscape-seed-${seed}.wav`)
})
