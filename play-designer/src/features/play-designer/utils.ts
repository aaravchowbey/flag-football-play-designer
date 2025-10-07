import type {
	PaperDimensionsIn,
	Play,
	PlayElement,
	WristConfig,
} from "@/features/play-designer/types";
import { ELEMENT_TYPE, STROKE_STYLE } from "@/features/play-designer/types";

/**
 * Shared numeric defaults that define how the playing field is rendered.
 * Exported to keep the values in sync across the UI, SVG, print utilities, and tests.
 */
export const FIELD_CONSTANTS = {
	DEFAULT_PLAY_SIZE: { w: 600, h: 800 },
	FIELD_MARGIN_VERTICAL: 40,
	FIELD_MARGIN_HORIZONTAL: 40,
	DEFAULT_DIVISIONS: 20,
	DEFAULT_FIELD_WIDTH: 30,
	DEFAULT_LINE_OF_SCRIMMAGE: 5,
	SNAP_RADIUS: 18,
} as const;

const BASE_UNIT_PX =
	(FIELD_CONSTANTS.DEFAULT_PLAY_SIZE.h - FIELD_CONSTANTS.FIELD_MARGIN_VERTICAL * 2) /
	FIELD_CONSTANTS.DEFAULT_DIVISIONS;

/**
 * Simple GUID helper for client-side state. We avoid `crypto.randomUUID` to keep compatibility with SSR and older browsers.
 */
export const generateUid = (): string => Math.random().toString(36).slice(2, 9);

/**
 * Clamps a number between `min` and `max`, falling back to the bounds when the input is not finite.
 */
export function clamp(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return min;
	return Math.max(min, Math.min(max, value));
}

/**
 * Converts yard dimensions into canvas pixels, honoring the board margins.
 */
export function computeFieldSize(widthYards: number, lengthYards: number) {
	const widthUnits = Math.max(1, Math.round(widthYards) || 1);
	const lengthUnits = Math.max(1, Math.round(lengthYards) || 1);
	const w = FIELD_CONSTANTS.FIELD_MARGIN_HORIZONTAL * 2 + widthUnits * BASE_UNIT_PX;
	const h = FIELD_CONSTANTS.FIELD_MARGIN_VERTICAL * 2 + lengthUnits * BASE_UNIT_PX;
	return { w, h } as const;
}

/**
 * Creates a brand-new empty play using the configured defaults.
 */
export function createEmptyPlay(name = "New Play"): Play {
	const size = computeFieldSize(
		FIELD_CONSTANTS.DEFAULT_FIELD_WIDTH,
		FIELD_CONSTANTS.DEFAULT_DIVISIONS,
	);
	return {
		id: generateUid(),
		name,
		size,
		lineOfScrimmage: FIELD_CONSTANTS.DEFAULT_LINE_OF_SCRIMMAGE,
		fieldWidthYards: FIELD_CONSTANTS.DEFAULT_FIELD_WIDTH,
		fieldLengthYards: FIELD_CONSTANTS.DEFAULT_DIVISIONS,
		elements: [],
	};
}

/**
 * Source for the default palette chips shown in the toolbar.
 */
export const DEFAULT_PALETTE: ReadonlyArray<string> = [
	"#111827",
	"#ef4444",
	"#f59e0b",
	"#10b981",
	"#3b82f6",
	"#8b5cf6",
	"#ec4899",
	"#c0c0c0",
];

/**
 * Returns the printable paper size in inches, honoring the custom width/height when requested.
 */
export function getPaperSizeIn(config: {
	paper: string;
	customW: number;
	customH: number;
} | null | undefined): PaperDimensionsIn {
	if (!config) {
		return { widthIn: 8.5, heightIn: 11 };
	}
	if (config.paper === "a4") {
		return { widthIn: 8.27, heightIn: 11.69 };
	}
	if (config.paper === "custom") {
		return {
			widthIn: Math.max(1, Number(config.customW) || 1),
			heightIn: Math.max(1, Number(config.customH) || 1),
		};
	}
	return { widthIn: 8.5, heightIn: 11 };
}

