// LE BADGE-ANNEAU (R27) — les deux propriétés que le brief nomme, plus celles que le rendu a
// coûté à écrire.
//
// Le brief demande explicitement de vérifier « que le rayon/épaisseur de l'anneau extérieur
// correspond toujours à la discipline MENEUSE réelle (pas un ordre fixe) », et « que l'état
// légendaire ne s'active que si les 3 niveaux valent exactement 30 ». Ce sont les §1 et §2.
//
// §3 et §4 gardent ce que la construction a fait apparaître : le score ne peut pas annoncer 100
// hors état légendaire (propriété du barème, vérifiée exhaustivement ici et non sur un
// échantillon), et les couleurs DESCENDENT de `DISC` — le module étant PUR, elles arrivent par
// paramètre, donc rien ne garantirait sans témoin que l'UI passe bien la table.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";
import { avatarRingSVG, avatarGlobalScore } from "../../endurabuild/js/ui/avatar-tri.js";
import { DISC } from "../../endurabuild/js/ui/icons.js";

const { ok, report } = makeReporter();

// ─────────── §1 · L'anneau extérieur suit la discipline MENEUSE ───────────
// Le rayon extérieur est fixe (38) ; c'est l'AFFECTATION qui doit suivre. On lit la couleur du
// cercle de rayon 38 et on exige qu'elle soit celle de la discipline la plus haute.
{
  const COUL = { natation: DISC.sw.ac, velo: DISC.bk.ac, course: DISC.rn.ac };
  const couleurDuRayon = (svg, r) => {
    // le premier cercle de ce rayon qui porte une couleur (le second est la piste grise)
    const re = new RegExp('<circle[^>]*r="' + r + '"[^>]*stroke="([^"]+)"[^>]*/>', "g");
    const t = [];
    let m;
    while ((m = re.exec(svg))) t.push(m[1]);
    return t.find((c) => c !== "rgba(245,241,234,.08)" && c !== "rgba(245,241,234,.10)") || null;
  };
  const CAS = [
    { v: { natation: 25, velo: 3, course: 4 }, attendu: "natation" },
    { v: { natation: 3, velo: 25, course: 4 }, attendu: "velo" },
    { v: { natation: 3, velo: 4, course: 25 }, attendu: "course" },
    { v: { natation: 0, velo: 0, course: 1 }, attendu: "course" },
  ];
  const rates = [];
  for (const c of CAS) {
    const svg = avatarRingSVG(c.v, 120, { couleurs: COUL });
    const vu = couleurDuRayon(svg, 38);
    if (vu !== COUL[c.attendu]) rates.push(JSON.stringify(c.v) + " → " + vu + " ≠ " + COUL[c.attendu]);
  }
  ok(rates.length === 0, "§1 — l'anneau extérieur (r=38) porte toujours la discipline meneuse"
    + (rates.length ? " — " + rates.join(" | ") : " (4 cas, dont une meneuse différente à chaque fois)"));

  // LE TÉMOIN : sans lui, « la couleur du r=38 est celle de la meneuse » serait satisfait par un
  // ordre FIXE si la meneuse se trouvait toujours en première position. On vérifie donc que la
  // couleur CHANGE quand la meneuse change — c'est ce que « pas un ordre fixe » veut dire.
  const a = couleurDuRayon(avatarRingSVG({ natation: 25, velo: 3, course: 4 }, 120, { couleurs: COUL }), 38);
  const b = couleurDuRayon(avatarRingSVG({ natation: 3, velo: 25, course: 4 }, 120, { couleurs: COUL }), 38);
  ok(a !== b, "…et elle CHANGE avec la meneuse — l'ordre n'est pas figé (" + a + " → " + b + ")");
}

// ─────────── §2 · L'état légendaire n'est QUE 30/30/30 ───────────
// Balayage exhaustif : 29 791 triplets, pas un échantillon. Le coût est nul (le module est pur)
// et c'est la seule façon de dire « exactement 30 » sans laisser un trou.
{
  let legendaires = 0, faux = null;
  for (let n = 0; n <= 30; n++) for (let v = 0; v <= 30; v++) for (let c = 0; c <= 30; c++) {
    const svg = avatarRingSVG({ natation: n, velo: v, course: c }, 96);
    const leg = svg.includes("LÉGENDE");
    const attendu = n === 30 && v === 30 && c === 30;
    if (leg) legendaires++;
    if (leg !== attendu && !faux) faux = n + "/" + v + "/" + c + " → " + (leg ? "légendaire" : "normal");
  }
  ok(legendaires === 1 && !faux,
    "§2 — sur 29 791 triplets, EXACTEMENT un est légendaire (" + legendaires + (faux ? ", écart : " + faux : "") + ")");
}

