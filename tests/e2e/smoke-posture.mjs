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
  const hote = document.createElement("div");
  hote.id = "screen-probe"; document.body.appendChild(hote);
  // On force le cadre à une taille connue pour que la conversion écran→image soit vérifiable.
  hote.style.cssText = "position:fixed;left:0;top:0;width:390px;height:812px";
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
  hote.remove();
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
  const hote = document.createElement("div"); document.body.appendChild(hote);
  ouvrirPointage({ hote, imageUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", etape: "pmh",
    titreRetour: "T", onTermine: () => {}, onAnnuler: () => {} });
  const t = hote.textContent; const seg = hote.querySelectorAll(".pt-prog i").length;
  hote.remove();
  return { t, seg, nPmh: ETAPES.pmh.points.length,
    hintMain: REPERES.main.hint, tousHints: Object.values(REPERES).every((r) => r.hint && r.titre) };
});
ok(consigne.seg === consigne.nPmh,
  "§7d — un segment de progression par point (" + consigne.seg + " pour " + consigne.nPmh + ")");
ok(consigne.t.includes("Point 1 · main") && consigne.t.includes(consigne.hintMain),
  "§7e — le repère anatomique est MONTRÉ pendant le geste (c'est le défaut que 2c corrige)");
ok(consigne.tousHints, "§7f — chaque repère porte son hint ET son titre court");

ok(errs.length === 0, "aucune erreur JS (" + errs.length + (errs.length ? " : " + errs[0] : "") + ")");

await browser.close();
server.close();
process.exit(report());
