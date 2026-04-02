import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  buildRuntimePageProofStatus,
  saveRuntimePageProof
} from "../../30_app/runtime/runtimePageProofs";
import { loadProjectSlice } from "../../30_app/shell/projectSlice";

const workspaceRoot = path.resolve(__dirname, "../../..");
const projectId = "project_002";
const snapshotPath = path.join(
  workspaceRoot,
  "40_projects",
  projectId,
  "runtime",
  "page-runtime-proofs.latest.json"
);
const expectedSnapshotRepoRelativePath = `40_projects/${projectId}/runtime/page-runtime-proofs.latest.json`;
const smokeTaskId = "smoke:runtime-page-proof-storage";
const smokePageName = "big_win_1.png";
const smokeSourceUrl = "https://example.invalid/runtime/big-win-ribbon.png_80_80.webp";

async function main(): Promise<void> {
  let originalSnapshotRaw: string | null = null;
  try {
    originalSnapshotRaw = await fs.readFile(snapshotPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code !== "ENOENT") {
      throw error;
    }
  }

  try {
    const savedStatus = await saveRuntimePageProof(projectId, {
      taskId: smokeTaskId,
      pageName: smokePageName,
      sourceUrl: smokeSourceUrl,
      runtimeLabel: "Smoke page runtime proof",
      profileId: "smoke-runtime-page-proof-storage",
      requestSource: "upstream-request",
      requestBacked: true,
      relativePath: "img/big-win/big-win-ribbon.png_80_80.webp",
      overrideHitCountAfterReload: 0
    });

    assert.equal(savedStatus.projectId, projectId, "Runtime page proof save should preserve project id.");
    assert.equal(
      savedStatus.snapshotRepoRelativePath,
      expectedSnapshotRepoRelativePath,
      "Runtime page proof snapshot should use the generic project runtime path."
    );
    assert(
      savedStatus.entries.some((entry) => entry.taskId === smokeTaskId && entry.pageName === smokePageName && entry.sourceUrl === smokeSourceUrl),
      "Saved runtime page proof should be present in the returned status."
    );

    const loadedStatus = await buildRuntimePageProofStatus(projectId);
    assert(loadedStatus, "Runtime page proof status should load after saving.");
    assert.equal(
      loadedStatus.snapshotRepoRelativePath,
      expectedSnapshotRepoRelativePath,
      "Loaded runtime page proof status should report the generic project runtime path."
    );
    assert(
      loadedStatus.entries.some((entry) => entry.taskId === smokeTaskId && entry.pageName === smokePageName && entry.sourceUrl === smokeSourceUrl),
      "Loaded runtime page proof status should contain the saved entry."
    );

    const projectSlice = await loadProjectSlice(projectId);
    assert(projectSlice.runtimePageProofs, "Project slice should hydrate runtime page proofs for a non-project_001 project.");
    assert.equal(
      projectSlice.runtimePageProofs.snapshotRepoRelativePath,
      expectedSnapshotRepoRelativePath,
      "Project slice should surface the generic runtime proof snapshot path."
    );
    assert(
      projectSlice.runtimePageProofs.entries.some((entry) => entry.taskId === smokeTaskId && entry.pageName === smokePageName && entry.sourceUrl === smokeSourceUrl),
      "Project slice runtime page proofs should contain the saved entry."
    );

    console.log("PASS smoke:runtime-page-proof-storage");
    console.log(`Project: ${projectId}`);
    console.log(`Snapshot path: ${expectedSnapshotRepoRelativePath}`);
    console.log(`Saved source: ${smokeSourceUrl}`);
  } finally {
    if (originalSnapshotRaw === null) {
      await fs.rm(snapshotPath, { force: true });
    } else {
      await fs.writeFile(snapshotPath, originalSnapshotRaw, "utf8");
    }
  }
}

main().catch((error) => {
  console.error(`FAIL smoke:runtime-page-proof-storage - ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exitCode = 1;
});
