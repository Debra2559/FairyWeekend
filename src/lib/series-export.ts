/**
 * 一键生成「连载故事书」PDF
 * 在隐藏 DOM 中渲染 PrintableSeries，使用 html2canvas + jsPDF 输出
 */
import { createRoot } from "react-dom/client";
import type { ArchivedChapter } from "@/lib/persona-store";
import { PrintableSeries } from "@/components/PrintableSeries";

export async function exportSeriesStorybook(
  chapters: ArchivedChapter[],
  mode: "download" | "share" = "download",
): Promise<"shared" | "downloaded"> {
  if (chapters.length === 0) {
    throw new Error("还没有可生成的章节");
  }

  // 离屏容器
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:760px;background:#fdfaf6;pointer-events:none;";
  const inner = document.createElement("div");
  inner.style.cssText =
    "padding:48px 44px;color:#6f5850;font-family:var(--font-cn-serif), serif;";
  host.appendChild(inner);
  document.body.appendChild(host);

  const root = createRoot(inner);
  try {
    root.render(<PrintableSeries chapters={chapters} />);

    // 等渲染 + 图片加载
    await new Promise((r) => setTimeout(r, 350));
    const imgs = Array.from(inner.querySelectorAll("img"));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
            // 兜底超时
            setTimeout(() => resolve(), 4000);
          }),
      ),
    );

    const { elementToPdfBlob, downloadBlob, shareOrDownload } = await import(
      "@/lib/export-pdf"
    );
    const blob = await elementToPdfBlob(inner);
    const filename = `今日人设_连载故事书_${chapters.length}章.pdf`;
    const title = `今日人设 · 连载故事书`;
    if (mode === "share") {
      const result = await shareOrDownload(blob, filename, title, "我的今日人设连载");
      return result === "downloaded" ? "downloaded" : "shared";
    }
    await downloadBlob(blob, filename);
    return "downloaded";
  } finally {
    setTimeout(() => {
      try {
        root.unmount();
      } catch {}
      host.remove();
    }, 0);
  }
}
