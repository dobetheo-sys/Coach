#!/usr/bin/env node
/**
 * Golden master (spec R10, § R10.1.4) — le filet de sécurité des extractions mécaniques.
 *
 * Principe : avant de déplacer du code, on photographie CE QUE LE MOTEUR PRODUIT sur un large
 * balayage de profils. Après, on re-photographie. Un seul plan différent = l'extraction est
 * fausse. On ne justifie pas un écart, on le corrige — ou on déclare le changement VOULU en
 * recapturant explicitement (`--capture`), ce qui laisse une trace dans le diff git.
 *
 *   node scripts/goldenMaster.mjs --capture   # écrit golden/hashes.json (+ la photo locale)
 *   node scripts/goldenMaster.mjs --verify    # exit 1 au premier écart
 *
 * Deux fichiers, pour une raison : la photo complète pèse ~46 Mo (578 plans détaillés), ce qui
 * n'a rien à faire dans un dépôt. C'est donc l'**empreinte par profil** qui est versionnée
 * (`golden/hashes.json`, ~60 Ko) — elle détecte l'écart au bit près. La photo complète
 * (`golden/plans.full.json`, ignorée par git) sert à LOCALISER l'écart : capturée avant la
 * modification, elle donne le chemin exact du champ qui a changé.
 *
 * Espace balayé : 6 sports (les 5 de l'UI + le format `run/trail` encore audité par
 * runV2Audit) × formats × historiques × niveaux × intentions, plus une passe « garde-fous »
 * (blessures, âges limites, terrain, volumes extrêmes) où les régressions de sécurité se
 * cachent. Le trail est inclus AVEC ses données de course : sans elles, on n'auditerait pas
 * le module trail mais ses valeurs par défaut.
 *
 * Normalisation : les dates calendaires sont retirées (un plan démarre le lundi courant —
 * sinon la photo périmerait chaque jour), les flottants sont arrondis, les clés triées.
 * Ce qui reste est exactement ce qu'un athlète lit : structure, séances, textes, décisions.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * NOTE DE RECAPTURE — 17/08/2026, lot 1 (plafond de dose sur les blocs prescrits en MÈTRES).
 *
 * **CETTE PHOTO ENCODE UN EFFET O-43 DE MAGNITUDE CONNUE.** Elle est conservée en le sachant,
 * décision du fondateur, plutôt que subie — c'est la forme d'une dette à condition de sortie :
 * un état connu-faux, quantifié, et réversible parce qu'on sait exactement ce qu'il contient.
 *
 *   effet DIRECT du plafond sur le volume ......... NUL
 *       réallocation vérifiée : aucun plan ne livre au-dessus de sa cible, 62 profils sur 65
 *       collent à leur courbe aussi bien qu'avant (critère n°3 d'O-44, vert)
 *   effet INDIRECT, par la boucle O-43 ............ nage −1 420 min sur 38 profils, 0 hausse,
 *       jusqu'à −7,6 min/semaine · volume total −417 min, entièrement porté par la COURBE
 *
 * Le mécanisme, mesuré (`npm run mesure:lot1-ampleur`) : le livré colle à sa courbe dans les
 * deux états, c'est la courbe qui a baissé. La sonde de capacité V2.1 lit un clone SATURÉ de la
 * semaine LIVRÉE — moins de dur livré, capacité mesurée plus basse, courbe plus basse.
 *
 * **C'est O-43 à l'identique, et dans l'autre sens qu'O-42** : O-42 faisait compter les minutes
 * de nage plus haut → la sonde lisait plus de capacité → la courbe montait ; lot 1 fait livrer
 * moins de dur → la sonde lit moins → la courbe baisse. Même boucle, deux directions. La baisse
 * de nage n'est donc pas une propriété du plafond : c'est une propriété d'un défaut ouvert que
 * le plafond DÉCLENCHE.
 *
 * LE JOUR OÙ O-43 SERA TRAITÉ, LE DIFF ATTENDU EST LE RETOUR DE CES QUANTITÉS. Il est connu
 * d'avance, donc il ne sera pas à re-diagnostiquer.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import "../src/app/bridge.ts"; // définit globalThis.EBV2 — le MÊME chemin que l'app

const ROOT = resolve(import.meta.dirname, "..");
const HASHES = join(ROOT, "golden", "hashes.json"); // versionné
const FULL = join(ROOT, "golden", "plans.full.json"); // local, ignoré par git
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const mode = process.argv.includes("--capture") ? "capture" : process.argv.includes("--verify") ? "verify" : null;
/**
 * ADDENDUM 01 — LA POPULATION DU GOLDEN EST DÉSORMAIS IMPORTABLE.
 *
 * `T-19` doit se mesurer « sur le golden 945 », et l'addendum interdit explicitement de créer
 * une seconde population à côté (§9). Deux issues étaient possibles : recopier l'espace de
 * profils dans le banc — deux définitions du catalogue, donc deux vérités le jour où l'une
 * bouge, c'est R11.1 —, ou rendre celle-ci importable. La seconde, évidemment.
 *
 * Ce fichier reste un EXÉCUTABLE : la garde d'usage ne s'applique donc qu'au lancement direct.
 * Importé, il n'exporte que `profiles()` et ne prend aucune décision.
 */
const LANCE_DIRECTEMENT = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!mode && LANCE_DIRECTEMENT) {
  console.error("usage : node scripts/goldenMaster.mjs --capture | --verify");
  process.exit(2);
}

// ---- Espace de profils ----------------------------------------------------
// R16.10 — swimrun réintégré (voir scripts/buildApp.mjs) : ses profils rentrent dans le
// golden avec le module. Ils en sortaient avec lui en R12 §0 — photographier des plans qu'on
// n'expédie pas surveille du vide.
const FORMATS_ALL = {
  run: ["5k", "10k", "semi", "marathon"], // `run/trail` : encore audité par runV2Audit (D10-1)
  bike: ["crit", "route", "cyclo", "clm", "gravel"],
  swim: ["sprint", "demifond", "fond", "ow"],
  tri: ["S", "M", "70.3", "Full"],
  trail: [""], // pas de format : la catégorie d'effort est déduite (R7)
  duathlon: ["S", "M", "L", "PM"], // R10 phase 2
  swimrun: ["experience", "sprint", "series", "championship"], // R10 phase 3, expédié depuis R16.10
};
const FORMATS = FORMATS_ALL;
const HISTORIES = ["reprise", "confirme", "ancien"];
const LEVELS = ["debutant", "inter", "avance"];
const INTENTS = ["competition", "finir", "plaisir"];

