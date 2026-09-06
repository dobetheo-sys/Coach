// Sous-onglet 🧰 Outils › 📚 Éducatifs — lot R26 (voir CLAUDE.md), schéma unifié à six disciplines.
//
// REMPLACE l'ancien `tab-eduglossaire.js` (glossaire de gestes lié au générateur). Décision du
// fondateur (réponse à la question de réconciliation) : ce module riche prend la place du même
// sous-onglet, même libellé (le brief lui-même reporte le choix du libellé définitif — on ne le
// change pas). `src/engine/eduLibrary.ts` reste intouché : `swimDrillGlossaryText()` continue
// d'alimenter les notes de séance, un import ENGINE que ce lot ne touche pas. Ce fichier lit
// `EBV2.eduLibrary` en LECTURE SEULE pour la section « Vocabulaire de séance » (course), sans
// jamais resaisir son contenu (R11.1).
//
// UN SEUL composant de rendu pour les six disciplines (A1) : un dispatcher de type de contenu
// (texte/test/seuils/table/schema/drill/debat/warn/secu/renvoi), une barre de disciplines
// alimentée par le sport du profil (B3), un mécanisme de verrouillage/progression générique
// (actif seulement pour les disciplines qui déclarent des `prerequis` — natation aujourd'hui).
import { S, $, ebSave, esc, todayISO, fmtDay } from "../state.js";
import { SPORTS } from "../config.js";
import { DISC } from "./icons.js";
import { EDUCATIFS, disciplinesForSport, sectionsFor } from "../data/educatifs/registry.js";
import { SVG_REGISTRY } from "../data/educatifs/svgRegistry.js";

/** §3 du brief : livré, jamais activé par défaut — l'arbitrage reste à faire. `true` = le
 *  contenu d'une section verrouillée reste intégralement lisible (A5, comportement requis).
 *  `false` = seuls le titre et l'accroche sont rendus ; c'est la seule lecture qui donne un
 *  sens au drapeau (sinon il ne changerait rien). */
const LOCKED_PREVIEW = true;

const BADGES = { forte: "Preuves solides", terrain: "Mesures de terrain", consensus: "Consensus d'enseignement" };

/* ============================================================
   REFONTE « NOIR APAISÉ » — canevas 16a · 16b · 17a-d · 21a-c (06/09/2026)
   ============================================================
   Ce que l'écran doit dire, dans cet ordre (16a) : les sous-onglets d'Outils (posés par
   `tab-outils.js`, primitive `.zn-seg`) → les PILULES de discipline (bordure à la couleur de
   la discipline pour l'active, par `--sa` — jamais un hex dans le CSS) → un PANNEAU d'intro à
   liseré de discipline (eyebrow « ÉDUCATIFS · NATATION », titre display, chapeau) → la CHAÎNE
   des paliers (perles reliées : ✓ acquis, numéro en cours) → chaque palier en carte, dont
   l'état décide la forme : acquis = ligne repliée avec ✓ · en cours = carte à liseré de
   discipline (titre display, badge de preuve, accroche, « Ouvrir le palier ») · verrouillé =
   carte grisée dont le CONTENU RESTE PRÉSENT (A5) · hors séquence = carte sans numéro, avec sa
   ligne « Hors séquence · ouvert depuis le palier N » DÉRIVÉE de `prerequis`. Les disciplines
   SANS chaîne (vélo, course, enchaînements — 17b/c/d) n'ont ni perles ni numéros : des fiches
   indépendantes, titre display + pastille de preuve + accroche.

   La FICHE OUVERTE (16b / 21a-c) est le MÊME `<details>` : quand il s'ouvre, son <summary>
   devient l'en-tête de fiche (« ‹ Éducatifs », pilule de discipline, eyebrow « Palier 3 sur
   3 » ou « Fiche 2 sur 5 · indépendante », titre display, accroche, badge de preuve EN TÊTE —
   ou la ligne qui dit qu'il n'y en a pas, 21c). Les deux vues vivent dans le <summary>, c'est
   le CSS qui montre l'une ou l'autre selon `[open]` : un seul `<details>`, un seul premier
   <summary> (A6 clique le premier), un seul état d'ouverture.

   Ce qui est DÉRIVÉ et jamais recopié du canevas : le compte de paliers (« La chaîne fait
   trois paliers »), la position (« Palier 3 sur 3 », « Fiche 2 sur 5 »), la phrase de
   pied du bouton (« les cinq fiches se lisent dans l'ordre que tu veux » — N vient des
   données), le prérequis du hors-séquence. Les TEXTES de contenu restent ceux des fichiers
   `data/educatifs/*` : titres, accroches, gestes, erreurs, sources — mot pour mot.

   COULEUR DE DISCIPLINE. Le canevas peint natation / vélo / course avec `DISC[*].ac`
   (icons.js — l'axe « discipline d'une séance », le même que les badges de la grille), pas
   avec `SPORTS[*].accent` (l'axe « sport préparé », V5). Ce module parle de disciplines :
   il lit donc `DISC`. Enchaînements n'est pas une discipline de séance mais son brick l'est —
   `DISC.br` (violet, la valeur que le canevas 17d/21c emploie). Trail et swimrun n'ont pas de
   code `DISC` ni d'écran au canevas : ils gardent l'accent de leur sport (registre R10). */
