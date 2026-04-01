import type {
  AlternateCaptureHintRecord,
  AtlasManifestFile,
  BundleAssetMapFile,
  CaptureTargetPriority,
  NextCaptureTargetRecord,
  NextCaptureTargetsFile,
  ReferenceConfidence,
  RequestBackedStaticHintFile,
  RuntimeCandidatesFile
} from "./shared";
import { buildAlternateCaptureHints } from "./shared";

interface BuildNextCaptureTargetsOptions {
  donorId: string;
  donorName: string;
  runtimeCandidates: RuntimeCandidatesFile;
  bundleAssetMap: BundleAssetMapFile;
  atlasManifestFile: AtlasManifestFile;
  requestBackedStaticHints: RequestBackedStaticHintFile | null;
}

interface MutableTarget {
  url: string;
  host: string;
  relativePath: string;
  kind: NextCaptureTargetRecord["kind"];
  category: string;
  confidence: ReferenceConfidence;
  score: number;
  sourceLabels: Set<string>;
  blockers: Set<string>;
  reasons: Set<string>;
}

interface DirectoryAliasSupportRecord {
  targetDirectory: string;
  alternateDirectory: string;
  category: string;
  familySignature: string;
  supportCount: number;
  sourceLabels: Set<string>;
}

function readHost(urlString: string): string {
  try {
    return new URL(urlString).host || "(no-host)";
  } catch {
    return "(invalid-url)";
  }
}

function readRelativePath(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    return parsed.pathname.replace(/^\/+/, "") || "(root)";
  } catch {
    return urlString;
  }
}

function confidenceWeight(confidence: ReferenceConfidence): number {
  switch (confidence) {
    case "confirmed":
      return 20;
    case "likely":
      return 10;
    default:
      return 0;
  }
}

function readUrlDirectory(urlString: string): string | null {
  try {
    const parsed = new URL(urlString);
    const segments = parsed.pathname.split("/");
    segments.pop();
    const directory = segments.join("/") || "/";
    return directory;
  } catch {
    return null;
  }
}

function replaceUrlDirectory(urlString: string, nextDirectory: string): string | null {
  try {
    const parsed = new URL(urlString);
    const basename = parsed.pathname.split("/").pop() ?? "";
    if (!basename) {
      return null;
    }
    const normalizedDirectory = nextDirectory.startsWith("/") ? nextDirectory : `/${nextDirectory}`;
    parsed.pathname = `${normalizedDirectory.replace(/\/+$/g, "")}/${basename}`.replace(/\/{2,}/g, "/");
    return parsed.toString();
  } catch {
    return null;
  }
}

function readBasenameFamilySignature(urlString: string): string | null {
  try {
    const parsed = new URL(urlString);
    const basename = parsed.pathname.split("/").pop() ?? "";
    const dotIndex = basename.lastIndexOf(".");
    const stem = (dotIndex >= 0 ? basename.slice(0, dotIndex) : basename).toLowerCase();
    return stem.replace(/[0-9]+/g, "#");
  } catch {
    return null;
  }
}

function categoryWeight(category: string): number {
  if (["json", "atlas", "plist", "runtime-metadata", "translation"].includes(category)) {
    return 15;
  }
  if (category === "image") {
    return 12;
  }
  if (category === "script") {
    return 10;
  }
  if (["font", "audio", "video"].includes(category)) {
    return 6;
  }
  return 0;
}

function kindPriorityWeight(kind: NextCaptureTargetRecord["kind"]): number {
  switch (kind) {
    case "atlas-page":
      return 100;
    case "runtime-metadata":
      return 80;
    case "translation-payload":
      return 75;
    case "runtime-script":
      return 70;
    default:
      return 50;
  }
}

function inferPriority(score: number, kind: NextCaptureTargetRecord["kind"]): CaptureTargetPriority {
  if (kind === "atlas-page" || score >= 100) {
    return "immediate";
  }
  if (score >= 70) {
    return "high";
  }
  return "medium";
}

function promoteConfidence(
  current: ReferenceConfidence,
  incoming: ReferenceConfidence
): ReferenceConfidence {
  const rank = (value: ReferenceConfidence) => {
    if (value === "confirmed") {
      return 3;
    }
    if (value === "likely") {
      return 2;
    }
    return 1;
  };
  return rank(incoming) > rank(current) ? incoming : current;
}

