/**
 * A-5 — LE JOURNAL DE PROJECTION.
 *
 * ================================================================================
 * POURQUOI CE FICHIER DOIT EXISTER AUJOURD'HUI ET PAS DANS SIX MOIS
 * ================================================================================
 *
 * Le registre appelle A-5 « l'angle mort le plus profond du prédicteur », et sa
 * formulation est sans ambiguïté : *« Les bandes `h`, `G_plafond`, `k_structure`
 * sont des heuristiques que RIEN ne valide. On ne saura jamais qu'elles sont
 * fausses tant que les projections ne seront pas confrontées aux résultats réels.
 * Premier geste, et il doit être fait MAINTENANT. »*
 *
 * C'est le seul chantier du dépôt dont le coût AUGMENTE avec l'attente : tous les
 * autres défauts restent aussi chers demain qu'aujourd'hui, celui-ci détruit
 * chaque jour une donnée qui n'existera plus jamais. Une prépa de marathon dure
 * quatre mois ; sans ce fichier, quatre mois d'entraînement réel ne laissent
 * AUCUNE trace de ce que le moteur avait annoncé, et la première calibration
 * honnête est repoussée d'autant.
 *
 * P11 en donne la démonstration a contrario. Sa première calibration a été
 * RETIRÉE parce qu'elle visait à faire entrer dans la fourchette la trajectoire
 * d'UNE personne — et HERITAGE (Bouchard) dit précisément que la variabilité
 * inter-individuelle est énorme : 7 % des sujets gagnent ≤ 0,1 L/min et 8 %
 * ≥ 0,7 L/min sous programme identique. Calibrer sur un cas est interdit ; on ne
 * peut donc calibrer que sur une POPULATION, et une population ne se reconstitue
 * pas rétroactivement.
 *
 * ================================================================================
 * CE QUE CE JOURNAL N'EST PAS, ET C'EST SA GARDE PRINCIPALE
 * ================================================================================
 *
 * **Il ENREGISTRE, il ne REBOUCLE JAMAIS.** Aucune ligne de ce fichier n'est lue
 * par le moteur, ni par `projectForm`, ni par `predict`. Un journal qui
 * influencerait la projection deviendrait une seconde source de vérité — ce que
 * R11.1, R20.5 et U9 interdisent partout ailleurs — et, pire, une boucle qui se
 * confirme elle-même : le moteur calibré sur ses propres annonces finirait par
 * mesurer sa cohérence au lieu de sa justesse.
 *
 * La lecture de ce journal est un acte HUMAIN, hors ligne, sur les données
 * exportées. C'est la seule façon honnête de s'en servir.
 *
 * ================================================================================
 * CE QU'IL ÉCRIT, ET POURQUOI CE GRAIN-LÀ
 * ================================================================================
 *
 * **Une entrée par SEMAINE ISO**, pas par jour. La projection ne bouge
 * pratiquement pas d'un jour à l'autre (l'adhérence est calculée sur une fenêtre
 * glissante de six semaines, P1) : journaliser chaque ouverture multiplierait le
 * volume par sept pour la même information, sur un stockage — `localStorage` —
 * qui est fini et partagé avec l'état du plan. Le grain utile à une calibration,
 * c'est « à tel horizon, le moteur annonçait ceci ».
 *
 * Chaque entrée porte de quoi REFAIRE le calcul plus tard, sans le code de
 * l'époque : l'horizon, les références mesurées qui ont servi d'ancre, le gain
 * projeté et sa fourchette, l'adhérence, la confiance, et les temps annoncés par
 * discipline. Un journal qui ne garderait que le chrono annoncé serait
 * inexploitable — on saurait que le moteur s'est trompé, jamais POURQUOI.
 *
 * Et l'autre moitié : au passage du jour J, `noteRaceResult()` referme la boucle
 * en attachant le temps RÉEL à la dernière projection connue. C'est le couple
 * (annoncé à H semaines, réalisé) qui vaut quelque chose ; ni l'un ni l'autre
 * séparément.
 */
import { S, ebSave, todayISO } from "./state.js";

/** Plafond d'entrées. Une prépa d'Ironman fait ~60 semaines ; 160 couvre trois plans. */
const MAX_ENTREES = 160;

/** Clé de semaine ISO — le grain du journal (voir l'en-tête). */
export function semaineISO(iso) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // jeudi de la semaine ISO
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const n = Math.ceil(((d - jan1) / 864e5 + 1) / 7);
  return d.getUTCFullYear() + "-S" + String(n).padStart(2, "0");
}

/** Arrondi court : le journal n'a pas besoin de la 12e décimale d'un flottant. */
const r3 = (x) => (typeof x === "number" && isFinite(x) ? Math.round(x * 1000) / 1000 : null);

/**
 * Enregistre la projection du jour si la semaine n'est pas déjà couverte.
 *
 * `pr` est la prédiction DÉJÀ CALCULÉE par l'appelant : on ne la recalcule pas ici.
 * Recalculer coûterait un second appel moteur à chaque rendu d'onglet, et surtout
 * ferait courir le risque que le journal enregistre autre chose que ce qui est
 * AFFICHÉ — le défaut que R19.5 a trouvé entre la prose d'une séance et sa structure.
 */
