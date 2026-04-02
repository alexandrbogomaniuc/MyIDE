export interface ReadyPromotionCandidate {
  candidateId: string;
  scenarioId: string;
  displayName: string;
  promotionKind: "family" | "section";
  familyName: string;
  sectionKey: string | null;
  lane: "ready-for-reconstruction";
  readinessState: string;
  recommendedWorkbench: "compose" | "runtime" | "compose-runtime";
  sourceArtifactPath: string | null;
  supportingArtifactPaths: string[];
  rationale: string;
  nextAction: string;
}

export interface ReadyPromotionFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  readyCandidateCount: number;
  readyFamilyCount: number;
  readySectionCount: number;
  candidates: ReadyPromotionCandidate[];
}

export interface ModificationQueueItem extends ReadyPromotionCandidate {
  queueId: string;
  status: "queued-for-modification";
  promotedAt: string;
  queuedFromStage: "investigation";
}

export interface ModificationQueueFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  itemCount: number;
  queuedFamilyCount: number;
  queuedSectionCount: number;
  items: ModificationQueueItem[];
}

export interface PromotionScenarioRow {
  scenarioId: string;
  displayName: string;
  lane: string;
  state: string;
  matchedFamilyNames: string[];
  nextOperatorAction: string;
}

export interface PromotionFamilyProfileRow {
  familyName: string;
  profileState?: string;
  readiness?: string;
  bundlePath?: string;
  worksetPath?: string;
  nextStep?: string;
}

