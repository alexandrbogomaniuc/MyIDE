import { promises as fs } from "node:fs";
import path from "node:path";
import {
  buildAgentLoopSummary,
  deriveLifecycleLane,
  deriveStageHandoff,
  scenarioDisplayName,
  type InvestigationLatestRunSummary,
  type InvestigationOperatorAssistSummary,
  type InvestigationPromotionSummary,
  type InvestigationScenarioCoverageRow,
  type InvestigationSelfRunSummary,
  type InvestigationStatusFile
} from "../../30_app/investigation/investigationState";
import {
  canonicalScenarioFamilies,
  classifyScenarioCoverage,
  laneForScenarioState,
  nextActionForScenario,
  nextProfileForScenario,
  scenarioStatePriority,
  type ScenarioCoverageState
} from "../../30_app/investigation/scenarioCoverage";
import {
  applyPromotionCandidates,
  buildReadyPromotionCandidates,
  type ModificationQueueFile,
  type PromotionFamilyProfileRow,
  type PromotionScenarioRow,
  type PromotionSectionProfileRow
} from "../../30_app/investigation/promotionQueue";
import { buildScenarioCatalog, type ScenarioCatalogFile } from "./buildScenarioCatalog";
import { getScenarioProfile, normalizeScenarioProfileId } from "./scenarioProfiles";
import {
  buildDonorScanPaths,
  readOptionalJsonFile,
  toRepoRelativePath,
  writeJsonFile
} from "./shared";
import { writeInvestigationEventStream, type InvestigationEventRecord } from "./writeEventStream";

type JsonPrimitive = null | boolean | number | string;
interface JsonObject {
  [key: string]: JsonValue | undefined;
}
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

interface ScenarioCoverageEntry extends InvestigationScenarioCoverageRow {
  observedInRuntime: boolean;
  discoveredInStaticScan: boolean;
  sourceMaterialSufficient: boolean;
  reconstructionReady: boolean;
  recommendedProfiles: string[];
  notes: string[];
}

interface ScenarioCaptureRunRecord {
  runId: string;
  profileId: string;
  profileLabel: string;
  executionMode: "self-bounded" | "operator-assisted";
  minutesRequested: number;
  startedAt: string;
  finishedAt: string;
  runtimeLaunchSignal: "present" | "missing";
  requiresOperatorAssist: boolean;
  observedScenarioIds: string[];
  runtimeStageHits: Record<string, number>;
  coverageDeltaCount: number;
  coverageDeltaScenarioIds: string[];
  notes: string[];
  nextProfile: string | null;
  nextOperatorAction: string;
}

interface ScenarioCaptureLogFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  runCount: number;
  observedScenarioIds: string[];
  recentRuns: ScenarioCaptureRunRecord[];
}

interface RefreshCoverageProfileRun {
  profileId: string;
  minutesRequested: number;
  startedAt: string;
  finishedAt: string;
}

interface RuntimeObservationSummary {
  runtimeLaunchSignal: "present" | "missing";
  observedScenarioIds: string[];
  runtimeStageHits: Record<string, number>;
}

export interface InvestigationRefreshResult {
  scenarioCatalog: ScenarioCatalogFile;
  scenarioCoverage: {
    schemaVersion: string;
    donorId: string;
    donorName: string;
    generatedAt: string;
    scenarioCount: number;
    countsByState: Record<ScenarioCoverageState, number>;
    readyForReconstructionCount: number;
    blockedScenarioCount: number;
    scenarios: ScenarioCoverageEntry[];
  };
  captureLog: ScenarioCaptureLogFile;
  investigationStatus: InvestigationStatusFile;
}

function asString(value: JsonValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: JsonValue | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];
}

function createCoverageCounts(): Record<ScenarioCoverageState, number> {
  return {
    "not-discovered": 0,
    "discovered-in-static-scan": 0,
    "observed-in-runtime": 0,
    "source-material-sufficient": 0,
    "reconstruction-ready": 0,
    "blocked": 0
  };
}

function inferRuntimeLaunchSignal(
  scanSummary: JsonObject | null,
  runtimeCandidates: JsonObject | null,
  requestLog: JsonObject | null
): "present" | "missing" {
  const runtimeCandidateCount = typeof runtimeCandidates?.runtimeCandidateCount === "number"
    ? runtimeCandidates.runtimeCandidateCount
    : typeof scanSummary?.runtimeCandidateCount === "number"
      ? scanSummary.runtimeCandidateCount
      : 0;
  const requestEntries = Array.isArray(requestLog?.entries) ? requestLog.entries.length : 0;
  return runtimeCandidateCount > 0 || requestEntries > 0 ? "present" : "missing";
}

function getObjectArray(value: JsonValue | undefined): JsonObject[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is JsonObject => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    : [];
}