export function logProjection(sport, answers, pr) {
  try {
    if (!pr) return;
    const pj = pr.projected;
    const today = todayISO();
    const sem = semaineISO(today);
    const log = Array.isArray(answers.projLog) ? answers.projLog : [];
    if (log.some((e) => e.sem === sem)) return; // une par semaine, la première suffit

    const raceDate = answers.race_date || (pj && pj.raceDate) || null;
    const horizon = raceDate
      ? Math.round((new Date(raceDate + "T00:00:00Z") - new Date(today + "T00:00:00Z")) / (7 * 864e5))
      : null;

    const entree = {
      sem, date: today, sport,
      format: answers.format || null,
      horizonSem: horizon,
      // LES ANCRES MESURÉES : sans elles, un gain de +4 % ne veut rien dire.
      refs: {
        ftp: answers.ftp != null && answers.ftp !== "" ? Number(answers.ftp) : null,
        pace: answers.pace || null,
        css: answers.css || null,
        volMax: answers.vol_max != null && answers.vol_max !== "" ? Number(answers.vol_max) : null,
        volRecent: answers.vol_recent != null && answers.vol_recent !== "" ? Number(answers.vol_recent) : null,
        poids: answers.weight != null && answers.weight !== "" ? Number(answers.weight) : null,
        age: answers.age != null && answers.age !== "" ? Number(answers.age) : null,
        sexe: answers.sex || null,
        niveau: answers.level || null,
        historique: answers.history || null,
        structure: answers.training_structure || null,
      },
      // CE QUE LE MOTEUR A ANNONCÉ, tel qu'affiché à cette date.
      actuel: (pr.items || []).map((x) => ({ leg: x.leg, valeur: x.value })),
      projete: pj && pj.applicable ? (pj.items || []).map((x) => ({ leg: x.leg, valeur: x.value })) : null,
      // ET SUR QUOI IL S'EST APPUYÉ POUR L'ANNONCER.
      gainPct: pj && pj.gainPct ? {
        ftp: r3(pj.gainPct.ftp), thrPace: r3(pj.gainPct.thrPace),
        css: r3(pj.gainPct.css), vam: r3(pj.gainPct.vam),
      } : null,
      gainBand: pj && pj.gainBand ? {
        ftp: (pj.gainBand.ftp || []).map(r3), thrPace: (pj.gainBand.thrPace || []).map(r3),
        css: (pj.gainBand.css || []).map(r3), vam: (pj.gainBand.vam || []).map(r3),
      } : null,
      adherence: pj ? r3(pj.adherence) : null,
      confiance: pj ? pj.confidence || null : null,
      // Le MOTIF d'un refus de projeter est une donnée, pas un trou (P8).
      motifRefus: pj && !pj.applicable
        ? ((pj.decisions || []).find((d) => /^P7-refus$|^P8$/.test(d.id)) || {}).why || "non applicable"
        : null,
      reel: null, // rempli au passage du jour J par noteRaceResult()
    };

    log.push(entree);
    // On rogne par le DÉBUT : les entrées les plus anciennes sont aussi les plus
    // lointaines du jour J, donc les moins informatives sur le résultat final.
    answers.projLog = log.slice(-MAX_ENTREES);
    ebSave();
  } catch (e) {
    // Un journal ne doit JAMAIS empêcher l'athlète de voir sa prédiction. Il échoue
    // en silence et le produit continue — c'est la seule exception acceptable à
    // « pas d'échec muet » (D1), parce que l'alternative est pire pour l'utilisateur.
  }
}

/**
 * Referme la boucle : le temps RÉEL vient s'attacher à la projection la plus
 * récente. C'est le COUPLE (annoncé à H semaines, réalisé) qui vaut quelque chose.
 *
 * On l'attache aussi à la première entrée de chaque horizon marquant (≥ 4 semaines
 * avant le jour J) : c'est celle-là qu'une calibration voudra lire, pas la
 * projection faite la veille — la veille, il ne reste plus rien à projeter.
 */
export function noteRaceResult(temps) {
  try {
    const log = Array.isArray(S.answers.projLog) ? S.answers.projLog : [];
    if (!log.length || !temps) return;
    const reel = { temps: String(temps), date: todayISO() };
    for (let i = log.length - 1; i >= 0; i--) {
      if (log[i].reel) break;      // déjà refermé : on ne réécrit pas l'histoire
      log[i].reel = reel;
      if ((log[i].horizonSem || 0) >= 4) break; // on remonte jusqu'à la 1re projection utile
    }
    S.answers.projLog = log;
    ebSave();
  } catch (e) { /* voir logProjection */ }
}

/** Le journal, prêt à être lu HORS LIGNE. Aucun consommateur dans le moteur. */
export function exportProjectionLog() {
  return Array.isArray(S.answers.projLog) ? S.answers.projLog : [];
}
