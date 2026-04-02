export interface ScenarioProfileDefinition {
  profileId: string;
  displayName: string;
  description: string;
  defaultMinutes: number;
  requiresOperatorAssist: boolean;
  primaryUse: "coverage" | "stress" | "bonus" | "manual";
}

export const scenarioProfiles: readonly ScenarioProfileDefinition[] = [
  {
    profileId: "default-bet",
    displayName: "Default Bet",
    description: "Short bounded runtime pass at the default bet for early coverage and basic event discovery.",
    defaultMinutes: 5,
    requiresOperatorAssist: false,
    primaryUse: "coverage"
  },
  {
    profileId: "max-bet",
    displayName: "Max Bet",
    description: "Bounded high-value pass intended to expose anticipation, win, and bonus-adjacent families faster.",
    defaultMinutes: 10,
    requiresOperatorAssist: false,
    primaryUse: "stress"
  },
  {
    profileId: "autoplay",
    displayName: "Autoplay",
    description: "Bounded autoplay coverage pass for repeated base-spin sampling without random manual play.",
    defaultMinutes: 10,
    requiresOperatorAssist: false,
    primaryUse: "coverage"
  },
  {
    profileId: "buy-feature",
    displayName: "Buy Feature",
    description: "Explicit bonus-entry profile for donors that expose a legal bounded buy-feature path.",
    defaultMinutes: 5,
    requiresOperatorAssist: true,
    primaryUse: "bonus"
  },
  {
    profileId: "manual-operator-assist",
    displayName: "Manual Operator Assist",
    description: "Structured manual play with explicit coverage targets when the donor still needs human steering.",
    defaultMinutes: 10,
    requiresOperatorAssist: true,
    primaryUse: "manual"
  }
] as const;

export function getScenarioProfile(profileId: string): ScenarioProfileDefinition | undefined {
  return scenarioProfiles.find((profile) => profile.profileId === profileId);
}
