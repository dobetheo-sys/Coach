// Check-in du matin en DIAPORAMA (retour utilisateur R5) : une question par écran, on
// avance au tap, avec des phrases de coach humain. Trois écrans : sommeil → VFC
// (optionnelle — « je ne la suis pas » est un vrai choix) → ressenti (qui règle aussi
// l'énergie du snapshot moteur : une seule question côté athlète, deux signaux côté
// moteur). Aucune séance visible avant la fin — la règle produit ne change pas.
//
// REFONTE 15a / 15b / 15c (06/09/2026) — L'ÉCRAN SUIT LE CANEVAS « NOIR APAISÉ » : plus de
// carte autour du diaporama (les questions vivent À NU sur la page), un en-tête mono
// « POINT DU MATIN · 1 / 2 », la phrase de coach en TROIS rôles (le rappel de la réponse
// précédente en corps atténué, le titre en display blanc, la QUESTION en display orange), des
// options en grandes cartes (58 px, une jauge de sommeil ou une pastille de ressenti à la
// place des emojis), la FC au réveil dans son propre panneau, une barre de progression et la
// note « Ta séance n'apparaît qu'à la fin ». Le verdict (15c) devient un ÉCRAN tourné vers
// l'avant — voir `verdictStampHTML`. Les fonctions de rendu sont RESTRUCTURÉES, jamais
// doublées (R11.1) ; les identifiants que les suites lisent (#ckSlide, #ckHr, #ckHrv,
// #ckBack, [data-ck-opt], .ck-opt, le compteur « 1/2 ») ne bougent pas.
import { S, $, esc, todayISO } from "../state.js";
import { applyReadinessSnap, verdictHTML, primeWeather } from "./readiness.js";
import { znVerdictStamp, znHold, znRelease } from "./zenna-motion.js";
import { ensurePlan } from "./tabs.js";
import { raceCountdown } from "./app-header.js";

// 15a — le salut sans emoji : le canevas titre « Salut. C'est l'heure de ton point du
// matin. » en display Poppins, et un pictogramme dans une ligne display se lit comme une
// tache. Les cinq moments restent (U2 : l'heure décide du nom du point).
function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Debout tôt." : h < 12 ? "Salut." : h < 18 ? "Bon après-midi." : h < 22 ? "Bonsoir." : "Encore debout ?";
}

// U2 — LE NOM DU CHECK-IN SUIT L'HEURE, COMME LE SALUT.
//
// `greeting()` connaît l'heure depuis toujours et en donne cinq versions. La phrase qui le
// suivait disait « point du MATIN » en dur — donc à 14 h l'app affichait, à l'écran, mot pour
// mot : « Bon après-midi C'est l'heure du point du matin. » Le check-in est rejouable à la
// demande et l'app s'ouvre dessus à toute heure : la contradiction se voit dès qu'on ouvre
// l'app l'après-midi ou le soir, c'est-à-dire souvent.
//
// Un point unique, utilisé partout où le nom apparaissait (bandeau du diaporama, phrase de
// coach, écran de fin, onglet Semaine, bouton « refaire »).
export function pointLabel() {
  const h = new Date().getHours();
  return h < 12 ? "Point du matin" : h < 18 ? "Point du jour" : "Point du soir";
}
/** Le même nom en minuscules, pour l'insérer dans une phrase. */
export function pointLabelInline() { return pointLabel().toLowerCase(); }

// Chaque écran : phrase de coach (réagit à la réponse précédente), options en gros
// boutons. `set` écrit dans le brouillon, `react` donne la phrase d'accueil du suivant.
/** H-1b — les diapos RÉELLEMENT montrées. `onlyIf` absent = toujours. Point unique : la
 *  barre de progression, le compteur « n/N » et la navigation la lisent tous — trois lectures
 *  de listes différentes donneraient un « 2/3 » sur un diaporama de deux écrans. */
function slidesActives() { return SLIDES.filter((s) => !s.onlyIf || s.onlyIf()); }

