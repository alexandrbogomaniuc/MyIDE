# Architecture Scope

## Product Architecture
MyIDE is a universal local-first IDE for multiple game projects over time.

Each project in the workspace can represent:
- its own donor game and source evidence
- its own internal clean model
- its own target or resulting game
- its own runtime or integration path
- its own status and verification history

One project equals one donor-to-release cycle:
- donor investigation
- evidence
- internal clean model
- adjustments and improvements
- target/resulting game
- verification
- release preparation

## Current Implementation Slice
The current implementation remains controlled and slot-first.

Validated today:
- `donor_001_mystery_garden`
- single-user behavior
- internal-only replay loading from `40_projects/project_001`

Not implemented yet:
- non-slot game families
- multi-user collaboration
- production server adapter behavior
- full editor platform behavior

## Workspace Standard
- Projects are expected to live under `40_projects/<project_slug>/`.
- A valid project folder should contain `project.meta.json` plus the project-local lifecycle folders documented in `00_control/PROJECT_LIFECYCLE.md`.
- Workspace indexes may be generated from discovered folders, but the folders themselves are the canonical source of project existence.

## Relationship Terms
- `donor` means the source game, public evidence, and any read-only capture material.
- `internal model` means the editable MyIDE source of truth for a project.
- `target/resulting game` means the game MyIDE is preparing, reskinning, or integrating toward for that project.
- `project` means the unit MyIDE tracks across donor evidence, internal model, target game, runtime path, and verification history.
- `workspace` means the collection of projects managed by the IDE.

## Public-Safe Rule
- Public git may describe the architecture broadly.
- Public git must not imply unimplemented non-slot families, production adapters, or hidden donor artifacts are already available.

## Validation Rule
- A project is only considered validated when its current donor slice, internal model, replay path, and verification history are all evidence-backed and reproducible.
