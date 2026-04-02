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
  assert.ok(result.skinMaterialReviewBundlePath, "section action should write a skin material review bundle");
  assert.ok(result.skinPageMatchBundlePath, "section action should write a skin page match bundle");
  assert.ok(result.skinPageLockBundlePath, "section action should write a skin page lock bundle");
  assert.ok(result.skinPageLockAuditBundlePath, "section action should write a skin page lock audit bundle");
  assert.ok(result.skinPageLockResolutionBundlePath, "section action should write a skin page lock resolution bundle");
  assert.ok(result.skinPageLockDecisionBundlePath, "section action should write a skin page lock decision bundle");
  assert.ok(result.skinPageLockReviewBundlePath, "section action should write a skin page lock review bundle");
  assert.ok(result.skinTextureInputBundlePath, "section action should write a skin texture input bundle");
  assert.ok(result.skinTextureSourcePlanPath, "section action should write a skin texture source plan");
  assert.ok(result.skinTextureReconstructionBundlePath, "section action should write a skin texture reconstruction bundle");
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
    skinMaterialReviewBundlePath?: string | null;
    skinPageMatchBundlePath?: string | null;
    skinPageLockBundlePath?: string | null;
    skinPageLockAuditBundlePath?: string | null;
    skinPageLockResolutionBundlePath?: string | null;
    skinPageLockDecisionBundlePath?: string | null;
    skinPageLockReviewBundlePath?: string | null;
    skinTextureInputBundlePath?: string | null;
    skinTextureSourcePlanPath?: string | null;
    skinTextureReconstructionBundlePath?: string | null;
    mappedAttachmentCount?: number;
  };
  assert.equal(sectionActionRun.sectionKey, "big_win/BW", "section action run should preserve section key");
  assert.equal(sectionActionRun.status, "prepared", "section action run should preserve prepared status");
  assert.ok(sectionActionRun.worksetPath, "section action run should point at the prepared workset");
  assert.ok(sectionActionRun.reconstructionBundlePath, "section action run should point at the prepared reconstruction bundle");
  assert.ok(sectionActionRun.skinBlueprintPath, "section action run should point at the prepared skin blueprint");
  assert.ok(sectionActionRun.skinRenderPlanPath, "section action run should point at the prepared skin render plan");
  assert.ok(sectionActionRun.skinMaterialPlanPath, "section action run should point at the prepared skin material plan");
  assert.ok(sectionActionRun.skinMaterialReviewBundlePath, "section action run should point at the prepared skin material review bundle");
  assert.ok(sectionActionRun.skinPageMatchBundlePath, "section action run should point at the prepared skin page match bundle");
  assert.ok(sectionActionRun.skinPageLockBundlePath, "section action run should point at the prepared skin page lock bundle");
  assert.ok(sectionActionRun.skinPageLockAuditBundlePath, "section action run should point at the prepared skin page lock audit bundle");
  assert.ok(sectionActionRun.skinPageLockResolutionBundlePath, "section action run should point at the prepared skin page lock resolution bundle");
  assert.ok(sectionActionRun.skinPageLockDecisionBundlePath, "section action run should point at the prepared skin page lock decision bundle");
  assert.ok(sectionActionRun.skinPageLockReviewBundlePath, "section action run should point at the prepared skin page lock review bundle");
  assert.ok(sectionActionRun.skinTextureInputBundlePath, "section action run should point at the prepared skin texture input bundle");
  assert.ok(sectionActionRun.skinTextureSourcePlanPath, "section action run should point at the prepared skin texture source plan");
  assert.ok(sectionActionRun.skinTextureReconstructionBundlePath, "section action run should point at the prepared skin texture reconstruction bundle");
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
    pageCandidateReadyCount?: number;
    relatedImageCandidateCount?: number;
    topCandidateLocalPath?: string | null;
    pages?: Array<{
      pageName?: string;
      exactPageLocalPath?: string | null;
      topRelatedImageCandidates?: Array<{ localPath?: string; score?: number; matchedTokens?: string[] }>;
    }>;
  };
  assert.equal(skinMaterialPlan.sectionKey, "big_win/BW", "section skin material plan should preserve section key");
  assert.equal(skinMaterialPlan.materialState, "needs-related-image-review", "section skin material plan should explain when only related images are local");
  assert.equal(skinMaterialPlan.pageCount, 2, "section skin material plan should expose atlas page coverage");
  assert.equal(skinMaterialPlan.exactPageImageCount, 0, "section skin material plan should record missing exact page images in the smoke fixture");
  assert.equal(skinMaterialPlan.missingPageImageCount, 2, "section skin material plan should count missing atlas pages");
  assert.equal(skinMaterialPlan.pageCandidateReadyCount, 2, "section skin material plan should record pages with ranked candidates");
  assert.ok((skinMaterialPlan.relatedImageCandidateCount ?? 0) >= 1, "section skin material plan should preserve related image candidates");
  assert.ok(typeof skinMaterialPlan.topCandidateLocalPath === "string" && skinMaterialPlan.topCandidateLocalPath.length > 0, "section skin material plan should preserve a top candidate preview path");
  assert.ok(Array.isArray(skinMaterialPlan.pages) && skinMaterialPlan.pages.length === 2, "section skin material plan should expose page material records");
  assert.ok(Array.isArray(skinMaterialPlan.pages?.[0]?.topRelatedImageCandidates) && (skinMaterialPlan.pages?.[0]?.topRelatedImageCandidates?.length ?? 0) >= 1, "section skin material plan should rank page candidates");
  assert.ok((skinMaterialPlan.pages?.[0]?.topRelatedImageCandidates?.[0]?.score ?? 0) > 0, "section skin material plan should score ranked candidates");

  const skinMaterialPlanProfilesPath = path.join(donorRoot, "section-skin-material-plan-profiles.json");
  const skinMaterialPlanProfiles = JSON.parse(await fs.readFile(skinMaterialPlanProfilesPath, "utf8")) as {
    sectionCount?: number;
    sections?: Array<{ sectionKey?: string; materialState?: string; materialPlanPath?: string; pageCandidateReadyCount?: number; topCandidateLocalPath?: string | null }>;
  };
  assert.ok((skinMaterialPlanProfiles.sectionCount ?? 0) >= 1, "section skin material plan profiles should record prepared sections");
  const materialProfile = Array.isArray(skinMaterialPlanProfiles.sections)
    ? skinMaterialPlanProfiles.sections.find((section) => section?.sectionKey === "big_win/BW")
    : null;
  assert.ok(materialProfile, "section skin material plan profiles should include the prepared section");
  assert.equal(materialProfile?.materialState, "needs-related-image-review", "section skin material plan profiles should preserve material readiness");
  assert.equal(materialProfile?.pageCandidateReadyCount, 2, "section skin material plan profiles should preserve ranked page coverage");
  assert.ok(typeof materialProfile?.topCandidateLocalPath === "string" && materialProfile.topCandidateLocalPath.length > 0, "section skin material plan profiles should preserve a top candidate preview path");

  const skinMaterialReviewBundlePath = result.skinMaterialReviewBundlePath ?? "";
  const resolvedSkinMaterialReviewBundlePath = path.isAbsolute(skinMaterialReviewBundlePath) ? skinMaterialReviewBundlePath : path.join(workspaceRoot, skinMaterialReviewBundlePath);
  const skinMaterialReviewBundle = JSON.parse(await fs.readFile(resolvedSkinMaterialReviewBundlePath, "utf8")) as {
    sectionKey?: string;
    reviewState?: string;
    reviewReadyPageCount?: number;
    blockedPageCount?: number;
    pages?: Array<{
      pageName?: string;
      pageState?: string;
      recommendedCandidateLocalPath?: string | null;
      recommendedCandidateScore?: number | null;
      topCandidates?: Array<{ localPath?: string }>;
    }>;
  };
  assert.equal(skinMaterialReviewBundle.sectionKey, "big_win/BW", "section skin material review bundle should preserve section key");
  assert.equal(skinMaterialReviewBundle.reviewState, "ready-for-candidate-review", "section skin material review bundle should mark candidate-ready sections clearly");
  assert.equal(skinMaterialReviewBundle.reviewReadyPageCount, 2, "section skin material review bundle should count review-ready pages");
  assert.equal(skinMaterialReviewBundle.blockedPageCount, 0, "section skin material review bundle should keep candidate-backed pages out of the blocked count");
  assert.ok(Array.isArray(skinMaterialReviewBundle.pages) && skinMaterialReviewBundle.pages.length === 2, "section skin material review bundle should expose per-page review records");
  assert.equal(skinMaterialReviewBundle.pages?.[0]?.pageState, "needs-candidate-review", "section skin material review bundle should mark missing exact pages for candidate review");
  assert.ok(typeof skinMaterialReviewBundle.pages?.[0]?.recommendedCandidateLocalPath === "string" && skinMaterialReviewBundle.pages[0].recommendedCandidateLocalPath.length > 0, "section skin material review bundle should pick a recommended candidate");
  assert.ok((skinMaterialReviewBundle.pages?.[0]?.recommendedCandidateScore ?? 0) > 0, "section skin material review bundle should preserve the recommended candidate score");

  const skinMaterialReviewBundleProfilesPath = path.join(donorRoot, "section-skin-material-review-bundle-profiles.json");
  const skinMaterialReviewBundleProfiles = JSON.parse(await fs.readFile(skinMaterialReviewBundleProfilesPath, "utf8")) as {
    sectionCount?: number;
    sections?: Array<{ sectionKey?: string; reviewState?: string; reviewBundlePath?: string; reviewReadyPageCount?: number; blockedPageCount?: number }>;
  };
  assert.ok((skinMaterialReviewBundleProfiles.sectionCount ?? 0) >= 1, "section skin material review bundle profiles should record prepared sections");
  const materialReviewProfile = Array.isArray(skinMaterialReviewBundleProfiles.sections)
    ? skinMaterialReviewBundleProfiles.sections.find((section) => section?.sectionKey === "big_win/BW")
    : null;
  assert.ok(materialReviewProfile, "section skin material review bundle profiles should include the prepared section");
  assert.equal(materialReviewProfile?.reviewState, "ready-for-candidate-review", "section skin material review bundle profiles should preserve review readiness");
  assert.equal(materialReviewProfile?.reviewReadyPageCount, 2, "section skin material review bundle profiles should preserve review-ready page counts");
  assert.equal(materialReviewProfile?.blockedPageCount, 0, "section skin material review bundle profiles should preserve blocked page counts");

  const skinPageMatchBundlePath = result.skinPageMatchBundlePath ?? "";
  const resolvedSkinPageMatchBundlePath = path.isAbsolute(skinPageMatchBundlePath) ? skinPageMatchBundlePath : path.join(workspaceRoot, skinPageMatchBundlePath);
  const skinPageMatchBundle = JSON.parse(await fs.readFile(resolvedSkinPageMatchBundlePath, "utf8")) as {
    sectionKey?: string;
    matchState?: string;
    pageCount?: number;
    proposedMatchCount?: number;
    blockedPageCount?: number;
    pages?: Array<{
      pageName?: string;
      pageState?: string;
      proposedMatchLocalPath?: string | null;
      proposedMatchScore?: number | null;
      proposedMatchReasons?: string[];
    }>;
  };
  assert.equal(skinPageMatchBundle.sectionKey, "big_win/BW", "section skin page match bundle should preserve section key");
  assert.equal(skinPageMatchBundle.matchState, "ready-for-page-match-lock", "section skin page match bundle should mark candidate-backed sections as ready for page-match lock");
  assert.equal(skinPageMatchBundle.pageCount, 2, "section skin page match bundle should preserve atlas page count");
  assert.equal(skinPageMatchBundle.proposedMatchCount, 2, "section skin page match bundle should count proposed page matches");
  assert.equal(skinPageMatchBundle.blockedPageCount, 0, "section skin page match bundle should keep candidate-backed pages out of the blocked count");
  assert.ok(Array.isArray(skinPageMatchBundle.pages) && skinPageMatchBundle.pages.length === 2, "section skin page match bundle should expose per-page match rows");
  assert.equal(skinPageMatchBundle.pages?.[0]?.pageState, "proposed-page-match", "section skin page match bundle should mark candidate-backed pages as proposed matches");
  assert.ok(typeof skinPageMatchBundle.pages?.[0]?.proposedMatchLocalPath === "string" && skinPageMatchBundle.pages[0].proposedMatchLocalPath.length > 0, "section skin page match bundle should preserve the proposed local match");
  assert.ok((skinPageMatchBundle.pages?.[0]?.proposedMatchScore ?? 0) > 0, "section skin page match bundle should preserve the proposed match score");
  assert.ok(Array.isArray(skinPageMatchBundle.pages?.[0]?.proposedMatchReasons) && (skinPageMatchBundle.pages?.[0]?.proposedMatchReasons?.length ?? 0) >= 1, "section skin page match bundle should preserve grounded proposal reasons");

  const skinPageMatchBundleProfilesPath = path.join(donorRoot, "section-skin-page-match-bundle-profiles.json");
  const skinPageMatchBundleProfiles = JSON.parse(await fs.readFile(skinPageMatchBundleProfilesPath, "utf8")) as {
    sectionCount?: number;
    sections?: Array<{ sectionKey?: string; matchState?: string; pageMatchBundlePath?: string; proposedMatchCount?: number; blockedPageCount?: number }>;
  };
  assert.ok((skinPageMatchBundleProfiles.sectionCount ?? 0) >= 1, "section skin page match bundle profiles should record prepared sections");
  const pageMatchProfile = Array.isArray(skinPageMatchBundleProfiles.sections)
    ? skinPageMatchBundleProfiles.sections.find((section) => section?.sectionKey === "big_win/BW")
    : null;
  assert.ok(pageMatchProfile, "section skin page match bundle profiles should include the prepared section");
  assert.equal(pageMatchProfile?.matchState, "ready-for-page-match-lock", "section skin page match bundle profiles should preserve page-match readiness");
  assert.equal(pageMatchProfile?.proposedMatchCount, 2, "section skin page match bundle profiles should preserve proposed match counts");
  assert.equal(pageMatchProfile?.blockedPageCount, 0, "section skin page match bundle profiles should preserve blocked page counts");

  const skinPageLockBundlePath = result.skinPageLockBundlePath ?? "";
  const resolvedSkinPageLockBundlePath = path.isAbsolute(skinPageLockBundlePath)
    ? skinPageLockBundlePath
    : path.join(workspaceRoot, skinPageLockBundlePath);
  const skinPageLockBundle = JSON.parse(await fs.readFile(resolvedSkinPageLockBundlePath, "utf8")) as {
    sectionKey?: string;
    pageLockState?: string;
    pageCount?: number;
    exactPageLockCount?: number;
    proposedPageLockCount?: number;
    missingPageLockCount?: number;
    reconstructableLayerCount?: number;
    blockedLayerCount?: number;
    pages?: Array<{
      pageName?: string;
      pageState?: string;
      selectedLocalPath?: string | null;
      proposedMatchScore?: number | null;
    }>;
  };
  assert.equal(skinPageLockBundle.sectionKey, "big_win/BW", "section skin page lock bundle should preserve section key");
  assert.equal(skinPageLockBundle.pageLockState, "ready-for-page-lock-review", "section skin page lock bundle should stay provisional when page locks are still proposed");
  assert.equal(skinPageLockBundle.pageCount, 2, "section skin page lock bundle should preserve page counts");
  assert.equal(skinPageLockBundle.exactPageLockCount, 0, "section skin page lock bundle should preserve missing exact page locks");
  assert.equal(skinPageLockBundle.proposedPageLockCount, 2, "section skin page lock bundle should count proposed page locks");
  assert.equal(skinPageLockBundle.missingPageLockCount, 0, "section skin page lock bundle should avoid false missing page locks");
  assert.equal(skinPageLockBundle.reconstructableLayerCount, 4, "section skin page lock bundle should preserve reconstructable layer counts");
  assert.equal(skinPageLockBundle.blockedLayerCount, 0, "section skin page lock bundle should avoid false blocked layers");
  assert.ok(Array.isArray(skinPageLockBundle.pages) && skinPageLockBundle.pages.length === 2, "section skin page lock bundle should expose per-page lock rows");
  assert.equal(skinPageLockBundle.pages?.[0]?.pageState, "proposed-page-lock", "section skin page lock bundle should mark provisional matches as proposed page locks");
  assert.ok(typeof skinPageLockBundle.pages?.[0]?.selectedLocalPath === "string" && skinPageLockBundle.pages[0].selectedLocalPath.length > 0, "section skin page lock bundle should preserve the selected local path");
  assert.ok((skinPageLockBundle.pages?.[0]?.proposedMatchScore ?? 0) > 0, "section skin page lock bundle should preserve proposal scores");

  const skinPageLockBundleProfilesPath = path.join(donorRoot, "section-skin-page-lock-bundle-profiles.json");
  const skinPageLockBundleProfiles = JSON.parse(await fs.readFile(skinPageLockBundleProfilesPath, "utf8")) as {
    sectionCount?: number;
    sections?: Array<{ sectionKey?: string; pageLockState?: string; pageLockBundlePath?: string; proposedPageLockCount?: number; missingPageLockCount?: number }>;
  };
  assert.ok((skinPageLockBundleProfiles.sectionCount ?? 0) >= 1, "section skin page lock bundle profiles should record prepared sections");
  const pageLockProfile = Array.isArray(skinPageLockBundleProfiles.sections)
    ? skinPageLockBundleProfiles.sections.find((section) => section?.sectionKey === "big_win/BW")
    : null;
  assert.ok(pageLockProfile, "section skin page lock bundle profiles should include the prepared section");
  assert.equal(pageLockProfile?.pageLockState, "ready-for-page-lock-review", "section skin page lock bundle profiles should preserve page-lock readiness");
  assert.equal(pageLockProfile?.proposedPageLockCount, 2, "section skin page lock bundle profiles should preserve proposed page-lock counts");
  assert.equal(pageLockProfile?.missingPageLockCount, 0, "section skin page lock bundle profiles should preserve missing page-lock counts");

  const skinPageLockAuditBundlePath = result.skinPageLockAuditBundlePath ?? "";
  const resolvedSkinPageLockAuditBundlePath = path.isAbsolute(skinPageLockAuditBundlePath) ? skinPageLockAuditBundlePath : path.join(workspaceRoot, skinPageLockAuditBundlePath);
  const skinPageLockAuditBundle = JSON.parse(await fs.readFile(resolvedSkinPageLockAuditBundlePath, "utf8")) as {
    sectionKey?: string;
    pageLockAuditState?: string;
    pageCount?: number;
    uniqueSelectedLocalPathCount?: number;
    duplicateSourceGroupCount?: number;
    duplicateSourcePageCount?: number;
    pages?: Array<{ pageState?: string; duplicateSourcePageCount?: number }>;
    duplicateSourceGroups?: Array<{ pageCount?: number }>;
  };
  assert.equal(skinPageLockAuditBundle.sectionKey, "big_win/BW", "section skin page lock audit bundle should preserve section key");
  assert.equal(skinPageLockAuditBundle.pageLockAuditState, "has-page-lock-conflicts", "section skin page lock audit bundle should flag duplicate source reuse");
  assert.equal(skinPageLockAuditBundle.pageCount, 2, "section skin page lock audit bundle should preserve page counts");
  assert.equal(skinPageLockAuditBundle.uniqueSelectedLocalPathCount, 1, "section skin page lock audit bundle should count unique selected local paths");
  assert.equal(skinPageLockAuditBundle.duplicateSourceGroupCount, 1, "section skin page lock audit bundle should record one duplicate source group");
  assert.equal(skinPageLockAuditBundle.duplicateSourcePageCount, 2, "section skin page lock audit bundle should record duplicate page counts");
  assert.ok(Array.isArray(skinPageLockAuditBundle.pages) && skinPageLockAuditBundle.pages.length === 2, "section skin page lock audit bundle should expose per-page audit rows");
  assert.equal(skinPageLockAuditBundle.pages?.[0]?.pageState, "duplicate-source-conflict", "section skin page lock audit bundle should mark duplicate source conflicts");
  assert.equal(skinPageLockAuditBundle.pages?.[0]?.duplicateSourcePageCount, 2, "section skin page lock audit bundle should preserve duplicate source counts");
  assert.ok(Array.isArray(skinPageLockAuditBundle.duplicateSourceGroups) && skinPageLockAuditBundle.duplicateSourceGroups.length === 1, "section skin page lock audit bundle should expose duplicate source groups");
  assert.equal(skinPageLockAuditBundle.duplicateSourceGroups?.[0]?.pageCount, 2, "section skin page lock audit bundle should preserve duplicate group size");

  const skinPageLockAuditBundleProfilesPath = path.join(donorRoot, "section-skin-page-lock-audit-bundle-profiles.json");
  const skinPageLockAuditBundleProfiles = JSON.parse(await fs.readFile(skinPageLockAuditBundleProfilesPath, "utf8")) as {
    sectionCount?: number;
    sections?: Array<{ sectionKey?: string; pageLockAuditState?: string; duplicateSourceGroupCount?: number; duplicateSourcePageCount?: number }>;
  };
  assert.ok((skinPageLockAuditBundleProfiles.sectionCount ?? 0) >= 1, "section skin page lock audit bundle profiles should record prepared sections");
  const pageLockAuditProfile = Array.isArray(skinPageLockAuditBundleProfiles.sections)
    ? skinPageLockAuditBundleProfiles.sections.find((section) => section?.sectionKey === "big_win/BW")
    : null;
  assert.ok(pageLockAuditProfile, "section skin page lock audit bundle profiles should include the prepared section");
  assert.equal(pageLockAuditProfile?.pageLockAuditState, "has-page-lock-conflicts", "section skin page lock audit bundle profiles should preserve audit state");
  assert.equal(pageLockAuditProfile?.duplicateSourceGroupCount, 1, "section skin page lock audit bundle profiles should preserve duplicate source group counts");
  assert.equal(pageLockAuditProfile?.duplicateSourcePageCount, 2, "section skin page lock audit bundle profiles should preserve duplicate source page counts");

  const skinPageLockResolutionBundlePath = result.skinPageLockResolutionBundlePath ?? "";
  const resolvedSkinPageLockResolutionBundlePath = path.isAbsolute(skinPageLockResolutionBundlePath)
    ? skinPageLockResolutionBundlePath
    : path.join(workspaceRoot, skinPageLockResolutionBundlePath);
  const skinPageLockResolutionBundle = JSON.parse(await fs.readFile(resolvedSkinPageLockResolutionBundlePath, "utf8")) as {
    sectionKey?: string;
    pageLockResolutionState?: string;
    pageCount?: number;
    exactPageLockCount?: number;
    proposedPageLockCount?: number;
    missingPageLockCount?: number;
    resolvedConflictPageCount?: number;
    unresolvedConflictPageCount?: number;
    uniqueResolvedLocalPathCount?: number;
    duplicateSourceGroupCount?: number;
    duplicateSourcePageCount?: number;
    topResolvedLocalPath?: string | null;
    pages?: Array<{
      pageName?: string;
      pageState?: string;
      resolvedLocalPath?: string | null;
      candidateCount?: number;
      selectedCandidateRank?: number | null;
      duplicateSourcePageCount?: number;
    }>;
  };
  assert.equal(skinPageLockResolutionBundle.sectionKey, "big_win/BW", "section skin page lock resolution bundle should preserve section key");
  assert.equal(skinPageLockResolutionBundle.pageLockResolutionState, "has-unresolved-page-lock-conflicts", "section skin page lock resolution bundle should stay blocked when the smoke fixture cannot produce unique local paths for every conflicting page");
  assert.equal(skinPageLockResolutionBundle.pageCount, 2, "section skin page lock resolution bundle should preserve page counts");
  assert.equal(skinPageLockResolutionBundle.exactPageLockCount, 0, "section skin page lock resolution bundle should preserve missing exact page locks");
  assert.equal(skinPageLockResolutionBundle.proposedPageLockCount, 2, "section skin page lock resolution bundle should preserve proposed page-lock counts");
  assert.equal(skinPageLockResolutionBundle.missingPageLockCount, 0, "section skin page lock resolution bundle should avoid false missing page locks");
  assert.equal(skinPageLockResolutionBundle.resolvedConflictPageCount, 1, "section skin page lock resolution bundle should resolve as many duplicate conflicts as the candidate graph allows");
  assert.equal(skinPageLockResolutionBundle.unresolvedConflictPageCount, 1, "section skin page lock resolution bundle should leave one unresolved conflict when unique candidates run out");
  assert.equal(skinPageLockResolutionBundle.uniqueResolvedLocalPathCount, 1, "section skin page lock resolution bundle should preserve unique resolved local source counts");
  assert.equal(skinPageLockResolutionBundle.duplicateSourceGroupCount, 1, "section skin page lock resolution bundle should preserve duplicate source group counts");
  assert.equal(skinPageLockResolutionBundle.duplicateSourcePageCount, 2, "section skin page lock resolution bundle should preserve duplicate source page counts");
  assert.ok(typeof skinPageLockResolutionBundle.topResolvedLocalPath === "string" && skinPageLockResolutionBundle.topResolvedLocalPath.length > 0, "section skin page lock resolution bundle should expose a resolved local source preview");
  assert.ok(Array.isArray(skinPageLockResolutionBundle.pages) && skinPageLockResolutionBundle.pages.length === 2, "section skin page lock resolution bundle should expose per-page resolution rows");
  assert.ok(skinPageLockResolutionBundle.pages?.some((page) => page.pageState === "resolved-page-lock-conflict"), "section skin page lock resolution bundle should expose at least one resolved page-lock conflict");
  assert.ok(skinPageLockResolutionBundle.pages?.some((page) => page.pageState === "unresolved-page-lock-conflict"), "section skin page lock resolution bundle should expose unresolved page-lock conflicts when the candidate graph is insufficient");
  assert.ok(skinPageLockResolutionBundle.pages?.every((page) => (page.candidateCount ?? 0) >= 1), "section skin page lock resolution bundle should preserve candidate counts");

  const skinPageLockResolutionBundleProfilesPath = path.join(donorRoot, "section-skin-page-lock-resolution-bundle-profiles.json");
  const skinPageLockResolutionBundleProfiles = JSON.parse(await fs.readFile(skinPageLockResolutionBundleProfilesPath, "utf8")) as {
    sectionCount?: number;
    sections?: Array<{
      sectionKey?: string;
      pageLockResolutionState?: string;
      resolvedConflictPageCount?: number;
      unresolvedConflictPageCount?: number;
      uniqueResolvedLocalPathCount?: number;
      pageLockResolutionBundlePath?: string;
    }>;
  };
  assert.ok((skinPageLockResolutionBundleProfiles.sectionCount ?? 0) >= 1, "section skin page lock resolution bundle profiles should record prepared sections");
  const pageLockResolutionProfile = Array.isArray(skinPageLockResolutionBundleProfiles.sections)
    ? skinPageLockResolutionBundleProfiles.sections.find((section) => section?.sectionKey === "big_win/BW")
    : null;
  assert.ok(pageLockResolutionProfile, "section skin page lock resolution bundle profiles should include the prepared section");
  assert.equal(pageLockResolutionProfile?.pageLockResolutionState, "has-unresolved-page-lock-conflicts", "section skin page lock resolution bundle profiles should preserve resolution state");
  assert.equal(pageLockResolutionProfile?.resolvedConflictPageCount, 1, "section skin page lock resolution bundle profiles should preserve resolved conflict counts");
  assert.equal(pageLockResolutionProfile?.unresolvedConflictPageCount, 1, "section skin page lock resolution bundle profiles should preserve unresolved conflict counts");
  assert.equal(pageLockResolutionProfile?.uniqueResolvedLocalPathCount, 1, "section skin page lock resolution bundle profiles should preserve unique resolved local source counts");

  const skinPageLockDecisionBundlePath = result.skinPageLockDecisionBundlePath ?? "";
  const resolvedSkinPageLockDecisionBundlePath = path.isAbsolute(skinPageLockDecisionBundlePath)
    ? skinPageLockDecisionBundlePath
    : path.join(workspaceRoot, skinPageLockDecisionBundlePath);
  const skinPageLockDecisionBundle = JSON.parse(await fs.readFile(resolvedSkinPageLockDecisionBundlePath, "utf8")) as {
    sectionKey?: string;
    pageLockDecisionState?: string;
    pageCount?: number;
    exactPageLockCount?: number;
    reviewReadyPageCount?: number;
    unresolvedPageLockCount?: number;
    resolvedConflictPageCount?: number;
    uniqueResolvedLocalPathCount?: number;
    topDecisionLocalPath?: string | null;
    pages?: Array<{
      pageName?: string;
      pageState?: string;
      selectedLocalPath?: string | null;
      selectedCandidateScore?: number | null;
      selectedCandidateReasons?: string[];
      alternativeCandidateCount?: number;
    }>;
  };
  assert.equal(skinPageLockDecisionBundle.sectionKey, "big_win/BW", "section skin page lock decision bundle should preserve section key");
  assert.equal(skinPageLockDecisionBundle.pageLockDecisionState, "has-unresolved-page-lock-conflicts", "section skin page lock decision bundle should stay blocked when at least one conflicting page still lacks a unique grounded local source");
  assert.equal(skinPageLockDecisionBundle.pageCount, 2, "section skin page lock decision bundle should preserve page counts");
  assert.equal(skinPageLockDecisionBundle.exactPageLockCount, 0, "section skin page lock decision bundle should preserve missing exact page locks");
  assert.equal(skinPageLockDecisionBundle.reviewReadyPageCount, 1, "section skin page lock decision bundle should expose only the uniquely resolved page as review-ready in the smoke fixture");
  assert.equal(skinPageLockDecisionBundle.unresolvedPageLockCount, 1, "section skin page lock decision bundle should preserve unresolved page-lock counts");
  assert.equal(skinPageLockDecisionBundle.resolvedConflictPageCount, 1, "section skin page lock decision bundle should preserve resolved conflict counts");
  assert.equal(skinPageLockDecisionBundle.uniqueResolvedLocalPathCount, 1, "section skin page lock decision bundle should preserve unique resolved local source counts");
  assert.ok(typeof skinPageLockDecisionBundle.topDecisionLocalPath === "string" && skinPageLockDecisionBundle.topDecisionLocalPath.length > 0, "section skin page lock decision bundle should expose a top decision local source preview");
  assert.ok(Array.isArray(skinPageLockDecisionBundle.pages) && skinPageLockDecisionBundle.pages.length === 2, "section skin page lock decision bundle should expose per-page decision rows");
  assert.ok(skinPageLockDecisionBundle.pages?.some((page) => page.pageState === "ready-for-lock-review"), "section skin page lock decision bundle should expose a review-ready page when a unique grounded local source was found");
  assert.ok(skinPageLockDecisionBundle.pages?.some((page) => page.pageState === "unresolved-page-lock-conflict"), "section skin page lock decision bundle should preserve unresolved page-lock conflicts");
  const reviewReadyDecisionPage = skinPageLockDecisionBundle.pages?.find((page) => page.pageState === "ready-for-lock-review");
  assert.ok(typeof reviewReadyDecisionPage?.selectedLocalPath === "string" && reviewReadyDecisionPage.selectedLocalPath.length > 0, "section skin page lock decision bundle should preserve the selected local path for the review-ready page");
  assert.ok((reviewReadyDecisionPage?.selectedCandidateScore ?? 0) > 0, "section skin page lock decision bundle should preserve the selected candidate score");
  assert.ok(Array.isArray(reviewReadyDecisionPage?.selectedCandidateReasons) && (reviewReadyDecisionPage?.selectedCandidateReasons?.length ?? 0) >= 1, "section skin page lock decision bundle should preserve the selected candidate reasons");
  assert.ok((reviewReadyDecisionPage?.alternativeCandidateCount ?? 0) >= 0, "section skin page lock decision bundle should preserve alternative candidate counts");

  const skinPageLockDecisionBundleProfilesPath = path.join(donorRoot, "section-skin-page-lock-decision-bundle-profiles.json");
  const skinPageLockDecisionBundleProfiles = JSON.parse(await fs.readFile(skinPageLockDecisionBundleProfilesPath, "utf8")) as {
    sectionCount?: number;
    sections?: Array<{
      sectionKey?: string;
      pageLockDecisionState?: string;
      reviewReadyPageCount?: number;
      unresolvedPageLockCount?: number;
      resolvedConflictPageCount?: number;
      uniqueResolvedLocalPathCount?: number;
    }>;
  };
  assert.ok((skinPageLockDecisionBundleProfiles.sectionCount ?? 0) >= 1, "section skin page lock decision bundle profiles should record prepared sections");
  const pageLockDecisionProfile = Array.isArray(skinPageLockDecisionBundleProfiles.sections)
    ? skinPageLockDecisionBundleProfiles.sections.find((section) => section?.sectionKey === "big_win/BW")
    : null;
  assert.ok(pageLockDecisionProfile, "section skin page lock decision bundle profiles should include the prepared section");
  assert.equal(pageLockDecisionProfile?.pageLockDecisionState, "has-unresolved-page-lock-conflicts", "section skin page lock decision bundle profiles should preserve decision state");
  assert.equal(pageLockDecisionProfile?.reviewReadyPageCount, 1, "section skin page lock decision bundle profiles should preserve review-ready page counts");
  assert.equal(pageLockDecisionProfile?.unresolvedPageLockCount, 1, "section skin page lock decision bundle profiles should preserve unresolved page-lock counts");
  assert.equal(pageLockDecisionProfile?.resolvedConflictPageCount, 1, "section skin page lock decision bundle profiles should preserve resolved conflict counts");
  assert.equal(pageLockDecisionProfile?.uniqueResolvedLocalPathCount, 1, "section skin page lock decision bundle profiles should preserve unique resolved local source counts");

  const skinPageLockReviewBundlePath = result.skinPageLockReviewBundlePath ?? "";
  const resolvedSkinPageLockReviewBundlePath = path.isAbsolute(skinPageLockReviewBundlePath)
    ? skinPageLockReviewBundlePath
    : path.join(workspaceRoot, skinPageLockReviewBundlePath);
  const skinPageLockReviewBundle = JSON.parse(await fs.readFile(resolvedSkinPageLockReviewBundlePath, "utf8")) as {
    sectionKey?: string;
    pageLockReviewState?: string;
    pageCount?: number;
    reviewReadyPageCount?: number;
    unresolvedPageLockCount?: number;
    resolvedConflictPageCount?: number;
    uniqueResolvedLocalPathCount?: number;
    affectedLayerCount?: number;
    affectedAttachmentCount?: number;
    topAffectedSlotName?: string | null;
    pages?: Array<{
      pageName?: string;
      pageState?: string;
      selectedLocalPath?: string | null;
      affectedLayerCount?: number;
      affectedSlotNames?: string[];
      affectedAttachmentNames?: string[];
      affectedRegionNames?: string[];
    }>;
  };
  assert.equal(skinPageLockReviewBundle.sectionKey, "big_win/BW", "section skin page lock review bundle should preserve section key");
  assert.equal(skinPageLockReviewBundle.pageLockReviewState, "has-unresolved-page-lock-conflicts", "section skin page lock review bundle should preserve unresolved review state when a page lock conflict remains");
  assert.equal(skinPageLockReviewBundle.pageCount, 2, "section skin page lock review bundle should preserve page counts");
  assert.equal(skinPageLockReviewBundle.reviewReadyPageCount, 1, "section skin page lock review bundle should expose one review-ready page in the smoke fixture");
  assert.equal(skinPageLockReviewBundle.unresolvedPageLockCount, 1, "section skin page lock review bundle should preserve unresolved page-lock counts");
  assert.equal(skinPageLockReviewBundle.resolvedConflictPageCount, 1, "section skin page lock review bundle should preserve resolved conflict counts");
  assert.equal(skinPageLockReviewBundle.uniqueResolvedLocalPathCount, 1, "section skin page lock review bundle should preserve unique resolved local source counts");
  assert.equal(skinPageLockReviewBundle.affectedLayerCount, 4, "section skin page lock review bundle should preserve total affected layer counts");
  assert.equal(skinPageLockReviewBundle.affectedAttachmentCount, 4, "section skin page lock review bundle should preserve total affected attachment counts");
  assert.ok(typeof skinPageLockReviewBundle.topAffectedSlotName === "string" && skinPageLockReviewBundle.topAffectedSlotName.length > 0, "section skin page lock review bundle should expose a top affected slot preview");
  const reviewReadyPage = skinPageLockReviewBundle.pages?.find((page) => page.pageState === "ready-for-lock-review");
  assert.ok(reviewReadyPage, "section skin page lock review bundle should keep the review-ready page");
  assert.ok((reviewReadyPage?.affectedLayerCount ?? 0) >= 1, "section skin page lock review bundle should expose affected layer counts per page");
  assert.ok(Array.isArray(reviewReadyPage?.affectedSlotNames) && (reviewReadyPage?.affectedSlotNames?.length ?? 0) >= 1, "section skin page lock review bundle should expose affected slots per page");
  assert.ok(Array.isArray(reviewReadyPage?.affectedAttachmentNames) && (reviewReadyPage?.affectedAttachmentNames?.length ?? 0) >= 1, "section skin page lock review bundle should expose affected attachments per page");
  assert.ok(Array.isArray(reviewReadyPage?.affectedRegionNames) && (reviewReadyPage?.affectedRegionNames?.length ?? 0) >= 1, "section skin page lock review bundle should expose affected atlas regions per page");

  const skinPageLockReviewBundleProfilesPath = path.join(donorRoot, "section-skin-page-lock-review-bundle-profiles.json");
  const skinPageLockReviewBundleProfiles = JSON.parse(await fs.readFile(skinPageLockReviewBundleProfilesPath, "utf8")) as {
    sectionCount?: number;
    sections?: Array<{
      sectionKey?: string;
      pageLockReviewState?: string;
      reviewReadyPageCount?: number;
      unresolvedPageLockCount?: number;
      affectedLayerCount?: number;
      affectedAttachmentCount?: number;
    }>;
  };
  assert.ok((skinPageLockReviewBundleProfiles.sectionCount ?? 0) >= 1, "section skin page lock review bundle profiles should record prepared sections");
  const pageLockReviewProfile = Array.isArray(skinPageLockReviewBundleProfiles.sections)
    ? skinPageLockReviewBundleProfiles.sections.find((section) => section?.sectionKey === "big_win/BW")
    : null;
  assert.ok(pageLockReviewProfile, "section skin page lock review bundle profiles should include the prepared section");
  assert.equal(pageLockReviewProfile?.pageLockReviewState, "has-unresolved-page-lock-conflicts", "section skin page lock review bundle profiles should preserve review state");
  assert.equal(pageLockReviewProfile?.reviewReadyPageCount, 1, "section skin page lock review bundle profiles should preserve review-ready page counts");
  assert.equal(pageLockReviewProfile?.unresolvedPageLockCount, 1, "section skin page lock review bundle profiles should preserve unresolved page-lock counts");
  assert.equal(pageLockReviewProfile?.affectedLayerCount, 4, "section skin page lock review bundle profiles should preserve affected layer counts");
  assert.equal(pageLockReviewProfile?.affectedAttachmentCount, 4, "section skin page lock review bundle profiles should preserve affected attachment counts");

  const skinTextureInputBundlePath = result.skinTextureInputBundlePath ?? "";
  const resolvedSkinTextureInputBundlePath = path.isAbsolute(skinTextureInputBundlePath)
    ? skinTextureInputBundlePath
    : path.join(workspaceRoot, skinTextureInputBundlePath);
  const skinTextureInputBundle = JSON.parse(await fs.readFile(resolvedSkinTextureInputBundlePath, "utf8")) as {
    sectionKey?: string;
    textureInputState?: string;
    pageCount?: number;
    exactPageLockCount?: number;
    proposedPageLockCount?: number;
    missingPageLockCount?: number;
    layerCount?: number;
    readyLayerCount?: number;
    blockedLayerCount?: number;
    layers?: Array<{ slotName?: string; layerState?: string; pageState?: string; selectedLocalPath?: string | null; bounds?: { width?: number } | null }>;
  };
  assert.equal(skinTextureInputBundle.sectionKey, "big_win/BW", "section skin texture input bundle should preserve section key");
  assert.equal(skinTextureInputBundle.textureInputState, "ready-with-proposed-page-locks", "section skin texture input bundle should stay provisional while page locks are still proposed");
  assert.equal(skinTextureInputBundle.pageCount, 2, "section skin texture input bundle should preserve page counts");
  assert.equal(skinTextureInputBundle.exactPageLockCount, 0, "section skin texture input bundle should preserve missing exact page locks");
  assert.equal(skinTextureInputBundle.proposedPageLockCount, 2, "section skin texture input bundle should preserve proposed page-lock counts");
  assert.equal(skinTextureInputBundle.missingPageLockCount, 0, "section skin texture input bundle should avoid false missing page locks");
  assert.equal(skinTextureInputBundle.layerCount, 4, "section skin texture input bundle should preserve layer counts");
  assert.equal(skinTextureInputBundle.readyLayerCount, 4, "section skin texture input bundle should mark all layers ready in the smoke fixture");
  assert.equal(skinTextureInputBundle.blockedLayerCount, 0, "section skin texture input bundle should avoid false blocked layers");
  assert.ok(Array.isArray(skinTextureInputBundle.layers) && skinTextureInputBundle.layers.length === 4, "section skin texture input bundle should expose layer input rows");
  assert.equal(skinTextureInputBundle.layers?.[0]?.layerState, "ready-with-proposed-page-lock", "section skin texture input bundle should translate proposed page locks into ready layer states");
  assert.equal(skinTextureInputBundle.layers?.[0]?.pageState, "proposed-page-lock", "section skin texture input bundle should preserve page-lock states on layers");
  assert.ok(typeof skinTextureInputBundle.layers?.[0]?.selectedLocalPath === "string" && skinTextureInputBundle.layers[0].selectedLocalPath.length > 0, "section skin texture input bundle should preserve selected local paths");
  assert.ok((skinTextureInputBundle.layers?.[0]?.bounds?.width ?? 0) > 0, "section skin texture input bundle should preserve atlas bounds");

  const skinTextureInputBundleProfilesPath = path.join(donorRoot, "section-skin-texture-input-bundle-profiles.json");
  const skinTextureInputBundleProfiles = JSON.parse(await fs.readFile(skinTextureInputBundleProfilesPath, "utf8")) as {
    sectionCount?: number;
    sections?: Array<{ sectionKey?: string; textureInputState?: string; textureInputBundlePath?: string; readyLayerCount?: number; blockedLayerCount?: number }>;
  };
  assert.ok((skinTextureInputBundleProfiles.sectionCount ?? 0) >= 1, "section skin texture input bundle profiles should record prepared sections");
  const textureInputProfile = Array.isArray(skinTextureInputBundleProfiles.sections)
    ? skinTextureInputBundleProfiles.sections.find((section) => section?.sectionKey === "big_win/BW")
    : null;
  assert.ok(textureInputProfile, "section skin texture input bundle profiles should include the prepared section");
  assert.equal(textureInputProfile?.textureInputState, "ready-with-proposed-page-locks", "section skin texture input bundle profiles should preserve texture-input readiness");
  assert.equal(textureInputProfile?.readyLayerCount, 4, "section skin texture input bundle profiles should preserve ready layer counts");
  assert.equal(textureInputProfile?.blockedLayerCount, 0, "section skin texture input bundle profiles should preserve blocked layer counts");

  const skinTextureSourcePlanPath = result.skinTextureSourcePlanPath ?? "";
  const resolvedSkinTextureSourcePlanPath = path.isAbsolute(skinTextureSourcePlanPath) ? skinTextureSourcePlanPath : path.join(workspaceRoot, skinTextureSourcePlanPath);
  const skinTextureSourcePlan = JSON.parse(await fs.readFile(resolvedSkinTextureSourcePlanPath, "utf8")) as {
    sectionKey?: string;
    textureSourceState?: string;
    pageCount?: number;
    exactPageSourceCount?: number;
    proposedPageSourceCount?: number;
    missingPageSourceCount?: number;
    topTextureSourceLocalPath?: string | null;
    pages?: Array<{ pageName?: string; sourceSelection?: string; sourceLocalPath?: string | null }>;
    layers?: Array<{ slotName?: string; sourceSelection?: string; sourceLocalPath?: string | null }>;
  };
  assert.equal(skinTextureSourcePlan.sectionKey, "big_win/BW", "section skin texture source plan should preserve section key");
  assert.equal(skinTextureSourcePlan.textureSourceState, "ready-with-proposed-page-sources", "section skin texture source plan should stay honest when only proposed page matches exist");
  assert.equal(skinTextureSourcePlan.pageCount, 2, "section skin texture source plan should preserve atlas page count");
  assert.equal(skinTextureSourcePlan.exactPageSourceCount, 0, "section skin texture source plan should preserve missing exact page sources");
  assert.equal(skinTextureSourcePlan.proposedPageSourceCount, 2, "section skin texture source plan should preserve proposed page sources");
  assert.equal(skinTextureSourcePlan.missingPageSourceCount, 0, "section skin texture source plan should avoid false missing pages when proposed sources exist");
  assert.ok(typeof skinTextureSourcePlan.topTextureSourceLocalPath === "string" && skinTextureSourcePlan.topTextureSourceLocalPath.length > 0, "section skin texture source plan should expose a top texture source preview");
  assert.ok(Array.isArray(skinTextureSourcePlan.pages) && skinTextureSourcePlan.pages.length === 2, "section skin texture source plan should expose per-page source records");
  assert.equal(skinTextureSourcePlan.pages?.[0]?.sourceSelection, "proposed-page-match", "section skin texture source plan should preserve proposed page-source selections");
  assert.ok(typeof skinTextureSourcePlan.pages?.[0]?.sourceLocalPath === "string" && skinTextureSourcePlan.pages[0].sourceLocalPath.length > 0, "section skin texture source plan should preserve the chosen page source");
  assert.ok(Array.isArray(skinTextureSourcePlan.layers) && skinTextureSourcePlan.layers.length === 4, "section skin texture source plan should expose layer-level source rows");
  assert.equal(skinTextureSourcePlan.layers?.[0]?.sourceSelection, "proposed-page-match", "section skin texture source plan should project page-source selections down to layers");

  const skinTextureSourcePlanProfilesPath = path.join(donorRoot, "section-skin-texture-source-plan-profiles.json");
  const skinTextureSourcePlanProfiles = JSON.parse(await fs.readFile(skinTextureSourcePlanProfilesPath, "utf8")) as {
    sectionCount?: number;
    sections?: Array<{ sectionKey?: string; textureSourceState?: string; textureSourcePlanPath?: string; proposedPageSourceCount?: number; missingPageSourceCount?: number }>;
  };
  assert.ok((skinTextureSourcePlanProfiles.sectionCount ?? 0) >= 1, "section skin texture source plan profiles should record prepared sections");
  const textureSourceProfile = Array.isArray(skinTextureSourcePlanProfiles.sections)
    ? skinTextureSourcePlanProfiles.sections.find((section) => section?.sectionKey === "big_win/BW")
    : null;
  assert.ok(textureSourceProfile, "section skin texture source plan profiles should include the prepared section");
  assert.equal(textureSourceProfile?.textureSourceState, "ready-with-proposed-page-sources", "section skin texture source plan profiles should preserve texture-source readiness");
  assert.equal(textureSourceProfile?.proposedPageSourceCount, 2, "section skin texture source plan profiles should preserve proposed page-source counts");
  assert.equal(textureSourceProfile?.missingPageSourceCount, 0, "section skin texture source plan profiles should preserve missing page-source counts");

  const skinTextureReconstructionBundlePath = result.skinTextureReconstructionBundlePath ?? "";
  const resolvedSkinTextureReconstructionBundlePath = path.isAbsolute(skinTextureReconstructionBundlePath)
    ? skinTextureReconstructionBundlePath
    : path.join(workspaceRoot, skinTextureReconstructionBundlePath);
  const skinTextureReconstructionBundle = JSON.parse(await fs.readFile(resolvedSkinTextureReconstructionBundlePath, "utf8")) as {
    sectionKey?: string;
    textureReconstructionState?: string;
    pageCount?: number;
    exactPageSourceCount?: number;
    proposedPageSourceCount?: number;
    missingPageSourceCount?: number;
    layerCount?: number;
    reconstructableLayerCount?: number;
    blockedLayerCount?: number;
    layers?: Array<{ slotName?: string; layerState?: string; sourceSelection?: string; sourceLocalPath?: string | null; bounds?: { width?: number } | null }>;
  };
  assert.equal(skinTextureReconstructionBundle.sectionKey, "big_win/BW", "section skin texture reconstruction bundle should preserve section key");
  assert.equal(skinTextureReconstructionBundle.textureReconstructionState, "ready-with-proposed-page-sources", "section skin texture reconstruction bundle should stay honest when page sources are still proposed");
  assert.equal(skinTextureReconstructionBundle.pageCount, 2, "section skin texture reconstruction bundle should preserve page counts");
  assert.equal(skinTextureReconstructionBundle.proposedPageSourceCount, 2, "section skin texture reconstruction bundle should preserve proposed page-source counts");
  assert.equal(skinTextureReconstructionBundle.missingPageSourceCount, 0, "section skin texture reconstruction bundle should avoid false missing page sources");
  assert.equal(skinTextureReconstructionBundle.layerCount, 4, "section skin texture reconstruction bundle should preserve layer counts");
  assert.equal(skinTextureReconstructionBundle.reconstructableLayerCount, 4, "section skin texture reconstruction bundle should mark all layers reconstructable in the smoke fixture");
  assert.equal(skinTextureReconstructionBundle.blockedLayerCount, 0, "section skin texture reconstruction bundle should avoid false blocked layers");
  assert.ok(Array.isArray(skinTextureReconstructionBundle.layers) && skinTextureReconstructionBundle.layers.length === 4, "section skin texture reconstruction bundle should expose layer reconstruction rows");
  assert.equal(skinTextureReconstructionBundle.layers?.[0]?.layerState, "ready-with-proposed-page-source", "section skin texture reconstruction bundle should translate proposed page sources into reconstructable layer states");
  assert.equal(skinTextureReconstructionBundle.layers?.[0]?.sourceSelection, "proposed-page-match", "section skin texture reconstruction bundle should preserve source selections");
  assert.ok((skinTextureReconstructionBundle.layers?.[0]?.bounds?.width ?? 0) > 0, "section skin texture reconstruction bundle should preserve atlas bounds");

  const skinTextureReconstructionBundleProfilesPath = path.join(donorRoot, "section-skin-texture-reconstruction-bundle-profiles.json");
  const skinTextureReconstructionBundleProfiles = JSON.parse(await fs.readFile(skinTextureReconstructionBundleProfilesPath, "utf8")) as {
    sectionCount?: number;
    sections?: Array<{ sectionKey?: string; textureReconstructionState?: string; textureReconstructionBundlePath?: string; reconstructableLayerCount?: number; blockedLayerCount?: number }>;
  };
  assert.ok((skinTextureReconstructionBundleProfiles.sectionCount ?? 0) >= 1, "section skin texture reconstruction bundle profiles should record prepared sections");
  const textureReconstructionProfile = Array.isArray(skinTextureReconstructionBundleProfiles.sections)
    ? skinTextureReconstructionBundleProfiles.sections.find((section) => section?.sectionKey === "big_win/BW")
    : null;
  assert.ok(textureReconstructionProfile, "section skin texture reconstruction bundle profiles should include the prepared section");
  assert.equal(textureReconstructionProfile?.textureReconstructionState, "ready-with-proposed-page-sources", "section skin texture reconstruction bundle profiles should preserve texture reconstruction readiness");
  assert.equal(textureReconstructionProfile?.reconstructableLayerCount, 4, "section skin texture reconstruction bundle profiles should preserve reconstructable layer counts");
  assert.equal(textureReconstructionProfile?.blockedLayerCount, 0, "section skin texture reconstruction bundle profiles should preserve blocked layer counts");

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
