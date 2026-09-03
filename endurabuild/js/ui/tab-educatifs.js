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
import { EDUCATIFS, disciplinesForSport, sectionsFor } from "../data/educatifs/registry.js";
import { SVG_REGISTRY } from "../data/educatifs/svgRegistry.js";

/** §3 du brief : livré, jamais activé par défaut — l'arbitrage reste à faire. `true` = le
 *  contenu d'une section verrouillée reste intégralement lisible (A5, comportement requis).
 *  `false` = seuls le titre et l'accroche sont rendus ; c'est la seule lecture qui donne un
 *  sens au drapeau (sinon il ne changerait rien). */
const LOCKED_PREVIEW = true;

// Enchaînements est transverse : aucun sport unique de `SPORTS` ne lui correspond. Seule
// couleur de ce module qui n'est PAS tirée du registre existant — elle vaut ce que vaut la
// maquette elle-même (choix éditorial, jamais réutilisée ailleurs).
const ENCHAINEMENTS_ACCENT = "#7a4fcf";

const BADGES = { forte: "Preuves solides", terrain: "Mesures de terrain", consensus: "Consensus d'enseignement" };

function accentOf(discipline) {
  const parSport = { natation: "swim", velo: "bike", course: "run", trail: "trail", swimrun: "swimrun" };
  const sport = parSport[discipline.discipline];
  return (sport && SPORTS[sport] && SPORTS[sport].accent) || ENCHAINEMENTS_ACCENT;
}

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

function tableHTML(lignes) {
  return '<table class="edu-table">' + lignes.map((l) =>
    '<tr data-niveau="' + esc(l.niveau) + '"><td>' + l.cle + "</td><td>" + l.valeur + "</td></tr>").join("") + "</table>";
}

function renderContenuItem(item) {
  switch (item.type) {
    case "texte":
    case "test":
      return '<div class="edu-block">' + (item.titre ? '<span class="edu-block-h">' + esc(item.titre) + "</span>" : "")
        + item.paragraphes.map((p) => "<p>" + p + "</p>").join("") + "</div>";
    case "seuils":
      return '<div class="edu-block">' + tableHTML(item.lignes.map((l) => ({ niveau: l.niveau, cle: l.cas, valeur: l.consequence }))) + "</div>";
    case "table":
      return '<div class="edu-block">' + (item.titre ? '<span class="edu-block-h">' + esc(item.titre) + "</span>" : "") + tableHTML(item.lignes) + "</div>";
    case "schema":
      return '<div class="edu-block"><figure role="group">' + (SVG_REGISTRY[item.ref] || "") + "</figure></div>";
    case "drill":
      return '<div class="edu-block"><span class="edu-block-h">Les exercices</span>' + item.items.map((d) =>
        '<div class="edu-drill"><strong>' + esc(d.nom) + "</strong><span>" + d.detail + "</span>"
        + (d.schemaRef ? '<figure class="edu-drill-fig" role="group">' + (SVG_REGISTRY[d.schemaRef] || "") + "</figure>" : "")
        + "</div>").join("") + "</div>";
    case "debat":
      return '<div class="edu-block"><div class="edu-debat"><strong>' + esc(item.titre) + "</strong><span>" + item.texte + "</span></div></div>";
    // ── LES ERREURS FRÉQUENTES (refonte, chantier Éducatifs) ──
    //
    // Le patron de carte dessiné en maquette réclame un bloc d'erreurs types. Il n'a pas fallu
    // l'écrire : il EXISTE déjà, sous le type `warn`, et chaque occurrence du corpus en est une
    // (« les deux erreurs symétriques… », « ne cherche pas la position la plus basse… », « la
    // pression maximale n'est pas une recommandation »). Ce qui manquait n'était pas le contenu,
    // c'était son NOM — un encart générique sans titre se lit comme une note de bas de page,
    // alors que c'est la partie que l'athlète relit avant sa séance.
    //
    // Aucune donnée n'a été touchée : le titre est posé au rendu. Inventer un nouveau type de
    // contenu aurait obligé à re-taguer six fichiers de données pour un changement d'affichage.
    case "warn":
      return '<div class="edu-block"><span class="edu-block-h">Les erreurs fréquentes</span>'
        + '<div class="warn">' + item.texte + "</div></div>";
    // secu : encart rouge plein, JAMAIS replié — rendu directement dans le corps de la
    // section, jamais sous un <details> imbriqué (A10 : visible dès l'ouverture, sans clic
    // de plus).
    case "secu":
      return '<div class="edu-block"><div class="edu-secu"><strong>⚠ Sécurité</strong><span>' + item.texte + "</span></div></div>";
    case "renvoi":
      return '<div class="edu-block"><div class="edu-renvoi"><strong>→ ' + esc(item.titre) + "</strong><span>" + item.texte + "</span></div></div>";
    default:
      return "";
  }
}

