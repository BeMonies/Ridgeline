import json
S="\u00b7"; D="\u2013"
def mv(n, rx=None, **k):
    d={"k":"mv","n":n}
    if rx: d["rx"]=rx
    d.update(k); return d
def flag(kind,text): return {"k":"flag","kind":kind,"text":text}
def note(t): return {"k":"note","text":t}
def sec(title, items, meta=None, rest=None):
    d={"title":title,"items":items}
    if meta: d["meta"]=meta
    if rest: d["rest"]=rest
    return d
def group(label, items, meta=None, rest=None):
    d={"k":"group","label":label,"items":items}
    if meta: d["meta"]=meta
    if rest: d["rest"]=rest
    return d

RUN_WU=[mv("Leg Swings, front-back and lateral","10 / side"), mv("Hip Circles","8 / side"),
        mv("Ankle Circles","10 / side"), mv("Walking Knee Hug","10 steps"), mv("Walking Leg Cradle","10 steps")]
def run(title, trt, items, optional=False):
    d={"type":"run","title":title,"trt":trt,"parts":[{"label":None,"items":items}]}
    if optional: d["optional"]=True
    return d
REST={"type":"rest","title":"Rest Day"}
FALLBACK_PU="If a rep slows noticeably or you start to kip, stop and finish that set's reps with a band."
REGRESS="If control breaks on a single-leg movement (hips rotate, knee caves, balance lost more than once in a set), drop to the previous variation and keep the prescribed sets and reps."
SCALE="Choose loads you can perform unbroken through the first round. Loads listed men's / women's."

days={}
# ───────── RESET · PROGRAM WEEK 1 · RECOVER ─────────
days["W1-mon"]=REST
days["W1-tue"]=run("Easy Run","0:45",[mv("Easy run","45 min "+S+" Easy",cue="Walk breaks welcome.")],optional=True)
days["W1-wed"]={"type":"gym","title":"Easy Full Body A","note":"Recover week "+S+" about 40 minutes","sections":[
  sec("Warm-Up",[mv("Easy bike","5 min"), mv("Goblet Squat","8 "+S+" 3-sec pause at bottom"),
     mv("Banded Pull-Apart","10"), mv("World's Greatest Stretch","3 / side")], meta="5 min bike, then 2 rounds "+S+" continuous"),
  sec("Main",[mv("Goblet Squat","8"), mv("Ring Row","10"), mv("DB Bench Press","10")],
     meta="3 rounds "+S+" not for time "+S+" RPE 5 "+S+" no rest between exercises", rest="rest 60 s after round"),
  sec("Accessory",[mv("Foot-on-Wall DB RDL","8 / side "+S+" light"), mv("Dead Bug","8 / side")],
     meta="2 rounds "+S+" no rest between exercises", rest="rest 30 s after round"),
  sec("Engine",[mv("Echo Bike","10 min "+S+" Easy")], meta="Continuous"),
  sec("Mobility",[mv("Couch Stretch","60 s / side"), mv("Pigeon","60 s / side"), mv("Child's Pose Lat Reach","60 s")], meta="Continuous")]}
days["W1-thu"]=run("Easy Run","0:45",[mv("Easy run","45 min "+S+" Easy")],optional=True)
days["W1-fri"]={"type":"gym","title":"Easy Full Body B","note":"Recover week "+S+" about 40 minutes","sections":[
  sec("Warm-Up",[mv("Easy row","5 min"), mv("Glute Bridge","10"), mv("Scap Pull-Up","8"), mv("Lateral Lunge","6 / side")],
     meta="5 min row, then 2 rounds "+S+" continuous"),
  sec("Main",[mv("KB Deadlift","10"), mv("DB Strict Press","8"), mv("Band-Assisted Pull-Up","6")],
     meta="3 rounds "+S+" RPE 5 "+S+" no rest between exercises", rest="rest 60 s after round"),
  sec("Accessory",[mv("Bulgarian Split Squat","8 / side "+S+" bodyweight"), mv("Suitcase Carry","30 m / side")],
     meta="2 rounds "+S+" no rest between exercises", rest="rest 30 s after round"),
  sec("Engine",[mv("Row","10 min "+S+" Easy")], meta="Continuous"),
  sec("Mobility",[mv("Supine Hamstring Stretch","60 s / side"), mv("Adductor Rock-Back","8 / side"), mv("Soleus Wall Stretch","45 s / side")], meta="Continuous")]}