const base = () => ({
  vol_max: "10", sessions_max: "6", dispo: "semaine", off_which: "", injury: "", age: "35",
  ftp_known: "oui", ftp: "250", pace_known: "oui", pace: "4:30", css_known: "oui", css: "1:55", races: "non",
});
const swimrunExtras = () => ({
  swim_total_m: "7850", run_total_km: "33", race_dplus_m: "900", segments_n: "20",
  longest_swim_m: "1400", water_temp_c: "16", team_mode: "binome", openwater_access: "saisonnier",
});
// D3 §1 — LES DEUX CLÉS QUE LE GATE B-17 CONSOMME. Sans elles, les 148 profils tri échouaient
// TOUS au gate quelle que soit la qualité du correctif, et le golden aurait dit éternellement que
// le gate bloque tout — une photo de l'instrument, pas du produit. 2 000 m à 1'55/100 m valent
// 38 min de continuité : le gate est satisfait sur les QUATRE formats, donc la passe principale
// photographie des plans NORMAUX. Les trois branches de la conséquence graduée ont leur propre
// sous-passe (« B17 » plus bas) — sans quoi le golden ne verrait qu'une branche sur trois.
const triExtras = () => ({ longest_swim_known: "oui", longest_swim_m: "2000", milieu: "bassin" });
const trailExtras = () => ({
  race_distance_km: "62", race_dplus_m: "3200", race_technicity: "technique", race_night: "partielle",
  train_dplus_access: "collines", treadmill: "non", poles: "a_decider", vam_known: "oui", vam: "850",
});

// Passe « course datée » : l'ancre et l'échéance sont FIXES, sinon la photo périmerait chaque
// semaine (la durée du plan se déduit du nombre de semaines entre l'ancre et la course).
// `plan_start` est dans le passé — c'est la condition pour que l'ancre ne suive pas le
// calendrier ; la course reste dans l'horizon planifiable (< 80 semaines).
const RACE_PASS_START = "2026-01-05"; // un lundi, dans le passé
const RACE_PASS_DATES = ["2027-06-07", "2027-06-08", "2027-06-09", "2027-06-10", "2027-06-11", "2027-06-12", "2027-06-13"];
const JOURS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
// Une date figée finit toujours par entrer dans le passé, et le moteur REFUSE une course
// passée (contrat d'entrée B3). Plutôt qu'une panne obscure dans un an, on prévient huit
// semaines avant, en disant quoi faire.
{
  const alerte = new Date(RACE_PASS_DATES[0] + "T00:00:00Z").getTime() - 56 * 864e5;
  if (Date.now() > alerte) {
    console.error("✖ La passe « course datée » du golden arrive à échéance (" + RACE_PASS_DATES[0] + ").");
    console.error("  À faire : décaler RACE_PASS_DATES d'un an dans scripts/goldenMaster.mjs, puis `npm run golden:capture`.");
    process.exit(2);
  }
}

