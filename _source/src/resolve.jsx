/* ══════════════════════════════════════════════════════════════════
   VARIANT RESOLVER  (pure functions — no React, no DOM, testable in Node)
   A v3 program ("engine": 1) stores every week's content once, with
   optional variants tagged `when`. The athlete's private setup picks the
   variant at render time:
     • items/sections carrying `when:{key:value}` are kept only if every
       condition holds (an array value means "any of");
     • `{{name}}` in any string is replaced from the day's variables;
     • run days carry a `run` spec and are turned into concrete minutes
       from the athlete's own baselines.
   Programs without `engine` (Golden Leaf, Mountain Athlete Hybrid) pass
   through untouched, so archived history renders exactly as trained.
   ══════════════════════════════════════════════════════════════════ */

const RUN_DAYS = ["tue","thu","sat"];
const RUN_MIN = 30, RUN_MAX = 240;
const UNI_MIN = 1, UNI_MAX = 6;
const FALLBACK_BASELINES = { tue:60, thu:45, sat:105 };

function cleanInt(v, lo, hi){
  if (v === "" || v === null || v === undefined) return null;
  const n = Math.round(Number(v));
  return isFinite(n) && n >= lo && n <= hi ? n : null;
}
function cleanText(v, max){
  return typeof v === "string" ? v.replace(/[<>]/g,"").trim().slice(0, max) : "";
}

/* ── setup: the athlete's private choices, validated and defaulted ── */
function legBlasterWeeks(program){
  const o = program && program.options && program.options.legBlaster;
  return (o && o.weeks) || [];
}
function hasWhen(node, key, value){
  if (!node || typeof node !== "object") return false;
  if (node.when && node.when[key] === value) return true;
  return Object.values(node).some(v => Array.isArray(v) ? v.some(x => hasWhen(x, key, value)) : hasWhen(v, key, value));
}
/* Leg Blasters may only be offered where every linked change exists in the
   program file: the Wednesday replacement, the Friday throw substitution and
   the reduced Friday accessory rounds. Otherwise the option stays unavailable. */
function legBlasterAvailable(program, pw){
  if (!legBlasterWeeks(program).includes(pw)) return false;
  const wed = program.days["W"+pw+"-wed"], fri = program.days["W"+pw+"-fri"];
  return !!wed && !!fri && hasWhen(wed, "lb", true) && hasWhen(fri, "lb", true) && hasWhen(fri, "friPower", "throws");
}

function normalizeSetup(program, personal){
  const raw = (personal && personal.setup && personal.setup[program.id]) || {};
  const defaults = (program.options && program.options.runBaselines) || FALLBACK_BASELINES;
  const rb = raw.runBaselines || {};
  const runBaselines = {}, runIsSet = {};
  for (const d of RUN_DAYS){
    const n = cleanInt(rb[d], RUN_MIN, RUN_MAX);
    runIsSet[d] = n !== null;
    runBaselines[d] = n !== null ? n : defaults[d];
  }
  const lbWeeks = (Array.isArray(raw.lbWeeks) ? raw.lbWeeks : [])
    .map(Number).filter(w => legBlasterAvailable(program, w));
  return {
    runBaselines, runIsSet,
    wall: raw.wall !== false,
    powerMode: raw.powerMode === "clean" ? "clean" : "jumps",
    lbWeeks: [...new Set(lbWeeks)].sort((a,b)=>a-b),
    uniOverride: cleanInt(raw.uniOverride, UNI_MIN, UNI_MAX),
  };
}

