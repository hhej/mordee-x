import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.warn('[mordee] GOOGLE_API_KEY not set — LLM calls will fail.');
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
