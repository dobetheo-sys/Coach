/**
 * Rendu V2 — port fidèle de renderSess/stepMin/ZDEF de Coach_Pro_V1.5 (R3.1/R3.8/C13).
 * DERNIÈRE étape, lecture seule : fixe warmup/cooldown (échauffement ≤25min et ≤ corps),
 * n'expose le scaling que sur les steps body. Texte français identique au produit.
 */
import type { V1Session, V1Step } from "../engine/types.ts";
import { C13_WARMUP_MAX_MIN, C13c_WARMUP_MIN_MIN } from "../engine/constraintMatrix.ts";

export interface Refs {
  ftp: number;
  thrPace: number;
  css: number;
  /** R7 TRAIL — vitesse ascensionnelle seuil (m D+/h) : la référence d'intensité EN MONTÉE.
   *  L'allure au sol n'a aucun sens sur du vertical ; la VAM, oui. */
  vam?: number;
  /**
   * O-11 / R20.5 — LA BANDE « ALLURE COURSE » VÉLO DE **CETTE** ÉPREUVE.
   *
   * `ZDEF["bk.rp"]` valait 0,80–0,88 × FTP pour tout le monde, alors que le moteur prescrit
   * lui-même 0,70–0,76 le jour J d'un Ironman et 0,85–0,93 sur un sprint. La zone
   * d'entraînement était donc, selon le format, 15 % trop dure ou trop facile — sur un nombre
   * que l'athlète est justement censé apprendre à tenir. Renseignée par `raceBikeBand()`, le
   * point unique ; absente, `bk.rp` retombe sur la valeur historique de `ZDEF`.
   */
  bikeRp?: { lo: number; hi: number };
}
export type HrZones = Record<string, string> & { fcMax?: number };

interface ZoneDef {
  ref: "ftp" | "thrPace" | "css" | "vam";
  lo: number;
  hi: number;
  hr: string | null;
  fb: string;
}

