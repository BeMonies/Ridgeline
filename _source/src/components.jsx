/* ══════════════════ PRIMITIVES (identity v1.2) ══════════════════
   Focus rings come from one global :focus-visible rule in index.html. Orange appears only on the
   primary action and the selected date; teal carries section structure and timing; the rest is
   neutral. */

const Pressable = React.forwardRef(function Pressable(
  { as:Tag="button", children, style, onClick, ariaLabel, ariaCurrent, disabled, ...rest }, ref){
  return (
    <Tag ref={ref}
      onClick={disabled?undefined:onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      style={{ font:"inherit", border:"none", background:"none", cursor:disabled?"not-allowed":"pointer",
        color:"inherit", ...style }}
      {...rest}
    >{children}</Tag>
  );
});

const btnBase = { display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8, minHeight:48, minWidth:44,
  padding:"10px 16px", borderRadius:8, fontWeight:600, fontSize:16, lineHeight:"24px", textDecoration:"none",
  boxSizing:"border-box" };
const btnPrimary   = { ...btnBase, background:T.action, color:T.onAction, border:"1px solid transparent" };
const btnSecondary = { ...btnBase, background:T.surface, color:T.ink, border:`1px solid ${T.ruleStrong}` };
const textBtn = { minHeight:44, minWidth:44, padding:"8px 0", fontSize:14, fontWeight:600, color:T.ink,
  textDecoration:"underline", textUnderlineOffset:4, display:"inline-flex", alignItems:"center", gap:4 };
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/* Section heading: pale-teal band with a 3px side rule. Every section looks the same. */
function SectionLabel({ children, right }){
  return (
    <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:12, marginBottom:16,
      background:T.tealWash, color:T.tealDeep, padding:"10px 12px", borderLeft:`3px solid ${T.teal}`,
      borderRadius:"0 8px 8px 0" }}>
      <h2 style={{ margin:0, fontSize:20, lineHeight:"26px", fontWeight:650, letterSpacing:"-.015em" }}>{children}</h2>
      {right && <span style={{ fontSize:14, lineHeight:"20px", fontWeight:600, whiteSpace:"nowrap",
        fontVariantNumeric:"tabular-nums" }}>{right}</span>}
    </div>
  );
}

/* A labelled subsection (Power, WOD, Loaded lateral strength…). Quiet: no colour, a hairline above. */
function SubHead({ text, budget }){
  return (
    <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:12,
      borderTop:`1px solid ${T.rule}`, paddingTop:16 }}>
      <h3 style={{ margin:0, fontSize:16, lineHeight:"24px", fontWeight:650, color:T.ink }}>{text}</h3>
      {budget && <span style={{ fontSize:14, lineHeight:"20px", fontWeight:600, color:T.tealDeep, whiteSpace:"nowrap",
        fontVariantNumeric:"tabular-nums" }}>{budget}</span>}
    </div>
  );
}

/* Timing and rest are deep-teal lines, not stacks of pills. */
function TimingLine({ children, style }){
  return <p style={{ margin:0, fontSize:14, lineHeight:"20px", fontWeight:600, color:T.tealDeep,
    fontVariantNumeric:"tabular-nums", ...style }}>{children}</p>;
}
function RestChip({ children }){ return <TimingLine style={{ marginTop:8 }}>{cap(children)}</TimingLine>; }
function StructureLine({ children }){ return <TimingLine style={{ marginBottom:16 }}>{children}</TimingLine>; }

function Badge({ children, tone="flag" }){
  const map = {
    flag:  { bg:T.flagWash,  fg:T.flag },
    ember: { bg:T.emberWash, fg:T.emberDeep },
    alert: { bg:T.alertWash, fg:T.alert },
    info:  { bg:T.tealWash,  fg:T.tealDeep },
    ink:   { bg:T.tint,      fg:T.ink },
  }[tone];
  return (
    <span style={{ display:"inline-block", fontSize:14, lineHeight:"20px", fontWeight:600, color:map.fg,
      background:map.bg, padding:"2px 8px", borderRadius:999, whiteSpace:"nowrap", verticalAlign:"middle" }}>{children}</span>
  );
}

