#!/bin/sh
# Rebuilds app.js from source. Not needed for program updates — those are
# just the JSON files in /programs. Requires Node 18+.
set -e
cd "$(dirname "$0")"
npm install --no-save react@18 react-dom@18 esbuild >/dev/null
printf 'import React from "react";\nimport ReactDOM from "react-dom/client";\n' > src/entry.jsx
for f in tokens brand data resolve components screens; do cat src/$f.jsx >> src/entry.jsx; echo >> src/entry.jsx; done
npx esbuild src/entry.jsx --bundle --minify --format=iife --target=safari15 --loader:.jsx=jsx \
  --define:process.env.NODE_ENV='"production"' --outfile=../app.js
echo "app.js rebuilt"
