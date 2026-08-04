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
  }));
  ok(defaut.grilles === 1, "U15 — l'onglet Plan ouvre sur UNE semaine (" + defaut.grilles + ")");
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
    const rendu = new Set();
    let pire = 0, pireTxt = "";
    for (const d of document.querySelectorAll("#screen details.gd-sess")) {
      const corps = d.querySelector(".gd-det, .gd-steps");
      if (!corps) continue;
      const nom = (d.querySelector("summary") || {}).textContent || "";
      if (corps.querySelectorAll("li").length > 1) rendu.add(nom.trim());
      for (const t of (corps.innerText || "").split(/\n+/)) {
        if (t.trim().length > pire) { pire = t.trim().length; pireTxt = t.trim().slice(0, 60); }
      }
    }
    const manquantes = [...attendu].filter((n) => !rendu.has(n));
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

await browser.close();
server.close();
// La suite doit SORTIR en code non nul quand elle échoue : `run-all.mjs` lit le code de
// sortie du processus, et `report()` se contente de le RENDRE. Sept suites sur dix-sept
// finissaient par `report();` — elles sortaient donc en 0 quoi qu'elles trouvent, et la
// CI les comptait vertes. Même mécanisme que le banc d'invariants d'O-9/R20.6 : un
// rapport que rien ne lit vaut zéro.
process.exit(report());
