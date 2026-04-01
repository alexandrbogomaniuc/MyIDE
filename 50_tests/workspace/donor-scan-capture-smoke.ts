import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { bootstrapDonorIntake } from "../../30_app/workspace/donorIntake";
import { captureNextTargets } from "../../tools/donor-scan/captureNextTargets";

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
        response.end("window.preloadLogo = '_resourcesPath_preloader-assets/logo.png'; window.atlasUrl = '/atlases/ui.atlas';");
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
          "ui_missing.png",
          "ui_later.png",
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
      limit: 2
    });
    assert.equal(capture.status, "partial", "guided capture should resolve one target and leave one grounded blocker");
    assert.ok(capture.downloadedCount >= 1, "guided capture should fetch the atlas page image");
    assert.ok(capture.failedCount >= 1, "guided capture should preserve one blocked target");

    const captureRunPath = path.join(donorRoot, "evidence", "local_only", "harvest", "next-capture-run.json");
    const captureRun = JSON.parse(await fs.readFile(captureRunPath, "utf8")) as {
      status?: string;
      downloadedCount?: number;
      failedCount?: number;
      targetCountBefore?: number;
      targetCountAfter?: number;
      results?: Array<{ relativePath?: string; status?: string; attemptedUrls?: string[]; downloadedFromUrl?: string | null }>;
    };
    assert.ok(["captured", "partial"].includes(captureRun.status ?? ""), "capture summary should record a successful or partial run");
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
      targets?: Array<{ relativePath?: string; recentCaptureStatus?: string; recentCaptureAttemptCount?: number; recentCaptureFailureReason?: string | null; rank?: number }>;
    };
    const refreshedTargetList = Array.isArray(refreshedTargets.targets) ? refreshedTargets.targets : [];
    const blockedTarget = refreshedTargetList.find((target) => target.relativePath?.includes("ui_missing.png"));
    const promotedUntriedTarget = refreshedTargetList.find((target) => target.relativePath?.includes("ui_later.png"));
    assert.ok(
      blockedTarget
        && blockedTarget.recentCaptureStatus === "blocked"
        && (blockedTarget.recentCaptureAttemptCount ?? 0) >= 1
        && typeof blockedTarget.recentCaptureFailureReason === "string"
        && blockedTarget.recentCaptureFailureReason.includes("404"),
      "refreshed next capture targets should mark the remaining atlas page as recently blocked after guided capture"
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
    };
    assert.ok((refreshedSummary.recentlyBlockedCaptureTargetCount ?? 0) >= 1, "scan summary should surface recently blocked capture targets after a partial run");

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
