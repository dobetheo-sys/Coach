// BILAN POSTURE — garde de l'écran 2a (🧰 Outils › 🚴 Position).
//
// CE QU'ELLE MESURE, ET POURQUOI CES PROPRIÉTÉS-LÀ. L'écran est recréé d'après une référence
// de design, donc la tentation est d'épingler des valeurs (un hex, un padding). Trois lots de
// ce dépôt ont déjà payé cette faute : un critère qui nomme une valeur rougit au premier
// changement de contenu et ne dit rien de ce qui compte. Les critères portent donc sur des
// PROPRIÉTÉS, et chacun PUBLIE ce qu'il trouve (règle 17) :
//   §1 le point d'entrée existe et est atteignable · §2 les trois états rendent trois écrans
//   DIFFÉRENTS (sinon la phase ne sert à rien) · §3 aucune couleur en dur : tout descend des
//   jetons (témoin : changer un jeton à chaud repeint l'écran) · §4 les cibles tactiles
//   tiennent le gabarit U4 · §5 aucun texte sous le seuil AA, sur les deux fonds.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

const PORT = 8607;
const server = await startServer(PORT);
const { ok, report } = makeReporter();
const browser = await launchBrowser();
const errs = [];
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })).newPage();
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, runnerStateV1());
await page.reload({ waitUntil: "networkidle" });

/** Pose un état de bilan puis rend l'écran. `null` = aucun bilan. */
async function rendre(session, history) {
  return page.evaluate(async ({ session, history }) => {
    const { S } = await import("./js/state.js");
    S.answers.posture = { session, history: history || [] };
    const { renderTabPosture } = await import("./js/ui/tab-posture.js");
    renderTabPosture();
    const sc = document.querySelector("#screen");
    return { texte: sc.textContent, html: sc.innerHTML };
  }, { session, history });
}

const essai = (h, r, d, hip) => ({
  deltas: { saddleHeightMm: h, reachMm: r, dropMm: d },
  angles: { hip: { mean: hip }, trunk: { mean: 11 }, knee: { mean: 142 } },
});

// ── §1 — LE POINT D'ENTRÉE. Le handoff demande « un outil de l'app, pas une app dans
// l'app » : la pilule vit dans la rangée existante, à côté de Nutrition et Éducatifs.
await page.evaluate(async () => {
  const { setTab } = await import("./js/ui/tabs.js"); setTab("outils");
});
await page.waitForTimeout(400);
const pilules = await page.evaluate(() =>
  [...document.querySelectorAll("[data-subtool]")].map((b) => b.dataset.subtool));
ok(pilules.includes("position"),
  "§1 — la pilule « Position » est dans la rangée des sous-outils (" + pilules.join(" · ") + ")");
await page.evaluate(() => {
  const b = document.querySelector('[data-subtool="position"]'); if (b) b.click();
});
await page.waitForTimeout(400);
const arrive = await page.evaluate(() => (document.querySelector("#screen").textContent || ""));
ok(/Position aéro/.test(arrive), "§1 — le clic mène bien à l'écran du bilan");

// ── §2 — LES TROIS ÉTATS. Ils doivent rendre trois écrans DIFFÉRENTS : si deux d'entre eux
// se ressemblent, la phase ne sert à rien et le chiffre ment.
const vide = await rendre(null);
const encours = await rendre({ updatedAt: "2026-08-28", aslrAngle: 74, aslrTestedAt: "2026-08-24",
  profile: { goal: "aéro" }, trials: [essai(745, 480, 130, 44), essai(750, 480, 145, 41)] });
const termine = await rendre({ updatedAt: "2026-08-30", aslrAngle: 74,
  trials: [essai(745, 480, 130, 44), essai(750, 480, 145, 41), essai(752, 485, 150, 39)] },
[{ date: "2026-07-04" }, { date: "2026-05-02" }]);

ok(/Commencer le bilan/.test(vide.texte) && !/\/ 3 essais/.test(vide.texte),
  "§2a — aucun bilan : on invite, et on n'affiche PAS « 0 / 3 » (ne rien reprocher — U1)");
ok(/Reprendre · essai 3/.test(encours.texte) && /2\s*\/ 3 essais/.test(encours.texte),
  "§2b — bilan en cours : le CTA nomme l'essai suivant et le chiffre dit où on en est");
