/* ══════════════════════════════════════════════════════════════════
   DATA LAYER
   Programs are authored in Program Weeks ("W3-mon") and mapped to the
   calendar through a start date. The log is keyed by movement, not by
   program, so history carries from one program to the next.
   ══════════════════════════════════════════════════════════════════ */

const DOW       = ["mon","tue","wed","thu","fri","sat","sun"];
const DAY_ABBR  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MON3      = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL= ["January","February","March","April","May","June","July","August",
                   "September","October","November","December"];

/* ── dates (local calendar, never UTC) ── */
function isoOf(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dateOf(iso){ const [y,m,d] = iso.split("-").map(Number); return new Date(y, m-1, d); }
function addDays(iso, n){ const d = dateOf(iso); d.setDate(d.getDate()+n); return isoOf(d); }
function weekdayIdx(iso){ return (dateOf(iso).getDay()+6) % 7; }          /* Mon = 0 */
function todayIso(){ return isoOf(new Date()); }
function fmtLong(iso){ const d=dateOf(iso); return `${DAY_ABBR[weekdayIdx(iso)]} ${MON3[d.getMonth()]} ${d.getDate()}`; }
function fmtShort(iso){ const d=dateOf(iso); return `${MON3[d.getMonth()]} ${d.getDate()}`; }
/* "Wed, Oct 21" — with the year when it is not the current one, so a long program never repeats a label. */
function fmtPick(iso){
  const d = dateOf(iso), y = d.getFullYear() !== new Date().getFullYear() ? `, ${d.getFullYear()}` : "";
  return `${DAY_ABBR[weekdayIdx(iso)]}, ${MON3[d.getMonth()]} ${d.getDate()}${y}`;
}

/* ── personal layer: per-athlete settings, never part of a program file ── */
const PERSONAL_KEY = "ridgeline.personal.v1";
function loadPersonal(){
  try { return JSON.parse(localStorage.getItem(PERSONAL_KEY)) || {}; } catch { return {}; }
}
function savePersonal(p){
  try { localStorage.setItem(PERSONAL_KEY, JSON.stringify(p)); return true; } catch { return false; }
}
function startDateFor(program, personal){
  const p = personal || loadPersonal();
  return (p.startDates && p.startDates[program.id]) || program.startDate;
}

/* ── schedule: Program Week keys → calendar dates ── */
function buildSchedule(program, personal){
  const start = startDateFor(program, personal);
  const byIso = {};
  for (const [key, day] of Object.entries(program.days)){
    const m = key.match(/^W(\d+)-(mon|tue|wed|thu|fri|sat|sun)$/);
    if (!m) continue;
    const pw = Number(m[1]);
    const iso = addDays(start, (pw-1)*7 + DOW.indexOf(m[2]));
    byIso[iso] = { ...day, key, pw, iso };
  }
  const dates = Object.keys(byIso).sort();
  const months = [];
  for (const iso of dates){
    const mk = iso.slice(0,7);
    if (!months.includes(mk)) months.push(mk);
  }
  return { byIso, dates, first: dates[0], last: dates[dates.length-1], months, start };
}

/* Summary-card resolution. Before the program: its first day. During: today.
   After: the program's end card if it has one (Golden Leaf → "Race Day!"),
   otherwise an honest "next block not loaded yet" state. */
function summaryFor(sched, program, today){
  if (today < sched.first)  return { mode:"before", iso:sched.first };
  if (sched.byIso[today])   return { mode:"during", iso:today };
  if (today > sched.last)   return program.endCard
                              ? { mode:"end", iso:sched.last }
                              : { mode:"unpublished", iso:sched.last };
  return { mode:"gap", iso:today };
}

/* ══════════════════ TRAINING LOG ══════════════════
   One entry per movement per planned date, holding any number of sets. Each set keeps the
   value and unit as entered (w, u), a normalised kilogram value (kg) for comparison, and the
   time it was performed (at). Entries are keyed by the *planned* date, so opening Oct 6 on
   Oct 21 still logs against Oct 6 and records Oct 21 as the performance time.
   Old entries (a single w/r pair, always pounds) are read as one set and never rewritten.
   Completion lives beside the entries: done[plannedIso] = { at }.
   Stored on this device only. Export/import provides the backup. */

const LOG_KEY = "ridgeline.log.v1";
const DRAFT_KEY = "ridgeline.drafts.v1";
const KG_PER_LB = 0.45359237;                      /* exact */
function emptyLog(){ return { v:1, entries:{}, done:{} }; }
function loadLog(){
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_KEY));
    return raw && raw.entries ? { ...raw, done: raw.done || {} } : emptyLog();
  } catch { return emptyLog(); }
}
function persistLog(log){
  try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); return true; } catch { return false; }
}

/* Movement identity: case-, punctuation- and parenthetical-insensitive, so
   "Foot-on-Wall DB RDL" matches across every day and every program. */
