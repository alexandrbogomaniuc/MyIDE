import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prepareProjectModificationHandoff } from "../../30_app/workspace/modificationHandoff";

const workspaceRoot = path.resolve(__dirname, "../../..");

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function seedProject(projectId: string, donorId: string): Promise<string> {
  const projectRoot = path.join(workspaceRoot, "40_projects", projectId);
  await writeJson(path.join(projectRoot, "project.meta.json"), {
    schemaVersion: "0.1.0",
    projectId,
    slug: projectId,
    displayName: "Modification Handoff Smoke Project",
    gameFamily: "slot",
    implementationScope: "slot-first",
    phase: "PHASE SMOKE",
    status: "planned",
    verification: {
      status: "unknown",
      checks: []
    },
    lifecycle: {
      currentStage: "investigation",
      stages: {
        investigation: { status: "in-progress" },
        modificationComposeRuntime: { status: "planned" },
        mathConfig: { status: "deferred" },
        gsExport: { status: "deferred" }
      }
    },
    paths: {
      projectRoot: `40_projects/${projectId}`,
      projectJson: `40_projects/${projectId}/project.json`,
      metaPath: `40_projects/${projectId}/project.meta.json`,
      registryPath: "40_projects/registry.json",
      evidenceRoot: `10_donors/${donorId}/evidence`,
      donorRoot: `40_projects/${projectId}/donor`,
      reportsRoot: `40_projects/${projectId}/reports`,
      importsRoot: `40_projects/${projectId}/imports`,
      internalRoot: `40_projects/${projectId}/internal`,
      importPath: `40_projects/${projectId}/imports/import-manifest.json`,
      runtimeRoot: `40_projects/${projectId}/runtime`,
      fixturesRoot: `40_projects/${projectId}/fixtures`,
      targetRoot: `40_projects/${projectId}/target`,
      releaseRoot: `40_projects/${projectId}/release`,
      logsRoot: `40_projects/${projectId}/logs`
    },
    donor: {
      donorId,
      donorName: "Smoke Donor",
      evidenceRoot: `10_donors/${donorId}/evidence`,
      captureSessions: [],
      evidenceRefs: [],
      status: "planned"
    },
    targetGame: {
      targetGameId: "target.smoke",
      displayName: "Smoke Target",
      gameFamily: "slot",
      relationship: "future-target",
      status: "planned",
      provenNotes: [],
      plannedNotes: []
    },
    timestamps: {
      createdAt: "2026-04-02T00:00:00Z",
      updatedAt: "2026-04-02T00:00:00Z"
    },
    notes: {
      provenFacts: [],
      plannedWork: []
    }
  });
  return projectRoot;
}

async function seedDonorQueue(donorId: string): Promise<string> {
  const harvestRoot = path.join(workspaceRoot, "10_donors", donorId, "evidence", "local_only", "harvest");
  await writeJson(path.join(harvestRoot, "modification-queue.json"), {
    schemaVersion: "0.1.0",
    donorId,
    donorName: "Smoke Donor",
    generatedAt: "2026-04-02T12:36:44.780Z",
    itemCount: 1,
    queuedFamilyCount: 0,
    queuedSectionCount: 1,
    items: [
      {
        candidateId: "section:big_win:big_win:big_win_bw",
        scenarioId: "big_win",
        displayName: "Big Win",
        promotionKind: "section",
        familyName: "big_win",
        sectionKey: "big_win/BW",
        lane: "ready-for-reconstruction",
        readinessState: "ready-for-skin-reconstruction",
        recommendedWorkbench: "compose-runtime",
        sourceArtifactPath: null,
        supportingArtifactPaths: [],
        rationale: "Smoke queue item.",
        nextAction: "Open Modification / Compose.",
        queueId: "modification:section:big_win:big_win:big_win_bw",
        status: "queued-for-modification",
        promotedAt: "2026-04-02T12:36:44.780Z",
        queuedFromStage: "investigation"
      }
    ]
  });
  await writeJson(path.join(harvestRoot, "section-skin-texture-fit-apply-bundle-profiles.json"), {
    schemaVersion: "0.1.0",
    donorId,
    donorName: "Smoke Donor",
    generatedAt: "2026-04-02T12:36:44.780Z",
    sectionCount: 1,
    sections: [
      {
        familyName: "big_win",
        sectionKey: "big_win/BW",
        textureFitApplyState: "ready-with-applied-fit-transforms",
        textureFitApplyBundlePath: `10_donors/${donorId}/evidence/local_only/harvest/section-skin-texture-fit-apply-bundles/big_win--big_win-BW.json`,
        atlasSourcePath: "40_projects/project_001/runtime/local-mirror/files/cdn.bgaming-network.com/big_win.atlas",
        sampleLocalSourcePath: "40_projects/project_001/runtime/local-mirror/files/cdn.bgaming-network.com/big_win.json",
        topAppliedLocalPath: `10_donors/${donorId}/evidence/local_only/harvest/files/example/big-win-ribbon.png`,
        nextTextureFitApplyStep: "Use the applied fit bundle as the downstream handoff for modification."
      }
    ]
  });
  return harvestRoot;
}

async function main(): Promise<void> {
  const uniqueId = Date.now().toString(36);
  const projectId = `project_smoke_modhandoff_${uniqueId}`;
  const donorId = `donor_smoke_modhandoff_${uniqueId}`;
  const projectRoot = await seedProject(projectId, donorId);
  const harvestRoot = await seedDonorQueue(donorId);

  try {
    const result = await prepareProjectModificationHandoff(projectId);
    assert.equal(result.projectId, projectId, "handoff should target the requested project");
    assert.equal(result.readyTaskCount, 1, "one queued item should resolve into one ready task");
    assert.equal(result.blockedTaskCount, 0, "resolved section should not remain blocked");
    assert.equal(result.tasks[0]?.sourceArtifactKind, "texture-fit-apply-bundle", "strongest downstream artifact should be chosen");
    assert.ok(result.tasks[0]?.sourceArtifactPath?.includes("section-skin-texture-fit-apply-bundles"), "resolved task should point at the fit-apply bundle");

    const written = JSON.parse(
      await fs.readFile(path.join(projectRoot, "reports", "modification-handoff.json"), "utf8")
    ) as {
      readyTaskCount?: number;
      tasks?: Array<{ sourceArtifactKind?: string }>;
    };
    assert.equal(written.readyTaskCount, 1, "report should persist ready task count");
    assert.equal(written.tasks?.[0]?.sourceArtifactKind, "texture-fit-apply-bundle", "report should persist strongest artifact kind");

    console.log("PASS project-modification-handoff smoke");
  } finally {
    await fs.rm(projectRoot, { recursive: true, force: true });
    await fs.rm(path.join(workspaceRoot, "10_donors", donorId), { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL project-modification-handoff smoke - ${message}`);
  process.exitCode = 1;
});