const NOMBRES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];
const enLettres = (n) => NOMBRES[n] || String(n);

function accentOf(discipline) {
  const parDisc = { natation: DISC.sw, velo: DISC.bk, course: DISC.rn, enchainements: DISC.br };
  const d = parDisc[discipline.discipline];
  if (d) return d.ac;
  const parSport = { trail: "trail", swimrun: "swimrun" };
  const sport = parSport[discipline.discipline];
  return (sport && SPORTS[sport] && SPORTS[sport].accent) || DISC.br.ac;
}

/** Une discipline « à chaîne » déclare des `prerequis` sur ses sections EN séquence (natation
 *  aujourd'hui) — c'est ce critère, pas le nom de la discipline, qui décide de la forme (17a vs
 *  17b-d : perles et numéros d'un côté, fiches indépendantes de l'autre). */
const sequenceDe = (discipline) => discipline.sections.filter((s) => !s.horsSequence);
const aChaine = (discipline) => sequenceDe(discipline).some((s) => s.prerequis);

/** Sections actuellement dépliées — PAR discipline affichée, remis à zéro quand on change de
 *  discipline. Permet de réappliquer `open` à la reconstruction (validation = re-rendu complet,
 *  §2 du plan) sans perdre ce que l'athlète avait ouvert. */
let ouvertes = new Set();

function eduState(disciplineId) {
  if (!S.answers.educatifs) S.answers.educatifs = {};
  if (!S.answers.educatifs[disciplineId]) S.answers.educatifs[disciplineId] = { valides: [], derniereConsultation: null };
  return S.answers.educatifs[disciplineId];
}

const estVerrouille = (section, valides) => section.prerequis != null && !valides.includes(section.prerequis);

const CHEV = '<span class="edu-chev" aria-hidden="true">⌄</span>';
const COCHE = '<svg class="edu-check" width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5l4 4 8-9"/></svg>';

function tableHTML(lignes) {
  return '<table class="edu-table">' + lignes.map((l) =>
    '<tr data-niveau="' + esc(l.niveau) + '"><td>' + l.cle + "</td><td>" + l.valeur + "</td></tr>").join("") + "</table>";
}

/** Un bloc « point clé » (16b : liseré jaune, eyebrow en capitales, texte en encre pleine).
 *  L'eyebrow est le TITRE du bloc de données ; `variante` distingue le repère de passage (vert,
 *  16b « Le repère pour passer au suivant ») du reste. */
function keyHTML(titre, corps, variante) {
  return '<div class="edu-key' + (variante ? " edu-key--" + variante : "") + '">'
    + (titre ? '<span class="edu-key-h zn-mono">' + esc(titre) + "</span>" : "") + corps + "</div>";
}

