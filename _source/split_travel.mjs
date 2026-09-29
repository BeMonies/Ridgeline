import fs from 'fs';
const glPath = 'site/programs/golden-leaf-2026.json';
const gl = JSON.parse(fs.readFileSync(glPath,'utf8'));
// Travel is date-independent and product-level: it moves out of the archive into its own file.
// Terminology aligned to the active program: "Strength Balance" → "Conditioning", "Isolation dose" → "Isolation".
const travel = JSON.parse(JSON.stringify(gl.travel)
  .replace(/"Strength Balance"/g,'"Conditioning"')
  .replace(/Isolation dose/g,'Isolation'));
delete gl.travel;
fs.writeFileSync(glPath, JSON.stringify(gl, null, 1));
fs.writeFileSync('site/programs/travel.json', JSON.stringify(travel, null, 1));
fs.writeFileSync('site/programs/index.json', JSON.stringify({
  active: "ski-2026",
  travel: "programs/travel.json",
  programs: [
    { id:"ski-2026", name:"Mountain Athlete Hybrid", file:"programs/ski-2026.json", status:"active", dates:"from Oct 5, 2026" },
    { id:"golden-leaf-2026", name:"Golden Leaf", file:"programs/golden-leaf-2026.json", status:"archived", dates:"Aug 3 – Sep 26, 2026" }
  ]}, null, 1));
const secs = travel.flatMap(w=>w.sections.map(s=>s.title));
console.log("travel workouts:", travel.length, "| section titles:", [...new Set(secs)].join(", "));
