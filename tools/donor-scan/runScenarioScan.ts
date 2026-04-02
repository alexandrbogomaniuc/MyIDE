import { promises as fs } from "node:fs";
import path from "node:path";
import { refreshInvestigationArtifacts } from "./writeCoverageReport";
import { buildDonorScanPaths, fileExists, readOptionalJsonFile, workspaceRoot } from "./shared";
import { getScenarioProfile, normalizeScenarioProfileId } from "./scenarioProfiles";

export interface RunScenarioScanResult {
  donorId: string;
  donorName: string;
  profileId: string;
  minutesRequested: number;
  runtimeScanState: string;
  lifecycleLane: string;
  readyForReconstructionCount: number;
  blockedScenarioCount: number;
  coverageDeltaCount: number;
  promotionReadyCount: number;
  queuedForModificationCount: number;
  needsOperatorAssist: boolean;
  nextProfile: string | null;
  nextOperatorAction: string;
  investigationStatusPath: string;
}

interface ParsedArgs {
  donorId: string;
  donorName: string;
  profileId: string;
  minutesRequested: number;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  let donorId = "";
  let donorName = "";
  let profileId = "default-bet";
  let minutesRequested = 0;

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
      continue;
    }
    if (token === "--profile" && next) {
      profileId = next;
      index += 1;
      continue;
    }
    if (token === "--minutes" && next) {
      minutesRequested = Number.parseInt(next, 10);
      index += 1;
    }
  }

  if (!donorId) {
    throw new Error("Missing required --donor-id argument.");
  }

  const profile = getScenarioProfile(profileId);
  if (!profile) {
    throw new Error(`Unknown scenario profile: ${profileId}`);
  }

  return {
    donorId,
    donorName: donorName || donorId,
    profileId,
    minutesRequested: Number.isFinite(minutesRequested) && minutesRequested > 0
      ? minutesRequested
      : profile.defaultMinutes
  };
}

async function syncLatestRuntimeRequestLogForDonor(donorId: string): Promise<void> {
  const registryPath = path.join(workspaceRoot, "40_projects", "registry.json");
  const registry = await readOptionalJsonFile<{ projects?: Array<{ projectId?: string; donor?: { donorId?: string } }> }>(registryPath);
  const projectId = registry?.projects?.find((project) => project?.donor?.donorId === donorId)?.projectId;
  if (!projectId) {
    return;
  }

  const latestRuntimeRequestLogPath = path.join(
    workspaceRoot,
    "40_projects",
    projectId,
    "runtime",
    "local-mirror",
    "request-log.latest.json"
  );
  if (!await fileExists(latestRuntimeRequestLogPath)) {
    return;
  }

  const donorPaths = buildDonorScanPaths(donorId);
  await fs.mkdir(path.dirname(donorPaths.runtimeRequestLogPath), { recursive: true });
  await fs.copyFile(latestRuntimeRequestLogPath, donorPaths.runtimeRequestLogPath);
}

export async function runScenarioScan(input: ParsedArgs): Promise<RunScenarioScanResult> {
  const startedAt = new Date().toISOString();
  await syncLatestRuntimeRequestLogForDonor(input.donorId);
  const result = await refreshInvestigationArtifacts({
    donorId: input.donorId,
    donorName: input.donorName,
    profileRun: {
      profileId: normalizeScenarioProfileId(input.profileId),
      minutesRequested: input.minutesRequested,
      startedAt,
      finishedAt: new Date().toISOString()
    }
  });
  const latestRun = result.investigationStatus.latestRun;

  return {
    donorId: input.donorId,
    donorName: input.donorName,
    profileId: normalizeScenarioProfileId(input.profileId),
    minutesRequested: input.minutesRequested,
    runtimeScanState: result.investigationStatus.runtimeScanState,
    lifecycleLane: result.investigationStatus.lifecycleLane,
    readyForReconstructionCount: result.investigationStatus.readyForReconstructionCount,
    blockedScenarioCount: result.investigationStatus.blockedScenarioCount,
    coverageDeltaCount: latestRun?.coverageDeltaCount ?? 0,
    promotionReadyCount: result.investigationStatus.promotion.readyCandidateCount,
    queuedForModificationCount: result.investigationStatus.promotion.queuedItemCount,
    needsOperatorAssist: result.investigationStatus.operatorAssist.assistRequired,
    nextProfile: result.investigationStatus.nextCaptureProfile,
    nextOperatorAction: result.investigationStatus.nextOperatorAction,
    investigationStatusPath: result.investigationStatus.eventStreamPath.replace("investigation-events.jsonl", "investigation-status.json")
  };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const profile = getScenarioProfile(parsed.profileId);
  const result = await runScenarioScan(parsed);
  console.log("PASS donor-scan:scenario");
  console.log(`Donor: ${result.donorId}`);
  console.log(`Profile: ${profile?.displayName ?? parsed.profileId}`);
  console.log(`Minutes: ${result.minutesRequested}`);
  console.log(`Runtime scan state: ${result.runtimeScanState}`);
  console.log(`Lifecycle lane: ${result.lifecycleLane}`);
  console.log(`Ready for reconstruction: ${result.readyForReconstructionCount}`);
  console.log(`Blocked scenarios: ${result.blockedScenarioCount}`);
  console.log(`Coverage delta: ${result.coverageDeltaCount}`);
  console.log(`Promotion ready: ${result.promotionReadyCount}`);
  console.log(`Queued for modification: ${result.queuedForModificationCount}`);
  console.log(`Needs operator assist: ${result.needsOperatorAssist ? "yes" : "no"}`);
  console.log(`Next profile: ${result.nextProfile ?? "none"}`);
  console.log(`Next action: ${result.nextOperatorAction}`);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL donor-scan:scenario - ${message}`);
    process.exitCode = 1;
  });
}
