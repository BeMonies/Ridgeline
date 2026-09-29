/* ══════════════════ PRIMITIVES ══════════════════ */

const Pressable = React.forwardRef(function Pressable(
  { as:Tag="button", children, style, onClick, ariaLabel, ariaCurrent, disabled, ...rest }, ref){
  const [f,setF] = React.useState(false);
  const [p,setP] = React.useState(false);
  return (
    <Tag ref={ref}
      onClick={disabled?undefined:onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      onPointerDown={()=>setP(true)} onPointerUp={()=>setP(false)} onPointerLeave={()=>setP(false)}
      style={{
        font:"inherit", border:"none", background:"none", cursor:disabled?"not-allowed":"pointer",
        color:"inherit", transition:"transform 80ms ease, background 120ms ease",
        transform:p?"scale(0.98)":"scale(1)",
        ...(f?focusRing:{}),
        ...style,
      }}
      {...rest}
    >{children}</Tag>
  );
});

function SectionLabel({ children, tone="ink" }){
  return (
    <div style={{borderBottom:`2px solid ${tone==="teal"?T.teal:T.ruleStrong}`, paddingBottom:7, marginBottom:10}}>
      <h3 style={{margin:0,fontSize:11.5,letterSpacing:".15em",textTransform:"uppercase",
        fontWeight:800,color:tone==="teal"?T.tealDeep:T.ink}}>{children}</h3>
    </div>
  );
}

/* Teal is reserved for rest and set-structure values. */
function RestChip({ children }){
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:6,
      background:T.tealWash,borderRadius:5,padding:"4px 9px"}}>
      <span aria-hidden="true" style={{width:5,height:5,borderRadius:99,background:T.teal,flexShrink:0}}/>
      <span style={{fontFamily:MONO,fontSize:13.5,fontWeight:700,color:T.tealDeep,
        letterSpacing:"-.01em",fontVariantNumeric:"tabular-nums"}}>{children}</span>
    </div>
  );
}

function StructureLine({ children }){
  return <div style={{fontSize:14,fontWeight:700,color:T.tealDeep,marginBottom:9,letterSpacing:".01em"}}>{children}</div>;
}

function Badge({ children, tone="flag" }){
  const map = {
    flag:  { bg:T.flagWash,  fg:T.flag,      bd:T.flag },
    ember: { bg:T.emberWash, fg:T.emberDeep, bd:T.ember },
    alert: { bg:T.alertWash, fg:T.alert,     bd:T.alert },
    ink:   { bg:T.tint,      fg:T.ink,       bd:T.ink },
  }[tone];
  return (
    <span style={{display:"inline-block",fontSize:10.5,fontWeight:700,letterSpacing:".08em",
      textTransform:"uppercase",color:map.fg,background:map.bg,border:`1px solid ${map.bd}33`,
      padding:"3px 8px",borderRadius:99,whiteSpace:"nowrap",verticalAlign:"middle"}}>{children}</span>
  );
}

/* ══════════════════ LOGGING ══════════════════
   Designed around recall, not record-keeping: the job is "where do I start
   today," so the last logged number sits directly under the prescription. */

