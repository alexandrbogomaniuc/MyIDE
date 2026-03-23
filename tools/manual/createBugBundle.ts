import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../publication/shared";
import { formatManualBugContext, getManualContext, getManualReportsRoot } from "./shared";

function makeBundleId(date = new Date()): string {
  return date.toISOString().replace(/\.\d+Z$/, "Z").replace("T", "_").replace(/:/g, "-");
}

function resolveUniqueBundleDir(root: string, baseId: string): string {
  let candidate = path.join(root, baseId);
  let suffix = 1;
  while (existsSync(candidate)) {
    candidate = path.join(root, `${baseId}-${String(suffix).padStart(2, "0")}`);
    suffix += 1;
  }
  return candidate;
}

function buildBugMarkdown(timestampUtc: string, contextText: string): string {
  const context = getManualContext();
  return [
    "# Manual Bug Report",
    "",
    "This file is prefilled from the current manual bug template and context helper.",
    "",
    `Date/time: ${timestampUtc}`,
    `Local commit SHA: ${context.localHead}`,
    `Local phase: ${context.localPhase}`,
    `Public/main SHA: ${context.publicHead}`,
    "Feature area:",
    `Local/public/handoff status: ${context.gapSummary}`,
    "",
    "Exact steps:",
    "1.",
    "2.",
    "3.",
    "",
    "Expected result:",
    "",
    "Actual result:",
    "",
    "Screenshot / file paths:",
    "- attachments/",
    "",
    "Issue visible in:",
    "- [ ] LOCAL only",
    "- [ ] PUBLIC too",
    "- [ ] HANDOFF / publish flow",
    "",
    "Extra notes:",
    "",
    "## Captured Context",
    "```text",
    contextText,
    "```",
    ""
  ].join("\n");
}

function buildReadme(bundleDir: string): string {
  return [
    "Manual bug bundle",
    "",
    `Bundle path: ${bundleDir}`,
    "",
    "What to do next:",
    "1. Add screenshots, terminal captures, or exported files to attachments/.",
    "2. Finish BUG.md with the exact failing steps, expected result, and actual result.",
    "3. Keep the bundle outside Git; it is for local manual QA reporting only.",
    "4. If you need a fresh text-only context snapshot later, run npm run manual:bug-context again and paste any new details into BUG.md.",
    ""
  ].join("\n");
}

function main(): void {
  const repoRoot = getRepoRoot();
  const reportsRoot = getManualReportsRoot(repoRoot);
  const timestampUtc = new Date().toISOString();
  const bundleDir = resolveUniqueBundleDir(reportsRoot, makeBundleId(new Date(timestampUtc)));
  const attachmentsDir = path.join(bundleDir, "attachments");
  const contextText = formatManualBugContext(getManualContext(), timestampUtc);

  mkdirSync(attachmentsDir, { recursive: true });
  writeFileSync(path.join(bundleDir, "context.txt"), `${contextText}\n`, "utf8");
  writeFileSync(path.join(bundleDir, "BUG.md"), `${buildBugMarkdown(timestampUtc, contextText)}\n`, "utf8");
  writeFileSync(path.join(bundleDir, "README.txt"), `${buildReadme(bundleDir)}\n`, "utf8");

  console.log("Created manual bug bundle");
  console.log(`- Bundle: ${bundleDir}`);
  console.log(`- Report: ${path.join(bundleDir, "BUG.md")}`);
  console.log(`- Context: ${path.join(bundleDir, "context.txt")}`);
  console.log(`- Attachments: ${attachmentsDir}`);
  console.log("Next:");
  console.log("- Add screenshots/files to attachments/");
  console.log("- Finish BUG.md");
}

main();
