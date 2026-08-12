// R-ZENNA — LA GARDE DU RESKIN ANIMÉ DE 🎯 AUJOURD'HUI.
//
// Aucune des vingt autres suites ne regarde ça : elles mesurent ce que le moteur PRODUIT et
// ce que la personne LIT, jamais ce qui BOUGE. Or le mouvement, ici, n'est pas décoratif —
// il porte l'opacité. `.rise` met les cartes à `opacity: 0` en attendant leur animation :
// si cette animation ne part pas, l'onglet est VIDE, et aucune assertion de contenu ne le
// verrait (le texte est bien dans le DOM, il est juste invisible).
//
// C'est arrivé en construisant ce lot, et c'est la raison d'être du §1 : ma règle de reset des
// cartes (`body.theme-zenna #screen .card`, avec un ID) battait la règle de cascade
// (`.zn-play .rise`, classes seules) et son `animation: none` gelait les huit cartes à zéro.
// Troisième occurrence dans ce dépôt de « un correctif que la cascade annule est un correctif
// qu'on croit avoir » (R18.1, U16).
//
// Trois volets, chacun garde une moitié différente :
//   §1 le mouvement FAIT son travail (cascade terminée, confettis/XP/coche/toast au bon geste,
//      et les particules se nettoient — une fuite de nœuds serait invisible à l'œil) ;
//   §2 `prefers-reduced-motion` NEUTRALISE tout SANS rien cacher — le piège symétrique :
//      couper l'animation sans repli laisserait `opacity: 0` en place ;
//   §3 les quatre autres onglets ne sont pas contaminés (thème retiré, fond papier conservé,
//      aucun élément flottant qui traîne) — le reskin est scopé, cette suite le prouve.
//
// Note d'instrument : la cascade se termine à ~1520 ms (7 × 114 ms de décalage + 720 ms). Une
// première écriture mesurait à 1500 ms et lisait `0.999796` — un échec qui n'en était pas un.
// Les attentes de ce fichier sont calées SUR la cadence déclarée, pas au jugé.
import { startServer, launchBrowser, makeReporter } from "./harness.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PORT = 8611;
const server = await startServer(PORT);
const { ok, report } = makeReporter();

