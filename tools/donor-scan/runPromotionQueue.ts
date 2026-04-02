import { applyPromotionCandidates, type ModificationQueueFile, type ReadyPromotionFile } from "../../30_app/investigation/promotionQueue";
import { buildDonorScanPaths, readOptionalJsonFile, writeJsonFile } from "./shared";
import { writeInvestigationEventStream } from "./writeEventStream";
import { refreshInvestigationArtifacts } from "./writeCoverageReport";

interface ParsedArgs {
  donorId: string;
  donorName: string;
  scenarioIds: string[];
}

export interface RunPromotionQueueResult {
  donorId: string;
  donorName: string;
  promotedCount: number;
  queueItemCount: number;
  queuedFamilyCount: number;
  queuedSectionCount: number;
  modificationQueuePath: string;
  readyCandidatesPath: string;
  nextOperatorAction: string;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  let donorId = "";
  let donorName = "";
  const scenarioIds: string[] = [];

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
    if (token === "--scenario" && next) {
      scenarioIds.push(next);
      index += 1;
    }
  }

  if (!donorId) {
    throw new Error("Missing required --donor-id argument.");
  }

  return {
    donorId,
    donorName: donorName || donorId,
    scenarioIds
  };
}

export async function runPromotionQueue(input: ParsedArgs): Promise<RunPromotionQueueResult> {
  const initial = await refreshInvestigationArtifacts({
    donorId: input.donorId,
    donorName: input.donorName
  });
  const paths = buildDonorScanPaths(input.donorId);
  const readyFile = await readOptionalJsonFile<ReadyPromotionFile>(paths.reconstructionReadyFamiliesPath);
  if (!readyFile || readyFile.readyCandidateCount === 0) {
    throw new Error(`No reconstruction-ready families or sections are available to promote for ${input.donorId}.`);
  }

  const existingQueue = await readOptionalJsonFile<ModificationQueueFile>(paths.modificationQueuePath);
  const nextQueue = applyPromotionCandidates(readyFile, existingQueue, {
    requestedScenarioIds: input.scenarioIds
  });
  await writeJsonFile(paths.modificationQueuePath, nextQueue);
  await writeInvestigationEventStream(paths.investigationEventsPath, [
    {
      timestamp: nextQueue.generatedAt,
      type: "investigation.modification.promoted",
      donorId: input.donorId,
      summary: `Queued ${nextQueue.itemCount} family or section handoff item${nextQueue.itemCount === 1 ? "" : "s"} for Modification.`,
      details: {
        queuedFamilyCount: nextQueue.queuedFamilyCount,
        queuedSectionCount: nextQueue.queuedSectionCount,
        requestedScenarioIds: input.scenarioIds
      }
    }
  ]);
  const refreshed = await refreshInvestigationArtifacts({
    donorId: input.donorId,
    donorName: input.donorName
  });

  return {
    donorId: input.donorId,
    donorName: input.donorName,
    promotedCount: nextQueue.itemCount - (existingQueue?.itemCount ?? 0),
    queueItemCount: nextQueue.itemCount,
    queuedFamilyCount: nextQueue.queuedFamilyCount,
    queuedSectionCount: nextQueue.queuedSectionCount,
    modificationQueuePath: refreshed.investigationStatus.promotion.modificationQueuePath ?? "",
    readyCandidatesPath: refreshed.investigationStatus.promotion.readyCandidatesPath ?? "",
    nextOperatorAction: refreshed.investigationStatus.nextOperatorAction
  };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const result = await runPromotionQueue(parsed);
  console.log("PASS donor-scan:promote");
  console.log(`Donor: ${result.donorId}`);
  console.log(`Promoted this run: ${result.promotedCount}`);
  console.log(`Queue item count: ${result.queueItemCount}`);
  console.log(`Queued families: ${result.queuedFamilyCount}`);
  console.log(`Queued sections: ${result.queuedSectionCount}`);
  console.log(`Queue path: ${result.modificationQueuePath}`);
  console.log(`Ready candidates path: ${result.readyCandidatesPath}`);
  console.log(`Next action: ${result.nextOperatorAction}`);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL donor-scan:promote - ${message}`);
    process.exitCode = 1;
  });
}