/** R3.1/R3.8 — intensités relatives : référence + multiplicateurs, replis FC puis RPE. */
export const ZDEF: Record<string, ZoneDef> = {
  "bk.z2": { ref: "ftp", lo: 0.56, hi: 0.75, hr: "z2", fb: "effort 4/10 conversation" },
  "bk.ss": { ref: "ftp", lo: 0.88, hi: 0.94, hr: "tempo", fb: "effort 7/10 soutenu" },
  "bk.vo2": { ref: "ftp", lo: 1.06, hi: 1.18, hr: null, fb: "effort 9/10 (RPE — la FC suit mal sur 4min)" },
  "bk.frc": { ref: "ftp", lo: 0.78, hi: 0.86, hr: null, fb: "gros braquet, effort musculaire (cadence>FC)" },
  "bk.rp": { ref: "ftp", lo: 0.8, hi: 0.88, hr: "tempo", fb: "allure course soutenue" },
  "bk.thr": { ref: "ftp", lo: 0.95, hi: 1.05, hr: "seuil", fb: "seuil ~1h" },
  "rn.easy": { ref: "thrPace", lo: 1.16, hi: 1.26, hr: "z2", fb: "allure conversation" },
  "rn.mara": { ref: "thrPace", lo: 1.08, hi: 1.13, hr: "tempo", fb: "allure marathon" },
  "rn.thr": { ref: "thrPace", lo: 1.0, hi: 1.05, hr: "seuil", fb: "allure seuil ~1h" },
  "rn.vo2": { ref: "thrPace", lo: 0.92, hi: 0.97, hr: null, fb: "allure 5-10min (RPE — FC peu fiable sur l'intervalle court)" },
  "rn.rec": { ref: "thrPace", lo: 1.28, hi: 1.4, hr: "z1", fb: "récup très lent" },
  "sw.easy": { ref: "css", lo: 1.12, hi: 1.12, hr: null, fb: "souple, technique" },
  "sw.aero": { ref: "css", lo: 1.06, hi: 1.06, hr: null, fb: "endurance régulière" },
  "sw.css": { ref: "css", lo: 1.0, hi: 1.0, hr: null, fb: "allure seuil (test 400m)" },
  "sw.speed": { ref: "css", lo: 0.94, hi: 0.94, hr: null, fb: "rapide mais contrôlé" },
  // R5.4 (audit v7 bis) — VO2max EN NAGE. Sous blessure d'impact, supprimer le stimulus laissait
  // un plan swimrun sans aucune puissance aérobie maximale pendant 40 semaines. Le swimrun n'a
  // pas de vélo, mais il a l'eau : c'est le cross-training de `applyRunImpactCap` appliqué au
  // bon support. Départs serrés, récupération incomplète — la contrainte vient du temps de repos.
  "sw.vo2": { ref: "css", lo: 0.90, hi: 0.90, hr: null, fb: "très rapide, récup courte (RPE 9/10)" },
  // ---- R7 TRAIL : zones EN MONTÉE, exprimées en vitesse ascensionnelle (m D+/h) ----
  // Le multiplicateur s'applique à la VAM seuil, pas à une allure : monter à 90-100% de sa
  // VAM est une consigne exécutable, « 5'36/km en montée » ne l'est pas.
  "tr.vam": { ref: "vam", lo: 0.95, hi: 1.05, hr: null, fb: "RPE 9/10 — montée à fond, court" },
  "tr.asc": { ref: "vam", lo: 0.85, hi: 0.93, hr: "seuil", fb: "RPE 7-8/10 — seuil en montée, respiration ample mais contrôlée" },
  "tr.climb": { ref: "vam", lo: 0.70, hi: 0.82, hr: "tempo", fb: "RPE 6-7/10 — allure de course en montée, tenable longtemps" },
  "tr.hike": { ref: "vam", lo: 0.45, hi: 0.60, hr: "z2", fb: "marche rapide soutenue, poussée sur les cuisses" },
  "tr.easyup": { ref: "vam", lo: 0.35, hi: 0.50, hr: "z1", fb: "montée très souple, conversation possible" },
  // À plat sur sentier : l'allure reste pertinente (référence route)
  "tr.flat": { ref: "thrPace", lo: 1.16, hi: 1.26, hr: "z2", fb: "allure conversation" },
  "tr.flatthr": { ref: "thrPace", lo: 1.0, hi: 1.05, hr: "seuil", fb: "allure seuil ~1h, sur plat roulant" },
};

/** R7 TRAIL §7 — DESCENTE : jamais de cible chiffrée. Une consigne d'intensité en descente
 *  est activement nuisible — elle pousse à courir vite là où la casse musculaire et le
 *  risque de chute sont maximaux. La consigne est qualitative, et c'est un CHOIX. */
export const TRAIL_DOWN_CUE = "en contrôle : buste relâché, cadence haute, petits pas, regard 4-5m devant (jamais sur ses pieds)";

const fk = (s: number) => Math.floor(s / 60) + "'" + String(Math.round(s % 60)).padStart(2, "0");

/**
 * O-11 / R20.5 — `bk.rp` n'est plus une constante : c'est l'allure course de CETTE épreuve.
 * Un seul point de substitution, traversé par les trois lecteurs de zone (`fmtInt`, `fmtIntHr`,
 * `intOf`) : une substitution faite dans deux d'entre eux serait une troisième définition.
 */
function zoneOf(key: string | null | undefined, refs: Refs): ZoneDef | undefined {
  const d = key ? ZDEF[key] : undefined;
  if (d && key === "bk.rp" && refs.bikeRp) return { ...d, lo: refs.bikeRp.lo, hi: refs.bikeRp.hi };
  return d;
}

