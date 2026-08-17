#!/usr/bin/env node
/**
 * §3b — CONTRASTE, MESURÉ SUR LE PIXEL RÉELLEMENT PEINT.
 *
 *   npm run mesure:contraste
 *
 * Demande du fondateur avant le merge : « ratio de contraste WCAG de chaque couple texte/fond
 * RÉELLEMENT UTILISÉ » — pas des tokens déclarés. C'est la règle 15 appliquée à la couleur :
 * lire `--zn-text-2` dans une feuille dit ce qui est ÉCRIT ; seul le rendu dit ce qui est PEINT.
 *
 * ── TROIS FAUTES D'INSTRUMENT, DONT DEUX PAYÉES ICI AVANT MOI ─────────────────────────────
 *
 * (1) V1 (12/08/2026) a publié « 1,28 puis 1,01 » sur un texte qui vaut **11,3** : la remontée
 *     par ANCÊTRES ne voit pas un frère peint dessous, et `elementsFromPoint` rend une liste
 *     VIDE hors écran. → on compose la PILE DE PEINTURE, après avoir amené le point à l'écran.
 *
 * (2) Ma première écriture composait `background-color` seul et rendait **1,05:1** sur le héros
 *     de 🎯 Aujourd'hui — un écran dont la maquette est manifestement lisible. Un taux absurde
 *     accuse l'instrument (règle 15) : le héros est peint par un DÉGRADÉ, que `background-color`
 *     ne décrit pas. → quand la pile porte une `background-image`, on ne modélise plus : on
 *     PHOTOGRAPHIE le pixel (capture 1×1, texte rendu transparent le temps du cliché).
 *     Les deux méthodes tournent en parallèle sur les cas SANS image et leur écart est publié :
 *     un compositeur qui diverge du pixel là où il devrait coïncider est un compositeur faux.
 *
 * (3) Le même jet rendait 1,37:1 sur « 🏃 » : un ÉMOJI n'est pas peint par `color` — c'est une
 *     image en couleurs propres. Calculer le contraste de l'encre CSS sous un émoji ne mesure
 *     rien. → on ne sonde que sur une suite d'au moins deux LETTRES, et les nœuds sans lettre
 *     partent au §2, où la question n'est pas leur contraste mais ce qu'ils portent tout seuls.
 *
 * ── LES SEUILS ─────────────────────────────────────────────────────────────────────────────
 *
 * WCAG 2.2, 1.4.3 (AA) : 4,5:1 texte courant · 3:1 texte LARGE (≥ 24 px, ou ≥ 18,66 px gras).
 * 1.4.11 : 3:1 pour un composant d'interface qui porte de l'information.
 *
 * ── CE SCRIPT NE BLOQUE PAS ────────────────────────────────────────────────────────────────
 *
 * Exit 0 quoi qu'il trouve, délibérément : R20.6 a montré qu'un banc rendu bloquant AVANT le
 * tri de ses échecs FIGE la dette au lieu de la traiter. Il mesure, il trie, il nomme.
 */
import { inflateSync } from "node:zlib";
import { startServer, launchBrowser, runnerStateV1 } from "../tests/e2e/harness.mjs";

// ── Décodeur PNG minimal, pour une image de 1×1 ────────────────────────────────────────────
// Une capture d'un seul pixel : un IHDR, un IDAT, pas d'entrelacement. Quarante lignes valent
// mieux qu'une dépendance dans un dépôt qui en revendique zéro.
function pixelDuPng(buf) {
  let i = 8, largeur = 0, prof = 0, type = 0; const idat = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i); const tag = buf.toString("ascii", i + 4, i + 8);
    if (tag === "IHDR") { largeur = buf.readUInt32BE(i + 8); prof = buf[i + 16]; type = buf[i + 17]; }
    else if (tag === "IDAT") idat.push(buf.subarray(i + 8, i + 8 + len));
    else if (tag === "IEND") break;
    i += 12 + len;
  }
  if (prof !== 8 || (type !== 2 && type !== 6)) throw new Error(`PNG inattendu : profondeur ${prof}, type ${type}`);
  const bpp = type === 6 ? 4 : 3;
  const brut = inflateSync(Buffer.concat(idat));
  // 1 octet de filtre par ligne ; sur la première ligne d'une image de 1 px, tout filtre se
  // réduit à l'identité (aucun voisin à gauche, aucune ligne au-dessus).
  const o = 1;
  return { r: brut[o], g: brut[o + 1], b: brut[o + 2], a: 1, _largeur: largeur };
}

const PORT = 8731;
const server = await startServer(PORT);
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const page = await ctx.newPage();

// Triathlon : le seul sport dont une semaine porte les quatre disciplines plus le repos, donc
// les cinq teintes de discipline (smoke-carte-seance §3 pose déjà ce choix, on ne le rejoue
// pas différemment). Trail et swimrun n'ont pas de code propre : le moteur les émet en rn/sw.
const st = runnerStateV1({ format: "70.3", weight: "72" });
st.sport = "tri";
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: "load" });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, st);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);

/** Rendre le texte transparent le temps d'un cliché — et RIEN d'autre : la couleur n'a aucun
 *  effet sur la mise en page, le point sondé ne bouge donc pas entre les deux états. */
const CACHER = `*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}`;
const cacherTexte = (on) => page.evaluate(({ on, css }) => {
  let s = document.getElementById("eb-mesure-contraste");
  if (on) { if (!s) { s = document.createElement("style"); s.id = "eb-mesure-contraste"; s.textContent = css; document.head.appendChild(s); } }
  else if (s) s.remove();
}, { on, css: CACHER });

