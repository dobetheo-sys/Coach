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
//   U17 — le titre de séance (la cible la plus fréquente) atteint 44 px de haut ;
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

/** Répond aux trois diapos et chronomètre l'apparition de la séance.
 *
 *  U11 — depuis que la génération arrive sur 🗓 Plan le jour même, il faut d'abord ALLER sur
 *  🎯 Aujourd'hui : le check-in y vit toujours, il n'est simplement plus l'écran d'accueil.
 *  Le rôle de cette fonction est inchangé, c'est le point de départ qui a bougé. */
async function passeCheckin(page) {
  const bouton = page.locator('#ebTabbar .tabbtn[data-tab="today"]');
  if (await bouton.count()) {
    const actif = await page.evaluate(() => (document.querySelector("#ebTabbar .tabbtn.active") || {}).dataset?.tab);
    if (actif !== "today") { await bouton.click(); await page.waitForTimeout(500); }
  }
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

// ── U10 — la relance se dit UNE FOIS par décrochage, jamais en boucle.
//
// L'en-tête de `notifications.js` promet « UNE seule fois, jamais de rafale » depuis son
// écriture. Le garde ne couvrait que la NOTIFICATION ; le bandeau, lui, se ré-affichait à
// chaque rendu. Mesuré : présent de J+7 à J+70 sur un plan de 10 semaines — **64 jours
// d'affilée**, veille de course et JOUR J compris.
//
// Ce critère vérifie les deux moitiés : il apparaît (sinon on l'aurait éteint), et il se tait
// ensuite. Le retour pour un SECOND décrochage est vérifié à part, hors CI, parce qu'il demande
// de valider des séances sur cinq jours simulés — ici on garde le comportement quotidien.
{
  const creation = await session(LUNDI);
  await passeCheckin(creation.page);
  const st = await creation.ctx.storageState();
  await creation.ctx.close();

  const vu = [];
  for (const k of [9, 12, 16, 21]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", isMobile: true, hasTouch: true, timezoneId: "Europe/Paris", storageState: vu.etat || st });
    await ctx.addInitScript(`(()=>{const F=${LUNDI} + ${k} * 864e5;const d=F-Date.now();const R=Date;const D=function(...a){return a.length?new R(...a):new R(R.now()+d);};D.now=()=>R.now()+d;D.parse=R.parse;D.UTC=R.UTC;D.prototype=R.prototype;globalThis.Date=D;})()`);
    const page = await ctx.newPage();
    await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await passeCheckin(page);
    await page.waitForTimeout(400);
    vu.push({ k, on: await page.evaluate(() => /La vie a pris le dessus/.test(document.body.innerText || "")) });
    vu.etat = await ctx.storageState();
    await ctx.close();
  }
  const n = vu.filter((x) => x.on).length;
  ok(n === 1, "U10 — la relance se dit UNE fois par décrochage, pas en boucle (" + n + " jour" + (n > 1 ? "s" : "") + " sur " + vu.length + " : " + vu.filter((x) => x.on).map((x) => "J+" + x.k).join(", ") + ")");
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
  // U11 — le check-in n'est plus l'écran d'arrivée le jour de la création : on va le chercher
  // là où il vit. C'est le POINT DE DÉPART qui a changé, pas ce que ce critère mesure.
  await page.click('#ebTabbar .tabbtn[data-tab="today"]');
  await page.waitForTimeout(600);
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

  // U17 — LE TITRE DE SÉANCE : LA CIBLE LA PLUS FRÉQUENTE, ET LA PLUS PETITE.
  //
  // Mesuré au rendu (390 px) : 254 × 17 px. C'est le geste qu'on fait le plus — ouvrir le
  // détail d'une séance, replié par défaut depuis U16 — et c'était la seule cible du produit
  // sans marge verticale (la carte repliable voisine a `padding: 8px 0`, celle-ci avait 1 px).
  // Un doigt fait ~34 px ; WCAG 2.5.8 pose 24 en minimum absolu, et U4 a tranché 44 pour ce
  // dépôt. Ce critère porte sur le rectangle RENDU, pas sur la règle CSS : c'est la hauteur
  // effective qui compte, et elle dépend aussi de la taille de police (R16.8 peut la bouger).
  const sums = await page.evaluate(() => [...document.querySelectorAll(".gd-sess summary")]
    .map((s) => { const r = s.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width) }; })
    .filter((x) => x.w > 0));
  const mini = sums.length ? Math.min(...sums.map((x) => x.h)) : 0;
  ok(sums.length >= 3, "U17 — des titres de séance sont rendus dans la grille (" + sums.length + ")");
  ok(mini >= 44, "U17 — le titre de séance atteint 44 px de haut, le standard posé par U4 (mini mesuré : " + mini + " px)");
  await ctx.close();
}

// ── U11 — LE JOUR OÙ LE PLAN EST CRÉÉ, ON MONTRE LE PLAN.
//
// Mesuré côté client : 8 écrans et 30 gestes pour finir le questionnaire, et le premier écran
// affiché ensuite était le check-in — trois questions de plus. On vérifie les DEUX moitiés :
// le premier jour arrive sur le plan, ET le portillon du quotidien n'a pas disparu pour autant
// (un correctif qui supprimerait le check-in serait pire que le défaut).
{
  const { ctx, page } = await session(LUNDI);
  const onglet = await page.evaluate(() => (document.querySelector("#ebTabbar .tabbtn.active") || {}).dataset?.tab);
  const txt = await page.evaluate(() => (document.getElementById("screen") || {}).innerText || "");
  ok(onglet === "general", "U11 — après génération, on arrive sur le PLAN (onglet : " + onglet + ")");
  ok(!/point du (matin|jour|soir)/i.test(txt.slice(0, 400)),
    "U11 — le premier écran n'est plus un quatrième questionnaire");
  ok(/semaine|phase|plan/i.test(txt), "U11 — et c'est bien le plan qui s'y trouve");
  // Le portillon existe toujours : 🎯 Aujourd'hui demande le point du jour avant la séance.
  await page.click('#ebTabbar .tabbtn[data-tab="today"]');
  await page.waitForTimeout(600);
  const today = await page.evaluate(() => (document.getElementById("screen") || {}).innerText || "");
  ok(/point du (matin|jour|soir)/i.test(today),
    "U11 — le check-in n'a pas été supprimé, il a juste cessé d'être l'écran d'arrivée");
  await ctx.close();
}

