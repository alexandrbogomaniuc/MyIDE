import path from "node:path";
import { bootstrapDonorIntake } from "../../30_app/workspace/donorIntake";

interface ParsedArgs {
  donorId?: string;
  donorName?: string;
  url?: string;
  overwrite: boolean;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const parsed: ParsedArgs = { overwrite: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--donor-id") {
      parsed.donorId = argv[index + 1];
      index += 1;
    } else if (arg === "--donor-name") {
      parsed.donorName = argv[index + 1];
      index += 1;
    } else if (arg === "--url") {
      parsed.url = argv[index + 1];
      index += 1;
    } else if (arg === "--overwrite") {
      parsed.overwrite = true;
    }
  }

  return parsed;
}

async function main(): Promise<void> {
  const { donorId, donorName, url, overwrite } = parseArgs(process.argv.slice(2));

  if (!donorId || !donorName || !url) {
    const script = path.relative(process.cwd(), __filename);
    console.log([
      "Usage:",
      `  node ${script} --donor-id <donor_id> --donor-name <display name> --url <launch url> [--overwrite]`,
      "",
      "Example:",
      `  node ${script} --donor-id donor_003_example --donor-name \"Example Donor\" --url \"https://demo.example.com/play/Game/FUN?server=demo\"`
    ].join("\n"));
    return;
  }

  const result = await bootstrapDonorIntake({
    donorId,
    donorName,
    donorLaunchUrl: url,
    overwrite
  });

  console.log(`Donor intake status: ${result.status}`);
  console.log(`Donor root: ${path.relative(process.cwd(), result.donorRoot)}`);
  console.log(`Evidence root: ${path.relative(process.cwd(), result.evidenceRoot)}`);
  console.log(`Report path: ${path.relative(process.cwd(), result.reportPath)}`);
  console.log(`Discovered URLs: ${result.discoveredUrlCount}`);
  console.log(`Harvest status: ${result.harvestStatus ?? "unknown"}`);
  if (result.harvestManifestPath) {
    console.log(`Harvest manifest: ${path.relative(process.cwd(), result.harvestManifestPath)}`);
  }
  if (typeof result.harvestedAssetCount === "number") {
    console.log(`Harvested assets: ${result.harvestedAssetCount}`);
  }
  if (typeof result.failedAssetCount === "number") {
    console.log(`Failed assets: ${result.failedAssetCount}`);
  }
  if (result.launchUrl) {
    console.log(`Launch URL: ${result.launchUrl}`);
  }
  if (result.resolvedLaunchUrl) {
    console.log(`Resolved URL: ${result.resolvedLaunchUrl}`);
  }
  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
}

if (require.main === module) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
