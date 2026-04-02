import path from "node:path";
import type {
  FamilyReconstructionAttachmentRecord,
  FamilyReconstructionLocalSourceRecord,
  SectionReconstructionBundleFile,
  SectionSkinBlueprintFile,
  SectionSkinRenderBounds,
  SectionSkinRenderLayerRecord,
  SectionSkinRenderOffsets,
  SectionSkinRenderPlanFile
} from "./shared";
import { fileExists, readOptionalTextFile, workspaceRoot } from "./shared";

interface BuildSectionSkinRenderPlanOptions {
  reconstructionBundle: SectionReconstructionBundleFile;
  skinBlueprint: SectionSkinBlueprintFile;
  skinBlueprintPath: string;
}

interface ParsedAtlasRegionRecord {
  pageName: string;
  rotated: boolean;
  bounds: SectionSkinRenderBounds | null;
  offsets: SectionSkinRenderOffsets | null;
}

interface ParsedAtlasLayout {
  regionMap: Map<string, ParsedAtlasRegionRecord>;
}

function parseNumberList(value: string, expectedCount: number): number[] | null {
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== expectedCount || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  return parts;
}

function parseAtlasLayout(text: string): ParsedAtlasLayout {
  const lines = text.split(/\r?\n/);
  const regionMap = new Map<string, ParsedAtlasRegionRecord>();
  let currentPage: string | null = null;
  let currentRegion: string | null = null;
  let awaitingPage = true;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.length === 0) {
      currentPage = null;
      currentRegion = null;
      awaitingPage = true;
      continue;
    }

    if (awaitingPage) {
      if (trimmed.includes(":")) {
        continue;
      }
      if (/\.(png|webp|jpg|jpeg|svg)$/i.test(trimmed)) {
        currentPage = trimmed;
        currentRegion = null;
        awaitingPage = false;
      }
      continue;
    }

    if (!currentPage) {
      continue;
    }

    if (!trimmed.includes(":")) {
      currentRegion = trimmed;
      regionMap.set(trimmed, {
        pageName: currentPage,
        rotated: false,
        bounds: null,
        offsets: null
      });
      continue;
    }

    if (!currentRegion) {
      continue;
    }

    const [rawKey, rawValue = ""] = trimmed.split(/:(.+)/, 2);
    const key = rawKey.trim().toLowerCase();
    const value = rawValue.trim();
    const record = regionMap.get(currentRegion);
    if (!record) {
      continue;
    }

    if (key === "rotate") {
      record.rotated = value === "true" || value === "90";
      continue;
    }
    if (key === "bounds") {
      const parsed = parseNumberList(value, 4);
      if (parsed) {
        record.bounds = {
          x: parsed[0],
          y: parsed[1],
          width: parsed[2],
          height: parsed[3]
        };
      }
      continue;
    }
    if (key === "offsets") {
      const parsed = parseNumberList(value, 4);
      if (parsed) {
        record.offsets = {
          x: parsed[0],
          y: parsed[1],
          originalWidth: parsed[2],
          originalHeight: parsed[3]
        };
      }
    }
  }

  return { regionMap };
}

async function loadAtlasLayout(
  localSources: readonly FamilyReconstructionLocalSourceRecord[]
): Promise<{ layout: ParsedAtlasLayout; atlasSourcePath: string | null; spineSourcePath: string | null }> {
  let atlasSourcePath: string | null = null;
  let spineSourcePath: string | null = null;

  for (const localSource of localSources) {
    if (!atlasSourcePath && /\.atlas$/i.test(localSource.localPath)) {
      const absolutePath = path.join(workspaceRoot, localSource.localPath);
      if (await fileExists(absolutePath)) {
        const text = await readOptionalTextFile(absolutePath);
        if (text) {
          atlasSourcePath = localSource.localPath;
          return {
            layout: parseAtlasLayout(text),
            atlasSourcePath,
            spineSourcePath: localSources.find((candidate) => /\.json$/i.test(candidate.localPath))?.localPath ?? null
          };
        }
      }
    }
  }

  spineSourcePath = localSources.find((candidate) => /\.json$/i.test(candidate.localPath))?.localPath ?? null;
  return {
    layout: { regionMap: new Map() },
    atlasSourcePath,
    spineSourcePath
  };
}