// ─────────── §3 · Le score : 0, 100, et jamais 100 par erreur ───────────
{
  ok(avatarGlobalScore({ natation: 0, velo: 0, course: 0 }) === 0, "§3 — 0/0/0 rend exactement 0");
  ok(avatarGlobalScore({ natation: 30, velo: 30, course: 30 }) === 100, "…30/30/30 rend exactement 100");
  let maxNonLeg = -1, arg = "";
  for (let n = 0; n <= 30; n++) for (let v = 0; v <= 30; v++) for (let c = 0; c <= 30; c++) {
    if (n === 30 && v === 30 && c === 30) continue;
    const s = avatarGlobalScore({ natation: n, velo: v, course: c });
    if (s > maxNonLeg) { maxNonLeg = s; arg = n + "/" + v + "/" + c; }
  }
  ok(maxNonLeg < 100, "…et AUCUN autre triplet n'atteint 100 — le meilleur est " + maxNonLeg + " à " + arg);
  // le barème doit rester GÉNÉREUX au début : c'est sa raison d'être face à la somme brute.
  const tot = avatarGlobalScore({ natation: 9, velo: 4, course: 6 });
  const naif = Math.round((9 + 4 + 6) / 90 * 100);
  ok(tot > naif + 10, "…et il relève nettement le début de parcours (9/4/6 : " + naif + " en somme brute → " + tot + ")");
}

// ─────────── §4 · Les couleurs descendent de DISC ───────────
// Le module est PUR : il ne peut pas lire `DISC`. La garantie ne peut donc porter que sur le
// PONT — l'UI passe-t-elle bien la table ? Deux moitiés : le rendu obéit au paramètre, et
// l'écran Profil passe les valeurs de `DISC`.
{
  const svg = avatarRingSVG({ natation: 25, velo: 3, course: 4 }, 120,
    { couleurs: { natation: "#00ff00", velo: "#123456", course: "#654321" } });
  ok(svg.includes("#00ff00"), "§4 — le rendu obéit aux couleurs passées (témoin #00ff00)");
  ok(!svg.includes("#00b8d9"), "…et ne retombe pas sur sa table locale quand on lui en donne une");
}

// ─────────── §5 · À l'écran : le Profil porte le badge, aux couleurs de la table ───────────
const PORT = 8617;
const server = await startServer(PORT);
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
const st = runnerStateV1({ format: "70.3", weight: "72" });
st.sport = "tri";
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "load" });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, st);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.evaluate(async () => { const { setTab } = await import("./js/ui/tabs.js"); setTab("profile"); });
await page.waitForTimeout(800);
{
  const m = await page.evaluate(async () => {
    const { DISC } = await import("./js/ui/icons.js");
    const b = document.querySelector("#avSvg svg");
    if (!b) return { absent: true };
    const r = b.getBoundingClientRect();
    const cercles = [...b.querySelectorAll("circle")].map((c) => c.getAttribute("stroke"));
    return { w: Math.round(r.width), h: Math.round(r.height), aria: b.getAttribute("aria-label") || "",
      cercles, table: [DISC.sw.ac, DISC.bk.ac, DISC.rn.ac] };
  });
  ok(!m.absent, "§5 — l'écran Profil porte bien le badge-anneau" + (m.absent ? "" : " (" + m.w + "×" + m.h + " px)"));
  if (!m.absent) {
    ok(/score \d+ sur 100|LÉGENDE/.test(m.aria), "…avec un libellé qui DIT le score : « " + m.aria.slice(0, 54) + "… »");
    const dispo = m.table.filter((c) => m.cercles.includes(c));
    ok(dispo.length >= 1, "…et ses anneaux portent les couleurs de la table DISC (" + dispo.join(" · ") + ")");
  }
}

ok(errs.length === 0, "aucune erreur JS (" + errs.length + (errs.length ? " — " + errs[0] : "") + ")");
await browser.close();
server.close();
process.exit(report());