function renderContenuItem(item, ctx) {
  switch (item.type) {
    case "texte":
    case "test":
      // Le DERNIER bloc de texte d'un palier chaîné est son repère de passage (« Quand passer
      // au suivant ») : le canevas 16b le peint en vert, distinct du point clé. Le critère est
      // la POSITION dans le palier (propriété des données), pas le libellé (règle 17).
      return keyHTML(item.titre, item.paragraphes.map((p) => "<p>" + p + "</p>").join(""),
        ctx.chaine && ctx.dernierTexte === item ? "next" : (item.type === "test" ? "test" : ""));
    case "seuils":
      return '<div class="edu-block">' + tableHTML(item.lignes.map((l) => ({ niveau: l.niveau, cle: l.cas, valeur: l.consequence }))) + "</div>";
    case "table":
      return '<div class="edu-block">' + (item.titre ? '<span class="edu-block-h zn-mono">' + esc(item.titre) + "</span>" : "") + tableHTML(item.lignes) + "</div>";
    case "schema":
      return '<div class="edu-block edu-schema"><figure role="group">' + (SVG_REGISTRY[item.ref] || "") + "</figure></div>";
    // Les gestes en CARTES NUMÉROTÉES avec leur consigne (16b : « 01 LE BALAYAGE », 21a : « 01
    // TROUVER TA CADENCE LIBRE ») — le numéro et le liseré portent la couleur de discipline.
    case "drill":
      return stepsHTML(item.items.map((d) => ({ nom: d.nom, detail: d.detail, fig: d.schemaRef ? (SVG_REGISTRY[d.schemaRef] || "") : "" })));
    case "debat":
      return keyHTML(item.titre, "<p>" + item.texte + "</p>", "debat");
    // ── LES ERREURS FRÉQUENTES ──
    // Le patron de carte dessiné en maquette réclame un bloc d'erreurs types. Il n'a pas fallu
    // l'écrire : il EXISTE déjà, sous le type `warn`, et chaque occurrence du corpus en est une.
    // Le titre est posé au rendu (intertitre `.zn-sec` + rail rouge, 21a-c) ; aucune donnée
    // n'a été touchée.
    case "warn":
      return '<div class="zn-sec edu-sec"><span>Les erreurs fréquentes</span><i></i></div>'
        + '<div class="edu-err"><i aria-hidden="true"></i><div class="warn">' + item.texte + "</div></div>";
    // secu : encart rouge plein, JAMAIS replié — rendu directement dans le corps de la
    // section, jamais sous un <details> imbriqué (A10 : visible dès l'ouverture, sans clic
    // de plus).
    case "secu":
      return '<div class="edu-block"><div class="edu-secu"><strong class="zn-mono">⚠ Sécurité</strong><span>' + item.texte + "</span></div></div>";
    case "renvoi":
      return '<div class="edu-block"><div class="edu-renvoi"><strong>→ ' + esc(item.titre) + "</strong><span>" + item.texte + "</span></div></div>";
    default:
      return "";
  }
}

function stepsHTML(items) {
  return '<div class="zn-sec edu-sec"><span>La marche à suivre</span><i></i></div>'
    + '<div class="edu-steps">' + items.map((d, i) =>
      '<div class="edu-step"><div class="edu-step-top"><span class="edu-step-n zn-mono">' + String(i + 1).padStart(2, "0") + "</span>"
      + '<span class="edu-step-t zn-display">' + esc(d.nom) + "</span></div>"
      + '<div class="edu-step-d">' + d.detail + "</div>"
      + (d.fig ? '<figure class="edu-drill-fig" role="group">' + d.fig + "</figure>" : "")
      + "</div>").join("") + "</div>";
}

/** Section « Vocabulaire de séance » (course) : pas de `contenu` statique, rendue depuis
 *  `EBV2.eduLibrary` (R11.1 — jamais une resaisie du texte du moteur). */
function contenuDynamiqueHTML(ref) {
  const [, cle] = ref.split(":");
  const lib = (globalThis.EBV2 && globalThis.EBV2.eduLibrary) || [];
  const entry = lib.find((e) => e.key === cle);
  if (!entry || !entry.drills || !entry.drills.length) return "";
  return stepsHTML(entry.drills.map((d) => ({ nom: d.name.charAt(0).toUpperCase() + d.name.slice(1), detail: esc(d.how), fig: "" })));
}

/** Le badge de preuve, en tête de fiche (16b/21a/21b). Trois libellés autorisés (A11) ; un
 *  champ vide ne rend AUCUN badge (21c) — c'est l'appelant qui pose la ligne d'explication. */
