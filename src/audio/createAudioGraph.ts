import * as Tone from 'tone'
import type { MusicalScore, NoteEvent } from '../music/generateScore'

const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

/** Each session owns its graph. No nodes connect to Tone's global context. */
export function createAudioGraph(context: Tone.BaseContext, volume: number) {
  const resources = new Set<{ dispose(): unknown }>()
  const cleanupTimers = new Set<number>()
  function own<T extends { dispose(): unknown }>(node: T): T {
    resources.add(node)
    return node
  }

  const output = own(new Tone.Gain({ context, gain: volume })).connect(context.destination)
  const gate = own(new Tone.Gain({ context, gain: 0 })).connect(output)
  const fade = own(new Tone.Gain({ context, gain: 1 })).connect(gate)
  const limiter = own(new Tone.Limiter({ context, threshold: -3 })).connect(fade)
  const dry = own(new Tone.Gain({ context, gain: 0.55 })).connect(limiter)
  const wet = own(new Tone.Gain({ context, gain: 0.45 })).connect(limiter)
  const reverb = own(new Tone.Reverb({ context, decay: 8, wet: 1 })).connect(wet)
  const delay = own(new Tone.PingPongDelay({
    context, delayTime: '8n.', feedback: 0.3, wet: 0.2,
  })).connect(dry).connect(reverb)
  const filter = own(new Tone.Filter({ context, frequency: 5000, type: 'lowpass' })).connect(delay)
  const sendFilter = own(new Tone.Filter({ context, frequency: 5000, type: 'lowpass' })).connect(reverb)
  const harmony = own(new Tone.PolySynth({
    context,
    voice: Tone.Synth,
    maxPolyphony: 32,
    volume: -22,
    options: {
      oscillator: { type: 'fatsine', count: 3, spread: 12 },
      envelope: { attack: 2, decay: 1, sustain: 0.7, release: 6 },
    },
  })).connect(filter)
  const drone = own(new Tone.Synth({
    context,
    volume: -28,
    oscillator: { type: 'sine' },
    envelope: { attack: 3, decay: 1, sustain: 0.8, release: 4 },
  })).connect(filter)

  function playNote(note: NoteEvent, time: number) {
    // A separate voice/channel preserves each overlapping note's pan and reverb.
    const panner = own(new Tone.Panner({ context, pan: note.pan })).connect(filter)
    const send = own(new Tone.Gain({ context, gain: note.reverbSend })).connect(sendFilter)
    panner.connect(send)
    const release = note.instrument === 'pad' ? 6 : note.instrument === 'rhodes' ? 3 : 4
    const voice = own(note.instrument === 'rhodes'
      ? new Tone.FMSynth({
        context, volume: -16, harmonicity: 3, modulationIndex: 2,
        envelope: { attack: 0.01, decay: 1.5, sustain: 0.1, release },
      })
      : new Tone.Synth({
        context,
        volume: note.instrument === 'pad' ? -18 : -20,
        oscillator: { type: note.instrument === 'pad' ? 'fatsine' : 'triangle' },
        envelope: note.instrument === 'pad'
          ? { attack: 2, decay: 1, sustain: 0.7, release }
          : { attack: 0.005, decay: 2, sustain: 0, release },
      })).connect(panner)
    voice.triggerAttackRelease(frequency(note.midi), note.durationSeconds, time, note.velocity)
    const noteResources: { dispose(): unknown }[] = [voice, panner, send]
    if (note.instrument === 'chime') {
      const overtone = own(new Tone.Synth({
        context, volume: -34,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 2, sustain: 0, release: 4 },
      })).connect(panner)
      overtone.triggerAttackRelease(frequency(note.midi + 12), note.durationSeconds, time, note.velocity)
      noteResources.push(overtone)
    }
    const timer = context.setTimeout(() => {
      for (const resource of noteResources) {
        resource.dispose()
        resources.delete(resource)
      }
      cleanupTimers.delete(timer)
    }, time + note.durationSeconds + release + 0.1 - context.currentTime)
    cleanupTimers.add(timer)
  }

  return {
    ready: reverb.ready,
    output,
    gate,
    schedule(score: MusicalScore) {
      const transport = context.transport
      transport.bpm.value = score.parameters.tempo
      // Set seconds explicitly after BPM changes; note event times already use seconds.
      delay.delayTime.value = 0.75 * 60 / score.parameters.tempo
      for (const note of score.notes) {
        transport.schedule((time) => playNote(note, time), note.timeSeconds)
      }
      for (const chord of score.chords) {
        transport.schedule((time) => {
          harmony.triggerAttackRelease(chord.midi.map(frequency), chord.durationSeconds, time, 0.4)
        }, chord.timeSeconds)
      }
      transport.schedule((time) => {
        drone.triggerAttackRelease(frequency(score.drone.midi), score.drone.durationSeconds, time, 0.6)
      }, score.drone.timeSeconds)
      transport.schedule((time) => {
        // Fade after the effects so the drone, final chord, and reverb all end together.
        fade.gain.setValueAtTime(1, time)
        fade.gain.linearRampToValueAtTime(0, time + score.durationSeconds - score.tailStartSeconds)
      }, score.tailStartSeconds)
    },
    dispose() {
      for (const timer of cleanupTimers) context.clearTimeout(timer)
      cleanupTimers.clear()
      for (const resource of resources) resource.dispose()
      resources.clear()
    },
  }
}