export function fmtInt(key: string | null | undefined, refs: Refs, hz: HrZones): string {
  const d = zoneOf(key, refs);
  if (!d) return key || "";
  // R7 TRAIL — en montée : vitesse ascensionnelle si connue, sinon FC, sinon RPE. JAMAIS d'allure.
  if (d.ref === "vam") {
    if (refs.vam) return Math.round((refs.vam * d.lo) / 10) * 10 + "-" + Math.round((refs.vam * d.hi) / 10) * 10 + " m/h de D+";
    if (d.hr && hz[d.hr]) return hz[d.hr];
    return d.fb;
  }
  if (d.ref === "ftp" && refs.ftp) return Math.round(refs.ftp * d.lo) + "-" + Math.round(refs.ftp * d.hi) + "W";
  if (d.ref === "thrPace" && refs.thrPace) return fk(refs.thrPace * d.lo) + "-" + fk(refs.thrPace * d.hi) + "/km";
  if (d.ref === "css" && refs.css) return (d.lo === d.hi ? fk(refs.css * d.lo) : fk(refs.css * d.lo) + "-" + fk(refs.css * d.hi)) + "/100m";
  if (d.hr && hz[d.hr]) return hz[d.hr];
  return d.fb;
}

/** Comme fmtInt, mais en préférant la FRÉQUENCE CARDIAQUE à l'allure : utilisé sur les
 *  blocs vallonnés (R7 §7), où une allure au sol moyenne ne décrit aucun effort réel. */
export function fmtIntHr(key: string | null | undefined, refs: Refs, hz: HrZones): string {
  const d = zoneOf(key, refs);
  if (!d) return key || "";
  if (d.hr && hz[d.hr]) return hz[d.hr];
  return fmtInt(key, refs, hz);
}

export const intOf = (key: string | null, refs?: Refs): { ref: string; lo: number; hi: number } | null => {
  const d = refs ? zoneOf(key, refs) : key ? ZDEF[key] : undefined;
  return d ? { ref: d.ref, lo: d.lo, hi: d.hi } : null;
};

/**
 * Minutes d'un step (nage : mètres via CSS de base ; km course/vélo via allure seuil).
 *
 * R5.6a — LA RÉCUPÉRATION APPARTIENT AU BLOC QUI LA PORTE. « 4×3min récup 2min30 », ce n'est
 * pas 12 minutes de séance : c'est 19,5 minutes pendant lesquelles l'athlète est là. L'auditeur
 * la comptait déjà (`sessionLoadFromSteps`), le générateur non — d'où l'« écart de métrique
 * récup » traîné depuis des mois, `U-DECL`, et une séance annoncée 30 min qui en durait 45
 * (+22 % en moyenne, jusqu'à +50 %, sur les 356 séances à récup chiffrée).
 *
 * La compter ICI, dans le bloc, plutôt qu'en surcouche au niveau de la séance, est ce qui rend
 * la correction sûre : le facteur d'échelle R3.3 agit sur les RÉPÉTITIONS, donc la récup suit
 * l'échelle au lieu d'être une constante que le lissage sous-corrige (c'était l'obstacle qui
 * avait fait échouer la première tentative — cf. R10_DEFECTS.md).
 *
 * R3-final — la durée vient de `recoveryMin`, un NOMBRE posé à la construction du step. Elle ne
 * se relit plus dans `recoveryText` : c'était le dernier endroit du moteur où de la prose servait
 * de donnée, et il coûtait 1 740 récupérations comptées 0 minute (35 % des séances de trail).
 */
export function stepMin(st: V1Step, disc: string, baseRefs: Refs): number {
  const reps = st.reps || 1;
  const rec = st.role === "body" && reps > 1 ? (reps - 1) * (st.recoveryMin || 0) : 0;
  if (st.durationMin) return reps * st.durationMin + rec;
  if (st.distanceM) {
    const d = st.d || disc;
    if (d === "sw") return ((reps * st.distanceM) / 100) * ((baseRefs.css || 130) / 60) + rec;
    return ((reps * st.distanceM) / 1000) * ((baseRefs.thrPace || 330) / 60) + rec;
  }
  return 0;
}

interface RenderableSession extends V1Session {
  plainBody?: boolean;
  runInj?: boolean;
  social?: boolean;
}


/**
 * Durée d'une récupération écrite en toutes lettres (« 2min30 trot », « 90s », « 3min »).
 * `null` quand elle n'est pas chiffrée (« récupération complète », « descente marchée ») : on
 * ne devine pas une durée qu'on n'a pas — 7 % des blocs sont dans ce cas, surtout en trail.
 */
