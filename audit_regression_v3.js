// TEST DE RÉGRESSION COMPLET v3 — 7 critères
"use strict";
const path = process.argv[2];
if(!path){ console.error("Usage: node audit_regression_v3.js <fichier.html>"); process.exit(2); }
function fakeEl(){ return { value:"", innerHTML:"", textContent:"", dataset:{}, style:{},
  addEventListener(){}, appendChild(){}, removeChild(){}, click(){},
  querySelectorAll(){ return []; }, querySelector(){ return null; } }; }
global.document = { getElementById:()=>fakeEl(), querySelectorAll:()=>[], createElement:()=>fakeEl(), body:fakeEl() };
global.window = { scrollTo(){} };
global.Blob = function(){}; global.URL = { createObjectURL:()=>"blob:", revokeObjectURL(){} };
const fs = require("fs");
const html = fs.readFileSync(path, "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if(!m){ console.error("Aucun <script> trouvé."); process.exit(2); }
let code = m[1].replace(/\n\s*renderStep\(\);\s*\n\s*\Z/, "\n");
code += "\nglobal.S = S; global.SPORTS = SPORTS; global.buildPlan = buildPlan;\n";
(0, eval)(code);

const DUP_MIN_LEN=30;
const TRI_BRICK_CAPS={S:{lo:45,hi:90},M:{lo:60,hi:120},"70.3":{lo:90,hi:180},Full:{lo:150,hi:300}};
// CRITÈRE 6 — fenêtres de répartition acceptables (% du volume hebdo de la semaine de pic)
const REPART_TARGETS={
  S:{sw:[15,30],bk:[35,50],rn:[25,40]}, M:{sw:[15,25],bk:[40,50],rn:[25,35]},
  "70.3":{sw:[12,20],bk:[45,55],rn:[25,32]}, Full:{sw:[8,15],bk:[50,60],rn:[20,28]},
};
// CRITÈRE 7 — jamais plus de 1 jour "OFF (équilibrage pic)" par semaine de charge
const MAX_EQUILIBRAGE_PER_WEEK=1;

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
function maxMinIn(det){ const m2=[...(det||"").matchAll(/(\d+)\s*min/g)].map(x=>parseInt(x[1])); return m2.length?Math.max(...m2):0; }
function totalSessionMinutes(det){
  if(!det) return 0; let total=0;
  [...det.matchAll(/(\d+)\s*×\s*(\d+)\s*min/g)].forEach(m2=>{ total+=parseInt(m2[1])*parseInt(m2[2]); });
  const rem=det.replace(/\d+\s*×\s*\d+\s*min/g,"");
  [...rem.matchAll(/(\d+)\s*min/g)].forEach(m2=>total+=parseInt(m2[1]));
  return total;
}
function paceToSecPer100(det){ const m2=(det||"").match(/(\d+)'(\d+)\/100m/); return m2?parseInt(m2[1])*60+parseInt(m2[2]):null; }
function totalSwimMinutes(det){
  if(!det) return 0; const pace=paceToSecPer100(det); if(pace===null) return 0;
  let tm=0;
  [...det.matchAll(/(\d+)\s*×\s*(\d+)\s*m\b(?!in)/g)].forEach(m2=>{ tm+=parseInt(m2[1])*parseInt(m2[2]); });
  const rem=det.replace(/\d+\s*×\s*\d+\s*m\b(?!in)/g,"");
  [...rem.matchAll(/(\d+)\s*m\b(?!in)/g)].forEach(m2=>tm+=parseInt(m2[1]));
  return Math.round(tm/100*pace/60*10)/10;
}
function splitBrick(det){
  const bikeM=det.match(/(\d+)\s*min\s*vélo(?!\s*souple)/);
  const runM=det.match(/(\d+)\s*min\s*CAP/);
  const echM=det.match(/Échauffement\s*(\d+)\s*min/);
  return {bike:(bikeM?parseInt(bikeM[1]):0)+(echM?parseInt(echM[1]):0), run:runM?parseInt(runM[1]):0};
}

function auditPlan(sport, format, history, level, intent){
  global.S.sport=sport;
  let plan;
  try{ plan=global.buildPlan(mkAnswers(sport,format,history,level,intent)); }
  catch(e){ return {sport,format,history,level,intent,error:String(e)}; }
  const chargeWeeks = plan.weeks.filter(w=>!w.isRecup);
  const issues=[];

  chargeWeeks.forEach(w=>{
    // C1 duplication
    const byDet={};
    w.days.flatMap(d=>d.sessions.filter(s=>s.d!=="rs")).forEach(s=>{
      if(!s.det||s.det.length<DUP_MIN_LEN) return;
      byDet[s.det]=byDet[s.det]||new Set(); byDet[s.det].add(s.name);
    });
    Object.entries(byDet).forEach(([det,names])=>{ if(names.size>1) issues.push({crit:"C1_duplication",week:w.num,names:[...names]}); });

    // C2 durée manquante (hors échauffement/retour au calme)
    w.days.flatMap(d=>d.sessions.filter(s=>s.d!=="rs")).forEach(s=>{
      if(!s.det || !/@/.test(s.det)) return;
      let core = s.det.replace(/Échauffement[^·]*·/gi,"").replace(/Retour au calme[^—]*(—|$)/gi,"");
      const hasMin=/\d+\s*min/.test(core);
      const hasDist=/^\s*\d+\s*m\b/.test(core.trim())||/\d+\s*×\s*\d+\s*m\b/.test(core)||/\d+\s*m\s*@/.test(core);
      if(!hasMin && !hasDist) issues.push({crit:"C2_duree_manquante",week:w.num,name:s.name});
    });

    if(sport==="tri"){
      // C3 plafond brick
      w.days.flatMap(d=>d.sessions.filter(s=>s.d==="br")).forEach(s=>{
        const m2=s.det.match(/(\d+)\s*min\s*vélo(?!\s*souple)/);
        if(!m2) return;
        const bikeMin=parseInt(m2[1]); const cap=TRI_BRICK_CAPS[format];
        if(cap && bikeMin>cap.hi) issues.push({crit:"C3_plafond_brick",week:w.num,value:bikeMin,cap:cap.hi});
      });
      // C7 jours "OFF équilibrage pic" excessifs
      const eqCount = w.days.flatMap(d=>d.sessions).filter(s=>/équilibrage pic/i.test(s.name||"")).length;
      if(eqCount>MAX_EQUILIBRAGE_PER_WEEK) issues.push({crit:"C7_equilibrage_excessif",week:w.num,count:eqCount,max:MAX_EQUILIBRAGE_PER_WEEK});
    }
  });

  if(sport==="tri"){
    // C4 alignement phase (semaine max = peak + contient le brick)
    const maxWeek = chargeWeeks.reduce((a,b)=>b.vol>a.vol?b:a, chargeWeeks[0]);
    const maxPhase = maxWeek.days.find(d=>d.phaseId)?.phaseId;
    const hasBrick = maxWeek.days.some(d=>d.sessions.some(s=>s.d==="br"));
    if(maxPhase!=="peak") issues.push({crit:"C4_semaine_max_hors_peak",week:maxWeek.num,phase:maxPhase});
    if(!hasBrick) issues.push({crit:"C4_semaine_max_sans_brick",week:maxWeek.num});

    // C5 taper
    const peakVol = Math.max(...chargeWeeks.map(w=>w.vol));
    plan.weeks.filter(w=>w.days.find(d=>d.phaseId)?.phaseId==="taper" && !w.isRecup).forEach(w=>{
      if(w.vol > peakVol*0.7) issues.push({crit:"C5_taper_insuffisant",week:w.num,vol:w.vol,peakVol});
    });

    // C6 répartition à la semaine de pic réelle
    let sw=0,bk=0,rn=0;
    maxWeek.days.forEach(d=>d.sessions.forEach(s=>{
      if(s.d==="sw") sw+=totalSwimMinutes(s.det);
      else if(s.d==="bk") bk+=totalSessionMinutes(s.det);
      else if(s.d==="rn") rn+=totalSessionMinutes(s.det);
      else if(s.d==="br"){ const sp=splitBrick(s.det); bk+=sp.bike; rn+=sp.run; }
    }));
    const tot=sw+bk+rn;
    if(tot>0){
      const t=REPART_TARGETS[format];
      const pSw=sw/tot*100, pBk=bk/tot*100, pRn=rn/tot*100;
      if(pSw<t.sw[0]||pSw>t.sw[1]) issues.push({crit:"C6_repartition_nage",week:maxWeek.num,value:pSw.toFixed(0),target:t.sw});
      if(pBk<t.bk[0]||pBk>t.bk[1]) issues.push({crit:"C6_repartition_velo",week:maxWeek.num,value:pBk.toFixed(0),target:t.bk});
      if(pRn<t.rn[0]||pRn>t.rn[1]) issues.push({crit:"C6_repartition_course",week:maxWeek.num,value:pRn.toFixed(0),target:t.rn});
    }
  }
  return {sport,format,history,level,intent,issues};
}

const SF={ run:["5k","10k","semi","marathon","trail"], bike:["crit","route","clm","cyclo","gravel"],
  swim:["sprint","demifond","fond","ow"], tri:["S","M","70.3","Full"] };
const HIST=["reprise","confirme","ancien"], LVL=["debutant","inter","avance"];

let byCrit={}, totalPlans=0, plansWithIssues=0;
console.log("=== AUDIT DE RÉGRESSION v3 — 7 critères ===\n");
for(const sport of Object.keys(SF)){
  let n=0, withIssues=0; const localByCrit={};
  for(const format of SF[sport]) for(const history of HIST) for(const level of LVL){
    n++; totalPlans++;
    const r=auditPlan(sport,format,history,level,"competition");
    if(r.issues && r.issues.length){
      withIssues++; plansWithIssues++;
      r.issues.forEach(i=>{ byCrit[i.crit]=(byCrit[i.crit]||0)+1; localByCrit[i.crit]=(localByCrit[i.crit]||0)+1; });
    }
  }
  console.log(`${sport.toUpperCase()} (n=${n}): ${withIssues} profil(s) avec ≥1 problème`);
  Object.entries(localByCrit).forEach(([c,cnt])=>console.log(`  ${c}: ${cnt}`));
}
console.log(`\nTOTAL: ${totalPlans} plans, ${plansWithIssues} avec problème(s)`);
console.log("Répartition globale:", JSON.stringify(byCrit,null,2));
process.exit(Object.keys(byCrit).length>0?1:0);
