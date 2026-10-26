#!/usr/bin/env bash
set -euo pipefail

# The merge runner invokes this script with bash and closed stdin.
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Install exactly the reviewed workspace dependencies without prompting.
CI=true pnpm install --frozen-lockfile --prefer-offline

# Refresh generated client assets; no provider calls or data migrations.
pnpm build
