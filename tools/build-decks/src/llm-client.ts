// tools/build-decks/src/llm-client.ts
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load .env from the repo root, not the CWD — this script is typically run
// from the workspace directory, where the user's .env doesn't live.
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../..", ".env") });

export type LlmRequest = {
  prompt: string;
};

export type LlmResponse = {
  content: string;
};

export interface LlmClient {
  complete(req: LlmRequest): Promise<LlmResponse>;
}

export class OpenAiCompatibleClient implements LlmClient {
  private client: OpenAI;
  private model: string;

  constructor(opts?: { apiKey?: string; baseURL?: string; model?: string }) {
    const apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set. Put it in .env or pass to the constructor.");
    }
    this.client = new OpenAI({
      apiKey,
      baseURL: opts?.baseURL ?? process.env.OPENAI_BASE_URL ?? "https://llm.chutes.ai/v1",
    });
    this.model = opts?.model ?? process.env.MODEL ?? "deepseek-ai/DeepSeek-V3";
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: req.prompt }],
      response_format: { type: "json_object" },
      temperature: 0,
    });
    const choice = res.choices[0];
    if (!choice) {
      throw new Error("LLM returned no choices");
    }
    if (choice.finish_reason && choice.finish_reason !== "stop") {
      // length / content_filter / tool_calls all imply the JSON we asked for is
      // either truncated or absent. Fail fast so the enrich retry path can
      // surface a clean drop instead of a downstream JSON.parse error.
      throw new Error(`LLM stopped with finish_reason=${choice.finish_reason}`);
    }
    const content = choice.message?.content;
    if (!content) {
      throw new Error("LLM returned empty content");
    }
    return { content };
  }
}
