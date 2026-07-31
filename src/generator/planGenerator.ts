/**
 * Générateur V2 — pipeline complet : raisonnement → jours/séances → courbe de charge
 * (bands + C22) → scaling R3.3 borné (R3.4b/R3.11/R3.12) → garde C3 → affûtage R3.13
 * → rendu → V1Plan (forme validée par l'auditeur, inchangé).
 *
 * V2.1 — SONDE DE CAPACITÉ : avant de dérouler la courbe, le moteur mesure ce que les
 * plafonds de séance permettent réellement sur une semaine pic et abaisse la promesse
 * si besoin. « Le moteur se vérifie et se corrige » appliqué à ses propres promesses —
 * corrige l'écart V1.5 nage non-débutante (6.3h déclarées / 3.6h livrables).
 */
import type { AthleteProfile, ReasonedPlan, V1Plan, V1Session, V1Step, V1Week } from "../engine/types.ts";
import {
  BANDS, C15_BEGINNER_SWIM_SESSION_CAP_M, C21_REPRISE_BRICK_FACTOR, C22_MAX_WEEKLY_GROWTH,
  C22_AUDIT_HARD_JUMP, C23_BEGINNER_LONG_RUN_CAP_MIN, C24B_MIN_SWIM_SESSION_BEGINNER_M,
  BRICK_BIKE_BOUNDS, DOSE_CAP_MIN, CAP_BRICK_BIKE, CAP_BRICK_RUN, CAP_LONG, CAP_SWIM, R313_TAPER_MAX_VS_PEAK, RECUP_WEEK_FACTOR,
  C13d_QUALITY_MIN_BODY_MIN, C25_RECOVERY_SESSION_CAP_MIN, RACE_EVE_CAP_MIN,
} from "../engine/constraintMatrix.ts";
import { TrainingReasoningEngine } from "../engine/reasoningEngine.ts";
import { renderSess, type Refs } from "./renderer.ts";
import { sessionLoad, type AthleteRefs } from "../engine/loadModel.ts";
import { T2_DPLUS_GROWTH, T2_DMOINS_GROWTH, T3_ECCENTRIC_RECOVERY, TRAIL_ACCESS, syncReturnRecovery } from "../engine/trailModel.ts";
import { buildDays, type GenDay } from "./weekBuilder.ts";
import { buildSessions } from "./sessionLibrary.ts";
import { predictRace } from "../engine/predictor.ts";
import { guard, sportModule } from "../sports/registry.ts";
import { arbitrateVolRecent } from "../engine/measured.ts";
import { record as traceRecord, traceEnabled } from "../engine/trace.ts";
import { enforceMedicalHold } from "../engine/medicalHold.ts";

interface BoundedSession extends V1Session {
  social?: boolean;
}

/**
 * Une zone de QUALITÉ — source unique. Le prédicat vivait en local dans `scaleBlock` (V2.2 :
 * un bloc de qualité ne grandit pas tout seul) ; C13d en a besoin aussi, et deux copies d'une
 * définition, c'est deux définitions. `.mara` = allure de COURSE : 15×2000m au marathon, ce
 * n'est pas du volume facile.
 */
const QUALITY_SUFFIX = /\.(vo2|thr|css|rp|ss|frc|speed|mara)$/;
const QUALITY_TRAIL = ["tr.vam", "tr.asc", "tr.climb", "tr.flatthr"];
export const IS_QUALITY_ZONE = (zone: string): boolean =>
  QUALITY_SUFFIX.test(zone) || QUALITY_TRAIL.includes(zone);

/**
 * R4.8a (audit v7) — CONTRAT V1Plan : `min` est un NOMBRE sur toute séance, repos compris.
 * Il manquait sur les séances créées par les passes tardives (« OFF (affûtage) », y compris
 * celles de la boucle de réparation) : rattrapé partout par `s.min || 0` côté lecture, mais un
 * contrat qui ne tient que par les rattrapages de ses consommateurs n'est pas un contrat — le
 * prochain consommateur oubliera. Exporté pour que la boucle de réparation l'applique aussi.
 */
/**
 * R5.3 (audit v7 bis) — RÉCONCILIATION DE LA COURBE ANNONCÉE ET DU PRESCRIT.
 *
 * Appelée EN DERNIER (comme `syncDerivedLabels`, même leçon R5.1) : les passes de réparation
 * modifient encore les durées après la génération, et un chiffre dérivé qu'on fige trop tôt
 * ment dès la première réparation.
 */
