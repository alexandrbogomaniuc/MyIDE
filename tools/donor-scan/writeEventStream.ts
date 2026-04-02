import { promises as fs } from "node:fs";
import path from "node:path";

export interface InvestigationEventRecord {
  timestamp: string;
  type: string;
  donorId: string;
  profileId?: string | null;
  scenarioId?: string | null;
  summary: string;
  details?: Record<string, unknown>;
}

export async function writeInvestigationEventStream(
  filePath: string,
  events: readonly InvestigationEventRecord[]
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const payload = events
    .map((event) => JSON.stringify(event))
    .join("\n");
  await fs.writeFile(filePath, payload.length > 0 ? `${payload}\n` : "", "utf8");
}