export interface PromotionSectionProfileRow {
  familyName: string;
  sectionKey: string;
  sectionState?: string;
  sectionBundlePath?: string;
  nextSectionStep?: string;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function buildCandidateId(prefix: "family" | "section", scenarioId: string, familyName: string, sectionKey?: string | null): string {
  return [
    prefix,
    normalizeKey(scenarioId),
    normalizeKey(familyName),
    sectionKey ? normalizeKey(sectionKey) : null
  ].filter(Boolean).join(":");
}

function buildQueueId(candidate: ReadyPromotionCandidate): string {
  return `modification:${candidate.candidateId}`;
}

export function buildReadyPromotionCandidates(options: {
  donorId: string;
  donorName: string;
  generatedAt: string;
  scenarioCoverageRows: readonly PromotionScenarioRow[];
  familyProfiles: readonly PromotionFamilyProfileRow[];
  sectionProfiles: readonly PromotionSectionProfileRow[];
}): ReadyPromotionFile {
  const familyProfileMap = new Map<string, PromotionFamilyProfileRow>();
  for (const profile of options.familyProfiles) {
    familyProfileMap.set(normalizeKey(profile.familyName), profile);
  }

  const sectionProfileMap = new Map<string, PromotionSectionProfileRow[]>();
  for (const section of options.sectionProfiles) {
    const key = normalizeKey(section.familyName);
    const existing = sectionProfileMap.get(key) ?? [];
    existing.push(section);
    sectionProfileMap.set(key, existing);
  }

  const candidates: ReadyPromotionCandidate[] = [];

  for (const scenario of options.scenarioCoverageRows) {
    if (scenario.lane !== "ready-for-reconstruction") {
      continue;
    }

    for (const familyName of scenario.matchedFamilyNames) {
      const normalizedFamily = normalizeKey(familyName);
      const sectionMatches = sectionProfileMap.get(normalizedFamily) ?? [];
      if (sectionMatches.length > 0) {
        for (const section of sectionMatches) {
          candidates.push({
            candidateId: buildCandidateId("section", scenario.scenarioId, familyName, section.sectionKey),
            scenarioId: scenario.scenarioId,
            displayName: scenario.displayName,
            promotionKind: "section",
            familyName,
            sectionKey: section.sectionKey,
            lane: "ready-for-reconstruction",
            readinessState: section.sectionState ?? "ready-for-modification",
            recommendedWorkbench: "compose-runtime",
            sourceArtifactPath: section.sectionBundlePath ?? null,
            supportingArtifactPaths: [section.sectionBundlePath].filter((value): value is string => typeof value === "string" && value.length > 0),
            rationale: `${scenario.displayName} is ready and section ${section.sectionKey} already has a grounded reconstruction bundle.`,
            nextAction: section.nextSectionStep ?? "Open Modification / Compose / Runtime and continue from this section bundle."
          });
        }
        continue;
      }

      const familyProfile = familyProfileMap.get(normalizedFamily);
      if (!familyProfile) {
        continue;
      }

      candidates.push({
        candidateId: buildCandidateId("family", scenario.scenarioId, familyName),
        scenarioId: scenario.scenarioId,
        displayName: scenario.displayName,
        promotionKind: "family",
        familyName,
        sectionKey: null,
        lane: "ready-for-reconstruction",
        readinessState: familyProfile.profileState ?? familyProfile.readiness ?? "ready-for-modification",
        recommendedWorkbench: "compose-runtime",
        sourceArtifactPath: familyProfile.bundlePath ?? familyProfile.worksetPath ?? null,
        supportingArtifactPaths: [familyProfile.bundlePath, familyProfile.worksetPath].filter((value): value is string => typeof value === "string" && value.length > 0),
        rationale: `${scenario.displayName} is ready and family ${familyName} already has grounded local-source reconstruction inputs.`,
        nextAction: familyProfile.nextStep ?? scenario.nextOperatorAction
      });
    }
  }

  const uniqueCandidates = Array.from(new Map(candidates.map((candidate) => [candidate.candidateId, candidate])).values())
    .sort((left, right) => {
      const scenarioDelta = left.displayName.localeCompare(right.displayName);
      if (scenarioDelta !== 0) {
        return scenarioDelta;
      }
      const kindDelta = left.promotionKind.localeCompare(right.promotionKind);
      if (kindDelta !== 0) {
        return kindDelta;
      }
      return left.familyName.localeCompare(right.familyName);
    });

  return {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: options.generatedAt,
    readyCandidateCount: uniqueCandidates.length,
    readyFamilyCount: uniqueCandidates.filter((candidate) => candidate.promotionKind === "family").length,
    readySectionCount: uniqueCandidates.filter((candidate) => candidate.promotionKind === "section").length,
    candidates: uniqueCandidates
  };
}

export function applyPromotionCandidates(
  readyFile: ReadyPromotionFile,
  existingQueue: ModificationQueueFile | null,
  options?: {
    requestedScenarioIds?: readonly string[];
  }
): ModificationQueueFile {
  const requestedScenarioIds = new Set((options?.requestedScenarioIds ?? []).map((value) => value.trim()).filter((value) => value.length > 0));
  const selectedCandidates = readyFile.candidates.filter((candidate) => {
    if (requestedScenarioIds.size === 0) {
      return true;
    }
    return requestedScenarioIds.has(candidate.scenarioId);
  });

  const merged = new Map<string, ModificationQueueItem>();
  for (const item of existingQueue?.items ?? []) {
    merged.set(item.queueId, item);
  }

  const promotedAt = readyFile.generatedAt;
  for (const candidate of selectedCandidates) {
    const queueId = buildQueueId(candidate);
    const existing = merged.get(queueId);
    merged.set(queueId, existing ?? {
      ...candidate,
      queueId,
      status: "queued-for-modification",
      promotedAt,
      queuedFromStage: "investigation"
    });
  }

  const items = Array.from(merged.values()).sort((left, right) => left.displayName.localeCompare(right.displayName));
  return {
    schemaVersion: "0.1.0",
    donorId: readyFile.donorId,
    donorName: readyFile.donorName,
    generatedAt: promotedAt,
    itemCount: items.length,
    queuedFamilyCount: items.filter((item) => item.promotionKind === "family").length,
    queuedSectionCount: items.filter((item) => item.promotionKind === "section").length,
    items
  };
}
