// Point d'entrée PWA — câblage des modules, moteur V2, reprise d'état, SW.
// Le moteur V2 (engine.js) est le MÊME bundle auto-testé que dans Coach_Pro_V1.5.html,
// généré depuis src/ par `npm run build:app` — extraction fidèle par construction.
import "./engine.js"; // définit globalThis.EBV2 (IIFE, side-effect)
import { S, ebActivate, ebLoad } from "./state.js";
import { renderStep } from "./ui/steps.js";
import { renderPlan } from "./ui/plan-view.js";
import { stravaAuthFromHash } from "./strava.js";

/**
 * Échec de génération — une exception PORTEUSE, pour que l'UI puisse le DIRE.
 * (spec R10 § R10.0.2 : un plan faux est plus dangereux que pas de plan.)
 */
export class EBGenerationError extends Error {
  constructor(code, cause) {
    super("Génération impossible : " + code);
    this.name = "EBGenerationError";
    this.code = code;
    this.cause = cause;
  }
}

// ===== MOTEUR V2 — le SEUL générateur (R10 phase 0) =====
// Le générateur « legacy » a été supprimé. Il ne protégeait que d'une défaillance du moteur
// V2, or les deux vivaient dans le même fichier : si la page se charge, le moteur est là. Le
// seul déclenchement réel était « le moteur lève une exception » — cas où le repli, plus
// ancien et non maintenu, produisait un plan de qualité inférieure SANS que l'athlète le
// sache. Preuve : le trail est arrivé en R7 sans que le repli soit mis à jour (`caps.trail`
// valait `undefined` → TypeError). Un filet troué ne protège personne : on préfère
// désormais un échec VISIBLE.
export function buildPlan(a) {
  if (!globalThis.EBV2 || typeof globalThis.EBV2.buildPlan !== "function") {
    throw new EBGenerationError("MOTEUR_ABSENT");
  }
  try {
    return globalThis.EBV2.buildPlan(S.sport, a);
  } catch (e) {
    throw new EBGenerationError("MOTEUR_EN_ECHEC", e);
  }
}

// ===== PWA : service worker (offline + installable). Échec silencieux hors HTTPS/localhost.
if ("serviceWorker" in navigator) {
  addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); });
}

// ===== Reprise : restauration multi-plans (R4-4) — migration v1→v2 dans ebLoad() =====
(function(){
  const saved=ebLoad();
  if(saved&&Array.isArray(saved.plans)&&saved.plans.length){
    try{
      S.plans=saved.plans;
      S.shared=saved.shared||{};
      const id=saved.activePlanId&&saved.plans.some(p=>p.id===saved.activePlanId)?saved.activePlanId:saved.plans[0].id;
      ebActivate(id);
      stravaAuthFromHash(); // retour OAuth Strava (#strava_auth=…) — APRÈS la restauration d'état
      if(S.sport)document.body.dataset.sport=S.sport;
      if(S.answers.intent)document.body.dataset.intent=S.answers.intent;
      if(S.started&&S.sport&&S.onPlan){renderPlan();return;}
    }catch(e){}
  }
  stravaAuthFromHash(); // même retour OAuth quand aucun plan n'est encore enregistré
  renderStep();
})();
