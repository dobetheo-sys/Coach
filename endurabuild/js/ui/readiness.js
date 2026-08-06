// Module extrait de Coach_Pro_V1.5.html par scripts/splitPwa.py — extraction fidèle,
// ne pas éditer la logique ici sans relancer les audits (npm run audit:v1 / audit:v2).
import { $, S, ebSave, todayISO, jourEntrainementISO } from "../state.js";

// U7 — LA MÉTÉO SE CHERCHE PENDANT QUE L'ATHLÈTE RÉPOND, PAS APRÈS.
//
// Mesuré : après la dernière question du check-in, l'écran « ta séance arrive… » restait
// **3,26 s** avant d'afficher la séance. Ce n'était pas une temporisation cosmétique — c'est
// `fetchWeather` qui bloquait, sur le `timeout: 3000` de la géolocalisation, parce que la
// séance était calculée APRÈS la météo (`await fetchWeather()` dans `applyReadinessSnap`).
// Chaque matin, pour une donnée d'appoint.
//
// On ne retire pas la météo (manifeste §6 : la canicule durcit le verdict, la pluie donne des
// consignes) et on ne réduit pas le timeout — un vrai téléphone met parfois deux secondes à se
// localiser. On la lance simplement AU MOMENT OÙ LE DIAPORAMA S'OUVRE : l'athlète répond à
// trois questions pendant ce temps, et la réponse est là quand il en a besoin. Zéro seconde
// ajoutée, zéro comportement changé — juste l'attente déplacée là où elle ne se voit pas.
//
// Le cache est valable pour la journée : le check-in est rejouable (« ↻ Refaire mon point »)
// et il serait absurde de re-localiser trois fois de suite. `maximumAge` faisait déjà ce
// travail côté navigateur ; ici on couvre aussi l'appel HTTP.
let _wxCache = null; // { date, promise }
function requestWeather(){return new Promise(res=>{
  if(!navigator.geolocation)return res(null);
  const to=setTimeout(()=>res(null),3500);
  navigator.geolocation.getCurrentPosition(pos=>{
    fetch("https://api.open-meteo.com/v1/forecast?latitude="+pos.coords.latitude+"&longitude="+pos.coords.longitude+"&daily=temperature_2m_max,precipitation_sum&forecast_days=1&timezone=auto")
      .then(r=>r.json()).then(j=>{clearTimeout(to);res({tmaxC:j.daily.temperature_2m_max[0],precipMm:j.daily.precipitation_sum[0]});})
      .catch(()=>{clearTimeout(to);res(null);});
  },()=>{clearTimeout(to);res(null);},{timeout:3000,maximumAge:600000});
});}
/** Démarre la recherche météo sans l'attendre. Appelé à l'ouverture du check-in. */
export function primeWeather(){
  const d=todayISO();
  if(!_wxCache||_wxCache.date!==d)_wxCache={date:d,promise:requestWeather()};
  return _wxCache.promise;
}
function fetchWeather(){return primeWeather();}
/** Verdict lisible + séances du jour, en HTML — factorisé pour le rendu direct ET le
 *  ré-affichage (retour à l'onglet Semaine sans re-décrocher la météo). */
function verdictHTML(res,weather){
  const v=res.adjustment.verdict,ic={verte:"🟢",orange:"🟠",rouge:"🔴"};
  const lbl={keep:"séance maintenue",reduce:"volume réduit, structure conservée",replace:"qualité remplacée par de l’endurance",rest:"repos aujourd’hui",off:"repos complet (affûtage)"};
  let h='<div class="why" style="margin:0">'+(weather?'🌤 '+Math.round(weather.tmaxC)+'°C prévus'+(weather.precipMm>=5?' · pluie':'')+'<br>':'')+ic[v.level]+' <b>Readiness '+v.level+'</b> — '+lbl[res.adjustment.action]+'<br><span style="color:#555;font-size:var(--fs-sm)">'+v.drivers.join(" · ")+'</span></div>';
  if(res.sessions.length)res.sessions.forEach(x=>{h+='<div style="font-size:var(--fs-sm);margin-top:6px"><b>'+(res.jour||"Aujourd’hui")+' · '+x.name+'</b><br>'+x.det+'</div>';});
  else h+='<div style="font-size:var(--fs-sm);margin-top:6px">Aucune séance planifiée aujourd’hui.</div>';
  return h;
}
/** Applique la forme du jour : lit les 4 sélecteurs (sommeil/VFC/énergie/ressenti), calcule
 *  le verdict, sauvegarde (daté — pas de nouvelle question tant que le jour ne change pas),
 *  écrit #rdResult si présent. Retourne {snap,res} pour que l'appelant (onglet Semaine)
 *  puisse ré-agencer l'écran (fin du check-in → séance du jour affichée). */
/** Cœur commun : applique une forme du jour DÉJÀ collectée (diaporama d'accueil OU carte
 *  « Modifier ma forme du jour ») — météo, verdict, sauvegarde datée, journal des verdicts. */
