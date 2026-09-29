/* ══════════════════ CALENDAR ══════════════════ */

function Calendar({ sched, month, today, current, onPick, compact }){
  const days = sched.dates.filter(iso => iso.startsWith(month));
  if (!days.length) return null;
  const lead = weekdayIdx(days[0]);
  const cells = [];
  let prev = null;
  for (const iso of days){
    if (prev){ let gap = addDays(prev,1); while (gap < iso){ cells.push({blank:gap}); gap = addDays(gap,1); } }
    cells.push({ iso }); prev = iso;
  }
  const h = compact ? 36 : 40;
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5,marginBottom:6}} aria-hidden="true">
        {DAY_ABBR.map(d=><div key={d} style={{textAlign:"center",fontSize:10.5,fontWeight:700,color:T.faint,letterSpacing:".06em"}}>{d[0]}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5}}>
        {Array.from({length:lead}).map((_,i)=><div key={"l"+i}/>)}
        {cells.map(c=>{
          if (c.blank) return <div key={c.blank}/>;
          const d = sched.byIso[c.iso];
          const isToday = c.iso===today, isCur = c.iso===current;
          const bg = isCur ? T.ink : isToday ? T.ember : T.tint;
          const fg = (isCur||isToday) ? "#fff" : T.body;
          return (
            <Pressable key={c.iso} onClick={()=>onPick(c.iso)}
              ariaLabel={`${fmtLong(c.iso)} — ${d.title}${d.optional?" (optional)":""}`}
              ariaCurrent={isToday?"date":undefined}
              style={{height:h,borderRadius:6,background:bg,color:fg,fontFamily:MONO,fontSize:14,
                fontWeight:(isCur||isToday)?700:500,display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:isToday?`0 0 0 2px ${T.paper}, 0 0 0 3.5px ${T.ember}`:"none"}}>
              {dateOf(c.iso).getDate()}
            </Pressable>
          );
        })}
      </div>
    </div>
  );
}

function MonthTabs({ months, month, setMonth }){
  return (
    <div role="tablist" aria-label="Select month" style={{display:"flex",gap:20,marginBottom:14,flexWrap:"wrap"}}>
      {months.map(m=>{
        const on = month===m;
        return (
          <Pressable key={m} role="tab" aria-selected={on} onClick={()=>setMonth(m)}
            style={{fontSize:14.5,fontWeight:on?700:500,color:on?T.ink:T.muted,paddingBottom:5,
              borderBottom:on?`2px solid ${T.ember}`:"2px solid transparent",borderRadius:2}}>
            {MONTH_FULL[Number(m.slice(5,7))-1]}
          </Pressable>
        );
      })}
    </div>
  );
}

/* ══════════════════ HOME ══════════════════ */

