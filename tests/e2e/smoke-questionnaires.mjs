// R20.1 — LES SEPT QUESTIONNAIRES SE TRAVERSENT SANS CASSER.
//
// Pourquoi cette suite existe : le champ « température de l'eau » de R19.2 lisait une variable
// hors portée. `ReferenceError` au rendu, donc l'étape entière disparaissait — y compris les
// trois profils par discipline de R18.2, livrés la veille. Les 21 gates étaient verts, les
// 12 suites E2E aussi. Personne ne l'a vu parce qu'**aucune suite ne traversait le
// questionnaire TRIATHLON** : duathlon et swimrun le faisaient, et eux passaient.
//
// C'est la même forme de trou que R19.1 (une réponse inerte dans le seul sport non couvert) :
// la garde couvrait les sports où le code avait été écrit, pas celui où il servait. Le banc de
// sensibilité ferme le versant « la réponse n'agit pas » ; cette suite ferme le versant
// « l'écran ne s'affiche pas ». Les deux étaient nécessaires — mes deux défauts étaient un de
// chaque type.
//
// Ce que cette suite NE fait PAS : vérifier le contenu de chaque étape. Les suites dédiées
// (trail, duathlon, swimrun) le font, avec leurs propres critères. Ici on vérifie une seule
// chose, pour les SEPT sports : on peut aller du choix du sport jusqu'à un plan généré sans
// qu'une erreur JavaScript n'avale un écran.
import { startServer, launchBrowser, makeReporter } from "./harness.mjs";

const PORT = 8594;
const server = await startServer(PORT);
const { ok, report } = makeReporter();
const browser = await launchBrowser();

/** Réponses à donner quand l'étape les demande — clé du questionnaire → valeur. */
const REPONSES = {
  intent: "competition", level: "inter", history: "confirme", injury: "aucune",
  dispo: "partielle", doubles: "parfois", off_days: "non", shift_ok: "non",
  sleep: "moyen", life_load: "normale", activity: "actif", sex: "H",
  med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "non",
  terrain: "plat", milieu: "bassin", swim_limit: "technique", treadmill: "non",
  poles: "oui", train_dplus_access: "collines", race_technicity: "mixte", race_night: "non",
  team_mode: "solo", openwater_access: "saisonnier", swim_continuous: "oui",
  run_continuous: "oui", gear_test: "oui", cycle_sync: "non",
  ftp_known: "oui", pace_known: "oui", css_known: "oui", vam_known: "non",
  leg_swim_env: "lac", leg_bike_prof: "plat", leg_run_prof: "plat",
};
const SAISIES = {
  age: "35", weight: "78", height: "180", vol_max: "10", vol_recent: "7", sessions_max: "6",
  ftp: "230", pace: "4:50", css: "2:00", hr_max: "185", water_temp_c: "19",
  race_distance_km: "45", race_dplus_m: "2200", race_cutoff_h: "12",
  swim_total_m: "2000", run_total_km: "12", segments_n: "10", longest_swim_m: "600",
  climb_dplus_m: "800", climb_min: "75", vam: "1200", team_swim_gap_sec: "15",
};
const FORMAT = { run: "marathon", bike: "cyclo", swim: "fond", tri: "70.3", duathlon: "M", swimrun: "series" };
const SPORTS = ["run", "bike", "swim", "tri", "duathlon", "trail", "swimrun"];

for (const sport of SPORTS) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })).newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.click('.sport-card[data-sport="' + sport + '"]');
  await page.waitForTimeout(250);

  // On avance étape par étape, en répondant à tout ce que l'écran présente. La boucle est
  // bornée : un questionnaire qui n'avance plus est un échec, pas une boucle infinie.
  let etapes = 0, bloque = null;
  for (; etapes < 30; etapes++) {
    const vide = await page.evaluate(() => (document.getElementById("screen") || {}).innerHTML === "");
    if (vide) { bloque = "écran VIDE à l'étape " + (etapes + 1); break; }
    // RÉPONDEUR GÉNÉRIQUE. Il ne connaît pas la liste des questions — il répond à ce que
    // l'écran présente : chaque groupe d'options sans sélection reçoit la valeur préférée si
    // on en a une, sinon sa PREMIÈRE option ; chaque champ vide reçoit une valeur plausible
    // déduite de son type et de ses bornes. C'est volontaire : une suite qui connaîtrait la
    // liste des questions cesserait de traverser le jour où on en ajoute une — et c'est
    // exactement le trou qu'elle est censée fermer.
    await page.evaluate(async ({ r, s, fmt }) => {
      const attendre = (ms) => new Promise((res) => setTimeout(res, ms));
      for (const g of document.querySelectorAll(".opts[data-key]")) {
        if (g.querySelector(".opt.sel")) continue;
        const cle = g.dataset.key;
        const pref = cle === "format" ? fmt : r[cle];
        const b = (pref && g.querySelector('.opt[data-val="' + pref + '"]')) || g.querySelector(".opt");
        if (b) { b.click(); await attendre(30); }
      }
      for (const i of document.querySelectorAll("[data-input]")) {
        if (i.value) continue;
        const cle = i.dataset.input;
        let v = s[cle];
        if (v == null) {
          if (i.type === "date") { const d = new Date(Date.now() + 300 * 864e5); v = d.toISOString().slice(0, 10); }
          else if (i.type === "number") {
            const lo = parseFloat(i.min), hi = parseFloat(i.max);
            v = String(isFinite(lo) && isFinite(hi) ? Math.round((lo + hi) / 2) : 10);
          } else v = "10";
        }
        i.value = v;
        i.dispatchEvent(new Event("input", { bubbles: true }));
        i.dispatchEvent(new Event("change", { bubbles: true }));
        await attendre(30);
      }
    }, { r: REPONSES, s: SAISIES, fmt: FORMAT[sport] || null });
    await page.waitForTimeout(200);
    if (await page.locator("#genBtn").count()) { await page.click("#genBtn"); break; }
    const next = page.locator("#nextBtn");
    if (!(await next.count())) { bloque = "ni « suivant » ni « générer » à l'étape " + (etapes + 1); break; }
    if (!(await next.isEnabled())) { bloque = "« suivant » désactivé à l'étape " + (etapes + 1) + " (une réponse attendue n'a pas été trouvée)"; break; }
    await next.click();
    await page.waitForTimeout(180);
  }
  await page.waitForTimeout(900);

  const barre = await page.locator("#ebTabbar .tabbtn").count();
  ok(!bloque, sport.padEnd(9) + " — le questionnaire se traverse" + (bloque ? " : " + bloque : " (" + (etapes + 1) + " étapes)"));
  ok(barre === 5, sport.padEnd(9) + " — un plan est généré (barre à 5 onglets, vue : " + barre + ")");
  ok(errs.length === 0, sport.padEnd(9) + " — aucune erreur JS" + (errs.length ? " : " + errs[0].slice(0, 120) : ""));
  await page.context().close();
}

await browser.close();
server.close();
report();
