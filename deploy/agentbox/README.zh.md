# Agentbox 源码部署

[English](README.md) | 中文

本目录用于把该分支的检出目录安装到 Linux Agentbox 容器中。它生成正常的压缩生产构建，把运行时状态保存在显式的 `DSH_HOME` 下，提供相对于仓库的 `dsh` 与 `npx` 包装器，并应用仅使用本地模型的策略，以禁用 DeepSeek 托管的模型、搜索和遥测服务。

## 安装

容器需要 Git、Node.js `^22.19.0` 或 `>=24.0.0`、Corepack，以及用于冻结 pnpm 安装的网络访问。在容器内克隆该分支，或挂载主机上的检出目录，然后导出 [`agentbox.env.example`](agentbox.env.example) 中所列的三个端点变量和 q27 凭据。

从检出目录运行安装器：

```sh
corepack enable
./deploy/agentbox/install.sh
```

安装器运行 `pnpm install --frozen-lockfile` 和 `pnpm run build`，以 `0600` 模式渲染 `$DSH_HOME/settings.yaml`，把仅使用本地模型的策略链接到 `$DSH_HOME/cordis.patch.yml`，并在对应名称空闲时把包装器链接到 `${DSH_AGENTBOX_BIN_DIR:-$HOME/.local/bin}`。它保留已有配置和包装器文件；只有在有意替换生成的设置时才设置 `DSH_AGENTBOX_FORCE_CONFIG=1`。

把 `$DSH_HOME` 作为 Agentbox 卷持久化。检出目录必须继续位于相同的容器路径，因为策略和可执行包装器会有意链接回该目录。

## 启动与验证

把安装的 bin 目录放在 npm 的 bin 目录之前，然后在容器接口上启动浏览器服务：

```sh
export PATH="$HOME/.local/bin:$PATH"
dsh web --host 0.0.0.0
```

该包装器使 `npx @deepseek-ai/dsh web --host 0.0.0.0` 及其 `--yes` 形式启动同一个检出目录中的构建。其他 `npx` 命令会转交给 `PATH` 中下一个 `npx`；自动发现不适用时可设置 `DSH_REAL_NPX`。

在配置或更新后运行确定性的本地验证：

```sh
pnpm run agentbox:verify
```

当三个推理服务都被有意启用时，也验证它们的 `/models` 路由：

```sh
pnpm run agentbox:verify -- --network
```

## 容器网络

每个 base URL 都必须能从 Linux 容器访问。容器回环地址指向 Agentbox 本身，因此工作 Mac 主机上的服务应使用 `host.docker.internal`，其他机器上的服务应使用可访问的局域网或 Tailscale 地址。Docker Desktop 可能可以路由 Tailscale 流量却无法解析 MagicDNS 名称；应在容器内测试名称，且只有在无法修复 DNS 时才使用稳定的 tailnet IP。

MTPLX 端点是个人 M5 上的会话级服务，可能会在该笔记本睡眠、移动或停止模型时消失。q27 和 GX10 路由只暴露推理；不要把更广泛的家庭凭据、个人文件、浏览器状态或设备管理权限挂载到 Agentbox 中。

## 更新

拉取经过审查的提交，重新运行 `./deploy/agentbox/install.sh`，然后运行验证命令。除非强制替换，否则已有设置会被保留；链接的策略和包装器会自动跟随更新后的检出目录。
