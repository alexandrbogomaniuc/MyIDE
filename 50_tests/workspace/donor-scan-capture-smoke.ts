import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { bootstrapDonorIntake } from "../../30_app/workspace/donorIntake";
import { buildCaptureAttemptUrls, captureNextTargets } from "../../tools/donor-scan/captureNextTargets";
import { buildNextCaptureTargets } from "../../tools/donor-scan/buildNextCaptureTargets";

const workspaceRoot = path.resolve(__dirname, "../../..");

function startFixtureServer(): Promise<{ server: http.Server; port: number }> {
  const html = [
    "<!doctype html>",
    "<html>",
    "<head>",
    '  <meta charset="utf-8" />',
    '  <title>Capture Smoke Donor</title>',
    "</head>",
    "<body>",
    '  <script src="/bundle.js"></script>',
    "</body>",
    "</html>"
  ].join("\n");

  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      if (request.url === "/launch") {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(html);
        return;
      }
      if (request.url === "/bundle.js") {
        response.writeHead(200, { "content-type": "application/javascript; charset=utf-8" });
        response.end([
          "window.preloadLogo = '_resourcesPath_preloader-assets/logo.png';",
          "window.atlasUrl = '/atlases/ui.atlas';",
          "window.bundleMeta = {images:{\"ui/ui-card.png\":{e:\".png_80_80.webp\"}}};",
          "var at={resourcesPath:'http://" + (request.headers.host ?? "127.0.0.1") + "/'},s={images:window.bundleMeta.images};",
          "var yt=t=>t?at.resourcesPath+\"img/\"+t:null;at._textureNameToPath=yt,at.getImageMetadata=t=>s.images[t]||{};"
        ].join("\n"));
        return;
      }
      if (request.url === "/preloader-assets/logo.png") {
        response.writeHead(200, { "content-type": "image/png" });
        response.end(Buffer.from("89504e470d0a1a0a", "hex"));
        return;
      }
      if (request.url === "/atlases/ui.atlas") {
        response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        response.end([
          "ui.png",
          "ui_2.png",
          "ui_3.png",
          "size: 128,128",
          "format: RGBA8888",
          "filter: Linear,Linear",
          "repeat: none",
          "",
          "button_idle",
          "bounds: 0,0,64,64"
        ].join("\n"));
        return;
      }
      if (request.url === "/atlases/ui.png") {
        response.writeHead(200, { "content-type": "image/png" });
        response.end(Buffer.from("89504e470d0a1a0a", "hex"));
        return;
      }
      if (request.url === "/img/ui/ui-card.png_80_80.webp") {
        response.writeHead(200, { "content-type": "image/png" });
        response.end(Buffer.from("89504e470d0a1a0a", "hex"));
        return;
      }
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("not found");
    });

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to start donor-scan capture smoke fixture server."));
        return;
      }
      resolve({ server, port: address.port });
    });
  });
}

