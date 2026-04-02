import { strict as assert } from "node:assert";
import { loadProjectSlice } from "../../30_app/shell/projectSlice";

async function main(): Promise<void> {
  const bundle = await loadProjectSlice("project_001");
  const handoff = bundle.modificationHandoff;
  const donorAssetCatalog = bundle.donorAssetCatalog;

  assert.ok(handoff, "project_001 should expose a prepared modification handoff");
  assert.ok(donorAssetCatalog, "project_001 should expose a donor asset catalog");

  const targetTask = handoff.topTasks.find((task) => task.sectionKey === "big_win/BW") ?? handoff.topTasks[0];
  assert.ok(targetTask, "expected at least one prepared modification task");

  const expectedGroupKey = `modification-task:${targetTask.taskId}`;
  const taskGroup = donorAssetCatalog.assetGroups.find((group) => group.key === expectedGroupKey);
  assert.ok(taskGroup, `expected donor asset group ${expectedGroupKey}`);
  assert.equal(taskGroup.kind, "modification-task-kit", "task kit group should be marked as modification-task-kit");
  assert.ok(taskGroup.count >= 1, "task kit should expose at least one source image");

  const taskAssets = donorAssetCatalog.assets.filter((asset) => asset.assetGroupKey === expectedGroupKey);
  assert.ok(taskAssets.length >= 1, "task kit should expose donor asset items");
  assert.ok(taskAssets.every((asset) => asset.previewAvailable && Boolean(asset.previewUrl)), "task kit assets should have local previews");
  assert.ok(
    taskAssets.some((asset) => asset.repoRelativePath.includes("big-win") || asset.repoRelativePath.includes("big_win")),
    "task kit should include grounded big_win local image sources"
  );

  console.log("PASS smoke:modification-task-kit");
  console.log(`Task: ${targetTask.displayName}${targetTask.sectionKey ? ` · ${targetTask.sectionKey}` : ""}`);
  console.log(`Group: ${taskGroup.key}`);
  console.log(`Assets: ${taskAssets.length}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:modification-task-kit - ${message}`);
  process.exitCode = 1;
});
