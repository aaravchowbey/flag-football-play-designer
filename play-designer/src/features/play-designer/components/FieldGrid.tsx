import { memo, useMemo } from "react";
import type { ReactElement } from "react";
import type { ColorHex } from "@/features/play-designer/types";
import { FIELD_CONSTANTS } from "@/features/play-designer/utils";

export interface FieldGridProps {
  readonly width: number;
  readonly height: number;
  readonly divisions: number;
  readonly lineOfScrimmage: number | null;
  readonly losColor?: ColorHex;
  readonly yardLineColor?: ColorHex;
}

/**
 * Stateless renderer for the field background + yard markers. Memoised to avoid re-computing the grid on every brush stroke.
 */
export const FieldGrid = memo(function FieldGrid({
  width,
  height,
  divisions,
  lineOfScrimmage,
  losColor = "#000000",
  yardLineColor = "#e2e8f0",
}: FieldGridProps) {
  const content = useMemo(() => {
    const verticalMargin = FIELD_CONSTANTS.FIELD_MARGIN_VERTICAL;
    const horizontalMargin = FIELD_CONSTANTS.FIELD_MARGIN_HORIZONTAL;
    const fieldHeight = height - verticalMargin * 2;
    const fieldWidth = width - horizontalMargin * 2;
    const safeDivisions = Math.max(1, Math.round(divisions));
    const losIndex =
      lineOfScrimmage === null || lineOfScrimmage === undefined
        ? null
        : safeDivisions - Math.min(Math.max(0, Math.round(lineOfScrimmage)), safeDivisions);
    const lines: ReactElement[] = [];
    for (let i = 0; i <= safeDivisions; i += 1) {
      const y = verticalMargin + (fieldHeight * i) / safeDivisions;
      const isLos = losIndex === i;
      const isFiveYardMarker = i % 5 === 0;
      lines.push(
        <line
          key={i}
          x1={horizontalMargin}
          y1={y}
          x2={width - horizontalMargin}
          y2={y}
          stroke={isLos ? losColor : yardLineColor}
          strokeWidth={isLos ? 4 : isFiveYardMarker ? 2 : 1}
        />,
      );
    }
    return (
      <g>
        <rect
          x={horizontalMargin}
          y={verticalMargin}
          width={fieldWidth}
          height={fieldHeight}
          fill="#f8fafc"
          stroke="#cbd5e1"
        />
        {lines}
      </g>
    );
  }, [divisions, height, lineOfScrimmage, losColor, yardLineColor, width]);

  return content;
});
