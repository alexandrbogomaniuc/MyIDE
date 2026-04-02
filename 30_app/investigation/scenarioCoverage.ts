export type ScenarioCoverageState =
  | "not-discovered"
  | "discovered-in-static-scan"
  | "observed-in-runtime"
  | "source-material-sufficient"
  | "reconstruction-ready"
  | "blocked";

export type InvestigationLane =
  | "ready-for-reconstruction"
  | "still-blocked-on-source-material";

export interface ScenarioFamilyDefinition {
  scenarioId: string;
  displayName: string;
  category: "entry" | "base-game" | "bonus" | "celebration" | "ui" | "effect";
  order: number;
  keywords: string[];
  recommendedProfiles: string[];
  manualAction: string;
}

export interface ScenarioCoverageSignals {
  discoveredInStaticScan: boolean;
  observedInRuntime: boolean;
  sourceMaterialSufficient: boolean;
  reconstructionReady: boolean;
  blocked: boolean;
  blockerClasses: string[];
  matchedFamilyNames: string[];
}

export const canonicalScenarioFamilies: readonly ScenarioFamilyDefinition[] = [
  {
    scenarioId: "intro_start_resume",
    displayName: "Intro / Start / Resume",
    category: "entry",
    order: 10,
    keywords: ["intro", "start", "resume", "loading", "launch", "splash", "startpage"],
    recommendedProfiles: ["manual-operator-assist", "default-bet"],
    manualAction: "Launch the donor runtime, advance past the intro, and record the start/resume gate."
  },
  {
    scenarioId: "base_spin",
    displayName: "Base Spin",
    category: "base-game",
    order: 20,
    keywords: ["base", "spin", "reel", "normal", "board"],
    recommendedProfiles: ["default-bet", "autoplay"],
    manualAction: "Run a bounded base-game capture loop and confirm the normal spin family is covered."
  },
  {
    scenarioId: "anticipation",
    displayName: "Anticipation",
    category: "effect",
    order: 30,
    keywords: ["anticipation", "tease"],
    recommendedProfiles: ["max-bet", "autoplay"],
    manualAction: "Run a profile that increases anticipation odds and record the cue family."
  },
  {
    scenarioId: "free_spin_enter",
    displayName: "Free Spin Enter",
    category: "bonus",
    order: 40,
    keywords: ["free", "freespin", "bonus", "trigger", "enter", "fs_enter"],
    recommendedProfiles: ["buy-feature", "max-bet", "manual-operator-assist"],
    manualAction: "Trigger a bonus transition or buy-feature path and capture the entry family."
  },
  {
    scenarioId: "free_spin_loop",
    displayName: "Free Spin Loop",
    category: "bonus",
    order: 50,
    keywords: ["free", "freespin", "bonus", "loop", "fs_loop"],
    recommendedProfiles: ["buy-feature", "manual-operator-assist"],
    manualAction: "Stay inside the free-spin round long enough to capture the loop family."
  },
  {
    scenarioId: "free_spin_exit",
    displayName: "Free Spin Exit",
    category: "bonus",
    order: 60,
    keywords: ["free", "freespin", "bonus", "exit", "fs_exit"],
    recommendedProfiles: ["buy-feature", "manual-operator-assist"],
    manualAction: "Complete the free-spin path and capture the exit/summary family."
  },
  {
    scenarioId: "big_win",
    displayName: "Big Win",
    category: "celebration",
    order: 70,
    keywords: ["bigwin", "big_win", "mw", "smw", "bw", "mega", "super", "win"],
    recommendedProfiles: ["max-bet", "manual-operator-assist"],
    manualAction: "Capture or reconstruct the win celebration family and keep its source/material state explicit."
  },
  {
    scenarioId: "jackpot",
    displayName: "Jackpot",
    category: "celebration",
    order: 80,
    keywords: ["jackpot", "jp"],
    recommendedProfiles: ["max-bet", "manual-operator-assist"],
    manualAction: "Use a bounded high-value profile and capture the jackpot family if the donor exposes one."
  },
  {
    scenarioId: "popup_family",
    displayName: "Popup Families",
    category: "ui",
    order: 90,
    keywords: ["popup", "popups", "dialog", "modal", "startpage", "start_page", "panel"],
    recommendedProfiles: ["manual-operator-assist", "default-bet"],
    manualAction: "Record popup and overlay families as distinct investigation coverage, not as incidental screenshots."
  },
  {
    scenarioId: "special_symbol_effect",
    displayName: "Special Symbol / Effect Families",
    category: "effect",
    order: 100,
    keywords: ["wild", "scatter", "coin", "bird", "key", "stick", "effect", "symbol"],
    recommendedProfiles: ["max-bet", "autoplay", "manual-operator-assist"],
    manualAction: "Use the strongest profile that can expose symbol/effect families without widening into unbounded play."
  },
  {
    scenarioId: "bonus_transition",
    displayName: "Bonus Transitions",
    category: "bonus",
    order: 110,
    keywords: ["bonus", "transition", "enter", "exit", "trigger", "pickup"],
    recommendedProfiles: ["buy-feature", "manual-operator-assist"],
    manualAction: "Capture the transition family that bridges base play into the bonus state."
  }
] as const;

