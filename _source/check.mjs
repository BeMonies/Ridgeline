// Content and resolver checks for Ridgeline programs.  Run:  node _source/check.mjs
// Loads programs/*.json and the pure resolver (src/resolve.jsx) and asserts the v3.1
// acceptance criteria plus the repo's content rules. Exits non-zero on any failure.
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const json = f => JSON.parse(read(f));

const R = vm.runInNewContext(read("_source/src/resolve.jsx") +
  "\n({ normalizeSetup, resolveDay, legBlasterAvailable, zoneKey, roundHalfUp })", {});
const program = json("programs/mountain-athlete-v3.json");

let passed = 0; const failures = [];
function check(name, fn){
  try { fn(); passed++; } catch (e){ failures.push(`${name}\n     ${e.message}`); }
}
function eq(a, b, msg){ if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || "not equal"}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }
function ok(c, msg){ if (!c) throw new Error(msg || "assertion failed"); }

/* ── helpers ── */
const KEYS = ["mon","tue","wed","thu","fri","sat","sun"];
const key = (w, d) => `W${w}-${d}`;
function setupFor(opts = {}){ return R.normalizeSetup(program, { setup: { [program.id]: opts } }); }
function day(w, d, opts = {}, extra = {}){
  const k = key(w, d);
  const raw = { ...program.days[k], key:k, pw:w };
  return R.resolveDay(raw, { program, setup:setupFor(opts), zoneProfile:extra.zoneProfile, lbDone:extra.lbDone });
}
function* walkItems(node){
  if (Array.isArray(node)) for (const n of node) yield* walkItems(n);
  else if (node && typeof node === "object"){ yield node; for (const v of Object.values(node)) yield* walkItems(v); }
}
const items = d => [...walkItems(d.sections || d.parts || d.items || [])];
const names = d => items(d).filter(i => i.n).map(i => i.n);
const section = (d, t) => d.sections.find(s => s.title === t);
const text = d => JSON.stringify(d);
const minutes = s => Number(String(s.budget).match(/^(\d+)/)[1]);
const marksOf = d => items(d).filter(i => i.k === "interval").flatMap(i => i.marks);

/* ── structure ── */
check("84 days, mapped to Program Week + weekday", () => {
  eq(Object.keys(program.days).length, 84);
  for (let w = 1; w <= 12; w++) for (const d of KEYS) ok(program.days[key(w, d)], `missing ${key(w,d)}`);
});
check("weekly pattern: gym Mon/Wed/Fri, runs Tue/Thu/Sat, Sunday rest", () => {
  for (let w = 1; w <= 12; w++){
    eq(KEYS.map(d => program.days[key(w, d)].type), ["gym","run","gym","run","gym","run","rest"], `week ${w}`);
  }
});
check("deloads are Weeks 4, 8, 12 and flagged on every training day", () => {
  for (let w = 1; w <= 12; w++) for (const d of KEYS.slice(0,6)){
    eq(!!program.days[key(w, d)].deload, w % 4 === 0, key(w, d));
  }
});
check("five gym sections in order; normal budgets sum to 60 on Mon/Wed/Fri", () => {
  const order = ["Warm-Up","Max Strength","Strength Conditioning","Finisher","Cooldown Mobility"];
  const want = { mon:[8,20,16,11,5], wed:[8,21,23,3,5], fri:[10,18,16,11,5] };
  for (let w = 1; w <= 12; w++) for (const d of ["mon","wed","fri"]){
    const g = program.days[key(w, d)];
    eq(g.sections.map(s => s.title), order, key(w, d));
    eq(g.sections.map(minutes), want[d], key(w, d));
    eq(g.sections.map(minutes).reduce((a,b)=>a+b, 0), 60);
  }
});
check("no optional-Friday label; every session is a scheduled day", () => {
  for (const [k, d] of Object.entries(program.days)) ok(!d.optional && !d.bonus, `${k} is optional`);
});

