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
  "\n({ normalizeSetup, resolveDay, legBlasterAvailable, legBlasterWeeks, zoneKey, roundHalfUp, cycleSlot })", {});
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
    ok(!/\{\{\w+\}\}/.test(t), `${k} ${JSON.stringify(o)} has an unresolved template`);
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
  "\n({ toKg, fromKg, fmtNum, loadText, setText, setsOf, withSet, withoutSet, withDone, lastBefore, entryOn, mkey, emptyLog, startingRange, repsHint, countEntries, e1rmKg, loadAtRpeKg, roundLoad, movementHistory, historyIndex, movementNames, titleFromKey, canAssist, assistRank, BANDS, buildSchedule, e1rmFor, startDateFor })",
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

/* ── exercise history and estimates ── */
check("estimated max uses Epley for 1–12 reps and nothing outside that", () => {
  eq(D.e1rmKg(100, 1), 100); ok(Math.abs(D.e1rmKg(100, 5) - 116.6667) < 1e-3); ok(Math.abs(D.e1rmKg(100, 10) - 133.3333) < 1e-3);
  eq(D.e1rmKg(100, 13), null); eq(D.e1rmKg(0, 5), null); eq(D.e1rmKg(100, ""), null);
});
check("RPE loads are consistent with the set they came from, and lighter at lower RPE", () => {
  const e1 = D.e1rmKg(100, 5);                              /* 100 × 5 treated as an all-out set */
  ok(Math.abs(D.loadAtRpeKg(e1, 5, 10) - 100) < 1e-9, "5 reps at RPE 10 returns the logged weight");
  ok(D.loadAtRpeKg(e1, 5, 8) < D.loadAtRpeKg(e1, 5, 9) && D.loadAtRpeKg(e1, 8, 8) < D.loadAtRpeKg(e1, 5, 8));
  eq(D.roundLoad(226.4, "lb"), 225); eq(D.roundLoad(101.3, "kg"), 102.5);
});
check("history lists each session with its heaviest set, across units and old entries", () => {
  let log = { v:1, done:{}, entries:{ "back squat":{ "2026-08-10":{ w:"225", r:"5", t:1 } } } };
  log = D.withSet(log, "Back Squat", "2026-10-05", { w:"100", u:"kg", kg:100, r:"6", at:2 });
  log = D.withSet(log, "Back Squat", "2026-10-05", { w:"105", u:"kg", kg:105, r:"6", at:3 });
  log = D.withSet(log, "Strict Pull-Up", "2026-10-05", { w:"", u:"", kg:null, r:"4", at:4 });
  const h = D.movementHistory(log, "back squat");
  eq(h.map(x => x.date), ["2026-08-10","2026-10-05"]); eq(h[1].top.w, "105"); ok(Math.abs(h[0].top.kg - 102.058) < 1e-2);
  ok(h[1].e1 > h[0].e1);
  const pu = D.movementHistory(log, "strict pull up"); eq(pu[0].top, null); eq(pu[0].reps, 4); eq(pu[0].e1, null);
  eq(D.historyIndex(log).map(r => [r.key, r.sessions]).sort(), [["back squat",2],["strict pull up",1]]);
});
check("history shows the program's own exercise names, with a readable fallback", () => {
  const names = D.movementNames([program.days]);
  eq(names[D.mkey("Foot-on-Wall DB RDL")].name, "Foot-on-Wall DB RDL"); eq(names["back squat"].basis, "barbell");
  eq(D.titleFromKey("db goblet squat"), "Db Goblet Squat");
});

check("the shipped app.js carries the same build stamp as version.json (so phones can tell when to refresh)", () => {
  const v = json("version.json").v;
  ok(/^[0-9a-f]{12}$/.test(v), "version.json has a build stamp");
  ok(read("app.js").includes(`"${v}"`), "app.js was not rebuilt after the last change — run sh _source/build.sh");
  ok(/version\.json/.test(read("sw.js")) && !/SHELL = \[[^\]]*version\.json/.test(read("sw.js")), "version.json must bypass the service-worker cache");
});

