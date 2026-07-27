// Module extrait de Coach_Pro_V1.5.html par scripts/splitPwa.py — extraction fidèle,
// ne pas éditer la logique ici sans relancer les audits (npm run audit:v1 / audit:v2).

const S = { sport:null, answers:{}, rules:[], step:0, tier:"free", started:false, prevRuleIds:new Set(), showAllWeeks:false };
// Échappement HTML pour toute valeur saisie réinjectée via innerHTML (anti-XSS, avant tout partage).
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// Persistance : l'état vit en localStorage (clé versionnée) → survit au rafraîchissement.
function ebSave(){try{localStorage.setItem("eb_state_v1",JSON.stringify({sport:S.sport,answers:S.answers,tier:S.tier,step:S.step,started:S.started,onPlan:!!S.onPlan}));}catch(e){}}
function ebLoad(){try{return JSON.parse(localStorage.getItem("eb_state_v1")||"null");}catch(e){return null;}}
function ebClear(){try{localStorage.removeItem("eb_state_v1");}catch(e){}}
const $ = id => document.getElementById(id);

export { $, S, ebClear, ebLoad, ebSave, esc };
