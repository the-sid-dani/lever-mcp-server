#!/usr/bin/env bash
#
# run.sh -- boot the local Lever MCP dev server, then run the agent-eval live.
#
# This is what `npm run eval:agent` invokes. It:
#   1. sources ~/.second-brain-os.env (LEVER_API_KEY + LEVER_DEFAULT_USER_ID)
#   2. boots `PORT=8095 OAUTH_ENABLED=false npm run dev` in the background
#   3. polls http://localhost:8095/health until ready (timeout ~30s)
#   4. runs MCP_URL=.../mcp EVAL_LIVE=1 npx tsx evals/agent/run.ts
#   5. on exit (trap) kills the dev server
#
# Requires the already-logged-in `claude` CLI (no ANTHROPIC_API_KEY needed).
# Read-only golden tasks by default; set EVAL_WRITES=1 to include write ops.
#
# ASCII only. No emojis.

set -euo pipefail

PORT="${PORT:-8095}"
HEALTH_URL="http://localhost:${PORT}/health"
MCP_URL="${MCP_URL:-http://localhost:${PORT}/mcp}"
ENV_FILE="${ENV_FILE:-$HOME/.second-brain-os.env}"

echo "[eval:agent] sourcing ${ENV_FILE}"
if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
else
  echo "[eval:agent] WARN: ${ENV_FILE} not found; relying on existing env"
fi

DEV_PID=""
cleanup() {
  if [ -n "${DEV_PID}" ] && kill -0 "${DEV_PID}" 2>/dev/null; then
    echo "[eval:agent] stopping dev server (pid ${DEV_PID})"
    kill "${DEV_PID}" 2>/dev/null || true
    wait "${DEV_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "[eval:agent] booting dev server on port ${PORT} (OAUTH_ENABLED=false)"
PORT="${PORT}" OAUTH_ENABLED=false npm run dev >/tmp/lever-eval-dev.log 2>&1 &
DEV_PID=$!

echo "[eval:agent] waiting for ${HEALTH_URL} (timeout 30s)"
READY=0
for i in $(seq 1 30); do
  if curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
    READY=1
    echo "[eval:agent] server ready after ${i}s"
    break
  fi
  if ! kill -0 "${DEV_PID}" 2>/dev/null; then
    echo "[eval:agent] ERROR: dev server exited early; tail of log:"
    tail -n 40 /tmp/lever-eval-dev.log || true
    exit 1
  fi
  sleep 1
done

if [ "${READY}" -ne 1 ]; then
  echo "[eval:agent] ERROR: server did not become healthy within 30s"
  tail -n 40 /tmp/lever-eval-dev.log || true
  exit 1
fi

echo "[eval:agent] running agent eval against ${MCP_URL}"
MCP_URL="${MCP_URL}" EVAL_LIVE=1 npx tsx evals/agent/run.ts
EVAL_EXIT=$?

echo "[eval:agent] done (exit ${EVAL_EXIT})"
exit "${EVAL_EXIT}"
