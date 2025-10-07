import { useCallback, useRef } from "react";
import type { DesignerSnapshot } from "@/features/play-designer/types";

export interface UseHistoryOptions {
  readonly capacity?: number;
}

export interface UseHistoryResult {
  readonly register: (snapshot: DesignerSnapshot) => void;
  readonly undo: () => DesignerSnapshot | null;
  readonly redo: () => DesignerSnapshot | null;
  readonly reset: (snapshot: DesignerSnapshot) => void;
}

/**
 * Centralised undo/redo manager. The hook stores full snapshots of the designer state so we can travel backwards cleanly.
 */
export function useHistory(
  initialSnapshot: DesignerSnapshot,
  options: UseHistoryOptions = {},
): UseHistoryResult {
  const capacity = Math.max(1, options.capacity ?? 50);
  const undoStackRef = useRef<DesignerSnapshot[]>([]);
  const redoStackRef = useRef<DesignerSnapshot[]>([]);
  const previousRef = useRef<DesignerSnapshot>(initialSnapshot);
  const skipNextRef = useRef<boolean>(true);

  const reset = useCallback((snapshot: DesignerSnapshot) => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    previousRef.current = snapshot;
    skipNextRef.current = true;
  }, []);

  const register = useCallback((snapshot: DesignerSnapshot) => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      previousRef.current = snapshot;
      return;
    }

    undoStackRef.current = [...undoStackRef.current, previousRef.current];
    if (undoStackRef.current.length > capacity) {
      undoStackRef.current = undoStackRef.current.slice(-capacity);
    }
    redoStackRef.current = [];
    previousRef.current = snapshot;
  }, [capacity]);

  const undo = useCallback((): DesignerSnapshot | null => {
    if (undoStackRef.current.length === 0) return null;
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, previousRef.current];
    skipNextRef.current = true;
    previousRef.current = prev;
    return prev;
  }, []);

  const redo = useCallback((): DesignerSnapshot | null => {
    if (redoStackRef.current.length === 0) return null;
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, previousRef.current];
    skipNextRef.current = true;
    previousRef.current = next;
    return next;
  }, []);

  return { register, undo, redo, reset };
}
