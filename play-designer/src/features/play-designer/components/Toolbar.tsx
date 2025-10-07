import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ELEMENT_TYPE, type Palette, type ToolType } from "@/features/play-designer/types";
import { ArrowRight, Circle, Grid, Square } from "lucide-react";

export interface ToolbarProps {
  readonly tool: ToolType;
  readonly onToolChange: (tool: ToolType) => void;
  readonly strokeColor: string;
  readonly onStrokeColorChange: (color: string) => void;
  readonly fillColor: string;
  readonly onFillColorChange: (color: string) => void;
  readonly thickness: number;
  readonly onThicknessChange: (value: number) => void;
  readonly palette: Palette;
  readonly playersLocked: boolean;
  readonly onTogglePlayersLocked: () => void;
}

interface TinySwatchProps {
  readonly color: string;
  readonly active: boolean;
  readonly onClick: () => void;
}

function TinySwatch({ color, active, onClick }: TinySwatchProps) {
  return (
    <button
      type="button"
      title={color}
      onClick={onClick}
      className={`h-7 w-7 rounded-full border border-white shadow-sm transition ${active ? "ring-2 ring-sky-500 scale-110" : "hover:scale-105"}`}
      style={{ backgroundColor: color }}
    />
  );
}

/**
 * Interactive toolbar that owns the drawing tool selection and stylistic controls.
 */
export function Toolbar({
  tool,
  onToolChange,
  strokeColor,
  onStrokeColorChange,
  fillColor,
  onFillColorChange,
  thickness,
  onThicknessChange,
  palette,
  playersLocked,
  onTogglePlayersLocked,
}: ToolbarProps) {
  const showStrokeColor =
    tool === ELEMENT_TYPE.ARROW || tool === ELEMENT_TYPE.LINE || tool === ELEMENT_TYPE.PERP_LINE || tool === ELEMENT_TYPE.RECT;
  const showFillColor = tool === ELEMENT_TYPE.PLAYER || tool === ELEMENT_TYPE.BALL || tool === ELEMENT_TYPE.ZONE;
  const showThickness = tool === ELEMENT_TYPE.ARROW || tool === ELEMENT_TYPE.LINE || tool === ELEMENT_TYPE.PERP_LINE;

  return (
    <Card className="w-full">
      <CardHeader className="py-3">
        <CardTitle className="text-base">Tools</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap gap-2 md:gap-3">
          <Button
            type="button"
            variant={tool === ELEMENT_TYPE.PLAYER ? "default" : "secondary"}
            onClick={() => onToolChange(ELEMENT_TYPE.PLAYER)}
            className="gap-2 rounded-full px-4"
          >
            <Circle size={16} />Player
          </Button>
          <Button
            type="button"
            variant={tool === ELEMENT_TYPE.BALL ? "default" : "secondary"}
            onClick={() => onToolChange(ELEMENT_TYPE.BALL)}
            className="gap-2 rounded-full px-4"
          >
            <svg width="16" height="12" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <ellipse cx="16" cy="12" rx="12" ry="7" fill="currentColor" opacity="0.95" />
              <ellipse cx="16" cy="12" rx="10" ry="5.5" fill="none" stroke="#ffffff" strokeWidth="1" />
              <line x1="9" y1="12" x2="23" y2="12" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
              {[-2, -1, 0, 1, 2].map((index) => (
                <line
                  key={index}
                  x1={16 + index * 4 - 0.6}
                  y1={8.5}
                  x2={16 + index * 4 + 0.6}
                  y2={15.5}
                  stroke="#ffffff"
                  strokeWidth="0.9"
                  strokeLinecap="round"
                />
              ))}
            </svg>
            Ball
          </Button>
          <Button
            type="button"
            variant={tool === ELEMENT_TYPE.ARROW ? "default" : "secondary"}
            onClick={() => onToolChange(ELEMENT_TYPE.ARROW)}
            className="gap-2 rounded-full px-4"
          >
            <ArrowRight size={16} />Arrow
          </Button>
          <Button
            type="button"
            variant={tool === ELEMENT_TYPE.LINE ? "default" : "secondary"}
            onClick={() => onToolChange(ELEMENT_TYPE.LINE)}
            className="gap-2 rounded-full px-4"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Line
          </Button>
          <Button
            type="button"
            variant={tool === ELEMENT_TYPE.PERP_LINE ? "default" : "secondary"}
            onClick={() => onToolChange(ELEMENT_TYPE.PERP_LINE)}
            className="gap-2 rounded-full px-4"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="14" y1="6" x2="14" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Perp
          </Button>
          <Button
            type="button"
            variant={tool === ELEMENT_TYPE.RECT ? "default" : "secondary"}
            onClick={() => onToolChange(ELEMENT_TYPE.RECT)}
            className="gap-2 rounded-full px-4"
          >
            <Square size={16} />Rect
          </Button>
          <Button
            type="button"
            variant={tool === ELEMENT_TYPE.ZONE ? "default" : "secondary"}
            onClick={() => onToolChange(ELEMENT_TYPE.ZONE)}
            className="gap-2 rounded-full px-4"
          >
            <Grid size={16} />Zone
          </Button>
          <Button
            type="button"
            size="icon"
            variant={playersLocked ? "default" : "secondary"}
            onClick={onTogglePlayersLocked}
            title={playersLocked ? "Unlock players" : "Lock players"}
            className="rounded-full"
          >
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
                {palette.map((color) => (
                  <TinySwatch
                    key={color}
                    color={color}
                    active={color === strokeColor}
                    onClick={() => onStrokeColorChange(color)}
                  />
                ))}
                <Input type="color" value={strokeColor} onChange={(event) => onStrokeColorChange(event.target.value)} className="w-12 h-8 p-0" />
              </div>
            </div>
          ) : null}
          {showFillColor ? (
            <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3">
              <div className="text-sm font-semibold text-slate-700">Fill color</div>
              <div className="flex flex-wrap gap-2">
                {palette.map((color) => (
                  <TinySwatch
                    key={color}
                    color={color}
                    active={color === fillColor}
                    onClick={() => onFillColorChange(color)}
                  />
                ))}
                <Input type="color" value={fillColor} onChange={(event) => onFillColorChange(event.target.value)} className="w-12 h-8 p-0" />
              </div>
            </div>
          ) : null}
          {showThickness ? (
            <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3">
              <div className="text-sm font-semibold text-slate-700">Line thickness</div>
              <div className="px-2">
                <Slider value={[thickness]} onValueChange={(value) => onThicknessChange(value[0])} min={1} max={10} step={1} />
                <div className="mt-2 text-xs font-medium text-slate-500">Current: {thickness}px</div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Field dimensions and player radius controls now live in the Field settings panel to keep the tools focused on drawing options. */}
      </CardContent>
    </Card>
  );
}
