// LA CARTE DE SÉANCE — repliée par défaut, fond sombre uniforme, la couleur dans le badge.
//
// Refonte demandée par le fondateur (12/08/2026, maquette « structure interne réelle »). Trois
// propriétés, et aucune n'était gardée : la carte de séance vivait sous les gardes d'AUTRES
// sujets (`smoke-typo` pour la hiérarchie de tailles, `smoke-usage` pour la densité de son
// contenu déplié), jamais sous une garde qui regarde son ÉTAT PAR DÉFAUT.
//
// Ce que ce fichier tient :
//   §1 repliée d'office — le détail (conseil, blocs) n'existe pas à l'écran sans un tap ;
//   §2 le fond de carte est sombre et UNIFORME, quelle que soit la charge du jour ;
//   §3 le badge de discipline porte la couleur, et la porte assez fort pour être vu
//      (WCAG 1.4.11, 3:1 — un badge qui distingue les disciplines PORTE de l'information) ;
//   §4 la bascule est un état LOCAL : ouvrir ne redessine pas l'onglet et ne perd pas la coche.
//
// Le §3 est celui qui a changé une décision : ma première écriture posait l'accent à 22 %
// d'opacité, mesuré à 1,26–1,48:1 contre la carte. Aucune dilution n'atteint 3:1 sur ce fond,
// donc la tuile est PLEINE — comme sur la maquette.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

const PORT = 8613;
const server = await startServer(PORT);
const { ok, report } = makeReporter();
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", isMobile: true, hasTouch: true })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

// Triathlon : c'est le seul sport dont le plan porte les QUATRE disciplines plus le repos, donc
// les cinq badges, dans une seule semaine. Le trail et le swimrun n'ont pas de code de
// discipline propre — le moteur les émet en `rn`/`sw` —, ils héritent donc exactement de ces
// badges-là ; les mesurer séparément mesurerait deux fois la même chose.
const st = runnerStateV1({ format: "70.3", weight: "72" });
st.sport = "tri";
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "load" });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, st);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);

const ouvrirOnglet = async (t) => {
  await page.evaluate(async (t) => { const { setTab } = await import("./js/ui/tabs.js"); setTab(t); }, t);
  await page.waitForTimeout(700);
};

// ─────────── §1 · Repliée par défaut ───────────
// Renversement ASSUMÉ de la demande du 08/08/2026 (« afficher d'office le détail des séances »,
// qui visait cet onglet). Mesuré avant le lot : 7 séances sur 7 dépliées, 161 px par jour.
await ouvrirOnglet("week");
{
  const m = await page.evaluate(() => ({
    total: document.querySelectorAll("#screen details.gd-sess").length,
    ouverts: [...document.querySelectorAll("#screen details.gd-sess")].filter((d) => d.open).length,
    // LA HAUTEUR DE LA SÉANCE ELLE-MÊME, et pas celle de son conseil. Ma première écriture
    // sommait les `.gd-why` en supposant qu'un `<details>` fermé ne rend rien : mesuré, Chromium
    // leur donne quand même 37 à 56 px (le contenu est « sauté » par `content-visibility`, ses
    // boîtes ne sont pas remises à zéro). Le critère aurait rougi sur un repli qui marche.
    // On mesure donc ce que la propriété DIT : une séance repliée tient sur une ligne.
    hautMax: Math.max(...[...document.querySelectorAll("#screen details.gd-sess")]
      .map((d) => Math.round(d.getBoundingClientRect().height))),
  }));
  ok(m.total >= 5, "la semaine porte bien des séances à mesurer (" + m.total + ")");
  ok(m.ouverts === 0, "…toutes repliées par défaut (" + m.ouverts + "/" + m.total + " ouvertes)");
  ok(m.hautMax <= 70, "…et chacune tient sur une ligne (la plus haute : " + m.hautMax + " px)");

  // LA MOITIÉ QUI PROUVE QUE LA MESURE DISCRIMINE : ouverte, la même séance doit grandir. Sans
  // ce témoin, « ≤ 70 px » serait satisfait par une carte vide, ou par un sélecteur qui ne
  // trouve rien.
  // Sur TOUTES les séances, et on retient la plus forte croissance : viser la première mesurait
  // « Récup active », la plus courte de la semaine (49 → 73 px seulement). Le témoin doit
  // montrer que le repli cache quelque chose de substantiel QUELQUE PART, pas que chaque séance
  // cache autant — une récup a légitimement peu à dire.
  const croissance = await page.evaluate(() => {
    let max = { avant: 0, apres: 0, delta: -1 };
    for (const d of document.querySelectorAll("#screen details.gd-sess")) {
      const avant = Math.round(d.getBoundingClientRect().height);
      d.open = true;
      const apres = Math.round(d.getBoundingClientRect().height);
      d.open = false;
      if (apres - avant > max.delta) max = { avant, apres, delta: apres - avant };
    }
    return max;
  });
  ok(croissance.delta > 40,
    "…et l'ouvrir la fait bien grandir — le repli cache quelque chose de réel ("
      + croissance.avant + " → " + croissance.apres + " px, +" + croissance.delta + ")");
}

