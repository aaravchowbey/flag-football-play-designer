import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Download, Upload, Trash2, Copy, Undo2, Redo2, Layers } from "lucide-react";
import { PlayCanvas } from "@/features/play-designer/components/PlayCanvas";
import { Toolbar } from "@/features/play-designer/components/Toolbar";
import { BoardView } from "@/features/play-designer/components/BoardView";
import { SelectedInspector } from "@/features/play-designer/components/SelectedInspector";
import {
  ELEMENT_TYPE,
  type DesignerSnapshot,
  type Play,
  type PlayElement,
  type PrintConfig,
  type ToolType,
  type WristConfig,
} from "@/features/play-designer/types";
import {
  DEFAULT_PALETTE,
  FIELD_CONSTANTS,
  clamp,
  computeFieldSize,
  createEmptyPlay,
  generateUid,
  getDefaultWristConfig,
  parseImportedPlays,
} from "@/features/play-designer/utils";
import { loadPlaysFromStorage, savePlaysToStorage } from "@/features/play-designer/storage";
import { buildPrintStyles } from "@/features/play-designer/printing";
import { downloadJson, exportSvgToPng } from "@/features/play-designer/download";
import { useHistory } from "@/features/play-designer/hooks/useHistory";

const DEFAULT_PRINT_CONFIG: PrintConfig = {
  paper: "letter",
  perRow: 3,
  marginIn: 0.5,
  showTitles: true,
  customW: 8.5,
  customH: 11,
};

