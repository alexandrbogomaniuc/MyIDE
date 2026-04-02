import type {
  FamilyReconstructionAttachmentRecord,
  SectionSkinBlueprintFile,
  SectionSkinBlueprintPageRecord,
  SectionSkinBlueprintSlotRecord,
  SectionReconstructionBundleFile
} from "./shared";

interface BuildSectionSkinBlueprintOptions {
  reconstructionBundle: SectionReconstructionBundleFile;
}

function uniqueOrdered(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    if (value.length === 0 || seen.has(value)) {
      continue;
    }
    seen.add(value);
    ordered.push(value);
  }
  return ordered;
}

function buildBlueprintState(
  mappedAttachmentCount: number,
  unmappedAttachmentCount: number
): SectionSkinBlueprintFile["blueprintState"] {
  if (mappedAttachmentCount > 0 && unmappedAttachmentCount === 0) {
    return "ready-for-slot-order-reconstruction";
  }
  return "needs-manual-slot-review";
}

function buildSlots(
  attachments: FamilyReconstructionAttachmentRecord[]
): SectionSkinBlueprintSlotRecord[] {
  const groups = new Map<string, FamilyReconstructionAttachmentRecord[]>();
  const order: string[] = [];

  for (const attachment of attachments) {
    if (!groups.has(attachment.slotName)) {
      groups.set(attachment.slotName, []);
      order.push(attachment.slotName);
    }
    groups.get(attachment.slotName)?.push(attachment);
  }

  return order.map((slotName, index) => {
    const slotAttachments = groups.get(slotName) ?? [];
    return {
      orderIndex: index,
      slotName,
      attachmentCount: slotAttachments.length,
      attachmentNames: uniqueOrdered(slotAttachments.map((attachment) => attachment.attachmentName)),
      attachmentPaths: uniqueOrdered(slotAttachments.map((attachment) => attachment.attachmentPath ?? "").filter((value) => value.length > 0)),
      pageNames: uniqueOrdered(slotAttachments.map((attachment) => attachment.pageName ?? "").filter((value) => value.length > 0)),
      regionNames: uniqueOrdered(slotAttachments.map((attachment) => attachment.regionName ?? "").filter((value) => value.length > 0))
    };
  });
}

function buildPages(
  attachments: FamilyReconstructionAttachmentRecord[]
): SectionSkinBlueprintPageRecord[] {
  const groups = new Map<string, FamilyReconstructionAttachmentRecord[]>();
  const order: string[] = [];

  for (const attachment of attachments) {
    const pageName = attachment.pageName ?? "(unassigned)";
    if (!groups.has(pageName)) {
      groups.set(pageName, []);
      order.push(pageName);
    }
    groups.get(pageName)?.push(attachment);
  }

  return order.map((pageName, index) => {
    const pageAttachments = groups.get(pageName) ?? [];
    return {
      orderIndex: index,
      pageName,
      attachmentCount: pageAttachments.length,
      attachmentNames: uniqueOrdered(pageAttachments.map((attachment) => attachment.attachmentName)),
      slotNames: uniqueOrdered(pageAttachments.map((attachment) => attachment.slotName)),
      regionNames: uniqueOrdered(pageAttachments.map((attachment) => attachment.regionName ?? "").filter((value) => value.length > 0))
    };
  });
}

export function buildSectionSkinBlueprint(
  options: BuildSectionSkinBlueprintOptions
): SectionSkinBlueprintFile {
  const reconstructionBundle = options.reconstructionBundle;
  const slots = buildSlots(reconstructionBundle.attachments);
  const pages = buildPages(reconstructionBundle.attachments);
  const blueprintState = buildBlueprintState(
    reconstructionBundle.mappedAttachmentCount,
    reconstructionBundle.unmappedAttachmentCount
  );
  const nextSkinStep = blueprintState === "ready-for-slot-order-reconstruction"
    ? `${reconstructionBundle.sectionKey}: use the ordered slot blueprint for deeper skin reconstruction.`
    : reconstructionBundle.nextReconstructionStep;

  return {
    schemaVersion: "0.1.0",
    donorId: reconstructionBundle.donorId,
    donorName: reconstructionBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: reconstructionBundle.familyName,
    sectionKey: reconstructionBundle.sectionKey,
    skinName: reconstructionBundle.skinName,
    blueprintState,
    reconstructionState: reconstructionBundle.reconstructionState,
    attachmentCount: reconstructionBundle.attachmentCount,
    mappedAttachmentCount: reconstructionBundle.mappedAttachmentCount,
    unmappedAttachmentCount: reconstructionBundle.unmappedAttachmentCount,
    atlasPageCount: reconstructionBundle.atlasPageCount,
    atlasPageNames: reconstructionBundle.atlasPageNames,
    slotCount: slots.length,
    slotOrder: slots.map((slot) => slot.slotName),
    exactLocalSourceCount: reconstructionBundle.exactLocalSourceCount,
    relatedLocalSourceCount: reconstructionBundle.relatedLocalSourceCount,
    sampleLocalSourcePath: reconstructionBundle.sampleLocalSourcePath,
    sectionBundlePath: reconstructionBundle.sectionBundlePath,
    reconstructionBundlePath: reconstructionBundle.reconstructionBundlePath,
    worksetPath: reconstructionBundle.worksetPath,
    nextSkinStep,
    slots,
    pages
  };
}