/** Section « Vocabulaire de séance » (course) : pas de `contenu` statique, rendue depuis
 *  `EBV2.eduLibrary` (R11.1 — jamais une resaisie du texte du moteur). */
function contenuDynamiqueHTML(ref) {
  const [, cle] = ref.split(":");
  const lib = (globalThis.EBV2 && globalThis.EBV2.eduLibrary) || [];
  const entry = lib.find((e) => e.key === cle);
  if (!entry || !entry.drills || !entry.drills.length) return "";
  return '<div class="edu-block"><span class="edu-block-h">Les exercices</span>' + entry.drills.map((d) =>
    '<div class="edu-drill"><strong>' + esc(d.name.charAt(0).toUpperCase() + d.name.slice(1)) + "</strong><span>" + esc(d.how) + "</span></div>").join("") + "</div>";
}

function sectionHTML(discipline, section, valides, accent) {
  const lock = estVerrouille(section, valides);
  const done = valides.includes(section.id);
  const prereq = section.prerequis ? discipline.sections.find((s) => s.id === section.prerequis) : null;
  const open = ouvertes.has(section.id);
  const badge = section.preuve
    ? '<span class="edu-badge" data-n="' + section.preuve + '">' + BADGES[section.preuve] + "</span>" : "";

  const lockedMsg = lock
    ? '<p class="edu-locked-msg">Tu peux lire cette section librement, mais elle ne se valide qu\'une fois « '
      + esc(prereq ? prereq.titre : "") + " » acquise.</p>"
    : "";

  const corps = lock && !LOCKED_PREVIEW
    ? lockedMsg
    : lockedMsg + badge + (section.contenuDynamique ? contenuDynamiqueHTML(section.contenuDynamique)
      : section.contenu.map(renderContenuItem).join(""))
      // LES SOURCES D'UNE SECTION VIVENT DANS LA SECTION (refonte, chantier Éducatifs).
      //
      // Elles étaient toutes regroupées en bas de page, dans une boîte unique : pour vérifier
      // d'où sortait l'étape 3, il fallait la quitter, déplier la boîte et retrouver son titre
      // dans une liste de neuf groupes. Une preuve qu'on doit aller chercher ailleurs ne fait
      // plus son travail de preuve. Elle se pose donc sous le contenu qu'elle appuie, repliée
      // (elle ne doit pas concurrencer le geste à apprendre) mais à un clic, sans changement
      // de contexte. Rien n'est resaisi : ce sont les mêmes `section.sources` que la boîte
      // affichait — elles ont changé de place, pas de source.
      + sourcesListHTML(section.sources);

  const numLabel = section.numero != null ? esc(String(section.numero)) + " — " : "";
  const sousTitre = lock ? "Verrouillée — " + esc(prereq ? prereq.titre : "") + " d'abord" : esc(section.accroche || "");

  return '<details class="load-card edu-section" data-locked="' + lock + '" data-done="' + done + '" data-section="'
    + esc(section.id) + '" style="--sa:' + accent + '"' + (open ? " open" : "") + ">"
    + '<summary class="load-title">' + (section.icone ? section.icone + " " : "") + numLabel + esc(section.titre) + "</summary>"
    + '<div class="load-sub" style="margin:2px 0 10px">' + sousTitre + "</div>"
    + corps
    + '<div class="edu-block"><button type="button" class="btn" data-valide="' + esc(discipline.discipline) + ":" + esc(section.id) + '"'
    + (lock ? " disabled" : "") + ">" + (done ? "✓ Validé" : (lock ? "Verrouillée" : "Je valide cette section")) + "</button></div>"
    + "</details>";
}

