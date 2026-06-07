/**
 * Tool: search_poi
 * 搜索附近兴趣点，调用高德 API
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

export interface POI {
  name: string;
  type: string;
  address: string;
  location: string;
  distance?: string;
}

const AMAP_KEY = Deno.env.get("AMAP_WEB_API_KEY") || "";

// 简单的限流器：记录上次调用时间
let lastCallTime = 0;
const MIN_INTERVAL = 500; // 最小间隔 500ms（2 QPS）

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL - elapsed));
  }
  lastCallTime = Date.now();
}

export const searchPoiTool = tool(
  async ({ keywords, city, radius = 3000, lng, lat }) => {
    try {
      // 输出搜索内容
      console.log("🔍 [POI搜索] 开始搜索:", {
        keywords,
        city: city || "北京",
        radius,
        location: lng && lat ? `${lng},${lat}` : "无坐标（使用城市搜索）",
      });

      const allPois: POI[] = [];
      const errors: string[] = [];

      // 决定搜索模式：有坐标用 place/around，否则用 place/text
      const useLocationSearch = lng !== undefined && lat !== undefined;

      // 循环搜索每个关键词
      for (const keyword of keywords) {
        // 限流
        await rateLimit();

        let url: URL;
        if (useLocationSearch) {
          // 按坐标搜索
          url = new URL("https://restapi.amap.com/v3/place/around");
          url.searchParams.set("key", AMAP_KEY);
          url.searchParams.set("location", `${lng},${lat}`);
          url.searchParams.set("keywords", keyword);
          url.searchParams.set("radius", String(radius));
        } else {
          // 按城市搜索
          url = new URL("https://restapi.amap.com/v3/place/text");
          url.searchParams.set("key", AMAP_KEY);
          url.searchParams.set("keywords", keyword);
          url.searchParams.set("city", city || "北京");
        }
        url.searchParams.set("offset", "10");
        url.searchParams.set("extensions", "base");

        const res = await fetch(url.toString()).then((r) => r.json());

        if (res.status !== "1" || !Array.isArray(res.pois)) {
          console.warn("POI search failed:", keyword, res);

          if (res.info === "CUQPS_HAS_EXCEEDED_THE_LIMIT") {
            errors.push(`${keyword}: API限流`);
          } else {
            errors.push(`${keyword}: ${res.info || "未知错误"}`);
          }
          continue;
        }

        const pois: POI[] = res.pois
          .slice(0, 8)
          .map((p: Record<string, unknown>) => ({
            name: String(p.name ?? ""),
            type: String(p.type ?? "").split(";")[0] || "",
            address: String(p.address ?? ""),
            location: String(p.location ?? ""),
            distance: p.distance ? String(p.distance) : undefined,
          }))
          .filter((p: POI) => p.name);

        allPois.push(...pois);
      }

      // 去重（按 location）
      const seen = new Set<string>();
      const uniquePois = allPois.filter((p) => {
        if (seen.has(p.location)) return false;
        seen.add(p.location);
        return true;
      });

      // 返回结果
      const result = {
        pois: uniquePois,
        searchedKeywords: keywords,
        searchMode: useLocationSearch ? "around" : "text",
        city: city || "北京",
        errors: errors.length > 0 ? errors : undefined,
      };

      // 输出搜索结果摘要
      console.log(`✅ [POI搜索] 完成: 找到 ${uniquePois.length} 个结果`, {
        keywords,
        mode: useLocationSearch ? "around" : "text",
        errors: errors.length > 0 ? errors : undefined,
      });

      return JSON.stringify(result);
    } catch (e) {
      console.warn("search_poi tool error:", keywords, e);
      return JSON.stringify({ pois: [], error: String(e) });
    }
  },
  {
    name: "search_poi",
    description:
      "批量搜索兴趣点（POI）。支持按坐标搜索或按城市名搜索。返回所有地点列表。",
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
