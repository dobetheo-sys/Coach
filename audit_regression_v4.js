// TEST DE RÉGRESSION COMPLET v4 — critères généralisés aux 4 disciplines
"use strict";
const path = process.argv[2];
if(!path){ console.error("Usage: node audit_regression_v4.js <fichier.html>"); process.exit(2); }
function fakeEl(){ return { value:"", innerHTML:"", textContent:"", dataset:{}, style:{},
  addEventListener(){}, appendChild(){}, removeChild(){}, click(){},
  querySelectorAll(){ return []; }, querySelector(){ return null; } }; }
global.document = { getElementById:()=>fakeEl(), querySelectorAll:()=>[], createElement:()=>fakeEl(), body:fakeEl() };
global.window = { scrollTo(){} };
global.Blob = function(){}; global.URL = { createObjectURL:()=>"blob:", revokeObjectURL(){} };
const fs = require("fs");
const html = fs.readFileSync(path, "utf8");
const mm = html.match(/<script>([\s\S]*?)<\/script>/);
if(!mm){ console.error("Aucun <script> trouvé."); process.exit(2); }
let code = mm[1].replace(/\n\s*renderStep\(\);\s*\n\s*\Z/, "\n");
code += "\nglobal.S = S; global.SPORTS = SPORTS; global.buildPlan = buildPlan;\n";
(0, eval)(code);

const DUP_MIN_LEN=30;
const CAPS = {
  run:{"5k":75,"10k":90,semi:130,marathon:180,trail:270},
  bike:{crit:150,route:180,clm:165,cyclo:240,gravel:330},
  swim:{sprint:1400,demifond:2000,fond:3000,ow:4500}, // non-debutant; debutant plafonné 900 séparément
  tri_brick:{S:90,M:120,"70.3":180,Full:300},
};
const SIGNATURE_NAME={ run:/sortie longue/i, bike:/sortie longue/i, swim:/longue continue|volume aérobie|volume \+ sighting/i, tri:/brick/i };
const REPART_TARGETS={ S:{sw:[15,30],bk:[35,50],rn:[25,40]}, M:{sw:[15,25],bk:[40,50],rn:[25,35]},
  "70.3":{sw:[12,20],bk:[45,55],rn:[25,32]}, Full:{sw:[8,15],bk:[50,60],rn:[20,28]} };
const MAX_EQUILIBRAGE_PER_WEEK=1;
const VOLPEAK_TOLERANCE=1.10; // aucune semaine ne doit dépasser volPeak déclaré de plus de 10%

