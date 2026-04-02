import { refreshInvestigationArtifacts } from "./writeCoverageReport";
import { getScenarioProfile } from "./scenarioProfiles";

export interface RunScenarioScanResult {
  donorId: string;
  donorName: string;
  profileId: string;
  minutesRequested: number;
  runtimeScanState: string;
  lifecycleLane: string;
  readyForReconstructionCount: number;
  blockedScenarioCount: number;
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

export async function runScenarioScan(input: ParsedArgs): Promise<RunScenarioScanResult> {
  const startedAt = new Date().toISOString();
  const result = await refreshInvestigationArtifacts({
    donorId: input.donorId,
    donorName: input.donorName,
    profileRun: {
      profileId: input.profileId,
      minutesRequested: input.minutesRequested,
      startedAt,
      finishedAt: new Date().toISOString()
    }
  });

  return {
    donorId: input.donorId,
    donorName: input.donorName,
    profileId: input.profileId,
    minutesRequested: input.minutesRequested,
    runtimeScanState: result.investigationStatus.runtimeScanState,
    lifecycleLane: result.investigationStatus.lifecycleLane,
    readyForReconstructionCount: result.investigationStatus.readyForReconstructionCount,
    blockedScenarioCount: result.investigationStatus.blockedScenarioCount,
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