export function normalizeScenarioToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function findScenarioDefinition(scenarioId: string): ScenarioFamilyDefinition | undefined {
  return canonicalScenarioFamilies.find((entry) => entry.scenarioId === scenarioId);
}

export function matchScenarioIds(rawFamilyName: string): string[] {
  const normalized = normalizeScenarioToken(rawFamilyName);
  const matches = canonicalScenarioFamilies
    .filter((entry) => entry.keywords.some((keyword) => normalized.includes(normalizeScenarioToken(keyword))))
    .map((entry) => entry.scenarioId);

  return Array.from(new Set(matches));
}

export function classifyScenarioCoverage(signals: ScenarioCoverageSignals): ScenarioCoverageState {
  if (signals.reconstructionReady) {
    return "reconstruction-ready";
  }
  if (signals.sourceMaterialSufficient) {
    return "source-material-sufficient";
  }
  if (signals.observedInRuntime) {
    return "observed-in-runtime";
  }
  if (signals.blocked) {
    return "blocked";
  }
  if (signals.discoveredInStaticScan) {
    return "discovered-in-static-scan";
  }
  return "not-discovered";
}

export function laneForScenarioState(state: ScenarioCoverageState): InvestigationLane {
  return state === "reconstruction-ready" || state === "source-material-sufficient"
    ? "ready-for-reconstruction"
    : "still-blocked-on-source-material";
}

export function nextProfileForScenario(
  definition: ScenarioFamilyDefinition,
  state: ScenarioCoverageState
): string | null {
  if (state === "reconstruction-ready" || state === "source-material-sufficient") {
    return null;
  }
  return definition.recommendedProfiles[0] ?? null;
}

export function nextActionForScenario(
  definition: ScenarioFamilyDefinition,
  state: ScenarioCoverageState,
  signals: ScenarioCoverageSignals
): string {
  if (state === "reconstruction-ready") {
    return "Move this family into Modification / Compose / Runtime handoff.";
  }
  if (state === "source-material-sufficient") {
    return "Prepare the reconstruction handoff and keep runtime capture optional unless a user asks for more coverage.";
  }
  if (state === "observed-in-runtime") {
    return "Improve source material for this observed family before moving it into reconstruction.";
  }
  if (state === "blocked") {
    const blockerText = signals.blockerClasses.length > 0
      ? ` Current blocker: ${signals.blockerClasses.join(", ")}.`
      : "";
    return `${definition.manualAction}${blockerText}`;
  }
  if (state === "discovered-in-static-scan") {
    return `${definition.manualAction} Static evidence exists, but runtime proof or source material is still thin.`;
  }
  return `Run a bounded investigation profile to discover this family. ${definition.manualAction}`;
}

export function scenarioStatePriority(state: ScenarioCoverageState): number {
  switch (state) {
    case "reconstruction-ready":
      return 0;
    case "source-material-sufficient":
      return 1;
    case "observed-in-runtime":
      return 2;
    case "blocked":
      return 3;
    case "discovered-in-static-scan":
      return 4;
    case "not-discovered":
    default:
      return 5;
  }
}
