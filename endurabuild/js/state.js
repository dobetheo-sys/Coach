// État global de la PWA. R4-4 (multi-plans) : plusieurs plans sous un même profil.
// S.plans = [{id, label, sport, answers, tier, step, started, onPlan}] + S.activePlanId ;
// S.sport / S.answers / S.tier / S.step / S.started / S.onPlan restent l'ÉTAT DE TRAVAIL
// du plan actif (tout le code existant continue de les lire/écrire tel quel) — ebSave()
// recopie cet état dans l'entrée active avant de persister, ebActivate() fait l'inverse.
// currentPlan : le plan généré UNE fois (refonte onglets) — jamais persisté (recalculé au
// chargement/changement de plan), jamais recalculé au changement d'onglet (ui/tabs.js).
const S = { sport:null, answers:{}, rules:[], step:0, tier:"free", started:false, prevRuleIds:new Set(), showAllWeeks:false, currentPlan:null, onPlan:false, plans:[], activePlanId:null, shared:{}, toolsSubTab:null };
// État PAR PERSONNE (pas par plan) : le sommeil, la VFC, la douleur, la maladie, le poids
// et les réglages de notification appartiennent au corps/à l'appareil — ils suivent
// l'utilisateur d'un plan à l'autre (fini le re-check-in après un changement de plan).
// Mécanique : recopiés answers → shared à chaque ebSave, shared → answers à ebActivate.
// R26 — "educatifs" (progression Éducatifs par discipline) rejoint ce groupe : savoir nager,
// connaître sa cadence, décrire l'ATHLÈTE, pas un plan d'entraînement particulier. Ça diffère
// du précédent XP/badges/streak (resté per-plan, `answers.done`) — mais ce précédent n'a
// jamais eu de raison documentée, juste un effet de bord de `ebActivate()` qui échange
// `S.answers` en bloc ; ça n'en fait pas la référence à suivre ici.
const SHARED_KEYS=["readiness","painFlag","sickDates","weight","height","notifyTime","notifyDismissed","lastDailyNotif","lastWeeklyNotif","relanceSent","stravaRelay","stravaAuth","hrRestLog","educatifs"];
function liftShared(){for(const k of SHARED_KEYS)if(S.answers[k]!==undefined)S.shared[k]=S.answers[k];}
function overlayShared(){for(const k of SHARED_KEYS)if(S.shared[k]!==undefined)S.answers[k]=S.shared[k];}
// Échappement HTML pour toute valeur saisie réinjectée via innerHTML (anti-XSS, avant tout partage).
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function ebNewPlanEntry(label){
  return {id:"p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6), label:label||"", sport:null, answers:{}, tier:"free", step:0, started:false, onPlan:false};
}
// Recopie l'état de travail dans l'entrée active (créée paresseusement au premier save).
function ebSyncActive(){
  let e=S.plans.find(p=>p.id===S.activePlanId);
  if(!e){e=ebNewPlanEntry("");S.plans.push(e);S.activePlanId=e.id;}
  e.sport=S.sport;e.answers=S.answers;e.tier=S.tier;e.step=S.step;e.started=S.started;e.onPlan=!!S.onPlan;
  return e;
}
// Charge une entrée dans l'état de travail. Le plan généré est invalidé : il sera
// reconstruit UNE fois au prochain ensurePlan() — chaque plan garde ses réponses,
// son journal (answers.tests), ses ✓ (answers.done), ses records.
function ebActivate(id){
  const e=S.plans.find(p=>p.id===id);if(!e)return false;
  S.activePlanId=id;S.sport=e.sport;S.answers=e.answers||{};S.tier=e.tier||"free";
  S.step=e.step||0;S.started=!!e.started;S.onPlan=!!e.onPlan;S.currentPlan=null;S.showAllWeeks=false;
  overlayShared(); // l'état corporel (forme du jour, douleur…) suit la personne, pas le plan
  return true;
}
// Persistance : clé versionnée eb_state_v2 (tableau de plans). survit au rafraîchissement.
/** D2 — l'écriture peut ÉCHOUER (quota, Safari en navigation privée) et l'échec était muet :
 *  l'athlète cochait ses séances, voyait le ✓, et rien n'était persisté. On le DIT une fois. */
let ebSaveKO=false;
function ebSave(){
  try{
    ebSyncActive();liftShared();
    localStorage.setItem("eb_state_v2",JSON.stringify({plans:S.plans,activePlanId:S.activePlanId,shared:S.shared}));
    ebSaveKO=false;
  }catch(e){
    if(!ebSaveKO){
      ebSaveKO=true;
      try{console.warn("EB: sauvegarde impossible —",e&&e.name);}catch(_){}
      // Pas de modale : on ne bloque pas quelqu'un au milieu d'une séance. Un bandeau discret
      // que l'UI peut lire (`S.saveFailed`) suffit à ce que l'information existe quelque part.
      S.saveFailed=true;
    }
  }
}
// Chargement + MIGRATION automatique de l'ancien format mono-plan eb_state_v1 (on ne fait
// jamais perdre son plan à un utilisateur existant ; l'ancienne clé est laissée en place
// par prudence — elle ne sera plus lue dès que la v2 existe).
/** R7 TRAIL — migration des plans « sport=run, format=trail » : le trail est devenu un
 *  SPORT (§8.2). On ne casse jamais un plan existant : le sport bascule, la distance et le
 *  D+ sont pré-remplis à partir d'un ordre de grandeur, et un avertissement demande à
 *  l'athlète de renseigner les deux vraies valeurs — ce sont elles qui structurent tout. */
function migrateTrailPlans(state){
  if(!state||!Array.isArray(state.plans))return state;
  for(const p of state.plans){
    if(p.sport!=="run"||!p.answers||p.answers.format!=="trail")continue;
    p.sport="trail";
    p.answers.format="";
    if(!p.answers.race_distance_km)p.answers.race_distance_km="45";
    if(!p.answers.race_dplus_m)p.answers.race_dplus_m="2000";
    if(!p.answers.race_technicity)p.answers.race_technicity="mixte";
    if(!p.answers.race_night)p.answers.race_night="non";
    if(!p.answers.train_dplus_access)p.answers.train_dplus_access="collines";
    if(!p.answers.treadmill)p.answers.treadmill="non";
    if(!p.answers.poles)p.answers.poles="a_decider";
    if(!p.answers.vam_known)p.answers.vam_known="non";
    p.answers.trailMigrated=1; // l'UI affiche « vérifie ta distance et ton D+ »
  }
  return state;
}

/**
 * R11.5 — PURGE DES DATES DE COURSE PASSÉES à la reprise d'état. Une date restée en
 * `localStorage` après la course faisait générer un plan d'UNE semaine, sans un mot : l'app
 * calculait la préparation d'une échéance déjà vécue. La date part dans `race_done` (l'onglet
 * Aujourd'hui s'en sert pour proposer la saisie du chrono réel) et le plan repart proprement.
 * Fenêtre de grâce de 3 jours : le lendemain d'une course, on est encore dans la course.
 */
function purgePastRace(state){
  const t=todayISO();
  const grace=new Date(new Date(t+"T00:00:00Z").getTime()-3*864e5).toISOString().slice(0,10);
  for(const p of (state&&state.plans)||[]){
    const a=p.answers||{};
    if(a.race_date&&/^\d{4}-\d{2}-\d{2}$/.test(a.race_date)&&a.race_date<grace){
      a.race_done=a.race_date;
      delete a.race_date;
    }
  }
  return state;
}

function ebLoad(){
  try{
    const v2=JSON.parse(localStorage.getItem("eb_state_v2")||"null");
    if(v2&&Array.isArray(v2.plans)&&v2.plans.length)return purgePastRace(migrateTrailPlans(v2));
    const v1=JSON.parse(localStorage.getItem("eb_state_v1")||"null");
    if(v1){
      const e=Object.assign(ebNewPlanEntry(""),{sport:v1.sport||null,answers:v1.answers||{},tier:v1.tier||"free",step:v1.step||0,started:!!v1.started,onPlan:!!v1.onPlan});
      return purgePastRace(migrateTrailPlans({plans:[e],activePlanId:e.id,shared:{}}));
    }
    return null;
  }catch(e){
    // D1 — UN ÉTAT ILLISIBLE NE S'EFFACE PAS EN SILENCE.
    //
    // Avant : `catch → return null`, l'app repartait du questionnaire d'accueil sans un mot, et
    // le PREMIER `ebSave` réécrivait par-dessus les octets d'origine. Testé en vrai : après un
    // rechargement, la copie corrompue avait disparu — un support à qui on dit « j'ai tout
    // perdu » n'a plus rien à réparer.
    //
    // Le chemin est atteignable : l'app expose une RESTAURATION JSON au Profil, donc un fichier
    // édité à la main est une entrée officiellement supportée — et c'est exactement d'où vient
    // du JSON malformé. On met la copie de côté sous une clé datée et on le signale ; elle ne
    // sert peut-être jamais, mais elle coûte quelques kilo-octets et elle est la seule chose qui
    // reste quand tout le reste a disparu.
    try{
      const brut=localStorage.getItem("eb_state_v2");
      if(brut) localStorage.setItem("eb_state_v2_corrompu_"+todayISO(),brut);
    }catch(_){}
    return null;
  }
}
// « Changer de sport » (reset) : n'efface QUE le plan actif — les autres plans du profil
// sont conservés. L'appelant (steps.js reset()) a déjà remis l'état de travail à zéro ;
// il suffit de persister cet état vidé dans l'entrée active.
function ebClear(){ebSave();}
const $ = id => document.getElementById(id);

// R7 — « aujourd'hui » en heure LOCALE. toISOString() donne la date UTC : entre 22h et
// minuit (heure d'été française), l'app vivait encore LA VEILLE — « encore un problème
// de jour réel et de jour du plan » (retour utilisateur). Toute comparaison avec les
// dates du plan (chaînes YYYY-MM-DD) passe par ce helper, jamais par toISOString.
function todayISO(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
/**
 * R23.2 — LA JOURNÉE D'ENTRAÎNEMENT NE COMMENCE PAS À MINUIT.
 *
 * Retour du fondateur (06/08/2026) : *« Blocage de l'onglet avec les questions "sommeil… etc"
 * alors que j'ai ouvert l'application hier à minuit donc avant même de dormir »*. Le portillon du
 * check-in compare `readiness.date` à la date CALENDAIRE : à 00 h 10, elle a changé, donc l'app
 * redemande « comment as-tu dormi ? » à quelqu'un qui n'est pas encore allé se coucher — et lui
 * cache sa séance tant qu'il n'a pas répondu.
 *
 * C'est le MIROIR exact du défaut que R7 a corrigé (« fini l'app qui vit hier entre 22 h et
 * minuit ») : là on lisait la date en UTC, ici on la lit à la bonne heure mais on coupe la
 * journée au mauvais endroit. Une journée d'entraînement se termine quand on dort, pas quand
 * l'horloge repasse à zéro.
 *
 * Frontière à 4 h du matin, locale. Ce n'est pas un réglage arbitraire : c'est l'heure après
 * laquelle un réveil est un vrai réveil (les départs de course les plus matinaux — Ironman,
 * ultra — sont à 5-6 h, et on se lève une à deux heures avant). Avant 4 h, on est encore la
 * veille : c'est ce que dit le corps, et c'est ce que dit le bon sens de quelqu'un qui consulte
 * son plan avant d'aller dormir.
 *
 * Portée VOLONTAIREMENT étroite : cette frontière ne sert QU'AU check-in du matin (le portillon
 * et l'horodatage de la réponse, un seul et même repère — R11.1). Elle ne touche NI le jour du
 * plan, NI la séance affichée, NI les séries : décaler ces notions-là changerait quelle séance
 * est « celle du jour », ce que personne n'a demandé et qui casserait des gardes existantes.
 */
const JOUR_ENTRAINEMENT_DEBUT_H = 4;
function jourEntrainementISO(){
  const d=new Date();
  if(d.getHours()<JOUR_ENTRAINEMENT_DEBUT_H)d.setDate(d.getDate()-1);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
/** Date courte pour l'affichage calendrier des jours du plan : "29/07". */
function fmtDay(iso){return iso?iso.slice(8,10)+"/"+iso.slice(5,7):"";}
export { $, S, ebActivate, ebClear, ebLoad, ebNewPlanEntry, ebSave, esc, fmtDay, todayISO, jourEntrainementISO, JOUR_ENTRAINEMENT_DEBUT_H };
