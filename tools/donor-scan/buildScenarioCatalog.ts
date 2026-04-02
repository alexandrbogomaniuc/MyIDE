import {
  canonicalScenarioFamilies,
  matchScenarioIds,
  type ScenarioFamilyDefinition
} from "../../30_app/investigation/scenarioCoverage";

type JsonPrimitive = null | boolean | number | string;
interface JsonObject {
  [key: string]: JsonValue | undefined;
}
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface ScenarioCatalogEntry {
  scenarioId: string;
  displayName: string;
  category: ScenarioFamilyDefinition["category"];
  order: number;
  staticDiscoveryState: "not-discovered" | "discovered-in-static-scan";
  matchedFamilyNames: string[];
  blockerClasses: string[];
  recommendedProfiles: string[];
  notes: string[];
  captureFamilyCount: number;
  blockerFamilyCount: number;
  sourceMaterialSignalCount: number;
  reconstructionReadySignalCount: number;
}

export interface ScenarioCatalogFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  catalogCount: number;
  scenarios: ScenarioCatalogEntry[];
}

interface ScenarioSignalAccumulator {
  matchedFamilyNames: Set<string>;
  blockerClasses: Set<string>;
  notes: Set<string>;
  captureFamilyCount: number;
  blockerFamilyCount: number;
  sourceMaterialSignalCount: number;
  reconstructionReadySignalCount: number;
}

interface BuildScenarioCatalogOptions {
  donorId: string;
  donorName: string;
  generatedAt?: string;
  captureTargetFamiliesFile: JsonObject | null;
  captureBlockerFamiliesFile: JsonObject | null;
  captureFamilySourceProfilesFile: JsonObject | null;
  captureFamilyActionsFile: JsonObject | null;
  familyReconstructionProfilesFile: JsonObject | null;
  familyReconstructionSectionsFile: JsonObject | null;
  scanSummary: JsonObject | null;
}

function asObjectArray(value: JsonValue | undefined): JsonObject[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is JsonObject => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    : [];
}

