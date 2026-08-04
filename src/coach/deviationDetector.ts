/**
 * R21 §1 — DÉTECTEUR DE DÉVIATION POST-INGESTION.
 *
 * ================================================================================
 * CE QU'IL FAIT, ET CE QU'IL NE FAIT PAS
 * ================================================================================
 *
 * Il COMPARE ce qui a été fait à ce qui était prévu, et rend des signaux. Il ne
 * touche à aucun plan, n'écrit nulle part, ne notifie personne : c'est une
 * fonction pure, donc mesurable au cas par cas — la condition pour qu'un
 * déclencheur automatique soit défendable.
 *
 * **Pas de ML, pas de score composite.** Trois règles à seuil, chacune nommée,
 * chacune avec sa raison. Un score agrégé serait plus « intelligent » et
 * inauditable : on ne saurait jamais dire à l'athlète POURQUOI son plan a changé,
 * ce qui est précisément la promesse du produit.
 *
 * ================================================================================
 * LA SOURCE D'INGESTION N'EST PAS UN CRITÈRE
 * ================================================================================
 *
 * Le détecteur consomme `IngestedSession`, la forme commune que produisent le
 * parseur FIT, les parseurs GPX/TCX et l'import Strava. Filtrer sur la
 * provenance serait un défaut : un athlète connecté à Strava recevrait moins de
 * coaching qu'un athlète qui téléverse ses fichiers, pour une raison qui ne
 * regarde que notre plomberie.
 *
 * ================================================================================
 * LES TROIS RÈGLES
 * ================================================================================
 *
 * D1 · ALLURE / PUISSANCE — écart > 10 % à la cible de la séance.
 *      La cible n'est pas inventée : c'est la bande de la zone dominante du corps
 *      de séance, lue par `intOf()` — le MÊME point que celui qui écrit la
 *      consigne affichée à l'athlète (R11.1). L'écart se compte à partir du BORD
 *      de la bande, pas de son centre : une séance dans sa fourchette n'est pas
 *      une déviation, même à 9 % du milieu.
 *
 *      ⚠ Le SENS dépend de la référence : `thrPace` et `css` sont des SECONDES
 *      (plus petit = plus rapide = plus dur), `ftp` est en WATTS (plus grand =
 *      plus dur). Confondre les deux inverserait le diagnostic sur la moitié des
 *      sports — c'est la faute d'unité qu'O-13, O-25 et R20.5 ont déjà coûtée.
 *
 * D2 · SÉANCE MANQUÉE — une séance planifiée, non-repos, dont la date est passée
 *      de plus de 24 h et à laquelle rien ne correspond (ni ✓, ni import).
 *
 * D3 · CHARGE 7 JOURS — écart > 15 % entre le réalisé et le prévu sur la fenêtre
 *      glissante. Le calcul est celui de l'ajusteur (`loadWindow`), importé et
 *      non recopié : deux définitions de « charge des 7 derniers jours »
 *      finiraient par diverger.
 *
 * ================================================================================
 * POURQUOI LA DIRECTION EST PORTÉE PAR LE SIGNAL
 * ================================================================================
 *
 * `direction` distingue « au-dessus » de « en-dessous ». Ce n'est pas décoratif :
 * le déclencheur en aval s'en sert pour ne JAMAIS remonter la charge sur un
 * signal « en-dessous » (manifeste — « on ne rattrape jamais le volume manqué »).
 * Un signal qui ne porterait que sa magnitude absolue rendrait cette garantie
 * impossible à écrire.
 */
import type { V1Day, V1Plan, V1Session } from "../engine/types.ts";
import { intOf, type Refs } from "../generator/renderer.ts";
import { loadWindow, sessionIntensity } from "../readiness/dailyAdjuster.ts";
import type { CompletedSession } from "../readiness/readinessSource.ts";

