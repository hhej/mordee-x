'use client';

import { useSyncExternalStore } from 'react';

// Live "now" hook backed by useSyncExternalStore. This is the React-idiomatic
// way to wire a wall-clock tick into a component without triggering the
// `react-hooks/set-state-in-effect` rule that the React Compiler enables.
//
// useSyncExternalStore requires getSnapshot to return a *stable* reference
// until subscribe's callback fires — otherwise React detects a "change" on
// every render and loops forever ("getSnapshot should be cached"). So the
// current Date lives in a module-level cache that's mutated only inside the
// shared interval, and getSnapshot just hands the cached reference back.

let nowSnapshot: Date | null = null;
// Captured once on the first subscribe and never reassigned. Consumers that
// need a fixed "session start" reference (e.g. rebasing the appointment queue
// onto the live clock) read this instead of the ticking `nowSnapshot` — a
// stable reference means useSyncExternalStore never sees it "change", so it
// triggers no re-renders of its own and the value can't drift between ticks.
let anchorSnapshot: Date | null = null;
const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function startInterval() {
  if (intervalId !== null) return;
  nowSnapshot = new Date();
  anchorSnapshot ??= new Date();
  // 15 s tick: every subscriber today formats output at minute granularity,
  // so a 15 s tick is visually indistinguishable from 1 s while cutting React
  // re-renders ~15× (12/min/subscriber instead of 60/min/subscriber). Single
  // shared interval drives every useNow() consumer.
  intervalId = setInterval(() => {
    nowSnapshot = new Date();
    listeners.forEach((cb) => cb());
  }, 15_000);
}

function stopInterval() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  startInterval();
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) stopInterval();
  };
}

const getSnapshot = (): Date | null => nowSnapshot;
const getServerSnapshot = (): Date | null => null;

export function useNow(): Date | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const getAnchorSnapshot = (): Date | null => anchorSnapshot;

// Stable "now" captured at first client tick. Returns null during SSR and the
// first client render (matching the server, so no hydration mismatch), then the
// fixed anchor on the post-subscribe tick. Unlike useNow it does not advance, so
// values derived from it (rebased appointment times) stay put while the live
// `useNow` clock ticks past them.
export function useSessionAnchor(): Date | null {
  return useSyncExternalStore(subscribe, getAnchorSnapshot, getServerSnapshot);
}
