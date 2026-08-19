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
  // Le `evaluate` qui suit court contre le BOOT de l'app : `networkidle` ne garantit pas que
  // plus aucune navigation ne partira (le service worker peut en déclencher une). Vu en CI le
  // 14/08/2026 : « Execution context was destroyed » — exception NON RATTRAPÉE, donc la suite
  // MEURT sans imprimer une ligne et le lanceur compte une suite rouge sans dire laquelle.
  // C'est la forme exacte que R22b a corrigée ailleurs : un test qui meurt ne rapporte rien.
  // On réessaie sur le nouveau contexte au lieu de tomber ; trois tentatives, puis on lève
  // POUR DE BON (une garde qui avale l'erreur indéfiniment ne mesure plus rien).
  for (let essai = 1; ; essai++) {
    try { await page.evaluate(() => localStorage.clear()); break; }
    catch (e) {
      if (essai >= 3) throw e;
      await page.waitForLoadState("networkidle");
    }
  }
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

// ── O-59 — LA NAVIGATION DU QUESTIONNAIRE PASSE PAR L'IDENTITÉ, JAMAIS PAR L'INDICE ─────────
// Constat du fondateur (sur l'app DÉPLOYÉE) : « après suivant puis précédent, on ne revient pas
// sur le même écran ». Les étapes sont dynamiques depuis U14, et `S.step` — un indice — était
// PERSISTÉ tel quel (`e.step` dans state.js) : chaque déploiement qui recompose la liste faisait
// atterrir la restauration sur un AUTRE écran. « Un ordinal n'est une position que si la
// collection est stable. » Trois volets :
//   1. le geste du constat : répondre → suivant → précédent revient sur le même écran, marques
//      comprises ;
//   2. la persistance : recharger en plein questionnaire revient sur le même écran ;
//   3. la recomposition FORCÉE : on corrompt l'INDICE persisté (+3) en gardant l'identité —
//      c'est exactement ce qu'un déploiement produit (l'indice devient faux, l'id reste) — et
//      l'écran restauré doit suivre l'IDENTITÉ. Sans O-59 (indice seul), ce volet atterrit
//      trois écrans plus loin : contre-preuve du mécanisme, pas d'un détail d'écriture.
{
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })).newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
  for (let essai = 1; ; essai++) {
    try { await page.evaluate(() => localStorage.clear()); break; }
    catch (e) { if (essai >= 3) throw e; await page.waitForLoadState("networkidle"); }
  }
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.click('.sport-card[data-sport="tri"]');
  await page.waitForTimeout(250);
  const titre = () => page.evaluate(() => (document.querySelector("#screen h2") || {}).textContent || "");
  // avancer de deux écrans en répondant (le répondeur générique de la boucle principale)
  const repondre = () => page.evaluate(async ({ r, s, fmt }) => {
    const attendre = (ms) => new Promise((res) => setTimeout(res, ms));
    for (const g of document.querySelectorAll(".opts[data-key]")) {
      if (g.querySelector(".opt.sel")) continue;
      const b = ((g.dataset.key === "format" ? fmt : r[g.dataset.key]) && g.querySelector('.opt[data-val="' + (g.dataset.key === "format" ? fmt : r[g.dataset.key]) + '"]')) || g.querySelector(".opt");
      if (b) { b.click(); await attendre(25); }
    }
    for (const i of document.querySelectorAll("[data-input]")) {
      if (i.value) continue;
      let v = s[i.dataset.input];
      if (v == null) { if (i.type === "date") v = new Date(Date.now() + 300 * 864e5).toISOString().slice(0, 10); else if (i.type === "number") { const lo = parseFloat(i.min), hi = parseFloat(i.max); v = String(isFinite(lo) && isFinite(hi) ? Math.round((lo + hi) / 2) : 10); } else v = "10"; }
      i.value = v; i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true })); await attendre(25);
    }
  }, { r: REPONSES, s: SAISIES, fmt: FORMAT.tri });
  for (let i = 0; i < 2; i++) { await repondre(); await page.waitForTimeout(150); await page.click("#nextBtn"); await page.waitForTimeout(200); }
  const ici = await titre();
  // 1 — suivant puis précédent. La marque se lit APRÈS avoir répondu : la lire avant, c'est
  // lire un écran vierge et comparer null à la réponse (ma première écriture, rouge à raison).
  await repondre(); await page.waitForTimeout(150);
  const marque = await page.evaluate(() => { const o = document.querySelector(".opts[data-key] .opt.sel"); return o ? o.dataset.val : null; });
  await page.click("#nextBtn"); await page.waitForTimeout(200);
  await page.click("#prevBtn"); await page.waitForTimeout(200);
  const retour = await titre();
  const marqueRetour = await page.evaluate(() => { const o = document.querySelector(".opts[data-key] .opt.sel"); return o ? o.dataset.val : null; });
  ok(retour === ici, "O-59 — suivant puis précédent revient sur le même écran (« " + ici + " » → « " + retour + " »)");
  ok(marqueRetour === marque, "…avec ses marques (option « " + marque + " » → « " + marqueRetour + " »)");
  // 2 — rechargement en plein questionnaire
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const apresReload = await titre();
  ok(apresReload === ici, "O-59 — recharger revient sur le même écran (« " + apresReload + " »)");
  // 3 — recomposition forcée : l'indice devient faux, l'identité reste — l'identité gagne
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem("eb_state_v2"));
    const ap = st.plans.find((x) => x.id === st.activePlanId);
    ap.step = (ap.step || 0) + 3;                      // ce qu'un déploiement produit
    localStorage.setItem("eb_state_v2", JSON.stringify(st));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const apresDecalage = await titre();
  ok(apresDecalage === ici, "O-59 — indice corrompu (+3), identité intacte : l'écran restauré suit l'IDENTITÉ (« " + apresDecalage + " »)");
  ok(errs.length === 0, "O-59 — aucune erreur JS" + (errs.length ? " : " + errs[0].slice(0, 100) : ""));
  await page.context().close();
}