export default function App() {
  // ------------------------------------------------------------
  // Bootstrapping ------------------------------------------------
  // ------------------------------------------------------------
  const initialSnapshotRef = useRef<DesignerSnapshot | null>(null);
  if (!initialSnapshotRef.current) {
    const stored = loadPlaysFromStorage();
    const initialPlays = stored && stored.length ? stored : [createEmptyPlay("Play 1")];
    initialSnapshotRef.current = {
      plays: initialPlays,
      activeId: initialPlays[0]?.id ?? null,
    };
  }

  const [plays, setPlays] = useState<Play[]>(initialSnapshotRef.current!.plays);
  const [activeId, setActiveId] = useState<string | null>(initialSnapshotRef.current!.activeId);
  const history = useHistory(initialSnapshotRef.current!, { capacity: 75 });

  // ------------------------------------------------------------
  // Designer state ------------------------------------------------
  // ------------------------------------------------------------
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolType>(ELEMENT_TYPE.PLAYER);
  const [strokeColor, setStrokeColor] = useState<string>(DEFAULT_PALETTE[0]);
  const [fillColor, setFillColor] = useState<string>(DEFAULT_PALETTE[0]);
  const [thickness, setThickness] = useState<number>(3);
  const [playersLocked, setPlayersLocked] = useState<boolean>(false);
  const palette = useMemo(() => DEFAULT_PALETTE, []);
  const playerRadius = 25;

  const printConfigRef = useRef<PrintConfig>(DEFAULT_PRINT_CONFIG);
  const printConfig = printConfigRef.current;
  const [wristConfig, setWristConfig] = useState<WristConfig>(() => getDefaultWristConfig());

  const svgRef = useRef<SVGSVGElement | null>(null);

  const activePlay = useMemo(
    () => plays.find((play) => play.id === activeId) ?? plays[0] ?? null,
    [plays, activeId],
  );

  const selectedElement = useMemo<PlayElement | null>(
    () => (activePlay ? activePlay.elements.find((element) => element.id === selectionId) ?? null : null),
    [activePlay, selectionId],
  );

  const printStyles = useMemo(() => buildPrintStyles(printConfig, wristConfig), [printConfig, wristConfig]);
  const fieldWidthYards = activePlay?.fieldWidthYards ?? FIELD_CONSTANTS.DEFAULT_FIELD_WIDTH;
  const fieldLengthYards = activePlay?.fieldLengthYards ?? FIELD_CONSTANTS.DEFAULT_DIVISIONS;

  // ------------------------------------------------------------
  // Lifecycle + derived effects ---------------------------------
  // ------------------------------------------------------------
  useEffect(() => savePlaysToStorage(plays), [plays]);

  useEffect(() => history.register({ plays, activeId }), [history, plays, activeId]);

  useEffect(() => {
    if (!plays.length) {
      setActiveId(null);
      return;
    }
    if (!plays.some((play) => play.id === activeId)) {
      setActiveId(plays[0].id);
    }
  }, [plays, activeId]);

  useEffect(() => {
    setSelectionId((current) => {
      if (!current || !activePlay) return null;
      return activePlay.elements.some((element) => element.id === current) ? current : null;
    });
  }, [activePlay]);

  useEffect(() => {
    setWristConfig((current) => {
      const availableIds = plays.map((play) => play.id);
      let nextSelected = current.selectedIds.filter((id) => availableIds.includes(id));
      if (nextSelected.length < current.playCount) {
        const extras = availableIds
          .filter((id) => !nextSelected.includes(id))
          .slice(0, current.playCount - nextSelected.length);
        nextSelected = [...nextSelected, ...extras];
      } else if (nextSelected.length > current.playCount) {
        nextSelected = nextSelected.slice(0, current.playCount);
      }
      const changed =
        nextSelected.length !== current.selectedIds.length ||
        nextSelected.some((id, index) => id !== current.selectedIds[index]);
      return changed ? { ...current, selectedIds: nextSelected } : current;
    });
  }, [plays, wristConfig.playCount]);

  // ------------------------------------------------------------
  // Helpers -----------------------------------------------------
  // ------------------------------------------------------------
  const updateActivePlay = useCallback(
    (updater: (play: Play) => Play) => {
      if (!activeId) return;
      setPlays((current) => current.map((play) => (play.id === activeId ? updater(play) : play)));
    },
    [activeId],
  );

  const handleToolChange = useCallback((next: ToolType) => setTool(next), []);
  const handleStrokeColorChange = useCallback((color: string) => setStrokeColor(color), []);
  const handleFillColorChange = useCallback((color: string) => setFillColor(color), []);
  const handleThicknessChange = useCallback((value: number) => setThickness(value), []);
  const handleTogglePlayersLocked = useCallback(() => setPlayersLocked((locked) => !locked), []);

  const handleActivePlayChange = useCallback(
    (next: Play) => {
      updateActivePlay(() => next);
    },
    [updateActivePlay],
  );

  const handlePlayNameChange = useCallback(
    (name: string) => {
      updateActivePlay((play) => ({ ...play, name }));
    },
    [updateActivePlay],
  );

  const handleFieldDimensionsChange = useCallback(
    (update: { widthYards?: number; lengthYards?: number }) => {
      updateActivePlay((play) => {
        const nextWidth = Math.max(1, update.widthYards ?? play.fieldWidthYards ?? FIELD_CONSTANTS.DEFAULT_FIELD_WIDTH);
        const nextLength = Math.max(
          1,
          Math.round(update.lengthYards ?? play.fieldLengthYards ?? FIELD_CONSTANTS.DEFAULT_DIVISIONS),
        );
        const nextSize = computeFieldSize(nextWidth, nextLength);
        const los = play.lineOfScrimmage;
        const clampedLos =
          los === null || los === undefined ? null : Math.min(Math.max(0, Math.round(los)), nextLength);
        return {
          ...play,
          fieldWidthYards: nextWidth,
          fieldLengthYards: nextLength,
          lineOfScrimmage: clampedLos,
          size: nextSize,
        };
      });
    },
    [updateActivePlay],
  );

  const handleLineOfScrimmageChange = useCallback(
    (value: number | null) => {
      updateActivePlay((play) => {
        if (value === null) return { ...play, lineOfScrimmage: null };
        const maxLOS = Math.max(0, Math.round(play.fieldLengthYards ?? FIELD_CONSTANTS.DEFAULT_DIVISIONS));
        return { ...play, lineOfScrimmage: clamp(Math.round(value), 0, maxLOS) };
      });
    },
    [updateActivePlay],
  );

  const handleSelectionChange = useCallback((id: string | null) => setSelectionId(id), []);

  const handleAddPlay = useCallback(() => {
    setPlays((current) => {
      const nextPlay = createEmptyPlay(`Play ${current.length + 1}`);
      const next = [...current, nextPlay];
      setActiveId(nextPlay.id);
      setSelectionId(null);
      return next;
    });
  }, []);

  const handleDuplicatePlay = useCallback(() => {
    if (!activeId) return;
    setPlays((current) => {
      const original = current.find((play) => play.id === activeId);
      if (!original) return current;
      const copy: Play = {
        ...original,
        id: generateUid(),
        name: `${original.name} copy`,
        elements: original.elements.map((element) => ({ ...element, id: generateUid() })),
      };
      const next = [...current, copy];
      setActiveId(copy.id);
      setSelectionId(null);
      return next;
    });
  }, [activeId]);

  const handleDeletePlay = useCallback(() => {
    setPlays((current) => {
      if (!activeId || current.length <= 1) return current;
      const filtered = current.filter((play) => play.id !== activeId);
      const nextActive = filtered[filtered.length - 1]?.id ?? filtered[0]?.id ?? null;
      setActiveId(nextActive);
      setSelectionId(null);
      return filtered;
    });
  }, [activeId]);

  const handleClearPlay = useCallback(() => {
    if (typeof window !== "undefined" && !window.confirm("Clear all elements from this play?")) return;
    updateActivePlay((play) => ({ ...play, elements: [] }));
    setSelectionId(null);
  }, [updateActivePlay]);

  const handleDownloadJson = useCallback(() => downloadJson("flag-plays.json", plays), [plays]);

  const handleImportJson = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const payload = JSON.parse(String(event.target?.result));
          const imported = parseImportedPlays(payload);
          if (!imported || !imported.length) return;
          setPlays(imported);
          const nextActive = imported[0]?.id ?? null;
          setActiveId(nextActive);
          setSelectionId(null);
          history.reset({ plays: imported, activeId: nextActive });
        } catch (error) {
          console.error("Failed to import plays", error);
        }
      };
      reader.readAsText(file);
    },
    [history],
  );

  const handleDownloadPng = useCallback(async () => {
    if (!activePlay || !svgRef.current) return;
    await exportSvgToPng(svgRef.current, {
      fileName: `${activePlay.name || "play"}.png`,
      background: "#ffffff",
    });
  }, [activePlay]);

  const handlePrintWrist = useCallback(() => {
    if (typeof window === "undefined") return;
    const sheet = document.querySelector(".wrist-page") as HTMLElement | null;
    if (!sheet) return;
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) return;
    popup.document.write(
      `<!DOCTYPE html><html><head><title>Wrist Coach Sheet</title><style>${printStyles}</style></head><body class="wrist-print-body">${sheet.outerHTML}</body></html>`,
    );
    popup.document.close();
    popup.focus();
    popup.print();
  }, [printStyles]);

  const handleUndo = useCallback(() => {
    const snapshot = history.undo();
    if (!snapshot) return;
    setPlays(snapshot.plays);
    setActiveId(snapshot.activeId ?? snapshot.plays[0]?.id ?? null);
    setSelectionId(null);
  }, [history]);

  const handleRedo = useCallback(() => {
    const snapshot = history.redo();
    if (!snapshot) return;
    setPlays(snapshot.plays);
    setActiveId(snapshot.activeId ?? snapshot.plays[0]?.id ?? null);
    setSelectionId(null);
  }, [history]);

  const handleElementChange = useCallback(
    (nextElement: PlayElement) => {
      updateActivePlay((play) => ({
        ...play,
        elements: play.elements.map((element) => (element.id === nextElement.id ? nextElement : element)),
      }));
    },
    [updateActivePlay],
  );

  const handleWristConfigUpdate = useCallback((partial: Partial<WristConfig>) => {
    setWristConfig((current) => ({ ...current, ...partial }));
  }, []);

  const handlePlaySelectChange = useCallback((value: string) => {
    setActiveId(value);
    setSelectionId(null);
  }, []);

  const handleImportInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const [file] = event.target.files ?? [];
      if (file) {
        handleImportJson(file);
        event.target.value = "";
      }
    },
    [handleImportJson],
  );

  // ------------------------------------------------------------
  // Render ------------------------------------------------------
  // ------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <style>{printStyles}</style>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card className="border border-slate-200/70 bg-white/90 shadow-xl">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Flag Football Play Designer</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
                Map routes, zone drops, and timing adjustments on a responsive SVG field. Plays persist locally and export cleanly for
                wrist cards or paper handouts.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button size="icon" variant="secondary" title="Undo (Ctrl+Z)" onClick={handleUndo} className="rounded-full">
                <Undo2 size={16} />
              </Button>
              <Button size="icon" variant="secondary" title="Redo (Ctrl+Shift+Z)" onClick={handleRedo} className="rounded-full">
                <Redo2 size={16} />
              </Button>
              <Button onClick={handleAddPlay} className="gap-2 rounded-full">
                <Plus size={16} />
                New play
              </Button>
              <Button onClick={handleDuplicatePlay} className="gap-2 rounded-full" variant="secondary">
                <Copy size={16} />
                Duplicate
              </Button>
              <Button onClick={handleDownloadJson} className="gap-2 rounded-full" variant="secondary">
                <Download size={16} />
                Export JSON
              </Button>
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300">
                <Upload size={16} />
                Import
                <input type="file" accept="application/json" className="hidden" onChange={handleImportInput} />
              </label>
              <Button onClick={handleClearPlay} className="gap-2 rounded-full" variant="secondary">
                <Layers size={16} />
                Clear
              </Button>
              <Button onClick={handleDeletePlay} className="gap-2 rounded-full" variant="destructive">
                <Trash2 size={16} />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="design">
          <TabsList className="w-fit rounded-full bg-white px-1 py-1 shadow">
            <TabsTrigger value="design" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Designer
            </TabsTrigger>
            <TabsTrigger value="board" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Print & Wrist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="design" className="mt-4 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <Card className="border border-slate-200 bg-white">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <CardTitle className="text-base">Active play</CardTitle>
                    <Input
                      value={activePlay?.name ?? ""}
                      onChange={(event) => handlePlayNameChange(event.target.value)}
                      placeholder="Play name"
                      className="sm:ml-3 sm:w-64"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select value={activePlay?.id ?? undefined} onValueChange={handlePlaySelectChange}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Choose play" />
                      </SelectTrigger>
                      <SelectContent>
                        {plays.map((play) => (
                          <SelectItem key={play.id} value={play.id}>
                            {play.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="secondary" className="gap-2 rounded-full" onClick={handleDownloadPng}>
                      <Download size={16} />
                      Download PNG
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {activePlay ? (
                    <PlayCanvas
                      play={activePlay}
                      onChange={handleActivePlayChange}
                      selectionId={selectionId}
                      onSelectionChange={handleSelectionChange}
                      tool={tool}
                      strokeColor={strokeColor}
                      fillColor={fillColor}
                      thickness={thickness}
                      playerSize={playerRadius}
                      playersLocked={playersLocked}
                      fieldWidthYards={activePlay.fieldWidthYards}
                      fieldLengthYards={activePlay.fieldLengthYards}
                      onSvgRef={(node) => {
                        svgRef.current = node;
                      }}
                    />
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-4">
              <Toolbar
                tool={tool}
                onToolChange={handleToolChange}
                strokeColor={strokeColor}
                onStrokeColorChange={handleStrokeColorChange}
                fillColor={fillColor}
                onFillColorChange={handleFillColorChange}
                thickness={thickness}
                onThicknessChange={handleThicknessChange}
                palette={palette}
                playersLocked={playersLocked}
                onTogglePlayersLocked={handleTogglePlayersLocked}
              />

              <Card className="border border-slate-200 bg-white">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Field settings</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-5 text-sm text-slate-700">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-600">Field width (yards)</span>
                      <Input
                        type="number"
                        min={10}
                        max={60}
                        value={fieldWidthYards}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          if (Number.isFinite(parsed)) {
                            handleFieldDimensionsChange({ widthYards: parsed });
                          }
                        }}
                        className="w-24"
                      />
                    </div>
                    <Slider
                      value={[fieldWidthYards]}
                      onValueChange={(value) => handleFieldDimensionsChange({ widthYards: value[0] })}
                      min={10}
                      max={60}
                      step={1}
                    />
                    <p className="text-xs text-slate-500">Controls how much horizontal yardage is visible. Wider fields leave more space for route breaks near the sidelines.</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-600">Field length (yards)</span>
                      <Input
                        type="number"
                        min={5}
                        max={60}
                        value={fieldLengthYards}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          if (Number.isFinite(parsed)) {
                            handleFieldDimensionsChange({ lengthYards: parsed });
                          }
                        }}
                        className="w-24"
                      />
                    </div>
                    <Slider
                      value={[fieldLengthYards]}
                      onValueChange={(value) => handleFieldDimensionsChange({ lengthYards: value[0] })}
                      min={5}
                      max={60}
                      step={1}
                    />
                    <p className="text-xs text-slate-500">Adjust the number of vertical yard markers. Shorter fields are handy for red-zone installs.</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-600">Line of scrimmage</span>
                      <Input
                        type="number"
                        min={0}
                        max={Math.max(0, Math.round(fieldLengthYards))}
                        value={activePlay?.lineOfScrimmage ?? ""}
                        placeholder="Auto"
                        onChange={(event) => {
                          const raw = event.target.value;
                          if (raw === "") {
                            handleLineOfScrimmageChange(null);
                            return;
                          }
                          const parsed = Number(raw);
                          if (Number.isFinite(parsed)) {
                            handleLineOfScrimmageChange(parsed);
                          }
                        }}
                        className="w-24"
                      />
                    </div>
                    <p className="text-xs text-slate-500">Leave blank to hide the LOS stripe. Values automatically clamp to the configured field length.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 bg-white">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Selected element</CardTitle>
                </CardHeader>
                <CardContent>
                  <SelectedInspector element={selectedElement} onElementChange={handleElementChange} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="board" className="mt-4">
            <BoardView
              plays={plays}
              printConfig={printConfig}
              wristConfig={wristConfig}
              onUpdateWristConfig={handleWristConfigUpdate}
              onPrintWrist={handlePrintWrist}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