// 15a — la JAUGE de sommeil : cinq barres, `n` allumées, dans la teinte du signal (bon /
// moyen / court). Ce sont les MÊMES seuils que `set` ci-dessous (≥ 7 h bon, ≥ 6 h moyen,
// sinon mauvais) — la jauge illustre ce que le moteur lira, elle n'invente pas un troisième
// classement.
function jaugeHTML(n, teinte) {
  let h = '<span class="zn-ck-jauge zn-ck-jauge--' + teinte + '" aria-hidden="true">';
  for (let i = 1; i <= 5; i++) h += "<i" + (i <= n ? ' class="on"' : "") + "></i>";
  return h + "</span>";
}
// 15b — la PASTILLE de ressenti : une teinte par état, du bon au vidé.
function pastilleHTML(teinte) { return '<i class="zn-ck-pastille zn-ck-pastille--' + teinte + '" aria-hidden="true"></i>'; }

// 15a/15b — le champ optionnel (FC au réveil, VFC) dans son PANNEAU : libellé + « optionnel »
// à gauche, la saisie et son unité à droite, la note mono dessous. Un seul gabarit pour les
// deux champs — le second est le premier avec d'autres mots (R11.1).
function champHTML(o) {
  return '<div class="zn-panel zn-ck-champ"><label class="zn-ck-champ-ligne" for="' + o.id + '">'
    + '<span class="zn-ck-champ-lib"><span>' + o.label + '</span><small>optionnel</small></span>'
    + '<span class="zn-ck-champ-saisie"><input type="number" id="' + o.id + '" inputmode="numeric" min="' + o.min + '" max="' + o.max + '" value="' + (o.val || "") + '" placeholder="' + o.placeholder + '"><span>' + o.unite + "</span></span></label>"
    + '<div class="zn-ck-champ-note">' + o.note + "</div></div>";
}