function mkey(name){
  return String(name).toLowerCase().replace(/\(.*?\)/g,"").replace(/[^a-z0-9]+/g," ").trim();
}

/* ── units: conversion changes the display, never the stored entry ── */
function toKg(value, unit){ const n = Number(value); return unit==="kg" ? n : n*KG_PER_LB; }
function fromKg(kg, unit){ return unit==="kg" ? kg : kg/KG_PER_LB; }
function fmtNum(n){ return String(Math.round(n*100)/100); }             /* display rounding only */
function loadText(set, unit){
  if (!set || set.w === "" || set.w == null) return "";
  if (set.u === unit || set.kg == null) return `${set.w} ${set.u || unit}`;
  return `${fmtNum(fromKg(set.kg, unit))} ${unit} (entered ${set.w} ${set.u})`;
}
function setText(set, unit, mode){
  const load = mode==="reps" ? "" : loadText(set, unit);
  const reps = set.r ? `${set.r}${mode==="reps" ? " reps" : ""}` : "";
  return [load, reps].filter(Boolean).join(" × ");
}

function setsOf(e){
  if (!e) return [];
  if (Array.isArray(e.sets)) return e.sets;
  const w = e.w != null ? String(e.w).trim() : "", r = e.r != null ? String(e.r).trim() : "";
  return (w || r) ? [{ w, u:"lb", kg: w ? toKg(w,"lb") : null, r, at: e.t || null, legacy:true }] : [];
}
function entryOn(log, name, iso){
  const m = log.entries[mkey(name)];
  return m ? m[iso] || null : null;
}
function lastBefore(log, name, iso){
  const m = log.entries[mkey(name)];
  if (!m) return null;
  const dates = Object.keys(m).filter(d => d < iso).sort();
  for (let i = dates.length-1; i >= 0; i--){
    const sets = setsOf(m[dates[i]]);
    if (sets.length) return { ...sets[sets.length-1], date: dates[i], count: sets.length };
  }
  return null;
}
function latestCalibration(log, name){
  const m = log.entries[mkey(name)];
  if (!m) return null;
  const dates = Object.keys(m).filter(d => m[d] && m[d].cal && setsOf(m[d]).some(s => s.w)).sort();
  if (!dates.length) return null;
  const sets = setsOf(m[dates[dates.length-1]]);
  return { ...sets[sets.length-1], date: dates[dates.length-1] };
}
function countEntries(log){
  return Object.values(log.entries).reduce((a,m)=>a+Object.values(m).reduce((b,e)=>b+Math.max(1,setsOf(e).length),0), 0);
}
function datesWithEntries(log){
  const s = new Set();
  Object.values(log.entries).forEach(m => Object.keys(m).forEach(d => s.add(d)));
  return s;
}

function withEntry(log, name, iso, sets, cal){
  const k = mkey(name), byDate = { ...(log.entries[k] || {}) };
  if (!sets.length) delete byDate[iso];
  else {
    const last = sets[sets.length-1];
    byDate[iso] = { sets, w:last.w, u:last.u, r:last.r, cal:!!cal, t:Date.now() };   /* w/u/r mirror the last set for older readers */
  }
  const entries = { ...log.entries };
  if (Object.keys(byDate).length) entries[k] = byDate; else delete entries[k];
  return { ...log, entries };
}
function withSet(log, name, iso, set, cal){ return withEntry(log, name, iso, [...setsOf(entryOn(log, name, iso)), set], cal); }
function withoutSet(log, name, iso, index){
  const e = entryOn(log, name, iso), sets = setsOf(e).filter((_, i) => i !== index);
  return withEntry(log, name, iso, sets, e && e.cal);
}
function withDone(log, iso, on){
  const done = { ...(log.done || {}) };
  if (on) done[iso] = { at: Date.now() }; else delete done[iso];
  return { ...log, done };
}

/* Drafts (typed but not yet logged) survive date changes and reloads. */
function loadDrafts(){ try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; } catch { return {}; } }
function saveDrafts(d){ try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {} }
const draftKey = (name, iso) => mkey(name) + "|" + iso;

/* Starting-Load Rule (Mountain Athlete Hybrid): Block 1 Wk 1 starts 5–10% below the calibration load. */
function roundTo(x, step){ return Math.round(x/step)*step; }
function startingRange(set){
  const n = parseFloat(set && set.w);
  if (!isFinite(n) || n <= 0) return null;
  const step = set.u === "kg" ? 2.5 : 5;
  return [roundTo(n*0.90, step), roundTo(n*0.95, step), set.u || "lb"];
}

/* Prescribed reps, used to pre-fill the reps box — never saved unless the set is logged. */
function repsHint(rx){
  if (!rx) return "";
  const m = String(rx).match(/^\s*(\d+)(?!\s*(?:m|min|s|sec|cal|lb|kg|\d))\b/);
  return m ? m[1] : "";
}

const LogContext = React.createContext(null);
