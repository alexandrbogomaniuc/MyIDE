import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { bootstrapDonorIntake } from "../../30_app/workspace/donorIntake";

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
          spine: "/spines/stick.json"
        }));
        return;
      }

      if (request.url === "/spines/stick.json") {
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({
          note: "bounded recursive smoke fixture"
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
      downloadedByCategory?: Record<string, number>;
      assetFamilies?: Array<{ familyKey?: string }>;
      entryPoints?: { scripts?: string[]; styles?: string[]; json?: string[] };
    };
    assert.equal(packageManifest.packageStatus, "packaged", "package manifest should record a packaged donor slice");
    assert.ok((packageManifest.discoveredUrlCount ?? 0) >= 8, "package manifest should summarize discovered URL counts");
    assert.ok((packageManifest.downloadedByCategory?.script ?? 0) >= 1, "package manifest should summarize downloaded scripts");
    assert.ok(Array.isArray(packageManifest.assetFamilies) && packageManifest.assetFamilies.some((entry) => typeof entry.familyKey === "string" && entry.familyKey.includes("config")), "package manifest should expose bounded asset family grouping");
    assert.ok(Array.isArray(packageManifest.entryPoints?.json) && packageManifest.entryPoints?.json.some((url) => typeof url === "string" && url.includes("/config/game.json")), "package manifest should record recursive JSON entry points");

    const report = await fs.readFile(path.join(donorRoot, "reports", "DONOR_INTAKE_REPORT.md"), "utf8");
    assert.match(report, /Discovered URL count:/, "intake report should summarize discovered URL counts");
    assert.match(report, /Harvested assets:/, "intake report should summarize harvested asset counts");
    assert.match(report, /Package manifest path:/, "intake report should summarize donor package manifest output");

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
