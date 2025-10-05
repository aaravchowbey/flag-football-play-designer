import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Download, Upload, Printer, Trash2, Copy, Grid, Circle, ArrowRight, Square, Undo2, Redo2, Layers, Sparkles } from "lucide-react";

// ------------------------------------------------------------
// Minimal, single-file React app: Flag Football Play Designer
// - No backend. Uses localStorage + JSON import/export.
// - SVG-based editor for players, ball, arrows, and shapes.
// - Multi-play grid board with custom print sizes.
// - Print via window.print() with @page sizing.
// ------------------------------------------------------------

// Types
const ELT = {
  PLAYER: "player",
  BALL: "ball",
  ARROW: "arrow",
  PERP_LINE: "perp_line",
  LINE: "line",
  RECT: "rect",
  ZONE: "zone",
};

const ARROW_STYLE = {
  SOLID: "solid",
  DASHED: "dashed",
  CURVED: "curved",
};

const DEFAULT_PLAY_SIZE = { w: 600, h: 800 };
// Field layout defaults
const FIELD_MARGIN_VERTICAL = 40;
const FIELD_MARGIN_HORIZONTAL = 40;
const DEFAULT_DIVISIONS = 20; // the number of yard-line gaps by default
const DEFAULT_UNIT_PX = (DEFAULT_PLAY_SIZE.h - FIELD_MARGIN_VERTICAL * 2) / DEFAULT_DIVISIONS; // px per yard-unit

function computeFieldSize(widthYards: number, lengthYards: number) {
  const widthUnits = Math.max(1, widthYards || 1);
  const lengthUnits = Math.max(1, lengthYards || 1);
  const w = FIELD_MARGIN_HORIZONTAL * 2 + widthUnits * DEFAULT_UNIT_PX;
  const h = FIELD_MARGIN_VERTICAL * 2 + lengthUnits * DEFAULT_UNIT_PX;
  return { w, h };
}

// Utilities
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function yardLines(w: number, h: number, los?: number | null, divisions: number = DEFAULT_DIVISIONS) {
  const lines = [];
  const verticalMargin = FIELD_MARGIN_VERTICAL;
  const horizontalMargin = FIELD_MARGIN_HORIZONTAL;
  const fieldH = h - verticalMargin * 2;
  const fieldW = w - horizontalMargin * 2;
  const divs = Math.max(1, Math.round(divisions));
  const losNum = los === null || los === undefined ? null : Math.min(Math.max(0, Math.round(los)), divs);
  // flip numbering so LOS 0..divs maps from bottom -> top: index = divs - losNum
  const losIndex = losNum === null ? null : divs - losNum;
  for (let i = 0; i <= divs; i++) {
    const y = verticalMargin + (fieldH * i) / divs;
    const isLOS = losIndex === i;
    lines.push(
      <line
        key={i}
        x1={horizontalMargin}
        y1={y}
        x2={w - horizontalMargin}
        y2={y}
        stroke={isLOS ? "#000000" : "#e2e8f0"}
        strokeWidth={isLOS ? 4 : i % 5 === 0 ? 2 : 1}
      />
    );
  }
  return (
    <g>
      <rect x={horizontalMargin} y={verticalMargin} width={fieldW} height={fieldH} fill="#f8fafc" stroke="#cbd5e1" />
      {lines}
    </g>
  );
}

// Core models
function newPlay(name = "New Play") {
  const defaultWidth = 12;
  const defaultLength = DEFAULT_DIVISIONS;
  return {
    id: uid(),
    name,
    size: computeFieldSize(defaultWidth, defaultLength),
    lineOfScrimmage: null,
    fieldWidthYards: defaultWidth, // default width in yards (across)
    fieldLengthYards: defaultLength, // default length in yards (down the field)
    elements: [],
  };
}

function defaultPalette() {
  return ["#111827", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#0ea5e9"]; // neutral + team colors
}

// ------------------------------------------------------------
// Element Renderers
// ------------------------------------------------------------
function Player({ elt, selected, onMouseDown, defaultSize = 16 }: any) {
  const r = elt.r || defaultSize;
  return (
    <g onMouseDown={(e) => onMouseDown(e, elt)} style={{ cursor: "move" }}>
      <circle cx={elt.x} cy={elt.y} r={r} fill={elt.color || "#111827"} />
      <text x={elt.x} y={elt.y + 5} textAnchor="middle" fontSize={12} fill="#ffffff" fontWeight={700} pointerEvents="none">
        {elt.label || ""}
      </text>
      {selected ? <circle cx={elt.x} cy={elt.y} r={r + 4} fill="none" stroke="#0ea5e9" strokeWidth={2} /> : null}
    </g>
  );
}

function Ball({ elt, selected, onMouseDown }: any) {
  const r = 12; // slightly larger
  const rx = r * 1.6;
  const ry = r;
  const fill = "#a16207"; // always football brown
  // draw a horizontal football with laces (no rotation)
  return (
    <g onMouseDown={(e) => onMouseDown(e, elt)} style={{ cursor: "move" }}>
      <g>
        <ellipse cx={elt.x} cy={elt.y} rx={rx} ry={ry} fill={fill} stroke="#5a3f1a" strokeWidth={1.5} />
        {/* center lace */}
        <line x1={elt.x - rx * 0.35} y1={elt.y} x2={elt.x + rx * 0.35} y2={elt.y} stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
        {/* small stitches across the lace */}
        {[-2, -1, 0, 1, 2].map((i) => (
          <line
            key={i}
            x1={elt.x + i * 6 - 0.5}
            y1={elt.y - 4}
            x2={elt.x + i * 6 + 0.5}
            y2={elt.y + 4}
            stroke="#ffffff"
            strokeWidth={1}
            strokeLinecap="round"
          />
        ))}
      </g>
      {selected ? <circle cx={elt.x} cy={elt.y} r={r + 6} fill="none" stroke="#0ea5e9" strokeWidth={2} /> : null}
    </g>
  );
}

function Arrow({ elt, selected, onMouseDown }: any) {
  const { x1, y1, x2, y2, color = "#111827", style = ARROW_STYLE.SOLID, thickness = 3 } = elt;
  const head = 6; // constant arrowhead size in px
  let path = `M ${x1} ${y1} L ${x2} ${y2}`;
    if (style === ARROW_STYLE.CURVED) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    // perpendicular (normal) vector
    const nx = -dy / dist;
    const ny = dx / dist;
    const base = Math.min(0.5, 0.25 * (dist / 100)); // scale curvature with distance but clamp
    const curvature = typeof elt.curvature === "number" ? elt.curvature : base;
    const cx = mx + nx * dist * curvature;
    const cy = my + ny * dist * curvature;
    path = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  }
  return (
    <g onMouseDown={(e) => onMouseDown(e, elt)} style={{ cursor: "move" }}>
      <defs>
        <marker id={`head-${elt.id}`} markerWidth={10} markerHeight={10} refX={8} refY={5} orient="auto-start-reverse">
          <path d={`M 0 0 L 10 5 L 0 10 z`} fill={color} />
        </marker>
      </defs>
      <path d={path} stroke={color} strokeWidth={thickness} fill="none" markerEnd={`url(#head-${elt.id})`} strokeDasharray={style === ARROW_STYLE.DASHED ? "8 6" : undefined} />
      {selected ? (
        <>
          <circle cx={x1} cy={y1} r={6} fill="#0ea5e9" />
          <circle cx={x2} cy={y2} r={6} fill="#0ea5e9" />
        </>
      ) : null}
    </g>
  );
}