/**
 * Handful of helpers that depend on browser globals guard themselves with `typeof window` checks to stay SSR-safe.
 */
export const isBrowser = typeof window !== "undefined";

/**
 * Normalises the persisted payload so older versions of the stored schema still render correctly.
 * This is especially important when users import a JSON file created before the latest set of defaults.
 */
export function normalisePlay(raw: Play): Play {
	const safeWidth = Math.max(1, raw.fieldWidthYards || FIELD_CONSTANTS.DEFAULT_FIELD_WIDTH);
	const safeLength = Math.max(1, Math.round(raw.fieldLengthYards) || FIELD_CONSTANTS.DEFAULT_DIVISIONS);
	const safeLOS =
		raw.lineOfScrimmage === null || raw.lineOfScrimmage === undefined
			? FIELD_CONSTANTS.DEFAULT_LINE_OF_SCRIMMAGE
			: clamp(Math.round(raw.lineOfScrimmage), 0, safeLength);

	return {
		...raw,
		fieldWidthYards: safeWidth,
		fieldLengthYards: safeLength,
		lineOfScrimmage: safeLOS,
		size: computeFieldSize(safeWidth, safeLength),
		elements: raw.elements?.map((element) => normaliseElement(element)) ?? [],
	};
}

/**
 * Ensures every element carries the properties we expect. Missing properties are backfilled with defaults.
 */
export function normaliseElement(element: PlayElement): PlayElement {
	switch (element.type) {
		case ELEMENT_TYPE.PLAYER:
			return {
				...element,
				label: element.label ?? "",
				color: element.color ?? DEFAULT_PALETTE[0],
				r: Number.isFinite(element.r) ? element.r : 25,
			};
		case ELEMENT_TYPE.BALL:
			return {
				...element,
				color: element.color ?? "#a16207",
			};
		case ELEMENT_TYPE.ARROW:
		case ELEMENT_TYPE.LINE:
			return {
				...element,
				style: element.style ?? STROKE_STYLE.SOLID,
				thickness: Number.isFinite(element.thickness) ? element.thickness : 3,
				color: element.color ?? DEFAULT_PALETTE[0],
			} as PlayElement;
		case ELEMENT_TYPE.PERP_LINE:
			return {
				...element,
				style: element.style ?? STROKE_STYLE.SOLID,
				thickness: Number.isFinite(element.thickness) ? element.thickness : 3,
				tick: Number.isFinite(element.tick) ? element.tick : 12,
				color: element.color ?? DEFAULT_PALETTE[0],
			};
		case ELEMENT_TYPE.RECT:
		case ELEMENT_TYPE.ZONE:
			return {
				...element,
				color: element.color ?? DEFAULT_PALETTE[0],
				w: Number.isFinite(element.w) ? element.w : 0,
				h: Number.isFinite(element.h) ? element.h : 0,
			};
		default:
			return element;
	}
}

/**
 * Normalises every play in a list, useful after reading from localStorage or an uploaded JSON file.
 */
export function normalisePlayCollection(plays: Play[]): Play[] {
	return plays.map((play) => normalisePlay(play));
}

/**
 * Best-effort parsing of uploaded JSON. The function validates top-level structure and falls back to an empty list when invalid.
 */
export function parseImportedPlays(payload: unknown): Play[] | null {
	if (!Array.isArray(payload)) return null;
	const typed = payload.filter((item): item is Play => typeof item === "object" && item !== null && "id" in item);
	return normalisePlayCollection(typed);
}

/**
 * Returns a lazy default wrist configuration when the persisted value is missing.
 */
export function getDefaultWristConfig(): WristConfig {
	return {
		widthIn: 4,
		heightIn: 3,
		playCount: 4,
		selectedIds: [],
	};
}

