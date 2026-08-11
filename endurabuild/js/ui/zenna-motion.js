// R-ZENNA — LE SYSTÈME DE MOTION DE LA MAQUETTE, PORTÉ TEL QUEL.
//
// La maquette Zenna n'est pas qu'une palette : la moitié de son propos est le MOUVEMENT —
// les cartes entrent en cascade, les compteurs montent, la coche se dessine, les confettis
// partent, la courbe se trace. Ce module porte ces gestes ; `css/zenna-today.css` porte les
// keyframes et les états.
//
// TROIS RÈGLES QUI GOUVERNENT TOUT CE FICHIER
//
// 1. TOUT EST NO-OP HORS DU THÈME. Chaque fonction commence par `if (!znOn()) return`. Les
//    quatre autres onglets appellent parfois les mêmes modules de rendu ; ils ne doivent pas
//    voir un confetti ni une cascade. Le thème est la seule condition d'activation.
//
// 2. AUCUNE DONNÉE N'EST INVENTÉE ICI. `znCountUp` anime vers une valeur qu'on lui DONNE, la
//    barre de zones se construit depuis les steps du moteur, l'anneau de forme depuis la
//    réponse du check-in. Ce module met en scène des chiffres déjà calculés — il n'en produit
//    aucun. C'est la frontière qui empêche une animation de devenir une seconde vérité.
//
// 3. LE MOUVEMENT NE CACHE JAMAIS RIEN. `prefers-reduced-motion` est respecté partout, et le
//    CSS remet `opacity:1` quand il coupe l'animation d'entrée — une cascade désactivée sans
//    repli laisserait la page blanche. Ici, `znReduce()` court-circuite les effets purement
//    décoratifs (confettis, XP) et rend les compteurs instantanés.
const BEAT = 120; // le battement de la maquette : tout en est un multiple

/** Le thème sombre est-il actif ? (posé par tabs.js sur l'onglet Aujourd'hui uniquement) */
export function znOn() {
  return typeof document !== "undefined" && document.body && document.body.classList.contains("theme-zenna");
}
function znReduce() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
}

/* ============================================================
   TOAST — une phrase, en bas, qui s'efface seule
   ============================================================ */
let _toastEl = null, _toastTimer = null;
export function znToast(msg) {
  if (!znOn() || !msg) return;
  if (!_toastEl || !_toastEl.isConnected) {
    _toastEl = document.createElement("div");
    _toastEl.className = "zn-toast";
    _toastEl.setAttribute("role", "status");
    document.body.appendChild(_toastEl);
  }
  _toastEl.textContent = msg;
  // Un reflow avant d'ajouter la classe : sans lui, un toast déjà affiché qui change de
  // texte ne rejoue pas sa transition (le navigateur regroupe les deux changements).
  void _toastEl.offsetWidth;
  _toastEl.classList.add("on");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { if (_toastEl) _toastEl.classList.remove("on"); }, BEAT * 30);
}

/* ============================================================
   CONFETTIS — la récompense, bornée à ce qui la mérite
   ============================================================ */
export function znConfetti(originEl) {
  if (!znOn() || znReduce() || !originEl) return;
  let r;
  try { r = originEl.getBoundingClientRect(); } catch (e) { return; }
  if (!r.width && !r.height) return;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const colors = ["#FF3D00", "#FF7A3D", "#00E0C6", "#FFD23D", "#FFB199"];
  for (let i = 0; i < 16; i++) {
    const c = document.createElement("div");
    c.className = "zn-confetti";
    c.style.left = cx + "px";
    c.style.top = cy + "px";
    c.style.background = colors[i % colors.length];
    document.body.appendChild(c);
    const ang = Math.random() * Math.PI * 2, dist = 50 + Math.random() * 70;
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 40;
    const anim = c.animate([
      { transform: "translate(0,0) rotate(0deg) scale(1)", opacity: 1 },
      { transform: "translate(" + dx + "px," + dy + "px) rotate(" + (180 + Math.random() * 360) + "deg) scale(.4)", opacity: 0 },
    ], { duration: BEAT * (5 + Math.random() * 3), easing: "cubic-bezier(.2,.8,.4,1)" });
    anim.onfinish = () => c.remove();
  }
}