function collectRuntimeStageHits(requestLog: JsonObject | null): Record<string, number> {
  const stageHits = new Map<string, number>();
  for (const entry of getObjectArray(requestLog?.entries)) {
    const lastStage = asString(entry.lastStage);
    if (lastStage) {
      stageHits.set(lastStage, (stageHits.get(lastStage) ?? 0) + 1);
    }
    const rawStageHitCounts = entry.stageHitCounts;
    if (rawStageHitCounts && typeof rawStageHitCounts === "object" && !Array.isArray(rawStageHitCounts)) {
      for (const [stageName, hitCount] of Object.entries(rawStageHitCounts)) {
        if (typeof hitCount === "number" && Number.isFinite(hitCount) && hitCount > 0) {
          stageHits.set(stageName, (stageHits.get(stageName) ?? 0) + hitCount);
        }
      }
    }
  }

  return Object.fromEntries(Array.from(stageHits.entries()).sort((left, right) => left[0].localeCompare(right[0])));
}

function inferRuntimeObservation(
  profileId: string,
  scanSummary: JsonObject | null,
  runtimeCandidates: JsonObject | null,
  requestLog: JsonObject | null
): RuntimeObservationSummary {
  const runtimeLaunchSignal = inferRuntimeLaunchSignal(scanSummary, runtimeCandidates, requestLog);
  const runtimeStageHits = collectRuntimeStageHits(requestLog);
  if (runtimeLaunchSignal !== "present") {
    return {
      runtimeLaunchSignal,
      observedScenarioIds: [],
      runtimeStageHits
    };
  }

  const observed = new Set<string>();
  const normalizedProfileId = normalizeScenarioProfileId(profileId);
  const sawLaunch = (runtimeStageHits.launch ?? 0) > 0 || (runtimeStageHits.reload ?? 0) > 0;
  const sawEnter = (runtimeStageHits.enter ?? 0) > 0;
  const sawSpin = (runtimeStageHits.spin ?? 0) > 0;

  if (sawLaunch || sawEnter || Object.keys(runtimeStageHits).length > 0) {
    observed.add("intro_start_resume");
  }
  if (sawSpin || ["default-bet", "max-bet", "autoplay", "manual-operator"].includes(normalizedProfileId)) {
    observed.add("base_spin");
  }

  return {
    runtimeLaunchSignal,
    observedScenarioIds: Array.from(observed),
    runtimeStageHits
  };
}

function buildCoverageDelta(previousCoverage: {
  scenarios?: Array<{ scenarioId?: string; state?: string }>;
} | null, currentCoverage: readonly ScenarioCoverageEntry[]): {
  changedScenarioIds: string[];
  changedCount: number;
} {
  const previousStates = new Map<string, string>();
  for (const scenario of previousCoverage?.scenarios ?? []) {
    if (typeof scenario?.scenarioId === "string" && typeof scenario?.state === "string") {
      previousStates.set(scenario.scenarioId, scenario.state);
    }
  }

  const changedScenarioIds = currentCoverage
    .filter((scenario) => previousStates.get(scenario.scenarioId) !== scenario.state)
    .map((scenario) => scenario.scenarioId);

  return {
    changedScenarioIds,
    changedCount: changedScenarioIds.length
  };
}

function buildPromotionFamilyProfiles(file: JsonObject | null): PromotionFamilyProfileRow[] {
  return getObjectArray(file?.families)
    .map((family) => ({
      familyName: asString(family.familyName),
      profileState: asString(family.profileState) || undefined,
      readiness: asString(family.readiness) || undefined,
      bundlePath: asString(family.bundlePath) || undefined,
      worksetPath: asString(family.worksetPath) || undefined,
      nextStep: asString(family.nextStep) || undefined
    }))
    .filter((family) => family.familyName.length > 0);
}

function buildPromotionSectionProfiles(file: JsonObject | null): PromotionSectionProfileRow[] {
  return getObjectArray(file?.sections)
    .map((section) => ({
      familyName: asString(section.familyName),
      sectionKey: asString(section.sectionKey),
      sectionState: asString(section.sectionState) || undefined,
      sectionBundlePath: asString(section.sectionBundlePath) || asString(section.reconstructionBundlePath) || undefined,
      nextSectionStep: asString(section.nextSectionStep) || undefined
    }))
    .filter((section) => section.familyName.length > 0 && section.sectionKey.length > 0);
}

function buildPromotionScenarioRows(rows: readonly ScenarioCoverageEntry[]): PromotionScenarioRow[] {
  return rows.map((scenario) => ({
    scenarioId: scenario.scenarioId,
    displayName: scenario.displayName,
    lane: scenario.lane,
    state: scenario.state,
    matchedFamilyNames: scenario.matchedFamilyNames,
    nextOperatorAction: scenario.nextOperatorAction
  }));
}

