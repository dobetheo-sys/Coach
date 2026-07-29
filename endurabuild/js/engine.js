/* __EBV2_BUNDLE__ généré par scripts/buildApp.mjs — NE PAS ÉDITER À LA MAIN.
   Source de vérité : src/ (moteur V2). Reconstruire : npm run build:app */
(function(){
"use strict";
// ===== src/engine/types.ts =====
/**
 * Types du moteur V2 — Sprint 1.
 *
 * CONTRAT DE COMPATIBILITÉ : le moteur V2 émet des plans à la forme V1Plan
 * (mêmes semaines/jours/séances/steps que Coach_Pro_V1.5) pour que l'auditeur
 * de src/audit/ les valide SANS modification — l'auditeur est la spec.
 */

                                                    
                                                        
                                                    
                                                         

/** Miroir typé des clés S.answers utilisées par le moteur (mêmes noms qu'en V1.5). */
                                 
               
                 
                    
                
                  
                   
                                                                                                                      
                        
                                                  
                    
                                                  
                                              
               
                  
                   
                     
               
                      
                                          
                     
                                  
                     
                                                                                                                          
                 
                      
                      
                      
                      
                                                 
                                                        
                    
                     
                     
                   
                   
                  
                   
                      
                                                                                        
                                                           
 

/** Décision du moteur de raisonnement — le format {id, what, val, why} d'evalRules, étendu au plan entier. */
                           
             
               
                       
              
 

                        
                                                 
              
              
            
                
              
                
 

/** Sortie du raisonnement : tout ce dont le générateur a besoin, chiffré et justifié. */
                               
                          
                        
                
                  
                                                  
                  
                                                                      
                       
                 
                     
                    
                                                                                           
                                                                          
                   
                    
                    
                
               
                     
                                                          
                                                  
 

// ===== src/engine/constraintMatrix.ts =====
/**
 * Matrice de contraintes V2 — le savoir validé de Coach_Pro_V1.5, en DONNÉES avec provenance.
 *
 * Chaque constante règle-porteuse référence son identifiant du registre d'ARCHITECTURE.md
 * (C… / R3.…) : c'est le format {id, what, val, why} appliqué aux constantes du moteur.
 * Source de vérité : Coach_Pro_V1.5.html (486 combinaisons vertes à l'audit).
 */
                                                 

                             
             
              
                 
 
const SRC = "Coach_Pro_V1.5.html (audit 486/486 vert)";
const PROVENANCE               = [];
function rule   (id        , why        , value   )    {
  PROVENANCE.push({ id, why, source: SRC });
  return value;
}

/** Semaines minimales de préparation par format. */
const MIN_WEEKS                                        = {
  tri: { S: 8, M: 12, "70.3": 20, Full: 36 },
  run: { "5k": 6, "10k": 8, semi: 12, marathon: 16, trail: 18 },
  bike: { crit: 8, route: 12, cyclo: 14, clm: 10, gravel: 16 },
  swim: { sprint: 8, demifond: 10, fond: 12, ow: 14 },
};

/** Plafond d'heures hebdo par historique — ce que l'athlète peut ENCAISSER. */
const HISTORY_CAPS                                                         = {
  run: {
    reprise: { "5k": 4, "10k": 5, semi: 6, marathon: 8, trail: 9 },
    confirme: { "5k": 5, "10k": 6, semi: 8, marathon: 10, trail: 12 },
    ancien: { "5k": 6, "10k": 7, semi: 9, marathon: 12, trail: 14 },
  },
  bike: {
    reprise: { crit: 6, route: 9, cyclo: 11, clm: 8, gravel: 13 },
    confirme: { crit: 8, route: 12, cyclo: 15, clm: 11, gravel: 17 },
    ancien: { crit: 10, route: 15, cyclo: 18, clm: 13, gravel: 22 },
  },
  swim: {
    reprise: { sprint: 3, demifond: 4, fond: 5, ow: 6 },
    confirme: { sprint: 5, demifond: 6, fond: 7, ow: 9 },
    ancien: { sprint: 6, demifond: 8, fond: 10, ow: 12 },
  },
  tri: {
    reprise: { S: 6, M: 8, "70.3": 11, Full: 15 },
    confirme: { S: 7, M: 10, "70.3": 13, Full: 17 },
    ancien: { S: 8, M: 12, "70.3": 15, Full: 19 },
  },
};

/** Heures UTILES par format — au-delà, le volume ne sert plus l'objectif. */
const UTIL                                        = {
  run: { "5k": 6, "10k": 7, semi: 9, marathon: 12, trail: 14 },
  bike: { crit: 9, route: 13, cyclo: 15, clm: 11, gravel: 20 },
  swim: { sprint: 6, demifond: 8, fond: 10, ow: 12 },
  tri: { S: 8, M: 11, "70.3": 14, Full: 18 },
};

/** Marge de sécurité : 10% retenus sauf intention compétition (assumé). */
const MARGIN = { competition: 1.0, autres: 0.9 };

/** 1B — indicateurs de récupération : sommeil court −15%, charge de vie lourde −10%. */
const RECUP_FACTORS = rule("1B", "les indicateurs de récup promis par evalRules agissent réellement sur le contenu", {
  sleepCourt: 0.85,
  lifeLourde: 0.9,
});

/** Répartition des phases (base→affûtage). C19 : peak ≥ 1 semaine, toujours. */
const PHASE_PCTS = [
  { id: "base"         , nom: "Base", pct: 0.3, c: "#00b8d9" },
  { id: "dev"         , nom: "Développement", pct: 0.25, c: "#9b72ff" },
  { id: "spec"         , nom: "Spécifique", pct: 0.2, c: "#f0b429" },
  { id: "peak"         , nom: "Peak", pct: 0.15, c: "#e63946" },
  { id: "taper"         , nom: "Affûtage", pct: 0.1, c: "#00a376" },
];
const C19_PEAK_MIN_WEEKS = rule("C19", "un plan a toujours ≥1 semaine de peak (les arrondis vidaient le peak des plans courts)", 1);

/** Courbe de charge normalisée par phase — taper strictement décroissant (pilote R3.3). */
const BANDS                                   = {
  base: [0.5, 0.68],
  dev: [0.68, 0.92],
  spec: [0.94, 1.0],
  peak: [1.0, 1.0],
  taper: [0.55, 0.3],
};
const C22_MAX_WEEKLY_GROWTH = rule("C22", "progression lissée : jamais +10% d'une semaine de charge à la suivante (manifeste)", 1.1);
const RECUP_WEEK_FACTOR = 0.62;

/** R3.13 — affûtage : si les planchers bloquent, la fréquence cède sous ce ratio du pic réel. */
const R313_TAPER_MAX_VS_PEAK = rule("R3.13", "réduction d'affûtage ≥40% garantie même quand les planchers de séance bloquent le scaling", 0.55);

/** Cadence des semaines de récupération. */
const RECUP_EVERY                          = { reprise: 3, confirme: 4, ancien: 4 };

/** Nage débutant : la technique borne tout. */
const C15_BEGINNER_SWIM_SESSION_CAP_M = rule("C15", "nage débutant ≤850m/séance, tous blocs confondus (technique avant volume, risque épaule)", 850);
const C20_BEGINNER_SWIM_H_PER_SESSION = rule("C20", "la promesse déclarée d'un nageur débutant suit sa capacité C15 (~25min/séance)", 0.42);
const BEGINNER_SWIM_VOLPEAK_CAP_H = 4;
const SWIM_TIME_FACTOR = 0.4; // heures « génériques » → heures réelles de nage

/** Course : plafonds. */
const C23_BEGINNER_LONG_RUN_CAP_MIN = rule("C23", "jamais de sortie longue CAP >3h pour un débutant (manifeste)", 180);
const MAX_RUN_DAYS                          = { reprise: 4, confirme: 5, ancien: 6 };

/** Natation non-débutant : une séance piscine <750m ne vaut pas le déplacement (manifeste). */
const C24_MIN_SWIM_SESSION_M = rule("C24", "piscine ≥750m par séance pour un non-débutant (manifeste : « sortie piscine de 600m » interdite)", 750);

/** Brick tri : bornes par format ; ×0.8 pour l'historique « reprise » (C21). */
const CAP_BRICK_BIKE                         = { S: 90, M: 120, "70.3": 180, Full: 300 };
const CAP_BRICK_RUN                         = { S: 20, M: 24, "70.3": 32, Full: 70 };
const C21_REPRISE_BRICK_FACTOR = rule("C21", "en reprise, le brick ne mange pas la semaine (61% du volume hebdo observé sans ce facteur)", 0.8);

/** Plafonds de séance longue / nage par format (R3.4b), et budget implicite du volume. */
const CAP_LONG                         = { "5k": 74, "10k": 90, semi: 130, marathon: 180, trail: 255, crit: 150, route: 180, clm: 165, cyclo: 240, gravel: 360 };
const CAP_SWIM                         = { sprint: 1400, demifond: 2000, fond: 3000, ow: 4500, S: 750, M: 1500, "70.3": 1900, Full: 3000 };
const AVG_SESSION_H                                 = { run: 1.15, bike: 1.3, tri: 1.2 };

/** C13 — l'échauffement chiffré ne dépasse jamais 25min ni le corps de séance. */
const C13_WARMUP_MAX_MIN = rule("C13", "échauffement ≤25min et ≤ corps de séance", 25);

/** Interdictions du manifeste — vérifiées par l'auditeur, rappelées ici pour le générateur. */
const FORBIDDEN = [
  "deux longues sorties CAP consécutives",
  "deux jours durs adjacents",
  "une semaine de récupération plus chargée que la précédente",
  "une progression de volume >+10% entre semaines de charge",
  "une séance VO2max en affûtage",
  "une sortie piscine de 600m (non-débutant)",
  "une sortie longue CAP de 3h pour un débutant",
  "une séance dont l'objectif n'est pas expliqué",
];

// ===== src/engine/disciplineRegistry.ts =====
/**
 * Registre de disciplines (spec rétention R4.1) — la COUTURE D'EXTENSIBILITÉ du moteur.
 *
 * Le trio natation/vélo/course était codé en dur ; le trail était traité comme de la
 * course route (faux : métriques, charge musculaire excentrique, compétences distinctes).
 * Ce registre déclare chaque discipline comme DONNÉE : métrique primaire, source de
 * zones (test de référence + protocole de retest), type de volume (distance vs durée),
 * compétences trackées, règles de charge propres.
 *
 * Décision d'architecture (documentée dans RAPPORT-R4-RETENTION.md) : le registre est la
 * source déclarative que consultent générateur et UI ; les disciplines historiques
 * (sw/bk/rn) gardent leurs identifiants `d` existants — le contrat V1Plan et les 486
 * combinaisons d'audit restent inchangés. Le TRAIL reste porté par le pipeline course
 * (format "trail" du sport run) mais ses spécificités viennent d'ICI, plus du code en
 * dur. Ajouter une discipline = ajouter une entrée (+ ses gabarits de séance) — le test
 * d'extensibilité de la spec (§14) vérifie qu'une entrée fictive ne casse rien.
 */

                                 
             
                
                                                    
                                                                           
                                                                                          
                                                                                            
                                                                                                 
                                      
                                                                         
                   
                                                                                            
                      
                                                                                              
                  
 

const DISCIPLINE_REGISTRY                                 = {
  swim: {
    id: "swim", label: "Natation", primaryMetric: "pace_100m",
    zonesSource: { test: "CSS (400m + 200m à fond)", protocol: "Nage 400m à fond, récupère 10min, puis 200m à fond : l'écart de temps donne ton allure critique au 100m.", refKey: "css" },
    volumeUnit: "distance", skills: ["technique", "respiration", "virages", "eau libre"],
    loadRules: ["zéro impact : tolère les plus hautes fréquences", "épaule = zone sentinelle (coiffe)"],
    impact: false,
  },
  bike: {
    id: "bike", label: "Vélo", primaryMetric: "power_w",
    zonesSource: { test: "FTP (20min à fond)", protocol: "20 minutes à fond après échauffement : FTP ≈ 95% de la puissance moyenne.", refKey: "ftp" },
    volumeUnit: "duration", skills: ["position aéro", "pilotage", "cadence"],
    loadRules: ["zéro impact : gros volumes tolérés", "force basse cadence = charge musculaire, espacer des séances de course"],
    impact: false,
  },
  run: {
    id: "run", label: "Course route", primaryMetric: "pace_km",
    zonesSource: { test: "Allure seuil (3min + 10min à fond)", protocol: "3min à fond, récupération complète, puis 10min à fond : l'écart de distance donne l'allure seuil. Un 10-15km récent à fond est une bonne estimation.", refKey: "thrPace" },
    volumeUnit: "distance", skills: ["économie de course", "gammes", "pacing"],
    loadRules: ["impact = risque n°1 : volume progressif, jamais deux longues consécutives", "plafond de jours d'impact par semaine"],
    impact: true,
  },
  trail: {
    id: "trail", label: "Trail", primaryMetric: "gap_pace",
    zonesSource: { test: "Allure seuil (3min + 10min à fond, sur plat)", protocol: "Même test que la route, SUR PLAT : en trail l'allure brute ne veut rien dire, on raisonne en GAP (allure ajustée à la pente) quand les données existent, sinon en FC/RPE.", refKey: "thrPace" },
    volumeUnit: "duration", // temps + D+, JAMAIS en km seul (spec §2)
    skills: ["descente technique", "montée au train", "navigation", "gestion ravito"],
    loadRules: [
      "volume planifié en TEMPS + D+ (un km de trail n'est pas un km de route)",
      "descente = charge excentrique : délais de récupération rallongés après forte descente",
      "mêmes flags de prudence impact que la course route (périostite : descentes = drapeau)",
    ],
    impact: true,
  },
};

/** D+ cible d'une sortie longue trail, dérivé de la durée (~350-450m/h en course nature). */
function trailElevationTarget(durationMin        )                             {
  const h = durationMin / 60;
  return { lo: Math.round((h * 350) / 50) * 50, hi: Math.round((h * 450) / 50) * 50 };
}

// ===== src/engine/reasoningEngine.ts =====
/**
 * TrainingReasoningEngine — Sprint 1 V2.
 *
 * « Le moteur réfléchit avant de générer » (manifeste) : comprendre l'athlète →
 * l'objectif → les contraintes → calculer la charge. Chaque décision est un
 * {id, what, val, why} — le format d'evalRules promu au plan entier.
 * Les nombres viennent de la matrice de contraintes (provenance V1.5 validée).
 */
                                                                                

/** Zones cardio (Karvonen si FC repos connue, sinon %FCmax) — port V1.5. */
function hrZones(age         , hrMax         , hrRest         ) {
  const fcMax = parseInt(hrMax || "") || Math.round(208 - 0.7 * (parseInt(age || "") || 35));
  const rest = parseInt(hrRest || "") || 0;
  const Z = (lo        , hi        ) => {
    if (rest) return Math.round(rest + (fcMax - rest) * lo) + "-" + Math.round(rest + (fcMax - rest) * hi) + " bpm";
    return Math.round(fcMax * lo) + "-" + Math.round(fcMax * hi) + " bpm";
  };
  return { fcMax, z1: Z(0.6, 0.7), z2: Z(0.7, 0.8), tempo: Z(0.8, 0.87), seuil: Z(0.87, 0.92), vo2: Z(0.92, 0.97) };
}

function parsePaceSec(v         )         {
  if (!v || !/^\d+[:h.]\d+$/.test(v.trim())) return 0;
  const m = v.trim().split(/[:h.]/);
  return parseInt(m[0]) * 60 + parseInt(m[1]);
}

                                  
                     
 

class TrainingReasoningEngine {
  analyze(a                )               {
    const decisions             = [];
    const D = (id        , what        , val                 , why        ) => decisions.push({ id, what, val, why });
    const sp = a.sport, fmt = a.format;
    const history = a.history || "confirme";
    const level = a.level || "inter";
    const beginner = level === "debutant";
    const finisher = a.intent === "finir";
    const comp = a.intent === "competition";

    // ---- 1. Comprendre l'objectif : durée de préparation ----
    const minW = MIN_WEEKS[sp][fmt] || 12;
    let weeks = minW;
    if (a.race_date) {
      // R8 — l'entraînement commence CETTE semaine, pas la prochaine. L'ancien calcul
      // floor((course − maintenant)/7j) perdait la fraction de semaine : course dans
      // 8,5 semaines → plan de 8 semaines ancré sur la course → départ lundi SUIVANT.
      // La durée est désormais le nombre de semaines calendaires entre le lundi de
      // l'ancrage (plan_start, sinon aujourd'hui) et le lundi de course, inclus : le
      // générateur (ancré fin de course) fait alors démarrer la semaine 1 aujourd'hui.
      const MS = 864e5;
      const mondayOf = (t        )         => t - ((new Date(t).getUTCDay() + 6) % 7) * MS;
      const anchorT = a.plan_start ? new Date(a.plan_start + "T00:00:00Z").getTime() : Date.now();
      const span = Math.round((mondayOf(new Date(a.race_date + "T00:00:00Z").getTime()) - mondayOf(anchorT)) / (7 * MS)) + 1;
      if (span >= Math.ceil(minW * 0.75) && span <= 80) weeks = span;
    }
    D("duree", "Durée de préparation", weeks + " semaines", "Minimum " + minW + " pour " + fmt + (a.race_date ? ", ajusté à la date de course" : ""));

    // ---- 2. Comprendre l'athlète : capacité de charge ----
    const caps = HISTORY_CAPS[sp][history]?.[fmt] ?? 10;
    const util = UTIL[sp][fmt] ?? 12;
    const marg = comp ? MARGIN.competition : MARGIN.autres;
    D("capacite", "Plafond historique", caps + "h/sem", "Ce que l'historique « " + history + " » permet d'encaisser sur " + fmt);
    D("utile", "Volume utile du format", util + "h/sem", "Au-delà, les heures ne servent plus l'objectif " + fmt);
    if (!comp) D("marge", "Marge de sécurité", "-10%", "Hors compétition, 10% de marge sur tous les plafonds (santé d'abord)");

    // 1B — indicateurs de récupération
    const recupFactor = (a.sleep === "court" ? RECUP_FACTORS.sleepCourt : 1) * (a.life_load === "lourde" ? RECUP_FACTORS.lifeLourde : 1);
    if (recupFactor < 1) D("1B", "Récupération dégradée", "volume ×" + recupFactor.toFixed(2), "Sommeil court et/ou charge de vie lourde : le contenu baisse réellement");

    const volMax = parseInt(a.vol_max || "10");
    const sessionScale = Math.min(1, (Math.min(volMax, caps, util) * marg) / util) * recupFactor;
    let volPeak = Math.round(Math.min(volMax, caps, util) * marg * recupFactor * 10) / 10;
    if (sp === "swim" && beginner) {
      volPeak = Math.min(volPeak, BEGINNER_SWIM_VOLPEAK_CAP_H);
      D("C15", "Nageur débutant", "pic ≤" + BEGINNER_SWIM_VOLPEAK_CAP_H + "h", "La technique borne le volume, pas l'historique (risque épaule)");
    }
    if (sp === "swim") volPeak = Math.round(volPeak * SWIM_TIME_FACTOR * 10) / 10;

    // ---- 3. Comprendre les contraintes : médical, jours, budget ----
    const medHold = a.med_pain === "oui" || a.med_dizzy === "oui" || a.med_treat === "oui";
    if (medHold) D("medical", "⚠️ Drapeau médical", "plan de maintien", "Aucune intensité générée sans feu vert médical ; pic allégé à 40%");
    const offDays = (a.off_which || "").split(",").filter(Boolean);
    const use10 = a.dispo === "quotidienne" && a.shift_ok === "oui" && offDays.length < 2;
    if (use10) D("cycle", "Cycle de 10 jours", "activé", "Disponibilité quotidienne : densité mieux répartie qu'en semaine de 7 jours");
    const recupEvery = RECUP_EVERY[history];
    D("recup", "Semaine de récupération", "toutes les " + recupEvery + " semaines", history === "reprise" ? "Reprise : récupération plus fréquente" : "Assimilation régulière de la charge");

    const volBudget = Math.min(volMax, caps, util) * marg;
    const avgH = AVG_SESSION_H[sp];
    const volSessCap = avgH ? Math.max(3, Math.round(volBudget / avgH)) : 7;
    const budgetPerWeek = Math.min(parseInt(a.sessions_max || "7") || 7, volSessCap);
    D("budget", "Séances par semaine", budgetPerWeek, "Budget déclaré ∧ budget implicite du volume (" + volBudget.toFixed(1) + "h ÷ " + (avgH ?? "—") + "h/séance)");

    const injuries = (a.injury || "").split(",").filter((x) => x && x !== "aucune");
    let maxRunDays                = null;
    if (sp === "run") {
      const injImpact = injuries.some((x) => ["tibia", "genou", "pied", "hanche"].includes(x));
      maxRunDays = MAX_RUN_DAYS[history] ?? 5;
      if (injImpact) maxRunDays = Math.max(3, maxRunDays - 1);
      D("impact", "Jours de course max", maxRunDays + "/semaine", "La course est le sport à plus fort impact" + (injImpact ? " — blessure d'impact déclarée, -1 jour" : ""));
    }

    // ---- 4. Calculer la charge : phases (C19) et courbe (bands + C22) ----
    const phases          = PHASE_PCTS.map((p) => ({ ...p, start: 0, end: 0, weeks: 0 }));
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
    if (sp === "swim" && beginner) {
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

    const thrPace = a.pace_known === "oui" ? parsePaceSec(a.pace) : 0;
    const css = a.css_known === "oui" ? parsePaceSec(a.css) : 0;
    const ftp = a.ftp_known === "oui" ? parseInt(a.ftp || "") || 0 : 0;
    const hz = hrZones(a.age, a.hr_max, a.hr_rest);

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
      baseRefs: { ftp, thrPace, css },
      hz,
    };
  }
}

// ===== src/generator/renderer.ts =====
/**
 * Rendu V2 — port fidèle de renderSess/stepMin/ZDEF de Coach_Pro_V1.5 (R3.1/R3.8/C13).
 * DERNIÈRE étape, lecture seule : fixe warmup/cooldown (échauffement ≤25min et ≤ corps),
 * n'expose le scaling que sur les steps body. Texte français identique au produit.
 */
                                                            

/** R3.1/R3.8 — intensités relatives : référence + multiplicateurs, replis FC puis RPE. */
const ZDEF                          = {
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
};

const fk = (s        ) => Math.floor(s / 60) + "'" + String(Math.round(s % 60)).padStart(2, "0");

function fmtInt(key                           , refs      , hz         )         {
  const d = key ? ZDEF[key] : undefined;
  if (!d) return key || "";
  if (d.ref === "ftp" && refs.ftp) return Math.round(refs.ftp * d.lo) + "-" + Math.round(refs.ftp * d.hi) + "W";
  if (d.ref === "thrPace" && refs.thrPace) return fk(refs.thrPace * d.lo) + "-" + fk(refs.thrPace * d.hi) + "/km";
  if (d.ref === "css" && refs.css) return (d.lo === d.hi ? fk(refs.css * d.lo) : fk(refs.css * d.lo) + "-" + fk(refs.css * d.hi)) + "/100m";
  if (d.hr && hz[d.hr]) return hz[d.hr];
  return d.fb;
}

const intOf = (key               )                                                 => {
  const d = key ? ZDEF[key] : undefined;
  return d ? { ref: d.ref, lo: d.lo, hi: d.hi } : null;
};

/** Minutes d'un step (nage : mètres via CSS de base ; km course/vélo via allure seuil). */
function stepMin(st        , disc        , baseRefs      )         {
  const reps = st.reps || 1;
  if (st.durationMin) return reps * st.durationMin;
  if (st.distanceM) {
    const d = st.d || disc;
    if (d === "sw") return ((reps * st.distanceM) / 100) * ((baseRefs.css || 130) / 60);
    return ((reps * st.distanceM) / 1000) * ((baseRefs.thrPace || 330) / 60);
  }
  return 0;
}

                                               
                      
                   
                   
 

function renderSess(s                   , refs      , hz         , baseRefs      )         {
  const steps = s.steps || [];
  const bodies = steps.filter((x) => x.role === "body");
  let bodyMin = 0;
  for (const b of bodies) {
    b._min = stepMin(b, s.d, baseRefs);
    bodyMin += b._min;
  }
  const seg           = [];
  if (s.brick) {
    const bk = bodies.find((b) => b.leg === "bike") ;
    const rn = bodies.find((b) => b.leg === "run") ;
    seg.push(
      bk.durationMin + "min vélo @ " + fmtInt(bk.zone          , refs, hz) +
        ", dernier tiers @ allure course, échauffement progressif inclus, puis transition rapide + " + rn.durationMin + "min CAP" +
        (s.runInj ? " souple, surface souple" : " @ allure cible")
    );
  } else {
    const w = steps.find((x) => x.role === "warmup");
    if (w) {
      if (w.durationMin != null) {
        const wm = Math.min(w.durationMin, C13_WARMUP_MAX_MIN, Math.max(3, Math.round(bodyMin) || w.durationMin));
        w._min = wm;
        seg.push("Échauffement " + wm + "min" + (w.text ? " " + w.text : ""));
      } else if (w.distanceM != null) {
        w._min = stepMin(w, s.d, baseRefs);
        seg.push("Échauffement " + w.distanceM + "m" + (w.text ? " " + w.text : ""));
      }
    }
    for (const b of bodies) {
      let str = (b                       ).prefix || "";
      const reps = b.reps || 1;
      if (reps > 1) str += reps + "×";
      if (b.durationMin != null) str += b.durationMin + "min";
      else if (b.distanceM != null) str += ((b                        ).unitKm ? b.distanceM / 1000 : b.distanceM) + ((b                        ).unitKm ? "km" : "m");
      if (b.zone) str += " @ " + fmtInt(b.zone          , refs, hz);
      str += (b                       ).suffix || "";
      if (b.recoveryText) str += " (récup " + b.recoveryText + " entre les blocs)";
      seg.push(str);
    }
    const c = steps.find((x) => x.role === "cooldown");
    if (c) {
      if (c.durationMin != null) {
        c._min = c.durationMin;
        seg.push("Retour au calme " + c.durationMin + "min" + (c.text ? " " + c.text : ""));
      } else if (c.distanceM != null) {
        c._min = stepMin(c, s.d, baseRefs);
        seg.push("Retour au calme " + c.distanceM + "m" + (c.text ? " " + c.text : ""));
      }
    }
  }
  let det = seg.join(" · ");
  if (s.note) det += " — 💡 " + s.note;
  s.min = steps.reduce((t, x) => t + (x._min || 0), 0);
  s.det = det;
  return det;
}

// ===== src/engine/loadModel.ts =====
/**
 * loadModel — quantification de charge par séance (Sprint 0 : durée prescrite).
 *
 * FONDATION PARTAGÉE : la progression (+10%), le ratio aiguë/chronique (audit)
 * et CTL/ATL (analytics) dépendent tous du même métrique. Sprint 0 quantifie la
 * durée totale prescrite ; la pondération par intensité (TSS-like) viendra ensuite.
 *
 * Règle cardinale (note.md) : SOMMER réellement la séance —
 * N×M min + minutes isolées + échauffement/retour au calme + récup entre blocs —
 * jamais le max isolé, qui sous-estime massivement les séances structurées.
 * Natation : sommer les mètres et convertir via l'allure X'YY/100m du texte.
 */

                          
                                       
                       
                     
                
                       
                        
                       
             
 

                             
                                      
               
              
                                                                            
                                                                          
 

                                                                 

                              
                  
                                               
                         
                  
                                                                                  
 

/** Références athlète pour convertir les distances en temps (mêmes entrées que stepMin V1.5, arithmétique à nous). */
                              
                                    
                                                      
 
const DEFAULT_REFS              = { cssSecPer100m: 130, thrPaceSecPerKm: 330 };

/** Durées nominales quand rien n'est parsable (séance sans volume prescrit). */
const NOMINAL_MIN                         = { rn: 40, bk: 60, sw: 30, br: 60, rs: 0 };
/** Allure de repli si aucune allure /100m dans le texte (nageur loisir prudent). */
const DEFAULT_SWIM_PACE_S_PER_100M = 130;

/** Segments descriptifs sans volume additif propre (suffixes, consignes). */
const STOPWORD_SEGMENT = /^(termine par|navigation|endurance$|fractionne|familiarisation|souple |éducatifs @|mobilité|étirements|repos|marche|allure )/i;

const mid = (a        , b         )         => (b !== undefined && !Number.isNaN(b) ? (a + b) / 2 : a);

/** "2min30" → 2.5 ; "6-10min" → 8 ; "45min" → 45. Utilisé sur un texte déjà nettoyé. */
const RE_REPS_MIN = /(\d+)\s*[×x]\s*(\d+)(?:-(\d+))?\s*min(\d{2})?/g;
const RE_LONE_MIN = /(\d+)(?:-(\d+))?\s*min(\d{2})?\b/g;
const RE_REPS_M = /(\d+)(?:-(\d+))?\s*[×x]\s*(\d+)\s*m\b(?!in)/g;
const RE_LONE_M = /(\d+)\s*m\b(?!in)/g;
const RE_PACE_100 = /(\d+)'(\d{2})\/100m/;

                       
                  
                  
 

/** Extrait la récup entre blocs "(récup 2-3min ...)" / "(récup 15-20s ...)" en minutes unitaires. */
function extractRecovery(segment        )                                           {
  const m = segment.match(/\((?:récup|repos)\s+([^()]*)/i);
  if (!m) return { perBlockMin: 0, cleaned: segment };
  const inner = m[1];
  let perBlockMin = 0;
  const asMin = inner.match(/(\d+)(?:-(\d+))?\s*min(\d{2})?/);
  const asSec = inner.match(/(\d+)(?:-(\d+))?\s*s\b/);
  if (asMin) {
    perBlockMin = mid(Number(asMin[1]), asMin[2] ? Number(asMin[2]) : undefined) + (asMin[3] ? Number(asMin[3]) / 60 : 0);
  } else if (asSec) {
    perBlockMin = mid(Number(asSec[1]), asSec[2] ? Number(asSec[2]) : undefined) / 60;
  }
  // Retire le parenthétique récup (gère la parenthèse imbriquée résiduelle)
  const cleaned = segment.replace(/\((?:récup|repos)[^()]*(?:\([^()]*\))?[^()]*\)?/gi, " ");
  return { perBlockMin, cleaned };
}

/** Temps prescrit d'un segment pour les sports en minutes (rn/bk/br/rs). */
function segmentMinutes(segRaw        )              {
  const seg = segRaw.trim();
  if (!seg || STOPWORD_SEGMENT.test(seg)) return { minutes: 0, parsed: true };

  const { perBlockMin, cleaned } = extractRecovery(seg);
  let text = cleaned
    .replace(/\([^()]*\)/g, " ") // parenthétiques restants
    .replace(/derniers?\s+\d+(?:-\d+)?\s*min/gi, " "); // "derniers 15-20min" = sous-ensemble de la durée principale

  let total = 0;
  let reps = 0;
  let parsedAny = false;

  text = text.replace(RE_REPS_MIN, (_all, r, m1, m2, sec) => {
    const n = Number(r);
    reps = Math.max(reps, n);
    total += n * (mid(Number(m1), m2 ? Number(m2) : undefined) + (sec ? Number(sec) / 60 : 0));
    parsedAny = true;
    return " ";
  });
  text.replace(RE_LONE_MIN, (_all, m1, m2, sec) => {
    total += mid(Number(m1), m2 ? Number(m2) : undefined) + (sec ? Number(sec) / 60 : 0);
    parsedAny = true;
    return " ";
  });

  if (reps > 1) total += perBlockMin * (reps - 1);
  return { minutes: total, parsed: parsedAny || total > 0 };
}

/** Mètres prescrits d'un segment natation (+ récup en secondes convertie). */
function segmentSwim(segRaw        )                                                           {
  let seg = segRaw.trim();
  if (!seg || STOPWORD_SEGMENT.test(seg)) return { meters: 0, recoveryMin: 0, parsed: true };

  // "nage continue fractionnée (ex 8-12×50m)" : le volume réel est dans le parenthétique
  const ex = seg.match(/\(ex\s+([^)]*)\)/i);
  if (ex) seg = seg.replace(/\(ex\s+[^)]*\)/i, " " + ex[1] + " ");

  const { perBlockMin, cleaned } = extractRecovery(seg);
  let text = cleaned.replace(/\([^()]*\)/g, " ").replace(/\/100m/g, " "); // ne pas compter le "100m" des allures

  let meters = 0;
  let reps = 0;
  let parsedAny = false;

  text = text.replace(RE_REPS_M, (_all, r1, r2, m1) => {
    const n = mid(Number(r1), r2 ? Number(r2) : undefined);
    reps = Math.max(reps, Math.round(n));
    meters += n * Number(m1);
    parsedAny = true;
    return " ";
  });
  text.replace(RE_LONE_M, (_all, m1) => {
    meters += Number(m1);
    parsedAny = true;
    return " ";
  });

  const recoveryMin = reps > 1 ? perBlockMin * (reps - 1) : 0;
  return { meters, recoveryMin, parsed: parsedAny || meters > 0 };
}

/** Récup inter-blocs depuis recoveryText V1.5 ("2min trot", "15-20s", "repos libre…") en minutes. */
function recoveryMinFromText(txt                    )         {
  if (!txt) return 0;
  const asMin = txt.match(/(\d+)(?:-(\d+))?\s*min(\d{2})?/);
  if (asMin) return mid(Number(asMin[1]), asMin[2] ? Number(asMin[2]) : undefined) + (asMin[3] ? Number(asMin[3]) / 60 : 0);
  const asSec = txt.match(/(\d+)(?:-(\d+))?\s*s\b/);
  if (asSec) return mid(Number(asSec[1]), asSec[2] ? Number(asSec[2]) : undefined) / 60;
  return 0; // "repos libre" et consorts : non chiffré, non compté
}

/** Minutes d'un step (hors récup), discipline du step ou de la séance. */
function stepMinutes(st         , sessionD        , refs             )         {
  const reps = st.reps || 1;
  if (st.durationMin) return reps * st.durationMin;
  if (st.distanceM) {
    const d = st.d || sessionD;
    if (d === "sw") return (reps * st.distanceM * refs.cssSecPer100m) / 100 / 60;
    return (reps * st.distanceM * refs.thrPaceSecPerKm) / 1000 / 60;
  }
  return 0;
}

/**
 * Chemin structuré V1.5 : somme des steps + récup inter-blocs.
 * Différence méthodologique ASSUMÉE avec le stepMin du générateur : nous comptons
 * la récup entre répétitions (N-1 × récup), lui non — l'écart est un constat, pas un bug.
 * Échauffement chiffré : même clamp que renderSess (≤25min, ≤ corps) pour comparer à périmètre égal.
 */
function sessionLoadFromSteps(s            , refs             )              {
  const flags           = [];
  const steps = s.steps || [];
  const bodies = steps.filter((x) => x.role === "body");
  let bodyMin = 0;
  let recovery = 0;
  let meters = 0;
  for (const b of bodies) {
    bodyMin += stepMinutes(b, s.d, refs);
    const reps = b.reps || 1;
    if (reps > 1) recovery += recoveryMinFromText(b.recoveryText) * (reps - 1);
    if ((b.d || s.d) === "sw" && b.distanceM) meters += (b.reps || 1) * b.distanceM;
  }
  let auxMin = 0;
  for (const st of steps) {
    if (st.role === "body") continue;
    if (st.role === "warmup" && st.durationMin != null) {
      auxMin += Math.min(st.durationMin, 25, Math.max(3, Math.round(bodyMin) || st.durationMin));
    } else {
      auxMin += stepMinutes(st, s.d, refs);
    }
    if ((st.d || s.d) === "sw" && st.distanceM) meters += st.distanceM;
  }
  const minutes = bodyMin + recovery + auxMin;
  if (bodies.length > 0 && bodies.every((b) => b.durationMin == null && b.distanceM == null)) {
    flags.push("séance à steps sans durée ni distance chiffrée : « " + s.name + " »");
  }
  if (typeof s.min === "number" && s.min > 0) {
    const delta = minutes - s.min;
    if (Math.abs(delta) > Math.max(10, s.min * 0.25)) {
      flags.push("écart estimateur : nous " + minutes.toFixed(0) + "min vs générateur " + s.min + "min (« " + s.name + " »)");
    }
  }
  return {
    minutes,
    meters: s.d === "sw" || meters > 0 ? meters || null : null,
    confidence: "full",
    flags,
    generatorMin: s.min,
  };
}

/** Charge d'une séance : chemin structuré V1.5 si steps présents, sinon parsing texte (endurabuild-3). */
function sessionLoad(s            , refs              = DEFAULT_REFS)              {
  if (s.steps && s.steps.length > 0 && s.d !== "rs") return sessionLoadFromSteps(s, refs);
  return sessionLoadFromText(s);
}

/** Répartition d'intensité d'une séance (manifeste : « répartition des intensités »).
 * Facile = échauffement/retour au calme/récup inter-blocs/zones easy-rec-z2 ;
 * modéré = tempo/sweetspot/race-pace/force/mara ; dur = vo2/seuil/vitesse/css + legs de brick. */
                                 
                  
                 
                  
 
const HARD_SUFFIX = [".vo2", ".thr", ".speed", ".css"];
const MOD_SUFFIX = [".ss", ".rp", ".frc", ".mara"];
function intensitySplit(s            , refs              = DEFAULT_REFS)                 {
  const out                 = { easyMin: 0, modMin: 0, hardMin: 0 };
  if (!s.steps || !s.steps.length || s.d === "rs") {
    out.easyMin = sessionLoad(s, refs).minutes; // texte/repos : compté facile (prudence)
    return out;
  }
  for (const st of s.steps) {
    const reps = st.reps || 1;
    const stMin = st.durationMin
      ? reps * st.durationMin
      : st.distanceM
        ? ((st.d || s.d) === "sw" ? (reps * st.distanceM * refs.cssSecPer100m) / 100 / 60 : (reps * st.distanceM * refs.thrPaceSecPerKm) / 1000 / 60)
        : 0;
    if (st.role !== "body") {
      out.easyMin += stMin;
      continue;
    }
    const zone = typeof st.zone === "string" ? st.zone : "";
    // Brick : legs classés par leur zone (bk.rp = modéré) ; le leg CAP « allure cible » = modéré.
    const cls = HARD_SUFFIX.some((z) => zone.endsWith(z))
      ? "hard"
      : MOD_SUFFIX.some((z) => zone.endsWith(z)) || st.leg === "run"
        ? "mod"
        : "easy";
    if (cls === "hard") out.hardMin += stMin;
    else if (cls === "mod") out.modMin += stMin;
    else out.easyMin += stMin;
    if (reps > 1) out.easyMin += recoveryMinFromText(st.recoveryText) * (reps - 1); // la récup est facile
  }
  return out;
}

/** Chemin texte historique (endurabuild-3, et recoupement) : minutes prescrites + traçabilité. */
function sessionLoadFromText(s            )              {
  const flags           = [];
  const det = (s.det || "").split("— 💡")[0]; // la note pédago ne porte pas de volume
  const segments = det.split("·");

  if (s.d === "rs") {
    // Repos / renfo greffé : seules les minutes explicites comptent ("20min en fin de footing")
    let minutes = 0;
    for (const seg of segments) minutes += segmentMinutes(seg).minutes;
    return { minutes, meters: null, confidence: "rest", flags };
  }

  if (s.d === "sw") {
    let meters = 0;
    let recoveryMin = 0;
    let allParsed = true;
    for (const seg of segments) {
      const r = segmentSwim(seg);
      meters += r.meters;
      recoveryMin += r.recoveryMin;
      if (!r.parsed) allParsed = false;
    }
    if (meters === 0) {
      flags.push("natation sans métrage prescrit : « " + s.name + " » → nominal " + NOMINAL_MIN.sw + "min");
      return { minutes: NOMINAL_MIN.sw, meters: null, confidence: "nominal", flags };
    }
    const paceMatch = det.match(RE_PACE_100);
    let paceS = DEFAULT_SWIM_PACE_S_PER_100M;
    if (paceMatch) paceS = Number(paceMatch[1]) * 60 + Number(paceMatch[2]);
    else flags.push("allure /100m absente du texte → repli " + DEFAULT_SWIM_PACE_S_PER_100M + "s/100m");
    const minutes = (meters / 100) * (paceS / 60) + recoveryMin;
    return { minutes, meters, confidence: allParsed && paceMatch ? "full" : "partial", flags };
  }

  // Sports en minutes : rn / bk / br
  let minutes = 0;
  let allParsed = true;
  for (const seg of segments) {
    const r = segmentMinutes(seg);
    minutes += r.minutes;
    if (!r.parsed) allParsed = false;
  }
  if (minutes === 0) {
    const nominal = NOMINAL_MIN[s.d] ?? 45;
    flags.push("séance sans durée prescrite : « " + s.name + " » (" + s.d + ") → nominal " + nominal + "min");
    return { minutes: nominal, meters: null, confidence: "nominal", flags };
  }
  return { minutes, meters: null, confidence: allParsed ? "full" : "partial", flags };
}

// ===== src/audit/coherenceScorer.ts =====
/**
 * coherenceScorer — audit « coach de charge » (Sprint 0).
 *
 * INDÉPENDANT DU GÉNÉRATEUR par construction : la charge est recalculée
 * bottom-up depuis les textes de séances (loadModel), jamais depuis les
 * variables internes du générateur. C'est la condition pour que l'audit
 * ne valide pas trivialement ses propres règles.
 *
 * Seuils indicatifs (note.md) :
 * - ratio prescrit/déclaré > 1.4 → sur-prescrit ; < 0.5 → sous-prescrit
 * - part de la séance longue > 45-55% de la semaine → alerte
 */
                                                              

/** Plafonds brick vélo (audit 2, spec utilisateur) : "jamais dépassés, même de peu". */
const BRICK_BIKE_BOUNDS                                   = {
  S: [45, 90],
  M: [60, 120],
  "70.3": [90, 180],
  Full: [150, 300],
};

const THRESHOLDS = {
  overPrescribed: 1.4,
  underPrescribed: 0.5,
  softOver: 1.2,
  softUnder: 0.7,
  longShareAlert: 0.55,
  longShareWatch: 0.45,
}         ;

                            
              
                  
                   
                      
                        
                
                            
                    
                                                                                
                                                                          
 

                            
                     
                                                                
                                                                        
                                                                
                       
                           
                            
                                                                             
                                                                               
                                                                              
                                                                                                     
                                                                                  
                                                                                
                                                                                                     
                                                                                              
                                            
                                                                                             
                                                                            
                                                                                                  
                                                                                   
                                                                                     
                                                                             
                                                                       ﻿            
                                                                                                                           
                                                                                       
                               
                                                                                           
                  
 

                            
                 
                  
                                                                                                
                     
 

function auditWeek(w        , refs             , gaps          , stepFlags          )            {
  let prescribed = 0;
  let longest = 0;
  let nominal = 0;
  let fullMin = 0;
  const loads                = [];
  for (const day of w.days) {
    let dayMin = 0;
    for (const s of day.sessions) {
      const load = sessionLoad(s, refs);
      loads.push(load);
      dayMin += load.minutes;
      if (load.confidence === "nominal") nominal++;
      // "rest" = minutes explicites d'un renfo greffé → parsing fiable aussi
      if (load.confidence === "full" || load.confidence === "rest") fullMin += load.minutes;
      if (typeof load.generatorMin === "number" && load.generatorMin > 0) gaps.push(Math.abs(load.minutes - load.generatorMin));
      for (const f of load.flags) if (f.startsWith("séance à steps") || f.startsWith("écart estimateur")) stepFlags.push("S" + w.num + " : " + f);
    }
    // La « séance longue » au sens de l'audit = le plus gros JOUR d'entraînement
    if (dayMin > longest) longest = dayMin;
    prescribed += dayMin;
  }
  // V1.5 : vol_declared = promesse de la courbe (R3.3) ; endurabuild-3 : vol
  const declaredMin = (w.vol_declared ?? w.vol) * 60;
  return {
    num: w.num,
    phaseId: w.phase.id,
    isRecup: w.isRecup,
    declaredMin,
    prescribedMin: Math.round(prescribed),
    ratio: declaredMin > 0 ? prescribed / declaredMin : 0,
    longestSessionMin: Math.round(longest),
    longShare: prescribed > 0 ? longest / prescribed : 0,
    nominalSessions: nominal,
    fullMinutes: fullMin,
  };
}

function auditPlan(plan        , opts            = {})            {
  const refs = opts.refs ?? DEFAULT_REFS;
  const gaps           = [];
  const stepFlags           = [];
  const weeks = plan.weeks.map((w) => auditWeek(w, refs, gaps, stepFlags));
  const hard           = [];
  const soft           = [];
  const flags           = stepFlags.slice(0, 20);

  // ---- Contrainte dure : jamais deux jours durs adjacents ----
  const allDays = plan.weeks.flatMap((w) => w.days);
  let adjacentHardDays = 0;
  for (let i = 0; i < allDays.length - 1; i++) {
    if (allDays[i].charge === "dur" && allDays[i + 1].charge === "dur") adjacentHardDays++;
  }
  if (adjacentHardDays > 0) hard.push(adjacentHardDays + " paire(s) de jours durs adjacents");

  // ---- Contrainte dure : semaine de récup jamais plus chargée que la précédente ----
  let recupHeavier = 0;
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i].isRecup && !weeks[i - 1].isRecup && weeks[i].prescribedMin > weeks[i - 1].prescribedMin) {
      recupHeavier++;
      flags.push("S" + weeks[i].num + " (récup) plus chargée que S" + weeks[i - 1].num);
    }
  }
  if (recupHeavier > 0) hard.push(recupHeavier + " semaine(s) de récup plus chargée(s) que la semaine précédente");

  // ---- Semaine du pic : ratio prescrit/déclaré ----
  const candidates = weeks.filter((w) => !w.isRecup);
  const peak = candidates.reduce((a, b) => (b.declaredMin > a.declaredMin ? b : a), candidates[0]);

  // ---- Toutes les semaines normales : combien sortent de la bande ? ----
  // (le pic seul sous-estime : en base, bike prescrit jusqu'à 2× le déclaré)
  const normal = weeks.filter((w) => !w.isRecup && w.phaseId !== "taper");
  const weeksOver = normal.filter((w) => w.ratio > THRESHOLDS.overPrescribed).length;
  const weeksUnder = normal.filter((w) => w.ratio < THRESHOLDS.underPrescribed).length;

  // ---- Affûtage (audit 2) : réduction ≥40% vs pic, en minutes indépendantes ----
  const peakByMin = candidates.reduce((a, b) => (b.prescribedMin > a.prescribedMin ? b : a), candidates[0]);
  const taperWeeks = weeks.filter((w) => w.phaseId === "taper");
  const lastTaper = taperWeeks.length > 0 ? taperWeeks[taperWeeks.length - 1] : null;
  const taperRatio = lastTaper ? lastTaper.ratio : null;
  const taperVsPeak = lastTaper && peakByMin.prescribedMin > 0 ? lastTaper.prescribedMin / peakByMin.prescribedMin : null;
  if (taperVsPeak !== null && taperVsPeak > 0.6) {
    hard.push(
      "affûtage insuffisant : dernière semaine à " +
        Math.round(taperVsPeak * 100) +
        "% du pic (spec audit 2 : réduction ≥40%)"
    );
  }

  // ---- Audit 2 : pas de VO2max en affûtage ----
  const taperNums = new Set(taperWeeks.map((w) => w.num));
  let vo2InTaper = 0;
  for (const w of plan.weeks) {
    if (!taperNums.has(w.num)) continue;
    for (const d of w.days)
      for (const s of d.sessions) {
        const zoneVO2 = (s.steps || []).some((st) => typeof st.zone === "string" && st.zone.endsWith(".vo2"));
        if (zoneVO2 || /vo2/i.test(s.name)) {
          vo2InTaper++;
          flags.push("S" + w.num + " (taper) : séance VO2 « " + s.name + " »");
        }
      }
  }
  if (vo2InTaper > 0) hard.push(vo2InTaper + " séance(s) VO2max en semaine d'affûtage (interdit, spec audit 2)");

  // ---- Audit 2 : bornes du brick vélo par format ----
  let brickCapViolations = 0;
  const bounds = opts.format ? BRICK_BIKE_BOUNDS[opts.format] : undefined;
  for (const w of plan.weeks)
    for (const d of w.days)
      for (const s of d.sessions) {
        if (!s.brick || !s.steps) continue;
        const bike = s.steps.find((st) => st.leg === "bike");
        if (!bike || bike.durationMin == null || !bounds) continue;
        if (bike.durationMin > bounds[1] || bike.durationMin < bounds[0]) {
          brickCapViolations++;
          flags.push("S" + w.num + " : brick vélo " + bike.durationMin + "min hors bornes [" + bounds[0] + ", " + bounds[1] + "]");
        }
      }
  if (brickCapViolations > 0) hard.push(brickCapViolations + " brick(s) vélo hors bornes format (spec audit 2)");

  // ---- Audit 2 : la semaine max tombe en phase "peak" (et contient le brick en tri) ----
  // Tolérance 5% : notre métrique compte la récup inter-blocs (le générateur non), ce qui
  // gonfle les semaines à VO2 ; et les plans saturés par les caps (nage débutant) ont des
  // semaines quasi égales. Échec seulement si une semaine hors peak DÉPASSE nettement le pic.
  const peakPhaseBest = candidates.filter((w) => w.phaseId === "peak").reduce((a, b) => (b && b.prescribedMin > (a?.prescribedMin ?? 0) ? b : a), null                    );
  const peakInPeakPhase =
    peakByMin.phaseId === "peak" || (!!peakPhaseBest && peakByMin.prescribedMin <= peakPhaseBest.prescribedMin * 1.05);
  if (!peakInPeakPhase)
    hard.push(
      "semaine de volume max (S" + peakByMin.num + ", " + peakByMin.phaseId + ") dépasse la meilleure semaine peak de >5% (spec audit 2)"
    );
  let peakHasBrick                 = null;
  if (opts.sport === "tri") {
    const refWeekNum = peakByMin.phaseId === "peak" ? peakByMin.num : (peakPhaseBest ?? peakByMin).num;
    const wk = plan.weeks.find((w) => w.num === refWeekNum);
    peakHasBrick = !!wk && wk.days.some((d) => d.sessions.some((s) => !!s.brick));
    if (!peakHasBrick) hard.push("tri : la semaine pic (S" + refWeekNum + ") ne contient pas le brick (spec audit 2)");
  }

  // ---- Manifeste : progression jamais incohérente (+10% max entre semaines de charge) ----
  // Deux mesures : la courbe déclarée (tolérance 7min pour l'arrondi 0.1h) et nos minutes
  // indépendantes (tolérance élargie : la part de récup inter-blocs varie avec la
  // composition des séances — le générateur ne la compte pas, nous oui).
  let declJumps = 0;
  let auditJumpsHard = 0;
  let auditJumpsSoft = 0;
  {
    let prevDecl = 0;
    let prevOurs = 0;
    for (const w of weeks) {
      if (w.isRecup || w.phaseId === "taper") continue;
      if (prevDecl > 0 && w.declaredMin > prevDecl * 1.1 + 7) declJumps++;
      if (prevOurs > 0) {
        const j = w.prescribedMin / prevOurs;
        if (j > 1.25) auditJumpsHard++;
        else if (j > 1.15) auditJumpsSoft++;
      }
      prevDecl = w.declaredMin;
      prevOurs = w.prescribedMin;
    }
  }
  if (declJumps > 0) hard.push(declJumps + " saut(s) >+10% de la courbe déclarée entre semaines de charge (manifeste)");
  if (auditJumpsHard > 0) hard.push(auditJumpsHard + " saut(s) >+25% de volume réel entre semaines de charge (manifeste)");

  // ---- Manifeste : jamais deux longues CAP consécutives ----
  let consecutiveLongRuns = 0;
  const dayHasLongRun = (d                                   ) => d.sessions.some((s) => !!s.long && s.d === "rn");
  for (let i = 0; i < allDays.length - 1; i++) {
    if (dayHasLongRun(allDays[i]) && dayHasLongRun(allDays[i + 1])) consecutiveLongRuns++;
  }
  if (consecutiveLongRuns > 0) hard.push(consecutiveLongRuns + " paire(s) de longues CAP consécutives (manifeste)");

  // ---- Manifeste : sortie longue CAP ≤3h pour un débutant ; piscine ≥750m pour un non-débutant ;
  // ---- chaque séance explique son objectif (Pourquoi / Bénéfice) ----
  let beginnerLongRunOver3h = 0;
  let smallSwims = 0;
  let unexplainedSessions = 0;
  for (const w of plan.weeks)
    for (const d of w.days)
      for (const s of d.sessions) {
        if (s.d === "rs") continue;
        const load = sessionLoad(s, refs);
        if (opts.level === "debutant" && s.d === "rn" && s.long && load.minutes > 185) beginnerLongRunOver3h++;
        if (opts.level && opts.level !== "debutant" && s.d === "sw" && (load.meters ?? 0) > 0 && (load.meters ?? 0) < 750) smallSwims++;
        if (!s.note && !(s.det || "").includes("💡")) unexplainedSessions++;
      }
  if (beginnerLongRunOver3h > 0) hard.push(beginnerLongRunOver3h + " sortie(s) longue(s) CAP >3h pour un débutant (manifeste)");
  if (smallSwims > 0) hard.push(smallSwims + " séance(s) piscine <750m pour un non-débutant (manifeste)");
  if (unexplainedSessions > 0) hard.push(unexplainedSessions + " séance(s) sans objectif expliqué (manifeste)");

  // ---- Manifeste : répartition des intensités (~80/20). Part FACILE du temps sur les
  // ---- semaines de charge : <70% = zone grise installée (dur), 70-73% = borderline (souple).
  let easyTot = 0, modTot = 0, hardTot = 0;
  for (const w of plan.weeks) {
    if (w.isRecup || w.phase.id === "taper") continue;
    for (const d of w.days)
      for (const s of d.sessions) {
        const sp = intensitySplit(s, refs);
        easyTot += sp.easyMin; modTot += sp.modMin; hardTot += sp.hardMin;
      }
  }
  const easyShare = easyTot + modTot + hardTot > 0 ? easyTot / (easyTot + modTot + hardTot) : 1;
  if (easyShare < 0.7) hard.push("répartition des intensités : " + Math.round(easyShare * 100) + "% de temps facile (<70% — zone grise, manifeste ~80/20)");

  // ---- Cohérence : une nage FACILE/RÉCUP ne dépasse jamais la « longue » de sa semaine
  // (une « Récup eau » de 2150m n'est pas une récup). Les séances de qualité (jours durs)
  // peuvent légitimement totaliser plus de mètres qu'une longue continue — exemptées.
  let longNotLongest = 0;
  for (const w of plan.weeks) {
    const longSw = w.days.flatMap((d) => d.sessions).find((s) => s.d === "sw" && !!s.long);
    if (!longSw) continue;
    const longM = sessionLoad(longSw, refs).meters ?? 0;
    if (longM <= 0) continue;
    for (const d of w.days) {
      if (d.charge !== "facile") continue;
      for (const s of d.sessions) {
        if (s.d !== "sw" || s === longSw) continue;
        if ((sessionLoad(s, refs).meters ?? 0) > longM * 1.05) {
          longNotLongest++;
          flags.push("S" + w.num + " : « " + s.name + " » (facile) dépasse la longue de la semaine");
        }
      }
    }
  }
  if (longNotLongest > 0) hard.push(longNotLongest + " nage(s) facile(s)/récup plus longue(s) que la « longue » de leur semaine (cohérence)");

  let score = 100;
  if (declJumps + auditJumpsHard > 0) score -= 15;
  score -= Math.min(10, auditJumpsSoft);
  if (consecutiveLongRuns + beginnerLongRunOver3h + smallSwims > 0) score -= 15;
  if (unexplainedSessions > 0) score -= 10;
  if (peak.ratio > THRESHOLDS.overPrescribed) {
    score -= 25;
    soft.push("pic S" + peak.num + " SUR-prescrit : ratio " + peak.ratio.toFixed(2));
  } else if (peak.ratio < THRESHOLDS.underPrescribed) {
    score -= 25;
    soft.push("pic S" + peak.num + " SOUS-prescrit : ratio " + peak.ratio.toFixed(2));
  } else if (peak.ratio > THRESHOLDS.softOver || peak.ratio < THRESHOLDS.softUnder) {
    score -= 10;
    soft.push("pic S" + peak.num + " ratio limite : " + peak.ratio.toFixed(2));
  }

  const outOfBand = normal.length > 0 ? (weeksOver + weeksUnder) / normal.length : 0;
  if (outOfBand > 0) {
    score -= Math.min(25, Math.round(outOfBand * 50));
    soft.push(weeksOver + weeksUnder + "/" + normal.length + " semaines normales hors bande [0.5, 1.4]");
  }

  if (peak.longShare > THRESHOLDS.longShareAlert) {
    score -= 15;
    soft.push("séance longue = " + Math.round(peak.longShare * 100) + "% de la semaine du pic");
  } else if (peak.longShare > THRESHOLDS.longShareWatch) {
    score -= 5;
  }

  score -= Math.min(20, adjacentHardDays * 10);
  score -= Math.min(10, recupHeavier * 5);
  if (easyShare < 0.7) score -= 15;
  else if (easyShare < 0.73) score -= 5;
  if (taperVsPeak !== null && taperVsPeak > 0.6) score -= 20;
  if (vo2InTaper > 0) score -= 15;
  if (brickCapViolations > 0) score -= 15;
  if (!peakInPeakPhase) score -= 10;

  const nominalTotal = weeks.reduce((n, w) => n + w.nominalSessions, 0);
  const totalPrescribed = weeks.reduce((n, w) => n + w.prescribedMin, 0);
  const totalFull = weeks.reduce((n, w) => n + w.fullMinutes, 0);

  return {
    weeks,
    peak,
    score: Math.max(0, score),
    hardViolations: hard,
    softIssues: soft,
    adjacentHardDays,
    recupHeavierCount: recupHeavier,
    weeksOver,
    weeksUnder,
    taperRatio,
    taperVsPeak,
    vo2InTaper,
    brickCapViolations,
    peakInPeakPhase,
    peakHasBrick,
    declJumps,
    auditJumpsHard,
    auditJumpsSoft,
    consecutiveLongRuns,
    beginnerLongRunOver3h,
    smallSwims,
    unexplainedSessions,
    easyShare,
    estimatorGapMed: gaps.length > 0 ? gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : null,
    nominalSessionsTotal: nominalTotal,
    coverage: totalPrescribed > 0 ? totalFull / totalPrescribed : 0,
    flags,
  };
}

