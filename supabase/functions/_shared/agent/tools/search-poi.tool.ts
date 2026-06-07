/**
 * Tool: search_poi
 * 搜索附近兴趣点，调用高德 API
 *
 * 特性：
 * - 自动重试（指数退避）
 * - 限流保护
 * - 结构化错误返回
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  classifyError,
  createErrorResult,
  createSuccessResult,
  isRetryableError,
  sleep,
  type ToolOutput,
} from "./utils.ts";

export interface POI {
  name: string;
  type: string;
  address: string;
  location: string;
  distance?: string;
}

export interface POISearchResult {
  pois: POI[];
  searchedKeywords: string[];
  searchMode: "around" | "text";
  city: string;
  errors?: Array<{
    keyword: string;
    type: string;
    message: string;
    retryable: boolean;
  }>;
}

// 环境变量读取（兼容 Node.js 和 Deno）
const getEnv = (key: string): string | undefined => {
  // @ts-ignore
  if (typeof process !== "undefined" && process.env) {
    // @ts-ignore
    return process.env[key];
  }
  // @ts-ignore
  if (typeof Deno !== "undefined") {
    // @ts-ignore
    return Deno.env.get(key);
  }
  return undefined;
};

const AMAP_KEY = getEnv("AMAP_WEB_API_KEY") || "";

// 限流配置
let lastCallTime = 0;
const MIN_INTERVAL = 500; // 最小间隔 500ms（2 QPS）

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelay: 1000,
  maxDelay: 8000,
  backoffFactor: 2,
};

/**
 * 限流器
 */
async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_INTERVAL) {
    await sleep(MIN_INTERVAL - elapsed);
  }
  lastCallTime = Date.now();
}

/**
 * 执行单次 POI 搜索
 */
async function doPoiSearch(
  keyword: string,
  options: {
    city?: string;
    radius?: number;
    lng?: number;
    lat?: number;
  }
): Promise<{ pois: POI[]; error?: { type: string; message: string } }> {
  const { city, radius = 3000, lng, lat } = options;
  const useLocationSearch = lng !== undefined && lat !== undefined;

  let url: URL;
  if (useLocationSearch) {
    url = new URL("https://restapi.amap.com/v3/place/around");
    url.searchParams.set("key", AMAP_KEY);
    url.searchParams.set("location", `${lng},${lat}`);
    url.searchParams.set("keywords", keyword);
    url.searchParams.set("radius", String(radius));
  } else {
    url = new URL("https://restapi.amap.com/v3/place/text");
    url.searchParams.set("key", AMAP_KEY);
    url.searchParams.set("keywords", keyword);
    url.searchParams.set("city", city || "北京");
  }
  url.searchParams.set("offset", "8");
  url.searchParams.set("extensions", "base");

  const res = await fetch(url.toString()).then((r) => r.json());

  // 检查 API 返回状态
  if (res.status !== "1" || !Array.isArray(res.pois)) {
    const errorType = res.info === "CUQPS_HAS_EXCEEDED_THE_LIMIT"
      ? "RATE_LIMIT"
      : "API_ERROR";
    return {
      pois: [],
      error: {
        type: errorType,
        message: res.info || "未知错误",
      },
    };
  }

  const pois: POI[] = res.pois
    .slice(0, 4)
    .map((p: Record<string, unknown>) => ({
      name: String(p.name ?? ""),
      type: String(p.type ?? "").split(";")[0] || "",
      address: String(p.address ?? ""),
      location: String(p.location ?? ""),
      distance: p.distance ? String(p.distance) : undefined,
    }))
    .filter((p: POI) => p.name);

  return { pois };
}

/**
 * 带重试的 POI 搜索
 */
