/**
 * TrainingReasoningEngine — Sprint 1 V2.
 *
 * « Le moteur réfléchit avant de générer » (manifeste) : comprendre l'athlète →
 * l'objectif → les contraintes → calculer la charge. Chaque décision est un
 * {id, what, val, why} — le format d'evalRules promu au plan entier.
 * Les nombres viennent de la matrice de contraintes (provenance V1.5 validée).
 */
import type { AthleteProfile, Decision, Phase, ReasonedPlan } from "./types.ts";
import {
  MIN_WEEKS, HISTORY_CAPS, UTIL, MARGIN, RECUP_FACTORS, PHASE_PCTS,
  BANDS, C22_MAX_WEEKLY_GROWTH, RECUP_WEEK_FACTOR, RECUP_EVERY,
  BEGINNER_SWIM_VOLPEAK_CAP_H, SWIM_TIME_FACTOR, C20_BEGINNER_SWIM_H_PER_SESSION,
  MAX_RUN_DAYS, AVG_SESSION_H, R6_INJURY_LOAD_FACTORS, R6_AGE_LOAD, readInjuries, boundedOrZero,
  parsePaceSec,
} from "./constraintMatrix.ts";
import { guard } from "../sports/registry.ts";
import { swimrunPrereqBlock } from "../sports/swimrun/index.ts";
import { T1_DPLUS_CAPS, T4_LONG_RUN_VS_RACE, T6_MIN_WEEKS, TRAIL_HISTORY_CAPS, TRAIL_UTIL, trailObjective, trailWeeklyVertical } from "./trailModel.ts";

/** « 560 » → « 9h20 » — les durées de trail se lisent en heures, pas en minutes. */
function fmtH(min: number): string {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h > 0 ? h + "h" + String(m).padStart(2, "0") : m + "min";
}

/** Zones cardio (Karvonen si FC repos connue, sinon %FCmax) — port V1.5. */
function hrZones(age?: string, hrMax?: string, hrRest?: string) {
  // E3 (audit v6) — hors bornes physiologiques = non renseigné (repli formule d'âge)
  const boundedAge = boundedOrZero("age", parseInt(age || "") || 0) || 35;
  const fcMax = boundedOrZero("hrMax", parseInt(hrMax || "") || 0) || Math.round(208 - 0.7 * boundedAge);
  const rest = boundedOrZero("hrRest", parseInt(hrRest || "") || 0);
  const Z = (lo: number, hi: number) => {
    if (rest) return Math.round(rest + (fcMax - rest) * lo) + "-" + Math.round(rest + (fcMax - rest) * hi) + " bpm";
    return Math.round(fcMax * lo) + "-" + Math.round(fcMax * hi) + " bpm";
  };
  return { fcMax, z1: Z(0.6, 0.7), z2: Z(0.7, 0.8), tempo: Z(0.8, 0.87), seuil: Z(0.87, 0.92), vo2: Z(0.92, 0.97) };
}

export interface ReasoningResult {
  plan: ReasonedPlan;
}

