import path from "node:path";
import type {
  FamilyReconstructionAttachmentMatchType,
  FamilyReconstructionAttachmentRecord,
  FamilyReconstructionBundleFile,
  FamilyReconstructionLocalSourceRecord,
  FamilyReconstructionMapRecord,
  FamilyReconstructionMapsFile,
  FamilyReconstructionProfileRecord,
  FamilyReconstructionProfilesFile
} from "./shared";
import {
  fileExists,
  readJsonFile,
  readOptionalTextFile,
  workspaceRoot
} from "./shared";

interface SummarizeFamilyReconstructionMapsOptions {
  donorId: string;
  donorName: string;
  familyReconstructionProfiles: FamilyReconstructionProfilesFile;
}

interface ParsedAtlasMap {
  pageNames: string[];
  regionToPage: Map<string, string>;
}

interface ParsedSpineAttachmentSource {
  skinName: string;
  slotName: string;
  attachmentName: string;
  attachmentPath: string | null;
}

interface ParsedSpineMap {
  skinCount: number;
  slotCount: number;
  animationNames: string[];
  attachments: ParsedSpineAttachmentSource[];
}

function normalizePathForKey(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.trim();
}

function parseAtlasMap(text: string): ParsedAtlasMap {
  const pageNames: string[] = [];
  const regionToPage = new Map<string, string>();
  const lines = text.split(/\r?\n/);
  let currentPage: string | null = null;
  let awaitingPage = true;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.length === 0) {
      awaitingPage = true;
      currentPage = null;
      continue;
    }
    if (awaitingPage) {
      if (trimmed.includes(":")) {
        continue;
      }
      if (/\.(png|webp|jpg|jpeg|svg)$/i.test(trimmed)) {
        currentPage = trimmed;
        pageNames.push(trimmed);
        awaitingPage = false;
      }
      continue;
    }
    if (!currentPage || trimmed.includes(":")) {
      continue;
    }
    regionToPage.set(trimmed, currentPage);
  }

  return { pageNames, regionToPage };
}

function readAttachmentPath(attachment: unknown): string | null {
  if (!attachment || typeof attachment !== "object" || Array.isArray(attachment)) {
    return null;
  }
  const candidate = attachment as Record<string, unknown>;
  if (typeof candidate.path === "string" && candidate.path.trim().length > 0) {
    return candidate.path.trim();
  }
  if (typeof candidate.name === "string" && candidate.name.trim().length > 0) {
    return candidate.name.trim();
  }
  return null;
}

function parseSpineMap(parsed: unknown): ParsedSpineMap | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const candidate = parsed as Record<string, unknown>;
  if (!Array.isArray(candidate.slots) || !Array.isArray(candidate.skins) || !candidate.animations || typeof candidate.animations !== "object") {
    return null;
  }

  const attachments: ParsedSpineAttachmentSource[] = [];
  for (const skinEntry of candidate.skins) {
    if (!skinEntry || typeof skinEntry !== "object" || Array.isArray(skinEntry)) {
      continue;
    }
    const skin = skinEntry as Record<string, unknown>;
    const skinName = typeof skin.name === "string" && skin.name.trim().length > 0 ? skin.name.trim() : "skin";
    const attachmentSlots = skin.attachments && typeof skin.attachments === "object" && !Array.isArray(skin.attachments)
      ? skin.attachments as Record<string, unknown>
      : {};
    for (const [slotName, slotAttachments] of Object.entries(attachmentSlots)) {
      if (!slotAttachments || typeof slotAttachments !== "object" || Array.isArray(slotAttachments)) {
        continue;
      }
      for (const [attachmentName, attachmentValue] of Object.entries(slotAttachments as Record<string, unknown>)) {
        attachments.push({
          skinName,
          slotName,
          attachmentName,
          attachmentPath: readAttachmentPath(attachmentValue)
        });
      }
    }
  }

  return {
    skinCount: candidate.skins.length,
    slotCount: candidate.slots.length,
    animationNames: Object.keys(candidate.animations as Record<string, unknown>).sort((left, right) => left.localeCompare(right)),
    attachments
  };
}

function buildAttachmentMatch(
  attachment: ParsedSpineAttachmentSource,
  regionToPage: Map<string, string>
): FamilyReconstructionAttachmentRecord {
  const pathCandidate = normalizePathForKey(attachment.attachmentPath);
  if (pathCandidate && regionToPage.has(pathCandidate)) {
    return {
      skinName: attachment.skinName,
      slotName: attachment.slotName,
      attachmentName: attachment.attachmentName,
      attachmentPath: attachment.attachmentPath,
      matchType: "path-exact",
      regionName: pathCandidate,
      pageName: regionToPage.get(pathCandidate) ?? null
    };
  }

  const attachmentCandidate = normalizePathForKey(attachment.attachmentName);
  if (attachmentCandidate && regionToPage.has(attachmentCandidate)) {
    return {
      skinName: attachment.skinName,
      slotName: attachment.slotName,
      attachmentName: attachment.attachmentName,
      attachmentPath: attachment.attachmentPath,
      matchType: "attachment-exact",
      regionName: attachmentCandidate,
      pageName: regionToPage.get(attachmentCandidate) ?? null
    };
  }

  const slotCandidate = normalizePathForKey(attachment.slotName);
  if (slotCandidate && regionToPage.has(slotCandidate)) {
    return {
      skinName: attachment.skinName,
      slotName: attachment.slotName,
      attachmentName: attachment.attachmentName,
      attachmentPath: attachment.attachmentPath,
      matchType: "slot-exact",
      regionName: slotCandidate,
      pageName: regionToPage.get(slotCandidate) ?? null
    };
  }

  return {
    skinName: attachment.skinName,
    slotName: attachment.slotName,
    attachmentName: attachment.attachmentName,
    attachmentPath: attachment.attachmentPath,
    matchType: "unmapped",
    regionName: null,
    pageName: null
  };
}

