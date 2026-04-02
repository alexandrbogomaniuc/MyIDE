import { execFileSync } from "node:child_process";
import path from "node:path";
import type {
  SectionSkinTextureCanvasBundleFile,
  SectionSkinTextureSourceFitBundleFile,
  SectionSkinTextureSourceFitPageRecord,
  SectionSkinTextureSourceFitPageState,
  SectionSkinTextureSourceFitState
} from "./shared";
import { workspaceRoot } from "./shared";

interface BuildSectionSkinTextureSourceFitBundleOptions {
  textureCanvasBundle: SectionSkinTextureCanvasBundleFile;
  textureCanvasBundlePath: string;
}

function parseSipsDimensions(output: string): { width: number | null; height: number | null } {
  const widthMatch = output.match(/pixelWidth:\s*(\d+)/);
  const heightMatch = output.match(/pixelHeight:\s*(\d+)/);
  return {
    width: widthMatch ? Number.parseInt(widthMatch[1], 10) : null,
    height: heightMatch ? Number.parseInt(heightMatch[1], 10) : null
  };
}

function readImageDimensions(repoRelativePath: string | null): { width: number | null; height: number | null } {
  if (!repoRelativePath) {
    return { width: null, height: null };
  }
  const absolutePath = path.isAbsolute(repoRelativePath)
    ? repoRelativePath
    : path.join(workspaceRoot, repoRelativePath);
  try {
    const output = execFileSync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", absolutePath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return parseSipsDimensions(output);
  } catch {
    return { width: null, height: null };
  }
}

function approximatelyEqual(left: number, right: number, epsilon = 0.01): boolean {
  return Math.abs(left - right) <= epsilon;
}

function buildPageState(
  sourcePageState: SectionSkinTextureCanvasBundleFile["pages"][number]["sourcePageState"],
  canvasWidth: number | null,
  canvasHeight: number | null,
  sourceWidth: number | null,
  sourceHeight: number | null,
  scaleX: number | null,
  scaleY: number | null
): SectionSkinTextureSourceFitPageState {
  if (sourcePageState === "needs-page-lock-resolution") {
    return "needs-page-lock-resolution";
  }
  if (sourcePageState === "missing-atlas-page-size" || canvasWidth === null || canvasHeight === null) {
    return "missing-atlas-page-size";
  }
  if (sourceWidth === null || sourceHeight === null) {
    return "missing-source-dimensions";
  }
  if (scaleX !== null && scaleY !== null && approximatelyEqual(scaleX, 1) && approximatelyEqual(scaleY, 1)) {
    return "exact-page-source-fit";
  }
  if (scaleX !== null && scaleY !== null && approximatelyEqual(scaleX, scaleY)) {
    return "uniform-scale-page-source-fit";
  }
  return "non-uniform-scale-page-source-fit";
}

function buildBundleState(
  pageCount: number,
  unresolvedPageLockCount: number,
  missingPageSizeCount: number,
  missingSourceDimensionCount: number,
  exactPageFitCount: number,
  uniformScalePageFitCount: number,
  nonUniformScalePageFitCount: number
): SectionSkinTextureSourceFitState {
  if (unresolvedPageLockCount > 0) {
    return "needs-page-lock-resolution";
  }
  if (missingPageSizeCount > 0) {
    return "needs-atlas-page-size-review";
  }
  if (missingSourceDimensionCount > 0) {
    return "needs-source-dimension-review";
  }
  if (pageCount > 0 && exactPageFitCount === pageCount) {
    return "ready-with-exact-page-source-fits";
  }
  if (pageCount > 0 && exactPageFitCount + uniformScalePageFitCount === pageCount) {
    return "ready-with-uniform-page-source-fits";
  }
  if (pageCount > 0 && exactPageFitCount + uniformScalePageFitCount + nonUniformScalePageFitCount === pageCount) {
    return "ready-with-non-uniform-page-source-fits";
  }
  return "needs-source-dimension-review";
}

