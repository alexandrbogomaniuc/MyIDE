import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import { runSectionAction } from "../../tools/donor-scan/runSectionAction";

const workspaceRoot = path.resolve(__dirname, "../../..");

async function main(): Promise<void> {
  const donorId = `donor_smoke_section_action_${Date.now().toString(36)}`;
  const donorRoot = path.join(workspaceRoot, "10_donors", donorId, "evidence", "local_only", "harvest");
  await fs.mkdir(donorRoot, { recursive: true });

  const sectionBundlesPath = path.join(donorRoot, "family-reconstruction-section-bundles.json");
  await fs.writeFile(sectionBundlesPath, JSON.stringify({
    schemaVersion: "0.1.0",
    donorId,
    donorName: "Section Action Smoke Donor",
    generatedAt: new Date().toISOString(),
    sectionCount: 1,
    sections: [
      {
        familyName: "big_win",
        sectionKey: "big_win/BW",
        sectionType: "spine-skin",
        skinName: "BW",
        readiness: "ready-with-local-sources",
        profileState: "ready-for-spine-atlas-reconstruction",
        sectionState: "ready-for-skin-reconstruction",
        bundleState: "ready-with-grounded-attachments",
        attachmentCount: 4,
        mappedAttachmentCount: 4,
        unmappedAttachmentCount: 0,
        atlasPageCount: 2,
        atlasPageNames: ["big_win.png", "big_win_2.png"],
        atlasRegionCount: 4,
        atlasRegionNames: ["BW_back", "decor", "decor2", "shine"],
        slotNames: ["background", "decor", "decor2", "shine"],
        animationNames: ["idle"],
        exactLocalSourceCount: 2,
        relatedLocalSourceCount: 1,
        localSources: [
          {
            localPath: "10_donors/example/files/img/big-win/big-win-bg.png_80_90.png",
            sourceUrl: "https://example.invalid/img/big-win/big-win-bg.png_80_90.png",
            resolvedUrl: "https://example.invalid/img/big-win/big-win-bg.png_80_90.png",
            sourceKind: "bundle-image-variant",
            relation: "same-family",
            familyName: "big_win",
            referenceText: "img/big-win/big-win-bg.png"
          }
        ],
        sampleLocalSourcePath: "10_donors/example/files/img/big-win/big-win-bg.png_80_90.png",
        reconstructionBundlePath: `10_donors/${donorId}/evidence/local_only/harvest/family-reconstruction-bundles/big_win.json`,
        reconstructionMapPath: `10_donors/${donorId}/evidence/local_only/harvest/family-reconstruction-maps.json`,
        nextSectionStep: "Use the grounded section bundle for deeper reconstruction.",
        attachments: [
          {
            skinName: "BW",
            slotName: "background",
            attachmentName: "BW_back",
            attachmentPath: "images/BW_back",
            matchType: "path-exact",
            regionName: "BW_back",
            pageName: "big_win_2.png"
          }
        ]
      }
    ]
  }, null, 2));

  const result = await runSectionAction({
    donorId,
    sectionKey: "big_win/BW"
  });

  assert.equal(result.donorId, donorId, "section action should preserve donor id");
  assert.equal(result.sectionKey, "big_win/BW", "section action should preserve section key");
  assert.equal(result.status, "prepared", "grounded section should prepare a workset");
  assert.ok(result.worksetPath, "section action should write a workset");
  assert.equal(result.mappedAttachmentCount, 4, "section action should preserve mapped attachment counts");
  assert.equal(result.exactLocalSourceCount, 2, "section action should preserve exact local source counts");

  const sectionActionRunPath = path.join(donorRoot, "section-action-run.json");
  const sectionActionRun = JSON.parse(await fs.readFile(sectionActionRunPath, "utf8")) as {
    sectionKey?: string;
    status?: string;
    worksetPath?: string | null;
    mappedAttachmentCount?: number;
  };
  assert.equal(sectionActionRun.sectionKey, "big_win/BW", "section action run should preserve section key");
  assert.equal(sectionActionRun.status, "prepared", "section action run should preserve prepared status");
  assert.ok(sectionActionRun.worksetPath, "section action run should point at the prepared workset");
  assert.equal(sectionActionRun.mappedAttachmentCount, 4, "section action run should persist mapped attachment counts");

  const worksetPath = result.worksetPath ?? "";
  const resolvedWorksetPath = path.isAbsolute(worksetPath) ? worksetPath : path.join(workspaceRoot, worksetPath);
  const workset = JSON.parse(await fs.readFile(resolvedWorksetPath, "utf8")) as {
    sectionKey?: string;
    attachmentCount?: number;
    atlasPageNames?: string[];
    localSources?: Array<{ localPath?: string }>;
  };
  assert.equal(workset.sectionKey, "big_win/BW", "section workset should preserve section key");
  assert.equal(workset.attachmentCount, 4, "section workset should preserve attachment counts");
  assert.deepEqual(workset.atlasPageNames, ["big_win.png", "big_win_2.png"], "section workset should preserve atlas page names");
  assert.ok(Array.isArray(workset.localSources) && workset.localSources.length >= 1, "section workset should include grounded local sources");

  console.log("PASS donor-scan:section-action");
  console.log(`Donor: ${donorId}`);
  console.log(`Section: ${result.sectionKey}`);
  console.log(`Workset: ${result.worksetPath}`);
}

void main().catch((error) => {
  console.error("FAIL donor-scan:section-action");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