// ===== src/generator/sessionLibrary.ts =====
/**
 * Bibliothèque de séances V2 — port sémantique de sess() (Coach_Pro_V1.5).
 * Steps structurés (R3.2), notes systématiques (manifeste : chaque séance s'explique),
 * bornes règle-porteuses sourcées de la matrice (C21/C23/C24), variantes
 * débutant/blessure/intention identiques au produit validé.
 */
                                                                          



function buildSessions(ctx            , slot      , phase        , prog        )              {
  const r = ctx.r;
  const a = r.profile;
  const sp = a.sport, fmt = a.format;
  const S2              = [];
  const lvl = a.level || "inter";
  const finisher = r.finisher;
  const beginner = r.beginner;
  const medHold = r.medHold;
  const dbl = r.dbl;
  const sessionScale = r.sessionScale;
  const _injImpactG = (a.injury || "").split(",").some((x) => ["tibia", "genou", "pied", "hanche", "course"].includes(x));
  const _plioOK = lvl !== "debutant" && !finisher && !_injImpactG;
  const G =
    phase === "base" ? "+ 4-6 strides 15s"
    : phase === "dev" ? "+ gammes (genoux, talons-fesses)"
    : phase === "spec" || phase === "peak" ? (_plioOK ? "+ foulées bondissantes + strides" : "+ gammes + strides (sans sauts)")
    : "";
  const P = (lo        , hi        ) => Math.max(1, Math.round((lo + (hi - lo) * prog) * sessionScale));
  // builders de steps (mêmes sémantiques que V1.5)
  const W = (min        , txt         )         => ({ role: "warmup", durationMin: min, text: txt || "" });
  const Wm = (dist        , txt         )         => ({ role: "warmup", distanceM: dist, text: txt || "" });
  const C = (min        , txt         )         => ({ role: "cooldown", durationMin: min, text: txt || "" });
  const Cm = (dist        , txt         )         => ({ role: "cooldown", distanceM: dist, text: txt || "" });
  const B = (reps        , dur        , zone               , recTxt         , sfx         )         =>
    ({ role: "body", reps, durationMin: dur, zone, intensity: intOf(zone)                     , recoveryText: recTxt || "", suffix: sfx || "", prefix: "" })          ;
  const Bd = (reps        , dist        , zone               , recTxt         , sfx         , unitKm          , disc         )         =>
    ({ role: "body", reps, distanceM: Math.round(dist / 25) * 25, unitKm: !!unitKm, zone, intensity: intOf(zone)                     , recoveryText: recTxt || "", suffix: sfx || "", prefix: "", d: disc })          ;
  // Glossaire des éducatifs nage — accessible aux branches swim ET tri : nommer un
  // éducatif ne suffit pas, il faut dire comment le faire (manifeste : jamais muette).
  const swimDrillGlossary = "rattrapé (le bras devant reste tendu jusqu'au contact des mains avant de repartir : corrige le timing), poings fermés (main fermée : force l'appui par l'avant-bras), battements planche (jambes seules, planche tenue devant : isole et muscle le battement)";

  if (sp === "run") {
    const injImp = (a.injury || "").split(",").some((x) => ["tibia", "genou", "pied", "hanche"].includes(x));
    // R4.1 — trail modulaire (registre de disciplines) : volume en TEMPS + D+, allure en
    // GAP/RPE, compétence descente travaillée à part, prudence excentrique si impact fragile.
    const isTrail = fmt === "trail";
    if (slot === "dur1") {
      // C17 — la VO2 survit au budget (dur1) en dev/spéc/peak ; l'allure course passe en dur2.
      if (phase === "spec" || phase === "peak" || phase === "dev") {
        S2.push({ d: "rn", name: "VO2max", note: "Puissance aérobie maximale : effort max tenable ~3min, récup complète. Maintenue jusqu'à l'affûtage.", det: "", steps: [W(20, "progressif + 4 lignes droites"), B(P(5, 8), 3, "rn.vo2", "2min30 trot"), C(10, "footing très facile")] });
      } else if (finisher || lvl === "debutant") {
        S2.push({ d: "rn", name: "Seuil doux", note: "Le seuil doit rester «confortablement difficile» : tu peux dire quelques mots, pas tenir une conversation. Si ça pique, ralentis.", det: "", steps: [W(15, "footing très facile + 3 lignes droites"), B(P(2, 4), P(6, 10), "rn.thr", "2-3min trot très lent", injImp ? " sur surface souple" : ""), C(10, "footing facile")] });
      } else {
        S2.push({ d: "rn", name: "Seuil progressif", note: "Allure soutenue mais maîtrisée, régulière du 1er au dernier bloc.", det: "", steps: [W(15, "footing + 4 lignes droites"), B(P(3, 4), P(6, 10), "rn.thr", "2min trot"), C(10, "footing")] });
      }
    } else if (slot === "dur2") {
      if (isTrail && (phase === "spec" || phase === "peak") && !injImp)
        // Compétence descente (registre trail) : progression NON-cardio, trackée à part.
        // Les blessures d'impact (périostite…) court-circuitent cette séance — la descente
        // est une charge excentrique, mêmes drapeaux de prudence que la route (spec §2).
        S2.push({ d: "rn", name: "Côtes + descentes techniques", note: "La descente est une compétence : relâche le buste, cadence haute, regarde loin. La montée se court au RPE, pas à l'allure — en trail l'allure brute ne veut rien dire.", det: "", steps: [W(18, "progressif sur sentier"), B(P(4, 6), 3, "rn.vo2", "descente du même segment EN CONTRÔLE (c'est l'exercice, pas la récup)", " en montée au train"), C(10, "footing souple sur plat")] });
      else if (phase === "spec" || phase === "peak")
        S2.push({ d: "rn", name: "Allure course spécifique", note: "C'est l'allure de ta course : mémorise la sensation, elle doit devenir automatique le jour J.", det: "", steps: [W(18, "progressif + gammes"), Bd(P(3, 5), fmt === "5k" || fmt === "10k" ? 1000 : 2000, fmt === "marathon" ? "rn.mara" : "rn.thr", "2-3min récup active", "", !(fmt === "5k" || fmt === "10k"), "rn"), C(10, "retour au calme")] });
      else
        S2.push({ d: "rn", name: phase === "base" ? "Endurance soutenue" : "Allure spécifique", note: isTrail ? "Effort tenu et continu, au ressenti (GAP/FC) — pas à l'allure brute." : "Allure tenue et continue, sans à-coups.", det: "", steps: [W(15, "footing facile"), B(1, P(20, 45), fmt === "marathon" || fmt === "trail" ? "rn.mara" : "rn.thr"), C(8, "retour au calme " + G)] });
    } else if (slot === "durLong") {
      const durCaps = ({ "5k": { lo: 40, hi: 74 }, "10k": { lo: 50, hi: 90 }, semi: { lo: 70, hi: 130 }, marathon: { lo: 90, hi: 180 }, trail: { lo: 120, hi: 255 } }                                              )[fmt] || { lo: 60, hi: 110 };
      // C23 — jamais de sortie longue CAP >3h pour un débutant (le cap passe dans bnd → R3.3 ne regonfle pas)
      if (beginner) durCaps.hi = Math.min(durCaps.hi, C23_BEGINNER_LONG_RUN_CAP_MIN);
      const durMin = P(durCaps.lo, durCaps.hi);
      // Trail (registre R4.1) : volume en TEMPS + D+ cible — jamais en km seul. Le D+ suit
      // la durée (~350-450m/h) ; descentes en contrôle, surtout avec un passif d'impact.
      const dplus = isTrail ? trailElevationTarget(durMin) : null;
      S2.push({ d: "rn", long: true, name: isTrail ? "Sortie longue trail" : "Sortie longue", note: beginner ? "Cours lentement, vraiment : tu dois pouvoir parler tout du long. Marche si besoin, c'est OK." : isTrail ? "En trail on compte le TEMPS et le D+, pas les kilomètres. Monte au train, descends en contrôle" + (injImp ? " — descentes prudentes, ta zone fragile encaisse la charge excentrique" : "") + "." : "Allure d'endurance, jamais forcée. La longue construit l'endurance de base.", det: "", steps: [Object.assign(B(1, durMin, "rn.easy", "", (isTrail && dplus ? " · D+ cible " + dplus.lo + "-" + dplus.hi + "m" : "") + (phase === "spec" || phase === "peak" ? (!finisher && !medHold ? ", derniers 15-20min @ allure cible" : "") : "")), { bnd: { floor: durCaps.lo, cap: durCaps.hi } }), ], ...( { plainBody: true }          ) });
    } else if (slot === "facileR") {
      S2.push({ d: "rn", name: "Footing facile", note: beginner ? "Allure de conversation, sans forcer : c'est le volume facile qui fait progresser." : "Endurance fondamentale : allure de conversation. Ce volume facile construit l'aérobie sans user.", det: "", steps: [B(1, P(30, 50), "rn.easy", "", G && !injImp ? " · termine par " + G.replace("+ ", "") : "")], ...( { plainBody: true }          ) });
    } else if (slot === "facile2") {
      S2.push({ d: "rn", name: "Footing récup", note: "Récupération active : les jambes tournent, zéro intensité — ça accélère la récupération.", det: "", steps: [B(1, P(20, 30), "rn.rec")], ...( { plainBody: true }          ) });
    } else if (slot === "recup") S2.push({ d: "rs", name: "Repos / mobilité", det: "marche, étirements", steps: [] });
    else if (slot === "off") S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  } else if (sp === "bike") {
    const clm = fmt === "clm", climb = a.terrain === "montagne" || a.terrain === "vallonne";
    if (slot === "dur1") {
      if (phase === "base") S2.push({ d: "bk", name: "Sweetspot", note: "Effort soutenu mais maîtrisé, cadence 85-95 rpm. Tu dois pouvoir finir chaque bloc sans t'effondrer.", det: "", steps: [W(15, "montée progressive"), B(P(2, 3), P(12, 20), "bk.ss", "5min souple"), C(10, "décrassage")] });
      else if (phase === "spec" || phase === "peak" || phase === "dev") S2.push({ d: "bk", name: "VO2max", note: "Intensité maximale tenable 4min, récup longue. La puissance aérobie se maintient jusqu'à l'affûtage.", det: "", steps: [W(20, "progressif + 3 sprints courts"), B(P(4, 6), 4, "bk.vo2", "4min"), C(10, "souple")] });
      else if (lvl === "debutant" || finisher) S2.push({ d: "bk", name: "Tempo progressif", note: "Effort confortablement soutenu, sans jamais te mettre dans le rouge.", det: "", steps: [W(15, "souple"), B(P(2, 3), P(8, 15), "bk.ss", "4min très souple"), C(10, "décrassage")] });
      else S2.push({ d: "bk", name: "Sweetspot", note: "Effort soutenu mais maîtrisé, cadence 85-95 rpm.", det: "", steps: [W(15, "montée progressive"), B(P(2, 3), P(12, 20), "bk.ss", "5min souple"), C(10, "décrassage")] });
    } else if (slot === "dur2") {
      if (clm && (phase === "spec" || phase === "peak")) S2.push({ d: "bk", name: "Spécifique CLM (position)", note: "Travaille la tenue de position autant que la puissance : c'est elle qui te fera gagner du temps.", det: "", steps: [W(20, "progressif en position normale"), B(P(2, 3), P(15, 25), "bk.thr", "5min souple, redresse-toi", " en position aéro tenue"), C(10, "décrassage")] });
      else if (phase === "spec" || phase === "peak") S2.push({ d: "bk", name: "Seuil / race-pace", note: "Allure de course soutenable ~1h. Régularité avant tout.", det: "", steps: [W(15, "progressif"), B(P(2, 4), P(10, 20), "bk.thr", "5min souple"), C(10, "décrassage")] });
      else S2.push({ d: "bk", name: climb ? "Force en côte" : "Force basse cadence", note: "Gros braquet, cadence basse, mais sans forcer sur les genoux : c'est musculaire, pas cardio.", det: "", steps: [W(15, "+ montée en intensité"), B(P(4, 6), 5, "bk.frc", "3min souple ou en redescendant", " à 50-60 rpm" + (climb ? " en côte" : "")), C(10, "moulinage léger")] });
    } else if (slot === "durLong") {
      const durCaps = ({ crit: { lo: 60, hi: 150 }, route: { lo: 90, hi: 180 }, clm: { lo: 75, hi: 165 }, cyclo: { lo: 120, hi: 240 }, gravel: { lo: 150, hi: 360 } }                                              )[fmt] || { lo: 90, hi: 210 };
      S2.push({ d: "bk", long: true, name: "Sortie longue", note: "Endurance longue : le moteur aérobie se construit sur la durée. Allure régulière, mange et bois régulièrement.", det: "", steps: [Object.assign(B(1, P(durCaps.lo, durCaps.hi), "bk.z2", "", fmt === "cyclo" || fmt === "gravel" ? " · endurance" : ""), { bnd: { floor: durCaps.lo, cap: durCaps.hi } })], ...( { plainBody: true }          ) });
    } else if (slot === "facileR") S2.push({ d: "bk", name: "Endurance facile", note: "Z2 conversationnel, cadence souple 85-95 rpm : la base aérobie se construit ici.", det: "", steps: [B(1, P(45, 90), "bk.z2")], ...( { plainBody: true }          ) });
    else if (slot === "facile2") S2.push({ d: "bk", name: "Récup active", note: "Moulinage très souple : activer la circulation, aucune force sur les pédales.", det: "", steps: [B(1, P(30, 45), null, "", " très souple")], ...( { plainBody: true }          ) });
    else if (slot === "recup") S2.push({ d: "rs", name: "Repos / gainage", det: "mobilité", steps: [] });
    else if (slot === "off") S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  } else if (sp === "swim") {
    const shoulder = (a.injury || "").includes("epaule"), ow = a.milieu === "ow" || a.milieu === "mixte";
    // Limite principale déclarée par le débutant (question dédiée) : chaque réponse
    // oriente RÉELLEMENT les éducatifs vers ce qui bloque, pas un générique commun.
    // Chaque éducatif nommé porte son COMMENT FAIRE (pas juste son nom) — la séance
    // s'explique elle-même, jusque dans le détail technique (manifeste : jamais muette).
    const swimLimitFocus                                                = {
      respiration: { txt: " éducatifs respiration — 3 temps bilatérale (souffle continu par le nez sous l'eau, tête qui pivote sans se lever, inspire large sur le côté à la dernière seconde)", note: "La respiration débloque tout le reste : on la travaille isolée, sans la charge de la nage complète." },
      technique: { txt: " éducatifs bras — rattrapé (le bras devant reste tendu, immobile, jusqu'à ce que l'autre main vienne le toucher avant de repartir : corrige le timing et la rotation), poings fermés (main fermée pendant toute la traction : sentir l'appui par l'avant-bras plutôt que la paume), un bras (l'autre reste le long du corps, immobile : isole le mouvement de traction)", note: "Sentir l'appui avant d'ajouter de la distance : la technique s'automatise par la fréquence, pas par la force." },
      endurance: { txt: " nage continue fractionnée courte, sans s'arrêter entre les longueurs", note: "Tenir la distance sans pause compte plus que la vitesse : la continuité prime, on fractionne le repos, pas la nage." },
      peur: { txt: " nage en petites longueurs, pied au mur possible à tout moment, jamais de chrono", note: "Le seul objectif est de se sentir bien dans l'eau — l'aisance se construit par l'exposition progressive, sans pression de performance." },
    };
    const limFocus = swimLimitFocus[a.swim_limit || ""] || { txt: " éducatifs variés — " + swimDrillGlossary, note: "La technique se construit à froid, sans fatigue. Qualité > quantité." };
    if (slot === "dur1") {
      if (beginner && (phase === "spec" || phase === "peak")) S2.push({ d: "sw", name: "Seuil technique CSS", note: "Quelques 100m à allure seuil contrôlée, technique maintenue : préparer la course sans casser le geste.", det: "", steps: [Wm(200, "souple + éducatifs"), Bd(P(4, 7), 100, "sw.css", "20-30s", "", false, "sw"), Cm(100, "relâché")] });
      else if (beginner) S2.push({ d: "sw", name: "Technique + éducatifs", note: limFocus.note, det: "", steps: [Wm(200, "souple"), Bd(P(6, 10), 50, "sw.easy", "repos libre entre séries", limFocus.txt + ", " + P(1, 2) + " point(s) technique", false, "sw"), Cm(100, "relâché")] });
      else if (shoulder) S2.push({ d: "sw", name: "Seuil contrôlé (épaule)", note: "Volume modéré, technique soignée : on épargne l'épaule, on ne cherche pas la performance brute.", det: "", steps: [Wm(300, "souple + 4×50m éducatifs"), Bd(P(6, 8), 100, "sw.css", "20-30s", "", false, "sw"), Cm(200, "souple")] });
      else S2.push({ d: "sw", name: "Seuil CSS", note: "Allure régulière sur tous les 100m. Le dernier doit ressembler au premier.", det: "", steps: [Wm(400, "progressif + 4×50m éducatifs"), Bd(P(6, 10), 100, "sw.css", "15-20s", "", false, "sw"), Cm(200, "souple")] });
    } else if (slot === "dur2") {
      if (beginner && (phase === "spec" || phase === "peak")) S2.push({ d: "sw", name: "Endurance + touches de vitesse", note: "Nage continue technique, plus quelques accélérations courtes de 25m : de la vitesse de forme, pas de la souffrance.", det: "", steps: [Wm(200, "souple"), Bd(1, 400, "sw.aero", "20-30s", " nage continue fractionnée", false, "sw"), Bd(P(6, 10), 25, "sw.speed", "30s repos", " en accélérations progressives, technique maintenue", false, "sw"), Cm(100, "très souple")] });
      else if (beginner) S2.push({ d: "sw", name: "Endurance technique", note: "Priorité au geste, pas au chrono. Un seul point technique à la fois.", det: "", steps: [Wm(200, "souple"), Bd(1, 600, "sw.easy", "20-30s, le temps de respirer", " nage continue fractionnée (ex 8-12×50m) + 1 éducatif entre chaque", false, "sw"), Cm(100, "très souple")] });
      else if (shoulder && (phase === "spec" || phase === "peak")) S2.push({ d: "sw", name: "Jambes vitesse (épaule épargnée)", note: "Vitesse par les jambes : battements rapides avec planche, l'épaule ne travaille pas. La puissance se maintient sans risque.", det: "", steps: [Wm(200, "souple"), Bd(P(6, 10), 25, "sw.speed", "30s repos", " battements rapides avec planche (jambes seules)", false, "sw"), Bd(1, 200, "sw.easy", "", " éducatifs technique", false, "sw"), Cm(100, "souple")] });
      else if (shoulder) S2.push({ d: "sw", name: "Jambes + technique", note: "Épaule épargnée : le travail passe par les jambes et la technique, la charge articulaire reste nulle.", det: "", steps: [Bd(1, 400, null, "", " séries battements + éducatifs · épargne épaule", false, "sw")], ...( { plainBody: true }          ) });
      else S2.push({ d: "sw", name: "Vitesse", note: "Vitesse contrôlée et technique : la fréquence ne doit pas casser ta nage.", det: "", steps: [Wm(400, "varié + 4×25m accélérations"), Bd(P(8, 12), 50, "sw.speed", "30-40s", "", false, "sw"), Cm(200, "souple")] });
    } else if (slot === "durLong") {
      const distCaps = beginner
        ? { lo: 300, hi: Math.min(850, C15_BEGINNER_SWIM_SESSION_CAP_M) }
        : ({ sprint: { lo: 600, hi: 1400 }, demifond: { lo: 1000, hi: 2000 }, fond: { lo: 1500, hi: 3000 }, ow: { lo: 1500, hi: 4500 } }                                              )[fmt] || { lo: 1000, hi: 2000 };
      S2.push({ d: "sw", long: !beginner, name: ow ? "Volume + sighting" : beginner ? "Volume aérobie" : "Longue continue", note: ow ? "Endurance continue + navigation : allure régulière et repères visuels — les conditions réelles de la course." : "Endurance continue : allure régulière, geste stable — c'est la séance qui construit la caisse.", det: "", steps: [Object.assign(Bd(1, P(distCaps.lo, distCaps.hi), "sw.aero", "", (ow ? " · navigation aux repères" : "") + (beginner ? " · fractionne en blocs de 100-200m si besoin, la continuité prime sur l'allure" : ""), false, "sw"), { bnd: { floor: distCaps.lo, cap: distCaps.hi } })], ...( { plainBody: true }          ) });
    } else if (slot === "facileR") {
      // C24 — pas de « sortie piscine de 600m » pour un non-débutant
      const techDistCaps = beginner ? { lo: 200, hi: 600 } : { lo: 750, hi: 1200 };
      if (ow && a.swim_limit === "peur") S2.push({ d: "sw", name: "Aisance eau libre", det: "familiarisation, respiration, flottaison — 💡 Objectif confiance : l'aisance dans l'eau libre se construit sans chrono, par l'exposition progressive.", steps: [] });
      else if (!ow && beginner && a.swim_limit === "peur") S2.push({ d: "sw", name: "Aisance bassin", det: "petites longueurs, pied au mur à tout moment, zéro chrono — 💡 Objectif confiance : l'aisance dans l'eau se construit par l'exposition progressive, jamais par la contrainte.", steps: [] });
      else S2.push({ d: "sw", name: "Technique souple", note: beginner ? limFocus.note : "Éducatifs à froid : le geste se grave sans fatigue. Qualité avant quantité.", det: "", steps: [Object.assign(Bd(1, P(techDistCaps.lo, techDistCaps.hi), "sw.easy", "", beginner ? limFocus.txt : " éducatifs", false, "sw"), beginner ? {} : { bnd: { floor: techDistCaps.lo, cap: techDistCaps.hi } })], ...( { plainBody: true }          ) });
    } else if (slot === "facile2") {
      const recDistCaps = beginner ? { lo: 100, hi: 400 } : { lo: 750, hi: 1100 }; // C24
      S2.push({ d: "sw", name: "Récup eau", note: "Nage de récupération : relâchement total, respiration ample.", det: "", steps: [Object.assign(Bd(1, P(recDistCaps.lo, recDistCaps.hi), "sw.easy", "", " souple", false, "sw"), beginner ? {} : { bnd: { floor: recDistCaps.lo, cap: recDistCaps.hi } })], ...( { plainBody: true }          ) });
    } else if (slot === "recup") S2.push({ d: "rs", name: "Repos / épaules", det: "étirements coiffe", steps: [] });
    else if (slot === "off") S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  } else if (sp === "tri") {
    const runInj = (a.injury || "").includes("course");
    const PB = ({ base: [0.35, 0.55], dev: [0.55, 0.75], spec: [0.75, 0.9], peak: [0.9, 1], taper: [0.35, 0.45] }                                    )[phase] || [0.5, 0.8];
    const PT = (lo        , hi        ) => Math.max(1, Math.round((lo + (hi - lo) * (PB[0] + (PB[1] - PB[0]) * prog)) * sessionScale));
    const swimDistCaps = ({ S: { lo: 300, hi: 750 }, M: { lo: 600, hi: 1500 }, "70.3": { lo: 950, hi: 1900 }, Full: { lo: 1600, hi: 3000 } }                                              )[fmt] || { lo: 600, hi: 1500 };
    const swimDist = PT(swimDistCaps.lo, swimDistCaps.hi);
    const triSwimVolCap = ({ S: 1050, M: 2100, "70.3": 3000, Full: 4500 }                          )[fmt] || 2100;
    // C24 — même la nage récup tri : ≥750m pour un non-débutant
    const swShortDist = beginner ? Math.min(600, Math.max(200, Math.round((swimDist * 0.4) / 50) * 50)) : Math.min(1100, Math.max(750, Math.round((swimDist * 0.6) / 50) * 50));
    const swTechDist = Math.max(beginner ? 300 : 750, Math.round((swimDist * 0.5) / 50) * 50);
    const swMain = beginner
      ? { name: "Nage seuil technique (+dist)", note: "Technique d'abord, mais quelques 100m à allure seuil contrôlée pour préparer la course.", steps: [Wm(200, "souple"), Object.assign(Bd(1, swimDist, "sw.css", "repos libre entre séries", ", fractionné en séries régulières, éducatifs entre", false, "sw"), { bnd: { floor: swimDistCaps.lo, cap: triSwimVolCap } }), Cm(100, "relâché")] }
      : { name: "Nage seuil (+dist)", note: "Distance cible atteinte, allure régulière. Fractionné = réponse à intensité.", steps: [Wm(300, "+ 4×50m éducatifs"), Object.assign(Bd(1, swimDist, "sw.css", "15-20s", ", fractionné en séries régulières si besoin", false, "sw"), { bnd: { floor: swimDistCaps.lo, cap: triSwimVolCap } }), Cm(200, "souple")] };
    const swTech = beginner
      ? { name: "Nage éducatifs", note: "Zéro chrono ici : uniquement le geste. Alterne les éducatifs, ne les enchaîne pas en force.", steps: [Wm(100, "souple"), Bd(1, swTechDist, "sw.easy", "20-30s", ", par 50m, 1 point technique à la fois — " + swimDrillGlossary, false, "sw"), Cm(100, "dos souple")] }
      : { name: "Nage vitesse", note: "Fréquence et vitesse contrôlées : la technique ne doit pas se dégrader sur les derniers 50m.", steps: [Wm(200, "+ 4×25m accélérations progressives"), Bd(1, swTechDist, "sw.aero", "30-40s sur les 50m rapides", ", dont la moitié en accélérations de 50m", false, "sw"), Cm(150, "souple")] };
    const swShort = { name: "Nage récup", note: "Récupération dans l'eau : relâchement total, respiration ample — le corps absorbe le travail de la semaine.", steps: [Bd(1, swShortDist, "sw.easy", "", " souple, en blocs de 50m, respiration 3 temps · relâchement total", false, "sw")] };
    if (slot === "dur1") {
      if (dbl) S2.push({ d: "sw", name: swMain.name + " (matin)", note: swMain.note, det: "", steps: swMain.steps });
      if (phase === "base") S2.push({ d: "bk", name: "Sweetspot vélo", note: "Cadence 85-95 rpm, soutenu mais maîtrisé.", det: "", steps: [W(15, "montée progressive"), Object.assign(B(PT(2, 3), PT(12, 18), "bk.ss", "5min souple"), { repCap: 4 }), C(10, "décrassage")] });
      else if (phase === "spec" || phase === "peak") S2.push({ d: "bk", name: "VO2max vélo", note: "Puissance aérobie maximale, maintenue jusqu'au pic — pas abandonnée en spécifique (la race-pace vélo est travaillée dans le brick).", det: "", steps: [W(20, "progressif + 3 sprints"), Object.assign(B(PT(4, 6), 4, "bk.vo2", "4min récup"), { repCap: 8 }), C(10, "souple")] });
      else if (phase === "taper") S2.push({ d: "bk", name: "Rappel race-pace", note: "Affûtage : on réveille l'allure course sans générer de fatigue. Court et précis.", det: "", steps: [W(10, "progressif"), Object.assign(B(PT(2, 3), PT(6, 10), "bk.rp", "3min souple"), { repCap: 4 }), C(5, "décrassage")] });
      else if (lvl === "debutant" || finisher) S2.push({ d: "bk", name: "Tempo vélo", note: "Confortablement soutenu, jamais dans le rouge.", det: "", steps: [W(15, "souple"), Object.assign(B(PT(2, 3), PT(8, 15), "bk.ss", "4min souple"), { repCap: 4 }), C(10, "décrassage")] });
      else S2.push({ d: "bk", name: "VO2max vélo", note: "Intensité max tenable 4min, récup quasi complète entre.", det: "", steps: [W(20, "progressif + 3 sprints"), Object.assign(B(PT(4, 6), 4, "bk.vo2", "4min récup"), { repCap: 8 }), C(10, "souple")] });
    } else if (slot === "dur2") {
      if (dbl) S2.push({ d: "sw", name: swTech.name, note: swTech.note, det: "", steps: swTech.steps });
      if (phase === "spec" || phase === "peak") S2.push({ d: "rn", name: "Allure course (tri)", note: "L'allure de course du jour J : mémorise la sensation, jambes déjà entamées par le vélo.", det: "", steps: [W(15, "footing progressif"), Object.assign(B(1, PT(20, 40), "rn.mara"), { bnd: { floor: 20, cap: 45 } }), C(8, "retour au calme")] });
      else S2.push({ d: "bk", name: "Force basse cadence", note: "Gros braquet, cadence basse : musculaire, pas cardio. Sans forcer sur les genoux.", det: "", steps: [W(15, "+ montée en intensité"), Object.assign(B(PT(4, 6), ({ S: 5, M: 5, "70.3": 6, Full: 7 }                          )[fmt] || 5, "bk.frc", "3min souple", " à 50-60 rpm"), { repCap: 8 }), C(10, "moulinage")] });
    } else if (slot === "durLong") {
      if (phase === "spec" || phase === "peak") {
        // C21 — brick borné par format, ×0.8 en reprise (appliqué aussi dans blockBounds)
        const rf = a.history === "reprise" ? C21_REPRISE_BRICK_FACTOR : 1;
        const bb = ({ S: { lo: 45, hi: 90 }, M: { lo: 60, hi: 120 }, "70.3": { lo: 90, hi: 180 }, Full: { lo: 150, hi: 300 } }                                              )[fmt] || { lo: 60, hi: 180 };
        const br = ({ S: { lo: 10, hi: 20 }, M: { lo: 12, hi: 24 }, "70.3": { lo: 16, hi: 32 }, Full: { lo: 35, hi: 70 } }                                              )[fmt] || { lo: 15, hi: 30 };
        // Répartition des intensités (manifeste) : le brick roule en Z2, le DERNIER TIERS
        // passe à l'allure course — la spécificité (transition, jambes entamées) est gardée
        // sans transformer 2 à 5h hebdo en zone grise (tri mesuré à 54-67% de temps facile).
        S2.push({ d: "br", long: true, brick: true, name: "Brick vélo+CAP", note: "Le brick simule la course : vélo en endurance, dernier tiers @ allure course, puis enchaînement rapide vélo→course pour habituer tes jambes à la sensation «de coton» du début de CAP.", det: "", steps: [
          { role: "body", leg: "bike", durationMin: PT(bb.lo, Math.round(bb.hi * rf)), zone: "bk.z2", intensity: intOf("bk.z2")                      }          ,
          { role: "body", leg: "run", durationMin: PT(br.lo, Math.round(br.hi * rf)), d: "rn" }          ,
        ], ...( { runInj }          ) });
      } else {
        const longRunCaps = ({ S: { lo: 30, hi: 60 }, M: { lo: 40, hi: 75 }, "70.3": { lo: 50, hi: 100 }, Full: { lo: 60, hi: 140 } }                                              )[fmt] || { lo: 50, hi: 100 };
        S2.push({ d: "rn", long: true, name: "Sortie longue CAP", note: "Endurance fondamentale, allure facile et conversationnelle.", det: "", steps: [Object.assign(B(1, PT(longRunCaps.lo, longRunCaps.hi), "rn.easy", "", runInj ? " sur surface souple" : ""), { bnd: { floor: longRunCaps.lo, cap: longRunCaps.hi } })], ...( { plainBody: true }          ) });
      }
    } else if (slot === "facileR") {
      const ftCaps = ({ S: { lo: 25, hi: 45 }, M: { lo: 15, hi: 26 }, "70.3": { lo: 14, hi: 22 }, Full: { lo: 50, hi: 100 } }                                              )[fmt] || { lo: 25, hi: 45 };
      // C18 — le créneau course de qualité garanti en tri : VO2 court en peak
      if (phase === "peak" && !runInj && !medHold && lvl !== "debutant" && !finisher) S2.push({ d: "rn", name: "VO2max course", note: "Rappels de puissance aérobie course, courts et vifs, jambes déjà entamées par le vélo.", det: "", steps: [W(12, "footing progressif + gammes"), Object.assign(B(PT(4, 6), 2, "rn.vo2", "2min trot"), { repCap: 6 }), C(8, "footing très facile")] });
      else if (phase === "peak" && runInj && !medHold) S2.push({ d: "rn", name: "Allure course (tri, surface souple)", note: "Course blessé : allure cible en contrôle, sur surface souple, jamais dans la douleur.", det: "", steps: [W(12, "footing progressif"), B(1, PT(18, 28), "rn.mara", "", ", sur surface souple"), C(8, "footing très facile")] });
      else S2.push({ d: "rn", name: "Footing facile", note: "Course facile : les jambes apprennent à courir « propre » sans fatigue ajoutée.", det: "", steps: [B(1, PT(ftCaps.lo, ftCaps.hi), "rn.easy", "", runInj ? " · surface souple" : "")], ...( { plainBody: true }          ) });
    } else if (slot === "facile2") S2.push({ d: "sw", name: swShort.name + " courte", note: swShort.note, det: "", steps: swShort.steps, ...( { plainBody: true }          ) });
    else if (slot === "recup") S2.push({ d: "rs", name: "Récup active", det: "mobilité", steps: [] });
    else if (slot === "off") S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  }
  return S2;
}

