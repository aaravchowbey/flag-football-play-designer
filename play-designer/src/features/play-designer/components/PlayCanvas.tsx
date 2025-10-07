import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ELEMENT_TYPE,
  STROKE_STYLE,
  type ArrowElement,
  type BallElement,
  type LineElement,
  type PerpendicularLineElement,
  type Play,
  type PlayerElement,
  type PlayElement,
  type RectElement,
  type ToolType,
  type ZoneElement,
} from "@/features/play-designer/types";
import {
  FIELD_CONSTANTS,
  clamp,
  computeFieldSize,
  generateUid,
} from "@/features/play-designer/utils";
import { FieldGrid } from "@/features/play-designer/components/FieldGrid";

export interface PlayCanvasProps {
  readonly play: Play;
  readonly onChange: (next: Play) => void;
  readonly selectionId: string | null;
  readonly onSelectionChange: (id: string | null) => void;
  readonly tool: ToolType;
  readonly strokeColor: string;
  readonly fillColor: string;
  readonly thickness: number;
  readonly playerSize: number;
  readonly playersLocked: boolean;
  readonly fieldWidthYards?: number;
  readonly fieldLengthYards?: number;
  readonly onSvgRef?: (svg: SVGSVGElement | null) => void;
}

interface DragState {
  readonly id: string;
  readonly offsetX: number;
  readonly offsetY: number;
}

interface SnapPoint {
  readonly x: number;
  readonly y: number;
}

type DraftState =
  | (ArrowElement & { id: "draft" })
  | (LineElement & { id: "draft" })
  | (PerpendicularLineElement & { id: "draft" })
  | (RectElement & { id: "draft" })
  | (ZoneElement & { id: "draft" });

const SNAP_RADIUS: number = FIELD_CONSTANTS.SNAP_RADIUS;

const PlayerNode = memo(function PlayerNode({
  element,
  selected,
  onPointerDown,
  defaultRadius,
}: {
  readonly element: PlayerElement;
  readonly selected: boolean;
  readonly onPointerDown: (event: React.MouseEvent<SVGGElement>, element: PlayerElement) => void;
  readonly defaultRadius: number;
}) {
  const radius = element.r || defaultRadius;
  return (
    <g onMouseDown={(event) => onPointerDown(event, element)} style={{ cursor: "move" }}>
      <circle cx={element.x} cy={element.y} r={radius} fill={element.color} />
      <text
        x={element.x}
        y={element.y + 5}
        textAnchor="middle"
        fontSize={12}
        fill="#ffffff"
        fontWeight={700}
        pointerEvents="none"
      >
        {element.label ?? ""}
      </text>
      {selected ? (
        <circle
          cx={element.x}
          cy={element.y}
          r={radius + 4}
          fill="none"
          stroke="#c0c0c0"
          strokeWidth={2}
        />
      ) : null}
    </g>
  );
});

