/**
 * T-27 — LE SCEAU : LE SEUL ENDROIT DU PIPELINE OÙ « APRÈS » N'EXISTE PAS.
 *
 * Douze occurrences de la même famille dans ce chantier — B-19, A-10, V-11, R20.2, C28, C30b,
 * I14b, le diagnostic de volume d'O-35 (ligne 2998 pour une réconciliation à 3322), et B-02
 * hier encore. Toutes disent la même chose : **une garantie vérifiée là où quelqu'un a pensé à
 * la vérifier ne vérifie que l'avant-dernier état.** Ce n'est pas un défaut d'attention, c'est
 * un défaut d'architecture — rien n'empêche une passe ultérieure de rouvrir ce qu'une passe
 * antérieure a fermé, et rien ne le signale.
 *
 * `blockBounds` plafonne le leg vélo d'un brick à 90 min. Quelque chose grandissait après. Un
 * plafond qui n'est pas la dernière opération n'est pas un plafond : c'est une suggestion
 * appliquée à un instant arbitraire du pipeline.
 *
 * Le sceau répond à ça par sa POSITION, pas par une règle de plus. Il tourne au point de sortie
 * unique de `generateAudited`, après `reconcileDeclaredVolume`, après `syncDerivedLabels`, après
 * le ré-audit final. Ce qu'il assert est vrai du plan LIVRÉ, quelle que soit la passe qui a
 * agi et quel que soit l'ordre dans lequel elles ont tourné.
 *
 * DEUX RANGS, ET LA DISTINCTION N'EST PAS COSMÉTIQUE :
 *
 *   · `dur`      — invariant vert aujourd'hui sur les 949. Il LÈVE. C'est ce qui rend la
 *                  treizième occurrence impossible plutôt qu'improbable.
 *   · `déclaré`  — invariant rouge aujourd'hui, avec son ticket ouvert. Il est COMPTÉ et rendu,
 *                  jamais tu. Rendre bloquant un invariant dont on n'a pas trié les échecs fige
 *                  la dette au lieu de la traiter — c'est la leçon de R20.6, payée sur le banc
 *                  d'invariants, et elle vaut ici aussi.
 *
 * Le rang de chaque invariant a été MESURÉ avant d'être écrit (règle 7), pas supposé : voir
 * `scripts/mesureSceau.mjs`, qui balaie les 949 profils du golden et rend le compte de chacun.
 *
 * CE QUE LE SCEAU N'EST PAS ENCORE. Le §3 de l'arbitrage demande aussi que toute fonction de
 * diagnostic, de message, de record ou d'export ASSERT `_sealed` à l'entrée. Le drapeau est
 * posé ici et la moitié « batterie » est écrite ; la moitié « assertion à la lecture » demande
 * de recenser les surfaces de lecture du plan, et elle est suivie à part (BUGS_OUVERTS, T-27b).
 * Poser le drapeau sans les assertions ne garde rien tout seul — c'est écrit pour que personne
 * ne prenne la présence de `_sealed` pour la garantie qu'il ne donne pas encore.
 */
import type { V1Plan, V1Week, V1Session, V1Step } from "./v1Types.ts";
import { BRICK_BIKE_BOUNDS, BRICK_TAPER_BIKE_BOUNDS } from "../engine/constraintMatrix.ts";
import { ZDEF } from "./renderer.ts";

export type SealVerdict = { id: string; quoi: string; rang: "dur" | "declare"; ticket?: string; violations: string[] };
export type SealReport = { verdicts: SealVerdict[]; dur: number; declare: number };

/**
 * §4 — EN PRODUCTION, NE PAS LEVER NE VEUT PAS DIRE NE RIEN FAIRE.
 *
 * Le sceau lève en CI et rend le plan en production (voir `sealPlan`). Mais un invariant qui se
 * violerait chez un utilisateur, sur un profil que le golden ne contient pas, est l'information
 * la plus précieuse que ce moteur puisse recevoir — et elle est perdue si le sceau se contente
 * de se taire hors CI. Même condition que le clamp de sortie : **compté et visible, jamais
 * silencieux.**
 *
 * Le compteur est cumulatif par session et lisible depuis l'app (`EBV2.sealCounters`). Il reste
 * à ZÉRO sur les 949 pour les invariants de rang DUR — c'est ce que le banc T-27 vérifie.
 */