// ===== src/generator/weekBuilder.ts =====
/**
 * Construction des semaines V2 — port sémantique des passes de Coach_Pro_V1.5 :
 * schéma jours (7j/10j), redistribution des durs bloqués (sans adjacence), fix peak
 * « reprise », neutralisation médicale, plafond d'impact course, budget de séances,
 * greffes renfo, anti-collage final, garantie de polarisation.
 */
                                                                         


const J = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

                   
                 
               
 

function schema(use10         , phase        , isRecup         )            {
  if (isRecup) {
    const d                     = [["facile", "facileR"], ["facile", "facile2"], ["off", "off"], ["facile", "facileR"], ["facile", "facile2"], ["facile", "facileR"], ["off", "off"], ["facile", "facile2"], ["facile", "facileR"], ["recup", "recup"]];
    return (use10 ? d : d.slice(0, 7)).map((x) => ({ charge: x[0], slot: x[1] }));
  }
  if (use10)
    return ([["dur", "dur1"], ["facile", "facileR"], ["dur", "dur2"], ["facile", "facile2"], ["dur", "facileR"], ["facile", "facileR"], ["dur", "dur2"], ["facile", "facile2"], ["dur", "durLong"], ["recup", "recup"]]                      ).map((x) => ({ charge: x[0], slot: x[1] }));
  return ([["recup", "recup"], ["dur", "dur1"], ["facile", "facileR"], ["dur", "dur2"], ["facile", "facile2"], ["dur", "durLong"], ["facile", "facileR"]]                      ).map((x) => ({ charge: x[0], slot: x[1] }));
}

                                       
               
              
                    
                    
                
                                                       
 