function* profiles() {
  for (const sport of Object.keys(FORMATS)) {
    for (const format of FORMATS[sport]) {
      for (const history of HISTORIES) {
        for (const level of LEVELS) {
          for (const intent of INTENTS) {
            const a = { ...base(), format, history, level, intent, ...(sport === "trail" ? trailExtras() : sport === "swimrun" ? swimrunExtras() : sport === "tri" ? triExtras() : {}) };
            yield { key: [sport, format || "-", history, level, intent].join("/"), sport, a };
          }
        }
      }
    }
  }
  // Passe « garde-fous » : là où les régressions de SÉCURITÉ se cachent (blessures, âges
  // limites, terrain impraticable, volumes extrêmes, jours bloqués, doubles).
  const guards = [
    ["injury-tibia", { injury: "tibia" }], ["injury-genou", { injury: "genou" }],
    ["injury-epaule", { injury: "epaule" }], ["injury-dos", { injury: "dos" }],
    ["injury-multi", { injury: "tibia,genou" }],
    // R15.7-C — LE CAS « MINEUR » SE DÉDOUBLE, et c'est le but.
    // La passe garde-fous prend le format le PLUS LONG de chaque sport : depuis R15.7-C, un
    // mineur y reçoit un REFUS d'éligibilité, et le plan n'existe plus. Recapturer sans rien
    // changer aurait donc SUPPRIMÉ du golden toute couverture de la protection de charge R6.3
    // — le trou classique : une règle nouvelle qui efface la surveillance d'une règle ancienne.
    // Les deux cas coexistent désormais : le refus est photographié (`mineur` sur format long),
    // et la protection continue de l'être sur un format ouvert aux mineurs.
    ["mineur", { age: "16" }],
    ["mineur-format-ouvert", { age: "16" }, { run: "10k", tri: "M", duathlon: "M", trail: { race_distance_km: "28", race_dplus_m: "900" } }],
    ["master", { age: "62" }],
    ["vol-min", { vol_max: "3", sessions_max: "3" }], ["vol-max", { vol_max: "20", sessions_max: "12" }],
    ["off-2j", { off_days: "oui", off_which: "lun,ven" }], ["doubles", { doubles: "oui", dispo: "quotidienne" }],
    ["vol-recent-bas", { vol_recent: "2", vol_max: "12" }],
    ["terrain-plat", { train_dplus_access: "plat", treadmill: "oui" }],
    // R6 §3.1 — `measured` est une DIMENSION du harnais, pas un cas particulier : absent,
    // fiable, partiel, et incohérent avec la déclaration. Le cas « absent » est déjà couvert
    // par les 820 autres profils — c'est lui le filet (`measured: null` ⇒ plan d'avant).
    ["measured-bas", { vol_recent: "9", measured: { updated_at: "2026-07-30", source: "fit_import", window_days: 28, vol_min: 720, sessions: 12, confidence: "high" } }],
    ["measured-haut", { vol_recent: "2", measured: { updated_at: "2026-07-30", source: "fit_import", window_days: 28, vol_min: 2400, sessions: 24, confidence: "high" } }],
    ["measured-partiel", { vol_recent: "9", measured: { updated_at: "2026-07-30", source: "manual", window_days: 28, vol_min: 300, sessions: 5, confidence: "partial" } }],
    // R11.7 — les trois réponses qui étaient INERTES et qui agissent désormais. Sans ces
    // profils, rien n'empêcherait leur effet de disparaître à nouveau en silence.
    ["dispo-weekend", { dispo: "weekend" }],
    ["dispo-partielle", { dispo: "partielle" }],
    // `plan_start` est OBLIGATOIRE ici, et c'est le seul profil de cette passe dans ce cas :
    // c'est le seul dont le CONTENU dépend de dates calendaires absolues (`phaseOf` lit le jour
    // du cycle sur la date de chaque jour du plan). Sans ancre, `weekBuilder` retombe sur
    // `Date.now()` (ligne 278) et l'alignement des phases glisse avec l'ancre. MESURÉ, et pas
    // au jugé : les empreintes des 10, 11 et 12/08 sont IDENTIQUES, celle du 17/08 diffère —
    // la grille se cale sur le LUNDI de la semaine d'ancrage, donc les sept empreintes
    // `*/cycle` changent une fois PAR SEMAINE, pas chaque nuit. `golden:verify` — un gate de
    // CI — sortait donc rouge tous les lundis sans qu'aucun code n'ait bougé, ce qui est plus
    // pernicieux qu'un rouge quotidien : ça ressemble à une régression du lot en cours.
    // Huitième occurrence de la famille R20.7.
    // La valeur est le lundi de `cycle_start` : jour 1 du plan = jour 1 du cycle, et A-6 a
    // tranché que les dates du golden restent ABSOLUES (un golden doit être reproductible,
    // pas suivre le calendrier).
    ["cycle", { sex: "F", cycle_sync: "oui", cycle_start: "2026-07-27", cycle_len: "28", plan_start: "2026-07-27" }],
    ["poids-levier", { weight_lever: "oui", weight: "82" }],
  ];
  for (const [sport, fmts] of Object.entries(FORMATS)) {
    const format = fmts[fmts.length - 1];
    for (const [label, over, fmtOver] of guards) {
      // `fmtOver` : format (ou données de course, en trail) substitué pour ce garde-fou.
      const sub = fmtOver && fmtOver[sport];
      const a = { ...base(), format: typeof sub === "string" ? sub : format,
        history: "confirme", level: "inter", intent: "competition",
        ...(sport === "trail" ? trailExtras() : sport === "swimrun" ? swimrunExtras() : sport === "tri" ? triExtras() : {}), ...over,
        ...(sub && typeof sub === "object" ? sub : {}) };
      yield { key: ["G", sport, format || "-", label].join("/"), sport, a };
    }
  }
  // ---- Passe « course datée » (N2) ----------------------------------------
  // ANGLE MORT MESURÉ : aucun des 714 profils précédents ne portait de `race_date`. Toute la
  // branche ancrée sur une course — durée déduite de l'échéance, grille alignée sur le jour J,
  // insertion de la course, fenêtre d'allègement de la veille, affûtage — était donc HORS de
  // la couverture du golden. C'est ce qui a permis à N2 (jusqu'à SIX jours de repos après
  // l'objectif) de vivre sans qu'aucune photo ne bouge. Un filet troué là où le plan est le
  // plus engageant pour l'athlète ne protège rien.
  // Les 7 dates sont les 7 JOURS de la semaine : le jour J n'est pas toujours un dimanche, et
  // c'est justement le jour de la course qui pilote la longueur de la dernière semaine.
  for (const [sport, fmts] of Object.entries(FORMATS)) {
    const format = fmts[fmts.length - 1];
    for (let k = 0; k < RACE_PASS_DATES.length; k++) {
      const a = { ...base(), format, history: "confirme", level: "inter", intent: "competition",
        ...(sport === "trail" ? trailExtras() : sport === "swimrun" ? swimrunExtras() : sport === "tri" ? triExtras() : {}),
        plan_start: RACE_PASS_START, race_date: RACE_PASS_DATES[k] };
      yield { key: ["J", sport, format || "-", JOURS[k]].join("/"), sport, a };
    }
  }
  // ---- Passe « volume et extrapolation » (R14 P5) --------------------------
  // MÊME ANGLE MORT, UN CRAN PLUS BAS. La passe ci-dessus fige `vol_max` au profil de base
  // (10 h/sem) — qui est très exactement l'ancrage où l'exposant de Riegel vaut 1,06, sa
  // valeur historique. Autrement dit : P5 (l'exposant piloté par le volume) ne changeait
  // AUCUNE empreinte, non parce qu'il est sans effet, mais parce que la photo le regardait
  // au seul point où il ne bouge pas. Mesuré sur le texte du jour J d'un marathon daté :
  // 3 h 31 à 3 h/sem contre 3 h 12 à 20 h/sem, là où les deux annonçaient 3 h 17 avant.
  // Les deux bornes du domaine entrent donc sous garde permanente.
  for (const v of ["3", "20"]) {
    const a = { ...base(), vol_max: v, vol_recent: String(Math.max(1, +v - 2)), sessions_max: v === "3" ? "3" : "12",
      format: "marathon", history: "confirme", level: "inter", intent: "competition",
      plan_start: RACE_PASS_START, race_date: RACE_PASS_DATES[6] };
    yield { key: ["P5", "run", "marathon", v + "h"].join("/"), sport: "run", a };
  }
  // ---- Passe « allure » (C30 / C31) ----------------------------------------
  // TROISIÈME OCCURRENCE DU MÊME ANGLE MORT (A-2), et celle-ci était PUBLIÉE comme une limite
  // en livrant C31 : le profil de base court à 4:30/km. Or C30 (le plancher de spécificité de
  // la sortie longue) et C31 (le back-to-back marathon) ne mordent que chez le coureur LENT —
  // c'est lui qui passe le plus de temps sur son épreuve. La photo ne regardait donc aucun
  // profil où ces deux règles existent : 121 empreintes ont bougé en livrant C30 sans qu'une
  // seule ne couvre C31, et sa garde a dû vivre entièrement dans `C31-A` (banc v6).
  //
  // Quatre allures qui balaient le domaine (rapide → très lent) × les deux formats où les
  // règles opèrent. `vol_max: 10` parce que c'est l'enveloppe où le back-to-back a de quoi
  // se payer — à 6 h la borne budgétaire l'interdit, et photographier une règle là où elle
  // ne s'applique jamais, c'est refaire l'angle mort qu'on est en train de fermer.
  for (const fmt of ["semi", "marathon"]) {
    for (const p of ["4:30", "5:45", "7:00", "8:30"]) {
      const a = { ...base(), format: fmt, pace: p, pace_known: "oui", vol_max: "10", vol_recent: "8",
        sessions_max: "6", history: "confirme", level: "inter", intent: "competition",
        plan_start: RACE_PASS_START, race_date: RACE_PASS_DATES[6] };
      yield { key: ["C30", "run", fmt, p].join("/"), sport: "run", a };
    }
  }
  // ---- Passe « chrono vélo » (PW) ------------------------------------------
  // CINQUIÈME OCCURRENCE DU MÊME ANGLE MORT (famille A-2), et celle-ci s'est vue en LIVRANT :
  // aucun profil du golden ne porte de `weight`. Or le chrono vélo et le total avec transitions
  // n'existent QUE si le poids est déclaré — sans lui, `bikeTimeEstimate` refuse (P7/P8). Les
  // 912 profils voyaient donc uniquement le renommage du libellé (« Vélo » → « Vélo —
  // intensité »), et pas une seule des minutes que ce chapitre produit.
  //
  // Trois sports × leurs formats × trois reliefs, avec un poids : c'est le relief qui fait le
  // plus bouger le chrono (+9 % vallonné, +27 % montagne), donc c'est lui qu'il faut balayer.
  //
  // ET IL A FALLU DEUX ÉCRITURES : la première posait `weight` mais AUCUNE date de course, et
  // le golden ne bougeait pas d'un bit quand on changeait le CdA de 10 %. La raison est
  // structurelle et vaut d'être écrite — **le golden photographie le PLAN, pas la prédiction**.
  // Les temps prédits n'entrent dans la photo que par UN chemin : la ligne « ⏱ Prévu » de la
  // séance du JOUR J, qui n'existe que si une date de course est déclarée. Sans elle, cette
  // passe surveillait du vide, exactement comme la passe « allure » surveillait `vol_max: 10`
  // en croyant regarder C30b.
  for (const [sport, formats] of [["tri", ["S", "M", "70.3", "Full"]], ["duathlon", ["S", "M", "L", "PM"]], ["bike", ["cyclo", "clm", "gravel"]]]) {
    for (const format of formats) {
      for (const terrain of ["plat", "vallonne", "montagne"]) {
        const a = { ...base(), format, terrain, weight: "75", height: "178", sex: "H",
          history: "confirme", level: "inter", intent: "competition",
          plan_start: RACE_PASS_START, race_date: RACE_PASS_DATES[6] };
        yield { key: ["PW", sport, format, terrain].join("/"), sport, a };
      }
    }
  }

  // ---- Sous-passe « continuité de nage » (B-17 / D3) -----------------------
  // LA PASSE PRINCIPALE NE VOIT QU'UNE BRANCHE SUR TROIS. `triExtras()` satisfait le gate sur les
  // quatre formats — c'est voulu (les plans normaux doivent être photographiés) —, mais la
  // conséquence graduée de D3 en a DEUX autres, et ce sont elles qui décident du format livré :
  //   · déclaration basse, écart NON franchissable → rabattement, avec sa raison chiffrée ;
  //   · déclaration basse, écart FRANCHISSABLE     → format DEMANDÉ conservé + progression ;
  //   · « je ne sais pas » explicite               → ni satisfait, ni rabattu.
  // Sans cette sous-passe, le golden laisserait passer une régression qui ferait rabattre TOUT le
  // monde (le défaut D3 lui-même) ou plus PERSONNE — cinquième occurrence de l'angle mort d'A-2,
  // et la première où on le referme dans le même commit que la règle qu'il doit surveiller.
  // ⚠ LA DATE DE COURSE EST NÉCESSAIRE, ET MA PREMIÈRE ÉCRITURE A PRIS LA MAUVAISE. Elle
  // reprenait `RACE_PASS_DATES[6]` — 75 semaines après l'ancre —, et sur une travée pareille la
  // rampe C22 atteint 40 000 m : AUCUN profil n'était non-franchissable, la sous-passe rendait
  // **0 rabattement sur 20**, et je venais d'écrire dans le commentaire ci-dessus qu'elle refermait
  // l'angle mort d'A-2. Un taux SATURÉ (0 %) accuse l'instrument — le test de dépistage de la
  // règle 15, sur la fixture censée fermer le trou. La date est donc l'HORIZON MINIMAL de chaque
  // format (`MIN_WEEKS.tri`), le seul endroit où la franchissabilité discrimine.
  // ⚠ ET ELLE NE CROISAIT PAS LE NIVEAU — sixième occurrence d'A-2, trouvée en livrant O-54 §2.
  // La sous-passe portait bien les continuités BASSES (100 m, 400 m, « je ne sais pas »), mais
  // toutes en `level: "inter"`. Or la branche que C15 vient de recevoir se lit sur le CROISEMENT
  // `débutant × continuité` : les 36 profils `debutant` tri du corpus principal déclarent TOUS
  // `longest_swim_m: 2000`, donc **aucun vrai débutant nageur n'existait dans le golden** et la
  // moitié protectrice du correctif n'y était exercée par personne. Une première écriture qui
  // retirait la protection (séance de 4 150 m à qui déclare 400 m) serait passée verte.
  //
  // Le corpus a été construit pour couvrir des FORMATS et des NIVEAUX, pas les BRANCHES des règles
  // qui les lisent : chaque fois qu'une règle apprend à lire une nouvelle clé, il devient muet sur
  // son domaine — et il l'est en silence, parce qu'un corpus incomplet rend des résultats verts.
  // `npm run couverture:golden` mesure ce trou au lieu de compter sur la vigilance.
  const B17_DATES = { S: "2026-03-01", M: "2026-03-29", "70.3": "2026-05-24", Full: "2026-09-13" };
  for (const format of ["S", "M", "70.3", "Full"]) {
    for (const niveau of ["inter", "debutant"]) {
    for (const [label, over] of [
      ["basse-100m", { longest_swim_known: "oui", longest_swim_m: "100" }],
      ["basse-400m", { longest_swim_known: "oui", longest_swim_m: "400" }],
      ["inconnue", { longest_swim_known: "non" }],
      ["absente", {}],
      ["eau-libre", { longest_swim_known: "oui", longest_swim_m: "2000", milieu: "ow" }],
    ]) {
      const a = { ...base(), format, history: "confirme", level: niveau, intent: "competition",
        milieu: "bassin", plan_start: RACE_PASS_START, race_date: B17_DATES[format], ...over };
      yield { key: ["B17", "tri", format, niveau, label].join("/"), sport: "tri", a };
    }
    }
  }

  // ---- Sous-passe « allure × petite enveloppe » (C30b) ----------------------
  // ET LA PASSE CI-DESSUS NE VOYAIT TOUJOURS PAS C30b — quatrième occurrence du même angle
  // mort, cette fois d'un cran plus fin. `vol_max: 10` est la bonne enveloppe pour C31 (le
  // back-to-back a besoin de place pour se payer), mais c'est la MAUVAISE pour le plancher de
  // spécificité : à 10 h la sortie longue est déjà BUTÉE sur son plafond de séance aux trois
  // formats (10 km 90, semi 130, marathon 180), donc le plancher peut monter sans qu'une seule
  // minute ne bouge. Vérifié en retirant C30b du moteur : les quatre profils 10 km de la passe
  // ci-dessus rendaient EXACTEMENT le même plan.
  //
  // La règle ne se voit que là où le plancher a de la marge SOUS le plafond : le 10 km à
  // 6 h/semaine (47 → 76 min à 8:30/km). Le 5 km reste dehors, et c'est mesuré aussi — sa
  // cible (~38 min à 8:30) est sous ce que le créneau livre déjà (40 min), la règle n'y a
  // jamais d'objet.
  for (const p of ["4:30", "5:45", "7:00", "8:30"]) {
    const a = { ...base(), format: "10k", pace: p, pace_known: "oui", vol_max: "6", vol_recent: "3",
      sessions_max: "5", history: "confirme", level: "inter", intent: "competition" };
    yield { key: ["C30b", "run", "10k", p].join("/"), sport: "run", a };
  }

  // ---- Sous-passe « récup sans date de course » (O-21b) ---------------------
  // CINQUIÈME OCCURRENCE DU MÊME ANGLE MORT, et celle-ci était déjà écrite noir sur blanc dans
  // le registre : O-21 disait, à sa première correction, « le golden ne bouge pas d'un profil
  // parce que ses profils portent tous une date ». La leçon n'avait pas été appliquée — la
  // sous-passe C30b ci-dessus n'a effectivement pas de `race_date`, mais elle balaie un INTER
  // à 5 séances, et la borne « récup ≤ semaine précédente » ne mord pas là.
  //
  // Le défaut d'O-21b vit sur les préparations construites sur `minWeeks` (l'athlète qui n'a
  // pas encore calé sa date), là où la phase de PIC tient en une seule semaine et où cette
  // semaine peut être une décharge (R18.5 : la cadence de l'athlète l'emporte sur le placement).
  // ET MA PREMIÈRE ÉCRITURE DE CETTE PASSE ÉTAIT DÉCORATIVE — mesurée, pas supposée. Elle
  // héritait du `dispo: "semaine"` de `base()`, et sous cette contrainte les QUATRE allures
  // rendent le MÊME plan à la minute près (1 487 min) : l'allure n'y change rien, donc la passe
  // ne pouvait rien voir. Le commentaire que j'avais écrit affirmait le contraire. Il faut
  // `dispo: "quotidienne"` pour que la semaine ait assez de jours pour que la borne morde.
  //
  // Vérifié dans les deux états — sans le correctif : 1282 / **1061** / 1319 / **1077** min,
  // et les semaines de récup de 5:45 et 8:30 tombent à 2 séances ; avec : 1282 / 1284 / 1319 /
  // 1275 et 3 séances partout.
  for (const p of ["4:30", "5:45", "7:00", "8:30"]) {
    const a = { ...base(), format: "10k", pace: p, pace_known: "oui", vol_max: "6", vol_recent: "5",
      sessions_max: "3", history: "confirme", level: "debutant", intent: "competition",
      dispo: "quotidienne", off_days: "non", doubles: "oui", terrain: "route" };
    yield { key: ["O-21b", "run", "10k", p].join("/"), sport: "run", a };
  }

  // ---- Passe « DISPONIBILITÉ QUOTIDIENNE + DOUBLES » -------------------------------------
  //
  // Ces 26 profils sont nés pour couvrir le cycle de 10 jours (24/08/2026). **Le cycle a été
  // RETIRÉ le 25/08/2026** — la passe RESTE, et ses clés aussi. Ce qu'elle balaie n'a jamais
  // été « le cycle » : c'est la déclaration `dispo: quotidienne` + `doubles: oui` croisée avec
  // les SEPT sports du moteur et trois couples (niveau, intention) pris aux extrémités et au
  // milieu. Cette combinaison existe toujours, elle décide toujours du plan, et le corpus ne la
  // couvrait auparavant que par UN profil (la passe garde-fous « doubles »). La retirer parce
  // que le mécanisme qui l'avait motivée a disparu rétrécirait la couverture d'un espace de
  // DÉCISIONS encore vivant (A-2) — on garde, on corrige la raison, pas la clé.
  //
  // Les clés restent telles quelles POUR NE PAS DÉPLACER LES EMPREINTES : un renommage de
  // donnée produit est un producteur de masse de faux positifs (règle 17).
  //
  // Les deux dernières entrées portent une DATE de course, avec `plan_start` ÉPINGLÉ : sans
  // lui, un profil daté redémarre au lundi courant et dérive d'une semaine chaque lundi.
  const CYCLE10_UNITES = [
    ["run", "marathon"], ["bike", "gravel"], ["swim", "fond"], ["tri", "S"],
    ["tri", "Full"], ["trail", ""], ["duathlon", "L"], ["swimrun", "series"],
  ];
  const CYCLE10_PROFILS = [["debutant", "plaisir"], ["inter", "competition"], ["avance", "finir"]];
  const cycle10Extras = (sport) => (sport === "trail" ? trailExtras() : sport === "swimrun" ? swimrunExtras() : sport === "tri" ? triExtras() : {});
  for (const [sport, format] of CYCLE10_UNITES) {
    for (const [level, intent] of CYCLE10_PROFILS) {
      const a = { ...base(), format, history: "confirme", level, intent,
        dispo: "quotidienne", off_days: "non", doubles: "oui", ...cycle10Extras(sport) };
      yield { key: ["CYCLE10", sport, format || "-", level + "-" + intent].join("/"), sport, a };
    }
  }
  for (const [sport, format] of [["tri", "Full"], ["trail", ""]]) {
    const a = { ...base(), format, history: "confirme", level: "inter", intent: "competition",
      dispo: "quotidienne", off_days: "non", doubles: "oui",
      plan_start: RACE_PASS_START, race_date: RACE_PASS_DATES[0], ...cycle10Extras(sport) };
    yield { key: ["CYCLE10", sport, format || "-", "datee"].join("/"), sport, a };
  }

  // ---- Passe « DRAPEAUX MÉDICAUX » (fiche 37, 25/08/2026) -------------------------------
  //
  // ⚠ ANGLE MORT DE SÉCURITÉ, mesuré par la Phase 1 de l'audit : `med_pain`, `med_dizzy` et
  // `med_treat` n'apparaissaient dans AUCUN des 1 016 profils. Le drapeau médical est pourtant
  // le garde-fou le plus dur du moteur — il retire l'intensité partout et son filet au point de
  // convergence énumère ce qui est PERMIS plutôt que ce qui est interdit. Il était couvert par
  // le banc de fuzz `audit:v7` (qui a d'ailleurs trouvé un contournement en R16.10) mais par
  // AUCUNE photo : rien ne figeait le plan qu'un athlète à drapeau reçoit.
  //
  // Les quatre variantes sont les trois drapeaux SÉPARÉS plus leur combinaison : le moteur les
  // agrège en un seul `medHold`, mais photographier les trois séparément est ce qui montrerait
  // qu'une des trois cesse un jour d'y contribuer. Quatre sports où l'intensité et le volume
  // pèsent le plus, et le couple (niveau, intention) alterne pour que chaque variante voie le
  // débutant en plaisir ET le confirmé en compétition.
  const MED_VARIANTES = [
    ["pain", { med_pain: "oui", med_dizzy: "non", med_treat: "non" }],
    ["dizzy", { med_pain: "non", med_dizzy: "oui", med_treat: "non" }],
    ["treat", { med_pain: "non", med_dizzy: "non", med_treat: "oui" }],
    ["tous", { med_pain: "oui", med_dizzy: "oui", med_treat: "oui" }],
  ];
  const MED_SPORTS = [["tri", "70.3", triExtras], ["run", "semi", () => ({})],
    ["bike", "route", () => ({})], ["trail", "", trailExtras]];
  //
  // ⚠ LE COUPLE (niveau, intention) EST CONSTANT DANS UN SPORT et varie ENTRE sports. Ma
  // première écriture l'alternait par VARIANTE : deux profils y différaient à la fois par le
  // drapeau et par le niveau, donc aucune comparaison n'était à facteur unique — si les plans
  // divergeaient, on ne saurait pas duquel des deux. Ainsi écrit, quatre plans identiques dans
  // un sport sont un FAIT mesuré (les trois drapeaux s'agrègent en un seul `medHold`), pas un
  // artefact de fixture.
  {
    let i = 0;
    for (const [sport, format, extras] of MED_SPORTS) {
      const duo = (i++ % 2) === 0 ? { level: "debutant", intent: "plaisir" } : { level: "inter", intent: "competition" };
      for (const [nom, flags] of MED_VARIANTES) {
        const a = { ...base(), format, history: "confirme", ...duo, ...flags, ...extras() };
        yield { key: ["MED", sport, format || "-", nom, duo.level].join("/"), sport, a };
      }
    }
  }

  // ---- Passe « RÉFÉRENCE INCONNUE » (fiche 37, 25/08/2026) ------------------------------
  //
  // ⚠ SECOND ANGLE MORT de la Phase 1 : `ftp_known`, `pace_known` et `css_known` valaient
  // « oui » sur les 1 016 profils. Le chemin « je ne connais pas ma référence » — celui qui
  // fait basculer tout le moteur sur les zones de fréquence cardiaque et le ressenti — n'était
  // photographié par aucun plan. C'est pourtant le cas du DÉBUTANT, c'est-à-dire de la
  // population que le produit dit servir en premier.
  //
  // La valeur mesurée est RETIRÉE en même temps que le drapeau : un athlète qui répond « non »
  // ne fournit pas de chiffre, et laisser `ftp: 250` derrière un `ftp_known: "non"` testerait
  // une entrée que le questionnaire ne peut pas produire.
  //
  // Pour chaque sport, on balaie les clés qu'il CONSOMME (le vélo n'a pas de CSS, la natation
  // pas de FTP), une par une puis toutes ensemble — sans quoi on ne verrait pas laquelle des
  // trois porte la bascule.
  const SANS_REF = { ftp_known: ["ftp"], pace_known: ["pace"], css_known: ["css"] };
  const REF_SPORTS = [
    ["bike", "route", ["ftp_known"], () => ({})],
    ["run", "semi", ["pace_known"], () => ({})],
    ["trail", "", ["pace_known"], trailExtras],
    ["swim", "demifond", ["css_known"], () => ({})],
    ["tri", "70.3", ["ftp_known", "pace_known", "css_known"], triExtras],
    ["duathlon", "L", ["ftp_known", "pace_known"], () => ({})],
    ["swimrun", "series", ["pace_known", "css_known"], swimrunExtras],
  ];
  for (const [sport, format, cles, extras] of REF_SPORTS) {
    const jeux = cles.length > 1 ? [...cles.map((k) => [k]), cles] : [cles];
    for (const jeu of jeux) {
      const a = { ...base(), format, history: "confirme", level: "debutant", intent: "finir", ...extras() };
      for (const k of jeu) { a[k] = "non"; for (const v of SANS_REF[k]) delete a[v]; }
      const nom = jeu.length === cles.length && cles.length > 1 ? "toutes" : jeu[0].replace("_known", "");
      yield { key: ["REF", sport, format || "-", nom].join("/"), sport, a };
    }
  }

  // ---- Passe « ZONES FRAGILES » (fiche 38, 25/08/2026) ----------------------------------
  //
  // ⚠ Le domaine d'`injury` compte 13 valeurs ; le corpus n'en portait que 5 (`tibia`, `genou`,
  // `epaule`, `dos`, et le couple `tibia,genou`). Or `R6_PAIN_CONTRAINDICATION` associe à
  // certaines zones des disciplines INTERDITES : chaque zone non couverte est une règle de
  // contre-indication qu'aucune photo ne fige.
  //
  // Le sport est choisi pour que la contre-indication soit OBSERVABLE : `cou` interdit la nage
  // ET le vélo, donc seul un multisport peut montrer ce qu'il en reste ; `course` interdit la
  // course à pied, ce qui ne se voit que là où d'autres disciplines existent. Les zones sans
  // entrée dans la table (`velo`, `quadriceps`, `cheville`, `fascia`) sont incluses
  // DÉLIBÉRÉMENT : leur absence de la table est un fait à photographier, pas à supposer.
  const INJ_CAS = [
    ["pied", "run", "semi", () => ({})],
    ["hanche", "run", "semi", () => ({})],
    ["fascia", "run", "semi", () => ({})],
    ["cheville", "trail", "", trailExtras],
    ["quadriceps", "trail", "", trailExtras],
    ["course", "tri", "70.3", triExtras],
    ["velo", "tri", "70.3", triExtras],
    ["cou", "tri", "70.3", triExtras],
  ];
  for (const [zone, sport, format, extras] of INJ_CAS) {
    const a = { ...base(), format, history: "confirme", level: "inter", intent: "competition",
      injury: zone, ...extras() };
    yield { key: ["INJ", sport, format || "-", zone].join("/"), sport, a };
  }

  // ---- Passe « ÂGE AUX EXTRÊMES » (fiche 38, 25/08/2026) ---------------------------------
  //
  // ⚠ Le domaine va de 10 à 100 ; le corpus ne portait que 16, 35 et 62. Trois garde-fous
  // distincts s'y jouent et aucun n'était photographié à sa frontière : la borne de format du
  // mineur (`AGE_MINI_FORMAT` — 18 ans pour un marathon, un 70.3 ou un Full), la borne de
  // l'estimation énergétique (16 ans, O-16) et le facteur master (60 ans, `R6_AGE_LOAD`).
  //
  // Les DEUX côtés de chaque frontière sont pris : 17 et 18 sur marathon (refus puis
  // acceptation), 12 sur un trail de 62 km (au-dessus de `AGE_MINI_TRAIL_KM = 50`). Un refus
  // typé est une sortie du moteur comme une autre — le corpus le photographie déjà pour
  // `mineur`, et c'est ce qui rend un assouplissement futur visible.
  //
  // O-112 (fiche 40, 01/09/2026) — LE SEUIL TRAIL DESCEND DE 50 À 42 KM, ET AUCUN PROFIL DU
  // CORPUS NE POUVAIT LE VOIR. Tous les profils trail du golden courent 62 km, c'est-à-dire
  // au-dessus de l'ANCIEN seuil comme du nouveau : `golden:verify` rendait donc **0 écart** —
  // le résultat attendu, et indiscernable d'une photo qui ne regarde pas. Deux profils de plus
  // encadrent la nouvelle frontière à 45 km : 17 ans (refus typé) et 18 ans (plan). C'est la
  // règle « un zéro a besoin de sa population » appliquée à un seuil qu'on vient de déplacer.
  const trail45 = () => ({ ...trailExtras(), race_distance_km: "45", race_dplus_m: "2100" });
  const AGE_CAS = [
    ["run", "semi", ["12", "16", "17", "60", "80", "100"], () => ({})],
    ["run", "marathon", ["17", "18"], () => ({})],
    ["bike", "route", ["12", "100"], () => ({})],
    ["trail", "", ["12"], trailExtras],
    // Le trail n'a pas de FORMAT (la distance est une réponse libre) : l'étiquette de clé est
    // donc portée à part, sinon elle atterrirait dans `a.format` et le schéma la refuserait.
    ["trail", "", ["17", "18"], trail45, "45km"],
  ];
  for (const [sport, format, ages, extras, etiquette] of AGE_CAS) {
    for (const age of ages) {
      const a = { ...base(), format, history: "confirme", level: "inter", intent: "finir",
        age, ...extras() };
      yield { key: ["AGE", sport, etiquette || format || "-", age].join("/"), sport, a };
    }
  }

  // ---- Passe « FC MAX » (fiche 38, 25/08/2026) -------------------------------------------
  //
  // ⚠ `hr_max` était absente des 1 046 profils, y compris des 14 profils `REF` de la fiche 37 —
  // ceux-là mêmes qui basculent sur les zones cardiaques faute de référence sportive. Le
  // « repli du repli » n'était donc jamais exercé : le moteur estime alors la FC max par
  // l'âge (`reasoningEngine.ts:34`), et rien ne figeait ce que ça produit.
  //
  // Trois profils déclarent une FC max AVEC la référence sportive inconnue — c'est le cas où
  // les zones cardiaques pilotent vraiment les consignes — et un quatrième la déclare avec les
  // références connues, pour voir si elle change quelque chose quand elle n'est pas nécessaire.
  const HR_CAS = [
    ["run", "semi", { pace_known: "non" }, ["pace"], "sans-allure"],
    ["bike", "route", { ftp_known: "non" }, ["ftp"], "sans-ftp"],
    ["trail", "", { pace_known: "non" }, ["pace"], "sans-allure"],
    ["run", "semi", {}, [], "refs-connues"],
  ];
  for (const [sport, format, flags, suppr, nom] of HR_CAS) {
    const a = { ...base(), format, history: "confirme", level: "inter", intent: "finir",
      hr_max: "185", ...flags, ...(sport === "trail" ? trailExtras() : {}) };
    for (const k of suppr) delete a[k];
    yield { key: ["HRMAX", sport, format || "-", nom].join("/"), sport, a };
  }

  // ---- Passe « ATHLÈTE RÉEL » (O-85 §2, 19/08/2026) -------------------------------------
  //
  // *« Ma configuration — `sessions_max` élevé, `doubles`, 70.3, nage limitante — n'existe dans
  // aucun des 989 profils. C'est la neuvième A-2, et c'est la seule qui compte vraiment : le
  // corpus couvre des formats et des niveaux, pas l'utilisateur qui existe. »* (fondateur)
  //
  // Mesuré avant d'écrire : sur les 989, **458 profils nagent, médiane 2,6 km/sem, p99 11,2 km,
  // ZÉRO au-dessus de 12** — pendant que le plan réellement suivi en délivre 12,1. Le trou n'est
  // pas une valeur extrême, c'est un CROISEMENT que rien ne produisait : beaucoup de séances ×
  // jours doubles × format long × nage limitante. Tant qu'il n'y est pas, chaque garde peut être
  // verte sur 989 profils et fausse sur le seul plan que quelqu'un suit.
  //
  // ⚠ CE PROFIL EST RECONSTITUÉ, PAS RELEVÉ, ET L'ÉCART EST PUBLIÉ. Le dépôt portait DEUX
  // « profils du fondateur » divergents (le bloc `verify` d'O-71 et le défaut de
  // `mesureProgression`) ; aucun ne reproduit les chiffres publiés (S1 9,8 h · nage 48 % · vélo
  // 28 % · course 24 %). Celui-ci reprend le plus proche — le bloc O-71, seul à porter la
  // STRUCTURE décrite — et rend S1 9,4 h · nage 54 % · vélo 33 % · course 13 %. C'est donc la
  // FORME qui est couverte, pas l'état exact : la fixture deviendra littérale quand les champs
  // manquants seront relevés dans l'app plutôt que devinés (règle de fixture : on ne remplit
  // pas un champ vide, on le demande).
  {
    const a = { ...base(), format: "70.3", history: "confirme", level: "inter", intent: "competition",
      vol_max: "20", vol_recent: "13", sessions_max: "12", dispo: "quotidienne",
      off_days: "non", doubles: "oui", age: "35", sex: "H", weight: "85", terrain: "vallonne",
      leg_swim_env: "lac", milieu: "bassin", longest_swim_m: "1000", longest_swim_known: "oui",
      pace_known: "oui", pace: "4:42", ftp_known: "oui", ftp: "236", css_known: "oui", css: "2:02",
      // ⚠ `plan_start` ÉPINGLÉ — sans lui, ce profil DÉRIVE D'UNE SEMAINE SUR L'AUTRE.
      // Sa course est absolue (2027-06-07) mais son départ ne l'était pas : faute de
      // `plan_start`, le moteur démarre au LUNDI COURANT, donc la préparation raccourcit d'une
      // semaine chaque lundi et le plan change. Mesuré le 24/08/2026 (un lundi) :
      // `golden:verify` rouge sur ce seul profil, `lotPhysio` T-60 en régression avec lui —
      // deux gates rouges un jour sur sept, qui se lisent comme une régression du lot en cours.
      // C'est le défaut que la passe « course datée » avait fermé pour les autres (N2) et que
      // cette fixture, ajoutée après (O-85 §2), n'avait pas reçu. Un golden doit être
      // REPRODUCTIBLE : la date est donc figée, comme les dates de course de la passe voisine.
      race_date: RACE_PASS_DATES[0], plan_start: "2026-08-17" };
    yield { key: ["REEL", "tri", "70.3", "nage-limitante"].join("/"), sport: "tri", a };
  }
}

