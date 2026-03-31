import { promises as fs } from "node:fs";
import path from "node:path";

export interface BootstrapDonorIntakeOptions {
  donorId: string;
  donorName: string;
  donorLaunchUrl?: string;
  overwrite?: boolean;
}

export interface DiscoveredDonorUrl {
  url: string;
  category: "html" | "script" | "style" | "image" | "audio" | "video" | "font" | "json" | "api" | "other";
  source: "launch-url" | "html-attribute" | "html-inline";
}

export interface DonorIntakeResult {
  status: "captured" | "blocked" | "skipped";
  donorId: string;
  donorRoot: string;
  evidenceRoot: string;
  reportPath: string;
  launchUrl?: string;
  resolvedLaunchUrl?: string;
  sourceHost?: string;
  bootstrapHtmlPath?: string;
  discoveredUrlsPath?: string;
  discoveredUrlCount: number;
  error?: string;
}

const workspaceRoot = path.resolve(__dirname, "../../..");
const sensitiveQueryKeyPattern = /(token|sid|session|signature|sig|key|auth|password|secret|hash)/i;

function buildDonorPaths(donorId: string) {
  const donorRoot = path.join(workspaceRoot, "10_donors", donorId);
  return {
    donorRoot,
    evidenceRoot: path.join(donorRoot, "evidence"),
    reportsRoot: path.join(donorRoot, "reports"),
    rawRoot: path.join(donorRoot, "raw"),
    bootstrapRoot: path.join(donorRoot, "raw", "bootstrap"),
    discoveredRoot: path.join(donorRoot, "raw", "discovered"),
    captureSessionsRoot: path.join(donorRoot, "evidence", "capture_sessions"),
    localOnlyRoot: path.join(donorRoot, "evidence", "local_only"),
    readmePath: path.join(donorRoot, "README.md"),
    evidenceReadmePath: path.join(donorRoot, "evidence", "README.md"),
    reportsReadmePath: path.join(donorRoot, "reports", "README.md"),
    rawReadmePath: path.join(donorRoot, "raw", "README.md"),
    reportPath: path.join(donorRoot, "reports", "DONOR_INTAKE_REPORT.md"),
    requestPath: path.join(donorRoot, "raw", "bootstrap", "launch-request.json"),
    bootstrapHtmlPath: path.join(donorRoot, "raw", "bootstrap", "launch.html"),
    discoveredUrlsPath: path.join(donorRoot, "raw", "discovered", "discovered-urls.json")
  };
}

async function writeFileConditionally(filePath: string, content: string, overwrite: boolean): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  if (!overwrite) {
    try {
      await fs.access(filePath);
      return;
    } catch {
      // fall through
    }
  }

  await fs.writeFile(filePath, content, "utf8");
}

async function ensureDonorScaffold(donorId: string, donorName: string, overwrite: boolean): Promise<ReturnType<typeof buildDonorPaths>> {
  const paths = buildDonorPaths(donorId);
  await Promise.all([
    fs.mkdir(paths.evidenceRoot, { recursive: true }),
    fs.mkdir(paths.reportsRoot, { recursive: true }),
    fs.mkdir(paths.rawRoot, { recursive: true }),
    fs.mkdir(paths.bootstrapRoot, { recursive: true }),
    fs.mkdir(paths.discoveredRoot, { recursive: true }),
    fs.mkdir(paths.captureSessionsRoot, { recursive: true }),
    fs.mkdir(paths.localOnlyRoot, { recursive: true })
  ]);

  await Promise.all([
    writeFileConditionally(paths.readmePath, [
      `# ${donorId}`,
      "",
      `Shared donor capture pack for ${donorName}.`,
      "",
      "- `raw/` keeps donor-facing bootstrap material read-only once captured.",
      "- `evidence/` holds capture sessions, indexes, and local-only runtime notes.",
      "- `reports/` holds derived reports and intake summaries."
    ].join("\n"), overwrite),
    writeFileConditionally(paths.evidenceReadmePath, [
      "# Evidence",
      "",
      "Use this folder for evidence indexes, capture sessions, and local-only runtime observations.",
      "",
      "Do not claim proof until the evidence pack is populated."
    ].join("\n"), overwrite),
    writeFileConditionally(paths.reportsReadmePath, [
      "# Reports",
      "",
      "Derived donor reports and capture summaries live here."
    ].join("\n"), overwrite),
    writeFileConditionally(paths.rawReadmePath, [
      "# Raw Bootstrap",
      "",
      "Captured donor bootstrap material lives here.",
      "",
      "Treat these files as read-only donor inputs after capture."
    ].join("\n"), overwrite)
  ]);

  return paths;
}

