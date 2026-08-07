// Canal de vente — tunnel de commande (goût/format), sur toute la préparation.
// Frontière identique à shop-catalog.js : ce module ne touche JAMAIS engine.js et n'est
// jamais importé par lui. Il lit ce que le moteur a déjà calculé (sessionNutrition par
// séance), il n'invente aucun nouveau seuil physiologique.
//
// PAS DE SERVEUR POUR L'INSTANT, décision explicite (04/08/2026) : `submitOrder()` est
// le SEUL point d'intégration à remplacer le jour où un vrai backend existe — comme le
// relais Strava (server/README.md), la commande reste 100% locale tant qu'il n'y a rien
// derrière, et le dit à l'athlète plutôt que de simuler une confirmation.
import { productCategoryFor, CATEGORY_LABELS } from "./shop-catalog.js";

/** Options génériques (aucun produit réel n'existe encore dans CATALOG) — R11.1 :
 *  un seul endroit à mettre à jour si un vrai catalogue de goûts/formats arrive. */
export const FLAVOR_OPTIONS = ["neutre", "fruits rouges", "citron", "cola", "peu d'importance"];
export const FORMAT_OPTIONS = ["gel individuel", "flasque à recharger", "poudre à diluer"];

const r50 = (v) => Math.max(0, Math.round(v / 50) * 50);

/**
 * Besoin glucidique total du plan, par catégorie produit, en grammes.
 * Somme sessionNutrition() sur chaque séance qui en réclame déjà (>1h, le moteur gère
 * ce seuil — aucun second seuil inventé ici, R11.1). Exclut repos et jour de course :
 * une course objectif porte `min:0` par conception (R13.4), l'utiliser donnerait un
 * besoin nul là où c'est justement le plus gros enjeu de ravitaillement.
 * Fonction PURE (hors l'appel à sessionNutrition, déjà pur côté moteur).
 */
export function estimatePlanNeed(plan, weightKg) {
  if (!plan || !Array.isArray(plan.weeks) || !globalThis.EBV2 || !globalThis.EBV2.sessionNutrition) return null;
  const grams = {};
  let any = false;
  plan.weeks.forEach((w) => w.days.forEach((d) => {
    d.sessions.forEach((s) => {
      if (s.d === "rs" || s.race) return;
      let a;
      try { a = globalThis.EBV2.sessionNutrition(s, { tempC: null, weightKg: weightKg || null }); } catch (e) { return; }
      if (!a) return;
      const cat = productCategoryFor(a.during);
      if (!cat) return;
      any = true;
      const g = a.during.carbsGPerH;
      const gph = (g[0] + g[1]) / 2;
      grams[cat] = (grams[cat] || 0) + gph * ((s.min || 0) / 60);
    });
  }));
  if (!any) return null;
  const out = {};
  for (const k in grams) out[k] = r50(grams[k]);
  return out;
}

/** Résumé lisible d'un besoin { gel_standard: 1200, ... } → "1200 g · gel énergétique". */
export function needSummary(grams) {
  if (!grams) return "";
  return Object.keys(grams).map((k) => grams[k] + " g · " + CATEGORY_LABELS[k]).join(" · ");
}

/**
 * Le tunnel propose une fois, puis se tait 4 semaines si l'athlète n'a pas commandé —
 * décision du fondateur (07/08/2026) : ni un rappel permanent (H-1b), ni un refus définitif,
 * l'athlète doit pouvoir « voir que le plan tient » avant de valider. La carte reste de toute
 * façon accessible manuellement à tout moment (repliée) : cette fonction ne pilote que
 * l'ouverture AUTOMATIQUE, jamais l'existence de la carte.
 */
export function shopPromptDue(order, planStart, today) {
  if (order && order.status === "ordered") return false;
  const anchor = (order && order.lastPromptAt) || planStart || today;
  if (!anchor || !today) return false;
  const days = Math.floor((Date.parse(today + "T00:00:00Z") - Date.parse(anchor + "T00:00:00Z")) / 86400000);
  return days >= 28;
}

/**
 * SEUL point à remplacer par un vrai appel serveur. Aujourd'hui : aucune requête réseau,
 * aucune promesse de livraison — la commande reste locale (persistée par l'appelant via
 * `S.answers.shopOrder` + `ebSave()`, comme le reste de l'état de l'athlète).
 */
export async function submitOrder(order) {
  return { ok: true, remote: false };
}
