// Le canal de vente (abonnement de ravitaillement récurrent, gels/boissons) n'avait AUCUNE
// garde E2E depuis sa livraison (PR #29/#31/#35) — cette suite couvre le mécanisme existant
// (proposition basée sur le besoin calculé des séances à venir) ET son extension du
// 08/08/2026 (retour utilisateur : « suggérer d'être accompagné avec nos gels dès la fin du
// plan ») — la carte ne disparaissait plus discrètement, elle disparaissait TOTALEMENT une
// fois le plan terminé, exactement le moment où la question a un sens.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

const PORT = 8598;
const server = await startServer(PORT);
const { ok, report } = makeReporter();
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

async function ouvrirNutrition(state) {
  await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, state);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.click('[data-tab="outils"]');
  await page.waitForTimeout(400);
}

// ---- 1. Plan en cours, avec des séances qui ont besoin de glucides : la carte se propose --
{
  const st = runnerStateV1({ format: "70.3" }); // triathlon long : au moins une séance a besoin de gels
  st.sport = "tri";
  await ouvrirNutrition(st);
  const count = await page.locator("#shopCard").count();
  ok(count === 1, "un plan en cours avec un besoin calculé propose la carte d'abonnement");
  const txt = count ? await page.locator("#shopCard").textContent() : "";
  ok(/S’abonner au ravitaillement|s.abonner au ravitaillement/i.test(txt), "libellé standard (pas le libellé « fin de plan »)");
}

// ---- 2. Retour utilisateur (08/08/2026) : plan TERMINÉ, jamais abonné → la carte reste,
// avec un cadrage différent, et s'ouvre d'office (pas besoin de la chercher) -----------------
{
  const st = runnerStateV1({ format: "5k", history: "reprise", vol_max: "3" });
  st.answers.plan_start = "2026-01-05"; // très en amont : la course est passée depuis longtemps
  await ouvrirNutrition(st);
  const card = page.locator("#shopCard");
  ok(await card.count() === 1, "la carte reste visible une fois le plan terminé (elle disparaissait avant ce lot)");
  // R-ZENNA — ce critère lisait l'attribut `open` d'un `<details>`. La composition de la
  // maquette n'en est plus un : la carte est un bloc, et « ouverte d'office » se mesure
  // désormais sur ce qui est RÉELLEMENT à l'écran sans avoir rien touché — le devis et le
  // bouton d'activation. C'est l'INTENTION du critère (« pas de 4e clic pour la trouver »),
  // et elle est mieux servie ainsi : un attribut peut être présent sur une carte vide.
  ok(await card.locator("#shopOk").count() === 1,
    "elle s'ouvre d'office : le bouton d'activation est là sans avoir rien touché (pas de 4e clic pour la trouver)");
  ok(await card.locator(".seg [data-cadence]").count() >= 2,
    "le choix de cadence est visible d'emblée, pas derrière un repli");
  const txt = await card.textContent();
  ok(/touche à sa fin/.test(txt), "le texte reflète la fin de plan, pas un besoin calculé sur des séances qui n'existent plus");
  ok(/Rester accompagné/.test(txt), "le titre invite à CONTINUER l'accompagnement, pas à s'abonner comme si de rien n'était");
}

// ---- 3. Déjà abonné (actif) : pas de reproposition, la carte de gestion normale s'affiche --
{
  const st = runnerStateV1({ format: "5k", history: "reprise", vol_max: "3" });
  st.answers.plan_start = "2026-01-05";
  st.answers.shopSubscription = { startedAt: "2026-01-10", cadence: "hebdo", flavor: "neutre", format: "gel individuel" };
  await ouvrirNutrition(st);
  const txt = await page.locator("#shopCard").textContent();
  // R-ZENNA — ce critère lisait le libellé « Abonnement ravitaillement », que la composition
  // de la maquette a renommé. Il est réécrit sur ce qu'il VOULAIT dire (« gestion, pas
  // proposition ») plutôt que sur le nouveau texte : un critère calé sur un libellé se
  // contente de photographier ce qu'on vient d'écrire. La gestion se reconnaît à ses ACTIONS.
  ok(/Abonnement actif/i.test(txt), "abonné actif : la carte annonce l'état de l'abonnement");
  ok(await page.locator("#shopCard #shopEdit").count() === 1
    && await page.locator("#shopCard #shopAskCancel").count() === 1,
    "…et porte les actions de GESTION (modifier / résilier)");
  ok(await page.locator("#shopCard #shopOk").count() === 0 && await page.locator("#shopCard #shopExpand").count() === 0,
    "…pas la proposition : ni bouton d'activation, ni invite à découvrir l'offre");
  ok(!/touche à sa fin/.test(txt), "aucune reproposition « fin de plan » tant que l'abonnement est actif");
}