/** La collecte : tout ce qu'on peut savoir SANS capture. */
const COLLECTE = () => {
  const px = (s) => { const x = String(s).match(/rgba?\(([^)]+)\)/); if (!x) return null;
    const p = x[1].split(",").map((v) => parseFloat(v));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const LETTRE = /\p{L}|\p{Nd}/u;

  /** L'opacité HÉRITE : `opacity:.6` sur un parent s'applique au texte comme au fond de ce
   *  parent, mais pas au fond du grand-parent. On la cumule et on l'applique à l'encre. */
  const opaciteCumulee = (el) => { let o = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const v = parseFloat(getComputedStyle(n).opacity); if (isFinite(v)) o *= v; }
    return o; };

  /** Le fond MODÉLISÉ au point (x,y) : composition de la pile de peinture, du bas vers le
   *  haut. Rend aussi `img` — la pile porte-t-elle un dégradé/une image, auquel cas ce
   *  modèle ne suffit PAS et c'est la capture qui tranche. */
  const fondAu = (x, y, cible) => {
    const pile = document.elementsFromPoint(x, y);
    if (!pile.length) return null;
    const i = pile.findIndex((e) => e === cible || e.contains(cible));
    if (i < 0) return null;                        // occlusion : on ne devine pas
    let acc = { r: 255, g: 255, b: 255, a: 1 }, img = false;   // canevas par défaut
    for (let k = pile.length - 1; k >= i; k--) {
      const s = getComputedStyle(pile[k]);
      if (s.backgroundImage && s.backgroundImage !== "none") img = true;
      const bg = px(s.backgroundColor);
      if (bg && bg.a > 0) acc = over(bg, acc);
    }
    return { acc, img };
  };

  const textes = [], nonTexte = [], refus = [];
  window.__ebPts = window.__ebPts || [];
  // Le POINT est recalculé juste avant la capture (phase B) : c'est la correction de la faute
  // qui a rendu « bouton primaire à 1,07:1 ». La première écriture notait (x, y, window.scrollY)
  // à la collecte et restaurait `window.scrollTo` avant le cliché — or `scrollIntoView` fait
  // défiler le CONTENEUR DE DÉFILEMENT, qui n'est pas toujours la fenêtre. Le cliché tombait
  // donc à côté de l'élément, sur un fond qui n'était pas le sien, avec un chiffre crédible.
  window.__ebPoint = (i) => {
    const p = window.__ebPts[i];
    p.el.scrollIntoView({ block: "center", inline: "nearest" });
    const r = [...p.rg.getClientRects()].find((q) => q.width > 1 && q.height > 1);
    if (!r) return { refus: "rectangle vide après défilement" };
    const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return { refus: "hors cadre après défilement" };
    const f = p.fondAu(x, y, p.el);
    if (!f) return { refus: "occlus — l'élément n'est pas dans la pile de peinture en ce point" };
    return { x, y, fondModele: f.acc, img: f.img, opacite: p.opac(p.el) };
  };
  const zones = [document.getElementById("screen"), document.getElementById("ebAppHeader"), document.getElementById("ebTabbar")].filter(Boolean);

  for (const zone of zones) {
    const it = document.createNodeIterator(zone, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = it.nextNode())) {
      const v = n.nodeValue || "";
      if (!v.trim()) continue;
      const el = n.parentElement;
      if (!el || el.closest("svg")) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const det = el.closest("details");
      if (det && !det.open && !el.closest("summary")) continue;   // replié = non lu

      const etiq = el.tagName.toLowerCase() + (typeof el.className === "string" && el.className.trim()
        ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "");

      // (3) SONDER SUR DES LETTRES. Un émoji n'est pas peint par `color` : sous lui, le pixel
      // est l'émoji lui-même, et le ratio calculé ne décrit rien. On cherche la première
      // suite de deux caractères de lettre/chiffre, et c'est ELLE qu'on sonde.
      let d = -1, larg = 2, glyphe = false;
      for (let k = 0; k < v.length - 1; k++) if (LETTRE.test(v[k]) && LETTRE.test(v[k + 1])) { d = k; break; }
      if (d < 0) {
        // Pas de suite de deux lettres. Reste deux cas très différents, et les confondre est ce
        // qui a produit « 1,37:1 sur 🏃 » : un ÉMOJI est une image en couleurs propres, que
        // `color` ne peint pas — son contraste ne se calcule pas depuis l'encre. Un GLYPHE
        // GÉOMÉTRIQUE (○ ✓ ← ▬ · et les chiffres de zone) est, lui, peint par `color` : il se
        // mesure exactement comme du texte, au seuil des composants (1.4.11, 3:1), parce qu'il
        // PORTE une information — l'état d'une séance, le niveau d'une zone.
        const EMOJI = /\p{Extended_Pictographic}/u;
        const g = [...v].findIndex((c) => !/\s/.test(c) && !EMOJI.test(c) && c !== "️");
        if (g < 0) { nonTexte.push({ txt: v.trim().slice(0, 24), sel: etiq, cache: el.getAttribute("aria-hidden") === "true" || !!el.closest("[aria-hidden=true]") }); continue; }
        d = g; larg = 1; glyphe = true;
      }

      const rg = document.createRange(); rg.setStart(n, d); rg.setEnd(n, d + larg);
      const r = [...rg.getClientRects()].find((q) => q.width > 1 && q.height > 1);
      if (!r) continue;

      const brut = px(cs.color); if (!brut) continue;
      const o = opaciteCumulee(el);
      // ON NE JUGE PAS UN TEXTE EN COURS D'APPARITION — mais on juge un texte volontairement
      // ATTÉNUÉ. Mesuré : le balayage du jour J+4 rendait 72 « échecs », la plupart avec une
      // encre EXACTEMENT égale au fond (1:1) — signature d'un élément à mi-fondu, pas d'un
      // défaut : `zenna-motion` fait apparaître les cartes en opacité et la page venait d'être
      // rechargée. MA PREMIÈRE CORRECTION REFUSAIT TOUTE OPACITÉ < 1, et elle était PIRE que le
      // défaut : 270 textes écartés sur 📋 Profil, dont le téléser du niveau suivant de l'avatar
      // (0,55) et les jours de repos (0,75) — des atténuations VOULUES, donc précisément les
      // meilleurs candidats à un contraste faible. Écarter les candidats fait passer le test :
      // c'est la question du correctif minimal (règle 19), et elle se pose AVANT d'écrire.
      // Le bon discriminant n'est pas la VALEUR de l'opacité mais sa STABILITÉ dans le temps.
      // (voir `__ebPoint` : l'opacité est RELUE à la capture et c'est sa STABILITÉ qui décide.)
      const taille = parseFloat(cs.fontSize) || 16;
      const gras = (parseInt(cs.fontWeight, 10) || 400) >= 700;
      // ON N'ENREGISTRE PAS DE COORDONNÉES ICI — voir `window.__ebPts` : les coordonnées sont
      // recalculées juste avant la capture, dans le MÊME état de mise en page.
      window.__ebPts.push({ el, rg, fondAu, px, opac: opaciteCumulee });
      textes.push({
        txt: v.trim().slice(0, 46), sel: etiq, idx: window.__ebPts.length - 1, glyphe,
        encre: { r: brut.r, g: brut.g, b: brut.b, a: (brut.a ?? 1) * o, aBrut: brut.a ?? 1, aOpac: o },
        taille: Math.round(taille * 10) / 10, gras,
        large: taille >= 24 || (taille >= 18.66 && gras),
      });
    }
  }
  return { textes, nonTexte, refus };
};