function badgeHTML(preuve, classe) {
  if (!preuve || !BADGES[preuve]) return "";
  return '<span class="' + classe + ' zn-mono" data-n="' + esc(preuve) + '">'
    + (preuve === "forte" ? COCHE : '<i class="edu-dot" aria-hidden="true"></i>') + BADGES[preuve] + "</span>";
}

function sectionHTML(discipline, section, valides, accent, sections) {
  const chaine = aChaine(discipline);
  const lock = estVerrouille(section, valides);
  const done = valides.includes(section.id);
  const prereq = section.prerequis ? discipline.sections.find((s) => s.id === section.prerequis) : null;
  const open = ouvertes.has(section.id);
  const seq = sequenceDe(discipline);
  const enSequence = chaine && !section.horsSequence;
  // L'état qui décide de la FORME de la carte fermée (16a) : acquis · en cours (le premier
  // palier de la séquence ni validé ni verrouillé) · verrouillé · libre (hors séquence, ou
  // discipline sans chaîne).
  const enCours = enSequence && !done && !lock && seq.find((s) => !valides.includes(s.id) && !estVerrouille(s, valides)) === section;
  const etat = done ? "done" : (lock ? "locked" : (enCours ? "active" : "libre"));

  const lockedMsg = lock
    ? '<p class="edu-locked-msg">Tu peux lire cette section librement, mais elle ne se valide qu\'une fois « '
      + esc(prereq ? prereq.titre : "") + " » acquise.</p>"
    : "";

  const contenu = section.contenu || [];
  const ctx = { chaine: enSequence, dernierTexte: [...contenu].reverse().find((it) => it.type === "texte") };
  const corps = lock && !LOCKED_PREVIEW
    ? lockedMsg
    : lockedMsg + (section.contenuDynamique ? contenuDynamiqueHTML(section.contenuDynamique)
      : contenu.map((it) => renderContenuItem(it, ctx)).join(""))
      // LES SOURCES D'UNE SECTION VIVENT DANS LA SECTION : repliées, en CREUX sous le contenu
      // qu'elles appuient (16b « Sources de ce palier », 21a « Sources de cette fiche »). Rien
      // n'est resaisi : ce sont les mêmes `section.sources`.
      + sourcesListHTML(section.sources, enSequence ? "Sources de ce palier" : "Sources de cette fiche");

  // ── En-tête de FICHE (vue ouverte, 16b / 21a-c) ──
  const idx = sections.indexOf(section);
  const eyebrow = enSequence
    ? "Palier " + esc(String(section.numero)) + " sur " + seq.length
    : (chaine ? "Hors séquence" : "Fiche " + (idx + 1) + " sur " + sections.length + " · indépendante");
  let preuveHead = badgeHTML(section.preuve, "edu-badge");
  if (!section.preuve) {
    // 21c — le champ est vide dans les données : aucun badge, et une ligne qui dit pourquoi.
    preuveHead = '<span class="edu-nopreuve zn-creux"><b>Pas de niveau de preuve sur cette fiche.</b> Elle ne décrit pas un effet '
      + "physiologique mais une manière de conduire une séance : il n'y a rien à prouver, seulement à s'entendre sur les mots.</span>";
  } else if (section.preuve === "consensus") {
    // 21b — le niveau le plus faible, dit sans le déguiser, et ce que ça implique.
    preuveHead += '<span class="edu-preuve-note">Autrement dit : largement enseigné, peu mesuré. Essaie-le trois semaines et garde-le '
      + "seulement si tu sens la différence — pas parce qu'une fiche te l'a dit.</span>";
  }
  const ficheHead = '<span class="edu-fiche">'
    + '<span class="edu-fiche-nav"><span class="edu-back zn-mono">‹ Éducatifs</span>'
    + '<span class="edu-disc-chip zn-mono"><i aria-hidden="true"></i>' + esc(discipline.libelle) + "</span></span>"
    + '<span class="edu-fiche-eyebrow zn-mono"><span>' + eyebrow + "</span><i></i></span>"
    + '<span class="edu-fiche-title zn-display">' + esc(section.titre) + "</span>"
    + (section.accroche ? '<span class="edu-fiche-accroche">' + esc(section.accroche) + ".</span>" : "")
    + preuveHead
    + "</span>";

  // ── Carte FERMÉE (16a / 17a-d) ──
  const numLabel = section.numero != null ? esc(String(section.numero)) + " — " : "";
  let rangee;
  if (etat === "done") {
    rangee = '<span class="edu-row-line">' + COCHE + '<span class="edu-row-t zn-mono">' + numLabel + esc(section.titre) + "</span>" + CHEV + "</span>";
  } else if (etat === "active") {
    rangee = '<span class="edu-row-line edu-row-line--base"><span class="edu-row-t zn-display">' + numLabel + esc(section.titre) + "</span>"
      + badgeHTML(section.preuve, "edu-preuve") + "</span>"
      + '<span class="edu-row-accroche">' + esc(section.accroche || "") + ".</span>"
      + '<span class="edu-row-open zn-mono"><span>Ouvrir le palier</span>' + CHEV + "</span>";
  } else if (etat === "locked") {
    rangee = '<span class="edu-row-line"><span class="edu-row-t zn-display">' + numLabel + esc(section.titre) + "</span>"
      + badgeHTML(section.preuve, "edu-preuve") + CHEV + "</span>"
      + '<span class="edu-row-accroche">Verrouillée — « ' + esc(prereq ? prereq.titre : "") + " » d'abord.</span>";
  } else if (chaine) {
    // Hors séquence dans une discipline à chaîne (16a « EL — Viser en eau libre ») : étiquette
    // du numéro s'il en porte un, accroche, et la ligne dérivée du prérequis.
    rangee = '<span class="edu-row-line">' + (section.numero != null ? '<span class="edu-tag zn-mono">' + esc(String(section.numero)) + "</span>" : "")
      + '<span class="edu-row-t zn-mono">' + esc(section.titre) + "</span>" + CHEV + "</span>"
      + (section.accroche ? '<span class="edu-row-accroche">' + esc(section.accroche) + ".</span>" : "")
      + (prereq ? '<span class="edu-row-note zn-mono">Hors séquence · ouvert depuis le palier ' + esc(String(prereq.numero)) + "</span>" : "");
  } else {
    // Fiche indépendante (17b/c/d) : titre display, pastille de preuve à droite, accroche.
    rangee = '<span class="edu-row-line edu-row-line--base"><span class="edu-row-t zn-display">' + esc(section.titre) + "</span>"
      + (section.preuve ? badgeHTML(section.preuve, "edu-preuve") : '<span class="edu-preuve edu-preuve--none zn-mono">Sans badge</span>') + "</span>"
      + (section.accroche ? '<span class="edu-row-accroche">' + esc(section.accroche) + "</span>" : "");
  }

  // ── Le bouton : « Je valide ce palier » (16b, plein, couleur de discipline) sur une chaîne ;
  //    « Marquer comme lu » (21a, secondaire) sur une fiche indépendante. Même `[data-valide]`,
  //    même bascule (revalider = dévalider, cascade comprise).
  const libelle = done ? (enSequence ? "✓ Palier validé" : "✓ Lu")
    : (lock ? "Verrouillée" : (enSequence ? "Je valide ce palier" : "Marquer comme lu"));
  const pied = enSequence ? "Tu peux le relire à tout moment."
    : (chaine ? "" : "Aucun palier à débloquer ici : les " + enLettres(sections.length) + " fiches se lisent dans l'ordre que tu veux.");
  const bouton = '<div class="edu-cta"><button type="button" class="' + (enSequence ? "zn-btn edu-valider" : "zn-btn-2") + '" data-valide="'
    + esc(discipline.discipline) + ":" + esc(section.id) + '"' + (lock ? " disabled" : "") + ">" + libelle + "</button>"
    + (pied ? '<div class="edu-cta-pied zn-mono">' + pied + "</div>" : "") + "</div>";

  return '<details class="edu-section" data-etat="' + etat + '" data-chaine="' + enSequence + '" data-locked="' + lock + '" data-done="' + done + '" data-section="'
    + esc(section.id) + '" style="--sa:' + accent + '"' + (open ? " open" : "") + ">"
    + '<summary class="edu-sum"><span class="edu-row">' + rangee + "</span>" + ficheHead + "</summary>"
    + '<div class="edu-body">' + corps + bouton + "</div>"
    + "</details>";
}