days["W1-sat"]=run("Steady Run","1:00",[mv("Steady run","60 min "+S+" Steady",cue="Unstructured; terrain of choice.")])
days["W1-sun"]=REST

# ───────── RESET · PROGRAM WEEK 2 · CALIBRATE ─────────
CAL_NOTE="Record every \U0001F4DD value. Build Block 1 starting loads are set 5"+D+"10% below them."
days["W2-mon"]={"type":"gym","title":"Max Strength","calibration":True,"note":CAL_NOTE,"sections":[
  sec("Warm-Up",[mv("Row or Echo Bike","250 m or 12/9 cal "+S+" easy"), mv("Goblet Squat","8 "+S+" 3-sec pause"),
     mv("Banded Pull-Apart","10"), mv("World's Greatest Stretch","5 / side"), mv("Hollow Hold","20 s")], meta="2 rounds "+S+" continuous"),
  sec("Strength Intensity",[
     mv("Back Squat","Build to one set of 6 @ RPE 7, then 2 more sets of 6 at that load", rest="2:00 between sets", log="load", cal=True),
     mv("Strict Pull-Up","1 set "+S+" max clean strict reps", cue="Baseline for the strict pull-up progression.", log="reps", cal=True)]),
  sec("Conditioning",[
     mv("Bulgarian Split Squat","8 / side", rest="rest 30 s after exercise", log="load", cal=True),
     mv("Foot-on-Wall DB RDL","8 / side "+S+" @3011", log="load", cal=True),
     note("Find the load that feels RPE 7 on both and record it.")],
     meta="Durability Circuit "+S+" 2 rounds "+S+" not for time", rest="rest 60 s after round"),
  sec("Finisher",[mv("Standing Calf Raise, loaded, off a step","15", iso=True), mv("Ab Wheel Rollout","8")],
     meta="3 rounds "+S+" no rest between exercises", rest="rest 45 s after round"),
  sec("Mobility",[mv("Couch Stretch","60 s / side"), mv("Pigeon","60 s / side"), mv("Dead Hang","30 s")], meta="Continuous")]}
days["W2-tue"]=run("Easy + Strides","0:50",[mv("Easy run","45 min "+S+" Easy"),
     mv("Strides","6 "+"\u00d7"+" 20 s fast-but-relaxed", rest="60 s walk between")])
days["W2-wed"]={"type":"gym","title":"Upper + Engine","calibration":True,"note":CAL_NOTE,"sections":[
  sec("Warm-Up",[mv("Row","250 m "+S+" easy"), mv("Scap Pull-Up","10"), mv("Push-Up","10 "+S+" slow"),
     mv("Band Dislocate","10"), mv("Bird Dog","6 / side")], meta="2 rounds "+S+" continuous"),
  sec("Strength Intensity",[
     mv("Bench Press","Build to one set of 6 @ RPE 7, then 2 more sets of 6", rest="2:00 between sets", log="load", cal=True),
     mv("Ring Row","3 \u00d7 10", rest="60 s between sets"),
     mv("Pull-Up Negative","2 \u00d7 2 "+S+" 5-sec lower", rest="60 s between sets")]),
  sec("Conditioning",[{"k":"wod","head":"AMRAP 8","effort":"Steady effort","items":[
       mv("Wall Balls","8 "+S+" 20 / 14 lb"), mv("Band-Assisted Pull-Ups","6"), mv("Row","8 / 6 cal")]},
     flag("scaling",SCALE)], meta="WOD "+S+" clock-managed"),
  sec("Finisher",[mv("Hanging Knee Raise","10"), mv("DB Lateral Raise","15", iso=True)],
     meta="3 rounds "+S+" no rest between exercises", rest="rest 45 s after round"),
  sec("Mobility",[mv("Doorway Pec Stretch","45 s / side"), mv("Child's Pose Lat Reach","60 s"), mv("Thread-the-Needle","5 / side")], meta="Continuous")]}
