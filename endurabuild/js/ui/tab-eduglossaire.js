// Sous-onglet 🧰 Outils > 📚 Éducatifs — bibliothèque des gestes techniques par discipline
// (retour utilisateur, 08/08/2026, reportée une première fois faute de scope). Le contenu vient
// de `EBV2.eduLibrary` (src/engine/eduLibrary.ts) : les MÊMES gestes que ceux que le générateur
// nomme déjà dans un plan réel (gammes de course, force basse cadence à vélo, éducatifs de
// nage, technique de montée/descente en trail) — cet écran explique ce que le plan demande
// déjà, il n'invente pas un contenu à côté (R11.1).
import { $ } from "../state.js";
import { DISC } from "./icons.js";
import { SPORTS } from "../config.js";

function sectionMeta(key) {
  // Le trail n'a pas d'équivalent dans DISC (c'est un SPORT, pas une discipline de tri) —
  // son icône/couleur viennent du registre des sports, comme partout ailleurs dans l'app.
  if (key === "trail") return { ic: SPORTS.trail.ico, label: "Trail — montée et descente", ac: SPORTS.trail.accent };
  const d = DISC[key] || DISC.rn;
  return { ic: d.ic, label: d.label, ac: d.ac };
}

function drillListHTML(drills) {
  return '<ul style="margin:8px 0 0 18px;padding:0">' + drills.map((d) =>
    '<li style="margin-bottom:10px"><b>' + d.name.charAt(0).toUpperCase() + d.name.slice(1) + "</b>"
    + '<div class="load-sub" style="margin-top:2px">' + d.how + "</div></li>"
  ).join("") + "</ul>";
}

export function renderTabEducatifs() {
  const lib = (globalThis.EBV2 && globalThis.EBV2.eduLibrary) || [];
  let html = '<div class="card"><div class="eyebrow">Outils</div><h2>📚 Éducatifs par discipline</h2>'
    + '<div class="why">Les gestes que ton plan te demande déjà — comment les faire, pas seulement leur nom.</div>';
  if (!lib.length) {
    html += '<div class="load-sub" style="margin-top:8px">Rien à afficher pour le moment.</div>';
  } else {
    lib.forEach(({ key, drills }) => {
      if (!drills || !drills.length) return;
      const meta = sectionMeta(key);
      html += '<details class="load-card" style="border-left:5px solid ' + meta.ac + '"><summary class="load-title" style="cursor:pointer">'
        + meta.ic + " " + meta.label + " (" + drills.length + ")</summary><div style=\"margin-top:4px\">"
        + drillListHTML(drills) + "</div></details>";
    });
  }
  html += "</div>";
  $("screen").innerHTML = html;
}
