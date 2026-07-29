/**
 * Rendu V2 — port fidèle de renderSess/stepMin/ZDEF de Coach_Pro_V1.5 (R3.1/R3.8/C13).
 * DERNIÈRE étape, lecture seule : fixe warmup/cooldown (échauffement ≤25min et ≤ corps),
 * n'expose le scaling que sur les steps body. Texte français identique au produit.
 */
import type { V1Session, V1Step } from "../engine/types.ts";
import { C13_WARMUP_MAX_MIN } from "../engine/constraintMatrix.ts";

export interface Refs {
  ftp: number;
  thrPace: number;
  css: number;
  /** R7 TRAIL — vitesse ascensionnelle seuil (m D+/h) : la référence d'intensité EN MONTÉE.
   *  L'allure au sol n'a aucun sens sur du vertical ; la VAM, oui. */
  vam?: number;
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

export function fmtInt(key: string | null | undefined, refs: Refs, hz: HrZones): string {
  const d = key ? ZDEF[key] : undefined;
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
  const d = key ? ZDEF[key] : undefined;
  if (!d) return key || "";
  if (d.hr && hz[d.hr]) return hz[d.hr];
  return fmtInt(key, refs, hz);
}

export const intOf = (key: string | null): { ref: string; lo: number; hi: number } | null => {
  const d = key ? ZDEF[key] : undefined;
  return d ? { ref: d.ref, lo: d.lo, hi: d.hi } : null;
};

/** Minutes d'un step (nage : mètres via CSS de base ; km course/vélo via allure seuil). */
export function stepMin(st: V1Step, disc: string, baseRefs: Refs): number {
  const reps = st.reps || 1;
  if (st.durationMin) return reps * st.durationMin;
  if (st.distanceM) {
    const d = st.d || disc;
    if (d === "sw") return ((reps * st.distanceM) / 100) * ((baseRefs.css || 130) / 60);
    return ((reps * st.distanceM) / 1000) * ((baseRefs.thrPace || 330) / 60);
  }
  return 0;
}

interface RenderableSession extends V1Session {
  plainBody?: boolean;
  runInj?: boolean;
  social?: boolean;
}

export function renderSess(s: RenderableSession, refs: Refs, hz: HrZones, baseRefs: Refs): string {
  const steps = s.steps || [];
  const bodies = steps.filter((x) => x.role === "body");
  let bodyMin = 0;
  for (const b of bodies) {
    b._min = stepMin(b, s.d, baseRefs);
    bodyMin += b._min;
  }
  const seg: string[] = [];
  if (s.brick) {
    const bk = bodies.find((b) => b.leg === "bike")!;
    const rn = bodies.find((b) => b.leg === "run")!;
    seg.push(
      bk.durationMin + "min vélo @ " + fmtInt(bk.zone as string, refs, hz) +
        ", dernier tiers @ allure course, échauffement progressif inclus, puis transition rapide + " + rn.durationMin + "min CAP" +
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
        const wm = Math.min(w.durationMin, C13_WARMUP_MAX_MIN, Math.max(3, Math.round(bodyMin * 0.8) || w.durationMin));
        w.durationMin = wm;
        w._min = wm;
        seg.push("Échauffement " + wm + "min" + (w.text ? " " + w.text : ""));
      } else if (w.distanceM != null) {
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
        if (dd.length) str += " · " + dd.join(" / ") + " cible";
        if (b.mode === "run_hike") str += " · marche assumée dans les pentes raides";
      } else {
        if (b.zone) str += " @ " + fmtInt(b.zone as string, refs, hz);
        if (b.surface === "escalier") str += " en escaliers";
        else if (b.surface === "tapis") str += " sur tapis incliné";
      }
      str += (b as { suffix?: string }).suffix || "";
      if (b.recoveryText) str += " (récup " + b.recoveryText + " entre les blocs)";
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
  if (s.note) det += " — 💡 " + s.note;
  // F3 (audit v6) — minutes ENTIÈRES dès la source : les flottants (13.541666666666666) se
  // propageaient dans les totaux hebdo, le cap vol_max (422 vs 420 observé) et les
  // vérifications de progression. L'arrondi appartient au calcul, pas à l'affichage.
  s.min = Math.round(steps.reduce((t, x) => t + (x._min || 0), 0));
  s.det = det;
  return det;
}