// ── Arithmétique WCAG, côté Node ───────────────────────────────────────────────────────────
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b), hi = Math.max(L1, L2), lo = Math.min(L1, L2);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100; };
const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

const ONGLETS = [["profile", "📋 Profil"], ["general", "🗓 Plan"], ["today", "🎯 Aujourd'hui"], ["week", "📅 Semaine"], ["outils", "🧰 Outils"]];

console.log("CONTRASTE — le fond est PHOTOGRAPHIÉ, pas modélisé (390×844, thème réel de chaque onglet)\n");

const tout = [], glyphes = [], ecartsMethode = [];
let refusTotal = 0;

/** PHASE B — la CAPTURE. Le point est recalculé ici, dans l'état de mise en page où le cliché
 *  est pris : c'est la seule façon de garantir que le pixel photographié est bien celui qui est
 *  sous ce texte-là. Extraite en fonction pour que l'AUTO-CONTRÔLE (§0) passe par exactement le
 *  même chemin que la mesure — un auto-contrôle qui emprunterait un autre chemin ne contrôlerait
 *  pas l'instrument, il en contrôlerait un second. */
async function capturer(textes, nom, refus) {
  for (const t of textes) {
    const pt = await page.evaluate((i) => window.__ebPoint(i), t.idx);
    if (pt.refus) { refus.push({ txt: t.txt, sel: t.sel, pourquoi: pt.refus }); continue; }
    // L'OPACITÉ EST RELUE ICI, plusieurs secondes après la collecte. Si elle a BOUGÉ, l'élément
    // était en train d'apparaître et son ratio ne décrit aucun état durable : on refuse. Si elle
    // est stable — même à 0,55 —, c'est une atténuation VOULUE, et elle se mesure comme le reste.
    if (Math.abs(pt.opacite - t.encre.aOpac) > 0.01) {
      refus.push({ txt: t.txt, sel: t.sel, pourquoi: `opacité ${t.encre.aOpac.toFixed(2)} → ${pt.opacite.toFixed(2)} — en cours d'apparition` });
      continue;
    }
    t.encre = { ...t.encre, a: t.encre.aBrut * pt.opacite };
    t.x = pt.x; t.y = pt.y; t.fondModele = pt.fondModele; t.img = pt.img;
    await cacherTexte(true);
    let pix = null;
    try { pix = pixelDuPng(await page.screenshot({ clip: { x: t.x, y: t.y, width: 1, height: 1 } })); }
    catch { /* hors cadre : on retombe sur le modèle, et on le dit */ }
    await cacherTexte(false);
    const fond = pix || t.fondModele;
    t.methode = pix ? "pixel" : "modèle";
    // LA CONTRE-PREUVE DE L'INSTRUMENT — deuxième écriture, la première était VACUEUSE.
    // Elle ne comparait les deux méthodes que « hors dégradé » : or la pile de peinture inclut
    // toujours `body`, qui en porte un, donc le drapeau valait vrai sur 250 points sur 250 et
    // la comparaison ne tournait JAMAIS. Un taux saturé accuse l'instrument (règle 15) — ici
    // il accusait la contre-preuve écrite pour contrôler l'instrument. On compare donc TOUJOURS,
    // et l'écart est le RÉSULTAT : là où il est nul le modèle suffisait, là où il ne l'est pas
    // c'est exactement ce que la capture apporte. Une mesure, pas une case à cocher.
    if (pix) {
      const e = Math.max(Math.abs(pix.r - t.fondModele.r), Math.abs(pix.g - t.fondModele.g), Math.abs(pix.b - t.fondModele.b));
      t.deltaModele = Math.round(e);
      if (e > 2) ecartsMethode.push({ onglet: nom, sel: t.sel, txt: t.txt, pixel: hex(pix), modele: hex(t.fondModele), ecart: Math.round(e),
        rPixel: ratio(over(t.encre, pix), pix), rModele: ratio(over(t.encre, t.fondModele), t.fondModele) });
    }
    const fg = over(t.encre, fond);
    tout.push({ ...t, onglet: nom, fg: hex(fg), bg: hex(fond), seuil: t.glyphe ? 3 : t.large ? 3 : 4.5, ratio: ratio(fg, fond) });
  }
}

