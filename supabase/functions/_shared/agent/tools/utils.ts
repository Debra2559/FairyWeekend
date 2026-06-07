/**
 * 工具辅助函数
 * 统一错误处理、重试机制、类型化输出
 */

import type { StructuredTool } from "@langchain/core/tools";

// ===== 错误类型定义 =====

export type ToolErrorType =
  | "RATE_LIMIT"
  | "API_ERROR"
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR";

export interface ToolError {
  type: ToolErrorType;
  message: string;
  retryable: boolean;
  suggestion?: string;
  raw?: string;
}

export interface TypedToolResult<T> {
  success: true;
  data: T;
}

export interface TypedToolError {
  success: false;
  error: ToolError;
}

export type ToolOutput<T> = TypedToolResult<T> | TypedToolError;

// ===== 重试配置 =====

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;      // 基础延迟（毫秒）
  maxDelay: number;       // 最大延迟（毫秒）
  backoffFactor: number;  // 退避因子
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

// ===== 辅助函数 =====

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // 限流错误可重试
    if (msg.includes("cuqps") || msg.includes("rate limit") || msg.includes("429")) {
      return true;
    }
    // 网络超时可重试
    if (msg.includes("timeout") || msg.includes("econnrefused") || msg.includes("enotfound")) {
      return true;
    }
    // 服务器错误可重试
    if (msg.includes("500") || msg.includes("502") || msg.includes("503")) {
      return true;
    }
  }
  return false;
}

/**
 * 分类错误类型
 */
export function classifyError(error: unknown): ToolErrorType {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("cuqps") || msg.includes("rate limit") || msg.includes("429")) {
      return "RATE_LIMIT";
    }
    if (msg.includes("timeout")) {
      return "TIMEOUT";
    }
    if (msg.includes("network") || msg.includes("econnrefused") || msg.includes("enotfound")) {
      return "NETWORK_ERROR";
    }
    if (msg.includes("parse") || msg.includes("json") || msg.includes("syntax")) {
      return "PARSE_ERROR";
    }
    if (msg.includes("validation") || msg.includes("invalid")) {
      return "VALIDATION_ERROR";
    }
  }
  return "API_ERROR";
}

/**
 * 生成错误建议
 */
export function getErrorSuggestion(type: ToolErrorType, context?: string): string {
  switch (type) {
    case "RATE_LIMIT":
      return "请尝试减少请求频率或稍后重试";
    case "TIMEOUT":
      return "请检查网络连接后重试";
    case "NETWORK_ERROR":
      return "请检查网络连接";
    case "PARSE_ERROR":
      return context ? `数据解析失败，原始数据: ${context.slice(0, 100)}` : "数据格式错误";
    case "VALIDATION_ERROR":
      return "请检查输入参数是否正确";
    default:
      return "请稍后重试或联系支持";
  }
}

/**
 * 延迟函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 计算退避延迟
 */
export function calculateBackoff(
  attempt: number,
  config: Partial<RetryConfig> = {}
): number {
  const { baseDelay, maxDelay, backoffFactor } = { ...DEFAULT_RETRY_CONFIG, ...config };
  const delay = baseDelay * Math.pow(backoffFactor, attempt);
  // 添加随机抖动（±20%）
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.min(delay + jitter, maxDelay);
}

/**
 * 带重试的异步执行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: unknown) => void
): Promise<T> {
  const { maxRetries } = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 最后一次尝试不再重试
      if (attempt === maxRetries) {
        break;
      }

      // 不可重试的错误直接抛出
      if (!isRetryableError(error)) {
        throw error;
      }

      // 计算延迟并等待
      const delay = calculateBackoff(attempt, config);
      if (onRetry) {
        onRetry(attempt, error);
      }
      console.log(`[Retry] 第 ${attempt + 1} 次重试，等待 ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * 安全解析 JSON
 */
export function safeJsonParse<T>(
  raw: string,
  fallback?: T
): { success: true; data: T } | { success: false; error: SyntaxError } {
  try {
    return { success: true, data: JSON.parse(raw) as T };
  } catch (e) {
    if (fallback !== undefined) {
      return { success: true, data: fallback };
    }
    return { success: false, error: e as SyntaxError };
  }
}

/**
 * 创建结构化工具错误
 */
export function createToolError(
  type: ToolErrorType,
  message: string,
  retryable: boolean = false,
  raw?: string
): ToolError {
  return {
    type,
    message,
    retryable,
    suggestion: getErrorSuggestion(type, raw),
    raw: raw?.slice(0, 200),
  };
}

/**
 * 创建成功结果
 */
export function createSuccessResult<T>(data: T): TypedToolResult<T> {
  return { success: true, data };
}

/**
 * 创建失败结果
 */
export function createErrorResult(
  type: ToolErrorType,
  message: string,
  retryable: boolean = false,
  raw?: string
): TypedToolError {
  return {
    success: false,
    error: createToolError(type, message, retryable, raw),
  };
}
