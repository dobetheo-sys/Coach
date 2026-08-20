// Module extrait de Coach_Pro_V1.5.html par scripts/splitPwa.py — extraction fidèle,
// ne pas éditer la logique ici sans relancer les audits (npm run audit:v1 / audit:v2).
import { SPORTS } from "../config.js";
import { S, todayISO, fmtDay, esc } from "../state.js";
import { evalRules } from "../ui/steps.js";
import { renderTabs, invalidatePlan, ensurePlan } from "./tabs.js";
import { logProjection } from "../projection-log.js"; // A-5 — enregistre, ne reboucle jamais
import { DISC, CHARGE } from "./icons.js";

// B1 (arbitrage du STOP de Phase 2, 14/08/2026) — LE GRAPHE DE CHARGE VIENT DU MOTEUR.
//
// L'ancien graphe était un MODÈLE ENTIER côté affichage : un TSS estimé par une table `_IFZ`
// (dupliquée ×3 dans le dépôt), une convolution CTL 42 j / ATL 7 j, et une courbe « Forme » —
// pendant que R14 REJETTE explicitement CTL/ATL dans le moteur, avec la raison écrite (unité
// de stress non commensurable entre nage/vélo/course, constantes de population 42/7 à variance
// individuelle énorme, modèle rétrospectif sur un produit prospectif). Une visualisation sur
// laquelle l'athlète AGIT est un modèle, quel que soit son nom : celle-ci pouvait contredire
// le verdict quotidien du `dailyAdjuster` SUR LE MÊME ÉCRAN, sans que l'athlète sache lequel
// croire. Décision du fondateur : ni brancher (ajouter CTL/ATL au moteur renverserait R14),
// ni assumer (« doctrine propre » = seconde doctrine non validée) — REDESSINER depuis la seule
// comptabilité que le moteur possède : `_v2.intensity.weekly`, les minutes facile/modéré/dur
// par semaine, LE classificateur de C26. Prévu contre validé, un seul classificateur.
//
// Meurent ici : `estimateTSS`, `_IFZ` (la copie UI — le cliquet Z-03 descend de 3 à 2),
// `loadSeries`/`weekLoadSeries` (la marche CTL/ATL), la courbe « Forme » — et avec eux la
// collision `--zn-swim` sur la courbe Fitness (dossier O-31/Z-11) et le bloqueur B1 de
// ZENNA_EXACTITUDE. Ce qu'on PERD est dit à l'athlète sous le graphe, plutôt que compensé
// par un autre nombre inventé (interdit explicite de l'arbitrage).

// Le MÊME vocabulaire que la carte « Répartition des intensités », quelques lignes plus bas —
// une écriture de plus de ces trois hex serait la dette que Z-01 traque ; ici on les partage.
/** Minutes d'un step — LUES sur ce que le moteur émet, jamais ré-estimées (lot interface,
 *  pièce 4). La dette « à brancher » du 14/08 attendait sa mesure : faite le 19/08/2026 sur
 *  le golden — **2 088 blocs multi-répétitions sur 2 088, `_min` = reps × durée + récup**
 *  (le TOTAL du bloc, R5.6a), 0 bloc sans `_min`. La sémantique est établie, on branche.
 *  Le repli (durée × reps, puis la conversion grossière 2 min/100 m · 5 min/km) ne sert plus
 *  qu'un step d'AVANT le rendu — un step rendu porte toujours `_min`. La conversion UI
 *  ré-estimait une sortie que le moteur possède (règle 12 portée par l'UI) : la barre de
 *  zones d'une nage était fausse pour tout athlète dont le CSS n'est pas 2:00/100 m. */
function _blkMin(st){if(st._min!=null)return st._min;const r=st.reps||1;if(st.durationMin!=null)return r*st.durationMin;if(st.distanceM!=null)return st.d==="sw"?r*st.distanceM/100*2:r*st.distanceM/1000*5;return 0;}

const CHARGE_CLASSES = [
  { k: "e", label: "facile", col: "#00a376" },
  { k: "m", label: "modéré", col: "#f0b429" },
  { k: "h", label: "dur", col: "#e63946" },
];

/** Prévu (le moteur l'émet) et VALIDÉ (les ✓) par classe et par semaine. Le validé passe par
 *  `EBV2.sessionSplit` — le classificateur du MOTEUR, jamais une table locale. La clé ✓ est
 *  celle de session-life : `w.num|jour|si`. */
function chargeSeries(plan){
  const weekly=(plan&&plan._v2&&plan._v2.intensity&&plan._v2.intensity.weekly)||[];
  const done=(S.answers&&S.answers.done)||{};
  const fait={};
  (plan.weeks||[]).forEach(w=>w.days.forEach(d=>d.sessions.forEach((s,si)=>{
    if(s.d==="rs"||!done[w.num+"|"+d.jour+"|"+si])return;
    let sp=null;
    try{sp=(globalThis.EBV2&&EBV2.sessionSplit)?EBV2.sessionSplit(s,S.answers):null;}catch(e){}
    const f=fait[w.num]||(fait[w.num]={e:0,m:0,h:0});
    if(sp){f.e+=sp.easyMin||0;f.m+=sp.modMin||0;f.h+=sp.hardMin||0;}
    else f.e+=s.min||0; // moteur indisponible : les minutes comptent quand même, en facile
  })));
  return weekly.map(w=>({num:w.num,prevu:{e:w.e,m:w.m,h:w.h},fait:fait[w.num]||{e:0,m:0,h:0}}));
}

/** Barres hebdomadaires : la silhouette PRÉVUE en teinte atténuée, les minutes VALIDÉES en
 *  pleine couleur par-dessus — même échelle, mêmes classes, aucun second modèle. Le trait
 *  vertical marque la semaine courante (R24.6, conservé de l'ancien graphe). */
