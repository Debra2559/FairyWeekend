import type { VenueKind } from "@/components/VenueIcon";

/** 判断该场所类型是否建议提前预约 */
export function needsReservation(kind: VenueKind): boolean {
  return [
    "restaurant",
    "bar",
    "spa",
    "museum",
    "gallery",
    "cinema",
    "temple",
  ].includes(kind);
}

/** 返回预约提示文案 */
export function getReservationHint(kind: VenueKind): string {
  const map: Record<string, string> = {
    restaurant: "餐厅高峰期建议提前订座，避免排队",
    bar: "热门酒吧周末常满座，建议提前预约",
    spa: "理疗时段紧张，建议提前锁定心仪时间",
    museum: "热门展览限流入场，建议提前购票预约",
    gallery: "特展期间建议预约参观时段",
    cinema: "黄金场次座位紧俏，建议提前选座购票",
    temple: "节假日香火旺盛，建议错峰或提前预约",
  };
  return map[kind] ?? "建议提前确认是否需要预约";
}

/** 返回预约标签文案 */
export function getReservationLabel(kind: VenueKind): string {
  const map: Record<string, string> = {
    restaurant: "订座",
    bar: "预约",
    spa: "预约",
    museum: "购票",
    gallery: "预约",
    cinema: "购票",
    temple: "预约",
  };
  return map[kind] ?? "预约";
}

/** 构建美团搜索链接（尽量接近店铺） */
export function buildMeituanReserveHref(keyword: string, city?: string): string {
  const q = city ? `${city} ${keyword}` : keyword;
  return `https://i.meituan.com/s/${encodeURIComponent(q)}`;
}

/** 构建大众点评搜索链接 */
export function buildDianpingReserveHref(keyword: string, city?: string): string {
  const q = city ? `${city} ${keyword}` : keyword;
  return `https://m.dianping.com/search/keyword?keyword=${encodeURIComponent(q)}`;
}

/** 构建高德地图导航链接 */
export function buildAmapHref(name: string, city?: string): string {
  const q = city ? `${city}${name}` : name;
  return `https://uri.amap.com/marker?name=${encodeURIComponent(q)}&src=todaypersona&coordinate=gaode&callnative=1`;
}