// ---- SEUILS, avec leur provenance -------------------------------------------
/** D1 — écart d'intensité au-delà du BORD de la bande cible. Handoff R21 §1. */
export const SEUIL_INTENSITE = 0.10;
/** D3 — écart de charge cumulée sur 7 jours. Handoff R21 §1. */
export const SEUIL_CHARGE_7J = 0.15;
/** D2 — délai après lequel une séance sans correspondance est déclarée manquée. */
export const DELAI_MANQUEE_H = 24;
/** Fenêtre de la charge cumulée, en jours. Alignée sur celle de l'ajusteur. */
export const FENETRE_CHARGE_J = 7;

export type DeviationType = "allure" | "puissance" | "seance_manquee" | "charge_7j";

/**
 * Le contrat du handoff — `{ type, magnitude, session_id, timestamp }` — plus ce
 * que ce dépôt exige de toute décision : de quoi l'expliquer à un humain
 * (`what` / `why`, le format `{id, what, val, why}` des règles pédagogiques) et
 * de quoi la traiter sans la réinterpréter (`direction`).
 */
export interface DeviationSignal {
  type: DeviationType;
  /** Écart relatif, TOUJOURS positif. Le sens est dans `direction`. */
  magnitude: number;
  /** Clé de séance du dépôt : "semaine|jour|index" — la même que `answers.done`. */
  session_id: string;
  timestamp: string; // ISO
  direction: "au-dessus" | "en-dessous";
  date: string; // date de la séance concernée
  what: string; // le chiffre, lisible
  why: string; // une phrase, sans jargon
}

/**
 * La forme commune de toute séance INGÉRÉE, quelle que soit sa provenance.
 * `avgSpeedMs` et `avgPowerW` sont optionnels : une montre sans capteur de
 * puissance ne rend pas de watts, et c'est un cas normal, pas une erreur.
 */
export interface IngestedSession {
  date: string; // ISO
  d: CompletedSession["d"] | "autre";
  minutes: number;
  distanceM?: number;
  avgSpeedMs?: number;
  avgPowerW?: number;
  normPowerW?: number;
  source?: string;
}

export const sessionKey = (weekNum: number, jour: string, idx: number) => weekNum + "|" + jour + "|" + idx;

/** La zone dominante du CORPS de séance — celle qui porte l'intention. */
function targetZone(s: V1Session): string | null {
  const body = (s.steps || []).filter((st) => st.role === "body" && typeof st.zone === "string");
  if (!body.length) return null;
  // La zone la plus représentée en durée : sur « 20min Z2 + 4×4min VO2 », l'intention
  // est le VO2max, mais c'est le seul cas où la durée ne décide pas. On prend donc la
  // zone la PLUS DURE présente, cohérent avec `sessionIntensity` qui classe déjà ainsi.
  const ordre = ["easy", "rec", "flat", "easyup", "hike", "aero", "z2", "climb", "mara", "tempo", "frc", "rp", "ss", "asc", "css", "thr", "flatthr", "speed", "vam", "vo2"];
  let best: string | null = null, bestRank = -1;
  for (const st of body) {
    const z = st.zone as string;
    const suf = z.split(".")[1] || "";
    const r = ordre.indexOf(suf);
    if (r > bestRank) { bestRank = r; best = z; }
  }
  return best;
}

/**
 * L'écart d'une séance réalisée à sa bande cible, en relatif et signé.
 * `null` quand on ne sait pas comparer — et NE PAS SAVOIR N'EST PAS UN ÉCART :
 * une séance sans capteur, une zone sans référence chiffrée (descente en trail,
 * où le moteur refuse délibérément toute cible — R7 §7) ne produisent aucun
 * signal. Inventer un écart sur une donnée absente serait pire que se taire.
 */