days["W2-thu"]=run("Easy Run","0:45",[mv("Easy run","45 min "+S+" Easy")],optional=True)
days["W2-fri"]={"type":"gym","title":"Mountain Athlete","calibration":True,"note":CAL_NOTE,"sections":[
  sec("Warm-Up",[mv("Echo Bike","12 / 9 cal "+S+" easy"), mv("KB Deadlift","10 "+S+" light"), mv("Lateral Lunge","6 / side"),
     mv("Side Plank","20 s / side"), mv("Glute Bridge","10")], meta="2 rounds "+S+" continuous"),
  sec("Strength Intensity",[
     mv("Trap Bar Deadlift","Build to one set of 5 @ RPE 7, then 2 more sets of 5", rest="2:00 between sets", log="load", cal=True),
     group("Single-Leg Superset",[mv("Bulgarian Split Squat","8 / side "+S+" Monday's load", rest="rest 30 s after exercise"),
        mv("Foot-on-Wall DB RDL","8 / side "+S+" @3011 "+S+" Monday's load")], meta="2 rounds", rest="rest 60 s after round")]),
  sec("Conditioning",[mv("Lateral Bound","5 / side "+S+" stick each landing 2 s"), mv("Single-Arm KB Front-Rack Carry","40 m / side"),
     mv("Copenhagen Plank, short lever","20 s / side"), mv("Bear Crawl","20 m")],
     meta="Stability Circuit "+S+" 2 rounds "+S+" steady pace "+S+" no rest between exercises", rest="rest 60 s after round"),
  sec("Finisher",[mv("Single-Leg Bent-Knee Calf Raise","12 / side", iso=True), mv("Push-Up","12 "+S+" 3-sec lower"),
     mv("Chest-Supported DB Row","12")], meta="2 rounds "+S+" no rest between exercises", rest="rest 60 s after round"),
  sec("Mobility",[mv("Supine Hamstring Stretch","60 s / side"), mv("Adductor Rock-Back","8 / side"), mv("Soleus Wall Stretch","45 s / side")], meta="Continuous")]}
days["W2-sat"]=run("Long Run","1:10",[mv("Long run","70 min "+S+" Steady")])
days["W2-sun"]=REST

