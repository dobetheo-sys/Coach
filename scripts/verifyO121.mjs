// Bloc `verify` d'O-121 (BUGS_OUVERTS.md) — storyBlob() (endurabuild/js/export.js) ne masque
// plus le sous-titre de discipline derrière la plaque de l'avatar triptyque (asp > 1,4), et une
// carte sans streak/badge ne laisse plus la date collée en haut d'un grand vide. Zéro dépendance
// nouvelle : réutilise le navigateur déjà piloté par les suites E2E (Playwright/harness.mjs).
import { startServer, launchBrowser } from "../tests/e2e/harness.mjs";

const PORT = 8491;
const server = await startServer(PORT);
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });

const AVATAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 534" width="300" height="534">'
  + '<rect width="300" height="534" fill="#dfe7e2"/></svg>';
const ACCENT = "#9b72ff"; // couleur du sous-titre dans cette mesure — 155,114,255

const r = await page.evaluate(async ({ avatarSVG, accent }) => {
  const mod = await import("/js/export.js");
  const blob = await mod.storyBlob(
    { sessionName: "x", sport: "run", streak: 0, badge: null, avatarSVG, avatarAspect: 1.78, accent },
    "story"
  );
  const bmp = await createImageBitmap(blob);
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const cx = c.getContext("2d");
  cx.drawImage(bmp, 0, 0);
  // a) La plaque de l'avatar commence à (304,274) [dx-pad,dy-pad], coin arrondi de rayon 32.
  // Bande échantillonnée STRICTEMENT à l'intérieur du rectangle plein — x ≥ 340 (au-delà du
  // rayon, donc hors de la zone du coin arrondi quel que soit dy) ET y ∈ [278,300] (sous le bord
  // haut réel de la plaque à 274, dans la zone couverte par la plaque ET dans la hauteur du
  // sous-titre, 52px gras à la ligne de base 290 ⇒ texte visible sur y≈[251,303]).
  const { data } = cx.getImageData(340, 278, 150, 22);
  const [tr, tg, tb] = [0x9b, 0x72, 0xff];
  let accentPixels = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (Math.abs(data[i] - tr) < 30 && Math.abs(data[i + 1] - tg) < 30 && Math.abs(data[i + 2] - tb) < 30 && data[i + 3] > 100) accentPixels++;
  }
  // b) La date (dernier _ebTxt avant le pied de page) : sa position verticale quand streak/badge
  // sont absents — on cherche la première ligne non-transparente après y=1400.
  let dateY = null;
  for (let y = 1400; y < 1800 && dateY === null; y += 5) {
    const row = cx.getImageData(0, y, c.width, 1).data;
    for (let i = 0; i < row.length; i += 4) if (row[i + 3] > 40) { dateY = y; break; }
  }
  return { accentPixelsSousLaPlaque: accentPixels, dateY };
}, { avatarSVG: AVATAR_SVG, accent: ACCENT });

const ok1 = r.accentPixelsSousLaPlaque > 100; // le sous-titre PEINT (couleur accent) survit sous la plaque
const ok2 = r.dateY !== null && r.dateY > 1450 && r.dateY < 1650; // recentrée, pas collée en haut (~1300 avant)
console.log(JSON.stringify(r));
console.log(ok1 && ok2 ? "O-121 VERT" : "O-121 ROUGE");

await browser.close();
server.close();
process.exit(ok1 && ok2 ? 0 : 1);
