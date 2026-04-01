import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { bootstrapDonorIntake } from "../../30_app/workspace/donorIntake";
import { runDonorScan } from "../../tools/donor-scan/runDonorScan";

const workspaceRoot = path.resolve(__dirname, "../../..");

function startFixtureServer(): Promise<{ server: http.Server; port: number }> {
  const html = [
    "<!doctype html>",
    "<html>",
    "<head>",
    '  <meta charset="utf-8" />',
    '  <title>Smoke Donor</title>',
    '  <link rel="stylesheet" href="/styles/app.css" />',
    "</head>",
    "<body>",
    '  <img src="/img/logo.png" alt="logo" />',
    '  <script src="/bundle.js"></script>',
    '  <script>window.assetUrl = "https://cdn.example.test/audio/ambient.ogg";</script>',
    "</body>",
    "</html>"
  ].join("\n");

  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      if (request.url === "/launch") {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(html);
        return;
      }

      if (request.url === "/styles/app.css") {
        response.writeHead(200, { "content-type": "text/css; charset=utf-8" });
        response.end([
          "@font-face {",
          "  font-family: 'SmokeUi';",
          "  src: url('/fonts/ui.woff2') format('woff2');",
          "}",
          "body {",
          "  background: #123 url('/img/bg.webp') no-repeat center center;",
          "}"
        ].join("\n"));
        return;
      }

      if (request.url === "/bundle.js") {
        response.writeHead(200, { "content-type": "application/javascript; charset=utf-8" });
        response.end([
          "window.assetUrl = '/audio/ambient.ogg';",
          "window.configUrl = '/config/game.json';",
          "window.atlasUrl = '/atlases/ui.atlas';",
          "window.bundleMeta = {images:{\"spines/spin_1.png\":{e:\".png_80_80.webp\",f_e:\".f.png_80_90.png\"},\"spines/spin_2.png\":{e:\".png_80_80.webp\"},\"symbols/spin_3.png\":{e:\".png_80_80.webp\",f_e:\".f.png_80_90.png\"},\"requested/request_1.png\":{e:\".png_80_90.png\"}}};",
          "window.projectDesc = {localeResourcesPath:'https://translations.bgaming-network.com/SmokeDonor',defaultLanguage:'en',rulesUrl:'https://rules.bgaming-network.com/en/SmokeRules.json'};",
          "var at={resourcesPath:'https://fixture.example.test/',projectDesc:window.projectDesc},s={images:window.bundleMeta.images};",
          "var yt=t=>t?at.resourcesPath+\"img/\"+t:null;at._textureNameToPath=yt,at.getImageMetadata=t=>s.images[t]||{};",
          "var langApi={};langApi.loadLanguages=function(t,e){return t||(t='en'),new Promise((i=>{var n=e+\"/\"+t+\".json\";return fetchResource(n).then(i)}))};",
          "window.altSpin1 = '/spines/spin_1.png';",
          "window.altSpin2 = '/spines/spin_2.png';",
          "window.altSymbolSpin3 = '/symbols/spin_3.png';",
          "console.log('smoke bundle');"
        ].join("\n"));
        return;
      }

      if (request.url === "/img/logo.png") {
        response.writeHead(200, { "content-type": "image/png" });
        response.end(Buffer.from("89504e470d0a1a0a", "hex"));
        return;
      }

      if (request.url === "/img/bg.webp" || request.url === "/img/symbols.png") {
        response.writeHead(200, { "content-type": request.url.endsWith(".webp") ? "image/webp" : "image/png" });
        response.end(Buffer.from("52494646", "hex"));
        return;
      }

      if (request.url === "/fonts/ui.woff2") {
        response.writeHead(200, { "content-type": "font/woff2" });
        response.end(Buffer.from("774f4632", "hex"));
        return;
      }

      if (request.url === "/audio/ambient.ogg") {
        response.writeHead(200, { "content-type": "audio/ogg" });
        response.end(Buffer.from("4f676753", "hex"));
        return;
      }

      if (request.url === "/config/game.json") {
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({
          sheet: "/img/symbols.png",
          spine: "/spines/stick.json",
          spriteSheet: "/sprites/pack.json",
          bonusSheets: ["/sprites/spin_1.json", "/sprites/spin_2.json", "/sprites/spin_3.json"],
          requestSheets: ["/sprites/request_1.json", "/sprites/request_2.json", "/sprites/request_3.json"]
        }));
        return;
      }

      if (request.url === "/atlases/ui.atlas") {
        response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        response.end([
          "ui.png",
          "size: 128,128",
          "format: RGBA8888",
          "filter: Linear,Linear",
          "repeat: none",
          "",
          "button_idle",
          "bounds: 0,0,64,64",
          "",
          "button_hover",
          "bounds: 64,0,64,64"
        ].join("\n"));
        return;
      }

      if (request.url === "/atlases/ui.png") {
        response.writeHead(200, { "content-type": "image/png" });
        response.end(Buffer.from("89504e470d0a1a0a", "hex"));
        return;
      }

      if (request.url === "/spines/stick.json") {
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({
          skeleton: { spine: "4.1.0" },
          animations: { idle: {} },
          images: "./images/stick/",
          note: "bounded recursive smoke fixture"
        }));
        return;
      }

      if (request.url === "/sprites/pack.json") {
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({
          frames: {
            logo: { frame: { x: 0, y: 0, w: 32, h: 32 } }
          },
          meta: {
            image: "/img/symbols.png"
          }
        }));
        return;
      }

      if (
        request.url === "/sprites/spin_1.json"
        || request.url === "/sprites/spin_2.json"
        || request.url === "/sprites/spin_3.json"
        || request.url === "/sprites/request_1.json"
        || request.url === "/sprites/request_2.json"
        || request.url === "/sprites/request_3.json"
      ) {
        const stem = request.url.includes("/spin_1.json")
          ? "spin_1"
          : request.url.includes("/spin_2.json")
            ? "spin_2"
            : request.url.includes("/spin_3.json")
              ? "spin_3"
              : request.url.includes("/request_1.json")
                ? "request_1"
                : request.url.includes("/request_2.json")
                  ? "request_2"
                  : "request_3";
        const imagePath = stem.startsWith("request_")
          ? `/img/requested/${stem}.png`
          : `/img/spines/${stem}.png`;
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({
          frames: {
            [stem]: { frame: { x: 0, y: 0, w: 32, h: 32 } }
          },
          meta: {
            image: imagePath
          }
        }));
        return;
      }

      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("not found");
    });

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to start donor-intake smoke server."));
        return;
      }

      resolve({ server, port: address.port });
    });
  });
}

