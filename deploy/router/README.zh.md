# Pi 路由器配置

[English](README.md) | 中文

此部署辅助程序将活动 Pi 的 `home-router` 模型目录复制到私有 Harness 主目录。它替换旧推理路由，保留无关设置，设置 Pi 的路由器默认模型，并更新子代理允许列表。路由器凭据保留在私有 `.credentials.yaml` 中；受版本控制的文件不包含端点或密钥。

## 同步

在 Pi 启动器中找到活动的 `PI_CODING_AGENT_DIR`。先使用该路径预览，再添加 `--write` 应用更改：

```sh
node deploy/router/configure.mjs --pi-home /path/to/pi/agent
node deploy/router/configure.mjs --pi-home /path/to/pi/agent --write
```

使用 `--dsh-home /path/to/dsh` 指定其他 Harness 主目录。配置会在启动前写入每个配置档的 `cordis.patch.yml`。旧版 `settings.yaml` 会迁移至备份，避免延迟导入覆盖配置档。写入会在该目录的 `backups` 子目录中保留私有备份。升级代码后，请重新启动旧 Harness 进程。更改 Pi 目录后重新运行同步；这是显式复制，不是后台监视器。辅助程序要求 Pi 为 `home-router` 存储字面值 `api_key` 记录，且绝不执行凭据命令。

## 请求行为

模型标识、上下文和输出上限、模态、支持的推理级别及采样默认值均跟随 Pi。Pi 的 `reasoning_effort` 格式映射到 Harness 的 `openai` 名称。不受支持的语法和会话亲和性标志仅在为 false 时才能省略。Alaska 使用路由器原生推理行为；不复制 Pi 的回答预留扩展。

请求以 foreground 优先级使用路由器。Harness 未安装 Pi 的交互式后台切换功能。路由器和推理运行时不会被修改。Harness 要求有限的流监视超时，因此此配置允许 24 小时空闲等待，而非 Pi 的禁用监视超时。模型列表与后端可用性无关；离线路由仍然可选。

策略禁用 DeepSeek 模型和账户适配器、托管搜索及遥测。各预设的网页搜索工具继承禁用设置。现有抓取偏好保持不变。

## 验证

运行不需要推理后端的可移植转换检查：

```sh
node --test deploy/router/from-pi.test.mjs
pnpm exec vitest run packages/llm/llm-pi-ai/tests/catalog.spec.ts
```