ok(/Voir le résultat/.test(termine.texte) && /Bilan terminé/.test(termine.texte),
  "§2c — bilan terminé : le CTA change, l'eyebrow aussi");
ok(new Set([vide.texte, encours.texte, termine.texte]).size === 3,
  "§2d — les trois états rendent trois écrans distincts");
// La section « Tes essais » n'apparaît que s'il y en a — un creux vide occupe un écran pour
// dire qu'il n'a rien à dire.
ok(!/Tes essais/.test(vide.texte) && /Tes essais/.test(encours.texte),
  "§2e — le creux des essais n'existe que quand il y a des essais");
// Les angles descendent de la session, jamais d'un littéral : on change une valeur, l'écran suit.
ok(/hanche 44°/.test(encours.texte) && /hanche 41°/.test(encours.texte),
  "§2f — les angles affichés viennent de la session (témoin : deux essais, deux valeurs)");

// ── §3 — AUCUNE COULEUR EN DUR. Le témoin est le seul critère qui prouve la DESCENDANCE :
// on change le jeton à chaud, et l'écran doit se repeindre. Un critère qui se contente de
// lire la couleur rendue serait satisfait par un hex écrit à la main.
const descend = await page.evaluate(() => {
  const el = document.querySelector("#screen .po-hero");
  const avant = getComputedStyle(el).backgroundColor;
  document.body.style.setProperty("--zn-orange", "rgb(1, 2, 3)");
  const apres = getComputedStyle(el).backgroundColor;
  document.body.style.removeProperty("--zn-orange");
  return { avant, apres };
});
ok(descend.apres === "rgb(1, 2, 3)" && descend.avant !== descend.apres,
  "§3 — la carte en relief descend de `--zn-orange` (" + descend.avant + " → " + descend.apres + ")");

// ── §4 — CIBLES TACTILES. U4 a tranché 44 px pour ce dépôt ; le CTA principal fait 52 par
// dessein, les lignes de liste 56. On mesure le rectangle RENDU, pas la règle CSS.
const cibles = await page.evaluate(() => {
  const h = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : -1; };
  return { cta: h(".po-cta"), ligne: h(".po-ligne") };
});
ok(cibles.cta >= 44 && cibles.ligne >= 44,
  "§4 — cibles tactiles au gabarit U4 (CTA " + cibles.cta + "px · ligne " + cibles.ligne + "px)");

// ── §5 — CONTRASTE. Le gris de la référence (#6d737a) mesure 4,38:1 sur le fond et 3,88 sur
// la surface : SOUS le seuil AA, sur un texte de 9 px en capitales. Il a été éclairci ; ce
// critère est ce qui empêche de le remettre. Mesuré sur le texte RENDU, tous éléments.
const sousAA = await page.evaluate(() => {
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  const fondDe = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const b = getComputedStyle(n).backgroundColor;
      const a = (b.match(/[\d.]+/g) || [])[3];
      if (b && b !== "rgba(0, 0, 0, 0)" && a !== "0") return rgb(b);
    }
    return [0, 0, 0];
  };
  const out = [];
  for (const el of document.querySelectorAll("#screen *")) {
    const t = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join("");
    if (!t) continue;
    const cs = getComputedStyle(el);
    const f = lum(rgb(cs.color)), b = lum(fondDe(el));
    const ratio = (Math.max(f, b) + .05) / (Math.min(f, b) + .05);
    if (ratio < 4.5) out.push(t.slice(0, 28) + " (" + ratio.toFixed(2) + ":1, " + cs.fontSize + ")");
  }
  return out;
});
ok(sousAA.length === 0, "§5 — aucun texte sous le seuil AA" + (sousAA.length ? " — " + sousAA.join(" | ") : ""));

