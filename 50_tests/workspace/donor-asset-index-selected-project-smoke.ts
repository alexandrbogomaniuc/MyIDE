import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { loadProjectSlice } from "../../30_app/shell/projectSlice";
import { registryPath } from "../../30_app/workspace/discoverProjects";
import { readProjectDonorAssetIndex, writeProjectDonorAssetIndex } from "../../tools/donor-assets/shared";

const workspaceRoot = path.resolve(__dirname, "../../..");
const projectsRoot = path.join(workspaceRoot, "40_projects");
const transparentPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+iZ1cAAAAASUVORK5CYII=";

function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

async function captureGitStatus(root: string): Promise<string> {
  const result = await runCommand("git", ["-C", root, "status", "--short"]);
  if (result.exitCode !== 0) {
    throw new Error(`git status --short failed with code ${result.exitCode}: ${result.stderr.trim()}`);
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .sort()
    .join("\n");
}

function buildSmokeProjectMeta(projectId: string, donorId: string): Record<string, unknown> {
  const now = new Date().toISOString();
  const projectRoot = `40_projects/${projectId}`;
  const donorRoot = `${projectRoot}/donor`;
  return {
    schemaVersion: "0.1.0",
    projectId,
    slug: projectId.replace(/^project_/, "").replace(/_/g, "-"),
    displayName: "Smoke Donor Asset Index Project",
    gameFamily: "slot",
    implementationScope: "slot-first",
    phase: "PHASE SMOKE",
    status: "planned",
    verification: {
      status: "unknown",
      checks: [],
      notes: "Temporary smoke project used to verify project-local donor asset indexing."
    },
    lifecycle: {
      currentStage: "investigation",
      stages: {
        investigation: {
          status: "planned",
          notes: "Temporary smoke investigation stage."
        },
        modificationComposeRuntime: {
          status: "planned",
          notes: "Temporary smoke modification stage."
        },
        mathConfig: {
          status: "deferred",
          notes: "Temporary smoke math/config stage."
        },
        gsExport: {
          status: "deferred",
          notes: "Temporary smoke export stage."
        }
      }
    },
    paths: {
      projectRoot,
      projectJson: `${projectRoot}/project.json`,
      metaPath: `${projectRoot}/project.meta.json`,
      registryPath: "40_projects/registry.json",
      evidenceRoot: donorRoot,
      donorRoot,
      reportsRoot: `${projectRoot}/reports`,
      importsRoot: `${projectRoot}/imports`,
      internalRoot: `${projectRoot}/internal`,
      importPath: `${projectRoot}/imports/import-manifest.json`,
      runtimeRoot: `${projectRoot}/runtime`,
      fixturesRoot: `${projectRoot}/fixtures`,
      targetRoot: `${projectRoot}/target`,
      releaseRoot: `${projectRoot}/release`,
      logsRoot: `${projectRoot}/logs`
    },
    donor: {
      donorId,
      donorName: "Smoke Donor Asset Index",
      evidenceRoot: donorRoot,
      captureSessions: ["SMOKE-CS-20260403-WEB-A"],
      evidenceRefs: ["SMOKE-EV-20260403-WEB-A-001"],
      status: "proven",
      notes: "Temporary project-local donor evidence used for selected-project donor asset indexing proof."
    },
    targetGame: {
      targetGameId: `target.${projectId}.future-target`,
      displayName: "Smoke Donor Asset Index Target",
      gameFamily: "slot",
      relationship: "future-target",
      status: "planned",
      provenNotes: [],
      plannedNotes: ["Temporary smoke target only."],
      notes: "Temporary smoke target metadata."
    },
    timestamps: {
      createdAt: now,
      updatedAt: now
    },
    notes: {
      provenFacts: ["This temporary project exists only for donor asset indexing smoke coverage."],
      plannedWork: ["Clean up after the smoke run finishes."],
      assumptions: ["Project-local donor evidence roots should be indexable without project_001 special-casing."],
      unresolvedQuestions: ["None for the smoke fixture."]
    }
  };
}

async function main(): Promise<void> {
  const originalRegistryRaw = await fs.readFile(registryPath, "utf8");
  const baselineStatus = await captureGitStatus(workspaceRoot);
  const suffix = Date.now().toString(36);
  const projectId = `project_smoke_donor_index_${suffix}`;
  const donorId = `donor_smoke_donor_index_${suffix}`;
  const projectRoot = path.join(projectsRoot, projectId);
  const donorRoot = path.join(projectRoot, "donor");
  const donorImageRelativePath = "images/smoke-symbol.png";
  const donorImagePath = path.join(donorRoot, donorImageRelativePath);
  const hashesCsvPath = path.join(donorRoot, "HASHES.csv");
  const expectedIndexPath = `40_projects/${projectId}/donor-assets/local-index.json`;
  const expectedInventoryPath = `40_projects/${projectId}/donor/HASHES.csv`;

  await fs.mkdir(projectRoot, { recursive: true });

  try {
    await Promise.all([
      fs.mkdir(path.join(projectRoot, "reports"), { recursive: true }),
      fs.mkdir(path.join(projectRoot, "imports"), { recursive: true }),
      fs.mkdir(path.join(projectRoot, "internal"), { recursive: true }),
      fs.mkdir(path.join(projectRoot, "runtime"), { recursive: true }),
      fs.mkdir(path.join(projectRoot, "fixtures"), { recursive: true }),
      fs.mkdir(path.join(projectRoot, "target"), { recursive: true }),
      fs.mkdir(path.join(projectRoot, "release"), { recursive: true }),
      fs.mkdir(path.join(projectRoot, "logs"), { recursive: true }),
      fs.mkdir(path.dirname(donorImagePath), { recursive: true })
    ]);

    await Promise.all([
      fs.writeFile(
        path.join(projectRoot, "project.meta.json"),
        `${JSON.stringify(buildSmokeProjectMeta(projectId, donorId), null, 2)}\n`,
        "utf8"
      ),
      fs.writeFile(donorImagePath, Buffer.from(transparentPngBase64, "base64")),
      fs.writeFile(
        hashesCsvPath,
        [
          "relative_path,evidence_id,capture_session_id,source_url,notes",
          `${donorImageRelativePath},SMOKE-EV-20260403-WEB-A-001,SMOKE-CS-20260403-WEB-A,https://example.invalid/assets/smoke-symbol.png,Smoke donor symbol.`
        ].join("\n"),
        "utf8"
      )
    ]);

    const writtenIndex = await writeProjectDonorAssetIndex(projectId);
    assert.equal(writtenIndex.projectId, projectId, "donor asset index should stay project-aware");
    assert.equal(writtenIndex.donorId, donorId, "donor asset index should use the selected project donor id");
    assert.equal(writtenIndex.indexPath, expectedIndexPath, "donor asset index should stay project-local");
    assert.equal(writtenIndex.sourceInventoryPath, expectedInventoryPath, "donor asset index should use the project-local evidence root");
    assert.equal(writtenIndex.assetCount, 1, "smoke donor asset index should include the fixture image");
    assert.equal(writtenIndex.assets[0]?.repoRelativePath, `40_projects/${projectId}/donor/${donorImageRelativePath}`, "indexed donor asset should stay project-local");

    const reloadedIndex = await readProjectDonorAssetIndex(projectId);
    assert(reloadedIndex, "project-local donor asset index should be readable after write");
    assert.equal(reloadedIndex.assetCount, 1, "reloaded donor asset index should preserve the fixture image");

    const bundle = await loadProjectSlice(projectId);
    assert.equal(bundle.selectedProjectId, projectId, "project slice should load the temporary selected project");
    assert(bundle.donorAssetCatalog, "project slice should expose a donor asset catalog for the temporary project");
    assert.equal(bundle.donorAssetCatalog.localIndexExists, true, "project slice should report a project-local donor asset index");
    assert.equal(bundle.donorAssetCatalog.indexPath, expectedIndexPath, "project slice should surface the project-local donor asset index path");
    assert.ok(bundle.donorAssetCatalog.assetCount >= 1, "project slice should surface the indexed donor asset");
    assert(
      bundle.donorAssetCatalog.assets.some((asset) => asset.repoRelativePath === `40_projects/${projectId}/donor/${donorImageRelativePath}`),
      "project slice should surface the project-local indexed donor asset"
    );

    console.log("PASS smoke:donor-asset-index-selected-project");
    console.log(`Project: ${projectId}`);
    console.log(`Index: ${writtenIndex.indexPath}`);
    console.log(`Assets: ${bundle.donorAssetCatalog.assetCount}`);
  } finally {
    await fs.rm(projectRoot, { recursive: true, force: true });
    await fs.writeFile(registryPath, originalRegistryRaw, "utf8");

    const restoredStatus = await captureGitStatus(workspaceRoot);
    assert.equal(
      restoredStatus,
      baselineStatus,
      `Selected-project donor asset index smoke should restore the repo status.\nBefore:\n${baselineStatus || "<clean>"}\nAfter:\n${restoredStatus || "<clean>"}`
    );
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:donor-asset-index-selected-project - ${message}`);
  process.exitCode = 1;
});