/* ── anchors and progression (Section 8) ── */
const RX = { 1:["4 × 6","7"], 4:["2 × 5","6"], 5:["4 × 5","7"], 9:["4 × 4","7"], 12:["2 × 3","6"] };
function anchorRx(d){ const m = marksOf(d)[0]; return m; }
check("Week 1: back squat and bench 4 × 6 @ RPE 7; Week 4: 2 × 5 @ RPE 6", () => {
  for (const [w, sets, reps, rpe] of [[1,4,6,"7"],[4,2,5,"6"]]){
    for (const [d, name] of [["mon","Back Squat"],["wed","Bench Press"]]){
      const g = day(w, d), iv = items(g).find(i => i.k === "interval");
      eq(iv.sets, sets, `${key(w,d)} sets`);
      eq(iv.marks[0].n, name);
      eq(iv.marks[0].rx, `${reps} @ RPE ${rpe}`);
    }
  }
});
check("Week 5 resolves trap-bar deadlift and strict press; Week 9 front squat and push press", () => {
  eq(day(5,"mon").sections[1].items.find(i=>i.k==="interval").marks.map(m=>m.n), ["Trap Bar Deadlift","Two-Arm Landmine Press"]);
  eq(day(5,"wed").sections[1].items.find(i=>i.k==="interval").marks.map(m=>m.n), ["Barbell Strict Press","Strict Pull-Up"]);
  eq(marksOf(day(9,"mon")).map(m=>m.n), ["Front Squat","Neutral-Grip Pull-Up"]);
  eq(marksOf(day(9,"wed")).map(m=>m.n), ["Push Press","Chest-Supported Row"]);
});
check("Block 1 Wednesday row: 8/side building, 6/side deload, same flat bench", () => {
  for (const w of [1,2,3]) ok(/^8 \/ side @ RPE/.test(marksOf(day(w,"wed"))[1].rx), `week ${w}`);
  ok(/^6 \/ side @ RPE 6/.test(marksOf(day(4,"wed"))[1].rx));
  ok(/same flat bench/.test(text(day(1,"wed"))), "flat-bench note missing");
});
check("pull-ups: Monday in Blocks 1 and 3, Wednesday in Block 2", () => {
  const has = (w, d) => names(day(w, d)).some(n => /Pull-Up/.test(n));
  for (const w of [1,2,3,9,10,11]) ok(has(w,"mon") && !has(w,"wed"), `week ${w}`);
  for (const w of [5,6,7]) ok(has(w,"wed") && !has(w,"mon"), `week ${w}`);
});
check("Friday press/pull resolve per block; sets follow the table", () => {
  const want = { 1:["DB Strict Press","Chest-Supported DB Row"], 5:["Incline DB Bench Press","Seated Cable Row"], 9:["DB Bench Press","Neutral-Grip Lat Pulldown"] };
  const upper = w => items(day(w,"fri")).find(i => i.k === "interval" && i.every === "3:00");
  for (const [w, n] of Object.entries(want)) eq(upper(Number(w)).marks.map(m => m.n), n, `week ${w}`);
  eq(items(day(1,"fri")).find(i=>i.k==="interval" && i.every==="3:00").sets, 3);
  eq(items(day(4,"fri")).find(i=>i.k==="interval" && i.every==="3:00").sets, 2);
});
check("Monday complementary lift: trap bar Blocks 1/3, belt squat Block 2; one easy set on deload", () => {
  const sec = w => items(day(w,"mon")).find(i => i.log === "load" && /secondary|Belt Squat/.test(i.n));
  eq(sec(1).n, "Trap Bar Deadlift, secondary"); eq(sec(1).rx, "2 × 5 @ RPE 6");
  eq(sec(5).n, "Belt Squat");                    eq(sec(5).rx, "2 × 6 @ RPE 6");
  eq(sec(9).n, "Trap Bar Deadlift, secondary"); eq(sec(9).rx, "2 × 4 @ RPE 6");
  for (const w of [4,8,12]) ok(/^1 × /.test(sec(w).rx), `week ${w} deload`);
});
check("Friday lateral: step-up Blocks 1/2, lunge Block 3; 2 × 6/side building, 1 × 6/side deload", () => {
  const lat = w => items(day(w,"fri")).find(i => /Lateral (Step-Up|Lunge)/.test(i.n || ""));
  eq(lat(1).n, "Lateral Step-Up"); eq(lat(6).n, "Lateral Step-Up"); eq(lat(9).n, "Lateral Lunge");
  ok(/^2 × 6 \/ side/.test(lat(3).rx)); ok(/^1 × 6 \/ side/.test(lat(4).rx)); ok(/^1 × 6 \/ side/.test(lat(12).rx));
});
check("Wednesday starts its work section with chest passes 2 × 3 (1 × 3 deload)", () => {
  const first = w => items(section(day(w,"wed"),"Max Strength")).find(i => i.k === "mv");
  eq(first(1).n, "Medicine-Ball Wall Chest Pass"); ok(/^2 × 3/.test(first(1).rx)); ok(/^1 × 3/.test(first(4).rx));
});
check("Friday jump/bound repetition counts match the table", () => {
  const want = [18,18,24,9,18,18,24,9,18,18,24,9];
  want.forEach((n, i) => ok(text(day(i+1,"fri")).includes(`${n} working reps`), `week ${i+1} should be ${n}`));
});
check("Monday and Wednesday both contain both single-leg patterns; deload shared default is 2 rounds", () => {
  for (let w = 1; w <= 12; w++) for (const d of ["mon","wed"]){
    const g = day(w, d);
    ok(names(g).includes("Bulgarian Split Squat") && names(g).includes("Foot-on-Wall DB RDL"), key(w,d));
    const meta = items(g).find(i => i.k === "group" && i.label === "Single-Leg Superset").meta;
    eq(meta, `${w % 4 === 0 ? 2 : 3} rounds`, key(w,d));
  }
});
check("no old three-round Monday or two-round Wednesday finisher", () => {
  for (let w = 1; w <= 12; w++){
    ok(minutes(day(w,"mon").sections[3]) === 11 && minutes(day(w,"wed").sections[3]) === 3);
    ok(!/3 rounds/.test(JSON.stringify(day(w,"mon").sections[3])) && !/2 rounds/.test(JSON.stringify(day(w,"wed").sections[3])));
  }
});

