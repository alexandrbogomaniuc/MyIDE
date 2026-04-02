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
    assert.equal(preparedAction.requestedMode, "prepare-reconstruction-bundle", "use-local-sources family action should write a reconstruction-ready bundle");
    assert.equal(preparedAction.status, "prepared", "prepared family action should report prepared status");
    assert.ok(preparedAction.preparedEvidenceCount >= 1, "prepared family action should collect grounded evidence items");
    assert.ok(preparedAction.worksetPath, "prepared family action should point at the generated workset");
    assert.ok(preparedAction.reconstructionBundlePath, "prepared family action should point at the generated reconstruction bundle");
    assert.ok(preparedAction.reconstructionLocalSourceCount >= 1, "prepared family action should record grounded local source counts");

    const familyActionRunPath = path.join(donorRoot, "evidence", "local_only", "harvest", "family-action-run.json");
    const familyActionRun = JSON.parse(await fs.readFile(familyActionRunPath, "utf8")) as {
      status?: string;
      requestedMode?: string;
      familyName?: string;
      worksetPath?: string | null;
      reconstructionBundlePath?: string | null;
      preparedEvidenceCount?: number;
      reconstructionLocalSourceCount?: number;
    };
    assert.equal(familyActionRun.status, "prepared", "family action run should record the latest prepared workset");
    assert.equal(familyActionRun.requestedMode, "prepare-reconstruction-bundle", "family action run should record reconstruction-bundle mode");
    assert.equal(familyActionRun.familyName, "ui", "family action run should record the family");
    assert.ok(typeof familyActionRun.worksetPath === "string" && familyActionRun.worksetPath.length > 0, "family action run should point at the prepared workset");
    assert.ok(typeof familyActionRun.reconstructionBundlePath === "string" && familyActionRun.reconstructionBundlePath.length > 0, "family action run should point at the reconstruction bundle");
    assert.ok((familyActionRun.preparedEvidenceCount ?? 0) >= 1, "family action run should record prepared evidence counts");
    assert.ok((familyActionRun.reconstructionLocalSourceCount ?? 0) >= 1, "family action run should record grounded local source counts");

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

    const reconstructionBundlePath = path.join(workspaceRoot, familyActionRun.reconstructionBundlePath ?? "");
    const reconstructionBundle = JSON.parse(await fs.readFile(reconstructionBundlePath, "utf8")) as {
      familyName?: string;
      readiness?: string;
      localSources?: unknown[];
      exactLocalSourceCount?: number;
      worksetPath?: string | null;
    };
    assert.equal(reconstructionBundle.familyName, "ui", "reconstruction bundle should record the family");
    assert.equal(reconstructionBundle.readiness, "ready-with-local-sources", "reconstruction bundle should mark local-source readiness");
    assert.ok(Array.isArray(reconstructionBundle.localSources) && reconstructionBundle.localSources.length >= 1, "reconstruction bundle should include grounded local sources");
    assert.ok((reconstructionBundle.exactLocalSourceCount ?? 0) >= 1, "reconstruction bundle should count exact local sources");
    assert.equal(reconstructionBundle.worksetPath, familyActionRun.worksetPath ?? null, "reconstruction bundle should link back to the prepared workset");

    const reconstructionProfilesPath = path.join(donorRoot, "evidence", "local_only", "harvest", "family-reconstruction-profiles.json");
    const reconstructionProfiles = JSON.parse(await fs.readFile(reconstructionProfilesPath, "utf8")) as {
      familyCount?: number;
      families?: Array<{
        familyName?: string;
        profileState?: string;
        readiness?: string;
        reconstructionBundlePath?: string;
        sampleLocalSourcePath?: string | null;
      }>;
    };
    assert.ok((reconstructionProfiles.familyCount ?? 0) >= 1, "reconstruction profile summary should count prepared families");
    const uiProfile = Array.isArray(reconstructionProfiles.families)
      ? reconstructionProfiles.families.find((family) => family?.familyName === "ui")
      : null;
    assert.ok(uiProfile, "reconstruction profile summary should include the prepared family");
    assert.equal(uiProfile?.readiness, "ready-with-local-sources", "reconstruction profile should preserve reconstruction readiness");
    assert.equal(uiProfile?.reconstructionBundlePath, familyActionRun.reconstructionBundlePath ?? null, "reconstruction profile should point at the reconstruction bundle");
    assert.ok(typeof uiProfile?.profileState === "string" && uiProfile.profileState.length > 0, "reconstruction profile should summarize local reconstruction state");
    assert.ok(typeof uiProfile?.sampleLocalSourcePath === "string" && uiProfile.sampleLocalSourcePath.length > 0, "reconstruction profile should expose a sample local source path");

    const reconstructionMapsPath = path.join(donorRoot, "evidence", "local_only", "harvest", "family-reconstruction-maps.json");
    const reconstructionMaps = JSON.parse(await fs.readFile(reconstructionMapsPath, "utf8")) as {
      familyCount?: number;
      families?: Array<{
        familyName?: string;
        mappedAttachmentCount?: number;
        spineAttachmentCount?: number;
        reconstructionBundlePath?: string;
        sampleLocalSourcePath?: string | null;
      }>;
    };
    assert.ok((reconstructionMaps.familyCount ?? 0) >= 1, "reconstruction map summary should count prepared families");
    const uiMap = Array.isArray(reconstructionMaps.families)
      ? reconstructionMaps.families.find((family) => family?.familyName === "ui")
      : null;
    assert.ok(uiMap, "reconstruction map summary should include the prepared family");
    assert.ok(typeof uiMap?.mappedAttachmentCount === "number", "reconstruction map should record attachment coverage");
    assert.ok(typeof uiMap?.spineAttachmentCount === "number", "reconstruction map should record spine attachment counts");
    assert.equal(uiMap?.reconstructionBundlePath, familyActionRun.reconstructionBundlePath ?? null, "reconstruction map should point at the reconstruction bundle");
    assert.ok(typeof uiMap?.sampleLocalSourcePath === "string" && uiMap.sampleLocalSourcePath.length > 0, "reconstruction map should expose a sample local source path");

    const reconstructionSectionsPath = path.join(donorRoot, "evidence", "local_only", "harvest", "family-reconstruction-sections.json");
    const reconstructionSections = JSON.parse(await fs.readFile(reconstructionSectionsPath, "utf8")) as {
      sectionCount?: number;
      sections?: Array<{
        familyName?: string;
        sectionKey?: string;
        attachmentCount?: number;
      }>;
    };
    assert.ok(typeof reconstructionSections.sectionCount === "number", "reconstruction sections summary should record a section count");
    assert.ok(Array.isArray(reconstructionSections.sections), "reconstruction sections summary should expose a section list");

    console.log("PASS donor-scan:family-action");
    console.log(`Donor: ${donorId}`);
    console.log(`Prepared workset: ${familyActionRun.worksetPath}`);
    console.log(`Reconstruction bundle: ${familyActionRun.reconstructionBundlePath}`);
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
