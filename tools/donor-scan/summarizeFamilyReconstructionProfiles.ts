import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  FamilyReconstructionBundleFile,
  FamilyReconstructionLocalSourceRecord,
  FamilyReconstructionProfileRecord,
  FamilyReconstructionProfilesFile
} from "./shared";
import {
  fileExists,
  readJsonFile,
  readOptionalTextFile,
  workspaceRoot
} from "./shared";

interface SummarizeFamilyReconstructionProfilesOptions {
  donorId: string;
  donorName: string;
  bundlesRoot: string;
}

interface ParsedAtlasSummary {
  pageNames: string[];
  regionNames: string[];
}

interface ParsedSourceSummary {
  atlasFileCount: number;
  atlasPageNames: string[];
  atlasRegionNames: string[];
  spineJsonCount: number;
  spineVersion: string | null;
  spineBoneCount: number;
  spineSlotCount: number;
  spineSkinCount: number;
  spineAnimationNames: string[];
  frameManifestCount: number;
  frameCount: number;
  looseImageCount: number;
}

function isImagePath(filePath: string): boolean {
  return /\.(png|webp|jpg|jpeg|gif|svg)$/i.test(filePath);
}

function parseAtlasText(text: string): ParsedAtlasSummary {
  const pageNames: string[] = [];
  const regionNames: string[] = [];
  const lines = text.split(/\r?\n/);
  let expectingPage = true;
  let activePage = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.length === 0) {
      expectingPage = true;
      activePage = false;
      continue;
    }
    if (expectingPage) {
      if (trimmed.includes(":")) {
        continue;
      }
      if (/\.(png|webp|jpg|jpeg|svg)$/i.test(trimmed)) {
        pageNames.push(trimmed);
        expectingPage = false;
        activePage = true;
      }
      continue;
    }
    if (!activePage) {
      continue;
    }
    if (!trimmed.includes(":")) {
      regionNames.push(trimmed);
    }
  }

  return { pageNames, regionNames };
}

function parseSpineJson(parsed: unknown): Omit<ParsedSourceSummary, "atlasFileCount" | "atlasPageNames" | "atlasRegionNames" | "frameManifestCount" | "frameCount" | "looseImageCount"> | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const candidate = parsed as Record<string, unknown>;
  if (!Array.isArray(candidate.bones) || !Array.isArray(candidate.slots) || !("animations" in candidate)) {
    return null;
  }
  const animations = candidate.animations && typeof candidate.animations === "object" && !Array.isArray(candidate.animations)
    ? candidate.animations as Record<string, unknown>
    : {};
  const skins = Array.isArray(candidate.skins)
    ? candidate.skins
    : candidate.skins && typeof candidate.skins === "object" && !Array.isArray(candidate.skins)
      ? Object.values(candidate.skins)
      : [];
  const skeleton = candidate.skeleton && typeof candidate.skeleton === "object" && !Array.isArray(candidate.skeleton)
    ? candidate.skeleton as Record<string, unknown>
    : null;
  return {
    spineJsonCount: 1,
    spineVersion: typeof skeleton?.spine === "string" ? skeleton.spine : null,
    spineBoneCount: candidate.bones.length,
    spineSlotCount: candidate.slots.length,
    spineSkinCount: skins.length,
    spineAnimationNames: Object.keys(animations)
  };
}

function parseFrameManifest(parsed: unknown): { frameManifestCount: number; frameCount: number } | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const candidate = parsed as Record<string, unknown>;
  if (!("frames" in candidate)) {
    return null;
  }
  const frames = candidate.frames;
  if (Array.isArray(frames)) {
    return { frameManifestCount: 1, frameCount: frames.length };
  }
  if (frames && typeof frames === "object") {
    return { frameManifestCount: 1, frameCount: Object.keys(frames as Record<string, unknown>).length };
  }
  return { frameManifestCount: 1, frameCount: 0 };
}

function summarizeProfileState(summary: ParsedSourceSummary): FamilyReconstructionProfileRecord["profileState"] {
  if (summary.spineJsonCount > 0 && summary.atlasFileCount > 0) {
    return "ready-for-spine-atlas-reconstruction";
  }
  if ((summary.frameManifestCount > 0 || summary.atlasFileCount > 0) && summary.looseImageCount > 0) {
    return "ready-for-atlas-frame-import";
  }
  if (summary.looseImageCount > 0) {
    return "ready-for-image-reconstruction";
  }
  return "needs-manual-source-review";
}

function buildNextReconstructionStep(
  bundle: FamilyReconstructionBundleFile,
  summary: ParsedSourceSummary,
  profileState: FamilyReconstructionProfileRecord["profileState"]
): string {
  if (profileState === "ready-for-spine-atlas-reconstruction") {
    return `Family has local Spine JSON plus atlas metadata. Next step: map atlas pages and spine attachments for ${bundle.familyName} reconstruction.`;
  }
  if (profileState === "ready-for-atlas-frame-import") {
    return `Family has local atlas/frame metadata plus local page images. Next step: extract frame/page mappings for ${bundle.familyName}.`;
  }
  if (profileState === "ready-for-image-reconstruction") {
    return `Family has local image sources. Next step: group the local images into reconstruction-ready donor assets for ${bundle.familyName}.`;
  }
  return bundle.nextStep;
}

