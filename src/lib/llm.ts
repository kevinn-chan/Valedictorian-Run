import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

// Gemini free tier is primary; OpenAI Tier 3 is break-glass.
// Flipping LLM_PROVIDER=openai is the entire failover.
export function llm() {
  return process.env.LLM_PROVIDER === "openai"
    ? openai("gpt-5-mini")
    // Pinned, NOT `gemini-flash-latest`: that alias now points at gemini-3.8-flash,
    // whose free tier is capped at 20 requests and 503s under load — a compile
    // burns one request and fails. Bump this deliberately when a newer Flash has
    // real free-tier quota.
    : google("gemini-3.7-flash");
}
