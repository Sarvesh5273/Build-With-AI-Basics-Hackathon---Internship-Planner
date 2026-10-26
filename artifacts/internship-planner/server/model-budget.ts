import { Tiktoken } from 'js-tiktoken/lite';
import ranks from 'js-tiktoken/ranks/o200k_base';

// GPT-OSS's o200k_harmony uses these same ordinary-text merge ranks.
// The additional allowance covers chat framing and provider schema formatting;
// this is a conservative estimate, not a claim to reproduce Groq's accounting.
const encoder = new Tiktoken(ranks);
export const COMPLETION_ALLOWANCE = 1800;
export const MODEL_WINDOW_ALLOWANCE = 7000;
export const SOURCE_REQUEST_ALLOWANCE = 4200;
export function estimatedTokens(prompt: string, completion = COMPLETION_ALLOWANCE) {
  return encoder.encode(prompt, [], []).length + 512 + completion;
}
