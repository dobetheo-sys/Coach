// U1–U7 — LE PREMIER CONTACT, GARDÉ.
//
// Cette suite garde cinq corrections qui viennent d'une traversée de l'app comme utilisateur
// (RAPPORT_TOUR_USAGE.md), et non d'un banc du moteur. Elles ont un point commun : **aucun des
// 22 gates ne les regardait**, parce qu'ils mesurent tous ce que le moteur PRODUIT, jamais ce
// que la personne LIT ni ce qu'elle attend.
//
// Chaque critère assertе le comportement, jamais l'implémentation :
//   U1 — un plan créé à l'instant ne dit jamais « trois séances sont passées » (les 7 jours) ;
//   U2 — le nom du check-in suit l'heure, comme le salut le faisait déjà ;
//   U3 — le score d'audit ne s'affiche plus, les décisions du moteur restent ;
//   U4 — les cibles tactiles atteignent 24 px au minimum, zone ::after comprise ;
//   U7 — la séance apparaît sans attendre la météo.
//
// U1 est la raison d'être de cette suite : la fenêtre dépendait du JOUR DE LA SEMAINE, donc
// six jours sur sept un test l'aurait ratée. On balaie les sept, à date figée — même leçon que
// le banc R14 en R20.7.
import { startServer, launchBrowser, makeReporter } from "./harness.mjs";

const PORT = 8596;
const server = await startServer(PORT);
const { ok, report } = makeReporter();
const browser = await launchBrowser();

const REP = { intent: "competition", level: "inter", history: "confirme", injury: "aucune", dispo: "partielle", doubles: "parfois", off_days: "non", shift_ok: "non", sleep: "moyen", life_load: "normale", activity: "actif", sex: "H", med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "non", terrain: "plat", milieu: "bassin", swim_limit: "technique", ftp_known: "oui", pace_known: "oui", css_known: "oui", leg_swim_env: "lac", leg_bike_prof: "plat", leg_run_prof: "plat" };
const SAI = { age: "35", weight: "78", height: "180", vol_max: "10", vol_recent: "7", sessions_max: "6", ftp: "230", pace: "4:50", css: "2:00", water_temp_c: "19" };
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Une session complète : questionnaire traversé, plan généré, à une date FIGÉE. */
async function session(fauxMs) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", isMobile: true, hasTouch: true, timezoneId: "Europe/Paris" });
  await ctx.addInitScript(`(()=>{const F=${fauxMs};const d=F-Date.now();const R=Date;const D=function(...a){return a.length?new R(...a):new R(R.now()+d);};D.now=()=>R.now()+d;D.parse=R.parse;D.UTC=R.UTC;D.prototype=R.prototype;globalThis.Date=D;})()`);
  const page = await ctx.newPage();
  await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.click('.sport-card[data-sport="tri"]');
  await page.waitForTimeout(250);
  for (let i = 0; i < 30; i++) {
    await page.evaluate(async ({ r, s }) => {
      const a = (m) => new Promise((x) => setTimeout(x, m));
      for (const g of document.querySelectorAll(".opts[data-key]")) {
        if (g.querySelector(".opt.sel")) continue;
        const p = g.dataset.key === "format" ? "70.3" : r[g.dataset.key];
        const b = (p && g.querySelector('.opt[data-val="' + p + '"]')) || g.querySelector(".opt");
        if (b) { b.click(); await a(20); }
      }
      for (const inp of document.querySelectorAll("[data-input]")) {
        if (inp.value) continue;
        let v = s[inp.dataset.input];
        if (v == null) {
          if (inp.type === "date") v = new Date(Date.now() + 300 * 864e5).toISOString().slice(0, 10);
          else if (inp.type === "number") { const lo = parseFloat(inp.min), hi = parseFloat(inp.max); v = String(isFinite(lo) && isFinite(hi) ? Math.round((lo + hi) / 2) : 10); }
          else v = "10";
        }
        inp.value = v;
        inp.dispatchEvent(new Event("input", { bubbles: true }));
        inp.dispatchEvent(new Event("change", { bubbles: true }));
        await a(20);
      }
    }, { r: REP, s: SAI });
    await page.waitForTimeout(140);
    if (await page.locator("#genBtn").count()) { await page.click("#genBtn"); break; }
    const n = page.locator("#nextBtn");
    if (!(await n.count()) || !(await n.isEnabled())) break;
    await n.click();
    await page.waitForTimeout(140);
  }
  await page.waitForTimeout(1400);
  return { ctx, page };
}

/** Répond aux trois diapos et chronomètre l'apparition de la séance. */
async function passeCheckin(page) {
  for (let i = 0; i < 6; i++) {
    const n = await page.locator(".ck-opt").count();
    if (!n) break;
    await page.locator(".ck-opt").nth(Math.min(1, n - 1)).click();
    await page.waitForTimeout(320);
  }
  const t0 = Date.now();
  for (let i = 0; i < 80; i++) {
    if (!(await page.evaluate(() => /ta séance arrive/i.test(document.body.innerText || "")))) return Date.now() - t0;
    await page.waitForTimeout(120);
  }
  return null;
}

// ── U1 — les sept jours de la semaine, à moteur inchangé
const LUNDI = Date.UTC(2026, 7, 3, 14, 30, 0);
const declenche = [];
for (let k = 0; k < 7; k++) {
  const { ctx, page } = await session(LUNDI + k * 864e5);
  await passeCheckin(page);
  await page.waitForTimeout(500);
  if (await page.evaluate(() => /La vie a pris le dessus/.test(document.body.innerText || ""))) declenche.push(JOURS[new Date(LUNDI + k * 864e5).getUTCDay()]);
  await ctx.close();
}
ok(declenche.length === 0, "U1 — un plan créé à l'instant n'annonce aucune séance manquée, les 7 jours" + (declenche.length ? " (encore : " + declenche.join(", ") + ")" : ""));

