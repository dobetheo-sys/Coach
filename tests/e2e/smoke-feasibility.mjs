// RV — LE CHRONO VISÉ, GARDÉ SUR LES DEUX MOITIÉS.
//
// La carte « 🎯 Ton chrono visé » répond à une question que le moteur ne posait jamais : « mon
// objectif tient-il ? ». Elle est utile, et elle est DANGEREUSE — parce que la chose la plus
// naturelle du monde, une fois qu'un objectif de temps est saisi, serait de l'utiliser pour
// construire le plan. Ce serait la priorité n°5 du manifeste (performance) qui écrase les
// quatre premières.
//
// D'où deux moitiés, et jamais une seule :
//   RV-UI-A  — la carte EXISTE et rend un verdict motivé (sinon la garde serait satisfaite en
//              supprimant la fonctionnalité — la leçon d'U1b) ;
//   RV-UI-B  — le plan affiché est IDENTIQUE avec et sans chrono visé, séance par séance.
//
// `RV-INVARIANT` (demo:faisabilite) mesure déjà cette propriété au niveau du moteur. Celle-ci
// la remesure sur ce qui est RENDU : c'est le chemin par lequel un défaut arriverait vraiment,
// et c'est exactement la forme de trou que R19.1 a laissée passer (la garde vérifiait que le
// champ existe, jamais qu'il agissait — ici, jamais qu'il N'agissait PAS).
import { startServer, launchBrowser, makeReporter } from "./harness.mjs";

const PORT = 8598;
const server = await startServer(PORT);
const { ok, report } = makeReporter();
const browser = await launchBrowser();

const REP = { intent: "competition", level: "inter", history: "confirme", injury: "aucune", dispo: "partielle",
  doubles: "parfois", off_days: "non", shift_ok: "non", sleep: "moyen", life_load: "normale", activity: "actif",
  sex: "H", med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "non", terrain: "plat",
  pace_known: "oui", ftp_known: "non", css_known: "non" };
const SAI = { age: "35", weight: "75", height: "178", vol_max: "6", vol_recent: "4", sessions_max: "5", pace: "5:10" };

async function session() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", isMobile: true, hasTouch: true, timezoneId: "Europe/Paris" });
  const page = await ctx.newPage();
  await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.click('.sport-card[data-sport="run"]');
  await page.waitForTimeout(250);
  for (let i = 0; i < 30; i++) {
    await page.evaluate(async ({ r, s }) => {
      const a = (m) => new Promise((x) => setTimeout(x, m));
      for (const g of document.querySelectorAll(".opts[data-key]")) {
        if (g.querySelector(".opt.sel")) continue;
        const p = g.dataset.key === "format" ? "marathon" : r[g.dataset.key];
        const b = (p && g.querySelector('.opt[data-val="' + p + '"]')) || g.querySelector(".opt");
        if (b) { b.click(); await a(20); }
      }
      for (const inp of document.querySelectorAll("[data-input]")) {
        if (inp.value) continue;
        let v = s[inp.dataset.input];
        if (v == null) {
          if (inp.type === "date") v = new Date(Date.now() + 112 * 864e5).toISOString().slice(0, 10);
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

/**
 * L'empreinte du plan tel qu'il est AFFICHÉ, pas tel qu'un appel de laboratoire le rendrait :
 * c'est par l'écran qu'un défaut arriverait à l'athlète. La carte du chrono visé est retirée
 * de la comparaison — c'est la seule chose qui a le DROIT de changer.
 */
async function empreinte(page) {
  return page.evaluate(() => {
    const sc = document.getElementById("screen");
    if (!sc) return "";
    const clone = sc.cloneNode(true);
    const rv = clone.querySelector("#rvCard");
    if (rv) rv.remove();
    return (clone.innerText || "").replace(/\s+/g, " ").trim();
  });
}

const { ctx, page } = await session();
// L'onglet du plan s'appelle `general` (« 🗓 Plan » à l'écran) — on cible l'identifiant, pas
// le libellé : c'est lui qui est stable.
await page.click('#ebTabbar .tabbtn[data-tab="general"]');
await page.waitForTimeout(800);

// ── La carte existe, avant toute saisie
ok(await page.locator("#rvCard").count() > 0, "RV-UI — la carte « chrono visé » est présente dans l'onglet Plan");
ok(await page.locator("#rvIn").count() > 0, "RV-UI — elle porte un champ de saisie");

// ── L'empreinte du plan AVANT toute saisie
const avant = await empreinte(page);

// ── RV-UI-A : un chrono saisi produit un verdict MOTIVÉ
await page.fill("#rvIn", "3:30:00");
await page.locator("#rvIn").dispatchEvent("change");
await page.waitForTimeout(800);
const texte = await page.evaluate(() => (document.querySelector("#rvCard") || {}).innerText || "");
ok(/atteignable|juste|d'ici là|au-delà|pas assez/i.test(texte), "RV-UI-A — un chrono saisi rend un verdict");
ok(/Comment on arrive là/.test(texte), "RV-UI-A — et il est MOTIVÉ (les décisions sont consultables)");
ok(!/NaN|undefined|\[object/.test(texte), "RV-UI-A — le verdict ne laisse fuiter aucune valeur brute");

// ── RV-UI-B : LE PLAN N'A PAS BOUGÉ. C'est la moitié qui compte.
const apres = await empreinte(page);
ok(avant === apres, "RV-UI-B — le plan est IDENTIQUE avec et sans chrono visé (séance par séance)");

// ── Une saisie illisible le dit, et ne devine pas
await page.fill("#rvIn", "trois heures");
await page.locator("#rvIn").dispatchEvent("change");
await page.waitForTimeout(600);
const flou = await page.evaluate(() => (document.querySelector("#rvCard") || {}).innerText || "");
ok(/n’est pas lisible|n'est pas lisible/.test(flou), "RV-UI — une saisie illisible le DIT, au lieu de deviner un chrono");

// ── L'INSTRUMENT SAIT-IL VOIR ? La question qui manquait aux trois mesures démasquées en R20.
//
// `RV-UI-B` compare deux empreintes et conclut « rien n'a bougé ». Une empreinte AVEUGLE dirait
// exactement la même chose. On change donc une réponse dont on SAIT qu'elle déplace le plan —
// le volume hebdomadaire — et on exige que l'empreinte le voie. Sans ce critère, RV-UI-B ne
// prouve rien.
await page.evaluate(() => {
  const st = JSON.parse(localStorage.getItem("eb_state_v2"));
  const p = st.plans ? st.plans[st.cur || 0] : st;
  p.answers.vol_max = "3";
  localStorage.setItem("eb_state_v2", JSON.stringify(st));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.click('#ebTabbar .tabbtn[data-tab="general"]');
await page.waitForTimeout(900);
const autre = await empreinte(page);
ok(autre !== avant && autre.length > 200, "RV-UI-B — l'empreinte SAIT voir un changement de plan (volume 6 h → 3 h)");

// ── Hors course à pied, la carte n'existe pas (un verdict tiède se croit, une absence se comprend)
const horsRun = await page.evaluate(() => {
  const st = JSON.parse(localStorage.getItem("eb_state_v2") || "null");
  const a = st && (st.answers || (st.plans && st.plans[st.cur || 0] && st.plans[st.cur || 0].answers));
  try { return globalThis.EBV2.feasibility("swim", Object.assign({}, a, { target_time: "3:30:00" }), null); }
  catch (e) { return "EXCEPTION"; }
});
ok(horsRun === null, "RV-UI — hors course à pied, aucun verdict n'est produit");

await ctx.close();
await browser.close();
server.close();
report();