function Line({ elt, selected, onMouseDown }: any) {
  const { x1, y1, x2, y2, color = "#111827", thickness = 3 } = elt;
  return (
    <g onMouseDown={(e) => onMouseDown(e, elt)} style={{ cursor: "move" }}>
      <path d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke={color} strokeWidth={thickness} fill="none" strokeLinecap="round" />
      {selected ? (
        <>
          <circle cx={x1} cy={y1} r={6} fill="#0ea5e9" />
          <circle cx={x2} cy={y2} r={6} fill="#0ea5e9" />
        </>
      ) : null}
    </g>
  );
}

function PerpLine({ elt, selected, onMouseDown }: any) {
  // renders a line between (x1,y1) and (x2,y2) with a small perpendicular tick at the trailing end
  const { x1, y1, x2, y2, color = "#111827", thickness = 3, tick = 12 } = elt;
  // compute perpendicular tick centered at the line end (x2,y2)
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist; // perpendicular normal x
  const ny = dx / dist; // perpendicular normal y
  const ex = x2;
  const ey = y2;
  const tx = ex + nx * (tick / 2);
  const ty = ey + ny * (tick / 2);
  const tx2 = ex - nx * (tick / 2);
  const ty2 = ey - ny * (tick / 2);

  return (
    <g onMouseDown={(e) => onMouseDown(e, elt)} style={{ cursor: "move" }}>
      <path d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke={color} strokeWidth={thickness} fill="none" strokeLinecap="round" />
      <path d={`M ${tx} ${ty} L ${tx2} ${ty2}`} stroke={color} strokeWidth={Math.max(1, Math.round(thickness))} strokeLinecap="round" />
      {selected ? (
        <>
          <circle cx={x1} cy={y1} r={6} fill="#0ea5e9" />
          <circle cx={x2} cy={y2} r={6} fill="#0ea5e9" />
        </>
      ) : null}
    </g>
  );
}

function Rect({ elt, selected, onMouseDown }: any) {
  const { x, y, w, h, color = "#111827" } = elt;
  return (
    <g onMouseDown={(e) => onMouseDown(e, elt)} style={{ cursor: "move" }}>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth={2} />
      {selected ? <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill="none" stroke="#0ea5e9" strokeWidth={2} /> : null}
    </g>
  );
}

function Zone({ elt, selected, onMouseDown }: any) {
  const { x, y, w, h, color = "#10b981" } = elt;
  return (
    <g onMouseDown={(e) => onMouseDown(e, elt)} style={{ cursor: "move" }}>
      <rect x={x} y={y} width={w} height={h} fill={color} opacity={0.12} stroke={color} strokeWidth={1.5} />
      {selected ? <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill="none" stroke="#0ea5e9" strokeWidth={2} /> : null}
    </g>
  );
}

