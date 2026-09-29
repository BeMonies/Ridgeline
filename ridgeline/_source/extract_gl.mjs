import fs from 'fs';
const src = fs.readFileSync('/mnt/user-data/outputs/ridgeline-prototype.jsx','utf8');
const a = src.indexOf('const MOB_STANDARD'), b = src.indexOf('/* ── RIDGELINE wordmark');
const code = src.slice(a,b).replace(/^import.*$/gm,'');
const M = await import('data:text/javascript;base64,'+Buffer.from(code+'\nexport {GYM,RUN,TRAVEL,RUN_MWU,PROGRAM,DATES};').toString('base64'));
const {PROGRAM,DATES,TRAVEL,RUN_MWU} = M;
const DOW=["mon","tue","wed","thu","fri","sat","sun"];
const days={};
for (const d of DATES){
  const p=PROGRAM[d.iso]; const pw=Math.floor(d.idx/7)+1, dow=DOW[d.idx%7];
  const key=`W${pw}-${dow}`;
  if (p.type==="rest") days[key]={type:"rest",title:"Rest Day"};
  else if (p.type==="race") days[key]={type:"race",title:"Race Day!"};
  else if (p.type==="run") days[key]={type:"run",title:p.cat,trt:p.trt,note:p.noGym?"No gym session today.":undefined,
      parts:p.parts.map(x=>({label:x.label,items:x.items}))};
  else days[key]={type:"gym",title:p.cat,bonus:!!p.bonus||undefined,hotel:!!p.hotel||undefined,note:p.note,
      sections:p.sections.map(s=>({title:s.title,meta:s.meta,items:s.items}))};
}
const prog={ id:"golden-leaf-2026", name:"Golden Leaf", subtitle:"Golden Leaf Half Marathon cycle",
  startDate:"2026-08-03", status:"archived", endCard:"Race Day!",
  runWarmup:RUN_MWU.items, travel:TRAVEL, days };
fs.mkdirSync('site/programs',{recursive:true});
fs.writeFileSync('site/programs/golden-leaf-2026.json', JSON.stringify(prog,null,1));
const types={}; Object.values(days).forEach(d=>types[d.type]=(types[d.type]||0)+1);
console.log("GL days:",Object.keys(days).length, JSON.stringify(types), "travel:",TRAVEL.length);
console.log("first/last:",Object.keys(days)[0], Object.keys(days).at(-1));