export function ecartCible(s: V1Session, ing: IngestedSession, refs: Refs):
{ ecart: number; direction: "au-dessus" | "en-dessous"; type: "allure" | "puissance"; cible: string } | null {
  const z = targetZone(s);
  if (!z) return null;
  const band = intOf(z, refs);
  if (!band) return null;

  if (band.ref === "ftp") {
    const w = ing.normPowerW ?? ing.avgPowerW;
    if (!w || !refs.ftp) return null;
    const lo = refs.ftp * band.lo, hi = refs.ftp * band.hi;
    if (w > hi) return { ecart: (w - hi) / hi, direction: "au-dessus", type: "puissance", cible: Math.round(lo) + "-" + Math.round(hi) + " W" };
    if (w < lo) return { ecart: (lo - w) / lo, direction: "en-dessous", type: "puissance", cible: Math.round(lo) + "-" + Math.round(hi) + " W" };
    return { ecart: 0, direction: "au-dessus", type: "puissance", cible: Math.round(lo) + "-" + Math.round(hi) + " W" };
  }

  // thrPace (sec/km) et css (sec/100m) : des SECONDES. Plus PETIT = plus RAPIDE = plus DUR.
  const base = band.ref === "css" ? refs.css : refs.thrPace;
  if (!base || !ing.avgSpeedMs || ing.avgSpeedMs <= 0) return null;
  const realise = band.ref === "css" ? 100 / ing.avgSpeedMs : 1000 / ing.avgSpeedMs;
  const rapide = base * band.lo; // borne RAPIDE (secondes les plus basses)
  const lent = base * band.hi;   // borne LENTE
  const unite = band.ref === "css" ? "/100m" : "/km";
  const fk = (x: number) => Math.floor(x / 60) + "'" + String(Math.round(x % 60)).padStart(2, "0");
  const cible = fk(rapide) + "-" + fk(lent) + unite;
  if (realise < rapide) return { ecart: (rapide - realise) / rapide, direction: "au-dessus", type: "allure", cible };
  if (realise > lent) return { ecart: (realise - lent) / lent, direction: "en-dessous", type: "allure", cible };
  return { ecart: 0, direction: "au-dessus", type: "allure", cible };
}

/** Une séance ingérée correspond-elle à une séance planifiée ? Même jour, même discipline. */
function correspond(s: V1Session, ing: IngestedSession): boolean {
  if (s.d === "rs") return false;
  if (ing.d === "autre") return false;
  // Un brick (`br`) se réalise en vélo puis course : les deux disciplines lui correspondent.
  if (s.d === "br") return ing.d === "br" || ing.d === "bk" || ing.d === "rn";
  return s.d === ing.d;
}

export interface DetectInput {
  plan: V1Plan;
  refs: Refs;
  /** Séances ingérées (FIT / GPX / TCX / Strava), toutes provenances confondues. */
  ingested: IngestedSession[];
  /** Les ✓ de l'athlète : `answers.done`. Une séance cochée n'est jamais « manquée ». */
  done?: Record<string, boolean>;
  /** Charge réellement effectuée (contrat readiness) — pour D3. */
  completed?: CompletedSession[];
  /** Date du jour, ISO. La détection ne regarde JAMAIS l'avenir. */
  today: string;
}

const jourAvant = (iso: string, n: number) =>
  new Date(new Date(iso + "T00:00:00Z").getTime() - n * 864e5).toISOString().slice(0, 10);