function asString(value: JsonValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: JsonValue | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getAccumulator(map: Map<string, ScenarioSignalAccumulator>, scenarioId: string): ScenarioSignalAccumulator {
  const existing = map.get(scenarioId);
  if (existing) {
    return existing;
  }
  const next: ScenarioSignalAccumulator = {
    matchedFamilyNames: new Set<string>(),
    blockerClasses: new Set<string>(),
    notes: new Set<string>(),
    captureFamilyCount: 0,
    blockerFamilyCount: 0,
    sourceMaterialSignalCount: 0,
    reconstructionReadySignalCount: 0
  };
  map.set(scenarioId, next);
  return next;
}

function accumulateFamily(
  map: Map<string, ScenarioSignalAccumulator>,
  familyName: string,
  updater: (accumulator: ScenarioSignalAccumulator) => void
): void {
  for (const scenarioId of matchScenarioIds(familyName)) {
    const accumulator = getAccumulator(map, scenarioId);
    accumulator.matchedFamilyNames.add(familyName);
    updater(accumulator);
  }
}

export function buildScenarioCatalog(options: BuildScenarioCatalogOptions): ScenarioCatalogFile {
  const scenarioSignals = new Map<string, ScenarioSignalAccumulator>();

  for (const family of asObjectArray(options.captureTargetFamiliesFile?.families)) {
    const familyName = asString(family.familyName);
    if (!familyName) {
      continue;
    }
    accumulateFamily(scenarioSignals, familyName, (accumulator) => {
      accumulator.captureFamilyCount += 1;
      const untriedCount = asNumber(family.untriedTargetCount);
      const blockedCount = asNumber(family.blockedTargetCount);
      accumulator.notes.add(
        untriedCount > 0
          ? `${familyName}: ${untriedCount} open target(s)`
          : `${familyName}: ${blockedCount} blocked target(s)`
      );
    });
  }

  for (const family of asObjectArray(options.captureBlockerFamiliesFile?.families)) {
    const familyName = asString(family.familyName);
    if (!familyName) {
      continue;
    }
    accumulateFamily(scenarioSignals, familyName, (accumulator) => {
      accumulator.blockerFamilyCount += 1;
      const blockerClass = asString(family.blockerClass) || "blocked";
      accumulator.blockerClasses.add(blockerClass);
      accumulator.notes.add(`${familyName}: blocker ${blockerClass}`);
    });
  }

  for (const family of asObjectArray(options.captureFamilySourceProfilesFile?.families)) {
    const familyName = asString(family.familyName);
    if (!familyName) {
      continue;
    }
    accumulateFamily(scenarioSignals, familyName, (accumulator) => {
      const localSignalCount =
        asNumber(family.localPageCount)
        + asNumber(family.localSameFamilyBundleReferenceCount)
        + asNumber(family.localSameFamilyVariantAssetCount)
        + asNumber(family.localRelatedBundleAssetCount)
        + asNumber(family.localRelatedVariantAssetCount);
      if (localSignalCount > 0) {
        accumulator.sourceMaterialSignalCount += 1;
        accumulator.notes.add(`${familyName}: local source evidence present`);
      }
    });
  }

  for (const family of asObjectArray(options.captureFamilyActionsFile?.families)) {
    const familyName = asString(family.familyName);
    if (!familyName) {
      continue;
    }
    accumulateFamily(scenarioSignals, familyName, (accumulator) => {
      if (asNumber(family.localSourceAssetCount) > 0) {
        accumulator.sourceMaterialSignalCount += 1;
      }
      const actionClass = asString(family.actionClass);
      if (actionClass === "source-discovery-required") {
        accumulator.blockerClasses.add("source-discovery-required");
      }
      if (actionClass === "use-local-sources") {
        accumulator.reconstructionReadySignalCount += 1;
      }
      const nextStep = asString(family.nextStep);
      if (nextStep) {
        accumulator.notes.add(nextStep);
      }
    });
  }

  for (const family of asObjectArray(options.familyReconstructionProfilesFile?.families)) {
    const familyName = asString(family.familyName);
    if (!familyName) {
      continue;
    }
    accumulateFamily(scenarioSignals, familyName, (accumulator) => {
      const readiness = asString(family.readiness);
      if (readiness.includes("ready")) {
        accumulator.reconstructionReadySignalCount += 1;
      }
      if (asNumber(family.exactLocalSourceCount) > 0 || asNumber(family.relatedLocalSourceCount) > 0) {
        accumulator.sourceMaterialSignalCount += 1;
      }
    });
  }

  for (const section of asObjectArray(options.familyReconstructionSectionsFile?.sections)) {
    const familyName = asString(section.familyName);
    if (!familyName) {
      continue;
    }
    accumulateFamily(scenarioSignals, familyName, (accumulator) => {
      if (asNumber(section.mappedAttachmentCount) > 0) {
        accumulator.reconstructionReadySignalCount += 1;
      }
      if (asNumber(section.attachmentCount) > 0) {
        accumulator.sourceMaterialSignalCount += 1;
      }
    });
  }

  const rawBlockedFamilies = Array.isArray(options.scanSummary?.rawPayloadBlockedFamilyNames)
    ? options.scanSummary?.rawPayloadBlockedFamilyNames.filter((value: JsonValue): value is string => typeof value === "string" && value.length > 0)
    : [];
  for (const familyName of rawBlockedFamilies) {
    accumulateFamily(scenarioSignals, familyName, (accumulator) => {
      accumulator.blockerClasses.add("raw-payload-blocked");
      accumulator.notes.add(`${familyName}: raw payload blocked`);
    });
  }

  const scenarios: ScenarioCatalogEntry[] = canonicalScenarioFamilies
    .map((definition) => {
      const accumulator = scenarioSignals.get(definition.scenarioId);
      const matchedFamilyNames = accumulator ? Array.from(accumulator.matchedFamilyNames).sort() : [];
      return {
        scenarioId: definition.scenarioId,
        displayName: definition.displayName,
        category: definition.category,
        order: definition.order,
        staticDiscoveryState: matchedFamilyNames.length > 0
          ? "discovered-in-static-scan"
          : "not-discovered" as ScenarioCatalogEntry["staticDiscoveryState"],
        matchedFamilyNames,
        blockerClasses: accumulator ? Array.from(accumulator.blockerClasses).sort() : [],
        recommendedProfiles: [...definition.recommendedProfiles],
        notes: accumulator ? Array.from(accumulator.notes).slice(0, 6) : [],
        captureFamilyCount: accumulator?.captureFamilyCount ?? 0,
        blockerFamilyCount: accumulator?.blockerFamilyCount ?? 0,
        sourceMaterialSignalCount: accumulator?.sourceMaterialSignalCount ?? 0,
        reconstructionReadySignalCount: accumulator?.reconstructionReadySignalCount ?? 0
      };
    })
    .sort((left, right) => left.order - right.order);

  return {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    catalogCount: scenarios.length,
    scenarios
  };
}