export function buildSectionSkinTextureSourceFitBundle(
  options: BuildSectionSkinTextureSourceFitBundleOptions
): SectionSkinTextureSourceFitBundleFile {
  const pages: SectionSkinTextureSourceFitPageRecord[] = options.textureCanvasBundle.pages.map((page) => {
    const { width: sourceWidth, height: sourceHeight } = readImageDimensions(page.selectedLocalPath);
    const scaleX = typeof page.canvasWidth === "number" && typeof sourceWidth === "number" && sourceWidth > 0
      ? page.canvasWidth / sourceWidth
      : null;
    const scaleY = typeof page.canvasHeight === "number" && typeof sourceHeight === "number" && sourceHeight > 0
      ? page.canvasHeight / sourceHeight
      : null;
    const scaleDelta = scaleX !== null && scaleY !== null ? Math.abs(scaleX - scaleY) : null;
    const pageState = buildPageState(page.sourcePageState, page.canvasWidth, page.canvasHeight, sourceWidth, sourceHeight, scaleX, scaleY);
    return {
      orderIndex: page.orderIndex,
      pageName: page.pageName,
      pageState,
      sourcePageState: page.sourcePageState,
      canvasWidth: page.canvasWidth,
      canvasHeight: page.canvasHeight,
      sourceWidth,
      sourceHeight,
      selectedLocalPath: page.selectedLocalPath,
      selectedCandidateRank: page.selectedCandidateRank,
      selectedCandidateScore: page.selectedCandidateScore,
      selectedCandidateReasons: page.selectedCandidateReasons,
      selectedCandidateMatchedTokens: page.selectedCandidateMatchedTokens,
      atlasPageLocalPath: page.atlasPageLocalPath,
      drawOperationCount: page.drawOperationCount,
      readyDrawOperationCount: page.readyDrawOperationCount,
      blockedDrawOperationCount: page.blockedDrawOperationCount,
      exactFit: pageState === "exact-page-source-fit",
      uniformScaleFit: pageState === "uniform-scale-page-source-fit",
      nonUniformScaleFit: pageState === "non-uniform-scale-page-source-fit",
      scaleX,
      scaleY,
      scaleDelta,
      slotNames: page.slotNames,
      regionNames: page.regionNames
    };
  });

  const pageSizeCount = pages.filter((page) => typeof page.canvasWidth === "number" && typeof page.canvasHeight === "number").length;
  const sourceDimensionCount = pages.filter((page) => typeof page.sourceWidth === "number" && typeof page.sourceHeight === "number").length;
  const missingPageSizeCount = pages.length - pageSizeCount;
  const missingSourceDimensionCount = pages.length - sourceDimensionCount;
  const exactPageFitCount = pages.filter((page) => page.pageState === "exact-page-source-fit").length;
  const uniformScalePageFitCount = pages.filter((page) => page.pageState === "uniform-scale-page-source-fit").length;
  const nonUniformScalePageFitCount = pages.filter((page) => page.pageState === "non-uniform-scale-page-source-fit").length;
  const readyPageCount = exactPageFitCount + uniformScalePageFitCount + nonUniformScalePageFitCount;
  const blockedPageCount = pages.length - readyPageCount;
  const drawOperationCount = pages.reduce((total, page) => total + page.drawOperationCount, 0);
  const readyDrawOperationCount = pages.reduce((total, page) => total + page.readyDrawOperationCount, 0);
  const blockedDrawOperationCount = drawOperationCount - readyDrawOperationCount;
  const uniqueSelectedLocalPathCount = new Set(
    pages
      .map((page) => page.selectedLocalPath)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  ).size;
  const textureSourceFitState = buildBundleState(
    options.textureCanvasBundle.pageCount,
    options.textureCanvasBundle.unresolvedPageLockCount,
    missingPageSizeCount,
    missingSourceDimensionCount,
    exactPageFitCount,
    uniformScalePageFitCount,
    nonUniformScalePageFitCount
  );
  const topFittedLocalPath = pages.find((page) => typeof page.selectedLocalPath === "string" && page.selectedLocalPath.length > 0)?.selectedLocalPath ?? null;
  const nextTextureSourceFitStep = textureSourceFitState === "ready-with-exact-page-source-fits"
    ? `${options.textureCanvasBundle.sectionKey}: use the section skin texture source-fit bundle directly for final texture reconstruction because every locked page source already matches the atlas page size exactly.`
    : textureSourceFitState === "ready-with-uniform-page-source-fits"
      ? `${options.textureCanvasBundle.sectionKey}: use the section skin texture source-fit bundle for final texture reconstruction and apply one uniform scale per page because every locked page source already fits the atlas page ratio.`
      : textureSourceFitState === "ready-with-non-uniform-page-source-fits"
        ? `${options.textureCanvasBundle.sectionKey}: review the non-uniform page-source fits before final texture reconstruction because at least one locked page source does not match the atlas page aspect ratio.`
        : textureSourceFitState === "needs-atlas-page-size-review"
          ? `${options.textureCanvasBundle.sectionKey}: review the atlas page sizes before donor scan can verify the locked page-source fits cleanly.`
          : textureSourceFitState === "needs-page-lock-resolution"
            ? `${options.textureCanvasBundle.sectionKey}: resolve the remaining page-lock issues before donor scan can verify the locked page-source fits cleanly.`
            : `${options.textureCanvasBundle.sectionKey}: review or replace the selected local page sources because donor scan could not read dimensions for every locked source.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.textureCanvasBundle.donorId,
    donorName: options.textureCanvasBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.textureCanvasBundle.familyName,
    sectionKey: options.textureCanvasBundle.sectionKey,
    skinName: options.textureCanvasBundle.skinName,
    textureSourceFitState,
    textureCanvasState: options.textureCanvasBundle.textureCanvasState,
    textureRenderState: options.textureCanvasBundle.textureRenderState,
    textureAssemblyState: options.textureCanvasBundle.textureAssemblyState,
    textureLockState: options.textureCanvasBundle.textureLockState,
    pageLockApplyState: options.textureCanvasBundle.pageLockApplyState,
    pageLockApprovalState: options.textureCanvasBundle.pageLockApprovalState,
    textureReconstructionState: options.textureCanvasBundle.textureReconstructionState,
    textureSourceState: options.textureCanvasBundle.textureSourceState,
    matchState: options.textureCanvasBundle.matchState,
    reviewState: options.textureCanvasBundle.reviewState,
    materialState: options.textureCanvasBundle.materialState,
    renderState: options.textureCanvasBundle.renderState,
    blueprintState: options.textureCanvasBundle.blueprintState,
    reconstructionState: options.textureCanvasBundle.reconstructionState,
    pageCount: options.textureCanvasBundle.pageCount,
    pageSizeCount,
    sourceDimensionCount,
    missingPageSizeCount,
    missingSourceDimensionCount,
    exactPageLockCount: options.textureCanvasBundle.exactPageLockCount,
    appliedPageLockCount: options.textureCanvasBundle.appliedPageLockCount,
    unresolvedPageLockCount: options.textureCanvasBundle.unresolvedPageLockCount,
    exactPageFitCount,
    uniformScalePageFitCount,
    nonUniformScalePageFitCount,
    readyPageCount,
    blockedPageCount,
    uniqueSelectedLocalPathCount,
    drawOperationCount,
    readyDrawOperationCount,
    blockedDrawOperationCount,
    topFittedLocalPath,
    sampleLocalSourcePath: options.textureCanvasBundle.sampleLocalSourcePath,
    atlasSourcePath: options.textureCanvasBundle.atlasSourcePath,
    textureCanvasBundlePath: options.textureCanvasBundlePath,
    nextTextureSourceFitStep,
    pages
  };
}