const SLIDES = [
  {
    id: "sleep",
    // A5 (audit v6) — la question porte sur les HEURES (un signal mesuré) et non plus sur
    // la seule impression : une nuit sous 4h30 est un rouge en soi, quel que soit le moral.
    // Une question côté athlète, deux signaux côté moteur (sleepHours + sleepQuality).
    // 15a — trois rôles : pas de rappel (première question), le titre salue, la question
    // est en orange. « dormi combien » est ce que smoke-checkin lit.
    titre: () => greeting() + " C’est l’heure de ton " + pointLabelInline() + ".",
    question: () => "Tu as dormi combien de temps\u00a0?",
    options: [
      { val: "8", ind: jaugeHTML(5, "bon"), label: "8h ou plus", react: "Excellent, c’est la meilleure des récups." },
      { val: "7", ind: jaugeHTML(4, "bon"), label: "7-8h", react: "Parfait, c’est la meilleure des récups." },
      { val: "6", ind: jaugeHTML(3, "moyen"), label: "6-7h", react: "Noté. Une nuit moyenne, ça se gère." },
      { val: "5", ind: jaugeHTML(2, "moyen"), label: "5-6h", react: "Merci d’être honnête — on va en tenir compte." },
      { val: "4", ind: jaugeHTML(1, "court"), label: "Moins de 5h", react: "Nuit courte : on va lever le pied aujourd’hui." },
    ],
    set: (d, v) => {
      const H = { "8": 8.5, "7": 7.5, "6": 6.5, "5": 5.5, "4": 4 };
      d.sleepHours = H[v];
      d.sleepQuality = +v >= 7 ? "bon" : +v >= 6 ? "moyen" : "mauvais";
    },
    // H-1b — LA FC AU RÉVEIL DÉMÉNAGE ICI, et ce n'est pas cosmétique : elle vivait sur la
    // diapo VFC, qui devient optionnelle. La laisser là l'aurait fait disparaître pour tous
    // ceux qui ne suivent pas leur VFC — un signal OBJECTIF perdu au passage d'un lot qui
    // ne le visait pas. Sa place est de toute façon ici : c'est la même mesure du réveil.
    extraHTML: (d) => champHTML({ id: "ckHr", label: "FC au réveil", min: 30, max: 120, val: d.restingHr, placeholder: "52", unite: "bpm",
      note: "Comparée à ta base des 7 derniers matins, jamais à une norme. Elle ne quitte pas cet appareil." }),
    // 15a — la note de bas de page ne vaut que sur la première diapo : c'est là qu'on
    // cherche sa séance.
    note: "Ta séance n’apparaît qu’à la fin — elle dépend de ces réponses.",
  },
  {
    id: "hrv",
    // H-1b — CETTE DIAPO N'EXISTE QUE POUR QUI A DIT « OUI » EN FIN DE QUESTIONNAIRE.
    // Elle occupait un tiers du check-in de TOUT LE MONDE pour un signal avancé. Et elle
    // demande maintenant la VALEUR : depuis H-1, un adjectif coché n'est pas une mesure.
    onlyIf: () => S.answers.hrv_track === "oui",
    titre: () => "Ta VFC de ce matin ?",
    question: () => "Le chiffre de ta montre, en ms.",
    options: [
      { val: "ok", ind: pastilleHTML("bon"), label: "C'est noté", react: "Bien reçu." },
      { val: "skip", ind: pastilleHTML("neutre"), label: "Pas de mesure aujourd'hui", react: "Pas grave, on fait sans." },
    ],
    set: () => { /* la valeur est lue dans `extraHTML` ci-dessous, comme la FC au réveil */ },
    extraHTML: (d) => champHTML({ id: "ckHrv", label: "VFC (rMSSD)", min: 5, max: 250, val: d.hrvValue, placeholder: "62", unite: "ms",
      note: "Comparée à TA base des 7 derniers matins. Sous 7 mesures, elle est notée sans rien piloter — et on te le dit." }),
  },
  {
    id: "feel",
    // 15b — la phrase de coach REPREND la réponse précédente (le rappel), puis le titre,
    // puis la question en orange. « tu te sens comment » est ce que smoke-checkin lit.
    titre: () => "Dernière question, la plus importante :",
    question: () => "là, tout de suite, tu te sens comment\u00a0?",
    options: [
      { val: "feu", ind: pastilleHTML("bon"), label: "En grande forme", set: { energy: 85, feel: "frais" } },
      { val: "normal", ind: pastilleHTML("aero"), label: "Normal", set: { energy: 65, feel: "normal" } },
      { val: "fatigue", ind: pastilleHTML("moyen"), label: "Fatigué·e", set: { energy: 40, feel: "fatigue" } },
      { val: "vide", ind: pastilleHTML("court"), label: "Vidé·e", set: { energy: 15, feel: "fatigue" } },
    ],
    set: (d, v, opt) => { Object.assign(d, opt.set); },
  },
];

// 15a/15b — la barre de progression : un trait par diapo (24 × 3), l'orange sur la diapo
// courante, l'orange éteint sur celles qu'on a passées, le filet sur celles qui restent.
function dotsHTML(step) {
  return '<div class="zn-ck-dots" aria-hidden="true">'
    + slidesActives().map((_, i) => '<span class="zn-ck-dot' + (i < step ? " past" : i === step ? " now" : "") + '"></span>').join("")
    + "</div>";
}

/** L'en-tête « POINT DU MATIN · 1 / 2 » (15a) — écrit UNE fois pour les diapos ET l'écran
 *  d'analyse. Le compteur reste écrit « 1/2 » SANS espaces : `smoke-checkin` l'asserte au
 *  caractère près (H-1b, cinq critères) pour vérifier que le diaporama fait bien deux diapos
 *  sans opt-in VFC et trois avec. Le canevas l'espace (« 1 / 2 ») ; l'espacement typographique
 *  ne vaut pas de rendre muette une garde qui compte les écrans du check-in. */
function headHTML(droite) {
  return '<div class="zn-ck-head"><span>' + pointLabel() + "</span><span>" + droite + "</span></div>";
}

