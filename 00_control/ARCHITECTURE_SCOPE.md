# Architecture Scope

## Product Architecture
MyIDE is a universal local-first IDE for multiple game projects over time.

Each project in the workspace can represent:
- its own donor game and source evidence
- its own internal clean model
- its own target or resulting game
- its own runtime or integration path
- its own status and verification history

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
