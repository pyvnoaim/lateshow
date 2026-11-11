#!/bin/sh
# Runs on the VPS after `git pull` (the forced command of CI's deploy key, see README).
# Builds the new image, restarts, waits for /api/health. Unhealthy: puts the previous image back.
set -eu
cd "$(dirname "$0")/.."

docker image inspect lateshow:latest >/dev/null 2>&1 && docker tag lateshow:latest lateshow:previous
docker compose build --pull --quiet
docker compose up -d

for _ in $(seq 40); do
  if [ "$(docker inspect -f '{{.State.Health.Status}}' lateshow)" = healthy ]; then
    echo "deployed $(git rev-parse --short HEAD)"
    # only this project's leftovers, the VPS runs other apps too
    docker image prune -f --filter label=com.docker.compose.project=lateshow >/dev/null
    exit 0
  fi
  sleep 3
done

echo "not healthy after 2 minutes, rolling back" >&2
docker compose logs --tail 60 lateshow >&2
# ponytail: migrations already ran on the new version. Fine while they only add things, rethink if one ever drops data.
docker tag lateshow:previous lateshow:latest
docker compose up -d --no-build
exit 1
