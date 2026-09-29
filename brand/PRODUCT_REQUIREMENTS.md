# Ridgeline / product requirements v1.2

These explicit owner requirements supersede any conflicting v1 prototype behavior. Preserve the established visual system while implementing them in the actual app.

## Weight logging belongs to the exercise

Every movement performed with external load needs visible weight entry beside or directly below its prescription. This includes ramp-up sets, main strength work, weighted conditioning movements and selected weighted substitutions. Do not hide the only logging control in a distant section-level disclosure. Unweighted movements do not need empty weight fields; if an exercise can be weighted, expose entry when its weighted variation is selected.

Fields: Weight, Unit (lb / kg), and the set/repetition context. Use actual load, distinct from prescribed or suggested load. Keep a previous-load summary nearby. Barbell values should explicitly mean total load including the bar; dumbbell values need a per-dumbbell label; kettlebell values mean the bell's load. Resolve ambiguous equipment conventions through the exercise definition, not by guessing from a number.

Support different loads across sets. Each saved set belongs to a session attempt and a stable exercise ID. Preserve exercise identity across planned dates so history follows the movement. Weighted alternatives keep their own exercise identity; do not merge DB-row history into ring-row history. For unilateral/per-hand work, preserve the relevant load convention in metadata.

Persist original entered value and unit plus a normalized value for comparisons. Use the exact conversion 1 lb = 0.45359237 kg. Unit switching converts the display rather than relabeling the same number. Round only the displayed value; never repeatedly convert rounded displays to rebuild stored history. Keep the original entry for audit/editing. A global unit preference may seed new forms, but must not reinterpret existing entries. The reference rounds displays to two decimals while retaining the unrounded backing value for repeated unit switches. Production must also preserve this separation.

Show saved, saving and error states truthfully. Preserve unsaved input on navigation; either autosave safely or keep drafts and provide recovery. Never claim server/local persistence before it succeeds. The reference stores entries and drafts in memory until reload, solely to demonstrate the flow.

## Training dates are flexible

Today is a convenience shortcut, not an access rule. Athletes can browse past and future published sessions, open any of them and perform the chosen session whenever life allows. Supply previous/next navigation plus a direct date picker. Keep today, selected date and completion visibly distinct.

Record planned date separately from performed_at and completed_at. Opening Oct 6 on Oct 21 must retain the Oct 6 prescription and show its planned date. Logging work now records the actual performance timestamp. Calendar completion belongs to the selected scheduled session; history can also display when it was performed.

Do not silently move a program, rewrite the plan date, overwrite a previous attempt or mark today's scheduled session complete when another date's work was performed. Repeating a session creates another attempt; viewing/editing an earlier attempt is explicit. No automatic rescheduling algorithm is required by this request.

Keep draft and saved weights associated with the correct session attempt and exercise when switching dates. A future unpublished session can be unavailable because content is not published, never simply because its date has not arrived. A rest day may still be browsed; alternative sessions remain accessible through the schedule.

Suggested production record fields: session_id, session_attempt_id, planned_date, exercise_id, set_index, original_value, original_unit, canonical_kg, reps, performed_at, saved_at and load_basis. Adapt these to the existing schema with a deliberate migration; they are a data contract, not permission to discard old records.

## Time structure without unnecessary timers

- Run days: show prescribed duration, effort and preparation. No elapsed timer, countdown, start, pause or reset control.
- Weighted strength sets: show interval cadence, start offsets, set count and rest. No running timer or stopwatch.
- Example: Every 2:30 for 5 sets; bench press starts at 0:00, ring row at 1:15, rest until 2:30. These are labeled instructions, not live readouts.
- WODs/conditioning: EMOM/AMRAP/time-cap structure remains explicit. A WOD timer is a possible future feature, not a requirement to implement now. If later added, make it opt-in and keep the workout understandable without it. Do not add it to run or weight-set screens by inheritance.

## Supporting graphic direction

Use `assets/ridgeline-topo-support.svg` for a fuller topographic texture. Nested loops, selective heavier index contours and generous cropping provide more depth than the retired ridge silhouette. Keep it on branding surfaces, outside the canonical logo and away from dense text. It is abstract artwork, not a real geographic map.

## Acceptance examples

1. Select Oct 6 while today is Oct 21; open Easy run with the Oct 6 prescription. No timer is present.
2. Open Oct 21 Bench press, enter 135 lb; switching units displays about 61.23 kg. Saved history retains original value/unit and an accurate canonical weight.
3. Log different loads for successive ramp-up sets; each appears under that exercise and is available in future movement history.
4. Navigate to Oct 28 and back; Oct 21 entries and drafts remain attached to Oct 21. No implicit completion or rescheduling occurs.
5. Choose the weighted dumbbell-row substitute; load entry appears at that exercise with a per-dumbbell convention.
6. View the KB-swing WOD movement; prescribed load and actual logged load remain distinct, with lb/kg entry adjacent.
7. Mark an older session complete; planned and actual performance dates remain separately recoverable.

## v1.2 session discovery

Each dropdown result pairs a planned date (with year where needed) and the actual session title. Examples include Max strength, Upper + Engine, Mountain athlete, Easy run, Long run and Hill tempo, but titles are open-ended program content. Do not hard-code these examples as a closed list. Source visible labels, search and selected-state text from the same session title field.

Search matches dates or title text. Support chronological browsing, an explicit selected state, wrapping long titles, keyboard navigation, Escape-to-close, and an empty-result message. Keep direct calendar/date entry as a fallback. The closed control shows both selected date and focus; selecting a different result must update content and title together, without losing drafts. Production data is authoritative: examples in the guide do not create workouts. The interactive reference searches its three actual supplied sample sessions.
