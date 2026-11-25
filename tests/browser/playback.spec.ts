import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    testAudioContexts: AudioContext[]
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext
    window.testAudioContexts = []
    window.AudioContext = class extends NativeAudioContext {
      constructor(options?: AudioContextOptions) {
        super(options)
        window.testAudioContexts.push(this)
      }
    }
  })
})

test('plays only on request, pauses the audio clock, resumes, stops, and restarts', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  const progress = page.getByRole('progressbar', { name: 'Playback progress' })
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeDisabled()
  await expect(progress).toHaveAttribute('value', '0')
  // Tone's module creates a silent default context; the player owns a separate
  // context and must not create one until the user requests playback.
  const initialContexts = await page.evaluate(() => window.testAudioContexts.length)
  await page.waitForTimeout(150)
  expect(await page.evaluate(() => window.testAudioContexts.length)).toBe(initialContexts)
  await expect(progress).toHaveAttribute('value', '0')

  await page.getByRole('button', { name: 'Play', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled()
  await expect.poll(async () => Number(await progress.getAttribute('value'))).toBeGreaterThan(0.4)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeEnabled()
  const pausedAt = Number(await progress.getAttribute('value'))
  const contextIndex = await page.evaluate(() => window.testAudioContexts.length - 1)
  expect(await page.evaluate((index) => window.testAudioContexts[index].state, contextIndex)).toBe('suspended')
  await page.waitForTimeout(300)
  expect(Number(await progress.getAttribute('value'))).toBe(pausedAt)
  const volume = page.getByRole('slider', { name: 'Volume' })
  await volume.focus()
  await page.keyboard.press('Home')
  await expect(volume).toHaveValue('0')
  await expect(volume).toHaveAttribute('aria-valuetext', '0 percent')
  await page.keyboard.press('ArrowRight')
  await expect(volume).toHaveValue('1')
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await expect.poll(async () => Number(await progress.getAttribute('value'))).toBeGreaterThan(pausedAt + 0.2)
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(progress).toHaveAttribute('value', '0')
  await expect.poll(() => page.evaluate((index) => window.testAudioContexts[index].state, contextIndex)).toBe('closed')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled()
  expect(await page.evaluate((baseline) => window.testAudioContexts.slice(baseline).filter((context) => context.state === 'running').length, initialContexts)).toBe(1)
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await page.screenshot({ path: testInfo.outputPath('desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('mobile.png') })
  expect(errors).toEqual([])
})

test('shows an audio error and lets the user retry', async ({ page }) => {
  await page.goto('/')
  const initialContexts = await page.evaluate(() => window.testAudioContexts.length)
  await page.evaluate(() => {
    const resume = AudioContext.prototype.resume
    AudioContext.prototype.resume = function () {
      AudioContext.prototype.resume = resume
      return Promise.reject(new Error('Simulated browser audio denial'))
    }
  })
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Audio could not start')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect.poll(() => page.evaluate((baseline) => window.testAudioContexts.slice(baseline).filter((context) => context.state === 'running').length, initialContexts)).toBe(0)
})

test('handles cancellation during startup, natural completion, replay, and disposal', async ({ page }) => {
  await page.goto('/')
  const initialContexts = await page.evaluate(() => window.testAudioContexts.length)
  const result = await page.evaluate(async () => {
    const path = '/tests/browser/audioHarness.ts'
    const { exerciseLifecycle } = await import(path)
    return exerciseLifecycle()
  })
  expect(result.stoppedDuringLoading.status).toBe('idle')
  expect(result.stoppedDuringLoading.positionSeconds).toBe(0)
  expect(result.ended.status).toBe('ended')
  expect(result.ended.positionSeconds).toBe(1.5)
  expect(result.replaying).toBe('playing')
  expect(result.disposed).toBe('idle')
  expect(await page.evaluate((baseline) => window.testAudioContexts.slice(baseline).filter((context) => context.state === 'running').length, initialContexts)).toBe(0)
})

test('renders audible, finite stereo audio and a silent ending through the real audio graph', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const path = '/tests/browser/audioHarness.ts'
    const { renderAudioCheck } = await import(path)
    return renderAudioCheck()
  })
  expect(result.all.finite).toBe(true)
  expect(result.all.peak).toBeLessThan(0.75)
  expect(result.all.stereoRms).toBeGreaterThan(0.00001)
  for (const section of [result.pad, result.rhodes, result.chime, result.tail]) {
    expect(section.rms).toBeGreaterThan(0.0001)
  }
  expect(result.ending.rms).toBeLessThan(result.tail.rms * 0.1)
  expect(result.after.peak).toBe(0)
})
