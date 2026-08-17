// « Ta séance arrive… » — arrive-t-elle ? En combien de temps ? Et hors ligne ?
import { startServer, launchBrowser } from "../tests/e2e/harness.mjs";
const PORT = 8804;
const OUT = "/tmp/claude-0/-home-user-Coach/073a578c-a7ad-5eea-88e5-b1b8cc7b29f0/scratchpad/t3";
const server = await startServer(PORT);
const browser = await launchBrowser();

const REP = { intent: "competition", level: "inter", history: "confirme", injury: "aucune", dispo: "partielle", doubles: "parfois", off_days: "non", shift_ok: "non", sleep: "moyen", life_load: "normale", activity: "actif", sex: "H", med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "non", terrain: "plat", milieu: "bassin", swim_limit: "technique", ftp_known: "oui", pace_known: "oui", css_known: "oui", leg_swim_env: "lac", leg_bike_prof: "plat", leg_run_prof: "plat" };
const SAI = { age: "35", weight: "78", height: "180", vol_max: "10", vol_recent: "7", sessions_max: "6", ftp: "230", pace: "4:50", css: "2:00", water_temp_c: "19" };

async function scenario(nom, opts) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR", isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const reseau = [];
  await page.route("**/*", async (route) => {
    const u = route.request().url();
    if (!u.startsWith("http://localhost")) {
      reseau.push(u.slice(0, 90));
      if (opts.coupe) return route.abort("internetdisconnected");
      if (opts.pend) return; // la requête ne se résout JAMAIS (réseau qui traîne)
    }
    return route.continue();
  });
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
  // À partir d'ici : le message « ta séance arrive… ». On chronomètre son remplacement.
  const t0 = Date.now();
  let ms = null;
  for (let i = 0; i < 100; i++) { // jusqu'à 20 s
    const encore = await page.evaluate(() => /C’est noté|C'est noté|ta séance arrive/i.test(document.body.innerText || ""));
    if (!encore) { ms = Date.now() - t0; break; }
    await page.waitForTimeout(200);
  }
  const fin = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight,
    mots: (document.body.innerText || "").split(/\s+/).filter(Boolean).length,
    txt: (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 200),
  }));
  console.log("\n### " + nom);
  console.log("   appels réseau externes : " + (reseau.length ? [...new Set(reseau)].join(" , ") : "aucun"));
  console.log("   séance affichée après : " + (ms == null ? "JAMAIS (>20 s)" : ms + " ms"));
  console.log("   écran final : " + fin.h + " px, " + fin.mots + " mots — " + fin.txt.slice(0, 150));
  await page.screenshot({ path: OUT + "-" + nom.replace(/[^a-z]/gi, "") + ".png", fullPage: true });
  await ctx.close();
  return ms;
}

await scenario("reseau normal", {});
await scenario("hors ligne", { coupe: true });
await scenario("reseau qui traine", { pend: true });

await browser.close(); server.close();