export function sanitizeStoredUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    for (const key of [...parsed.searchParams.keys()]) {
      if (sensitiveQueryKeyPattern.test(key)) {
        parsed.searchParams.set(key, "<redacted>");
      }
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function sanitizeUrlsInText(rawText: string): string {
  return rawText.replace(/https?:\/\/[^\s"'<>\\)]+/gi, (matched) => sanitizeStoredUrl(matched));
}

function classifyUrl(candidate: URL): DiscoveredDonorUrl["category"] {
  const pathname = candidate.pathname.toLowerCase();
  if (pathname.endsWith(".js")) {
    return "script";
  }
  if (pathname.endsWith(".css")) {
    return "style";
  }
  if (pathname.endsWith(".png") || pathname.endsWith(".jpg") || pathname.endsWith(".jpeg") || pathname.endsWith(".gif") || pathname.endsWith(".svg") || pathname.endsWith(".webp")) {
    return "image";
  }
  if (pathname.endsWith(".ogg") || pathname.endsWith(".mp3") || pathname.endsWith(".wav") || pathname.endsWith(".m4a")) {
    return "audio";
  }
  if (pathname.endsWith(".mp4") || pathname.endsWith(".webm") || pathname.endsWith(".mov")) {
    return "video";
  }
  if (pathname.endsWith(".woff") || pathname.endsWith(".woff2") || pathname.endsWith(".ttf") || pathname.endsWith(".otf")) {
    return "font";
  }
  if (pathname.endsWith(".json")) {
    return "json";
  }
  if (pathname.includes("/api/")) {
    return "api";
  }
  return "other";
}

function normalizeDiscoveredUrl(value: string, baseUrl: URL): URL | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:") || trimmed.startsWith("mailto:") || trimmed.startsWith("#")) {
    return null;
  }

  try {
    return new URL(trimmed, baseUrl);
  } catch {
    return null;
  }
}

function extractDiscoveredUrls(html: string, launchUrl: string, resolvedUrl: string): DiscoveredDonorUrl[] {
  const result = new Map<string, DiscoveredDonorUrl>();
  const baseUrl = new URL(resolvedUrl);
  const normalizedLaunchUrl = sanitizeStoredUrl(launchUrl);
  result.set(normalizedLaunchUrl, {
    url: normalizedLaunchUrl,
    category: "html",
    source: "launch-url"
  });

  const attributePattern = /\b(?:src|href|poster|data-src|data-url)=["']([^"'<>]+)["']/gi;
  let attributeMatch: RegExpExecArray | null;
  while ((attributeMatch = attributePattern.exec(html)) !== null) {
    const normalized = normalizeDiscoveredUrl(attributeMatch[1], baseUrl);
    if (!normalized) {
      continue;
    }
    const sanitized = sanitizeStoredUrl(normalized.toString());
    result.set(sanitized, {
      url: sanitized,
      category: classifyUrl(normalized),
      source: "html-attribute"
    });
  }

  const inlineUrlPattern = /https?:\/\/[^\s"'<>\\)]+/gi;
  let inlineMatch: RegExpExecArray | null;
  while ((inlineMatch = inlineUrlPattern.exec(html)) !== null) {
    const normalized = normalizeDiscoveredUrl(inlineMatch[0], baseUrl);
    if (!normalized) {
      continue;
    }
    const sanitized = sanitizeStoredUrl(normalized.toString());
    if (!result.has(sanitized)) {
      result.set(sanitized, {
        url: sanitized,
        category: classifyUrl(normalized),
        source: "html-inline"
      });
    }
  }

  return [...result.values()].sort((left, right) => {
    if (left.category === right.category) {
      return left.url.localeCompare(right.url);
    }
    return left.category.localeCompare(right.category);
  });
}

function buildIntakeReport(result: DonorIntakeResult, donorName: string): string {
  const lines = [
    "# Donor Intake Report",
    "",
    `- Donor ID: \`${result.donorId}\``,
    `- Donor name: ${donorName}`,
    `- Intake status: \`${result.status}\``
  ];

  if (result.launchUrl) {
    lines.push(`- Launch URL (sanitized): \`${result.launchUrl}\``);
  }
  if (result.resolvedLaunchUrl) {
    lines.push(`- Resolved launch URL (sanitized): \`${result.resolvedLaunchUrl}\``);
  }
  if (result.sourceHost) {
    lines.push(`- Source host: \`${result.sourceHost}\``);
  }

  lines.push(`- Discovered URL count: ${result.discoveredUrlCount}`);
  lines.push(`- Evidence root: \`${path.relative(workspaceRoot, result.evidenceRoot)}\``);
  lines.push(`- Bootstrap HTML path: \`${result.bootstrapHtmlPath ? path.relative(workspaceRoot, result.bootstrapHtmlPath) : "not captured"}\``);
  lines.push(`- URL inventory path: \`${result.discoveredUrlsPath ? path.relative(workspaceRoot, result.discoveredUrlsPath) : "not captured"}\``);

  if (result.error) {
    lines.push(`- Error: ${result.error}`);
  }

  lines.push(
    "",
    "## What this proves",
    "",
    result.status === "captured"
      ? "- The donor entry page was fetched and a first-pass URL inventory was written locally."
      : result.status === "blocked"
        ? "- The donor pack scaffold exists, but the first donor launch capture failed and needs investigation."
        : "- The donor pack scaffold exists, but no launch URL was supplied yet.",
    "",
    "## Next steps",
    "",
    "- Verify the donor launch URL and add capture sessions under `evidence/capture_sessions/`.",
    "- Promote grounded findings into donor reports before claiming runtime parity.",
    "- Keep raw donor bootstrap files read-only once captured."
  );

  return `${lines.join("\n")}\n`;
}

export async function bootstrapDonorIntake(options: BootstrapDonorIntakeOptions): Promise<DonorIntakeResult> {
  const donorId = options.donorId.trim();
  const donorName = options.donorName.trim() || donorId;
  const donorLaunchUrl = options.donorLaunchUrl?.trim() ?? "";
  const overwrite = Boolean(options.overwrite);
  const paths = await ensureDonorScaffold(donorId, donorName, overwrite);

  const baseResult: DonorIntakeResult = {
    status: donorLaunchUrl ? "blocked" : "skipped",
    donorId,
    donorRoot: paths.donorRoot,
    evidenceRoot: paths.evidenceRoot,
    reportPath: paths.reportPath,
    launchUrl: donorLaunchUrl ? sanitizeStoredUrl(donorLaunchUrl) : undefined,
    sourceHost: donorLaunchUrl ? (() => {
      try {
        return new URL(donorLaunchUrl).host;
      } catch {
        return undefined;
      }
    })() : undefined,
    bootstrapHtmlPath: donorLaunchUrl ? paths.bootstrapHtmlPath : undefined,
    discoveredUrlsPath: donorLaunchUrl ? paths.discoveredUrlsPath : undefined,
    discoveredUrlCount: 0
  };

  if (!donorLaunchUrl) {
    await writeFileConditionally(paths.reportPath, buildIntakeReport(baseResult, donorName), overwrite);
    return baseResult;
  }

  try {
    const response = await fetch(donorLaunchUrl, {
      redirect: "follow",
      headers: {
        "user-agent": "MyIDE Donor Intake/0.1"
      }
    });

    const html = await response.text();
    if (!response.ok) {
      throw new Error(`Launch fetch failed with HTTP ${response.status}`);
    }

    const resolvedLaunchUrl = sanitizeStoredUrl(response.url || donorLaunchUrl);
    const discoveredUrls = extractDiscoveredUrls(html, donorLaunchUrl, response.url || donorLaunchUrl);
    const result: DonorIntakeResult = {
      ...baseResult,
      status: "captured",
      resolvedLaunchUrl,
      sourceHost: (() => {
        try {
          return new URL(response.url || donorLaunchUrl).host;
        } catch {
          return baseResult.sourceHost;
        }
      })(),
      discoveredUrlCount: discoveredUrls.length
    };

    await Promise.all([
      writeFileConditionally(paths.requestPath, `${JSON.stringify({
        requestedUrl: sanitizeStoredUrl(donorLaunchUrl),
        resolvedUrl: resolvedLaunchUrl,
        status: response.status,
        ok: response.ok,
        capturedAt: new Date().toISOString(),
        contentType: response.headers.get("content-type")
      }, null, 2)}\n`, overwrite),
      writeFileConditionally(paths.bootstrapHtmlPath, `${sanitizeUrlsInText(html)}\n`, overwrite),
      writeFileConditionally(paths.discoveredUrlsPath, `${JSON.stringify({
        schemaVersion: "0.1.0",
        donorId,
        donorName,
        launchUrl: sanitizeStoredUrl(donorLaunchUrl),
        resolvedLaunchUrl,
        discoveredUrls
      }, null, 2)}\n`, overwrite),
      writeFileConditionally(paths.reportPath, buildIntakeReport(result, donorName), overwrite)
    ]);

    return result;
  } catch (error) {
    const failedResult: DonorIntakeResult = {
      ...baseResult,
      status: "blocked",
      error: error instanceof Error ? error.message : String(error)
    };
    await writeFileConditionally(paths.reportPath, buildIntakeReport(failedResult, donorName), overwrite);
    return failedResult;
  }
}
