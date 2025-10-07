import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlayThumb } from "@/features/play-designer/components/PlayThumb";
import { getPaperSizeIn } from "@/features/play-designer/utils";
import type { CSSProperties } from "react";
import type { Play, PrintConfig, WristConfig } from "@/features/play-designer/types";
import { Printer } from "lucide-react";

export interface BoardViewProps {
  readonly plays: Play[];
  readonly printConfig: PrintConfig;
  readonly wristConfig: WristConfig;
  readonly onUpdateWristConfig: (update: Partial<WristConfig>) => void;
  readonly onPrintWrist: () => void;
}

interface WristLayoutMetrics {
  readonly previewScale: number;
  readonly paperWidthIn: number;
  readonly paperHeightIn: number;
  readonly cardWidthIn: number;
  readonly cardHeightIn: number;
  readonly gridCols: number;
  readonly gridRows: number;
  readonly playsToRender: Play[];
  readonly missingPlays: number;
  readonly gridStyle: CSSProperties;
  readonly previewWrapperStyle: CSSProperties;
}

/**
 * UI for the wrist-coach generator and print preview.
 */
export function BoardView({ plays, printConfig, wristConfig, onUpdateWristConfig, onPrintWrist }: BoardViewProps) {
  const metrics = useMemo(() => computeWristMetrics(plays, printConfig, wristConfig), [plays, printConfig, wristConfig]);

  const togglePlaySelection = (id: string) => {
    const exists = wristConfig.selectedIds.includes(id);
    let nextIds = exists ? wristConfig.selectedIds.filter((pid) => pid !== id) : [...wristConfig.selectedIds, id];
    if (!exists && nextIds.length > wristConfig.playCount) {
      nextIds = nextIds.slice(nextIds.length - wristConfig.playCount);
    }
    onUpdateWristConfig({ selectedIds: nextIds });
  };

  const autofillSelection = () => {
    onUpdateWristConfig({ selectedIds: plays.slice(0, wristConfig.playCount).map((play) => play.id) });
  };

  const handlePlayCountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(event.target.value);
    const next = Number.isFinite(raw) ? Math.min(Math.max(Math.round(raw), 1), Math.max(1, plays.length)) : 1;
    onUpdateWristConfig({ playCount: next });
  };

  return (
    <div className="grid gap-4">
      <Card className="md:col-span-3 border-slate-200 bg-white/90 shadow-sm">
        <CardHeader className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Wrist coach sheet</CardTitle>
          <Button onClick={onPrintWrist} className="gap-2 rounded-full" variant="secondary">
            <Printer size={16} />Print wrist insert
          </Button>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex-1 space-y-4">
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-slate-700">Card width (in)</div>
                    <Input
                      type="number"
                      min={1}
                      step={0.1}
                      value={metrics.cardWidthIn}
                      onChange={(event) =>
                        onUpdateWristConfig({ widthIn: Math.max(1, Number(event.target.value) || 1) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-slate-700">Card height (in)</div>
                    <Input
                      type="number"
                      min={1}
                      step={0.1}
                      value={metrics.cardHeightIn}
                      onChange={(event) =>
                        onUpdateWristConfig({ heightIn: Math.max(1, Number(event.target.value) || 1) })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-slate-700">Plays on card</div>
                    <Input
                      type="number"
                      min={1}
                      max={plays.length || 1}
                      value={wristConfig.playCount}
                      onChange={handlePlayCountChange}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-700">Choose plays</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {plays.map((play) => {
                    const checked = wristConfig.selectedIds.includes(play.id);
                    const disable = !checked && wristConfig.selectedIds.length >= wristConfig.playCount;
                    return (
                      <label
                        key={play.id}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                          checked ? "border-slate-600 bg-slate-100" : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={checked}
                          disabled={disable}
                          onChange={() => togglePlaySelection(play.id)}
                        />
                        <span className="truncate">{play.name}</span>
                      </label>
                    );
                  })}
                </div>
                {metrics.missingPlays > 0 ? (
                  <div className="text-xs font-medium text-amber-600">
                    Select {metrics.missingPlays} more play{metrics.missingPlays === 1 ? "" : "s"} to fill the card.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="text-sm font-semibold text-slate-700">Preview (scaled)</div>
              <div className="wrist-preview-container rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="wrist-preview-wrapper" style={metrics.previewWrapperStyle}>
                  <div className="wrist-page flex h-full w-full items-center justify-center bg-white shadow-lg ring-1 ring-slate-200">
                    <div
                      className="wrist-card relative flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-500 bg-white"
                      style={{
                        width: `${metrics.cardWidthIn}in`,
                        height: `${metrics.cardHeightIn}in`,
                        padding: `${12 / 96}in`,
                      }}
                    >
                      {metrics.playsToRender.length ? (
                        <div className="flex-1 flex items-center justify-center overflow-hidden">
                          <div className="wrist-card-grid" style={metrics.gridStyle}>
                            {metrics.playsToRender.map((play) => (
                              <div
                                key={play.id}
                                className="wrist-cell overflow-hidden rounded-xl border border-slate-200 bg-white"
                                style={{ minWidth: 0, minHeight: 0 }}
                              >
                                <PlayThumb play={play} className="h-full w-full" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-center text-[11px] text-slate-500">
                          Select plays to populate your wrist card.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Print on {metrics.paperWidthIn.toFixed(2)}″ × {metrics.paperHeightIn.toFixed(2)}″ paper, cut along the dashed border for a {metrics.cardWidthIn.toFixed(2)}″ × {metrics.cardHeightIn.toFixed(2)}″ insert.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const CARD_PADDING_IN = 12 / 96;
const BASE_GAP_IN = 0.07;

function computeWristMetrics(plays: Play[], printConfig: PrintConfig, wristConfig: WristConfig): WristLayoutMetrics {
  const { widthIn: paperWidthIn, heightIn: paperHeightIn } = getPaperSizeIn(printConfig);
  const pageWidthPx = paperWidthIn * 96;
  const pageHeightPx = paperHeightIn * 96;
  const scaleWidth = pageWidthPx ? 360 / pageWidthPx : 1;
  const scaleHeight = pageHeightPx ? 520 / pageHeightPx : 1;
  const previewScale = Math.min(1, Number.isFinite(scaleWidth) ? scaleWidth : 1, Number.isFinite(scaleHeight) ? scaleHeight : 1);

  const cardWidthIn = Math.max(1, Number(wristConfig.widthIn) || 1);
  const cardHeightIn = Math.max(1, Number(wristConfig.heightIn) || 1);

  const selectedPlays = wristConfig.selectedIds
    .map((id) => plays.find((play) => play.id === id))
    .filter((play): play is Play => Boolean(play));
  const playLimit = Math.max(1, wristConfig.playCount || selectedPlays.length || 1);
  const playsToRender = selectedPlays.slice(0, playLimit);
  const missingPlays = Math.max(0, playLimit - playsToRender.length);
  const count = playsToRender.length;
  const gridCols = count <= 1 ? 1 : count === 2 ? 2 : Math.ceil(Math.sqrt(count));
  const gridRows = Math.max(1, Math.ceil(Math.max(count, 1) / gridCols));

  const innerWidthIn = Math.max(cardWidthIn - CARD_PADDING_IN * 2, 0.5);
  const innerHeightIn = Math.max(cardHeightIn - CARD_PADDING_IN * 2, 0.5);
  const adaptiveGapIn = Math.min(
    BASE_GAP_IN,
    innerWidthIn / Math.max(gridCols * 6, 1),
    innerHeightIn / Math.max(gridRows * 6, 1),
  );
  const gapIn = count <= 2 ? adaptiveGapIn : adaptiveGapIn * 0.85;
  const totalGapWidthIn = Math.max(0, gridCols - 1) * gapIn;
  const totalGapHeightIn = Math.max(0, gridRows - 1) * gapIn;
  const cellWidthIn = gridCols > 0 ? Math.max((innerWidthIn - totalGapWidthIn) / gridCols, 0) : innerWidthIn;
  const cellHeightIn = gridRows > 0 ? Math.max((innerHeightIn - totalGapHeightIn) / gridRows, 0) : innerHeightIn;
  const gridWidthIn = cellWidthIn * gridCols + totalGapWidthIn;
  const gridHeightIn = cellHeightIn * gridRows + totalGapHeightIn;
  const gridStyle: CSSProperties = {
    width: `${gridWidthIn}in`,
    height: `${gridHeightIn}in`,
    display: "grid",
  gridTemplateColumns: `repeat(${gridCols}, ${cellWidthIn}in)`,
  gridTemplateRows: `repeat(${gridRows}, ${cellHeightIn}in)`,
    gap: `${gapIn}in`,
    justifyContent: "center",
    alignContent: "center",
  };

  const previewWrapperStyle: CSSProperties = {
    width: `${paperWidthIn}in`,
    height: `${paperHeightIn}in`,
    transform: `scale(${previewScale})`,
    transformOrigin: "top left",
  };

  return {
    previewScale,
    paperWidthIn,
    paperHeightIn,
    cardWidthIn,
    cardHeightIn,
    gridCols,
    gridRows,
    playsToRender,
    missingPlays,
    gridStyle,
    previewWrapperStyle,
  };
}
