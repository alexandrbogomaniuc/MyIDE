import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { bootstrapDonorIntake } from "../../30_app/workspace/donorIntake";
import { runFamilyAction } from "../../tools/donor-scan/runFamilyAction";

const workspaceRoot = path.resolve(__dirname, "../../..");

function startFixtureServer(): Promise<{ server: http.Server; port: number }> {
  const html = [
    "<!doctype html>",
    "<html>",
    "<head>",
    '  <meta charset="utf-8" />',
    '  <title>Family Action Smoke Donor</title>',
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
        reject(new Error("Failed to start donor-scan family action smoke fixture server."));
        return;
      }
      resolve({ server, port: address.port });
    });
  });
}

async function main(): Promise<void> {
  const donorId = `donor_smoke_family_action_${Date.now().toString(36)}`;
  const donorRoot = path.join(workspaceRoot, "10_donors", donorId);
  const { server, port } = await startFixtureServer();

  try {
    await bootstrapDonorIntake({
      donorId,
      donorName: "Family Action Smoke Donor",
      donorLaunchUrl: `http://127.0.0.1:${port}/launch`,
      overwrite: true
    });

    const captureAction = await runFamilyAction({
      donorId,
      family: "ui",
      limit: 1
    });
    assert.equal(captureAction.familyName, "ui", "family action should preserve the requested family");
    assert.equal(captureAction.actionClass, "capture-family-sources", "first family action should capture grounded family sources");
    assert.equal(captureAction.requestedMode, "family-sources", "capture family action should reuse family-sources mode");
    assert.ok(["captured", "partial"].includes(captureAction.status), "capture family action should succeed");
    assert.ok(captureAction.downloadedCount >= 1, "capture family action should download at least one local source asset");
    assert.ok(captureAction.captureRunPath, "capture family action should point at the guided capture summary");

    const preparedAction = await runFamilyAction({
      donorId,
      family: "ui",
      limit: 1
    });
    assert.equal(preparedAction.familyName, "ui", "prepared family action should preserve the family");
    assert.equal(preparedAction.actionClass, "use-local-sources", "second family action should switch to use-local-sources once local assets exist");
    assert.equal(preparedAction.requestedMode, "prepare-workset", "prepared family action should write a workset instead of capturing");
    assert.equal(preparedAction.status, "prepared", "prepared family action should report prepared status");
    assert.ok(preparedAction.preparedEvidenceCount >= 1, "prepared family action should collect grounded evidence items");
    assert.ok(preparedAction.worksetPath, "prepared family action should point at the generated workset");

    const familyActionRunPath = path.join(donorRoot, "evidence", "local_only", "harvest", "family-action-run.json");
    const familyActionRun = JSON.parse(await fs.readFile(familyActionRunPath, "utf8")) as {
      status?: string;
      requestedMode?: string;
      familyName?: string;
      worksetPath?: string | null;
      preparedEvidenceCount?: number;
    };
    assert.equal(familyActionRun.status, "prepared", "family action run should record the latest prepared workset");
    assert.equal(familyActionRun.requestedMode, "prepare-workset", "family action run should record prepare-workset mode");
    assert.equal(familyActionRun.familyName, "ui", "family action run should record the family");
    assert.ok(typeof familyActionRun.worksetPath === "string" && familyActionRun.worksetPath.length > 0, "family action run should point at the prepared workset");
    assert.ok((familyActionRun.preparedEvidenceCount ?? 0) >= 1, "family action run should record prepared evidence counts");

    const worksetPath = path.join(workspaceRoot, familyActionRun.worksetPath ?? "");
    const workset = JSON.parse(await fs.readFile(worksetPath, "utf8")) as {
      familyName?: string;
      actionClass?: string;
      localSourceAssetPreview?: string[];
      preparedEvidenceCount?: number;
    };
    assert.equal(workset.familyName, "ui", "family workset should record the family");
    assert.equal(workset.actionClass, "use-local-sources", "family workset should reflect the prepared action class");
    assert.ok(Array.isArray(workset.localSourceAssetPreview) && workset.localSourceAssetPreview.length >= 1, "family workset should include local source previews");
    assert.ok((workset.preparedEvidenceCount ?? 0) >= 1, "family workset should include prepared evidence counts");

    console.log("PASS donor-scan:family-action");
    console.log(`Donor: ${donorId}`);
    console.log(`Prepared workset: ${familyActionRun.worksetPath}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await fs.rm(donorRoot, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL donor-scan:family-action - ${message}`);
  process.exitCode = 1;
});
