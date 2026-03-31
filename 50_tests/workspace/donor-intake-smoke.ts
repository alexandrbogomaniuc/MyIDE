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
    assert.ok(result.discoveredUrlCount >= 4, "intake should discover the launch URL plus referenced assets");

    const bootstrapHtml = await fs.readFile(path.join(donorRoot, "raw", "bootstrap", "launch.html"), "utf8");
    assert.match(bootstrapHtml, /Smoke Donor/, "captured HTML should be written to the donor pack");

    const discoveredJson = JSON.parse(await fs.readFile(path.join(donorRoot, "raw", "discovered", "discovered-urls.json"), "utf8")) as {
      discoveredUrls?: Array<{ url?: string }>;
    };
    const discoveredUrls = Array.isArray(discoveredJson.discoveredUrls) ? discoveredJson.discoveredUrls.map((entry) => entry.url) : [];
    assert.ok(discoveredUrls.some((url) => typeof url === "string" && url.includes("/bundle.js")), "bundle.js should appear in the discovered URL inventory");
    assert.ok(discoveredUrls.some((url) => typeof url === "string" && url.includes("/img/logo.png")), "logo image should appear in the discovered URL inventory");

    const report = await fs.readFile(path.join(donorRoot, "reports", "DONOR_INTAKE_REPORT.md"), "utf8");
    assert.match(report, /Discovered URL count:/, "intake report should summarize discovered URL counts");

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