/** La chaîne des paliers (16a) : perles reliées — ✓ acquis, numéro en cours, numéro estompé
 *  verrouillé — puis la phrase dérivée du compte et des sections hors séquence à prérequis. */
function progressHTML(discipline, valides) {
  if (!aChaine(discipline)) return ""; // pas de chaîne → pas de barre (générique, pas un cas natation)
  const seq = sequenceDe(discipline);
  const horsSeq = discipline.sections.filter((s) => s.horsSequence && s.prerequis);
  const perles = seq.map((s, i) => {
    const state = valides.includes(s.id) ? "done" : (estVerrouille(s, valides) ? "locked" : "active");
    const bar = i < seq.length - 1 ? '<span class="edu-pbar" data-state="' + (valides.includes(s.id) ? "done" : "") + '"></span>' : "";
    return '<div class="edu-pstep"><span class="edu-bead zn-mono" data-state="' + state + '">'
      + (valides.includes(s.id) ? "✓" : esc(String(s.numero ?? "•"))) + "</span>" + bar + "</div>";
  }).join("");
  const phrase = "La chaîne fait " + enLettres(seq.length) + " palier" + (seq.length > 1 ? "s" : "") + "."
    + (horsSeq.length ? " " + horsSeq.map((s) => "« " + esc(s.titre) + " »").join(", ") + (horsSeq.length > 1 ? " vivent" : " vit") + " hors séquence." : "");
  return '<div class="edu-progress" aria-label="Progression">' + perles + "</div>"
    + '<div class="edu-progress-note zn-mono">' + phrase + "</div>";
}