/** Jours + charges + séances rendues — tout ce qui précède la boucle de volume R3.3. */
function buildDays(r              , refs      , hz         )           {
  const a = r.profile;
  const sp = a.sport;
  const ctx             = { r };
  const cycleLen = r.use10 ? 10 : 7;
  const totalDays = r.weeks * 7;
  const days           = [];
  let cyc = 0, dic = cycleLen, sinceR = 0, sch            = [], isR = false;

  for (let i = 0; i < totalDays; i++) {
    const w = Math.floor(i / 7);
    const ph = r.phases.find((p) => w >= p.start && w < p.end) || r.phases[4];
    if (dic >= cycleLen) {
      cyc++; dic = 0;
      isR = ph.id !== "taper" && sinceR >= r.recupEvery - 1;
      if (isR) sinceR = 0; else sinceR++;
      sch = schema(r.use10, ph.id, isR);
    }
    const s = sch[dic] || { charge: "facile", slot: "facileR" };
    const jn = J[i % 7];
    let ch = s.charge, sl = s.slot, forced = false;
    if (r.offDays.includes(jn)) { ch = "off"; sl = "off"; forced = true; }
    days.push({ week: w + 1, jour: jn, cyc, jc: dic + 1, charge: ch                    , slot: sl, forced, wasHard: ch === "dur" && forced, isR, phaseId: ph.id, phase: ph, prog: 0, sessions: [] });
    dic++;
  }

  // Redistribution des durs bloqués — jamais d'adjacence créée (sécurité > volume)
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    for (const _ of wd.filter((d) => d.wasHard)) {
      const t = wd.find((d, i) => {
        if (d.charge !== "facile" || d.swapped) return false;
        const prev = wd[i - 1], next = wd[i + 1];
        return (!prev || prev.charge !== "dur") && (!next || next.charge !== "dur");
      });
      if (t) { t.charge = "dur"; t.slot = "dur2"; t.swapped = true; }
    }
  }

  // Fix ciblé « reprise » : garantir une semaine peak de charge portant la signature (durLong)
  if ((a.history || "confirme") === "reprise") {
    const peakWeekNums = [...new Set(days.filter((d) => d.phaseId === "peak").map((d) => d.week))];
    if (peakWeekNums.length) {
      const isChargeSig = (wn        ) => {
        const wd = days.filter((d) => d.week === wn);
        return wd.filter((d) => d.isR).length < 4 && wd.some((d) => d.slot === "durLong" && !d.forced);
      };
      if (!peakWeekNums.some(isChargeSig)) {
        const targetWk = Math.max(...peakWeekNums);
        const wd = days.filter((d) => d.week === targetWk);
        const tpl                     = [["dur", "dur1"], ["facile", "facileR"], ["dur", "dur2"], ["facile", "facile2"], ["dur", "durLong"], ["facile", "facileR"], ["off", "off"]];
        wd.forEach((d, idx) => {
          d.isR = false; d.wasHard = false; d.swapped = false;
          if (d.forced) { d.charge = "off"; d.slot = "off"; return; }
          const t = tpl[idx] || ["facile", "facileR"];
          d.charge = t[0]                    ; d.slot = t[1];
        });
      }
    }
  }

  // medHold : retirer l'intensité (dur1/dur2 ; tri : aussi le brick) avant génération
  if (r.medHold)
    for (const d of days) {
      const stripLong = sp === "tri";
      if (d.charge === "dur" && (d.slot === "dur1" || d.slot === "dur2" || (stripLong && d.slot === "durLong"))) {
        d.charge = "facile";
        d.slot = sp === "run" ? "facile2" : "facileR";
      }
    }

  // Séances + rendu. Dates absolues ALIGNÉES sur le calendrier réel : le jour étiqueté
  // « Lun » tombe un VRAI lundi (le plan est régénéré à chaque ouverture — sans cet
  // ancrage, la case « aujourd'hui » porte la séance d'un autre jour dès le lendemain).
  // Sans course : la semaine 1 est la semaine EN COURS (début = lundi de cette semaine,
  // les jours déjà écoulés restent visibles/cochables). Avec course : la DERNIÈRE semaine
  // est celle de la course — la course tombe à sa vraie date, à son vrai jour.
  const MS = 864e5;
  const mondayOf = (t        )         => t - ((new Date(t).getUTCDay() + 6) % 7) * MS;
  // BUG CORRIGÉ (ancrage glissant) : sans date de course, ancrer sur « maintenant » faisait
  // RE-GLISSER la semaine 1 à chaque régénération (le plan est recalculé à chaque ouverture) —
  // l'athlète restait éternellement en semaine 1, progression/historique/série vidés au fil
  // des semaines. L'ancre est désormais plan_start (posée par l'UI à la PREMIÈRE génération,
  // persistée dans les réponses) : le plan avance dans le temps comme un vrai plan.
  const anchorT = a.plan_start ? new Date(a.plan_start + "T00:00:00Z").getTime() : Date.now();
  const start = a.race_date
    ? mondayOf(new Date(a.race_date + "T00:00:00Z").getTime()) - (r.weeks - 1) * 7 * MS
    : mondayOf(isFinite(anchorT) ? anchorT : Date.now());
  const iso = (t        ) => new Date(t).toISOString().slice(0, 10);
  days.forEach((d, i) => {
    const ph = d.phase ;
    const prog = ph.weeks > 1 ? (d.week - 1 - ph.start) / (ph.weeks - 1) : 0.5;
    d.prog = Math.max(0, Math.min(1, prog));
    d.date = iso(start + i * MS);
    d.sessions = buildSessions(ctx, d.slot                                       , d.phaseId, d.prog);
    for (const s of d.sessions) {
      if (s.steps && s.steps.length) renderSess(s, refs, hz, r.baseRefs);
      else if (s.min == null) s.min = 0;
    }
  });

  // C18b — un seul « VO2max course » par semaine de peak : le second créneau facileR
  // redevient footing (sinon 4 jours durs et une semaine de peak plus légère que la spec).
  if (a.sport === "tri") {
    for (let w = 1; w <= r.weeks; w++) {
      const vo2Days = days.filter((d) => d.week === w && d.sessions.some((x) => x.name === "VO2max course"));
      for (let i = 1; i < vo2Days.length; i++) {
        const d = vo2Days[i];
        d.sessions = buildSessions(ctx, "facileR", "spec", d.prog || 0);
        for (const x of d.sessions) if (x.steps && x.steps.length) renderSess(x, refs, hz, r.baseRefs);
      }
    }
  }

  applyRunImpactCap(r, days, refs, hz);
  applySessionBudget(r, days);
  applyStrengthGrafts(r, days);
  applyAntiCollage(r, days, refs, hz, ctx);
  applyPolarizationGuard(r, days, ctx, refs, hz);
  return days;
}

