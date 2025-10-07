import { memo } from "react";
import {
  ELEMENT_TYPE,
  type Play,
  type PlayElement,
  type PlayerElement,
} from "@/features/play-designer/types";
import { computeFieldSize, FIELD_CONSTANTS } from "@/features/play-designer/utils";
import { FieldGrid } from "@/features/play-designer/components/FieldGrid";

interface PlayThumbProps {
  readonly play: Play;
  readonly className?: string;
}

/**
 * Lightweight SVG preview for the wrist coach and list views.
 */
export const PlayThumb = memo(function PlayThumb({ play, className }: PlayThumbProps) {
  const widthUnits = Math.max(1, play.fieldWidthYards ?? FIELD_CONSTANTS.DEFAULT_FIELD_WIDTH);
  const divisions = Math.max(1, Math.round(play.fieldLengthYards ?? FIELD_CONSTANTS.DEFAULT_DIVISIONS));
  const size = computeFieldSize(widthUnits, divisions);
  const svgClass = className ? `${className} bg-white rounded-lg` : "w-full aspect-[3/4] bg-white rounded-lg";

  return (
    <svg
      viewBox={`0 0 ${size.w} ${size.h}`}
      className={svgClass}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      <FieldGrid
        width={size.w}
        height={size.h}
        divisions={divisions}
        lineOfScrimmage={play.lineOfScrimmage ?? null}
      />
      {play.elements.map((element) => renderThumbnailElement(element))}
    </svg>
  );
});

function renderThumbnailElement(element: PlayElement) {
  switch (element.type) {
    case ELEMENT_TYPE.PLAYER:
      return renderPlayerThumbnail(element);
    case ELEMENT_TYPE.BALL:
      return (
        <g key={element.id}>
          <ellipse cx={element.x} cy={element.y} rx={19.2} ry={12} fill="#a16207" stroke="#5a3f1a" strokeWidth={1} />
          <line
            x1={element.x - 6.72}
            y1={element.y}
            x2={element.x + 6.72}
            y2={element.y}
            stroke="#ffffff"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </g>
      );
    case ELEMENT_TYPE.RECT:
      return <rect key={element.id} x={element.x} y={element.y} width={element.w} height={element.h} fill="none" stroke={element.color} strokeWidth={2} />;
    case ELEMENT_TYPE.ZONE:
      return (
        <rect
          key={element.id}
          x={element.x}
          y={element.y}
          width={element.w}
          height={element.h}
          fill={element.color}
          opacity={0.12}
          stroke={element.color}
          strokeWidth={1.5}
        />
      );
    case ELEMENT_TYPE.LINE:
      return (
        <path
          key={element.id}
          d={`M ${element.x1} ${element.y1} L ${element.x2} ${element.y2}`}
          stroke={element.color}
          strokeWidth={2}
          fill="none"
        />
      );
    case ELEMENT_TYPE.PERP_LINE: {
      const dx = element.x2 - element.x1;
      const dy = element.y2 - element.y1;
      const distance = Math.hypot(dx, dy) || 1;
      const normalX = -dy / distance;
      const normalY = dx / distance;
      const tick = element.tick || 12;
      const ex = element.x2;
      const ey = element.y2;
      const tx = ex + normalX * (tick / 2);
      const ty = ey + normalY * (tick / 2);
      const tx2 = ex - normalX * (tick / 2);
      const ty2 = ey - normalY * (tick / 2);
      return (
        <g key={element.id}>
          <path d={`M ${element.x1} ${element.y1} L ${element.x2} ${element.y2}`} stroke={element.color} strokeWidth={element.thickness || 2} fill="none" strokeLinecap="round" />
          <path d={`M ${tx} ${ty} L ${tx2} ${ty2}`} stroke={element.color} strokeWidth={Math.max(1, Math.round(element.thickness || 2))} strokeLinecap="round" />
        </g>
      );
    }
    case ELEMENT_TYPE.ARROW: {
      const head = 6;
      return (
        <g key={element.id}>
          <defs>
            <marker id={`thumb-head-${element.id}`} markerWidth={8} markerHeight={8} refX={6} refY={4} orient="auto-start-reverse">
              <path d={`M 0 0 L ${head} ${Math.round(head / 2)} L 0 ${head} z`} fill={element.color} />
            </marker>
          </defs>
          <path
            d={`M ${element.x1} ${element.y1} L ${element.x2} ${element.y2}`}
            stroke={element.color}
            strokeWidth={2}
            fill="none"
            markerEnd={`url(#thumb-head-${element.id})`}
          />
        </g>
      );
    }
    default:
      return null;
  }
}

function renderPlayerThumbnail(element: PlayerElement) {
  const radius = element.r ?? 25;
  return (
    <g key={element.id}>
      <circle cx={element.x} cy={element.y} r={radius} fill={element.color || "#111827"} />
      <text
        x={element.x}
        y={element.y + Math.min(6, Math.round(radius / 2))}
        textAnchor="middle"
        fontSize={Math.max(8, Math.round(radius / 2.2))}
        fill="#fff"
        fontWeight={700}
      >
        {element.label || ""}
      </text>
    </g>
  );
}
