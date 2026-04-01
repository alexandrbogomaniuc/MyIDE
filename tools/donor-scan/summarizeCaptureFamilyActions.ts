import type {
  CaptureFamilyActionClass,
  CaptureFamilyActionRecord,
  CaptureFamilyActionsFile,
  CaptureFamilySourceProfileRecord,
  CaptureFamilySourceProfilesFile
} from "./shared";

interface SummarizeCaptureFamilyActionsOptions {
  donorId: string;
  donorName: string;
  captureFamilySourceProfiles: CaptureFamilySourceProfilesFile;
}

function isMeaningfulFamilyName(value: string): boolean {
  return value.trim().length >= 2;
}

function readLocalSourceAssetCount(profile: CaptureFamilySourceProfileRecord): number {
  return profile.localSameFamilyBundleReferenceCount
    + profile.localSameFamilyVariantAssetCount
    + profile.localRelatedBundleAssetCount
    + profile.localRelatedVariantAssetCount;
}

function classifyAction(profile: CaptureFamilySourceProfileRecord): {
  actionClass: CaptureFamilyActionClass;
  priority: CaptureFamilyActionRecord["priority"];
  reason: string;
} {
  const localSourceAssetCount = readLocalSourceAssetCount(profile);
  if (localSourceAssetCount > 0) {
    return {
      actionClass: "use-local-sources",
      priority: "high",
      reason: "Family already has grounded local source assets captured."
    };
  }
  if (profile.localPageCount > 0 && profile.localPageCount < profile.atlasPageRefCount) {
    return {
      actionClass: "capture-missing-pages",
      priority: "high",
      reason: "Family already has some local atlas pages, so capturing the remaining page images is the shortest path."
    };
  }
  if (profile.sourceState === "variant-backed") {
    return {
      actionClass: "capture-family-sources",
      priority: "high",
      reason: "Family has grounded variant-backed evidence that can feed another family-source capture run."
    };
  }
  if (profile.sourceState === "bundle-evidence-only") {
    return {
      actionClass: "review-bundle-evidence",
      priority: profile.blockedTargetCount > 0 ? "medium" : "high",
      reason: "Family has grounded bundle evidence but no local source payload yet."
    };
  }
  return {
    actionClass: "source-discovery-required",
    priority: "medium",
    reason: "Current donor scan still only proves raw/root-level evidence for this family."
  };
}

function pickSampleEvidence(profile: CaptureFamilySourceProfileRecord): string | null {
  return profile.localSourceAssetPreview[0]
    ?? profile.localPagePaths[0]
    ?? profile.sameFamilyVariantAssetPreview[0]
    ?? profile.sameFamilyBundleReferencePreview[0]
    ?? profile.missingPageUrls[0]
    ?? profile.topUntriedTargetUrls[0]
    ?? profile.topBlockedTargetUrls[0]
    ?? null;
}

function actionSortValue(actionClass: CaptureFamilyActionClass): number {
  switch (actionClass) {
    case "use-local-sources":
      return 0;
    case "capture-missing-pages":
      return 1;
    case "capture-family-sources":
      return 2;
    case "review-bundle-evidence":
      return 3;
    default:
      return 4;
  }
}

export function summarizeCaptureFamilyActions(
  options: SummarizeCaptureFamilyActionsOptions
): CaptureFamilyActionsFile {
  const families = options.captureFamilySourceProfiles.families
    .filter((profile) =>
      isMeaningfulFamilyName(profile.familyName)
      && (
        profile.targetCount >= 3
        || profile.blockedTargetCount > 0
        || profile.atlasPageRefCount > 0
        || profile.localPageCount > 0
      )
    )
    .map((profile) => {
      const localSourceAssetCount = readLocalSourceAssetCount(profile);
      const { actionClass, priority, reason } = classifyAction(profile);
      return {
        familyName: profile.familyName,
        actionClass,
        priority,
        targetCount: profile.targetCount,
        blockedTargetCount: profile.blockedTargetCount,
        localSourceAssetCount,
        localPageCount: profile.localPageCount,
        atlasPageRefCount: profile.atlasPageRefCount,
        sameFamilyVariantAssetCount: profile.sameFamilyVariantAssetCount,
        sameFamilyBundleReferenceCount: profile.sameFamilyBundleReferenceCount,
        reason,
        nextStep: profile.nextStep,
        sampleEvidence: pickSampleEvidence(profile)
      } satisfies CaptureFamilyActionRecord;
    })
    .sort((left, right) => {
      const actionOrder = actionSortValue(left.actionClass) - actionSortValue(right.actionClass);
      if (actionOrder !== 0) {
        return actionOrder;
      }
      const priorityOrder = (value: CaptureFamilyActionRecord["priority"]) => value === "high" ? 0 : value === "medium" ? 1 : 2;
      const priorityDelta = priorityOrder(left.priority) - priorityOrder(right.priority);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
      if (left.localSourceAssetCount !== right.localSourceAssetCount) {
        return right.localSourceAssetCount - left.localSourceAssetCount;
      }
      if (left.blockedTargetCount !== right.blockedTargetCount) {
        return right.blockedTargetCount - left.blockedTargetCount;
      }
      if (left.targetCount !== right.targetCount) {
        return right.targetCount - left.targetCount;
      }
      return left.familyName.localeCompare(right.familyName);
    });

  return {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    actionCount: families.length,
    families
  };
}
