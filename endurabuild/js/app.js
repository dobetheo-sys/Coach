// Point d'entrée PWA — câblage des modules, moteur V2, reprise d'état, SW.
// Le moteur V2 (engine.js) est le MÊME bundle auto-testé que dans Coach_Pro_V1.5.html,
// généré depuis src/ par `npm run build:app` — extraction fidèle par construction.
import "./engine.js"; // définit globalThis.EBV2 (IIFE, side-effect)
import { S, ebActivate, ebLoad } from "./state.js";
import { renderStep } from "./ui/steps.js";
import { renderPlan } from "./ui/plan-view.js";
import { stravaAuthFromHash } from "./strava.js";

// R-ZENNA — la feuille de reskin de l'onglet Aujourd'hui (css/zenna-today.css) s'injecte ICI,
// en script, plutôt que comme un <link> statique dans <head> : un <link> de plus dans <head>
// est BLOQUANT pour le premier rendu, mesuré (smoke-usage.mjs, U7) à lui seul pour une part du
// coût. Ça ne suffit PAS à ramener la marge à ce qu'elle était : le reste vient du RECALCUL DE
// STYLE de la feuille elle-même une fois appliquée (dette déclarée dans CLAUDE.md, « État
// courant » — à traiter avant d'étendre ce reskin aux autres onglets). Le script-injection
// reste la bonne pratique dans tous les cas : zéro raison de bloquer le parsing initial pour
// une feuille scopée à un seul onglet.
//
// PAS dans le fichier autonome (`EB_STANDALONE`) : il n'y a pas de serveur pour aller chercher
// "css/zenna-today.css" — un lien mort échouerait en silence (et contredirait la promesse
// « zéro requête réseau » du build). `buildStandalone.mjs` inline déjà cette feuille dans le
// <style> de tête, au même titre que styles.css/mobile.css.
// R-ZENNA v6 — le thème est posé DÈS LE DÉPART, questionnaire compris (décision du fondateur,
// 11/08/2026). Il l'était seulement dans la vue à onglets ; le questionnaire restait le dernier
// écran en thème « papier », et c'est le PREMIER que voit quelqu'un qui découvre le produit.
document.body.classList.add("theme-zenna");
if (!globalThis.EB_STANDALONE) {
  for (const f of ["css/zenna-today.css", "css/zenna-tabs.css"]) {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = f;
    document.head.appendChild(l);
  }
}

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
    // R11 — une entrée invalide n'est PAS une panne du moteur : c'est une réponse que
    // l'athlète peut corriger lui-même. La confondre avec « MOTEUR_EN_ECHEC » lui montrait un
    // échec sans cause exploitable alors que la cause était parfaitement identifiable.
    if (e && e.code === "ENTREE_INVALIDE") throw new EBGenerationError("ENTREE_INVALIDE", e);
    throw new EBGenerationError("MOTEUR_EN_ECHEC", e);
  }
}

// ===== PWA : service worker (offline + installable). Échec silencieux hors HTTPS/localhost.
// R11 §8 — le service worker sert la PWA SERVIE (cache hors ligne, installation). Dans le
// fichier autonome il n'a rien à mettre en cache et son enregistrement échoue de toute façon :
// on ne le tente pas, et on dit pourquoi plutôt que d'avaler l'échec. Un `catch(() => {})` qui
// masque une cause légitime rend le prochain diagnostic plus difficile, pour zéro bénéfice.
if (globalThis.EB_STANDALONE) {
  console.info("EnduraBuild : fichier autonome — pas de service worker (tout est déjà embarqué).");
} else if ("serviceWorker" in navigator) {
  addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => {
        // S-CACHE — LA MISE À JOUR SE VOIT, ET ELLE SE CHOISIT.
        //
        // Le service worker sert l'app en cache-first : une nouvelle version s'installe en
        // arrière-plan mais la page ouverte garde l'ancienne jusqu'au prochain lancement.
        // Personne n'était « coincé » — mais personne n'était prévenu non plus, et rien ne
        // permettait de l'appliquer tout de suite. C'est la moitié qui manquait à O-24 :
        // la version du cache était devenue juste, sa PROPAGATION restait muette.
        const propose = () => {
          if (document.getElementById("ebUpdBar")) return;
          const b = document.createElement("div");
          b.id = "ebUpdBar";
          b.setAttribute("role", "status");
          // Il se pose AU-DESSUS de la barre d'onglets, pas par-dessus. Mesuré : à
          // `bottom: 12px` le bandeau occupe 768→832 px et la barre 789→844 — ils se recouvrent,
          // et `elementFromPoint` au centre de la barre rend `ebUpdBar` : les cinq onglets sont
          // INJOIGNABLES tant qu'on n'a pas remarqué le « Plus tard ». Une notification qui
          // coupe la navigation coûte plus cher que le retard qu'elle évite. La hauteur est
          // MESURÉE sur la barre présente, jamais recopiée : `mobile.css` peut la changer.
          const barre = document.getElementById("ebTabbar");
          const hBarre = barre ? Math.round(barre.getBoundingClientRect().height) : 0;
          b.style.cssText = "position:fixed;left:12px;right:12px;bottom:calc(12px + " + hBarre + "px + env(safe-area-inset-bottom));"
            + "z-index:9999;background:#0c1016;color:#fff;border-radius:12px;padding:12px 14px;"
            + "display:flex;gap:12px;align-items:center;justify-content:space-between;"
            + "box-shadow:0 6px 24px rgba(0,0,0,.25);font-size:var(--fs-lg)"; // R16.8 — l'échelle déclarée, jamais un littéral
          b.innerHTML = '<span>✨ Nouvelle version prête</span>'
            + '<span style="display:flex;gap:8px">'
            + '<button type="button" id="ebUpdGo" style="min-height:44px;padding:0 14px;border:0;border-radius:9px;background:#e63946;color:#fff;font:inherit;font-weight:700">Recharger</button>'
            + '<button type="button" id="ebUpdNo" aria-label="Plus tard" style="min-height:44px;min-width:44px;border:0;border-radius:9px;background:transparent;color:#fff;font:inherit">Plus tard</button>'
            + "</span>";
          document.body.appendChild(b);
          document.getElementById("ebUpdGo").onclick = () => {
            // On demande la bascule ; le rechargement suit `controllerchange`, jamais avant :
            // recharger pendant que l'ancien worker sert encore rendrait la même version.
            if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
          };
          document.getElementById("ebUpdNo").onclick = () => b.remove();
        };
        if (reg.waiting) propose();
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            // `controller` absent = première installation : il n'y a rien à remplacer, et
            // proposer « nouvelle version » à quelqu'un qui vient d'ouvrir l'app serait faux.
            if (sw.state === "installed" && navigator.serviceWorker.controller) propose();
          });
        });
        let recharge = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (recharge) return; // une seule fois : `controllerchange` peut se répéter
          recharge = true;
          location.reload();
        });
        // Une PWA installée sur l'écran d'accueil est souvent GELÉE puis reprise plutôt que
        // renavigée : sans ce contrôle au retour, elle peut ne jamais revérifier.
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") reg.update().catch(() => {});
        });
      })
      .catch((e) => console.warn("EnduraBuild : service worker non enregistré —", e && e.message));
  });
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
