// Harnais E2E partagé — sert la PWA `endurabuild/` sur un port local et lance Chromium.
// Zéro dépendance côté produit : Playwright n'est qu'une devDependency de test (CI + local).
// Chromium : $EB_CHROMIUM > /opt/pw-browsers/chromium (environnement Claude Code) >
// navigateur téléchargé par `npx playwright install chromium` (CI GitHub Actions).
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SITE_DIR = fileURLToPath(new URL("../../endurabuild/", import.meta.url));
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".png": "image/png" };

export async function startServer(port) {
  const server = createServer(async (req, res) => {
    try {
      let p = req.url.split("?")[0];
      if (p === "/") p = "/index.html";
      const buf = await readFile(join(SITE_DIR, p));
      res.writeHead(200, { "Content-Type": MIME[extname(p)] || "application/octet-stream" });
      res.end(buf);
    } catch { res.writeHead(404); res.end("404"); }
  });
  await new Promise((r) => server.listen(port, r));
  return server;
}

export async function launchBrowser() {
  const exe = process.env.EB_CHROMIUM || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
  return chromium.launch({ executablePath: exe, headless: true });
}

/** Collecteur d'assertions : ok(cond, label), puis report() affiche tout et
 *  retourne le code de sortie (0 = tout passe). */
export function makeReporter() {
  const out = [];
  const ok = (cond, label) => out.push((cond ? "PASS " : "FAIL ") + label);
  const info = (txt) => out.push("INFO " + txt);
  const report = () => {
    console.log(out.join("\n"));
    const fails = out.filter((l) => l.startsWith("FAIL"));
    const n = out.filter((l) => l.startsWith("PASS") || l.startsWith("FAIL")).length;
    console.log("\n" + (fails.length ? fails.length + " ÉCHEC(S)" : "TOUT PASSE") + " — " + n + " assertions");
    return fails.length ? 1 : 0;
  };
  return { ok, info, report };
}

/** État v1 minimal d'un coureur confirmé prêt à afficher un plan — injecté en
 *  localStorage pour éviter de rejouer tout le questionnaire dans chaque suite. */
