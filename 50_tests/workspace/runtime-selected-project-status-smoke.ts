import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildLocalRuntimeMirrorStatus } from "../../30_app/runtime/localRuntimeMirror";
import { loadRuntimeResourceMapStatus } from "../../30_app/runtime/runtimeResourceMap";
import { loadProjectSlice } from "../../30_app/shell/projectSlice";
import { buildRuntimeAssetOverrideStatus } from "../../30_app/workspace/donorOverride";

const workspaceRoot = path.resolve(__dirname, "../../..");
const projectId = "project_002";

const mirrorManifestPath = path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "manifest.json");
const requestLogPath = path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "request-log.latest.json");
const loaderFilePath = path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "files", "example.invalid", "loader.js");
const bundleFilePath = path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "files", "example.invalid", "bundle.js");
const imageFilePath = path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "files", "example.invalid", "big-win-ribbon.png");
const overrideManifestPath = path.join(workspaceRoot, "40_projects", projectId, "overrides", "runtime-asset-overrides.json");
const overrideFilePath = path.join(workspaceRoot, "40_projects", projectId, "overrides", "runtime-assets", "big-win-ribbon--smoke.png");

const mirrorManifestRepoRelativePath = `40_projects/${projectId}/runtime/local-mirror/manifest.json`;
const requestLogRepoRelativePath = `40_projects/${projectId}/runtime/local-mirror/request-log.latest.json`;
const overrideManifestRepoRelativePath = `40_projects/${projectId}/overrides/runtime-asset-overrides.json`;
const overrideFileRepoRelativePath = `40_projects/${projectId}/overrides/runtime-assets/big-win-ribbon--smoke.png`;

