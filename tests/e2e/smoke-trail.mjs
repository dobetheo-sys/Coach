// Smoke TRAIL (spec R7) : le trail est un SPORT à part entière, son objectif se décrit par
// ses DONNÉES (distance + D+), la catégorie d'effort est déduite, l'intensité dépend de la
// pente (jamais d'allure au sol en montée), et la descente est une charge programmée.
import { startServer, launchBrowser, makeReporter, traverserQuestionnaire } from "./harness.mjs";
const N_SPORTS = 7; // R16.10 — swimrun réintégré : le sélecteur suit le registre du moteur


const PORT = 8490;
const server = await startServer(PORT);
const { ok, info, report } = makeReporter();
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
const page = await ctx.newPage();
const consoleErrs = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrs.push(m.text()); });
page.on("pageerror", (e) => consoleErrs.push(String(e)));

await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });

// ---- 1. Le trail est proposé comme SPORT, plus comme format de course à pied ----
ok(await page.locator(".sport-card").count() === N_SPORTS, N_SPORTS + " sports proposés (trail R7 + duathlon R10)");
ok(await page.locator('.sport-card[data-sport="trail"]').count() === 1, "carte « Trail » présente au choix du sport");
await page.click('.sport-card[data-sport="run"]');
const runFormats = await page.locator('.opts[data-key="format"]').textContent();
ok(!/Trail/i.test(runFormats), "« Trail » n'est plus un format de course à pied (c'est un sport)");