export function reconcileDeclaredVolume(
  plan: V1Plan, warnings: string[],
  /** Rendu : nécessaire pour que le texte d'une séance RÉDUITE ne mente pas sur sa durée. */
  render?: (s: V1Session) => void,
  /** Contexte des règles de SÉANCE tenues ici : la fenêtre piscine dépend du niveau.
   *  `keepTaperSwim` (R13.3) : le sport déclare que l'affûtage garde une nage par semaine —
   *  les coupes de fréquence l'évitent tant qu'une autre victime existe. */
  ctx?: { swimFloors?: boolean; beginner?: boolean; medHold?: boolean; keepTaperSwim?: boolean; mainDiscipline?: string; disciplines?: string[] },
): void {
  // 3a — LE FILET DU DRAPEAU MÉDICAL, en tout premier et en tout dernier ressort. La PORTE est
  // dans les builders (`medicalZone`) ; ce filet rattrape ce qui a été écrit hors d'elle — une
  // passe tardive, un module futur, une séance construite à la main. Il est ici pour que le
  // prochain producteur de séances n'ait pas besoin de connaître la règle pour la respecter.
  enforceMedicalHold(plan, !!ctx?.medHold);
  // R5.3 (audit v7 bis) — AUCUNE SEMAINE HORS DU CHAMP DES DEUX RÈGLES. La bande [0.5–1.4] est
  // évaluée sur les semaines de charge (`!isRecup && phase !== taper`) ; l'affûtage a sa propre
  // règle, mais elle porte sur la réduction vs le PIC, pas sur l'écart à sa propre courbe.
  // Une semaine pouvait donc être à 45 % du pic (règle d'affûtage satisfaite) tout en
  // prescrivant 71 % de plus que ce que la courbe annonce à l'athlète — mesuré : ratio 1,71 en
  // trail, 2,02 en swimrun, et toujours sur la DERNIÈRE semaine.
  //
  // En affûtage, les planchers de séance (une séance digne ne descend pas sous 30 min)
  // empêchent structurellement d'atteindre une courbe très basse. On ne casse donc pas les
  // séances : on aligne le CHIFFRE ANNONCÉ sur ce qui est réellement prescrit — c'est le même
  // principe que la sonde de capacité (la promesse suit ce que les plafonds permettent).
  // La règle de sécurité R3.13 (affûtage ≤ 60 % du pic) continue, elle, de gouverner le fond.
  //
  // Le même écart existe hors affûtage, sur les enveloppes très basses : un plafond
  // hebdomadaire de 4 h face à un objectif long donnait une courbe à 0,6 h et une semaine
  // prescrite à 1,2 h — composée de quatre séances de 3 MINUTES et d'une sortie longue au
  // plancher. Deux fautes en une, traitées dans l'ordre du manifeste :
  //   1. la FRÉQUENCE cède avant la TAILLE — une séance sous le quart d'heure ne vaut pas le
  //      déplacement, son jour redevient du repos (principe déjà appliqué à la nage) ;
  //   2. si la structure minimale dépasse encore l'enveloppe déclarée, le chiffre annoncé
  //      s'aligne sur le prescrit ET un AVERTISSEMENT le dit, avec les deux remèdes. Le
  //      silence était le défaut : un athlète ne peut pas arbitrer ce qu'on ne lui dit pas.
  const MIN_WORTH_MIN = 15;
  const dayMin = (d: V1Day) => d.sessions.reduce((u, sx) => u + (sx.min || 0), 0);
  const weekMinOf = (wk: V1Week) => wk.days.reduce((t, d) => t + dayMin(d), 0);
  const weekH = (wk: V1Week) => Math.round((weekMinOf(wk) / 60) * 10) / 10;

  // C25 / I11 / I14 — LES GARANTIES DE SÉANCE PRÉCÈDENT LES GARANTIES DE SEMAINE.
  // (Définition et justification plus bas, à `enforceLabelVsDose`.) Elle RÉDUIT des séances :
  // la laisser tourner après « dev ≤ pic » abaissait des semaines de pic déjà validées et
  // rouvrait l'inversion de périodisation sur 4 combinaisons de trail. Une semaine ne peut pas
  // être vérifiée sur un contenu qui va encore changer.
  enforceLabelVsDose();

  // T2 / T2b — LA PROGRESSION VERTICALE SE RE-VÉRIFIE APRÈS TOUTE COUPE DE SÉANCE.
  //
  // « Une contrainte de croissance se viole en montant, jamais en descendant » : c'est faux dès
  // qu'on regarde DEUX semaines. Réduire la semaine N n'abîme pas la semaine N, elle creuse
  // l'écart avec N+1 — le banc trail l'a dit tout de suite (S5 D− +22 %, S10 +17 %, S15 +34 %)
  // après que le plafond de libellé eut retiré des répétitions de descente. La courbe verticale
  // vit dans `generatePlan`, donc AVANT cette coupe : elle ne vérifiait, une fois de plus, que
  // l'avant-dernier état.
  //
  // On re-clampe ici avec le levier de l'axe vertical lui-même — les MÈTRES, jamais les minutes.
  // Deux passes, comme la courbe d'origine : baisser N+1 change le plafond de N+2.
  {
    const stepsOfWeek = (wk: V1Week) => wk.days.flatMap((d) => d.sessions).flatMap((sx) => sx.steps || []);
    const upOf = (wk: V1Week) => stepsOfWeek(wk).reduce((t, st) => t + (st.dplusM || 0) * (st.reps || 1), 0);
    const downOf = (wk: V1Week) => stepsOfWeek(wk).reduce((t, st) => t + (st.dmoinsM || 0) * (st.reps || 1), 0);
    for (let pass = 0; pass < 2; pass++) {
      let prevUp = 0, prevDown = 0;
      for (const wk of plan.weeks) {
        const charge = !wk.isRecup && wk.phase.id !== "taper";
        const cu = upOf(wk), cd = downOf(wk);
        if (charge && (cu > 0 || cd > 0)) {
          const fUp = prevUp > 0 && cu > prevUp * T2_DPLUS_GROWTH ? (prevUp * T2_DPLUS_GROWTH) / cu : 1;
          const fDown = prevDown > 0 && cd > prevDown * T2_DMOINS_GROWTH ? (prevDown * T2_DMOINS_GROWTH) / cd : 1;
          if (fUp < 1 || fDown < 1) {
            for (const st of stepsOfWeek(wk)) {
              if (st.dplusM && fUp < 1) st.dplusM = Math.max(20, Math.round((st.dplusM * fUp) / 10) * 10);
              if (st.dmoinsM && fDown < 1) st.dmoinsM = Math.max(20, Math.round((st.dmoinsM * fDown) / 10) * 10);
              if (st.gradient !== "down" && st.dmoinsM && (st.dplusM || 0) > 0 && st.dmoinsM > st.dplusM) st.dmoinsM = st.dplusM;
            }
            // La récupération d'une répétition en pente se DÉDUIT du dénivelé (T19) : elle suit.
            for (const d of wk.days) for (const sx of d.sessions) {
              if (!sx.steps || !sx.steps.length) continue;
              syncReturnRecovery(sx.steps);
              if (render) render(sx);
            }
            if (traceEnabled()) traceRecord({ pass: "T2b-après-coupe", weekNum: wk.num, field: "distance", before: Math.round(cd), after: Math.round(downOf(wk)), reason: "T2/T2b re-vérifiées au point de convergence" });
          }
        }
        if (charge) { prevUp = upOf(wk); prevDown = downOf(wk); }
      }
    }
  }

  // C22 — GARANTIE FINALE DE PROGRESSION (D3, banc v6). La borne « +10 % d'une semaine de
  // charge à la suivante » existait DANS la boucle de volume, mais des passes ultérieures
  // (montée du pic, remontée aux planchers, harmonisation) pouvaient regonfler une semaine
  // après coup : 4 sauts subsistaient, jusqu'à +18 %. Même leçon que R5.1 et R5.3 — une règle
  // de sécurité se vérifie EN DERNIER, sinon elle ne vérifie que l'avant-dernier état.
  //
  // On réduit les corps de séance, jamais leur nombre de SÉANCES, et jamais sous la borne basse
  // déclarée par le bloc (`bnd.floor`) : un plancher est une règle, pas une marge. Les
  // RÉPÉTITIONS, elles, cèdent avant la taille — comme partout ailleurs dans ce moteur. Sans
  // cela, la garantie était inopérante sur le trail, où les blocs de côtes ont des bornes
  // serrées (`floor = 0,9 × durée`) et où tout le volume vit dans le nombre de répétitions :
  // la passe tournait, ne pouvait rien réduire, et laissait passer des sauts de +25 % une fois
  // la charge mesurée honnêtement (R3-final).
  //
  // ANX-C22 (R13) — ET ELLE SE RÉPÈTE JUSQU'AU POINT FIXE, EN TOUT DERNIER. Un seul passage ne
  // suffit pas : les passes POSTÉRIEURES de ce même point de convergence (remontée du plancher
  // piscine, regonflement de la semaine de course, planchers de séance) regonflaient encore —
  // mesuré : S22→S23 +12 % sur le Full de référence, malgré la « garantie finale ». Même leçon
  // que R5.1/R5.3, un cran plus loin : la fonction est rappelée en fin de réconciliation,
  // itérée ≤ 3 fois (réduire N décale le plafond de N+1 — le point fixe se gagne, il ne se
  // décrète pas).
  const enforceC22Final = (): boolean => {
    let touchedAny = false;
    let prevCharge = 0;
    for (const wk of plan.weeks) {
      if (wk.isRecup || wk.phase.id === "taper") continue;
      const cur = weekMinOf(wk);
      // ANX-C22 — la cible vise 3 min SOUS le plafond, pas le plafond : les durées sont des
      // minutes ENTIÈRES et les distances des multiples de 25 m — une réduction de 0,5 min
      // s'arrondit à zéro, la boucle cassait (« rien à prendre ») et le saut restait à +10,6 %
      // pour un plafond à +10,5. Le quantum d'arrondi a besoin de marge pour exister.
      if (prevCharge > 0 && cur > prevCharge * C22_MAX_WEEKLY_GROWTH + 1) {
        touchedAny = true;
        for (let g = 0; g < 4 && weekMinOf(wk) > prevCharge * C22_MAX_WEEKLY_GROWTH + 1; g++) {
          const before = weekMinOf(wk);
          const f = Math.max(0, prevCharge * C22_MAX_WEEKLY_GROWTH - 3) / before;
          for (const d of wk.days) for (const sx of d.sessions) {
            if (sx.d === "rs" || !sx.steps) continue;
            let touched = false;
            for (const st of sx.steps) {
              if (st.role !== "body" || st.leg) continue; // les legs de brick ont leurs bornes de format
              const floor = (st as { bnd?: { floor?: number } }).bnd?.floor;
              if ((st.reps || 1) > 1) {
                const next = Math.max(1, Math.round((st.reps || 1) * f));
                if (next < (st.reps || 1)) { st.reps = next; touched = true; }
              } else if (st.durationMin) {
                const next = Math.max(floor ?? 5, Math.round(st.durationMin * f));
                if (next < st.durationMin) { st.durationMin = next; touched = true; }
              }
            }
            if (touched && render) render(sx);
            if (touched && traceEnabled()) traceRecord({ pass: "C22-final", weekNum: wk.num, sessionName: sx.name, discipline: sx.d, field: "minutes", before: Math.round(before), after: Math.round(weekMinOf(wk)), reason: "C22 (progression ≤ +10 %)", envelope: Math.round(prevCharge) + "→" + Math.round(weekMinOf(wk)) + "min" });
          }
          if (before - weekMinOf(wk) < 0.5) break; // les planchers bloquent : rien de plus à prendre
        }
      }
      prevCharge = weekMinOf(wk);
    }
    return touchedAny;
  };
  enforceC22Final();

  // A2 / I1 — LA PÉRIODISATION NE S'INVERSE PAS : aucune semaine hors pic ne dépasse la
  // meilleure semaine de pic. Une phase de développement plus lourde que la phase de pic n'est
  // pas un arbitrage, c'est une inversion — et elle n'apparaissait qu'en trail, sur les semaines
  // à séances de côte : celles qui viennent justement de récupérer leurs vraies minutes de
  // descente marchée (R3-final). La règle existait dans la boucle avec 2 % de tolérance ; elle
  // devient une garantie FINALE et stricte, sixième du même point de convergence.
  {
    const wm = (wk: V1Week) => weekMinOf(wk);
    const peakNR = plan.weeks.filter((wk) => wk.phase.id === "peak" && !wk.isRecup).map(wm);
    const peakAny = plan.weeks.filter((wk) => wk.phase.id === "peak").map(wm);
    const peakBest = Math.max(0, ...(peakNR.length ? peakNR : peakAny));
    if (peakBest > 0) for (const wk of plan.weeks) {
      if (wk.phase.id === "peak" || wk.phase.id === "taper" || wk.isRecup) continue;
      for (let g = 0; g < 5 && wm(wk) > peakBest; g++) {
        const before = wm(wk);
        const f = (peakBest - 1) / before;
        for (const d of wk.days) for (const sx of d.sessions) {
          if (sx.d === "rs" || sx.race || !sx.steps) continue;
          let touched = false;
          for (const st of sx.steps) {
            if (st.role !== "body") continue;
            // Cette garantie ARRIVE APRÈS les passes qui tiennent, elles, les planchers de nage
            // (C24/C24b), la progression verticale du trail (T2/T2b) et les bornes de format du
            // brick (C21/C21b). Elle ne touche donc ni les blocs en mètres, ni les blocs en
            // pente, ni les legs d'enchaînement : réduire là casserait un invariant pour en
            // sauver un autre, et c'est exactement ce qu'on cherche à ne plus faire.
            // La trace a montré que le leg VÉLO d'un brick tombait ici à 5 min — sous la borne
            // basse du format, qui n'est pas portée par `bnd` mais par `blockBounds`.
            if (st.distanceM != null || st.gradient || st.leg) continue;
            const floor = (st as { bnd?: { floor?: number } }).bnd?.floor;
            if ((st.reps || 1) > 1) {
              const next = Math.max(1, Math.round((st.reps || 1) * f));
              if (next < (st.reps || 1)) { st.reps = next; touched = true; }
            } else if (st.durationMin) {
              const next = Math.max(floor ?? 5, Math.round(st.durationMin * f));
              if (next < st.durationMin) { st.durationMin = next; touched = true; }
            }
          }
          if (touched && render) render(sx);
          if (touched && traceEnabled()) traceRecord({ pass: "dev≤peak", weekNum: wk.num, sessionName: sx.name, discipline: sx.d, field: "minutes", before: Math.round(before), after: Math.round(wm(wk)), reason: "A2/I1", envelope: "pic " + Math.round(peakBest) + "min" });
        }
        if (before - wm(wk) < 0.5) break;
      }
      // Les blocs en pente sont hors d'atteinte de la réduction (leur charge verticale a ses
      // propres passes) : sur un plan de trail, la garantie peut donc ne rien pouvoir réduire.
      // La FRÉQUENCE prend alors le relais, comme partout ailleurs — la plus petite séance non
      // longue cède. Jamais la sortie longue : c'est le pivot de la semaine.
      for (let g = 0; g < 3 && wm(wk) > peakBest; g++) {
        const cand = wk.days.filter((d) => d.sessions.some((sx) => sx.d !== "rs" && !sx.long && !sx.race && !sx.brick));
        if (cand.length <= 2) break;
        const dayMinOf = (d: V1Day) => d.sessions.reduce((t, sx) => t + (sx.min || 0), 0);
        const victim = cand.reduce((x, y) => (dayMinOf(y) < dayMinOf(x) ? y : x));
        victim.charge = "off";
        victim.slot = "off";
        victim.sessions = [{ d: "rs", name: "OFF (la semaine de pic reste la plus grosse)", det: "repos — une phase de développement ne dépasse pas la phase de pic : c'est la périodisation, pas un réglage", steps: [], min: 0 }];
      }
    }
  }

  // D4 (banc v6) — UNE SEMAINE DE RÉCUP N'EST JAMAIS PLUS LOURDE QUE CELLE QU'ELLE ASSIMILE.
  //
  // Troisième application de la même leçon (R5.1, R5.3, C22 ci-dessus) : la règle vivait dans
  // le CALCUL DE LA CIBLE (`targetH = min(targetH, semaine précédente × 0.95)`), donc elle ne
  // gouvernait que l'avant-dernier état. Quand les planchers de séance saturent la semaine —
  // deux semaines de récup consécutives issues d'un cycle de 10 jours, chacune réduite à ses
  // deux séances minimales — la cible n'a plus prise, et la composition (une longue + une
  // récup d'un côté, une récup + une séance de seuil de l'autre) décide seule. Mesuré :
  // 33 min puis 36 min, soit une « récupération » qui remonte.
  //
  // Deux leviers, dans l'ordre du manifeste : réduire d'abord (les répétitions cèdent avant la
  // taille — un 3×100 devient un 2×100, pas un 3×75), retirer ensuite. Retirer une séance
  // d'une semaine de RÉCUP va toujours dans le sens de la sécurité : c'est ce que la semaine
  // est censée faire.
  {
    const swimMetersOf = (sx: V1Session) =>
      (sx.steps || []).reduce((t, st) => t + (st.distanceM && (st.d || sx.d) === "sw" ? (st.reps || 1) * st.distanceM : 0), 0);
    let lastCharge = 0;
    for (let i = 0; i < plan.weeks.length; i++) {
      const wk = plan.weeks[i];
      // La référence est la dernière semaine de CHARGE — celle que la récupération assimile.
      // Comparer deux récups consécutives (dérive du cycle de 10 jours) n'a pas de sens
      // physiologique et entre en collision avec les planchers de séance ; la spec interne
      // (`coherenceScorer`) l'excluait déjà explicitement, le générateur s'aligne dessus.
      if (!wk.isRecup) { if (wk.phase.id !== "taper") lastCharge = weekMinOf(wk); continue; }
      const prev = lastCharge;
      // Tolérance ZÉRO, comme la règle auditée : « jamais plus lourde » se compare strictement.
      // La minute de marge tolérée ici laissait passer exactement le cas mesuré (287 vs 286) —
      // un garde-fou qui s'accorde une marge ne garantit pas ce qu'il annonce.
      // STRICTEMENT inférieure : une semaine de décharge qui égale la semaine de charge ne
      // décharge pas. L'égalité (417 = 417) passait, et c'est bien le cas qu'on cherche à éviter.
      if (prev <= 0 || weekMinOf(wk) < prev) continue;
      const f = (prev - 1) / weekMinOf(wk);
      for (const d of wk.days) for (const sx of d.sessions) {
        if (sx.d === "rs" || !sx.steps) continue;
        // C24/C15 — le plancher de SÉANCE piscine (750 m) est une règle, pas une marge : on ne
        // réduit pas une séance de nage en dessous. Si elle ne peut plus maigrir, elle sautera.
        const swBefore = swimMetersOf(sx);
        const before = sx.steps.map((st) => ({ st, reps: st.reps, durationMin: st.durationMin, distanceM: st.distanceM }));
        let touched = false;
        for (const st of sx.steps) {
          if (st.role !== "body") continue;
          const floor = (st as { bnd?: { floor?: number } }).bnd?.floor;
          if ((st.reps || 1) > 1) {
            const next = Math.max(1, Math.round((st.reps || 1) * f));
            if (next < (st.reps || 1)) { st.reps = next; touched = true; }
          } else if (st.durationMin) {
            const next = Math.max(floor ?? 5, Math.round(st.durationMin * f));
            if (next < st.durationMin) { st.durationMin = next; touched = true; }
          } else if (st.distanceM) {
            const next = Math.max(floor ?? 100, Math.round((st.distanceM * f) / 25) * 25);
            if (next < st.distanceM) { st.distanceM = next; touched = true; }
          }
        }
        if (!touched) continue;
        if (swBefore > 0 && swimMetersOf(sx) < 750 && !(wk.isRecup || wk.phase.id === "taper")) {
          // La réduction casserait le plancher : on la DÉFAIT intégralement et on laisse la
          // coupe ci-dessous faire le travail. Réduire à moitié serait le pire des deux.
          for (const b of before) { b.st.reps = b.reps; b.st.durationMin = b.durationMin; b.st.distanceM = b.distanceM; }
          continue;
        }
        if (render) render(sx);
        if (traceEnabled()) traceRecord({ pass: "D4-récup", weekNum: wk.num, sessionName: sx.name, discipline: sx.d, field: "minutes", after: Math.round(weekMinOf(wk)), reason: "D4 (récup < dernière charge)", envelope: "charge " + Math.round(prev) + "min" });
      }
      for (let g = 0; g < 4 && weekMinOf(wk) >= prev; g++) {
        const active = wk.days.filter((d) => d.sessions.some((s) => s.d !== "rs") && !d.sessions.some((s) => s.race));
        if (active.length <= 1) break; // une semaine de récup garde au moins un contact avec le sport
        const victim = active.reduce((x, y) => (dayMin(y) < dayMin(x) ? y : x));
        victim.charge = "off";
        victim.slot = "off";
        victim.sessions = [{ d: "rs", name: "OFF (semaine de récupération)", det: "repos — une semaine de récup ne pèse jamais plus que la semaine qu'elle est là pour assimiler", steps: [], min: 0 }];
      }
    }
  }

  // R3.13 — GARANTIE FINALE : L'AFFÛTAGE PÈSE ≤60 % DU PIC LIVRÉ.
  //
  // Cinquième règle rapatriée ici, et pour la même raison que les quatre autres : elle était
  // tenue par des coupes réparties dans la boucle, qui s'arrêtent toutes aux PLANCHERS de
  // séance. Sur un plan saturé (swimrun « experience », historique reprise : toutes les
  // semaines au plancher, pic = base), il ne reste en affûtage qu'une sortie longue de 62 min
  // qu'aucune coupe n'a le droit de toucher — 71 % du pic au lieu de 60.
  //
  // Le point aveugle était de traiter le plancher de séance comme intouchable EN AFFÛTAGE.
  // Un plancher dit « en dessous, la séance ne vaut pas le déplacement » — c'est une règle de
  // semaine de CHARGE. L'affûtage, lui, a pour objet même de raccourcir : une sortie longue
  // d'affûtage EST une sortie longue réduite. On réduit donc les corps sans se laisser arrêter
  // par `bnd.floor`, jusqu'à un plancher d'affûtage explicite, et la fréquence ne cède qu'après.
  {
    const TAPER_BODY_FLOOR_MIN = 10;
    const peakNR = plan.weeks.filter((w) => w.phase.id === "peak" && !w.isRecup).map(weekMinOf);
    const peakAny = plan.weeks.filter((w) => w.phase.id === "peak").map(weekMinOf);
    const peakBest = Math.max(0, ...(peakNR.length ? peakNR : peakAny));
    const cap = peakBest * R313_TAPER_MAX_VS_PEAK;
    if (peakBest > 0) for (const wk of plan.weeks) {
      if (wk.phase.id !== "taper") continue;
      for (let g = 0; g < 6 && weekMinOf(wk) > cap; g++) {
        const before = weekMinOf(wk);
        const f = cap / before;
        for (const d of wk.days) for (const sx of d.sessions) {
          if (sx.d === "rs" || sx.race || !sx.steps) continue;
          let touched = false;
          for (const st of sx.steps) {
            if (st.role !== "body") continue;
            if (st.durationMin) {
              const next = Math.max(TAPER_BODY_FLOOR_MIN, Math.round(st.durationMin * f));
              if (next < st.durationMin) { st.durationMin = next; touched = true; }
            } else if (st.distanceM) {
              const next = Math.max(200, Math.round((st.distanceM * f) / 25) * 25);
              if (next < st.distanceM) { st.distanceM = next; touched = true; }
            }
          }
          if (touched && render) render(sx);
          if (touched && traceEnabled()) traceRecord({ pass: "R3.13-affûtage", weekNum: wk.num, sessionName: sx.name, discipline: sx.d, field: "minutes", before: Math.round(before), after: Math.round(weekMinOf(wk)), reason: "R3.13 (affûtage ≤ 60 % du pic)", envelope: "cap " + Math.round(cap) + "min" });
        }
        if (before - weekMinOf(wk) < 0.5) break; // plus rien à réduire : la fréquence prend le relais
      }
      for (let g = 0; g < 4 && weekMinOf(wk) > cap; g++) {
        const active = wk.days.filter((d) => d.sessions.some((s) => s.d !== "rs") && !d.sessions.some((s) => s.race));
        if (active.length <= 1) break;
        // R13.3 — la nage d'affûtage (souvent la séance la plus courte, donc la victime
        // désignée de toutes les coupes) est ÉVITÉE tant qu'une autre victime existe : les
        // sensations d'eau se perdent en 10-14 jours et la course commence dans l'eau.
        // Orienter, jamais interdire : si c'est la seule coupe possible, elle a lieu (R3.13
        // est une règle de sécurité, la couverture une règle de complétude).
        const soleSwim = (d: V1Day) => d.sessions.some((s) => s.d === "sw")
          && !wk.days.some((o) => o !== d && o.sessions.some((s) => s.d === "sw"));
        let spared = ctx?.keepTaperSwim ? active.filter((d) => !soleSwim(d)) : active;
        // R13 — même orientation que toutes les autres coupes : le seul jour qui porte la
        // DISCIPLINE PRINCIPALE est épargné tant qu'une autre victime existe. Sans ça, la 2e
        // semaine d'affûtage d'un duathlon sortait 100 % vélo (D-DISC, banc v7) — un duathlon
        // commence et finit à pied.
        for (const md of (ctx?.disciplines || (ctx?.mainDiscipline ? [ctx.mainDiscipline] : []))) {
          const covers = (d: V1Day) => d.sessions.some((s) => s.d === md || (s.d === "br" && (s.steps || []).some((b) => b.leg === (md === "rn" ? "run" : "bike"))));
          const sole = (d: V1Day) => covers(d) && !wk.days.some((o) => o !== d && covers(o));
          const spared2 = spared.filter((d) => !sole(d));
          if (spared2.length) spared = spared2;
        }
        const cand = spared.length ? spared : active;
        const victim = cand.reduce((x, y) => (dayMin(y) < dayMin(x) ? y : x));
        victim.charge = "off";
        victim.slot = "off";
        victim.sessions = [{ d: "rs", name: "OFF (affûtage)", det: "repos — la dernière semaine pèse au plus 60 % du pic : c'est ce qui te met frais sur la ligne", steps: [], min: 0 }];
      }
    }
  }

  // R13.6 — LA SEMAINE DE COURSE A UN PLANCHER : 30 % DU PIC LIVRÉ (hors jour J).
  // La borne HAUTE existait (R3.13 : ≤ 60 %), la basse non — mesuré : 14 % du pic sur le Full,
  // l'athlète passait la semaine de course quasi à l'arrêt. Bosquet 2007 : l'affûtage optimal
  // réduit de 40-60 %, il ne coupe pas le moteur — sous ~30 %, les sensations partent avec la
  // fatigue. On regonfle les corps de séance simples (jamais le déverrouillage de la veille,
  // jamais la course, jamais les blocs répétés dont la dose est un choix) ; la décroissance
  // R5.3 juge le résultat juste après, et la fenêtre 30-60 % tient des deux côtés.
  {
    const last = plan.weeks[plan.weeks.length - 1];
    const isRaceWeek = last && (plan.races || []).some((rc) => last.days.some((d) => d.date === rc.date && d.sessions.some((s) => s.race)));
    if (isRaceWeek) {
      const peakDeliv = Math.max(0, ...plan.weeks.filter((w) => w.phase.id === "peak").map(weekMinOf));
      const hors = () => last.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.race ? 0 : s.min || 0), 0), 0);
      if (peakDeliv > 0 && hors() < peakDeliv * 0.30) {
        for (let g = 0; g < 3 && hors() < peakDeliv * 0.30; g++) {
          const f = Math.min(2, (peakDeliv * 0.32) / Math.max(1, hors()));
          if (f <= 1.02) break;
          let touched = false;
          for (const d of last.days)
            for (const sx of d.sessions) {
              // Jamais la LONGUE ni le brick : regonfler la sortie longue en semaine de course
              // contredirait l'affûtage — et sans bornes de bloc, elle repassait au-dessus de
              // C23 (sortie CAP débutant > 3 h, régression D7 du banc v6).
              if (sx.race || sx.d === "rs" || !sx.steps || sx.long || sx.brick || /Déverrouillage/.test(sx.name)) continue;
              for (const st of sx.steps) {
                if (st.role !== "body" || (st.reps || 1) > 1) continue;
                // Le complément de volume est de l'ENDURANCE : regonfler un bloc de qualité
                // pour tenir un plancher fabriquait « Seuil course 1×124 min » en semaine de
                // course (U-DOSE, banc v7) — une dose que personne ne prescrit, encore moins à
                // J-5. Les blocs durs gardent leur dose, seuls les blocs faciles portent le
                // plancher.
                if (st.zone && IS_QUALITY_ZONE(String(st.zone))) continue;
                if (st.durationMin) { st.durationMin = Math.round(st.durationMin * f); touched = true; }
                else if (st.distanceM) { st.distanceM = Math.round((st.distanceM * f) / 25) * 25; touched = true; }
              }
              if (render) render(sx);
            }
          if (!touched) break;
        }
      }
    }
  }

  // R5.3 — L'AFFÛTAGE DÉCROÎT, POINT. La décroissance était jusqu'ici ÉMERGENTE (courbe + coupe
  // R3.13) : sur un cycle de 10 jours, la dérive des créneaux d'une semaine calendaire à l'autre
  // pouvait rendre la 3ᵉ semaine d'affûtage plus lourde que la 2ᵉ (147→98→123→88 mesuré, banc v6
  // D10). Une règle de sécurité ne doit pas dépendre d'un effet de bord : elle s'énonce et se
  // vérifie ici, en dernier, quelle que soit la passe qui a bougé une durée avant.
  {
    let prev = Infinity;
    for (const wk of plan.weeks) {
      if (wk.phase.id !== "taper") continue;
      for (let g = 0; g < 6 && weekMinOf(wk) > prev; g++) {
        const active = wk.days.filter((d) => d.sessions.some((s) => s.d !== "rs") && !d.sessions.some((s) => s.race));
        // Une seule séance restante : on ne peut plus RETIRER, il faut RÉDUIRE. Sans ce repli,
        // la décroissance de l'affûtage s'arrêtait net dès qu'une semaine tombait à une séance
        // (mesuré : 48 → 56 min sur un Full à 3 séances/semaine). Réduire est toujours dans le
        // sens de la sécurité — c'est de l'affûtage, l'objectif EST d'enlever.
        if (active.length <= 1) {
          const only = active[0]?.sessions.find((s) => s.d !== "rs");
          if (only && prev > 0 && (only.min || 0) > prev) {
            const f = Math.max(0.5, prev / (only.min || 1));
            for (const st of only.steps || []) if (st.role === "body" && st.durationMin) st.durationMin = Math.max(5, Math.round(st.durationMin * f));
            if (render) render(only);
          }
          break;
        }
        let cand = active.filter((d) => !d.sessions.some((s) => s.long || s.brick));
        // R13 — même orientation que partout : ne pas orpheliner une discipline du sport.
        // Et si TOUTE victime en orphelinerait une (2 jours actifs, 2 disciplines), on ne
        // retire plus : on RÉDUIT — la décroissance est servie, la spécificité aussi.
        let orphanOnly = false;
        for (const md of (ctx?.disciplines || [])) {
          const covers = (d: V1Day) => d.sessions.some((s) => s.d === md || (s.d === "br" && (s.steps || []).some((b) => b.leg === (md === "rn" ? "run" : "bike"))));
          const sole = (d: V1Day) => covers(d) && !wk.days.some((o) => o !== d && covers(o));
          const cand2 = cand.filter((d) => !sole(d));
          if (cand2.length) cand = cand2;
          else if (cand.some(sole)) orphanOnly = true;
        }
        if (orphanOnly && prev > 0) {
          const f = Math.max(0.5, (prev * 0.95) / weekMinOf(wk));
          for (const d of wk.days) for (const sx of d.sessions) {
            if (sx.d === "rs" || sx.race || !sx.steps) continue;
            for (const st of sx.steps) {
              if (st.role !== "body") continue;
              if ((st.reps || 1) > 1) st.reps = Math.max(1, Math.floor((st.reps || 1) * f));
              else if (st.durationMin) st.durationMin = Math.max(5, Math.round(st.durationMin * f));
              else if (st.distanceM) st.distanceM = Math.max(150, Math.round((st.distanceM * f) / 25) * 25);
            }
            if (render) render(sx);
          }
          continue;
        }
        const victim = (cand.length ? cand : active).reduce((x, y) => (dayMin(y) < dayMin(x) ? y : x));
        victim.charge = "off";
        victim.slot = "off";
        victim.sessions = [{ d: "rs", name: "OFF (affûtage décroissant)", det: "repos — chaque semaine d'affûtage pèse moins que la précédente : c'est la règle, pas une conséquence", steps: [], min: 0 }];
      }
      prev = weekMinOf(wk);
    }
  }
  let forcedWeeks = 0;
  for (const wk of plan.weeks) {
    const lim = wk.phase.id === "taper" ? 1.25 : 1.4;
    // Pas de coupe en AFFÛTAGE : sa décroissance est stricte (R3.13, banc v6 D10) et retirer
    // une séance courte d'une semaine plutôt que d'une autre y casse la monotonie.
    if (wk.phase.id !== "taper") {
      let work = wk.days.filter((d) => d.sessions.some((s) => s.d !== "rs") && !d.sessions.some((s) => s.race));
      for (const d of [...work].sort((x, y) => dayMin(x) - dayMin(y))) {
        // La coupe ne s'applique QU'AUX semaines qui débordent déjà de leur courbe : ailleurs,
        // une séance courte est un choix de la courbe, pas un artefact de plancher.
        if (work.length <= 1 || weekH(wk) <= (wk.vol_declared ?? wk.vol) * lim) break;
        if (dayMin(d) >= MIN_WORTH_MIN) break; // les suivantes sont plus longues : couper deviendrait arbitraire
        d.charge = "off"; d.slot = "off";
        d.sessions = [{ d: "rs", name: "OFF (séance trop courte)", det: "repos — sous un quart d'heure, une séance ne vaut pas le déplacement : la fréquence cède, pas la taille", steps: [], min: 0 }];
        work = work.filter((x) => x !== d);
      }
    }
    const delivered = weekH(wk);
    if (delivered > (wk.vol_declared ?? wk.vol) * lim) {
      wk.vol_declared = delivered;
      wk.vol = delivered;
      if (wk.phase.id !== "taper" && !wk.isRecup) forcedWeeks++;
    }
  }

  // I10 / B3 — LE VOLUME ANNONCÉ EST LE VOLUME PRESCRIT, DANS LES DEUX SENS.
  //
  // L'alignement n'existait que vers le HAUT (une semaine qui déborde de sa courbe). Vers le
  // bas, `vol_declared` restait la cible d'origine : la première semaine d'affûtage, celle
  // dont la fréquence vient d'être coupée, annonçait 5h30 et en délivrait 4h30 — 18 % d'écart,
  // systématique, sur la semaine où l'athlète regarde le plus attentivement. Les autres
  // semaines d'affûtage concordaient au dixième, ce qui rendait l'anomalie invisible en moyenne.
  //
  // Une promesse d'heures qui ne tient pas est un défaut de véracité, pas un arrondi. Tolérance
  // 10 % : au-delà, le chiffre affiché suit ce qui est réellement prescrit.
  for (const wk of plan.weeks) {
    const delivered = weekH(wk);
    const declared = wk.vol_declared ?? wk.vol;
    if (declared > 0 && Math.abs(declared - delivered) / declared > 0.10) {
      wk.vol_declared = delivered;
      wk.vol = delivered;
    }
    wk.vol_real = delivered;
  }
  // C13d — UNE SÉANCE SOUS-DOSÉE EST DÉCLASSÉE, PAS RABOTÉE.
  //
  // Corollaire de C13c (plancher d'échauffement 10 min) ET de C13e (échauffement ≤ corps) : pour
  // que les deux tiennent ENSEMBLE, il faut au moins 10 min de corps. En dessous, une séance de
  // 17 min ne contient plus que 4 minutes de travail — ce n'est pas une VO2max, c'est un
  // échauffement suivi d'un sprint. La réponse honnête n'est pas de raboter l'échauffement pour
  // sauver l'étiquette : c'est de rendre à la séance ce qu'elle est vraiment, de l'endurance.
  // Même durée, même place dans la semaine, intention corrigée.
  //
  // Le déclencheur reste la QUALITÉ, et c'est mesuré, pas supposé : élargir C13d à « toute
  // séance portant un échauffement » a fait déclasser des séances de swimrun qui étaient le
  // seul stimulus VO2 du plan (`S-NOVO2` = 4, `U-REPCAP` = 5 au banc v7 — le volume libéré
  // repartait en répétitions ailleurs). Une séance FACILE dont le corps est court n'a rien à
  // déclasser : elle est déjà ce qu'elle prétend être, et C13e suffit à l'équilibrer.
  //
  // Deux exclusions, chacune pour sa raison :
  //   · le TRAIL — sa charge est verticale (D+/D−, axes T1/T2b), pas horaire ; déclasser un bloc
  //     de côtes viderait la cible de dénivelé que le reste du moteur vient d'atteindre ;
  //   · la NATATION et tout bloc exprimé en DISTANCE — C13d est le corollaire d'un plancher qui
  //     s'exprime en MINUTES, et un échauffement de nage se compte en mètres. Un 8×50 m VO2 pèse
  //     7,7 min de « corps » à 1'55/100 m : le déclasser supprimait le seul stimulus de puissance
  //     aérobie du plan (S-NOVO2, banc v7). En bassin, la dose minimale est déjà tenue par C24
  //     (750 m de séance) et C15 (850 m pour un débutant) — C13d n'y a rien à ajouter.
  {
    const EASY_ZONE: Record<string, string> = { rn: "rn.easy", bk: "bk.z2" };
    for (const wk of plan.weeks) for (const d of wk.days) for (const sx of d.sessions) {
      const st = sx.steps || [];
      // Une COURSE n'est pas une séance : elle a lieu, dosée ou non. Elle ne se déclasse pas.
      if (!st.length || sx.d === "rs" || sx.brick || sx.race) continue;
      const bodies = st.filter((x) => x.role === "body");
      if (!bodies.length || bodies.some((x) => x.gradient || x.leg || x.distanceM != null)) continue;
      if (!bodies.some((x) => IS_QUALITY_ZONE(String(x.zone || "")))) continue;
      if (bodies.reduce((t, x) => t + (x._min || 0), 0) >= C13d_QUALITY_MIN_BODY_MIN) continue;
      const zone = EASY_ZONE[sx.d];
      if (!zone) continue;
      const totMin = st.reduce((t, x) => t + (x._min || 0), 0);
      sx.steps = [{ role: "body", durationMin: Math.max(10, Math.round(totMin)), zone }];
      sx.name = "Endurance facile";
      sx.note = "Cette semaine, l'enveloppe ne laissait que quelques minutes de travail pour un échauffement complet : une séance dure de cinq minutes n'apporte rien et coûte cher. Le créneau redevient de l'endurance — c'est un choix, pas un repli.";
      if (render) render(sx);
    }
  }

  // C25 / I11 — LE NOM COLLE À LA DOSE : une séance de récupération reste une récupération.
  // Le modèle est nommé à la sélection, puis la mise à l'échelle l'allonge pour remplir
  // l'enveloppe sans jamais renommer. Mesuré par le banc d'invariants : « Nage récup courte »
  // de 196 min et 9 025 m, « Récup active » de 134 min, « Footing récup » de 98 min.
  // L'intention est portée par `recovery`, une DONNÉE : le libellé n'en est que le rendu, et
  // c'est la dose qui s'aligne sur l'intention, jamais l'inverse.
  //
  // I14 — ET LA SORTIE LONGUE EST LA PLUS LONGUE DE SA SEMAINE, dans sa discipline. Là aussi
  // le nom promet un rang que la mise à l'échelle ne garantissait pas (« Sortie longue » de
  // 96 min à côté d'une séance de 119 min). On ne gonfle pas la longue — ce serait ajouter du
  // volume pour tenir une promesse : on plafonne les AUTRES séances de la même discipline.
  // Aucune séance ordinaire ne dépasse la sortie longue de la semaine ; c'est aussi ce qu'un
  // entraîneur vérifie en premier en relisant une semaine.
  //
  // ORDRE (I14, 2e passe) — cette passe est appelée AVANT les garanties hebdomadaires, pas
  // après. Elle RÉDUIT des séances : la faire tourner en dernier abaissait des semaines de pic
  // déjà validées par « dev ≤ pic », et rouvrait l'inversion sur 4 combinaisons de trail. Une
  // garantie de SÉANCE doit précéder les garanties de SEMAINE — sinon la semaine est vérifiée
  // sur un contenu qui va encore changer. Elle est rappelée une seconde fois en fin de course :
  // une passe hebdomadaire qui raboterait la sortie longue promouvrait une autre séance au rang
  // de « plus longue », et le filet doit être le dernier à parler.
  function enforceLabelVsDose(): void {
    const totalOf = (sx: V1Session) => (sx.steps || []).reduce((t, st) => t + (st._min || 0), 0);
    const metersOf = (sx: V1Session) => (sx.steps || []).reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
    const shrinkTo = (sx: V1Session, capMin: number): void => {
      // Un plafond de LIBELLÉ ne casse pas un plancher de SÉANCE : en bassin, réduire sous
      // C24/C24b transformerait « le nom colle à la dose » en « la séance ne vaut plus le
      // déplacement ». Le garde-fou le plus bas (600 m) borne la réduction ; au-dessus, la
      // passe de fenêtre nage garde le dernier mot.
      const swMin = sx.d === "sw" ? Math.min(750, metersOf(sx)) : 0;
      for (let g = 0; g < 5 && totalOf(sx) > capMin + 0.5; g++) {
        const before = totalOf(sx);
        const f = capMin / before;
        const snap = (sx.steps || []).map((st) => ({ st, reps: st.reps, durationMin: st.durationMin, distanceM: st.distanceM }));
        let touched = false;
        for (const st of sx.steps || []) {
          if (st.role !== "body") continue;
          // I14 (2e passe) — UN BLOC EN PENTE N'EST PAS INTOUCHABLE : IL SE RÉDUIT PAR SES
          // RÉPÉTITIONS, JAMAIS PAR SA DURÉE.
          //
          // La prudence initiale excluait tout bloc portant du dénivelé, au motif que la charge
          // verticale a ses propres passes (T2 : +12 %/sem de D+, T2b : +8 % de D−). Elle coûtait
          // 18 semaines de trail où « Descente en charge » dépassait la sortie longue — jusqu'à
          // 5 h 16 contre 4 h 04. Sur l'axe dont le module dit lui-même qu'il casse en premier.
          //
          // Deux distinctions que la prudence confondait :
          //   1. une contrainte de CROISSANCE se viole en montant, jamais en descendant — réduire
          //      un axe de charge ne peut pas casser sa progression ;
          //   2. `dplusM`/`dmoinsM` sont déclarés PAR répétition. Retirer des répétitions réduit
          //      le total exactement au prorata et ne touche pas à la vitesse ascensionnelle de
          //      chaque répétition. Ce qui serait faux, c'est de raboter la DURÉE d'un bloc en
          //      pente : l'athlète descendrait les mêmes 400 m en moins de temps — une vitesse
          //      impossible. C'est cette réduction-là, et elle seule, qui reste interdite.
          //
          // Plancher à 2 répétitions : une séance de descente avec une seule descente n'est plus
          // une séance de descente. Si le plafond n'est pas atteint à 2, la boucle s'arrête et le
          // banc le dira — un résidu mesuré vaut mieux qu'une séance dénaturée.
          const enPente = st.gradient === "up" || st.gradient === "down" || st.gradient === "rolling";
          if (enPente) {
            // On arrondit à l'INFÉRIEUR, contrairement aux blocs plats : sur un axe de charge
            // qui casse en premier, une répétition de trop ne se rattrape pas la semaine
            // suivante. `round` laissait d'ailleurs passer le dernier cas mesuré (3 répétitions
            // × 0,84 → 3 : la passe tournait sans rien réduire).
            if ((st.reps || 1) > 2) {
              const next = Math.max(2, Math.floor((st.reps || 1) * f));
              if (next < (st.reps || 1)) { st.reps = next; touched = true; }
            }
            continue;
          }
          if ((st.reps || 1) > 1) {
            const next = Math.max(1, Math.round((st.reps || 1) * f));
            if (next < (st.reps || 1)) { st.reps = next; touched = true; }
          } else if (st.durationMin) {
            const next = Math.max(5, Math.round(st.durationMin * f));
            if (next < st.durationMin) { st.durationMin = next; touched = true; }
          } else if (st.distanceM) {
            const next = Math.max(100, Math.round((st.distanceM * f) / 25) * 25);
            if (next < st.distanceM) { st.distanceM = next; touched = true; }
          }
        }
        if (!touched) break;
        if (traceEnabled()) traceRecord({ pass: "libellé-vs-dose", sessionName: sx.name, discipline: sx.d, field: "minutes", before: Math.round(before), after: Math.round(totalOf(sx)), reason: sx.recovery ? "C25" : "I14" });
        // Le plancher piscine n'est pas une marge : si le pas de réduction le franchit, on le
        // DÉFAIT au lieu de s'arrêter à mi-chemin — s'arrêter après coup laissait la séance
        // sous le plancher, ce que le plafond de libellé n'a jamais eu le droit de faire.
        if (swMin > 0 && metersOf(sx) < swMin) {
          for (const b of snap) { b.st.reps = b.reps; b.st.durationMin = b.durationMin; b.st.distanceM = b.distanceM; }
          break;
        }
        if (render) render(sx);
        if (before - totalOf(sx) < 0.5) break;
      }
    };
    for (const wk of plan.weeks) {
      const all = wk.days.flatMap((d) => d.sessions).filter((sx) => sx.d !== "rs" && sx.steps && sx.steps.length);
      for (const sx of all) if (sx.recovery && !sx.race && (sx.min || 0) > C25_RECOVERY_SESSION_CAP_MIN) shrinkTo(sx, C25_RECOVERY_SESSION_CAP_MIN);
      for (const lg of all) {
        if (!lg.long || lg.race) continue;
        for (const sx of all) {
          if (sx === lg || sx.race || sx.brick || sx.long) continue;
          if (sx.d !== lg.d) continue; // « la plus longue DANS SA DISCIPLINE »
          if ((sx.min || 0) > (lg.min || 0)) shrinkTo(sx, lg.min || 0);
        }
      }
    }
  }

  // C24/C24b — LA FENÊTRE DE SÉANCE PISCINE, AU POINT DE CONVERGENCE.
  //
  // La trace a répondu en une lecture ce que trois tours d'élimination n'avaient pas trouvé :
  // les séances de nage à 700 m des semaines 2 et 4 ne sont JAMAIS VISITÉES par la passe de
  // plancher. Elle vivait dans `generatePlan`, et la boucle de réparation mute les séances
  // APRÈS elle — la règle ne vérifiait donc que l'avant-dernier état. Septième fois que la même
  // leçon se paie, et la première fois qu'elle est trouvée sans battue.
  //
  // On monte le bloc le plus long jusqu'au plancher, jamais l'échauffement ni le retour au
  // calme ; en semaine de décharge, A3 s'applique — on retire au lieu de remonter.
  if (ctx?.swimFloors) {
    const floorM = ctx.beginner ? 600 : 750;
    for (const wk of plan.weeks) {
      const decharge = wk.isRecup || wk.phase.id === "taper";
      for (const d of wk.days) for (const sx of [...d.sessions]) {
        if (sx.d !== "sw" || !sx.steps || !sx.steps.length) continue;
        const metersOf = () => sx.steps!.reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
        const tot = metersOf();
        if (tot <= 0 || tot >= floorM) continue;
        if (decharge) {
          if (wk.days.reduce((t, dd) => t + dd.sessions.filter((x) => x.d !== "rs").length, 0) <= 1) continue;
          const i2 = d.sessions.indexOf(sx);
          if (i2 >= 0) d.sessions.splice(i2, 1);
          if (!d.sessions.some((x) => x.d !== "rs")) {
            d.charge = "off"; d.slot = "off";
            d.sessions = [{ d: "rs", name: "OFF (semaine de décharge)", det: "repos — sous le plancher de séance, une semaine de décharge retire au lieu de remonter", steps: [], min: 0 }];
          }
          continue;
        }
        const body = sx.steps.filter((st) => st.role === "body" && st.distanceM != null)
          .sort((x, y) => (y.reps || 1) * (y.distanceM || 0) - (x.reps || 1) * (x.distanceM || 0))[0];
        if (!body || !body.distanceM) continue;
        const missing = floorM - tot;
        if ((body.reps || 1) > 1) body.reps = (body.reps || 1) + Math.ceil(missing / body.distanceM);
        else body.distanceM = Math.ceil((body.distanceM + missing) / 25) * 25;
        if (render) render(sx);
      }
    }
  }

  // …et une dernière fois APRÈS toutes les passes de ce point de convergence : elles peuvent
  // recomposer une séance (déclassement C13d, remplacement de course, greffe).
  enforceMedicalHold(plan, !!ctx?.medHold);
  // Même raison pour le rang de la sortie longue : une passe hebdomadaire qui rabote la longue
  // promeut mécaniquement une autre séance au rang de « plus longue de la semaine ». Le filet
  // repasse en dernier. Il ne peut que réduire, donc il ne peut rouvrir aucune des garanties
  // de semaine tenues au-dessus — sauf « dev ≤ pic », qui compare DEUX semaines entre elles :
  // c'est pour elle que le premier appel existe. Ce second appel n'est pas décoratif, il a été
  // mesuré : il modifie encore 44 des 594 combinaisons de `audit:v2` (des semaines où une passe
  // hebdomadaire avait raboté la sortie longue après coup), et l'audit reste vert avec lui.
  enforceLabelVsDose();
  // ANX-C22 — LE POINT FIXE, EN TOUT DERNIER (définition plus haut). Placé un cran trop tôt,
  // le 2e passage du plafond de libellé pouvait encore réduire une semaine N et recréer le
  // saut N→N+1 qu'on venait de fermer (mesuré : 3 sauts à +11 % survivaient). Rien ne réduit
  // ni ne gonfle après cette ligne.
  for (let p = 0; p < 3 && enforceC22Final(); p++);

  if (forcedWeeks > 0)
    warnings.push("Sur " + forcedWeeks + " semaine(s) de charge, la structure minimale de ce plan (une séance digne de ce nom ne descend pas sous 30 min, une sortie longue encore moins) dépasse le volume hebdomadaire que tu as déclaré. Le chiffre annoncé a été aligné sur ce qui t'est réellement prescrit — mieux vaut une courbe honnête qu'une promesse que le plan ne tient pas. Deux remèdes, à toi de choisir : relever le volume dont tu disposes, ou viser un objectif plus court.");

}

