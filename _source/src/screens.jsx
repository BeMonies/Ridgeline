/* ══════════════════ SCHEDULE (week strip) ══════════════════
   Any published session can be opened on any date. Today is a shortcut, not an access rule. */

function weekOf(iso){ const mon = addDays(iso, -weekdayIdx(iso)); return Array.from({length:7}, (_, i) => addDays(mon, i)); }

function WeekStrip({ sched, selected, today, done, onSelect }){
  return (
    <div role="group" aria-label="Training week"
      style={{ display:"grid", gridTemplateColumns:"repeat(7,minmax(44px,1fr))", gap:4, overflowX:"auto", padding:"3px 0" }}>
      {weekOf(selected).map(iso=>{
        const d = sched.byIso[iso], isSel = iso===selected, isToday = iso===today, isDone = !!(done && done[iso]);
        const label = `${fmtLong(iso)} — ${d ? d.title : "no session published"}${isToday ? ", today" : ""}${isDone ? ", complete" : ""}`;
        return (
          <Pressable key={iso} onClick={()=>onSelect(iso)} ariaLabel={label} aria-pressed={isSel}
            ariaCurrent={isToday ? "date" : undefined}
            style={{ minWidth:44, minHeight:68, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:2, padding:"4px 0", borderRadius:8, fontVariantNumeric:"tabular-nums",
              background: isSel ? T.action : "transparent", color: isSel ? T.onAction : T.ink,
              outline: isToday ? `2px solid ${T.emberDeep}` : "none", outlineOffset:2,
              opacity: d ? 1 : .75 }}>
            <span aria-hidden="true" style={{ fontSize:14, lineHeight:"18px", color: isSel ? T.onAction : T.muted }}>{DAY_ABBR[weekdayIdx(iso)][0]}</span>
            <span aria-hidden="true" style={{ fontSize:18, lineHeight:"24px", fontWeight:700 }}>{dateOf(iso).getDate()}</span>
            <span aria-hidden="true" style={{ fontSize:14, lineHeight:"14px", height:14, fontWeight:700 }}>{isDone ? "✓" : (d ? "" : "–")}</span>
          </Pressable>
        );
      })}
    </div>
  );
}

/* Searchable "Jump to date": each result pairs the planned date with the session's own title. */
function SessionPicker({ sched, current, onPick, label="Jump to date" }){
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const btnRef = React.useRef(null), listRef = React.useRef(null);
  const uid = React.useId().replace(/:/g,"");
  const cur = sched.byIso[current];
  const norm = s => String(s).toLowerCase();
  const results = sched.dates.filter(iso => {
    if (!q.trim()) return true;
    const d = dateOf(iso), t = norm(q.trim());
    const hay = [sched.byIso[iso].title, fmtPick(iso), fmtLong(iso), iso, `${d.getMonth()+1}/${d.getDate()}`,
      MONTH_FULL[d.getMonth()] + " " + d.getDate()].map(norm).join(" | ");
    return hay.includes(t);
  });
  const close = () => { setOpen(false); setQ(""); setMsg(""); requestAnimationFrame(()=>btnRef.current && btnRef.current.focus()); };
  const choose = iso => { onPick(iso); setOpen(false); setQ(""); setMsg(""); };
  const onKey = e => {
    if (e.key==="Escape"){ e.stopPropagation(); close(); return; }
    if (e.key==="ArrowDown" || e.key==="ArrowUp"){
      const items = [...(listRef.current ? listRef.current.querySelectorAll("button") : [])];
      if (!items.length) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement);
      items[e.key==="ArrowDown" ? Math.min(items.length-1, i+1) : Math.max(0, i-1)].focus();
    }
  };
  const onDate = e => {
    const v = e.target.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    if (sched.byIso[v]) choose(v);
    else setMsg(`No session is published for ${fmtPick(v)}.`);
  };
  return (
    <div>
      {label && <p style={{ margin:"0 0 6px", fontSize:14, lineHeight:"20px", fontWeight:600, color:T.muted }}>{label}</p>}
      <button ref={btnRef} type="button" aria-expanded={open} aria-controls={uid} onClick={()=>setOpen(o=>!o)}
        style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, width:"100%", minHeight:48,
          textAlign:"left", border:`1px solid ${T.ruleStrong}`, borderRadius: open ? "8px 8px 0 0" : 8, padding:"10px 12px",
          background:T.surface, color:T.ink, fontSize:16, lineHeight:"24px", fontWeight:600, fontFamily:"inherit", cursor:"pointer" }}>
        <span style={{ minWidth:0, overflowWrap:"anywhere" }}>{fmtPick(current)}{cur ? ` · ${cur.title}` : " · no session published"}</span>
        <span aria-hidden="true" style={{ flex:"0 0 auto" }}>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div id={uid} onKeyDown={onKey}
          style={{ padding:12, background:T.surface, border:`1px solid ${T.ruleStrong}`, borderTop:0, borderRadius:"0 0 8px 8px" }}>
          <label style={fieldLabel}>Search dates or session titles
            <input type="search" autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Try easy run or Oct 21"
              style={{ ...fieldInput, fontWeight:400 }}/>
          </label>
          <div ref={listRef} role="group" aria-label="Matching sessions"
            style={{ margin:"12px 0", display:"grid", gap:4, maxHeight:320, overflowY:"auto" }}>
            {results.map(iso=>{
              const on = iso===current;
              return (
                <button key={iso} type="button" aria-pressed={on} onClick={()=>choose(iso)}
                  style={{ display:"grid", gridTemplateColumns:"112px minmax(0,1fr)", gap:8, alignItems:"start", textAlign:"left",
                    border:0, borderRadius:6, padding:"12px 8px", minHeight:48, fontSize:14, lineHeight:"20px", fontFamily:"inherit",
                    cursor:"pointer", background: on ? T.tealWash : "transparent", color: on ? T.tealDeep : T.ink }}>
                  <span style={{ fontVariantNumeric:"tabular-nums" }}>{fmtPick(iso)}</span>
                  <span style={{ fontWeight:600, overflowWrap:"anywhere" }}>{on ? "✓ " : ""}{sched.byIso[iso].title}</span>
                </button>
              );
            })}
          </div>
          <p role="status" style={{ margin:"0 0 12px", fontSize:14, lineHeight:"20px", color:T.muted }}>
            {results.length ? `${results.length} ${results.length===1?"session":"sessions"} shown.` : "No sessions match. Try a different date or title."}
          </p>
          <label style={fieldLabel}>Go directly to a date
            <input type="date" defaultValue={current} onChange={onDate} style={fieldInput}/>
          </label>
          {msg && <p role="alert" style={{ margin:"8px 0 0", fontSize:14, color:T.alert, fontWeight:600 }}>⚠ {msg}</p>}
          <Pressable onClick={close} style={{ ...textBtn, marginTop:8 }}>Close</Pressable>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ HOME ══════════════════ */