async function main(): Promise<void> {
  const donorId = `donor_smoke_intake_${Date.now().toString(36)}`;
  const donorRoot = path.join(workspaceRoot, "10_donors", donorId);
  const { server, port } = await startFixtureServer();

  try {
    const result = await bootstrapDonorIntake({
      donorId,
      donorName: "Smoke Intake Donor",
      donorLaunchUrl: `http://127.0.0.1:${port}/launch`,
      overwrite: true
    });

    assert.equal(result.status, "captured", "donor intake should capture the fixture launch page");
    assert.equal(result.sourceHost, `127.0.0.1:${port}`, "source host should reflect the local fixture host");
    assert.ok(result.discoveredUrlCount >= 8, "intake should discover launch-time URLs plus bounded recursive asset references");
    assert.equal(result.harvestStatus, "harvested", "direct static assets should be harvested");
    assert.ok((result.harvestedAssetCount ?? 0) >= 7, "recursive donor harvest should download first and second-level fixture assets");

    const bootstrapHtml = await fs.readFile(path.join(donorRoot, "raw", "bootstrap", "launch.html"), "utf8");
    assert.match(bootstrapHtml, /Smoke Donor/, "captured HTML should be written to the donor pack");

    const discoveredJson = JSON.parse(await fs.readFile(path.join(donorRoot, "raw", "discovered", "discovered-urls.json"), "utf8")) as {
      discoveredUrls?: Array<{ url?: string }>;
    };
    const discoveredUrls = Array.isArray(discoveredJson.discoveredUrls) ? discoveredJson.discoveredUrls.map((entry) => entry.url) : [];
    assert.ok(discoveredUrls.some((url) => typeof url === "string" && url.includes("/bundle.js")), "bundle.js should appear in the discovered URL inventory");
    assert.ok(discoveredUrls.some((url) => typeof url === "string" && url.includes("/img/logo.png")), "logo image should appear in the discovered URL inventory");
    assert.ok(discoveredUrls.some((url) => typeof url === "string" && url.includes("/config/game.json")), "recursive JS-discovered JSON should appear in the discovered URL inventory");
    assert.ok(discoveredUrls.some((url) => typeof url === "string" && url.includes("/img/symbols.png")), "recursive JSON-discovered image should appear in the discovered URL inventory");

    const harvestManifest = JSON.parse(await fs.readFile(path.join(donorRoot, "evidence", "local_only", "harvest", "asset-manifest.json"), "utf8")) as {
      harvestedAssetCount?: number;
      recursiveDiscoveredUrlCount?: number;
      entries?: Array<{ status?: string; localPath?: string; sourceUrl?: string; depth?: number; discoveredFromUrl?: string }>;
    };
    assert.ok((harvestManifest.harvestedAssetCount ?? 0) >= 7, "harvest manifest should record recursive downloaded assets");
    assert.ok((harvestManifest.recursiveDiscoveredUrlCount ?? 0) >= 3, "harvest manifest should record recursive discovery counts");
    assert.ok(
      Array.isArray(harvestManifest.entries) && harvestManifest.entries.some((entry) => entry.status === "downloaded" && typeof entry.localPath === "string" && entry.sourceUrl?.includes("/bundle.js")),
      "harvest manifest should include a downloaded bundle.js entry"
    );
    assert.ok(
      Array.isArray(harvestManifest.entries) && harvestManifest.entries.some((entry) => entry.status === "downloaded" && entry.sourceUrl?.includes("/img/symbols.png") && entry.depth === 2 && entry.discoveredFromUrl?.includes("/config/game.json")),
      "harvest manifest should include a recursive second-level image with depth and provenance"
    );

    const packageManifest = JSON.parse(await fs.readFile(path.join(donorRoot, "evidence", "local_only", "harvest", "package-manifest.json"), "utf8")) as {
      packageStatus?: string;
      discoveredUrlCount?: number;
      packageGraphNodeCount?: number;
      packageGraphEdgeCount?: number;
      packageUnresolvedCount?: number;
      packageGraphPath?: string;
      downloadedByCategory?: Record<string, number>;
      assetFamilies?: Array<{ familyKey?: string }>;
      entryPoints?: { scripts?: string[]; styles?: string[]; json?: string[] };
    };
    assert.equal(packageManifest.packageStatus, "packaged", "package manifest should record a packaged donor slice");
    assert.ok((packageManifest.discoveredUrlCount ?? 0) >= 8, "package manifest should summarize discovered URL counts");
    assert.ok((packageManifest.packageGraphNodeCount ?? 0) >= 8, "package manifest should summarize graph node counts");
    assert.ok((packageManifest.packageGraphEdgeCount ?? 0) >= 3, "package manifest should summarize graph edge counts");
    assert.ok(typeof packageManifest.packageGraphPath === "string" && packageManifest.packageGraphPath.includes("package-graph.json"), "package manifest should point at the package graph artifact");
    assert.ok((packageManifest.downloadedByCategory?.script ?? 0) >= 1, "package manifest should summarize downloaded scripts");
    assert.ok(Array.isArray(packageManifest.assetFamilies) && packageManifest.assetFamilies.some((entry) => typeof entry.familyKey === "string" && entry.familyKey.includes("config")), "package manifest should expose bounded asset family grouping");
    assert.ok(Array.isArray(packageManifest.entryPoints?.json) && packageManifest.entryPoints?.json.some((url) => typeof url === "string" && url.includes("/config/game.json")), "package manifest should record recursive JSON entry points");

    const packageGraph = JSON.parse(await fs.readFile(path.join(donorRoot, "evidence", "local_only", "harvest", "package-graph.json"), "utf8")) as {
      nodeCount?: number;
      edgeCount?: number;
      unresolvedNodeCount?: number;
      nodes?: Array<{ url?: string; localPath?: string; outboundReferenceCount?: number; downloadStatus?: string }>;
      edges?: Array<{ fromUrl?: string; toUrl?: string }>;
    };
    assert.ok((packageGraph.nodeCount ?? 0) >= 8, "package graph should record donor package nodes");
    assert.ok((packageGraph.edgeCount ?? 0) >= 3, "package graph should record donor package edges");
    assert.ok((packageGraph.unresolvedNodeCount ?? 0) >= 1, "package graph should surface unresolved or inventory-only nodes");
    assert.ok(
      Array.isArray(packageGraph.nodes) && packageGraph.nodes.some((node) => node.url?.includes("/bundle.js") && typeof node.localPath === "string"),
      "package graph should include the downloaded bundle.js node"
    );
    assert.ok(
      Array.isArray(packageGraph.nodes) && packageGraph.nodes.some((node) => node.url?.includes("/config/game.json") && (node.outboundReferenceCount ?? 0) >= 1),
      "package graph should include recursive nodes with outbound references"
    );
    assert.ok(
      Array.isArray(packageGraph.edges) && packageGraph.edges.some((edge) => edge.fromUrl?.includes("/config/game.json") && edge.toUrl?.includes("/img/symbols.png")),
      "package graph should preserve recursive parent-child provenance"
    );

    const entryPoints = JSON.parse(await fs.readFile(path.join(donorRoot, "evidence", "local_only", "harvest", "entry-points.json"), "utf8")) as {
      entryPointCount?: number;
      entryPoints?: Array<{ url?: string }>;
    };
    assert.ok((entryPoints.entryPointCount ?? 0) >= 4, "donor scan should write entry-point counts");
    assert.ok(Array.isArray(entryPoints.entryPoints) && entryPoints.entryPoints.some((entry) => entry.url?.includes("/bundle.js")), "donor scan should keep bundle.js as an entry point");

    const bundleAssetMap = JSON.parse(await fs.readFile(path.join(donorRoot, "evidence", "local_only", "harvest", "bundle-asset-map.json"), "utf8")) as {
      status?: string;
      referenceCount?: number;
      imageVariantStatus?: string;
      imageVariantEntryCount?: number;
      imageVariantSuffixCount?: number;
      imageVariantUrlBuilderStatus?: string;
      imageVariantUrlCount?: number;
      translationPayloadStatus?: string;
      translationPayloadCount?: number;
      imageVariantFieldCounts?: Record<string, number>;
      translationPayloads?: Array<{
        rootUrl?: string;
        locale?: string;
        payloadUrl?: string;
        localeHintSource?: string;
      }>;
      imageVariants?: Array<{
        logicalPath?: string;
        requestBaseUrl?: string | null;
        variants?: Record<string, string>;
        variantUrls?: Array<{ key?: string; url?: string }>;
      }>;
      countsByCategory?: Record<string, number>;
    };
    assert.equal(bundleAssetMap.status, "mapped", "donor scan should map bundle asset references");
    assert.ok((bundleAssetMap.referenceCount ?? 0) >= 3, "bundle asset map should expose grounded bundle references");
    assert.ok((bundleAssetMap.countsByCategory?.json ?? 0) >= 1, "bundle asset map should classify runtime metadata references");
    assert.equal(bundleAssetMap.imageVariantStatus, "mapped", "bundle asset map should expose bundle image variant metadata when the bundle carries an images table");
    assert.ok((bundleAssetMap.imageVariantEntryCount ?? 0) >= 3, "bundle asset map should count logical image entries from the bundle images table");
    assert.ok((bundleAssetMap.imageVariantSuffixCount ?? 0) >= 4, "bundle asset map should count extracted variant suffix tokens");
    assert.equal(bundleAssetMap.imageVariantUrlBuilderStatus, "mapped", "bundle asset map should prove the bundle image request-path builder when the bundle exposes it");
    assert.ok((bundleAssetMap.imageVariantUrlCount ?? 0) >= 4, "bundle asset map should generate grounded optimized variant URLs once the request-path builder is proven");
    assert.ok((bundleAssetMap.imageVariantFieldCounts?.e ?? 0) >= 3, "bundle asset map should count primary variant suffix fields");
    assert.ok((bundleAssetMap.imageVariantFieldCounts?.f_e ?? 0) >= 1, "bundle asset map should count fallback variant suffix fields");
    assert.ok(
      Array.isArray(bundleAssetMap.imageVariants)
        && bundleAssetMap.imageVariants.some((entry) =>
          entry.logicalPath?.includes("spines/spin_1.png")
          && entry.variants?.f_e === ".f.png_80_90.png"
        ),
      "bundle asset map should preserve per-image variant metadata without guessing final URLs"
    );
    assert.ok(
      Array.isArray(bundleAssetMap.imageVariants)
        && bundleAssetMap.imageVariants.some((entry) =>
          entry.logicalPath?.includes("spines/spin_1.png")
          && entry.requestBaseUrl?.includes("/img/spines/spin_1.png")
          && Array.isArray(entry.variantUrls)
          && entry.variantUrls.some((variant) => variant.key === "e" && variant.url?.includes("/img/spines/spin_1.png_80_80.webp"))
          && entry.variantUrls.some((variant) => variant.key === "f_e" && variant.url?.includes("/img/spines/spin_1.f.png_80_90.png"))
        ),
      "bundle asset map should generate grounded optimized variant URLs when the bundle proves the image request-path rule"
    );
    assert.equal(bundleAssetMap.translationPayloadStatus, "mapped", "bundle asset map should prove translation payload URLs when the bundle exposes localeResourcesPath plus loadLanguages");
    assert.ok((bundleAssetMap.translationPayloadCount ?? 0) >= 1, "bundle asset map should surface grounded translation payload counts");
    assert.ok(
      Array.isArray(bundleAssetMap.translationPayloads)
        && bundleAssetMap.translationPayloads.some((entry) =>
          entry.rootUrl?.includes("translations.bgaming-network.com/SmokeDonor")
          && entry.locale === "en"
          && entry.payloadUrl?.includes("translations.bgaming-network.com/SmokeDonor/en.json")
          && ["default-language", "rules-url", "direct-payload"].includes(entry.localeHintSource ?? "")
        ),
      "bundle asset map should preserve grounded translation payload URLs without guessing the locale root"
    );

    const atlasManifests = JSON.parse(await fs.readFile(path.join(donorRoot, "evidence", "local_only", "harvest", "atlas-manifests.json"), "utf8")) as {
      atlasTextCount?: number;
      spriteSheetJsonCount?: number;
      spineJsonCount?: number;
      manifests?: Array<{ kind?: string }>;
    };
    assert.ok((atlasManifests.atlasTextCount ?? 0) >= 1, "atlas scan should discover atlas text files");
    assert.ok((atlasManifests.spriteSheetJsonCount ?? 0) >= 1, "atlas scan should discover sprite-sheet json");
    assert.ok((atlasManifests.spineJsonCount ?? 0) >= 1, "atlas scan should discover spine json");
    assert.ok(Array.isArray(atlasManifests.manifests) && atlasManifests.manifests.some((entry) => entry.kind === "atlas-text"), "atlas manifest list should preserve atlas entries");

    const scanSummary = JSON.parse(await fs.readFile(path.join(donorRoot, "evidence", "local_only", "harvest", "scan-summary.json"), "utf8")) as {
      scanState?: string;
      runtimeCandidateCount?: number;
      atlasManifestCount?: number;
      bundleAssetMapStatus?: string;
      bundleImageVariantStatus?: string;
      bundleImageVariantCount?: number;
      bundleImageVariantSuffixCount?: number;
      bundleImageVariantUrlBuilderStatus?: string;
      bundleImageVariantUrlCount?: number;
      translationPayloadStatus?: string;
      translationPayloadCount?: number;
      mirrorCandidateStatus?: string;
      nextCaptureTargetCount?: number;
      rawPayloadBlockedCaptureTargetCount?: number;
      nextOperatorAction?: string;
    };
    assert.equal(scanSummary.scanState, "scanned", "donor scan summary should mark the scan as scanned");
    assert.ok((scanSummary.runtimeCandidateCount ?? 0) >= 4, "donor scan summary should expose runtime candidate counts");
    assert.ok((scanSummary.atlasManifestCount ?? 0) >= 3, "donor scan summary should expose atlas metadata counts");
    assert.equal(scanSummary.bundleAssetMapStatus, "mapped", "donor scan summary should surface bundle map status");
    assert.equal(scanSummary.bundleImageVariantStatus, "mapped", "donor scan summary should surface bundle image variant status");
    assert.ok((scanSummary.bundleImageVariantCount ?? 0) >= 3, "donor scan summary should surface bundle image variant counts");
    assert.ok((scanSummary.bundleImageVariantSuffixCount ?? 0) >= 4, "donor scan summary should surface bundle image variant suffix counts");
    assert.equal(scanSummary.bundleImageVariantUrlBuilderStatus, "mapped", "donor scan summary should surface bundle image URL builder status");
    assert.ok((scanSummary.bundleImageVariantUrlCount ?? 0) >= 4, "donor scan summary should surface grounded bundle image variant URL counts");
    assert.equal(scanSummary.translationPayloadStatus, "mapped", "donor scan summary should surface translation payload status");
    assert.ok((scanSummary.translationPayloadCount ?? 0) >= 1, "donor scan summary should surface translation payload counts");
    assert.equal(typeof scanSummary.mirrorCandidateStatus, "string", "donor scan summary should surface mirror candidate status");
    assert.ok((scanSummary.nextCaptureTargetCount ?? 0) >= 1, "donor scan summary should expose next capture target counts");
    assert.equal(typeof scanSummary.rawPayloadBlockedCaptureTargetCount, "number", "donor scan summary should surface raw-payload-blocked target counts");
    assert.equal(typeof scanSummary.nextOperatorAction, "string", "donor scan summary should recommend the next operator action");

    const nextCaptureTargets = JSON.parse(await fs.readFile(path.join(donorRoot, "evidence", "local_only", "harvest", "next-capture-targets.json"), "utf8")) as {
      targetCount?: number;
      targets?: Array<{ relativePath?: string; priority?: string; kind?: string; alternateCaptureHints?: Array<{ url?: string; source?: string }> }>;
    };
    assert.ok((nextCaptureTargets.targetCount ?? 0) >= 1, "donor scan should write next capture targets");
    assert.ok(Array.isArray(nextCaptureTargets.targets) && nextCaptureTargets.targets.some((target) => typeof target.relativePath === "string" && target.relativePath.length > 0), "next capture targets should keep a relative path");
    assert.ok(Array.isArray(nextCaptureTargets.targets) && nextCaptureTargets.targets.some((target) => Array.isArray(target.alternateCaptureHints)), "next capture targets should persist grounded alternate capture hint arrays");
    assert.ok(
      Array.isArray(nextCaptureTargets.targets)
        && nextCaptureTargets.targets.some((target) =>
          typeof target.relativePath === "string"
          && target.relativePath.includes("img/spines/spin_3.png")
          && Array.isArray(target.alternateCaptureHints)
          && target.alternateCaptureHints.some((hint) => typeof hint.url === "string" && hint.url.includes("/spines/spin_3.png"))
        ),
      "next capture targets should derive family-alias alternates from grounded same-basename path substitutions"
    );
    assert.ok(
      Array.isArray(nextCaptureTargets.targets)
        && nextCaptureTargets.targets.some((target) =>
          typeof target.relativePath === "string"
          && target.relativePath.includes("img/spines/spin_1.png")
          && Array.isArray(target.alternateCaptureHints)
          && target.alternateCaptureHints.some((hint) => typeof hint.url === "string" && hint.url.includes("/img/spines/spin_1.png_80_80.webp"))
          && target.alternateCaptureHints.some((hint) => typeof hint.url === "string" && hint.url.includes("/img/spines/spin_1.f.png_80_90.png"))
        ),
      "next capture targets should expose grounded optimized variant URLs when the bundle proves the image request-path rule"
    );
    assert.ok(
      Array.isArray(nextCaptureTargets.targets)
        && nextCaptureTargets.targets.some((target) =>
          typeof target.relativePath === "string"
          && target.relativePath.includes("img/spines/spin_1.png")
          && Array.isArray(target.alternateCaptureHints)
          && typeof target.alternateCaptureHints[0]?.source === "string"
          && target.alternateCaptureHints[0].source.startsWith("bundle-image-variant:")
        ),
      "next capture targets should order grounded bundle-image-variant alternates ahead of weaker rooted-path hints"
    );
    assert.ok(
      Array.isArray(nextCaptureTargets.targets)
        && nextCaptureTargets.targets.some((target) =>
          typeof target.relativePath === "string"
          && target.relativePath.includes("img/spines/spin_3.png")
          && Array.isArray(target.alternateCaptureHints)
          && target.alternateCaptureHints.some((hint) => typeof hint.url === "string" && hint.url.includes("/symbols/spin_3.png"))
          && target.alternateCaptureHints.some((hint) => typeof hint.url === "string" && hint.url.includes("/img/symbols/spin_3.png_80_80.webp"))
          && target.alternateCaptureHints.some((hint) => typeof hint.url === "string" && hint.url.includes("/img/symbols/spin_3.f.png_80_90.png"))
        ),
      "next capture targets should promote optimized variant URLs from bundle-backed alternate rooted image families"
    );
    assert.ok(
      Array.isArray(nextCaptureTargets.targets)
        && nextCaptureTargets.targets.some((target) =>
          target.kind === "translation-payload"
          && typeof target.relativePath === "string"
          && target.relativePath.includes("SmokeDonor/en.json")
        ),
      "next capture targets should include grounded translation payload URLs when the bundle proves the translation loader rule"
    );

    const runtimeRequestLogPath = path.join(donorRoot, "evidence", "local_only", "harvest", "runtime-request-log.json");
    await fs.writeFile(runtimeRequestLogPath, `${JSON.stringify({
      generatedAtUtc: new Date().toISOString(),
      entries: [
        {
          canonicalSourceUrl: `http://127.0.0.1:${port}/img/requested/request_1.png`,
          latestRequestUrl: `http://127.0.0.1:${port}/requested/request_1.png`,
          requestSource: "upstream-request",
          requestCategory: "static-asset",
          runtimeRelativePath: "img/requested/request_1.png",
          fileType: "png",
          hitCount: 2
        },
        {
          canonicalSourceUrl: `http://127.0.0.1:${port}/img/requested/request_2.png`,
          latestRequestUrl: `http://127.0.0.1:${port}/requested/request_2.png`,
          requestSource: "upstream-request",
          requestCategory: "static-asset",
          runtimeRelativePath: "img/requested/request_2.png",
          fileType: "png",
          hitCount: 2
        }
      ]
    }, null, 2)}\n`, "utf8");

    const rescanned = await runDonorScan({
      donorId,
      donorName: "Smoke Intake Donor",
      launchUrl: `http://127.0.0.1:${port}/launch`,
      resolvedLaunchUrl: `http://127.0.0.1:${port}/launch`,
      sourceHost: `127.0.0.1:${port}`
    });
    assert.equal(rescanned.status, "scanned", "donor scan should remain scanned after request-backed hint refresh");

    const requestBackedHints = JSON.parse(await fs.readFile(path.join(donorRoot, "evidence", "local_only", "harvest", "request-backed-static-hints.json"), "utf8")) as {
      hintCount?: number;
      hints?: Array<{ canonicalSourceUrl?: string; alternateUrl?: string; hintType?: string }>;
    };
    assert.ok((requestBackedHints.hintCount ?? 0) >= 2, "request-backed static hint artifact should persist grounded static alternates");
    assert.ok(
      Array.isArray(requestBackedHints.hints)
        && requestBackedHints.hints.some((hint) =>
          typeof hint.canonicalSourceUrl === "string"
          && hint.canonicalSourceUrl.includes("/img/requested/request_1.png")
          && typeof hint.alternateUrl === "string"
          && hint.alternateUrl.includes("/requested/request_1.png")
          && hint.hintType === "rooted-path-alias"
        ),
      "request-backed static hint artifact should preserve rooted-path alternates from runtime request evidence"
    );

    const nextCaptureTargetsAfterRequestEvidence = JSON.parse(await fs.readFile(path.join(donorRoot, "evidence", "local_only", "harvest", "next-capture-targets.json"), "utf8")) as {
      targets?: Array<{ relativePath?: string; alternateCaptureHints?: Array<{ url?: string; source?: string }> }>;
    };
    assert.ok(
      Array.isArray(nextCaptureTargetsAfterRequestEvidence.targets)
        && nextCaptureTargetsAfterRequestEvidence.targets.some((target) =>
          typeof target.relativePath === "string"
          && target.relativePath.includes("img/requested/request_3.png")
          && Array.isArray(target.alternateCaptureHints)
          && target.alternateCaptureHints.some((hint) =>
            typeof hint.url === "string"
            && hint.url.includes("/requested/request_3.png")
            && typeof hint.source === "string"
            && hint.source.startsWith("family-alias:")
          )
        ),
      "request-backed static alternates should feed the same family-alias inference for missing sibling atlas pages"
    );

    const refreshedScanSummary = JSON.parse(await fs.readFile(path.join(donorRoot, "evidence", "local_only", "harvest", "scan-summary.json"), "utf8")) as {
      requestBackedStaticHintCount?: number;
    };
    assert.ok((refreshedScanSummary.requestBackedStaticHintCount ?? 0) >= 2, "scan summary should surface request-backed static hint counts");

    const blockerSummary = await fs.readFile(path.join(donorRoot, "evidence", "local_only", "harvest", "blocker-summary.md"), "utf8");
    assert.match(blockerSummary, /Next operator step/, "blocker summary should explain the next operator step");
    assert.match(blockerSummary, /Highest-priority next capture targets/, "blocker summary should surface the top next capture targets");

    const report = await fs.readFile(path.join(donorRoot, "reports", "DONOR_INTAKE_REPORT.md"), "utf8");
    assert.match(report, /Discovered URL count:/, "intake report should summarize discovered URL counts");
    assert.match(report, /Harvested assets:/, "intake report should summarize harvested asset counts");
    assert.match(report, /Package manifest path:/, "intake report should summarize donor package manifest output");
    assert.match(report, /Package graph path:/, "intake report should summarize donor package graph output");
    assert.match(report, /Scan summary path:/, "intake report should summarize donor scan output");
    assert.match(report, /Next capture targets path:/, "intake report should summarize donor next capture targets output");

    console.log("PASS smoke:donor-intake");
    console.log(`Created donor intake pack: ${path.relative(workspaceRoot, donorRoot)}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await fs.rm(donorRoot, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:donor-intake - ${message}`);
  process.exitCode = 1;
});
