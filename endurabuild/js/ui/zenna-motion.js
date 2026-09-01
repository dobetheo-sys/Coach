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
const BEAT = 160; // cadence révisée — voir la note de `--beat` dans css/zenna-today.css

/* ============================================================
   LE PORTILLON DE MOUVEMENT — pourquoi il existe
   ============================================================
   Retour du fondateur : « l'animation est beaucoup trop rapide ». Chronométré image par image
   après la dernière réponse du check-in, le relevé disait autre chose :

     t=1487ms  rideau OPAQUE   9 cartes déjà arrivées   compteur fini   anneau fini
     t=1856ms  rideau PARTI    plus rien ne bouge, et plus rien ne bougera

   Tout le système de motion se jouait DERRIÈRE la couche de verdict. Quand elle se levait,
   l'écran était déjà figé : l'athlète ne voyait aucune animation. Ce n'était pas « trop
   rapide », c'était « déjà fini » — et aucun réglage de durée n'aurait corrigé ça.

   La cause est mon propre correctif : pour ne pas retarder l'affichage de la séance (budget
   U7), j'avais rendu le tampon non bloquant — il ne retarde plus rien, mais il RECOUVRE le
   moment où tout se joue. La séquence de la maquette (tampon, PUIS révélation) avait disparu
   dans l'opération.

   Ce portillon la restaure sans réintroduire le délai : le contenu est rendu tout de suite
   (donc présent, mesurable, atteignable), seules les ANIMATIONS attendent que le rideau
   commence à se lever. `.rise` est posée immédiatement — les cartes sont donc à opacité 0
   derrière une couche opaque, ce qui ne se voit pas — et `zn-play` n'arrive qu'à l'ouverture.

   LE CHIEN DE GARDE N'EST PAS DÉCORATIF : si `znRelease` n'était jamais appelée (exception
   dans le rendu, couche retirée autrement), l'onglet resterait VIDE pour toujours. Le mode de
   panne d'un portillon d'opacité est l'écran blanc ; il doit donc s'ouvrir tout seul. */
let _hold = false;
let _pending = [];
let _watchdog = null;
export function znHold() {
  _hold = true;
  clearTimeout(_watchdog);
  _watchdog = setTimeout(znRelease, 4000);
}
export function znRelease() {
  clearTimeout(_watchdog);
  _watchdog = null;
  if (!_hold && !_pending.length) return;
  _hold = false;
  const q = _pending;
  _pending = [];
  for (const f of q) { try { f(); } catch (e) { console.warn(e); } }
}
/** Exécute maintenant, ou à l'ouverture du portillon. */
function _quand(fn) { if (_hold) _pending.push(fn); else fn(); } // le battement de la maquette : tout en est un multiple

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
  _toastTimer = setTimeout(() => { if (_toastEl) _toastEl.classList.remove("on"); }, BEAT * 25); // ≈4 s, convention snackbar
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
    ], { duration: BEAT * (5 + Math.random() * 3), easing: "cubic-bezier(.2,.8,.4,1)" }); // 800-1280 ms : sous 600 ms la particule disparaissait avant d'avoir décrit son arc
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
  ], { duration: BEAT * 10, easing: "cubic-bezier(.34,.06,.20,1)" }); // 1600 ms : le texte doit être LU pendant qu'il monte, pas seulement aperçu
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
  // `zn-play` est retirée TOUT DE SUITE, avant même de savoir si le portillon retient.
  //
  // Sans cette ligne, le portillon ne retient rien : `#screen` conserve la classe du rendu
  // PRÉCÉDENT (celui du portillon de check-in, qui appelle déjà znPlay), donc les enfants
  // fraîchement créés matchent `.zn-play .rise` dès qu'on leur pose `rise` et s'animent
  // immédiatement. Mesuré : la cascade se jouait UNE FOIS derrière le rideau (0→7 cartes
  // pendant qu'il était opaque) puis se REJOUAIT à l'ouverture — deux fois, dont une invisible.
  host.classList.remove("zn-play");
  // Les classes `rise` sont posées TOUT DE SUITE (le contenu passe à opacité 0), mais le
  // déclenchement passe par le portillon : derrière une couche de verdict opaque, l'invisible
  // ne se voit pas, et la cascade se joue au moment où on la regarde.
  _quand(() => {
    // Retirer/reposer `zn-play` avec un reflow entre les deux REJOUE la cascade : sans ça,
    // revenir sur l'onglet réafficherait des cartes déjà animées, donc figées.
    host.classList.remove("zn-play");
    void host.offsetWidth;
    host.classList.add("zn-play");
  });
}