export const SEAL_COUNTERS: { plans: number; dur: number; declare: number; parInvariant: Record<string, number> } = {
  plans: 0, dur: 0, declare: 0, parInvariant: {},
};

/** Le plan scellé — `_sealed` marque « plus aucune mutation après ce point ». */
export type SealedPlan = V1Plan & { _sealed?: true; _seal?: SealReport };

const sessions = (plan: V1Plan): { w: V1Week; s: V1Session }[] => {
  const out: { w: V1Week; s: V1Session }[] = [];
  for (const w of plan.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? []) out.push({ w, s });
  return out;
};

/**
 * S1 — LES BORNES DE BRICK, LUES À LA SOURCE DE L'AUDITEUR.
 *
 * L'invariant que B-02 aurait fermé en une ligne. Le générateur borne le leg vélo par
 * `CAP_BRICK_BIKE × brickRF × share` (`blockBounds`), l'auditeur par `BRICK_BIKE_BOUNDS[fmt]` :
 * deux sources pour une même grandeur, et le mode de défaillance est le pire qui soit — le
 * générateur produit sereinement ce que l'auditeur refusera, donc le défaut n'apparaît qu'au
 * gate, longtemps après sa cause. Le sceau lit la source de l'AUDITEUR : c'est elle qui fait
 * foi, et la divergence elle-même est traitée en balayage (T-28).
 */
function s1BricksDansLeursBornes(plan: V1Plan, format: string | undefined): string[] {
  const bad: string[] = [];
  if (!format) return bad;
  const charge = BRICK_BIKE_BOUNDS[format], taper = BRICK_TAPER_BIKE_BOUNDS[format];
  for (const { w, s } of sessions(plan)) {
    if (!s.brick || !s.steps) continue;
    const legs = s.steps.filter((st: V1Step) => st.leg === "bike" && st.durationMin != null);
    const bornes = w.phase?.id === "taper" ? taper : charge;
    if (!legs.length || !bornes) continue;
    const min = legs.reduce((t: number, st: V1Step) => t + (st.reps || 1) * (st.durationMin || 0), 0);
    if (min > bornes[1] || min < bornes[0])
      bad.push("S" + w.num + " « " + s.name + " » : vélo " + Math.round(min) + " min hors [" + bornes[0] + ", " + bornes[1] + "]");
  }
  return bad;
}

/** S2 (T-20) — toute zone émise se résout dans ZDEF. Une zone inconnue rend un texte muet. */
function s2ZonesResolubles(plan: V1Plan): string[] {
  const bad: string[] = [];
  for (const { w, s } of sessions(plan))
    for (const st of s.steps ?? [])
      if (st.role === "body" && st.zone != null && !(ZDEF as Record<string, unknown>)[String(st.zone)])
        bad.push("S" + w.num + " « " + s.name + " » : zone inconnue " + st.zone);
  return bad;
}

/**
 * S3 (R4.8a) — `min` est un NOMBRE FINI sur toute séance, repos compris. Le contrat ne tenait
 * que par les rattrapages `s.min || 0` de ses consommateurs ; au sceau, il tient ou il lève.
 */
function s3ContratMin(plan: V1Plan): string[] {
  const bad: string[] = [];
  for (const { w, s } of sessions(plan))
    if (typeof s.min !== "number" || !isFinite(s.min) || s.min < 0)
      bad.push("S" + w.num + " « " + s.name + " » : min = " + JSON.stringify(s.min));
  return bad;
}

