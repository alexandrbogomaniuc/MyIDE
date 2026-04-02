import path from "node:path";
import type {
  FamilyReconstructionAttachmentRecord,
  FamilyReconstructionBundleFile,
  FamilyReconstructionMapRecord,
  FamilyReconstructionMapsFile,
  FamilyReconstructionSectionBundleRecord,
  FamilyReconstructionSectionBundlesFile,
  FamilyReconstructionSectionRecord,
  FamilyReconstructionSectionsFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeFamilyReconstructionSectionBundlesOptions {
  donorId: string;
  donorName: string;
  familyReconstructionMaps: FamilyReconstructionMapsFile;
  familyReconstructionSections: FamilyReconstructionSectionsFile;
}

function buildBundleState(
  mappedAttachmentCount: number,
  unmappedAttachmentCount: number
): FamilyReconstructionSectionBundleRecord["bundleState"] {
  if (mappedAttachmentCount > 0 && unmappedAttachmentCount === 0) {
    return "ready-with-grounded-attachments";
  }
  return "needs-manual-section-review";
}

function sortSectionBundles(
  left: FamilyReconstructionSectionBundleRecord,
  right: FamilyReconstructionSectionBundleRecord
): number {
  if (left.mappedAttachmentCount !== right.mappedAttachmentCount) {
    return right.mappedAttachmentCount - left.mappedAttachmentCount;
  }
  if (left.attachmentCount !== right.attachmentCount) {
    return right.attachmentCount - left.attachmentCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

function buildSectionBundleRecord(
  family: FamilyReconstructionMapRecord,
  section: FamilyReconstructionSectionRecord,
  attachments: FamilyReconstructionAttachmentRecord[],
  familyBundle: FamilyReconstructionBundleFile | null
): FamilyReconstructionSectionBundleRecord {
  const atlasRegionNames = Array.from(new Set(
    attachments
      .map((attachment) => attachment.regionName)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  )).sort((left, right) => left.localeCompare(right));
  const slotNames = Array.from(new Set(
    attachments
      .map((attachment) => attachment.slotName)
      .filter((value) => value.length > 0)
  )).sort((left, right) => left.localeCompare(right));

  return {
    familyName: section.familyName,
    sectionKey: section.sectionKey,
    sectionType: section.sectionType,
    skinName: section.skinName,
    readiness: section.readiness,
    profileState: section.profileState,
    sectionState: section.sectionState,
    bundleState: buildBundleState(section.mappedAttachmentCount, section.unmappedAttachmentCount),
    attachmentCount: section.attachmentCount,
    mappedAttachmentCount: section.mappedAttachmentCount,
    unmappedAttachmentCount: section.unmappedAttachmentCount,
    atlasPageCount: section.atlasPageCount,
    atlasPageNames: section.atlasPageNames,
    atlasRegionCount: atlasRegionNames.length,
    atlasRegionNames,
    slotNames,
    animationNames: section.animationNames,
    exactLocalSourceCount: familyBundle?.exactLocalSourceCount ?? 0,
    relatedLocalSourceCount: familyBundle?.relatedLocalSourceCount ?? 0,
    localSources: familyBundle?.localSources ?? [],
    sampleLocalSourcePath: section.sampleLocalSourcePath,
    reconstructionBundlePath: family.reconstructionBundlePath,
    reconstructionMapPath: section.reconstructionMapPath,
    nextSectionStep: section.nextSectionStep,
    attachments
  };
}

export async function summarizeFamilyReconstructionSectionBundles(
  options: SummarizeFamilyReconstructionSectionBundlesOptions
): Promise<FamilyReconstructionSectionBundlesFile> {
  const sections: FamilyReconstructionSectionBundleRecord[] = [];
  const sectionLookup = new Map<string, FamilyReconstructionSectionRecord[]>();
  const familyBundleCache = new Map<string, FamilyReconstructionBundleFile | null>();

  for (const section of options.familyReconstructionSections.sections) {
    const current = sectionLookup.get(section.familyName) ?? [];
    current.push(section);
    sectionLookup.set(section.familyName, current);
  }

  for (const family of options.familyReconstructionMaps.families) {
    const familySections = sectionLookup.get(family.familyName) ?? [];
    if (familySections.length === 0) {
      continue;
    }
    if (!familyBundleCache.has(family.familyName)) {
      const familyBundlePath = path.join(workspaceRoot, family.reconstructionBundlePath);
      familyBundleCache.set(
        family.familyName,
        await readOptionalJsonFile<FamilyReconstructionBundleFile>(familyBundlePath)
      );
    }
    const familyBundle = familyBundleCache.get(family.familyName) ?? null;
    const attachmentsBySkin = new Map<string, FamilyReconstructionAttachmentRecord[]>();
    for (const attachment of family.attachments) {
      const current = attachmentsBySkin.get(attachment.skinName) ?? [];
      current.push(attachment);
      attachmentsBySkin.set(attachment.skinName, current);
    }
    for (const section of familySections) {
      const attachments = attachmentsBySkin.get(section.skinName) ?? [];
      sections.push(buildSectionBundleRecord(family, section, attachments, familyBundle));
    }
  }

  sections.sort(sortSectionBundles);
  return {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    sectionCount: sections.length,
    sections
  };
}
