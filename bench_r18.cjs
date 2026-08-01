#!/usr/bin/env node
/**
 * bench_r18.js — banc du lot R18 (retour de test du fondateur, 01/08/2026).
 *
 * Usage : node bench_r18.js [chemin/engine.js]
 *
 * Six constats sont revenus d'un test de l'application. Cinq étaient des défauts, et deux
 * d'entre eux se sont révélés plus larges que ce que le test avait vu. Ce banc verrouille
 * ce qui a été corrigé — il est ROUGE par construction contre un build antérieur à R18.
 *
 *   R18.4  la spécificité multisport disparaissait de l'affûtage : sur les 4 formats de tri
 *          et les 4 de duathlon, tous niveaux, le dernier enchaînement vélo↔course tombait
 *          TROIS SEMAINES avant le jour J.
 *   R18.5  la cadence de récupération était aveugle aux phases : 75 % des plans posaient une
 *          décharge DANS la phase pic, 75 % ouvraient une phase sur une décharge.
 *
 * Ce que ce banc NE couvre PAS, et pourquoi : R18.1 (zoom involontaire) et R18.3 (onglets)
 * sont de l'interface — ils sont assertés dans les suites Playwright, contre un vrai
 * navigateur, parce qu'un test de CSS qui lit du CSS ne prouve rien sur ce qui est rendu.
 */
"use strict";
const path = require("path");
require(path.resolve(process.argv[2] || "./js/engine.js"));
const E = globalThis.EBV2;
if (!E || typeof E.buildPlan !== "function") { console.error("EBV2 introuvable."); process.exit(2); }

const R = [];
const check = (id, label, fn) => { try { const r = fn(); R.push({ id, label, ok: !!r.ok, info: r.info || "" }); } catch (e) { R.push({ id, label, ok: false, info: "EXCEPTION: " + (e.human || e.message) }); } };
/** Course calée un DIMANCHE : c'est le cas de la quasi-totalité des épreuves, et la position
 *  de la course dans la semaine remodèle la dernière semaine (N2). */
const sunday = (w) => { const d = new Date(Date.now() + w * 7 * 864e5); d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7)); return d.toISOString().slice(0, 10); };

const BASE = {
  intent: "competition", level: "inter", history: "confirme", dispo: "partielle", doubles: "non",
  off_days: "non", shift_ok: "non", sex: "H", sleep: "moyen", life_load: "normale", activity: "actif",
  injury: "aucune", med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "non",
  age: "35", weight: "78", height: "180", vol_max: "12", vol_recent: "8", sessions_max: "7",
  terrain: "vallonne", ftp_known: "oui", ftp: "230", pace_known: "oui", pace: "4:50",
  css_known: "oui", css: "2:00", format: "70.3",
};
const ans = (o) => Object.assign({}, BASE, o);
const sessionsOf = (w) => { const o = []; for (const d of w.days) for (const s of d.sessions) if (s.d !== "rs") o.push(s); return o; };

/** Le balayage qui a produit les mesures de R18.5 : plusieurs horizons, parce que la longueur
 *  du plan change la longueur des phases, et c'est ELLE qui décidait du défaut. */
const HORIZONS = [12, 16, 20, 26, 32, 38, 44, 52];
const SPORTS = {
  run: { format: "marathon" }, bike: { format: "cyclo" }, swim: { format: "fond" },
  tri: { format: "70.3" }, duathlon: { format: "M" },
  trail: { race_distance_km: "45", race_dplus_m: "2200", race_technicity: "mixte", race_night: "non", train_dplus_access: "collines", poles: "oui" },
  swimrun: { format: "series", swim_total_m: "2000", run_total_km: "12", segments_n: "10", longest_swim_m: "600", water_temp_c: "18", team_mode: "solo", openwater_access: "saisonnier", swim_continuous: "oui", run_continuous: "oui", gear_test: "oui" },
};
const CADENCE = { reprise: 3, confirme: 4, ancien: 4 };

