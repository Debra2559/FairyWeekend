import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const A4_W_MM = 210;
const A4_H_MM = 297;

/** Capture a DOM element and return a multi-page A4 PDF as Blob. */
export async function elementToPdfBlob(el: HTMLElement): Promise<Blob> {
  // Wait a microtask + paint so images settle
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  await new Promise((r) => setTimeout(r, 80));

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#fdfaf6",
    useCORS: true,
    logging: false,
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
  });

  const imgWidth = A4_W_MM;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pdf = new jsPDF("p", "mm", "a4");
  const imgData = canvas.toDataURL("image/jpeg", 0.9);

  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= A4_H_MM;
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= A4_H_MM;
  }
  return pdf.output("blob");
}

export function downloadBlob(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
  return url;
}

export async function elementToImageBlob(
  el: HTMLElement,
  type: "image/png" | "image/jpeg" = "image/png",
): Promise<Blob> {
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  await new Promise((r) => setTimeout(r, 80));

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#fdfaf6",
    useCORS: true,
    logging: false,
    windowWidth: el.scrollWidth,
  });

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, type === "image/jpeg" ? 0.9 : 0.95),
  );
  if (!blob) throw new Error("image export failed");
  return blob;
}

export async function shareImageOrDownload(
  blob: Blob,
  filename: string,
  title: string,
  text?: string,
): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], filename, { type: blob.type || "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (d: { files: File[] }) => boolean;
    share?: (d: { files?: File[]; title?: string; text?: string }) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title, text });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  downloadBlob(blob, filename);
  return "downloaded";
}

/** Try Web Share API with the PDF file. Falls back to download. */
export async function shareOrDownload(
  blob: Blob,
  filename: string,
  title: string,
  text?: string,
): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav = navigator as Navigator & {
    canShare?: (d: { files: File[] }) => boolean;
    share?: (d: { files?: File[]; title?: string; text?: string }) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title, text });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  downloadBlob(blob, filename);
  return "downloaded";
}
