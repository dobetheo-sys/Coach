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

// L'ORDRE EST CELUI DE LA GAMME, pas un ordre d'écriture : les maquettes présentent le citron
// en « référence héro », puis cola, fruits rouges, neutre. Le premier de cette liste est aussi
// le DÉFAUT proposé (`FLAVOR_OPTIONS[0]`) — l'ordre n'est donc pas décoratif.
export const FLAVOR_OPTIONS = ["citron", "cola", "fruits rouges", "neutre", "peu d'importance"];
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

// LA BOISSON ÉTAIT JETÉE DÈS QU'ON N'ÉTAIT PAS À VÉLO — décision du fondateur, 12/08/2026.
//
// La règle disait « on peut porter un bidon à vélo, pas en courant » et ne gardait que `bk`/`br`.
// Mesuré sur un plan marathon : le moteur prescrit 400-800 ml/h, et le canal de vente proposait
// ZÉRO boisson — 1 540 ml jetés sur la sortie longue de 2 h 34, 1 370 sur l'allure spécifique.
// Le moteur calculait un besoin d'hydratation que le canal effaçait en silence, ce qui donnait
// un devis d'apparence complète sur un plan où toute l'hydratation manquait.
//
// La prémisse était fausse pour deux populations : en TRAIL le sac ou la ceinture font partie
// du matériel de base, et au-delà de ~90 MINUTES d'effort on emporte de quoi boire quelle que
// soit la discipline (flasque, ceinture, ravitaillement posé). Arbitrage retenu : « trail +
// sorties > 90 min », par-dessus le vélo et le brick qui ne changent pas.
//
// LA NAGE RESTE DEHORS, et c'est le seul cas où l'impossibilité est physique : on ne boit pas
// en nageant. Cette exclusion-là n'est pas une hypothèse sur l'équipement.
const DISCIPLINES_BIDON = new Set(["bk", "br"]); // le bidon est sur le cadre : toujours dispo
const SANS_BOISSON = new Set(["sw"]);            // on ne boit pas en nageant — pas une question d'équipement
const DUREE_PORTE_BOISSON_MIN = 90;

function proposeBoisson(disciplineCode, dureeMin, sport) {
  if (SANS_BOISSON.has(disciplineCode)) return false;
  if (DISCIPLINES_BIDON.has(disciplineCode)) return true;
  if (sport === "trail") return true;
  return (dureeMin || 0) > DUREE_PORTE_BOISSON_MIN;
}

/**
 * LE GEL EN NAGE : une question de DURÉE, pas de bassin.
 *
 * Le devis proposait 2 gels pour une nage de 70 min en bassin — le moteur calcule bien
 * 30-60 g/h (l'effort les justifie, consensus « au-delà de 60-75 min »), mais on ne mange pas
 * de gel au milieu d'un 70 min en bassin : on mange avant et après.
 *
 * Le premier réflexe était de lire `milieu` (bassin / eau libre) — c'est le MAUVAIS signal :
 * chez un triathlète, `milieu` décrit la course, alors que l'entraînement se fait en bassin
 * quoi qu'il arrive. On aurait branché une règle sur une réponse qui parle d'autre chose.
 * Ce qui décide réellement, c'est la durée : à partir de ~90 min, se ravitailler pendant la
 * séance devient nécessaire ET praticable (au mur comme sur une traversée). On reprend donc le
 * seuil que le fondateur vient de retenir pour la boisson, plutôt que d'en inventer un second.
 *
 * Volontairement limité à la NAGE : appliquer ce seuil au vélo et à la course changerait des
 * devis que personne n'a mis en cause, et le consensus (ACSM/ISSN/Jeukendrup) prescrit bien des
 * glucides dès 60-75 min là où on peut manger en bougeant.
 */