// ── U19 — LE BOUTON DÉSACTIVÉ DIT CE QU'IL ATTEND ────────────────────────────────────────
//
// Retour du fondateur (06/08/2026) : « questionnaire pour avancer ». Mesuré avant correction :
// on ARRIVE sur cinq écrans du tri sur six avec « Continuer → » désactivé, et rien à l'écran ne
// dit ce qui manque — un écran portant jusqu'à SIX questions.
//
// La garde tient les TROIS moitiés, et la troisième est celle qu'on oublierait : le message ne
// doit jamais réclamer une réponse FACULTATIVE. C'est elle qui vérifie que « ce qui manque » est
// dérivé du `valid()` de l'étape et non d'une liste de clés recopiée à côté.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  const page = await ctx.newPage();
  await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
  await page.click('.sport-card[data-sport="tri"]');
  await page.waitForTimeout(400);
  const lire = () => page.evaluate(() => {
    const z = document.getElementById("navManque");
    return { existe: !!z, visible: !!z && z.style.display !== "none",
      txt: (z && z.textContent || "").trim(), bloque: document.getElementById("nextBtn").disabled,
      live: z && z.getAttribute("aria-live") };
  });

  const vierge = await lire();
  ok(vierge.existe, "U19 — la zone de message existe sous « Continuer »");
  ok(vierge.bloque && !vierge.visible,
    "U19 — sur un écran VIERGE, on ne réclame rien (le produit ne reproche pas avant qu'on ait commencé)");

  await page.evaluate(() => document.querySelector('.opts[data-key="intent"] .opt').click());
  await page.waitForTimeout(200);
  const entame = await lire();
  ok(entame.bloque && entame.visible && /Il manque/.test(entame.txt),
    "U19 — une réponse donnée et ça bloque encore : le message arrive (« " + entame.txt + " »)");
  ok(/objectif/i.test(entame.txt),
    "U19 — et il NOMME la question qui manque, pas un message générique");
  ok(!/si connue|optionnel/i.test(entame.txt),
    "U19 — une question FACULTATIVE n'est jamais réclamée (« Date (si connue) » reste dehors)");
  ok(entame.live === "polite", "U19 — le message est annoncé aux lecteurs d'écran (aria-live)");

  // D3 — LE REQUIS DU TRI A CHANGÉ PAR DÉCISION, et ce critère l'encode : le format ne suffit
  // plus, la continuité de nage et le milieu sont exigés (arbitrage D3 §1 — sans eux le gate
  // B-17 lit une réponse que le produit ne collecte pas). On répond donc à TOUT le requis, ce
  // que ce critère a toujours voulu dire ; c'est la liste qui s'est allongée, pas la propriété.
  await page.evaluate(() => {
    for (const k of ["format", "longest_swim_known", "milieu"]) {
      const g = document.querySelector('.opts[data-key="' + k + '"]');
      if (g) g.querySelector(".opt").click();
    }
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const i = document.querySelector('[data-input="longest_swim_m"]');
    if (i) { i.value = "1200"; i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(200);
  const complet = await lire();
  ok(!complet.bloque && !complet.visible,
    "U19 — tout le requis donné : le message disparaît et « Continuer » s'active");
  await ctx.close();
}

await browser.close();
server.close();
// La suite doit SORTIR en code non nul quand elle échoue : `run-all.mjs` lit le code de
// sortie du processus, et `report()` se contente de le RENDRE. Sept suites sur dix-sept
// finissaient par `report();` — elles sortaient donc en 0 quoi qu'elles trouvent, et la
// CI les comptait vertes. Même mécanisme que le banc d'invariants d'O-9/R20.6 : un
// rapport que rien ne lit vaut zéro.
process.exit(report());
