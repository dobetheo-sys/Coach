// Le canal de vente (abonnement de ravitaillement récurrent, gels/boissons) n'avait AUCUNE
// garde E2E depuis sa livraison (PR #29/#31/#35) — cette suite couvre le mécanisme existant
// (proposition basée sur le besoin calculé des séances à venir) ET son extension du
// 08/08/2026 (retour utilisateur : « suggérer d'être accompagné avec nos gels dès la fin du
// plan ») — la carte ne disparaissait plus discrètement, elle disparaissait TOTALEMENT une
// fois le plan terminé, exactement le moment où la question a un sens.
//
// R25.4 (habillage + micro-UX, brief §R25.4) ajoute deux critères d'acceptation MESURÉS ici
// (pas seulement visuels) : la résiliation en DEUX temps — un clic sur « Résilier » ne doit
// JAMAIS résilier seul — et la non-régression du bug documenté dans `bindShopSubscription`
// (changer la cadence recalcule détail/total/CTA sans re-replier la carte, pilule glissante
// comprise).
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
  ok((await card.getAttribute("open")) !== null, "elle s'ouvre d'office (pas de 4e clic à faire pour la trouver)");
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
  ok(/Abonnement ravitaillement/.test(txt), "abonné actif : la carte de gestion s'affiche, pas la proposition");
  ok(!/touche à sa fin/.test(txt), "aucune reproposition « fin de plan » tant que l'abonnement est actif");
}

// ---- 4. Résiliation en DEUX temps (R25.4) : « Résilier » n'ouvre que le bandeau de
// confirmation, il ne pose jamais `cancelEffectiveAt` seul ; « Confirmer » le pose,
// « Garder » l'abandonne sans rien changer ------------------------------------------------
{
  const st = runnerStateV1({ format: "5k", history: "reprise", vol_max: "3" });
  st.answers.plan_start = "2026-01-05";
  st.answers.shopSubscription = { startedAt: "2026-01-10", cadence: "hebdo", flavor: "neutre", format: "gel individuel" };
  await ouvrirNutrition(st);
  await page.click("#shopCancel");
  await page.waitForTimeout(200);
  let sub = await page.evaluate(async () => (await import("./js/state.js")).S.answers.shopSubscription);
  ok(!sub.cancelEffectiveAt, "cliquer « Résilier » seul ne pose PAS cancelEffectiveAt");
  ok(await page.locator("#shopCancelConfirm").isVisible(), "le bandeau de confirmation apparaît (« Confirmer »/« Garder »)");
  ok(await page.locator("#shopCancel").count() === 0, "le bouton « Résilier » d'origine n'est plus dans le DOM (remplacé, pas superposé)");
  // « Garder » : abandon, rien ne change, et on retrouve le bouton Résilier d'origine.
  await page.click("#shopCancelKeep");
  await page.waitForTimeout(200);
  sub = await page.evaluate(async () => (await import("./js/state.js")).S.answers.shopSubscription);
  ok(!sub.cancelEffectiveAt, "« Garder » n'a rien résilié");
  ok(await page.locator("#shopCancel").isVisible(), "« Garder » restaure le bouton « Résilier »");
  // Confirmer : cette fois cancelEffectiveAt est posé.
  await page.click("#shopCancel");
  await page.waitForTimeout(200);
  await page.click("#shopCancelConfirm");
  await page.waitForTimeout(200);
  sub = await page.evaluate(async () => (await import("./js/state.js")).S.answers.shopSubscription);
  ok(!!sub.cancelEffectiveAt, "« Confirmer » pose bien cancelEffectiveAt");
  const txt = await page.locator("#shopCard").textContent();
  ok(/Continuer quand même/.test(txt), "la carte bascule sur l'état « résiliation programmée »");
}

// ---- 5. Non-régression bindShopSubscription (R25.4) : changer la cadence recalcule
// détail + total + CTA SANS re-replier la carte, pilule glissante comprise ----------------
{
  const st = runnerStateV1({ format: "70.3" });
  st.sport = "tri";
  st.answers.plan_start = "2026-06-08"; // ramp avancée : au moins une séance à gels sous 30 j
  await ouvrirNutrition(st);
  const card = page.locator("#shopCard");
  await page.evaluate(() => { const d = document.getElementById("shopCard"); if (d && d.tagName === "DETAILS") d.open = true; });
  await page.waitForTimeout(200);
  const ctaBefore = await page.locator("#shopOk").textContent();
  await page.click('[data-cadence="mensuel"]');
  await page.waitForTimeout(300);
  ok((await card.getAttribute("open")) !== null, "la carte reste OUVERTE après un changement de cadence");
  ok(await page.locator('[data-cadence="mensuel"]').getAttribute("aria-pressed") === "true", "la pilule « chaque mois » est bien active");
  ok(await page.locator('[data-cadence="hebdo"]').getAttribute("aria-pressed") === "false", "…et « chaque semaine » ne l'est plus");
  const ctaAfter = await page.locator("#shopOk").textContent();
  ok(ctaAfter !== ctaBefore, "le CTA daté change avec la cadence (« 1er envoi le … » suit nextEcheance)");
  const totalTxt = await page.locator("#shopPeriodTotal").textContent();
  ok(/€/.test(totalTxt), "le total se recalcule (prix affiché sur la fenêtre « chaque mois »)");
}

ok(errs.length === 0, "aucune erreur JS (" + errs.length + (errs.length ? " — " + errs[0] : "") + ")");
await browser.close();
server.close();
process.exit(report());
