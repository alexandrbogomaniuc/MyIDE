import { strict as assert } from "node:assert";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { loadProjectSlice } from "../../30_app/shell/projectSlice";
import { registryPath } from "../../30_app/workspace/discoverProjects";
import { readProjectDonorAssetIndex, writeProjectDonorAssetIndex } from "../../tools/donor-assets/shared";

interface SmokeRunResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  output: string;
}

interface RuntimeDebugSmokePayload {
  status?: string;
  error?: string | null;
  pathDecision?: string | null;
  projectId?: string;
  runtimeSourceLabel?: string | null;
  entryUrl?: string | null;
  bridgeSource?: string | null;
  resourceMapCount?: number;
  staticImageEntryCount?: number;
  candidateRuntimeSourceUrl?: string | null;
  candidateRuntimeRelativePath?: string | null;
  candidateRequestSource?: string | null;
  candidateHitCount?: number;
  localMirrorSourcePath?: string | null;
  overrideDonorAssetId?: string | null;
  overrideDonorSourceKind?: string | null;
  overrideDonorSourceLabel?: string | null;
  overrideDonorSourceNote?: string | null;
  overrideCreated?: boolean;
  overrideCleared?: boolean;
  overrideHitCountAfterReload?: number;
  overrideBlocked?: string | null;
  allowMissingDonorAsset?: boolean;
}

interface LocalRuntimeMirrorManifest {
  schemaVersion: "0.1.0";
  projectId: string;
  mode: "partial-local-runtime-mirror";
  generatedAtUtc: string;
  publicEntryUrl: string;
  resourceVersion: string | null;
  notes: string[];
  entries: Array<{
    sourceUrl: string;
    kind: string;
    repoRelativePath: string;
    fileType: string;
  }>;
}

interface RuntimeResourceMapSnapshot {
  projectId?: string;
  entryCount?: number;
  entries?: Array<{
    canonicalSourceUrl?: string;
    runtimeRelativePath?: string | null;
  }>;
}

const workspaceRoot = path.resolve(__dirname, "../../..");
const projectsRoot = path.join(workspaceRoot, "40_projects");
const transparentPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+iZ1cAAAAASUVORK5CYII=";

function resolveDebugSmokeScript(workspaceRootPath: string): string {
  return path.join(workspaceRootPath, "dist", "50_tests", "workspace", "electron-runtime-debug-smoke.js");
}

function summarizeOutput(output: string): string {
  const trimmed = output.trim();
  if (trimmed.length === 0) {
    return "<no stdout/stderr captured>";
  }

  return trimmed.split(/\r?\n/).slice(-80).join("\n");
}

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