/** L'XP qui s'envole depuis le bouton validé. */
export function znXpFloat(originEl, label) {
  if (!znOn() || znReduce() || !originEl || !label) return;
  let r;
  try { r = originEl.getBoundingClientRect(); } catch (e) { return; }
  const el = document.createElement("div");
  el.className = "zn-xp-float";
  el.textContent = label;
  el.style.left = (r.left + r.width / 2 - 30) + "px";
  el.style.top = (r.top - 6) + "px";
  document.body.appendChild(el);
  const anim = el.animate([
    { transform: "translateY(0)", opacity: 0 },
    { transform: "translateY(-14px)", opacity: 1, offset: .3 },
    { transform: "translateY(-42px)", opacity: 0 },
  ], { duration: BEAT * 10, easing: "cubic-bezier(.25,.46,.45,.94)" });
  anim.onfinish = () => el.remove();
}

/* ============================================================
   COMPTEUR — le chiffre monte au lieu d'apparaître
   ============================================================ */
export function znCountUp(el, target, dur, prefix, suffix) {
  if (!el) return;
  const p = prefix || "", s = suffix || "";
  if (!znOn() || znReduce()) { el.textContent = p + target + s; return; }
  const start = performance.now();
  (function frame() {
    if (!el.isConnected) return; // l'onglet a changé pendant l'animation
    const t = Math.min((performance.now() - start) / dur, 1);
    el.textContent = p + Math.round(target * (1 - Math.pow(1 - t, 3))) + s;
    if (t < 1) requestAnimationFrame(frame);
  })();
}

/* ============================================================
   CASCADE D'ENTRÉE — les cartes arrivent l'une après l'autre
   ============================================================
   Les classes sont posées ICI plutôt que dans chaque chaîne HTML : les modules de rendu
   sont partagés avec d'autres onglets, et il n'y a aucune raison qu'ils sachent dans quel
   ordre visuel ils seront empilés. On lit l'ordre du DOM, qui EST l'ordre de lecture. */
export function znPlay(root) {
  const host = root || document.getElementById("screen");
  if (!znOn() || !host) return;
  const kids = [...host.children].filter((n) => n.nodeType === 1);
  kids.forEach((n, i) => {
    n.classList.add("rise", "r" + Math.min(8, i + 1));
  });
  // Retirer/reposer `zn-play` avec un reflow entre les deux REJOUE la cascade : sans ça,
  // revenir sur l'onglet réafficherait des cartes déjà animées, donc figées.
  host.classList.remove("zn-play");
  void host.offsetWidth;
  host.classList.add("zn-play");
}

/* ============================================================
   COURBE DE CHARGE — les trois lignes se tracent
   ============================================================ */
export function znDrawChart() {
  if (!znOn()) return;
  const lines = document.querySelectorAll("#screen .zn-chart-line");
  if (!lines.length) return;
  const reduce = znReduce();
  lines.forEach((p, i) => {
    let len = 0;
    try { len = p.getTotalLength(); } catch (e) { return; }
    if (!len) return;
    p.style.strokeDasharray = String(len);
    if (reduce) { p.style.strokeDashoffset = "0"; return; }
    p.style.transition = "none";
    p.style.strokeDashoffset = String(len);
    void p.getBoundingClientRect();
    p.style.transition = "stroke-dashoffset " + (BEAT * 9) + "ms cubic-bezier(.25,.46,.45,.94) " + (BEAT * (4 + i * 2)) + "ms";
    p.style.strokeDashoffset = "0";
  });
}

/** L'anneau de forme se remplit, et son chiffre monte avec lui. */
export function znDrawFormRing() {
  if (!znOn()) return;
  const ring = document.querySelector("#screen .zn-ring-fg");
  if (!ring) return;
  const target = parseFloat(ring.dataset.off);
  const val = document.querySelector("#screen .zn-form-val span");
  const n = val ? parseFloat(val.dataset.val) : NaN;
  if (znReduce()) {
    if (isFinite(target)) ring.style.strokeDashoffset = String(target);
    if (val && isFinite(n)) val.textContent = String(Math.round(n));
    return;
  }
  if (val && isFinite(n)) val.textContent = "0";
  requestAnimationFrame(() => {
    if (isFinite(target)) ring.style.strokeDashoffset = String(target);
    if (val && isFinite(n)) setTimeout(() => znCountUp(val, n, BEAT * 9), BEAT * 3);
  });
}