/* ── Wednesday WODs and the battle-rope correction ── */
check("Week 2 Wednesday: AMRAP 8 — 8 wall balls, 6 controlled burpees, 8 row calories", () => {
  const w = items(day(2,"wed")).find(i => i.k === "wod");
  eq(w.head, "AMRAP 8");
  eq(w.items.map(i => [i.n, i.rx]), [["Wall Balls","8"],["Burpees","6 · controlled"],["Row","8 cal"]]);
});
check("no battle ropes anywhere in the v3 program", () => {
  ok(!/battle|rope/i.test(read("programs/mountain-athlete-v3.json")));
});
check("deload WOD is 6 minutes easy continuous erg", () => {
  for (const w of [4,8,12]) eq(items(day(w,"wed")).find(i => i.k === "wod").head, "6 min easy continuous erg");
});

/* ── Leg Blasters: one switch, every linked change ── */
const LB_ON = { lbWeeks:[9,10,11] };
check("Leg Blaster is available only in Weeks 9–11 and only when all linked variants exist", () => {
  for (let w = 1; w <= 12; w++) eq(R.legBlasterAvailable(program, w), [9,10,11].includes(w), `week ${w}`);
  const broken = JSON.parse(JSON.stringify(program));
  broken.days["W10-fri"].sections.forEach(s => s.items.forEach(i => { if (i.when && i.when.friPower === "throws") i.when.friPower = "never"; }));
  ok(!R.legBlasterAvailable(broken, 10), "must be unavailable if the Friday throw substitution is missing");
});
check("selecting Leg Blasters replaces the Wednesday WOD", () => {
  for (const w of [9,10,11]){
    const on = day(w,"wed",LB_ON), off = day(w,"wed");
    ok(items(off).some(i => i.k === "wod" && i.head !== "Mini Leg Blaster"), "default WOD present");
    ok(!items(on).some(i => i.k === "wod" && i.head !== "Mini Leg Blaster"), `week ${w}: normal WOD must be gone`);
    ok(items(on).some(i => i.k === "wod" && i.head === "Mini Leg Blaster"));
    ok(!names(off).includes("Mini Leg Blaster"));
  }
});
check("selecting Leg Blasters swaps Friday power to 3 × 3 chest passes and cuts accessories to 2 rounds", () => {
  for (const w of [9,10,11]){
    const on = day(w,"fri",LB_ON), off = day(w,"fri");
    const n = names(on);
    ok(n.includes("Medicine-Ball Wall Chest Pass") && !n.includes("Lateral Bound") && !n.includes("Broad Jump") && !n.includes("Hang Power Clean"), `week ${w}`);
    ok(items(on).some(i => i.rx === "3 × 3 crisp throws"));
    ok(/2 rounds/.test(text(section(on,"Finisher"))) && !/3 rounds/.test(text(section(on,"Finisher"))));
    ok(/3 rounds/.test(text(section(off,"Finisher"))));
    ok(names(off).includes("Lateral Bound"));
  }
});
check("Leg Blasters also override the clean option", () => {
  const n = names(day(10,"fri",{ ...LB_ON, powerMode:"clean" }));
  ok(!n.includes("Hang Power Clean") && n.includes("Medicine-Ball Wall Chest Pass"));
});
check("Week 12 and non-eligible weeks ignore a Leg Blaster request", () => {
  for (const w of [1,5,8,12]){
    eq(text(day(w,"wed",{ lbWeeks:[w] })), text(day(w,"wed")), `week ${w} Wed`);
    eq(text(day(w,"fri",{ lbWeeks:[w] })), text(day(w,"fri")), `week ${w} Fri`);
  }
});
check("no-wall alternative applies on Wednesday and on a linked Leg Blaster Friday, same dose", () => {
  const wed = items(day(9,"wed",{ wall:false })).find(i => /Incline Push-Up/.test(i.n || ""));
  eq(wed.rx, "2 × 3");
  const fri = day(10,"fri",{ ...LB_ON, wall:false });
  ok(items(fri).some(i => i.n === "Fast-Concentric Incline Push-Up" && i.rx === "3 × 3"));
  ok(!names(fri).includes("Medicine-Ball Wall Chest Pass"));
  ok(!/partner/i.test(read("programs/mountain-athlete-v3.json").replace(/no partner/gi, "")), "no partner-dependent movement");
});
check("Leg Blaster dose advances by completed exposures, not calendar weeks", () => {
  const rx = (w, done) => items(day(w,"wed",LB_ON,{ lbDone:x => done.includes(x) })).find(i => i.n === "Mini Leg Blaster" && i.log).rx;
  eq(rx(9, []), "1 round"); eq(rx(10, []), "1 round"); eq(rx(10, [9]), "same as last time"); eq(rx(11, [9,10]), "up to 2 rounds");
  eq(rx(11, [10]), "same as last time");
});
check("clean mode replaces the jump subsection outright and never adds both", () => {
  for (const w of [1,2,3,4,5,9]){
    const c = names(day(w,"fri",{ powerMode:"clean" })), j = names(day(w,"fri"));
    ok(c.includes("Hang Power Clean") && !c.includes("Lateral Bound") && !c.some(n => /Jump/.test(n)), `week ${w}`);
    ok(!j.includes("Hang Power Clean"));
  }
  ok(/^4 × 2/.test(items(day(1,"fri",{ powerMode:"clean" })).find(i => i.n === "Hang Power Clean").rx));
  ok(/^2 × 2/.test(items(day(4,"fri",{ powerMode:"clean" })).find(i => i.n === "Hang Power Clean").rx));
});