async function loadLocalTextSource(localSource: FamilyReconstructionLocalSourceRecord): Promise<string | null> {
  const absolutePath = path.join(workspaceRoot, localSource.localPath);
  if (!await fileExists(absolutePath)) {
    return null;
  }
  return readOptionalTextFile(absolutePath);
}

async function loadAtlasFromBundle(bundle: FamilyReconstructionBundleFile): Promise<ParsedAtlasMap> {
  for (const localSource of bundle.localSources) {
    if (!/\.atlas$/i.test(localSource.localPath)) {
      continue;
    }
    const text = await loadLocalTextSource(localSource);
    if (!text) {
      continue;
    }
    return parseAtlasMap(text);
  }
  return { pageNames: [], regionToPage: new Map() };
}

async function loadSpineFromBundle(bundle: FamilyReconstructionBundleFile): Promise<ParsedSpineMap | null> {
  for (const localSource of bundle.localSources) {
    if (!/\.json$/i.test(localSource.localPath)) {
      continue;
    }
    const absolutePath = path.join(workspaceRoot, localSource.localPath);
    if (!await fileExists(absolutePath)) {
      continue;
    }
    const parsed = await readJsonFile<unknown>(absolutePath);
    const spine = parseSpineMap(parsed);
    if (spine) {
      return spine;
    }
  }
  return null;
}

function buildNextReconstructionStep(
  profile: FamilyReconstructionProfileRecord,
  mappedAttachmentCount: number,
  unmappedAttachmentCount: number
): string {
  if (mappedAttachmentCount > 0 && unmappedAttachmentCount === 0) {
    return `Family has ${mappedAttachmentCount} grounded Spine/atlas attachment matches. Next step: promote those matches into reconstruction-ready page and attachment ownership for ${profile.familyName}.`;
  }
  if (mappedAttachmentCount > 0) {
    return `Family has ${mappedAttachmentCount} grounded Spine/atlas attachment matches and ${unmappedAttachmentCount} unmapped attachments. Next step: start reconstruction from the mapped set, then review the remaining attachments manually for ${profile.familyName}.`;
  }
  return profile.nextReconstructionStep;
}

function sortMaps(left: FamilyReconstructionMapRecord, right: FamilyReconstructionMapRecord): number {
  if (left.mappedAttachmentCount !== right.mappedAttachmentCount) {
    return right.mappedAttachmentCount - left.mappedAttachmentCount;
  }
  if (left.atlasRegionCount !== right.atlasRegionCount) {
    return right.atlasRegionCount - left.atlasRegionCount;
  }
  return left.familyName.localeCompare(right.familyName);
}

export async function summarizeFamilyReconstructionMaps(
  options: SummarizeFamilyReconstructionMapsOptions
): Promise<FamilyReconstructionMapsFile> {
  const families: FamilyReconstructionMapRecord[] = [];

  for (const profile of options.familyReconstructionProfiles.families) {
    const reconstructionBundlePath = path.join(workspaceRoot, profile.reconstructionBundlePath);
    if (!await fileExists(reconstructionBundlePath)) {
      continue;
    }
    const bundle = await readJsonFile<FamilyReconstructionBundleFile>(reconstructionBundlePath);
    const atlas = await loadAtlasFromBundle(bundle);
    const spine = await loadSpineFromBundle(bundle);
    const attachments = spine
      ? spine.attachments.map((attachment) => buildAttachmentMatch(attachment, atlas.regionToPage))
      : [];
    const mappedAttachments = attachments.filter((attachment) => attachment.matchType !== "unmapped");
    const unmappedAttachments = attachments.filter((attachment) => attachment.matchType === "unmapped");
    const sampleMappedAttachments = mappedAttachments.slice(0, 8);
    const sampleUnmappedAttachments = unmappedAttachments.slice(0, 8);
    const mappedByMatchType = {
      "path-exact": attachments.filter((attachment) => attachment.matchType === "path-exact").length,
      "attachment-exact": attachments.filter((attachment) => attachment.matchType === "attachment-exact").length,
      "slot-exact": attachments.filter((attachment) => attachment.matchType === "slot-exact").length
    };
    const mappedAttachmentCount = mappedAttachments.length;
    const unmappedAttachmentCount = unmappedAttachments.length;

    families.push({
      familyName: profile.familyName,
      profileState: profile.profileState,
      readiness: profile.readiness,
      atlasPageCount: atlas.pageNames.length,
      atlasRegionCount: atlas.regionToPage.size,
      spineSkinCount: spine?.skinCount ?? 0,
      spineSlotCount: spine?.slotCount ?? 0,
      spineAttachmentCount: attachments.length,
      mappedAttachmentCount,
      unmappedAttachmentCount,
      mappedByMatchType,
      animationNames: spine?.animationNames ?? [],
      sampleMappedAttachments,
      sampleUnmappedAttachments,
      sampleLocalSourcePath: profile.sampleLocalSourcePath,
      reconstructionBundlePath: profile.reconstructionBundlePath,
      nextReconstructionStep: buildNextReconstructionStep(profile, mappedAttachmentCount, unmappedAttachmentCount),
      attachments
    });
  }

  families.sort(sortMaps);
  return {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    familyCount: families.length,
    families
  };
}
