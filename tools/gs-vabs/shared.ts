import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../publication/shared";

export const DEFAULT_PROJECT_ID = "project_001";

export type ProjectVabsConfig = {
  projectId: string;
  targetFolderName: string;
  targetFolderDecision: string;
  requiredTopLevelFields: string[];
  requiredBetDataKeys: string[];
  requiredServletDataKeys: string[];
};

export type VerificationProblem = {
  relativePath: string;
  message: string;
};

type ScaffoldFile = {
  relativePath: string;
  contents: (projectId: string) => string;
};

type RowFixture = {
  time?: string;
  stateId?: number;
  stateName?: string;
  bet?: number;
  win?: number;
  balance?: number;
  betData?: string;
  servletData?: string;
  extBetId?: string;
};

const REQUIRED_DIRECTORIES = [
  "contract",
  "renderer",
  "assets",
  "deploy",
  "tests"
];

const PROJECT_CONFIGS: Record<string, ProjectVabsConfig> = {
  project_001: {
    projectId: "project_001",
    targetFolderName: "mysterygarden",
    targetFolderDecision: "provisional but intended",
    requiredTopLevelFields: [
      "time",
      "stateId",
      "stateName",
      "extBetId",
      "bet",
      "win",
      "balance",
      "betData",
      "servletData"
    ],
    requiredBetDataKeys: [
      "BET_TOTAL",
      "BETID",
      "COINSEQ",
      "ENTRY_STATE",
      "RESULT_STATE",
      "FOLLOW_UP_STATE",
      "AWARD_FREE_SPINS",
      "CURRENCY",
      "SYMBOL_GRID",
      "EVIDENCE_REFS"
    ],
    requiredServletDataKeys: [
      "ROUND_ID",
      "PROJECT_ID",
      "DONOR_ID",
      "SOURCE_CAPTURE",
      "FIXTURE_KIND",
      "SOURCE_NOTE"
    ]
  }
};

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
    relativePath: "contract/folder-name-mapping.md",
    contents: () =>
      "# Folder Name Mapping\n\nDocument the intended GS VABS folder-name decision here.\n"
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
    relativePath: "contract/parsed-row-example.md",
    contents: () => "# Parsed Row Example\n\nDocument the parsed contract summary here.\n"
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
    relativePath: "renderer/mysterygarden/README.md",
    contents: () => "# Mystery Garden Renderer Stub\n\nProject-specific stub.\n"
  },
  {
    relativePath: "renderer/mysterygarden/code.js",
    contents: () =>
      "function start() {\n  console.log(\"project_001 mysterygarden stub\");\n}\n"
  },
  {
    relativePath: "renderer/mysterygarden/strings_en.js",
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

export function getProjectConfig(projectId: string): ProjectVabsConfig {
  const config = PROJECT_CONFIGS[projectId];
  if (!config) {
    throw new Error(`No GS VABS config is defined yet for ${projectId}`);
  }
  return config;
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

export function parseKeyValueBag(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const entry of text.split("~")) {
    const trimmed = entry.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      result[trimmed] = "";
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1);
    result[key] = value;
  }
  return result;
}

export function getRowFixturePath(projectId: string, repoRoot = getRepoRoot()): string {
  return path.join(getVabsRoot(projectId, repoRoot), "contract", "sample-playerBets-row.json");
}

export function readRowFixture(projectId: string, repoRoot = getRepoRoot()): RowFixture {
  return JSON.parse(readFileSync(getRowFixturePath(projectId, repoRoot), "utf8")) as RowFixture;
}

export function parseRowFixture(projectId: string, repoRoot = getRepoRoot()): {
  fixture: RowFixture;
  betData: Record<string, string>;
  servletData: Record<string, string>;
  roundId: string;
} {
  const fixture = readRowFixture(projectId, repoRoot);
  const betData = parseKeyValueBag(fixture.betData ?? "");
  const servletData = parseKeyValueBag(fixture.servletData ?? "");
  const roundId = servletData.ROUND_ID ?? betData.ROUND_ID ?? "";
  return { fixture, betData, servletData, roundId };
}

export function verifyScaffold(projectId: string, repoRoot = getRepoRoot()): VerificationProblem[] {
  const config = getProjectConfig(projectId);
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
    const parsed = parseRowFixture(projectId, repoRoot);
    for (const field of config.requiredTopLevelFields) {
      if (!(field in parsed.fixture)) {
        problems.push({
          relativePath: path.relative(repoRoot, sampleRowPath),
          message: `Sample row is missing top-level field ${field}`
        });
      }
    }

    if (!parsed.roundId || !/^\d+$/.test(parsed.roundId)) {
      problems.push({
        relativePath: path.relative(repoRoot, sampleRowPath),
        message: "ROUND_ID is missing or not numeric"
      });
    }

    for (const key of config.requiredBetDataKeys) {
      if (!(key in parsed.betData)) {
        problems.push({
          relativePath: path.relative(repoRoot, sampleRowPath),
          message: `betData is missing ${key}`
        });
      }
    }

    for (const key of config.requiredServletDataKeys) {
      if (!(key in parsed.servletData)) {
        problems.push({
          relativePath: path.relative(repoRoot, sampleRowPath),
          message: `servletData is missing ${key}`
        });
      }
    }
  }

  const folderNameMappingPath = path.join(vabsRoot, "contract/folder-name-mapping.md");
  if (existsSync(folderNameMappingPath)) {
    const text = readFileSync(folderNameMappingPath, "utf8");
    if (!text.includes(config.targetFolderName)) {
      problems.push({
        relativePath: path.relative(repoRoot, folderNameMappingPath),
        message: `Folder-name mapping does not mention ${config.targetFolderName}`
      });
    }
    if (!text.toLowerCase().includes(config.targetFolderDecision)) {
      problems.push({
        relativePath: path.relative(repoRoot, folderNameMappingPath),
        message: `Folder-name mapping does not mention decision status ${config.targetFolderDecision}`
      });
    }
  }

  const stubFiles = [
    `renderer/${config.targetFolderName}/README.md`,
    `renderer/${config.targetFolderName}/code.js`,
    `renderer/${config.targetFolderName}/strings_en.js`
  ];
  for (const relativePath of stubFiles) {
    const filePath = path.join(vabsRoot, relativePath);
    if (!existsSync(filePath)) {
      problems.push({
        relativePath: path.relative(repoRoot, filePath),
        message: "Project-specific renderer stub file is missing"
      });
    }
  }

  return problems;
}