// ── §6 — 2b, LE PRÉPARATIF. Sa règle est écrite dans le handoff : « le bouton n'est jamais
// désactivé ici — cocher est une aide, pas une condition ». Le critère porte donc sur les DEUX
// moitiés : le bouton agit toujours, ET ce qui manque est dit.
await rendre(null);
await page.evaluate(() => document.querySelector("#poCta").click());
await page.waitForTimeout(200);
const prep = await page.evaluate(() => {
  const c = [...document.querySelectorAll("[data-coche]")];
  const cta = document.querySelector("#poCta2");
  return { cases: c.length, coches: c.filter((b) => b.getAttribute("aria-pressed") === "true").length,
    ctaActif: !!cta && !cta.disabled, note: (cta && cta.nextElementSibling.textContent) || "",
    modes: [...document.querySelectorAll("[data-mode]")].map((b) => b.dataset.mode) };
});
ok(prep.cases === 5, "§6a — cinq lignes à cocher (" + prep.cases + ")");
ok(prep.ctaActif && /5 cases non cochées/.test(prep.note),
  "§6b — le CTA n'est PAS désactivé, et ce qui manque est écrit : « " + prep.note.trim() + " »");
ok(prep.modes.join() === "beginner,expert", "§6c — les deux modes de guidage sont proposés");

// La ligne d'état se DÉRIVE des cases : on en coche deux, elle doit dire trois. Un texte figé
// passerait le critère précédent et mentirait à la première coche.
const apres2 = await page.evaluate(() => {
  document.querySelector('[data-coche="0"]').click();
  document.querySelector('[data-coche="1"]').click();
  return { presse: document.querySelectorAll('[data-coche][aria-pressed="true"]').length,
    note: document.querySelector("#poCta2").nextElementSibling.textContent };
});
ok(apres2.presse === 2 && /3 cases non cochées/.test(apres2.note),
  "§6d — la ligne d'état se dérive des cases (2 cochées → « " + apres2.note.trim() + " »)");

// Le mode est PERSISTÉ (il pilote le pointage à chaque essai), la checklist ne l'est pas
// (elle prépare une séance, elle ne décrit pas l'athlète).
const persist = await page.evaluate(async () => {
  document.querySelector('[data-mode="expert"]').click();
  const { S } = await import("./js/state.js");
  return { mode: S.answers.posture.guidanceMode, checklist: "preparationChecklist" in S.answers.posture };
});
ok(persist.mode === "expert" && !persist.checklist,
  "§6e — le mode de guidage est persisté, la checklist non (mode=" + persist.mode + ")");

// ── §7 — 2c, LE POINTAGE. Le critère qui compte est GÉOMÉTRIQUE, et il vise une faute précise :
// stocker les points en 0..1 (le réflexe) déforme tout angle dès que l'image n'est pas carrée,
// parce qu'un angle est un rapport entre dx et dy et que les diviser par des nombres différents
// change ce rapport. On pointe donc sur une image 400×200 une figure dont l'angle est connu.
const geo = await page.evaluate(async () => {
  const { ouvrirPointage } = await import("./js/ui/posture-pointage.js");
  // 400×200 — délibérément PAS carrée : c'est ce qui sépare les pixels des 0..1.
  const cv = document.createElement("canvas"); cv.width = 400; cv.height = 200;
  const cx = cv.getContext("2d"); cx.fillStyle = "#333"; cx.fillRect(0, 0, 400, 200);
  const url = cv.toDataURL();
  // ⚠ LA SONDE REND DANS LE VRAI `#screen`. Tout le CSS du module est scopé
  // `body.theme-zenna #screen .pt-*` : un `<div>` détaché n'en reçoit RIEN — ni le
  // `position:fixed` du cadre, ni le `inset:0` de l'image, ni le `position:relative` qui
  // ancre les marqueurs. Ma première écriture mesurait donc un écran sans styles, et rendait
  // « bandes de 0 px » sur une image 400×200 dans un cadre de 600 de haut.
  const hote = document.querySelector("#screen");
  let recu = null;
  const st = ouvrirPointage({ hote, imageUrl: url, etape: "aslr", titreRetour: "T",
    onTermine: (r) => { recu = r; }, onAnnuler: () => {} });
  await new Promise((r) => setTimeout(r, 300));
  // La figure est DIAGONALE, et ce n'est pas un détail : ma première écriture posait un angle
  // droit AXÉ (100,50 · 100,150 · 200,150), que la normalisation 0..1 laisse à 90° — le test
  // était satisfait par le défaut même qu'il annonce (règle 19 : quel est le correctif le
  // moins coûteux qui le ferait passer ?). Mesuré sur cette figure-ci : 116,57° en pixels
  // contre 104,04° en 0..1, douze degrés d'écart.
  st.poses = [{ x: 100, y: 40 }, { x: 150, y: 140 }, { x: 300, y: 140 }];
  hote.querySelector(".pt-valider").disabled = false;
  hote.querySelector(".pt-valider").click();
  const out = { recu, moteur: !!(globalThis.EBV2 && globalThis.EBV2.postureAngles) };
  hote.innerHTML = "";
  return out;
});
ok(geo.moteur, "§7a — le moteur porté est exposé au produit (`EBV2.postureAngles`)");
ok(geo.recu && geo.recu.angles && Math.abs(geo.recu.angles.kneeAngle - 116.6) < 0.15,
  "§7b — l'angle est calculé PAR LE MOTEUR, en pixels d'image : genou = "
  + (geo.recu && geo.recu.angles ? geo.recu.angles.kneeAngle : "?")
  + "° (attendu 116,6 sur une image 400×200 — des coordonnées 0..1 rendraient 104,0)");