/**
 * R5.1 (audit v7 bis) — POINT DE CONVERGENCE de toute prose dérivée d'un champ numérique.
 * Le recalcul du libellé vivait dans `generatePlan()`, avec le commentaire « une fois que plus
 * rien ne bougera ». C'était l'intention, pas l'ordonnancement : `applyTargetedRepairs()` et
 * `reduceDay()` modifient encore les répétitions APRÈS. Le nom repartait alors en avance sur
 * les chiffres — dans l'autre sens qu'au premier tour (4 transitions annoncées, 2 prescrites).
 * Cette fonction est appelée EN DERNIER, à la sortie de la boucle de réparation. Toute prose
 * qui dépend d'un nombre doit passer par ici : c'est ce qui empêche la prochaine passe de
 * réparation de rouvrir le même écart.
 */
export function syncDerivedLabels(plan: V1Plan): void {
  for (const w of plan.weeks)
    for (const d of w.days)
      for (const sess of d.sessions) {
        // Swimrun : le nombre de transitions annoncé par le nom EST la spécification de la
        // séance — il se relit sur le leg de nage, jamais sur une valeur figée à la naissance.
        if (/\(\d+ transitions\)/.test(sess.name || "")) {
          const swLeg = (sess.steps || []).find((b) => b.role === "body" && b.leg === "swim");
          if (swLeg) sess.name = String(sess.name).replace(/\(\d+ transitions\)/, "(" + 2 * (swLeg.reps || 1) + " transitions)");
        }
      }
}