function buildSmokeProjectMeta(projectId: string, donorId: string): Record<string, unknown> {
  const now = new Date().toISOString();
  const projectRoot = `40_projects/${projectId}`;
  const donorRoot = `${projectRoot}/donor`;
  return {
    schemaVersion: "0.1.0",
    projectId,
    slug: projectId.replace(/^project_/, "").replace(/_/g, "-"),
    displayName: "Smoke Selected Project Debug Donor Index",
    gameFamily: "slot",
    implementationScope: "slot-first",
    phase: "PHASE SMOKE",
    status: "planned",
    verification: {
      status: "unknown",
      checks: [],
      notes: "Temporary smoke project used to verify donor-index-only selected-project Runtime Debug Host proof."
    },
    lifecycle: {
      currentStage: "modificationComposeRuntime",
      stages: {
        investigation: {
          status: "verified",
          notes: "Temporary donor evidence exists only for the smoke proof."
        },
        modificationComposeRuntime: {
          status: "in-progress",
          notes: "Temporary selected-project Runtime Debug Host proof."
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
      donorName: "Smoke Selected Project Debug Donor",
      evidenceRoot: donorRoot,
      captureSessions: ["SMOKE-CS-20260403-DEBUG-A"],
      evidenceRefs: ["SMOKE-EV-20260403-DEBUG-A-001"],
      status: "proven",
      notes: "Temporary project-local donor evidence for donor-index-only Runtime Debug Host proof."
    },
    targetGame: {
      targetGameId: `target.${projectId}.future-target`,
      displayName: "Smoke Selected Project Debug Target",
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
      provenFacts: [
        "This temporary project exists only for donor-index-only selected-project Runtime Debug Host proof."
      ],
      plannedWork: [
        "Clean up after the smoke run finishes."
      ],
      assumptions: [
        "Selected-project Runtime Debug Host should prefer indexed donor assets before task-kit assets."
      ],
      unresolvedQuestions: [
        "None for the smoke fixture."
      ]
    }
  };
}

function runSelectedProjectDebugSmoke(workspaceRootPath: string, env: NodeJS.ProcessEnv): Promise<SmokeRunResult> {
  return new Promise((resolve, reject) => {
    const smokeScriptPath = resolveDebugSmokeScript(workspaceRootPath);
    if (!existsSync(smokeScriptPath)) {
      reject(new Error(`Runtime debug smoke script is missing at ${smokeScriptPath}. Run npm run build first.`));
      return;
    }

    const child = spawn(process.execPath, [smokeScriptPath], {
      cwd: workspaceRootPath,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    const capture = (chunk: unknown) => {
      output += String(chunk);
    };
    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    child.on("error", reject);
    child.on("close", (exitCode, signal) => resolve({ exitCode, signal, output }));
  });
}

async function main(): Promise<void> {
  const originalRegistryRaw = await fs.readFile(registryPath, "utf8");
  const baselineStatus = await captureGitStatus(workspaceRoot);
  const suffix = Date.now().toString(36);
  const projectId = `project_smoke_debug_donor_index_${suffix}`;
  const donorId = `donor_smoke_debug_donor_index_${suffix}`;
  const projectRoot = path.join(projectsRoot, projectId);
  const donorRoot = path.join(projectRoot, "donor");
  const donorImageRelativePath = "images/smoke-debug-override.png";
  const donorImagePath = path.join(donorRoot, donorImageRelativePath);
  const hashesCsvPath = path.join(donorRoot, "HASHES.csv");
  const expectedDonorAssetId = "donor.asset.smoke-ev-20260403-debug-a-001";
  const sourceManifestPath = path.join(workspaceRoot, "40_projects", "project_001", "runtime", "local-mirror", "manifest.json");
  const targetManifestPath = path.join(projectRoot, "runtime", "local-mirror", "manifest.json");
  const targetRequestLogPath = path.join(projectRoot, "runtime", "local-mirror", "request-log.latest.json");
  const targetOverrideManifestPath = path.join(projectRoot, "overrides", "runtime-asset-overrides.json");
  const artifactPath = `/tmp/myide-electron-runtime-selected-project-debug-donor-index-${suffix}.json`;

  const sourceManifestRaw = await fs.readFile(sourceManifestPath, "utf8");
  const sourceManifest = JSON.parse(sourceManifestRaw) as LocalRuntimeMirrorManifest;
  assert(Array.isArray(sourceManifest.entries) && sourceManifest.entries.length > 0, "project_001 runtime mirror manifest should expose grounded entries.");

  const originalTargetManifest = await readOptionalBuffer(targetManifestPath);
  const originalTargetRequestLog = await readOptionalBuffer(targetRequestLogPath);
  const originalTargetOverrideManifest = await readOptionalBuffer(targetOverrideManifestPath);

  let run: SmokeRunResult | null = null;
  try {
    await Promise.all([
      fs.mkdir(path.join(projectRoot, "reports"), { recursive: true }),
      fs.mkdir(path.join(projectRoot, "imports"), { recursive: true }),
      fs.mkdir(path.join(projectRoot, "internal"), { recursive: true }),
      fs.mkdir(path.join(projectRoot, "runtime", "local-mirror"), { recursive: true }),
      fs.mkdir(path.join(projectRoot, "fixtures"), { recursive: true }),
      fs.mkdir(path.join(projectRoot, "target"), { recursive: true }),
      fs.mkdir(path.join(projectRoot, "release"), { recursive: true }),
      fs.mkdir(path.join(projectRoot, "logs"), { recursive: true }),
      fs.mkdir(path.dirname(donorImagePath), { recursive: true }),
      fs.mkdir(path.dirname(artifactPath), { recursive: true })
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
          `${donorImageRelativePath},SMOKE-EV-20260403-DEBUG-A-001,SMOKE-CS-20260403-DEBUG-A,https://example.invalid/assets/smoke-debug-override.png,Smoke debug override donor asset.`
        ].join("\n"),
        "utf8"
      ),
      fs.writeFile(
        targetManifestPath,
        `${JSON.stringify({
          ...sourceManifest,
          projectId,
          generatedAtUtc: new Date().toISOString(),
          notes: [
            ...(Array.isArray(sourceManifest.notes) ? sourceManifest.notes : []),
            "Smoke manifest for donor-index-only selected-project Runtime Debug Host verification."
          ]
        }, null, 2)}\n`,
        "utf8"
      )
    ]);

    const writtenIndex = await writeProjectDonorAssetIndex(projectId);
    assert.equal(writtenIndex.assetCount, 1, "debug donor-index smoke should seed exactly one indexed donor asset.");
    assert.equal(writtenIndex.assets[0]?.assetId, expectedDonorAssetId, "debug donor-index smoke should create the expected donor index asset id.");

    const reloadedIndex = await readProjectDonorAssetIndex(projectId);
    assert(reloadedIndex, "debug donor-index smoke should reload the selected-project donor index.");
    assert.equal(reloadedIndex.assets[0]?.assetId, expectedDonorAssetId, "reloaded donor index should preserve the donor index asset id.");

    const bundle = await loadProjectSlice(projectId);
    assert.equal(bundle.selectedProjectId, projectId, "debug donor-index smoke should load the temporary selected project.");
    assert.equal(bundle.modificationHandoff, null, "debug donor-index smoke should prove the donor-index-only path without a modification-task kit.");
    assert(bundle.donorAssetCatalog, "debug donor-index smoke should expose a donor asset catalog.");
    assert.equal(bundle.donorAssetCatalog.localIndexExists, true, "debug donor-index smoke should expose a selected-project donor index.");
    assert(bundle.runtimeLaunch, "debug donor-index smoke should expose runtime launch state.");
    assert.ok(bundle.runtimeLaunch.localRuntimePackageAvailable, "debug donor-index smoke should expose a grounded local runtime package.");

    await fs.rm(artifactPath, { force: true });

    run = await runSelectedProjectDebugSmoke(workspaceRoot, {
      ...process.env,
      MYIDE_RUNTIME_DEBUG_PROJECT_ID: projectId,
      MYIDE_RUNTIME_DEBUG_ARTIFACT_PATH: artifactPath
    });

    const output = summarizeOutput(run.output);
    assert.equal(run.exitCode, 0, `Selected-project debug donor-index smoke exited with code ${run.exitCode}.\n${output}`);
    const payload = JSON.parse(await fs.readFile(artifactPath, "utf8")) as RuntimeDebugSmokePayload;

    assert.equal(payload.status, "pass", `Selected-project debug donor-index payload reported failure: ${payload.error ?? "<no error>"}\n${output}`);
    assert.equal(payload.projectId, projectId, "Selected-project debug donor-index smoke should target the temporary project.");
    assert.match(String(payload.entryUrl ?? ""), new RegExp(`/runtime/${projectId}/launch$`), "Selected-project debug donor-index smoke should use the temporary selected-project launch URL.");
    assert.equal(payload.runtimeSourceLabel, "Local mirror", "Selected-project debug donor-index smoke should use the grounded local mirror.");
    assert.equal(payload.allowMissingDonorAsset, false, "Selected-project debug donor-index smoke should require a real donor-index-backed override proof.");
    assert.ok(Number(payload.resourceMapCount ?? 0) > 0, "Selected-project debug donor-index smoke should populate the runtime resource map.");
    assert.ok(Number(payload.staticImageEntryCount ?? 0) > 0, "Selected-project debug donor-index smoke should capture at least one static-image candidate.");
    assert.ok(typeof payload.candidateRuntimeSourceUrl === "string" && payload.candidateRuntimeSourceUrl.length > 0, "Selected-project debug donor-index smoke should capture a request-backed runtime candidate.");
    assert.equal(payload.overrideDonorAssetId, expectedDonorAssetId, "Selected-project debug donor-index smoke should use the indexed donor asset, not a task-kit asset.");
    assert.equal(payload.overrideDonorSourceKind, "indexed-donor-images", "Selected-project debug donor-index smoke should label indexed donor proof explicitly.");
    assert.equal(payload.overrideDonorSourceLabel, "indexed-donor-images", "Selected-project debug donor-index smoke should surface the donor-index source label.");
    assert.match(String(payload.overrideDonorSourceNote ?? ""), /indexed-donor-images/i, "Selected-project debug donor-index smoke should explain that override proof used indexed donor images.");
    assert.ok(!String(payload.overrideDonorAssetId ?? "").startsWith("donor.asset.task-"), "Selected-project debug donor-index smoke should not fall back to modification-task donor assets.");
    assert.equal(payload.overrideCreated, true, "Selected-project debug donor-index smoke should create a project-local override.");
    assert.equal(payload.overrideCleared, true, "Selected-project debug donor-index smoke should clear the temporary override after reload.");
    assert.ok(Number(payload.overrideHitCountAfterReload ?? 0) > 0, "Selected-project debug donor-index smoke should prove an override hit after reload.");

    const requestLogRaw = await fs.readFile(targetRequestLogPath, "utf8");
    const requestLog = JSON.parse(requestLogRaw) as RuntimeResourceMapSnapshot;
    assert.equal(requestLog.projectId, projectId, "Selected-project debug donor-index smoke should write the request log under the temporary selected project.");
    assert.ok(Number(requestLog.entryCount ?? 0) > 0, "Selected-project debug donor-index smoke should populate the temporary selected-project request log.");
    assert(
      Array.isArray(requestLog.entries) && requestLog.entries.some((entry) => (
        entry.canonicalSourceUrl === payload.candidateRuntimeSourceUrl
        || entry.runtimeRelativePath === payload.candidateRuntimeRelativePath
      )),
      "Selected-project debug donor-index smoke should record the chosen candidate inside the selected-project request log."
    );

    console.log("PASS smoke:electron-runtime-selected-project-debug-donor-index");
    console.log(`Project: ${projectId}`);
    console.log(`Entry URL: ${payload.entryUrl ?? "<missing>"}`);
    console.log(`Override donor asset: ${payload.overrideDonorAssetId ?? "<missing>"}`);
  } finally {
    await restoreFile(targetManifestPath, originalTargetManifest);
    await restoreFile(targetRequestLogPath, originalTargetRequestLog);
    await restoreFile(targetOverrideManifestPath, originalTargetOverrideManifest);
    await fs.rm(projectRoot, { recursive: true, force: true });
    await fs.writeFile(registryPath, originalRegistryRaw, "utf8");

    const restoredStatus = await captureGitStatus(workspaceRoot);
    assert.equal(
      restoredStatus,
      baselineStatus,
      `Selected-project debug donor-index smoke should restore the repo status.\nBefore:\n${baselineStatus || "<clean>"}\nAfter:\n${restoredStatus || "<clean>"}`
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`FAIL smoke:electron-runtime-selected-project-debug-donor-index - ${message}`);
  process.exitCode = 1;
});