export function detectDeviations(input: DetectInput): DeviationSignal[] {
  const { plan, refs, ingested, done = {}, completed, today } = input;
  const out: DeviationSignal[] = [];
  const timestamp = new Date().toISOString();

  // ---- D1 · allure / puissance ------------------------------------------------
  // On ne compare QUE les séances passées : une séance de demain n'a pas de réalisé.
  for (const w of plan.weeks)
    for (const d of w.days as (V1Day & { date?: string })[]) {
      if (!d.date || d.date > today) continue;
      d.sessions.forEach((s, si) => {
        const ing = ingested.find((x) => x.date === d.date && correspond(s, x));
        if (!ing) return;
        const e = ecartCible(s, ing, refs);
        if (!e || e.ecart <= SEUIL_INTENSITE) return;
        out.push({
          type: e.type,
          magnitude: Math.round(e.ecart * 1000) / 1000,
          session_id: sessionKey(w.num, d.jour, si),
          timestamp,
          direction: e.direction,
          date: d.date!,
          what: Math.round(e.ecart * 100) + " % " + e.direction + " de la cible (" + e.cible + ")",
          why: e.direction === "au-dessus"
            ? "« " + s.name + " » a été " + (e.type === "allure" ? "courue" : "roulée") + " plus fort que prévu : le gain est faible et la fatigue, elle, est bien réelle."
            : "« " + s.name + " » est restée sous sa cible : le stimulus visé n'a pas été atteint.",
        });
      });
    }

  // ---- D2 · séance manquée ----------------------------------------------------
  // « Passée de plus de 24 h » : la veille est encore rattrapable dans la journée,
  // et déclarer manquée une séance d'hier soir à 8 h du matin serait un reproche faux
  // (la forme du défaut U1, qu'on ne rejoue pas ici).
  const limite = jourAvant(today, DELAI_MANQUEE_H / 24);
  for (const w of plan.weeks)
    for (const d of w.days as (V1Day & { date?: string })[]) {
      if (!d.date || d.date >= limite) continue;
      d.sessions.forEach((s, si) => {
        if (s.d === "rs") return;
        const id = sessionKey(w.num, d.jour, si);
        if (done[id]) return;
        if (ingested.some((x) => x.date === d.date && correspond(s, x))) return;
        out.push({
          type: "seance_manquee",
          magnitude: Math.round(s.min || 0),
          session_id: id,
          timestamp,
          direction: "en-dessous",
          date: d.date!,
          what: "« " + s.name + " » (" + Math.round(s.min || 0) + " min) sans trace",
          why: "Rien n'a été enregistré ni coché pour cette séance plus de 24 h après. Ça arrive — la suite en tient compte, sans rattrapage.",
        });
      });
    }

  // ---- D3 · charge cumulée 7 jours -------------------------------------------
  const gap = loadWindow(plan, completed, today, FENETRE_CHARGE_J);
  if (gap.ratio !== null) {
    const ecart = Math.abs(gap.ratio - 1);
    if (ecart > SEUIL_CHARGE_7J) {
      const dessus = gap.ratio > 1;
      out.push({
        type: "charge_7j",
        magnitude: Math.round(ecart * 1000) / 1000,
        session_id: "7j|" + today,
        timestamp,
        direction: dessus ? "au-dessus" : "en-dessous",
        date: today,
        what: Math.round(gap.doneMin) + " min réalisées pour " + Math.round(gap.plannedMin) + " min prévues (" + Math.round(gap.ratio * 100) + " %)",
        why: dessus
          ? "Tu en as fait nettement plus que prévu sur 7 jours : c'est la fatigue accumulée qui décide de la suite, pas la motivation du moment."
          : "La semaine écoulée est plus légère que prévu. On repart de là où tu en es, sans chercher à rattraper.",
      });
    }
  }

  return out;
}

/** Le signal le plus significatif — celui qu'on montre. `null` si la liste est vide. */
export function signalMajeur(signals: DeviationSignal[]): DeviationSignal | null {
  if (!signals.length) return null;
  // Une SURCHARGE prime : c'est le seul cas où l'inaction coûte une blessure. Ensuite la
  // charge cumulée (elle décrit la semaine), puis le reste, du plus grand écart au plus petit.
  const rang = (s: DeviationSignal) =>
    s.direction === "au-dessus" ? 0 : s.type === "charge_7j" ? 1 : 2;
  return [...signals].sort((a, b) => rang(a) - rang(b) || b.magnitude - a.magnitude)[0];
}

export { sessionIntensity };
