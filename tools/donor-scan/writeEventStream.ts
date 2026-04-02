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
  let existing: InvestigationEventRecord[] = [];
  try {
    const raw = await fs.readFile(filePath, "utf8");
    existing = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as InvestigationEventRecord);
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code !== "ENOENT") {
      throw error;
    }
  }

  const merged = [...existing, ...events];
  const unique = Array.from(new Map(
    merged.map((event) => [
      [
        event.timestamp,
        event.type,
        event.donorId,
        event.profileId ?? "",
        event.scenarioId ?? "",
        event.summary
      ].join("|"),
      event
    ])
  ).values()).slice(-400);

  const payload = unique.map((event) => JSON.stringify(event)).join("\n");
  await fs.writeFile(filePath, payload.length > 0 ? `${payload}\n` : "", "utf8");
}
