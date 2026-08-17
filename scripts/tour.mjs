// Traversée de la PWA comme un vrai utilisateur sur téléphone.
// On ne teste rien : on OBSERVE, on compte, on photographie. Le rapport sort à la fin.
import { startServer, launchBrowser } from "../tests/e2e/harness.mjs";

const PORT = 8801;
const OUT = "/tmp/claude-0/-home-user-Coach/073a578c-a7ad-5eea-88e5-b1b8cc7b29f0/scratchpad/tour";
const server = await startServer(PORT);
const browser = await launchBrowser();

const notes = [];
const note = (ou, quoi) => { notes.push({ ou, quoi }); console.log("· [" + ou + "] " + quoi); };

const REPONSES = {
  intent: "competition", level: "inter", history: "confirme", injury: "aucune",
  dispo: "partielle", doubles: "parfois", off_days: "non", shift_ok: "non",
  sleep: "moyen", life_load: "normale", activity: "actif", sex: "H",
  med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "non",
  terrain: "plat", milieu: "bassin", swim_limit: "technique",
  ftp_known: "oui", pace_known: "oui", css_known: "oui",
  leg_swim_env: "lac", leg_bike_prof: "plat", leg_run_prof: "plat",
};
const SAISIES = {
  age: "35", weight: "78", height: "180", vol_max: "10", vol_recent: "7", sessions_max: "6",
  ftp: "230", pace: "4:50", css: "2:00", water_temp_c: "19",
};

const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR",
  isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });

const t0 = Date.now();
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);
note("démarrage", "premier écran affiché en " + (Date.now() - t0) + " ms");
await page.screenshot({ path: OUT + "-00-accueil.png" });

// — Ce que voit quelqu'un qui arrive : y a-t-il de quoi comprendre où il met les pieds ?
const accueil = await page.evaluate(() => ({
  texte: (document.body.innerText || "").slice(0, 600),
  cartes: [...document.querySelectorAll(".sport-card")].map((c) => c.innerText.replace(/\s+/g, " ").trim()),
}));
note("accueil", accueil.cartes.length + " sports proposés : " + accueil.cartes.join(" · "));

await page.click('.sport-card[data-sport="tri"]');
await page.waitForTimeout(300);

// — Le questionnaire, étape par étape : combien d'écrans, combien de gestes, qu'est-ce qui bloque
let etapes = 0, gestes = 1, bloque = null;
const journal = [];
for (; etapes < 30; etapes++) {
  const avant = await page.evaluate(() => {
    const s = document.getElementById("screen");
    const titre = (s.querySelector("h1,h2,.q,.step-title") || {}).innerText || "";
    return {
      titre: String(titre).replace(/\s+/g, " ").trim().slice(0, 90),
      nOpts: s.querySelectorAll(".opts[data-key]").length,
      nChamps: s.querySelectorAll("[data-input]").length,
      motsEcran: (s.innerText || "").split(/\s+/).filter(Boolean).length,
      hauteur: s.scrollHeight,
    };
  });
  if (etapes < 3 || etapes === 5) await page.screenshot({ path: OUT + "-q" + String(etapes + 1).padStart(2, "0") + ".png" });

  const g = await page.evaluate(async ({ r, s }) => {
    const attendre = (ms) => new Promise((res) => setTimeout(res, ms));
    let n = 0;
    for (const grp of document.querySelectorAll(".opts[data-key]")) {
      if (grp.querySelector(".opt.sel")) continue;
      const cle = grp.dataset.key;
      const pref = cle === "format" ? "70.3" : r[cle];
      const b = (pref && grp.querySelector('.opt[data-val="' + pref + '"]')) || grp.querySelector(".opt");
      if (b) { b.click(); n++; await attendre(30); }
    }
    for (const i of document.querySelectorAll("[data-input]")) {
      if (i.value) continue;
      let v = s[i.dataset.input];
      if (v == null) {
        if (i.type === "date") v = new Date(Date.now() + 300 * 864e5).toISOString().slice(0, 10);
        else if (i.type === "number") { const lo = parseFloat(i.min), hi = parseFloat(i.max); v = String(isFinite(lo) && isFinite(hi) ? Math.round((lo + hi) / 2) : 10); }
        else v = "10";
      }
      i.value = v;
      i.dispatchEvent(new Event("input", { bubbles: true }));
      i.dispatchEvent(new Event("change", { bubbles: true }));
      n++;
      await attendre(30);
    }
    return n;
  }, { r: REPONSES, s: SAISIES });
  gestes += g;
  journal.push({ n: etapes + 1, ...avant, gestes: g });
  await page.waitForTimeout(200);

  if (await page.locator("#genBtn").count()) { await page.click("#genBtn"); gestes++; break; }
  const next = page.locator("#nextBtn");
  if (!(await next.count())) { bloque = "ni suivant ni générer"; break; }
  if (!(await next.isEnabled())) { bloque = "suivant désactivé à l'étape " + (etapes + 1); break; }
  await next.click(); gestes++;
  await page.waitForTimeout(200);
}
const tPlan = Date.now() - t0;
await page.waitForTimeout(1200);

