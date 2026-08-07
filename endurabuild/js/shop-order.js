// Canal de vente — abonnement de ravitaillement récurrent, résiliable à l'échéance.
// Frontière identique à shop-catalog.js : ce module ne touche JAMAIS engine.js et n'est
// jamais importé par lui. Il lit ce que le moteur a déjà calculé (sessionNutrition par
// séance), il n'invente aucun nouveau seuil physiologique.
//
// RÉCURRENCE, PAS UN LOT UNIQUE (décision du 07/08/2026) : un lien « achat immédiat » sur la
// séance du jour n'a pas de sens — personne ne peut être livré le jour même. L'athlète
// s'abonne à une CADENCE (chaque semaine ou chaque mois) ; chaque envoi couvre la période à
// VENIR, livré en avance ; résiliable à chaque échéance seulement — jamais en cours de
// période, qui est la seule chose qu'on puisse honnêtement promettre quand rien n'a encore
// été facturé.
//
// PAS DE SERVEUR POUR L'INSTANT (décision du 04/08/2026, inchangée) : l'abonnement est une
// INTENTION capturée localement, jamais une commande réelle — submitOrder() reste le seul
// point d'intégration avec un futur backend.
import { productCategoryFor, CATALOG, CATEGORY_LABELS } from "./shop-catalog.js";

export const FLAVOR_OPTIONS = ["neutre", "fruits rouges", "citron", "cola", "peu d'importance"];
export const FORMAT_OPTIONS = ["gel individuel", "flasque à recharger", "poudre à diluer"];
export const CADENCES = {
  hebdo: { days: 7, label: "chaque semaine" },
  mensuel: { days: 30, label: "chaque mois" },
};

const r50 = (v) => Math.max(0, Math.round(v / 50) * 50);

function scanSessions(plan, weightKg, wantSession) {
  if (!plan || !Array.isArray(plan.weeks) || !globalThis.EBV2 || !globalThis.EBV2.sessionNutrition) return null;
  const grams = {};
  let any = false;
  plan.weeks.forEach((w) => w.days.forEach((d) => {
    d.sessions.forEach((s) => {
      if (s.d === "rs" || s.race) return;
      if (wantSession && !wantSession(d)) return;
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

/** Y a-t-il, n'importe où dans le plan, de quoi justifier de proposer l'abonnement ? */
export function estimateTotalNeed(plan, weightKg) {
  return scanSessions(plan, weightKg, null);
}

/**
 * Besoin glucidique de la PROCHAINE période [today, today+cadenceDays), par catégorie, en
 * grammes — c'est ce que le prochain envoi doit couvrir, livré AVANT que la période commence.
 */
export function estimatePeriodNeed(plan, weightKg, cadenceDays, todayISO) {
  const from = Date.parse(todayISO + "T00:00:00Z");
  const to = from + cadenceDays * 86400000;
  return scanSessions(plan, weightKg, (d) => {
    if (!d.date) return false;
    const dMs = Date.parse(d.date + "T00:00:00Z");
    return dMs >= from && dMs < to;
  });
}

/** Résumé lisible d'un besoin { gel_standard: 1200, ... } — porte le nom du produit réel dès
 *  qu'un fournisseur existe dans CATALOG (R11.1 : un seul endroit à mettre à jour). */
export function needSummary(grams) {
  if (!grams) return "";
  return Object.keys(grams).map((k) => {
    const base = grams[k] + " g · " + CATEGORY_LABELS[k];
    return CATALOG[k] ? base + " (" + CATALOG[k].name + ")" : base;
  }).join(" · ");
}

/**
 * Date de la PROCHAINE échéance depuis le départ de l'abonnement — DÉRIVÉE de startedAt +
 * cadence à chaque appel, jamais stockée ni avancée par une boucle (R11.1 : une seule
 * horloge). Une échéance n'existe qu'à un multiple entier de la cadence depuis le départ.
 */
export function nextEcheance(startedAt, cadenceDays, todayISO) {
  const start = Date.parse(startedAt + "T00:00:00Z");
  const now = Date.parse(todayISO + "T00:00:00Z");
  const elapsed = Math.max(0, Math.floor((now - start) / 86400000 / cadenceDays));
  return new Date(start + (elapsed + 1) * cadenceDays * 86400000).toISOString().slice(0, 10);
}

/**
 * État dérivé de l'abonnement — jamais stocké tel quel. `cancelEffectiveAt` fige l'échéance
 * calculée AU MOMENT de la résiliation : l'abonnement reste actif jusque-là (le prochain
 * envoi déjà anticipé a lieu), puis s'arrête, sans qu'aucune boucle n'ait à « avancer » un
 * état d'un rendu à l'autre.
 */
export function subscriptionView(sub, todayISO) {
  if (!sub || !sub.startedAt) return { status: "none" };
  if (sub.cancelEffectiveAt) {
    return todayISO >= sub.cancelEffectiveAt
      ? { status: "cancelled", since: sub.cancelEffectiveAt }
      : { status: "cancel_pending", until: sub.cancelEffectiveAt };
  }
  return { status: "active" };
}

/** Le tunnel se propose une fois puis se tait 4 semaines si personne ne s'est abonné —
 *  jamais un rappel permanent (H-1b), jamais un refus définitif. Sans objet une fois abonné
 *  (actif ou en cours de résiliation) : la carte reste alors accessible sans avoir besoin
 *  d'être remise en avant. */
export function shopPromptDue(sub, planStart, todayISO) {
  const v = subscriptionView(sub, todayISO);
  if (v.status === "active" || v.status === "cancel_pending") return false;
  const anchor = (sub && sub.lastPromptAt) || planStart || todayISO;
  if (!anchor || !todayISO) return false;
  const days = Math.floor((Date.parse(todayISO + "T00:00:00Z") - Date.parse(anchor + "T00:00:00Z")) / 86400000);
  return days >= 28;
}

/**
 * SEUL point à remplacer par un vrai appel serveur (facturation récurrente, expédition).
 * Aujourd'hui : aucune requête réseau, aucune promesse de livraison — l'intention reste
 * locale (persistée par l'appelant via `S.answers.shopSubscription` + `ebSave()`).
 */
export async function submitOrder(sub) {
  return { ok: true, remote: false };
}
