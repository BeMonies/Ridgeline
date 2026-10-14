#!/bin/sh
# Rebuilds app.js from source. Not needed for program updates — those are
# just the JSON files in /programs. Requires Node 18+.
set -e
cd "$(dirname "$0")"
npm install --no-save react@18 react-dom@18 esbuild >/dev/null
printf 'import React from "react";\nimport ReactDOM from "react-dom/client";\n' > src/entry.jsx
for f in tokens brand data resolve components screens; do cat src/$f.jsx >> src/entry.jsx; echo >> src/entry.jsx; done
# Build stamp: changes whenever the app source, the shell or a program file changes. The running
# app compares it with version.json each time it comes to the foreground and refreshes itself.
V=$(cat src/entry.jsx ../index.html ../sw.js ../programs/*.json | shasum | cut -c1-12)
npx esbuild src/entry.jsx --bundle --minify --format=iife --target=safari15 --loader:.jsx=jsx \
  --define:process.env.NODE_ENV='"production"' --define:__BUILD__="\"$V\"" --outfile=../app.js
printf '{"v":"%s"}\n' "$V" > ../version.json
echo "app.js rebuilt ($V)"
