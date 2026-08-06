// Accessibilité des modales — piège de focus + Échap + aria. Une modale sans ça est
// inutilisable au clavier et au lecteur d'écran (feedback RPE, félicitations, révélation
// de re-test). Zéro dépendance, s'applique à un overlay déjà inséré dans le DOM.
//
// R23.3 — ET IL FAUT POUVOIR EN SORTIR AU DOIGT.
//
// Retour du fondateur (06/08/2026) : *« une fois cliqué on ne peut pas sortir de la validation
// de la séance en cas d'erreur de clic »*. Mesuré : les trois modales du produit (feedback
// post-séance, félicitations, révélation de retest) n'offraient **qu'Échap** — une touche qui
// n'existe pas sur le téléphone, c'est-à-dire sur le seul appareil où ce produit se vit. Aucune
// croix, aucun clic sur le voile.
//
// La sortie EXISTAIT donc, et ne servait à personne. C'est la même forme que R18.1 (le correctif
// posé mais annulé par la cascade) et qu'U8 (« le bon message existait et était mort ») : ce
// n'est pas une fonctionnalité manquante, c'est une fonctionnalité inatteignable.
//
// Deux sorties ajoutées ICI plutôt que dans chaque appelant — trois copies d'une même règle,
// c'est ce que R11.1 interdit, et c'est précisément parce qu'il n'y avait pas de point unique
// que les trois modales partageaient le même trou.

/** Rend une modale accessible : role/aria-modal, focus sur le premier contrôle,
 *  Échap → close(), croix et clic sur le voile → close(), Tab/Shift+Tab bouclés à
 *  l'intérieur. Retourne une fonction de nettoyage (à appeler si l'appelant retire
 *  l'overlay lui-même sans passer par close). */
export function trapModal(ov, close) {
  const box = ov.querySelector('[role="dialog"]') || ov; // la boîte de dialogue, pas le voile
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");

  // ── SORTIE 1 : la croix. Cible tactile 44×44 (le standard posé par U4 pour ce dépôt), zone
  // étendue par `::after` comme les autres cibles du produit — le rond visible reste discret.
  let croix = null;
  if (box !== ov && !box.querySelector("[data-eb-close]")) {
    if (!box.style.position) box.style.position = "relative";
    croix = document.createElement("button");
    croix.type = "button";
    croix.setAttribute("data-eb-close", "");
    croix.setAttribute("aria-label", "Fermer");
    croix.className = "eb-close";
    croix.textContent = "✕";
    box.insertBefore(croix, box.firstChild);
  }

  const sel = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
  const focusables = () => Array.from(ov.querySelectorAll(sel)).filter((el) => !el.disabled && el.offsetParent !== null);
  const prev = document.activeElement;
  // Le focus va au premier contrôle UTILE, pas à la croix : on ouvre une modale pour répondre,
  // pas pour la fermer. La croix reste dans le cycle de tabulation.
  const premier = focusables().find((el) => !el.hasAttribute("data-eb-close")) || focusables()[0];
  if (premier) premier.focus();

  function sortir() { cleanup(); if (close) close(); }
  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); sortir(); return; }
    if (e.key !== "Tab") return;
    const f = focusables();
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  // ── SORTIE 2 : le voile. Uniquement si le geste COMMENCE et FINIT sur le voile — sans ça, un
  // glissement qui part d'un bouton et se relâche à côté fermerait la modale, ce qui serait le
  // défaut symétrique de celui qu'on corrige.
  let depart = null;
  function onDown(e) { depart = e.target; }
  function onClick(e) { if (e.target === ov && depart === ov) sortir(); }
  function onCroix(e) { e.preventDefault(); sortir(); }

  function cleanup() {
    document.removeEventListener("keydown", onKey, true);
    ov.removeEventListener("pointerdown", onDown);
    ov.removeEventListener("click", onClick);
    if (croix) croix.removeEventListener("click", onCroix);
    if (prev && prev.focus) try { prev.focus(); } catch (e) {}
  }
  document.addEventListener("keydown", onKey, true);
  ov.addEventListener("pointerdown", onDown);
  ov.addEventListener("click", onClick);
  if (croix) croix.addEventListener("click", onCroix);
  return cleanup;
}
