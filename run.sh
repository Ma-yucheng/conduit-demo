#!/usr/bin/env bash
# run.sh — Conduit 前后端一键启停
# 用法: ./run.sh start|stop|restart|status|logs
set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP="$ROOT/conduit"
RUN="$APP/.run"
mkdir -p "$RUN"

API_PORT=8000
WEB_PORT=3000

port_pid() { lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -1; }

start_api() {
  if [[ -n "$(port_pid $API_PORT)" ]]; then
    echo "后端已在运行 (pid $(port_pid $API_PORT))"
    return
  fi
  ( cd "$APP/backend" && nohup .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port $API_PORT \
      > "$RUN/api.log" 2>&1 & echo $! > "$RUN/api.pid" )
  echo "后端启动中 → http://127.0.0.1:$API_PORT/docs"
}

start_web() {
  if [[ -n "$(port_pid $WEB_PORT)" ]]; then
    echo "前端已在运行 (pid $(port_pid $WEB_PORT))"
    return
  fi
  ( cd "$APP/frontend" && nohup pnpm dev > "$RUN/web.log" 2>&1 & echo $! > "$RUN/web.pid" )
  echo "前端启动中 → http://localhost:$WEB_PORT"
}

wait_ready() {
  for _ in $(seq 1 40); do
    if curl -sf "http://127.0.0.1:$API_PORT/api/health" >/dev/null 2>&1; then break; fi
    sleep 0.5
  done
  for _ in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:$WEB_PORT" >/dev/null 2>&1; then break; fi
    sleep 0.5
  done
}

stop_all() {
  for port in $WEB_PORT $API_PORT; do
    local pid; pid="$(port_pid $port)"
    if [[ -n "$pid" ]]; then
      kill "$pid" 2>/dev/null && echo "已停止端口 $port (pid $pid)"
    else
      echo "端口 $port 无服务"
    fi
  done
  rm -f "$RUN"/*.pid
}

status() {
  if curl -sf "http://127.0.0.1:$API_PORT/api/health" >/dev/null 2>&1; then
    echo "✓ 后端 http://127.0.0.1:$API_PORT  正常"
  else
    echo "✗ 后端未运行"
  fi
  if curl -sf -o /dev/null "http://127.0.0.1:$WEB_PORT"; then
    echo "✓ 前端 http://localhost:$WEB_PORT  正常"
  else
    echo "✗ 前端未运行"
  fi
}

case "${1:-status}" in
  start)
    start_api; start_web; wait_ready; status
    ;;
  stop)    stop_all ;;
  restart) stop_all; sleep 1; start_api; start_web; wait_ready; status ;;
  status)  status ;;
  logs)    tail -n 40 "$RUN/api.log" "$RUN/web.log" 2>/dev/null ;;
  *)
    echo "用法: $0 start|stop|restart|status|logs"; exit 2 ;;
esac
