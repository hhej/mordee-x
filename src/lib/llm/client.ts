import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.warn('[mordee] GOOGLE_API_KEY not set — LLM calls will fail.');
}

// Hard per-call ceiling for a single LLM invocation. LangChain's
// withStructuredOutput silently retries on schema-validation failures; without
// an AbortSignal a Gemini hiccup can spiral into 30s+ of retries. 35s leaves
// headroom under the route-level maxDuration (45s).
export const LLM_TIMEOUT_MS = 35_000;

/** AbortSignal that fires after LLM_TIMEOUT_MS — pass into `.invoke(msgs, { signal })`. */
export function llmTimeoutSignal(): AbortSignal {
  return AbortSignal.timeout(LLM_TIMEOUT_MS);
}

export function chatModel(opts: { temperature?: number } = {}) {
  return new ChatGoogleGenerativeAI({
    apiKey: apiKey ?? '',
    model: 'gemini-2.5-flash',
    temperature: opts.temperature ?? 0.3,
  });
}

export const embedModel = new GoogleGenerativeAIEmbeddings({
  apiKey: apiKey ?? '',
  model: 'gemini-embedding-001',
});
