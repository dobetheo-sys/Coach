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
      readiness: { date: new Date().toISOString().slice(0, 10), sleepQuality: "bon", hrvStatus: "normale", energy: 80, feel: "frais" },
    }, extra),
    tier: "free", step: 10, started: true, onPlan: true,
  };
}