/** Plafond de jours d'impact course : l'excédent devient cross-training vélo ou repos. */
function applyRunImpactCap(r              , days          , refs      , hz         )       {
  const a = r.profile;
  if (a.sport !== "run" || r.maxRunDays == null) return;
  const injImpact = r.injuries.some((x) => ["tibia", "genou", "pied", "hanche"].includes(x));
  const canCross = a.dispo === "quotidienne" || a.dispo === "semaine";
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    const isRecupWk = wd.filter((d) => d.isR).length >= 4;
    const cap = isRecupWk ? Math.max(2, r.maxRunDays - 1) : r.maxRunDays;
    const runDays = wd.filter((d) => d.sessions.some((s) => s.d === "rn"));
    let over = runDays.length - cap;
    if (over <= 0) continue;
    const ordered = [...runDays.filter((d) => d.charge === "facile" && !d.forced), ...runDays.filter((d) => d.charge === "dur" && !d.forced)];
    for (let i = 0; i < ordered.length && over > 0; i++) {
      const d = ordered[i];
      if (canCross && (injImpact || d.charge === "dur")) {
        const s            = d.charge === "dur"
          ? { d: "bk", name: "Cross-training vélo (intensité)", note: "Intervalles vélo — équivalent VO2 sans impact, maintient la puissance aérobie pendant que le tissu se répare.", det: "", steps: [{ role: "warmup", durationMin: 15, text: "progressif" }, { role: "body", reps: 5, durationMin: 3, zone: "bk.vo2", intensity: intOf("bk.vo2")                     , recoveryText: "3min souple" }, { role: "cooldown", durationMin: 10, text: "souple" }] }
          : { d: "bk", name: "Cross-training vélo", note: "Zéro impact : le stimulus aérobie est conservé pendant que les tissus de la course récupèrent.", det: "", steps: [{ role: "body", durationMin: 55, zone: "bk.z2", intensity: intOf("bk.z2")                      }], ...({ plainBody: true }          ) };
        renderSess(s, refs, hz, r.baseRefs);
        d.sessions = [s];
      } else {
        d.charge = "off"; d.slot = "off";
        d.sessions = [{ d: "rs", name: "OFF (récup impact)", det: "repos — la course use, le tissu se reconstruit au repos", steps: [] }];
      }
      over--;
    }
  }
}

/** Budget de séances : jamais plus de jours actifs que le budget (récup comprises). */
function applySessionBudget(r              , days          )       {
  const toOff = (d        ) => {
    d.charge = "off"; d.slot = "off";
    d.sessions = [{ d: "rs", name: "OFF (budget séances)", det: "repos — respect de ta disponibilité déclarée", steps: [] }];
  };
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    const activeNow = () => wd.filter((d) => d.charge !== "off" && d.charge !== "recup");
    let over = activeNow().length - r.budgetPerWeek;
    if (over <= 0) continue;
    const fac = activeNow().filter((d) => d.charge === "facile" && !d.forced);
    for (let i = fac.length - 1; i >= 0 && over > 0; i--) { toOff(fac[i]); over--; }
    if (over > 0) {
      const durs = activeNow().filter((d) => d.charge === "dur" && !d.forced && d.slot !== "durLong");
      for (let i = durs.length - 1; i >= 0 && over > 0; i--) { toOff(durs[i]); over--; }
    }
    if (over > 0) {
      const any = activeNow().filter((d) => !d.forced);
      for (let i = any.length - 1; i >= 0 && over > 0; i--) { toOff(any[i]); over--; }
    }
  }
}

/** Renfo/gammes greffés en fin de séance existante — jamais une journée en plus. */
function applyStrengthGrafts(r              , days          )       {
  const a = r.profile;
  const sp = a.sport;
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    if (wd[0]?.isR) continue;
    const ph = wd[0]?.phaseId;
    if (ph === "taper") continue;
    const faciles = wd.filter((d) => d.charge === "facile" && !d.forced);
    const graft = (day                    , obj           ) => {
      if (day && day.sessions.some((s) => s.d !== "rs")) day.sessions.push(obj);
    };
    if (sp === "run") {
      graft(faciles[0], { d: "rs", name: r.injuries.includes("tibia") ? "+ Renfo tibial" : "+ Renfo + gainage", det: "20min en fin de footing", steps: [] });
      const injImpactP = r.injuries.some((x) => ["tibia", "genou", "pied", "hanche", "course"].includes(x));
      const beginnerR = r.beginner || r.finisher;
      let plioDet        ;
      if (injImpactP) plioDet = "renfo excentrique (pas de sauts — protection)";
      else if (beginnerR) plioDet = "corde à sauter, rebonds souples (initiation douce)";
      else plioDet = ph === "base" ? "corde à sauter, rebonds souples" : ph === "dev" ? "squat jumps, box jumps bas" : "pliométrie réactive";
      graft(faciles[2] || faciles[1], { d: "rs", name: "+ Plio", det: plioDet, steps: [] });
    } else if (sp === "bike") {
      graft(faciles[0], { d: "rs", name: "+ Gainage position", det: "20min en fin de séance", steps: [] });
      if (ph === "spec") graft(faciles[1], { d: "rs", name: "+ Force max", det: "squat/presse 4×5", steps: [] });
    } else if (sp === "swim") {
      graft(faciles[0], { d: "rs", name: "+ Renfo épaules", det: "15min coiffe en fin de séance", steps: [] });
    }
  }
}

/** Anti-collage final : deux durs adjacents → le second redevient facile. */
function applyAntiCollage(r              , days          , refs      , hz         , ctx            )       {
  for (let i = 0; i < days.length - 1; i++) {
    if (days[i].charge === "dur" && days[i + 1].charge === "dur" && !days[i + 1].forced) {
      const d = days[i + 1];
      d.charge = "facile";
      d.slot = r.profile.sport === "run" ? "facile2" : "facileR";
      d.sessions = buildSessions(ctx, d.slot                         , d.phaseId, d.prog || 0);
      for (const s of d.sessions) if (s.steps && s.steps.length) renderSess(s, refs, hz, r.baseRefs);
    }
  }
}

/** Polarisation : jamais une semaine 100% dure — la longue est sacrifiée en dernier. */
function applyPolarizationGuard(r              , days          , ctx            , refs      , hz         )       {
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    if (wd[0]?.isR) continue;
    const active = wd.filter((d) => d.charge !== "off" && d.charge !== "recup");
    const faciles = active.filter((d) => d.charge === "facile");
    if (active.length >= 2 && faciles.length === 0) {
      const durs = active.filter((d) => d.charge === "dur" && !d.forced);
      if (durs.length >= 2) {
        const nonLong = durs.filter((d) => d.slot !== "durLong");
        const victim = nonLong.length ? nonLong[nonLong.length - 1] : durs[durs.length - 1];
        victim.charge = "facile";
        victim.slot = "facileR";
        victim.sessions = buildSessions(ctx, "facileR", victim.phaseId, victim.prog || 0);
        for (const s of victim.sessions) if (s.steps && s.steps.length) renderSess(s, refs, hz, r.baseRefs);
      }
    }
  }
}

// ===== src/generator/planGenerator.ts =====
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
                                                                                                          




function generatePlan(profile                )                                           {
  const engine = new TrainingReasoningEngine();
  const r = engine.analyze(profile);
  const a = profile;
  const fmt = a.format;
  const refs       = { ...r.baseRefs };
  const days = buildDays(r, refs, r.hz);

  // ---- Bornes de bloc (R3.4b/R3.11/R3.12) — source unique, mêmes règles que V1.5 ----
  let _capScale = 1;
  const brickRF = a.history === "reprise" ? C21_REPRISE_BRICK_FACTOR : 1; // C21
  function blockBounds(b        , s                )                                 {
    if (b.bnd) {
      const sc = _capScale;
      if (b.distanceM != null) {
        const fl = s.long ? 800 : Math.min(b.bnd.floor, r.beginner ? 600 : 750); // C24
        return { floor: fl, cap: Math.max(fl, Math.round(b.bnd.cap * sc)) };
      }
      const fl = s.d === "bk" ? 35 : 30; // C8/C16 — plancher digne, pas la borne basse du format
      return { floor: fl, cap: Math.max(fl, Math.round(b.bnd.cap * sc)) };
    }
    if (s.brick) {
      if (b.leg === "bike") return { floor: 32, cap: Math.round((CAP_BRICK_BIKE[fmt] || 300) * brickRF) };
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

  function scaleBlock(b        , f        , s                )       {
    if (b.role !== "body") return;
    const bd = blockBounds(b, s);
    // V2.2 — répartition des intensités : un bloc de QUALITÉ ne dépasse jamais son gabarit
    // (repCap). Sans lui, R3.3 déversait l'excédent de volume dans les intervalles
    // (VO2 4-6×4min devenu 15×4min) au lieu des séances faciles — zone grise garantie.
    const repMax = Math.min(15, b.repCap || 15);
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
    // C15 — protection débutant nage : aucune séance >850m, tous blocs confondus
    if (r.beginner && s.d === "sw" && b.distanceM != null) {
      const cap = C15_BEGINNER_SWIM_SESSION_CAP_M, reps = b.reps || 1;
      if (reps * b.distanceM > cap) {
        if (reps > 1) b.reps = Math.max(1, Math.floor(cap / b.distanceM));
        else b.distanceM = Math.floor(cap / 25) * 25;
      }
    }
  }

  const weekMin = (wd          ) => wd.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.min || 0), 0), 0);
  const renderWeek = (wd          ) =>
    wd.forEach((d) => d.sessions.forEach((s) => {
      if (s.steps && s.steps.length) renderSess(s, refs, r.hz, r.baseRefs);
      else if (s.min == null) s.min = 0;
    }));
  const scaleWeekBody = (wd          , f        ) =>
    wd.forEach((d) => d.sessions.forEach((s) => {
      if ((s                  ).social) return;
      if (s.steps) s.steps.forEach((b) => scaleBlock(b, f, s                  ));
    }));
  const clampWeekBody = (wd          ) => scaleWeekBody(wd, 1);

  const Lval = (id        , prog        ) => {
    const b = BANDS[id] || [0.6, 0.9];
    return b[0] + (b[1] - b[0]) * Math.max(0, Math.min(1, prog));
  };
  const capH = parseInt(a.vol_max || "10");
  let peakH = r.peakH;

  // ---- V2.1 — sonde de capacité : que permettent réellement les plafonds au pic ? ----
  {
    const chargePeakWeeks = [...new Set(days.filter((d) => d.phaseId === "peak").map((d) => d.week))]
      .filter((wn) => days.filter((d) => d.week === wn && d.isR).length < 4);
    const probeWeek = chargePeakWeeks[chargePeakWeeks.length - 1];
    if (probeWeek) {
      const clone = structuredClone(days.filter((d) => d.week === probeWeek))            ;
      _capScale = 1;
      for (let it = 0; it < 4; it++) {
        renderWeek(clone);
        const cur = weekMin(clone) / 60;
        if (cur <= 0) break;
        scaleWeekBody(clone, (peakH * 2) / cur); // pousser vers un cible inatteignable → saturation aux caps
      }
      clampWeekBody(clone);
      renderWeek(clone);
      const capacityH = weekMin(clone) / 60;
      if (capacityH > 0 && capacityH < peakH * 0.95) {
        r.decisions.push({
          id: "V2.1", what: "Promesse calibrée par sonde de capacité", val: capacityH.toFixed(1) + "h (au lieu de " + peakH.toFixed(1) + "h)",
          why: "Les plafonds de séance (formats, C15/C21/C24) ne permettent pas plus : promettre davantage serait mentir",
        });
        peakH = capacityH;
      }
    }
  }

  // ---- Boucle de volume : courbe (bands + C22) → R3.3 → garde C3 → R3.13 ----
  // R10 — point de départ de l'athlète : si le volume RÉCENT (3-6 derniers mois) est
  // connu, la semaine 1 part de là (≤ ×1.1) et la montée rejoint la courbe théorique à
  // ≤ C22 (+10% par semaine de charge). Sans cette rampe, un athlète qui sort de 3h/sem
  // recevait d'emblée la courbe calibrée sur sa capacité déclarée — trop, trop tôt.
  const volRecent = parseFloat(a.vol_recent || "");
  let _rampCap = volRecent > 0 ? Math.max(2, volRecent * 1.1) : Infinity;
  let _rampWeeks = 0;
  const wl           = [];
  let _maxChargeMin = 0;
  let _prevLw = 0;
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
    _capScale = Math.max(0.4, Math.min(1, (Lw - 0.5) * 1.2 + 0.4));
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
        if (s.long || (s                  ).social || !s.steps) return;
        s.steps.forEach((b) => scaleBlock(b, room / nlH, s                  ));
      }));
      renderWeek(wd);
    }
    // C24 — plancher de SÉANCE nage non-débutant : avec des cibles honnêtes (sonde V2.1),
    // R3.3 réduit aussi les séances de qualité — les blocs à répétitions n'ont pas de
    // plancher de total. On remonte la séance entière à ≥750m si le scaling l'a fait tomber.
    if (a.sport !== "run" && !r.beginner) {
      for (const d of wd)
        for (const s of d.sessions) {
          if (s.d !== "sw" || !s.steps || !s.steps.length) continue;
          const meters = s.steps.reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
          if (meters === 0 || meters >= 750) continue;
          const body = s.steps.filter((st) => st.role === "body" && st.distanceM != null).sort((x, y) => (y.reps || 1) * (y.distanceM || 0) - (x.reps || 1) * (x.distanceM || 0))[0];
          if (!body || !body.distanceM) continue;
          const missing = 750 - meters;
          if ((body.reps || 1) > 1) body.reps = (body.reps || 1) + Math.ceil(missing / body.distanceM);
          else body.distanceM = Math.ceil((body.distanceM + missing) / 25) * 25;
        }
      renderWeek(wd);
    }
    // R3.13 — affûtage : si les planchers bloquent, la fréquence cède
    if (ph.id === "taper" && _maxChargeMin > 0) {
      for (let g = 0; g < 3; g++) {
        if (weekMin(wd) <= _maxChargeMin * R313_TAPER_MAX_VS_PEAK) break;
        const active = wd.filter((d) => d.charge !== "off" && d.sessions.some((s) => s.d !== "rs"));
        if (active.length <= 3) break;
        const cand = active.filter((d) => d.charge === "facile" && !d.forced && !d.sessions.some((s) => s.long || s.brick));
        if (!cand.length) break;
        const dayMin = (d2        ) => d2.sessions.reduce((t, s) => t + (s.min || 0), 0);
        const victim = cand.reduce((x, y) => (dayMin(y) < dayMin(x) ? y : x));
        victim.charge = "off";
        victim.slot = "off";
        victim.sessions = [{ d: "rs", name: "OFF (affûtage)", det: "repos — la fraîcheur du jour J se construit maintenant", steps: [] }];
      }
    }
    const volReal = Math.round((weekMin(wd) / 60) * 10) / 10;
    if (!isRW && ph.id !== "taper") _maxChargeMin = Math.max(_maxChargeMin, weekMin(wd));
    wl.push({ num: w + 1, phase: ph, vol: volReal, vol_declared: Math.round(targetH * 10) / 10, vol_real: volReal, days: wd, isRecup: isRW });
  }

  if (_rampWeeks > 0) {
    r.decisions.push({
      id: "R10-depart", what: "Départ calé sur ton volume récent",
      val: volRecent + "h/sem → montée ≤ +10%/semaine sur " + _rampWeeks + " semaine" + (_rampWeeks > 1 ? "s" : ""),
      why: "Un plan qui démarre au-dessus de ce que le corps fait DÉJÀ multiplie le risque de blessure — on part de ton volume réel des derniers mois et on rejoint la courbe progressivement",
    });
  }

  // Dates alignées au calendrier réel → la course tombe à son VRAI jour dans la dernière
  // semaine ; les jours datés APRÈS elle deviennent repos assumé (on prépare, on court,
  // on récupère — jamais de séance orpheline après l'objectif). Volumes recalculés
  // honnêtement, déclaré compris (jamais relevé).
  if (a.race_date) {
    const wk = wl[wl.length - 1];
    let cut = false;
    for (const d of wk.days            ) {
      if (d.date && d.date > a.race_date && d.sessions.some((s) => s.d !== "rs")) {
        d.charge = "off";
        d.slot = "off";
        d.sessions = [{ d: "rs", name: "Repos post-course", det: "récupération — marche, hydratation, fierté", steps: [] }];
        cut = true;
      }
    }
    if (cut) {
      const vr = Math.round((weekMin(wk.days            ) / 60) * 10) / 10;
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
  const races                                   = [];
  if (a.races === "oui") {
    if (a.race1_date) races.push({ date: a.race1_date, prio: a.race1_prio || "C" });
    if (a.race2_date) races.push({ date: a.race2_date, prio: a.race2_prio || "C" });
  }
  for (const rc of races) {
    // La semaine d'une course intermédiaire se trouve par SA DATE dans la grille datée
    // (l'ancien offset depuis « aujourd'hui » se décale dès que la semaine 1 commence au lundi).
    const wk = wl.find((w) => (w.days            ).some((d) => d.date === rc.date));
    if (wk) {
      wk.race = rc.prio;
      // R10 — le JOUR de course existe dans la grille : la séance de ce jour devient la
      // course elle-même (consigne de pacing selon la priorité), pas un entraînement.
      const rd = (wk.days            ).find((d) => d.date === rc.date);
      if (rd) {
        const mainD = a.sport === "bike" ? "bk" : a.sport === "swim" ? "sw" : "rn";
        const prevMin = rd.sessions.reduce((m, s) => m + (s.min || 0), 0) || 60;
        rd.charge = "dur";
        rd.sessions = [{
          d: mainD        ,
          name: "🏁 Course " + rc.prio,
          det: rc.prio === "C"
            ? "Course laboratoire : départ contrôlé, teste ton ravito et ton pacing — on enchaîne l'entraînement derrière. — 💡 Objectif : apprendre en conditions réelles, pas performer."
            : "Course de préparation : mini-affûtage fait, tu peux appuyer. Départ prudent, finis fort. — 💡 Objectif : valider allures et stratégie avant l'objectif A.",
          min: prevMin,
          steps: [{ role: "body", durationMin: prevMin, zone: mainD + ".thr" }],
          note: "Course " + rc.prio + " placée à sa vraie date — la semaine est allégée autour.",
        }             ];
      }
      if (rc.prio !== "C") {
        wk.vol = Math.round(wk.vol * 0.75 * 10) / 10;
        wk.taperRace = true;
      }
      const next = wl.find((w) => w.num === wk.num + 1);
      if (next) {
        next.vol = Math.round(next.vol * 0.7 * 10) / 10;
        next.postRace = true;
      }
    }
  }

  const plan         = { weeks: wl, volPeak, volBase, use10: r.use10, totalWeeks: r.weeks, phases: r.phases, races };
  return { plan, reasoned: r };
}

// ===== src/generator/repairLoop.ts =====
/**
 * Boucle de réparation V2 — jamais de régénération aveugle (un générateur déterministe
 * reproduirait le même plan : boucle infinie par construction). L'audit dit QUOI est
 * cassé et OÙ ; la réparation vise ce point précis. Itérations plafonnées ; si les
 * contraintes sont insatisfaisables, on rend le MEILLEUR plan avec des avertissements
 * explicites — c'est un output de coaching précieux, pas un échec.
 */
                                                                 




const MAX_ITERATIONS = 3;

/** Réparations ciblées : violation → action locale sur le plan. Exporté pour la démo de sabotage. */
function applyTargetedRepairs(plan        , audit           , refs      , hz                        , baseRefs      )           {
  const applied           = [];

  // Affûtage trop lourd — deux visages du même mal : taperVsPeak > 0.6, ou une semaine
  // d'affûtage devenue la plus grosse du plan (échec « pic en phase peak »). Réparation :
  // rétrécir le CORPS des séances d'affûtage vers la cible R3.13, puis couper la fréquence.
  const wMinOf = (w                    ) => w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.min || 0), 0), 0);
  const taperWeeks = plan.weeks.filter((w) => w.phase.id === "taper");
  const chargeMax = Math.max(0, ...plan.weeks.filter((w) => !w.isRecup && w.phase.id !== "taper").map(wMinOf));
  const taperTooHeavy = (audit.taperVsPeak !== null && audit.taperVsPeak > 0.6) || (!audit.peakInPeakPhase && taperWeeks.some((w) => wMinOf(w) > chargeMax * R313_TAPER_MAX_VS_PEAK));
  if (taperTooHeavy && chargeMax > 0) {
    for (const w of taperWeeks) {
      const target = chargeMax * R313_TAPER_MAX_VS_PEAK;
      if (wMinOf(w) > target) {
        // 1) rétrécir les corps de séance proportionnellement
        const f = Math.max(0.2, target / wMinOf(w));
        for (const d of w.days)
          for (const s of d.sessions) {
            if (!s.steps || !s.steps.length) continue;
            for (const st of s.steps) {
              if (st.role !== "body") continue;
              if (st.durationMin) st.durationMin = Math.max(3, Math.round(st.durationMin * f));
              if (st.distanceM) st.distanceM = Math.max(100, Math.round((st.distanceM * f) / 25) * 25);
            }
            renderSess(s, refs, hz, baseRefs);
          }
        applied.push("S" + w.num + " : corps des séances d'affûtage ×" + f.toFixed(2) + " (affûtage plus lourd que permis)");
      }
      // 2) si les planchers bloquent encore : la fréquence cède (R3.13)
      for (let g = 0; g < 4 && wMinOf(w) > chargeMax * R313_TAPER_MAX_VS_PEAK; g++) {
        const cand = w.days.filter((d) => d.charge === "facile" && !d.forced && d.sessions.some((s) => s.d !== "rs") && !d.sessions.some((s) => s.long || s.brick));
        if (!cand.length) break;
        const dayMin = (d                  ) => d.sessions.reduce((t, s) => t + (s.min || 0), 0);
        const victim = cand.reduce((x, y) => (dayMin(y) < dayMin(x) ? y : x));
        victim.charge = "off";
        victim.slot = "off";
        victim.sessions = [{ d: "rs", name: "OFF (affûtage)", det: "repos — la fraîcheur du jour J se construit maintenant", steps: [] }];
        applied.push("S" + w.num + " : jour facile → OFF (affûtage trop lourd)");
      }
    }
  }

  // Séance muette → note générique honnête (le manifeste exige l'explication)
  for (const w of plan.weeks)
    for (const d of w.days)
      for (const s of d.sessions) {
        if (s.d === "rs" || s.note || (s.det || "").includes("💡")) continue;
        s.note = "Séance d'endurance au service du bloc en cours : régularité avant tout.";
        if (s.steps && s.steps.length) renderSess(s, refs, hz, baseRefs);
        else s.det = (s.det || "") + " — 💡 " + s.note;
        applied.push("S" + w.num + " : note ajoutée à « " + s.name + " »");
      }

  return applied;
}