/* ── running arithmetic and zones ── */
const segSum = d => d.runSegments.reduce((a, s) => a + s.sec, 0);
check("Tuesday at 60 min: Week 1 = 15+15+25+5, Week 11 = 15+30+10+5", () => {
  eq(day(1,"tue").runSegments.map(s => s.sec/60), [15,15,25,5]);
  eq(day(11,"tue").runSegments.map(s => s.sec/60), [15,30,10,5]);
  eq(day(1,"tue").parts[0].meta, "15 + 15 + 25 + 5 = 60 min");
});
check("quality-set durations include every recovery (Weeks 1,2,3,5,6,7,9,10,11)", () => {
  const want = { 1:15, 2:20, 3:21, 5:21, 6:24, 7:28, 9:16, 10:25, 11:30 };
  for (const [w, m] of Object.entries(want)) eq(day(Number(w),"tue").runSegments[1].sec/60, m, `week ${w}`);
});
check("a 105-min Saturday is 10 + 90 + 5; deload at 80% is 84 min", () => {
  eq(day(1,"sat").runSegments.map(s => s.sec/60), [10,90,5]);
  eq(day(4,"sat").trtMin, 84); eq(day(4,"sat").trt, "1:24");
  eq(day(4,"tue").trtMin, 51); eq(day(4,"thu").trtMin, 38);
});
check("Thursday = 10 + (TRT−15) + 5", () => {
  eq(day(1,"thu").runSegments.map(s => s.sec/60), [10,30,5]); eq(day(1,"thu").trt, "0:45");
});
check("every week, every baseline: segments sum to TRT, none negative, warm-up and cooldown intact", () => {
  for (let base = 30; base <= 240; base += 1){
    for (let w = 1; w <= 12; w++) for (const d of ["tue","thu","sat"]){
      const g = day(w, d, { runBaselines:{ tue:base, thu:base, sat:base } });
      eq(segSum(g), g.trtMin * 60, `${key(w,d)} @ ${base}`);
      ok(g.runSegments.every(s => s.sec >= 0), `${key(w,d)} @ ${base} negative`);
      ok(g.runSegments[0].sec > 0 && g.runSegments.at(-1).sec > 0, `${key(w,d)} @ ${base} lost warm-up/cooldown`);
      if (w % 4 !== 0 && d === "tue") ok(g.runSegments[0].sec === 900 && g.runSegments.at(-1).sec === 300 || g.runReps === 0, `${key(w,d)} @ ${base}`);
    }
  }
});
check("a short Tuesday drops whole repetitions and says so", () => {
  const g = day(11,"tue",{ runBaselines:{ tue:45 } });
  eq(g.runReps, 2); eq(segSum(g), 45*60);
  ok(items(g).some(i => i.k === "flag" && /shortened to 2 repetitions/.test(i.text)));
});
check("deload rounding is half-up: 85% of 50 = 43 (42.5 → 43)", () => {
  eq(day(4,"thu",{ runBaselines:{ thu:50 } }).trtMin, 43);
});
check("a run shorter than warm-up + cooldown shortens both proportionally, never negative", () => {
  const sp = R.resolveDay({ ...program.days["W4-thu"], key:"W4-thu", pw:4, run:{ ...program.days["W4-thu"].run, pct:10 } },
    { program, setup:setupFor({ runBaselines:{ thu:100 } }) });
  ok(sp.runSegments.every(s => s.sec >= 0)); eq(segSum(sp), sp.trtMin*60);
});
check("zones: shown with intent and cue; boundaries unset until the athlete sets them", () => {
  const z = day(1,"tue").zoneKey;
  eq(z.zones.map(x => x.z), ["Z1","Z2","Z4"]); ok(z.zones.every(x => x.hr === null) && z.profile === null);
  const set = day(1,"tue",{}, { zoneProfile:{ method:"Five-zone watch profile", source:"field test", bounds:{ Z2:[132,148], Z4:[165,175], Z3:[0,0] } } }).zoneKey;
  eq(set.zones.find(x => x.z === "Z2").hr, "132–148 bpm"); eq(set.zones.find(x => x.z === "Z1").hr, null);
  eq(set.profile, "Five-zone watch profile · field test");
  eq(day(5,"tue").zoneKey.zones.map(x => x.z), ["Z1","Z2","Z3","Z4"]);
});
check("Thursday is easy Z2, Saturday shows Z2/Z3 on building weeks, deload runs have no Z3/Z4", () => {
  eq(day(2,"thu").zoneKey.zones.map(x => x.z), ["Z1","Z2"]);
  ok(/Z2\/Z3/.test(text(day(2,"sat"))));
  for (const w of [4,8,12]) for (const d of ["tue","thu","sat"]) ok(!/Z3|Z4/.test(JSON.stringify(day(w,d).parts)), key(w,d));
});
check("example run lengths are labelled until the athlete sets their own", () => {
  ok(day(1,"tue").runExample && /Example length/.test(day(1,"tue").note));
  const mine = day(1,"tue",{ runBaselines:{ tue:70 } });
  ok(!mine.runExample && !/Example length/.test(mine.note || "")); eq(mine.trtMin, 70);
});

