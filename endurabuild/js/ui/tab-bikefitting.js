// Sous-onglet 🧰 Outils › 🚴 Position — entrée vers Bikefitting, un bilan de position aéro
// vélo/triathlon réalisable seul avec un téléphone (voir INTEGRATION_HANDOFF.md).
//
// Bikefitting est une SOUS-APP séparée (bikefitting/, React/Vite/MediaPipe, ses propres
// dépendances npm), pas un composant monté dans Zenna : le moteur zéro-dépendance de Zenna
// n'a aucune raison de porter ces dépendances pour un outil compagnon autonome. Ce module ne
// fait donc qu'une chose — une carte cohérente avec le reste de l'onglet Outils, un lien qui
// NAVIGUE vers bikefitting/index.html (chemin relatif : la copie livrée par
// `npm run build:bikefitting`, sous endurabuild/bikefitting/ une fois déployée).
//
// Cette navigation SORT du service worker de Zenna (bikefitting n'est pas précaché — voir
// INTEGRATION_HANDOFF.md) : elle fonctionne en ligne, et hors-ligne seulement si le navigateur
// l'a déjà visitée et mise en cache lui-même. Documenté, pas silencieux.
import { $ } from "../state.js";

export function renderTabBikefitting() {
  const html = '<div class="card"><div class="eyebrow">Outils · Position</div>'
    + '<div class="zn-tab-title">Ton bilan de position aéro</div>'
    + '<div class="card-note">Un bilan de position vélo/triathlon réalisable seul, avec ton '
    + 'téléphone : souplesse de hanche, plusieurs essais de position filmés et mesurés à la '
    + 'main, surface frontale, score confort et score aéro — avec les positions recommandées '
    + 'à la fin. Traité entièrement sur ton téléphone.</div>'
    + '<a class="btn primary" href="bikefitting/index.html" style="display:inline-block;margin-top:12px;text-decoration:none">'
    + 'Ouvrir le bilan de position →</a>'
    + '<div class="card-note" style="margin-top:10px">S’ouvre dans un espace dédié : nécessite '
    + 'une connexion la première fois, la caméra, et se fait mieux sur téléphone.</div>'
    + '</div>';
  $("screen").innerHTML = html;
}
