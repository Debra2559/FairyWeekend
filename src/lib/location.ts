import { toSimplified } from "@/lib/zh-simplify";

export interface AutoLocationResult {
  lat: number;
  lng: number;
  city: string;
  name: string;
}

function getPosition(highAccuracy: boolean, timeout: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: highAccuracy,
      timeout,
      maximumAge: 600000,
    });
  });
}

async function getStablePosition(): Promise<GeolocationPosition> {
  try {
    return await getPosition(false, 8000);
  } catch (error) {
    const geoError = error as GeolocationPositionError;
    if (geoError.code === 2 || geoError.code === 3) {
      return await getPosition(true, 15000);
    }
    throw error;
  }
}

async function reverseLookup(lat: number, lng: number): Promise<{ city: string; name: string }> {
  let name = "";
  let city = "";
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=zh-CN&zoom=12`,
      { headers: { Accept: "application/json" } },
    );
    const data = await response.json();
    const address = data.address || {};
    city = address.city || address.town || address.county || address.state || "";
    const parts = [address.state, city, address.city_district || address.district || address.suburb].filter(Boolean);
    name = Array.from(new Set(parts)).join(" · ");
  } catch {
    // Fallback below.
  }

  if (!name) {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=zh-CN`,
    );
    const data = await response.json();
    city = data.city || data.locality || city;
    const parts = [
      data.principalSubdivision,
      city,
      data.localityInfo?.administrative?.find((item: { adminLevel?: number; name?: string }) => item.adminLevel === 6)?.name,
    ].filter(Boolean);
    name = Array.from(new Set(parts)).join(" · ") || city || "我的位置";
  }

  return {
    city: toSimplified(city),
    name: toSimplified(name),
  };
}

export async function resolveCurrentLocation(): Promise<AutoLocationResult> {
  if (!navigator.geolocation) {
    throw new Error("浏览器不支持定位");
  }
  const position = await getStablePosition();
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  try {
    const resolved = await reverseLookup(lat, lng);
    return {
      lat,
      lng,
      city: resolved.city,
      name: resolved.name || `我的位置（${lat.toFixed(3)}, ${lng.toFixed(3)}）`,
    };
  } catch {
    return {
      lat,
      lng,
      city: "",
      name: `我的位置（${lat.toFixed(3)}, ${lng.toFixed(3)}）`,
    };
  }
}

export function locationErrorMessage(error: unknown): string {
  const inIframe = typeof window !== "undefined" && window.self !== window.top;
  const geoError = error as GeolocationPositionError;
  if (geoError?.code === 1) return inIframe ? "预览窗口禁止了定位权限（在新标签页打开后可用）" : "你拒绝了定位权限";
  if (geoError?.code === 2) return "暂时拿不到位置信号，可以手动选一个城市";
  if (geoError?.code === 3) return "定位超时，可以手动选一个城市";
  return error instanceof Error ? error.message : "定位失败";
}
