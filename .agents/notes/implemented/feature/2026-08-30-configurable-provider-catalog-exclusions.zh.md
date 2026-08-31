# Agent Note: Configurable provider catalogs support exclusions

Status: implemented

[English](2026-08-30-configurable-provider-catalog-exclusions.md) | 中文

## Problem

`dsh-llm-pi-ai` 会把 pi-ai 已安装目录中的每个提供方都宣告为可添加路由。具有明确提供方策略的部署即使禁用了专用适配器，仍会通过通用目录显示该提供方，并诱导用户配置部署本来不希望使用的服务。

## Decision

插件接受 `excludedCatalogProviders`，其中列出的已安装提供方 id 会从休眠的可配置提供方目录以及挂载时注册的授权流程中移除。目录过滤器属于 settings 支持的配置，并会原地更新。具有同名路由的已明确配置 profile 仍保留在目录中并继续服务，因此采用过滤器不会让现有路由从管理界面消失。

## Alternatives considered

**在 Web 客户端中过滤提供方名称。** 拒绝。其他配置界面仍会宣告该路由，而且策略会落入展示代码，而不是拥有目录的适配器。

**拒绝列表中路由的所有 profile。** 拒绝。可见性策略不应静默停用已配置路由，也不应导致其无法查看和移除。

**从 pi-ai 的已安装目录中移除提供方。** 拒绝。该目录是模型解析共享的上游依赖；修改它会把部署策略耦合到依赖内部。

## Consequences

部署可以收窄通用的新增提供方目录，无需派生 UI，也不会丢失本地手工声明路由。默认值仍是完整的已安装目录。排除项不会阻止操作员或 settings 写入者明确声明同名路由；更严格的请求路由拒绝列表应作为独立策略。
