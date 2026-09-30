#!/usr/bin/env bash
# Dispatch a cloud export with the platform preset from templates/templates.json.
#   tools/export.sh <composition> [template] [full|range START END [splice BASE_RUN_ID]]
set -euo pipefail
cd "$(dirname "$0")/.."
COMP="${1:?composition id}"; TPL="${2:-youtube-16x9}"; MODE="${3:-full}"
CRF=$(node -e "console.log(require('./templates/templates.json')['$TPL'].export.crf)")
ARGS=(-f "composition=$COMP" -f "mode=$MODE" -f "crf=$CRF" -f remotion_version=latest)
if [ "$MODE" = "range" ]; then ARGS+=(-f "start_frame=${4:?start}" -f "end_frame=${5:?end}"); [ "${6:-}" = "splice" ] && ARGS+=(-f splice=true -f "base_run_id=${7:?base run id}"); fi
export PATH="$HOME/.local/bin:$PATH"
gh workflow run render.yml "${ARGS[@]}"
echo "dispatched: $COMP  template=$TPL  crf=$CRF  mode=$MODE"