/* ── private overrides ── */
check("personal single-leg override applies in every week, including deloads, and stays out of the program", () => {
  const meta = (w, d, o) => items(day(w, d, o)).find(i => i.label === "Single-Leg Superset").meta;
  eq(meta(4,"mon",{ uniOverride:3 }), "3 rounds · your own setting (shared default 2)");
  eq(meta(4,"wed",{ uniOverride:3 }), "3 rounds · your own setting (shared default 2)");
  eq(meta(4,"mon"), "2 rounds"); eq(meta(1,"mon",{ uniOverride:4 }), "4 rounds · your own setting (shared default 3)");
  eq(meta(1,"mon",{ uniOverride:3 }), "3 rounds");   /* same as the default: no noise */
});
check("setup input is validated (out-of-range and junk values fall back to defaults)", () => {
  const s = R.normalizeSetup(program, { setup:{ [program.id]:{ runBaselines:{ tue:5, thu:"abc", sat:999 }, uniOverride:99, lbWeeks:[1,9,"10",12], powerMode:"x" } } });
  eq(s.runBaselines, { tue:60, thu:45, sat:105 }); eq(s.uniOverride, null); eq(s.lbWeeks, [9,10]); eq(s.powerMode, "jumps");
});

/* ── every variant resolves cleanly ── */
check("no unresolved {{templates}} or stray `when` keys under any setup", () => {
  const combos = [{}, LB_ON, { wall:false }, { powerMode:"clean" }, { ...LB_ON, wall:false, powerMode:"clean", uniOverride:3 }];
  for (const o of combos) for (const k of Object.keys(program.days)){
    const w = Number(k.match(/^W(\d+)/)[1]);
    const t = text(day(w, k.split("-")[1], o));
    ok(!/\{\{|\}\}/.test(t), `${k} ${JSON.stringify(o)} has an unresolved template`);
    ok(!/"when"/.test(t), `${k} still carries a when`);
  }
});
check("every movement that can be logged has a stable name (no duplicates that differ only by case)", () => {
  const seen = {};
  for (const d of Object.values(program.days)) for (const i of walkItems(d)) if (i.n && i.log){
    const k = i.n.toLowerCase().replace(/\(.*?\)/g,"").replace(/[^a-z0-9]+/g," ").trim();
    seen[k] = seen[k] || new Set(); seen[k].add(i.n);
  }
  for (const [k, v] of Object.entries(seen)) ok(v.size === 1, `"${k}" spelled ${[...v].join(" / ")}`);
});

