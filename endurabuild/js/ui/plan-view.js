// Module extrait de Coach_Pro_V1.5.html par scripts/splitPwa.py — extraction fidèle,
// ne pas éditer la logique ici sans relancer les audits (npm run audit:v1 / audit:v2).
import { SPORTS } from "../config.js";
import { S, todayISO, fmtDay } from "../state.js";
import { evalRules } from "../ui/steps.js";
import { renderTabs, invalidatePlan, ensurePlan } from "./tabs.js";

const _IFZ={"bk.z2":.65,"bk.ss":.90,"bk.vo2":1.12,"bk.frc":.82,"bk.rp":.84,"bk.thr":1.0,
  "rn.easy":.68,"rn.mara":.84,"rn.thr":.98,"rn.vo2":1.10,"rn.rec":.60,
  "sw.easy":.65,"sw.aero":.75,"sw.css":.95,"sw.speed":1.08};
function _blkMin(st){const r=st.reps||1;if(st.durationMin!=null)return r*st.durationMin;if(st.distanceM!=null)return st.d==="sw"?r*st.distanceM/100*2:r*st.distanceM/1000*5;return 0;}
function estimateTSS(s){if(!s||!s.steps||!s.steps.length)return 0;let t=0;s.steps.forEach(st=>{const mn=_blkMin(st);const IF=st.role==="body"?(_IFZ[st.zone]||0.70):0.5;t+=(mn/60)*IF*IF*100;});return Math.round(t);}
function loadSeries(plan){
  const days=[];plan.weeks.forEach(w=>w.days.forEach(d=>{let tss=0;d.sessions.forEach(s=>{if(s.d!=="rs")tss+=estimateTSS(s);});days.push({week:w.num,jour:d.jour,tss:tss,recup:w.isRecup});}));
  const seed=days.slice(0,7).reduce((a,d)=>a+d.tss,0)/7||0;let ctl=seed,atl=seed;const out=[];
  days.forEach(d=>{const tsb=ctl-atl;ctl+=(d.tss-ctl)/42;atl+=(d.tss-atl)/7;out.push({week:d.week,ctl:ctl,atl:atl,tsb:tsb});});
  // échantillon hebdo = dernière valeur de chaque semaine
  const byWeek={};out.forEach(o=>byWeek[o.week]=o);
  return Object.keys(byWeek).map(k=>byWeek[k]);
}
function loadChartSVG(plan){
  const S2=loadSeries(plan);if(!S2.length)return"";
  const W=Math.max(320,S2.length*22),H=150,PL=34,PR=10,PT=12,PB=22,iw=W-PL-PR,ih=H-PT-PB;
  const maxL=Math.max(1,...S2.map(o=>Math.max(o.ctl,o.atl)));
  const tsbMax=Math.max(10,...S2.map(o=>Math.abs(o.tsb)));
  const x=i=>PL+(S2.length<2?iw/2:i/(S2.length-1)*iw);
  const yL=v=>PT+ih-(v/maxL)*ih;              // CTL/ATL (0..max)
  const yB=v=>PT+ih/2-(v/tsbMax)*(ih/2);      // TSB (centré sur 0)
  const line=(sel,col,w)=>"<polyline fill=\"none\" stroke=\""+col+"\" stroke-width=\""+w+"\" points=\""+S2.map((o,i)=>x(i).toFixed(1)+","+sel(o).toFixed(1)).join(" ")+"\"/>";
  let g="<svg viewBox=\"0 0 "+W+" "+H+"\" width=\"100%\" style=\"max-width:"+W+"px;display:block;margin:6px auto\" role=\"img\" aria-label=\"Courbe de charge CTL ATL TSB\">";
  g+="<line x1=\""+PL+"\" y1=\""+(PT+ih/2)+"\" x2=\""+(W-PR)+"\" y2=\""+(PT+ih/2)+"\" stroke=\"#0002\" stroke-dasharray=\"3 3\"/>";
  g+=line(o=>yB(o.tsb),"#00a376",2)+line(o=>yL(o.ctl),"#2e6bff",2.5)+line(o=>yL(o.atl),"#ff7a1a",1.8);
  g+="<text x=\"2\" y=\""+(PT+8)+"\" font-size=\"9\" fill=\"#635b4a\">charge</text>";
  g+="</svg>";
  return g;
}

