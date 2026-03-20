# Subagent Workflow

## Purpose
Use subagents only when a run splits cleanly into parallel streams.

## Suggested Roles
- `workspace_architect`: public positioning, terminology, and scope docs.
- `schema_registry_builder`: workspace/project registry schemas and metadata model.
- `shell_project_browser_builder`: workspace/project list UI in the shell.
- `verification_guard`: registry validation and regression checks.
- `repo_guard`: public-safety review, commit, and push reporting.

## Coordination Rules
- Each subagent should own a narrow file set.
- No subagent should assume non-slot support, multi-user support, or production adapter behavior unless the task explicitly says so.
- Shared terms must stay consistent across docs, schemas, shell UI, and validation.
- Public-safe repo policy always wins over convenience.

## Reporting Rules
- Report which subagents were used and what each produced.
- If a recommended subagent was skipped, state why.
- Report assumptions separately from proven facts.

## Current Use
- Use subagents whenever the run splits into clean parallel streams and the environment supports them.
- Final integration, verification, and publication still remain the main agent's responsibility.
