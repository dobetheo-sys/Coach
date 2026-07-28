// Module extrait de Coach_Pro_V1.5.html par scripts/splitPwa.py — extraction fidèle,
// ne pas éditer la logique ici sans relancer les audits (npm run audit:v1 / audit:v2).
import { S } from "./state.js";
import { SPORTS } from "./config.js";
import { buildPlan } from "./app.js";

function planToJSON(a){
  const p=buildPlan(a);
  return {
    meta:{sport:a.sport||S.sport,format:a.format,raceDate:a.race_date||null,volPeak:p.volPeak,volBase:p.volBase,totalWeeks:p.totalWeeks},
    tests:Array.isArray(a.tests)?a.tests:[],
    weeks:p.weeks.map(w=>({num:w.num,phase:w.phase.id,isRecup:w.isRecup,targetMin:Math.round((w.vol_declared||w.vol)*60),
      days:w.days.map(d=>({date:d.date,sessions:d.sessions.filter(s=>s.d!=="rs").map(s=>({
        d:s.d,name:s.name,long:!!s.long,min:Math.round(s.min||0),
        steps:(s.steps||[]).map(st=>({role:st.role,reps:st.reps||1,durationMin:st.durationMin||null,distanceM:st.distanceM||null,intensity:st.intensity||null})),
        det:s.det}))}))}))
  };
}
// ===== Suivi de charge : TSS estimé (sans capteur) → CTL/ATL/TSB (fitness/fatigue/forme) =====
// IF (facteur d'intensité) par zone, dérivé des références relatives (ZDEF). TSS d'un bloc =
// durée(h) × IF² × 100. Warmup/cooldown à IF 0.5. Aucune donnée capteur requise.
function _dl(name,mime,content){try{const b=new Blob([content],{type:mime});const u=URL.createObjectURL(b);const el=document.createElement("a");el.href=u;el.download=name;document.body.appendChild(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}catch(e){alert("Export impossible : "+e.message);}}
function exportJSON(){try{const j=planToJSON(S.answers);_dl("plan-"+(S.sport||"eb")+".json","application/json",JSON.stringify(j,null,2));}catch(e){alert("Export impossible : "+e.message);}}
function exportICS(){try{
  const j=planToJSON(S.answers);
  const esc2=s=>String(s==null?"":s).replace(/([,;\\])/g,"\\$1").replace(/\r?\n/g,"\\n");
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//EnduraBuild//FR//","CALSCALE:GREGORIAN"];
  j.weeks.forEach(w=>w.days.forEach(d=>{if(!d.date)return;const dt=d.date.replace(/-/g,"");
    d.sessions.forEach((s,i)=>{L.push("BEGIN:VEVENT","UID:"+dt+"-"+i+"@endurabuild","DTSTART;VALUE=DATE:"+dt,"DTEND;VALUE=DATE:"+dt,"SUMMARY:"+esc2(s.name),"DESCRIPTION:"+esc2(s.det||""),"END:VEVENT");});}));
  L.push("END:VCALENDAR");
  _dl("plan-"+(S.sport||"eb")+".ics","text/calendar;charset=utf-8",L.join("\r\n"));
}catch(e){alert("Export impossible : "+e.message);}}

// ===== Export PNG (RESTE-A-FAIRE #1) : carte partageable du plan, canvas natif =====
function exportPNG(){try{
  const a=S.answers,plan=buildPlan(a),v2=plan._v2||{};
  const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;
  const x=c.getContext("2d");
  x.fillStyle="#f1eadb";x.fillRect(0,0,W,H);
  x.fillStyle="#0c1016";x.font="900 92px 'Archivo Black',sans-serif";x.fillText("ENDURABUILD",60,140);
  x.font="700 44px 'Space Grotesk',sans-serif";x.fillStyle="#e63946";
  x.fillText((SPORTS[S.sport]?SPORTS[S.sport].nom:S.sport)+" · "+(a.format||""),60,220);
  x.fillStyle="#0c1016";x.font="500 36px 'Space Grotesk',sans-serif";
  x.fillText(plan.totalWeeks+" semaines · "+plan.volBase+"h → "+plan.volPeak+"h"+(v2.score?" · audit "+v2.score+"/100":""),60,290);
  let y=360;
  (plan.phases||[]).forEach(p=>{const w=(W-120)*p.weeks/plan.totalWeeks;x.fillStyle=p.c;x.fillRect(60+((plan.phases.indexOf(p)===0)?0:0),y,0,0);});
  let px=60;(plan.phases||[]).forEach(p=>{const w=(W-120)*p.weeks/plan.totalWeeks;x.fillStyle=p.c;x.fillRect(px,y,Math.max(2,w-4),46);px+=w;});
  x.font="500 28px 'Space Grotesk',sans-serif";x.fillStyle="#555";x.fillText("Base → Développement → Spécifique → Peak → Affûtage",60,y+90);
  y+=160;
  const mx=Math.max(1,...plan.weeks.map(w=>w.vol));
  const bw=(W-120)/plan.weeks.length;
  plan.weeks.forEach((w,i)=>{const h=Math.max(8,Math.round(w.vol/mx*220));x.fillStyle=w.isRecup?"#9b72ff":(w.phase&&w.phase.c)||"#2e6bff";x.fillRect(60+i*bw,y+240-h,Math.max(2,bw-4),h);});
  y+=300;
  if(globalThis.EBV2&&globalThis.EBV2.predict){try{
    const pr=globalThis.EBV2.predict(S.sport,S.answers,plan);
    if(pr.items.length){x.fillStyle="#0c1016";x.font="700 40px 'Space Grotesk',sans-serif";x.fillText("Prédiction de course",60,y);y+=56;
      x.font="500 34px 'Space Grotesk',sans-serif";
      pr.items.forEach(it=>{x.fillText(it.leg+" : "+it.value,60,y);y+=48;});}
  }catch(e){}}
  if(globalThis.EBV2&&globalThis.EBV2.progress){try{
    const pg=globalThis.EBV2.progress(plan,S.answers,new Date().toISOString().slice(0,10));
    y+=30;x.fillStyle="#0c1016";x.font="700 40px 'Space Grotesk',sans-serif";
    x.fillText("Semaine "+pg.weekNow+"/"+pg.totalWeeks+" · "+pg.pctLoad+"% de la charge accomplie"+(pg.streakWeeks?" · streak "+pg.streakWeeks:""),60,y);
    y+=40;x.fillStyle="#e8e0cf";x.fillRect(60,y,W-120,26);x.fillStyle="#00a376";x.fillRect(60,y,(W-120)*pg.pctLoad/100,26);
  }catch(e){}}
  x.fillStyle="#777";x.font="500 26px 'Space Grotesk',sans-serif";
  x.fillText("Généré par EnduraBuild — plan raisonné, chaque décision justifiée",60,H-60);
  c.toBlob(b=>{const u=URL.createObjectURL(b);const l=document.createElement("a");l.href=u;l.download="enduraBuild-"+(S.sport||"plan")+".png";document.body.appendChild(l);l.click();setTimeout(()=>{document.body.removeChild(l);URL.revokeObjectURL(u);},200);},"image/png");
}catch(e){console.warn("exportPNG",e);}}

// ===== R4-3 : image STORY 1080×1920 (9:16) post-séance + partage natif =====
// Réutilise ce module (brief : étendre, pas dupliquer). Pas de SDK Instagram/Strava —
// aucune API publique de post direct côté web : le chemin réaliste est la Web Share API
// (feuille de partage de l'OS → Story), avec repli téléchargement (Safari desktop…).
// Pas de tracé GPS : l'import FIT actuel ne lit que le résumé de séance (pas les records
// GPS point à point) — on ne promet pas de carte qu'on n'a pas.
async function storyBlob(o){
  // o : {sessionName, detail, sport, streak, badge:{icon,label}|null, avatarSVG, accent}
  const W=1080,H=1920,c=document.createElement("canvas");c.width=W;c.height=H;
  const x=c.getContext("2d");
  const acc=o.accent||"#ff7a1a";
  const grad=x.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,"#f1eadb");grad.addColorStop(1,acc+"33");
  x.fillStyle=grad;x.fillRect(0,0,W,H);
  x.fillStyle=acc;x.fillRect(0,0,W,18);x.fillRect(0,H-18,W,18);
  x.fillStyle="#16130e";x.font="900 88px 'Archivo Black',sans-serif";x.fillText(o.title||"SÉANCE FAITE ✔",70,190);
  x.fillStyle=acc;x.font="700 52px 'Space Grotesk',sans-serif";
  x.fillText((SPORTS[o.sport]?SPORTS[o.sport].ico+" "+SPORTS[o.sport].nom:o.sport||""),70,290);
  // avatar au centre (SVG → Image via blob URL, même origine)
  if(o.avatarSVG){
    await new Promise(res=>{
      const b=new Blob([o.avatarSVG],{type:"image/svg+xml"});const u=URL.createObjectURL(b);
      const im=new Image();im.onload=()=>{x.drawImage(im,W/2-260,360,520,572);URL.revokeObjectURL(u);res();};
      im.onerror=()=>{URL.revokeObjectURL(u);res();};im.src=u;
    });
  }
  x.fillStyle="#16130e";x.font="800 64px 'Space Grotesk',sans-serif";
  const name=(o.sessionName||"").slice(0,28);
  x.fillText(name,Math.max(40,W/2-x.measureText(name).width/2),1080);
  if(o.detail){x.font="500 40px 'Space Grotesk',sans-serif";x.fillStyle="#3f3a30";
    const det=String(o.detail).split("—")[0].slice(0,44);
    x.fillText(det,Math.max(40,W/2-x.measureText(det).width/2),1150);}
  let y=1280;
  if(o.streak>1){x.font="700 54px 'Space Grotesk',sans-serif";x.fillStyle="#16130e";
    const t="🔥 "+o.streak+" jours d'affilée";
    x.fillText(t,Math.max(40,W/2-x.measureText(t).width/2),y);y+=90;}
  if(o.badge){x.font="700 50px 'Space Grotesk',sans-serif";x.fillStyle="#8a6d00";
    const t=o.badge.icon+" Badge débloqué : "+o.badge.label;
    x.fillText(t.slice(0,40),Math.max(40,W/2-x.measureText(t.slice(0,40)).width/2),y);y+=90;}
  x.font="500 36px 'Space Grotesk',sans-serif";x.fillStyle="#777";
  const d=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
  x.fillText(d,Math.max(40,W/2-x.measureText(d).width/2),y+20);
  x.font="700 40px 'Space Grotesk',sans-serif";x.fillStyle="#16130e";
  x.fillText("ENDURABUILD",70,H-80);
  x.font="500 30px 'Space Grotesk',sans-serif";x.fillStyle="#777";
  x.fillText("plan raisonné · chaque décision justifiée",70,H-40);
  return new Promise(res=>c.toBlob(res,"image/png"));
}
/** Partage natif (feuille OS → Story Instagram/etc.) ; repli : téléchargement du PNG. */
async function shareStory(o){
  const blob=await storyBlob(o);
  if(!blob)return false;
  const file=new File([blob],"endurabuild-seance.png",{type:"image/png"});
  if(navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){
    try{await navigator.share({files:[file],title:"Séance faite — EnduraBuild"});return true;}
    catch(e){if(e&&e.name==="AbortError")return true;/* l'utilisateur a annulé : pas un échec */}
  }
  const u=URL.createObjectURL(blob);const l=document.createElement("a");
  l.href=u;l.download="endurabuild-seance.png";document.body.appendChild(l);l.click();
  setTimeout(()=>{document.body.removeChild(l);URL.revokeObjectURL(u);},200);
  return true;
}

export { _dl, exportICS, exportJSON, exportPNG, planToJSON, shareStory, storyBlob };
