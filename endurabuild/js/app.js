// Point d'entrée PWA — câblage des modules, moteur V2, repli legacy, reprise d'état, SW.
// Le moteur V2 (engine.js) est le MÊME bundle auto-testé que dans Coach_Pro_V1.5.html,
// généré depuis src/ par `npm run build:app` — extraction fidèle par construction.
import "./engine.js"; // définit globalThis.EBV2 (IIFE, side-effect)
import { S, ebLoad } from "./state.js";
import { buildPlanLegacy } from "./legacy-fallback.js";
import { renderStep } from "./ui/steps.js";
import { renderPlan } from "./ui/plan-view.js";

// ===== MOTEUR V2 — génération via EBV2, générateur legacy en REPLI (comportement identique
// ===== au monolithe : si le bundle manque ou échoue, le plan sort quand même).
export function buildPlan(a) {
  if (globalThis.EBV2 && typeof globalThis.EBV2.buildPlan === "function") {
    try { return globalThis.EBV2.buildPlan(S.sport, a); }
    catch (e) { console.warn("Moteur V2 indisponible - generateur legacy utilise", e); }
  }
  return buildPlanLegacy(a);
}

// ===== PWA : service worker (offline + installable). Échec silencieux hors HTTPS/localhost.
if ("serviceWorker" in navigator) {
  addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); });
}

// ===== Reprise : si un état est sauvegardé, on le restaure (verbatim du monolithe) =====
(function(){
  const saved=ebLoad();
  if(saved&&saved.started&&saved.sport){
    try{
      S.sport=saved.sport;S.answers=saved.answers||{};S.tier=saved.tier||"free";S.step=saved.step||0;S.started=true;
      if(saved.sport)document.body.dataset.sport=saved.sport;
      if(S.answers.intent)document.body.dataset.intent=S.answers.intent;
      if(saved.onPlan){renderPlan();return;}
    }catch(e){}
  }
  renderStep();
})();