function chargeChartSVG(plan){
  const serie=chargeSeries(plan);
  if(!serie.length)return "";
  const W=Math.max(320,serie.length*10),H=86,PT=10,PB=14,ih=H-PT-PB;
  const mx=Math.max(30,...serie.map(o=>o.prevu.e+o.prevu.m+o.prevu.h));
  const bw=W/serie.length;
  const tIso=todayISO();let wkNow=null;
  plan.weeks.forEach(w=>w.days.forEach(d=>{if(d.date===tIso)wkNow=w.num;}));
  let g='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" style="display:block;max-width:100%" role="img" aria-label="Charge par semaine : minutes prévues et validées, par intensité">';
  serie.forEach((o,i)=>{
    const x=i*bw+1,wB=Math.max(3,bw-2);
    let y=PT+ih;
    CHARGE_CLASSES.forEach(c=>{const hPix=(o.prevu[c.k]/mx)*ih;y-=hPix;
      if(hPix>0.4)g+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+wB.toFixed(1)+'" height="'+hPix.toFixed(1)+'" fill="'+c.col+'" opacity=".26"/>';});
    let y2=PT+ih;
    CHARGE_CLASSES.forEach(c=>{const hPix=(Math.min(o.fait[c.k],o.prevu[c.k]*1.5)/mx)*ih;y2-=hPix;
      if(hPix>0.4)g+='<rect x="'+(x+wB*0.22).toFixed(1)+'" y="'+y2.toFixed(1)+'" width="'+(wB*0.56).toFixed(1)+'" height="'+hPix.toFixed(1)+'" fill="'+c.col+'"/>';});
    g+='<title>S'+o.num+' · prévu '+(o.prevu.e+o.prevu.m+o.prevu.h)+"min · validé "+(o.fait.e+o.fait.m+o.fait.h)+"min</title>";
    // R24.6 (décision fondateur, 06/08) SURVIT au redessin B1 : le marqueur « tu es ici »
    // reste, ancré sur les dates réelles — seule la courbe sous lui a changé de modèle.
    if(o.num===wkNow)g+='<line x1="'+(x+wB/2).toFixed(1)+'" y1="'+PT+'" x2="'+(x+wB/2).toFixed(1)+'" y2="'+(PT+ih+4)+'" stroke="var(--zn-ink,#16130e)" stroke-width="1.5" stroke-dasharray="2 3"/>'
      +'<text x="'+Math.min(W-64,Math.max(2,x+wB/2+4)).toFixed(1)+'" y="'+(PT+8)+'" font-size="9" fill="var(--zn-muted,#635b4a)">tu es ici</text>';
  });
  g+="</svg>";
  return '<div style="overflow-x:auto">'+g+"</div>";
}

/** La même lecture, au grain du JOUR, pour le Bilan de la semaine (R29) : chaque jour porte
 *  ses minutes prévues par classe (le classificateur du moteur, séance par séance) et la
 *  part validée en pleine couleur. */
function weekChargeChartSVG(plan, wNum){
  const w=(plan.weeks||[]).find(x=>x.num===wNum);
  if(!w)return "";
  const done=(S.answers&&S.answers.done)||{};
  const jours=w.days.map(d=>{
    const prevu={e:0,m:0,h:0},fait={e:0,m:0,h:0};
    d.sessions.forEach((s,si)=>{
      if(s.d==="rs")return;
      let sp=null;
      try{sp=(globalThis.EBV2&&EBV2.sessionSplit)?EBV2.sessionSplit(s,S.answers):null;}catch(e){}
      const add=(cible)=>{if(sp){cible.e+=sp.easyMin||0;cible.m+=sp.modMin||0;cible.h+=sp.hardMin||0;}else cible.e+=s.min||0;};
      add(prevu);
      if(done[w.num+"|"+d.jour+"|"+si])add(fait);
    });
    return {jour:d.jour,prevu,fait};
  });
  const W=320,H=70,PT=8,PB=10,ih=H-PT-PB,bw=W/jours.length;
  const mx=Math.max(30,...jours.map(j=>j.prevu.e+j.prevu.m+j.prevu.h));
  let g='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" style="display:block;max-width:100%" role="img" aria-label="Charge de la semaine, jour par jour, par intensité">';
  jours.forEach((j,i)=>{
    const x=i*bw+3,wB=Math.max(4,bw-6);
    let y=PT+ih;
    CHARGE_CLASSES.forEach(c=>{const hPix=(j.prevu[c.k]/mx)*ih;y-=hPix;
      if(hPix>0.4)g+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+wB.toFixed(1)+'" height="'+hPix.toFixed(1)+'" fill="'+c.col+'" opacity=".26"/>';});
    let y2=PT+ih;
    CHARGE_CLASSES.forEach(c=>{const hPix=(j.fait[c.k]/mx)*ih;y2-=hPix;
      if(hPix>0.4)g+='<rect x="'+(x+wB*0.22).toFixed(1)+'" y="'+y2.toFixed(1)+'" width="'+(wB*0.56).toFixed(1)+'" height="'+hPix.toFixed(1)+'" fill="'+c.col+'"/>';});
  });
  g+="</svg>";
  return g;
}

/** La légende partagée des deux graphes — et la phrase qui DIT ce qui a disparu (arbitrage :
 *  « une courbe de charge honnête vaut mieux qu'un TSB inventé »). */
