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
import { productCategoryFor, CATALOG } from "./shop-catalog.js";

export const FLAVOR_OPTIONS = ["neutre", "fruits rouges", "citron", "cola", "peu d'importance"];
export const FORMAT_OPTIONS = ["gel individuel", "flasque à recharger", "poudre à diluer"];
export const CADENCES = {
  hebdo: { days: 7, label: "chaque semaine" },
  mensuel: { days: 30, label: "chaque mois" },
};

/**
 * RÉFÉRENCE DE TAILLE/PRIX (décision utilisateur 07/08/2026) — PAS un vrai fournisseur, une
 * HYPOTHÈSE COHÉRENTE pour rendre le besoin en UNITÉS DE PRODUIT plutôt qu'en grammes bruts :
 * c'est ainsi qu'un athlète pense son ravitaillement (« 3 gels », pas « 90 g »). Tailles
 * alignées sur les gels/boissons d'effort du marché (25-40 g de glucides/gel, ~0,5 L par
 * dose de boisson). `CATALOG` (shop-catalog.js) prend le relais dès qu'un vrai fournisseur
 * existe pour la catégorie — nom ET prix, un seul endroit à mettre à jour (R11.1).
 */
export const REFERENCE_PRODUCTS = {
  gel: { unitCarbsG: 30, unitPriceEUR: 1.5 },
  drink: { unitMl: 500, unitPriceEUR: 0.9 },
};

// On peut porter un bidon à vélo — pas en courant, pas en nageant. La boisson ne se propose
// donc que sur les disciplines qui la rendent réellement transportable pendant l'effort.
const DISCIPLINES_BOISSON = new Set(["bk", "br"]);

const ceilUnits = (qty, unit) => (unit > 0 ? Math.max(0, Math.ceil(qty / unit)) : 0);

/**
 * Détail, séance par séance, du ravitaillement de la période [today, today+cadenceDays) —
 * c'est ce que le prochain envoi doit couvrir, livré AVANT que la période commence. Chaque
 * séance qui a besoin de glucides pendant l'effort (le moteur a déjà tranché : `carbsGPerH`
 * non nul) reçoit son compte de gels ; les disciplines qui portent un bidon reçoivent en
 * plus leur compte de boissons. Fenêtre volontairement large (36500 j) pour estimer sur TOUT
 * le plan — c'est ce que `estimateTotalNeed` utilise pour savoir s'il y a quoi que ce soit à
 * proposer.
 */
export function estimatePeriodDetail(plan, weightKg, cadenceDays, todayISO) {
  if (!plan || !Array.isArray(plan.weeks) || !globalThis.EBV2 || !globalThis.EBV2.sessionNutrition) return null;
  const from = Date.parse(todayISO + "T00:00:00Z");
  const to = from + cadenceDays * 86400000;
  const sessions = [];
  plan.weeks.forEach((w) => w.days.forEach((d) => {
    if (!d.date) return;
    const dMs = Date.parse(d.date + "T00:00:00Z");
    if (dMs < from || dMs >= to) return;
    d.sessions.forEach((s) => {
      if (s.d === "rs" || s.race) return;
      let a;
      try { a = globalThis.EBV2.sessionNutrition(s, { tempC: null, weightKg: weightKg || null }); } catch (e) { return; }
      if (!a || !a.during.carbsGPerH) return;
      const hours = (s.min || 0) / 60;
      const [c0, c1] = a.during.carbsGPerH;
      const gelUnits = ceilUnits(((c0 + c1) / 2) * hours, REFERENCE_PRODUCTS.gel.unitCarbsG);
      let drinkUnits = 0;
      if (DISCIPLINES_BOISSON.has(s.d)) {
        const [d0, d1] = a.during.drinkMlPerH;
        drinkUnits = ceilUnits(((d0 + d1) / 2) * hours, REFERENCE_PRODUCTS.drink.unitMl);
      }
      if (!gelUnits && !drinkUnits) return;
      const cat = productCategoryFor(a.during); // toujours non-null ici : carbsGPerH l'implique
      const gelName = CATALOG[cat] ? CATALOG[cat].name : null; // null = référence générique
      const gelPrice = CATALOG[cat] ? CATALOG[cat].priceEUR : REFERENCE_PRODUCTS.gel.unitPriceEUR;
      sessions.push({ name: s.name, date: d.date, gelUnits, gelName, gelPrice, drinkUnits });
    });
  }));
  if (!sessions.length) return null;
  const totals = sessions.reduce((t, s) => ({
    gelUnits: t.gelUnits + s.gelUnits,
    drinkUnits: t.drinkUnits + s.drinkUnits,
    priceEUR: t.priceEUR + s.gelUnits * s.gelPrice + s.drinkUnits * REFERENCE_PRODUCTS.drink.unitPriceEUR,
  }), { gelUnits: 0, drinkUnits: 0, priceEUR: 0 });
  totals.priceEUR = Math.round(totals.priceEUR * 100) / 100;
  return { sessions, totals };
}

/** Y a-t-il, n'importe où dans le plan, de quoi justifier de proposer l'abonnement ? */
export function estimateTotalNeed(plan, weightKg, todayISO) {
  return estimatePeriodDetail(plan, weightKg, 36500, todayISO);
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
