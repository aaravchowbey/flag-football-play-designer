import { isBrowser } from "@/features/play-designer/utils";

/**
 * Offers a simple JSON download anchored to a temporary <a> element.
 */
export function downloadJson(filename: string, payload: unknown): void {
  if (!isBrowser) return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export interface ExportSvgOptions {
  readonly fileName: string;
  readonly background?: string;
  readonly scale?: number;
}

/**
 * Converts an in-memory SVG node to a PNG by drawing it to a temporary canvas. Resolves once the download has been triggered.
 */
export async function exportSvgToPng(
  svg: SVGSVGElement,
  { fileName, background = "#ffffff", scale }: ExportSvgOptions,
): Promise<void> {
  if (!isBrowser) return;
  const rect = svg.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  if (!width || !height) return;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  const { baseVal } = svg.viewBox;
  clone.setAttribute("width", `${width}`);
  clone.setAttribute("height", `${height}`);
  clone.setAttribute("viewBox", `${baseVal.x} ${baseVal.y} ${baseVal.width} ${baseVal.height}`);
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(clone);
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  await new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const pixelScale = scale ?? window.devicePixelRatio ?? 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * pixelScale);
      canvas.height = Math.round(height * pixelScale);
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        resolve();
        return;
      }
      context.save();
      context.scale(pixelScale, pixelScale);
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      context.restore();
      canvas.toBlob((blob) => {
        if (blob) {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(link.href);
        }
        URL.revokeObjectURL(url);
        resolve();
      }, "image/png");
    };
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}
