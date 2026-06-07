/**
 * LangChain LLM Client 统一入口
 * 根据环境变量 LLM_PROVIDER 选择供应商
 *
 * 使用方式：
 *   import { createLLM } from "./langchain-client.ts";
 *   const llm = createLLM();
 *
 * 环境变量：
 *   LLM_PROVIDER=lovable (默认) | openai
 *
 *   # Lovable (默认)
 *   LOVABLE_API_KEY=xxx
 *   LOVABLE_MODEL=google/gemini-2.5-flash (可选)
 *
 *   # OpenAI / 第三方
 *   OPENAI_API_KEY=xxx
 *   OPENAI_BASE_URL=https://... (可选)
 *   OPENAI_MODEL=gpt-4o-mini (可选)
 */

import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

// 环境变量读取（兼容 Node.js 和 Deno）
const getEnv = (key: string): string | undefined => {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  // @ts-ignore
  if (typeof Deno !== "undefined") {
    // @ts-ignore
    return Deno.env.get(key);
  }
  return undefined;
};

// 供应商类型
export type LLMProvider = "lovable" | "openai";

/**
 * 创建 LangChain 兼容的 LLM 客户端
 */
export function createLLM(provider?: LLMProvider): BaseChatModel {
  const selectedProvider = provider || (getEnv("LLM_PROVIDER") as LLMProvider) || "lovable";

  console.log(`[LLM] 使用供应商: ${selectedProvider}`);

  if (selectedProvider === "lovable") {
    return createLovableLLM();
  }

  return createOpenAILLM();
}

/**
 * 创建 Lovable AI Gateway 客户端
 */
function createLovableLLM(): BaseChatModel {
  const apiKey = getEnv("LOVABLE_API_KEY");
  const model = getEnv("LOVABLE_MODEL") || "google/gemini-2.5-flash";

  if (!apiKey) {
    console.warn("[LLM] 警告: 未配置 LOVABLE_API_KEY 环境变量");
  }

  console.log(`[LLM] Model: ${model}`);
  console.log(`[LLM] Base URL: https://ai.gateway.lovable.dev/v1`);

  return new ChatOpenAI({
    apiKey,
    configuration: {
      baseURL: "https://ai.gateway.lovable.dev/v1",
    },
    model,
    temperature: 0.7,
  });
}

/**
 * 创建 OpenAI / 第三方兼容客户端
 */
function createOpenAILLM(): BaseChatModel {
  const apiKey = getEnv("OPENAI_API_KEY");
  const baseUrl = getEnv("OPENAI_BASE_URL");
  const model = getEnv("OPENAI_MODEL") || "gpt-4o-mini";

  if (!apiKey) {
    console.warn("[LLM] 警告: 未配置 OPENAI_API_KEY 环境变量");
  }

  console.log(`[LLM] Model: ${model}`);
  if (baseUrl) {
    console.log(`[LLM] Base URL: ${baseUrl}`);
  }

  return new ChatOpenAI({
    apiKey,
    configuration: baseUrl ? { baseURL: baseUrl } : undefined,
    model,
    temperature: 0.7,
    // 禁用深度思考，提升速度
    modelKwargs: {
      enable_thinking: false,
    },
  });
}

// 导出
export { ChatOpenAI };
