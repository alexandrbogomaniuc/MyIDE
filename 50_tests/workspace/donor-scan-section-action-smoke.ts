import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import { runSectionAction } from "../../tools/donor-scan/runSectionAction";

const workspaceRoot = path.resolve(__dirname, "../../..");

async function main(): Promise<void> {
  const donorId = `donor_smoke_section_action_${Date.now().toString(36)}`;
  const donorRoot = path.join(workspaceRoot, "10_donors", donorId, "evidence", "local_only", "harvest");
  await fs.mkdir(donorRoot, { recursive: true });
  const localFilesRoot = path.join(donorRoot, "files", "cdn.example.invalid");
  await fs.mkdir(localFilesRoot, { recursive: true });
  await fs.writeFile(path.join(localFilesRoot, "big_win.atlas"), [
    "big_win.png",
    "size:1024,1024",
    "filter:Linear,Linear",
    "decor",
    "bounds:10,20,120,130",
    "decor2",
    "bounds:150,20,140,150",
    "shine",
    "bounds:320,20,160,180",
    "",
    "big_win_2.png",
    "size:1024,1024",
    "filter:Linear,Linear",
    "BW_back",
    "bounds:40,60,220,240"
  ].join("\n"));
  await fs.writeFile(path.join(localFilesRoot, "big_win.json"), JSON.stringify({
    skeleton: { spine: "4.1.0" },
    bones: [{ name: "root" }],
    slots: [{ name: "background", bone: "root" }],
    skins: [{ name: "BW", attachments: { background: { BW_back: { path: "images/BW_back" } } } }],
    animations: { idle: {} }
  }, null, 2));

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
            localPath: `10_donors/${donorId}/evidence/local_only/harvest/files/cdn.example.invalid/big_win.json`,
            sourceUrl: "https://example.invalid/img/spines/big_win.json",
            resolvedUrl: "https://example.invalid/img/spines/big_win.json",
            sourceKind: "bundle-reference",
            relation: "same-family",
            familyName: "big_win",
            referenceText: "img/spines/big_win.json"
          },
          {
            localPath: `10_donors/${donorId}/evidence/local_only/harvest/files/cdn.example.invalid/big_win.atlas`,
            sourceUrl: "https://example.invalid/img/spines/big_win.atlas",
            resolvedUrl: "https://example.invalid/img/spines/big_win.atlas",
            sourceKind: "harvest-local",
            relation: "same-family",
            familyName: "big_win",
            referenceText: "img/spines/big_win.atlas"
          },
          {
            localPath: "10_donors/example/files/img/big-win/big-win-bg.png_80_90.png",
            sourceUrl: "https://example.invalid/img/big-win/big-win-bg.png_80_90.png",
            resolvedUrl: "https://example.invalid/img/big-win/big-win-bg.png_80_90.png",
            sourceKind: "bundle-image-variant",
            relation: "related-family",
            familyName: "big_win.png",
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
          },
          {
            skinName: "BW",
            slotName: "decor",
            attachmentName: "decor",
            attachmentPath: "decor",
            matchType: "path-exact",
            regionName: "decor",
            pageName: "big_win.png"
          },
          {
            skinName: "BW",
            slotName: "decor2",
            attachmentName: "decor2",
            attachmentPath: "decor2",
            matchType: "path-exact",
            regionName: "decor2",
            pageName: "big_win.png"
          },
          {
            skinName: "BW",
            slotName: "shine",
            attachmentName: "shine",
            attachmentPath: "shine",
            matchType: "path-exact",
            regionName: "shine",
            pageName: "big_win.png"
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
  assert.ok(result.skinBlueprintPath, "section action should write a skin blueprint");
  assert.ok(result.skinRenderPlanPath, "section action should write a skin render plan");
  assert.ok(result.skinMaterialPlanPath, "section action should write a skin material plan");
  assert.equal(result.mappedAttachmentCount, 4, "section action should preserve mapped attachment counts");
  assert.equal(result.exactLocalSourceCount, 2, "section action should preserve exact local source counts");

  const sectionActionRunPath = path.join(donorRoot, "section-action-run.json");
  const sectionActionRun = JSON.parse(await fs.readFile(sectionActionRunPath, "utf8")) as {
    sectionKey?: string;
    status?: string;
    worksetPath?: string | null;
    reconstructionBundlePath?: string | null;
    skinBlueprintPath?: string | null;
    skinRenderPlanPath?: string | null;
    skinMaterialPlanPath?: string | null;
    mappedAttachmentCount?: number;
  };
  assert.equal(sectionActionRun.sectionKey, "big_win/BW", "section action run should preserve section key");
  assert.equal(sectionActionRun.status, "prepared", "section action run should preserve prepared status");
  assert.ok(sectionActionRun.worksetPath, "section action run should point at the prepared workset");
  assert.ok(sectionActionRun.reconstructionBundlePath, "section action run should point at the prepared reconstruction bundle");
  assert.ok(sectionActionRun.skinBlueprintPath, "section action run should point at the prepared skin blueprint");
  assert.ok(sectionActionRun.skinRenderPlanPath, "section action run should point at the prepared skin render plan");
  assert.ok(sectionActionRun.skinMaterialPlanPath, "section action run should point at the prepared skin material plan");
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

  const skinBlueprintPath = result.skinBlueprintPath ?? "";
  const resolvedSkinBlueprintPath = path.isAbsolute(skinBlueprintPath) ? skinBlueprintPath : path.join(workspaceRoot, skinBlueprintPath);
  const skinBlueprint = JSON.parse(await fs.readFile(resolvedSkinBlueprintPath, "utf8")) as {
    sectionKey?: string;
    blueprintState?: string;
    slotOrder?: string[];
    slots?: Array<{ slotName?: string; orderIndex?: number }>;
    pages?: Array<{ pageName?: string; orderIndex?: number }>;
  };
  assert.equal(skinBlueprint.sectionKey, "big_win/BW", "section skin blueprint should preserve section key");
  assert.equal(skinBlueprint.blueprintState, "ready-for-slot-order-reconstruction", "section skin blueprint should mark grounded sections as slot-order ready");
  assert.ok(Array.isArray(skinBlueprint.slotOrder) && skinBlueprint.slotOrder.length >= 1, "section skin blueprint should expose slot order");
  assert.ok(Array.isArray(skinBlueprint.slots) && skinBlueprint.slots.length >= 1, "section skin blueprint should expose ordered slot records");
  assert.ok(Array.isArray(skinBlueprint.pages) && skinBlueprint.pages.length >= 1, "section skin blueprint should expose page records");

  const skinBlueprintProfilesPath = path.join(donorRoot, "section-skin-blueprint-profiles.json");
  const skinBlueprintProfiles = JSON.parse(await fs.readFile(skinBlueprintProfilesPath, "utf8")) as {
    sectionCount?: number;
    sections?: Array<{ sectionKey?: string; blueprintState?: string; blueprintPath?: string }>;
  };
  assert.ok((skinBlueprintProfiles.sectionCount ?? 0) >= 1, "section skin blueprint profiles should record prepared sections");
  const skinProfile = Array.isArray(skinBlueprintProfiles.sections)
    ? skinBlueprintProfiles.sections.find((section) => section?.sectionKey === "big_win/BW")
    : null;
  assert.ok(skinProfile, "section skin blueprint profiles should include the prepared section");
  assert.equal(skinProfile?.blueprintState, "ready-for-slot-order-reconstruction", "section skin blueprint profiles should preserve blueprint readiness");

  const skinRenderPlanPath = result.skinRenderPlanPath ?? "";
  const resolvedSkinRenderPlanPath = path.isAbsolute(skinRenderPlanPath) ? skinRenderPlanPath : path.join(workspaceRoot, skinRenderPlanPath);
  const skinRenderPlan = JSON.parse(await fs.readFile(resolvedSkinRenderPlanPath, "utf8")) as {
    sectionKey?: string;
    renderState?: string;
    layerCount?: number;
    mappedLayerCount?: number;
    atlasSourcePath?: string | null;
    layers?: Array<{ slotName?: string; layerState?: string; bounds?: { width?: number } | null }>;
  };
  assert.equal(skinRenderPlan.sectionKey, "big_win/BW", "section skin render plan should preserve section key");
  assert.equal(skinRenderPlan.renderState, "ready-for-layered-render-reconstruction", "section skin render plan should mark atlas-grounded sections as render ready");
  assert.equal(skinRenderPlan.layerCount, 4, "section skin render plan should preserve ordered layer counts");
  assert.equal(skinRenderPlan.mappedLayerCount, 4, "section skin render plan should map each grounded layer");
  assert.equal(skinRenderPlan.atlasSourcePath, `10_donors/${donorId}/evidence/local_only/harvest/files/cdn.example.invalid/big_win.atlas`, "section skin render plan should retain the local atlas source path");
  assert.ok(Array.isArray(skinRenderPlan.layers) && skinRenderPlan.layers.length === 4, "section skin render plan should expose ordered layers");
  assert.equal(skinRenderPlan.layers?.[0]?.slotName, "background", "section skin render plan should preserve slot order");
  assert.equal(skinRenderPlan.layers?.[0]?.layerState, "atlas-region-exact", "section skin render plan should record atlas-region matches");
  assert.equal(skinRenderPlan.layers?.[0]?.bounds?.width, 220, "section skin render plan should preserve atlas geometry");

  const skinRenderPlanProfilesPath = path.join(donorRoot, "section-skin-render-plan-profiles.json");
  const skinRenderPlanProfiles = JSON.parse(await fs.readFile(skinRenderPlanProfilesPath, "utf8")) as {
    sectionCount?: number;
    sections?: Array<{ sectionKey?: string; renderState?: string; renderPlanPath?: string }>;
  };
  assert.ok((skinRenderPlanProfiles.sectionCount ?? 0) >= 1, "section skin render plan profiles should record prepared sections");
  const renderProfile = Array.isArray(skinRenderPlanProfiles.sections)
    ? skinRenderPlanProfiles.sections.find((section) => section?.sectionKey === "big_win/BW")
    : null;
  assert.ok(renderProfile, "section skin render plan profiles should include the prepared section");
  assert.equal(renderProfile?.renderState, "ready-for-layered-render-reconstruction", "section skin render plan profiles should preserve render readiness");

  const skinMaterialPlanPath = result.skinMaterialPlanPath ?? "";
  const resolvedSkinMaterialPlanPath = path.isAbsolute(skinMaterialPlanPath) ? skinMaterialPlanPath : path.join(workspaceRoot, skinMaterialPlanPath);
  const skinMaterialPlan = JSON.parse(await fs.readFile(resolvedSkinMaterialPlanPath, "utf8")) as {
    sectionKey?: string;
    materialState?: string;
    pageCount?: number;
    exactPageImageCount?: number;
    missingPageImageCount?: number;
    relatedImageCandidateCount?: number;
    pages?: Array<{ pageName?: string; exactPageLocalPath?: string | null }>;
  };
  assert.equal(skinMaterialPlan.sectionKey, "big_win/BW", "section skin material plan should preserve section key");
  assert.equal(skinMaterialPlan.materialState, "needs-related-image-review", "section skin material plan should explain when only related images are local");
  assert.equal(skinMaterialPlan.pageCount, 2, "section skin material plan should expose atlas page coverage");
  assert.equal(skinMaterialPlan.exactPageImageCount, 0, "section skin material plan should record missing exact page images in the smoke fixture");
  assert.equal(skinMaterialPlan.missingPageImageCount, 2, "section skin material plan should count missing atlas pages");
  assert.ok((skinMaterialPlan.relatedImageCandidateCount ?? 0) >= 1, "section skin material plan should preserve related image candidates");
  assert.ok(Array.isArray(skinMaterialPlan.pages) && skinMaterialPlan.pages.length === 2, "section skin material plan should expose page material records");

  const skinMaterialPlanProfilesPath = path.join(donorRoot, "section-skin-material-plan-profiles.json");
  const skinMaterialPlanProfiles = JSON.parse(await fs.readFile(skinMaterialPlanProfilesPath, "utf8")) as {
    sectionCount?: number;
    sections?: Array<{ sectionKey?: string; materialState?: string; materialPlanPath?: string }>;
  };
  assert.ok((skinMaterialPlanProfiles.sectionCount ?? 0) >= 1, "section skin material plan profiles should record prepared sections");
  const materialProfile = Array.isArray(skinMaterialPlanProfiles.sections)
    ? skinMaterialPlanProfiles.sections.find((section) => section?.sectionKey === "big_win/BW")
    : null;
  assert.ok(materialProfile, "section skin material plan profiles should include the prepared section");
  assert.equal(materialProfile?.materialState, "needs-related-image-review", "section skin material plan profiles should preserve material readiness");

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