/* ============================================================
   COURBE DE CHARGE — les trois lignes se tracent
   ============================================================ */
export function znDrawChart() {
  if (!znOn()) return;
  const lines = document.querySelectorAll("#screen .zn-chart-line");
  if (!lines.length) return;
  const reduce = znReduce();
  _quand(() => lines.forEach((p, i) => {
    let len = 0;
    try { len = p.getTotalLength(); } catch (e) { return; }
    if (!len) return;
    p.style.strokeDasharray = String(len);
    if (reduce) { p.style.strokeDashoffset = "0"; return; }
    p.style.transition = "none";
    p.style.strokeDashoffset = String(len);
    void p.getBoundingClientRect();
    // beat×8 pour le tracé (le plus LONG parcours de l'écran : la durée s'indexe sur la
    // distance couverte), départs échelonnés beat×4 / ×6 / ×8.
    p.style.transition = "stroke-dashoffset " + (BEAT * 8) + "ms cubic-bezier(.34,.06,.20,1) " + (BEAT * (4 + i * 2)) + "ms";
    p.style.strokeDashoffset = "0";
  }));
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
  // L'ANNEAU DOIT PARTIR DE VIDE, SINON IL N'ANIME RIEN.
  //
  // Défaut mesuré : le SVG est émis avec `stroke-dashoffset` DÉJÀ à sa valeur finale (pour
  // rester juste sans JS, ce qui est la bonne décision), et cette fonction posait la MÊME
  // valeur en style inline. Une transition entre une valeur et elle-même ne produit aucun
  // mouvement — l'anneau était figé du premier au dernier échantillon (relevé : 46 constant
  // sur 3 secondes). On le vide d'abord (offset = circonférence entière), on force un reflow
  // pour que le navigateur enregistre cet état de départ, puis on transitionne vers la cible.
  const plein = parseFloat(ring.getAttribute("stroke-dasharray"));
  if (val && isFinite(n)) val.textContent = "0";
  _quand(() => {
  if (isFinite(plein)) {
    ring.style.transition = "none";
    ring.style.strokeDashoffset = String(plein);
    void ring.getBoundingClientRect();
    ring.style.transition = "";
  }
  requestAnimationFrame(() => {
    if (isFinite(target)) ring.style.strokeDashoffset = String(target);
    // L'anneau et son chiffre partagent durée ET délai : une jauge et le nombre qu'elle porte
    // sont un seul objet, deux cadences les rendraient concurrents.
    if (val && isFinite(n)) setTimeout(() => znCountUp(val, n, BEAT * 7), BEAT * 2.5);
  });
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
  // Fin à beat×9,5 ≈ 1520 ms, donc APRÈS l'atterrissage de la carte héros (960 ms) : le
  // chiffre se stabilise une fois son support posé, jamais pendant.
  _quand(() => setTimeout(() => znCountUp(el, n, BEAT * 7), BEAT * 2.5));
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
  // LE RIDEAU SE LÈVE ET LE MOUVEMENT PART EN MÊME TEMPS. `znRelease` est appelée au DÉBUT du
  // fondu, pas à sa fin : la cascade démarre pendant que le voile s'efface, donc l'athlète voit
  // le premier mouvement arriver au travers plutôt que de fixer un écran figé une demi-seconde.
  let parti = false;
  const partir = () => {
    if (parti) return;
    parti = true;
    ov.style.opacity = "0";
    znRelease();
    setTimeout(() => ov.remove(), BEAT * 2.5);
  };
  setTimeout(partir, znReduce() ? 600 : BEAT * 10);
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

   La table ci-dessous traduit les zones du moteur en niveaux 1-5. Elle est ordonnée par
   intensité croissante et n'invente rien : chaque entrée est une zone de `ZDEF` et son niveau
   se lit sur l'ancrage FC que `renderer.ts` déclare (voir le commentaire suivant). Une zone
   inconnue retombe en Z2 — le choix prudent, jamais du rouge par défaut.
   (Cette prose citait `_IFZ` : la table UI du TSS, morte avec B1 — référence retirée, la
   règle 13 dit qu'un commentaire périmé se corrige ou se supprime.) */
// AUCUNE ZONE DU MOTEUR NE DOIT MANQUER ICI, et ça s'est vérifié : ma première écriture
// oubliait `sw.vo2` ET LES SEPT ZONES DE TRAIL. Le repli (Z2) est silencieux — un plan trail
// entier affichait donc des barres uniformément « facile », y compris sur `tr.vam`, que le
// moteur décrit lui-même « RPE 9/10 — montée à fond ». Un repli prudent sur une grandeur
// qu'on affiche n'est pas prudent : il est faux sans le dire.
//
// Le niveau n'est PAS choisi au jugé : il se lit sur l'ancrage FC que `renderer.ts` déclare
// pour chaque zone (`hr: "z1" | "z2" | "tempo" | "seuil" | null`). Deux zones de trail sont
// même IDENTIQUES à leur équivalent course (mêmes ref et multiplicateurs) : `tr.flat` = `rn.easy`,
// `tr.flatthr` = `rn.thr`.
const ZONE_LEVEL = {
  // Z1 — récupération / très souple (hr z1)
  "rn.rec": 1, "sw.easy": 1, "tr.easyup": 1,
  // Z2 — endurance fondamentale (hr z2)
  "bk.z2": 2, "rn.easy": 2, "sw.aero": 2, "tr.flat": 2, "tr.hike": 2,
  // Z3 — tempo / allure soutenue (hr tempo)
  "bk.ss": 3, "rn.mara": 3, "bk.rp": 3, "bk.frc": 3, "tr.climb": 3,
  // Z4 — seuil (hr seuil)
  "bk.thr": 4, "rn.thr": 4, "sw.css": 4, "tr.asc": 4, "tr.flatthr": 4,
  // Z5 — VO2max / vitesse (hr null, RPE 9-10)
  "bk.vo2": 5, "rn.vo2": 5, "sw.speed": 5, "sw.vo2": 5, "tr.vam": 5,
};
// O-61 — LES CINQ MOTS DE LA BARRE. Ce n'est PAS une table de zones parallèle : c'est la
// LÉGENDE de l'axe que la barre affiche déjà (`ZONE_LEVEL`, dérivé des ancrages FC du moteur).
// Le fondateur : « un numéro de zone est une convention que l'athlète n'a pas » — `1 │ 2 │ 1`
// n'était lisible que par qui connaissait la table. Cinq mots, un par niveau, même vocabulaire
// que les zones du moteur (récup / aérobie / tempo / seuil / VO2).
const ZONE_WORD = { 1: "Récup", 2: "Aéro", 3: "Tempo", 4: "Seuil", 5: "VO2" };
export function znZoneBar(session, blkMin) {
  if (!session || !Array.isArray(session.steps) || !session.steps.length) return "";
  const segs = session.steps.map((st) => {
    const min = blkMin(st) || 0;
    const lvl = st.role === "warmup" || st.role === "cooldown" ? 1 : (ZONE_LEVEL[st.zone] || 2);
    // O-61 — le segment porte son libellé et sa GRANDEUR, tous deux lus sur le BLOC (jamais
    // une table à côté) : le rôle nomme l'échauffement et le retour au calme, le niveau nomme
    // le corps, et la grandeur est celle de la prescription (mètres ou minutes, reps comprises).
    const reps = st.reps || 1;
    const qty = st.durationMin != null ? Math.round(st.durationMin) + "min"
      : st.distanceM != null ? Math.round(st.distanceM) + "m" : "";
    const grandeur = qty ? (reps > 1 ? reps + "×" + qty : qty) : "";
    const mot = st.role === "warmup" ? "Éch" : st.role === "cooldown" ? "RC" : (ZONE_WORD[lvl] || "");
    return { min, lvl, label: (mot + " " + grandeur).trim() };
  }).filter((x) => x.min > 0);
  if (segs.length < 2) return "";
  const total = segs.reduce((t, x) => t + x.min, 0);
  if (!total) return "";
  const bar = segs.map((x) => {
    // `flex` proportionnel à la durée, avec un plancher visuel : un bloc de 30 s doit rester
    // visible, sinon la barre ment par omission sur une séance à récup courtes.
    const pct = Math.max(3, Math.round((x.min / total) * 100));
    // `title` porte le libellé complet : un segment étroit tronque son texte plutôt que de
    // s'élargir (la LARGEUR est une information — proportionnelle à la durée), et le déroulé
    // complet vit juste en dessous depuis O-60. La barre reste `aria-hidden` : elle est le
    // résumé visuel d'un détail que le lecteur d'écran reçoit en toutes lettres.
    return '<div class="zseg grow-x" style="flex:' + pct + ' 0 auto;background:var(--z' + x.lvl + ')" title="' + x.label + '">'
      + '<span class="znum' + (x.lvl === 1 ? " light" : "") + '">' + x.label + "</span></div>";
  }).join("");
  return '<div class="zbar" aria-hidden="true">' + bar + "</div>";
}

/* ============================================================
   CASCADE DES AUTRES ONGLETS — une fois par onglet, par session
   ============================================================
   La cascade était réservée à Aujourd'hui, et `tabs.js` écrit pourquoi : sur un onglet de
   consultation qu'on parcourt en aller-retour, `.rise` remet le contenu à opacité 0 à CHAQUE
   retour, donc chaque retour rejoue une attente. L'objection porte sur la RÉPÉTITION, pas sur
   le geste — arriver sur un écran mérite le même mouvement partout, c'est ce qui dit que
   l'écran vient de changer.

   Le portillon est donc la répétition elle-même : la cascade joue à la PREMIÈRE arrivée sur
   chaque onglet, une fois par session ; les allers-retours suivants s'affichent d'un bloc.
   Aujourd'hui garde son comportement inchangé (il rejoue à chaque arrivée — c'est l'écran du
   matin, et sa cascade est enchaînée au tampon de verdict).

   Les re-rendus INTERNES ne passent pas par ici : flèches de semaine, sous-onglets et coches
   appellent leur module de rendu directement, jamais `renderActiveTab`. */
const _vus = new Set();
export function znPlayOnce(tabId) {
  if (!znOn() || !tabId || _vus.has(tabId)) return;
  _vus.add(tabId);
  // Le repli n'est PAS « jouer sans animation » : `.rise` pose opacité 0 en attendant une
  // animation que le CSS coupe. On ne pose donc aucune classe — l'onglet s'affiche tel quel.
  if (znReduce()) return;
  znPlay();
}

/* ============================================================
   NAVIGATION DE SEMAINE — les jours arrivent l'un après l'autre
   ============================================================
   Celle-ci REJOUE à chaque changement de semaine, et c'est ce qui la distingue de la
   précédente : ce n'est pas une arrivée sur un écran, c'est un CHANGEMENT DE CONTENU dans un
   écran qui reste. Sept cases se remplacent au même endroit ; sans mouvement, rien ne dit que
   le tap a pris — surtout entre deux semaines de même volume.

   Décalage plafonné à CINQ pas (la règle de stagger du système) : au-delà, le dernier jour
   attend plus longtemps que le geste ne dure, et la grille se lit comme une file d'attente. */
export function znPlayDays() {
  if (!znOn() || znReduce()) return;
  const grid = document.querySelector("#screen .gw-grid");
  if (!grid) return;
  const jours = [...grid.children].filter((n) => n.nodeType === 1);
  if (!jours.length) return;
  grid.classList.remove("zn-days");
  jours.forEach((n, i) => n.classList.add("d" + Math.min(5, i + 1)));
  // Reflow entre retrait et pose : sans lui, rejouer la même animation sur une grille déjà
  // animée ne redéclenche rien (le navigateur regroupe les deux changements de classe).
  void grid.offsetWidth;
  grid.classList.add("zn-days");
}
