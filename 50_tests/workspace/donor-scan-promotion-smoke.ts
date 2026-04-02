import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import { runPromotionQueue } from "../../tools/donor-scan/runPromotionQueue";
import { refreshInvestigationArtifacts } from "../../tools/donor-scan/writeCoverageReport";

const workspaceRoot = path.resolve(__dirname, "../../..");

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

async function seedInvestigationDonor(donorId: string): Promise<string> {
  const harvestRoot = path.join(workspaceRoot, "10_donors", donorId, "evidence", "local_only", "harvest");
  await fs.mkdir(harvestRoot, { recursive: true });

  await writeJson(path.join(harvestRoot, "scan-summary.json"), {
    schemaVersion: "0.1.0",
    donorId,
    donorName: "Promotion Smoke Donor",
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
    nextOperatorAction: "Run a bounded scenario profile and review blocked families.",
    blockerHighlights: ["Use investigation mode to separate ready vs blocked families."],
    rawPayloadBlockedFamilyNames: ["coin"]
  });
  await writeJson(path.join(harvestRoot, "runtime-candidates.json"), {
    donorId,
    donorName: "Promotion Smoke Donor",
    runtimeCandidateCount: 2
  });
  await writeJson(path.join(harvestRoot, "runtime-request-log.json"), {
    generatedAtUtc: new Date().toISOString(),
    entries: [
      {
        canonicalSourceUrl: "https://example.invalid/game/bundle.js",
        latestRequestUrl: "https://example.invalid/game/bundle.js",
        requestCategory: "runtime-script",
        hitCount: 1,
        lastStage: "spin",
        stageHitCounts: {
          launch: 1,
          enter: 1,
          spin: 3
        }
      }
    ]
  });
  await writeJson(path.join(harvestRoot, "capture-target-families.json"), {
    donorId,
    donorName: "Promotion Smoke Donor",
    familyCount: 3,
    families: [
      { familyName: "big_win", untriedTargetCount: 1, blockedTargetCount: 0 },
      { familyName: "coin", untriedTargetCount: 0, blockedTargetCount: 2 },
      { familyName: "start_page", untriedTargetCount: 1, blockedTargetCount: 0 }
    ]
  });
  await writeJson(path.join(harvestRoot, "capture-blocker-families.json"), {
    donorId,
    donorName: "Promotion Smoke Donor",
    familyCount: 1,
    families: [
      { familyName: "coin", blockerClass: "raw-payload-blocked" }
    ]
  });
  await writeJson(path.join(harvestRoot, "capture-family-source-profiles.json"), {
    donorId,
    donorName: "Promotion Smoke Donor",
    familyCount: 3,
    families: [
      { familyName: "big_win", localPageCount: 2, localSameFamilyBundleReferenceCount: 1, localSameFamilyVariantAssetCount: 1 },
      { familyName: "coin", localPageCount: 0, localSameFamilyBundleReferenceCount: 0, localSameFamilyVariantAssetCount: 0 },
      { familyName: "start_page", localPageCount: 1, localSameFamilyBundleReferenceCount: 0, localSameFamilyVariantAssetCount: 0 }
    ]
  });
  await writeJson(path.join(harvestRoot, "capture-family-actions.json"), {
    donorId,
    donorName: "Promotion Smoke Donor",
    actionCount: 3,
    families: [
      { familyName: "big_win", actionClass: "use-local-sources", localSourceAssetCount: 2, nextStep: "Prepare reconstruction." },
      { familyName: "coin", actionClass: "source-discovery-required", localSourceAssetCount: 0, nextStep: "Run a deeper scenario profile." },
      { familyName: "start_page", actionClass: "capture-family-sources", localSourceAssetCount: 1, nextStep: "Capture the intro family sources." }
    ]
  });
  await writeJson(path.join(harvestRoot, "family-reconstruction-profiles.json"), {
    donorId,
    donorName: "Promotion Smoke Donor",
    familyCount: 1,
    families: [
      {
        familyName: "big_win",
        profileState: "ready-for-spine-atlas-reconstruction",
        readiness: "ready-with-local-sources",
        exactLocalSourceCount: 2,
        bundlePath: "10_donors/example/family-reconstruction-bundles/big_win.json",
        nextStep: "Move into modification."
      }
    ]
  });
  await writeJson(path.join(harvestRoot, "family-reconstruction-sections.json"), {
    donorId,
    donorName: "Promotion Smoke Donor",
    sectionCount: 1,
    sections: [
      {
        familyName: "big_win",
        sectionKey: "big_win/BW",
        sectionState: "ready-for-skin-reconstruction",
        sectionBundlePath: "10_donors/example/family-reconstruction-section-bundles/big_win--BW.json",
        mappedAttachmentCount: 12,
        attachmentCount: 12,
        nextSectionStep: "Promote the BW section."
      }
    ]
  });

  return harvestRoot;
}

async function main(): Promise<void> {
  const donorId = `donor_smoke_promotion_${Date.now().toString(36)}`;
  const harvestRoot = await seedInvestigationDonor(donorId);

  const initial = await refreshInvestigationArtifacts({
    donorId,
    donorName: "Promotion Smoke Donor"
  });
  assert.ok(initial.investigationStatus.promotion.readyCandidateCount >= 1, "refresh should surface ready promotion candidates");

  const result = await runPromotionQueue({
    donorId,
    donorName: "Promotion Smoke Donor",
    scenarioIds: []
  });
  assert.ok(result.queueItemCount >= 1, "promotion should queue at least one modification item");

  const queue = JSON.parse(await fs.readFile(path.join(harvestRoot, "modification-queue.json"), "utf8")) as {
    itemCount?: number;
    items?: Array<{ status?: string }>;
  };
  assert.ok(typeof queue.itemCount === "number" && queue.itemCount >= 1, "modification queue should record queued items");
  assert.equal(queue.items?.[0]?.status, "queued-for-modification", "promoted items should be explicitly queued");

  const status = JSON.parse(await fs.readFile(path.join(harvestRoot, "investigation-status.json"), "utf8")) as {
    promotion?: { queuedItemCount?: number; promotionReadiness?: string };
  };
  assert.ok(typeof status.promotion?.queuedItemCount === "number" && status.promotion.queuedItemCount >= 1, "investigation status should surface queued item count");
  assert.ok(typeof status.promotion?.promotionReadiness === "string", "investigation status should surface promotion readiness");

  console.log("PASS donor-scan-promotion smoke");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL donor-scan-promotion smoke - ${message}`);
  process.exitCode = 1;
});