ok(geo.recu && geo.recu.points && geo.recu.points.length === 3,
  "§7c — les points bruts sont rendus avec les angles (relecture et correction en dépendent)");

// Les repères anatomiques sont MONTRÉS pendant le geste — c'est le défaut que 2c corrige.
const consigne = await page.evaluate(async () => {
  const { REPERES, ETAPES } = await import("./js/ui/posture-repere.js");
  const { ouvrirPointage } = await import("./js/ui/posture-pointage.js");
  const hote = document.querySelector("#screen");
  ouvrirPointage({ hote, imageUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", etape: "pmh",
    titreRetour: "T", onTermine: () => {}, onAnnuler: () => {} });
  const t = hote.textContent; const seg = hote.querySelectorAll(".pt-prog i").length;
  hote.innerHTML = "";
  return { t, seg, nPmh: ETAPES.pmh.points.length,
    hintMain: REPERES.main.hint, tousHints: Object.values(REPERES).every((r) => r.hint && r.titre) };
});
ok(consigne.seg === consigne.nPmh,
  "§7d — un segment de progression par point (" + consigne.seg + " pour " + consigne.nPmh + ")");
ok(consigne.t.includes("Point 1 · main") && consigne.t.includes(consigne.hintMain),
  "§7e — le repère anatomique est MONTRÉ pendant le geste (c'est le défaut que 2c corrige)");
ok(consigne.tousHints, "§7f — chaque repère porte son hint ET son titre court");

// ── §7g — LE VRAI CHEMIN DU DOIGT. §7b pose les points directement : il mesure le moteur et
// la plomberie qui y mène, PAS la conversion écran → image. Sa contre-preuve est sortie VERTE
// quand j'ai normalisé les coordonnées en 0..1 — le critère annonçait la faute et ne pouvait
// pas la voir. Celui-ci passe par des vrais `pointerdown`/`pointerup` à des positions ÉCRAN
// connues, et vérifie ce qui atterrit dans `st.poses`.
//
// Il vise DEUX fautes à la fois, et la seconde est celle que la première contre-preuve a fait
// sortir de l'ombre : `object-fit: contain` met l'image à l'échelle DANS son élément et la
// CENTRE. Sur un cadre de 362 × 600 et une image 400 × 200, l'image peinte fait 362 × 181 et
// il reste 210 px de vide en haut et en bas. Une conversion qui divise par la hauteur de
// l'ÉLÉMENT est juste au CENTRE — où les deux repères coïncident — et fausse partout ailleurs.
// D'où un tap DÉCENTRÉ : au centre, les deux implémentations donnent le même résultat.
const chemin = await page.evaluate(async () => {
  const { ouvrirPointage } = await import("./js/ui/posture-pointage.js");
  const cv = document.createElement("canvas"); cv.width = 400; cv.height = 200;
  const cx = cv.getContext("2d"); cx.fillStyle = "#333"; cx.fillRect(0, 0, 400, 200);
  const url = cv.toDataURL();
  const hote = document.querySelector("#screen");
  const st = ouvrirPointage({ hote, imageUrl: url, etape: "aslr", titreRetour: "T",
    onTermine: () => {}, onAnnuler: () => {} });
  await new Promise((r) => setTimeout(r, 400));
  const scene = hote.querySelector(".pt-scene");
  const img = hote.querySelector(".pt-img");
  const ri = img.getBoundingClientRect();
  // La boîte réellement peinte, calculée ICI par une seconde implémentation : si le module et
  // le critère se trompaient de la même façon, le critère serait vacueux.
  const k = Math.min(ri.width / 400, ri.height / 200);
  const pw = 400 * k, ph = 200 * k;
  const bx = ri.left + (ri.width - pw) / 2, by = ri.top + (ri.height - ph) / 2;
  // Cible : le point (300, 40) de l'image — franchement décentré sur les DEUX axes.
  const cible = { x: 300, y: 40 };
  const cx2 = bx + (cible.x / 400) * pw, cy2 = by + (cible.y / 200) * ph;
  const ev = (t) => scene.dispatchEvent(new PointerEvent(t, { clientX: cx2, clientY: cy2,
    bubbles: true, pointerId: 1, isPrimary: true, pointerType: "mouse" }));
  ev("pointerdown"); ev("pointerup");
  const pose = st.poses[0] || null;
  // Où le marqueur a-t-il ATTERRI à l'écran ? La pose et son rendu doivent se retrouver.
  const m = hote.querySelector(".pt-pt");
  const rm = m ? m.getBoundingClientRect() : null;
  const out = { pose, cible, ecranAttendu: { x: cx2, y: cy2 },
    ecranRendu: rm ? { x: rm.left + rm.width / 2, y: rm.top + rm.height / 2 } : null,
    bandes: ((ri.height - ph) / 2).toFixed(0) };
  hote.innerHTML = "";
  return out;
});
const dp = chemin.pose
  ? Math.hypot(chemin.pose.x - chemin.cible.x, chemin.pose.y - chemin.cible.y) : 999;
