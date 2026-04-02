import type {
  FamilyReconstructionAttachmentRecord,
  FamilyReconstructionMapRecord,
  FamilyReconstructionMapsFile,
  FamilyReconstructionSectionRecord,
  FamilyReconstructionSectionsFile
} from "./shared";

interface SummarizeFamilyReconstructionSectionsOptions {
  donorId: string;
  donorName: string;
  familyReconstructionMaps: FamilyReconstructionMapsFile;
}

function buildSectionState(
  mappedAttachmentCount: number,
  unmappedAttachmentCount: number
): FamilyReconstructionSectionRecord["sectionState"] {
  if (mappedAttachmentCount > 0 && unmappedAttachmentCount === 0) {
    return "ready-for-skin-reconstruction";
  }
  return "needs-manual-section-review";
}

function buildNextSectionStep(
  familyName: string,
  skinName: string,
  mappedAttachmentCount: number,
  unmappedAttachmentCount: number
): string {
  if (mappedAttachmentCount > 0 && unmappedAttachmentCount === 0) {
    return `Skin ${skinName} in ${familyName} has fully grounded attachment coverage. Next step: reconstruct this skin as a reusable state section.`;
  }
  return `Skin ${skinName} in ${familyName} still has ${unmappedAttachmentCount} unmapped attachment${unmappedAttachmentCount === 1 ? "" : "s"}. Next step: review this section manually before reconstruction.`;
}

function sortSections(left: FamilyReconstructionSectionRecord, right: FamilyReconstructionSectionRecord): number {
  if (left.mappedAttachmentCount !== right.mappedAttachmentCount) {
    return right.mappedAttachmentCount - left.mappedAttachmentCount;
  }
  if (left.attachmentCount !== right.attachmentCount) {
    return right.attachmentCount - left.attachmentCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

function buildSectionRecord(
  family: FamilyReconstructionMapRecord,
  skinName: string,
  attachments: FamilyReconstructionAttachmentRecord[]
): FamilyReconstructionSectionRecord {
  const mappedAttachments = attachments.filter((attachment) => attachment.matchType !== "unmapped");
  const unmappedAttachments = attachments.filter((attachment) => attachment.matchType === "unmapped");
  const atlasPageNames = Array.from(new Set(
    mappedAttachments
      .map((attachment) => attachment.pageName)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  )).sort((left, right) => left.localeCompare(right));
  const atlasRegionNames = Array.from(new Set(
    mappedAttachments
      .map((attachment) => attachment.regionName)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  )).sort((left, right) => left.localeCompare(right));
  const slotNames = Array.from(new Set(
    attachments
      .map((attachment) => attachment.slotName)
      .filter((value) => value.length > 0)
  )).sort((left, right) => left.localeCompare(right));
  const mappedAttachmentCount = mappedAttachments.length;
  const unmappedAttachmentCount = unmappedAttachments.length;

  return {
    familyName: family.familyName,
    sectionKey: `${family.familyName}/${skinName}`,
    sectionType: "spine-skin",
    skinName,
    readiness: family.readiness,
    profileState: family.profileState,
    sectionState: buildSectionState(mappedAttachmentCount, unmappedAttachmentCount),
    attachmentCount: attachments.length,
    mappedAttachmentCount,
    unmappedAttachmentCount,
    atlasPageCount: atlasPageNames.length,
    atlasPageNames,
    atlasRegionCount: atlasRegionNames.length,
    regionPreview: atlasRegionNames.slice(0, 8),
    slotPreview: slotNames.slice(0, 8),
    animationNames: family.animationNames,
    sampleLocalSourcePath: family.sampleLocalSourcePath,
    reconstructionMapPath: `${family.familyName}`,
    nextSectionStep: buildNextSectionStep(family.familyName, skinName, mappedAttachmentCount, unmappedAttachmentCount)
  };
}

export function summarizeFamilyReconstructionSections(
  options: SummarizeFamilyReconstructionSectionsOptions
): FamilyReconstructionSectionsFile {
  const sections: FamilyReconstructionSectionRecord[] = [];

  for (const family of options.familyReconstructionMaps.families) {
    const attachmentMap = new Map<string, FamilyReconstructionAttachmentRecord[]>();
    for (const attachment of family.attachments) {
      const current = attachmentMap.get(attachment.skinName) ?? [];
      current.push(attachment);
      attachmentMap.set(attachment.skinName, current);
    }
    for (const [skinName, attachments] of attachmentMap.entries()) {
      sections.push(buildSectionRecord(family, skinName, attachments));
    }
  }

  sections.sort(sortSections);
  return {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    sectionCount: sections.length,
    sections
  };
}
