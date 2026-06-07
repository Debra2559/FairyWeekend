/**
 * adjust-journey
 * 接收当前 journey + 用户自然语言请求，使用 Agent 调整行程
 */

import { runJourneyAdjuster } from "../_shared/agent/agents/journey-adjuster.agent.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { card, city, journey, request, history = [] } = body ?? {};

    if (!journey?.scenes || !request) {
      return new Response(JSON.stringify({ error: "missing fields: journey.scenes or request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 调用 Agent
    const result = await runJourneyAdjuster({
      journey,
      request,
      city: city || "未指定",
      card,
      history,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[adjust-journey]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