/** Le grand chiffre du héros (la durée de la séance) monte depuis zéro. */
export function znCountHero() {
  if (!znOn()) return;
  const el = document.querySelector("#screen .zn-hero-num");
  if (!el) return;
  const n = parseFloat(el.dataset.val);
  if (!isFinite(n)) return;
  if (znReduce()) { el.textContent = String(Math.round(n)); return; }
  el.textContent = "0";
  setTimeout(() => znCountUp(el, n, BEAT * 7), BEAT * 3);
}

/* ============================================================
   MÉTÉO — le shimmer s'éteint quand la vraie valeur arrive
   ============================================================ */
export function znWeatherReady(slotEl) {
  if (!slotEl) return;
  slotEl.classList.remove("loading");
  if (!znOn() || znReduce()) return;
  // Reflow entre retrait et pose : sans lui, rejouer la même animation sur un nœud déjà
  // animé ne redéclenche rien (le navigateur regroupe les deux changements de classe).
  slotEl.classList.remove("zn-wx-in");
  void slotEl.offsetWidth;
  slotEl.classList.add("zn-wx-in");
}

/* ============================================================
   TAMPON DE VERDICT — la beat de la maquette, SANS retarder la séance
   ============================================================
   La maquette tamponne le verdict puis révèle la séance 1 320 ms plus tard. Reproduit
   littéralement (un `await` avant `onDone`), ce beat DÉCALE l'affichage de la séance de
   1,3 s chaque matin — exactement ce qu'U7 existe pour empêcher (« la séance apparaît sans
   attendre »), et pire : « ta séance arrive… » disparaissant AVANT la séance, U7 mesurait la
   fin d'un écran d'attente au lieu de l'arrivée de la séance. Une mesure qui cesse de mesurer
   ce qu'elle nomme est plus coûteuse que le beat qu'elle garde.

   Le tampon devient donc une COUCHE : la séance est rendue immédiatement derrière, le verdict
   se tamponne par-dessus et s'efface seul. Même geste à l'œil, zéro milliseconde ajoutée au
   chemin critique. */
export function znVerdictStamp(html, opts) {
  if (!znOn() || !html) return;
  const o = opts || {};
  const ov = document.createElement("div");
  ov.className = "zn-stamp-layer";
  ov.setAttribute("aria-hidden", "true"); // le verdict est DÉJÀ lu dans le héros, sous la couche
  ov.innerHTML = html;
  document.body.appendChild(ov);
  const badge = ov.querySelector(".zn-verdict-badge");
  if (o.celebrate && badge) znConfetti(badge);
  const partir = () => {
    ov.style.opacity = "0";
    setTimeout(() => ov.remove(), 300);
  };
  setTimeout(partir, znReduce() ? 600 : BEAT * 13);
  ov.addEventListener("click", partir); // on peut toujours passer devant
}

/* ============================================================
   CTA COLLANT — en zone pouce, au scroll, tant que la séance n'est pas validée
   ============================================================ */
let _cta = null, _ctaScroll = null;
export function znStickyCta(opts) {
  znClearStickyCta();
  if (!znOn() || !opts || !opts.label || typeof opts.onClick !== "function") return;
  _cta = document.createElement("button");
  _cta.type = "button";
  _cta.className = "zn-sticky-cta";
  _cta.textContent = opts.label;
  _cta.onclick = () => { opts.onClick(_cta); };
  document.body.appendChild(_cta);
  const sync = () => {
    if (!_cta || !_cta.isConnected) return;
    // Le seuil de la maquette : le CTA n'apparaît qu'une fois le héros dépassé — tant qu'on
    // voit le bouton de validation réel, en doubler un second en bas d'écran est du bruit.
    _cta.classList.toggle("show", (window.pageYOffset || document.documentElement.scrollTop || 0) > 240);
  };
  _ctaScroll = sync;
  window.addEventListener("scroll", sync, { passive: true });
  sync();
}
export function znClearStickyCta() {
  if (_ctaScroll) { window.removeEventListener("scroll", _ctaScroll); _ctaScroll = null; }
  if (_cta) { _cta.remove(); _cta = null; }
}

/* ============================================================
   PASTILLE D'ONGLET — « une séance t'attend »
   ============================================================ */
