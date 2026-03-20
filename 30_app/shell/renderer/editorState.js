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

  function createHistory(editorData, limit = 50) {
    return {
      limit: Math.max(1, Math.floor(limit ?? 48)),
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

  function createUniqueObjectId(objects, baseId) {
    const existingIds = new Set((Array.isArray(objects) ? objects : []).map((entry) => entry.id));
    const normalizedBaseId = String(baseId ?? "object").trim() || "object";

    if (!existingIds.has(normalizedBaseId)) {
      return normalizedBaseId;
    }

    let suffix = 2;
    let candidate = `${normalizedBaseId}-copy`;

    while (existingIds.has(candidate)) {
      candidate = `${normalizedBaseId}-copy-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  function duplicateObject(editorData, selectedObjectId) {
    if (!editorData || !Array.isArray(editorData.objects)) {
      return null;
    }

    const source = editorData.objects.find((entry) => entry.id === selectedObjectId);
    if (!source) {
      return null;
    }

    const duplicate = clone(source);
    duplicate.id = createUniqueObjectId(editorData.objects, source.id);
    duplicate.displayName = source.displayName ? `${source.displayName} Copy` : duplicate.id;
    duplicate.x = Number.isFinite(source.x) ? source.x + 24 : 24;
    duplicate.y = Number.isFinite(source.y) ? source.y + 24 : 24;
    duplicate.locked = false;
    editorData.objects.push(duplicate);

    return {
      objectId: duplicate.id,
      label: duplicate.displayName
    };
  }

  function deleteObject(editorData, selectedObjectId) {
    if (!editorData || !Array.isArray(editorData.objects)) {
      return null;
    }

    const index = editorData.objects.findIndex((entry) => entry.id === selectedObjectId);
    if (index < 0) {
      return null;
    }

    const [removed] = editorData.objects.splice(index, 1);
    const nextSelectedObjectId = editorData.objects[index]?.id
      ?? editorData.objects[index - 1]?.id
      ?? null;

    return {
      objectId: removed.id,
      label: removed.displayName,
      nextSelectedObjectId
    };
  }

  function resolveSelectedObjectId(objects, preferredObjectId, fallbackObjectId = null) {
    const objectList = Array.isArray(objects) ? objects : [];

    const preferred = objectList.find((entry) => entry.id === preferredObjectId);
    if (preferred) {
      return preferred.id;
    }

    const fallback = objectList.find((entry) => entry.id === fallbackObjectId);
    if (fallback) {
      return fallback.id;
    }

    const editable = objectList.find((entry) => !entry.locked);
    if (editable) {
      return editable.id;
    }

    return objectList[0]?.id ?? null;
  }

  return {
    clone,
    fingerprint,
    createHistory,
    isDirty,
    markSaved,
    pushUndoSnapshot,
    undo,
    redo,
    createUniqueObjectId,
    duplicateObject,
    deleteObject,
    resolveSelectedObjectId
  };
});
