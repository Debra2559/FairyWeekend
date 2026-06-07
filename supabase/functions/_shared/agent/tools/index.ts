/**
 * Tools Index
 * 导出所有工具和辅助函数
 */

// ===== 工具定义 =====
export {
  searchPoiTool,
  searchPoiTyped,
  type POI,
  type POISearchResult,
} from "./search-poi.tool.ts";

export {
  getPlayerProfileTool,
  getPlayerProfileTyped,
  type PlayerProfile,
  type PlayerProfileResult,
} from "./get-player-profile.tool.ts";

export {
  reverseGeocodeTool,
  reverseGeocodeTyped,
  type GeocodeResult,
  type GeocodeResultWithMeta,
} from "./reverse-geocode.tool.ts";

// ===== 工具辅助函数 =====
export {
  classifyError,
  createErrorResult,
  createSuccessResult,
  isRetryableError,
  sleep,
  withRetry,
  safeJsonParse,
  type ToolError,
  type ToolErrorType,
  type ToolOutput,
  type TypedToolError,
  type TypedToolResult,
} from "./utils.ts";

// ===== 导入工具实例（供 Agent 使用）=====
import { searchPoiTool, type POI } from "./search-poi.tool.ts";

/**
 * 并行搜索多个关键词的 POI（保持向后兼容）
 * @deprecated 推荐使用 searchPoiTyped 或直接调用 searchPoiTool
 */
export async function searchPoisParallel(
  keywords: string[],
  options: {
    lng: number;
    lat: number;
    radius?: number;
    excludePois?: string[];
  }
): Promise<POI[]> {
  const { lng, lat, radius = 3000, excludePois = [] } = options;
  const excludeSet = new Set(excludePois);

  // 使用类型化函数
  const result = await searchPoiTool.invoke({
    keywords,
    radius,
    lng,
    lat,
  });

  try {
    const parsed = JSON.parse(result);
    if (!Array.isArray(parsed.pois)) {
      return [];
    }

    // 去重 + 排除
    const seen = new Set<string>();
    const uniquePois = parsed.pois.filter((p: POI) => {
      if (seen.has(p.name) || excludeSet.has(p.name)) {
        return false;
      }
      seen.add(p.name);
      return true;
    });

    // 按距离排序
    uniquePois.sort((a: POI, b: POI) => {
      const distA = parseInt(a.distance || "99999");
      const distB = parseInt(b.distance || "99999");
      return distA - distB;
    });

    return uniquePois.slice(0, 25);
  } catch {
    return [];
  }
}
