// TEST DE RÉGRESSION v2 — 5 critères (spécification utilisateur)
// Usage : node tests/audit_regression.js chemin/vers/endurabuild.html
// Sortie : détections par critère, code de sortie 1 si ≥1 détection (0 sinon).
//
// Critères :
//  1. DUPLICATION   — séances à noms différents partageant un contenu identique
//  2. DURÉE ABSENTE — séance sans durée NI distance chiffrée dans son corps
//                     (échauffement / retour au calme / note exclus)
//  3. BRICK PLAFOND — brick vélo ≤ S:90 / M:120 / 70.3:180 / Full:300 min, jamais dépassé
//  4. PIC ALIGNÉ    — la semaine de volume max du plan tombe en phase "peak"
//                     et contient le brick (tri uniquement)
//  5. TAPER         — volume moyen des semaines taper réduit d'au moins 30% vs pic réel,
//                     et aucune séance VO2max en taper (tri uniquement)
//  6. RÉPARTITION   — semaine pic tri : course 20-38%, nage 8-30%, vélo 33-65% du volume
//                     (cibles moyennes : course 25-35%, nage 10-25%, vélo 40-60%)
"use strict";
const path = process.argv[2];
if(!path){ console.error("Usage: node tests/audit_regression.js <fichier.html>"); process.exit(2); }

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
let code = m[1];
code += "\nglobal.S = S; global.SPORTS = SPORTS; global.buildPlan = buildPlan;\n";
(0, eval)(code);

const DUP_MIN_LEN=30;
const BRICK_CAPS={S:90,M:120,"70.3":180,Full:300};

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

// Corps de séance = det sans échauffement, retour au calme, ni note "— 💡"
function sessionBody(det){
  return det.split("— 💡")[0].split(" · ")
    .filter(seg=>!/^\s*Échauffement/i.test(seg)&&!/^\s*Retour au calme/i.test(seg))
    .join(" · ");
}
const hasNumberedLoad = body => /\d+\s*(?:min\b|km\b|m\b)/i.test(body);

// Volume approché d'une séance (minutes + mètres nage convertis à 3km/h)
function sessHours(det){
  if(!det) return 0;
  let mi=0, me=0;
  const rg=det.match(/(\d+)\s*-\s*(\d+)\s*min/gi);
  if(rg) rg.forEach(x=>{const n=x.match(/\d+/g).map(Number); if(n.length===2) mi+=Math.round((n[0]+n[1])/2);});
  const rp=det.match(/(\d+)\s*(?:×|x)\s*(\d+)\s*min/gi);
  if(rp) rp.forEach(x=>{const [a,b]=x.match(/\d+/g).map(Number); mi+=a*b;});
  const sg=det.match(/\b(\d+)\s*min(?!\s*-|@)/gi);
  if(sg) sg.forEach(x=>{const n=parseInt(x); const ir=det.includes(n+"-")||det.includes("-"+n); if(!ir&&(!rp||!x.match(/\d+\s*×/))) mi+=n;});
  const mp=det.match(/(\d+)\s*(?:×|x)\s*(\d+)\s*m\b(?!\/)/gi);
  if(mp) mp.forEach(x=>{const [a,b]=x.match(/\d+/g).map(Number); if(!det.includes(b+"m/")&&!det.includes("/"+b+"m")) me+=a*b;});
  const sm=det.match(/\b(\d{3,})\s*m(?!\s*\/)\b/gi);
  if(sm) sm.forEach(x=>{const n=parseInt(x); const ir=det.includes(n+"-")||det.includes("-"+n); const ip=det.includes(n+"×")||det.includes("×"+n); const ia=det.includes("/"+n+"m")||det.includes(n+"m/"); if(!ir&&!ip&&!ia) me+=n;});
  return (mi/60)+(me>0?(me/1000)/3:0);
}