async function readOptionalBuffer(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function restoreFile(filePath: string, original: Buffer | null): Promise<void> {
  if (original === null) {
    await fs.rm(filePath, { force: true });
    return;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, original);
}

async function cleanupEmptyDirectory(directoryPath: string): Promise<void> {
  try {
    const entries = await fs.readdir(directoryPath);
    if (entries.length === 0) {
      await fs.rmdir(directoryPath);
    }
  } catch {
    // Best-effort cleanup only.
  }
}

async function main(): Promise<void> {
  const trackedPaths = [
    mirrorManifestPath,
    requestLogPath,
    loaderFilePath,
    bundleFilePath,
    imageFilePath,
    overrideManifestPath,
    overrideFilePath
  ];
  const originalFiles = new Map<string, Buffer | null>();
  for (const filePath of trackedPaths) {
    originalFiles.set(filePath, await readOptionalBuffer(filePath));
  }

  const runtimeSourceUrl = "https://example.invalid/runtime/img/big-win-ribbon.png";

  try {
    await fs.mkdir(path.dirname(mirrorManifestPath), { recursive: true });
    await fs.mkdir(path.dirname(loaderFilePath), { recursive: true });
    await fs.mkdir(path.dirname(overrideManifestPath), { recursive: true });
    await fs.mkdir(path.dirname(overrideFilePath), { recursive: true });

    await Promise.all([
      fs.writeFile(loaderFilePath, "console.log('project_002 loader');\n", "utf8"),
      fs.writeFile(bundleFilePath, "console.log('project_002 bundle');\n", "utf8"),
      fs.writeFile(imageFilePath, Buffer.from("project_002_image_placeholder", "utf8")),
      fs.writeFile(overrideFilePath, Buffer.from("project_002_override_placeholder", "utf8"))
    ]);

    await fs.writeFile(
      mirrorManifestPath,
      `${JSON.stringify({
        schemaVersion: "0.1.0",
        projectId,
        mode: "partial-local-runtime-mirror",
        generatedAtUtc: new Date().toISOString(),
        publicEntryUrl: "https://demo.bgaming-network.com/play/MysteryGarden/FUN?server=demo",
        resourceVersion: "project-002-smoke",
        notes: [
          "Smoke manifest for selected-project runtime status hydration."
        ],
        entries: [
          {
            sourceUrl: "https://example.invalid/runtime/loader.js",
            kind: "runtime-loader",
            repoRelativePath: "40_projects/project_002/runtime/local-mirror/files/example.invalid/loader.js",
            fileType: "js"
          },
          {
            sourceUrl: "https://example.invalid/runtime/bundle.js",
            kind: "runtime-bundle",
            repoRelativePath: "40_projects/project_002/runtime/local-mirror/files/example.invalid/bundle.js",
            fileType: "js"
          },
          {
            sourceUrl: runtimeSourceUrl,
            kind: "static-image",
            repoRelativePath: "40_projects/project_002/runtime/local-mirror/files/example.invalid/big-win-ribbon.png",
            fileType: "png"
          }
        ]
      }, null, 2)}\n`,
      "utf8"
    );

    await fs.writeFile(
      requestLogPath,
      `${JSON.stringify({
        projectId,
        generatedAtUtc: new Date().toISOString(),
        entryCount: 1,
        snapshotRepoRelativePath: requestLogRepoRelativePath,
        coverage: {},
        entries: [
          {
            canonicalSourceUrl: runtimeSourceUrl,
            latestRequestUrl: `http://127.0.0.1:38901/runtime/${projectId}/assets/img/big-win-ribbon.png`,
            requestSource: "upstream-request",
            lastCaptureMethod: "server-route",
            captureMethods: ["server-route"],
            requestCategory: "static-asset",
            resourceType: "image",
            runtimeRelativePath: "img/big-win-ribbon.png",
            runtimeFilename: "big-win-ribbon.png",
            fileType: "png",
            localMirrorRepoRelativePath: "40_projects/project_002/runtime/local-mirror/files/example.invalid/big-win-ribbon.png",
            localMirrorAbsolutePath: imageFilePath,
            overrideRepoRelativePath: overrideFileRepoRelativePath,
            overrideAbsolutePath: overrideFilePath,
            hitCount: 2,
            lastHitAtUtc: new Date().toISOString(),
            lastStage: "smoke",
            stageHitCounts: {
              smoke: 2
            }
          }
        ]
      }, null, 2)}\n`,
      "utf8"
    );

    await fs.writeFile(
      overrideManifestPath,
      `${JSON.stringify({
        schemaVersion: "0.1.0",
        projectId,
        generatedAtUtc: new Date().toISOString(),
        entries: [
          {
            overrideId: "runtime.override.big-win-ribbon.png",
            runtimeSourceUrl,
            runtimeRelativePath: "img/big-win-ribbon.png",
            runtimeFilename: "big-win-ribbon.png",
            fileType: "png",
            donorAssetId: "smoke.donor.asset",
            donorEvidenceId: "smoke.evidence.asset",
            donorFilename: "smoke-donor.png",
            donorRepoRelativePath: "10_donors/smoke/donor.png",
            overrideRepoRelativePath: overrideFileRepoRelativePath,
            createdAtUtc: new Date().toISOString(),
            note: "Smoke override for selected-project runtime status hydration."
          }
        ]
      }, null, 2)}\n`,
      "utf8"
    );

    const mirrorStatus = await buildLocalRuntimeMirrorStatus(projectId);
    assert.equal(mirrorStatus.projectId, projectId, "Runtime mirror status should preserve the selected project.");
    assert.equal(mirrorStatus.available, true, "Selected project runtime mirror should be available from its own manifest.");
    assert.equal(mirrorStatus.manifestRepoRelativePath, mirrorManifestRepoRelativePath, "Runtime mirror should use the selected project manifest path.");

    const resourceMapStatus = await loadRuntimeResourceMapStatus(projectId);
    assert.equal(resourceMapStatus.projectId, projectId, "Runtime resource map should preserve the selected project.");
    assert.equal(resourceMapStatus.snapshotRepoRelativePath, requestLogRepoRelativePath, "Runtime resource map should use the selected project snapshot path.");
    assert(
      resourceMapStatus.entries.some((entry) => entry.canonicalSourceUrl === runtimeSourceUrl),
      "Runtime resource map should hydrate entries from the selected project snapshot."
    );

    const overrideStatus = await buildRuntimeAssetOverrideStatus(projectId);
    assert.equal(overrideStatus.projectId, projectId, "Runtime override status should preserve the selected project.");
    assert.equal(overrideStatus.manifestRepoRelativePath, overrideManifestRepoRelativePath, "Runtime override status should use the selected project manifest path.");
    assert(
      overrideStatus.entries.some((entry) => entry.runtimeSourceUrl === runtimeSourceUrl && entry.fileExists),
      "Runtime override status should hydrate selected-project overrides from disk."
    );

    const projectSlice = await loadProjectSlice(projectId);
    assert(projectSlice.runtimeMirror, "Project slice should surface runtime mirror status for non-project_001 projects.");
    assert(projectSlice.runtimeResourceMap, "Project slice should surface runtime resource map status for non-project_001 projects.");
    assert(projectSlice.runtimeOverrides, "Project slice should surface runtime override status for non-project_001 projects.");
    assert(projectSlice.runtimeLaunch, "Project slice should surface a runtime launch status for non-project_001 projects.");
    assert.equal(projectSlice.runtimeMirror.projectId, projectId, "Project slice runtime mirror should belong to the selected project.");
    assert.equal(projectSlice.runtimeResourceMap.projectId, projectId, "Project slice runtime resource map should belong to the selected project.");
    assert.equal(projectSlice.runtimeOverrides.projectId, projectId, "Project slice runtime overrides should belong to the selected project.");
    assert.equal(projectSlice.runtimeLaunch.availability, "local-mirror", "Selected project runtime launch should use the grounded local mirror when one is indexed.");
    assert.match(String(projectSlice.runtimeLaunch.entryUrl ?? ""), /\/runtime\/project_002\/launch$/, "Selected project runtime launch should expose the selected-project mirror launch URL.");
    assert.equal(projectSlice.runtimeLaunch.localRuntimePackageAvailable, true, "Selected project runtime launch should still acknowledge the project-local mirror.");
    assert(
      projectSlice.runtimeLaunch.sourcePaths.includes(mirrorManifestRepoRelativePath),
      "Selected project runtime launch should point back to the selected project mirror evidence."
    );

    console.log("PASS smoke:runtime-selected-project-status");
    console.log(`Project: ${projectId}`);
    console.log(`Mirror manifest: ${mirrorManifestRepoRelativePath}`);
    console.log(`Request log: ${requestLogRepoRelativePath}`);
    console.log(`Override manifest: ${overrideManifestRepoRelativePath}`);
  } finally {
    for (const filePath of trackedPaths) {
      await restoreFile(filePath, originalFiles.get(filePath) ?? null);
    }

    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "files", "example.invalid"));
    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "files"));
    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror"));
    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "overrides", "runtime-assets"));
    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "overrides"));
  }
}

main().catch((error) => {
  console.error(`FAIL smoke:runtime-selected-project-status - ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exitCode = 1;
});