const noteStyle = { borderLeft:`2px solid ${T.rule}`, paddingLeft:12, color:T.muted, fontSize:14, lineHeight:"20px" };

/* ══════════════════ LOGGING ══════════════════
   Weight entry sits directly under the exercise it belongs to. Unit switching converts the
   display and never relabels the number; the value as entered and a kilogram value are both kept. */

const BASIS = {
  barbell:    "Barbell: total load including the bar",
  dumbbell:   "Dumbbell: load per dumbbell",
  kettlebell: "Kettlebell: weight of the bell",
  stack:      "Machine or cable: stack setting",
  sled:       "Sled: added load",
  ball:       "Ball: weight of the ball",
  carry:      "Carry: load per hand",
  belt:       "Belt squat: load on the belt",
};
const fieldLabel = { display:"grid", gap:6, fontSize:14, lineHeight:"20px", fontWeight:600, color:T.ink };
const fieldInput = { boxSizing:"border-box", width:"100%", minWidth:0, minHeight:48, border:`1px solid ${T.ruleStrong}`,
  borderRadius:8, padding:"10px 12px", background:T.surface, color:T.ink, fontSize:16, fontFamily:"inherit",
  fontVariantNumeric:"tabular-nums" };

function LogForm({ name, mode="load", date, cal, startFrom, hint, basis }){
  const ctx = React.useContext(LogContext);
  const uid = React.useId().replace(/:/g,"");
  const [msg, setMsg] = React.useState(null);           /* {ok, text} after a save attempt */
  const [errs, setErrs] = React.useState({});
  if (!ctx) return null;
  const { log, addSet, removeSet, drafts, setDraft, unit, setUnit } = ctx;
  const dk = draftKey(name, date), d = drafts[dk] || {};
  const sets = setsOf(entryOn(log, name, date));
  const last = lastBefore(log, name, date);
  const calSet = startFrom==="cal" ? latestCalibration(log, name) : null;
  const range = calSet ? startingRange(calSet) : null;
  const u = d.u || unit;
  const w = d.w != null ? d.w : "";
  const r = d.r != null ? d.r : (hint || "");
  const reps = mode==="reps";
  const repsLabel = (basis==="sled" || basis==="carry") ? "Rounds" : "Reps";

  const onWeight = v => {
    const clean = v.replace(/[^0-9.]/g,"");
    const n = parseFloat(clean);
    setDraft(dk, { ...d, w:clean, u, kg: isFinite(n) ? toKg(n, u) : null, orig:{ w:clean, u } });
    setErrs(e => ({ ...e, w:null })); setMsg(null);
  };
  const onUnit = nu => {
    setUnit(nu);
    /* convert what is showing; the exact kilogram value stays put so repeated switches don't drift */
    setDraft(dk, { ...d, u:nu, w: d.kg != null ? fmtNum(fromKg(d.kg, nu)) : (d.w || "") });
  };
  const onReps = v => { setDraft(dk, { ...d, r:v.replace(/[^0-9]/g,"") }); setErrs(e => ({ ...e, r:null })); setMsg(null); };

  const submit = e => {
    e.preventDefault();
    const en = {};
    if (!reps && (d.kg == null || w === "")) en.w = "Enter the weight you used.";
    if (!(parseInt(r,10) >= 1)) en.r = `Enter how many ${repsLabel.toLowerCase()} you did.`;
    setErrs(en);
    if (en.w || en.r){ setMsg(null); return; }
    const orig = d.orig || { w, u };
    const set = reps ? { w:"", u:"", kg:null, r:String(parseInt(r,10)), at:Date.now() }
                     : { w:orig.w, u:orig.u, kg:d.kg, r:String(parseInt(r,10)), at:Date.now() };
    const ok = addSet(name, date, set, cal);
    if (ok){ setDraft(dk, { r:hint || "", u }); setMsg({ ok:true, text:`Set ${sets.length+1} saved.` }); }
    else setMsg({ ok:false, text:"Could not save. Your entry is still here — try again." });
  };

  return (
    <form onSubmit={submit} aria-label={`Log ${name}`} noValidate
      style={{ marginTop:16, borderTop:`1px solid ${T.rule}`, paddingTop:12 }}>
      <p style={{ margin:0, fontSize:14, lineHeight:"20px", fontWeight:600 }}>{reps ? "Log reps" : "Log weight"}</p>
      {!reps && basis && BASIS[basis] && <p style={{ margin:"2px 0 0", fontSize:14, lineHeight:"20px", color:T.muted }}>{BASIS[basis]}</p>}
      {range && (
        <p style={{ margin:"8px 0 0", fontSize:14, lineHeight:"20px", color:T.ink }}>
          <b>Start {range[0]}–{range[1]} {range[2]}</b> · 5–10% below your calibration ({calSet.w} {calSet.u || "lb"})
        </p>
      )}
      {startFrom==="cal" && !range && (
        <p style={{ margin:"8px 0 0", fontSize:14, lineHeight:"20px" }}>Start 5–10% below your calibration load.</p>
      )}
      <div style={{ display:"grid", gridTemplateColumns: reps ? "1fr" : "minmax(70px,1fr) 76px minmax(64px,1fr)", gap:8, marginTop:8 }}>
        {!reps && (
          <label style={fieldLabel}>Weight
            <input inputMode="decimal" value={w} placeholder="0" onChange={e=>onWeight(e.target.value)}
              aria-invalid={errs.w ? "true" : undefined} aria-describedby={errs.w ? `${uid}w` : undefined} style={fieldInput}/>
          </label>
        )}
        {!reps && (
          <label style={fieldLabel}>Unit
            <select value={u} onChange={e=>onUnit(e.target.value)} style={{ ...fieldInput, padding:"8px" }}>
              <option value="lb">lb</option><option value="kg">kg</option>
            </select>
          </label>
        )}
        <label style={fieldLabel}>{repsLabel}
          <input inputMode="numeric" value={r} onChange={e=>onReps(e.target.value)}
            aria-invalid={errs.r ? "true" : undefined} aria-describedby={errs.r ? `${uid}r` : undefined} style={fieldInput}/>
        </label>
      </div>
      {errs.w && <p id={`${uid}w`} role="alert" style={{ margin:"6px 0 0", fontSize:14, color:T.alert, fontWeight:600 }}>⚠ {errs.w}</p>}
      {errs.r && <p id={`${uid}r`} role="alert" style={{ margin:"6px 0 0", fontSize:14, color:T.alert, fontWeight:600 }}>⚠ {errs.r}</p>}
      <Pressable as="button" type="submit" className="rl-btn" style={{ ...btnSecondary, width:"100%", marginTop:8 }}>Log set</Pressable>

      <p style={{ margin:"12px 0 0", fontSize:14, lineHeight:"20px", color:T.muted }}>
        {last
          ? <>Previous: <b style={{ color:T.ink }}>{setText(last, unit, mode)}</b> · {fmtShort(last.date)}{last.count>1 ? ` · ${last.count} sets` : ""}</>
          : (reps ? "No previous reps logged." : "No previous load logged.")}
      </p>
      {sets.length>0 && (
        <ol style={{ margin:"8px 0 0", paddingLeft:22, fontSize:14, lineHeight:"20px", fontVariantNumeric:"tabular-nums" }}>
          {sets.map((s,i)=>(
            <li key={i} style={{ padding:"2px 0" }}>
              <span style={{ fontWeight:600 }}>{setText(s, unit, mode)}</span>
              {s.at && isoOf(new Date(s.at)) !== date && <span style={{ color:T.muted }}> · logged {fmtShort(isoOf(new Date(s.at)))}</span>}{" "}
              <Pressable onClick={()=>{ removeSet(name, date, i); setMsg(null); }} ariaLabel={`Remove set ${i+1} of ${name}`}
                style={{ ...textBtn, minHeight:44, padding:"0 8px", fontSize:14, fontWeight:600, color:T.muted }}>Remove</Pressable>
            </li>
          ))}
        </ol>
      )}
      <p role="status" aria-live="polite" style={{ margin:msg ? "8px 0 0" : 0, fontSize:14, lineHeight:"20px", fontWeight:600,
        color: msg ? (msg.ok ? T.success : T.alert) : "inherit" }}>{msg ? (msg.ok ? "✓ " : "⚠ ") + msg.text : ""}</p>
    </form>
  );
}

