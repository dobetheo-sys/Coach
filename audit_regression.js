// TEST DE RÉGRESSION — détection de contenu de séance dupliqué sous des noms différents
// Usage : node audit_regression.js chemin/vers/endurabuild.html
// Sortie : liste des cas détectés, code de sortie 1 si ≥1 cas trouvé (0 sinon).
"use strict";
const path = process.argv[2];
if(!path){ console.error("Usage: node audit_regression.js <fichier.html>"); process.exit(2); }

function fakeEl(){ return { value:"", innerHTML:"", textContent:"", dataset:{}, style:{},
  addEventListener(){}, appendChild(){}, removeChild(){}, click(){},
  querySelectorAll(){ return []; }, querySelector(){ return null; } }; }
global.document = { getElementById:()=>fakeEl(), querySelectorAll:()=>[], createElement:()=>fakeEl(), body:fakeEl() };
global.window = { scrollTo(){} };
global.Blob = function(){}; global.URL = { createObjectURL:()=>"blob:", revokeObjectURL(){} };

const fs = require("fs");
const html = fs.readFileSync(path, "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if(!m){ console.error("Aucun bloc <script> trouvé dans le fichier."); process.exit(2); }
let code = m[1].replace(/\n\s*renderStep\(\);\s*\n\s*\Z/, "\n");
code += "\nglobal.S = S; global.SPORTS = SPORTS; global.buildPlan = buildPlan;\n";
(0, eval)(code);

const DUP_MIN_LEN=30;
function mkAnswers(sport, format, history, level, intent){
  return {
    format, history, level, intent,
    vol_max:"14", ftp_known:"oui", ftp:"227", pace_known:"oui", pace:"4:50",
    css_known:"oui", css:"1:58", age:"30", dispo:"quotidienne", shift_ok:"oui",
    off_which:"", injury:(sport==="tri"||sport==="run")?"course":"aucune",
    sessions_max:"10", doubles: sport==="tri"?"oui":"non", races:"non",
    epreuve: sport==="bike"?"route":undefined, terrain: sport==="bike"?"plat":"route",
    milieu: sport==="swim"?"bassin":undefined,
  };
}

// Le critère qui compte : même texte de séance, sous des NOMS différents.
// (Deux séances "facile" identiques avec le MÊME nom sont légitimes — deux jours
// faciles peuvent se ressembler. Le bug, c'est quand des noms différents,
// qui promettent un contenu différent, servent en réalité le même texte.)
function auditPlan(sport, format, history, level, intent){
  global.S.sport=sport;
  let plan;
  try{ plan=global.buildPlan(mkAnswers(sport,format,history,level,intent)); }
  catch(e){ return {sport,format,history,level,intent,error:String(e)}; }
  const chargeWeeks = plan.weeks.filter(w=>!w.isRecup);
  const issues=[];
  chargeWeeks.forEach(w=>{
    const byDet={};
    w.days.flatMap(d=>d.sessions.filter(s=>s.d!=="rs")).forEach(s=>{
      if(!s.det||s.det.length<DUP_MIN_LEN) return;
      byDet[s.det]=byDet[s.det]||new Set();
      byDet[s.det].add(s.name);
    });
    Object.entries(byDet).forEach(([det,names])=>{
      if(names.size>1) issues.push({week:w.num, names:[...names], example:det.slice(0,90)});
    });
  });
  return {sport,format,history,level,intent, issues};
}

const SF={ run:["5k","10k","semi","marathon","trail"], bike:["crit","route","clm","cyclo","gravel"],
  swim:["sprint","demifond","fond","ow"], tri:["S","M","70.3","Full"] };
const HIST=["reprise","confirme","ancien"], LVL=["debutant","inter","avance"];

let totalTested=0, totalWithBug=0;
console.log("=== AUDIT DE RÉGRESSION — duplication de contenu sous noms différents ===\n");
for(const sport of Object.keys(SF)){
  const res=[];
  for(const format of SF[sport]) for(const history of HIST) for(const level of LVL)
    res.push(auditPlan(sport,format,history,level,"competition"));
  const withIssues=res.filter(r=>r.issues&&r.issues.length>0);
  totalTested+=res.length; totalWithBug+=withIssues.length;
  const pct=(withIssues.length/res.length*100).toFixed(0);
  console.log(`${sport.toUpperCase()}: ${res.length} profils testés, ${withIssues.length} avec bug (${pct}%)`);
  if(withIssues.length){
    const ex=withIssues[0];
    console.log(`  Exemple: ${ex.format}/${ex.history}/${ex.level}, semaine ${ex.issues[0].week}`);
    console.log(`  Noms différents, même contenu: ${ex.issues[0].names.join(" | ")}`);
    console.log(`  Texte: ${ex.issues[0].example}`);
  }
}
console.log(`\nTOTAL: ${totalTested} profils, ${totalWithBug} avec bug`);
process.exit(totalWithBug>0 ? 1 : 0);
