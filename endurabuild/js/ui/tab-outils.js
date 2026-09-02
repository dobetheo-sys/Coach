// Onglet 🧰 Outils — regroupe les outils annexes du plan sous des SOUS-onglets.
//
// Premier arrivant : 🥗 Nutrition (dépense estimée, ravitaillement d'effort, tunnel de
// commande). Retour utilisateur (07/08/2026) : la nutrition « disparaissait » à côté des
// quatre onglets qui rythment le quotidien du plan (Profil/Plan/Aujourd'hui/Semaine) —
// elle vit désormais dans un onglet dédié aux outils, qu'on ouvre pour CONSULTER plutôt
// que pour suivre. La barre principale reste à CINQ onglets (R18.3 : 🎯 Aujourd'hui garde
// sa position centrale, 3e sur 5) — Outils prend simplement la place de Nutrition.
//
// Un outil = une entrée dans SUBTOOLS qui déclare son rendu, même principe que le registre
// de sports (R10) : en ajouter un n'exige de toucher qu'une ligne ici, jamais la navigation.
import { S, $ } from "../state.js";
import { renderTabNutrition } from "./tab-nutrition.js";
import { renderTabEducatifs } from "./tab-educatifs.js";
import { renderTabPosture } from "./tab-posture.js";

const SUBTOOLS = [
  ["nutrition", "\u{1F957}", "Nutrition", renderTabNutrition],
  // R26 — module riche à six disciplines (paliers/blocs sourcés, badges de preuve), même
  // slot et même libellé que le glossaire de gestes qu'il remplace (le brief reporte le
  // choix du libellé définitif). Même principe d'ajout que Nutrition : une ligne ici.
  ["educatifs", "\u{1F4DA}", "Éducatifs", renderTabEducatifs],
  // Bilan de position aéro (handoff `design_handoff_bilan_posture_zenna`). Même principe
  // d'ajout que les deux précédents : une ligne ici. Le handoff demandait précisément ce
  // point d'entrée — « le bilan est un outil de l'app, pas une app dans l'app ».
  ["position", "\u{1F6B4}", "Position", renderTabPosture],
];

function subtabsHTML(active) {
  return '<div class="subtabs" role="tablist" aria-label="Outils">'
    + SUBTOOLS.map(([id, ico, label]) =>
        '<button type="button" role="tab" class="btn subtab' + (id === active ? " active" : "") + '" data-subtool="' + id + '" aria-selected="' + (id === active) + '">'
        + ico + " " + label + "</button>").join("")
    + "</div>";
}

export function renderTabOutils(plan) {
  const active = SUBTOOLS.some(([id]) => id === S.toolsSubTab) ? S.toolsSubTab : SUBTOOLS[0][0];
  S.toolsSubTab = active;
  const entry = SUBTOOLS.find(([id]) => id === active);
  entry[3](plan); // le sous-onglet dessine l'écran entier — comportement inchangé de chaque outil
  const screen = $("screen");
  if (screen) screen.insertAdjacentHTML("afterbegin", subtabsHTML(active));
  document.querySelectorAll("[data-subtool]").forEach((b) => {
    b.onclick = () => { S.toolsSubTab = b.dataset.subtool; renderTabOutils(plan); };
  });
}
