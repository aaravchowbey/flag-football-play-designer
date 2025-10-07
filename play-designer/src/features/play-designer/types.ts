import type { ReactNode } from "react";

/**
 * Collects the union of every drawable element displayed on the field editor.
 * Each element is tagged with a literal "type" property so we can discriminate on it safely.
 */
export const ELEMENT_TYPE = {
  PLAYER: "player",
  BALL: "ball",
  ARROW: "arrow",
  PERP_LINE: "perp_line",
  LINE: "line",
  RECT: "rect",
  ZONE: "zone",
} as const;

export type ElementType = (typeof ELEMENT_TYPE)[keyof typeof ELEMENT_TYPE];

/**
 * Supported stroke renderings for line-based elements.
 */
export const STROKE_STYLE = {
  SOLID: "solid",
  DASHED: "dashed",
} as const;
export type StrokeStyle = (typeof STROKE_STYLE)[keyof typeof STROKE_STYLE];

/**
 * Convenience alias for RGBA/hex strings; we do not attempt to validate the format at runtime.
 */
export type ColorHex = string;

export interface Dimensions {
  readonly w: number;
  readonly h: number;
}

interface BaseElement {
  readonly id: string;
  readonly type: ElementType;
}

export interface PlayerElement extends BaseElement {
  readonly type: typeof ELEMENT_TYPE.PLAYER;
  readonly x: number;
  readonly y: number;
  readonly color: ColorHex;
  readonly label: string;
  readonly r: number;
}

export interface BallElement extends BaseElement {
  readonly type: typeof ELEMENT_TYPE.BALL;
  readonly x: number;
  readonly y: number;
  readonly color: ColorHex;
}

export interface ArrowElement extends BaseElement {
  readonly type: typeof ELEMENT_TYPE.ARROW;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly color: ColorHex;
  readonly style: StrokeStyle;
  readonly thickness: number;
}

export interface LineElement extends BaseElement {
  readonly type: typeof ELEMENT_TYPE.LINE;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly color: ColorHex;
  readonly style: StrokeStyle;
  readonly thickness: number;
}

export interface PerpendicularLineElement extends BaseElement {
  readonly type: typeof ELEMENT_TYPE.PERP_LINE;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly color: ColorHex;
  readonly style: StrokeStyle;
  readonly thickness: number;
  readonly tick: number;
}

export interface RectElement extends BaseElement {
  readonly type: typeof ELEMENT_TYPE.RECT;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly color: ColorHex;
}

export interface ZoneElement extends BaseElement {
  readonly type: typeof ELEMENT_TYPE.ZONE;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly color: ColorHex;
}

export type PlayElement =
  | PlayerElement
  | BallElement
  | ArrowElement
  | LineElement
  | PerpendicularLineElement
  | RectElement
  | ZoneElement;

export interface Play {
  readonly id: string;
  readonly name: string;
  readonly size: Dimensions;
  readonly lineOfScrimmage: number | null;
  readonly fieldWidthYards: number;
  readonly fieldLengthYards: number;
  readonly elements: PlayElement[];
}

export type ToolType =
  | typeof ELEMENT_TYPE.PLAYER
  | typeof ELEMENT_TYPE.BALL
  | typeof ELEMENT_TYPE.ARROW
  | typeof ELEMENT_TYPE.PERP_LINE
  | typeof ELEMENT_TYPE.LINE
  | typeof ELEMENT_TYPE.RECT
  | typeof ELEMENT_TYPE.ZONE;

export type Palette = readonly ColorHex[];

export type PaperSizeOption = "letter" | "a4" | "custom";

export interface PrintConfig {
  readonly paper: PaperSizeOption;
  readonly perRow: number;
  readonly marginIn: number;
  readonly showTitles: boolean;
  readonly customW: number;
  readonly customH: number;
}

export interface WristConfig {
  readonly widthIn: number;
  readonly heightIn: number;
  readonly playCount: number;
  readonly selectedIds: readonly string[];
}

export interface PaperDimensionsIn {
  readonly widthIn: number;
  readonly heightIn: number;
}

export interface DesignerSnapshot {
  readonly plays: Play[];
  readonly activeId: string | null;
}

export interface YardLineConfig {
  readonly width: number;
  readonly height: number;
  readonly lineOfScrimmage: number | null;
  readonly divisions: number;
  readonly horizontalMargin: number;
  readonly verticalMargin: number;
}

export interface YardLineRenderProps {
  readonly config: YardLineConfig;
  readonly losColor?: ColorHex;
  readonly yardColor?: ColorHex;
  readonly render?: (lines: ReactNode[]) => ReactNode;
}
