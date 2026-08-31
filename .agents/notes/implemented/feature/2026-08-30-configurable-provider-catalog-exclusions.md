# Agent Note: Configurable provider catalogs support exclusions

Status: implemented

English | [中文](2026-08-30-configurable-provider-catalog-exclusions.zh.md)

## Problem

`dsh-llm-pi-ai` advertised every provider in pi-ai's installed catalog as an addable route. Deployments with an intentional provider policy could disable a dedicated adapter, yet still show that provider through the generic catalog and invite configuration that the deployment did not want.

## Decision

The plugin accepts `excludedCatalogProviders`, a list of installed provider ids omitted from the dormant configurable-provider directory and the authorization flows registered at mount. The directory filter is part of the settings-backed configuration and updates in place. An explicitly configured profile with the same route remains in the directory and continues to serve, so adopting the filter cannot hide an existing route from its management surface.

## Alternatives considered

**Filter provider names in the Web client.** Rejected. Other configuration surfaces would still advertise the route, and policy would live in presentation code instead of the adapter that owns the directory.

**Refuse every profile whose route appears in the list.** Rejected. A visibility policy should not silently disable an already-configured route or make it impossible to inspect and remove.

**Remove providers from pi-ai's installed catalog.** Rejected. The catalog is an upstream dependency shared by model resolution; mutating it would couple deployment policy to dependency internals.

## Consequences

Deployments can narrow the generic Add provider catalog without forking the UI or losing local, hand-declared routes. The default remains the full installed catalog. Exclusions do not block an operator or settings writer from explicitly declaring the route; a stricter request-routing denylist would be a separate policy.