/** FRANCHIR LE PORTILLON DU CHECK-IN comme l'athlète : en répondant. Ma première écriture
 *  cliquait `.ci-go, .checkin-skip` — deux classes qui n'existent pas — et croyait le portillon
 *  franchi ; l'onglet 🎯 Aujourd'hui restait le DIAPORAMA, et le balayage des sept jours a
 *  rendu « 0/6 barres d'intensité » en photographiant six fois l'écran des questions. C'est la
 *  forme exacte de la faute qu'il devait corriger : mesurer un écran qui ne montre pas la chose.
 *  (La piste « écrire `readiness.date` dans localStorage » a été essayée et abandonnée : l'état
 *  vit sous `eb_state_v2` après migration, écrire dans `eb_state_v1` ne change rien.) */
/** Attendre que les animations d'apparition soient FINIES. `getAnimations()` est la mesure,
 *  pas une temporisation devinée : on attend que le document n'en porte plus aucune en cours. */
async function stabiliser(maxMs = 6000) {
  const t0 = Date.now();
  for (;;) {
    const enCours = await page.evaluate(() =>
      document.getAnimations().filter((a) => a.playState === "running").length);
    if (!enCours || Date.now() - t0 > maxMs) return enCours;
    await page.waitForTimeout(250);
  }
}

async function passerCheckin() {
  for (let i = 0; i < 8; i++) {
    const reste = await page.evaluate(() => {
      const b = document.querySelector("#ckSlide [data-ck-opt], #screen [data-ck-opt]");
      if (!b) return false;
      b.click(); return true;
    });
    if (!reste) break;
    await page.waitForTimeout(450);
  }
  await page.waitForTimeout(400);
}

const composants = [], couleurSeule = [];

/** §2b + §3 — les COMPOSANTS qui portent de l'information par leur couleur (WCAG 1.4.11,
 *  3:1 contre ce qui les entoure), et la question qui va avec : cette information est-elle
 *  AUSSI portée autrement ? Les deux se mesurent d'un bloc parce qu'elles portent sur les
 *  mêmes éléments — mesurer séparément coûte deux cycles pour un (consigne du 12/08). */
async function composantsEtCouleurSeule(nom) {
  const cibles = await page.evaluate(() => {
    const out = [];
    const pousse = (el, famille, quoi, contre) => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      out.push({ famille, quoi, i: out.length, sel: el.tagName.toLowerCase() + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/)[0] : "") });
      (window.__ebComp = window.__ebComp || []).push({ el, contre: contre || null });
    };
    window.__ebComp = [];
    // CE QUI ENTRE ICI : les composants dont le REMPLISSAGE porte l'information.
    // Le bouton d'état en est SORTI, et c'est une correction : ma première écriture mesurait le
    // fond d'un `.doneBtn` contre son voisin et rendait 1:1 — évidemment, ce fond est
    // transparent. Ce qui porte l'état, c'est le GLYPHE (○ / ✓), qui est peint par `color` et
    // qui est donc mesuré au §1 comme n'importe quelle encre. Mesurer le fond d'un composant
    // dont le signal est le trait, c'est nommer une grandeur et en mesurer une voisine.
    for (const e of document.querySelectorAll("#screen .gd-ic")) pousse(e, "discipline", e.textContent.trim());
    // Les segments de zone se comparent DEUX À DEUX, et seulement entre NIVEAUX DIFFÉRENTS :
    // la question que se pose un lecteur qui ne distingue pas les teintes n'est pas « ce segment
    // ressort-il du fond » mais « puis-je distinguer la Z2 de la Z4 ». Deux segments de MÊME
    // niveau sont légitimement identiques — les compter serait fabriquer un échec.
    for (const bar of document.querySelectorAll("#screen .zbar")) {
      const segs = [...bar.children];
      for (let i = 0; i + 1 < segs.length; i++) {
        const a = (segs[i].textContent || "").trim(), b = (segs[i + 1].textContent || "").trim();
        if (a === b) continue;
        pousse(segs[i], "zone", `Z${a} contre Z${b}`, segs[i + 1]);
      }
    }
    return out;
  });

  for (const c of cibles) {
    const pt = await page.evaluate((i) => {
      const { el, contre } = window.__ebComp[i];
      el.scrollIntoView({ block: "center", inline: "nearest" });
      const r = el.getBoundingClientRect();
      const dedans = { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      // Le point de COMPARAISON : soit le composant voisin explicitement désigné (segments de
      // zone), soit un point au-dessus, dans le parent (badges de discipline sur leur carte).
      let dehors;
      if (contre) { const q = contre.getBoundingClientRect(); dehors = { x: Math.round(q.left + q.width / 2), y: Math.round(q.top + q.height / 2) }; }
      else { const p = el.parentElement.getBoundingClientRect(); dehors = { x: Math.round(r.left + r.width / 2), y: Math.round(Math.max(p.top + 2, r.top - 3)) }; }
      const bon = (q) => q.x >= 0 && q.y >= 0 && q.x < innerWidth && q.y < innerHeight;
      if (!bon(dedans) || !bon(dehors)) return { refus: "hors cadre" };
      return { dedans, dehors };
    }, c.i);
    if (pt.refus) continue;
    await cacherTexte(true);
    let a = null, b = null;
    try {
      a = pixelDuPng(await page.screenshot({ clip: { ...pt.dedans, width: 1, height: 1 } }));
      b = pixelDuPng(await page.screenshot({ clip: { ...pt.dehors, width: 1, height: 1 } }));
    } catch { /* rien */ }
    await cacherTexte(false);
    if (a && b) composants.push({ onglet: nom, ...c, dedans: hex(a), dehors: hex(b), ratio: ratio(a, b) });
  }

  // §3 — l'information est-elle portée AILLEURS que par la couleur ?
  const cs = await page.evaluate(() => {
    const txt = (e) => (e.textContent || "").replace(/\s+/g, " ").trim();
    const badges = [...document.querySelectorAll("#screen .gd-ic")];
    const cartes = badges.map((b) => b.closest(".gd") || b.parentElement).filter(Boolean);
    // Le lexique inclut le vocabulaire du REPOS (« récup active », « mobilité ») : la première
    // écriture ne le portait pas et rendait « 6/7 » — la carte manquante était la carte de
    // repos, qui se nomme bel et bien. Le critère mesurait alors mon lexique, pas le produit.
    const LEX = /(nage|natation|piscine|vélo|velo|home ?trainer|course|footing|cap|brick|repos|off|renfo|marche|récup|recup|mobilité|mobilite|étirement|etirement)/i;
    const zbars = [...document.querySelectorAll("#screen .zbar")];
    const done = [...document.querySelectorAll("#screen .doneBtn")];
    return {
      disc: { n: badges.length, caches: badges.filter((b) => b.getAttribute("aria-hidden") === "true").length,
        nommees: cartes.filter((c) => LEX.test(txt(c))).length,
        exemple: cartes.length ? txt(cartes[0]).slice(0, 60) : "" },
      zone: { n: zbars.length, caches: zbars.filter((z) => z.getAttribute("aria-hidden") === "true").length,
        // le segment porte-t-il un libellé (title/aria-label), et la carte nomme-t-elle ses zones ?
        segTitres: [...document.querySelectorAll("#screen .zbar > *")].filter((s) => s.getAttribute("title") || s.getAttribute("aria-label") || txt(s)).length,
        segTotal: document.querySelectorAll("#screen .zbar > *").length,
        legende: /(facile|modéré|modere|dur|récup|recup|Z[1-5]|seuil)/i.test(txt(document.getElementById("screen"))) },
      etat: { n: done.length,
        glyphes: [...new Set(done.map((d) => txt(d)))],
        etiquetes: done.filter((d) => d.getAttribute("aria-label") || d.getAttribute("title")).length,
        etiqDistinctes: [...new Set(done.map((d) => d.getAttribute("aria-label") || d.getAttribute("title") || ""))].length },
    };
  });
  couleurSeule.push({ onglet: nom, ...cs });
}

