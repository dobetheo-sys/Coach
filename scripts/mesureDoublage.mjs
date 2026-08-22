/**
 * LE PLAFOND EST-IL CELUI DU MOTEUR OU CELUI DU CORPUS ? (PLAFOND_CALENDRIER, §1 et §2)
 *
 * Constat qui déclenche : **un seul profil sur 990 déclare `doubles: "oui"`** — donc toutes
 * les mesures de plafond publiées portent sur une population qui ne double pas. « Le plafond
 * est structurel » était vrai DU CORPUS, pas prouvé DU MOTEUR.
 *
 * Ce script enrichit l'axe `doubles × dispo × sessions_max × vol_max` HORS golden (une grille
 * ad hoc, pas une seconde population de référence : le golden reste la photo). Il part d'un
 * profil RÉEL du corpus et ne fait varier que les axes nommés par le fondateur — aucune valeur
 * inventée, tous les domaines viennent d'`ANSWER_SCHEMA`.
 *
 * Il mesure sur le plan LIVRÉ (règle 15) : pic, créneaux, jours doublés, et QUELS créneaux
 * portent la seconde séance.
 *
 *   npm run mesure:doublage
 */
import "../src/app/bridge.ts";
import { profiles } from "./goldenMaster.mjs";
import { estCharge } from "./lib/planMetrics.mjs";

const seances = (d) => (d.sessions ?? []).filter((s) => s && s.d !== "rs" && !s.race);
const minJour = (d) => seances(d).reduce((t, s) => t + (s.min || 0), 0);

/** Bases RÉELLES : on prend des profils du corpus, on ne fabrique pas d'athlète. */
const BASES = new Map();
for (const { key, sport, a } of profiles()) {
  for (const [nom, motif] of [["tri/70.3", /^REEL\/tri\/70\.3/], ["tri/Full", /^G\/tri\/Full\/vol-max$/],
                              ["bike/gravel", /^G\/bike\/gravel\/vol-max$/], ["run/marathon", /^G\/run\/marathon\/vol-max$/]])
    if (motif.test(key) && !BASES.has(nom)) BASES.set(nom, { key, sport, a });
}
if (BASES.size < 3) { console.error(`✖ bases introuvables (${[...BASES.keys()].join(", ")})`); process.exit(1); }

const DOUBLES = ["non", "parfois", "oui"];
const DISPO = ["weekend", "partielle", "semaine", "quotidienne"];
const SESSIONS = ["6", "10", "14"];
const VOLMAX = ["10", "20"];

const lignes = [];
for (const [nom, base] of BASES) {
  for (const doubles of DOUBLES) for (const dispo of DISPO) for (const sessions_max of SESSIONS) for (const vol_max of VOLMAX) {
    const a = { ...base.a, doubles, dispo, sessions_max, vol_max };
    let p; try { p = globalThis.EBV2.buildPlan(base.sport, a); } catch { continue; }
    const ch = (p.weeks ?? []).filter(estCharge);
    if (!ch.length) continue;
    let best = null, bm = -1;
    for (const w of ch) { const m = w.days.reduce((t, d) => t + minJour(d), 0); if (m > bm) { bm = m; best = w; } }
    const cren = best.days.reduce((t, d) => t + seances(d).length, 0);
    const jours = best.days.filter((d) => seances(d).length > 0).length;
    const dbls = best.days.filter((d) => seances(d).length > 1);
    lignes.push({ nom, doubles, dispo, sessions_max, vol_max, picH: bm / 60, cren, jours,
      nDbl: dbls.length, slots: dbls.map((d) => d.slot ?? "?").join("+") || "—" });
  }
}
if (!lignes.length) { console.error("✖ sonde vide"); process.exit(1); }
console.log(`population : ${lignes.length} plans (${BASES.size} bases réelles × ${DOUBLES.length} doubles × ${DISPO.length} dispo × ${SESSIONS.length} sessions_max × ${VOLMAX.length} vol_max)`);

// ─── §A — le pic maximum atteignable, par sport et par réponse `doubles` ───────────────────
console.log("\n§A — PIC LIVRÉ MAXIMUM, par sport × doubles (toutes dispo, tous sessions_max, tous vol_max)");
for (const nom of BASES.keys()) {
  const l = [];
  for (const doubles of DOUBLES) {
    const s = lignes.filter((x) => x.nom === nom && x.doubles === doubles);
    if (!s.length) { l.push(`${doubles} —`); continue; }
    const m = s.reduce((b, x) => (x.picH > b.picH ? x : b));
    l.push(`${doubles} ${m.picH.toFixed(2)} h (${m.cren} cr · ${m.nDbl} j doublés)`);
  }
  console.log(`   ${nom.padEnd(13)} ${l.join("  |  ")}`);
}