// ------------------------------------------------------------
// Canvas Editor
// ------------------------------------------------------------
function PlayCanvas({ play, onChange, selection, setSelection, tool, strokeColor, fillColor, thickness, playerSize, fieldWidthYards, fieldLengthYards, playersLocked }: any) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<any>(null); // { id, offsetX, offsetY, kind }
  const [draft, setDraft] = useState<any>(null); // for drawing arrows and shapes
  const widthUnits = Math.max(1, fieldWidthYards ?? play.fieldWidthYards ?? 12);
  const divisions = Math.max(1, Math.round(fieldLengthYards ?? play.fieldLengthYards ?? DEFAULT_DIVISIONS));
  const size = computeFieldSize(widthUnits, divisions);
  const SNAP_RADIUS = 18;
  const verticalMargin = FIELD_MARGIN_VERTICAL;
  const fieldH = size.h - verticalMargin * 2;
  const lineSpacing = fieldH / divisions;

  function snapToYardLine(y: number) {
    if (!Number.isFinite(lineSpacing) || lineSpacing <= 0) return y;
    const relative = (y - verticalMargin) / lineSpacing;
    const nearest = Math.round(relative);
    const clamped = Math.min(Math.max(nearest, 0), divisions);
    return verticalMargin + clamped * lineSpacing;
  }

  function clientToSvg(e: any) {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inv = ctm.inverse();
    const loc = pt.matrixTransform(inv);
    return { x: loc.x, y: loc.y };
  }

  function addElement(elt: any) {
    onChange({ ...play, elements: [...play.elements, { id: uid(), ...elt }] });
  }

  function findSnapPoint(x: number, y: number, exclude?: { x: number; y: number }) {
    let nearest: { x: number; y: number } | null = null;
    let minDist = SNAP_RADIUS;
    for (const el of play.elements) {
      if (el.type !== ELT.ARROW && el.type !== ELT.LINE && el.type !== ELT.PERP_LINE) continue;
      const pts = [
        { x: el.x1, y: el.y1 },
        { x: el.x2, y: el.y2 },
      ];
      for (const pt of pts) {
        if (exclude && Math.hypot(pt.x - exclude.x, pt.y - exclude.y) < 0.5) continue;
        const dist = Math.hypot(pt.x - x, pt.y - y);
        if (dist < minDist) {
          minDist = dist;
          nearest = { x: pt.x, y: pt.y };
        }
      }
    }
    return nearest;
  }

  function onSVGDown(e: any) {
  const p = clientToSvg(e);
  if (!p) return;
  const x = p.x;
  const y = p.y;

    if (tool === ELT.PLAYER) {
      const snappedY = snapToYardLine(y);
      addElement({ type: ELT.PLAYER, x, y: snappedY, color: fillColor, label: "", r: playerSize });
      return;
    }
    if (tool === ELT.BALL) {
      addElement({ type: ELT.BALL, x, y, color: fillColor });
      return;
    }
    if (tool === ELT.ARROW) {
      const snap = findSnapPoint(x, y);
      const sx = snap?.x ?? x;
      const sy = snap?.y ?? y;
      setDraft({ type: ELT.ARROW, x1: sx, y1: sy, x2: sx, y2: sy, color: strokeColor, style: ARROW_STYLE.SOLID, thickness, curvature: 0 });
      return;
    }
    if (tool === ELT.LINE) {
      const snap = findSnapPoint(x, y);
      const sx = snap?.x ?? x;
      const sy = snap?.y ?? y;
      setDraft({ type: ELT.LINE, x1: sx, y1: sy, x2: sx, y2: sy, color: strokeColor, thickness });
      return;
    }
    if (tool === ELT.PERP_LINE) {
      const snap = findSnapPoint(x, y);
      const sx = snap?.x ?? x;
      const sy = snap?.y ?? y;
      setDraft({ type: ELT.PERP_LINE, x1: sx, y1: sy, x2: sx, y2: sy, color: strokeColor, thickness, tick: 12 });
      return;
    }
    // curved arrows disabled for now
    if (tool === ELT.RECT || tool === ELT.ZONE) {
      setDraft({ type: tool, x, y, w: 0, h: 0, color: tool === ELT.ZONE ? fillColor : strokeColor });
      return;
    }

    // default: selection clear
    setSelection(null);
  }

  function onSVGMove(e: any) {
    if (!draft && !drag) return;
  const p = clientToSvg(e);
  if (!p) return;
  const x = p.x;
  const y = p.y;

    if (draft) {
      if (draft.type === ELT.ARROW || draft.type === ELT.LINE || draft.type === ELT.PERP_LINE) {
        const snap = findSnapPoint(x, y, { x: draft.x1, y: draft.y1 });
        const ex = snap?.x ?? x;
        const ey = snap?.y ?? y;
        setDraft({ ...draft, x2: ex, y2: ey });
      }
      if (draft.type === ELT.RECT || draft.type === ELT.ZONE) setDraft({ ...draft, w: x - draft.x, h: y - draft.y });
      return;
    }

    if (drag) {
      const { id, dx, dy, kind } = drag;
      const moved = play.elements.map((el) => {
        if (el.id !== id) return el;
  if (el.type === ELT.PLAYER) return { ...el, x: x - dx, y: snapToYardLine(y - dy) };
  if (el.type === ELT.BALL) return { ...el, x: x - dx, y: y - dy };
        if (el.type === ELT.RECT || el.type === ELT.ZONE) return { ...el, x: x - dx, y: y - dy };
        if (el.type === ELT.ARROW || el.type === ELT.LINE || el.type === ELT.PERP_LINE) {
          const deltaX = x - dx - el.x1;
          const deltaY = y - dy - el.y1;
          return { ...el, x1: el.x1 + deltaX, y1: el.y1 + deltaY, x2: el.x2 + deltaX, y2: el.y2 + deltaY };
        }
        return el;
      });
      onChange({ ...play, elements: moved });
    }
  }

  function onSVGUp() {
    if (draft) {
      // discard tiny drafts (arrow, line, or perp_line)
      if ((draft.type === ELT.ARROW || draft.type === ELT.LINE || draft.type === ELT.PERP_LINE) && Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) < 8) {
        setDraft(null);
        return;
      }
      if ((draft.type === ELT.RECT || draft.type === ELT.ZONE) && (Math.abs(draft.w) < 6 || Math.abs(draft.h) < 6)) {
        setDraft(null);
        return;
      }
      let finalDraft = draft;
      if (draft.type === ELT.ARROW || draft.type === ELT.LINE || draft.type === ELT.PERP_LINE) {
        const snap = findSnapPoint(draft.x2, draft.y2, { x: draft.x1, y: draft.y1 });
        if (snap) {
          finalDraft = { ...draft, x2: snap.x, y2: snap.y };
        }
      }
      addElement(finalDraft);
      setDraft(null);
    }
    setDrag(null);
  }

  function onEltMouseDown(e: any, elt: any) {
    e.stopPropagation();
    setSelection(elt.id);
  const p = clientToSvg(e);
  if (!p) return;
  const x = p.x;
  const y = p.y;
    if (elt.type === ELT.PLAYER || elt.type === ELT.BALL || elt.type === ELT.RECT || elt.type === ELT.ZONE) {
      // If players are locked, don't start dragging player elements — this makes it easier to place arrows
      if (elt.type === ELT.PLAYER && playersLocked) return;
      setDrag({ id: elt.id, dx: x - elt.x, dy: y - elt.y, kind: "move" });
    } else if (elt.type === ELT.ARROW || elt.type === ELT.LINE || elt.type === ELT.PERP_LINE) {
      setDrag({ id: elt.id, dx: x - elt.x1, dy: y - elt.y1, kind: "move" });
    }
  }

  // keyboard delete
  useEffect(() => {
    function onKey(e: any) {
      if (!selection) return;
      if (e.key === "Backspace" || e.key === "Delete") {
        onChange({ ...play, elements: play.elements.filter((el) => el.id !== selection) });
        setSelection(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, play, onChange, setSelection]);

  return (
    <div className="w-full border rounded-2xl bg-white shadow-sm">
      <svg
        ref={svgRef}
        onMouseDown={onSVGDown}
        onMouseMove={onSVGMove}
        onMouseUp={onSVGUp}
        viewBox={`0 0 ${size.w} ${size.h}`}
    className="w-full h-[760px] rounded-2xl touch-none select-none"
      >
  {yardLines(size.w, size.h, play.lineOfScrimmage ?? null, divisions)}
        {play.elements.map((elt) => {
          const selected = selection === elt.id;
          if (elt.type === ELT.PLAYER) return <Player key={elt.id} elt={elt} selected={selected} onMouseDown={onEltMouseDown} defaultSize={playerSize} />;
          if (elt.type === ELT.BALL) return <Ball key={elt.id} elt={elt} selected={selected} onMouseDown={onEltMouseDown} />;
          if (elt.type === ELT.ARROW) return <Arrow key={elt.id} elt={elt} selected={selected} onMouseDown={onEltMouseDown} />;
          if (elt.type === ELT.LINE) return <Line key={elt.id} elt={elt} selected={selected} onMouseDown={onEltMouseDown} />;
          if (elt.type === ELT.PERP_LINE) return <PerpLine key={elt.id} elt={elt} selected={selected} onMouseDown={onEltMouseDown} />;
          if (elt.type === ELT.RECT) return <Rect key={elt.id} elt={elt} selected={selected} onMouseDown={onEltMouseDown} />;
          if (elt.type === ELT.ZONE) return <Zone key={elt.id} elt={elt} selected={selected} onMouseDown={onEltMouseDown} />;
          return null;
        })}
        {draft ? (
          draft.type === ELT.ARROW ? (
            <Arrow elt={{ id: "draft", ...draft }} selected={true} onMouseDown={() => {}} />
          ) : draft.type === ELT.LINE ? (
            <Line elt={{ id: "draft", ...draft }} selected={true} onMouseDown={() => {}} />
          ) : draft.type === ELT.PERP_LINE ? (
            <PerpLine elt={{ id: "draft", ...draft }} selected={true} onMouseDown={() => {}} />
          ) : draft.type === ELT.RECT ? (
            <Rect elt={{ id: "draft", ...draft }} selected={true} onMouseDown={() => {}} />
          ) : (
            <Zone elt={{ id: "draft", ...draft }} selected={true} onMouseDown={() => {}} />
          )
        ) : null}
      </svg>
    </div>
  );
}

// ------------------------------------------------------------
// Toolbar
// ------------------------------------------------------------
function TinySwatch({ color, active, onClick }) {
  return (
    <button
      title={color}
      onClick={onClick}
      className={`h-7 w-7 rounded-full border border-white shadow-sm transition ${active ? "ring-2 ring-sky-500 scale-110" : "hover:scale-105"}`}
      style={{ backgroundColor: color }}
    />
  );
}

function Toolbar({
  tool,
  setTool,
  strokeColor,
  setStrokeColor,
  fillColor,
  setFillColor,
  thickness,
  setThickness,
  playerSize,
  setPlayerSize,
  palette,
  lineOfScrimmage,
  setLineOfScrimmage,
  fieldWidthYards,
  fieldLengthYards,
  setFieldDims,
  playersLocked,
  setPlayersLocked,
}: any) {
  const safeLength = Math.max(1, Math.round(fieldLengthYards ?? DEFAULT_DIVISIONS));
  const safeWidth = Math.max(1, Math.round(fieldWidthYards ?? 12));
  const showStrokeColor = tool === ELT.ARROW || tool === ELT.LINE || tool === ELT.PERP_LINE || tool === ELT.RECT;
  const showFillColor = tool === ELT.PLAYER || tool === ELT.BALL || tool === ELT.ZONE;
  const showThickness = tool === ELT.ARROW || tool === ELT.LINE || tool === ELT.PERP_LINE;
  const showPlayerSize = tool === ELT.PLAYER;

  function handleWidthChange(e: any) {
    const val = Number(e.target.value);
    if (!setFieldDims) return;
    setFieldDims({ widthYards: Number.isFinite(val) && val > 0 ? val : safeWidth });
  }

  function handleLengthChange(e: any) {
    const val = Number(e.target.value);
    const next = Number.isFinite(val) && val > 0 ? val : safeLength;
    if (!setFieldDims) return;
    setFieldDims({ lengthYards: next });
  }
  return (
    <Card className="w-full">
      <CardHeader className="py-3">
        <CardTitle className="text-base">Tools</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap gap-2 md:gap-3">
          <Button variant={tool === ELT.PLAYER ? "default" : "secondary"} onClick={() => setTool(ELT.PLAYER)} className="gap-2 rounded-full px-4">
            <Circle size={16}/>Player
          </Button>
          <Button variant={tool === ELT.BALL ? "default" : "secondary"} onClick={() => setTool(ELT.BALL)} className="gap-2 rounded-full px-4">
            <svg width="16" height="12" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <ellipse cx="16" cy="12" rx="12" ry="7" fill="currentColor" opacity="0.95" />
              <ellipse cx="16" cy="12" rx="10" ry="5.5" fill="none" stroke="#ffffff" strokeWidth="1" />
              <line x1="9" y1="12" x2="23" y2="12" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
              {[-2, -1, 0, 1, 2].map((i) => (
                <line key={i} x1={16 + i * 4 - 0.6} y1={8.5} x2={16 + i * 4 + 0.6} y2={15.5} stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" />
              ))}
            </svg>
            Ball
          </Button>
          <Button variant={tool === ELT.ARROW ? "default" : "secondary"} onClick={() => setTool(ELT.ARROW)} className="gap-2 rounded-full px-4">
            <ArrowRight size={16}/>Arrow
          </Button>
          <Button variant={tool === ELT.LINE ? "default" : "secondary"} onClick={() => setTool(ELT.LINE)} className="gap-2 rounded-full px-4">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Line
          </Button>
          <Button variant={tool === ELT.PERP_LINE ? "default" : "secondary"} onClick={() => setTool(ELT.PERP_LINE)} className="gap-2 rounded-full px-4">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="14" y1="6" x2="14" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Perp
          </Button>
          {/* Curved arrows temporarily removed */}
          <Button variant={tool === ELT.RECT ? "default" : "secondary"} onClick={() => setTool(ELT.RECT)} className="gap-2 rounded-full px-4">
            <Square size={16}/>Rect
          </Button>
          <Button variant={tool === ELT.ZONE ? "default" : "secondary"} onClick={() => setTool(ELT.ZONE)} className="gap-2 rounded-full px-4">
            <Grid size={16}/>Zone
          </Button>
          <Button size="icon" variant={playersLocked ? "default" : "secondary"} onClick={() => setPlayersLocked(!playersLocked)} title={playersLocked ? "Unlock players" : "Lock players"} className="rounded-full">
            {playersLocked ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <rect x="7" y="7" width="10" height="6" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <line x1="12" y1="11" x2="12" y2="14" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {showStrokeColor ? (
            <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3">
              <div className="text-sm font-semibold text-slate-700">Stroke color</div>
              <div className="flex flex-wrap gap-2">
                {palette.map((c) => (
                  <TinySwatch key={c} color={c} active={c === strokeColor} onClick={() => setStrokeColor(c)} />
                ))}
                <Input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-12 h-8 p-0" />
              </div>
            </div>
          ) : null}
          {showFillColor ? (
            <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3">
              <div className="text-sm font-semibold text-slate-700">Fill color</div>
              <div className="flex flex-wrap gap-2">
                {palette.map((c) => (
                  <TinySwatch key={c} color={c} active={c === fillColor} onClick={() => setFillColor(c)} />
                ))}
                <Input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="w-12 h-8 p-0" />
              </div>
            </div>
          ) : null}
          {showThickness ? (
            <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3">
              <div className="text-sm font-semibold text-slate-700">Line thickness</div>
              <div className="px-2">
                <Slider value={[thickness]} onValueChange={(v) => setThickness(v[0])} min={1} max={10} step={1} />
                <div className="mt-2 text-xs font-medium text-slate-500">Current: {thickness}px</div>
              </div>
            </div>
          ) : null}
          {showPlayerSize ? (
            <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3">
              <div className="text-sm font-semibold text-slate-700">Player size</div>
              <div className="px-2">
                <Slider value={[playerSize]} onValueChange={(v) => setPlayerSize(v[0])} min={8} max={32} step={1} />
                <div className="mt-2 text-xs font-medium text-slate-500">Current: {playerSize}px</div>
              </div>
            </div>
          ) : null}
                  {/* field dimensions moved to header */}
        </div>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------
// Board Grid + Print Settings
// ------------------------------------------------------------
function BoardView({ plays, setPlays, printCfg, setPrintCfg }) {
  const reorder = (from, to) => {
    const next = [...plays];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setPlays(next);
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
  <Card className="md:col-span-1 border-slate-200 bg-white/90 shadow-sm">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Print settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-2 gap-2 items-center">
            <div className="text-sm">Paper</div>
            <Select value={printCfg.paper} onValueChange={(v) => setPrintCfg({ ...printCfg, paper: v })}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="letter">US Letter (8.5×11)</SelectItem>
                <SelectItem value="a4">A4</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {printCfg.paper === "custom" ? (
              <div className="col-span-2 grid grid-cols-2 gap-2">
                <Input type="number" value={printCfg.customW} onChange={(e)=>setPrintCfg({...printCfg, customW: Number(e.target.value)})} placeholder="Width in" />
                <Input type="number" value={printCfg.customH} onChange={(e)=>setPrintCfg({...printCfg, customH: Number(e.target.value)})} placeholder="Height in" />
              </div>
            ) : null}
            <div className="text-sm">Plays per row</div>
            <Input type="number" min={1} max={6} value={printCfg.perRow} onChange={(e)=>setPrintCfg({...printCfg, perRow: clamp(Number(e.target.value),1,6)})} />
            <div className="text-sm">Margins</div>
            <Input type="number" min={0} max={1.5} step={0.1} value={printCfg.marginIn} onChange={(e)=>setPrintCfg({...printCfg, marginIn: Number(e.target.value)})} />
            <div className="text-sm">Show titles</div>
            <Select value={printCfg.showTitles?"yes":"no"} onValueChange={(v)=>setPrintCfg({...printCfg, showTitles: v==="yes"})}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="gap-2" onClick={()=>window.print()}><Printer size={16}/>Print</Button>
        </CardContent>
      </Card>

  <Card className="md:col-span-2 border-slate-200 bg-white/90 shadow-sm">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Arrange plays</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${printCfg.perRow}, minmax(0, 1fr))`, gap: 12 }}>
            {plays.map((p, idx) => (
              <div key={p.id} className="border rounded-xl p-2 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold truncate">{p.name}</div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="secondary" title="Move left" onClick={()=>reorder(idx, Math.max(0, idx-1))}><ArrowRight className="rotate-180" size={16}/></Button>
                    <Button size="icon" variant="secondary" title="Move right" onClick={()=>reorder(idx, Math.min(plays.length-1, idx+1))}><ArrowRight size={16}/></Button>
                  </div>
                </div>
                <PlayThumb play={p}/>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlayThumb({ play }) {
  const widthUnits = Math.max(1, play.fieldWidthYards ?? 12);
  const divisions = Math.max(1, Math.round(play.fieldLengthYards ?? DEFAULT_DIVISIONS));
  const size = computeFieldSize(widthUnits, divisions);
  return (
    <svg viewBox={`0 0 ${size.w} ${size.h}`} className="w-full aspect-[3/4] bg-white rounded-lg">
      {yardLines(size.w, size.h, play.lineOfScrimmage ?? null, divisions)}
      {play.elements.map((elt) => {
        if (elt.type === ELT.PLAYER)
          return (
            <g key={elt.id}>
              <circle cx={elt.x} cy={elt.y} r={12} fill={elt.color || "#111827"} />
              <text x={elt.x} y={elt.y + 4} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={700}>
                {elt.label || ""}
              </text>
            </g>
          );
        if (elt.type === ELT.BALL)
          return (
            <g key={elt.id}>
              <g>
                <ellipse cx={elt.x} cy={elt.y} rx={12 * 1.6} ry={12} fill="#a16207" stroke="#5a3f1a" strokeWidth={1} />
                <line x1={elt.x - (12 * 1.6) * 0.35} y1={elt.y} x2={elt.x + (12 * 1.6) * 0.35} y2={elt.y} stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
              </g>
            </g>
          );
        if (elt.type === ELT.RECT) return <rect key={elt.id} x={elt.x} y={elt.y} width={elt.w} height={elt.h} fill="none" stroke={elt.color} strokeWidth={2} />;
        if (elt.type === ELT.ZONE) return <rect key={elt.id} x={elt.x} y={elt.y} width={elt.w} height={elt.h} fill={elt.color} opacity={0.12} stroke={elt.color} strokeWidth={1.5} />;
  if (elt.type === ELT.LINE) return <path key={elt.id} d={`M ${elt.x1} ${elt.y1} L ${elt.x2} ${elt.y2}`} stroke={elt.color} strokeWidth={2} fill="none" />;
        if (elt.type === ELT.PERP_LINE) {
          const dx = elt.x2 - elt.x1;
          const dy = elt.y2 - elt.y1;
          const dist = Math.hypot(dx, dy) || 1;
          const nx = -dy / dist;
          const ny = dx / dist;
          const tick = elt.tick || 12;
          const ex = elt.x2;
          const ey = elt.y2;
          const tx = ex + nx * (tick / 2);
          const ty = ey + ny * (tick / 2);
          const tx2 = ex - nx * (tick / 2);
          const ty2 = ey - ny * (tick / 2);
          return (
            <g key={elt.id}>
              <path d={`M ${elt.x1} ${elt.y1} L ${elt.x2} ${elt.y2}`} stroke={elt.color} strokeWidth={elt.thickness || 2} fill="none" strokeLinecap="round" />
              <path d={`M ${tx} ${ty} L ${tx2} ${ty2}`} stroke={elt.color} strokeWidth={Math.max(1, Math.round(elt.thickness || 2))} strokeLinecap="round" />
            </g>
          );
        }
        if (elt.type === ELT.ARROW) {
          let path = `M ${elt.x1} ${elt.y1} L ${elt.x2} ${elt.y2}`;
          if (elt.style === ARROW_STYLE.CURVED) {
            const mx = (elt.x1 + elt.x2) / 2;
            const my = (elt.y1 + elt.y2) / 2;
            const dx = elt.x2 - elt.x1;
            const dy = elt.y2 - elt.y1;
            const dist = Math.hypot(dx, dy) || 1;
            const nx = -dy / dist;
            const ny = dx / dist;
            const base = Math.min(0.5, 0.25 * (dist / 100));
            const curvature = typeof elt.curvature === "number" ? elt.curvature : base;
            const cx = mx + nx * dist * curvature;
            const cy = my + ny * dist * curvature;
            path = `M ${elt.x1} ${elt.y1} Q ${cx} ${cy} ${elt.x2} ${elt.y2}`;
          }
          const head = 6;
          return (
            <g key={elt.id}>
              <defs>
                <marker id={`head-${elt.id}`} markerWidth={8} markerHeight={8} refX={6} refY={4} orient="auto-start-reverse">
                  <path d={`M 0 0 L ${head} ${Math.round(head / 2)} L 0 ${head} z`} fill={elt.color} />
                </marker>
              </defs>
              <path d={path} stroke={elt.color} strokeWidth={2} fill="none" markerEnd={`url(#head-${elt.id})`} strokeDasharray={elt.style === ARROW_STYLE.DASHED ? "8 6" : undefined} />
            </g>
          );
        }
        return null;
      })}
    </svg>
  );
}

