import path from "node:path";
import {
  syncReplayProjectFromEditableSource,
  type SyncReplayProjectResult
} from "./editableProject";

const workspaceRoot = path.resolve(__dirname, "../../..");

function resolveProjectRoot(projectRootArg?: string): string {
  if (!projectRootArg || projectRootArg.trim().length === 0) {
    return path.join(workspaceRoot, "40_projects", "project_001");
  }

  return path.resolve(workspaceRoot, projectRootArg);
}

export async function syncProject(projectRootArg?: string): Promise<SyncReplayProjectResult> {
  const projectRoot = resolveProjectRoot(projectRootArg);
  return syncReplayProjectFromEditableSource(projectRoot);
}

async function main(): Promise<void> {
  const projectRootArg = process.argv[2];
  const result = await syncProject(projectRootArg);

  console.log("PASS sync:project");
  console.log(`Replay project path: ${path.relative(workspaceRoot, result.replayProjectPath)}`);
  console.log(`Scene: ${result.sceneId}`);
  console.log(`Layers: ${result.layerCount}`);
  console.log(`Objects: ${result.objectCount}`);
  console.log(`Bridge: ${result.bridgeVersion}`);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL sync:project - ${message}`);
    process.exitCode = 1;
  });
}
