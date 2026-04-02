import { prepareProjectModificationHandoff } from "../../30_app/workspace/modificationHandoff";

function parseProjectId(argv: readonly string[]): string {
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--project-id" && typeof argv[index + 1] === "string" && argv[index + 1].length > 0) {
      return argv[index + 1];
    }
  }

  throw new Error("Missing required --project-id argument.");
}

async function main(): Promise<void> {
  const projectId = parseProjectId(process.argv.slice(2));
  const result = await prepareProjectModificationHandoff(projectId);
  console.log("PASS project:prepare-modification");
  console.log(`Project: ${result.projectId}`);
  console.log(`Donor: ${result.donorId}`);
  console.log(`Handoff state: ${result.handoffState}`);
  console.log(`Ready tasks: ${result.readyTaskCount}`);
  console.log(`Blocked tasks: ${result.blockedTaskCount}`);
  console.log(`Source queue: ${result.sourceQueuePath}`);
  console.log(`Next action: ${result.nextOperatorAction}`);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL project:prepare-modification - ${message}`);
    process.exitCode = 1;
  });
}
