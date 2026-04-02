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
  assert.ok(result.reconstructionBundlePath, "section action should write a reconstruction bundle");
  assert.equal(result.mappedAttachmentCount, 4, "section action should preserve mapped attachment counts");
  assert.equal(result.exactLocalSourceCount, 2, "section action should preserve exact local source counts");

  const sectionActionRunPath = path.join(donorRoot, "section-action-run.json");
  const sectionActionRun = JSON.parse(await fs.readFile(sectionActionRunPath, "utf8")) as {
    sectionKey?: string;
    status?: string;
    worksetPath?: string | null;
    reconstructionBundlePath?: string | null;
    mappedAttachmentCount?: number;
  };
  assert.equal(sectionActionRun.sectionKey, "big_win/BW", "section action run should preserve section key");
  assert.equal(sectionActionRun.status, "prepared", "section action run should preserve prepared status");
  assert.ok(sectionActionRun.worksetPath, "section action run should point at the prepared workset");
  assert.ok(sectionActionRun.reconstructionBundlePath, "section action run should point at the prepared reconstruction bundle");
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

  const reconstructionBundlePath = result.reconstructionBundlePath ?? "";
  const resolvedBundlePath = path.isAbsolute(reconstructionBundlePath) ? reconstructionBundlePath : path.join(workspaceRoot, reconstructionBundlePath);
  const reconstructionBundle = JSON.parse(await fs.readFile(resolvedBundlePath, "utf8")) as {
    sectionKey?: string;
    reconstructionState?: string;
    pageGroups?: Array<{ pageName?: string; attachmentCount?: number }>;
    slotGroups?: Array<{ slotName?: string; attachmentCount?: number }>;
    exactLocalSourceCount?: number;
  };
  assert.equal(reconstructionBundle.sectionKey, "big_win/BW", "section reconstruction bundle should preserve section key");
  assert.equal(reconstructionBundle.reconstructionState, "ready-for-section-skin-reconstruction", "section reconstruction bundle should mark grounded sections as ready");
  assert.ok(Array.isArray(reconstructionBundle.pageGroups) && reconstructionBundle.pageGroups.length >= 1, "section reconstruction bundle should expose page groups");
  assert.ok(Array.isArray(reconstructionBundle.slotGroups) && reconstructionBundle.slotGroups.length >= 1, "section reconstruction bundle should expose slot groups");
  assert.equal(reconstructionBundle.exactLocalSourceCount, 2, "section reconstruction bundle should preserve exact local source counts");

  const reconstructionProfilesPath = path.join(donorRoot, "section-reconstruction-profiles.json");
  const reconstructionProfiles = JSON.parse(await fs.readFile(reconstructionProfilesPath, "utf8")) as {
    sectionCount?: number;
    sections?: Array<{ sectionKey?: string; reconstructionState?: string; reconstructionBundlePath?: string }>;
  };
  assert.ok((reconstructionProfiles.sectionCount ?? 0) >= 1, "section reconstruction profiles should record prepared sections");
  const sectionProfile = Array.isArray(reconstructionProfiles.sections)
    ? reconstructionProfiles.sections.find((section) => section?.sectionKey === "big_win/BW")
    : null;
  assert.ok(sectionProfile, "section reconstruction profiles should include the prepared section");
  assert.equal(sectionProfile?.reconstructionState, "ready-for-section-skin-reconstruction", "section reconstruction profiles should preserve readiness");

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