function toTargetRecord(
  url: string,
  mutable: MutableTarget,
  rank: number,
  bundleAssetMap: BundleAssetMapFile,
  directoryAliasSupport: Map<string, DirectoryAliasSupportRecord>,
  requestBackedStaticHints: RequestBackedStaticHintFile | null
): NextCaptureTargetRecord {
  const sourceCount = mutable.sourceLabels.size;
  const score = mutable.score + Math.min(20, sourceCount * 5);
  const priority = inferPriority(score, mutable.kind);
  const alternateCaptureHints = buildAlternateCaptureHints({
    url,
    kind: mutable.kind,
    category: mutable.category,
    bundleAssetMap,
    requestBackedStaticHints
  });
  const targetDirectory = readUrlDirectory(url);
  const familySignature = readBasenameFamilySignature(url);
  if (targetDirectory) {
    for (const support of directoryAliasSupport.values()) {
      if (
        support.targetDirectory !== targetDirectory
        || support.category !== mutable.category
        || mutable.category !== "image"
        || !familySignature
        || support.familySignature !== familySignature
      ) {
        continue;
      }
      const alternateUrl = replaceUrlDirectory(url, support.alternateDirectory);
      if (!alternateUrl || alternateUrl === url || alternateCaptureHints.some((hint) => hint.url === alternateUrl)) {
        continue;
      }
      alternateCaptureHints.push({
        url: alternateUrl,
        source: `family-alias:${support.targetDirectory}->${support.alternateDirectory}`,
        confidence: support.supportCount >= 3 ? "likely" : "provisional",
        note: `Grounded same-basename matches show ${support.supportCount} rooted-path substitutions from ${support.targetDirectory} to ${support.alternateDirectory}.`
      });
    }
  }
  return {
    rank,
    url,
    host: mutable.host,
    relativePath: mutable.relativePath,
    kind: mutable.kind,
    category: mutable.category,
    priority,
    confidence: mutable.confidence,
    score,
    sourceCount,
    sourceLabels: [...mutable.sourceLabels].sort((left, right) => left.localeCompare(right)),
    reason: [...mutable.reasons].join(" + "),
    blockers: [...mutable.blockers].sort((left, right) => left.localeCompare(right)),
    alternateCaptureHints
  };
}

function buildDirectoryAliasSupport(
  targetEntries: Array<[string, MutableTarget]>,
  bundleAssetMap: BundleAssetMapFile,
  requestBackedStaticHints: RequestBackedStaticHintFile | null
): Map<string, DirectoryAliasSupportRecord> {
  const support = new Map<string, DirectoryAliasSupportRecord>();

  for (const [url, target] of targetEntries) {
    const targetDirectory = readUrlDirectory(url);
    const familySignature = readBasenameFamilySignature(url);
    if (!targetDirectory || !familySignature || target.category !== "image") {
      continue;
    }
    const exactHints = buildAlternateCaptureHints({
      url,
      kind: target.kind,
      category: target.category,
      bundleAssetMap,
      requestBackedStaticHints
    });
    for (const hint of exactHints) {
      if (hint.source === "placeholder-rewrite") {
        continue;
      }
      const alternateDirectory = readUrlDirectory(hint.url);
      if (!alternateDirectory || alternateDirectory === targetDirectory) {
        continue;
      }
      const key = `${target.category}\t${targetDirectory}\t${alternateDirectory}\t${familySignature}`;
      const existing = support.get(key);
      if (existing) {
        existing.supportCount += 1;
        existing.sourceLabels.add(hint.source);
      } else {
        support.set(key, {
          targetDirectory,
          alternateDirectory,
          category: target.category,
          familySignature,
          supportCount: 1,
          sourceLabels: new Set<string>([hint.source])
        });
      }
    }
  }

  for (const hint of Array.isArray(requestBackedStaticHints?.hints) ? requestBackedStaticHints.hints : []) {
    if (hint.category !== "image") {
      continue;
    }
    const targetDirectory = readUrlDirectory(hint.canonicalSourceUrl);
    const alternateDirectory = readUrlDirectory(hint.alternateUrl);
    const familySignature = readBasenameFamilySignature(hint.canonicalSourceUrl);
    if (!targetDirectory || !alternateDirectory || !familySignature || alternateDirectory === targetDirectory) {
      continue;
    }
    const key = `${hint.category}\t${targetDirectory}\t${alternateDirectory}\t${familySignature}`;
    const existing = support.get(key);
    if (existing) {
      existing.supportCount += 1;
      existing.sourceLabels.add(`request-log:${hint.hintType}`);
    } else {
      support.set(key, {
        targetDirectory,
        alternateDirectory,
        category: hint.category,
        familySignature,
        supportCount: 1,
        sourceLabels: new Set<string>([`request-log:${hint.hintType}`])
      });
    }
  }

  return support;
}

