// 8-bit sound effects, synthesized with WebAudio. No audio files.
// Off by default. M toggles it (a key press is the user gesture the browser needs).

let ctx = null;
let master = null;
let enabled = false;
const listeners = new Set();

export function isSoundOn() {
  return enabled;
}

export function onSoundChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function toggleSound() {
  enabled = !enabled;
  if (enabled && !ctx) {
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.18;
      master.connect(ctx.destination);
    } catch {
      enabled = false;
    }
  }
  if (enabled && ctx?.state === 'suspended') ctx.resume();
  for (const fn of listeners) fn(enabled);
  if (enabled) play('blip');
  return enabled;
}

function tone(type, freq, start, dur, gain = 1, endFreq = null) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(g).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noise(start, dur, gain = 1) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // Deterministic LFSR noise (no Math.random), like old sound chips.
  let lfsr = 0x7ff;
  for (let i = 0; i < len; i++) {
    const bit = (lfsr ^ (lfsr >> 1)) & 1;
    lfsr = (lfsr >> 1) | (bit << 14);
    data[i] = (lfsr & 1 ? 1 : -1) * (1 - i / len);
  }
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(g).connect(master);
  src.start(start);
}

const NOTES = { C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5, E6: 1318.5, G4: 392.0 };

export function play(name) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime + 0.005;
  switch (name) {
    case 'blip':
      tone('square', 880, t, 0.03, 0.35);
      break;
    case 'unlock':
      ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => tone('square', NOTES[n], t + i * 0.08, 0.12, 0.5));
      tone('triangle', NOTES.C6, t + 0.32, 0.4, 0.6);
      break;
    case 'hit':
      noise(t, 0.16, 0.6);
      tone('square', 320, t, 0.22, 0.6, 70);
      break;
    case 'dodge':
      tone('triangle', 600, t, 0.08, 0.35, 1300);
      break;
    case 'respawn':
      tone('triangle', 300, t, 0.18, 0.4, 900);
      break;
    case 'rank':
      ['G4', 'C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) => tone('square', NOTES[n], t + i * 0.07, 0.1, 0.45));
      tone('triangle', NOTES.E6, t + 0.42, 0.5, 0.55);
      break;
    case 'lose':
      tone('square', 392, t, 0.18, 0.45);
      tone('square', 330, t + 0.18, 0.18, 0.45);
      tone('square', 262, t + 0.36, 0.45, 0.5, 200);
      break;
    default:
      break;
  }
}