async function applyReadinessSnap(base){
  if(!globalThis.EBV2)return null;
  const snap={date:todayISO(),
    sleepQuality:base.sleepQuality||"moyen",
    energy:parseInt(base.energy)||55,feel:base.feel||"normal"};
  // H-1b — PLUS DE `hrvStatus` PAR DÉFAUT. Il valait « normale » quand personne n'avait rien
  // déclaré : un adjectif inventé, écrit dans l'état et relu ensuite comme une réponse. Il
  // était inerte (H-1 ne fait peser que la VFC MESURÉE), mais un défaut latent — la première
  // règle qui lirait `hrvStatus` sans regarder `hrvSource` verrait une déclaration fantôme.
  // Le champ n'existe désormais que si quelqu'un l'a réellement dit.
  if(base.hrvStatus)snap.hrvStatus=base.hrvStatus;
  // A5/A6 (audit v6) — signaux MESURÉS enfin transmis au moteur (ils étaient supportés
  // depuis Sprint 2 et jamais collectés) : heures de sommeil, FC au réveil, et baseline
  // glissante 7 jours calculée depuis l'historique (dès 3 mesures, sinon seuil absolu).
  if(base.sleepHours!=null&&isFinite(base.sleepHours))snap.sleepHours=+base.sleepHours;
  const hr=parseInt(base.restingHr);
  if(hr>=30&&hr<=120){
    snap.restingHr=hr;
    if(!Array.isArray(S.answers.hrRestLog))S.answers.hrRestLog=[];
    S.answers.hrRestLog=S.answers.hrRestLog.filter(x=>x.date!==snap.date);
    const prev=S.answers.hrRestLog.slice(-7);
    if(prev.length>=3)snap.restingHrBaseline=Math.round(prev.reduce((t,x)=>t+x.v,0)/prev.length);
    S.answers.hrRestLog.push({date:snap.date,v:hr});
    S.answers.hrRestLog=S.answers.hrRestLog.slice(-30);
  }
  // H-1 — LE JOURNAL DE VFC. Même mécanique que `hrRestLog`, et pour la même raison : sans
  // historique, « basse » n'est qu'un avis. Le CLASSEMENT n'est pas fait ici — le pont le
  // fait avec `hrvBaseline` (fenêtres, écart-type, seuil). L'UI collecte et conserve, le
  // modèle décide : recopier les constantes ici en ferait une seconde définition (R11.1).
  const hrv=parseInt(base.hrvValue);
  if(hrv>=5&&hrv<=250){
    snap.hrvValue=hrv;
    if(!Array.isArray(S.answers.hrvLog))S.answers.hrvLog=[];
    S.answers.hrvLog=S.answers.hrvLog.filter(x=>x.date!==snap.date);
    S.answers.hrvLog.push({date:snap.date,v:hrv});
    S.answers.hrvLog=S.answers.hrvLog.slice(-60);
  }
  const wx=await fetchWeather();if(wx&&wx.tmaxC!=null)snap.weather=wx;
  // R23.2 — L'HORODATAGE DU CHECK-IN SUIT LA JOURNÉE D'ENTRAÎNEMENT, pas le calendrier : c'est
  // le MÊME repère que le portillon qui le relit (`readinessDoneToday`), et deux repères pour la
  // même question divergeraient (R11.1). `snap.date`, lui, reste la date CALENDAIRE — l'ajusteur
  // s'en sert pour choisir la séance du jour, et la décaler ferait adapter la séance d'hier.
  S.answers.readiness={date:jourEntrainementISO(),sleepQuality:snap.sleepQuality,hrvStatus:snap.hrvStatus,hrvValue:snap.hrvValue,energy:snap.energy,feel:snap.feel,sleepHours:snap.sleepHours,restingHr:snap.restingHr};ebSave();
  let res;try{res=globalThis.EBV2.adjustToday(S.sport,S.answers,snap);}catch(e){console.warn(e);return null;}
  // Historique des verdicts : chaque adaptation quotidienne est archivée (une entrée par
  // jour, la dernière gagne) — montre combien de fois le plan s'est réellement adapté.
  if(!Array.isArray(S.answers.readinessLog))S.answers.readinessLog=[];
  S.answers.readinessLog=S.answers.readinessLog.filter(x=>x.date!==snap.date);
  S.answers.readinessLog.push({date:snap.date,level:res.adjustment.verdict.level,action:res.adjustment.action});
  S.answers.readinessLog=S.answers.readinessLog.slice(-90);ebSave();
  return {snap,res};
}
async function applyReadiness(){
  if(!globalThis.EBV2)return null;
  // Retour immédiat : la géoloc peut prendre jusqu'à ~3.5s (timeout) avant le verdict —
  // sans ce message, le bouton semble muet/cassé pendant tout ce temps (retour panel de test).
  const btn=$("rdApply");if(btn)btn.disabled=true;
  if($("rdResult"))$("rdResult").innerHTML='<div class="load-sub">Analyse en cours…</div>';
  const out=await applyReadinessSnap({
    sleepQuality:$("rdSleep").value,
    // H-1b — plus de VFC DÉCLARÉE ici non plus. Elle vivait à DEUX endroits (le diaporama et
    // ce panneau) : n'en corriger qu'un, c'est le correctif qu'on croit avoir (R18.1). Depuis
    // H-1, seule une valeur comparée à la base de l'athlète est une mesure ; un adjectif coché
    // ne l'est pas, et il n'apporte rien que `feel` et `energy` ne portent déjà.
    energy:parseInt($("rdEnergy").value),feel:$("rdFeel").value});
  if(btn)btn.disabled=false;
  if(!out)return null;
  if($("rdResult"))$("rdResult").innerHTML=verdictHTML(out.res,out.snap.weather);
  return out;
}
/** true si la forme du jour a déjà été renseignée AUJOURD'HUI (pas de nouvelle
 *  question tant que le jour ne change pas — ergonomique, jamais insistant). */
function readinessDoneToday(){
  const r=S.answers.readiness;
  // R23.2 — la JOURNÉE D'ENTRAÎNEMENT, pas la date calendaire : à 00 h 10 on n'a pas encore
  // dormi, la question « comment as-tu dormi ? » n'a pas d'objet et la séance ne doit pas être
  // cachée derrière elle.
  return !!(r&&r.date===jourEntrainementISO());
}

export { applyReadiness, applyReadinessSnap, fetchWeather, readinessDoneToday, verdictHTML };
