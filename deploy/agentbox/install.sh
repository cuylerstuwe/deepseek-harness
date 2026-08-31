#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -P -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -P -- "$script_dir/../.." && pwd)
dsh_home=${DSH_HOME:-$HOME/.dsh}
bin_dir=${DSH_AGENTBOX_BIN_DIR:-$HOME/.local/bin}

if ! command -v node >/dev/null 2>&1; then
  echo 'agentbox install: Node.js is required (^22.19.0 or >=24.0.0)' >&2
  exit 1
fi
node -e 'const major=Number(process.versions.node.split(".")[0]); const [a,b]=process.versions.node.split(".").map(Number); if (!((a===22&&b>=19)||major>=24)) process.exit(1)' || {
  echo "agentbox install: unsupported Node.js $(node --version); use ^22.19.0 or >=24.0.0" >&2
  exit 1
}
if ! command -v corepack >/dev/null 2>&1; then
  echo 'agentbox install: corepack is required to run the pinned pnpm version' >&2
  exit 1
fi

if [ "${DSH_AGENTBOX_SKIP_BUILD:-0}" != 1 ]; then
  (cd "$repo_root" && corepack pnpm install --frozen-lockfile)
  (cd "$repo_root" && corepack pnpm run build)
fi

mkdir -p "$dsh_home" "$bin_dir"
chmod 700 "$dsh_home"

policy_target=$dsh_home/cordis.patch.yml
if [ ! -e "$policy_target" ] && [ ! -L "$policy_target" ]; then
  ln -s "$script_dir/cordis.patch.yml" "$policy_target"
elif [ -L "$policy_target" ] && [ "$(readlink "$policy_target")" = "$script_dir/cordis.patch.yml" ]; then
  :
else
  echo "agentbox install: preserving existing $policy_target; merge or replace it with $script_dir/cordis.patch.yml" >&2
fi

settings_target=$dsh_home/settings.yaml
if [ ! -e "$settings_target" ] || [ "${DSH_AGENTBOX_FORCE_CONFIG:-0}" = 1 ]; then
  force_flag=
  [ "${DSH_AGENTBOX_FORCE_CONFIG:-0}" = 1 ] && force_flag=--force
  DSH_HOME=$dsh_home node "$script_dir/configure.mjs" $force_flag
else
  echo "agentbox install: preserving existing $settings_target"
fi

install_link() {
  source=$1
  target=$2
  if [ ! -e "$target" ] && [ ! -L "$target" ]; then
    ln -s "$source" "$target"
  elif [ -L "$target" ] && [ "$(readlink "$target")" = "$source" ]; then
    :
  else
    echo "agentbox install: preserving existing $target; add $script_dir/bin before it on PATH to use the fork wrapper" >&2
  fi
}

install_link "$script_dir/bin/dsh" "$bin_dir/dsh"
if [ "${DSH_AGENTBOX_INSTALL_NPX_WRAPPER:-1}" = 1 ]; then
  install_link "$script_dir/bin/npx" "$bin_dir/npx"
fi

DSH_HOME=$dsh_home node "$script_dir/verify.mjs"
printf '\nAgentbox installation is ready. Ensure %s appears before other executable directories on PATH.\n' "$bin_dir"
printf 'Launch with: dsh web --host 0.0.0.0\n'
