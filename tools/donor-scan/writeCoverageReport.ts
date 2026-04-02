import { promises as fs } from "node:fs";
import path from "node:path";
import {
  buildAgentLoopSummary,
  deriveLifecycleLane,
  deriveStageHandoff,
  scenarioDisplayName,
  type InvestigationScenarioCoverageRow,
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
import { buildScenarioCatalog, type ScenarioCatalogFile } from "./buildScenarioCatalog";
import { getScenarioProfile } from "./scenarioProfiles";
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
  minutesRequested: number;
  startedAt: string;
  finishedAt: string;
  runtimeLaunchSignal: "present" | "missing";
  requiresOperatorAssist: boolean;
  observedScenarioIds: string[];
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

function inferObservedScenarioIds(
  profileId: string,
  runtimeLaunchSignal: "present" | "missing"
): string[] {
  if (runtimeLaunchSignal !== "present") {
    return [];
  }

  const observed = new Set<string>(["intro_start_resume"]);
  if (["default-bet", "max-bet", "autoplay", "manual-operator-assist"].includes(profileId)) {
    observed.add("base_spin");
  }
  return Array.from(observed);
}

function appendCaptureRun(
  existing: ScenarioCaptureLogFile | null,
  donorId: string,
  donorName: string,
  profileRun: RefreshCoverageProfileRun | null,
  runtimeLaunchSignal: "present" | "missing"
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
  const observedScenarioIds = inferObservedScenarioIds(profileRun.profileId, runtimeLaunchSignal);
  const run: ScenarioCaptureRunRecord = {
    runId: `${profileRun.profileId}-${profileRun.finishedAt}`,
    profileId: profileRun.profileId,
    profileLabel: profile?.displayName ?? profileRun.profileId,
    minutesRequested: profileRun.minutesRequested,
    startedAt: profileRun.startedAt,
    finishedAt: profileRun.finishedAt,
    runtimeLaunchSignal,
    requiresOperatorAssist: profile?.requiresOperatorAssist ?? true,
    observedScenarioIds,
    notes: runtimeLaunchSignal === "present"
      ? [
          "Runtime launch evidence is present for this donor.",
          observedScenarioIds.length > 0
            ? `Structured runtime observation advanced: ${observedScenarioIds.join(", ")}.`
            : "No conservative runtime scenario observation could be promoted automatically."
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
  nextAction: string
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
    `- Next action: ${nextAction}`
  ].join("\n");
}

function buildEvents(
  donorId: string,
  profileRun: RefreshCoverageProfileRun | null,
  runtimeLaunchSignal: "present" | "missing",
  coverageRows: readonly ScenarioCoverageEntry[],
  investigationStatus: InvestigationStatusFile
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
    events.push({
      timestamp: profileRun.startedAt,
      type: "investigation.profile.started",
      donorId,
      profileId: profileRun.profileId,
      summary: `Started bounded profile ${profileRun.profileId}.`,
      details: {
        minutesRequested: profileRun.minutesRequested
      }
    });
    events.push({
      timestamp: profileRun.finishedAt,
      type: runtimeLaunchSignal === "present" ? "investigation.profile.completed" : "investigation.profile.completed-without-runtime",
      donorId,
      profileId: profileRun.profileId,
      summary: runtimeLaunchSignal === "present"
        ? `Completed bounded profile ${profileRun.profileId} with runtime launch evidence.`
        : `Completed bounded profile ${profileRun.profileId}, but no runtime launch evidence was present.`,
      details: {
        minutesRequested: profileRun.minutesRequested
      }
    });
  }

  for (const scenario of coverageRows.slice(0, 8)) {
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
    familyReconstructionSectionsFile,
    runtimeCandidatesFile,
    requestLogFile,
    previousCaptureLog
  ] = await Promise.all([
    readOptionalJsonFile<JsonObject>(paths.scanSummaryPath),
    readOptionalJsonFile<JsonObject>(paths.captureTargetFamiliesPath),
    readOptionalJsonFile<JsonObject>(paths.captureBlockerFamiliesPath),
    readOptionalJsonFile<JsonObject>(paths.captureFamilySourceProfilesPath),
    readOptionalJsonFile<JsonObject>(paths.captureFamilyActionsPath),
    readOptionalJsonFile<JsonObject>(paths.familyReconstructionProfilesPath),
    readOptionalJsonFile<JsonObject>(paths.familyReconstructionSectionsPath),
    readOptionalJsonFile<JsonObject>(paths.runtimeCandidatesPath),
    readOptionalJsonFile<JsonObject>(paths.runtimeRequestLogPath),
    readOptionalJsonFile<ScenarioCaptureLogFile>(paths.scenarioCaptureLogPath)
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

  const runtimeLaunchSignal = inferRuntimeLaunchSignal(scanSummary, runtimeCandidatesFile, requestLogFile);
  const captureLog = appendCaptureRun(
    previousCaptureLog,
    options.donorId,
    options.donorName,
    options.profileRun ?? null,
    runtimeLaunchSignal
  );
  const coverageRows = buildCoverageRows(scenarioCatalog, captureLog);
  const countsByState = createCoverageCounts();
  for (const scenario of coverageRows) {
    countsByState[scenario.state] += 1;
  }

  const stageHandoff = deriveStageHandoff(coverageRows);
  const lifecycleLane = deriveLifecycleLane(coverageRows);
  const nextTargets = buildNextTargets(coverageRows);
  const nextPrimaryTarget = nextTargets[0] ?? null;
  const readyScenarioIds = coverageRows
    .filter((scenario) => scenario.lane === "ready-for-reconstruction")
    .map((scenario) => scenario.scenarioId);
  const blockedScenarioIds = coverageRows
    .filter((scenario) => scenario.lane === "still-blocked-on-source-material")
    .map((scenario) => scenario.scenarioId);

  const scenarioCoverage = {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt,
    scenarioCount: coverageRows.length,
    countsByState,
    readyForReconstructionCount: readyScenarioIds.length,
    blockedScenarioCount: blockedScenarioIds.length,
    scenarios: coverageRows
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
      : runtimeLaunchSignal === "present"
        ? "runtime-launch-evidence-present"
        : "not-started",
    scenarioCatalogPath: toRepoRelativePath(paths.scenarioCatalogPath),
    scenarioCoveragePath: toRepoRelativePath(paths.scenarioCoveragePath),
    scenarioCaptureLogPath: toRepoRelativePath(paths.scenarioCaptureLogPath),
    nextScenarioTargetsPath: toRepoRelativePath(paths.nextScenarioTargetsPath),
    scenarioBlockerSummaryPath: toRepoRelativePath(paths.scenarioBlockerSummaryPath),
    eventStreamPath: toRepoRelativePath(paths.investigationEventsPath),
    scenarioCount: coverageRows.length,
    readyForReconstructionCount: readyScenarioIds.length,
    blockedScenarioCount: blockedScenarioIds.length,
    countsByState,
    readyScenarioIds,
    blockedScenarioIds,
    blockedScenarioNames: blockedScenarioIds.map((scenarioId) => scenarioDisplayName(scenarioId)),
    nextCaptureProfile: nextPrimaryTarget?.nextProfile ?? null,
    nextOperatorAction: nextPrimaryTarget?.nextOperatorAction ?? stageHandoff.rationale,
    nextManualAction: nextPrimaryTarget?.nextOperatorAction ?? null,
    stageHandoff,
    agentLoop: buildAgentLoopSummary(coverageRows)
  };

  if (captureLog.recentRuns.length > 0) {
    const latestRun = captureLog.recentRuns[captureLog.recentRuns.length - 1];
    latestRun.nextProfile = investigationStatus.nextCaptureProfile;
    latestRun.nextOperatorAction = investigationStatus.nextOperatorAction;
  }

  const scenarioBlockerSummary = buildScenarioBlockerSummary(
    options.donorName,
    coverageRows,
    investigationStatus.nextCaptureProfile,
    investigationStatus.nextOperatorAction
  );
  const events = buildEvents(
    options.donorId,
    options.profileRun ?? null,
    runtimeLaunchSignal,
    coverageRows,
    investigationStatus
  );

  await Promise.all([
    writeJsonFile(paths.scenarioCatalogPath, scenarioCatalog),
    writeJsonFile(paths.scenarioCoveragePath, scenarioCoverage),
    writeJsonFile(paths.scenarioCaptureLogPath, captureLog),
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
