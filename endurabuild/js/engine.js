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
                               
                          
                        
                
                  
                                                  
                  
                                                                      
                       
                 
                     
                    
                                                                                           
                                                                          
                   
                    
                    
                
               
                     
                                                                                         
                                                  
                                                                                                               
                     
                                                                         
                 
                                                                                                           
                          
                                                                                                       
                     
                                                                                                
                                                   
                                                                                            
                                                                                         
                           
                                                          
                                                  
 

// ===== src/sports/registry.ts =====
/**
 * REGISTRE DE SPORTS (spec R10, phase 1) — un sport = un module, plus une branche de `if`.
 *
 * Pourquoi : `buildSessions()` faisait ~230 lignes de `if (sp === …)` pour 4 sports, et une
 * douzaine d'autres passes portaient leur propre test de sport en dur. Le trail (R7) avait déjà
 * pris la bonne sortie — un module à part — et ce précédent a révélé le vrai problème : à
 * chaque sport ajouté, il faut se SOUVENIR de tous les tests à étendre. On ne s'en souvient
 * pas. La preuve, mesurée avant ce chantier :
 *   - le plafond de jours d'impact ne s'appliquait pas au trail (D10-3) : périostite = 5 jours
 *     d'appui au lieu de 3 ;
 *   - la répartition d'intensité ne connaissait pas ses zones (D10-6) : 100 % « facile » ;
 *   - le générateur de repli ne le connaissait pas non plus (TypeError, phase 0).
 *
 * Le gain de ce registre n'est donc pas l'élégance : c'est qu'un garde-fou de SÉCURITÉ ne peut
 * plus manquer un sport par oubli. Chaque module DÉCLARE ce qui s'applique à lui (`guards`), et
 * un sport inconnu lève au lieu de produire un plan silencieux.
 */
                                                                                         

                                                                                         

/** Erreur porteuse — même contrat que l'UI (`EBGenerationError`) : on échoue en le DISANT. */
class UnknownSportError extends Error {
           code = "SPORT_INCONNU";
  constructor(sport        ) {
    super("Sport inconnu : " + sport + " — aucun module de sport ne le déclare");
    this.name = "UnknownSportError";
  }
}

/**
 * Garde-fous déclarés par sport. Un drapeau à `true` fait s'appliquer une passe ; l'absence de
 * drapeau est un choix EXPLICITE, pas un oubli. Toute passe gardée par un test de sport en dur
 * doit migrer ici — c'est la règle qui empêche la classe de bug D10-3 de revenir.
 */
                              
                                                                                            
                         
                                                                                    
                               
                                                                                           
                                
                                                                                                 
                                
                                                                                
                              
                                                                                      
                          
                                                                                
                           
 

/** Contrat d'un module de sport. `null` = « utiliser le générique ». */
                              
            
                                                                                             
                                     
                                                                                        
                                          
                                                                                               
                                                                                                                
                                                                                       
                                                  
                                                                            
                                              
                                                      
                        
                      
 

/**
 * Boîte à outils passée aux modules : tout ce que l'ancienne fonction monolithique avait dans
 * sa portée. Les modules la DÉSTRUCTURENT en une ligne, ce qui a permis de déplacer les corps
 * de séances sans en changer un caractère — condition de l'extraction mécanique (golden master).
 */
                             
                  
                    
             
                          
             
                
               
                                                                                              
                  
              
                    
                    
                   
               
                       
                           
                 
            
                            
                  
                                        
                                                                        
                                                                          
                                                                        
                                                                          
                                                                                                                            
                                                                                                                                                               
 

/**
 * Boîte à outils du PRÉDICTEUR — même principe que `SessionKit` : les fourchettes, le
 * formatage et le journal de décisions sont communs (les erreurs de méthode se paient
 * partout), la MÉTHODE est propre à chaque sport. Les modules poussent dans `items`,
 * `advice` et `decisions` ; ils ne retournent rien.
 */
                             
                 
                                                      
                                                       
                   
                                                                  
                                             
                                 
                                                                              
                                    
                                                     
                                                                        
                  
                                                                                  
             
                                                                                                    
                                                                                                
                                                                                       
                                       
    
 

const MODULES = new Map                     ();

/** Enregistrement d'un module — appelé une fois par sport, à l'import. */
function registerSport(mod             )       {
  MODULES.set(mod.id, mod);
}

/** Accès au module d'un sport. Lève sur un sport inconnu : jamais de plan par défaut. */
function sportModule(sport        )              {
  const mod = MODULES.get(sport);
  if (!mod) throw new UnknownSportError(sport);
  return mod;
}

function knownSports()           {
  return [...MODULES.keys()];
}

/** Un garde-fou s'applique-t-il à ce sport ? Une seule façon de poser la question. */
function guard(sport        , flag                   )          {
  return MODULES.get(sport)?.guards[flag] === true;
}

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
  // R10 phase 2 — duathlon. Les tables détaillées vivent dans `src/sports/duathlon/tables.ts`
  // (avec leur provenance) ; ces entrées les REFLÈTENT pour les lectures génériques.
  duathlon: { S: 8, M: 12, L: 16, PM: 24 },
  swimrun: { experience: 10, sprint: 12, series: 20, championship: 30 },
  trail: {}, // pas de format : T6_MIN_WEEKS décide par catégorie d'effort déduite
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
  // R10 phase 2 — duathlon : entre la course pure et le triathlon court (deux disciplines,
  // mais un impact course doublé — le plafond horaire n'est pas ce qui limite, c'est l'appui).
  duathlon: {
    reprise: { S: 5, M: 7, L: 9, PM: 12 },
    confirme: { S: 7, M: 9, L: 11, PM: 15 },
    ancien: { S: 8, M: 11, L: 13, PM: 18 },
  },
  // R10 phase 3 — swimrun : la structure de référence des coachs tient en 7-12 h/sem ; au-delà
  // ce n'est plus la condition qui limite mais la logistique (eau libre, binôme, matériel).
  swimrun: {
    reprise: { experience: 5, sprint: 6, series: 8, championship: 9 },
    confirme: { experience: 7, sprint: 8, series: 11, championship: 12 },
    ancien: { experience: 8, sprint: 10, series: 13, championship: 15 },
  },
  trail: {}, // TRAIL_HISTORY_CAPS décide par catégorie d'effort
};

