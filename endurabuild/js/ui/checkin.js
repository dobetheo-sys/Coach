// Check-in du matin en DIAPORAMA (retour utilisateur R5) : une question par écran, on
// avance au tap, avec des phrases de coach humain. Trois écrans : sommeil → VFC
// (optionnelle — « je ne la suis pas » est un vrai choix) → ressenti (qui règle aussi
// l'énergie du snapshot moteur : une seule question côté athlète, deux signaux côté
// moteur). Aucune séance visible avant la fin — la règle produit ne change pas.
import { S, $, esc } from "../state.js";
import { applyReadinessSnap, verdictHTML, primeWeather } from "./readiness.js";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Debout tôt 🌙" : h < 12 ? "Salut ☀️" : h < 18 ? "Bon après-midi" : h < 22 ? "Bonsoir 🌙" : "Encore debout 🦉";
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

const SLIDES = [
  {
    id: "sleep",
    // A5 (audit v6) — la question porte sur les HEURES (un signal mesuré) et non plus sur
    // la seule impression : une nuit sous 4h30 est un rouge en soi, quel que soit le moral.
    // Une question côté athlète, deux signaux côté moteur (sleepHours + sleepQuality).
    coach: () => greeting() + " C’est l’heure de ton " + pointLabelInline() + ". Première question : tu as dormi combien de temps ?",
    options: [
      { val: "8", ico: "🛌", label: "8h ou plus", react: "Excellent, c’est la meilleure des récups." },
      { val: "7", ico: "😴", label: "7-8h", react: "Parfait, c’est la meilleure des récups." },
      { val: "6", ico: "😐", label: "6-7h", react: "Noté. Une nuit moyenne, ça se gère." },
      { val: "5", ico: "🥱", label: "5-6h", react: "Merci d’être honnête — on va en tenir compte." },
      { val: "4", ico: "😩", label: "Moins de 5h", react: "Nuit courte : on va lever le pied aujourd’hui." },
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
    extraHTML: (d) => '<label style="display:flex;align-items:center;gap:8px;font-size:var(--fs-md);margin-top:14px;color:var(--muted)">'
      + '<span>FC au réveil (optionnel)</span><input type="number" id="ckHr" inputmode="numeric" min="30" max="120" value="' + (d.restingHr || "") + '" placeholder="ex. 52" style="width:88px">'
      + "<span>bpm</span></label>",
  },
  {
    id: "hrv",
    // H-1b — CETTE DIAPO N'EXISTE QUE POUR QUI A DIT « OUI » EN FIN DE QUESTIONNAIRE.
    // Elle occupait un tiers du check-in de TOUT LE MONDE pour un signal avancé. Et elle
    // demande maintenant la VALEUR : depuis H-1, un adjectif coché n'est pas une mesure.
    onlyIf: () => S.answers.hrv_track === "oui",
    coach: (d) => (d._react ? d._react + " " : "") + "Ta VFC de ce matin ? (le chiffre de ta montre, en ms)",
    options: [
      { val: "ok", ico: "✅", label: "C'est noté", react: "Bien reçu." },
      { val: "skip", ico: "🤷", label: "Pas de mesure aujourd'hui", react: "Pas grave, on fait sans." },
    ],
    set: () => { /* la valeur est lue dans `extraHTML` ci-dessous, comme la FC au réveil */ },
    extraHTML: (d) => '<label style="display:flex;align-items:center;gap:8px;font-size:var(--fs-md);margin-top:14px;color:var(--muted)">'
      + '<span>VFC (rMSSD)</span><input type="number" id="ckHrv" inputmode="numeric" min="5" max="250" value="' + (d.hrvValue || "") + '" placeholder="ex. 62" style="width:88px">'
      + "<span>ms</span></label>"
      + '<div class="q-sub" style="margin-top:4px">Comparée à TA base des 7 derniers matins. Sous 7 mesures, elle est notée sans rien piloter — et on te le dit.</div>',
  },
  {
    id: "feel",
    coach: (d) => (d._react ? d._react + " " : "") + "Dernière question, la plus importante : là, tout de suite, tu te sens comment ?",
    options: [
      { val: "feu", ico: "🔥", label: "En grande forme", set: { energy: 85, feel: "frais" } },
      { val: "normal", ico: "🙂", label: "Normal", set: { energy: 65, feel: "normal" } },
      { val: "fatigue", ico: "😮‍💨", label: "Fatigué·e", set: { energy: 40, feel: "fatigue" } },
      { val: "vide", ico: "😫", label: "Vidé·e", set: { energy: 15, feel: "fatigue" } },
    ],
    set: (d, v, opt) => { Object.assign(d, opt.set); },
  },
];

function dotsHTML(step) {
  return '<div style="display:flex;gap:6px;justify-content:center;margin-top:14px">'
    + slidesActives().map((_, i) => '<span style="width:8px;height:8px;border-radius:50%;border:1.5px solid var(--border);background:' + (i < step ? "var(--muted)" : i === step ? "var(--acc)" : "transparent") + '"></span>').join("")
    + "</div>";
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
  let h = '<div class="card" id="ckSlide"><div class="eyebrow">' + pointLabel() + ' · ' + (ck.step + 1) + "/" + slidesActives().length + "</div>";
  h += '<h2 style="font-family:var(--font-body);font-size:var(--fs-lg);font-weight:600;text-transform:none;letter-spacing:0;line-height:1.5">' + esc(slide.coach(ck)) + "</h2>";
  h += '<div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">';
  slide.options.forEach((o) => {
    h += '<button type="button" class="btn ck-opt" data-ck-opt="' + o.val + '" style="display:flex;align-items:center;gap:12px;justify-content:flex-start;font-size:var(--fs-lg);padding:14px 16px;width:100%"><span style="font-size:var(--fs-xl)">' + o.ico + "</span>" + o.label + "</button>";
  });
  h += "</div>";
  if (slide.extraHTML) h += slide.extraHTML(ck);
  if (ck.step > 0) h += '<button type="button" class="btn" id="ckBack" style="margin-top:12px;font-size:var(--fs-sm);padding:6px 12px">← Revenir</button>';
  h += dotsHTML(ck.step) + "</div>";
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
      ck._react = opt.react || "";
      ck.step++;
      if (ck.step < slidesActives().length) { rerender(); return; }
      // Fin du diaporama → verdict (la météo peut prendre ~3.5 s : écran d'attente coach)
      const sc = $("ckSlide");
      if (sc) sc.innerHTML = '<div class="eyebrow">' + pointLabel() + '</div><h2 style="font-family:var(--font-body);font-size:var(--fs-lg);font-weight:600;text-transform:none;letter-spacing:0">C’est noté 👍</h2><div class="load-sub" style="margin-top:8px">Je regarde ta forme, ta fatigue des derniers jours et la météo — ta séance arrive…</div>';
      const out = await applyReadinessSnap(ck);
      S._ck = null;
      onDone(out);
    };
  });
}

export { verdictHTML as checkinVerdictHTML };