function auditPlan(sport, format, history, level, intent){
  global.S.sport=sport;
  let plan;
  try{ plan=global.buildPlan(mkAnswers(sport,format,history,level,intent)); }
  catch(e){ return {sport,format,history,level,intent,error:String(e)}; }
  const r={sport,format,history,level,intent,dup:[],noload:[],brick:[],peak:[],taper:[],split:[]};
  const chargeWeeks=plan.weeks.filter(w=>!w.isRecup);

  chargeWeeks.forEach(w=>{
    // 1. duplication
    const byDet={};
    const sessions=w.days.flatMap(d=>d.sessions.filter(s=>s.d!=="rs"));
    sessions.forEach(s=>{
      if(!s.det||s.det.length<DUP_MIN_LEN) return;
      byDet[s.det]=byDet[s.det]||new Set();
      byDet[s.det].add(s.name);
    });
    Object.entries(byDet).forEach(([det,names])=>{
      if(names.size>1) r.dup.push({week:w.num,names:[...names],example:det.slice(0,90)});
    });
    // 2. durée/distance manquante
    sessions.forEach(s=>{
      if(!s.det) return;
      if(!hasNumberedLoad(sessionBody(s.det)))
        r.noload.push({week:w.num,name:s.name,det:s.det.slice(0,70)});
    });
    // 3. plafond brick
    sessions.forEach(s=>{
      if(sport!=="tri"||!/Brick/.test(s.name||"")) return;
      const mm=s.det.match(/(\d+)\s*min\s+vélo/);
      if(mm&&parseInt(mm[1])>(BRICK_CAPS[format]||1e9))
        r.brick.push({week:w.num,bike:parseInt(mm[1]),cap:BRICK_CAPS[format]});
    });
  });

  if(sport==="tri"){
    // 4. semaine max en peak + brick présent
    let mx=plan.weeks[0]; plan.weeks.forEach(w=>{if(w.vol>mx.vol)mx=w;});
    const hasBrick=mx.days.some(d=>d.sessions.some(s=>/Brick/.test(s.name||"")||s.d==="br"));
    if(mx.phase.id!=="peak"||!hasBrick)
      r.peak.push({week:mx.num,phase:mx.phase.id,vol:mx.vol,brick:hasBrick});
    // 5. taper : réduction ≥30% vs pic réel, pas de VO2max
    const taperWeeks=plan.weeks.filter(w=>w.phase.id==="taper");
    if(taperWeeks.length){
      const avg=taperWeeks.reduce((s,w)=>s+w.vol,0)/taperWeeks.length;
      const red=1-avg/mx.vol;
      if(red<0.30) r.taper.push({reduction:Math.round(red*100)+"%",avgTaper:avg.toFixed(1),peak:mx.vol});
      taperWeeks.forEach(w=>w.days.forEach(d=>d.sessions.forEach(s=>{
        if(/VO2/.test(s.name||"")) r.taper.push({week:w.num,vo2:s.name});
      })));
    }
    // 6. répartition disciplines sur la semaine pic
    const acc={sw:0,bk:0,rn:0};
    mx.days.forEach(d=>d.sessions.forEach(s=>{
      if(s.d==="rs") return;
      if(s.d==="br"){
        const bb=s.det.match(/(\d+)min vélo/), br=s.det.match(/(\d+)min CAP/);
        acc.bk+=((bb?parseInt(bb[1]):0)+15)/60; acc.rn+=(br?parseInt(br[1]):0)/60;
      } else {
        const h=sessHours(s.det);
        if(s.d==="sw") acc.sw+=h; else if(s.d==="bk") acc.bk+=h; else if(s.d==="rn") acc.rn+=h;
      }
    }));
    const tot=acc.sw+acc.bk+acc.rn;
    if(tot>0){
      const pc={sw:acc.sw/tot*100,bk:acc.bk/tot*100,rn:acc.rn/tot*100};
      if(pc.rn<20||pc.rn>38||pc.sw<8||pc.sw>30||pc.bk<33||pc.bk>65)
        r.split.push({week:mx.num,nage:Math.round(pc.sw)+"%",velo:Math.round(pc.bk)+"%",course:Math.round(pc.rn)+"%"});
    }
  }
  return r;
}

const SF={ run:["5k","10k","semi","marathon","trail"], bike:["crit","route","clm","cyclo","gravel"],
  swim:["sprint","demifond","fond","ow"], tri:["S","M","70.3","Full"] };
const HIST=["reprise","confirme","ancien"], LVL=["debutant","inter","avance"];
const CRIT=[["dup","duplication contenu"],["noload","durée/distance manquante"],["brick","plafond brick dépassé"],["peak","semaine pic mal alignée"],["taper","taper insuffisant/VO2"],["split","répartition disciplines"]];

let grandTotal=0;
console.log("=== AUDIT DE RÉGRESSION v2 — 5 critères ===\n");
for(const sport of Object.keys(SF)){
  const res=[];
  for(const format of SF[sport]) for(const history of HIST) for(const level of LVL)
    res.push(auditPlan(sport,format,history,level,"competition"));
  const errs=res.filter(r=>r.error);
  console.log(`${sport.toUpperCase()}: ${res.length} profils testés${errs.length?` — ERREURS D'EXÉCUTION: ${errs.length}`:""}`);
  errs.slice(0,2).forEach(e=>console.log(`  ERREUR ${e.format}/${e.history}/${e.level}: ${e.error}`));
  for(const [key,label] of CRIT){
    const withIssue=res.filter(r=>r[key]&&r[key].length>0);
    grandTotal+=withIssue.length;
    console.log(`  ${label}: ${withIssue.length}/${res.length}`);
    if(withIssue.length){
      const ex=withIssue[0], it=ex[key][0];
      console.log(`    ex: ${ex.format}/${ex.history}/${ex.level} → ${JSON.stringify(it).slice(0,140)}`);
    }
  }
  console.log();
}
console.log(`TOTAL détections (profils×critères): ${grandTotal}`);
process.exit(grandTotal>0?1:0);
