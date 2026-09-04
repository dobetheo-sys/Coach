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

// ARBITRAGE (03/09/2026) — deux implémentations du bilan bikefitting sont arrivées en
// parallèle sur ce même créneau : celle-ci (18 écrans natifs, suivant au mot près le handoff
// `design_handoff_bilan_posture_zenna`, moteur porté et branché dans `src/bikefit/`) et une
// carte de navigation vers une sous-app séparée (`bikefitting/`, React/Vite, voir
// `docs/INTEGRATION_HANDOFF.md` de ce sous-dossier) ajoutée directement sur `main` sans
// passer par ce handoff. Décision du fondateur : garder celle-ci — elle suit le design brief
// commandé, elle est intégrée au thème Zenna (l'autre en est encore à l'ancienne palette
// `#f2481b`/or), et elle fonctionne aujourd'hui sans étape de build séparée. La sous-app
// `bikefitting/` reste dans le dépôt (code réel, testé, avec une segmentation MediaPipe que
// celle-ci n'a pas encore — voir O-118) mais n'est plus reliée depuis Outils.
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

// FOUNDATION (04/09/2026) — la rangée porte la primitive `.zn-seg > .zn-seg-btn` du canevas
// (16a / 22c : « NUTRITION / ÉDUCATIFS », pilules pleines). `.subtab`, `.btn` et
// `data-subtool` RESTENT : smoke-tabs et smoke-posture les lisent. L'emoji quitte
// l'AFFICHAGE (aucun sous-onglet du canevas n'en porte) mais reste dans la table SUBTOOLS,
// que rien d'autre ne lit aujourd'hui — vérifié — et qui garde sa forme à trois colonnes.
function subtabsHTML(active) {
  return '<div class="subtabs zn-seg" role="tablist" aria-label="Outils">'
    + SUBTOOLS.map(([id, , label]) =>
        '<button type="button" role="tab" class="btn subtab zn-seg-btn' + (id === active ? " active" : "") + '" data-subtool="' + id + '" aria-selected="' + (id === active) + '">'
        + label + "</button>").join("")
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
