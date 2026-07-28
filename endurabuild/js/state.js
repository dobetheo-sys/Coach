// État global de la PWA. R4-4 (multi-plans) : plusieurs plans sous un même profil.
// S.plans = [{id, label, sport, answers, tier, step, started, onPlan}] + S.activePlanId ;
// S.sport / S.answers / S.tier / S.step / S.started / S.onPlan restent l'ÉTAT DE TRAVAIL
// du plan actif (tout le code existant continue de les lire/écrire tel quel) — ebSave()
// recopie cet état dans l'entrée active avant de persister, ebActivate() fait l'inverse.
// currentPlan : le plan généré UNE fois (refonte onglets) — jamais persisté (recalculé au
// chargement/changement de plan), jamais recalculé au changement d'onglet (ui/tabs.js).
const S = { sport:null, answers:{}, rules:[], step:0, tier:"free", started:false, prevRuleIds:new Set(), showAllWeeks:false, currentPlan:null, onPlan:false, plans:[], activePlanId:null };
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
  return true;
}
// Persistance : clé versionnée eb_state_v2 (tableau de plans). survit au rafraîchissement.
function ebSave(){try{ebSyncActive();localStorage.setItem("eb_state_v2",JSON.stringify({plans:S.plans,activePlanId:S.activePlanId}));}catch(e){}}
// Chargement + MIGRATION automatique de l'ancien format mono-plan eb_state_v1 (on ne fait
// jamais perdre son plan à un utilisateur existant ; l'ancienne clé est laissée en place
// par prudence — elle ne sera plus lue dès que la v2 existe).
function ebLoad(){
  try{
    const v2=JSON.parse(localStorage.getItem("eb_state_v2")||"null");
    if(v2&&Array.isArray(v2.plans)&&v2.plans.length)return v2;
    const v1=JSON.parse(localStorage.getItem("eb_state_v1")||"null");
    if(v1){
      const e=Object.assign(ebNewPlanEntry(""),{sport:v1.sport||null,answers:v1.answers||{},tier:v1.tier||"free",step:v1.step||0,started:!!v1.started,onPlan:!!v1.onPlan});
      return {plans:[e],activePlanId:e.id};
    }
    return null;
  }catch(e){return null;}
}
// « Changer de sport » (reset) : n'efface QUE le plan actif — les autres plans du profil
// sont conservés. L'appelant (steps.js reset()) a déjà remis l'état de travail à zéro ;
// il suffit de persister cet état vidé dans l'entrée active.
function ebClear(){ebSave();}
const $ = id => document.getElementById(id);

export { $, S, ebActivate, ebClear, ebLoad, ebNewPlanEntry, ebSave, esc };