function LogRow({ name, mode="load", date, cal, startFrom, hint }){
  const ctx = React.useContext(LogContext);
  if (!ctx) return null;
  const { log, setEntry, today } = ctx;
  const cur  = entryOn(log, name, date) || {};
  const last = lastBefore(log, name, date);
  const calE = startFrom==="cal" ? latestCalibration(log, name) : null;
  const range = calE ? startingRange(calE.w) : null;
  const editable = date <= today;

  const commit = (patch) => {
    const next = { ...cur, ...patch };
    const empty = !(next.w && String(next.w).trim()) && !(next.r && String(next.r).trim());
    setEntry(name, date, empty ? null : { w: next.w||"", r: next.r||"", cal: !!cal, t: Date.now() });
  };
  const label = n => `${n} for ${name}`;
  const inputStyle = {
    width:"100%", boxSizing:"border-box", height:42, borderRadius:8,
    border:`1.5px solid ${T.ruleStrong}`, background:T.surface, color:T.ink,
    fontFamily:MONO, fontSize:17, fontWeight:600, padding:"0 10px",
    fontVariantNumeric:"tabular-nums", outlineColor:T.ink,
  };
  const has = cur.w || cur.r;

  return (
    <div style={{marginTop:8,padding:"9px 10px 10px",borderRadius:8,background:T.surface,
      border:`1px solid ${T.rule}`}}>
      {startFrom==="cal" && (
        <div style={{fontSize:12.5,color:T.body,marginBottom:6,lineHeight:1.4}}>
          {range
            ? <><b style={{color:T.ink}}>Start {range[0]}–{range[1]} lb</b> · 5–10% below calibration ({calE.w} lb)</>
            : <>Start 5–10% below your calibration load.</>}
        </div>
      )}
      <div style={{fontSize:12.5,color:T.muted,marginBottom:editable?7:0,display:"flex",gap:6,flexWrap:"wrap",alignItems:"baseline"}}>
        <span style={{fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",fontSize:10.5}}>Last</span>
        {last
          ? <span style={{fontFamily:MONO,color:T.ink,fontWeight:600}}>
              {last.w ? `${last.w} lb` : ""}{last.w && last.r ? " × " : ""}{last.r ? `${last.r}${mode==="reps"?" reps":""}` : ""}
              <span style={{color:T.muted,fontWeight:500,fontFamily:SANS}}> · {fmtShort(last.date)}{last.cal ? " · 📝" : ""}</span>
            </span>
          : <span>nothing logged yet</span>}
      </div>
      {editable ? (
        <div style={{display:"grid",gridTemplateColumns:mode==="reps"?"1fr auto":"1fr 1fr auto",gap:8,alignItems:"center"}}>
          {mode!=="reps" && (
            <label style={{position:"relative",display:"block"}}>
              <input aria-label={label("Weight in pounds")} inputMode="decimal" type="text"
                value={cur.w||""} placeholder="lb"
                onChange={e=>commit({ w:e.target.value.replace(/[^0-9.]/g,"") })}
                style={inputStyle}/>
            </label>
          )}
          <label style={{display:"block"}}>
            <input aria-label={label("Reps")} inputMode="numeric" type="text"
              value={cur.r||""} placeholder={hint ? `${hint} reps` : "reps"}
              onChange={e=>commit({ r:e.target.value.replace(/[^0-9]/g,"") })}
              style={inputStyle}/>
          </label>
          <span aria-live="polite" style={{fontSize:12,fontWeight:700,minWidth:48,textAlign:"right",
            color:has?T.body:T.faint}}>{has ? "Saved ✓" : cal ? "📝" : ""}</span>
        </div>
      ) : (
        <div style={{fontSize:12,color:T.faint,marginTop:4}}>Logging opens on the day.</div>
      )}
    </div>
  );
}

/* ══════════════════ MOVEMENTS & STRUCTURES ══════════════════ */

function Movement({ it, dense, date }){
  const { n, rx, cue, rest, iso:isolation, log, cal, startFrom } = it;
  return (
    <div style={{padding:dense?"7px 0":"9px 0"}}>
      <div style={{fontSize:15.5,fontWeight:600,color:T.ink,lineHeight:1.3,display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
        <span>{n}</span>
        {isolation && <Badge tone="alert">Isolation</Badge>}
        {cal && <Badge tone="flag">📝 Record</Badge>}
      </div>
      {rx && <div style={{fontFamily:MONO,fontSize:14.5,fontWeight:500,color:T.body,
        marginTop:3,letterSpacing:"-.01em",fontVariantNumeric:"tabular-nums"}}>{rx}</div>}
      {rest && <RestChip>{rest}</RestChip>}
      {cue && <div style={{fontSize:13.5,color:T.muted,marginTop:6,paddingLeft:10,
        borderLeft:`2px solid ${T.rule}`,lineHeight:1.45}}>{cue}</div>}
      {log && date && <LogRow name={n} mode={log==="reps"?"reps":"load"} date={date} cal={cal}
        startFrom={startFrom} hint={repsHint(rx)}/>}
    </div>
  );
}

/* Structural blocks use ember; the timing inside them uses teal. */
function StructureCard({ label, extra, children, border=`3px solid ${T.ember}` }){
  return (
    <div style={{background:T.tint,borderRadius:8,padding:"11px 13px",borderLeft:border,margin:"4px 0 10px"}}>
      {(label||extra) && (
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,flexWrap:"wrap"}}>
          {label && <span style={{fontSize:11,letterSpacing:".1em",textTransform:"uppercase",
            fontWeight:800,color:T.emberDeep}}>{label}</span>}
          {extra}
        </div>
      )}
      {children}
    </div>
  );
}

function Interval({ it, date }){
  return (
    <StructureCard label="Interval" extra={
      <span style={{fontFamily:MONO,fontSize:13.5,fontWeight:700,color:T.tealDeep}}>
        Every {it.every} × {it.sets} sets
      </span>}>
      {it.marks.map((m,i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"52px 1fr",gap:8,alignItems:"start",
          paddingTop:i?8:2,marginTop:i?8:0,borderTop:i?`1px solid ${T.rule}`:"none"}}>
          <span style={{fontFamily:MONO,fontSize:13.5,fontWeight:800,color:T.tealDeep,background:T.tealWash,
            borderRadius:5,padding:"4px 0",textAlign:"center",marginTop:8}} aria-label={`Start at ${m.t}`}>{m.t}</span>
          <Movement it={m} date={date} dense/>
        </div>
      ))}
      <RestChip>{it.after}</RestChip>
    </StructureCard>
  );
}

function Group({ it, date }){
  return (
    <StructureCard label={it.label}>
      {it.meta && <StructureLine>{it.meta}</StructureLine>}
      {it.items.map((x,i)=><Item key={i} it={x} date={date}/>)}
      {it.rest && <RestChip>{it.rest}</RestChip>}
    </StructureCard>
  );
}

