import path from "node:path";
import type { ModificationQueueFile, ModificationQueueItem } from "../investigation/promotionQueue";
import {
  buildDonorScanPaths,
  readJsonFile,
  readOptionalJsonFile,
  toRepoRelativePath,
  workspaceRoot,
  writeJsonFile,
  type DonorScanPaths
} from "../../tools/donor-scan/shared";

type JsonRecord = Record<string, unknown>;

type ModificationTaskStatus = "ready-for-compose-runtime" | "blocked-missing-artifact";
type WorkflowPanelTarget = "compose" | "runtime";
type WorkbenchModeTarget = "scene" | "runtime";
type ArtifactKind =
  | "texture-fit-apply-bundle"
  | "texture-fit-approval-bundle"
  | "texture-fit-decision-bundle"
  | "texture-fit-review-bundle"
  | "texture-source-fit-bundle"
  | "texture-canvas-bundle"
  | "texture-render-bundle"
  | "texture-assembly-bundle"
  | "texture-lock-bundle"
  | "texture-reconstruction-bundle"
  | "texture-source-plan"
  | "texture-input-bundle"
  | "page-lock-apply-bundle"
  | "page-lock-approval-bundle"
  | "page-lock-review-bundle"
  | "page-lock-decision-bundle"
  | "page-lock-resolution-bundle"
  | "page-lock-audit-bundle"
  | "page-lock-bundle"
  | "page-match-bundle"
  | "material-review-bundle"
  | "material-plan"
  | "render-plan"
  | "skin-blueprint"
  | "section-reconstruction-bundle"
  | "family-reconstruction-section-bundle"
  | "queue-source";

export interface ProjectModificationTask {
  taskId: string;
  queueId: string;
  scenarioId: string;
  displayName: string;
  promotionKind: "family" | "section";
  familyName: string;
  sectionKey: string | null;
  taskStatus: ModificationTaskStatus;
  recommendedWorkbench: "compose" | "runtime" | "compose-runtime";
  preferredWorkflowPanel: WorkflowPanelTarget;
  preferredWorkbenchMode: WorkbenchModeTarget;
  sourceArtifactKind: ArtifactKind;
  sourceArtifactState: string | null;
  sourceArtifactPath: string | null;
  supportingArtifactPaths: string[];
  rationale: string;
  nextAction: string;
  canOpenCompose: boolean;
  canOpenRuntime: boolean;
}

export interface ProjectModificationHandoffFile {
  schemaVersion: string;
  projectId: string;
  projectDisplayName: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  currentStage: string;
  recommendedStage: "investigation" | "modificationComposeRuntime";
  handoffState: "ready-for-modification" | "mixed-ready" | "blocked";
  sourceQueuePath: string;
  queueItemCount: number;
  readyTaskCount: number;
  blockedTaskCount: number;
  nextOperatorAction: string;
  tasks: ProjectModificationTask[];
}

interface ResolvedSectionArtifact {
  artifactKind: ArtifactKind;
  artifactState: string | null;
  artifactPath: string | null;
  supportingArtifactPaths: string[];
  nextAction: string | null;
}

interface SectionArtifactSpec {
  artifactKind: ArtifactKind;
  profilePath: (paths: DonorScanPaths) => string;
  artifactPathField: string;
  artifactStateField: string;
  nextActionField: string;
  supportFields?: string[];
}

