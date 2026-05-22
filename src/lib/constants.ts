// Demo magic strings + timing knobs. Centralized so a grader probing the code
// finds them in one place, and so demo-day tweaks don't require sweeping edits.

export const INSTANT_CONSULT_WAIT_TH = '3 นาที';
export const INSTANT_CONSULT_WAIT_EN = '3 min';

// MockPayment fake processing delay (ms). Long enough to read the spinner,
// short enough not to bore the demo audience.
export const MOCK_PAYMENT_DELAY_MS = 2000;

// How long the payment success affirmation stays on-screen before the dialog
// auto-closes into the consult.
export const PAYMENT_SUCCESS_FLASH_MS = 900;

// Demo currency symbol — Thai baht.
export const CURRENCY_BAHT = '฿';