/* ── zones ── */
function normalizeZoneProfile(zp){
  const out = { method:"", source:"", bounds:{} };
  if (!zp || typeof zp !== "object") return out;
  out.method = cleanText(zp.method, 60);
  out.source = cleanText(zp.source, 60);
  for (const z of ["Z1","Z2","Z3","Z4","Z5"]){
    const b = zp.bounds && zp.bounds[z];
    const lo = b ? cleanInt(b[0], 30, 230) : null, hi = b ? cleanInt(b[1], 30, 230) : null;
    if (lo !== null && hi !== null && lo <= hi) out.bounds[z] = [lo, hi];
  }
  return out;
}
function zoneKey(codes, program, zoneProfile){
  const zp = normalizeZoneProfile(zoneProfile);
  const table = program.zones || [];
  const zones = codes.map(c => {
    const z = table.find(t => t.z === c) || { z:c, name:"", cue:"" };
    const b = zp.bounds[c];
    return { z:z.z, name:z.name, cue:z.cue, hr: b ? b[0] + "–" + b[1] + " bpm" : null };
  });
  const label = [zp.method, zp.source].filter(Boolean).join(" · ");
  return { profile: label || null, zones };
}

/* ── run arithmetic (all in seconds, so nothing drifts) ── */
function roundHalfUp(pctTimesBase){ return Math.floor((pctTimesBase + 50) / 100); }   /* pct × base ÷ 100 */
function fmtTrt(min){ return Math.floor(min/60) + ":" + String(min % 60).padStart(2,"0"); }
function minNum(sec){
  const m = Math.floor(sec/60), s = sec % 60;
  return s ? m + ":" + String(s).padStart(2,"0") : String(m);
}
function minText(sec){ return minNum(sec) + " min"; }

function easyStructure(trtMin, warmMin, coolMin){
  /* Standard preparation + cooldown; if the run is shorter than both, shorten them in proportion. */
  const std = warmMin + coolMin;
  if (trtMin >= std) return { warm: warmMin*60, main: (trtMin - std)*60, cool: coolMin*60 };
  const warm = Math.round(trtMin * warmMin / std) * 60;
  return { warm, main: 0, cool: trtMin*60 - warm };
}

function resolveRun(run, setup, program, zoneProfile){
  const base = setup.runBaselines[run.base];
  const trt = run.pct ? roundHalfUp(run.pct * base) : base;
  const trtSec = trt * 60;
  const isSet = setup.runIsSet[run.base];
  const segs = [];               /* {n, rx, cue, sec} in running order */
  let usedQuality = false, reps = 0, reduced = false, fellBack = false;

  const warmMin = run.warm, coolMin = run.cool;
  if (run.kind === "quality" && run.set){
    const s = run.set, per = s.workSec + s.recSec;
    const avail = trtSec - (warmMin + coolMin) * 60;
    reps = s.reps;
    while (reps > 1 && reps * per > avail) reps--;
    if (reps * per <= avail){
      usedQuality = true; reduced = reps < s.reps;
      const setSec = reps * per, filler = avail - setSec;
      segs.push({ n:"Progressive warm-up", rx:minText(warmMin*60) + " · Z1–Z2", sec:warmMin*60,
        cue:"Build gradually from very light to steady easy." });
      segs.push({ n:s.name, rx:s.text.replace("{reps}", reps), sec:setSec,
        cue:minText(setSec) + " including every recovery." });
      if (filler > 0) segs.push({ n:"Easy running", rx:minText(filler) + " · Z2", sec:filler,
        cue:"Before or after the set — your choice." });
      segs.push({ n:"Easy cooldown", rx:minText(coolMin*60) + " · Z1–Z2", sec:coolMin*60 });
    } else fellBack = true;      /* not even one repetition fits: easy running instead */
  }
  if (!usedQuality){
    const st = easyStructure(trt, run.kind === "quality" ? 10 : warmMin, run.kind === "quality" ? 5 : coolMin);
    segs.push({ n:"Progressive warm-up", rx:minText(st.warm) + " · Z1–Z2", sec:st.warm });
    if (st.main > 0) segs.push({ n:run.mainName || "Easy running", rx:minText(st.main) + " · " + (run.mainZone || "Z2"),
      sec:st.main, cue:run.mainCue });
    segs.push({ n:"Easy cooldown", rx:minText(st.cool) + " · Z1–Z2", sec:st.cool });
  }

  const total = segs.reduce((a,s)=>a+s.sec, 0);
  const items = segs.map(s => { const o = { k:"mv", n:s.n, rx:s.rx }; if (s.cue) o.cue = s.cue; return o; });
  const flags = (run.kind === "quality" && !usedQuality) ? (run.easyFlags || []) : (run.flags || []);
  for (const f of flags) items.push({ k:"flag", kind:f.kind, text:f.text });
  if (reduced) items.push({ k:"flag", kind:"regression", text:"At this run length the set is shortened to " + reps +
    " repetitions so the warm-up and cooldown stay whole." });
  if (fellBack) items.push({ k:"flag", kind:"regression", text:"This run is too short for the quality set. Run easy instead — no make-up intervals." });

  const codes = usedQuality ? run.zones : (run.easyZones || ["Z1","Z2"]);
  const out = {
    trt: fmtTrt(trt), trtMin: trt, totalSec: total,
    parts: [{ label:null, meta: segs.map(s=>minNum(s.sec)).join(" + ") + " = " + trt + " min", items }],
    zoneKey: zoneKey(codes, program, zoneProfile),
    runSegments: segs.map(s => ({ n:s.n, sec:s.sec })),
    runReps: usedQuality ? reps : 0,
  };
  if (!isSet) out.runExample = true;
  return out;
}