function findLocalPagePath(
  pageName: string | null,
  localSources: readonly FamilyReconstructionLocalSourceRecord[]
): string | null {
  if (!pageName) {
    return null;
  }
  for (const localSource of localSources) {
    if (path.basename(localSource.localPath) === pageName) {
      return localSource.localPath;
    }
  }
  return null;
}

function findPreferredAttachment(
  slotName: string,
  attachments: readonly FamilyReconstructionAttachmentRecord[]
): FamilyReconstructionAttachmentRecord | null {
  return attachments.find((attachment) => attachment.slotName === slotName) ?? null;
}

export async function buildSectionSkinRenderPlan(
  options: BuildSectionSkinRenderPlanOptions
): Promise<SectionSkinRenderPlanFile> {
  const { reconstructionBundle, skinBlueprint } = options;
  const { layout, atlasSourcePath, spineSourcePath } = await loadAtlasLayout(reconstructionBundle.localSources);
  const layers: SectionSkinRenderLayerRecord[] = skinBlueprint.slotOrder.map((slotName, orderIndex) => {
    const slotRecord = skinBlueprint.slots.find((slot) => slot.slotName === slotName) ?? null;
    const attachment = findPreferredAttachment(slotName, reconstructionBundle.attachments);
    const regionName = attachment?.regionName ?? slotRecord?.regionNames[0] ?? null;
    const atlasRegion = regionName ? layout.regionMap.get(regionName) ?? null : null;
    const pageName = attachment?.pageName ?? atlasRegion?.pageName ?? slotRecord?.pageNames[0] ?? null;

    return {
      orderIndex,
      slotName,
      attachmentName: attachment?.attachmentName ?? slotRecord?.attachmentNames[0] ?? null,
      attachmentPath: attachment?.attachmentPath ?? slotRecord?.attachmentPaths[0] ?? null,
      pageName,
      regionName,
      layerState: atlasRegion ? "atlas-region-exact" : "missing-atlas-region",
      rotated: atlasRegion?.rotated ?? false,
      bounds: atlasRegion?.bounds ?? null,
      offsets: atlasRegion?.offsets ?? null,
      localPagePath: findLocalPagePath(pageName, reconstructionBundle.localSources)
    };
  });

  const mappedLayerCount = layers.filter((layer) => layer.layerState === "atlas-region-exact").length;
  const unmappedLayerCount = layers.length - mappedLayerCount;
  const renderState: SectionSkinRenderPlanFile["renderState"] = layers.length > 0 && unmappedLayerCount === 0
    ? "ready-for-layered-render-reconstruction"
    : "needs-manual-render-review";
  const nextRenderStep = renderState === "ready-for-layered-render-reconstruction"
    ? `${reconstructionBundle.sectionKey}: use the ordered render layers with atlas geometry for deeper skin or section reconstruction.`
    : skinBlueprint.nextSkinStep;

  return {
    schemaVersion: "0.1.0",
    donorId: reconstructionBundle.donorId,
    donorName: reconstructionBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: reconstructionBundle.familyName,
    sectionKey: reconstructionBundle.sectionKey,
    skinName: reconstructionBundle.skinName,
    renderState,
    blueprintState: skinBlueprint.blueprintState,
    reconstructionState: reconstructionBundle.reconstructionState,
    attachmentCount: reconstructionBundle.attachmentCount,
    mappedAttachmentCount: reconstructionBundle.mappedAttachmentCount,
    unmappedAttachmentCount: reconstructionBundle.unmappedAttachmentCount,
    atlasPageCount: reconstructionBundle.atlasPageCount,
    atlasPageNames: reconstructionBundle.atlasPageNames,
    slotCount: skinBlueprint.slotCount,
    exactLocalSourceCount: reconstructionBundle.exactLocalSourceCount,
    relatedLocalSourceCount: reconstructionBundle.relatedLocalSourceCount,
    sampleLocalSourcePath: reconstructionBundle.sampleLocalSourcePath,
    atlasSourcePath,
    spineSourcePath,
    sectionBundlePath: reconstructionBundle.sectionBundlePath,
    reconstructionBundlePath: reconstructionBundle.reconstructionBundlePath,
    worksetPath: reconstructionBundle.worksetPath,
    skinBlueprintPath: options.skinBlueprintPath,
    layerCount: layers.length,
    mappedLayerCount,
    unmappedLayerCount,
    nextRenderStep,
    layers
  };
}