async function main(): Promise<void> {
  const donorId = `donor_smoke_capture_${Date.now().toString(36)}`;
  const donorRoot = path.join(workspaceRoot, "10_donors", donorId);
  const { server, port } = await startFixtureServer();

  try {
    const intake = await bootstrapDonorIntake({
      donorId,
      donorName: "Capture Smoke Donor",
      donorLaunchUrl: `http://127.0.0.1:${port}/launch`,
      overwrite: true
    });
    assert.equal(intake.scanStatus, "scanned", "capture smoke donor should be scanned during intake");
    assert.ok((intake.nextCaptureTargetCount ?? 0) >= 1, "capture smoke donor should surface at least one next capture target");

    const beforeSummaryPath = path.join(donorRoot, "evidence", "local_only", "harvest", "scan-summary.json");
    const beforeSummary = JSON.parse(await fs.readFile(beforeSummaryPath, "utf8")) as {
      nextCaptureTargetCount?: number;
      atlasMissingPageCount?: number;
    };
    assert.ok((beforeSummary.atlasMissingPageCount ?? 0) >= 3, "fixture should begin with multiple missing atlas pages");

    const beforeTargets = JSON.parse(await fs.readFile(path.join(donorRoot, "evidence", "local_only", "harvest", "next-capture-targets.json"), "utf8")) as {
      targets?: Array<{ relativePath?: string; rank?: number }>;
    };
    assert.ok(
      Array.isArray(beforeTargets.targets)
        && beforeTargets.targets.some((target) => target.relativePath?.includes("ui.png") && target.rank === 1),
      "ranked targets should preserve atlas page order so the base atlas page is attempted before suffixed variants"
    );

    const capture = await captureNextTargets({
      donorId,
      family: "ui",
      limit: 2
    });
    assert.equal(capture.status, "partial", "guided capture should resolve one target and leave one grounded blocker");
    assert.equal(capture.requestedFamily, "ui", "guided capture should record the requested family when family-focused capture is used");
    assert.equal(capture.familyTargetCountBefore, 3, "guided capture should report how many ranked targets matched the requested family before the run");
    assert.ok(capture.downloadedCount >= 1, "guided capture should fetch the atlas page image");
    assert.ok(capture.failedCount >= 1, "guided capture should preserve one blocked target");

    const captureRunPath = path.join(donorRoot, "evidence", "local_only", "harvest", "next-capture-run.json");
    const captureRun = JSON.parse(await fs.readFile(captureRunPath, "utf8")) as {
      status?: string;
      downloadedCount?: number;
      failedCount?: number;
      requestedFamily?: string | null;
      familyTargetCountBefore?: number | null;
      targetCountBefore?: number;
      targetCountAfter?: number;
      results?: Array<{ relativePath?: string; status?: string; attemptedUrls?: string[]; downloadedFromUrl?: string | null }>;
    };
    assert.ok(["captured", "partial"].includes(captureRun.status ?? ""), "capture summary should record a successful or partial run");
    assert.equal(captureRun.requestedFamily, "ui", "capture summary should record the requested family");
    assert.equal(captureRun.familyTargetCountBefore, 3, "capture summary should record how many ranked targets matched the requested family before the run");
    assert.ok((captureRun.downloadedCount ?? 0) >= 1, "capture summary should record the atlas page download");
    assert.ok((captureRun.failedCount ?? 0) >= 1, "capture summary should record the still-missing atlas page");
    assert.ok(
      Array.isArray(captureRun.results) && captureRun.results.some((entry) => entry.relativePath?.includes("ui.png") && entry.status === "downloaded"),
      "capture summary should record the downloaded atlas page image"
    );
    assert.ok((captureRun.targetCountAfter ?? 0) < (captureRun.targetCountBefore ?? 999999), "capture run should reduce the pending target count");

    const atlasManifestPath = path.join(donorRoot, "evidence", "local_only", "harvest", "atlas-manifests.json");
    const atlasManifest = JSON.parse(await fs.readFile(atlasManifestPath, "utf8")) as {
      missingPageCount?: number;
    };
    assert.equal(atlasManifest.missingPageCount, 2, "atlas page capture should leave one retried blocker and one untried atlas page unresolved in the refreshed scan");

    const refreshedTargets = JSON.parse(await fs.readFile(path.join(donorRoot, "evidence", "local_only", "harvest", "next-capture-targets.json"), "utf8")) as {
      targets?: Array<{ relativePath?: string; recentCaptureStatus?: string; recentCaptureAttemptCount?: number; recentCaptureFailureReason?: string | null; rank?: number; blockerClass?: string | null }>;
    };
    const refreshedTargetList = Array.isArray(refreshedTargets.targets) ? refreshedTargets.targets : [];
    const blockedTarget = refreshedTargetList.find((target) => target.relativePath?.includes("ui_2.png"));
    const promotedUntriedTarget = refreshedTargetList.find((target) => target.relativePath?.includes("ui_3.png"));
    assert.ok(
      blockedTarget
        && blockedTarget.recentCaptureStatus === "blocked"
        && (blockedTarget.recentCaptureAttemptCount ?? 0) >= 1
        && typeof blockedTarget.recentCaptureFailureReason === "string"
        && blockedTarget.recentCaptureFailureReason.includes("404")
        && blockedTarget.blockerClass === "raw-payload-blocked",
      "refreshed next capture targets should mark the remaining atlas page as recently blocked and raw-payload-blocked after guided capture"
    );
    assert.ok(
      promotedUntriedTarget
        && promotedUntriedTarget.recentCaptureStatus === "untried"
        && typeof promotedUntriedTarget.rank === "number"
        && typeof blockedTarget?.rank === "number"
        && promotedUntriedTarget.rank < blockedTarget.rank,
      "refreshed next capture targets should promote the next untried grounded target above the recently blocked dead end"
    );

    const refreshedSummary = JSON.parse(await fs.readFile(beforeSummaryPath, "utf8")) as {
      recentlyBlockedCaptureTargetCount?: number;
      captureFamilyCount?: number;
      topCaptureFamilyNames?: string[];
      rawPayloadBlockedCaptureTargetCount?: number;
      rawPayloadBlockedFamilyCount?: number;
      rawPayloadBlockedFamilyNames?: string[];
    };
    assert.ok((refreshedSummary.recentlyBlockedCaptureTargetCount ?? 0) >= 1, "scan summary should surface recently blocked capture targets after a partial run");
    assert.ok((refreshedSummary.captureFamilyCount ?? 0) >= 1, "scan summary should surface capture family counts after a partial run");
    assert.ok(Array.isArray(refreshedSummary.topCaptureFamilyNames), "scan summary should surface top capture family names after a partial run");
    assert.ok((refreshedSummary.rawPayloadBlockedCaptureTargetCount ?? 0) >= 1, "scan summary should surface raw-payload-blocked capture targets after a raw-root-only dead end");
    assert.ok((refreshedSummary.rawPayloadBlockedFamilyCount ?? 0) >= 1, "scan summary should surface raw-payload-blocked family counts after a raw-root-only dead end");
    assert.ok(Array.isArray(refreshedSummary.rawPayloadBlockedFamilyNames), "scan summary should surface raw-payload-blocked family names");

    const familySourceCapture = await captureNextTargets({
      donorId,
      family: "ui",
      limit: 1,
      mode: "family-sources"
    });
    assert.ok(["captured", "partial"].includes(familySourceCapture.status), "family source capture should run successfully for a grounded bundle-related source");
    assert.equal(familySourceCapture.requestedMode, "family-sources", "family source capture should record the requested mode");
    assert.equal(familySourceCapture.requestedFamily, "ui", "family source capture should record the requested family");
    assert.ok((familySourceCapture.familySourceCandidateCountBefore ?? 0) >= 1, "family source capture should report grounded family source candidates");
    assert.ok(familySourceCapture.downloadedCount >= 1, "family source capture should download at least one grounded family source asset");

    const familySourceRun = JSON.parse(await fs.readFile(captureRunPath, "utf8")) as {
      requestedMode?: string;
      requestedFamily?: string | null;
      familySourceCandidateCountBefore?: number | null;
      results?: Array<{ downloadedFromUrl?: string | null; status?: string }>;
    };
    assert.equal(familySourceRun.requestedMode, "family-sources", "capture summary should record family-sources mode");
    assert.equal(familySourceRun.requestedFamily, "ui", "capture summary should keep the family in family-sources mode");
    assert.ok((familySourceRun.familySourceCandidateCountBefore ?? 0) >= 1, "capture summary should record grounded family source candidate counts");
    assert.ok(
      Array.isArray(familySourceRun.results)
        && familySourceRun.results.some((entry) => entry.status === "downloaded" && typeof entry.downloadedFromUrl === "string" && entry.downloadedFromUrl.includes("/img/ui/ui-card.png_80_80.webp")),
      "family source capture should download grounded variant-backed family evidence outside the flat ranked queue"
    );

    const expandedTargetQueue = buildNextCaptureTargets({
      donorId: "donor_expanded_queue_smoke",
      donorName: "Expanded Queue Smoke",
      runtimeCandidates: {
        schemaVersion: "0.1.0",
        donorId: "donor_expanded_queue_smoke",
        donorName: "Expanded Queue Smoke",
        generatedAt: new Date().toISOString(),
        fullLocalRuntimePackage: false,
        partialLocalRuntimePackage: true,
        mirrorCandidateStatus: "strong-partial",
        entryPointCount: 1,
        runtimeCandidateCount: 0,
        mirrorCandidateCount: 0,
        unresolvedDependencyCount: 1,
        hostRoots: ["https://fixture.example.test/"],
        runtimeEntryPoints: [],
        runtimeCandidates: [],
        unresolvedDependencies: []
      },
      bundleAssetMap: {
        schemaVersion: "0.1.0",
        donorId: "donor_expanded_queue_smoke",
        donorName: "Expanded Queue Smoke",
        generatedAt: new Date().toISOString(),
        status: "mapped",
        bundleCount: 1,
        referenceCount: 1,
        countsByCategory: { image: 1 },
        countsByConfidence: { confirmed: 1, likely: 0, provisional: 0 },
        imageVariantStatus: "mapped",
        imageVariantEntryCount: 1,
        imageVariantSuffixCount: 2,
        imageVariantUrlBuilderStatus: "mapped",
        imageVariantUrlCount: 2,
        imageVariantFieldCounts: { e: 1, f_e: 1 },
        translationPayloadStatus: "skipped",
        translationPayloadCount: 0,
        translationLocaleHintCount: 0,
        bundles: [
          {
            sourceUrl: "https://fixture.example.test/bundle.js",
            localPath: "10_donors/donor_expanded_queue_smoke/raw/bootstrap/bundle.js",
            referenceCount: 1
          }
        ],
        references: [
          {
            bundleSourceUrl: "https://fixture.example.test/bundle.js",
            bundleLocalPath: "10_donors/donor_expanded_queue_smoke/raw/bootstrap/bundle.js",
            referenceText: "symbols/spin_3.png",
            resolvedUrl: "https://fixture.example.test/symbols/spin_3.png",
            category: "image",
            confidence: "confirmed",
            localStatus: "inventory-only",
            localPath: null
          }
        ],
        imageVariants: [
          {
            bundleSourceUrl: "https://fixture.example.test/bundle.js",
            bundleLocalPath: "10_donors/donor_expanded_queue_smoke/raw/bootstrap/bundle.js",
            logicalPath: "symbols/spin_3.png",
            resolvedUrl: "https://fixture.example.test/symbols/spin_3.png",
            requestBaseUrl: "https://fixture.example.test/img/symbols/spin_3.png",
            confidence: "confirmed",
            localStatus: "inventory-only",
            localPath: null,
            variantKeys: ["e", "f_e"],
            variants: {
              e: ".png_80_80.webp",
              f_e: ".f.png_80_90.png"
            },
            variantUrls: [
              {
                key: "e",
                url: "https://fixture.example.test/img/symbols/spin_3.png_80_80.webp",
                note: "Primary optimized request URL proven by the bundle images table."
              },
              {
                key: "f_e",
                url: "https://fixture.example.test/img/symbols/spin_3.f.png_80_90.png",
                note: "Fallback optimized request URL proven by the bundle images table."
              }
            ],
            variantCount: 2,
            note: "Smoke proof"
          }
        ],
        translationPayloads: []
      },
      atlasManifestFile: {
        schemaVersion: "0.1.0",
        donorId: "donor_expanded_queue_smoke",
        donorName: "Expanded Queue Smoke",
        generatedAt: new Date().toISOString(),
        atlasTextCount: 1,
        spriteSheetJsonCount: 0,
        plistCount: 0,
        spineJsonCount: 0,
        frameManifestCount: 1,
        missingPageCount: 1,
        manifests: [
          {
            sourceUrl: "https://fixture.example.test/img/spines/spin_3.atlas",
            localPath: "10_donors/donor_expanded_queue_smoke/raw/bootstrap/spin_3.atlas",
            kind: "atlas-text",
            frameCount: 1,
            regionCount: 1,
            animationCount: null,
            pageRefs: ["spin_3.png"],
            localPagePaths: [],
            missingPageUrls: ["https://fixture.example.test/img/spines/spin_3.png"],
            notes: []
          }
        ]
      },
      requestBackedStaticHints: null,
      captureRun: {
        schemaVersion: "0.1.0",
        donorId: "donor_expanded_queue_smoke",
        donorName: "Expanded Queue Smoke",
        generatedAt: new Date().toISOString(),
        status: "blocked",
        requestedMode: "ranked-targets",
        requestedLimit: 1,
        requestedFamily: null,
        familyTargetCountBefore: null,
        familySourceCandidateCountBefore: null,
        attemptedCount: 1,
        downloadedCount: 0,
        failedCount: 1,
        skippedCount: 0,
        targetCountBefore: 1,
        targetCountAfter: 1,
        refreshedScanSummaryPath: "10_donors/donor_expanded_queue_smoke/evidence/local_only/harvest/scan-summary.json",
        refreshedNextCaptureTargetsPath: "10_donors/donor_expanded_queue_smoke/evidence/local_only/harvest/next-capture-targets.json",
        results: [
          {
            rank: 1,
            url: "https://fixture.example.test/img/spines/spin_3.png",
            relativePath: "img/spines/spin_3.png",
            kind: "atlas-page",
            priority: "immediate",
            status: "failed",
            attemptedUrls: [
              "https://fixture.example.test/img/spines/spin_3.png",
              "https://fixture.example.test/spines/spin_3.png",
              "https://fixture.example.test/symbols/spin_3.png"
            ],
            downloadedFromUrl: null,
            localPath: null,
            contentType: null,
            sizeBytes: null,
            reason: "HTTP 404"
          }
        ]
      }
    });
    const expandedTarget = expandedTargetQueue.targets.find((target) => target.relativePath.includes("img/spines/spin_3.png"));
    assert.ok(
      expandedTarget
        && expandedTarget.recentCaptureStatus === "untried"
        && expandedTarget.alternateCaptureHints.some((hint) => hint.url.includes("/img/symbols/spin_3.png_80_80.webp"))
        && expandedTarget.alternateCaptureHints.some((hint) => hint.url.includes("/img/symbols/spin_3.f.png_80_90.png")),
      "new grounded variant URLs should re-open a previously blocked atlas-page target instead of leaving it stuck as blocked"
    );
    assert.ok(expandedTarget, "expanded queue smoke should keep the spin_3 atlas page target");
    const orderedAttempts = buildCaptureAttemptUrls(expandedTarget!, {
      schemaVersion: "0.1.0",
      donorId: "donor_expanded_queue_smoke",
      donorName: "Expanded Queue Smoke",
      generatedAt: new Date().toISOString(),
      status: "mapped",
      bundleCount: 1,
      referenceCount: 1,
      countsByCategory: { image: 1 },
      countsByConfidence: { confirmed: 1, likely: 0, provisional: 0 },
      imageVariantStatus: "mapped",
      imageVariantEntryCount: 1,
      imageVariantSuffixCount: 2,
      imageVariantUrlBuilderStatus: "mapped",
      imageVariantUrlCount: 2,
      imageVariantFieldCounts: { e: 1, f_e: 1 },
      translationPayloadStatus: "skipped",
      translationPayloadCount: 0,
      translationLocaleHintCount: 0,
      bundles: [
        {
          sourceUrl: "https://fixture.example.test/bundle.js",
          localPath: "10_donors/donor_expanded_queue_smoke/raw/bootstrap/bundle.js",
          referenceCount: 1
        }
      ],
      references: [
        {
          bundleSourceUrl: "https://fixture.example.test/bundle.js",
          bundleLocalPath: "10_donors/donor_expanded_queue_smoke/raw/bootstrap/bundle.js",
          referenceText: "symbols/spin_3.png",
          resolvedUrl: "https://fixture.example.test/symbols/spin_3.png",
          category: "image",
          confidence: "confirmed",
          localStatus: "inventory-only",
          localPath: null
        }
      ],
      imageVariants: [
        {
          bundleSourceUrl: "https://fixture.example.test/bundle.js",
          bundleLocalPath: "10_donors/donor_expanded_queue_smoke/raw/bootstrap/bundle.js",
          logicalPath: "symbols/spin_3.png",
          resolvedUrl: "https://fixture.example.test/symbols/spin_3.png",
          requestBaseUrl: "https://fixture.example.test/img/symbols/spin_3.png",
          confidence: "confirmed",
          localStatus: "inventory-only",
          localPath: null,
          variantKeys: ["e", "f_e"],
          variants: {
            e: ".png_80_80.webp",
            f_e: ".f.png_80_90.png"
          },
          variantUrls: [
            {
              key: "e",
              url: "https://fixture.example.test/img/symbols/spin_3.png_80_80.webp",
              note: "Primary optimized request URL proven by the bundle images table."
            },
            {
              key: "f_e",
              url: "https://fixture.example.test/img/symbols/spin_3.f.png_80_90.png",
              note: "Fallback optimized request URL proven by the bundle images table."
            }
          ],
          variantCount: 2,
          note: "Smoke proof"
        }
      ],
      translationPayloads: []
    });
    assert.equal(
      orderedAttempts[0],
      "https://fixture.example.test/img/symbols/spin_3.png_80_80.webp",
      "guided capture should try grounded optimized variant URLs before the raw atlas-page URL when stronger bundle-image-variant hints exist"
    );
    assert.equal(
      orderedAttempts[1],
      "https://fixture.example.test/img/symbols/spin_3.f.png_80_90.png",
      "guided capture should keep the stronger bundle-image-variant fallbacks ahead of weaker raw-root aliases"
    );

    console.log("PASS smoke:donor-scan-capture");
    console.log(`Donor: ${donorId}`);
    console.log(`Downloaded: ${capture.downloadedCount}`);
    console.log(`Remaining targets: ${capture.targetCountAfter}`);
  } finally {
    await fs.rm(donorRoot, { recursive: true, force: true });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:donor-scan-capture - ${message}`);
  process.exitCode = 1;
});
