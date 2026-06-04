#!/usr/bin/env bash
# 앱을 웹으로 빌드 → 로컬 서버 → headless Chrome 스샷. 결과: /tmp/pilai-*.png
# bash로 실행(zsh noclobber 회피). 사용: npm run shots  (app/ 에서)
set -e
cd "$(dirname "$0")/.."  # app/
PORT="${PORT:-8799}"

echo "▶ 웹 빌드..."
npx expo export --platform web >/tmp/pilai-webexport.log 2>&1 || { echo "빌드 실패"; tail -20 /tmp/pilai-webexport.log; exit 1; }

echo "▶ 서버 (:$PORT)..."
python3 -m http.server "$PORT" --directory dist >/tmp/pilai-serve.log 2>&1 &
SV=$!
trap 'kill $SV 2>/dev/null; rm -rf dist' EXIT
curl -s --retry 25 --retry-connrefused --retry-delay 1 -o /dev/null "http://localhost:$PORT"

echo "▶ 스샷..."
PORT="$PORT" node qa/shot.mjs

echo "✅ /tmp/pilai-generate.png /tmp/pilai-catalog.png /tmp/pilai-history.png /tmp/pilai-memberform.png"
# dist는 .env 키가 번들되므로 trap에서 삭제됨