// ---- Normalisation canonique --------------------------------------------
const ISO = /^\d{4}-\d{2}-\d{2}/;
const DROP = new Set(["date", "dateISO", "plan_start", "generatedAt", "createdAt", "id"]);

function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) {
      if (DROP.has(k)) continue;                     // dates : la photo ne doit pas périmer
      const val = canon(v[k]);
      if (typeof val === "string" && ISO.test(val)) continue;
      out[k] = val;
    }
    return out;
  }
  if (typeof v === "number") return Math.round(v * 1000) / 1000; // bruit flottant
  return v;
}

/** La taille du corpus, ÉPINGLÉE. Elle ne se déduit pas de `hashes.json` : une photo tronquée
 *  et un balayage tronqué se valideraient mutuellement.
 *  990 depuis la fixture `REEL/tri/70.3/nage-limitante` (O-85 §2, 19/08/2026). L'épingle aurait
 *  dû monter DANS le commit de la fixture — elle est restée à 989 deux commits, et le gate a
 *  rougi comme prévu : c'est exactement le travail de « un zéro a besoin de sa population ». */
// 1016 depuis la passe « CYCLE DE 10 JOURS » (24/08/2026) : +26 profils, tous à `use10`, qui
// portent les SEPT sports — le chantier « unité de volume = cycle » ne pouvait valider sa
// logique propre au cycle que sur 5 profils, soit deux familles. L'épingle monte AVEC sa
// cause, et le moteur est byte-identique dans ce lot : ce qui bouge est le CORPUS.
const POPULATION = 1071;  // +2 (fiche 40, O-112) : un trail de 45 km à 17 et à 18 ans, de part et d'autre du nouveau seuil `AGE_MINI_TRAIL_KM = 42` — sans eux, « 0 écart » ne prouvait rien (tous les trails du corpus courent 62 km, au-dessus de l'ancien seuil comme du nouveau)