function Home({ program, sched, index, today, month, setMonth, onOpen, onTravel, hasTravel }){
  const sum = summaryFor(sched, program, today);
  const d = sched.byIso[sum.iso];
  const archived = program.status==="archived";
  const archive = (index.programs||[]).filter(p => p.status==="archived" && p.id!==program.id);
  return (
    <div>
      <header style={{position:"relative",overflow:"hidden",background:T.ink,
        padding:"22px 16px 24px",borderBottom:`3px solid ${T.ember}`}}>
        <Topo opacity={0.30} color={T.ember}/>
        <div style={{position:"absolute",inset:0,
          background:"linear-gradient(180deg, rgba(27,36,38,.55) 0%, rgba(27,36,38,.80) 62%, rgba(27,36,38,.94) 100%)"}}/>
        <div style={{position:"relative"}}>
          <Wordmark height={32}/>
          <div style={{fontSize:11.5,color:"rgba(255,255,255,.55)",marginTop:10,letterSpacing:".13em",
            textTransform:"uppercase",fontWeight:600}}>
            {program.name} <span style={{color:"rgba(255,255,255,.3)"}}>·</span>{" "}
            {archived ? "Archived" : `From ${fmtShort(sched.start)}`}
          </div>
        </div>
      </header>

      <main style={{padding:"18px 16px 28px"}}>
        {archived && (
          <a href="./" style={{display:"block",background:T.flagWash,borderLeft:`3px solid ${T.flag}`,
            borderRadius:6,padding:"10px 12px",marginBottom:16,fontSize:13.5,color:T.body,textDecoration:"none"}}>
            You're viewing an archived program. <b style={{color:T.ink}}>Back to the current program →</b>
          </a>
        )}

        {sum.mode==="unpublished" || sum.mode==="gap" ? (
          <div style={{border:`2px solid ${T.ruleStrong}`,borderRadius:12,padding:"16px",marginBottom:24,background:T.surface}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:T.muted,marginBottom:6}}>Today</div>
            <div style={{fontSize:19,fontWeight:650,color:T.ink}}>The next block isn't loaded yet</div>
            <div style={{fontSize:14,color:T.body,marginTop:5,lineHeight:1.45}}>
              This program is published through {fmtLong(sched.last)}. New sessions appear here as soon as they're added.
            </div>
          </div>
        ) : (
          <Pressable onClick={()=>onOpen(sum.iso)}
            ariaLabel={sum.mode==="end" ? program.endCard : `Open ${fmtLong(sum.iso)} — ${d.title}`}
            style={{display:"block",width:"100%",textAlign:"left",background:T.surface,
              border:`2px solid ${T.ink}`,borderRadius:12,padding:"16px 16px 14px",marginBottom:24}}>
            {sum.mode==="end" ? (
              <div style={{fontSize:30,fontWeight:600,color:T.ink,letterSpacing:"-.02em"}}>{program.endCard}</div>
            ) : (
              <>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:T.ember,marginBottom:6}}>
                  {sum.mode==="before" ? "Program begins" : "Today"}
                </div>
                <div style={{fontSize:21,fontWeight:650,color:T.ink,letterSpacing:"-.015em"}}>{fmtLong(sum.iso)}</div>
                <div style={{fontSize:15,color:T.body,marginTop:5,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontWeight:600,color:T.ink}}>{d.title}</span>
                  {d.trt && <span style={{fontFamily:MONO,color:T.tealDeep,fontWeight:800,fontSize:13.5,
                    background:T.tealWash,padding:"2px 8px",borderRadius:5}}>TRT {d.trt}</span>}
                  {d.deload && <Badge tone="ink">Deload</Badge>}
                  {d.optional && <Badge>Optional</Badge>}
                </div>
              </>
            )}
            <div style={{fontSize:12.5,color:T.muted,marginTop:12}}>Open routine <span aria-hidden="true">→</span></div>
          </Pressable>
        )}

        <MonthTabs months={sched.months} month={month} setMonth={setMonth}/>
        <Calendar sched={sched} month={month} today={today} current={null} onPick={onOpen}/>
        <p style={{fontSize:12,color:T.faint,marginTop:12,lineHeight:1.5}}>
          {archived
            ? `${fmtLong(sched.first)} – ${fmtLong(sched.last)}.`
            : `Published through ${fmtLong(sched.last)}. The next block appears here once it's written.`}
        </p>

        {hasTravel && (
          <Pressable onClick={onTravel}
            style={{display:"block",width:"100%",textAlign:"left",marginTop:22,background:T.tint,borderRadius:10,padding:"14px"}}>
            <div style={{fontSize:14.5,fontWeight:600,color:T.ink}}>Travel workouts</div>
            <div style={{fontSize:12.5,color:T.muted,marginTop:2}}>Seven sessions · on demand, any day</div>
          </Pressable>
        )}

        <LogPanel/>

        {archive.length>0 && (
          <div style={{marginTop:22,paddingTop:14,borderTop:`1px solid ${T.rule}`,fontSize:12.5,color:T.muted}}>
            <span style={{fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",fontSize:10.5}}>Archive</span>
            {archive.map(p=>(
              <a key={p.id} href={`?p=${encodeURIComponent(p.id)}`}
                style={{display:"block",marginTop:6,color:T.body,fontWeight:600,textDecoration:"none"}}>
                {p.name} <span style={{color:T.faint,fontWeight:500}}>· {p.dates}</span> →
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/* ══════════════════ LOG BACKUP ══════════════════
   The log lives on this phone only. Export is the safety net. */

function LogPanel(){
  const { log, replaceLog } = React.useContext(LogContext);
  const [msg, setMsg] = React.useState("");
  const fileRef = React.useRef(null);
  const n = countEntries(log);

  const doExport = async () => {
    const name = `ridgeline-log-${todayIso()}.json`;
    const text = JSON.stringify({ app:"ridgeline", exported:new Date().toISOString(), log }, null, 1);
    try {
      const file = new File([text], name, { type:"application/json" });
      if (navigator.canShare && navigator.canShare({ files:[file] })){
        await navigator.share({ files:[file], title:"Ridgeline training log" });
        setMsg("Backup shared."); return;
      }
    } catch (e) { if (e && e.name==="AbortError") return; }
    const url = URL.createObjectURL(new Blob([text], { type:"application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    setMsg("Backup downloaded.");
  };

  const doImport = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const incoming = data.log || data;
      if (!incoming || !incoming.entries) throw new Error("not a Ridgeline log");
      const merged = { v:1, entries:{ ...log.entries } };
      let added = 0;
      for (const [k, byDate] of Object.entries(incoming.entries)){
        merged.entries[k] = { ...(merged.entries[k]||{}) };
        for (const [d, entry] of Object.entries(byDate)){
          const mine = merged.entries[k][d];
          if (!mine || (entry.t||0) > (mine.t||0)){ merged.entries[k][d] = entry; added++; }
        }
      }
      replaceLog(merged);
      setMsg(`Restored ${added} ${added===1?"entry":"entries"}.`);
    } catch { setMsg("That file isn't a Ridgeline backup."); }
  };

  const btn = { fontSize:13,fontWeight:600,color:T.ink,background:T.surface,border:`1px solid ${T.ruleStrong}`,
    borderRadius:8,padding:"9px 12px",minHeight:40 };
  return (
    <div style={{marginTop:22,paddingTop:14,borderTop:`1px solid ${T.rule}`}}>
      <div style={{fontSize:14,fontWeight:600,color:T.ink}}>Training log</div>
      <div style={{fontSize:12.5,color:T.muted,marginTop:2,lineHeight:1.45}}>
        {n ? `${n} ${n===1?"entry":"entries"} saved on this phone.` : "Nothing logged yet."} Back it up now and then — deleting the app icon deletes the log.
      </div>
      <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
        <Pressable onClick={doExport} disabled={!n} style={{...btn,opacity:n?1:.5}}>Export backup</Pressable>
        <Pressable onClick={()=>fileRef.current && fileRef.current.click()} style={btn}>Restore</Pressable>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={doImport}
          style={{display:"none"}} aria-hidden="true" tabIndex={-1}/>
      </div>
      {msg && <div aria-live="polite" style={{fontSize:12.5,color:T.body,marginTop:8}}>{msg}</div>}
    </div>
  );
}

/* ══════════════════ DAY VIEWS ══════════════════ */

function StickyHeader({ left, center, right, sub }){
  return (
    <header style={{position:"sticky",top:0,zIndex:10,background:T.surface,borderBottom:`2px solid ${T.ink}`,padding:"10px 12px 11px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        {left}<div style={{fontSize:14.5,fontWeight:700,color:T.ink,textAlign:"center"}}>{center}</div>{right}
      </div>
      {sub && <div style={{textAlign:"center",fontSize:13.5,marginTop:3,display:"flex",justifyContent:"center",
        alignItems:"center",gap:8,flexWrap:"wrap"}}>{sub}</div>}
    </header>
  );
}
const navBtn = { fontSize:13,fontWeight:600,color:T.body,padding:"8px",borderRadius:6,minHeight:40,
  display:"flex",alignItems:"center",gap:4 };

function DayHeader({ d, today, onHome, onPicker }){
  const bare = d.type==="rest" || d.type==="race";
  return (
    <StickyHeader
      left={<Pressable onClick={onHome} ariaLabel="Back to calendar" style={navBtn}><span aria-hidden="true">◀</span> Home</Pressable>}
      center={fmtLong(d.iso)}
      right={<Pressable onClick={onPicker} ariaLabel="Choose a different date" style={navBtn}>Date <span aria-hidden="true">▾</span></Pressable>}
      sub={bare ? null : <>
        {d.iso===today && <span style={{fontWeight:700,color:T.ember,fontSize:11,letterSpacing:".1em",textTransform:"uppercase"}}>Today</span>}
        <span style={{fontWeight:600,color:T.ink}}>{d.title}</span>
        {d.trt && <span style={{fontFamily:MONO,color:T.tealDeep,fontWeight:800,fontSize:14,background:T.tealWash,
          padding:"2px 8px",borderRadius:5}}>TRT {d.trt}</span>}
      </>}
    />
  );
}

function DayBadges({ d }){
  const any = d.deload || d.optional || d.bonus || d.hotel || d.calibration;
  if (!any) return null;
  return (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      {d.calibration && <Badge tone="flag">📝 Calibration</Badge>}
      {d.deload && <Badge tone="ink">Deload</Badge>}
      {(d.optional || d.bonus) && <Badge>Optional</Badge>}
      {d.hotel && <Badge>Hotel-Adapted</Badge>}
    </div>
  );
}

function GymDay({ d }){
  return (
    <main style={{padding:"16px 16px 32px"}}>
      <DayBadges d={d}/>
      {d.hotel && (
        <div style={{background:T.flagWash,borderLeft:`3px solid ${T.flag}`,borderRadius:6,padding:"9px 11px",
          marginBottom:16,fontSize:13.5,color:T.body,lineHeight:1.45}}>
          Hotel-gym equipment only. The anchor lift is deferred to its next home session, not skipped.
        </div>
      )}
      {d.note && <p style={{fontSize:13.5,color:T.muted,fontStyle:"italic",margin:"0 0 18px",lineHeight:1.5}}>{d.note}</p>}
      {d.sections.map((s,i)=><Section key={i} s={s} date={d.iso}/>)}
      <EndOfSession/>
    </main>
  );
}

function RunDay({ d, warmup }){
  const [open,setOpen] = React.useState(false);
  return (
    <main style={{padding:"16px 16px 32px"}}>
      <DayBadges d={d}/>
      {d.note && (
        <div style={{background:T.flagWash,borderLeft:`3px solid ${T.flag}`,borderRadius:6,padding:"9px 11px",
          marginBottom:16,fontSize:13.5,color:T.body}}>{d.note}</div>
      )}
      <section style={{marginBottom:22}}>
        <Pressable onClick={()=>setOpen(o=>!o)} aria-expanded={open}
          style={{display:"block",width:"100%",textAlign:"left",background:T.tealWash,borderRadius:8,padding:"11px 13px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <div>
              <div style={{fontSize:11,letterSpacing:".14em",textTransform:"uppercase",fontWeight:700,color:T.tealDeep}}>Running Mobility Warm-Up</div>
              <div style={{fontSize:12.5,color:T.tealDeep,opacity:.85,marginTop:2}}>~5 min · not counted in TRT</div>
            </div>
            <span aria-hidden="true" style={{color:T.tealDeep,fontSize:13,fontWeight:700}}>{open ? "Hide ▲" : "Show ▼"}</span>
          </div>
        </Pressable>
        {open && (
          <div style={{padding:"10px 13px 2px",borderLeft:`3px solid ${T.teal}`,marginTop:8}}>
            {warmup.map((it,i)=><Item key={i} it={it} date={d.iso}/>)}
          </div>
        )}
      </section>
      {d.parts.map((part,i)=>(
        <Section key={i} s={{ title: part.label || "Workout", items: part.items }} date={d.iso} tone="teal"/>
      ))}
      <EndOfSession/>
    </main>
  );
}

function BareDay({ d }){
  const race = d.type==="race";
  return (
    <main style={{padding:"70px 16px 120px",textAlign:"center"}}>
      <div style={{fontSize:30,fontWeight:600,letterSpacing:"-.02em",color:race?T.ember:T.ink}}>{d.title}</div>
      <div style={{marginTop:18,display:"flex",justifyContent:"center"}}>
        <TopoMark color={race?T.ember:T.ruleStrong} opacity={race?0.4:0.45}/>
      </div>
    </main>
  );
}

/* ══════════════════ TRAVEL ══════════════════ */

function TravelList({ travel, onHome, onOpen }){
  const groups = ["Full Body","Lower Body","Upper Body"];
  return (
    <div>
      <StickyHeader
        left={<Pressable onClick={onHome} ariaLabel="Back to calendar" style={navBtn}><span aria-hidden="true">◀</span> Home</Pressable>}
        center="Travel Workouts" right={<div style={{width:64}}/>}
        sub={<span style={{fontSize:12.5,color:T.muted}}>On demand · not tied to a date</span>}/>
      <main style={{padding:"16px 16px 32px"}}>
        {groups.map(g=>(
          <section key={g} style={{marginBottom:24}}>
            <SectionLabel>{g}</SectionLabel>
            {travel.filter(w=>w.focus===g).map(w=>(
              <Pressable key={w.id} onClick={()=>onOpen(w.id)} ariaLabel={`Open ${w.name}, ${w.total}`}
                style={{display:"block",width:"100%",textAlign:"left",background:T.tint,borderRadius:9,padding:"12px 13px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10}}>
                  <span style={{fontSize:15,fontWeight:650,color:T.ink}}>{w.name}</span>
                  <span style={{fontFamily:MONO,fontSize:12.5,color:T.muted}}>{w.total}</span>
                </div>
                <div style={{fontSize:13,color:T.muted,marginTop:3,lineHeight:1.4}}>{w.blurb}</div>
              </Pressable>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}

function TravelDetail({ w, onBack, onHome }){
  return (
    <div>
      <StickyHeader
        left={<Pressable onClick={onBack} ariaLabel="Back to travel workouts" style={navBtn}><span aria-hidden="true">◀</span> Travel</Pressable>}
        center={w.name}
        right={<Pressable onClick={onHome} ariaLabel="Back to calendar" style={navBtn}>Home</Pressable>}
        sub={<><span style={{color:T.muted}}>{w.focus}</span><span style={{fontFamily:MONO,color:T.body,fontWeight:600}}>{w.total}</span></>}/>
      <main style={{padding:"16px 16px 32px"}}>
        {w.sections.map((s,i)=><Section key={i} s={s}/>)}
        <EndOfSession/>
      </main>
    </div>
  );
}

/* ══════════════════ DATE OVERLAY ══════════════════ */

function DatePicker({ sched, current, today, onPick, onClose }){
  const [month,setMonth] = React.useState(current.slice(0,7));
  const ref = React.useRef(null);
  React.useEffect(()=>{
    ref.current && ref.current.focus();
    const esc = e => { if (e.key==="Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return ()=>window.removeEventListener("keydown", esc);
  },[onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Select date" onClick={onClose}
      style={{position:"absolute",inset:0,zIndex:30,background:"rgba(27,36,38,.5)",display:"flex",
        alignItems:"flex-start",justifyContent:"center",padding:"56px 12px 12px",animation:"rlFade 160ms ease"}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.surface,borderRadius:14,border:`2px solid ${T.ink}`,padding:16,width:"100%",maxWidth:400,
          boxShadow:"0 16px 40px rgba(27,36,38,.28)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{fontSize:15,fontWeight:700,color:T.ink}}>Select date</div>
          <Pressable ref={ref} onClick={onClose} ariaLabel="Close date selector"
            style={{fontSize:16,fontWeight:700,color:T.body,padding:"8px 10px",borderRadius:6,minHeight:40,minWidth:40}}>✕</Pressable>
        </div>
        <MonthTabs months={sched.months} month={month} setMonth={setMonth}/>
        <Calendar sched={sched} month={month} today={today} current={current} onPick={onPick} compact/>
      </div>
    </div>
  );
}

/* ══════════════════ STATES ══════════════════ */

function BootScreen({ error, onRetry }){
  return (
    <div style={{minHeight:"100%",background:T.ink,color:"#fff",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",padding:"40px 24px",textAlign:"center",position:"relative",overflow:"hidden"}}>
      <Topo opacity={0.18} color={T.ember}/>
      <div style={{position:"relative"}}>
        <div style={{display:"flex",justifyContent:"center"}}><Wordmark height={34}/></div>
        {error ? (
          <div role="alert" style={{marginTop:22,maxWidth:320}}>
            <div style={{fontSize:16,fontWeight:650}}>Couldn't load the program</div>
            <div style={{fontSize:13.5,color:"rgba(255,255,255,.7)",marginTop:6,lineHeight:1.5}}>
              Check your connection and try again. Once it loads, it works offline.
            </div>
            <Pressable onClick={onRetry} style={{marginTop:16,fontSize:14,fontWeight:700,color:T.ink,
              background:"#fff",borderRadius:8,padding:"11px 18px",minHeight:44}}>Try again</Pressable>
          </div>
        ) : (
          <div style={{marginTop:18,fontSize:13,color:"rgba(255,255,255,.6)",letterSpacing:".08em"}}>Loading program…</div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════ APP ══════════════════ */

function programIdFromUrl(){
  try { return new URLSearchParams(window.location.search).get("p"); } catch { return null; }
}

async function getJSON(url){
  const r = await fetch(url, { cache:"no-cache" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

function App(){
  const [boot, setBoot]   = React.useState({ status:"loading" });
  const [today, setToday] = React.useState(todayIso());
  const [log, setLog]     = React.useState(loadLog);
  const [screen, setScreen] = React.useState("home");
  const [sel, setSel]     = React.useState(null);
  const [travelId, setTid]= React.useState(null);
  const [picker, setPicker] = React.useState(false);
  const [month, setMonth] = React.useState(null);
  const scrollRef = React.useRef(null);
  const lastTrigger = React.useRef(null);

  const load = React.useCallback(async ()=>{
    setBoot({ status:"loading" });
    try {
      const index = await getJSON("programs/index.json");
      const wanted = programIdFromUrl() || index.active;
      const meta = index.programs.find(p=>p.id===wanted) || index.programs.find(p=>p.id===index.active);
      const program = await getJSON(meta.file);
      let travel = null;
      if (index.travel){ try { travel = await getJSON(index.travel); } catch { travel = null; } }
      const sched = buildSchedule(program);
      const t = todayIso();
      setMonth(summaryFor(sched, program, t).iso.slice(0,7));
      setBoot({ status:"ready", index, program, sched, travel });
    } catch (e) {
      setBoot({ status:"error", error:String(e && e.message || e) });
    }
  },[]);
  React.useEffect(()=>{ load(); },[load]);

  /* A home-screen app can sit in memory past midnight: re-read the date on return. */
  React.useEffect(()=>{
    const f = ()=>{ if (document.visibilityState==="visible") setToday(todayIso()); };
    document.addEventListener("visibilitychange", f);
    return ()=>document.removeEventListener("visibilitychange", f);
  },[]);

  const setEntry = React.useCallback((name, iso, entry)=>{
    setLog(prev=>{
      const k = mkey(name);
      const next = { v:1, entries:{ ...prev.entries, [k]: { ...(prev.entries[k]||{}) } } };
      if (entry) next.entries[k][iso] = entry; else delete next.entries[k][iso];
      if (!Object.keys(next.entries[k]).length) delete next.entries[k];
      persistLog(next);
      return next;
    });
  },[]);
  const replaceLog = React.useCallback(next=>{ persistLog(next); setLog(next); },[]);

  React.useEffect(()=>{
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});
  },[]);

  const scrollTop = ()=>{ const el = scrollRef.current; if (el){ if (el.scrollTo) el.scrollTo(0,0); else el.scrollTop = 0; } };

  if (boot.status!=="ready") return <BootScreen error={boot.status==="error"} onRetry={load}/>;

  const { index, program, sched, travel } = boot;
  const goHome = ()=>{ setScreen("home"); setSel(null); setPicker(false);
    setMonth(summaryFor(sched, program, today).iso.slice(0,7)); scrollTop(); };
  const openDay = iso=>{ setSel(iso); setScreen("day"); setPicker(false); scrollTop(); };
  const openPicker = ()=>{ lastTrigger.current = document.activeElement; setPicker(true); };
  const closePicker = ()=>{ setPicker(false); requestAnimationFrame(()=>lastTrigger.current && lastTrigger.current.focus && lastTrigger.current.focus()); };
  const d = sel ? sched.byIso[sel] : null;
  const w = travelId && travel ? travel.find(x=>x.id===travelId) : null;

  return (
    <LogContext.Provider value={{ log, setEntry, replaceLog, today }}>
      <div className="rl-shell">
        <div className="rl-scroll" ref={scrollRef}>
          <div key={screen+String(sel)+String(travelId)} style={{animation:"rlRise 140ms ease"}}>
            {screen==="home" && month && (
              <Home program={program} sched={sched} index={index} today={today} month={month} setMonth={setMonth}
                onOpen={openDay} hasTravel={!!(travel && travel.length)}
                onTravel={()=>{ setScreen("travel"); scrollTop(); }}/>
            )}
            {screen==="day" && d && (
              <>
                <DayHeader d={d} today={today} onHome={goHome} onPicker={openPicker}/>
                {d.type==="gym"  && <GymDay d={d}/>}
                {d.type==="run"  && <RunDay d={d} warmup={program.runWarmup||[]}/>}
                {(d.type==="rest"||d.type==="race") && <BareDay d={d}/>}
              </>
            )}
            {screen==="travel" && travel && (
              <TravelList travel={travel} onHome={goHome} onOpen={id=>{ setTid(id); setScreen("travelDetail"); scrollTop(); }}/>
            )}
            {screen==="travelDetail" && w && (
              <TravelDetail w={w} onHome={goHome} onBack={()=>{ setScreen("travel"); scrollTop(); }}/>
            )}
          </div>
        </div>
        {picker && sel && <DatePicker sched={sched} current={sel} today={today} onPick={openDay} onClose={closePicker}/>}
      </div>
    </LogContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
