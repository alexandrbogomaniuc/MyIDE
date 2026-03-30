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

interface HarvestOptions {
  projectId: string;
  refreshWithSmoke: boolean;
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

function formatSmokeFailureMessage(output: string): string {
  const summary = summarizeOutput(output);
  if (output.includes("EADDRINUSE") && output.includes("127.0.0.1:38901")) {
    return [
      "Runtime debug smoke failed during harvest refresh because the local runtime mirror port is already in use (`127.0.0.1:38901`).",
      "Close any running MyIDE app or Runtime Debug Host window first, then retry `npm run runtime:harvest:smoke:project_001`.",
      "If you only want a safe mirror refresh without launching Electron, run `npm run runtime:harvest:project_001` instead.",
      "",
      summary
    ].join("\n");
  }
  return `Runtime debug smoke failed during harvest refresh.\n${summary}`;
}

function parseOptions(argv: string[]): HarvestOptions {
  const positional = argv.filter((value) => !value.startsWith("--"));
  return {
    projectId: positional[0] ?? "project_001",
    refreshWithSmoke: argv.includes("--refresh-with-smoke")
  };
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
  const options = parseOptions(process.argv.slice(2));
  const { projectId, refreshWithSmoke } = options;
  const workspaceRoot = resolveWorkspaceRoot();

  if (refreshWithSmoke) {
    const smokeScriptPath = path.join(workspaceRoot, "dist", "50_tests", "workspace", "electron-runtime-debug-smoke.js");
    if (!existsSync(smokeScriptPath)) {
      throw new Error(`Runtime debug smoke script is missing at ${smokeScriptPath}. Run npm run build first.`);
    }

    const smoke = await runNodeScript(process.execPath, [smokeScriptPath], workspaceRoot);
    if (smoke.exitCode !== 0) {
      const combined = `${smoke.stdout}\n${smoke.stderr}`.trim();
      throw new Error(formatSmokeFailureMessage(combined));
    }
  }

  const mirrorResult = await captureLocalRuntimeMirror(projectId);
  const snapshot = await readRuntimeResourceMapSnapshot(projectId);

  console.log("PASS runtime:harvest");
  console.log(`Project: ${projectId}`);
  console.log(`Mode: ${refreshWithSmoke ? "refresh-with-debug-smoke" : "safe-local-refresh"}`);
  if (snapshot) {
    console.log(`Resource map entries: ${snapshot.entryCount}`);
    console.log(`Local static coverage: ${snapshot.coverage.localStaticEntryCount}`);
    console.log(`Upstream static coverage: ${snapshot.coverage.upstreamStaticEntryCount}`);
    console.log(`Unresolved upstream sample: ${snapshot.coverage.unresolvedUpstreamSample.join(", ") || "<none>"}`);
    console.log(`Snapshot: ${snapshot.snapshotRepoRelativePath}`);
  } else {
    console.log("Resource map entries: 0");
    console.log("Local static coverage: 0");
    console.log("Upstream static coverage: 0");
    console.log("Unresolved upstream sample: <none>");
    console.log("Snapshot: unavailable");
    console.log("Note: no existing runtime request snapshot was found. Open the app with `npm run dev` and use `Use Debug Host`, or run `npm run runtime:harvest:smoke:project_001` if you want an automated request-backed refresh.");
  }
  console.log(`Mirror launch URL: ${mirrorResult.status.launchUrl ?? "unavailable"}`);
  console.log(`Mirror entries: ${mirrorResult.status.entryCount}`);
  console.log(`Manifest: ${mirrorResult.status.manifestRepoRelativePath}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL runtime:harvest - ${message}`);
  process.exitCode = 1;
});
