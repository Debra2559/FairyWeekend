/**
 * Tool: get_player_profile
 * 获取玩家历史画像和偏好
 *
 * 特性：
 * - 结构化错误返回
 * - 类型化输出函数
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  classifyError,
  createErrorResult,
  createSuccessResult,
  type ToolOutput,
} from "./utils.ts";

export interface PlayerProfile {
  profile: string;
  loved_tags: string[];
  disliked_tags: string[];
  visited_pois: string[];
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

const SUPABASE_URL = getEnv("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DEFAULT_PROFILE: PlayerProfile = {
  profile: "",
  loved_tags: [],
  disliked_tags: [],
  visited_pois: [],
};

/**
 * 玩家画像获取工具
 */
export const getPlayerProfileTool = tool(
  async ({ playerKey }): Promise<string> => {
    console.log("👤 [玩家画像] 开始获取:", { playerKey });

    try {
      const { data, error } = await supabase
        .from("dm_memory")
        .select("*")
        .eq("player_key", playerKey)
        .single();

      if (error) {
        // 区分"未找到"和"真正的错误"
        if (error.code === "PGRST116") {
          // 未找到记录，返回默认值
          console.log("👤 [玩家画像] 未找到记录，使用默认值");
          return JSON.stringify({
            ...DEFAULT_PROFILE,
            _meta: { found: false },
          });
        }

        console.warn("👤 [玩家画像] 查询失败:", error);
        return JSON.stringify({
          ...DEFAULT_PROFILE,
          _meta: {
            found: false,
            error: {
              type: "DATABASE_ERROR",
              message: error.message,
              retryable: true,
            },
          },
        });
      }

      const profile: PlayerProfile = {
        profile: data?.profile ?? "",
        loved_tags: data?.loved_tags ?? [],
        disliked_tags: data?.disliked_tags ?? [],
        visited_pois: data?.visited_pois ?? [],
      };

      console.log("👤 [玩家画像] 获取成功:", {
        profileLength: profile.profile.length,
        lovedTagsCount: profile.loved_tags.length,
        visitedCount: profile.visited_pois.length,
      });

      return JSON.stringify({
        ...profile,
        _meta: { found: true },
      });
    } catch (e) {
      console.warn("👤 [玩家画像] 工具错误:", e);
      return JSON.stringify({
        ...DEFAULT_PROFILE,
        _meta: {
          found: false,
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
    name: "get_player_profile",
    description:
      "获取玩家的历史画像和偏好。包含：画像描述、喜欢的标签、不喜欢的标签、去过的地方。用于个性化推荐。",
    schema: z.object({
      playerKey: z.string().describe("玩家唯一标识，如 user_abc123"),
    }),
  }
);

/**
 * 玩家画像结果（包含元数据）
 */
export interface PlayerProfileResult extends PlayerProfile {
  _meta: {
    found: boolean;
    error?: {
      type: string;
      message: string;
      retryable: boolean;
    };
  };
}

/**
 * 类型化的玩家画像获取函数（供节点直接调用）
 */
export async function getPlayerProfileTyped(
  playerKey: string
): Promise<ToolOutput<PlayerProfileResult>> {
  try {
    const raw = await getPlayerProfileTool.invoke({ playerKey });
    const parsed = JSON.parse(raw) as PlayerProfileResult;
    return createSuccessResult(parsed);
  } catch (e) {
    return createErrorResult(
      "PARSE_ERROR",
      e instanceof Error ? e.message : String(e),
      false
    );
  }
}