// ── D1 — UN ÉTAT ILLISIBLE NE S'EFFACE PAS EN SILENCE.
//
// Testé en écrivant du JSON tronqué dans `eb_state_v2` : l'app repartait de zéro sans un mot ET
// le premier `ebSave` écrasait les octets d'origine. Le chemin est atteignable — la restauration
// JSON du Profil fait d'un fichier édité à la main une entrée officiellement supportée.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  const page = await ctx.newPage();
  await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("eb_state_v2", '{"plans":[{"id":"p1","sport":"run","answers":{'));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  // On force une écriture (le clic sur un sport en déclenche une) pour reproduire l'écrasement.
  await page.click('.sport-card[data-sport="run"]').catch(() => {});
  await page.waitForTimeout(400);
  const sauve = await page.evaluate(() => Object.keys(localStorage)
    .filter((k) => /^eb_state_v2_corrompu_/.test(k))
    .map((k) => localStorage.getItem(k))[0] || null);
  ok(!!sauve && sauve.startsWith('{"plans":[{"id":"p1"'),
    "D1 — l'état illisible est mis de côté au lieu d'être écrasé");
  await ctx.close();
}

// ── U14 — LE PLAN EST ATTEIGNABLE EN QUATRE ÉCRANS, ET LE SOCLE NE PEUT PAS MAIGRIR.
//
// Mesuré côté client avant le lot : 8 écrans, 30 gestes avant le premier plan — le moment où
// l'on perd des gens. Les questions ne sont pas supprimées : elles passent APRÈS le moment où
// le plan devient montrable, et ce qu'on ne répond pas prend un défaut prudent et journalisé.
//
// Ce critère garde les DEUX moitiés, et la seconde est celle qu'on oublierait : le socle
// contient toujours les réponses dont l'absence coûte une garde de sécurité. Un « raccourci »
// qui sauterait les drapeaux médicaux ou l'âge serait une régression, pas un progrès.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.click('.sport-card[data-sport="run"]');
  await page.waitForTimeout(250);
  const REP2 = { intent: "competition", format: "10k", med_pain: "non", med_dizzy: "non", med_treat: "non",
    sex: "H", sessions_max: "5", vol_max: "7", vol_recent: "3" };
  let ecrans = 0, vuSocle = { medical: false, age: false, enveloppe: false };
  for (let i = 0; i < 15; i++) {
    ecrans++;
    if (await page.locator('.opts[data-key="med_pain"]').count()) vuSocle.medical = true;
    if (await page.locator('[data-input="age"]').count()) vuSocle.age = true;
    if (await page.locator('.opts[data-key="vol_recent"]').count()) vuSocle.enveloppe = true;
    await page.evaluate(async ({ r }) => {
      const w = (m) => new Promise((x) => setTimeout(x, m));
      for (const g of document.querySelectorAll(".opts[data-key]")) {
        if (g.querySelector(".opt.sel")) continue;
        const b = r[g.dataset.key] && g.querySelector('.opt[data-val="' + r[g.dataset.key] + '"]');
        if (b) { b.click(); await w(20); }
      }
      const age = document.querySelector('[data-input="age"]');
      if (age && !age.value) { age.value = "38"; age.dispatchEvent(new Event("input", { bubbles: true })); age.dispatchEvent(new Event("change", { bubbles: true })); }
      const d = document.querySelector('[data-input="race_date"]');
      if (d && !d.value) { d.value = new Date(Date.now() + 112 * 864e5).toISOString().slice(0, 10); d.dispatchEvent(new Event("input", { bubbles: true })); d.dispatchEvent(new Event("change", { bubbles: true })); }
    }, { r: REP2 });
    await page.waitForTimeout(200);
    if (await page.locator("#genNowBtn").isVisible().catch(() => false)) { await page.click("#genNowBtn"); break; }
    const n = page.locator("#nextBtn");
    if (!(await n.count()) || !(await n.isEnabled())) break;
    await n.click();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1400);
  ok(ecrans <= 5, "U14 — le plan est atteignable en " + ecrans + " écran(s) (≤ 5 attendu)");
  ok(await page.evaluate(() => !!document.getElementById("ebTabbar")), "U14 — et c'est bien un plan qui s'affiche au bout");
  for (const [cle, vu] of Object.entries(vuSocle))
    ok(vu, "U14 — le socle contient toujours « " + cle + " » (une garde de sécurité en dépend)");
  await ctx.close();
}