function snapshot() {
  const snap = {};
  let n = 0, errors = [], refus = [];
  for (const { key, sport, a } of profiles()) {
    try {
      snap[key] = canon(globalThis.EBV2.buildPlan(sport, a));
    } catch (e) {
      // R16.10-a — UN REFUS TYPÉ N'EST PAS UNE ERREUR, c'est un COMPORTEMENT PHOTOGRAPHIÉ.
      // Depuis R15.7-C (un mineur ne s'inscrit pas sur un format 18+), quatre profils du
      // golden se terminent par `ENTREE_INVALIDE` — le refus voulu, ajouté exprès à la passe
      // de garde-fous. Le golden les hachait correctement (« 0 écart ») mais sortait quand
      // même en code 1 : la CI gate sur `golden:verify`, donc CE GATE ÉTAIT ROUGE DEPUIS
      // R15.7-C, et un gate rouge en permanence est un gate que plus personne ne lit. Même
      // distinction que `U-REFUS:` au banc v7 (R11) : on compte, on affiche, on ne confond pas.
      const typed = e && e.code === "ENTREE_INVALIDE";
      const msg = key + " : " + (e && e.message ? e.message : String(e));
      if (typed) { refus.push(msg); snap[key] = { REFUS: String(e.key), ATTENDU: String(e.expected) }; }
      else { errors.push(msg); snap[key] = { ERREUR: String(e && e.message ? e.message : e) }; }
    }
    n++;
  }
  return { snap, n, errors, refus };
}