function buildPromotionSummary(
  readyFilePath: string,
  readyFile: {
    readyCandidateCount: number;
    readyFamilyCount: number;
    readySectionCount: number;
  },
  queuePath: string,
  queueFile: ModificationQueueFile | null
): InvestigationPromotionSummary {
  const queuedItemCount = queueFile?.itemCount ?? 0;
  const queuedFamilyCount = queueFile?.queuedFamilyCount ?? 0;
  const queuedSectionCount = queueFile?.queuedSectionCount ?? 0;
  let promotionReadiness: InvestigationPromotionSummary["promotionReadiness"] = "not-ready";
  if (readyFile.readyCandidateCount > 0 && queuedItemCount === 0) {
    promotionReadiness = "ready-to-promote";
  } else if (readyFile.readyCandidateCount > 0 && queuedItemCount > 0 && queuedItemCount < readyFile.readyCandidateCount) {
    promotionReadiness = "mixed";
  } else if (queuedItemCount > 0) {
    promotionReadiness = "queued";
  }

  return {
    promotionReadiness,
    readyCandidateCount: readyFile.readyCandidateCount,
    readyFamilyCount: readyFile.readyFamilyCount,
    readySectionCount: readyFile.readySectionCount,
    queuedItemCount,
    queuedFamilyCount,
    queuedSectionCount,
    readyCandidatesPath: toRepoRelativePath(readyFilePath),
    modificationQueuePath: queueFile ? toRepoRelativePath(queuePath) : null
  };
}

function buildSelfInvestigationSummary(
  captureLog: ScenarioCaptureLogFile,
  nextTargets: Array<{
    nextProfile: string | null;
    nextOperatorAction: string;
  }>
): InvestigationSelfRunSummary {
  const nextAutoTarget = nextTargets.find((target) => {
    if (!target.nextProfile) {
      return false;
    }
    return getScenarioProfile(target.nextProfile)?.executionMode === "self-bounded";
  }) ?? null;
  const nextAutoProfile = nextAutoTarget?.nextProfile ?? null;
  const nextProfileDefinition = nextAutoProfile ? getScenarioProfile(nextAutoProfile) : null;

  return {
    runCount: captureLog.runCount,
    canRunNextProfile: Boolean(nextAutoProfile),
    nextAutoProfile,
    nextAutoProfileLabel: nextProfileDefinition?.displayName ?? null,
    boundedWindowMinutes: nextProfileDefinition?.defaultMinutes ?? null,
    rationale: nextAutoTarget?.nextOperatorAction
      ?? "No bounded self-investigation profile is currently leading the queue."
  };
}

function buildOperatorAssistSummary(
  nextTargets: Array<{
    scenarioId: string;
    displayName: string;
    nextProfile: string | null;
    nextOperatorAction: string;
  }>,
  coverageRows: readonly ScenarioCoverageEntry[]
): InvestigationOperatorAssistSummary {
  const operatorTarget = nextTargets.find((target) => {
    if (!target.nextProfile) {
      return false;
    }
    return getScenarioProfile(target.nextProfile)?.executionMode === "operator-assisted";
  }) ?? nextTargets[0] ?? null;
  const profileDefinition = operatorTarget?.nextProfile ? getScenarioProfile(operatorTarget.nextProfile) : null;
  const targetCoverage = coverageRows.find((scenario) => scenario.scenarioId === operatorTarget?.scenarioId) ?? null;

  return {
    assistRequired: Boolean(operatorTarget && profileDefinition?.executionMode === "operator-assisted"),
    suggestedProfile: operatorTarget?.nextProfile ?? null,
    targetScenarioId: operatorTarget?.scenarioId ?? null,
    targetScenarioName: operatorTarget?.displayName ?? null,
    nextOperatorAction: operatorTarget?.nextOperatorAction ?? "No manual assist step is currently leading the queue.",
    suggestedRuntimeActions: profileDefinition?.suggestedRuntimeActions ?? [],
    evidenceHints: [
      ...(targetCoverage?.matchedFamilyNames ?? []).slice(0, 4),
      ...(targetCoverage?.blockerClasses ?? []).slice(0, 2)
    ]
  };
}

function buildLatestRunSummary(captureLog: ScenarioCaptureLogFile): InvestigationLatestRunSummary | null {
  const latestRun = captureLog.recentRuns[captureLog.recentRuns.length - 1] ?? null;
  if (!latestRun) {
    return null;
  }

  return {
    profileId: latestRun.profileId,
    profileLabel: latestRun.profileLabel,
    executionMode: latestRun.executionMode,
    minutesRequested: latestRun.minutesRequested,
    startedAt: latestRun.startedAt,
    finishedAt: latestRun.finishedAt,
    coverageDeltaCount: latestRun.coverageDeltaCount,
    observedScenarioIds: latestRun.observedScenarioIds
  };
}

