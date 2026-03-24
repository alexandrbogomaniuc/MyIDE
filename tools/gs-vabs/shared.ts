import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../publication/shared";

export const DEFAULT_PROJECT_ID = "project_001";

export type VerificationProblem = {
  relativePath: string;
  message: string;
};

type ScaffoldFile = {
  relativePath: string;
  contents: (projectId: string) => string;
};

const REQUIRED_DIRECTORIES = [
  "contract",
  "renderer",
  "assets",
  "deploy",
  "tests"
];

const REQUIRED_FILES: ScaffoldFile[] = [
  {
    relativePath: "README.md",
    contents: (projectId) =>
      `# ${projectId} VABS Workspace\n\nScaffold-only GS VABS workspace for ${projectId}.\n`
  },
  {
    relativePath: "contract/README.md",
    contents: () => "# VABS Contract Notes\n\nContract scaffold.\n"
  },
  {
    relativePath: "contract/archived-row-contract.md",
    contents: () =>
      "# Archived Row Contract\n\n`ROUND_ID` is mandatory.\n"
  },
  {
    relativePath: "contract/betData-keys.md",
    contents: () => "# betData Keys\n\nDocument proven keys here.\n"
  },
  {
    relativePath: "contract/servletData-keys.md",
    contents: () => "# servletData Keys\n\nDocument proven keys here.\n"
  },
  {
    relativePath: "contract/sample-playerBets-row.json",
    contents: () =>
      JSON.stringify(
        {
          time: "24 Mar 2026 12:34:56",
          stateId: 100,
          stateName: "ROUND_COMPLETE",
          bet: 1.0,
          win: 2.5,
          balance: 103.5,
          betData: "BET_TOTAL=100",
          servletData: "ROUND_ID=123456789",
          extBetId: "sample-ext-bet-001"
        },
        null,
        2
      ) + "\n"
  },
  {
    relativePath: "renderer/README.md",
    contents: () => "# Renderer Scaffold\n\nTemplate-only scaffold.\n"
  },
  {
    relativePath: "renderer/code.template.js",
    contents: () =>
      "function start() {\n  console.log(\"Replace with project-local VABS renderer.\");\n}\n"
  },
  {
    relativePath: "renderer/strings_en.template.js",
    contents: () => "var game_strings = {};\n"
  },
  {
    relativePath: "assets/README.md",
    contents: () => "# VABS Assets Notes\n\nScaffold-only asset notes.\n"
  },
  {
    relativePath: "deploy/README.md",
    contents: () => "# VABS Deploy Notes\n\nScaffold-only deploy notes.\n"
  },
  {
    relativePath: "deploy/static-host-checklist.md",
    contents: () =>
      "# Static Host Checklist\n\n- [ ] `/common/vabs/<folder>/code.js` is served.\n"
  },
  {
    relativePath: "tests/README.md",
    contents: () => "# VABS Acceptance Notes\n\nScaffold-only acceptance notes.\n"
  },
  {
    relativePath: "tests/acceptance-checklist.md",
    contents: () =>
      "# Acceptance Checklist\n\n- [ ] `ROUND_ID` is documented.\n- [ ] Renderer template exists.\n"
  }
];

export function parseProjectIdArg(): string {
  return process.argv[2] ?? DEFAULT_PROJECT_ID;
}

export function getProjectRoot(projectId: string, repoRoot = getRepoRoot()): string {
  return path.join(repoRoot, "40_projects", projectId);
}

export function getVabsRoot(projectId: string, repoRoot = getRepoRoot()): string {
  return path.join(getProjectRoot(projectId, repoRoot), "vabs");
}

export function ensureScaffold(projectId: string, repoRoot = getRepoRoot()): {
  createdDirectories: string[];
  createdFiles: string[];
} {
  const vabsRoot = getVabsRoot(projectId, repoRoot);
  const createdDirectories: string[] = [];
  const createdFiles: string[] = [];

  if (!existsSync(vabsRoot)) {
    mkdirSync(vabsRoot, { recursive: true });
    createdDirectories.push(path.relative(repoRoot, vabsRoot));
  }

  for (const directory of REQUIRED_DIRECTORIES) {
    const directoryPath = path.join(vabsRoot, directory);
    if (!existsSync(directoryPath)) {
      mkdirSync(directoryPath, { recursive: true });
      createdDirectories.push(path.relative(repoRoot, directoryPath));
    }
  }

  for (const file of REQUIRED_FILES) {
    const filePath = path.join(vabsRoot, file.relativePath);
    if (!existsSync(filePath)) {
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, file.contents(projectId), "utf8");
      createdFiles.push(path.relative(repoRoot, filePath));
    }
  }

  return { createdDirectories, createdFiles };
}

export function verifyScaffold(projectId: string, repoRoot = getRepoRoot()): VerificationProblem[] {
  const vabsRoot = getVabsRoot(projectId, repoRoot);
  const problems: VerificationProblem[] = [];

  for (const directory of REQUIRED_DIRECTORIES) {
    const directoryPath = path.join(vabsRoot, directory);
    if (!existsSync(directoryPath)) {
      problems.push({
        relativePath: path.relative(repoRoot, directoryPath),
        message: "Required directory is missing"
      });
    }
  }

  for (const file of REQUIRED_FILES) {
    const filePath = path.join(vabsRoot, file.relativePath);
    if (!existsSync(filePath)) {
      problems.push({
        relativePath: path.relative(repoRoot, filePath),
        message: "Required scaffold file is missing"
      });
      continue;
    }
  }

  const roundIdDocs = [
    "contract/archived-row-contract.md",
    "tests/acceptance-checklist.md"
  ];
  for (const relativePath of roundIdDocs) {
    const filePath = path.join(vabsRoot, relativePath);
    if (!existsSync(filePath)) {
      continue;
    }
    const text = readFileSync(filePath, "utf8");
    if (!text.includes("ROUND_ID")) {
      problems.push({
        relativePath: path.relative(repoRoot, filePath),
        message: "ROUND_ID is not documented"
      });
    }
  }

  const sampleRowPath = path.join(vabsRoot, "contract/sample-playerBets-row.json");
  if (existsSync(sampleRowPath)) {
    const sampleRowText = readFileSync(sampleRowPath, "utf8");
    const requiredTokens = [
      "\"time\"",
      "\"stateId\"",
      "\"stateName\"",
      "\"bet\"",
      "\"win\"",
      "\"balance\"",
      "\"betData\"",
      "\"servletData\"",
      "\"extBetId\"",
      "ROUND_ID"
    ];
    for (const token of requiredTokens) {
      if (!sampleRowText.includes(token)) {
        problems.push({
          relativePath: path.relative(repoRoot, sampleRowPath),
          message: `Sample row is missing ${token}`
        });
      }
    }
  }

  return problems;
}
