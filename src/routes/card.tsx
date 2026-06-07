import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { loadPendingCard, startRun } from "@/lib/persona-store";
import { RARITY_LABEL } from "@/lib/cards";
import type { PersonaCard, Journey } from "@/lib/persona-types";
import { supabase } from "@/integrations/supabase/client";
import {
  getUserPhoto,
  subscribeUserPhoto,
  getPersonalizedCard,
  setPersonalizedCard,
  clearPersonalizedCard,
} from "@/lib/user-photo";
import { toSimplified } from "@/lib/zh-simplify";
import { pickEmoji } from "@/lib/text-emoji";

export const Route = createFileRoute("/card")({ component: CardPage });

function MetaRow({ label, value }: { label: string; value: string }) {
  const emoji = pickEmoji(value);
  return (
    <div className="flex gap-3 items-baseline">
      <span className="display italic text-[10.5px] tracking-[0.25em] text-[var(--ink-soft)] shrink-0 w-20">
        {label}
      </span>
      <span className="cn-serif text-[13.5px] text-[var(--ink)] leading-relaxed">
        {value}
        {emoji && <span className="ml-1.5 text-[14px] align-[-1px]">{emoji}</span>}
      </span>
    </div>
  );
}

const LOADING_LINES = [
  "正在打开今日的剧本……",
  "AI 正在用这个人设的眼睛重新看城市……",
  "在 3 公里内找一个有故事感的角落……",
  "翻一翻街角那些被忽略的小店……",
  "听听这条街此刻的呼吸声……",
  "给今天的你挑一束合适的光……",
  "在地图上画一条只属于今天的路线……",
  "想象 TA 推门进去会点哪杯咖啡……",
  "把巷口的风、椅子的影子都算进去……",
  "翻看本地人才知道的隐藏坐标……",
  "为你预留一个刚刚好的下午……",
  "把这一天写成一段小说……",
];

const CITY_PRESETS = [
  "北京", "上海", "广州", "深圳", "杭州", "成都",
  "南京", "苏州", "重庆", "武汉", "西安", "厦门",
];
const CITY_MORE = [
  "天津", "青岛", "长沙", "郑州", "济南", "合肥",
  "福州", "宁波", "无锡", "佛山", "东莞", "珠海",
  "昆明", "大连", "沈阳", "哈尔滨", "长春", "石家庄",
  "南昌", "贵阳", "南宁", "海口", "三亚", "兰州",
  "太原", "呼和浩特", "乌鲁木齐", "拉萨", "银川", "西宁",
  "温州", "嘉兴", "绍兴", "金华", "泉州", "中山",
  "惠州", "汕头", "桂林", "丽江", "大理", "香港", "澳门",
];