// R-ZENNA — LE VERDICT SE TAMPONNE.
//
// La maquette termine le diaporama par un tampon (`.stamp`, l'animation la plus « physique »
// du système) plutôt que par un simple changement de texte : c'est le moment où le moteur
// REND SA DÉCISION, et c'est le seul geste de la journée qui mérite une récompense visuelle.
//
// Différence avec la maquette, et elle est délibérée : la maquette affiche « SÉANCE MAINTENUE »
// en dur. Ici on attend le VRAI verdict (`applyReadinessSnap` → `res.adjustment`) avant de
// tamponner quoi que ce soit. Un tampon qui annoncerait « maintenue » avant que le moteur ait
// tranché serait une animation qui ment — exactement ce que le §2 de `zenna-motion.js` interdit.
const _VERDICT_MOT = {
  keep: "Séance maintenue", reduce: "Volume réduit", replace: "Endurance à la place",
  rest: "Repos conseillé", off: "Repos complet",
};

// 15c — CE QUE LA JOURNÉE CONSTRUIT, par action du moteur. Ce sont des textes d'INTERFACE
// (aucune suite ne les lit, le moteur n'en produit pas) ; les CHIFFRES, eux, viennent tous du
// plan — les minutes ajustées, le nom de la séance, la série, les séances cochées, le J−.
// « Aucun chiffre inventé pour motiver » (libellé du canevas) : quand une donnée manque (pas
// de date de course, pas de série), la tuile n'est pas rendue plutôt que remplie.
const _CONSTRUIT = {
  keep: {
    titre: "Ta forme est là : la séance est celle du plan.",
    corps: "Le moteur n’a rien changé. Ce que tu construis aujourd’hui est exactement ce que la semaine attendait de cette journée.",
    note: "Le plan reste tel quel tant que ton point du matin reste au vert.",
  },
  reduce: {
    titre: "Moins long, même structure — la qualité reste.",
    corps: "Le moteur garde le stimulus et retire du volume : une séance plus courte faite est ce qui fait avancer la préparation, une séance entière forcée est ce qui la casse.",
    note: "Le volume complet revient dès que ton point du matin repasse au vert.",
  },
  replace: {
    titre: "L’endurance se construit les jours comme celui-là.",
    corps: "L’endurance est ce qui porte l’épreuve le jour J, et c’est la seule qualité qui se construit même fatigué. Aujourd’hui n’est pas une journée en moins : c’est celle qui rend la prochaine séance de qualité possible.",
    note: "La qualité revient dès que ton point du matin repasse au vert.",
  },
  rest: {
    titre: "Aujourd’hui, le plan te demande de récupérer.",
    corps: "Un jour de repos décidé sur des signaux dégradés n’est pas une séance perdue : c’est ce qui évite d’en perdre trois. La série compte le repos validé comme une séance.",
    note: "Le plan reprend son cours dès que ton point du matin remonte.",
  },
  off: {
    titre: "Repos complet : c’est l’affûtage qui parle.",
    corps: "À ce stade, la fraîcheur vaut plus que n’importe quelle minute d’entraînement. Ne rien faire est la consigne — et c’est la plus difficile à tenir.",
    note: "Rien à rattraper, jamais : on ne remplace pas ce qu’on n’a pas fait.",
  },
};

/** Les trois tuiles de 15c (série · séances de la prépa · J−), lues sur le plan et
 *  l'adhérence du moteur — et rendues seulement quand la donnée existe. */