// ── U15 — L'ONGLET PLAN OUVRE SUR LA SEMAINE EN COURS, ET LE RESTE EST À UN BOUTON.
//
// Mesuré sur un marathon à 390 px : l'onglet faisait 6,1 écrans de défilement et **56 % de sa
// hauteur était les grilles de semaines** — quatre dépliées d'office (les trois premières, plus
// la dernière). Ni le « pourquoi » (10 %) ni le graphique (1 %) ne faisaient le mur : ce sont
// les semaines qu'on ne regarde pas.
//
// Les deux moitiés : la vue par défaut est courte, ET le plan reste ENTIER à un bouton. Un
// raccourcissement qui rendrait des semaines inatteignables serait une perte, pas un gain.
{
  const { ctx, page } = await session(LUNDI);
  await page.click('#ebTabbar .tabbtn[data-tab="general"]');
  await page.waitForTimeout(900);
  const defaut = await page.evaluate(() => ({
    grilles: document.querySelectorAll("#screen .gw-grid").length,
    hauteur: document.body.scrollHeight,
    bouton: !!document.getElementById("allW"),
    versSemaine: !!document.getElementById("openWk"),
    resume: !!document.querySelector("#screen .zn-wk-card"),
  }));
  // R-ZENNA v6 — ce critère comptait UNE grille dans la vue par défaut. La grille en a été
  // RETIRÉE (décision du fondateur, 11/08/2026 : suivre la maquette) et remplacée par une carte
  // de résumé + un bouton vers 📅 Semaine. L'INTENTION d'U15 est inchangée — « la vue par défaut
  // est courte » — et elle est mieux servie ; on mesure donc zéro grille ET la présence du
  // chemin vers la semaine, sans quoi ce critère serait satisfait en supprimant simplement tout.
  ok(defaut.grilles === 0, "U15 — l'onglet Plan n'affiche plus de grille par défaut (" + defaut.grilles + ")");
  ok(defaut.versSemaine, "U15 — …mais il emmène vers 📅 Semaine, où la grille et la coche vivent");
  ok(defaut.resume, "U15 — …et il SITUE la semaine en cours (carte de résumé)");
  ok(defaut.hauteur < 844 * 5, "U15 — moins de 5 écrans de défilement (" + (defaut.hauteur / 844).toFixed(1) + ")");
  ok(defaut.bouton, "U15 — le bouton « Voir les N semaines » est là");
  const complet = await page.evaluate(() => {
    document.getElementById("allW").click();
    return document.querySelectorAll("#screen .gw-grid").length;
  });
  ok(complet > 5, "U15 — et il déplie TOUT le plan (" + complet + " semaines) : rien n'est devenu inatteignable");
  await ctx.close();
}

// ── U16 — LE DÉROULEMENT D'UNE SÉANCE SE DÉROULE, IL NE S'ENTASSE PAS.
//
// Retour du fondateur : « trop dense ». Mesuré en dépliant toutes les séances d'un plan
// marathon à 390 px : une VO2max sortait **296 caractères d'un seul tenant**, quatre blocs
// collés par des points médians, en 11 px gris à interligne 1,35 — le pavé le plus dense de
// l'app (1,61 caractère par pixel, devant les décisions du moteur et devant tout le reste).
//
// La garde porte sur la PROPRIÉTÉ, pas sur ma mise en page : une séance de plusieurs blocs se
// lit en autant de lignes, et aucun morceau de texte d'un seul tenant ne dépasse la longueur
// au-delà de laquelle l'œil décroche. Elle ne dit RIEN d'une puce, d'un tiret ou d'une classe —
// une garde qui décrit sa propre implémentation ne garde rien (leçon R16.8, qui vérifie des
// relations d'ordre et jamais des valeurs absolues).
{
  const { ctx, page } = await session(LUNDI);
  await page.click('#ebTabbar .tabbtn[data-tab="general"]');
  await page.waitForTimeout(900);
  const m = await page.evaluate(async () => {
    // L'INSTRUMENT NE DOIT PAS LIRE SA PROPRE SORTIE. Ma première écriture comptait les points
    // médians dans le texte RENDU pour savoir combien de blocs porte une séance — or c'est
    // précisément ce que la mise en page vient de remplacer par des retours à la ligne. Elle
    // trouvait 0 séance à plusieurs blocs sur un plan qui en est plein, et aurait donc été
    // satisfaite par n'importe quoi. Même famille que les quatre mesures démasquées en R20 :
    // une grandeur lue APRÈS la transformation qu'elle est censée juger. Le nombre de blocs se
    // lit donc sur le MODÈLE (`s.det`, que l'UI ne touche pas), le nombre de lignes sur le DOM.
    const { S } = await import("./js/state.js");
    const attendu = new Set();
    for (const w of S.currentPlan.weeks) for (const d of w.days) for (const s of d.sessions) {
      if (!s.det) continue;
      if (s.det.split(" — \u{1F4A1} ")[0].split(" \u00b7 ").length > 1) attendu.add(s.name);
    }
    document.getElementById("allW").click();
    document.querySelectorAll("#screen details.gd-sess").forEach((d) => { d.open = true; });
    const rendu = [];
    let pire = 0, pireTxt = "";
    for (const d of document.querySelectorAll("#screen details.gd-sess")) {
      const corps = d.querySelector(".gd-det, .gd-steps");
      if (!corps) continue;
      const nom = (d.querySelector("summary") || {}).textContent || "";
      if (corps.querySelectorAll("li").length > 1) rendu.push(nom.trim());
      for (const t of (corps.innerText || "").split(/\n+/)) {
        if (t.trim().length > pire) { pire = t.trim().length; pireTxt = t.trim().slice(0, 60); }
      }
    }
    // 08/08/2026 — le résumé porte désormais aussi la durée après le nom (« Sweetspot vélo
    // 1h28 ») : une comparaison EXACTE au nom du modèle (`s.name`) casse dès qu'un texte
    // légitime s'ajoute après. Le nom reste le PRÉFIXE du résumé — `startsWith` plutôt qu'une
    // égalité, sans rien perdre de ce que le critère vérifie (la présence, en plusieurs lignes).
    const manquantes = [...attendu].filter((n) => !rendu.some((r) => r.startsWith(n)));
    return { multi: attendu.size, listees: attendu.size - manquantes.length, manquantes: manquantes.slice(0, 3), pire, pireTxt };
  });
  ok(m.multi > 0, "U16 — l'instrument voit des séances à plusieurs blocs (" + m.multi + ")");
  ok(m.listees === m.multi,
    "U16 — chacune se lit en plusieurs lignes (" + m.listees + "/" + m.multi + ")"
    + (m.manquantes.length ? " — non déroulée(s) : " + m.manquantes.join(", ") : ""));
  ok(m.pire <= 180,
    "U16 — plus aucun pavé d'un seul tenant (le plus long fait " + m.pire + " car. : « " + m.pireTxt + "… »)");
  await ctx.close();
}

