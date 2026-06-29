// Natively Synthesized Web Audio API Studio Sounds & Haptics Engine
"use client";

// Audio Context Singleton for instant 0ms latency sound playback
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) audioCtx = new AudioCtxClass();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// ─── Sound Synthesizers (Under 500ms, Soft, Crisp, Apple/Things 3 Studio Quality) ───

export function playHabitDoneSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Soft crisp two-tone ascending chime (C5 -> E5)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(523.25, now); // C5
  osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

  osc.start(now);
  osc.stop(now + 0.3);
}

export function playTaskDoneSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Minimalist soft wood wood tap pop
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.start(now);
  osc.stop(now + 0.12);
}

export function playMilestoneSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Rich celebratory triad arpeggio (C5 -> E5 -> G5 -> C6)
  const freqs = [523.25, 659.25, 783.99, 1046.5];
  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);

    const start = now + idx * 0.08;
    osc.frequency.setValueAtTime(f, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

    osc.start(start);
    osc.stop(start + 0.38);
  });
}

export function playTimerStartSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(587.33, now); // D5
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.start(now);
  osc.stop(now + 0.22);
}

export function playTimerEndSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(659.25, now);
  osc.frequency.setValueAtTime(523.25, now + 0.18);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc.start(now);
  osc.stop(now + 0.48);
}

export function playSelectionPop() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(300, now);
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  osc.start(now);
  osc.stop(now + 0.05);
}

// ─── Haptic Feedback Engine (Web & Median Bridge) ───

export function triggerHapticLight() {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.median?.haptics?.impactLight) w.median.haptics.impactLight();
  else if (navigator.vibrate) navigator.vibrate(15);
}

export function triggerHapticMedium() {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.median?.haptics?.impactMedium) w.median.haptics.impactMedium();
  else if (navigator.vibrate) navigator.vibrate(35);
}

export function triggerHapticSuccess() {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.median?.haptics?.notificationSuccess) w.median.haptics.notificationSuccess();
  else if (navigator.vibrate) navigator.vibrate([25, 40, 45]);
}

export function triggerHapticSelection() {
  if (typeof window === "undefined") return;
  if (navigator.vibrate) navigator.vibrate(8);
}
