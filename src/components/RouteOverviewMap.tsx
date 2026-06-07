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

interface Stop {
  chapterId: string;
  chapterIdx: number; // 0 = latest
  order: number;
  name: string;
  city?: string;
}

export type MapFocus =
  | { kind: "latest" }
  | { kind: "all" }
  | { kind: "city"; city: string }
  | { kind: "chapter"; chapterId: string };

export function RouteOverviewMap({
  sagas,
  focus = { kind: "latest" },
}: {
  sagas: ArchivedChapter[];
  focus?: MapFocus;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const AMapRef = useRef<any>(null);
  const locatedRef = useRef<Array<Stop & { lng: number; lat: number }>>([]);
  const focusRef = useRef<MapFocus>(focus);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [located, setLocated] = useState(0);
  const [totalPins, setTotalPins] = useState(0);

  function applyFocus(f: MapFocus) {
    const map = mapRef.current;
    const AMap = AMapRef.current;
    const pts = locatedRef.current;
    if (!map || !AMap || pts.length === 0) return;
    let target: typeof pts = [];
    if (f.kind === "latest") target = pts.filter((p) => p.chapterIdx === 0);
    else if (f.kind === "all") target = pts;
    else if (f.kind === "city") target = pts.filter((p) => (p.city || "") === f.city);
    else if (f.kind === "chapter") target = pts.filter((p) => p.chapterId === f.chapterId);
    if (target.length === 0) target = pts;
    try {
      const fitTargets = target.map((p) =>
        new AMap.Marker({ position: [p.lng, p.lat], map, content: "<div></div>" })
      );
      map.setFitView(fitTargets, false, [40, 40, 40, 40], 15);
      fitTargets.forEach((m: any) => map.remove(m));
    } catch {}
  }


  // Init (one-time per sagas change)
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!containerRef.current) return;

      const recent = sagas.slice(0, 6);
      const stops: Stop[] = [];
      recent.forEach((ch, idx) => {
        const completed = [...ch.completedSceneOrders].sort((a, b) => a - b);
        for (const ord of completed) {
          const scene = ch.journey.scenes.find((s) => s.order === ord);
          if (!scene) continue;
          stops.push({
            chapterId: ch.chapterId,
            chapterIdx: idx,
            order: ord,
            name: scene.location_name,
            city: ch.city,
          });
        }
      });

      const uniqKeys = new Set(stops.map((s) => `${s.city || ""}|${s.name}`));
      setTotalPins(uniqKeys.size);
      if (stops.length === 0) { setStatus("empty"); return; }

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
        mapRef.current = map;
        AMapRef.current = AMap;

        const cache = loadCache();
        const placeSearch = new AMap.PlaceSearch({ pageSize: 1, pageIndex: 1 });
        const geocoder = new AMap.Geocoder({});

        function lookup(name: string, city?: string): Promise<{ lng: number; lat: number } | null> {
          const k = `${city || ""}|${name}`;
          if (cache[k]) return Promise.resolve(cache[k]);
          return new Promise((resolve) => {
            let settled = false;
            const done = (lng?: number, lat?: number) => {
              if (settled) return;
              settled = true;
              if (typeof lng === "number" && typeof lat === "number") {
                cache[k] = { lng, lat };
                resolve(cache[k]);
              } else resolve(null);
            };
            // Safety net: if AMap callbacks never fire, fail this entry in 4s
            const t = setTimeout(() => done(), 4000);
            const finish = (lng?: number, lat?: number) => { clearTimeout(t); done(lng, lat); };
            try {
              try { placeSearch.setCity(city || ""); } catch {}
              placeSearch.search(name, (status_: string, result: any) => {
                if (status_ === "complete" && result?.poiList?.pois?.length) {
                  const poi = result.poiList.pois[0];
                  finish(poi.location.lng, poi.location.lat);
                } else {
                  geocoder.getLocation(`${city || ""}${name}`, (s2: string, r2: any) => {
                    if (s2 === "complete" && r2?.geocodes?.length) {
                      const loc = r2.geocodes[0].location;
                      finish(loc.lng, loc.lat);
                    } else finish();
                  });
                }
              });
            } catch { finish(); }
          });
        }


        let locatedCount = 0;
        const uniqList = [...uniqKeys];
        const coordMap = new Map<string, { lng: number; lat: number }>();
        for (let i = 0; i < uniqList.length; i++) {
          if (cancelled) return;
          const [city, name] = uniqList[i].split("|");
          const loc = await lookup(name, city);
          if (loc) {
            coordMap.set(uniqList[i], loc);
            locatedCount += 1;
            setLocated(locatedCount);
          }
          if (i % 5 === 4) saveCache(cache);
        }
        saveCache(cache);
        if (cancelled) return;

        const locatedStops: Array<Stop & { lng: number; lat: number }> = [];
        for (const s of stops) {
          const c = coordMap.get(`${s.city || ""}|${s.name}`);
          if (c) locatedStops.push({ ...s, ...c });
        }
        if (locatedStops.length === 0) { setStatus("empty"); return; }
        locatedRef.current = locatedStops;

        const byChapter = new Map<string, Array<typeof locatedStops[number]>>();
        for (const s of locatedStops) {
          if (!byChapter.has(s.chapterId)) byChapter.set(s.chapterId, []);
          byChapter.get(s.chapterId)!.push(s);
        }
        for (const arr of byChapter.values()) arr.sort((a, b) => a.order - b.order);

        for (const [, arr] of byChapter) {
          if (arr.length < 2) continue;
          const isLatest = arr[0].chapterIdx === 0;
          const polyline = new AMap.Polyline({
            path: arr.map((p) => [p.lng, p.lat]),
            strokeColor: isLatest ? "#7f4f5c" : "#b89b96",
            strokeWeight: isLatest ? 4 : 2.5,
            strokeOpacity: isLatest ? 0.95 : 0.55,
            lineJoin: "round",
            lineCap: "round",
            zIndex: isLatest ? 50 : 30,
          });
          map.add(polyline);
        }

        const seenName = new Set<string>();
        for (const s of locatedStops) {
          const isLatest = s.chapterIdx === 0;
          const key = `${s.chapterId}-${s.name}`;
          if (!isLatest) {
            if (seenName.has(s.name)) continue;
            seenName.add(s.name);
          }
          const html = `<div style="transform:translate(-50%,-100%);">
            <div style="
              width:${isLatest ? 26 : 14}px;height:${isLatest ? 26 : 14}px;
              border-radius:50%;
              background:${isLatest ? "#7f4f5c" : "rgba(127,79,92,0.55)"};
              border:2px solid #fffaf2;
              box-shadow:0 4px 10px rgba(61,53,48,0.35);
              display:flex;align-items:center;justify-content:center;
              color:#fff;font-size:${isLatest ? 11 : 0}px;font-weight:700;
            ">${isLatest ? s.order : ""}</div>
          </div>`;
          const marker = new AMap.Marker({
            position: [s.lng, s.lat],
            content: html,
            anchor: "bottom-center",
            title: s.name,
            zIndex: isLatest ? 100 : 60,
            extData: key,
          });
          map.add(marker);
        }

        applyFocus(focus);
        setStatus("ready");
      } catch (err) {
        console.warn("[overview map]", err);
        setStatus("error");
      }
    }
    init();
    return () => {
      cancelled = true;
      try { mapRef.current?.destroy?.(); } catch {}
      mapRef.current = null;
      locatedRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sagas]);

  // Re-fit when focus changes
  useEffect(() => {
    if (status === "ready") applyFocus(focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus.kind, (focus as any).city, (focus as any).chapterId, status]);

  const focusHint =
    focus.kind === "latest"
      ? "聚焦：最近一条路线"
      : focus.kind === "all"
        ? "聚焦：全部路线"
        : focus.kind === "city"
          ? `聚焦：${focus.city || "城市"}`
          : "聚焦：选中的路线";

  return (
    <div className="mt-3 overflow-hidden rounded-[18px] border border-[#eee0d8] bg-white/60">
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="cn-serif text-[11px] text-[var(--ink-soft)]">{focusHint}</div>
        <div className="cn-serif text-[10px] text-[var(--ink-soft)]">
          {status === "loading" && `定位中 ${located}/${totalPins}`}
          {status === "ready" && `已标 ${located} 个地点`}
          {status === "empty" && "暂无打卡点"}
          {status === "error" && "地图加载失败"}
        </div>
      </div>
      <div
        ref={containerRef}
        className="h-[220px] w-full bg-[#f4ede5]"
        style={{ minHeight: 220 }}
      />
    </div>
  );
}
