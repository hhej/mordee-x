// Per-caller AbortController singleton. Each store creates one via
// createAbortable(); newSignal() returns a per-request handle with both a
// combined signal (user-abort ∪ timeout) and an isUserAbort() probe.
//
// Why isUserAbort() instead of err.name discrimination: WebKit's fetch can
// surface every AbortSignal-based rejection as a generic AbortError, losing
// the TimeoutError name set by AbortSignal.timeout. Checking the per-request
// controller's .aborted flag is platform-agnostic — it's only true if WE
// called abort() (via the abort() method exposed on the Abortable), not when
// the timeout fired.

export type RequestHandle = {
  /** Pass to fetch via `signal: handle.signal`. */
  signal: AbortSignal;
  /** True if abort() was called (close/reset). False for timeouts or non-abort errors. */
  isUserAbort: () => boolean;
};

export type Abortable = {
  /** Aborts the prior controller and returns a fresh per-request handle. */
  newSignal: (timeoutMs: number) => RequestHandle;
  /** Aborts the active controller (call from close/reset). */
  abort: () => void;
};

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => {
    controller.abort(new DOMException('The operation timed out.', 'TimeoutError'));
  }, ms);
  return controller.signal;
}

function combineSignals(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
    return AbortSignal.any(signals);
  }
  const merged = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      merged.abort(s.reason);
      break;
    }
    s.addEventListener('abort', () => merged.abort(s.reason), { once: true });
  }
  return merged.signal;
}

export function createAbortable(): Abortable {
  let active: AbortController | null = null;
  return {
    newSignal(timeoutMs: number): RequestHandle {
      active?.abort();
      const controller = new AbortController();
      active = controller;
      return {
        signal: combineSignals([controller.signal, timeoutSignal(timeoutMs)]),
        isUserAbort: () => controller.signal.aborted,
      };
    },
    abort() {
      active?.abort();
      active = null;
    },
  };
}

export const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException && err.name === 'AbortError';

export const STREAM_TIMEOUT_TH = 'AI ตอบช้าผิดปกติ — ลองอีกครั้ง';

export const JSON_TIMEOUT_MS = 20_000;
export const STREAM_TIMEOUT_MS = 30_000;
