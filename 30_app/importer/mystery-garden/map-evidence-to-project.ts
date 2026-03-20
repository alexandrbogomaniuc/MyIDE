type EvidenceRef = string;

interface MysteryGardenImportUnknown {
  field: string;
  reason: string;
  status: "unknown" | "assumption";
  evidenceRefs?: EvidenceRef[];
}

interface MysteryGardenProjectImport {
  importId: string;
  modelVersion: string;
  sourceDonorId: string;
  sourceEvidenceRefs: EvidenceRef[];
  project: {
    schemaVersion: string;
    projectId: string;
    name: string;
    slug: string;
    description: string;
    mode: {
      product: "slot-only";
      userScope: "single-user";
      ui: "desktop-web-ui";
    };
    sources: {
      editableRoot: string;
      donorEvidenceRoot: string;
      rawDonorRoots: string[];
      notes: string;
    };
    provenance: {
      primaryDonorId: string;
      assumptions: string[];
      todo: string[];
    };
    assets: Array<{
      assetId: string;
      name: string;
      kind: "image" | "text";
      role: "background" | "symbol" | "ui";
      logicalPath: string;
      provenance: {
        origin: "generated";
        donorId: string;
        evidenceRef: EvidenceRef;
        notes?: string;
      };
    }>;
    scenes: Array<{
      sceneId: string;
      name: string;
      kind: "preview";
      viewport: { width: number; height: number };
      layers: Array<{
        layerId: string;
        name: string;
        role: "background" | "midground" | "ui" | "foreground";
        nodes: Array<{
          nodeId: string;
          name: string;
          type: "shape" | "text" | "container";
          assetRef?: string;
          visible?: boolean;
          position: { x: number; y: number; width?: number; height?: number; anchorX?: number; anchorY?: number };
          extensions?: Record<string, unknown>;
        }>;
      }>;
    }>;
    states: Array<{
      stateId: string;
      name: string;
      kind: "idle" | "spin" | "result" | "bonus" | "paused";
      transitions: Array<{ event: string; targetStateId: string }>;
      extensions?: Record<string, unknown>;
    }>;
    animations: Array<{
      animationId: string;
      name: string;
      scope: "scene" | "ui";
      trigger: { kind: "state-enter" | "event"; stateId?: string; eventName?: string };
      tracks: Array<{
        trackId: string;
        target: string;
        property: string;
        keyframes: Array<{ at: number; value: unknown }>;
      }>;
    }>;
    bindings: Array<{
      bindingId: string;
      name: string;
      kind: "state" | "property" | "visibility" | "event";
      from: { type: string; ref?: string; path?: string };
      to: { type: string; ref?: string; path?: string; value?: unknown };
    }>;
    serverMap: {
      serverMapId: string;
      runtime: { name: string; kind: "mock"; notes: string };
      requestQueue: { mode: "serial"; maxPending: number; retryPolicy: "none" };
      restartRecovery: { strategy: "restore-checkpoint"; reconcileState: boolean; lastActionKey: string };
      stateOwnership: { authoritativeSide: "client"; mirroredFields: string[]; stickyFields: string[] };
      security: { hmacRequired: boolean };
      errorHandling: { retryableCodes: string[]; fatalCodes: string[]; closeOnFatal: boolean };
    };
    messages: {
      modelVersion: string;
      messagePackId: string;
      ids: string[];
      references: Array<{ refId: string; kind: string }>;
      validationNotes: string[];
      messages: Array<{
        messageId: string;
        category: string;
        defaultText: string;
        evidenceRefs?: EvidenceRef[];
        notes?: string;
      }>;
    };
    localization: {
      modelVersion: string;
      localizationId: string;
      ids: string[];
      references: Array<{ refId: string; kind: string }>;
      validationNotes: string[];
      defaultLocale: string;
      locales: Array<{
        locale: string;
        direction: "ltr";
        messageRefs: string[];
        strings: Record<string, string>;
      }>;
    };
    clientConfig: {
      modelVersion: string;
      clientConfigId: string;
      ids: string[];
      references: Array<{ refId: string; kind: string }>;
      validationNotes: string[];
      overlays: Array<{
        overlayId: string;
        target: string;
        settings: Record<string, string | number | boolean | null>;
      }>;
    };
    rngSource: {
      modelVersion: string;
      rngSourceId: string;
      ids: string[];
      references: Array<{ refId: string; kind: string }>;
      validationNotes: string[];
      mode: "mock-sequence";
      seed: string;
      sequence: number[];
      resumeCursor: number;
      mappingNotes: string;
    };
    stateHistory: {
      modelVersion: string;
      stateHistoryId: string;
      ids: string[];
      references: Array<{ refId: string; kind: string }>;
      validationNotes: string[];
      checkpoints: Array<{
        checkpointId: string;
        stateId: string;
        createdFrom: "manual" | "mocked-gameState";
        gameStateRef?: string;
        lastActionRef?: string;
        snapshot: Record<string, unknown>;
      }>;
      resumePolicy: {
        mode: "resume-by-last-action";
        fallbackStateId: string;
        reconcileLastAction: boolean;
      };
    };
  };
  unknowns: MysteryGardenImportUnknown[];
}