function tuilesHTML() {
  let plan = null;
  try { plan = ensurePlan(); } catch (e) { /* pas de plan : pas de tuiles */ }
  if (!plan) return "";
  const t = todayISO();
  let streak = 0;
  try { streak = globalThis.EBV2.adherence(plan, S.answers, t).days || 0; } catch (e) {}
  let total = 0;
  try { plan.weeks.forEach((w) => w.days.forEach((d) => d.sessions.forEach((s) => { if (s.d !== "rs") total++; }))); } catch (e) {}
  const faites = S.answers.done ? Object.keys(S.answers.done).filter((k) => S.answers.done[k]).length : 0;
  const c = raceCountdown(S.answers, t);
  let h = "";
  // La série : « Ne jour d'affilée SI tu la valides » — le +1 est la journée en cours, celle
  // que le verdict vient d'adapter (R4.2 : le repos validé compte).
  h += '<div class="zn-creux zn-ck-tuile"><div class="zn-ck-tuile-val zn-ck-tuile-val--serie">' + (streak + 1) + "<small>e</small></div><div class=\"zn-ck-tuile-lab\">jour d’affilée<br>si tu la valides</div></div>";
  if (total) h += '<div class="zn-creux zn-ck-tuile"><div class="zn-ck-tuile-val">' + faites + "<small>/ " + total + '</small></div><div class="zn-ck-tuile-lab">séances de<br>ta préparation</div></div>';
  if (c && c.jours > 1) h += '<div class="zn-creux zn-ck-tuile"><div class="zn-ck-tuile-val zn-ck-tuile-val--j">J−' + c.jours + '</div><div class="zn-ck-tuile-lab">avant<br>' + esc(c.format || "la course") + "</div></div>";
  return '<div class="zn-ck-tuiles">' + h + "</div>";
}

/** 15c — l'écran du verdict, tourné vers l'avant : le tampon (avec ses motifs chiffrés — le
 *  moteur a été consulté), ce que la journée construit, les tuiles, la séance telle qu'elle
 *  sera, et « Ouvrir ma séance ». Posé en COUCHE par `znVerdictStamp` au-dessus de la séance
 *  déjà rendue (U7 : zéro milliseconde ajoutée au chemin critique — voir plus bas). */
function verdictStampHTML(res) {
  const v = res && res.adjustment && res.adjustment.verdict;
  if (!v) return "";
  const action = res.adjustment.action;
  const mot = _VERDICT_MOT[action] || "C’est noté";
  const drivers = (v.drivers || []).join(" · ");
  const c = _CONSTRUIT[action] || _CONSTRUIT.keep;
  const min = Math.round(res.adjustment.adjustedMinutes || 0);
  const seances = (res.sessions || []).filter((s) => s.d !== "rs");
  const nom = seances.length ? seances.map((s) => s.name).join(" + ") : "Repos";
  let h = '<div class="zn-verdict-stamp zn-ck-verdict">';
  h += headHTML("Analyse");
  h += '<div class="zn-ck-veyebrow">Ton verdict du jour</div>';
  h += '<div class="zn-verdict-badge stamp zn-v-' + v.level + '"><i class="zn-ck-vdot" aria-hidden="true"></i>' + mot + "</div>";
  if (drivers) h += '<div class="zn-verdict-why">' + esc(drivers) + "</div>";
  h += '<div class="zn-ck-vtitre">' + c.titre + "</div>";
  // Le sous-titre est le `det` du moteur (la séance décrite en une ligne — 15c : « Chaussures,
  // 75 minutes tranquilles, allure libre ») ; à défaut le nom et les minutes.
  // Le `det` porte aussi la note du moteur après « — 💡 » (mesuré : 300 caractères sur un jour
  // rouge) ; ici on ne garde que la CONSIGNE, la note vit dans le détail de la séance (18a).
  const det = seances.length && seances[0].det ? String(seances[0].det).split(" — 💡")[0] : nom + (min ? ", " + min + " minutes" : "") + ".";
  h += '<div class="zn-ck-vsub">' + esc(det) + "</div>";
  h += '<div class="zn-ck-construit">';
  h += '<div class="zn-ck-construit-eyebrow">Ce que la journée construit</div>';
  h += '<div class="zn-ck-construit-titre zn-display">' + (min ? min + " minutes<br>" : "") + esc(nom) + "</div>";
  h += '<div class="zn-ck-construit-corps">' + c.corps + "</div>";
  h += tuilesHTML();
  h += '<div class="zn-ck-seance"><span class="zn-display">' + esc(nom) + "</span>" + (min ? '<span class="zn-mono">' + min + " min</span>" : "") + "</div>";
  h += '<div class="zn-ck-construit-note">' + c.note + "</div>";
  h += '<button type="button" class="zn-btn zn-ck-ouvrir">Ouvrir ma séance <span aria-hidden="true">→</span></button>';
  h += "</div>";
  h += '<div class="zn-creux zn-ck-rejouable"><span class="zn-ck-rejouable-ico" aria-hidden="true">↻</span><span>Le point est rejouable à toute heure : si la journée change, refais-le et le verdict suit.</span></div>';
  h += "</div>";
  return h;
}

