// R4.3 — célébrations adaptées au type de séance. Ton : adulte, sport-fashion, sobre.
// Jamais de culpabilisation, jamais d'infantilisation. ≥15 messages par catégorie pour
// éviter la répétition (rotation pseudo-aléatoire SANS répétition immédiate, persistée).
// {goal} = l'objectif de l'athlète (format de course), {dur} = durée de la séance.
import { S, ebSave } from "../state.js";
import { SPORTS } from "../config.js";

const LIB = {
  // Basse intensité / endurance — « travail de l'ombre » : valoriser l'invisible
  endurance: [
    "Le travail que personne ne voit. {dur} dans la banque.",
    "Pas spectaculaire. Fondamental. C'est exactement là que ça se construit.",
    "L'aérobie se gagne à voix basse. Séance posée, mission remplie.",
    "Facile aujourd'hui, fort demain. C'est le contrat, tu l'as honoré.",
    "Zone 2, zéro gloire, plein d'effet. Le métier rentre.",
    "Une brique de plus au mur. Personne n'applaudit, tout le monde le verra à {goal}.",
    "La régularité bat le talent quand le talent ne s'entraîne pas. Encore un jour pour toi.",
    "Allure de conversation, ambitions silencieuses.",
    "Ce volume facile, c'est ta marge de sécurité du jour J.",
    "Les fondations ne se prennent pas en photo. Elles portent tout.",
    "Cardio calme, tête froide, plan respecté.",
    "Tu viens d'acheter de l'endurance au prix le plus bas : la patience.",
    "Rien à prouver aujourd'hui. Juste à construire. C'est fait.",
    "Le moteur diesel se règle à froid. Réglage effectué.",
    "Semaine après semaine, c'est cette séance-là qui fait la différence à {goal}.",
  ],
  // Qualité (seuil, VO2, intervalles) — « travail qui brille » : énergique, jamais criard
  qualite: [
    "Les blocs sont passés. Ton seuil te dira merci au retest.",
    "Ça, c'est de l'entraînement qui laisse une trace. Récupère bien.",
    "Intensité maîtrisée du premier au dernier bloc. Signature d'athlète.",
    "Le dur est fait. La suite du plan s'appuie dessus.",
    "Tu as encaissé la séance qui fait avancer {goal}.",
    "La qualité d'aujourd'hui, c'est l'aisance de dans six semaines.",
    "Chaque intervalle tenu déplace ton plafond. Il vient de bouger.",
    "Travail propre. Pas un bloc bâclé.",
    "La VO2 n'a pas de raccourci. Tu viens de prendre le chemin complet.",
    "Séance exigeante, exécution nette. C'est tout ce qu'on demande.",
    "Le corps proteste, les adaptations signent. Bonne affaire.",
    "Tu t'es frotté à l'allure cible. Elle commence à te connaître.",
    "Du rythme dans les jambes, de la confiance dans la tête.",
    "C'est sur ces séances qu'on reconnaît ceux qui arrivent prêts à {goal}.",
    "Le compteur affiche : fait. Le reste, c'est de la récupération intelligente.",
  ],
  // Repos / décharge — valorisation physiologique (le repos EST une séance)
  repos: [
    "La séance la plus dure : ne rien faire. Adaptation en cours.",
    "Le muscle se construit au repos. Chantier ouvert, ne pas déranger.",
    "Récupération respectée. C'est une compétence, et tu l'as.",
    "Aujourd'hui ton entraînement, c'était la discipline de ne pas t'entraîner.",
    "La surcompensation a besoin de silence. Tu viens de lui en donner.",
    "Repos validé. Ta série continue — c'est comme ça qu'on tient 16 semaines.",
    "Zéro séance, 100% utile. Le plan compte sur ces journées-là.",
    "S'arrêter quand c'est prévu, c'est s'entraîner intelligemment.",
    "Les gains d'hier s'installent aujourd'hui. Laisse-les travailler.",
    "Ne rien faire, volontairement, au bon moment : niveau expert.",
    "Ta fraîcheur de {goal} se fabrique exactement maintenant.",
    "Journée off assumée. Les hormones de réparation font les 3-8.",
    "Le repos n'est pas une pause du plan. C'est le plan.",
    "Recharge en cours. Ne pas débrancher.",
    "Savoir lever le pied : le geste technique le moins enseigné, le plus payant.",
  ],
  // Séance longue — endurance mentale
  longue: [
    "{dur} dehors. C'est là que se construit {goal}.",
    "La longue est passée. Le mental a pris ses kilomètres aussi.",
    "Longtemps, calmement, jusqu'au bout. Rien ne remplace ça.",
    "Tu as tenu la durée. Le jour J en tiendra compte.",
    "C'est long, c'est lent, c'est précisément le but. Bravo pour la patience.",
    "L'endurance, c'est de la gestion. Tu viens d'en faire une démonstration.",
    "Une longue de faite, une peur de moins pour {goal}.",
    "Les dernières minutes d'une longue valent double. Tu les as prises.",
    "Ravito, allure, tête : tout géré. La distance devient une routine.",
    "Le corps apprend à durer. Leçon du jour retenue.",
    "Chaque longue rapproche la distance de course du mot « normal ».",
    "Tu as passé du temps là où {goal} se gagne : loin, longtemps.",
    "Sortie longue cochée. La caisse se remplit.",
    "Trois mots : dans la boîte.",
    "La solitude du fond de sortie longue, tu la connais maintenant. Elle ne t'arrêtera pas.",
  ],
};

// Type de séance depuis les steps (mêmes suffixes de zones que le dashboard 80/20).
const HARD = [".vo2", ".thr", ".speed", ".css", ".ss", ".rp", ".frc"];
export function classifySession(s) {
  if (!s || s.d === "rs") return "repos";
  if (s.long || s.brick) return "longue";
  const hard = (s.steps || []).some((st) => st.role === "body" && typeof st.zone === "string" && HARD.some((z) => st.zone.endsWith(z)));
  return hard ? "qualite" : "endurance";
}

function goalLabel() {
  const cfg = SPORTS[S.sport];
  if (!cfg) return "ta course";
  const f = (cfg.formats || []).find((x) => x[0] === S.answers.format);
  return f ? f[1].split("(")[0].trim() : "ta course";
}

/** Message de célébration : rotation pseudo-aléatoire sans répétition immédiate (persistée). */
export function celebrationMessage(session) {
  const type = classifySession(session);
  const pool = LIB[type] || LIB.endurance;
  if (!S.answers.celebIdx) S.answers.celebIdx = {};
  const last = S.answers.celebIdx[type];
  let idx = Math.floor(Math.random() * pool.length);
  if (idx === last) idx = (idx + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
  S.answers.celebIdx[type] = idx;
  ebSave();
  const dur = session && session.min ? (session.min >= 60 ? Math.floor(session.min / 60) + "h" + String(Math.round(session.min % 60)).padStart(2, "0") : Math.round(session.min) + "min") : "";
  return pool[idx].replace(/\{goal\}/g, goalLabel()).replace(/\{dur\}/g, dur || "la séance");
}