// ─────────── §2 · Fond sombre uniforme ───────────
{
  const m = await page.evaluate(() => {
    const gd = [...document.querySelectorAll("#screen .gd")];
    const fonds = gd.map((g) => getComputedStyle(g).backgroundColor);
    return {
      n: gd.length,
      distincts: [...new Set(fonds)],
      // les classes de charge sont TOUJOURS posées (elles portent encore la bordure) : c'est
      // bien le FOND qui doit être uniforme, pas la classe qui doit disparaître.
      charges: [...new Set(gd.map((g) => (g.className.match(/\b(dur|facile|recup|off)\b/) || [])[0] || "—"))],
    };
  });
  ok(m.charges.length >= 3, "la semaine mélange bien plusieurs charges (" + m.charges.join("/") + ")");
  ok(m.distincts.length === 1,
    "…et toutes les cartes ont le MÊME fond, quelle que soit la charge (" + m.distincts.join(" | ") + ")");
}

// ─────────── §3 · Le badge porte la couleur, et se voit ───────────
{
  const m = await page.evaluate(() => {
    const px = (s) => { const x = String(s).match(/rgba?\(([^)]+)\)/); if (!x) return null;
      const p = x[1].split(",").map((v) => parseFloat(v)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
    const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
    const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
      return Math.round((hi + 0.05) / (lo + 0.05) * 100) / 100; };
    const vus = new Map();
    for (const el of document.querySelectorAll("#screen .gd-ic")) {
      const carte = px(getComputedStyle(el.closest(".gd")).backgroundColor);
      const fond = px(getComputedStyle(el).backgroundColor);
      const r = el.getBoundingClientRect();
      vus.set(el.textContent, {
        ic: el.textContent, w: Math.round(r.width), h: Math.round(r.height),
        cache: el.getAttribute("aria-hidden") === "true",
        contraste: fond ? ratio(over(fond, carte), carte) : 0,
      });
    }
    return { badges: [...vus.values()], couleurs: new Set([...document.querySelectorAll("#screen .gd-ic")].map((e) => getComputedStyle(e).backgroundColor)).size };
  });
  ok(m.badges.length >= 3, "plusieurs disciplines sont représentées (" + m.badges.map((b) => b.ic).join(" ") + ")");
  ok(m.couleurs >= 3, "…chacune a SA couleur, ce n'est pas un badge unique (" + m.couleurs + " teintes)");
  const faibles = m.badges.filter((b) => b.contraste < 3);
  // WCAG 1.4.11 : 3:1 pour un composant d'interface qui porte de l'information. Ce badge est la
  // SEULE couleur de la ligne et c'est lui qui dit la discipline — il tombe donc sous ce critère.
  ok(faibles.length === 0, "…et chacune se voit sur le fond sombre, ≥ 3:1 ("
    + m.badges.map((b) => b.ic + " " + b.contraste).join(" · ") + ")");
  ok(m.badges.every((b) => b.cache),
    "…le badge est une illustration : la discipline est déjà dans le nom de la séance (aria-hidden)");
}

// ─────────── §4 · La bascule est un état LOCAL ───────────
// « pas un re-fetch de données » (brief) : ouvrir une séance ne doit ni redessiner l'onglet ni
// perdre ce qui a été coché. On coche AVANT d'ouvrir, et on vérifie que la coche survit.
{
  const avant = await page.evaluate(() => {
    const b = document.querySelector("#screen .doneBtn");
    if (b) b.click();
    return document.querySelectorAll("#screen .doneBtn.done").length;
  });
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const d = document.querySelector("#screen details.gd-sess");
    const marqueur = Symbol ? null : null; // (pas de marqueur : on compare l'identité du nœud)
    const noeud = d;
    d.querySelector("summary").click();
    return { ouvert: d.open, memeNoeud: document.querySelector("#screen details.gd-sess") === noeud,
             coches: document.querySelectorAll("#screen .doneBtn.done").length };
  });
  ok(avant >= 1, "une séance a bien été cochée avant l'ouverture (" + avant + ")");
  ok(m.ouvert, "…taper le résumé ouvre le détail");
  ok(m.memeNoeud, "…sans redessiner la grille (le nœud du <details> est le même)");
  ok(m.coches === avant, "…et la coche survit à l'ouverture (" + m.coches + "/" + avant + ")");
}

// ─────────── §5 · L'onglet Plan porte la même carte ───────────
// R16.9 : « un seul dessin, deux points de vue ». La grille de Plan vit derrière son bouton
// (U15) — on l'ouvre, et on exige exactement les mêmes propriétés qu'en Semaine.
await ouvrirOnglet("general");
{
  const m = await page.evaluate(() => {
    const b = document.getElementById("allW");
    if (b) b.click();
    const gd = [...document.querySelectorAll("#screen .gd")];
    return {
      n: gd.length,
      ouverts: [...document.querySelectorAll("#screen details.gd-sess")].filter((d) => d.open).length,
      fonds: [...new Set(gd.map((g) => getComputedStyle(g).backgroundColor))].length,
      badges: document.querySelectorAll("#screen .gd-ic").length,
    };
  });
  ok(m.n > 0, "l'onglet Plan expose bien la grille une fois dépliée (" + m.n + " jours)");
  ok(m.ouverts === 0, "…séances repliées là aussi (" + m.ouverts + ")");
  ok(m.fonds === 1, "…fond uniforme là aussi (" + m.fonds + " teinte)");
  ok(m.badges > 0, "…et les badges de discipline y sont (" + m.badges + ")");
}

ok(errs.length === 0, "aucune erreur JS (" + errs.length + (errs.length ? " — " + errs[0] : "") + ")");
await browser.close();
server.close();
process.exit(report());