/** La liste de sources d'UN bloc, repliée, en CREUX. Même balisage que la boîte de bas de
 *  page (mêmes classes, donc même style et même `data-type` de niveau de preuve). */
function sourcesListHTML(sources, titre) {
  if (!Array.isArray(sources) || !sources.length) return "";
  return '<details class="edu-sources-box edu-src-inline zn-creux"><summary class="zn-mono"><span>' + esc(titre || "Sources") + "</span>" + CHEV + "</summary><div>"
    + '<div class="edu-src-group"><ul>'
    + sources.map((src) => '<li data-type="' + esc(src.type) + '">' + src.texte
      + (src.url ? ' <a href="' + esc(src.url) + '" target="_blank" rel="noopener">Consulter</a>' : "") + "</li>").join("")
    + "</ul></div></div></details>";
}

/* ============================================================
   OÙ CETTE DISCIPLINE APPARAÎT DANS TON PLAN
   ============================================================
   Le manque relevé à la relecture : les Éducatifs sont une bibliothèque posée à côté du plan.
   On y apprend un geste sans jamais savoir QUAND on le fera — et un contenu qui ne rejoint
   jamais l'entraînement se lit comme un article de magazine, pas comme une préparation.

   Ce bloc fait le pont, et il ne l'invente pas : il compte les séances de la discipline dans
   le plan DÉJÀ GÉNÉRÉ (`S.currentPlan`, jamais un recalcul — R11.1) et nomme la prochaine.
   Rien n'est écrit, rien n'est stocké.

   LA GRANULARITÉ EST CELLE QUE LA DONNÉE PERMET, et c'est délibéré : par DISCIPLINE, pas par
   étape. Rattacher « étape 3 : la position de la tête » à une séance précise demanderait une
   table étape → séance qui n'existe nulle part ; je l'aurais écrite au jugé, et elle serait
   devenue fausse à la première évolution du générateur. Un lien vrai et large vaut mieux
   qu'un lien précis et inventé. Forme du canevas 21a (« Où ça apparaît dans ton plan » : une
   ligne à nu, rail de discipline, titre + méta) — les chiffres sont ceux du plan. */
