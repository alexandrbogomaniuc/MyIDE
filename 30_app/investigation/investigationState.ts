import {
  canonicalScenarioFamilies,
  type InvestigationLane,
  type ScenarioCoverageState
} from "./scenarioCoverage";

export type LifecycleBackboneStageId =
  | "investigation"
  | "modificationComposeRuntime"
  | "mathConfig"
  | "gsExport";

export type ModificationReadiness =
  | "investigation-only"
  | "partially-ready"
  | "ready-for-reconstruction";

export interface InvestigationScenarioCoverageRow {
  scenarioId: string;
  displayName: string;
  state: ScenarioCoverageState;
  lane: InvestigationLane;
  matchedFamilyNames: string[];
  blockerClasses: string[];
  nextProfile: string | null;
  nextOperatorAction: string;
}

export interface InvestigationStageHandoff {
  modificationReadiness: ModificationReadiness;
  recommendedStage: LifecycleBackboneStageId;
  readyScenarioCount: number;
  blockedScenarioCount: number;
  readyScenarioIds: string[];
  blockedScenarioIds: string[];
  rationale: string;
}

export interface InvestigationAgentLoopSummary {
  whatFound: string[];
  stillMissing: string[];
  nextProfileToRun: string | null;
  nextOperatorAction: string;
  manualAssistNeeded: boolean;
}

export interface InvestigationStatusFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  currentStage: LifecycleBackboneStageId;
  lifecycleLane: "ready-for-reconstruction" | "blocked-on-source-material" | "mixed";
  staticScanState: string;
  runtimeScanState: string;
  scenarioCatalogPath: string;
  scenarioCoveragePath: string;
  scenarioCaptureLogPath: string;
  nextScenarioTargetsPath: string;
  scenarioBlockerSummaryPath: string;
  eventStreamPath: string;
  scenarioCount: number;
  readyForReconstructionCount: number;
  blockedScenarioCount: number;
  countsByState: Record<ScenarioCoverageState, number>;
  readyScenarioIds: string[];
  blockedScenarioIds: string[];
  blockedScenarioNames: string[];
  nextCaptureProfile: string | null;
  nextOperatorAction: string;
  nextManualAction: string | null;
  stageHandoff: InvestigationStageHandoff;
  agentLoop: InvestigationAgentLoopSummary;
}

export function deriveLifecycleLane(
  scenarios: readonly InvestigationScenarioCoverageRow[]
): InvestigationStatusFile["lifecycleLane"] {
  const readyCount = scenarios.filter((scenario) => scenario.lane === "ready-for-reconstruction").length;
  const blockedCount = scenarios.filter((scenario) => scenario.lane === "still-blocked-on-source-material").length;

  if (readyCount > 0 && blockedCount > 0) {
    return "mixed";
  }
  if (readyCount > 0) {
    return "ready-for-reconstruction";
  }
  return "blocked-on-source-material";
}

export function deriveStageHandoff(
  scenarios: readonly InvestigationScenarioCoverageRow[]
): InvestigationStageHandoff {
  const readyScenarios = scenarios
    .filter((scenario) => scenario.lane === "ready-for-reconstruction")
    .map((scenario) => scenario.scenarioId);
  const blockedScenarios = scenarios
    .filter((scenario) => scenario.lane === "still-blocked-on-source-material")
    .map((scenario) => scenario.scenarioId);

  if (readyScenarios.length === 0) {
    return {
      modificationReadiness: "investigation-only",
      recommendedStage: "investigation",
      readyScenarioCount: 0,
      blockedScenarioCount: blockedScenarios.length,
      readyScenarioIds: [],
      blockedScenarioIds: blockedScenarios,
      rationale: "No scenario family is source-material-sufficient yet, so the project should stay in Investigation."
    };
  }

  if (blockedScenarios.length === 0) {
    return {
      modificationReadiness: "ready-for-reconstruction",
      recommendedStage: "modificationComposeRuntime",
      readyScenarioCount: readyScenarios.length,
      blockedScenarioCount: 0,
      readyScenarioIds: readyScenarios,
      blockedScenarioIds: [],
      rationale: "The current scenario catalog is covered well enough to enter Modification / Compose / Runtime."
    };
  }

  return {
    modificationReadiness: "partially-ready",
    recommendedStage: "investigation",
    readyScenarioCount: readyScenarios.length,
    blockedScenarioCount: blockedScenarios.length,
    readyScenarioIds: readyScenarios,
    blockedScenarioIds: blockedScenarios,
    rationale: "Some scenario families are ready for reconstruction, but Investigation still has honest blocker families to work through."
  };
}

export function buildAgentLoopSummary(
  scenarios: readonly InvestigationScenarioCoverageRow[]
): InvestigationAgentLoopSummary {
  const ready = scenarios
    .filter((scenario) => scenario.lane === "ready-for-reconstruction")
    .slice(0, 4)
    .map((scenario) => `${scenario.displayName} (${scenario.state})`);
  const blocked = scenarios
    .filter((scenario) => scenario.lane === "still-blocked-on-source-material")
    .slice(0, 4)
    .map((scenario) => `${scenario.displayName} (${scenario.state})`);
  const nextTarget = scenarios.find((scenario) => scenario.lane === "still-blocked-on-source-material")
    ?? scenarios[0]
    ?? null;

  return {
    whatFound: ready.length > 0 ? ready : ["No scenario family is reconstruction-ready yet."],
    stillMissing: blocked.length > 0 ? blocked : ["No blocked scenario family is currently leading the queue."],
    nextProfileToRun: nextTarget?.nextProfile ?? null,
    nextOperatorAction: nextTarget?.nextOperatorAction ?? "Review the latest investigation status before changing stages.",
    manualAssistNeeded: Boolean(nextTarget?.nextProfile === "manual-operator-assist")
  };
}

export function scenarioDisplayName(scenarioId: string): string {
  return canonicalScenarioFamilies.find((entry) => entry.scenarioId === scenarioId)?.displayName ?? scenarioId;
}