async function parseLocalSourceFile(
  localSource: FamilyReconstructionLocalSourceRecord,
  summary: ParsedSourceSummary
): Promise<void> {
  const absolutePath = path.join(workspaceRoot, localSource.localPath);
  if (!await fileExists(absolutePath)) {
    return;
  }

  if (/\.atlas$/i.test(localSource.localPath)) {
    const text = await readOptionalTextFile(absolutePath);
    if (!text) {
      return;
    }
    const atlas = parseAtlasText(text);
    summary.atlasFileCount += 1;
    summary.atlasPageNames.push(...atlas.pageNames);
    summary.atlasRegionNames.push(...atlas.regionNames);
    return;
  }

  if (/\.json$/i.test(localSource.localPath)) {
    const parsed = await readJsonFile<unknown>(absolutePath);
    const spine = parseSpineJson(parsed);
    if (spine) {
      summary.spineJsonCount += spine.spineJsonCount;
      summary.spineVersion = summary.spineVersion ?? spine.spineVersion;
      summary.spineBoneCount += spine.spineBoneCount;
      summary.spineSlotCount += spine.spineSlotCount;
      summary.spineSkinCount += spine.spineSkinCount;
      summary.spineAnimationNames.push(...spine.spineAnimationNames);
      return;
    }
    const frameManifest = parseFrameManifest(parsed);
    if (frameManifest) {
      summary.frameManifestCount += frameManifest.frameManifestCount;
      summary.frameCount += frameManifest.frameCount;
      return;
    }
  }

  if (isImagePath(localSource.localPath)) {
    summary.looseImageCount += 1;
  }
}

function createEmptySourceSummary(): ParsedSourceSummary {
  return {
    atlasFileCount: 0,
    atlasPageNames: [],
    atlasRegionNames: [],
    spineJsonCount: 0,
    spineVersion: null,
    spineBoneCount: 0,
    spineSlotCount: 0,
    spineSkinCount: 0,
    spineAnimationNames: [],
    frameManifestCount: 0,
    frameCount: 0,
    looseImageCount: 0
  };
}

function sortProfiles(left: FamilyReconstructionProfileRecord, right: FamilyReconstructionProfileRecord): number {
  const stateOrder = (value: FamilyReconstructionProfileRecord["profileState"]) => {
    switch (value) {
      case "ready-for-spine-atlas-reconstruction":
        return 0;
      case "ready-for-atlas-frame-import":
        return 1;
      case "ready-for-image-reconstruction":
        return 2;
      default:
        return 3;
    }
  };
  const stateDelta = stateOrder(left.profileState) - stateOrder(right.profileState);
  if (stateDelta !== 0) {
    return stateDelta;
  }
  if (left.exactLocalSourceCount !== right.exactLocalSourceCount) {
    return right.exactLocalSourceCount - left.exactLocalSourceCount;
  }
  if (left.localSourceCount !== right.localSourceCount) {
    return right.localSourceCount - left.localSourceCount;
  }
  return left.familyName.localeCompare(right.familyName);
}

export async function summarizeFamilyReconstructionProfiles(
  options: SummarizeFamilyReconstructionProfilesOptions
): Promise<FamilyReconstructionProfilesFile> {
  const families: FamilyReconstructionProfileRecord[] = [];
  const bundlesRoot = options.bundlesRoot;
  if (await fileExists(bundlesRoot)) {
    const dirents = await fs.readdir(bundlesRoot, { withFileTypes: true });
    for (const dirent of dirents) {
      if (!dirent.isFile() || !dirent.name.endsWith(".json")) {
        continue;
      }
      const reconstructionBundlePath = path.join(bundlesRoot, dirent.name);
      const bundle = await readJsonFile<FamilyReconstructionBundleFile>(reconstructionBundlePath);
      const parsed = createEmptySourceSummary();
      for (const localSource of bundle.localSources) {
        await parseLocalSourceFile(localSource, parsed);
      }
      const profileState = summarizeProfileState(parsed);
      families.push({
        familyName: bundle.familyName,
        actionClass: bundle.actionClass,
        readiness: bundle.readiness,
        profileState,
        localSourceCount: bundle.localSources.length,
        exactLocalSourceCount: bundle.exactLocalSourceCount,
        relatedLocalSourceCount: bundle.relatedLocalSourceCount,
        localSourceKinds: Array.from(new Set(bundle.localSources.map((entry) => entry.sourceKind))).sort((left, right) => left.localeCompare(right)),
        atlasFileCount: parsed.atlasFileCount,
        atlasPageCount: parsed.atlasPageNames.length,
        atlasRegionCount: parsed.atlasRegionNames.length,
        atlasPageNames: parsed.atlasPageNames.slice(0, 8),
        atlasRegionPreview: parsed.atlasRegionNames.slice(0, 12),
        spineJsonCount: parsed.spineJsonCount,
        spineVersion: parsed.spineVersion,
        spineBoneCount: parsed.spineBoneCount,
        spineSlotCount: parsed.spineSlotCount,
        spineSkinCount: parsed.spineSkinCount,
        spineAnimationCount: parsed.spineAnimationNames.length,
        spineAnimationNames: parsed.spineAnimationNames.slice(0, 8),
        frameManifestCount: parsed.frameManifestCount,
        frameCount: parsed.frameCount,
        looseImageCount: parsed.looseImageCount,
        sampleLocalSourcePath: bundle.localSources[0]?.localPath ?? null,
        worksetPath: bundle.worksetPath,
        reconstructionBundlePath: path.relative(workspaceRoot, reconstructionBundlePath).replace(/\\/g, "/"),
        nextReconstructionStep: buildNextReconstructionStep(bundle, parsed, profileState)
      });
    }
  }

  families.sort(sortProfiles);
  return {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    familyCount: families.length,
    families
  };
}
