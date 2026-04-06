#!/bin/bash
set -e
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")"

CMD=${1:-help}

case "$CMD" in
  start)
    echo "Starting bot..."
    docker compose up --build -d
    echo "Done. Logs: ./bot.sh logs"
    ;;
  stop)
    echo "Stopping bot..."
    docker compose down
    ;;
  restart)
    echo "Restarting bot..."
    docker compose down
    docker compose up --build -d
    ;;
  logs)
    docker logs -f tg-claude-bot-bot-1
    ;;
  status)
    docker compose ps
    ;;
  *)
    echo "Usage: ./bot.sh [start|stop|restart|logs|status]"
    echo ""
    echo "  start   — build and start the bot"
    echo "  stop    — stop the bot"
    echo "  restart — rebuild and restart"
    echo "  logs    — tail live logs"
    echo "  status  — show container status"
    ;;
esac