function Wod({ it, date }){
  return (
    <StructureCard label="WOD">
      <div style={{fontSize:21,fontWeight:750,color:T.ink,letterSpacing:"-.01em",lineHeight:1.2}}>{it.head}</div>
      {it.effort && <div style={{fontSize:13.5,fontWeight:700,color:T.tealDeep,marginTop:3}}>{it.effort}</div>}
      <div style={{marginTop:4}}>{it.items.map((x,i)=><Item key={i} it={x} date={date} dense/>)}</div>
    </StructureCard>
  );
}

/* Golden Leaf archive structures, kept so the archive renders exactly as trained. */
function LinkedPair({ it, complex, date }){
  return (
    <div style={{margin:"4px 0 10px"}}>
      <StructureCard label={complex ? "Contrast Complex" : "Contrast Pair"}
        border={complex ? `6px double ${T.ember}` : `3px solid ${T.ember}`}
        extra={<>
          {complex && <Badge tone="ember">Explosive</Badge>}
          {it.resolution && <Badge tone="ember">{it.resolution}</Badge>}
        </>}>
        <Movement it={it.a} date={date} dense/>
        <div style={{display:"flex",alignItems:"center",gap:8,margin:"7px 0"}}>
          <div style={{flex:1,height:1,background:T.rule}}/>
          <span style={{fontSize:11,fontWeight:800,letterSpacing:".07em",textTransform:"uppercase",
            color:T.emberDeep,background:T.emberWash,padding:"4px 10px",borderRadius:99,whiteSpace:"nowrap"}}>no rest →</span>
          <div style={{flex:1,height:1,background:T.rule}}/>
        </div>
        <Movement it={it.b} date={date} dense/>
      </StructureCard>
      <RestChip>{it.rest}</RestChip>
    </div>
  );
}

function ClusterSet({ it }){
  return (
    <div style={{margin:"4px 0 10px"}}>
      <StructureCard label="Cluster Set" border={`3px dashed ${T.ember}`}>
        <div style={{fontSize:15.5,fontWeight:600,color:T.ink}}>{it.n}</div>
        <div style={{fontFamily:MONO,fontSize:15,fontWeight:600,color:T.body,marginTop:4}}>{it.groups}  {it.rx}</div>
        <RestChip>{it.intra}</RestChip>
      </StructureCard>
      <RestChip>{it.post}</RestChip>
    </div>
  );
}

/* Red is reserved for the instructions most likely to be skimmed and most
   costly to miss. Fallbacks and scaling rules are instructions, not alarms. */
const FLAG = {
  isolation:  { label:"Isolation",       tone:"alert" },
  stoprule:   { label:"Stop rule",       tone:"alert" },
  descent:    { label:"Descent",         tone:"alert" },
  fallback:   { label:"Fallback",        tone:"ink" },
  scaling:    { label:"Scaling rule",    tone:"ink" },
  regression: { label:"Regression rule", tone:"ink" },
};
function Flag({ kind, text }){
  const f = FLAG[kind] || { label:kind, tone:"ink" };
  const alert = f.tone==="alert";
  return (
    <div role="note" style={{background:alert?T.alertWash:T.tint,
      borderLeft:`3px solid ${alert?T.alert:T.ink}`,borderRadius:6,padding:"9px 11px",margin:"8px 0"}}>
      <div style={{fontSize:10.5,letterSpacing:".1em",textTransform:"uppercase",fontWeight:800,
        color:alert?T.alert:T.ink,marginBottom:3}}>{f.label}</div>
      <div style={{fontSize:13.5,color:T.body,lineHeight:1.45}}>{text}</div>
    </div>
  );
}

function Note({ text }){
  return <div style={{fontSize:13.5,color:T.muted,fontStyle:"italic",padding:"8px 0",lineHeight:1.45}}>{text}</div>;
}

function Item({ it, date, dense }){
  switch (it.k){
    case "interval": return <Interval it={it} date={date}/>;
    case "group":    return <Group it={it} date={date}/>;
    case "wod":      return <Wod it={it} date={date}/>;
    case "pair":     return <LinkedPair it={it} date={date}/>;
    case "complex":  return <LinkedPair it={it} date={date} complex/>;
    case "cluster":  return <ClusterSet it={it}/>;
    case "flag":     return <Flag kind={it.kind} text={it.text}/>;
    case "note":     return <Note text={it.text}/>;
    default:         return <Movement it={it} date={date} dense={dense}/>;
  }
}

function Section({ s, date, tone }){
  return (
    <section style={{marginBottom:24}}>
      <SectionLabel tone={tone}>{s.title}</SectionLabel>
      {s.meta && <StructureLine>{s.meta}</StructureLine>}
      <div>{s.items.map((it,i)=><Item key={i} it={it} date={date}/>)}</div>
      {s.rest && <RestChip>{s.rest}</RestChip>}
    </section>
  );
}

function EndOfSession(){
  return (
    <div style={{textAlign:"center",padding:"18px 0 4px",borderTop:`1px solid ${T.rule}`,
      fontSize:12,color:T.faint,letterSpacing:".08em",textTransform:"uppercase",fontWeight:600}}>
      End of session
    </div>
  );
}
