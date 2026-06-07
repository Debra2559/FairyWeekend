import { useEffect, useRef, useState } from "react";
import { getAmapKey } from "@/lib/map.functions";
import type { ArchivedChapter } from "@/lib/persona-store";

declare global {
  interface Window {
    AMap?: any;
    __amapLoading?: Promise<any>;
  }
}

const CACHE_KEY = "todaypersona:geocache:v1";

type GeoCache = Record<string, { lng: number; lat: number }>;

function loadCache(): GeoCache {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
}
function saveCache(cache: GeoCache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

function loadAmap(key: string): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.AMap) return Promise.resolve(window.AMap);
  if (window.__amapLoading) return window.__amapLoading;
  window.__amapLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.PlaceSearch,AMap.Geocoder`;
    script.async = true;
    script.onload = () => resolve(window.AMap);
    script.onerror = () => reject(new Error("Amap load failed"));
    document.head.appendChild(script);
  });
  return window.__amapLoading;
}

interface Pin {
  name: string;
  city?: string;
  isLatest: boolean;
  order?: number; // order within latest chapter for polyline
}

export function RouteOverviewMap({ sagas }: { sagas: ArchivedChapter[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [located, setLocated] = useState(0);
  const [totalPins, setTotalPins] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!containerRef.current) return;
      // Build pin list: unique by name; latest chapter has order
      const latest = sagas[0];
      const latestNames = new Map<string, number>();
      if (latest) {
        for (const s of latest.journey.scenes) {
          if (latest.completedSceneOrders.includes(s.order)) {
            latestNames.set(s.location_name, s.order);
          }
        }
      }
      const pinsMap = new Map<string, Pin>();
      for (const ch of sagas) {
        for (const s of ch.journey.scenes) {
          if (!ch.completedSceneOrders.includes(s.order)) continue;
          if (!pinsMap.has(s.location_name)) {
            pinsMap.set(s.location_name, {
              name: s.location_name,
              city: ch.city,
              isLatest: latestNames.has(s.location_name),
              order: latestNames.get(s.location_name),
            });
          }
        }
      }
      const pins = [...pinsMap.values()];
      setTotalPins(pins.length);
      if (pins.length === 0) { setStatus("empty"); return; }

      setStatus("loading");
      try {
        const { key } = await getAmapKey();
        if (!key) { setStatus("error"); return; }
        const AMap = await loadAmap(key);
        if (cancelled || !containerRef.current) return;

        const map = new AMap.Map(containerRef.current, {
          zoom: 11,
          viewMode: "2D",
          mapStyle: "amap://styles/whitesmoke",
        });

        const cache = loadCache();
        const placeSearch = new AMap.PlaceSearch({ pageSize: 1, pageIndex: 1 });
        const geocoder = new AMap.Geocoder({});

        function lookup(p: Pin): Promise<{ lng: number; lat: number } | null> {
          const k = `${p.city || ""}|${p.name}`;
          if (cache[k]) return Promise.resolve(cache[k]);
          return new Promise((resolve) => {
            const done = (lng?: number, lat?: number) => {
              if (typeof lng === "number" && typeof lat === "number") {
                cache[k] = { lng, lat };
                resolve(cache[k]);
              } else resolve(null);
            };
            try {
              placeSearch.setCity(p.city || "");
              placeSearch.search(p.name, (status_: string, result: any) => {
                if (status_ === "complete" && result?.poiList?.pois?.length) {
                  const poi = result.poiList.pois[0];
                  done(poi.location.lng, poi.location.lat);
                } else {
                  // fallback to geocoder
                  geocoder.getLocation(`${p.city || ""}${p.name}`, (s2: string, r2: any) => {
                    if (s2 === "complete" && r2?.geocodes?.length) {
                      const loc = r2.geocodes[0].location;
                      done(loc.lng, loc.lat);
                    } else done();
                  });
                }
              });
            } catch { done(); }
          });
        }

        const results: Array<{ pin: Pin; lng: number; lat: number }> = [];
        // Resolve sequentially in small batches to be gentle on quota
        for (let i = 0; i < pins.length; i++) {
          if (cancelled) return;
          const loc = await lookup(pins[i]);
          if (loc) {
            results.push({ pin: pins[i], ...loc });
            setLocated(results.length);
          }
          if (i % 5 === 4) saveCache(cache);
        }
        saveCache(cache);
        if (cancelled) return;

        if (results.length === 0) { setStatus("empty"); return; }

        // Markers
        const bounds: Array<[number, number]> = [];
        for (const r of results) {
          bounds.push([r.lng, r.lat]);
          const isLatest = r.pin.isLatest;
          const html = `<div style="
            transform: translate(-50%,-100%);
            display:flex;flex-direction:column;align-items:center;
            ">
            <div style="
              width:${isLatest ? 26 : 18}px;height:${isLatest ? 26 : 18}px;
              border-radius:50%;
              background:${isLatest ? "#7f4f5c" : "rgba(127,79,92,0.45)"};
              border:2px solid #fffaf2;
              box-shadow:0 4px 10px rgba(61,53,48,0.35);
              display:flex;align-items:center;justify-content:center;
              color:#fff;font-size:${isLatest ? 11 : 9}px;font-weight:600;
            ">${isLatest && r.pin.order != null ? r.pin.order : "·"}</div>
          </div>`;
          const marker = new AMap.Marker({
            position: [r.lng, r.lat],
            content: html,
            anchor: "bottom-center",
            title: r.pin.name,
          });
          map.add(marker);
        }

        // Polyline for latest chapter, in order
        const latestPts = results
          .filter((r) => r.pin.isLatest && r.pin.order != null)
          .sort((a, b) => (a.pin.order! - b.pin.order!))
          .map((r) => [r.lng, r.lat] as [number, number]);
        if (latestPts.length >= 2) {
          const polyline = new AMap.Polyline({
            path: latestPts,
            strokeColor: "#7f4f5c",
            strokeWeight: 3,
            strokeOpacity: 0.85,
            strokeStyle: "solid",
            lineJoin: "round",
            showDir: true,
          });
          map.add(polyline);
        }

        map.setFitView(undefined, false, [30, 30, 30, 30]);
        setStatus("ready");
      } catch (err) {
        console.warn("[overview map]", err);
        setStatus("error");
      }
    }
    init();
    return () => { cancelled = true; };
  }, [sagas]);

  return (
    <div className="mt-3 overflow-hidden rounded-[18px] border border-[#eee0d8] bg-white/60">
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="cn-serif text-[11px] text-[var(--ink-soft)]">
          打卡地图 · 最近一条路线高亮连线
        </div>
        <div className="cn-serif text-[10px] text-[var(--ink-soft)]">
          {status === "loading" && `定位中 ${located}/${totalPins}`}
          {status === "ready" && `已标 ${located} 个地点`}
          {status === "empty" && "暂无打卡点"}
          {status === "error" && "地图加载失败"}
        </div>
      </div>
      <div
        ref={containerRef}
        className="h-[200px] w-full bg-[#f4ede5]"
        style={{ minHeight: 200 }}
      />
    </div>
  );
}
