# Agent Note: Agentbox source deployment

Status: implemented

English | [中文](2026-08-30-agentbox-source-deployment.zh.md)

## Problem

A source-built Harness deployment in a persistent Linux agent container needs reproducible build, configuration, launch, and verification behavior without checking private endpoint addresses or credentials into the fork. Machine-local files under one developer's home directory cannot provide that behavior to another checkout.

## Decision

`deploy/agentbox` owns the container deployment kit. Its installer runs the pinned production build, renders the three local model routes from environment values, links the local-model-only Cordis policy into the Harness home, installs repository-relative launch wrappers, and verifies the built CLI plus the composed policy. The optional `npx` wrapper intercepts direct `@deepseek-ai/dsh` invocations and delegates every other package to the underlying npm executable.

Private addresses and credentials stay outside tracked files. The checked-in environment example contains placeholders, while each operator supplies deployment values through the container environment and persists only `$DSH_HOME` as runtime state.

## Alternatives considered

**Commit one complete `settings.yaml`.** This would make setup shorter but would publish private topology and encourage credentials or host-specific loopback addresses to enter source control.

**Copy the developer's home directory into the container.** The copy would mix configuration with browser credentials, session history, generated profiles, caches, and host-specific symlinks.

**Install the registry package and patch it after download.** Community commands could silently execute upstream code instead of the fork, and a reinstall could discard the deployment policy.

## Consequences

One reviewed checkout carries every non-secret decision needed for the container, and the same verification command detects a missing build, incomplete model catalog, or re-enabled DeepSeek service. The checkout path must remain available to linked wrappers and policy, endpoint values must be reachable from the container network, and operators must deliberately transfer the q27 credential and persist Harness state.