const sourceEvidenceRefs: EvidenceRef[] = [
  "MG-EV-20260320-WEB-A-001",
  "MG-EV-20260320-WEB-A-002",
  "MG-EV-20260320-WEB-A-003",
  "MG-EV-20260320-WEB-A-004",
  "MG-EV-20260320-WEB-A-005",
  "MG-EV-20260320-WEB-A-006",
  "MG-EV-20260320-WEB-A-007",
  "MG-EV-20260320-WEB-A-008",
  "MG-EV-20260320-LIVE-A-001",
  "MG-EV-20260320-LIVE-A-002",
  "MG-EV-20260320-LIVE-A-003",
  "MG-EV-20260320-LIVE-A-004",
  "MG-EV-20260320-LIVE-A-005",
  "MG-EV-20260320-LIVE-A-006"
];

const importedProject: MysteryGardenProjectImport = {
  importId: "mystery-garden-import-v1",
  modelVersion: "0.2.0",
  sourceDonorId: "donor_001_mystery_garden",
  sourceEvidenceRefs,
  project: {
    schemaVersion: "0.2.0",
    projectId: "project_001",
    name: "Mystery Garden Replay Slice",
    slug: "mystery-garden-replay-slice",
    description: "Evidence-backed PHASE 3 internal slice for a bounded Mystery Garden local replay.",
    mode: {
      product: "slot-only",
      userScope: "single-user",
      ui: "desktop-web-ui"
    },
    sources: {
      editableRoot: "40_projects/project_001",
      donorEvidenceRoot: "10_donors/donor_001_mystery_garden/evidence",
      rawDonorRoots: ["10_donors/donor_001_mystery_garden/raw"],
      notes: "Preview runtime loads only files inside 40_projects/project_001."
    },
    provenance: {
      primaryDonorId: "donor_001_mystery_garden",
      assumptions: [
        "The visible board uses a 5x3 placeholder layout because live runtime observation confirmed a visible 5x3 board while the API layout field remained non-authoritative for display layout.",
        "PHASE 3 still uses clean placeholder blocks and text tokens rather than donor art at runtime.",
        "Restart recovery is modeled with internal mocked state rather than a production adapter payload."
      ],
      todo: [
        "Capture live spin request and restart recovery evidence.",
        "Capture a live free-spins entry state.",
        "Capture full symbol inventory and paytable.",
        "Confirm motion timing for spin, win, and modal transitions."
      ]
    },
    assets: [
      {
        assetId: "asset.bg.garden-dawn",
        name: "Garden Dawn Placeholder",
        kind: "image",
        role: "background",
        logicalPath: "internal://project_001/placeholders/garden-dawn",
        provenance: {
          origin: "generated",
          donorId: "donor_001_mystery_garden",
          evidenceRef: "MG-EV-20260320-WEB-A-003,MG-EV-20260320-WEB-A-004,MG-EV-20260320-LIVE-A-002",
          notes: "Clean placeholder palette and composition only."
        }
      },
      {
        assetId: "asset.board.book-frame",
        name: "Book Frame Placeholder",
        kind: "image",
        role: "ui",
        logicalPath: "internal://project_001/placeholders/book-frame",
        provenance: {
          origin: "generated",
          donorId: "donor_001_mystery_garden",
          evidenceRef: "MG-EV-20260320-WEB-A-004,MG-EV-20260320-WEB-A-005,MG-EV-20260320-LIVE-A-002"
        }
      },
      {
        assetId: "asset.symbol.scatter-key",
        name: "Scatter Key Token",
        kind: "text",
        role: "symbol",
        logicalPath: "internal://project_001/placeholders/scatter-key",
        provenance: {
          origin: "generated",
          donorId: "donor_001_mystery_garden",
          evidenceRef: "MG-EV-20260320-WEB-A-001,MG-EV-20260320-WEB-A-006"
        }
      },
      {
        assetId: "asset.symbol.wild-book",
        name: "Wild Book Token",
        kind: "text",
        role: "symbol",
        logicalPath: "internal://project_001/placeholders/wild-book",
        provenance: {
          origin: "generated",
          donorId: "donor_001_mystery_garden",
          evidenceRef: "MG-EV-20260320-WEB-A-001,MG-EV-20260320-LIVE-A-003"
        }
      },
      {
        assetId: "asset.ui.left-summary",
        name: "Left Summary Panel",
        kind: "image",
        role: "ui",
        logicalPath: "internal://project_001/placeholders/left-summary",
        provenance: {
          origin: "generated",
          donorId: "donor_001_mystery_garden",
          evidenceRef: "MG-EV-20260320-WEB-A-004,MG-EV-20260320-WEB-A-005,MG-EV-20260320-WEB-A-008,MG-EV-20260320-LIVE-A-002"
        }
      },
      {
        assetId: "asset.modal.free-spins-award",
        name: "Free Spins Award Modal",
        kind: "image",
        role: "ui",
        logicalPath: "internal://project_001/placeholders/free-spins-award",
        provenance: {
          origin: "generated",
          donorId: "donor_001_mystery_garden",
          evidenceRef: "MG-EV-20260320-WEB-A-007"
        }
      },
      {
        assetId: "asset.modal.buy-bonus",
        name: "Buy Bonus Modal Placeholder",
        kind: "image",
        role: "ui",
        logicalPath: "internal://project_001/placeholders/buy-bonus",
        provenance: {
          origin: "generated",
          donorId: "donor_001_mystery_garden",
          evidenceRef: "MG-EV-20260320-WEB-A-008"
        }
      }
    ],
    scenes: [
      {
        sceneId: "scene.main",
        name: "Mystery Garden Main Replay",
        kind: "preview",
        viewport: { width: 1280, height: 720 },
        layers: [
          {
            layerId: "layer.background",
            name: "Background",
            role: "background",
            nodes: [
              {
                nodeId: "node.backdrop",
                name: "Garden Backdrop",
                type: "shape",
                assetRef: "asset.bg.garden-dawn",
                position: { x: 0, y: 0, width: 1280, height: 720 },
                extensions: {
                  shape: "rect",
                  fill: "garden-gradient",
                  evidenceRefs: ["MG-EV-20260320-WEB-A-003", "MG-EV-20260320-WEB-A-004", "MG-EV-20260320-LIVE-A-002"]
                }
              }
            ]
          },
          {
            layerId: "layer.gameplay",
            name: "Gameplay",
            role: "midground",
            nodes: [
              {
                nodeId: "node.title",
                name: "Title Plate",
                type: "text",
                position: { x: 640, y: 68, anchorX: 0.5, anchorY: 0.5 },
                extensions: { text: "MYSTERY GARDEN", style: "title", evidenceRefs: ["MG-EV-20260320-WEB-A-004", "MG-EV-20260320-LIVE-A-001", "MG-EV-20260320-LIVE-A-002"] }
              },
              {
                nodeId: "node.left-panel",
                name: "Left Summary Panel",
                type: "shape",
                assetRef: "asset.ui.left-summary",
                position: { x: 88, y: 160, width: 216, height: 348 },
                extensions: {
                  shape: "rect",
                  fill: "panel-green",
                  evidenceRefs: ["MG-EV-20260320-WEB-A-004", "MG-EV-20260320-WEB-A-005", "MG-EV-20260320-WEB-A-008", "MG-EV-20260320-LIVE-A-002"]
                }
              },
              {
                nodeId: "node.reel-board",
                name: "Reel Board",
                type: "shape",
                assetRef: "asset.board.book-frame",
                position: { x: 328, y: 136, width: 728, height: 432 },
                extensions: {
                  shape: "rect",
                  fill: "board-green",
                  grid: { columns: 5, rows: 3 },
                  evidenceRefs: ["MG-EV-20260320-WEB-A-004", "MG-EV-20260320-WEB-A-005", "MG-EV-20260320-WEB-A-006", "MG-EV-20260320-LIVE-A-002"]
                }
              }
            ]
          }
        ]
      }
    ],
    states: [
      {
        stateId: "state.idle",
        name: "Idle",
        kind: "idle",
        transitions: [{ event: "spin.requested", targetStateId: "state.spin" }],
        extensions: { evidenceRefs: ["MG-EV-20260320-WEB-A-004", "MG-EV-20260320-LIVE-A-002"], classification: "proven" }
      },
      {
        stateId: "state.spin",
        name: "Spin",
        kind: "spin",
        transitions: [
          { event: "spin.resolved.baseWin", targetStateId: "state.base-win" },
          { event: "spin.resolved.freeSpinsTrigger", targetStateId: "state.free-spins-trigger" }
        ],
        extensions: { evidenceRefs: ["MG-EV-20260320-LIVE-A-002", "MG-EV-20260320-LIVE-A-003", "MG-EV-20260320-LIVE-A-006"], classification: "proven-existence" }
      },
      {
        stateId: "state.base-win",
        name: "Base Win",
        kind: "result",
        transitions: [{ event: "continue", targetStateId: "state.idle" }],
        extensions: { evidenceRefs: ["MG-EV-20260320-WEB-A-006"], classification: "proven" }
      },
      {
        stateId: "state.free-spins-trigger",
        name: "Free Spins Trigger",
        kind: "bonus",
        transitions: [{ event: "bonus.start", targetStateId: "state.free-spins-active" }],
        extensions: { evidenceRefs: ["MG-EV-20260320-WEB-A-007"], classification: "proven" }
      },
      {
        stateId: "state.free-spins-active",
        name: "Free Spins Active",
        kind: "bonus",
        transitions: [{ event: "bonus.complete", targetStateId: "state.idle" }],
        extensions: { evidenceRefs: ["MG-EV-20260320-WEB-A-001", "MG-EV-20260320-WEB-A-005"], classification: "proven" }
      },
      {
        stateId: "state.restore.free-spins-active",
        name: "Restore Free Spins Active",
        kind: "paused",
        transitions: [{ event: "restart.restore", targetStateId: "state.free-spins-active" }],
        extensions: { classification: "internal-assumption", notes: "Replay-only recovery staging state." }
      }
    ],
    animations: [
      {
        animationId: "anim.reels.spin",
        name: "Reel Spin Pulse",
        scope: "scene",
        trigger: { kind: "state-enter", stateId: "state.spin" },
        tracks: [
          {
            trackId: "track.reel-board.opacity",
            target: "node.reel-board",
            property: "opacity",
            keyframes: [{ at: 0, value: 0.84 }, { at: 0.5, value: 1 }]
          }
        ]
      },
      {
        animationId: "anim.win-banner.flash",
        name: "Win Banner Flash",
        scope: "ui",
        trigger: { kind: "state-enter", stateId: "state.base-win" },
        tracks: [
          {
            trackId: "track.win-banner.opacity",
            target: "node.win-banner",
            property: "opacity",
            keyframes: [{ at: 0, value: 0 }, { at: 0.2, value: 1 }]
          }
        ]
      },
      {
        animationId: "anim.free-spins-modal.pop",
        name: "Free Spins Modal Pop",
        scope: "ui",
        trigger: { kind: "state-enter", stateId: "state.free-spins-trigger" },
        tracks: [
          {
            trackId: "track.free-spins-modal.scale",
            target: "node.free-spins-modal",
            property: "scale",
            keyframes: [{ at: 0, value: 0.92 }, { at: 0.3, value: 1 }]
          }
        ]
      },
      {
        animationId: "anim.restore-chip.fade",
        name: "Restore Chip Fade",
        scope: "ui",
        trigger: { kind: "event", eventName: "restart.restore" },
        tracks: [
          {
            trackId: "track.restore-chip.opacity",
            target: "node.restore-chip",
            property: "opacity",
            keyframes: [{ at: 0, value: 0 }, { at: 0.2, value: 1 }]
          }
        ]
      }
    ],
    bindings: [
      {
        bindingId: "binding.status-message",
        name: "Active State To Status Banner",
        kind: "state",
        from: { type: "state", ref: "activeStateId" },
        to: { type: "scene-node", ref: "node.win-banner", path: "text" }
      },
      {
        bindingId: "binding.free-spins-counter",
        name: "Free Spins Remaining Counter",
        kind: "property",
        from: { type: "property", ref: "gameState", path: "freeSpins.remaining" },
        to: { type: "scene-node", ref: "node.free-spins-pill", path: "text" }
      },
      {
        bindingId: "binding.modal-visibility",
        name: "Free Spins Modal Visibility",
        kind: "visibility",
        from: { type: "state", ref: "state.free-spins-trigger" },
        to: { type: "scene-node", ref: "node.free-spins-modal", path: "visible" }
      },
      {
        bindingId: "binding.restore-chip",
        name: "Restart Restore Badge",
        kind: "event",
        from: { type: "event", ref: "restart.restore" },
        to: { type: "scene-node", ref: "node.restore-chip", path: "visible", value: true }
      }
    ],
    serverMap: {
      serverMapId: "server-map.project_001",
      runtime: { name: "local-phase-2-replay", kind: "mock", notes: "Local replay only. No production integration." },
      requestQueue: { mode: "serial", maxPending: 1, retryPolicy: "none" },
      restartRecovery: { strategy: "restore-checkpoint", reconcileState: true, lastActionKey: "lastAction" },
      stateOwnership: {
        authoritativeSide: "client",
        mirroredFields: ["gameState.balance", "gameState.freeSpins.remaining"],
        stickyFields: ["gameState.freeSpins.stickyFrames"]
      },
      security: { hmacRequired: false },
      errorHandling: { retryableCodes: [], fatalCodes: ["LOCAL_DATA_MISSING"], closeOnFatal: false }
    },
    messages: {
      modelVersion: "0.2.0",
      messagePackId: "messages.project_001",
      ids: ["msg.idle.ready", "msg.spin.running", "msg.win.banner", "msg.fs.trigger", "msg.restore.ready"],
      references: [
        { refId: "MG-EV-20260320-WEB-A-004", kind: "evidence" },
        { refId: "MG-EV-20260320-LIVE-A-002", kind: "evidence" },
        { refId: "MG-EV-20260320-WEB-A-007", kind: "evidence" }
      ],
      validationNotes: [
        "Messages are replay-shell guidance only in PHASE 3.",
        "Donor text is not copied beyond short observed labels already visible in evidence."
      ],
      messages: [
        { messageId: "msg.idle.ready", category: "status", defaultText: "Ready to replay the bounded Mystery Garden slice.", evidenceRefs: ["MG-EV-20260320-LIVE-A-002"] },
        { messageId: "msg.spin.running", category: "status", defaultText: "Running deterministic internal spin replay.", evidenceRefs: ["MG-EV-20260320-LIVE-A-006"] },
        { messageId: "msg.win.banner", category: "overlay", defaultText: "3.00 EUR", evidenceRefs: ["MG-EV-20260320-WEB-A-006"] },
        { messageId: "msg.fs.trigger", category: "overlay", defaultText: "YOU HAVE WON 10 FREE SPINS", evidenceRefs: ["MG-EV-20260320-WEB-A-007"] },
        { messageId: "msg.restore.ready", category: "debug", defaultText: "Recovered from mocked gameState", notes: "Internal recovery message only." }
      ]
    },
    localization: {
      modelVersion: "0.2.0",
      localizationId: "localization.project_001",
      ids: ["en-GB"],
      references: [{ refId: "messages.project_001", kind: "project" }],
      validationNotes: ["One locale only for PHASE 3.", "Observed donor labels remain concise."],
      defaultLocale: "en-GB",
      locales: [
        {
          locale: "en-GB",
          direction: "ltr",
          messageRefs: ["msg.idle.ready", "msg.spin.running", "msg.win.banner", "msg.fs.trigger", "msg.restore.ready"],
          strings: {
            "msg.idle.ready": "Ready to replay the bounded Mystery Garden slice.",
            "msg.spin.running": "Running deterministic internal spin replay.",
            "msg.win.banner": "3.00 EUR",
            "msg.fs.trigger": "YOU HAVE WON 10 FREE SPINS",
            "msg.restore.ready": "Recovered from mocked gameState"
          }
        }
      ]
    },
    clientConfig: {
      modelVersion: "0.2.0",
      clientConfigId: "client-config.project_001",
      ids: ["overlay.preview.default"],
      references: [{ refId: "scene.main", kind: "project" }],
      validationNotes: ["Client config is preview-only and intentionally local."],
      overlays: [
        {
          overlayId: "overlay.preview.default",
          target: "preview-shell",
          settings: {
            autoAdvanceMs: 650,
            showEvidenceRefs: true,
            useProjectOnlyRuntimeData: true
          }
        }
      ]
    },
    rngSource: {
      modelVersion: "0.2.0",
      rngSourceId: "rng.project_001",
      ids: ["rng.sequence.phase2"],
      references: [{ refId: "fixture.normal-spin", kind: "runtime" }, { refId: "fixture.free-spins-trigger", kind: "runtime" }],
      validationNotes: ["No donor math or production RNG is imported in PHASE 3.", "Replay stays deterministic for verification."],
      mode: "mock-sequence",
      seed: "mystery-garden-phase-2-seed",
      sequence: [0.14, 0.31, 0.77, 0.42],
      resumeCursor: 0,
      mappingNotes: "Sequence only gates deterministic fixture playback."
    },
    stateHistory: {
      modelVersion: "0.2.0",
      stateHistoryId: "state-history.project_001",
      ids: ["checkpoint.idle", "checkpoint.free-spins-active"],
      references: [{ refId: "MG-EV-20260320-WEB-A-005", kind: "evidence" }, { refId: "MG-EV-20260320-WEB-A-007", kind: "evidence" }],
      validationNotes: ["Restart recovery is internal-only in PHASE 3.", "Checkpoint data is mocked from donor-backed visible states rather than production contracts."],
      checkpoints: [
        {
          checkpointId: "checkpoint.idle",
          stateId: "state.idle",
          createdFrom: "manual",
          snapshot: { balance: 1200, bet: 1 }
        },
        {
          checkpointId: "checkpoint.free-spins-active",
          stateId: "state.free-spins-active",
          createdFrom: "mocked-gameState",
          gameStateRef: "40_projects/project_001/runtime/mock-game-state.json",
          lastActionRef: "40_projects/project_001/runtime/mock-last-action.json",
          snapshot: { remaining: 9, awarded: 10, stickyFrames: ["r1c1", "r3c2", "r4c1"] }
        }
      ],
      resumePolicy: {
        mode: "resume-by-last-action",
        fallbackStateId: "state.idle",
        reconcileLastAction: true
      }
    }
  },
  unknowns: [
    {
      field: "state.spin timing",
      reason: "No live runtime timing capture exists yet.",
      status: "unknown",
      evidenceRefs: ["MG-EV-20260320-WEB-A-001"]
    },
    {
      field: "paytable and exact symbol inventory",
      reason: "Not proven by the current public evidence pack.",
      status: "unknown",
      evidenceRefs: ["MG-EV-20260320-WEB-A-001", "MG-EV-20260320-WEB-A-002"]
    },
    {
      field: "free-spins transition duration",
      reason: "Visible trigger and active states exist, but timing is uncaptured.",
      status: "unknown",
      evidenceRefs: ["MG-EV-20260320-WEB-A-005", "MG-EV-20260320-WEB-A-007"]
    }
  ]
};

export function buildMysteryGardenImport(): MysteryGardenProjectImport {
  return importedProject;
}

export function getMysteryGardenImportUnknowns(): MysteryGardenImportUnknown[] {
  return importedProject.unknowns;
}

export function listMysteryGardenEvidenceRefs(): EvidenceRef[] {
  return [...sourceEvidenceRefs];
}