function CardPage() {
  const navigate = useNavigate();
  const [card, setCard] = useState<PersonaCard | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [locating, setLocating] = useState(false);
  const [autoLocated, setAutoLocated] = useState(false);
  const [locatedName, setLocatedName] = useState<string | null>(null);
  const [hasCoords, setHasCoords] = useState(false);
  const [needLocationHint, setNeedLocationHint] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [userPhoto, setUserPhotoState] = useState<string | null>(null);
  const [showMoreCities, setShowMoreCities] = useState(false);
  const [personalCover, setPersonalCover] = useState<string | null>(null);
  const [personalizing, setPersonalizing] = useState(false);
  const [personalizeErr, setPersonalizeErr] = useState<string | null>(null);

  useEffect(() => {
    setUserPhotoState(getUserPhoto());
    return subscribeUserPhoto(setUserPhotoState);
  }, []);

  useEffect(() => {
    if (card) setPersonalCover(getPersonalizedCard(card.id));
  }, [card]);

  async function urlToDataUrl(url: string): Promise<string> {
    if (url.startsWith("data:")) return url;
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  async function handlePersonalize() {
    if (!card || !userPhoto) return;
    setPersonalizing(true);
    setPersonalizeErr(null);
    try {
      const coverDataUrl = card.cover ? await urlToDataUrl(card.cover) : "";
      const res = await fetch("/api/public/personalize-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPhoto,
          cardCover: coverDataUrl,
          identity: card.identity,
          mood: card.mood,
          illustration_keyword: card.illustration_keyword,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `合成失败 (${res.status})`);
      }
      const { image } = (await res.json()) as { image: string };
      setPersonalizedCard(card.id, image);
      setPersonalCover(image);
    } catch (e) {
      setPersonalizeErr(e instanceof Error ? e.message : "合成失败");
    } finally {
      setPersonalizing(false);
    }
  }
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const c = loadPendingCard();
    if (!c) { navigate({ to: "/" }); return; }
    setCard(c);
  }, [navigate]);

  function handleAutoLocate() {
    if (!navigator.geolocation) {
      setError("浏览器不支持定位，挑一个城市吧");
      return;
    }
    const inIframe = typeof window !== "undefined" && window.self !== window.top;
    setLocating(true);
    setError(null);
    setNeedLocationHint(false);
    setLocatedName(null);

    // 并行策略：先要一个 10 分钟内的缓存定位（瞬时返回），同时启动高精度真实定位。
    // 谁先成功就用谁，避免手机端等 GPS 锁定的几秒空白。
    let settled = false;
    const finish = (pos: GeolocationPosition) => {
      if (settled) return;
      settled = true;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      coordsRef.current = { lat, lng };
      setHasCoords(true);
      setAutoLocated(true);
      setCity("");
      setLocating(false);
      setLocatedName("正在识别…");
      // 反向地理编码不阻塞主流程，失败也已经拿到坐标
      void reverseGeocode(lat, lng);
    };

    const fail = (err: GeolocationPositionError) => {
      if (settled) return;
      settled = true;
      setLocating(false);
      const reason =
        err.code === 1 ? (inIframe ? "预览窗口禁止了定位权限（在新标签页打开后可用）" : "你拒绝了定位权限")
        : err.code === 2 ? "暂时拿不到位置信号，可以手动选一个城市"
        : err.code === 3 ? "定位超时，可以手动选一个城市"
        : "定位失败";
      setError(reason);
    };

    // 1) 先要缓存（5分钟内），低精度即可 —— 通常 <100ms 返回
    navigator.geolocation.getCurrentPosition(
      finish,
      () => { /* 缓存失败不上报，让高精度兜底 */ },
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 300000 },
    );

    // 2) 同时启动高精度真实定位，兜底
    navigator.geolocation.getCurrentPosition(
      finish,
      fail,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  async function reverseGeocode(lat: number, lng: number) {
    try {
      // 先用 BigDataCloud（无需 key、CDN 节点多，国内更快）
      let name = "";
      let cityName = "";
      try {
        const r = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=zh-CN`,
        );
        const j = await r.json();
        cityName = j.city || j.locality || "";
        const parts = [
          j.principalSubdivision,
          cityName,
          j.localityInfo?.administrative?.find((a: { adminLevel?: number; name?: string }) => a.adminLevel === 6)?.name,
        ].filter(Boolean);
        name = Array.from(new Set(parts)).join(" · ");
      } catch { /* fallback */ }

      if (!name) {
        const r2 = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=zh-CN&zoom=12`,
          { headers: { Accept: "application/json" } },
        );
        const j2 = await r2.json();
        const a = j2.address || {};
        cityName = a.city || a.town || a.county || a.state || cityName;
        const parts = [a.state, cityName, a.city_district || a.district || a.suburb].filter(Boolean);
        name = Array.from(new Set(parts)).join(" · ") || cityName || "我的位置";
      }
      setLocatedName(toSimplified(name));
      if (cityName) setCity(toSimplified(cityName));
    } catch {
      setLocatedName(`我的位置（${lat.toFixed(3)}, ${lng.toFixed(3)}）`);
    }
  }



  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => setLoadingIdx((i) => (i + 1) % LOADING_LINES.length), 1800);
    return () => clearInterval(t);
  }, [generating]);

  // 是否已经选好"今天在哪"：有手动城市，或定位拿到了坐标
  const hasLocation = Boolean(city.trim()) || hasCoords;

  async function handleStart() {
    if (!card) return;
    if (locating) {
      setNeedLocationHint(true);
      setError("正在定位中，稍等一下…");
      return;
    }
    if (!hasLocation) {
      setNeedLocationHint(true);
      setError("先告诉故事一下：你今天在哪？用上面的定位，或挑一个城市。");
      // 滚动到城市选择区域
      if (typeof document !== "undefined") {
        document.getElementById("city-picker")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    setGenerating(true);
    setError(null);
    setNeedLocationHint(false);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quest-agent", {
        body: {
          card,
          city: city.trim(),
          lat: coordsRef.current?.lat,
          lng: coordsRef.current?.lng,
          time_period: inferTimePeriod(),
        },
      });
      if (error) throw error;
      const journey = (data as { journey?: Journey })?.journey;
      const resolvedCity = (data as { city?: string })?.city;
      if (!journey) throw new Error("空响应");
      startRun(card, journey, resolvedCity);
      navigate({ to: "/journey" });
    } catch (e) {
      console.error(e);
      setError("生成失败，再试一次试试？");
      setGenerating(false);
    }
  }


  if (!card) return null;
  const [a, b, c] = card.colors;

  return (
    <div className="min-h-screen px-5 pt-10 pb-16 max-w-xl mx-auto fade-up">
      <button
        onClick={() => navigate({ to: "/" })}
        className="display text-[11px] tracking-[0.3em] text-[var(--ink-soft)] mb-6"
      >
        ← 再抽一次
      </button>

      <div className="persona-card relative" data-rarity={card.rarity}>
        <div
          className="relative aspect-[4/5] w-full overflow-hidden"
          style={
            card.cover
              ? undefined
              : { background: `linear-gradient(160deg, ${a} 0%, ${b} 100%)` }
          }
        >
          {personalCover ? (
            <img src={personalCover} alt={card.identity} className="absolute inset-0 w-full h-full object-cover" />
          ) : card.cover ? (
            <img src={card.cover} alt={card.identity} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div
              className="absolute inset-0 opacity-70"
              style={{
                background: `radial-gradient(circle at 20% 30%, ${c} 0%, transparent 50%), radial-gradient(circle at 80% 70%, ${a} 0%, transparent 55%)`,
              }}
            />
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />
          <div className="absolute top-4 left-4 rarity-chip" data-rarity={card.rarity}>
            ✦ {card.rarity} · {RARITY_LABEL[card.rarity]}
          </div>
          {personalCover && (
            <div className="absolute top-4 right-4 display italic text-[10.5px] tracking-[0.25em] text-white/90 drop-shadow bg-black/30 rounded-full px-2.5 py-1">
              ✦ YOU
            </div>
          )}
          <div className="absolute bottom-4 right-4 display italic text-sm text-white/90 drop-shadow">
            {card.id.replace("card_", "No.")}
          </div>
        </div>



        <div className="p-7">
          <div className="cn-serif text-[11px] tracking-[0.3em] text-[var(--ink-soft)]">
            今日的你是
          </div>
          <h2 className="cn-serif text-[26px] leading-snug mt-2 text-[var(--ink)]">
            {card.identity}
          </h2>

          <div className="mt-6 cn-serif text-[11px] tracking-[0.3em] text-[var(--ink-soft)]">
            MOOD
          </div>
          <p className="cn-serif text-[15px] text-[var(--ink)] mt-1">{card.mood}</p>

          <div className="mt-5 cn-serif text-[11px] tracking-[0.3em] text-[var(--ink-soft)]">
            MISSION
          </div>
          <p className="cn-serif text-[16px] italic text-[var(--ink)] mt-1">
            「{card.mission}」
          </p>

          {card.catchphrase && (
            <p className="mt-5 cn-serif text-[15px] italic text-[var(--ink)] leading-relaxed border-l-2 border-[var(--primary)] pl-3">
              「{card.catchphrase}」
            </p>
          )}

          {card.story && (
            <>
              <div className="mt-6 cn-serif text-[11px] tracking-[0.3em] text-[var(--ink-soft)]">
                STORY
              </div>
              <p className="cn-serif text-[14.5px] leading-relaxed text-[var(--ink)] mt-2">
                {card.story}
              </p>
            </>
          )}

          {card.keywords && card.keywords.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {card.keywords.map((k) => (
                <span
                  key={k}
                  className="px-2.5 py-1 rounded-full bg-[var(--muted)] cn-serif text-[11.5px] text-[var(--ink-soft)]"
                >
                  #{k}
                </span>
              ))}
            </div>
          )}

          {(card.best_time || card.companion || card.soundtrack || card.avoid || card.gift_from_city) && (
            <div className="mt-6 grid grid-cols-1 gap-3">
              {card.best_time && (
                <MetaRow label="推荐时段" value={card.best_time} />
              )}
              {card.companion && (
                <MetaRow label="同行建议" value={card.companion} />
              )}
              {card.soundtrack && (
                <MetaRow label="今日 BGM" value={card.soundtrack} />
              )}
              {card.avoid && (
                <MetaRow label="今天别做" value={card.avoid} />
              )}
              {card.gift_from_city && (
                <MetaRow label="城市赠礼" value={card.gift_from_city} />
              )}
            </div>
          )}

          {card.routes && card.routes.length > 0 && (
            <>
              <div className="mt-6 cn-serif text-[11px] tracking-[0.3em] text-[var(--ink-soft)]">
                POSSIBLE ROUTES
              </div>
              <ul className="mt-2 space-y-1.5">
                {card.routes.map((r, i) => {
                  const emoji = pickEmoji(r);
                  return (
                    <li
                      key={i}
                      className="cn-serif text-[14px] text-[var(--ink)] leading-relaxed flex gap-2"
                    >
                      <span className="display italic text-[var(--ink-soft)] shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>
                        {r}
                        {emoji && <span className="ml-1.5 text-[15px] align-[-1px]">{emoji}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* 个性化入口已移至「开始今日剧情」按钮上方 */}


      {/* City picker */}
      <div
        id="city-picker"
        className={`mt-8 rounded-3xl transition-all ${
          needLocationHint && !hasLocation
            ? "ring-2 ring-[oklch(0.7_0.15_25)] ring-offset-4 ring-offset-[var(--bg)] p-4 -m-4"
            : ""
        }`}
      >
        <label className="cn-serif text-[11px] tracking-[0.3em] text-[var(--ink-soft)] block mb-3">
          你今天在哪 <span className="text-[oklch(0.65_0.18_25)]">*</span>
        </label>

        <button
          onClick={handleAutoLocate}
          disabled={locating}
          className={`w-full mb-3 px-4 py-3 rounded-2xl border cn-serif text-[14px] flex items-center justify-center gap-2 transition ${
            autoLocated
              ? "bg-[var(--ink)] text-[var(--card)] border-[var(--ink)]"
              : "bg-[var(--card)] border-[var(--border)] text-[var(--ink)] hover:bg-[var(--muted)]"
          }`}
        >
          {locating ? "定位中…" : autoLocated ? `✓ ${locatedName ?? "已用我当前的位置"}` : "📍 用我现在的位置"}
        </button>

        <div className="text-[11px] cn-serif text-[var(--ink-soft)] mb-2 text-center">
          或挑一个城市
        </div>
        <div className="flex flex-wrap gap-2">
          {[...CITY_PRESETS, ...(showMoreCities ? CITY_MORE : [])].map((c) => {
            const active = city === c && !autoLocated;
            return (
              <button
                key={c}
                onClick={() => {
                  setCity(c);
                  setAutoLocated(false);
                  setLocatedName(null);
                  coordsRef.current = null;
                  setHasCoords(false);
                  setNeedLocationHint(false);
                  if (error) setError(null);
                }}
                className={`chip ${active ? "is-active" : ""}`}
              >
                {c}
              </button>
            );
          })}
          <button
            onClick={() => setShowMoreCities((v) => !v)}
            className="chip"
            style={{ borderStyle: "dotted" }}
          >
            {showMoreCities ? "收起 ▲" : `查看更多 (${CITY_MORE.length}) ▾`}
          </button>
        </div>
      </div>



      {error && (
        <div className="mt-5 px-4 py-3 rounded-2xl bg-[oklch(0.95_0.05_25)] cn-serif text-sm text-[oklch(0.4_0.15_25)]">
          {error}
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        <button onClick={handleStart} disabled={generating || locating} className="btn-soft w-full justify-center">
          {generating ? (
            <span className="cursor-blink">{LOADING_LINES[loadingIdx]}</span>
          ) : locating ? (
            <span className="opacity-80">📍 正在确认你在哪…</span>
          ) : (
            "开始今日剧情 →"
          )}
        </button>
        {!generating && !locating && (
          <button onClick={() => navigate({ to: "/" })} className="btn-ghost">
            再抽一次
          </button>
        )}
      </div>

    </div>
  );
}

function inferTimePeriod(): string {
  const h = new Date().getHours();
  if (h < 6) return "深夜";
  if (h < 11) return "早晨";
  if (h < 14) return "正午";
  if (h < 18) return "下午";
  if (h < 21) return "黄昏";
  return "夜里";
}