/* ============================================================
   RENDU & NAVIGATION
   ============================================================ */
function driverBand(a){
  const sp=S.sport, chips=[];
  const C=(ic,txt,col)=>chips.push('<span class="drv" style="--dc:'+col+'"><b>'+ic+'</b>'+txt+'</span>');
  // intention
  if(a.intent==="competition")C("🎯","Performance","#e63946");
  else if(a.intent==="finir")C("🏁","Finir","#ff7a1a");
  else if(a.intent==="plaisir")C("☀️","Plaisir","#2e6bff");
  // structure cycle
  const nOff=(a.off_which||"").split(",").filter(Boolean).length;
  if(a.dispo==="quotidienne"&&a.shift_ok==="oui"&&nOff<2)C("🔄","Cycles 10j","#9b72ff");
  else C("📅","Semaine 7j","#9b72ff");
  // données / zones
  if(sp==="bike"||sp==="tri"){ if(a.ftp_known==="oui")C("⚡","FTP "+a.ftp+"W","#f0b429"); else C("❤️","Zones FC","#f0b429"); }
  if(sp==="run"||sp==="tri"){ if(a.pace_known==="oui")C("⏱","Seuil "+a.pace,"#00a376"); else C("❤️","Zones FC","#00a376"); }
  if(sp==="swim"){ if(a.css_known==="oui")C("⏱","CSS "+a.css,"#00b8d9"); else C("🌊","Technique","#00b8d9"); }
  // blessure
  const inj=(a.injury||"").split(",").filter(x=>x&&x!=="aucune");
  if(inj.length)C("🩹",inj.length>1?"Prudence blessures":"Adapté blessure","#e63946");
  // santé / garde-fou
  if(a.hrv==="oui")C("📈","Garde-fou HRV","#00a376");
  if(a.history==="reprise")C("🌱","Reprise — progressif","#00b8d9");
  // renfo (toujours)
  if(sp==="run")C("💪","Renfo + plio graduée","#9b72ff");
  else if(sp==="swim")C("💪","Renfo épaules","#9b72ff");
  else C("💪","Renfo intégré","#9b72ff");
  return '<div class="drv-band"><div class="drv-title">Ce qui pilote ton plan</div><div class="drv-wrap">'+chips.join("")+'</div></div>';
}
// Refonte onglets : l'ancien rendu monolithique est réparti dans js/ui/tab-*.js
// (général / avancement / semaine / profil). renderPlan reste le point d'entrée
// historique (steps.js « Générer », app.js reprise d'état) : il invalide le plan —
// les réponses ont pu changer — puis délègue au conteneur d'onglets, qui appelle
// buildPlan UNE seule fois via ensurePlan(). Un changement d'onglet ne régénère jamais.
function renderPlan(){
  invalidatePlan();
  renderTabs();
}
// Bug 2/5 — brancher planToJSON (interopérabilité) + export .ics (agenda de l'athlète).
function downloadPlan(){
  // R10 phase 0 — l'export réutilise le plan AFFICHÉ (ensurePlan) au lieu d'en régénérer un
  // second : deux générations pouvaient déjà diverger, et surtout un échec de génération
  // doit remonter comme tel, pas produire un export silencieusement différent.
  const a=S.answers, plan=ensurePlan(), cfg=SPORTS[S.sport];
  const ic={sw:"🏊",bk:"🚴",rn:"🏃",br:"🔁",rs:"💪"};
  let rows="";
  plan.weeks.forEach(w=>{
    const rt=w.race?" · 🏁 COURSE "+w.race:(w.postRace?" · récup post-course":"");
    rows+='<div class="w"><div class="wh"><b>Semaine '+w.num+'</b> · '+w.phase.nom+rt+' · '+w.vol+'h'+(w.isRecup?" (récup)":"")+'</div><div class="g">';
    w.days.forEach(d=>{
      const s=d.sessions.map(x=>ic[x.d]+" <b>"+x.name+"</b>"+(x.det?" — "+x.det:"")).join("<br>");
      rows+='<div class="d '+d.charge+'"><div class="dh">'+d.jour+(plan.use10?" · C"+d.cyc+"J"+d.jc:"")+'</div>'+s+'</div>';
    });
    rows+='</div></div>';
  });
  const rules=evalRules(a,S.tier);
  const blue=rules.map(r=>'<li><b>'+r.what+' :</b> '+r.val+'<br><span style="color:#555">'+r.why+'</span></li>').join("");
  // R16.8 — le DOCUMENT EXPORTÉ est autonome : il ne charge ni styles.css ni ses variables.
  // Ses tailles restent donc LITTÉRALES. Les ramener sur `var(--fs-*)` les rendrait toutes
  // à la taille par défaut du navigateur — même piège que les couleurs en R16.2.
  const doc='<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mon plan '+cfg.nom+'</title>'
    +'<style>body{font-family:-apple-system,Arial,sans-serif;max-width:900px;margin:0 auto;padding:24px;color:#16130e;background:#f1eadb}'
    +'h1{font-size:24px}h2{font-size:16px;margin-top:24px;border-bottom:2px solid #16130e;padding-bottom:4px}'
    +'.w{margin:14px 0;page-break-inside:avoid}.wh{font-size:14px;margin-bottom:6px}'
    +'.g{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}@media(max-width:680px){.g{grid-template-columns:repeat(2,1fr)}}'
    +'.d{border:1.5px solid #16130e;border-radius:6px;padding:6px;font-size:10px;min-height:70px}'
    +'.d.dur{background:#ffe3e0}.d.facile{background:#d9f3e1}.d.recup{background:#e9defc}.d.off{background:#eee}'
    +'.dh{font-weight:700;font-size:9px;margin-bottom:3px}ul{font-size:12px;line-height:1.5}'
    +'@media print{body{background:#fff}}</style></head><body>'
    +'<h1>'+cfg.ico+' Mon plan '+cfg.nom+'</h1>'
    +'<p>'+plan.totalWeeks+' semaines · '+(plan.use10?"cycles de 10 jours":"semaines de 7 jours")+' · volume '+plan.volBase+'h → '+plan.volPeak+'h · objectif '+(a.format||"")+'</p>'
    +'<h2>Les décisions de ton plan</h2><ul>'+blue+'</ul>'
    +'<h2>Calendrier complet</h2>'+rows
    +'<p style="margin-top:30px;font-size:11px;color:#635b4a">Généré par EnduraBuild · à valider avec un professionnel de santé. Astuce : ouvre ce fichier et fais Imprimer → Enregistrer en PDF.</p>'
    +'</body></html>';
  const blob=new Blob([doc],{type:"text/html"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url; link.download="plan-"+S.sport+"-"+(a.format||"")+".html";
  document.body.appendChild(link); link.click();
  setTimeout(()=>{document.body.removeChild(link);URL.revokeObjectURL(url);},200);
}

// ===== MOTEUR V2 (bundle EBV2, injecté en fin de fichier) =====
// La génération passe par le moteur TypeScript raisonné (src/ → npm run build:app).
// Refonte onglets : l'ancien v2ExtrasHTML est scindé en deux —
//   readinessCardHTML()  → carte « Forme du jour », rendue par l'onglet 🎯 Aujourd'hui (R16.9) ;
//   progressCardsHTML(p) → régularité/badges, prédiction, historique, intensités,
//                          décisions du moteur, rendus par l'onglet 📈 Avancement.
function readinessCardHTML(opts){
  if(!globalThis.EBV2)return "";
  const o=opts||{};
  const saved=(S.answers.readiness||{});
  const title=o.title||"🌡 Forme du jour — adapte ta séance";
  const sub=o.sub||"Quatre réponses au réveil, le moteur ajuste la journée (remplacer, réduire, reposer — jamais forcer).";
  return '<div class="load-card"'+(o.id?' id="'+o.id+'"':'')+'><div class="load-title">'+title+'</div>'
    +'<div class="load-sub" style="margin-bottom:8px">'+sub+'</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
    +'<select id="rdSleep" class="opt" style="padding:6px 10px"><option value="bon"'+(saved.sleepQuality==="bon"?" selected":"")+'>Sommeil bon</option><option value="moyen"'+(saved.sleepQuality==="moyen"||!saved.sleepQuality?" selected":"")+'>Sommeil moyen</option><option value="mauvais"'+(saved.sleepQuality==="mauvais"?" selected":"")+'>Sommeil mauvais</option></select>'
    +'<select id="rdHrv" class="opt" style="padding:6px 10px" title="Variabilité cardiaque (montre/bague) — laisse sur Normale si tu ne suis pas cette donnée"><option value="haute"'+(saved.hrvStatus==="haute"?" selected":"")+'>VFC haute</option><option value="normale"'+(saved.hrvStatus==="normale"||!saved.hrvStatus?" selected":"")+'>VFC normale</option><option value="basse"'+(saved.hrvStatus==="basse"?" selected":"")+'>VFC basse</option></select>'
    +'<select id="rdEnergy" class="opt" style="padding:6px 10px"><option value="80"'+(saved.energy===80?" selected":"")+'>Énergie haute</option><option value="55"'+(saved.energy===55||saved.energy==null?" selected":"")+'>Énergie moyenne</option><option value="35"'+(saved.energy===35?" selected":"")+'>Énergie basse</option><option value="15"'+(saved.energy===15?" selected":"")+'>Vidé·e</option></select>'
    +'<select id="rdFeel" class="opt" style="padding:6px 10px"><option value="frais"'+(saved.feel==="frais"?" selected":"")+'>Frais</option><option value="normal"'+(saved.feel==="normal"||!saved.feel?" selected":"")+'>Normal</option><option value="fatigue"'+(saved.feel==="fatigue"?" selected":"")+'>Fatigué</option></select>'
    +'<button class="btn primary" id="rdApply" type="button">'+(o.btnLabel||"Adapter ma journée")+'</button></div>'
    +'<div id="rdResult" style="margin-top:10px"></div></div>';
}
// Refonte R5 : les cartes d'avancement sont désormais INDÉPENDANTES pour être
// redistribuées entre onglets (Aujourd'hui/Plan/Profil) — même contenu, découpé.
function progressBarCardHTML(plan){
  let h="";
  if(globalThis.EBV2&&globalThis.EBV2.progress){
    const pg=globalThis.EBV2.progress(plan,S.answers,todayISO());
    const fire=pg.streakWeeks>0?"\ud83d\udd25":"\ud83c\udf31";
    h+='<div class="load-card"><div class="load-title">'+fire+' R\u00e9gularit\u00e9 & avancement</div>'
      +'<div class="load-sub" style="margin:6px 0">'
      +(pg.streakWeeks>0?'<b>'+pg.streakWeeks+' semaine'+(pg.streakWeeks>1?'s':'')+' de r\u00e9gularit\u00e9 d\u2019affil\u00e9e</b> (\u226580% des s\u00e9ances faites) \u2014 la r\u00e9gularit\u00e9 est ta priorit\u00e9 n\u00b03, continue !'
        :'Coche tes s\u00e9ances (\u25cb \u2192 \u2713) : la r\u00e9gularit\u00e9 se construit semaine apr\u00e8s semaine, une s\u00e9ance loup\u00e9e est pardonn\u00e9e.')
      +'</div>'
      +'<div style="background:var(--bg2,#e8e0cf);border:1.5px solid #16130e;border-radius:6px;height:14px;overflow:hidden"><div style="height:100%;width:'+pg.pctLoad+'%;background:#00a376"></div></div>'
      +'<div class="load-sub" style="margin-top:4px">Semaine '+pg.weekNow+'/'+pg.totalWeeks+' \u00b7 <b>'+pg.pctLoad+'%</b> de la charge du plan accomplie ('+(Math.round(pg.doneMin/6)/10)+'h / '+(Math.round(pg.totalMin/6)/10)+'h)</div>';
    if(globalThis.EBV2.badges){
      const bd=globalThis.EBV2.badges(plan,S.answers,todayISO());
      if(bd.length){h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">';
        bd.forEach(b=>{h+='<span title="'+b.why.replace(/"/g,"&quot;")+'" style="border:1.5px solid #16130e;border-radius:14px;padding:3px 10px;font-size:var(--fs-xs);background:#fff">'+b.icon+' '+b.label+'</span>';});
        h+='</div>';}
    }
    h+='</div>';
  }
  return h;
}
function predictionCardHTML(plan){
  let h="";
  if(globalThis.EBV2&&globalThis.EBV2.predict){
    try{
      const pr=globalThis.EBV2.predict(S.sport,S.answers,plan);
      if(pr.items.length||pr.advice.length){
        h+='<div class="load-card"><div class="load-title">\ud83d\udd2e Pr\u00e9diction de course</div>';
        // R14 \u2014 DEUX PR\u00c9DICTIONS, TOUJOURS \u00c9TIQUET\u00c9ES. La forme ACTUELLE reste l'ancre (c'est
        // la v\u00e9rit\u00e9 mesur\u00e9e) ; la forme PROJET\u00c9E dit o\u00f9 l'entra\u00eenement m\u00e8ne, avec sa date de
        // r\u00e9f\u00e9rence et sa confiance. Jamais l'une sans l'autre, jamais un chiffre nu.
        const pj=pr.projected;
        h+='<div class="load-sub" style="margin:8px 0 2px;font-weight:600">Aujourd\u2019hui \u2014 ta forme mesur\u00e9e</div>';
        pr.items.forEach(x=>{h+='<div class="load-sub" style="margin:6px 0"><b>'+x.leg+' : '+x.value+'</b><br><span style="color:#555">'+x.why+'</span></div>';});
        if(pj&&pj.applicable&&pj.items.length){
          const d=pj.raceDate?(fmtDay(pj.raceDate)+"/"+pj.raceDate.slice(0,4)):"le jour J";
          h+='<div class="load-sub" style="margin:12px 0 2px;font-weight:600">Projet\u00e9 au '+d
            +' <span style="font-weight:400;color:var(--muted)">\u00b7 confiance '+pj.confidence+'</span></div>';
          pj.items.forEach(x=>{h+='<div class="load-sub" style="margin:6px 0"><b>'+x.leg+' : '+x.value+'</b><br><span style="color:#555">'+x.why+'</span></div>';});
          h+='<div class="load-sub" style="color:var(--muted);margin-top:4px">Si tu suis ce plan. La fourchette est volontairement ASYM\u00c9TRIQUE : au pire, ta forme d\u2019aujourd\u2019hui \u2014 un plan suivi ne rend pas plus lent, il peut seulement rapporter moins que pr\u00e9vu.</div>';
          // R14.1 \u00a75 \u2014 le levier poids ne s'affiche QUE si l'athl\u00e8te l'a demand\u00e9 et a saisi sa
          // cible. Une sensibilit\u00e9, jamais un objectif ; aucun rythme, aucune consigne alimentaire.
          if(pj.weightLever){
            const wl=pj.weightLever;
            h+='<div class="load-sub" style="margin:10px 0 0;padding-top:8px;border-top:1px dashed #0002"><b>Sensibilit\u00e9 au poids (tu as demand\u00e9 ce levier)</b><br>'
              +'<span style="color:#555">'+wl.why+'</span></div>';
          }
        }
        pr.advice.forEach(x=>{h+='<div class="load-sub" style="margin:6px 0;color:#8a6d00">\u26a0 '+x+'</div>';});
        // Le MOTIF d'un refus de projeter vaut autant que la projection : \u00ab trop t\u00f4t pour
        // projeter \u00bb est une information, le silence n'en est pas une.
        if(pj&&!pj.applicable){
          const why=(pj.decisions||[]).filter(x=>/^P7-refus$|^P8$|^P6-sans-chrono$/.test(x.id))[0];
          if(why) h+='<div class="load-sub" style="margin:10px 0 0;color:var(--muted)"><b>Pas de chrono projet\u00e9</b> \u2014 '+why.why+'</div>';
        }
        h+='<div class="load-sub" style="color:var(--muted)">Fourchette, pas promesse \u2014 elle se resserre quand le plan est bien suivi (streak + charge accomplie).</div></div>';
      }
    }catch(e){console.warn(e);}
  }
  return h;
}
function historyCardHTML(plan){
  let h="";
  if(globalThis.EBV2&&globalThis.EBV2.progress){
    const pgh=globalThis.EBV2.progress(plan,S.answers,todayISO());
    const doneW=pgh.weekly.filter(w=>w.complete);
    if(doneW.length){
      h+='<div class="load-card"><div class="load-title">\ud83d\udcd2 Historique \u2014 pr\u00e9vu vs r\u00e9el</div>';
      doneW.slice(-8).forEach(w=>{
        const pc=w.minTotal>0?Math.round(w.minDone/w.minTotal*100):0;
        h+='<div style="display:flex;align-items:center;gap:8px;margin:4px 0;font-size:var(--fs-sm)">'
          +'<span style="width:34px"><b>S'+w.num+'</b></span>'
          +'<span style="width:20px">'+(w.ok?"\u2705":"\u25cb")+'</span>'
          +'<div style="flex:1;background:var(--bg2,#e8e0cf);border:1px solid #16130e;border-radius:4px;height:10px;overflow:hidden"><div style="height:100%;width:'+pc+'%;background:'+(w.ok?"#00a376":"#f0b429")+'"></div></div>'
          +'<span style="width:130px;text-align:right">'+w.done+'/'+w.total+' s\u00e9ances \u00b7 '+(Math.round(w.minDone/6)/10)+'/'+(Math.round(w.minTotal/6)/10)+'h</span></div>';
      });
      h+='<div class="load-sub" style="margin-top:4px">\u2705 = semaine r\u00e9guli\u00e8re (\u226580% des s\u00e9ances). Le r\u00e9el nourrit l\u2019ajusteur du matin \u2014 pas de rattrapage, jamais.</div></div>';
    }
  }
  return h;
}
function intensityCardHTML(plan){
  let h="";
  const v2=plan&&plan._v2;
  if(v2&&v2.intensity){
    const it=v2.intensity;
    h+='<div class="load-card"><div class="load-title">\ud83c\udfaf R\u00e9partition des intensit\u00e9s \u2014 '+it.easyPct+'% facile \u00b7 '+it.modPct+'% mod\u00e9r\u00e9 \u00b7 '+it.hardPct+'% dur</div>';
    const mx=Math.max(1,...it.weekly.map(w=>w.e+w.m+w.h));
    h+='<div style="display:flex;align-items:flex-end;gap:3px;height:56px;margin:8px 0 4px">';
    it.weekly.forEach(w=>{const t=w.e+w.m+w.h,H=Math.max(4,Math.round(t/mx*52));
      const eh=Math.round(H*w.e/Math.max(1,t)),mh=Math.round(H*w.m/Math.max(1,t)),hh=Math.max(0,H-eh-mh);
      h+='<div title="S'+w.num+' \u00b7 facile '+w.e+'min \u00b7 mod\u00e9r\u00e9 '+w.m+'min \u00b7 dur '+w.h+'min" style="flex:1;display:flex;flex-direction:column-reverse;height:'+H+'px">'
        +'<div style="height:'+eh+'px;background:#00a376"></div><div style="height:'+mh+'px;background:#f0b429"></div><div style="height:'+hh+'px;background:#e63946"></div></div>';});
    h+='</div><div class="load-sub"><span style="color:#00a376">\u25ac facile</span> \u00b7 <span style="color:#f0b429">\u25ac mod\u00e9r\u00e9</span> \u00b7 <span style="color:#e63946">\u25ac dur</span> \u2014 objectif manifeste : \u226570% de temps facile en semaines de charge (mesur\u00e9 : '+it.easyPct+'%).</div></div>';
  }
  return h;
}

// ─────────────────────────────────────────────────────────────────────
// §5 (MESSAGE_CLAUDE_CODE_R6) — L'EXPLICABILITÉ EN SURFACE PRODUIT.
//
// Le moteur produit déjà tout le « pourquoi » : `decisions[]`, `warnings`, et une `note` de
// justification sur CHAQUE séance (l'auditeur refuse une séance muette). Mais ça vivait dans
// `_v2`, derrière un repli fermé, en bas de l'onglet Plan — donc invisible. La critique
// standard des coachs automatiques est l'opacité ; nous avions la réponse en base sans la
// montrer. Rien n'est calculé ici : on remonte à la surface ce qui existe déjà.
// ─────────────────────────────────────────────────────────────────────

/** Le séparateur posé par `renderSess` entre le QUOI et le POURQUOI d'une séance. */
const WHY_SEP="\u2014 \u{1F4A1} ";
/** La justification d'une séance, séparée de sa description technique. */
function whyOf(s){
  if(s&&s.note)return String(s.note);
  const d=s&&s.det?String(s.det):"";
  const i=d.indexOf(WHY_SEP);
  return i<0?"":d.slice(i+WHY_SEP.length).trim();
}
/** La description technique seule (le « quoi »), sans la justification collée en queue. */
function techOf(s){
  const d=s&&s.det?String(s.det):"";
  const i=d.indexOf(WHY_SEP);
  return (i<0?d:d.slice(0,i)).trim();
}
/**
 * Le bloc repliable d'une séance dans une grille. Le POURQUOI passe devant le QUOI : quand
 * l'athlète ouvre une séance, la première chose qu'il lit est la raison d'être de la séance,
 * pas la liste des blocs. C'est l'ordre dans lequel un entraîneur parle.
 */
function sessDetailsHTML(s,style){
  if(!s.det)return "<b>"+s.name+"</b>";
  const why=whyOf(s),tech=techOf(s);
  return '<details class="gd-sess"'+(style?' style="'+style+'"':"")+'><summary><b>'+s.name+"</b></summary>"
    +(why?'<span class="gd-why">\u{1F4A1} '+why+"</span>":"")
    +'<span class="gd-det">'+tech+"</span></details>";
}

/**
 * « Pourquoi ce plan » — EN TÊTE de l'onglet Plan, dépliée, en langage d'athlète.
 * Les chiffres viennent des `decisions[]` du moteur : aucune phrase n'est inventée ici, chacune
 * cite la décision qui la produit. Le détail complet reste dans la carte du bas.
 */
function whyPlanCardHTML(plan){
  const v2=plan&&plan._v2;
  if(!v2||!v2.decisions||!v2.decisions.length)return "";
  const D={};v2.decisions.forEach(d=>{D[d.id]=d;});
  const li=[];
  const add=(txt,src)=>{if(txt)li.push('<li>'+txt+(src?' <span style="color:var(--muted)">('+src+')</span>':"")+"</li>");};
  if(D.duree)add("Ta préparation fait <b>"+D.duree.val+"</b>, découpée en phases : on construit d'abord, on aiguise ensuite, on arrive frais.","durée");
  // R20.2 — `capacite` est le plafond de l'HISTORIQUE, pas le volume déclaré par l'athlète.
  // La phrase disait « ton volume déclaré » depuis l'origine : sur un profil où les deux
  // diffèrent (le cas courant), elle renvoyait l'athlète corriger un curseur qui n'était pas
  // celui qui bornait. C'est le même défaut que R20.2 traite dans le moteur, à l'affichage.
  if(D.capacite&&D.utile)add("Le pic monte à ce que permet le plus petit des deux : ce que ton historique encaisse (<b>"+D.capacite.val+"</b>) et ce que ton objectif demande vraiment (<b>"+D.utile.val+"</b>). Promettre plus serait une promesse que le plan ne tient pas.","plafonds");
  else if(D.capacite)add("Le pic est plafonné à ce que ton historique encaisse : <b>"+D.capacite.val+"</b>.","plafond");
  // R20.2 — quand le volume max demandé n'est pas atteint, l'athlète l'apprend ICI, en tête,
  // pas au fond d'un volet dépliable : c'est une réponse qu'il a lui-même saisie et dont il
  // attend un effet. La phrase nomme le maillon qui a le plus retiré et, quand il en existe
  // un, le levier qui le débloquerait.
  if(D["R20.2"])add("<b>"+D["R20.2"].val+"</b>. "+D["R20.2"].why,"volume max");
  if(D.budget)add("<b>"+D.budget.val+"</b> séances par semaine"+(D["R10-depart"]?"" : "")+(D.recup?", avec une semaine allégée "+D.recup.val:"")+".","budget");
  if(D["R10-depart"])add("Le départ est calé sur ton volume RÉEL des derniers mois, pas sur ta cible : <b>"+D["R10-depart"].val+"</b>. C'est la marche la plus souvent trop haute.","reprise");
  if(D.impact)add("Pas plus de <b>"+D.impact.val+"</b> jours d'appui : c'est l'impact qui blesse, pas le volume.","impact");
  let h='<div class="load-card"><div class="load-title">\u{1F9ED} Pourquoi ce plan</div>'
    +'<ul style="font-size:var(--fs-md);line-height:1.55;margin:8px 0 0;padding-left:18px">'+li.join("")+"</ul>";
  if(v2.warnings&&v2.warnings.length)
    h+='<div class="load-sub" style="margin-top:8px">\u26A0 Ce que le moteur n\u2019a pas pu faire sous tes contraintes : '+v2.warnings[0]+(v2.warnings.length>1?' <a href="#motorDecisions" style="color:inherit">et '+(v2.warnings.length-1)+' autre'+(v2.warnings.length>2?"s":"")+"\u2026</a>":"")+"</div>";
  h+='<div class="load-sub" style="margin-top:6px"><a href="#motorDecisions" style="color:inherit">\u2193 Les '+v2.decisions.length+' décisions du moteur, en détail</a></div></div>';
  return h;
}

function decisionsCardHTML(plan){
  let h="";
  const v2=plan&&plan._v2;
  if(v2){
    h+='<details class="load-card" id="motorDecisions" style="cursor:pointer"><summary class="load-title">\ud83e\udde0 Les d\u00e9cisions du moteur ('+v2.decisions.length+') \u2014 score d\u2019audit '+v2.score+'/100</summary><ul style="font-size:var(--fs-sm);line-height:1.6;margin:8px 0 0;padding-left:18px">';
    // D1 (audit v6) — les règles non satisfaites sont calculées et attachées au plan :
    // on ne les jette plus à l'affichage. Langage neutre (pas de bandeau rouge — décision
    // R5 du fondateur), mais EN TÊTE de liste, pas cachées.
    if(v2.hardViolations&&v2.hardViolations.length){
      h+='<li style="color:#a33"><b>Règles non satisfaites malgré réparation ('+v2.hardViolations.length+') :</b><br>'+v2.hardViolations.map(x=>'· '+x).join('<br>')+'<br><span style="color:#555">Le moteur a rendu le meilleur plan possible sous tes contraintes — ces points expliquent le score.</span></li>';
    }
    v2.decisions.forEach(d=>{h+='<li><b>'+d.what+' :</b> '+d.val+'<br><span style="color:#555">'+d.why+'</span></li>';});
    if(v2.warnings.length)h+='<li><b>Limites connues de ce plan :</b> '+v2.warnings.join(" ")+'</li>';
    if(v2.repairs&&v2.repairs.length){
      h+='<li><details style="cursor:pointer"><summary>Réparations tentées par le moteur ('+v2.repairs.length+')</summary><div style="color:#555;margin-top:4px">'+v2.repairs.map(x=>'· '+x).join('<br>')+'</div></details></li>';
    }
    h+='</ul></details>';
  }
  return h;
}
// Météo du jour (manifeste §6) — Open-Meteo, gratuit et sans clé. Dégradation propre :
// pas de géoloc / hors-ligne / lent (>3.5s) → on adapte sans la météo, sans bloquer.

export { _IFZ, _blkMin, downloadPlan, driverBand, estimateTSS, loadChartSVG, loadSeries, renderPlan, readinessCardHTML, progressBarCardHTML, predictionCardHTML, historyCardHTML, intensityCardHTML, decisionsCardHTML, whyPlanCardHTML, sessDetailsHTML, whyOf, techOf };
