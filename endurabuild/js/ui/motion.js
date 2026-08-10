// R25.3 — COUCHE MOTION. Une primitive = une implémentation : tout le JS de mouvement du
// lot vit ICI (jamais dupliqué dans celebrations.js, qui garde le confetti/badge existant —
// `showCongrats` n'est pas touché, R25.3 le réutilise tel quel). Les animations elles-mêmes
// (durées, easing) vivent en CSS (`styles.css`, section "R25.3 — COUCHE MOTION") : ce module
// ne fait que poser/retirer des classes ou calculer une valeur réelle (delta XP, offset de
// cercle) — jamais un chiffre inventé (brief §R25.3).
import { S } from "../state.js";
import { avatarTriDataFor } from "./avatar.js";

/** Anneau "forme du jour" (session-life.js#formRingHTML) : le cercle est rendu VIDE
 *  (stroke-dashoffset = circonférence) avec sa cible réelle en `data-offset`. Double rAF —
 *  le navigateur doit avoir PEINT l'état vide avant qu'on bascule vers la cible, sinon la
 *  transition CSS ne joue pas (le premier changement de style avant peinture est fusionné). */
export function bindFormRing() {
  const el = document.querySelector(".form-ring-fg[data-offset]");
  if (!el) return;
  const target = el.getAttribute("data-offset");
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.strokeDashoffset = target; }));
}

/** Coche qui se dessine sur le bouton `data-vd` qui vient de passer à l'état "fait" — appelée
 *  APRÈS le re-rendu qui affiche ce bouton (jamais sur l'ancien, détruit par le innerHTML=
 *  qui suit la validation — cf. bindTodayValidate). Idempotente : un second appel sur un
 *  bouton déjà coché ne duplique rien. */
export function drawCheckOnButton(key) {
  const btn = document.querySelector('[data-vd="' + CSS.escape(key) + '"]');
  if (!btn || btn.querySelector(".check-draw")) return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("aria-hidden", "true");
  svg.style.marginRight = "3px";
  svg.style.verticalAlign = "-3px";
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M4 10.5 8 14.5 16 5.5");
  path.setAttribute("class", "check-draw");
  svg.appendChild(path);
  btn.insertBefore(svg, btn.firstChild);
  requestAnimationFrame(() => requestAnimationFrame(() => path.classList.add("go")));
}

/** "+X XP" flottant, ancré sur `anchorEl`. N'affiche RIEN si `deltaXP` n'est pas un nombre
 *  positif réel — le repos ne donne pas d'XP (décision R25), et c'est le cas le plus
 *  fréquent (U8 : un tiers des ouvertures de semaine 1 sont des jours de repos). */