/**
 * S4 (I14) — LA SORTIE LONGUE EST LA PLUS LONGUE SÉANCE DE SA DISCIPLINE, DANS SA SEMAINE.
 *
 * `enforceLabelVsDose` la tient, deux fois, et pourtant B-02 vient de la rouvrir depuis une
 * passe de remplissage. C'est précisément l'invariant qu'il faut relire à la sortie : il porte
 * sur le rapport entre DEUX séances, donc n'importe quelle passe qui touche l'une le rouvre.
 *
 * LE PRÉDICAT EST RECOPIÉ DE LA RÈGLE, PAS REDESSINÉ. Ma première écriture comparait la longue
 * à TOUTE séance de sa discipline ; I14 exclut `sx.brick` et `sx.long` — un brick n'est pas une
 * séance dont le nom promet une dose (il en promet deux), et deux sorties longues dans une
 * semaine sont une décision de périodisation, pas un libellé qui ment. Mesurée avec mon
 * prédicat : 151 profils, 498 violations. Avec CELUI DE LA RÈGLE : voir `mesureSceau`. Dixième
 * occurrence dans ce dépôt d'un critère qui nomme une grandeur et en mesure une voisine — cette
 * fois dans la garde censée fermer la classe, ce qui est le pire endroit possible.
 * (La course objectif est hors sujet — R13.4 : le jour J n'est pas une séance d'entraînement.)
 */
function s4LongueEstLaPlusLongue(plan: V1Plan): string[] {
  const bad: string[] = [];
  for (const w of plan.weeks ?? []) {
    const ss = (w.days ?? []).flatMap((d) => d.sessions ?? []).filter((s) => s.d !== "rs" && s.steps && s.steps.length);
    for (const lg of ss) {
      if (!lg.long || lg.race) continue;
      for (const s of ss) {
        if (s === lg || s.race || s.brick || s.long || s.d !== lg.d) continue;
        if ((s.min || 0) > (lg.min || 0) + 0.5)
          bad.push("S" + w.num + " : « " + s.name + " » " + Math.round(s.min || 0) + " min > longue « " + lg.name + " » " + Math.round(lg.min || 0));
      }
    }
  }
  return bad;
}

/**
 * S5 (T-25, DÉCLARÉ) — `min(plafonds)` du record R20.2 vaut le pic LIVRÉ.
 *
 * L'identité que le record doit tenir : si le plan culmine à une valeur qu'aucun maillon
 * déclaré n'explique, c'est qu'un acteur non déclaré la borne, et l'athlète lit « ce qui te
 * borne » sous un chiffre qui vient d'ailleurs. Rouge aujourd'hui (509 sur 945 au dernier
 * comptage, en baisse de 608 depuis B-02) : rang DÉCLARÉ, suivi en O-35 / O-36.
 */
function s5IdentiteR202(plan: V1Plan): string[] {
  const r = (plan as { _r202?: { plafonds?: { livre?: number }[] } })._r202;
  const pic = (plan as { volPeak?: number }).volPeak;
  if (!r?.plafonds?.length || typeof pic !== "number") return [];
  const actifs = r.plafonds.map((p) => p.livre).filter((v): v is number => typeof v === "number");
  if (!actifs.length) return [];
  const min = Math.min(...actifs);
  return Math.abs(min - pic) > 0.1 ? ["min(plafonds) = " + min.toFixed(2) + " h ≠ pic livré " + pic.toFixed(2) + " h"] : [];
}

/**
 * S6 (T-29 §4) — TOUTE SEMAINE DE PIC EN CHARGE A UNE SEMAINE DE CHARGE DEVANT ELLE.
 *
 * C'est la condition d'existence du plafond C22 du pic : le clamp s'écrit
 * `Math.max(maxWeek, prevCharge > 0 ? prevCharge × … : Infinity)`, donc un pic SANS semaine de
 * charge antérieure n'aurait **aucun plafond**. C'est le seul site de l'inventaire T-29 sans
 * borne dominante, et il est mesuré INATTEIGNABLE — 0 sur 1 332 semaines de pic, préparations
 * tronquées R22 comprises.
 *
 * Mais « inatteignable » est une propriété du code d'AUJOURD'HUI, c'est-à-dire exactement la
 * forme « protégé par le chemin, pas par la borne » qui a coûté deux jours sur B-02. La
 * convertir en assertion est gratuit : si elle devient atteignable, le sceau le dit à la
 * seconde où ça arrive, au lieu qu'un gate le découvre deux lots plus tard.
 */