ok(dp < 2, "§7g — un tap à l'écran atterrit au BON pixel d'image : visé ("
  + chemin.cible.x + "," + chemin.cible.y + ") · obtenu ("
  + (chemin.pose ? chemin.pose.x.toFixed(1) + "," + chemin.pose.y.toFixed(1) : "aucun")
  + "), écart " + dp.toFixed(2) + "px — bandes `contain` de " + chemin.bandes + "px");
const dr = chemin.ecranRendu
  ? Math.hypot(chemin.ecranRendu.x - chemin.ecranAttendu.x, chemin.ecranRendu.y - chemin.ecranAttendu.y) : 999;
ok(dr < 2, "§7h — et le marqueur est REPEINT là où le doigt était (écart " + dr.toFixed(2)
  + "px) : la lecture et l'écriture partagent la même conversion");

// ── §8 — 2d, LES RÉGLAGES. Trois propriétés : les cotes du SCHÉMA ouvrent le même champ que
// les lignes (c'est la moitié de l'intérêt de l'écran), le CTA ne s'ouvre qu'une fois les
// obligatoires là ET dit lesquelles manquent, et les six avancés restent REPLIÉS.
const velo = await page.evaluate(async () => {
  const { ouvrirReglages, COTES, AVANCES } = await import("./js/ui/posture-velo.js");
  const hote = document.querySelector("#screen");
  let recu = null;
  ouvrirReglages({ hote, numero: 3, deltas: { saddleHeightMm: 750, dropMm: 145 },
    onEnregistrer: (d) => { recu = d; }, onRetour: () => {} });
  const cta = hote.querySelector("#pvSave");
  const avant = { desactive: cta.disabled, note: cta.nextElementSibling.textContent,
    cotesSchema: hote.querySelectorAll("[data-cote]").length,
    avancesReplies: !hote.querySelector(".pv-avances").open,
    nAvances: AVANCES.length, nCotes: COTES.length };
  // On touche la cote « reach » SUR LE SCHÉMA, pas la ligne : c'est le geste que l'écran vend.
  hote.querySelector('[data-cote="reachMm"]').dispatchEvent(new MouseEvent("click", { bubbles: true }));
  const champOuvert = !!hote.querySelector("#pvIn");
  const label = hote.querySelector(".pv-saisie label").textContent;
  hote.querySelector("#pvIn").value = "480";
  hote.querySelector(".pv-ok").click();
  const cta2 = hote.querySelector("#pvSave");
  const apres = { desactive: cta2.disabled, note: cta2.nextElementSibling.textContent };
  cta2.click();
  const out = { avant, apres, champOuvert, label, recu };
  hote.innerHTML = "";
  return out;
});
ok(velo.avant.cotesSchema === 4 && velo.avant.nCotes === 4,
  "§8a — les quatre cotes obligatoires sont sur le schéma ET dans la liste");