/** Génère, audite, répare de façon ciblée, et rend toujours un résultat honnête. */
function generateAudited(profile                , auditOpts                     )              {
  const { plan, reasoned } = generatePlan(profile);
  const opts            = {
    sport: profile.sport,
    format: profile.format,
    level: profile.level,
    refs: { cssSecPer100m: reasoned.baseRefs.css || 130, thrPaceSecPerKm: reasoned.baseRefs.thrPace || 330 },
    ...auditOpts,
  };
  const refs       = { ...reasoned.baseRefs };
  let audit = auditPlan(plan, opts);
  const repairs           = [];
  let best = { plan, audit };

  for (let it = 0; it < MAX_ITERATIONS && audit.hardViolations.length > 0; it++) {
    const applied = applyTargetedRepairs(plan, audit, refs, reasoned.hz, reasoned.baseRefs);
    if (!applied.length) break; // aucune réparation applicable : inutile de boucler
    repairs.push(...applied);
    audit = auditPlan(plan, opts);
    if (audit.hardViolations.length < best.audit.hardViolations.length || audit.score > best.audit.score) best = { plan, audit };
  }

  const warnings           = [];
  if (best.audit.hardViolations.length > 0) {
    warnings.push("Plan rendu avec réserves (contraintes insatisfaisables après " + MAX_ITERATIONS + " réparations) :");
    warnings.push(...best.audit.hardViolations.map((v) => "· " + v));
  }
  return { plan: best.plan, audit: best.audit, warnings, repairs, decisions: reasoned.decisions };
}

// ===== src/engine/predictor.ts =====
/**
 * Prédiction de course — projection chiffrée en compétition (roadmap « dashboard »).
 *
 * Principes : un entraîneur ne promet jamais un chrono sec → FOURCHETTES, hypothèses
 * affichées, et pas de chiffre quand la donnée manque (conseil de test à la place).
 * Méthodes : course = Riegel (exposant 1.06) depuis l'allure seuil (~1h) ; natation =
 * CSS × facteur de distance ; vélo = PUISSANCES cibles (le chrono dépend du parcours,
 * on ne l'invente pas) ; tri = legs séparés avec facteur de fatigue par format.
 * La fourchette se resserre si le plan est bien suivi (streak + charge accomplie).
 */
                                           

                                 
                                                            
                                             
              
 
                             
                          
                                                               
                        
 
                              
                                                    
                       
                                                                                         
 

// R6 — profil du parcours : un chrono à plat ne vaut rien sur un parcours vallonné.
// Facteurs de temps course à pied (littérature GAP/expérience course sur route) :
// vallonné ~+3–6 %, montagneux ~+8–15 % — appliqués en ÉLARGISSANT la fourchette
// (l'incertitude monte avec le relief, on ne fait pas semblant du contraire).
const COURSE_PROFILE_RUN                                                            = {
  plat: { lo: 1.0, hi: 1.0, label: "parcours plat" },
  vallonne: { lo: 1.03, hi: 1.06, label: "parcours vallonné" },
  montagneux: { lo: 1.08, hi: 1.15, label: "parcours montagneux" },
};

const RUN_KM                         = { "5k": 5, "10k": 10, semi: 21.0975, marathon: 42.195 };
const SWIM_RACE                                                   = {
  sprint: { dist: 100, factor: 0.9 },
  demifond: { dist: 400, factor: 0.94 },
  fond: { dist: 1500, factor: 1.0 },
  ow: { dist: 1500, factor: 1.05 },
};
// R10 — recalées sur les facteurs d'intensité de référence (Coggan) et exprimées en
// puissance NORMALISÉE : un ami coureur lisait « 80% FTP » comme une cible molle — c'est
// la moyenne pondérée d'un effort où les pointes montent bien au-dessus du seuil.
const BIKE_POWER                                                           = {
  crit: { lo: 0.95, hi: 1.05, note: "critérium : au seuil et au-dessus par relances" },
  clm: { lo: 0.95, hi: 1.02, note: "CLM : effort au seuil, régulier du départ à la ligne" },
  route: { lo: 0.85, hi: 0.95, note: "course sur route : les attaques et bosses montent bien au-dessus du seuil" },
  cyclo: { lo: 0.73, hi: 0.83, note: "cyclosportive : tempo durable, garder du grain pour la fin" },
  gravel: { lo: 0.68, hi: 0.78, note: "gravel/ultra : endurance, la régularité bat la vitesse" },
};
const TRI_SWIM                                                   = {
  S: { dist: 750, factor: 1.04 },
  M: { dist: 1500, factor: 1.05 },
  "70.3": { dist: 1900, factor: 1.06 },
  Full: { dist: 3800, factor: 1.08 },
};
const TRI_BIKE                                             = {
  S: { lo: 0.85, hi: 0.93 },
  M: { lo: 0.82, hi: 0.88 },
  "70.3": { lo: 0.76, hi: 0.83 },
  Full: { lo: 0.7, hi: 0.76 },
};
const TRI_RUN                                                  = {
  S: { km: 5, fatigue: 1.03 },
  M: { km: 10, fatigue: 1.05 },
  "70.3": { km: 21.0975, fatigue: 1.08 },
  Full: { km: 42.195, fatigue: 1.13 },
};

const fmtT = (sec        )         => {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h > 0 ? h + "h" + String(m).padStart(2, "0") : m + "'" + String(r).padStart(2, "0");
};

/** Riegel : temps sur D depuis l'allure seuil (tenable ~1h), t = 3600 × (D/D₁ₕ)^1.06 */
function riegelSec(thrPaceSecPerKm        , distKm        )         {
  const d1h = 3600 / thrPaceSecPerKm;
  return 3600 * Math.pow(distKm / d1h, 1.06);
}

function predictRace(
  sport        ,
  format        ,
  intent                    ,
  refs                                               ,
  opts              = {}
)             {
  const items                   = [];
  const advice           = [];
  const decisions             = [];
  const D = (id        , what        , val        , why        ) => decisions.push({ id, what, val, why });

  // Fourchette : ±3% de base ; ±2% si le plan est bien suivi ; décalée +3% en mode finisher.
  const followed = (opts.pctLoad ?? 0) >= 60 && (opts.streakWeeks ?? 0) >= 3;
  const spread = followed ? 0.02 : 0.03;
  const shift = intent === "finir" ? 0.03 : 0;
  if (followed) D("PRED-forme", "Fourchette resserrée", "±2%", "Plan bien suivi (streak ≥3 semaines, charge accomplie ≥60%) : la projection est plus fiable");
  if (shift > 0) D("PRED-finisher", "Pacing conservateur", "+3%", "Objectif finisher : on vise l'arrivée en forme, pas la marge d'erreur");
  const range = (sec        ) => fmtT(sec * (1 + shift - spread)) + "–" + fmtT(sec * (1 + shift + spread));
  // Fourchette COURSE À PIED avec profil de parcours (R6) — le relief élargit et décale.
  const prof = opts.courseProfile && COURSE_PROFILE_RUN[opts.courseProfile] ? COURSE_PROFILE_RUN[opts.courseProfile] : null;
  if (prof && prof.hi > 1) D("PRED-parcours", "Profil du parcours", prof.label, "Le relief ralentit et augmente l'incertitude : fourchette ×" + prof.lo + "–" + prof.hi + " sur les temps de course à pied");
  const runRange = (sec        ) => prof
    ? fmtT(sec * prof.lo * (1 + shift - spread)) + "–" + fmtT(sec * prof.hi * (1 + shift + spread))
    : range(sec);
  const profWhy = prof && prof.hi > 1 ? " · " + prof.label + " (+" + Math.round((prof.lo - 1) * 100) + "–" + Math.round((prof.hi - 1) * 100) + "%)" : "";

  if (sport === "run") {
    if (refs.thrPace > 0 && RUN_KM[format]) {
      const t = riegelSec(refs.thrPace, RUN_KM[format]);
      items.push({ leg: "Course", value: runRange(t), why: "Riegel depuis ton allure seuil (~1h), exposant 1.06 — la référence des prédictions route" + profWhy });
      D("PRED-run", "Méthode course", "Riegel ^1.06", "Extrapolation standard depuis l'allure tenable une heure");
    } else if (format === "trail") {
      advice.push("Trail : le chrono dépend du D+ et du terrain — repère fiable : allure Z2 à plat, marche assumée dans les pentes raides.");
    } else advice.push("Renseigne ton allure seuil (test : 30min à fond, allure moyenne) pour obtenir une projection chiffrée.");
  } else if (sport === "bike") {
    const b = BIKE_POWER[format];
    if (refs.ftp > 0 && b) {
      items.push({ leg: "Vélo", value: Math.round(refs.ftp * b.lo) + "–" + Math.round(refs.ftp * b.hi) + "W", why: b.note + " — cible en puissance NORMALISÉE (moyenne pondérée : les pointes montent au-dessus), le chrono dépend du parcours" });
      D("PRED-bike", "Méthode vélo", "% FTP par format", "Prédire un chrono sans connaître le parcours serait mentir ; la puissance cible est transférable partout");
    } else advice.push("Renseigne ta FTP (test 20min × 0.95) pour obtenir tes puissances cibles de course.");
  } else if (sport === "swim") {
    const sw = SWIM_RACE[format];
    if (refs.css > 0 && sw) {
      const t = (sw.dist / 100) * refs.css * sw.factor;
      items.push({ leg: "Natation (" + sw.dist + "m)", value: range(t), why: "CSS × " + sw.factor + (sw.factor < 1 ? " (les distances courtes se nagent plus vite que le seuil)" : sw.factor > 1 ? " (eau libre : navigation et peloton ralentissent)" : " (le 1500m se nage à l'allure CSS)") });
      D("PRED-swim", "Méthode natation", "CSS × facteur distance", "Le Critical Swim Speed est l'allure soutenable — chaque distance de course a son facteur validé");
    } else advice.push("Renseigne ton CSS (test : 400m et 200m chrono → CSS = 200m ÷ (t400−t200)) pour une projection chiffrée.");
  } else if (sport === "tri") {
    const sw = TRI_SWIM[format], bk = TRI_BIKE[format], rn = TRI_RUN[format];
    if (refs.css > 0 && sw) {
      const t = (sw.dist / 100) * refs.css * sw.factor;
      items.push({ leg: "Natation " + sw.dist + "m", value: range(t), why: "CSS × " + sw.factor + " — peloton, combinaison et navigation compris" });
    } else advice.push("CSS manquant → pas de projection natation (test 400/200m).");
    if (refs.ftp > 0 && bk) {
      items.push({ leg: "Vélo", value: Math.round(refs.ftp * bk.lo) + "–" + Math.round(refs.ftp * bk.hi) + "W", why: "puissance normalisée qui laisse des jambes pour courir — dépasser cette bande se paie sur la CAP" });
    } else advice.push("FTP manquante → pas de puissance cible vélo (test 20min × 0.95).");
    if (refs.thrPace > 0 && rn) {
      const t = riegelSec(refs.thrPace, rn.km) * rn.fatigue;
      items.push({ leg: "CAP " + (rn.km >= 21 ? (rn.km > 22 ? "marathon" : "semi") : rn.km + "km"), value: runRange(t), why: "Riegel × " + rn.fatigue + " de fatigue post-vélo (facteur " + format + ")" + profWhy });
    } else advice.push("Allure seuil manquante → pas de projection CAP (test 30min).");
    if (items.length) D("PRED-tri", "Méthode tri", "legs séparés", "Un total additionnerait les incertitudes ; chaque leg a sa méthode et sa fourchette");
  }

  return { items, advice, decisions };
}

// ===== src/readiness/readinessSource.ts =====
/**
 * Source de readiness ENFICHABLE — Sprint 2 (roadmap amendée).
 *
 * ⚠️ L'accès Garmin Health API (HRV/Body Battery/Training Readiness) est un programme
 * B2B sous agrément, non garanti. L'architecture rend la source interchangeable :
 *   1. Saisie manuelle (MVP, ici) — « comment as-tu dormi ? / FC du matin / énergie »
 *   2. Upload FIT (à venir)
 *   3. API Garmin (si accès accordé)
 * La logique d'ajustement (dailyAdjuster) ne dépend JAMAIS de la provenance des chiffres.
 */

                                                       
                                                       // vs moyenne glissante 7j de l'athlète
                                                  

                                   
                      
                                      
                  
                                                 
 

/** Photo du matin — tous les champs optionnels sauf la date : la source remplit ce qu'elle sait. */
                                    
                      
                              
                      
                        
                                     
                                                   
                                                     
              
                                                                                     
                                                                                          
                                                                                    
                                                                                     
                     
                        
                                                                                        
                                                                                    
                   
 

/** Météo du jour — manifeste §6 : canicule → repos/intensité réduite, chaleur → tôt le matin, pluie → surface. */
                              
                 
                    
 

                                  
                        
                                                      
 

/** Verdict dérivé — la SEULE entrée du dailyAdjuster (agnostique de la source). */
                                                          
                                   
                        
                                                                             
 

/**
 * Verdict à partir d'une photo. Règles (roadmap) :
 * - HRV basse + sommeil mauvais → rouge (remplacer la qualité par de l'endurance)
 * - énergie très basse → rouge ; basse → orange
 * - FC repos élevée vs habitude (+8%) → au moins orange
 * - tout au vert (sommeil bon, HRV normale/haute, énergie haute) → verte, la qualité est GARDÉE
 * - information absente → prudence : jamais mieux que « orange » si un signal négatif existe
 */
function assessReadiness(s                   )                   {
  const drivers           = [];
  let score = 0; // négatif = fatigue
  // R4.5 — douleur signalée : rouge FORCÉ, quels que soient les autres signaux. La qualité
  // (>Z2) est remplacée par de la récupération tant que le drapeau n'est pas levé.
  if (s.painFlag) {
    drivers.push("douleur signalée" + (s.painLocation ? " (" + s.painLocation + ")" : "") + " — intensité verrouillée, consulte médecin/kiné si ça persiste");
    return { level: "rouge", drivers };
  }
  // R4.7 — la séance d'hier était très dure (RPE ≥8) : signal de fatigue annoncé.
  if (s.lastRpe != null && s.lastRpe >= 8) { score -= 1; drivers.push("séance d'hier très dure (RPE " + s.lastRpe + "/10)"); }
  if (s.sleepQuality === "mauvais" || (s.sleepHours != null && s.sleepHours < 5.5)) { score -= 2; drivers.push("sommeil dégradé"); }
  else if (s.sleepQuality === "moyen" || (s.sleepHours != null && s.sleepHours < 6.5)) { score -= 1; drivers.push("sommeil moyen"); }
  else if (s.sleepQuality === "bon") { score += 1; drivers.push("sommeil bon"); }
  if (s.hrvStatus === "basse") { score -= 2; drivers.push("HRV sous ta moyenne 7j"); }
  else if (s.hrvStatus === "haute") { score += 1; drivers.push("HRV au-dessus de ta moyenne"); }
  if (s.energy != null) {
    if (s.energy < 25) { score -= 2; drivers.push("énergie très basse (" + s.energy + "/100)"); }
    else if (s.energy < 45) { score -= 1; drivers.push("énergie basse (" + s.energy + "/100)"); }
    else if (s.energy >= 70) { score += 1; drivers.push("énergie haute (" + s.energy + "/100)"); }
  }
  if (s.restingHr != null && s.restingHrBaseline != null && s.restingHr >= s.restingHrBaseline * 1.08) {
    score -= 2;
    drivers.push("FC repos élevée (" + s.restingHr + " vs " + s.restingHrBaseline + " bpm habituels)");
  }
  if (s.feel === "fatigue") { score -= 1; drivers.push("sensation de fatigue déclarée"); }
  else if (s.feel === "frais") { score += 1; drivers.push("sensation de fraîcheur"); }

  const level                 = score <= -3 ? "rouge" : score <= -1 ? "orange" : "verte";
  if (!drivers.length) drivers.push("aucun signal : on suit le plan");
  return { level, drivers };
}

/** MVP — saisie manuelle : trois questions au réveil suffisent. */
class ManualEntrySource                            {
           name = "saisie-manuelle";
          entries = new Map                           ();
  record(snapshot                   )       {
    this.entries.set(snapshot.date, snapshot);
  }
  getSnapshot(date        )                           {
    return this.entries.get(date) ?? null;
  }
}

// ===== src/readiness/fitParser.ts =====
/**
 * Parseur FIT minimal — source « Upload FIT » de la roadmap (readinessSource, slot 2).
 *
 * Zéro dépendance : décodage du format binaire FIT (Garmin/Coros/Suunto/Wahoo…)
 * limité à ce dont le coach a besoin — les messages `session` (global 18) d'un
 * fichier d'ACTIVITÉ : sport, date, durée, distance, vitesse/FC/puissance moyennes.
 * Tout le reste (records GPS, laps, événements, champs développeur) est ignoré
 * proprement en suivant les définitions, jamais en devinant des offsets.
 *
 * Ce qu'un FIT d'activité NE contient PAS : sommeil et HRV nocturne (fichiers
 * « monitoring » Garmin, non exportables sans l'API) — la saisie manuelle reste
 * la source de ces signaux, comme documenté dans readinessSource.ts.
 */
                                                             

/** Époque FIT : 1989-12-31T00:00:00Z. */
const FIT_EPOCH_S = 631065600;
const SPORT_MAP                                                    = { 1: "rn", 2: "bk", 5: "sw" };

                             
                                        
                                         
                                      
                     
                             
                 
                     
                      
 

                            
                         
                                                                                       
                                                                                            
                                                                                  
 

                                                
                                                                                                

function u16(b            , o        , le         )         { return le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]; }
function u32(b            , o        , le         )         {
  return le
    ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) + b[o + 3] * 0x1000000
    : b[o] * 0x1000000 + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]);
}
/** Lit un champ numérique par taille (1/2/4 octets), null si « invalide » FIT (0xFF…). */
function readNum(b            , o        , size        , le         )                {
  if (size === 1) { const v = b[o]; return v === 0xff ? null : v; }
  if (size === 2) { const v = u16(b, o, le); return v === 0xffff ? null : v; }
  if (size === 4) { const v = u32(b, o, le); return v === 0xffffffff ? null : v; }
  return null; // tailles exotiques (strings, tableaux) : hors besoin
}

/** Décode les messages `session` d'un fichier FIT. Jette une Error si l'en-tête est invalide. */
function parseFit(bytes            )               {
  if (bytes.length < 12) throw new Error("Fichier trop court pour être un FIT");
  const headerSize = bytes[0];
  if ((headerSize !== 12 && headerSize !== 14) || String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) !== ".FIT")
    throw new Error("En-tête FIT invalide (signature .FIT absente)");
  const dataSize = u32(bytes, 4, true);
  const end = Math.min(bytes.length, headerSize + dataSize); // le CRC final (2 octets) reste dehors
  const defs = new Map                ();
  const sessions               = [];
  let o = headerSize;
  while (o < end) {
    const hdr = bytes[o++];
    const isCompressed = (hdr & 0x80) !== 0;
    const localType = isCompressed ? (hdr >> 5) & 0x03 : hdr & 0x0f;
    if (!isCompressed && (hdr & 0x40) !== 0) {
      // Message de DÉFINITION : c'est lui qui dicte la taille des données qui suivent
      const littleEndian = bytes[o + 1] === 0;
      const global = u16(bytes, o + 2, littleEndian);
      const nf = bytes[o + 4];
      o += 5;
      const fields             = [];
      for (let i = 0; i < nf; i++) { fields.push({ num: bytes[o], size: bytes[o + 1] }); o += 3; }
      let devBytes = 0;
      if ((hdr & 0x20) !== 0) { // champs développeur : à sauter dans chaque donnée
        const nd = bytes[o++];
        for (let i = 0; i < nd; i++) { devBytes += bytes[o + 1]; o += 3; }
      }
      defs.set(localType, { global, littleEndian, fields, devBytes });
      continue;
    }
    // Message de DONNÉES (normal ou horodatage compressé)
    const def = defs.get(localType);
    if (!def) throw new Error("Message de données sans définition (fichier corrompu)");
    if (def.global === 18) {
      const s                                                                                                  = {};
      let fo = o;
      for (const f of def.fields) {
        const v = readNum(bytes, fo, f.size, def.littleEndian);
        fo += f.size;
        if (v == null) continue;
        if (f.num === 2) s.start = v;
        else if (f.num === 5) s.sport = v;
        else if (f.num === 8) s.timer = v; // ms
        else if (f.num === 9) s.dist = v; // cm
        else if (f.num === 14) s.speed = v; // mm/s
        else if (f.num === 16) s.hr = v;
        else if (f.num === 20) s.power = v;
        else if (f.num === 34) s.np = v;
      }
      if (s.timer != null && s.timer > 0) {
        const startS = s.start != null ? s.start + FIT_EPOCH_S : null;
        sessions.push({
          date: startS != null ? new Date(startS * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          sport: (s.sport != null && SPORT_MAP[s.sport]) || "autre",
          minutes: Math.round(s.timer / 1000 / 60),
          distanceM: s.dist != null ? Math.round(s.dist / 100) : undefined,
          avgSpeedMs: s.speed != null ? s.speed / 1000 : undefined,
          avgHr: s.hr,
          avgPowerW: s.power,
          normPowerW: s.np,
        });
      }
    }
    o += def.fields.reduce((a, f) => a + f.size, 0) + def.devBytes;
  }
  return sessions;
}

/** Séances FIT → contrat readiness (CompletedSession) + estimations de références,
 *  avec les MÊMES règles prudentes que l'import Strava (jamais de FTP sans puissance,
 *  l'allure moyenne d'une course est un plancher, pas un seuil). */
function fitToImport(sessions              )            {
  const completed                     = [];
  const tests                     = [];
  const notes           = [];
  for (const s of sessions) {
    if (s.sport !== "autre" && s.minutes > 0) completed.push({ date: s.date, d: s.sport, minutes: s.minutes });
    if (s.sport === "bk" && s.minutes >= 20) {
      const p = s.normPowerW || s.avgPowerW;
      if (p && p > 0) tests.push({ type: "ftp", value: Math.round(p * 0.95), date: s.date, source: "FIT (sortie " + s.minutes + "min)" });
      else notes.push("Sortie vélo du " + s.date + " sans puissance : FTP non estimée (capteur requis).");
    }
    if (s.sport === "rn" && s.minutes >= 20 && s.avgSpeedMs && s.avgSpeedMs > 0)
      tests.push({ type: "thrPace", value: Math.round(1000 / s.avgSpeedMs), date: s.date, source: "FIT (course " + s.minutes + "min, estimation basse)" });
    if (s.sport === "sw" && s.minutes >= 10 && s.avgSpeedMs && s.avgSpeedMs > 0)
      tests.push({ type: "css", value: Math.round(100 / s.avgSpeedMs), date: s.date, source: "FIT (nage " + s.minutes + "min)" });
  }
  if (!sessions.length) notes.push("Aucune séance trouvée dans ce fichier (est-ce bien un FIT d'activité ?).");
  return { sessions, completed, tests, notes };
}