function appendCaptureRun(
  existing: ScenarioCaptureLogFile | null,
  donorId: string,
  donorName: string,
  profileRun: RefreshCoverageProfileRun | null,
  runtimeObservation: RuntimeObservationSummary,
  coverageDelta: {
    changedScenarioIds: string[];
    changedCount: number;
  }
): ScenarioCaptureLogFile {
  const base: ScenarioCaptureLogFile = existing ?? {
    schemaVersion: "0.1.0",
    donorId,
    donorName,
    generatedAt: new Date().toISOString(),
    runCount: 0,
    observedScenarioIds: [],
    recentRuns: []
  };

  if (!profileRun) {
    return {
      ...base,
      donorId,
      donorName,
      generatedAt: new Date().toISOString()
    };
  }

  const profile = getScenarioProfile(profileRun.profileId);
  const observedScenarioIds = runtimeObservation.observedScenarioIds;
  const run: ScenarioCaptureRunRecord = {
    runId: `${normalizeScenarioProfileId(profileRun.profileId)}-${profileRun.finishedAt}`,
    profileId: normalizeScenarioProfileId(profileRun.profileId),
    profileLabel: profile?.displayName ?? normalizeScenarioProfileId(profileRun.profileId),
    executionMode: profile?.executionMode ?? "operator-assisted",
    minutesRequested: profileRun.minutesRequested,
    startedAt: profileRun.startedAt,
    finishedAt: profileRun.finishedAt,
    runtimeLaunchSignal: runtimeObservation.runtimeLaunchSignal,
    requiresOperatorAssist: profile?.requiresOperatorAssist ?? true,
    observedScenarioIds,
    runtimeStageHits: runtimeObservation.runtimeStageHits,
    coverageDeltaCount: coverageDelta.changedCount,
    coverageDeltaScenarioIds: coverageDelta.changedScenarioIds,
    notes: runtimeObservation.runtimeLaunchSignal === "present"
      ? [
          "Runtime launch evidence is present for this donor.",
          observedScenarioIds.length > 0
            ? `Structured runtime observation advanced: ${observedScenarioIds.join(", ")}.`
            : "No conservative runtime scenario observation could be promoted automatically.",
          coverageDelta.changedCount > 0
            ? `Coverage improved for ${coverageDelta.changedCount} scenario family${coverageDelta.changedCount === 1 ? "" : "ies"}.`
            : "Coverage state did not improve during this bounded window."
        ]
      : ["No runtime launch evidence was present, so the profile stayed advisory-only."],
    nextProfile: null,
    nextOperatorAction: "Refresh scenario coverage and review the next blocked family."
  };

  const observed = new Set<string>(base.observedScenarioIds);
  for (const scenarioId of observedScenarioIds) {
    observed.add(scenarioId);
  }

  return {
    schemaVersion: "0.1.0",
    donorId,
    donorName,
    generatedAt: new Date().toISOString(),
    runCount: base.runCount + 1,
    observedScenarioIds: Array.from(observed),
    recentRuns: [...base.recentRuns, run].slice(-8)
  };
}

function buildCoverageRows(
  catalog: ScenarioCatalogFile,
  captureLog: ScenarioCaptureLogFile
): ScenarioCoverageEntry[] {
  const runtimeObserved = new Set(captureLog.observedScenarioIds);

  return catalog.scenarios.map((scenario) => {
    const observedInRuntime = runtimeObserved.has(scenario.scenarioId);
    const discoveredInStaticScan = scenario.staticDiscoveryState === "discovered-in-static-scan";
    const sourceMaterialSufficient = scenario.sourceMaterialSignalCount > 0 || scenario.reconstructionReadySignalCount > 0;
    const reconstructionReady = scenario.reconstructionReadySignalCount > 0;
    const blocked = scenario.blockerClasses.length > 0 && !sourceMaterialSufficient && !observedInRuntime;
    const state = classifyScenarioCoverage({
      discoveredInStaticScan,
      observedInRuntime,
      sourceMaterialSufficient,
      reconstructionReady,
      blocked,
      blockerClasses: scenario.blockerClasses,
      matchedFamilyNames: scenario.matchedFamilyNames
    });
    const definition = canonicalScenarioFamilies.find((entry) => entry.scenarioId === scenario.scenarioId);
    const nextProfile = definition ? nextProfileForScenario(definition, state) : null;
    const nextOperatorAction = definition
      ? nextActionForScenario(definition, state, {
          discoveredInStaticScan,
          observedInRuntime,
          sourceMaterialSufficient,
          reconstructionReady,
          blocked,
          blockerClasses: scenario.blockerClasses,
          matchedFamilyNames: scenario.matchedFamilyNames
        })
      : "Review the investigation catalog entry.";

    return {
      scenarioId: scenario.scenarioId,
      displayName: scenario.displayName,
      state,
      lane: laneForScenarioState(state),
      matchedFamilyNames: scenario.matchedFamilyNames,
      blockerClasses: scenario.blockerClasses,
      nextProfile,
      nextOperatorAction,
      observedInRuntime,
      discoveredInStaticScan,
      sourceMaterialSufficient,
      reconstructionReady,
      recommendedProfiles: scenario.recommendedProfiles,
      notes: scenario.notes
    };
  });
}

