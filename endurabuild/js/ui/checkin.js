// Check-in du matin en DIAPORAMA (retour utilisateur R5) : une question par écran, on
// avance au tap, avec des phrases de coach humain. Trois écrans : sommeil → VFC
// (optionnelle — « je ne la suis pas » est un vrai choix) → ressenti (qui règle aussi
// l'énergie du snapshot moteur : une seule question côté athlète, deux signaux côté
// moteur). Aucune séance visible avant la fin — la règle produit ne change pas.
import { S, $, esc } from "../state.js";
import { applyReadinessSnap, verdictHTML } from "./readiness.js";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Debout tôt 🌙" : h < 12 ? "Salut ☀️" : h < 18 ? "Bon après-midi" : h < 22 ? "Bonsoir 🌙" : "Encore debout 🦉";
}

// Chaque écran : phrase de coach (réagit à la réponse précédente), options en gros
// boutons. `set` écrit dans le brouillon, `react` donne la phrase d'accueil du suivant.
const SLIDES = [
  {
    id: "sleep",
    // A5 (audit v6) — la question porte sur les HEURES (un signal mesuré) et non plus sur
    // la seule impression : une nuit sous 4h30 est un rouge en soi, quel que soit le moral.
    // Une question côté athlète, deux signaux côté moteur (sleepHours + sleepQuality).
    coach: () => greeting() + " C’est l’heure du point du matin. Première question : tu as dormi combien de temps ?",
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
  },
  {
    id: "hrv",
    coach: (d) => (d._react ? d._react + " " : "") + "Ta montre t’affiche une VFC ce matin ? (optionnel — si tu ne la suis pas, passe)",
    options: [
      { val: "haute", ico: "📈", label: "Haute", react: "Bon signal — ton corps encaisse bien." },
      { val: "normale", ico: "➖", label: "Normale", react: "RAS, on continue." },
      { val: "basse", ico: "📉", label: "Basse", react: "OK, prudence aujourd’hui alors." },
      { val: "skip", ico: "🤷", label: "Je ne la suis pas", react: "Aucun souci, le ressenti suffit." },
    ],
    set: (d, v) => { d.hrvStatus = v === "skip" ? "normale" : v; },
    // A6 (audit v6) — la FC au réveil était supportée par le moteur et jamais collectée :
    // champ optionnel ici (une frappe, jamais bloquant), baseline glissante 7 jours calculée
    // depuis l'historique dès la 3e mesure.
    extraHTML: (d) => '<label style="display:flex;align-items:center;gap:8px;font-size:var(--fs-md);margin-top:14px;color:#635b4a">'
      + '<span>FC au réveil (optionnel)</span><input type="number" id="ckHr" inputmode="numeric" min="30" max="120" value="' + (d.restingHr || "") + '" placeholder="ex. 52" style="width:88px">'
      + "<span>bpm</span></label>",
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
    + SLIDES.map((_, i) => '<span style="width:8px;height:8px;border-radius:50%;border:1.5px solid #16130e;background:' + (i < step ? "#16130e" : i === step ? "#f0b429" : "transparent") + '"></span>').join("")
    + "</div>";
}

/** HTML du diaporama (ou de l'écran d'analyse finale). L'état du brouillon vit dans
 *  S._ck (jamais persisté — un check-in abandonné recommence, c'est 3 taps). */
export function checkinSlideshowHTML() {
  const ck = S._ck || (S._ck = { step: 0 });
  const slide = SLIDES[ck.step];
  if (!slide) return "";
  let h = '<div class="card" id="ckSlide"><div class="eyebrow">Point du matin · ' + (ck.step + 1) + "/" + SLIDES.length + "</div>";
  h += '<h2 style="font-size:var(--fs-hand);line-height:1.4">' + esc(slide.coach(ck)) + "</h2>";
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
  const slide = SLIDES[ck.step];
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
      slide.set(ck, opt.val, opt);
      ck._react = opt.react || "";
      ck.step++;
      if (ck.step < SLIDES.length) { rerender(); return; }
      // Fin du diaporama → verdict (la météo peut prendre ~3.5 s : écran d'attente coach)
      const sc = $("ckSlide");
      if (sc) sc.innerHTML = '<div class="eyebrow">Point du matin</div><h2 style="font-size:var(--fs-hand)">C’est noté 👍</h2><div class="load-sub" style="margin-top:8px">Je regarde ta forme, ta fatigue des derniers jours et la météo — ta séance arrive…</div>';
      const out = await applyReadinessSnap(ck);
      S._ck = null;
      onDone(out);
    };
  });
}

export { verdictHTML as checkinVerdictHTML };
