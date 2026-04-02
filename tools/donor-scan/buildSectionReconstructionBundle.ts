import type {
  FamilyReconstructionAttachmentRecord,
  SectionReconstructionBundleFile,
  SectionReconstructionPageGroupRecord,
  SectionReconstructionSlotGroupRecord,
  SectionReconstructionWorksetFile
} from "./shared";

interface BuildSectionReconstructionBundleOptions {
  workset: SectionReconstructionWorksetFile;
  worksetPath: string;
}

function sortNames(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function buildReconstructionState(
  mappedAttachmentCount: number,
  unmappedAttachmentCount: number
): SectionReconstructionBundleFile["reconstructionState"] {
  if (mappedAttachmentCount > 0 && unmappedAttachmentCount === 0) {
    return "ready-for-section-skin-reconstruction";
  }
  return "needs-manual-section-reconstruction";
}

function buildPageGroups(
  attachments: FamilyReconstructionAttachmentRecord[]
): SectionReconstructionPageGroupRecord[] {
  const groups = new Map<string, FamilyReconstructionAttachmentRecord[]>();
  for (const attachment of attachments) {
    const pageName = attachment.pageName ?? "(unassigned)";
    const current = groups.get(pageName) ?? [];
    current.push(attachment);
    groups.set(pageName, current);
  }

  return Array.from(groups.entries())
    .map(([pageName, pageAttachments]) => ({
      pageName,
      attachmentCount: pageAttachments.length,
      attachmentNames: sortNames(pageAttachments.map((attachment) => attachment.attachmentName)),
      slotNames: sortNames(pageAttachments.map((attachment) => attachment.slotName)),
      regionNames: sortNames(pageAttachments.map((attachment) => attachment.regionName).filter((value): value is string => typeof value === "string" && value.length > 0))
    }))
    .sort((left, right) => {
      if (left.attachmentCount !== right.attachmentCount) {
        return right.attachmentCount - left.attachmentCount;
      }
      return left.pageName.localeCompare(right.pageName);
    });
}

function buildSlotGroups(
  attachments: FamilyReconstructionAttachmentRecord[]
): SectionReconstructionSlotGroupRecord[] {
  const groups = new Map<string, FamilyReconstructionAttachmentRecord[]>();
  for (const attachment of attachments) {
    const current = groups.get(attachment.slotName) ?? [];
    current.push(attachment);
    groups.set(attachment.slotName, current);
  }

  return Array.from(groups.entries())
    .map(([slotName, slotAttachments]) => ({
      slotName,
      attachmentCount: slotAttachments.length,
      attachmentNames: sortNames(slotAttachments.map((attachment) => attachment.attachmentName)),
      pageNames: sortNames(slotAttachments.map((attachment) => attachment.pageName).filter((value): value is string => typeof value === "string" && value.length > 0)),
      regionNames: sortNames(slotAttachments.map((attachment) => attachment.regionName).filter((value): value is string => typeof value === "string" && value.length > 0))
    }))
    .sort((left, right) => {
      if (left.attachmentCount !== right.attachmentCount) {
        return right.attachmentCount - left.attachmentCount;
      }
      return left.slotName.localeCompare(right.slotName);
    });
}

export function buildSectionReconstructionBundle(
  options: BuildSectionReconstructionBundleOptions
): SectionReconstructionBundleFile {
  const { workset } = options;
  const pageGroups = buildPageGroups(workset.attachments);
  const slotGroups = buildSlotGroups(workset.attachments);
  const nextReconstructionStep = buildReconstructionState(workset.mappedAttachmentCount, workset.unmappedAttachmentCount) === "ready-for-section-skin-reconstruction"
    ? `${workset.sectionKey}: use the page and slot groups for deeper section skin reconstruction.`
    : workset.nextSectionStep;

  return {
    schemaVersion: "0.1.0",
    donorId: workset.donorId,
    donorName: workset.donorName,
    generatedAt: new Date().toISOString(),
    familyName: workset.familyName,
    sectionKey: workset.sectionKey,
    sectionType: workset.sectionType,
    skinName: workset.skinName,
    sourceReadiness: workset.readiness,
    profileState: workset.profileState,
    sectionState: workset.sectionState,
    sectionBundleState: workset.bundleState,
    reconstructionState: buildReconstructionState(workset.mappedAttachmentCount, workset.unmappedAttachmentCount),
    attachmentCount: workset.attachmentCount,
    mappedAttachmentCount: workset.mappedAttachmentCount,
    unmappedAttachmentCount: workset.unmappedAttachmentCount,
    atlasPageCount: workset.atlasPageCount,
    atlasPageNames: workset.atlasPageNames,
    atlasRegionCount: workset.atlasRegionCount,
    atlasRegionNames: workset.atlasRegionNames,
    slotCount: workset.slotNames.length,
    slotNames: workset.slotNames,
    animationNames: workset.animationNames,
    exactLocalSourceCount: workset.exactLocalSourceCount,
    relatedLocalSourceCount: workset.relatedLocalSourceCount,
    localSources: workset.localSources,
    sampleLocalSourcePath: workset.sampleLocalSourcePath,
    worksetPath: options.worksetPath,
    sectionBundlePath: workset.sectionBundlePath,
    reconstructionBundlePath: workset.reconstructionBundlePath,
    nextReconstructionStep,
    pageGroups,
    slotGroups,
    attachments: workset.attachments
  };
}