/** Point d'entrée UI : octets bruts → import complet. */
function importFitBytes(buf                          )            {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return fitToImport(parseFit(bytes));
}

// ===== src/readiness/dailyAdjuster.ts =====
/**
 * Ajusteur quotidien — Sprint 2. « Recalcul chaque matin » = à l'ouverture de l'appli.
 *
 * Logique (roadmap) :
 * - readiness ROUGE (HRV basse + sommeil mauvais, énergie très basse…) → la qualité est
 *   REMPLACÉE par de l'endurance ; un jour facile devient repos actif ; en affûtage → OFF.
 * - ORANGE → le corps de séance est RÉDUIT (×0.7), la structure est conservée.
 * - VERTE → la séance est GARDÉE, et on le dit (décision explicite, pas un silence).
 * - Écart prévu/réel : semaine réalisée >130% du prévu → verdict durci d'un cran ;
 *   <60% → on n'essaie JAMAIS de rattraper le volume manqué (règle de coach).
 *
 * Invariants (vérifiés par demo:readiness, en CI) : hors verte, jamais plus de minutes
 * qu'avant ; jamais d'intensité supérieure ; l'affûtage ne gagne jamais de charge ;
 * chaque ajustement porte un {id, what, val, why}.
 */
                                                                                           


const HARD_ZONES = [".vo2", ".thr", ".speed", ".css"];
const MODERATE_ZONES = [".ss", ".rp", ".frc", ".mara", ".tempo"];

function sessionIntensity(s           )                 {
  if (s.d === "rs") return "repos";
  if (s.brick) return "difficile";
  const zones = (s.steps || []).filter((st) => st.role === "body" && typeof st.zone === "string").map((st) => st.zone          );
  if (zones.some((z) => HARD_ZONES.some((h) => z.endsWith(h)))) return "difficile";
  if (zones.some((z) => MODERATE_ZONES.some((m) => z.endsWith(m)))) return "moderee";
  return "facile";
}

const dayMinutes = (d       ) => d.sessions.reduce((t, s) => t + (s.min || 0), 0);

function findDay(plan        , date        )                                                  {
  for (const w of plan.weeks)
    for (const d of w.days) if ((d                     ).date === date) return { day: d, week: w };
  return null;
}

/** Charge des 7 jours précédant `date` : prévue par le plan vs réellement effectuée. */
function acuteGap(plan        , snapshot                   )                                                                {
  const end = new Date(snapshot.date + "T00:00:00Z").getTime();
  const start = end - 7 * 864e5;
  let plannedMin = 0;
  for (const w of plan.weeks)
    for (const d of w.days) {
      const t = new Date(((d                     ).date || "1970-01-01") + "T00:00:00Z").getTime();
      if (t >= start && t < end) plannedMin += dayMinutes(d);
    }
  const doneMin = (snapshot.completed || [])
    .filter((c) => {
      const t = new Date(c.date + "T00:00:00Z").getTime();
      return t >= start && t < end;
    })
    .reduce((t, c) => t + c.minutes, 0);
  return { plannedMin, doneMin, ratio: plannedMin > 0 && snapshot.completed ? doneMin / plannedMin : null };
}

function downgrade(level                )                 {
  return level === "verte" ? "orange" : "rouge";
}

/** Réduit le corps des séances d'un jour (×f), re-rend, renvoie les minutes. */
function reduceDay(day       , f        , refs      , hz                        , baseRefs      )       {
  for (const s of day.sessions) {
    if (!s.steps || !s.steps.length) continue;
    for (const st of s.steps) {
      if (st.role !== "body") continue;
      if (st.reps && st.reps > 1) st.reps = Math.max(1, Math.round(st.reps * f));
      else if (st.durationMin) st.durationMin = Math.max(10, Math.round(st.durationMin * f));
      else if (st.distanceM) st.distanceM = Math.max(200, Math.round((st.distanceM * f) / 25) * 25);
    }
    renderSess(s, refs, hz, baseRefs);
  }
}

function enduranceReplacement(disc        , minutes        , refs      , hz                        , baseRefs      , why        )            {
  const d = (disc === "br" ? "bk" : disc)                  ;
  const zone = d === "rn" ? "rn.easy" : d === "sw" ? "sw.easy" : "bk.z2";
  const s            = d === "sw"
    ? { d, name: "Endurance souple (adaptée)", note: why, det: "", steps: [{ role: "body", distanceM: Math.max(750, Math.round(((minutes * 60) / (baseRefs.css || 130)) * 100 / 25) * 25), zone, d: "sw" }] }
    : { d, name: "Endurance facile (adaptée)", note: why, det: "", steps: [{ role: "body", durationMin: minutes, zone }] };
  renderSess(s, refs, hz, baseRefs);
  return s;
}

function adjustDay(reasoned              , plan        , date        , snapshot                   )                {
  const decisions             = [];
  const D = (id        , what        , val                 , why        ) => decisions.push({ id, what, val, why });
  const refs       = { ...reasoned.baseRefs };
  const found = findDay(plan, date);
  const verdictBase = assessReadiness(snapshot);
  let level = verdictBase.level;
  const drivers = [...verdictBase.drivers];

  // Écart prévu/réel — recalcul de la fatigue accumulée
  const gap = acuteGap(plan, snapshot);
  if (gap.ratio !== null) {
    if (gap.ratio > 1.3) {
      level = downgrade(level);
      drivers.push("charge réelle 7j = " + Math.round(gap.ratio * 100) + "% du prévu — fatigue accumulée");
      D("ADAPT-charge", "Fatigue recalculée", Math.round(gap.doneMin) + "min réalisées vs " + Math.round(gap.plannedMin) + "min prévues", "Tu en as fait beaucoup plus que prévu : le verdict du jour est durci d'un cran");
    } else if (gap.ratio < 0.6) {
      D("ADAPT-rattrapage", "Volume manqué", Math.round(gap.doneMin) + "/" + Math.round(gap.plannedMin) + "min", "On ne rattrape JAMAIS le volume manqué : la semaine reprend comme prévu, sans compensation");
    }
  }
  // Météo (manifeste §6) — la canicule durcit le verdict pour les séances en extérieur ;
  // la chaleur et la pluie produisent des consignes, pas des interdictions.
  const wx = snapshot.weather;
  const outdoor = found ? found.day.sessions.some((s) => s.d === "rn" || s.d === "bk" || s.d === "br") : false;
  if (wx?.tmaxC != null && found) {
    if (wx.tmaxC >= 35 && outdoor) {
      level = downgrade(level);
      drivers.push("canicule prévue (" + Math.round(wx.tmaxC) + "°C)");
      D("ADAPT-canicule", "Canicule", Math.round(wx.tmaxC) + "°C", "≥35°C : intensité réduite ou repos pour les séances extérieures — la piscine reste une excellente option aujourd'hui");
    } else if (wx.tmaxC >= 30 && outdoor) {
      drivers.push("forte chaleur (" + Math.round(wx.tmaxC) + "°C)");
      D("ADAPT-chaleur", "Forte chaleur", Math.round(wx.tmaxC) + "°C", "Démarre tôt le matin, hydrate-toi, et réduis d'un cran si la dérive cardiaque monte");
    }
  }
  if (wx?.precipMm != null && wx.precipMm >= 5 && found && found.day.sessions.some((s) => s.d === "rn")) {
    D("ADAPT-pluie", "Pluie annoncée", Math.round(wx.precipMm) + "mm", "Surface glissante : évite piste peinte et racines, rallonge l'échauffement, foulée prudente");
  }
  const verdict                   = { level, drivers };

  if (!found) {
    D("ADAPT-jour", "Jour hors plan", date, "Aucune séance planifiée à cette date : rien à adapter");
    return { date, action: "keep", verdict, originalMinutes: 0, adjustedMinutes: 0, decisions };
  }
  const { day, week } = found;
  const originalMinutes = dayMinutes(day);
  const intensity = day.sessions.map(sessionIntensity).reduce                ((a, b) => {
    const order                   = ["repos", "facile", "moderee", "difficile"];
    return order.indexOf(b) > order.indexOf(a) ? b : a;
  }, "repos");
  const inTaper = week.phase.id === "taper";

  let action               = "keep";
  if (intensity === "repos") {
    D("ADAPT-repos", "Jour de repos", "inchangé", "Jour de repos planifié — parfait quel que soit l'état de forme");
  } else if (level === "verte") {
    D("ADAPT-verte", "Readiness verte", "séance maintenue", drivers.join(" · ") + " — la qualité prévue est gardée telle quelle");
  } else if (level === "orange") {
    action = "reduce";
    reduceDay(day, 0.7, refs, reasoned.hz, reasoned.baseRefs);
    D("ADAPT-orange", "Readiness orange", "corps de séance ×0.7", drivers.join(" · ") + " — la structure est conservée, le volume baisse");
  } else {
    // rouge
    if (inTaper) {
      action = "off";
      day.charge = "off";
      day.sessions = [{ d: "rs", name: "OFF (readiness)", det: "repos — 💡 " + drivers.join(" · ") + ". En affûtage, la fraîcheur prime sur tout : repos complet.", steps: [] }];
      D("ADAPT-rouge-taper", "Rouge en affûtage", "OFF", "À quelques jours de la course, on ne force jamais sur un signal rouge");
    } else if (intensity === "difficile" || intensity === "moderee") {
      action = "replace";
      const main = day.sessions.find((s) => s.d !== "rs") ;
      const why = drivers.join(" · ") + " — la séance de qualité est remplacée par de l'endurance : l'intensité un jour rouge coûte plus qu'elle ne rapporte.";
      const replacementMin = Math.max(25, Math.round(originalMinutes * 0.5));
      day.sessions = [enduranceReplacement(main.d, replacementMin, refs, reasoned.hz, reasoned.baseRefs, why)];
      day.charge = "facile";
      D("ADAPT-rouge", "Readiness rouge", "qualité → endurance (" + replacementMin + "min)", why);
    } else {
      action = "rest";
      const deepRed = (snapshot.energy != null && snapshot.energy < 20) || (snapshot.sleepQuality === "mauvais" && snapshot.hrvStatus === "basse");
      day.charge = deepRed ? "off" : "facile";
      day.sessions = deepRed
        ? [{ d: "rs", name: "OFF (readiness)", det: "repos total — 💡 " + drivers.join(" · ") + ". La récupération EST l'entraînement aujourd'hui.", steps: [] }]
        : [{ d: "rs", name: "Repos actif", det: "20-30min marche ou mobilité douce — 💡 " + drivers.join(" · ") + ". On bouge sans charger.", steps: [] }];
      D("ADAPT-rouge-facile", "Readiness rouge", deepRed ? "OFF" : "repos actif", "Même un jour facile se transforme en récupération quand les signaux sont rouges");
    }
  }

  return { date, action, verdict, originalMinutes, adjustedMinutes: dayMinutes(day), decisions };
}

// ===== src/nutrition/nutritionCalculator.ts =====
/**
 * nutritionCalculator — ravitaillement d'effort (ROADMAP « Nutrition », périmètre prudent).
 *
 * PÉRIMÈTRE VOLONTAIREMENT LIMITÉ (frontière du conseil diététique, note.md priorité n°1) :
 * le module couvre UNIQUEMENT le ravitaillement lié à la séance — glucides pendant l'effort,
 * hydratation selon durée/température, collation de récupération, dépense estimée.
 * Il ne prescrit JAMAIS d'apport calorique journalier, de macros de régime, ni de
 * restriction/déficit : cette partie reste bloquée tant qu'un(e) nutritionniste n'a pas
 * validé l'approche (RESTE-A-FAIRE « À TOI »). Chaque conseil sort avec l'avertissement
 * DISCLAIMER — l'UI doit l'afficher, la démo CI (demo:nutrition) le vérifie.
 *
 * Sources des repères (consensus publiés, pas d'invention maison) :
 * - Glucides/heure par durée d'effort : position ACSM/AND/DC 2016 & Jeukendrup 2014
 *   (<~1h : rien de nécessaire ; 1–2h : 30–60 g/h ; >2h : 60–90 g/h, mix glucose:fructose
 *   au-delà de 60 g/h, tube digestif à entraîner progressivement).
 * - Hydratation : boire à la soif, ~400–800 ml/h ; chaleur → haut de fourchette + sodium
 *   (ACSM 2007 fluid replacement). Plafond dur 1000 ml/h (hyponatrémie).
 * - Récupération : fenêtre 30–60 min après séance dure ou longue, ~1–1.2 g/kg glucides
 *   + ~0.3 g/kg protéines (ISSN 2017, nutrient timing).
 * Chaque règle porte un identifiant N1…N7 (même format {id, what, val, why} que le reste
 * du moteur), registre dans ARCHITECTURE.md.
 */

/** Avertissement obligatoire — l'UI l'affiche tel quel, la démo CI le vérifie. */
const DISCLAIMER =
  "Repères généraux issus des consensus de nutrition sportive (ACSM/ISSN) — " +
  "à adapter à ta tolérance. Ne remplace pas l'avis d'un professionnel de santé " +
  "ou d'un(e) nutritionniste, en particulier en cas de pathologie ou de trouble alimentaire.";

/** Mots interdits en sortie (le module ne conseille JAMAIS de restriction) — testé en CI. */
const FORBIDDEN_OUTPUT = ["déficit", "perte de poids", "maigrir", "restriction", "brûler des graisses"];

/** N7 — dépense estimée : MET moyens publiés (compendium Ainsworth) par sport × intensité.
 *  Fourchette [min, max] de MET ; sans poids connu on élargit avec un gabarit 60–80 kg. */
const METS                                                            = {
  rn: { facile: [8, 10], moyenne: [10, 12], dure: [11.5, 14] },
  bk: { facile: [6, 8], moyenne: [8, 10], dure: [10, 13] },
  sw: { facile: [6, 8], moyenne: [8, 9.8], dure: [9.8, 11] },
  br: { facile: [7, 9], moyenne: [9, 11], dure: [10.5, 13] },
};

const r5 = (v        )         => Math.round(v / 5) * 5;
const r50 = (v        )         => Math.max(50, Math.round(v / 50) * 50);

/** Classement d'intensité d'une séance générée — réutilise intensitySplit (SEUL
 *  classificateur d'intensité du moteur, dashboard 80/20) : pas de deuxième chemin. */
function classifyIntensity(s            )                  {
  const sp = intensitySplit(s);
  if (sp.hardMin >= 8) return "dure";
  if (sp.modMin >= 10) return "moyenne";
  return "facile";
}

/** Conseil de ravitaillement d'une séance. Bornes dures : glucides ≤90 g/h, boisson ≤1000 ml/h. */
function sessionNutrition(input                )                  {
  const D                      = [];
  const min = Math.max(0, Math.round(input.minutes || 0));
  const hot = input.tempC != null && input.tempC >= 25;
  const veryHot = input.tempC != null && input.tempC >= 28;
  const hard = input.intensity === "dure";
  const longish = !!input.long || min > 90;

  // — N1/N2/N3 : glucides pendant l'effort, par durée (et intensité pour la zone grise)
  let carbs                          = null;
  let carbsTxt        ;
  if (min < 60 || (min < 75 && !hard)) {
    carbs = null;
    carbsTxt = hard
      ? "Pas besoin de glucides sur une séance aussi courte — un simple rinçage de bouche glucidique peut aider sur le très intense."
      : "De l'eau suffit — pas besoin de glucides sur une sortie courte et facile.";
    D.push({ id: "N1", what: "Glucides pendant l'effort", val: "aucun nécessaire", why: "séance courte (<1 h" + (hard ? "" : "15 à intensité facile") + ") : les réserves de glycogène suffisent largement (ACSM 2016)" });
  } else if (min <= 150) {
    carbs = [30, 60];
    carbsTxt = "Vise 30–60 g de glucides par heure (boisson, gel ou solide au choix — ce que tu digères bien).";
    D.push({ id: "N2", what: "Glucides pendant l'effort", val: "30–60 g/h", why: (hard && min < 75 ? "séance courte mais intense" : "effort de 1 h à 2 h 30") + " : un apport régulier maintient la qualité de fin de séance (Jeukendrup 2014)" });
  } else {
    carbs = [60, 90];
    carbsTxt = "Vise 60–90 g de glucides par heure — au-delà de 60 g/h, mélange glucose + fructose, et entraîne ton tube digestif à l'entraînement, jamais de nouveauté le jour J.";
    D.push({ id: "N3", what: "Glucides pendant l'effort", val: "60–90 g/h", why: "effort >2 h 30 : l'oxydation plafonne vers 60 g/h pour le glucose seul, le mix glucose:fructose repousse la limite (Jeukendrup 2014)" });
  }

  // — N4 : hydratation par durée + température (plafond dur 1000 ml/h, hyponatrémie)
  let drink                   = min < 60 ? [0, 500] : [400, 800];
  let sodium = false;
  if (hot) {
    drink = [Math.min(600, drink[0] + 200), Math.min(1000, drink[1] + 200)];
    sodium = min > 60;
  }
  if (veryHot) sodium = min > 45;
  const drinkTxt =
    (min < 60 ? "Bois à la soif (jusqu'à ~500 ml)" : "Bois régulièrement, " + drink[0] + "–" + drink[1] + " ml/h à la soif") +
    (sodium ? ", avec du sodium (boisson d'effort ou pastille, ~300–600 mg/L) vu la chaleur" : "") +
    (input.d === "sw" ? " — oui, même en natation : on ne sent pas la sueur dans l'eau" : "") +
    ". Jamais plus d'1 L/h.";
  D.push({ id: "N4", what: "Hydratation", val: drink[0] + "–" + drink[1] + " ml/h" + (sodium ? " + sodium" : ""), why: (hot ? "chaleur (" + Math.round(input.tempC          ) + "°C) : pertes sudorales accrues, le sodium évite l'hyponatrémie de dilution" : "boire à la soif couvre l'essentiel d'un effort tempéré") + " (ACSM 2007)" });

  // — N6 : jamais à jeun sur dur/long (sécurité — priorité n°1 du manifeste)
  const before = hard || longish
    ? "Ne pars pas à jeun : un vrai repas 2–3 h avant, ou une collation glucidique 30–60 min avant. Une séance " + (hard ? "intense" : "longue") + " à jeun dégrade la qualité et augmente le risque de malaise."
    : "Pars comme tu le sens — sur une séance courte et facile, à jeun ou non, les deux se défendent.";
  if (hard || longish) D.push({ id: "N6", what: "Avant la séance", val: "jamais à jeun", why: "séance " + (hard ? "intense" : "longue") + " : l'hypoglycémie d'effort est un risque évitable — la santé passe avant tout" });

  // — N5 : fenêtre de récupération après dur/long
  let after                = null;
  if (hard || longish) {
    const w = input.weightKg && input.weightKg > 0 ? input.weightKg : null;
    after = w
      ? "Dans les 30–60 min : ~" + r5(w * 1.0) + "–" + r5(w * 1.2) + " g de glucides + ~" + r5(w * 0.25) + "–" + r5(w * 0.35) + " g de protéines (pour " + Math.round(w) + " kg), puis un vrai repas."
      : "Dans les 30–60 min : une collation glucides + protéines (ex. banane + yaourt, riz + œufs), puis un vrai repas dans les 2 h.";
    D.push({ id: "N5", what: "Récupération", val: w ? "~1–1.2 g/kg glucides + ~0.3 g/kg protéines" : "collation glucides + protéines sous 60 min", why: "après une séance " + (hard ? "intense" : "longue") + ", la fenêtre 30–60 min accélère la resynthèse de glycogène et la réparation musculaire (ISSN 2017)" });
  }

  // — N7 : dépense estimée (information, jamais une cible d'apport ni de déficit)
  const mets = METS[input.d] || METS.rn;
  const [m1, m2] = mets[input.intensity] || mets.facile;
  const [w1, w2] = input.weightKg && input.weightKg > 0 ? [input.weightKg, input.weightKg] : [60, 80];
  const kcal                   = [r50((m1 * w1 * min) / 60), r50((m2 * w2 * min) / 60)];
  D.push({ id: "N7", what: "Dépense estimée", val: "~" + kcal[0] + "–" + kcal[1] + " kcal", why: "MET publiés (compendium Ainsworth) × " + (input.weightKg ? "ton poids" : "gabarit 60–80 kg") + " × durée — une estimation pour comprendre, pas une cible à compenser ni à creuser" });

  return {
    before,
    during: { carbsGPerH: carbs, drinkMlPerH: drink, sodium, text: carbsTxt + " " + drinkTxt },
    after,
    kcal,
    decisions: D,
    disclaimer: DISCLAIMER,
  };
}

/** Point d'entrée UI : conseil pour une séance générée (V1Session-compatible).
 *  Retourne null pour le repos/renfo (rs) — pas de ravitaillement d'effort à conseiller. */
function nutritionForSession(
  s                                 ,
  opts                                                      ,
)                         {
  if (!s || s.d === "rs") return null;
  return sessionNutrition({
    d: s.d,
    minutes: Math.round(s.min || 0),
    intensity: classifyIntensity(s),
    long: !!s.long,
    tempC: opts?.tempC ?? null,
    weightKg: opts?.weightKg ?? null,
  });
}

// ===== src/nutrition/energyEstimator.ts =====
/**
 * energyEstimator — estimation de la dépense énergétique journalière + répartition
 * indicative des macros. Débloqué par DÉCISION UTILISATEUR (28/07/2026) : « une
 * estimation des calories dépensées de base + calories entraînement + macros, jamais
 * de conseil de nutrition à proprement parler ».
 *
 * FRONTIÈRE STRICTE (note.md priorité n°1, invariants testés par demo:nutrition) :
 * - Tout ce qui sort est une DÉPENSE estimée ou une RÉPARTITION OBSERVÉE dans les
 *   consensus — jamais une cible d'apport, jamais un « mange X », jamais un déficit.
 * - Les mots interdits (FORBIDDEN_OUTPUT) restent bannis de toute sortie.
 * - L'avertissement (ENERGY_DISCLAIMER) est obligatoire et plus explicite encore que
 *   celui du ravitaillement : estimation ≠ prescription, voir un(e) diététicien(ne)
 *   pour des cibles d'apport.
 *
 * Sources (consensus publiés, pas d'invention maison) :
 * - N8 métabolisme de base : équation de Mifflin-St Jeor (1990), la mieux validée en
 *   population générale (ADA 2005). Taille absente → enveloppe sur gabarits publiés.
 * - N9 dépense journalière : BMR × NAP hors entraînement 1.35–1.55 (vie quotidienne
 *   assise à modérément active, FAO/WHO/UNU 2001) + dépense d'entraînement (N7, MET).
 * - N10 macros indicatives : protéines 1.2–1.7 g/kg/j (ACSM/AND/DC 2016, endurance),
 *   lipides 20–35 % de l'énergie (AMDR), glucides selon le volume d'entraînement
 *   quotidien (Burke 2011 : ~1 h/j → 5–7 g/kg ; léger → 3–5 ; lourd → 6–10).
 */

/** Avertissement spécifique aux estimations journalières — l'UI l'affiche tel quel. */
const ENERGY_DISCLAIMER =
  "Ces chiffres sont une ESTIMATION de ta dépense, pas une consigne d'apport : " +
  "aucun objectif calorique, aucun régime. La répartition des macros est une photographie " +
  "des consensus de nutrition sportive, pas un menu. Pour des cibles d'apport personnalisées, " +
  "vois un(e) diététicien(ne)-nutritionniste. " + DISCLAIMER;

const eRound10 = (v        )         => Math.round(v / 10) * 10;
const eRound5 = (v        )         => Math.round(v / 5) * 5;

