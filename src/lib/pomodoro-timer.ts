// Global singleton Pomodoro timer state.
//
// Kept as a module-level object with helper functions (not raw property
// assignment) so React 19 / React Compiler rules-of-react don't flag
// component-render mutations. The whole point of a singleton here is
// that the timer keeps ticking across page navigation — it deliberately
// survives component unmount, which is why it isn't useRef / useState.

"use client";

export type Phase = "focus" | "break" | "longBreak";

interface TimerState {
  inited: boolean;
  secondsLeft: number;
  running: boolean;
  phase: Phase;
  sessionCount: number;
  interval: ReturnType<typeof setInterval> | null;
}

const state: TimerState = {
  inited: false,
  secondsLeft: 25 * 60,
  running: false,
  phase: "focus",
  sessionCount: 0,
  interval: null,
};

export function getTimer(): Readonly<TimerState> {
  return state;
}

export function initTimerOnce(defaultSeconds: number) {
  if (!state.inited) {
    state.secondsLeft = defaultSeconds;
    state.inited = true;
  }
}

export function setTimerPhase(p: Phase) {
  state.phase = p;
}

export function setTimerSeconds(s: number) {
  state.secondsLeft = s;
}

export function setTimerRunning(r: boolean) {
  state.running = r;
}

export function setTimerSessionCount(n: number) {
  state.sessionCount = n;
}

export function decrementTimerSecond(): number {
  state.secondsLeft -= 1;
  return state.secondsLeft;
}

export function clearTimerInterval() {
  if (state.interval) {
    clearInterval(state.interval);
    state.interval = null;
  }
}

export function startTimerInterval(tick: () => void) {
  clearTimerInterval();
  state.interval = setInterval(tick, 1000);
}