/** Heures UTILES par format — au-delà, le volume ne sert plus l'objectif. */
const UTIL                                        = {
  run: { "5k": 6, "10k": 7, semi: 9, marathon: 12, trail: 14 },
  bike: { crit: 9, route: 13, cyclo: 15, clm: 11, gravel: 20 },
  swim: { sprint: 6, demifond: 8, fond: 10, ow: 12 },
  tri: { S: 8, M: 11, "70.3": 14, Full: 18 },
  duathlon: { S: 8, M: 10, L: 13, PM: 17 },
  swimrun: { experience: 8, sprint: 10, series: 13, championship: 16 },
  trail: {}, // TRAIL_UTIL décide par catégorie
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
/** D3 (audit v6) — seuil DUR de l'auditeur sur les minutes livrées. C22 (+10%) est la
 * règle du GÉNÉRATEUR V2 (cible calée sur le livré) ; la tolérance jusqu'à +25% absorbe
 * la dérive des planchers de séance du produit V1.5 GELÉ, audité par le même scorer.
 * Les trois sites (générateur, texte affiché, auditeur) référencent désormais des
 * constantes nommées — plus jamais un littéral en dur qui diverge en silence. */
const C22_AUDIT_HARD_JUMP = rule("C22-dur", "au-delà de +25% livré entre semaines de charge, violation dure quelle que soit la cause (V1.5 gelé compris)", 1.25);
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
/** D6 (audit v6) — le débutant a aussi un plancher : une séance piscine sous 600m ne vaut
 * pas le déplacement non plus. Fenêtre débutant résultante : [600m ; 850m] (C15). */
const C24B_MIN_SWIM_SESSION_BEGINNER_M = rule("C24b", "une séance piscine débutant <600m ne vaut pas le déplacement — C20 promet ~25min/séance, le contenu doit suivre", 600);

/** Brick tri : bornes par format ; ×0.8 pour l'historique « reprise » (C21). */
const CAP_BRICK_BIKE                         = { S: 90, M: 120, "70.3": 180, Full: 300, L: 150, PM: 300 };
const CAP_BRICK_RUN                         = { S: 20, M: 24, "70.3": 32, Full: 70, L: 30, PM: 70 };
/**
 * Bornes du leg VÉLO d'un brick, par format — « jamais dépassées, même de peu » (spec audit 2).
 * Source unique : l'auditeur les lit ici (il en gardait une copie), et `blockBounds` cale son
 * PLANCHER dessus. Sans ça le générateur peut produire ce que l'auditeur interdit — c'est
 * arrivé en R10 phase 2 : les bornes duathlon inventées passaient sous le plancher audité.
 * Les formats duathlon S et M partagent les bornes du triathlon S et M : le segment vélo est
 * le même (20 km, 40 km). L et PM sont propres au duathlon.
 */
const BRICK_BIKE_BOUNDS                                   = rule(
  "C21b",
  "un brick d'entraînement n'est ni une sortie longue déguisée ni un tour de pâté de maisons : ses bornes suivent le format de course",
  { S: [45, 90], M: [60, 120], "70.3": [90, 180], Full: [150, 300], L: [70, 150], PM: [150, 300] },
);

const C21_REPRISE_BRICK_FACTOR = rule("C21", "en reprise, le brick ne mange pas la semaine (61% du volume hebdo observé sans ce facteur)", 0.8);

/** Plafonds de séance longue / nage par format (R3.4b), et budget implicite du volume. */
const CAP_LONG                         = { "5k": 74, "10k": 90, semi: 130, marathon: 180, trail: 255, crit: 150, route: 180, clm: 165, cyclo: 240, gravel: 360 };
const CAP_SWIM                         = { sprint: 1400, demifond: 2000, fond: 3000, ow: 4500, S: 750, M: 1500, "70.3": 1900, Full: 3000 };
const AVG_SESSION_H                                 = { run: 1.15, bike: 1.3, tri: 1.2 };

/** C13 — l'échauffement chiffré ne dépasse jamais 25min ni le corps de séance. */
const C13_WARMUP_MAX_MIN = rule("C13", "échauffement ≤25min et ≤ corps de séance", 25);

/** E1/E2 (audit v6) — PARSEUR D'ALLURE UNIQUE. Il y en avait deux : un strict et ancré
 * (moteur, alimente les zones du plan) et un laxiste (bridge, alimente la prédiction) —
 * écrire « 4:50/km » donnait donc une prédiction juste et un plan en fréquence cardiaque,
 * sans que rien ne le signale. Et « 4'50 » était refusé par les deux… alors que c'est la
 * notation que l'app utilise elle-même pour AFFICHER les allures.
 * Tolérant en entrée (4:50 · 4'50 · 4′50 · 4.50 · 4h50 · 04:50 · « 4:50/km » · espaces),
 * strict en validation (secondes < 60, bornes de plausibilité). Renvoie 0 si invalide. */
function parsePaceSec(v         , kind                 = "run")         {
  const m = String(v ?? "").trim().match(/^(\d{1,2})\s*[:h.'′]\s*(\d{1,2})\s*(?:\/\s*(?:km|100\s*m))?$/);
  if (!m) return 0;
  const min = +m[1], sec = +m[2];
  if (sec > 59) return 0;
  const total = min * 60 + sec;
  // course : 2:00 → 20:00 par km · natation : 1:00 → 5:00 par 100m
  const [lo, hi] = kind === "swim" ? [60, 300] : [120, 1200];
  return total >= lo && total <= hi ? total : 0;
}

/** E3 (audit v6) — bornes de plausibilité physiologique : hors bornes, la valeur est
 * traitée comme NON RENSEIGNÉE (repli zones cardio/ressenti) + avertissement nommé —
 * jamais une zone négative ou absurde à l'écran (l'attribut HTML min n'est pas une validation). */
const PHYSIO_BOUNDS                                                             = rule(
  "E3",
  "une FTP de -100W ou de 9999W produit des zones absurdes affichées sans bruit : hors bornes = non renseigné + avertissement",
  {
    ftp: { min: 60, max: 600, unit: "W" },
    hrMax: { min: 120, max: 220, unit: "bpm" },
    hrRest: { min: 30, max: 100, unit: "bpm" },
    weight: { min: 35, max: 200, unit: "kg" },
    height: { min: 120, max: 230, unit: "cm" },
    age: { min: 14, max: 95, unit: "ans" },
  },
);
function boundedOrZero(key                                     , v        )         {
  const b = PHYSIO_BOUNDS[key];
  return Number.isFinite(v) && v >= b.min && v <= b.max ? v : 0;
}

/** R6.1 — contre-indications par localisation de douleur : une douleur de charge se
 * traite en RETIRANT la contrainte (changer de discipline), pas en la réduisant. */
                                                                  
const R6_PAIN_CONTRAINDICATION                             = rule(
  "R6.1",
  "une douleur de charge se traite en retirant la contrainte, pas en la réduisant : chaque localisation interdit la ou les disciplines qui la sollicitent",
  {
    tibia: { forbid: ["rn"], prefer: ["sw", "bk"] },
    genou: { forbid: ["rn", "bk"], prefer: ["sw"] },
    pied: { forbid: ["rn"], prefer: ["sw", "bk"] },
    hanche: { forbid: ["rn"], prefer: ["sw", "bk"] },
    course: { forbid: ["rn"], prefer: ["sw", "bk"] },
    epaule: { forbid: ["sw"], prefer: ["bk", "rn"] },
    dos: { forbid: ["bk"], prefer: ["sw"] },
    cou: { forbid: ["sw", "bk"], prefer: ["rn"] },
  },
);

/** R6.2 — une blessure déclarée réduit le plafond de volume (l'étape « Historique &
 * blessures » promet « une blessure décide quoi adapter » — le volume en fait partie). */
const R6_INJURY_LOAD_FACTORS = rule(
  "R6.2",
  "une blessure déclarée réduit le plafond de volume ; plusieurs zones fragiles → approche ultra-conservatrice (c'est la carte de règle affichée à l'athlète)",
  { une: 0.9, multiples: 0.8 },
);

/** R6.3 (audit v6, A7) — l'âge module la charge : l'avertissement affiché au Profil
 * (« en dessous de 18 ans, la charge doit être encadrée ») s'applique, pas seulement
 * s'affiche ; au-delà de 60 ans la récupération se rallonge. */
const R6_AGE_LOAD = rule(
  "R6.3",
  "l'avertissement mineur affiché au Profil doit agir sur le plan (volume -30%, zéro VO2max) ; master 60+ : volume -15% et récupération toutes les 3 semaines",
  {
    mineur: { maxAge: 17, volFactor: 0.7, allowVo2: false },
    master: { minAge: 60, volFactor: 0.85, recupEvery: 3 },
  },
);

/** Lecture UNIQUE des blessures (audit v6 B1a : le motif était dupliqué 4 fois avec des
 * ensembles légèrement différents — un booléen écrasait les localisations). */
                             
                 
                
                                                                                      
                  
                                                                  
                     
                    
                  
                    
 
function readInjuries(raw         )             {
  const list = (Array.isArray(raw) ? raw.join(",") : String(raw ?? ""))
    .split(",").map((s) => s.trim()).filter((x) => x && x !== "aucune");
  return {
    list,
    count: list.length,
    // R10 phase 2 — « course » (zone fragile déclarée en multi-discipline : tri, duathlon)
    // COMPTE comme une blessure d'impact. Elle ne l'était que dans `impactAny` (renfo/plio) :
    // le plafond de jours d'appui, qui lit `impact`, l'ignorait donc — un duathlète déclarant
    // « ça tire quand je cours » recevait autant d'appuis qu'un athlète sain.
    impact: list.some((x) => ["tibia", "genou", "pied", "hanche", "course"].includes(x)),
    impactAny: list.some((x) => ["tibia", "genou", "pied", "hanche", "course"].includes(x)),
    shoulder: list.includes("epaule"),
    lumbar: list.includes("dos"),
    cervical: list.includes("cou"),
  };
}

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

// ===== src/engine/trailModel.ts =====
/**
 * Modèle TRAIL (spec R7) — le trail est un SPORT, pas un format de course à pied.
 *
 * Pourquoi ce module existe : traité comme un format de `run`, le trail recevait une seule
 * durée de préparation, un seul plafond de sortie longue et un seul plafond horaire pour
 * tout — du 23 km/900 m au 100 miles/10 000 m. Le questionnaire ne demandait jamais le
 * dénivelé de la course visée, la seule donnée qui structure une préparation trail.
 *
 * Trois principes structurent tout ce fichier :
 *  - le volume se planifie en TEMPS **et** en D+ / D−, jamais en kilomètres ;
 *  - l'intensité dépend de la PENTE (rendu : renderer.ts, zones `tr.*`) ;
 *  - la DESCENTE est une charge à part entière — premier facteur de casse musculaire et
 *    de non-finish, donc progressée plus lentement que tout le reste.
 *
 * Périmètre assumé (décision produit) : le moteur va jusqu'à `ultra_long` (12-24 h). Au-delà,
 * la stratégie de course (sommeil fractionné, assistance, ravitaillement par base-vie) dépasse
 * ce qu'un plan automatique peut honnêtement produire — et l'outil le DIT au lieu de deviner.
 */
                                                 

                                                        
const TRAIL_PROVENANCE                = [];
function trule   (id        , why        , value   )    {
  TRAIL_PROVENANCE.push({ id, why });
  return value;
}

                                                                                          
const TRAIL_CATEGORIES                  = ["kv", "court", "long", "ultra", "ultra_long", "ultra_xl"];

/** T1 — plafond de D+ hebdomadaire (m/semaine, au pic) par catégorie × historique. */
const T1_DPLUS_CAPS                                                = trule(
  "T1",
  "le D+ est le second axe de charge du trail : le plafonner par catégorie et par historique évite qu'un plan de 8h/sem accumule un dénivelé d'ultra-traileur",
  {
    kv: { reprise: 1500, confirme: 2500, ancien: 3500 },
    court: { reprise: 1200, confirme: 2000, ancien: 2800 },
    long: { reprise: 1800, confirme: 3000, ancien: 4200 },
    ultra: { reprise: 2500, confirme: 4000, ancien: 5500 },
    ultra_long: { reprise: 3000, confirme: 5000, ancien: 7000 },
    ultra_xl: { reprise: 3500, confirme: 6000, ancien: 8500 },
  },
);

/** T2 / T2b — progressions hebdomadaires distinctes ; le NÉGATIF est le plus lent des trois axes. */
const T2_DPLUS_GROWTH = trule("T2", "le D+ monte plus vite que le temps mais reste lissé", 1.12);
const T2_DMOINS_GROWTH = trule(
  "T2b",
  "la charge excentrique est le premier facteur de casse musculaire en trail : les dommages culminent 24-48h après l'effort et la récupération complète demande 3 à 7 jours — sa progression est la plus lente",
  1.08,
);

/** T3 — récupération après forte descente (le registre le déclarait depuis R4, personne ne l'appliquait). */
const T3_ECCENTRIC_RECOVERY = trule(
  "T3",
  "aucune séance de qualité ni de descente dans les 48h suivant une sortie à fort D− : les dommages musculaires excentriques culminent à 24-48h",
  { thresholdDmoins: 1000, minGapDays: 2 },
);

/** T4 — la sortie longue plafonne en % du TEMPS DE COURSE estimé, pas en minutes absolues. */
const T4_LONG_RUN_VS_RACE                                = trule(
  "T4",
  "sur un ultra, reproduire la durée de course à l'entraînement est contre-productif : le plafond suit la catégorie d'effort",
  { kv: 1.5, court: 1.0, long: 0.85, ultra: 0.55, ultra_long: 0.4, ultra_xl: 0.3 },
);

/** T5 — part de marche rapide attendue en course : une compétence entraînable, pas un échec. */
const T5_HIKE_SHARE                                = trule(
  "T5",
  "au-delà de 1500m D+, la marche rapide représente une part majeure du temps de course : elle s'entraîne, avec ou sans bâtons",
  { kv: 0.5, court: 0.05, long: 0.15, ultra: 0.25, ultra_long: 0.35, ultra_xl: 0.4 },
);

/** T6 — durée de préparation minimale par catégorie (remplace `MIN_WEEKS.run.trail = 18` pour tous). */
const T6_MIN_WEEKS                                = trule(
  "T6",
  "un ultra ne se prépare pas dans le même horizon qu'un trail court",
  { kv: 10, court: 12, long: 16, ultra: 22, ultra_long: 28, ultra_xl: 34 },
);

/** T7 — répétitions nutrition/matériel en conditions réelles, au-delà de 6h d'effort. */
const T7_REHEARSAL = trule(
  "T7",
  "au-delà de 6h d'effort, la nutrition et le matériel sont des causes d'abandon aussi fréquentes que la condition physique : ils se répètent à l'entraînement",
  { minRaceHours: 6, sessionsInSpec: 3 },
);

/** Plafonds horaires du trail par catégorie × historique (h/sem au pic) — l'axe TEMPS. */
const TRAIL_HISTORY_CAPS                                                = {
  kv: { reprise: 6, confirme: 8, ancien: 10 },
  court: { reprise: 6, confirme: 8, ancien: 10 },
  long: { reprise: 8, confirme: 11, ancien: 13 },
  ultra: { reprise: 9, confirme: 13, ancien: 16 },
  ultra_long: { reprise: 10, confirme: 14, ancien: 18 },
  ultra_xl: { reprise: 11, confirme: 15, ancien: 20 },
};
/** Heures UTILES par catégorie — au-delà, le volume ne sert plus l'objectif. */
const TRAIL_UTIL                                = { kv: 9, court: 10, long: 13, ultra: 16, ultra_long: 19, ultra_xl: 22 };

/** Pénalité de technicité sur le temps estimé (spec §6.1). */
const TRAIL_TECHNICITY                                               = {
  roulant: { f: 1.0, label: "roulant" },
  mixte: { f: 1.08, label: "mixte" },
  technique: { f: 1.18, label: "technique" },
  alpin: { f: 1.3, label: "alpin" },
};

/** Ordres de grandeur de VAM seuil (m D+/h) — repli quand l'athlète ne la connaît pas. */
const VAM_BY_LEVEL                         = { debutant: 600, inter: 850, avance: 1200 };

/** Part de la vitesse seuil réellement tenable selon la durée d'effort : une allure seuil
 *  ne se tient pas 12 h. `flat` s'applique à la vitesse au sol, `vert` à la VAM.
 *  (Fractions de la référence seuil, pas des multiplicateurs de temps.) */
const ENDURANCE_KEEP                                                        = {
  kv: { flat: 0.98, vert: 0.98 },
  court: { flat: 0.92, vert: 0.9 },
  long: { flat: 0.86, vert: 0.85 },
  ultra: { flat: 0.82, vert: 0.82 },
  ultra_long: { flat: 0.78, vert: 0.8 },
  ultra_xl: { flat: 0.7, vert: 0.72 },
};

                                 
                     
                 
                  
                   
                          
                                                                                        
                             
                           
                    
                    
                     
                     
                
              
                    
                      
                         
                              
              
 

const num = (v         )         => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Catégorie d'effort DÉDUITE des données réelles de la course (jamais demandée à l'athlète)
 * + fourchette de temps estimé. Modèle en KM-EFFORT pondéré par la part verticale :
 *   v_km_effort = harmonique(vitesse plat tenable, VAM tenable) selon la part de vertical
 *   t = km-effort / v_km_effort × technicité × nuit
 * La catégorie dépend du temps et le temps dépend de la catégorie (dégradation d'endurance) :
 * quelques itérations convergent. Calibré sur des repères connus (56-101 km de montagne :
 * 8-9 km-effort/h pour un coureur intermédiaire, ~11-12 sur un format court roulant).
 * Un seuil sur la seule distance serait faux : 62 km à 3 200 m D+ et 62 km à plat ne sont
 * pas la même course.
 */
function trailObjective(a                )                 {
  const distanceKm = Math.max(1, num(a.race_distance_km) || 25);
  const dplusM = Math.max(0, num(a.race_dplus_m) || Math.round(distanceKm * 25));
  const dmoinsM = num(a.race_dmoins_m) > 0 ? num(a.race_dmoins_m) : dplusM;
  const kmEffort = Math.round(distanceKm + dplusM / 100);
  const level = a.level || "inter";
  const vamKnown = a.vam_known === "oui" && num(a.vam) >= 200 && num(a.vam) <= 2500;
  const vam = vamKnown ? num(a.vam) : VAM_BY_LEVEL[level] || 850;
  // allure seuil SUR PLAT (s/km) — la référence route reste valable à plat
  const flatPaceSec = num(a.pace_known === "oui" ? paceToSec(a.pace) : 0) || (level === "debutant" ? 360 : level === "avance" ? 260 : 300);
  const tech = TRAIL_TECHNICITY[a.race_technicity || "mixte"] || TRAIL_TECHNICITY.mixte;
  const night = a.race_night || "non";
  const nightF = night === "majoritaire" ? 1.1 : night === "partielle" ? 1.05 : 1.0;

  // KV : montée quasi pure, catégorie décidée par la géométrie, pas par le temps
  // KV : un « kilomètre vertical » se reconnaît à sa pente moyenne (≥140 m de D+ par km),
  // pas à un seuil de distance — 6 km pour 1 000 m D+ est un KV, 6 km pour 200 m ne l'est pas.
  const isKv = dplusM / Math.max(1, distanceKm) >= 140 && distanceKm <= 12;
  let cat                = isKv ? "kv" : "long";
  let mid = 0;
  // Modèle en KM-EFFORT, pondéré par la part verticale du parcours (moyenne harmonique).
  // Un modèle purement additif (temps à plat + temps d'ascension) compte DEUX FOIS le
  // déplacement horizontal des montées et surestime lourdement : 62 km/3 200 m sortait à
  // 15-22 h là où la réalité d'un coureur intermédiaire est plutôt 11-13 h.
  const vFlatSeuil = 3600 / Math.max(120, flatPaceSec); // km/h au seuil, sur plat
  const partVert = (dplusM / 100) / Math.max(1, kmEffort); // part du km-effort qui est du vertical
  for (let it = 0; it < 4; it++) {
    const keep = ENDURANCE_KEEP[cat];
    const vFlat = vFlatSeuil * keep.flat; // km-effort/h sur les portions plates
    const vVert = (vam * keep.vert) / 100; // 100 m D+ = 1 km-effort
    const vKmEff = 1 / ((1 - partVert) / Math.max(1, vFlat) + partVert / Math.max(1, vVert));
    mid = (kmEffort / vKmEff) * 60 * tech.f * nightF;
    const h = mid / 60;
    const next                = isKv ? "kv" : h < 3 ? "court" : h < 6 ? "long" : h < 12 ? "ultra" : h < 24 ? "ultra_long" : "ultra_xl";
    if (next === cat) break;
    cat = next;
  }
  const rawCategory = cat;
  // Décision produit : le moteur s'arrête à ultra_long et le dit (§11.2).
  const cappedByProduct = cat === "ultra_xl";
  if (cappedByProduct) cat = "ultra_long";

  // Fourchette : ±20% assumée sur un ultra, plus serrée sur un format court. Le mensonge
  // serait d'afficher une fourchette étroite sur 12h de course.
  const spread = cat === "kv" || cat === "court" ? 0.1 : cat === "long" ? 0.14 : 0.2;
  return {
    distanceKm, dplusM, dmoinsM, kmEffort, category: cat, rawCategory, cappedByProduct,
    raceMinLo: Math.round(mid * (1 - spread)), raceMinHi: Math.round(mid * (1 + spread)), raceMinMid: Math.round(mid),
    technicity: a.race_technicity || "mixte", night, vam, vamKnown, flatPaceSec,
    cutoffH: num(a.race_cutoff_h) > 0 ? num(a.race_cutoff_h) : null,
    altitudeMaxM: num(a.race_altitude_max_m) > 0 ? num(a.race_altitude_max_m) : null,
    why: distanceKm + " km / " + dplusM + " m D+ = " + kmEffort + " km-effort · "
      + (vamKnown ? "ta VAM de " + Math.round(vam) + " m/h" : "VAM estimée à " + Math.round(vam) + " m/h (niveau " + level + ")")
      + " et ton allure seuil à plat, dégradées pour la durée · terrain " + tech.label
      + (tech.f > 1 ? " (+" + Math.round((tech.f - 1) * 100) + "%)" : "")
      + (nightF > 1 ? " · nuit (+" + Math.round((nightF - 1) * 100) + "%)" : ""),
  };
}

/** Parseur d'allure local (évite une dépendance circulaire avec constraintMatrix). */
function paceToSec(v         )         {
  const m = String(v ?? "").trim().match(/^(\d{1,2})\s*[:h.'′]\s*(\d{1,2})\s*(?:\/\s*km)?$/);
  if (!m) return 0;
  const sec = +m[2];
  if (sec > 59) return 0;
  const t = +m[1] * 60 + sec;
  return t >= 120 && t <= 1200 ? t : 0;
}

/** Accès au dénivelé à l'entraînement : ce que le terrain permet RÉELLEMENT par sortie. */
const TRAIL_ACCESS                                                        = {
  montagne: { perLongRun: 2000, label: "montagne (>800m D+ accessibles)" },
  collines: { perLongRun: 800, label: "collines (200-800m D+)" },
  plat: { perLongRun: 200, label: "plat (<200m D+)" },
};

/** Cible de D+/D− hebdomadaire au pic, bornée par la catégorie, l'historique ET le terrain. */
function trailWeeklyVertical(obj                , history        , access        )   
                                                                            
  {
  const cap = T1_DPLUS_CAPS[obj.category][history] ?? T1_DPLUS_CAPS[obj.category].confirme;
  // Le besoin brut : ~2 à 3 fois le D+ de la course par semaine au pic pour un format court,
  // décroissant en part relative sur les ultras (où le temps devient le limiteur).
  const need = obj.category === "kv" || obj.category === "court" ? obj.dplusM * 2.2
    : obj.category === "long" ? obj.dplusM * 1.3
    : obj.category === "ultra" ? obj.dplusM * 0.9
    : obj.dplusM * 0.6;
  const acc = TRAIL_ACCESS[access] || TRAIL_ACCESS.collines;
  // 2 sorties vallonnées par semaine + le reste en côtes courtes : plafond réalisable
  const accessCap = Math.round(acc.perLongRun * 2.5);
  const dplusPeak = Math.round(Math.min(cap, need, accessCap));
  // Le D− suit le D+ (une montée se redescend) mais reste plafonné : sur un parcours
  // en boucle, D− = D+ ; on ne le programme jamais au-delà.
  const dmoinsPeak = Math.round(Math.min(dplusPeak, dplusPeak * (obj.dmoinsM / Math.max(1, obj.dplusM))));
  return { dplusPeak, dmoinsPeak, capped: Math.min(cap, need) > accessCap, accessCap };
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
                                                                                



/** « 560 » → « 9h20 » — les durées de trail se lisent en heures, pas en minutes. */
function fmtH(min        )         {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h > 0 ? h + "h" + String(m).padStart(2, "0") : m + "min";
}

/** Zones cardio (Karvonen si FC repos connue, sinon %FCmax) — port V1.5. */
function hrZones(age         , hrMax         , hrRest         ) {
  // E3 (audit v6) — hors bornes physiologiques = non renseigné (repli formule d'âge)
  const boundedAge = boundedOrZero("age", parseInt(age || "") || 0) || 35;
  const fcMax = boundedOrZero("hrMax", parseInt(hrMax || "") || 0) || Math.round(208 - 0.7 * boundedAge);
  const rest = boundedOrZero("hrRest", parseInt(hrRest || "") || 0);
  const Z = (lo        , hi        ) => {
    if (rest) return Math.round(rest + (fcMax - rest) * lo) + "-" + Math.round(rest + (fcMax - rest) * hi) + " bpm";
    return Math.round(fcMax * lo) + "-" + Math.round(fcMax * hi) + " bpm";
  };
  return { fcMax, z1: Z(0.6, 0.7), z2: Z(0.7, 0.8), tempo: Z(0.8, 0.87), seuil: Z(0.87, 0.92), vo2: Z(0.92, 0.97) };
}

                                  
                     
 

class TrainingReasoningEngine {
  analyze(a                )               {
    const decisions             = [];
    const warnings           = [];
    const D = (id        , what        , val                 , why        ) => decisions.push({ id, what, val, why });
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
      const mondayOf = (t        )         => t - ((new Date(t).getUTCDay() + 6) % 7) * MS;
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
    if (guard(sp          , "swimTimeFactor") && beginner) {
      volPeak = Math.min(volPeak, BEGINNER_SWIM_VOLPEAK_CAP_H);
      D("C15", "Nageur débutant", "pic ≤" + BEGINNER_SWIM_VOLPEAK_CAP_H + "h", "La technique borne le volume, pas l'historique (risque épaule)");
    }
    if (guard(sp          , "swimTimeFactor")) volPeak = Math.round(volPeak * SWIM_TIME_FACTOR * 10) / 10;

    // ---- 3. Comprendre les contraintes : médical, jours, budget ----
    const medHold = a.med_pain === "oui" || a.med_dizzy === "oui" || a.med_treat === "oui";
    if (medHold) D("medical", "⚠️ Drapeau médical", "plan de maintien", "Aucune intensité générée sans feu vert médical ; pic allégé à 40%");
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
    let maxRunDays                = null;
    // D10-3 — le plafond de jours d'IMPACT vaut aussi pour le trail. Il ne s'appliquait qu'à
    // `run` : depuis R7 un traileur avec une périostite recevait 5 jours de course par semaine,
    // là où un coureur route avec la MÊME blessure en recevait 3. Or le trail ajoute la charge
    // excentrique de la descente à l'impact — c'est la discipline la plus exigeante pour les
    // tissus, pas la moins.
    if (guard(sp          , "runImpactCap")) {
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
    if (guard(sp          , "swimTimeFactor") && beginner) {
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
    let tVert                                                                                           ;
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
const TRAIL_DOWN_CUE = "en contrôle : buste relâché, cadence haute, petits pas, regard 4-5m devant (jamais sur ses pieds)";

const fk = (s        ) => Math.floor(s / 60) + "'" + String(Math.round(s % 60)).padStart(2, "0");

function fmtInt(key                           , refs      , hz         )         {
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
function fmtIntHr(key                           , refs      , hz         )         {
  const d = key ? ZDEF[key] : undefined;
  if (!d) return key || "";
  if (d.hr && hz[d.hr]) return hz[d.hr];
  return fmtInt(key, refs, hz);
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
  // Le rendu « brick » suppose un leg VÉLO et un leg COURSE (tri, duathlon). Un enchaînement
  // multi-disciplines d'une autre forme (swimrun : nage ↔ course, N fois) n'est PAS un brick —
  // la spec R10 le dit explicitement — et passe par le rendu générique de steps.
  const bkLeg = bodies.find((b) => b.leg === "bike");
  const rnLeg = bodies.find((b) => b.leg === "run");
  if (s.brick && bkLeg && rnLeg) {
    const bk = bkLeg;
    const rn = rnLeg;
    seg.push(
      bk.durationMin + "min vélo @ " + fmtInt(bk.zone          , refs, hz) +
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
      let str = (b                       ).prefix || "";
      const reps = b.reps || 1;
      if (reps > 1) str += reps + "×";
      if (b.durationMin != null) str += b.durationMin + "min";
      else if (b.distanceM != null) str += ((b                        ).unitKm ? b.distanceM / 1000 : b.distanceM) + ((b                        ).unitKm ? "km" : "m");
      // R7 TRAIL §7 — LE VERROU : l'intensité rendue dépend de la PENTE du bloc.
      // Sans cette résolution, chaque séance de montagne réimprimait une allure au sol.
      if (b.gradient === "down") {
        // Descente : aucune cible chiffrée, jamais. Consigne de contrôle technique.
        if (b.dmoinsM) str += " de descente (−" + b.dmoinsM + "m)";
        str += " — " + TRAIL_DOWN_CUE;
      } else if (b.gradient === "up") {
        if (b.mode === "hike") str += " de marche rapide" + (b.poles ? " avec bâtons" : "");
        if (b.dplusM) str += " (+" + b.dplusM + "m D+)";
        if (b.zone) str += " @ " + fmtInt(b.zone          , refs, hz);
      } else if (b.gradient === "rolling") {
        // Vallonné : la charge se dit en D+/D−, l'intensité en FC/ressenti — PAS en allure.
        // Sur un parcours qui alterne montées et descentes, une allure moyenne au sol ne
        // décrit aucun effort réel : c'est la fréquence cardiaque qui reste comparable.
        if (b.zone) str += " @ " + fmtIntHr(b.zone          , refs, hz);
        const dd           = [];
        if (b.dplusM) dd.push("D+ " + b.dplusM + "m");
        if (b.dmoinsM) dd.push("D− " + b.dmoinsM + "m");
        if (dd.length) str += " · " + dd.join(" / ") + " cible";
        if (b.mode === "run_hike") str += " · marche assumée dans les pentes raides";
      } else {
        if (b.zone) str += " @ " + fmtInt(b.zone          , refs, hz);
        if (b.surface === "escalier") str += " en escaliers";
        else if (b.surface === "tapis") str += " sur tapis incliné";
      }
      str += (b                       ).suffix || "";
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
  const dplusM = steps.reduce((t, x) => t + (x.dplusM || 0) * (x.reps || 1), 0);
  const dmoinsM = steps.reduce((t, x) => t + (x.dmoinsM || 0) * (x.reps || 1), 0);
  return {
    minutes,
    meters: s.d === "sw" || meters > 0 ? meters || null : null,
    dplusM: dplusM || undefined,
    dmoinsM: dmoinsM || undefined,
    recoveryMin: recovery,
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
/**
 * D10-6 — zones TRAIL (R7). Elles ne portent aucun des suffixes ci-dessus : `tr.vam` et
 * `tr.flatthr` tombaient donc en « facile », et la répartition 80/20 comme le garde-fou de
 * polarisation étaient AVEUGLES sur tout le trail (100% de facile mesuré sur les 27 profils).
 * Classement par ce que l'effort coûte vraiment :
 *   dur    — VAM (quasi maximal), seuil ascensionnel, seuil sur plat
 *   modéré — allure de course en montée (tenable longtemps, mais loin d'être facile)
 *   facile — marche rapide, montée souple, footing plat : de l'endurance, et c'est le but
 * La DESCENTE n'entre pas ici : sa charge est excentrique, mesurée par l'axe D− (T2b),
 * pas par l'intensité cardiaque — la compter « dure » ferait doublon avec son propre plafond.
 */
const TRAIL_HARD = ["tr.vam", "tr.asc", "tr.flatthr"];
const TRAIL_MOD = ["tr.climb"];
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
    // Le leg COURSE d'un enchaînement compte « modéré » quand il n'a PAS de zone explicite :
    // c'est le cas du brick tri (« allure cible » implicite). Quand une zone est déclarée, elle
    // prime — sinon les segments de course d'un swimrun, explicitement en endurance, seraient
    // comptés modérés et la répartition d'intensité tomberait à 61 % de facile (mesuré) sur un
    // plan qui est en réalité polarisé. La zone déclarée est toujours plus précise que l'indice.
    const runLegNoZone = st.leg === "run" && !zone;
    const cls = TRAIL_HARD.includes(zone) || HARD_SUFFIX.some((z) => zone.endsWith(z))
      ? "hard"
      : TRAIL_MOD.includes(zone) || MOD_SUFFIX.some((z) => zone.endsWith(z)) || runLegNoZone
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
    return { minutes, meters, recoveryMin, confidence: allParsed && paceMatch ? "full" : "partial", flags };
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
                                                              


// Les bornes brick vélo (audit 2, « jamais dépassées, même de peu ») vivent désormais dans la
// matrice de contraintes : l'auditeur et le générateur lisent LE MÊME tableau. La copie locale
// permettait au générateur de produire ce que l'auditeur interdit — vu en R10 phase 2.

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
  let swimM = 0;
  let recovM = 0;
  const loads                = [];
  for (const day of w.days) {
    let dayMin = 0;
    for (const s of day.sessions) {
      const load = sessionLoad(s, refs);
      loads.push(load);
      dayMin += load.minutes;
      if (load.meters) swimM += load.meters;
      recovM += load.recoveryMin || 0;
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
    swimMeters: Math.round(swimM),
    workMin: Math.round(prescribed - recovM),
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
  let peakInPeakPhase =
    peakByMin.phaseId === "peak" || (!!peakPhaseBest && peakByMin.prescribedMin <= peakPhaseBest.prescribedMin * 1.05);
  // Composition : une semaine fractionnée (VO2/force, récups × répétitions) pèse plus en
  // minutes-métrique qu'une semaine continue à travail égal — c'est l'écart de métrique
  // documenté (ARCHITECTURE.md). La dominance est re-testée HORS récup inter-répétitions
  // (même base que le générateur) avant de conclure à une violation structurelle.
  if (!peakInPeakPhase) {
    const peakByWork = candidates.reduce((a, b) => (b.workMin > a.workMin ? b : a), candidates[0]);
    const peakPhaseBestW = Math.max(0, ...candidates.filter((w) => w.phaseId === "peak").map((w) => w.workMin));
    if (peakByWork.phaseId === "peak" || (peakPhaseBestW > 0 && peakByWork.workMin <= peakPhaseBestW * 1.05)) peakInPeakPhase = true;
  }
  // Natation : la dominance se juge aussi aux MÈTRES. Sur la fenêtre saturée [600, 850]m
  // du débutant, une semaine de base fractionnée pèse plus cher à volume nagé INFÉRIEUR.
  if (!peakInPeakPhase && opts.sport === "swim") {
    const peakByMeters = candidates.reduce((a, b) => (b.swimMeters > a.swimMeters ? b : a), candidates[0]);
    const peakPhaseBestM = Math.max(0, ...candidates.filter((w) => w.phaseId === "peak").map((w) => w.swimMeters));
    if (peakByMeters.phaseId === "peak" || (peakPhaseBestM > 0 && peakByMeters.swimMeters <= peakPhaseBestM * 1.05)) peakInPeakPhase = true;
  }
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
        // D3 (audit v6) — les sauts se mesurent sur la base TRAVAIL (hors récup
        // inter-répétitions, comme la dominance du pic) : une semaine fractionnée pèse
        // plus cher en minutes-métrique à travail égal — c'est l'écart de métrique
        // documenté, pas un saut de charge. Le seuil dur dérive de la constante nommée
        // (C22_AUDIT_HARD_JUMP) — plus jamais un littéral qui diverge en silence.
        const j = w.workMin / prevOurs;
        if (j > C22_AUDIT_HARD_JUMP) auditJumpsHard++;
        else if (j > 1.15) auditJumpsSoft++;
      }
      prevDecl = w.declaredMin;
      prevOurs = w.workMin;
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

  // D1 (audit v6) — une violation dure ne peut JAMAIS coexister avec un score
  // « excellent » : le plafond dérive du NOMBRE de violations, pas d'une énumération
  // de pénalités (les cas non énumérés — brick absent du pic… — ne passent plus
  // entre les mailles : tri/70.3 s'affichait à 100/100 avec une violation dure).
  if (hard.length > 0) score = Math.min(score, 70 - Math.min(30, (hard.length - 1) * 10));

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
                                                                          


// Import des modules de sport pour leur EFFET DE BORD (enregistrement dans le registre).
// Un seul endroit dans le projet connaît la liste des sports : celui-ci.







function buildSessions(ctx            , slot      , phase        , prog        , weekNum = 1)              {
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
  const inj = r.inj; // R6 (audit v6) — lecture UNIQUE des blessures, plus de motif dupliqué
  const noVo2 = r.noVo2; // R6.3 — mineur : la VO2max n'est jamais générée, l'alternative seuil/tempo prend le relais
  const _plioOK = lvl !== "debutant" && !finisher && !inj.impactAny;
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

  // R10 phase 1 — DISPATCH : les branches par sport ont quitté cette fonction pour
  // `src/sports/<sport>/`. Ce qui reste ici est la boîte à outils COMMUNE (builders de steps,
  // progression P, gammes G, glossaire nage) : elle est partagée, donc elle n'a aucune raison
  // d'être dupliquée par sport. Un sport inconnu lève (`UnknownSportError`) au lieu de
  // retourner un tableau vide, qui produisait des jours muets sans que personne le voie.
  const kit             = {
    r, a, sp: sp          , fmt, slot, phase, prog, weekNum,
    lvl, finisher, beginner, medHold, dbl, sessionScale, inj, noVo2, G, swimDrillGlossary,
    S2, P, W, Wm, C, Cm, B, Bd,
  };
  return sportModule(sp          ).buildSessions(kit);
}

// ===== src/generator/trailLibrary.ts =====
/**
 * Bibliothèque de séances TRAIL (spec R7 §5) — 14 séances, chacune chargeant explicitement
 * ses axes (temps / D+ / D−).
 *
 * Ce que l'ancien `run/trail` produisait : 28 footings plats, 20 footings récup, 7 « allure
 * spécifique » de rien, et 6 séances de côtes strictement identiques figées à 15×3min.
 * Zéro marche rapide, zéro bâton, zéro ravitaillement, zéro nuit — sur une préparation
 * d'ultra. Une séance sur huit était spécifique au trail.
 *
 * Ici, chaque bloc porte sa PENTE (`gradient`), donc son intensité se rend correctement
 * (renderer.ts) : VAM en montée, consigne technique en descente, allure seulement à plat.
 */
                                                                          


/** Progression EXPLICITE de la séance de côtes (spec §5.4) — corrige les 6 séances figées
 *  à 15×3min : format et récupération changent à chaque phase, et `repCap` est obligatoire
 *  comme sur les séances vélo. */
const HILL_PROGRESSION                                                                                                                                    = {
  base: { reps: [5, 6], durMin: 0.75, zone: "tr.vam", rec: "descente MARCHÉE, récupération complète", repCap: 6,
    name: "Côtes courtes (initiation)", note: "Premières côtes courtes : on cherche la mécanique de montée (buste droit, poussée complète), pas la performance. La descente se marche : elle sert à récupérer, pas à s'abîmer les cuisses." },
  dev: { reps: [8, 10], durMin: 1.25, zone: "tr.vam", rec: "descente souple en trottinant", repCap: 10,
    name: "Côtes courtes (VAM)", note: "Le travail de vitesse ascensionnelle : court, intense, en montée. C'est ce qui fait progresser ta VAM — la référence qui compte en trail." },
  spec: { reps: [3, 4], durMin: 9, zone: "tr.asc", rec: "descente EN CONTRÔLE (elle fait partie du travail)", repCap: 5,
    name: "Seuil ascensionnel", note: "Le seuil en montée, sur des blocs longs : c'est l'allure que tu tiendras dans les grosses côtes de ta course. La descente entre les blocs n'est pas de la récup passive, c'est de l'entraînement excentrique." },
  peak: { reps: [3, 3], durMin: 12, zone: "tr.climb", rec: "descente en contrôle", repCap: 4,
    name: "Montées à l'allure de course", note: "Blocs longs à l'allure exacte de tes montées le jour J : mémorise la sensation et la respiration. Ne pars pas plus vite que ce que tu pourras tenir après 4 heures de course." },
  taper: { reps: [3, 3], durMin: 3, zone: "tr.asc", rec: "descente très souple", repCap: 3,
    name: "Rappels de côte (affûtage)", note: "Court et vif : on réveille la mécanique de montée sans créer de fatigue. La fraîcheur passe avant tout." },
};

function buildTrailSessions(r              , slot      , phase        , prog        , weekNum        )              {
  const a = r.profile;
  const obj = r.trail ;
  const vert = r.trailVert ;
  const cat = obj.category;
  const S2              = [];
  const inj = r.inj;
  const beginner = r.beginner;
  const scale = r.sessionScale;
  const P = (lo        , hi        ) => Math.max(1, Math.round((lo + (hi - lo) * prog) * scale));
  // Part de la cible verticale hebdo allouée à CETTE séance (le générateur ajuste ensuite)
  const upShare = (f        ) => Math.max(50, Math.round((vert.dplusPeak * f * (0.55 + 0.45 * prog)) / 10) * 10);
  const downShare = (f        ) => Math.max(50, Math.round((vert.dmoinsPeak * f * (0.5 + 0.5 * prog)) / 10) * 10);

  // --- Contre-indications spécifiques trail (spec §5.3) : la descente est le terrain à risque
  const quadInj = inj.list.includes("quadriceps");
  const ankleInj = inj.list.includes("cheville");
  const shinInj = inj.list.includes("tibia");
  const kneeInj = inj.list.includes("genou");
  const fasciaInj = inj.list.includes("fascia");
  const noHardDown = quadInj || shinInj; // descente rapide/longue supprimée
  const downFactor = quadInj ? 0.4 : kneeInj || shinInj ? 0.6 : 1;
  const technicalOk = !ankleInj; // terrain technique interdit sur cheville fragile
  const poles = a.poles === "oui" || (a.poles === "a_decider" && obj.dplusM >= 1500);
  const flatAccess = a.train_dplus_access === "plat";
  const treadmill = a.treadmill === "oui";
  const hikeShare = T5_HIKE_SHARE[cat] ?? 0.15;
  const ultra = cat === "ultra" || cat === "ultra_long" || cat === "ultra_xl";
  const rehearsalNeeded = obj.raceMinMid / 60 >= T7_REHEARSAL.minRaceHours;

  const W = (min        , txt         )         => ({ role: "warmup", durationMin: min, text: txt || "", gradient: "flat" });
  const C = (min        , txt         )         => ({ role: "cooldown", durationMin: min, text: txt || "", gradient: "flat" });
  const B = (o                                           )         =>
    ({ role: "body", reps: 1, intensity: intOf(o.zone ?? null)                     , ...o })          ;

  if (slot === "durLong") {
    // 1. SORTIE LONGUE TRAIL — temps + D+ + D−, en `rolling` : jamais une allure au sol.
    const durMin = P(Math.round(60 + 40 * (ultra ? 1.6 : 1)), r.trailLongCapMin || 240);
    const up = upShare(0.55), down = Math.round(upShare(0.55) * downFactor);
    const hikeMin = hikeShare > 0.1 ? Math.round(durMin * hikeShare) : 0;
    // T7 — au-delà de 6h d'effort, TOUTES les longues de la phase spécifique sont des
    // répétitions générales (sac, eau, glucides réels) : l'estomac et le matériel se
    // préparent comme les jambes, et ça ne se teste pas le jour J.
    const isRehearsal = rehearsalNeeded && (phase === "spec" || phase === "peak");
    S2.push({
      d: "rn", long: true,
      name: isRehearsal ? "Longue trail + ravito réel" : "Sortie longue trail",
      note: isRehearsal
        ? "Répétition GÉNÉRALE : sac de course, réserve d'eau complète, et 60 à 90 g de glucides par heure — exactement ce que tu prendras le jour J. Au-delà de 6 h d'effort, l'estomac et le matériel font autant d'abandons que les jambes : ça se teste à l'entraînement, jamais en course."
        : "La séance qui construit ta course : on compte le TEMPS et le dénivelé, jamais les kilomètres. Monte au train (tu dois pouvoir parler), descends en contrôle" + (hikeMin ? ", et marche franchement dans les pentes raides — c'est ce que tu feras en course" : "") + ".",
      det: "",
      steps: [
        B({ durationMin: durMin - (hikeMin ? Math.round(hikeMin / 2) : 0), gradient: "rolling", zone: "tr.flat", dplusM: up, dmoinsM: down,
          mode: hikeMin ? "run_hike" : "run", poles: poles && hikeMin > 0, surface: technicalOk ? "sentier" : "piste",
          bnd: { floor: 60, cap: r.trailLongCapMin || 240 } }                             ),
      ],
      ...({ plainBody: true }          ),
    }             );
  } else if (slot === "dur1") {
    // 3/4. CÔTES COURTES → SEUIL ASCENSIONNEL → ALLURE DE COURSE EN MONTÉE (progression §5.4)
    const hp = HILL_PROGRESSION[phase] || HILL_PROGRESSION.dev;
    // Ultra long : pas de VO2 (ce n'est pas le limiteur) — on reste sur du seuil ascensionnel
    const noVam = r.noVo2 || cat === "ultra_long" || cat === "ultra_xl";
    const zone = noVam && hp.zone === "tr.vam" ? "tr.asc" : hp.zone;
    const reps = Math.max(2, Math.min(hp.repCap, P(hp.reps[0], hp.reps[1])));
    const durEach = hp.durMin;
    const upPer = Math.max(20, Math.round((durEach / 60) * obj.vam * 0.9 / 5) * 5);
    if (flatAccess && !treadmill) {
      // 14. ESCALIERS — substitut de D+ quand le terrain ne permet pas la montée longue
      S2.push({ d: "rn", name: "Escaliers (substitut de dénivelé)", note: "Ton terrain ne donne pas accès à de vraies montées : les escaliers reproduisent la contrainte verticale. Monte en poussée complète, redescends TOUJOURS en marchant — la descente d'escalier est traumatisante pour les genoux.", det: "",
        steps: [W(15, "footing plat progressif"), B({ durationMin: durEach, reps, zone, gradient: "up", dplusM: upPer, mode: "run", surface: "escalier", recoveryText: "redescente MARCHÉE", repCap: hp.repCap }), C(10, "footing très souple")] });
    } else if (flatAccess && treadmill) {
      // 13. TAPIS INCLINÉ
      S2.push({ d: "rn", name: "Tapis incliné (substitut de dénivelé)", note: "Tapis à 10-15 % d'inclinaison : c'est le meilleur substitut de montée quand le terrain manque. Aucune descente, donc aucune casse musculaire — mais aussi aucune préparation à la descente : garde tes week-ends en relief pour ça.", det: "",
        steps: [W(12, "à plat, progressif"), B({ durationMin: durEach, reps, zone, gradient: "up", dplusM: upPer, mode: "run", surface: "tapis", recoveryText: "2min à plat, inclinaison à 0", repCap: hp.repCap }), C(8, "à plat souple")] });
    } else {
      S2.push({ d: "rn", name: hp.name, note: hp.note, det: "",
        steps: [W(15, "footing progressif jusqu'au pied de la côte"),
          // `bnd` verrouille la durée UNITAIRE du bloc : sans lui, R3.3 ramenait toutes les
          // phases à la même valeur et la progression base→dev→spec→peak disparaissait
          // (le défaut mesuré par l'audit : 6 séances identiques à 15×3min).
          B({ durationMin: durEach, reps, zone, gradient: "up", dplusM: upPer, mode: "run", poles: poles && phase === "spec", recoveryText: hp.rec, repCap: hp.repCap, bnd: { floor: Math.max(1, Math.round(durEach * 0.9)), cap: Math.round(durEach * 1.15) } }),
          C(10, "footing souple sur plat")] });
    }
  } else if (slot === "dur2") {
    // 5/6. DESCENTE TECHNIQUE puis DESCENTE EN CHARGE — le vaccin excentrique
    if (noHardDown) {
      // 10. RENFO EXCENTRIQUE renforcé à la place (spec §5.3)
      S2.push({ d: "rn", name: "Renfo excentrique (protection)", note: (quadInj ? "Quadriceps fragiles" : "Tibias fragiles") + " : la descente rapide est retirée du plan. Le renfo excentrique construit la même résistance sans le traumatisme — squats descendants très lents (5 s), fentes contrôlées, mollets sur marche. C'est le meilleur investissement quand la descente est interdite.", det: "",
        steps: [W(12, "footing plat très souple"), B({ durationMin: P(18, 25), gradient: "flat", zone: "tr.easyup", mode: "run" }), C(8, "étirements doux")] });
    } else if (phase === "spec" || phase === "peak") {
      const down = Math.round(downShare(0.5) * downFactor);
      S2.push({ d: "rn", name: "Descente en charge", note: "LA séance qui décide de ta fin de course. Les descentes longues abîment les cuisses ; s'y exposer progressivement crée une protection durable (c'est prouvé et ça s'appelle l'effet de répétition). Monte tranquillement ou marche, et descends " + (technicalOk ? "sur ton terrain le plus roulant au début, puis plus technique" : "sur sentier ROULANT uniquement — ta cheville n'est pas prête pour du technique") + ".", det: "",
        steps: [W(15, "footing plat"), B({ durationMin: P(12, 20), reps: 1, gradient: "up", zone: "tr.easyup", dplusM: Math.round(down / 2), mode: poles ? "hike" : "run_hike", poles }),
          B({ durationMin: P(20, 34), reps: Math.max(2, P(2, 4)), gradient: "down", dmoinsM: Math.round(down / Math.max(2, P(2, 4))), surface: technicalOk ? "sentier" : "piste", recoveryText: "remontée en marche active" }), C(10, "footing plat souple")] });
    } else {
      const down = Math.round(downShare(0.35) * downFactor);
      S2.push({ d: "rn", name: "Descente technique", note: "La descente est une COMPÉTENCE, pas une récupération. Objectif : le geste, pas la vitesse. Buste relâché, bras écartés pour l'équilibre, petits pas rapides, regard 4-5 m devant. On répète 3 à 6 fois la même descente pour sentir la progression.", det: "",
        steps: [W(12, "footing plat"), B({ durationMin: P(8, 14), gradient: "up", zone: "tr.easyup", dplusM: Math.round(down / 2), mode: "hike", poles }),
          B({ durationMin: P(4, 7), reps: Math.max(3, P(3, 6)), gradient: "down", dmoinsM: Math.round(down / Math.max(3, P(3, 6))), surface: technicalOk ? "sentier" : "piste", recoveryText: "remontée marchée, souffle repris" }), C(8, "footing souple")] });
    }
  } else if (slot === "facileR") {
    // 7. MARCHE RAPIDE EN CÔTE (base/dev) · 9. SORTIE DE NUIT (spec/peak si course de nuit)
    const nightNeeded = (a.race_night === "partielle" || a.race_night === "majoritaire") && (phase === "spec" || phase === "peak");
    if (nightNeeded && weekNum % 2 === 1) {
      S2.push({ d: "rn", name: "Sortie de nuit (frontale)", note: "Courir de nuit change tout : la perception du relief, l'équilibre, la vigilance, le moral. Terrain CONNU, frontale chargée (+ une réserve), rythme facile. L'objectif est de s'habituer, pas de performer — et de vérifier ton matériel avant qu'il te lâche en course.", det: "",
        steps: [B({ durationMin: P(55, 100), gradient: "rolling", zone: "tr.flat", dplusM: upShare(0.2), dmoinsM: Math.round(upShare(0.2) * downFactor), mode: "run_hike", poles, surface: "sentier" })],
        ...({ plainBody: true }          ) }             );
    } else if (hikeShare >= 0.1 && (phase === "base" || phase === "dev" || phase === "spec")) {
      S2.push({ d: "rn", name: "Marche rapide en montée" + (poles ? " (bâtons)" : ""), note: "Sur ta course, la marche représentera environ " + Math.round(hikeShare * 100) + " % du temps : c'est une compétence, pas un aveu d'échec. Marche vite, mains sur les cuisses ou " + (poles ? "avec les bâtons (poussée complète, buste légèrement penché)" : "bras actifs") + ", rythme cardiaque soutenu. Tu iras plus vite en marchant bien qu'en courant mal. Termine par 20 min de renfo EXCENTRIQUE (squats descendants lents 5 s, fentes, mollets sur une marche) : c'est la protection n°1 des cuisses contre la descente.", det: "",
        steps: [B({ durationMin: P(40, 85), gradient: "up", zone: "tr.hike", dplusM: upShare(0.3), mode: "hike", poles })],
        ...({ plainBody: true }          ) }             );
    } else {
      // 12. FOOTING PLAT RÉCUP — aucun D+ assumé
      S2.push({ d: "rn", name: "Footing plat + renfo excentrique", note: "Volume facile sur terrain PLAT et souple : aucun dénivelé, aucune technique. C'est le volume qui construit l'aérobie sans ajouter de casse musculaire" + (fasciaInj ? " — et sur terrain souple, ton fascia a besoin de ça" : "") + ". Puis 20 min de renfo EXCENTRIQUE (squats descendants lents 5 s, fentes contrôlées, mollets sur une marche) : c'est la protection n°1 des cuisses contre la descente, et elle se construit dès maintenant.", det: "",
        steps: [B({ durationMin: P(35, 65), gradient: "flat", zone: "tr.flat", mode: "run", surface: fasciaInj ? "sentier" : "route" })],
        ...({ plainBody: true }          ) }             );
    }
  } else if (slot === "facile2") {
    // 2. BACK-TO-BACK (ultra, spec/peak) sinon footing récup + 11. proprioception
    if (ultra && (phase === "spec" || phase === "peak")) {
      S2.push({ d: "rn", name: "Back-to-back (sur jambes fatiguées)", note: "Le lendemain de ta longue, 60 à 70 % de sa durée, sur des jambes qui n'ont pas récupéré. C'est la séance qui reproduit le plus fidèlement les dernières heures d'un ultra — et la plus utile mentalement. Rythme très facile, marche assumée.", det: "",
        steps: [B({ durationMin: P(45, 90), gradient: "rolling", zone: "tr.easyup", dplusM: upShare(0.25), dmoinsM: Math.round(upShare(0.25) * downFactor), mode: "run_hike", poles })],
        ...({ plainBody: true }          ) }             );
    } else {
      S2.push({ d: "rn", name: "Footing récup" + (ankleInj ? " + proprioception" : ""), note: "Récupération active à plat : les jambes tournent, zéro intensité, zéro dénivelé. Puis 15-20 min de renfo excentrique si tu ne l'as pas fait cette semaine." + (ankleInj ? " Puis 15 min de proprioception (équilibre sur une jambe, yeux fermés, coussin instable) : c'est ce qui protège ta cheville sur terrain technique." : ""), det: "",
        steps: [B({ durationMin: P(22, 35), gradient: "flat", zone: "tr.easyup", mode: "run", surface: "route" })],
        ...({ plainBody: true }          ) }             );
    }
  } else if (slot === "recup") {
    // 10/11. RENFO EXCENTRIQUE + proprioception — greffés, jamais une journée en plus
    S2.push({ d: "rs", name: "Repos + renfo excentrique",
      det: "20-25min : squats descendants LENTS (5s à la descente), fentes contrôlées, mollets sur une marche" + (ankleInj ? ", puis 15min de proprioception de cheville" : "") + " — 💡 Objectif : préparer les cuisses à encaisser la descente. C'est la protection la plus efficace contre la casse musculaire du jour J, et ça se construit dès la phase de base.",
      steps: [] });
  } else if (slot === "off") {
    S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  }
  return S2;
}

/** Slots d'une semaine trail : la structure diffère de la route (descente et marche sont
 *  des séances à part entière, la longue est le pivot). */
function trailWeekSchema(phase        , isRecup         , cat               )                                     {
  if (isRecup) return [
    { charge: "recup", slot: "recup" }, { charge: "facile", slot: "facile2" }, { charge: "off", slot: "off" },
    { charge: "facile", slot: "facileR" }, { charge: "off", slot: "off" }, { charge: "facile", slot: "facileR" }, { charge: "recup", slot: "recup" },
  ];
  const ultra = cat === "ultra" || cat === "ultra_long" || cat === "ultra_xl";
  // Lun repos+renfo · Mar côtes/VAM · Mer footing plat · Jeu descente · Ven OFF · Sam LONGUE · Dim back-to-back ou récup
  return [
    { charge: "recup", slot: "recup" },
    { charge: "dur", slot: "dur1" },
    { charge: "facile", slot: "facileR" },
    { charge: "dur", slot: "dur2" },
    { charge: "off", slot: "off" },
    { charge: "dur", slot: "durLong" },
    { charge: ultra ? "facile" : "facile", slot: "facile2" },
  ];
}

// ===== src/sports/run/index.ts =====
/**
 * Sport COURSE (registre R10). Extraction MÉCANIQUE de la branche `sp === "run"` de
 * sessionLibrary : le corps des séances n'a pas changé d'un caractère (golden master à 0 écart).
 * Le format `trail` y survit encore pour les plans migrés (`fmt === "trail"`) — le vrai trail
 * est un sport à part depuis R7 (`src/sports/trail/`).
 */
                                                       




function buildRunSessions(kit            )              {
  const { a, fmt, slot, phase, lvl, finisher, beginner, medHold, inj, noVo2, G, S2, P, W, C, Bd, B } = kit;
  const injImp = inj.impact;
  // R4.1 — trail modulaire (registre de disciplines) : volume en TEMPS + D+, allure en
  // GAP/RPE, compétence descente travaillée à part, prudence excentrique si impact fragile.
  const isTrail = fmt === "trail";
  if (slot === "dur1") {
    // C17 — la VO2 survit au budget (dur1) en dev/spéc/peak ; l'allure course passe en dur2.
    // B2/R6.1 (audit v6) — genou : pas de vitesses maximales ni d'à-coups (la VO2 course
    // charge le genou à chaque appui rapide) → seuil contrôlé, même rôle dans la semaine.
    if (inj.list.includes("genou") && (phase === "spec" || phase === "peak" || phase === "dev")) {
      S2.push({ d: "rn", name: "Seuil contrôlé (genou épargné)", note: "Genou fragile : on garde le stimulus aérobie fort mais sans les vitesses maximales ni les à-coups — le seuil remplace la VO2, sur surface souple si possible.", det: "", steps: [W(15, "footing très facile + gammes sans sauts"), B(P(2, 4), P(6, 10), "rn.thr", "2-3min trot très lent", " sur surface souple"), C(10, "footing facile")] });
    } else if ((phase === "spec" || phase === "peak" || phase === "dev") && !noVo2) {
      S2.push({ d: "rn", name: "VO2max", note: "Puissance aérobie maximale : effort max tenable ~3min, récup complète. Maintenue jusqu'à l'affûtage.", det: "", steps: [W(20, "progressif + 4 lignes droites"), B(P(5, 8), 3, "rn.vo2", "2min30 trot"), C(10, "footing très facile")] });
    } else if (finisher || lvl === "debutant") {
      S2.push({ d: "rn", name: "Seuil doux", note: "Le seuil doit rester «confortablement difficile» : tu peux dire quelques mots, pas tenir une conversation. Si ça pique, ralentis.", det: "", steps: [W(15, "footing très facile + 3 lignes droites"), B(P(2, 4), P(6, 10), "rn.thr", "2-3min trot très lent", injImp ? " sur surface souple" : ""), C(10, "footing facile")] });
    } else {
      S2.push({ d: "rn", name: "Seuil progressif", note: "Allure soutenue mais maîtrisée, régulière du 1er au dernier bloc.", det: "", steps: [W(15, "footing + 4 lignes droites"), B(P(3, 4), P(6, 10), "rn.thr", "2min trot"), C(10, "footing")] });
    }
  } else if (slot === "dur2") {
    if (isTrail && (phase === "spec" || phase === "peak") && !injImp && !noVo2)
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
    // B2/R6.1 (audit v6) — pied et hanche : la sortie longue est la séance qui cumule
    // le plus d'impacts — son plafond baisse selon la zone (pied ×0.85, hanche ×0.9).
    if (inj.list.includes("pied")) durCaps.hi = Math.round(durCaps.hi * 0.85);
    else if (inj.list.includes("hanche")) durCaps.hi = Math.round(durCaps.hi * 0.9);
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
  return S2;
}


/** Prédiction run — extraction mécanique de la branche correspondante de `predictRace`. */
function predictRun(kit            )       {
  const { refs, format, items, advice, D, runRange, riegelSec, profWhy } = kit;
  if (refs.thrPace > 0 && RUN_KM[format]) {
    const t = riegelSec(refs.thrPace, RUN_KM[format]);
    items.push({ leg: "Course", value: runRange(t), why: "Riegel depuis ton allure seuil (~1h), exposant 1.06 — la référence des prédictions route" + profWhy });
    D("PRED-run", "Méthode course", "Riegel ^1.06", "Extrapolation standard depuis l'allure tenable une heure");
  } else if (format === "trail") {
    advice.push("Trail : le chrono dépend du D+ et du terrain — repère fiable : allure Z2 à plat, marche assumée dans les pentes raides.");
  } else advice.push("Renseigne ton allure seuil (test : 30min à fond, allure moyenne) pour obtenir une projection chiffrée.");
}

registerSport({
  id: "run",
  mainDiscipline: "rn",
  // La course a DEUX créneaux faciles : le second footing (récup) sert de repli — un
  // coureur déclassé court quand même, plus court et plus souple.
  easyFallbackSlot: "facile2",
  weekSchema: null,
  buildSessions: buildRunSessions,
  predict: predictRun,
  retestTypes: ["thrPace"],
  guards: { runImpactCap: true },
});

// ===== src/sports/bike/index.ts =====
/**
 * Sport VÉLO (registre R10). Extraction mécanique de la branche `sp === "bike"`.
 */
                                                       


function buildBikeSessions(kit            )              {
  const { a, fmt, slot, phase, lvl, finisher, noVo2, S2, P, W, C, B } = kit;
  const clm = fmt === "clm", climb = a.terrain === "montagne" || a.terrain === "vallonne";
  if (slot === "dur1") {
    if (phase === "base") S2.push({ d: "bk", name: "Sweetspot", note: "Effort soutenu mais maîtrisé, cadence 85-95 rpm. Tu dois pouvoir finir chaque bloc sans t'effondrer.", det: "", steps: [W(15, "montée progressive"), B(P(2, 3), P(12, 20), "bk.ss", "5min souple"), C(10, "décrassage")] });
    else if ((phase === "spec" || phase === "peak" || phase === "dev") && !noVo2) S2.push({ d: "bk", name: "VO2max", note: "Intensité maximale tenable 4min, récup longue. La puissance aérobie se maintient jusqu'à l'affûtage.", det: "", steps: [W(20, "progressif + 3 sprints courts"), B(P(4, 6), 4, "bk.vo2", "4min"), C(10, "souple")] });
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
  return S2;
}


/** Prédiction bike — extraction mécanique de la branche correspondante de `predictRace`. */
function predictBike(kit            )       {
  const { refs, format, items, advice, D } = kit;
  const b = BIKE_POWER[format];
  if (refs.ftp > 0 && b) {
    items.push({ leg: "Vélo", value: Math.round(refs.ftp * b.lo) + "–" + Math.round(refs.ftp * b.hi) + "W", why: b.note + " — cible en puissance NORMALISÉE (moyenne pondérée : les pointes montent au-dessus), le chrono dépend du parcours" });
    D("PRED-bike", "Méthode vélo", "% FTP par format", "Prédire un chrono sans connaître le parcours serait mentir ; la puissance cible est transférable partout");
  } else advice.push("Renseigne ta FTP (test 20min × 0.95) pour obtenir tes puissances cibles de course.");
}

registerSport({
  id: "bike",
  mainDiscipline: "bk",
  easyFallbackSlot: "facileR",
  weekSchema: null,
  buildSessions: buildBikeSessions,
  predict: predictBike,
  retestTypes: ["ftp"],
  guards: {},
});

// ===== src/sports/swim/index.ts =====
/**
 * Sport NATATION (registre R10). Extraction mécanique de la branche `sp === "swim"`.
 * Les planchers/plafonds en MÈTRES (C15/C24/C24b) et la sonde de capacité sont déclarés
 * comme garde-fous du module, plus comme tests de sport dispersés dans le générateur.
 */
                                                       



function buildSwimSessions(kit            )              {
  const { a, fmt, slot, phase, beginner, inj, swimDrillGlossary, S2, P, Wm, Cm, Bd } = kit;
  const shoulder = inj.shoulder, ow = a.milieu === "ow" || a.milieu === "mixte";
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
    // B1 (audit v6) — les séances de substitution épaule héritent d'un BUDGET BORNÉ :
    // sans bnd, R3.3 gonflait le bloc jusqu'aux caps génériques (+68% de volume mesuré
    // sur swim/fond/epaule — une blessure qui AUGMENTAIT la charge).
    else if (shoulder && (phase === "spec" || phase === "peak")) S2.push({ d: "sw", name: "Jambes vitesse (épaule épargnée)", note: "Vitesse par les jambes : battements rapides avec planche, l'épaule ne travaille pas. La puissance se maintient sans risque.", det: "", steps: [Wm(200, "souple"), Bd(P(6, 10), 25, "sw.speed", "30s repos", " battements rapides avec planche (jambes seules)", false, "sw"), Object.assign(Bd(1, 200, "sw.easy", "", " éducatifs technique", false, "sw"), { bnd: { floor: 200, cap: 600 } }), Cm(100, "souple")] });
    else if (shoulder) S2.push({ d: "sw", name: "Jambes + technique", note: "Épaule épargnée : le travail passe par les jambes et la technique, la charge articulaire reste nulle.", det: "", steps: [Object.assign(Bd(1, 400, null, "", " séries battements + éducatifs · épargne épaule", false, "sw"), { bnd: { floor: 300, cap: 1200 } })], ...( { plainBody: true }          ) });
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
  return S2;
}


/** Prédiction swim — extraction mécanique de la branche correspondante de `predictRace`. */
function predictSwim(kit            )       {
  const { refs, format, items, advice, D, range } = kit;
  const sw = SWIM_RACE[format];
  if (refs.css > 0 && sw) {
    const t = (sw.dist / 100) * refs.css * sw.factor;
    items.push({ leg: "Natation (" + sw.dist + "m)", value: range(t), why: "CSS × " + sw.factor + (sw.factor < 1 ? " (les distances courtes se nagent plus vite que le seuil)" : sw.factor > 1 ? " (eau libre : navigation et peloton ralentissent)" : " (le 1500m se nage à l'allure CSS)") });
    D("PRED-swim", "Méthode natation", "CSS × facteur distance", "Le Critical Swim Speed est l'allure soutenable — chaque distance de course a son facteur validé");
  } else advice.push("Renseigne ton CSS (test : 400m et 200m chrono → CSS = 200m ÷ (t400−t200)) pour une projection chiffrée.");
}

registerSport({
  id: "swim",
  mainDiscipline: "sw",
  easyFallbackSlot: "facileR",
  weekSchema: null,
  buildSessions: buildSwimSessions,
  predict: predictSwim,
  retestTypes: ["css"],
    // Le temps DANS L'EAU n'est pas le temps de séance (bord de bassin, récup, consignes) :
  // le facteur nage traduit la promesse en volume réellement nagé.
  guards: { smoothOnAuditMetric: true, swimSessionFloors: true, capacityProbe: true, swimTimeFactor: true },
});

// ===== src/sports/tri/index.ts =====
/**
 * Sport TRIATHLON (registre R10). Extraction mécanique de la branche `sp === "tri"`.
 * C'est le sport qui portait le plus de passes gardées par un test de sport (brick, C18b,
 * lissage sur métrique nage) : elles sont désormais des garde-fous DÉCLARÉS.
 */
                                                               




function buildTriSessions(kit            )              {
  const { a, fmt, slot, phase, prog, lvl, finisher, beginner, medHold, dbl, sessionScale, inj, noVo2, swimDrillGlossary, S2, W, Wm, C, Cm, B, Bd } = kit;
  const runInj = inj.list.includes("course");
  const PB = ({ base: [0.35, 0.55], dev: [0.55, 0.75], spec: [0.75, 0.9], peak: [0.9, 1], taper: [0.35, 0.45] }                                    )[phase] || [0.5, 0.8];
  const PT = (lo        , hi        ) => Math.max(1, Math.round((lo + (hi - lo) * (PB[0] + (PB[1] - PB[0]) * prog)) * sessionScale));
  const swimDistCaps = ({ S: { lo: 300, hi: 750 }, M: { lo: 600, hi: 1500 }, "70.3": { lo: 950, hi: 1900 }, Full: { lo: 1600, hi: 3000 } }                                              )[fmt] || { lo: 600, hi: 1500 };
  const swimDist = PT(swimDistCaps.lo, swimDistCaps.hi);
  const triSwimVolCap = ({ S: 1050, M: 2100, "70.3": 3000, Full: 4500 }                          )[fmt] || 2100;
  // C24 — même la nage récup tri : ≥750m pour un non-débutant
  const swShortDist = beginner ? Math.min(600, Math.max(200, Math.round((swimDist * 0.4) / 50) * 50)) : Math.min(1100, Math.max(750, Math.round((swimDist * 0.6) / 50) * 50));
  const swTechDist = Math.max(beginner ? 300 : 750, Math.round((swimDist * 0.5) / 50) * 50);
  let swMain = beginner
    ? { name: "Nage seuil technique (+dist)", note: "Technique d'abord, mais quelques 100m à allure seuil contrôlée pour préparer la course.", steps: [Wm(200, "souple"), Object.assign(Bd(1, swimDist, "sw.css", "repos libre entre séries", ", fractionné en séries régulières, éducatifs entre", false, "sw"), { bnd: { floor: swimDistCaps.lo, cap: triSwimVolCap } }), Cm(100, "relâché")] }
    : { name: "Nage seuil (+dist)", note: "Distance cible atteinte, allure régulière. Fractionné = réponse à intensité.", steps: [Wm(300, "+ 4×50m éducatifs"), Object.assign(Bd(1, swimDist, "sw.css", "15-20s", ", fractionné en séries régulières si besoin", false, "sw"), { bnd: { floor: swimDistCaps.lo, cap: triSwimVolCap } }), Cm(200, "souple")] };
  let swTech = beginner
    ? { name: "Nage éducatifs", note: "Zéro chrono ici : uniquement le geste. Alterne les éducatifs, ne les enchaîne pas en force.", steps: [Wm(100, "souple"), Bd(1, swTechDist, "sw.easy", "20-30s", ", par 50m, 1 point technique à la fois — " + swimDrillGlossary, false, "sw"), Cm(100, "dos souple")] }
    : { name: "Nage vitesse", note: "Fréquence et vitesse contrôlées : la technique ne doit pas se dégrader sur les derniers 50m.", steps: [Wm(200, "+ 4×25m accélérations progressives"), Bd(1, swTechDist, "sw.aero", "30-40s sur les 50m rapides", ", dont la moitié en accélérations de 50m", false, "sw"), Cm(150, "souple")] };
  // B1c (audit v6) — l'épaule existait pour les triathlètes dans le QUESTIONNAIRE mais
  // pas dans le générateur (branche morte : le traitement vivait sous sp === "swim").
  // Ici : mêmes substitutions que le nageur, au budget de la séance remplacée (bnd).
  if (inj.shoulder) {
    const shoulderDist = Math.max(swimDistCaps.lo, Math.round((swimDist * 0.8) / 50) * 50);
    swMain = { name: "Nage seuil contrôlé (épaule)", note: "Volume modéré, technique soignée : on épargne l'épaule, on ne cherche pas la performance brute. Arrêt au moindre signal articulaire.", steps: [Wm(200, "souple + éducatifs doux"), Object.assign(Bd(1, shoulderDist, "sw.css", "20-30s", ", fractionné en 100m, amplitude confortable", false, "sw"), { bnd: { floor: swimDistCaps.lo, cap: shoulderDist } }), Cm(100, "souple")] };
    swTech = { name: "Jambes + technique (épaule épargnée)", note: "Le travail passe par les jambes (battements planche) et la technique : la charge articulaire de l'épaule reste minimale.", steps: [Object.assign(Bd(1, swTechDist, null, "", " séries battements planche + éducatifs · épargne épaule", false, "sw"), { bnd: { floor: 300, cap: swTechDist } })] };
  }
  const swShort = { name: "Nage récup", note: "Récupération dans l'eau : relâchement total, respiration ample — le corps absorbe le travail de la semaine.", steps: [Bd(1, swShortDist, "sw.easy", "", " souple, en blocs de 50m, respiration 3 temps · relâchement total", false, "sw")] };
  if (slot === "dur1") {
    if (dbl) S2.push({ d: "sw", name: swMain.name + " (matin)", note: swMain.note, det: "", steps: swMain.steps });
    if (phase === "base") S2.push({ d: "bk", name: "Sweetspot vélo", note: "Cadence 85-95 rpm, soutenu mais maîtrisé.", det: "", steps: [W(15, "montée progressive"), Object.assign(B(PT(2, 3), PT(12, 18), "bk.ss", "5min souple"), { repCap: 4 }), C(10, "décrassage")] });
    else if ((phase === "spec" || phase === "peak") && !noVo2) S2.push({ d: "bk", name: "VO2max vélo", note: "Puissance aérobie maximale, maintenue jusqu'au pic — pas abandonnée en spécifique (la race-pace vélo est travaillée dans le brick).", det: "", steps: [W(20, "progressif + 3 sprints"), Object.assign(B(PT(4, 6), 4, "bk.vo2", "4min récup"), { repCap: 8 }), C(10, "souple")] });
    else if (phase === "taper") S2.push({ d: "bk", name: "Rappel race-pace", note: "Affûtage : on réveille l'allure course sans générer de fatigue. Court et précis.", det: "", steps: [W(10, "progressif"), Object.assign(B(PT(2, 3), PT(6, 10), "bk.rp", "3min souple"), { repCap: 4 }), C(5, "décrassage")] });
    else if (lvl === "debutant" || finisher) S2.push({ d: "bk", name: "Tempo vélo", note: "Confortablement soutenu, jamais dans le rouge.", det: "", steps: [W(15, "souple"), Object.assign(B(PT(2, 3), PT(8, 15), "bk.ss", "4min souple"), { repCap: 4 }), C(10, "décrassage")] });
    else if (!noVo2) S2.push({ d: "bk", name: "VO2max vélo", note: "Intensité max tenable 4min, récup quasi complète entre.", det: "", steps: [W(20, "progressif + 3 sprints"), Object.assign(B(PT(4, 6), 4, "bk.vo2", "4min récup"), { repCap: 8 }), C(10, "souple")] });
    else S2.push({ d: "bk", name: "Tempo vélo", note: "Confortablement soutenu, jamais dans le rouge — la VO2max attendra la majorité (R6.3).", det: "", steps: [W(15, "souple"), Object.assign(B(PT(2, 3), PT(8, 15), "bk.ss", "4min souple"), { repCap: 4 }), C(10, "décrassage")] });
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
    if (phase === "peak" && !runInj && !medHold && !noVo2 && lvl !== "debutant" && !finisher) S2.push({ d: "rn", name: "VO2max course", note: "Rappels de puissance aérobie course, courts et vifs, jambes déjà entamées par le vélo.", det: "", steps: [W(12, "footing progressif + gammes"), Object.assign(B(PT(4, 6), 2, "rn.vo2", "2min trot"), { repCap: 6 }), C(8, "footing très facile")] });
    else if (phase === "peak" && runInj && !medHold) S2.push({ d: "rn", name: "Allure course (tri, surface souple)", note: "Course blessé : allure cible en contrôle, sur surface souple, jamais dans la douleur.", det: "", steps: [W(12, "footing progressif"), B(1, PT(18, 28), "rn.mara", "", ", sur surface souple"), C(8, "footing très facile")] });
    else S2.push({ d: "rn", name: "Footing facile", note: "Course facile : les jambes apprennent à courir « propre » sans fatigue ajoutée.", det: "", steps: [B(1, PT(ftCaps.lo, ftCaps.hi), "rn.easy", "", runInj ? " · surface souple" : "")], ...( { plainBody: true }          ) });
  } else if (slot === "facile2") S2.push({ d: "sw", name: swShort.name + " courte", note: swShort.note, det: "", steps: swShort.steps, ...( { plainBody: true }          ) });
  else if (slot === "recup") S2.push({ d: "rs", name: "Récup active", det: "mobilité", steps: [] });
  else if (slot === "off") S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  return S2;
}


/** Prédiction tri — extraction mécanique de la branche correspondante de `predictRace`. */
function predictTri(kit            )       {
  const { refs, format, items, advice, D, range, runRange, riegelSec, profWhy } = kit;
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

registerSport({
  id: "tri",
  mainDiscipline: "rn", // la CAP finit la course : c'est la discipline de référence du tri
  easyFallbackSlot: "facileR",
  weekSchema: null,
  buildSessions: buildTriSessions,
  predict: predictTri,
  retestTypes: ["css", "ftp", "thrPace"],
    // Le tri NAGE : il hérite des planchers de séance en mètres (C24/C24b), comme la natation.
  // C'est précisément ce que `sport !== "run"` disait de façon détournée.
  guards: { stripLongOnMedHold: true, singleRunVo2PerWeek: true, smoothOnAuditMetric: true, capacityProbe: true, swimSessionFloors: true },
});

// ===== src/sports/trail/index.ts =====
/**
 * Sport TRAIL (registre R10). Le trail était DÉJÀ modulaire depuis R7 (`trailModel.ts` +
 * `trailLibrary.ts`) : c'est ce précédent que la phase 1 généralise. Son entrée dans le
 * registre ne déplace donc aucun code — elle DÉCLARE ce que le trail avait obtenu par des
 * `if` dispersés, dont le plafond de jours d'appui (D10-3) qui lui échappait justement parce
 * qu'il n'était déclaré nulle part.
 */
                                                       


// Nom UNIQUE dans tout le projet : le bundle (`npm run build:app`) concatène les modules
// dans une seule portée, un `buildSessions` local écraserait le dispatch de sessionLibrary.
function buildTrailSessionsFromKit(kit            )              {
  // Le module trail lit le plan raisonné directement (objectif + axes verticaux) : il n'a
  // pas besoin de la boîte à outils commune, ses séances se décrivent en temps + D+ + D−.
  return buildTrailSessions(kit.r, kit.slot        , kit.phase, kit.prog, kit.weekNum);
}

registerSport({
  id: "trail",
  mainDiscipline: "rn",
  // "facileR", PAS "facile2" : c'est ce que l'ancien code faisait (`sport === "run" ? … : …`
  // ne connaissait que la course). Le déclarer autrement changerait les plans trail — ce
  // serait une DÉCISION, pas une extraction. Candidate à réexaminer (voir R10_DEFECTS.md).
  easyFallbackSlot: "facileR",
  weekSchema: (phase, isRecup, r) => trailWeekSchema(phase, isRecup, r.trail .category),
  buildSessions: buildTrailSessionsFromKit,
  retestTypes: ["thrPace", "vam"],
  // D10-3 — LE drapeau qui manquait : le trail cumule l'impact de la course et la charge
  // excentrique de la descente. Il est plafonné en jours d'appui comme la course.
  guards: { runImpactCap: true },
});

// ===== src/sports/duathlon/tables.ts =====
/**
 * Constantes DUATHLON avec provenance (spec R10 phase 2, §R10.2.1 et §R10.2.4).
 *
 * Distances officielles ITU/World Triathlon pour les formats S et M ; L et Powerman suivent les
 * usages des organisateurs (les distances longues ne sont pas normalisées aussi strictement).
 * Les bornes de séance (`lo`/`hi`) sont des MINUTES de brick, pas les distances de course :
 * elles suivent la même logique que le tri (C21) — un brick d'entraînement n'est pas une course.
 */

/** Segment R1 : distance de course et bornes de brick (min). */
const DUA_RUN1                                                         = {
  S: { km: 5, lo: 6, hi: 12 },
  M: { km: 10, lo: 8, hi: 18 },
  L: { km: 14, lo: 10, hi: 22 },
  PM: { km: 10, lo: 10, hi: 20 }, // Powerman : R1 court pour un vélo très long
};

/** Segment vélo : distance et bornes de brick (min). */
/** Segment vélo : distance et bornes de brick (min) — ALIGNÉES sur `BRICK_BIKE_BOUNDS`
 *  (spec audit 2). Un vélo de duathlon S fait 20 km, exactement comme un tri S : ses bornes
 *  auditées s'appliquent tel quel. Inventer d'autres chiffres ici produisait des bricks que
 *  l'auditeur refusait — 12 violations dures mesurées avant correction. */
const DUA_BIKE                                                         = {
  S: { km: 20, lo: 45, hi: 90 },
  M: { km: 40, lo: 60, hi: 120 },
  L: { km: 60, lo: 70, hi: 150 },
  PM: { km: 150, lo: 150, hi: 300 },
};

/**
 * Segment R2 : distance, bornes de brick, et facteur de fatigue post-vélo.
 * Le facteur reprend l'échelle validée du tri (`TRI_RUN.fatigue`) : plus le vélo est long,
 * plus le R2 est dégradé. Un R2 de duathlon est proportionnellement plus court et plus intense
 * que la CAP d'un triathlon de durée comparable — d'où des facteurs légèrement plus cléments
 * sur les formats courts (on lutte 2,5 km, on ne gère pas 21 km).
 */
const DUA_RUN2                                                                          = {
  S: { km: 2.5, lo: 6, hi: 12, fatigue: 1.04 },
  M: { km: 5, lo: 8, hi: 16, fatigue: 1.06 },
  L: { km: 7, lo: 10, hi: 20, fatigue: 1.08 },
  PM: { km: 30, lo: 25, hi: 55, fatigue: 1.12 },
};

/**
 * §R10.2.4 — LE FACTEUR QUE LE TRI N'A JAMAIS EU : la pré-fatigue du R1 dégrade la puissance
 * vélo tenable. Le triathlon n'a jamais eu besoin de ce sens-là (on y arrive sur le vélo après
 * une natation, qui sollicite peu les jambes) ; en duathlon, on y arrive après une course.
 * Plus le R1 pèse lourd dans l'épreuve, plus la ponction est marquée.
 */
const DUA_BIKE_PREFATIGUE                         = {
  S: 0.98, // 5 km avant 20 km de vélo : ponction faible
  M: 0.96, // 10 km avant 40 : le classique, ~4% de puissance en moins
  L: 0.95,
  PM: 0.93, // 10 km avant 150 km : la gestion prime, la puissance cible descend
};

/**
 * Bande de puissance vélo cible, en fraction de FTP (facteurs Coggan, même échelle que la route
 * et le tri). À NE PAS confondre avec les bornes de brick ci-dessus, qui sont des MINUTES : un
 * segment vélo de duathlon se roule plus fort qu'un vélo de triathlon de durée comparable
 * (aucune natation avant, et une seule course à préserver derrière — plus courte qu'en tri).
 * Le facteur de pré-fatigue (`DUA_BIKE_PREFATIGUE`) s'applique PAR-DESSUS.
 */
const DUA_BIKE_POWER                                             = {
  S: { lo: 0.88, hi: 0.95 }, // ~30min d'effort : proche du seuil
  M: { lo: 0.85, hi: 0.92 },
  L: { lo: 0.82, hi: 0.88 },
  PM: { lo: 0.72, hi: 0.80 }, // 150 km : la gestion prime, on descend nettement
};

/** Durée de préparation minimale par format (§R10.2.1). */
const DUA_MIN_WEEKS                         = { S: 8, M: 12, L: 16, PM: 24 };

/** Plafonds horaires par historique (h/sem au pic) — entre la course et le triathlon court. */
const DUA_HISTORY_CAPS                                         = {
  reprise: { S: 5, M: 7, L: 9, PM: 12 },
  confirme: { S: 7, M: 9, L: 11, PM: 15 },
  ancien: { S: 8, M: 11, L: 13, PM: 18 },
};

/** Heures UTILES par format — au-delà, le volume ne sert plus l'objectif. */
const DUA_UTIL                         = { S: 8, M: 10, L: 13, PM: 17 };

// ===== src/sports/duathlon/index.ts =====
/**
 * Sport DUATHLON (spec R10 phase 2) — course, vélo, course.
 *
 * Le duathlon valide le registre à faible coût : c'est un triathlon amputé de la natation.
 * Mais l'amputation n'est pas neutre — c'est le format le plus chargé en IMPACT COURSE de tout
 * le catalogue : deux segments de course, dont le second sur des jambes déjà entamées, et
 * aucune séance dans l'eau pour absorber du volume sans impact. Le plafond de jours d'appui
 * n'est donc pas une option ici (§R10.2.3 : « non négociable »).
 *
 * Deux briques, dans les DEUX SENS — c'est la spécificité que le tri n'a jamais eue :
 *   - R1 → vélo : le premier segment de course pré-fatigue les jambes AVANT le vélo. Personne
 *     n'arrive frais sur son vélo en duathlon, et ça s'entraîne.
 *   - vélo → R2 : la transition du tri, mais le R2 duathlon est plus court et plus INTENSE
 *     qu'une CAP de half — on n'y gère pas, on y lutte.
 */
                                                               




/** Bandes de progression par phase — même échelle que le tri (le brick monte lentement). */
const PHASE_BAND                                   = {
  base: [0.35, 0.55], dev: [0.55, 0.75], spec: [0.75, 0.9], peak: [0.9, 1], taper: [0.35, 0.45],
};

function buildDuathlonSessions(kit            )              {
  const { a, fmt, slot, phase, prog, lvl, finisher, beginner, medHold, inj, noVo2, sessionScale, S2, W, C, B } = kit;
  const runInj = inj.list.includes("course") || inj.impact;
  const PB = PHASE_BAND[phase] || [0.5, 0.8];
  const PT = (lo        , hi        ) => Math.max(1, Math.round((lo + (hi - lo) * (PB[0] + (PB[1] - PB[0]) * prog)) * sessionScale));
  const f = fmt || "M";

  if (slot === "dur1") {
    // Qualité COURSE : c'est la discipline qui décide un duathlon (deux segments sur trois).
    if ((phase === "spec" || phase === "peak" || phase === "dev") && !noVo2 && !runInj) {
      S2.push({ d: "rn", name: "VO2max course", note: "Le duathlon se gagne à pied : la puissance aérobie course est ta première monnaie. Effort maximal tenable ~3min, récupération complète entre.", det: "",
        steps: [W(20, "progressif + 4 lignes droites"), Object.assign(B(PT(5, 8), 3, "rn.vo2", "2min30 trot"), { repCap: 8 }), C(10, "footing très facile")] });
    } else if (runInj) {
      S2.push({ d: "rn", name: "Seuil course (surface souple)", note: "Zone fragile déclarée : on garde le stimulus fort, sans les vitesses maximales ni les à-coups. Sur surface souple, jamais dans la douleur.", det: "",
        steps: [W(15, "footing très facile + gammes sans sauts"), B(PT(2, 4), PT(6, 10), "rn.thr", "2-3min trot très lent", " sur surface souple"), C(10, "footing facile")] });
    } else if (lvl === "debutant" || finisher) {
      S2.push({ d: "rn", name: "Seuil doux", note: "« Confortablement difficile » : tu peux dire quelques mots, pas tenir une conversation. Si ça pique, ralentis.", det: "",
        steps: [W(15, "footing très facile + 3 lignes droites"), B(PT(2, 4), PT(6, 10), "rn.thr", "2-3min trot très lent"), C(10, "footing facile")] });
    } else {
      S2.push({ d: "rn", name: "Seuil progressif", note: "Allure soutenue mais maîtrisée, régulière du premier au dernier bloc.", det: "",
        steps: [W(15, "footing + 4 lignes droites"), B(PT(3, 4), PT(6, 10), "rn.thr", "2min trot"), C(10, "footing")] });
    }
  } else if (slot === "dur2") {
    // Qualité VÉLO — et en spéc/peak, la puissance se travaille SUR JAMBES ENTAMÉES : c'est
    // là que le duathlon se joue, pas sur un vélo frais.
    if (phase === "spec" || phase === "peak") {
      S2.push({ d: "bk", name: "Seuil vélo (jambes entamées)", note: "10min de course d'abord, puis les blocs vélo : la puissance que tu tiens FRAIS n'est pas celle que tu tiendras après un R1. Cette séance mesure la vraie.", det: "",
        steps: [
          { role: "warmup", durationMin: 10, d: "rn", text: "footing d'ouverture @ allure de course — pré-fatigue volontaire" }          ,
          Object.assign(B(PT(2, 4), PT(8, 15), "bk.thr", "5min souple"), { repCap: 5 }),
          C(10, "décrassage"),
        ] });
    } else if ((phase === "dev") && !noVo2) {
      S2.push({ d: "bk", name: "VO2max vélo", note: "Intensité maximale tenable 4min, récupération quasi complète. Sans impact : c'est le vélo qui porte la charge dure de la semaine.", det: "",
        steps: [W(20, "progressif + 3 sprints courts"), Object.assign(B(PT(4, 6), 4, "bk.vo2", "4min"), { repCap: 8 }), C(10, "souple")] });
    } else {
      S2.push({ d: "bk", name: "Force basse cadence", note: "Gros braquet, cadence 50-60 rpm : c'est musculaire, pas cardio. Sans forcer sur les genoux.", det: "",
        steps: [W(15, "+ montée en intensité"), Object.assign(B(PT(4, 6), 5, "bk.frc", "3min souple", " à 50-60 rpm"), { repCap: 8 }), C(10, "moulinage léger")] });
    }
  } else if (slot === "durLong") {
    if ((phase === "spec" || phase === "peak") && !medHold) {
      // C21 — brick borné par format, ×0.8 en reprise. Les DEUX SENS alternent d'une semaine
      // à l'autre : R1→vélo (pré-fatigue) en semaine paire, vélo→R2 (transition) en impaire.
      const rf = a.history === "reprise" ? C21_REPRISE_BRICK_FACTOR : 1;
      const r1 = DUA_RUN1[f] || { lo: 8, hi: 16 };
      const bk = DUA_BIKE[f] || { lo: 50, hi: 110 };
      const r2 = DUA_RUN2[f] || { lo: 10, hi: 22 };
      const prefatigue = kit.weekNum % 2 === 0;
      if (prefatigue) {
        S2.push({ d: "br", long: true, brick: true, name: "Brick R1 → vélo (pré-fatigue)", note: "La spécificité du duathlon, absente du triathlon : tu montes sur le vélo avec des jambes déjà entamées. Cours le R1 à l'allure de course, enchaîne vite, et découvre la puissance que tu tiens vraiment ensuite — c'est celle-là qu'il faut mémoriser.", det: "",
          steps: [
            { role: "body", leg: "run", durationMin: PT(r1.lo, Math.round(r1.hi * rf)), zone: "rn.mara", intensity: intOf("rn.mara")                     , d: "rn" }          ,
            { role: "body", leg: "bike", durationMin: PT(bk.lo, Math.round(bk.hi * rf)), zone: "bk.z2", intensity: intOf("bk.z2")                      }          ,
          ], ...({ runInj }          ) });
      } else {
        S2.push({ d: "br", long: true, brick: true, name: "Brick vélo → R2 (transition)", note: "Le R2 d'un duathlon est plus court et plus intense que la CAP d'un triathlon long : on n'y gère pas, on y lutte. Vélo en endurance, dernier tiers à l'allure course, puis R2 à l'allure cible sur des jambes de coton.", det: "",
          steps: [
            { role: "body", leg: "bike", durationMin: PT(bk.lo, Math.round(bk.hi * rf)), zone: "bk.z2", intensity: intOf("bk.z2")                      }          ,
            { role: "body", leg: "run", durationMin: PT(r2.lo, Math.round(r2.hi * rf)), d: "rn" }          ,
          ], ...({ runInj }          ) });
      }
    } else {
      // Hors phase spécifique : la longue est du VÉLO. Deux segments de course par semaine
      // suffisent en impact — allonger à pied ici serait le meilleur moyen de casser.
      const bl = DUA_BIKE[f] || { lo: 50, hi: 110 };
      S2.push({ d: "bk", long: true, name: "Sortie longue vélo", note: "L'endurance de base se construit ici, sans impact : en duathlon le volume à pied est déjà le facteur limitant. Allure régulière, mange et bois.", det: "",
        steps: [Object.assign(B(1, PT(Math.round(bl.lo * 1.2), Math.round(bl.hi * 1.6)), "bk.z2"), { bnd: { floor: 45, cap: Math.round(bl.hi * 1.8) } })], ...({ plainBody: true }          ) });
    }
  } else if (slot === "facileR") {
    // Le créneau libéré par la nage devient une COURSE FACILE — mais elle reste comptée dans
    // le plafond de jours d'appui : c'est le garde-fou qui décidera si elle survit.
    const ft = DUA_RUN2[f] || { lo: 10, hi: 22 };
    S2.push({ d: "rn", name: "Footing facile", note: "Endurance fondamentale, allure de conversation. En duathlon c'est le volume facile à pied qui construit la résistance du R2.", det: "",
      steps: [B(1, PT(Math.max(25, ft.lo * 2), Math.max(45, ft.hi * 2)), "rn.easy", "", runInj ? " · surface souple" : "")], ...({ plainBody: true }          ) });
  } else if (slot === "facile2") {
    // §R10.2.2 — le créneau « nage récup » du tri n'a plus d'objet : il devient du vélo
    // récupération (zéro impact) plutôt qu'un troisième jour de course.
    S2.push({ d: "bk", name: "Vélo récup", note: "Moulinage très souple, sans force sur les pédales : on active la circulation sans ajouter un appui de plus dans la semaine.", det: "",
      steps: [B(1, PT(30, 45), null, "", " très souple")], ...({ plainBody: true }          ) });
  } else if (slot === "recup") {
    S2.push({ d: "rs", name: "Repos / mobilité", det: "marche, étirements, mobilité hanches", steps: [] });
  } else if (slot === "off") {
    S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  }
  return S2;
}

/** Prédiction duathlon — TROIS legs séparés, jamais un total (même règle que le tri). */
function predictDuathlon(kit            )       {
  const { refs, format, items, advice, D, runRange, riegelSec, profWhy } = kit;
  const r1 = DUA_RUN1[format], bk = DUA_BIKE[format], pw = DUA_BIKE_POWER[format], r2 = DUA_RUN2[format];
  const pf = DUA_BIKE_PREFATIGUE[format] ?? 0.97;
  if (refs.thrPace > 0 && r1 && r2) {
    items.push({ leg: "R1 (" + r1.km + "km)", value: runRange(riegelSec(refs.thrPace, r1.km)), why: "Riegel depuis ton allure seuil — le R1 se court frais, c'est le seul segment où c'est vrai" + profWhy });
    items.push({ leg: "R2 (" + r2.km + "km)", value: runRange(riegelSec(refs.thrPace, r2.km) * r2.fatigue), why: "Riegel × " + r2.fatigue + " de fatigue post-vélo — un R2 se court plus lentement qu'un R1 de même distance, même quand il est plus court" + profWhy });
  } else advice.push("Renseigne ton allure seuil (test : 30min à fond, allure moyenne) pour obtenir tes deux segments de course.");
  if (refs.ftp > 0 && bk && pw) {
    // §R10.2.4 — le facteur que le tri n'a jamais eu : le R1 dégrade la capacité du vélo.
    items.push({ leg: "Vélo (" + bk.km + "km)", value: Math.round(refs.ftp * pw.lo * pf) + "–" + Math.round(refs.ftp * pw.hi * pf) + "W",
      why: "puissance NORMALISÉE cible, réduite de " + Math.round((1 - pf) * 100) + "% : tu arrives sur le vélo avec un R1 dans les jambes — viser la puissance d'un contre-la-montre frais coûterait ton R2" });
  } else advice.push("Renseigne ta FTP (test 20min × 0.95) pour obtenir ta puissance cible vélo.");
  if (items.length) {
    D("PRED-duathlon", "Méthode duathlon", "3 legs séparés (R1 · vélo · R2)", "Un total additionnerait les incertitudes ET les transitions ; chaque segment a sa méthode, et le vélo porte en plus la pré-fatigue du R1");
    advice.push("Le piège du duathlon est le R1 : parti à l'allure d'un 10 km sec, il te coûte le vélo ET le R2. Cours-le 10 à 15 s/km plus lentement que ta référence sur la distance.");
  }
}

registerSport({
  id: "duathlon",
  mainDiscipline: "rn", // deux segments sur trois se courent : la course décide
  easyFallbackSlot: "facileR",
  weekSchema: null, // le schéma générique par créneaux convient : rien de spécifique à inventer
  buildSessions: buildDuathlonSessions,
  predict: predictDuathlon,
  retestTypes: ["thrPace", "ftp"],
  // §R10.2.3 — NON NÉGOCIABLE. Format le plus chargé en impact course du catalogue : deux
  // segments de course dont un sur jambes entamées, et aucune séance dans l'eau pour absorber
  // du volume sans impact. Sans ce plafond, le générateur produit 6 jours d'appui par semaine.
  guards: { runImpactCap: true, stripLongOnMedHold: true, singleRunVo2PerWeek: true },
});

// ===== src/sports/swimrun/tables.ts =====
/**
 * Constantes SWIMRUN avec provenance (spec R10 phase 3).
 *
 * DÉCISION D'ARCHITECTURE (§R10.3) : le swimrun n'est pas un triathlon sans vélo, c'est un
 * cousin du TRAIL. Distances non standardisées, volume en TEMPS, terrain comme variable
 * première, matériel structurant, prédiction par fourchette large assumée. Ce fichier suit donc
 * le modèle de `trailModel.ts` (constantes nommées, chacune avec son pourquoi), pas celui du tri.
 *
 * Deux nouveautés que ni le trail ni le tri ne couvrent : le BINÔME (le profil cesse d'être
 * individuel) et les RÉFÉRENCES EN TENUE (les refs de bassin/route deviennent des estimations
 * de repli).
 */
                                                 
const SWIMRUN_PROVENANCE         = [];
function srule   (id        , why        , value   )    {
  SWIMRUN_PROVENANCE.push({ id, why });
  return value;
}

                                                                                  
const SWIMRUN_CATEGORIES                    = ["experience", "sprint", "series", "championship"];

/**
 * S1 — repères de calibration (ÖTILLÖ Cannes / championnat du monde). Servent de VALEURS PAR
 * DÉFAUT quand l'athlète n'a pas encore les chiffres de sa course : la distance nagée, le
 * nombre de segments et la plus longue nage sont ce qui dimensionne une prépa swimrun.
 */
const S1_RACE_DEFAULTS                                                                                                                    = srule(
  "S1",
  "les distances de swimrun ne sont pas normalisées : sans repères réels, un plan par défaut serait une fiction — ceux-ci viennent d'épreuves ÖTILLÖ documentées",
  {
    experience: { swimM: 1700, runKm: 4, dplusM: 100, segments: 6, longestSwimM: 400 },
    sprint: { swimM: 2600, runKm: 9.2, dplusM: 250, segments: 10, longestSwimM: 600 },
    series: { swimM: 7850, runKm: 33, dplusM: 900, segments: 20, longestSwimM: 1400 },
    championship: { swimM: 9000, runKm: 61, dplusM: 1900, segments: 25, longestSwimM: 1600 },
  },
);

/** S2 — durée de préparation minimale par catégorie (§R10.3.1). */
const S2_MIN_WEEKS                                  = srule(
  "S2",
  "un championnat du monde de swimrun ne se prépare pas dans l'horizon d'une Experience",
  { experience: 10, sprint: 12, series: 20, championship: 30 },
);

/** S3 — plafonds horaires (h/sem au pic) par catégorie × historique. */
const S3_HISTORY_CAPS                                                  = srule(
  "S3",
  "la structure de référence des coachs spécialisés tient dans 7 à 12 h hebdomadaires : au-delà, ce n'est plus la condition qui limite mais la logistique (eau libre, binôme, matériel)",
  {
    experience: { reprise: 5, confirme: 7, ancien: 8 },
    sprint: { reprise: 6, confirme: 8, ancien: 10 },
    series: { reprise: 8, confirme: 11, ancien: 13 },
    championship: { reprise: 9, confirme: 12, ancien: 15 },
  },
);

/** Heures UTILES par catégorie — au-delà, le volume ne sert plus l'objectif. */
const SWIMRUN_UTIL                                  = { experience: 8, sprint: 10, series: 13, championship: 16 };

/**
 * S4 — RÉFÉRENCES EN TENUE. LE point critique de la spec (§R10.3.3) : il est INTERDIT de
 * dériver l'allure swimrun d'un simple facteur appliqué au CSS bassin ou à l'allure route.
 * Ces facteurs ne sont donc PAS une méthode — ce sont des valeurs de REPLI, marquées comme
 * estimées partout où elles apparaissent, en attendant le test de terrain en tenue complète.
 *
 * Ordre de grandeur observé et documenté par les coachs : un binôme à 6 min/km sur route se
 * retrouve autour de 8 min/km en tenue swimrun (combinaison, chaussures mouillées, terrain) —
 * soit ×1.33. À la nage, combinaison et pull buoy portent, plaquettes tractent, mais la
 * navigation, les vagues et le matériel embarqué coûtent : le net est légèrement plus lent
 * que le CSS bassin.
 */
const S4_GEAR_FACTORS = srule(
  "S4",
  "les allures ne transfèrent PAS : c'est le point de douleur n°2 des pratiquants (le choc du premier test en tenue). Ces facteurs sont un repli explicite, jamais une méthode — le test en tenue les remplace",
  { run: 1.33, swim: 1.08 },
);

/**
 * S5 — COÛT DES TRANSITIONS. Poste de temps à part entière, systématiquement sous-estimé
 * (point de douleur n°3). Une course à 10 segments compte 20 transitions : à 2 min chacune,
 * c'est 40 min — plus que ce que la plupart des binômes croient perdre sur toute la course.
 * Le coût dépend de l'entraînement : c'est précisément ce que la séance pivot travaille.
 */
const S5_TRANSITION_MIN                         = srule(
  "S5",
  "les transitions se répètent à l'entraînement ou se paient en course : le coût unitaire baisse avec la pratique, il ne disparaît jamais",
  { debutant: 2.5, inter: 1.5, avance: 1.0 },
);

/**
 * S6 — EFFET DE BINÔME (longe). Règles ÖTILLÖ : l'équipe reste groupée en permanence, sans
 * dépasser 5 à 10 m d'écart selon l'épreuve. Conséquences MODÉLISÉES, pas mentionnées en note :
 * le suiveur drafte (effort réduit de 15 à 20 %, un bon sillage vaut jusqu'à 10 s/100 m), et
 * attachée, la vitesse de l'équipe se rapproche davantage de celle du nageur le plus RAPIDE
 * que du plus lent.
 */
const S6_TEAM = srule(
  "S6",
  "le choix du partenaire est décrit comme la décision la plus lourde de conséquence du sport : son effet doit être dans le calcul, pas dans un conseil",
  {
    draftEffortSaving: 0.175, // 15-20 % pour le suiveur
    swimSecPer100mGain: 10, // sillage optimal
    fasterSwimmerWeight: 0.6, // la vitesse d'équipe penche vers le plus rapide
  },
);

/**
 * S7 — FROID. L'acclimatation est un AXE PÉRIODISÉ, pas une ligne de conseil : exposition
 * régulière (hebdomadaire au minimum, 2-3× idéalement), avec allongement progressif du temps
 * dans l'eau. Combinaison obligatoire en compétition sous 19 °C (règlement ÖTILLÖ).
 */
const S7_COLD = srule(
  "S7",
  "l'eau froide dégrade la nage et la lucidité avant de mettre en danger : l'acclimatation se planifie comme une qualité physique",
  { wetsuitMandatoryBelowC: 19, acclimationBelowC: 17, minSessionsPerWeek: 1, idealSessionsPerWeek: 2 },
);

/**
 * S8 — PLAQUETTES et ÉPAULE. Les plaquettes sollicitent durement épaules et dos : leur
 * introduction est GRADUELLE, jamais d'emblée au volume cible. Le drapeau `epaule` cesse
 * d'être un simple modificateur de volume — il conditionne cette progression.
 */
const S8_PADDLES = srule(
  "S8",
  "les plaquettes sont l'outil le plus rentable du swimrun et le plus traumatisant pour l'épaule : la progressivité n'est pas une précaution, c'est la condition de leur usage",
  { shareBase: 0.15, shareDev: 0.3, shareSpec: 0.45, shoulderFactor: 0.4 },
);

/**
 * S9 — PROGRESSION DE LA SÉANCE PIVOT, en % du temps de course estimé. Mappée sur les PHASES
 * (base/dev/spec/peak/taper) plutôt que câblée sur 10 semaines : la spec donne une courbe à
 * pic 80 % à trois semaines de la course, ce qui correspond à la fin de `peak`.
 */
const S9_LONG_SHARE                                   = srule(
  "S9",
  "reproduire la durée de course à l'entraînement est contre-productif ; le pic à 80 % trois semaines avant est le compromis documenté",
  { base: [0.2, 0.35], dev: [0.35, 0.55], spec: [0.55, 0.7], peak: [0.7, 0.8], taper: [0.25, 0.4] },
);

/**
 * S10 — PRÉREQUIS D'ENTRÉE. Savoir nager 30 min (~1200 m) en continu et courir 30 min. En
 * dessous, le questionnaire REFUSE les formats longs et propose `experience` : c'est la
 * priorité n°1 du manifeste (santé) appliquée à un sport où l'on est loin du bord.
 */
const S10_PREREQ = srule(
  "S10",
  "en swimrun on est parfois à 700 m du rivage : un nageur qui ne tient pas 30 min continu n'a pas sa place sur un format long, et le dire est plus utile que de générer un plan",
  { minSwimContinuousMin: 30, minSwimContinuousM: 1200, minRunContinuousMin: 30 },
);

/**
 * S11 — MATÉRIEL OBLIGATOIRE (socle ÖTILLÖ). Rappelé en tête de plan. Formulé comme un socle
 * à VÉRIFIER auprès de l'organisateur, jamais comme une liste exhaustive : elle varie.
 */
const S11_GEAR_CHECKLIST           = srule(
  "S11",
  "le matériel obligatoire est un point de douleur récurrent car il varie d'un organisateur à l'autre : on donne le socle et on renvoie au règlement",
  [
    "combinaison une pièce adaptée à la température de l'eau",
    "bandage compressif emballé de façon étanche",
    "sifflet accessible pendant les nages",
    "gobelet ou flasque pliable",
    "longe si tu cours en binôme (obligatoire sur la plupart des épreuves)",
  ],
);

/** Part de nage dans le TEMPS de course (indicatif) — bien supérieure à sa part en distance. */
const SWIM_TIME_SHARE_HINT                                  = { experience: 0.35, sprint: 0.3, series: 0.28, championship: 0.25 };

/** Accès à l'eau libre — sur le modèle exact de `TRAIL_ACCESS` (§R10.3.6). */
const OPENWATER_ACCESS                                                                = {
  toute_annee: { label: "eau libre accessible toute l'année", maxSessionsPerWeek: 3 },
  saisonnier: { label: "eau libre accessible en saison seulement", maxSessionsPerWeek: 1 },
  aucun: { label: "aucun accès à l'eau libre", maxSessionsPerWeek: 0 },
};

// ===== src/sports/swimrun/objective.ts =====
/**
 * Objet COURSE swimrun (§R10.3.2) — construit sur le modèle exact de `trailObjective` : le
 * format seul ne suffit pas, ce sont les DONNÉES de l'épreuve qui dimensionnent la préparation.
 *
 * Le temps estimé se décompose en TROIS POSTES, jamais un bloc :
 *     temps_total = temps_nage + temps_course + temps_transitions
 * Les transitions sont un poste à part entière (§R10.3.7) : à 20 transitions et 2 min l'unité,
 * c'est 40 min — plus que ce que la plupart des binômes croient perdre sur toute la course.
 */
                                                            

// Noms préfixés : le bundle concatène tout dans une portée unique (garde-fou de collision
// dans buildApp.mjs) — `num` et `paceToSec` existent déjà dans trailModel.
const srNum = (v         )         => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Parseur local (évite une dépendance circulaire) : « 1:45 » / « 1'45 » → secondes. */
function srPaceToSec(v         , max        )         {
  const m = String(v ?? "").trim().match(/^(\d{1,3})\s*[:h.'′]\s*(\d{1,2})$/);
  if (!m) {
    const plain = srNum(v);
    return plain > 0 && plain <= max ? plain : 0;
  }
  const sec = +m[2];
  if (sec > 59) return 0;
  const t = +m[1] * 60 + sec;
  return t > 0 && t <= max ? t : 0;
}

/** Catégorie DÉDUITE des données réelles, jamais demandée : c'est le volume qui décide. */
function deduceCategory(swimM        , runKm        )                  {
  const total = runKm + swimM / 1000 * 4; // 1 km nagé ≈ 4 km couru en temps
  if (total >= 55) return "championship";
  if (total >= 28) return "series";
  if (total >= 13) return "sprint";
  return "experience";
}

function swimrunObjective(a                )                   {
  // Le format déclaré ne sert que de source de VALEURS PAR DÉFAUT : dès que l'athlète donne
  // les chiffres de sa course, ce sont eux qui comptent.
  const declared = (a.format                   ) || "sprint";
  const def = S1_RACE_DEFAULTS[declared] || S1_RACE_DEFAULTS.sprint;
  const swimTotalM = Math.max(200, srNum(a.swim_total_m) || def.swimM);
  const runTotalKm = Math.max(1, srNum(a.run_total_km) || def.runKm);
  const dplusM = srNum(a.race_dplus_m) > 0 ? srNum(a.race_dplus_m) : def.dplusM;
  const segments = Math.max(1, Math.round(srNum(a.segments_n) || def.segments));
  const transitions = segments * 2; // une entrée + une sortie d'eau par segment nagé
  const longestSwimM = Math.max(50, srNum(a.longest_swim_m) || def.longestSwimM);
  const waterTempC = srNum(a.water_temp_c) > 0 ? srNum(a.water_temp_c) : null;
  const teamMode                    = a.team_mode === "solo" ? "solo" : "binome";
  const category = deduceCategory(swimTotalM, runTotalKm);
  const level = a.level || "inter";

  // ---- Références EN TENUE : mesurées si le test est fait, estimées sinon (§R10.3.3) ----
  const measuredSwim = srPaceToSec(a.swimrun_swim_pace, 400);
  const measuredRun = srPaceToSec(a.swimrun_run_pace, 1200);
  const paceKnown = measuredSwim > 0 && measuredRun > 0;
  const cssSec = srPaceToSec(a.css, 300) || 130;
  const roadSec = srPaceToSec(a.pace, 1200) || (level === "debutant" ? 390 : level === "avance" ? 280 : 330);
  let swimPaceSec = measuredSwim || Math.round(cssSec * S4_GEAR_FACTORS.swim);
  let runPaceSec = measuredRun || Math.round(roadSec * S4_GEAR_FACTORS.run);

  // ---- Binôme : l'effet de longe est CALCULÉ (S6), pas mentionné ----
  if (teamMode === "binome") {
    // Le suiveur drafte, et attachée l'équipe se rapproche du nageur le plus rapide : la
    // vitesse d'équipe est donc meilleure que la moyenne des deux, sans atteindre le plus fort.
    const gap = srNum(a.team_swim_gap_sec); // écart déclaré (s/100 m) entre les deux
    if (gap > 0) {
      const pull = gap * (1 - S6_TEAM.fasterSwimmerWeight); // ce que le plus lent concède encore
      swimPaceSec = Math.round(swimPaceSec + pull - Math.min(S6_TEAM.swimSecPer100mGain, gap * 0.5));
    } else {
      swimPaceSec = Math.max(60, swimPaceSec - Math.round(S6_TEAM.swimSecPer100mGain * 0.4));
    }
  }

  // ---- Les trois postes ----
  const swimMin = (swimTotalM / 100) * swimPaceSec / 60;
  // Le terrain est du TRAIL : le D+ coûte du temps (repère usuel ~350-450 m/h en nature).
  const runMin = (runTotalKm * runPaceSec) / 60 + (dplusM / 400) * 60 * 0.6;
  const transitionMin = transitions * (S5_TRANSITION_MIN[level] ?? 1.5);
  // Le froid dégrade la nage : sous le seuil d'acclimatation, on l'ANNONCE dans l'estimation.
  const coldF = waterTempC != null && waterTempC < S7_COLD.acclimationBelowC ? 1.06 : 1;
  const mid = (swimMin * coldF + runMin + transitionMin);
  // Fourchette LARGE et annoncée comme telle, exactement comme le trail : afficher une
  // fourchette serrée sur une épreuve où le terrain, l'eau et le binôme commandent serait
  // le mensonge. Elle se resserre un peu quand les références sont MESURÉES en tenue.
  const spread = (category === "experience" || category === "sprint" ? 0.13 : 0.2) * (paceKnown ? 0.8 : 1.15);

  return {
    category, swimTotalM, runTotalKm, dplusM, segments, transitions, longestSwimM, waterTempC, teamMode,
    swimPaceSec, runPaceSec, paceKnown,
    swimMin: Math.round(swimMin * coldF), runMin: Math.round(runMin), transitionMin: Math.round(transitionMin),
    totalMinLo: Math.round(mid * (1 - spread)), totalMinMid: Math.round(mid), totalMinHi: Math.round(mid * (1 + spread)),
    swimTimeShare: Math.max(0.05, Math.min(0.7, (swimMin * coldF) / Math.max(1, mid))),
    why: swimTotalM + " m nagés + " + runTotalKm + " km courus (" + dplusM + " m D+) en "
      + segments + " segments = " + transitions + " transitions · "
      + (paceKnown
        ? "tes allures MESURÉES en tenue"
        : "allures ESTIMÉES depuis ton CSS et ton allure route (facteurs de repli) — fais le test en tenue complète pour les affiner")
      + (teamMode === "binome" ? " · en binôme, effet de longe compris" : " · en solo")
      + (coldF > 1 ? " · eau froide (+6 % sur la nage)" : ""),
  };
}

/** Part de nage attendue dans le temps, par catégorie — repère affiché quand rien n'est saisi. */
function swimTimeShareHint(cat                 )         {
  return SWIM_TIME_SHARE_HINT[cat] ?? 0.3;
}

// ===== src/sports/swimrun/index.ts =====
/**
 * Sport SWIMRUN (spec R10 phase 3).
 *
 * « Le swimrun n'est pas un triathlon sans vélo. C'est un cousin du trail. » (§R10.3) — le
 * module se modélise sur `trailLibrary`, pas sur `tri` : volume en TEMPS, terrain et matériel
 * comme variables premières, prédiction par fourchette large assumée, garde-fous de sécurité.
 *
 * La séance PIVOT n'est PAS un brick : c'est un motif paramétré par la course visée. Quelle que
 * soit sa durée, elle reproduit le NOMBRE DE TRANSITIONS et le POURCENTAGE DE NAGE de l'épreuve.
 * C'est ce qui la distingue d'un enchaînement natation-course quelconque.
 */
                                                               



/** Part de plaquettes autorisée dans la séance, par phase — S8, progressif et jamais d'emblée. */
function paddleShare(phase        , shoulder         )         {
  const base = phase === "base" ? S8_PADDLES.shareBase
    : phase === "dev" ? S8_PADDLES.shareDev
    : phase === "taper" ? S8_PADDLES.shareBase
    : S8_PADDLES.shareSpec;
  return shoulder ? base * S8_PADDLES.shoulderFactor : base;
}

function buildSwimrunSessions(kit            )              {
  const { a, slot, phase, prog, lvl, beginner, medHold, inj, S2, P, W, C, Wm, Cm, B, Bd } = kit;
  const obj = swimrunObjective(a);
  const ow = OPENWATER_ACCESS[a.openwater_access || "saisonnier"] || OPENWATER_ACCESS.saisonnier;
  const noOpenWater = ow.maxSessionsPerWeek === 0;
  const shoulder = inj.shoulder;
  const team = obj.teamMode === "binome";
  const cold = obj.waterTempC != null && obj.waterTempC < S7_COLD.acclimationBelowC;
  const pad = paddleShare(phase, shoulder);
  const gearNote = team ? " Longe attachée : c'est en binôme que ça se joue." : "";

  if (slot === "durLong") {
    // ---- LA SÉANCE PIVOT : le swimrun spécifique (§R10.3.4) ----
    const band = S9_LONG_SHARE[phase] || S9_LONG_SHARE.dev;
    const share = band[0] + (band[1] - band[0]) * prog;
    // S9 dimensionne la pivot en % du temps de COURSE. Elle reste néanmoins une séance dans
    // une semaine : au-delà d'environ la moitié du volume hebdo, ce n'est plus un plan, c'est
    // une course déguisée (et l'auditeur le signale à juste titre au-delà de 55 %).
    // Le plafond suit la semaine EN COURS, pas le pic : sur une semaine allégée, une pivot
    // calibrée sur le pic représenterait 70 % du volume. `sessionScale` porte déjà le rapport
    // de la semaine à la charge de référence.
    const weekCapMin = Math.round((kit.r.volPeak || 8) * 60 * 0.42 * Math.min(1, kit.sessionScale || 1));
    const durMin = Math.min(weekCapMin, Math.max(40, Math.round(obj.totalMinMid * share)));
    // Le motif reproduit la COURSE : mêmes transitions, même part de nage. Sur une séance plus
    // courte, on garde le NOMBRE de transitions et on raccourcit les segments — c'est la
    // compétence « entrer et sortir de l'eau » qui se travaille, pas la distance.
    const segs = Math.max(2, Math.min(obj.segments, Math.round(obj.segments * Math.min(1, share * 1.3))));
    const swimMin = Math.max(4, Math.round(durMin * obj.swimTimeShare));
    // Les transitions consomment du temps réel : elles sortent du budget de la séance
    // (elles ne sont pas de l'entraînement, mais elles occupent la sortie).
    const runMin = Math.max(6, durMin - swimMin - Math.round(segs * 2 * (S5_TRANSITION_MIN[lvl] ?? 1.5)));
    const perSwim = Math.max(2, Math.round(swimMin / segs));
    const perRun = Math.max(3, Math.round(runMin / segs));
    if (noOpenWater) {
      // §R10.3.6 — aucun accès à l'eau libre : on SUBSTITUE et on le DIT, au lieu de prescrire
      // une séance infaisable. Enchaînements courts bassin ↔ tapis/extérieur, en tenue partielle.
      S2.push({ d: "br", long: true,
        name: "Swimrun en substitution (bassin ↔ course)",
        note: "Tu n'as pas d'accès à l'eau libre : cette séance reproduit ce qui est reproductible — les " + segs * 2 + " transitions et la part de nage de ta course, en bassin et sur route. Ce qui NE se substitue pas : la navigation, la houle, le froid et l'entrée en eau vive. Cale au moins deux week-ends en eau libre avant ta course, c'est le meilleur investissement de ta préparation." + gearNote,
        det: "",
        steps: [
          Wm(200, "nage souple, en tenue partielle si le bassin l'autorise"),
          // Les DEUX legs sont des steps à part entière : mettre la course dans un texte de
          // récupération ferait mentir le total de la séance (l'auditeur, lui, la compte).
          { role: "body", leg: "swim", reps: segs, durationMin: perSwim, zone: "sw.aero", d: "sw", intensity: "aero"                     , bnd: { floor: 2, cap: perSwim }, recoveryText: "sortie de bassin sans traîner", suffix: " nage" + (pad > 0 ? " (dont ~" + Math.round(pad * 100) + "% avec plaquettes)" : ""), text: "" }          ,
          { role: "body", leg: "run", reps: segs, durationMin: perRun, d: "rn", zone: "rn.easy", intensity: "easy"                     , bnd: { floor: 3, cap: perRun }, recoveryText: "retour à l'eau immédiat", suffix: " de course entre deux nages", text: "" }          ,
          Cm(150, "souple"),
        ] });
    } else {
      S2.push({ d: "br", long: true,
        name: "Swimrun spécifique (" + segs * 2 + " transitions)",
        note: "LA séance de ta préparation : elle reproduit le nombre de transitions et la part de nage de ta course, quelle que soit sa durée. Entre dans l'eau sans t'arrêter pour ranger tes affaires, sors en courant, et compte le temps que tu perds à chaque passage — c'est là qu'un binôme entraîné gagne une demi-heure." + (cold ? " Eau froide : couvre-toi dès la sortie, la déperdition thermique se joue à la course, pas à la nage." : "") + gearNote,
        det: "",
        steps: [
          W(10, "course d'ouverture progressive, matériel en place"),
          // Nage ET course sont des steps à part entière (§R10.3.4) : le motif alterne les deux
          // `segs` fois. Encoder la course dans un texte de récupération ferait sous-compter la
          // séance de tout son volume de course — l'auditeur l'a relevé, et il avait raison.
          { role: "body", leg: "swim", reps: segs, durationMin: perSwim, zone: "sw.aero", d: "sw", intensity: "aero"                     , bnd: { floor: 2, cap: perSwim }, recoveryText: "sortie d'eau en courant", suffix: " nage en eau libre" + (pad > 0 ? ", ~" + Math.round(pad * 100) + "% avec plaquettes" : "") + (team ? ", longe attachée" : ""), text: "" }          ,
          { role: "body", leg: "run", reps: segs, durationMin: perRun, d: "rn", zone: "rn.easy", intensity: "easy"                     , bnd: { floor: 3, cap: perRun }, recoveryText: "entrée dans l'eau sans t'arrêter", suffix: " de course sur sentier entre deux nages", text: "" }          ,
          C(10, "course très souple, se réchauffer"),
        ] });
    }
  } else if (slot === "dur1") {
    // ---- Qualité NAGE : en tenue quand c'est possible, plaquettes progressives (S8) ----
    if (shoulder) {
      S2.push({ d: "sw", name: "Nage seuil contrôlé (épaule épargnée)", note: "Épaule fragile : volume modéré, technique soignée, et les plaquettes réduites au minimum — ce sont elles qui chargent l'épaule en swimrun. Arrêt au moindre signal articulaire.", det: "",
        steps: [Wm(200, "souple + éducatifs doux"), Bd(P(4, 7), 100, "sw.css", "25-35s", " amplitude confortable, SANS plaquettes", false, "sw"), Cm(150, "souple")] });
    } else if (beginner) {
      S2.push({ d: "sw", name: "Technique + aisance en tenue", note: "En swimrun on nage en chaussures et en combinaison : la position change, les jambes portent moins. Habitue-toi au matériel AVANT de chercher la vitesse — c'est le choc n°1 des débutants.", det: "",
        steps: [Wm(200, "souple"), Bd(P(6, 10), 50, "sw.easy", "repos libre", " en tenue partielle, un point technique à la fois", false, "sw"), Cm(100, "relâché")] });
    } else {
      S2.push({ d: "sw", name: "Seuil CSS + plaquettes", note: "Le seuil se tient sur tous les 100 m : le dernier doit ressembler au premier. Les plaquettes viennent progressivement — elles tractent, mais elles chargent l'épaule." + (pad > 0 ? " Aujourd'hui : environ " + Math.round(pad * 100) + "% de la série avec plaquettes." : ""), det: "",
        steps: [Wm(300, "progressif + 4×50m éducatifs"), Bd(P(6, 10), 100, "sw.css", "15-20s", pad > 0 ? " dont ~" + Math.round(pad * 100) + "% avec plaquettes + pull buoy" : "", false, "sw"), Cm(200, "souple")] });
    }
  } else if (slot === "dur2") {
    // ---- Qualité COURSE : le terrain est du trail, l'impact compte ----
    if (inj.impact) {
      S2.push({ d: "rn", name: "Seuil course (surface souple)", note: "Zone fragile déclarée : stimulus fort, sans vitesses maximales ni à-coups, sur surface souple.", det: "",
        steps: [W(15, "footing très facile"), B(P(2, 4), P(6, 10), "rn.thr", "2-3min trot", " sur surface souple"), C(10, "footing facile")] });
    } else {
      S2.push({ d: "rn", name: "Seuil course sur sentier", note: "En swimrun on court sur des rochers, des racines et des sentiers, jambes mouillées et chaussures pleines d'eau. Cours ce seuil sur le terrain le plus proche de ta course, pas sur piste.", det: "",
        steps: [W(15, "footing progressif sur sentier"), B(P(3, 5), P(5, 9), "rn.thr", "2min trot"), C(10, "footing souple")] });
    }
  } else if (slot === "facileR") {
    // ---- Endurance course, ou acclimatation au froid quand la saison l'exige (S7) ----
    if (cold && !noOpenWater && !medHold) {
      S2.push({ d: "sw", name: "Acclimatation eau froide", note: "L'acclimatation au froid est une qualité qui s'entraîne, pas une affaire de volonté : exposition régulière, temps dans l'eau allongé progressivement. Jamais seul, toujours avec une sortie possible à vue." + (obj.waterTempC != null && obj.waterTempC < S7_COLD.wetsuitMandatoryBelowC ? " Sous " + S7_COLD.wetsuitMandatoryBelowC + " °C la combinaison est de toute façon obligatoire en course." : ""), det: "",
        steps: [Bd(1, Math.max(300, P(400, 1000)), "sw.easy", "", " en eau libre, sortie progressive du temps d'exposition", false, "sw")], ...({ plainBody: true }          ) });
    } else {
      S2.push({ d: "rn", name: "Footing facile", note: "Endurance fondamentale, allure de conversation. En swimrun, courir avec des jambes fatiguées par la nage est la norme : ce volume facile construit cette tolérance.", det: "",
        steps: [B(1, P(30, 55), "rn.easy", "", inj.impact ? " · surface souple" : " · sur sentier si possible")], ...({ plainBody: true }          ) });
    }
  } else if (slot === "facile2") {
    S2.push({ d: "sw", name: "Nage récup + technique", note: "Récupération dans l'eau : relâchement total, respiration ample. C'est aussi le moment de refaire des éducatifs à froid, sans fatigue.", det: "",
      steps: [Bd(1, P(600, 1100), "sw.easy", "", " souple, éducatifs entre les séries", false, "sw")], ...({ plainBody: true }          ) });
  } else if (slot === "recup") {
    S2.push({ d: "rs", name: "Repos / épaules + mobilité", det: "coiffe des rotateurs, mobilité chevilles — les deux zones que le swimrun charge le plus", steps: [] });
  } else if (slot === "off") {
    S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  }
  return S2;
}

/**
 * Structure hebdomadaire de référence (§R10.3.4, convergence des sources) : 2-3 nages,
 * 3-4 courses, 1-2 swimruns spécifiques, 2 séances de renforcement. Le swimrun spécifique
 * tombe le week-end (l'eau libre et le binôme sont des contraintes logistiques).
 */
function swimrunWeekSchema(_phase        , isRecup         )                                     {
  if (isRecup) return [
    { charge: "recup", slot: "recup" }, { charge: "facile", slot: "facile2" }, { charge: "off", slot: "off" },
    { charge: "facile", slot: "facileR" }, { charge: "off", slot: "off" }, { charge: "facile", slot: "facile2" }, { charge: "recup", slot: "recup" },
  ];
  // Lun repos/renfo · Mar nage qualité · Mer course facile · Jeu course qualité · Ven nage récup
  // · Sam SWIMRUN spécifique · Dim course facile
  return [
    { charge: "recup", slot: "recup" }, { charge: "dur", slot: "dur1" }, { charge: "facile", slot: "facileR" },
    { charge: "dur", slot: "dur2" }, { charge: "facile", slot: "facile2" }, { charge: "dur", slot: "durLong" },
    { charge: "facile", slot: "facileR" },
  ];
}

/** Prédiction swimrun (§R10.3.7) — trois postes, fourchette large assumée. Riegel inapplicable. */
function predictSwimrun(kit            )       {
  const { items, advice, D } = kit;
  const obj = kit.swimrun;
  if (!obj) {
    advice.push("Renseigne les données de ta course (distance nagée, distance courue, nombre de segments) pour obtenir une estimation de temps.");
    return;
  }
  const fmtHM = (min        ) => {
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    return h > 0 ? h + "h" + String(m).padStart(2, "0") : m + "min";
  };
  const est = obj.paceKnown ? "" : " — ESTIMÉ d'après ton CSS et ton allure route, fais le test en tenue pour l'affiner";
  items.push({ leg: "Temps estimé", value: fmtHM(obj.totalMinLo) + "–" + fmtHM(obj.totalMinHi),
    why: obj.why + " · fourchette large assumée : sur cette épreuve, le terrain, l'eau et le binôme pèsent plus que la condition physique" });
  items.push({ leg: "Dont nage", value: fmtHM(obj.swimMin) + " (" + Math.round(obj.swimTimeShare * 100) + "% du temps)",
    why: "La nage pèse bien plus lourd en TEMPS qu'en distance : " + Math.round(obj.swimTotalM / 10) / 100 + " km nagés ne représentent qu'une fraction de la distance, mais un quart à un tiers du chrono" + est });
  items.push({ leg: "Dont course", value: fmtHM(obj.runMin),
    why: "Terrain de trail, jambes mouillées, chaussures pleines d'eau : compte une allure nettement plus lente que sur route" + est });
  items.push({ leg: "Dont transitions", value: fmtHM(obj.transitionMin) + " (" + obj.transitions + " passages)",
    why: "Poste à part entière, jamais négligé : " + obj.segments + " segments nagés = " + obj.transitions + " transitions. C'est le temps le plus facile à récupérer — il s'entraîne" });
  if (obj.teamMode === "binome") {
    items.push({ leg: "Effet de binôme", value: "−" + Math.round(S6_TEAM.draftEffortSaving * 100) + "% d'effort pour le suiveur",
      why: "Un bon sillage vaut jusqu'à " + S6_TEAM.swimSecPer100mGain + " s/100 m et supprime la charge de navigation ; attachée, la vitesse de l'équipe se rapproche de celle du nageur le plus rapide" });
  }
  D("PRED-swimrun", "Méthode swimrun", "nage + course + transitions", "Riegel ne s'applique pas : on additionne trois postes mesurés séparément, dont les transitions que tout le monde sous-estime");
  advice.push("Le temps le plus facile à gagner n'est pas dans les jambes : c'est dans les " + obj.transitions + " transitions. Répète-les jusqu'à ce qu'elles soient automatiques.");
  if (!obj.paceKnown) advice.push("Fais le test en tenue COMPLÈTE (combinaison, chaussures, chaussettes, pull buoy, plaquettes, en eau libre, avec ton partenaire et la longe) : 1000 m nagés et 5 à 8 km courus. Un binôme à 6 min/km sur route se retrouve souvent autour de 8 min/km en tenue — tant que ce test n'est pas fait, toutes nos allures sont des estimations.");
  advice.push("Matériel à vérifier auprès de l'organisateur (socle habituel) : " + S11_GEAR_CHECKLIST.join(" · ") + ".");
  if (obj.longestSwimM >= 1000) advice.push("Ta plus longue nage fait " + obj.longestSwimM + " m : c'est la contrainte qui dimensionne ta préparation, thermiquement et mentalement. Nage-la au moins deux fois en conditions réelles avant la course.");
}

registerSport({
  id: "swimrun",
  mainDiscipline: "rn", // la course représente l'essentiel du temps, même si la nage décide
  easyFallbackSlot: "facileR",
  weekSchema: (phase, isRecup) => swimrunWeekSchema(phase, isRecup),
  buildSessions: buildSwimrunSessions,
  predict: predictSwimrun,
  // Le test en tenue passe AVANT le CSS et l'allure route : ceux-ci ne sont qu'un repli.
  retestTypes: ["swimrunSwimPace", "swimrunRunPace", "css", "thrPace"],
  // Le terrain est du trail (impact + excentrique) : le plafond de jours d'appui s'applique.
  // Les planchers de séance en mètres s'appliquent aussi — il y a de la vraie natation ici.
  guards: { runImpactCap: true, swimSessionFloors: true, smoothOnAuditMetric: true, stripLongOnMedHold: true },
});

/** Prérequis d'entrée (S10) — exposé à l'UI, qui refuse les formats longs en dessous. */
function swimrunPrereqBlock(a                                                                        )                {
  const longFormat = a.format === "series" || a.format === "championship";
  if (!longFormat) return null;
  const swimOk = a.swim_continuous === "oui";
  const runOk = a.run_continuous === "oui";
  if (swimOk && runOk) return null;
  return "Pour un format " + (a.format === "championship" ? "championnat du monde" : "World Series")
    + ", il faut savoir nager " + S10_PREREQ.minSwimContinuousMin + " min (environ "
    + S10_PREREQ.minSwimContinuousM + " m) sans s'arrêter et courir " + S10_PREREQ.minRunContinuousMin
    + " min en continu — en swimrun on est parfois à plusieurs centaines de mètres du rivage. "
    + "Commence par un format Experience ou Sprint : ce n'est pas un lot de consolation, c'est l'ordre dans lequel ce sport s'apprend.";
}

// ===== src/generator/weekBuilder.ts =====
/**
 * Construction des semaines V2 — port sémantique des passes de Coach_Pro_V1.5 :
 * schéma jours (7j/10j), redistribution des durs bloqués (sans adjacence), fix peak
 * « reprise », neutralisation médicale, plafond d'impact course, budget de séances,
 * greffes renfo, anti-collage final, garantie de polarisation.
 */
                                                                         



const J = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

                   
                 
               
 

function schema(use10         , phase        , isRecup         , r               )            {
  // R10 phase 1 — un sport peut avoir son PROPRE schéma de semaine (le trail : descente et
  // marche sont des séances à part entière, la longue est le pivot du week-end, le lundi porte
  // le renfo excentrique). Il le déclare dans son module ; sinon, le schéma générique par
  // créneaux s'applique — il est agnostique de la discipline, et c'est très bien ainsi.
  const own = r ? sportModule(r.profile.sport          ).weekSchema : null;
  if (own) return own(phase, isRecup, r )             ;
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
  const mod = sportModule(sp          ); // registre R10 : ce que CE sport déclare
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
      // D2 (audit v6) — la cadence de récup ne tombe JAMAIS sur la phase peak quand
      // celle-ci est courte (≤ ~1 semaine) : sur un petit plan, la seule semaine de pic
      // devenait une récup, et « la semaine max du plan » atterrissait mécaniquement en
      // spec — violation structurelle. La récup glisse à la semaine suivante (taper la refuse
      // déjà, la détente d'affûtage fait office de récupération).
      if (isR && ph.id === "peak" && ph.weeks <= 1) isR = false;
      if (isR) sinceR = 0; else sinceR++;
      sch = schema(r.use10, ph.id, isR, r);
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
      // Le brick tri EST de l'intensité : sur avis médical en attente, la longue tombe aussi.
      const stripLong = guard(sp          , "stripLongOnMedHold");
      if (d.charge === "dur" && (d.slot === "dur1" || d.slot === "dur2" || (stripLong && d.slot === "durLong"))) {
        d.charge = "facile";
        d.slot = mod.easyFallbackSlot;
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
  // C3 (audit v6) — course au-delà de l'horizon (raceBeyondPlan) : le plan démarre
  // MAINTENANT (base longue), il ne s'ancre pas sur une course dans 2 ans.
  const start = a.race_date && !r.raceBeyondPlan
    ? mondayOf(new Date(a.race_date + "T00:00:00Z").getTime()) - (r.weeks - 1) * 7 * MS
    : mondayOf(isFinite(anchorT) ? anchorT : Date.now());
  const iso = (t        ) => new Date(t).toISOString().slice(0, 10);
  days.forEach((d, i) => {
    const ph = d.phase ;
    const prog = ph.weeks > 1 ? (d.week - 1 - ph.start) / (ph.weeks - 1) : 0.5;
    d.prog = Math.max(0, Math.min(1, prog));
    d.date = iso(start + i * MS);
    d.sessions = buildSessions(ctx, d.slot                                       , d.phaseId, d.prog, d.week);
    for (const s of d.sessions) {
      if (s.steps && s.steps.length) renderSess(s, refs, hz, r.baseRefs);
      else if (s.min == null) s.min = 0;
    }
  });

  // C18b — un seul « VO2max course » par semaine de peak : le second créneau facileR
  // redevient footing (sinon 4 jours durs et une semaine de peak plus légère que la spec).
  if (guard(a.sport          , "singleRunVo2PerWeek")) {
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

/** Plafond de jours d'impact course : l'excédent devient cross-training vélo ou repos.
 *  D10-3 — s'applique à `run` ET `trail` (le trail ajoute l'excentrique à l'impact). */
function applyRunImpactCap(r              , days          , refs      , hz         )       {
  const a = r.profile;
  if (!guard(a.sport          , "runImpactCap") || r.maxRunDays == null) return;
  const isTrail = a.sport === "trail"; // le SUBSTITUT est trail-spécifique (vélo en côte)
  const injImpact = r.inj.impact; // R6 (audit v6) — lecture unique des blessures
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
        // En trail, le substitut garde le stimulus qui compte : du VERTICAL sans impact.
        // Un footing plat de remplacement perdrait le sens de la semaine.
        const s            = isTrail
          ? {
            d: "bk", name: "Cross-training vélo en côte (sans impact)",
            note: "Ton plafond de jours d'appui est atteint : ce vélo garde le travail en montée — le muscle et le cardio progressent — sans ajouter d'impact ni de descente. C'est le meilleur échange possible aujourd'hui.",
            det: "",
            steps: [
              { role: "warmup", durationMin: 15, text: "progressif, sur le plat" },
              { role: "body", reps: 4, durationMin: 8, zone: "bk.thr", intensity: intOf("bk.thr")                     , recoveryText: "4min souple en descente", text: "en côte, assis, cadence 60-70" },
              { role: "cooldown", durationMin: 10, text: "souple" },
            ],
          }
          : d.charge === "dur"
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

/**
 * C1 (audit v6) — budget de SÉANCES, pas de jours. La question posée est « séances/sem
 * tenables sans sacrifice ? » : avec doubles=oui, compter les jours livrait 9 séances à
 * qui en avait déclaré 7. Le retrait va du moins coûteux au plus coûteux :
 *   1. 2ᵉ séance des jours doubles (faciles d'abord)  2. jours faciles entiers
 *   3. jours durs hors sortie longue                  4. dernier recours
 * `durLong` et les jours `forced` ne sont JAMAIS touchés (comportement d'origine, correct).
 */
function applySessionBudget(r              , days          )       {
  const toOff = (d        ) => {
    d.charge = "off"; d.slot = "off";
    d.sessions = [{ d: "rs", name: "OFF (budget séances)", det: "repos — respect de ta disponibilité déclarée", steps: [] }];
  };
  const nSess = (d        ) => d.sessions.filter((s) => s.d !== "rs").length;
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    const activeNow = () => wd.filter((d) => d.charge !== "off" && d.charge !== "recup");
    const totalSessions = () => wd.reduce((t, d) => t + nSess(d), 0);
    let over = totalSessions() - r.budgetPerWeek;
    if (over <= 0) continue;
    // 1. les journées à 2 séances rendent leur séance secondaire (la plus légère, jamais
    // la longue ni le brick) — le rythme de la semaine est préservé, seule la densité baisse
    const dbls = () => activeNow().filter((d) => nSess(d) > 1);
    for (const d of [...dbls().filter((x) => x.charge === "facile"), ...dbls().filter((x) => x.charge !== "facile")]) {
      while (over > 0 && nSess(d) > 1) {
        const cand = d.sessions.map((s, i) => ({ s, i })).filter((x) => x.s.d !== "rs" && !x.s.long && !x.s.brick);
        if (!cand.length) break;
        const victim = cand.reduce((x, y) => ((y.s.min || 0) < (x.s.min || 0) ? y : x));
        d.sessions.splice(victim.i, 1);
        over--;
      }
      if (over <= 0) break;
    }
    // 2. puis des journées entières, faciles d'abord
    if (over > 0) {
      const fac = activeNow().filter((d) => d.charge === "facile" && !d.forced);
      for (let i = fac.length - 1; i >= 0 && over > 0; i--) { over -= nSess(fac[i]); toOff(fac[i]); }
    }
    if (over > 0) {
      const durs = activeNow().filter((d) => d.charge === "dur" && !d.forced && d.slot !== "durLong");
      for (let i = durs.length - 1; i >= 0 && over > 0; i--) { over -= nSess(durs[i]); toOff(durs[i]); }
    }
    if (over > 0) {
      const any = activeNow().filter((d) => !d.forced && d.slot !== "durLong");
      for (let i = any.length - 1; i >= 0 && over > 0; i--) { over -= nSess(any[i]); toOff(any[i]); }
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
    // R7 TRAIL (T15) — le renfo EXCENTRIQUE est la protection n°1 contre la casse musculaire
    // en descente. Greffé dès la phase de base, jamais une journée en plus.
    if (r.trail) {
      const quad = r.inj.list.includes("quadriceps");
      graft(faciles[0], { d: "rs", name: "+ Renfo excentrique",
        det: (quad ? "25min" : "20min") + " en fin de séance : squats descendants LENTS (5s à la descente), fentes contrôlées, mollets sur une marche"
          + (r.inj.list.includes("cheville") ? ", puis 10min de proprioception de cheville" : "")
          + " — 💡 Objectif : préparer les cuisses à encaisser la descente. C'est la protection la plus efficace contre la casse musculaire du jour J"
          + (quad ? ", et la seule charge autorisée sur tes quadriceps fragiles" : "") + ".",
        steps: [] });
      continue;
    }
    // NB (R10 phase 1) : le trail a sa PROPRE greffe de renfo excentrique, posée plus haut
    // dans cette fonction (elle `continue`). Lui ajouter en plus la plio de la course
    // ferait doublon — l'extraction reste mécanique, ce n'est pas le lieu d'en décider.
    if (sp === "run") {
      // B2 (audit v6) — la greffe de renfo est CIBLÉE par localisation : tibia → renfo
      // tibial, hanche → gainage hanche/ITB (moyen fessier, bande ilio-tibiale).
      graft(faciles[0], { d: "rs", name: r.injuries.includes("tibia") ? "+ Renfo tibial" : r.injuries.includes("hanche") ? "+ Gainage hanche/ITB" : "+ Renfo + gainage", det: r.injuries.includes("hanche") ? "20min moyen fessier + gainage latéral en fin de footing" : "20min en fin de footing", steps: [] });
      const injImpactP = r.inj.impactAny;
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
      d.slot = sportModule(r.profile.sport          ).easyFallbackSlot;
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
                                                                                                          







function generatePlan(profile                , opts                             )                                           {
  const engine = new TrainingReasoningEngine();
  const r = engine.analyze(profile);
  // R6.2/R6.3 (audit v6, B1) — passe de référence : le plan « sans blessure ni facteur
  // d'âge » sert de PLAFOND au plan réel. Sans elle, la quantification des répétitions et
  // les planchers de séance pouvaient rendre un plan blessé plus gros (+3% mesuré) : une
  // blessure déclarée doit TOUJOURS alléger, jamais alourdir (priorité n°2 du manifeste).
  const refWeekCaps                  = !opts?.noLoadFactor && r.loadFactor < 1
    ? generatePlan(profile, { noLoadFactor: true }).plan.weeks.map((w) =>
        w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.min || 0), 0), 0))
    : null;
  if (opts?.noLoadFactor) r.loadFactor = 1;
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
  // D3 (audit v6) — en NATATION, la métrique de charge de l'auditeur (récup entre
  // répétitions comprise) diverge fortement de s.min : sur la fenêtre saturée du débutant,
  // le générateur croyait la semaine lisse là où l'auditeur voyait un saut. Les passes de
  // lissage utilisent donc SA mesure pour ce sport — on lisse ce qui est mesuré.
  const _auditRefs              = { cssSecPer100m: r.baseRefs.css || 130, thrPaceSecPerKm: r.baseRefs.thrPace || 330 };
  // Le lissage retient la mesure la PLUS GRANDE des deux (s.min du plan, métrique auditeur) :
  // les deux lectures doivent tenir, on ne lisse pas l'une en cassant l'autre.
  const weekMinSmooth = guard(a.sport          , "smoothOnAuditMetric")
    ? (wd          ) => Math.max(weekMin(wd), wd.reduce((t, d) => t + d.sessions.reduce((u, s) => u + sessionLoad(s, _auditRefs).minutes, 0), 0))
    : weekMin;
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
  // R6.2/R6.3 (audit v6) — blessures et âge réduisent la promesse APRÈS la sonde : la
  // réduction porte sur la cible livrable mesurée, pas sur les tailles initiales de
  // séances (où la quantification des répétitions la rendait chaotique).
  if (r.loadFactor < 1) peakH *= r.loadFactor;

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
  // D3/D4/D10 (audit v6) — la courbe se lisse sur les minutes LIVRÉES, pas seulement sur
  // la charge modélisée : les planchers de séance font dériver le rendu, alors la cible
  // de chaque semaine se cale sur ce qui a réellement été rendu la semaine d'avant.
  let _lastWeekMin = 0; // minutes livrées de la semaine précédente (toutes)
  let _prevChargeMin = 0; // minutes livrées de la dernière semaine de CHARGE
  // Quand les planchers bloquent le scaling vers le bas, la FRÉQUENCE cède (même principe
  // que R3.13 en affûtage) : le jour facile le plus léger passe OFF.
  const cutLightestEasyDay = (wd2          , why        , minActive = 3)          => {
    const active = wd2.filter((d) => d.charge !== "off" && d.sessions.some((s) => s.d !== "rs"));
    if (active.length <= minActive) return false;
    const cand = active.filter((d) => (d.charge === "facile" || d.charge === "recup") && !d.forced && !d.sessions.some((s) => s.long || s.brick));
    if (!cand.length) return false;
    const dayMin = (d2        ) => d2.sessions.reduce((t, s) => t + (s.min || 0), 0);
    const victim = cand.reduce((x, y) => (dayMin(y) < dayMin(x) ? y : x));
    victim.charge = "off";
    victim.slot = "off";
    victim.sessions = [{ d: "rs", name: "OFF (lissage)", det: "repos — " + why, steps: [] }];
    return true;
  };
  // Coupe par SÉANCE (plus fine que par jour) : la plus petite séance non-longue saute.
  // minRemainMin : ne jamais couper en-dessous (une coupe trop profonde crée le saut
  // de charge qu'elle voulait éviter, mesuré +87% sur bike/crit).
  const cutSmallestSessionIn = (wd2          , minRemainMin = 0)          => {
    const cur = weekMin(wd2);
    let victim                                                = null;
    for (const skipForced of [true, false]) {
      for (const d of wd2) {
        if (skipForced && d.forced) continue;
        d.sessions.forEach((s, si) => {
          if (s.d === "rs" || s.long || s.brick) return;
          const m = s.min || 0;
          if (!victim || m < victim.min) victim = { d, si, min: m };
        });
      }
      if (victim) break; // repli : si tous les jours candidats sont « forcés », on coupe quand même une séance (jamais longue/brick)
    }
    if (!victim) return false;
    const v = victim                                          ;
    if (minRemainMin > 0 && cur - v.min < minRemainMin) return false;
    v.d.sessions.splice(v.si, 1);
    if (!v.d.sessions.some((s) => s.d !== "rs")) {
      v.d.charge = "off";
      v.d.slot = "off";
      v.d.sessions = [{ d: "rs", name: "OFF (équilibre du bloc)", det: "repos — la semaine la plus chargée du plan reste la semaine de pic", steps: [] }];
    }
    return true;
  };
  const nSessIn = (wd2          ) => wd2.reduce((t, d) => t + d.sessions.filter((s) => s.d !== "rs").length, 0);
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
    // D3/D4/D10 (audit v6) — cible calée sur le LIVRÉ de la semaine précédente :
    // charge ≤ dernière charge ×C22 · récup ≤ semaine précédente · affûtage jamais remontant.
    // R6.2/R6.3 (audit v6, B1) — plafond de référence : jamais plus que le même plan sans
    // blessure ni facteur d'âge, semaine par semaine. Garantie structurelle, pas un réglage.
    if (refWeekCaps && refWeekCaps[w] != null) targetH = Math.min(targetH, (refWeekCaps[w] / 60) * r.loadFactor);
    if (ph.id !== "taper" && !isRW && _prevChargeMin > 0) targetH = Math.min(targetH, (_prevChargeMin / 60) * C22_MAX_WEEKLY_GROWTH);
    if (isRW && _lastWeekMin > 0) targetH = Math.min(targetH, (_lastWeekMin / 60) * 0.95);
    if (ph.id === "taper" && _lastWeekMin > 0) targetH = Math.min(targetH, (_lastWeekMin / 60) * 0.98);
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
    // C24/C24b — plancher de SÉANCE nage : avec des cibles honnêtes (sonde V2.1), R3.3
    // réduit aussi les séances de qualité — les blocs à répétitions n'ont pas de plancher
    // de total. On remonte la séance entière : ≥750m (non-débutant), ≥600m (débutant, D6 —
    // le manifeste interdit la « sortie piscine qui ne vaut pas le déplacement » à tous).
    if (guard(a.sport          , "swimSessionFloors")) {
      const swFloor = r.beginner ? C24B_MIN_SWIM_SESSION_BEGINNER_M : 750;
      const raised                                = [];
      for (const d of wd)
        for (const s of d.sessions) {
          if (s.d !== "sw" || !s.steps || !s.steps.length) continue;
          const meters = s.steps.reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
          if (meters === 0 || meters >= swFloor) continue;
          const body = s.steps.filter((st) => st.role === "body" && st.distanceM != null).sort((x, y) => (y.reps || 1) * (y.distanceM || 0) - (x.reps || 1) * (x.distanceM || 0))[0];
          if (!body || !body.distanceM) continue;
          const missing = swFloor - meters;
          if ((body.reps || 1) > 1) body.reps = (body.reps || 1) + Math.ceil(missing / body.distanceM);
          else body.distanceM = Math.ceil((body.distanceM + missing) / 25) * 25;
          raised.push({ d, s });
        }
      renderWeek(wd);
      // D6/B1 (audit v6) — si les remontées au plancher font déborder la semaine de sa
      // cible, la FRÉQUENCE cède, pas la taille : la plus petite séance remontée saute
      // (une piscine sous le plancher ne vaut pas le déplacement ; la gonfler au-delà du
      // budget gonflerait la semaine — mesuré +5% sur les plans blessés).
      // jamais en semaine de PEAK : c'est elle qui doit rester la plus grosse du plan
      for (let g = 0; g < 2 && ph.id !== "peak" && raised.length && weekMin(wd) > targetH * 60 * 1.03; g++) {
        raised.sort((x, y) => (x.s.min || 0) - (y.s.min || 0));
        const victim = raised.shift() ;
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
    if (r.beginner && guard(a.sport          , "swimSessionFloors")) {
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
              const cut = Math.min(st.reps  - 1, Math.ceil(over / st.durationMin ));
              st.reps = st.reps  - cut;
              over -= cut * st.durationMin ;
            } else {
              const cut = Math.min(st.durationMin  - 20, Math.ceil(over));
              if (cut > 0) { st.durationMin = st.durationMin  - cut; over -= cut; }
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
    const wmW = (w        ) => weekMin(w.days            );
    const nSess = (w        ) => nSessIn(w.days            );
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
          scaleWeekBody(w.days            , Math.max(0.8, (peakBest * (domCap - 0.04)) / before));
          renderWeek(w.days            );
          if (before - wmW(w) < 0.5) break; // les planchers bloquent — passer à la coupe
        }
        // 2) plancher de coupe : couper plus bas recréerait un saut vers la suivante
        for (let g = 0; g < 3 && wmW(w) > peakBest * domCap && nSess(w) > 3; g++) {
          if (!cutSmallestSessionIn(w.days            , peakBest * (domCap - 0.09))) break;
          renderWeek(w.days            );
        }
        const vr = Math.round((wmW(w) / 60) * 10) / 10;
        if (vr < w.vol) { w.vol = vr; w.vol_real = vr; }
      }
      for (const w of wl.filter((x) => x.phase.id === "taper")) {
        for (let g = 0; g < 3 && wmW(w) > peakBest * R313_TAPER_MAX_VS_PEAK && nSess(w) > 2; g++) {
          if (!cutSmallestSessionIn(w.days            )) break;
          renderWeek(w.days            );
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
            scaleWeekBody(w.days            , Math.max(0.7, (prevT * 0.97) / before));
            renderWeek(w.days            );
            if (before - wmW(w) < 0.5) break;
          }
          for (let g = 0; g < 3 && wmW(w) > prevT && nSess(w) > 2; g++) {
            if (!cutSmallestSessionIn(w.days            )) break;
            renderWeek(w.days            );
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
            if (!cutSmallestSessionIn(w.days            )) break;
            renderWeek(w.days            );
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
  if (guard(a.sport          , "swimSessionFloors")) {
    const swFloorF = r.beginner ? C24B_MIN_SWIM_SESSION_BEGINNER_M : 750;
    for (const w of wl) {
      const wd2 = w.days            ;
      let changed = false;
      for (const d of wd2)
        for (const s of d.sessions) {
          if (s.d !== "sw" || !s.steps || !s.steps.length) continue;
          const totOf = () => s.steps .reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
          const body = s.steps.filter((st) => st.role === "body" && st.distanceM != null).sort((x, y) => (y.reps || 1) * (y.distanceM || 0) - (x.reps || 1) * (x.distanceM || 0))[0];
          if (!body || !body.distanceM) continue;
          const t0 = totOf();
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
    const harmonizeOrdered = ()       => {
      let prevCharge = 0, prevWeek = 0, maxWeek = 0;
      for (const w of wl) {
        const wd2 = w.days            ;
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
      const wmW2 = (w        ) => weekMin(w.days            );
      const bestPeakW = wl.filter((w) => w.phase.id === "peak" && !w.isRecup).sort((x, y) => wmW2(y) - wmW2(x))[0];
      if (bestPeakW) {
        const maxCharge = Math.max(0, ...wl.filter((w) => !w.isRecup && w.phase.id !== "taper" && w !== bestPeakW).map(wmW2));
        // le pic monte, mais JAMAIS au-delà de +10% de la semaine qui le précède (C22)
        const prevOfPeak = wl.filter((w) => w.num < bestPeakW.num && !w.isRecup && w.phase.id !== "taper").pop();
        const raiseCap = Math.min(prevOfPeak ? wmW2(prevOfPeak) * C22_MAX_WEEKLY_GROWTH : Infinity, capH * 60);
        for (let g = 0; g < 2 && wmW2(bestPeakW) < maxCharge && nSessIn(bestPeakW.days            ) < r.budgetPerWeek; g++) {
          const wd2 = bestPeakW.days            ;
          const donor = wd2.flatMap((d) => d.sessions).filter((s) => s.d === "sw" && s.steps && s.steps.length && !s.long).sort((x, y) => (x.min || 0) - (y.min || 0))[0];
          const restDay = wd2.find((d) => !d.forced && !d.sessions.some((s) => s.d !== "rs"));
          if (!donor || !restDay) break;
          if (wmW2(bestPeakW) + (donor.min || 0) > raiseCap) break;
          const clone = structuredClone(donor)             ;
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
          for (let g = 0; g < 3 && wmW2(w) > peakM && nSessIn(w.days            ) > 2; g++) {
            if (!cutSmallestSessionIn(w.days            )) break;
            renderWeek(w.days            );
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
      const wd2 = w.days            ;
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
    const stepsOf = (w        ) => (w.days            ).flatMap((d) => d.sessions.flatMap((s) => s.steps || []));
    const upOf = (w        ) => stepsOf(w).reduce((t, st) => t + (st.dplusM || 0) * (st.reps || 1), 0);
    const downOf = (w        ) => stepsOf(w).reduce((t, st) => t + (st.dmoinsM || 0) * (st.reps || 1), 0);
    // Cohérence physique d'abord : un bloc en montée de N minutes à X m/h fait N/60×X mètres.
    // Sans ce recalcul, le scaling du TEMPS (R3.3) laissait le D+ figé à sa valeur initiale.
    const syncUpFromDuration = (w        ) => {
      for (const st of stepsOf(w)) {
        if (st.gradient !== "up" || !st.durationMin || !st.dplusM) continue;
        const z = String(st.zone || "");
        const share = z === "tr.vam" ? 1.0 : z === "tr.asc" ? 0.89 : z === "tr.climb" ? 0.76 : z === "tr.hike" ? 0.52 : 0.42;
        st.dplusM = Math.max(20, Math.round((st.durationMin / 60) * r.trail .vam * share / 5) * 5);
      }
    };
    const scaleVert = (w        , fUp        , fDown        ) => {
      for (const st of stepsOf(w)) {
        if (st.dplusM) st.dplusM = Math.max(20, Math.round((st.dplusM * fUp) / 10) * 10);
        if (st.dmoinsM) st.dmoinsM = Math.max(20, Math.round((st.dmoinsM * fDown) / 10) * 10);
        // T2c — cohérence physique : sur une BOUCLE (bloc `rolling` ou `flat`), on redescend
        // exactement ce qu'on a monté, jamais plus. Sans cette borne, la mise à l'échelle
        // indépendante des deux axes affichait « D+ 460m / D− 540m » sur une sortie longue :
        // impossible sur le terrain, et un entraîneur le verrait au premier coup d'œil.
        // Seuls les blocs de DESCENTE dédiés (navette, remontée mécanique) portent du D−
        // sans D+ correspondant — c'est justement leur raison d'être.
        if (st.gradient !== "down" && st.dmoinsM && (st.dplusM || 0) > 0 && st.dmoinsM > st.dplusM ) st.dmoinsM = st.dplusM ;
      }
    };
    // T3 — aucune qualité ni descente dans les 48h suivant une sortie à fort D− : les
    // dommages excentriques culminent 24-48h après l'effort. La règle était DÉCLARÉE dans le
    // registre depuis R4 ; elle s'applique enfin. La sortie LONGUE n'est jamais supprimée
    // (c'est le pivot de la semaine) : elle perd son dénivelé et son intensité, pas sa place.
    const applyEccentricRecovery = () => {
      const allDays = wl.flatMap((w) => (w.days            ).map((d) => ({ w, d })));
      const dayDown = (d        ) => d.sessions.reduce((t, s) => t + (s.steps || []).reduce((u, st) => u + (st.dmoinsM || 0) * (st.reps || 1), 0), 0);
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
              d: "rn", name: "Footing plat de récupération (post-descente)",
              note: "La grosse descente d'il y a moins de 48 h a créé des micro-lésions dans tes cuisses : elles culminent maintenant. Aucune qualité, aucune descente aujourd'hui — du plat très souple, c'est ce qui répare le plus vite.",
              det: "",
              steps: [{ role: "body", durationMin: 30, gradient: "flat", zone: "tr.easyup", mode: "run", surface: "route" }          ],
            }             ];
          }
          renderWeek(nxt.w.days            );
        }
      }
    };
    applyEccentricRecovery();

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
        renderWeek(w.days            );
      }
      if (w.phase.id !== "taper" && !w.isRecup) { prevUp = upOf(w); prevDown = downOf(w); }
    }
    }
    // Volumes recalculés après ces passes (le D+ ne change pas les minutes, la substitution T3 oui)
    for (const w of wl) {
      const vr = Math.round((weekMin(w.days            ) / 60) * 10) / 10;
      if (vr !== w.vol) { w.vol = vr; w.vol_real = vr; }
    }
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
        const mainD = sportModule(a.sport          ).mainDiscipline;
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

/** Minutes d'une semaine mesurées avec le MODÈLE DE L'AUDITEUR (récup inter-répétitions
 *  comprise) : c'est la seule base honnête quand on répare une violation qu'il a détectée. */
function auditWeekMin(w                    , refs      )         {
  const r2              = { cssSecPer100m: refs.css || 130, thrPaceSecPerKm: refs.thrPace || 330 };
  return w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + sessionLoad(s, r2).minutes, 0), 0);
}

/** Réparations ciblées : violation → action locale sur le plan. Exporté pour la démo de sabotage. */
function applyTargetedRepairs(plan        , audit           , refs      , hz                        , baseRefs      , level         , volMaxH         )           {
  const applied           = [];
  const beginner = level === "debutant";
  const swimFloorM = beginner ? 600 : 750; // C24/C24b — une réparation ne crée jamais une séance qui ne vaut pas le déplacement
  const swimCapM = beginner ? 850 : Infinity; // C15
  // Après toute réduction, une séance nage est ramenée dans sa fenêtre [plancher, plafond]
  const fixSwimBounds = (s                                              )       => {
    if (s.d !== "sw" || !s.steps || !s.steps.length) return;
    const tot = () => s.steps .reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
    const body = s.steps.filter((st) => st.role === "body" && st.distanceM != null).sort((x, y) => (y.reps || 1) * (y.distanceM || 0) - (x.reps || 1) * (x.distanceM || 0))[0];
    if (!body || !body.distanceM) return;
    const t0 = tot();
    if (t0 > 0 && t0 < swimFloorM) {
      const missing = swimFloorM - t0;
      if ((body.reps || 1) > 1) body.reps = (body.reps || 1) + Math.ceil(missing / body.distanceM);
      else body.distanceM = Math.ceil((body.distanceM + missing) / 25) * 25;
    } else if (t0 > swimCapM) {
      const excess = t0 - swimCapM;
      if ((body.reps || 1) > 1) body.reps = Math.max(1, (body.reps || 1) - Math.ceil(excess / body.distanceM));
      else body.distanceM = Math.max(100, Math.floor((body.distanceM - excess) / 25) * 25);
    }
  };

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
            fixSwimBounds(s);
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

  // D2 (audit v6) — tri : la semaine pic DOIT contenir le brick (spec audit 2). Les
  // cycles 10 jours / budgets serrés pouvaient le faire glisser hors du pic : on le
  // réintroduit en clonant le brick d'une semaine voisine à la place de la longue.
  if (audit.peakHasBrick === false) {
    const peakAudits = audit.weeks.filter((w) => w.phaseId === "peak");
    const ref = audit.peak && audit.peak.phaseId === "peak" ? audit.peak : peakAudits.reduce((a, b) => (b.prescribedMin > (a?.prescribedMin ?? 0) ? b : a), null                                 );
    const wk = ref ? plan.weeks.find((w) => w.num === ref.num) : undefined;
    const donor = plan.weeks.flatMap((w) => w.days.flatMap((d) => d.sessions)).find((s) => s.brick && s.steps && s.steps.length);
    if (wk && donor) {
      const target = wk.days.find((d) => d.sessions.some((s) => s.long && !s.brick)) || wk.days.find((d) => !d.forced && d.sessions.some((s) => s.d !== "rs" && !s.brick && !s.long));
      if (target) {
        const clone = structuredClone(donor);
        renderSess(clone, refs, hz, baseRefs);
        target.sessions = [clone];
        target.charge = "dur";
        applied.push("S" + wk.num + " : brick réintroduit dans la semaine pic (spec audit 2 — il avait glissé hors du pic)");
        // le brick ajouté ne crée ni saut de charge ni dépassement de vol_max (C3)
        const prevW = plan.weeks.filter((w) => w.num < wk.num && !w.isRecup && w.phase.id !== "taper").pop();
        if (prevW) {
          const cap = Math.min(wMinOf(prevW) * 1.1, volMaxH ? volMaxH * 60 : Infinity);
          for (let g = 0; g < 4 && wMinOf(wk) > cap; g++) {
            const f = Math.max(0.6, cap / wMinOf(wk));
            for (const d of wk.days)
              for (const s of d.sessions) {
                if (!s.steps || !s.steps.length) continue;
                for (const st of s.steps) {
                  if (st.role !== "body") continue;
                  if (st.reps && st.reps > 1) st.reps = Math.max(1, Math.floor(st.reps * f));
                  else if (st.durationMin) st.durationMin = Math.max(8, Math.round(st.durationMin * f));
                  else if (st.distanceM) st.distanceM = Math.max(200, Math.round((st.distanceM * f) / 25) * 25);
                }
                fixSwimBounds(s);
                renderSess(s, refs, hz, baseRefs);
              }
          }
        }
      }
    }
  }

  // D2 (audit v6) — la semaine de volume max doit tomber en phase peak : si une semaine
  // hors peak dépasse la meilleure semaine peak, son corps est réduit juste sous elle.
  if (!audit.peakInPeakPhase && audit.peak && audit.peak.phaseId !== "peak") {
    const peakBest = Math.max(0, ...audit.weeks.filter((w) => w.phaseId === "peak").map((w) => w.prescribedMin));
    const offender = plan.weeks.find((w) => w.num === audit.peak.num);
    if (offender && peakBest > 0 && audit.peak.prescribedMin > 0) {
      // f ≤ 0.97 TOUJOURS : une « réduction » ne remonte jamais le volume (bug mesuré ×1.27)
      const f = Math.min(0.97, Math.max(0.5, (peakBest * 0.92) / audit.peak.prescribedMin));
      for (const d of offender.days)
        for (const s of d.sessions) {
          if (!s.steps || !s.steps.length) continue;
          for (const st of s.steps) {
            if (st.role !== "body") continue;
            if (st.reps && st.reps > 1) st.reps = Math.max(1, Math.floor(st.reps * f));
            else if (st.durationMin) st.durationMin = Math.max(10, Math.round(st.durationMin * f));
            else if (st.distanceM) st.distanceM = Math.max(200, Math.round((st.distanceM * f) / 25) * 25);
          }
          fixSwimBounds(s);
          renderSess(s, refs, hz, baseRefs);
        }
      applied.push("S" + offender.num + " (" + audit.peak.phaseId + ") : volume réduit ×" + f.toFixed(2) + " — la semaine max doit rester en phase peak");
      // planchers de séance (nage surtout) : si le scaling ne peut pas mordre (f proche
      // de 1, séances au plancher), la fréquence cède — mais BORNÉE : jamais sous 0.9×
      // la semaine peak de référence (la version précédente pouvait vider la semaine, S4 → 0min).
      const bestPeakWk = plan.weeks.filter((w) => w.phase.id === "peak").sort((x, y) => wMinOf(y) - wMinOf(x))[0];
      for (let g = 0; g < 2 && bestPeakWk && wMinOf(offender) > wMinOf(bestPeakWk); g++) {
        let victim                                                                   = null;
        for (const d of offender.days) {
          if (d.forced) continue;
          d.sessions.forEach((s, si) => {
            if (s.d === "rs" || s.long || s.brick) return;
            const m = s.min || 0;
            if (!victim || m < victim.min) victim = { d, si, min: m };
          });
        }
        if (!victim) break;
        const v = victim                                                             ;
        if (wMinOf(offender) - v.min < wMinOf(bestPeakWk) * 0.9) break;
        v.d.sessions.splice(v.si, 1);
        if (!v.d.sessions.some((s) => s.d !== "rs")) {
          v.d.charge = "off";
          v.d.sessions = [{ d: "rs", name: "OFF (équilibre du bloc)", det: "repos — la semaine la plus grosse du plan reste la semaine de peak", steps: [] }];
        }
        applied.push("S" + offender.num + " : séance retirée — la semaine max doit rester en phase peak (les planchers bloquaient la réduction)");
      }
    }
  }

  // D2/D3 (audit v6) — saut de volume réel > seuil dur entre semaines de charge : la
  // semaine fautive est ramenée juste sous le seuil (mesure de l'auditeur, réparation plan).
  if (audit.auditJumpsHard > 0) {
    let prev                                 = null;
    for (const wa of audit.weeks) {
      if (wa.isRecup || wa.phaseId === "taper") continue;
      if (prev && prev.prescribedMin > 0 && wa.prescribedMin > prev.prescribedMin * 1.25) {
        const wk = plan.weeks.find((w) => w.num === wa.num);
        if (wk) {
          const f = Math.max(0.5, (prev.prescribedMin * 1.2) / wa.prescribedMin);
          for (const d of wk.days)
            for (const s of d.sessions) {
              if (!s.steps || !s.steps.length) continue;
              for (const st of s.steps) {
                if (st.role !== "body") continue;
                if (st.reps && st.reps > 1) st.reps = Math.max(1, Math.floor(st.reps * f));
                else if (st.durationMin) st.durationMin = Math.max(10, Math.round(st.durationMin * f));
                else if (st.distanceM) st.distanceM = Math.max(200, Math.round((st.distanceM * f) / 25) * 25);
              }
              fixSwimBounds(s);
              renderSess(s, refs, hz, baseRefs);
            }
          applied.push("S" + wk.num + " : saut de charge lissé ×" + f.toFixed(2) + " (manifeste : progression sans à-coups)");
          // Si les planchers de séance bloquent la réduction (nage surtout : fenêtre
          // [600, 850]m), la FRÉQUENCE cède — mesuré sur la métrique de l'auditeur, qui
          // compte la récup inter-répétitions que le générateur ne voit pas.
          const nSess = () => wk.days.reduce((t, d) => t + d.sessions.filter((x) => x.d !== "rs").length, 0);
          const est = () => auditWeekMin(wk, refs);
          for (let g = 0; g < 3 && est() > prev.prescribedMin * 1.2 && nSess() > 3; g++) {
            let victim                                                             = null;
            for (const d of wk.days) {
              if (d.forced) continue;
              d.sessions.forEach((x, si) => {
                if (x.d === "rs" || x.long || x.brick) return;
                const m = x.min || 0;
                if (!victim || m < victim.min) victim = { d, si, min: m };
              });
            }
            if (!victim) break;
            const v = victim                                                       ;
            v.d.sessions.splice(v.si, 1);
            if (!v.d.sessions.some((x) => x.d !== "rs")) {
              v.d.charge = "off";
              v.d.sessions = [{ d: "rs", name: "OFF (lissage de charge)", det: "repos — la progression se fait sans à-coups : cette semaine ne bondit pas sur la précédente", steps: [] }];
            }
            applied.push("S" + wk.num + " : séance retirée (saut de charge que les planchers empêchaient de lisser)");
          }
        }
      }
      prev = wa;
    }
  }

  // D10 (audit v6) — la réparation ne casse JAMAIS la monotonie de l'affûtage : chaque
  // semaine d'affûtage repart ≤ la semaine précédente. La réparation ci-dessus vise
  // chaque semaine indépendamment (cible 0.55×pic) ; planchers et quantification des
  // répétitions pouvaient laisser S(n+1) > S(n). Corps réduits (répétitions comprises),
  // puis la plus petite séance non-longue cède si les planchers bloquent encore.
  {
    let prevMin = 0;
    for (const w of plan.weeks) {
      const m0 = wMinOf(w);
      if (w.phase.id !== "taper" || prevMin <= 0 || m0 <= prevMin) { prevMin = m0; continue; }
      for (let g = 0; g < 6 && wMinOf(w) > prevMin; g++) {
        const f = Math.max(0.5, (prevMin * 0.97) / wMinOf(w));
        for (const d of w.days)
          for (const s of d.sessions) {
            if (!s.steps || !s.steps.length) continue;
            for (const st of s.steps) {
              if (st.role !== "body") continue;
              if (st.reps && st.reps > 1) st.reps = Math.max(1, Math.floor(st.reps * f));
              else if (st.durationMin) st.durationMin = Math.max(3, Math.round(st.durationMin * f));
              else if (st.distanceM) st.distanceM = Math.max(100, Math.round((st.distanceM * f) / 25) * 25);
            }
            fixSwimBounds(s);
            renderSess(s, refs, hz, baseRefs);
          }
      }
      for (let g = 0; g < 4 && wMinOf(w) > prevMin; g++) {
        let victim                                                                       = null;
        for (const d of w.days)
          d.sessions.forEach((s, si) => {
            if (s.d === "rs" || s.long || s.brick) return;
            const m = s.min || 0;
            if (!victim || m < victim.min) victim = { d, si, min: m };
          });
        if (!victim) break;
        const v = victim                                                                 ;
        v.d.sessions.splice(v.si, 1);
        if (!v.d.sessions.some((s) => s.d !== "rs")) {
          v.d.charge = "off";
          v.d.sessions = [{ d: "rs", name: "OFF (affûtage)", det: "repos — la fraîcheur du jour J se construit maintenant", steps: [] }];
        }
        applied.push("S" + w.num + " : séance retirée (l'affûtage ne remonte jamais)");
      }
      if (wMinOf(w) < m0) applied.push("S" + w.num + " : affûtage ramené sous la semaine précédente (" + Math.round(m0) + "→" + Math.round(wMinOf(w)) + "min)");
      prevMin = wMinOf(w);
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
    const applied = applyTargetedRepairs(plan, audit, refs, reasoned.hz, reasoned.baseRefs, profile.level, parseInt(profile.vol_max || "10") || 10);
    if (!applied.length) break; // aucune réparation applicable : inutile de boucler
    repairs.push(...applied);
    audit = auditPlan(plan, opts);
    if (audit.hardViolations.length < best.audit.hardViolations.length || audit.score > best.audit.score) best = { plan, audit };
  }

  const warnings           = [...(reasoned.warnings || [])];
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

/** Minutes → « 9h20 » : une durée de trail se lit en heures, pas en minutes. */
function fmtHM(min        )         {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h > 0 ? h + "h" + String(m).padStart(2, "0") : m + "min";
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

  // ---- R7 TRAIL : Riegel est INAPPLICABLE (un km de trail n'est pas un km de route).
  // Modèle à deux composantes : temps à plat + temps vertical (VAM), pénalisés par la
  // technicité et la nuit. Fourchette LARGE et annoncée comme telle : sur un ultra, ±20%
  // est une estimation honnête — afficher une fourchette serrée serait le mensonge.
  if (sport === "trail" && opts.trail) {
    const obj = opts.trail;
    const tech = TRAIL_TECHNICITY[obj.technicity] || TRAIL_TECHNICITY.mixte;
    const kmEffH = obj.kmEffort / Math.max(0.5, obj.raceMinMid / 60);
    const one = (v        ) => (Math.round(v * 10) / 10).toFixed(1).replace(".", ",");
    items.push({ leg: "Temps estimé", value: fmtHM(obj.raceMinLo) + "–" + fmtHM(obj.raceMinHi),
      why: obj.why + " · fourchette large assumée : sur ce format, le terrain et la gestion pèsent plus que la condition physique" });
    items.push({ leg: "Vitesse cible", value: one(kmEffH) + " km-effort/h",
      why: "Le km-effort (distance + D+/100) se suit sur un relief irrégulier, là où l'allure au sol ne veut rien dire" });
    items.push({ leg: "En montée", value: Math.round((obj.vam * 0.7) / 10) * 10 + "–" + Math.round((obj.vam * 0.82) / 10) * 10 + " m/h de D+",
      why: "Ta vitesse ascensionnelle de course (70-82% de ta VAM seuil)" + (obj.vamKnown ? "" : " — estimée d'après ton niveau, fais le test pour l'affiner") + " : LA donnée à suivre dans les montées" });
    const hike = T5_HIKE_SHARE[obj.category] ?? 0.15;
    if (hike >= 0.1) items.push({ leg: "Part de marche", value: "~" + Math.round(hike * 100) + "% du temps",
      why: "Sur ce relief, la marche rapide sera une part majeure de ta course : ce n'est pas un échec, c'est la stratégie qui économise le plus d'énergie dans les pentes raides" });
    // §6.3 — l'erreur n°1 en ultra est le départ trop rapide : l'outil est bien placé pour le dire
    advice.push("Répartition conseillée : premier tiers à " + one(kmEffH * 0.92) + " km-effort/h (volontairement en dessous — tu dois te sentir « trop tranquille »), deuxième tiers à " + one(kmEffH) + ", dernier tiers selon ce qu'il reste. Partir 5 % trop vite coûte 20 % sur la fin.");
    if (obj.cutoffH && obj.raceMinHi > obj.cutoffH * 60) advice.unshift("⏱ Barrière horaire à " + obj.cutoffH + "h : notre estimation haute (" + fmtHM(obj.raceMinHi) + ") la dépasse. Vise le bas de la fourchette, contrôle ton départ et limite le temps passé aux ravitaillements.");
    D("PRED-trail", "Méthode trail", "temps à plat + temps vertical (VAM)", "Riegel ne s'applique pas au trail : on additionne le temps horizontal et le temps d'ascension, puis on pénalise selon la technicité (" + tech.label + ") et la nuit");
    return { items, advice, decisions };
  }

  // R10 phase 1 — DISPATCH : chaque sport porte SA méthode de prédiction dans son module
  // (`src/sports/<sport>/`). Ce qui reste ici est commun : fourchettes, profil de parcours,
  // formatage, journal de décisions. Un sport sans méthode ne PRÉDIT RIEN plutôt que de
  // sortir un chiffre inventé — la fourchette honnête est la seule sortie acceptable.
  const mod = sportModule(sport);
  if (mod.predict) {
    mod.predict({ format, refs, items, advice, D, range, runRange, riegelSec, profWhy, swimrun: opts.swimrun });
  } else {
    advice.push("La prédiction de temps n'est pas encore disponible pour ce sport : nous préférons ne rien afficher plutôt qu'un chiffre que nous ne pourrions pas défendre.");
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
 * - A4 (audit v6) : deux registres — un signal OBJECTIF négatif (HRV, FC repos, heures de
 *   sommeil mesurées) ne peut PAS être annulé par du déclaratif positif (énergie, ressenti,
 *   qualité de sommeil perçue) ; le subjectif ne fait alors qu'aggraver.
 * - information absente : le signal est nommé dans `drivers` s'il est exploitable avec un
 *   seuil absolu (FC repos), sinon il est simplement ignoré — jamais jeté en silence.
 */
function assessReadiness(s                   )                   {
  const drivers           = [];
  // A4 (audit v6) — DEUX REGISTRES SÉPARÉS. Un ressenti déclaratif ne peut pas effacer une
  // mesure : « HRV basse + je me sens bien » restait ORANGE au mieux, jamais VERTE (avant,
  // trois bonus subjectifs annulaient le −2 de la HRV et rendaient le verdict vert).
  let objectif = 0; // HRV, FC repos, heures de sommeil MESURÉES
  let subjectif = 0; // énergie, sensation, qualité de sommeil déclarée
  // R4.5 — douleur signalée : rouge FORCÉ, quels que soient les autres signaux. La qualité
  // (>Z2) est remplacée par de la récupération tant que le drapeau n'est pas levé.
  if (s.painFlag) {
    drivers.push("douleur signalée" + (s.painLocation ? " (" + s.painLocation + ")" : "") + " — intensité verrouillée, consulte médecin/kiné si ça persiste");
    return { level: "rouge", drivers };
  }
  // R4.7 — la séance d'hier était très dure (RPE ≥8) : signal de fatigue annoncé.
  if (s.lastRpe != null && s.lastRpe >= 8) { objectif -= 1; drivers.push("séance d'hier très dure (RPE " + s.lastRpe + "/10)"); }
  // A5 (audit v6) — une nuit VRAIMENT courte est un signal rouge en soi : 3h de sommeil
  // ne se compense pas par une bonne humeur (avant : orange seulement).
  if (s.sleepHours != null && s.sleepHours < 4.5) { objectif -= 3; drivers.push("nuit très courte (" + s.sleepHours + "h) — le sommeil est le premier levier de récupération"); }
  else if (s.sleepQuality === "mauvais" || (s.sleepHours != null && s.sleepHours < 5.5)) {
    if (s.sleepHours != null && s.sleepHours < 5.5) objectif -= 2; else subjectif -= 2;
    drivers.push("sommeil dégradé");
  } else if (s.sleepQuality === "moyen" || (s.sleepHours != null && s.sleepHours < 6.5)) {
    if (s.sleepHours != null && s.sleepHours < 6.5) objectif -= 1; else subjectif -= 1;
    drivers.push("sommeil moyen");
  } else if (s.sleepQuality === "bon") { subjectif += 1; drivers.push("sommeil bon"); }
  if (s.hrvStatus === "basse") { objectif -= 2; drivers.push("HRV sous ta moyenne 7j"); }
  else if (s.hrvStatus === "haute") { objectif += 1; drivers.push("HRV au-dessus de ta moyenne"); }
  if (s.energy != null) {
    if (s.energy < 25) { subjectif -= 2; drivers.push("énergie très basse (" + s.energy + "/100)"); }
    else if (s.energy < 45) { subjectif -= 1; drivers.push("énergie basse (" + s.energy + "/100)"); }
    else if (s.energy >= 70) { subjectif += 1; drivers.push("énergie haute (" + s.energy + "/100)"); }
  }
  // A6 (audit v6) — la FC de repos ne se perd plus faute de baseline : baseline connue →
  // comparaison relative (+8%) ; sinon seuil absolu prudent (≥70 bpm au réveil chez un
  // athlète d'endurance mérite au moins un orange), et le signal est NOMMÉ dans les drivers.
  if (s.restingHr != null) {
    if (s.restingHrBaseline != null) {
      if (s.restingHr >= s.restingHrBaseline * 1.08) {
        objectif -= 2;
        drivers.push("FC repos élevée (" + s.restingHr + " vs " + s.restingHrBaseline + " bpm habituels)");
      }
    } else if (s.restingHr >= 70) {
      objectif -= 2;
      drivers.push("FC repos élevée au réveil (" + s.restingHr + " bpm, sans historique de comparaison — renseigne-la quelques matins pour affiner)");
    } else if (s.restingHr >= 60) {
      objectif -= 1;
      drivers.push("FC repos un peu haute (" + s.restingHr + " bpm, pas encore de moyenne personnelle)");
    }
  }
  if (s.feel === "fatigue") { subjectif -= 1; drivers.push("sensation de fatigue déclarée"); }
  else if (s.feel === "frais") { subjectif += 1; drivers.push("sensation de fraîcheur"); }

  // A4 — quand la mesure est négative, le déclaratif ne peut qu'AGGRAVER, jamais compenser.
  const score = objectif + (objectif < 0 ? Math.min(0, subjectif) : subjectif);
  const level                 = score <= -3 ? "rouge" : score <= -1 ? "orange" : "verte";
  if (!drivers.length) drivers.push("aucun signal : on suit le plan");
  return { level, drivers };
}

/** Clés reconnues d'une photo du matin — toute autre clé est une ERREUR DE CÂBLAGE :
 *  sans cette validation, une faute de frappe côté UI faisait disparaître un signal de
 *  sécurité en silence (audit v6). En dev, on veut du bruit ; en prod, une trace. */
const SNAPSHOT_KEYS = [
  "date", "sleepQuality", "sleepHours", "hrvStatus", "restingHr", "restingHrBaseline",
  "energy", "feel", "completed", "weather", "painFlag", "painLocation", "lastRpe",
]         ;
function validateSnapshot(s                         )           {
  return Object.keys(s || {}).filter((k) => !(SNAPSHOT_KEYS                     ).includes(k));
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
      // A3 (audit v6) — les planchers ne remontent JAMAIS au-dessus de la valeur d'origine :
      // une réduction est une réduction, même sur une séance déjà courte.
      if (st.reps && st.reps > 1) st.reps = Math.max(1, Math.round(st.reps * f));
      else if (st.durationMin) st.durationMin = Math.min(st.durationMin, Math.max(10, Math.round(st.durationMin * f)));
      else if (st.distanceM) st.distanceM = Math.min(st.distanceM, Math.max(200, Math.round((st.distanceM * f) / 25) * 25));
    }
    renderSess(s, refs, hz, baseRefs);
  }
}

function enduranceReplacement(disc        , minutes        , refs      , hz                        , baseRefs      , why        )            {
  const d = (disc === "br" ? "bk" : disc)                  ;
  const zone = d === "rn" ? "rn.easy" : d === "sw" ? "sw.easy" : "bk.z2";
  // A3 (audit v6) — un remplacement de récupération n'est PAS une séance de plan : le
  // plancher C24 (750m) ne s'y applique pas. La distance est DÉRIVÉE des minutes allouées
  // (arrondi à 25m vers le bas) pour ne jamais dépasser la séance qu'elle remplace.
  const s            = d === "sw"
    ? { d, name: "Endurance souple (adaptée)", note: why, det: "", steps: [{ role: "body", distanceM: Math.max(200, Math.floor(((minutes * 60) / (baseRefs.css || 130)) * 100 / 25) * 25), zone, d: "sw" }] }
    : { d, name: "Endurance facile (adaptée)", note: why, det: "", steps: [{ role: "body", durationMin: minutes, zone }] };
  renderSess(s, refs, hz, baseRefs);
  return s;
}

/** A2 (audit v6, R6.1) — la localisation de la douleur choisit la discipline de
 * remplacement : on retire la contrainte qui sollicite la zone, on ne la réduit pas.
 * Renvoie null quand AUCUNE discipline d'endurance n'épargne la zone → repos complet. */
function resolvePainDiscipline(mainDisc        , painLocation                    )                                            {
  const base = mainDisc === "br" ? "bk" : mainDisc;
  const contra = painLocation ? R6_PAIN_CONTRAINDICATION[painLocation] : undefined;
  if (!contra || !contra.forbid.includes(base)) return { disc: base, swapped: false };
  const alt = contra.prefer.find((d2) => !contra.forbid.includes(d2)) ?? null;
  return { disc: alt, swapped: true };
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
      const main = day.sessions.find((s) => s.d !== "rs") ;
      // A3 — jamais plus de minutes qu'avant : le plancher de 25min cède si la séance
      // d'origine était plus courte.
      const replacementMin = Math.min(Math.max(1, Math.round(originalMinutes)), Math.max(25, Math.round(originalMinutes * 0.5)));
      // A2/R6.1 — la douleur localisée retire la discipline qui sollicite la zone
      const pain = snapshot.painFlag ? resolvePainDiscipline(main.d, snapshot.painLocation) : { disc: main.d === "br" ? "bk" : main.d, swapped: false };
      if (pain.disc === null) {
        action = "rest";
        day.charge = "off";
        day.sessions = [{ d: "rs", name: "Repos complet (douleur)", det: "repos — 💡 douleur " + (snapshot.painLocation || "signalée") + " : aucune discipline d'endurance n'épargne cette zone aujourd'hui. Le repos EST la bonne séance.", steps: [] }];
        D("ADAPT-rouge-douleur", "Douleur " + (snapshot.painLocation || "signalée"), "repos complet", "Aucune discipline disponible n'épargne la zone douloureuse — on ne dégrade pas la séance, on l'annule (R6.1)");
      } else {
        action = "replace";
        const why = pain.swapped
          ? "douleur " + (snapshot.painLocation || "") + " signalée — l'appui sur la zone est retiré aujourd'hui : la séance passe en " + (pain.disc === "bk" ? "vélo" : pain.disc === "sw" ? "nage" : "course") + " souple (R6.1)."
          : drivers.join(" · ") + " — la séance de qualité est remplacée par de l'endurance : l'intensité un jour rouge coûte plus qu'elle ne rapporte.";
        day.sessions = [enduranceReplacement(pain.disc, replacementMin, refs, reasoned.hz, reasoned.baseRefs, why)];
        day.charge = "facile";
        D("ADAPT-rouge", "Readiness rouge", "qualité → endurance (" + replacementMin + "min)", why);
      }
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

  // A3 (audit v6) — l'invariant d'en-tête est ASSERTÉ, plus seulement documenté :
  // hors « keep », un ajustement ne produit jamais plus de minutes que la séance d'origine.
  const adjustedMinutes = dayMinutes(day);
  if (action !== "keep" && adjustedMinutes > originalMinutes + 0.01) {
    throw new Error("Invariant readiness violé : " + originalMinutes.toFixed(1) + " → " + adjustedMinutes.toFixed(1) + "min (" + action + ")");
  }
  return { date, action, verdict, originalMinutes, adjustedMinutes, decisions };
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

/** E4 (audit v6) — garde IMC : hors [15, 45], les équations de dépense ne sont pas
 * validées, et un tableau calorique propre et autoritaire est exactement le mauvais
 * objet à mettre sous les yeux de quelqu'un dans cette situation. On n'affiche RIEN
 * (pas d'estimation dégradée), et l'UI peut afficher ce message à la place. */
const BMI_VALID_RANGE                   = [15, 45];
function bmiGuardNotice(weightKg                , heightCm                )                {
  if (!weightKg || !heightCm || !(weightKg > 0) || !(heightCm > 0)) return null;
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  if (bmi >= BMI_VALID_RANGE[0] && bmi <= BMI_VALID_RANGE[1]) return null;
  return "Les chiffres saisis sortent des bornes sur lesquelles les équations de dépense énergétique sont validées : aucune estimation n'est affichée. Si ces valeurs sont exactes, un accompagnement médical ou diététique sera plus utile qu'un calculateur.";
}

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
  if (bmiGuardNotice(w, input.heightCm)) return null; // E4 — hors bornes de validation : rien
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
  // Validation de schéma (audit v6) : une clé inconnue = câblage cassé, pas un détail —
  // le signal serait ignoré sans le moindre bruit. On le dit, on ne bloque pas l'athlète.
  const unknown = validateSnapshot(snapshot                                      );
  if (unknown.length) console.warn("Photo du matin : clé(s) non reconnue(s) et donc IGNORÉE(S) — " + unknown.join(", "));
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
  const parse = parsePaceSec; // E1/E2 (audit v6) — un seul parseur : plan et prédiction ne peuvent plus diverger
  const finalRefs = reasoned ? refs : {
    ftp: answers.ftp_known === "oui" ? parseInt(String(answers.ftp || "")) || 0 : 0,
    thrPace: answers.pace_known === "oui" ? parse(answers.pace, "run") : 0,
    css: answers.css_known === "oui" ? parse(answers.css, "swim") : 0,
  };
  const today = localTodayISO();
  const pg = progressV2(p, answers, today);
  return predictRace(sport, String(answers.format || ""), String(answers.intent || "") || undefined, finalRefs, {
    pctLoad: pg.pctLoad,
    streakWeeks: pg.streakWeeks,
    courseProfile: String(answers.course_profile || "") || undefined, // R6 — profil du parcours (Profil)
    // R7 TRAIL — l'objectif décodé (catégorie, temps estimé, VAM) : Riegel ne s'applique pas
    trail: sport === "trail" ? trailObjective(toProfile(sport, answers)) : undefined,
    swimrun: sport === "swimrun" ? swimrunObjective(toProfile(sport, answers)) : undefined,
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
  // R7 — l'UI a besoin de la catégorie d'effort déduite et des plafonds trail pour
  // expliquer ses règles pédagogiques : les exposer évite de dupliquer les chiffres
  // (une table de plafonds recopiée dans l'UI, c'est une table qui divergera).
  trailObjective: (answers                         ) => trailObjective(toProfile("trail", answers)),
  trailCaps: { history: TRAIL_HISTORY_CAPS, util: TRAIL_UTIL },
  // S10 — prérequis d'entrée swimrun : l'UI refuse un format long en dessous, et DIT pourquoi.
  // C'est la priorité n°1 du manifeste (santé) dans un sport où l'on est loin du bord.
  swimrunPrereq: (answers                         ) => swimrunPrereqBlock(answers                       ),
  swimrunObjective: (answers                         ) => swimrunObjective(toProfile("swimrun", answers)),
  // R10 phase 0 (§ R10.0.3) — SOURCE UNIQUE des plafonds de volume. L'UI en gardait une copie
  // littérale (`capsBySport`/`utilBySport` dans steps.js) qui avait déjà DIVERGÉ : elle
  // annonçait 8h/sem là où le moteur en applique 9 (vélo/route/reprise). Les règles
  // pédagogiques expliquent des décisions : elles doivent lire les chiffres qui décident.
  volumeCaps: { history: HISTORY_CAPS, util: UTIL, margin: MARGIN },
  // R10 phase 1 — le REGISTRE DE SPORTS exposé à l'UI : elle n'a plus à savoir quel sport
  // teste quoi (`typesForSport` recopiait la liste). Un sport ajouté au moteur devient
  // automatiquement complet côté interface.
  sports: Object.fromEntries(knownSports().map((id) => {
    const m = sportModule(id);
    return [id, { id: m.id, mainDiscipline: m.mainDiscipline, retestTypes: m.retestTypes, guards: m.guards }];
  })),
  importFit: importFitBytes,
  sessionNutrition: nutritionForSession,
  dailyEnergy: dailyEnergyV2,
  version: "v2-sprint9",
};

})();