function mkAnswers(sport, format, history, level, intent, extra){
  return Object.assign({
    format, history, level, intent,
    vol_max:"14", ftp_known:"oui", ftp:"227", pace_known:"oui", pace:"4:50",
    css_known:"oui", css:"1:58", age:"30", dispo:"quotidienne", shift_ok:"oui",
    off_which:"", injury:(sport==="tri"||sport==="run")?"course":"aucune",
    sessions_max:"10", doubles: sport==="tri"?"oui":"non", races:"non",
    epreuve: sport==="bike"?"route":undefined, terrain: sport==="bike"?"plat":"route",
    milieu: sport==="swim"?"bassin":undefined,
  }, extra||{});
}
function maxMinIn(det){ const m=[...(det||"").matchAll(/(\d+)\s*min/g)].map(x=>parseInt(x[1])); return m.length?Math.max(...m):0; }
function maxSwimMIn(det){ const m=[...(det||"").matchAll(/(\d+)\s*m\b(?!in)/g)].map(x=>parseInt(x[1])); return m.length?Math.max(...m):0; }
function totalSessionMinutes(det){
  if(!det) return 0; let total=0;
  [...det.matchAll(/(\d+)\s*×\s*(\d+)\s*min/g)].forEach(m=>{ total+=parseInt(m[1])*parseInt(m[2]); });
  const rem=det.replace(/\d+\s*×\s*\d+\s*min/g,"");
  [...rem.matchAll(/(\d+)\s*min/g)].forEach(m=>total+=parseInt(m[1]));
  return total;
}
function paceToSecPer100(det){ const m=(det||"").match(/(\d+)'(\d+)\/100m/); return m?parseInt(m[1])*60+parseInt(m[2]):null; }
function totalSwimMinutes(det){
  if(!det) return 0; const pace=paceToSecPer100(det); if(pace===null) return 0;
  let tm=0;
  [...det.matchAll(/(\d+)\s*×\s*(\d+)\s*m\b(?!in)/g)].forEach(m=>{ tm+=parseInt(m[1])*parseInt(m[2]); });
  const rem=det.replace(/\d+\s*×\s*\d+\s*m\b(?!in)/g,"");
  [...rem.matchAll(/(\d+)\s*m\b(?!in)/g)].forEach(m=>tm+=parseInt(m[1]));
  return Math.round(tm/100*pace/60*10)/10;
}
function splitBrick(det){
  const bikeM=det.match(/(\d+)\s*min\s*vélo(?!\s*souple)/); const runM=det.match(/(\d+)\s*min\s*CAP/);
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
  const isBeg = level==="debutant";

  chargeWeeks.forEach(w=>{
    const sessions = w.days.flatMap(d=>d.sessions.filter(s=>s.d!=="rs"));
    // C1 duplication (généralisé, déjà multi-discipline)
    const byDet={};
    sessions.forEach(s=>{ if(!s.det||s.det.length<DUP_MIN_LEN) return; byDet[s.det]=byDet[s.det]||new Set(); byDet[s.det].add(s.name); });
    Object.entries(byDet).forEach(([det,names])=>{ if(names.size>1) issues.push({crit:"C1_duplication",week:w.num,names:[...names]}); });

    // C2 durée/distance manquante (généralisé)
    sessions.forEach(s=>{
      if(!s.det || !/@/.test(s.det)) return;
      let core = s.det.replace(/Échauffement[^·]*·/gi,"").replace(/Retour au calme[^—]*(—|$)/gi,"");
      const hasMin=/\d+\s*min/.test(core);
      const hasDist=/^\s*\d+\s*m\b/.test(core.trim())||/\d+\s*×\s*\d+\s*m\b/.test(core)||/\d+\s*m\s*@/.test(core);
      if(!hasMin && !hasDist) issues.push({crit:"C2_duree_manquante",week:w.num,name:s.name});
    });

    // C3 plafond par format (généralisé run/bike/swim/tri-brick)
    if(sport==="run"||sport==="bike"){
      sessions.filter(s=>s.d===(sport==="run"?"rn":"bk")).forEach(s=>{
        const mx=maxMinIn(s.det); const cap=CAPS[sport][format];
        if(cap && mx>cap*1.05) issues.push({crit:"C3_plafond_depasse",week:w.num,value:mx,cap});
      });
    }
    if(sport==="swim"){
      sessions.filter(s=>s.d==="sw").forEach(s=>{
        const mx=maxSwimMIn(s.det); const cap=isBeg?900:CAPS.swim[format];
        if(cap && mx>cap*1.05) issues.push({crit:"C3_plafond_depasse",week:w.num,value:mx,cap});
      });
    }
    if(sport==="tri"){
      sessions.filter(s=>s.d==="br").forEach(s=>{
        const m2=s.det.match(/(\d+)\s*min\s*vélo(?!\s*souple)/); if(!m2) return;
        const bikeMin=parseInt(m2[1]); const cap=CAPS.tri_brick[format];
        if(cap && bikeMin>cap*1.05) issues.push({crit:"C3_plafond_depasse",week:w.num,value:bikeMin,cap});
      });
    }

    // C7 jours "équilibrage" excessifs (généralisé)
    const eqCount = sessions.filter(s=>/équilibrage pic/i.test(s.name||"")).length;
    if(eqCount>MAX_EQUILIBRAGE_PER_WEEK) issues.push({crit:"C7_equilibrage_excessif",week:w.num,count:eqCount});

    // NOUVEAU (relâché après vérification) : au moins 1 jour de repos OU récupération
    // active par semaine — pas uniquement le repos total, la récup active (vélo/nage)
    // est une alternative légitime, contrairement à la course où l'impact justifie
    // un vrai repos complet.
    const hasRestOrRecup = w.days.some(d=>d.sessions.length===1 &&
      (d.sessions[0].d==="rs" && /^OFF\b/i.test(d.sessions[0].name||"")) ||
      /récup/i.test(d.sessions.map(s=>s.name).join(" ")));
    if(!hasRestOrRecup) issues.push({crit:"C8_pas_de_repos_ni_recup",week:w.num});

    // NOUVEAU : aucune semaine ne dépasse volPeak déclaré de plus de 10%
    if(w.vol > plan.volPeak*VOLPEAK_TOLERANCE) issues.push({crit:"C9_depasse_volpeak",week:w.num,vol:w.vol,volPeak:plan.volPeak});
  });

  // C4 généralisé : la séance signature (longue/brick) doit apparaître en phase "peak"
  const peakWeeks = chargeWeeks.filter(w=>w.days.find(d=>d.phaseId)?.phaseId==="peak");
  if(peakWeeks.length){
    const sig = SIGNATURE_NAME[sport];
    const hasSigInPeak = peakWeeks.some(w=>w.days.some(d=>d.sessions.some(s=>sig.test(s.name||""))));
    if(!hasSigInPeak) issues.push({crit:"C4_signature_absente_peak", phase:"peak"});
  }

  // C5 généralisé : taper doit réduire d'au moins 30% vs le pic réel de tout le plan
  if(chargeWeeks.length){
    const peakVol = Math.max(...chargeWeeks.map(w=>w.vol));
    plan.weeks.filter(w=>w.days.find(d=>d.phaseId)?.phaseId==="taper" && !w.isRecup).forEach(w=>{
      if(w.vol > peakVol*0.7) issues.push({crit:"C5_taper_insuffisant",week:w.num,vol:w.vol,peakVol});
    });
  }

  // C6 répartition (tri uniquement, structurel — ne s'applique pas aux sports mono-discipline)
  if(sport==="tri" && chargeWeeks.length){
    const maxWeek = chargeWeeks.reduce((a,b)=>b.vol>a.vol?b:a, chargeWeeks[0]);
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
      if(pSw<t.sw[0]||pSw>t.sw[1]) issues.push({crit:"C6_repartition_nage",value:pSw.toFixed(0),target:t.sw});
      if(pBk<t.bk[0]||pBk>t.bk[1]) issues.push({crit:"C6_repartition_velo",value:pBk.toFixed(0),target:t.bk});
      if(pRn<t.rn[0]||pRn>t.rn[1]) issues.push({crit:"C6_repartition_course",value:pRn.toFixed(0),target:t.rn});
    }
  }

  return {sport,format,history,level,intent,issues};
}

const SF={ run:["5k","10k","semi","marathon","trail"], bike:["crit","route","clm","cyclo","gravel"],
  swim:["sprint","demifond","fond","ow"], tri:["S","M","70.3","Full"] };
const HIST=["reprise","confirme","ancien"], LVL=["debutant","inter","avance"], INT=["finir","plaisir","competition"];

let byCrit={}, totalPlans=0, plansWithIssues=0;
console.log("=== AUDIT DE RÉGRESSION v4 — critères généralisés aux 4 disciplines ===\n");
for(const sport of Object.keys(SF)){
  let n=0, withIssues=0; const localByCrit={};
  for(const format of SF[sport]) for(const history of HIST) for(const level of LVL) for(const intent of INT){
    n++; totalPlans++;
    const r=auditPlan(sport,format,history,level,intent);
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
