import { Fragment } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ELEMENT_TYPE,
  STROKE_STYLE,
  type ArrowElement,
  type BallElement,
  type LineElement,
  type PerpendicularLineElement,
  type PlayElement,
  type PlayerElement,
  type RectElement,
  type ZoneElement,
} from "@/features/play-designer/types";

interface SelectedInspectorProps {
  readonly element: PlayElement | null;
  readonly onElementChange: (next: PlayElement) => void;
}

/**
 * Sidebar controls for the currently selected element. Emits a full, updated element object each time a field changes.
 */
export function SelectedInspector({ element, onElementChange }: SelectedInspectorProps) {
  if (!element) {
    return <div className="text-sm text-slate-500">No element selected.</div>;
  }

  return (
    <div className="grid gap-2">
      <div className="text-sm">
        Type: <span className="font-mono">{element.type}</span>
      </div>
      {element.type === ELEMENT_TYPE.PLAYER ? (
        <PlayerInspector
          element={element}
          onPatch={(update) => onElementChange({ ...element, ...update } as PlayElement)}
        />
      ) : null}
      {element.type === ELEMENT_TYPE.BALL ? (
        <BallInspector
          element={element}
          onPatch={(update) => onElementChange({ ...element, ...update } as PlayElement)}
        />
      ) : null}
      {element.type === ELEMENT_TYPE.ARROW ? (
        <ArrowInspector
          element={element}
          onPatch={(update) => onElementChange({ ...element, ...update } as PlayElement)}
        />
      ) : null}
      {element.type === ELEMENT_TYPE.LINE || element.type === ELEMENT_TYPE.PERP_LINE ? (
        <LineInspector
          element={element}
          onPatch={(update) => onElementChange({ ...element, ...update } as PlayElement)}
        />
      ) : null}
      {element.type === ELEMENT_TYPE.RECT || element.type === ELEMENT_TYPE.ZONE ? (
        <RectInspector
          element={element}
          onPatch={(update) => onElementChange({ ...element, ...update } as PlayElement)}
        />
      ) : null}
    </div>
  );
}

interface InspectorProps<T extends PlayElement> {
  readonly element: T;
  readonly onPatch: (update: Partial<T>) => void;
}

function PlayerInspector({ element, onPatch }: InspectorProps<PlayerElement>) {
  if (element.type !== ELEMENT_TYPE.PLAYER) return null;
  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      <div className="text-sm">Label</div>
      <Input value={element.label} onChange={(event) => onPatch({ label: event.target.value })} />
      <div className="text-sm">Color</div>
      <Input type="color" value={element.color} onChange={(event) => onPatch({ color: event.target.value })} />
    </div>
  );
}

function BallInspector({ element, onPatch }: InspectorProps<BallElement>) {
  if (element.type !== ELEMENT_TYPE.BALL) return null;
  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      <div className="text-sm">Color</div>
      <Input type="color" value={element.color} onChange={(event) => onPatch({ color: event.target.value })} />
    </div>
  );
}

function ArrowInspector({ element, onPatch }: InspectorProps<ArrowElement>) {
  return (
    <Fragment>
      <div className="grid grid-cols-2 gap-2 items-center">
        <div className="text-sm">Style</div>
        <Select value={element.style} onValueChange={(value) => onPatch({ style: value as ArrowElement["style"] })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STROKE_STYLE.SOLID}>Solid</SelectItem>
            <SelectItem value={STROKE_STYLE.DASHED}>Dashed</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm">Color</div>
        <Input type="color" value={element.color} onChange={(event) => onPatch({ color: event.target.value })} />
        <div className="text-sm">Thickness</div>
        <Input
          type="number"
          min={1}
          max={10}
          value={element.thickness}
          onChange={(event) => onPatch({ thickness: Number(event.target.value) })}
        />
      </div>
    </Fragment>
  );
}

function LineInspector({ element, onPatch }: InspectorProps<LineElement | PerpendicularLineElement>) {
  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      <div className="text-sm">Style</div>
      <Select
        value={element.style ?? STROKE_STYLE.SOLID}
        onValueChange={(value) => onPatch({ style: value as LineElement["style"] })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={STROKE_STYLE.SOLID}>Solid</SelectItem>
          <SelectItem value={STROKE_STYLE.DASHED}>Dashed</SelectItem>
        </SelectContent>
      </Select>
      <div className="text-sm">Color</div>
      <Input type="color" value={element.color} onChange={(event) => onPatch({ color: event.target.value })} />
      <div className="text-sm">Thickness</div>
      <Input
        type="number"
        min={1}
        max={10}
        value={element.thickness ?? 3}
        onChange={(event) => onPatch({ thickness: Number(event.target.value) })}
      />
    </div>
  );
}

function RectInspector({ element, onPatch }: InspectorProps<RectElement | ZoneElement>) {
  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      <div className="text-sm">Color</div>
      <Input type="color" value={element.color} onChange={(event) => onPatch({ color: event.target.value })} />
      <div className="text-sm">Width</div>
      <Input type="number" value={Math.round(element.w)} onChange={(event) => onPatch({ w: Number(event.target.value) })} />
      <div className="text-sm">Height</div>
      <Input type="number" value={Math.round(element.h)} onChange={(event) => onPatch({ h: Number(event.target.value) })} />
    </div>
  );
}