const sectionArtifactSpecs: readonly SectionArtifactSpec[] = [
  {
    artifactKind: "texture-fit-apply-bundle",
    profilePath: (paths) => paths.sectionSkinTextureFitApplyBundleProfilesPath,
    artifactPathField: "textureFitApplyBundlePath",
    artifactStateField: "textureFitApplyState",
    nextActionField: "nextTextureFitApplyStep",
    supportFields: ["textureFitApprovalBundlePath", "atlasSourcePath", "sampleLocalSourcePath", "topAppliedLocalPath"]
  },
  {
    artifactKind: "texture-fit-approval-bundle",
    profilePath: (paths) => paths.sectionSkinTextureFitApprovalBundleProfilesPath,
    artifactPathField: "textureFitApprovalBundlePath",
    artifactStateField: "textureFitApprovalState",
    nextActionField: "nextTextureFitApprovalStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topFitApprovalLocalPath"]
  },
  {
    artifactKind: "texture-fit-decision-bundle",
    profilePath: (paths) => paths.sectionSkinTextureFitDecisionBundleProfilesPath,
    artifactPathField: "textureFitDecisionBundlePath",
    artifactStateField: "textureFitDecisionState",
    nextActionField: "nextTextureFitDecisionStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topFitDecisionLocalPath"]
  },
  {
    artifactKind: "texture-fit-review-bundle",
    profilePath: (paths) => paths.sectionSkinTextureFitReviewBundleProfilesPath,
    artifactPathField: "textureFitReviewBundlePath",
    artifactStateField: "textureFitReviewState",
    nextActionField: "nextTextureFitReviewStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topFitReviewLocalPath"]
  },
  {
    artifactKind: "texture-source-fit-bundle",
    profilePath: (paths) => paths.sectionSkinTextureSourceFitBundleProfilesPath,
    artifactPathField: "textureSourceFitBundlePath",
    artifactStateField: "textureSourceFitState",
    nextActionField: "nextTextureSourceFitStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topFittedLocalPath"]
  },
  {
    artifactKind: "texture-canvas-bundle",
    profilePath: (paths) => paths.sectionSkinTextureCanvasBundleProfilesPath,
    artifactPathField: "textureCanvasBundlePath",
    artifactStateField: "textureCanvasState",
    nextActionField: "nextTextureCanvasStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topCanvasLocalPath"]
  },
  {
    artifactKind: "texture-render-bundle",
    profilePath: (paths) => paths.sectionSkinTextureRenderBundleProfilesPath,
    artifactPathField: "textureRenderBundlePath",
    artifactStateField: "textureRenderState",
    nextActionField: "nextTextureRenderStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topRenderLocalPath"]
  },
  {
    artifactKind: "texture-assembly-bundle",
    profilePath: (paths) => paths.sectionSkinTextureAssemblyBundleProfilesPath,
    artifactPathField: "textureAssemblyBundlePath",
    artifactStateField: "textureAssemblyState",
    nextActionField: "nextTextureAssemblyStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topAssemblyLocalPath"]
  },
  {
    artifactKind: "texture-lock-bundle",
    profilePath: (paths) => paths.sectionSkinTextureLockBundleProfilesPath,
    artifactPathField: "textureLockBundlePath",
    artifactStateField: "textureLockState",
    nextActionField: "nextTextureLockStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topLockedLocalPath"]
  },
  {
    artifactKind: "texture-reconstruction-bundle",
    profilePath: (paths) => paths.sectionSkinTextureReconstructionBundleProfilesPath,
    artifactPathField: "textureReconstructionBundlePath",
    artifactStateField: "textureReconstructionState",
    nextActionField: "nextTextureReconstructionStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topReconstructionLocalPath"]
  },
  {
    artifactKind: "texture-source-plan",
    profilePath: (paths) => paths.sectionSkinTextureSourcePlanProfilesPath,
    artifactPathField: "textureSourcePlanPath",
    artifactStateField: "textureSourceState",
    nextActionField: "nextTextureSourcePlanStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topProposedLocalPath"]
  },
  {
    artifactKind: "texture-input-bundle",
    profilePath: (paths) => paths.sectionSkinTextureInputBundleProfilesPath,
    artifactPathField: "textureInputBundlePath",
    artifactStateField: "textureInputState",
    nextActionField: "nextTextureInputStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topLockedLocalPath"]
  },
  {
    artifactKind: "page-lock-apply-bundle",
    profilePath: (paths) => paths.sectionSkinPageLockApplyBundleProfilesPath,
    artifactPathField: "pageLockApplyBundlePath",
    artifactStateField: "pageLockApplyState",
    nextActionField: "nextPageLockApplyStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topAppliedLocalPath"]
  },
  {
    artifactKind: "page-lock-approval-bundle",
    profilePath: (paths) => paths.sectionSkinPageLockApprovalBundleProfilesPath,
    artifactPathField: "pageLockApprovalBundlePath",
    artifactStateField: "pageLockApprovalState",
    nextActionField: "nextPageLockApprovalStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topApprovedLocalPath"]
  },
  {
    artifactKind: "page-lock-review-bundle",
    profilePath: (paths) => paths.sectionSkinPageLockReviewBundleProfilesPath,
    artifactPathField: "pageLockReviewBundlePath",
    artifactStateField: "pageLockReviewState",
    nextActionField: "nextPageLockReviewStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topReviewLocalPath"]
  },
  {
    artifactKind: "page-lock-decision-bundle",
    profilePath: (paths) => paths.sectionSkinPageLockDecisionBundleProfilesPath,
    artifactPathField: "pageLockDecisionBundlePath",
    artifactStateField: "pageLockDecisionState",
    nextActionField: "nextPageLockDecisionStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topDecisionLocalPath"]
  },
  {
    artifactKind: "page-lock-resolution-bundle",
    profilePath: (paths) => paths.sectionSkinPageLockResolutionBundleProfilesPath,
    artifactPathField: "pageLockResolutionBundlePath",
    artifactStateField: "pageLockResolutionState",
    nextActionField: "nextPageLockResolutionStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath", "topResolvedLocalPath"]
  },
  {
    artifactKind: "page-lock-audit-bundle",
    profilePath: (paths) => paths.sectionSkinPageLockAuditBundleProfilesPath,
    artifactPathField: "pageLockAuditBundlePath",
    artifactStateField: "pageLockAuditState",
    nextActionField: "nextPageLockAuditStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath"]
  },
  {
    artifactKind: "page-lock-bundle",
    profilePath: (paths) => paths.sectionSkinPageLockBundleProfilesPath,
    artifactPathField: "pageLockBundlePath",
    artifactStateField: "pageLockState",
    nextActionField: "nextPageLockStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath"]
  },
  {
    artifactKind: "page-match-bundle",
    profilePath: (paths) => paths.sectionSkinPageMatchBundleProfilesPath,
    artifactPathField: "pageMatchBundlePath",
    artifactStateField: "matchState",
    nextActionField: "nextPageMatchStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath"]
  },
  {
    artifactKind: "material-review-bundle",
    profilePath: (paths) => paths.sectionSkinMaterialReviewBundleProfilesPath,
    artifactPathField: "materialReviewBundlePath",
    artifactStateField: "reviewState",
    nextActionField: "nextMaterialReviewStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath"]
  },
  {
    artifactKind: "material-plan",
    profilePath: (paths) => paths.sectionSkinMaterialPlanProfilesPath,
    artifactPathField: "materialPlanPath",
    artifactStateField: "materialState",
    nextActionField: "nextMaterialPlanStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath"]
  },
  {
    artifactKind: "render-plan",
    profilePath: (paths) => paths.sectionSkinRenderPlanProfilesPath,
    artifactPathField: "renderPlanPath",
    artifactStateField: "renderState",
    nextActionField: "nextRenderPlanStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath"]
  },
  {
    artifactKind: "skin-blueprint",
    profilePath: (paths) => paths.sectionSkinBlueprintProfilesPath,
    artifactPathField: "skinBlueprintPath",
    artifactStateField: "skinState",
    nextActionField: "nextSkinBlueprintStep",
    supportFields: ["atlasSourcePath", "sampleLocalSourcePath"]
  },
  {
    artifactKind: "section-reconstruction-bundle",
    profilePath: (paths) => paths.sectionReconstructionProfilesPath,
    artifactPathField: "reconstructionBundlePath",
    artifactStateField: "reconstructionState",
    nextActionField: "nextReconstructionStep",
    supportFields: ["reconstructionWorksetPath", "atlasSourcePath", "sampleLocalSourcePath"]
  },
  {
    artifactKind: "family-reconstruction-section-bundle",
    profilePath: (paths) => paths.familyReconstructionSectionBundlesPath,
    artifactPathField: "reconstructionBundlePath",
    artifactStateField: "sectionState",
    nextActionField: "nextSectionStep",
    supportFields: ["sampleLocalSourcePath", "atlasSourcePath"]
  }
];