// ── §0 · L'INSTRUMENT SAIT-IL VOIR ? ──────────────────────────────────────────────────────
// Une sonde qui ne trouve presque rien peut être une bonne nouvelle ou un instrument aveugle,
// et les deux se ressemblent. On lui donne donc deux cas dont on connaît la réponse : un texte
// délibérément illisible, et un texte délibérément parfait — le jumeau invariance/sensibilité,
// à sa place, sur l'outil et pas seulement sur le produit.
{
  await page.evaluate(() => {
    const d = document.createElement("div");
    d.id = "eb-autocontrole";
    // `!important` PARTOUT, et ce n'est pas de la ceinture-bretelles : mesuré, l'encre calculée
    // du témoin valait `rgb(180,185,192)` et non `#555555` — une règle `!important` de la
    // feuille sombre gagne contre un style en ligne ordinaire. Le témoin ne portait donc pas la
    // couleur dont on connaissait la réponse, et l'auto-contrôle accusait la sonde à tort.
    d.style.cssText = "background:#444444!important;padding:12px;font-size:14px!important;opacity:1!important";
    d.innerHTML = '<span style="color:#555555!important;opacity:1!important">temoin illisible</span>'
      + ' <span style="color:#ffffff!important;opacity:1!important">temoin lisible</span>';
    document.getElementById("screen").prepend(d);
  });
  await page.evaluate(() => { window.__ebPts = []; });
  const { textes } = await page.evaluate(COLLECTE);
  const cibles = textes.filter((t) => /temoin/.test(t.txt));
  const refus0 = [];
  const avant = tout.length;
  await capturer(cibles, "§0 auto-contrôle", refus0);
  const vus = tout.splice(avant);   // ils ne polluent pas la mesure du produit
  const mauvais = vus.find((v) => /illisible/.test(v.txt)), bon = vus.find((v) => /lisible/.test(v.txt) && !/illisible/.test(v.txt));
  // #555 sur #444 = 1,31:1 · #fff sur #444 = 9,74:1 — arithmétique WCAG, vérifiable à la main.
  // MES DEUX PREMIÈRES CONSTANTES ÉTAIENT FAUSSES (1,32 et 9,03) : j'avais posé des valeurs
  // « de tête » dans le contrôle censé attraper les valeurs de tête, et la sonde a été accusée
  // de rendre 9,59 alors qu'elle avait raison au centième près. Recalculées, puis vérifiées
  // contre le fond réellement photographié. Le fond mesuré est #454545 et non #444444 : l'app
  // peint un voile translucide par-dessus le contenu (+1/255), ce qui coûte 0,15 de ratio sur
  // le témoin clair et 0,04 sur le témoin sombre — d'où les tolérances ci-dessous, qui ne sont
  // pas de la marge de confort mais l'effet chiffré d'une cause nommée.
  // Trois assertions, aucune circulaire : (a) le fond PHOTOGRAPHIÉ est bien celui du témoin,
  // donc le point de sonde tombe où il doit ; (b) le ratio rendu par la sonde égale celui que
  // l'arithmétique donne sur ce fond, donc la composition et l'opacité sont justes ; (c) le
  // verdict tombe du bon côté du seuil.
  const fondOk = (v) => v && Math.abs(parseInt(v.bg.slice(1, 3), 16) - 0x44) <= 4;
  const okM = mauvais && fondOk(mauvais) && Math.abs(mauvais.ratio - 1.31) <= 0.10 && mauvais.ratio < mauvais.seuil;
  const okB = bon && fondOk(bon) && Math.abs(bon.ratio - 9.74) <= 0.25 && bon.ratio >= bon.seuil;
  console.log(`── §0 · auto-contrôle de la sonde ─────────────────────────────────────────────`);
  console.log(`  ${okM ? "✓" : "✖"} le témoin ILLISIBLE est vu : ${mauvais ? mauvais.ratio : "non mesuré"}:1 (attendu 1,31 ± 0,10, sous le seuil) · encre ${mauvais ? mauvais.fg : "?"} fond ${mauvais ? mauvais.bg : "?"}`);
  console.log(`  ${okB ? "✓" : "✖"} le témoin LISIBLE ne l'est pas : ${bon ? bon.ratio : "non mesuré"}:1 (attendu 9,74 ± 0,25, au-dessus) · encre ${bon ? bon.fg : "?"} fond ${bon ? bon.bg : "?"}`);
  if (!okM || !okB) { console.log("\n  ✖ la sonde ne répond pas comme elle devrait — les chiffres qui suivent ne valent rien.\n"); }
  else console.log("  → la sonde voit un défaut quand il y en a un, et n'en invente pas quand il n'y en a pas.\n");
  await page.evaluate(() => { const d = document.getElementById("eb-autocontrole"); if (d) d.remove(); });
}