// ---- 2. Questionnaire trail : les DONNÉES de la course, pas un format ----
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.click('.sport-card[data-sport="trail"]');
// U14 — traversée AGNOSTIQUE À L'ORDRE. Cette suite codait la séquence des écrans en dur et
// tombait à chaque réorganisation, alors qu'elle ne mesure pas l'ordre mais le CONTENU de
// certains écrans. Les assertions sont donc accrochées au contenu, pas au rang.
const vus = {};
await traverserQuestionnaire(page, {
  reponses: { intent: "competition", race_technicity: "technique", race_night: "partielle",
    med_pain: "non", med_dizzy: "non", med_treat: "non",
    train_dplus_access: "collines", treadmill: "non", poles: "a_decider",
    sex: "H", level: "inter", pace_known: "oui", vam_known: "oui",
    history: "confirme", injury: "aucune",
    sessions_max: "5", vol_max: "10", vol_recent: "5", dispo: "semaine", off_days: "non", doubles: "non" },
  // 62 km / 3 200 m D+ : R11.4 exige 28 semaines minimum — la date par défaut du
    // traverseur (+112 j) déclencherait le refus « course trop proche », à raison.
    saisies: { race_date: new Date(Date.now() + 300 * 864e5).toISOString().slice(0, 10),
    race_distance_km: "62", race_dplus_m: "3200", age: "35", pace: "4:50",
    climb_dplus_m: "600", climb_min: "55", vam: "850" },
  async surEcran(pg) {
    const txt = await pg.locator("#screen").textContent();
    if (!vus.terrain && /dénivelé accessible/i.test(txt)) {
      vus.terrain = true;
      ok(/Ton terrain d’entraînement|Ton terrain d'entraînement/.test(txt), "étape « Ton terrain d'entraînement » présente");
      ok(/dénivelé accessible/i.test(txt), "l'accès réel au dénivelé est demandé");
      ok(/Bâtons/.test(txt), "les bâtons sont un choix explicite (recommandés, jamais imposés)");
    }
    if (!vus.level && /vitesse ascensionnelle|VAM/.test(txt)) {
      vus.level = true;
      ok(/sur PLAT/.test(txt), "l'allure seuil est explicitement demandée SUR PLAT");
      ok(/dernière grosse montée/.test(txt), "la VAM se demande par une montée VÉCUE (R12.1), pas par un chiffre à connaître");
      ok(await pg.locator('[data-input="climb_dplus_m"]').count() === 1 && await pg.locator('[data-input="climb_min"]').count() === 1,
        "deux champs : D+ et durée de la montée");
      await pg.evaluate(() => { const d = document.querySelector("#screen details"); if (d) d.open = true; });
    }
  },
});
ok(vus.terrain, "l'écran « ton terrain » a bien été traversé");
ok(vus.level, "l'écran des références (allure plat + VAM) a bien été traversé");
// Ces deux mesures ne dépendent pas d'un écran : elles interrogent le moteur directement.
const vamFromClimb = await page.evaluate(() => globalThis.EBV2.trailObjective({
  race_distance_km: "45", race_dplus_m: "2200", history: "confirme", level: "inter",
  climb_dplus_m: "600", climb_min: "55" }));
ok(vamFromClimb.vamSource === "montee" && vamFromClimb.vam > 400 && vamFromClimb.vam < 700,
  "la VAM est DÉDUITE de la montée déclarée, avec abattement (" + vamFromClimb.vam + " m/h)");
const vamGuessed = await page.evaluate(() => ["debutant", "inter", "avance"].map((level) =>
  globalThis.EBV2.trailObjective({ race_distance_km: "45", race_dplus_m: "2200", history: "confirme", level }).raceMinMid));
ok(new Set(vamGuessed).size === 1, "sans montée déclarée, le NIVEAU ne fait plus varier l'estimation de course (R12.6)");
await page.waitForTimeout(900);
ok(await page.locator("#ebTabbar .tabbtn").count() === 4, "plan trail généré (vue 4 onglets — Nutrition fondue dans Aujourd’hui, R24)");

// ---- 5. Le plan lui-même : catégorie déduite, décisions, contenu spécifique ----
const plan = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const p = S.currentPlan;
  const sess = p.weeks.flatMap((w) => w.days.flatMap((d) => d.sessions.filter((s) => s.d !== "rs").map((s) => ({ n: s.name, det: s.det || "", ph: w.phase.id, steps: s.steps || [] }))));
  const v2 = p._v2 || {};
  return {
    weeks: p.weeks.length,
    decisions: (v2.decisions || []).map((d) => d.id + "=" + d.val),
    warnings: v2.warnings || [],
    names: [...new Set(sess.map((s) => s.n))],
    upWithPace: sess.filter((s) => s.steps.some((st) => st.gradient === "up" || st.gradient === "down") && /\d+['′]\d+\s*\/\s*km/.test(s.det)).length,
    dplusTotal: sess.reduce((t, s) => t + s.steps.reduce((u, st) => u + (st.dplusM || 0) * (st.reps || 1), 0), 0),
    dmoinsTotal: sess.reduce((t, s) => t + s.steps.reduce((u, st) => u + (st.dmoinsM || 0) * (st.reps || 1), 0), 0),
    downCue: sess.filter((s) => /en contrôle/.test(s.det)).length,
  };
});
ok(plan.weeks >= 20, "durée de préparation dimensionnée par la catégorie d'effort (" + plan.weeks + " semaines)");
ok(plan.decisions.some((d) => d.startsWith("format-trail=")), "la catégorie d'effort est affichée comme une DÉCISION : " + (plan.decisions.find((d) => d.startsWith("format-trail=")) || "—"));
ok(plan.decisions.some((d) => d.startsWith("km-effort=")), "objectif exprimé en km-effort (repère qui compare des reliefs différents)");
ok(plan.decisions.some((d) => d.startsWith("T1=")), "plafond de dénivelé hebdomadaire décidé et justifié (T1)");
ok(plan.decisions.some((d) => d.startsWith("T4=")), "plafond de sortie longue en % du temps de course estimé (T4)");
ok(plan.upWithPace === 0, "AUCUNE allure en min/km sur un bloc en montée ou en descente (le verrou R7)");
ok(plan.dplusTotal > 5000, "le plan porte un dénivelé structuré (" + Math.round(plan.dplusTotal) + " m D+ au total)");
ok(plan.dmoinsTotal > 1000, "la descente est programmée comme une charge (" + Math.round(plan.dmoinsTotal) + " m D− au total)");
ok(plan.downCue > 0, "les descentes portent une consigne technique, pas une cible chiffrée (" + plan.downCue + " séances)");
const need = ["Sortie longue trail", "Marche rapide en montée"];
for (const n of need) ok(plan.names.some((x) => x.startsWith(n)), "séance « " + n + " » présente au programme");
ok(plan.names.some((x) => /Descente/.test(x)), "séance de descente dédiée présente");
ok(plan.names.some((x) => /ravito/i.test(x)), "répétition ravitaillement présente (course > 6h)");
ok(plan.names.some((x) => /nuit/i.test(x)), "sortie de nuit présente (course annoncée en partie nocturne)");
ok(plan.names.some((x) => /excentrique/i.test(x)), "renfo excentrique présent (protection n°1 en descente)");

// ---- 6. Prédiction trail : temps estimé, km-effort/h, montée en m/h — pas de Riegel ----
const pred = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const p = globalThis.EBV2.predict("trail", S.answers, S.currentPlan);
  return { items: (p.items || []).map((i) => i.leg + ": " + i.value), advice: p.advice || [] };
});
ok(pred.items.some((i) => /^Temps estimé/.test(i)), "temps estimé fourni : " + (pred.items.find((i) => /Temps/.test(i)) || "—"));
ok(pred.items.some((i) => /km-effort\/h/.test(i)), "vitesse cible en km-effort/h");
ok(pred.items.some((i) => /m\/h de D\+/.test(i)), "vitesse ascensionnelle cible en m/h de D+");
ok(pred.advice.some((x) => /premier tiers/i.test(x)), "consigne de répartition d'allure (départ prudent = erreur n°1 en ultra)");

// ---- 7. Terrain plat : le moteur NOMME la limite au lieu de prescrire l'impossible ----
const flat = await page.evaluate(async () => {
  const { S } = await import("./js/state.js");
  const a = { ...S.answers, train_dplus_access: "plat", treadmill: "oui" };
  const p = globalThis.EBV2.buildPlan("trail", a);
  const names = new Set(p.weeks.flatMap((w) => w.days.flatMap((d) => d.sessions.map((s) => s.name))));
  return { warnings: (p._v2.warnings || []).join(" "), subs: [...names].filter((n) => /tapis|escalier/i.test(n)).length };
});
ok(/terrain/i.test(flat.warnings) && /week-end|montagne/i.test(flat.warnings), "terrain plat : avertissement explicite qui nomme la limite ET le remède");
ok(flat.subs > 0, "séances de substitution générées (tapis incliné / escaliers)");

ok(consoleErrs.length === 0, "aucune erreur console (" + consoleErrs.length + ")");
if (consoleErrs.length) info("erreurs: " + consoleErrs.slice(0, 5).join(" | "));

server.close();
await browser.close();
process.exit(report());