/** HTML du diaporama (ou de l'écran d'analyse finale). L'état du brouillon vit dans
 *  S._ck (jamais persisté — un check-in abandonné recommence, c'est 3 taps). */
export function checkinSlideshowHTML() {
  const ck = S._ck || (S._ck = { step: 0 });
  const slide = slidesActives()[ck.step];
  if (!slide) return "";
  // U7 — on lance la recherche météo MAINTENANT, pendant que l'athlète répond aux trois
  // questions : elle sera prête au moment où le moteur en a besoin, au lieu de faire attendre
  // 3,2 s devant « ta séance arrive… ».
  primeWeather();
  // R-ZENNA — l'en-tête de la maquette (« POINT DU MATIN » à gauche, « 1 / 2 » à droite) et un
  // corps de diapo isolé dans son propre conteneur : c'est LUI qui rejoue l'animation de
  // glissement à chaque question (`ck-slide-anim`), pendant que l'en-tête et les points restent
  // en place — sinon toute la carte sauterait à chaque tap, et le repère visuel disparaîtrait.
  const choix = (ck.choix || {})[slide.id];
  let h = '<div class="zn-ck" id="ckSlide">' + headHTML((ck.step + 1) + "/" + slidesActives().length);
  h += '<div class="zn-ck-body ck-slide-anim">';
  // 15b — le rappel de la réponse précédente vient AVANT le titre, en corps atténué ; il
  // n'existe pas sur la première diapo.
  h += '<h2 class="zn-ck-coach">' + (ck._react && ck.step > 0 ? '<span class="zn-ck-rappel">' + esc(ck._react) + "</span>" : "")
    + '<span class="zn-ck-titre">' + esc(slide.titre(ck)) + '</span><span class="zn-ck-question">' + esc(slide.question(ck)) + "</span></h2>";
  h += '<div class="zn-ck-options">';
  slide.options.forEach((o) => {
    // `.on` : la réponse déjà donnée sur cette diapo, quand on y REVIENT (← Revenir) — la
    // sélection du canevas (bordure orange, fond teinté). Au tap, la diapo change tout de
    // suite : aucun délai ajouté pour « montrer » la sélection (U7, smoke-checkin à 180 ms).
    h += '<button type="button" class="btn ck-opt' + (choix === o.val ? " on" : "") + '" data-ck-opt="' + o.val + '"><span class="zn-ck-opt-lab">' + o.label + "</span>" + o.ind + "</button>";
  });
  h += "</div>";
  if (slide.extraHTML) h += slide.extraHTML(ck);
  h += "</div>";
  h += dotsHTML(ck.step);
  if (ck.step > 0) h += '<div class="zn-ck-pied"><button type="button" class="btn zn-ck-back" id="ckBack">← Revenir</button></div>';
  else if (slide.note) h += '<div class="zn-ck-pied zn-ck-note">' + slide.note + "</div>";
  h += "</div>";
  return h;
}

/** Branche les taps du diaporama. `onDone(out)` est appelé après le verdict moteur
 *  (out = {snap, res} de applyReadinessSnap) — l'appelant re-rend son onglet. */