note("questionnaire", (etapes + 1) + " écrans, " + gestes + " gestes, plan généré en " + Math.round(tPlan / 1000) + " s" + (bloque ? " — BLOQUÉ : " + bloque : ""));
for (const e of journal) note("  écran " + e.n, '"' + e.titre + '" — ' + e.nOpts + " questions, " + e.nChamps + " champs, " + e.motsEcran + " mots, " + e.hauteur + " px de haut");

// — L'app après génération : sur quel onglet arrive-t-on, et que voit-on ?
const apres = await page.evaluate(() => ({
  onglets: [...document.querySelectorAll("#ebTabbar .tabbtn")].map((b) => b.innerText.replace(/\s+/g, " ").trim()),
  actif: (document.querySelector("#ebTabbar .tabbtn.on, #ebTabbar .tabbtn.sel, #ebTabbar .tabbtn[aria-current]") || {}).innerText || "?",
  premiersMots: (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 300),
}));
note("après génération", "onglets : " + apres.onglets.join(" | "));
note("après génération", "onglet actif : " + String(apres.actif).replace(/\s+/g, " ").trim());
note("après génération", "ce qu'on lit en haut : " + apres.premiersMots.slice(0, 220));
await page.screenshot({ path: OUT + "-10-apres-generation.png" });
await page.screenshot({ path: OUT + "-10-apres-generation-full.png", fullPage: true });

// — Mesures d'ergonomie sur l'écran d'arrivée
const ergo = async (nom) => {
  const m = await page.evaluate(() => {
    const petits = [];
    const CIBLE = 44; // recommandation Apple/WCAG 2.5.8 (24 px minimum, 44 confortable)
    for (const el of document.querySelectorAll('button, a, .opt, .tabbtn, summary, [role="button"], input[type=checkbox]')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.height < CIBLE || r.width < CIBLE) {
        petits.push({ t: (el.innerText || el.getAttribute("aria-label") || el.tagName).replace(/\s+/g, " ").trim().slice(0, 34), w: Math.round(r.width), h: Math.round(r.height) });
      }
    }
    let minPx = 99, minTxt = "";
    for (const el of document.querySelectorAll("*")) {
      const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (!direct) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs > 0 && fs < minPx) { minPx = fs; minTxt = el.textContent.replace(/\s+/g, " ").trim().slice(0, 40); }
    }
    return {
      debord: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      hauteur: document.documentElement.scrollHeight,
      petits: petits.slice(0, 12),
      nPetits: petits.length,
      minPx: Math.round(minPx * 10) / 10, minTxt,
    };
  });
  note(nom, "débordement horizontal " + m.debord + " px · page de " + m.hauteur + " px · " + m.nPetits + " cibles tactiles sous 44 px · plus petit texte " + m.minPx + " px (« " + m.minTxt + " »)");
  if (m.petits.length) note(nom, "  cibles étroites : " + m.petits.map((p) => '"' + p.t + '" ' + p.w + "×" + p.h).join(" · "));
  return m;
};
await ergo("ergonomie · Aujourd'hui");

