# Agent Note: Shipped presets omit provider-bound search

Status: implemented

[English](2026-08-30-shipped-presets-omit-provider-bound-search.md) | 中文

## Problem

随附的 `standard`、`ptc` 与 `cordis` preset 在注册 `web_fetch` 时也会注册 `web_search`。有些部署会有意不挂载可用的搜索提供方，但模型仍会看到搜索工具，因此一次合理的检索尝试只能在耗费工具调用后才发现凭据或提供方缺失。

## Decision

三个随附且带工具的 preset 将 `dsh-tool-web` 配置为 `search: false` 与 `fetch: true`。它们保留通用的公共网页读取能力，但不再宣告依赖提供方的发现能力。搜索仍可由自行提供搜索提供方并创作启用搜索 preset 的部署使用。

## Alternatives considered

**保留可见的 `web_search`，让提供方在调用时失败。** 拒绝。提供方失败适合揭示配置错误，但这些部署本来就有意不提供搜索能力；宣告一个没有成功路径的能力只会制造模型可见的无效工作。

**从 preset 中完全移除 `dsh-tool-web`。** 拒绝。`web_fetch` 与提供方无关，并且在用户或其他来源已经提供 URL 时仍然有用。

**改用另一个远程搜索提供方。** 拒绝。选择外部搜索账户是部署决策，不应成为每个随附 preset 的要求。

## Consequences

使用这些随附工具 preset 的新会话会获得 `web_fetch`，但不会获得 `web_search` schema 或搜索指引。除非部署提供自定义 preset，否则会话无法通过内置搜索调用发现 URL。`shipped-root.spec.ts` 会读取每份随附组装并钉住该策略的两个配置值。