# ───────── BUILD · BLOCK 1 · PROGRAM WEEKS 3–6 ─────────
WODS=[
 {"head":"AMRAP 12","items":[mv("Wall Balls","10 "+S+" 20 / 14 lb"), mv("Band-Assisted Pull-Ups","8"), mv("Echo Bike","10 / 8 cal"), mv("DB Push Press","8 "+S+" 35 / 25 lb")]},
 {"head":"EMOM 15 "+S+" 5 rounds","items":[mv("Minute 1 "+S+" Row","12 / 10 cal"), mv("Minute 2 "+S+" Russian KB Swings","12 "+S+" 53 / 35 lb"), mv("Minute 3 "+S+" Push-Ups + Band-Assisted Pull-Ups","10 + 5")]},
 {"head":"3 rounds for time "+S+" 15-min cap","items":[mv("Echo Bike","15 / 12 cal"), mv("DB Thrusters","12 "+S+" 35 / 25 lb"), mv("Burpees","10"), mv("Band-Assisted Pull-Ups","10")]},
 {"head":"AMRAP 8","effort":"Steady effort, not Hard","items":[mv("Wall Balls","8"), mv("Ring Rows","8"), mv("Row","8 / 6 cal")]},
]
for i in range(4):
    pw=3+i; dl=(i==3)
    sq_sets=[5,5,6,3][i]; sq=["6 @ RPE 6","6 @ RPE 7","5 @ RPE 8","5 @ RPE 6"][i]
    slm=["5"+D+"6","6","6"+D+"7","5"][i]; rounds=[3,3,3,2][i]
    first=(i==0)
    bs={"t":"0:00","n":"Back Squat","rx":sq+" "+S+" @2011" if False else sq,"log":"load"}
    if first: bs["startFrom"]="cal"
    days[f"W{pw}-mon"]={"type":"gym","title":"Max Strength","deload":dl or None,"sections":[
      sec("Warm-Up",[mv("Row or Echo Bike","250 m or 12/9 cal "+S+" easy"), mv("Goblet Squat","8 "+S+" 3-sec pause at bottom"),
         mv("Banded Pull-Apart","10"), mv("World's Greatest Stretch","5 / side"), mv("Hollow Hold","20 s")], meta="2 rounds "+S+" continuous"),
      sec("Strength Intensity",[
         mv("Back Squat ramp-up","3"+D+"4 progressively heavier sets to working weight", rest="as needed, ~60"+D+"90 s"),
         {"k":"interval","every":"2:30","sets":sq_sets,"marks":[bs,{"t":"1:15","n":"Strict Pull-Up","rx":"2"}],"after":"rest until 2:30"},
         flag("fallback","Pull-up fallback: "+FALLBACK_PU)]),
      sec("Conditioning",[
         mv("Bulgarian Split Squat","8 / side @ RPE "+slm, rest="rest 30 s after exercise", log="load", **({"startFrom":"cal"} if first else {})),
         mv("Foot-on-Wall DB RDL","8 / side @ RPE "+slm+" "+S+" @3011", rest="rest 30 s after exercise", log="load", **({"startFrom":"cal"} if first else {})),
         mv("Sled Push","20 m "+S+" moderate"),
         flag("regression",REGRESS)],
         meta=f"Durability Circuit {S} {rounds} rounds {S} not for time", rest="rest 60 s after round"),
      sec("Finisher",[mv("Standing Calf Raise, loaded, off a step","15", iso=True), mv("Ab Wheel Rollout","8")],
         meta="3 rounds "+S+" no rest between exercises", rest="rest 45 s after round"),
      sec("Mobility",[mv("Couch Stretch","60 s / side"), mv("Pigeon","60 s / side"), mv("Dead Hang","30 s")], meta="Continuous")]}

    bp=["6 @ RPE 6","6 @ RPE 7","5 @ RPE 8","5 @ RPE 6"][i]
    bpm={"t":"0:00","n":"Bench Press","rx":bp,"log":"load"}
    if first: bpm["startFrom"]="cal"
    w=WODS[i]; wod={"k":"wod","head":w["head"],"items":w["items"]}
    if "effort" in w: wod["effort"]=w["effort"]
    days[f"W{pw}-wed"]={"type":"gym","title":"Upper + Engine","deload":dl or None,"sections":[
      sec("Warm-Up",[mv("Row","250 m "+S+" easy"), mv("Scap Pull-Up","10"), mv("Push-Up","10 "+S+" slow"),
         mv("Band Dislocate","10"), mv("Bird Dog","6 / side")], meta="2 rounds "+S+" continuous"),
      sec("Strength Intensity",[
         mv("Bench Press ramp-up","3 progressively heavier sets", rest="as needed, ~60"+D+"90 s"),
         {"k":"interval","every":"2:30","sets":[5,5,5,3][i],"marks":[bpm,
            {"t":"1:15","n":"Ring Row","rx":["10","12","12 "+S+" harder angle","10"][i]}],"after":"rest until 2:30"},
         flag("fallback","Ring row fallback: Chest-Supported DB Row."),
         mv("Pull-Up Negative",["3 \u00d7 2","3 \u00d7 2","3 \u00d7 3","2 \u00d7 2"][i]+" "+S+" jump or step to top, 5-sec lower", rest="60 s between sets")]),
      sec("Conditioning",[wod, flag("scaling",SCALE+" With 8+ strict pull-ups, use strict or kipping pull-ups in place of band-assisted.")],
         meta="WOD "+S+" clock-managed"),
      sec("Finisher",[mv("Hanging Knee Raise","10"), mv("DB Lateral Raise","15", iso=True)],
         meta="3 rounds "+S+" no rest between exercises", rest="rest 45 s after round"),
      sec("Mobility",[mv("Doorway Pec Stretch","45 s / side"), mv("Child's Pose Lat Reach","60 s"), mv("Thread-the-Needle","5 / side")], meta="Continuous")]}

    slf=["6"+D+"7","7","7"+D+"8","6"][i]
    tb={"t":"0:00","n":"Trap Bar Deadlift","rx":["5 @ RPE 6","5 @ RPE 7","5 @ RPE 7","5 @ RPE 6"][i],"log":"load"}
    if first: tb["startFrom"]="cal"
    days[f"W{pw}-fri"]={"type":"gym","title":"Mountain Athlete","deload":dl or None,"sections":[
      sec("Warm-Up",[mv("Echo Bike","12 / 9 cal "+S+" easy"), mv("KB Deadlift","10 "+S+" light"), mv("Lateral Lunge","6 / side"),
         mv("Side Plank","20 s / side"), mv("Glute Bridge","10")], meta="2 rounds "+S+" continuous"),
      sec("Strength Intensity",[
         mv("Trap Bar Deadlift ramp-up","3 progressively heavier sets", rest="as needed, ~60"+D+"90 s"),
         {"k":"interval","every":"2:00","sets":[4,4,5,3][i],"marks":[tb],"after":"rest until 2:00"},
         group("Single-Leg Superset",[
            mv("Bulgarian Split Squat","8 / side @ RPE "+slf, rest="rest 30 s after exercise", log="load"),
            mv("Foot-on-Wall DB RDL","8 / side @ RPE "+slf+" "+S+" @3011", log="load")],
            meta=f"{rounds} rounds", rest="rest 60 s after round"),
         flag("regression",REGRESS)]),
      sec("Conditioning",[mv("Lateral Bound","5 / side "+S+" stick each landing 2 s"),
         mv("Single-Arm KB Front-Rack Carry","40 m / side "+S+" "+["moderate","heavier","heavier","moderate"][i]),
         mv("Copenhagen Plank, short lever","20 s / side"), mv("Bear Crawl","20 m")],
         meta=f"Stability Circuit {S} {rounds} rounds {S} steady pace {S} no rest between exercises", rest="rest 60 s after round"),
      sec("Finisher",[mv("Single-Leg Bent-Knee Calf Raise","12 / side", iso=True), mv("Push-Up","12 "+S+" 3-sec lower"),
         mv("Chest-Supported DB Row","12")], meta="2 rounds "+S+" no rest between exercises", rest="rest 60 s after round"),
      sec("Mobility",[mv("Supine Hamstring Stretch","60 s / side"), mv("Adductor Rock-Back","8 / side"), mv("Soleus Wall Stretch","45 s / side")], meta="Continuous")]}

    if i==0: days[f"W{pw}-tue"]=run("Easy + Strides","0:50",[mv("Easy run","45 min "+S+" Easy"), mv("Strides","6 \u00d7 20 s fast-but-relaxed", rest="60 s walk between")])
    elif i<3: days[f"W{pw}-tue"]=run("Easy + Hill Strides","0:50",[mv("Easy run","45 min "+S+" Easy"), mv("Hill Strides","8 \u00d7 30 s uphill "+S+" Hard", rest="walk down, ~60"+D+"75 s")])
    else: days[f"W{pw}-tue"]=run("Easy Run","0:45",[mv("Easy run","45 min "+S+" Easy")])
    days[f"W{pw}-thu"]=run("Easy Run","0:45",[mv("Easy run","45 min "+S+" Easy")],optional=True)
    lr=["1:15","1:20","1:30","1:00"][i]; lm=["75","80","90","60"][i]
    days[f"W{pw}-sat"]=run("Long Run",lr,[mv("Long run",lm+" min "+S+" Steady")])
    days[f"W{pw}-sun"]=REST
    for dw in ("mon","wed","fri"):
        if days[f"W{pw}-{dw}"].get("deload") is None: days[f"W{pw}-{dw}"].pop("deload",None)
    if dl:
        for dw in ("tue","thu","sat"): days[f"W{pw}-{dw}"]["deload"]=True

prog={"id":"ski-2026","name":"Mountain Athlete Hybrid","subtitle":"Ski season and beyond",
      "startDate":"2026-10-05","status":"active","runWarmup":RUN_WU,
      "publishedThrough":"Build Block 1","nextUp":"Build Block 2",
      "days":days}
json.dump(prog, open("site/programs/ski-2026.json","w"), indent=1, ensure_ascii=False)
json.dump({"active":"ski-2026","programs":[
   {"id":"ski-2026","name":"Mountain Athlete Hybrid","file":"programs/ski-2026.json","status":"active"},
   {"id":"golden-leaf-2026","name":"Golden Leaf","file":"programs/golden-leaf-2026.json","status":"archived"}]},
   open("site/programs/index.json","w"), indent=1)
from collections import Counter
print("ski days:",len(days), dict(Counter(d["type"] for d in days.values())))
print("weeks:", sorted({k.split('-')[0] for k in days}, key=lambda x:int(x[1:])))
