# Workspace Helpers

This folder contains workspace-level utilities for adding and shaping projects.

## Current Scope
- `createProject.ts` generates a new project folder scaffold from template metadata.
- `createProject.ts` also supports a shell-safe form input path for creating a project directly from the IDE.
- The helper keeps donor evidence, internal model, runtime, fixtures, and release folders separate.
- The helper does not invent donor evidence or runtime support.

## Usage
Run the helper through the package script with a template metadata file and a target project root:

```bash
npm run create:project -- --config 40_projects/templates/project-template/project.meta.json.example --project-root 40_projects/project_003
```

Inside the shell, use the **New Project** panel to create the same scaffold with:
- display name
- slug
- game family
- donor reference or ID
- target/resulting game display name
- notes

## Rules
- Do not overwrite existing project folders without an explicit `--overwrite` flag.
- Keep planned projects clearly marked as unvalidated.
- Keep the generated scaffold public-safe and evidence-honest.
- New shell-created projects use slug-based folder names and slug-derived `projectId` values.