/* ── band-assisted pull-ups ── */
check("pull-up variations offer a band field; other moves do not", () => {
  for (const n of ["Strict Pull-Up","Neutral-Grip Pull-Up","Band-Assisted Pull-Ups","Weighted Pull-Up","Chin-Up"]) ok(D.canAssist(n), n);
  for (const n of ["Scap Pull-Up","Banded Pull-Apart","DB Pullover","Neutral-Grip Lat Pulldown","Push-Up"]) ok(!D.canAssist(n), n);
});
check("a banded set says so, a strict set says strict, and the band is kept on the set", () => {
  eq(D.setText({ r:"6", a:"Medium band" }, "lb", "reps", true), "6 reps · medium band");
  eq(D.setText({ r:"2" }, "lb", "reps", true), "2 reps · strict");
  eq(D.setText({ r:"10" }, "lb", "reps", false), "10 reps");
  const log = D.withSet(D.emptyLog(), "Strict Pull-Up", "2026-10-19", { w:"", u:"", kg:null, r:"6", a:"Medium band", at:1 });
  eq(D.setsOf(D.entryOn(log, "Strict Pull-Up", "2026-10-19"))[0].a, "Medium band");
});
check("history separates strict reps from banded reps and tracks the lightest band", () => {
  let log = D.emptyLog();
  log = D.withSet(log, "Strict Pull-Up", "2026-10-12", { r:"6", a:"Heavy band", at:1 });
  log = D.withSet(log, "Strict Pull-Up", "2026-10-12", { r:"6", a:"Medium band", at:1 });
  log = D.withSet(log, "Strict Pull-Up", "2026-10-19", { r:"7", a:"Medium band", at:2 });
  log = D.withSet(log, "Strict Pull-Up", "2026-10-19", { r:"2", at:2 });
  const h = D.movementHistory(log, "strict pull up");
  eq(h.map(x => [x.band, x.strict, x.reps]), [["Medium band",0,6],["Medium band",2,7]]);
  ok(D.assistRank("") < D.assistRank("Light band") && D.assistRank("Light band") < D.assistRank("Heavy band"));
});