const DISC_CODE = { natation: "sw", velo: "bk", course: "rn", enchainements: "br" };
function ancrePlanHTML(discipline) {
  const code = DISC_CODE[discipline.discipline];
  const plan = S.currentPlan;
  if (!code || !plan || !Array.isArray(plan.weeks)) return "";
  const today = todayISO();
  let total = 0, prochaine = null;
  plan.weeks.forEach((w) => w.days.forEach((d) => (d.sessions || []).forEach((s) => {
    if (s.d !== code) return;
    total++;
    if (!prochaine && d.date >= today) prochaine = { date: d.date, jour: d.jour, name: s.name };
  })));
  if (!total) return "";
  return '<div class="zn-sec edu-sec edu-sec--plan"><span>Où ça apparaît dans ton plan</span><i></i></div>'
    + '<div class="edu-plan-row"><i aria-hidden="true"></i><div>'
    + (prochaine ? '<div class="edu-plan-t">' + esc(prochaine.name) + " · " + esc(prochaine.jour || "") + " " + esc(fmtDay(prochaine.date)) + "</div>"
        + '<div class="edu-plan-m">La prochaine des ' + total + " séance" + (total > 1 ? "s" : "") + " de cette discipline dans ton plan</div>"
      : '<div class="edu-plan-t">' + total + " séance" + (total > 1 ? "s" : "") + " de cette discipline</div>"
        + '<div class="edu-plan-m">Toutes sont passées.</div>')
    + "</div></div>";
}

function sourcesHTML(discipline) {
  const groupes = [];
  if (discipline.intro && discipline.intro.sources && discipline.intro.sources.length) {
    groupes.push({ titre: "Introduction", sources: discipline.intro.sources });
  }
  // Les sources d'une SECTION sont rendues DANS la section (`sourcesListHTML`) : les répéter
  // ici en ferait deux endroits à tenir pour une même liste. La boîte de bas de page garde ce
  // qui n'appartient à aucune étape — les sources de l'introduction (16a : « Sources »).
  if (!groupes.length) return "";
  return '<details class="edu-sources-box zn-panel"><summary class="zn-mono"><span>Sources</span>' + CHEV + "</summary><div>"
    + groupes.map((g) => '<div class="edu-src-group"><h3>' + esc(g.titre) + "</h3><ul>"
      + g.sources.map((src) => '<li data-type="' + esc(src.type) + '">' + src.texte
        + (src.url ? ' <a href="' + esc(src.url) + '" target="_blank" rel="noopener">Consulter</a>' : "") + "</li>").join("")
      + "</ul></div>").join("")
    + "</div></details>";
}

function navHTML(disciplines, active) {
  return '<nav class="edu-nav" aria-label="Disciplines Éducatifs">' + disciplines.map((d) =>
    '<button type="button" class="edu-disc zn-mono" data-disc="' + esc(d.discipline) + '" aria-current="' + (d.discipline === active.discipline) + '" style="--sa:' + accentOf(d) + '">'
    + (d.libelle) + "</button>").join("") + "</nav>";
}

/** Le PANNEAU d'intro (16a / 17a-d) : liseré de discipline en haut, eyebrow « ÉDUCATIFS ·
 *  NATATION », compte à droite (« 3 paliers · 1 hors séquence » / « 5 fiches »), titre display,
 *  chapeau, puis l'encart des données replié sur son titre (17c/17d : une ligne à rail). */
function introHTML(discipline, sections) {
  const chaine = aChaine(discipline);
  const seq = sequenceDe(discipline);
  const hors = sections.length - (chaine ? seq.length : 0);
  const compte = chaine
    ? seq.length + " palier" + (seq.length > 1 ? "s" : "") + (hors ? " · " + hors + " hors séquence" : "")
    : sections.length + " fiche" + (sections.length > 1 ? "s" : "");
  const encart = discipline.intro.encart
    ? '<details class="edu-encart"><summary class="zn-mono"><i aria-hidden="true"></i><span>' + esc(discipline.intro.encart.titre) + "</span>" + CHEV + "</summary>"
      + '<div class="edu-encart-body">' + discipline.intro.encart.paragraphes.map((p) => "<p>" + p + "</p>").join("") + "</div></details>"
    : "";
  return '<div class="edu-intro zn-panel">'
    + '<div class="edu-intro-top"><span class="edu-eyebrow zn-mono">Éducatifs · ' + esc(discipline.libelle) + "</span>"
    + '<span class="edu-intro-compte zn-mono">' + compte + "</span></div>"
    + '<h2 class="edu-intro-title zn-display">' + esc(discipline.intro.titre) + "</h2>"
    + '<p class="edu-intro-chapeau">' + esc(discipline.intro.chapeau) + "</p>"
    + encart + "</div>";
}