export function recoveryMinutes(text?: string): number | null {
  if (!text) return null;
  let m = /(\d+)\s*min\s*(\d{1,2})\b/.exec(text);
  if (m) return +m[1] + +m[2] / 60;
  m = /(\d+)\s*min/.exec(text);
  if (m) return +m[1];
  m = /(\d+)\s*s\b/.exec(text);
  if (m) return +m[1] / 60;
  return null;
}

export function renderSess(s: RenderableSession, refs: Refs, hz: HrZones, baseRefs: Refs): string {
  const steps = s.steps || [];
  const bodies = steps.filter((x) => x.role === "body");
  let bodyMin = 0;
  let recTotal = 0;
  for (const b of bodies) {
    b._min = stepMin(b, s.d, baseRefs);
    // Les clamps C13/C13b se calculent sur le TRAVAIL, récup exclue — c'est la définition de
    // « échauffement ≤ corps », et c'est aussi ce que recalcule l'auditeur : les deux lectures
    // doivent produire le même nombre, sinon l'écart qu'on vient de fermer se rouvre ailleurs.
    const rec = (b.reps || 1) > 1 ? ((b.reps || 1) - 1) * (b.recoveryMin || 0) : 0;
    recTotal += rec;
    bodyMin += b._min - rec;
  }
  const seg: string[] = [];
  // Le rendu « brick » suppose un leg VÉLO et un leg COURSE (tri, duathlon). Un enchaînement
  // multi-disciplines d'une autre forme (swimrun : nage ↔ course, N fois) n'est PAS un brick —
  // la spec R10 le dit explicitement — et passe par le rendu générique de steps.
  const bkLegs = bodies.filter((b) => b.leg === "bike");
  const rnLeg = bodies.find((b) => b.leg === "run");
  if (s.brick && bkLegs.length && rnLeg) {
    const rn = rnLeg;
    // R20.5 — LE VÉLO DU BRICK PEUT ÊTRE EN DEUX BLOCS, ET LE TEXTE LES REND TOUS LES DEUX.
    //
    // Le rendu ne lisait que le PREMIER leg vélo et ajoutait, en dur, la phrase « dernier tiers
    // @ allure course » — sans chiffre. C'est très exactement le trou que R19.5 a fermé côté
    // structure : une intensité annoncée par une phrase et portée par aucun step. Le tiers
    // existe désormais RÉELLEMENT (bloc `bk.rp` à l'allure de l'épreuve) ; le texte l'affiche
    // avec sa puissance, et la phrase en dur disparaît. Là où le tiers n'a pas lieu d'être
    // (formats courts, voir le module tri), il n'est plus promis non plus.
    seg.push(
      bkLegs.map((b) => b.durationMin + "min vélo @ " + fmtInt(b.zone as string, refs, hz)
        + (b.suffix ? b.suffix : "")).join(", puis ")
        + ", échauffement progressif inclus, puis transition rapide + " + rn.durationMin + "min CAP" +
        (s.runInj ? " souple, surface souple" : " @ allure cible")
    );
  } else {
    const w = steps.find((x) => x.role === "warmup");
    if (w) {
      if (w.durationMin != null) {
        // F1 (audit v6) — le clamp C13 est ÉCRIT dans durationMin, pas seulement dans le
        // champ dérivé _min : l'écran affichait _min et planToJSON exportait durationMin,
        // soit deux séances différentes portant le même nom (36 divergences mesurées sur un
        // seul plan). Toute consommation future des steps (montre, Garmin, Zwift) héritait
        // du bug. Un seul champ fait foi : durationMin ; _min en est une pure dérivée.
        // Trois bornes, dans cet ordre de priorité :
        //   C13e — l'échauffement n'est JAMAIS plus long que le corps de séance. Invariant dur,
        //          sur les 6 sports : une séance dont l'échauffement pèse plus que le travail
        //          n'est pas une séance, c'est un footing avec une étiquette.
        //   C13   — ni plus de 25 min, ni plus de 80 % du corps quand celui-ci est confortable.
        //   C13c  — plancher de 10 min… qui CÈDE à C13e quand le corps est plus court. Le
        //          plancher est un objectif physiologique, pas une autorisation à déséquilibrer
        //          la séance ; c'est C13d qui doit alors restructurer la séance, pas le rendu
        //          qui doit gonfler l'échauffement.
        // « Corps » au sens de C13e = le TRAVAIL, récupération exclue. J'avais d'abord retenu le
        // corps tel qu'il est écrit (récup comprise) : un 4×2min récup 2min occupe 14 min, et
        // 10 min d'échauffement y paraissent proportionnés. Le banc d'invariants a tranché sur
        // 217 séances — un échauffement de 10 min devant 6 minutes de TRAVAIL déséquilibre la
        // séance, quel que soit le temps passé debout entre les répétitions. La récupération
        // n'est pas du stimulus : la règle se lit sur ce que la séance fait faire.
        // Le plafond est ARRONDI À LA MINUTE INFÉRIEURE : `bodyMin` est une somme de flottants
        // (17,1 − 9,1 = 8,000000000000002) et un échauffement de 8,000000000000002 min devant
        // 8 min de corps viole l'invariant pour une erreur de représentation. Les minutes d'une
        // séance sont entières par contrat (F3) ; le plafond l'est donc aussi.
        const wCap = Math.floor(Math.min(C13_WARMUP_MAX_MIN, bodyMin || w.durationMin, Math.max(C13c_WARMUP_MIN_MIN, Math.round(bodyMin * 0.8) || w.durationMin)) + 1e-6);
        const wm = Math.max(1, Math.min(C13c_WARMUP_MIN_MIN, wCap), Math.min(w.durationMin, wCap));
        w.durationMin = wm;
        w._min = wm;
        seg.push("Échauffement " + wm + "min" + (w.text ? " " + w.text : ""));
      } else if (w.distanceM != null) {
        // C13e en NAGE — même invariant, exprimé dans l'unité de la discipline : un échauffement
        // de 400 m devant 300 m de travail, c'est une séance qui s'échauffe plus qu'elle ne
        // travaille. Comparer les MÈTRES suffit à garantir l'invariant en minutes (même allure
        // de conversion, et la récupération ne compte que du côté du corps).
        const bodyM = bodies.reduce((t, b) => t + (b.distanceM ? (b.reps || 1) * b.distanceM : 0), 0);
        if (bodyM > 0 && w.distanceM > bodyM) w.distanceM = Math.max(25, Math.floor(bodyM / 25) * 25);
        w._min = stepMin(w, s.d, baseRefs);
        seg.push("Échauffement " + w.distanceM + "m" + (w.text ? " " + w.text : ""));
      }
    }
    for (const b of bodies) {
      let str = (b as { prefix?: string }).prefix || "";
      const reps = b.reps || 1;
      if (reps > 1) str += reps + "×";
      if (b.durationMin != null) str += b.durationMin + "min";
      else if (b.distanceM != null) str += ((b as { unitKm?: boolean }).unitKm ? b.distanceM / 1000 : b.distanceM) + ((b as { unitKm?: boolean }).unitKm ? "km" : "m");
      // R7 TRAIL §7 — LE VERROU : l'intensité rendue dépend de la PENTE du bloc.
      // Sans cette résolution, chaque séance de montagne réimprimait une allure au sol.
      if (b.gradient === "down") {
        // Descente : aucune cible chiffrée, jamais. Consigne de contrôle technique.
        if (b.dmoinsM) str += " de descente (−" + b.dmoinsM + "m)";
        str += " — " + TRAIL_DOWN_CUE;
      } else if (b.gradient === "up") {
        if (b.mode === "hike") str += " de marche rapide" + (b.poles ? " avec bâtons" : "");
        if (b.dplusM) str += " (+" + b.dplusM + "m D+)";
        if (b.zone) str += " @ " + fmtInt(b.zone as string, refs, hz);
      } else if (b.gradient === "rolling") {
        // Vallonné : la charge se dit en D+/D−, l'intensité en FC/ressenti — PAS en allure.
        // Sur un parcours qui alterne montées et descentes, une allure moyenne au sol ne
        // décrit aucun effort réel : c'est la fréquence cardiaque qui reste comparable.
        if (b.zone) str += " @ " + fmtIntHr(b.zone as string, refs, hz);
        const dd: string[] = [];
        if (b.dplusM) dd.push("D+ " + b.dplusM + "m");
        if (b.dmoinsM) dd.push("D− " + b.dmoinsM + "m");
        // U16 — LE POINT MÉDIAN NE SÉPARE QUE DES BLOCS. Ces deux compléments décrivent le
        // MÊME bloc que ce qui précède ; les coller avec le séparateur de blocs donnait au
        // symbole deux sens dans la même phrase, et l'UI qui déroule la séance en une ligne
        // par bloc découpait un bloc vallonné en trois. Même règle que R11.1 appliquée à un
        // caractère : un symbole, un sens.
        if (dd.length) str += ", " + dd.join(" / ") + " cible";
        if (b.mode === "run_hike") str += ", marche assumée dans les pentes raides";
      } else {
        if (b.zone) str += " @ " + fmtInt(b.zone as string, refs, hz);
        if (b.surface === "escalier") str += " en escaliers";
        else if (b.surface === "tapis") str += " sur tapis incliné";
      }
      str += (b as { suffix?: string }).suffix || "";
      // « entre les blocs » n'a de sens qu'entre DEUX blocs. La courbe de volume ramène
      // parfois un bloc à une seule répétition ; la mention de récupération, elle, restait —
      // « 1×5min (récup 3min entre les blocs) » décrit une pause qui n'existe pas. Même
      // famille que syncDerivedLabels : une prose dérivée d'un nombre se relit sur le nombre.
      if (b.recoveryText && (b.reps || 1) > 1) str += " (récup " + b.recoveryText + " entre les blocs)";
      seg.push(str);
    }
    const c = steps.find((x) => x.role === "cooldown");
    if (c) {
      if (c.durationMin != null) {
        // F2 (audit v6) — C13b : le retour au calme reste PROPORTIONNÉ au corps de séance.
        // Sur un petit budget, échauffement et retour fixes diluaient la qualité : 10min
        // utiles dans une séance de 30min (33% en zone cible). Le stimulus reste majoritaire.
        const cm = Math.min(c.durationMin, Math.max(3, Math.round(bodyMin * 0.5) || c.durationMin));
        c.durationMin = cm;
        c._min = cm;
        seg.push("Retour au calme " + cm + "min" + (c.text ? " " + c.text : ""));
      } else if (c.distanceM != null) {
        c._min = stepMin(c, s.d, baseRefs);
        seg.push("Retour au calme " + c.distanceM + "m" + (c.text ? " " + c.text : ""));
      }
    }
  }
  let det = seg.join(" · ");
  // R5.6a — LA DURÉE ANNONCÉE EST LA DURÉE PORTE-À-PORTE. `min` inclut désormais la
  // récupération entre répétitions, comptée dans le `_min` du bloc qui la porte (cf. stepMin).
  // Il n'y a plus d'écart à corriger après coup : le moteur, l'auditeur et le chronomètre de
  // l'athlète disent le même nombre. On précise seulement quelle PART de la séance est de la
  // récupération — « 45 min dont 8 de récup » et « 45 min pleines » ne se préparent pas pareil.
  if (recTotal >= 3) det += " · ⏱ dont ~" + Math.round(recTotal) + "min de récup entre les blocs";
  if (s.note) det += " — 💡 " + s.note;
  // F3 (audit v6) — minutes ENTIÈRES dès la source : les flottants (13.541666666666666) se
  // propageaient dans les totaux hebdo, le cap vol_max (422 vs 420 observé) et les
  // vérifications de progression. L'arrondi appartient au calcul, pas à l'affichage.
  s.min = Math.round(steps.reduce((t, x) => t + (x._min || 0), 0));
  s.det = det;
  return det;
}