// DEUX FAMILLES DE LA LISTE DU FONDATEUR N'EXISTAIENT PAS À L'ÉCRAN, ET LA SONDE RENDAIT 0.
// « 0 barre d'intensité » et « un seul glyphe d'état » ne décrivaient pas le produit : le jour
// courant du plan de test est un REPOS (donc aucune séance, donc aucune barre de zones, qui ne
// vit que dans la carte de détail de 🎯 Aujourd'hui), et aucune séance n'était validée (donc le
// ✓ n'existait nulle part). Un taux à zéro accuse l'instrument. On pose donc les deux états
// AVANT de mesurer : une séance validée, et — pour la barre — un balayage des sept jours, parce
// que quel jour on tombe est précisément la dimension que la mesure ne contrôlait pas (R20.7).
// On VALIDE une séance par le chemin de l'athlète — un clic sur la coche —, et non en écrivant
// dans `localStorage` : le plan n'y est pas (il est généré au chargement), donc la clé
// `semaine|jour|index` ne peut pas être fabriquée depuis le disque. Ma première écriture le
// faisait quand même et mutait une COPIE du JSON sans jamais la ré-écrire : la sonde continuait
// d'annoncer « un seul glyphe » et le correctif était inerte.
await page.evaluate(async () => { const { setTab } = await import("./js/ui/tabs.js"); setTab("week"); });
await page.waitForTimeout(600);
await page.evaluate(() => { const b = document.querySelector("#screen .doneBtn:not(.done)"); if (b) b.click(); });
await page.waitForTimeout(900);
await page.keyboard.press("Escape");   // la validation ouvre le retour RPE / la célébration
await page.waitForTimeout(500);
const nValide = await page.evaluate(() => document.querySelectorAll("#screen .doneBtn.done").length);
console.log(`  (préparation : ${nValide} séance(s) validée(s) — sans cela le ✓ n'existe nulle part et « prévu vs validé » n'a rien à comparer)\n`);

async function mesurerOnglet(id, nom) {
  await page.evaluate(async (t) => { const { setTab } = await import("./js/ui/tabs.js"); setTab(t); }, id);
  await page.waitForTimeout(800);
  if (id === "today") {   // le portillon du check-in : on le franchit pour voir l'écran réel
    await passerCheckin();
  }
  const restantes = await stabiliser();
  if (restantes) console.log(`        ⚠ ${restantes} animation(s) encore en cours après 6 s — les textes concernés seront refusés, pas jugés`);
  const theme = await page.evaluate(() => document.body.className);
  // DEUX VUES PAR ONGLET. La première est ce qui s'affiche ; la seconde ouvre tous les
  // `<details>`. Sans elle, la mesure raterait tout le contenu que U15/U16/V3 ont replié par
  // défaut — les semaines du plan, le conseil de chaque séance, « pourquoi ce plan » —, c'est-
  // à-dire l'essentiel du texte du produit. « Réellement utilisé » inclut ce qu'on déplie.
  await page.evaluate(() => { window.__ebPts = []; });
  const a = await page.evaluate(COLLECTE);
  await page.evaluate(() => { for (const d of document.querySelectorAll("details")) d.open = true; });
  await page.waitForTimeout(300);
  const b = await page.evaluate(COLLECTE);
  const textes = a.textes.concat(b.textes), nonTexte = a.nonTexte.concat(b.nonTexte), refus = a.refus.concat(b.refus);

  await capturer(textes, nom, refus);
  for (const g of nonTexte) glyphes.push({ ...g, onglet: nom });
  await composantsEtCouleurSeule(nom);
  refusTotal += refus.length;
  const mes = tout.filter((s) => s.onglet === nom);
  const ko = mes.filter((s) => s.ratio < s.seuil);
  console.log(`  ${nom.padEnd(16)} ${String(mes.length).padStart(4)} textes · ${String(ko.length).padStart(3)} sous le seuil · ${refus.length} non mesurable(s) · ${nonTexte.length} nœud(s) sans lettre · body="${theme}"`);
  for (const r of refus.slice(0, 4)) console.log(`        ↳ non mesuré : ${r.sel} « ${r.txt} » — ${r.pourquoi}`);
}

for (const [id, nom] of ONGLETS) await mesurerOnglet(id, nom);