/* ══ v3.3 (v3.2 strength system + v3.3 running): rolling 6-week blocks ══ */
const P2 = json("programs/mountain-athlete-v3-3.json");
const S2 = D.buildSchedule(P2, {});
const day2 = (pw, dow, opts = {}, extra = {}) => {
  const iso = D.buildSchedule(P2, {}).dates.find(x => { const d = S2.byIso[x]; return d.pw === pw && d.key.endsWith("-" + dow); });
  const raw = S2.byIso[iso];
  return R.resolveDay(raw, { program:P2, setup:R.normalizeSetup(P2, { setup:{ [P2.id]:opts } }), zoneProfile:extra.zoneProfile, lbDone:extra.lbDone });
};
const pwOf = (block, bw) => (block-1)*6 + bw;
check("v3.3: 84 templates (A and B × 6 weeks × 7 days); blocks alternate A, B, A with the same variants returning", () => {
  eq(Object.keys(P2.days).length, 84);
  eq([1,2,3,4].map(b => S2.byIso[S2.dates[(b-1)*42]].blockType), ["A","B","A","B"]);
  const sq = b => marksOf(day2(pwOf(b,2),"mon"))[0].n;
  eq([sq(1), sq(2), sq(3)], ["Back Squat","Front Squat","Back Squat"]);
  ok(S2.dates.length >= 400, "rolls on well past a year");
});
check("v3.3: Week 1 establish + 3 × 6 @ 70%, Week 5 4 × 3 @ 86%, Week 6 test + 1 × 5 @ 60%", () => {
  const w = bw => day2(pwOf(1,bw),"mon"), iv = d => items(d).find(i => i.k === "interval");
  eq(iv(w(1)).marks[0].rx, "6 @ 70% of e1RM · rounds 1–3"); ok(/Establish: .*heavy triple at RPE 8/.test(text(w(1))));
  eq(iv(w(5)).marks[0].rx, "3 @ 86% of e1RM"); eq(iv(w(5)).sets, 4);
  eq(iv(w(6)).marks[0].rx, "5 @ 60% of e1RM · round 1 only"); eq(iv(w(6)).sets, 2); ok(/Test: ramp to a heavy triple at RPE 8–9/.test(text(w(6))));
  eq(iv(w(3)).marks[0].pct, 77);
});
check("v3.3: Block B Wednesday hinge is Barbell RDL on the RDL wave, never below 5 reps", () => {
  for (let bw = 1; bw <= 6; bw++){
    const m = marksOf(day2(pwOf(2,bw),"wed"));
    eq(m[0].n, "Barbell RDL"); ok(parseInt(m[0].rx, 10) >= 5, `week ${bw}: ${m[0].rx}`); eq(m[1].n, "Incline Bench Press");
  }
  eq(marksOf(day2(pwOf(1,1),"wed")).map(x => x.n), ["Trap Bar Deadlift","Bench Press"]);
});
check("v3.3: Monday and Wednesday carry the full tri-set, 3 × 8/side on build weeks and 2 rounds on the deload", () => {
  for (const b of [1,2]) for (let bw = 1; bw <= 6; bw++) for (const dw of ["mon","wed"]){
    const g = items(day2(pwOf(b,bw), dw)).find(i => i.label === "Single-Leg Tri-Set");
    eq(g.items.map(i => i.n), ["Bulgarian Split Squat","Foot-on-Wall DB RDL","Weighted Lateral Step-Up"]);
    ok(g.items.every(i => /^8 \/ side/.test(i.rx))); eq(g.meta, bw === 6 ? "2 rounds" : "3 rounds");
  }
});
check("v3.3: no loaded strength lift in any finisher; Wednesday's finisher is the WOD; Friday conditioning is the 15-min WOD", () => {
  const banned = new Set([...P2.options.anchors, "Bulgarian Split Squat","Foot-on-Wall DB RDL","Weighted Lateral Step-Up","Hang Power Clean"]);
  for (const k of Object.keys(P2.days)) { const d = P2.days[k]; if (d.type !== "gym") continue;
    const fin = d.sections.find(s => s.title === "Finisher");
    for (const i of walkItems(fin)) ok(!(i.n && banned.has(i.n)), `${k} finisher has ${i.n}`); }
  ok(items(section(day2(pwOf(1,2),"wed"),"Finisher")).some(i => i.k === "wod"));
  ok(/15 min/.test(text(section(day2(pwOf(1,2),"fri"),"Strength Conditioning"))));
});
check("v3.3: Monday warm-up has scap pull-ups every block; week-4 refresh swaps the finisher", () => {
  for (const k of Object.keys(P2.days).filter(k => k.endsWith("-mon"))) ok(text(P2.days[k].sections[0]).includes("Scap Pull-Up"), k);
  const fin = bw => items(section(day2(pwOf(1,bw),"mon"),"Finisher")).find(i => i.k === "group").items.map(i => i.n);
  eq(fin(1), ["Ring Row","Push-Up"]); eq(fin(3), ["Ring Row","Push-Up"]); eq(fin(4), ["Sled Push","Ring Row"]); eq(fin(5), ["Sled Push","Ring Row"]);
});
check("v3.3: normal section budgets are 60 (Mon, Wed) and 58 (Fri)", () => {
  for (const k of Object.keys(P2.days)){ const d = P2.days[k]; if (d.type !== "gym") continue;
    eq(d.sections.map(s => s.title), ["Warm-Up","Max Strength","Strength Conditioning","Finisher","Cooldown Mobility"]);
    eq(d.sections.map(minutes).reduce((a,b)=>a+b,0), k.endsWith("fri") ? 58 : 60, k); }
});
check("v3.3: Leg Blasters only in Athletic Strength weeks 3–5, never in Strength Base or a deload", () => {
  const ok3 = [9,10,11,21,22,23];
  for (const pw of [1,3,4,5,6,8,12,15,16,17,18,24]) ok(!R.legBlasterAvailable(P2, pw), `pw ${pw} should be unavailable`);
  for (const pw of ok3) ok(R.legBlasterAvailable(P2, pw), `pw ${pw} should be available`);
  eq(R.legBlasterWeeks(P2).slice(0,6), ok3);
});
check("v3.3: a Leg Blaster week applies every linked change together", () => {
  const on = { lbWeeks:[10] };
  const wed = day2(10,"wed",on), fri = day2(10,"fri",on), friOff = day2(10,"fri");
  ok(!items(wed).some(i => i.k === "wod" && i.head !== "Mini Leg Blaster") && items(wed).some(i => i.head === "Mini Leg Blaster"));
  const n = names(fri);
  ok(n.includes("Medicine-Ball Wall Chest Pass") && !n.includes("Lateral Bound") && !n.includes("Standing Broad Jump") && !n.includes("Hang Power Clean"));
  ok(items(fri).some(i => i.k === "wod" && /40 s work/.test(i.head) && /RPE 6/.test(i.effort)), "Friday WOD becomes erg intervals at RPE 6");
  ok(/2 rounds · RPE 6/.test(text(section(fri,"Finisher"))) && /3 rounds/.test(text(section(friOff,"Finisher"))));
  eq(text(day2(4,"wed",{ lbWeeks:[4] })), text(day2(4,"wed")), "Strength Base week ignores the request");
});
check("v3.3: a Strength Base week-1 Tuesday on the Short class (53) is 15 + 10 strides + 23 + 5", () => {
  const t = day2(pwOf(1,1),"tue");
  eq(t.runSegments.map(s => s.sec/60), [15,10,23,5]); eq(t.runInfo.cls, "Short"); eq(t.trtMin, 53);
});
check("v3.3: Tuesday rotation — strides, hill sprints, Z4 intervals, threshold-lite; set minutes per block", () => {
  const A = [10,14,21,25,24], B = [10,14,16,24,30];
  A.forEach((m,i) => eq(day2(pwOf(1,i+1),"tue").runSegments[1].sec/60, m, `A week ${i+1}`));
  B.forEach((m,i) => eq(day2(pwOf(2,i+1),"tue").runSegments[1].sec/60, m, `B week ${i+1}`));
  eq([1,2,3,5].map(bw => day2(pwOf(1,bw),"tue").title), ["Quality Run — Strides","Quality Run — Hill Sprints","Quality Run — Intervals","Quality Run — Threshold-lite"]);
  ok(/Never sprint downhill/.test(text(day2(pwOf(1,2),"tue"))));
});
check("v3.3: Thursday class wave and weekend windows (defaults 98 / 110 / 123 / 98 / 140 / 75)", () => {
  eq([1,2,3,4,5,6].map(bw => day2(pwOf(1,bw),"thu").runInfo.cls), ["Flat","Short","Medium","Medium","Weekday Long","Flat"]);
  eq([1,2,3,4,5,6].map(bw => day2(pwOf(2,bw),"sat").trtMin), [98,110,123,98,140,75]);
  eq(day2(pwOf(1,5),"sat").runInfo.cls, "Peak"); eq(day2(pwOf(1,2),"sat").runInfo.window, [105,115]);
});
check("v3.3: week 6 runs Tuesday and Thursday on the Flat class with no quality set, weekend about 75 easy", () => {
  const t = day2(pwOf(1,6),"tue");
  eq(t.runInfo.cls, "Flat"); eq(t.runReps, 0); eq(t.runSegments.map(s => s.sec/60), [10,30,5]);
  ok(/about 75 min/.test(day2(pwOf(1,6),"sat").runInfo.label));
});
check("v3.3: a chosen route sets the run's length; routes of another class are ignored", () => {
  const routes = [{ id:"r1", name:"River loop", min:58, terrain:"flat", cls:"Medium" }, { id:"r2", name:"Ridge", min:140, terrain:"hilly", cls:"Peak" }];
  const iso = S2.dates.find(x => S2.byIso[x].pw === pwOf(1,2) && S2.byIso[x].key.endsWith("tue"));
  const t = day2(pwOf(1,2),"tue",{ routes, routeFor:{ [iso]:"r1" } });
  eq(t.trtMin, 58); eq(t.runInfo.route.name, "River loop"); eq(t.runSegments.reduce((a,s)=>a+s.sec,0), 58*60);
  const wrong = day2(pwOf(1,2),"tue",{ routes, routeFor:{ [iso]:"r2" } });
  eq(wrong.trtMin, 60, "a Peak route can't be used for a Medium-class Tuesday");
  eq(R.normalizeSetup(P2, { setup:{ [P2.id]:{ classMin:{ Short:"50" } } } }).classMin.Short, 50);
});
check("v3.3: no compounding, except Peak is held to Extended after two missed long runs", () => {
  const pw = pwOf(1,5), dayPeak = (misses) => R.resolveDay({ ...S2.byIso[S2.dates.find(x => S2.byIso[x].pw === pw && S2.byIso[x].key.endsWith("sat"))] },
    { program:P2, setup:R.normalizeSetup(P2, {}), longMisses:() => misses });
  eq(dayPeak(0).runInfo.cls, "Peak"); eq(dayPeak(1).runInfo.cls, "Peak");
  const held = dayPeak(2); eq(held.runInfo.cls, "Extended"); ok(held.runInfo.capped); eq(held.trtMin, 118);
});
check("v3.3: ski weekend skips Friday and the long run without hiding anything; post-ski Monday trims rounds, not loads", () => {
  const pw = pwOf(1,2), ski = { skiWeekends:[pw] };
  const fri = day2(pw,"fri",ski), plain = day2(pw,"fri");
  eq(fri.skiSkip, "fri"); eq(JSON.stringify(fri.sections), JSON.stringify(plain.sections), "Friday content stays visible");
  eq(day2(pw,"sat",ski).skiSkip, "sat"); eq(day2(pw,"sun",ski).skiSkip, "sun");
  ok(day2(pw,"thu",ski).skiThu);
  const bump = day2(pw,"thu",{ ...ski, adjust:{ [pw]:{ thu:true } } }); eq(bump.runInfo.cls, "Medium"); ok(bump.runInfo.bumped);
  const mon = day2(pw+1,"mon",{ ...ski, adjust:{ [pw+1]:{ mon:true } } }), monPlain = day2(pw+1,"mon");
  ok(day2(pw+1,"mon",ski).afterSki);
  eq(items(mon).find(i => i.k === "interval").sets, 3); eq(items(monPlain).find(i => i.k === "interval").sets, 4);
  eq(marksOf(mon)[0].rx, marksOf(monPlain)[0].rx, "anchor load unchanged");
  eq(items(mon).find(i => i.label === "Single-Leg Tri-Set").meta, "2 rounds");
  eq(items(day2(pw+1,"mon",{ ...ski, uniOverride:3, adjust:{ [pw+1]:{ mon:true } } })).find(i => i.label === "Single-Leg Tri-Set").meta, "3 rounds", "private override keeps its value");
  const tue = day2(pw+1,"tue",{ ...ski, adjust:{ [pw+1]:{ mon:true } } }); eq(tue.runInfo.cls, "Flat"); ok(/Post-ski week/.test(text(tue)));
  eq(tue.title, "Quality Run — Strides (post-ski)"); eq(tue.runSegments[1].sec, 600);
});
check("v3.3: hill-sprint days never offer a motorized treadmill", () => {
  const src = read("_source/src/screens.jsx");
  ok(/k === "treadmill" && hasSprints \? "Indoors — Assault Runner or air bike"/.test(src));
  ok(/No all-out sprints on a motorized treadmill/.test(src));
});
check("v3.3: easy runs carry the effort cap", () => {
  for (const dw of ["thu","sat"]) ok(/conversational on flats, Z3 on climbs is fine, no planned Z4/.test(text(day2(pwOf(1,2),dw))), dw);
});
check("v3.3: every template resolves cleanly under every setup", () => {
  const combos = [{}, { lbWeeks:[9,10,11] }, { wall:false }, { powerMode:"clean" }, { lbWeeks:[10], wall:false, powerMode:"clean", uniOverride:3 }];
  for (const o of combos) for (let pw = 1; pw <= 12; pw++) for (const dw of KEYS){
    const t = text(day2(pw, dw, o));
    ok(!/\{\{\w+\}\}/.test(t) && !/"when"/.test(t), `pw ${pw} ${dw} ${JSON.stringify(o)}`);
  }
});
check("v3.3: shared content stays free of personal details and banned labels", () => {
  const t = read("programs/mountain-athlete-v3-3.json");
  for (const re of [/\bPT\b/, /physio/i, /rehab/i, /injur/i, /clinician/i, /\btrip\b/i, /Golden/i, /\bRIR\b/, /Strength Balance/i, /\bWeek \d/, /battle|rope/i])
    ok(!re.test(t), `pattern ${re}`);
  eq((t.match(/20\d\d-\d\d-\d\d/g) || []).join(), "2026-10-05");
});
check("v3.3: renamed variants keep their history; settings and start date carry over from v3.1", () => {
  const pull = marksOf(day2(1,"mon"))[1]; eq(pull.n, "Pull-Up (strict or banded)"); eq(pull.logAs, "Strict Pull-Up");
  eq(D.startDateFor(P2, { startDates:{ "mountain-athlete-v3":"2026-09-28" } }), "2026-09-28");
  eq(D.startDateFor(P2, { startDates:{ "mountain-athlete-v3":"2026-09-28", [P2.id]:"2026-10-12" } }), "2026-10-12");
  eq(R.normalizeSetup(P2, { setup:{ "mountain-athlete-v3":{ wall:false, uniOverride:"3" } } }).uniOverride, 3);
});
check("v3.3: e1RM comes from establish/test sets, a first logged session, or the athlete's newer entry", () => {
  const sets = (w, r) => ({ w:String(w), u:"lb", kg:D.toKg(w,"lb"), r:String(r), at:1 });
  const iso = (pw, dw) => S2.dates.find(x => S2.byIso[x].pw === pw && S2.byIso[x].key.endsWith(dw));
  let log = D.emptyLog();
  log = D.withSet(log, "Back Squat", iso(1,"mon"), sets(250, 3));                         /* establish triple */
  log = D.withSet(log, "Back Squat", iso(2,"mon"), sets(300, 6));                         /* ordinary day: ignored */
  const e = D.e1rmFor(log, S2, "Back Squat", iso(3,"mon"));
  ok(Math.abs(D.fromKg(e.kg,"lb") - 275) < 0.01 && e.src === "establish");
  log = D.withSet(log, "Back Squat", iso(6,"mon"), sets(270, 3));                         /* test week */
  eq(D.e1rmFor(log, S2, "Back Squat", iso(7,"mon")).src, "test");
  const fresh = D.withSet(D.emptyLog(), "Front Squat", iso(9,"mon"), sets(185, 5));      /* picked up mid-block */
  eq(D.e1rmFor(fresh, S2, "Front Squat", iso(9,"mon")).src, "logged");
  const manual = { kg:D.toKg(320,"lb"), date:"2099-01-01" };
  eq(D.e1rmFor(log, S2, "Back Squat", iso(7,"mon"), manual).src, "entered");
  eq(D.e1rmFor(D.emptyLog(), S2, "Barbell RDL", iso(8,"wed")), null);
});

if (failures.length){
  console.error(`\n${failures.length} check(s) failed (${passed} passed):\n`);
  failures.forEach(f => console.error(" ✗ " + f + "\n"));
  process.exit(1);
}
console.log(`All ${passed} checks passed.`);