export { profiles, snapshot, canon };

if (!LANCE_DIRECTEMENT) { /* importé pour ses profils : on s'arrête ici */ } else {

const { snap, n, errors, refus } = snapshot();
if (refus.length) {
  console.log("· " + refus.length + " refus d'entrée typé(s) — comportement attendu, photographié :");
  for (const r of refus.slice(0, 5)) console.log("   " + r);
}
if (errors.length) {
  console.error("✖ " + errors.length + " profil(s) en erreur :");
  for (const e of errors.slice(0, 5)) console.error("   " + e);
}

const hashes = {};
for (const k of Object.keys(snap).sort()) hashes[k] = sha(JSON.stringify(snap[k]));

if (mode === "capture") {
  mkdirSync(join(ROOT, "golden"), { recursive: true });
  writeFileSync(HASHES, JSON.stringify(hashes, null, 1) + "\n");
  writeFileSync(FULL, JSON.stringify(snap));
  console.log("✓ golden master capturé : " + n + " profils → golden/hashes.json (versionné)"
    + " + golden/plans.full.json (" + Math.round(JSON.stringify(snap).length / 1024 / 1024) + " Mo, local)");
  process.exit(errors.length ? 1 : 0);
}

// ---- Vérification -------------------------------------------------------
if (!existsSync(HASHES)) {
  console.error("✖ aucun golden master : lancer `node scripts/goldenMaster.mjs --capture` d'abord");
  process.exit(2);
}
const ref = JSON.parse(readFileSync(HASHES, "utf8"));
// La photo complète n'est utilisée que si elle correspond à la référence versionnée : une
// photo périmée localiserait un écart imaginaire, ce qui est pire que pas de localisation.
let full = null;
if (existsSync(FULL)) {
  try {
    const cand = JSON.parse(readFileSync(FULL, "utf8"));
    const same = Object.keys(ref).every((k) => cand[k] !== undefined && sha(JSON.stringify(cand[k])) === ref[k]);
    if (same) full = cand;
  } catch { /* photo illisible : on s'en passe */ }
}
const keys = [...new Set([...Object.keys(ref), ...Object.keys(hashes)])];
const diffs = [];
for (const k of keys) {
  if (ref[k] === hashes[k]) continue;
  if (ref[k] === undefined) { diffs.push({ k, why: "profil NOUVEAU (absent de la photo)" }); continue; }
  if (hashes[k] === undefined) { diffs.push({ k, why: "profil DISPARU (présent dans la photo)" }); continue; }
  diffs.push({
    k,
    why: full ? firstDiff(full[k], snap[k], "") ?? "empreinte différente, contenu identique (?)"
      : "empreinte " + ref[k] + " → " + hashes[k] + " (photo locale absente : impossible de localiser)",
    // O-52 — L'AMPLEUR À CÔTÉ DE LA LOCALISATION. `firstDiff` rend le PREMIER écart, et c'est
    // le bon choix pour corriger ; mais c'était la SEULE sortie, donc c'est elle qu'on agrège
    // quand on veut savoir « combien ça bouge » — et on publie alors la médiane de N *premiers*
    // écarts en croyant tenir celle du mouvement. C'est arrivé, sur le lot 1, et le chiffre faux
    // a fondé un arbitrage. Un outil qui n'a qu'une réponse la verra reprise pour l'autre
    // question : il en a deux désormais.
    ampleur: full ? countDiff(full[k], snap[k]) : null,
  });
}

/**
 * O-52 — COMBIEN de champs bougent, et de combien au plus.
 * Complément strict de `firstDiff` : celle-ci répond « où », celle-ci « combien ». Le plus grand
 * écart n'est rendu que sur les feuilles NUMÉRIQUES — un changement de chaîne n'a pas d'amplitude,
 * et lui en inventer une (longueur, distance d'édition) serait une grandeur voisine de plus.
 */
function countDiff(a, b, out) {
  out = out || { n: 0, max: 0, ou: "" };
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    out.n++;
    if (typeof a === "number" && typeof b === "number" && Math.abs(b - a) > out.max) out.max = Math.abs(b - a);
    return out;
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) countDiff(a[k], b[k], out);
  return out;
}

