# Pi router configuration

English | [中文](README.zh.md)

This deployment helper copies the active Pi `home-router` model catalog into a private Harness home. It replaces the old inference routes, preserves unrelated settings, sets Pi's router default model, and updates the subagent allowlist. Router credentials stay in the private `.credentials.yaml`; tracked files contain no endpoint or secret.

## Synchronize

Find the active `PI_CODING_AGENT_DIR` in the Pi launcher. Preview with its path, then add `--write` to apply:

```sh
node deploy/router/configure.mjs --pi-home /path/to/pi/agent
node deploy/router/configure.mjs --pi-home /path/to/pi/agent --write
```

Use `--dsh-home /path/to/dsh` for another Harness home. Configuration is written to each profile's `cordis.patch.yml` before startup. Legacy `settings.yaml` is migrated and moved into the backup to avoid a delayed import overriding the profile. Writes preserve private backups under that home's `backups` directory. Restart an older Harness process after upgrading its code. Rerun synchronization after changing Pi's catalog; this is an explicit copy, not a background watcher. The helper requires Pi's literal `api_key` record for `home-router` and never runs credential commands.

## Request behavior

Model ids, context/output limits, modalities, supported reasoning levels, and sampling defaults follow Pi. Pi's `reasoning_effort` format maps to Harness's `openai` spelling. Unsupported grammar/session-affinity flags may be omitted only when false. Alaska uses the router's native reasoning behavior; Pi's answer-headroom extension is not copied.

Requests use the router with foreground priority. Pi's interactive background toggle is not installed in Harness. The router and inference runtimes are not modified. Harness requires a finite stream watchdog, so this profile permits 24 hours of idle waiting instead of Pi's disabled watchdog. Model listing is independent of backend availability; an offline route remains selectable.

The policy disables DeepSeek model/account adapters, hosted search, and telemetry. Per-preset web-search tools inherit the disabled setting. Existing fetch preferences remain intact.

## Verification

Run the portable conversion checks without an inference backend:

```sh
node --test deploy/router/from-pi.test.mjs
pnpm exec vitest run packages/llm/llm-pi-ai/tests/catalog.spec.ts
```
