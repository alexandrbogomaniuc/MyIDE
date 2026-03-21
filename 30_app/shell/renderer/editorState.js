(function attachMyIDEEditorState(globalScope, factory) {
  const api = factory();
  globalScope.MyIDEEditorState = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createMyIDEEditorState() {
  const DEFAULT_SNAP_SIZE = 10;
  const MIN_OBJECT_SIZE = 8;
  const MAX_OBJECT_SIZE = 4096;
  const PLACEHOLDER_PRESETS = [
    {
      key: "generic-box",
      label: "Generic Box",
      type: "shape",
      width: 220,
      height: 140,
      placeholderRef: "placeholder.shape.generic-box",
      notes: "Generic bounded placeholder for layout blocking and rough composition."
    },
    {
      key: "banner",
      label: "Banner",
      type: "text",
      width: 360,
      height: 72,
      placeholderRef: "placeholder.text.banner",
      notes: "Wide banner placeholder for headline or win callout regions."
    },
    {
      key: "panel",
      label: "Panel",
      type: "shape",
      width: 320,
      height: 220,
      placeholderRef: "placeholder.shape.panel",
      notes: "Panel placeholder for sidebars, info blocks, and grouped UI."
    },
    {
      key: "modal",
      label: "Modal",
      type: "container",
      width: 440,
      height: 252,
      placeholderRef: "placeholder.container.modal",
      notes: "Centered modal placeholder for feature prompts or overlays."
    },
    {
      key: "badge-pill",
      label: "Badge / Pill",
      type: "text",
      width: 180,
      height: 48,
      placeholderRef: "placeholder.text.badge-pill",
      notes: "Compact pill placeholder for counters, chips, and badges."
    }
  ];

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

  function createNumberedObjectId(objects, prefix = "node.placeholder") {
    const existingIds = new Set((Array.isArray(objects) ? objects : []).map((entry) => entry.id));
    let index = 1;

    while (true) {
      const candidate = `${prefix}-${String(index).padStart(2, "0")}`;
      if (!existingIds.has(candidate)) {
        return candidate;
      }
      index += 1;
    }
  }

  function getPlaceholderPresets() {
    return PLACEHOLDER_PRESETS.map((preset) => ({
      key: preset.key,
      label: preset.label,
      description: preset.notes,
      type: preset.type
    }));
  }

  function getPlaceholderPreset(presetKey) {
    const normalizedKey = String(presetKey ?? "").trim();
    return PLACEHOLDER_PRESETS.find((preset) => preset.key === normalizedKey) ?? PLACEHOLDER_PRESETS[0];
  }

  function sortLayers(layers) {
    return [...(Array.isArray(layers) ? layers : [])].sort((left, right) => {
      const orderDiff = (left?.order ?? 0) - (right?.order ?? 0);
      if (orderDiff !== 0) {
        return orderDiff;
      }

      return String(left?.displayName ?? "").localeCompare(String(right?.displayName ?? ""));
    });
  }

  function getEditableLayers(layers) {
    return sortLayers(layers).filter((entry) => !entry?.locked);
  }

  function snapValue(value, step = DEFAULT_SNAP_SIZE) {
    const normalizedStep = Number.isFinite(step) && step > 0 ? Math.round(step) : DEFAULT_SNAP_SIZE;
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.round(value / normalizedStep) * normalizedStep;
  }

  function snapPoint(point, step = DEFAULT_SNAP_SIZE) {
    return {
      x: snapValue(point?.x ?? 0, step),
      y: snapValue(point?.y ?? 0, step)
    };
  }

  function isObjectSizeEditable(object) {
    return Boolean(object && typeof object.placeholderRef === "string" && object.placeholderRef.length > 0);
  }

  function sanitizeObjectDimension(value, fallback = MIN_OBJECT_SIZE) {
    const normalizedFallback = Number.isFinite(fallback) ? Math.round(fallback) : MIN_OBJECT_SIZE;
    if (!Number.isFinite(value)) {
      return Math.min(MAX_OBJECT_SIZE, Math.max(MIN_OBJECT_SIZE, normalizedFallback));
    }

    return Math.min(MAX_OBJECT_SIZE, Math.max(MIN_OBJECT_SIZE, Math.round(value)));
  }

  function resolveCreationLayer(layers, selectedLayerId) {
    const sortedLayers = sortLayers(layers);
    const preferredSelectedLayer = sortedLayers.find((entry) => entry.id === selectedLayerId && !entry.locked);
    if (preferredSelectedLayer) {
      return preferredSelectedLayer;
    }

    const firstVisibleEditableLayer = sortedLayers.find((entry) => entry.visible !== false && !entry.locked);
    if (firstVisibleEditableLayer) {
      return firstVisibleEditableLayer;
    }

    return sortedLayers.find((entry) => !entry.locked) ?? null;
  }

  function createPlaceholderObject(editorData, options = {}) {
    if (!editorData || !Array.isArray(editorData.objects)) {
      return null;
    }

    const layer = resolveCreationLayer(editorData.layers, options.selectedLayerId);
    if (!layer) {
      return null;
    }

    const preset = getPlaceholderPreset(options.presetKey);
    const objectId = createNumberedObjectId(editorData.objects, `node.placeholder.${preset.key}`);
    const ordinal = Number.parseInt(objectId.split("-").pop() ?? "1", 10) || 1;
    const width = sanitizeObjectDimension(preset.width);
    const height = sanitizeObjectDimension(preset.height);
    const viewportWidth = Number.isFinite(options.viewport?.width) ? options.viewport.width : 1280;
    const viewportHeight = Number.isFinite(options.viewport?.height) ? options.viewport.height : 720;
    const offset = ((ordinal - 1) % 6) * 26;
    const maxX = Math.max(0, viewportWidth - width);
    const maxY = Math.max(0, viewportHeight - height);
    const x = Math.min(maxX, Math.max(0, Math.round(viewportWidth * 0.5 - width * 0.5 + offset)));
    const y = Math.min(maxY, Math.max(0, Math.round(viewportHeight * 0.32 - height * 0.5 + offset)));
    const displayName = `${preset.label} ${String(ordinal).padStart(2, "0")}`;

    return {
      id: objectId,
      displayName,
      type: preset.type,
      layerId: layer.id,
      x,
      y,
      width,
      height,
      scaleX: 1,
      scaleY: 1,
      visible: true,
      locked: false,
      placeholderRef: preset.placeholderRef,
      notes: preset.notes
    };
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

  function reassignObjectLayer(editorData, selectedObjectId, targetLayerId) {
    if (!editorData || !Array.isArray(editorData.objects)) {
      return null;
    }

    const targetLayer = getEditableLayers(editorData.layers).find((entry) => entry.id === targetLayerId);
    if (!targetLayer) {
      return null;
    }

    const selectedObject = editorData.objects.find((entry) => entry.id === selectedObjectId);
    if (!selectedObject || selectedObject.locked) {
      return null;
    }

    const previousLayerId = selectedObject.layerId;
    if (previousLayerId === targetLayer.id) {
      return {
        objectId: selectedObject.id,
        previousLayerId,
        targetLayerId: targetLayer.id,
        targetLayerName: targetLayer.displayName,
        changed: false
      };
    }

    selectedObject.layerId = targetLayer.id;
    return {
      objectId: selectedObject.id,
      previousLayerId,
      targetLayerId: targetLayer.id,
      targetLayerName: targetLayer.displayName,
      changed: true
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
    DEFAULT_SNAP_SIZE,
    MIN_OBJECT_SIZE,
    MAX_OBJECT_SIZE,
    snapValue,
    snapPoint,
    isObjectSizeEditable,
    sanitizeObjectDimension,
    createUniqueObjectId,
    createNumberedObjectId,
    getEditableLayers,
    getPlaceholderPresets,
    createPlaceholderObject,
    duplicateObject,
    deleteObject,
    reassignObjectLayer,
    resolveSelectedObjectId
  };
});