ok(velo.avant.desactive && /Il manque\s+reach/.test(velo.avant.note.replace(/\s+/g, " ")),
  "§8b — le CTA attend, et DIT ce qui manque : « " + velo.avant.note.trim() + " »");
ok(velo.champOuvert && /Reach/.test(velo.label),
  "§8c — toucher la cote SUR LE SCHÉMA ouvre le bon champ (« " + velo.label + " »)");
ok(!velo.apres.desactive && velo.recu && velo.recu.reachMm === 480,
  "§8d — une fois saisie, le CTA agit et rend la valeur (reach = "
  + (velo.recu ? velo.recu.reachMm : "?") + ")");
ok(velo.avant.avancesReplies && velo.avant.nAvances === 6,
  "§8e — les six réglages avancés restent REPLIÉS (§6g : ne pas les remonter dans le flux)");

// ── §9 — 2e, LE RÉSULTAT. Le critère central n'est pas cosmétique : le mot « marge d'erreur »
// est INTERDIT par le dépôt (§6c) — la fourchette est une sensibilité aux pondérations que la
// littérature ne tranche pas, et la confondre avec une précision de mesure est une faute de
// sens, pas de style.
const fixtureEssai = (id, hip, trunk, knee, wrist, sh, drop, pfsa) => ({
  id, deltas: { saddleHeightMm: sh, reachMm: 480, dropMm: drop, hasAeroBars: true },
  frontal: { pFSA_cm2: pfsa, athleteHeight_cm: 178, headOffset_cm: 0 },
  angles: { hip: { mean: hip, min: hip, max: hip, amplitude: 0, variance: 0 },
    trunk: { mean: trunk, min: trunk, max: trunk, amplitude: 0, variance: 0 },
    knee: { mean: knee, min: knee, max: knee, amplitude: 0, variance: 0 },
    ankle: { mean: 90, min: 90, max: 90, amplitude: 0, variance: 0 },
    shoulder: { mean: 90, min: 90, max: 90, amplitude: 0, variance: 0 },
    elbow: { mean: 95, min: 95, max: 95, amplitude: 0, variance: 0 },
    wrist: { mean: wrist, min: wrist, max: wrist, amplitude: 0, variance: 0 } },
});
const res = await page.evaluate(async (arg) => {
  const { ouvrirResultats } = await import("./js/ui/posture-resultats.js");
  const hote = document.querySelector("#screen");
  ouvrirResultats({ hote, trials: arg.trials,
    profile: { hipFlexibilityScore: 3, goal: "aero" },
    poids: { neck: 1, lowerBack: 1, hands: 1, knees: 1 }, onRetour: () => {} });
  const t = hote.textContent;
  const out = { t, plages: hote.querySelectorAll(".pr-plage").length,
    barres: hote.querySelectorAll(".pr-barre i").length,
    moteur: !!(globalThis.EBV2 && globalThis.EBV2.postureEngine) };
  hote.innerHTML = "";
  return out;
}, { trials: [fixtureEssai("01", 44, 11, 142, 8, 745, 130, 3400),
  fixtureEssai("02", 41, 8, 145, 12, 750, 145, 3200),
  fixtureEssai("03", 42, 6, 148, 19, 752, 160, 3050)] });
ok(res.moteur, "§9a — le SCORING du moteur porté est exposé (`EBV2.postureEngine`)");
ok(/Le meilleur compromis/.test(res.t) && res.plages === 2,
  "§9b — la position recommandée porte ses deux scores AVEC leur fourchette (" + res.plages + ")");
ok(/Confort max/.test(res.t) && /Aéro max/.test(res.t) && res.barres === 4,
  "§9c — les deux autres retenues sont là, deux barres chacune (" + res.barres + ")");
ok(!/marge d’erreur de mesure/.test(res.t.replace(/\s+/g, " ").replace("marge d'erreur", "marge d’erreur"))
  || /Ce n’est pas une marge d’erreur/.test(res.t),
  "§9d — le mot « marge d'erreur » n'apparaît QUE pour être nié (décision §6c du dépôt)");
