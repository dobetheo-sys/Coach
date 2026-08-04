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
                               
                          
                        
                
                  
                                                  
                  
                                                                      
                       
                 
                     
                    
                                                                                           
                                                                          
                   
                    
                    
                
               
                     
                                                                                         
                                                  
                                                                                                               
                     
                                                                         
                 
                                                                                                           
                          
                                                                                                       
                     
                                                                                                
                                                   
                                                                                            
                                                                                         
                           
                                                          
                                                  
     
                                                                   
    
                                                                                              
                                                                                           
                                                                                         
                                                             
    
                                                                                            
                                                                                          
                                                                                              
                                                                                         
                                  
     
              
                                                                       
                                                       
                                                                                                       
                                                                  
                                                                         
                                                                                 
                                                                  
                                                 
                                                                                
    
 

// ===== src/engine/trace.ts =====
/**
 * TRACE DES MUTATIONS — « quelle passe a fait ça ? », répondu une fois pour toutes.
 *
 * Cinq tours de suite, la question posée par un défaut a été « quelle passe a modifié cette
 * séance, et pourquoi ». Cinq fois, la réponse a été cherchée par élimination : on retire une
 * passe, on régénère, on regarde. C'est cher, et ça ne se capitalise pas.
 *
 * Trois exigences, tenues ici :
 *   1. ORDONNÉE — les entrées sortent dans l'ordre d'exécution des passes. C'est l'ordre qui
 *      explique les collisions : une passe tardive qui défait le travail d'une passe précoce est
 *      invisible autrement.
 *   2. ACTIVABLE PAR COMBINAISON — `EB_TRACE=swim/moyenne/inter` (ou n'importe quelle étiquette
 *      posée par l'appelant). Une trace globale sur 297 combinaisons est illisible.
 *   3. SANS EFFET SUR LA SORTIE — `record()` sort immédiatement quand la trace est éteinte, et
 *      ne touche jamais l'objet observé. Le plan généré trace active doit être identique au
 *      caractère près ; `scripts/trace.mjs` le VÉRIFIE à chaque exécution.
 */
                             
              
               
                   
                
                       
                      
                                                                                              
                           
                          
                 
                    
 

let ON = false;
let LABEL = "";
let SEQ = 0;
const ENTRIES               = [];

/** Ouvre la trace pour une étiquette de combinaison. `null` l'éteint. */
function traceOn(label               )       {
  ON = !!label;
  LABEL = label || "";
  SEQ = 0;
  ENTRIES.length = 0;
}
function traceEnabled()          {
  return ON;
}
function record(e                         )       {
  if (!ON) return;
  ENTRIES.push({ ...e, seq: ++SEQ });
}
function traceDump()                                           {
  return { label: LABEL, entries: ENTRIES.slice() };
}

// ===== src/engine/medicalHold.ts =====
/**
 * DRAPEAU MÉDICAL — LE POINT UNIQUE OÙ UNE SÉANCE ACQUIERT SON INTENSITÉ.
 *
 * R4.0 avait fermé le contournement. Il s'est rouvert DEUX FOIS : une fois par le module trail
 * (R7, nouvelles zones `tr.*` que la vérification locale ne connaissait pas), une fois par
 * l'insertion de course (N1, qui écrivait `.thr` sans passer par la bibliothèque). Un garde qui
 * se rouvre à chaque nouveau producteur de séances n'est pas un garde : c'est une vérification
 * locale que le producteur suivant oubliera.
 *
 * La règle est donc portée par le MOTEUR, à l'endroit où une zone est écrite, et par un filet
 * final qui rattrape tout écrivain futur (`enforceMedicalHold`). Les deux ensemble : la porte
 * pour que ce soit gratuit, le filet pour que ce soit vrai.
 *
 * Sous drapeau, aucune séance d'aucun plan ne porte de zone au-dessus de l'ENDURANCE — courses,
 * tests et retests compris. Un plan de maintien n'inscrit pas de course : la règle appartient
 * au moteur, pas à l'appelant.
 */
                                                 

/** Zones d'ENDURANCE, les seules autorisées sous drapeau médical. Tout le reste est au-dessus. */
const EASY_ZONES = new Set([
  "rn.easy", "rn.rec", "bk.z2", "sw.easy", "sw.aero",
  "tr.flat", "tr.hike", "tr.easyup",
]);
/** Repli par discipline — la zone facile de la discipline du bloc. */
const EASY_BY_PREFIX                         = { rn: "rn.easy", bk: "bk.z2", sw: "sw.easy", tr: "tr.easyup" };

function isEasyZone(zone                           )          {
  return !zone || EASY_ZONES.has(zone);
}

/** LA PORTE : toute zone écrite sous drapeau médical redescend à l'endurance de sa discipline. */
function medicalZone(zone                           , medHold         )                            {
  if (!medHold || isEasyZone(zone)) return zone;
  const pfx = String(zone).split(".")[0];
  return EASY_BY_PREFIX[pfx] || "rn.easy";
}

/**
 * LE FILET : appelé au point de convergence, il rattrape toute zone écrite hors de la porte —
 * une passe tardive, un module futur, une séance construite à la main. C'est lui qui rend la
 * garantie non-réouvrable : le prochain producteur n'a pas besoin de connaître la règle.
 */
function enforceMedicalHold(plan        , medHold         )         {
  if (!medHold) return 0;
  let fixed = 0;
  for (const w of plan.weeks)
    for (const d of w.days)
      for (const s of d.sessions)
        for (const st of (s.steps || [])            ) {
          const next = medicalZone(st.zone, true);
          if (next !== st.zone) { st.zone = next          ; fixed++; }
        }
  return fixed;
}

// ===== src/engine/measured.ts =====
/**
 * `measured` — L'INSTANTANÉ DE CE QUE L'ATHLÈTE A RÉELLEMENT FAIT (décisions produit R6, §2-§3).
 *
 * Trois règles fondent ce module, et aucune n'est négociable :
 *
 * 1. **Une observation ne remplace jamais une contrainte.** `vol_max`, `sessions_max`, `dispo`,
 *    `off_days`, `injury`, `history`, les drapeaux médicaux et l'objectif restent DÉCLARÉS : ce
 *    que quelqu'un a fait le mois dernier ne dit pas ce qu'il peut soutenir, et encore moins ce
 *    qu'il a le droit de faire. Seul `vol_recent` — le POINT DE DÉPART de la rampe R10 — est
 *    mesurable, et c'est le champ le plus souvent mal déclaré.
 *
 * 2. **Le moteur reste une fonction pure.** `measured` est un instantané de scalaires DÉRIVÉS,
 *    daté et versionné, rangé dans `answers.measured` — jamais un flux. C'est ce qui garde
 *    `audit_v7` possible : si la régénération cesse d'être reproductible, on perd la suite de
 *    régression sur 4 580 profils. Corollaire testé (`npm run demo:measured`) : **sans
 *    `measured`, le plan est EXACTEMENT celui d'avant.**
 *
 * 3. **La source est un adaptateur interchangeable.** Le moteur ne connaît que cet objet, jamais
 *    son origine. Voie par défaut : l'athlète apporte ses fichiers (FIT/GPX/TCX, export Garmin,
 *    saisie manuelle) — souverain, aucun plafond d'athlètes, aucune clause d'usage. Un
 *    connecteur de plateforme reste optionnel, par utilisateur, et le moteur ne doit JAMAIS
 *    supposer sa présence.
 */

                                   
                                                                                                  
                                                
                                                                                  
                                                                           
                   
                   
                                                                   
                               
     
                                                                                      
                                                                                                
                                                                         
     
                                 
 

/** Séance réalisée, telle que la produit n'importe quel adaptateur (FIT, saisie, connecteur). */
                                                                                          

const DAY_MS = 864e5;

/**
 * Construit l'instantané à partir des séances réalisées. Aucune magie : une somme sur une
 * fenêtre, et une confiance honnête sur la couverture de cette fenêtre.
 *
 * `confidence` vaut `high` quand les séances s'étalent sur au moins la moitié de la fenêtre —
 * en dessous, on a une photo d'un bout de mois, pas d'un mois, et on le dit.
 */
function measuredFromSessions(
  sessions                                  ,
  todayISO        ,
  windowDays = 28,
  source                             = "fit_import",
)                          {
  if (!sessions || !sessions.length) return null;
  const t0 = new Date(todayISO + "T00:00:00Z").getTime();
  if (!isFinite(t0)) return null;
  const from = t0 - (windowDays - 1) * DAY_MS;
  const inWin = sessions.filter((s) => {
    const t = new Date(String(s.date) + "T00:00:00Z").getTime();
    return isFinite(t) && t >= from && t <= t0 && Number(s.minutes) > 0;
  });
  if (!inWin.length) return null;
  const split                         = {};
  let vol = 0, dplus = 0, longest = 0;
  for (const s of inWin) {
    const m = Math.round(Number(s.minutes));
    vol += m;
    longest = Math.max(longest, m);
    dplus += Number(s.dplusM) > 0 ? Number(s.dplusM) : 0;
    split[s.d] = (split[s.d] || 0) + m;
  }
  const days = inWin.map((s) => new Date(String(s.date) + "T00:00:00Z").getTime()).sort((a, b) => a - b);
  const spanDays = Math.round((days[days.length - 1] - days[0]) / DAY_MS) + 1;
  return {
    updated_at: todayISO,
    source,
    window_days: windowDays,
    vol_min: vol,
    sessions: inWin.length,
    dplus_m: dplus > 0 ? Math.round(dplus) : undefined,
    split,
    longest_session_min: longest,
    confidence: spanDays >= windowDays / 2 ? "high" : "partial",
  };
}

/** Volume hebdomadaire moyen mesuré, en heures — l'unité de `vol_recent`. */
function measuredWeeklyHours(m                                     )                {
  if (!m || !(m.vol_min > 0) || !(m.window_days > 0)) return null;
  return Math.round(((m.vol_min / m.window_days) * 7 / 60) * 10) / 10;
}

                                       
                                                                           
                          
                          
                                         
                                                                                                 
 

/**
 * L'ARBITRAGE — un seul endroit dans le projet décide du point de départ de la rampe.
 *
 * - `confidence: "high"` → la mesure remplace la déclaration, dans les DEUX sens. C'est la
 *   raison d'être de l'ingestion : `vol_recent` est le champ le plus souvent mal estimé, et il
 *   commande les premières semaines du plan.
 * - `confidence: "partial"` → la fenêtre est incomplète, donc la mesure SOUS-COMPTE. Elle ne
 *   peut alors servir qu'à prouver que l'athlète en a fait PLUS qu'il ne le dit ; l'utiliser
 *   pour descendre reviendrait à alléger un plan sur une donnée manquante, pas sur un fait.
 * - Aucune mesure → comportement d'avant, à l'identique.
 *
 * Ce que l'arbitrage ne fait JAMAIS : toucher à `vol_max` ou à un autre plafond. Le point de
 * départ n'est pas la capacité — les plafonds déclarés continuent de borner le plan en aval.
 */
function arbitrateVolRecent(
  declaredRaw                                    ,
  m                                     ,
)                       {
  // R20.1-a — ZÉRO EST UNE RÉPONSE, PAS UNE ABSENCE DE RÉPONSE.
  //
  // Le test était `dec > 0` : déclarer « je ne m'entraîne pas du tout en ce moment » était donc
  // lu comme « je n'ai pas répondu », et la rampe R10 ne se déclenchait pas. Mesuré sur un
  // profil `reprise` en préparation marathon : **semaine 1 à 3,9 h au lieu de 2,0 h** — presque
  // le double, sur exactement la population que cette rampe existe pour protéger. Quelqu'un
  // qui repart de zéro est celui à qui il faut le départ le plus prudent, et c'est lui qui
  // recevait le départ le moins prudent.
  //
  // Trouvé par le balayage dérivé du schéma (R20.1), pas par un test écrit à la main : aucune
  // liste de cas ne pensait à essayer la borne basse d'un domaine qui commence à 0.
  const dec = parseFloat(String(declaredRaw ?? ""));
  const declared = isFinite(dec) && dec >= 0 ? dec : null;
  const meas = measuredWeeklyHours(m);
  if (meas == null) {
    return { hours: declared, declared, measured: null, source: declared == null ? "aucun" : "declare", why: "" };
  }
  const fmt = (h        ) => (Number.isInteger(h) ? h + "h" : Math.floor(h) + "h" + String(Math.round((h % 1) * 60)).padStart(2, "0"));
  if (m .confidence === "high" || declared == null || meas > declared) {
    const why = declared == null
      ? "Départ calé sur " + fmt(meas) + "/sem mesurés sur tes " + m .window_days + " derniers jours (" + m .sessions + " séances importées) : tu n'avais pas déclaré de volume récent."
      : Math.abs(meas - declared) < 0.15
        ? ""
        : "Volume de départ ajusté de " + fmt(declared) + " déclarés à " + fmt(meas) + " mesurés sur tes " + m .window_days + " derniers jours (" + m .sessions + " séances importées)"
          + (m .confidence === "partial" ? " — fenêtre incomplète, donc retenu seulement parce qu'il est PLUS haut que ta déclaration." : ".");
    return { hours: meas, declared, measured: meas, source: "mesure", why };
  }
  return {
    hours: declared, declared, measured: meas, source: "declare",
    why: "Tes imports ne couvrent qu'une partie des " + m .window_days + " derniers jours : la mesure (" + fmt(meas)
      + "/sem) est plus basse que ta déclaration (" + fmt(declared) + "), mais une fenêtre incomplète ne prouve rien — c'est ta déclaration qui est retenue.",
  };
}

// ===== src/engine/truncatedPrep.ts =====
/**
 * R22 — LA PRÉPARATION TRONQUÉE : le refus « course trop proche » devient franchissable.
 *
 * ================================================================================
 * CE QUI CHANGE, ET CE QUI NE CHANGE PAS
 * ================================================================================
 *
 * R11.4 refuse de générer quand il reste moins de semaines que le format n'en
 * demande. Le refus RESTE le comportement par défaut, mot pour mot : sans
 * `truncate_prep`, rien ne bouge. Ce module ajoute une SORTIE à ce refus, pour
 * l'athlète qui est déjà entraîné et qui le déclare.
 *
 * C'est un alignement sur O-17, pas une entorse : *« notre rôle est d'informer au
 * mieux et de laisser l'athlète choisir… le but n'est jamais de bloquer mais
 * d'accompagner, sauf si réelle mise en danger »*. Le critère du manifeste pour
 * qu'un blocage reste DUR est que « l'athlète ne peut pas évaluer le risque, ou
 * l'erreur est irréversible ». Or « ai-je déjà une base ? » est précisément une
 * question qu'un athlète sait trancher, et rater sa course n'est pas irréversible.
 * L'inverse l'est davantage : un athlète capable qu'on renvoie sans plan
 * s'entraînera seul, sans aucun garde-fou — et la régularité est priorité 3.
 *
 * ================================================================================
 * TROIS ÉCARTS AVEC LE BRIEF, MESURÉS
 * ================================================================================
 *
 * **1. Le seuil n'est PAS 16 semaines.** Il dépend du sport ET du format
 * (`MIN_WEEKS`, plus `T6_MIN_WEEKS` par catégorie d'effort en trail) :
 *
 *     5 km 6 · 10 km 8 · semi 12 · marathon 16 · tri S 8 · tri M 12
 *     70.3 20 · Ironman 36 · swimrun championship 30 …
 *
 * « 16 » est le cas du marathon. Une date de départ virtuelle à `course − 16
 * semaines` donnerait 20 semaines de trop à un Ironman et 10 de trop à un 5 km.
 * La date virtuelle est donc `course − need`, où `need` est lu à la source unique.
 *
 * **2. « Tronquer les 2 premières semaines » est le cas particulier de 14/16.**
 * Le nombre de semaines à retirer est `need − reste`. À 14 semaines sur un
 * marathon ça fait bien 2 ; sur un Ironman à 30 semaines ça en fait 6.
 *
 * **3. Un plancher ABSOLU unique de 8 semaines ne tient pas.** Il autoriserait un
 * Ironman préparé en 8 semaines — exactement ce que R11.4 existe pour refuser, et
 * ce que le refus appelle « te mentir, et te blesser ». Le plancher est donc
 * proportionné au format, et il est DÉRIVÉ plutôt qu'inventé :
 *
 *     on ne peut retirer que des semaines de MISE EN ROUTE,
 *     c'est-à-dire au plus la durée de la phase `base` (PHASE_PCTS, 30 %).
 *
 * C'est la formulation exacte du bandeau que le brief demande lui-même
 * (« les 2 premières semaines **de mise en route** ont été supprimées »). Au-delà,
 * on ne raccourcit plus la mise en route : on ampute le développement, et le plan
 * cesse d'être celui que l'auditeur a validé.
 *
 * Un plancher absolu de 8 semaines s'y ajoute quand le format en demande plus —
 * en dessous, aucune périodisation n'a de sens (il ne reste plus que l'affûtage et
 * le pic, R13.6 les plafonnant à 3 et 5). Il ne s'applique pas aux formats dont le
 * minimum est déjà ≤ 8 : bloquer un 5 km à 5 semaines au nom d'un plancher pensé
 * pour l'Ironman serait le sur-blocage que le manifeste reproche.
 *
 * Ce que ça donne :
 *
 *   | format          | need | retirable | plancher | 14 sem. | 10 sem. |
 *   |-----------------|------|-----------|----------|---------|---------|
 *   | marathon        |  16  |     4     |    12    |   ✅    |   ❌    |
 *   | semi            |  12  |     3     |     9    |   ✅    |   ✅    |
 *   | Ironman         |  36  |    10     |    26    |   ❌    |   ❌    |
 *   | 5 km            |   6  |     1     |     5    |   ✅    |   ✅    |
 *
 * Le cas limite du brief (10 semaines) est bien refusé sur un marathon.
 */


/**
 * Plancher absolu, en semaines. En dessous, il ne reste plus de quoi périodiser :
 * l'affûtage (≤3) et le pic (≤5) occuperaient tout le plan. Ne s'applique qu'aux
 * formats dont le minimum le dépasse.
 */
const PLANCHER_ABSOLU_SEM = 8;

/**
 * La part de la phase de MISE EN ROUTE — la seule qu'on s'autorise à retirer.
 *
 * Lue À L'APPEL et non au chargement du module : le bundle est une concaténation à
 * portée unique, et `answerSchema` (qui importe ce fichier) y précède
 * `constraintMatrix`. Un `const` de tête aurait lu `PHASE_PCTS` avant son
 * initialisation — le build l'a refusé, ce pour quoi son auto-test existe.
 */
const partBase = () => PHASE_PCTS.find((p) => p.id === "base") .pct;

                               
                                                                                   
               
                                         
                
                                                                       
                    
                                                                        
                   
                                                                  
                    
                                                                            
                   
 

/** Le `need` du format — un seul point de lecture, trail compris. */
function semainesRequises(sport        , profile                )                     {
  if (sport === "trail") return T6_MIN_WEEKS[trailObjective(profile).category];
  return (MIN_WEEKS[sport                          ] || {})[String(profile.format || "")];
}

/**
 * Décide si une préparation tronquée est possible, et de combien.
 * Fonction PURE : elle ne connaît ni le plan, ni l'UI, ni le drapeau de l'athlète.
 * C'est ce qui permet de l'appeler à la fois depuis le refus (pour proposer la
 * sortie) et depuis la génération (pour l'appliquer) sans écrire la règle deux fois.
 */
function planTroncature(need                    , reste        )                      {
  if (!need || !isFinite(reste)) return null;
  const retirable = Math.floor(need * partBase());
  const plancherPhases = need - retirable;
  // Le plancher absolu ne mord que si le format demande davantage : sinon il
  // interdirait un contournement d'UNE semaine sur un 5 km.
  const plancher = need > PLANCHER_ABSOLU_SEM
    ? Math.max(plancherPhases, PLANCHER_ABSOLU_SEM)
    : plancherPhases;
  const possible = reste >= plancher && reste < need;
  return { need, reste, retirable, plancher, possible, aRetirer: possible ? need - reste : 0 };
}

/** Le motif du refus quand même le contournement est impossible. Jamais un reproche. */
function motifPlancher(t              )         {
  return "Il reste " + t.reste + " semaine(s), et même en supposant une base déjà acquise, "
    + "ce format n'est pas préparable en moins de " + t.plancher + " semaines : en dessous, "
    + "il ne reste plus que l'affûtage et le pic — un plan qui n'aurait de plan que le nom.";
}

// ===== src/engine/answerSchema.ts =====
/**
 * R11 — LE CONTRAT D'ENTRÉE DU MOTEUR.
 *
 * Constat de l'audit amont du 30/07/2026 : sur 551 entrées fausses, le moteur a produit un plan
 * crédible 544 fois et planté 7 fois avec une `TypeError` nue. Il n'a JAMAIS refusé de générer.
 * `vol_max: "abc"` donnait un Ironman à 30 min hebdo de pic, sans un mot. C'était la
 * contradiction directe de la règle du projet : « un plan faux est plus dangereux que pas de
 * plan » — le garde-fou existait côté app, rien ne le déclenchait jamais.
 *
 * Ce module est la SOURCE DE VÉRITÉ UNIQUE des domaines de valeurs. Tant qu'ils sont écrits
 * deux fois (ici et dans le questionnaire), ils divergent : c'est exactement comme ça qu'une
 * énumération renommée entre deux versions a pu faire perdre 91 % du volume d'un plan trail,
 * en silence.
 *
 * TROIS SORTIES, JAMAIS UNE QUATRIÈME (R11.2) :
 *   1. `EBInputError` — valeur hors domaine, type faux, requis manquant. Refus MOTIVÉ.
 *   2. `warnings[]` porté par le plan et affiché — contradictions, plafonnements appliqués.
 *   3. `defaults[]` journalisé dans `decisions` — un défaut appliqué est visible, jamais tacite.
 * Interdit : rendre un plan sans qu'aucun des trois canaux ne se soit exprimé.
 */
                                                 



// R22 — la règle de troncature vit dans UN module, lue ici (pour proposer la sortie)
// et par le pont (pour l'appliquer). L'écrire deux fois, c'est l'écrire deux fois faux.

/** Refus d'entrée : porteur de la clé, de la valeur reçue et de ce qui était attendu. */
class EBInputError extends Error {
  code = "ENTREE_INVALIDE";
  key        ;
  value         ;
  expected        ;
  /** Message prêt à afficher à l'athlète — c'est lui qui répare, pas un développeur. */
  human        ;
  constructor(key        , value         , expected        , human        ) {
    super("ENTREE_INVALIDE " + key + " = " + JSON.stringify(value) + " (attendu : " + expected + ")");
    this.name = "EBInputError";
    this.key = key; this.value = value; this.expected = expected; this.human = human;
  }
}

                                                           

/**
 * R12.6 — LA NATURE DE CHAQUE QUESTION, et ce qu'elle a le droit de piloter.
 *
 * L'audit grand public a nommé le vrai critère de conception d'une V1 : *est-ce que quelqu'un
 * peut répondre à cette question sans faire de test ?*
 *
 *   · `vecue`   — répondable par tout le monde, de mémoire. C'est la matière première.
 *   · `mesuree` — demande un test ou une montre. DOIT avoir (a) un repli qui DÉGRADE
 *                 proprement (zone, RPE, sensation) et (b) un chemin d'acquisition DANS l'outil.
 *   · `estimee` — auto-déclarée, invérifiable (« ton niveau »). Elle a le droit de moduler le
 *                 CONTENU d'une séance ; elle n'a PAS le droit de piloter une grandeur
 *                 numérique — c'est exactement là que ça a cassé, avec trois heures d'écart sur
 *                 une estimation de course selon la case cochée.
 */
                                                             

                            
                  
                                                                                       
                                           
                                        
                
                                                                    
                                                                  
                          
                                                                                              
                     
                                                                                          
                                                                                 
                         
                                                                                      
                                                                                     
                    
 

/**
 * Les formats par sport — le domaine de `format`, UN SEUL endroit (R11.1). Ces listes sont
 * celles du questionnaire ; l'UI doit les lire ici (`EBV2.formatsBySport`) au lieu d'en garder
 * une copie littérale. Une énumération écrite deux fois est une énumération qui divergera.
 */
const FORMATS_BY_SPORT                           = {
  run: ["5k", "10k", "semi", "marathon"],
  bike: ["crit", "route", "cyclo", "clm", "gravel"],
  swim: ["sprint", "demifond", "fond", "ow"],
  tri: ["S", "M", "70.3", "Full"],
  duathlon: ["S", "M", "L", "PM"],
  swimrun: ["experience", "sprint", "series", "championship"],
  trail: [], // le trail n'a PAS de format : sa catégorie d'effort est DÉDUITE des données de course (R7)
};

/**
 * R15.7-C — ÉLIGIBILITÉ : ÂGE × FORMAT. Le moteur savait protéger un mineur (R6.3 : charge
 * ×0,70, zéro VO2max, récupération allongée) mais **rien ne croisait l'âge et le format**.
 * Mesuré : `age: 15` + `tri/Full` était accepté, 59 semaines, pic 7,7 h — une préparation
 * d'un an pour une épreuve où l'inscription est refusée.
 *
 * L'argument est celui qui existe déjà dans le refus de R11.4 : *« te vendre une préparation
 * d'Ironman en un mois serait te mentir »*. Préparer douze mois une épreuve à laquelle on ne
 * pourra pas s'inscrire relève exactement du même mensonge, en plus long.
 *
 * Les âges sont ceux des règlements d'inscription les plus répandus (IRONMAN et 70.3 : 18 ans ;
 * marathons de grandes villes : 18 à 20 ans ; ultras longs : 18 ans). Ils ne sont PAS une
 * limite physiologique — les formats courts restent ouverts et protégés par R6.3, qui reste
 * le bon outil pour la charge.
 */
const AGE_MINI_FORMAT                                         = {
  tri: { Full: 18, "70.3": 18 },
  run: { marathon: 18 },
  duathlon: { PM: 18 },
};
/** Trail : la règle porte sur la DISTANCE, pas sur un format (le trail n'en a pas). */
const AGE_MINI_TRAIL_KM = 50;
/** Le format immédiatement accessible, pour ne jamais refuser sans proposer. */
const REPLI_FORMAT                                         = {
  tri: { Full: "M ou 70.3 à 18 ans", "70.3": "S ou M" },
  run: { marathon: "10 km ou semi-marathon" },
  duathlon: { PM: "S, M ou L" },
};

/**
 * Durée MINIMALE de préparation (R11.4). La table existe DÉJÀ dans la matrice de contraintes,
 * avec sa provenance : on la LIT, on n'en recopie pas une seconde — c'est précisément le
 * défaut que R11.1 corrige. Elle était calculée et jamais appliquée : le moteur acceptait de
 * préparer un Ironman en 4 semaines. Un outil qui accepte ça cautionne la blessure.
 */
// (importée en tête de fichier — pas de seconde table.)

const OUI_NON = ["oui", "non"];
const enumF = (label        , domain          , sports           )            => ({ type: "enum", label, domain, sports });
const numF = (label        , min        , max        , unit         , sports           )            => ({ type: "number", label, min, max, unit, sports });

/**
 * LE SCHÉMA. Toute clé absente d'ici n'est pas validée (l'état de l'app porte quantité de
 * champs qui ne sont pas des réponses : journal, ✓, jetons…). Toute clé présente ici est
 * validée partout, sans exception.
 */
const ANSWER_SCHEMA                            = {
  // ---- Communes ----
  intent: { ...enumF("ton intention", ["competition", "finir", "plaisir"]), fallback: "plaisir/finir (marge de 0,9 sur le volume)" , nature: "vecue" },
  level: { ...enumF("ton niveau", ["debutant", "inter", "avance"]), fallback: "inter" , nature: "estimee" },
  history: { ...enumF("ton historique d'entraînement", ["reprise", "confirme", "ancien"]), fallback: "confirme" , nature: "vecue" },
  dispo: { ...enumF("ta disponibilité", ["quotidienne", "semaine", "partielle", "weekend"]), fallback: "partielle (le défaut se choisit dans le sens de la sécurité, pas de la commodité)" , nature: "vecue" },
  doubles: { ...enumF("les doubles séances", ["oui", "parfois", "non"]), fallback: "non (aucune seconde séance dans la journée)" , nature: "vecue" },
  off_days: { ...enumF("les jours bloqués", OUI_NON), nature: "vecue" },
  off_which: { type: "csv", label: "tes jours bloqués", domain: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] , nature: "vecue" },
  shift_ok: { ...enumF("le décalage de tes jours", OUI_NON), nature: "vecue" },
  sex: { ...enumF("ton sexe", ["F", "H", "np"]), nature: "vecue" },
  sleep: { ...enumF("ton sommeil", ["court", "moyen", "bon"]), nature: "vecue" },
  life_load: { ...enumF("ta charge de vie", ["legere", "normale", "lourde"]), nature: "vecue" },
  activity: { ...enumF("ton activité quotidienne", ["sedentaire", "modere", "actif"]), nature: "vecue" },
  // Le domaine COMPLET, tous sports confondus : ce sont les localisations proposées par le
  // questionnaire (`injuryOpts`). L'UI en montre un sous-ensemble par sport ; le moteur, lui,
  // doit accepter tout ce qui a pu être enregistré — y compris après un changement de sport.
  injury: { type: "csv", label: "tes zones fragiles", nature: "vecue",
    domain: ["aucune", "tibia", "genou", "pied", "hanche", "dos", "epaule", "cou", "course", "velo",
      "quadriceps", "cheville", "fascia"] },
  med_pain: { ...enumF("la douleur à l'effort", OUI_NON), nature: "vecue" },
  med_dizzy: { ...enumF("les vertiges à l'effort", OUI_NON), nature: "vecue" },
  med_treat: { ...enumF("ton suivi médical", OUI_NON), nature: "vecue" },
  cycle_sync: { ...enumF("la synchronisation avec ton cycle", OUI_NON), nature: "vecue" },
  cycle_start: { type: "date", label: "le 1er jour de tes dernières règles" , nature: "vecue" },
  cycle_len: { ...numF("la longueur de ton cycle", 21, 40, "jours"), nature: "vecue" },
  weight_lever: { ...enumF("le levier du poids", ["oui", "non", "coach"]), nature: "vecue" },
  age: { ...numF("ton âge", 10, 100, "ans"), nature: "vecue" },
  weight: { ...numF("ton poids", 25, 250, "kg"), nature: "vecue" },
  height: { ...numF("ta taille", 100, 250, "cm"), nature: "vecue" },
  hr_max: { ...numF("ta FC max", 120, 230, "bpm"), nature: "mesuree" },
  vol_max: { ...numF("ton volume max", 1, 40, "h/sem"), required: true , nature: "vecue" },
  vol_recent: { ...numF("ton volume récent", 0, 40, "h/sem"), nature: "vecue" },
  sessions_max: { ...numF("ton nombre de séances", 1, 14, "séances/sem"), fallback: "7" , nature: "vecue" },
  race_date: { type: "date", label: "la date de ta course" , nature: "vecue" },
  plan_start: { type: "date", label: "le départ de ton plan" , nature: "vecue" },
  // ---- Références mesurées ----
  ftp_known: { ...enumF("« connais-tu ta FTP »", OUI_NON, ["bike", "tri", "duathlon"]), nature: "vecue" },
  pace_known: { ...enumF("« connais-tu ton allure seuil »", OUI_NON, ["run", "trail", "tri", "duathlon", "swimrun"]), nature: "vecue" },
  css_known: { ...enumF("« connais-tu ton CSS »", OUI_NON, ["swim", "tri", "swimrun"]), nature: "vecue" },
  vam_known: { ...enumF("« connais-tu ta VAM »", OUI_NON, ["trail"]), nature: "vecue" },
  ftp: { ...numF("ta FTP", 50, 600, "W", ["bike", "tri", "duathlon"]), nature: "mesuree" },
  vam: { ...numF("ta VAM", 200, 2500, "m/h", ["trail"]), nature: "mesuree" },
  // R12.1 — la montée VÉCUE : deux chiffres que tout le monde peut donner, d'où l'on déduit
  // la VAM. Bornes larges à dessein : c'est un souvenir, pas un protocole.
  climb_dplus_m: { ...numF("le D+ de ta dernière grosse montée", 50, 3000, "m", ["trail"]), nature: "vecue" },
  climb_min: { ...numF("la durée de ta dernière grosse montée", 5, 300, "min", ["trail"]), nature: "vecue" },
  // ---- R14.1 — entrées de la PROJECTION (elles n'agissent pas sur le plan) ----
  // Ces deux clés ne modifient pas la génération : elles pilotent la prédiction PROJETÉE.
  // Elles vivent quand même dans le schéma — c'est la leçon de R14.3-a, où `course_profile`,
  // resté hors schéma, avait fini par diverger du domaine de `terrain` en silence.
  // `training_structure` mesure le STIMULUS DE LA STRUCTURE, pas les années de pratique :
  // quelqu'un qui s'entraîne au feeling depuis dix ans a encore tout le bénéfice d'un plan.
  training_structure: { ...enumF("la structure de ton entraînement récent", ["feeling", "intermittent", "suivi"]), nature: "vecue" },
  // Poids cible : JAMAIS proposé ni suggéré par l'outil (P9). Il n'existe que si l'athlète a
  // demandé le levier ET saisi la valeur lui-même, et il ne produit qu'une SENSIBILITÉ.
  weight_target: { ...numF("ton poids cible", 35, 200, "kg"), nature: "vecue" },
  // R20.1 — LES CLÉS SONT DÉCLARÉES POUR LES SPORTS OÙ ELLES ONT UN SENS, et pour eux seuls.
  // Le balayage dérivé du schéma (`audit:sensibilite`) a montré ce que coûtait l'inverse : la
  // FTP était déclarée pour la COURSE À PIED et la NATATION, `terrain` pour la natation et le
  // swimrun, l'accès au tapis pour les sept sports. Ces clés y étaient évidemment inertes —
  // et une clé inerte noyait le signal des VRAIES inerties dans le rapport. Un schéma qui
  // sur-déclare rend sa propre garde illisible.
  // ---- Terrain / milieu ----
  terrain: { ...enumF("ton terrain", ["plat", "vallonne", "montagne", "route", "trail", "piste", "mixte"], ["run", "bike", "tri", "duathlon"]), nature: "vecue" },
  // ---- R18.2 — LE PROFIL DE COURSE PAR DISCIPLINE ----
  // Retour du fondateur après test : « dans la construction avancée je veux qu'on définisse
  // le profil de la course (ex triathlon : eau vive, vélo montagneux, course plate) ».
  // Il a raison sur un point qu'aucune règle du dépôt ne couvrait : R14.3-a a unifié
  // `terrain` et `course_profile` en UNE clé — ce qui était le bon geste contre la divergence
  // silencieuse —, mais cette clé unique décrit le parcours comme s'il était homogène. Un
  // triathlon ne l'est jamais : on peut nager en eau vive, rouler en montagne et courir à
  // plat, et les trois corrections sont indépendantes. Une clé globale en applique une
  // troisième, fausse pour les trois.
  //
  // Ces clés ne remplacent pas la clé globale, elles la SPÉCIALISENT : `legProfileOf()`
  // retombe dessus quand un leg n'est pas renseigné, exactement comme `courseProfileOf`
  // retombe sur `terrain`. Un seul chemin, trois niveaux de précision — la leçon de R14.3-a
  // tient, on ne recrée pas deux vocabulaires.
  //
  // Le milieu de nage a son propre domaine parce que ce n'est PAS un relief : « montagneux »
  // ne veut rien dire dans l'eau, et l'incertitude n'y est pas de même nature (un courant
  // peut porter autant que freiner — voir SWIM_ENV dans `predictor.ts`).
  leg_swim_env: { ...enumF("le milieu de nage de ta course", ["bassin", "lac", "mer_calme", "mer_agitee", "eau_vive"], ["tri", "swimrun"]), nature: "vecue" },
  leg_bike_prof: { ...enumF("le profil du parcours vélo", ["plat", "vallonne", "montagne"], ["tri", "duathlon"]), nature: "vecue" },
  leg_run_prof: { ...enumF("le profil du parcours à pied", ["plat", "vallonne", "montagne"], ["tri", "duathlon", "swimrun"]), nature: "vecue" },
  milieu: { ...enumF("ton milieu", ["bassin", "ow", "mixte"], ["swim"]), nature: "vecue" },
  swim_limit: { ...enumF("ta limite en natation", ["technique", "respiration", "endurance", "peur"], ["swim"]), nature: "vecue" },
  treadmill: { ...enumF("l'accès au tapis", OUI_NON, ["trail"]), nature: "vecue" },
  // ---- Trail ----
  race_technicity: { ...enumF("la technicité de ta course", ["roulant", "mixte", "technique", "alpin"], ["trail"]), nature: "vecue" },
  race_night: { ...enumF("la part de nuit", ["non", "partielle", "majoritaire"], ["trail"]), nature: "vecue" },
  train_dplus_access: { ...enumF("le dénivelé accessible", ["plat", "collines", "montagne"], ["trail"]), nature: "vecue" },
  poles: { ...enumF("les bâtons", ["oui", "non", "a_decider"], ["trail"]), nature: "vecue" },
  race_distance_km: { ...numF("la distance de ta course", 1, 500, "km", ["trail"]), requiredFor: ["trail"] , nature: "vecue" },
  race_dplus_m: { ...numF("le D+ de ta course", 0, 30000, "m", ["trail"]), required: true , nature: "vecue" },
  race_cutoff_h: { ...numF("la barrière horaire", 1, 200, "h", ["trail"]), nature: "vecue" },
  // ---- Swimrun ----
  openwater_access: { ...enumF("ton accès à l'eau libre", ["aucun", "saisonnier", "toute_annee"], ["swimrun"]), nature: "vecue" },
  team_mode: { ...enumF("solo ou binôme", ["solo", "binome"], ["swimrun"]), fallback: "solo" , nature: "vecue" },
  swim_continuous: { ...enumF("la nage en continu", OUI_NON, ["swimrun"]), nature: "vecue" },
  run_continuous: { ...enumF("la course en continu", OUI_NON, ["swimrun"]), nature: "vecue" },
  gear_test: { ...enumF("le test en tenue", OUI_NON, ["swimrun"]), nature: "vecue" },
  swim_total_m: { ...numF("la nage totale de ta course", 100, 30000, "m", ["swimrun"]), nature: "vecue" },
  run_total_km: { ...numF("la course totale de ton épreuve", 1, 200, "km", ["swimrun"]), nature: "vecue" },
  longest_swim_m: { ...numF("ta plus longue nage", 50, 10000, "m", ["swimrun"]), nature: "vecue" },
  segments_n: { ...numF("le nombre de segments", 2, 60, "", ["swimrun"]), nature: "vecue" },
  // R19.2 — le triathlon aussi. La combinaison vaut 4 à 7 % de temps de nage et sa légalité
  // est un SEUIL RÉGLEMENTAIRE (24,5 °C) : c'est la variable dominante du leg natation, et
  // elle n'existait que pour le swimrun. R18.2 avait ajouté par-dessus un raffinement de
  // ±5 % (mer calme vs mer agitée) sur un modèle où ce facteur-là manquait — l'ordre de
  // grandeur était inversé.
  water_temp_c: { ...numF("la température de l'eau", -2, 35, "°C", ["swimrun", "tri"]), nature: "vecue" },
  team_swim_gap_sec: { ...numF("l'écart de nage du binôme", 0, 120, "s/100m", ["swimrun"]), nature: "mesuree" },
};

/* ───────────────────────── Normalisation numérique (R11.3) ───────────────────────── */

/**
 * Un nombre, ou `null` s'il n'y en a pas. Plus JAMAIS de `Number(x) || défaut` : le défaut
 * était un PLANCHER, si bien qu'une saisie illisible faisait tomber tout le plan dessus au
 * lieu de le refuser. Vide / null / undefined / NaN = ABSENT, jamais 0.
 * La virgule française est normalisée AVANT parsing (« 12,5 » valait 12, et sur un D+ de
 * course « 2,200 » faisait basculer la catégorie trail entière).
 */
function parseNum(v         )                {
  if (v == null) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  // « 12,5 » → 12.5 ; « 2,200 » (séparateur de milliers) → 2200 ; « 1 200 » → 1200
  const cleaned = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "")
    : s.replace(/\s/g, "").replace(",", ".");
  if (!/^[+-]?\d*\.?\d+$/.test(cleaned)) return null;
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : null;
}

/** Une date ISO stricte `AAAA-MM-JJ`, ou `null`. Le format FR « 13/06/2027 » n'est PAS une date ISO. */
function parseISODate(v         )                {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = new Date(s + "T00:00:00Z");
  if (!isFinite(t.getTime())) return null;
  // Rejette « 2027-02-31 » : le mois aurait débordé.
  return t.toISOString().slice(0, 10) === s ? s : null;
}

                                   
                                                                                                
                                                                                         
                                                                                                       
 

const MAX_HORIZON_WEEKS = 104; // R11.5 — au-delà de 2 ans, ce n'est plus une préparation

/**
 * Valide et normalise les réponses. Lève `EBInputError` au premier refus — un plan bâti sur
 * une entrée fausse est plus dangereux qu'un refus, et le refus est réparable par l'athlète.
 */
function validateAnswers(sport        , raw                         , todayISO         )                   {
  const a                          = { ...raw };
  const warnings           = [];
  const defaults                               = [];

  // ---- 1. format : domaine PAR SPORT (B4) ----
  const formats = FORMATS_BY_SPORT[sport];
  if (formats && formats.length) {
    const f = a.format == null || a.format === "" ? null : String(a.format);
    if (f == null) {
      throw new EBInputError("format", a.format, formats.join(" / "),
        "Il manque le format de ta course. Choisis-en un : " + formats.join(", ") + ".");
    }
    if (!formats.includes(f)) {
      // La casse est une faute de frappe fréquente (« full » vs « Full ») : on la rattrape en
      // le DISANT, plutôt que de laisser passer un format inconnu qui fausse tout en aval.
      const fixed = formats.find((x) => x.toLowerCase() === f.toLowerCase());
      if (fixed) {
        a.format = fixed;
        defaults.push({ id: "R11-format-casse", what: "Format corrigé", val: f + " → " + fixed, why: "La casse ne correspondait pas — corrigé plutôt que refusé, mais le plan est bien celui du format " + fixed });
      } else {
        throw new EBInputError("format", f, formats.join(" / "),
          "« " + f + " » n'est pas un format de " + sport + ". Les formats possibles : " + formats.join(", ") + ".");
      }
    }
  }

  // ---- 2. champs du schéma : type + domaine ----
  for (const [key, spec] of Object.entries(ANSWER_SCHEMA)) {
    if (spec.sports && !spec.sports.includes(sport)) continue;
    const v = a[key];
    if (v == null || v === "") {
      // R11.2 — un champ REQUIS absent est un refus : sans lui, le plan serait bâti sur une
      // valeur que l'athlète n'a jamais donnée (`vol_max` absent donnait un plafond de format
      // que personne n'avait demandé, et l'athlète ne pouvait pas le savoir).
      if (spec.required || (spec.requiredFor || []).includes(sport)) {
        throw new EBInputError(key, v, "une valeur" + (spec.unit ? " en " + spec.unit : ""),
          "Il manque " + spec.label + " : c'est une donnée sans laquelle le plan serait construit sur une hypothèse, pas sur toi. Renseigne-la au Profil.");
      }
      // … et un défaut appliqué est JOURNALISÉ, jamais tacite (canal 3).
      if (spec.fallback) {
        defaults.push({ id: "R11-defaut-" + key, what: "Valeur par défaut : " + spec.label,
          val: spec.fallback,
          why: "Tu n'as pas répondu à cette question — le moteur a pris cette valeur. Elle est modifiable au Profil, et elle change le plan." });
      }
      continue;
    }
    if (spec.type === "enum") {
      const s = String(v);
      if (!spec.domain .includes(s)) {
        const fixed = spec.domain .find((x) => x.toLowerCase() === s.toLowerCase());
        if (fixed) { a[key] = fixed; continue; }
        throw new EBInputError(key, v, spec.domain .join(" / "),
          "La réponse à « " + spec.label + " » (« " + s + " ») n'est pas une valeur attendue. Choisis parmi : " + spec.domain .join(", ") + ".");
      }
    } else if (spec.type === "csv") {
      const parts = String(v).split(",").map((x) => x.trim()).filter(Boolean);
      const bad = parts.find((p) => !spec.domain .includes(p) && !spec.domain .some((d) => d.toLowerCase() === p.toLowerCase()));
      if (bad) {
        throw new EBInputError(key, v, spec.domain .join(" / "),
          "« " + bad + " » n'est pas une valeur attendue pour " + spec.label + ". Choisis parmi : " + spec.domain .join(", ") + ".");
      }
      a[key] = parts.map((p) => spec.domain .find((d) => d.toLowerCase() === p.toLowerCase()) || p).join(",");
    } else if (spec.type === "number") {
      const n = parseNum(v);
      if (n == null) {
        throw new EBInputError(key, v, "un nombre" + (spec.unit ? " en " + spec.unit : ""),
          "« " + String(v) + " » n'est pas un nombre : impossible d'en déduire " + spec.label + ". Corrige la valeur"
          + (spec.unit ? " (en " + spec.unit + ")" : "") + ".");
      }
      if (n < spec.min  || n > spec.max ) {
        throw new EBInputError(key, v, spec.min + "–" + spec.max + (spec.unit ? " " + spec.unit : ""),
          spec.label.charAt(0).toUpperCase() + spec.label.slice(1) + " vaut " + n + (spec.unit ? " " + spec.unit : "")
          + " : hors de ce qu'un plan peut prendre au sérieux (" + spec.min + " à " + spec.max + (spec.unit ? " " + spec.unit : "") + ").");
      }
      a[key] = String(n); // normalisé : la virgule FR ne se propage plus
    } else if (spec.type === "date") {
      const d = parseISODate(v);
      if (!d) {
        throw new EBInputError(key, v, "AAAA-MM-JJ",
          "« " + String(v) + " » n'est pas une date lisible pour " + spec.label + ". Format attendu : AAAA-MM-JJ (par exemple 2027-06-13).");
      }
      a[key] = d;
    }
  }

  // ---- 2bis. éligibilité ÂGE × FORMAT (R15.7-C) ----
  // Placé APRÈS la validation du schéma : `age` doit avoir été borné (R13.1) avant qu'on
  // décide quoi que ce soit avec lui. Placé AVANT `minWeeks` : refuser sur la durée de
  // préparation d'une course à laquelle on ne peut pas s'inscrire serait le mauvais motif.
  {
    const age = parseNum(a.age);
    const fmt = String(a.format || "");
    const distKm = parseNum(a.race_distance_km);
    const mini = sport === "trail"
      ? (distKm != null && distKm >= AGE_MINI_TRAIL_KM ? 18 : null)
      : ((AGE_MINI_FORMAT[sport] || {})[fmt] ?? null);
    if (mini != null && age != null && age < mini) {
      const objet = sport === "trail" ? "un trail de " + distKm + " km" : "le format « " + fmt + " »";
      const repli = sport === "trail"
        ? "des distances plus courtes (jusqu'à " + (AGE_MINI_TRAIL_KM - 1) + " km)"
        : ((REPLI_FORMAT[sport] || {})[fmt] || "un format plus court");
      throw new EBInputError("format", fmt || String(distKm) + " km", "un format ouvert à " + age + " ans",
        "À " + age + " ans, l'inscription à " + objet + " est refusée par la quasi-totalité des organisateurs : "
        + "l'âge minimum y est de " + mini + " ans. Te construire une préparation de plusieurs mois pour une "
        + "épreuve où tu ne pourras pas prendre le départ serait te mentir. Ce qui est possible tout de suite : "
        + repli + " — et le plan long redeviendra disponible à tes " + mini + " ans, sans rien perdre de ce que "
        + "tu auras construit d'ici là. C'est une règle d'inscription, pas un jugement sur ton niveau.");
    }
  }

  // ---- 3. contrat `race_date` (B3, B7 — R11.5) ----
  const today = parseISODate(todayISO) || new Date().toISOString().slice(0, 10);
  if (a.race_date) {
    const race = String(a.race_date);
    // Une course PASSÉE n'a pas le même sens selon le moment. Si le plan a été créé AVANT elle,
    // c'est simplement une course qui a eu lieu : on le dit, l'app purge la date à la reprise
    // d'état (R11.5), et le plan continue de s'afficher — refuser au lendemain d'une course
    // serait absurde. Si le plan n'a jamais existé avant elle, c'est une saisie fausse.
    const started = parseISODate(a.plan_start);
    if (race < today) {
      if (started && race >= started) {
        warnings.push("Ta course du " + race + " est passée. Renseigne ta prochaine échéance au Profil pour recaler ton plan — celui-ci reste consultable en attendant.");
      } else {
        throw new EBInputError("race_date", race, "une date future",
          "Ta course du " + race + " est déjà passée. Renseigne ta prochaine échéance — ou retire la date pour un plan sans course.");
      }
    }
    const weeksAway = Math.floor((new Date(race + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / (7 * 864e5));
    if (weeksAway > MAX_HORIZON_WEEKS) {
      warnings.push("Ta course est dans " + weeksAway + " semaines. Au-delà de deux ans, personne ne planifie une séance précise : le plan couvre les " + MAX_HORIZON_WEEKS + " dernières semaines utiles, reviens caler le reste plus près de l'échéance.");
    }
    // ---- 4. `minWeeks` (B2 — R11.4) : LA règle de sécurité qui n'était jamais lue ----
    // Le trail n'a pas de format : son horizon minimal suit la CATÉGORIE D'EFFORT déduite de
    // ses données de course (T6). Sans ça, un 45 km / 2 200 m D+ acceptait 4 semaines de prépa.
    // L'horizon se mesure depuis le DÉPART DU PLAN, pas depuis aujourd'hui : un plan créé il y
    // a vingt semaines pour une course demain est parfaitement valide, et le refuser à trois
    // jours de l'échéance serait absurde. C'est à la CRÉATION que la durée doit suffire.
    const anchor = parseISODate(a.plan_start) && String(a.plan_start) < today ? String(a.plan_start) : today;
    const weeksFromAnchor = Math.floor((new Date(race + "T00:00:00Z").getTime() - new Date(anchor + "T00:00:00Z").getTime()) / (7 * 864e5));
    const need = sport === "trail"
      ? T6_MIN_WEEKS[trailObjective(a                             ).category]
      : (MIN_WEEKS[sport] || {})[String(a.format || "")];
    // On ne refuse que pour une course À VENIR : le jour J et les jours d'après, la durée de
    // préparation n'est plus une décision, c'est une histoire.
    if (need && weeksFromAnchor >= 1 && weeksFromAnchor + 1 < need) {
      const shorter = (formats || []).slice(0, Math.max(0, (formats || []).indexOf(String(a.format))));
      const okDate = new Date(new Date(today + "T00:00:00Z").getTime() + need * 7 * 864e5).toISOString().slice(0, 10);
      const reste = weeksFromAnchor + 1;
      // U9 — LE REFUS NOMME CE QUE L'ATHLÈTE A DEMANDÉ, PAS UN IRONMAN.
      //
      // La dernière phrase était écrite en dur : « Te vendre une préparation d'Ironman en un
      // mois serait te mentir ». Mesuré : **9 refus sur 9** la servaient, sur les SEPT sports —
      // un nageur qui prépare un 1500 m et un coureur qui prépare un 10 km s'entendaient parler
      // d'Ironman. C'est le moment le plus honnête du produit (il refuse une préparation pour
      // ne pas blesser) et il montrait qu'il ne lisait pas la réponse saisie : la crédibilité
      // d'un « non » tient entièrement à ça.
      //
      // On ne fabrique PAS de table de libellés ici : les noms lisibles des formats vivent dans
      // `config.js`, côté UI, et en dupliquer une seconde copie dans le schéma créerait deux
      // sources de vérité pour la même chose. La phrase se passe du libellé — « cette
      // préparation », c'est la sienne, et c'est plus juste qu'une étiquette de catalogue.
      //
      // U9b — et on ne propose plus « un format plus court » quand il n'en existe aucun : sur
      // le format le plus court du sport (tri/S mesuré), l'ancienne phrase envoyait chercher
      // une issue qui n'existe pas.
      const issues = sport === "trail"
        ? ["viser une course plus courte (distance et D+)"]
        : shorter.length ? ["viser un format plus court (" + shorter.join(", ") + ")"] : [];
      issues.push("viser une course à partir du " + okDate);

      // ── R22 — LA TROISIÈME SORTIE : la préparation TRONQUÉE ──
      //
      // Le refus ne change pas d'un mot par défaut. Il gagne une porte, et cette porte
      // n'est franchissable que si l'athlète la pousse EXPLICITEMENT (`truncate_prep`) et
      // que le format le permet (`planTroncature`). Alignement sur O-17 : ce blocage-ci
      // ne remplit pas le critère de dureté du manifeste — « ai-je déjà une base ? » est
      // une question que l'athlète sait trancher, et rater sa course est réversible.
      const trunc = planTroncature(need, reste);
      if (a.truncate_prep === true && trunc && trunc.possible) {
        // On NE LÈVE PAS : la génération continue, et c'est le pont qui applique la date
        // virtuelle et la troncature. Ici on ne fait qu'ouvrir, et l'annoncer.
        warnings.push("Préparation raccourcie à " + trunc.reste + " semaines : les "
          + trunc.aRetirer + " premières semaines de mise en route ont été retirées, "
          + "parce que ta course est proche. Cela suppose une base d'entraînement déjà acquise.");
      } else {
        // Le refus, augmenté de ce qu'il faut à l'UI pour proposer (ou non) la sortie.
        // `bypass` voyage sur l'erreur plutôt que dans un second calcul côté interface :
        // deux façons de décider si le contournement est offert seraient deux règles.
        const e = new EBInputError("race_date", race, "au moins " + need + " semaines avant la course",
          "Il reste " + reste + " semaine(s) avant ta course, et une préparation honnête de ce format en demande au moins " + need + ". "
          + (issues.length > 1 ? "Deux issues : " + issues[0] + ", ou " + issues[1] : "Une seule issue : " + issues[0])
          + ". Te vendre cette préparation en " + reste + " semaine" + (reste > 1 ? "s" : "") + " serait te mentir, et te blesser."
          + (trunc && !trunc.possible ? " " + motifPlancher(trunc) : ""));
        (e                                               ).bypass = trunc;
        throw e;
      }
    }
  }

  if (!a.race_date) {
    // Canal 3, pas canal 2 : ce n'est pas une limite du plan, c'est un DÉFAUT appliqué. Le
    // ranger dans les avertissements le ferait lire comme « ce que le moteur n'a pas pu faire ».
    defaults.push({ id: "R11-defaut-race_date", what: "Durée du plan, sans date de course",
      val: "durée minimale de préparation du format, à partir de cette semaine",
      why: "Tu n'as pas donné d'échéance — renseigne-la au Profil pour que l'affûtage tombe au bon moment plutôt qu'à la fin d'un compte à rebours arbitraire" });
  }

  // ---- 5. contradictions entre valeurs individuellement valides (B8 — canal `warnings`) ----
  const volMax = parseNum(a.vol_max), volRec = parseNum(a.vol_recent), sess = parseNum(a.sessions_max);
  if (volMax != null && volRec != null && volRec > volMax) {
    warnings.push("Tu déclares faire déjà " + volRec + " h/sem alors que ton maximum disponible est " + volMax + " h/sem. Le plan retient le plafond (" + volMax + " h) — si c'est l'inverse que tu voulais dire, corrige l'un des deux au Profil.");
  }
  if (volMax != null && sess != null) {
    // Une contrainte gagne toujours sur l'autre : elle doit être NOMMÉE, sinon l'athlète voit
    // un volume qu'il n'a pas demandé sans savoir laquelle de ses réponses l'a produit.
    if (volMax / sess > 2.5) warnings.push("Avec " + sess + " séances pour " + volMax + " h, chaque séance ferait plus de 2 h 30 en moyenne. C'est le NOMBRE DE SÉANCES qui borne ton plan : le volume réel sera inférieur à ton plafond.");
    else if (volMax / sess < 0.5) warnings.push("Avec " + sess + " séances pour " + volMax + " h, chaque séance ferait moins de 30 min. C'est le VOLUME qui borne ton plan : certaines séances prévues seront remplacées par du repos plutôt que d'être trop courtes pour valoir le déplacement.");
  }
  if (a.ftp_known === "oui" && parseNum(a.ftp) == null) {
    warnings.push("Tu as répondu connaître ta FTP mais aucune valeur n'est enregistrée : le plan travaille sur une estimation. Renseigne-la au Profil pour des zones justes.");
  }
  if (a.pace_known === "oui" && (a.pace == null || a.pace === "")) {
    warnings.push("Tu as répondu connaître ton allure seuil mais aucune valeur n'est enregistrée : le plan travaille sur une estimation. Renseigne-la au Profil pour des allures justes.");
  }
  if (a.css_known === "oui" && (a.css == null || a.css === "")) {
    warnings.push("Tu as répondu connaître ton CSS mais aucune valeur n'est enregistrée : le plan travaille sur une estimation.");
  }
  // ---- O-17 — LA CAPACITÉ QUI DÉPASSE L'HISTORIQUE DE CHARGE ----
  //
  // Cas réel : ancien sportif de haut niveau, cinq ans sans rien, première course à 5'30/km sur
  // 13 min terminée à 185 BPM. Le moteur musculaire et neuromusculaire est conservé, le système
  // aérobie est à zéro, et les tissus conjonctifs n'ont rien encaissé depuis cinq ans.
  //
  // Mesuré — deux profils déclarant tous deux `vol_recent = 0`, même format, même volume max :
  // la semaine 1 est IDENTIQUE (4 séances, 118 min), mais la séance de seuil tourne à 5'45/km
  // pour l'ancien sportif contre 7'00/km pour le vrai débutant. Le volume est bien protégé par
  // la rampe R10 ; l'INTENSITÉ, elle, suit la capacité mesurée sans rien savoir de l'historique
  // de charge. Et rien n'arrête cet athlète, puisqu'il en est physiquement capable.
  //
  // POURQUOI UN AVERTISSEMENT ET NON UNE CONTRAINTE — décision du fondateur (02/08/2026) :
  // « notre rôle est d'informer au mieux et de laisser l'athlète choisir entre son besoin de
  // résultats ou de sécurité ; le but n'est jamais de bloquer mais d'accompagner au mieux, sauf
  // si réelle mise en danger. » Ce cas n'est pas une mise en danger au sens des garde-fous durs
  // (drapeau médical, drapeau douleur, mineur × format, garde IMC, course trop proche) : c'est
  // un risque RÉEL mais assumable, et brider un athlète capable a son propre coût — celui du
  // plan qu'il quitte pour s'entraîner seul, sans aucun garde-fou. La régularité est priorité 3.
  //
  // LE DÉCLENCHEUR EST MESURÉ, PAS DÉCLARÉ. `history = "ancien"` existe dans ce schéma, et
  // R14.1 l'a délibérément dépouillé de tout pouvoir sur les chiffres (« un adjectif
  // auto-déclaré ne pilote aucun chiffre »). On ne le réhabilite pas : on croise deux MESURES
  // que le questionnaire collecte déjà — le volume récent (R10, obligatoire) et la référence
  // saisie. Une capacité de coureur entraîné sur un historique de charge nul, c'est un écart
  // qui se constate ; « ancien sportif » n'est qu'une façon de le raconter.
  // LE SEUIL DE « CAPACITÉ RÉELLE » N'EST PAS UNE CONSTANTE INVENTÉE : c'est la bande de marge
  // du modèle de projection, lue à l'envers. `margeOf` rend 1,0 à quelqu'un assis sur l'ancre la
  // plus lente de sa discipline — le repère « débutant » du moteur. Être PLUS RAPIDE que cette
  // ancre, c'est avoir une capacité au-dessus de ce repère, par définition. On réutilise donc la
  // table existante plutôt que d'en poser une seconde (R11.1), et on hérite gratuitement de son
  // décalage par sexe et par âge (R14.1) : une femme de 50 ans n'est pas jugée contre la même
  // référence qu'un homme de 25.
  const O17_VOL_MAX_H = 2; // au-delà, l'historique de charge existe
  if (volRec != null && volRec <= O17_VOL_MAX_H) {
    const pace = a.pace ? parsePaceSec(a.pace, "run") : 0;
    const css = a.css ? parsePaceSec(a.css, "swim") : 0;
    const poids = parseNum(a.weight), ftp = parseNum(a.ftp);
    const refs = { ftp: ftp ?? 0, thrPace: pace, css };
    const sexe = typeof a.sex === "string" ? a.sex : null;
    const age = parseNum(a.age);
    const auDessus = (d                           )          => {
      const m = margeOf(d, refs, poids, sexe, age);
      return m != null && m < 1; // plus rapide / plus puissant que l'ancre la plus basse
    };
    const fortes           = [];
    if (pace > 0 && auDessus("thrPace")) fortes.push("ton allure seuil en course");
    if (ftp != null && poids != null && auDessus("ftp")) fortes.push("ta puissance au seuil à vélo");
    if (css > 0 && auDessus("css")) fortes.push("ton CSS en natation");
    if (fortes.length) {
      warnings.push(
        "Tu déclares " + volRec + " h/semaine sur les derniers mois, et " + fortes.join(" et ")
        + " dit tout autre chose : tu as gardé une vraie capacité. Le plan en tient compte pour tes "
        + "allures — mais il faut que tu saches ceci, parce que c'est toi qui décides. "
        + "Le cœur et les muscles reviennent en quelques semaines ; les TENDONS, les aponévroses et "
        + "l'os mettent des MOIS. Tu es donc capable de courir plus vite et plus longtemps que ce que "
        + "tes tissus tolèrent aujourd'hui, et rien dans ton ressenti ne te préviendra avant la "
        + "blessure. C'est le scénario de reprise le plus fréquent chez l'ancien sportif. "
        + "Le plan part volontairement bas : la tentation sera d'en faire plus, et c'est précisément "
        + "là que ça casse. Si une douleur apparaît, signale-la — elle verrouille l'intensité, et "
        + "c'est trois semaines de perdues au lieu de trois mois.");
    }
  }

  const needW = (MIN_WEEKS[sport] || {})[String(a.format || "")];
  if (needW != null && needW >= 20 && (a.level === "debutant" || a.history === "reprise")) {
    warnings.push("Tu vises un format long en te déclarant " + (a.level === "debutant" ? "débutant" : "en reprise")
      + ". Le plan reste construit sur tes réponses, mais il part volontairement bas et monte lentement : sur ce type d'objectif, la blessure vient de la marche d'escalier, jamais du plafond.");
  }

  // ---- 6. plan sans aucun jour disponible (B6, en amont) ----
  if (a.off_days === "oui") {
    const off = String(a.off_which || "").split(",").map((x) => x.trim()).filter(Boolean);
    if (off.length >= 7) {
      throw new EBInputError("off_which", a.off_which, "au plus 5 jours bloqués",
        "Tu as bloqué les sept jours de la semaine : il ne reste aucun jour pour t'entraîner. Libère au moins deux jours — un plan sans séance n'est pas un plan.");
    }
    if (off.length >= 5) {
      warnings.push("Avec " + off.length + " jours bloqués sur 7, il reste " + (7 - off.length) + " jour(s) d'entraînement : le plan sera très en dessous de ton objectif. Un cycle de 10 jours (Profil → décalage) répartirait mieux le peu de créneaux disponibles.");
    }
  }
  return { answers: a                  , warnings, defaults };
}

/**
 * R11.6 — un plan vide n'est pas un plan. Contrôle APRÈS génération : c'est le seul moment où
 * l'on sait ce qui a réellement été produit. Un plan à 0 séance, ou un format long dont le pic
 * tient en une heure par semaine, est un échec de génération — pas un résultat.
 */
function assertPlanIsAPlan(sport        , format                    , weeks                                                           )       {
  let nSess = 0, peakMin = 0;
  for (const w of weeks) {
    let wm = 0;
    for (const d of w.days) for (const s of d.sessions) { if (s.d === "rs") continue; nSess++; wm += s.min || 0; }
    peakMin = Math.max(peakMin, wm);
  }
  if (nSess === 0) {
    throw new EBInputError("plan", 0, "au moins une séance",
      "Le plan généré ne contient aucune séance : tes contraintes (jours bloqués, volume, budget de séances) ne laissent pas de place à l'entraînement. Relâche l'une d'elles au Profil.");
  }
  const need = (MIN_WEEKS[sport] || {})[String(format || "")];
  const isLong = need != null && need >= 16; // marathon, 70.3, Full, series/championship, L…
  if (isLong && peakMin < 60) {
    throw new EBInputError("vol_max", peakMin, "un pic d'au moins 1 h/sem",
      "La semaine la plus chargée du plan ne fait que " + Math.round(peakMin) + " min : c'est sans rapport avec l'objectif visé. Vérifie ton volume disponible et ton nombre de séances au Profil — mieux vaut pas de plan qu'un plan qui ment.");
  }
}

// ===== src/engine/cycleModel.ts =====
/**
 * PÉRIODISATION SUR LE CYCLE MENSTRUEL (R11.7 — décision produit du 30/07/2026).
 *
 * Pourquoi ce module existe : l'audit amont a montré que `cycle_sync` n'était JAMAIS lu par le
 * moteur. On demandait à une athlète une donnée intime, on lui affichait une carte de règle
 * « Périodisation cycle », et le plan était identique au bit près. Il fallait choisir : câbler,
 * ou retirer la question. La décision a été de câbler.
 *
 * CE QUE DIT LA LITTÉRATURE, ET CE QU'ELLE NE DIT PAS. La revue systématique de référence
 * (McNulty et al., 2020, *Sports Medicine* — 78 études) conclut à un effet **trivial** de la
 * phase du cycle sur la performance, avec une variabilité INTERINDIVIDUELLE bien plus grande
 * que l'effet moyen. Autrement dit : personne ne peut prédire depuis une application ce que
 * TOI tu ressens en phase lutéale. Toute périodisation qui prétend le contraire vend de la
 * certitude qu'elle n'a pas.
 *
 * Ce module en tire la seule conclusion défendable : **on ne change pas le VOLUME, on change le
 * PLACEMENT.** Les faits mieux établis que la performance elle-même :
 *   · phase lutéale tardive (prémenstruelle) : température centrale plus haute, thermorégulation
 *     dégradée, RPE plus élevé à charge égale, sommeil plus fragmenté ;
 *   · menstruations : très individuel — beaucoup de femmes performent normalement, certaines
 *     non. On ne PRESCRIT donc rien de particulier, on laisse la souplesse.
 *
 * D'où la règle : quand une semaine tombe majoritairement en phase lutéale tardive, la SECONDE
 * séance de qualité de cette semaine devient une séance facile, et le volume perdu revient
 * ailleurs (la courbe s'en charge). Rien de plus. C'est réversible d'un clic, et l'athlète
 * garde le dernier mot — c'est elle qui sait, pas nous.
 */
                                                 

/** Longueur de cycle par défaut, quand elle n'est pas renseignée — médiane des populations. */
const CYCLE_DEFAULT_LEN = 28;
/** Nombre de jours de phase lutéale TARDIVE en fin de cycle (fenêtre prémenstruelle). */
const LUTEAL_LATE_DAYS = 6;

                                                                                         

                             
                  
                    
                     
 

/** Lit l'état du cycle depuis les réponses. Inactif si la donnée manque — jamais deviné. */
function readCycle(a                )             {
  const on = a.sex === "F" && String(a.cycle_sync || "non") === "oui";
  const start = typeof a.cycle_start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.cycle_start) ? a.cycle_start : undefined;
  const len = Math.round(Number(a.cycle_len) || CYCLE_DEFAULT_LEN);
  return {
    active: !!(on && start && len >= 21 && len <= 40),
    startISO: start,
    lengthDays: len >= 21 && len <= 40 ? len : CYCLE_DEFAULT_LEN,
  };
}

/** Jour du cycle (1 = premier jour des règles) pour une date donnée. */
function cycleDay(c            , iso        )                {
  if (!c.active || !c.startISO) return null;
  const t0 = new Date(c.startISO + "T00:00:00Z").getTime();
  const t = new Date(iso + "T00:00:00Z").getTime();
  if (!isFinite(t0) || !isFinite(t)) return null;
  const diff = Math.floor((t - t0) / 864e5);
  const m = ((diff % c.lengthDays) + c.lengthDays) % c.lengthDays;
  return m + 1;
}

function phaseOf(c            , iso        )                    {
  const d = cycleDay(c, iso);
  if (d == null) return null;
  if (d <= 5) return "menstruation";
  if (d <= Math.round(c.lengthDays / 2)) return "folliculaire";
  if (d <= c.lengthDays - LUTEAL_LATE_DAYS) return "luteale";
  return "luteale_tardive";
}

/**
 * Une semaine est « lutéale tardive » quand la MAJORITÉ de ses jours y tombe. On raisonne à la
 * semaine et non au jour : déplacer une séance la veille au soir parce qu'un compteur a changé
 * de case est le genre d'ajustement qui rend un plan illisible et anxiogène.
 */
function weekIsLateLuteal(c            , dayISOs          )          {
  if (!c.active || !dayISOs.length) return false;
  const n = dayISOs.filter((d) => phaseOf(c, d) === "luteale_tardive").length;
  return n * 2 > dayISOs.length;
}

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
                              
                                                                                            
                         
                                                                                    
                               
                                                                                           
                                
                                                                                                 
                                
                                                                                
                              
                                                                                      
                          
                                                                                
                           
                                                                                           
                                                                                          
                                                                         
                                  
                                                                                              
                                                                                              
                                                                                        
                                                                                             
                             
 

/**
 * Récupération inter-répétitions passée aux builders de steps (R3-final). Soit un texte DÉJÀ
 * chiffré (« 2min30 trot ») dont la minute est lue une seule fois, à la construction ; soit un
 * couple `[minutes, libellé]` quand la phrase n'en porte pas (« repos libre entre séries »).
 * Dans les deux cas, ce qui SORT du builder est un nombre — plus jamais une phrase à relire.
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

/**
 * R19.3 — LA DURÉE D'AFFÛTAGE SUIT L'ÉPREUVE, PAS LA LONGUEUR DE LA PRÉPARATION.
 *
 * R13.6 a corrigé un vrai défaut (six semaines d'affûtage sur un plan de 59 semaines) mais
 * sur le MAUVAIS AXE : son plafond ne lisait que `weeks`. Mesuré avant correction — un
 * **Sprint préparé sur 47 semaines recevait 3 semaines d'affûtage**, pour une épreuve de
 * vingt minutes d'effort. Trois semaines de volume réduit de moitié sur un sprint, c'est du
 * désentraînement organisé, exactement ce que R13.6 voulait empêcher chez les longs.
 *
 * Ce qui décide de la durée d'affûtage, c'est la fatigue accumulée et la durée de l'épreuve —
 * pas le temps qu'on a mis à s'y préparer. Bosquet 2007 situe l'optimum général à 8-14 jours ;
 * la pratique l'étire au-delà pour les formats longs, où le volume accumulé est bien plus
 * élevé, et le raccourcit sur les formats courts, où la fraîcheur neuromusculaire se retrouve
 * vite et où l'intensité doit rester présente jusque tard.
 *
 * En semaines : sprint/olympique ~1, demi-fond long ~2, très long ~3.
 * Le plafond de la préparation reste appliqué EN PLUS (min des deux) : un plan de 12 semaines
 * ne donne pas 3 semaines d'affûtage à un Ironman.
 */
const TAPER_WEEKS_BY_FORMAT                                         = rule(
  "R19.3",
  "la durée d'affûtage suit la distance de course et la charge accumulée, pas la longueur de la préparation",
  {
    run: { "5k": 1, "10k": 1, semi: 2, marathon: 3 },
    bike: { crit: 1, clm: 1, route: 2, cyclo: 2, gravel: 2 },
    swim: { sprint: 1, demifond: 1, fond: 2, ow: 2 },
    tri: { S: 1, M: 1, "70.3": 2, Full: 3 },
    duathlon: { S: 1, M: 1, L: 2, PM: 3 },
    swimrun: { experience: 1, sprint: 1, series: 2, championship: 2 },
  },
);
/** Trail : la catégorie d'effort DÉDUITE remplace le format (R7) — même échelle de durée. */
const TAPER_WEEKS_BY_TRAIL_CAT                         = rule(
  "R19.3-t",
  "en trail, c'est la catégorie d'effort déduite qui porte la charge accumulée",
  { kv: 1, court: 1, long: 2, ultra: 3, ultra_long: 3, ultra_xl: 3 },
);

/**
 * R18.4 — LE BRICK D'AFFÛTAGE A SES PROPRES BORNES.
 *
 * `BRICK_BIKE_BOUNDS` (C21b) a été écrit quand le seul brick d'un plan était celui du pic :
 * ses bornes disent « ni une sortie longue déguisée, ni un tour de pâté de maisons » pour une
 * séance de CONSTRUCTION. L'affûtage poursuit l'objectif inverse — entretenir la compétence
 * de transition à coût de fatigue nul — et un brick de 90 min à J-8 sur un 70.3 n'affûte rien.
 *
 * La tentation était d'exempter l'affûtage de C21b. C'est exactement le trou qu'on refuse :
 * un brick sans borne redevient une sortie longue, et c'est comme ça qu'on met une séance de
 * 2 h dans une semaine d'affûtage sans que rien ne le signale. L'affûtage reçoit donc SA
 * bande, et elle est dérivée de l'autre : le PLAFOND d'un brick d'affûtage est le PLANCHER de
 * la bande de charge du même format. Autrement dit, le brick le plus long qu'autorise
 * l'affûtage est le plus court qu'exigeait la construction — la relation est vraie par
 * construction pour les six formats, elle ne peut pas dériver.
 *
 * Bosquet 2007 (méta-analyse d'affûtage) : ce qu'on retire, c'est le VOLUME. Ni l'intensité,
 * ni la spécificité — d'où le fait que cette séance existe encore du tout.
 */
const BRICK_TAPER_BIKE_BOUNDS                                   = rule(
  "C21c",
  "en affûtage le brick entretient la transition au lieu de la construire : sa bande est plafonnée au plancher de la bande de charge du format",
  {
    S: [20, BRICK_BIKE_BOUNDS.S[0]], M: [25, BRICK_BIKE_BOUNDS.M[0]],
    "70.3": [30, BRICK_BIKE_BOUNDS["70.3"][0]], Full: [40, BRICK_BIKE_BOUNDS.Full[0]],
    L: [30, BRICK_BIKE_BOUNDS.L[0]], PM: [40, BRICK_BIKE_BOUNDS.PM[0]],
  },
);

/**
 * Plafond de DOSE par bloc de qualité (minutes dans la zone, répétitions comprises).
 * Ce n'est pas le nombre de répétitions qui blesse, c'est le temps passé dans la zone : le
 * plafond de reps seul laissait passer `5×14min` au seuil (70 min) parce que la mise à
 * l'échelle avait allongé la DURÉE et non le nombre de blocs.
 */
const DOSE_CAP_MIN = rule(
  "C25",
  "au-delà de ~40 min de seuil ou ~25 min de VO2max dans une séance, ce n'est plus un entraînement dur mais une course : personne ne l'enchaîne semaine après semaine sans casser",
  { thr: 40, vo2: 25 },
);

const C21_REPRISE_BRICK_FACTOR = rule("C21", "en reprise, le brick ne mange pas la semaine (61% du volume hebdo observé sans ce facteur)", 0.8);

/** Plafonds de séance longue / nage par format (R3.4b), et budget implicite du volume. */
const CAP_LONG                         = { "5k": 74, "10k": 90, semi: 130, marathon: 180, trail: 255, crit: 150, route: 180, clm: 165, cyclo: 240, gravel: 360 };
const CAP_SWIM                         = { sprint: 1400, demifond: 2000, fond: 3000, ow: 4500, S: 750, M: 1500, "70.3": 1900, Full: 3000 };
const AVG_SESSION_H                                 = { run: 1.15, bike: 1.3, tri: 1.2 };

/** C13 — l'échauffement chiffré ne dépasse jamais 25min ni le corps de séance. */
const C13_WARMUP_MAX_MIN = rule("C13", "échauffement ≤25min et ≤ corps de séance", 25);
/**
 * C13c — PLANCHER d'échauffement : 10 min, quelle que soit la taille de la séance.
 *
 * Le plancher était de 3 min, et la clause de proportion (`≤ 0,8 × corps`) l'y ramenait dès que
 * la courbe réduisait la séance : mesuré sur 9 795 séances, **1 213 séances de QUALITÉ
 * s'échauffaient moins de 10 min, dont 663 moins de 5 min** — un 3×1000 m au seuil précédé de
 * trois minutes de footing. Physiologiquement, la montée de température musculaire, l'ouverture
 * vasculaire et la cinétique de VO2 demandent une dizaine de minutes ; en dessous, le premier
 * intervalle sert d'échauffement et se paie en risque tendineux. La priorité n°2 du manifeste
 * (prévention des blessures) prime sur la proportion : on ne rabote pas un échauffement pour
 * faire tenir une séance dans une enveloppe.
 *
 * Conséquence assumée et TRAITÉE : sous une certaine enveloppe, une séance de qualité ne tient
 * plus (10 min d'échauffement + une dose utile + 3 min de retour au calme). Elle n'est pas
 * rabotée — elle est DÉCLASSÉE en séance facile (C13d, weekBuilder) : mieux vaut un footing
 * assumé qu'une VO2max mal échauffée.
 */
const C13c_WARMUP_MIN_MIN = rule("C13c", "échauffement ≥10min sur toute séance qui en porte un", 10);
/**
 * C27 — LA VEILLE D'UNE COURSE NE DÉPASSE PAS 45 MIN, ET ELLE EST FACILE.
 *
 * Mesuré : la veille d'une course intermédiaire portait la PLUS LONGUE séance de la semaine sur
 * les quatre sports testés — 4 h 30 de trail, 3 h 56 de vélo, 3 h 23 de brick. La course était
 * insérée dans un calendrier déjà construit, sans que les jours voisins soient replanifiés.
 * 45 minutes souples, quelques accélérations courtes : c'est ce que fait un entraîneur la
 * veille, et c'est le seul contenu qui ne coûte rien le lendemain.
 */
// R13.4 — 45 min la veille n'était pas un déverrouillage, c'était une séance pleine (mesuré :
// 48 min la veille d'un Ironman, 63 la veille d'un 70.3). Un déverrouillage se joue à
// 15-25 min : échauffement + trois accélérations — réveiller, jamais entamer.
const RACE_EVE_CAP_MIN = rule("C27", "la veille d'une course : ≤25 min — un déverrouillage réveille les jambes (échauffement + 3 accélérations), une séance pleine les entame", 25);

/**
 * C26 — LE PLANCHER DE TEMPS FACILE DÉPEND DU VOLUME, PARCE QUE 80/20 EN EST UNE CONSÉQUENCE.
 *
 * La justification, écrite avant de regarder quelles combinaisons passent.
 *
 * La répartition ~80/20 est une OBSERVATION faite sur des athlètes d'endurance de haut niveau
 * s'entraînant 10 à 25 h par semaine (Seiler, Esteve-Lanao, Stöggl & Sperlich). Son mécanisme
 * est explicite : à ce volume, ce qui limite l'adaptation est la capacité de RÉCUPÉRATION, et
 * le temps passé en intensité en est le premier consommateur. La proportion de 80 % de facile
 * n'est donc pas une loi : c'est ce qu'on obtient mécaniquement quand on plafonne le travail
 * dur à ce qu'un organisme absorbe — environ deux séances et une heure par semaine — et qu'on
 * remplit le reste d'un volume important.
 *
 * En dessous de ce volume, le facteur limitant s'inverse. Un athlète à 3 h par semaine récupère
 * complètement entre ses séances ; ce qui limite son progrès n'est plus la récupération mais le
 * STIMULUS TOTAL. Lui imposer 80 % de facile laisse 35 minutes de qualité hebdomadaire, moins
 * que ce qu'il faut pour seulement MAINTENIR la puissance aérobie maximale. Le seuil de 70 %,
 * appliqué tel quel à une petite enveloppe, protège donc contre un risque qui n'existe pas et
 * dégrade le plan qu'il prétend garder sain.
 *
 * La règle physiologiquement vraie est donc le PLAFOND DE TEMPS DUR (≈60 min/semaine, deux à
 * trois séances) ; la part de facile en est la conséquence arithmétique. On l'énonce dans ce
 * sens : `plancher_facile = 1 − 60 / minutes_hebdo`, borné à [60 %, 70 %].
 *   · 10 h/sem → 1 − 60/600 = 90 % … borné à 70 % : la règle historique, inchangée.
 *   ·  6 h/sem → 1 − 60/360 = 83 % … borné à 70 % : inchangée aussi.
 *   ·  3 h/sem → 1 − 60/180 = 67 % : le plan a droit à une heure de qualité, comme les autres.
 * Le plancher absolu de 60 % reste : en dessous, ce n'est plus une préparation d'endurance.
 *
 * Ce n'est PAS un seuil ajusté à ses contre-exemples : le plafond de 60 min de travail dur est
 * la grandeur physiologique, et elle est identique pour tout le monde. C'est le pourcentage,
 * grandeur dérivée, qui varie — comme il l'a toujours fait dans la littérature.
 */
const C26_HARD_TIME_CAP_MIN = rule("C26", "le facteur limitant est le temps DUR hebdomadaire (~60 min), pas son pourcentage : la part de facile en découle", 60);
const C26_EASY_SHARE_MAX = 0.70;
const C26_EASY_SHARE_MIN = 0.60;
/**
 * C26b — LES 60 MINUTES NE SONT PAS LES MÊMES POUR TOUT LE MONDE.
 *
 * Le raisonnement de C26 tient : le plafond de temps DUR est la grandeur physiologique, la part
 * de facile en est la dérivée. Mais la constante, elle, décrit une capacité de RÉCUPÉRATION
 * CENTRALE — cardiaque, métabolique, nerveuse — et ce n'est pas ce qui limite tout le monde.
 *
 * Chez un athlète qui reprend, ou qui débute, le facteur limitant est le TISSU CONJONCTIF :
 * tendons, aponévroses, os. Il se remodèle sur des semaines à des mois, bien plus lentement que
 * la filière aérobie, et il ne prévient pas — la tendinopathie arrive après la séance qui s'est
 * bien passée. C'est précisément le profil de la V1 grand public, et c'est là que 48 minutes de
 * qualité hebdomadaire sur une enveloppe de 2 h deviennent dangereuses : la borne basse de 60 %
 * les autorisait.
 *
 * Une blessure déclarée dit la même chose, en plus fort et au présent.
 *
 * On module donc la CONSTANTE, pas le raisonnement — c'est ce que l'audit demandait.
 */
const C26b_HARD_TIME_BY_HISTORY                         = rule(
  "C26b",
  "le plafond de temps dur suit ce qui limite VRAIMENT : récupération centrale chez l'entraîné, tissu conjonctif chez celui qui reprend",
  { reprise: 35, confirme: 60, ancien: 60 },
);
const C26b_HARD_TIME_BEGINNER_MIN = rule("C26b-deb", "un débutant construit son tissu conjonctif avant sa puissance : la qualité reste marginale", 25);
const C26b_INJURY_FACTOR = rule("C26b-bless", "une blessure déclarée dit au présent ce que l'historique dit au passé", 0.6);

/**
 * C26c (R20.4) — LE PLAFOND DE TEMPS DUR EST VÉRIFIÉ. AVANT, IL ÉTAIT SEULEMENT DÉCLARÉ.
 *
 * C26 dit, noir sur blanc : « la règle physiologiquement vraie est le PLAFOND DE TEMPS DUR
 * (≈60 min/semaine) ; la part de facile en est la conséquence arithmétique ». Et pourtant la
 * seule chose que l'auditeur mesurait était la part de facile — c'est-à-dire la grandeur
 * DÉRIVÉE, et sur le mauvais dénominateur : `easy / (easy + modéré + dur)`. Le temps DUR, la
 * grandeur que la justification désigne comme physiologique, n'était vérifié nulle part.
 *
 * Les deux conséquences, mesurées sur 7 356 semaines de charge (7 sports × formats × historiques
 * × niveaux × 4 enveloppes de volume) :
 *
 * 1. **1 095 semaines (15 %) dépassaient le plafond que C26 déclare.** Pire cas : un DÉBUTANT
 *    en préparation de semi à 10 h/sem recevait **112 min de travail dur** contre un plafond
 *    déclaré de 25 — quatre fois et demie. Le profil que C26b décrit comme limité par son
 *    tissu conjonctif, celui qui ne prévient pas avant la tendinopathie.
 * 2. **Le modéré, lui, ne débordait jamais** : 2 semaines sur 7 356 au-dessus de 35 % du temps.
 *    La règle punissait donc la grandeur inoffensive et ne regardait pas la dangereuse.
 *
 * C'est la leçon d'O-12 payée une seconde fois : `bk.rp`, `bk.ss`, `rn.mara` sont MODÉRÉS, et
 * les mettre dans le même sac que la VO2max fait dire à une mesure autre chose que ce qu'on
 * croit lire. Ma propre erreur R19.4 venait de là ; ici c'était l'auditeur qui la portait.
 *
 * Le plafond ne change pas — c'est `hardTimeCapMin()`, celui que C26/C26b déclaraient déjà. La
 * TOLÉRANCE existe parce que le temps dur d'une semaine se quantifie par répétitions : on ne
 * peut pas atteindre 60,0 min avec des blocs de 4 min. Elle est délibérément petite.
 */
const C26c_HARD_TIME_TOLERANCE = rule(
  "C26c",
  "le temps dur se quantifie par RÉPÉTITIONS : exiger la minute exacte ferait retirer une répétition entière pour deux minutes d'écart",
  1.1,
);

/**
 * C26d (R20.4) — LE MODÉRÉ A SA PROPRE BORNE, PLUS LARGE, ET C'EST VOULU.
 *
 * Une fois le temps dur borné pour lui-même, il reste à dire ce qu'on attend du modéré — sinon
 * la seule règle qui le concernait disparaît et un plan pourrait devenir 100 % tempo.
 *
 * Le modéré n'est pas du dur en plus petit : il coûte peu en récupération centrale et beaucoup
 * moins en charge tissulaire, ce qui est précisément la raison pour laquelle il ne doit pas
 * partager le plafond du dur. Mais une semaine majoritairement en zone modérée est la « zone
 * grise » que le manifeste refuse — trop dur pour récupérer, trop facile pour progresser.
 *
 * 40 % : mesuré à 2 semaines sur 7 356 au-dessus de 35 % aujourd'hui. La borne est donc posée
 * AU-DESSUS de ce que le moteur produit, volontairement : elle existe pour empêcher une dérive
 * future, pas pour valider l'état présent. Une borne calibrée au ras du comportement actuel est
 * une borne qui se contente de photographier ce qu'elle est censée juger.
 */
const C26d_MOD_SHARE_MAX = rule(
  "C26d",
  "le modéré ne partage pas le plafond du dur (il coûte moins en récupération et en charge tissulaire), mais une semaine majoritairement modérée est la zone grise que le manifeste refuse",
  0.40,
);

                               
                   
                 
                    
 
/** Plafond de temps DUR hebdomadaire pour ce profil (C26 + C26b). */
function hardTimeCapMin(ctx               )         {
  let cap = C26b_HARD_TIME_BY_HISTORY[ctx?.history || "confirme"] ?? C26_HARD_TIME_CAP_MIN;
  if (ctx?.level === "debutant") cap = Math.min(cap, C26b_HARD_TIME_BEGINNER_MIN);
  if (ctx?.injured) cap = Math.round(cap * C26b_INJURY_FACTOR);
  return cap;
}
function easyShareFloor(weeklyMin        , ctx               )         {
  if (!(weeklyMin > 0)) return C26_EASY_SHARE_MAX;
  const derived = 1 - hardTimeCapMin(ctx) / weeklyMin;
  return Math.min(C26_EASY_SHARE_MAX, Math.max(C26_EASY_SHARE_MIN, derived));
}

/**
 * C25 — UNE SÉANCE DE RÉCUPÉRATION RESTE COURTE : 60 min, plafond dur.
 *
 * Le modèle de séance est nommé à la SÉLECTION, puis la mise à l'échelle allonge sa durée pour
 * remplir l'enveloppe — sans jamais renommer ni requalifier. Mesuré : « Nage récup courte » de
 * 196 min et 9 025 m, « Récup active » de 134 min, « Footing récup » de 98 min. Un athlète qui
 * lit « récup courte » et trouve 9 kilomètres ne fera plus jamais confiance à un libellé, et
 * c'est le libellé qui porte l'intention pédagogique de toute l'application.
 *
 * Une heure est la borne haute de ce qu'un entraîneur appelle une récupération : au-delà, le
 * volume lui-même devient une charge, ce qui est exactement l'inverse du but de la séance.
 * Le déversement de volume va vers les séances d'ENDURANCE, jamais vers la récupération.
 */
const C25_RECOVERY_SESSION_CAP_MIN = rule("C25", "une séance dont l'intention est la récupération ne dépasse pas 60 min", 60);

/**
 * C13e — L'ÉCHAUFFEMENT N'EST JAMAIS PLUS LONG QUE LE CORPS DE SÉANCE. Invariant DUR, sur les
 * six sports et dans les deux unités (minutes en course/vélo/trail, mètres en bassin). Une
 * séance dont l'échauffement pèse plus que le travail n'est pas une séance : c'est un footing
 * qui porte l'étiquette d'une autre chose, et l'athlète qui la lit ne peut plus se fier au nom.
 * C'est cette borne qui arbitre contre C13c : le plancher de 10 min est un OBJECTIF
 * physiologique, pas une autorisation à déséquilibrer la séance. Quand les deux se contredisent,
 * ce n'est pas le rendu qui gonfle l'échauffement — c'est C13d qui restructure la séance.
 */
const C13e_WARMUP_NEVER_OVER_BODY = rule("C13e", "échauffement ≤ corps de séance, toujours", true);
/**
 * C13d — DOSE MINIMALE D'UNE SÉANCE DE QUALITÉ : 8 min de travail. En dessous, la séance ne
 * mérite plus son nom (l'échauffement et le retour au calme y pèsent plus que le travail) et le
 * créneau devient de l'endurance continue plutôt qu'une caricature de séance dure.
 *
 * Ce seuil n'est délibérément PAS aligné sur le plancher d'échauffement C13c, et l'écart de
 * deux minutes est le résultat d'une mesure. Les aligner à 10 min paraissait plus propre — un
 * échauffement de 10 min tient alors toujours sans dépasser le corps — mais sur une petite
 * enveloppe (swimrun à 4 h/sem) TOUTES les séances de qualité passaient sous le seuil : le plan
 * perdait son unique stimulus VO2 sur 41 semaines (`S-NOVO2`, banc v7). Un plan petit reste un
 * plan : il garde sa qualité. Entre 8 et 10 min de corps, c'est donc C13e qui arbitre —
 * l'échauffement s'aligne sur le corps au lieu de le dépasser.
 */
const C13d_QUALITY_MIN_BODY_MIN = rule("C13d", "dose de qualité ≥8min de travail, sinon la séance est déclassée", 8);

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
 * jamais une zone négative ou absurde à l'écran (l'attribut HTML min n'est pas une validation).
 *
 * R13.1 — UNE SEULE SOURCE DE BORNES. Cette table portait ses propres littéraux à côté
 * d'`ANSWER_SCHEMA` : deux domaines pour la même grandeur, et les extrêmes passaient ENTRE les
 * deux. Mesuré : le schéma accepte un âge de 10 à 100, cette table n'en croyait que 14 à 95 —
 * `boundedOrZero("age", 12)` rendait 0, le prédicat `minor` devenait faux, et un enfant de
 * 10 ans recevait le plan adulte complet, VO2max comprises, sans un mot. Un athlète de 98 ans
 * aussi, avec la FCmax d'un homme de 35 ans (le repli d'âge). Cinq clés divergeaient (âge,
 * poids, taille, FCmax, FTP) — l'en-tête de R11 l'avait écrit : « une énumération écrite deux
 * fois est une énumération qui divergera ». Toute clé présente dans le schéma DÉRIVE désormais
 * ses bornes de lui ; si une borne physio doit être plus stricte, c'est LE SCHÉMA qu'on change.
 * Seul `hrRest` (absent du questionnaire) garde une borne locale. */
function schemaBound(key        , unit        )                                             {
  const f = ANSWER_SCHEMA[key]                                              ;
  if (!f || f.min == null || f.max == null)
    throw new Error("PHYSIO_BOUNDS : la clé « " + key + " » n'existe pas (ou n'est pas numérique) dans ANSWER_SCHEMA — la borne doit vivre dans le schéma, pas ici");
  return { min: f.min, max: f.max, unit };
}
// Accesseurs PARESSEUX : `answerSchema` et ce module s'importent mutuellement, et selon le
// point d'entrée du cycle, `ANSWER_SCHEMA` n'existe pas encore quand cette table s'initialise
// (mesuré : TDZ en important `answerSchema` en premier). La dérivation se fait donc à la
// LECTURE, jamais à l'initialisation — les deux modules sont toujours prêts à ce moment-là.
const PHYSIO_BOUNDS                                                             = rule(
  "E3",
  "une FTP de -100W ou de 9999W produit des zones absurdes affichées sans bruit : hors bornes = non renseigné + avertissement ; bornes DÉRIVÉES d'ANSWER_SCHEMA (R13.1 : deux tables = une zone morte entre les deux)",
  {
    get ftp() { return schemaBound("ftp", "W"); },
    get hrMax() { return schemaBound("hr_max", "bpm"); },
    hrRest: { min: 30, max: 100, unit: "bpm" }, // absent du schéma : borne locale assumée
    get weight() { return schemaBound("weight", "kg"); },
    get height() { return schemaBound("height", "cm"); },
    get age() { return schemaBound("age", "ans"); },
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
  "une séance de force basse cadence en affûtage (même fatigue résiduelle que la VO2max)",
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
    // R12.2 — LA référence du trail. Elle n'avait aucun protocole écrit : le plan la devinait.
    verticalSource: {
      test: "VAM (montée continue de 20 à 30 min)",
      protocol: "Choisis une montée régulière que tu peux tenir 20 à 30 minutes sans t'arrêter, sur une pente franche (8-15 %). Échauffe-toi 15 min, puis monte à un rythme dur mais RÉGULIER — celui que tu tiendrais une heure si tu devais. Relève le D+ et le temps : VAM = D+ ÷ durée en heures. Refais-la sur la MÊME montée à chaque retest, sinon tu compares deux choses différentes.",
      refKey: "vam",
    },
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

/**
 * T18 (R12.1) — LA VAM SE DÉDUIT D'UNE MONTÉE VÉCUE, PAS D'UN ADJECTIF.
 *
 * L'audit grand public a montré le défaut : contrairement aux trois autres références, le trail
 * ne se repliait pas sur une grandeur observable — il substituait un NOMBRE déduit d'un adjectif
 * auto-déclaré (`level`), puis construisait tout le plan et la prédiction dessus. Sur un
 * 45 km / 2 200 m, le seul changement de « niveau » faisait varier l'estimation de course de
 * TROIS HEURES. Or « intermédiaire » est la case que tout le monde coche.
 *
 * La bonne question n'est pas « connais-tu ta VAM ? » — personne ne la connaît — mais
 * « ta dernière grosse montée : combien de D+, en combien de temps ? ». Tout le monde sait y
 * répondre, et c'est une MESURE.
 *
 * L'abattement : une montée d'entraînement n'est pas un effort seuil, et une montée courte
 * flatte la moyenne (on tient 900 m/h sur 15 min, pas sur une heure). On retient donc 90 % de
 * la VAM observée, et 85 % sous 15 minutes. Conservateur par construction : sous-estimer la VAM
 * donne un plan un peu facile, la surestimer donne un plan intenable et une prédiction qui ment.
 */
const T18_VAM_FROM_CLIMB = trule(
  "T18",
  "une VAM mesurée sur une montée vécue vaut mieux qu'une VAM déduite d'un adjectif — avec un abattement, car une montée d'entraînement n'est pas un effort seuil et une montée courte flatte la moyenne",
  { abatement: 0.9, shortClimbMin: 15, shortAbatement: 0.85, minMin: 5, maxMin: 300 },
);

/**
 * Repli quand l'athlète n'a ni VAM ni montée à déclarer (R12.4). Deux principes :
 *
 * 1. **BORNE BASSE, pas médiane.** Pour une V1 grand public, l'inconnu doit tomber vers le bas.
 *    L'ancien défaut (850 m/h) décrivait déjà un grimpeur solide. Un plan calibré trop haut se
 *    paie en blessure ; calibré trop bas, il se corrige à la première montée déclarée.
 * 2. **Le repli ne s'appuie plus sur `level`.** C'était le cœur du défaut mesuré : le seul
 *    changement d'adjectif faisait varier l'estimation de course de TROIS HEURES, et
 *    « intermédiaire » est la case que tout le monde coche. On s'appuie sur deux réponses
 *    FACTUELLES — depuis combien de temps tu pratiques, et quel dénivelé tu as près de chez toi
 *    (quelqu'un qui vit en montagne grimpe, quelqu'un qui vit en plaine non). `level` continue
 *    de servir là où il est légitime : le CONTENU des séances, jamais un chiffre de prédiction.
 */
const VAM_BY_HISTORY                         = trule(
  "T18b", "l'ancienneté de pratique est une réponse factuelle ; le « niveau » est un adjectif — seul le premier a le droit de piloter un chiffre",
  { reprise: 500, confirme: 620, ancien: 720 },
);
/** Allure seuil sur plat, en secondes/km, quand elle n'est pas connue — adossée à l'ancienneté
 *  de pratique, jamais au niveau ressenti (R12.6). Volontairement prudente. */
/**
 * T19 — LA RÉCUPÉRATION D'UNE RÉPÉTITION EN PENTE EST UN RETOUR, ET IL SE CALCULE.
 *
 * En trail, la récupération entre deux répétitions n'est pas une pause : c'est le trajet de
 * retour au pied de la côte (ou en haut de la descente). Elle a donc une durée, et cette durée
 * se DÉDUIT du dénivelé de la répétition — pas d'une phrase. C'était le dernier endroit du
 * moteur où de la prose servait de donnée : 1 740 récupérations de trail étaient comptées
 * 0 minute parce que leur libellé (« descente MARCHÉE », « remontée en marche active ») ne
 * portait aucun chiffre. Une séance de côtes annoncée 11 min en durait 20.
 *
 * Vitesses de RETOUR, pas d'effort — c'est ce qui les distingue des VAM d'entraînement :
 *   · descente marchée/trottinée de récupération : 900 m D−/h. Une descente de récupération se
 *     freine (c'est elle qui casse les cuisses) ; 900 m/h est le compromis observé entre la
 *     marche prudente (~600) et le trot souple (~1 200).
 *   · remontée en marche active : 400 m D+/h. C'est la VAM de randonnée soutenue — au-dessus,
 *     ce n'est plus une récupération, c'est un second bloc de travail.
 * Plancher d'une minute : une répétition ne s'enchaîne pas sans une reprise de souffle, même
 * quand le dénivelé est minuscule.
 */
const T19_RETURN = trule(
  "T19",
  "la récupération d'une répétition en pente est le trajet de retour : sa durée se déduit du dénivelé, jamais d'un libellé",
  { downWalkMPerH: 900, upWalkMPerH: 400, minMin: 1, maxMin: 45 },
);

/** Durée du RETOUR après une répétition en pente, en minutes (T19). `up`/`down` = mètres de
 *  dénivelé de la répétition ; on redescend ce qu'on a monté, on remonte ce qu'on a descendu. */
function returnMinutes(o                                       )         {
  const t = (o.dplusM ? (o.dplusM / T19_RETURN.downWalkMPerH) * 60 : 0)
    + (o.dmoinsM ? (o.dmoinsM / T19_RETURN.upWalkMPerH) * 60 : 0);
  return Math.min(T19_RETURN.maxMin, Math.max(T19_RETURN.minMin, Math.round(t * 10) / 10));
}

/**
 * T19, RÉCONCILIATION — `recoveryMin` d'un bloc en pente est une DÉRIVÉE de son dénivelé, et
 * le dénivelé bouge après la construction (mise à l'échelle verticale T1/T2, plafond de bosse
 * accessible, allègement T3). Un nombre dérivé figé trop tôt ment dès la première passe qui
 * touche sa source : on le recalcule donc à chaque rendu, comme `_min`.
 *
 * Le TAPIS est exclu : sur un tapis, on ne redescend rien — la récupération est l'intervalle à
 * plat prescrit par la séance, une valeur fixe et non déductible du dénivelé simulé.
 */
function syncReturnRecovery(steps                                                                                                                                                         )       {
  for (const st of steps) {
    if (st.role !== "body" || (st.reps || 1) <= 1 || !st.recoveryText) continue;
    if (!st.gradient || st.gradient === "flat" || st.surface === "tapis") continue;
    st.recoveryMin = returnMinutes({ dplusM: st.dplusM, dmoinsM: st.dmoinsM });
  }
}

const T18d_FLAT_PACE_BY_HISTORY                         = trule(
  "T18d", "un repli d'allure doit s'appuyer sur une réponse vérifiable ; le niveau ressenti n'en est pas une",
  { reprise: 380, confirme: 330, ancien: 300 },
);
/** … modulé par le dénivelé RÉELLEMENT accessible : on grimpe ce qu'on a sous la porte. */
const VAM_BY_TERRAIN                         = trule(
  "T18c", "le dénivelé accessible depuis chez soi prédit mieux la capacité en montée qu'un niveau ressenti",
  { plat: 0.9, collines: 1.0, montagne: 1.1 },
);

/** VAM déduite d'une montée déclarée (D+ en m, durée en min) — `null` si la saisie ne dit rien. */
function vamFromClimb(dplusM        , minutes        )                {
  const T = T18_VAM_FROM_CLIMB;
  if (!(dplusM > 0) || !(minutes >= T.minMin) || minutes > T.maxMin) return null;
  const raw = dplusM / (minutes / 60);
  const f = minutes < T.shortClimbMin ? T.shortAbatement : T.abatement;
  const v = Math.round(raw * f);
  return v >= 150 && v <= 2500 ? v : null;
}

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
  // Trois sources, dans cet ordre : la VAM saisie (rare), la montée VÉCUE (R12.1 — ce que les
  // gens savent), et à défaut un repli conservateur pondéré par l'historique (R12.4).
  const vamDeclared = a.vam_known === "oui" && num(a.vam) >= 200 && num(a.vam) <= 2500 ? num(a.vam) : 0;
  const vamClimb = vamDeclared ? 0 : (vamFromClimb(num(a.climb_dplus_m), num(a.climb_min)) || 0);
  const vamKnown = vamDeclared > 0 || vamClimb > 0;
  const vamSource                                    = vamDeclared ? "declaree" : vamClimb ? "montee" : "estimee";
  const vam = vamDeclared || vamClimb
    || Math.round((VAM_BY_HISTORY[a.history || "confirme"] ?? 620) * (VAM_BY_TERRAIN[a.train_dplus_access || "collines"] ?? 1));
  // allure seuil SUR PLAT (s/km) — la référence route reste valable à plat
  // R12.6 — même principe que pour la VAM : quand l'allure n'est pas connue, le repli suit une
  // réponse FACTUELLE (l'ancienneté de pratique), pas un adjectif. C'est par ce chemin que
  // `level` faisait encore varier l'estimation de course — et donc la sortie longue, calibrée
  // en pourcentage du temps de course (T4).
  const flatPaceSec = num(a.pace_known === "oui" ? paceToSec(a.pace) : 0)
    || (T18d_FLAT_PACE_BY_HISTORY[a.history || "confirme"] ?? 330);
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
    technicity: a.race_technicity || "mixte", night, vam, vamKnown, vamSource, flatPaceSec,
    cutoffH: num(a.race_cutoff_h) > 0 ? num(a.race_cutoff_h) : null,
    altitudeMaxM: num(a.race_altitude_max_m) > 0 ? num(a.race_altitude_max_m) : null,
    why: distanceKm + " km / " + dplusM + " m D+ = " + kmEffort + " km-effort · "
      + (vamSource === "declaree" ? "ta VAM de " + Math.round(vam) + " m/h"
        : vamSource === "montee" ? "ta VAM de " + Math.round(vam) + " m/h, déduite de la montée que tu as déclarée"
        : "VAM estimée à " + Math.round(vam) + " m/h (repli prudent : " + (a.history || "confirme") + ", terrain " + (a.train_dplus_access || "collines") + ")")
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
const TRAIL_ACCESS                                                                          = {
  montagne: { perLongRun: 2000, perBlock: 700, label: "montagne (>800m D+ accessibles)" },
  collines: { perLongRun: 800, perBlock: 300, label: "collines (200-800m D+)" },
  // T1b (audit v7) — `perBlock` : le D+ d'UN bloc, pas seulement de la semaine. La question
  // « quel dénivelé accessible depuis chez toi ? » est présentée comme la contrainte n°1 d'une
  // prépa trail ; elle modulait les cibles HEBDO mais pas le `dplusM` des blocs, et le plan
  // prescrivait 210 m de D+ par répétition à quelqu'un qui a déclaré vivre en terrain plat.
  // Sur du plat, on ne trouve qu'une butte : le bloc est court, et il faut le RÉPÉTER.
  plat: { perLongRun: 200, perBlock: 60, label: "plat (<200m D+)" },
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
  analyze(aIn                )               {
    let a = aIn;
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
      // R12.4 — la VAM estimée est ANNONCÉE, et l'athlète sait exactement quoi faire pour la
      // remplacer : donner la dernière montée qu'il a faite. Pas un test à programmer, pas un
      // chiffre à connaître — un souvenir. C'est la différence entre un plan qu'on affine et un
      // plan qui repose sur une case cochée.
      if (!tObj.vamKnown) warnings.push("Ta vitesse ascensionnelle est ESTIMÉE (" + Math.round(tObj.vam) + " m/h, repli prudent d'après ton niveau et ton historique) : c'est la référence d'intensité en montée ET la base de la prédiction, donc l'estimation coûte cher en précision. Le plus simple pour la corriger : au Profil, donne ta dernière grosse montée — combien de D+, en combien de temps. Pas besoin de test ni de chiffre à connaître.");
      else if (tObj.vamSource === "montee") warnings.push("Ta VAM (" + Math.round(tObj.vam) + " m/h) est déduite de la montée que tu as déclarée, avec une marge de prudence : une montée d'entraînement n'est pas un effort seuil. Elle se précisera au premier test vertical ou au premier import de montre.");
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
      // R12 §0 — le module swimrun peut être absent du bundle V1 : on ne référence pas un
      // symbole qui n'existe pas (le sport, lui, est déjà refusé en amont par le registre).
      const block = typeof swimrunPrereqBlock === "function"
        ? swimrunPrereqBlock(a                                                                          ) : "";
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
      // ANX-GEN (R13) — LA ZONE FRAGILE QUI TOUCHE LA DISCIPLINE PRINCIPALE DU SPORT CHOISI
      // SE DIT À VOIX HAUTE. R6.1 déclare `genou → forbid [rn, bk]` ; en mono-sport vélo, la
      // génération appliquait ×0,9 sans un mot — l'athlète au genou fragile recevait un plan
      // 100 % vélo et aucun signal. En multisport, la substitution de discipline fait le
      // travail ; en mono-sport, elle est impossible : il ne reste que la franchise.
      const mainD = sportModule(sp          ).mainDiscipline;
      const conflit = inj.list.filter((loc) => (R6_PAIN_CONTRAINDICATION[loc]?.forbid || []).includes(mainD));
      if (conflit.length && sportModule(sp          ).disciplines.length < 2) {
        warnings.push("Ta zone fragile (" + conflit.join(", ") + ") est précisément celle que ce sport charge à chaque séance. Le plan réduit le volume (×" + injFactor.toFixed(2) + ") et l'ajusteur quotidien surveillera la douleur — mais un avis médical avant la montée en charge est la vraie réponse : aucune réduction de volume ne remplace un diagnostic.");
      }
    }

    // R6.3 (audit v6, A7) — l'âge module la charge : l'avertissement du Profil s'APPLIQUE.
    // R13.1 — les bornes sont celles du SCHÉMA (source unique, dérivée) : un âge de 10 à 100
    // est un âge, et les prédicats mineur/master le voient. Avant, la table physio locale
    // (14–95) écartait 10-13 et 96-100 en silence : plan adulte complet pour un enfant de
    // 10 ans. Sur le chemin validé, une valeur hors schéma a déjà LEVÉ dans validateAnswers —
    // la branche d'écart ci-dessous est le filet des appelants qui n'y passent pas
    // (`adjustTodayV2` appelle generatePlan sans validation), et elle le DIT (contrat E3 :
    // hors bornes = non renseigné + avertissement, jamais un écart muet).
    const ageRaw = parseInt(a.age || "") || 0;
    const ageN = boundedOrZero("age", ageRaw);
    if (ageRaw !== 0 && ageN === 0)
      warnings.push("Ton âge renseigné (" + ageRaw + ") est hors du domaine accepté (10 à 100 ans) : il n'a pas été utilisé, et les protections liées à l'âge (mineur, master) n'ont pas pu s'appliquer. Corrige-le au Profil.");
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
    // R13.6 — LES POURCENTAGES DE PHASE PRENNENT DES PLAFONDS ABSOLUS. 10 % d'affûtage sur un
    // plan de 59 semaines = 6 semaines à un quart du pic : la littérature (méta-analyse
    // Bosquet 2007) situe l'affûtage optimal à 8-14 jours, ~3 semaines maximum pour un
    // Ironman, réduction 40-60 %. Six semaines, c'est un désentraînement organisé — l'athlète
    // le plus discipliné arrive détraîné. Même logique pour le peak (≤ 5 semaines : au-delà,
    // ce n'est plus un pic, c'est un plateau de charge maximale que personne n'encaisse).
    // L'excédent revient à la phase SPÉCIFIQUE (puis au développement) : c'est là que les
    // semaines supplémentaires d'un plan long produisent de l'adaptation. La part de base ne
    // bouge pas, C19 (peak ≥ 1) tient toujours.
    {
      const [, dev, spc, pk, tap] = phases;
      // R19.3 — la durée d'affûtage vient d'abord du FORMAT DE COURSE (ce qui décide, c'est la
      // charge accumulée et la durée de l'épreuve), et seulement ensuite de la longueur de la
      // préparation. Prendre le min des deux : un plan court ne donne pas trois semaines
      // d'affûtage à un Ironman, et un plan long n'en donne pas trois à un sprint.
      const parFormat = a.sport === "trail"
        ? (TAPER_WEEKS_BY_TRAIL_CAT[tObj?.category          ] ?? 2)
        : (TAPER_WEEKS_BY_FORMAT[sp          ]?.[String(a.format ?? "")] ?? 2);
      const parPrepa = Math.max(1, Math.min(Math.round(0.10 * weeks), weeks >= 30 ? 3 : 2));
      const tapMax = Math.max(1, Math.min(parFormat, parPrepa));
      const pkMax = 5;
      let surplus = 0;
      if (tap.weeks > tapMax) { surplus += tap.weeks - tapMax; tap.weeks = tapMax; }
      if (pk.weeks > pkMax) { surplus += pk.weeks - pkMax; pk.weeks = pkMax; }
      if (surplus > 0) {
        spc.weeks += surplus;
        // Recoudre les bornes de proche en proche (start/end sont dérivés des durées).
        spc.start = dev.end; spc.end = spc.start + spc.weeks;
        pk.start = spc.end; pk.end = pk.start + pk.weeks;
        tap.start = pk.end; tap.end = weeks;
        tap.weeks = tap.end - tap.start;
        D("R13.6", "Phases plafonnées en absolu", "affûtage " + tap.weeks + " sem · peak " + pk.weeks + " sem (excédent → spécifique)",
          "Les pourcentages explosent sur les plans longs : 6 semaines d'affûtage désentraînent (optimal 8-14 jours, ~3 semaines max — Bosquet 2007), un « pic » de 9 semaines est un plateau que personne n'encaisse");
      }
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

    // R12.4b — LA SOURCE DE CHAQUE RÉFÉRENCE EST DITE, TOUJOURS.
    //
    // Le banc amont l'a attrapé : effacer `pace_known` déplaçait la promesse de volume (9.7 →
    // 9.8 h) sans que rien ne le dise. Le mécanisme est légitime — sans allure déclarée, le
    // moteur calcule sur une allure de repli, donc les blocs en DISTANCE ne durent pas la même
    // chose, donc la sonde de capacité ne trouve pas le même plafond. Ce qui ne l'était pas,
    // c'est le silence : le trail annonçait déjà sa VAM estimée (R12.4), les trois autres
    // références ne disaient rien. Une référence estimée n'est pas un détail d'affichage —
    // elle change les zones affichées ET le volume promis.
    const REF_LABEL                         = { rn: "allure seuil", bk: "FTP", sw: "CSS" };
    const REF_HOW                         = {
      rn: "3 min à fond puis 10 min à fond",
      bk: "20 min à fond (FTP = 95 % de la puissance normalisée)",
      sw: "400 m puis 200 m à fond (CSS)",
    };
    const refKnown                          = { rn: thrPace > 0, bk: ftp > 0, sw: css > 0 };
    const discs = knownSports().includes(sp) ? sportModule(sp).disciplines : [];
    if (discs.length) {
      const est = discs.filter((d) => !refKnown[d]);
      const dec = discs.filter((d) => refKnown[d]);
      D(
        "R12-ref",
        "Tes références d'intensité",
        [
          dec.length ? dec.map((d) => REF_LABEL[d]).join(" · ") + " (déclarée" + (dec.length > 1 ? "s" : "") + ")" : "",
          est.length ? est.map((d) => REF_LABEL[d]).join(" · ") + " (ESTIMÉE" + (est.length > 1 ? "S" : "") + ")" : "",
        ].filter(Boolean).join(" — "),
        est.length === 0
          ? "Toutes tes références sont déclarées : les séances portent des cibles chiffrées et le volume promis est calé sur ta vraie vitesse."
          : est.map((d) => REF_LABEL[d]).join(" et ") + " : sans valeur déclarée, les séances de "
            + est.map((d) => (d === "rn" ? "course" : d === "bk" ? "vélo" : "natation")).join(" et ")
            + " s'affichent en zones cardio ou au ressenti, et le volume est calculé sur une vitesse de repli PRUDENTE — ce qui déplace légèrement la promesse d'heures. Pour la remplacer : "
            + est.map((d) => REF_HOW[d]).join(" ; ") + ", ou un simple import de montre.",
      );
    }

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
      // R12.7 — la sortie longue est calibrée en POURCENTAGE du temps de course estimé. Un
      // athlète plus rapide a une course plus courte, donc une sortie longue plus courte : la
      // progression n'est pas monotone avec le niveau, et sans explication ça passe pour un bug.
      D("T4", "Plafond de la sortie longue", fmtH(trailLongCapMin),
        "Sur ce format, reproduire la durée de course à l'entraînement serait contre-productif : "
        + Math.round(T4_LONG_RUN_VS_RACE[tObj.category] * 100) + "% du temps estimé suffit à préparer le reste. "
        + "Ce plafond suit ton temps ESTIMÉ (" + fmtH(Math.round(tObj.raceMinMid)) + ") : plus tu es rapide, plus ta course est courte, et plus ta sortie longue l'est aussi — "
        + (tObj.vamSource === "estimee"
          ? "et comme ta vitesse ascensionnelle est encore estimée, ce plafond bougera dès que tu donneras une vraie montée"
          : "il se recalculera à chaque fois que ta référence de montée changera"));
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
      // R20.2 — les maillons sont transmis, pas seulement leur produit : c'est ce qui permet
      // au générateur de nommer celui qui a le plus retiré au lieu d'annoncer un pic sans
      // explication. `load` (blessure × âge) n'est pas ici : il s'applique en aval, APRÈS la
      // sonde de capacité, et le générateur le lit dans `loadFactor`.
      volLimits: {
        declared: volMax, caps, util, marg, recup: recupFactor,
        swimTime: guard(sp          , "swimTimeFactor") ? SWIM_TIME_FACTOR : 1,
        med: medFactor,
        sessionsMax: parseInt(a.sessions_max || "7") || 7, budget: budgetPerWeek,
      },
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
const TRAIL_DOWN_CUE = "en contrôle : buste relâché, cadence haute, petits pas, regard 4-5m devant (jamais sur ses pieds)";

const fk = (s        ) => Math.floor(s / 60) + "'" + String(Math.round(s % 60)).padStart(2, "0");

/**
 * O-11 / R20.5 — `bk.rp` n'est plus une constante : c'est l'allure course de CETTE épreuve.
 * Un seul point de substitution, traversé par les trois lecteurs de zone (`fmtInt`, `fmtIntHr`,
 * `intOf`) : une substitution faite dans deux d'entre eux serait une troisième définition.
 */
function zoneOf(key                           , refs      )                      {
  const d = key ? ZDEF[key] : undefined;
  if (d && key === "bk.rp" && refs.bikeRp) return { ...d, lo: refs.bikeRp.lo, hi: refs.bikeRp.hi };
  return d;
}

function fmtInt(key                           , refs      , hz         )         {
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
function fmtIntHr(key                           , refs      , hz         )         {
  const d = zoneOf(key, refs);
  if (!d) return key || "";
  if (d.hr && hz[d.hr]) return hz[d.hr];
  return fmtInt(key, refs, hz);
}

const intOf = (key               , refs       )                                                 => {
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
function stepMin(st        , disc        , baseRefs      )         {
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

                                               
                      
                   
                   
 


/**
 * Durée d'une récupération écrite en toutes lettres (« 2min30 trot », « 90s », « 3min »).
 * `null` quand elle n'est pas chiffrée (« récupération complète », « descente marchée ») : on
 * ne devine pas une durée qu'on n'a pas — 7 % des blocs sont dans ce cas, surtout en trail.
 */
function recoveryMinutes(text         )                {
  if (!text) return null;
  let m = /(\d+)\s*min\s*(\d{1,2})\b/.exec(text);
  if (m) return +m[1] + +m[2] / 60;
  m = /(\d+)\s*min/.exec(text);
  if (m) return +m[1];
  m = /(\d+)\s*s\b/.exec(text);
  if (m) return +m[1] / 60;
  return null;
}

function renderSess(s                   , refs      , hz         , baseRefs      )         {
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
  const seg           = [];
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
      bkLegs.map((b) => b.durationMin + "min vélo @ " + fmtInt(b.zone          , refs, hz)
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
        // U16 — LE POINT MÉDIAN NE SÉPARE QUE DES BLOCS. Ces deux compléments décrivent le
        // MÊME bloc que ce qui précède ; les coller avec le séparateur de blocs donnait au
        // symbole deux sens dans la même phrase, et l'UI qui déroule la séance en une ligne
        // par bloc découpait un bloc vallonné en trois. Même règle que R11.1 appliquée à un
        // caractère : un symbole, un sens.
        if (dd.length) str += ", " + dd.join(" / ") + " cible";
        if (b.mode === "run_hike") str += ", marche assumée dans les pentes raides";
      } else {
        if (b.zone) str += " @ " + fmtInt(b.zone          , refs, hz);
        if (b.surface === "escalier") str += " en escaliers";
        else if (b.surface === "tapis") str += " sur tapis incliné";
      }
      str += (b                       ).suffix || "";
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

/**
 * Récup inter-blocs déduite d'un LIBELLÉ. Réservée au chemin TEXTE (plans sans steps : le
 * générateur legacy gelé, un plan restauré d'une ancienne version). Le chemin structuré ne
 * l'appelle plus : il lit `recoveryMin`, un nombre posé à la construction du step.
 * `recoveryMinFromText` ne peut donc plus renvoyer 0 en silence sur une séance à répétitions —
 * c'est ce silence qui coûtait 1 740 récupérations non comptées (R3-final).
 */
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
    if (reps > 1) {
      // `recoveryMin` est la source de vérité (R3-final). Le repli sur le libellé ne sert qu'aux
      // plans que la bibliothèque actuelle n'a pas construits : le générateur legacy GELÉ du
      // monolithe (audité par `audit:v1`) et un plan restauré d'une version antérieure. Sans lui,
      // l'auditeur cessait de voir la récupération de tout le périmètre legacy — l'inverse exact
      // du but. Et quand le repli ne trouve rien non plus, il le DIT au lieu de compter 0.
      const rec = b.recoveryMin ?? recoveryMinFromText(b.recoveryText);
      if (!rec && b.recoveryText) flags.push("récupération non quantifiée sur « " + s.name + " » (« " + b.recoveryText + " ») : la charge de cette séance est SOUS-ESTIMÉE");
      recovery += rec * (reps - 1);
    }
    if ((b.d || s.d) === "sw" && b.distanceM) meters += (b.reps || 1) * b.distanceM;
  }
  let auxMin = 0;
  for (const st of steps) {
    if (st.role === "body") continue;
    if (st.role === "warmup" && st.durationMin != null) {
      // Le clamp d'échauffement est la SEULE valeur d'un plan que l'auditeur ne peut pas
      // recalculer depuis les champs bruts : elle dépend du corps de séance, et la formule a
      // bougé (C13 en V1.5, C13c depuis). La rejouer ici en faisait une seconde définition,
      // qui a fini par diverger — un échauffement prescrit 10 min était compté 8 dès que le
      // corps en faisait 8. `_min` est la valeur RENDUE, donc celle que l'athlète lit et que
      // l'export publie : c'est elle qu'on mesure. Le rejeu ne sert plus que de repli pour un
      // plan non rendu (le générateur legacy gelé du monolithe passe par là).
      auxMin += st._min != null ? st._min : Math.min(st.durationMin, 25, Math.max(3, Math.round(bodyMin) || st.durationMin));
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
  // R3-final — UN JOUR DE REPOS NE SE MESURE PAS EN LISANT SA DESCRIPTION. Un « Repos + renfo
  // excentrique » décrit des séries ; le parseur de texte y trouvait 23 minutes que le
  // générateur comptait 0. Les deux lectures divergeaient donc sur des journées qui, par
  // construction, ne portent aucune charge d'endurance — et l'écart tombait exactement sur les
  // semaines de récupération, où il faisait basculer la comparaison avec la semaine précédente.
  // Même défaut que la récupération inter-blocs, un cran plus loin : de la prose servait de
  // donnée. Le type de la séance fait foi.
  if (s.d === "rs") return { minutes: 0, meters: null, recoveryMin: 0, confidence: "rest", flags: [], generatorMin: s.min };
  return sessionLoadFromText(s);
}

/** Répartition d'intensité d'une séance (manifeste : « répartition des intensités »).
 * Facile = échauffement/retour au calme/récup inter-blocs/zones easy-rec-z2 ;
 * modéré = tempo/sweetspot/race-pace/force/mara ; dur = vo2/seuil/vitesse/css + legs de brick. */
                                 
                  
                 
                  
 
const HARD_SUFFIX = [".vo2", ".thr", ".speed", ".css"];
const MOD_SUFFIX = [".ss", ".rp", ".frc", ".mara"];
/**
 * C26c (R20.4) — LA CLASSIFICATION EST EXPOSÉE, parce qu'un second lecteur en a besoin.
 *
 * Le générateur doit désormais BORNER le temps dur, donc reconnaître un bloc dur — exactement
 * la question que `intensitySplit` répond déjà. Recopier la liste des suffixes dans
 * `planGenerator` aurait donné deux définitions du mot « dur » dans le même moteur : c'est
 * précisément le défaut O-11 (deux définitions de « l'allure course » à vélo), et il n'y a
 * aucune raison de le refaire en le voyant venir.
 */
function zoneClass(zone         , runLegNoZone = false, rpBand                             )                          {
  const z = typeof zone === "string" ? zone : "";
  // R20.5 — `bk.rp` A CESSÉ D'ÊTRE UNE INTENSITÉ FIXE, DONC SA CLASSE AUSSI.
  //
  // Depuis O-11, « l'allure course » vélo vaut ce que l'épreuve demande : 0,70–0,76 × FTP sur
  // un Ironman, 0,85–0,93 sur un sprint. Le premier est de l'endurance tenable six heures, le
  // second est à la porte du seuil. Les ranger tous deux en « modéré » par un suffixe, c'est
  // refaire à l'échelle de la classification l'erreur qu'O-11 vient de corriger à l'échelle du
  // nombre : une table qui ne connaît pas la bande ne peut pas la juger.
  //
  // Seuil à 0,85 × FTP : c'est le bas de la zone sweetspot/seuil de Coggan. Au-dessus, l'effort
  // se paie en récupération et doit compter dans le plafond de temps DUR (C26c).
  if (z === "bk.rp" && rpBand) return rpBand.hi >= 0.85 ? "hard" : "mod";
  if (TRAIL_HARD.includes(z) || HARD_SUFFIX.some((s) => z.endsWith(s))) return "hard";
  if (TRAIL_MOD.includes(z) || MOD_SUFFIX.some((s) => z.endsWith(s)) || runLegNoZone) return "mod";
  return "easy";
}
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
    const cls = zoneClass(zone, runLegNoZone, (st                                           ).rpBand);
    if (cls === "hard") out.hardMin += stMin;
    else if (cls === "mod") out.modMin += stMin;
    else out.easyMin += stMin;
    if (reps > 1) out.easyMin += (st.recoveryMin ?? recoveryMinFromText(st.recoveryText)) * (reps - 1); // la récup est facile
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

  // ---- R13.4 : pas de FORCE (basse cadence) en affûtage ----
  // La force à 50-60 rpm a le même coût de fatigue résiduelle que la VO2max (48-72 h de
  // courbatures profondes) : mesuré avant correction, 6 blocs `bk.frc` dans l'affûtage d'un
  // Full — dont une séance de gros braquet à J-3 de l'Ironman. Elle était là par accident de
  // branchement (`else` attrape-tout), pas par intention : la règle devient VÉRIFIÉE.
  let frcInTaper = 0;
  for (const w of plan.weeks) {
    if (!taperNums.has(w.num)) continue;
    for (const d of w.days)
      for (const s of d.sessions)
        if ((s.steps || []).some((st) => typeof st.zone === "string" && st.zone.endsWith(".frc"))) {
          frcInTaper++;
          flags.push("S" + w.num + " (taper) : séance de force « " + s.name + " »");
        }
  }
  if (frcInTaper > 0) hard.push(frcInTaper + " séance(s) de force (basse cadence) en semaine d'affûtage (R13.4 : même coût de récupération que la VO2max)");

  // ---- Audit 2 : bornes du brick vélo par format ----
  // R18.4 — la règle connaît maintenant DEUX bricks. C21b borne celui qui CONSTRUIT (charge,
  // spécifique, pic) ; C21c borne celui qui ENTRETIENT (affûtage), et son plafond est le
  // plancher de C21b — un brick d'affûtage ne peut donc jamais être plus long que le plus
  // court des bricks de charge. L'affûtage n'est PAS exempté : une bande de moins serait un
  // trou par lequel une sortie de 2 h reviendrait en semaine d'affûtage sans un mot.
  let brickCapViolations = 0;
  const boundsCharge = opts.format ? BRICK_BIKE_BOUNDS[opts.format] : undefined;
  const boundsTaper = opts.format ? BRICK_TAPER_BIKE_BOUNDS[opts.format] : undefined;
  for (const w of plan.weeks)
    for (const d of w.days)
      for (const s of d.sessions) {
        if (!s.brick || !s.steps) continue;
        // R20.5 — le leg vélo peut être en PLUSIEURS blocs (endurance puis allure course, depuis
        // que `bk.rp` décrit l'allure course de l'épreuve). La borne du format porte sur le
        // TEMPS DE VÉLO du brick : on somme. Lire le premier bloc seulement aurait rendu un
        // brick conforme « trop court » du jour où on l'a coupé en deux — un check qui mesure
        // un morceau de ce qu'il nomme.
        const bikeLegs = s.steps.filter((st) => st.leg === "bike" && st.durationMin != null);
        const taper = w.phase.id === "taper";
        const bounds = taper ? boundsTaper : boundsCharge;
        if (!bikeLegs.length || !bounds) continue;
        const bikeMin = bikeLegs.reduce((t, st) => t + (st.reps || 1) * (st.durationMin || 0), 0);
        if (bikeMin > bounds[1] || bikeMin < bounds[0]) {
          brickCapViolations++;
          flags.push("S" + w.num + " : brick vélo " + Math.round(bikeMin) + "min hors bornes "
            + (taper ? "d'affûtage (C21c) " : "de charge (C21b) ") + "[" + bounds[0] + ", " + bounds[1] + "]");
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
    // La DOMINANCE DU PIC se juge sur le TRAVAIL, pas sur le temps passé dehors — et ce n'est
    // pas la compensation d'un écart de mesure, c'est la définition de la règle. Une semaine de
    // développement pleine de répétitions occupe plus de CLOCK TIME (les récupérations sont du
    // temps) qu'une semaine de pic faite de sorties longues continues, à charge d'entraînement
    // pourtant inférieure. « La semaine pic est la plus grosse du plan » parle de stimulus.
    // La règle de PROGRESSION, elle, parle bien de temps vécu : elle mesure `prescribedMin`.
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
  // O-21 — « DEV ≤ PIC » N'A PAS D'OBJET QUAND LE PIC N'A AUCUNE SEMAINE DE CHARGE.
  //
  // `candidates` exclut les semaines de récupération (c'est juste : on ne compare pas une
  // décharge à une semaine de charge). Sur les préparations COURTES, la phase de pic tient en
  // une seule semaine — et R18.5 a tranché que la CADENCE de récupération de l'athlète l'emporte
  // sur toute règle de placement, C27b comprise. Cette semaine unique peut donc être une
  // décharge, et le pic ne contribue alors AUCUN candidat.
  //
  // La règle concluait « la semaine de volume max dépasse la meilleure semaine peak » — un
  // énoncé FAUX : il n'y a pas de semaine de pic à dépasser. Et le coût n'était pas cosmétique :
  // la violation étant structurellement insatisfiable, la boucle de réparation coupait une
  // semaine au hasard, et **PAS LA MÊME selon l'allure déclarée** — c'est ce qui produisait
  // l'inversion O-21 (à 5:45/km l'athlète recevait moins qu'à 7:00/km).
  //
  // Même famille que les trois invariants que R20.6 a retirés du banc (I6/I8/I12) : une règle
  // appliquée là où son objet n'existe pas. On dit donc ce qui est VRAI — le plan n'a pas de
  // semaine de pic en charge — et on le dit dans le canal des avertissements, parce que la
  // cause est un arbitrage assumé (la cadence de l'athlète), pas un défaut de génération.
  const picSansCharge = !peakPhaseBest
    && weeks.some((w) => w.phaseId === "peak")
    && weeks.filter((w) => w.phaseId === "peak").every((w) => w.isRecup);
  if (!peakInPeakPhase && picSansCharge)
    soft.push("aucune semaine de PIC en charge : sur ce plan court, la seule semaine de pic est une "
      + "décharge — la cadence de récupération de l'athlète l'emporte sur le placement (R18.5). "
      + "La règle « dev ≤ pic » n'a pas d'objet ici.");
  else if (!peakInPeakPhase)
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
        // D3 puis R3-final — les sauts se mesuraient sur la base TRAVAIL parce que le
        // générateur ne comptait pas la récupération : une semaine fractionnée pesait plus cher
        // en minutes-métrique à travail égal, et c'était un artefact de mesure, pas un saut de
        // charge. L'écart est fermé : les deux estimateurs comptent la même chose. On mesure
        // donc le temps réellement prescrit — celui que le générateur pilote et que l'athlète
        // passe dehors. Le seuil dur dérive de la constante nommée (C22_AUDIT_HARD_JUMP).
        const j = w.prescribedMin / prevOurs;
        if (j > C22_AUDIT_HARD_JUMP) auditJumpsHard++;
        else if (j > 1.15) auditJumpsSoft++;
      }
      prevDecl = w.declaredMin;
      prevOurs = w.prescribedMin;
    }
  }
  // I10 a fermé l'écart entre la courbe ANNONCÉE et le volume PRESCRIT : le chiffre affiché suit
  // désormais le contenu (véracité). Conséquence directe : cette règle et celle du saut de
  // volume RÉEL mesurent la même grandeur, avec deux seuils différents — +10 % ici, +25 % là.
  // Deux règles qui se contredisent : l'une est mal formée, et c'est celle-ci. Le +10 % est la
  // CIBLE du générateur (C22), pas un seuil d'audit sur le plan livré ; la tolérance à +25 %
  // existe précisément parce que les planchers de séance empêchent parfois de l'atteindre.
  // La règle de sécurité reste portée par le volume réel ; ici, on SIGNALE sans bloquer.
  if (declJumps > 0) soft.push(declJumps + " saut(s) >+10% de la courbe annoncée entre semaines de charge — la courbe suit désormais le prescrit (I10), et le prescrit est borné à +25% par sa propre règle");
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
        // A3 — UN PLANCHER DE SÉANCE EST UNE RÈGLE DE SEMAINE DE CHARGE. Il dit « en dessous,
        // la séance ne vaut pas le déplacement » : c'est un argument de dosage, et une semaine
        // de décharge a précisément pour objet de retirer. L'exiger en récupération et en
        // affûtage forçait à REMONTER des séances dans les semaines censées alléger — d'où une
        // récup plus lourde que la charge qu'elle assimile, et un affûtage qui n'affûte pas.
        // Deux collisions indépendantes, une seule reformulation, et une règle en moins.
        const decharge = w.isRecup || w.phase.id === "taper";
        if (!decharge && opts.level && opts.level !== "debutant" && s.d === "sw" && (load.meters ?? 0) > 0 && (load.meters ?? 0) < 750) smallSwims++;
        if (!s.note && !(s.det || "").includes("💡")) unexplainedSessions++;
      }
  if (beginnerLongRunOver3h > 0) hard.push(beginnerLongRunOver3h + " sortie(s) longue(s) CAP >3h pour un débutant (manifeste)");
  if (smallSwims > 0) hard.push(smallSwims + " séance(s) piscine <750m pour un non-débutant (manifeste)");
  if (unexplainedSessions > 0) hard.push(unexplainedSessions + " séance(s) sans objectif expliqué (manifeste)");

  // ---- Manifeste : répartition des intensités (~80/20). Part FACILE du temps sur les
  // ---- semaines de charge : <70% = zone grise installée (dur), 70-73% = borderline (souple).
  let easyTot = 0, modTot = 0, hardTot = 0;
  // C26c/C26d (R20.4) — les deux grandeurs se mesurent aussi PAR SEMAINE : un plafond de temps
  // dur hebdomadaire ne se vérifie pas sur une moyenne de plan. Deux semaines à 20 et 100 min
  // ont la même moyenne qu'un plan sage à 60, et ce n'est pas le même plan.
  const perWeekHard                                                            = [];
  for (const w of plan.weeks) {
    if (w.isRecup || w.phase.id === "taper") continue;
    let wh = 0, wm = 0, we = 0;
    for (const d of w.days)
      for (const s of d.sessions) {
        const sp = intensitySplit(s, refs);
        we += sp.easyMin; wm += sp.modMin; wh += sp.hardMin;
      }
    easyTot += we; modTot += wm; hardTot += wh;
    perWeekHard.push({ num: w.num, hard: wh, mod: wm, tot: we + wm + wh });
  }
  const easyShare = easyTot + modTot + hardTot > 0 ? easyTot / (easyTot + modTot + hardTot) : 1;
  // C26 — le plancher suit le VOLUME : 80/20 est la conséquence d'un plafond de temps dur
  // (~60 min/sem), pas une loi en soi. Sur une petite enveloppe, exiger 70 % de facile laisse
  // moins d'une heure de qualité — moins que ce qu'il faut pour maintenir la VO2max.
  const chargeMin = weeks.filter((w) => !w.isRecup && w.phaseId !== "taper").map((w) => w.prescribedMin);
  const meanChargeMin = chargeMin.length ? chargeMin.reduce((a, b) => a + b, 0) / chargeMin.length : 0;
  // R20.5 — LE PLANCHER SE MESURE SUR LE RAPPORT QU'IL DÉRIVE, PAS SUR UN AUTRE.
  //
  // `easyShareFloor` vaut `1 − plafondDur / minutesHebdo` : la formule est dérivée du plafond
  // de temps DUR, et de lui seul. Elle décrit donc le rapport `facile / (facile + dur)`. Elle
  // était comparée à `facile / (facile + modéré + dur)` — une formule à deux seaux confrontée à
  // une mesure sur trois. Ce n'est pas un problème de calibration, c'est une erreur d'unité,
  // même espèce qu'O-13 (la rampe en heures de plan contre des heures d'eau).
  //
  // Ce que ça donnait, mesuré sur un tri/70.3 confirmé/débutant : **70 % facile · 27 % modéré ·
  // 3 % DUR**, en violation d'une règle dont la justification écrite est de borner le travail
  // dur. Le même plan vaut **96 %** sur le rapport que la formule décrit réellement. Une règle
  // qui déclare un plafond de dur et refuse un plan à 3 % de dur ne mesure pas ce qu'elle dit.
  //
  // Le modéré n'est pas pour autant libre : **C26d** le borne pour lui-même (40 %), ci-dessous.
  // C'est la séparation que R20.4 a posée, appliquée jusqu'au bout.
  //
  // `easyShare` (facile / tout) reste calculé et EXPOSÉ tel quel : c'est le chiffre que le
  // dashboard « répartition des intensités » affiche à l'athlète, et le sens usuel du ~80/20.
  // On ne change pas ce qu'on montre, on change ce sur quoi on juge.
  const easyFloor = easyShareFloor(meanChargeMin, { history: opts.history, level: opts.level, injured: !!opts.injured });
  const easyVsHard = easyTot + hardTot > 0 ? easyTot / (easyTot + hardTot) : 1;
  if (easyVsHard < easyFloor) hard.push("répartition des intensités : " + Math.round(easyVsHard * 100) + "% de temps facile RAPPORTÉ AU TEMPS DUR (<" + Math.round(easyFloor * 100) + "% pour " + Math.round(meanChargeMin / 6) / 10 + "h/sem — zone grise, manifeste ~80/20)");

  // ---- C26c/C26d (R20.4) — LA RÈGLE MESURE ENFIN CE QUE SA JUSTIFICATION DIT ----
  //
  // C26 déclare depuis toujours que la grandeur physiologique est le PLAFOND DE TEMPS DUR
  // hebdomadaire, et que la part de facile en est la conséquence arithmétique. Seule la
  // conséquence était vérifiée — et sur un dénominateur qui mélange le modéré et le dur.
  // Mesuré avant correction sur 7 356 semaines de charge : **1 095 (15 %) au-dessus du plafond
  // que C26 déclare**, jusqu'à 112 min de dur chez un DÉBUTANT dont le plafond est 25 ; et le
  // modéré, seul puni par l'ancienne formulation, ne débordait que 2 fois sur 7 356.
  const capHard = hardTimeCapMin({ history: opts.history, level: opts.level, injured: !!opts.injured });
  const overHard = perWeekHard.filter((w) => w.hard > capHard * C26c_HARD_TIME_TOLERANCE);
  if (overHard.length) {
    const pire = overHard.reduce((x, y) => (y.hard > x.hard ? y : x));
    hard.push("C26c : " + overHard.length + " semaine(s) au-dessus du plafond de temps DUR ("
      + capHard + " min/sem pour ce profil) — pire : S" + pire.num + " à " + Math.round(pire.hard) + " min");
  }
  const overMod = perWeekHard.filter((w) => w.tot > 0 && w.mod / w.tot > C26d_MOD_SHARE_MAX);
  if (overMod.length) {
    const pire = overMod.reduce((x, y) => (y.mod / y.tot > x.mod / x.tot ? y : x));
    hard.push("C26d : " + overMod.length + " semaine(s) à plus de " + Math.round(C26d_MOD_SHARE_MAX * 100)
      + "% de temps MODÉRÉ (zone grise) — pire : S" + pire.num + " à " + Math.round((pire.mod / pire.tot) * 100) + "%");
  }

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
  if (easyShare < easyFloor) score -= 15;
  else if (easyShare < easyFloor + 0.03) score -= 5;
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
  // R3-final — LA RÉCUPÉRATION EST UNE DONNÉE, PAS UNE PHRASE À RELIRE.
  //
  // `rec` accepte deux formes, et c'est tout l'objet du correctif :
  //   · un texte DÉJÀ CHIFFRÉ (« 2min30 trot ») — le nombre en est extrait UNE fois, ici, à la
  //     naissance du step, et vit ensuite dans `recoveryMin` ;
  //   · un couple `[minutes, libellé]` quand la phrase ne porte aucun chiffre (« repos libre »,
  //     « descente marchée ») — c'est le générateur qui sait combien elle dure, pas un lecteur.
  // Le chemin structuré ne rappelle plus jamais de parseur de prose. `recoveryText` reste, mais
  // il ne sert plus qu'à l'athlète.
  const recFields = (rec      ) => {
    if (!rec) return { recoveryText: "", recoveryMin: 0 };
    if (Array.isArray(rec)) return { recoveryText: rec[1], recoveryMin: rec[0] };
    return { recoveryText: rec, recoveryMin: recoveryMinutes(rec) ?? 0 };
  };
  const B = (reps        , dur        , zoneIn               , rec      , sfx         )         => {
    const zone = medicalZone(zoneIn, r.medHold)                 ;
    return ({ role: "body", reps, durationMin: dur, zone, intensity: intOf(zone)                     , ...recFields(rec), suffix: sfx || "", prefix: "" })          ;
  };
  const Bd = (reps        , dist        , zoneIn               , rec      , sfx         , unitKm          , disc         )         => {
    const zone = medicalZone(zoneIn, r.medHold)                 ;
    return ({ role: "body", reps, distanceM: Math.round(dist / 25) * 25, unitKm: !!unitKm, zone, intensity: intOf(zone)                     , ...recFields(rec), suffix: sfx || "", prefix: "", d: disc })          ;
  };
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
  // T19 — LA RÉCUPÉRATION D'UNE RÉPÉTITION EN PENTE SE CALCULE, elle ne se lit pas.
  // Entre deux répétitions de côte, l'athlète REDESCEND ce qu'il vient de monter ; entre deux
  // répétitions de descente, il REMONTE. Cette durée est déductible du dénivelé du bloc, et
  // c'est ce qui remplace les sept libellés qui valaient 0 minute (« descente MARCHÉE »,
  // « remontée en marche active »… — 1 740 récupérations non comptées, 35 % des séances de
  // trail). Un `recoveryMin` explicite passé par l'appelant a toujours priorité.
  const B = (o                                           )         => {
    const zone = medicalZone(o.zone, r.medHold)                             ;
    const st = { role: "body", reps: 1, ...o, zone, intensity: intOf(zone ?? null)                      }          ;
    if ((st.reps || 1) > 1 && st.recoveryText && st.recoveryMin == null)
      st.recoveryMin = returnMinutes({ dplusM: st.dplusM, dmoinsM: st.dmoinsM });
    return st;
  };

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
      // T-NIGHT (audit v7) — la consigne de nuit était portée par UNE séance dédiée, elle-même
      // éliminée par la substitution d'impact dès qu'une blessure était déclarée : le plan
      // n'évoquait alors ni nuit, ni frontale, ni lampe pendant 40 semaines, pour une course
      // annoncée nocturne. Une compétence ne doit pas dépendre de la survie d'une séance : la
      // consigne se greffe aussi sur la sortie LONGUE, qui est le pivot de la semaine.
      note: isRehearsal
        ? "Répétition GÉNÉRALE : sac de course, réserve d'eau complète, et 60 à 90 g de glucides par heure — exactement ce que tu prendras le jour J. Au-delà de 6 h d'effort, l'estomac et le matériel font autant d'abandons que les jambes : ça se teste à l'entraînement, jamais en course."
        : "La séance qui construit ta course : on compte le TEMPS et le dénivelé, jamais les kilomètres. Monte au train (tu dois pouvoir parler), descends en contrôle" + (hikeMin ? ", et marche franchement dans les pentes raides — c'est ce que tu feras en course" : "") + "."
          + (a.race_night && a.race_night !== "non" && (phase === "spec" || phase === "peak")
            ? " Ta course se court en partie de nuit : termine celle-ci à la frontale (chargée, plus une réserve) sur un terrain que tu connais. La nuit change la perception du relief, l'équilibre et le moral — ça s'apprivoise, et le matériel se vérifie avant qu'il te lâche en course."
            : ""),
      det: "",
      steps: [
        B({ durationMin: durMin - (hikeMin ? Math.round(hikeMin / 2) : 0), gradient: "rolling", zone: "tr.flat", dplusM: up, dmoinsM: down,
          mode: hikeMin ? "run_hike" : "run", poles: poles && hikeMin > 0, surface: technicalOk ? "sentier" : "piste",
          // C23 — le plafond débutant (3 h) vaut AUSSI en trail : la longue trail n'avait
          // jamais porté ce clamp — le re-remplissage R13.5 l'a prouvé en la gonflant à sa
          // borne (10-13 sorties > 3 h par plan débutant, audit:v2). `hard` : la sonde de
          // capacité n'élargit jamais un plafond du manifeste.
          bnd: { floor: 60, cap: r.beginner ? Math.min(180, r.trailLongCapMin || 240) : (r.trailLongCapMin || 240), hard: r.beginner } }                             ),
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
        steps: [W(12, "à plat, progressif"), B({ durationMin: durEach, reps, zone, gradient: "up", dplusM: upPer, mode: "run", surface: "tapis", recoveryText: "2min à plat, inclinaison à 0", recoveryMin: 2, repCap: hp.repCap }), C(8, "à plat souple")] });
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
          B({ durationMin: P(20, 34), reps: Math.max(2, P(2, 4)), gradient: "down", dmoinsM: Math.round(down / Math.max(2, P(2, 4))), surface: technicalOk ? "sentier" : "piste", recoveryText: "remontée en marche active" , repCap: 8 }), C(10, "footing plat souple")] });
    } else {
      const down = Math.round(downShare(0.35) * downFactor);
      S2.push({ d: "rn", name: "Descente technique", note: "La descente est une COMPÉTENCE, pas une récupération. Objectif : le geste, pas la vitesse. Buste relâché, bras écartés pour l'équilibre, petits pas rapides, regard 4-5 m devant. On répète 3 à 6 fois la même descente pour sentir la progression.", det: "",
        steps: [W(12, "footing plat"), B({ durationMin: P(8, 14), gradient: "up", zone: "tr.easyup", dplusM: Math.round(down / 2), mode: "hike", poles }),
          B({ durationMin: P(4, 7), reps: Math.max(3, P(3, 6)), gradient: "down", dmoinsM: Math.round(down / Math.max(3, P(3, 6))), surface: technicalOk ? "sentier" : "piste", recoveryText: "remontée marchée, souffle repris" , repCap: 8 }), C(8, "footing souple")] });
    }
  } else if (slot === "facileR") {
    // T-NIGHT (audit v7) — une compétence ne doit dépendre de la survie d'AUCUNE séance : avec
    // une blessure déclarée, la séance de nuit ET la sortie longue pouvaient être remplacées,
    // et le plan n'évoquait plus ni nuit ni frontale pendant 40 semaines pour une course
    // nocturne. La consigne se greffe donc aussi sur le footing, la séance la plus nombreuse.
    const nightCue = a.race_night && a.race_night !== "non" && (phase === "spec" || phase === "peak")
      ? " Ta course se court en partie de nuit : fais celui-ci à la frontale au moins une fois par quinzaine, sur un terrain connu — la nuit change l'équilibre et la perception du relief, et c'est aussi le moment de vérifier ta lampe."
      : "";
    // 7. MARCHE RAPIDE EN CÔTE (base/dev) · 9. SORTIE DE NUIT (spec/peak si course de nuit)
    const nightNeeded = (a.race_night === "partielle" || a.race_night === "majoritaire") && (phase === "spec" || phase === "peak");
    if (nightNeeded && weekNum % 2 === 1) {
      S2.push({ d: "rn", name: "Sortie de nuit (frontale)", note: "Courir de nuit change tout : la perception du relief, l'équilibre, la vigilance, le moral. Terrain CONNU, frontale chargée (+ une réserve), rythme facile. L'objectif est de s'habituer, pas de performer — et de vérifier ton matériel avant qu'il te lâche en course.", det: "",
        steps: [B({ durationMin: P(55, 100), gradient: "rolling", zone: "tr.flat", dplusM: upShare(0.2), dmoinsM: Math.round(upShare(0.2) * downFactor), mode: "run_hike", poles, surface: "sentier" })],
        ...({ plainBody: true }          ) }             );
    } else if (hikeShare >= 0.1 && (phase === "base" || phase === "dev" || phase === "spec")) {
      S2.push({ d: "rn", name: "Marche rapide en montée" + (poles ? " (bâtons)" : ""), note: "Sur ta course, la marche représentera environ " + Math.round(hikeShare * 100) + " % du temps : c'est une compétence, pas un aveu d'échec. Marche vite, mains sur les cuisses ou " + (poles ? "avec les bâtons (poussée complète, buste légèrement penché)" : "bras actifs") + ", rythme cardiaque soutenu. Tu iras plus vite en marchant bien qu'en courant mal. Termine par 20 min de renfo EXCENTRIQUE (squats descendants lents 5 s, fentes, mollets sur une marche) : c'est la protection n°1 des cuisses contre la descente." + nightCue, det: "",
        steps: [B({ durationMin: P(40, 85), gradient: "up", zone: "tr.hike", dplusM: upShare(0.3), mode: "hike", poles })],
        ...({ plainBody: true }          ) }             );
    } else {
      // 12. FOOTING PLAT RÉCUP — aucun D+ assumé
      S2.push({ d: "rn", name: "Footing plat + renfo excentrique", note: "Volume facile sur terrain PLAT et souple : aucun dénivelé, aucune technique. C'est le volume qui construit l'aérobie sans ajouter de casse musculaire" + (fasciaInj ? " — et sur terrain souple, ton fascia a besoin de ça" : "") + ". Puis 20 min de renfo EXCENTRIQUE (squats descendants lents 5 s, fentes contrôlées, mollets sur une marche) : c'est la protection n°1 des cuisses contre la descente, et elle se construit dès maintenant." + nightCue, det: "",
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
      S2.push({ d: "rn", recovery: true, name: "Footing récup" + (ankleInj ? " + proprioception" : ""), note: "Récupération active à plat : les jambes tournent, zéro intensité, zéro dénivelé. Puis 15-20 min de renfo excentrique si tu ne l'as pas fait cette semaine." + (ankleInj ? " Puis 15 min de proprioception (équilibre sur une jambe, yeux fermés, coussin instable) : c'est ce qui protège ta cheville sur terrain technique." : ""), det: "",
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
      S2.push({ d: "rn", name: "Allure course spécifique", note: "C'est l'allure de ta course : mémorise la sensation, elle doit devenir automatique le jour J.", det: "", steps: [W(18, "progressif + gammes"), Object.assign(Bd(P(3, 5), fmt === "5k" || fmt === "10k" ? 1000 : 2000, fmt === "marathon" ? "rn.mara" : "rn.thr", "2-3min récup active", "", !(fmt === "5k" || fmt === "10k"), "rn"), { repCap: 8 }), C(10, "retour au calme")] });
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
    S2.push({ d: "rn", long: true, name: isTrail ? "Sortie longue trail" : "Sortie longue", note: beginner ? "Cours lentement, vraiment : tu dois pouvoir parler tout du long. Marche si besoin, c'est OK." : isTrail ? "En trail on compte le TEMPS et le D+, pas les kilomètres. Monte au train, descends en contrôle" + (injImp ? " — descentes prudentes, ta zone fragile encaisse la charge excentrique" : "") + "." : "Allure d'endurance, jamais forcée. La longue construit l'endurance de base.", det: "", steps: [Object.assign(B(1, durMin, "rn.easy", "", (isTrail && dplus ? " · D+ cible " + dplus.lo + "-" + dplus.hi + "m" : "") + (phase === "spec" || phase === "peak" ? (!finisher && !medHold ? ", derniers 15-20min @ allure cible" : "") : "")), { bnd: { floor: durCaps.lo, cap: durCaps.hi, hard: beginner } }), ], ...( { plainBody: true }          ) });
  } else if (slot === "facileR") {
    S2.push({ d: "rn", name: "Footing facile", note: beginner ? "Allure de conversation, sans forcer : c'est le volume facile qui fait progresser." : "Endurance fondamentale : allure de conversation. Ce volume facile construit l'aérobie sans user.", det: "", steps: [B(1, P(30, 50), "rn.easy", "", G && !injImp ? " · termine par " + G.replace("+ ", "") : "")], ...( { plainBody: true }          ) });
  } else if (slot === "facile2") {
    S2.push({ d: "rn", recovery: true, name: "Footing récup", note: "Récupération active : les jambes tournent, zéro intensité — ça accélère la récupération.", det: "", steps: [B(1, P(20, 30), "rn.rec")], ...( { plainBody: true }          ) });
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
  disciplines: ["rn"],
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
    // R13.4 — même fall-through que le tri, même correctif : l'affûtage est branché
    // EXPLICITEMENT. L'`else` attrape-tout envoyait la force basse cadence (bk.frc) en plein
    // affûtage — 48-72 h de fatigue résiduelle, le coût d'une VO2max, à quelques jours de la
    // course. C'est la règle mécanisée du tri (auditeur : « *.frc en taper » = violation dure)
    // qui a révélé que le vélo portait le même accident de branchement.
    else if (phase === "taper") S2.push({ d: "bk", name: "Rappel race-pace", note: "Affûtage : on réveille l'allure course sans générer de fatigue. Court et précis.", det: "", steps: [W(10, "progressif"), Object.assign(B(P(2, 3), P(6, 10), "bk.rp", "3min souple"), { repCap: 4 }), C(5, "décrassage")] });
    else S2.push({ d: "bk", name: climb ? "Force en côte" : "Force basse cadence", note: "Gros braquet, cadence basse, mais sans forcer sur les genoux : c'est musculaire, pas cardio.", det: "", steps: [W(15, "+ montée en intensité"), B(P(4, 6), 5, "bk.frc", "3min souple ou en redescendant", " à 50-60 rpm" + (climb ? " en côte" : "")), C(10, "moulinage léger")] });
  } else if (slot === "durLong") {
    const durCaps = ({ crit: { lo: 60, hi: 150 }, route: { lo: 90, hi: 180 }, clm: { lo: 75, hi: 165 }, cyclo: { lo: 120, hi: 240 }, gravel: { lo: 150, hi: 360 } }                                              )[fmt] || { lo: 90, hi: 210 };
    S2.push({ d: "bk", long: true, name: "Sortie longue", note: "Endurance longue : le moteur aérobie se construit sur la durée. Allure régulière, mange et bois régulièrement.", det: "", steps: [Object.assign(B(1, P(durCaps.lo, durCaps.hi), "bk.z2", "", fmt === "cyclo" || fmt === "gravel" ? " · endurance" : ""), { bnd: { floor: durCaps.lo, cap: durCaps.hi } })], ...( { plainBody: true }          ) });
  } else if (slot === "facileR") S2.push({ d: "bk", name: "Endurance facile", note: "Z2 conversationnel, cadence souple 85-95 rpm : la base aérobie se construit ici.", det: "", steps: [B(1, P(45, 90), "bk.z2")], ...( { plainBody: true }          ) });
  else if (slot === "facile2") S2.push({ d: "bk", recovery: true, name: "Récup active", note: "Moulinage très souple : activer la circulation, aucune force sur les pédales.", det: "", steps: [B(1, P(30, 45), null, "", " très souple")], ...( { plainBody: true }          ) });
  else if (slot === "recup") S2.push({ d: "rs", name: "Repos / gainage", det: "mobilité", steps: [] });
  else if (slot === "off") S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  return S2;
}


/** Prédiction bike — extraction mécanique de la branche correspondante de `predictRace`. */
function predictBike(kit            )       {
  const { refs, format, items, advice, D, bikeIF, bikeWhy } = kit;
  const b = BIKE_POWER[format];
  if (refs.ftp > 0 && b) {
    const [blo, bhi] = bikeIF(b.lo, b.hi); // R15.2 — le relief abaisse la cible
    items.push({ leg: "Vélo", value: Math.round(refs.ftp * blo) + "–" + Math.round(refs.ftp * bhi) + "W", why: b.note + " — cible en puissance NORMALISÉE (moyenne pondérée : les pointes montent au-dessus), le chrono dépend du parcours" + bikeWhy });
    D("PRED-bike", "Méthode vélo", "% FTP par format", "Prédire un chrono sans connaître le parcours serait mentir ; la puissance cible est transférable partout");
  } else advice.push("Renseigne ta FTP (test 20min × 0.95) pour obtenir tes puissances cibles de course.");
}

registerSport({
  id: "bike",
  mainDiscipline: "bk",
  disciplines: ["bk"],
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
    if (beginner && (phase === "spec" || phase === "peak")) S2.push({ d: "sw", name: "Seuil technique CSS", note: "Quelques 100m à allure seuil contrôlée, technique maintenue : préparer la course sans casser le geste.", det: "", steps: [Wm(200, "souple + éducatifs"), Object.assign(Bd(P(4, 7), 100, "sw.css", "20-30s", "", false, "sw"), { repCap: 10 }), Cm(100, "relâché")] });
    else if (beginner) S2.push({ d: "sw", name: "Technique + éducatifs", note: limFocus.note, det: "", steps: [Wm(200, "souple"), Bd(P(6, 10), 50, "sw.easy", [0.33, "repos libre entre séries (~20s)"], limFocus.txt + ", " + P(1, 2) + " point(s) technique", false, "sw"), Cm(100, "relâché")] });
    else if (shoulder) S2.push({ d: "sw", name: "Seuil contrôlé (épaule)", note: "Volume modéré, technique soignée : on épargne l'épaule, on ne cherche pas la performance brute.", det: "", steps: [Wm(300, "souple + 4×50m éducatifs"), Object.assign(Bd(P(6, 8), 100, "sw.css", "20-30s", "", false, "sw"), { repCap: 10 }), Cm(200, "souple")] });
    else S2.push({ d: "sw", name: "Seuil CSS", note: "Allure régulière sur tous les 100m. Le dernier doit ressembler au premier.", det: "", steps: [Wm(400, "progressif + 4×50m éducatifs"), Object.assign(Bd(P(6, 10), 100, "sw.css", "15-20s", "", false, "sw"), { repCap: 14 }), Cm(200, "souple")] });
  } else if (slot === "dur2") {
    if (beginner && (phase === "spec" || phase === "peak")) S2.push({ d: "sw", name: "Endurance + touches de vitesse", note: "Nage continue technique, plus quelques accélérations courtes de 25m : de la vitesse de forme, pas de la souffrance.", det: "", steps: [Wm(200, "souple"), Bd(1, 400, "sw.aero", "20-30s", " nage continue fractionnée", false, "sw"), Object.assign(Bd(P(6, 10), 25, "sw.speed", "30s repos", " en accélérations progressives, technique maintenue", false, "sw"), { repCap: 12 }), Cm(100, "très souple")] });
    else if (beginner) S2.push({ d: "sw", name: "Endurance technique", note: "Priorité au geste, pas au chrono. Un seul point technique à la fois.", det: "", steps: [Wm(200, "souple"), Bd(1, 600, "sw.easy", "20-30s, le temps de respirer", " nage continue fractionnée (ex 8-12×50m) + 1 éducatif entre chaque", false, "sw"), Cm(100, "très souple")] });
    // B1 (audit v6) — les séances de substitution épaule héritent d'un BUDGET BORNÉ :
    // sans bnd, R3.3 gonflait le bloc jusqu'aux caps génériques (+68% de volume mesuré
    // sur swim/fond/epaule — une blessure qui AUGMENTAIT la charge).
    // R13.5 — LA SUBSTITUTION ÉPAULE DU PIC DOIT POUVOIR PORTER LE PIC. La séance était figée
    // à ~1 200 m (12×25 m + 600 m), soit MOINS que la séance de dev (1 500 m) : la semaine de
    // pic ne pouvait structurellement pas dominer, l'auditeur le signalait, et la boucle de
    // réparation érodait tout le plan vers les planchers — 20 semaines plates à 0,8 h/sem
    // pendant que la promesse affichait 2,9 h. Le budget reste BORNÉ (B1 : une blessure
    // n'augmente jamais la charge — le plafond de référence ×0,9 tient toujours), mais il suit
    // la phase : des séries de jambes de 50 m (le vrai format d'un kick set) et un bloc
    // technique qui peut grandir. L'épaule ne travaille pas plus — les jambes, oui.
    else if (shoulder && (phase === "spec" || phase === "peak")) S2.push({ d: "sw", name: "Jambes vitesse (épaule épargnée)", note: "Vitesse par les jambes : battements rapides avec planche, l'épaule ne travaille pas. La puissance se maintient sans risque.", det: "", steps: [Wm(200, "souple"), Object.assign(Bd(P(8, 12), 50, "sw.speed", "20-30s repos", " battements rapides avec planche (jambes seules)", false, "sw"), { repCap: 16 }), Object.assign(Bd(1, P(400, 900), "sw.easy", "", " éducatifs technique, amplitude confortable", false, "sw"), { bnd: { floor: 200, cap: 1200 } }), Cm(100, "souple")] });
    else if (shoulder) S2.push({ d: "sw", name: "Jambes + technique", note: "Épaule épargnée : le travail passe par les jambes et la technique, la charge articulaire reste nulle.", det: "", steps: [Object.assign(Bd(1, 400, null, "", " séries battements + éducatifs · épargne épaule", false, "sw"), { bnd: { floor: 300, cap: 1200 } })], ...( { plainBody: true }          ) });
    else S2.push({ d: "sw", name: "Vitesse", note: "Vitesse contrôlée et technique : la fréquence ne doit pas casser ta nage.", det: "", steps: [Wm(400, "varié + 4×25m accélérations"), Object.assign(Bd(P(8, 12), 50, "sw.speed", "30-40s", "", false, "sw"), { repCap: 16 }), Cm(200, "souple")] });
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
    // R20.1-d — `swim_limit` N'AGISSAIT QUE POUR LES DÉBUTANTS. Les deux seuls endroits qui
    // consommaient `limFocus` étaient derrière `if (beginner)` : un nageur intermédiaire qui
    // déclare « ma limite, c'est la respiration » recevait « éducatifs » sans plus de
    // précision. La question est pourtant posée à tout le monde, et `CLAUDE.md` affirmait
    // qu'elle était « câblée sur ses 4 valeurs ». Elle l'était sur un quart de la population.
    // Une limite ne disparaît pas quand on progresse — elle devient plus fine à traiter, pas
    // moins utile à nommer. Le focus s'applique donc dès que la réponse existe ; le repli
    // générique reste pour qui n'a pas répondu.
    else {
      const cible = a.swim_limit ? limFocus : { txt: " éducatifs", note: "Éducatifs à froid : le geste se grave sans fatigue. Qualité avant quantité." };
      S2.push({ d: "sw", name: "Technique souple", note: beginner ? limFocus.note : cible.note, det: "", steps: [Object.assign(Bd(1, P(techDistCaps.lo, techDistCaps.hi), "sw.easy", "", beginner ? limFocus.txt : cible.txt, false, "sw"), beginner ? {} : { bnd: { floor: techDistCaps.lo, cap: techDistCaps.hi } })], ...( { plainBody: true }          ) });
    }
  } else if (slot === "facile2") {
    const recDistCaps = beginner ? { lo: 100, hi: 400 } : { lo: 750, hi: 1100 }; // C24
    S2.push({ d: "sw", recovery: true, name: "Récup eau", note: "Nage de récupération : relâchement total, respiration ample.", det: "", steps: [Object.assign(Bd(1, P(recDistCaps.lo, recDistCaps.hi), "sw.easy", "", " souple", false, "sw"), beginner ? {} : { bnd: { floor: recDistCaps.lo, cap: recDistCaps.hi } })], ...( { plainBody: true }          ) });
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
  disciplines: ["sw"],
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
    ? { name: "Nage seuil technique (+dist)", note: "Technique d'abord, mais quelques 100m à allure seuil contrôlée pour préparer la course.", steps: [Wm(200, "souple"), Object.assign(Bd(1, swimDist, "sw.css", [0.33, "repos libre entre séries (~20s)"], ", fractionné en séries régulières, éducatifs entre", false, "sw"), { bnd: { floor: swimDistCaps.lo, cap: triSwimVolCap } }), Cm(100, "relâché")] }
    // R13 — une séance de seuil nage n'est pas 100 % seuil : le corps se répartit ~70 % au CSS
    // et ~30 % en aérobie (retour actif, éducatifs entre les séries). Compter tout le corps en
    // dur surchargeait l'intensité hebdomadaire de 6-8 min — ce qui faisait passer 10
    // combinaisons tri sous le plancher de temps facile une fois la nage mono-séance branchée.
    : { name: "Nage seuil (+dist)", note: "Distance cible atteinte, allure régulière. Fractionné = réponse à intensité.", steps: [Wm(300, "+ 4×50m éducatifs"), Object.assign(Bd(1, Math.max(200, Math.round((swimDist * 0.7) / 50) * 50), "sw.css", "15-20s", ", fractionné en séries régulières si besoin", false, "sw"), { bnd: { floor: Math.max(200, Math.round((swimDistCaps.lo * 0.7) / 50) * 50), cap: Math.round(triSwimVolCap * 0.7) } }), Object.assign(Bd(1, Math.max(150, Math.round((swimDist * 0.3) / 50) * 50), "sw.aero", "", " souple, technique relâchée entre les séries", false, "sw"), { bnd: { floor: 150, cap: Math.round(triSwimVolCap * 0.3) } }), Cm(200, "souple")] };
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
  const swShort = { recovery: true, name: "Nage récup", note: "Récupération dans l'eau : relâchement total, respiration ample — le corps absorbe le travail de la semaine.", steps: [Bd(1, swShortDist, "sw.easy", "", " souple, en blocs de 50m, respiration 3 temps · relâchement total", false, "sw")] };
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
    // R13.4 — L'AFFÛTAGE EST BRANCHÉ EXPLICITEMENT, plus jamais par un `else` attrape-tout.
    // Le fall-through envoyait la FORCE basse cadence (bk.frc) en plein affûtage : 6 blocs de
    // gros braquet sur le Full, dont un à J-3 de l'Ironman. La force à 50-60 rpm laisse la
    // même fatigue résiduelle que la VO2max (48-72 h de courbatures profondes) — le manifeste
    // interdit l'une, l'autre y était par accident de branchement. À la place : un rappel
    // d'allure course à pied, court et précis, le miroir exact du « Rappel race-pace » vélo.
    else if (phase === "taper") S2.push({ d: "rn", name: "Rappel allure course CAP", note: "Affûtage : on réveille l'allure du jour J sans générer de fatigue. Deux blocs courts, précis, puis on range les chaussures.", det: "", steps: [W(10, "footing progressif"), Object.assign(B(2, 8, "rn.mara", "3min trot"), { repCap: 2, bnd: { floor: 6, cap: 8, hard: true } }), C(5, "footing souple")] });
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
      // R19.5 — LA PROSE NE PROMET PLUS CE QUE LA STRUCTURE NE PORTE PAS.
      //
      // La note disait « vélo en endurance, dernier tiers @ allure course » et le step portait
      // `bk.z2` sur la TOTALITÉ du vélo. Mesuré sur un plan 70.3 : **881 min (14,7 h) d'allure
      // course annoncées à l'athlète, portées par aucun step et comptées 100 % facile** par la
      // répartition d'intensité. Un commentaire l'assumait pour ne pas faire tomber la part de
      // temps facile — c'est-à-dire qu'on protégeait la MÉTRIQUE, pas le plan. Le dépôt a déjà
      // payé cette leçon en R7 TRAIL : une intensité portée par une phrase n'existe pas.
      //
      // R20.5 — LE TIERS À ALLURE COURSE EXISTE ENFIN, PARCE QUE O-11 EST FERMÉ.
      //
      // R19.5 avait fermé le trou de PROSE (la note ne promet plus une intensité qu'aucun step
      // ne porte) et laissé la structure de côté, avec deux motifs mesurés : le tiers en
      // `bk.rp` mettait 58 combinaisons de tri sous le plancher de temps facile, et surtout
      // `bk.rp` valait 0,80-0,88 de la FTP quand le jour J d'un 70.3 se roule à 0,76-0,83 —
      // construire dessus aurait fait rouler plus dur que la course elle-même.
      //
      // Les deux motifs sont levés dans ce lot : `bk.rp` EST désormais l'allure course de
      // l'épreuve (relief compris), et le plancher de temps facile n'est plus la règle qui
      // gouverne l'intensité — C26c borne le temps DUR, or l'allure course vélo est MODÉRÉE.
      // C'était la vraie raison de l'ordre de ces cinq lots.
      //
      // Deux blocs, un seul leg vélo pour l'auditeur (il somme) : les deux tiers en endurance,
      // le dernier à l'allure exacte du jour J. Chaque bloc porte sa PART des bornes du format,
      // sinon un brick coupé en deux hériterait deux fois du plancher.
      // UN SEUL CRITÈRE, POUR DEUX DÉCISIONS. La bande d'allure course de l'épreuve décide à la
      // fois de la CLASSE de l'effort (dur au-dessus de 0,85 × FTP — bas de la zone seuil de
      // Coggan) et de l'EXISTENCE du tiers. Ce n'est pas une commodité : sur un sprint, la cible
      // du jour J vaut 0,85–0,93 × FTP, c'est-à-dire du seuil, et le segment vélo de l'épreuve
      // dure vingt minutes. Y ajouter un bloc de seuil DANS le brick, sur une enveloppe de 3 h,
      // c'est charger de l'intensité que les séances de qualité portent déjà — mesuré : 30
      // combinaisons de tri/S sous le plancher de temps facile, à 66-70 %. Sur un 70.3 ou un
      // Ironman, l'allure course est au contraire une allure qu'on TIENT (0,70–0,83), et
      // l'apprendre pendant des heures est précisément l'objet de la séance.
      //
      // Le brick d'un sprint garde donc son rôle : la transition. Celui d'un long y ajoute le
      // pacing. C'est ce qu'un entraîneur ferait, et c'est ce que la mesure dit.
      const rpBand = TRI_BIKE[fmt || ""];
      const tiersRp = !!rpBand && rpBand.hi < 0.85;
      const bikeTot = PT(bb.lo, Math.round(bb.hi * rf));
      const bikeZ2 = tiersRp ? Math.max(1, Math.round(bikeTot * 2 / 3)) : bikeTot;
      const bikeRp = Math.max(0, bikeTot - bikeZ2);
      S2.push({ d: "br", long: true, brick: true, name: "Brick vélo+CAP", note: "Le brick simule la course : sortie longue à vélo en endurance, "
        + (tiersRp
          ? "DERNIER TIERS à l'allure exacte de ton jour J (c'est là qu'on apprend le chiffre à tenir), "
          : "")
        + "puis enchaînement rapide vélo→course pour habituer tes jambes à la sensation «de coton» du début de CAP. C'est la transition qu'on entraîne ici — la séance la plus spécifique de ta semaine.", det: "", steps: [
        Object.assign({ role: "body", leg: "bike", durationMin: bikeZ2, zone: "bk.z2", intensity: intOf("bk.z2")                      }          , { share: tiersRp ? 2 / 3 : 1 }),
        // `rpBand` accompagne le step : c'est la bande réelle de CETTE épreuve, et c'est elle
        // qui décide si l'effort compte dur ou modéré (R20.5).
        ...(tiersRp ? [Object.assign({ role: "body", leg: "bike", durationMin: bikeRp, zone: "bk.rp", intensity: intOf("bk.rp")                     , suffix: " à l'allure de ton jour J" }          , { share: 1 / 3, rpBand })] : []),
        { role: "body", leg: "run", durationMin: PT(br.lo, Math.round(br.hi * rf)), d: "rn" }          ,
      ], ...( { runInj }          ) });
    } else if (phase === "taper" && !medHold && kit.weekNum < kit.r.weeks) {
      // R18.4 — L'AFFÛTAGE GARDAIT LE VOLUME BAS ET PERDAIT LA SPÉCIFICITÉ.
      // Mesuré sur les 4 formats × 2 niveaux : le dernier enchaînement vélo→course tombait
      // TROIS SEMAINES avant le jour J, sur toutes les combinaisons. R13.4 avait branché
      // l'affûtage explicitement sur `dur1` et `dur2` — `durLong`, lui, retombait encore
      // dans le `else` générique et rendait une sortie longue à pied. Le triathlète arrivait
      // donc au départ sans avoir posé le pied par terre après le vélo depuis 21 jours, sur
      // la transition qui est précisément la difficulté propre du sport.
      // Le swimrun, lui, garde sa séance pivot en affûtage (sa `durLong` n'a jamais eu de
      // garde de phase) : le modèle existait déjà dans le dépôt, il n'était pas appliqué ici.
      //
      // Ce que l'affûtage change, ce n'est pas la NATURE de la séance, c'est sa DOSE : même
      // motif, un tiers du volume du pic, allure course des deux côtés. Bosquet 2007 —
      // l'affûtage réduit le volume, PAS l'intensité ni la spécificité.
      const rf = a.history === "reprise" ? C21_REPRISE_BRICK_FACTOR : 1;
      // C21c — la bande vient de la matrice, pas d'une table recopiée ici : c'est elle que
      // l'auditeur relit, et deux tables qui disent la même chose finissent par diverger.
      const tbb = BRICK_TAPER_BIKE_BOUNDS[fmt] || [25, 45];
      const tb = { lo: tbb[0], hi: tbb[1] };
      const tr = ({ S: { lo: 6, hi: 10 }, M: { lo: 8, hi: 12 }, "70.3": { lo: 10, hi: 16 }, Full: { lo: 12, hi: 20 } }                                              )[fmt] || { lo: 8, hi: 12 };
      // LE LEG VÉLO ROULE EN Z2, PAS À L'ALLURE COURSE. Première écriture : `bk.rp` sur tout
      // le bloc — mesuré par le banc v7, 158 profils de duathlon en violation de dose (48 min
      // continues en zone haute). C'était juste, et pas seulement pour l'auditeur : 45 min à
      // allure course EST une séance dure, c'est-à-dire l'exact contraire d'un affûtage.
      // Même structure que le brick de pic : le corps en endurance, l'allure course rappelée
      // sur la fin et portée par la consigne, jamais par la zone du bloc entier.
      S2.push({ d: "br", long: true, brick: true, name: "Brick d'affûtage (rappel de transition)", note: "Court : on ne construit plus rien, on entretient. Vélo en endurance, les DIX dernières minutes à l'allure du jour J, puis on enchaîne vite. Les jambes ont besoin de se rappeler la sensation « de coton » des premières foulées après le vélo — c'est une compétence, elle se perd, et elle ne se rattrape pas le matin de la course. Un tiers du volume du brick de pic, zéro fatigue résiduelle.", det: "", steps: [
        // Le PLANCHER du leg vélo est la borne basse AUDITÉE (C21c), pas une fraction d'elle :
        // sinon la décroissance d'affûtage descend la séance sous ce que la spec exige, et le
        // générateur produit ce que l'auditeur refuse. Même discipline que C21b en charge.
        { role: "body", leg: "bike", durationMin: PT(tb.lo, Math.round(tb.hi * rf)), zone: "bk.z2", intensity: intOf("bk.z2")                     , bnd: { floor: tb.lo, cap: tb.hi } }          ,
        { role: "body", leg: "run", durationMin: PT(tr.lo, Math.round(tr.hi * rf)), d: "rn", bnd: { floor: Math.max(5, Math.round(tr.lo * 0.6)), cap: tr.hi } }          ,
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
    // R13 — le footing porte ses BORNES (`ftCaps` existait, jamais posé en bnd) : c'était le
    // seul bloc sans plafond de la semaine, donc le déversoir de toutes les passes de
    // remplissage — mesuré : « Footing facile 213 min » en semaine de peak (D7, banc v6).
    // Un footing de 3 h 33 est une seconde sortie longue déguisée, pas un footing.
    else S2.push({ d: "rn", name: "Footing facile", note: "Course facile : les jambes apprennent à courir « propre » sans fatigue ajoutée.", det: "", steps: [Object.assign(B(1, PT(ftCaps.lo, ftCaps.hi), "rn.easy", "", runInj ? " · surface souple" : ""), { bnd: { floor: ftCaps.lo, cap: Math.round(ftCaps.hi * 1.3) } })], ...( { plainBody: true }          ) });
  } else if (slot === "facile2") {
    // R13.3 — EN MONO-SÉANCE, LA NAGE DU TRI EXISTE. `swMain` et `swTech` n'étaient poussées
    // que sous `dbl` (doubles séances) : pour la majorité des athlètes (`doubles` non/parfois),
    // l'unique nage hebdomadaire était « Nage récup courte » en sw.easy — zéro seuil CSS sur
    // 59 semaines d'un plan Full, et AUCUNE nage sur les 6 semaines d'affûtage. Les sensations
    // d'eau se perdent en 10-14 jours : se présenter à un départ de 3,8 km sans avoir nagé
    // depuis un mois et demi n'est pas une contre-performance, c'est un risque (eau libre).
    // Le créneau facile2 route donc PAR PHASE quand l'athlète ne double pas ; en doubles, la
    // nage principale et la technique vivent déjà sur dur1/dur2 — la récup courte reste.
    if (dbl) S2.push({ d: "sw", recovery: true, name: swShort.name + " courte", note: swShort.note, det: "", steps: swShort.steps, ...( { plainBody: true }          ) });
    else if (phase === "taper") S2.push({ d: "sw", name: "Rappel nage course", note: "Affûtage : on entretient les sensations d'eau sans fatigue — elles se perdent en 10 à 14 jours, et le jour J commence par la natation. Court, précis, à l'allure de course.", det: "", steps: [
      Wm(300, "souple"), Object.assign(Bd(beginner ? 4 : 6, 100, "sw.css", "20-30s", ", à l'allure de course, technique impeccable", false, "sw"), { repCap: 6 }), Cm(100, "souple")] });
    else if (phase === "base") S2.push({ d: "sw", name: swTech.name, note: swTech.note, det: "", steps: swTech.steps });
    // dev/spec/peak : la nage principale (sw.css) — SAUF pour l'intention plaisir/finir ET le
    // débutant (sa priorité est le geste, et sa version « technique+seuil » à 100 % de corps
    // dur faisait passer un plan S à 2,8 h/sem sous le plancher de temps facile), qui
    // garde la technique : ajouter du seuil hebdomadaire à quelqu'un qui vient chercher du
    // plaisir faisait passer la part facile sous le plancher C26 (mesuré : 70 % pile, violé
    // sur 3 combinaisons 70.3). L'intensité suit l'intention, pas l'inverse.
    else if (finisher || a.intent === "plaisir" || beginner) S2.push({ d: "sw", name: swTech.name, note: swTech.note, det: "", steps: swTech.steps });
    else S2.push({ d: "sw", name: swMain.name, note: swMain.note, det: "", steps: swMain.steps });
  }
  else if (slot === "recup") S2.push({ d: "rs", name: "Récup active", det: "mobilité", steps: [] });
  else if (slot === "off") S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  return S2;
}


/** Prédiction tri — extraction mécanique de la branche correspondante de `predictRace`. */
function predictTri(kit            )       {
  const { refs, format, items, advice, D, range, runRange, swimRange, riegelSec, profWhy, swimWhy, bikeIF, bikeWhy } = kit;
  const sw = TRI_SWIM[format], bk = TRI_BIKE[format], rn = TRI_RUN[format];
  if (refs.css > 0 && sw) {
    const t = (sw.dist / 100) * refs.css * sw.factor;
    // R18.2 — la fourchette natation suit le MILIEU de la course. Le facteur `sw.factor` est
    // calibré sur de l'eau libre calme : c'est le lac qui vaut 1, pas le bassin.
    items.push({ leg: "Natation " + sw.dist + "m", value: swimRange(t), why: "CSS × " + sw.factor + " — peloton, combinaison et navigation compris" + swimWhy });
  } else advice.push("CSS manquant → pas de projection natation (test 400/200m).");
  if (refs.ftp > 0 && bk) {
    // R15.2 — la bande passe par `bikeIF` : le relief du parcours l'abaisse, une seule fois,
    // au même endroit que pour le vélo seul et le duathlon.
    const [blo, bhi] = bikeIF(bk.lo, bk.hi);
    items.push({ leg: "Vélo", value: Math.round(refs.ftp * blo) + "–" + Math.round(refs.ftp * bhi) + "W", why: "puissance normalisée qui laisse des jambes pour courir — dépasser cette bande se paie sur la CAP" + bikeWhy });
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
  disciplines: ["sw", "bk", "rn"],
  easyFallbackSlot: "facileR",
  weekSchema: null,
  buildSessions: buildTriSessions,
  predict: predictTri,
  retestTypes: ["css", "ftp", "thrPace"],
    // Le tri NAGE : il hérite des planchers de séance en mètres (C24/C24b), comme la natation.
  // C'est précisément ce que `sport !== "run"` disait de façon détournée.
  guards: { stripLongOnMedHold: true, singleRunVo2PerWeek: true, smoothOnAuditMetric: true, capacityProbe: true, swimSessionFloors: true, swimRacePrepFrequency: true, doublesAddVolume: true },
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
  disciplines: ["rn"],
  // "facileR", PAS "facile2" : c'est ce que l'ancien code faisait (`sport === "run" ? … : …`
  // ne connaissait que la course). Le déclarer autrement changerait les plans trail — ce
  // serait une DÉCISION, pas une extraction. Candidate à réexaminer (voir R10_DEFECTS.md).
  // R20.9 (O-3) — LE REPLI DU TRAIL PASSE DE `facileR` À `facile2`, ET C'EST MESURÉ.
  //
  // `easyFallbackSlot` est le créneau qu'on construit quand un jour DUR est déclassé — fatigue,
  // anti-collage, drapeau médical. En trail, `facileR` produit « Marche rapide en montée
  // (bâtons) » : une sortie de 30 min à 5 h avec du dénivelé et du renfo excentrique. Ce n'est
  // pas une séance de repli, c'est une séance de charge qui porte un autre nom.
  //
  // Mesuré sous drapeau médical — le cas où le plan doit être un plan de MAINTIEN sans la
  // moindre intensité : la semaine livrait **trois « Marche rapide en montée » identiques**.
  // `facile2` produit « Footing récup », qui est exactement ce qu'un jour déclassé doit devenir.
  easyFallbackSlot: "facile2",
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
    // R13.4 — TROISIÈME sport avec le même fall-through (tri, vélo, duathlon) : l'`else`
    // attrape-tout envoyait la force basse cadence en plein affûtage. La règle mécanisée de
    // l'auditeur (« *.frc en taper » = violation dure) les a débusqués un par un — c'est
    // exactement ce qu'une règle vérifiée fait qu'une règle espérée ne fait pas.
    } else if (phase === "taper") {
      S2.push({ d: "bk", name: "Rappel race-pace", note: "Affûtage : on réveille l'allure course sans générer de fatigue. Court et précis.", det: "",
        steps: [W(10, "progressif"), Object.assign(B(PT(2, 3), PT(6, 10), "bk.rp", "3min souple"), { repCap: 4 }), C(5, "décrassage")] });
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
      // Semaine de course exclue, même raison qu'en tri : sa spécificité c'est la course.
    } else if (phase === "taper" && !medHold && kit.weekNum < kit.r.weeks) {
      // R18.4 — même défaut qu'en triathlon, et il coûte plus cher ici : la transition
      // vélo→R2 EST la difficulté du duathlon, et elle disparaissait des trois dernières
      // semaines (mesuré sur les 3 formats × 2 niveaux). L'affûtage réduit la DOSE, pas la
      // spécificité. On garde le sens vélo→R2, celui du jour J, et pas l'alternance :
      // à l'affûtage on ne découvre plus rien, on rappelle ce qui va se passer.
      const rf = a.history === "reprise" ? C21_REPRISE_BRICK_FACTOR : 1;
      // C21c — même bande que le tri, lue dans la matrice (l'auditeur relit la même).
      const tbb = BRICK_TAPER_BIKE_BOUNDS[f] || [25, 45];
      const r2 = DUA_RUN2[f] || { lo: 10, hi: 22 };
      const tbLo = tbb[0], tbHi = tbb[1];
      const trLo = Math.max(5, Math.round(r2.lo * 0.6)), trHi = Math.max(8, Math.round(r2.lo * 0.9));
      // Leg vélo en Z2, pas en allure course : voir le commentaire jumeau dans `tri/index.ts`.
      // C'est ici que le banc v7 l'a attrapé — 158 profils avec 48 min continues en zone haute
      // dans une semaine d'affûtage.
      S2.push({ d: "br", long: true, brick: true, name: "Brick d'affûtage (rappel vélo → R2)", note: "Court : on n'entraîne plus, on entretient. Vélo en endurance, les DIX dernières minutes à l'allure du jour J, puis R2 enchaîné vite. Le R2 se court sur des jambes de coton — c'est une compétence, elle se perd en trois semaines, et elle ne se rattrape pas le matin de la course. Zéro fatigue résiduelle.", det: "",
        steps: [
          // Plancher = la borne basse AUDITÉE (C21c), pas une fraction d'elle.
          { role: "body", leg: "bike", durationMin: PT(tbLo, Math.round(tbHi * rf)), zone: "bk.z2", intensity: intOf("bk.z2")                     , bnd: { floor: tbLo, cap: tbHi } }          ,
          { role: "body", leg: "run", durationMin: PT(trLo, Math.round(trHi * rf)), d: "rn", bnd: { floor: Math.max(5, Math.round(trLo * 0.6)), cap: trHi } }          ,
        ], ...({ runInj }          ) });
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
    S2.push({ d: "bk", recovery: true, name: "Vélo récup", note: "Moulinage très souple, sans force sur les pédales : on active la circulation sans ajouter un appui de plus dans la semaine.", det: "",
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
  const { refs, format, items, advice, D, runRange, riegelSec, profWhy, bikeIF, bikeWhy } = kit;
  const r1 = DUA_RUN1[format], bk = DUA_BIKE[format], pw = DUA_BIKE_POWER[format], r2 = DUA_RUN2[format];
  const pf = DUA_BIKE_PREFATIGUE[format] ?? 0.97;
  if (refs.thrPace > 0 && r1 && r2) {
    items.push({ leg: "R1 (" + r1.km + "km)", value: runRange(riegelSec(refs.thrPace, r1.km)), why: "Riegel depuis ton allure seuil — le R1 se court frais, c'est le seul segment où c'est vrai" + profWhy });
    items.push({ leg: "R2 (" + r2.km + "km)", value: runRange(riegelSec(refs.thrPace, r2.km) * r2.fatigue), why: "Riegel × " + r2.fatigue + " de fatigue post-vélo — un R2 se court plus lentement qu'un R1 de même distance, même quand il est plus court" + profWhy });
  } else advice.push("Renseigne ton allure seuil (test : 30min à fond, allure moyenne) pour obtenir tes deux segments de course.");
  if (refs.ftp > 0 && bk && pw) {
    // §R10.2.4 — le facteur que le tri n'a jamais eu : le R1 dégrade la capacité du vélo.
    const [dlo, dhi] = bikeIF(pw.lo, pw.hi); // R15.2 — le relief abaisse la cible, avant la pré-fatigue
    items.push({ leg: "Vélo (" + bk.km + "km)", value: Math.round(refs.ftp * dlo * pf) + "–" + Math.round(refs.ftp * dhi * pf) + "W",
      why: "puissance NORMALISÉE cible, réduite de " + Math.round((1 - pf) * 100) + "% : tu arrives sur le vélo avec un R1 dans les jambes — viser la puissance d'un contre-la-montre frais coûterait ton R2" + bikeWhy });
  } else advice.push("Renseigne ta FTP (test 20min × 0.95) pour obtenir ta puissance cible vélo.");
  if (items.length) {
    D("PRED-duathlon", "Méthode duathlon", "3 legs séparés (R1 · vélo · R2)", "Un total additionnerait les incertitudes ET les transitions ; chaque segment a sa méthode, et le vélo porte en plus la pré-fatigue du R1");
    advice.push("Le piège du duathlon est le R1 : parti à l'allure d'un 10 km sec, il te coûte le vélo ET le R2. Cours-le 10 à 15 s/km plus lentement que ta référence sur la distance.");
  }
}

registerSport({
  id: "duathlon",
  mainDiscipline: "rn", // deux segments sur trois se courent : la course décide
  disciplines: ["rn", "bk"],
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
  { wetsuitMandatoryBelowC: 19, acclimationBelowC: 17, minSessionsPerWeek: 1, idealSessionsPerWeek: 2,
    /**
     * S7bis (R20.8, O-15) — L'ACCLIMATATION NE DURE PAS TOUTE LA PRÉPARATION.
     *
     * Le verrou froid confisquait le second créneau facile de la PREMIÈRE à la DERNIÈRE semaine.
     * Or l'adaptation au froid (vasoconstriction périphérique, réponse au choc thermique,
     * tolérance du réflexe inspiratoire) s'installe en quelques semaines d'exposition régulière
     * et se PERD tout aussi vite à l'arrêt : celle de la semaine 1 d'une prépa de 26 semaines ne
     * vaut rien le jour J. Pendant ce temps elle coûtait de la spécificité tout du long — mesuré
     * en R20.3 : sur une épreuve à 68 % de course à pied, le plan n'en faisait courir que 45 %.
     *
     * Elle démarre donc à 8 semaines du jour J. Avant, la bascule S13 reprend son droit et le
     * créneau retourne à la discipline que l'épreuve demande.
     *
     * 8 semaines : au-dessus de la fenêtre d'installation décrite (2 à 6 semaines d'exposition
     * régulière), avec la marge d'une prépa réelle où l'on rate des séances. Le choix penche
     * délibérément du côté long — c'est une règle de SÉCURITÉ, et une acclimatation trop courte
     * coûte plus cher qu'une semaine de spécificité en moins.
     */
    acclimationWeeksBeforeRace: 8 },
);

/**
 * S8 — PLAQUETTES et ÉPAULE. Les plaquettes sollicitent durement épaules et dos : leur
 * introduction est GRADUELLE, jamais d'emblée au volume cible. Le drapeau `epaule` cesse
 * d'être un simple modificateur de volume — il conditionne cette progression.
 */
const S8_PADDLES = srule(
  "S8",
  "les plaquettes sont l'outil le plus rentable du swimrun et le plus traumatisant pour l'épaule : la progressivité n'est pas une précaution, c'est la condition de leur usage",
  { shareBase: 0.15, shareDev: 0.3, shareSpec: 0.45,
    // R4.8e (audit v7) — épaule déclarée : ZÉRO plaquette, partout. Le facteur valait 0.4, ce qui
    // laissait ~6 % de plaquettes dans la séance pivot pendant que la séance de nage affichait
    // « SANS plaquettes » : deux séances du même plan se contredisaient sur le même drapeau.
    // Trancher vaut mieux qu'expliquer une incohérence.
    shoulderFactor: 0 },
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
 * S14 (R20.3) — LE FOOTING FACILE PORTE SES BORNES, INDEXÉES SUR LE TEMPS DE COURSE À PIED
 * DE L'ÉPREUVE.
 *
 * Le créneau facile course n'avait AUCUNE borne (`bnd` absent) : il devenait donc le déversoir
 * de toutes les passes de remplissage du générateur. Mesuré sur un swimrun à 12 h/sem, la plus
 * longue séance du plan était un « Footing facile » de 179 à 226 min selon le format, avec une
 * MÉDIANE de 138 à 161 min — devant la pivot, qui plafonne à 110-180 min. Un footing de près de
 * quatre heures n'est pas un footing : c'est une seconde sortie longue déguisée, et elle
 * dominait la séance qui EST la spécificité du sport.
 *
 * C'est le défaut que R13 avait corrigé pour le triathlon (« Footing facile 213 min », D7 du
 * banc v6) : le module swimrun est arrivé plus tard et personne n'a rejoué la liste des leçons
 * du sport précédent.
 *
 * **Deux écritures de cette borne ont été mesurées et réfutées avant celle-ci**, par le banc v7,
 * sur le même check `S-MIX` (part de course du plan vs part de course de l'épreuve — 4 profils
 * en défaut avant le lot) :
 *
 * 1. *relative à la pivot de la MÊME semaine, ×0,70* → **S-MIX = 158**. La pivot part à 20-35 %
 *    du temps de course en phase de base : le footing tombait à ~38 min pendant toute la
 *    construction. Or il n'a aucune raison de suivre la rampe de SPÉCIFICITÉ de la pivot — il
 *    construit l'endurance de base, qui est déjà là dès la première semaine.
 * 2. *indexée sur le temps de course à pied de l'épreuve, ×0,55* → **S-MIX = 152**. Même
 *    ordre de grandeur : le vrai problème n'était pas la rampe, c'était le NIVEAU. En swimrun,
 *    les deux créneaux faciles PORTENT la course à pied du plan — il n'y a ni sortie longue
 *    course ni footing supplémentaire pour compenser. Les serrer, c'est sous-entraîner le
 *    limiteur réel du sport, soit exactement le défaut que S13 venait de corriger.
 *
 * Ce que ces deux échecs disent, et que la formulation d'O-8 disait déjà : le défaut n'est pas
 * qu'un footing soit LONG, c'est qu'il soit **la plus longue séance du plan**, devant la séance
 * qui EST la spécificité du sport. La borne porte donc exactement là-dessus — le footing plafonne
 * juste sous la pivot du PIC, la séance la plus longue que le plan produira. Un footing de 2 h
 * dans une prépa de 4 h de course reste un footing ; à 3 h 47 il a pris la place de la pivot.
 *
 * 0,90 : assez haut pour que les deux créneaux faciles portent la course à pied du plan, assez
 * bas pour que la pivot reste la séance de référence — sur toutes les semaines, y compris celles
 * où la pivot est encore courte.
 */
const S14_EASY_RUN_VS_PEAK_PIVOT = srule(
  "S14",
  "le défaut n'est pas qu'un footing soit long, c'est qu'il dépasse la séance qui porte la spécificité du sport : la borne est la pivot du PIC, pas celle de la semaine en cours",
  0.9,
);

/**
 * S14 — plafond ABSOLU du footing, toutes épreuves confondues. Au-delà de deux heures et demie,
 * une « sortie facile » n'est plus une sortie facile quelle que soit la durée de l'épreuve :
 * elle porte sa propre récupération et cesse d'être ce que sa note promet. C'est la borne qui
 * empêche un ultra-swimrun de rouvrir le déversoir par le haut, là où la pivot du pic serait
 * elle-même très longue.
 */
const S14_EASY_RUN_CAP_MIN = srule(
  "S14",
  "au-delà de 2 h 30 une sortie facile n'est plus un footing : elle porte sa propre récupération et devient une seconde sortie longue non spécifique",
  150,
);

/** S14 — plancher du footing : en dessous, ce n'est plus de l'endurance fondamentale. */
const S14_EASY_RUN_FLOOR_MIN = srule(
  "S14",
  "un footing d'endurance fondamentale a besoin d'une trentaine de minutes pour produire son adaptation",
  30,
);

/**
 * S12 — nombre maximal de segments reproduits dans UNE séance. Une course à 48 segments ne se
 * répète pas à l'entraînement : au-delà d'une douzaine d'entrées-sorties d'eau, la séance
 * devient la course elle-même. On travaille la compétence sur un nombre représentatif et on la
 * répète semaine après semaine — c'est comme ça qu'elle s'automatise.
 */
const S12_PIVOT_MAX_SEGMENTS = srule(
  "S12",
  "la compétence « entrer et sortir de l'eau » s'automatise par la répétition hebdomadaire, pas en reproduisant les 48 segments de la course en une sortie",
  10,
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

/**
 * S13 — LE CRÉNEAU FACILE SECONDAIRE SUIT LA DISCIPLINE QUI DOMINE LA COURSE.
 *
 * Mesuré avant correction (banc v7, R16.10) : la part de COURSE dans le plan valait 63-64 %
 * quelle que soit l'épreuve, alors que la part de course dans la course va de 45 % (5 000 m
 * de nage / 5 km) à 94 % (800 m / 30 km). La structure hebdomadaire était un CONSTANT —
 * 2 nages, 2 courses, la pivot — et ne lisait jamais l'objectif. Sur une épreuve à 94 % de
 * course, le plan sous-entraînait le limiteur réel de 31 points.
 *
 * La règle ne rééquilibre PAS proportionnellement, et c'est délibéré : nager 6 % du temps
 * parce que la course ne nage que 6 % du temps est absurde — la technique de nage se perd
 * par manque de FRÉQUENCE, pas de volume, et c'est la sortie de l'eau qui décide de la
 * course. Aucune des deux disciplines ne descend donc jamais sous deux rendez-vous par
 * semaine (la pivot en porte déjà une de chaque). C'est le SECOND créneau facile qui bascule.
 *
 * Le seuil borne la bande où la structure de référence des coachs (≈64 % de course) est
 * encore juste ; au-dessus, elle ne l'est plus. Il n'y a PAS de seuil symétrique : côté
 * épreuve dominée par la nage, le plan mesurait déjà 64 % de course pour 45-53 % dans la
 * course — au-dessus, jamais en dessous, donc jamais le sens qui sous-entraîne. La règle
 * miroir a été écrite, mesurée (la part de course tombait à 17 %) et retirée.
 */
const S13_MIX_FOLLOWS_RACE = srule(
  "S13",
  "la spécificité veut que le plan ressemble à la course ; la technique de nage veut de la fréquence — le compromis est de faire basculer UN créneau facile, jamais de supprimer une discipline",
  {
    /** Au-dessus : le second créneau facile (nage de récup) passe en COURSE. */
    runDominantAbove: 0.78,
  },
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
  // R20.1-c — `gear_test` ne servait à RIEN. La question « as-tu fait le test en tenue
  // complète ? » était posée au questionnaire swimrun et lue nulle part dans le moteur : le
  // balayage dérivé du schéma (R20.1) l'a trouvée inerte.
  //
  // Le module dit pourtant lui-même ce qu'elle vaut : « les allures ne transfèrent PAS en
  // swimrun — combinaison, chaussures mouillées, pull buoy, plaquettes, terrain. Le seul test
  // qui vaut se fait en tenue COMPLÈTE. » Deux chronos saisis SANS ce test ne sont donc pas
  // des références mesurées : ce sont des estimations qui se croient mesurées, et elles
  // resserrent la fourchette à tort. `gear_test` entre donc exactement là où l'argument du
  // module le place — dans la confiance qu'on accorde aux références.
  const paceKnown = measuredSwim > 0 && measuredRun > 0 && String(a.gear_test ?? "") !== "non";
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
                                                               



/**
 * S9 — DURÉE DE LA SÉANCE PIVOT, calculée en UN seul endroit.
 *
 * Le créneau `durLong` la construisait en ligne ; depuis S14 le créneau facile a besoin de la
 * même formule, prise au PIC, pour s'y borner en dessous. Deux copies auraient divergé au
 * premier ajustement de S9 — et la divergence aurait été silencieuse : un footing plafonné sur
 * une pivot d'hier reste un footing plafonné, il ne lève rien.
 *
 * `progOverride` / `phaseOverride` servent à interroger la formule pour une AUTRE phase que
 * celle en cours : c'est ainsi que le footing connaît la pivot du pic sans la construire.
 */
function pivotDurationMin(kit            , totalMinMid        , phaseOverride         , progOverride         )         {
  const ph = phaseOverride ?? kit.phase;
  const pr = progOverride ?? kit.prog;
  const band = S9_LONG_SHARE[ph] || S9_LONG_SHARE.dev;
  const share = band[0] + (band[1] - band[0]) * pr;
  // Le plafond suit la semaine EN COURS, pas le pic : sur une semaine allégée, une pivot
  // calibrée sur le pic représenterait 70 % du volume. `sessionScale` porte ce rapport —
  // sauf quand on interroge le pic, qui est par définition la semaine à pleine échelle.
  const scale = phaseOverride ? 1 : Math.min(1, kit.sessionScale || 1);
  const weekCapMin = Math.round((kit.r.volPeak || 8) * 60 * 0.42 * scale);
  return Math.min(weekCapMin, Math.max(40, Math.round(totalMinMid * share)));
}

/**
 * S14 (R20.3) — bornes du créneau facile course. Le plafond est la pivot du PIC, c'est-à-dire
 * la plus longue séance que ce plan produira : le footing ne peut donc jamais devenir la séance
 * de référence, ce qui est exactement ce qu'O-8 reproche. Voir `tables.ts` pour les DEUX
 * écritures précédentes, mesurées et réfutées par le banc v7 (S-MIX 4 → 158 puis 152).
 *
 * Le plancher est absolu ; le `Math.min` garantit qu'il ne peut jamais dépasser le plafond sur
 * une épreuve très courte — une borne inversée est une borne qui ne borne plus.
 */
function easyRunBounds(kit            , totalMinMid        )                                 {
  const pivotPeak = pivotDurationMin(kit, totalMinMid, "peak", 1);
  const cap = Math.max(S14_EASY_RUN_FLOOR_MIN,
    Math.min(S14_EASY_RUN_CAP_MIN, Math.round(pivotPeak * S14_EASY_RUN_VS_PEAK_PIVOT)));
  return { floor: Math.min(S14_EASY_RUN_FLOOR_MIN, cap), cap };
}

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
  // R4.3 (audit v7) — `maxSessionsPerWeek` (3 / 1 / 0) est un NOMBRE, pas un booléen : il
  // n'était lu que comme `=== 0`, et le plan prescrivait 3 séances en eau libre là où l'athlète
  // en avait déclaré 1 de possible. Le quota est désormais alloué par PRIORITÉ, de façon
  // déterministe (chaque créneau sait s'il a droit à l'eau libre sans compter la semaine) :
  //   1. le swimrun spécifique — la séance qui justifie le sport ;
  //   2. la plus longue nage continue — la contrainte dimensionnante ;
  //   3. l'acclimatation au froid — la plus substituable (bassin non chauffé, douche).
  const owQuota = ow.maxSessionsPerWeek;
  const owForPivot = owQuota >= 1;
  const owForLongSwim = owQuota >= 2;
  // L'acclimatation est la séance la plus SUBSTITUABLE des trois (bassin non chauffé, douche) :
  // elle ne réclame jamais le quota. Cela laisse une marge d'une séance, car les passes de
  // reconstruction (anti-collage, polarisation) peuvent dupliquer un créneau dans la semaine —
  // une 4ᵉ séance en eau libre est alors apparue sur un plafond de 3. L'athlète garde de
  // l'exposition au froid via le swimrun spécifique et la longue nage, qui y sont déjà.
  const owForCold = false;
  const shoulder = inj.shoulder;
  const team = obj.teamMode === "binome";
  // S7bis (R20.8, O-15) — LE VERROU FROID NE COUVRE QUE LES DERNIÈRES SEMAINES.
  //
  // Voir `tables.ts` : l'adaptation au froid s'installe en quelques semaines et se perd à
  // l'arrêt, donc celle de la semaine 1 d'une prépa longue ne sert à rien le jour J — pendant
  // qu'elle coûte de la spécificité toutes les semaines. Elle démarre à 8 semaines de la course.
  //
  // Le calcul se fait en semaines RESTANTES, pas en phases : une prépa de 12 semaines et une de
  // 40 n'ont pas les mêmes phases au même endroit, mais elles ont toutes les deux un « J-8
  // semaines ». Sur une prépa PLUS COURTE que 8 semaines, la condition est vraie partout — et
  // c'est voulu : il n'y a alors plus de marge à arbitrer.
  const semainesRestantes = Math.max(0, kit.r.weeks - kit.weekNum + 1);
  const froidPertinent = semainesRestantes <= S7_COLD.acclimationWeeksBeforeRace;
  const cold = obj.waterTempC != null && obj.waterTempC < S7_COLD.acclimationBelowC && froidPertinent;
  const pad = paddleShare(phase, shoulder);
  // S13 — LE CRÉNEAU FACILE SECONDAIRE SUIT LA COURSE. La structure hebdomadaire était un
  // constant (2 nages, 2 courses, la pivot) : la part de course du plan valait 63-64 % que
  // l'épreuve en demande 45 % ou 94 %. On ne rééquilibre pas au prorata — nager 6 % du temps
  // parce que la course nage 6 % du temps serait absurde, la technique se perd par manque de
  // FRÉQUENCE — mais un créneau facile bascule quand l'écart n'est plus défendable.
  const runShare = 1 - obj.swimTimeShare;
  // Deux verrous, tous deux au nom de la HIÉRARCHIE DU MANIFESTE — la spécificité est la
  // priorité 5, la santé la 1 :
  //   · l'acclimatation au froid n'est pas un choix de spécificité mais une adaptation de
  //     sécurité : quand elle occupe `facile2`, elle le verrouille ;
  //   · sous drapeau médical, le plan est un plan d'entretien — il n'a rien à ressembler à
  //     une course. Mesuré : sans ce verrou, la bascule retirait la nage souple des plans
  //     sous drapeau, et 71 profils perdaient leur seule nage continue.
  const runDominant = runShare > S13_MIX_FOLLOWS_RACE.runDominantAbove && !cold && !medHold;

  const gearNote = team ? " Longe attachée : c'est en binôme que ça se joue." : "";

  // Le stimulus VO2 en course : un seul constructeur, deux créneaux possibles (`dur2` quand le
  // budget le permet, `dur1` en alternance quand il ne le permet pas — R5.5).
  const vo2Swim = ()            => ({ d: "sw", name: "VO2max en nage (zone fragile épargnée)", note: "Ta zone fragile interdit l'intensité en course, pas la puissance aérobie maximale : elle se travaille dans l'eau, sans le moindre impact. Départs toutes les 1'30 : c'est la récupération courte qui fait le travail, pas la vitesse pure. Si tu sens la zone fragile, tu sors.", det: "",
    steps: [Wm(300, "progressif + 4×25m accélérations"), Object.assign(Bd(P(6, 10), 50, "sw.vo2", "départ 1'30", "", false, "sw"), { repCap: 10 }), Cm(200, "très souple")] });
  const vo2Trail = ()            => ({ d: "rn", name: "VO2max sur sentier", note: "Le seul bloc vraiment dur de ta semaine : effort maximal tenable ~3 min, récupération complète. On le place en phase de développement — c'est lui qui relève le plafond sous lequel toute ton allure d'endurance se joue. Sur sentier, pas sur piste : le terrain fait partie du geste.", det: "",
    steps: [W(18, "footing progressif sur sentier + 4 lignes droites"), B(P(4, 6), 3, "rn.vo2", "2min30 trot", ""), C(10, "footing très souple")] });

  if (slot === "durLong") {
    // ---- LA SÉANCE PIVOT : le swimrun spécifique (§R10.3.4) ----
    const band = S9_LONG_SHARE[phase] || S9_LONG_SHARE.dev;
    const share = band[0] + (band[1] - band[0]) * prog;
    // S9 dimensionne la pivot en % du temps de COURSE. Elle reste néanmoins une séance dans
    // une semaine : au-delà d'environ la moitié du volume hebdo, ce n'est plus un plan, c'est
    // une course déguisée (et l'auditeur le signale à juste titre au-delà de 55 %).
    // R20.3 — le calcul vit désormais dans `pivotDurationMin` : le créneau facile en a besoin
    // pour se borner en dessous (S14), et deux copies auraient divergé en silence.
    const durMin = pivotDurationMin(kit, obj.totalMinMid);
    // Le motif reproduit la COURSE : mêmes transitions, même part de nage. Sur une séance plus
    // courte, on garde le NOMBRE de transitions et on raccourcit les segments — c'est la
    // compétence « entrer et sortir de l'eau » qui se travaille, pas la distance.
    // S12 — on ne reproduit jamais plus d'une douzaine de segments dans une séance : au-delà,
    // la séance EST la course. R4.1 (audit v7) : `repCap = segs` sur les deux legs — le nombre
    // de transitions est la SPÉCIFICATION de cette séance, il ne doit jamais absorber du volume.
    // C'est la durée des segments qui s'ajuste.
    const segs = Math.max(2, Math.min(obj.segments, S12_PIVOT_MAX_SEGMENTS, Math.round(obj.segments * Math.min(1, share * 1.3))));
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
        note: "Tu n'as pas accès à un plan d'eau : cette séance reproduit ce qui est reproductible — les " + segs * 2 + " transitions et la part de nage de ta course, en bassin et sur route. Ce qui NE se substitue pas : la navigation, la houle, le froid et l'entrée en eau vive. Cale au moins deux week-ends en conditions réelles (lac ou mer) avant ta course, c'est le meilleur investissement de ta préparation." + gearNote,
        det: "",
        steps: [
          Wm(200, "nage souple, en tenue partielle si le bassin l'autorise"),
          // Les DEUX legs sont des steps à part entière : mettre la course dans un texte de
          // récupération ferait mentir le total de la séance (l'auditeur, lui, la compte).
          { role: "body", leg: "swim", reps: segs, durationMin: perSwim, zone: "sw.aero", d: "sw", intensity: "aero"                     , bnd: { floor: 2, cap: perSwim }, repCap: segs, recoveryText: "sortie de bassin sans traîner", suffix: " nage" + (pad > 0 ? " (dont ~" + Math.round(pad * 100) + "% avec plaquettes)" : ""), text: "" }          ,
          { role: "body", leg: "run", reps: segs, durationMin: perRun, d: "rn", zone: "rn.easy", intensity: "easy"                     , bnd: { floor: 3, cap: perRun }, repCap: segs, recoveryText: "retour à l'eau immédiat", suffix: " de course entre deux nages", text: "" }          ,
          Cm(150, "souple"),
        ] });
    } else {
      S2.push({ d: "br", long: true,
        name: "Swimrun spécifique (" + segs * 2 + " transitions)",
        note: "LA séance de ta préparation : elle reproduit le nombre de transitions et la part de nage de ta course, quelle que soit sa durée. Entre dans l'eau sans t'arrêter pour ranger tes affaires, sors en courant, et compte le temps que tu perds à chaque passage — c'est là qu'on gagne une demi-heure." + (cold ? " Eau froide : couvre-toi dès la sortie, la déperdition thermique se joue à la course, pas à la nage." : "") + gearNote,
        det: "",
        steps: [
          W(10, "course d'ouverture progressive, matériel en place"),
          // Nage ET course sont des steps à part entière (§R10.3.4) : le motif alterne les deux
          // `segs` fois. Encoder la course dans un texte de récupération ferait sous-compter la
          // séance de tout son volume de course — l'auditeur l'a relevé, et il avait raison.
          { role: "body", leg: "swim", reps: segs, durationMin: perSwim, zone: "sw.aero", d: "sw", intensity: "aero"                     , bnd: { floor: 2, cap: perSwim }, repCap: segs, recoveryText: "sortie d'eau en courant", suffix: (owForPivot ? " nage en eau libre" : " nage en bassin") + (pad > 0 ? ", ~" + Math.round(pad * 100) + "% avec plaquettes" : "") + (team ? ", longe attachée" : ""), text: "" }          ,
          { role: "body", leg: "run", reps: segs, durationMin: perRun, d: "rn", zone: "rn.easy", intensity: "easy"                     , bnd: { floor: 3, cap: perRun }, repCap: segs, recoveryText: "entrée dans l'eau sans t'arrêter", suffix: " de course sur sentier entre deux nages", text: "" }          ,
          C(10, "course très souple, se réchauffer"),
        ] });
    }
  } else if (slot === "dur1") {
    // ---- Qualité NAGE : en tenue quand c'est possible, plaquettes progressives (S8) ----
    // R5.5 (audit v7 bis) — SUR UNE PETITE ENVELOPPE, LA QUALITÉ SE PARTAGE UN SEUL CRÉNEAU.
    // Le stimulus VO2 vit dans `dur2` ; à 3 séances par semaine (ou 3 jours bloqués), le budget
    // supprime ce jour et le plan traversait 40 semaines sans une seule sollicitation de la
    // puissance aérobie maximale — c'est elle qui plafonne l'allure d'endurance sur laquelle
    // tout le reste se joue. Une semaine sur deux en phase de développement, le créneau de
    // qualité bascule donc sur elle ; le seuil nage revient l'autre semaine. Rien n'est
    // sacrifié, tout est alterné — c'est ce que fait un entraîneur avec trois séances.
    // Le SUPPORT suit les zones fragiles (R5.4) : impact → nage, épaule → course. Les deux à la
    // fois : aucun support n'est sûr, on laisse la main aux branches prudentes ci-dessous.
    if (phase === "dev" && kit.weekNum % 2 === 1 && !kit.noVo2 && !medHold && !beginner
        && !(inj.impact && shoulder)
        && ((kit.r.budgetPerWeek ?? 6) <= 4 || (kit.r.offDays?.length ?? 0) >= 3 || kit.a.dispo === "weekend")) {
      S2.push(inj.impact ? vo2Swim() : vo2Trail());
    } else if (shoulder) {
      S2.push({ d: "sw", name: "Nage seuil contrôlé (épaule épargnée)", note: "Épaule fragile : volume modéré, technique soignée, et les plaquettes réduites au minimum — ce sont elles qui chargent l'épaule en swimrun. Arrêt au moindre signal articulaire.", det: "",
        steps: [Wm(200, "souple + éducatifs doux"), Object.assign(Bd(P(4, 7), 100, "sw.css", "25-35s", " amplitude confortable, SANS plaquettes", false, "sw"), { repCap: 10 }), Cm(150, "souple")] });
    } else if (beginner) {
      S2.push({ d: "sw", name: "Technique + aisance en tenue", note: "En swimrun on nage en chaussures et en combinaison : la position change, les jambes portent moins. Habitue-toi au matériel AVANT de chercher la vitesse — c'est le choc n°1 des débutants.", det: "",
        steps: [Wm(200, "souple"), Object.assign(Bd(P(6, 10), 50, "sw.easy", [0.33, "repos libre (~20s)"], " en tenue partielle, un point technique à la fois", false, "sw"), { repCap: 10 }), Cm(100, "relâché")] });
    } else if ((phase === "spec" || phase === "peak") && (kit.weekNum % 2 === 0 || kit.r.weeks <= 14)) {
      // La PLUS LONGUE NAGE est la contrainte dimensionnante d'une prépa swimrun (thermique et
      // mentale) : elle se répète en continu, pas en séries. Une semaine sur deux en phase
      // spécifique, pour ne pas sacrifier le travail de seuil.
      S2.push({ d: "sw", name: "Nage continue longue (répétition de la plus longue nage)",
        note: "La plus longue nage de ta course fait " + obj.longestSwimM + " m : c'est elle qui décide si tu passes ou si tu sors de l'eau vidé. On la répète EN CONTINU, sans toucher le bord — le mental compte autant que le physique ici." + (owForLongSwim ? " En eau libre, avec quelqu'un à vue." : " En bassin : ne t'arrête pas aux murs, demi-tour et tu repars. Ton accès aux plans d'eau est réservé au swimrun spécifique."),
        det: "",
        steps: [Wm(200, "souple, mise en tenue"), Object.assign(Bd(1, Math.max(400, obj.longestSwimM), "sw.aero", "", " en continu, sans arrêt" + (owForLongSwim ? " (eau libre)" : " (bassin)"), false, "sw"), { bnd: { floor: Math.max(400, Math.round(obj.longestSwimM * 0.85)), cap: Math.round(obj.longestSwimM * 1.15) } }), Cm(150, "souple")] });
    } else {
      S2.push({ d: "sw", name: "Seuil CSS + plaquettes", note: "Le seuil se tient sur tous les 100 m : le dernier doit ressembler au premier. Les plaquettes viennent progressivement — elles tractent, mais elles chargent l'épaule." + (pad > 0 ? " Aujourd'hui : environ " + Math.round(pad * 100) + "% de la série avec plaquettes." : ""), det: "",
        steps: [Wm(300, "progressif + 4×50m éducatifs"), Object.assign(Bd(P(6, 10), 100, "sw.css", "15-20s", pad > 0 ? " dont ~" + Math.round(pad * 100) + "% avec plaquettes + pull buoy" : "", false, "sw"), { repCap: 11 }), Cm(200, "souple")] });
    }
  } else if (slot === "dur2") {
    // ---- Qualité COURSE : le terrain est du trail, l'impact compte ----
    if (inj.impact && (phase === "dev" || phase === "spec") && !kit.noVo2 && !medHold && !beginner) {
      // R5.4 — zone fragile à l'impact : la VO2max ne disparaît pas, elle change de SUPPORT.
      // Le swimrun n'a pas de vélo pour absorber l'intensité sans impact, mais il a l'eau — et
      // c'est même le support le plus spécifique des deux. Départs serrés : la difficulté vient
      // du temps de repos, pas de la vitesse pure.
      S2.push(vo2Swim());
    } else if (inj.impact) {
      S2.push({ d: "rn", name: "Seuil course (surface souple)", note: "Zone fragile déclarée : stimulus fort, sans vitesses maximales ni à-coups, sur surface souple.", det: "",
        steps: [W(15, "footing très facile"), B(P(2, 4), P(6, 10), "rn.thr", "2-3min trot", " sur surface souple"), C(10, "footing facile")] });
    } else if ((phase === "dev" || phase === "spec") && !kit.noVo2 && !medHold && !beginner) {
      // R4.8f (audit v7) — le module ne contenait AUCUN stimulus VO2/vitesse : `noVo2` et
      // « pas de VO2 en affûtage » y étaient donc des règles vides. Un swimrun se court à
      // allure d'endurance, mais la puissance aérobie maximale reste ce qui plafonne cette
      // allure — elle se travaille en phase de développement, courte et sur le terrain de la
      // course, pas sur piste.
      S2.push(vo2Trail());
    } else {
      S2.push({ d: "rn", name: "Seuil course sur sentier", note: "En swimrun on court sur des rochers, des racines et des sentiers, jambes mouillées et chaussures pleines d'eau. Cours ce seuil sur le terrain le plus proche de ta course, pas sur piste.", det: "",
        steps: [W(15, "footing progressif sur sentier"), B(P(3, 5), P(5, 9), "rn.thr", "2min trot"), C(10, "footing souple")] });
    }
  } else if (slot === "facileR") {
    // R4.2 (audit v7) — L'ENDURANCE COURSE NE SE FAIT PLUS VOLER SON CRÉNEAU. L'acclimatation au
    // froid remplaçait ce footing dès que l'eau passait sous 17 °C, c'est-à-dire pour la majorité
    // des courses européennes : ce n'était pas un cas limite, c'était le comportement par défaut.
    // Résultat mesuré : le plan allouait 43 % du temps à la course quand la course en demande
    // 68 % — un écart de 25 points, dans le sens qui pénalise le limiteur réel du sport.
    // Le froid consomme désormais un créneau NAGE (`facile2`).
    // S13 — PAS DE RÈGLE SYMÉTRIQUE ICI, et c'est mesuré : côté épreuve dominée par la NAGE
    // (45-53 % de course), le plan était déjà à 64 % — au-dessus de la course, jamais en
    // dessous, donc jamais le sens qui sous-entraîne. Basculer ce créneau en nage « pour la
    // symétrie » a été essayé et mesuré : la part de course tombait à 17 %. Une règle qu'aucun
    // défaut ne réclame est une règle qui en crée un.
    // S14 (R20.3) — LE FOOTING PORTE SES BORNES. Sans `bnd`, il était le seul bloc sans plafond
    // de la semaine, donc le déversoir de toutes les passes de remplissage : mesuré jusqu'à
    // 226 min, médiane 138-161 min, devant la pivot. Le plafond est RELATIF à la pivot de la
    // même semaine — en swimrun c'est elle qui tient le rôle de sortie longue.
    S2.push({ d: "rn", name: "Footing facile", note: "Endurance fondamentale, allure de conversation. En swimrun, courir avec des jambes fatiguées par la nage est la norme : ce volume facile construit cette tolérance — et la course représente la majorité du temps de ta course.", det: "",
      steps: [Object.assign(B(1, P(30, 55), "rn.easy", "", inj.impact ? " · surface souple" : " · sur sentier si possible"), { bnd: easyRunBounds(kit, obj.totalMinMid) })], ...({ plainBody: true }          ) });
  } else if (slot === "facile2") {
    // R4.3 (audit v7) — LE PLAFOND D'ACCÈS À L'EAU LIBRE EST UN NOMBRE, PAS UN BOOLÉEN.
    // `maxSessionsPerWeek` (3 / 1 / 0) n'était lu que comme `=== 0`. La pivot consomme le
    // premier quota de la semaine (c'est la séance prioritaire) : une seconde séance en eau
    // libre n'est donc possible qu'à partir d'un plafond de 2. En dessous, l'acclimatation se
    // fait en bassin froid ou en douche froide — et le plan le DIT.
    if (runDominant) {
      // S13 — ton épreuve court beaucoup plus qu'elle ne nage : ce second créneau facile,
      // qui était une nage de récupération, passe en course. La nage garde deux rendez-vous
      // par semaine (le créneau de qualité et la pivot) : elle ne disparaît jamais.
      // S14 (R20.3) — même borne que le premier créneau facile : c'est le MÊME rôle, et S13 en
      // a fait un second exemplaire. Le laisser sans plafond aurait rouvert le déversoir d'un
      // cran plus loin, exactement sur les épreuves course-dominantes que S13 sert.
      S2.push({ d: "rn", name: "Footing facile (endurance)", note: "Sur ton épreuve, la course représente " + Math.round(runShare * 100) + " % du temps total contre " + Math.round(obj.swimTimeShare * 100) + " % pour la nage : ce second créneau facile lui revient. Allure de conversation, sur le terrain le plus proche de ta course.", det: "",
        steps: [Object.assign(B(1, P(30, 50), "rn.easy", "", inj.impact ? " · surface souple" : " · sur sentier si possible"), { bnd: easyRunBounds(kit, obj.totalMinMid) })], ...({ plainBody: true }          ) });
    } else if (cold && !medHold) {
      const inOpenWater = owForCold;
      S2.push({ d: "sw", name: inOpenWater ? "Acclimatation eau froide" : "Acclimatation au froid (bassin / douche)",
        note: "L'acclimatation au froid est une qualité qui s'entraîne, pas une affaire de volonté : exposition régulière, temps dans l'eau allongé progressivement."
          + (inOpenWater
            ? " Jamais seul, toujours avec une sortie possible à vue."
            : " Ton accès aux plans d'eau est déjà pris par les séances prioritaires de la semaine : cette exposition se fait donc en bassin non chauffé, ou à défaut par des fins de douche froides de 2 à 3 min. C'est moins efficace, et c'est mieux que rien.")
          + (obj.waterTempC != null && obj.waterTempC < S7_COLD.wetsuitMandatoryBelowC ? " Sous " + S7_COLD.wetsuitMandatoryBelowC + " °C la combinaison est de toute façon obligatoire en course." : ""),
        det: "",
        steps: [Bd(1, Math.max(300, P(400, 1000)), "sw.easy", "", (inOpenWater ? " en eau libre" : " en bassin non chauffé") + ", temps d'exposition allongé progressivement", false, "sw")], ...({ plainBody: true }          ) });
    } else {
      S2.push({ d: "sw", recovery: true, name: "Nage récup + technique", note: "Récupération dans l'eau : relâchement total, respiration ample. C'est aussi le moment de refaire des éducatifs à froid, sans fatigue.", det: "",
        steps: [Bd(1, P(600, 1100), "sw.easy", "", " souple, éducatifs entre les séries", false, "sw")], ...({ plainBody: true }          ) });
    }
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
  // R4.2.4 (audit v7) — le créneau `facileR` apparaissait DEUX fois (Mer et Dim) et produisait
  // deux séances identiques dans la même semaine. Un même créneau deux fois, c'est soit une
  // variante, soit un doublon : ici c'était un doublon. La semaine tient en 5 séances, ce qui
  // correspond à la structure de référence des coachs (2 nages, 2 courses + le swimrun
  // spécifique), et le dimanche redevient un vrai jour de repos — un sport qui charge autant
  // les épaules que les jambes en a besoin.
  // Lun repos+renfo · Mar nage qualité · Mer footing · Jeu course qualité · Ven nage récup/froid
  // · Sam SWIMRUN spécifique · Dim repos
  return [
    { charge: "recup", slot: "recup" }, { charge: "dur", slot: "dur1" }, { charge: "facile", slot: "facileR" },
    { charge: "dur", slot: "dur2" }, { charge: "facile", slot: "facile2" }, { charge: "dur", slot: "durLong" },
    { charge: "off", slot: "off" },
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
  // R19.1 — LE MILIEU DE NAGE ET LE RELIEF ENTRENT ICI AUSSI.
  // Les deux questions étaient posées au questionnaire swimrun et au Profil, et ne changeaient
  // RIEN : ce module additionne trois postes qu'il met en forme lui-même (`fmtHM`), donc il ne
  // passait ni par `swimRange` ni par `runRange`, les deux seuls endroits où les corrections
  // étaient appliquées. Une question sans effet est une question qui ment sur ce qu'elle sert.
  // Elles s'appliquent POSTE PAR POSTE, puis se propagent au total — pas l'inverse : appliquer
  // une correction de nage au total reviendrait à ralentir aussi la course à pied.
  const bS = kit.legBands.swim, bR = kit.legBands.run;
  const swimLo = obj.swimMin * (bS ? bS[0] : 1), swimHi = obj.swimMin * (bS ? bS[1] : 1);
  const runLo = obj.runMin * (bR ? bR[0] : 1), runHi = obj.runMin * (bR ? bR[1] : 1);
  const deltaLo = (swimLo - obj.swimMin) + (runLo - obj.runMin);
  const deltaHi = (swimHi - obj.swimMin) + (runHi - obj.runMin);
  const bande = (lo        , hi        ) => (Math.round(lo) === Math.round(hi) ? fmtHM(lo) : fmtHM(lo) + "–" + fmtHM(hi));
  items.push({ leg: "Temps estimé", value: fmtHM(obj.totalMinLo + deltaLo) + "–" + fmtHM(obj.totalMinHi + deltaHi),
    why: obj.why + " · fourchette large assumée : sur cette épreuve, le terrain, l'eau et le binôme pèsent plus que la condition physique" + kit.swimWhy + kit.profWhy });
  items.push({ leg: "Dont nage", value: bande(swimLo, swimHi) + " (" + Math.round(obj.swimTimeShare * 100) + "% du temps)",
    why: "La nage pèse bien plus lourd en TEMPS qu'en distance : " + Math.round(obj.swimTotalM / 10) / 100 + " km nagés ne représentent qu'une fraction de la distance, mais un quart à un tiers du chrono" + kit.swimWhy + est });
  items.push({ leg: "Dont course", value: bande(runLo, runHi),
    why: "Terrain de trail, jambes mouillées, chaussures pleines d'eau : compte une allure nettement plus lente que sur route" + kit.profWhy + est });
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
  disciplines: ["sw", "rn"],
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
                                                                                 




// Import circulaire assumé (planGenerator importe buildDays) : IS_QUALITY_ZONE n'est lu qu'à
// l'exécution, jamais à l'initialisation du module — même motif que la porte médicale.

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
  // N2 — LE PLAN S'ARRÊTE LE JOUR DE LA COURSE.
  //
  // La dernière semaine était la semaine CALENDAIRE de la course : elle courait jusqu'au
  // dimanche, quel que soit le jour J. Une course un mercredi laissait quatre jours après
  // l'objectif, une course un lundi en laissait SIX — mesuré : 126 jours morts sur 42 plans
  // (6 sports × 7 jours possibles), soit trois par plan en moyenne. Le générateur les
  // remplissait de « Repos post-course », ce qui rendait le défaut invisible : le plan n'avait
  // pas l'air cassé, il avait l'air de finir en roue libre. Or un plan qui continue après son
  // objectif n'a plus d'objectif — c'est la préparation SUIVANTE, qui ne se décide pas ici.
  // On ne déplace PAS la grille (l'ancrage au lundi tient les libellés de jours et le départ
  // « cette semaine » de R8/R9) : on coupe la dernière semaine au soir de la course. Elle
  // devient une semaine courte de 1 à 7 jours — c'est la vérité de l'affûtage, pas un défaut.
  const raceTailDays = (() => {
    if (!a.race_date || r.raceBeyondPlan) return 0;
    const t = new Date(a.race_date + "T00:00:00Z").getTime();
    if (!isFinite(t)) return 0;
    return 6 - ((new Date(t).getUTCDay() + 6) % 7); // 0 = course un dimanche, 6 = un lundi
  })();
  const totalDays = r.weeks * 7 - raceTailDays;
  const days           = [];
  let cyc = 0, dic = cycleLen, sinceR = 0, sch            = [], isR = false;
  // Cycles de CHARGE consécutifs — c'est lui qui empêche une règle de placement de coûter
  // une semaine de charge de plus que la cadence de récupération de l'athlète (R18.5).
  let chargeStreak = 0;

  // R18.5 — LA CADENCE DE RÉCUPÉRATION IGNORAIT LES PHASES.
  //
  // Signalé au test sur un 70.3 : « 2 semaines de récup en spécifique ». La mesure a montré
  // plus large — sur 240 plans (7 sports × formats × historiques × 4 dates de course),
  // 75 % portaient une semaine de RÉCUP DANS LA PHASE PIC, et 75 % ouvraient une phase sur
  // une décharge. Une seule cause : `sinceR` comptait les cycles depuis la dernière récup,
  // globalement, sans jamais regarder où on se trouvait dans le plan.
  //
  // Deux conséquences, et la première est la plus chère. La phase PIC est plafonnée à trois
  // semaines (R13.6) : y poser une récup, c'est en perdre un tiers — et c'est redondant,
  // puisque l'affûtage qui suit immédiatement EST la décharge. La seconde est plus discrète :
  // entrer dans un nouveau bloc et le décharger aussitôt gâche le seul moment où le
  // changement de stimulus paie.
  //
  // On ne SUPPRIME aucune récupération — ce serait ajouter de la charge, et la santé passe
  // avant la progression. On les DÉPLACE : celle qui allait tomber dans le pic est anticipée
  // au dernier cycle du spécifique, celle qui ouvrait une phase glisse d'un cycle. Le nombre
  // de semaines de récupération d'un plan ne change pas ; leur position, si.
  // Deux décharges séparées par moins de deux cycles de charge, ce n'est plus une cadence,
  // c'est un trou. Les anticipations de C27b et C27c s'y arrêtent : plutôt renoncer à une
  // récupération (l'affûtage suit) que d'en empiler deux.
  const MIN_CHARGE_ENTRE_RECUPS = 2;
  const phaseOfWeek = (wk        ) => r.phases.find((p) => wk >= p.start && wk < p.end) || r.phases[4];
  const cyclesDansPic = Math.max(1, Math.ceil((r.phases.find((p) => p.id === "peak")?.weeks || 0) * 7 / cycleLen));
  for (let i = 0; i < totalDays; i++) {
    const w = Math.floor(i / 7);
    const ph = r.phases.find((p) => w >= p.start && w < p.end) || r.phases[4];
    if (dic >= cycleLen) {
      cyc++; dic = 0;
      isR = ph.id !== "taper" && sinceR >= r.recupEvery - 1;

      const pas = cycleLen / 7;
      const phaseSuivante = phaseOfWeek(w + pas)?.id;
      const phaseDApres = phaseOfWeek(w + 2 * pas)?.id;

      // C27a — une phase ne s'OUVRE jamais sur une décharge : entrer dans un bloc et le
      // décharger aussitôt gâche le seul moment où le changement de stimulus paie.
      // La récup est ANTICIPÉE au dernier cycle de la phase qui se termine, jamais REPORTÉE
      // au cycle suivant. La première écriture reportait, et la mesure a montré ce que ça
      // coûte : la plus longue série de semaines de charge consécutives passait de 4 à 5,
      // c'est-à-dire une semaine de charge de plus que la cadence de l'athlète — on ne paie
      // pas une question de placement en charge supplémentaire, la santé passe avant.
      // Anticiper, c'est fermer le bloc par sa décharge et ouvrir le suivant à neuf : c'est
      // aussi ce qu'un entraîneur écrit à la main.
      // LE GARDE QUI DOMINE LES TROIS RÈGLES. C27a/b/c savent toutes REFUSER une position ;
      // aucune n'a le droit de le faire au prix d'une semaine de charge de plus que la cadence
      // de l'athlète. Mesuré avant ce garde : un profil « reprise » (récup toutes les 3
      // semaines) enchaînait CINQ semaines de charge avant l'affûtage, parce que la récup due
      // à l'ouverture du pic était refusée par C27a puis par C27b, et que la fenêtre
      // d'anticipation était fermée. Le manifeste range la santé avant la progression et la
      // progression avant la performance : une règle de placement ne bat jamais la cadence.
      const peutRepousser = chargeStreak < r.recupEvery;
      // C27a — une phase ne s'OUVRE jamais sur une décharge : entrer dans un bloc et le
      // décharger aussitôt gâche le seul moment où le changement de stimulus paie.
      // La récup est ANTICIPÉE au dernier cycle de la phase qui se termine, jamais REPORTÉE
      // au cycle suivant. La première écriture reportait, et la mesure a montré ce que ça
      // coûte : la plus longue série de semaines de charge consécutives passait de 4 à 5,
      // c'est-à-dire une semaine de charge de plus que la cadence de l'athlète.
      // Anticiper, c'est fermer le bloc par sa décharge et ouvrir le suivant à neuf : c'est
      // aussi ce qu'un entraîneur écrit à la main.
      const ouvreUnePhase = w > 0 && phaseOfWeek(Math.max(0, w - pas)) !== ph;
      if (isR && ouvreUnePhase && peutRepousser) isR = false;
      if (!isR && ph.id !== "taper" && phaseSuivante && phaseSuivante !== ph.id && phaseSuivante !== "taper"
        && sinceR >= MIN_CHARGE_ENTRE_RECUPS && sinceR + 1 >= r.recupEvery - 1) isR = true;

      // C27b — AUCUNE récupération dans la phase PIC tant que l'affûtage peut en tenir lieu ;
      // elle est alors ANTICIPÉE au dernier cycle du spécifique. Le pic est la partie la plus
      // spécifique du plan et R13.6 le plafonne : y poser une décharge en coûte une fraction
      // entière, et la détente d'affûtage arrive de toute façon une semaine plus tard.
      // `cyclesDansPic <= r.recupEvery` est le garde-fou, et il SERT : sur les longues
      // préparations le pic monte à cinq semaines, et là il mérite vraiment sa récupération —
      // la règle se désactive d'elle-même, C27c prend le relais pour la placer correctement.
      // Ceci englobe l'ancien garde D2 (audit v6), qui ne protégeait le pic que lorsqu'il
      // tenait en une seule semaine.
      const picProtege = cyclesDansPic <= r.recupEvery;
      if (isR && ph.id === "peak" && picProtege && peutRepousser) isR = false;
      if (!isR && ph.id === "spec" && picProtege && phaseSuivante === "peak") {
        // Dernier cycle du spécifique. Une récup tomberait-elle dans le pic si on ne faisait
        // rien ? Au cycle j du pic (1..K), le compteur vaudra `sinceR + j` ; elle est due dès
        // que `sinceR + j >= recupEvery - 1`. Donc elle tombe dans le pic ssi
        // `sinceR + cyclesDansPic >= recupEvery - 1`.
        // `sinceR >= MIN_CHARGE_ENTRE_RECUPS` est la condition qui manquait à la première
        // écriture : sans elle, un plan dont le dernier cycle du spécifique suivait
        // immédiatement une récup en prenait une SECONDE d'affilée (mesuré : S20 puis S21 sur
        // un 70.3 de 26 semaines). Anticiper une décharge est utile ; en empiler deux ne l'est
        // jamais. Quand la condition n'est pas remplie, on n'anticipe pas et C27b laisse
        // simplement tomber la récup du pic : l'affûtage arrive derrière, il fait le travail.
        if (sinceR >= MIN_CHARGE_ENTRE_RECUPS && sinceR + cyclesDansPic >= r.recupEvery - 1) isR = true;
      }

      // C27c — une récupération ne se COLLE jamais à l'affûtage. Quand le pic est assez long
      // pour garder la sienne, elle tombait au choix sur son premier cycle (C27a s'en occupe)
      // ou sur le dernier — c'est-à-dire juste avant la détente d'affûtage, soit deux à trois
      // semaines de décharge d'affilée avant le départ, sur la fin de plan où la spécificité
      // est censée être maximale. Elle est donc anticipée d'un cycle : le dernier cycle avant
      // l'affûtage est toujours un cycle de CHARGE.
      // `phaseSuivante !== "taper"` est essentiel : sans lui, l'anticipation se déclenchait
      // sur le DERNIER cycle avant l'affûtage — exactement le cycle que la règle protège.
      // Une anticipation ne peut viser que le cycle d'AVANT.
      // Et C27c n'a pas le droit de rouvrir ce que C27b vient de fermer : dans un pic COURT
      // (celui que l'affûtage décharge), il n'y a pas de « meilleure place » pour une récup,
      // il n'y en a pas du tout. Sans cette exclusion, l'anticipation de C27c replaçait la
      // récup au milieu du pic de trois semaines — au bit près le défaut d'origine.
      const picSansRecup = ph.id === "peak" && picProtege;
      if (!isR && !picSansRecup && ph.id !== "taper" && phaseSuivante !== "taper" && phaseDApres === "taper"
        && sinceR >= MIN_CHARGE_ENTRE_RECUPS && sinceR + 1 >= r.recupEvery - 1) isR = true;
      else if (isR && ph.id !== "taper" && phaseSuivante === "taper" && peutRepousser) isR = false;

      if (isR) sinceR = 0; else sinceR++;
      // L'affûtage est lui-même une décharge : la série de charge repart de zéro en y entrant.
      chargeStreak = isR || ph.id === "taper" ? 0 : chargeStreak + 1;
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

  applyAvailability(r, days);
  applyPeakSignature(r, days);

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
  //
  // R20.9 (O-3) — LE REPLI ALTERNE, SINON N JOURS DÉCLASSÉS DONNENT N SÉANCES IDENTIQUES.
  //
  // `easyFallbackSlot` était appliqué tel quel à chaque jour déclassé. Sous drapeau médical,
  // c'est-à-dire quand TOUS les jours durs tombent d'un coup, la semaine livrait la même séance
  // trois ou quatre fois : mesuré **3 × « Marche rapide en montée (bâtons) »** en trail et
  // **4 × « Footing facile »** en swimrun — sur le sport dont la spécificité est justement
  // d'alterner nage et course. La passe de variété (`applyWeeklyVariety`) ne pouvait rien y
  // faire : tous ces jours portaient le MÊME créneau, elle n'avait pas d'autre séance à piocher.
  //
  // Le créneau déclaré reste le PRÉFÉRÉ — c'est le choix du module, et il passe en premier.
  // Le second créneau facile prend le relais un jour sur deux. La variété n'est pas un confort
  // ici : un plan de maintien qui répète la même sortie est un plan qu'on arrête de suivre.
  if (r.medHold) {
    const replis           = [mod.easyFallbackSlot, mod.easyFallbackSlot === "facile2" ? "facileR" : "facile2"];
    const stripLong = guard(sp          , "stripLongOnMedHold");
    let nRepli = 0;
    for (const d of days) {
      if (d.charge === "dur" && (d.slot === "dur1" || d.slot === "dur2" || (stripLong && d.slot === "durLong"))) {
        d.charge = "facile";
        d.slot = replis[nRepli++ % replis.length];
      }
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
  applyWeightLever(r, days, refs, hz, ctx);
  applyCyclePeriodisation(r, days, refs, hz, ctx);
  applyAntiCollage(r, days, refs, hz, ctx);
  applyPolarizationGuard(r, days, ctx, refs, hz);
  // R5.2 (audit v7 bis) — EN DERNIER : la couverture des disciplines tournait AVANT le budget
  // de séances et l'anti-collage, qui pouvaient retirer la séance qu'elle venait d'ajouter.
  // Une semaine d'affûtage de duathlon sortait ainsi sans une seule séance de course — et sans
  // avertissement. Un duathlon commence et finit à pied : c'est la discipline qu'on ne peut pas
  // ne pas toucher en affûtage.
  applyDisciplineCoverage(r, days, refs, hz, ctx);
  applySwimFrequency(r, days, refs, hz, ctx);
  applyVo2Coverage(r, days, refs, hz, ctx);
  applyWeeklyVariety(r, days, refs, hz, ctx);
  // R13.3 (suite) — le garde de polarisation REPASSE après les passes qui ajoutent des séances :
  // la couverture et la fréquence de nage installent une « Nage seuil » (sw.css) qu'il n'a
  // jamais vue — mesuré : 10 combinaisons tri repassaient sous le plancher de temps facile
  // (68-70 %). Huitième paiement de la même leçon : une garantie posée avant une passe qui
  // ajoute ne garantit que l'avant-dernier état.
  applyPolarizationGuard(r, days, ctx, refs, hz);
  return days;
}

/**
 * UN PLAN PORTE UN STIMULUS VO2 — et on le LIT, on ne le suppose pas.
 *
 * Les modules décident du support et du créneau (R5.4/R5.5), mais leur condition de bascule
 * était un PROXY : « si le budget est ≤ 4 séances, ou 3 jours bloqués, ou dispo week-end, alors
 * `dur2` ne survivra pas, donc la VO2 déménage dans `dur1` ». Un proxy ne voit que ce qu'on a
 * pensé à y mettre : sur une enveloppe de 4 h/sem en dispo « partielle », `dur2` ne survit pas
 * non plus, et le plan traversait 20 semaines sans une seule sollicitation de la puissance
 * aérobie maximale — celle qui plafonne l'allure d'endurance sur laquelle tout le reste se joue.
 *
 * Même leçon que partout ailleurs dans ce moteur : on ne DEVINE pas un état qu'on peut LIRE.
 * Cette passe tourne APRÈS le budget de séances, l'anti-collage et la couverture des
 * disciplines — donc sur la semaine telle qu'elle sera livrée. S'il manque le stimulus, un
 * créneau dur de la phase de développement est re-tagué `dur2` et sa séance reconstruite : le
 * module rend alors sa variante VO2 de lui-même. Une semaine sur deux, jamais plus.
 */
function applyVo2Coverage(r              , days          , refs      , hz         , ctx            )       {
  if (r.medHold || r.noVo2) return;
  const isVo2 = (d        ) =>
    d.sessions.some((s) => (s.steps || []).some((b) => b.role === "body" && /\.(vo2|speed)$/.test(String(b.zone || ""))));
  if (days.some(isVo2)) return; // le plan en a déjà : rien à forcer
  const devWeeks = [...new Set(days.filter((d) => d.phaseId === "dev" && !d.isR).map((d) => d.week))];
  for (const w of devWeeks) {
    if (w % 2 === 0) continue; // une semaine sur deux — le seuil garde l'autre
    const wd = days.filter((d) => d.week === w);
    const cand = wd.find((d) => d.charge === "dur" && !d.forced && d.slot !== "durLong" && d.slot !== "dur2");
    if (!cand) continue;
    const built = buildSessions(ctx, "dur2"                                       , cand.phaseId, cand.prog || 0, cand.week);
    if (!built.length) continue;
    cand.slot = "dur2";
    cand.sessions = built;
    for (const s of cand.sessions) if (s.steps && s.steps.length) renderSess(s, refs, hz, r.baseRefs);
    if (isVo2(cand)) continue;
    // Le module n'a pas de variante VO2 pour ce créneau : on remet la séance d'origine plutôt
    // que de laisser un `dur2` qui ne porte pas ce pour quoi on l'a posé.
    {
      cand.slot = "dur1";
      cand.sessions = buildSessions(ctx, "dur1"                                       , cand.phaseId, cand.prog || 0, cand.week);
      for (const s of cand.sessions) if (s.steps && s.steps.length) renderSess(s, refs, hz, r.baseRefs);
    }
  }
}

/**
 * R5.5 (audit v7 bis) — JAMAIS deux fois la même séance DE QUALITÉ dans la même semaine.
 *
 * Le cycle de 10 jours place deux créneaux `dur2` dans la même fenêtre calendaire : la
 * bibliothèque, sollicitée deux fois avec le même créneau et la même phase, rend deux fois la
 * séance IDENTIQUE (« Force basse cadence », « Seuil CSS + plaquettes »). Physiologiquement,
 * répéter une séance n'est pas une faute ; pédagogiquement, une carte affichée deux fois dit à
 * l'athlète que le plan ne le regarde pas — et deux blocs de seuil rigoureusement identiques
 * ne se justifient pas quand le créneau frère est libre.
 *
 * On cherche donc une VARIANTE (le créneau dur frère), et à défaut on allège : la seconde
 * occurrence redevient une séance facile. L'allègement va toujours dans le sens de la sécurité.
 * Les doublons FACILES sont laissés tels quels — deux footings faciles dans une semaine, c'est
 * un plan normal, pas un défaut.
 */
function applyWeeklyVariety(r              , days          , refs      , hz         , ctx            )       {
  const mod = sportModule(r.profile.sport          );
  const QUALITY_Z = /\.(vo2|thr|css|rp|ss|frc|speed|mara)$/;
  const isQual = (s           ) => (s.steps || []).some((b) =>
    b.role === "body" && (QUALITY_Z.test(String(b.zone || ""))
      || ["tr.vam", "tr.asc", "tr.climb", "tr.flatthr"].includes(String(b.zone || ""))
      || (b.reps || 1) > 1));
  for (let w = 1; w <= r.weeks; w++) {
    const seen = new Set        ();
    for (const d of days.filter((x) => x.week === w)) {
      for (let i = 0; i < d.sessions.length; i++) {
        const s = d.sessions[i];
        if (s.d === "rs" || !seen.has(s.name) || !isQual(s)) { seen.add(s.name); continue; }
        const alt = d.slot === "dur1" ? "dur2" : d.slot === "dur2" ? "dur1" : null;
        let done = false;
        if (alt) {
          const built = buildSessions(ctx, alt                                       , d.phaseId, d.prog || 0, d.week);
          const pick = built.find((x) => x.d !== "rs" && !seen.has(x.name));
          if (pick) {
            if (pick.steps && pick.steps.length) renderSess(pick, refs, hz, r.baseRefs);
            d.slot = alt; d.sessions[i] = pick; done = true;
          }
        }
        if (!done) {
          const built = buildSessions(ctx, mod.easyFallbackSlot                                       , d.phaseId, d.prog || 0, d.week);
          const pick = built.find((x) => x.d !== "rs");
          if (!pick) { seen.add(s.name); continue; }
          if (pick.steps && pick.steps.length) renderSess(pick, refs, hz, r.baseRefs);
          d.charge = "facile"; d.slot = mod.easyFallbackSlot; d.sessions[i] = pick;
        }
        seen.add(d.sessions[i].name);
      }
    }
  }
}



/**
 * D2 (banc v6) — LA SEMAINE DE PIC PORTE LA SÉANCE SIGNATURE.
 *
 * Mesuré : 8 configurations de triathlon sortaient avec une semaine de pic SANS BRICK. Cause :
 * le cycle de 10 jours glisse sur le calendrier, et une semaine de 7 jours peut ne contenir
 * aucun créneau `durLong` — exactement le mécanisme qui produisait les doublons de R5.5, vu
 * par l'autre bout. L'auditeur avait raison de le refuser : le brick EST le triathlon, la
 * sortie longue EST le plan d'endurance. Une semaine de pic sans elle n'est pas une semaine de
 * pic, c'est une semaine chargée.
 *
 * Le correctif agit en AMONT (sur les créneaux, avant construction des séances) pour que la
 * boucle de volume voie une semaine cohérente dès le départ : le second créneau de qualité
 * devient la longue. On échange une séance de seuil contre la séance qui donne son nom au
 * sport — sur la semaine la plus importante du plan, l'arbitrage n'est pas discutable.
 */
function applyPeakSignature(r              , days          )       {
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    // `isR` est posé par CYCLE, pas par semaine calendaire : sur un cycle de 10 jours, le
    // premier jour d'une semaine de charge peut être marqué récup. On lit la semaine entière,
    // comme le fait la couverture des disciplines — c'est la même leçon que R5.2.
    const isRecupWeek = wd.every((d) => d.isR);
    if (!wd.length || wd[0].phaseId !== "peak" || isRecupWeek) continue;
    if (wd.some((d) => d.slot === "durLong")) continue;
    // Le candidat : un jour DUR non bloqué (on ne crée pas de jour dur, on en requalifie un).
    // `dur2` d'abord — `dur1` porte la qualité principale du sport.
    const cand = wd.find((d) => d.slot === "dur2" && !d.forced) || wd.find((d) => d.charge === "dur" && !d.forced);
    if (!cand) continue;
    cand.slot = "durLong";
    cand.charge = "dur";
  }
}

/**
 * R11.7 — `dispo` AGIT ENFIN SUR LE PLAN.
 *
 * L'audit amont l'a mesuré : `quotidienne`, `semaine`, `partielle` et `weekend` donnaient
 * QUATRE PLANS STRICTEMENT IDENTIQUES, placement des jours compris. Quelqu'un qui déclarait
 * « week-end surtout » recevait le plan de quelqu'un de libre tous les jours. On lui posait la
 * question, on lui affichait que ça comptait, et ça ne changeait rien — c'est le genre de
 * mensonge qui coûte plus cher au produit que la fonctionnalité manquante.
 *
 * Deux effets, choisis parce qu'ils sont ceux qu'un entraîneur applique vraiment :
 *   1. le NOMBRE DE JOURS d'entraînement (`weekend` 3, `partielle` 5, sinon 7) — la contrainte
 *      première d'une vie réelle ; le volume, lui, reste piloté par la courbe, donc moins de
 *      jours donne des séances plus longues, jusqu'à ce que les plafonds parlent ;
 *   2. la SÉANCE LONGUE au week-end dès que la semaine est contrainte — une sortie longue un
 *      mardi soir n'existe pas, et la prescrire est la façon la plus sûre de faire décrocher.
 *
 * Cette passe ne touche QUE les créneaux et les charges : elle tourne avant la construction des
 * séances, donc rien n'est écrit deux fois et le reste du pipeline la voit comme une semaine
 * ordinaire.
 */
function applyAvailability(r              , days          )       {
  // U14 — LE DÉFAUT TACITE DE `dispo` ÉTAIT LE PLUS PERMISSIF DE SON DOMAINE.
  //
  // Mesuré en préparant le questionnaire court : un plan construit SANS réponse à « ta
  // disponibilité » est identique, au caractère près, à un plan `dispo: "quotidienne"` — la
  // valeur qui autorise le plus de jours d'entraînement. Quelqu'un qui saute la question
  // recevait donc le plan de quelqu'un qui peut s'entraîner tous les jours.
  //
  // Un défaut se choisit dans le sens de la sécurité, pas dans celui de la commodité de code.
  // `partielle` est la valeur médiane du domaine et celle qu'un inconnu a le plus de chances de
  // vivre. Et il est DÉCLARÉ dans le schéma (`fallback`), donc journalisé : R11.2 — « un défaut
  // tacite est un mensonge par omission ».
  const dispo = String(r.profile.dispo || "partielle");
  // « Week-end surtout » ne veut pas dire « uniquement le week-end » : deux jours de week-end
  // plus deux créneaux de semaine, c'est ce que fait réellement quelqu'un qui répond ça. À
  // trois jours, le plan perdait un stimulus entier (la VO2 en swimrun, le travail de côte en
  // duathlon montagneux) — mesuré au banc v7.
  const maxDays = dispo === "weekend" ? 4 : dispo === "partielle" ? 5 : 7;
  const longToWeekend = dispo === "weekend" || dispo === "semaine";
  if (maxDays >= 7 && !longToWeekend) return; // `quotidienne` : aucune contrainte à appliquer
  let moved = 0, cut = 0;
  // Ce qu'on GARDE, par ordre de priorité — raisonner en « quoi garder » plutôt qu'en « quoi
  // couper » évite de se retrouver avec trois jours durs et aucun jour facile : la sortie
  // longue est la séance qui fait le plan, puis une séance de qualité, puis du facile, puis la
  // seconde qualité. Le reste cède.
  const KEEP                         = { durLong: 0, dur1: 1, facileR: 2, dur2: 3, facile2: 4, recup: 5 };
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    if (longToWeekend) {
      const longDay = wd.find((d) => d.slot === "durLong" && !d.forced);
      const target = ["Sam", "Dim"].map((j) => wd.find((d) => d.jour === j && !d.forced)).find(Boolean);
      if (longDay && target && longDay !== target) {
        [longDay.charge, target.charge] = [target.charge, longDay.charge];
        [longDay.slot, target.slot] = [target.slot, longDay.slot];
        moved++;
      }
    }
    if (maxDays < 7) {
      const active = () => wd.filter((d) => d.charge !== "off" && !d.forced);
      // En « week-end surtout », les jours de semaine cèdent AVANT le samedi et le dimanche.
      const weekendBonus = (d        ) => (dispo === "weekend" && (d.jour === "Sam" || d.jour === "Dim") ? -10 : 0);
      for (let g = 0; g < 7 && active().length > maxDays; g++) {
        // La victime est le jour le MOINS prioritaire ; en « week-end surtout », samedi et
        // dimanche sont protégés par un bonus, ce sont eux qu'on garde.
        const victim = active().sort((x, y) => (KEEP[y.slot] ?? 3) + weekendBonus(y) - ((KEEP[x.slot] ?? 3) + weekendBonus(x)))[0];
        if (!victim) break;
        victim.charge = "off"; victim.slot = "off";
        cut++;
      }
    }
  }
  // Rien n'a bougé (le schéma de 7 jours pose déjà la longue au samedi) : on ne journalise pas
  // une décision qui n'a rien décidé. Une liste de décisions gonflée de non-événements se lit
  // moins bien qu'une liste courte et vraie.
  if (!moved && !cut) return;
  r.decisions.push({
    id: "R11-dispo", what: "Jours d'entraînement",
    val: (cut ? maxDays + " jour(s)/semaine" : "") + (cut && moved ? " · " : "") + (moved ? "sortie longue déplacée au week-end (" + moved + " semaine(s))" : ""),
    why: dispo === "weekend"
      ? "Tu as déclaré t'entraîner surtout le week-end : le plan concentre les séances qui comptent sur samedi et dimanche plutôt que d'en semer sept que tu ne feras pas"
      : dispo === "partielle"
        ? "Tu as déclaré 4-5 jours par semaine : le plan tient dans cette enveloppe, avec des séances plus longues plutôt qu'un calendrier qu'on ne suit pas"
        : "Tes journées de semaine sont contraintes : la sortie longue tombe au week-end, là où le temps existe vraiment",
  });
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
    let subsThisWeek = 0; // R5.5 — rang de la substitution DANS la semaine
    const runDays = wd.filter((d) => d.sessions.some((s) => s.d === "rn"));
    let over = runDays.length - cap;
    if (over <= 0) continue;
    const ordered = [...runDays.filter((d) => d.charge === "facile" && !d.forced), ...runDays.filter((d) => d.charge === "dur" && !d.forced)];
    for (let i = 0; i < ordered.length && over > 0; i++) {
      const d = ordered[i];
      if (canCross && (injImpact || d.charge === "dur")) {
        // R4.0 (audit v7) — POINT D'ENTRÉE UNIQUE. Ces séances étaient écrites en dur ici et
        // ne lisaient NI `medHold` NI `noVo2` : sous drapeau médical (« douleur thoracique à
        // l'effort », que le questionnaire présente comme non négociable), la passe de
        // réparation réinjectait 32 à 97 blocs au seuil APRÈS que les générateurs les aient
        // correctement retirés. Tant qu'une passe peut fabriquer une séance sans passer par
        // une fonction qui connaît les drapeaux, le garde-fou reste contournable par la
        // prochaine passe ajoutée — c'est la leçon structurelle, pas le symptôme.
        const s = crossTrainingSession(r, isTrail, d.charge === "dur", subsThisWeek++);
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
 * R4.6 (audit v7) — COUVERTURE DES DISCIPLINES. Mesuré avant correction : avec 3 jours OFF
 * déclarés, **46 semaines sur 59** d'un plan de duathlon ne contenaient AUCUNE séance de vélo —
 * le plan devenait un plan de course à pied, et ne le disait pas. Aucune contrainte n'imposait
 * la présence des deux disciplines : le schéma était simplement amputé par les jours bloqués.
 *
 * Deux issues, jamais le silence :
 *   1. il reste un jour facile → il change de discipline (le sport garde ses deux moteurs) ;
 *   2. l'enveloppe déclarée ne le permet pas → un AVERTISSEMENT le dit, avec le remède
 *      (format plus court, ou cycle de 10 jours).
 */
function applyDisciplineCoverage(r              , days          , refs      , hz         , ctx            )       {
  const mod = sportModule(r.profile.sport          );
  if (mod.disciplines.length < 2) return; // monodiscipline : rien à couvrir
  let impossible = 0;
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    // On LIT l'information au lieu de la deviner : compter les jours de repos confondait une
    // semaine d'affûtage avec une semaine de récupération, et l'exemptait de toute couverture.
    const isRecupWeek = wd.length > 0 && wd.every((d) => d.isR);
    const isTaper = wd[0]?.phaseId === "taper";
    if (isRecupWeek) continue; // récup : structure volontairement allégée
    // En affûtage, la couverture reste exigée pour la discipline PRINCIPALE au moins : le
    // volume baisse, la spécificité non.
    // R13.3 — et pour un sport qui COMMENCE par la natation (tri), la nage aussi : les
    // sensations d'eau se perdent en 10-14 jours, or l'affûtage en dure jusqu'à trois. Mesuré
    // avant : ZÉRO nage sur les 6 semaines d'affûtage d'un Full mono-séance — l'athlète se
    // présentait à un départ de 3,8 km en eau libre sans avoir nagé depuis un mois et demi.
    // (En doubles, la nage d'affûtage vit déjà sur le créneau dur1 : rien à couvrir.)
    // R13 — en affûtage aussi, TOUTES les disciplines du sport : ne garder que la principale
    // laissait la semaine de course d'un duathlon sans un coup de pédale (D-DISC, banc v7) —
    // et les sensations vélo se perdent comme les sensations d'eau. Le garde R5.2 ci-dessous
    // empêche la couverture de regonfler la décroissance : on couvre léger, on ne recharge pas.
    const required = mod.disciplines;
    const present = new Set        ();
    for (const d of wd)
      for (const s of d.sessions) {
        if (s.d === "rs") continue;
        if (s.d === "br") { for (const b of s.steps || []) if (b.leg) present.add(b.leg === "bike" ? "bk" : b.d || "rn"); present.add("bk"); present.add("rn"); }
        else present.add(s.d);
      }
    const missing = required.filter((x) => !present.has(x));
    if (!missing.length) continue;
    // Un jour facile non bloqué peut changer de discipline sans toucher à la structure dure.
    const donors = wd.filter((d) => !d.forced && d.charge === "facile" && d.sessions.some((s) => s.d !== "rs"));
    const pool = [...donors];
    let fixed = 0;
    for (const disc of missing) {
      // R13.3 — la nage d'affûtage se place au plus PRÈS de la course (fin de semaine) : le
      // rappel sert à garder les sensations pour le jour J, pas à occuper un lundi.
      const donor = disc === "sw" && isTaper ? pool.pop() : pool.shift();
      if (!donor) break;
      // La séance de remplacement passe par le point d'entrée unique (R4.0) : elle connaît les
      // drapeaux médicaux et d'âge. Le cross-training vélo EST la séance vélo facile.
      // R5.2 — en AFFÛTAGE, couvrir ne doit pas REGONFLER : la décroissance de l'affûtage est
      // une règle de sécurité (R3.13), la couverture une règle de complétude. La séance de
      // remplacement ne peut donc pas peser sensiblement plus que celle qu'elle remplace.
      const donorMin = donor.sessions.reduce((t, s) => t + (s.min || 0), 0);
      const tooHeavy = (s           ) => isTaper && donorMin > 0 && (s.min || 0) > donorMin * 1.15;
      if (disc === "bk") {
        const sess = crossTrainingSession(r, false, false);
        sess.name = "Endurance vélo (couverture discipline)";
        sess.note = "Ton enveloppe de jours laisse peu de place : cette sortie garantit qu'il reste au moins une séance de vélo dans la semaine. Un plan de duathlon sans vélo n'est pas un plan allégé, c'est un plan d'un autre sport.";
        renderSess(sess, refs, hz, r.baseRefs);
        if (tooHeavy(sess)) { pool.unshift(donor); continue; } // le donneur reste disponible pour la discipline suivante
        donor.sessions = [sess];
        fixed++;
      } else {
        const built = buildSessions(ctx, disc === "sw" ? "facile2" : "facileR", donor.phaseId, donor.prog || 0, donor.week);
        // R5.5 — ne jamais réinstaller une séance déjà présente cette semaine-là : la
        // reconstruction produisait un doublon exact (« Seuil CSS + plaquettes » deux fois).
        const already = new Set(wd.flatMap((x) => x.sessions.map((y) => y.name)));
        const pick = built.find((x) => x.d === disc && !already.has(x.name)) || built.find((x) => x.d === disc);
        if (!pick || already.has(pick.name)) { pool.unshift(donor); continue; }
        for (const x of built) if (x.steps && x.steps.length) renderSess(x, refs, hz, r.baseRefs);
        if (tooHeavy(pick)) { pool.unshift(donor); continue; }
        donor.sessions = [pick];
        fixed++;
      }
    }
    if (fixed < missing.length) impossible++;
  }
  if (impossible > 0) {
    r.warnings.push("Sur " + impossible + " semaine(s), ton enveloppe de jours disponibles ne permet pas de faire tenir toutes les disciplines de ce sport (jours bloqués + disponibilité déclarée). Le plan fait au mieux, mais deux options le rendraient meilleur : viser un format plus court, ou passer sur un cycle de 10 jours (Profil → disponibilité) pour espacer les séances clés au lieu de les entasser sur 7 jours.");
  }
}

/**
 * R13.3 (2e étage) — FRÉQUENCE DE NAGE EN MONO-SÉANCE. La couverture des disciplines garantit
 * UNE nage par semaine ; pour un sport dont la course commence dans l'eau, une seule exposition
 * hebdomadaire en spécifique/pic laisse les sensations s'éroder entre deux séances. Mesuré
 * avant : 1,0 nage/semaine sur tout le dev+spec+peak d'un Full mono-séance. Ici : une DEUXIÈME
 * nage en spécifique et pic (chaque semaine), en alternance une semaine sur deux en dev — le
 * donneur est un jour facile de course À PIED sans qualité, jamais la longue, jamais le créneau
 * C18. La 2e séance est la nage TECHNIQUE (la même que la phase base construit — une seule
 * bibliothèque, pas un deuxième chemin) : une principale + une technique, c'est la paire
 * qu'un entraîneur écrit.
 */
function applySwimFrequency(r              , days          , refs      , hz         , ctx            )       {
  if (!guard(r.profile.sport          , "swimRacePrepFrequency") || r.dbl || r.medHold) return;
  const isQuality = (s           ) => (s.steps || []).some((st) => IS_QUALITY_ZONE(String(st.zone || "")));
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    if (!wd.length || wd.every((d) => d.isR)) continue;
    const ph = wd[0].phaseId;
    if (ph !== "dev" && ph !== "spec" && ph !== "peak") continue;
    if (ph === "dev" && w % 2 === 0) continue; // dev : une semaine sur deux suffit à entretenir
    const swims = wd.reduce((t, d) => t + d.sessions.filter((s) => s.d === "sw").length, 0);
    if (swims >= 2) continue;
    const donor = wd.find((d) => !d.forced && d.charge === "facile"
      && d.sessions.length > 0
      && d.sessions.every((s) => s.d === "rn" && !s.long && !s.brick && !isQuality(s)));
    if (!donor) continue;
    // La technique est la séance que la bibliothèque construit pour la phase BASE : demander
    // « la nage facile de base » n'est pas un détournement, c'est exactement cette séance.
    const built = buildSessions(ctx, "facile2", "base", donor.prog || 0, donor.week);
    const already = new Set(wd.flatMap((x) => x.sessions.map((y) => y.name)));
    const pick = built.find((x) => x.d === "sw" && !already.has(x.name));
    if (!pick) continue;
    renderSess(pick, refs, hz, r.baseRefs);
    donor.sessions = [pick];
  }
}

/**
 * Séance de CROSS-TRAINING de substitution — le SEUL constructeur de séance des passes de
 * réparation (R4.0, audit v7). Il reçoit le plan raisonné, donc les drapeaux : neutralisation
 * médicale, interdiction de VO2 (mineur), blessures. Aucune passe ne doit écrire une séance
 * littérale : c'est ce qui a permis au drapeau médical d'être contourné.
 *
 * @param wantsVertical  trail : garder le stimulus vertical (côte) plutôt qu'un plat
 * @param wantsIntensity le jour remplacé était un jour DUR : on cherche un équivalent
 */
function crossTrainingSession(r              , wantsVertical         , wantsIntensity         , nth = 0)            {
  // R5.5 (audit v7 bis) — le point d'entrée unique produisait la MÊME séance à chaque appel :
  // deux jours de course en excès dans la semaine donnaient deux séances rigoureusement
  // identiques. Le rang dans la semaine fait varier le contenu — un athlète qui lit deux fois
  // la même carte pense (à raison) que le plan ne le regarde pas.
  if (nth >= 1 && !r.medHold) {
    // La variante fait varier le CONTENU, jamais la CHARGE : un deuxième remplacement plus long
    // rendrait le plan d'une blessure multiple plus lourd que celui d'une blessure unique
    // (mesuré au banc v6, B3). Même durée que l'endurance de référence, travail de cadence
    // en plus — c'est la lecture qui change, pas la dose.
    return {
      d: "bk", name: "Endurance vélo — travail de cadence (sans impact)",
      note: "Deuxième remplacement de la semaine : même durée que l'autre, mais on y ajoute de la cadence. Alterne 5 min à cadence haute (95-100 tr/min) et 5 min à cadence libre, tout du long, en endurance. Le geste travaille pendant que les tissus de la course récupèrent.",
      det: "",
      steps: [{ role: "body", durationMin: 55, zone: "bk.z2", intensity: intOf("bk.z2")                      }],
      ...({ plainBody: true }          ),
    }             ;
  }
  // 1. Drapeau médical : AUCUNE intensité, quelle que soit la raison du remplacement.
  //    « Un mauvais plan vaut mieux qu'un plan dangereux » (manifeste).
  if (r.medHold) {
    return {
      d: "bk", name: "Cross-training vélo très souple (avis médical en attente)",
      note: "Tu as signalé un symptôme à l'effort : aucune intensité n'est générée avant le feu vert d'un médecin. Ce vélo reste en endurance basse, tu dois pouvoir tenir une conversation complète. Si le moindre symptôme apparaît, tu t'arrêtes.",
      det: "",
      steps: [{ role: "body", durationMin: 45, zone: "bk.z2", intensity: intOf("bk.z2")                      }],
      ...({ plainBody: true }          ),
    }             ;
  }
  // 2. Trail : le stimulus qui compte est le VERTICAL, sans impact ni descente. L'intensité
  //    suit les mêmes règles que partout ailleurs (seuil si autorisé, tempo sinon).
  if (wantsVertical) {
    const zone = wantsIntensity && !r.noVo2 ? "bk.thr" : "bk.ss";
    return {
      d: "bk", name: "Cross-training vélo en côte (sans impact)",
      note: "Ton plafond de jours d'appui est atteint : ce vélo garde le travail en montée — le muscle et le cardio progressent — sans ajouter d'impact ni de descente. C'est le meilleur échange possible aujourd'hui."
        + (r.noVo2 ? " Intensité tenue en tempo : la VO2max attendra la majorité." : ""),
      det: "",
      steps: [
        { role: "warmup", durationMin: 15, text: "progressif, sur le plat" },
        { role: "body", reps: 4, durationMin: 8, zone, intensity: intOf(zone)                     , repCap: 5, recoveryText: "4min souple en descente", text: "en côte, assis, cadence 60-70" }          ,
        { role: "cooldown", durationMin: 10, text: "souple" },
      ],
    }             ;
  }
  // 3. Jour dur remplacé : équivalent d'intensité sans impact — VO2 si autorisée, seuil sinon.
  if (wantsIntensity) {
    const zone = r.noVo2 ? "bk.thr" : "bk.vo2";
    return {
      d: "bk", name: "Cross-training vélo (intensité)",
      note: (r.noVo2
        ? "Intervalles vélo au seuil — l'intensité sans impact, et sans VO2max : à ton âge, la puissance aérobie maximale se construit plus tard, le seuil suffit largement."
        : "Intervalles vélo — équivalent VO2 sans impact, maintient la puissance aérobie pendant que le tissu se répare."),
      det: "",
      steps: [
        { role: "warmup", durationMin: 15, text: "progressif" },
        { role: "body", reps: r.noVo2 ? 3 : 5, durationMin: r.noVo2 ? 8 : 3, zone, intensity: intOf(zone)                     , repCap: r.noVo2 ? 4 : 6, recoveryText: "3min souple" }          ,
        { role: "cooldown", durationMin: 10, text: "souple" },
      ],
    }             ;
  }
  // 4. Jour facile remplacé : endurance pure.
  return {
    d: "bk", name: "Cross-training vélo",
    note: "Zéro impact : le stimulus aérobie est conservé pendant que les tissus de la course récupèrent.",
    det: "",
    steps: [{ role: "body", durationMin: 55, zone: "bk.z2", intensity: intOf("bk.z2")                      }],
    ...({ plainBody: true }          ),
  }             ;
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
    // 2. puis des journées entières, dans l'ordre de ce qu'on peut le mieux perdre.
    // Les journées de RÉCUPÉRATION d'abord : elles COMPTAIENT dans le budget (`totalSessions`)
    // sans jamais pouvoir le payer (`activeNow` les excluait). Un jour de récup survivait donc
    // au détriment du seul créneau de qualité de la semaine — mesuré sur un swimrun à 4 h/sem :
    // une nage récup de 16 min conservée, et le plan traversait 20 semaines sans stimulus VO2
    // (`S-NOVO2`, banc v7). Une séance de récupération est la PREMIÈRE à céder quand le budget
    // manque, pas la dernière : ce qu'elle apporte, un jour de repos l'apporte aussi.
    if (over > 0) {
      const rec = wd.filter((d) => d.charge === "recup" && !d.forced && d.sessions.some((s) => s.d !== "rs"));
      for (let i = rec.length - 1; i >= 0 && over > 0; i--) { over -= nSess(rec[i]); toOff(rec[i]); }
    }
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



/**
 * R11.7 — `cycle_sync` AGIT ENFIN. Voir `src/engine/cycleModel.ts` pour ce que dit (et ne dit
 * pas) la littérature : l'effet moyen de la phase sur la performance est TRIVIAL, la
 * variabilité entre personnes est grande. On ne touche donc pas au VOLUME — la courbe reste la
 * courbe — on touche au PLACEMENT : sur une semaine majoritairement prémenstruelle, la SECONDE
 * séance de qualité redevient une séance facile. Une seule, jamais les deux : supprimer
 * l'intensité d'une semaine entière sur une donnée de calendrier serait aussi faux que
 * l'ignorer.
 *
 * L'athlète garde le dernier mot : la question est révocable, et l'effet disparaît avec elle.
 */
function applyCyclePeriodisation(r              , days          , refs      , hz         , ctx            )       {
  const cyc = readCycle(r.profile);
  if (!cyc.active) return;
  const mod = sportModule(r.profile.sport          );
  let touched = 0, deja = 0;
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    if (!weekIsLateLuteal(cyc, wd.map((d) => d.date || "").filter(Boolean))) continue;
    // Récup et affûtage sont DÉJÀ allégés : rien à déplacer. Ce cas est fréquent et il mérite
    // d'être dit — avec un cycle proche de 28 jours, la fenêtre prémenstruelle tombe souvent
    // pile sur la semaine de décharge. C'est une bonne nouvelle, pas un raté du moteur.
    if (wd[0]?.isR || wd[0]?.phaseId === "taper") { deja++; continue; }
    // La SECONDE qualité seulement : `dur2`. `dur1` et la longue restent — c'est ce qui fait
    // la semaine, et rien ne justifie de les retirer.
    const target = wd.find((d) => d.slot === "dur2" && !d.forced && d.charge === "dur");
    if (!target) continue;
    const built = buildSessions(ctx, mod.easyFallbackSlot                                       , target.phaseId, target.prog || 0, target.week);
    const pick = built.find((x) => x.d !== "rs");
    if (!pick) continue;
    renderSess(pick, refs, hz, r.baseRefs);
    pick.note = "Semaine prémenstruelle : cette séance de qualité devient une séance facile. Ce n'est pas une baisse de niveau — c'est que la thermorégulation et la perception de l'effort sont moins favorables sur ces quelques jours, et qu'une séance dure y coûte plus cher qu'elle ne rapporte. Le volume de la semaine, lui, ne bouge pas. Si tu te sens très bien, fais-la dure : tu es la seule à pouvoir en juger."
      + (pick.note ? " " + pick.note : "");
    target.charge = "facile"; target.slot = mod.easyFallbackSlot; target.sessions = [pick];
    touched++;
  }
  r.decisions.push({
    id: "R11-cycle", what: "Périodisation sur ton cycle",
    val: touched + " semaine(s) prémenstruelle(s) allégée(s) d'une séance de qualité"
      + (deja ? " · " + deja + " tombai(en)t déjà sur une semaine de décharge" : ""),
    why: "Tu as demandé à caler le plan sur ton cycle. L'effet du cycle sur la performance est en moyenne FAIBLE et très variable d'une personne à l'autre : le plan ne prétend donc pas savoir comment tu te sens. Il déplace seulement l'intensité hors de la fenêtre prémenstruelle, sans toucher au volume — et tu peux passer outre n'importe quel jour",
  });
}

/**
 * R11.7 — `weight_lever` AGIT SUR LE PLAN, sans jamais devenir une injonction.
 *
 * L'audit amont l'a relevé : la réponse était déclarée, affichée dans une carte de règle, et
 * sans le moindre effet. Le câbler pose une question de fond, parce que la frontière du
 * manifeste est nette : **jamais de cible d'apport, jamais de régime, jamais de poids visé.**
 * Ce qui reste — et qui est de l'entraînement, pas de la diététique :
 *
 *   1. le RENFORCEMENT est garanti chaque semaine de charge. La masse musculaire est le
 *      déterminant de la dépense de repos ; c'est aussi ce qu'un déficit énergétique attaque en
 *      premier. C'est une prescription d'entraînement, pas un conseil alimentaire ;
 *   2. une séance FACILE de plus en phase de base quand le budget le permet — le volume à
 *      faible intensité est le levier de composition corporelle le mieux établi, et le seul qui
 *      ne coûte rien en fraîcheur.
 *
 * Ce que la passe ne fait JAMAIS : réduire les glucides, parler de kilos, ni transformer une
 * séance de qualité en séance « brûle-graisses » — cette notion n'a pas de sens et sert surtout
 * à vendre des plans.
 */
function applyWeightLever(r              , days          , refs      , hz         , ctx            )       {
  if (String(r.profile.weight_lever || "non") !== "oui") return;
  let added = 0, extra = 0;
  for (let w = 1; w <= r.weeks; w++) {
    const wd = days.filter((d) => d.week === w);
    if (wd[0]?.isR || wd[0]?.phaseId === "taper") continue;
    const hasStrength = wd.some((d) => d.sessions.some((s) => /Renfo|Gainage|Force max|Plio/.test(s.name)));
    if (!hasStrength) {
      const host = wd.find((d) => d.charge === "facile" && !d.forced && d.sessions.some((s) => s.d !== "rs"));
      if (host) {
        host.sessions.push({ d: "rs", name: "+ Renfo général",
          det: "20min en fin de séance : squats, fentes, gainage, tirage — 💡 Tu as choisi de travailler le poids comme levier. Le renforcement est ce que l'entraînement peut faire pour toi de plus utile ici : il protège la masse musculaire, qui est le principal déterminant de ta dépense au repos. Le reste (l'assiette) se décide avec un professionnel, pas avec une application.",
          steps: [] });
        added++;
      }
    }
    // 2. FRÉQUENCE de facile en phase de base : à volume hebdomadaire égal (la courbe ne bouge
    //    pas), le même temps réparti sur une séance de plus est plus soutenable et plus
    //    favorable à la composition corporelle qu'une séance longue de plus. C'est le seul
    //    autre levier que l'entraînement possède ici.
    if (wd[0]?.phaseId === "base") {
      const nSess = wd.reduce((t, d) => t + d.sessions.filter((s) => s.d !== "rs").length, 0);
      const free = wd.find((d) => !d.forced && d.charge === "off" && !d.sessions.some((s) => s.d !== "rs"));
      if (free && nSess < (r.budgetPerWeek ?? 7)) {
        const slot = sportModule(r.profile.sport          ).easyFallbackSlot;
        const built = buildSessions(ctx, slot                                       , free.phaseId, free.prog || 0, free.week);
        const pick = built.find((x) => x.d !== "rs");
        if (pick) {
          renderSess(pick, refs, hz, r.baseRefs);
          free.charge = "facile"; free.slot = slot; free.sessions = [pick];
          extra++;
        }
      }
    }
  }
  r.decisions.push({
    id: "R11-poids", what: "Levier poids : ce que le plan fait",
    val: "renforcement garanti en semaine de charge" + (added ? " (+" + added + " greffe(s))" : "")
      + (extra ? " · +" + extra + " séance(s) facile(s) en phase de base, à volume égal" : ""),
    why: "Tu as choisi de travailler le poids comme levier. Le plan agit là où l'ENTRAÎNEMENT agit — renforcement et volume facile — et nulle part ailleurs : aucune cible d'apport, aucun régime, aucun poids visé. Cette frontière ne bougera pas",
  });
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
                                                                                                          













/**
 * Une zone de QUALITÉ — source unique. Le prédicat vivait en local dans `scaleBlock` (V2.2 :
 * un bloc de qualité ne grandit pas tout seul) ; C13d en a besoin aussi, et deux copies d'une
 * définition, c'est deux définitions. `.mara` = allure de COURSE : 15×2000m au marathon, ce
 * n'est pas du volume facile.
 */
const QUALITY_SUFFIX = /\.(vo2|thr|css|rp|ss|frc|speed|mara)$/;
const QUALITY_TRAIL = ["tr.vam", "tr.asc", "tr.climb", "tr.flatthr"];
/**
 * R11.1 — UNE SEULE DÉFINITION DE « EN PENTE ». `flat` EST UNE VALEUR DE `gradient`, PAS SON
 * ABSENCE. En trail, tout bloc en porte une ; tester `!st.gradient` exclut donc le footing PLAT,
 * c'est-à-dire précisément le bloc que R4.1 désigne pour absorber du volume. Je l'ai écrit ainsi
 * du premier coup et la passe I14b est sortie inerte — receveuses vides sur les 41 semaines.
 */
/**
 * I14b — jusqu'où une séance FACILE peut absorber ce que le plafond de libellé a retiré, en
 * part de la sortie longue de la semaine. 0,80 laisse la pivot visiblement pivot : au-dessus,
 * la semaine porte deux sorties longues sans le dire ; en dessous, le remplissage ne sert plus
 * à rien sur les semaines où il n'existe qu'une seule receveuse.
 */
const I14B_EASY_VS_LONG = 0.8;

const EN_PENTE = (st                       )          =>
  st.gradient === "up" || st.gradient === "down" || st.gradient === "rolling";

const IS_QUALITY_ZONE = (zone        )          =>
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
function reconcileDeclaredVolume(
  plan        , warnings          ,
  /** Rendu : nécessaire pour que le texte d'une séance RÉDUITE ne mente pas sur sa durée. */
  render                         ,
  /** Contexte des règles de SÉANCE tenues ici : la fenêtre piscine dépend du niveau.
   *  `keepTaperSwim` (R13.3) : le sport déclare que l'affûtage garde une nage par semaine —
   *  les coupes de fréquence l'évitent tant qu'une autre victime existe. */
  ctx                                                                                                                                           
                                                                                         
                                                                                        
                                                                                   
                                                                             
                                 
                                                                                    
                                                                                                
                                                                                      
                                                         ,
)       {
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
  /**
   * I14b — CE QUE LE PLAFOND DE LIBELLÉ RETIRE, PAR SEMAINE. Renseigné par `enforceLabelVsDose`,
   * consommé par `refillEasyAfterLabelCap` : sans ce compte, la semaine perd des minutes que
   * plus aucune passe ne sait lui rendre (voir la justification complète sur la fonction).
   */
  const _labelCut = new Map                ();
  const MIN_WORTH_MIN = 15;
  const dayMin = (d       ) => d.sessions.reduce((u, sx) => u + (sx.min || 0), 0);
  const weekMinOf = (wk        ) => wk.days.reduce((t, d) => t + dayMin(d), 0);
  const weekH = (wk        ) => Math.round((weekMinOf(wk) / 60) * 10) / 10;

  // C25 / I11 / I14 — LES GARANTIES DE SÉANCE PRÉCÈDENT LES GARANTIES DE SEMAINE.
  // (Définition et justification plus bas, à `enforceLabelVsDose`.) Elle RÉDUIT des séances :
  // la laisser tourner après « dev ≤ pic » abaissait des semaines de pic déjà validées et
  // rouvrait l'inversion de périodisation sur 4 combinaisons de trail. Une semaine ne peut pas
  // être vérifiée sur un contenu qui va encore changer.
  enforceLabelVsDose();
  // I14b — et ce qu'elle vient de retirer retourne aux séances faciles (O-20). Ici, PAS en fin
  // de course : les garanties hebdomadaires qui suivent (T2/T2b, C22, C26c) doivent voir la
  // semaine telle qu'elle sera livrée, pas un état intermédiaire qu'on regonflera après elles.
  refillEasyAfterLabelCap();

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
    const stepsOfWeek = (wk        ) => wk.days.flatMap((d) => d.sessions).flatMap((sx) => sx.steps || []);
    const upOf = (wk        ) => stepsOfWeek(wk).reduce((t, st) => t + (st.dplusM || 0) * (st.reps || 1), 0);
    const downOf = (wk        ) => stepsOfWeek(wk).reduce((t, st) => t + (st.dmoinsM || 0) * (st.reps || 1), 0);
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
  const enforceC22Final = ()          => {
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
              const floor = (st                                ).bnd?.floor;
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
    const wm = (wk        ) => weekMinOf(wk);
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
            const floor = (st                                ).bnd?.floor;
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
        const dayMinOf = (d       ) => d.sessions.reduce((t, sx) => t + (sx.min || 0), 0);
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
    const swimMetersOf = (sx           ) =>
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
          const floor = (st                                ).bnd?.floor;
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
        const soleSwim = (d       ) => d.sessions.some((s) => s.d === "sw")
          && !wk.days.some((o) => o !== d && o.sessions.some((s) => s.d === "sw"));
        let spared = ctx?.keepTaperSwim ? active.filter((d) => !soleSwim(d)) : active;
        // R13 — même orientation que toutes les autres coupes : le seul jour qui porte la
        // DISCIPLINE PRINCIPALE est épargné tant qu'une autre victime existe. Sans ça, la 2e
        // semaine d'affûtage d'un duathlon sortait 100 % vélo (D-DISC, banc v7) — un duathlon
        // commence et finit à pied.
        for (const md of (ctx?.disciplines || (ctx?.mainDiscipline ? [ctx.mainDiscipline] : []))) {
          const covers = (d       ) => d.sessions.some((s) => s.d === md || (s.d === "br" && (s.steps || []).some((b) => b.leg === (md === "rn" ? "run" : "bike"))));
          const sole = (d       ) => covers(d) && !wk.days.some((o) => o !== d && covers(o));
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

  // R5.3 — L'AFFÛTAGE DÉCROÎT, POINT. La décroissance était jusqu'ici ÉMERGENTE (courbe + coupe
  // R3.13) : sur un cycle de 10 jours, la dérive des créneaux d'une semaine calendaire à l'autre
  // pouvait rendre la 3ᵉ semaine d'affûtage plus lourde que la 2ᵉ (147→98→123→88 mesuré, banc v6
  // D10). Une règle de sécurité ne doit pas dépendre d'un effet de bord : elle s'énonce et se
  // vérifie ici, en dernier, quelle que soit la passe qui a bougé une durée avant.
  {
    // R15.7-A — LA DÉCROISSANCE NE DESCEND PAS SOUS LE PLANCHER DE LA SEMAINE DE COURSE.
    // Deux règles spécifient la même quantité : la décroissance (chaque semaine d'affûtage ≤ la
    // précédente) et le plancher R13.6-P3 (semaine de course ≥ 30 % du pic). Elles se
    // contredisent dès que l'affûtage part de bas — et jusqu'ici la décroissance gagnait en
    // silence, en RETIRANT les séances que le plancher venait de poser quelques lignes plus
    // haut. Le plancher devient donc une borne BASSE de la décroissance : on décroît jusqu'à
    // lui, jamais en dessous. Bosquet 2007 situe l'affûtage à −41/−60 % du volume de pic ;
    // descendre à −73 % n'est plus de l'affûtage, c'est de l'arrêt.
    const lastW = plan.weeks[plan.weeks.length - 1];
    const isRaceW = lastW && (plan.races || []).some((rc) => lastW.days.some((d) => d.date === rc.date && d.sessions.some((s) => s.race)));
    const peakForFloor = Math.max(0, ...plan.weeks.filter((w) => w.phase.id === "peak").map(weekMinOf));
    const raceFloor = isRaceW && peakForFloor > 0 ? peakForFloor * 0.30 : 0;
    // C29 — L'AFFÛTAGE COUPE LE VOLUME, PAS LA FRÉQUENCE.
    //
    // Bosquet 2007 — la source que ce fichier cite déjà deux fois — décrit l'affûtage par TROIS
    // bras : volume −41/−60 %, **intensité maintenue**, **fréquence maintenue à ≥ 80 %**. Seul
    // le premier était vérifié (R3.13). La décroissance ci-dessous retire des JOURS, et elle
    // exclut de ses victimes la sortie longue et le brick — donc elle coupait exactement le
    // bras qu'il faut garder et gardait exactement celui qu'il faut couper.
    //
    // Mesuré avant : **fréquence médiane 67 % du pic, 9 profils sur 15 sous 80 %** (marathon
    // inter : 3 séances contre 5). Et la sortie longue ne baissait que de 21 % quand la semaine
    // baissait de 54 % — un marathonien recevait 4 jours OFF et **2 h 21 de sortie longue huit
    // jours avant sa course**. Ce n'est pas un affûtage, c'est une semaine de repos avec une
    // sortie longue posée dessus.
    //
    // Le correctif ne touche pas la cible de volume : la décroissance décroît autant qu'avant.
    // Il change la MONNAIE — sous le plancher de fréquence, on réduit les séances au lieu d'en
    // supprimer une. La réduction est proportionnelle et atteint la sortie longue, qui cesse
    // d'être un sanctuaire.
    const peakDays = Math.max(0, ...plan.weeks.filter((w) => w.phase.id === "peak")
      .map((w) => w.days.filter((d) => d.sessions.some((s) => s.d !== "rs" && !s.race)).length));
    const freqPlancher = peakDays > 0 ? Math.ceil(peakDays * 0.8) : 0;
    let prev = Infinity;
    for (const wk of plan.weeks) {
      if (wk.phase.id !== "taper") continue;
      /** Réduction proportionnelle de TOUTE la semaine — les répétitions d'abord (leçon I14 :
       *  dans un intervalle, la durée EST le stimulus), la durée ensuite. */
      const reduire = (f        ) => {
        for (const d of wk.days) for (const sx of d.sessions) {
          if (sx.d === "rs" || sx.race || !sx.steps) continue;
          if (/Déverrouillage/i.test(sx.name)) continue; // R15.7-B — jamais la veille
          for (const st of sx.steps) {
            if (st.role !== "body") continue;
            if ((st.reps || 1) > 1) st.reps = Math.max(1, Math.floor((st.reps || 1) * f));
            else if (st.durationMin) st.durationMin = Math.max(5, Math.round(st.durationMin * f));
            else if (st.distanceM) st.distanceM = Math.max(150, Math.round((st.distanceM * f) / 25) * 25);
          }
          if (render) render(sx);
        }
      };
      const floorHere = raceFloor > 0 ? raceFloor : 0;
      for (let g = 0; g < 6 && weekMinOf(wk) > prev && weekMinOf(wk) > floorHere; g++) {
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
        // R15.7-B — LE DÉVERROUILLAGE DE LA VEILLE N'EST JAMAIS UNE VICTIME.
        // C'est la séance la plus COURTE de la semaine de course (17 min) : la décroissance,
        // qui retire « la plus petite », la choisissait donc systématiquement. Mesuré : 12
        // configurations sur 648 arrivaient au départ après TROIS à CINQ jours sans rien.
        // Exactement le mécanisme de R13.4 (la course à `min: 0` était devenue la victime
        // idéale) — une séance courte par CONCEPTION doit être protégée comme telle, sinon
        // toute règle « retirer la plus petite » la supprime. R13.4-C2 plafonnait la veille
        // à 25 min sans jamais exiger qu'elle existe : un plafond sans plancher.
        let cand = active.filter((d) => !d.sessions.some((s) => s.long || s.brick || /Déverrouillage|avant course/i.test(s.name)));
        if (!cand.length) cand = active.filter((d) => !d.sessions.some((s) => s.long || s.brick));
        // R13 — même orientation que partout : ne pas orpheliner une discipline du sport.
        // Et si TOUTE victime en orphelinerait une (2 jours actifs, 2 disciplines), on ne
        // retire plus : on RÉDUIT — la décroissance est servie, la spécificité aussi.
        let orphanOnly = false;
        for (const md of (ctx?.disciplines || [])) {
          const covers = (d       ) => d.sessions.some((s) => s.d === md || (s.d === "br" && (s.steps || []).some((b) => b.leg === (md === "rn" ? "run" : "bike"))));
          const sole = (d       ) => covers(d) && !wk.days.some((o) => o !== d && covers(o));
          const cand2 = cand.filter((d) => !sole(d));
          if (cand2.length) cand = cand2;
          else if (cand.some(sole)) orphanOnly = true;
        }
        // C29 — sous le plancher de fréquence, on RÉDUIT au lieu de RETIRER. Même geste que la
        // branche orpheline ci-dessous, pour une raison voisine : quand supprimer coûterait plus
        // que la décroissance ne rapporte, c'est la taille qui cède, pas le nombre de jours.
        const sousLePlancher = freqPlancher > 0 && active.length - 1 < freqPlancher;
        if ((orphanOnly || sousLePlancher) && prev > 0) {
          reduire(Math.max(0.5, (prev * 0.95) / weekMinOf(wk)));
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
  // R15.7-A — LE PLANCHER PASSE APRÈS LA DÉCROISSANCE, et c'est tout le correctif.
  // Il vivait AVANT : il posait ses séances, puis la décroissance les retirait quelques
  // lignes plus bas — le plancher était donc écrit, exécuté, et sans effet. Dixième fois
  // que ce dépôt paie la leçon du point de convergence. La décroissance, elle, ne descend
  // plus sous ce plancher (borne basse ajoutée ci-dessus) : les deux règles cessent de se
  // contredire au lieu de se départager en silence.
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
      const peakDeliv0 = Math.max(0, ...plan.weeks.filter((w) => w.phase.id === "peak").map(weekMinOf));
      // C28 — LE PLANCHER SE PRORATISE À LA LONGUEUR RÉELLE DE LA SEMAINE.
      //
      // N2 coupe la dernière semaine au soir du jour J : une course un mercredi laisse TROIS
      // jours. Le plancher, lui, réclamait 30 % du pic sans regarder cette longueur — et il
      // n'y a que deux jours pour le porter, dont la veille plafonnée à 25 min (R13.4). Tout
      // atterrissait sur le seul jour restant : mesuré, **156 min à J-2 d'un marathon, 168 à
      // J-2 d'une cyclosportive**.
      //
      // Le signe qui ne trompe pas : la relation était NON MONOTONE. Une semaine de 3 jours
      // portait 2,9 h, une de 7 jours 2,3 h — plus la semaine est courte, plus elle est
      // chargée. L'exact inverse d'un affûtage.
      //
      // Le prorata se calcule sur les jours D'ENTRAÎNEMENT (la course n'en est pas un, R13.4)
      // rapportés à une semaine pleine. Il ne change RIEN à une course le dimanche, qui est le
      // cas de très loin le plus fréquent — c'est exactement ce qu'on veut d'un correctif de
      // ce genre : il ne mord que là où le défaut vit.
      const joursUtiles = Math.max(0, last.days.length - 1);
      const prorata = Math.min(1, joursUtiles / 6);
      const peakDeliv = peakDeliv0 * prorata;
      const hors = () => last.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.race ? 0 : s.min || 0), 0), 0);
      if (peakDeliv > 0 && hors() < peakDeliv * 0.30) {
        // R15.7-A — la convergence était coupée à 3 tours : les caps de C13/C13e bornent chaque
        // pas, donc trois multiplications ne suffisaient pas à atteindre le plancher (mesuré :
        // 104 min pour une cible de 115). La boucle s'arrête sur l'absence de progrès
        // (`touched`), pas sur un compteur arbitraire ; la borne haute reste là contre une
        // pathologie, pas comme critère d'arrêt.
        for (let g = 0; g < 12 && hors() < peakDeliv * 0.30; g++) {
          const f = Math.min(2, (peakDeliv * 0.32) / Math.max(1, hors()));
          if (f <= 1.02) break;
          let touched = false;
          for (const d of last.days)
            for (const sx of d.sessions) {
              // Jamais la LONGUE ni le brick : regonfler la sortie longue en semaine de course
              // contredirait l'affûtage — et sans bornes de bloc, elle repassait au-dessus de
              // C23 (sortie CAP débutant > 3 h, régression D7 du banc v6).
              if (sx.race || sx.d === "rs" || !sx.steps || sx.long || sx.brick || /Déverrouillage/.test(sx.name)) continue;
              const corps = sx.steps.filter((x) => x.role === "body")
                .reduce((t, x) => t + (x.durationMin ? (x.reps || 1) * x.durationMin : 0), 0);
              // C13e s'exprime aussi en MÈTRES en bassin : sans cette borne, l'échauffement
              // de nage grossissait sans limite (mesuré : « Rappel nage course » à 64 min en
              // semaine de course — un rappel qui dure plus longtemps que la séance qu'il
              // rappelle n'est plus un rappel).
              const corpsM = sx.steps.filter((x) => x.role === "body")
                .reduce((t, x) => t + (x.distanceM ? (x.reps || 1) * x.distanceM : 0), 0);
              for (const st of sx.steps) {
                // R15.7-A — LES PARTIES FACILES DES RAPPELS PORTENT LE PLANCHER.
                // Mesuré : 291/648 configurations sous 30 % du pic, parce que la semaine de
                // course ne contient QUE des rappels (race-pace, nage CSS, allure course) —
                // tous porteurs d'une zone de qualité, donc tous sautés par la règle U-DOSE.
                // Aucun bloc n'était éligible, `touched` restait faux, et le plancher déclaré
                // en R13.6-P3 n'était jamais atteint : un invariant énoncé mais jamais vérifié
                // sur la matrice. La dose de qualité reste intouchable (c'est elle qui réveille
                // sans fatiguer) ; ce qui s'allonge, c'est l'échauffement et le retour au calme —
                // exactement ce qu'un entraîneur rallonge dans une semaine de course trop creuse.
                if (st.role === "warmup" || st.role === "cooldown") {
                  // C13e reste au-dessus : l'échauffement ne dépasse jamais le corps ; C13 borne
                  // à 25 min. Le retour au calme suit la même borne haute.
                  const capW = st.role === "warmup" ? Math.min(25, corps || 25) : 25;
                  if (st.durationMin) {
                    const v = Math.min(capW, Math.round(st.durationMin * f));
                    if (v > st.durationMin) { st.durationMin = v; touched = true; }
                  } else if (st.distanceM) {
                    const capM = st.role === "warmup" ? (corpsM || st.distanceM) : Math.max(corpsM * 0.5, st.distanceM);
                    const v = Math.min(capM, Math.round((st.distanceM * f) / 25) * 25);
                    if (v > st.distanceM) { st.distanceM = Math.round(v / 25) * 25; touched = true; }
                  }
                  continue;
                }
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
      // R15.7-A — SI ALLONGER NE SUFFIT PAS, UN JOUR OFF REDEVIENT DE L'ENDURANCE ALLÉGÉE.
      // C'est la promesse écrite dans R13.6-P3 (« les jours OFF redeviennent de l'endurance
      // allégée dans la limite du budget déclaré ») — elle n'existait qu'à l'INSERTION de la
      // course, donc AVANT la décroissance d'affûtage et les coupes de budget qui vident la
      // semaine ensuite. Une garantie vérifiée au milieu du pipeline ne vérifie que
      // l'avant-dernier état : neuvième fois que ce dépôt paie cette leçon.
      const budget = ctx?.sessionsMaxDeclared || 0;
      // La COURSE ne consomme pas un créneau d'entraînement : depuis R13.4 elle vaut `min: 0`
      // et sort de la charge. La compter dans le budget saturait la semaine à elle seule et
      // interdisait le seul rattrapage disponible — la même confusion « la course est une
      // séance » qui avait déjà coûté l'Ironman supprimé par une coupe d'affûtage.
      const nSess = () => last.days.reduce((t, d) => t + d.sessions.filter((s) => s.d !== "rs" && !s.race).length, 0);
      const raceIdx = last.days.findIndex((d) => d.sessions.some((s) => s.race));
      // R15.1 — LE RATTRAPAGE COMBLE D'ABORD UN TROU DE DISCIPLINE.
      // Mesuré en variant le jour de la course (O-1) : 112 semaines d'affûtage de duathlon sans
      // le moindre coup de pédale, dont 108 en semaine de course. La cause tenait au choix de
      // la discipline du rattrapage : il prenait la discipline PRINCIPALE, qui vaut « rn » en
      // duathlon — celle qui était déjà présente. Un plan de duathlon dont la dernière semaine
      // ne contient que de la course n'est pas un plan de duathlon, et l'athlète monte sur son
      // vélo le jour J sans l'avoir touché depuis dix jours.
      const dispos = ctx?.disciplines || [];
      const presente = (dd        ) => last.days.some((d) => d.sessions.some((s) => s.d === dd
        || (s.d === "br" && (s.steps || []).some((b) => b.leg === (dd === "rn" ? "run" : "bike")))));
      const manquante = dispos.find((dd) => !presente(dd));
      const mainD = manquante || ctx?.mainDiscipline || "rn";
      const dz = mainD === "sw" ? "sw.easy" : mainD === "bk" ? "bk.z2" : "rn.easy";
      for (const d of last.days) {
        if (peakDeliv <= 0 || hors() >= peakDeliv * 0.30) break;
        if (budget > 0 && nSess() + 1 > budget) break;      // le budget déclaré tient (U-SESSBUDGET)
        const i = last.days.indexOf(d);
        // `forced` = jour d'indisponibilité DÉCLARÉ par l'athlète (U-OFF, banc v7). Un plancher
        // de volume ne fabrique jamais une séance un jour où la personne a dit qu'elle ne
        // pouvait pas : la contrainte de vie passe avant la contrainte d'entraînement.
        if ((d          ).forced) continue;
        if (raceIdx >= 0 && i >= raceIdx - 1) continue;     // ni la veille, ni le jour J
        if (d.sessions.some((s) => s.d !== "rs")) continue; // seulement les jours vides
        const manque = peakDeliv * 0.32 - hors();
        const sx            = { d: mainD        , name: "Endurance allégée (semaine de course)", det: "",
          note: "Semaine de course : on entretient le moteur sans le fatiguer. Allure strictement facile, arrêt net à la durée — la fraîcheur du jour J se construit aussi en continuant de bouger.",
          steps: [{ role: "body", durationMin: Math.max(25, Math.min(60, Math.round(manque))), zone: dz }          ] };
        d.charge = "facile"; d.slot = "facileR"; d.sessions = [sx];
        if (render) render(sx);
      }
      // R15.1 — COUVERTURE DES DISCIPLINES EN SEMAINE DE COURSE, indépendamment du plancher.
      // Le rattrapage ci-dessus ne se déclenche que si le VOLUME manque. Or une semaine peut
      // tenir son plancher et n'être composée que d'une seule discipline : mesuré, 102 semaines
      // d'affûtage de duathlon sans un coup de pédale, dont 98 en semaine de course. Monter sur
      // son vélo le jour J sans l'avoir touché depuis dix jours n'est pas un détail de
      // couverture, c'est une sensation qu'on n'a pas réveillée.
      // Quand la place manque VRAIMENT (semaine de 1-2 jours, budget saturé), on ne force pas :
      // on le DIT, avec la formulation que l'auditeur externe reconnaît.
      for (const dd of dispos) {
        if (presente(dd)) continue;
        const dzz = dd === "sw" ? "sw.easy" : dd === "bk" ? "bk.z2" : "rn.easy";
        const libre = last.days.find((d, i) => !(d          ).forced && !(raceIdx >= 0 && i >= raceIdx - 1)
          && !d.sessions.some((s) => s.d !== "rs"));
        if (libre && !(budget > 0 && nSess() + 1 > budget)) {
          const sx            = { d: dd        , name: "Rappel " + (dd === "bk" ? "vélo" : dd === "sw" ? "nage" : "course") + " (semaine de course)", det: "",
            note: "Semaine de course : on réveille la discipline, on ne la travaille pas. Court, strictement facile — arriver le jour J sans avoir touché à l'une des disciplines coûte des sensations, pas de la forme.",
            steps: [{ role: "body", durationMin: 30, zone: dzz }          ] };
          libre.charge = "facile"; libre.slot = "facileR"; libre.sessions = [sx];
          if (render) render(sx);
        } else if (!warnings.some((w) => /ne permet pas de faire tenir toutes les disciplines/.test(w))) {
          warnings.push("La dernière semaine est trop courte pour faire tenir toutes les disciplines : "
            + "ton enveloppe ne permet pas de faire tenir toutes les disciplines avant le jour J. "
            + "Ce n'est pas grave si tu as roulé la semaine d'avant — mais si tu peux, ajoute 20 à 30 min "
            + "très faciles dans la discipline manquante deux jours avant la course.");
        }
      }
      // C28b — LA FENÊTRE D'APPROCHE EST RE-APPLIQUÉE ICI, ET C'EST TOUT LE CORRECTIF.
      //
      // Les plafonds des jours qui précèdent la course (J-1 ≤ 25 min, J-2/J-3 ≤ 62) EXISTENT
      // depuis N3/N4 — mais cette passe tourne pendant la CONSTRUCTION, avant le plancher
      // ci-dessus et avant la mise à l'échelle finale. Vérifié en bisectant : la séance de
      // rattrapage était créée à 30 min et ressortait à **156**. Elle n'était pas fabriquée
      // trop grosse, elle était GROSSIE après coup.
      //
      // Onzième fois que ce dépôt paie la même leçon (R13.6-A1 sur C22, R15.7-A sur ce plancher
      // exact, I14 sur les garanties de séance) : **une garantie vérifiée au milieu du pipeline
      // ne vérifie que l'avant-dernier état.** Le plafond ne se déplace pas, il se REJOUE au
      // point fixe. Aucun nouveau chiffre : `RACE_EVE_CAP_MIN` et le facteur 2,5 sont ceux de
      // N3/N4, lus au même endroit (R11.1).
      for (const rc of plan.races || []) {
        const ix = last.days.findIndex((d) => d.date === rc.date && d.sessions.some((s) => s.race));
        if (ix < 0) continue;
        const prep = rc.prio === "A" ? 3 : 1;
        for (let k = 1; k <= prep; k++) {
          const d = last.days[ix - k];
          if (!d) continue;
          const capMin = k === 1 ? RACE_EVE_CAP_MIN : Math.round(RACE_EVE_CAP_MIN * 2.5);
          for (const sx of d.sessions) {
            if (sx.d === "rs" || sx.race || !sx.steps || (sx.min || 0) <= capMin) continue;
            // On RÉDUIT, on ne reconstruit pas : la séance garde son identité (discipline, nom,
            // note) et perd seulement ce qui l'a fait grossir. Reconstruire ici écraserait le
            // déverrouillage de la veille, que R15.7-B protège justement contre les passes
            // tardives.
            const facteur = capMin / (sx.min || capMin);
            for (const st of sx.steps) {
              if (st.durationMin) st.durationMin = Math.max(1, Math.round(st.durationMin * facteur));
              if (st.distanceM) st.distanceM = Math.max(25, Math.round((st.distanceM * facteur) / 25) * 25);
            }
            sx.long = false;
            sx.brick = false;
            if (render) render(sx);
          }
        }
      }
    }
  }

  // C29c — L'AFFÛTAGE REND LES JOURS QU'IL A PRIS POUR RIEN.
  //
  // Décision du fondateur (03/08/2026) : l'affûtage réduit le VOLUME, pas la FRÉQUENCE.
  // Bosquet 2007 et Mujika — la source déjà citée ici pour le +1,96 % — décrivent trois bras :
  // volume −41/−60 %, intensité maintenue, **fréquence ≥ 80 %**. Seul le premier était vérifié.
  //
  // Les deux passes qui retirent un jour d'affûtage le font tant que la semaine dépasse le
  // plafond R3.13. Elles ont raison AU MOMENT où elles s'exécutent — mais les passes suivantes
  // réduisent encore, et le jour a été sacrifié pour rien. Mesuré sur un semi : semaine
  // d'affûtage livrée à **46 % du pic** (plafond : 60 %) avec DEUX jours coupés. Sur 90 profils
  // comparables, 76 des 95 jours perdus portaient le nom de cette coupe.
  //
  // C'est la forme exacte de C28 — une décision prise au milieu du pipeline sur un état qui va
  // encore changer. On ne touche donc pas aux passes : on RÉPARE AU POINT FIXE, là où le plan
  // ne bougera plus. Le rendu ne peut pas violer R3.13 : on ne redonne que la marge qui reste
  // sous le plafond, et jamais plus.
  //
  // Ce qu'on ne restitue JAMAIS : un jour que l'athlète a déclaré indisponible, un jour de repos
  // du gabarit (« Repos / mobilité »), le garde-fou d'impact (« OFF (récup impact) »), et la
  // semaine de course — elle a ses propres règles (R13.4/R15.7).
  {
    const picJours = Math.max(0, ...plan.weeks.filter((w) => w.phase.id === "peak" && !w.isRecup)
      .map((w) => w.days.filter((d) => d.sessions.some((s) => s.d !== "rs" && (s.min || 0) > 0)).length));
    const picMin = Math.max(0, ...plan.weeks.filter((w) => w.phase.id === "peak" && !w.isRecup).map(weekMinOf));
    const plancherFreq = picJours > 0 ? Math.ceil(picJours * 0.8) : 0;
    if (plancherFreq > 0 && picMin > 0) for (const wk of plan.weeks) {
      if (wk.phase.id !== "taper") continue;
      if (wk.days.some((d) => d.sessions.some((s) => s.race))) continue; // R13.4 possède la semaine de course
      const actifs = () => wk.days.filter((d) => d.sessions.some((s) => s.d !== "rs" && (s.min || 0) > 0)).length;
      const dz = ctx?.mainDiscipline === "sw" ? "sw.easy" : ctx?.mainDiscipline === "bk" ? "bk.z2" : "rn.easy";
      const cible = Math.min(weekMinOf(wk), picMin * R313_TAPER_MAX_VS_PEAK);
      // FILET : la restitution DOIT pouvoir se payer. Les planchers de step (10 min de corps,
      // C13c/C13e sur l'échauffement) empêchent parfois la semaine de redescendre à sa cible
      // après l'ajout — mesuré : **35 combinaisons sur 459 au-dessus de R3.13** avec la
      // première écriture. R3.13 est une règle de SÉCURITÉ ; on ne la négocie pas contre une
      // règle de qualité. On photographie donc la semaine avant, et on se RÉTRACTE si le
      // rééquilibrage n'aboutit pas. Un jour rendu qui coûte la fraîcheur du jour J n'est pas
      // un jour rendu, c'est une régression.
      const avant = wk.days.map((d) => ({ d, charge: d.charge, slot: d.slot, sessions: d.sessions.map((s) => structuredClone(s)) }));
      let rendus = 0;
      for (const d of wk.days) {
        if (actifs() >= plancherFreq) break;
        if ((d          ).forced) continue;
        const nom = d.sessions[0] && d.sessions[0].name;
        if (!/^OFF \(affûtage/.test(String(nom || ""))) continue;
        // 25 min : c'est un jour d'ENTRETIEN, pas un jour d'entraînement. En dessous de 20, une
        // séance ne vaut pas le déplacement (MIN_WORTH_MIN) ; au-dessus de 40, on rajoute de la
        // charge dans un affûtage, ce qui est l'inverse de ce qu'on cherche.
        const sx            = { d: (ctx?.mainDiscipline || "rn")        , name: "Entretien (affûtage)", det: "",
          note: "Affûtage : le volume descend, la fréquence reste. Une sortie courte et strictement facile entretient le geste et la circulation — ce qu'on gagne maintenant, c'est de la fraîcheur, pas de la forme.",
          steps: [{ role: "body", durationMin: 25, zone: dz }          ] };
        d.charge = "facile"; d.slot = "facileR"; d.sessions = [sx];
        if (render) render(sx);
        rendus++;
      }
      // NEUTRE EN VOLUME, et c'est le cœur de la décision. On ne redonne pas des minutes : on
      // redonne des JOURS, et les minutes viennent des séances déjà là. La semaine retrouve
      // exactement le total qu'elle avait (ou le plafond R3.13 si elle le dépassait), répartie
      // sur plus de jours plus courts — c'est la définition de l'affûtage de Bosquet/Mujika.
      // Jamais le déverrouillage de la veille (R15.7-B), jamais la course.
      if (rendus > 0 && weekMinOf(wk) > cible) {
        const f = cible / weekMinOf(wk);
        for (const d of wk.days) for (const sx of d.sessions) {
          if (sx.d === "rs" || sx.race || !sx.steps || /Déverrouillage/i.test(sx.name)) continue;
          for (const st of sx.steps) {
            if (st.role !== "body") continue;
            if ((st.reps || 1) > 1) st.reps = Math.max(1, Math.round((st.reps || 1) * f));
            else if (st.durationMin) st.durationMin = Math.max(10, Math.round(st.durationMin * f));
            else if (st.distanceM) st.distanceM = Math.max(150, Math.round((st.distanceM * f) / 25) * 25);
          }
          if (render) render(sx);
        }
      }
      // La vérification, et la rétractation si elle échoue. Tolérance 1 min (F3 : les durées
      // rendues sont arrondies à la minute entière).
      if (rendus > 0 && weekMinOf(wk) > picMin * R313_TAPER_MAX_VS_PEAK + 1) {
        for (const snap of avant) { snap.d.charge = snap.charge; snap.d.slot = snap.slot; snap.d.sessions = snap.sessions; }
      }
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
    const EASY_ZONE                         = { rn: "rn.easy", bk: "bk.z2" };
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
  function enforceLabelVsDose()       {
    const totalOf = (sx           ) => (sx.steps || []).reduce((t, st) => t + (st._min || 0), 0);
    const metersOf = (sx           ) => (sx.steps || []).reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
    const shrinkTo = (sx           , capMin        )       => {
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
          const enPente = EN_PENTE(st);
          if (enPente) {
            // On arrondit à l'INFÉRIEUR, contrairement aux blocs plats : sur un axe de charge
            // qui casse en premier, une répétition de trop ne se rattrape pas la semaine
            // suivante. `round` laissait d'ailleurs passer le dernier cas mesuré (3 répétitions
            // × 0,84 → 3 : la passe tournait sans rien réduire).
            if ((st.reps || 1) > 2) {
              const next = Math.max(2, Math.floor((st.reps || 1) * f));
              if (next < (st.reps || 1)) { st.reps = next; touched = true; }
              continue;
            }
            // I14 (3e passe, R20.6) — UN BLOC EN PENTE **CONTINU** SE RÉDUIT AUSSI, À CONDITION
            // DE RÉDUIRE SON DÉNIVELÉ AU MÊME PRORATA.
            //
            // La 2e passe (I14) avait raison d'interdire de raboter la DURÉE seule : l'athlète
            // gravirait les mêmes 400 m en moins de temps, une vitesse ascensionnelle qu'il ne
            // peut pas produire. Mais elle en avait tiré « on ne touche pas », et son propre
            // commentaire assumait le résidu — mesuré par le banc d'invariants : **« Marche
            // rapide en montée (bâtons) » à 295 min pendant que la « Sortie longue trail » du
            // même athlète est plafonnée à 180** (C23, débutant). La séance qui donne son nom à
            // la semaine n'était plus la plus longue, sur le sport où la sortie longue est LA
            // séance de référence.
            //
            // Ce qui était interdit, c'est de changer la VITESSE. Réduire durée et dénivelé du
            // même facteur la laisse strictement identique : c'est la même montée, plus courte.
            // Le plancher de 20 min protège ce qui reste d'être une séance sans objet.
            if ((st.durationMin || 0) > 20) {
              const next = Math.max(20, Math.round((st.durationMin || 0) * f));
              if (next < (st.durationMin || 0)) {
                const g = next / (st.durationMin || 1);
                st.durationMin = next;
                if (st.dplusM) st.dplusM = Math.max(20, Math.round((st.dplusM * g) / 10) * 10);
                if (st.dmoinsM) st.dmoinsM = Math.max(20, Math.round((st.dmoinsM * g) / 10) * 10);
                touched = true;
              }
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
          if ((sx.min || 0) > (lg.min || 0)) {
            const avant = sx.min || 0;
            shrinkTo(sx, lg.min || 0);
            _labelCut.set(wk.num, (_labelCut.get(wk.num) || 0) + Math.max(0, avant - (sx.min || 0)));
          }
        }
      }
    }
  }

  /**
   * I14b — CE QUE LE PLAFOND DE LIBELLÉ RETIRE, LA SEMAINE LE RÉCUPÈRE SUR SES SÉANCES FACILES.
   *
   * LE DÉFAUT (O-20). En trail, un DÉBUTANT recevait un pic hebdomadaire plus lourd qu'un INTER
   * — 575 min contre 547, et sur le D+ aussi (1 130 m contre 860). L'invariant I13 (« plus
   * l'athlète est fort, plus la charge est élevée ») était rouge, et il avait raison.
   *
   * La chaîne, mesurée pas à pas :
   *   1. la courbe déclare 600 min pour l'inter, et R3.3 les livre — la semaine sort de sa
   *      boucle à **603 min**. La courbe n'a jamais été en cause ;
   *   2. `enforceLabelVsDose` applique I14 (« la sortie longue est la plus longue de sa
   *      semaine ») et ramène « Descente en charge » de **210 à 159 min** ;
   *   3. **plus aucune passe ne rend ces 51 minutes.** La semaine finit à 551, puis 547.
   *
   * ET POURQUOI LE DÉBUTANT Y ÉCHAPPE — c'est le cœur de l'affaire. Le plafond que I14 impose
   * aux autres séances EST la durée livrée de la sortie longue. Celle du débutant est épinglée
   * à 180 min par **C23, un plafond de SÉCURITÉ** ; celle de l'inter, libre, s'arrête à 167. Le
   * débutant hérite donc du plafond le PLUS HAUT, ne se fait rien retirer, et passe devant.
   * **Un plafond de sécurité qui augmente la charge de celui qu'il protège** : il ne se
   * rembourse pas (l'hypothèse C23b, mesurée et réfutée), il déplace le plafond d'une autre
   * règle.
   *
   * LA FORME DU DÉFAUT EST CONNUE, DANS L'AUTRE SENS. Ce dépôt a payé onze fois « une garantie
   * vérifiée au milieu du pipeline ne vérifie que l'avant-dernier état » (R15.7-A, C28, I14
   * elle-même…) et la réponse a toujours été de REJOUER la garantie au point fixe. Ici c'est
   * le miroir : une garantie de SÉANCE retire des minutes APRÈS la boucle de volume, et c'est
   * la BOUCLE qui n'est jamais rejouée. Le remède est le même — rendre la main à ce qui a été
   * défait.
   *
   * OÙ VONT LES MINUTES : R4.1 l'a déjà tranché — « le déversement de volume va vers les
   * séances FACILES, jamais vers un bloc de qualité ». On ne touche donc QUE des blocs plats et
   * non-qualité :
   *   · pas la sortie longue (la gonfler pour tenir une promesse serait ajouter du volume) ;
   *   · pas un bloc en pente — les axes verticaux ont leurs propres courbes (T2/T2b), qui se
   *     re-clampent juste après : leur donner des mètres ici serait leur en reprendre là ;
   *   · pas un bloc de qualité (repCap, R4.1) ni une séance de récupération (C25) ;
   *   · jamais au-delà de la sortie longue de la semaine, sinon I14 recouperait ce qu'on rend ;
   *   · jamais au-delà de ce que la COURBE annonce : on rend ce qui a été retiré, on n'ajoute
   *     pas une minute que l'athlète n'avait pas déjà acceptée.
   */
  function refillEasyAfterLabelCap()       {
    // « DEV ≤ PIC » EST UNE RÈGLE DE PÉRIODISATION, ET ELLE VAUT AUSSI POUR CE QU'ON REND.
    //
    // Mesuré, et c'est ma propre passe qui l'a créé : sur un 10 km de six semaines dont la
    // courbe DÉCROÎT (S1 déclarée à 120 min, phase de pic plus basse — un défaut de courbe
    // indépendant, qui vaut à ce profil une violation dure dans les deux états), remplir
    // fidèlement chaque semaine amplifiait l'inversion. La boucle de réparation coupait alors
    // la semaine 1 de l'athlète CAPABLE (107 min) pendant que le témoin plus lent gardait ses
    // 120 — l'inversion de niveau que je suis précisément en train de corriger, recréée trois
    // profils plus loin (banc v6, `O17`).
    //
    // La règle existe déjà : l'auditeur refuse qu'une semaine de base ou de développement
    // dépasse la meilleure semaine de pic. Elle n'était vérifiée qu'APRÈS, par la boucle de
    // réparation — donc mon remplissage lui donnait du travail au lieu de la respecter. On la
    // lit au moment où l'on agit : onzième application de « une garantie qui tourne après la
    // mutation ne vérifie que l'avant-dernier état », cette fois à ma propre passe.
    const picLivre = Math.max(0, ...plan.weeks
      .filter((wk) => wk.phase.id === "peak" && !wk.isRecup)
      .map((wk) => weekMinOf(wk)));
    for (const wk of plan.weeks) {
      const cut = _labelCut.get(wk.num) || 0;
      if (cut <= 0) continue;
      const cur = weekMinOf(wk);
      let cible = Math.round((wk.vol || 0) * 60);
      // Une semaine hors pic ne remonte jamais au-dessus du pic LIVRÉ (5 % de tolérance : la
      // borne de l'auditeur, pas une seconde définition).
      if (picLivre > 0 && wk.phase.id !== "peak" && wk.phase.id !== "taper")
        cible = Math.min(cible, Math.round(picLivre * 1.05));
      // Le manque est borné par les DEUX : ce que le plafond a pris, et ce qui reste sous la
      // courbe. La semaine ne remonte jamais au-dessus de ce qu'elle annonce.
      let manque = Math.min(cut, cible - cur);
      if (manque <= 1) continue;
      const all = wk.days.flatMap((d) => d.sessions).filter((sx) => sx.d !== "rs" && sx.steps && sx.steps.length);
      const longMin = Math.max(0, ...all.filter((sx) => sx.long).map((sx) => sx.min || 0));
      if (longMin <= 0) continue;
      const receveuses = all.filter((sx) => !sx.long && !sx.race && !sx.brick && !sx.recovery
        && (sx.steps || []).some((st) => st.role === "body" && !EN_PENTE(st) && st.distanceM == null
          && st.durationMin != null && !IS_QUALITY_ZONE(String(st.zone || ""))));
      // La plus courte d'abord : rendre à celle qui a le plus de marge sous la sortie longue
      // répartit au lieu de concentrer, et évite de recréer une séance qui domine la semaine.
      receveuses.sort((x, y) => (x.min || 0) - (y.min || 0));
      // R20.3 — UNE SÉANCE FACILE NE RIVALISE PAS AVEC LA PIVOT. I14 seule bornerait chaque
      // receveuse à la DURÉE de la sortie longue : mesuré, le footing de l'inter montait alors à
      // 161 min à côté d'une longue de 163 — la règle tenait à deux minutes près pendant qu'un
      // entraîneur y aurait vu deux sorties longues. C'est le défaut que R20.3 a corrigé en
      // swimrun (« le footing ne devient pas la plus longue séance du plan »), et il se rejoue à
      // l'identique dès qu'une passe de remplissage n'a qu'une seule receveuse.
      const plafondFacile = Math.round(longMin * I14B_EASY_VS_LONG);
      for (const sx of receveuses) {
        if (manque <= 1) break;
        const place = Math.min(manque, plafondFacile - (sx.min || 0));
        if (place <= 1) continue;
        const cible2 = (sx.min || 0) + place;
        for (let g = 0; g < 4 && (sx.min || 0) < cible2 - 0.5; g++) {
          const avant = sx.min || 0;
          const f = cible2 / avant;
          let touche = false;
          for (const st of sx.steps || []) {
            if (st.role !== "body" || EN_PENTE(st) || st.distanceM != null || st.durationMin == null) continue;
            if (IS_QUALITY_ZONE(String(st.zone || ""))) continue;
            // Le plafond de bloc DÉCLARÉ garde le dernier mot : c'est lui qui borne un footing
            // (R20.3, O-8), et une passe de remplissage n'a pas à le contourner.
            const capBloc = st.bnd ? st.bnd.cap : Infinity;
            const suiv = Math.min(capBloc, Math.round(st.durationMin * f));
            if (suiv > st.durationMin) { st.durationMin = suiv; touche = true; }
          }
          if (!touche) break;
          if (render) render(sx);
        }
        const rendu = Math.max(0, (sx.min || 0) - (cible2 - place));
        manque -= rendu;
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
        const metersOf = () => sx.steps .reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
        const tot = metersOf();
        if (tot <= 0 || tot >= floorM) continue;
        // C29b — EN AFFÛTAGE, UNE NAGE COURTE SE GARDE : ni supprimée, ni remontée.
        //
        // Décision du fondateur (03/08/2026) : l'affûtage réduit le VOLUME, pas la FRÉQUENCE —
        // c'est ce que décrivent Bosquet 2007 et Mujika, déjà cités ici pour le +1,96 %
        // (volume −41/−60 %, intensité maintenue, **fréquence ≥ 80 %**). Le plancher de séance
        // piscine dit « sous X mètres, ça ne vaut pas le déplacement » : vrai dans une semaine
        // de CHARGE, faux dans un affûtage, où une nage courte EST l'objectif (R13.3 le dit
        // deux passes plus loin — « les sensations d'eau se perdent en 10-14 jours »).
        //
        // Mesuré avant : un nageur débutant recevait **2 jours actifs sur 6 au pic**, quatre
        // séances effacées d'un coup pour cause de trop petite taille. Le commentaire d'à côté
        // avait déjà nommé le risque (« un affûtage sans une seule séance n'affûte rien, il
        // désentraîne ») et ne protégeait que la DERNIÈRE séance.
        //
        // La semaine de récupération de milieu de plan garde, elle, l'ancien comportement : son
        // objet est de retirer de la charge, pas de préparer une course dans dix jours.
        if (wk.phase.id === "taper") continue;
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

  // ---- C26c (R20.4) — LE PLAFOND DE TEMPS DUR, ENFIN APPLIQUÉ ----
  //
  // C26 déclare depuis toujours que la grandeur physiologique est le temps DUR hebdomadaire
  // (~60 min, 35 en reprise, 25 chez un débutant) et que la part de facile n'en est que la
  // conséquence. Rien ne l'appliquait : mesuré sur 7 356 semaines de charge, **1 095 (15 %)
  // au-dessus**, jusqu'à 112 min de dur chez un DÉBUTANT — le profil dont C26b dit lui-même
  // qu'il est limité par son tissu conjonctif, celui qui ne prévient pas.
  //
  // ON RETIRE DES RÉPÉTITIONS, JAMAIS LA DURÉE D'UNE RÉPÉTITION. C'est la leçon d'I14, sur un
  // autre axe : dans un bloc d'intervalles, la durée de la répétition EST le stimulus — un
  // 5×4 min à VO2max ramené à 5×2 min n'est plus une séance de VO2max, c'est une séance qui
  // n'entraîne rien et qui porte encore son nom. Le nombre de répétitions, lui, est le
  // dosage : c'est par lui qu'on ajuste.
  //
  // Deux exceptions nommées, toutes deux parce que retirer y ferait plus de mal que garder :
  //   · un bloc CONTINU (une répétition unique — seuil tenu, CSS continu) n'a pas de dosage à
  //     retirer : on le raccourcit jusqu'à un plancher, en dessous duquel il est déclassé ;
  //   · la dernière répétition d'un bloc ne disparaît jamais en silence — la séance perd son
  //     statut de séance de qualité (elle passe en endurance) plutôt que de garder son nom sur
  //     un contenu qui ne le porte plus. Même arbitrage que C13d.
  enforceHardTimeCap(plan, ctx, render);
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
 * O-11 / R20.5 — la bande « allure course » vélo de cette épreuve, relief compris. Un seul
 * point pour les deux appelants (génération et réparation) : deux copies auraient divergé, ce
 * qui est très exactement le défaut qu'O-11 décrit.
 */
function shiftedBikeRp(sport        , format                    , a                )                                         {
  const b = raceBikeBand(sport, format);
  if (!b) return undefined;
  const shift = bikeIFShift(legProfileOf(a         , "bike"));
  return { lo: b.lo + shift, hi: b.hi + shift };
}

/**
 * C26c (R20.4) — LE TEMPS DUR HEBDOMADAIRE NE DÉPASSE PAS LE PLAFOND QUE C26 DÉCLARE.
 *
 * Voir `constraintMatrix.ts` (C26c) pour le raisonnement et la mesure. Ici, la mécanique :
 * on retire des RÉPÉTITIONS, en commençant par la séance qui porte le plus de temps dur, et
 * on s'arrête dès que la semaine est sous le plafond. La séance la plus chargée d'abord :
 * réduire d'une répétition la plus grosse séance coûte moins à la structure du plan que
 * d'écorner trois séances pour le même total.
 *
 * `PLANCHER_CONTINU` : en dessous, un bloc continu de seuil n'est plus un stimulus de seuil.
 * La séance est alors DÉCLASSÉE en endurance plutôt que raccourcie encore — l'arbitrage C13d,
 * appliqué à l'intensité au lieu de l'échauffement.
 */
const C26C_PLANCHER_CONTINU_MIN = 8;
function enforceHardTimeCap(
  plan        ,
  ctx                                                                                         ,
  render                         ,
)       {
  const cap = hardTimeCapMin({
    history: ctx?.history,
    level: ctx?.level ?? (ctx?.beginner ? "debutant" : undefined),
    injured: !!ctx?.injured,
  }) * C26c_HARD_TIME_TOLERANCE;

  for (const w of plan.weeks) {
    if (w.isRecup || w.phase.id === "taper") continue;
    const hardOf = (s           ) => intensitySplit(s         ).hardMin;
    const weekHard = () => w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + hardOf(s), 0), 0);
    // Borne d'itération : chaque tour retire au moins une répétition ou déclasse un bloc, donc
    // le nombre de blocs durs du plan majore le nombre de tours. La borne existe pour qu'un
    // futur bloc « irréductible » fasse rendre un plan imparfait plutôt qu'une boucle infinie.
    for (let tour = 0; tour < 200 && weekHard() > cap; tour++) {
      // La séance la plus dure de la semaine, hors course et hors séance verrouillée.
      let cible                   = null, cibleHard = 0;
      for (const d of w.days)
        for (const s of d.sessions) {
          if (s.d === "rs" || (s                      ).race) continue;
          const h = hardOf(s);
          if (h > cibleHard) { cibleHard = h; cible = s; }
        }
      if (!cible || cibleHard <= 0) break;
      // R20.5 — la COUPE et la MESURE doivent classer pareil. `bk.rp` est dur ou modéré selon
      // la bande de l'épreuve : lire `rpBand` ici aussi, sinon le cutter ne trouverait jamais
      // le bloc que l'auditeur compte — deux définitions du mot « dur » dans le même moteur,
      // le défaut O-11 reproduit à l'intérieur d'un seul lot.
      const durs = (cible.steps || []).filter((b) => b.role === "body"
        && zoneClass(b.zone, false, (b                                           ).rpBand) === "hard");
      if (!durs.length) break;
      // Le plus gros bloc dur de la séance : c'est lui qui porte le dosage.
      const b = durs.reduce((x, y) => ((y.reps || 1) * (y.durationMin || 0) > (x.reps || 1) * (x.durationMin || 0) ? y : x));
      if ((b.reps || 1) > 1) {
        b.reps = (b.reps || 1) - 1;
      } else if ((b.durationMin || 0) > C26C_PLANCHER_CONTINU_MIN) {
        // Bloc continu : pas de dosage à retirer, on raccourcit — jusqu'au plancher.
        b.durationMin = Math.max(C26C_PLANCHER_CONTINU_MIN, Math.round((b.durationMin || 0) * 0.8));
      } else {
        // Plus rien à retirer sans mentir sur ce que la séance est : elle DEVIENT ce qu'elle
        // est réellement devenue. Le nom et la note suivent — une séance qui change de nature
        // et garde son titre est le défaut que R19.5 a fermé côté prose.
        const disc = String(b.d ?? cible.d);
        b.zone = (disc === "sw" ? "sw" : disc === "bk" ? "bk" : "rn") + ".easy";
        b.intensity = "easy"                     ;
        // Le nom est REMPLACÉ, pas préfixé. Ma première écriture posait « Endurance » devant
        // le nom d'origine et produisait « Endurance nage seuil (+dist) » — une séance qui se
        // contredit dans son propre titre. Une séance déclassée n'est pas l'ancienne séance
        // avec un adjectif : c'est une autre séance, et elle porte son vrai nom.
        cible.name = disc === "sw" ? "Nage endurance" : disc === "bk" ? "Vélo endurance" : "Footing endurance";
        cible.note = "Le plafond de travail dur de ta semaine est atteint : cette séance passe en endurance. Ce n'est pas une punition — c'est ce qui rend les séances dures de ta semaine réellement assimilables.";
      }
      if (render) render(cible);
    }
  }
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
function syncDerivedLabels(plan        )       {
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

function normalizeRestMinutes(plan        )       {
  for (const w of plan.weeks)
    for (const d of w.days)
      for (const s of d.sessions) if (typeof s.min !== "number" || !isFinite(s.min)) s.min = 0;
}

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
  // O-11 / R20.5 — la zone « allure course » vélo lit la cible du JOUR J de cette épreuve,
  // au lieu d'une constante 0,80–0,88 × FTP identique du sprint à l'Ironman. Un seul point
  // décide (`raceBikeBand`), et c'est le même que celui de la prédiction.
  //
  // Le décalage de relief (R15.2) est appliqué ICI AUSSI, et par le même résolveur de parcours
  // que la prédiction : une séance qui s'appelle « rappel race-pace » doit afficher le nombre
  // que l'athlète verra sur son compteur le jour J. Reproduire la cible d'un parcours plat en
  // préparation d'une épreuve de montagne, c'est apprendre le mauvais chiffre — le défaut que
  // R15.2 a corrigé côté prédiction, à un mois d'intervalle, sur l'autre versant du même
  // chemin.
  const refs       = { ...r.baseRefs, bikeRp: shiftedBikeRp(String(a.sport), fmt, a) };
  const days = buildDays(r, refs, r.hz);

  // ---- Bornes de bloc (R3.4b/R3.11/R3.12) — source unique, mêmes règles que V1.5 ----
  let _capScale = 1;
  const brickRF = a.history === "reprise" ? C21_REPRISE_BRICK_FACTOR : 1; // C21
  function blockBounds(b        , s                )                                 {
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
        // R20.5 — le leg vélo du brick peut être en DEUX blocs (endurance puis allure course).
        // Les bornes du format portent sur le TOTAL vélo : chaque bloc en reçoit sa part, sinon
        // un brick coupé en deux hériterait de deux fois le plancher et doublerait mécaniquement.
        const sh = (b                      ).share ?? 1;
        return { floor: Math.round((bb ? bb[0] : 32) * sh), cap: Math.round((CAP_BRICK_BIKE[fmt] || 300) * brickRF * sh) };
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
      if (s.steps && s.steps.length) {
        // T19 — la récupération d'un bloc en pente suit son dénivelé, qui bouge encore à ce
        // stade (mise à l'échelle verticale, plafond de bosse, allègement T3). On la
        // réconcilie AVANT de mesurer, pas après : c'est elle qui entre dans `_min`.
        syncReturnRecovery(s.steps);
        renderSess(s, refs, r.hz, r.baseRefs);
      } else if (s.min == null) s.min = 0;
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
          const clone2 = structuredClone(days.filter((d) => d.week === specWeek))            ;
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
  // R20.1-a — `>= 0`, pas `> 0` : voir `arbitrateVolRecent`. Quelqu'un qui repart de ZÉRO est
  // celui à qui il faut le départ le plus prudent, et le test strict lui donnait le moins
  // prudent. Le plancher de 2 h reste : on ne prescrit pas une semaine 1 vide, on la borne.
  //
  // R20.7 (O-13) — LA RAMPE ET L'ATHLÈTE NE PARLAIENT PAS LA MÊME UNITÉ EN NATATION.
  //
  // Le nageur répond en heures de PISCINE — le temps qu'il y passe. Le moteur, lui, compte la
  // natation en heures DANS L'EAU (`SWIM_TIME_FACTOR` : les consignes, les départs et les temps
  // d'arrêt ne sont pas du volume d'entraînement). Comparer les deux, c'est comparer des euros
  // à des dollars : le chiffre déclaré arrivait toujours au-dessus de la courbe, donc la rampe
  // ne mordait JAMAIS. Mesuré avant correction — `vol_recent` à 0, 2, 5 ou 10 h donnait le même
  // plan à la minute près : semaine 1 à 1,6 h dans les quatre cas.
  //
  // On convertit AVANT de comparer, et le plancher suit la même unité — un plancher de 2 h
  // « génériques » vaudrait 5 h de piscine et ne bornerait plus rien.
  //
  // La question posée à l'athlète ne change pas : lui demander de retrancher ses temps de repos
  // serait lui demander un calcul qu'il ne peut pas faire, et la plupart répondraient de toute
  // façon le temps passé à la piscine. C'est au moteur de convertir, pas à l'athlète.
  const _rampUnit = r.volLimits.swimTime; // 1 partout ailleurs qu'en natation
  let _rampCap = isFinite(volRecent) && volRecent >= 0
    ? Math.max(2 * _rampUnit, volRecent * _rampUnit * 1.1)
    : Infinity;
  let _rampWeeks = 0;
  let _rampCeilH = 0; // R20.7 — plus haut plafond réellement imposé par la rampe (0 = jamais mordu)
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
  // R5.2 (audit v7 bis) — UNE COUPE NE PEUT PAS ORPHELINER LA DISCIPLINE PRINCIPALE. La passe de
  // couverture tourne en fin de `buildDays` ; les coupes de volume, elles, tournent APRÈS et
  // pouvaient retirer la seule séance de course d'une semaine d'affûtage de duathlon — un
  // duathlon commence et finit à pied. Chaque sélection de victime passe désormais par ce filtre.
  // R13 — généralisé : la coupe n'orpheline AUCUNE discipline du sport (plus seulement la
  // principale). Mesuré : la 2e semaine d'affûtage d'un duathlon sortait sans un coup de
  // pédale — la CAP était protégée, le vélo non (D-DISC, banc v7).
  const _sportDiscs = sportModule(r.profile.sport          ).disciplines;
  const keepsMainDiscipline = (wd2          , victim        )          => {
    const coversD = (d        , disc        ) => d.sessions.some((s) => s.d === disc || (s.d === "br" && (s.steps || []).some((b) => b.leg === (disc === "rn" ? "run" : disc === "bk" ? "bike" : "swim"))));
    for (const disc of _sportDiscs) {
      if (!coversD(victim, disc)) continue;
      if (!wd2.some((d) => d !== victim && coversD(d, disc))) return false;
    }
    return true;
  };
  // R13.3 — le sport déclare que l'affûtage (et la préparation) garde sa nage : les coupes
  // l'évitent tant qu'une autre victime existe. Orienter, jamais interdire.
  const _keepTaperSwim = guard(a.sport          , "swimRacePrepFrequency") && !r.dbl && !r.medHold;
  const cutLightestEasyDay = (wd2          , why        , minActive = 3)          => {
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
    // R5.2 — on ÉVITE d'orpheliner la discipline principale (`keepMain`), puis on repasse sans
    // ce garde si c'était la seule coupe possible : orienter, jamais interdire.
    for (const keepMain of [true, false]) {
      const mainD = sportModule(r.profile.sport          ).mainDiscipline;
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
        // R20.7 — on retient le PLUS HAUT plafond que la rampe a réellement imposé. C'est lui
        // qui dit ce que la rampe a coûté au pic ; `_rampCap` en fin de boucle vaut souvent
        // `Infinity` (la rampe a fini par rejoindre la courbe) et ne dirait plus rien.
        if (!isRW) _rampCeilH = Math.max(_rampCeilH, capW);
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
      let raised                                = [];
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
          if (ph.id === "taper") continue; // C29b — voir la note au plancher piscine
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
      // A3 — même reformulation qu'en amont : en décharge, on retire, on ne remonte pas.
      const decharge = w.isRecup || w.phase.id === "taper";
      let changed = false;
      for (const d of wd2)
        for (const s of [...d.sessions]) {
          if (s.d !== "sw" || !s.steps || !s.steps.length) continue;
          const totOf = () => s.steps .reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
          const body = s.steps.filter((st) => st.role === "body" && st.distanceM != null).sort((x, y) => (y.reps || 1) * (y.distanceM || 0) - (x.reps || 1) * (x.distanceM || 0))[0];
          if (!body || !body.distanceM) continue;
          const t0 = totOf();
          if (w.phase.id === "taper" && t0 > 0 && t0 < swFloorF) continue; // C29b
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
          // R5.5 — le pic monte d'une séance TECHNIQUE DOUCE : on ne clone qu'une séance facile
          // (jamais un seuil : le pic n'a pas à gagner de l'intensité par une passe de volume),
          // et le clone porte un nom PROPRE. Cloner à l'identique donnait « Seuil CSS +
          // plaquettes » deux fois dans la même semaine — un athlète qui lit deux fois la même
          // carte en conclut, à raison, que le plan ne le regarde pas.
          const isQualitySess = (s           ) => (s.steps || []).some((b) =>
            b.role === "body" && (/\.(vo2|thr|css|rp|ss|frc|speed|mara)$/.test(String(b.zone || "")) || (b.reps || 1) > 1));
          const donor = wd2.flatMap((d) => d.sessions).filter((s) => s.d === "sw" && s.steps && s.steps.length && !s.long && !isQualitySess(s)).sort((x, y) => (x.min || 0) - (y.min || 0))[0];
          const restDay = wd2.find((d) => !d.forced && !d.sessions.some((s) => s.d !== "rs"));
          if (!donor || !restDay) break;
          if (wmW2(bestPeakW) + (donor.min || 0) > raiseCap) break;
          const clone = structuredClone(donor)             ;
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
    // T1b (audit v7) — le D+ d'un bloc ne dépasse jamais ce que le terrain permet. Le tapis
    // lève la contrainte en MONTÉE (c'est justement sa fonction), pas en descente.
    const accessKey = a.train_dplus_access || "collines";
    const perBlockCap = a.treadmill === "oui"
      ? TRAIL_ACCESS.collines.perBlock
      : (TRAIL_ACCESS[accessKey] || TRAIL_ACCESS.collines).perBlock;
    const syncUpFromDuration = (w        ) => {
      for (const st of stepsOf(w)) {
        if (st.gradient !== "up" || !st.durationMin || !st.dplusM) continue;
        const z = String(st.zone || "");
        const share = z === "tr.vam" ? 1.0 : z === "tr.asc" ? 0.89 : z === "tr.climb" ? 0.76 : z === "tr.hike" ? 0.52 : 0.42;
        st.dplusM = Math.max(20, Math.round((st.durationMin / 60) * r.trail .vam * share / 5) * 5);
      }
      for (const st of stepsOf(w)) {
        if (!st.dplusM || st.dplusM <= perBlockCap) continue;
        st.dplusM = perBlockCap; // le bloc s'aligne sur la bosse disponible, on la répète
        if (st.dmoinsM && st.dmoinsM > perBlockCap) st.dmoinsM = perBlockCap;
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
              d: "rn", recovery: true, name: "Footing plat de récupération (post-descente)",
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

    // T3, CONTRÔLE PAR SEMAINE — la règle des 48 h est appliquée avant la mise à l'échelle
    // verticale (elle doit l'être : elle change la structure de la semaine). Mais la courbe peut
    // ensuite pousser une journée AU-DESSUS du seuil, et le plan livré viole alors une règle
    // qu'il croyait respecter — mesuré : 1 040 m de D− suivis d'une séance de qualité 48 h après.
    // On ne re-structure pas la semaine (l'aplatir casse la progression D+/D−) : on ramène la
    // DESCENTE DU JOUR juste sous le seuil, et seulement quand la violation existe vraiment.
    // Appelé DANS la boucle de courbe pour que la progression soit mesurée sur ces valeurs-là :
    // sinon les deux règles se contredisent (T2b lit un chiffre que T3 modifiera après lui).
    const dayDmoins = (d        ) => d.sessions.reduce((t, sx) => t + (sx.steps || []).reduce((u, st) => u + (st.dmoinsM || 0) * (st.reps || 1), 0), 0);
    const clampEccentricDays = (w        ) => {
      const wd = w.days            ;
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
    const before = (wk.days            ).length;
    wk.days = (wk.days            ).filter((d) => !d.date || d.date <= a.race_date );
    if ((wk.days            ).length !== before) {
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

  // ---- R20.2 — LE VOLUME MAX DIT CE QUI LE BLOQUE, ET CE QUI LE DÉBLOQUERAIT ----
  //
  // Constat de test du fondateur : « volume max à 12 h au lieu de 14 ». La mesure (O-10) a
  // montré plus large que le constat — sur un 70.3, `vol_max` ne changeait plus RIEN au-delà
  // de 10 h : 10, 12, 14, 16 h donnaient le même plan à 0,1 h près. La question continuait
  // d'être posée comme si elle décidait, et le moteur livrait un pic bas sans un mot.
  //
  // Ce bloc ne change AUCUN chiffre du plan. Il rend le chiffre explicable, et c'est
  // volontairement le seul geste : forcer le volume vers le plafond demandé reviendrait à
  // gonfler des séances au-delà de ce que leurs bornes autorisent — soit exactement le défaut
  // que la sonde de capacité V2.1 existe pour empêcher. « Un mauvais plan vaut mieux qu'un
  // plan dangereux » ; un plan honnête sur sa limite vaut mieux qu'un plan muet.
  //
  // ON NOMME LE MAILLON QUI A LE PLUS RETIRÉ, PAS LE PREMIER QUI MORD. Ma première écriture
  // testait les plafonds dans l'ordre du calcul : en natation, `caps` (10 h) mordait avant
  // `util` sur 14 h demandées, et le moteur annonçait « c'est ton historique qui borne » pour
  // un pic livré à 3,3 h — faux de 7 h. Une explication approximative sur un chiffre que
  // l'athlète a lui-même saisi est pire que pas d'explication : elle l'envoie corriger la
  // mauvaise réponse. La chaîne est donc reconstruite maillon par maillon et c'est la plus
  // grosse baisse EN HEURES qui parle.
  //
  // Le diagnostic est honnête quel que soit le maillon ; c'est la PROPOSITION qui est gardée :
  // aucun levier n'est jamais suggéré à quelqu'un dont le plan a été réduit pour le protéger
  // (drapeau médical, blessure, âge) — hiérarchie du manifeste, santé d'abord.
  {
    const L = r.volLimits;
    if (L.declared > 0 && volPeak < L.declared * 0.85) {
      const h = (x        ) => (Math.round(x * 10) / 10).toString().replace(".", ",") + " h";
      const nSess = Math.max(0, ...wl.filter((w) => !w.isRecup)
        .map((w) => (w.days            ).reduce((t, d) => t + d.sessions.filter((s) => s.d !== "rs").length, 0)));
      const peutDoubler = guard(a.sport          , "doublesAddVolume") && !r.dbl;
      const dblRepondu = String(a.doubles ?? "");
      const sante = r.medHold || r.loadFactor < 1;

      // La chaîne, dans l'ordre où le moteur l'applique. Chaque maillon déclare ce qu'il a
      // retiré (`de` → `a`) et la phrase qu'il dirait s'il était le principal responsable.
      // R20.7 — TOUTES LES BAISSES SONT EXPRIMÉES DANS LA MÊME UNITÉ, CELLE DU PIC LIVRÉ.
      //
      // La chaîne comparait des baisses d'AVANT la conversion en temps d'eau (heures
      // « génériques » : ce que l'athlète peut consacrer à s'entraîner) à des baisses d'APRÈS
      // (heures réellement passées dans l'eau). Mesuré sur une prépa de natation en reprise :
      // elle annonçait « c'est ton historique, −5 h » pour un pic livré à 1,6 h — ces 5 h
      // n'existent pas dans l'unité du chiffre affiché. Troisième fois que ce chantier
      // rencontre la même faute d'unité (O-13, le plancher de temps facile de R20.5, et ici ma
      // propre chaîne) : elle ne se voit jamais tant qu'on n'écrit pas les deux grandeurs
      // côte à côte.
      //
      // Chaque baisse est donc multipliée par le produit des facteurs qui la SUIVENT — ce que
      // le maillon a réellement coûté sur le chiffre final. `queue` se met à jour au fur et à
      // mesure : un facteur qui s'applique cesse de compter pour les baisses déjà enregistrées.
      let v = L.declared;
      let queue = L.marg * L.recup * L.swimTime * L.med * (r.loadFactor < 1 ? r.loadFactor : 1);
      const maillons                                                       = [];
      const etape = (apres        , quoi        , pourquoi        ) => {
        if (apres < v - 0.05) maillons.push({ retire: (v - apres) * queue, quoi, pourquoi });
        v = Math.min(v, apres);
      };
      /** Un maillon MULTIPLICATIF : il consomme sa part de `queue` en s'appliquant. */
      const facteur = (f        , quoi        , pourquoi        ) => {
        if (f > 0 && f < 1) queue /= f;
        etape(v * f, quoi, pourquoi);
      };
      etape(L.caps, "ton historique",
        "Sur ce format, l'historique « " + String(r.profile.history ?? "") + " » permet d'encaisser " + h(L.caps)
        + "/sem : au-delà, la charge s'accumule plus vite qu'elle ne s'assimile. Ce plafond monte tout seul, en tenant les semaines — pas en les forçant.");
      etape(L.util, "le volume utile du format",
        "Chaque format a un volume au-delà duquel les heures ne servent plus l'objectif : ici " + h(L.util)
        + "/sem. Les heures supplémentaires coûteraient de la fraîcheur sans rien ajouter au jour J — si tu veux vraiment t'entraîner plus, c'est le format qu'il faut changer, pas le curseur.");
      facteur(L.marg, "la marge de sécurité hors compétition",
        "Tu ne prépares pas une compétition : 10 % de marge sont retirés de tous les plafonds. La santé passe avant le chiffre.");
      facteur(L.recup, "ta récupération",
        "Sommeil court et/ou charge de vie lourde : le moteur ne fait pas semblant de l'ignorer, il baisse réellement le contenu (règle 1B). Ce maillon-là remonte tout seul dès que le sommeil revient.");
      facteur(L.swimTime, "le temps réellement passé dans l'eau",
        "En natation, le volume promis se compte en temps DANS l'eau — les longueurs de récupération, les départs et les consignes ne sont pas du volume d'entraînement. C'est la même séance, comptée honnêtement.");
      facteur(L.med, "le drapeau médical",
        "Tu as signalé un symptôme à l'effort : ce plan est un plan de MAINTIEN, volontairement allégé. Le volume n'est pas le sujet tant que l'avis médical n'est pas donné.");
      // R20.7 — LA RAMPE DE DÉPART EST UN MAILLON, ELLE AUSSI. Sur une préparation courte, un
      // athlète qui repart de zéro n'a pas le temps de rejoindre la courbe : la montée est
      // bornée à +10 %/semaine (R10/C22) et c'est ELLE qui décide du pic, pas les plafonds.
      // Mesuré en fermant O-13 : natation `fond`, 12 semaines, `vol_recent: 0` → pic 1,6 h,
      // et la chaîne nommait un plafond que le plan n'approchait même pas.
      etape(_rampCeilH > 0 ? _rampCeilH : v, "ton point de départ",
        "Tu repars de " + h(isFinite(volRecent) ? volRecent : 0) + "/sem : la montée est bornée à +10 % par semaine, et sur "
        + r.weeks + " semaines elle n'a pas le temps de rejoindre ce que tes plafonds autorisent. Ce n'est pas une limite technique, c'est la marche la plus souvent trop haute — celle du début. Avec plus de semaines devant toi, le même profil monterait plus haut.");
      facteur(r.loadFactor < 1 ? r.loadFactor : 1, r.inj.count > 0 ? "tes zones fragiles" : "ton âge",
        (r.inj.count > 0 ? "Ta ou tes zones fragiles (" + r.inj.list.join(", ") + ")" : "Ton âge")
        + " abaissent volontairement le plafond de charge (R6.2/R6.3). Ce n'est pas un réglage à contourner : la marge que tu perds ici est celle qui te garde entier.");
      // Le reste : ce que la STRUCTURE de la semaine ne sait pas porter — nombre de séances ×
      // durée maximale de chacune. C'est le cas d'O-10, et le seul où un levier existe.
      etape(volPeak, "le nombre de séances",
        "Tes plafonds de charge autorisent " + h(v) + "/sem, mais une semaine ne contient que " + nSess
        + " séances et aucune ne peut s'allonger indéfiniment sans devenir autre chose."
        + (sante
          ? " Ton plan est déjà allégé pour te protéger : ce n'est pas le moment d'en ajouter."
          : peutDoubler
            ? " Pour aller plus haut, il faudrait faire deux séances certains jours"
              + (dblRepondu === "parfois"
                ? " — tu as répondu « parfois » aux doubles, et le moteur n'en place que si tu réponds « oui »."
                : " : passe « journées à 2 séances » sur « oui » au Profil.")
              + " À toi de juger si ton quotidien le permet : deux séances mal récupérées valent moins qu'une bien faite."
            : r.dbl
              ? " Tu doubles déjà : au-delà, ce sont les durées maximales de séance qui bornent, et les allonger encore les transformerait en autre chose que ce qu'elles visent."
              : " Sur ce sport, doubler ne changerait rien : les séances sont uniques par jour et bornées par leur objectif."));

      if (maillons.length) {
        const p = maillons.reduce((x, y) => (y.retire > x.retire ? y : x));
        r.decisions.push({
          id: "R20.2",
          what: "Ton volume max demandé (" + h(L.declared) + ") n'est pas atteint",
          val: "pic à " + h(volPeak) + " — ce qui borne, c'est " + p.quoi + " (−" + h(p.retire) + "/sem)",
          why: p.pourquoi,
        });
      }
    }
  }

  // Courses intermédiaires : mini-affûtage semaine B/A, récup la semaine suivante
  const races                                   = [];
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
    const wk = wl.find((w) => (w.days            ).some((d) => d.date === rc.date));
    if (wk) {
      wk.race = rc.prio;
      // R10 — le JOUR de course existe dans la grille : la séance de ce jour devient la
      // course elle-même (consigne de pacing selon la priorité), pas un entraînement.
      const rd = (wk.days            ).find((d) => d.date === rc.date);
      if (rd) {
        const mainD = sportModule(a.sport          ).mainDiscipline;
        const prevMin = rd.sessions.reduce((m, s) => m + (s.min || 0), 0) || 60;
        // Le jour de la course n'est plus un jour « bloqué » : l'athlète y court, c'est un FAIT
        // qu'il a déclaré lui-même. Et comme la course occupe un créneau, elle ne s'ajoute pas
        // au budget de séances : la plus petite séance de la semaine cède sa place.
        if (traceEnabled()) traceRecord({ pass: "insertion-course", weekNum: wk.num, date: rc.date, sessionName: "🏁 Course " + rc.prio, discipline: mainD, field: "insertion", after: prevMin, reason: "N1" });
        rd.forced = false;
        rd.charge = "dur";
        {
          const others = (wk.days            )
            .filter((d) => d !== rd)
            .flatMap((d) => d.sessions.filter((sx) => sx.d !== "rs").map((sx) => ({ d, sx })));
          const budget = r.budgetPerWeek || 6;
          while (others.length + 1 > budget) {
            // R13 — la coupe de budget n'orpheline pas une discipline du sport (le jour J ne
            // couvre que la discipline principale) : sur un duathlon à 3 séances/semaine, la
            // semaine de course perdait son dernier coup de pédale (D-DISC, banc v7).
            const discs = sportModule(a.sport          ).disciplines;
            const coversAfter = (cand                   ) => discs.every((disc) => {
              const still = others.some((o) => o !== cand && (o.sx.d === disc || (o.sx.d === "br" && (o.sx.steps || []).some((b) => b.leg === (disc === "rn" ? "run" : "bike")))))
                || disc === sportModule(a.sport          ).mainDiscipline; // la course couvre la principale
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
          // R14.3-a — le jour J et la carte Prédiction lisent le MÊME profil de parcours,
          // par le même résolveur : deux écrans de la même app ne peuvent plus annoncer
          // deux chronos différents pour la même course. Même raison pour le volume qui
          // pilote l'exposant de Riegel (P5) : l'oublier ici rouvrirait la divergence d'un
          // cran plus bas — le det du jour J extrapolerait à 1,06 pendant que la carte
          // extrapolerait au volume réel de l'athlète.
          const pred = predictRace(a.sport          , a.format          , a.intent, r.baseRefs, {
            courseProfile: courseProfileOf(a         ),
            // R18.2 — trois profils au lieu d'un : un triathlon n'est pas homogène.
            legProfiles: { swim: legProfileOf(a         , "swim"), bike: legProfileOf(a         , "bike"), run: legProfileOf(a         , "run") },
            trail: r.trail || undefined,
            // R20.1-b — LE JOUR J DU SWIMRUN NE PORTAIT AUCUN TEMPS PRÉDIT. `predictRace` ne
            // recevait pas l'objectif swimrun décodé : le module poussait un conseil et
            // rendait zéro item, donc `predDet` restait vide. Le triathlon et le trail
            // affichaient leurs temps sur la case du jour J, le swimrun non — et personne ne
            // l'avait vu parce que rien ne comparait les sept sports sur ce point.
            // C'est aussi ce qui rendait `leg_swim_env` et `leg_run_prof` INERTES sur le plan
            // en swimrun alors que R19.1 venait de les brancher dans la prédiction.
            swimrun: a.sport === "swimrun" ? swimrunObjective(a) : undefined,
            // R19.2 — la combinaison. `|| undefined` aurait relu 0 °C comme « pas de réponse »
            // (le piège de `vol_recent`, R20.1-a) : on teste la finitude, pas la vérité.
            waterTempC: (() => { const t = parseFloat(String(a.water_temp_c ?? "")); return isFinite(t) ? t : undefined; })(),
            runHoursPerWeek: a.sport === "run" ? parseFloat(String(a.vol_max ?? "")) || undefined : undefined,
          });
          if (pred.items.length) predDet = " — ⏱ Prévu : " + pred.items.map((it) => it.leg + " " + it.value).join(" · ");
        }
        rd.sessions = [{
          d: mainD        ,
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
        }             ];
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
      const allDays = wl.flatMap((w) => w.days            );
      const raceT = new Date(rc.date + "T12:00:00Z").getTime();
      const dayAt = (offsetDays        ) => allDays.find((d) => d.date === new Date(raceT + offsetDays * 864e5).toISOString().slice(0, 10));
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
              { role: "warmup", durationMin: 8, text: "très progressif" }          ,
              { role: "body", durationMin: 2, reps: 3, zone: dz, recoveryMin: 1, recoveryText: "1min très souple", text: ", accélérations franches mais courtes" }          ,
              { role: "cooldown", durationMin: 5, text: "souple" }          ,
            ];
          } else {
            sx.steps = [{ role: "body", durationMin: capMin, zone: dz }          ];
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
        const wkDays = wk.days            ;
        const horsCourse = () => wkDays.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.race ? 0 : s.min || 0), 0), 0);
        const floorMin = volPeak * 60 * 0.30;
        const mainD = sportModule(a.sport          ).mainDiscipline;
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
          const sx            = { d: mainD        , name: "Endurance allégée (semaine de course)", det: "",
            note: "Semaine de course : on entretient le moteur sans le fatiguer. Allure strictement facile, arrêt net à la durée — la fraîcheur du jour J se construit aussi en continuant de bouger.",
            steps: [{ role: "body", durationMin: dur, zone: dz }          ] };
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
  if (guard(a.sport          , "swimRacePrepFrequency") && !r.dbl && !r.medHold) {
    for (const wk of wl) {
      if (wk.phase.id !== "taper") continue;
      const wdays = wk.days            ;
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

  const plan         = { weeks: wl, volPeak, volBase, use10: r.use10, totalWeeks: r.weeks, phases: r.phases, races };
  reconcileDeclaredVolume(plan, r.warnings, (s) => renderSess(s, refs, r.hz, r.baseRefs), { swimFloors: guard(a.sport          , "swimSessionFloors"), beginner: r.beginner, medHold: r.medHold, keepTaperSwim: guard(a.sport          , "swimRacePrepFrequency") && !r.dbl && !r.medHold, mainDiscipline: sportModule(a.sport          ).mainDiscipline, disciplines: sportModule(a.sport          ).disciplines, sessionsMaxDeclared: parseInt(String(a.sessions_max ?? "")) || undefined, history: a.history, level: a.level, injured: r.inj.count > 0 });

  normalizeRestMinutes(plan);
  syncDerivedLabels(plan); // repassé en dernier par la boucle de réparation
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
            if (s.d === "rs" || s.long || s.brick || s.race) return; // R13.4 : une course (min=0) n'est jamais une victime de coupe
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
            if (s.d === "rs" || s.long || s.brick || s.race) return; // R13.4 : une course (min=0) n'est jamais une victime de coupe
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
    // C26b — l'auditeur doit savoir ce qui LIMITE cet athlète : sans `history` ni `injured`,
    // il jugerait un débutant qui reprend avec le plafond de temps dur d'un compétiteur.
    history: profile.history,
    injured: !!(profile.injury && profile.injury !== "aucune" && profile.injury !== ""),
    refs: { cssSecPer100m: reasoned.baseRefs.css || 130, thrPaceSecPerKm: reasoned.baseRefs.thrPace || 330 },
    ...auditOpts,
  };
  // O-11 / R20.5 — même bande « allure course » qu'à la génération : la boucle de réparation
  // re-rend des séances, elle ne doit pas les re-rendre avec une AUTRE définition de bk.rp.
  const refs       = { ...reasoned.baseRefs, bikeRp: shiftedBikeRp(String(reasoned.profile.sport), reasoned.profile.format, reasoned.profile) };
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
  // Les passes de réparation créent des séances de repos : le contrat `min` se re-normalise à
  // la sortie, pas seulement dans le générateur (R4.8a).
  normalizeRestMinutes(best.plan);
  // R5.3 — la courbe ANNONCÉE se réconcilie avec le prescrit une fois les réparations passées :
  // `reduceDay` et `applyTargetedRepairs` changent encore des durées, et un écart figé avant
  // elles ment à l'athlète dès la première réparation (même leçon que R5.1).
  reconcileDeclaredVolume(best.plan, warnings, (s) => renderSess(s, refs, reasoned.hz, reasoned.baseRefs), { swimFloors: guard(reasoned.profile.sport          , "swimSessionFloors"), beginner: reasoned.beginner, medHold: reasoned.medHold, keepTaperSwim: guard(reasoned.profile.sport          , "swimRacePrepFrequency") && !reasoned.dbl && !reasoned.medHold, mainDiscipline: sportModule(reasoned.profile.sport          ).mainDiscipline, disciplines: sportModule(reasoned.profile.sport          ).disciplines, sessionsMaxDeclared: parseInt(String(reasoned.profile.sessions_max ?? "")) || undefined, history: reasoned.profile.history, level: reasoned.profile.level, injured: reasoned.inj.count > 0 });
  // R5.1 — EN DERNIER : les réparations ciblées (`applyTargetedRepairs`, `reduceDay`) ont pu
  // rescaler des répétitions après la génération. Toute prose dérivée d'un nombre se resynchronise
  // ici, une fois que plus rien ne bougera — cette fois pour de vrai.
  syncDerivedLabels(best.plan);

  // L'AUDIT RENDU EST CELUI DU PLAN RENDU.
  //
  // `best.audit` était pris AVANT les trois passes ci-dessus — dont `reconcileDeclaredVolume`,
  // qui porte à elle seule sept garanties. Le verdict décrivait donc un plan qui n'existait
  // plus : la trace a montré le même plan « en violation » selon `res.audit` et « propre »
  // selon un `auditPlan` rejoué dessus. Un auditeur qui note un état intermédiaire ne dit rien
  // du produit, exactement comme le harnais qui mesurait le générateur de repli (O7).
  //
  // On re-mesure donc à la sortie. Les réserves affichées à l'athlète sont recalculées avec :
  // annoncer des réserves qu'on vient de lever serait le même mensonge dans l'autre sens.
  // R13.5 — LA PROMESSE EST CONFRONTÉE AU LIVRÉ, EN DERNIER. Le journal pouvait afficher
  // « sonde de capacité → 2,9 h » au-dessus d'un plan dont le pic réel faisait 0,9 h : le
  // chiffre annoncé mentait ×3 et AUCUN garde ne comparait les deux. Si le pic livré fait
  // moins de 75 % de la promesse V2.1, un avertissement nomme le limiteur — et si les
  // semaines de charge sont PLATES (max/min < 1,35), le plan n'est plus un plan périodisé
  // et l'athlète doit le savoir. Deux filets, pas des correctifs : la génération saine ne
  // les déclenche jamais (mesuré : 0 sur les 594 combinaisons).
  {
    const wMin = (w                                              ) => w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.min || 0), 0), 0);
    const charge = best.plan.weeks.filter((w) => !w.isRecup && w.phase.id !== "taper").map(wMin);
    const pkH = charge.length ? Math.max(...charge) / 60 : 0;
    const v21 = reasoned.decisions.find((d) => d.id === "V2.1");
    const promH = v21 ? parseFloat(String(v21.val).replace(",", ".")) : 0;
    const injWhy = reasoned.inj && reasoned.inj.count > 0 ? "tes séances aménagées pour ta zone fragile (" + reasoned.inj.list.join(", ") + ") bornent chaque semaine" : "les plafonds de séance bornent chaque semaine";
    if (promH > 0 && pkH > 0 && pkH < promH * 0.75)
      warnings.push("Le volume promis (" + promH.toFixed(1) + " h/sem au pic) n'est pas atteignable : " + injWhy + " — le plan livrable culmine à " + pkH.toFixed(1) + " h/sem. C'est ce chiffre-là qui compte.");
    if (charge.length >= 4 && Math.max(...charge) / Math.max(1, Math.min(...charge)) < 1.35)
      warnings.push("Les semaines de charge de ce plan sont quasi identiques (l'écart entre la plus grosse et la plus petite est inférieur à 35 %) : les contraintes de séance empêchent une vraie périodisation. Le plan reste sûr, mais un objectif plus court — ou un avis sur la contrainte qui borne tes séances — le rendrait plus progressif.");
  }
  const finalAudit = auditPlan(best.plan, opts);
  const stale = warnings.indexOf("Plan rendu avec réserves (contraintes insatisfaisables après " + MAX_ITERATIONS + " réparations) :");
  if (stale >= 0) warnings.splice(stale, 1 + best.audit.hardViolations.length);
  if (finalAudit.hardViolations.length > 0) {
    warnings.push("Plan rendu avec réserves (contraintes insatisfaisables après " + MAX_ITERATIONS + " réparations) :");
    warnings.push(...finalAudit.hardViolations.map((v) => "· " + v));
  }
  return { plan: best.plan, audit: finalAudit, warnings, repairs, decisions: reasoned.decisions };
}

// ===== src/engine/projection.ts =====
/**
 * PROJECTION DE FORME AU JOUR J (R14) — « où en seras-tu le jour de la course ».
 *
 * Le défaut mesuré par le handoff R14 : `predictRace` ne lisait que `refs = {ftp, thrPace, css}`,
 * c'est-à-dire les valeurs saisies AUJOURD'HUI. Sur un Ironman à 59 semaines, en simulant
 * 30 semaines intégralement cochées, la prédiction restait identique au caractère près —
 * l'athlète le plus assidu du monde voyait le même chrono après sept mois d'entraînement.
 * C'était le seul module du moteur qui ignorait le plan qu'il accompagne, et c'est aussi
 * celui qui décide du pacing du jour J.
 *
 * CE MODULE NE PRODUIT JAMAIS LE CHRONO LUI-MÊME : il produit des FRACTIONS DE GAIN et une
 * INCERTITUDE, que le prédicteur applique à ses propres méthodes. La séparation est
 * volontaire — la façon de passer d'une référence à un temps (Riegel, CSS, %FTP) est déjà
 * écrite une fois, et une projection ne doit pas en créer une seconde.
 *
 * ─── CE QUI FONDE LES CHIFFRES, ET CE QUI N'EST QU'UNE HEURISTIQUE ─────────────────────
 *
 * SOLIDE (source primaire) :
 *   - Affûtage : Bosquet, Montpetit, Arvisais & Mujika, MSSE 2007;39(8):1358-67 — méta-analyse
 *     de 27 études, gain moyen +1,96 % (plage −2,28 à +8,91 %), optimum à 2 semaines avec
 *     volume réduit de 41-60 % et INTENSITÉ MAINTENUE. C'est la seule constante de ce fichier
 *     qui vienne d'une méta-analyse, et c'est pour ça qu'elle est conditionnée (P4) : la
 *     promettre quand le plan n'affûte pas conformément serait la citer à faux.
 *   - Variabilité inter-individuelle : HERITAGE (Bouchard, 483 sujets, 20 semaines de
 *     programme IDENTIQUE) — gain moyen ~0,4 L/min, mais 7 % des sujets à ≤ +0,1 L/min et
 *     8 % à ≥ +0,7 L/min. C'est l'argument décisif de tout le chapitre : **une projection
 *     ponctuelle est fausse par construction, seule une fourchette est honnête.**
 *   - Ordre de grandeur de l'incertitude : Rüst et al., OAJSM 2011;2:121-129 (N=184) —
 *     prédiction du temps d'Ironman à r²=0,65, SEE = 57 min sur ~11 h, soit ±8 %. Notre borne
 *     haute (±12 %) ne peut pas être plus étroite que ça sans mentir.
 *
 * HEURISTIQUE CONVERGENTE (pas de source primaire — à réviser dès qu'on aura des données
 * internes, et REMPLAÇABLE par la mesure de l'athlète via P3) :
 *   - Les plafonds `G_INFINI` ci-dessous (~20-30 %/an débutant, 5-10 % intermédiaire,
 *     2-5 % avancé) : convergence de sources de coaching, pas d'étude princeps.
 *   - La constante de temps τ = 20 semaines de la saturation.
 *
 * EXPLICITEMENT REJETÉ (liste noire du handoff, et on ne la franchit pas) :
 *   - Dériver un chrono de la CTL/ATL/TSB. Coggan, concepteur du modèle, la qualifie
 *     d'indicateur RELATIF de forme, jamais d'un prédicteur absolu. La CTL reste une
 *     tendance de charge — jamais une entrée de ce module.
 *   - Le modèle de Banister : excellent ajustement rétrospectif, validité prédictive
 *     prospective non démontrée, paramètres instables.
 *   - Projeter une cible de PUISSANCE ou d'ALLURE (P6, dans le prédicteur) : c'est la règle
 *     de sécurité du chapitre. Le temps se projette, l'intensité s'ancre.
 */
                                           

/** Un point du journal de tests de l'athlète (`answers.tests`). */
                                                                                       

                                  
                                                                                         
                       
                 
                   
     
                                                                                 
                                                                          
     
                                                       
                           
                      
                      
                                                                                      
                                    
                                                                                               
                                  
                             
                                                                                        
                             
                                 
                           
                        
     
                                                                               
                                                                                        
                                                           
     
                           
                                                                                         
                    
                                                                                                  
                        
                                                                                         
                             
                                                                                                     
                    
 

/**
 * P9 — le poids comme LEVIER OPTIONNEL, présenté en SENSIBILITÉ et jamais en objectif.
 * Le module ne produit ni calendrier, ni rythme de perte, ni apport : ces sujets restent
 * hors du périmètre du moteur, comme la frontière nutrition l'a déjà établi.
 */
                              
                    
                   
                        
                           
                     
              
 

                                   
                      
                       
                    
                                                                      
     
                                                                         
                                                                                  
     
                                                                                                               
                                           
                                             
                                  
                        
 

/**
 * P2bis (R14.1) — LE PLAFOND DE GAIN S'INDEXE SUR LA DISTANCE AU POTENTIEL.
 *
 * ── LE DÉFAUT CORRIGÉ ────────────────────────────────────────────────────────────────
 * La première version (R14) indexait le plafond sur `history`, et lisait `ancien` (pratique
 * de longue date) comme « proche du plafond physiologique ». C'est une confusion : des années
 * de pratique auto-encadrée ne donnent pas la trainabilité résiduelle d'un athlète structuré
 * depuis dix ans. Mesuré sur un écran de production — 70.3 à 43 semaines, FTP 230 W pour
 * 85 kg, soit **2,71 W/kg** — le moteur projetait +4,6 % sur la CAP et +5,1 % sur la nage.
 * Or 2,71 W/kg est en bas de la bande « fair » de Coggan et un CSS à 2'15/100 m est un profil
 * limité par la technique : **la marge est grande, la table disait l'inverse.** Le code était
 * juste, la table était fausse.
 *
 * C'est exactement la leçon R12 (« un adjectif auto-déclaré ne pilote plus aucun chiffre »),
 * qui n'avait été appliquée qu'à `level` : `history` faisait passer la même erreur par la
 * porte d'à côté. La marge se déduit désormais de ce qui est MESURÉ.
 *
 *     G∞(discipline) = G_plafond(discipline) × h(marge) × k_structure × f_volume
 *
 * ── LES BANDES ───────────────────────────────────────────────────────────────────────
 * Les bandes VÉLO suivent le profil de puissance de Coggan (publié). Les bandes CAP et NAGE
 * sont des **heuristiques convergentes de praticiens** — écrites comme telles, et remplaçables
 * par la mesure de l'athlète dès qu'il a deux tests datés (P3).
 *
 * `h` est ancré au MILIEU de chaque bande et interpolé linéairement entre les ancres : une
 * frontière franche ferait sauter la projection de 50 % pour 1 W d'écart.
 */
const G_PLAFOND                         = {
  // 20-30 %/an chez le non-entraîné (heuristique convergente).
  ftp: 0.25,
  // Forte composante TECHNIQUE : la marge d'un nageur lent n'est pas aérobie, elle est dans
  // le geste — et c'est précisément ce qui se travaille le plus vite quand on part de loin.
  css: 0.22,
  // Barnes & Kilding, Sports Med Open 2015 : l'économie de course ne gagne que 2-4 % et
  // progresse lentement. La course est la discipline où l'on promet le moins.
  thrPace: 0.15,
  // Trail : même famille que la course (économie + aérobie), avec un peu plus de marge
  // technique en montée. Faute de bandes de VAM publiées, `h` reprend celui de la CAP.
  vam: 0.20,
};

/** Ancres `[valeur, h]` par discipline, du plus de marge au moins de marge. */
                              
/** Vélo : W/kg au seuil (profil de puissance de Coggan). Plus haut = moins de marge. */
const ANCRES_WKG          = [[2.25, 1.0], [2.875, 0.75], [3.625, 0.5], [4.375, 0.28], [5.125, 0.12]];
/** CAP : allure seuil en s/km. Plus LENT = plus de marge (l'axe est inversé). */
const ANCRES_PACE          = [[360, 1.0], [307.5, 0.75], [262.5, 0.5], [225, 0.28], [195, 0.12]];
/** Nage : CSS en s/100 m. Plus LENT = plus de marge. */
const ANCRES_CSS          = [[150, 1.0], [127.5, 0.75], [112.5, 0.5], [97.5, 0.28], [82.5, 0.12]];

/** Interpolation linéaire sur une suite d'ancres monotone (croissante ou décroissante). */
function interpole(ancres         , v        )         {
  const croissant = ancres[ancres.length - 1][0] > ancres[0][0];
  const dans = (x        , a        , b        ) => (croissant ? x >= a && x <= b : x <= a && x >= b);
  if (dans(v, -Infinity          , ancres[0][0]) || (croissant ? v <= ancres[0][0] : v >= ancres[0][0])) return ancres[0][1];
  const last = ancres[ancres.length - 1];
  if (croissant ? v >= last[0] : v <= last[0]) return last[1];
  for (let i = 1; i < ancres.length; i++) {
    const [v0, h0] = ancres[i - 1], [v1, h1] = ancres[i];
    if (dans(v, v0, v1)) return h0 + ((h1 - h0) * (v - v0)) / (v1 - v0);
  }
  return ancres[ancres.length - 1][1];
}

/**
 * P2bis-d — AJUSTEMENTS DE BANDES (heuristiques assumées).
 * On décale LA RÉFÉRENCE, jamais la marge de l'athlète : une femme de 3,0 W/kg n'est pas
 * « en retard », elle est à sa place dans une bande décalée — et sa marge résiduelle se lit
 * sur cette bande-là. Même raisonnement pour l'âge : après 35 ans, le déclin aérobie de
 * l'athlète qui maintient l'intensité décale la référence de ~5 % par décennie.
 */
function decalage(sex                , age                )                                 {
  const femme = String(sex || "").toUpperCase().startsWith("F");
  const decennies = age && age > 35 ? (age - 35) / 10 : 0;
  return {
    wkg: (femme ? -0.45 : 0) - 0.05 * 4.0 * decennies, // −5 %/décennie sur une référence ~4 W/kg
    temps: (femme ? 0.10 : 0) + 0.05 * decennies,      // allures et CSS : +10 % femme, +5 %/décennie
  };
}

/** La marge disponible sur une référence mesurée. `null` = référence absente → pas de marge calculable. */
function margeOf(
  discipline                                   ,
  refs                                                           ,
  weightKg                ,
  sex                ,
  age                
)                {
  if (!refs) return null;
  const d = decalage(sex, age);
  if (discipline === "ftp") {
    if (!(refs.ftp > 0) || !(weightKg && weightKg > 0)) return null; // sans poids, pas de W/kg
    return interpole(ANCRES_WKG.map(([v, h]) => [v + d.wkg, h]         ), refs.ftp / weightKg);
  }
  if (discipline === "css") {
    if (!(refs.css > 0)) return null;
    return interpole(ANCRES_CSS.map(([v, h]) => [v * (1 + d.temps), h]         ), refs.css);
  }
  // thrPace et vam partagent la bande de la course (aucune bande de VAM publiée).
  if (!(refs.thrPace > 0)) return null;
  return interpole(ANCRES_PACE.map(([v, h]) => [v * (1 + d.temps), h]         ), refs.thrPace);
}

/**
 * P2bis-c — `k_structure` : L'ANCIENNETÉ REDEVIENT UN SIMPLE MODIFICATEUR.
 * Ce qu'on mesure, c'est le STIMULUS DE LA STRUCTURE, pas les années de pratique : quelqu'un
 * qui s'entraîne au feeling depuis dix ans a encore tout le bénéfice d'un plan devant lui.
 */
const K_STRUCTURE                         = { feeling: 1.0, intermittent: 0.85, suivi: 0.65 };
/** Repli quand la question n'a pas été posée/répondue — `history` ne sert plus qu'à ça. */
const K_PAR_HISTORY                         = { reprise: 1.0, confirme: 0.85, ancien: 0.75 };
const K_DEFAUT = 0.85;

/** P2bis-e — plafond absolu, non négociable, après TOUT calcul. */
const GAIN_MAX_ABSOLU = 0.30;

/** P2 — constante de temps de la saturation : le gain ralentit, il ne s'accumule pas. */
const TAU_WEEKS = 20;
/** P4 — Bosquet 2007, gain moyen d'un affûtage CONFORME. */
const TAPER_GAIN = 0.0196;
/**
 * P10 — FACTEUR VOLUME (dose-réponse). Deux athlètes de même profil, l'un à 6 h et l'autre à
 * 14 h par semaine, recevaient la même projection : le plan lui-même n'entrait pas dans le
 * modèle. `r` = volume hebdo moyen PRESCRIT en dev+spec+peak ÷ volume récent déclaré.
 *
 * Le plafond à 1,15 est délibéré : au-delà, le volume supplémentaire ne se convertit pas
 * proportionnellement en performance et fait monter le risque de blessure. **Le moteur ne
 * doit pas récompenser la surcharge** — c'est la priorité n°2 du manifeste, dans un endroit
 * où l'on ne l'attendait pas.
 */
/**
 * P11 / RG — LE RÉGIME : le modèle de gain n'avait pas de version « débutant ».
 *
 * CE QUI L'A RÉVÉLÉ. Un cas réel : ancien sportif de haut niveau, cinq ans sans rien, première
 * course à 5'30/km sur 13 min terminée à 185 BPM, puis **46'30 au 10 km en 8 semaines**. Le
 * modèle, pour un départ à 5'45/km d'allure seuil, autorisait **56'09**. Dix minutes d'écart.
 *
 * Deux causes, toutes deux visibles dans les constantes ci-dessus :
 *
 * 1. **`G_PLAFOND` est un jeu de plafonds d'athlète ENTRAÎNÉ.** Pour la course, sa provenance
 *    (Barnes & Kilding 2015) mesure ce que gagne l'ÉCONOMIE DE COURSE — le raffinement à la
 *    marge d'un geste déjà acquis. Les premiers mois de quelqu'un qui part de zéro sont un autre
 *    phénomène : débit cardiaque, capillarisation, densité mitochondriale, apprentissage du
 *    geste. Pas le même phénomène, donc pas la même borne.
 *
 * 2. **`ANCRES_PACE` sature à 6'00/km** (h = 1,0 au-delà) : un coureur à 7'30 et un coureur à
 *    6'00 reçoivent la MÊME marge, exactement dans la zone où vivent les débutants.
 *
 * LE DÉCLENCHEUR EST MESURÉ, PAS DÉCLARÉ — c'est toute la leçon de R14.1, qui a dépouillé
 * `history` de son pouvoir sur les chiffres. Le régime se lit sur le volume récent, une donnée
 * que le questionnaire collecte déjà et rend obligatoire (R10).
 *
 * INTERPOLÉ, jamais à seuil franc : le commentaire de `G_PLAFOND` le dit déjà pour ses propres
 * bandes — « une frontière franche ferait sauter la projection de 50 % pour 1 W d'écart ».
 *
 * CE QUI EST ANCRÉ ET CE QUI NE L'EST PAS. `thrPace` est confronté à une trajectoire réelle
 * (voir ci-dessus) ; les trois autres reprennent le même RAPPORT (≈ ×2,3) et sont des
 * **heuristiques assumées**, au même statut que les bandes de marge course et nage de R14.1.
 * L'ordre de grandeur s'appuie sur un résultat ancien et répliqué — VO2max +15 à 25 % chez le
 * sédentaire sur 8 à 12 semaines — auquel s'ajoute, en PERFORMANCE, ce que gagnent l'économie et
 * la technique depuis une base basse. Ce ne sont pas des mesures, et le code le dit.
 */
const RG_VOL_DEBUTANT_H = 1.5; // h/sem : en dessous, régime « part de zéro »
const RG_VOL_ENTRAINE_H = 4;   // h/sem : au-dessus, le modèle publié s'applique tel quel
const G_PLAFOND_DEBUTANT                         = {
  ftp: 0.32,     // heuristique — zéro impact, l'aérobie encaisse et progresse vite
  css: 0.30,     // heuristique — la technique domine chez le non-nageur, elle se gagne vite
  thrPace: 0.25, // voir la note de calibration ci-dessous
  vam: 0.27,     // heuristique — même famille que la course, un peu plus de marge technique
};
/** Le gain du débutant est bien plus PRÉCOCE : la constante de temps se raccourcit. */
const RG_TAU_DEBUTANT = 9;
/** Le plafond absolu suit le régime — celui de l'entraîné a été écrit pour l'entraîné. */
const RG_GAIN_MAX_DEBUTANT = 0.32;

/**
 * NOTE DE CALIBRATION de `thrPace: 0,25` — et de ce qu'elle N'EST PAS.
 *
 * CE QUE J'AI ESSAYÉ D'ABORD, ET POURQUOI JE L'AI RETIRÉ. Ma première écriture visait à faire
 * entrer la trajectoire réelle qui a déclenché P11 (0 → 46'30 au 10 km en 8 semaines) DANS la
 * fourchette basse : `thrPace = 0,35`, cap 0,42. Résultat mesuré : **32,1 % de gain projeté sur
 * 16 semaines**. Un tiers de son allure seuil en quatre mois, affiché à tout le monde. Ce n'est
 * pas défendable, et ça révèle la faute de méthode — calibrer un modèle sur UN cas, en
 * l'occurrence le plus favorable qui soit : ancien sélectionné en équipe de France junior,
 * cinq ans d'arrêt, donc une reconstruction sur un capital déjà bâti.
 *
 * HERITAGE (Bouchard, 483 sujets, programme identique) dit exactement pourquoi c'est une faute :
 * 7 % des sujets gagnent ≤ 0,1 L/min et 8 % ≥ 0,7 L/min. La variabilité inter-individuelle EST
 * le phénomène. Un modèle calé sur le 92ᵉ centile promet à tout le monde ce qu'un sur douze
 * obtiendra — et c'est la priorité n°2 du manifeste qui trinque, parce que l'athlète à qui on
 * promet ça va chercher la différence dans la charge.
 *
 * CE QUE 0,25 REPRÉSENTE. Un plafond de gain de PERFORMANCE pour quelqu'un qui part de zéro,
 * d'un ordre de grandeur cohérent avec le résultat ancien et répliqué « VO2max +15 à 25 % chez
 * le sédentaire sur 8 à 12 semaines », majoré de ce que gagnent l'économie de course et
 * l'apprentissage du geste depuis une base basse. Ce n'est PAS une mesure : c'est une borne
 * déclarée, du même statut assumé que les bandes de marge course et nage de R14.1.
 *
 * OÙ TOMBE LE CAS RÉEL, DIT FRANCHEMENT. Depuis 6'30/km à 8 semaines, le modèle projette
 * aujourd'hui **53'14 – 1 h 04** là où il autorisait **1 h 01 – 1 h 05** avant P11. Son 46'30
 * reste DEHORS, au-delà de la borne optimiste. C'est le comportement voulu : la fourchette
 * décrit ce qu'un plan suivi produit couramment, pas ce que le meilleur répondeur obtient. Le
 * défaut que P11 corrige n'était pas « le modèle ne prédit pas cet athlète-là », c'était « le
 * modèle applique un plafond d'athlète entraîné à quelqu'un qui n'en est pas un ».
 */

/** Position dans le régime : 0 = entraîné (modèle publié), 1 = part de zéro. Interpolé. */
function regimeDebutant(volRecentH                )         {
  const v = volRecentH == null || !isFinite(volRecentH) ? RG_VOL_ENTRAINE_H : Math.max(0, volRecentH);
  if (v <= RG_VOL_DEBUTANT_H) return 1;
  if (v >= RG_VOL_ENTRAINE_H) return 0;
  return (RG_VOL_ENTRAINE_H - v) / (RG_VOL_ENTRAINE_H - RG_VOL_DEBUTANT_H);
}

const ANCRES_VOLUME          = [[1.0, 0.75], [1.2, 1.0], [1.5, 1.15]];
function volumeFactor(prescribedMeanH                , volRecentH                )                {
  if (!(prescribedMeanH && prescribedMeanH > 0)) return null;
  // P11 — LE PIÈGE DU ZÉRO, DEUXIÈME OCCURRENCE (la troisième est dans `bridge.ts`).
  //
  // Le test était `volRecentH > 0` : `vol_recent = 0` retombait donc sur `null` et le facteur
  // volume disparaissait — pour exactement la population dont le plan multiplie le volume le
  // plus. Partir de zéro, c'est le rapport de dose le plus grand qui existe : le facteur va au
  // plafond de la table, pas à rien.
  //
  // ATTRIBUTION HONNÊTE. Ce défaut-ci était LATENT : sur le chemin livré, le zéro n'arrivait
  // même pas jusqu'ici (`bridge.ts` l'effaçait un maillon plus haut, avec un `|| null`). Il
  // aurait mordu dès la correction du pont. C'est ce qui rend la leçon utile : le piège se
  // corrige sur TOUT LE CHEMIN, pas à l'endroit où on le remarque.
  //
  // C'est le même piège que R20.1 a trouvé sur la rampe R10 (« le piège du `|| undefined` sur un
  // zéro »), jamais rejoué ailleurs jusqu'ici.
  if (!(volRecentH != null && isFinite(volRecentH) && volRecentH >= 0)) return null;
  if (volRecentH === 0) return ANCRES_VOLUME[ANCRES_VOLUME.length - 1][1];
  return interpole(ANCRES_VOLUME, prescribedMeanH / volRecentH);
}

/**
 * P7bis (R14.1) — LA FOURCHETTE DEVIENT ASYMÉTRIQUE, et porte sur le GAIN.
 *
 * La règle symétrique produisait une borne haute absurde : −42 s de natation sur 43 semaines,
 * parce que l'élargissement de l'incertitude annulait le gain du côté pessimiste. Or
 * **HERITAGE** (Bouchard, 483 sujets, programme identique) dit précisément ceci : 7 % des
 * sujets gagnent ≤ 0,1 L/min et 8 % ≥ 0,7 L/min. Le pire cas d'un plan suivi, ce n'est pas de
 * régresser — c'est de ne presque rien gagner. **La borne haute doit donc être ta forme
 * d'aujourd'hui**, et le texte le dit.
 */
const GAIN_BAND_LO = 0.15;
const GAIN_BAND_HI = 1.30;
/** Au-delà de cette largeur de fourchette, la projection n'apprend plus rien : on refuse. */
const GAIN_BAND_MAX_WIDTH = 0.25;
/** P8 — en dessous, le plan ne peut pas produire le gain qu'il prévoyait. */
const ADHERENCE_FLOOR = 0.5;
/**
 * Facteur appliqué quand l'adhérence n'est pas jugeable (aucun ✓ dans le plan). Ni 1,0
 * (qui promettrait un suivi parfait) ni 0 (qui accuserait quelqu'un qui n'a rien fait de mal) :
 * on projette un suivi NORMAL et on dit que c'est ce qu'on fait.
 */
const ADHERENCE_UNKNOWN_FACTOR = 0.9;

/** `k_structure` retenu, et d'où il vient (pour la traçabilité et le plafond de confiance). */
function structureFactor(trainingStructure                , history         )                                   {
  const s = String(trainingStructure || "");
  if (K_STRUCTURE[s] !== undefined) return { k: K_STRUCTURE[s], declared: true };
  const h = K_PAR_HISTORY[String(history || "")];
  return { k: h !== undefined ? h : K_DEFAUT, declared: false };
}

const LABEL_REF                         = { ftp: "FTP", thrPace: "allure seuil", css: "CSS", vam: "VAM" };
const LABEL_MARGE = (h        )         =>
  h >= 0.85 ? "très grande" : h >= 0.62 ? "grande" : h >= 0.38 ? "moyenne" : h >= 0.2 ? "réduite" : "faible";
const LABEL_STRUCTURE                         = {
  feeling: "au feeling, sans plan", intermittent: "plan structuré par intermittence", suivi: "plan structuré suivi",
};

/**
 * P9 — LE LEVIER POIDS, sous gardes dures. Rien ici n'est proposé ni suggéré : le levier
 * n'existe QUE si l'athlète l'a demandé (`weight_lever`) ET a saisi lui-même une cible.
 * Aucun calendrier, aucun rythme de perte, aucun apport — la frontière nutrition du manifeste
 * s'applique telle quelle. Une sensibilité, jamais un objectif.
 */
function weightLeverOf(input                 )                                                      {
  if (!input.weightLeverAsked || !(input.weightTargetKg && input.weightTargetKg > 0)) return { lever: null, refus: null };
  const now = input.weightKg || 0, cible = input.weightTargetKg;
  if (!(now > 0) || cible >= now) return { lever: null, refus: null };
  // Gardes DURES — chacune neutralise le levier en silence (afficher le refus serait déjà
  // parler du poids à quelqu'un à qui on a décidé de ne pas en parler).
  const h = input.heightCm && input.heightCm > 0 ? input.heightCm / 100 : 0;
  const imcCible = h > 0 ? cible / (h * h) : 0;
  if (h > 0 && imcCible < 18.5) return { lever: null, refus: "IMC cible sous 18,5" };
  if (input.age != null && input.age < 18) return { lever: null, refus: "athlète mineur" };
  if (input.medicalFlag) return { lever: null, refus: "drapeau médical actif" };
  const semaines = Math.max(1, input.horizonWeeks);
  if ((now - cible) / semaines > 0.5) return { lever: null, refus: "perte impliquée > 0,5 kg/semaine" };
  const ftp = input.refs ? input.refs.ftp : 0;
  // CAP : ~0,8 %/1 % de masse (fourchette 0,7-1,0 % dans la littérature sur le coût énergétique).
  const runGainPct = ((now - cible) / now) * 0.008 * 100;
  return {
    lever: {
      currentKg: Math.round(now * 10) / 10,
      targetKg: Math.round(cible * 10) / 10,
      wkgNow: ftp > 0 ? Math.round((ftp / now) * 100) / 100 : null,
      wkgTarget: ftp > 0 ? Math.round((ftp / cible) * 100) / 100 : null,
      runGainPct: Math.round(runGainPct * 100) / 100,
      why: "Sensibilité, pas une cible : à FTP identique, ton rapport W/kg passerait de "
        + (ftp > 0 ? Math.round((ftp / now) * 100) / 100 + " à " + Math.round((ftp / cible) * 100) / 100 + " W/kg" : "—")
        + ", et le coût énergétique de la course baisse d'environ 0,8 % par 1 % de masse. Sur le vélo, "
        + "l'effet ne se voit qu'en montée : à plat, c'est la puissance qui décide, pas le rapport. "
        + "Ce chiffre montre ce que la balance changerait — il ne dit ni comment, ni à quel rythme, "
        + "et ces questions-là se traitent avec un professionnel de santé, pas avec un plan d'entraînement.",
    },
    refus: null,
  };
}

/**
 * P3 — LA MESURE DE L'ATHLÈTE PRIME SUR NOTRE HEURISTIQUE.
 *
 * Deux tests datés du même type, espacés d'au moins 6 semaines, donnent un taux RÉEL de
 * progression (%/semaine). On le rétrécit vers le prior (`w = n/(n+2)` — deux points ne
 * font pas une tendance, dix la font), puis on le BORNE par le plafond P2 : un athlète qui
 * a gagné 13 % en six mois ne gagnera pas 26 % en douze, la courbe sature.
 *
 * C'est la seule façon de sortir de l'heuristique : l'athlète devient sa propre référence.
 */
function measuredRate(tests                       , type        )                                            {
  const pts = (tests || [])
    .filter((t) => t && t.type === type && Number.isFinite(+t.value) && +t.value > 0 && t.date)
    .map((t) => ({ v: +t.value, d: Date.parse(t.date + "T00:00:00Z") }))
    .filter((t) => Number.isFinite(t.d))
    .sort((x, y) => x.d - y.d);
  if (pts.length < 2) return null;
  const first = pts[0], last = pts[pts.length - 1];
  const weeks = (last.d - first.d) / (7 * 864e5);
  if (weeks < 6) return null; // deux tests rapprochés mesurent le bruit, pas la progression
  // L'allure seuil est un temps : progresser, c'est BAISSER. On ramène tout à « fraction de
  // gain », positive quand l'athlète s'améliore, quel que soit le sens de la grandeur.
  const gain = type === "thrPace" ? (first.v - last.v) / first.v : (last.v - first.v) / first.v;
  return { ratePerWeek: gain / weeks, n: pts.length };
}

function projectForm(input                 )                   {
  const decisions             = [];
  const D = (id        , what        , val        , why        ) => decisions.push({ id, what, val, why });
  const w = Math.max(0, input.horizonWeeks);

  // ---- P2bis : la marge se lit sur les références MESURÉES, plus sur un adjectif ----
  // P11 — et le RÉGIME décide de QUEL modèle de gain s'applique : celui de l'entraîné (publié)
  // ou celui de quelqu'un qui part de zéro. Interpolé entre les deux, déclenché par le volume
  // récent MESURÉ, jamais par un adjectif.
  const rg = regimeDebutant(input.volRecentH);
  const tau = TAU_WEEKS + rg * (RG_TAU_DEBUTANT - TAU_WEEKS);
  const capAbsolu = GAIN_MAX_ABSOLU + rg * (RG_GAIN_MAX_DEBUTANT - GAIN_MAX_ABSOLU);
  const sat = 1 - Math.exp(-w / tau);
  const marge = {
    ftp: margeOf("ftp", input.refs, input.weightKg, input.sex, input.age),
    thrPace: margeOf("thrPace", input.refs, input.weightKg, input.sex, input.age),
    css: margeOf("css", input.refs, input.weightKg, input.sex, input.age),
    vam: margeOf("vam", input.refs, input.weightKg, input.sex, input.age),
  };
  const { k, declared: kDit } = structureFactor(input.trainingStructure, input.history);
  const fVol = volumeFactor(input.prescribedMeanH, input.volRecentH);
  const mDite = marge.ftp ?? marge.thrPace ?? marge.css;
  D("P2", "Marge de progression retenue", mDite == null ? "non calculable" : LABEL_MARGE(mDite),
    "Elle se lit sur tes références MESURÉES, pas sur ton ancienneté : des années de pratique au "
    // Volontairement SANS unité rapportée au poids : quelqu'un qui n'a pas ouvert la question du
    // poids (P9) ne doit pas la voir arriver par la porte d'une explication de marge. Le rapport
    // puissance/masse n'apparaît que dans le levier, et seulement s'il a été demandé.
    + "feeling ne rapprochent pas du plafond physiologique. Quelqu'un encore loin de son plafond a "
    + "beaucoup de marge, quelqu'un qui en est proche en a peu — et c'est ça qui décide, pas le "
    + "nombre d'années de pratique. La courbe "
    + "SATURE (constante de temps " + TAU_WEEKS + " semaines) : les premières semaines rapportent bien "
    + "plus que les dernières. Bandes vélo d'après le profil de puissance de Coggan ; bandes course et "
    + "nage heuristiques — tes propres tests les remplacent (P3).");
  D("P2-structure", "Structure de ton entraînement récent",
    kDit ? LABEL_STRUCTURE[String(input.trainingStructure)] : "non renseignée (estimée)",
    "Ce qui compte n'est pas depuis combien d'années tu t'entraînes, mais si tu as suivi un PLAN. "
    + (kDit
      ? "Un plan déjà suivi a consommé une partie du bénéfice qu'un plan apporte — la marge restante est plus petite, et c'est une bonne nouvelle sur ton niveau."
      : "Sans ta réponse, on estime prudemment et la confiance de la projection reste plafonnée : renseigne-la au Profil pour l'affiner."));
  if (fVol != null)
    D("P10", "Volume du plan vs ton volume récent", "×" + fVol.toFixed(2) + " sur le gain",
      "Un plan qui MONTE le volume produit plus qu'un plan de maintien : c'est la dose qui fait "
      + "l'adaptation. Le facteur est plafonné à 1,15 volontairement — au-delà, le volume "
      + "supplémentaire ne se convertit plus proportionnellement en performance et fait monter le "
      + "risque de blessure. Le moteur ne récompense pas la surcharge.");

  // ---- P1 : adhérence, fenêtre glissante — jamais le % du plan entier ----
  let adhFactor        ;
  let adherence        ;
  if (input.adherence == null) {
    adherence = ADHERENCE_UNKNOWN_FACTOR;
    adhFactor = ADHERENCE_UNKNOWN_FACTOR;
    D("P1", "Adhérence récente", "pas encore mesurable",
      "Aucune séance cochée pour l'instant : on projette un suivi NORMAL, ni parfait ni absent. "
      + "Dès que tu coches tes séances, cette projection se cale sur ton adhérence RÉELLE des "
      + "6 dernières semaines — et elle deviendra plus fiable.");
  } else {
    adherence = input.adherence;
    // Sous le plancher, le gain tombe à ~0. Ce n'est pas une punition, c'est une conséquence :
    // un plan à moitié fait ne produit pas l'adaptation qu'il prévoyait, et le dire à l'avance
    // vaut mieux que de le découvrir sur la ligne de départ.
    adhFactor = adherence < ADHERENCE_FLOOR ? 0 : Math.min(1, adherence);
    D("P1", "Adhérence des 6 dernières semaines", Math.round(adherence * 100) + "% des minutes prévues",
      adherence < ADHERENCE_FLOOR
        ? "Sur les 6 dernières semaines, moins de la moitié des séances ont été faites — le plan ne "
          + "peut pas produire le gain qu'il prévoyait, et te projeter un chrono en progrès serait te "
          + "mentir. Rien n'est perdu : la régularité se reprend, et la projection avec elle."
        : "Mesurée sur les semaines ÉCOULÉES uniquement (les séances à venir ne comptent ni pour "
          + "ni contre toi) : c'est ce qui a été fait qui produit l'adaptation.");
  }

  // ---- P4 : le bénéfice d'affûtage ne s'ajoute que si l'affûtage EXISTE ----
  const taper = input.taperConform ? TAPER_GAIN : 0;
  D("P4", "Bénéfice d'affûtage", input.taperConform ? "+" + (TAPER_GAIN * 100).toFixed(1) + "%" : "non compté",
    input.taperConform
      ? "Ton plan affûte conformément (2-3 semaines, volume réduit de 41 à 60 % du pic, intensité "
        + "MAINTENUE) : méta-analyse Bosquet 2007 (27 études), gain moyen +1,96 % le jour J. C'est "
        + "l'affûtage qui transforme l'entraînement en performance."
      : "Le plan ne contient pas d'affûtage conforme (2-3 semaines, −41 à −60 % de volume, intensité "
        + "maintenue) : promettre le gain d'affûtage sans l'affûtage serait citer la littérature à faux.");

  // ---- P3 puis composition finale, référence par référence ----
  const gainPct = { ftp: 0, thrPace: 0, css: 0, vam: 0 };
  const gainBand = {
    ftp: [0, 0], thrPace: [0, 0], css: [0, 0], vam: [0, 0],
  }                                ;
  let mesures = 0, priors = 0;
  for (const key of ["ftp", "thrPace", "css", "vam"]         ) {
    // P2bis — sans marge calculable (référence absente, ou poids manquant pour les W/kg), on
    // retombe sur une marge MOYENNE plutôt que sur zéro : ne rien projeter du tout parce qu'on
    // ignore le poids serait une punition administrative, pas un raisonnement d'entraîneur.
    const h = marge[key] ?? 0.5;
    // P11 — le plafond de la discipline suit le RÉGIME (interpolé, jamais à seuil franc).
    const plafondDisc = G_PLAFOND[key] + rg * ((G_PLAFOND_DEBUTANT[key] ?? G_PLAFOND[key]) - G_PLAFOND[key]);
    const plafond = plafondDisc * h * k * (fVol ?? 1);
    const prior = plafond * sat;
    let brut = prior;
    const m = measuredRate(input.tests, key);
    if (m) {
      const wm = m.n / (m.n + 2); // rétrécissement vers le prior : 2 points → 0,5 ; 10 points → 0,83
      const mesure = Math.max(0, m.ratePerWeek * w);
      brut = Math.min(wm * mesure + (1 - wm) * prior, prior); // BORNÉ par P2 : la courbe sature
      mesures++;
      D("P3", "Ta progression mesurée sur " + LABEL_REF[key],
        (m.ratePerWeek * 100).toFixed(2) + "%/semaine sur " + m.n + " tests datés",
        "Tes propres tests remplacent notre heuristique, pondérés à " + Math.round(wm * 100) + "% "
        + "(deux points ne font pas une tendance, dix la font) et bornés par le plafond de ton profil — "
        + "prolonger un taux mesuré en ligne droite sur un an ferait de toi un champion du monde sur le papier.");
    } else priors++;
    const g4 = (x        ) => Math.round(Math.min(capAbsolu, Math.max(0, x)) * 10000) / 10000;
    const ref = g4(brut * adhFactor + taper);
    gainPct[key] = ref;
    // P7bis — fourchette ASYMÉTRIQUE sur le gain : le pire cas d'un plan suivi n'est pas de
    // régresser, c'est de ne presque rien gagner (HERITAGE).
    gainBand[key] = [g4(GAIN_BAND_LO * ref), g4(GAIN_BAND_HI * ref)];
  }
  const gainSource                                 = mesures === 0 ? "prior" : priors === 0 ? "mesure" : "mixte";

  // ---- P7 : l'incertitude se calcule et s'affiche ----
  // Elle monte avec l'horizon (plus c'est loin, moins on sait) et avec l'ÂGE de la référence
  // (un test d'il y a un an ne décrit plus personne), et elle descend avec la régularité.
  const refAge = input.refAgeWeeks == null ? 0 : Math.max(0, input.refAgeWeeks);
  const largeur = Math.max(...(["ftp", "thrPace", "css"]         ).map((x) => gainBand[x][1] - gainBand[x][0]));
  D("P7", "Fourchette de la projection", "gain entre ×" + GAIN_BAND_LO.toFixed(2) + " et ×" + GAIN_BAND_HI.toFixed(2) + " de la valeur de référence",
    "Un même programme produit des gains très différents d'une personne à l'autre — sur 483 sujets "
    + "suivis 20 semaines avec le MÊME programme (HERITAGE), 7 % n'ont presque rien gagné et 8 % "
    + "ont énormément gagné. Une projection ponctuelle serait fausse par construction. La fourchette "
    + "est volontairement ASYMÉTRIQUE : au pire, ta forme d'aujourd'hui — le plan ne te rend pas plus "
    + "lent, il peut seulement rapporter moins que prévu.");

  let applicable = true;
  if (largeur > GAIN_BAND_MAX_WIDTH) {
    applicable = false;
    D("P7-refus", "Pas de chrono projeté", "fourchette de " + (largeur * 100).toFixed(0) + " points",
      "Trop tôt pour projeter un chrono : à cet horizon et avec ce qu'on sait de toi, la fourchette "
      + "honnête serait si large qu'elle n'apprendrait rien. Voici ta forme d'AUJOURD'HUI — reviens "
      + "quand la course approchera, la projection s'affinera d'elle-même.");
  }
  if (refAge > 52)
    D("P7-age-ref", "Ancienneté de ta dernière référence", Math.round(refAge / 4.35) + " mois",
      "Un test d'il y a plus d'un an ne décrit plus vraiment personne : la projection part d'un point "
      + "de départ incertain. Un retest la rendrait nettement plus fiable — et c'est gratuit.");

  // R14.1 — LA CONFIANCE EST HONNÊTE AU JOUR 0. Un plan jamais commencé affichait « confiance
  // moyenne » : c'est une promesse que rien ne soutient encore. Tant qu'aucune semaine ne s'est
  // écoulée, la seule valeur défendable est « faible ».
  let confidence                                ;
  if (!applicable || input.adherence == null || adhFactor === 0) confidence = "faible";
  else if (largeur <= 0.10 && adherence >= 0.8 && (gainSource !== "prior" || refAge <= 26)) confidence = "bonne";
  else confidence = "moyenne";
  // Sans la question de structure, on ne sait pas ce que le plan a déjà consommé de marge :
  // la confiance ne peut pas monter à « bonne ».
  if (!kDit && confidence === "bonne") confidence = "moyenne";

  const { lever, refus } = weightLeverOf(input);
  if (lever)
    D("P9", "Levier poids (à ta demande)", lever.currentKg + " → " + lever.targetKg + " kg",
      "Tu as demandé à voir ce levier et tu as saisi la cible toi-même : on montre une SENSIBILITÉ, "
      + "jamais un objectif, et sans aucun rythme ni aucune consigne alimentaire — ce terrain revient "
      + "à un professionnel de santé, pas à un plan d'entraînement.");
  else if (refus)
    D("P9-garde", "Levier poids neutralisé", refus,
      "Ce levier ne s'affiche pas dans ce cas de figure. La priorité n°1 du manifeste est la santé, et "
      + "elle passe avant une optimisation de quelques pourcents.");

  return {
    applicable, horizonWeeks: Math.round(w * 10) / 10, adherence, gainPct, gainBand, gainSource,
    confidence, weightLever: lever, decisions,
  };
}

/**
 * P1 — L'ADHÉRENCE EST UNE FENÊTRE GLISSANTE, PAS UN POURCENTAGE DE PLAN.
 *
 * `pctLoad` (barre d'avancement) vaut `doneMin / totalMin` sur le plan ENTIER, futur compris :
 * 30 semaines parfaites sur 59 donnent 43 %, sous le seuil de 60 % qui resserrait la fourchette.
 * La condition était donc mécaniquement inatteignable en début de préparation et devenait vraie
 * en fin de plan pour une raison qui n'a rien à voir avec la régularité. Il reste ce qu'il est
 * pour la barre d'avancement, mais il ne pilote plus rien ici.
 *
 * Deux garde-fous sur la mesure elle-même :
 *  - seules les journées ÉCOULÉES comptent (une séance de mardi prochain n'est pas « ratée ») ;
 *  - AUCUN ✓ dans tout le plan → `null` (non jugeable) plutôt que 0. Quelqu'un qui n'utilise pas
 *    les coches n'est pas quelqu'un qui ne s'entraîne pas, et le manifeste interdit le reproche.
 */
function adherenceWindow(
  plan                                                                                                                                ,
  done                         ,
  todayISO        ,
  weeks = 6
)                {
  if (!done || Object.keys(done).length === 0) return null;
  const cut = new Date(Date.parse(todayISO + "T00:00:00Z") - weeks * 7 * 864e5).toISOString().slice(0, 10);
  let prescrit = 0, fait = 0;
  for (const wk of plan.weeks)
    for (const d of wk.days) {
      if (!d.date || d.date >= todayISO || d.date < cut) continue;
      d.sessions.forEach((s, si) => {
        if (s.d === "rs" || s.race) return; // le repos ne se « rate » pas, une course n'est pas une séance
        const min = Math.max(0, s.min || 0);
        prescrit += min;
        if (done[wk.num + "|" + d.jour + "|" + si]) fait += min;
      });
    }
  if (prescrit <= 0) return null;
  return Math.min(1, fait / prescrit);
}

/**
 * P4 — L'AFFÛTAGE EST-IL CONFORME ? Les trois critères de Bosquet 2007, vérifiés sur le plan
 * LIVRÉ et pas sur la présence d'une phase nommée « taper » : c'est la réduction réelle qui
 * produit le gain, pas l'étiquette. Le jour J lui-même est exclu du calcul (il porte `min: 0`
 * depuis R13.4 et fausserait la moyenne de la dernière semaine).
 */
function taperIsConform(plan   
                                                                                                                                 
 )          {
  const semaines = plan.weeks || [];
  if (!semaines.length) return false;
  const charge = (wk                           ) =>
    wk.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.race ? 0 : Math.max(0, s.min || 0)), 0), 0);
  const taper = semaines.filter((wk) => wk.phase && wk.phase.id === "taper");
  if (taper.length < 2 || taper.length > 3) return false; // Bosquet : 8-14 jours, ~3 semaines max
  const pic = Math.max(...semaines.filter((wk) => !taper.includes(wk)).map(charge), 0);
  if (pic <= 0) return false;
  // Réduction de 41 à 60 % du volume du pic, mesurée sur la MOYENNE des semaines d'affûtage :
  // c'est la dose totale d'affûtage qui compte, pas le creux d'une semaine isolée.
  const moy = taper.reduce((t, wk) => t + charge(wk), 0) / taper.length;
  const reduction = 1 - moy / pic;
  return reduction >= 0.41 && reduction <= 0.60;
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
                                           




/**
 * R14.1 — LA FORME PROJETÉE AU JOUR J, à côté de la forme actuelle (jamais à sa place).
 * L'UI affiche les deux, étiquetées : « Aujourd'hui : 4h00–4h15 » / « Projeté au 12/09/2027 :
 * 3h44–4h02 (confiance moyenne) ». Jamais un seul chiffre, jamais sans la date de référence.
 */
                                      
                      
                       
                    
                                                                      
                                                                                            
                                                                                                               
                                           
                                             
                                  
                    
                                                      
                          
                        
 
                             
                          
                                                               
                        
                                                                                                      
                                        
 
                              
                                                    
                       
                                                                                       
     
                                                                                   
                                                                                          
                                                                                               
     
                                                               
                                                                                       
                      
                                                                                              
                         
                                                                    
                                  
     
                                                                                        
                                                         
     
                           
                                                                                       
                               
     
                                                                                     
                                                                                         
     
                                                                       
 

// R6 — profil du parcours : un chrono à plat ne vaut rien sur un parcours vallonné.
// Facteurs de temps course à pied (littérature GAP/expérience course sur route) :
// vallonné ~+3–6 %, montagneux ~+8–15 % — appliqués en ÉLARGISSANT la fourchette
// (l'incertitude monte avec le relief, on ne fait pas semblant du contraire).
//
// R14.3-a — DEUX CHAMPS POUR LA MÊME IDÉE, ET DES CLÉS QUI NE SE RECOUVRAIENT PAS.
// Le jour J lisait `a.terrain` (domaine du schéma : … `montagne` …), la carte Prédiction
// lisait `answers.course_profile` (vocabulaire de l'UI : … `montagneux` …). `vallonne`
// tombait juste par coïncidence orthographique ; `montagne` ne tombait sur rien —
// mesuré sur le jour J d'un Ironman : plat 240 min, montagne 240 min, les +8 à +15 %
// disparaissaient EN SILENCE. Le même athlète pouvait lire deux chronos différents dans
// deux écrans de la même app.
//
// La table couvre désormais TOUT le domaine `terrain` du schéma, et `assertTerrainCovered()`
// (appelée par `build:app`) échoue si une valeur ajoutée au schéma n'y est pas classée :
// la règle « une seule source » est exécutable, pas un commentaire (même geste que R13.1).
                                                                       
const RELIEF                               = {
  plat: { lo: 1.0, hi: 1.0, label: "parcours plat" },
  vallonne: { lo: 1.03, hi: 1.06, label: "parcours vallonné" },
  montagne: { lo: 1.08, hi: 1.15, label: "parcours montagneux" },
};
/** Alias du vocabulaire UI (`course_profile`) vers le domaine du schéma (`terrain`). */
const RELIEF_ALIAS                         = { montagneux: "montagne", vallonné: "vallonne" };
/**
 * Valeurs de `terrain` qui décrivent une SURFACE et non un relief : elles ne disent rien
 * du dénivelé, donc elles ne corrigent rien. Les classer explicitement est le but — une
 * valeur non classée doit faire échouer le build, pas retomber sur « pas de correction ».
 */
const RELIEF_NEUTRAL = ["route", "piste", "mixte", "trail"]         ;

/** Résout le profil de parcours vers le domaine du schéma. `null` = pas de correction. */
function reliefOf(value         )                      {
  const k = String(value ?? "").trim();
  if (!k) return null;
  return RELIEF[RELIEF_ALIAS[k] || k] || null;
}

/**
 * R15.2 — LE RELIEF DESCEND LA CIBLE DE PUISSANCE (O-2 du registre, fermé).
 *
 * Mesuré avant correction : un 70.3 à plat et un 70.3 de montagne recevaient **175–191 W dans
 * les deux cas** — `TRI_BIKE` ne connaissait que le format. Le relief était traité pour la
 * course à pied depuis R6, jamais pour le vélo.
 *
 * Le mécanisme : sur parcours accidenté, le coût métabolique suit la puissance NORMALISÉE, et
 * NP s'écarte d'autant plus de la moyenne que le terrain est irrégulier. Viser la même bande
 * qu'à plat revient donc à rouler plus dur qu'on ne croit — et le prix se paie à pied. On
 * descend la cible, on nomme l'indice de variabilité, et on ne prédit toujours PAS de chrono
 * vélo (il dépend du parcours, on ne l'invente pas).
 *
 * Décalages d'IF (heuristique de praticiens, assumée comme telle) :
 *   plat 0 · vallonné −0,01 · montagneux −0,025
 * Même famille de risque que P6 (le pacing projeté) : c'est une règle de sécurité, pas un
 * affichage — partir à la puissance d'un parcours plat sur 2 500 m de D+ ne se rattrape pas.
 */
const RELIEF_BIKE_IF                         = { plat: 0, vallonne: -0.01, montagne: -0.025 };
function bikeIFShift(courseProfile         )         {
  const k = String(courseProfile ?? "").trim();
  return RELIEF_BIKE_IF[RELIEF_ALIAS[k] || k] ?? 0;
}

/**
 * R14.3-a — LE CHEMIN UNIQUE. `course_profile` (le parcours VISÉ, réponse la plus
 * spécifique, posée au Profil) prime ; à défaut on retombe sur `terrain` (le terrain
 * d'entraînement, qui est aussi la question « Le parcours » en vélo et duathlon).
 * Tous les appelants passent par ici — jour J compris.
 */
function courseProfileOf(a                                                 )                     {
  const explicite = String(a.course_profile ?? "").trim();
  if (explicite && reliefOf(explicite)) return explicite;
  const terrain = String(a.terrain ?? "").trim();
  return terrain || undefined;
}

/**
 * R18.2 — LE MILIEU DE NAGE. Ce n'est pas un relief, et ça ne se traite pas comme tel.
 *
 * La référence n'est PAS le bassin : `TRI_SWIM[format].factor` est calibré « peloton,
 * combinaison et navigation compris », donc sur de l'eau libre calme. Le lac vaut donc 1.00,
 * et le bassin est plus RAPIDE que la référence — se tromper de point d'ancrage aurait
 * ralenti tout le monde de 5 % en croyant corriger.
 *
 * `eau_vive` est le cas que le fondateur a cité, et c'est le plus intéressant : un courant
 * peut porter autant qu'il freine. Sa bande est donc ASYMÉTRIQUE ET LARGE, dans les deux
 * sens — on refuse de faire semblant de savoir de quel côté. Même honnêteté que RELIEF pour
 * la course, qui élargit au lieu de décaler.
 *
 * Heuristiques de praticiens, assumées comme telles : aucune de ces valeurs n'est mesurée,
 * et c'est écrit ici plutôt que sous-entendu.
 */
const SWIM_ENV                               = {
  bassin: { lo: 0.94, hi: 0.97, label: "bassin (pas de navigation, appuis aux murs)" },
  lac: { lo: 1.0, hi: 1.0, label: "lac / eau libre calme" },
  mer_calme: { lo: 1.01, hi: 1.05, label: "mer calme" },
  mer_agitee: { lo: 1.06, hi: 1.14, label: "mer agitée (houle, respiration contrariée)" },
  eau_vive: { lo: 0.95, hi: 1.2, label: "eau vive (courant)" },
};
/**
 * R19.2 — LA COMBINAISON. C'était le trou le plus large du modèle de natation.
 *
 * `water_temp_c` n'existait que pour le swimrun. En triathlon, rien : ni combinaison, ni seuil
 * de légalité. Or c'est la variable DOMINANTE du leg natation — 4 à 7 % de temps, et une
 * bascule RÉGLEMENTAIRE, pas continue. R18.2 avait ajouté par-dessus un raffinement de ±5 %
 * (mer calme vs mer agitée) sur un modèle où ce facteur-là manquait : l'ordre de grandeur
 * était inversé, on affinait le détail en ignorant le principal.
 *
 * `TRI_SWIM[format].factor` est calibré « combinaison comprise » : la référence PORTE donc la
 * combinaison. La correction va dans un seul sens — SANS combinaison, on est plus lent. C'est
 * le même piège d'ancrage que SWIM_ENV, et il se paie de la même façon si on l'inverse.
 *
 * Seuils : 24,5 °C est la borne haute commune (World Triathlon en âge-groupe, IRONMAN pour
 * l'éligibilité au classement) ; au-delà la combinaison est interdite. Sous 15 °C, elle
 * devient obligatoire et cesse de suffire à elle seule — c'est une question de sécurité, pas
 * de chrono, et le manifeste range la santé en premier : le moteur AVERTIT au lieu d'estimer.
 */
const WETSUIT = {
  id: "R19.2",
  maxLegalC: 24.5,
  coldWarnC: 15,
  /** Temps de nage SANS combinaison, la référence l'incluant. */
  sansCombinaison: { lo: 1.04, hi: 1.07 }                                             ,
};
/**
 * Bande de correction due à la combinaison. `null` = température non renseignée, donc aucune
 * correction — on ne devine pas une température d'eau à partir d'un format de course.
 */
function wetsuitBandOf(waterTempC         )                                                   {
  const t = typeof waterTempC === "number" ? waterTempC : parseFloat(String(waterTempC ?? ""));
  if (!isFinite(t)) return null;
  if (t > WETSUIT.maxLegalC)
    return { lo: WETSUIT.sansCombinaison.lo, hi: WETSUIT.sansCombinaison.hi, label: "eau à " + t + " °C : combinaison INTERDITE (>" + WETSUIT.maxLegalC + " °C)" };
  return { lo: 1, hi: 1, label: "eau à " + t + " °C : combinaison autorisée" };
}

function swimEnvOf(value         )                      {
  const k = String(value ?? "").trim();
  return k ? SWIM_ENV[k] || null : null;
}

/**
 * R18.2 — LE RÉSOLVEUR PAR DISCIPLINE, point unique.
 *
 * Trois niveaux, du plus précis au plus général : la réponse du LEG, puis le profil de course
 * global (`course_profile`), puis le terrain d'entraînement (`terrain`). C'est la même
 * cascade que `courseProfileOf`, prolongée d'un cran — pas un second vocabulaire.
 *
 * La nage ne retombe sur RIEN : le profil global décrit un relief, et un relief ne dit rien
 * d'un plan d'eau. Retomber dessus aurait produit un « lac montagneux » traité comme du plat.
 */
                                              
function legProfileOf(a                                                                                                                          , leg         )                     {
  if (leg === "swim") {
    const v = String(a.leg_swim_env ?? "").trim();
    return v && SWIM_ENV[v] ? v : undefined;
  }
  const propre = String((leg === "bike" ? a.leg_bike_prof : a.leg_run_prof) ?? "").trim();
  if (propre && reliefOf(propre)) return propre;
  return courseProfileOf(a);
}

/** Garde de build : toute valeur du domaine `terrain` est classée (relief ou neutre). */
function assertTerrainCovered(domain                   )       {
  const orphelines = domain.filter((v) => !RELIEF[v] && !(RELIEF_NEUTRAL                     ).includes(v));
  if (orphelines.length)
    throw new Error("R14.3-a : terrain « " + orphelines.join(", ") + " » n'est classé ni en relief "
      + "(RELIEF) ni en surface (RELIEF_NEUTRAL) dans predictor.ts — une valeur non classée "
      + "retomberait silencieusement sur « pas de correction », et c'est exactement le défaut "
      + "que « montagne » a fait vivre.");
}

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
/**
 * O-11 / R20.5 — « L'ALLURE COURSE À VÉLO » N'A PLUS QU'UNE SEULE DÉFINITION.
 *
 * Le moteur en portait DEUX, et la zone d'entraînement était la plus dure des deux :
 *
 * | source | « allure course » vélo |
 * |---|---|
 * | `ZDEF["bk.rp"]` (la zone prescrite à l'entraînement) | **0,80–0,88 × FTP, quel que soit le format** |
 * | `TRI_BIKE["Full"]` (la cible du jour J) | **0,70–0,76 × FTP** |
 *
 * Sur un Ironman, une séance nommée « Rappel race-pace » faisait donc rouler **~15 % au-dessus
 * de l'intensité que le moteur prescrit lui-même pour la course** — et sur un sprint, l'inverse
 * (0,80–0,88 contre 0,85–0,93 le jour J : la séance était plus FACILE que la course). Une zone
 * figée ne peut pas décrire un effort dont la durée va de 30 minutes à six heures.
 *
 * C'est le même défaut que R15.2 a corrigé pour le relief, à un autre endroit du même chemin :
 * deux producteurs du même nombre finissent toujours par diverger. Il n'y a donc plus qu'un
 * point — celui-ci — et la zone `bk.rp` le lit.
 *
 * La pré-fatigue du duathlon est INCLUSE : le nombre que l'athlète doit apprendre à tenir est
 * celui de sa course, pas celui d'un contre-la-montre frais. Le relief (`bikeIFShift`) n'est PAS
 * inclus ici — il s'applique en aval, au même endroit pour la prédiction et pour la séance.
 */
function raceBikeBand(sport        , format                    )                                    {
  const f = String(format ?? "");
  if (sport === "tri") return TRI_BIKE[f] ?? null;
  if (sport === "bike") { const b = BIKE_POWER[f]; return b ? { lo: b.lo, hi: b.hi } : null; }
  if (sport === "duathlon") {
    const pw = DUA_BIKE_POWER[f];
    if (!pw) return null;
    const pf = DUA_BIKE_PREFATIGUE[f] ?? 0.97;
    return { lo: pw.lo * pf, hi: pw.hi * pf };
  }
  return null;
}

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

/**
 * R14 — P5 : L'EXPOSANT DE RIEGEL SUIT LE VOLUME.
 *
 * Il était figé à 1,06. Mesuré : deux athlètes de MÊME allure seuil, l'un à 4 h/semaine,
 * l'autre à 14 h, recevaient le même marathon prédit (3 h 32). Or c'est précisément le
 * volume qui gouverne la tenue de la distance — Vickers & Vertosick (BMC Sports Sci Med
 * Rehabil 2016, N=2303) montrent que Riegel sous-estime le marathon d'au moins 10 min pour
 * la moitié des coureurs, et que le kilométrage hebdomadaire est un prédicteur MAJEUR
 * (MSE 208 contre 381 pour Riegel en validation).
 *
 * Ancrages (calibration empirique de calculateurs, pas une étude princeps — heuristique
 * assumée), interpolés linéairement et bornés :
 *   ≥ 12 h/sem → 1,04 · 10 h → 1,06 · 6,5 h → 1,09 · ≤ 4 h → 1,12
 *
 * ⚠ N'EST APPLIQUÉ QU'À L'EXTRAPOLATION D'UNE COURSE SÈCHE. Les legs course du triathlon et
 * du duathlon gardent 1,06 : leurs facteurs `fatigue` (1,03 à 1,13 selon le format) ont été
 * calibrés CONTRE cet exposant, et bouger l'exposant sous eux recalibrerait silencieusement
 * une table validée — on compterait deux fois la même difficulté.
 */
const RIEGEL_ANCRES                     = [[4, 1.12], [6.5, 1.09], [10, 1.06], [12, 1.04]];
function riegelExponent(runHoursPerWeek         )         {
  const h = Number(runHoursPerWeek);
  if (!Number.isFinite(h) || h <= 0) return 1.06; // pas de volume connu → comportement historique
  if (h <= RIEGEL_ANCRES[0][0]) return RIEGEL_ANCRES[0][1];
  const last = RIEGEL_ANCRES[RIEGEL_ANCRES.length - 1];
  if (h >= last[0]) return last[1];
  for (let i = 1; i < RIEGEL_ANCRES.length; i++) {
    const [h0, e0] = RIEGEL_ANCRES[i - 1], [h1, e1] = RIEGEL_ANCRES[i];
    if (h <= h1) return e0 + ((e1 - e0) * (h - h0)) / (h1 - h0);
  }
  return 1.06;
}

/** Riegel : temps sur D depuis l'allure seuil (tenable ~1h), t = 3600 × (D/D₁ₕ)^exp */
function riegelSecWith(exp        , thrPaceSecPerKm        , distKm        )         {
  const d1h = 3600 / thrPaceSecPerKm;
  return 3600 * Math.pow(distKm / d1h, exp);
}

/** Minutes → « 9h20 » : une durée de trail se lit en heures, pas en minutes. */
function fmtHM(min        )         {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h > 0 ? h + "h" + String(m).padStart(2, "0") : m + "min";
}

/**
 * Un item porte-t-il un TEMPS ? Seuls les temps se projettent (R14 P6) : une cible de
 * puissance (« 159–173 W ») ou de vitesse ascensionnelle reste ancrée sur la référence
 * MESURÉE. Les formats produits par `fmtT`/`fmtHM` : « 4h08 », « 38'20 », « 45min ».
 */
const EST_UN_TEMPS = /^\s*\d+\s*(h\d+|'\d+|min)\s*[–-]/;

/** Le calcul complet des items, rejouable à d'autres références et à une autre fourchette. */
                      
                                                      
                 
                         
 

function predictRace(
  sport        ,
  format        ,
  intent                    ,
  refs                                               ,
  opts              = {}
)             {
  const decisions             = [];
  const D = (id        , what        , val        , why        ) => decisions.push({ id, what, val, why });
  // R19.2 — conseils émis AVANT le rendu (sécurité liée à l'eau) : ils ne dépendent d'aucune
  // référence chiffrée, donc ils doivent sortir même quand la prédiction refuse de projeter.
  // Ils sont placés EN TÊTE de la liste : une consigne d'hypothermie passe avant un conseil
  // de pacing.
  const advice0           = [];

  // Fourchette : ±3% de base ; ±2% si le plan est bien suivi ; décalée +3% en mode finisher.
  const followed = (opts.pctLoad ?? 0) >= 60 && (opts.streakWeeks ?? 0) >= 3;
  const shift = intent === "finir" ? 0.03 : 0;
  if (followed) D("PRED-forme", "Fourchette resserrée", "±2%", "Plan bien suivi (streak ≥3 semaines, charge accomplie ≥60%) : la projection est plus fiable");
  if (shift > 0) D("PRED-finisher", "Pacing conservateur", "+3%", "Objectif finisher : on vise l'arrivée en forme, pas la marge d'erreur");
  // R18.2 — chaque leg lit SON profil ; à défaut, le profil global. Un triathlon n'est pas
  // homogène : nager en eau vive, rouler en montagne et courir à plat, ce sont trois
  // corrections indépendantes, et une clé unique en appliquait une troisième, fausse pour
  // les trois. Les sports mono-discipline ne passent pas de `legProfiles` : rien ne bouge.
  const legs = opts.legProfiles || {};
  // Fourchette COURSE À PIED avec profil de parcours (R6) — le relief élargit et décale.
  const prof = reliefOf(legs.run ?? opts.courseProfile);
  if (prof && prof.hi > 1) D("PRED-parcours", "Profil du parcours", prof.label, "Le relief ralentit et augmente l'incertitude : fourchette ×" + prof.lo + "–" + prof.hi + " sur les temps de course à pied");
  const profWhy = prof && prof.hi > 1 ? " · " + prof.label + " (+" + Math.round((prof.lo - 1) * 100) + "–" + Math.round((prof.hi - 1) * 100) + "%)" : "";
  // R15.2 — décalage d'IF vélo et sa justification, calculés UNE fois pour les trois sports
  // qui prescrivent des watts (tri, vélo, duathlon).
  // R18.2 — le milieu de nage. Aucun repli sur le profil global : un relief ne décrit pas
  // un plan d'eau (voir SWIM_ENV).
  const milieu = swimEnvOf(legs.swim);
  const comb = wetsuitBandOf(opts.waterTempC);
  // Les deux se COMPOSENT : un plan d'eau agité sans combinaison cumule les deux pénalités.
  // Les multiplier plutôt que prendre le pire est le choix honnête — ce sont deux causes
  // physiquement indépendantes (flottaison d'un côté, navigation et respiration de l'autre).
  const swimEnv                      = (milieu || comb)
    ? { lo: (milieu ? milieu.lo : 1) * (comb ? comb.lo : 1),
        hi: (milieu ? milieu.hi : 1) * (comb ? comb.hi : 1),
        label: [milieu ? milieu.label : null, comb && comb.lo !== 1 ? comb.label : null].filter(Boolean).join(" · ") || (comb ? comb.label : "") }
    : null;
  const swimWhy = swimEnv && (swimEnv.lo !== 1 || swimEnv.hi !== 1)
    ? " · " + swimEnv.label + " (×" + Math.round(swimEnv.lo * 100) / 100 + "–" + Math.round(swimEnv.hi * 100) / 100 + ")"
    : "";
  // SÉCURITÉ avant chrono : sous 15 °C, on ne raffine pas une estimation, on prévient.
  {
    const t = typeof opts.waterTempC === "number" ? opts.waterTempC : parseFloat(String(opts.waterTempC ?? ""));
    if (isFinite(t) && t < WETSUIT.coldWarnC)
      advice0.push("🌡 Eau à " + t + " °C. En dessous de " + WETSUIT.coldWarnC + " °C, la combinaison est obligatoire et ne suffit plus à elle seule : choc thermique à l'entrée, hyperventilation, extrémités qui lâchent. Fais au moins deux nages d'acclimatation en eau à cette température AVANT la course, avec bonnet néoprène, et n'y va jamais seul. Ce n'est pas une question de chrono.");
    if (isFinite(t) && t > WETSUIT.maxLegalC)
      advice0.push("🌡 Eau à " + t + " °C : au-delà de " + WETSUIT.maxLegalC + " °C la combinaison est interdite. Deux conséquences : tu nageras 4 à 7 % moins vite que l'estimation d'une nage en combinaison, et le risque bascule vers l'hyperthermie — entraîne-toi sans combinaison au moins une fois par semaine dans les six dernières semaines.");
  }
  if (swimEnv && (swimEnv.lo !== 1 || swimEnv.hi !== 1))
    D("R18.2-nage", "Milieu de nage", swimEnv.label,
      swimEnv.lo < 1 && swimEnv.hi > 1
        ? "Un courant peut porter autant qu'il freine : la fourchette s'élargit DANS LES DEUX SENS plutôt que de décaler dans un sens qu'on ne connaît pas."
        : swimEnv.hi < 1
          ? "En bassin il n'y a ni navigation ni houle, et les murs rendent du temps : la référence d'eau libre est trop lente ici."
          : "La navigation, la houle et la respiration contrariée coûtent du temps : la fourchette monte et s'élargit.");
  const ifShift = bikeIFShift(legs.bike ?? opts.courseProfile);
  const bikeWhy = ifShift < 0
    ? " · cible ABAISSÉE de " + Math.round(-ifShift * 100) + " points pour le relief : sur un parcours "
      + "accidenté le coût suit la puissance NORMALISÉE et non la moyenne, et l'indice de variabilité "
      + "(IV = NP ÷ moyenne) monte vite. Rouler la bande du plat ici revient à rouler plus dur qu'on ne "
      + "croit — ça se paie à pied, pas sur le vélo"
    : "";
  if (ifShift < 0)
    D("R15.2", "Relief du parcours vélo", (reliefOf(legs.bike ?? opts.courseProfile) || { label: "accidenté" }).label + " → IF " + (ifShift * 100).toFixed(1) + " pt",
      "Le chrono vélo n'est pas prédit (il dépend du parcours), mais la CIBLE D'INTENSITÉ, elle, doit "
      + "descendre : à puissance moyenne égale, un parcours vallonné coûte plus cher qu'un parcours plat.");
  // R14 P5 — l'exposant de Riegel suit le volume, et SEULEMENT pour une course sèche :
  // les legs course du tri/duathlon portent déjà leurs facteurs de fatigue calibrés à 1,06.
  const expo = sport === "run" ? riegelExponent(opts.runHoursPerWeek) : 1.06;
  if (sport === "run" && expo !== 1.06)
    D("P5", "Tenue de la distance", "exposant de Riegel " + expo.toFixed(3),
      "L'extrapolation entre distances dépend du VOLUME, pas seulement de l'allure : à volume élevé "
      + "on tient mieux la distance, à petit volume la fin coûte plus cher. Riegel figé à 1,06 donnait "
      + "le même marathon à 4 h et à 14 h de course par semaine — Vickers & Vertosick (2016, N=2303) "
      + "montrent que le kilométrage hebdomadaire est un prédicteur majeur.");

  const render = (args            )                                                                                                 => {
    const items                   = [];
    const advice           = [];
    const dec             = [];
    const Dloc = (id        , what        , val        , why        ) => dec.push({ id, what, val, why });
    const spread = args.spread;
    const refs = args.refs;
    // R14.1 — LE MILIEU EXACT DE CHAQUE ITEM DE TEMPS, capté au vol.
    // La fourchette projetée se construit à partir du milieu de la fourchette ACTUELLE ; le
    // relire dans la chaîne formatée serait fragile. `range`/`runRange` sont appelés juste
    // avant le `items.push()` de leur item, donc `items.length` EST son futur index.
    const mid = new Map                ();
    const note = (lo        , hi        ) => { mid.set(items.length, (lo + hi) / 2); };
    const range = (sec        ) => {
      const lo = sec * (1 + shift - spread), hi = sec * (1 + shift + spread);
      note(lo, hi);
      return fmtT(lo) + "–" + fmtT(hi);
    };
    const runRange = (sec        ) => {
      if (!prof) return range(sec);
      const lo = sec * prof.lo * (1 + shift - spread), hi = sec * prof.hi * (1 + shift + spread);
      note(lo, hi);
      return fmtT(lo) + "–" + fmtT(hi);
    };
    // R18.2 — même forme que `runRange` : le milieu de nage élargit la fourchette au lieu de
    // décaler un chiffre. Sans réponse, c'est `range` — donc rien ne bouge pour l'existant.
    const swimRange = (sec        ) => {
      if (!swimEnv) return range(sec);
      const lo = sec * swimEnv.lo * (1 + shift - spread), hi = sec * swimEnv.hi * (1 + shift + spread);
      note(lo, hi);
      return fmtT(lo) + "–" + fmtT(hi);
    };
    const riegelSec = (paceSecPerKm        , distKm        ) => riegelSecWith(expo, paceSecPerKm, distKm);
    // R15.2 — la bande d'IF vélo passe par le MÊME résolveur de parcours que la course
    // (`courseProfileOf` en amont) : une seule clé, donc pas de « montagne vs montagneux » 2.0.
    const bikeIF = (lo        , hi        )                   => [
      Math.max(0.3, lo + ifShift), Math.max(0.32, hi + ifShift),
    ];

  // ---- R7 TRAIL : Riegel est INAPPLICABLE (un km de trail n'est pas un km de route).
  // Modèle à deux composantes : temps à plat + temps vertical (VAM), pénalisés par la
  // technicité et la nuit. Fourchette LARGE et annoncée comme telle : sur un ultra, ±20%
  // est une estimation honnête — afficher une fourchette serrée serait le mensonge.
  if (sport === "trail" && args.trail) {
    const obj = args.trail;
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
    Dloc("PRED-trail", "Méthode trail", "temps à plat + temps vertical (VAM)", "Riegel ne s'applique pas au trail : on additionne le temps horizontal et le temps d'ascension, puis on pénalise selon la technicité (" + tech.label + ") et la nuit");
    return { items, advice, decisions: dec, mid };
  }

  // R10 phase 1 — DISPATCH : chaque sport porte SA méthode de prédiction dans son module
  // (`src/sports/<sport>/`). Ce qui reste ici est commun : fourchettes, profil de parcours,
  // formatage, journal de décisions. Un sport sans méthode ne PRÉDIT RIEN plutôt que de
  // sortir un chiffre inventé — la fourchette honnête est la seule sortie acceptable.
  const mod = sportModule(sport);
  if (mod.predict) {
    mod.predict({ format, refs, items, advice, D: Dloc, range, runRange, swimRange, riegelSec, profWhy, swimWhy, bikeIF, bikeWhy,
      legBands: {
        swim: swimEnv ? [swimEnv.lo, swimEnv.hi] : null,
        run: prof && prof.hi > 1 ? [prof.lo, prof.hi] : null,
      },
      swimrun: opts.swimrun });
  } else {
    advice.push("La prédiction de temps n'est pas encore disponible pour ce sport : nous préférons ne rien afficher plutôt qu'un chiffre que nous ne pourrions pas défendre.");
  }

    return { items, advice, decisions: dec, mid };
  };

  // ---- FORME ACTUELLE — la vérité mesurée, l'ancre. Elle ne bouge pas (R14, non-régression).
  const spreadNow = followed ? 0.02 : 0.03;
  const now = render({ refs, spread: spreadNow, trail: opts.trail });
  decisions.push(...now.decisions);

  return {
    items: now.items,
    advice: [...advice0, ...now.advice],
    decisions,
    projected: buildProjection(sport, refs, opts, now, render),
  };
}

/**
 * R14 — LA FORME PROJETÉE. Le même prédicteur, rejoué sur des références projetées et une
 * fourchette élargie. Trois refus possibles, tous motivés, jamais un chiffre inventé :
 *  - pas d'entrées de projection (appelant qui n'en fournit pas) → `null` ;
 *  - aucune référence mesurée (P8) → `applicable: false`, items vides ;
 *  - horizon trop lointain pour une fourchette utile (P7) → `applicable: false`.
 */
function buildProjection(
  sport        ,
  refs                                               ,
  opts             ,
  now                                                       ,
  render                                                                                                                   ,
)                             {
  const input = opts.projection;
  if (!input) return null;
  const itemsNow = now.items;

  const p = projectForm(input);
  const vide = { applicable: false, horizonWeeks: p.horizonWeeks, adherence: p.adherence, gainPct: p.gainPct,
    gainBand: p.gainBand, gainSource: p.gainSource, confidence: p.confidence, weightLever: p.weightLever,
    raceDate: input.raceDate, refs, items: []                    , decisions: p.decisions };

  // P8 — AUCUNE PROJECTION SANS MATIÈRE. Sans référence mesurée, la « forme actuelle » n'a
  // déjà rien à dire ; projeter une valeur inventée serait construire un chrono sur du vent.
  if (!(refs.ftp > 0) && !(refs.thrPace > 0) && !(refs.css > 0)) {
    p.decisions.push({ id: "P8", what: "Pas de projection", val: "aucune référence mesurée",
      why: "Nous ne projetons rien tant qu'aucune référence n'est connue : un chrono construit sur "
        + "une valeur inventée serait un chiffre présentable et faux. Fais un test (les protocoles "
        + "sont dans l'app) et la projection apparaîtra." });
    return vide;
  }
  if (!p.applicable) return vide;

  // Les références projetées. L'allure seuil est un TEMPS au kilomètre : progresser la fait
  // BAISSER — l'erreur de signe ici donnerait un athlète qui ralentit en s'entraînant.
  const projRefs = {
    ftp: refs.ftp > 0 ? Math.round(refs.ftp * (1 + p.gainPct.ftp)) : 0,
    thrPace: refs.thrPace > 0 ? refs.thrPace / (1 + p.gainPct.thrPace) : 0,
    css: refs.css > 0 ? refs.css / (1 + p.gainPct.css) : 0,
  };
  const trailProj = opts.projectTrail ? opts.projectTrail(p.gainPct.vam, p.gainPct.thrPace) : opts.trail;
  // Rejeu au gain de RÉFÉRENCE, sans fourchette : on ne veut de ce passage que le déplacement
  // du milieu. La fourchette, elle, est construite ci-dessous — et elle est asymétrique.
  const fut = render({ refs: projRefs, spread: 0, trail: trailProj });

  let ancres = 0;
  const items                   = [];
  fut.items.forEach((it, i) => {
    const ref = itemsNow[i] && itemsNow[i].leg === it.leg ? itemsNow[i] : itemsNow.find((x) => x.leg === it.leg);
    const mNow = now.mid.get(i), mFut = fut.mid.get(i);

    // ---- Item de TEMPS : fourchette ASYMÉTRIQUE autour de la forme d'aujourd'hui (R14.1 §2)
    if (mNow != null && mFut != null && mNow > 0) {
      // Le gain en TEMPS, tel que le prédicteur du sport le produit réellement (Riegel, facteur
      // CSS, fatigue post-vélo…) : on ne le re-dérive pas d'une seconde formule.
      const gTime = Math.max(0, 1 - mFut / mNow);
      const loT = mNow * (1 - Math.min(0.95, GAIN_BAND_HI * gTime)); // le plus rapide plausible
      const hiT = mNow * (1 - GAIN_BAND_LO * gTime);                 // « presque rien gagné »
      items.push({ leg: it.leg, value: fmtT(loT) + "–" + fmtT(hiT),
        why: it.why + " · au pire, ta forme d'aujourd'hui : un plan suivi ne rend pas plus lent, il "
          + "peut seulement rapporter moins que prévu (sur 483 sujets au même programme, 7 % n'ont "
          + "presque rien gagné et 8 % énormément — HERITAGE)." });
      return;
    }

    // ---- Item de PACING : P6, jamais projeté. Mais on cesse de le faire passer pour une
    // projection : la cible ancrée et la référence projetée deviennent DEUX lignes (R14.1 §3).
    // Sans ça, la moitié du temps de course d'un 70.3 est invisible dans la projection, et
    // l'athlète en conclut — à raison — que l'outil ne prévoit aucun progrès.
    if (!ref) { items.push(it); return; }
    ancres++;
    items.push({ leg: ref.leg + " — cible jour J", value: ref.value,
      why: ref.why + " · ANCRÉE sur ta référence mesurée d'aujourd'hui : elle ne bougera qu'à ton "
        + "prochain test. Partir à l'intensité qu'on espère avoir se paie toujours dans le dernier "
        + "tiers de la course." });
    const w = /^\s*(\d+)\s*[–-]\s*(\d+)\s*W\s*$/.exec(ref.value);
    if (w && refs.ftp > 0) {
      const [lo, hi] = p.gainBand.ftp;
      const ftpLo = Math.round(refs.ftp * (1 + lo)), ftpHi = Math.round(refs.ftp * (1 + hi));
      const cibLo = Math.round(+w[1] * (1 + lo)), cibHi = Math.round(+w[2] * (1 + hi));
      items.push({ leg: ref.leg + " — FTP projetée", value: ftpLo + "–" + ftpHi + "W",
        why: "À ce niveau, la cible du jour J deviendrait " + cibLo + "–" + cibHi + "W. Elle ne se "
          + "débloque pas toute seule : refais un test de FTP et le plan s'y recalera. C'est la moitié "
          + "du temps de course — la voir progresser est le vrai retour de ces semaines." });
    }
  });
  if (ancres > 0)
    p.decisions.push({ id: "P6", what: "Intensités non projetées", val: ancres + " cible(s) ancrée(s)",
      why: "Le temps se projette, l'intensité s'ancre. Une cible de puissance ou d'allure calculée sur "
        + "la forme qu'on ESPÈRE avoir fait partir trop vite le jour J ; celle-ci reste calée sur ta "
        + "dernière mesure réelle, et la référence projetée est affichée à côté, séparément." });

  // Un sport dont TOUS les items sont des cibles d'intensité (le vélo : on prédit des watts,
  // jamais un chrono qui dépend du parcours) n'a pas de chrono à projeter — et le dire vaut
  // mieux que d'afficher une projection sans expliquer pourquoi elle ne bouge pas.
  if (!items.some((it) => EST_UN_TEMPS.test(it.value))) {
    p.decisions.push({ id: "P6-sans-chrono", what: "Rien à projeter", val: "ce sport prédit des cibles, pas un temps",
      why: "Ici nous prédisons des puissances cibles, pas un chrono (il dépend du parcours, du vent et "
        + "du peloton) — et une cible ne se projette jamais (P6). Ta progression apparaît dans ta FTP "
        + "projetée et dans tes retests, pas dans une prédiction de course." });
    return { ...vide, applicable: false, refs: projRefs, items, decisions: p.decisions };
  }

  return {
    applicable: true, horizonWeeks: p.horizonWeeks, adherence: p.adherence, gainPct: p.gainPct,
    gainBand: p.gainBand, gainSource: p.gainSource, confidence: p.confidence, weightLever: p.weightLever,
    raceDate: input.raceDate, refs: projRefs, items, decisions: p.decisions,
  };
}

// ===== src/engine/feasibility.ts =====
/**
 * feasibility — LE RAISONNEMENT INVERSE (prototype, course à pied).
 *
 * Le moteur construit EN AVANT : d'où tu pars (rampe R10), jusqu'où la courbe peut monter.
 * Ce module prend le problème par l'autre bout — une épreuve, un chrono visé — et déroule à
 * reculons ce que ça EXIGE, jusqu'à aujourd'hui.
 *
 * CE QU'IL NE FAIT PAS, ET C'EST LA RAISON D'ÊTRE DU MODULE :
 * il ne construit AUCUN plan et ne touche à AUCUN plafond. Le chrono visé n'entre que dans un
 * VERDICT. Tout R14/R14.1 existe pour que la performance soit une SORTIE estimée et jamais une
 * cible qui construit — P6 le résume : « le temps se projette, l'intensité s'ancre ». Laisser un
 * objectif de temps augmenter une charge, ce serait la priorité n°5 du manifeste qui écrase les
 * quatre premières. La garde `RV-INVARIANT` mesure cette propriété : le plan émis doit être
 * identique au bit près avec et sans objectif de temps.
 *
 * AUCUN MODÈLE NOUVEAU. Chaque étape INVERSE un modèle déjà sourcé et déjà audité :
 *   · Riegel avec l'exposant piloté par le volume (P5) → allure seuil requise ;
 *   · le modèle de gain P2bis (G∞ = G_plafond × h(marge mesurée) × k_structure × f_volume,
 *     saturant en TAU_WEEKS) → ce que l'horizon disponible peut produire.
 * Un second modèle de performance serait un second jeu de vérités : c'est précisément ce que
 * R11.1, R20.5 et U9 interdisent ailleurs dans le moteur.
 */


/** Distances de référence des formats de course à pied, en km. */
const RUN_DIST_KM                         = { "5k": 5, "10k": 10, semi: 21.0975, marathon: 42.195 };

/**
 * RG — LE RÉGIME DÉBUTANT est né ICI, dans ce prototype, et il N'Y VIT PLUS.
 *
 * Il a été écrit d'abord en local, sous portée limitée : « ces constantes ne touchent pas
 * `projection.ts` ; un prototype apprend, le produit ne change que sur décision ». La décision
 * a été prise — le régime est devenu **P11** dans `src/engine/projection.ts`, avec sa
 * justification complète, sa calibration confrontée à une trajectoire réelle et ses gardes CI.
 *
 * Ce module l'IMPORTE donc, et n'en garde aucune copie. Deux tables identiques dans deux
 * fichiers, c'est exactement ce que R11.1, R20.5 et U9 interdisent ailleurs dans le moteur : le
 * jour où la calibration bouge d'un côté, l'autre continue de répondre l'ancien chiffre — et
 * c'est le diagnostic, celui que l'athlète lit AVANT de s'engager, qui mentirait.
 *
 * Une seule chose reste locale : la LECTURE du volume. La projection lit `volRecentH` (toutes
 * disciplines confondues) ; ici la question est la course à pied, donc `runHoursPerWeek`.
 */

                                   
                                                                    
                                                             
                                                                    
                                                                      
                                                                                       
                                                                                  
                           
                      
                      
                                    
                   
 

                                                                                                             

                                    
                              
                                                                                        
                                      
                                                                                       
                            
                                                                                        
                               
                                                                                            
                             
                                                                                 
                             
                                                                       
                              
                        
                                                        
                
 

const fmtTime = (sec        )         => {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h > 0 ? h + "h" + String(m).padStart(2, "0") + "'" + String(r).padStart(2, "0") : m + "'" + String(r).padStart(2, "0");
};
const fmtPace = (secPerKm        )         => {
  const s = Math.round(secPerKm);
  return Math.floor(s / 60) + "'" + String(s % 60).padStart(2, "0") + "/km";
};

/**
 * RV1 — L'INVERSION DE RIEGEL, en forme close.
 * `riegelSecWith` fait T = 3600 × (D / d1h)^e avec d1h = 3600/allure. On isole l'allure :
 *   d1h = D / (T/3600)^(1/e)   →   allure = 3600 × (T/3600)^(1/e) / D
 * Aucune recherche numérique, donc aucune tolérance à régler et aucun cas de non-convergence.
 */
function requiredThresholdPace(targetSec        , distKm        , exponent        )                {
  if (!(targetSec > 0) || !(distKm > 0) || !(exponent > 0)) return null;
  return (3600 * Math.pow(targetSec / 3600, 1 / exponent)) / distKm;
}

/** Le chrono qu'une allure seuil donnée permet — le sens direct, pour rendre le verdict lisible. */
function timeFromThresholdPace(thrPaceSecPerKm        , distKm        , exponent        )         {
  const d1h = 3600 / thrPaceSecPerKm;
  return 3600 * Math.pow(distKm / d1h, exponent);
}

function assessFeasibility(input                  )                    {
  const decisions             = [];
  const D = (id        , what        , val        , why        ) => decisions.push({ id, what, val, why });
  const vide = (human        )                    => ({
    verdict: "indeterminable", requiredPaceSecPerKm: null, gainNeeded: null, gainAvailable: null,
    gainCeiling: null, weeksNeeded: null, reachableSec: null, decisions, human,
  });

  const dist = RUN_DIST_KM[input.format];
  if (!dist) return vide("Format de course inconnu — aucun verdict.");
  if (!(input.thrPaceSecPerKm > 0))
    return vide("Sans allure seuil mesurée, on ne peut rien dire de ton objectif — et te répondre quand même serait inventer.");
  if (!(input.targetSec > 0)) return vide("Aucun chrono visé.");

  // ---- RV1 : ce que le chrono visé EXIGE, en allure seuil ----
  const expo = riegelExponent(input.runHoursPerWeek ?? undefined);
  const paceReq = requiredThresholdPace(input.targetSec, dist, expo);
  if (paceReq == null) return vide("Chrono ou distance hors domaine.");
  D("RV1", "Allure seuil requise le jour J", fmtPace(paceReq),
    "Riegel inversé, avec l'exposant piloté par ton volume (" + expo.toFixed(3) + ", règle P5) — c'est le "
    + "MÊME modèle que celui qui te prédit ton chrono, lu dans l'autre sens. Aucun second modèle : "
    + "deux modèles de performance, ce serait deux vérités.");

  // ---- RV2 : l'écart avec ce que tu es aujourd'hui ----
  const gainNeeded = 1 - paceReq / input.thrPaceSecPerKm;
  D("RV2", "Écart à combler", (gainNeeded * 100).toFixed(1) + " %",
    "Ton allure seuil mesurée est " + fmtPace(input.thrPaceSecPerKm) + " ; l'objectif en demande "
    + fmtPace(paceReq) + ". C'est de ça qu'on parle — pas d'un pourcentage de motivation.");

  if (gainNeeded <= 0) {
    const dejaSec = timeFromThresholdPace(input.thrPaceSecPerKm, dist, expo);
    D("RV6", "Verdict", "déjà atteint", "Ta forme actuelle tient déjà ce chrono.");
    return {
      verdict: "atteignable", requiredPaceSecPerKm: paceReq, gainNeeded, gainAvailable: null,
      gainCeiling: null, weeksNeeded: 0, reachableSec: dejaSec, decisions,
      human: "Ta forme d'aujourd'hui tient déjà cet objectif (elle donne " + fmtTime(dejaSec) + "). "
        + "Le plan sert alors à consolider et à arriver frais, pas à combler un écart.",
    };
  }

  // ---- RV3 : ce que ce profil peut produire, mêmes règles que la projection ----
  const refs = { ftp: 0, thrPace: input.thrPaceSecPerKm, css: 0 };
  const marge = margeOf("thrPace", refs, input.weightKg, input.sex, input.age);
  if (marge == null) return vide("Marge non calculable sur ton allure — pas de verdict inventé.");
  const { k } = structureFactor(input.trainingStructure, input.history);
  const fVol = volumeFactor(input.prescribedMeanH, input.runHoursPerWeek) ?? 1;
  // RG — le régime interpole ENTRE les deux modèles, il n'en choisit pas un.
  const rg = regimeDebutant(input.runHoursPerWeek);
  const plafondDisc = G_PLAFOND.thrPace + rg * (G_PLAFOND_DEBUTANT.thrPace - G_PLAFOND.thrPace);
  const capAbsolu = GAIN_MAX_ABSOLU + rg * (RG_GAIN_MAX_DEBUTANT - GAIN_MAX_ABSOLU);
  const tau = TAU_WEEKS + rg * (RG_TAU_DEBUTANT - TAU_WEEKS);
  const gInf = Math.min(capAbsolu, plafondDisc * marge * k * fVol);
  D("RV3", "Gain maximal de ton profil", (gInf * 100).toFixed(1) + " %",
    "G∞ = plafond de la discipline (" + (plafondDisc * 100).toFixed(0) + " %) × ta marge MESURÉE ("
    + (marge * 100).toFixed(0) + " %) × structure (" + k.toFixed(2) + ") × volume (" + fVol.toFixed(2) + ")."
    + (rg > 0.05
      ? " Ton volume récent (" + (input.runHoursPerWeek ?? 0) + " h/sem) te place " + (rg >= 0.95 ? "dans" : "près du")
        + " RÉGIME DÉBUTANT : les premiers mois ne raffinent pas une économie de course déjà acquise, ils "
        + "construisent une base aérobie — ce n'est pas le même phénomène, donc pas la même borne. Le gain "
        + "y est aussi bien plus PRÉCOCE (τ = " + tau.toFixed(0) + " semaines contre " + TAU_WEEKS + " pour un entraîné). "
        + "Borne heuristique assumée, pas une mesure."
      : " Plafond de l'entraîné (Barnes & Kilding 2015, économie de course).")
    + " C'est une ASYMPTOTE : aucun horizon ne la dépasse.");

  // ---- RV4 : au-delà de ce que le modèle sait CHIFFRER (et non « impossible ») ----
  //
  // ERREUR CORRIGÉE, ET ELLE VAUT D'ÊTRE ÉCRITE. Ma première version concluait ici « quelle que
  // soit la durée de préparation » — c'est-à-dire qu'elle lisait `G_PLAFOND` comme un plafond de
  // CARRIÈRE. Or sa provenance dit exactement autre chose : Barnes & Kilding 2015 mesure ce que
  // gagne l'économie de course **sur un cycle**, et la projection l'utilise sur l'horizon d'UNE
  // préparation. Rien dans ce dépôt ne mesure « de combien cette personne peut progresser, un
  // jour ».
  //
  // Mesuré, avec la lecture fautive : un marathon de 4 h 01 visé en 3 h 30 sur 16 semaines —
  // objectif banal, atteint par des milliers de coureurs — sortait « impossible quel que soit
  // l'horizon ». Un verdict faux dans ce sens-là est pire que pas de verdict : il décourage
  // quelqu'un dont l'objectif tient debout.
  //
  // Même famille que R14.1 : une table lue comme décrivant ce qu'elle ne décrit pas. La
  // réponse honnête est celle que P7/P8 emploient déjà ailleurs — **refuser d'estimer**, en
  // disant pourquoi, plutôt que d'estimer mal.
  const gainAvecAffutage = (g        )         => Math.min(capAbsolu, g + TAPER_GAIN);
  if (gainNeeded > gainAvecAffutage(gInf)) {
    const surCycle = timeFromThresholdPace(input.thrPaceSecPerKm * (1 - gainAvecAffutage(gInf)), dist, expo);
    D("RV6", "Verdict", "hors de portée du modèle",
      "L'écart dépasse ce qu'un CYCLE de préparation sait produire. Le modèle ne dit pas que c'est "
      + "impossible : il dit qu'il ne sait pas le chiffrer, parce qu'aucune de ses sources ne "
      + "mesure une progression sur plusieurs saisons.");
    return {
      verdict: "hors-modele", requiredPaceSecPerKm: paceReq, gainNeeded, gainAvailable: gainAvecAffutage(gInf),
      gainCeiling: gInf, weeksNeeded: null, reachableSec: surCycle, decisions,
      human: "Cet objectif demande " + (gainNeeded * 100).toFixed(1) + " % de gain, quand **un cycle de "
        + "préparation** en produit au plus " + (gainAvecAffutage(gInf) * 100).toFixed(1) + " % pour ton profil. "
        + "Ça ne veut pas dire que c'est hors d'atteinte — ça veut dire que ça se joue sur **plusieurs saisons**, "
        + "et que ce modèle ne sait pas chiffrer ça honnêtement. Sur cette préparation-ci, ce qui est "
        + "défendable : **" + fmtTime(surCycle) + "**.",
    };
  }

  // ---- RV5 : combien de semaines il aurait fallu (inversion de la saturation) ----
  // g(w) = G∞ × (1 − e^(−w/τ)) + affûtage   →   w = −τ × ln(1 − (g − affûtage)/G∞)
  const cible = Math.max(0, gainNeeded - TAPER_GAIN);
  const ratio = cible / gInf;
  const weeksNeeded = ratio >= 1 ? null : Math.ceil(-tau * Math.log(1 - ratio));
  const w = Math.max(0, input.horizonWeeks);
  const gainAvailable = gainAvecAffutage(gInf * (1 - Math.exp(-w / tau)));
  const reachableSec = timeFromThresholdPace(input.thrPaceSecPerKm * (1 - gainAvailable), dist, expo);
  D("RV5", "Semaines nécessaires", weeksNeeded == null ? "aucun horizon ne suffit" : weeksNeeded + " semaines",
    "Inversion de la courbe de saturation (constante de temps " + tau.toFixed(0) + " semaines) : les premières "
    + "semaines rapportent bien plus que les dernières, donc doubler la durée ne double pas le gain.");
  D("RV4", "Ce que ton horizon rend accessible", fmtTime(reachableSec) + " (" + (gainAvailable * 100).toFixed(1) + " % de gain)",
    "Sur " + w + " semaines, affûtage conforme compris (+" + (TAPER_GAIN * 100).toFixed(1) + " %, Bosquet 2007).");

  if (weeksNeeded != null && weeksNeeded > w) {
    D("RV6", "Verdict", "hors horizon", "Atteignable, mais pas d'ici là.");
    return {
      verdict: "hors-horizon", requiredPaceSecPerKm: paceReq, gainNeeded, gainAvailable, gainCeiling: gInf,
      weeksNeeded, reachableSec, decisions,
      human: "Cet objectif est atteignable pour ton profil — mais il demande environ **" + weeksNeeded
        + " semaines** et il t'en reste **" + w + "**. D'ici la course, ce qui est honnête, c'est **"
        + fmtTime(reachableSec) + "**. Deux issues : viser ce chrono-là maintenant, ou garder l'objectif "
        + "pour une course dans " + (weeksNeeded - w) + " semaines de plus.",
    };
  }

  const marge_rel = (gainAvailable - gainNeeded) / Math.max(1e-9, gainNeeded);
  const juste = marge_rel < 0.15;
  D("RV6", "Verdict", juste ? "juste" : "atteignable",
    juste ? "L'objectif tient, mais sans marge : tout doit se passer bien." : "L'horizon couvre l'écart avec de la marge.");
  return {
    verdict: juste ? "juste" : "atteignable",
    requiredPaceSecPerKm: paceReq, gainNeeded, gainAvailable, gainCeiling: gInf,
    weeksNeeded: weeksNeeded ?? 0, reachableSec, decisions,
    human: juste
      ? "Cet objectif tient sur " + w + " semaines, **mais sans marge** : il demande "
        + (gainNeeded * 100).toFixed(1) + " % et l'horizon en donne " + (gainAvailable * 100).toFixed(1)
        + " %. Il faudra que la préparation se déroule bien — une blessure ou trois semaines creuses le mettent hors de portée."
      : "Cet objectif est **atteignable** : il demande " + (gainNeeded * 100).toFixed(1) + " % de gain, et "
        + w + " semaines t'en donnent " + (gainAvailable * 100).toFixed(1) + " %. Il te reste même de la marge — "
        + "ton horizon rend " + fmtTime(reachableSec) + " accessible.",
  };
}

// ===== src/readiness/readinessSource.ts =====
/**
 * Source de readiness ENFICHABLE — Sprint 2 (roadmap amendée).
 *
 * ⚠️ L'accès Garmin Health API (HRV/Body Battery/Training Readiness) est un programme
 * B2B sous agrément, non garanti. L'architecture rend la source interchangeable :
 *   1. Saisie manuelle (MVP, ici) — « comment as-tu dormi ? / FC du matin / énergie »
 *   2. Upload FIT (livré — `src/readiness/fitParser.ts`, import au Profil)
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
  assertImportSize("FIT", bytes.length); // S-8 — avant toute lecture
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
      const s                                                                                                             = {};
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
        // R12.3 — total_ascent (champ 22, en mètres) : la seule donnée qui permet de dériver
        // une VAM depuis une montre. Sans elle, l'athlète pouvait connecter sa montre et
        // rester avec une VAM devinée — le chemin de masse était vide.
        else if (f.num === 22) s.ascent = v;
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
          ascentM: s.ascent,
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
/**
 * Les références que l'import montre sait DÉRIVER. Déclarée ici, à côté du code qui les émet,
 * pour qu'un banc puisse la vérifier au lieu de faire confiance à un tableau écrit à la main
 * (R12, section C : « aucune référence ne doit rester en non/non/devinée »).
 */
const FIT_DERIVED_TESTS = ["ftp", "thrPace", "css", "vam"]         ;

/** Sous ce seuil, la « VAM » d'une sortie décrit un terrain vallonné, pas une capacité en
 *  montée : on n'en tire rien plutôt que d'écrire un chiffre faux dans le journal. */
const VAM_FIT_MIN = 250;

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
    // R12.3 — VAM depuis la montre. Deux garde-fous : une sortie PLATE ne produit pas de VAM
    // exploitable (on exige une pente moyenne réelle), et la moyenne d'une sortie entière
    // sous-estime la VAM seuil — on l'annonce comme une estimation BASSE plutôt que de la
    // gonfler. Une valeur basse fait un plan un peu facile ; une valeur gonflée fait un plan
    // intenable et une prédiction qui ment.
    if (s.sport === "rn" && s.minutes >= 25 && s.ascentM && s.ascentM > 0) {
      const vam = Math.round(s.ascentM / (s.minutes / 60));
      if (vam >= VAM_FIT_MIN && vam <= 2500)
        tests.push({ type: "vam", value: vam, date: s.date, source: "FIT (sortie " + s.minutes + "min, " + Math.round(s.ascentM) + "m D+, estimation basse)" });
      else if (s.ascentM < 100)
        notes.push("Sortie du " + s.date + " trop plate (" + Math.round(s.ascentM) + "m D+) : aucune VAM exploitable.");
    }
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

/**
 * Charge des `days` jours précédant `date` : prévue par le plan vs réellement effectuée.
 *
 * R21 — exportée pour que le détecteur de déviation lise le MÊME chiffre que l'ajusteur.
 * Deux calculs de « charge des 7 derniers jours » finiraient par diverger, et c'est
 * exactement le genre de divergence qu'O-23 vient d'exposer entre le moteur et l'UI (R11.1).
 * `ratio` est `null` quand rien n'a été effectué OU quand rien n'était prévu : un ratio
 * calculé sur un dénominateur nul serait un chiffre inventé.
 */
function loadWindow(plan        , completed                                , date        , days = 7) 
                                                              {
  const end = new Date(date + "T00:00:00Z").getTime();
  const start = end - days * 864e5;
  let plannedMin = 0;
  for (const w of plan.weeks)
    for (const d of w.days) {
      const t = new Date(((d                     ).date || "1970-01-01") + "T00:00:00Z").getTime();
      if (t >= start && t < end) plannedMin += dayMinutes(d);
    }
  const doneMin = (completed || [])
    .filter((c) => {
      const t = new Date(c.date + "T00:00:00Z").getTime();
      return t >= start && t < end;
    })
    .reduce((t, c) => t + c.minutes, 0);
  return { plannedMin, doneMin, ratio: plannedMin > 0 && completed ? doneMin / plannedMin : null };
}

function acuteGap(plan        , snapshot                   )                                                                {
  return loadWindow(plan, snapshot.completed, snapshot.date, 7);
}

function downgrade(level                )                 {
  return level === "verte" ? "orange" : "rouge";
}

/** Réduit le corps des séances d'un jour (×f), re-rend, renvoie les minutes.
 *  R21 — exportée : le recalcul de fenêtre réduit EXACTEMENT comme l'ajusteur du matin.
 *  Une seconde façon de réduire une séance serait une seconde définition de « réduire ». */
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

// ===== src/readiness/importLimits.ts =====
/**
 * S-8 — LES BORNES DE L'IMPORT DE FICHIERS (grille de sécurité, §8).
 *
 * ================================================================================
 * CE QUE ÇA PROTÈGE, ET CE QUE ÇA NE PROTÈGE PAS
 * ================================================================================
 *
 * Les trois parseurs du dépôt (FIT, GPX, TCX) sont écrits ici, sans dépendance :
 * il n'y a donc **aucune bibliothèque tierce à mettre en bac à sable**, et aucun
 * contenu n'est jamais évalué — le point 8.2 de la grille est réglé par
 * construction, pas par une mesure.
 *
 * Restait le point 8.1, et il manquait vraiment : **aucune borne de taille.** Un
 * GPX de 500 Mo fige l'onglet le temps que le balayage de points se termine, et
 * mon propre parseur GPX itère sur tous les points sans plafond. Ce n'est pas une
 * faille — l'app est locale, il n'y a pas de serveur à saturer, et le fichier
 * vient de l'athlète lui-même. C'est un **déni de service contre soi-même**, avec
 * le pire symptôme possible : une app qui ne répond plus, sans un mot.
 *
 * La borne est donc là pour DIRE quelque chose, pas pour se défendre d'un
 * attaquant. Le refus nomme la taille et le plafond.
 *
 * ================================================================================
 * POURQUOI 25 Mo
 * ================================================================================
 *
 * Un FIT d'activité fait quelques dizaines de kilo-octets ; une longue sortie très
 * échantillonnée, quelques centaines. Un GPX est plus verbeux (XML) : une trace
 * d'ultra à la seconde monte à quelques mégaoctets. 25 Mo laisse passer très
 * largement le pire cas légitime — un fichier au-dessus n'est pas une séance, c'est
 * une erreur de sélection ou un export de saison entière.
 *
 * La borne vit ICI et pas dans chaque appelant : trois copies d'un plafond, ce
 * sont trois plafonds qui divergeront (R11.1).
 */

/** Plafond de taille d'un fichier d'activité importé. Voir l'en-tête pour le choix. */
const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

/** Erreur typée — l'athlète doit pouvoir la lire, pas un développeur. */
class EBImportTooLarge extends Error {
  code = "IMPORT_TROP_GROS";
  human        ;
  constructor(nom        , taille        ) {
    const mo = (n        ) => (n / (1024 * 1024)).toFixed(1).replace(".", ",");
    super("IMPORT_TROP_GROS " + nom + " = " + taille + " octets");
    this.name = "EBImportTooLarge";
    this.human = "« " + nom + " » fait " + mo(taille) + " Mo, au-delà de la limite de "
      + mo(MAX_IMPORT_BYTES) + " Mo. Un fichier d'activité en fait quelques centaines de kilo-octets : "
      + "vérifie que c'est bien une séance et pas un export complet.";
  }
}

/**
 * Lève si le fichier dépasse le plafond. Appelée AVANT toute lecture ou analyse —
 * contrôler après avoir tout parcouru ne protège de rien, c'est le parcours qui coûte.
 */
function assertImportSize(nom        , taille        )       {
  if (isFinite(taille) && taille > MAX_IMPORT_BYTES) throw new EBImportTooLarge(nom, taille);
}

// ===== src/readiness/gpxTcxParser.ts =====
/**
 * R21 — PARSEURS GPX ET TCX, zéro dépendance.
 *
 * ================================================================================
 * POURQUOI ILS N'EXISTAIENT PAS, ET POURQUOI ILS EXISTENT MAINTENANT
 * ================================================================================
 *
 * `measured.ts` annonce depuis son écriture que « l'athlète apporte ses fichiers
 * (FIT/GPX/TCX) ». Seul le FIT était livré. Les deux autres formats sont ceux que
 * rendent les exports Polar, Suunto, Zwift, TrainingPeaks et la plupart des
 * applications qui refusent le binaire Garmin — les ignorer revenait à réserver
 * l'import souverain aux possesseurs d'une montre Garmin.
 *
 * ================================================================================
 * CE QU'ILS LISENT, ET CE QU'ILS REFUSENT DE DEVINER
 * ================================================================================
 *
 * TCX est un format de RÉSUMÉ : chaque `<Lap>` porte `TotalTimeSeconds`,
 * `DistanceMeters`, éventuellement la FC et la puissance moyennes. On les somme.
 * C'est la lecture la plus fiable des trois formats.
 *
 * GPX n'a AUCUN résumé : il n'y a que des points. La durée vient de l'écart entre
 * le premier et le dernier `<time>`, la distance d'une somme de haversines. Deux
 * conséquences dites plutôt que cachées :
 *
 *   · un GPX sans horodatage (trace de parcours, pas d'activité) ne rend RIEN, et
 *     le dit — il décrit un itinéraire, pas une séance ;
 *   · la distance GPS est bruitée ; on ne l'utilise pas pour prétendre à une
 *     précision qu'elle n'a pas. Elle sert à une vitesse MOYENNE, la grandeur que
 *     le détecteur compare à une bande de plusieurs pour cent de large.
 *
 * **La puissance n'est jamais estimée.** Ni en GPX, ni en TCX quand le champ est
 * absent. O-22 a coûté 18 % d'erreur sur une FTP pour avoir dérivé une grandeur
 * d'une autre qui lui ressemblait ; on ne recommence pas avec un modèle de
 * puissance déduit d'une pente et d'une vitesse.
 *
 * ================================================================================
 * SUR L'ANALYSE PAR EXPRESSIONS RÉGULIÈRES
 * ================================================================================
 *
 * Il n'y a pas de DOM côté Node, et le dépôt s'interdit toute dépendance npm.
 * L'analyse est donc un balayage de motifs, ce qui est acceptable ICI et
 * seulement ici : les deux schémas sont figés depuis quinze ans, les champs lus
 * sont des feuilles sans attributs, et un fichier mal formé produit un refus
 * motivé plutôt qu'un chiffre faux. Ce n'est pas un analyseur XML général et il
 * ne doit jamais servir à autre chose.
 */
                                                                     

/** Rayon terrestre moyen (m) — WGS84, valeur usuelle. */
const R_TERRE = 6371000;

function haversine(la1        , lo1        , la2        , lo2        )         {
  const r = Math.PI / 180;
  const dLa = (la2 - la1) * r, dLo = (lo2 - lo1) * r;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R_TERRE * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** La date ISO (locale au fichier : les horodatages GPX/TCX sont en UTC). */
const jourDe = (iso        )         => iso.slice(0, 10);

/**
 * Discipline déduite du libellé de sport du fichier. Un sport inconnu rend
 * « autre » — le détecteur ignore alors la séance au lieu de la ranger de force
 * dans une discipline, ce qui produirait une fausse correspondance.
 */
function disciplineDe(sport                           )                       {
  const s = String(sport || "").toLowerCase();
  if (/run|cours|marche|walk|hik|trail/.test(s)) return "rn";
  if (/bik|cycl|ride|velo|vélo|virtual/.test(s)) return "bk";
  if (/swim|nage|nata/.test(s)) return "sw";
  return "autre";
}

const nombre = (x                    )                     => {
  if (x == null) return undefined;
  const v = Number(x);
  return isFinite(v) ? v : undefined;
};

/** Toutes les valeurs d'une balise feuille, dans l'ordre du document. */
function feuilles(xml        , tag        )           {
  const re = new RegExp("<" + tag + "(?:\\s[^>]*)?>([^<]*)</" + tag + ">", "gi");
  const out           = [];
  let m                        ;
  while ((m = re.exec(xml))) out.push(m[1].trim());
  return out;
}

// ================================================================================
// TCX
// ================================================================================

function parseTcx(xml        )                    {
  // S-8 — la borne est REJOUÉE ici : l'UI la vérifie déjà sur le fichier, mais un parseur
  // exporté peut être appelé par un autre chemin, et une garde qui dépend de son appelant
  // n'est pas une garde.
  assertImportSize("TCX", xml.length);
  if (!/<TrainingCenterDatabase/i.test(xml)) throw new Error("Ce fichier n'est pas un TCX (balise TrainingCenterDatabase absente)");
  const out                    = [];
  const reAct = /<Activity\b([^>]*)>([\s\S]*?)<\/Activity>/gi;
  let m                        ;
  while ((m = reAct.exec(xml))) {
    const sport = (/Sport\s*=\s*"([^"]*)"/i.exec(m[1]) || [])[1];
    const corps = m[2];
    const id = feuilles(corps, "Id")[0];
    if (!id) continue; // un `<Id>` est l'horodatage de départ : sans lui, pas de date
    let sec = 0, dist = 0, hrSum = 0, hrN = 0, pwSum = 0, pwN = 0;
    const reLap = /<Lap\b[^>]*>([\s\S]*?)<\/Lap>/gi;
    let l                        ;
    while ((l = reLap.exec(corps))) {
      const lap = l[1];
      sec += nombre(feuilles(lap, "TotalTimeSeconds")[0]) || 0;
      dist += nombre(feuilles(lap, "DistanceMeters")[0]) || 0;
      // `<AverageHeartRateBpm><Value>…` : la feuille utile est `Value`, imbriquée.
      const hrBloc = /<AverageHeartRateBpm[^>]*>([\s\S]*?)<\/AverageHeartRateBpm>/i.exec(lap);
      const hr = hrBloc ? nombre(feuilles(hrBloc[1], "Value")[0]) : undefined;
      if (hr) { hrSum += hr; hrN++; }
      // La puissance vit dans les extensions Garmin ; absente, elle reste ABSENTE.
      const pw = nombre(feuilles(lap, "ns3:AvgWatts")[0]) ?? nombre(feuilles(lap, "AvgWatts")[0]);
      if (pw) { pwSum += pw; pwN++; }
    }
    if (sec <= 0) continue;
    out.push({
      date: jourDe(id),
      d: disciplineDe(sport),
      minutes: Math.round(sec / 60),
      distanceM: dist > 0 ? Math.round(dist) : undefined,
      avgSpeedMs: dist > 0 ? dist / sec : undefined,
      avgPowerW: pwN ? Math.round(pwSum / pwN) : undefined,
      source: "TCX",
    });
    void hrN; void hrSum; // lus pour valider le format, non utilisés par le détecteur
  }
  if (!out.length) throw new Error("Aucune activité exploitable dans ce TCX (ni durée, ni date de départ)");
  return out;
}

// ================================================================================
// GPX
// ================================================================================

function parseGpx(xml        )                    {
  assertImportSize("GPX", xml.length);
  if (!/<gpx/i.test(xml)) throw new Error("Ce fichier n'est pas un GPX (balise gpx absente)");
  const out                    = [];
  const reTrk = /<trk>([\s\S]*?)<\/trk>/gi;
  let m                        ;
  while ((m = reTrk.exec(xml))) {
    const trk = m[1];
    const type = feuilles(trk, "type")[0];
    const pts                                            = [];
    const rePt = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/gi;
    let p                        ;
    while ((p = rePt.exec(trk))) {
      const lat = nombre((/lat\s*=\s*"([^"]*)"/i.exec(p[1]) || [])[1]);
      const lon = nombre((/lon\s*=\s*"([^"]*)"/i.exec(p[1]) || [])[1]);
      const ts = feuilles(p[2], "time")[0];
      if (lat == null || lon == null || !ts) continue;
      const t = Date.parse(ts);
      if (!isFinite(t)) continue;
      pts.push({ lat, lon, t });
    }
    // Un GPX sans horodatage décrit un ITINÉRAIRE, pas une séance. On refuse, et on
    // le dit : en tirer une durée reviendrait à inventer le temps passé dessus.
    if (pts.length < 2) continue;
    const sec = (pts[pts.length - 1].t - pts[0].t) / 1000;
    if (sec <= 0) continue;
    let dist = 0;
    for (let i = 1; i < pts.length; i++) dist += haversine(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon);
    out.push({
      date: new Date(pts[0].t).toISOString().slice(0, 10),
      d: disciplineDe(type),
      minutes: Math.round(sec / 60),
      distanceM: Math.round(dist),
      avgSpeedMs: dist > 0 ? dist / sec : undefined,
      // Pas de puissance en GPX standard, et on n'en DÉDUIT pas (leçon O-22).
      source: "GPX",
    });
  }
  if (!out.length) throw new Error("Aucune trace horodatée dans ce GPX — un itinéraire sans temps ne décrit pas une séance");
  return out;
}

/** Aiguillage sur l'extension, avec un refus lisible pour tout le reste. */
function parseActivityText(nom        , texte        )                    {
  if (/\.tcx$/i.test(nom)) return parseTcx(texte);
  if (/\.gpx$/i.test(nom)) return parseGpx(texte);
  throw new Error("Format non reconnu : « " + nom +" » (attendus : .gpx, .tcx — le .fit passe par son propre parseur)");
}

// ===== src/coach/deviationDetector.ts =====
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
                                                                   


// ---- SEUILS, avec leur provenance -------------------------------------------
/** D1 — écart d'intensité au-delà du BORD de la bande cible. Handoff R21 §1. */
const SEUIL_INTENSITE = 0.10;
/** D3 — écart de charge cumulée sur 7 jours. Handoff R21 §1. */
const SEUIL_CHARGE_7J = 0.15;
/** D2 — délai après lequel une séance sans correspondance est déclarée manquée. */
const DELAI_MANQUEE_H = 24;
/** Fenêtre de la charge cumulée, en jours. Alignée sur celle de l'ajusteur. */
const FENETRE_CHARGE_J = 7;

                                                                                    

/**
 * Le contrat du handoff — `{ type, magnitude, session_id, timestamp }` — plus ce
 * que ce dépôt exige de toute décision : de quoi l'expliquer à un humain
 * (`what` / `why`, le format `{id, what, val, why}` des règles pédagogiques) et
 * de quoi la traiter sans la réinterpréter (`direction`).
 */
                                  
                      
                                                                       
                    
                                                                                    
                     
                           
                                        
                                              
                                      
                                         
 

/**
 * La forme commune de toute séance INGÉRÉE, quelle que soit sa provenance.
 * `avgSpeedMs` et `avgPowerW` sont optionnels : une montre sans capteur de
 * puissance ne rend pas de watts, et c'est un cas normal, pas une erreur.
 */
                                  
                      
                                     
                  
                     
                      
                     
                      
                  
 

const sessionKey = (weekNum        , jour        , idx        ) => weekNum + "|" + jour + "|" + idx;

/** La zone dominante du CORPS de séance — celle qui porte l'intention. */
function targetZone(s           )                {
  const body = (s.steps || []).filter((st) => st.role === "body" && typeof st.zone === "string");
  if (!body.length) return null;
  // La zone la plus représentée en durée : sur « 20min Z2 + 4×4min VO2 », l'intention
  // est le VO2max, mais c'est le seul cas où la durée ne décide pas. On prend donc la
  // zone la PLUS DURE présente, cohérent avec `sessionIntensity` qui classe déjà ainsi.
  const ordre = ["easy", "rec", "flat", "easyup", "hike", "aero", "z2", "climb", "mara", "tempo", "frc", "rp", "ss", "asc", "css", "thr", "flatthr", "speed", "vam", "vo2"];
  let best                = null, bestRank = -1;
  for (const st of body) {
    const z = st.zone          ;
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
function ecartCible(s           , ing                 , refs      ) 
                                                                                                             {
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
  const fk = (x        ) => Math.floor(x / 60) + "'" + String(Math.round(x % 60)).padStart(2, "0");
  const cible = fk(rapide) + "-" + fk(lent) + unite;
  if (realise < rapide) return { ecart: (rapide - realise) / rapide, direction: "au-dessus", type: "allure", cible };
  if (realise > lent) return { ecart: (realise - lent) / lent, direction: "en-dessous", type: "allure", cible };
  return { ecart: 0, direction: "au-dessus", type: "allure", cible };
}

/** Une séance ingérée correspond-elle à une séance planifiée ? Même jour, même discipline. */
function correspond(s           , ing                 )          {
  if (s.d === "rs") return false;
  if (ing.d === "autre") return false;
  // Un brick (`br`) se réalise en vélo puis course : les deux disciplines lui correspondent.
  if (s.d === "br") return ing.d === "br" || ing.d === "bk" || ing.d === "rn";
  return s.d === ing.d;
}

                              
               
             
                                                                                    
                              
                                                                                         
                                 
                                                                   
                                 
                                                                    
                
 

const jourAvant = (iso        , n        ) =>
  new Date(new Date(iso + "T00:00:00Z").getTime() - n * 864e5).toISOString().slice(0, 10);

function detectDeviations(input             )                    {
  const { plan, refs, ingested, done = {}, completed, today } = input;
  const out                    = [];
  const timestamp = new Date().toISOString();

  // ---- D1 · allure / puissance ------------------------------------------------
  // On ne compare QUE les séances passées : une séance de demain n'a pas de réalisé.
  for (const w of plan.weeks)
    for (const d of w.days                                 ) {
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
          date: d.date ,
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
    for (const d of w.days                                 ) {
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
          date: d.date ,
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
function signalMajeur(signals                   )                         {
  if (!signals.length) return null;
  // Une SURCHARGE prime : c'est le seul cas où l'inaction coûte une blessure. Ensuite la
  // charge cumulée (elle décrit la semaine), puis le reste, du plus grand écart au plus petit.
  const rang = (s                 ) =>
    s.direction === "au-dessus" ? 0 : s.type === "charge_7j" ? 1 : 2;
  return [...signals].sort((a, b) => rang(a) - rang(b) || b.magnitude - a.magnitude)[0];
}


// ===== src/coach/notificationSink.ts =====
/**
 * R21 §3 — LE CANAL DE NOTIFICATION, ET SON INTERFACE.
 *
 * ================================================================================
 * DEUX LIGNES, ET C'EST UNE CONTRAINTE, PAS UN STYLE
 * ================================================================================
 *
 * Le format est celui du handoff :
 *
 *   « Écart détecté : [métrique]. J'ai ajusté [séance] → [nouvelle séance].
 *     Raison : [motif]. »
 *
 * Une notification qu'on ne lit pas en entier au premier coup d'œil ne sert à
 * rien, et U16 a mesuré ce que coûte la densité : la version la plus dense de
 * l'app faisait 1,61 caractère par pixel rendu. `assertDeuxLignes()` fait échouer
 * la construction plutôt que d'émettre une notification trop longue — un contrôle
 * qui prévient ne vaut que s'il bloque (la leçon d'O-9).
 *
 * **Pas de jargon, pas de méthodologie.** Le handoff l'exclut explicitement, et
 * c'est cohérent avec le produit : « Bosquet 2007 » a sa place dans le code et
 * dans la carte « Pourquoi ce plan », pas dans une alerte de trois secondes.
 *
 * ================================================================================
 * POURQUOI UNE INTERFACE ALORS QU'IL N'Y A QU'UN CANAL
 * ================================================================================
 *
 * `NotificationSink` existe pour que le jour où un canal externe arrive
 * (WhatsApp, Telegram, push serveur), rien du coach n'ait à changer : il émet
 * une `CoachNotification`, il ne sait pas où elle va.
 *
 * Ce n'est PAS de l'abstraction spéculative gratuite : le dépôt a déjà tranché
 * que le push app fermée demande un backend (H-2, « on n'annonce pas ce qu'on ne
 * peut pas tenir »). L'interface est donc la forme honnête de cette dette — le
 * point d'ancrage est prêt, et rien ne prétend que le canal existe.
 *
 * Le MVP n'a qu'un puits : `InAppSink`, qui écrit dans une boîte de réception
 * lue par la PWA. Aucune permission navigateur n'est demandée : `notifications.js`
 * gère déjà le cas des notifications système, et en redemander une seconde fois
 * pour un autre motif serait la façon la plus sûre de se faire refuser les deux.
 */
                                                              

                                    
                                    
             
                                                              
                  
                                                                                     
                          
                                                                                 
                        
 

                                   
                                                   
 

/** Longueur au-delà de laquelle une « ligne » n'en est plus une sur un téléphone. */
const MAX_CAR_PAR_LIGNE = 120;

function assertDeuxLignes(lines          )       {
  if (lines.length === 0 || lines.length > 2)
    throw new Error("Notification R21 : " + lines.length + " ligne(s), le format en autorise 1 ou 2");
  for (const l of lines)
    if (l.length > MAX_CAR_PAR_LIGNE)
      throw new Error("Notification R21 : ligne de " + l.length + " caractères (max " + MAX_CAR_PAR_LIGNE + ") — « " + l.slice(0, 40) + "… »");
}

                                
                                                                           
                 
                                                          
                
                                              
                 
 

/**
 * Fabrique les 1 ou 2 lignes. `recalc` absent = rien n'a été ajusté, et on le dit
 * plutôt que de laisser croire à une action : une notification qui annonce un
 * ajustement inexistant est pire qu'un silence.
 */
function formatNotification(signal                 , recalc                      )                    {
  const l1 = "Écart détecté : " + signal.what + ".";
  const lines = recalc
    ? [l1, "J'ai ajusté " + recalc.before + " → " + recalc.after + ". Raison : " + recalc.reason]
    : [l1, signal.why];
  assertDeuxLignes(lines);
  return { at: new Date().toISOString(), lines, signal, recalculated: !!recalc };
}

/** Le puits du MVP : une boîte de réception in-app, bornée, sans permission requise. */
class InAppSink                             {
           inbox                      = [];
  // Pas de propriété de paramètre (`constructor(private max)`) : Node exécute le
  // TypeScript en mode « strip-only » et la refuse. Contrainte du dépôt — zéro outil
  // de compilation —, pas un choix de style.
           max        ;
  constructor(max = 30) { this.max = max; }
  send(n                   )       {
    this.inbox.push(n);
    if (this.inbox.length > this.max) this.inbox.splice(0, this.inbox.length - this.max);
  }
}

/** Puits muet — sert aux mesures : détecter et recalculer sans rien émettre. */
class NullSink                             {
  send()       { /* volontairement vide */ }
}

// ===== src/coach/proactiveCoach.ts =====
/**
 * R21 §2 — LE DÉCLENCHEUR DE RECALCUL, ET SA GARANTIE.
 *
 * ================================================================================
 * LA GARANTIE, AVANT TOUT LE RESTE : ON NE REMONTE JAMAIS LA CHARGE
 * ================================================================================
 *
 * `dailyAdjuster.ts` porte depuis le Sprint 2 une règle qui n'est pas négociable :
 *
 *     « <60 % → on n'essaie JAMAIS de rattraper le volume manqué (règle de coach) »
 *
 * et l'assertion qui la tient (`Invariant readiness violé`, jetée si un ajustement
 * produit plus de minutes qu'avant). Un déclencheur automatique qui répondrait à
 * « tu as raté trois séances » en ajoutant du volume ferait exactement ce que la
 * priorité n°2 du manifeste interdit — et il le ferait tout seul, la nuit, sans
 * que personne le regarde. C'est la raison pour laquelle **ce module ne sait que
 * réduire.**
 *
 * Conséquence assumée, et elle mérite d'être dite parce qu'elle nuance un critère
 * d'acceptation du handoff : un signal « en-dessous » (séance manquée, semaine
 * légère) DÉCLENCHE bien un recalcul — mais un recalcul qui allège la rampe à
 * venir, jamais un qui la charge. On ne récupère pas une séance perdue ; on cesse
 * de prescrire la suite comme si elle avait eu lieu. C'est la même chose qu'un
 * entraîneur fait, et c'est l'inverse de ce que fait un athlète laissé seul.
 *
 * ================================================================================
 * LA FENÊTRE DE 14 JOURS EST UNE BORNE, PAS UN BALAYAGE
 * ================================================================================
 *
 * « Recalcul de la fenêtre glissante 14 jours, PAS tout le plan » : la fenêtre
 * borne ce que le déclencheur a le droit de toucher. À l'intérieur, il ne modifie
 * que les jours qui le NÉCESSITENT — au plus `MAX_JOURS_TOUCHES`. Réduire
 * quatorze jours d'un coup sur un seul import serait une sur-réaction que
 * personne n'a demandée, et qui viderait deux semaines de plan sur une montre mal
 * calibrée.
 *
 * Les jours passés ne sont jamais touchés : on ne réécrit pas ce qui a eu lieu.
 *
 * ================================================================================
 * IL NE GÉNÈRE RIEN
 * ================================================================================
 *
 * Aucun appel au générateur, aucune re-planification : il RÉDUIT des séances
 * existantes, avec `reduceDay()` — la fonction que l'ajusteur du matin utilise
 * déjà. Deux façons de réduire une séance seraient deux définitions de
 * « réduire » (R11.1), et c'est le genre d'écart que ce dépôt a payé six fois.
 *
 * ================================================================================
 * TOUT EST JOURNALISÉ
 * ================================================================================
 *
 * Chaque recalcul produit un `RecalcLogEntry` : avant, après, raison en une
 * phrase. Un plan qui change sans que l'athlète puisse savoir pourquoi est
 * exactement le produit que ce dépôt refuse d'être.
 */
                                                                                
                                                     



/** Borne du handoff : la fenêtre glissante que le déclencheur a le droit de toucher. */
const FENETRE_RECALC_J = 14;
/** Nombre maximum de jours réellement modifiés par événement. Voir l'en-tête. */
const MAX_JOURS_TOUCHES = 3;

/**
 * Facteurs de réduction. Modestes et DIFFÉRENTS selon la cause :
 * une surcharge avérée justifie plus qu'un manque, parce qu'elle décrit une
 * fatigue déjà encaissée, tandis qu'un manque décrit une progression à ne pas
 * poursuivre comme si de rien n'était.
 */
const F_SURCHARGE = 0.85;
const F_MANQUE = 0.90;

                                 
               
                     
                                            
                                           
                 
 

                              
                             
                                                           
                                
                        
                                         
                        
 

const jourApres = (iso        , n        ) =>
  new Date(new Date(iso + "T00:00:00Z").getTime() + n * 864e5).toISOString().slice(0, 10);

/** Les jours STRICTEMENT à venir dans la fenêtre, dans l'ordre chronologique. */
function joursFenetre(plan        , today        )                                                                              {
  const fin = jourApres(today, FENETRE_RECALC_J);
  const out                                                                              = [];
  for (const w of plan.weeks)
    w.days.forEach((d, idx) => {
      const dd = (d                     ).date;
      if (!dd || dd <= today || dd > fin) return;
      out.push({ day: d                             , week: w, idx });
    });
  return out.sort((a, b) => String(a.day.date).localeCompare(String(b.day.date)));
}

/**
 * Applique la réduction aux jours qui portent la charge — les séances de QUALITÉ
 * d'abord. Alléger un footing facile ne soulage rien : c'est l'intensité qui coûte,
 * et c'est elle qu'un athlète fatigué tient le moins bien. Même logique que
 * l'ajusteur, qui remplace la qualité et laisse le facile tranquille.
 */
function recalculerFenetre(
  reasoned              , plan        , today        ,
  facteur        , raison        ,
)                   {
  const refs       = { ...reasoned.baseRefs };
  const log                   = [];
  const candidats = joursFenetre(plan, today)
    .filter(({ day }) => day.sessions.some((s) => {
      const i = sessionIntensity(s);
      return i === "difficile" || i === "moderee";
    }));
  for (const { day, week, idx } of candidats.slice(0, MAX_JOURS_TOUCHES)) {
    const avantNom = day.sessions.map((s) => s.name).join(" + ");
    const avantMin = dayMinutes(day);
    // `reduceDay` mute en place : on garde de quoi ANNULER. Sans ça, une violation
    // détectée laisserait derrière elle le jour déjà alourdi — l'assertion dirait la
    // vérité et le plan porterait quand même la charge ajoutée.
    const avantSteps = JSON.stringify(day.sessions.map((s) => s.steps));
    reduceDay(day, facteur, refs, reasoned.hz, reasoned.baseRefs);
    const apresMin = dayMinutes(day);
    // ── LA GARANTIE D'ABORD, LE RESTE ENSUITE. L'ORDRE EST LE CORRECTIF. ──
    //
    // Ma première écriture testait le « rien n'a bougé » AVANT la garantie :
    //
    //     if (apresMin >= avantMin - 0.5) continue;   // ← une HAUSSE passe ici
    //     if (apresMin > avantMin) throw …            // ← jamais atteint
    //
    // Une hausse satisfait la première condition, donc sortait par `continue` : elle
    // était appliquée au plan (`reduceDay` mute en place), non journalisée, et
    // l'assertion était du code mort. Mesuré : `reduceDay(f = 1.2)` fait passer un bloc
    // de 5 à 6 répétitions — la clause `Math.min` protège `durationMin` et `distanceM`,
    // PAS `reps`. La garantie n'est donc pas structurelle : cette ligne EST ce qui
    // sépare le plan d'une charge ajoutée automatiquement, la nuit, sans témoin.
    //
    // Douzième fois que ce dépôt paie la même leçon sous une autre forme : une garantie
    // placée après une sortie anticipée ne garantit rien.
    if (apresMin > avantMin + 0.5) {
      const restaure = JSON.parse(avantSteps)                                   ;
      day.sessions.forEach((s, i) => { s.steps = restaure[i]; });
      throw new Error("Invariant R21 violé : recalcul de fenêtre à la HAUSSE (" + avantMin.toFixed(1) + " → " + apresMin.toFixed(1) + " min)");
    }
    // Une réduction qui ne réduit rien n'est pas une entrée de journal : on ne
    // fabrique pas la preuve d'une action qui n'a pas eu lieu.
    if (apresMin >= avantMin - 0.5) continue;
    log.push({
      date: day.date ,
      session_id: week.num + "|" + day.jour + "|" + idx,
      before: { name: avantNom, minutes: Math.round(avantMin) },
      after: { name: day.sessions.map((s) => s.name).join(" + "), minutes: Math.round(apresMin) },
      reason: raison,
    });
  }
  return log;
}

                              
                         
               
             
                              
                                 
                                 
                
                         
 

/**
 * Le point d'entrée : appelé APRÈS chaque ingestion de séance.
 *
 * Détecte → décide → recalcule (à la baisse, dans la fenêtre) → journalise →
 * notifie. Aucun de ces cinq gestes n'est optionnel, et l'ordre compte : notifier
 * avant de recalculer annoncerait un ajustement qui pourrait ne pas avoir lieu.
 */
function onSessionIngested(input             )              {
  const { reasoned, plan, refs, ingested, done, completed, today, sink } = input;
  const decisions             = [];
  const D = (id        , what        , val                 , why        ) => decisions.push({ id, what, val, why });

  const signals = detectDeviations({ plan, refs, ingested, done, completed, today });
  const major = signalMajeur(signals);

  if (!major) {
    D("R21-aucun", "Aucune déviation", signals.length, "Ce qui a été fait correspond à ce qui était prévu : le plan ne bouge pas, et c'est une information en soi.");
    return { signals, major: null, log: [], notification: null, decisions };
  }

  D("R21-signal", "Déviation retenue", major.type + " " + major.direction, major.why);

  const surcharge = major.direction === "au-dessus";
  const facteur = surcharge ? F_SURCHARGE : F_MANQUE;
  const raison = surcharge
    ? "tu as encaissé plus que prévu, on laisse le corps encaisser"
    : "la progression repart d'où tu en es, sans rattrapage";

  const log = recalculerFenetre(reasoned, plan, today, facteur, raison);

  if (log.length) {
    D("R21-recalc", "Recalcul " + FENETRE_RECALC_J + " jours",
      log.length + " jour(s) allégé(s)",
      "Seuls les " + FENETRE_RECALC_J + " prochains jours sont concernés, et uniquement à la BAISSE : on ne rattrape jamais un volume manqué, et on n'ajoute jamais de charge sur une fatigue constatée.");
  } else {
    D("R21-sans-effet", "Rien à alléger", "0 jour",
      "Aucune séance de qualité dans les " + FENETRE_RECALC_J + " prochains jours : il n'y a rien à réduire, et on ne touche pas au reste pour faire quelque chose.");
  }

  const resume                       = log.length
    ? { before: log[0].before.name + " (" + log[0].before.minutes + " min)", after: log[0].after.minutes + " min", reason: raison }
    : null;
  const notification = formatNotification(major, resume);
  sink.send(notification);

  return { signals, major, log, notification, decisions };
}

/** Journal lisible — le format « avant / après / raison » demandé par le handoff. */
function formatLog(log                  )         {
  if (!log.length) return "(aucun recalcul)";
  return log.map((e) =>
    e.date + "  " + e.session_id + "\n"
    + "    avant : " + e.before.name + " — " + e.before.minutes + " min\n"
    + "    après : " + e.after.name + " — " + e.after.minutes + " min\n"
    + "    raison : " + e.reason
  ).join("\n");
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

/**
 * N11 — 1 MET ≈ 1 kcal par kilo et par heure (3,5 mL O₂/kg/min). C'est la définition même du
 * MET, donc la quantité exacte que les tables de MET incluent au titre du repos.
 */
const REST_MET_KCAL_PER_KG_H = 1;

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

/**
 * O-16 — GARDE D'ÂGE. Mifflin-St Jeor est validée chez l'ADULTE, et le NAP de la FAO décrit
 * une dépense d'adulte : ni l'une ni l'autre ne s'applique à un organisme en croissance, dont
 * la dépense de base rapportée au poids est plus élevée et surtout beaucoup plus variable d'un
 * individu à l'autre. Le moteur ne leur opposait pourtant AUCUNE borne — un profil de 12 ans
 * recevait « 1 750–2 480 kcal » et « protéines 60–90 g/j », un chiffre qui a l'air précis alors
 * que l'équation est hors de son domaine (à 12 ans, l'âge sort même de la bande 14–90 de
 * `basalRange` : le moteur retombait sur l'enveloppe 25–55 ans sans le dire).
 *
 * La garde IMC ne voyait rien ici : l'IMC d'un adolescent de gabarit normal l'est aussi.
 *
 * Ce qui est coupé et ce qui ne l'est pas — décision du fondateur (02/08/2026), en attendant la
 * réponse du dossier de relecture diététique (question 3) : on coupe l'ESTIMATION JOURNALIÈRE
 * (N8–N11) et les macros, on garde le RAVITAILLEMENT D'EFFORT (N1–N7). Un adolescent qui roule
 * trois heures a besoin de savoir quoi boire ; il n'a besoin d'aucun tableau calorique. Le sens
 * de l'erreur tranche : ne rien afficher coûte moins cher qu'un chiffre faux, et c'est déjà le
 * choix fait pour l'IMC.
 *
 * Refus seulement si l'âge est CONNU et sous la borne — un âge absent n'est pas une preuve de
 * minorité, et couper dessus retirerait l'écran à des adultes qui n'ont pas rempli le champ.
 */
const MIN_AGE_FOR_ENERGY_ESTIMATE = 16;
function ageGuardNotice(age                )                {
  if (age == null || !isFinite(age) || !(age > 0)) return null;
  if (age >= MIN_AGE_FOR_ENERGY_ESTIMATE) return null;
  return "Les équations de dépense énergétique utilisées ici sont validées chez l'adulte : avant " + MIN_AGE_FOR_ENERGY_ESTIMATE + " ans, elles donneraient un chiffre qui a l'air précis sans l'être. Aucune estimation n'est affichée. Les conseils de ravitaillement de chaque séance, eux, restent valables. Pour des repères d'apport à cet âge, un(e) diététicien(ne) est le bon interlocuteur.";
}

/**
 * Le motif du refus, quand il y en a un. La garde IMC portait ce message depuis l'audit v6 et
 * son commentaire disait « l'UI peut afficher ce message à la place » — l'UI ne l'a jamais
 * affiché, elle montrait le repli « renseigne ton poids », c'est-à-dire une invitation à
 * corriger une donnée qui n'était pas en cause. Un point unique, lu par la carte 🔥.
 */
function energyRefusalNotice(input                                                                             )                {
  return ageGuardNotice(input.age) ?? bmiGuardNotice(input.weightKg, input.heightCm);
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
  if (energyRefusalNotice({ weightKg: w, heightCm: input.heightCm, age: input.age })) return null; // E4 + O-16
  const D                      = [];
  const { bmr, approximate } = basalRange(w, input.heightCm, input.age, input.sex);
  D.push({ id: "N8", what: "Métabolisme de base", val: bmr[0] + "–" + bmr[1] + " kcal/j", why: "équation de Mifflin-St Jeor (la mieux validée, ADA 2005)" + (approximate ? " — fourchette élargie car taille/âge/sexe incomplets au Profil" : " avec tes données du Profil") + " ; ce que ton corps dépense au repos complet" });

  // N9 — vie quotidienne hors entraînement : NAP 1.35–1.55 (assis à modérément actif).
  const daily                   = [eRound10(bmr[0] * 1.35), eRound10(bmr[1] * 1.55)];
  const training                   = input.trainingKcal && input.trainingKcal[1] > 0 ? [eRound10(input.trainingKcal[0]), eRound10(input.trainingKcal[1])] : [0, 0];

  // N11 — LE REPOS DES HEURES D'ENTRAÎNEMENT N'EST PAS COMPTÉ DEUX FOIS.
  //
  // `training` vient des MET (N7), et un MET est une dépense BRUTE : par définition, 1 MET est
  // le métabolisme de repos. Une heure de course à 10 MET coûte donc 10 × poids kcal, dont
  // 1 × poids que la personne aurait dépensés de toute façon, allongée sur son canapé.
  //
  // Or `daily` (BMR × NAP) couvre déjà les 24 HEURES de la journée, entraînement compris — le
  // NAP de la FAO est le rapport de la dépense TOTALE au métabolisme de base. Additionner les
  // deux comptait donc deux fois le repos des heures d'entraînement.
  //
  // Mesuré avant correction, sur 75 kg : **+75 kcal sur 1 h, +150 sur 2 h, +375 sur 5 h**, soit
  // **2,1 % à 5,8 % du total affiché** — et toujours dans le sens qui GONFLE la dépense. Sur un
  // écran de nutrition, c'est le sens qui compte : une dépense surestimée est une dépense qu'on
  // peut lire comme une autorisation.
  //
  // On retire donc le recouvrement : 1 MET × poids × heures d'entraînement. Ce n'est pas de la
  // diététique, c'est de l'arithmétique — compter deux fois le même repos est faux quel que
  // soit l'avis du professionnel, et la correction ne dépend d'aucun arbitrage.
  //
  // Ce qui NE change PAS : la dépense affichée pour UNE SÉANCE (N7) reste brute. C'est la bonne
  // réponse à « combien coûte cette séance » — le recouvrement n'existe que lorsqu'on l'ajoute
  // à une journée déjà comptée en entier. `training` reste donc BRUT dans la sortie, et le
  // recouvrement est PUBLIÉ (`restOverlap`, `trainingNet`) au lieu d'être retranché en
  // silence : une carte où les trois lignes affichées ne s'additionnent pas est une carte
  // qu'on soupçonne. La ligne se lit, elle s'explique, et le total tombe juste.
  const heures = Math.max(0, input.trainingMin || 0) / 60;
  const recouvrement = training[1] > 0 ? eRound10(REST_MET_KCAL_PER_KG_H * w * heures) : 0;
  const trainingNet                   = [Math.max(0, training[0] - recouvrement), Math.max(0, training[1] - recouvrement)];
  const total                   = [daily[0] + trainingNet[0], daily[1] + trainingNet[1]];
  D.push({ id: "N9", what: "Dépense du jour (estimée)", val: total[0] + "–" + total[1] + " kcal", why: "base × 1.35–1.55 (vie quotidienne hors sport, FAO/WHO 2001) + " + (training[1] ? "l'entraînement du jour (~" + training[0] + "–" + training[1] + " kcal bruts, MET publiés)" : "aucun entraînement prévu aujourd'hui") + " — une information pour comprendre, jamais une cible à atteindre ni à creuser" });
  if (recouvrement > 0)
    D.push({ id: "N11", what: "Repos compté une seule fois", val: "−" + recouvrement + " kcal", why: "les MET incluent le métabolisme de repos, et ta journée le compte déjà sur 24 h : on retire ce que tu aurais dépensé pendant ces " + (Math.round(heures * 10) / 10) + " h même sans bouger, sinon la dépense affichée serait gonflée" });

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
  // R16.6 — LES MACROS SE LISENT EN TROIS LIGNES, PAS EN UN PAVÉ.
  // `text` reste la phrase continue (contrat existant, asserté par `demo:nutrition`) ; on
  // ajoute la MÊME information découpée par macro, parce qu'un paragraphe de six lignes
  // enchaînées se lit comme un mur sur mobile — et parce que c'est une estimation qu'on
  // consulte, pas un texte qu'on lit. La source et l'avertissement ne bougent pas : c'est la
  // mise en forme qui était en cause, pas le contenu.
  const jourLbl = tMin >= 90 ? "un gros jour d'entraînement" : tMin >= 45 ? "un jour d'entraînement modéré" : "un jour léger ou de repos";
  const macroLines           = [
    "Protéines ~" + proteinG[0] + "–" + proteinG[1] + " g/j — 1,2 à 1,7 g/kg (ACSM/AND/DC 2016)",
    "Lipides ~" + fatG[0] + "–" + fatG[1] + " g/j — 20 à 35 % de l'énergie, jamais moins de 20 % (AMDR)",
    "Glucides ~" + carbsG[0] + "–" + carbsG[1] + " g/j — " + carbsPerKg[0] + " à " + carbsPerKg[1] + " g/kg pour " + jourLbl + " (Burke 2011)",
  ];
  D.push({ id: "N10", what: "Macros (répartition indicative)", val: "P " + proteinG[0] + "–" + proteinG[1] + " g · L " + fatG[0] + "–" + fatG[1] + " g · G " + carbsG[0] + "–" + carbsG[1] + " g", why: "protéines ACSM/AND/DC 2016, lipides AMDR (plancher 20 % — santé hormonale), glucides selon le volume du jour (Burke 2011)" });

  return { bmr, daily, training, restOverlap: recouvrement, trainingNet, total, macros: { proteinG, fatG, carbsG, text: macroText, lines: macroLines }, approximate, decisions: D, disclaimer: ENERGY_DISCLAIMER };
}

// ===== src/app/bridge.ts =====
/**
 * Pont UI ↔ moteur V2 — exposé au produit HTML sous `globalThis.EBV2` par le bundle
 * (`npm run build:app`). L'UI n'appelle QUE ces trois fonctions ; aucune logique métier
 * dans les composants (manifeste, §9 Architecture).
 */
                                                                         
























/** R21 — exportée : la spec du coach proactif construit ses profils comme le pont, pas autrement. */
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

/**
 * R22 — Prépare la troncature : rend les réponses AVEC une `plan_start` virtuelle, ou
 * `null` si le contournement n'a pas lieu d'être (drapeau absent, format qui ne le
 * permet pas, date lointaine). Ne décide rien : la règle vit dans `truncatedPrep.ts`.
 */
function prepareTroncature(sport        , a            )                                                     {
  if (a.truncate_prep !== true || !a.race_date) return null;
  const today = localTodayISO();
  const anchor = a.plan_start && String(a.plan_start) < today ? String(a.plan_start) : today;
  const reste = Math.floor(
    (new Date(String(a.race_date) + "T00:00:00Z").getTime() - new Date(anchor + "T00:00:00Z").getTime()) / (7 * 864e5)
  ) + 1;
  const t = planTroncature(semainesRequises(sport, toProfile(sport, a)), reste);
  if (!t || !t.possible || t.aRetirer <= 0) return null;
  // La date de départ virtuelle. Le moteur compte sa travée INCLUSIVEMENT —
  // `span = semaines(ancre → lundi de course) + 1` (reasoningEngine) — donc pour obtenir
  // `need` semaines il faut reculer de `need − 1`, pas de `need`. Ma première écriture
  // reculait de `need` et livrait 15 semaines au lieu de 14 : la spec l'a attrapé.
  const lundiCourse = new Date(String(a.race_date) + "T00:00:00Z");
  lundiCourse.setUTCDate(lundiCourse.getUTCDate() - ((lundiCourse.getUTCDay() + 6) % 7));
  const virtuel = new Date(lundiCourse.getTime() - (t.need - 1) * 7 * 864e5).toISOString().slice(0, 10);
  return { answers: { ...a, plan_start: virtuel }, plan: t };
}

/**
 * R22 — Applique la troncature EN SORTIE : retire les `aRetirer` premières semaines,
 * renumérote de 1 à N, et laisse une trace explicite dans `plan.meta`.
 *
 * Les DATES ne sont pas retouchées : elles sont déjà les vraies dates calendaires, et
 * les semaines retirées sont précisément celles qui tombaient dans le passé (c'est tout
 * l'intérêt de la date virtuelle). Les réécrire les décalerait d'une semaine — le défaut
 * que R7 a corrigé.
 */
function applyTroncature(plan        , t              , res                                                                                                      )       {
  const avant = plan.weeks.length;
  if (t.aRetirer <= 0 || t.aRetirer >= avant) return;
  plan.weeks = plan.weeks.slice(t.aRetirer);
  plan.weeks.forEach((w, i) => { w.num = i + 1; });
  (plan                                               ).meta = {
    ...((plan                                               ).meta || {}),
    truncated: true,
    original_weeks: avant,
    truncated_weeks: t.aRetirer,
    delivered_weeks: plan.weeks.length,
    floor_weeks: t.plancher,
  };
  res.decisions.push({
    id: "R22-troncature",
    what: "Préparation raccourcie",
    val: avant + " → " + plan.weeks.length + " semaines",
    why: "Ta course est proche : les " + t.aRetirer + " premières semaines de mise en route ont été "
      + "retirées plutôt que de comprimer la préparation entière. La progression est donc plus dense "
      + "dès la première semaine, et elle suppose une base déjà acquise.",
  });
}

/** Génère le plan via le moteur V2 (raisonne → génère → audite → répare) — forme V1Plan. */
function buildPlanV2(sport        , answers            )                                {
  // R11 — LE CONTRAT D'ENTRÉE, avant toute génération. Trois sorties possibles et jamais une
  // quatrième : refus motivé (`EBInputError`), avertissement porté par le plan, ou défaut
  // journalisé. Rendre un plan sans qu'aucun canal ne se soit exprimé était le défaut : le
  // moteur produisait un Ironman à 30 min de pic sur une saisie illisible, sans un mot.
  // Le SPORT est la première entrée à valider : un sport absent du bundle (R12 §0) doit donner
  // un refus lisible, pas une erreur de symbole manquant au fond du moteur.
  if (!knownSports().includes(sport)) {
    throw new EBInputError("sport", sport, knownSports().join(" / "),
      "Le sport « " + sport + " » n'est pas disponible dans cette version. Sports proposés : " + knownSports().join(", ") + ".");
  }
  const vr = validateAnswers(sport, answers                           , localTodayISO());
  // ── R22 — PRÉPARATION TRONQUÉE : date de départ VIRTUELLE en entrée ──
  //
  // Le brief est explicite et c'est la bonne contrainte : on ne touche PAS à la logique de
  // périodisation. On ment au générateur sur UNE seule chose — la date à laquelle la prépa
  // a commencé — puis on coupe le début de ce qu'il a produit. Entre les deux, il fabrique
  // exactement le plan qu'il aurait fait pour quelqu'un d'à l'heure, et l'auditeur le note
  // sur ses règles habituelles.
  //
  // La date virtuelle est `course − need`, pas `course − 16 semaines` : `need` vaut 6 pour
  // un 5 km et 36 pour un Ironman (voir `truncatedPrep.ts`).
  const troncature = prepareTroncature(sport, vr.answers                         );
  const res = generateAudited(toProfile(sport, (troncature ? troncature.answers : vr.answers)                         ));
  const plan = res.plan                                 ;
  if (troncature) applyTroncature(plan, troncature.plan, res);
  // R11.6 — un plan vide n'est pas un plan : le contrôle ne peut se faire qu'ICI, une fois
  // qu'on sait ce qui a réellement été produit.
  assertPlanIsAPlan(sport, vr.answers.format                      , plan.weeks         );
  // Les contradictions et les défauts appliqués REJOIGNENT les canaux existants : ils
  // s'affichent là où l'athlète regarde déjà (« Pourquoi ce plan », décisions du moteur).
  // Les avertissements de SÉCURITÉ du moteur (barrière horaire, prérequis, médical) restent en
  // tête : ceux du contrat d'entrée sont des remarques de saisie, ils passent après.
  if (vr.warnings.length) res.warnings.push(...vr.warnings);
  if (vr.defaults.length) res.decisions.push(...vr.defaults);
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

/**
 * R17.2 — LE TROISIÈME CANAL : LA FORME PHYSIQUE, MONTRÉE SANS RIEN RETIRER.
 *
 * Le brief avatar (AV3/AV4) voulait piloter l'ÉQUIPEMENT par un palier de performance. Refusé,
 * et la raison tient en une phrase : une allure seuil monte ET DESCEND. Une blessure, une
 * maladie, une grossesse, une charge de travail, ou simplement l'âge la font baisser — et
 * l'athlète verrait son avatar se déshabiller au moment précis où il a le plus besoin d'être
 * encouragé à revenir. L'équipement reste donc la RÉGULARITÉ (cumulatif, jamais décroissant,
 * priorité n°3 du manifeste).
 *
 * Mais l'information de performance est réelle et l'athlète a le droit de la voir. Elle a
 * donc son propre canal, construit pour être RÉVERSIBLE SANS PERTE : un repère qui se
 * DÉPLACE. Il peut reculer sans que rien ne disparaisse — c'est une position sur une échelle,
 * pas une possession qu'on retire.
 *
 * La source n'est PAS un nouveau calcul : c'est `margeOf` (R14.1), déjà sourcé (profil de
 * puissance Coggan pour le vélo, heuristiques assumées pour course et nage) et déjà DÉCALÉ
 * par sexe et par âge — donc un master de 55 ans n'est pas jugé contre une référence de
 * 25 ans, et une femme n'est pas jugée contre une référence masculine. On décale la
 * RÉFÉRENCE, jamais la personne.
 *
 * `null` quand la référence n'est pas mesurée : pas de palier par défaut, pas de zéro. On ne
 * montre pas une position qu'on n'a pas mesurée.
 */
                                                                                
const DISC_TO_REF                                            = { rn: "thrPace", sw: "css", bk: "ftp" };
function perfTierV2(sport        , answers            )                  {
  const parse = parsePaceSec;
  const refs = {
    ftp: answers.ftp_known === "oui" ? parseInt(String(answers.ftp || "")) || 0 : 0,
    thrPace: answers.pace_known === "oui" ? parse(answers.pace, "run") : 0,
    css: answers.css_known === "oui" ? parse(answers.css, "swim") : 0,
  };
  const poids = parseFloat(String(answers.weight || "")) || null;
  const age = parseInt(String(answers.age || "")) || null;
  const sexe = (answers.sex          ) || null;
  const discs = knownSports().includes(sport) ? sportModule(sport).disciplines : [];
  const out                         = {};
  for (const d of discs) {
    const cle = DISC_TO_REF[d];
    if (!cle) continue;
    const marge = margeOf(cle, refs, poids, sexe, age);
    if (marge == null) continue;
    // marge 1.0 = loin du potentiel · 0.12 = proche. Le palier est l'inverse, sur 1-10.
    out[d] = Math.max(1, Math.min(10, Math.round((1 - marge) * 10) || 1));
  }
  const vals = Object.values(out);
  if (!vals.length) return null; // aucune référence mesurée → aucun palier, pas un palier 1
  return { tier: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), disciplines: out };
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
  // ---- R14 — ENTRÉES DU PROJECTEUR (« où en seras-tu le jour J »).
  // Trois données que le prédicteur n'avait jamais vues : le temps qui RESTE, ce qui a été
  // RÉELLEMENT fait, et le journal de tests. Elles vivent ici parce que c'est le pont qui
  // connaît le plan livré et les réponses de l'athlète — le prédicteur reste une fonction
  // des références qu'on lui donne.
  const horizonWeeks = weeksUntilRace(p, answers, today);
  const tests = Array.isArray(answers.tests) ? (answers.tests                                                   ) : [];
  return predictRace(sport, String(answers.format || ""), String(answers.intent || "") || undefined, finalRefs, {
    pctLoad: pg.pctLoad,
    streakWeeks: pg.streakWeeks,
    // R6 — profil du parcours (Profil) · R14.3-a — résolveur UNIQUE, partagé avec le jour J :
    // `course_profile` (le parcours visé) prime, `terrain` prend le relais à défaut.
    courseProfile: courseProfileOf(answers         ),
    // R18.2 — trois profils au lieu d'un : un triathlon n'est pas homogène.
    legProfiles: { swim: legProfileOf(answers         , "swim"), bike: legProfileOf(answers         , "bike"), run: legProfileOf(answers         , "run") },
    // R19.2 — la combinaison : seuil réglementaire à 24,5 °C, 4 à 7 % de temps de nage.
    // R20.1-a — `isFinite`, pas `||` : 0 est une réponse. Même piège que `vol_recent`.
    waterTempC: (() => { const t = parseFloat(String(answers.water_temp_c ?? "")); return isFinite(t) ? t : undefined; })(),
    // R7 TRAIL — l'objectif décodé (catégorie, temps estimé, VAM) : Riegel ne s'applique pas
    trail: sport === "trail" ? trailObjective(toProfile(sport, answers)) : undefined,
    swimrun: sport === "swimrun" && typeof swimrunObjective === "function" ? swimrunObjective(toProfile(sport, answers)) : undefined,
    // R14 P5 — le volume de COURSE hebdomadaire pilote l'exposant de Riegel.
    runHoursPerWeek: sport === "run" ? parseFloat(String(answers.vol_max || "")) || undefined : undefined,
    projection: horizonWeeks == null ? undefined : {
      horizonWeeks,
      level: String(answers.level || "") || undefined,
      history: String(answers.history || "") || undefined,
      adherence: adherenceWindow(p         , (answers.done || {})                           , today),
      tests,
      taperConform: taperIsConform(p         ),
      refAgeWeeks: refAgeWeeks(tests, today),
      raceDate: String(answers.race_date || "") || undefined,
      // R14.1 P2bis — la MARGE se lit sur les références mesurées : elles montent donc jusqu'au
      // projecteur, avec le poids (sans lui, pas de W/kg) et les décalages de bandes.
      refs: finalRefs,
      weightKg: parseFloat(String(answers.weight || "")) || null,
      heightCm: parseFloat(String(answers.height || "")) || null,
      sex: typeof answers.sex === "string" ? answers.sex : null,
      age: parseInt(String(answers.age || "")) || null,
      trainingStructure: String(answers.training_structure || "") || null,
      // R14.1 P10 — dose-réponse : ce que le plan PRESCRIT face à ce que l'athlète fait déjà.
      prescribedMeanH: prescribedMeanHours(p),
      // P11 — LE PIÈGE DU ZÉRO, TROISIÈME OCCURRENCE, ET LA SEULE QUI SE VOYAIT À L'ÉCRAN.
      //
      // `parseFloat("0") || null` vaut `null` : « je ne m'entraîne pas du tout » arrivait au
      // projecteur comme « je n'ai pas répondu ». Les deux corrections faites en amont
      // (`volumeFactor`, le régime P11) ne servaient donc À RIEN dans le produit livré — le
      // chiffre n'atteignait jamais le modèle. Mesuré sur la prédiction affichée, 10 km à
      // 16 semaines depuis 7'00/km : **0 h → 7,4 % de gain, 1 h → 21,5 %**. Déclarer zéro
      // donnait trois fois moins que déclarer une heure, sur la carte que l'athlète lit.
      //
      // Troisième fois : R20.1 (rampe R10), P11 (`volumeFactor`), ici. La leçon n'est pas
      // « corriger le piège » mais « le corriger sur TOUT LE CHEMIN » — une valeur légitime
      // effacée à n'importe quel maillon est effacée pour de bon.
      volRecentH: readNumber(answers.vol_recent),
      // R14.1 P9 — le levier poids n'existe que si l'athlète l'a demandé ET a saisi sa cible.
      weightLeverAsked: answers.weight_lever === "oui",
      weightTargetKg: parseFloat(String(answers.weight_target || "")) || null,
      medicalFlag: answers.med_pain === "oui" || answers.med_dizzy === "oui" || answers.med_treat === "oui",
    },
    // R7 TRAIL — l'objectif rejoué avec une VAM et une allure à plat projetées : le prédicteur
    // ne sait pas reconstruire un `TrailObjective`, il vit dans `trailModel`.
    projectTrail: sport === "trail"
      ? (gVam        , gPace        ) => {
        const prof = toProfile(sport, answers)                           ;
        const base = trailObjective(prof         );
        return trailObjective({ ...prof, vam_known: "oui", vam: String(Math.round(base.vam * (1 + gVam))),
          pace_known: "oui", pace: secToPace(base.flatPaceSec / (1 + gPace)) }         );
      }
      : undefined,
  });
}

/**
 * R14.1 P10 — volume hebdomadaire moyen PRESCRIT sur les phases qui construisent (dev, spéc,
 * pic). L'affûtage et la base sont exclus à dessein : le premier réduit par définition, le
 * second n'est pas encore la dose du plan. C'est le rapport de ce chiffre au volume récent qui
 * dit si le plan MONTE la charge ou la maintient — et un plan de maintien ne fait pas
 * progresser autant, quoi qu'on affiche.
 */
/**
 * P11 — lecture d'un nombre qui SAIT que zéro est une réponse.
 *
 * `parseFloat(x) || null` confond « 0 » et « rien ». Sur un volume d'entraînement récent, ces
 * deux cas sont l'exact opposé l'un de l'autre : l'un est l'information la plus forte que le
 * questionnaire puisse recevoir (« je pars de zéro »), l'autre est son absence. Point unique,
 * pour que la prochaine lecture de ce genre n'ait pas à réinventer la garde.
 */
function readNumber(v         )                {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v));
  return isFinite(n) ? n : null;
}

function prescribedMeanHours(plan        )                {
  const w = plan.weeks.filter((x) => !x.isRecup && ["dev", "spec", "peak"].includes(String(x.phase && x.phase.id)));
  if (!w.length) return null;
  let min = 0;
  for (const wk of w)
    for (const d of wk.days)
      for (const s of d.sessions) if (s.d !== "rs" && !s.race) min += s.min || 0;
  return min > 0 ? min / 60 / w.length : null;
}

/** Secondes/km → « 4:50 » : le parseur d'allure est unique (E1/E2), son inverse doit l'être aussi. */
function secToPace(secPerKm        )         {
  const s = Math.max(1, Math.round(secPerKm));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

/**
 * R14 — L'HORIZON : semaines entre aujourd'hui et le jour J. La date de course prime (c'est
 * l'échéance réelle) ; à défaut on prend la fin du plan. `null` = pas d'échéance connue, donc
 * pas de projection — on ne projette pas vers une date qu'on ne connaît pas.
 */
function weeksUntilRace(plan        , answers            , todayISO        )                {
  const rd = String(answers.race_date || "").trim();
  let cible = /^\d{4}-\d{2}-\d{2}$/.test(rd) ? rd : "";
  if (!cible) {
    for (const w of plan.weeks) for (const d of w.days) if ((d                     ).date) cible = (d                     ).date          ;
  }
  if (!cible) return null;
  const jours = (Date.parse(cible + "T00:00:00Z") - Date.parse(todayISO + "T00:00:00Z")) / 864e5;
  if (!Number.isFinite(jours) || jours < 0) return null; // course passée : rien à projeter
  return jours / 7;
}

/** P7 — âge (en semaines) de la référence la plus récente : un test d'il y a un an ne décrit plus personne. */
function refAgeWeeks(tests                     , todayISO        )                {
  const dates = (tests || []).map((t) => Date.parse(String(t.date) + "T00:00:00Z")).filter((n) => Number.isFinite(n));
  if (!dates.length) return null; // références déclarées sans date : on n'invente pas leur ancienneté
  return Math.max(0, (Date.parse(todayISO + "T00:00:00Z") - Math.max(...dates)) / (7 * 864e5));
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

/** O-16 — POURQUOI l'estimation n'est pas affichée, quand elle ne l'est pas. `dailyEnergy`
 *  retourne `null` dans trois cas très différents : pas de poids saisi, âge sous la borne
 *  (O-16), gabarit hors des bornes de validation des équations (E4). L'UI montrait le même
 *  repli « renseigne ton poids » dans les trois — donc elle envoyait un mineur et une personne
 *  hors bornes corriger une donnée qui n'était pas en cause. Null ici = « aucun motif à
 *  expliquer », c'est-à-dire la donnée manquante. */
function energyRefusalV2(answers            )                {
  return energyRefusalNotice({
    weightKg: parseFloat(String(answers.weight || "")) || null,
    heightCm: parseFloat(String(answers.height || "")) || null,
    age: parseInt(String(answers.age || "")) || null,
  });
}

// R7 — date du jour en heure LOCALE de l'appareil (jamais toISOString/UTC : le plan
// vit dans le calendrier de l'athlète, pas celui de Greenwich).
function localTodayISO()         {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/**
 * RV — LE DIAGNOSTIC DE FAISABILITÉ, exposé à l'UI.
 *
 * Une seule chose est à comprendre en lisant ce pont : **il ne rend qu'un verdict**. Le chrono
 * visé n'entre dans AUCUNE des entrées de `buildPlan` — le plan est construit d'abord, il est
 * passé ici en lecture pour connaître le volume prescrit et l'horizon, et le verdict s'écrit
 * par-dessus. Laisser un objectif de temps augmenter une charge, ce serait la priorité n°5 du
 * manifeste qui écrase les quatre premières. `RV-INVARIANT` (`demo:faisabilite`) mesure cette
 * propriété au bit près, et `RV-UI` (E2E) la remesure sur le plan affiché.
 *
 * Course à pied seulement, pour l'instant : le prototype inverse Riegel, qui ne s'applique ni
 * au trail (T-8) ni aux épreuves à enchaînements. Sur les autres sports il rend `null` — pas un
 * verdict prudent, RIEN : une carte absente se comprend, un verdict tiède se croit.
 */
function feasibilityV2(sport        , answers            , plan                                ) {
  if (sport !== "run") return null;
  const targetSec = parseChronoSec(answers.target_time);
  if (targetSec == null) return null;
  const p = plan ?? generatePlan(toProfile(sport, answers)).plan;
  const today = localTodayISO();
  const horizonWeeks = weeksUntilRace(p, answers, today);
  return assessFeasibility({
    format: String(answers.format || ""),
    targetSec,
    thrPaceSecPerKm: answers.pace_known === "oui" ? parsePaceSec(answers.pace, "run") : 0,
    horizonWeeks: horizonWeeks ?? 0,
    runHoursPerWeek: readNumber(answers.vol_recent),
    prescribedMeanH: prescribedMeanHours(p),
    weightKg: readNumber(answers.weight),
    sex: typeof answers.sex === "string" ? answers.sex : null,
    age: readNumber(answers.age),
    trainingStructure: String(answers.training_structure || "") || null,
    history: String(answers.history || "") || undefined,
  });
}

/**
 * « 3:30:00 », « 45:00 », « 46'30 » → secondes. `null` sur tout le reste, y compris une saisie
 * en cours de frappe — le champ est OPTIONNEL, une saisie incomplète ne doit rien afficher et
 * surtout pas un verdict sur un chrono deviné.
 *
 * Hors `ANSWER_SCHEMA`, au même titre que `pace` et `css` : le schéma ne connaît pas le type
 * « durée », et lui en inventer un pour un champ qui ne pilote aucune séance serait payer le
 * prix d'une clé de schéma (validation dure, refus d'entrée typé) pour un affichage.
 */
function parseChronoSec(v         )                {
  const s = String(v ?? "").trim().replace(/'/g, ":").replace(/\s/g, "");
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):([0-5]?\d)(?::([0-5]?\d))?$/);
  if (!m) return null;
  if (m[3] != null) {
    const sec = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]); // h:mm:ss, sans ambiguïté
    return sec >= 600 && sec <= 43200 ? sec : null;
  }
  // `X:YY` est ambigu — « 46:30 » veut dire 46 min 30, « 3:30 » veut dire 3 h 30. On ne DEVINE
  // pas : on écarte la lecture qui est hors domaine. Aucun format de course à pied du moteur
  // n'est courable en moins de 10 minutes, donc une lecture mm:ss sous ce plancher n'est pas un
  // chrono — c'est la lecture h:mm qui est la bonne. Une seule des deux tient debout à la fois.
  const mmss = (+m[1]) * 60 + (+m[2]);
  const sec = mmss >= 600 ? mmss : (+m[1]) * 3600 + (+m[2]) * 60;
  // Au-delà de 12 h on sort du domaine de Riegel et des formats déclarés.
  return sec >= 600 && sec <= 43200 ? sec : null;
}

                                                                       
/**
 * R21 — LE COACH PROACTIF, côté application.
 *
 * Appelé APRÈS chaque ingestion de séance (FIT, GPX, TCX, Strava). Il régénère le
 * plan depuis les réponses — comme `adjustTodayV2` —, détecte les déviations, et
 * ne recalcule QUE la fenêtre de 14 jours, uniquement à la baisse.
 *
 * Ce qu'il rend est une PROPOSITION : le pont ne persiste rien. C'est l'appelant
 * (l'UI) qui décide d'écrire, et l'athlète qui voit ce qui a changé — un plan qui
 * se réécrirait tout seul dans le stockage, sans un écran, serait exactement le
 * produit opaque que ce dépôt refuse d'être.
 */
function coachOnIngestV2(sport        , answers            , ingested                   , today        ) {
  const { plan, reasoned } = generatePlan(toProfile(sport, answers));
  const completed = (answers.completed                                  )
    || completedFromDone(plan, answers, today);
  const sink = new InAppSink();
  const res = onSessionIngested({
    reasoned, plan, refs: reasoned.baseRefs, ingested,
    done: (answers.done || {})                           ,
    completed, today, sink,
  });
  return { ...res, inbox: sink.inbox, plan };
}

(globalThis                           ).EBV2 = {
  buildPlan: buildPlanV2,
  adjustToday: adjustTodayV2,
  coachOnIngest: coachOnIngestV2,
  // S-8 — l'UI contrôle la taille AVANT de lire le fichier : la borne est celle du moteur,
  // pas une seconde valeur écrite dans l'interface.
  maxImportBytes: MAX_IMPORT_BYTES,
  assertImportSize,
  parseActivityText,
  assessReadiness,
  progress: progressV2,
  predict: predictV2,
  badges: badgesV2,
  avatar: avatarV2,
  perfTier: perfTierV2,
  adherence: adherenceV2,
  disciplines: DISCIPLINE_REGISTRY,
  // R7 — l'UI a besoin de la catégorie d'effort déduite et des plafonds trail pour
  // expliquer ses règles pédagogiques : les exposer évite de dupliquer les chiffres
  // (une table de plafonds recopiée dans l'UI, c'est une table qui divergera).
  trailObjective: (answers                         ) => trailObjective(toProfile("trail", answers)),
  trailCaps: { history: TRAIL_HISTORY_CAPS, util: TRAIL_UTIL },
  // S10 — prérequis d'entrée swimrun : l'UI refuse un format long en dessous, et DIT pourquoi.
  // C'est la priorité n°1 du manifeste (santé) dans un sport où l'on est loin du bord.
  // R12 §0 — le module swimrun peut être ABSENT du bundle V1 : ces ponts le tolèrent au lieu
  // de faire tomber tout l'objet `EBV2` au chargement.
  swimrunPrereq: (answers                         ) => (typeof swimrunPrereqBlock === "function" ? swimrunPrereqBlock(answers                       ) : ""),
  swimrunObjective: (answers                         ) => (typeof swimrunObjective === "function" ? swimrunObjective(toProfile("swimrun", answers)) : null),
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
  // R11 — le schéma d'entrée est la SOURCE DE VÉRITÉ des domaines : l'UI doit générer ses
  // options depuis lui, jamais l'inverse (tant qu'ils sont écrits deux fois, ils divergent).
  answerSchema: ANSWER_SCHEMA,
  // R12.6 — la NATURE de chaque question (vécue / mesurée / estimée) est exposée : c'est ce
  // qui permet à un banc de vérifier qu'aucune question estimée ne pilote un chiffre.
  formatsBySport: FORMATS_BY_SPORT,
  minWeeks: MIN_WEEKS,
  validateAnswers,
  EBInputError,
  importFit: importFitBytes,
  fitDerivedTests: FIT_DERIVED_TESTS,
  // R6 §3 — l'adaptateur de données réalisées, exposé à l'UI. Le moteur ne connaît que
  // l'instantané ; l'UI décide QUAND le rafraîchir (cadence = semaine de décharge).
  measuredFromSessions,
  measuredWeeklyHours,
  arbitrateVolRecent,
  sessionNutrition: nutritionForSession,
  dailyEnergy: dailyEnergyV2,
  energyRefusal: energyRefusalV2,
  // RV — le diagnostic de faisabilité (chrono visé). Rend `null` hors course à pied et sans
  // chrono saisi. Il ne touche jamais le plan : c'est un VERDICT, pas une entrée.
  feasibility: feasibilityV2,
  parseChronoSec,
  version: "v2-sprint9",
};

})();