function progressHTML(discipline, valides) {
  const seq = discipline.sections.filter((s) => !s.horsSequence);
  if (!seq.some((s) => s.prerequis)) return ""; // pas de chaîne → pas de barre (générique, pas un cas natation)
  return '<div class="edu-progress" aria-label="Progression">' + seq.map((s, i) => {
    const state = valides.includes(s.id) ? "done" : (estVerrouille(s, valides) ? "locked" : "active");
    const bar = i < seq.length - 1 ? '<span class="edu-pbar" data-state="' + (valides.includes(s.id) ? "done" : "") + '"></span>' : "";
    return '<div class="edu-pstep"><span class="edu-bead" data-state="' + state + '">'
      + (valides.includes(s.id) ? "✓" : esc(String(s.numero ?? "•"))) + "</span>" + bar + "</div>";
  }).join("") + "</div>";
}

/** La liste de sources d'UN bloc, repliée. Même balisage que la boîte de bas de page (mêmes
 *  classes, donc même style et même `data-type` de niveau de preuve) : un seul dessin. */
function sourcesListHTML(sources) {
  if (!Array.isArray(sources) || !sources.length) return "";
  return '<details class="edu-sources-box edu-src-inline"><summary>Sources de cette étape <span>▼</span></summary><div>'
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
   qu'un lien précis et inventé. */
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
  return '<div class="load-card"><span class="load-title">Dans ton plan</span>'
    + '<p class="load-sub">' + total + " séance" + (total > 1 ? "s" : "") + " de cette discipline sur l’ensemble du plan."
    + (prochaine ? " La prochaine : <b>" + esc(prochaine.jour || "") + " " + esc(fmtDay(prochaine.date))
      + "</b> — " + esc(prochaine.name) + "." : " Toutes sont passées.")
    + "</p></div>";
}

function sourcesHTML(discipline, sections) {
  const groupes = [];
  if (discipline.intro && discipline.intro.sources && discipline.intro.sources.length) {
    groupes.push({ titre: "Introduction", sources: discipline.intro.sources });
  }
  // Les sources d'une SECTION sont rendues DANS la section (`sourcesListHTML`) depuis la
  // refonte : les répéter ici en ferait deux endroits à tenir pour une même liste. La boîte de
  // bas de page garde ce qui n'appartient à aucune étape — les sources de l'introduction.
  if (!groupes.length) return "";
  return '<details class="edu-sources-box"><summary>Sources <span>▼</span></summary><div>'
    + groupes.map((g) => '<div class="edu-src-group"><h3>' + esc(g.titre) + "</h3><ul>"
      + g.sources.map((src) => '<li data-type="' + esc(src.type) + '">' + src.texte
        + (src.url ? ' <a href="' + esc(src.url) + '" target="_blank" rel="noopener">Consulter</a>' : "") + "</li>").join("")
      + "</ul></div>").join("")
    + "</div></details>";
}

function navHTML(disciplines, active) {
  return '<nav class="edu-nav" aria-label="Disciplines Éducatifs">' + disciplines.map((d) =>
    '<button type="button" class="edu-disc" data-disc="' + esc(d.discipline) + '" aria-current="' + (d.discipline === active.discipline) + '" style="--sa:' + accentOf(d) + '">'
    + (d.libelle) + "</button>").join("") + "</nav>";
}

export function renderTabEducatifs() {
  const disciplines = disciplinesForSport(S.sport);
  if (!disciplines.length) {
    $("screen").innerHTML = '<div class="card"><div class="eyebrow">Outils</div><h2>📚 Éducatifs</h2>'
      + '<div class="why">Rien à afficher pour ce sport.</div></div>';
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
    + '<div class="card" style="border-top:8px solid ' + accent + '">'
    + '<div class="eyebrow">Éducatifs</div><h2>' + esc(active.intro.titre) + "</h2>"
    + '<div class="why">' + esc(active.intro.chapeau) + "</div>"
    + '<div class="load-card"><span class="load-title">' + esc(active.intro.encart.titre) + "</span>"
    + active.intro.encart.paragraphes.map((p) => '<p class="load-sub">' + p + "</p>").join("")
    + "</div>"
    + ancrePlanHTML(active)
    + progressHTML(active, valides)
    + sections.map((s) => sectionHTML(active, s, valides, accent)).join("")
    + sourcesHTML(active, sections)
    + "</div>";

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