function proposeGel(disciplineCode, dureeMin) {
  if (disciplineCode !== "sw") return true;
  return (dureeMin || 0) >= DUREE_PORTE_BOISSON_MIN;
}

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
export function estimatePeriodDetail(plan, weightKg, cadenceDays, todayISO, sport) {
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
      const gelUnits = proposeGel(s.d, s.min)
        ? ceilUnits(((c0 + c1) / 2) * hours, REFERENCE_PRODUCTS.gel.unitCarbsG)
        : 0;
      let drinkUnits = 0;
      if (proposeBoisson(s.d, s.min, sport)) {
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
export function estimateTotalNeed(plan, weightKg, todayISO, sport) {
  return estimatePeriodDetail(plan, weightKg, 36500, todayISO, sport);
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
 * Retour utilisateur (08/08/2026) : « suggérer à l'athlète d'être accompagné avec nos gels
 * dès la fin du plan ». Le plan qui se termine est exactement le moment où `shopPromptDue`
 * devient muet — `estimateTotalNeed` ne trouve plus AUCUNE séance future à chiffrer, donc la
 * carte entière disparaît (elle ne se propose que sur un besoin CALCULÉ). C'est pourtant le
 * moment où la question a un sens : « tu continues à t'entraîner, veux-tu qu'on continue à
 * t'accompagner ? ». Même cadence anti-spam que `shopPromptDue` (28 jours), même ancre
 * `sub.lastPromptAt` — un seul et même compteur, pas un second qui pourrait déclencher les
 * deux prompts côte à côte.
 */
export function shopEndOfPlanPromptDue(sub, planEndedAt, todayISO) {
  const v = subscriptionView(sub, todayISO);
  if (v.status === "active" || v.status === "cancel_pending") return false;
  if (!planEndedAt || !todayISO || todayISO < planEndedAt) return false;
  const anchor = (sub && sub.lastPromptAt) || planEndedAt;
  const days = Math.floor((Date.parse(todayISO + "T00:00:00Z") - Date.parse(anchor + "T00:00:00Z")) / 86400000);
  return days >= 28;
}

/**
 * ÂGE MINIMUM POUR VOIR LA CARTE DE VENTE — décision du fondateur, 12/08/2026.
 *
 * Mesuré : un profil de 14 ans recevait la carte d'abonnement complète, devis et bouton
 * d'activation compris. Or ce produit refuse déjà l'estimation énergétique sous 16 ans (O-16,
 * Mifflin-St Jeor hors de son domaine de validation) — et une carte COMMERCIALE est de la
 * catégorie 7 du manifeste, celle qui ne doit jamais passer devant les quatre premières.
 * Solliciter un mineur pour un produit de nutrition sportive n'est pas défendable ; le seuil
 * reprend celui d'O-16 plutôt que d'en inventer un second.
 *
 * CE QUI N'EST PAS TOUCHÉ, et c'est le point : le RAVITAILLEMENT d'effort (N1-N7) reste servi à
 * tout âge, dans la carte de la séance. Un adolescent qui roule trois heures doit savoir quoi
 * boire ; c'est la VENTE qui se retire, jamais l'information. Exactement la frontière qu'O-16
 * a tracée entre l'estimation journalière (refusée) et le ravitaillement (gardé).
 *
 * Un âge ABSENT n'est pas une preuve de minorité (même raisonnement qu'O-16) : on ne masque
 * que sur un âge connu et inférieur au seuil.
 *
 * Le drapeau médical, lui, ne masque PAS (arbitrage du fondateur) : être suivi médicalement
 * n'interdit ni de manger ni de boire, et le plan est déjà ramené à l'endurance par ailleurs.
 */
export const AGE_MIN_VENTE = 16;

export function venteAutorisee(answers) {
  const age = parseInt((answers && answers.age) || "", 10);
  return !(Number.isFinite(age) && age < AGE_MIN_VENTE);
}

/**
 * SEUL point à remplacer par un vrai appel serveur (facturation récurrente, expédition).
 * Aujourd'hui : aucune requête réseau, aucune promesse de livraison — l'intention reste
 * locale (persistée par l'appelant via `S.answers.shopSubscription` + `ebSave()`).
 */
export async function submitOrder(sub) {
  return { ok: true, remote: false };
}