export function runnerStateV1(extra = {}) {
  return {
    sport: "run",
    answers: Object.assign({
      intent: "competition", format: "10k", terrain: "route", history: "confirme", level: "inter",
      vol_max: "7", sessions_max: "5", dispo: "semaine", off_days: "non", doubles: "non", injury: "aucune",
      age: "35", sex: "H", pace_known: "oui", pace: "4:30", med_pain: "non", med_dizzy: "non", med_treat: "non",
      // R23.2 — la journée d'entraînement commence à 4 h, pas à minuit. Ce champ portait la
      // date calendaire UTC : entre 00 h et 04 h (heure du système, celle que la page voit par
      // défaut), le portillon aurait relu un autre jour et bloqué toutes les suites qui passent
      // par cet état. On réplique la règle ici parce que ce code tourne côté NODE, avant que la
      // page existe — la constante vit dans `state.js` (JOUR_ENTRAINEMENT_DEBUT_H = 4).
      readiness: { date: (() => { const d = new Date(); if (d.getHours() < 4) d.setDate(d.getDate() - 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })(), sleepQuality: "bon", hrvStatus: "normale", energy: 80, feel: "frais" },
    }, extra),
    tier: "free", step: 10, started: true, onPlan: true,
  };
}

/**
 * U14 — TRAVERSER LE QUESTIONNAIRE SANS EN CONNAÎTRE L'ORDRE.
 *
 * Quatre suites codaient la SÉQUENCE des écrans en dur (« intent, puis médical, puis
 * terrain… »). Le jour où l'ordre a changé pour de bonnes raisons — mettre en tête ce dont
 * l'absence coûte une garde de sécurité — elles sont toutes tombées, alors qu'aucune ne
 * mesurait l'ordre : elles mesuraient ce qui vient APRÈS le questionnaire.
 *
 * Un test qui code une séquence qu'il ne teste pas se casse à chaque réorganisation légitime.
 * Celui-ci répond à ce qui est À L'ÉCRAN, quel qu'il soit, et s'arrête quand le plan est là.
 *
 * `reponses` donne la valeur voulue par clé ; toute clé absente prend la PREMIÈRE option
 * proposée, et tout champ libre sa valeur dans `saisies` (à défaut : le milieu de la plage
 * pour un nombre, une date à +112 jours, « 10 » sinon).
 */
export async function traverserQuestionnaire(page, { reponses = {}, saisies = {}, arret = "genBtn", surEcran = null } = {}) {
  let ecrans = 0;
  for (let i = 0; i < 30; i++) {
    ecrans++;
    await page.evaluate(async ({ r, s }) => {
      const pause = (m) => new Promise((x) => setTimeout(x, m));
      for (const g of document.querySelectorAll(".opts[data-key]")) {
        if (g.querySelector(".opt.sel")) continue;
        const voulu = r[g.dataset.key];
        const b = (voulu && g.querySelector('.opt[data-val="' + voulu + '"]')) || g.querySelector(".opt");
        if (b) { b.click(); await pause(20); }
      }
      for (const inp of document.querySelectorAll("[data-input]")) {
        if (inp.value) continue;
        let v = s[inp.dataset.input];
        if (v == null) {
          // On ne remplit QUE ce qu'on sait remplir : une date (sans elle il n'y a pas de plan)
          // et un nombre dont le champ porte ses bornes. Inventer une valeur pour un champ
          // facultatif, c'est ce qui a fait saisir « 10 kg » et récolter un refus typé.
          if (inp.type === "date") v = new Date(Date.now() + 112 * 864e5).toISOString().slice(0, 10);
          else if (inp.type === "number") {
            const lo = parseFloat(inp.min), hi = parseFloat(inp.max);
            if (!isFinite(lo) || !isFinite(hi)) continue;
            // ⚠ CE MILIEU DE PLAGE EST UN BOUCHON DE VALIDATION, PAS UN ATHLÈTE.
            // Trouvé en livrant PW (le chrono vélo) : les bornes de `weight` sont 25-250 kg,
            // donc le milieu vaut **138 kg**, et une suite qui ne déclare pas de poids mesurait
            // le vélo d'un duathlète de 138 kg — 40 km en 1 h 57 au lieu de 1 h 14. Le modèle
            // avait raison, l'entrée était absurde, et rien ne le disait.
            // Toute suite qui asserte une grandeur dépendant d'un champ libre doit donc le
            // DÉCLARER dans `saisies` : ce remplissage ne sert qu'à franchir la validation.
            v = String(Math.round((lo + hi) / 2));
          } else continue;
        }
        inp.value = v;
        inp.dispatchEvent(new Event("input", { bubbles: true }));
        inp.dispatchEvent(new Event("change", { bubbles: true }));
        await pause(20);
      }
    }, { r: reponses, s: saisies });
    await page.waitForTimeout(140);
    // Un crochet pour les assertions qui doivent voir un écran PARTICULIER (le protocole
    // d'allure, par exemple) sans que la suite ait à savoir à quel rang il tombe.
    if (surEcran) await surEcran(page);
    // VISIBILITÉ, pas présence : depuis U14, « générer maintenant » est TOUJOURS dans le DOM
    // et c'est son affichage qui suit les réponses. Un `count()` le voit donc dès le premier
    // écran et la traversée s'arrête sur un bouton qu'on ne peut pas cliquer.
    if (await page.locator("#" + arret).isVisible().catch(() => false)) { await page.click("#" + arret); break; }
    const suivant = page.locator("#nextBtn");
    if (!(await suivant.count()) || !(await suivant.isEnabled())) break;
    await suivant.click();
    await page.waitForTimeout(140);
  }
  await page.waitForTimeout(900);
  return ecrans;
}
