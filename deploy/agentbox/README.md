# Agentbox source deployment

English | [中文](README.zh.md)

This directory installs the fork from its checkout into a Linux Agentbox container. It produces the normal minified production build, keeps runtime state under an explicit `DSH_HOME`, exposes repository-relative `dsh` and `npx` wrappers, and applies a local-model-only policy that disables DeepSeek-hosted model, search, and telemetry services.

## Install

The container needs Git, Node.js `^22.19.0` or `>=24.0.0`, Corepack, and network access for the frozen pnpm install. Clone the fork inside the container or bind-mount a host clone, then export the three endpoint variables and the q27 credential shown in [`agentbox.env.example`](agentbox.env.example).

Run the installer from the checkout:

```sh
corepack enable
./deploy/agentbox/install.sh
```

The installer runs `pnpm install --frozen-lockfile` and `pnpm run build`, renders `$DSH_HOME/settings.yaml` with mode `0600`, links the local-only policy into `$DSH_HOME/cordis.patch.yml`, and links the wrappers into `${DSH_AGENTBOX_BIN_DIR:-$HOME/.local/bin}` when those names are free. It preserves existing configuration and wrapper files; set `DSH_AGENTBOX_FORCE_CONFIG=1` only when replacing the generated settings is intentional.

Persist `$DSH_HOME` as an Agentbox volume. Keep the checkout available at the same container path because the policy and executable wrappers intentionally link back to it.

## Launch and verify

Put the installed bin directory before npm's bin directory on `PATH`, then launch the browser service on the container interface:

```sh
export PATH="$HOME/.local/bin:$PATH"
dsh web --host 0.0.0.0
```

The wrapper makes `npx @deepseek-ai/dsh web --host 0.0.0.0` and its `--yes` form launch the same built checkout. Other `npx` commands are delegated to the next `npx` on `PATH`; set `DSH_REAL_NPX` when automatic discovery is unsuitable.

Run the deterministic local verification after configuration or an update:

```sh
pnpm run agentbox:verify
```

When all three inference services are intentionally available, verify their `/models` routes too:

```sh
pnpm run agentbox:verify -- --network
```

## Container networking

Every base URL must work from the Linux container. Container loopback refers to Agentbox itself, so use `host.docker.internal` for a service on the work-Mac host or use a reachable LAN/Tailscale address for another machine. Docker Desktop may route Tailscale traffic while failing to resolve MagicDNS names; test names inside the container and use a stable tailnet IP only when DNS cannot be repaired.

The MTPLX endpoint is a session-scoped service on the personal M5 and may disappear when that laptop sleeps, moves, or stops its model. The q27 and GX10 routes expose inference only; do not mount broader home credentials, personal files, browser state, or fleet-administration access into Agentbox.

## Updating

Pull a reviewed commit, rerun `./deploy/agentbox/install.sh`, and run the verification command. Existing settings remain in place unless forced, while the linked policy and wrappers follow the updated checkout automatically.
