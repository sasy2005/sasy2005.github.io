#!/usr/bin/env bash
# Runs tests/index.html in headless Chrome and prints the results.
# Needs the dev server (scripts/serve.ps1, port 8765) running; starts it if not.
# Exit 0 only if all tests pass.
set -u
cd "$(dirname "$0")/.."
PORT=${PORT:-8765}
URL="http://localhost:$PORT/tests/"
if ! curl -s -o /dev/null "$URL"; then
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/serve.ps1 -Port "$PORT" >/dev/null 2>&1 &
  for _ in $(seq 1 30); do curl -s -o /dev/null "$URL" && break; sleep 0.3; done
fi
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
PROFILE="$(mktemp -d)"
out=$("$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$PROFILE" \
  --virtual-time-budget=8000 --dump-dom "$URL" 2>/dev/null | tr '\n' '\001')
rm -rf "$PROFILE"
report=${out#*<pre id=\"report\"}
report=${report#*>}
report=${report%%</pre>*}
printf '%s\n' "$report" | tr '\001' '\n' | sed 's/&gt;/>/g;s/&lt;/</g;s/&amp;/\&/g'
case "$out" in
  *'data-result="PASS"'*) exit 0 ;;
  *'<pre id="report"'*) exit 1 ;;
  *) echo "no report found"; exit 2 ;;
esac