/* ── variants ── */
function matches(when, vars){
  if (!when) return true;
  return Object.entries(when).every(([k, want]) => Array.isArray(want) ? want.includes(vars[k]) : vars[k] === want);
}
function subst(str, vars){
  return str.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars) ? String(vars[k]) : m);
}
function walk(node, vars){
  if (Array.isArray(node)) return node.filter(n => !(n && typeof n === "object" && n.when) || matches(n.when, vars)).map(n => walk(n, vars));
  if (node && typeof node === "object"){
    const out = {};
    for (const [k, v] of Object.entries(node)) if (k !== "when" && k !== "run") out[k] = walk(v, vars);
    return out;
  }
  return typeof node === "string" ? subst(node, vars) : node;
}

const LB_DOSE = {
  1: { rx:"1 round", text:"First exposure: 1 mini round. Up to 2 only with recent, well-tolerated experience of this exact work." },
  2: { rx:"same as last time", text:"Second exposure: repeat the dose you tolerated last time. Don't progress automatically." },
  3: { rx:"up to 2 rounds", text:"Third exposure: you may add 1 round (2 total, maximum) only if recovery and movement quality were satisfactory." },
};

function dayVars(day, program, setup, ctx){
  const pw = day.pw;
  const lb = setup.lbWeeks.includes(pw) && legBlasterAvailable(program, pw);
  let prior = 0;
  if (lb) for (const w of legBlasterWeeks(program))
    if (w < pw && setup.lbWeeks.includes(w) && ctx.lbDone && ctx.lbDone(w)) prior++;
  const exp = Math.min(3, prior + 1);
  const deload = !!day.deload;
  const uniRounds = setup.uniOverride || (deload ? 2 : 3);
  return {
    pw, deload, lb, wall: setup.wall, powerMode: setup.powerMode,
    friPower: lb ? "throws" : setup.powerMode,
    uniRounds,
    uniNote: setup.uniOverride && setup.uniOverride !== (deload ? 2 : 3)
      ? " · your own setting (shared default " + (deload ? 2 : 3) + ")" : "",
    lbExp: exp, lbRx: LB_DOSE[exp].rx, lbDose: LB_DOSE[exp].text,
  };
}

/* day: a schedule entry ({...dayFromProgram, key, pw, iso}).
   ctx: { program, setup, zoneProfile, lbDone(pw) → bool } */
function resolveDay(day, ctx){
  const program = ctx.program;
  if (!program || !program.engine || !day) return day;
  const vars = dayVars(day, program, ctx.setup, ctx);
  const out = walk(day, vars);
  if (day.run){
    const r = resolveRun(day.run, ctx.setup, program, ctx.zoneProfile);
    Object.assign(out, r);
    if (r.runExample){
      const own = out.note ? out.note + " " : "";
      out.note = own + "Example length. Set your own in Program setup.";
    }
  }
  return out;
}
