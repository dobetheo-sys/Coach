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

// ── U12 — repliée tant qu'elle n'a rien à dire : l'onglet Plan fait déjà 7,7 écrans sur un
// téléphone, une question OPTIONNELLE n'a pas à coûter de la place à qui ne l'utilise pas.
ok(!(await page.evaluate(() => document.getElementById("rvCard").open)),
  "U12 — sans chrono saisi, la carte est REPLIÉE");
await page.click("#rvCard summary");
await page.waitForTimeout(200);

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

// ── U12 — une fois un chrono saisi, elle s'ouvre d'office : replier ce qu'on vient de
// demander serait cacher la réponse.
ok(await page.evaluate(() => document.getElementById("rvCard").open),
  "U12 — avec un chrono saisi, la carte est OUVERTE");

// ── RV-UI-B : LE PLAN N'A PAS BOUGÉ. C'est la moitié qui compte.
const apres = await empreinte(page);
ok(avant === apres, "RV-UI-B — le plan est IDENTIQUE avec et sans chrono visé (séance par séance)");

// ── Une saisie illisible le dit, et ne devine pas
await page.locator("#rvCard").evaluate((e) => { e.open = true; });
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

// ── Audit 08/08/2026 : étendu de la course seule à swim/tri/duathlon (`assessFeasibilityMulti`,
// « RVm » dans le pont). Vélo seul et trail restent HORS périmètre — aucun format vélo ne porte
// de distance connue (PW), et le modèle de temps du trail n'est pas une composition
// marge/plafond par référence mesurée. Les deux moitiés se gardent donc désormais :
// ce qui reste hors périmètre le reste, et ce qui vient d'entrer répond vraiment.
const horsPerimetre = await page.evaluate(() => {
  const st = JSON.parse(localStorage.getItem("eb_state_v2") || "null");
  const a = st && (st.answers || (st.plans && st.plans[st.cur || 0] && st.plans[st.cur || 0].answers));
  try {
    return {
      bike: globalThis.EBV2.feasibility("bike", Object.assign({}, a, { format: "gravel", target_time: "3:30:00" }), null),
      trail: globalThis.EBV2.feasibility("trail", Object.assign({}, a, { format: "court", target_time: "3:30:00" }), null),
    };
  } catch (e) { return "EXCEPTION"; }
});
ok(horsPerimetre !== "EXCEPTION" && horsPerimetre.bike === null && horsPerimetre.trail === null,
  "RV-UI — hors périmètre (vélo seul, trail), aucun verdict n'est produit");

// ── swim/tri/duathlon RÉPONDENT désormais — même garantie, sur un chrono multi-segments.
const multiSport = await page.evaluate(() => {
  const base = { weight: "72", sex: "H", age: "35", vol_max: "8", vol_recent: "4", history: "confirme",
    ftp_known: "oui", ftp: "220", pace_known: "oui", pace: "4:30", css_known: "oui", css: "1:35" };
  try {
    return {
      swim: globalThis.EBV2.feasibility("swim", Object.assign({}, base, { format: "fond", target_time: "20:00" }), null),
      tri: globalThis.EBV2.feasibility("tri", Object.assign({}, base, { format: "M", target_time: "2:30:00" }), null),
      duathlon: globalThis.EBV2.feasibility("duathlon", Object.assign({}, base, { format: "M", target_time: "2:00:00" }), null),
    };
  } catch (e) { return "EXCEPTION"; }
});
ok(multiSport !== "EXCEPTION"
  && multiSport.swim && multiSport.swim.verdict && multiSport.swim.decisions.length > 0
  && multiSport.tri && multiSport.tri.verdict && multiSport.tri.decisions.length > 0
  && multiSport.duathlon && multiSport.duathlon.verdict && multiSport.duathlon.decisions.length > 0,
  "RV-UI — swim/tri/duathlon rendent désormais un verdict motivé (chrono multi-segments)");

await ctx.close();
await browser.close();
server.close();
// La suite doit SORTIR en code non nul quand elle échoue : `run-all.mjs` lit le code de
// sortie du processus, et `report()` se contente de le RENDRE. Sept suites sur dix-sept
// finissaient par `report();` — elles sortaient donc en 0 quoi qu'elles trouvent, et la
// CI les comptait vertes. Même mécanisme que le banc d'invariants d'O-9/R20.6 : un
// rapport que rien ne lit vaut zéro.
process.exit(report());