// LE BALAYAGE DES SEPT JOURS sur 🎯 Aujourd'hui — la barre d'intensité ne vit que dans la carte
// de détail de cet onglet, donc elle n'existe pas un jour de repos. Ne mesurer que « le jour où
// la mesure tourne » est la faute que ce dépôt a payée six fois (R20.7, U1, smoke-zenna,
// audit:r14, O-19, R23) : le verdict dépendait alors d'une dimension non contrôlée. `setFixedTime`
// et non `install` — `install` gèlerait les minuteries, donc les animations que cet onglet porte.
{
  const base = new Date(); base.setHours(10, 0, 0, 0);
  let jAvecSeance = 0;
  for (let k = 1; k <= 6; k++) {
    const d = new Date(base.getTime() + k * 864e5);
    await page.clock.setFixedTime(d);
    const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    await page.evaluate((j) => {
      const S = JSON.parse(localStorage.getItem("eb_state_v1"));
      S.answers.readiness = Object.assign({}, S.answers.readiness, { date: j });
      localStorage.setItem("eb_state_v1", JSON.stringify(S));
    }, iso);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    // FRANCHIR LE PORTILLON AVANT DE COMPTER. Sans cela la sonde comptait les barres sur
    // l'écran du check-in, qui n'en porte aucune : elle rendait 0 les six jours et concluait
    // « aucune barre d'intensité dans le produit » — un zéro qui décrivait le portillon.
    await page.evaluate(async () => { const { setTab } = await import("./js/ui/tabs.js"); setTab("today"); });
    await page.waitForTimeout(500);
    await passerCheckin();
    const nSeances = await page.evaluate(() => document.querySelectorAll("#screen .zbar").length);
    if (nSeances > 0) { jAvecSeance++; await mesurerOnglet("today", `🎯 J+${k}`); }
  }
  console.log(`  (balayage : ${jAvecSeance}/6 jours suivants portent une barre d'intensité ; les autres sont des jours de repos)`);
}
console.log("");

// ── L'instrument se contrôle lui-même ─────────────────────────────────────────────────────
const nPix = tout.filter((t) => t.methode === "pixel").length;
const deltas = tout.filter((t) => t.deltaModele != null).map((t) => t.deltaModele);
console.log(`── contrôle de l'instrument ───────────────────────────────────────────────────`);
console.log(`  ${nPix}/${tout.length} fonds photographiés · ${tout.length - nPix} retombés sur le modèle`);
console.log(`  écart pixel ↔ modèle : ${deltas.filter((d) => d <= 2).length} point(s) où le modèle suffisait · ${ecartsMethode.length} où il ne suffisait PAS · max Δ${Math.max(0, ...deltas)}/255`);
if (ecartsMethode.length) {
  const pire = ecartsMethode.slice().sort((a, b) => Math.abs(b.rPixel - b.rModele) - Math.abs(a.rPixel - a.rModele)).slice(0, 5);
  console.log(`  ce que la capture change sur le VERDICT (les 5 plus gros écarts de ratio) :`);
  for (const e of pire) console.log(`     ${e.onglet} ${e.sel} « ${e.txt} » — pixel ${e.rPixel}:1 vs modèle ${e.rModele}:1 (fond ${e.pixel} vs ${e.modele}, Δ${e.ecart}/255)`);
}
console.log("");

// ── §1 · Les couples texte/fond DISTINCTS ─────────────────────────────────────────────────
const couples = new Map();
// Le fond est PHOTOGRAPHIÉ, donc un dégradé rend deux valeurs voisines pour le même couple
// visuel (#121519 et #13151a). On REGROUPE par pas de 8/255 — invisible à l'œil, ~0,02 de
// ratio — pour que le tableau compte des couples et non des pixels ; les chiffres affichés
// restent ceux du point le PIRE de chaque groupe, jamais une moyenne.
const q = (h) => "#" + h.slice(1).match(/../g).map((v) => (Math.round(parseInt(v, 16) / 8) * 8).toString(16).padStart(2, "0")).join("");
for (const s of tout.slice().sort((x, y) => x.ratio - y.ratio)) {
  const k = `${q(s.fg)}|${q(s.bg)}|${s.large ? "L" : "n"}`;
  if (!couples.has(k)) couples.set(k, { ...s, n: 0, ex: [], onglets: new Set() });
  const c = couples.get(k);
  c.n++; c.onglets.add(s.onglet);
  if (c.ex.length < 2) c.ex.push(`${s.sel} « ${s.txt} »`);
}
const liste = [...couples.values()].sort((a, b) => a.ratio / a.seuil - b.ratio / b.seuil);
const sousSeuil = liste.filter((c) => c.ratio < c.seuil);

console.log(`── §1 · ${couples.size} couples texte/fond DISTINCTS · ${tout.length} textes · ${refusTotal} refus de mesure ──\n`);
if (!sousSeuil.length) console.log("  ✓ aucun couple sous son seuil.\n");
else {
  console.log(`  ✖ ${sousSeuil.length} couple(s) SOUS LE SEUIL (${sousSeuil.reduce((t, c) => t + c.n, 0)} occurrences) :\n`);
  for (const c of sousSeuil) {
    console.log(`   ${String(c.ratio).padStart(5)}:1  (seuil ${c.seuil})  encre ${c.fg} sur fond ${c.bg}  ${c.taille}px${c.gras ? " gras" : ""}${c.img ? " [dégradé]" : ""}`);
    console.log(`          ×${c.n} · ${[...c.onglets].join(", ")} · fond ${c.methode}`);
    for (const e of c.ex) console.log(`          ${e}`);
  }
  console.log("");
}
// Les marges les plus fines qui PASSENT : c'est là que la prochaine retouche de teinte casse.
const justes = liste.filter((c) => c.ratio >= c.seuil).slice(0, 5);
console.log("  les cinq marges les plus fines qui passent (là où la prochaine retouche casse) :");
for (const c of justes) console.log(`   ${String(c.ratio).padStart(5)}:1 / ${c.seuil}  ${c.fg} sur ${c.bg}  ×${c.n}  ${c.ex[0]}`);
console.log("");