/* ── content rules and privacy ── */
check("banned terms are absent from the v3 program", () => {
  const t = read("programs/mountain-athlete-v3.json");
  for (const re of [/\bRIR\b/, /\bWave\b/i, /Strength Balance/i, /Contrast (Pair|Complex)/i, /Strip-Set/i, /Same-Load/i, /\bWeek \d/i])
    ok(!re.test(t), `banned pattern ${re}`);
});
check("no personal, medical, trip or venue details in shared program content", () => {
  const t = read("programs/mountain-athlete-v3.json");
  for (const re of [/\bPT\b/, /physio/i, /rehab/i, /injur/i, /surgery/i, /clinician/i, /therap/i, /diagnos/i, /\btrip\b/i, /\bBC\b/, /Golden/i, /\bDec(ember)?\b/, /\bJan(uary)?\b/ ])
    ok(!re.test(t), `private/personal pattern ${re}`);
  ok((t.match(/20\d\d-\d\d-\d\d/g) || []).join() === "2026-10-05", "only the default start date may appear");
});
check("the athlete's private setup is never part of the log backup", () => {
  const src = read("_source/src/screens.jsx");
  const m = src.match(/JSON\.stringify\((\{[^}]*\})/);
  ok(m, "export payload not found");
  const keys = [...m[1].matchAll(/(\w+)\s*:|,\s*(\w+)\s*[,}]/g)].map(x => x[1] || x[2]);
  eq([...new Set(keys)].sort(), ["app","exported","log"], "export payload keys");
});
check("historical programs are preserved", () => {
  let git = null;
  try { git = f => execFileSync("git", ["-C", root, "show", `origin/main:${f}`], { encoding:"utf8", stdio:["ignore","pipe","ignore"] }); } catch {}
  if (!git) return;
  try { git("programs/golden-leaf-2026.json"); } catch { return; }
  eq(read("programs/golden-leaf-2026.json"), git("programs/golden-leaf-2026.json"), "Golden Leaf changed");
  eq(read("programs/travel.json"), git("programs/travel.json"), "travel changed");
  const now = json("programs/ski-2026.json"), then = JSON.parse(git("programs/ski-2026.json"));
  eq(now.days, then.days, "Mountain Athlete Hybrid days changed");
  const { status:_a, ...restNow } = now, { status:_b, ...restThen } = then;
  eq(restNow, restThen, "Mountain Athlete Hybrid changed beyond status");
});

