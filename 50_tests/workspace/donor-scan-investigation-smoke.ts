import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import { runScenarioScan } from "../../tools/donor-scan/runScenarioScan";
import { refreshInvestigationArtifacts } from "../../tools/donor-scan/writeCoverageReport";

const workspaceRoot = path.resolve(__dirname, "../../..");

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

async function main(): Promise<void> {
  const donorId = `donor_smoke_investigation_${Date.now().toString(36)}`;
  const harvestRoot = path.join(workspaceRoot, "10_donors", donorId, "evidence", "local_only", "harvest");
  await fs.mkdir(harvestRoot, { recursive: true });

  await writeJson(path.join(harvestRoot, "scan-summary.json"), {
    schemaVersion: "0.1.0",
    donorId,
    donorName: "Investigation Smoke Donor",
    generatedAt: new Date().toISOString(),
    scanState: "scanned",
    runtimeCandidateCount: 2,
    atlasManifestCount: 1,
    bundleAssetMapStatus: "mapped",
    bundleImageVariantStatus: "mapped",
    bundleImageVariantCount: 4,
    bundleImageVariantSuffixCount: 6,
    bundleImageVariantUrlBuilderStatus: "mapped",
    bundleImageVariantUrlCount: 4,
    translationPayloadStatus: "mapped",
    translationPayloadCount: 1,
    mirrorCandidateStatus: "strong-partial",
    fullLocalRuntimePackage: false,
    partialLocalRuntimePackage: true,
    nextOperatorAction: "Run a bounded scenario profile and review blocked families.",
    blockerHighlights: ["Use investigation mode to separate ready vs blocked families."],
    rawPayloadBlockedFamilyNames: ["coin"]
  });
  await writeJson(path.join(harvestRoot, "runtime-candidates.json"), {
    donorId,
    donorName: "Investigation Smoke Donor",
    runtimeCandidateCount: 2
  });
  await writeJson(path.join(harvestRoot, "runtime-request-log.json"), {
    generatedAtUtc: new Date().toISOString(),
    entries: [
      {
        canonicalSourceUrl: "https://example.invalid/game/bundle.js",
        latestRequestUrl: "https://example.invalid/game/bundle.js",
        requestCategory: "runtime-script",
        hitCount: 1
      }
    ]
  });
  await writeJson(path.join(harvestRoot, "capture-target-families.json"), {
    donorId,
    donorName: "Investigation Smoke Donor",
    familyCount: 3,
    families: [
      { familyName: "big_win", untriedTargetCount: 1, blockedTargetCount: 0 },
      { familyName: "coin", untriedTargetCount: 0, blockedTargetCount: 2 },
      { familyName: "start_page", untriedTargetCount: 1, blockedTargetCount: 0 }
    ]
  });
  await writeJson(path.join(harvestRoot, "capture-blocker-families.json"), {
    donorId,
    donorName: "Investigation Smoke Donor",
    familyCount: 1,
    families: [
      { familyName: "coin", blockerClass: "raw-payload-blocked" }
    ]
  });
  await writeJson(path.join(harvestRoot, "capture-family-source-profiles.json"), {
    donorId,
    donorName: "Investigation Smoke Donor",
    familyCount: 3,
    families: [
      { familyName: "big_win", localPageCount: 2, localSameFamilyBundleReferenceCount: 1, localSameFamilyVariantAssetCount: 1 },
      { familyName: "coin", localPageCount: 0, localSameFamilyBundleReferenceCount: 0, localSameFamilyVariantAssetCount: 0 },
      { familyName: "start_page", localPageCount: 1, localSameFamilyBundleReferenceCount: 0, localSameFamilyVariantAssetCount: 0 }
    ]
  });
  await writeJson(path.join(harvestRoot, "capture-family-actions.json"), {
    donorId,
    donorName: "Investigation Smoke Donor",
    actionCount: 3,
    families: [
      { familyName: "big_win", actionClass: "use-local-sources", localSourceAssetCount: 2, nextStep: "Prepare reconstruction." },
      { familyName: "coin", actionClass: "source-discovery-required", localSourceAssetCount: 0, nextStep: "Run a deeper scenario profile." },
      { familyName: "start_page", actionClass: "capture-family-sources", localSourceAssetCount: 1, nextStep: "Capture the intro family sources." }
    ]
  });
  await writeJson(path.join(harvestRoot, "family-reconstruction-profiles.json"), {
    donorId,
    donorName: "Investigation Smoke Donor",
    familyCount: 1,
    families: [
      { familyName: "big_win", readiness: "ready-for-spine-atlas-reconstruction", exactLocalSourceCount: 2, relatedLocalSourceCount: 1 }
    ]
  });
  await writeJson(path.join(harvestRoot, "family-reconstruction-sections.json"), {
    donorId,
    donorName: "Investigation Smoke Donor",
    sectionCount: 1,
    sections: [
      { familyName: "big_win", sectionKey: "big_win/BW", mappedAttachmentCount: 12, attachmentCount: 12 }
    ]
  });

  const initial = await refreshInvestigationArtifacts({
    donorId,
    donorName: "Investigation Smoke Donor"
  });
  assert.equal(initial.investigationStatus.currentStage, "investigation", "static refresh should produce investigation status");
  assert.ok(initial.investigationStatus.blockedScenarioCount >= 1, "static refresh should preserve blocked scenarios");
  assert.ok(initial.investigationStatus.readyForReconstructionCount >= 1, "static refresh should preserve ready scenarios");

  const scenarioRun = await runScenarioScan({
    donorId,
    donorName: "Investigation Smoke Donor",
    profileId: "default-bet",
    minutesRequested: 5
  });
  assert.equal(scenarioRun.profileId, "default-bet", "scenario run should preserve the requested profile");
  assert.ok(scenarioRun.readyForReconstructionCount >= 1, "scenario run should preserve reconstruction-ready scenarios");

  const coverage = JSON.parse(await fs.readFile(path.join(harvestRoot, "scenario-coverage.json"), "utf8")) as {
    scenarios?: Array<{ scenarioId?: string; state?: string; observedInRuntime?: boolean }>;
  };
  const intro = coverage.scenarios?.find((entry) => entry.scenarioId === "intro_start_resume");
  assert.equal(intro?.observedInRuntime, true, "default-bet should conservatively observe the intro/start scenario");
  assert.notEqual(intro?.state, "not-discovered", "the intro/start scenario should no longer be undiscovered after the profile run");

  const status = JSON.parse(await fs.readFile(path.join(harvestRoot, "investigation-status.json"), "utf8")) as {
    lifecycleLane?: string;
    nextCaptureProfile?: string | null;
    stageHandoff?: { modificationReadiness?: string };
  };
  assert.ok(typeof status.lifecycleLane === "string", "investigation status should record the lifecycle lane");
  assert.ok(typeof status.stageHandoff?.modificationReadiness === "string", "investigation status should record stage handoff readiness");
  assert.ok("nextCaptureProfile" in status, "investigation status should record the next profile recommendation");

  const eventsText = await fs.readFile(path.join(harvestRoot, "investigation-events.jsonl"), "utf8");
  assert.ok(eventsText.includes("investigation.profile.completed"), "event stream should include a profile completion event");

  console.log("PASS donor-scan-investigation smoke");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL donor-scan-investigation smoke - ${message}`);
  process.exitCode = 1;
});
