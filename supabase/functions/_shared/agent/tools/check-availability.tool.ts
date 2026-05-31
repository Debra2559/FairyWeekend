/**
 * Tool: check_availability
 * 检查餐厅/场馆是否有位置，是否需要排队或预约
 *
 * Mock 实现，后续可接入美团/大众点评 API
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

// ===== 类型定义 =====

export interface AvailabilityResult {
  poiId: string;
  poiName: string;
  available: boolean;
  waitTime: number;           // 预计等待时间（分钟）
  needReservation: boolean;   // 是否需要预约
  timeSlots: string[];        // 可用时段
  partySize: number;
  notes: string;
  error?: string;
}

// ===== Mock 数据 =====

// 模拟不同类型场馆的可用性数据
const MOCK_AVAILABILITY: Record<string, Partial<AvailabilityResult>> = {
  // 餐厅类：周末人多，需要等位
  restaurant: {
    available: true,
    waitTime: 15,
    needReservation: true,
    timeSlots: ["11:30-13:00", "13:00-14:30", "17:30-19:00", "19:00-20:30"],
    notes: "周末高峰期需等位，建议提前预约",
  },
  // 咖啡馆类：通常有空位
  cafe: {
    available: true,
    waitTime: 5,
    needReservation: false,
    timeSlots: ["10:00-12:00", "14:00-16:00", "16:00-18:00"],
    notes: "下午时段人较多，建议错峰",
  },
  // 展览/博物馆：需要购票
  museum: {
    available: true,
    waitTime: 0,
    needReservation: true,
    timeSlots: ["09:00-11:00", "11:00-13:00", "14:00-16:00", "16:00-18:00"],
    notes: "周末建议提前在线购票",
  },
  // 公园/户外：无需预约
  park: {
    available: true,
    waitTime: 0,
    needReservation: false,
    timeSlots: ["06:00-22:00"],
    notes: "全天开放，无需预约",
  },
  // 亲子乐园：需要预约
  kids: {
    available: true,
    waitTime: 10,
    needReservation: true,
    timeSlots: ["09:00-11:00", "11:00-13:00", "14:00-16:00", "16:00-18:00"],
    notes: "亲子项目建议提前1天预约",
  },
  // 默认
  default: {
    available: true,
    waitTime: 0,
    needReservation: false,
    timeSlots: ["全天"],
    notes: "",
  },
};

// ===== 根据地点类型推断可用性 =====

function inferAvailabilityByType(poiType: string): Partial<AvailabilityResult> {
  const type = poiType.toLowerCase();

  if (type.includes("餐厅") || type.includes("饭店") || type.includes("美食")) {
    return MOCK_AVAILABILITY.restaurant;
  }
  if (type.includes("咖啡") || type.includes("茶馆") || type.includes("甜品")) {
    return MOCK_AVAILABILITY.cafe;
  }
  if (type.includes("展览") || type.includes("博物") || type.includes("美术") || type.includes("画廊")) {
    return MOCK_AVAILABILITY.museum;
  }
  if (type.includes("公园") || type.includes("绿地") || type.includes("广场")) {
    return MOCK_AVAILABILITY.park;
  }
  if (type.includes("亲子") || type.includes("儿童") || type.includes("游乐园")) {
    return MOCK_AVAILABILITY.kids;
  }

  return MOCK_AVAILABILITY.default;
}

// ===== 根据时段调整可用性 =====

function adjustForTimeSlot(
  base: Partial<AvailabilityResult>,
  timeSlot: string
): Partial<AvailabilityResult> {
  // 下午/傍晚是高峰期
  if (timeSlot.includes("下午") || timeSlot.includes("傍晚")) {
    return {
      ...base,
      waitTime: (base.waitTime || 0) + 10,
      notes: (base.notes || "") + " 下午为高峰期，等位时间较长",
    };
  }

  // 上午人少
  if (timeSlot.includes("上午")) {
    return {
      ...base,
      waitTime: Math.max(0, (base.waitTime || 0) - 5),
      notes: (base.notes || "") + " 上午人较少，推荐时段",
    };
  }

  return base;
}

// ===== 根据人数调整 =====

function adjustForPartySize(
  base: Partial<AvailabilityResult>,
  partySize: number
): Partial<AvailabilityResult> {
  // 大桌（5人以上）更难预约
  if (partySize >= 5) {
    return {
      ...base,
      needReservation: true,
      notes: (base.notes || "") + ` ${partySize}人用餐建议提前预约大桌`,
    };
  }

  return base;
}

// ===== Tool 定义 =====

export const checkAvailabilityTool = tool(
  async ({ poiId, poiName, poiType, partySize, timeSlot }) => {
    try {
      console.log(`[check_availability] 检查可用性: ${poiName || poiId}`);

      // 1. 根据类型推断基础可用性
      let availability = inferAvailabilityByType(poiType);

      // 2. 根据时段调整
      availability = adjustForTimeSlot(availability, timeSlot);

      // 3. 根据人数调整
      availability = adjustForPartySize(availability, partySize);

      // 4. 构建结果
      const result: AvailabilityResult = {
        poiId,
        poiName: poiName || poiId,
        available: availability.available ?? true,
        waitTime: availability.waitTime ?? 0,
        needReservation: availability.needReservation ?? false,
        timeSlots: availability.timeSlots ?? ["全天"],
        partySize,
        notes: availability.notes?.trim() || "暂无特殊说明",
      };

      console.log(`[check_availability] 结果:`, {
        available: result.available,
        waitTime: result.waitTime,
        needReservation: result.needReservation,
      });

      return JSON.stringify(result);
    } catch (e) {
      console.error("[check_availability] 错误:", e);
      const errorResult: AvailabilityResult = {
        poiId,
        poiName: poiName || poiId,
        available: false,
        waitTime: 0,
        needReservation: false,
        timeSlots: [],
        partySize,
        notes: "",
        error: String(e),
      };
      return JSON.stringify(errorResult);
    }
  },
  {
    name: "check_availability",
    description:
      "检查餐厅或场馆是否有位置、是否需要排队或预约。返回可用时段、预计等待时间等信息。",
    schema: z.object({
      poiId: z
        .string()
        .describe("POI 唯一标识，可以是 ID 或地点名称"),
      poiName: z
        .string()
        .optional()
        .describe("POI 名称，如：星巴克、海底捞"),
      poiType: z
        .string()
        .describe("POI 类型，如：餐厅、咖啡馆、展览馆、公园"),
      partySize: z
        .number()
        .describe("人数，如：2、4、5"),
      timeSlot: z
        .string()
        .describe("期望时段，如：上午、下午、傍晚、晚上"),
    }),
  }
);
