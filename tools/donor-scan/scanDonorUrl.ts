import { bootstrapDonorIntake } from "../../30_app/workspace/donorIntake";
import { runDonorScan } from "./runDonorScan";

interface ParsedArgs {
  donorId: string;
  donorName: string;
  donorLaunchUrl?: string;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  let donorId = "";
  let donorName = "";
  let donorLaunchUrl = "";

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === "--donor-id" && next) {
      donorId = next;
      index += 1;
      continue;
    }
    if (token === "--donor-name" && next) {
      donorName = next;
      index += 1;
      continue;
    }
    if (token === "--url" && next) {
      donorLaunchUrl = next;
      index += 1;
    }
  }

  if (!donorId) {
    throw new Error("Missing required --donor-id argument.");
  }

  return {
    donorId,
    donorName: donorName || donorId,
    donorLaunchUrl: donorLaunchUrl || undefined
  };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  let launchUrl = parsed.donorLaunchUrl;
  let resolvedLaunchUrl: string | undefined;
  let sourceHost: string | undefined;

  if (launchUrl) {
    const intake = await bootstrapDonorIntake({
      donorId: parsed.donorId,
      donorName: parsed.donorName,
      donorLaunchUrl: launchUrl,
      overwrite: true
    });
    launchUrl = intake.launchUrl;
    resolvedLaunchUrl = intake.resolvedLaunchUrl;
    sourceHost = intake.sourceHost;
  }

  const result = await runDonorScan({
    donorId: parsed.donorId,
    donorName: parsed.donorName,
    launchUrl,
    resolvedLaunchUrl,
    sourceHost
  });

  console.log("PASS donor-scan:url");
  console.log(`Donor: ${result.donorId}`);
  console.log(`Status: ${result.status}`);
  console.log(`Runtime candidates: ${result.runtimeCandidateCount}`);
  console.log(`Atlas metadata count: ${result.atlasManifestCount}`);
  console.log(`Bundle asset-map status: ${result.bundleAssetMapStatus}`);
  console.log(`Bundle image variants: ${result.bundleImageVariantCount} entries / ${result.bundleImageVariantSuffixCount} suffix tokens (${result.bundleImageVariantStatus})`);
  console.log(`Bundle image URL rule: ${result.bundleImageVariantUrlBuilderStatus} (${result.bundleImageVariantUrlCount} grounded variant URLs)`);
  console.log(`Mirror candidate status: ${result.mirrorCandidateStatus}`);
  console.log(`Next operator action: ${result.nextOperatorAction}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL donor-scan:url - ${message}`);
  process.exitCode = 1;
});