function s6PicPrecedeDeCharge(plan: V1Plan): string[] {
  const bad: string[] = [];
  const semaines = plan.weeks ?? [];
  for (let i = 0; i < semaines.length; i++) {
    const w = semaines[i];
    if (w.phase?.id !== "peak" || w.isRecup) continue;
    const aCharge = semaines.slice(0, i).some((x) => !x.isRecup && x.phase?.id !== "taper"
      && (x.days ?? []).some((d) => (d.sessions ?? []).some((s) => (s.min || 0) > 0)));
    if (!aCharge) bad.push("S" + w.num + " : semaine de PIC sans aucune semaine de charge avant elle — le clamp C22 y serait sans plafond");
  }
  return bad;
}

/**
 * S7 (T-29 sémantique) — UNE SÉANCE DE NAGE QUI DÉCLARE DES MÈTRES EN DÉCLARE PLUS DE ZÉRO.
 *
 * Le plancher C24/C24b s'écrivait `if (tot <= 0) continue` : un `continue` silencieux sur une
 * passe de SÉCURITÉ, qui confondait « prescrite en temps » (le plancher n'a pas d'objet) et
 * « mètres introuvables » (donnée absente). Le second est un fail-open — n'importe quel chemin
 * futur qui fait rendre 0 à `metersOf` désactiverait le plancher pour cette séance sans un mot.
 *
 * L'assertion porte donc sur l'état AMBIGU et sur lui seul : une séance dont au moins un bloc de
 * corps DÉCLARE une distance, et dont le total est nul. Une séance intégralement prescrite en
 * temps n'est pas concernée — c'est un état légitime, mesuré sur 67 séances d'affûtage.
 */