async function searchPoiWithRetry(
  keyword: string,
  options: {
    city?: string;
    radius?: number;
    lng?: number;
    lat?: number;
  },
  retryCount = 0
): Promise<{ pois: POI[]; error?: { type: string; message: string; retryable: boolean } }> {
  try {
    // 限流
    await rateLimit();

    const result = await doPoiSearch(keyword, options);

    // 如果有限流错误且可重试
    if (result.error?.type === "RATE_LIMIT" && retryCount < RETRY_CONFIG.maxRetries) {
      const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, retryCount);
      console.log(`[POI搜索] ${keyword} 遇到限流，第 ${retryCount + 1} 次重试，等待 ${delay}ms...`);
      await sleep(delay);
      return searchPoiWithRetry(keyword, options, retryCount + 1);
    }

    return {
      ...result,
      error: result.error
        ? { ...result.error, retryable: result.error.type === "RATE_LIMIT" }
        : undefined,
    };
  } catch (e) {
    const errorType = classifyError(e);
    return {
      pois: [],
      error: {
        type: errorType,
        message: e instanceof Error ? e.message : String(e),
        retryable: isRetryableError(e),
      },
    };
  }
}

/**
 * POI 搜索工具
 */
export const searchPoiTool = tool(
  async ({ keywords, city, radius = 3000, lng, lat }): Promise<string> => {
    const startTime = Date.now();

    console.log("🔍 [POI搜索] 开始搜索:", {
      keywords,
      city: city || "北京",
      radius,
      location: lng && lat ? `${lng},${lat}` : "无坐标（使用城市搜索）",
    });

    const allPois: POI[] = [];
    const errors: POISearchResult["errors"] = [];

    const useLocationSearch = lng !== undefined && lat !== undefined;

    // 依次搜索每个关键词（保持限流）
    for (const keyword of keywords) {
      const result = await searchPoiWithRetry(keyword, { city, radius, lng, lat });

      if (result.pois.length > 0) {
        allPois.push(...result.pois);
      }

      if (result.error) {
        errors.push({
          keyword,
          type: result.error.type,
          message: result.error.message,
          retryable: result.error.retryable,
        });
      }
    }

    // 去重（按 location）
    const seen = new Set<string>();
    const uniquePois = allPois.filter((p) => {
      if (seen.has(p.location)) return false;
      seen.add(p.location);
      return true;
    });

    const elapsed = Date.now() - startTime;

    // 构建结果
    const result: POISearchResult = {
      pois: uniquePois,
      searchedKeywords: keywords,
      searchMode: useLocationSearch ? "around" : "text",
      city: city || "北京",
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log(`✅ [POI搜索] 完成: 找到 ${uniquePois.length} 个结果，耗时 ${elapsed}ms`, {
      keywords,
      mode: result.searchMode,
      errors: errors.length > 0 ? errors : undefined,
    });

    return JSON.stringify(result);
  },
  {
    name: "search_poi",
    description:
      "批量搜索兴趣点（POI）。支持按坐标搜索或按城市名搜索。返回所有地点列表，包含错误信息（如有）。",
    schema: z.object({
      keywords: z
        .array(z.string())
        .describe("搜索关键词数组，如：['小馆子', '本地菜', '老字号']"),
      city: z
        .string()
        .optional()
        .describe("城市名称，如：北京、上海。无坐标时必填"),
      radius: z
        .number()
        .optional()
        .default(3000)
        .describe("搜索半径（米），仅按坐标搜索时有效"),
      lng: z.number().optional().describe("中心点经度（GCJ02坐标）"),
      lat: z.number().optional().describe("中心点纬度（GCJ02坐标）"),
    }),
  }
);

/**
 * 类型化的 POI 搜索函数（供节点直接调用）
 */
export async function searchPoiTyped(
  input: {
    keywords: string[];
    city?: string;
    radius?: number;
    lng?: number;
    lat?: number;
  }
): Promise<ToolOutput<POISearchResult>> {
  try {
    const raw = await searchPoiTool.invoke(input);
    const parsed = JSON.parse(raw) as POISearchResult;
    return createSuccessResult(parsed);
  } catch (e) {
    return createErrorResult(
      "PARSE_ERROR",
      e instanceof Error ? e.message : String(e),
      false,
      typeof (await searchPoiTool.invoke(input).catch(() => '{"pois":[]}')) === "string"
        ? await searchPoiTool.invoke(input).catch(() => '{"pois":[]}') as string
        : undefined
    );
  }
}