function buildNextTargets(scenarios: readonly ScenarioCoverageEntry[]) {
  return scenarios
    .filter((scenario) => scenario.state !== "reconstruction-ready")
    .sort((left, right) => {
      const stateDelta = scenarioStatePriority(left.state) - scenarioStatePriority(right.state);
      if (stateDelta !== 0) {
        return stateDelta;
      }
      return left.displayName.localeCompare(right.displayName);
    })
    .map((scenario, index) => ({
      rank: index + 1,
      scenarioId: scenario.scenarioId,
      displayName: scenario.displayName,
      state: scenario.state,
      lane: scenario.lane,
      nextProfile: scenario.nextProfile,
      nextOperatorAction: scenario.nextOperatorAction,
      blockerClasses: scenario.blockerClasses,
      matchedFamilyNames: scenario.matchedFamilyNames
    }));
}

function buildScenarioBlockerSummary(
  donorName: string,
  scenarios: readonly ScenarioCoverageEntry[],
  nextProfile: string | null,
  nextAction: string,
  operatorAssist: InvestigationOperatorAssistSummary,
  promotion: InvestigationPromotionSummary
): string {
  const ready = scenarios.filter((scenario) => scenario.lane === "ready-for-reconstruction");
  const blocked = scenarios.filter((scenario) => scenario.lane === "still-blocked-on-source-material");

  return [
    `# Investigation Summary: ${donorName}`,
    "",
    "## Lane A — Ready For Reconstruction / Modification",
    ...(ready.length > 0
      ? ready.slice(0, 6).map((scenario) => `- ${scenario.displayName}: ${scenario.state}`)
      : ["- No scenario family is ready for reconstruction yet."]),
    "",
    "## Lane B — Still Blocked On Source Material",
    ...(blocked.length > 0
      ? blocked.slice(0, 8).map((scenario) => {
          const blockers = scenario.blockerClasses.length > 0 ? ` (${scenario.blockerClasses.join(", ")})` : "";
          return `- ${scenario.displayName}: ${scenario.state}${blockers}`;
        })
      : ["- No blocker family is leading the queue right now."]),
    "",
    "## Next Operator Step",
    `- Next profile: ${nextProfile ?? "none"}`,
    `- Next action: ${nextAction}`,
    `- Manual assist required: ${operatorAssist.assistRequired ? "yes" : "no"}`,
    `- Suggested runtime actions: ${operatorAssist.suggestedRuntimeActions.length > 0 ? operatorAssist.suggestedRuntimeActions.join(", ") : "none"}`,
    "",
    "## Promotion Queue",
    `- Promotion readiness: ${promotion.promotionReadiness}`,
    `- Ready candidates: ${promotion.readyCandidateCount}`,
    `- Queued modification items: ${promotion.queuedItemCount}`
  ].join("\n");
}