/* ── training log data model (units, sets, completion, history) ── */
const D = vm.runInNewContext(read("_source/src/data.jsx") +
  "\n({ toKg, fromKg, fmtNum, loadText, setText, setsOf, withSet, withoutSet, withDone, lastBefore, entryOn, mkey, emptyLog, startingRange, repsHint, countEntries })",
  { React:{ createContext:()=>({}) }, localStorage:{ getItem:()=>null, setItem:()=>{} } });
check("1 lb = 0.45359237 kg exactly; 135 lb shows about 61.23 kg", () => {
  eq(D.toKg(1,"lb"), 0.45359237);
  eq(D.fmtNum(D.fromKg(D.toKg(135,"lb"),"kg")), "61.23");
});
check("switching units repeatedly never drifts: the stored kilogram value is untouched", () => {
  const kg = D.toKg("135","lb"); let shown = "135";
  for (let i = 0; i < 20; i++){ shown = D.fmtNum(D.fromKg(kg, i%2 ? "lb" : "kg")); }
  eq(shown, "135"); eq(D.fromKg(kg,"lb"), 135 + 0 * kg);   /* exact round trip from the unrounded value */
});
check("a logged set keeps the value and unit as entered plus a normalised kg, and mirrors for older readers", () => {
  const set = { w:"135", u:"lb", kg:D.toKg(135,"lb"), r:"6", at:1 };
  const log = D.withSet(D.emptyLog(), "Bench Press", "2026-10-21", set);
  const e = D.entryOn(log, "Bench Press", "2026-10-21");
  eq(e.sets.length, 1); eq([e.sets[0].w, e.sets[0].u], ["135","lb"]); ok(Math.abs(e.sets[0].kg - 61.2349) < 1e-3);
  eq([e.w, e.u, e.r], ["135","lb","6"]);
  eq(D.loadText(e.sets[0], "kg"), "61.23 kg (entered 135 lb)"); eq(D.loadText(e.sets[0], "lb"), "135 lb");
});
check("different loads across sets stay separate; removing one keeps the rest", () => {
  let log = D.emptyLog();
  for (const w of ["95","115","135"]) log = D.withSet(log, "Bench Press ramp-up", "2026-10-21", { w, u:"lb", kg:D.toKg(w,"lb"), r:"5", at:1 });
  eq(D.setsOf(D.entryOn(log,"Bench Press ramp-up","2026-10-21")).map(s => s.w), ["95","115","135"]);
  log = D.withoutSet(log, "Bench Press ramp-up", "2026-10-21", 1);
  eq(D.setsOf(D.entryOn(log,"Bench Press ramp-up","2026-10-21")).map(s => s.w), ["95","135"]);
  log = D.withoutSet(D.withoutSet(log, "Bench Press ramp-up", "2026-10-21", 0), "Bench Press ramp-up", "2026-10-21", 0);
  ok(!D.entryOn(log,"Bench Press ramp-up","2026-10-21"), "empty entry should be removed");
});
check("old entries are read as one pound set and are never rewritten by reading", () => {
  const old = { v:1, entries:{ "back squat":{ "2026-08-10":{ w:"225", r:"5", cal:false, t:1786000000000 } } } };
  const before = JSON.stringify(old);
  const s = D.setsOf(D.entryOn(old, "Back Squat", "2026-08-10"));
  eq(s.length, 1); eq([s[0].w, s[0].u, s[0].r], ["225","lb","5"]); ok(Math.abs(s[0].kg - 102.058) < 1e-2);
  eq(D.lastBefore(old, "Back Squat", "2026-10-06").date, "2026-08-10");
  eq(JSON.stringify(old), before);
});
check("history follows the movement name across programs; ramp-ups keep their own history", () => {
  ok(D.mkey("Back Squat") === D.mkey("back squat") && D.mkey("Back Squat ramp-up") !== D.mkey("Back Squat"));
  ok(D.mkey("Trap Bar Deadlift, secondary") !== D.mkey("Trap Bar Deadlift"));
});
check("planned date and performance time are separate; completion is per planned session", () => {
  const log = D.withDone(D.emptyLog(), "2026-10-06", true);
  ok(log.done["2026-10-06"].at > 0 && !log.done["2026-10-21"]);
  ok(!D.withDone(log, "2026-10-06", false).done["2026-10-06"]);
  let l = D.withSet(D.emptyLog(), "Row", "2026-10-06", { w:"", u:"", kg:null, r:"12", at:Date.parse("2026-10-21T18:00:00Z") });
  eq(Object.keys(l.entries.row), ["2026-10-06"]);          /* stored under the planned date */
  eq(D.setsOf(l.entries.row["2026-10-06"])[0].at, Date.parse("2026-10-21T18:00:00Z"));
});
check("weighted movements are logged, with a defined load convention where the spec defines one", () => {
  const seen = {};
  for (const d of Object.values(program.days)) for (const i of walkItems(d)) if (i.k === "mv" && i.log === "load") seen[i.n] = i.basis || null;
  for (const n of ["Back Squat","Back Squat ramp-up","Bench Press ramp-up","Trap Bar Deadlift ramp-up","Barbell Strict Press ramp-up","Push Press ramp-up",
                   "Front Squat ramp-up","DB Push Press","Russian KB Swings","Wall Balls","Sled Push","Farmer Carry","Suitcase Carry","Hang Power Clean",
                   "Bench-Supported One-Arm DB Row","Belt Squat","Seated Cable Row","Standing Calf Raise"]) ok(n in seen, `${n} has no log field`);
  eq(seen["Back Squat"], "barbell"); eq(seen["DB Push Press"], "dumbbell"); eq(seen["Russian KB Swings"], "kettlebell");
  eq(seen["Bulgarian Split Squat"], null, "no convention is invented where the spec does not define the implement");
});
check("unweighted movements (jumps, pull-ups) log reps only, with no weight field", () => {
  for (const d of Object.values(program.days)) for (const i of walkItems(d)) if (i.k === "mv" && i.log === "reps")
    ok(!i.basis, `${i.n} should not carry a load basis`);
});
check("no timers, stopwatches or countdown controls anywhere in the app source", () => {
  for (const f of ["components","screens","data","resolve","brand"]) ok(!/setInterval|stopwatch|countdown|Start timer|Pause|Reset timer/i.test(read(`_source/src/${f}.jsx`)), f);
});
check("brand assets: logo geometry is verbatim from the kit, and the shipped font/icons exist", () => {
  const b = read("_source/src/brand.jsx");
  ok(b.includes("M45 40 L390 40 C445 40 489 81 489 135") && b.includes("M40 345 L266 141 L492 345 L389 345 L266 234 L143 345 Z"), "canonical mark paths");
  ok(!/GLYPHS|feTurbulence|LETTERS/.test(b), "old brush wordmark must be gone");
  for (const f of ["fonts/Inter-Variable.ttf","fonts/Inter-OFL.txt","assets/ridgeline-topo-support.svg","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png"])
    ok(fs.existsSync(path.join(root, f)), `${f} missing`);
});

if (failures.length){
  console.error(`\n${failures.length} check(s) failed (${passed} passed):\n`);
  failures.forEach(f => console.error(" ✗ " + f + "\n"));
  process.exit(1);
}
console.log(`All ${passed} checks passed.`);