// ── U18 — L'EXPLICATION SE DEMANDE, L'AVERTISSEMENT S'IMPOSE ────────────────────────────
//
// Le « ? » replie de la PÉDAGOGIE. La garde tient les deux moitiés, et c'est la seconde qui
// compte : un avertissement derrière un geste est un avertissement supprimé pour tous ceux qui
// ne font pas le geste. Le disclaimer nutrition est asserté en CI par `demo:nutrition` ; ici on
// vérifie qu'il reste VISIBLE à l'écran, ce qu'aucun test de moteur ne peut voir.
{
  // On réutilise le helper de CE fichier (`session`) : il traverse le questionnaire à une date
  // figée. Ma première écriture appelait `traverserQuestionnaire`, qui n'est pas importé ici —
  // la suite MOURAIT avant de rapporter. Elle sortait bien en code non nul, donc `run-all` la
  // voyait ; mais c'est le mécanisme que R22b a documenté, et il ne coûte rien de l'éviter.
  const { ctx, page } = await session(Date.UTC(2026, 7, 5, 9, 0));
  await page.click('#ebTabbar .tabbtn[data-tab="profile"]').catch(() => {});
  await page.waitForTimeout(700);

  const m = await page.evaluate(() => {
    const b = document.querySelector(".aide-btn");
    if (!b) return { aucun: true };
    const r = b.getBoundingClientRect();
    const cible = document.getElementById(b.dataset.aide);
    // La cible tactile est la zone invisible (::after), pas le rond : on lit ce que le doigt
    // atteint réellement, pas la règle CSS — leçon U17.
    const zone = 44;
    return { n: document.querySelectorAll(".aide-btn").length, w: Math.round(r.width), h: Math.round(r.height), zone,
      replie: cible ? cible.hasAttribute("hidden") : null,
      aria: b.getAttribute("aria-expanded"), label: b.getAttribute("aria-label") || "" };
  });
  ok(!m.aucun && m.n > 0, "U18 — le bouton « ? » existe au Profil (" + (m.n || 0) + ")");
  ok(m.replie === true, "U18 — l'explication est REPLIÉE par défaut (c'est tout l'objet du lot)");
  ok(m.aria === "false", "U18 — et l'état est annoncé aux lecteurs d'écran (aria-expanded)");
  ok(/^Aide : /.test(m.label), "U18 — le bouton dit CE QU'il explique (« " + m.label + " »)");

  await page.click(".aide-btn");
  await page.waitForTimeout(250);
  const apres = await page.evaluate(() => {
    const b = document.querySelector(".aide-btn");
    const c = document.getElementById(b.dataset.aide);
    return { visible: c ? !c.hasAttribute("hidden") : false, aria: b.getAttribute("aria-expanded"),
      txt: c ? (c.textContent || "").trim().length : 0 };
  });
  ok(apres.visible && apres.txt > 20, "U18 — un appui DÉROULE le texte (" + apres.txt + " car.)");
  ok(apres.aria === "true", "U18 — aria-expanded suit l'état");

  // LA MOITIÉ QUI COMPTE : rien de ce qui AVERTIT ne se cache derrière un « ? ».
  // 07/08/2026 — Nutrition vit sous 🧰 Outils (sous-onglet par défaut) ; le principe U18 tient
  // toujours : une fois la carte affichée, l'avertissement est en clair, jamais derrière une
  // infobulle. On force l'ouverture des `<details>` restants ci-dessous (défensif — la version
  // COMPLÈTE de la carte n'en a pas besoin, mais un futur outil pourrait en ajouter).
  await page.click('#ebTabbar .tabbtn[data-tab="outils"]').catch(() => {});
  await page.waitForTimeout(700);
  const nut = await page.evaluate(() => {
    [...document.querySelectorAll("#screen details")].forEach((d) => { d.open = true; });
    const txt = document.body.innerText;
    const cache = [...document.querySelectorAll(".aide-txt")].map((e) => e.textContent || "").join(" ");
    return { visible: /ESTIMATION|pas une consigne|diététicien|professionnel/i.test(txt),
      dansAide: /diététicien|professionnel de santé|pas une consigne/i.test(cache) };
  });
  ok(nut.visible, "U18 — l'avertissement nutrition reste VISIBLE, jamais replié");
  ok(!nut.dansAide, "U18 — et aucun avertissement n'est passé derrière un « ? »");

  // ── U18b — LA CARTE DE RÉFÉRENCES EST REPLIÉE, ET RIEN N'EST DEVENU INATTEIGNABLE ──────
  //
  // Deux moitiés, comme U15. La première seule serait satisfaite en SUPPRIMANT la carte ; la
  // seconde seule serait satisfaite en ne repliant rien.
  //
  // NOTE D'INSTRUMENT, et elle vaut d'être écrite : la grandeur mesurée ici est
  // `document.body.scrollHeight`, PAS la somme des rectangles de prose. Dans ce Chromium, un
  // élément dans un `<details>` fermé rend encore un rectangle non nul — l'instrument de mesure
  // de prose (`prose.mjs`) affichait donc 770 px de prose AVANT comme APRÈS le repli, aveugle à
  // ce qui venait de changer. C'est la famille de fautes que ce dépôt a nommée neuf fois : une
  // mesure qui porte sur une grandeur voisine de celle qu'elle nomme. Le défilement est la
  // grandeur que la personne subit, donc c'est elle qu'on épingle.
  await page.click('#ebTabbar .tabbtn[data-tab="profile"]').catch(() => {});
  await page.waitForTimeout(700);
  const refs = await page.evaluate(() => {
    const carte = [...document.querySelectorAll("details.load-card")]
      .find((d) => /Références d/.test((d.querySelector("summary") || {}).textContent || ""));
    return { existe: !!carte, ouverte: carte ? carte.open : null,
      h: Math.round(carte ? carte.getBoundingClientRect().height : 0),
      page: document.body.scrollHeight, vp: window.innerHeight,
      champs: ["pfVol", "pfSess", "pfVolRecent", "pfSave"].filter((id) => document.getElementById(id)).length };
  });
  ok(refs.existe && refs.ouverte === false,
    "U18b — la carte « ⚙ Références d'entraînement » est REPLIÉE par défaut (" + refs.h + " px)");
  ok(refs.page / refs.vp < 4,
    "U18b — le Profil tient sous 4 écrans (" + (refs.page / refs.vp).toFixed(1) + ")");
  ok(refs.champs === 4,
    "U18b — les champs du formulaire sont toujours dans la page (" + refs.champs + "/4)");

  // La carte peut être ABSENTE (c'est le cas que K2 fabrique en retirant le repli). Sans ce
  // garde-fou, l'évaluation lève, la suite MEURT, et elle sort bien en code 1 — mais sans
  // publier une seule ligne `FAIL`. C'est le mécanisme que R22b a nommé : un critère qui tue
  // son harnais au lieu de rapporter ne dit à personne CE QUI a cassé.
  const depli = await page.evaluate(() => {
    const carte = [...document.querySelectorAll("details.load-card")]
      .find((d) => /Références d/.test((d.querySelector("summary") || {}).textContent || ""));
    if (!carte) return { absente: true, h: 0, vol: false, save: false };
    carte.open = true;
    const vu = (id) => { const e = document.getElementById(id); return !!e && e.getBoundingClientRect().width > 0; };
    return { h: Math.round(carte.getBoundingClientRect().height), vol: vu("pfVol"), save: vu("pfSave") };
  });
  ok(depli.h > 400 && depli.vol && depli.save,
    "U18b — et un geste rend TOUT le formulaire (" + depli.h + " px, « Enregistrer » compris)");

  // Le « ? » vit dans un titre, et certains titres sont des `<summary>` : un appui ne doit pas
  // faire deux choses à la fois. Ce que ce critère protège n'est PAS une ligne de code — c'est
  // le fait que `aide()` rende un élément INTERACTIF (`<button>`), seule raison pour laquelle
  // l'« activation behavior » du `<summary>` ne se déclenche pas. Vérifié rouge en remplaçant le
  // `<button>` par un `<span>` ; vérifié VERT avec et sans `preventDefault()`, ce qui est
  // précisément ce qui a fait retirer ce `preventDefault()` de `help.js` comme inerte.
  const dbl = await page.evaluate(() => {
    const b = [...document.querySelectorAll("summary .aide-btn")][0];
    if (!b) return { sansObjet: true };
    const det = b.closest("details");
    const avant = det.open;
    b.click();
    return { avant, apres: det.open, aide: !document.getElementById(b.dataset.aide).hasAttribute("hidden") };
  });
  ok(dbl.sansObjet || (dbl.aide && dbl.apres === dbl.avant),
    "U18b — le « ? » posé dans un titre repliable déroule l'aide SANS ouvrir la carte");
  await ctx.close();
}