export class TrainingReasoningEngine {
  analyze(aIn: AthleteProfile): ReasonedPlan {
    let a = aIn;
    const decisions: Decision[] = [];
    const warnings: string[] = [];
    const D = (id: string, what: string, val: string | number, why: string) => decisions.push({ id, what, val, why });
    const sp = a.sport, fmt = a.format;
    const history = a.history || "confirme";
    const level = a.level || "inter";
    const beginner = level === "debutant";
    const finisher = a.intent === "finir";
    const comp = a.intent === "competition";

    // ---- R7 TRAIL : l'objectif est DÉCODÉ avant tout le reste (catégorie déduite des
    // données réelles de la course, pas demandée). Tout le dimensionnement en découle. ----
    const isTrail = sp === "trail";
    const tObj = isTrail ? trailObjective(a) : undefined;
    if (tObj) {
      D("format-trail", "Catégorie d'effort", tObj.category + " (" + fmtH(tObj.raceMinLo) + "–" + fmtH(tObj.raceMinHi) + " estimées)", "Déduit de " + tObj.why);
      D("km-effort", "Ton objectif en km-effort", tObj.kmEffort + " km-effort", tObj.distanceKm + " km + " + tObj.dplusM + " m D+ ÷ 100 — la métrique qui compare des courses de relief différent");
      if (!tObj.vamKnown) warnings.push("Ta vitesse ascensionnelle (VAM) n'est pas renseignée : le plan utilise une estimation de " + Math.round(tObj.vam) + " m/h d'après ton niveau. Fais le test (une montée régulière de 20-30 min à fond : D+ ÷ durée = ta VAM) et renseigne-la au Profil — c'est LA référence d'intensité en montée, et elle resserre aussi la prédiction.");
      if (tObj.cappedByProduct) warnings.push("Ton objectif dépasse 24 h d'effort estimées. Le plan construit l'endurance nécessaire, mais la stratégie propre à ce format (sommeil fractionné, assistance, ravitaillement par base-vie) dépasse ce qu'un plan automatique peut honnêtement produire : cherche l'accompagnement d'un entraîneur ou d'un finisher expérimenté pour cette partie.");
      if (tObj.altitudeMaxM && tObj.altitudeMaxM > 2500) warnings.push("Ta course monte à " + tObj.altitudeMaxM + " m : au-dessus de 2 500 m, la performance baisse et l'acclimatation compte. Un protocole d'acclimatation dépend de contraintes logistiques que l'outil ne connaît pas — si tu peux dormir en altitude quelques nuits avant, fais-le.");
    }

    // R4.5 (audit v7) — PRÉREQUIS D'ENTRÉE DANS LE MOTEUR. La porte ne vivait que dans le
    // questionnaire (`valid()` du step intention) : toute autre voie — édition d'une réponse
    // depuis le Profil, état restauré, import — générait le plan long quand même. La priorité
    // n°1 du manifeste est la santé : elle doit vivre dans le moteur, pas dans l'interface.
    // On ne refuse pas de produire un plan (l'athlète resterait sans rien) : on RABAT le format
    // au plus long format autorisé et on le DIT.
    if (sp === "swimrun") {
      const block = swimrunPrereqBlock(a as { format?: string; swim_continuous?: string; run_continuous?: string });
      if (block) {
        warnings.push(block + " Ton plan a donc été construit sur le format Sprint : il te prépare aux bases, et tu passeras au format long quand elles seront acquises.");
        D("prereq-swimrun", "Format rabattu", "sprint (au lieu de " + (a.format || "?") + ")", "Les prérequis de sécurité du format long ne sont pas atteints — construire les bases d'abord n'est pas un lot de consolation, c'est l'ordre dans lequel ce sport s'apprend");
        a = { ...a, format: "sprint" };
      }
    }

    // ---- 1. Comprendre l'objectif : durée de préparation ----
    const minW = tObj ? T6_MIN_WEEKS[tObj.category] : (MIN_WEEKS[sp]?.[fmt] || 12);
    let weeks = minW;
    let raceBeyondPlan = false; // C3 — course au-delà de l'horizon planifiable : ancrer sur MAINTENANT
    if (a.race_date) {
      // R8 — l'entraînement commence CETTE semaine, pas la prochaine. L'ancien calcul
      // floor((course − maintenant)/7j) perdait la fraction de semaine : course dans
      // 8,5 semaines → plan de 8 semaines ancré sur la course → départ lundi SUIVANT.
      // La durée est désormais le nombre de semaines calendaires entre le lundi de
      // l'ancrage (plan_start, sinon aujourd'hui) et le lundi de course, inclus : le
      // générateur (ancré fin de course) fait alors démarrer la semaine 1 aujourd'hui.
      const MS = 864e5;
      const mondayOf = (t: number): number => t - ((new Date(t).getUTCDay() + 6) % 7) * MS;
      const anchorT = a.plan_start ? new Date(a.plan_start + "T00:00:00Z").getTime() : Date.now();
      const span = Math.round((mondayOf(new Date(a.race_date + "T00:00:00Z").getTime()) - mondayOf(anchorT)) / (7 * MS)) + 1;
      // C2/C3 (audit v6) — hors fenêtre, JAMAIS un silence : chaque branche produit une
      // décision ou un avertissement. L'ancien code laissait weeks=minW et le générateur
      // rétrodatait le plan (13 semaines dans le passé pour une course dans 2 semaines).
      if (span < Math.ceil(minW * 0.75)) {
        weeks = Math.max(1, span);
        warnings.push("Il te reste " + Math.max(1, span) + " semaine(s) avant la course — le minimum recommandé pour un " + fmt + " est de " + minW + ". Le plan couvre le temps réellement disponible : c'est une préparation partielle, pas une prépa complète comprimée. Ajuste ton objectif du jour J en conséquence.");
        D("duree-contrainte", "Préparation raccourcie", Math.max(1, span) + "/" + minW + " semaines", "Mieux vaut un plan honnête sur le temps disponible qu'un plan complet impossible à suivre — ou rétrodaté dans le passé");
      } else if (span > 80) {
        weeks = 80;
        raceBeyondPlan = true;
        warnings.push("Ta course est dans " + span + " semaines. Le plan démarre MAINTENANT et couvre les 80 prochaines : au-delà, une planification séance par séance n'a pas de valeur prédictive — régénère ton plan quand l'échéance sera à moins de 80 semaines.");
        D("duree-plafonnee", "Échéance très lointaine", "80 semaines planifiées (course à " + span + ")", "On construit la base longue dès maintenant ; la planification fine attendra que la course entre dans l'horizon");
      } else weeks = span;
    }
    D("duree", "Durée de préparation", weeks + " semaines", "Minimum " + minW + " pour " + fmt + (a.race_date ? ", ajusté à la date de course" : ""));

    // ---- 2. Comprendre l'athlète : capacité de charge ----
    const caps = tObj ? TRAIL_HISTORY_CAPS[tObj.category][history] : (HISTORY_CAPS[sp]?.[history]?.[fmt] ?? 10);
    const util = tObj ? TRAIL_UTIL[tObj.category] : (UTIL[sp]?.[fmt] ?? 12);
    const marg = comp ? MARGIN.competition : MARGIN.autres;
    D("capacite", "Plafond historique", caps + "h/sem", "Ce que l'historique « " + history + " » permet d'encaisser sur " + fmt);
    D("utile", "Volume utile du format", util + "h/sem", "Au-delà, les heures ne servent plus l'objectif " + fmt);
    if (!comp) D("marge", "Marge de sécurité", "-10%", "Hors compétition, 10% de marge sur tous les plafonds (santé d'abord)");

    // 1B — indicateurs de récupération
    const recupFactor = (a.sleep === "court" ? RECUP_FACTORS.sleepCourt : 1) * (a.life_load === "lourde" ? RECUP_FACTORS.lifeLourde : 1);
    if (recupFactor < 1) D("1B", "Récupération dégradée", "volume ×" + recupFactor.toFixed(2), "Sommeil court et/ou charge de vie lourde : le contenu baisse réellement");

    // R6.2 (audit v6, B1/B3) — une blessure déclarée réduit RÉELLEMENT le plafond de
    // volume ; plusieurs zones fragiles → approche ultra-conservatrice, comme la carte
    // de règle affichée à l'athlète le promet depuis toujours.
    // ⚠️ Le facteur s'applique APRÈS la sonde de capacité (loadFactor, planGenerator) et
    // pas via sessionScale : passé dans les tailles initiales, la quantification des
    // répétitions le rendait chaotique (un plan blessé pouvait sortir PLUS gros, mesuré +4%).
    const inj = readInjuries(a.injury);
    const injFactor = inj.count >= 2 ? R6_INJURY_LOAD_FACTORS.multiples : inj.count === 1 ? R6_INJURY_LOAD_FACTORS.une : 1;
    if (injFactor < 1) {
      D("R6.2", "Blessure déclarée", "volume ×" + injFactor.toFixed(2), inj.count >= 2
        ? "Plusieurs zones fragiles (" + inj.list.join(", ") + ") : approche ultra-conservatrice — progression ralentie, bilan médical avant montée en charge"
        : "Zone fragile (" + inj.list.join(", ") + ") : le plafond de volume baisse de 10% — « une blessure décide quoi adapter », le volume en fait partie");
      if (inj.count >= 2) warnings.push("Plusieurs blessures déclarées (" + inj.list.join(", ") + ") : un bilan médical est recommandé avant la montée en charge — le plan est volontairement conservateur (-20% de volume).");
    }

    // R6.3 (audit v6, A7) — l'âge module la charge : l'avertissement du Profil s'APPLIQUE.
    const ageN = boundedOrZero("age", parseInt(a.age || "") || 0);
    const minor = ageN > 0 && ageN <= R6_AGE_LOAD.mineur.maxAge;
    const master = ageN >= R6_AGE_LOAD.master.minAge;
    let ageFactor = 1;
    if (minor) {
      ageFactor = R6_AGE_LOAD.mineur.volFactor;
      D("R6.3", "Athlète mineur (" + ageN + " ans)", "volume ×" + R6_AGE_LOAD.mineur.volFactor + ", aucune VO2max", "Ces plans sont calibrés pour des adultes : en dessous de 18 ans, la charge (surtout les VO2max répétés) doit être encadrée — le plan est réduit et sans VO2max, l'encadrement humain reste nécessaire");
      warnings.push("Ces plans sont calibrés pour des adultes. En dessous de 18 ans, la charge (surtout les VO2max répétés) doit être encadrée par un entraîneur : le plan est réduit de 30% et ne contient aucune séance VO2max — mais il ne remplace pas un encadrement humain.");
    } else if (master) {
      ageFactor = R6_AGE_LOAD.master.volFactor;
      D("R6.3", "Athlète master (" + ageN + " ans)", "volume ×" + R6_AGE_LOAD.master.volFactor + ", récup /3 semaines", "La capacité d'encaissement se maintient avec l'âge, la vitesse de récupération baisse : on récupère plus souvent, on charge un peu moins");
    }
    const loadFactor = injFactor * ageFactor;

    const volMax = parseInt(a.vol_max || "10");
    const sessionScale = Math.min(1, (Math.min(volMax, caps, util) * marg) / util) * recupFactor;
    let volPeak = Math.round(Math.min(volMax, caps, util) * marg * recupFactor * 10) / 10;
    if (guard(sp as string, "swimTimeFactor") && beginner) {
      volPeak = Math.min(volPeak, BEGINNER_SWIM_VOLPEAK_CAP_H);
      D("C15", "Nageur débutant", "pic ≤" + BEGINNER_SWIM_VOLPEAK_CAP_H + "h", "La technique borne le volume, pas l'historique (risque épaule)");
    }
    if (guard(sp as string, "swimTimeFactor")) volPeak = Math.round(volPeak * SWIM_TIME_FACTOR * 10) / 10;

    // ---- 3. Comprendre les contraintes : médical, jours, budget ----
    const medHold = a.med_pain === "oui" || a.med_dizzy === "oui" || a.med_treat === "oui";
    if (medHold) {
      D("medical", "⚠️ Drapeau médical", "plan de maintien", "Aucune intensité générée sans feu vert médical ; pic allégé à 40%");
      // R4.0 (audit v7) — le drapeau médical ne produisait AUCUN avertissement : `warnings`
      // restait vide, et rien dans le plan ne mentionnait l'avis médical. Une décision dans un
      // volet dépliable ne suffit pas pour la priorité n°1 du manifeste.
      const which = [a.med_pain === "oui" ? "douleur thoracique à l'effort" : null,
        a.med_dizzy === "oui" ? "vertiges ou malaise à l'effort" : null,
        a.med_treat === "oui" ? "traitement cardiovasculaire" : null].filter(Boolean).join(", ");
      warnings.push("⚠️ Tu as signalé : " + which + ". Ce plan est un plan de MAINTIEN — aucune intensité n'y est générée, le volume est allégé, et il ne remplace pas un avis médical. Prends rendez-vous avant de reprendre l'entraînement structuré : c'est la seule chose non négociable de cet outil.");
    }
    const offDays = (a.off_which || "").split(",").filter(Boolean);
    const use10 = a.dispo === "quotidienne" && a.shift_ok === "oui" && offDays.length < 2;
    if (use10) D("cycle", "Cycle de 10 jours", "activé", "Disponibilité quotidienne : densité mieux répartie qu'en semaine de 7 jours");
    const recupEvery = master ? Math.min(RECUP_EVERY[history], R6_AGE_LOAD.master.recupEvery) : RECUP_EVERY[history];
    D("recup", "Semaine de récupération", "toutes les " + recupEvery + " semaines", master ? "60+ : la récupération se rallonge avec l'âge — cadence resserrée (R6.3)" : history === "reprise" ? "Reprise : récupération plus fréquente" : "Assimilation régulière de la charge");

    const volBudget = Math.min(volMax, caps, util) * marg;
    const avgH = AVG_SESSION_H[sp];
    const volSessCap = avgH ? Math.max(3, Math.round(volBudget / avgH)) : 7;
    const budgetPerWeek = Math.min(parseInt(a.sessions_max || "7") || 7, volSessCap);
    D("budget", "Séances par semaine", budgetPerWeek, "Budget déclaré ∧ budget implicite du volume (" + volBudget.toFixed(1) + "h ÷ " + (avgH ?? "—") + "h/séance)");

    const injuries = inj.list;
    let maxRunDays: number | null = null;
    // D10-3 — le plafond de jours d'IMPACT vaut aussi pour le trail. Il ne s'appliquait qu'à
    // `run` : depuis R7 un traileur avec une périostite recevait 5 jours de course par semaine,
    // là où un coureur route avec la MÊME blessure en recevait 3. Or le trail ajoute la charge
    // excentrique de la descente à l'impact — c'est la discipline la plus exigeante pour les
    // tissus, pas la moins.
    if (guard(sp as string, "runImpactCap")) {
      maxRunDays = MAX_RUN_DAYS[history] ?? 5;
      if (inj.impact) maxRunDays = Math.max(3, maxRunDays - 1);
      // B2 (audit v6) — le tibia (périostite) est LA blessure de l'impact répété : le
      // plafond de jours de course est renforcé d'un jour supplémentaire.
      if (inj.list.includes("tibia")) maxRunDays = Math.max(3, maxRunDays - 1);
      D("impact", "Jours de course max", maxRunDays + "/semaine",
        (sp === "trail"
          ? "Le trail cumule l'impact de la course et la charge excentrique de la descente : le plafond de jours d'appui vaut ici aussi"
          : "La course est le sport à plus fort impact")
        + (inj.impact ? " — blessure d'impact déclarée, -1 jour" + (inj.list.includes("tibia") ? " (-1 de plus : le tibia est une blessure d'impact répété)" : "") : ""));
    }

    // ---- 4. Calculer la charge : phases (C19) et courbe (bands + C22) ----
    const phases: Phase[] = PHASE_PCTS.map((p) => ({ ...p, start: 0, end: 0, weeks: 0 }));
    let acc = 0;
    for (const p of phases) {
      p.start = Math.round(acc * weeks);
      acc += p.pct;
      p.end = Math.round(acc * weeks);
      p.weeks = p.end - p.start;
    }
    phases[4].end = weeks;
    {
      const pk = phases[3], spc = phases[2];
      if (pk.weeks < 1 && spc.weeks >= 2) {
        spc.end--; spc.weeks--;
        pk.start = spc.end; pk.end = pk.start + 1; pk.weeks = 1;
        D("C19", "Semaine de peak garantie", "S" + (pk.start + 1), "Les arrondis vidaient la phase peak des plans courts — la dernière semaine de spec devient le pic");
      }
      phases[4].start = phases[3].end;
      phases[4].weeks = phases[4].end - phases[4].start;
    }
    D("courbe", "Courbe de charge", "base " + BANDS.base[0] + "→peak 1.0→affûtage " + BANDS.taper[1], "Bandes normalisées × pic, récup ×" + RECUP_WEEK_FACTOR + ", lissage C22 ≤+" + Math.round((C22_MAX_WEEKLY_GROWTH - 1) * 100) + "%/sem");

    const medFactor = medHold ? 0.4 : 1;
    const theoPeak = Math.min(volMax, caps, util) * marg * recupFactor;
    let peakH = Math.min(theoPeak, volMax) * medFactor;
    // C20 — nage débutant : la promesse suit la capacité réelle C15
    if (guard(sp as string, "swimTimeFactor") && beginner) {
      const cap20 = (parseInt(a.sessions_max || "6") || 6) * C20_BEGINNER_SWIM_H_PER_SESSION;
      if (peakH > cap20) {
        peakH = cap20;
        D("C20", "Promesse calibrée", peakH.toFixed(1) + "h max", "Une séance C15 ≈ 25min : promettre plus serait mentir");
      }
    }
    // V2.1 — le générateur affine ensuite par SONDE DE CAPACITÉ : il génère la semaine pic,
    // mesure ce que les plafonds de séance permettent réellement, et abaisse la promesse si
    // besoin (« le moteur se vérifie et se corrige » appliqué à ses propres promesses —
    // corrige notamment la nage non-débutante que V1.5 déclare à 6.3h pour 3.6h livrables).

    // E1/E2 — parseur unique, tolérant (4'50 accepté : c'est la notation que l'app affiche)
    const thrPaceRaw = a.pace_known === "oui" ? String(a.pace ?? "").trim() : "";
    const cssRaw = a.css_known === "oui" ? String(a.css ?? "").trim() : "";
    const thrPace = parsePaceSec(thrPaceRaw, "run");
    const css = parsePaceSec(cssRaw, "swim");
    if (thrPaceRaw && !thrPace) warnings.push("Allure seuil « " + thrPaceRaw + " » illisible ou hors bornes (2:00 à 20:00 /km) : les séances de course s'affichent en zones cardio. Corrige-la au Profil (format 4:50 ou 4'50).");
    if (cssRaw && !css) warnings.push("CSS « " + cssRaw + " » illisible ou hors bornes (1:00 à 5:00 /100m) : les séances de natation s'affichent au ressenti. Corrige-le au Profil.");
    // E3 (audit v6) — FTP hors bornes physiologiques [60, 600W] = non renseignée : repli
    // zones cardio + avertissement nommé, jamais des zones négatives à l'écran.
    const ftpRaw = a.ftp_known === "oui" ? parseInt(a.ftp || "") || 0 : 0;
    const ftp = boundedOrZero("ftp", ftpRaw);
    if (ftpRaw > 0 && ftp === 0) warnings.push("FTP saisie (" + ftpRaw + "W) hors bornes plausibles [60–600W] : elle est ignorée — les séances s'affichent en zones cardio. Corrige-la au Profil.");
    const hz = hrZones(a.age, a.hr_max, a.hr_rest);

    // ---- R7 TRAIL : les DEUX axes verticaux et le plafond de sortie longue ----
    let tVert: { dplusPeak: number; dmoinsPeak: number; capped: boolean; accessCap: number } | undefined;
    let trailLongCapMin = 0;
    if (tObj) {
      tVert = trailWeeklyVertical(tObj, history, a.train_dplus_access || "collines");
      // T13 — blessure : la contre-indication porte sur la CIBLE verticale, pas seulement
      // sur le contenu des séances (sinon la passe de mise à l'échelle du générateur
      // ramène le dénivelé à la cible et annule la protection).
      const dFac = inj.list.includes("quadriceps") ? 0.35 : inj.list.includes("genou") || inj.list.includes("tibia") ? 0.6 : 1;
      if (dFac < 1) {
        tVert = { ...tVert, dmoinsPeak: Math.round(tVert.dmoinsPeak * dFac) };
        D("T13", "Descente plafonnée (blessure)", "D− ×" + dFac, inj.list.includes("quadriceps")
          ? "Quadriceps fragiles : la descente est LA charge qui les casse — son volume tombe à 35% et les descentes longues sont retirées du plan, remplacées par du renfo excentrique"
          : "Zone fragile : le volume de descente est réduit de 40% (la descente est le terrain le plus traumatisant du trail)");
      }
      const capCat = T1_DPLUS_CAPS[tObj.category][history];
      D("T1", "Dénivelé hebdomadaire au pic", tVert.dplusPeak + " m D+ (D− " + tVert.dmoinsPeak + " m)", "Le D+ est le second axe de charge : plafonné par la catégorie (" + capCat + " m pour un historique « " + history + " ») et par ton terrain d'entraînement");
      D("T2", "Progression du dénivelé", "D+ ≤ +12%/sem · D− ≤ +8%/sem", "La charge excentrique (descente) est le premier facteur de casse musculaire : elle progresse plus lentement que tout le reste");
      // T4 — la sortie longue plafonne en % du TEMPS DE COURSE estimé, jamais en absolu
      trailLongCapMin = Math.round(tObj.raceMinMid * T4_LONG_RUN_VS_RACE[tObj.category]);
      D("T4", "Plafond de la sortie longue", fmtH(trailLongCapMin), "Sur ce format, reproduire la durée de course à l'entraînement serait contre-productif : " + Math.round(T4_LONG_RUN_VS_RACE[tObj.category] * 100) + "% du temps estimé suffit à préparer le reste");
      // T7 — répétitions ravito/matériel
      if (tObj.raceMinMid / 60 >= 6) D("T7", "Répétitions ravitaillement", "3 sorties en conditions réelles (phase spécifique)", "Au-delà de 6 h d'effort, l'estomac et le matériel provoquent autant d'abandons que les jambes : ça se teste à l'entraînement");
      // T11 — terrain plat : le dire, ne pas prescrire du dénivelé inatteignable
      if (tVert.capped) {
        warnings.push("Ton terrain d'entraînement ne permet pas d'atteindre les " + T1_DPLUS_CAPS[tObj.category][history] + " m D+/semaine que ton objectif demanderait (plafond réalisable : ~" + tVert.accessCap + " m). Le plan compense par du travail en côte répétée" + (a.treadmill === "oui" ? ", du tapis incliné" : ", des escaliers") + " et du renfo excentrique, mais ces substituts ne remplacent pas complètement une descente longue. Si tu peux caler 2 ou 3 week-ends en relief pendant la phase spécifique, c'est le meilleur investissement de ta préparation.");
        D("T11", "Terrain d'entraînement limité", "D+ plafonné à " + tVert.dplusPeak + " m/sem", "Prescrire un dénivelé inatteignable serait mentir : le plan substitue ce qu'il peut et nomme ce qui manque");
      }
      // T14 — barrière horaire : l'information la plus utile que l'outil puisse produire
      if (tObj.cutoffH && tObj.raceMinHi > tObj.cutoffH * 60) {
        warnings.unshift("⏱ Barrière horaire : ta course est limitée à " + tObj.cutoffH + " h et notre estimation haute est de " + fmtH(tObj.raceMinHi) + ". C'est jouable mais rien ne devra déraper — vise le bas de la fourchette, contrôle ton départ, et prépare une stratégie de ravitaillement rapide. Si l'écart se confirme à l'entraînement, envisage un format plus court : finir vaut mieux qu'être arrêté à un poste.");
        D("T14", "Barrière horaire serrée", tObj.cutoffH + "h pour " + fmtH(tObj.raceMinLo) + "–" + fmtH(tObj.raceMinHi) + " estimées", "Le plan reste identique, mais l'objectif du jour J devient la gestion, pas la performance");
      }
    }

    return {
      profile: a,
      decisions,
      weeks,
      phases,
      volPeak,
      volBase: Math.round(volPeak * 0.58 * 10) / 10,
      peakH,
      sessionScale,
      use10,
      recupEvery,
      offDays,
      budgetPerWeek,
      maxRunDays,
      medHold,
      beginner,
      finisher,
      comp,
      dbl: a.doubles === "oui",
      injuries,
      inj,
      warnings,
      noVo2: minor,
      raceBeyondPlan,
      loadFactor,
      trail: tObj,
      trailVert: tVert,
      trailLongCapMin,
      baseRefs: { ftp, thrPace, css },
      hz,
    };
  }
}
