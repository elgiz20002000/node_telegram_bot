#!/usr/bin/env bash
# Starts Docker Desktop (macOS) if it isn't running, waits for the daemon,
# then brings up the local Postgres and Redis containers. Run automatically
# before `npm start` / `npm run start:dev` / `npm run migrate` via npm's
# pre* hooks.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if ! docker info >/dev/null 2>&1; then
    echo "Docker daemon not running — starting Docker Desktop..."
    open -a Docker
    until docker info >/dev/null 2>&1; do
        sleep 1
    done
fi

docker compose up -d postgres redis

echo "Waiting for Postgres to accept connections..."
until docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; do
    sleep 1
done

echo "Waiting for Redis to accept connections..."
until docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
    sleep 1
done