export function buildNextCaptureTargets(options: BuildNextCaptureTargetsOptions): NextCaptureTargetsFile {
  const targetMap = new Map<string, MutableTarget>();

  const upsertTarget = (
    url: string,
    kind: NextCaptureTargetRecord["kind"],
    category: string,
    confidence: ReferenceConfidence,
    reason: string,
    blocker: string,
    sourceLabel: string
  ) => {
    const existing = targetMap.get(url);
    const target = existing ?? {
      url,
      host: readHost(url),
      relativePath: readRelativePath(url),
      kind,
      category,
      confidence,
      score: 0,
      sourceLabels: new Set<string>(),
      blockers: new Set<string>(),
      reasons: new Set<string>()
    };
    if (!existing) {
      targetMap.set(url, target);
    }
    target.kind = target.kind === "atlas-page" ? target.kind : kind;
    target.category = target.category === "image" ? target.category : category;
    target.confidence = promoteConfidence(target.confidence, confidence);
    target.score = Math.max(target.score, kindPriorityWeight(kind) + confidenceWeight(confidence) + categoryWeight(category));
    target.sourceLabels.add(sourceLabel);
    target.blockers.add(blocker);
    target.reasons.add(reason);
  };

  for (const manifest of options.atlasManifestFile.manifests) {
    for (const missingPageUrl of manifest.missingPageUrls) {
      upsertTarget(
        missingPageUrl,
        "atlas-page",
        "image",
        "confirmed",
        `Referenced by ${manifest.kind} metadata ${manifest.localPath}.`,
        "Atlas metadata exists, but the referenced page image is still missing.",
        `atlas:${manifest.localPath}`
      );
    }
  }

  for (const candidate of options.runtimeCandidates.unresolvedDependencies) {
    const kind = candidate.category === "translation" || readHost(candidate.url) === "translations.bgaming-network.com"
      ? "translation-payload"
      : candidate.kind === "runtime-script"
        ? "runtime-script"
        : candidate.kind === "runtime-metadata"
          ? "runtime-metadata"
          : "bundle-asset";
    upsertTarget(
      candidate.url,
      kind,
      candidate.category,
      candidate.confidence,
      candidate.note ?? "Missing runtime dependency discovered during donor scan.",
      "Runtime dependency is still unresolved in the current local package.",
      `runtime:${candidate.kind}`
    );
  }

  const bundleReferenceCounts = new Map<string, number>();
  for (const reference of options.bundleAssetMap.references) {
    if (!reference.resolvedUrl || reference.localStatus !== "missing") {
      continue;
    }
    bundleReferenceCounts.set(reference.resolvedUrl, (bundleReferenceCounts.get(reference.resolvedUrl) ?? 0) + 1);
  }

  for (const reference of options.bundleAssetMap.references) {
    if (!reference.resolvedUrl || reference.localStatus !== "missing") {
      continue;
    }
    const count = bundleReferenceCounts.get(reference.resolvedUrl) ?? 1;
    upsertTarget(
      reference.resolvedUrl,
      reference.category === "translation" ? "translation-payload" : "bundle-asset",
      reference.category,
      reference.confidence,
      count > 1
        ? `Referenced by ${count} bundle entries, including ${reference.bundleLocalPath}.`
        : `Referenced by ${reference.bundleLocalPath}.`,
      "Bundle asset-map found a missing asset reference that is not downloaded locally yet.",
      `bundle:${reference.bundleLocalPath}`
    );
  }

  const targetEntries = [...targetMap.entries()];
  const directoryAliasSupport = buildDirectoryAliasSupport(targetEntries, options.bundleAssetMap, options.requestBackedStaticHints);
  const targets = targetEntries
    .map(([url, target], index) => toTargetRecord(url, target, index + 1, options.bundleAssetMap, directoryAliasSupport, options.requestBackedStaticHints))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }
      if (left.priority !== right.priority) {
        return left.priority.localeCompare(right.priority);
      }
      return left.url.localeCompare(right.url);
    })
    .map((target, index) => ({ ...target, rank: index + 1 }));

  const countsByPriority: Record<CaptureTargetPriority, number> = {
    immediate: 0,
    high: 0,
    medium: 0
  };
  for (const target of targets) {
    countsByPriority[target.priority] += 1;
  }

  return {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    targetCount: targets.length,
    countsByPriority,
    targets
  };
}
