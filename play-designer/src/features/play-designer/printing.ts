import type { PrintConfig, WristConfig } from "@/features/play-designer/types";
import { getPaperSizeIn } from "@/features/play-designer/utils";

/**
 * Generates the CSS rules injected into both the design canvas and the printable pop-up.
 * Keeping this logic in one place makes it easier to tweak margins and preserve parity across views.
 */
export function buildPrintStyles(printCfg: PrintConfig, wristCfg: WristConfig): string {
  const paperSize = getPaperSizeIn(printCfg);
  const cardWidth = Math.max(1, wristCfg.widthIn || 3);
  const cardHeight = Math.max(1, wristCfg.heightIn || 4);
  const pageSize =
    printCfg.paper === "letter"
      ? "8.5in 11in"
      : printCfg.paper === "a4"
      ? "210mm 297mm"
      : `${printCfg.customW}in ${printCfg.customH}in`;

  const margin = `${printCfg.marginIn}in`;

  return `
  :root {
    --wrist-card-width: ${cardWidth}in;
    --wrist-card-height: ${cardHeight}in;
  }
  @page { size: ${pageSize}; margin: ${margin}; }
  .wrist-preview-wrapper { display: inline-block; transform-origin: top left; }
  .wrist-page { width: ${paperSize.widthIn}in; height: ${paperSize.heightIn}in; margin: 0 auto; position: relative; display: flex; align-items: center; justify-content: center; }
  .wrist-card { width: var(--wrist-card-width); height: var(--wrist-card-height); box-sizing: border-box; display: flex; align-items: center; justify-content: center; }
  body.wrist-print-body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #ffffff; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-grid { display: grid; grid-template-columns: repeat(${printCfg.perRow}, 1fr); gap: 12px; }
    .print-grid.with-titles .title { font-weight: 600; margin-bottom: 6px; font-size: 12pt; }
    .print-card { break-inside: avoid; page-break-inside: avoid; }
    .wrist-preview-wrapper { transform: none !important; }
    .wrist-preview-container { border: none !important; background: transparent !important; box-shadow: none !important; padding: 0 !important; }
    .wrist-card { border-style: dashed !important; border-width: 3px !important; border-color: #111827 !important; background: #ffffff !important; }
  }
  `;
}
