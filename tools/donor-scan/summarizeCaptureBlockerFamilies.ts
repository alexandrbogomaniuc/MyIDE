import path from "node:path";
import type {
  CaptureBlockerFamiliesFile,
  CaptureBlockerFamilyRecord,
  NextCaptureTargetsFile
} from "./shared";

interface SummarizeCaptureBlockerFamiliesOptions {
  donorId: string;
  donorName: string;
  nextCaptureTargets: NextCaptureTargetsFile;
}

interface MutableFamilyRecord {
  familyName: string;
  blockerClass: CaptureBlockerFamilyRecord["blockerClass"];
  targetCount: number;
  minRank: number;
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

function finalizeFamilyRecord(record: MutableFamilyRecord): CaptureBlockerFamilyRecord {
  return {
    familyName: record.familyName,
    blockerClass: record.blockerClass,
    targetCount: record.targetCount,
    minRank: record.minRank,
    targetKinds: [...record.targetKinds].sort((left, right) => left.localeCompare(right)),
    captureStrategies: [...record.captureStrategies].sort((left, right) => left.localeCompare(right)) as CaptureBlockerFamilyRecord["captureStrategies"],
    locationPrefixes: [...record.locationPrefixes].sort((left, right) => left.localeCompare(right)),
    recentCaptureAttemptCountMax: record.recentCaptureAttemptCountMax,
    recentCaptureFailureReasons: [...record.recentCaptureFailureReasons].sort((left, right) => left.localeCompare(right)),
    sampleUrls: [...record.sampleUrls]
  };
}

export function summarizeCaptureBlockerFamilies(
  options: SummarizeCaptureBlockerFamiliesOptions
): CaptureBlockerFamiliesFile {
  const familyMap = new Map<string, MutableFamilyRecord>();

  for (const target of options.nextCaptureTargets.targets) {
    if (!target.blockerClass) {
      continue;
    }

    const familyName = deriveFamilyName(target.url);
    const familyKey = `${target.blockerClass}:${familyName}`;
    const existing = familyMap.get(familyKey) ?? {
      familyName,
      blockerClass: target.blockerClass,
      targetCount: 0,
      minRank: target.rank,
      targetKinds: new Set<string>(),
      captureStrategies: new Set<string>(),
      locationPrefixes: new Set<string>(),
      recentCaptureAttemptCountMax: 0,
      recentCaptureFailureReasons: new Set<string>(),
      sampleUrls: []
    };

    existing.targetCount += 1;
    existing.minRank = Math.min(existing.minRank, target.rank);
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

    familyMap.set(familyKey, existing);
  }

  const families = [...familyMap.values()]
    .map(finalizeFamilyRecord)
    .sort((left, right) => {
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
