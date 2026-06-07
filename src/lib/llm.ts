/**
 * LLM 调用工具函数
 * 用于 TanStack Router API handlers
 *
 * 优先使用 Lovable API，如果没有配置则使用 OpenAI 兼容 API
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
}

// 获取环境变量（兼容 VITE_ 前缀和无前缀）
function getEnv(key: string): string | undefined {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const viteKey = `VITE_${key}`;
    if (import.meta.env[viteKey]) return import.meta.env[viteKey];
    if ((import.meta.env as Record<string, string>)[key]) {
      return (import.meta.env as Record<string, string>)[key];
    }
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return undefined;
}

// 获取 LLM 配置（优先 Lovable，其次 OpenAI）
function getLLMConfig() {
  const lovableKey = getEnv("LOVABLE_API_KEY");

  if (lovableKey) {
    return {
      provider: "lovable" as const,
      apiKey: lovableKey,
      baseUrl: "https://ai.gateway.lovable.dev/v1",
      model: getEnv("LOVABLE_MODEL") || "google/gemini-2.5-flash",
    };
  }

  const openaiKey = getEnv("OPENAI_API_KEY");
  if (openaiKey) {
    return {
      provider: "openai" as const,
      apiKey: openaiKey,
      baseUrl: getEnv("OPENAI_BASE_URL") || "https://api.openai.com/v1",
      model: getEnv("OPENAI_MODEL") || "gpt-4o-mini",
    };
  }

  return null;
}

/**
 * 调用 LLM API
 */
export async function callLLM(
  messages: ChatMessage[],
  options?: LLMOptions
): Promise<string> {
  const config = getLLMConfig();
  if (!config) {
    throw new Error("Missing LOVABLE_API_KEY or OPENAI_API_KEY");
  }

  const { temperature = 0.7, maxTokens } = options || {};

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature,
      // 显式关闭深度思考，提升速度
      enable_thinking: false,
      ...(maxTokens && { max_tokens: maxTokens }),
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`LLM API 错误 (${res.status}): ${error}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

/**
 * 调用 LLM 并返回 JSON
 */
export async function callLLMJSON<T = unknown>(
  messages: ChatMessage[],
  options?: LLMOptions
): Promise<T> {
  const config = getLLMConfig();
  if (!config) {
    throw new Error("Missing LOVABLE_API_KEY or OPENAI_API_KEY");
  }

  const { temperature = 0.7, maxTokens } = options || {};

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature,
      response_format: { type: "json_object" },
      // 显式关闭深度思考，提升速度
      enable_thinking: false,
      ...(maxTokens && { max_tokens: maxTokens }),
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`LLM API 错误 (${res.status}): ${error}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "";

  try {
    // 清理 markdown 代码块标记
    let cleaned = content.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    return JSON.parse(cleaned.trim());
  } catch {
    throw new Error(`JSON 解析失败: ${content.slice(0, 100)}...`);
  }
}

/**
 * 便捷方法：单轮对话
 */
export async function askLLM(
  prompt: string,
  systemPrompt?: string,
  options?: LLMOptions
): Promise<string> {
  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });
  return callLLM(messages, options);
}

/**
 * 便捷方法：单轮对话返回 JSON
 */
export async function askLLMJSON<T = unknown>(
  prompt: string,
  systemPrompt?: string,
  options?: LLMOptions
): Promise<T> {
  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });
  return callLLMJSON<T>(messages, options);
}