function balayage(fn, histories) {
  const ko = [];
  let n = 0;
  for (const [sp, extra] of Object.entries(SPORTS))
    for (const h of (histories || ["reprise", "confirme", "ancien"]))
      for (const sem of HORIZONS) {
        let p;
        try { p = E.buildPlan(sp, ans(Object.assign({ history: h, race_date: sunday(sem) }, extra))); }
        catch (e) { if (e && e.code === "ENTREE_INVALIDE") continue; throw e; }
        n++;
        const msg = fn(p, sp, h, sem);
        if (msg) ko.push(`${sp}/${h}/${sem}sem : ${msg}`);
      }
  return { n, ko };
}

/* ================= R18.4 — la transition survit à l'affûtage ================= */
const FORMATS_BRICK = { tri: ["S", "M", "70.3", "Full"], duathlon: ["S", "M", "L", "PM"] };

check("R18.4-A", "tri et duathlon : un enchaînement dans les 14 derniers jours du plan", () => {
  const ko = [];
  let n = 0;
  for (const sp of Object.keys(FORMATS_BRICK))
    for (const f of FORMATS_BRICK[sp])
      for (const lv of ["debutant", "inter", "avance"])
        for (const sem of [16, 26, 38]) {
          let p;
          try { p = E.buildPlan(sp, ans({ format: f, level: lv, race_date: sunday(sem) })); }
          catch (e) { if (e && e.code === "ENTREE_INVALIDE") continue; throw e; }
          n++;
          const derniere = Math.max(0, ...p.weeks.filter((w) => sessionsOf(w).some((s) => s.brick)).map((w) => w.num));
          const ecart = p.weeks.length - derniere;
          if (!derniere) ko.push(`${sp}/${f}/${lv}/${sem}sem : AUCUN enchaînement dans le plan`);
          else if (ecart > 2) ko.push(`${sp}/${f}/${lv}/${sem}sem : dernier en S${derniere}, course en S${p.weeks.length} (${ecart} semaines sans transition)`);
        }
  return { ok: !ko.length, info: ko.length ? `${ko.length}/${n} — ${ko[0]}` : `${n} profils, écart max 2 semaines` };
});

check("R18.4-B", "le brick d'affûtage respecte ses bornes C21c et n'est jamais dans la semaine de course", () => {
  // C21c : le PLAFOND d'un brick d'affûtage est le PLANCHER de la bande de charge du format.
  const BORNES = { S: [20, 45], M: [25, 60], "70.3": [30, 90], Full: [40, 150], L: [30, 70], PM: [40, 150] };
  const ko = [];
  let n = 0, vus = 0;
  for (const sp of Object.keys(FORMATS_BRICK))
    for (const f of FORMATS_BRICK[sp])
      for (const sem of [16, 26, 38]) {
        let p;
        try { p = E.buildPlan(sp, ans({ format: f, race_date: sunday(sem) })); }
        catch (e) { if (e && e.code === "ENTREE_INVALIDE") continue; throw e; }
        n++;
        for (const w of p.weeks) {
          if (w.phase.id !== "taper") continue;
          for (const s of sessionsOf(w)) {
            if (!s.brick) continue;
            vus++;
            if (w.num === p.weeks.length) ko.push(`${sp}/${f}/${sem}sem : enchaînement DANS la semaine de course (S${w.num})`);
            const bike = (s.steps || []).find((st) => st.leg === "bike");
            const b = BORNES[f];
            if (bike && b && (bike.durationMin < b[0] || bike.durationMin > b[1]))
              ko.push(`${sp}/${f}/${sem}sem : leg vélo ${bike.durationMin}min hors [${b[0]}, ${b[1]}]`);
          }
        }
      }
  if (!vus) return { ok: false, info: "aucun brick d'affûtage observé — le critère ne mesure rien" };
  return { ok: !ko.length, info: ko.length ? `${ko.length} écart(s) — ${ko[0]}` : `${vus} bricks d'affûtage sur ${n} plans, tous dans leurs bornes` };
});

