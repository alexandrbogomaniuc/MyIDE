import { promises as fs } from "node:fs";
import path from "node:path";
import {
  type AtlasManifestFile,
  type AtlasManifestRecord,
  type HarvestManifestFile,
  normalizeCandidateUrl,
  workspaceRoot
} from "./shared";

interface DiscoverAtlasMetadataOptions {
  donorId: string;
  donorName: string;
  harvestManifest: HarvestManifestFile;
}

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function parseAtlasText(rawText: string): { pageRefs: string[]; regionCount: number } {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim());
  const pageRefs: string[] = [];
  let regionCount = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }

    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(line)) {
      pageRefs.push(line);
      continue;
    }

    const nextLine = lines[index + 1]?.trim() ?? "";
    if (!line.includes(":") && /^bounds:/i.test(nextLine)) {
      regionCount += 1;
    }
  }

  return {
    pageRefs: Array.from(new Set(pageRefs)),
    regionCount
  };
}

async function recordExists(localPath: string | null, downloadedPathSet: Set<string>): Promise<boolean> {
  if (!localPath) {
    return false;
  }
  if (downloadedPathSet.has(localPath)) {
    return true;
  }
  try {
    await fs.access(path.join(workspaceRoot, localPath));
    return true;
  } catch {
    return false;
  }
}

export async function discoverAtlasMetadata(options: DiscoverAtlasMetadataOptions): Promise<AtlasManifestFile> {
  const harvestedEntries = Array.isArray(options.harvestManifest.entries) ? options.harvestManifest.entries : [];
  const downloadedEntries = harvestedEntries.filter((entry) => entry.status === "downloaded" && typeof entry.localPath === "string");
  const downloadedPathSet = new Set(downloadedEntries.map((entry) => entry.localPath!));
  const downloadedUrlSet = new Set<string>();
  for (const entry of downloadedEntries) {
    downloadedUrlSet.add(entry.sourceUrl);
    if (entry.resolvedUrl) {
      downloadedUrlSet.add(entry.resolvedUrl);
    }
  }

  const manifests: AtlasManifestRecord[] = [];

  for (const entry of downloadedEntries) {
    const localPath = entry.localPath!;
    const absolutePath = path.join(workspaceRoot, localPath);
    const sourceUrl = entry.resolvedUrl ?? entry.sourceUrl;

    if (/\.atlas$/i.test(localPath)) {
      const rawText = await fs.readFile(absolutePath, "utf8");
      const parsed = parseAtlasText(rawText);
      const missingPageUrls: string[] = [];
      const localPagePaths: string[] = [];
      for (const pageRef of parsed.pageRefs) {
        const pageUrl = normalizeCandidateUrl(pageRef, sourceUrl);
        if (!pageUrl) {
          continue;
        }
        const matchedEntry = downloadedEntries.find((candidate) => candidate.sourceUrl === pageUrl || candidate.resolvedUrl === pageUrl);
        if (matchedEntry?.localPath) {
          localPagePaths.push(matchedEntry.localPath);
        } else {
          missingPageUrls.push(pageUrl);
        }
      }
      manifests.push({
        sourceUrl,
        localPath,
        kind: "atlas-text",
        frameCount: parsed.regionCount,
        regionCount: parsed.regionCount,
        animationCount: null,
        pageRefs: parsed.pageRefs,
        localPagePaths,
        missingPageUrls,
        notes: parsed.pageRefs.length === 0 ? ["No atlas page image refs were found in the atlas text."] : []
      });
      continue;
    }

    if (/\.plist$/i.test(localPath)) {
      const rawText = await fs.readFile(absolutePath, "utf8");
      const frameCount = (rawText.match(/<key>frame<\/key>/g) ?? []).length;
      manifests.push({
        sourceUrl,
        localPath,
        kind: "plist",
        frameCount: frameCount || null,
        regionCount: frameCount || null,
        animationCount: null,
        pageRefs: [],
        localPagePaths: [],
        missingPageUrls: [],
        notes: ["Plist atlas metadata was found, but page images are not parsed from plist yet."]
      });
      continue;
    }

    if (/\.json$/i.test(localPath)) {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(await fs.readFile(absolutePath, "utf8"));
      } catch {
        continue;
      }
      const object = toObject(parsedJson);
      const meta = toObject(object.meta);
      const skeleton = toObject(object.skeleton);
      const frames = object.frames;
      const pageRefs: string[] = [];
      const localPagePaths: string[] = [];
      const missingPageUrls: string[] = [];

      const metaImage = typeof meta.image === "string" ? meta.image : null;
      if (metaImage) {
        pageRefs.push(metaImage);
        const pageUrl = normalizeCandidateUrl(metaImage, sourceUrl);
        if (pageUrl) {
          const matchedEntry = downloadedEntries.find((candidate) => candidate.sourceUrl === pageUrl || candidate.resolvedUrl === pageUrl);
          if (matchedEntry?.localPath) {
            localPagePaths.push(matchedEntry.localPath);
          } else {
            missingPageUrls.push(pageUrl);
          }
        }
      }

      const imagesRoot = typeof object.images === "string" ? object.images : null;
      if (imagesRoot) {
        pageRefs.push(imagesRoot);
      }

      if (Object.keys(skeleton).length > 0 && Object.keys(toObject(object.animations)).length > 0) {
        manifests.push({
          sourceUrl,
          localPath,
          kind: "spine-json",
          frameCount: null,
          regionCount: null,
          animationCount: Object.keys(toObject(object.animations)).length,
          pageRefs: Array.from(new Set(pageRefs)),
          localPagePaths,
          missingPageUrls,
          notes: imagesRoot ? [`Spine image root: ${imagesRoot}`] : ["Spine skeleton metadata captured without a direct page image."]
        });
        continue;
      }

      if (Array.isArray(frames) || Object.keys(toObject(frames)).length > 0) {
        const frameCount = Array.isArray(frames) ? frames.length : Object.keys(toObject(frames)).length;
        manifests.push({
          sourceUrl,
          localPath,
          kind: "sprite-sheet-json",
          frameCount,
          regionCount: frameCount,
          animationCount: null,
          pageRefs: Array.from(new Set(pageRefs)),
          localPagePaths,
          missingPageUrls,
          notes: []
        });
      }
    }
  }

  manifests.sort((left, right) => left.localPath.localeCompare(right.localPath));
  const atlasTextCount = manifests.filter((entry) => entry.kind === "atlas-text").length;
  const spriteSheetJsonCount = manifests.filter((entry) => entry.kind === "sprite-sheet-json").length;
  const plistCount = manifests.filter((entry) => entry.kind === "plist").length;
  const spineJsonCount = manifests.filter((entry) => entry.kind === "spine-json").length;
  const frameManifestCount = manifests.filter((entry) => entry.kind === "atlas-text" || entry.kind === "sprite-sheet-json" || entry.kind === "plist").length;
  const missingPageCount = manifests.reduce((total, entry) => total + entry.missingPageUrls.length, 0);

  return {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    atlasTextCount,
    spriteSheetJsonCount,
    plistCount,
    spineJsonCount,
    frameManifestCount,
    missingPageCount,
    manifests
  };
}
