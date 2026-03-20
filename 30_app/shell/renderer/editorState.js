(function attachMyIDEEditorState(globalScope, factory) {
  const api = factory();
  globalScope.MyIDEEditorState = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createMyIDEEditorState() {
  function clone(value) {
    return value ? JSON.parse(JSON.stringify(value)) : value;
  }

  function fingerprint(editorData) {
    if (!editorData) {
      return "null";
    }

    return JSON.stringify({
      scene: editorData.scene,
      layers: editorData.layers,
      objects: editorData.objects
    });
  }

  function createHistory(editorData, limit = 48) {
    return {
      limit,
      savedFingerprint: fingerprint(editorData),
      undoStack: [],
      redoStack: []
    };
  }

  function isDirty(history, editorData) {
    if (!history) {
      return false;
    }

    return fingerprint(editorData) !== history.savedFingerprint;
  }

  function markSaved(history, editorData) {
    return {
      ...(history ?? createHistory(editorData)),
      savedFingerprint: fingerprint(editorData)
    };
  }

  function pushUndoSnapshot(history, snapshot, label) {
    const base = history ?? createHistory(snapshot);
    const nextUndoStack = [
      ...base.undoStack,
      {
        label: label ?? "Edit",
        snapshot: clone(snapshot)
      }
    ];

    while (nextUndoStack.length > base.limit) {
      nextUndoStack.shift();
    }

    return {
      ...base,
      undoStack: nextUndoStack,
      redoStack: []
    };
  }

  function undo(history, currentEditorData) {
    if (!history || history.undoStack.length === 0) {
      return null;
    }

    const previous = history.undoStack[history.undoStack.length - 1];
    return {
      history: {
        ...history,
        undoStack: history.undoStack.slice(0, -1),
        redoStack: [
          ...history.redoStack,
          {
            label: previous.label,
            snapshot: clone(currentEditorData)
          }
        ]
      },
      editorData: clone(previous.snapshot),
      label: previous.label
    };
  }

  function redo(history, currentEditorData) {
    if (!history || history.redoStack.length === 0) {
      return null;
    }

    const next = history.redoStack[history.redoStack.length - 1];
    return {
      history: {
        ...history,
        redoStack: history.redoStack.slice(0, -1),
        undoStack: [
          ...history.undoStack,
          {
            label: next.label,
            snapshot: clone(currentEditorData)
          }
        ]
      },
      editorData: clone(next.snapshot),
      label: next.label
    };
  }

  return {
    clone,
    fingerprint,
    createHistory,
    isDirty,
    markSaved,
    pushUndoSnapshot,
    undo,
    redo
  };
});
