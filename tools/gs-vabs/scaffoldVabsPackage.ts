import { getRepoRoot } from "../publication/shared";
import { ensureScaffold, parseProjectIdArg } from "./shared";

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const result = ensureScaffold(projectId, repoRoot);

  console.log(`Ensured VABS scaffold for ${projectId}`);
  console.log(
    `- Created directories: ${
      result.createdDirectories.length > 0 ? result.createdDirectories.join(", ") : "none"
    }`
  );
  console.log(
    `- Created files: ${result.createdFiles.length > 0 ? result.createdFiles.join(", ") : "none"}`
  );
}

main();