function buildEvents(
  donorId: string,
  profileRun: RefreshCoverageProfileRun | null,
  runtimeObservation: RuntimeObservationSummary,
  coverageRows: readonly ScenarioCoverageEntry[],
  investigationStatus: InvestigationStatusFile,
  coverageDelta: {
    changedScenarioIds: string[];
    changedCount: number;
  }
): InvestigationEventRecord[] {
  const timestamp = new Date().toISOString();
  const events: InvestigationEventRecord[] = [
    {
      timestamp,
      type: "investigation.static-scan.loaded",
      donorId,
      summary: `Static scan state is ${investigationStatus.staticScanState}.`,
      details: {
        currentStage: investigationStatus.currentStage,
        runtimeScanState: investigationStatus.runtimeScanState
      }
    }
  ];

  if (profileRun) {
    const profileDefinition = getScenarioProfile(profileRun.profileId);
    events.push({
      timestamp: profileRun.startedAt,
      type: "investigation.profile.started",
      donorId,
      profileId: normalizeScenarioProfileId(profileRun.profileId),
      summary: `Started bounded profile ${normalizeScenarioProfileId(profileRun.profileId)}.`,
      details: {
        minutesRequested: profileRun.minutesRequested,
        executionMode: profileDefinition?.executionMode ?? "operator-assisted",
        suggestedRuntimeActions: profileDefinition?.suggestedRuntimeActions ?? []
      }
    });
    events.push({
      timestamp: profileRun.finishedAt,
      type: runtimeObservation.runtimeLaunchSignal === "present" ? "investigation.profile.completed" : "investigation.profile.completed-without-runtime",
      donorId,
      profileId: normalizeScenarioProfileId(profileRun.profileId),
      summary: runtimeObservation.runtimeLaunchSignal === "present"
        ? `Completed bounded profile ${normalizeScenarioProfileId(profileRun.profileId)} with runtime launch evidence.`
        : `Completed bounded profile ${normalizeScenarioProfileId(profileRun.profileId)}, but no runtime launch evidence was present.`,
      details: {
        minutesRequested: profileRun.minutesRequested,
        runtimeStageHits: runtimeObservation.runtimeStageHits,
        observedScenarioIds: runtimeObservation.observedScenarioIds
      }
    });

    if (runtimeObservation.observedScenarioIds.length > 0) {
      events.push({
        timestamp: profileRun.finishedAt,
        type: "investigation.runtime.observed",
        donorId,
        profileId: normalizeScenarioProfileId(profileRun.profileId),
        summary: `Runtime observation advanced ${runtimeObservation.observedScenarioIds.length} scenario family${runtimeObservation.observedScenarioIds.length === 1 ? "" : "ies"}.`,
        details: {
          observedScenarioIds: runtimeObservation.observedScenarioIds,
          runtimeStageHits: runtimeObservation.runtimeStageHits
        }
      });
    }
  }

  const coverageChangeSet = new Set(coverageDelta.changedScenarioIds);
  for (const scenario of coverageRows.filter((entry) => coverageChangeSet.has(entry.scenarioId)).slice(0, 8)) {
    events.push({
      timestamp,
      type: "investigation.coverage.updated",
      donorId,
      scenarioId: scenario.scenarioId,
      summary: `${scenario.displayName} is now ${scenario.state}.`,
      details: {
        lane: scenario.lane,
        nextProfile: scenario.nextProfile,
        blockerClasses: scenario.blockerClasses
      }
    });
  }

  if (coverageDelta.changedCount > 0) {
    events.push({
      timestamp,
      type: "investigation.coverage.improved",
      donorId,
      summary: `Coverage improved for ${coverageDelta.changedCount} scenario family${coverageDelta.changedCount === 1 ? "" : "ies"}.`,
      details: {
        scenarioIds: coverageDelta.changedScenarioIds
      }
    });
  }

  events.push({
    timestamp,
    type: "investigation.next-action.recommended",
    donorId,
    profileId: investigationStatus.nextCaptureProfile,
    summary: investigationStatus.nextOperatorAction,
    details: {
      lifecycleLane: investigationStatus.lifecycleLane,
      modificationReadiness: investigationStatus.stageHandoff.modificationReadiness
    }
  });

  if (investigationStatus.operatorAssist.assistRequired) {
    events.push({
      timestamp,
      type: "investigation.operator-assist.required",
      donorId,
      profileId: investigationStatus.operatorAssist.suggestedProfile,
      scenarioId: investigationStatus.operatorAssist.targetScenarioId,
      summary: investigationStatus.operatorAssist.nextOperatorAction,
      details: {
        suggestedRuntimeActions: investigationStatus.operatorAssist.suggestedRuntimeActions,
        evidenceHints: investigationStatus.operatorAssist.evidenceHints
      }
    });
  }

  if (investigationStatus.promotion.readyCandidateCount > 0) {
    events.push({
      timestamp,
      type: "investigation.ready-for-modification.reached",
      donorId,
      summary: `${investigationStatus.promotion.readyCandidateCount} family or section handoff candidate${investigationStatus.promotion.readyCandidateCount === 1 ? "" : "s"} are ready for Modification.`,
      details: {
        promotionReadiness: investigationStatus.promotion.promotionReadiness,
        queuedItemCount: investigationStatus.promotion.queuedItemCount
      }
    });
  }
  return events;
}

