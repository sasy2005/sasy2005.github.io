#!/usr/bin/env bash
# Copies the Firebase auth helper onto this site, so Google sign-in runs on the same domain
# (needed for the installed iPhone app). Usage: bash scripts/auth-helper.sh <firebase-project-id>
set -euo pipefail
cd "$(dirname "$0")/.."
P=${1:?firebase project id}
TMPD=$(mktemp -d)
mkdir -p __/auth __/firebase
get() { curl -fsSL "https://$P.firebaseapp.com/__/$1" -o "$TMPD/f" && cp "$TMPD/f" "$2"; }
# GitHub Pages serves extensionless files as downloads, but maps /x to x.html:
# so the two HTML pages are saved with .html and still answer at /__/auth/handler and /__/auth/iframe.
get auth/handler __/auth/handler.html
get auth/iframe __/auth/iframe.html
for f in handler.js experiments.js iframe.js; do get "auth/$f" "__/auth/$f"; done
get firebase/init.json __/firebase/init.json 2>/dev/null || echo "init.json non disponibile (nessun Firebase Hosting): tieni quello nel repository"
rm -rf "$TMPD"
ls -l __/auth __/firebase
