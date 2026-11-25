#!/usr/bin/env bash
set -euo pipefail

site_directory=$1
test -s "$site_directory/index.html"
revision=$(git rev-parse HEAD)
branch=refs/heads/vps-build
release=$(mktemp -d)
tree="$release/tree"
trap 'git worktree remove --force "$tree" 2>/dev/null || true' EXIT

tar --create --gzip --file "$release/site.tar.gz" -C "$site_directory" .
digest=$(sha256sum "$release/site.tar.gz" | cut -d ' ' -f 1)
jq -n --arg revision "$revision" --arg sha256 "$digest" \
  '{revision: $revision, sha256: $sha256}' > "$release/manifest.json"

if git ls-remote --exit-code origin "$branch" >/dev/null; then
  git fetch --depth 1 origin "$branch"
  git worktree add --detach "$tree" FETCH_HEAD
else
  status=$?
  if [[ $status != 2 ]]; then exit "$status"; fi
  git worktree add --orphan -b vps-build "$tree"
fi

cp "$release/manifest.json" "$release/site.tar.gz" "$tree/"
git -C "$tree" add manifest.json site.tar.gz
if git -C "$tree" diff --cached --quiet; then exit 0; fi
git -C "$tree" -c user.name='github-actions[bot]' \
  -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
  commit -m "Publish static site from $revision"
git -C "$tree" push origin "HEAD:$branch"
