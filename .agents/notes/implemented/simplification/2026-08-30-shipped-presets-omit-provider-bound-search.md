# Agent Note: Shipped presets omit provider-bound search

Status: implemented

English | [中文](2026-08-30-shipped-presets-omit-provider-bound-search.zh.md)

## Problem

The shipped `standard`, `ptc`, and `cordis` presets registered `web_search` whenever they registered `web_fetch`. A deployment that intentionally mounted no usable search provider still advertised the search tool to the model, so a reasonable research attempt spent a tool call only to discover a missing credential or provider.

## Decision

The three tool-bearing shipped presets configure `dsh-tool-web` with `search: false` and `fetch: true`. They retain generic public-page retrieval without advertising provider-bound discovery. Search remains available to deployments that supply a provider and author a preset that enables it.

## Alternatives considered

**Leave `web_search` visible and let the provider fail.** Rejected. Provider failure is useful for a misconfigured capability, but these deployments intentionally have no search capability; advertising one creates model-visible work with no successful path.

**Remove `dsh-tool-web` from the presets.** Rejected. `web_fetch` is provider-neutral and useful when the user or another source already supplies a URL.

**Replace DeepSeek search with another remote provider.** Rejected. Choosing an external search account is a deployment decision, not a requirement for every shipped preset.

## Consequences

Fresh sessions using the shipped tool-bearing presets receive `web_fetch` but no `web_search` schema or search guidance. They cannot discover URLs through a built-in search call unless their deployment supplies a custom preset. `shipped-root.spec.ts` reads each shipped composition and pins both halves of that policy.