export function renderTabEducatifs() {
  const disciplines = disciplinesForSport(S.sport);
  if (!disciplines.length) {
    $("screen").innerHTML = '<div class="edu-intro zn-panel"><span class="edu-eyebrow zn-mono">Éducatifs</span>'
      + '<p class="edu-intro-chapeau">Rien à afficher pour ce sport.</p></div>';
    return;
  }
  const active = disciplines.find((d) => d.discipline === S.eduDiscipline) || disciplines[0];
  S.eduDiscipline = active.discipline;
  const accent = accentOf(active);
  const state = eduState(active.discipline);
  const valides = state.valides;
  state.derniereConsultation = todayISO();

  const sections = sectionsFor(active, S.sport);

  let html = navHTML(disciplines, active)
    + '<section class="edu-zone" style="--sa:' + accent + '">'
    + introHTML(active, sections)
    + ancrePlanHTML(active)
    + progressHTML(active, valides)
    + '<div class="edu-sections">' + sections.map((s) => sectionHTML(active, s, valides, accent, sections)).join("") + "</div>"
    + sourcesHTML(active)
    + "</section>";

  $("screen").innerHTML = html;
  ebSave();
}

/**
 * Repli SANS reconstruction du DOM (§5 du brief) : les `<details class="edu-section">` sont
 * natifs — le navigateur gère `open` seul, aucun JS n'a besoin d'intercepter le clic sur
 * `<summary>`. Un seul écouteur, en phase de capture (l'évènement `toggle` ne bulle pas dans
 * tous les navigateurs), fait deux choses : mémoriser l'état ouvert/fermé pour le prochain
 * re-rendu, et caler le défilement sur l'EN-TÊTE de la section qui vient de s'ouvrir (A6),
 * jamais sur sa fin.
 */
function brancherToggle() {
  if (globalThis.__eduToggleOn) return;
  globalThis.__eduToggleOn = true;
  document.addEventListener("toggle", (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement) || !el.classList.contains("edu-section")) return;
    const id = el.dataset.section;
    if (el.open) { ouvertes.add(id); el.scrollIntoView({ block: "start", behavior: "smooth" }); }
    else ouvertes.delete(id);
  }, true);
}

/**
 * Valider/dévalider et changer de discipline exigent un re-rendu complet — contrairement au
 * repli d'une section, l'état affiché ailleurs sur la page change réellement (badges, barre de
 * progression, message de verrouillage des sections dépendantes) : R11.1 appliqué à l'écran,
 * une garantie de cohérence n'a de sens qu'une fois toutes les données déjà changées.
 */
function brancherActions() {
  if (globalThis.__eduActionsOn) return;
  globalThis.__eduActionsOn = true;
  document.addEventListener("click", (e) => {
    const discBtn = e.target.closest("[data-disc]");
    if (discBtn && $("screen") && $("screen").contains(discBtn)) {
      S.eduDiscipline = discBtn.dataset.disc;
      ouvertes = new Set();
      renderTabEducatifs();
      return;
    }
    const valBtn = e.target.closest("[data-valide]");
    if (valBtn && $("screen") && $("screen").contains(valBtn)) {
      const [disciplineId, sectionId] = valBtn.dataset.valide.split(":");
      const discipline = EDUCATIFS.find((d) => d.discipline === disciplineId);
      const state = eduState(disciplineId);
      if (state.valides.includes(sectionId)) {
        // Dévalider EN CASCADE tous les descendants directs et indirects (§3 du brief) —
        // même algorithme que la maquette natation : un parcours à point fixe du graphe
        // `prerequis`, jusqu'à ce qu'un passage complet n'ajoute plus rien.
        const aRetirer = new Set([sectionId]);
        let bouge = true;
        while (bouge) {
          bouge = false;
          discipline.sections.forEach((s) => {
            if (s.prerequis && aRetirer.has(s.prerequis) && !aRetirer.has(s.id)) { aRetirer.add(s.id); bouge = true; }
          });
        }
        state.valides = state.valides.filter((id) => !aRetirer.has(id));
      } else {
        state.valides.push(sectionId);
      }
      state.derniereConsultation = todayISO();
      renderTabEducatifs();
    }
  });
}

brancherToggle();
brancherActions();