// L'état vit ICI, pas dans le DOM : `renderActiveTab` reconstruit la barre d'onglets
// (`bar.innerHTML = tabbarHTML()`) APRÈS avoir rendu l'onglet, donc une pastille posée
// pendant le rendu serait effacée une ligne plus loin. `znApplyNavDot()` la repose depuis
// cet état, et c'est `tabs.js` qui l'appelle au bon moment.
//
// Volontairement NON scopée au thème : « une séance t'attend » n'a d'intérêt que si on la
// voit depuis les AUTRES onglets. Ses couleurs sont donc littérales côté CSS, pas des
// jetons `--zn-*` qui n'existeraient pas hors d'Aujourd'hui.
let _navDotOn = false;
export function znNavDot(on) { _navDotOn = !!on; znApplyNavDot(); }
export function znApplyNavDot() {
  const btn = document.querySelector('#ebTabbar .tabbtn[data-tab="today"]');
  if (!btn) return;
  let d = btn.querySelector(".zn-nav-dot");
  if (!_navDotOn) { if (d) d.classList.remove("show"); return; }
  if (!d) {
    d = document.createElement("span");
    d.className = "zn-nav-dot";
    d.setAttribute("aria-hidden", "true");
    btn.appendChild(d);
  }
  requestAnimationFrame(() => d.classList.add("show"));
}

/* ============================================================
   PARALLAX DU HÉROS — il recule doucement quand on descend
   ============================================================ */
let _parallax = null;
export function znHeroParallax() {
  znClearParallax();
  if (!znOn() || znReduce()) return;
  const hero = document.querySelector("#screen .zn-hero");
  if (!hero) return;
  _parallax = () => {
    if (!hero.isConnected) { znClearParallax(); return; }
    const y = Math.max(0, window.pageYOffset || document.documentElement.scrollTop || 0);
    hero.style.transform = "scale(" + Math.max(.93, 1 - y / 1300) + ")";
    hero.style.opacity = String(Math.max(.7, 1 - y / 450));
  };
  window.addEventListener("scroll", _parallax, { passive: true });
}
export function znClearParallax() {
  if (_parallax) { window.removeEventListener("scroll", _parallax); _parallax = null; }
}

/* ============================================================
   BARRE DE ZONES — construite depuis les STEPS RÉELS de la séance
   ============================================================
   La maquette dessine une barre décorative. Ici elle est VRAIE : chaque segment est un bloc
   du moteur, sa largeur est sa durée (`_blkMin`, la même fonction que la courbe de charge
   utilise — R11.1), sa couleur est sa zone. Un échauffement/retour au calme est en Z1 par
   son rôle ; le corps prend sa zone déclarée.

   La table ci-dessous traduit les zones du moteur (`_IFZ` dans plan-view.js) en niveaux 1-5.
   Elle est ordonnée par intensité croissante et n'invente rien : chaque entrée existe dans
   `_IFZ`. Une zone inconnue retombe en Z2 — le choix prudent, jamais du rouge par défaut. */
const ZONE_LEVEL = {
  "rn.rec": 1, "sw.easy": 1,
  "bk.z2": 2, "rn.easy": 2, "sw.aero": 2,
  "bk.ss": 3, "rn.mara": 3, "bk.rp": 3, "bk.frc": 3,
  "bk.thr": 4, "rn.thr": 4, "sw.css": 4,
  "bk.vo2": 5, "rn.vo2": 5, "sw.speed": 5,
};
export function znZoneBar(session, blkMin) {
  if (!session || !Array.isArray(session.steps) || !session.steps.length) return "";
  const segs = session.steps.map((st) => {
    const min = blkMin(st) || 0;
    const lvl = st.role === "warmup" || st.role === "cooldown" ? 1 : (ZONE_LEVEL[st.zone] || 2);
    return { min, lvl };
  }).filter((x) => x.min > 0);
  if (segs.length < 2) return "";
  const total = segs.reduce((t, x) => t + x.min, 0);
  if (!total) return "";
  const bar = segs.map((x) => {
    // `flex` proportionnel à la durée, avec un plancher visuel : un bloc de 30 s doit rester
    // visible, sinon la barre ment par omission sur une séance à récup courtes.
    const pct = Math.max(3, Math.round((x.min / total) * 100));
    return '<div class="zseg grow-x" style="flex:' + pct + ' 0 auto;background:var(--z' + x.lvl + ')">'
      + '<span class="znum' + (x.lvl === 1 ? " light" : "") + '">' + x.lvl + "</span></div>";
  }).join("");
  return '<div class="zbar" aria-hidden="true">' + bar + "</div>";
}