/* ══════════════════ MOVEMENTS & STRUCTURES ══════════════════ */

function Movement({ it, date }){
  const { n, rx, cue, rest, iso:isolation, log, cal, startFrom, basis } = it;
  return (
    <div>
      <h4 style={{ margin:0, fontSize:18, lineHeight:"24px", fontWeight:600, color:T.ink, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <span>{n}</span>
        {isolation && <Badge tone="flag">Isolation</Badge>}
        {cal && <Badge tone="info">Record this</Badge>}
      </h4>
      {rx && <p style={{ margin:"4px 0 0", fontSize:16, lineHeight:"24px", fontVariantNumeric:"tabular-nums" }}>{rx}</p>}
      {rest && <RestChip>{rest}</RestChip>}
      {cue && <p style={{ ...noteStyle, margin:"8px 0 0" }}>{cue}</p>}
      {log && date && <LogForm name={n} mode={log==="reps"?"reps":"load"} date={date} cal={cal}
        startFrom={startFrom} hint={repsHint(rx)} basis={basis}/>}
    </div>
  );
}

const blockCard = { border:`1px solid ${T.rule}`, borderRadius:12, overflow:"hidden", background:T.surface };
const blockHead = { padding:"14px 16px", background:T.tealWash, color:T.tealDeep };
const eyebrow   = { margin:0, fontSize:14, lineHeight:"20px", fontWeight:600 };

function ItemList({ items, date, gap=24 }){
  return <div style={{ display:"flex", flexDirection:"column", gap }}>{items.map((it,i)=><Item key={i} it={it} date={date}/>)}</div>;
}

function Interval({ it, date }){
  return (
    <div style={blockCard}>
      <div style={blockHead}>
        <p style={eyebrow}>Interval structure</p>
        <p style={{ margin:0, fontSize:16, lineHeight:"24px", fontWeight:700, fontVariantNumeric:"tabular-nums" }}>
          Every {it.every} · {it.sets} {it.sets===1?"set":"sets"}
        </p>
      </div>
      <div style={{ padding:16 }}>
        {it.marks.map((m,i)=>(
          <div key={i}>
            {i>0 && <hr style={{ border:0, borderTop:`1px solid ${T.rule}`, margin:"20px 0" }}/>}
            <TimingLine style={{ marginBottom:4 }}>Start at {m.t} in each interval</TimingLine>
            <Movement it={m} date={date}/>
          </div>
        ))}
        <TimingLine style={{ marginTop:20 }}>{cap(it.after)}, then begin the next interval.</TimingLine>
      </div>
    </div>
  );
}

function Group({ it, date }){
  return (
    <div style={blockCard}>
      <div style={blockHead}>
        <p style={eyebrow}>{it.label}</p>
        {it.meta && <p style={{ margin:0, fontSize:16, lineHeight:"24px", fontWeight:700 }}>{it.meta}</p>}
      </div>
      <div style={{ padding:16 }}>
        <ItemList items={it.items} date={date}/>
        {it.rest && <TimingLine style={{ marginTop:20 }}>{cap(it.rest)}</TimingLine>}
      </div>
    </div>
  );
}

function Wod({ it, date }){
  return (
    <div style={blockCard}>
      <div style={blockHead}>
        <p style={eyebrow}>WOD</p>
        <p style={{ margin:0, fontSize:20, lineHeight:"26px", fontWeight:700 }}>{it.head}</p>
        {it.effort && <p style={{ margin:"2px 0 0", fontSize:14, lineHeight:"20px", fontWeight:600 }}>{it.effort}</p>}
      </div>
      <div style={{ padding:16 }}><ItemList items={it.items} date={date}/></div>
    </div>
  );
}

/* Golden Leaf archive structures, kept so the archive renders as trained. */
function LinkedPair({ it, complex, date }){
  return (
    <div style={blockCard}>
      <div style={blockHead}>
        <p style={eyebrow}>{complex ? "Contrast Complex" : "Contrast Pair"}{complex ? " · Explosive" : ""}{it.resolution ? ` · ${it.resolution}` : ""}</p>
      </div>
      <div style={{ padding:16 }}>
        <Movement it={it.a} date={date}/>
        <TimingLine style={{ margin:"16px 0" }}>No rest between the two →</TimingLine>
        <Movement it={it.b} date={date}/>
        <RestChip>{it.rest}</RestChip>
      </div>
    </div>
  );
}
function ClusterSet({ it }){
  return (
    <div style={blockCard}>
      <div style={blockHead}><p style={eyebrow}>Cluster set</p></div>
      <div style={{ padding:16 }}>
        <h4 style={{ margin:0, fontSize:18, lineHeight:"24px", fontWeight:600 }}>{it.n}</h4>
        <p style={{ margin:"4px 0 0", fontSize:16, lineHeight:"24px" }}>{it.groups}  {it.rx}</p>
        <RestChip>{it.intra}</RestChip>
        <RestChip>{it.post}</RestChip>
      </div>
    </div>
  );
}

/* Notes. Required setup and safety guidance stays open; optional alternatives sit in a quiet
   disclosure; rules and adjustments are plain notes beside the work they change. */
const FLAG = {
  isolation:  { label:"Isolation",       warn:true },
  stoprule:   { label:"Stop rule",       warn:true },
  descent:    { label:"Descent",         warn:true },
  setup:      { label:"Setup" },
  scaling:    { label:"Scaling" },
  regression: { label:"Adjustment" },
};
function Flag({ kind, text }){
  if (kind==="fallback"){
    return (
      <details style={{ fontSize:14, lineHeight:"20px" }}>
        <summary style={{ minHeight:44, display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontWeight:600, color:T.ink }}>
          Alternative exercise or setup
        </summary>
        <p style={{ margin:"0 0 12px", color:T.muted }}>{text}</p>
      </details>
    );
  }
  const f = FLAG[kind] || { label:cap(kind) };
  if (f.warn){
    return (
      <div role="note" style={{ background:T.flagWash, color:T.flag, borderRadius:8, padding:12, fontSize:14, lineHeight:"20px" }}>
        <b>⚠ {f.label}: </b>{text}
      </div>
    );
  }
  return <p role="note" style={{ ...noteStyle, margin:0 }}><b style={{ color:T.ink }}>{f.label}: </b>{text}</p>;
}

function Note({ text }){ return <p style={{ ...noteStyle, margin:0 }}>{text}</p>; }

function Item({ it, date }){
  switch (it.k){
    case "interval": return <Interval it={it} date={date}/>;
    case "group":    return <Group it={it} date={date}/>;
    case "wod":      return <Wod it={it} date={date}/>;
    case "pair":     return <LinkedPair it={it} date={date}/>;
    case "complex":  return <LinkedPair it={it} date={date} complex/>;
    case "cluster":  return <ClusterSet it={it}/>;
    case "flag":     return <Flag kind={it.kind} text={it.text}/>;
    case "note":     return <Note text={it.text}/>;
    case "sub":      return <SubHead text={it.text} budget={it.budget}/>;
    default:         return <Movement it={it} date={date}/>;
  }
}

function Section({ s, date }){
  return (
    <section style={{ marginBottom:32 }}>
      <SectionLabel right={s.budget}>{s.title}</SectionLabel>
      {s.meta && <StructureLine>{s.meta}</StructureLine>}
      <ItemList items={s.items} date={date}/>
      {s.rest && <RestChip>{s.rest}</RestChip>}
    </section>
  );
}

/* The zones a run uses: intent, effort cue, and the athlete's own boundaries if they set them. */
function ZoneKey({ zk }){
  if (!zk || !zk.zones || !zk.zones.length) return null;
  return (
    <section aria-label="Zones used in this run" style={{ marginBottom:32 }}>
      <SectionLabel>Zones</SectionLabel>
      <p style={{ margin:"0 0 8px", fontSize:14, lineHeight:"20px", color:T.muted }}>
        {zk.profile ? `Profile: ${zk.profile}` : "No zone profile set, so heart-rate boundaries show as not set. Add yours in Setup."}
      </p>
      {zk.zones.map(z=>(
        <div key={z.z} style={{ display:"grid", gridTemplateColumns:"44px minmax(0,1fr)", gap:12, padding:"12px 0", borderTop:`1px solid ${T.rule}` }}>
          <span style={{ fontWeight:700, fontSize:14, color:T.tealDeep, background:T.tealWash, borderRadius:6,
            padding:"4px 0", textAlign:"center", height:"fit-content" }}>{z.z}</span>
          <div>
            <h4 style={{ margin:0, fontSize:18, lineHeight:"24px", fontWeight:600 }}>{z.name}</h4>
            <p style={{ margin:"2px 0 0", fontSize:16, lineHeight:"24px" }}>{z.cue}</p>
            <p style={{ margin:"4px 0 0", fontSize:14, lineHeight:"20px", fontWeight:z.hr?700:400, color:z.hr?T.ink:T.muted,
              fontVariantNumeric:"tabular-nums" }}>{z.hr || "Boundaries not set"}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

/* Completion belongs to the planned session; the performance time is recorded separately. */
function CompleteBar({ iso }){
  const ctx = React.useContext(LogContext);
  const [err, setErr] = React.useState("");
  if (!ctx) return null;
  const done = (ctx.log.done || {})[iso];
  const toggle = () => { setErr(ctx.setDone(iso, !done) ? "" : "Could not save. Try again."); };
  return (
    <div style={{ marginTop:8 }}>
      {done ? (
        <div role="status" style={{ background:T.successWash, color:T.success, borderRadius:8, padding:12, fontSize:14, lineHeight:"20px" }}>
          <b>✓ Session complete</b>
          <div>Planned {fmtLong(iso)} · performed {fmtLong(isoOf(new Date(done.at)))} at {new Date(done.at).toLocaleTimeString([], { hour:"numeric", minute:"2-digit" })}</div>
        </div>
      ) : (
        <Pressable onClick={toggle} className="rl-btn rl-primary" style={{ ...btnPrimary, width:"100%" }}>Mark session complete</Pressable>
      )}
      {done && <Pressable onClick={toggle} style={{ ...textBtn, marginTop:4 }}>Mark as not complete</Pressable>}
      {err && <p role="alert" style={{ margin:"8px 0 0", fontSize:14, color:T.alert, fontWeight:600 }}>⚠ {err}</p>}
    </div>
  );
}

function EndOfSession(){
  return (
    <p style={{ margin:"32px 0 0", borderTop:`1px solid ${T.rule}`, paddingTop:20, textAlign:"center", fontSize:14, color:T.muted }}>
      End of session
    </p>
  );
}