// ---- 4. R-ZENNA : la composition de la maquette n'a PAS emporté la restriction ------------
// `shopPromptDue` énonce « le tunnel se propose une fois puis se tait 4 semaines — jamais un
// rappel permanent ». L'ancienne carte la tenait par l'attribut `open` de son `<details>` ;
// la composition de la maquette n'en est plus un, et ne dessine QUE l'état déplié. Sans état
// dédié, une carte de VENTE resterait dépliée en permanence dans l'onglet. Ces critères
// mesurent les deux moitiés : elle se tait, et elle se rouvre d'un geste.
{
  const st = runnerStateV1({ format: "70.3" });
  st.sport = "tri";
  st.answers.weight = "72";
  st.answers.plan_start = "2026-08-10"; // plan tout neuf : l'ancre des 28 jours n'est pas échue
  await ouvrirNutrition(st);
  const card = page.locator("#shopCard");
  ok((await card.getAttribute("class") || "").includes("shop-card-min"),
    "plan récent, proposition pas encore due : la carte est REPLIÉE (pas de rappel permanent)");
  ok(await page.locator("#shopCard .seg [data-cadence]").count() === 0,
    "repliée, elle ne déroule ni devis ni sélecteur — juste de quoi la rouvrir");
  const rouvrable = await page.locator("#shopExpand").count() === 1;
  ok(rouvrable, "…et un bouton la rouvre : consulter reste gratuit");

  // Le clic est CONDITIONNEL. Sans ça, casser la restriction fait mourir la suite sur un
  // TimeoutError AVANT `report()` : code de sortie 1, mais pas une ligne de verdict — le
  // défaut d'instrument de R22b/H-1b, refait ici. Une garde doit RAPPORTER, pas mourir.
  if (rouvrable) {
    await page.click("#shopExpand");
    await page.waitForTimeout(500);
    ok(await page.locator("#shopCard .seg [data-cadence]").count() >= 2, "dépliée, la composition complète est là");
    const ancre = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("eb_state_v2") || "{}");
      const p = (s.plans || [])[s.active || 0] || {};
      return ((p.answers || {}).shopSubscription || {}).lastPromptAt || null;
    });
    ok(!!ancre, "déplier REPOSE l'ancre des 28 jours (" + ancre + ") — c'est le signal « proposition vue »");
  }
}

// ---- 5. R7 : aucune date ISO brute à l'écran ----------------------------------------------
// Première écriture de ce critère : posé sur la carte de PROPOSITION, où la seule date passe
// par le libellé du bouton. Casser `fmtDay` sur l'échéance le laissait VERT — il nommait « les
// dates affichées » et en mesurait une seule, dans l'état où les autres n'existent pas. Il
// porte donc sur l'état ABONNÉ, celui qui affiche l'échéance ET la date de résiliation.
{
  const st = runnerStateV1({ format: "5k", history: "reprise", vol_max: "3" });
  st.answers.plan_start = "2026-01-05";
  st.answers.shopSubscription = { startedAt: "2026-01-10", cadence: "hebdo", flavor: "neutre", format: "gel individuel" };
  await ouvrirNutrition(st);
  // PAS de `\b` autour du motif : `textContent` concatène les nœuds SANS séparateur, donc la
  // carte rend « Prochaine échéance2026-08-15 » — entre le « e » et le « 2 » il n'y a aucune
  // frontière de mot, et le critère restait vert sur la date brute qu'il existe pour trouver.
  // Vérifié : avec `\b`, la cassure K3 passait. Une hypothèse sur la forme du texte mesuré,
  // pas sur la propriété — la même famille d'erreur que ce dépôt paie régulièrement.
  const ISO = /20\d\d-\d\d-\d\d/;
  const t1 = await page.locator("#shopCard").textContent();
  ok(!ISO.test(t1), "abonnement actif : l'échéance est en date lisible, pas en ISO brut"
    + (ISO.test(t1) ? " — reste : " + t1.match(ISO)[0] : ""));

  await page.click("#shopAskCancel");
  await page.waitForTimeout(300);
  await page.click("#shopCancel");
  await page.waitForTimeout(500);
  const t2 = await page.locator("#shopCard").textContent();
  ok(/Résiliation prévue le/.test(t2), "la résiliation programmée est annoncée sur la carte");
  ok(!ISO.test(t2), "…et sa date aussi est lisible" + (ISO.test(t2) ? " — reste : " + t2.match(ISO)[0] : ""));
}

ok(errs.length === 0, "aucune erreur JS (" + errs.length + (errs.length ? " — " + errs[0] : "") + ")");
await browser.close();
server.close();
process.exit(report());