// ------------------------------------------------------------
// Storage Helpers
// ------------------------------------------------------------
const LS_KEY = "flag-football-plays-v1";
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    return data.map((p: any) => {
      const widthYards = Math.max(1, p?.fieldWidthYards ?? 12);
      const lengthYards = Math.max(1, Math.round(p?.fieldLengthYards ?? DEFAULT_DIVISIONS));
      const size = computeFieldSize(widthYards, lengthYards);
      const los = p?.lineOfScrimmage;
      const clampedLOS = los === null || los === undefined ? null : Math.min(Math.max(0, Math.round(los)), lengthYards);
      return {
        ...p,
        fieldWidthYards: widthYards,
        fieldLengthYards: lengthYards,
        size,
        lineOfScrimmage: clampedLOS,
      };
    });
  } catch (e) {
    console.error(e);
    return null;
  }
}

function saveToStorage(plays) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(plays));
  } catch (e) {
    console.error(e);
  }
}

// ------------------------------------------------------------
// Main App
// ------------------------------------------------------------
export default function App() {
  const [plays, setPlays] = useState(() => loadFromStorage() || [newPlay("Play 1")]);
  const [activeId, setActiveId] = useState(() => plays[0]?.id);
  const active = useMemo(() => plays.find((p) => p.id === activeId) || plays[0], [plays, activeId]);

  const [selection, setSelection] = useState(null);
  const [tool, setTool] = useState(ELT.PLAYER);
  const [strokeColor, setStrokeColor] = useState("#111827");
  const [fillColor, setFillColor] = useState("#111827");
  const [thickness, setThickness] = useState(3);
  const [playerSize, setPlayerSize] = useState(16);
  const palette = useMemo(defaultPalette, []);
  const [playersLocked, setPlayersLocked] = useState(false);

  const [printCfg, setPrintCfg] = useState({ paper: "letter", perRow: 3, marginIn: 0.5, showTitles: true, customW: 8.5, customH: 11 });

  // persist
  useEffect(() => saveToStorage(plays), [plays]);

  // Undo / Redo history (stores snapshots of plays + active selection)
  const snapshot = (playsState = plays, activeState = activeId) =>
    JSON.parse(JSON.stringify({ plays: playsState, activeId: activeState }));

  const undoStackRef = useRef<any[]>([]);
  const redoStackRef = useRef<any[]>([]);
  const prevStateRef = useRef(snapshot());
  const skipHistoryRef = useRef(true);

  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      prevStateRef.current = snapshot();
      return;
    }

    undoStackRef.current.push(prevStateRef.current);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
    prevStateRef.current = snapshot();
  }, [plays, activeId]);

  function restoreState(state: any) {
    skipHistoryRef.current = true;
    setPlays(state.plays);
    setActiveId(state.activeId ?? state.plays[0]?.id ?? null);
    setSelection(null);
  }

  function undo() {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop();
    redoStackRef.current.push(snapshot());
    restoreState(prev);
  }

  function redo() {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop();
    undoStackRef.current.push(snapshot());
    restoreState(next);
  }

  // keyboard shortcuts for undo/redo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod) {
        if (key === "z") {
          if (e.shiftKey) redo();
          else undo();
          e.preventDefault();
        } else if (key === "y") {
          redo();
          e.preventDefault();
        }
        return;
      }

      // single-key shortcuts
      if (key === "l") {
        setTool(ELT.LINE);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plays]);

  function updateActive(next) {
    setPlays((cur) => cur.map((p) => (p.id === next.id ? next : p)));
  }

  function setActiveLOS(val) {
    if (!active) return;
    const maxLOS = Math.max(1, Math.round(active.fieldLengthYards ?? DEFAULT_DIVISIONS));
    const nextLOS = val === null ? null : Math.min(Math.max(0, Math.round(val)), maxLOS);
    updateActive({ ...active, lineOfScrimmage: nextLOS });
  }

  function setActiveFieldDims({ widthYards, lengthYards }: { widthYards?: number; lengthYards?: number }) {
    if (!active) return;
    const nextWidth = Math.max(1, widthYards ?? active.fieldWidthYards ?? 12);
    const nextLength = Math.max(1, Math.round(lengthYards ?? active.fieldLengthYards ?? DEFAULT_DIVISIONS));
    const nextSize = computeFieldSize(nextWidth, nextLength);
    const los = active.lineOfScrimmage;
    const clampedLOS = los === null || los === undefined ? null : Math.min(los, nextLength);
    updateActive({
      ...active,
      fieldWidthYards: nextWidth,
      fieldLengthYards: nextLength,
      lineOfScrimmage: clampedLOS,
      size: nextSize,
    });
  }

  function addPlay() {
    const p = newPlay(`Play ${plays.length + 1}`);
    setPlays([...plays, p]);
    setActiveId(p.id);
  }

  function duplicateActive() {
    if (!active) return;
    const copy = {
      ...active,
      id: uid(),
      name: `${active.name} copy`,
      lineOfScrimmage: active.lineOfScrimmage ?? null,
      fieldWidthYards: active.fieldWidthYards ?? 12,
      fieldLengthYards: active.fieldLengthYards ?? DEFAULT_DIVISIONS,
      elements: active.elements.map((e) => ({ ...e, id: uid() })),
    };
    setPlays([...plays, copy]);
    setActiveId(copy.id);
  }

  function deleteActive() {
    if (!active) return;
    if (plays.length === 1) return; // keep at least one
    const idx = plays.findIndex((p) => p.id === active.id);
    const next = plays.filter((p) => p.id !== active.id);
    setPlays(next);
    const neighbor = next[Math.max(0, idx - 1)]?.id;
    setActiveId(neighbor || next[0]?.id);
  }

  function clearActive() {
    if (!active) return;
    // confirm because this is destructive for the current play only
    if (!window.confirm(`Clear all elements from "${active.name}"? This cannot be undone without Undo.`)) return;
    setPlays((cur) => cur.map((p) => (p.id === active.id ? { ...p, elements: [] } : p)));
    setSelection(null);
  }

  function downloadJSON() {
    downloadText("flag-plays.json", JSON.stringify(plays, null, 2));
  }

  function uploadJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(String(e.target?.result));
        if (Array.isArray(data)) setPlays(data);
      } catch {}
    };
    reader.readAsText(file);
  }

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
        <style>{printStyles(printCfg)}</style>
        <div className="max-w-7xl mx-auto grid gap-6">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 shadow-xl backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_#bae6fd,_transparent_55%)]" />
            <div className="relative z-10 flex flex-col gap-6 p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-3 text-left">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                    Playbook Studio
                  </span>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Flag Football Play Designer</h1>
                  <p className="max-w-2xl text-sm text-slate-600 md:text-base">
                    Map routes, zone drops, and timing adjustments on a clean digital field. Iterate fast with auto-saving, undo/redo, and printable playboards.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 font-medium text-slate-700 shadow-sm">
                      <Layers size={14} /> Active play: {active?.name ?? "Untitled"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1 font-medium text-slate-600 shadow-sm">
                      <Sparkles size={14} /> Auto-save enabled
                    </span>
                  </div>
                </div>
                  <div className="flex flex-wrap justify-end gap-2 items-center">
                  <Button size="icon" variant="secondary" title="Undo (Ctrl+Z)" onClick={undo} className="rounded-full">
                    <Undo2 size={16}/>
                  </Button>
                  <Button size="icon" variant="secondary" title="Redo (Ctrl+Y / Ctrl+Shift+Z)" onClick={redo} className="rounded-full">
                    <Redo2 size={16}/>
                  </Button>
                  <Button className="gap-2 rounded-full" onClick={addPlay}><Plus size={16}/>New play</Button>
                  <Button className="gap-2 rounded-full" variant="secondary" onClick={duplicateActive}><Copy size={16}/>Duplicate</Button>
                  <Button className="gap-2 rounded-full" variant="secondary" onClick={downloadJSON}><Download size={16}/>Export</Button>
                  <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300">
                    <Upload size={16}/>
                    <span>Import</span>
                    <input type="file" accept="application/json" className="hidden" onChange={(e)=> e.target.files && uploadJSON(e.target.files[0])}/>
                  </label>
                  {/* Line of scrimmage quick control and field dims */}
                  <div className="inline-flex items-center gap-3 px-2">
                    <div className="inline-flex items-center gap-2">
                      <div className="text-xs text-slate-500">LOS</div>
                      <Input
                        type="number"
                        min={0}
                        max={Math.max(1, Math.round(active?.fieldLengthYards ?? DEFAULT_DIVISIONS))}
                        value={active?.lineOfScrimmage == null ? "" : String(active?.lineOfScrimmage)}
                        onChange={(e) => setActiveLOS(e.target.value === "" ? null : Number(e.target.value))}
                        className="w-20"
                      />
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <div className="text-xs text-slate-500">W</div>
                      <Input type="number" min={1} value={active?.fieldWidthYards ?? 12} onChange={(e)=> setActiveFieldDims({ widthYards: Number(e.target.value) })} className="w-20" />
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <div className="text-xs text-slate-500">L</div>
                      <Input type="number" min={1} value={active?.fieldLengthYards ?? DEFAULT_DIVISIONS} onChange={(e)=> setActiveFieldDims({ lengthYards: Number(e.target.value) })} className="w-20" />
                    </div>
                  </div>
                      <Button className="gap-2 rounded-full" variant="secondary" onClick={clearActive}><Layers size={16}/>Clear</Button>
                      <Button className="gap-2 rounded-full" variant="destructive" onClick={deleteActive}><Trash2 size={16}/>Delete</Button>
                </div>
              </div>

              {/* Summary cards removed per user request */}
            </div>
          </div>

          <Tabs defaultValue="design">
            <TabsList className="w-fit rounded-full bg-slate-100 p-1 shadow-inner">
              <TabsTrigger value="design" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-slate-900">Designer</TabsTrigger>
              <TabsTrigger value="board" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-slate-900">Board & Print</TabsTrigger>
            </TabsList>

            <TabsContent value="design" className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 grid gap-3">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Active play</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div className="flex items-center gap-2">
                      <Input value={active?.name || ""} onChange={(e)=> updateActive({ ...active, name: e.target.value })} className="max-w-xs" />
                      <Select value={active?.id} onValueChange={(v)=>setActiveId(v)}>
                        <SelectTrigger className="w-[220px]"><SelectValue placeholder="Choose play"/></SelectTrigger>
                        <SelectContent>
                          {plays.map((p)=> <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {active ? (
                      <PlayCanvas
                        play={active}
                        onChange={updateActive}
                        selection={selection}
                        setSelection={setSelection}
                        tool={tool}
                        strokeColor={strokeColor}
                        fillColor={fillColor}
                        thickness={thickness}
                        playerSize={playerSize}
                        fieldWidthYards={active.fieldWidthYards}
                        fieldLengthYards={active.fieldLengthYards}
                        playersLocked={playersLocked}
                      />
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-3">
                <Toolbar
                  tool={tool}
                  setTool={setTool}
                  strokeColor={strokeColor}
                  setStrokeColor={setStrokeColor}
                  fillColor={fillColor}
                  setFillColor={setFillColor}
                  thickness={thickness}
                  setThickness={setThickness}
                  playerSize={playerSize}
                  setPlayerSize={setPlayerSize}
                  palette={palette}
                  lineOfScrimmage={active?.lineOfScrimmage ?? null}
                  setLineOfScrimmage={setActiveLOS}
                  fieldWidthYards={active?.fieldWidthYards ?? 12}
                  fieldLengthYards={active?.fieldLengthYards ?? DEFAULT_DIVISIONS}
                  setFieldDims={setActiveFieldDims}
                  playersLocked={playersLocked}
                  setPlayersLocked={setPlayersLocked}
                />

                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-base">Selected element</CardTitle></CardHeader>
                  <CardContent className="grid gap-2">
                    {selection ? (
                      <SelectedInspector play={active} selection={selection} onChange={updateActive} />
                    ) : (
                      <div className="text-sm text-slate-500">None</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Quick tips</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-700">Undo / Redo:</span> Ctrl/Cmd + Z, Ctrl/Cmd + Shift + Z
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Delete an element:</span> select and press Delete or Backspace.
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Duplicate a play:</span> Use the Duplicate button to branch variations.
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Print board:</span> Switch to the Board & Print tab to layout plays for handouts.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="board" className="grid gap-4">
              <BoardView plays={plays} setPlays={setPlays} printCfg={printCfg} setPrintCfg={setPrintCfg} />
              <div className="print-board">
                {printCfg.showTitles ? (
                  <div className="print-grid with-titles">
                    {plays.map((p) => (
                      <div key={p.id} className="print-card">
                        <div className="title">{p.name}</div>
                        <PlayThumb play={p} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="print-grid">
                    {plays.map((p) => (
                      <div key={p.id} className="print-card">
                        <PlayThumb play={p} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}

function SelectedInspector({ play, selection, onChange }) {
  const elt = play.elements.find((e) => e.id === selection);
  if (!elt) return null;

  function patch(p) {
    onChange({ ...play, elements: play.elements.map((e) => (e.id === elt.id ? { ...e, ...p } : e)) });
  }

  return (
    <div className="grid gap-2">
      <div className="text-sm">Type: <span className="font-mono">{elt.type}</span></div>
      {elt.type === ELT.PLAYER ? (
        <div className="grid grid-cols-2 gap-2 items-center">
          <div className="text-sm">Label</div>
          <Input value={elt.label || ""} onChange={(e) => patch({ label: e.target.value })} />
          <div className="text-sm">Color</div>
          <Input type="color" value={elt.color} onChange={(e) => patch({ color: e.target.value })} />
        </div>
      ) : null}
      {elt.type === ELT.BALL ? (
        <div className="grid grid-cols-2 gap-2 items-center">
          <div className="text-sm">Color</div>
          <Input type="color" value={elt.color} onChange={(e) => patch({ color: e.target.value })} />
        </div>
      ) : null}
      {elt.type === ELT.ARROW ? (
        <div className="grid grid-cols-2 gap-2 items-center">
          <div className="text-sm">Style</div>
          <Select value={elt.style} onValueChange={(v) => patch({ style: v })}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value={ARROW_STYLE.SOLID}>Solid</SelectItem>
              <SelectItem value={ARROW_STYLE.DASHED}>Dashed</SelectItem>
              <SelectItem value={ARROW_STYLE.CURVED}>Curved</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm">Color</div>
          <Input type="color" value={elt.color} onChange={(e) => patch({ color: e.target.value })} />
          <div className="text-sm">Thickness</div>
          <Input type="number" min={1} max={10} value={elt.thickness || 3} onChange={(e)=>patch({ thickness: Number(e.target.value)})}/>
          {/* curvature control removed while curved arrows are disabled */}
        </div>
      ) : null}
      {elt.type === ELT.LINE ? (
        <div className="grid grid-cols-2 gap-2 items-center">
          <div className="text-sm">Color</div>
          <Input type="color" value={elt.color} onChange={(e) => patch({ color: e.target.value })} />
          <div className="text-sm">Thickness</div>
          <Input type="number" min={1} max={10} value={elt.thickness || 3} onChange={(e) => patch({ thickness: Number(e.target.value) })} />
        </div>
      ) : null}
      {elt.type === ELT.PERP_LINE ? (
        <div className="grid grid-cols-2 gap-2 items-center">
          <div className="text-sm">Color</div>
          <Input type="color" value={elt.color} onChange={(e) => patch({ color: e.target.value })} />
          <div className="text-sm">Thickness</div>
          <Input type="number" min={1} max={10} value={elt.thickness || 3} onChange={(e) => patch({ thickness: Number(e.target.value) })} />
        </div>
      ) : null}
      {(elt.type === ELT.RECT || elt.type === ELT.ZONE) ? (
        <div className="grid grid-cols-2 gap-2 items-center">
          <div className="text-sm">Color</div>
          <Input type="color" value={elt.color} onChange={(e) => patch({ color: e.target.value })} />
          <div className="text-sm">Width</div>
          <Input type="number" value={Math.round(elt.w)} onChange={(e)=>patch({ w: Number(e.target.value) })}/>
          <div className="text-sm">Height</div>
          <Input type="number" value={Math.round(elt.h)} onChange={(e)=>patch({ h: Number(e.target.value) })}/>
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------
// Print CSS
// ------------------------------------------------------------
function printStyles(cfg) {
  // Determine @page size
  const size = cfg.paper === "letter" ? "8.5in 11in" : cfg.paper === "a4" ? "210mm 297mm" : `${cfg.customW}in ${cfg.customH}in`;
  const margin = `${cfg.marginIn}in`;
  return `
  @page { size: ${size}; margin: ${margin}; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-grid { display: grid; grid-template-columns: repeat(${cfg.perRow}, 1fr); gap: 12px; }
    .print-grid.with-titles .title { font-weight: 600; margin-bottom: 6px; font-size: 12pt; }
    .print-card { break-inside: avoid; page-break-inside: avoid; }
  }
  `;
}
