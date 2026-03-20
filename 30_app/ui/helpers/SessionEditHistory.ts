export interface SessionEditHistorySummary {
  readonly dirty: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undoDepth: number;
  readonly redoDepth: number;
  readonly maxEntries: number;
}

export interface SessionEditHistoryOptions<TState> {
  readonly maxEntries?: number;
  readonly clone?: (state: TState) => TState;
  readonly equals?: (left: TState, right: TState) => boolean;
}

export interface SessionEditHistory<TState> {
  readonly current: TState;
  readonly baseline: TState;
  readonly summary: SessionEditHistorySummary;
  record(nextState: TState): TState;
  undo(): TState;
  redo(): TState;
  commit(nextState?: TState): TState;
  reset(nextState: TState): TState;
}

function defaultClone<TState>(state: TState): TState {
  return JSON.parse(JSON.stringify(state)) as TState;
}

function defaultEquals<TState>(left: TState, right: TState): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function clampMaxEntries(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 50;
  }

  return Math.max(1, Math.floor(value));
}

function createSummary<TState>(
  current: TState,
  baseline: TState,
  undoDepth: number,
  redoDepth: number,
  maxEntries: number,
  equals: (left: TState, right: TState) => boolean
): SessionEditHistorySummary {
  return {
    dirty: !equals(current, baseline),
    canUndo: undoDepth > 0,
    canRedo: redoDepth > 0,
    undoDepth,
    redoDepth,
    maxEntries
  };
}

export function createSessionEditHistory<TState>(
  initialState: TState,
  options: SessionEditHistoryOptions<TState> = {}
): SessionEditHistory<TState> {
  const clone = options.clone ?? defaultClone;
  const equals = options.equals ?? defaultEquals;
  const maxEntries = clampMaxEntries(options.maxEntries);
  let baseline = clone(initialState);
  let current = clone(initialState);
  const undoStack: TState[] = [];
  const redoStack: TState[] = [];

  function trimStack(stack: TState[]): void {
    while (stack.length > maxEntries) {
      stack.shift();
    }
  }

  function replaceCurrent(nextState: TState): TState {
    current = clone(nextState);
    return current;
  }

  function pushUndoSnapshot(snapshot: TState): void {
    undoStack.push(clone(snapshot));
    trimStack(undoStack);
  }

  function pushRedoSnapshot(snapshot: TState): void {
    redoStack.push(clone(snapshot));
    trimStack(redoStack);
  }

  return {
    get current() {
      return current;
    },

    get baseline() {
      return baseline;
    },

    get summary() {
      return createSummary(current, baseline, undoStack.length, redoStack.length, maxEntries, equals);
    },

    record(nextState: TState): TState {
      if (equals(nextState, current)) {
        return current;
      }

      pushUndoSnapshot(current);
      redoStack.length = 0;
      return replaceCurrent(nextState);
    },

    undo(): TState {
      if (undoStack.length === 0) {
        return current;
      }

      pushRedoSnapshot(current);
      const previous = undoStack.pop();
      if (!previous) {
        return current;
      }

      return replaceCurrent(previous);
    },

    redo(): TState {
      if (redoStack.length === 0) {
        return current;
      }

      pushUndoSnapshot(current);
      const next = redoStack.pop();
      if (!next) {
        return current;
      }

      return replaceCurrent(next);
    },

    commit(nextState?: TState): TState {
      if (typeof nextState !== "undefined") {
        replaceCurrent(nextState);
      }

      baseline = clone(current);
      return current;
    },

    reset(nextState: TState): TState {
      baseline = clone(nextState);
      current = clone(nextState);
      undoStack.length = 0;
      redoStack.length = 0;
      return current;
    }
  };
}
