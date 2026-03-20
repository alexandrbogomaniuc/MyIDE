import path from "node:path";
import { discoverAndWriteRegistry, registryPath } from "./discoverProjects";

async function main(): Promise<void> {
  const registry = await discoverAndWriteRegistry();

  console.log("PASS generate:registry");
  console.log(`Derived registry path: ${path.relative(process.cwd(), registryPath)}`);
  console.log(`Discovered projects: ${registry.projectCount}`);
  console.log(`Active project: ${registry.activeProjectId}`);
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL generate:registry - ${message}`);
    process.exitCode = 1;
  });
}
