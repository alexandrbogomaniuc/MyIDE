import path from "path";

import { getRepoRoot } from "../publication/shared";
import { FixtureKind, FixtureSelection, ParsedSessionFixture, ReplaySummary, getProjectConfig } from "./shared";

export type ExportManifest = {
  schemaVersion: string;
  projectId: string;
  targetFolderName: string;
  requestedFixtureSelection: FixtureSelection;
  actualFixtureSelection: string;
  actualFixtureKind: FixtureKind;
  staticPackagePath: string;
  fixturePath: string;
  comparisonPath: string;
  capturedNotesPath: string;
  fixtureProvenance: string;
  captureStatus: string;
  roundId: string;
  capturedRoundId: string;
  capturedRoundIdEvidence: string;
  sourceCapture: string;
  donorId: string;
  comparisonMode: string;
  confirmedFromCaptured: string[];
  provisionalFields: string[];
  sessionId?: string;
  sessionFixturePath?: string;
  sessionFixtureKind?: string;
  sessionFixtureProvenance?: string;
  sessionCaptureStatus?: string;
  sessionRowCount?: number;
  selectedSessionRowIndex?: number;
  selectedSessionRowRoundId?: string;
  exportedFiles: string[];
  rendererStatus: string;
  packagePurpose: string;
  limitations: string[];
};

export function getExportRoot(projectId: string): string {
  return path.join("/tmp", `myide-vabs-${projectId}-export`);
}

export function getExportPackageRoot(projectId: string, repoRoot = getRepoRoot()): string {
  const config = getProjectConfig(projectId);
  return path.join(getExportRoot(projectId), "common", "vabs", config.targetFolderName);
}

export function getExportManifestPath(projectId: string, repoRoot = getRepoRoot()): string {
  return path.join(getExportPackageRoot(projectId, repoRoot), "manifest.json");
}

export function getExportPreviewRoot(projectId: string): string {
  return path.join("/tmp", `myide-vabs-${projectId}-export-preview`);
}

export function getExportPreviewArtifactDirectory(projectId: string, fixtureKind: FixtureKind): string {
  return path.join(getExportPreviewRoot(projectId), fixtureKind);
}

export function buildExportManifest(
  summary: ReplaySummary,
  exportedFiles: string[],
  sessionContext?: { session: ParsedSessionFixture; selectedRowIndex: number }
): ExportManifest {
  return {
    schemaVersion: "0.1.0",
    projectId: summary.projectId,
    targetFolderName: summary.targetFolderName,
    requestedFixtureSelection: summary.requestedFixtureSelection,
    actualFixtureSelection: summary.actualFixtureSelection,
    actualFixtureKind: summary.actualFixtureKind,
    staticPackagePath: `common/vabs/${summary.targetFolderName}`,
    fixturePath: summary.fixturePath,
    comparisonPath: summary.comparisonPath,
    capturedNotesPath: summary.capturedNotesPath,
    fixtureProvenance: summary.fixtureProvenance,
    captureStatus: summary.captureStatus,
    roundId: summary.roundId,
    capturedRoundId: summary.capturedRoundId,
    capturedRoundIdEvidence: summary.capturedRoundIdEvidence,
    sourceCapture: summary.sourceCapture,
    donorId: summary.donorId,
    comparisonMode: summary.comparisonMode,
    confirmedFromCaptured: summary.confirmedFromCaptured,
    provisionalFields: summary.provisionalFields,
    sessionId: sessionContext?.session.sessionId,
    sessionFixturePath: sessionContext?.session.relativeFixturePath,
    sessionFixtureKind: sessionContext?.session.sessionFixtureKind,
    sessionFixtureProvenance: sessionContext?.session.sessionFixtureProvenance,
    sessionCaptureStatus: sessionContext?.session.captureStatus,
    sessionRowCount: sessionContext?.session.rows.length,
    selectedSessionRowIndex: sessionContext?.selectedRowIndex,
    selectedSessionRowRoundId:
      typeof sessionContext?.selectedRowIndex === "number"
        ? sessionContext.session.rows[sessionContext.selectedRowIndex]?.summary.roundId
        : undefined,
    exportedFiles,
    rendererStatus: "stub-only-non-production",
    packagePurpose: "local-gs-style-export-preview",
    limitations: [
      "Read-only local export only.",
      "No finished production GS renderer is claimed here.",
      "Auto export only promotes a sanitized captured row or sanitized captured session; otherwise it exports the derived fixture."
    ]
  };
}
