# Project 001 Logs

## Purpose
- Reserved for local replay logs, checkpoints, save history, and later scenario traces.

## Current State
- Save snapshots are written under `editor-snapshots/` and treated as local-only safety copies.
- Save history is appended to `editor-save-history.jsonl` and is also local-only.
- The preview still uses in-memory event logging for runtime actions; the on-disk history is for persistence safety.