// — Le check-in du matin : combien d'écrans avant de voir sa séance ?
const checkin = await page.evaluate(() => {
  const t = (document.body.innerText || "");
  return { present: /point du matin|sommeil|comment tu te sens|ressenti/i.test(t), extrait: t.replace(/\s+/g, " ").slice(0, 260) };
});
note("check-in", checkin.present ? "le diaporama du matin est bien la porte d'entrée" : "AUCUN check-in visible à l'arrivée — la séance est-elle donnée sans rien demander ?");

// On répond au check-in en cliquant ce qui se présente, écran après écran.
let ecransCheckin = 0;
for (let i = 0; i < 8; i++) {
  const fait = await page.evaluate(async () => {
    const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
    const grp = [...document.querySelectorAll(".opts[data-key]")].find((g) => !g.querySelector(".opt.sel"));
    if (grp) { const o = grp.querySelectorAll(".opt"); (o[Math.floor(o.length / 2)] || o[0]).click(); await attendre(60); return "option"; }
    const b = [...document.querySelectorAll("button")].find((x) => /continuer|suivant|c'est parti|valider|ok|passer/i.test(x.innerText) && x.offsetParent);
    if (b) { b.click(); await attendre(60); return "bouton"; }
    return null;
  });
  if (!fait) break;
  ecransCheckin++;
  await page.waitForTimeout(300);
}
note("check-in", ecransCheckin + " gestes pour le traverser");
await page.waitForTimeout(500);
await page.screenshot({ path: OUT + "-20-aujourdhui.png" });
await page.screenshot({ path: OUT + "-20-aujourdhui-full.png", fullPage: true });
await ergo("ergonomie · Aujourd'hui (après check-in)");

// — Chaque onglet : ce qu'on y voit, ce qui déborde
const onglets = await page.evaluate(() => [...document.querySelectorAll("#ebTabbar .tabbtn")].map((b, i) => ({ i, t: b.innerText.replace(/\s+/g, " ").trim() })));
for (const o of onglets) {
  await page.evaluate((i) => document.querySelectorAll("#ebTabbar .tabbtn")[i].click(), o.i);
  await page.waitForTimeout(700);
  const nom = "onglet " + o.t;
  await page.screenshot({ path: OUT + "-30-" + o.i + "-" + o.t.replace(/[^a-zA-Zéèà]/g, "").toLowerCase() + ".png", fullPage: true });
  await ergo(nom);
  const contenu = await page.evaluate(() => ({
    mots: (document.body.innerText || "").split(/\s+/).filter(Boolean).length,
    titres: [...document.querySelectorAll("h1,h2,h3,.load-title,.card-title")].map((h) => h.innerText.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 14),
  }));
  note(nom, contenu.mots + " mots · sections : " + contenu.titres.join(" / "));
}

// — Écran étroit (iPhone SE) : le pire cas réel
const ctx2 = await browser.newContext({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, locale: "fr-FR", isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
const p2 = await ctx2.newPage();
await p2.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
await p2.waitForTimeout(900);
const etroit = await p2.evaluate(() => ({ debord: document.documentElement.scrollWidth - document.documentElement.clientWidth, tabbar: [...document.querySelectorAll("#ebTabbar .tabbtn")].map((b) => Math.round(b.getBoundingClientRect().width)) }));
note("320 px (iPhone SE)", "débordement " + etroit.debord + " px · largeur des onglets : " + etroit.tabbar.join(", ") + " px");
await p2.screenshot({ path: OUT + "-40-320px.png", fullPage: true });
await ctx2.close();

note("erreurs JS", errs.length ? errs.slice(0, 5).join(" | ") : "aucune sur toute la traversée");

console.log("\n───────── " + notes.length + " observations ─────────");
await browser.close();
server.close();