/** Chemin du premier écart : « où » compte plus que « combien » pour corriger. */
function firstDiff(a, b, path) {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    return path + " : " + JSON.stringify(a) + " → " + JSON.stringify(b);
  }
  if (Array.isArray(a) !== Array.isArray(b)) return path + " : type de conteneur changé";
  if (Array.isArray(a) && a.length !== b.length) return path + " : " + a.length + " → " + b.length + " élément(s)";
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = firstDiff(a[k], b[k], path + (Array.isArray(a) ? "[" + k + "]" : "." + k));
    if (d) return d;
  }
  return path + " : écart non localisé";
}

if (!diffs.length) {
  // UN ZÉRO A BESOIN DE SA POPULATION (arbitrage du fondateur, 17/08/2026). « 0 écart » est le
  // résultat ATTENDU de ce gate : l'heuristique « un taux saturé accuse l'instrument » ne peut
  // donc pas se déclencher ici — la valeur saturée EST la valeur du succès, et l'échec de la
  // mesure est indiscernable de sa réussite à la lecture. Si une régression faisait comparer
  // ZÉRO profil, la sortie serait « 0 profils, 0 écart » : verte, et lue comme verte. On assert
  // donc que la MESURE A EU LIEU, séparément de son résultat.
  if (n !== POPULATION) {
    console.error("✖ golden master : " + n + " profils comparés, " + POPULATION + " attendus.");
    console.error("   Le corpus a changé de taille — le « 0 écart » ne prouve rien tant que ce compte n'est pas rétabli");
    console.error("   (ou POPULATION mise à jour DANS LE MÊME COMMIT, avec la raison).");
    process.exit(1);
  }
  console.log("✓ golden master : " + n + "/" + POPULATION + " profils, 0 écart" + (errors.length ? " (mais " + errors.length + " erreur(s) de génération)" : ""));
  process.exit(errors.length ? 1 : 0);
}
console.error("✖ golden master : " + diffs.length + " écart(s) sur " + n + " profils");
const show = Number(process.env.GOLDEN_SHOW || 12);
for (const d of diffs.slice(0, show)) {
  const a = d.ampleur;
  console.error("   " + d.k + (a ? "   [" + a.n + " champ(s) en écart" + (a.max ? ", plus grand écart numérique " + (Math.round(a.max * 1000) / 1000) : "") + "]" : ""));
  console.error("      " + d.why);
}
if (diffs.length > show) console.error("   … et " + (diffs.length - show) + " autre(s)");
// O-52 — L'AGRÉGAT, pour que « combien ça bouge » ne se lise plus dans la liste des « où ».
const amp = diffs.map((d) => d.ampleur).filter(Boolean);
if (amp.length) {
  const tri = (f) => amp.map(f).sort((x, y) => x - y);
  const ch = tri((a) => a.n), mx = tri((a) => a.max);
  const med = (l) => l[Math.floor(l.length / 2)], p90 = (l) => l[Math.min(l.length - 1, Math.floor(l.length * 0.9))];
  console.error("\nAMPLEUR (et non localisation — les deux ne répondent pas à la même question) :");
  console.error("   champs en écart par profil : médiane " + med(ch) + " · p90 " + p90(ch) + " · max " + ch[ch.length - 1]
    + "   (total " + ch.reduce((t, x) => t + x, 0) + ")");
  console.error("   plus grand écart numérique : médiane " + med(mx) + " · p90 " + p90(mx) + " · max " + mx[mx.length - 1]);
}
console.error("\nUn écart = l'extraction est fausse. Si le changement est VOULU, recapturer");
console.error("explicitement (`--capture`) pour qu'il apparaisse dans le diff git.");
process.exit(1);

}