ok(/sensibilité ±20 % sur les pondérations \[DEFAULT\]/.test(res.t),
  "§9e — la référence exacte est citée, pas reformulée");

// Sans photo de face, le score aéro n'a pas de matière : l'écran le DIT au lieu de le fabriquer.
const sansPhoto = await page.evaluate(async (arg) => {
  const { ouvrirResultats, aPFSA } = await import("./js/ui/posture-resultats.js");
  const hote = document.querySelector("#screen");
  ouvrirResultats({ hote, trials: arg.trials, profile: { hipFlexibilityScore: 3, goal: "aero" },
    poids: { neck: 1, lowerBack: 1, hands: 1, knees: 1 }, onRetour: () => {} });
  const out = { t: hote.textContent, detecte: arg.trials.filter((t) => !aPFSA(t)).length };
  hote.innerHTML = "";
  return out;
}, { trials: [fixtureEssai("01", 44, 11, 142, 8, 745, 130, 0),
  fixtureEssai("02", 41, 8, 145, 12, 750, 145, 0),
  fixtureEssai("03", 42, 6, 148, 19, 752, 160, 0)] });
// AUCUNE surface : le moteur REFUSE de classer, et c'est le correctif du lot — un `pFSA` à 0
// rendait 90, le meilleur score aéro possible, et l'essai jamais photographié remportait la
// recommandation. L'écran dit le refus au lieu d'afficher un classement fabriqué.
ok(sansPhoto.detecte === 3 && /l’aérodynamisme pas encore/.test(sansPhoto.t)
  && !/Le meilleur compromis/.test(sansPhoto.t),
  "§9f — aucune surface frontale : refus MOTIVÉ, et aucune position recommandée affichée");

// Une SEULE photo manquante ne fait pas échouer la session : l'essai est écarté du front aéro
// et publié comme tel. Le seuil est UN et non trois — relever la barre inventerait une
// politique que le handoff n'énonce pas.
const unSansPhoto = await page.evaluate(async (arg) => {
  const { ouvrirResultats } = await import("./js/ui/posture-resultats.js");
  const hote = document.querySelector("#screen");
  ouvrirResultats({ hote, trials: arg.trials, profile: { hipFlexibilityScore: 3, goal: "aero" },
    poids: { neck: 1, lowerBack: 1, hands: 1, knees: 1 }, onRetour: () => {} });
  const t = hote.textContent; hote.innerHTML = "";
  return { t, retenu03: /essai 03/.test(t) };
}, { trials: [fixtureEssai("01", 44, 11, 142, 8, 745, 130, 3400),
  fixtureEssai("02", 41, 8, 145, 12, 750, 145, 3200),
  fixtureEssai("03", 42, 6, 148, 19, 752, 160, 0)] });
ok(/Le meilleur compromis/.test(unSansPhoto.t) && /1 essai n’a pas de photo de face/.test(unSansPhoto.t)
  && /une surface absente n’est pas une surface nulle/.test(unSansPhoto.t),
  "§9h — une photo manquante : la comparaison a lieu, et l'essai écarté est NOMMÉ");
ok(!unSansPhoto.retenu03,
  "§9i — …et l'essai sans photo n'est retenu dans AUCUN profil (il rendait 90 avant le correctif)");

// Moins de trois essais valides : le moteur refuse, et l'écran recopie SA raison — avec la
// valeur mesurée et le seuil, ce que `formatViolation` fait déjà côté dépôt.
const pauvre = await page.evaluate(async (arg) => {
  const { ouvrirResultats } = await import("./js/ui/posture-resultats.js");
  const hote = document.querySelector("#screen");
  ouvrirResultats({ hote, trials: arg.trials, profile: { hipFlexibilityScore: 3, goal: "aero" },
    poids: { neck: 1, lowerBack: 1, hands: 1, knees: 1 }, onRetour: () => {} });
  const out = hote.textContent; hote.innerHTML = ""; return out;
}, { trials: [fixtureEssai("01", 44, 11, 142, 8, 745, 130, 3400)] });
ok(/minimum 3 requis/.test(pauvre),
  "§9g — moins de trois essais : le message du MOTEUR est recopié, pas résumé");

ok(errs.length === 0, "aucune erreur JS (" + errs.length + (errs.length ? " : " + errs[0] : "") + ")");

await browser.close();
server.close();
process.exit(report());