function s7NageMetresCoherents(plan: V1Plan): string[] {
  const bad: string[] = [];
  for (const { w, s } of sessions(plan)) {
    if (s.d !== "sw" || !s.steps || !s.steps.length) continue;
    const declarent = s.steps.filter((st: V1Step) => st.role === "body" && st.distanceM != null);
    if (!declarent.length) continue; // prescrite en TEMPS : légitime
    const tot = s.steps.reduce((t: number, st: V1Step) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
    if (tot <= 0)
      bad.push("S" + w.num + " « " + s.name + " » : " + declarent.length + " bloc(s) déclarent une distance, total = " + tot + " m");
  }
  return bad;
}

/**
 * Scelle le plan : batterie d'invariants, puis `_sealed`. LÈVE sur toute violation de rang
 * `dur` — bruyamment, avec le détail : un sceau qui rendrait un verdict silencieux serait la
 * treizième occurrence sous un autre nom.
 */
export function sealPlan(plan: V1Plan, opts?: { format?: string; strict?: boolean }): SealReport {
  // LES RANGS SONT CEUX QUE LA MESURE DONNE (`npm run mesure:sceau`, 702 profils), jamais ceux
  // que l'intention voudrait. Trois des cinq contredisaient mon écriture initiale — c'est
  // précisément pour ça que la mesure passe avant.
  const verdicts: SealVerdict[] = [
    { id: "S1", quoi: "les bricks tiennent les bornes de format de l'AUDITEUR (C21b/C21c)", rang: "declare", ticket: "O-37a", violations: s1BricksDansLeursBornes(plan, opts?.format) },
    { id: "S2", quoi: "toute zone émise se résout dans ZDEF (T-20)", rang: "dur", violations: s2ZonesResolubles(plan) },
    { id: "S3", quoi: "`min` est un nombre fini sur toute séance (R4.8a)", rang: "dur", violations: s3ContratMin(plan) },
    { id: "S4", quoi: "la sortie longue est la plus longue de sa discipline dans sa semaine (I14)", rang: "declare", ticket: "O-37", violations: s4LongueEstLaPlusLongue(plan) },
    { id: "S5", quoi: "min(plafonds) du record R20.2 vaut le pic livré (T-25)", rang: "declare", ticket: "O-35 / O-36", violations: s5IdentiteR202(plan) },
    { id: "S6", quoi: "toute semaine de pic a une semaine de charge devant elle (condition du clamp C22, T-29)", rang: "dur", violations: s6PicPrecedeDeCharge(plan) },
    { id: "S7", quoi: "une nage qui déclare des mètres en déclare plus de zéro (fail-open C24/C24b, T-29)", rang: "dur", violations: s7NageMetresCoherents(plan) },
  ];
  const report: SealReport = {
    verdicts,
    dur: verdicts.filter((v) => v.rang === "dur").reduce((t, v) => t + v.violations.length, 0),
    declare: verdicts.filter((v) => v.rang === "declare").reduce((t, v) => t + v.violations.length, 0),
  };
  // §4 — le compteur, en production comme en CI. Il tourne AVANT la levée éventuelle : un plan
  // qui fait lever le sceau doit être compté, sinon le seul cas qui compte vraiment manquerait.
  SEAL_COUNTERS.plans++;
  SEAL_COUNTERS.dur += report.dur;
  SEAL_COUNTERS.declare += report.declare;
  for (const v of verdicts)
    if (v.violations.length) SEAL_COUNTERS.parInvariant[v.id] = (SEAL_COUNTERS.parInvariant[v.id] || 0) + v.violations.length;

  // NON ÉNUMÉRABLES, ET C'EST UNE DÉCISION. Le rapport est intégralement DÉRIVÉ du plan : le
  // photographier dans le golden n'ajoute aucun pouvoir de détection (un plan identique rend un
  // rapport identique) et ferait churner 945 empreintes à chaque ajout d'invariant à la
  // batterie. Surtout, le plan est SÉRIALISÉ dans `localStorage` (`eb_state_v2`) : y verser un
  // rapport de diagnostic gonflerait l'état de chaque utilisateur pour une donnée recalculable.
  // Non énumérable = invisible à `JSON.stringify`, lisible par qui le demande — le banc T-27 et
  // `mesure:sceau` le lisent sans rien changer.
  const p = plan as SealedPlan;
  Object.defineProperty(p, "_seal", { value: report, enumerable: false, configurable: true, writable: true });
  Object.defineProperty(p, "_sealed", { value: true, enumerable: false, configurable: true, writable: true });
  // `strict` EST OPT-IN, ET C'EST UN ARBITRAGE, PAS UNE PRUDENCE.
  //
  // Le §3 demande que le sceau « échoue bruyamment ». Il échoue bruyamment en CI — c'est là que
  // le bruit sert à quelqu'un. En PRODUCTION il rend le plan et attache son rapport, parce
  // qu'une violation d'invariant est un défaut de CODE et non un risque pour l'athlète : lever
  // lui rendrait un écran vide après 37 questions, et « un plan qu'on ne peut pas générer » est
  // le plan qu'il quitte pour s'entraîner seul, sans aucun garde-fou (priorité 3 du manifeste,
  // O-17 — ce qui BLOQUE est réservé à ce que l'athlète ne peut pas évaluer lui-même).
  // Le rapport voyage avec le plan : le défaut reste visible, il ne coûte simplement pas la
  // séance du jour à quelqu'un qui n'y est pour rien.
  if (report.dur > 0 && opts?.strict === true) {
    const detail = verdicts.filter((v) => v.rang === "dur" && v.violations.length)
      .map((v) => v.id + " (" + v.quoi + ") : " + v.violations.slice(0, 4).join(" ; "))
      .join(" | ");
    throw new Error("SCEAU T-27 — " + report.dur + " violation(s) d'invariant sur le plan LIVRÉ : " + detail);
  }
  return report;
}
