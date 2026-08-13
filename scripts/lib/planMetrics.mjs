/**
 * MÉTRIQUES D'UN PLAN — source unique du lot `fix/moteur-physio`.
 *
 * Trois consommateurs les partagent : la capture de référence (`baseline.mjs`), le rapport de
 * diff exigé par le handoff pour chaque ticket du lot B, et le harnais de sensibilité
 * (`sensitivity.mjs`). Les écrire une seule fois n'est pas de l'élégance : l'audit du 13/08 a
 * mesuré ce que coûte un second classificateur d'intensité (trois copies divergentes, dont une
 * qui classe tout le trail en « facile »). On ne refait pas la faute dans l'outil qui sert à la
 * corriger.
 *
 * RÈGLE : aucune grandeur n'est recalculée ici si le moteur sait la produire.
 * `intensitySplit` vient de `loadModel.ts` — c'est LE classificateur du dashboard 80/20 et de
 * C26. Si un jour il change, ces métriques changent avec lui, ce qui est exactement voulu.
 */
import { intensitySplit } from "../../src/engine/loadModel.ts";

/** Une semaine « de charge » : ni décharge, ni affûtage. C'est la population que C26 borne. */
export const estCharge = (w) => !w.isRecup && (w.phase?.id ?? w.phaseId) !== "taper";

const minutesDe = (s) => (typeof s.min === "number" ? s.min : 0);
const estSeance = (s) => s && s.d !== "rs";

/** Minutes dures d'une séance, via le classificateur DU MOTEUR (jamais une seconde liste). */
function durMin(s) {
  try {
    return intensitySplit(s).hardMin || 0;
  } catch {
    return 0; // une séance sans steps exploitables ne pèse pas : `intensitySplit` le dit déjà
  }
}
function modMin(s) {
  try {
    return intensitySplit(s).modMin || 0;
  } catch {
    return 0;
  }
}

/**
 * Les grandeurs que le handoff demande de mesurer sur chaque diff :
 * volume hebdo pic · minutes dures/sem · durée sortie longue · temps prédit · nb séances.
 * Trois s'y ajoutent parce que les tickets du lot B les déplacent explicitement :
 * part de la sortie longue dans sa semaine (B-01), part de modéré (B-03), jours actifs (B-20).
 */
export function metrics(plan, sport, answers) {
  const weeks = plan?.weeks ?? [];
  const charge = weeks.filter(estCharge);

  let totalMin = 0, nbSeances = 0;
  let picMin = 0, picSemaine = null;
  let longueMax = 0, longuePartMax = 0;
  let durMaxSem = 0, durTotalCharge = 0, modTotalCharge = 0, minTotalCharge = 0;
  let joursActifsMoy = 0;

  for (const w of weeks) {
    let wMin = 0, wDur = 0, wMod = 0, wLongue = 0, wJours = 0;
    for (const d of w.days ?? []) {
      let jourAUneSeance = false;
      for (const s of d.sessions ?? []) {
        if (!estSeance(s)) continue;
        jourAUneSeance = true;
        nbSeances++;
        const m = minutesDe(s);
        wMin += m;
        wDur += durMin(s);
        wMod += modMin(s);
        if (s.long && m > wLongue) wLongue = m;
      }
      if (jourAUneSeance) wJours++;
    }
    totalMin += wMin;
    if (wMin > picMin) { picMin = wMin; picSemaine = w.num; }
    if (estCharge(w)) {
      durTotalCharge += wDur;
      modTotalCharge += wMod;
      minTotalCharge += wMin;
      joursActifsMoy += wJours;
      if (wDur > durMaxSem) durMaxSem = wDur;
      if (wLongue > longueMax) longueMax = wLongue;
      // Part de la sortie longue dans SA semaine — la grandeur que B-01 fait passer de 70% à 35%.
      if (wMin > 0 && wLongue / wMin > longuePartMax) longuePartMax = wLongue / wMin;
    }
  }

  const nC = Math.max(1, charge.length);
  return {
    semaines: weeks.length,
    semainesCharge: charge.length,
    nbSeances,
    totalH: r1(totalMin / 60),
    picH: r1(picMin / 60),
    picSemaine,
    volPeakDeclare: plan?.volPeak ?? null,
    durMoyParSemCharge: r1(durTotalCharge / nC),
    durMaxSemCharge: Math.round(durMaxSem),
    partDur: pct(durTotalCharge, minTotalCharge),
    partMod: pct(modTotalCharge, minTotalCharge),
    longueMaxMin: Math.round(longueMax),
    longuePartMax: pct(longuePartMax * 100, 100),
    joursActifsMoy: r1(joursActifsMoy / nC),
    tempsPredit: tempsPreditDe(plan, sport, answers),
  };
}

/**
 * Le chrono annoncé, quand il existe — c'est ce que l'athlète lit, donc ce qu'un diff doit voir.
 *
 * MA PREMIÈRE ÉCRITURE LISAIT `plan._v2.prediction.items` ET RENDAIT TOUJOURS `null` :
 * la prédiction n'est PAS dans le plan (`_v2` ne porte que decisions/warnings/repairs/score/
 * hardViolations/intensity), elle vient d'un appel SÉPARÉ `predict(sport, answers, plan)`.
 * La métrique était donc morte, et le test T-12 qui lisait le même chemin passait vert en
 * n'examinant aucun item — un test satisfait par sa propre panne. Trouvé en comptant ce que
 * l'instrument regarde au lieu de croire son verdict.
 */
function tempsPreditDe(plan, sport, answers) {
  if (!sport || !answers || !globalThis.EBV2?.predict) return null;
  try {
    const pr = globalThis.EBV2.predict(sport, answers, plan);
    const total = (pr?.items ?? []).find((i) => /Total estim|Temps estim/i.test(String(i?.leg ?? "")));
    return total?.value ?? null;
  } catch {
    return null;
  }
}

const r1 = (v) => Math.round(v * 10) / 10;
const pct = (num, den) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

/** Compare deux jeux de métriques et ne rend que ce qui a BOUGÉ (au-delà du bruit d'arrondi). */
export function delta(avant, apres) {
  const out = {};
  for (const k of Object.keys(apres)) {
    const a = avant?.[k], b = apres[k];
    if (a === b) continue;
    if (typeof a === "number" && typeof b === "number") {
      if (Math.abs(b - a) < 0.05) continue;
      out[k] = { avant: a, apres: b, ecart: r1(b - a), pct: a !== 0 ? r1(((b - a) / Math.abs(a)) * 100) : null };
    } else {
      out[k] = { avant: a ?? null, apres: b ?? null };
    }
  }
  return out;
}
