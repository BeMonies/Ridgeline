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

/* ── personal layer: per-athlete settings, never part of a program file ── */
const PERSONAL_KEY = "ridgeline.personal.v1";
function loadPersonal(){
  try { return JSON.parse(localStorage.getItem(PERSONAL_KEY)) || {}; } catch { return {}; }
}
function startDateFor(program){
  const p = loadPersonal();
  return (p.startDates && p.startDates[program.id]) || program.startDate;
}

/* ── schedule: Program Week keys → calendar dates ── */
function buildSchedule(program){
  const start = startDateFor(program);
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
   One entry per movement per date: working weight and reps.
   Stored on this device only. Export/import provides the backup. */

const LOG_KEY = "ridgeline.log.v1";
function emptyLog(){ return { v:1, entries:{} }; }
function loadLog(){
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_KEY));
    return raw && raw.entries ? raw : emptyLog();
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

function entryOn(log, name, iso){
  const m = log.entries[mkey(name)];
  return m ? m[iso] || null : null;
}
function lastBefore(log, name, iso){
  const m = log.entries[mkey(name)];
  if (!m) return null;
  const dates = Object.keys(m).filter(d => d < iso).sort();
  for (let i = dates.length-1; i >= 0; i--){
    const e = m[dates[i]];
    if (e && (e.w || e.r)) return { ...e, date: dates[i] };
  }
  return null;
}
function latestCalibration(log, name){
  const m = log.entries[mkey(name)];
  if (!m) return null;
  const dates = Object.keys(m).filter(d => m[d] && m[d].cal && m[d].w).sort();
  return dates.length ? { ...m[dates[dates.length-1]], date: dates[dates.length-1] } : null;
}
function countEntries(log){
  return Object.values(log.entries).reduce((a,m)=>a+Object.keys(m).length, 0);
}
function datesWithEntries(log){
  const s = new Set();
  Object.values(log.entries).forEach(m => Object.keys(m).forEach(d => s.add(d)));
  return s;
}

/* Starting-Load Rule: Block 1 Wk 1 starts 5–10% below the calibration load. */
function round5(x){ return Math.round(x/5)*5; }
function startingRange(w){
  const n = parseFloat(w);
  if (!isFinite(n) || n <= 0) return null;
  return [round5(n*0.90), round5(n*0.95)];
}

/* Prescribed reps, for a placeholder only — never saved unless typed. */
function repsHint(rx){
  if (!rx) return "";
  const m = String(rx).match(/^\s*(\d+)(?!\s*(?:m|min|s|sec|cal|lb))\b/);
  return m ? m[1] : "";
}

const LogContext = React.createContext(null);
