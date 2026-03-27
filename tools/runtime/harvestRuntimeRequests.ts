import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { captureLocalRuntimeMirror } from "../../30_app/runtime/localRuntimeMirror";
import { readRuntimeResourceMapSnapshot } from "../../30_app/runtime/runtimeResourceMap";

interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

function resolveWorkspaceRoot(): string {
  return path.resolve(__dirname, "../../..");
}

function summarizeOutput(output: string): string {
  const trimmed = output.trim();
  if (trimmed.length === 0) {
    return "<no output>";
  }

  return trimmed.split(/\r?\n/).slice(-60).join("\n");
}

function runNodeScript(command: string, args: string[], cwd: string): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
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
      resolve({
        exitCode,
        stdout,
        stderr
      });
    });
  });
}

async function main(): Promise<void> {
  const projectId = process.argv[2] ?? "project_001";
  const workspaceRoot = resolveWorkspaceRoot();
  const smokeScriptPath = path.join(workspaceRoot, "dist", "50_tests", "workspace", "electron-runtime-mode-smoke.js");

  if (!existsSync(smokeScriptPath)) {
    throw new Error(`Runtime smoke script is missing at ${smokeScriptPath}. Run npm run build first.`);
  }

  const smoke = await runNodeScript(process.execPath, [smokeScriptPath], workspaceRoot);
  if (smoke.exitCode !== 0) {
    const combined = `${smoke.stdout}\n${smoke.stderr}`.trim();
    throw new Error(`Runtime smoke failed during harvest.\n${summarizeOutput(combined)}`);
  }

  const snapshot = await readRuntimeResourceMapSnapshot(projectId);
  if (!snapshot) {
    throw new Error(`Runtime harvest did not produce a resource-map snapshot for ${projectId}.`);
  }

  const mirrorResult = await captureLocalRuntimeMirror(projectId);
  console.log("PASS runtime:harvest");
  console.log(`Project: ${projectId}`);
  console.log(`Resource map entries: ${snapshot.entryCount}`);
  console.log(`Local static coverage: ${snapshot.coverage.localStaticEntryCount}`);
  console.log(`Upstream static coverage: ${snapshot.coverage.upstreamStaticEntryCount}`);
  console.log(`Unresolved upstream sample: ${snapshot.coverage.unresolvedUpstreamSample.join(", ") || "<none>"}`);
  console.log(`Snapshot: ${snapshot.snapshotRepoRelativePath}`);
  console.log(`Mirror launch URL: ${mirrorResult.status.launchUrl ?? "unavailable"}`);
  console.log(`Mirror entries: ${mirrorResult.status.entryCount}`);
  console.log(`Manifest: ${mirrorResult.status.manifestRepoRelativePath}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL runtime:harvest - ${message}`);
  process.exitCode = 1;
});