// ── Les deux teintes que le fondateur nomme ───────────────────────────────────────────────
const NOMMEES = [["cyan", /^#(00b8d9|3b9eff|00a376)$/i], ["or", /^#(f0b429|ffd23d|e0b0|c9a0)/i]];
console.log("── les deux teintes nommées : le cyan et l'or sur fond sombre ─────────────────\n");
for (const [nom, re] of NOMMEES) {
  const hits = liste.filter((c) => re.test(c.fg));
  if (!hits.length) { console.log(`  ${nom} : aucun TEXTE de cette teinte — elle ne sert pas d'encre, seulement de fond ou de trait.`); continue; }
  for (const h of hits) console.log(`  ${nom} : ${h.ratio}:1 (seuil ${h.seuil}) ${h.fg} sur ${h.bg} ×${h.n} — ${h.ex[0]}`);
}
console.log("");

// ── §2 · Les nœuds SANS lettre : ce qu'ils portent tout seuls ─────────────────────────────
const parGlyphe = new Map();
for (const g of glyphes) { const k = g.txt + "|" + g.sel;
  if (!parGlyphe.has(k)) parGlyphe.set(k, { ...g, n: 0, onglets: new Set() });
  const c = parGlyphe.get(k); c.n++; c.onglets.add(g.onglet); }
const exposes = [...parGlyphe.values()].filter((g) => !g.cache);
console.log(`── §2 · ${parGlyphe.size} nœuds sans lettre (émoji, glyphes) · ${exposes.length} NON masqués aux lecteurs d'écran ──\n`);
console.log("  Un émoji n'est pas peint par `color` : son contraste ne se calcule pas depuis l'encre CSS.");
console.log("  La question qui vaut pour eux est celle du §3 — portent-ils une information à eux seuls ?\n");
for (const g of exposes.slice(0, 14)) console.log(`   « ${g.txt} » ${g.sel} ×${g.n} · ${[...g.onglets].join(", ")}`);
console.log("");

// ── §2b · Les COMPOSANTS qui portent de l'information par leur couleur (1.4.11, 3:1) ──────
const parFam = new Map();
for (const c of composants) {
  const k = `${c.famille}|${c.quoi}|${c.dedans}|${c.dehors}`;
  if (!parFam.has(k)) parFam.set(k, { ...c, n: 0 });
  parFam.get(k).n++;
}
const comps = [...parFam.values()].sort((a, b) => a.ratio - b.ratio);
const compsKO = comps.filter((c) => c.ratio < 3);
console.log(`── §2b · ${composants.length} composants colorés mesurés (${comps.length} distincts) · seuil 1.4.11 = 3:1 ──\n`);
if (!compsKO.length) console.log("  ✓ tous se détachent d'au moins 3:1 de ce qui les entoure.\n");
else {
  console.log(`  ✖ ${compsKO.length} composant(s) sous 3:1 :\n`);
  for (const c of compsKO) console.log(`   ${String(c.ratio).padStart(5)}:1  ${c.famille} « ${c.quoi} » ${c.dedans} contre ${c.dehors}  ×${c.n} · ${c.onglet} (${c.sel})`);
  console.log("");
}
for (const f of ["discipline", "zone"]) {
  const s = comps.filter((c) => c.famille === f);
  if (s.length) console.log(`  ${f.padEnd(11)} ${s.length} distinct(s) · du plus faible : ${s.slice(0, 4).map((c) => c.quoi + " " + c.ratio).join(" · ")}`);
}
console.log("");

// ── §3 · Aucune information portée par la COULEUR SEULE ───────────────────────────────────
console.log("── §3 · l'information est-elle portée autrement que par la couleur ? ─────────\n");
const agg = (f) => couleurSeule.reduce((t, c) => t + (c[f] ? 1 : 0), 0);
const D = couleurSeule.map((c) => c.disc).filter((d) => d.n);
const Z = couleurSeule.map((c) => c.zone).filter((z) => z.n);
const E = couleurSeule.map((c) => c.etat).filter((e) => e.n);
{
  const n = D.reduce((t, d) => t + d.n, 0), cach = D.reduce((t, d) => t + d.caches, 0), nom = D.reduce((t, d) => t + d.nommees, 0);
  console.log(`  disciplines   ${n} badges colorés · ${cach} masqués aux lecteurs d'écran (aria-hidden)`);
  console.log(`                ${nom}/${n} cartes nomment la discipline EN TOUTES LETTRES`);
  console.log(`                ${nom === n && cach === n ? "✓ la couleur illustre, le nom informe" : "⚠ à regarder — une carte sans le mot repose sur son badge"}`);
  if (D[0] && D[0].exemple) console.log(`                exemple : « ${D[0].exemple} »`);
}
{
  const n = Z.reduce((t, z) => t + z.n, 0), cach = Z.reduce((t, z) => t + z.caches, 0);
  const seg = Z.reduce((t, z) => t + z.segTotal, 0), tit = Z.reduce((t, z) => t + z.segTitres, 0);
  console.log(`  zones          ${n} barres d'intensité · ${cach} masquées · ${tit}/${seg} segments porteurs d'un libellé`);
  console.log(`                ${Z.some((z) => z.legende) ? "✓ une légende TEXTE des intensités est présente à l'écran" : "⚠ aucune légende texte trouvée"}`);
  console.log(`                ${cach === n ? "✓ la barre est déclarée décorative — l'intensité doit donc vivre dans le texte de la séance" : "⚠ barre non décorative sans libellé de segment"}`);
}
{
  const n = E.reduce((t, e) => t + e.n, 0);
  const gl = [...new Set(E.flatMap((e) => e.glyphes))];
  const et = E.reduce((t, e) => t + e.etiquetes, 0);
  console.log(`  prévu/validé   ${n} boutons d'état · glyphes distincts : ${gl.map((g) => `« ${g} »`).join(" ")} · ${et}/${n} portent une étiquette`);
  console.log(`                ${gl.length >= 2 ? "✓ l'état change de GLYPHE, pas seulement de couleur" : "⚠ un seul glyphe : l'état ne se lit qu'à la couleur"}`);
}
console.log("");

await browser.close();
server.close();
process.exit(0);
