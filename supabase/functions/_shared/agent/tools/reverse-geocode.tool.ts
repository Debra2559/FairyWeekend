/**
 * Tool: reverse_geocode
 * 坐标转城市名称，调用高德 API
 *
 * 特性：
 * - 结构化错误返回
 * - 类型化输出函数
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  classifyError,
  createErrorResult,
  createSuccessResult,
  type ToolOutput,
} from "./utils.ts";

export interface GeocodeResult {
  label: string;      // 城市·区县
  city: string;       // 城市
  district: string;   // 区县
  province: string;   // 省份
  formatted: string;  // 完整地址
  gcj: {
    lng: number;
    lat: number;
  };
}

// 环境变量读取（兼容 Node.js 和 Deno）
const getEnv = (key: string): string | undefined => {
  // @ts-ignore: process may not exist in Deno
  if (typeof process !== "undefined" && process.env) {
    // @ts-ignore: process may not exist in Deno
    return process.env[key];
  }
  // @ts-ignore: Deno may not exist in Node
  if (typeof Deno !== "undefined") {
    // @ts-ignore: Deno.env may not exist in Node
    return Deno.env.get(key);
  }
  return undefined;
};

const AMAP_KEY = getEnv("AMAP_WEB_API_KEY") || "";

/**
 * WGS84 坐标转 GCJ02
 */
async function wgs84ToGcj02(
  lng: number,
  lat: number
): Promise<{ lng: number; lat: number; error?: string }> {
  try {
    const url = `https://restapi.amap.com/v3/assistant/coordinate/convert?locations=${lng},${lat}&coordsys=gps&key=${AMAP_KEY}`;
    const res = await fetch(url).then((r) => r.json());

    if (res.status === "1" && res.locations) {
      const [glng, glat] = String(res.locations).split(",").map(Number);
      return { lng: glng, lat: glat };
    }

    return {
      lng,
      lat,
      error: `坐标转换失败: ${res.info || "未知错误"}`,
    };
  } catch (e) {
    console.warn("📍 [坐标转换] 失败:", e);
    return {
      lng,
      lat,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * 逆地理编码结果（包含元数据）
 */
export interface GeocodeResultWithMeta extends GeocodeResult {
  _meta: {
    success: boolean;
    error?: {
      type: string;
      message: string;
      retryable: boolean;
    };
  };
}

/**
 * 逆地理编码工具
 */
export const reverseGeocodeTool = tool(
  async ({ lat, lng }): Promise<string> => {
    console.log("📍 [逆地理编码] 开始:", { lat, lng });

    try {
      // Step 1: WGS84 -> GCJ02
      const gcj = await wgs84ToGcj02(lng, lat);

      if (gcj.error) {
        console.warn("📍 [逆地理编码] 坐标转换失败:", gcj.error);
        return JSON.stringify({
          label: "",
          city: "",
          district: "",
          province: "",
          formatted: "",
          gcj: { lng: gcj.lng, lat: gcj.lat },
          _meta: {
            success: false,
            error: {
              type: "API_ERROR",
              message: gcj.error,
              retryable: true,
            },
          },
        });
      }

      // Step 2: 逆地理编码
      const url = `https://restapi.amap.com/v3/geocode/regeo?location=${gcj.lng},${gcj.lat}&key=${AMAP_KEY}`;
      const res = await fetch(url).then((r) => r.json());

      if (res.status !== "1") {
        console.warn("📍 [逆地理编码] API 失败:", res);
        return JSON.stringify({
          label: "",
          city: "",
          district: "",
          province: "",
          formatted: "",
          gcj: { lng: gcj.lng, lat: gcj.lat },
          _meta: {
            success: false,
            error: {
              type: res.info === "CUQPS_HAS_EXCEEDED_THE_LIMIT" ? "RATE_LIMIT" : "API_ERROR",
              message: res.info || "逆地理编码失败",
              retryable: res.info === "CUQPS_HAS_EXCEEDED_THE_LIMIT",
            },
          },
        });
      }

      const addr = res.regeocode?.addressComponent ?? {};
      const city =
        (typeof addr.city === "string" && addr.city) || addr.province || "";
      const district =
        (typeof addr.district === "string" && addr.district) || "";
      const province =
        (typeof addr.province === "string" && addr.province) || "";
      const formatted = res.regeocode?.formatted_address || "";

      // 生成标签格式：城市·区县
      const label = [city || province, district].filter(Boolean).join("·");

      const result: GeocodeResultWithMeta = {
        label,
        city: city || province,
        district,
        province,
        formatted,
        gcj: { lng: gcj.lng, lat: gcj.lat },
        _meta: { success: true },
      };

      console.log("📍 [逆地理编码] 成功:", {
        label,
        city: result.city,
        district: result.district,
      });

      return JSON.stringify(result);
    } catch (e) {
      console.warn("📍 [逆地理编码] 工具错误:", e);
      return JSON.stringify({
        label: "",
        city: "",
        district: "",
        province: "",
        formatted: "",
        gcj: { lng, lat },
        _meta: {
          success: false,
          error: {
            type: classifyError(e),
            message: e instanceof Error ? e.message : String(e),
            retryable: false,
          },
        },
      });
    }
  },
  {
    name: "reverse_geocode",
    description:
      "将坐标转换为城市名称。返回：城市、区县、省份、完整地址。用于确定用户所在位置。",
    schema: z.object({
      lat: z.number().describe("纬度（WGS84坐标）"),
      lng: z.number().describe("经度（WGS84坐标）"),
    }),
  }
);

/**
 * 类型化的逆地理编码函数（供节点直接调用）
 */
export async function reverseGeocodeTyped(
  lat: number,
  lng: number
): Promise<ToolOutput<GeocodeResultWithMeta>> {
  try {
    const raw = await reverseGeocodeTool.invoke({ lat, lng });
    const parsed = JSON.parse(raw) as GeocodeResultWithMeta;
    return createSuccessResult(parsed);
  } catch (e) {
    return createErrorResult(
      "PARSE_ERROR",
      e instanceof Error ? e.message : String(e),
      false
    );
  }
}
