/**
 * §3 — LA CHARGE D'ÉPAULE : EXISTE-T-IL UNE BORNE AU VOLUME HEBDOMADAIRE DE NAGE ?
 *
 * Question du fondateur (19/08/2026) : *« 12,1 km de nage en une semaine, pour un athlète qui
 * nage depuis un an en autodidacte et dont la technique se dégrade sous fatigue. Rien dans le
 * moteur ne borne le volume de nage par la charge articulaire. »*
 *
 * `MAX_RUN_DAYS` borne les JOURS d'impact en course ; l'argument qui avait écarté un
 * `MAX_SWIM_DAYS` portait sur la FRÉQUENCE — bénigne, voire souhaitable en nage — et **il ne
 * s'applique pas au VOLUME**.
 *
 * Trois questions, dans l'ordre du fondateur :
 *   §A  la distribution du volume de nage hebdomadaire sur les 989 profils
 *   §B  combien dépassent 10 / 12 / 15 km, et QUI
 *   §C  existe-t-il une borne quelque part qui y touche, même indirectement ?
 *
 * ⚠ §C observe le COMPORTEMENT (règle 15) : on ne lit pas les tables, on fait VARIER le volume
 * demandé et on regarde si le volume de nage livré sature quelque part. Une borne qui existe se
 * voit comme un plateau ; une borne absente se voit comme une droite.
 *
 *   npm run mesure:epaule
 */
import "../src/app/bridge.ts";
import { profiles } from "./goldenMaster.mjs";

const metresSemaine = (w) => w.days.reduce((t, d) => t + d.sessions.reduce((u, s) =>
  u + (s.d === "sw" ? (s.steps || []).reduce((v, b) => v + (b.distanceM ? (b.reps || 1) * b.distanceM : 0), 0) : 0), 0), 0);

// ─── §A/§B — la distribution sur le corpus ────────────────────────────────────────────────
const pics = [];
let profilsAvecNage = 0;
for (const { key, sport, a } of profiles()) {
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  const sem = (p.weeks || []).filter((w) => !w.isRecup && w.phase.id !== "taper").map(metresSemaine);
  const max = Math.max(0, ...sem);
  if (max <= 0) continue;
  profilsAvecNage++;
  pics.push({ key, sport, max, declare: a.vol_max, niveau: a.level, hist: a.history });
}
if (!profilsAvecNage) { console.error("✖ sonde vide"); process.exit(1); }
pics.sort((x, y) => x.max - y.max);
const q = (f) => pics[Math.min(pics.length - 1, Math.floor(pics.length * f))].max;

console.log("§A — DISTRIBUTION du volume de nage de la semaine la plus chargée (semaines de charge)\n");
console.log(`  population : ${profilsAvecNage} profils qui nagent, sur ${pics.length} mesurés`);
console.log(`  médiane ${(q(0.5) / 1000).toFixed(1)} km · p75 ${(q(0.75) / 1000).toFixed(1)} km · p90 ${(q(0.9) / 1000).toFixed(1)} km · p99 ${(q(0.99) / 1000).toFixed(1)} km · max ${(pics[pics.length - 1].max / 1000).toFixed(1)} km`);

console.log("\n§B — COMBIEN DÉPASSENT, ET QUI\n");
for (const seuil of [8000, 10000, 12000, 15000, 20000]) {
  const au = pics.filter((x) => x.max > seuil);
  const parSport = new Map();
  for (const x of au) parSport.set(x.sport, (parSport.get(x.sport) ?? 0) + 1);
  const detail = [...parSport].sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${v}`).join(" · ");
  console.log(`  > ${seuil / 1000} km : ${String(au.length).padStart(3)} profils (${(100 * au.length / profilsAvecNage).toFixed(1)} %)${detail ? "   " + detail : ""}`);
}
console.log("\n  les 6 plus chargés :");
for (const x of pics.slice(-6).reverse())
  console.log(`    ${(x.max / 1000).toFixed(1)} km   ${x.key}   (déclaré ${x.declare} h · ${x.niveau} · ${x.hist})`);

// ─── §C — une borne existe-t-elle ? On la CHERCHE par saturation, on ne la lit pas ────────
console.log("\n§C — UNE BORNE EXISTE-T-ELLE ? (on fait varier `vol_max`, on regarde si le livré sature)\n");
const base = { sport: "tri", intent: "competition", format: "70.3", history: "confirme", level: "inter",
  vol_recent: "8", sessions_max: "12", dispo: "quotidienne", shift_ok: "oui", off_days: "non",
  doubles: "oui", injury: "aucune", age: "35", sex: "H", weight: "75", terrain: "plat",
  leg_swim_env: "lac", milieu: "bassin", longest_swim_m: "1500", longest_swim_known: "oui",
  pace_known: "oui", pace: "4:42", ftp_known: "oui", ftp: "236", css_known: "oui", css: "2:02",
  med_pain: "non", med_dizzy: "non", med_treat: "non" };
console.log("  vol_max   nage max/sem   séances de nage   jours de nage");
let prec = 0, plateau = 0, points = 0;
for (const vm of ["8", "10", "12", "14", "16", "18", "20", "25", "30"]) {
  let p; try { p = globalThis.EBV2.buildPlan("tri", { ...base, vol_max: vm }); } catch { continue; }
  points++;
  const ch = (p.weeks || []).filter((w) => !w.isRecup && w.phase.id !== "taper");
  const wMax = ch.reduce((x, w) => (metresSemaine(w) > metresSemaine(x) ? w : x), ch[0]);
  const m = metresSemaine(wMax);
  const nS = wMax.days.reduce((t, d) => t + d.sessions.filter((s) => s.d === "sw").length, 0);
  const nJ = wMax.days.filter((d) => d.sessions.some((s) => s.d === "sw")).length;
  const croit = m > prec + 100;
  if (!croit && prec > 0) plateau++;
  console.log(`  ${vm.padStart(5)} h   ${(m / 1000).toFixed(2).padStart(9)} km   ${String(nS).padStart(13)}   ${String(nJ).padStart(11)}${croit ? "" : "   ← plateau"}`);
  prec = m;
}
if (points < 5) { console.error("✖ §C : trop peu de points pour conclure"); process.exit(1); }
console.log(`\n${"─".repeat(78)}`);
console.log(plateau >= 2
  ? "→ UNE BORNE EXISTE quelque part : le volume de nage livré SATURE quand la demande monte.\n  Reste à la nommer (elle peut être un plafond de séance × fréquence, pas une borne d'épaule)."
  : "→ AUCUNE BORNE : le volume de nage livré suit la demande sans jamais saturer. La charge\n  articulaire de l'épaule n'est bornée NULLE PART — c'est un ticket de SÉCURITÉ, et il ne se\n  règle pas par l'allocation seule.");