function getObjectArray(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is JsonRecord => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function uniqueStrings(values: readonly unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function buildTaskId(queueId: string): string {
  return `handoff:${queueId}`;
}

function toPreferredWorkflowPanel(recommendedWorkbench: ModificationQueueItem["recommendedWorkbench"]): WorkflowPanelTarget {
  return recommendedWorkbench === "runtime" ? "runtime" : "compose";
}

function toPreferredWorkbenchMode(preferredWorkflowPanel: WorkflowPanelTarget): WorkbenchModeTarget {
  return preferredWorkflowPanel === "compose" ? "scene" : "runtime";
}

async function loadStrongestSectionArtifacts(donorId: string): Promise<Map<string, ResolvedSectionArtifact>> {
  const paths = buildDonorScanPaths(donorId);
  const resolved = new Map<string, ResolvedSectionArtifact>();

  for (const spec of sectionArtifactSpecs) {
    const file = await readOptionalJsonFile<JsonRecord>(spec.profilePath(paths));
    for (const section of getObjectArray(file?.sections)) {
      const sectionKey = asString(section.sectionKey);
      if (!sectionKey || resolved.has(normalizeKey(sectionKey))) {
        continue;
      }

      const artifactPath = asString(section[spec.artifactPathField]);
      if (!artifactPath) {
        continue;
      }

      resolved.set(normalizeKey(sectionKey), {
        artifactKind: spec.artifactKind,
        artifactState: asString(section[spec.artifactStateField]) || null,
        artifactPath,
        supportingArtifactPaths: uniqueStrings([
          artifactPath,
          ...(spec.supportFields ?? []).map((field) => asString(section[field]))
        ]),
        nextAction: asString(section[spec.nextActionField]) || null
      });
    }
  }

  return resolved;
}

function buildTask(item: ModificationQueueItem, resolvedArtifact: ResolvedSectionArtifact | null): ProjectModificationTask {
  const preferredWorkflowPanel = toPreferredWorkflowPanel(item.recommendedWorkbench);
  const preferredWorkbenchMode = toPreferredWorkbenchMode(preferredWorkflowPanel);
  const canOpenCompose = item.recommendedWorkbench !== "runtime";
  const canOpenRuntime = item.recommendedWorkbench !== "compose";
  const sourceArtifactPath = resolvedArtifact?.artifactPath ?? item.sourceArtifactPath ?? null;
  const supportingArtifactPaths = uniqueStrings([
    sourceArtifactPath,
    ...item.supportingArtifactPaths,
    ...(resolvedArtifact?.supportingArtifactPaths ?? [])
  ]);
  const taskStatus: ModificationTaskStatus = sourceArtifactPath
    ? "ready-for-compose-runtime"
    : "blocked-missing-artifact";
  const artifactKind = resolvedArtifact?.artifactKind ?? "queue-source";
  const nextAction = resolvedArtifact?.nextAction
    ?? item.nextAction
    ?? (sourceArtifactPath
      ? `Open ${preferredWorkflowPanel === "compose" ? "Compose" : "Runtime"} and continue from the prepared modification artifact.`
      : "The queued item does not resolve to a grounded modification artifact yet.");

  return {
    taskId: buildTaskId(item.queueId),
    queueId: item.queueId,
    scenarioId: item.scenarioId,
    displayName: item.displayName,
    promotionKind: item.promotionKind,
    familyName: item.familyName,
    sectionKey: item.sectionKey,
    taskStatus,
    recommendedWorkbench: item.recommendedWorkbench,
    preferredWorkflowPanel,
    preferredWorkbenchMode,
    sourceArtifactKind: artifactKind,
    sourceArtifactState: resolvedArtifact?.artifactState ?? item.readinessState ?? null,
    sourceArtifactPath,
    supportingArtifactPaths,
    rationale: item.rationale,
    nextAction,
    canOpenCompose,
    canOpenRuntime
  };
}

export async function prepareProjectModificationHandoff(projectId: string): Promise<ProjectModificationHandoffFile> {
  const projectRoot = path.join(workspaceRoot, "40_projects", projectId);
  const projectMetaPath = path.join(projectRoot, "project.meta.json");
  const projectMeta = await readJsonFile<JsonRecord>(projectMetaPath);
  const projectDisplayName = asString(projectMeta.displayName) || projectId;
  const donor = (projectMeta.donor && typeof projectMeta.donor === "object" && !Array.isArray(projectMeta.donor))
    ? projectMeta.donor as JsonRecord
    : {};
  const donorId = asString(donor.donorId);
  if (!donorId) {
    throw new Error(`Project ${projectId} does not declare a donorId in project.meta.json.`);
  }
  const donorName = asString(donor.donorName) || donorId;
  const donorPaths = buildDonorScanPaths(donorId);
  const queue = await readOptionalJsonFile<ModificationQueueFile>(donorPaths.modificationQueuePath);
  if (!queue || !Array.isArray(queue.items) || queue.items.length === 0) {
    throw new Error(`No queued modification items are available for ${projectId}.`);
  }

  const paths = (projectMeta.paths && typeof projectMeta.paths === "object" && !Array.isArray(projectMeta.paths))
    ? projectMeta.paths as JsonRecord
    : {};
  const reportsRootRelativePath = asString(paths.reportsRoot) || `40_projects/${projectId}/reports`;
  const reportPath = path.join(workspaceRoot, reportsRootRelativePath, "modification-handoff.json");
  const lifecycle = (projectMeta.lifecycle && typeof projectMeta.lifecycle === "object" && !Array.isArray(projectMeta.lifecycle))
    ? projectMeta.lifecycle as JsonRecord
    : {};
  const currentStage = asString(lifecycle.currentStage) || "investigation";

  const strongestSectionArtifacts = await loadStrongestSectionArtifacts(donorId);
  const tasks = queue.items.map((item) => buildTask(
    item,
    item.sectionKey ? strongestSectionArtifacts.get(normalizeKey(item.sectionKey)) ?? null : null
  ));
  const readyTaskCount = tasks.filter((task) => task.taskStatus === "ready-for-compose-runtime").length;
  const blockedTaskCount = tasks.length - readyTaskCount;

  const handoff: ProjectModificationHandoffFile = {
    schemaVersion: "0.1.0",
    projectId,
    projectDisplayName,
    donorId,
    donorName,
    generatedAt: queue.generatedAt,
    currentStage,
    recommendedStage: readyTaskCount > 0 ? "modificationComposeRuntime" : "investigation",
    handoffState: readyTaskCount === 0
      ? "blocked"
      : blockedTaskCount > 0
        ? "mixed-ready"
        : "ready-for-modification",
    sourceQueuePath: toRepoRelativePath(donorPaths.modificationQueuePath),
    queueItemCount: queue.itemCount,
    readyTaskCount,
    blockedTaskCount,
    nextOperatorAction: readyTaskCount > 0
      ? "Open Compose or Runtime from the modification board and continue from the strongest prepared artifact per task."
      : "Keep this project in Investigation until queued items resolve to grounded modification artifacts.",
    tasks
  };

  await writeJsonFile(reportPath, handoff);
  return handoff;
}

export async function readProjectModificationHandoff(projectId: string): Promise<ProjectModificationHandoffFile | null> {
  const projectMetaPath = path.join(workspaceRoot, "40_projects", projectId, "project.meta.json");
  const projectMeta = await readOptionalJsonFile<JsonRecord>(projectMetaPath);
  if (!projectMeta) {
    return null;
  }

  const paths = (projectMeta.paths && typeof projectMeta.paths === "object" && !Array.isArray(projectMeta.paths))
    ? projectMeta.paths as JsonRecord
    : {};
  const reportsRootRelativePath = asString(paths.reportsRoot) || `40_projects/${projectId}/reports`;
  return readOptionalJsonFile<ProjectModificationHandoffFile>(
    path.join(workspaceRoot, reportsRootRelativePath, "modification-handoff.json")
  );
}