// ══════════════════════════════════════════════════════════════════════
// §0 — LES TABLES DE ZONES DE L'UI COUVRENT TOUTES LES ZONES DU MOTEUR.
// ══════════════════════════════════════════════════════════════════════
// Ce critère est DÉRIVÉ du moteur, pas d'une liste tenue à la main : on lit les zones que
// `src/generator/renderer.ts` déclare, et on exige que les deux tables de l'UI les connaissent
// toutes. Aucune liste à maintenir ici — une zone ajoutée demain au moteur fait rougir ce
// test le jour même. C'est le motif d'`audit:sensibilite` (dérivé du schéma) appliqué aux zones.
//
// POURQUOI CE CRITÈRE EXISTE — deux défauts trouvés en auditant R-ZENNA :
//   · `ZONE_LEVEL` (barre de zones du reskin) oubliait `sw.vo2` et LES SEPT ZONES DE TRAIL.
//     Repli silencieux en Z2 : un plan trail affichait des barres uniformément « facile », y
//     compris sur `tr.vam` que le moteur décrit « RPE 9/10 — montée à fond ».
//   · `_IFZ` (courbe fitness/fatigue/forme, `plan-view.js`) avait EXACTEMENT le même trou, et
//     depuis bien plus longtemps — R7 pour le trail, R5.4 pour `sw.vo2`. Son repli est `0.70`
//     et la charge varie en IF² : mesuré sur un ultra, **6 891 minutes de corps** tombaient sur
//     des zones inconnues. Le seuil en montée était compté ×0,51, la montée souple ×1,36 — le
//     contraste dur/facile de toute la courbe du sport trail était aplati.
// Un repli prudent sur une grandeur AFFICHÉE n'est pas prudent : il est faux sans le dire.
{
  const lire = (p) => readFileSync(fileURLToPath(new URL("../../" + p, import.meta.url)), "utf8");
  const zonesMoteur = [...new Set((lire("src/generator/renderer.ts").match(/^\s+"[a-z]{2}\.[a-z0-9]+":/gm) || [])
    .map((s) => s.trim().replace(/[":]/g, "")))];
  ok(zonesMoteur.length >= 20, "§0 — les zones du moteur sont lues depuis renderer.ts (" + zonesMoteur.length + ")");
  for (const [nom, fichier, motif] of [
    ["ZONE_LEVEL (barre de zones)", "endurabuild/js/ui/zenna-motion.js", /const ZONE_LEVEL = \{[\s\S]*?\n\};/],
    ["_IFZ (courbe de charge)", "endurabuild/js/ui/plan-view.js", /const _IFZ=\{[\s\S]*?\};/],
  ]) {
    const bloc = (motif.exec(lire(fichier)) || [""])[0];
    const connues = new Set((bloc.match(/"[a-z]{2}\.[a-z0-9]+"/g) || []).map((s) => s.replace(/"/g, "")));
    const manquantes = zonesMoteur.filter((z) => !connues.has(z));
    ok(manquantes.length === 0, "§0 — " + nom + " couvre les " + zonesMoteur.length + " zones du moteur"
      + (manquantes.length ? " — MANQUANTES : " + manquantes.join(", ") : ""));
  }
}

const browser = await launchBrowser();

// ══════════════════════════════════════════════════════════════════════
// §0bis — LES FEUILLES DU THÈME SE CHARGENT EN DERNIER, ET LE <head> EST SAIN.
// ══════════════════════════════════════════════════════════════════════
// `styles.css` porte des règles de MÊME spécificité que le thème — par exemple
// `body[data-intent="competition"] { background: #f3e9dd }`, un fond CRÈME appliqué dès qu'un
// plan de compétition existe. À spécificité égale, c'est l'ordre de source qui tranche : les
// feuilles du thème doivent donc venir APRÈS. C'est un invariant tacite du reskin depuis son
// origine, et rien ne le tenait.
//
// Il a cassé en silence : ma réécriture du favicon utilisait `/<link rel="icon"[^>]*>/`, or
// l'ancienne URI contenait du SVG BRUT (`<svg …><polygon …/></svg>`) — la classe `[^>]*` s'est
// arrêtée au premier `>` INTERNE et a laissé une queue de balise dans le `<head>`. Le parseur
// a refermé la tête plus tôt, l'ordre des feuilles s'est inversé, et QUATRE onglets sur cinq
// sont repassés au fond crème alors que `theme-zenna` était bien posé sur `<body>`.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  const page = await ctx.newPage();
  await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const d = await page.evaluate(() => ({
    ordre: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => (l.getAttribute("href") || "").split("/").pop()),
    // un `<head>` sain ne porte aucun nœud texte non vide : une balise mal fermée en produit un
    tetePolluee: [...document.head.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim().slice(0, 40)),
  }));
  const iBase = Math.max(d.ordre.indexOf("styles.css"), d.ordre.indexOf("mobile.css"));
  const iTheme = Math.min(...["zenna-today.css", "zenna-tabs.css"].map((f) => d.ordre.indexOf(f)).filter((i) => i >= 0));
  ok(iTheme > iBase, "§0bis — les feuilles du thème se chargent APRÈS styles/mobile (" + d.ordre.join(" → ") + ")");
  ok(d.tetePolluee.length === 0, "§0bis — le <head> ne porte aucun texte parasite (balise mal fermée)"
    + (d.tetePolluee.length ? " — trouvé : « " + d.tetePolluee.join(" | ") + " »" : ""));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════════════
// §4 — CONTRASTE DU TEXTE (WCAG 1.4.3 AA), calculé sur le rendu réel.
// ══════════════════════════════════════════════════════════════════════
// Un thème sombre déplace TOUS les rapports de contraste d'un coup ; c'est le mode de
// régression le plus invisible du lot (rien ne casse, ça devient juste illisible). Deux
// défauts réels trouvés à l'audit, et gardés ici :
//   · les modules portent des styles INLINE en `var(--muted)` (11 fois) — non redéfini dans
//     le thème, il résolvait au brun du thème clair sur carte sombre : 2,77:1 ;
//   · le texte semi-transparent du héros sur l'orange était entre 3,56 et 4,45:1.
//
// NOTE D'INSTRUMENT, PARCE QU'ELLE A COÛTÉ DEUX FAUX VERDICTS. La mesure du fond doit
// remonter les ancêtres ET lire les arrêts d'un DÉGRADÉ : le héros est peint par un
// `linear-gradient`, donc sa `background-color` est transparente. Une première version ne
// regardait que `background-color` et mesurait le texte du héros contre le noir du body —
// elle rapportait 1,04:1 pour du texte parfaitement lisible. Une seconde avait sa regex de
// dégradé cassée par l'échappement du template literal (`\\(` y perd son antislash) et
// rapportait la même chose. Vérification qui tranche : le titre du héros doit mesurer
// **5,58**, valeur calculée à la main pour #0a0a0a sur #ff3d00 — si l'instrument ne la
// retrouve pas, c'est lui qui est faux, pas le produit.
const WCAG = `
  const px = (c)=>{const m=/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/.exec(c);return m?{r:+m[1],g:+m[2],b:+m[3],a:m[4]===undefined?1:+m[4]}:null;};
  const lum=(c)=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);};
  const over=(fg,a,bg)=> a>=1?{r:fg.r,g:fg.g,b:fg.b,a:1}:{r:fg.r*a+bg.r*(1-a),g:fg.g*a+bg.g*(1-a),b:fg.b*a+bg.b*(1-a),a:1};
  const stops=(bi)=>{const out=[];const re=/rgba?\\([^)]*\\)/g;let m;while((m=re.exec(bi)))out.push(px(m[0]));return out.filter(Boolean);};
  const bgOf=(el,fg)=>{let n=el;const k=[];
    while(n&&n!==document.documentElement){const cs=getComputedStyle(n);const bi=cs.backgroundImage;
      if(bi&&bi!=="none"){const st=stops(bi).filter(c=>c.a>0.05);
        if(st.length){st.sort((a,b)=>Math.abs(lum(a)-lum(fg))-Math.abs(lum(b)-lum(fg)));k.push(st[0]);if(st[0].a>0.98)break;}}
      const c=px(cs.backgroundColor); if(c&&c.a>0.01){k.push(c); if(c.a>0.98)break;} n=n.parentElement;}
    let base={r:0,g:0,b:0,a:1}; for(let i=k.length-1;i>=0;i--) base=over(k[i],k[i].a,base); return base;};
  const ratio=(el)=>{const cs=getComputedStyle(el);const c0=px(cs.color)||{r:0,g:0,b:0,a:1};const bg=bgOf(el,c0);const fg=over(c0,c0.a,bg);
    const L1=lum(fg),L2=lum(bg);const hi=Math.max(L1,L2),lo=Math.min(L1,L2);return (hi+0.05)/(lo+0.05);};
`;

const REP = { intent: "competition", level: "inter", history: "confirme", injury: "aucune", dispo: "quotidienne", doubles: "parfois", off_days: "non", shift_ok: "non", sleep: "moyen", life_load: "normale", activity: "actif", sex: "H", med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "non", terrain: "plat", milieu: "bassin", swim_limit: "technique", ftp_known: "oui", pace_known: "oui", css_known: "oui", leg_swim_env: "lac", leg_bike_prof: "plat", leg_run_prof: "plat" };
const SAI = { age: "35", weight: "78", height: "180", vol_max: "10", vol_recent: "7", sessions_max: "6", ftp: "230", pace: "4:50", css: "2:00", water_temp_c: "19" };

// ══════════════════════════════════════════════════════════════════════
// LA DATE EST ANCRÉE — SEPTIÈME OCCURRENCE DE LA FAMILLE R20.7.
// ══════════════════════════════════════════════════════════════════════
// Cette suite ne pinçait aucune date, et le plan démarre au LUNDI DE LA SEMAINE EN COURS
// (R8/R9) : le jour que 🎯 Aujourd'hui affiche dépendait donc du jour où on lance la commande.
// Balayé sur les sept jours à moteur inchangé, pour le profil ci-dessous :
//
//   Lun · Mer · Ven · Dim → « Repos »        (pas d'XP, pas de grand chiffre)
//   Mar · Jeu · Sam       → une vraie séance (Sweetspot vélo · Nage vitesse · Sortie longue)
//
// Soit QUATRE JOURS SUR SEPT où trois assertions du §1/§2 échouent — non pas parce que le
// produit est cassé, mais parce qu'elles supposent que le jour porte une séance. La suite
// passait sur la bonne volonté du calendrier ; elle est rouge depuis le 12/08 (un mercredi).
//
// On ancre donc, comme `bench-dates.cjs` l'a fait pour cinq bancs .cjs. Les dates sont
// ABSOLUES et non relatives, pour la raison qu'A-6 a retenue pour le golden : une garde de
// RENDU doit être reproductible, pas suivre le calendrier — ici rien ne dépend de la fraîcheur
// de la date, seulement du jour de la semaine sur lequel elle tombe.
//
// Et on ancre sur DEUX jours, pas un. Ancrer sur le seul mardi rendrait la suite verte en
// couvrant « le jour où le code a été écrit » (R20.1) : la branche REPOS — celle-là même qui
// vient de faire rougir la suite — ne serait jamais exercée. Le §1ter la garde désormais, avec
// ce que R25 a décidé pour elle : le repos se valide, il compte dans la série, il ne donne
// PAS d'XP.
const JOUR_SEANCE = "2026-08-11"; // mardi — Sweetspot vélo, 24 min
const JOUR_REPOS  = "2026-08-12"; // mercredi — Repos

async function boot(reducedMotion, jour = JOUR_SEANCE) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", isMobile: true, hasTouch: true, reducedMotion });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  // `setFixedTime` et non `install` : on fige `Date.now()`/`new Date()` en LAISSANT TOURNER les
  // minuteries. Geler les minuteries arrêterait la cascade d'entrée et le nettoyage des
  // particules, c'est-à-dire exactement ce que cette suite mesure.
  await page.clock.setFixedTime(new Date(jour + "T09:00:00"));
  await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.click('.sport-card[data-sport="tri"]');
  await page.waitForTimeout(250);
  for (let i = 0; i < 30; i++) {
    await page.evaluate(async ({ r, s }) => {
      const a = (m) => new Promise((x) => setTimeout(x, m));
      for (const g of document.querySelectorAll(".opts[data-key]")) {
        if (g.querySelector(".opt.sel")) continue;
        const p = g.dataset.key === "format" ? "70.3" : r[g.dataset.key];
        const b = (p && g.querySelector('.opt[data-val="' + p + '"]')) || g.querySelector(".opt");
        if (b) { b.click(); await a(15); }
      }
      for (const inp of document.querySelectorAll("[data-input]")) {
        if (inp.value) continue;
        let v = s[inp.dataset.input];
        if (v == null) { if (inp.type === "date") v = new Date(Date.now() + 300 * 864e5).toISOString().slice(0, 10); else if (inp.type === "number") { const lo = parseFloat(inp.min), hi = parseFloat(inp.max); v = String(isFinite(lo) && isFinite(hi) ? Math.round((lo + hi) / 2) : 10); } else v = "10"; }
        inp.value = v; inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true })); await a(15);
      }
    }, { r: REP, s: SAI });
    await page.waitForTimeout(120);
    if (await page.locator("#genBtn").count()) { await page.click("#genBtn"); break; }
    const n = page.locator("#nextBtn");
    if (!(await n.count()) || !(await n.isEnabled())) break;
    await n.click(); await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1400);
  await page.click('#ebTabbar .tabbtn[data-tab="today"]');
  await page.waitForTimeout(500);
  for (let i = 0; i < 6; i++) {
    const n = await page.locator(".ck-opt").count();
    if (!n) break;
    await page.locator(".ck-opt").nth(Math.min(1, n - 1)).click();
    await page.waitForTimeout(340);
  }
  await page.waitForTimeout(5200);
  return { ctx, page, errors };
}

// ─────────── 1. Mouvement actif ───────────
{
  const { ctx, page, errors } = await boot("no-preference");
  const before = await page.evaluate(() => ({
    cards: [...document.querySelectorAll("#screen .rise")].map((n) => getComputedStyle(n).opacity),
    anim: [...document.querySelectorAll("#screen .rise")].map((n) => getComputedStyle(n).animationName),
  }));
  ok(before.cards.every((o) => o === "1"), "toutes les cartes sont VISIBLES après la cascade (" + before.cards.join("/") + ")");
  ok(before.anim.every((a) => a === "zn-rise"), "…et c'est bien `zn-rise` qui les a amenées");

  // LE TÉMOIN AVANT LE CRITÈRE : les quatre assertions qui suivent supposent que le jour ancré
  // porte une SÉANCE. Sans ce témoin, un changement de périodisation qui ferait tomber le mardi
  // sur un repos les rendrait rouges en désignant le mouvement, qui n'y serait pour rien.
  const heros = await page.evaluate(() => (document.querySelector(".zn-hero-title") || {}).textContent || "");
  ok(heros.trim() !== "" && !/repos/i.test(heros), "le jour ancré porte bien une séance : « " + heros + " »");

  // validation : coche dessinée + confettis + XP + toast
  const btn = page.locator("#screen [data-vd]:not([disabled])").first();
  const nAvant = await page.evaluate(() => document.querySelectorAll(".zn-confetti,.zn-xp-float").length);
  await btn.click();
  await page.waitForTimeout(120);
  const mid = await page.evaluate(() => ({
    confetti: document.querySelectorAll(".zn-confetti").length,
    xp: document.querySelectorAll(".zn-xp-float").length,
    xpTxt: (document.querySelector(".zn-xp-float") || {}).textContent || "",
    toast: !!document.querySelector(".zn-toast.on"),
    toastTxt: (document.querySelector(".zn-toast") || {}).textContent || "",
    go: !!document.querySelector(".check-draw.go"),
  }));
  ok(nAvant === 0 && mid.confetti > 0, "confettis émis à la validation (" + mid.confetti + ")");
  ok(mid.xp === 1 && /\+10 XP/.test(mid.xpTxt), "XP flottant, au barème du moteur : « " + mid.xpTxt + " »");
  ok(mid.go, "la coche se DESSINE (`check-draw.go` posée)");
  ok(mid.toast && /séance validée/i.test(mid.toastTxt), "toast affiché : « " + mid.toastTxt + " »");
  await page.waitForTimeout(2600);
  const after = await page.evaluate(() => document.querySelectorAll(".zn-confetti,.zn-xp-float").length);
  ok(after === 0, "…et les particules se nettoient toutes seules (reste " + after + ")");
  ok(errors.length === 0, "aucune erreur console" + (errors.length ? " — " + errors[0] : ""));
  await ctx.close();
}

// ─────────── 1ter. Mouvement actif, UN JOUR DE REPOS ───────────
// La branche que la suite n'exerçait jamais — et sur laquelle elle mourait quatre jours sur
// sept. Elle ne se contente pas d'exister : elle porte la décision R25 (« le repos se valide,
// il compte dans la série, il ne donne PAS d'XP »). Sans le second volet, le jour où quelqu'un
// recâblerait l'XP sur tous les jours validés, rien ne le verrait.
{
  const { ctx, page, errors } = await boot("no-preference", JOUR_REPOS);
  const heros = await page.evaluate(() => (document.querySelector(".zn-hero-title") || {}).textContent || "");
  ok(/repos/i.test(heros), "le jour ancré de repos en est bien un : « " + heros + " »");

  const btn = page.locator("#screen [data-vd]:not([disabled])").first();
  await btn.click();
  await page.waitForTimeout(120);
  const mid = await page.evaluate(() => ({
    confetti: document.querySelectorAll(".zn-confetti").length,
    xp: document.querySelectorAll(".zn-xp-float").length,
    toast: !!document.querySelector(".zn-toast.on"),
    toastTxt: (document.querySelector(".zn-toast") || {}).textContent || "",
    go: !!document.querySelector(".check-draw.go"),
  }));
  ok(mid.confetti > 0 && mid.go, "un repos validé se FÊTE aussi (confettis " + mid.confetti + ", coche dessinée)");
  ok(mid.toast && /repos validé/i.test(mid.toastTxt), "…et le toast le nomme : « " + mid.toastTxt + " »");
  ok(mid.xp === 0, "…mais AUCUN XP ne s'envole (R25 : le repos ne donne pas d'XP) — vu " + mid.xp);
  await page.waitForTimeout(2600);
  const after = await page.evaluate(() => document.querySelectorAll(".zn-confetti,.zn-xp-float").length);
  ok(after === 0, "…et les particules se nettoient toutes seules (reste " + after + ")");
  ok(errors.length === 0, "aucune erreur console" + (errors.length ? " — " + errors[0] : ""));
  await ctx.close();
}

// ─────────── 1bis. Contraste (WCAG AA) sur le rendu réel ───────────
{
  const { ctx, page } = await boot("no-preference");
  const c = await page.evaluate(`(() => {${WCAG}
    const t = document.querySelector(".zn-hero-title");
    const out = [];
    for (const el of [...document.querySelectorAll("#screen *, .zn-sticky-cta")]) {
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.opacity === "0") continue;
      const size = parseFloat(cs.fontSize), w = parseInt(cs.fontWeight) || 400;
      const seuil = (size >= 18.66 || (size >= 14 && w >= 700)) ? 3.0 : 4.5;
      const rt = ratio(el);
      if (rt < seuil) out.push({ t: el.textContent.trim().slice(0, 34), rt: Math.round(rt*100)/100, seuil, cls: (el.className||"").toString().slice(0,26) });
    }
    return { titre: t ? Math.round(ratio(t)*100)/100 : null, sous: out.sort((a,b)=>a.rt-b.rt) };
  })()`);
  // L'INSTRUMENT SE VÉRIFIE AVANT DE JUGER : 5,58 est la valeur calculée à la main pour
  // #0a0a0a sur #ff3d00 (l'arrêt le plus sombre du dégradé du héros). Sans ce témoin, un
  // instrument cassé rendrait « aucun défaut » et le critère serait satisfait par sa panne.
  ok(c.titre !== null && Math.abs(c.titre - 5.58) < 0.15,
    "§4 — l'instrument de contraste est juste (titre du héros : " + c.titre + ", attendu 5.58)");
  ok(c.sous.length === 0, "§4 — aucun texte sous le seuil AA sur 🎯 Aujourd'hui"
    + (c.sous.length ? " — " + c.sous.slice(0,4).map(x => x.rt + " «" + x.t + "»").join(" · ") : ""));
  await ctx.close();
}

// ─────────── 2. prefers-reduced-motion ───────────
{
  const { ctx, page, errors } = await boot("reduce");
  const st = await page.evaluate(() => ({
    op: [...document.querySelectorAll("#screen .rise")].map((n) => getComputedStyle(n).opacity),
    anim: [...document.querySelectorAll("#screen .rise")].map((n) => getComputedStyle(n).animationName),
    heroNum: (document.querySelector(".zn-hero-num") || {}).textContent,
    ringOff: (document.querySelector(".zn-ring-fg") || {}).style?.strokeDashoffset,
    ringData: (document.querySelector(".zn-ring-fg") || {}).dataset?.off,
    formVal: (document.querySelector(".zn-form-val span") || {}).textContent,
  }));
  ok(st.op.length > 0 && st.op.every((o) => o === "1"), "reduced-motion : le contenu reste VISIBLE (" + st.op.join("/") + ")");
  ok(st.anim.every((a) => a === "none"), "…sans aucune animation d'entrée");
  ok(st.heroNum && st.heroNum !== "0", "…le grand chiffre est posé d'emblée (" + st.heroNum + ")");
  ok(st.formVal && st.formVal !== "0", "…l'anneau affiche sa valeur finale (" + st.formVal + ")");
  const btn = page.locator("#screen [data-vd]:not([disabled])").first();
  await btn.click();
  await page.waitForTimeout(150);
  const noFx = await page.evaluate(() => document.querySelectorAll(".zn-confetti,.zn-xp-float").length);
  ok(noFx === 0, "…et la validation n'émet ni confetti ni XP volant");
  ok(errors.length === 0, "aucune erreur console en reduced-motion" + (errors.length ? " — " + errors[0] : ""));
  await ctx.close();
}

// ─────────── 3. Le thème vaut pour LES CINQ onglets, et chacun reste lisible ───────────
//
// CE CRITÈRE A CHANGÉ DE SENS, ET C'EST VOULU. Tant que le reskin était une preuve de concept
// scopée à un seul onglet, il assertait l'inverse : « le thème sombre est RETIRÉ » sur les
// quatre autres. Le thème étant maintenant permanent, cette formulation serait fausse par
// construction — la réécrire est la seule option honnête ; la supprimer laisserait les quatre
// onglets sans aucune garde.
//
// Ce qu'il garde désormais est plus utile que ce qu'il gardait : sur CHAQUE onglet, le thème
// est posé, le fond est sombre, le contenu est rendu, RIEN n'est resté invisible, et aucun
// élément flottant d'Aujourd'hui (CTA collant, couche de verdict) ne traîne.
//
// « Rien n'est resté invisible » est le critère qui compte : `.rise` met le contenu à
// opacité 0 en attendant une animation qui n'est PAS jouée hors d'Aujourd'hui. Si quelqu'un
// posait un jour `rise` sans `znPlay` sur un de ces onglets, il serait entièrement vide — et
// aucune assertion de contenu ne le verrait, puisque le texte est bien dans le DOM.
{
  const { ctx, page, errors } = await boot("no-preference");
  for (const t of ["profile", "general", "week", "outils"]) {
    await page.click('#ebTabbar .tabbtn[data-tab="' + t + '"]');
    await page.waitForTimeout(500);
    const st = await page.evaluate(() => ({
      theme: document.body.classList.contains("theme-zenna"),
      bg: getComputedStyle(document.body).backgroundColor,
      sticky: !!document.querySelector(".zn-sticky-cta"),
      stamp: !!document.querySelector(".zn-stamp-layer"),
      invisibles: [...document.querySelectorAll("#screen *")]
        .filter((n) => getComputedStyle(n).opacity === "0" && (n.textContent || "").trim().length > 3).length,
      txt: (document.getElementById("screen").innerText || "").length,
    }));
    ok(st.theme, "onglet " + t + " : le thème est posé");
    ok(st.bg === "rgb(0, 0, 0)", "onglet " + t + " : fond sombre (" + st.bg + ")");
    ok(!st.sticky && !st.stamp, "onglet " + t + " : aucun élément flottant d'Aujourd'hui ne traîne");
    ok(st.invisibles === 0, "onglet " + t + " : aucun contenu resté invisible (" + st.invisibles + ")");
    ok(st.txt > 200, "onglet " + t + " : le contenu est bien rendu (" + st.txt + " car.)");
  }

  // ── R-ZENNA v5 — L'EN-TÊTE PARTAGÉ, sur les CINQ onglets ────────────────────────────────
  // C'était le seul élément structurel commun aux cinq écrans de la maquette sans équivalent
  // dans l'app : `body.has-tabs .hero { display: none }` masque le titre du questionnaire et
  // rien ne le remplaçait — on arrivait sur le contenu sans savoir de quelle course on parle.
  {
    const vus = [];
    for (const t of ["today", "profile", "general", "week", "outils"]) {
      await page.click('#ebTabbar .tabbtn[data-tab="' + t + '"]');
      await page.waitForTimeout(450);
      vus.push(await page.evaluate((tab) => {
        const h = document.getElementById("ebAppHeader");
        if (!h) return { tab, absent: true };
        const p = h.querySelector(".zn-race-chip");
        const r = h.getBoundingClientRect();
        return { tab, absent: false, marque: /ZENNA/.test(h.innerText),
          logo: !!h.querySelector(".zn-logo-mark svg path"), lignes: Math.round(r.height),
          puce: !!p, puceH: p ? Math.round(p.getBoundingClientRect().height) : 0,
          cliquable: p ? p.getAttribute("role") === "button" : null,
          dansEcran: !!document.querySelector("#screen #ebAppHeader") };
      }, t));
    }
    ok(vus.every((v) => !v.absent), "l'en-tête partagé est présent sur les CINQ onglets"
      + (vus.some((v) => v.absent) ? " — absent de : " + vus.filter((v) => v.absent).map((v) => v.tab).join(", ") : ""));
    ok(vus.every((v) => v.marque), "…il porte le mot-marque du produit (ZENNA)");
    // R-ZENNA v9 — CE CRITÈRE S'EST RETOURNÉ, et c'est écrit. Il assertait « jamais Zenna »,
    // parce que « Zenna » était alors le nom de la MAQUETTE et que le reprendre aurait renommé
    // l'app par accident. Le fondateur a tranché l'inverse : le produit S'APPELLE Zenna
    // (12/08/2026). Le critère devient son propre miroir — et il gagne une moitié qu'il n'avait
    // pas : le SYMBOLE est là, pas seulement le mot. Un logo qui disparaîtrait en laissant le
    // texte resterait invisible pour une assertion de texte.
    ok(vus.every((v) => v.logo), "…et le symbole du logo est rendu (pas seulement le mot)");
    ok(vus.every((v) => !v.dansEcran), "…il vit HORS de #screen, sinon chaque changement d'onglet l'effacerait");
    // Il doit tenir sur UNE ligne : à deux lignes il mange l'écran qu'il est censé cadrer.
    const hauts = vus.filter((v) => v.lignes > 70);
    ok(hauts.length === 0, "…et tient sur une seule ligne"
      + (hauts.length ? " — trop haut sur : " + hauts.map((v) => v.tab + " (" + v.lignes + "px)").join(", ") : ""));
    ok(vus.every((v) => v.puce), "la puce de course est là quand une date est déclarée");
    ok(vus.every((v) => v.puceH >= 44), "…au gabarit tactile de U4 (44 px), et pas aux 30 px de la maquette");
    // Sur l'onglet Plan elle mènerait là où l'on est déjà : elle s'y tait comme bouton.
    const surPlan = vus.find((v) => v.tab === "general");
    ok(surPlan && surPlan.cliquable === false, "…mais elle n'est pas cliquable sur l'onglet Plan (elle y mènerait sur place)");
    ok(vus.filter((v) => v.tab !== "general").every((v) => v.cliquable === true), "…et cliquable partout ailleurs");
  }
  // Le CONTRASTE tient sur les cinq onglets, pas seulement sur celui qu'on a dessiné en
  // premier : c'est là que se cachent les fonds pastel du thème clair devenus quasi blancs.
  for (const t of ["profile", "general", "week", "outils"]) {
    await page.click('#ebTabbar .tabbtn[data-tab="' + t + '"]');
    await page.waitForTimeout(450);
    const sous = await page.evaluate(`(() => {${WCAG}
      const out = [];
      // Un nœud qui ne porte QUE des pictogrammes est hors sujet : un emoji couleur est peint
      // par la police, pas par la propriété color, donc mesurer son « contraste de texte »
      // mesure une grandeur voisine de celle qu'on nomme. Le seuil « plus de 2 caractères »
      // le faisait déjà, mais par accident (« 🛒 » vaut 2 en UTF-16) — et il jetait au passage
      // des textes de deux lettres bien réels. Le filtre dit désormais ce qu'il exclut.
      // (Pas de backtick dans ce commentaire : il vit dans un template literal.)
      const QUE_PICTO = /^[\\p{Extended_Pictographic}\\p{Emoji_Component}\\s]+$/u;
      for (const el of [...document.querySelectorAll("#screen *")]) {
        if (![...el.childNodes].some(n => {
          const s = n.nodeType === 3 ? n.textContent.trim() : "";
          return s.length > 1 && !QUE_PICTO.test(s);
        })) continue;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
        const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.opacity === "0") continue;
        const size = parseFloat(cs.fontSize), w = parseInt(cs.fontWeight) || 400;
        const seuil = (size >= 18.66 || (size >= 14 && w >= 700)) ? 3.0 : 4.5;
        const rt = ratio(el);
        if (rt < seuil) out.push({ t: el.textContent.trim().slice(0, 30), rt: Math.round(rt*100)/100, cls: (el.className||"").toString().slice(0,24) });
      }
      return out.sort((a,b)=>a.rt-b.rt).slice(0, 6);
    })()`);
    ok(sous.length === 0, "onglet " + t + " : aucun texte sous le seuil AA"
      + (sous.length ? " — " + sous.map(x => x.rt + " «" + x.t + "» ." + x.cls).join(" · ") : ""));
  }
  // retour sur Aujourd'hui : la cascade se REJOUE (elle reste propre à cet onglet)
  await page.click('#ebTabbar .tabbtn[data-tab="today"]');
  await page.waitForTimeout(2600); // cascade révisée : 7 × 176 ms + 960 ms ≈ 2190 ms
  const back = await page.evaluate(() => ({
    theme: document.body.classList.contains("theme-zenna"),
    op: [...document.querySelectorAll("#screen .rise")].map((n) => getComputedStyle(n).opacity),
  }));
  ok(back.theme, "retour sur Aujourd'hui : le thème est toujours là");
  ok(back.op.length > 0 && back.op.every((o) => o === "1"), "…et les cartes sont visibles (cascade rejouée)");
  ok(errors.length === 0, "aucune erreur console sur la traversée" + (errors.length ? " — " + errors[0] : ""));
  await ctx.close();
}

await browser.close();
server.close();
// R22b — on SORT sur le code de retour. Sept suites de ce dépôt finissaient par `report();`
// sans `process.exit`, donc sortaient en 0 quoi qu'elles trouvent, CI comprise.
process.exit(report());
