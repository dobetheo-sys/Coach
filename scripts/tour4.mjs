// Un plan CRÉÉ AUJOURD'HUI accueille-t-il l'athlète par « trois séances sont passées » ?
// On fige la date du navigateur avant tout script, et on balaie les sept jours.
import { startServer, launchBrowser } from "../tests/e2e/harness.mjs";
const PORT = 8805;
const OUT = "/tmp/claude-0/-home-user-Coach/073a578c-a7ad-5eea-88e5-b1b8cc7b29f0/scratchpad/t4";
const server = await startServer(PORT);
const browser = await launchBrowser();

const REP = { intent: "competition", level: "inter", history: "confirme", injury: "aucune", dispo: "partielle", doubles: "parfois", off_days: "non", shift_ok: "non", sleep: "moyen", life_load: "normale", sex: "H", med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "non", terrain: "plat", milieu: "bassin", swim_limit: "technique", ftp_known: "oui", pace_known: "oui", css_known: "oui", leg_swim_env: "lac", leg_bike_prof: "plat", leg_run_prof: "plat" };
const SAI = { age: "35", weight: "78", height: "180", vol_max: "10", vol_recent: "7", sessions_max: "6", ftp: "230", pace: "4:50", css: "2:00", water_temp_c: "19" };
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

// 2026-08-03 est un lundi ; on balaie les sept jours qui suivent.
const BASE = Date.UTC(2026, 7, 3, 14, 30, 0);

const resultats = [];
for (let k = 0; k < 7; k++) {
  const faux = BASE + k * 864e5;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR", isMobile: true, hasTouch: true, timezoneId: "Europe/Paris" });
  await ctx.addInitScript(`(() => {
    const FIXE = ${faux};
    const delta = FIXE - Date.now();
    const R = Date;
    const D = function (...a) { return a.length ? new R(...a) : new R(R.now() + delta); };
    D.now = () => R.now() + delta;
    D.parse = R.parse; D.UTC = R.UTC; D.prototype = R.prototype;
    globalThis.Date = D;
  })()`);
  const page = await ctx.newPage();
  await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.click('.sport-card[data-sport="tri"]');
  await page.waitForTimeout(250);
  for (let i = 0; i < 30; i++) {
    await page.evaluate(async ({ r, s }) => {
      const a = (ms) => new Promise((x) => setTimeout(x, ms));
      for (const g of document.querySelectorAll(".opts[data-key]")) {
        if (g.querySelector(".opt.sel")) continue;
        const p = g.dataset.key === "format" ? "70.3" : r[g.dataset.key];
        const b = (p && g.querySelector('.opt[data-val="' + p + '"]')) || g.querySelector(".opt");
        if (b) { b.click(); await a(20); }
      }
      for (const inp of document.querySelectorAll("[data-input]")) {
        if (inp.value) continue;
        let v = s[inp.dataset.input];
        if (v == null) { if (inp.type === "date") v = new Date(Date.now() + 300 * 864e5).toISOString().slice(0, 10); else if (inp.type === "number") { const lo = parseFloat(inp.min), hi = parseFloat(inp.max); v = String(isFinite(lo) && isFinite(hi) ? Math.round((lo + hi) / 2) : 10); } else v = "10"; }
        inp.value = v; inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true })); await a(20);
      }
    }, { r: REP, s: SAI });
    await page.waitForTimeout(120);
    if (await page.locator("#genBtn").count()) { await page.click("#genBtn"); break; }
    const n = page.locator("#nextBtn");
    if (!(await n.count()) || !(await n.isEnabled())) break;
    await n.click(); await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1400);
  for (let i = 0; i < 6; i++) {
    const n = await page.locator(".ck-opt").count();
    if (!n) break;
    await page.locator(".ck-opt").nth(Math.min(1, n - 1)).click();
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(4000);
  const r = await page.evaluate(() => {
    const t = document.body.innerText || "";
    return {
      relance: /La vie a pris le dessus/.test(t),
      jour: new Date().toLocaleDateString("fr-FR", { weekday: "long" }),
      date: new Date().toISOString().slice(0, 10),
      // ce que l'écran met en PREMIER après le bandeau éventuel
      tete: t.replace(/\s+/g, " ").slice(0, 170),
    };
  });
  const j = JOURS[new Date(faux).getUTCDay()];
  resultats.push({ j, ...r });
  console.log(j.padEnd(10) + " (" + r.date + ") → " + (r.relance ? "⚠ « LA VIE A PRIS LE DESSUS »" : "  rien") + "  |  " + r.tete.slice(0, 100));
  if (r.relance && k === 5) await page.screenshot({ path: OUT + "-vendredi.png" });
  await ctx.close();
}
const n = resultats.filter((r) => r.relance).length;
console.log("\n→ " + n + " jours sur 7 où un plan CRÉÉ À L'INSTANT accueille par « trois séances sont passées » : " + resultats.filter((r) => r.relance).map((r) => r.j).join(", "));
await browser.close(); server.close();