// ── R23.4 — LA CARTE DE PARTAGE SE POSE SUR UNE PHOTO ────────────────────────────────────
//
// Deux propriétés, et la seconde est celle qui tient quoi qu'il arrive : le fond est TRANSPARENT
// (sans quoi « par-dessus une photo » n'a pas de sens), et RIEN NE DÉBORDE du cadre — quelle que
// soit la police effectivement utilisée, puisque `txt()` rétrécit une ligne trop large.
{
  const { ctx, page } = await session(Date.UTC(2026, 7, 5, 9, 0));
  const m = await page.evaluate(async () => {
    const mod = await import("./js/export.js");
    const canvases = [];
    const vrai = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (cb, t) { canvases.push(this); return vrai.call(this, cb, t); };
    await mod.exportPNG();
    await new Promise((r) => setTimeout(r, 400));
    HTMLCanvasElement.prototype.toBlob = vrai;
    const c = canvases[0];
    if (!c) return { err: true };
    const x = c.getContext("2d");
    const a = (px, py) => x.getImageData(px, py, 1, 1).data[3];
    const coins = [a(2, 2), a(c.width - 3, 2), a(2, c.height - 3), a(c.width - 3, c.height - 3)];
    const full = x.getImageData(0, 0, c.width, c.height).data;
    let droite = 0, encre = 0;
    for (let py = 0; py < c.height; py++) for (let pxx = c.width - 1; pxx > droite; pxx--)
      if (full[(py * c.width + pxx) * 4 + 3] > 30) { droite = pxx; break; }
    for (let i = 3; i < full.length; i += 4) if (full[i] > 200) encre++;
    return { w: c.width, coins, droite, encre };
  });
  ok(!m.err, "R23.4 — la carte de partage se rend (canvas produit)");
  ok(!m.err && m.coins.every((v) => v === 0),
    "R23.4 — le fond est TRANSPARENT aux quatre coins (" + (m.coins || []).join(",") + ")");
  ok(!m.err && m.encre > 5000, "R23.4 — et la carte n'est pas vide pour autant (" + m.encre + " pixels d'encre)");
  ok(!m.err && m.droite < m.w - 20,
    "R23.4 — rien ne déborde du cadre (pixel le plus à droite : " + m.droite + "/" + m.w + ")");

  // R24.4 — MÊME CONTRAT POUR L'IMAGE POST-SÉANCE (story 9:16 et carte 1:1) : fond
  // transparent, encre présente, plaque claire sous l'avatar (sans elle la silhouette sombre
  // disparaît sur une photo de nuit — on vérifie qu'un pixel du centre est CLAIR et opaque).
  for (const fmt of ["story", "square"]) {
    const st = await page.evaluate(async (f) => {
      const mod = await import("./js/export.js");
      const blob = await mod.storyBlob({ sessionName: "Sweetspot vélo", detail: "3×12min — récup 5min", sport: "tri", streak: 4, accent: "#ff7a1a",
        avatarSVG: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110"><circle cx="50" cy="30" r="14" fill="#16130e"/></svg>' }, f);
      if (!blob) return { err: true };
      const bmp = await createImageBitmap(blob);
      const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
      const x = c.getContext("2d"); x.drawImage(bmp, 0, 0);
      const px = (X, Y) => [...x.getImageData(X, Y, 1, 1).data];
      const coin = px(2, Math.round(bmp.height / 2)), centre = px(Math.round(bmp.width / 2), f === "square" ? 420 : 640);
      let encre = 0; const full = x.getImageData(0, 0, bmp.width, bmp.height).data;
      for (let i = 3; i < full.length; i += 4) if (full[i] > 200) encre++;
      return { w: bmp.width, h: bmp.height, coinAlpha: coin[3], centre, encre };
    }, fmt);
    ok(!st.err && st.coinAlpha === 0 && st.encre > 5000,
      "R24.4 — l'image post-séance (" + fmt + ") est transparente hors encre (" + (st.err ? "erreur" : st.coinAlpha + " · " + st.encre + " px d'encre") + ")");
    ok(!st.err && st.centre[3] > 200 && st.centre[0] > 180 && st.centre[1] > 170,
      "R24.4 — la plaque claire porte l'avatar (centre " + (st.centre || []).join(",") + ") : lisible sur photo sombre");
  }
  await ctx.close();
}

// ── R23.5 / R23.6 / R23.7 / R23.9 / R23.12 — LES DÉPLACEMENTS ───────────────────────────
//
// Ce bloc garde l'ORDRE et l'APPARTENANCE, pas la mise en page : ce qu'on vient voir en premier
// dans 🗓 Plan, et ce que 🎯 Aujourd'hui ne porte plus. Les deux moitiés comptent — la seconde
// interdit qu'une carte soit dupliquée dans les deux onglets au lieu d'y être déplacée.
{
  const { ctx, page } = await session(Date.UTC(2026, 7, 5, 9, 0));
  await page.click('#ebTabbar .tabbtn[data-tab="general"]').catch(() => {});
  await page.waitForTimeout(800);
  const plan = await page.evaluate(() => {
    const t = document.querySelector("#screen").textContent || "";
    const pos = (re) => { const m = t.match(re); return m ? m.index : -1; };
    return { t, decompte: /J−\d+/.test(t), avancement: /Semaine \d+ \/ \d+/.test(t),
      partage: !!document.getElementById("expPng"),
      posAvancement: pos(/Semaine \d+ \/ \d+/), posPourquoi: pos(/Pourquoi ce plan/),
      pred: /Prédiction de course/.test(t), intens: /Répartition des intensités/.test(t),
      libelles: /Version imprimable/.test(t) && /Ajouter à mon agenda/.test(t) && !/🖼 PNG/.test(t) };
  });
  ok(plan.decompte, "R23.5 — le décompte des jours avant la course est en tête de 🗓 Plan");
  ok(plan.avancement, "R23.5 — l'avancement du plan aussi (semaine N / total)");
  ok(plan.partage, "R23.12 — et le bouton « 📤 Partage » est sous l'avancement");
  ok(plan.posAvancement >= 0 && plan.posPourquoi > plan.posAvancement,
    "R23.6 — « Pourquoi ce plan » vient APRÈS l'avancement, plus avant (l'info d'abord)");
  ok(plan.pred && plan.intens, "R23.7 / R23.9 — la prédiction et les intensités vivent dans 🗓 Plan");
  ok(plan.libelles, "R23.12c — les exports portent des noms lisibles (imprimable · agenda), plus « PNG »");

  // R24.5 / R24.6 (retour fondateur, 06/08 soir) — la Prédiction ouvre sur le TEMPS TOTAL
  // (aujourd'hui + fin de plan), le détail par segment est un dépliable ; et la courbe de
  // charge porte le marqueur « tu es ici » à la semaine courante.
  const pred24 = await page.evaluate(() => {
    [...document.querySelectorAll("#screen details")].forEach((d) => { d.open = true; });
    const t = document.querySelector("#screen").textContent || "";
    const nid = [...document.querySelectorAll("#screen details summary")]
      .find((x) => /Le détail, segment par segment/.test(x.textContent || ""));
    return {
      auj: /Courue aujourd’hui : /.test(t.replace(/\s+/g, " ")),
      proj: /plan suivi : /.test(t.replace(/\s+/g, " ")),
      detailRepliable: !!nid,
      detailContenu: nid ? /ta forme mesurée/.test(nid.parentElement.textContent || "") : false,
    };
  });
  ok(pred24.auj && pred24.proj, "R24.5 — la Prédiction ouvre sur le temps total : courue aujourd'hui ET à la fin du plan");
  ok(pred24.detailRepliable && pred24.detailContenu,
    "R24.5 — le détail segment par segment vit dans un dépliable, et il contient bien la forme mesurée");

  await page.click('#ebTabbar .tabbtn[data-tab="today"]').catch(() => {});
  await page.waitForTimeout(800);
  const auj = await page.evaluate(() => {
    const t = document.querySelector("#screen").textContent || "";
    return { pred: /Prédiction de course/.test(t), intens: /Répartition des intensités/.test(t),
      direct: /Suivre ma séance en direct/.test(t) };
  });
  ok(!auj.pred, "R23.7 — …et elles ont bien QUITTÉ 🎯 Aujourd'hui (déplacées, pas dupliquées)");
  await passeCheckin(page);
  await page.waitForTimeout(600);
  const marqueur = await page.evaluate(() => {
    const svg = [...document.querySelectorAll("#screen svg")].find((x) => /tu es ici|Courbe de charge/.test(x.outerHTML));
    return { svgTrouve: !!svg, iciTexte: !!svg && svg.outerHTML.includes("tu es ici") };
  });
  ok(marqueur.svgTrouve && marqueur.iciTexte,
    "R24.6 — la courbe de charge marque visuellement « tu es ici » à la semaine courante");

  // R24.9 — la nutrition vit RÉDUITE dans 🎯 Aujourd'hui, sans y avoir son propre onglet.
  // 07/08/2026 — l'onglet dédié n'a pas disparu pour de bon : 🧰 Outils lui redonne un
  // cinquième onglet (version COMPLÈTE, tunnel de commande compris), la barre revient à 5.
  const nut24 = await page.evaluate(() => {
    const t = document.querySelector("#screen").textContent || "";
    return { onglets: document.querySelectorAll("#ebTabbar .tabbtn").length,
      boutonNutrition: !!document.querySelector('#ebTabbar .tabbtn[data-tab="nutrition"]'),
      section: /🥗 Nutrition du jour|Dépense estimée du jour/.test(t), ravito: /Ravitaillement/.test(t),
      seanceAujourdhui: /séance/i.test((document.querySelector("#screen") || {}).textContent || "") };
  });
  const jourAvecSeance = await page.evaluate(async () => {
    const { S, todayISO } = await import("./js/state.js");
    let day = null;
    (S.currentPlan || { weeks: [] }).weeks.forEach((w) => w.days.forEach((d) => { if (d.date === todayISO()) day = d; }));
    return !!(day && day.sessions.some((x) => x.d !== "rs"));
  });
  ok(nut24.onglets === 5 && !nut24.boutonNutrition,
    "R24.9 — la barre compte 5 onglets (🧰 Outils a repris la place de Nutrition, jamais un bouton nommé « nutrition »)");
  ok(nut24.section && (nut24.ravito || !jourAvecSeance),
    "R24.9 — …et la nutrition du jour vit en version réduite dans 🎯 Aujourd'hui (ravito dès qu'il y a une séance"
    + (jourAvecSeance ? "" : " — jour de repos aujourd'hui, dépense seule") + ")");

  // R24.8 — l'en-tête de 📅 Semaine résume les distances par discipline. Le profil de la
  // suite (tri, FTP + allure + CSS + poids connus) permet les trois conversions : les km
  // portent le « ~ » qui signale une estimation dérivée des références.
  await page.click('#ebTabbar .tabbtn[data-tab="week"]').catch(() => {});
  await page.waitForTimeout(700);
  const km24 = await page.evaluate(() => {
    const t = (document.querySelector("#screen").textContent || "").replace(/\s+/g, " ");
    return { run: /🏃 ~[\d,]+ km/.test(t), bike: /🚴 ~[\d,]+ km/.test(t), swim: /🏊 ~?[\d,]+ km/.test(t) };
  });
  ok(km24.run && km24.bike && km24.swim,
    "R24.8 — 📅 Semaine ouvre sur les distances par discipline (course, vélo, nage), estimations marquées ~");
  ok(!auj.intens, "R23.9 — idem pour la répartition des intensités");
  // MESURE SUR LE MODULE, PAS SUR UN JOUR ÉCHANTILLONNÉ. Ma première écriture lisait le texte
  // rendu — et elle passait alors que le bloc était TOUJOURS LÀ : le jour tiré au sort n'avait
  // pas de séance, donc la liste était vide. Un critère satisfait par le hasard de la date ne
  // garde rien ; on interroge donc le source servi, qui ne dépend d'aucun jour.
  const src = await page.evaluate(async () => (await (await fetch("./js/ui/tab-today.js")).text()));
  ok(!auj.direct && !/summary class="load-title">⏱ Suivre ma séance en direct/.test(src),
    "R23.12b — « suivre ma séance en direct » est supprimé (absent du module, pas seulement du rendu du jour)");

  // R23.10 / R23.11 / R23.12b — le Profil se recentre sur QUI TU ES.
  await page.click('#ebTabbar .tabbtn[data-tab="profile"]').catch(() => {});
  await page.waitForTimeout(700);
  const prof = await page.evaluate(() => {
    const t = document.querySelector("#screen").textContent || "";
    return { conseils: /Conseils personnalisés/.test(t), rappel: /🔔 Rappel quotidien/.test(t),
      champRappel: !!document.getElementById("pfNotif"),
      edit: !!document.getElementById("pfEdit"), reset: !!document.getElementById("pfReset") };
  });
  ok(!prof.conseils, "R23.10 — les conseils personnalisés ont quitté 📋 Profil");
  ok(prof.rappel && prof.champRappel, "R23.11 — le rappel quotidien a sa propre carte, hors des références repliées");
  ok(!prof.edit && !prof.reset, "R23.12b — « modifier mes réponses » et « changer de sport » ne sont plus au Profil");

  // R24 (retour fondateur, 06/08 soir) — le Profil sépare l'ATHLÈTE de la COURSE, et Strava
  // monte en premier écran. Les critères regardent l'ORDRE DOM et l'APPARTENANCE aux cartes,
  // pas seulement la présence : « présent quelque part » est ce qui a laissé vivre le défaut.
  const r24 = await page.evaluate(() => {
    const screen = document.querySelector("#screen");
    const cards = [...screen.querySelectorAll(".load-card")];
    const cardOf = (el) => { for (let p = el; p; p = p.parentElement) if (p.classList && p.classList.contains("load-card")) return p; return null; };
    const titre = (c) => (c.querySelector(".load-title") || {}).textContent || "";
    // NOTE D'INSTRUMENT — matcher le DÉBUT du titre, pas son contenu : l'infobulle aide() vit
    // DANS l'élément de titre, et celle de « 🏁 Ta course » cite « ⚙ Références d'entraînement »
    // — une regex libre attrapait donc la carte course comme carte références (nRefs: 2).
    const parTitre = (prefixe) => cards.find((c) => titre(c).trim().startsWith(prefixe));
    const stravaCard = parTitre("🔗 Strava");
    const refsCard = parTitre("⚙ Références");
    const raceCard = parTitre("🏁 Ta course");
    const cp = document.getElementById("pfCourseProfile");
    const recCard = cards.find((c) => /🏅 Records personnels/.test(titre(c)));
    let recOverflow = false;
    if (recCard) { recCard.open = true; recOverflow = recCard.scrollWidth > recCard.clientWidth + 1; }
    return {
      stravaAvantRefs: !!(stravaCard && refsCard) && cards.indexOf(stravaCard) < cards.indexOf(refsCard),
      connectUnique: document.querySelectorAll("#pfStravaConnect").length === 1,
      raceCarte: !!raceCard, cpDansRace: !!(cp && cardOf(cp) === raceCard),
      cpHorsRefs: !!(cp && refsCard && cardOf(cp) !== refsCard),
      saveRace: !!document.getElementById("pfSaveRace"),
      recOverflow,
    };
  });
  ok(r24.stravaAvantRefs && r24.connectUnique,
    "R24.2 — la carte 🔗 Strava vit AVANT les références (premier écran), et le bouton de connexion n'existe qu'une fois");
  ok(r24.raceCarte && r24.cpDansRace && r24.cpHorsRefs && r24.saveRace,
    "R24.3 — « 🏁 Ta course » existe, porte le profil du parcours (sorti des références) et son propre Enregistrer");
  // R24.1 — LE CRITÈRE A BESOIN DE LA MATIÈRE DU SYMPTÔME. Vérifié : sans record dans l'état,
  // la cassure (retour au flex sans retour à la ligne) restait VERTE — une carte vide ne
  // déborde de rien. On injecte donc un record d'allure et une plus longue séance datée (le
  // couple libellé long + valeur + date du défaut réel), on re-rend, puis on mesure.
  // La cassure d'origine (regex non-gourmande de `repliable`) a été vérifiée ROUGE par ce
  // critère AVANT le correctif : le <details> ne contenait que le titre, les lignes rendues
  // hors du cadre — le symptôme exact du retour fondateur.
  const injecte = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("eb_state_v2"));
    const pl = (raw.plans && raw.plans.find((x) => x.id === raw.activePlanId)) || (raw.plans || [])[0];
    if (!pl) return "aucun plan";
    pl.answers = pl.answers || {};
    pl.answers.tests = (pl.answers.tests || []).concat([{ type: "thrPace", value: 292, date: "2026-08-01", source: "import strava (activité 1234567890)" }]);
    pl.answers.fitSessions = (pl.answers.fitSessions || []).concat([{ d: "rn", minutes: 222, date: "2026-08-02" }]);
    localStorage.setItem("eb_state_v2", JSON.stringify(raw));
    return true;
  });
  if (injecte !== true) throw new Error("R24.1 : impossible d'injecter les records de test");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.click('#ebTabbar .tabbtn[data-tab="profile"]').catch(() => {});
  await page.waitForTimeout(700);
  const rec = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#screen .load-card")];
    const c = cards.find((x) => (((x.querySelector(".load-title") || {}).textContent) || "").trim().startsWith("🏅 Records"));
    if (!c) return { present: false };
    c.open = true;
    return { present: true, overflow: c.scrollWidth > c.clientWidth + 1, lignes: c.textContent.includes("plus longue séance") };
  });
  ok(rec.present && rec.lignes && !rec.overflow,
    "R24.1 — avec de VRAIS records (allure importée + plus longue séance), la carte ne déborde pas de son cadre");

  // R24.7 — le réglage du rappel a quitté 🎯 Aujourd'hui : mesuré sur le MODULE SERVI (la
  // carte ne s'affichait qu'avant tout réglage — un état que le parcours de test a déjà
  // dépassé, donc le rendu ne discrimine pas ; leçon R23.12b).
  const srcToday = await page.evaluate(async () => (await (await fetch("./js/ui/tab-today.js")).text()));
  ok(!/notifySetupHTML\(\)/.test(srcToday),
    "R24.7 — 🎯 Aujourd'hui n'appelle plus la carte « Rappel de séance » (le Profil est le seul foyer du réglage)");

  await page.click('#ebTabbar .tabbtn[data-tab="general"]').catch(() => {});
  await page.waitForTimeout(700);
  const surPlan = await page.evaluate(() => {
    const t = document.querySelector("#screen").textContent || "";
    return { conseils: /Conseils personnalisés/.test(t),
      edit: !!document.getElementById("backBp"), reset: !!document.getElementById("restartBtn") };
  });
  ok(surPlan.conseils, "R23.10 — …et ils sont bien ARRIVÉS dans 🗓 Plan (déplacés, pas supprimés)");
  ok(surPlan.edit && surPlan.reset,
    "R23.12b — modifier et changer de sport restent atteignables, à un seul endroit (🗓 Plan)");
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
