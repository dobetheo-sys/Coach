// Bloc `verify` d'O-122 (BUGS_OUVERTS.md) — mesure l'ampleur du débordement de la plaque de
// l'avatar triptyque (avatarAspect 1,78) en format CARRÉ (storyBlob(), endurabuild/js/export.js).
// Entrée OUVERTE, non corrigée : ce script MESURE le défaut, il ne l'asserte pas corrigé.
import { startServer, launchBrowser } from "../tests/e2e/harness.mjs";

const PORT = 8492;
const server = await startServer(PORT);
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });

const AVATAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 534" width="300" height="534">'
  + '<rect width="300" height="534" fill="#dfe7e2"/></svg>';

const r = await page.evaluate(({ dw, asp, pad }) => {
  const W = 1080; // IMG_FORMATS.square, dupliqué ici pour ne dépendre d'aucun export interne
  const dx = W / 2 - 170, dy = 250, dh = Math.round(340 * asp);
  const plateTop = dy - pad, plateBottom = dy + dh + pad;
  // Positions codées dans storyBlob() pour le format carré (sq=true) : sessionName à y=700,
  // detail à y=755, bloc streak/badge démarrant à y=840 (cas non-soloDate).
  const sessionNameY = 700, detailY = 755, streakY = 840;
  return {
    plateTop, plateBottom,
    debordeSessionName: plateBottom - sessionNameY,
    debordeDetail: plateBottom - detailY,
    debordeStreak: plateBottom - streakY,
  };
}, { dw: 340, asp: 1.78, pad: 26 });

console.log(JSON.stringify(r));
console.log("O-122 MESURÉ — plaque carrée jusqu'à y=" + r.plateBottom
  + ", déborde de " + r.debordeSessionName + "px sur le nom de séance (y=700)");

await browser.close();
server.close();