// ─── §B — d'où vient « au plus N jours doublés » : constante ou émergent ? ─────────────────
console.log("\n§B — JOURS DOUBLÉS DANS LA SEMAINE DE PIC (doubles = oui)");
const oui = lignes.filter((x) => x.doubles === "oui");
const dist = new Map();
for (const x of oui) dist.set(x.nDbl, (dist.get(x.nDbl) ?? 0) + 1);
console.log(`   distribution : ${[...dist].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k} j × ${v}`).join(" · ")} · maximum ${Math.max(...oui.map((x) => x.nDbl))}`);
const slots = new Map();
for (const x of oui) for (const s of x.slots.split("+")) if (s !== "—") slots.set(s, (slots.get(s) ?? 0) + 1);
console.log(`   créneaux qui portent la 2ᵉ séance : ${[...slots].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(" · ")}`);

// ─── §C — `dispo` déplace-t-il quelque chose ? ────────────────────────────────────────────
console.log("\n§C — L'EFFET DE `dispo` (à doubles = oui, sessions_max = 14, vol_max = 20)");
for (const nom of BASES.keys()) {
  const l = DISPO.map((dispo) => {
    const x = lignes.find((y) => y.nom === nom && y.doubles === "oui" && y.dispo === dispo && y.sessions_max === "14" && y.vol_max === "20");
    return x ? `${dispo.slice(0, 4)} ${x.picH.toFixed(1)}h/${x.jours}j/${x.cren}cr` : `${dispo.slice(0, 4)} —`;
  });
  console.log(`   ${nom.padEnd(13)} ${l.join("  ")}`);
}

// ─── §D — `sessions_max` déplace-t-il quelque chose ? ─────────────────────────────────────
console.log("\n§D — L'EFFET DE `sessions_max` (à doubles = oui, dispo = quotidienne, vol_max = 20)");
for (const nom of BASES.keys()) {
  const l = SESSIONS.map((sm) => {
    const x = lignes.find((y) => y.nom === nom && y.doubles === "oui" && y.dispo === "quotidienne" && y.sessions_max === sm && y.vol_max === "20");
    return x ? `${sm} → ${x.picH.toFixed(2)} h / ${x.cren} créneaux` : `${sm} → —`;
  });
  console.log(`   ${nom.padEnd(13)} ${l.join("  ·  ")}`);
}

// ─── §E — le plafond OFFERT : ce que le moteur peut livrer au mieux, par disponibilité ────
console.log("\n§E — LE PLAFOND OFFERT (max sur tout le reste), par sport × dispo × doubles");
for (const nom of BASES.keys()) for (const dispo of DISPO) {
  const l = DOUBLES.map((d) => {
    const s = lignes.filter((x) => x.nom === nom && x.dispo === dispo && x.doubles === d);
    return s.length ? `${d.padEnd(7)} ${Math.max(...s.map((x) => x.picH)).toFixed(2)} h` : `${d} —`;
  });
  console.log(`   ${nom.padEnd(13)} ${dispo.padEnd(11)} ${l.join("  ")}`);
}

// ─── §F — O-100b : l'inversion `semaine` > `quotidienne` survit-elle à la fenêtre de 10 jours ?
// L'hypothèse posée était « `quotidienne` ouvre le cycle glissant de 10 jours, donc c'est
// l'instrument ». On vérifie la PRÉMISSE d'abord (le plan livré a-t-il des semaines de 10
// jours ?), puis on mesure quand même sur la fenêtre de 10 jours — règle 15 : on observe la
// sortie, on ne modélise pas le cycle.
const b703 = BASES.get("tri/70.3");
if (b703) {
  console.log("\n§F — O-100b : LA FENÊTRE DE 10 JOURS");
  for (const dispo of ["semaine", "quotidienne"]) {
    const a = { ...b703.a, doubles: "oui", sessions_max: "14", vol_max: "20", dispo };
    const p = globalThis.EBV2.buildPlan(b703.sport, a);
    const cyc = (p._v2?.decisions ?? []).find((d) => d.id === "cycle");
    const ch = (p.weeks ?? []).filter(estCharge);
    const pic7 = Math.max(...ch.map((w) => w.days.reduce((t, d) => t + minJour(d), 0)));
    const jours = (p.weeks ?? []).flatMap((w) => (w.days ?? []).map((d) => ({ m: minJour(d), c: estCharge(w) })));
    let pic10 = 0;
    for (let i = 0; i + 10 <= jours.length; i++) {
      const f = jours.slice(i, i + 10);
      if (!f.every((x) => x.c)) continue;
      pic10 = Math.max(pic10, f.reduce((t, x) => t + x.m, 0));
    }
    const tailles = new Map();
    for (const w of p.weeks ?? []) tailles.set(w.days.length, (tailles.get(w.days.length) ?? 0) + 1);
    console.log(`   ${dispo.padEnd(12)} use10=${String(p.use10).padEnd(5)} décision « cycle »=${cyc ? "publiée" : "absente"} · jours/semaine LIVRÉS : ${[...tailles].sort((x, y) => x[0] - y[0]).map(([k, v]) => `${k}j×${v}`).join(" · ")}`);
    console.log(`                pic 7 j ${(pic7 / 60).toFixed(2)} h · pic 10 j ${(pic10 / 60).toFixed(2)} h (${((pic10 / 60) * 0.7).toFixed(2)} h ramené à 7 j)`);
  }
  console.log("   → si l'inversion persiste sur 10 j, c'est le MOTEUR (règle d'arbitrage posée avec l'hypothèse).");
}
