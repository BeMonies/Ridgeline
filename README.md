# Ridgeline

Mountain athlete training program, as an installable web app.

## Updating the program
Program content lives in `programs/`. To publish a change, replace the
program file (for example `programs/ski-2026.json`) with the new version and
commit. The site updates in about a minute; the app picks it up the next time
it opens with a connection. No code changes, no build step.

- `programs/index.json` — which program is active, plus the archive list
- `programs/ski-2026.json` — Mountain Athlete Hybrid (active)
- `programs/golden-leaf-2026.json` — Golden Leaf (archived; open with `?p=golden-leaf-2026`)
- `programs/travel.json` — the 7 travel workouts

## How programs are written
Days are keyed by Program Week and weekday (`W3-mon`) and mapped to the
calendar through the program's `startDate`. Changing the start date shifts
every date; the content doesn't change.

## Training log
Logged weights live on each phone only (never in this repo). Export a
backup from the home screen now and then — deleting the app icon deletes
the log.

## Source
`_source/` holds the app source and authoring scripts. GitHub Pages does not
publish folders that start with an underscore. `_source/build.sh` rebuilds
`app.js`; only needed for app changes, never for program updates.