export function normalizeRestMinutes(plan: V1Plan): void {
  for (const w of plan.weeks)
    for (const d of w.days)
      for (const s of d.sessions) if (typeof s.min !== "number" || !isFinite(s.min)) s.min = 0;
}

export function generatePlan(profile: AthleteProfile, opts?: { noLoadFactor?: boolean }): { plan: V1Plan; reasoned: ReasonedPlan } {
  const engine = new TrainingReasoningEngine();
  const r = engine.analyze(profile);
  // R6.2/R6.3 (audit v6, B1) — passe de référence : le plan « sans blessure ni facteur
  // d'âge » sert de PLAFOND au plan réel. Sans elle, la quantification des répétitions et
  // les planchers de séance pouvaient rendre un plan blessé plus gros (+3% mesuré) : une
  // blessure déclarée doit TOUJOURS alléger, jamais alourdir (priorité n°2 du manifeste).
  const refWeekCaps: number[] | null = !opts?.noLoadFactor && r.loadFactor < 1
    ? generatePlan(profile, { noLoadFactor: true }).plan.weeks.map((w) =>
        w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.min || 0), 0), 0))
    : null;
  if (opts?.noLoadFactor) r.loadFactor = 1;
  const a = profile;
  const fmt = a.format;
  const refs: Refs = { ...r.baseRefs };
  const days = buildDays(r, refs, r.hz);

  // ---- Bornes de bloc (R3.4b/R3.11/R3.12) — source unique, mêmes règles que V1.5 ----
  let _capScale = 1;
  const brickRF = a.history === "reprise" ? C21_REPRISE_BRICK_FACTOR : 1; // C21
  function blockBounds(b: V1Step, s: BoundedSession): { floor: number; cap: number } {
    if (b.bnd) {
      // Un plafond marqué `hard` est une règle du manifeste (C23…) : la sonde de capacité peut
      // élargir les plafonds ordinaires pour tenir la promesse de volume, jamais celui-là.
      // Sans cette distinction, l'excédent de volume refusé par les blocs de qualité (R4.1)
      // repartait dans la sortie longue et faisait sauter C23 (193 min pour un débutant).
      const sc = b.bnd.hard ? 1 : _capScale;
      if (b.distanceM != null) {
        const fl = s.long ? 800 : Math.min(b.bnd.floor, r.beginner ? 600 : 750); // C24
        return { floor: fl, cap: Math.max(fl, Math.round(b.bnd.cap * sc)) };
      }
      // R7 TRAIL — un bloc de côtes dure 45 s à 12 min : le plancher « séance digne » de
      // 30 min (pensé pour les sorties longues de route) écrasait son plafond et ramenait
      // toutes les phases à la même valeur — exactement le défaut « 6 séances identiques
      // à 15×3min » relevé par l'audit. Un bloc qui porte une PENTE garde ses propres bornes.
      if (b.gradient) return { floor: Math.max(1, b.bnd.floor), cap: Math.max(1, b.bnd.cap) };
      // Bornes PAR RÉPÉTITION (swimrun : N alternances nage ↔ course) : le plancher « séance
      // digne » de 30 min n'a aucun sens sur un segment de 8 min répété 10 fois — il le
      // gonflerait d'un facteur 4. Un bloc répété garde ses propres bornes, comme un bloc
      // porteur de pente.
      if ((b.reps || 1) > 1) return { floor: Math.max(1, b.bnd.floor), cap: Math.max(1, Math.round(b.bnd.cap * sc)) };
      const fl = s.d === "bk" ? 35 : 30; // C8/C16 — plancher digne, pas la borne basse du format
      return { floor: fl, cap: Math.max(fl, Math.round(b.bnd.cap * sc)) };
    }
    if (s.brick) {
      // C21b — le PLANCHER du leg vélo est la borne basse auditée du format : le scaling R3.3
      // ne peut plus descendre un brick sous ce que la spec exige (sinon le générateur produit
      // ce que l'auditeur refuse, et c'est l'auditeur qui a raison).
      if (b.leg === "bike") {
        const bb = BRICK_BIKE_BOUNDS[fmt || ""];
        return { floor: bb ? bb[0] : 32, cap: Math.round((CAP_BRICK_BIKE[fmt] || 300) * brickRF) };
      }
      return { floor: 8, cap: Math.round((CAP_BRICK_RUN[fmt] || 70) * brickRF) };
    }
    if (s.long) {
      if (s.d === "sw") return { floor: 820, cap: CAP_SWIM[fmt] || 4500 };
      if (s.d === "rn") return { floor: 30, cap: CAP_LONG[fmt] || 9999 };
      if (s.d === "bk") return { floor: 35, cap: CAP_LONG[fmt] || 9999 };
    }
    if (b.distanceM != null) return { floor: (b.d || s.d) === "sw" && !r.beginner ? 750 : 100, cap: 9999 }; // C24
    return { floor: 3, cap: 9999 };
  }

  function scaleBlock(b: V1Step, f: number, s: BoundedSession): void {
    if (b.role !== "body") return;
    const bd = blockBounds(b, s);
    // V2.2 — répartition des intensités : un bloc de QUALITÉ ne dépasse jamais son gabarit
    // (repCap). Sans lui, R3.3 déversait l'excédent de volume dans les intervalles
    // (VO2 4-6×4min devenu 15×4min) au lieu des séances faciles — zone grise garantie.
    // R4.1 (audit v7) — le `15` de repli n'était pas un plafond de sécurité, c'était la valeur
    // par défaut : tout step non annoté pouvait TRIPLER ses répétitions pour absorber le volume
    // de la semaine. Mesuré : 15×6min = 90 min au seuil (swimrun), 5×14min = 70 min (duathlon),
    // 12×3min de descente (trail). Le déversement doit aller vers les séances FACILES, jamais
    // vers un bloc de qualité non plafonné. Défaut désormais CONSERVATEUR : le nombre de
    // répétitions construit par la bibliothèque, qui l'a choisi pour une raison.
    // Le défaut dépend de ce que le bloc EST : « le déversement doit aller vers les séances
    // faciles, jamais vers un bloc de qualité » (audit v7). Un bloc facile (endurance, récup,
    // technique) peut absorber du volume en répétitions — c'est même sa fonction, et la courbe
    // de charge s'en sert comme levier. Un bloc de QUALITÉ ne grandit plus tout seul : sans
    // `repCap` explicite, il reste au gabarit choisi par la bibliothèque.
    const isQuality = IS_QUALITY_ZONE(String(b.zone || ""));
    const repMax = b.repCap ?? (isQuality ? (b.reps || 1) : 15);
    if (b.distanceM != null) {
      if ((b.reps || 1) > 1) {
        const tot = (b.reps || 1) * b.distanceM * f;
        b.reps = Math.max(1, Math.min(repMax, Math.round(tot / b.distanceM)));
      } else b.distanceM = Math.max(bd.floor, Math.min(bd.cap, Math.round((b.distanceM * f) / 25) * 25));
    } else if (b.durationMin != null) {
      if ((b.reps || 1) > 1) {
        const tot = (b.reps || 1) * b.durationMin * f;
        b.durationMin = Math.max(bd.floor, Math.min(bd.cap, b.durationMin));
        b.reps = Math.max(1, Math.min(repMax, Math.round(tot / b.durationMin)));
      } else b.durationMin = Math.max(bd.floor, Math.min(bd.cap, Math.round(b.durationMin * f)));
    }
    // R4.1c (audit v7) — plafond de DOSE en plus du plafond de reps : rien n'empêchait
    // `5×14min` au seuil, puisque c'est la DURÉE du bloc qui avait été mise à l'échelle et non
    // le nombre de répétitions. Une dose de seuil au-delà de ~40 min ou de VO2 au-delà de
    // ~25 min n'est pas un entraînement dur, c'est une course — et personne n'enchaîne ça
    // semaine après semaine sans casser.
    if (b.durationMin != null) {
      const z = String(b.zone || "");
      const doseCap = /\.vo2$/.test(z) || z === "tr.vam" ? DOSE_CAP_MIN.vo2
        : /\.thr$|\.css$/.test(z) || z === "tr.asc" || z === "tr.flatthr" ? DOSE_CAP_MIN.thr
        : null;
      if (doseCap != null) {
        const reps = b.reps || 1;
        if (reps * b.durationMin > doseCap) {
          if (reps > 1) b.reps = Math.max(1, Math.floor(doseCap / b.durationMin));
          else b.durationMin = doseCap;
        }
      }
    }
    // C13d-plancher — SYMÉTRIQUE du plafond de dose ci-dessus, et corollaire de C13c.
    // Le plancher d'échauffement de 10 min prend des minutes à la séance ; la courbe les
    // reprend alors sur le seul endroit qu'elle sait réduire — les blocs. Mesuré sur un
    // swimrun à 4 h/sem : toutes les doses de qualité tombaient sous 8 min, la séance était
    // ensuite déclassée par C13d, et le plan traversait 20 semaines sans un seul stimulus VO2
    // (`S-NOVO2`, banc v7). R4.1 dit « le déversement de volume va vers les séances FACILES,
    // jamais vers un bloc de qualité » ; la règle symétrique était manquante : le RETRAIT
    // vient des séances faciles, lui aussi. Un bloc de qualité ne descend pas sous sa dose.
    if (isQuality && b.durationMin != null && !b.gradient) {
      const reps = b.reps || 1;
      if (reps * b.durationMin < C13d_QUALITY_MIN_BODY_MIN) {
        // Le plafond de répétitions à respecter ici est `repCap` (la valeur DÉCLARÉE par la
        // bibliothèque), surtout pas `repMax` : celui-ci vaut, à défaut de `repCap`, le nombre
        // de répétitions COURANT — donc 1 dès que la passe précédente a réduit le bloc à une
        // seule. C'est un cliquet : le bloc ne pouvait plus jamais remonter, et un 5×3min de
        // VO2 tombé à 1×3min restait à 1×3min, puis se faisait déclasser par C13d.
        const repCeil = b.repCap ?? 15;
        if (reps > 1) b.reps = Math.max(reps, Math.min(repCeil, Math.ceil(C13d_QUALITY_MIN_BODY_MIN / b.durationMin)));
        else b.durationMin = Math.max(b.durationMin, Math.min(bd.cap, C13d_QUALITY_MIN_BODY_MIN));
      }
    }
    // C15 — protection débutant nage : aucune séance >850m, tous blocs confondus
    if (r.beginner && s.d === "sw" && b.distanceM != null) {
      const cap = C15_BEGINNER_SWIM_SESSION_CAP_M, reps = b.reps || 1;
      if (reps * b.distanceM > cap) {
        if (reps > 1) b.reps = Math.max(1, Math.floor(cap / b.distanceM));
        else b.distanceM = Math.floor(cap / 25) * 25;
      }
    }
  }

  const weekMin = (wd: GenDay[]) => wd.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.min || 0), 0), 0);
  // D3 (audit v6) — en NATATION, la métrique de charge de l'auditeur (récup entre
  // répétitions comprise) diverge fortement de s.min : sur la fenêtre saturée du débutant,
  // le générateur croyait la semaine lisse là où l'auditeur voyait un saut. Les passes de
  // lissage utilisent donc SA mesure pour ce sport — on lisse ce qui est mesuré.
  const _auditRefs: AthleteRefs = { cssSecPer100m: r.baseRefs.css || 130, thrPaceSecPerKm: r.baseRefs.thrPace || 330 };
  // Le lissage retient la mesure la PLUS GRANDE des deux (s.min du plan, métrique auditeur) :
  // les deux lectures doivent tenir, on ne lisse pas l'une en cassant l'autre.
  const weekMinSmooth = guard(a.sport as string, "smoothOnAuditMetric")
    ? (wd: GenDay[]) => Math.max(weekMin(wd), wd.reduce((t, d) => t + d.sessions.reduce((u, s) => u + sessionLoad(s, _auditRefs).minutes, 0), 0))
    : weekMin;
  const renderWeek = (wd: GenDay[]) =>
    wd.forEach((d) => d.sessions.forEach((s) => {
      if (s.steps && s.steps.length) {
        // T19 — la récupération d'un bloc en pente suit son dénivelé, qui bouge encore à ce
        // stade (mise à l'échelle verticale, plafond de bosse, allègement T3). On la
        // réconcilie AVANT de mesurer, pas après : c'est elle qui entre dans `_min`.
        syncReturnRecovery(s.steps);
        renderSess(s, refs, r.hz, r.baseRefs);
      } else if (s.min == null) s.min = 0;
    }));
  const scaleWeekBody = (wd: GenDay[], f: number) =>
    wd.forEach((d) => d.sessions.forEach((s) => {
      if ((s as BoundedSession).social) return;
      if (s.steps) s.steps.forEach((b) => scaleBlock(b, f, s as BoundedSession));
    }));
  const clampWeekBody = (wd: GenDay[]) => scaleWeekBody(wd, 1);

  const Lval = (id: string, prog: number) => {
    const b = BANDS[id] || [0.6, 0.9];
    return b[0] + (b[1] - b[0]) * Math.max(0, Math.min(1, prog));
  };
  // C3 — plafond dur de la semaine. R6.2/R6.3 (audit v6, B1) : une blessure ou l'âge
  // abaissent AUSSI ce plafond — sans ça, les planchers de séance regarnissaient la semaine
  // jusqu'à l'ancien plafond et un plan « blessé » pouvait livrer plus (+3% mesuré).
  const capH = parseInt(a.vol_max || "10") * (r.loadFactor < 1 ? r.loadFactor : 1);
  let peakH = r.peakH;

  // ---- V2.1 — sonde de capacité : que permettent réellement les plafonds au pic ? ----
  {
    const chargePeakWeeks = [...new Set(days.filter((d) => d.phaseId === "peak").map((d) => d.week))]
      .filter((wn) => days.filter((d) => d.week === wn && d.isR).length < 4);
    const probeWeek = chargePeakWeeks[chargePeakWeeks.length - 1];
    if (probeWeek) {
      const clone = structuredClone(days.filter((d) => d.week === probeWeek)) as GenDay[];
      _capScale = 1;
      for (let it = 0; it < 4; it++) {
        renderWeek(clone);
        const cur = weekMin(clone) / 60;
        if (cur <= 0) break;
        scaleWeekBody(clone, (peakH * 2) / cur); // pousser vers un cible inatteignable → saturation aux caps
      }
      clampWeekBody(clone);
      renderWeek(clone);
      let capacityH = weekMin(clone) / 60;
      // R13.5 — LA SONDE MESURE AUSSI LE CHEMIN, PAS SEULEMENT LE SOMMET. Elle sondait la
      // semaine de PIC seule : avec une épaule déclarée, les séances de substitution des
      // phases base/dev/spec plafonnent ~40 % plus bas que celles du pic, et la progression
      // est bornée à +10 %/semaine (C22). Un pic à 2,9 h qu'aucune semaine précédente ne peut
      // amener reste sur le papier : le moteur visait des cibles inatteignables, les passes
      // de convergence (dev ≤ pic, lissage) broyaient le plan vers les planchers — mesuré :
      // 20 semaines PLATES à 0,8 h/sem pendant que la promesse affichait 2,9 h. La promesse
      // devient min(capacité du pic, capacité de la spécifique × 1,15) : un pic ne dépasse
      // que légèrement ce que la semaine qui y mène sait porter.
      {
        const chargeSpecWeeks = [...new Set(days.filter((d) => d.phaseId === "spec").map((d) => d.week))]
          .filter((wn) => days.filter((d) => d.week === wn && d.isR).length < 4);
        const specWeek = chargeSpecWeeks[chargeSpecWeeks.length - 1];
        if (specWeek) {
          const clone2 = structuredClone(days.filter((d) => d.week === specWeek)) as GenDay[];
          _capScale = 0.9;
          for (let it = 0; it < 4; it++) {
            renderWeek(clone2);
            const cur = weekMin(clone2) / 60;
            if (cur <= 0) break;
            scaleWeekBody(clone2, (peakH * 2) / cur);
          }
          clampWeekBody(clone2);
          renderWeek(clone2);
          const specCapH = weekMin(clone2) / 60;
          if (specCapH > 0) capacityH = Math.min(capacityH, specCapH * 1.15);
          _capScale = 1;
        }
      }
      if (capacityH > 0 && capacityH < peakH * 0.95) {
        r.decisions.push({
          id: "V2.1", what: "Promesse calibrée par sonde de capacité", val: capacityH.toFixed(1) + "h (au lieu de " + peakH.toFixed(1) + "h)",
          why: "Les plafonds de séance (formats, C15/C21/C24" + (r.inj.count > 0 ? ", et surtout tes séances aménagées pour ta zone fragile" : "") + ") ne permettent pas plus : promettre davantage serait mentir",
        });
        peakH = capacityH;
      }
    }
  }
  // R6.2/R6.3 (audit v6) — blessures et âge réduisent la promesse APRÈS la sonde : la
  // réduction porte sur la cible livrable mesurée, pas sur les tailles initiales de
  // séances (où la quantification des répétitions la rendait chaotique).
  if (r.loadFactor < 1) peakH *= r.loadFactor;

  // ---- Boucle de volume : courbe (bands + C22) → R3.3 → garde C3 → R3.13 ----
  // R10 — point de départ de l'athlète : si le volume RÉCENT (3-6 derniers mois) est
  // connu, la semaine 1 part de là (≤ ×1.1) et la montée rejoint la courbe théorique à
  // ≤ C22 (+10% par semaine de charge). Sans cette rampe, un athlète qui sort de 3h/sem
  // recevait d'emblée la courbe calibrée sur sa capacité déclarée — trop, trop tôt.
  // R6 §2 — le point de départ peut être MESURÉ (`answers.measured`) au lieu d'être déclaré.
  // L'arbitrage vit dans un seul endroit (`arbitrateVolRecent`) et il est motivé : la phrase
  // produite part dans `decisions[]`, l'athlète voit le changement et sa cause. Sans
  // `measured`, `hours` vaut exactement la déclaration — le plan est celui d'avant.
  const _volArb = arbitrateVolRecent(a.vol_recent, a.measured);
  const volRecent = _volArb.hours ?? NaN;
  let _rampCap = volRecent > 0 ? Math.max(2, volRecent * 1.1) : Infinity;
  let _rampWeeks = 0;
  const wl: V1Week[] = [];
  let _maxChargeMin = 0;
  let _prevLw = 0;
  // D3/D4/D10 (audit v6) — la courbe se lisse sur les minutes LIVRÉES, pas seulement sur
  // la charge modélisée : les planchers de séance font dériver le rendu, alors la cible
  // de chaque semaine se cale sur ce qui a réellement été rendu la semaine d'avant.
  let _lastWeekMin = 0; // minutes livrées de la semaine précédente (toutes)
  let _prevChargeMin = 0; // minutes livrées de la dernière semaine de CHARGE
  // Quand les planchers bloquent le scaling vers le bas, la FRÉQUENCE cède (même principe
  // que R3.13 en affûtage) : le jour facile le plus léger passe OFF.
  // R5.2 (audit v7 bis) — UNE COUPE NE PEUT PAS ORPHELINER LA DISCIPLINE PRINCIPALE. La passe de
  // couverture tourne en fin de `buildDays` ; les coupes de volume, elles, tournent APRÈS et
  // pouvaient retirer la seule séance de course d'une semaine d'affûtage de duathlon — un
  // duathlon commence et finit à pied. Chaque sélection de victime passe désormais par ce filtre.
  // R13 — généralisé : la coupe n'orpheline AUCUNE discipline du sport (plus seulement la
  // principale). Mesuré : la 2e semaine d'affûtage d'un duathlon sortait sans un coup de
  // pédale — la CAP était protégée, le vélo non (D-DISC, banc v7).
  const _sportDiscs = sportModule(r.profile.sport as string).disciplines;
  const keepsMainDiscipline = (wd2: GenDay[], victim: GenDay): boolean => {
    const coversD = (d: GenDay, disc: string) => d.sessions.some((s) => s.d === disc || (s.d === "br" && (s.steps || []).some((b) => b.leg === (disc === "rn" ? "run" : disc === "bk" ? "bike" : "swim"))));
    for (const disc of _sportDiscs) {
      if (!coversD(victim, disc)) continue;
      if (!wd2.some((d) => d !== victim && coversD(d, disc))) return false;
    }
    return true;
  };
  // R13.3 — le sport déclare que l'affûtage (et la préparation) garde sa nage : les coupes
  // l'évitent tant qu'une autre victime existe. Orienter, jamais interdire.
  const _keepTaperSwim = guard(a.sport as string, "swimRacePrepFrequency") && !r.dbl && !r.medHold;
  const cutLightestEasyDay = (wd2: GenDay[], why: string, minActive = 3): boolean => {
    const active = wd2.filter((d) => d.charge !== "off" && d.sessions.some((s) => s.d !== "rs"));
    if (active.length <= minActive) return false;
    const cand0 = active.filter((d) => (d.charge === "facile" || d.charge === "recup") && !d.forced && !d.sessions.some((s) => s.long || s.brick));
    if (!cand0.length) return false;
    // La couverture de discipline oriente le choix ; elle ne l'INTERDIT jamais. Si le seul jour
    // coupable porte la discipline principale, la coupe a lieu quand même : la hiérarchie du
    // manifeste met le volume sûr au-dessus de la complétude du plan.
    const candK = cand0.filter((d) => keepsMainDiscipline(wd2, d));
    let cand = candK.length ? candK : cand0;
    if (_keepTaperSwim && wd2[0]?.phaseId === "taper") {
      const spared = cand.filter((d) => !(d.sessions.some((s) => s.d === "sw")
        && !wd2.some((o) => o !== d && o.sessions.some((s) => s.d === "sw"))));
      if (spared.length) cand = spared;
    }
    const dayMin = (d2: GenDay) => d2.sessions.reduce((t, s) => t + (s.min || 0), 0);
    const victim = cand.reduce((x, y) => (dayMin(y) < dayMin(x) ? y : x));
    victim.charge = "off";
    victim.slot = "off";
    victim.sessions = [{ d: "rs", name: "OFF (lissage)", det: "repos — " + why, steps: [] }];
    return true;
  };
  // Coupe par SÉANCE (plus fine que par jour) : la plus petite séance non-longue saute.
  // minRemainMin : ne jamais couper en-dessous (une coupe trop profonde crée le saut
  // de charge qu'elle voulait éviter, mesuré +87% sur bike/crit).
  const cutSmallestSessionIn = (wd2: GenDay[], minRemainMin = 0): boolean => {
    const cur = weekMin(wd2);
    let victim: { d: GenDay; si: number; min: number } | null = null;
    // R5.2 — on ÉVITE d'orpheliner la discipline principale (`keepMain`), puis on repasse sans
    // ce garde si c'était la seule coupe possible : orienter, jamais interdire.
    for (const keepMain of [true, false]) {
      const mainD = sportModule(r.profile.sport as string).mainDiscipline;
      for (const skipForced of [true, false]) {
        for (const d of wd2) {
          if (skipForced && d.forced) continue;
          d.sessions.forEach((s, si) => {
            if (s.d === "rs" || s.long || s.brick || s.race) return; // R13.4 : min=0 faisait de la COURSE la « plus petite séance » — jamais une victime
            if (keepMain && _sportDiscs.includes(s.d) && !wd2.some((o) => o.sessions.some((x) => x !== s && (x.d === s.d || x.d === "br")))) return;
            // R13.3 — en affûtage, la seule nage de la semaine est traitée comme la discipline
            // principale : préférée à la coupe, jamais interdite (le repli keepMain=false coupe).
            if (keepMain && _keepTaperSwim && wd2[0]?.phaseId === "taper" && s.d === "sw"
              && !wd2.some((o) => o.sessions.some((x) => x !== s && x.d === "sw"))) return;
            const m = s.min || 0;
            if (!victim || m < victim.min) victim = { d, si, min: m };
          });
        }
        if (victim) break; // repli : si tous les jours candidats sont « forcés », on coupe quand même une séance (jamais longue/brick)
      }
      if (victim) break;
    }
    if (!victim) return false;
    const v = victim as { d: GenDay; si: number; min: number };
    if (minRemainMin > 0 && cur - v.min < minRemainMin) return false;
    v.d.sessions.splice(v.si, 1);
    if (!v.d.sessions.some((s) => s.d !== "rs")) {
      v.d.charge = "off";
      v.d.slot = "off";
      v.d.sessions = [{ d: "rs", name: "OFF (équilibre du bloc)", det: "repos — la semaine la plus chargée du plan reste la semaine de pic", steps: [] }];
    }
    return true;
  };
  const nSessIn = (wd2: GenDay[]) => wd2.reduce((t, d) => t + d.sessions.filter((s) => s.d !== "rs").length, 0);
  for (let w = 0; w < r.weeks; w++) {
    const ph = r.phases.find((p) => w >= p.start && w < p.end) || r.phases[4];
    const prog = ph.weeks > 1 ? (w - ph.start) / (ph.weeks - 1) : ph.id === "taper" ? 0.5 : 1;
    const wd = days.filter((d) => d.week === w + 1);
    const isRW = wd.filter((d) => d.isR).length >= 4;
    let Lw = Lval(ph.id, prog);
    // C22 — progression lissée : jamais +10% d'une semaine de charge à la suivante
    if (ph.id !== "taper" && _prevLw > 0) Lw = Math.min(Lw, _prevLw * C22_MAX_WEEKLY_GROWTH);
    if (ph.id !== "taper" && !isRW) _prevLw = Lw;
    // R3.12 — le plafond de la longue suit la phase
    // R13.6 — en AFFÛTAGE, le plafond des séances suit la courbe d'affûtage elle-même (Lw
    // 0,55 → 0,30), pas la formule des phases de charge : celle-ci écrasait `_capScale` à
    // 0,46 dès la première semaine d'affûtage — la capacité de la semaine tombait à 25 % du
    // pic quand la courbe en demandait 55, et la décroissance partait d'une falaise (−63 %
    // d'un coup, mesuré sur le Full). La longue de S-3 d'un plan long fait encore 60-70 % de
    // sa taille normale : c'est la réduction 40-60 % de Bosquet, pas un arrêt.
    _capScale = ph.id === "taper" ? Math.max(0.3, Math.min(1, Lw + 0.25)) : Math.max(0.4, Math.min(1, (Lw - 0.5) * 1.2 + 0.4));
    let targetH = Lw * peakH;
    
    if (isRW) targetH *= RECUP_WEEK_FACTOR;
    targetH = Math.min(targetH, capH); // C3
    // R10 — rampe depuis le volume récent : cap qui monte de ≤ C22 par semaine de charge
    if (ph.id !== "taper" && Number.isFinite(_rampCap)) {
      const capW = isRW ? _rampCap * RECUP_WEEK_FACTOR : _rampCap;
      if (targetH > capW + 0.05) {
        targetH = capW;
        _rampWeeks++;
      }
      if (!isRW) {
        _rampCap *= C22_MAX_WEEKLY_GROWTH;
        if (_rampCap >= peakH) _rampCap = Infinity; // la rampe a rejoint la courbe — elle s'efface
      }
    }
    // D3/D4/D10 (audit v6) — cible calée sur le LIVRÉ de la semaine précédente :
    // charge ≤ dernière charge ×C22 · récup ≤ semaine précédente · affûtage jamais remontant.
    // R6.2/R6.3 (audit v6, B1) — plafond de référence : jamais plus que le même plan sans
    // blessure ni facteur d'âge, semaine par semaine. Garantie structurelle, pas un réglage.
    if (refWeekCaps && refWeekCaps[w] != null) targetH = Math.min(targetH, (refWeekCaps[w] / 60) * r.loadFactor);
    if (ph.id !== "taper" && !isRW && _prevChargeMin > 0) targetH = Math.min(targetH, (_prevChargeMin / 60) * C22_MAX_WEEKLY_GROWTH);
    if (isRW && _lastWeekMin > 0) targetH = Math.min(targetH, (_lastWeekMin / 60) * 0.95);
    if (ph.id === "taper" && _lastWeekMin > 0) targetH = Math.min(targetH, (_lastWeekMin / 60) * 0.98);

    // N2 — UNE SEMAINE COURTE NE PROMET PAS UNE SEMAINE ENTIÈRE.
    // La dernière semaine s'arrête au soir de la course : elle peut ne compter que 1 à 6
    // jours. La cible de la courbe est une dose HEBDOMADAIRE — appliquée telle quelle à trois
    // jours, elle annonçait 3 h là où le plan n'en tient que 2,3, et poussait la boucle R3.3
    // à gonfler les deux derniers jours avant le jour J pour « remplir ». C'est exactement ce
    // que le tail de repos masquait : le chiffre était faux avant la coupe aussi, la coupe l'a
    // seulement rendu visible. On proratise à la longueur réelle de la semaine.
    if (wd.length > 0 && wd.length < 7) targetH *= wd.length / 7;
    // R3.3 — ajuster le corps des séances à la cible (itératif)
    for (let it = 0; it < 5; it++) {
      renderWeek(wd);
      const cur = weekMin(wd) / 60;
      if (cur <= 0 || targetH <= 0) break;
      const f = targetH / cur;
      if (f > 0.99 && f < 1.01) break;
      scaleWeekBody(wd, f);
    }
    clampWeekBody(wd);
    renderWeek(wd);
    // C3 — si les planchers longue débordent, réduire le corps non-longue
    for (let g = 0; g < 3; g++) {
      const vh = weekMin(wd) / 60;
      if (vh <= capH * 1.03) break;
      const longH = wd.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.long && s.d !== "rs" ? s.min || 0 : 0), 0), 0) / 60;
      const nlH = vh - longH, room = Math.max(0, capH * 1.0 - longH);
      if (nlH <= 0) break;
      wd.forEach((d) => d.sessions.forEach((s) => {
        if (s.long || (s as BoundedSession).social || !s.steps) return;
        s.steps.forEach((b) => scaleBlock(b, room / nlH, s as BoundedSession));
      }));
      renderWeek(wd);
    }
    // C24/C24b — plancher de SÉANCE nage : avec des cibles honnêtes (sonde V2.1), R3.3
    // réduit aussi les séances de qualité — les blocs à répétitions n'ont pas de plancher
    // de total. On remonte la séance entière : ≥750m (non-débutant), ≥600m (débutant, D6 —
    // le manifeste interdit la « sortie piscine qui ne vaut pas le déplacement » à tous).
    if (guard(a.sport as string, "swimSessionFloors")) {
      const swFloor = r.beginner ? C24B_MIN_SWIM_SESSION_BEGINNER_M : 750;
      let raised: { d: GenDay; s: V1Session }[] = [];
      // A3 — LES PLANCHERS DE SÉANCE SONT SUSPENDUS EN RÉCUPÉRATION ET EN AFFÛTAGE.
      // Un plancher dit « en dessous, la séance ne vaut pas le déplacement » : c'est une règle
      // de semaine de CHARGE. Une semaine de décharge a pour objet de RETIRER, pas de garantir
      // qu'on se déplace — y remonter une séance au plancher fait mécaniquement remonter la
      // semaine, et c'est ainsi qu'une récup devenait plus lourde que la charge qu'elle
      // assimile (collision C24b × D4, plans de nage débutant saturés). Une séance sous le
      // plancher n'y est donc pas remontée : elle est retirée. Deux collisions indépendantes
      // (affûtage et récup) fermées par une seule reformulation, et une règle en moins.
      const dechargeWeek = isRW || ph.id === "taper";
      for (const d of wd)
        for (const s of d.sessions) {
          if (s.d !== "sw" || !s.steps || !s.steps.length) continue;
          const meters = s.steps.reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
          if (meters === 0 || meters >= swFloor) continue;
          if (dechargeWeek) {
            // …mais une semaine de décharge n'est pas une semaine VIDE. Retirer sans borne
            // vidait les quatre dernières semaines d'un plan de nage débutant saturé, où
            // TOUTES les séances sont au plancher : un affûtage sans une seule séance n'affûte
            // rien, il désentraîne. La dernière séance de la semaine reste, quelle que soit sa
            // taille — c'est elle qui maintient la spécificité pendant que le volume tombe.
            const restants = wd.reduce((t, dd) => t + dd.sessions.filter((x) => x.d !== "rs").length, 0);
            if (restants <= 1) continue;
            if (traceEnabled()) traceRecord({ pass: "plancher-piscine", weekNum: w + 1, date: d.date, sessionName: s.name, discipline: s.d, field: "suppression", before: meters, reason: "A3 (décharge : on retire, on ne remonte pas)" });
            const idx = d.sessions.indexOf(s);
            if (idx >= 0) d.sessions.splice(idx, 1);
            if (!d.sessions.some((x) => x.d !== "rs")) {
              d.charge = "off"; d.slot = "off";
              d.sessions = [{ d: "rs", name: "OFF (semaine de décharge)", det: "repos — sous le plancher de séance, une semaine de décharge retire au lieu de remonter", steps: [], min: 0 }];
            }
            continue;
          }
          const body = s.steps.filter((st) => st.role === "body" && st.distanceM != null).sort((x, y) => (y.reps || 1) * (y.distanceM || 0) - (x.reps || 1) * (x.distanceM || 0))[0];
          if (!body || !body.distanceM) continue;
          const missing = swFloor - meters;
          if ((body.reps || 1) > 1) body.reps = (body.reps || 1) + Math.ceil(missing / body.distanceM);
          else body.distanceM = Math.ceil((body.distanceM + missing) / 25) * 25;
          if (traceEnabled()) traceRecord({ pass: "plancher-piscine", weekNum: w + 1, date: d.date, sessionName: s.name, discipline: s.d, field: "distance", before: meters, after: swFloor, reason: r.beginner ? "C24b" : "C24" });
          raised.push({ d, s });
        }
      renderWeek(wd);
      // D6/B1 (audit v6) — si les remontées au plancher font déborder la semaine de sa
      // cible, la FRÉQUENCE cède, pas la taille : la plus petite séance remontée saute
      // (une piscine sous le plancher ne vaut pas le déplacement ; la gonfler au-delà du
      // budget gonflerait la semaine — mesuré +5% sur les plans blessés).
      // jamais en semaine de PEAK : c'est elle qui doit rester la plus grosse du plan
      //
      // R13.5 — LES MÈTRES CÈDENT AVANT LA FRÉQUENCE. La coupe ci-dessous supprimait une
      // séance ENTIÈRE (~10 % de la semaine) pour absorber un dépassement de plancher de ~2 %.
      // Sur un plan épaule où le plancher remonte une séance CHAQUE semaine, cette réponse
      // annulait exactement le gain C22 de +10 %/semaine : la courbe ne montait jamais —
      // mesuré, 20 semaines plates à 0,8 h/sem, promesse 2,9 h, et la spirale de réparation
      // derrière. On rend d'abord les mètres que le plancher a ajoutés, en réduisant les
      // séances AU-DESSUS du plancher (jamais en dessous, jamais la longue) ; la fréquence ne
      // cède que si les mètres ne suffisent pas.
      for (let g = 0; g < 3 && ph.id !== "peak" && raised.length && weekMin(wd) > targetH * 60 * 1.03; g++) {
        const overM = ((weekMin(wd) - targetH * 60 * 1.01) / 60) * 3000; // minutes → ~mètres (css ~2min/100m)
        const cands = wd.flatMap((d) => d.sessions)
          .filter((s) => s.d === "sw" && !s.long && s.steps && !raised.some((x) => x.s === s))
          .map((s) => ({ s, m: (s.steps || []).reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0) }))
          .filter((x) => x.m > swFloor + 50)
          .sort((x, y) => y.m - x.m);
        let gaveM = 0;
        for (const c of cands) {
          if (gaveM >= overM) break;
          const body = (c.s.steps || []).filter((st) => st.role === "body" && st.distanceM != null && (st.reps || 1) === 1)
            .sort((x, y) => (y.distanceM || 0) - (x.distanceM || 0))[0];
          if (!body || !body.distanceM) continue;
          const give = Math.min(body.distanceM - 200, c.m - swFloor, overM - gaveM);
          if (give < 50) continue;
          body.distanceM = Math.round((body.distanceM - give) / 25) * 25;
          gaveM += give;
        }
        if (gaveM > 0) renderWeek(wd);
        if (weekMin(wd) <= targetH * 60 * 1.03) break;
        // Cette coupe ne prend JAMAIS une séance de qualité. Elle existe pour absorber le
        // gonflement dû au plancher piscine (C24), et elle prenait la plus COURTE des séances
        // remontées — qui se trouve être la VO2max en nage (8×50 m, la seule assez petite pour
        // avoir besoin d'être remontée). Mesuré sur un swimrun à 4 h/sem : les six créneaux VO2
        // du plan disparaissaient un par un et le plan traversait 20 semaines sans puissance
        // aérobie maximale (`S-NOVO2`, banc v7).
        // Si la seule candidate est de qualité, on ne coupe pas : la semaine reste légèrement
        // au-dessus de sa cible, et `reconcileDeclaredVolume` aligne le chiffre ANNONCÉ sur le
        // prescrit (avec son avertissement). Une promesse d'heures se corrige ; un stimulus
        // supprimé pendant 20 semaines ne se rattrape pas.
        const easyRaised = raised.filter((x) => !(x.s.steps || []).some((b) => b.role === "body" && IS_QUALITY_ZONE(String(b.zone || ""))));
        if (!easyRaised.length) break;
        raised = easyRaised;
        raised.sort((x, y) => (x.s.min || 0) - (y.s.min || 0));
        const victim = raised.shift()!;
        if (victim.d.forced || victim.s.long) continue;
        const idx = victim.d.sessions.indexOf(victim.s);
        if (idx < 0) continue;
        victim.d.sessions.splice(idx, 1);
        if (!victim.d.sessions.some((x) => x.d !== "rs")) {
          victim.d.charge = "off";
          victim.d.slot = "off";
          victim.d.sessions = [{ d: "rs", name: "OFF (fréquence nage)", det: "repos — une séance piscine sous le plancher ne vaut pas le déplacement : la fréquence cède, pas la taille", steps: [] }];
        }
        renderWeek(wd);
      }
    }

    // D5 (audit v6) — C15 s'applique à la SÉANCE (tous blocs confondus), pas au seul bloc
    // body : échauffement 200m + corps 850m + retour 100m = 1150m violait le plafond en
    // silence. Le corps cède, jamais l'échauffement ni le retour au calme (valeur technique).
    if (r.beginner && guard(a.sport as string, "swimSessionFloors")) {
      let changed = false;
      for (const d of wd)
        for (const s of d.sessions) {
          if (s.d !== "sw" || !s.steps || !s.steps.length) continue;
          const tot = s.steps.reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
          if (tot <= C15_BEGINNER_SWIM_SESSION_CAP_M) continue;
          const aux = s.steps.filter((st) => st.role !== "body").reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
          const bodyTot = tot - aux;
          const bodyCap = Math.max(100, C15_BEGINNER_SWIM_SESSION_CAP_M - aux);
          if (bodyTot <= bodyCap) continue;
          const f = bodyCap / bodyTot;
          for (const st of s.steps) {
            if (st.role !== "body" || st.distanceM == null) continue;
            if ((st.reps || 1) > 1) st.reps = Math.max(1, Math.floor((st.reps || 1) * f));
            else st.distanceM = Math.max(100, Math.floor((st.distanceM * f) / 25) * 25);
          }
          changed = true;
        }
      if (changed) renderWeek(wd);
    }
    // D7 (audit v6) — C23 s'applique au TOTAL de séance course débutant (≤3h) : le cap de
    // bloc laissait les footings sans bornes gonfler à 3h40 via R3.3.
    if (r.beginner) {
      let changed = false;
      for (const d of wd)
        for (const s of d.sessions) {
          if (s.d !== "rn" || !s.steps || !s.steps.length || (s.min || 0) <= C23_BEGINNER_LONG_RUN_CAP_MIN) continue;
          let over = (s.min || 0) - C23_BEGINNER_LONG_RUN_CAP_MIN;
          const bodies = s.steps.filter((st) => st.role === "body" && st.durationMin != null).sort((x, y) => (y.reps || 1) * (y.durationMin || 0) - (x.reps || 1) * (x.durationMin || 0));
          for (const st of bodies) {
            if (over <= 0) break;
            if ((st.reps || 1) > 1) {
              const cut = Math.min(st.reps! - 1, Math.ceil(over / st.durationMin!));
              st.reps = st.reps! - cut;
              over -= cut * st.durationMin!;
            } else {
              const cut = Math.min(st.durationMin! - 20, Math.ceil(over));
              if (cut > 0) { st.durationMin = st.durationMin! - cut; over -= cut; }
            }
          }
          changed = true;
        }
      if (changed) renderWeek(wd);
    }
    // R3.13 — affûtage : si les planchers bloquent, la fréquence cède
    if (ph.id === "taper" && _maxChargeMin > 0) {
      for (let g = 0; g < 3; g++) {
        if (weekMin(wd) <= _maxChargeMin * R313_TAPER_MAX_VS_PEAK) break;
        const active = wd.filter((d) => d.charge !== "off" && d.sessions.some((s) => s.d !== "rs"));
        // C13c — le plancher d'échauffement de 10 min alourdit mécaniquement les séances
        // d'affûtage (qui sont courtes : rappels d'allure, lignes droites). Sur les petits
        // formats, l'ancien butoir de 3 jours empêchait alors d'atteindre les −40 % de R3.13
        // (mesuré : 62 % du pic sur 9 combinaisons 5k/reprise). Deux séances dans la dernière
        // semaine avant un 5k, c'est un affûtage normal — trois séances mal réduites, non.
        // `keepsMainDiscipline` continue d'orienter la victime : on ne vide pas la discipline.
        if (active.length <= 2) break;
        const cand0 = active.filter((d) => d.charge === "facile" && !d.forced && !d.sessions.some((s) => s.long || s.brick));
        if (!cand0.length) break;
        const candK = cand0.filter((d) => keepsMainDiscipline(wd, d));
        let cand = candK.length ? candK : cand0;
        // R13.3 — même orientation que le filet : la seule nage de la semaine d'affûtage est
        // épargnée tant qu'une autre victime existe (les sensations d'eau se perdent vite).
        if (_keepTaperSwim) {
          const spared = cand.filter((d) => !(d.sessions.some((s) => s.d === "sw")
            && !wd.some((o) => o !== d && o.sessions.some((s) => s.d === "sw"))));
          if (spared.length) cand = spared;
        }
        const dayMin = (d2: GenDay) => d2.sessions.reduce((t, s) => t + (s.min || 0), 0);
        const victim = cand.reduce((x, y) => (dayMin(y) < dayMin(x) ? y : x));
        victim.charge = "off";
        victim.slot = "off";
        victim.sessions = [{ d: "rs", name: "OFF (affûtage)", det: "repos — la fraîcheur du jour J se construit maintenant", steps: [] }];
      }
    }
    // D10 (audit v6) — l'affûtage ne remonte JAMAIS : les gabarits de la semaine de course
    // (rappels race-pace un peu plus longs) + la quantification des répétitions faisaient
    // regonfler la 2e semaine d'affûtage. Convergence forcée vers ≤ semaine précédente ;
    // si les planchers bloquent, une séance (pas un jour) cède — en tri, les jours
    // d'affûtage sont tous « dur », la coupe par jour ne trouvait aucun candidat.
    if (ph.id === "taper" && _lastWeekMin > 0) {
      for (let g = 0; g < 6 && weekMin(wd) > _lastWeekMin; g++) {
        scaleWeekBody(wd, Math.max(0.6, (_lastWeekMin * 0.97) / weekMin(wd)));
        renderWeek(wd);
      }
      for (let g = 0; g < 3 && weekMin(wd) > _lastWeekMin && nSessIn(wd) > 2; g++) {
        if (!cutSmallestSessionIn(wd)) break;
        renderWeek(wd);
      }
    }

    // D3/D4/D10 (audit v6) — si les planchers de séance empêchent encore de tenir la
    // courbe livrée (récup > semaine précédente, affûtage remontant, saut > C22), la
    // fréquence cède : le jour facile le plus léger passe OFF, comme en R3.13.
    {
      const delivCapMin = isRW || ph.id === "taper"
        ? (_lastWeekMin > 0 ? _lastWeekMin : Infinity)
        : (_prevChargeMin > 0 ? _prevChargeMin * C22_MAX_WEEKLY_GROWTH : Infinity);
      // 1) réduire les corps de séance vers le cap livré (D3 — sur les petites semaines à
      // 3 jours, il n'y a rien à couper : la réduction doit mordre d'abord)
      for (let g = 0; g < 3 && Number.isFinite(delivCapMin) && weekMin(wd) > delivCapMin + 1; g++) {
        const before = weekMin(wd);
        scaleWeekBody(wd, Math.max(0.8, delivCapMin / before));
        renderWeek(wd);
        if (before - weekMin(wd) < 0.5) break;
      }
      // 2) récup/affûtage : la fréquence peut descendre à 2 jours actifs (la fraîcheur
      // prime) ; semaine de charge : jamais sous 3 (la régularité prime).
      const minActive = isRW || ph.id === "taper" ? 2 : 3;
      for (let g = 0; g < 4 && weekMin(wd) > delivCapMin + 1; g++) {
        if (!cutLightestEasyDay(wd, isRW ? "une semaine de récupération n'est jamais plus chargée que la précédente" : ph.id === "taper" ? "l'affûtage ne remonte jamais" : "la progression reste ≤ +10% de semaine en semaine", minActive)) break;
        renderWeek(wd);
      }
      // R13.5 — LA COUPE REND CE QU'ELLE A PRIS EN TROP. Retirer un JOUR entier est un
      // quantum grossier : sur les plans épaule, la coupe faisait passer la semaine SOUS sa
      // cible (1,63 h de planchers → coupe → 1,33 h pour une cible à 1,37), et le ratchet C22
      // « livré ×1,1 » repartait de la valeur sous-livrée. Bilan mesuré : +10 % de cible et
      // −10 % de coupe s'annulaient chaque semaine, 20 semaines PLATES à 0,8-1,4 h pendant que
      // la promesse affichait 2,9 h — puis la dominance du pic broyait le reste. Après la
      // coupe, les séances restantes regonflent vers la cible : la coupe paie les planchers,
      // le re-remplissage rend le volume que le jour retiré emportait en trop.
      // En récup et en affûtage aussi : sous-livrer LÉGÈREMENT y est une vertu, sous-livrer de
      // 45 % sous sa propre courbe n'en est pas une — mesuré : l'affûtage du Full tombait de
      // 445 à 165 min (−63 % d'un coup, puis plat), quand Bosquet 2007 prescrit −40/−60 %.
      // Le plafond `min(cible, semaine précédente)` préserve la décroissance R5.3 et D4.
      {
        const refillCap = Math.min(Number.isFinite(delivCapMin) ? delivCapMin : Infinity, targetH * 60);
        for (let it = 0; it < 3 && Number.isFinite(refillCap) && weekMin(wd) < refillCap * 0.97; it++) {
          const cur = weekMin(wd);
          if (cur <= 0) break;
          scaleWeekBody(wd, (refillCap * 0.99) / cur);
          renderWeek(wd);
          if (weekMin(wd) - cur < 0.5) break; // les plafonds de séance bloquent : on s'arrête là
        }
      }
    }

    const volReal = Math.round((weekMin(wd) / 60) * 10) / 10;
    if (!isRW && ph.id !== "taper") _maxChargeMin = Math.max(_maxChargeMin, weekMin(wd));
    _lastWeekMin = weekMin(wd);
    if (!isRW && ph.id !== "taper") _prevChargeMin = _lastWeekMin;
    
    wl.push({ num: w + 1, phase: ph, vol: volReal, vol_declared: Math.round(targetH * 10) / 10, vol_real: volReal, days: wd, isRecup: isRW });
  }

  // D2 (audit v6) — la semaine PIC domine le plan LIVRÉ. Sur un plan saturé par les
  // planchers (petit budget nage débutant : toutes les semaines ~1h), une semaine
  // spec/base pouvait dépasser le peak — la boucle de réparation partait alors en
  // chasse (mauvaise semaine, nouvelles violations). Ici : la fréquence de la semaine
  // fautive cède, jamais celle du peak ; et l'affûtage repasse sous R3.13 du pic re-mesuré.
  {
    const wmW = (w: V1Week) => weekMin(w.days as GenDay[]);
    const nSess = (w: V1Week) => nSessIn(w.days as GenDay[]);
    // Sur les petits plans, la cadence de récup peut tomber PILE sur la semaine de phase
    // peak : la référence devient alors la meilleure semaine peak tout court — sinon la
    // passe se désactivait et la réparation aval détruisait la semaine max (mesuré S4 → 0min).
    const peakNR = wl.filter((w) => w.phase.id === "peak" && !w.isRecup).map(wmW);
    const peakAny = wl.filter((w) => w.phase.id === "peak").map(wmW);
    const peakBest = Math.max(0, ...(peakNR.length ? peakNR : peakAny));
    if (peakBest > 0) {
      // (nage : la dominance du pic se juge aux MÈTRES côté auditeur — pas besoin de
      // sur-couper ici, ce qui créait des sauts de charge en aval)
      const domCap = 1.02;
      for (const w of wl) {
        if (w.phase.id === "peak" || w.phase.id === "taper" || w.isRecup) continue;
        // 1) réduire les corps de séance vers ≤ pic (les séances au plancher ne bougent pas)
        for (let g = 0; g < 4 && wmW(w) > peakBest * domCap; g++) {
          const before = wmW(w);
          scaleWeekBody(w.days as GenDay[], Math.max(0.8, (peakBest * (domCap - 0.04)) / before));
          renderWeek(w.days as GenDay[]);
          if (before - wmW(w) < 0.5) break; // les planchers bloquent — passer à la coupe
        }
        // 2) plancher de coupe : couper plus bas recréerait un saut vers la suivante
        for (let g = 0; g < 3 && wmW(w) > peakBest * domCap && nSess(w) > 3; g++) {
          if (!cutSmallestSessionIn(w.days as GenDay[], peakBest * (domCap - 0.09))) break;
          renderWeek(w.days as GenDay[]);
        }
        const vr = Math.round((wmW(w) / 60) * 10) / 10;
        if (vr < w.vol) { w.vol = vr; w.vol_real = vr; }
      }
      for (const w of wl.filter((x) => x.phase.id === "taper")) {
        for (let g = 0; g < 3 && wmW(w) > peakBest * R313_TAPER_MAX_VS_PEAK && nSess(w) > 2; g++) {
          if (!cutSmallestSessionIn(w.days as GenDay[])) break;
          renderWeek(w.days as GenDay[]);
        }
        const vr = Math.round((wmW(w) / 60) * 10) / 10;
        if (vr < w.vol) { w.vol = vr; w.vol_real = vr; }
      }
      // et l'affûtage reste DÉCROISSANT après ces coupes (les coupes indépendantes par
      // semaine pouvaient inverser deux semaines d'affûtage voisines)
      let prevT = 0;
      for (const w of wl) {
        const m0 = wmW(w);
        if (w.phase.id !== "taper") { prevT = m0; continue; }
        if (prevT > 0 && m0 > prevT) {
          for (let g = 0; g < 4 && wmW(w) > prevT; g++) {
            const before = wmW(w);
            scaleWeekBody(w.days as GenDay[], Math.max(0.7, (prevT * 0.97) / before));
            renderWeek(w.days as GenDay[]);
            if (before - wmW(w) < 0.5) break;
          }
          for (let g = 0; g < 3 && wmW(w) > prevT && nSess(w) > 2; g++) {
            if (!cutSmallestSessionIn(w.days as GenDay[])) break;
            renderWeek(w.days as GenDay[]);
          }
          const vr = Math.round((wmW(w) / 60) * 10) / 10;
          if (vr < w.vol) { w.vol = vr; w.vol_real = vr; }
        }
        prevT = wmW(w);
      }
      // et les coupes ci-dessus ne recréent JAMAIS une récup plus chargée que sa voisine
      let prevM = 0;
      for (const w of wl) {
        if (w.isRecup && prevM > 0) {
          for (let g = 0; g < 3 && wmW(w) > prevM && nSess(w) > 1; g++) {
            if (!cutSmallestSessionIn(w.days as GenDay[])) break;
            renderWeek(w.days as GenDay[]);
          }
          const vr = Math.round((wmW(w) / 60) * 10) / 10;
          if (vr < w.vol) { w.vol = vr; w.vol_real = vr; }
        }
        prevM = wmW(w);
      }
    }
  }

  // C24/C24b/C15 — fenêtres de SÉANCE nage, LE MOT FINAL après toutes les passes de
  // lissage (qui peuvent redescendre ou regonfler une séance) : ≥750m non-débutant,
  // [600, 850]m débutant. Le corps cède ou monte — jamais l'échauffement ni le retour au calme.
  if (guard(a.sport as string, "swimSessionFloors")) {
    const swFloorF = r.beginner ? C24B_MIN_SWIM_SESSION_BEGINNER_M : 750;
    for (const w of wl) {
      const wd2 = w.days as GenDay[];
      // A3 — même reformulation qu'en amont : en décharge, on retire, on ne remonte pas.
      const decharge = w.isRecup || w.phase.id === "taper";
      let changed = false;
      for (const d of wd2)
        for (const s of [...d.sessions]) {
          if (s.d !== "sw" || !s.steps || !s.steps.length) continue;
          const totOf = () => s.steps!.reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
          const body = s.steps.filter((st) => st.role === "body" && st.distanceM != null).sort((x, y) => (y.reps || 1) * (y.distanceM || 0) - (x.reps || 1) * (x.distanceM || 0))[0];
          if (!body || !body.distanceM) continue;
          const t0 = totOf();
          if (decharge && t0 > 0 && t0 < swFloorF) {
            const restants = wd2.reduce((t, dd) => t + dd.sessions.filter((x) => x.d !== "rs").length, 0);
            if (restants <= 1) continue;
            const idx = d.sessions.indexOf(s);
            if (idx >= 0) d.sessions.splice(idx, 1);
            if (!d.sessions.some((x) => x.d !== "rs")) {
              d.charge = "off"; d.slot = "off";
              d.sessions = [{ d: "rs", name: "OFF (semaine de décharge)", det: "repos — sous le plancher de séance, une semaine de décharge retire au lieu de remonter", steps: [], min: 0 }];
            }
            changed = true;
            continue;
          }
          if (t0 > 0 && t0 < swFloorF) {
            const missing = swFloorF - t0;
            if ((body.reps || 1) > 1) body.reps = (body.reps || 1) + Math.ceil(missing / body.distanceM);
            else body.distanceM = Math.ceil((body.distanceM + missing) / 25) * 25;
            changed = true;
          }
          if (r.beginner && totOf() > C15_BEGINNER_SWIM_SESSION_CAP_M) {
            const aux = s.steps.filter((st) => st.role !== "body").reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
            const bodyCap = Math.max(100, C15_BEGINNER_SWIM_SESSION_CAP_M - aux);
            const bodyTot = totOf() - aux;
            if (bodyTot > bodyCap) {
              const f = bodyCap / bodyTot;
              for (const st of s.steps) {
                if (st.role !== "body" || st.distanceM == null) continue;
                if ((st.reps || 1) > 1) st.reps = Math.max(1, Math.floor((st.reps || 1) * f));
                else st.distanceM = Math.max(100, Math.floor((st.distanceM * f) / 25) * 25);
              }
              changed = true;
            }
          }
        }
      if (changed) {
        renderWeek(wd2);
        const vr = Math.round((weekMin(wd2) / 60) * 10) / 10;
        w.vol = vr;
        w.vol_real = vr;
      }
    }
    // Les remontées au plancher peuvent regonfler une semaine que le lissage avait
    // réduite : re-vérification ORDONNÉE des caps livrés (saut ≤ ×1.1, récup/affûtage
    // jamais remontants) — en coupant des séances ENTIÈRES, les fenêtres restent intactes.
    // Rejouée après la passe de dominance : les deux contraintes doivent tenir ENSEMBLE.
    const harmonizeOrdered = (): void => {
      let prevCharge = 0, prevWeek = 0, maxWeek = 0;
      for (const w of wl) {
        const wd2 = w.days as GenDay[];
        const isT = w.phase.id === "taper";
        let cap = w.isRecup || isT
          ? (prevWeek > 0 ? prevWeek : Infinity)
          : (prevCharge > 0 ? prevCharge * C22_MAX_WEEKLY_GROWTH : Infinity);
        // La semaine de PEAK est le sommet de la courbe : elle ne descend JAMAIS sous la
        // plus grosse semaine passée (dominance), mais elle n'échappe pas au seuil DUR de
        // saut (C22-dur) — sinon un pic naturellement plus fourni en séances créait un
        // saut de charge que la réparation ne pouvait pas résorber (planchers).
        // ARBITRAGE ASSUMÉ (audit v6) : deux règles se disputent la semaine de pic — « la
        // semaine max est en phase peak » (structure) et C22 « +10% max » (progression).
        // Sur les plans saturés par les planchers de séance, les deux ne sont pas toujours
        // satisfiables : on tient la structure ET le seuil DUR (+25% livré, jamais franchi),
        // en acceptant un pic jusqu'à +19% quand la dominance l'exige. 4 profils tri
        // concernés, documentés dans ARCHITECTURE.md — mieux vaut un pic un peu marqué
        // qu'un pic plus léger que la base (ce qui n'est plus un plan périodisé).
        if (w.phase.id === "peak" && !w.isRecup) {
          cap = Math.max(maxWeek, prevCharge > 0 ? prevCharge * C22_AUDIT_HARD_JUMP * 0.95 : Infinity);
        }
        const minS = w.isRecup || isT ? 2 : 3;
        for (let g = 0; g < 3 && weekMinSmooth(wd2) > cap + 1 && nSessIn(wd2) > minS; g++) {
          if (!cutSmallestSessionIn(wd2)) break;
          renderWeek(wd2);
        }
        const vr = Math.round((weekMin(wd2) / 60) * 10) / 10;
        if (vr !== w.vol) { w.vol = vr; w.vol_real = vr; }
        prevWeek = weekMinSmooth(wd2);
        if (!w.isRecup && !isT) {
          prevCharge = prevWeek;
          maxWeek = Math.max(maxWeek, prevWeek);
        }
      }
    };
    harmonizeOrdered();
    // Plan saturé par les planchers (toutes les semaines ≈ n séances × plancher) : si une
    // semaine de charge dépasse encore le pic, raboter tout le plan sous les planchers
    // serait absurde — le PIC MONTE d'une séance technique douce (dans le budget déclaré).
    {
      const wmW2 = (w: V1Week) => weekMin(w.days as GenDay[]);
      const bestPeakW = wl.filter((w) => w.phase.id === "peak" && !w.isRecup).sort((x, y) => wmW2(y) - wmW2(x))[0];
      if (bestPeakW) {
        const maxCharge = Math.max(0, ...wl.filter((w) => !w.isRecup && w.phase.id !== "taper" && w !== bestPeakW).map(wmW2));
        // le pic monte, mais JAMAIS au-delà de +10% de la semaine qui le précède (C22)
        const prevOfPeak = wl.filter((w) => w.num < bestPeakW.num && !w.isRecup && w.phase.id !== "taper").pop();
        const raiseCap = Math.min(prevOfPeak ? wmW2(prevOfPeak) * C22_MAX_WEEKLY_GROWTH : Infinity, capH * 60);
        for (let g = 0; g < 2 && wmW2(bestPeakW) < maxCharge && nSessIn(bestPeakW.days as GenDay[]) < r.budgetPerWeek; g++) {
          const wd2 = bestPeakW.days as GenDay[];
          // R5.5 — le pic monte d'une séance TECHNIQUE DOUCE : on ne clone qu'une séance facile
          // (jamais un seuil : le pic n'a pas à gagner de l'intensité par une passe de volume),
          // et le clone porte un nom PROPRE. Cloner à l'identique donnait « Seuil CSS +
          // plaquettes » deux fois dans la même semaine — un athlète qui lit deux fois la même
          // carte en conclut, à raison, que le plan ne le regarde pas.
          const isQualitySess = (s: V1Session) => (s.steps || []).some((b) =>
            b.role === "body" && (/\.(vo2|thr|css|rp|ss|frc|speed|mara)$/.test(String(b.zone || "")) || (b.reps || 1) > 1));
          const donor = wd2.flatMap((d) => d.sessions).filter((s) => s.d === "sw" && s.steps && s.steps.length && !s.long && !isQualitySess(s)).sort((x, y) => (x.min || 0) - (y.min || 0))[0];
          const restDay = wd2.find((d) => !d.forced && !d.sessions.some((s) => s.d !== "rs"));
          if (!donor || !restDay) break;
          if (wmW2(bestPeakW) + (donor.min || 0) > raiseCap) break;
          const clone = structuredClone(donor) as V1Session;
          const takenNames = new Set(wd2.flatMap((d) => d.sessions.map((s) => s.name)));
          for (let sfx = 0; takenNames.has(clone.name); sfx++)
            clone.name = donor.name + " (volume du pic" + (sfx > 0 ? " " + (sfx + 1) : "") + ")";
          restDay.charge = "facile";
          restDay.slot = "facileR";
          restDay.sessions = [clone];
          renderWeek(wd2);
          const vr = Math.round((wmW2(bestPeakW) / 60) * 10) / 10;
          bestPeakW.vol = vr;
          bestPeakW.vol_real = vr;
        }
        // Si le pic ne peut pas monter (budget/C22), ce sont les semaines de charge qui le
        // dépassent qui cèdent une séance — la hiérarchie du plan est structurelle, elle
        // ne se négocie pas contre le confort d'une semaine de base.
        const peakM = wmW2(bestPeakW);
        for (const w of wl) {
          if (w === bestPeakW || w.isRecup || w.phase.id === "taper") continue;
          for (let g = 0; g < 3 && wmW2(w) > peakM && nSessIn(w.days as GenDay[]) > 2; g++) {
            if (!cutSmallestSessionIn(w.days as GenDay[])) break;
            renderWeek(w.days as GenDay[]);
          }
          const vr = Math.round((wmW2(w) / 60) * 10) / 10;
          if (vr !== w.vol) { w.vol = vr; w.vol_real = vr; }
        }
      }
    }
    harmonizeOrdered(); // les coupes de dominance ne cassent ni C22 ni la monotonie récup/affûtage
  }

  // R6.2/R6.3 (audit v6, B1) — dernier mot : le LIVRÉ de chaque semaine ne dépasse jamais
  // celui du plan de référence (sans blessure/âge). Les planchers de séance ne peuvent plus
  // faire d'un plan « blessé » un plan plus lourd — la fréquence cède en dernier recours.
  if (refWeekCaps) {
    for (let i = 0; i < wl.length; i++) {
      const w = wl[i];
      const capMin = refWeekCaps[i];
      if (capMin == null) continue;
      const wd2 = w.days as GenDay[];
      for (let g = 0; g < 4 && weekMin(wd2) > capMin; g++) {
        const before = weekMin(wd2);
        scaleWeekBody(wd2, Math.max(0.75, capMin / before));
        renderWeek(wd2);
        if (before - weekMin(wd2) < 0.5) break;
      }
      for (let g = 0; g < 3 && weekMin(wd2) > capMin && nSessIn(wd2) > 2; g++) {
        if (!cutSmallestSessionIn(wd2)) break;
        renderWeek(wd2);
      }
      const vr = Math.round((weekMin(wd2) / 60) * 10) / 10;
      if (vr !== w.vol) { w.vol = vr; w.vol_real = vr; }
    }
  }

  // ---- R7 TRAIL : les DEUX axes verticaux, puis la règle de récupération excentrique ----
  // Le temps est déjà piloté par la courbe (bands + C22). Le D+ et le D− ont leur PROPRE
  // courbe et leur propre plafond : les mettre à l'échelle après coup est la seule façon de
  // garantir T3/T4 sans que le scaling du temps les écrase.
  if (r.trail && r.trailVert) {
    const vert = r.trailVert;
    const stepsOf = (w: V1Week) => (w.days as GenDay[]).flatMap((d) => d.sessions.flatMap((s) => s.steps || []));
    const upOf = (w: V1Week) => stepsOf(w).reduce((t, st) => t + (st.dplusM || 0) * (st.reps || 1), 0);
    const downOf = (w: V1Week) => stepsOf(w).reduce((t, st) => t + (st.dmoinsM || 0) * (st.reps || 1), 0);
    // Cohérence physique d'abord : un bloc en montée de N minutes à X m/h fait N/60×X mètres.
    // Sans ce recalcul, le scaling du TEMPS (R3.3) laissait le D+ figé à sa valeur initiale.
    // T1b (audit v7) — le D+ d'un bloc ne dépasse jamais ce que le terrain permet. Le tapis
    // lève la contrainte en MONTÉE (c'est justement sa fonction), pas en descente.
    const accessKey = a.train_dplus_access || "collines";
    const perBlockCap = a.treadmill === "oui"
      ? TRAIL_ACCESS.collines.perBlock
      : (TRAIL_ACCESS[accessKey] || TRAIL_ACCESS.collines).perBlock;
    const syncUpFromDuration = (w: V1Week) => {
      for (const st of stepsOf(w)) {
        if (st.gradient !== "up" || !st.durationMin || !st.dplusM) continue;
        const z = String(st.zone || "");
        const share = z === "tr.vam" ? 1.0 : z === "tr.asc" ? 0.89 : z === "tr.climb" ? 0.76 : z === "tr.hike" ? 0.52 : 0.42;
        st.dplusM = Math.max(20, Math.round((st.durationMin / 60) * r.trail!.vam * share / 5) * 5);
      }
      for (const st of stepsOf(w)) {
        if (!st.dplusM || st.dplusM <= perBlockCap) continue;
        st.dplusM = perBlockCap; // le bloc s'aligne sur la bosse disponible, on la répète
        if (st.dmoinsM && st.dmoinsM > perBlockCap) st.dmoinsM = perBlockCap;
      }
    };
    const scaleVert = (w: V1Week, fUp: number, fDown: number) => {
      for (const st of stepsOf(w)) {
        if (st.dplusM) st.dplusM = Math.max(20, Math.round((st.dplusM * fUp) / 10) * 10);
        if (st.dmoinsM) st.dmoinsM = Math.max(20, Math.round((st.dmoinsM * fDown) / 10) * 10);
        // T2c — cohérence physique : sur une BOUCLE (bloc `rolling` ou `flat`), on redescend
        // exactement ce qu'on a monté, jamais plus. Sans cette borne, la mise à l'échelle
        // indépendante des deux axes affichait « D+ 460m / D− 540m » sur une sortie longue :
        // impossible sur le terrain, et un entraîneur le verrait au premier coup d'œil.
        // Seuls les blocs de DESCENTE dédiés (navette, remontée mécanique) portent du D−
        // sans D+ correspondant — c'est justement leur raison d'être.
        if (st.gradient !== "down" && st.dmoinsM && (st.dplusM || 0) > 0 && st.dmoinsM > st.dplusM!) st.dmoinsM = st.dplusM!;
        // T1b — le plafond de terrain s'applique APRÈS la mise à l'échelle : sinon la courbe
        // verticale regonfle le bloc au-dessus de ce que le relief accessible permet.
        if (st.dplusM && st.dplusM > perBlockCap) st.dplusM = perBlockCap;
        if (st.dmoinsM && st.dmoinsM > perBlockCap) st.dmoinsM = perBlockCap;
      }
    };
    // T3 — aucune qualité ni descente dans les 48h suivant une sortie à fort D− : les
    // dommages excentriques culminent 24-48h après l'effort. La règle était DÉCLARÉE dans le
    // registre depuis R4 ; elle s'applique enfin. La sortie LONGUE n'est jamais supprimée
    // (c'est le pivot de la semaine) : elle perd son dénivelé et son intensité, pas sa place.
    const applyEccentricRecovery = () => {
      const allDays = wl.flatMap((w) => (w.days as GenDay[]).map((d) => ({ w, d })));
      const dayDown = (d: GenDay) => d.sessions.reduce((t, s) => t + (s.steps || []).reduce((u, st) => u + (st.dmoinsM || 0) * (st.reps || 1), 0), 0);
      for (let i = 0; i < allDays.length; i++) {
        if (dayDown(allDays[i].d) < T3_ECCENTRIC_RECOVERY.thresholdDmoins) continue;
        for (const nxt of allDays.slice(i + 1, i + 1 + T3_ECCENTRIC_RECOVERY.minGapDays)) {
          const d = nxt.d;
          if (d.forced || !d.sessions.some((s) => s.d !== "rs")) continue;
          const hasLong = d.sessions.some((s) => s.long);
          const isHard = d.charge === "dur";
          const hasDown = dayDown(d) > 200;
          if (!isHard && !hasDown) continue;
          if (hasLong) {
            // la longue reste, à plat et sans intensité
            for (const sess of d.sessions) {
              for (const st of sess.steps || []) {
                st.dmoinsM = 0;
                if (st.gradient === "down") st.gradient = "flat";
                if (st.gradient === "up" || st.gradient === "rolling") { st.gradient = "flat"; st.dplusM = 0; }
                if (st.role === "body") st.zone = "tr.easyup";
              }
              // la consigne d'origine (répétition ravito, matériel…) est CONSERVÉE : on ajoute
              // la raison de l'allègement, on n'efface pas l'objectif de la séance.
              sess.note = "Cette sortie tombe moins de 48 h après une grosse descente : elle reste au programme mais À PLAT et très souple. Les micro-lésions des cuisses culminent maintenant — le volume facile les répare, le dénivelé les aggraverait." + (sess.note ? " " + sess.note : "");
            }
            d.charge = "facile";
          } else {
            d.charge = "facile";
            d.slot = "facile2";
            d.sessions = [{
              d: "rn", recovery: true, name: "Footing plat de récupération (post-descente)",
              note: "La grosse descente d'il y a moins de 48 h a créé des micro-lésions dans tes cuisses : elles culminent maintenant. Aucune qualité, aucune descente aujourd'hui — du plat très souple, c'est ce qui répare le plus vite.",
              det: "",
              steps: [{ role: "body", durationMin: 30, gradient: "flat", zone: "tr.easyup", mode: "run", surface: "route" } as V1Step],
            } as V1Session];
          }
          renderWeek(nxt.w.days as GenDay[]);
        }
      }
    };
    applyEccentricRecovery();

    // T3, CONTRÔLE PAR SEMAINE — la règle des 48 h est appliquée avant la mise à l'échelle
    // verticale (elle doit l'être : elle change la structure de la semaine). Mais la courbe peut
    // ensuite pousser une journée AU-DESSUS du seuil, et le plan livré viole alors une règle
    // qu'il croyait respecter — mesuré : 1 040 m de D− suivis d'une séance de qualité 48 h après.
    // On ne re-structure pas la semaine (l'aplatir casse la progression D+/D−) : on ramène la
    // DESCENTE DU JOUR juste sous le seuil, et seulement quand la violation existe vraiment.
    // Appelé DANS la boucle de courbe pour que la progression soit mesurée sur ces valeurs-là :
    // sinon les deux règles se contredisent (T2b lit un chiffre que T3 modifiera après lui).
    const dayDmoins = (d: GenDay) => d.sessions.reduce((t, sx) => t + (sx.steps || []).reduce((u, st) => u + (st.dmoinsM || 0) * (st.reps || 1), 0), 0);
    const clampEccentricDays = (w: V1Week) => {
      const wd = w.days as GenDay[];
      for (let i = 0; i < wd.length; i++) {
        const tot = dayDmoins(wd[i]);
        if (tot < T3_ECCENTRIC_RECOVERY.thresholdDmoins) continue;
        const conflict = wd.slice(i + 1, i + 1 + T3_ECCENTRIC_RECOVERY.minGapDays)
          .some((d) => d.charge === "dur" || dayDmoins(d) > 200);
        if (!conflict) continue; // grosse descente suivie de repos : c'est exactement la règle
        const f = (T3_ECCENTRIC_RECOVERY.thresholdDmoins * 0.95) / tot;
        for (const sess of wd[i].sessions)
          for (const st of sess.steps || []) if (st.dmoinsM) st.dmoinsM = Math.max(20, Math.round((st.dmoinsM * f) / 10) * 10);
      }
    };


    // Courbe verticale : même forme que la courbe de temps (bands), plafonnée par T1, et
    // progressant au plus de T2 (+12%) / T2b (+8%) d'une semaine de charge à la suivante.
    let prevUp = 0, prevDown = 0;
    for (let pass = 0; pass < 2; pass++) {
    prevUp = 0; prevDown = 0;
    for (let i = 0; i < wl.length; i++) {
      const w = wl[i];
      const band = Lval(w.phase.id, w.phase.weeks > 1 ? (w.num - 1 - w.phase.start) / (w.phase.weeks - 1) : 1);
      let tgtUp = vert.dplusPeak * band;
      let tgtDown = vert.dmoinsPeak * band;
      if (w.isRecup) { tgtUp *= RECUP_WEEK_FACTOR; tgtDown *= RECUP_WEEK_FACTOR; }
      if (w.phase.id !== "taper" && !w.isRecup) {
        if (prevUp > 0) tgtUp = Math.min(tgtUp, prevUp * T2_DPLUS_GROWTH);
        if (prevDown > 0) tgtDown = Math.min(tgtDown, prevDown * T2_DMOINS_GROWTH);
      }
      syncUpFromDuration(w);
      const curUp = upOf(w), curDown = downOf(w);
      if (curUp > 0 || curDown > 0) {
        scaleVert(w, curUp > 0 ? tgtUp / curUp : 1, curDown > 0 ? tgtDown / curDown : 1);
        clampEccentricDays(w); // T3 avant que la progression ne lise les valeurs de la semaine
        renderWeek(w.days as GenDay[]);
      }
      if (w.phase.id !== "taper" && !w.isRecup) { prevUp = upOf(w); prevDown = downOf(w); }
    }
    }
    // Volumes recalculés après ces passes (le D+ ne change pas les minutes, la substitution T3 oui)
    for (const w of wl) {
      const vr = Math.round((weekMin(w.days as GenDay[]) / 60) * 10) / 10;
      if (vr !== w.vol) { w.vol = vr; w.vol_real = vr; }
    }
  }

  if (_rampWeeks > 0) {
    r.decisions.push({
      id: "R10-depart", what: "Départ calé sur ton volume récent",
      val: volRecent + "h/sem" + (_volArb.source === "mesure" ? " (mesuré)" : "") + " → montée ≤ +10%/semaine sur " + _rampWeeks + " semaine" + (_rampWeeks > 1 ? "s" : ""),
      why: "Un plan qui démarre au-dessus de ce que le corps fait DÉJÀ multiplie le risque de blessure — on part de ton volume réel des derniers mois et on rejoint la courbe progressivement",
    });
  }
  // R6 §3.4 — toute recalibration produit une entrée VISIBLE : l'athlète doit voir le
  // changement ET sa cause. Un chiffre qui bouge sans explication est pire qu'un chiffre faux.
  if (_volArb.why) {
    r.decisions.push({
      id: "measured-vol", what: "Volume de départ, mesuré vs déclaré", val: _volArb.why,
      why: "Ce que tu as fait est plus fiable que ce dont tu te souviens — mais une mesure incomplète ne sert jamais à alléger un plan, seulement à corriger une sous-estimation",
    });
  }

  // N2 — LE FILET : aucun jour APRÈS la course objectif ne survit dans le plan.
  //
  // La grille s'arrête désormais au soir du jour J (`buildDays`, `raceTailDays`) : ce bloc ne
  // devrait plus rien trouver. Il reste parce que la leçon de cette série a été payée sept
  // fois — une garantie vérifiée au MILIEU du pipeline ne vérifie que l'avant-dernier état.
  // Toute passe future qui rallongerait la dernière semaine (une insertion, un rééquilibrage)
  // se ferait rattraper ici plutôt que d'atterrir chez l'athlète.
  if (a.race_date) {
    const wk = wl[wl.length - 1];
    const before = (wk.days as GenDay[]).length;
    wk.days = (wk.days as GenDay[]).filter((d) => !d.date || d.date <= a.race_date!);
    if ((wk.days as GenDay[]).length !== before) {
      const vr = Math.round((weekMin(wk.days as GenDay[]) / 60) * 10) / 10;
      wk.vol = vr;
      wk.vol_real = vr;
      wk.vol_declared = Math.min(wk.vol_declared ?? vr, Math.max(vr, 0.1));
    }
  }

  // C6 — volPeak affiché = pic réel des semaines de charge
  let volPeak = r.volPeak;
  {
    const chargeW = wl.filter((w) => !w.isRecup);
    if (chargeW.length) volPeak = Math.max(...chargeW.map((w) => w.vol));
  }
  const volBase = Math.round(volPeak * 0.58 * 10) / 10;

  // Courses intermédiaires : mini-affûtage semaine B/A, récup la semaine suivante
  const races: { date: string; prio: string }[] = [];
  // N1 — LA COURSE OBJECTIF EST DANS LE PLAN. Le mécanisme d'insertion existait et n'était
  // jamais appliqué à la course pour laquelle le plan existe : le jour J, l'athlète recevait
  // « Footing facile 22 min » sur les 6 sports. Pire, la veille, le bandeau annonçait « des
  // jambes fraîches, repos » pendant que le plan prescrivait 66 à 94 min. Le bandeau et la
  // séance se contredisaient sur le même écran — deux passes qui produisent des faits opposés
  // sans que personne ne les confronte, la famille de défauts de toute cette série.
  // `race_date` alimente la liste au même titre qu'une course intermédiaire, en priorité A,
  // sans dépendre de `a.races` (qui ne décrit QUE les courses secondaires).
  // Sous drapeau médical, le plan est un plan de MAINTIEN : on n'y inscrit pas une course.
  // (Sans cette garde, la séance de course injectait une zone seuil dans 65 plans sous drapeau
  // médical — le contournement exact que R4.0 avait fermé. Priorité n°1 du manifeste.)
  if (a.race_date && !r.medHold) races.push({ date: a.race_date, prio: "A" });
  // N5 — une date de course secondaire renseignée SANS `races:"oui"` était ignorée en silence.
  // R11 : on l'applique ou on lève ; jamais un champ rempli qui ne fait rien.
  if (a.race1_date && !r.medHold) races.push({ date: a.race1_date, prio: a.race1_prio || "C" });
  if (a.race2_date && !r.medHold) races.push({ date: a.race2_date, prio: a.race2_prio || "C" });
  for (const rc of races) {
    // La semaine d'une course intermédiaire se trouve par SA DATE dans la grille datée
    // (l'ancien offset depuis « aujourd'hui » se décale dès que la semaine 1 commence au lundi).
    const wk = wl.find((w) => (w.days as GenDay[]).some((d) => d.date === rc.date));
    if (wk) {
      wk.race = rc.prio;
      // R10 — le JOUR de course existe dans la grille : la séance de ce jour devient la
      // course elle-même (consigne de pacing selon la priorité), pas un entraînement.
      const rd = (wk.days as GenDay[]).find((d) => d.date === rc.date);
      if (rd) {
        const mainD = sportModule(a.sport as string).mainDiscipline;
        const prevMin = rd.sessions.reduce((m, s) => m + (s.min || 0), 0) || 60;
        // Le jour de la course n'est plus un jour « bloqué » : l'athlète y court, c'est un FAIT
        // qu'il a déclaré lui-même. Et comme la course occupe un créneau, elle ne s'ajoute pas
        // au budget de séances : la plus petite séance de la semaine cède sa place.
        if (traceEnabled()) traceRecord({ pass: "insertion-course", weekNum: wk.num, date: rc.date, sessionName: "🏁 Course " + rc.prio, discipline: mainD, field: "insertion", after: prevMin, reason: "N1" });
        rd.forced = false;
        rd.charge = "dur";
        {
          const others = (wk.days as GenDay[])
            .filter((d) => d !== rd)
            .flatMap((d) => d.sessions.filter((sx) => sx.d !== "rs").map((sx) => ({ d, sx })));
          const budget = r.budgetPerWeek || 6;
          while (others.length + 1 > budget) {
            // R13 — la coupe de budget n'orpheline pas une discipline du sport (le jour J ne
            // couvre que la discipline principale) : sur un duathlon à 3 séances/semaine, la
            // semaine de course perdait son dernier coup de pédale (D-DISC, banc v7).
            const discs = sportModule(a.sport as string).disciplines;
            const coversAfter = (cand: { sx: V1Session }) => discs.every((disc) => {
              const still = others.some((o) => o !== cand && (o.sx.d === disc || (o.sx.d === "br" && (o.sx.steps || []).some((b) => b.leg === (disc === "rn" ? "run" : "bike")))))
                || disc === sportModule(a.sport as string).mainDiscipline; // la course couvre la principale
              const carried = cand.sx.d === disc || (cand.sx.d === "br" && (cand.sx.steps || []).some((b) => b.leg === (disc === "rn" ? "run" : "bike")));
              return !carried || still;
            });
            const safe = others.filter(coversAfter);
            const pool = safe.length ? safe : others;
            const victim = pool.reduce((x, y) => ((y.sx.min || 0) < (x.sx.min || 0) ? y : x));
            if (traceEnabled()) traceRecord({ pass: "insertion-course", weekNum: wk.num, date: victim.d.date, sessionName: victim.sx.name, discipline: victim.sx.d, field: "suppression", before: victim.sx.min, reason: "N1 (la course prend le créneau : budget " + budget + ")" });
            const i2 = victim.d.sessions.indexOf(victim.sx);
            if (i2 >= 0) victim.d.sessions.splice(i2, 1);
            if (!victim.d.sessions.some((x) => x.d !== "rs")) {
              victim.d.charge = "off"; victim.d.slot = "off";
              victim.d.sessions = [{ d: "rs", name: "OFF (semaine de course)", det: "repos — la course occupe le créneau de la semaine", steps: [], min: 0 }];
            }
            others.splice(others.indexOf(victim), 1);
          }
        }
        // R13.4 — LA COURSE OBJECTIF NE COMPTE PAS COMME UNE SÉANCE. `min` valait la durée de
        // la séance remplacée (13-29 min) : l'Ironman entrait dans la charge hebdomadaire comme
        // un footing, faussait le volume de la semaine, l'adhérence et les célébrations. Une
        // course A n'est pas un entraînement dosé : `min: 0`, hors charge — et l'affichage
        // porte les temps PRÉDITS par le prédicteur, pas une durée de footing inventée.
        // Les courses B/C, elles, TIENNENT LIEU de séance (c'est leur définition) : elles
        // gardent leur durée dans la charge.
        let predDet = "";
        if (rc.prio === "A") {
          const pred = predictRace(a.sport as string, a.format as string, a.intent, r.baseRefs, { courseProfile: a.terrain, trail: r.trail || undefined });
          if (pred.items.length) predDet = " — ⏱ Prévu : " + pred.items.map((it) => it.leg + " " + it.value).join(" · ");
        }
        rd.sessions = [{
          d: mainD as "rn",
          name: "🏁 Course " + rc.prio,
          race: true,
          det: (rc.prio === "A"
            ? "LE JOUR J. Départ contrôlé à ton allure cible, la première moitié doit te sembler facile — c'est le seul pacing qui tient. — 💡 Tout ce qui devait être construit l'est : aujourd'hui, tu exécutes."
            : rc.prio === "C"
              ? "Course laboratoire : départ contrôlé, teste ton ravito et ton pacing — on enchaîne l'entraînement derrière. — 💡 Objectif : apprendre en conditions réelles, pas performer."
              : "Course de préparation : mini-affûtage fait, tu peux appuyer. Départ contrôlé, finis fort. — 💡 Objectif : valider allures et stratégie avant l'objectif A.") + predDet,
          min: rc.prio === "A" ? 0 : prevMin,
          // Une course ne porte PAS de zone d'entraînement : ce n'est pas une séance dosée, c'est
          // un événement. Lui coller `.thr` la faisait compter comme 60+ min de seuil par les
          // bancs de dose — et surtout comme de l'intensité générée là où elle est interdite.
          steps: rc.prio === "A" ? [] : [{ role: "body", durationMin: prevMin, _min: prevMin }],
          note: "Course " + rc.prio + " placée à sa vraie date — la semaine est allégée autour.",
        } as V1Session];
      }
      // N3/N4 — LA FENÊTRE AUTOUR DE LA COURSE EST REPLANIFIÉE, ET LA PRIORITÉ LA PILOTE.
      // La course était INSÉRÉE dans un calendrier déjà construit, sans que les jours voisins
      // soient touchés : la veille portait la plus longue séance de la semaine sur 4 sports
      // sur 4 — 4 h 30 de trail la veille d'une course. Deux passes qui ne se parlent pas.
      // Et `race1_prio` ne changeait rien : A, B et C donnaient le même plan au caractère près.
      // Ce que la priorité pilote désormais, c'est la LARGEUR de la fenêtre :
      //   A → 3 jours allégés avant, 2 jours de récup après (c'est l'objectif du plan)
      //   B → veille allégée, 1 jour de récup après
      //   C → veille allégée seulement : la course TIENT LIEU de séance de qualité.
      const prep = rc.prio === "A" ? 3 : 1;
      const after = rc.prio === "A" ? 2 : rc.prio === "B" ? 1 : 0;
      const allDays = wl.flatMap((w) => w.days as GenDay[]);
      const raceT = new Date(rc.date + "T12:00:00Z").getTime();
      const dayAt = (offsetDays: number) => allDays.find((d) => d.date === new Date(raceT + offsetDays * 864e5).toISOString().slice(0, 10));
      for (let k = 1; k <= prep; k++) {
        const d = dayAt(-k);
        if (!d) continue;
        const capMin = k === 1 ? RACE_EVE_CAP_MIN : Math.round(RACE_EVE_CAP_MIN * 2.5);
        d.charge = "facile";
        // R13.4 — le plafond de la veille est un plafond de JOUR, pas de séance : en doubles,
        // la veille portait deux séances de 20+27 min — 47 min de « déverrouillage » au total.
        // La veille d'une course, il y a UNE sortie courte, point.
        if (k === 1) {
          const act = d.sessions.filter((sx) => sx.d !== "rs" && !sx.race && sx.steps);
          for (let i2 = 1; i2 < act.length; i2++) {
            const j = d.sessions.indexOf(act[i2]);
            if (j >= 0) d.sessions.splice(j, 1);
          }
        }
        for (const sx of d.sessions) {
          if (sx.d === "rs" || sx.race || !sx.steps) continue;
          if ((sx.min || 0) <= capMin && k > 1) continue;
          if ((sx.min || 0) <= 25 && k === 1 && !sx.long && !sx.brick) continue;
          // R13.4 — la zone suit la DISCIPLINE DE LA SÉANCE, plus jamais la discipline
          // principale du sport : la passe collait une zone de course à pied sur une séance
          // vélo de veille (zone rn.easy sur d="bk" — un non-sens que personne ne relisait).
          const dz = sx.d === "sw" ? "sw.easy" : sx.d === "bk" ? "bk.z2" : "rn.easy";
          if (k === 1) {
            // Un déverrouillage se joue à 15-25 min : échauffement + trois accélérations
            // franches — réveiller les jambes, jamais les entamer (mesuré avant : 48 min la
            // veille d'un Ironman, 63 la veille d'un 70.3, en « déverrouillage » de nom).
            sx.steps = [
              // 3×2 min (et pas 3×1) : avec un corps de 8 min, l'échauffement C13e garde ses
              // 8 min et la séance totale tient dans 15-25 min — à 3×1, le clamp « échauffement
              // ≤ corps » réduisait tout à 11 min, sous le plancher de séance digne (U-MIN v7).
              { role: "warmup", durationMin: 8, text: "très progressif" } as V1Step,
              { role: "body", durationMin: 2, reps: 3, zone: dz, recoveryMin: 1, recoveryText: "1min très souple", text: ", accélérations franches mais courtes" } as V1Step,
              { role: "cooldown", durationMin: 5, text: "souple" } as V1Step,
            ];
          } else {
            sx.steps = [{ role: "body", durationMin: capMin, zone: dz } as V1Step];
          }
          sx.long = false;
          sx.brick = false;
          sx.name = k === 1 ? "Déverrouillage (veille de course)" : "Endurance allégée (avant course)";
          sx.note = k === 1
            ? "Veille de course : on réveille les jambes, on ne les fatigue pas. Échauffement doux, trois accélérations franches — puis on range les chaussures."
            : "La course approche : le volume descend, l'intensité aussi. Ce que tu gagnes maintenant, c'est de la fraîcheur, pas de la forme.";
          renderSess(sx, refs, r.hz, r.baseRefs);
        }
      }
      for (let k = 1; k <= after; k++) {
        const d = dayAt(k);
        if (!d || d.sessions.some((sx) => sx.race)) continue;
        d.charge = "off";
        d.slot = "off";
        d.sessions = [{ d: "rs", name: "Repos post-course", det: "récupération — marche, hydratation, fierté", steps: [], min: 0 }];
      }
      if (rc.prio !== "C") {
        wk.vol = Math.round(wk.vol * 0.75 * 10) / 10;
        wk.taperRace = true;
      }
      // R13.6 — LA SEMAINE DE COURSE A UN PLANCHER : ~30 % DU PIC, HORS JOUR J. Entre le
      // budget N1 (la course prend un créneau, la plus petite séance saute) et la fenêtre
      // d'allègement, la semaine de l'objectif tombait à 14 % du pic : quasi à l'arrêt —
      // Bosquet 2007 situe l'affûtage à −40/−60 %, pas à −86 ; sous ~30 %, les sensations
      // partent avec la fatigue. Si le plancher n'est pas atteint, les jours OFF (jamais la
      // veille, jamais le jour J) redeviennent de l'endurance allégée — la séance qu'un
      // entraîneur écrit un mardi de semaine de course.
      if (rc.prio === "A") {
        const wkDays = wk.days as GenDay[];
        const horsCourse = () => wkDays.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.race ? 0 : s.min || 0), 0), 0);
        const floorMin = volPeak * 60 * 0.30;
        const mainD = sportModule(a.sport as string).mainDiscipline;
        const dz = mainD === "sw" ? "sw.easy" : mainD === "bk" ? "bk.z2" : "rn.easy";
        const raceIdx = wkDays.findIndex((d) => d.sessions.some((s) => s.race));
        const budget = r.budgetPerWeek || 6;
        for (const d of wkDays) {
          if (horsCourse() >= floorMin) break;
          // Le budget de séances déclaré tient AUSSI en semaine de course (U-SESSBUDGET v7) :
          // remonter un OFF n'ajoute jamais une séance au-delà de ce que l'athlète a déclaré.
          if (wkDays.reduce((t, x) => t + x.sessions.filter((s) => s.d !== "rs").length, 0) + 1 > budget) break;
          const i = wkDays.indexOf(d);
          if (d.forced || (raceIdx >= 0 && i >= raceIdx - 1)) continue; // ni la veille, ni le jour J
          if (d.sessions.some((s) => s.d !== "rs")) continue;
          const dur = Math.min(Math.round(RACE_EVE_CAP_MIN * 2.5), Math.max(30, Math.round(floorMin - horsCourse())));
          const sx: V1Session = { d: mainD as "rn", name: "Endurance allégée (semaine de course)", det: "",
            note: "Semaine de course : on entretient le moteur sans le fatiguer. Allure strictement facile, arrêt net à la durée — la fraîcheur du jour J se construit aussi en continuant de bouger.",
            steps: [{ role: "body", durationMin: dur, zone: dz } as V1Step] };
          renderSess(sx, refs, r.hz, r.baseRefs);
          d.charge = "facile"; d.slot = "facileR";
          d.sessions = [sx];
        }
      }
      const next = wl.find((w) => w.num === wk.num + 1);
      if (next) {
        next.vol = Math.round(next.vol * 0.7 * 10) / 10;
        next.postRace = true;
      }
    }
  }

  // R13.3 (filet) — CHAQUE SEMAINE D'AFFÛTAGE GARDE SA NAGE, LA SEMAINE DE COURSE COMPRISE.
  // La couverture des disciplines l'avait posée — sur le jour que l'insertion de course vient
  // d'écraser (le donneur « au plus près de la course » ÉTAIT le jour J avant que la course y
  // soit matérialisée). Une garantie posée avant une passe qui réécrit des jours ne garantit
  // que l'avant-dernier état : le filet parle après. Donneur : un jour facile de course à pied
  // sans qualité, jamais le jour J ni la veille (le déverrouillage reste un déverrouillage) —
  // au plus près de la course (≤ 5 jours : les sensations d'eau du départ se gardent fraîches).
  if (guard(a.sport as string, "swimRacePrepFrequency") && !r.dbl && !r.medHold) {
    for (const wk of wl) {
      if (wk.phase.id !== "taper") continue;
      const wdays = wk.days as GenDay[];
      if (wdays.some((d) => d.sessions.some((s) => s.d === "sw"))) continue;
      const raceIdx = wdays.findIndex((d) => d.sessions.some((s) => s.race));
      const cand = wdays.filter((d, i) => !d.forced
        && (raceIdx < 0 || i < raceIdx - 1)
        && d.sessions.length > 0
        && d.sessions.every((s) => s.d === "rn" && !s.long && !s.brick && !s.race
          && !(s.steps || []).some((st) => IS_QUALITY_ZONE(String(st.zone || "")))));
      const donor = cand[cand.length - 1];
      if (!donor) continue;
      const built = buildSessions({ r }, "facile2", "taper", donor.prog || 0, donor.week);
      const pick = built.find((x) => x.d === "sw");
      if (!pick) continue;
      renderSess(pick, refs, r.hz, r.baseRefs);
      donor.sessions = [pick];
    }
  }

  const plan: V1Plan = { weeks: wl, volPeak, volBase, use10: r.use10, totalWeeks: r.weeks, phases: r.phases, races };
  reconcileDeclaredVolume(plan, r.warnings, (s) => renderSess(s, refs, r.hz, r.baseRefs), { swimFloors: guard(a.sport as string, "swimSessionFloors"), beginner: r.beginner, medHold: r.medHold, keepTaperSwim: guard(a.sport as string, "swimRacePrepFrequency") && !r.dbl && !r.medHold, mainDiscipline: sportModule(a.sport as string).mainDiscipline, disciplines: sportModule(a.sport as string).disciplines });

  normalizeRestMinutes(plan);
  syncDerivedLabels(plan); // repassé en dernier par la boucle de réparation
  return { plan, reasoned: r };
}