/** N8 — métabolisme de base (Mifflin-St Jeor), en enveloppe [min, max] honnête :
 *  chaque donnée manquante élargit la fourchette au lieu d'inventer une précision. */
function basalRange(weightKg        , heightCm                , age                , sex                )                                                  {
  const heights = heightCm && heightCm >= 120 && heightCm <= 220 ? [heightCm, heightCm] : sex === "F" ? [158, 172] : sex === "H" ? [170, 185] : [158, 185];
  const ages = age && age >= 14 && age <= 90 ? [age, age] : [25, 55];
  const sexes = sex === "H" ? [5] : sex === "F" ? [-161] : [-161, 5];
  let lo = Infinity, hi = -Infinity;
  for (const h of heights) for (const a of ages) for (const s of sexes) {
    const v = 10 * weightKg + 6.25 * h - 5 * a + s;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  // Mifflin-St Jeor a ~±10 % d'erreur individuelle même complet — on l'affiche.
  const approximate = heights[0] !== heights[1] || ages[0] !== ages[1] || sexes.length > 1;
  return { bmr: [eRound10(Math.max(800, lo * 0.95)), eRound10(hi * 1.05)], approximate };
}

/** Estimation journalière complète. Retourne null sans poids valide — on n'estime
 *  jamais sur du vide, et l'UI renvoie vers le Profil. */
function dailyEnergy(input             )                             {
  const w = input.weightKg;
  if (!w || !(w > 25) || !(w < 300)) return null;
  const D                      = [];
  const { bmr, approximate } = basalRange(w, input.heightCm, input.age, input.sex);
  D.push({ id: "N8", what: "Métabolisme de base", val: bmr[0] + "–" + bmr[1] + " kcal/j", why: "équation de Mifflin-St Jeor (la mieux validée, ADA 2005)" + (approximate ? " — fourchette élargie car taille/âge/sexe incomplets au Profil" : " avec tes données du Profil") + " ; ce que ton corps dépense au repos complet" });

  // N9 — vie quotidienne hors entraînement : NAP 1.35–1.55 (assis à modérément actif).
  const daily                   = [eRound10(bmr[0] * 1.35), eRound10(bmr[1] * 1.55)];
  const training                   = input.trainingKcal && input.trainingKcal[1] > 0 ? [eRound10(input.trainingKcal[0]), eRound10(input.trainingKcal[1])] : [0, 0];
  const total                   = [daily[0] + training[0], daily[1] + training[1]];
  D.push({ id: "N9", what: "Dépense du jour (estimée)", val: total[0] + "–" + total[1] + " kcal", why: "base × 1.35–1.55 (vie quotidienne hors sport, FAO/WHO 2001) + " + (training[1] ? "l'entraînement du jour (~" + training[0] + "–" + training[1] + " kcal, MET publiés)" : "aucun entraînement prévu aujourd'hui") + " — une information pour comprendre, jamais une cible à atteindre ni à creuser" });

  // N10 — macros indicatives : une RÉPARTITION observée dans les consensus, pas un menu.
  const tMin = Math.max(0, input.trainingMin || 0);
  const carbsPerKg                   = tMin >= 90 ? [6, 10] : tMin >= 45 ? [5, 7] : [3, 5];
  const proteinG                   = [eRound5(1.2 * w), eRound5(1.7 * w)];
  const fatG                   = [eRound5((total[0] * 0.2) / 9), eRound5((total[1] * 0.35) / 9)];
  const carbsG                   = [eRound5(carbsPerKg[0] * w), eRound5(carbsPerKg[1] * w)];
  const macroText =
    "À titre indicatif, les consensus de nutrition sportive observent chez les sportifs d'endurance : " +
    "protéines ~" + proteinG[0] + "–" + proteinG[1] + " g/j (1.2–1.7 g/kg), " +
    "lipides ~" + fatG[0] + "–" + fatG[1] + " g/j (20–35 % de l'énergie — jamais moins de 20 %), " +
    "glucides ~" + carbsG[0] + "–" + carbsG[1] + " g/j (" + carbsPerKg[0] + "–" + carbsPerKg[1] + " g/kg pour " + (tMin >= 90 ? "un gros jour d'entraînement" : tMin >= 45 ? "un jour d'entraînement modéré" : "un jour léger ou de repos") + ", Burke 2011). " +
    "C'est une photographie de la littérature, pas un menu ni une consigne.";
  D.push({ id: "N10", what: "Macros (répartition indicative)", val: "P " + proteinG[0] + "–" + proteinG[1] + " g · L " + fatG[0] + "–" + fatG[1] + " g · G " + carbsG[0] + "–" + carbsG[1] + " g", why: "protéines ACSM/AND/DC 2016, lipides AMDR (plancher 20 % — santé hormonale), glucides selon le volume du jour (Burke 2011)" });

  return { bmr, daily, training, total, macros: { proteinG, fatG, carbsG, text: macroText }, approximate, decisions: D, disclaimer: ENERGY_DISCLAIMER };
}

// ===== src/app/bridge.ts =====
/**
 * Pont UI ↔ moteur V2 — exposé au produit HTML sous `globalThis.EBV2` par le bundle
 * (`npm run build:app`). L'UI n'appelle QUE ces trois fonctions ; aucune logique métier
 * dans les composants (manifeste, §9 Architecture).
 */
                                                                         










function toProfile(sport        , answers            )                 {
  return { ...(answers          ), sport }                  ;
}

                             
                                                                               
                     
                    
                
                           
                                                                                                                              
 

/** Les ✓ de l'UI (S.answers.done = {"sem|jour|idx": true}) → séances réellement effectuées.
 *  Ferme la boucle prévu/réel : l'ajusteur recalcule la fatigue depuis ce qui a VRAIMENT
 *  été fait (même logique qu'un import Strava — les minutes viennent du plan coché). */
function completedFromDone(plan        , answers            , beforeDate        )                     {
  const done = (answers.done || {})                           ;
  const out                     = [];
  if (!Object.keys(done).length) return out;
  for (const w of plan.weeks)
    for (const d of w.days) {
      const dd = (d                     ).date;
      if (!dd || dd >= beforeDate) continue;
      d.sessions.forEach((s, si) => {
        if (s.d === "rs" || !done[w.num + "|" + d.jour + "|" + si]) return;
        out.push({ date: dd, d: s.d, minutes: Math.round(s.min || 0) });
      });
    }
  return out;
}

/** Génère le plan via le moteur V2 (raisonne → génère → audite → répare) — forme V1Plan. */
function buildPlanV2(sport        , answers            )                                {
  const res = generateAudited(toProfile(sport, answers));
  const plan = res.plan                                 ;
  // Répartition des intensités par semaine (dashboard « manifeste ~80/20 »)
  const refs = { cssSecPer100m: 130, thrPaceSecPerKm: 330 };
  let cE = 0, cM = 0, cH = 0;
  const weekly = plan.weeks.map((w) => {
    let e = 0, m = 0, h = 0;
    for (const d of w.days)
      for (const s of d.sessions) {
        const sp = intensitySplit(s, refs);
        e += sp.easyMin; m += sp.modMin; h += sp.hardMin;
      }
    if (!w.isRecup && w.phase.id !== "taper") { cE += e; cM += m; cH += h; }
    return { num: w.num, e: Math.round(e), m: Math.round(m), h: Math.round(h) };
  });
  const tot = Math.max(1, cE + cM + cH);
  plan._v2 = {
    decisions: res.decisions,
    warnings: res.warnings,
    repairs: res.repairs,
    score: res.audit.score,
    hardViolations: res.audit.hardViolations,
    intensity: { easyPct: Math.round((cE / tot) * 100), modPct: Math.round((cM / tot) * 100), hardPct: Math.round((cH / tot) * 100), weekly },
  };
  return plan;
}

                                  
                            
                                                                         
                      
 

/** Adapte la journée `snapshot.date` à l'état de forme — « recalcul du matin ». */
function adjustTodayV2(sport        , answers            , snapshot                   )                  {
  const { plan, reasoned } = generatePlan(toProfile(sport, answers));
  // R10 — les échanges de jours ⇄ de l'utilisateur (answers.daySwaps) s'appliquent AUSSI
  // ici : sans ça, la « séance du jour » montrait la séance d'AVANT échange pendant que
  // la grille montrait celle d'après (désalignement jour réel / jour du plan).
  const swaps = (answers.daySwaps                                          ) || [];
  for (const [wn, jA, jB] of swaps) {
    const w = plan.weeks.find((x) => x.num === wn);
    if (!w) continue;
    const da = w.days.find((d) => d.jour === jA), db = w.days.find((d) => d.jour === jB);
    if (!da || !db) continue;
    const t = da.sessions; da.sessions = db.sessions; db.sessions = t;
  }
  // R4.5/R4.7 — le drapeau douleur et le RPE de la dernière séance validée entrent
  // AUTOMATIQUEMENT dans la photo du jour (aucun appelant ne peut les oublier) :
  // douleur active → rouge forcé ; RPE ≥8 hier → signal de fatigue annoncé.
  const pf = answers.painFlag                                                       ;
  if (snapshot.painFlag == null && pf && pf.active) snapshot = { ...snapshot, painFlag: true, painLocation: pf.location };
  if (snapshot.lastRpe == null && answers.completions) {
    const comps = Object.values(answers.completions                                                   )
      .filter((c) => c && c.date && c.date < snapshot.date && c.rpe != null)
      .sort((x, y) => String(y.date).localeCompare(String(x.date)));
    if (comps.length) snapshot = { ...snapshot, lastRpe: comps[0].rpe };
  }
  // Boucle prévu/réel : les séances cochées dans l'UI nourrissent le calcul de fatigue,
  // complétées par les séances importées d'un fichier FIT (answers.fitSessions) —
  // même contrat CompletedSession ; dédoublonnage date+sport (une séance cochée ET
  // importée ne compte qu'une fois, on garde la version cochée du plan).
  if (!snapshot.completed) {
    const completed = completedFromDone(plan, answers, snapshot.date);
    const fit = (answers.fitSessions || [])                      ;
    for (const f of fit) {
      if (!f || !f.date || f.date >= snapshot.date || !f.minutes) continue;
      if (!completed.some((c) => c.date === f.date && c.d === f.d)) completed.push(f);
    }
    if (completed.length) snapshot = { ...snapshot, completed };
  }
  const adjustment = adjustDay(reasoned, plan, snapshot.date, snapshot);
  let sessions                              = [];
  let jour                = null;
  for (const w of plan.weeks)
    for (const d of w.days)
      if ((d                     ).date === snapshot.date) {
        sessions = d.sessions.map((s) => ({ name: s.name, det: s.det || "", d: s.d, steps: s.steps }));
        jour = d.jour;
      }
  return { adjustment, sessions, jour };
}

/** Régularité & avancement — gamification au service de la priorité n°3 du manifeste.
 *  Streak = semaines TERMINÉES consécutives avec ≥80% des séances faites (une séance
 *  loupée est pardonnée — la régularité n'est pas la perfection). Avancement = part de
 *  la CHARGE du plan accomplie (minutes cochées / minutes totales), pas un compte de séances. */
                                 
                   
                  
                  
                  
                     
                      
                                                                                                                            
 
function progressV2(plan        , answers            , todayISO        )                 {
  const done = (answers.done || {})                           ;
  let totalMin = 0, doneMin = 0;
  const weekly = plan.weeks.map((w) => {
    let t = 0, dn = 0, complete = true, wDone = 0, wTotal = 0;
    for (const d of w.days) {
      const dd = (d                     ).date || "";
      if (!dd || dd >= todayISO) complete = false;
      d.sessions.forEach((s, si) => {
        if (s.d === "rs") return;
        t++;
        totalMin += s.min || 0;
        wTotal += s.min || 0;
        if (done[w.num + "|" + d.jour + "|" + si]) {
          dn++;
          doneMin += s.min || 0;
          wDone += s.min || 0;
        }
      });
    }
    return { num: w.num, done: dn, total: t, ok: t > 0 && dn / t >= 0.8, complete, minDone: Math.round(wDone), minTotal: Math.round(wTotal) };
  });
  const completeWeeks = weekly.filter((w) => w.complete);
  let streakWeeks = 0;
  for (let i = completeWeeks.length - 1; i >= 0; i--) {
    if (completeWeeks[i].ok) streakWeeks++;
    else break;
  }
  return {
    totalMin: Math.round(totalMin),
    doneMin: Math.round(doneMin),
    pctLoad: totalMin > 0 ? Math.round((doneMin / totalMin) * 100) : 0,
    weekNow: Math.min(plan.totalWeeks, completeWeeks.length + 1),
    totalWeeks: plan.totalWeeks,
    streakWeeks,
    weekly,
  };
}

/** Badges — célébrations au service de la régularité (jamais de culpabilisation :
 *  un badge se gagne, il ne se perd pas ; aucun badge « raté » n'est affiché). */
                                                                               
function badgesV2(plan        , answers            , todayISO        )          {
  const pg = progressV2(plan, answers, todayISO);
  const out          = [];
  const cw = pg.weekly.filter((w) => w.complete);
  if (cw.some((w) => w.ok)) out.push({ id: "premiere", icon: "🏁", label: "Première semaine régulière", why: "≥80% des séances faites sur une semaine complète" });
  if (pg.streakWeeks >= 3) out.push({ id: "streak3", icon: "🔥", label: pg.streakWeeks + " semaines d'affilée", why: "La régularité est ta priorité n°3 — c'est elle qui fait progresser" });
  if (pg.streakWeeks >= 6) out.push({ id: "streak6", icon: "🏆", label: "6+ semaines : métronome", why: "La constance sur la durée, la marque des athlètes qui arrivent au départ en forme" });
  const base = plan.phases?.find((p) => p.id === "base");
  if (base && base.weeks > 0 && cw.filter((w) => w.num <= base.end).length >= base.weeks && cw.filter((w) => w.num <= base.end).every((w) => w.ok))
    out.push({ id: "bloc-base", icon: "🧱", label: "Bloc de base terminé", why: "Les fondations aérobies sont posées — tout le reste s'appuie dessus" });
  if (pg.pctLoad >= 50) out.push({ id: "mi-parcours", icon: "⛰", label: "Mi-parcours de charge", why: "Plus de la moitié de la charge du plan est derrière toi" });
  if (cw.length >= 2) {
    const last = cw[cw.length - 1];
    if (last.minDone > 0 && last.minDone > Math.max(...cw.slice(0, -1).map((w) => w.minDone))) out.push({ id: "record", icon: "📈", label: "Record de volume", why: "Ta plus grosse semaine réellement faite — construit, pas subie" });
  }
  for (const [i, w] of plan.weeks.entries()) {
    if (w.isRecup && pg.weekly[i]?.complete && pg.weekly[i]?.ok) {
      out.push({ id: "recup", icon: "😴", label: "Récup respectée", why: "La récupération EST un entraînement — la faire en entier demande plus de discipline que forcer" });
      break;
    }
  }
  return out;
}

/** R4.2 — Streak d'adhérence par JOUR (spec rétention). L'unité est le jour global
 *  complété : TOUTES les séances planifiées du jour validées — Y COMPRIS le repos
 *  (« récupération respectée ✓ », qui compte STRICTEMENT autant qu'un jour de séance).
 *  GEL (jamais de perte) : douleur signalée ou maladie déclarée — ces jours ne comptent
 *  ni ne cassent. Déborder du plan ne rapporte RIEN (seules les séances planifiées
 *  comptent — il n'existe aucun chemin de gratification pour du volume hors plan). */
                            
               
                         
                       
 
function adherenceV2(plan        , answers            , todayISO        )            {
  const done = (answers.done || {})                           ;
  const sick = (answers.sickDates || [])            ;
  const pf = answers.painFlag                                                    ;
  const frozen = (date        ) => sick.includes(date) || !!(pf && pf.active && pf.since && date >= pf.since);
  const days                                        = [];
  for (const w of plan.weeks)
    for (const d of w.days) {
      const dd = (d                     ).date;
      if (!dd || dd > todayISO) continue;
      const complete = d.sessions.every((s, si) => done[w.num + "|" + d.jour + "|" + si]);
      days.push({ date: dd, complete });
    }
  days.sort((a, b) => a.date.localeCompare(b.date));
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    if (d.complete) streak++;
    else if (frozen(d.date) || d.date === todayISO) continue; // gel, ou journée pas finie
    else break;
  }
  const today = days.find((d) => d.date === todayISO);
  return { days: streak, todayComplete: !!(today && today.complete), frozenToday: frozen(todayISO) };
}

/** Avatar évolutif — gamification (onglet 🎮 Suivi). MÊME philosophie que les badges :
 *  l'XP est CUMULATIF et ne redescend jamais (une semaine ratée n'efface rien), calculé
 *  depuis les métriques déjà existantes (progressV2/badgesV2) — aucune nouvelle collecte,
 *  aucun jugement de valeur ajouté au-delà de ce que le manifeste autorise (priorité n°3 :
 *  régularité, jamais performance pure). Ne redescend jamais — mêmes garde-fous. */
                              
                
               
               
             
                    
                   
                      
                          
                          
                            
                                                                                      
 
// R9 — 16 niveaux (mix « l'athlète s'équipe » + « le décor évolue », choix utilisateur).
// Seuils NON linéaires : les premiers paliers tombent en 1-3 séances (engouement), les
// derniers se méritent sur des mois. Chaque niveau change UN paramètre visuel (`unlock`,
// rendu par avatar.js) — équipement de l'athlète en alternance avec le décor.
const AVATAR_LEVELS                                                               = [
  { name: "Départ", icon: "🥚", xp: 0, unlock: "la silhouette, prête à éclore" },
  { name: "Premières foulées", icon: "👟", xp: 10, unlock: "chaussures à ta couleur" },
  { name: "Sentier du parc", icon: "🌳", xp: 25, unlock: "décor : le parc" },
  { name: "Bandana", icon: "🎽", xp: 50, unlock: "bandana noué" },
  { name: "La piste", icon: "🛤", xp: 90, unlock: "décor : la piste" },
  { name: "Première aura", icon: "✨", xp: 150, unlock: "aura d'entraînement" },
  { name: "Lunettes de sport", icon: "🕶", xp: 230, unlock: "lunettes de sport" },
  { name: "Le stade", icon: "🏟", xp: 340, unlock: "décor : le stade et ses gradins" },
  { name: "Maillot de course", icon: "👕", xp: 480, unlock: "maillot bicolore" },
  { name: "Dossard", icon: "🔖", xp: 660, unlock: "dossard à ton niveau" },
  { name: "Sous les projecteurs", icon: "🌃", xp: 900, unlock: "décor : la nocturne aux projecteurs" },
  { name: "Pleine vitesse", icon: "💨", xp: 1200, unlock: "aura pleine + traînée de vitesse" },
  { name: "Étoiles", icon: "⭐", xp: 1600, unlock: "étoiles autour de toi" },
  { name: "Médaille", icon: "🥇", xp: 2100, unlock: "médaille au cou" },
  { name: "Arche d'arrivée", icon: "🏁", xp: 2700, unlock: "décor : l'arche d'arrivée" },
  { name: "Légende", icon: "🏆", xp: 3500, unlock: "couronne de laurier + piédestal doré" },
];
function avatarV2(plan        , answers            , todayISO        )              {
  const pg = progressV2(plan, answers, todayISO);
  const badges = badgesV2(plan, answers, todayISO);
  const regularWeeks = pg.weekly.filter((w) => w.complete && w.ok).length;
  // R9 — XP 100% régularité, avec récompense IMMÉDIATE : +10 par jour validé (repos
  // respecté compris — le repos est une séance), +80 par badge, +120 par semaine
  // régulière. Jamais un chiffre de performance brute (chrono/FTP), jamais de volume
  // hors plan (seules les cases ✓ du plan comptent).
  const doneRec = (answers.done                           ) || {};
  let doneDays = 0; // seules les coches correspondant à une VRAIE séance du plan comptent
  for (const w of plan.weeks) for (const d of w.days) d.sessions.forEach((s, si) => { if (doneRec[w.num + "|" + d.jour + "|" + si]) doneDays++; });
  const xp = doneDays * 10 + badges.length * 80 + regularWeeks * 120;
  let idx = 0;
  for (let i = 0; i < AVATAR_LEVELS.length; i++) if (xp >= AVATAR_LEVELS[i].xp) idx = i;
  const cur = AVATAR_LEVELS[idx], next = AVATAR_LEVELS[idx + 1];
  const xpInLevel = xp - cur.xp;
  const xpToNext = next ? next.xp - cur.xp : 0;
  return {
    level: idx + 1, name: cur.name, icon: cur.icon, xp, xpInLevel, xpToNext,
    progressPct: next ? Math.max(0, Math.min(100, Math.round((xpInLevel / xpToNext) * 100))) : 100,
    // Teaser du niveau suivant (UI Profil) : ce que le prochain palier DÉBLOQUE.
    nextName: next ? next.name : null, nextIcon: next ? next.icon : null,
    nextUnlock: next ? next.unlock : null,
    levels: AVATAR_LEVELS.map((l, i) => ({ level: i + 1, name: l.name, icon: l.icon, xp: l.xp, unlock: l.unlock })),
  };
}

/** Prédiction de course — refs athlète + fiabilité issue du suivi réel (streak/charge). */
function predictV2(sport        , answers            , plan                                )             {
  const { reasoned, plan: p } = plan ? { reasoned: null, plan } : generatePlan(toProfile(sport, answers));
  const refs = reasoned
    ? reasoned.baseRefs
    : { ftp: parseInt(String(answers.ftp || "")) || 0, thrPace: 0, css: 0 };
  // Sans reasoned (plan fourni par l'UI), reconstruire les refs depuis les réponses
  const parse = (v         ) => { const m = String(v || "").trim().split(/[:h.]/); return m.length === 2 ? parseInt(m[0]) * 60 + parseInt(m[1]) : 0; };
  const finalRefs = reasoned ? refs : {
    ftp: answers.ftp_known === "oui" ? parseInt(String(answers.ftp || "")) || 0 : 0,
    thrPace: answers.pace_known === "oui" ? parse(answers.pace) : 0,
    css: answers.css_known === "oui" ? parse(answers.css) : 0,
  };
  const today = localTodayISO();
  const pg = progressV2(p, answers, today);
  return predictRace(sport, String(answers.format || ""), String(answers.intent || "") || undefined, finalRefs, {
    pctLoad: pg.pctLoad,
    streakWeeks: pg.streakWeeks,
    courseProfile: String(answers.course_profile || "") || undefined, // R6 — profil du parcours (Profil)
  });
}

/** Estimation énergétique du jour (décision utilisateur 28/07/2026 — estimation, jamais
 *  de conseil d'apport). Somme les dépenses N7 des séances du jour puis délègue à
 *  l'estimateur ; null sans poids au Profil (l'UI renvoie vers le Profil). */
function dailyEnergyV2(answers            , sessions                                                       )                             {
  const w = parseFloat(String(answers.weight || ""));
  if (!(w > 0)) return null;
  let kcal                   = [0, 0];
  let tMin = 0;
  for (const s of sessions || []) {
    if (!s || s.d === "rs") continue;
    const a = nutritionForSession(s         , { weightKg: w });
    if (a) { kcal = [kcal[0] + a.kcal[0], kcal[1] + a.kcal[1]]; tMin += Math.round(s.min || 0); }
  }
  return dailyEnergy({
    weightKg: w,
    heightCm: parseFloat(String(answers.height || "")) || null,
    age: parseInt(String(answers.age || "")) || null,
    sex: typeof answers.sex === "string" ? answers.sex : null,
    trainingKcal: kcal,
    trainingMin: tMin,
  });
}

// R7 — date du jour en heure LOCALE de l'appareil (jamais toISOString/UTC : le plan
// vit dans le calendrier de l'athlète, pas celui de Greenwich).
function localTodayISO()         {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

;                                                                      
(globalThis                           ).EBV2 = {
  buildPlan: buildPlanV2,
  adjustToday: adjustTodayV2,
  assessReadiness,
  progress: progressV2,
  predict: predictV2,
  badges: badgesV2,
  avatar: avatarV2,
  adherence: adherenceV2,
  disciplines: DISCIPLINE_REGISTRY,
  importFit: importFitBytes,
  sessionNutrition: nutritionForSession,
  dailyEnergy: dailyEnergyV2,
  version: "v2-sprint9",
};

})();