export function PlayCanvas({
  play,
  onChange,
  selectionId,
  onSelectionChange,
  tool,
  strokeColor,
  fillColor,
  thickness,
  playerSize,
  playersLocked,
  fieldWidthYards,
  fieldLengthYards,
  onSvgRef,
}: PlayCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [snapCandidate, setSnapCandidate] = useState<SnapPoint | null>(null);

  useEffect(() => {
    onSvgRef?.(svgRef.current);
    return () => onSvgRef?.(null);
  }, [onSvgRef]);

  const widthUnits = Math.max(1, fieldWidthYards ?? play.fieldWidthYards ?? FIELD_CONSTANTS.DEFAULT_FIELD_WIDTH);
  const divisions = Math.max(
    1,
    Math.round(fieldLengthYards ?? play.fieldLengthYards ?? FIELD_CONSTANTS.DEFAULT_DIVISIONS),
  );

  const dimensions = useMemo(() => computeFieldSize(widthUnits, divisions), [widthUnits, divisions]);

  const lineSpacing = useMemo(() => {
    const fieldHeight = dimensions.h - FIELD_CONSTANTS.FIELD_MARGIN_VERTICAL * 2;
    return fieldHeight / divisions;
  }, [dimensions.h, divisions]);

  const snapToYardLine = useCallback(
    (y: number): number => {
      if (!Number.isFinite(lineSpacing) || lineSpacing <= 0) return y;
      const relative = (y - FIELD_CONSTANTS.FIELD_MARGIN_VERTICAL) / lineSpacing;
      const nearest = Math.round(relative);
      const clamped = clamp(nearest, 0, divisions);
      return FIELD_CONSTANTS.FIELD_MARGIN_VERTICAL + clamped * lineSpacing;
    },
    [lineSpacing, divisions],
  );

  const clientToSvg = useCallback(
    (event: React.MouseEvent<SVGSVGElement> | React.MouseEvent<SVGGElement>) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const matrix = svg.getScreenCTM();
      if (!matrix) return null;
      const location = point.matrixTransform(matrix.inverse());
      return { x: location.x, y: location.y };
    },
    [],
  );

  const addElement = useCallback(
    <T extends PlayElement>(element: Omit<T, "id">) => {
      const created = { id: generateUid(), ...element } as T;
      onChange({
        ...play,
        elements: [...play.elements, created],
      });
    },
    [onChange, play],
  );

  const findSnapPoint = useCallback(
    (x: number, y: number, exclude?: SnapPoint): SnapPoint | null => {
  let nearest: SnapPoint | null = null;
  let minDistance: number = SNAP_RADIUS;

      for (const element of play.elements) {
        const candidates: SnapPoint[] = [];
        if (playersLocked && element.type === ELEMENT_TYPE.PLAYER) {
          candidates.push({ x: element.x, y: element.y });
        }
        if (
          element.type === ELEMENT_TYPE.ARROW ||
          element.type === ELEMENT_TYPE.LINE ||
          element.type === ELEMENT_TYPE.PERP_LINE
        ) {
          candidates.push({ x: element.x1, y: element.y1 }, { x: element.x2, y: element.y2 });
        }
        for (const candidate of candidates) {
          if (!candidate) continue;
          if (exclude && Math.hypot(candidate.x - exclude.x, candidate.y - exclude.y) < 0.5) {
            continue;
          }
          const distance = Math.hypot(candidate.x - x, candidate.y - y);
          if (distance < minDistance) {
            minDistance = distance;
            nearest = candidate;
          }
        }
      }
      return nearest;
    },
    [play.elements, playersLocked],
  );

  const handleSvgPointerDown = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const point = clientToSvg(event);
      if (!point) return;
      const { x, y } = point;

      if (playersLocked) {
        const candidate = findSnapPoint(x, y);
        setSnapCandidate(candidate);
      }

      if (tool === ELEMENT_TYPE.PLAYER) {
        addElement<PlayerElement>({
          type: ELEMENT_TYPE.PLAYER,
          x,
          y: snapToYardLine(y),
          color: fillColor,
          label: "",
          r: playerSize,
        });
        return;
      }

      if (tool === ELEMENT_TYPE.BALL) {
        addElement<BallElement>({
          type: ELEMENT_TYPE.BALL,
          x,
          y,
          color: fillColor,
        });
        return;
      }

      if (tool === ELEMENT_TYPE.ARROW || tool === ELEMENT_TYPE.LINE || tool === ELEMENT_TYPE.PERP_LINE) {
        const snapPoint = findSnapPoint(x, y);
        const startX = snapPoint?.x ?? x;
        const startY = snapPoint?.y ?? y;
        const common = {
          id: "draft" as const,
          x1: startX,
          y1: startY,
          x2: startX,
          y2: startY,
          color: strokeColor,
          style: STROKE_STYLE.SOLID,
          thickness,
        };
        if (tool === ELEMENT_TYPE.ARROW) {
          setDraftState({ ...common, type: ELEMENT_TYPE.ARROW });
        } else if (tool === ELEMENT_TYPE.LINE) {
          setDraftState({ ...common, type: ELEMENT_TYPE.LINE });
        } else {
          setDraftState({ ...common, type: ELEMENT_TYPE.PERP_LINE, tick: 12 });
        }
        return;
      }

      if (tool === ELEMENT_TYPE.RECT || tool === ELEMENT_TYPE.ZONE) {
        setDraftState({
          id: "draft",
          type: tool,
          x,
          y,
          w: 0,
          h: 0,
          color: tool === ELEMENT_TYPE.ZONE ? fillColor : strokeColor,
        });
        return;
      }

      onSelectionChange(null);
    },
    [
      addElement,
      clientToSvg,
      fillColor,
      findSnapPoint,
      onSelectionChange,
      playerSize,
      playersLocked,
      snapToYardLine,
      strokeColor,
      thickness,
      tool,
    ],
  );

  const handleSvgPointerMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const point = clientToSvg(event);
      if (!point) return;
      const { x, y } = point;

      const isDrawingTool =
        tool === ELEMENT_TYPE.ARROW ||
        tool === ELEMENT_TYPE.LINE ||
        tool === ELEMENT_TYPE.PERP_LINE ||
        tool === ELEMENT_TYPE.RECT ||
        tool === ELEMENT_TYPE.ZONE;

      if (playersLocked && isDrawingTool) {
        setSnapCandidate(findSnapPoint(x, y));
      } else {
        setSnapCandidate(null);
      }

      if (!draftState && !dragState) return;

      if (draftState) {
        if (
          draftState.type === ELEMENT_TYPE.ARROW ||
          draftState.type === ELEMENT_TYPE.LINE ||
          draftState.type === ELEMENT_TYPE.PERP_LINE
        ) {
          const snapPoint = findSnapPoint(x, y, { x: draftState.x1, y: draftState.y1 });
          const endX = snapPoint?.x ?? x;
          const endY = snapPoint?.y ?? y;
          setDraftState({ ...draftState, x2: endX, y2: endY });
        }
        if (draftState.type === ELEMENT_TYPE.RECT || draftState.type === ELEMENT_TYPE.ZONE) {
          setDraftState({ ...draftState, w: x - draftState.x, h: y - draftState.y });
        }
        return;
      }

      if (dragState) {
        const movedElements = play.elements.map((element) => {
          if (element.id !== dragState.id) return element;

          if (element.type === ELEMENT_TYPE.PLAYER) {
            if (playersLocked) return element;
            return {
              ...element,
              x: x - dragState.offsetX,
              y: snapToYardLine(y - dragState.offsetY),
            };
          }
          if (element.type === ELEMENT_TYPE.BALL) {
            return {
              ...element,
              x: x - dragState.offsetX,
              y: y - dragState.offsetY,
            };
          }
          if (element.type === ELEMENT_TYPE.RECT || element.type === ELEMENT_TYPE.ZONE) {
            return {
              ...element,
              x: x - dragState.offsetX,
              y: y - dragState.offsetY,
            };
          }
          if (
            element.type === ELEMENT_TYPE.ARROW ||
            element.type === ELEMENT_TYPE.LINE ||
            element.type === ELEMENT_TYPE.PERP_LINE
          ) {
            const deltaX = x - dragState.offsetX - element.x1;
            const deltaY = y - dragState.offsetY - element.y1;
            return {
              ...element,
              x1: element.x1 + deltaX,
              y1: element.y1 + deltaY,
              x2: element.x2 + deltaX,
              y2: element.y2 + deltaY,
            };
          }
          return element;
        });
        onChange({ ...play, elements: movedElements });
      }
    },
    [
      clientToSvg,
      draftState,
      dragState,
      findSnapPoint,
      onChange,
      play,
      playersLocked,
      snapToYardLine,
      tool,
    ],
  );

  const handleSvgPointerUp = useCallback(() => {
    if (draftState) {
      const isLine =
        draftState.type === ELEMENT_TYPE.ARROW ||
        draftState.type === ELEMENT_TYPE.LINE ||
        draftState.type === ELEMENT_TYPE.PERP_LINE;
      const isRect = draftState.type === ELEMENT_TYPE.RECT || draftState.type === ELEMENT_TYPE.ZONE;

      if (isLine && Math.hypot(draftState.x2 - draftState.x1, draftState.y2 - draftState.y1) < 8) {
        setDraftState(null);
        return;
      }
      if (isRect && (Math.abs(draftState.w) < 6 || Math.abs(draftState.h) < 6)) {
        setDraftState(null);
        return;
      }

      let finalDraft = draftState;
      if (isLine) {
        const snapPoint = findSnapPoint(draftState.x2, draftState.y2, {
          x: draftState.x1,
          y: draftState.y1,
        });
        if (snapPoint) {
          finalDraft = { ...draftState, x2: snapPoint.x, y2: snapPoint.y };
        }
      }
  const { id: _draftId, ...elementWithoutId } = finalDraft;
  addElement(elementWithoutId as Omit<PlayElement, "id">);
      setDraftState(null);
    }
    setDragState(null);
    setSnapCandidate(null);
  }, [addElement, draftState, findSnapPoint]);

  const handleElementPointerDown = useCallback(
    (event: React.MouseEvent<SVGGElement>, element: Play["elements"][number]) => {
      const drawingTool =
        tool === ELEMENT_TYPE.ARROW ||
        tool === ELEMENT_TYPE.LINE ||
        tool === ELEMENT_TYPE.PERP_LINE ||
        tool === ELEMENT_TYPE.RECT ||
        tool === ELEMENT_TYPE.ZONE;

      if (playersLocked && drawingTool && element.type === ELEMENT_TYPE.PLAYER) {
        return;
      }

      event.stopPropagation();
      onSelectionChange(element.id);
      const point = clientToSvg(event);
      if (!point) return;
      const { x, y } = point;

      if (element.type === ELEMENT_TYPE.PLAYER || element.type === ELEMENT_TYPE.BALL) {
        if (element.type === ELEMENT_TYPE.PLAYER && playersLocked) return;
        setDragState({ id: element.id, offsetX: x - element.x, offsetY: y - element.y });
      } else if (
        element.type === ELEMENT_TYPE.RECT ||
        element.type === ELEMENT_TYPE.ZONE
      ) {
        setDragState({ id: element.id, offsetX: x - element.x, offsetY: y - element.y });
      } else if (
        element.type === ELEMENT_TYPE.ARROW ||
        element.type === ELEMENT_TYPE.LINE ||
        element.type === ELEMENT_TYPE.PERP_LINE
      ) {
        setDragState({ id: element.id, offsetX: x - element.x1, offsetY: y - element.y1 });
      }
    },
    [clientToSvg, onSelectionChange, playersLocked, tool],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!selectionId) return;
      if (event.key === "Backspace" || event.key === "Delete") {
        onChange({
          ...play,
          elements: play.elements.filter((element) => element.id !== selectionId),
        });
        onSelectionChange(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onChange, onSelectionChange, play, selectionId]);

  const draftVisual = useMemo(() => {
    if (!draftState) return null;
    const draftElement = { ...draftState };
    return renderElement(draftElement, true, handleElementPointerDown, playerSize);
  }, [draftState, handleElementPointerDown, playerSize]);

  return (
    <div className="w-full border rounded-2xl bg-white shadow-sm">
      <svg
        ref={svgRef}
        onMouseDown={handleSvgPointerDown}
        onMouseMove={handleSvgPointerMove}
        onMouseUp={handleSvgPointerUp}
        viewBox={`0 0 ${dimensions.w} ${dimensions.h}`}
        className="play-canvas-svg w-full h-[760px] rounded-2xl touch-none select-none"
      >
        <FieldGrid
          width={dimensions.w}
          height={dimensions.h}
          divisions={divisions}
          lineOfScrimmage={play.lineOfScrimmage ?? null}
        />
        {play.elements.map((element) =>
          renderElement(
            element,
            selectionId === element.id,
            handleElementPointerDown,
            playerSize,
          ),
        )}
        {draftVisual}
        {snapCandidate ? (
          <g pointerEvents="none">
            <circle
              cx={snapCandidate.x}
              cy={snapCandidate.y}
              r={18}
              fill="none"
              stroke="#c0c0c0"
              strokeWidth={2}
              opacity={0.45}
            />
            <circle
              cx={snapCandidate.x}
              cy={snapCandidate.y}
              r={4}
              fill="#c0c0c0"
            />
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function renderElement(
  element: Play["elements"][number],
  selected: boolean,
  onPointerDown: (event: React.MouseEvent<SVGGElement>, element: Play["elements"][number]) => void,
  playerSize: number,
) {
  switch (element.type) {
    case ELEMENT_TYPE.PLAYER:
      return (
        <PlayerNode
          key={element.id}
          element={element}
          selected={selected}
          onPointerDown={onPointerDown}
          defaultRadius={playerSize}
        />
      );
    case ELEMENT_TYPE.BALL:
      return (
        <g
          key={element.id}
          onMouseDown={(event) => onPointerDown(event, element)}
          style={{ cursor: "move" }}
        >
          <ellipse
            cx={element.x}
            cy={element.y}
            rx={19.2}
            ry={12}
            fill={element.color ?? "#a16207"}
            stroke="#5a3f1a"
            strokeWidth={1.5}
          />
          <line
            x1={element.x - 6.72}
            y1={element.y}
            x2={element.x + 6.72}
            y2={element.y}
            stroke="#ffffff"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {selected ? (
            <circle
              cx={element.x}
              cy={element.y}
              r={18}
              fill="none"
              stroke="#c0c0c0"
              strokeWidth={2}
            />
          ) : null}
        </g>
      );
    case ELEMENT_TYPE.ARROW:
      return (
        <ArrowNode
          key={element.id}
          element={element}
          selected={selected}
          onPointerDown={onPointerDown}
        />
      );
    case ELEMENT_TYPE.LINE:
      return (
        <LineNode
          key={element.id}
          element={element}
          selected={selected}
          onPointerDown={onPointerDown}
        />
      );
    case ELEMENT_TYPE.PERP_LINE:
      return (
        <PerpendicularNode
          key={element.id}
          element={element}
          selected={selected}
          onPointerDown={onPointerDown}
        />
      );
    case ELEMENT_TYPE.RECT:
    case ELEMENT_TYPE.ZONE:
      return (
        <RectNode
          key={element.id}
          element={element}
          selected={selected}
          onPointerDown={onPointerDown}
        />
      );
    default:
      return null;
  }
}

const ArrowNode = memo(function ArrowNode({
  element,
  selected,
  onPointerDown,
}: {
  readonly element: ArrowElement;
  readonly selected: boolean;
  readonly onPointerDown: (event: React.MouseEvent<SVGGElement>, element: ArrowElement) => void;
}) {
  return (
    <g onMouseDown={(event) => onPointerDown(event, element)} style={{ cursor: "move" }}>
      <defs>
        <marker
          id={`head-${element.id}`}
          markerWidth={10}
          markerHeight={10}
          refX={8}
          refY={5}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={element.color} />
        </marker>
      </defs>
      <path
        d={`M ${element.x1} ${element.y1} L ${element.x2} ${element.y2}`}
        stroke={element.color}
        strokeWidth={element.thickness}
        fill="none"
        markerEnd={`url(#head-${element.id})`}
        strokeDasharray={element.style === STROKE_STYLE.DASHED ? "8 6" : undefined}
      />
      {selected ? (
        <>
          <circle cx={element.x1} cy={element.y1} r={6} fill="#c0c0c0" />
          <circle cx={element.x2} cy={element.y2} r={6} fill="#c0c0c0" />
        </>
      ) : null}
    </g>
  );
});

const LineNode = memo(function LineNode({
  element,
  selected,
  onPointerDown,
}: {
  readonly element: LineElement;
  readonly selected: boolean;
  readonly onPointerDown: (event: React.MouseEvent<SVGGElement>, element: LineElement) => void;
}) {
  return (
    <g onMouseDown={(event) => onPointerDown(event, element)} style={{ cursor: "move" }}>
      <path
        d={`M ${element.x1} ${element.y1} L ${element.x2} ${element.y2}`}
        stroke={element.color}
        strokeWidth={element.thickness}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={element.style === STROKE_STYLE.DASHED ? "8 6" : undefined}
      />
      {selected ? (
        <>
          <circle cx={element.x1} cy={element.y1} r={6} fill="#c0c0c0" />
          <circle cx={element.x2} cy={element.y2} r={6} fill="#c0c0c0" />
        </>
      ) : null}
    </g>
  );
});

const PerpendicularNode = memo(function PerpendicularNode({
  element,
  selected,
  onPointerDown,
}: {
  readonly element: PerpendicularLineElement;
  readonly selected: boolean;
  readonly onPointerDown: (event: React.MouseEvent<SVGGElement>, element: PerpendicularLineElement) => void;
}) {
  const dx = element.x2 - element.x1;
  const dy = element.y2 - element.y1;
  const distance = Math.hypot(dx, dy) || 1;
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const ex = element.x2;
  const ey = element.y2;
  const tick = element.tick ?? 12;
  const tx = ex + normalX * (tick / 2);
  const ty = ey + normalY * (tick / 2);
  const tx2 = ex - normalX * (tick / 2);
  const ty2 = ey - normalY * (tick / 2);

  return (
    <g onMouseDown={(event) => onPointerDown(event, element)} style={{ cursor: "move" }}>
      <path
        d={`M ${element.x1} ${element.y1} L ${element.x2} ${element.y2}`}
        stroke={element.color}
        strokeWidth={element.thickness}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={element.style === STROKE_STYLE.DASHED ? "8 6" : undefined}
      />
      <path
        d={`M ${tx} ${ty} L ${tx2} ${ty2}`}
        stroke={element.color}
        strokeWidth={Math.max(1, Math.round(element.thickness))}
        strokeLinecap="round"
        strokeDasharray={element.style === STROKE_STYLE.DASHED ? "8 6" : undefined}
      />
      {selected ? (
        <>
          <circle cx={element.x1} cy={element.y1} r={6} fill="#c0c0c0" />
          <circle cx={element.x2} cy={element.y2} r={6} fill="#c0c0c0" />
        </>
      ) : null}
    </g>
  );
});

const RectNode = memo(function RectNode({
  element,
  selected,
  onPointerDown,
}: {
  readonly element: RectElement | ZoneElement;
  readonly selected: boolean;
  readonly onPointerDown: (event: React.MouseEvent<SVGGElement>, element: RectElement | ZoneElement) => void;
}) {
  const isZone = element.type === ELEMENT_TYPE.ZONE;
  return (
    <g onMouseDown={(event) => onPointerDown(event, element)} style={{ cursor: "move" }}>
      <rect
        x={element.x}
        y={element.y}
        width={element.w}
        height={element.h}
        fill={isZone ? element.color : "none"}
        opacity={isZone ? 0.12 : 1}
        stroke={element.color}
        strokeWidth={isZone ? 1.5 : 2}
      />
      {selected ? (
        <rect
          x={element.x - 4}
          y={element.y - 4}
          width={element.w + 8}
          height={element.h + 8}
          fill="none"
          stroke="#c0c0c0"
          strokeWidth={2}
        />
      ) : null}
    </g>
  );
});