export function floatXP(anchorEl, deltaXP) {
  if (!anchorEl || !Number.isFinite(deltaXP) || deltaXP <= 0) return;
  const rect = anchorEl.getBoundingClientRect();
  const el = document.createElement("span");
  el.className = "xp-float";
  el.textContent = "+" + deltaXP + " XP";
  el.style.left = Math.round(rect.left + rect.width / 2) + "px";
  el.style.top = Math.round(rect.top) + "px";
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

/** Snapshot de l'XP composite (3 disciplines, avatarTriDataFor) — comparé avant/après une
 *  validation par `xpDelta` ci-dessous. Même motif que `badgesBefore/after` de
 *  bindTodayValidate (tab-today.js), appliqué à l'avatar plutôt qu'aux badges. */
export function xpSnapshot(plan, todayISO) {
  const d = avatarTriDataFor(plan, todayISO);
  if (!d.tri) return null;
  return d.tri.natation.xp + d.tri.velo.xp + d.tri.course.xp;
}
/** Delta réel entre deux snapshots — null si l'un des deux est indisponible (repli sûr :
 *  avatarTriDataFor ne bloque jamais l'écran, floatXP le lit et n'affiche rien sur `null`). */
export function xpDelta(before, after) {
  return Number.isFinite(before) && Number.isFinite(after) ? after - before : null;
}

// CTA collant "Valider" — un seul listener de scroll actif à la fois (retiré et reposé à
// chaque appel, jamais accumulé au fil des re-rendus de l'onglet).
let _stickyScrollHandler = null;
/** CTA collant en zone pouce (🎯 Aujourd'hui). Ne crée AUCUN second chemin de validation :
 *  son clic redéclenche le bouton natif (`target.click()`), qui porte le seul listener
 *  réellement enregistré (bindTodayValidate) — un geste, une implémentation (leçon R16.9,
 *  citée par le brief). Absent s'il n'y a rien à valider (repos déjà fait, pas de séance). */
export function bindStickyValidate() {
  if (_stickyScrollHandler) { window.removeEventListener("scroll", _stickyScrollHandler); _stickyScrollHandler = null; }
  const old = document.getElementById("ebStickyCta");
  if (old) old.remove();
  const target = document.querySelector("#screen [data-vd]:not([disabled])");
  if (!target) return;
  const cta = document.createElement("button");
  cta.type = "button";
  cta.id = "ebStickyCta";
  cta.className = "sticky-cta";
  cta.textContent = target.textContent.trim();
  cta.setAttribute("aria-hidden", "true"); // le bouton natif reste l'unique cible pour un lecteur d'écran (il est toujours visible dans le flux)
  cta.tabIndex = -1;
  document.body.appendChild(cta);
  cta.onclick = () => target.click();
  const onScroll = () => {
    if (!document.body.contains(target)) { window.removeEventListener("scroll", onScroll); cta.remove(); return; }
    const r = target.getBoundingClientRect();
    const offscreen = r.bottom < 0 || r.top > window.innerHeight;
    cta.classList.toggle("show", offscreen);
  };
  _stickyScrollHandler = onScroll;
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/** Météo en différé : bascule `.wx-slot` de "loading" (shimmer) à "ready" (fade-in) quand
 *  `fetchWeather()` répond — appelant fournit l'élément et le texte final, ce module ne
 *  touche pas à `fetchWeather` (inchangé, brief §R25.3). */
export function revealWeather(el, html) {
  if (!el) return;
  el.classList.remove("loading");
  el.innerHTML = html;
  el.classList.add("ready");
}

// Parallax du héros — même discipline que le CTA collant : UN listener, retiré et reposé à
// chaque appel, jamais accumulé au fil des re-rendus.
let _heroScrollHandler = null;
/**
 * R25.6 — LE HÉROS RECULE AU SCROLL (dernier effet du catalogue §4, « non confirmé dans
 * l'app » jusqu'ici).
 *
 * ADAPTÉ, PAS COPIÉ : la maquette écoute le scroll de son propre conteneur
 * (`#content{overflow-y:auto}` dans un cadre de téléphone simulé) ; l'app fait défiler la
 * FENÊTRE. Recopier `this.scrollTop` n'aurait rien animé du tout — c'est la grandeur qui
 * change, pas l'intention. Courbes reprises telles quelles (scale ≥ .93 sur 1300 px,
 * opacité ≥ .7 sur 450 px).
 *
 * `transform`/`opacity` seuls : les deux propriétés que le compositeur traite sans
 * relayouter, donc pas de jank au pouce. Lu dans un rAF (le scroll peut tirer plusieurs
 * événements par image) et coupé net en `prefers-reduced-motion`.
 */
export function bindHeroParallax() {
  if (_heroScrollHandler) { window.removeEventListener("scroll", _heroScrollHandler); _heroScrollHandler = null; }
  const hero = document.querySelector("#screen .count-hero");
  if (!hero) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  hero.style.transformOrigin = "top center";
  hero.style.willChange = "transform,opacity";
  let tick = false;
  const apply = () => {
    tick = false;
    const y = Math.max(0, window.pageYOffset);
    hero.style.transform = "scale(" + Math.max(0.93, 1 - y / 1300).toFixed(4) + ")";
    hero.style.opacity = Math.max(0.7, 1 - y / 450).toFixed(3);
  };
  const onScroll = () => { if (!tick) { tick = true; requestAnimationFrame(apply); } };
  _heroScrollHandler = onScroll;
  window.addEventListener("scroll", onScroll, { passive: true });
  apply();
}
