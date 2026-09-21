import { MODEL_IDS } from "@peer-point/workshop-config";
import type { LanguageModel } from "ai";
import { createWorkersAI } from "workers-ai-provider";

export function createWatcherModel(env: Env): LanguageModel {
  return createWorkersAI({ binding: env.AI })(MODEL_IDS[5], {
    gateway: {
      id: env.AI_GATEWAY_ID,
      metadata: { city: "montreal", card: "watcher", environment: env.ENVIRONMENT },
    },
    reasoning_effort: "low",
    chat_template_kwargs: { enable_thinking: false },
  });
}