check("R18.4-C", "l'affûtage réduit le VOLUME du brick, pas sa nature : il reste plus court que celui du pic", () => {
  const ko = [];
  for (const sp of Object.keys(FORMATS_BRICK))
    for (const f of FORMATS_BRICK[sp]) {
      let p;
      try { p = E.buildPlan(sp, ans({ format: f, race_date: sunday(26) })); }
      catch (e) { if (e && e.code === "ENTREE_INVALIDE") continue; throw e; }
      const dur = (ph) => { let m = 0; for (const w of p.weeks) if (w.phase.id === ph) for (const s of sessionsOf(w)) if (s.brick) m = Math.max(m, s.min || 0); return m; };
      const charge = Math.max(dur("spec"), dur("peak")), taper = dur("taper");
      if (!charge || !taper) { ko.push(`${sp}/${f} : brick manquant (charge=${charge}, affûtage=${taper})`); continue; }
      if (taper >= charge) ko.push(`${sp}/${f} : brick d'affûtage ${taper}min ≥ brick de charge ${charge}min`);
    }
  return { ok: !ko.length, info: ko.length ? ko[0] : "affûtage strictement plus court que la charge sur les 8 formats" };
});

/* ================= R18.5 — la récupération connaît les phases ================= */
check("R18.5-A", "aucune phase ne s'OUVRE sur une semaine de récupération", () => {
  const { n, ko } = balayage((p) => {
    for (let i = 1; i < p.weeks.length; i++) {
      const c = p.weeks[i], v = p.weeks[i - 1];
      if (c.isRecup && c.phase.id !== v.phase.id && c.phase.id !== "taper") return `S${c.num} ouvre « ${c.phase.id} » sur une décharge`;
    }
    return null;
  });
  return { ok: !ko.length, info: ko.length ? `${ko.length}/${n} — ${ko[0]}` : `${n} plans balayés` };
});

/**
 * L'ARBITRAGE, ÉCRIT UNE FOIS ET VÉRIFIÉ, PAS SUPPOSÉ.
 *
 * C27a/b/c savent refuser une position de décharge ; R18.5-D dit qu'aucune d'elles n'a le
 * droit de le faire au prix d'une semaine de charge de plus que la cadence de l'athlète.
 * Sur certains gabarits, les deux exigences sont incompatibles — typiquement une cadence de
 * 3 (profil « reprise ») avec un spécifique de 4 semaines et un pic de 2 : la 4e décharge
 * tombe mécaniquement sur la dernière semaine de pic, et l'avancer d'un cycle ne laisserait
 * qu'UNE semaine de charge entre deux décharges. Le moteur tranche alors dans l'ordre du
 * manifeste : la cadence gagne, la règle de placement cède.
 *
 * Ce prédicat DÉMONTRE que c'est bien ce cas-là, au lieu de l'admettre sur parole : il retire
 * la décharge litigieuse et vérifie que la série de charge dépasserait alors la cadence. Un
 * écart qui ne passe pas ce test reste un échec — c'est la différence entre une exception
 * posée d'avance et un test affaibli pour devenir vert.
 */
function cedeALaCadence(p, numRecup, cadence) {
  let suite = 0;
  for (const w of p.weeks) {
    if (w.phase.id === "taper") { suite = 0; continue; }
    if (w.isRecup && w.num !== numRecup) { suite = 0; continue; }
    if (++suite > cadence) return true;
  }
  return false;
}
let arbitrages = 0;

check("R18.5-B", "aucune récupération dans un pic COURT — l'affûtage qui suit en tient lieu", () => {
  // « Court » = au plus autant de semaines que la cadence de l'athlète. Au-delà (R13.6 laisse
  // le pic monter à 5 semaines), le pic mérite sa propre décharge et la garde se désactive
  // d'elle-même : c'est écrit comme ça dans le moteur, on le vérifie tel quel.
  const { n, ko } = balayage((p, sp, h) => {
    const pic = p.weeks.filter((w) => w.phase.id === "peak");
    if (pic.length > CADENCE[h]) return null;
    const r = pic.find((w) => w.isRecup);
    if (!r) return null;
    if (cedeALaCadence(p, r.num, CADENCE[h])) { arbitrages++; return null; }
    return `S${r.num} : décharge dans un pic de ${pic.length} semaine(s), cadence ${CADENCE[h]}, et la retirer ne dépasserait PAS la cadence`;
  });
  return { ok: !ko.length, info: ko.length ? `${ko.length}/${n} — ${ko[0]}` : `${n} plans balayés` };
});