export function bindCheckinSlideshow(rerender, onDone) {
  const ck = S._ck || (S._ck = { step: 0 });
  const slide = slidesActives()[ck.step];
  if (!slide) return;
  const back = $("ckBack");
  if (back) back.onclick = () => { ck.step = Math.max(0, ck.step - 1); rerender(); };
  document.querySelectorAll("#ckSlide [data-ck-opt]").forEach((b) => {
    b.onclick = async () => {
      const opt = slide.options.find((o) => o.val === b.dataset.ckOpt);
      if (!opt) return;
      const hrEl = $("ckHr");
      if (hrEl) {
        const v = parseInt(hrEl.value || "");
        if (v >= 30 && v <= 120) ck.restingHr = v; else delete ck.restingHr;
      }
      // H-1 — la VALEUR de VFC. Bornes physiologiques : hors d'elles, c'est une saisie
      // fausse ou un artefact de capteur, et on préfère RIEN à une base empoisonnée.
      const hrvEl = $("ckHrv");
      if (hrvEl) {
        const v = parseInt(hrvEl.value || "");
        if (v >= 5 && v <= 250) ck.hrvValue = v; else delete ck.hrvValue;
      }
      slide.set(ck, opt.val, opt);
      (ck.choix || (ck.choix = {}))[slide.id] = opt.val;
      ck._react = opt.react || "";
      ck.step++;
      if (ck.step < slidesActives().length) { rerender(); return; }
      // Fin du diaporama → verdict (la météo peut prendre ~3.5 s : écran d'attente coach).
      // « ta séance arrive » est ce qu'U7 chronomètre : le texte reste, la forme suit 15c.
      const sc = $("ckSlide");
      if (sc) sc.innerHTML = headHTML("Analyse") + '<div class="zn-ck-body"><h2 class="zn-ck-coach"><span class="zn-ck-titre">C’est noté 👍</span></h2><div class="load-sub zn-ck-attente">Je regarde ta forme, ta fatigue des derniers jours et la météo — ta séance arrive…</div></div>';
      const out = await applyReadinessSnap(ck);
      S._ck = null;
      // R-ZENNA — LE TAMPON DE VERDICT, EN COUCHE PAR-DESSUS LA SÉANCE.
      //
      // Ma première écriture reproduisait la maquette littéralement : tampon, `await` de
      // 1 320 ms, PUIS la séance. Mesuré : quatre suites E2E rouges, et surtout U7 qui cessait
      // de mesurer ce qu'il nomme — « ta séance arrive… » disparaissait à l'apparition du
      // tampon, donc le chrono s'arrêtait 1,3 s avant que la séance existe. Retarder la séance
      // de 1,3 s chaque matin, c'est précisément ce qu'U7 a été écrit pour empêcher.
      //
      // Le beat est conservé, sa mise en œuvre change : `onDone` rend la séance TOUT DE SUITE,
      // le tampon se pose au-dessus et s'efface seul (`znVerdictStamp`). Même geste à l'œil,
      // zéro milliseconde ajoutée au chemin critique. Les confettis ne partent que si le
      // moteur MAINTIENT la séance — fêter un « repos conseillé » serait absurde.
      //
      // 15c (refonte) — la couche n'est plus un tampon seul mais l'ÉCRAN du verdict (ce que
      // la journée construit, les tuiles, « Ouvrir ma séance »). Il reste posé 16 temps
      // (`dwell`, ~2,6 s, contre 10 avant) pour être LU, et part au premier tap — le bouton
      // « Ouvrir ma séance » est ce tap. La borne ne bouge pas : il part SEUL, jamais un
      // portillon de plus (smoke-zenna vérifie qu'aucune couche ne traîne d'un onglet à
      // l'autre ; le chien de garde de `znHold` reste à 4 s, au-delà du séjour).
      const stamp = out && out.res ? verdictStampHTML(out.res) : "";
      // On RETIENT le mouvement avant de rendre : `onDone` construit l'écran et poserait ses
      // animations tout de suite, or elles se joueraient derrière le rideau du tampon et
      // seraient terminées quand il se lève (mesuré : tout fini à 1487 ms, rideau parti à
      // 1856 ms, plus rien ne bougeait ensuite). Le contenu est rendu immédiatement ; seules
      // les animations attendent l'ouverture. Sans tampon, rien n'est retenu.
      if (stamp) znHold();
      onDone(out);
      if (stamp) znVerdictStamp(stamp, { celebrate: out.res.adjustment.action === "keep", dwellBeats: 16 });
      else znRelease();
    };
  });
}

export { verdictHTML as checkinVerdictHTML };