function gymMinutes(d){
  if (d.type !== "gym" || !d.sections) return 0;
  return d.sections.reduce((a, s) => a + (parseInt(String(s.budget || "").match(/^\d+/), 10) || 0), 0);
}
function sessionMeta(d){
  if (!d) return "";
  if (d.type==="rest") return "Rest day";
  if (d.type==="race") return "Race day";
  if (d.type==="run") return d.trt ? `Total run time ${d.trt}` : "Run";
  const m = gymMinutes(d);
  return m ? `${m} min` : "Strength and conditioning";
}

function MenuIcon(){
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16"/>
    </svg>
  );
}

/* Everything that isn't today's session lives here: setup, travel workouts, backup and the archive. */
function MenuPanel({ program, index, hasTravel, onSetup, onTravel, onClose }){
  const archive = (index.programs||[]).filter(p => p.status==="archived" && p.id!==program.id);
  const item = { ...textBtn, textDecoration:"none", display:"flex", width:"100%", minHeight:48, padding:"12px var(--gutter, 20px)",
    fontSize:16, fontWeight:600, color:T.ink, borderTop:`1px solid ${T.rule}`, textAlign:"left", justifyContent:"flex-start" };
  return (
    <div role="menu" aria-label="Menu" onKeyDown={e=>{ if (e.key==="Escape"){ e.stopPropagation(); onClose(); } }}
      style={{ position:"absolute", left:0, right:0, top:"100%", zIndex:30, background:T.surface, color:T.ink,
        borderBottom:`1px solid ${T.rule}`, boxShadow:"0 12px 24px rgba(28,38,40,.14)", maxHeight:"calc(100vh - 80px)", overflowY:"auto" }}>
      {program.engine && <Pressable role="menuitem" autoFocus onClick={()=>{ onClose(false); onSetup(); }} style={{ ...item, borderTop:0 }}>Program setup</Pressable>}
      {hasTravel && <Pressable role="menuitem" onClick={()=>{ onClose(false); onTravel(); }} style={item}>Travel workouts</Pressable>}
      <div style={{ padding:"16px var(--gutter, 20px)", borderTop:`1px solid ${T.rule}` }}><LogPanel/></div>
      {archive.length>0 && (
        <div style={{ borderTop:`1px solid ${T.rule}`, padding:"8px var(--gutter, 20px) 12px" }}>
          <p style={{ margin:"8px 0 0", fontSize:14, lineHeight:"20px", fontWeight:600, color:T.muted }}>Earlier programs</p>
          {archive.map(p=>(
            <a key={p.id} href={`?p=${encodeURIComponent(p.id)}`} role="menuitem"
              style={{ display:"flex", alignItems:"center", minHeight:44, color:T.ink, fontWeight:600, fontSize:16, textDecoration:"underline", textUnderlineOffset:4 }}>
              {p.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function Home({ program, sched, index, today, sel, setSel, onOpen, onTravel, hasTravel, resolve, onSetup, done }){
  const [menu, setMenu] = React.useState(false);
  const menuBtn = React.useRef(null);
  const closeMenu = (refocus = true) => { setMenu(false); if (refocus) requestAnimationFrame(()=>menuBtn.current && menuBtn.current.focus()); };
  const archived = program.status==="archived";
  const raw = sched.byIso[sel], d = resolve(raw);
  const selDone = !!(done && done[sel]);
  const d0 = dateOf(sel);
  const shift = n => setSel(addDays(sel, n));
  return (
    <div>
      <div style={{ position:"relative", zIndex:20 }}>
        <header className="on-dark" style={{ position:"relative", overflow:"hidden", background:T.night, color:T.onNight,
          padding:"8px 4px 8px var(--gutter, 20px)", display:"flex", alignItems:"center", justifyContent:"space-between", minHeight:56 }}>
          <TopoField opacity={.35} style={{ width:"120%", right:"-30%", bottom:"-260%" }}/>
          <div style={{ position:"relative" }}><Lockup tone="dark" width={184}/></div>
          <Pressable ref={menuBtn} onClick={()=> menu ? closeMenu() : setMenu(true)} ariaLabel="Menu" aria-expanded={menu} aria-haspopup="menu"
            style={{ position:"relative", width:48, height:48, display:"flex", alignItems:"center", justifyContent:"center", color:T.onNight, borderRadius:8 }}>
            <MenuIcon/>
          </Pressable>
        </header>
        {menu && (
          <>
            <div onClick={()=>closeMenu()} style={{ position:"fixed", inset:0, zIndex:-1 }}/>
            <MenuPanel program={program} index={index} hasTravel={hasTravel} onSetup={onSetup} onTravel={onTravel} onClose={closeMenu}/>
          </>
        )}
      </div>

      <main style={{ padding:"20px var(--gutter, 20px) 32px" }}>
        {archived && (
          <a href="./" style={{ display:"block", background:T.flagWash, color:T.flag, borderRadius:8, padding:12, marginBottom:16,
            fontSize:14, lineHeight:"20px", textDecoration:"underline", fontWeight:600 }}>
            Archived program. Back to the current program →
          </a>
        )}

        <section aria-label="Selected session" style={{ padding:20, background:T.surface, border:`1px solid ${T.rule}`, borderRadius:12 }}>
          <p style={{ margin:0, fontSize:14, lineHeight:"20px", fontWeight:600, color:T.muted }}>
            {fmtPick(sel)}{sel===today ? " · Today" : ""}{selDone ? " · ✓ Complete" : ""}
          </p>
          {d ? (
            <>
              <h1 style={{ margin:"8px 0 0", fontSize:30, lineHeight:"36px", fontWeight:700, letterSpacing:"-.02em" }}>{d.title}</h1>
              <p style={{ margin:"4px 0 0", fontSize:14, lineHeight:"20px", fontWeight:600, color:T.tealDeep }}>
                {sessionMeta(d)}{d.deload ? " · Deload" : ""}
              </p>
              <Pressable onClick={()=>onOpen(sel)} ariaLabel={`Open ${fmtLong(sel)} — ${d.title}`} className="rl-btn rl-primary"
                style={{ ...btnPrimary, width:"100%", marginTop:20 }}>
                Open this session <span aria-hidden="true">→</span>
              </Pressable>
            </>
          ) : (
            <>
              <h1 style={{ margin:"8px 0 0", fontSize:30, lineHeight:"36px", fontWeight:700, letterSpacing:"-.02em" }}>No session</h1>
              <p style={{ margin:"4px 0 0", fontSize:14, lineHeight:"20px", color:T.muted }}>
                {sel < sched.first ? `The program starts ${fmtLong(sched.first)}.` :
                 sel > sched.last ? (program.endCard ? `${program.endCard}.` : "The next block isn't loaded yet.") : "Nothing is scheduled."}
              </p>
              <Pressable onClick={()=>setSel(sel < sched.first ? sched.first : sched.last)} className="rl-btn" style={{ ...btnSecondary, width:"100%", marginTop:20 }}>
                {sel < sched.first ? "Go to the first session" : "Go to the last session"}
              </Pressable>
            </>
          )}
        </section>

        <section aria-label="Session calendar" style={{ marginTop:20 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:4 }}>
            <Pressable onClick={()=>shift(-7)} ariaLabel="Previous week" style={{ ...textBtn, textDecoration:"none", fontSize:20, justifyContent:"center" }}>←</Pressable>
            <h2 style={{ margin:0, fontSize:16, lineHeight:"24px", fontWeight:650, flex:1, textAlign:"center" }}>
              {MONTH_FULL[d0.getMonth()]} {d0.getFullYear()}
            </h2>
            <Pressable onClick={()=>setSel(today)} style={{ ...textBtn, padding:"8px" }}>Today</Pressable>
            <Pressable onClick={()=>shift(7)} ariaLabel="Next week" style={{ ...textBtn, textDecoration:"none", fontSize:20, justifyContent:"center" }}>→</Pressable>
          </div>
          <WeekStrip sched={sched} selected={sel} today={today} done={done} onSelect={setSel}/>
          <div style={{ marginTop:12 }}><SessionPicker sched={sched} current={sel} onPick={setSel}/></div>
        </section>
      </main>
    </div>
  );
}

/* ══════════════════ LOG BACKUP ══════════════════
   The log lives on this phone only. Export is the safety net. It contains the log and nothing else:
   no setup, zone profile or personal overrides. */

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
      const merged = { ...log, v:1, entries:{ ...log.entries }, done:{ ...(log.done||{}) } };
      let added = 0;
      for (const [k, byDate] of Object.entries(incoming.entries)){
        merged.entries[k] = { ...(merged.entries[k]||{}) };
        for (const [d, entry] of Object.entries(byDate)){
          const mine = merged.entries[k][d];
          if (!mine || (entry.t||0) > (mine.t||0)){ merged.entries[k][d] = entry; added++; }
        }
      }
      for (const [d, c] of Object.entries(incoming.done || {})) if (!merged.done[d] || (c.at||0) > (merged.done[d].at||0)) merged.done[d] = c;
      if (!replaceLog(merged)) throw new Error("save failed");
      setMsg(`Restored ${added} ${added===1?"entry":"entries"}.`);
    } catch { setMsg("That file isn't a Ridgeline backup, or it couldn't be saved."); }
  };

  return (
    <div>
      <h3 style={{ margin:0, fontSize:16, lineHeight:"24px", fontWeight:650 }}>Training log</h3>
      <p style={{ margin:"2px 0 0", fontSize:14, lineHeight:"20px", color:T.muted }}>
        {n ? `${n} ${n===1?"entry":"entries"} saved on this phone.` : "Nothing logged yet."} Deleting the app icon deletes the log.
      </p>
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <Pressable onClick={doExport} disabled={!n} className="rl-btn" style={{ ...btnSecondary, opacity:n?1:.5 }}>Export backup</Pressable>
        <Pressable onClick={()=>fileRef.current && fileRef.current.click()} className="rl-btn" style={btnSecondary}>Restore</Pressable>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={doImport}
          style={{ display:"none" }} aria-hidden="true" tabIndex={-1}/>
      </div>
      {msg && <p role="status" aria-live="polite" style={{ margin:"8px 0 0", fontSize:14, lineHeight:"20px" }}>{msg}</p>}
    </div>
  );
}

/* ══════════════════ SESSION VIEWS ══════════════════ */

function StickyBar({ left, right }){
  return (
    <header style={{ position:"sticky", top:0, zIndex:10, background:T.surface, borderBottom:`1px solid ${T.rule}`,
      padding:"4px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
      {left}{right}
    </header>
  );
}

function SessionHeading({ d, sched, today, onPick, extra }){
  return (
    <div style={{ padding:"16px var(--gutter, 20px) 0" }}>
      <p style={{ margin:0, fontSize:14, lineHeight:"20px", color:T.muted }}>
        {fmtPick(d.iso)}{d.iso===today ? " · Today" : ""}
      </p>
      <h1 style={{ margin:"8px 0 0", fontSize:30, lineHeight:"36px", fontWeight:700, letterSpacing:"-.02em", color:T.ink }}>{d.title}</h1>
      <p style={{ margin:"8px 0 0", fontSize:14, lineHeight:"20px", fontWeight:600, color:T.tealDeep }}>
        {sessionMeta(d)}
      </p>
      {extra}
      <div style={{ marginTop:12 }}><SessionPicker sched={sched} current={d.iso} onPick={onPick} label={null}/></div>
    </div>
  );
}

function DayBadges({ d }){
  const any = d.deload || d.optional || d.bonus || d.hotel || d.calibration;
  if (!any) return null;
  return (
    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:12 }}>
      {d.calibration && <Badge tone="info">Record your loads today</Badge>}
      {d.deload && <Badge tone="info">Deload</Badge>}
      {(d.optional || d.bonus) && <Badge tone="ink">Optional</Badge>}
      {d.hotel && <Badge tone="ink">Hotel-adapted</Badge>}
    </div>
  );
}

const pagePad = { padding:"20px var(--gutter, 20px) 40px" };

function GymDay({ d }){
  return (
    <main style={pagePad}>
      {d.hotel && (
        <p role="note" style={{ background:T.flagWash, color:T.flag, borderRadius:8, padding:12, margin:"0 0 24px", fontSize:14, lineHeight:"20px" }}>
          Hotel-gym equipment only. The anchor lift is deferred to its next home session, not skipped.
        </p>
      )}
      {d.note && <p style={{ ...noteStyle, margin:"0 0 24px" }}>{d.note}</p>}
      {d.sections.map((s,i)=><Section key={i} s={s} date={d.iso}/>)}
      <CompleteBar iso={d.iso}/>
    </main>
  );
}

function RunDay({ d, warmup }){
  return (
    <main style={pagePad}>
      {d.note && (
        <p role="note" style={{ background:T.flagWash, color:T.flag, borderRadius:8, padding:12, margin:"0 0 24px", fontSize:14, lineHeight:"20px" }}>{d.note}</p>
      )}
      <details style={{ background:T.tealWash, color:T.tealDeep, borderRadius:12, padding:"0 16px", marginBottom:32 }}>
        <summary style={{ minHeight:48, display:"flex", alignItems:"center", cursor:"pointer", fontWeight:600, fontSize:16 }}>
          Running mobility warm-up · about 5 min, not counted in total run time
        </summary>
        <div style={{ paddingBottom:16, color:T.ink }}><ItemList items={warmup} date={d.iso} gap={16}/></div>
      </details>
      {d.parts.map((part,i)=>(
        <Section key={i} s={{ title: part.label || "Workout", items: part.items, meta: part.meta }} date={d.iso}/>
      ))}
      <ZoneKey zk={d.zoneKey}/>
      <CompleteBar iso={d.iso}/>
    </main>
  );
}

function BareDay({ d }){
  return (
    <main style={pagePad}>
      <p style={{ margin:0, fontSize:16, lineHeight:"24px", color:T.muted }}>
        {d.type==="race" ? "Race day." : "No training is scheduled. You can still open any other published session from the schedule."}
      </p>
    </main>
  );
}

/* ══════════════════ TRAVEL ══════════════════ */

function TravelList({ travel, onHome, onOpen }){
  const groups = ["Full Body","Lower Body","Upper Body"];
  return (
    <div>
      <StickyBar left={<Pressable onClick={onHome} ariaLabel="Back to schedule" style={textBtn}>← Schedule</Pressable>}/>
      <div style={{ padding:"16px var(--gutter, 20px) 0" }}>
        <h1 style={{ margin:0, fontSize:30, lineHeight:"36px", fontWeight:700, letterSpacing:"-.02em" }}>Travel workouts</h1>
        <p style={{ margin:"8px 0 0", fontSize:14, lineHeight:"20px", fontWeight:600, color:T.tealDeep }}>On demand · not tied to a date</p>
      </div>
      <main style={pagePad}>
        {groups.map(g=>(
          <section key={g} style={{ marginBottom:32 }}>
            <SectionLabel>{g}</SectionLabel>
            <div style={{ display:"grid", gap:12 }}>
              {travel.filter(w=>w.focus===g).map(w=>(
                <Pressable key={w.id} onClick={()=>onOpen(w.id)} ariaLabel={`Open ${w.name}, ${w.total}`}
                  style={{ ...btnSecondary, display:"block", textAlign:"left", width:"100%", borderRadius:12, padding:16 }}>
                  <span style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:12 }}>
                    <span style={{ fontSize:18, lineHeight:"24px", fontWeight:600 }}>{w.name}</span>
                    <span style={{ fontSize:14, fontWeight:600, color:T.tealDeep, fontVariantNumeric:"tabular-nums" }}>{w.total}</span>
                  </span>
                  <span style={{ display:"block", fontSize:14, lineHeight:"20px", fontWeight:400, color:T.muted, marginTop:4 }}>{w.blurb}</span>
                </Pressable>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function TravelDetail({ w, onBack, onHome }){
  return (
    <div>
      <StickyBar left={<Pressable onClick={onBack} ariaLabel="Back to travel workouts" style={textBtn}>← Travel</Pressable>}
        right={<Pressable onClick={onHome} ariaLabel="Back to schedule" style={textBtn}>Schedule</Pressable>}/>
      <div style={{ padding:"16px var(--gutter, 20px) 0" }}>
        <h1 style={{ margin:0, fontSize:30, lineHeight:"36px", fontWeight:700, letterSpacing:"-.02em" }}>{w.name}</h1>
        <p style={{ margin:"8px 0 0", fontSize:14, lineHeight:"20px", fontWeight:600, color:T.tealDeep }}>{w.focus} · {w.total}</p>
      </div>
      <main style={pagePad}>
        {w.sections.map((s,i)=><Section key={i} s={s}/>)}
        </main>
    </div>
  );
}

/* ══════════════════ SETUP ══════════════════
   The athlete's own choices for a program: start date, run lengths, heart-rate zones, equipment,
   options and personal overrides. Kept on this device only (ridgeline.personal.v1) — never in a
   program file and never in a log backup. */

function Field({ label, hint, children, error }){
  return (
    <label style={{ ...fieldLabel, marginBottom:16, gap:4 }}>
      <span style={{ fontSize:16, lineHeight:"24px", fontWeight:600 }}>{label}</span>
      {hint && <span style={{ fontSize:14, lineHeight:"20px", fontWeight:400, color:T.muted }}>{hint}</span>}
      {children}
      {error && <span role="alert" style={{ fontSize:14, lineHeight:"20px", fontWeight:600, color:T.alert }}>⚠ {error}</span>}
    </label>
  );
}
function Choice({ type="checkbox", name, checked, onChange, children, disabled }){
  return (
    <label style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"10px 0", minHeight:44,
      cursor:disabled?"not-allowed":"pointer", opacity:disabled?.55:1 }}>
      <input type={type} name={name} checked={checked} disabled={disabled}
        onChange={e=>onChange(type==="checkbox" ? e.target.checked : true)}
        style={{ width:24, height:24, margin:"0", accentColor:T.tealDeep, flexShrink:0 }}/>
      <span style={{ fontSize:16, lineHeight:"24px", fontWeight:400 }}>{children}</span>
    </label>
  );
}
function SetupBlock({ title, children }){
  return <section style={{ marginBottom:32 }}><SectionLabel>{title}</SectionLabel>{children}</section>;
}
const helpText = { margin:"0 0 16px", fontSize:14, lineHeight:"20px", color:T.muted };

function Setup({ program, sched, personal, setup, update, onHome }){
  const id = program.id;
  const raw = (personal.setup && personal.setup[id]) || {};
  const put = patch => update(p => ({ ...p, setup:{ ...(p.setup||{}), [id]:{ ...((p.setup||{})[id]||{}), ...patch } } }));
  const zp = personal.zoneProfile || {};
  const putZone = patch => update(p => ({ ...p, zoneProfile:{ ...(p.zoneProfile||{}), ...patch } }));
  const putBound = (z, i, v) => update(p => {
    const cur = p.zoneProfile || {}, b = { ...(cur.bounds||{}) }, pair = [...(b[z]||["",""])];
    pair[i] = v.replace(/[^0-9]/g,"").slice(0,3); b[z] = pair;
    return { ...p, zoneProfile:{ ...cur, bounds:b } };
  });

  const [dateMsg, setDateMsg] = React.useState("");
  const startIso = startDateFor(program, personal);
  const onDate = e => {
    const v = e.target.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    if (weekdayIdx(v) !== 0){ setDateMsg("Pick a Monday so each week lines up with the program."); return; }
    setDateMsg("");
    update(p => ({ ...p, startDates:{ ...(p.startDates||{}), [id]:v } }));
  };
  const resetDate = () => { setDateMsg(""); update(p => { const sd = { ...(p.startDates||{}) }; delete sd[id]; return { ...p, startDates:sd }; }); };

  const rb = raw.runBaselines || {};
  const setRb = (d, v) => put({ runBaselines:{ ...rb, [d]: v.replace(/[^0-9]/g,"").slice(0,3) } });
  const rbErr = d => (rb[d] && cleanInt(rb[d], RUN_MIN, RUN_MAX) === null) ? `Enter ${RUN_MIN}–${RUN_MAX} minutes, or clear it to use the example.` : "";
  const weekly = setup.runBaselines.tue + setup.runBaselines.thu + setup.runBaselines.sat;
  const anyExample = RUN_DAYS.some(d => !setup.runIsSet[d]);

  const bounds = zp.bounds || {};
  const zErr = z => { const b = bounds[z]; if (!b || b[0]==="" || b[1]==="") return ""; const lo = Number(b[0]), hi = Number(b[1]);
    return (lo < 30 || hi > 230 || lo > hi) ? "Low must be 30 or more, high 230 or less, and low no higher than high." : ""; };

  const lbWeeks = legBlasterWeeks(program).filter(w => legBlasterAvailable(program, w));
  const toggleLb = (w, on) => put({ lbWeeks: on ? [...new Set([...setup.lbWeeks, w])] : setup.lbWeeks.filter(x => x !== w) });
  const reset = () => update(p => { const s = { ...(p.setup||{}) }; delete s[id]; return { ...p, setup:s }; });
  const wedOf = w => fmtPick(addDays(sched.start, (w-1)*7 + 2));

  return (
    <div>
      <StickyBar left={<Pressable onClick={onHome} ariaLabel="Back to schedule" style={textBtn}>← Schedule</Pressable>}/>
      <div style={{ padding:"16px var(--gutter, 20px) 0" }}>
        <h1 style={{ margin:0, fontSize:30, lineHeight:"36px", fontWeight:700, letterSpacing:"-.02em" }}>Program setup</h1>
        <p style={{ margin:"8px 0 0", fontSize:14, lineHeight:"20px", fontWeight:600, color:T.tealDeep }}>{program.name}</p>
      </div>
      <main style={pagePad}>
        <p style={{ ...helpText, marginBottom:32 }}>
          These choices stay on this device. They aren't part of the program and aren't included when you export your training log.
        </p>

        <SetupBlock title="Start date">
          <Field label="First Monday" hint="Changing it moves every date. The workouts don't change." error={dateMsg}>
            <input type="date" value={startIso} onChange={onDate} style={fieldInput}/>
          </Field>
          {startIso !== program.startDate &&
            <Pressable onClick={resetDate} className="rl-btn" style={btnSecondary}>Use the program's default date</Pressable>}
        </SetupBlock>

        <SetupBlock title="Running">
          <p style={helpText}>
            Set the length of each run from a typical, sustainable training week (leave out race, taper and recovery weeks).
            Warm-up, intervals, recoveries and cooldown are all counted inside each run's total time.
          </p>
          {[["tue","Tuesday · quality run (minutes)"],["thu","Thursday · easy run (minutes)"],["sat","Saturday · long run (minutes)"]].map(([dd,label])=>(
            <Field key={dd} label={label} error={rbErr(dd)}>
              <input inputMode="numeric" value={rb[dd]||""} placeholder={`${(program.options.runBaselines||{})[dd]} (example)`}
                aria-invalid={rbErr(dd) ? "true" : undefined} onChange={e=>setRb(dd, e.target.value)} style={fieldInput}/>
            </Field>
          ))}
          <p aria-live="polite" style={{ margin:0, fontSize:16, lineHeight:"24px" }}>
            Weekly running: <b>{weekly} min</b>{anyExample ? " (includes example lengths)" : ""}
          </p>
        </SetupBlock>

        <SetupBlock title="Heart-rate zones">
          <p style={helpText}>
            Use one consistent five-zone profile and record where it comes from. Ridgeline never estimates boundaries for you —
            anything left blank shows as not set.
          </p>
          <Field label="Profile or method"><input value={zp.method||""} maxLength={60} onChange={e=>putZone({ method:e.target.value })}
            placeholder="e.g. the five-zone profile on my watch" style={fieldInput}/></Field>
          <Field label="Where the boundaries come from"><input value={zp.source||""} maxLength={60} onChange={e=>putZone({ source:e.target.value })}
            placeholder="e.g. lab test, field test, watch default" style={fieldInput}/></Field>
          {["Z1","Z2","Z3","Z4","Z5"].map(z=>{
            const b = bounds[z] || ["",""], name = (program.zones||[]).find(t=>t.z===z);
            return (
              <div key={z} style={{ marginBottom:16 }}>
                <p style={{ margin:"0 0 6px", fontSize:16, lineHeight:"24px", fontWeight:600 }}>{z}{name ? ` · ${name.name}` : ""}</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <input aria-label={`${z} low, beats per minute`} inputMode="numeric" value={b[0]} placeholder="low bpm" onChange={e=>putBound(z,0,e.target.value)} style={fieldInput}/>
                  <input aria-label={`${z} high, beats per minute`} inputMode="numeric" value={b[1]} placeholder="high bpm" onChange={e=>putBound(z,1,e.target.value)} style={fieldInput}/>
                </div>
                {zErr(z) && <p role="alert" style={{ margin:"6px 0 0", fontSize:14, lineHeight:"20px", fontWeight:600, color:T.alert }}>⚠ {zErr(z)}</p>}
              </div>
            );
          })}
        </SetupBlock>

        <SetupBlock title="Equipment and options">
          <Choice checked={setup.wall} onChange={v=>put({ wall:v })}>
            I have a gym-approved wall and a wall-throw-rated medicine ball. Turn this off to use fast incline push-ups in place of wall chest passes.
          </Choice>
          <p style={{ margin:"16px 0 0", fontSize:16, lineHeight:"24px", fontWeight:600 }}>Friday power</p>
          <Choice type="radio" name="power" checked={setup.powerMode==="jumps"} onChange={()=>put({ powerMode:"jumps" })}>
            Jumps and bounds (default)
          </Choice>
          <Choice type="radio" name="power" checked={setup.powerMode==="clean"} onChange={()=>put({ powerMode:"clean" })}>
            Hang power cleans instead — only if you're already technically proficient and cleared for them. This replaces the jumps and bounds; it never adds to them.
          </Choice>
        </SetupBlock>

        <SetupBlock title="Leg Blasters">
          {lbWeeks.length ? (
            <>
              <p style={helpText}>
                An optional swap for the Wednesday WOD in the later block. Choose it only if you're comfortable with controlled squats and lunges,
                you're currently cleared for and tolerating jumping lunges and squat jumps, and you've recovered from Monday and Tuesday.
                Otherwise keep the normal WOD. The last week of the cycle never includes Leg Blasters.
              </p>
              <p style={{ ...helpText, color:T.ink }}>
                Choosing a week changes all of this together: that Wednesday's WOD becomes a Mini Leg Blaster; that Friday's jumps, bounds or cleans become
                3 × 3 chest passes; and that Friday's accessory circuit drops to two rounds.
              </p>
              {lbWeeks.map(w=>(
                <Choice key={w} checked={setup.lbWeeks.includes(w)} onChange={on=>toggleLb(w,on)}>
                  {wedOf(w)} and the Friday after it
                </Choice>
              ))}
            </>
          ) : <p style={{ ...helpText, marginBottom:0 }}>This program doesn't offer Leg Blasters.</p>}
        </SetupBlock>

        <SetupBlock title="Personal override">
          <Field label="Rounds for both single-leg exercises"
            hint="Use this if you follow individual guidance that sets your own dose. It applies on Mondays and Wednesdays in every week, deloads included, and takes precedence over the program's numbers.">
            <select value={raw.uniOverride||""} onChange={e=>put({ uniOverride:e.target.value })} style={{ ...fieldInput, padding:"8px" }}>
              <option value="">Use the program's numbers</option>
              {[1,2,3,4,5,6].map(n=><option key={n} value={String(n)}>{n} {n===1?"round":"rounds"}, every week</option>)}
            </select>
          </Field>
        </SetupBlock>

        <Pressable onClick={reset} className="rl-btn" style={btnSecondary}>Reset these choices</Pressable>
      </main>
    </div>
  );
}

/* ══════════════════ STATES ══════════════════ */

function BootScreen({ error, onRetry }){
  return (
    <div className="on-dark" style={{ minHeight:"100%", background:T.night, color:T.onNight, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"40px 24px", textAlign:"center", position:"relative", overflow:"hidden" }}>
      <TopoField opacity={.5}/>
      <div style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center" }}>
        <Lockup tone="dark" width={240}/>
        <p style={{ margin:"14px 0 0", fontSize:14, lineHeight:"20px", color:T.onNightMuted }}>Strength for mountain athletes</p>
        {error ? (
          <div role="alert" style={{ marginTop:32, maxWidth:320 }}>
            <p style={{ margin:0, fontSize:18, lineHeight:"24px", fontWeight:600 }}>Couldn't load the program</p>
            <p style={{ margin:"8px 0 0", fontSize:14, lineHeight:"20px", color:T.onNightMuted }}>
              Check your connection and try again. Once it loads, it works offline.
            </p>
            <Pressable onClick={onRetry} className="rl-btn rl-primary" style={{ ...btnPrimary, marginTop:16 }}>Try again</Pressable>
          </div>
        ) : (
          <p role="status" style={{ margin:"32px 0 0", fontSize:14, lineHeight:"20px", color:T.onNightMuted }}>Loading program…</p>
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
  const [personal, setPersonal] = React.useState(loadPersonal);
  const [drafts, setDrafts] = React.useState(loadDrafts);
  const [screen, setScreen] = React.useState("home");
  const [sel, setSel]     = React.useState(null);          /* session being viewed */
  const [homeSel, setHomeSel] = React.useState(null);      /* date chosen on the schedule */
  const [travelId, setTid]= React.useState(null);
  const scrollRef = React.useRef(null);
  const logRef = React.useRef(log);
  logRef.current = log;

  const load = React.useCallback(async ()=>{
    setBoot({ status:"loading" });
    try {
      const index = await getJSON("programs/index.json");
      const wanted = programIdFromUrl() || index.active;
      const meta = index.programs.find(p=>p.id===wanted) || index.programs.find(p=>p.id===index.active);
      const program = await getJSON(meta.file);
      let travel = null;
      if (index.travel){ try { travel = await getJSON(index.travel); } catch { travel = null; } }
      const first = buildSchedule(program, loadPersonal());
      setHomeSel(summaryFor(first, program, todayIso()).iso);
      setBoot({ status:"ready", index, program, travel });
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

  /* Log changes are computed from the latest log and only shown once they are saved. */
  const commitLog = React.useCallback(next=>{
    if (!persistLog(next)) return false;
    logRef.current = next; setLog(next); return true;
  },[]);
  const addSet    = React.useCallback((name, iso, set, cal)=> commitLog(withSet(logRef.current, name, iso, set, cal)),[commitLog]);
  const removeSet = React.useCallback((name, iso, i)=> commitLog(withoutSet(logRef.current, name, iso, i)),[commitLog]);
  const setDone   = React.useCallback((iso, on)=> commitLog(withDone(logRef.current, iso, on)),[commitLog]);
  const replaceLog= React.useCallback(next=> commitLog(next),[commitLog]);

  const updatePersonal = React.useCallback(fn=>{
    setPersonal(prev=>{ const next = fn(prev); savePersonal(next); return next; });
  },[]);
  const setDraft = React.useCallback((key, value)=>{
    setDrafts(prev=>{ const next = { ...prev, [key]: value }; saveDrafts(next); return next; });
  },[]);
  const unit = personal.unit === "kg" ? "kg" : "lb";
  const setUnit = React.useCallback(u=> updatePersonal(p=>({ ...p, unit:u })),[updatePersonal]);

  React.useEffect(()=>{
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});
  },[]);

  /* The schedule and each day's variants depend on the athlete's private setup. */
  const ready = boot.status==="ready";
  const sched = React.useMemo(()=> ready ? buildSchedule(boot.program, personal) : null, [ready, boot, personal]);
  const setup = React.useMemo(()=> ready ? normalizeSetup(boot.program, personal) : null, [ready, boot, personal]);
  const resolve = React.useCallback(day=>{
    if (!ready || !day) return day;
    return resolveDay(day, { program:boot.program, setup, zoneProfile:personal.zoneProfile,
      lbDone: w => setsOf(entryOn(log, "Mini Leg Blaster", addDays(sched.start, (w-1)*7 + 2))).length > 0 });
  },[ready, boot, setup, personal, log, sched]);

  const scrollTop = ()=>{ const el = scrollRef.current; if (el){ if (el.scrollTo) el.scrollTo(0,0); else el.scrollTop = 0; } };

  if (boot.status!=="ready") return <BootScreen error={boot.status==="error"} onRetry={load}/>;

  const { index, program, travel } = boot;
  const goHome = ()=>{ setScreen("home"); setSel(null); scrollTop(); };
  const openDay = iso=>{ setSel(iso); setHomeSel(iso); setScreen("day"); scrollTop(); };
  const d = sel ? resolve(sched.byIso[sel]) : null;
  const w = travelId && travel ? travel.find(x=>x.id===travelId) : null;
  const idx = sel ? sched.dates.indexOf(sel) : -1;
  const prevIso = idx > 0 ? sched.dates[idx-1] : null, nextIso = idx >= 0 && idx < sched.dates.length-1 ? sched.dates[idx+1] : null;

  return (
    <LogContext.Provider value={{ log, addSet, removeSet, setDone, replaceLog, drafts, setDraft, unit, setUnit, today }}>
      <div className="rl-shell">
        <div className="rl-scroll" ref={scrollRef}>
          <div key={screen+String(sel)+String(travelId)} style={{ animation:"rlRise 180ms cubic-bezier(.2,0,0,1)" }}>
            {screen==="home" && homeSel && (
              <Home program={program} sched={sched} index={index} today={today} sel={homeSel} setSel={setHomeSel}
                onOpen={openDay} hasTravel={!!(travel && travel.length)} resolve={resolve} done={log.done}
                onSetup={()=>{ setScreen("setup"); scrollTop(); }}
                onTravel={()=>{ setScreen("travel"); scrollTop(); }}/>
            )}
            {screen==="day" && d && (
              <>
                <StickyBar
                  left={<Pressable onClick={goHome} ariaLabel="Back to schedule" style={textBtn}>← Schedule</Pressable>}
                  right={<div style={{ display:"flex", gap:4 }}>
                    <Pressable onClick={()=>prevIso && openDay(prevIso)} disabled={!prevIso} ariaLabel="Previous session"
                      style={{ ...textBtn, textDecoration:"none", fontSize:20, justifyContent:"center", opacity:prevIso?1:.35 }}>‹</Pressable>
                    <Pressable onClick={()=>nextIso && openDay(nextIso)} disabled={!nextIso} ariaLabel="Next session"
                      style={{ ...textBtn, textDecoration:"none", fontSize:20, justifyContent:"center", opacity:nextIso?1:.35 }}>›</Pressable>
                  </div>}/>
                <SessionHeading d={d} sched={sched} today={today} onPick={openDay} extra={<DayBadges d={d}/>}/>
                {d.type==="gym"  && <GymDay d={d}/>}
                {d.type==="run"  && <RunDay d={d} warmup={program.runWarmup||[]}/>}
                {(d.type==="rest"||d.type==="race") && <BareDay d={d}/>}
              </>
            )}
            {screen==="setup" && program.engine && (
              <Setup program={program} sched={sched} personal={personal} setup={setup} update={updatePersonal} onHome={goHome}/>
            )}
            {screen==="travel" && travel && (
              <TravelList travel={travel} onHome={goHome} onOpen={id=>{ setTid(id); setScreen("travelDetail"); scrollTop(); }}/>
            )}
            {screen==="travelDetail" && w && (
              <TravelDetail w={w} onHome={goHome} onBack={()=>{ setScreen("travel"); scrollTop(); }}/>
            )}
          </div>
        </div>
      </div>
    </LogContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
