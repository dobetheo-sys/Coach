// Accessibilité des modales — piège de focus + Échap + aria. Une modale sans ça est
// inutilisable au clavier et au lecteur d'écran (feedback RPE, félicitations, révélation
// de re-test). Zéro dépendance, s'applique à un overlay déjà inséré dans le DOM.
/** Rend une modale accessible : role/aria-modal, focus sur le premier contrôle,
 *  Échap → close(), Tab/Shift+Tab bouclés à l'intérieur. Retourne une fonction de
 *  nettoyage (à appeler si l'appelant retire l'overlay lui-même sans passer par close). */
export function trapModal(ov, close) {
  const box = ov.querySelector('[role="dialog"]') || ov; // la boîte de dialogue, pas le voile
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  const sel = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
  const focusables = () => Array.from(ov.querySelectorAll(sel)).filter((el) => !el.disabled && el.offsetParent !== null);
  const prev = document.activeElement;
  const first = focusables()[0];
  if (first) first.focus();
  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); cleanup(); if (close) close(); return; }
    if (e.key !== "Tab") return;
    const f = focusables();
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  function cleanup() {
    document.removeEventListener("keydown", onKey, true);
    if (prev && prev.focus) try { prev.focus(); } catch (e) {}
  }
  document.addEventListener("keydown", onKey, true);
  return cleanup;
}