function chargeChartLegend(){
  return '<div class="load-sub">'+CHARGE_CLASSES.map(c=>'<span style="color:'+c.col+'">▬ '+c.label+"</span>").join(" · ")
    +' — teinte pâle = prévu, pleine = validé ✓. La courbe « Forme » a été retirée : elle sortait d’un modèle (TSS/CTL/ATL) que le moteur n’utilise pas — ce graphe montre la même comptabilité d’intensité que ton plan.</div>';
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
  let rows="";
  plan.weeks.forEach(w=>{
    const rt=w.race?" · 🏁 COURSE "+w.race:(w.postRace?" · récup post-course":"");
    rows+='<div class="w"><div class="wh"><b>Semaine '+w.num+'</b> · '+w.phase.nom+rt+' · '+w.vol+'h'+(w.isRecup?" (récup)":"")+'</div><div class="g">';
    w.days.forEach(d=>{
      const s=d.sessions.map(x=>(DISC[x.d]?DISC[x.d].ic:"")+" <b>"+x.name+"</b>"+(x.det?" — "+x.det:"")).join("<br>");
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
    // Les trois teintes de charge viennent de la table `CHARGE` — le document exporté ne charge
    // aucune variable CSS (voir la note R16.8 ci-dessus), donc elles s'interpolent ici en dur.
    // C'est le seul endroit où une valeur de charge est écrite littéralement dans du CSS, et
    // elle l'est depuis la source, pas depuis une copie.
    // UNE RÈGLE PAR LIGNE, et ce n'est pas cosmétique : la garde sélectionne les lignes qui
    // portent un sélecteur de charge puis y cherche un littéral. Sur une ligne qui empile
    // quatre règles, le `#eee` du repos (`.d.off`, hors table) tombait dans la même ligne que
    // `.d.recup` et faisait rougir une ligne correcte.
    +'.d.dur{background:'+CHARGE.dur.papier+'}'
    +'.d.facile{background:'+CHARGE.facile.papier+'}'
    +'.d.recup{background:'+CHARGE.recup.papier+'}'
    +'.d.off{background:#eee}'
    +'.dh{font-weight:700;font-size:9px;margin-bottom:3px}ul{font-size:12px;line-height:1.5}'
    +'@media print{body{background:#fff}}</style></head><body>'
    +'<h1>'+cfg.ico+' Mon plan '+cfg.nom+'</h1>'
    +'<p>'+plan.totalWeeks+' semaines · '+(plan.use10?"cycles de 10 jours":"semaines de 7 jours")+' · volume '+plan.volBase+'h → '+plan.volPeak+'h · objectif '+(a.format||"")+'</p>'
    +'<h2>Les décisions de ton plan</h2><ul>'+blue+'</ul>'
    +'<h2>Calendrier complet</h2>'+rows
    +'<p style="margin-top:30px;font-size:11px;color:#635b4a">Généré par Zenna · à valider avec un professionnel de santé. Astuce : ouvre ce fichier et fais Imprimer → Enregistrer en PDF.</p>'
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
/** R24.5 — l'item qui porte le TEMPS de l'épreuve, pour l'afficher en tête de carte.
 *  On ne CALCULE rien ici (R11.1 : le prédicteur est la seule source) : on repère l'item que
 *  le moteur a déjà émis — « 🏁 Total estimé » (multisport, PW), « Temps estimé » (trail),
 *  sinon le premier item dont la valeur est un temps (jamais des watts ni une vitesse). */
function tempsTotalItem(items){
  if(!Array.isArray(items)||!items.length)return null;
  return items.find(x=>/Total estim|Temps estim/.test(String(x.leg)))
    ||items.find(x=>/\d(h|')\d/.test(String(x.value))&&!/(W|km\/h|km-effort|m\/h|%)/.test(String(x.value)))
    ||null;
}
// `predictionCardHTML` a été RETIRÉE d'ici (R28, correction du 12/08/2026). Elle vivait dans
// la vue d'ensemble de Plan et n'a plus aucun appelant depuis que la prédiction a son propre
// sous-onglet (`predictionViewHTML`, ci-dessous) — une fonction morte qui gardait encore son
// propre appel à `logProjection` était une invitation à croire que le journal s'écrivait ici.
// `tempsTotalItem`, qu'elle partageait avec `predictionViewHTML`, reste en place.
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
          +'<div style="flex:1;background:var(--zn-track-bg,var(--bg2,#e8e0cf));border:1px solid var(--zn-ink,#16130e);border-radius:4px;height:10px;overflow:hidden"><div style="height:100%;width:'+pc+'%;background:'+(w.ok?"var(--zn-good,#00a376)":"var(--zn-gold-dot,#f0b429)")+'"></div></div>'
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
 * U16 — LE DÉROULEMENT DE LA SÉANCE SE DÉROULE VRAIMENT.
 *
 * Retour du fondateur : « trop dense ». Mesuré en dépliant les séances d'un plan marathon :
 * une VO2max sortait **296 caractères d'un seul tenant**, quatre blocs collés par des points
 * médians, en 11 px gris à interligne 1,35. Le contenu est juste ; c'est sa mise en page qui
 * en fait un pavé. Un entraîneur écrit une séance en LISTE — échauffement, corps, retour au
 * calme —, jamais en paragraphe.
 *
 * On ne fabrique AUCUN texte ici : `renderSess` reste le seul producteur (règle du dépôt), on
 * se contente de couper sur le séparateur de blocs qu'il pose déjà. C'est pour que cette coupe
 * soit exacte que le rendu vallonné cesse d'utiliser le même symbole à l'intérieur d'un bloc.
 * Un seul segment ⇒ pas de liste : une ligne unique n'a pas besoin d'être une puce.
 */
function techListHTML(tech){
  if(!tech)return "";
  const segs=tech.split(" · ").map(x=>x.trim()).filter(Boolean);
  if(segs.length<2)return '<span class="gd-det">'+tech+"</span>";
  return '<ul class="gd-steps">'+segs.map(x=>"<li>"+x+"</li>").join("")+"</ul>";
}
/**
 * Le bloc repliable d'une séance dans une grille. Le POURQUOI passe devant le QUOI : quand
 * l'athlète ouvre une séance, la première chose qu'il lit est la raison d'être de la séance,
 * pas la liste des blocs. C'est l'ordre dans lequel un entraîneur parle.
 */
// Retour utilisateur (08/08/2026) : le temps de natation n'apparaît nulle part dans la grille.
// Cause : AUCUNE discipline n'affichait de durée dans ce résumé — course/vélo la montrent dans
// le texte du bloc une fois déplié (ex. « 4×5min »), la natation ne montre QUE des mètres
// (« 6×100m »), jamais de minutes, parce que ses blocs se construisent en distance (`Bd`), pas
// en durée (`B`). Le moteur calcule pourtant déjà `s.min` pour TOUTE discipline (temps total,
// conversion CSS pour la nage) — simplement jamais affiché. Une seule ligne le rend visible
// pour tout le monde, dans le résumé TOUJOURS visible plutôt qu'au fond d'un bloc déplié.
//
// `.gd-dur`, PAS `.gd-det` — trouvé par le banc E2E (smoke-usage.mjs, U16) en vérifiant ce
// lot : `.gd-det` est déjà le nom du bloc technique À L'INTÉRIEUR de la séance dépliée
// (`techListHTML`). Ma première écriture réutilisait ce nom pour la durée dans le `<summary>` —
// `<summary>` est le premier enfant de `<details class="gd-sess">`, donc un `querySelector(
// ".gd-det, .gd-steps")` tombait sur la durée au lieu du contenu technique, sur TOUTE séance.
const _fmtDur = (min) => !min ? "" : (min >= 60 ? Math.floor(min / 60) + "h" + String(Math.round(min % 60)).padStart(2, "0") : Math.round(min) + "min");
/**
 * LE BADGE DE DISCIPLINE — la SEULE couleur de la ligne de séance.
 *
 * La carte de jour portait jusqu'ici un fond pleine largeur teinté par la CHARGE (dur/facile/
 * récup). Décision du fondateur (12/08/2026, maquette « structure interne réelle ») : le fond
 * redevient sombre et uniforme, et c'est l'icône qui porte la couleur — celle de la DISCIPLINE.
 *
 * L'accent vient de `DISC[*].ac` (icons.js) — point unique, aucune couleur inventée ici. Ce
 * commentaire disait jusqu'au 12/08/2026 « donc du même endroit que l'avatar et les cartes de
 * sport » : ce n'est plus vrai depuis que les trois accents sont alignés sur la maquette
 * (`icons.js` porte le détail et la mesure). L'avatar et les cartes de sport lisent un AUTRE
 * axe — le sport préparé, pas la discipline d'une séance — resté sur les anciennes valeurs.
 *
 * Le badge est `aria-hidden` : la discipline est déjà dans le NOM de la séance juste à côté
 * (« Footing », « Sweet spot vélo »), et faire lire un pictogramme par-dessus n'apprend rien.
 * `trail` et `swimrun` n'ont pas de code propre — le moteur les émet en `rn`/`sw` —, ils
 * héritent donc de l'accent de leur discipline réelle, ce qui est le comportement voulu.
 */
function badgeDisciplineHTML(s) {
  const d = DISC[s.d];
  if (!d) return "";
  // TUILE PLEINE, PAS UNE TEINTE DILUÉE — et c'est une mesure qui l'a décidé, pas un goût.
  // Ma première écriture posait l'accent à 22 % d'opacité (fond) et 45 % (bordure) : mesuré
  // contre la carte, ça donne 1,26 à 1,48:1 pour la tuile et 1,68 à 2,39:1 pour la bordure.
  // WCAG 1.4.11 demande 3:1 pour un élément d'interface qui PORTE de l'information — et c'est
  // exactement le rôle de ce badge : distinguer les disciplines. Aucune dilution n'y arrive sur
  // ce fond (le bleu du vélo plafonne à 3,33:1 même en PLEIN), donc la tuile est pleine, comme
  // sur la maquette. Le pictogramme est multicolore et reste lisible dessus.
  return '<span class="gd-ic" aria-hidden="true" style="background:' + d.ac + '">' + d.ic + "</span>";
}

function sessDetailsHTML(s,style,open){
  const dur=_fmtDur(s.min);
  if(!s.det)return badgeDisciplineHTML(s)+"<b>"+s.name+"</b>"+(dur?' <span class="gd-dur">'+dur+"</span>":"");
  const why=whyOf(s),tech=techOf(s);
  // U16 — repli par défaut confirmé (retour utilisateur, 08/08/2026) pour l'onglet Plan (une
  // semaine qui peut en afficher plusieurs à la fois, densité mesurée et corrigée alors).
  //
  // Retour utilisateur (08/08/2026, 2e passage) : « Afficher d'office le détail des séances »,
  // redemandé spécifiquement dans l'onglet 📅 Semaine — qui n'affiche jamais qu'UNE semaine à
  // la fois (contrairement à Plan, qui peut en déplier N). `open` est donc au choix de
  // l'APPELANT (`weekGridHTML(..., openDetails)`), pas un changement global de la fonction
  // partagée — Plan garde son repli, Semaine l'ouvre.
  // Le chevron (`.gd-sess summary::before`, styles.css) reste en `var(--ink)` gras — plus
  // visible sans reprendre d'espace — quel que soit l'état par défaut.
  return '<details class="gd-sess"'+(open?' open':"")+(style?' style="'+style+'"':"")+'><summary>'+badgeDisciplineHTML(s)+'<b>'+s.name+"</b>"+(dur?' <span class="gd-dur">'+dur+"</span>":"")+"</summary>"
    +(why?'<span class="gd-why">\u{1F4A1} '+why+"</span>":"")
    +techListHTML(tech)+"</details>";
}

/**
 * « Pourquoi ce plan » — résumé en langage d'athlète, EN TÊTE de l'onglet Plan.
 * Les chiffres viennent des `decisions[]` du moteur : aucune phrase n'est inventée ici, chacune
 * cite la décision qui la produit. Le détail complet reste dans la carte du bas.
 *
 * Retour utilisateur (08/08/2026, 2e passage) : la carte pesait encore, dépliée par défaut
 * pendant que « Conseils personnalisés » et « Décisions du moteur » sont repliées — trois blocs
 * empilés dont un seul ouvert n'allège rien. Elle se replie à son tour ; seul le bandeau de
 * préparation tronquée (R22, une condition de sécurité et non une option de confort) reste
 * toujours visible, hors du repli.
 */
// O-96 (constat du fondateur, 20/08/2026 — « la carte se contredit À NOUVEAU sur le nombre de
// séances », 12 contre 9) — UNE DÉCISION QUI PORTE UN PENDANT LIVRÉ S'AFFICHE PARTOUT AVEC LUI.
// O-87 avait posé la dérivation unique côté MOTEUR (le champ `livre`, même `nSess` que « une
// semaine ne contient que N séances ») et corrigé UN des deux rendus : « Pourquoi ce plan »
// disait « 12 prescrites — en livre 9 » pendant que « Les décisions du moteur », trois
// centimètres plus bas, rendait `d.val` BRUT — « 12 » sans étiquette, face à un « ce qui
// borne » qui dit 9. Un correctif appliqué à un rendu sur deux est un correctif qu'on croit
// avoir (R18.1) : la phrase vit désormais ICI, en un point, et les deux rendus l'appellent.
function suffixeLivre(d,bold){
  if(!d||d.livre==null||d.livre===+d.val)return "";
  return " prescrites — ta semaine la plus fournie en livre "+(bold?"<b>"+d.livre+"</b>":d.livre);
}
function whyPlanCardHTML(plan){
  const v2=plan&&plan._v2;
  if(!v2||!v2.decisions||!v2.decisions.length)return "";
  const D={};v2.decisions.forEach(d=>{D[d.id]=d;});
  const li=[];
  // U16 — une ligne par idée, avec de l'air entre elles (voir `.exp-list` dans styles.css).
  const add=(txt,src)=>{if(txt)li.push('<li class="exp-row"><div>'+txt+(src?' <span class="exp-lbl">'+src+'</span>':"")+"</div></li>");};
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
  // O-87 — un compte se publie avec ce qu'il compte : `val` est le budget PRESCRIT (décision du
  // raisonnement), `livre` le maximum réellement LIVRÉ (posé par le générateur après le point
  // fixe, la même dérivation que « une semaine ne contient que N séances » trois blocs plus
  // haut). Quand les deux diffèrent, les deux se disent — sinon la carte porte deux vérités
  // sans étiquette, et c'est sur la grandeur qui BORNE le plan.
  if(D.budget)add("<b>"+D.budget.val+"</b> séances par semaine"+suffixeLivre(D.budget,true)+(D["R10-depart"]?"" : "")+(D.recup?", avec une semaine allégée "+D.recup.val:"")+".","budget");
  if(D["R10-depart"])add("Le départ est calé sur ton volume RÉEL des derniers mois, pas sur ta cible : <b>"+D["R10-depart"].val+"</b>. C'est la marche la plus souvent trop haute.","reprise");
  if(D.impact)add("Pas plus de <b>"+D.impact.val+"</b> jours d'appui : c'est l'impact qui blesse, pas le volume.","impact");
  // R22 — LE BANDEAU DE PRÉPARATION TRONQUÉE, EN TÊTE ET HORS DU REPLIABLE.
  //
  // Il se lit sur `plan.meta`, posé par le pont, et non sur la présence d'un mot dans les
  // avertissements : `meta.truncated` est un booléen que l'UI peut croire, une chaîne
  // cherchée dans une phrase est une devinette qui casse au premier reformulage.
  // Non repliable, comme les réserves moteur de R4 : ce que le plan SUPPOSE n'est pas
  // une option de confort — c'est la condition sous laquelle il tient.
  const m=plan&&plan.meta;
  let h="";
  if(m&&m.truncated)
    h+='<div class="load-card" role="note" style="border-color:#c47f00;background:#fff8e6">'
      +'<div class="load-title">⚠️ Prépa raccourcie à '+m.delivered_weeks+' semaines</div>'
      +'<div class="load-sub">Les '+m.truncated_weeks+' premières semaines de mise en route ont été '
      +'retirées, parce que ta date de course est proche. <b>Cela suppose une base d’entraînement '
      +'déjà acquise.</b> La progression est plus dense dès la première semaine : sois '
      +'attentif aux signaux de fatigue, et n’hésite pas à alléger au moindre doute.</div></div>';
  h+='<details class="load-card"><summary class="load-title" style="cursor:pointer">\u{1F9ED} Pourquoi ce plan</summary><div style="margin-top:8px">'
    +'<ul class="exp-list exp-plain">'+li.join("")+"</ul>";
  if(v2.warnings&&v2.warnings.length)
    h+='<div class="load-sub" style="margin-top:8px">\u26A0 Ce que le moteur n\u2019a pas pu faire sous tes contraintes : '+v2.warnings[0]+(v2.warnings.length>1?' <a href="#motorDecisions" style="color:inherit">et '+(v2.warnings.length-1)+' autre'+(v2.warnings.length>2?"s":"")+"\u2026</a>":"")+"</div>";
  h+='<div class="load-sub" style="margin-top:6px"><a href="#motorDecisions" style="color:inherit">\u2193 Les '+v2.decisions.length+' décisions du moteur, en détail</a></div></div></details>';
  return h;
}

function decisionsCardHTML(plan){
  let h="";
  const v2=plan&&plan._v2;
  if(v2){
    // U3 — LE SCORE D'AUDIT N'EST PLUS MONTRÉ À L'ATHLÈTE.
    //
    // Le titre affichait « score d'audit 70/100 ». Mesuré sur 30 profils (10 formats ×
    // 3 niveaux) : médiane 100, 3 plans sous 80 — et ces trois-là sont **les trois Ironman**,
    // à tous les niveaux, avec **zéro violation dure**. Donc la personne qui prépare l'épreuve
    // la plus dure du catalogue, sur onze mois, était précisément celle à qui l'app annonçait
    // la note la plus basse, pour un plan parfaitement valide.
    //
    // Le chiffre est juste : c'est un score de critères SOUPLES, bas parce qu'un Ironman sature
    // les plafonds. Mais un score sur 100 ne se lit que d'une façon — comme une note — et
    // l'athlète n'a rien à en faire : le plan est soit assez bon pour être suivi, soit il ne
    // l'est pas, et cette question-là est tranchée par les violations DURES, qui sont listées
    // juste en dessous. Le score reste dans `plan._v2.score` pour le développement et les
    // bancs ; il ne s'affiche plus.
    h+='<details class="load-card" id="motorDecisions" style="cursor:pointer"><summary class="load-title">\ud83e\udde0 Les d\u00e9cisions du moteur ('+v2.decisions.length+')</summary><ul class="exp-list">';
    // D1 (audit v6) — les règles non satisfaites sont calculées et attachées au plan :
    // on ne les jette plus à l'affichage. Langage neutre (pas de bandeau rouge — décision
    // R5 du fondateur), mais EN TÊTE de liste, pas cachées.
    if(v2.hardViolations&&v2.hardViolations.length){
      h+='<li class="exp-row" style="color:#a33"><b>Règles non satisfaites malgré réparation ('+v2.hardViolations.length+') :</b><br>'+v2.hardViolations.map(x=>'· '+x).join('<br>')+'<br><span style="color:#555">Le moteur a rendu le meilleur plan possible sous tes contraintes — ces points expliquent le score.</span></li>';
    }
    // U16 — trois niveaux : l'intitulé s'efface, la VALEUR est ce qu'on vient chercher, la
    // justification descend en gris aéré. Aucun mot retiré.
    // O-96 — le pendant LIVRÉ suit la décision ICI AUSSI : ce rendu affichait « 12 » brut
    // pendant que « ce qui borne » disait 9, trois blocs plus haut (voir `suffixeLivre`).
    v2.decisions.forEach(d=>{h+='<li class="exp-row"><div class="exp-lbl">'+d.what+'</div><div class="exp-val">'+d.val+suffixeLivre(d,false)+'</div><div class="exp-why">'+d.why+'</div></li>';});
    if(v2.warnings.length)h+='<li class="exp-row"><div class="exp-lbl">Limites connues de ce plan</div><div class="exp-why">'+v2.warnings.join(" ")+'</div></li>';
    if(v2.repairs&&v2.repairs.length){
      h+='<li class="exp-row"><details style="cursor:pointer"><summary>Réparations tentées par le moteur ('+v2.repairs.length+')</summary><div style="color:#555;margin-top:4px">'+v2.repairs.map(x=>'· '+x).join('<br>')+'</div></details></li>';
    }
    h+='</ul></details>';
  }
  return h;
}
// Météo du jour (manifeste §6) — Open-Meteo, gratuit et sans clé. Dégradation propre :
// pas de géoloc / hors-ligne / lent (>3.5s) → on adapte sans la météo, sans bloquer.

export { _blkMin, downloadPlan, driverBand, chargeChartSVG, weekChargeChartSVG, chargeChartLegend, renderPlan, readinessCardHTML, progressBarCardHTML, predictionViewHTML, journaliserProjection, historyCardHTML, intensityCardHTML, decisionsCardHTML, whyPlanCardHTML, sessDetailsHTML, whyOf, techOf, techListHTML };

// ═══════════════ LE SOUS-ONGLET « PRÉDICTION » (R28) ═══════════════
// Décision du fondateur (12/08/2026) : la prédiction quitte le repliable de la vue d'ensemble
// et devient une vue dédiée, en 4 blocs. Le brief posait une question BLOQUANTE — « le moteur
// calcule-t-il une progression discipline par discipline, ou seulement un total ? Ne pas
// trancher soi-même ». MESURÉ sur un 70.3 : il la calcule, et plus finement que le brief
// n'espérait — `gainPct`/`gainBand` sont PAR RÉFÉRENCE (ftp · thrPace · css · vam),
// `projected.refs` rend les trois valeurs projetées, et `items`/`projected.items` rendent les
// temps SEGMENT PAR SEGMENT. Rien n'est inventé ici : chaque chiffre vient du prédicteur.
//
// LES VALEURS SONT DES FOURCHETTES, JAMAIS UN CHIFFRE NU — c'est la propriété du prédicteur
// (P7/P8 : il refuse d'estimer plutôt que de faire semblant). Les démos animées affichaient un
// nombre unique ; arbitrage du fondateur : le compteur monte jusqu'à la borne BASSE, puis la
// borne haute se pose à côté. L'état final porte donc la fourchette entière.

/** "32'38–34'57" | "2h33–2h41" → {lo, hi} en minutes. `null` si ce n'est pas un temps. */
function _rangeMin(v) {
  const s = String(v || "");
  if (/(W|km\/h|m\/h|%|km-effort)/.test(s)) return null; // puissance/vitesse : pas un chrono
  const un = (t) => {
    const h = /(\d+)\s*h\s*(\d*)/i.exec(t);
    if (h) return +h[1] * 60 + (h[2] ? +h[2] : 0);
    const m = /(\d+)\s*['’]\s*(\d*)/.exec(t);
    if (m) return +m[1] + (m[2] ? +m[2] / 60 : 0);
    return null;
  };
  const p = s.split(/[–—-]/).map((x) => un(x.trim())).filter((x) => x != null);
  if (!p.length) return null;
  return { lo: p[0], hi: p.length > 1 ? p[1] : p[0] };
}
const _fmtMin = (m) => {
  const t = Math.round(m);
  return t < 60 ? t + "'" : Math.floor(t / 60) + "h" + String(t % 60).padStart(2, "0");
};
/** Allure/CSS EN SECONDES → "M'SS" (jamais `_fmtMin`, qui arrondit à la minute ENTIÈRE et
 *  efface les secondes — juste pour une DURÉE de séance, faux pour une ALLURE : 269,8 s/km
 *  rendait "4'/km" ou "5'/km" selon le côté où l'arrondi tombait, jamais "4'30". Sur un
 *  athlète déjà proche de 4'42/km, ce faux zéro de précision a fait lire une RÉGRESSION
 *  (« 4.42 → 5'/km ») là où le moteur calculait une progression de 12 s/km (269,8 < 282).
 *  Même formule que `fmtPace` (engine.js), `fmtSec` (retest.js), `_fmtSec` (tab-profile.js) —
 *  reprise ici plutôt qu'importée : c'est déjà l'idiome de ce dépôt pour cette ligne (R11.1
 *  s'applique au CALCUL, pas à la duplication d'un formateur d'une ligne entre modules UI). */
// arrondir AVANT de séparer (retour du fondateur, 17/08/2026) : le CSS PROJETÉ est un flottant
// (119,6 s) et cette ligne tronquait les minutes PUIS arrondissait les secondes — l'écran de
// projection affichait « 1'60/100m ». Soixante secondes font une minute.
const _fmtPace = (s) => { const t = Math.round(s); return Math.floor(t / 60) + "'" + String(t % 60).padStart(2, "0"); };
/** Range les items du prédicteur par discipline. Les lignes d'INTENSITÉ (watts) sont écartées :
 *  P6 interdit de projeter le pacing, elles ne sont pas des chronos et n'ont rien à faire ici. */
function _parDiscipline(items) {
  const out = { sw: null, bk: null, rn: null };
  (items || []).forEach((x) => {
    const leg = String(x.leg || "");
    if (/intensit/i.test(leg) || /Total/i.test(leg)) return;
    const r = _rangeMin(x.value);
    if (!r) return;
    if (/Natation|Nage/i.test(leg)) out.sw = out.sw || { leg, r };
    else if (/V[ée]lo/i.test(leg)) out.bk = out.bk || { leg, r };
    else if (/CAP|Course|Marathon|Semi|km/i.test(leg)) out.rn = out.rn || { leg, r };
  });
  return out;
}

/**
 * CALCULE ET JOURNALISE LA PROJECTION (A-5) — LE POINT UNIQUE. Appelée à CHAQUE rendu de
 * l'onglet Plan, quel que soit le sous-onglet actif : c'est la garantie qu'A-5 réclame — une
 * entrée par semaine ISO, jamais un trou parce que personne n'a ouvert « 🎯 Prédiction ».
 *
 * CORRIGE UNE RÉGRESSION DE R28 : tant que la prédiction vivait dans la vue d'ensemble, elle se
 * recalculait (et se journalisait) à chaque rendu de Plan. Le jour où elle a déménagé dans son
 * propre sous-onglet, `predictionViewHTML` a emporté le calcul ET le journal avec elle — sans
 * que personne ne décide de restreindre A-5 à « seulement si l'athlète clique sur Prédiction ».
 * Mesuré : `smoke-projlog.mjs` passait de 4/11 à 11/11 une fois cet appel remonté ici. `logProjection`
 * est idempotente par semaine ISO (« une par semaine, la première suffit ») : l'appeler à chaque
 * rendu ne coûte qu'un test de présence, jamais une seconde écriture.
 */
function journaliserProjection(plan) {
  if (!globalThis.EBV2 || !globalThis.EBV2.predict) return null;
  let pr;
  try { pr = globalThis.EBV2.predict(S.sport, S.answers, plan); } catch (e) { return null; }
  if (!pr || (!pr.items.length && !pr.advice.length)) return null;
  logProjection(S.sport, S.answers, pr);
  return pr;
}

/**
 * LA VUE PRÉDICTION — 4 blocs. `pr` est normalement PRÉ-CALCULÉ par `journaliserProjection`
 * (appelée une fois par `renderTabPlanGeneral`, quel que soit le sous-onglet) ; le paramètre
 * reste optionnel pour qu'un appelant isolé (test, autre écran) reste possible sans dupliquer
 * l'appel à `predict()`.
 */
function predictionViewHTML(plan, prPrecalcule) {
  const pr = prPrecalcule !== undefined ? prPrecalcule : journaliserProjection(plan);
  if (!pr) return "";

  // `pjRaw` garde le retour BRUT de `projected`, applicable ou non : c'est lui qui porte le
  // MOTIF d'un refus de projeter (`pjRaw.decisions`, ids P7-refus/P8/P6-sans-chrono). `pj` ne
  // sert qu'aux blocs qui exigent une projection APPLICABLE — les nuller ensemble aurait perdu
  // le motif exactement quand on en a besoin (le cas « pas de projection »).
  const pjRaw = pr.projected;
  const pj = pjRaw && pjRaw.applicable ? pjRaw : null;
  const tNow = tempsTotalItem(pr.items), tProj = pj ? tempsTotalItem(pj.items) : null;
  const rNow = tNow ? _rangeMin(tNow.value) : null, rProj = tProj ? _rangeMin(tProj.value) : null;
  const cible = rProj || rNow;
  // `fmtDay` seul ne rend que JJ/MM — l'ANCIENNE carte ajoutait l'année, et ce n'était pas un
  // détail : sur une préparation longue (le 70.3 à 40 semaines de cette vue), l'horizon peut
  // franchir le 1er janvier, et « 17/05 » devient ambigu sur quelle année. Retrouvé en écrivant
  // la garde de ce lot — ma première version de cette vue avait perdu l'année au passage.
  const dRef = pj && pj.raceDate ? fmtDay(pj.raceDate) + "/" + pj.raceDate.slice(0, 4) : "la fin du plan";
  let h = '<div class="zn-pred">';

  // ── Bloc 1 — hero du temps total ──
  if (cible) {
    h += '<div class="load-card zn-pred-hero"><div class="eyebrow">'
      + (rProj ? "Temps total projeté" : "Temps total estimé") + "</div>"
      + '<div class="zn-pred-num" data-lo="' + cible.lo.toFixed(2) + '" data-hi="' + cible.hi.toFixed(2) + '">'
      + esc(_fmtMin(cible.lo)) + '<span class="zn-pred-hi"> – ' + esc(_fmtMin(cible.hi)) + "</span></div>"
      + '<div class="load-sub">fourchette du modèle — la marge tient au parcours, à la météo et au jour</div></div>';
  }

  // ── Bloc 2 — deux colonnes + delta ──
  if (rNow && rProj) {
    const gagne = Math.round((rNow.lo + rNow.hi) / 2 - (rProj.lo + rProj.hi) / 2);
    h += '<div class="zn-pred-cols">'
      + '<div class="zn-pred-col"><div class="zn-pc-lab">Si la course était aujourd’hui</div>'
      + '<div class="zn-pc-date">forme actuelle, mesurée</div><div class="zn-pc-t">' + esc(tNow.value) + "</div></div>"
      + '<div class="zn-pred-col proj"><div class="zn-pc-lab">Projeté au jour J</div>'
      + '<div class="zn-pc-date">' + esc(dRef) + "</div><div class=\"zn-pc-t\">" + esc(tProj.value) + "</div></div></div>";
    // Le delta se lit sur les MILIEUX des deux fourchettes, et le dit — comparer deux bornes
    // basses donnerait un gain flatteur qu'aucune des deux estimations ne promet.
    if (gagne > 0) h += '<div class="zn-pred-delta">↓ ' + gagne + " min gagnées d’ici la course si le plan tient"
      + ' <span class="zn-pred-fine">(milieu de fourchette à milieu de fourchette)</span></div>';
    else h += '<div class="zn-pred-delta neutre">La projection ne promet pas de gain à cet horizon — confiance ' + esc(pj.confidence) + "</div>";
  } else if (rNow && !rProj) {
    // LE MOTIF D'UN REFUS DE PROJETER VAUT AUTANT QUE LA PROJECTION (P7/P8) : le silence n'est
    // pas une information. `pr.projected.motif` N'EXISTE PAS — vérifié sur le moteur réel : le
    // refus se lit dans `pjRaw.decisions`, un tableau de `{id, what, val, why}`, exactement ce
    // que lisait l'ancienne carte (`predictionCardHTML`, retirée par ce lot). Ma première
    // écriture de cette vue inventait un champ `.motif` qui rendait toujours le même texte
    // générique — jamais la vraie raison du moteur.
    const refus = pjRaw ? (pjRaw.decisions || []).find((x) => /^P7-refus$|^P8$|^P6-sans-chrono$/.test(x.id)) : null;
    h += '<div class="load-sub zn-pred-nomotif">Pas de projection à cet horizon' + (refus ? " : " + esc(refus.why) : "") + "</div>";
  }

  // ── Bloc 3 — détail par discipline ──
  const dn = _parDiscipline(pr.items), dp = pj ? _parDiscipline(pj.items) : { sw: null, bk: null, rn: null };
  const lignes = [["sw", "🏊"], ["bk", "🚴"], ["rn", "🏃"]].filter(([k]) => dn[k]);
  if (lignes.length) {
    h += '<div class="load-card zn-pred-disc"><div class="eyebrow">Par discipline</div>';
    lignes.forEach(([k, ic]) => {
      const a = dn[k], b = dp[k];
      h += '<div class="zn-pd-row"><span class="zn-pd-ic" aria-hidden="true">' + ic + "</span>"
        + '<span class="zn-pd-n">' + esc(a.leg) + "</span>"
        + '<span class="zn-pd-v" data-lo="' + (b ? b.r.lo : a.r.lo).toFixed(2) + '" data-hi="' + (b ? b.r.hi : a.r.hi).toFixed(2) + '"'
        + ' data-from="' + a.r.lo.toFixed(2) + '">' + esc(_fmtMin((b ? b.r : a.r).lo))
        + '<span class="zn-pred-hi"> – ' + esc(_fmtMin((b ? b.r : a.r).hi)) + "</span></span></div>";
    });
    h += "</div>";
  }

  // ── Bloc 4 — repliable « pourquoi cette projection » : les références, dans l'ordre de course ──
  if (pj && pj.refs) {
    const a = S.answers;
    const R = [
      ["CSS natation", a.css, pj.refs.css != null ? _fmtPace(pj.refs.css) + "/100m" : null, "css"],
      ["FTP cible", a.ftp ? a.ftp + " W" : null, pj.refs.ftp != null ? Math.round(pj.refs.ftp) + " W" : null, "ftp"],
      ["Allure seuil", a.pace, pj.refs.thrPace != null ? _fmtPace(pj.refs.thrPace) + "/km" : null, "thrPace"],
    ].filter((x) => x[1] || x[2]);
    if (R.length) {
      h += '<details class="load-card zn-pred-why"><summary>💡 Pourquoi cette projection</summary><div>';
      R.forEach(([lab, av, ap]) => {
        h += '<div class="kv"><span class="kv-k">' + lab + '</span><span class="kv-v">'
          + esc(av || "—") + (ap ? " → <b>" + esc(ap) + "</b>" : "") + "</span></div>";
      });
      h += '<div class="load-sub" style="margin-top:8px">Calculée sur la progression attendue de tes références '
        + "si le volume du plan est tenu — pas une promesse, une trajectoire. Confiance " + esc(pj.confidence) + ".</div>";
      h += "</div></details>";
    }
  }
  return h + "</div>";
}