check("R18.5-C", "aucune récupération COLLÉE à l'affûtage (deux décharges d'affilée avant le départ)", () => {
  const { n, ko } = balayage((p, sp, h) => {
    const i = p.weeks.findIndex((w) => w.phase.id === "taper");
    if (i <= 0 || !p.weeks[i - 1].isRecup) return null;
    if (cedeALaCadence(p, p.weeks[i - 1].num, CADENCE[h])) { arbitrages++; return null; }
    return `S${p.weeks[i - 1].num} : décharge juste avant l'affûtage, et la retirer ne dépasserait PAS la cadence`;
  });
  return { ok: !ko.length, info: ko.length ? `${ko.length}/${n} — ${ko[0]}` : `${n} plans balayés` };
});

check("R18.5-D", "aucune règle de placement ne fait dépasser sa cadence à l'athlète", () => {
  // LE critère qui domine les trois autres. Une règle qui protège la spécificité en ajoutant
  // une semaine de charge inverse l'ordre du manifeste : santé, puis prévention, puis
  // régularité, puis progression. C'est ce garde qui a ramené la plus longue série de
  // semaines de charge de 5 à 4 pendant l'écriture de R18.5.
  const { n, ko } = balayage((p, sp, h) => {
    let suite = 0;
    for (const w of p.weeks) {
      if (w.isRecup || w.phase.id === "taper") { suite = 0; continue; }
      if (++suite > CADENCE[h]) return `S${w.num} : ${suite} semaines de charge d'affilée, cadence ${CADENCE[h]}`;
    }
    return null;
  });
  return { ok: !ko.length, info: ko.length ? `${ko.length}/${n} — ${ko[0]}` : `${n} plans balayés` };
});

check("R18.5-E", "on n'a supprimé aucune récupération : les plans en gardent autant qu'avant", () => {
  // Le risque d'un lot qui DÉPLACE des décharges est d'en perdre en route — et une décharge
  // perdue est de la charge ajoutée en silence. On ne compare pas à un nombre gravé (il
  // dépend de la longueur du plan) : on vérifie la densité, une décharge au moins toutes les
  // `cadence + 1` semaines de charge, sur tout le plan hors affûtage.
  const { n, ko } = balayage((p, sp, h) => {
    const horsTaper = p.weeks.filter((w) => w.phase.id !== "taper");
    if (horsTaper.length < 8) return null;
    const nR = horsTaper.filter((w) => w.isRecup).length;
    const attendu = Math.floor(horsTaper.length / (CADENCE[h] + 1));
    return nR < attendu ? `${nR} récup pour ${horsTaper.length} semaines (attendu ≥ ${attendu})` : null;
  });
  return { ok: !ko.length, info: ko.length ? `${ko.length}/${n} — ${ko[0]}` : `${n} plans balayés` };
});

/* ================= Non-régressions ================= */
check("R18-NR", "R13/R14/R15 tiennent : pas de force en affûtage, jour J à 0 min, pic non vide", () => {
  const p = E.buildPlan("tri", ans({ race_date: sunday(26) }));
  let frc = 0, race = null;
  for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions) {
    if (s.race) race = s;
    if (w.phase.id === "taper") for (const st of (s.steps || [])) if (/\.frc$/.test(st.zone || "")) frc++;
  }
  const picCharge = p.weeks.filter((w) => w.phase.id === "peak" && !w.isRecup).length;
  return { ok: frc === 0 && race && (race.min || 0) === 0 && picCharge >= 1,
    info: `force en affûtage=${frc} · jour J=${race ? Math.round(race.min || 0) : "?"}min · semaines de pic en charge=${picCharge}` };
});

let fail = 0;
console.log("\n== BANC R18 — retour de test du fondateur · moteur " + (E.version || "?") + " ==\n");
for (const r of R) { if (!r.ok) fail++; console.log((r.ok ? "  PASS " : "✗ FAIL ") + r.id.padEnd(12) + r.label + (r.info ? "\n               — " + r.info : "")); }
// L'arbitrage est AFFICHÉ, jamais silencieux : c'est une décision de conception qui coûte
// une bonne position de décharge à quelques gabarits, et le jour où ce compteur explose,
// c'est que la répartition des phases a bougé — pas que le lot a cessé de marcher.
console.log("\nArbitrages « la cadence gagne sur le placement » : " + arbitrages
  + " (chacun démontré : retirer la décharge ferait dépasser la cadence de l'athlète)");
console.log("\n" + (fail ? fail + " échec(s)." : "Tout passe."));
process.exit(fail ? 1 : 0);
