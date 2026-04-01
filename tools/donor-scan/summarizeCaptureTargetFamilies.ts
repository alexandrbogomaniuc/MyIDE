import path from "node:path";
import type {
  CaptureTargetFamiliesFile,
  CaptureTargetFamilyRecord,
  NextCaptureTargetsFile
} from "./shared";

interface SummarizeCaptureTargetFamiliesOptions {
  donorId: string;
  donorName: string;
  nextCaptureTargets: NextCaptureTargetsFile;
}

interface MutableFamilyRecord {
  familyName: string;
  targetCount: number;
  untriedTargetCount: number;
  blockedTargetCount: number;
  minRank: number;
  minUntriedRank: number | null;
  targetKinds: Set<string>;
  captureStrategies: Set<string>;
  locationPrefixes: Set<string>;
  recentCaptureAttemptCountMax: number;
  recentCaptureFailureReasons: Set<string>;
  sampleUrls: string[];
}

function deriveFamilyName(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    const basename = path.basename(parsed.pathname, path.extname(parsed.pathname));
    const underscoreStripped = basename.replace(/(?:_\d+)+$/, "");
    const digitStripped = underscoreStripped.replace(/(?<=[A-Za-z_-])\d{3,}$/, "");
    const normalized = digitStripped.replace(/[_-]+$/, "");
    return normalized.length > 0 ? normalized : basename;
  } catch {
    return "(invalid-url)";
  }
}

function deriveLocationPrefix(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) {
      return "(root)";
    }
    const parent = segments[segments.length - 2] ?? "(root)";
    if (/^v\d[\w.-]*$/i.test(parent)) {
      return "(root)";
    }
    if (parent === "img" && segments.length >= 3) {
      return segments[segments.length - 3] === "img"
        ? parent
        : `${segments[segments.length - 3]}/${parent}`;
    }
    return parent;
  } catch {
    return "(invalid-url)";
  }
}

function finalizeFamilyRecord(record: MutableFamilyRecord): CaptureTargetFamilyRecord {
  return {
    familyName: record.familyName,
    targetCount: record.targetCount,
    untriedTargetCount: record.untriedTargetCount,
    blockedTargetCount: record.blockedTargetCount,
    minRank: record.minRank,
    minUntriedRank: record.minUntriedRank,
    targetKinds: [...record.targetKinds].sort((left, right) => left.localeCompare(right)),
    captureStrategies: [...record.captureStrategies].sort((left, right) => left.localeCompare(right)) as CaptureTargetFamilyRecord["captureStrategies"],
    locationPrefixes: [...record.locationPrefixes].sort((left, right) => left.localeCompare(right)),
    recentCaptureAttemptCountMax: record.recentCaptureAttemptCountMax,
    recentCaptureFailureReasons: [...record.recentCaptureFailureReasons].sort((left, right) => left.localeCompare(right)),
    sampleUrls: [...record.sampleUrls]
  };
}

export function summarizeCaptureTargetFamilies(
  options: SummarizeCaptureTargetFamiliesOptions
): CaptureTargetFamiliesFile {
  const familyMap = new Map<string, MutableFamilyRecord>();

  for (const target of options.nextCaptureTargets.targets) {
    const familyName = deriveFamilyName(target.url);
    const existing = familyMap.get(familyName) ?? {
      familyName,
      targetCount: 0,
      untriedTargetCount: 0,
      blockedTargetCount: 0,
      minRank: target.rank,
      minUntriedRank: null,
      targetKinds: new Set<string>(),
      captureStrategies: new Set<string>(),
      locationPrefixes: new Set<string>(),
      recentCaptureAttemptCountMax: 0,
      recentCaptureFailureReasons: new Set<string>(),
      sampleUrls: []
    };

    existing.targetCount += 1;
    existing.minRank = Math.min(existing.minRank, target.rank);
    if (target.recentCaptureStatus === "blocked") {
      existing.blockedTargetCount += 1;
    } else {
      existing.untriedTargetCount += 1;
      existing.minUntriedRank = existing.minUntriedRank === null
        ? target.rank
        : Math.min(existing.minUntriedRank, target.rank);
    }
    existing.targetKinds.add(target.kind);
    existing.captureStrategies.add(target.captureStrategy);
    existing.locationPrefixes.add(deriveLocationPrefix(target.url));
    existing.recentCaptureAttemptCountMax = Math.max(existing.recentCaptureAttemptCountMax, target.recentCaptureAttemptCount);
    if (typeof target.recentCaptureFailureReason === "string" && target.recentCaptureFailureReason.length > 0) {
      existing.recentCaptureFailureReasons.add(target.recentCaptureFailureReason);
    }
    if (existing.sampleUrls.length < 3 && !existing.sampleUrls.includes(target.url)) {
      existing.sampleUrls.push(target.url);
    }

    familyMap.set(familyName, existing);
  }

  const families = [...familyMap.values()]
    .map(finalizeFamilyRecord)
    .sort((left, right) => {
      const leftUntriedRank = left.minUntriedRank ?? Number.POSITIVE_INFINITY;
      const rightUntriedRank = right.minUntriedRank ?? Number.POSITIVE_INFINITY;
      if (leftUntriedRank !== rightUntriedRank) {
        return leftUntriedRank - rightUntriedRank;
      }
      if (left.minRank !== right.minRank) {
        return left.minRank - right.minRank;
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
    familyCount: families.length,
    families
  };
}
