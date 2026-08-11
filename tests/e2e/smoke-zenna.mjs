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

async function boot(reducedMotion) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", isMobile: true, hasTouch: true, reducedMotion });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
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

// ─────────── 3. Les quatre autres onglets ne sont pas contaminés ───────────
{
  const { ctx, page, errors } = await boot("no-preference");
  for (const t of ["profile", "general", "week", "outils"]) {
    await page.click('#ebTabbar .tabbtn[data-tab="' + t + '"]');
    await page.waitForTimeout(450);
    const st = await page.evaluate(() => ({
      theme: document.body.classList.contains("theme-zenna"),
      bg: getComputedStyle(document.body).backgroundColor,
      sticky: !!document.querySelector(".zn-sticky-cta"),
      invisible: [...document.querySelectorAll("#screen *")].filter((n) => getComputedStyle(n).opacity === "0").length,
      txt: (document.getElementById("screen").innerText || "").length,
    }));
    ok(!st.theme, "onglet " + t + " : le thème sombre est RETIRÉ");
    ok(st.bg !== "rgb(0, 0, 0)", "onglet " + t + " : fond papier conservé (" + st.bg + ")");
    ok(!st.sticky, "onglet " + t + " : pas de CTA collant qui traîne");
    ok(st.txt > 200, "onglet " + t + " : le contenu est bien rendu (" + st.txt + " car.)");
  }
  // retour sur Aujourd'hui : la cascade se REJOUE
  await page.click('#ebTabbar .tabbtn[data-tab="today"]');
  await page.waitForTimeout(1500);
  await page.waitForTimeout(1500); // la cascade dure jusqu'à ~1520 ms (7 × 114 ms + 720 ms)
  const back = await page.evaluate(() => ({
    theme: document.body.classList.contains("theme-zenna"),
    op: [...document.querySelectorAll("#screen .rise")].map((n) => getComputedStyle(n).opacity),
  }));
  ok(back.theme, "retour sur Aujourd'hui : le thème revient");
  ok(back.op.length > 0 && back.op.every((o) => o === "1"), "…et les cartes sont visibles (cascade rejouée)");
  ok(errors.length === 0, "aucune erreur console sur la traversée" + (errors.length ? " — " + errors[0] : ""));
  await ctx.close();
}

await browser.close();
server.close();
// R22b — on SORT sur le code de retour. Sept suites de ce dépôt finissaient par `report();`
// sans `process.exit`, donc sortaient en 0 quoi qu'elles trouvent, CI comprise.
process.exit(report());
