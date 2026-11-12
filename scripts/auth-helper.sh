#!/usr/bin/env bash
# Copies the Firebase auth helper onto this site, so Google sign-in runs on the same domain
# (needed for the installed iPhone app). Usage: bash scripts/auth-helper.sh <firebase-project-id>
set -euo pipefail
cd "$(dirname "$0")/.."
P=${1:?firebase project id}
mkdir -p __/auth __/firebase
# GitHub Pages serves extensionless files as downloads, but maps /x to x.html:
# so the two HTML pages are saved with .html and still answer at /__/auth/handler and /__/auth/iframe.
for f in handler iframe; do
  curl -fsSL "https://$P.firebaseapp.com/__/auth/$f" -o "__/auth/$f.html"
done
for f in handler.js experiments.js iframe.js; do
  curl -fsSL "https://$P.firebaseapp.com/__/auth/$f" -o "__/auth/$f"
done
curl -fsSL "https://$P.firebaseapp.com/__/firebase/init.json" -o "__/firebase/init.json"
ls -l __/auth __/firebase