export async function refreshInvestigationArtifacts(options: {
  donorId: string;
  donorName: string;
  profileRun?: RefreshCoverageProfileRun | null;
}): Promise<InvestigationRefreshResult> {
  const paths = buildDonorScanPaths(options.donorId);
  const generatedAt = new Date().toISOString();
  const [
    scanSummary,
    captureTargetFamiliesFile,
    captureBlockerFamiliesFile,
    captureFamilySourceProfilesFile,
    captureFamilyActionsFile,
    familyReconstructionProfilesFile,
    familyReconstructionSectionBundlesFile,
    familyReconstructionSectionsFile,
    runtimeCandidatesFile,
    requestLogFile,
    previousCaptureLog,
    previousCoverage,
    existingModificationQueue
  ] = await Promise.all([
    readOptionalJsonFile<JsonObject>(paths.scanSummaryPath),
    readOptionalJsonFile<JsonObject>(paths.captureTargetFamiliesPath),
    readOptionalJsonFile<JsonObject>(paths.captureBlockerFamiliesPath),
    readOptionalJsonFile<JsonObject>(paths.captureFamilySourceProfilesPath),
    readOptionalJsonFile<JsonObject>(paths.captureFamilyActionsPath),
    readOptionalJsonFile<JsonObject>(paths.familyReconstructionProfilesPath),
    readOptionalJsonFile<JsonObject>(paths.familyReconstructionSectionBundlesPath),
    readOptionalJsonFile<JsonObject>(paths.familyReconstructionSectionsPath),
    readOptionalJsonFile<JsonObject>(paths.runtimeCandidatesPath),
    readOptionalJsonFile<JsonObject>(paths.runtimeRequestLogPath),
    readOptionalJsonFile<ScenarioCaptureLogFile>(paths.scenarioCaptureLogPath),
    readOptionalJsonFile<{ scenarios?: Array<{ scenarioId?: string; state?: string }> }>(paths.scenarioCoveragePath),
    readOptionalJsonFile<ModificationQueueFile>(paths.modificationQueuePath)
  ]);

  const scenarioCatalog = buildScenarioCatalog({
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt,
    captureTargetFamiliesFile,
    captureBlockerFamiliesFile,
    captureFamilySourceProfilesFile,
    captureFamilyActionsFile,
    familyReconstructionProfilesFile,
    familyReconstructionSectionsFile,
    scanSummary
  });

  const runtimeObservation = inferRuntimeObservation(options.profileRun?.profileId ?? "default-bet", scanSummary, runtimeCandidatesFile, requestLogFile);
  const coverageRows = buildCoverageRows(scenarioCatalog, {
    ...(previousCaptureLog ?? {
      schemaVersion: "0.1.0",
      donorId: options.donorId,
      donorName: options.donorName,
      generatedAt,
      runCount: 0,
      observedScenarioIds: [],
      recentRuns: []
    }),
    observedScenarioIds: Array.from(new Set([
      ...((previousCaptureLog?.observedScenarioIds ?? [])),
      ...runtimeObservation.observedScenarioIds
    ]))
  });
  const coverageDelta = buildCoverageDelta(previousCoverage, coverageRows);
  const captureLog = appendCaptureRun(
    previousCaptureLog,
    options.donorId,
    options.donorName,
    options.profileRun ?? null,
    runtimeObservation,
    coverageDelta
  );
  const refreshedCoverageRows = buildCoverageRows(scenarioCatalog, captureLog);
  const countsByState = createCoverageCounts();
  for (const scenario of refreshedCoverageRows) {
    countsByState[scenario.state] += 1;
  }

  const stageHandoff = deriveStageHandoff(refreshedCoverageRows);
  const lifecycleLane = deriveLifecycleLane(refreshedCoverageRows);
  const nextTargets = buildNextTargets(refreshedCoverageRows);
  const nextPrimaryTarget = nextTargets[0] ?? null;
  const readyScenarioIds = refreshedCoverageRows
    .filter((scenario) => scenario.lane === "ready-for-reconstruction")
    .map((scenario) => scenario.scenarioId);
  const blockedScenarioIds = refreshedCoverageRows
    .filter((scenario) => scenario.lane === "still-blocked-on-source-material")
    .map((scenario) => scenario.scenarioId);
  const readyPromotionFile = buildReadyPromotionCandidates({
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt,
    scenarioCoverageRows: buildPromotionScenarioRows(refreshedCoverageRows),
    familyProfiles: buildPromotionFamilyProfiles(familyReconstructionProfilesFile),
    sectionProfiles: buildPromotionSectionProfiles(familyReconstructionSectionBundlesFile ?? familyReconstructionSectionsFile)
  });
  const promotionSummary = buildPromotionSummary(
    paths.reconstructionReadyFamiliesPath,
    readyPromotionFile,
    paths.modificationQueuePath,
    existingModificationQueue
  );
  const selfInvestigation = buildSelfInvestigationSummary(captureLog, nextTargets);
  const operatorAssist = buildOperatorAssistSummary(nextTargets, refreshedCoverageRows);
  const latestRun = buildLatestRunSummary(captureLog);

  const scenarioCoverage = {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt,
    scenarioCount: refreshedCoverageRows.length,
    countsByState,
    readyForReconstructionCount: readyScenarioIds.length,
    blockedScenarioCount: blockedScenarioIds.length,
    scenarios: refreshedCoverageRows
  };

  const investigationStatus: InvestigationStatusFile = {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt,
    currentStage: "investigation",
    lifecycleLane,
    staticScanState: asString(scanSummary?.scanState) || "unknown",
    runtimeScanState: captureLog.runCount > 0
      ? "bounded-profile-complete"
      : runtimeObservation.runtimeLaunchSignal === "present"
        ? "runtime-launch-evidence-present"
        : "not-started",
    scenarioCatalogPath: toRepoRelativePath(paths.scenarioCatalogPath),
    scenarioCoveragePath: toRepoRelativePath(paths.scenarioCoveragePath),
    scenarioCaptureLogPath: toRepoRelativePath(paths.scenarioCaptureLogPath),
    nextScenarioTargetsPath: toRepoRelativePath(paths.nextScenarioTargetsPath),
    scenarioBlockerSummaryPath: toRepoRelativePath(paths.scenarioBlockerSummaryPath),
    eventStreamPath: toRepoRelativePath(paths.investigationEventsPath),
    scenarioCount: refreshedCoverageRows.length,
    readyForReconstructionCount: readyScenarioIds.length,
    blockedScenarioCount: blockedScenarioIds.length,
    countsByState,
    readyScenarioIds,
    blockedScenarioIds,
    blockedScenarioNames: blockedScenarioIds.map((scenarioId) => scenarioDisplayName(scenarioId)),
    nextCaptureProfile: nextPrimaryTarget?.nextProfile ?? null,
    nextOperatorAction: nextPrimaryTarget?.nextOperatorAction ?? stageHandoff.rationale,
    nextManualAction: operatorAssist.assistRequired ? operatorAssist.nextOperatorAction : null,
    latestRun,
    selfInvestigation,
    operatorAssist,
    promotion: promotionSummary,
    stageHandoff,
    agentLoop: buildAgentLoopSummary(refreshedCoverageRows)
  };

  if (captureLog.recentRuns.length > 0) {
    const latestRun = captureLog.recentRuns[captureLog.recentRuns.length - 1];
    latestRun.nextProfile = investigationStatus.nextCaptureProfile;
    latestRun.nextOperatorAction = investigationStatus.nextOperatorAction;
  }

  const scenarioBlockerSummary = buildScenarioBlockerSummary(
    options.donorName,
    refreshedCoverageRows,
    investigationStatus.nextCaptureProfile,
    investigationStatus.nextOperatorAction,
    operatorAssist,
    promotionSummary
  );
  const events = buildEvents(
    options.donorId,
    options.profileRun ?? null,
    runtimeObservation,
    refreshedCoverageRows,
    investigationStatus,
    coverageDelta
  );

  await Promise.all([
    writeJsonFile(paths.scenarioCatalogPath, scenarioCatalog),
    writeJsonFile(paths.scenarioCoveragePath, scenarioCoverage),
    writeJsonFile(paths.scenarioCaptureLogPath, captureLog),
    writeJsonFile(paths.reconstructionReadyFamiliesPath, readyPromotionFile),
    writeJsonFile(paths.nextScenarioTargetsPath, {
      schemaVersion: "0.1.0",
      donorId: options.donorId,
      donorName: options.donorName,
      generatedAt,
      targetCount: nextTargets.length,
      targets: nextTargets
    }),
    fs.writeFile(paths.scenarioBlockerSummaryPath, `${scenarioBlockerSummary}\n`, "utf8"),
    writeInvestigationEventStream(paths.investigationEventsPath, events),
    writeJsonFile(paths.investigationStatusPath, investigationStatus)
  ]);

  return {
    scenarioCatalog,
    scenarioCoverage,
    captureLog,
    investigationStatus
  };
}

function parseArgs(argv: readonly string[]): { donorId: string; donorName?: string } {
  let donorId = "";
  let donorName = "";
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === "--donor-id" && next) {
      donorId = next;
      index += 1;
      continue;
    }
    if (token === "--donor-name" && next) {
      donorName = next;
      index += 1;
    }
  }
  if (!donorId) {
    throw new Error("Missing required --donor-id argument.");
  }
  return { donorId, donorName: donorName || undefined };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const result = await refreshInvestigationArtifacts({
    donorId: parsed.donorId,
    donorName: parsed.donorName ?? parsed.donorId
  });
  console.log("PASS donor-scan:coverage");
  console.log(`Donor: ${result.investigationStatus.donorId}`);
  console.log(`Lane: ${result.investigationStatus.lifecycleLane}`);
  console.log(`Ready for reconstruction: ${result.investigationStatus.readyForReconstructionCount}`);
  console.log(`Blocked scenarios: ${result.investigationStatus.blockedScenarioCount}`);
  console.log(`Next profile: ${result.investigationStatus.nextCaptureProfile ?? "none"}`);
  console.log(`Next action: ${result.investigationStatus.nextOperatorAction}`);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL donor-scan:coverage - ${message}`);
    process.exitCode = 1;
  });
}