// ── U1b — LE MIROIR, ET C'EST LA MOITIÉ QUI MANQUAIT.
//
// Le critère ci-dessus n'assertе que « la relance ne se déclenche pas ». Pris seul, il serait
// **satisfait en supprimant la fonctionnalité** : une garde qui ne vérifie qu'une absence ne
// garde rien. Trouvé en traversant la deuxième semaine — c'est exactement la forme des trois
// instruments démasqués en R20, appliquée à une garde que je venais d'écrire.
//
// Ici on décroche pour de VRAI : on crée le plan, on n'ouvre plus l'app pendant neuf jours, et
// la relance doit apparaître. Le message n'a d'intérêt que s'il arrive quand il le faut.
{
  const { ctx, page } = await session(LUNDI);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await ctx.close();
}
{
  // on rejoue la création au lundi, puis on saute au mardi de la semaine suivante
  const creation = await session(LUNDI);
  await passeCheckin(creation.page);
  const etat = await creation.ctx.storageState();
  await creation.ctx.close();

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", isMobile: true, hasTouch: true, timezoneId: "Europe/Paris", storageState: etat });
  await ctx.addInitScript(`(()=>{const F=${LUNDI + 9 * 864e5};const d=F-Date.now();const R=Date;const D=function(...a){return a.length?new R(...a):new R(R.now()+d);};D.now=()=>R.now()+d;D.parse=R.parse;D.UTC=R.UTC;D.prototype=R.prototype;globalThis.Date=D;})()`);
  const page = await ctx.newPage();
  await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await passeCheckin(page);
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => /La vie a pris le dessus/.test(document.body.innerText || "")),
     "U1b — après neuf jours sans rien faire, la relance se déclenche BIEN (le miroir d'U1)");
  await ctx.close();
}

// ── U8 — un jour de repos n'est pas une séance qui s'appelle « OFF »
{
  const { ctx, page } = await session(LUNDI); // 63 profils sur 63 démarrent par un lundi de repos
  await passeCheckin(page);
  await page.waitForTimeout(400);
  const t = await page.evaluate(() => document.body.innerText || "");
  ok(/Repos aujourd’hui/.test(t), "U8 — le jour de repos se lit « Repos aujourd'hui », pas « OFF »");
  ok(/Prochaine séance/.test(t), "U8 — et il annonce la prochaine séance (le message existait, il était mort)");
  await ctx.close();
}

// ── U2 — matin / journée / soir
for (const [h, attendu, interdit] of [[7, "point du matin", null], [14, "point du jour", "point du matin"], [21, "point du soir", "point du matin"]]) {
  const { ctx, page } = await session(Date.UTC(2026, 7, 4, h - 2, 0, 0)); // Paris = UTC+2 en août
  const txt = await page.evaluate(() => (document.body.innerText || "").toLowerCase());
  ok(txt.includes(attendu) && (!interdit || !txt.includes(interdit)), "U2 — à " + h + " h, le check-in s'appelle « " + attendu + " »");
  await ctx.close();
}

// ── U3, U4, U7 — sur une seule session
{
  const { ctx, page } = await session(Date.UTC(2026, 7, 4, 8, 0, 0));
  const ms = await passeCheckin(page);
  // Le seuil garde le PRINCIPE (la séance n'attend pas la météo), pas une performance : avant
  // correction c'était 3 262 ms, bloqué sur le timeout de géolocalisation.
  ok(ms !== null && ms < 2000, "U7 — la séance apparaît sans attendre la météo (" + (ms === null ? "jamais" : ms + " ms") + ")");

  await page.evaluate(() => { const b = [...document.querySelectorAll("#ebTabbar .tabbtn")].find((x) => /Plan/.test(x.innerText)); if (b) b.click(); });
  await page.waitForTimeout(900);
  ok(!(await page.evaluate(() => /score d’audit|score d'audit/i.test(document.body.innerText || ""))), "U3 — le score d'audit n'est pas montré à l'athlète");
  ok(await page.evaluate(() => /décisions du moteur \(\d+\)/.test(document.body.innerText || "")), "U3 — les décisions du moteur restent affichées");

  await page.evaluate(() => { const b = [...document.querySelectorAll("#ebTabbar .tabbtn")].find((x) => /Semaine/.test(x.innerText)); if (b) b.click(); });
  await page.waitForTimeout(900);
  // La zone de toucher inclut le ::after qui déborde — c'est la technique déjà utilisée par la
  // coche, et c'est précisément ce que ma première mesure ne voyait pas (elle lisait le
  // rectangle du bouton seul et croyait à un défaut sur la coche).
  const cibles = await page.evaluate(() => {
    const zone = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el, "::after");
      if (cs.content && cs.content !== "none") {
        const p = (v) => Math.abs(parseFloat(v) || 0);
        return { w: r.width + p(cs.left) + p(cs.right), h: r.height + p(cs.top) + p(cs.bottom) };
      }
      return { w: r.width, h: r.height };
    };
    const out = {};
    for (const [cle, sel] of [["⇄", ".swapBtn"], ["○", ".doneBtn"]]) {
      const el = document.querySelector(sel);
      out[cle] = el ? zone(el) : null;
    }
    return out;
  });
  for (const [cle, z] of Object.entries(cibles))
    ok(!!z && z.w >= 24 && z.h >= 24, "U4 — la cible « " + cle + " » atteint le minimum tactile" + (z ? " (" + Math.round(z.w) + "×" + Math.round(z.h) + ")" : " — introuvable"));
  await ctx.close();
}

await browser.close();
server.close();
report();
