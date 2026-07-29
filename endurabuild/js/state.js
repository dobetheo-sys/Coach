// État global de la PWA. R4-4 (multi-plans) : plusieurs plans sous un même profil.
// S.plans = [{id, label, sport, answers, tier, step, started, onPlan}] + S.activePlanId ;
// S.sport / S.answers / S.tier / S.step / S.started / S.onPlan restent l'ÉTAT DE TRAVAIL
// du plan actif (tout le code existant continue de les lire/écrire tel quel) — ebSave()
// recopie cet état dans l'entrée active avant de persister, ebActivate() fait l'inverse.
// currentPlan : le plan généré UNE fois (refonte onglets) — jamais persisté (recalculé au
// chargement/changement de plan), jamais recalculé au changement d'onglet (ui/tabs.js).
const S = { sport:null, answers:{}, rules:[], step:0, tier:"free", started:false, prevRuleIds:new Set(), showAllWeeks:false, currentPlan:null, onPlan:false, plans:[], activePlanId:null, shared:{} };
// État PAR PERSONNE (pas par plan) : le sommeil, la VFC, la douleur, la maladie, le poids
// et les réglages de notification appartiennent au corps/à l'appareil — ils suivent
// l'utilisateur d'un plan à l'autre (fini le re-check-in après un changement de plan).
// Mécanique : recopiés answers → shared à chaque ebSave, shared → answers à ebActivate.
const SHARED_KEYS=["readiness","painFlag","sickDates","weight","height","notifyTime","notifyDismissed","lastDailyNotif","lastWeeklyNotif","relanceSent","stravaRelay","stravaAuth","hrRestLog"];
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
function ebSave(){try{ebSyncActive();liftShared();localStorage.setItem("eb_state_v2",JSON.stringify({plans:S.plans,activePlanId:S.activePlanId,shared:S.shared}));}catch(e){}}
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

function ebLoad(){
  try{
    const v2=JSON.parse(localStorage.getItem("eb_state_v2")||"null");
    if(v2&&Array.isArray(v2.plans)&&v2.plans.length)return migrateTrailPlans(v2);
    const v1=JSON.parse(localStorage.getItem("eb_state_v1")||"null");
    if(v1){
      const e=Object.assign(ebNewPlanEntry(""),{sport:v1.sport||null,answers:v1.answers||{},tier:v1.tier||"free",step:v1.step||0,started:!!v1.started,onPlan:!!v1.onPlan});
      return migrateTrailPlans({plans:[e],activePlanId:e.id,shared:{}});
    }
    return null;
  }catch(e){return null;}
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
/** Date courte pour l'affichage calendrier des jours du plan : "29/07". */
function fmtDay(iso){return iso?iso.slice(8,10)+"/"+iso.slice(5,7):"";}
export { $, S, ebActivate, ebClear, ebLoad, ebNewPlanEntry, ebSave, esc, fmtDay, todayISO };
