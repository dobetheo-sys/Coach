#!/usr/bin/env node
/**
 * audit_v6.mjs — banc de régression EnduraBuild (moteur V2)
 * =========================================================
 * Reproduit chaque défaut identifié lors de l'audit du 29/07/2026.
 * Chaque test porte un ID stable : quand un défaut est corrigé, on passe
 * son `expect` de `fail` à `pass` et le test devient un garde-fou.
 *
 *   node audit_v6.mjs Coach_Pro_V1_5.html
 *   node audit_v6.mjs Coach_Pro_V1_5.html --verbose
 *   node audit_v6.mjs Coach_Pro_V1_5.html --only A1,B2
 *
 * Sortie : code 0 si aucune RÉGRESSION (un test attendu `pass` qui échoue,
 * ou un test attendu `fail` qui échoue autrement que prévu).
 * Les défauts connus (`expect:'fail'`) sont listés mais ne cassent pas la CI —
 * c'est la dette, pas la régression.
 */

import fs from "node:fs";
import path from "node:path";

// ─────────────────────────────────────────────────────────────────────
// Chargement du moteur
// ─────────────────────────────────────────────────────────────────────

const htmlPath = process.argv[2] || "Coach_Pro_V1_5.html";
const VERBOSE = process.argv.includes("--verbose");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7)
  .split(",").filter(Boolean);

function loadEngine(file) {
  if (!fs.existsSync(file)) {
    console.error(`✖ Fichier introuvable : ${path.resolve(file)}`);
    process.exit(2);
  }
  const src = fs.readFileSync(file, "utf8");
  const i = src.indexOf("/*__EBV2_START__*/");
  const j = src.indexOf("/*__EBV2_END__*/");
  if (i < 0 || j < 0) {
    console.error("✖ Marqueurs __EBV2_START__ / __EBV2_END__ absents — bundle non injecté ?");
    process.exit(2);
  }
  const bundle = src.slice(i, j + "/*__EBV2_END__*/".length);
  (0, eval)(bundle);
  if (!globalThis.EBV2) {
    console.error("✖ Le bundle ne publie pas globalThis.EBV2");
    process.exit(2);
  }
  return globalThis.EBV2;
}

const E = loadEngine(htmlPath);

// ─────────────────────────────────────────────────────────────────────
// Fabrique de profils
// ─────────────────────────────────────────────────────────────────────

const FORMATS = {
  tri: ["S", "M", "70.3", "Full"],
  run: ["5k", "10k", "semi", "marathon", "trail"],
  bike: ["crit", "route", "cyclo", "clm", "gravel"],
  swim: ["sprint", "demifond", "fond", "ow"],
};
const TERRAIN = { run: "route", bike: "plat" };
const MILIEU = { swim: "bassin" };

function profile(sport, over = {}) {
  const a = {
    intent: "competition", format: FORMATS[sport][0],
    med_pain: "non", med_dizzy: "non", med_treat: "non",
    age: "32", sex: "H", weight: "75", height: "178",
    level: "inter", history: "confirme", injury: "aucune",
    sessions_max: "7", vol_max: "10", dispo: "quotidienne",
    shift_ok: "oui", off_days: "non", doubles: "oui",
    css_known: "non", ftp_known: "non", pace_known: "non",
  };
  if (TERRAIN[sport]) a.terrain = TERRAIN[sport];
  if (MILIEU[sport]) a.milieu = MILIEU[sport];
  if (sport === "swim" && (over.level || a.level) === "debutant") a.swim_limit = "technique";
  return { ...a, ...over };
}

// ─────────────────────────────────────────────────────────────────────
// Aides
// ─────────────────────────────────────────────────────────────────────

const sessionsOf = (p) =>
  p.weeks.flatMap((w) => w.days.flatMap((d) =>
    d.sessions.filter((s) => s.d !== "rs").map((s) => ({ s, d, w }))));

const weekMin = (w) =>
  w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.d === "rs" ? 0 : s.min || 0), 0), 0);

const planMin = (p) => p.weeks.reduce((t, w) => t + weekMin(w), 0);

const swimMeters = (s) =>
  (s.steps || []).reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);

const isoIn = (days) => {
  const d = new Date(Date.now() + days * 864e5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const build = (sport, over) => E.buildPlan(sport, profile(sport, over));

// ─────────────────────────────────────────────────────────────────────
// Registre des tests
// ─────────────────────────────────────────────────────────────────────

const TESTS = [];
/**
 * @param id      identifiant stable (ne jamais réutiliser)
 * @param titre   description humaine
 * @param expect  'pass' = doit passer | 'fail' = défaut connu, non corrigé
 * @param fn      () => ({ ok:boolean, detail:string })
 */
const test = (id, titre, expect, fn) => TESTS.push({ id, titre, expect, fn });

// ── A. Sécurité ──────────────────────────────────────────────────────

test("A1", "Drapeau médical → aucune intensité générée", "pass", () => {
  const p = build("run", { med_pain: "oui", format: "10k" });
  const hard = sessionsOf(p).filter(({ s }) =>
    (s.steps || []).some((st) => st.role === "body" && /\.(vo2|thr|css|speed)$/.test(st.zone || "")));
  return { ok: hard.length === 0, detail: `${hard.length} séance(s) intense(s) malgré med_pain=oui` };
});

test("A2", "Douleur localisée → la discipline à risque est retirée", "pass", () => {
  const map = [
    ["run", "10k", "tibia", "rn"],
    ["swim", "fond", "epaule", "sw"],
    ["bike", "route", "genou", "bk"],
  ];
  const bad = [];
  for (const [sport, format, loc, forbidden] of map) {
    const a = profile(sport, { format });
    const p = E.buildPlan(sport, a);
    const date = sessionsOf(p)[0]?.d.date;
    const r = E.adjustToday(sport, a, { date, painFlag: true, painLocation: loc });
    if (r.sessions.some((s) => s.d === forbidden))
      bad.push(`${loc} → ${r.sessions.map((s) => s.d).join("+")}`);
  }
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "ok" };
});

test("A3", "Jour rouge : jamais plus de minutes qu'avant ajustement", "pass", () => {
  const bad = [];
  for (const sport of ["run", "bike", "swim", "tri"])
    for (const format of FORMATS[sport].slice(0, 2)) {
      const a = profile(sport, { format });
      const p = E.buildPlan(sport, a);
      for (const { d } of sessionsOf(p).filter((_, i) => i % 9 === 0)) {
        const r = E.adjustToday(sport, a, {
          date: d.date, hrvStatus: "basse", sleepQuality: "mauvais",
        });
        const { originalMinutes: o, adjustedMinutes: n } = r.adjustment;
        if (n > o + 0.01) bad.push(`${sport}/${format} ${d.date} ${o.toFixed(1)}→${n.toFixed(1)}min`);
      }
    }
  return { ok: bad.length === 0, detail: bad.slice(0, 3).join(" ; ") || "ok" };
});

test("A4", "Signal objectif non annulable par le déclaratif subjectif", "pass", () => {
  const v = E.assessReadiness({
    date: isoIn(0), hrvStatus: "basse", sleepQuality: "bon", energy: 75,
  });
  return { ok: v.level !== "verte", detail: `HRV basse + sommeil bon + énergie 75 → ${v.level}` };
});

test("A5", "Sommeil très court (<4h) → au moins rouge", "pass", () => {
  const v = E.assessReadiness({ date: isoIn(0), sleepHours: 3 });
  return { ok: v.level === "rouge", detail: `sleepHours=3 → ${v.level}` };
});

test("A6", "FC repos élevée sans baseline → au moins orange", "pass", () => {
  const v = E.assessReadiness({ date: isoIn(0), restingHr: 62 });
  return { ok: v.level !== "verte", detail: `restingHr=62 sans baseline → ${v.level}` };
});

test("A7", "Mineur (<18 ans) → charge réduite vs adulte", "pass", () => {
  const ado = planMin(build("run", { format: "10k", age: "15" }));
  const adulte = planMin(build("run", { format: "10k", age: "32" }));
  return { ok: ado < adulte * 0.9, detail: `15 ans ${ado}min vs 32 ans ${adulte}min` };
});

// ── B. Blessures ─────────────────────────────────────────────────────

test("B1", "Déclarer une blessure ne doit JAMAIS augmenter la charge", "pass", () => {
  const bad = [];
  const cases = [
    ["run", ["10k", "marathon"], ["tibia", "genou", "pied", "hanche"]],
    ["swim", ["sprint", "fond", "ow"], ["epaule", "cou"]],
    ["bike", ["route", "cyclo"], ["dos", "genou"]],
    ["tri", ["S", "70.3"], ["course", "epaule", "velo"]],
  ];
  for (const [sport, formats, injuries] of cases)
    for (const format of formats)
      for (const level of ["inter", "avance"]) {
        const base = planMin(build(sport, { format, level }));
        for (const injury of injuries) {
          const t = planMin(build(sport, { format, level, injury }));
          if (t > base * 1.02)
            bad.push(`${sport}/${format}/${level} ${injury} +${Math.round((t / base - 1) * 100)}%`);
        }
      }
  return { ok: bad.length === 0, detail: bad.slice(0, 4).join(" ; ") || "ok" };
});

test("B2", "Les localisations de blessure produisent des plans distincts", "pass", () => {
  const sig = (injury) => JSON.stringify(
    sessionsOf(build("run", { format: "marathon", injury })).map(({ s }) => s.name + s.min));
  const locs = ["tibia", "genou", "pied", "hanche"];
  const sigs = new Map(locs.map((l) => [l, sig(l)]));
  const uniq = new Set(sigs.values()).size;
  return { ok: uniq === locs.length, detail: `${locs.length} localisations → ${uniq} plan(s) distinct(s)` };
});

test("B3", "Blessures multiples → plan plus conservateur qu'une seule", "pass", () => {
  const un = planMin(build("run", { format: "marathon", injury: "tibia" }));
  const deux = planMin(build("run", { format: "marathon", injury: "tibia,genou" }));
  return { ok: deux < un, detail: `1 blessure ${un}min vs 2 blessures ${deux}min` };
});

// ── C. Contrat avec l'athlète ────────────────────────────────────────

test("C1", "sessions_max est un nombre de SÉANCES, pas de jours", "pass", () => {
  const bad = [];
  for (const sm of ["3", "5", "7"])
    for (const doubles of ["oui", "parfois", "non"]) {
      const p = build("tri", { format: "S", sessions_max: sm, doubles, level: "debutant" });
      for (const w of p.weeks) {
        const n = w.days.reduce((t, d) => t + d.sessions.filter((s) => s.d !== "rs").length, 0);
        if (n > +sm) { bad.push(`sm=${sm} dbl=${doubles} S${w.num}: ${n} séances`); break; }
      }
    }
  return { ok: bad.length === 0, detail: bad.slice(0, 3).join(" ; ") || "ok" };
});

test("C2", "Date de course trop proche → avertissement, pas de plan rétrodaté", "pass", () => {
  const p = build("run", { format: "marathon", level: "debutant", history: "reprise", race_date: isoIn(14) });
  const today = isoIn(0);
  const passees = p.weeks.filter((w) => w.days.at(-1).date < today).length;
  const warn = (p._v2?.warnings || []).length;
  return {
    ok: passees === 0 || warn > 0,
    detail: `${passees}/${p.weeks.length} semaines dans le passé, ${warn} avertissement(s)`,
  };
});

test("C3", "Date de course lointaine → le plan commence maintenant", "pass", () => {
  const p = build("run", { format: "marathon", race_date: isoIn(120 * 7) });
  const start = p.weeks[0].days[0].date;
  const delai = Math.round((new Date(start) - Date.now()) / 864e5);
  return { ok: delai < 60, detail: `le plan démarre dans ${delai} jours` };
});

test("C4", "Plafond de volume hebdo respecté (vol_max)", "pass", () => {
  const bad = [];
  for (const sport of ["run", "bike", "tri"])
    for (const vol_max of ["4", "10", "16"]) {
      const p = build(sport, { vol_max, format: FORMATS[sport].at(-1) });
      const peak = Math.max(...p.weeks.map(weekMin));
      if (peak > +vol_max * 60 + 5) bad.push(`${sport} vm=${vol_max}h → ${Math.round(peak)}min`);
    }
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "ok" };
});

test("C5", "Jours OFF déclarés strictement respectés", "pass", () => {
  const p = build("run", { format: "semi", off_days: "oui", off_which: "Lun,Jeu" });
  const bad = sessionsOf(p).filter(({ d }) => ["Lun", "Jeu"].includes(d.jour));
  return { ok: bad.length === 0, detail: `${bad.length} séance(s) sur un jour bloqué` };
});

test("C6", "doubles=non → jamais deux séances le même jour", "pass", () => {
  const bad = [];
  for (const sport of ["tri", "run"]) {
    const p = build(sport, { doubles: "non", format: FORMATS[sport].at(-1), sessions_max: "12" });
    p.weeks.forEach((w) => w.days.forEach((d) => {
      if (d.sessions.filter((s) => s.d !== "rs").length > 1) bad.push(`${sport} S${w.num} ${d.jour}`);
    }));
  }
  return { ok: bad.length === 0, detail: bad.slice(0, 3).join(" ; ") || "ok" };
});

// ── D. Règles du manifeste ───────────────────────────────────────────

test("D1", "Score d'audit cohérent avec les violations dures", "pass", () => {
  const bad = [];
  for (const sport of Object.keys(FORMATS))
    for (const format of FORMATS[sport])
      for (const level of ["debutant", "inter", "avance"]) {
        const p = build(sport, { format, level });
        const hv = p._v2?.hardViolations || [];
        if (hv.length && p._v2.score >= 90)
          bad.push(`${sport}/${format}/${level} score ${p._v2.score} + ${hv.length} violation(s)`);
      }
  return { ok: bad.length === 0, detail: `${bad.length} plan(s) : ${bad.slice(0, 2).join(" ; ")}` };
});

test("D2", "Aucune violation dure sur la matrice standard", "fail", () => {
  let n = 0, tot = 0;
  for (const sport of Object.keys(FORMATS))
    for (const format of FORMATS[sport])
      for (const level of ["debutant", "inter", "avance"])
        for (const history of ["reprise", "confirme", "ancien"]) {
          tot++;
          if ((build(sport, { format, level, history })._v2?.hardViolations || []).length) n++;
        }
  return { ok: n === 0, detail: `${n}/${tot} configurations avec ≥1 violation dure` };
});

test("D3", "C22 : progression ≤ +10 % entre semaines de charge", "fail", () => {
  const bad = [];
  for (const sport of Object.keys(FORMATS))
    for (const format of FORMATS[sport]) {
      const p = build(sport, { format });
      let prev = null;
      for (const w of p.weeks) {
        if (w.isRecup || w.phase.id === "taper") continue;
        const m = weekMin(w);
        if (prev && m > prev * 1.1 + 1)
          bad.push(`${sport}/${format} S${w.num} +${Math.round((m / prev - 1) * 100)}%`);
        prev = m;
      }
    }
  return { ok: bad.length === 0, detail: `${bad.length} saut(s) : ${bad.slice(0, 3).join(" ; ")}` };
});

test("D4", "Semaine de récup jamais plus chargée que la précédente", "pass", () => {
  const bad = [];
  for (const sport of Object.keys(FORMATS))
    for (const format of FORMATS[sport])
      for (const level of ["debutant", "inter"]) {
        const p = build(sport, { format, level, sessions_max: "3", vol_max: "7" });
        p.weeks.forEach((w, i) => {
          if (i && w.isRecup && weekMin(w) > weekMin(p.weeks[i - 1]) + 1)
            bad.push(`${sport}/${format}/${level} S${w.num}`);
        });
      }
  return { ok: bad.length === 0, detail: `${bad.length} cas : ${bad.slice(0, 3).join(" ; ")}` };
});

test("D5", "C15 : nage débutant ≤ 850 m par séance", "pass", () => {
  const bad = [];
  for (const sport of ["tri", "swim"])
    for (const format of FORMATS[sport]) {
      const p = build(sport, { format, level: "debutant", history: "reprise", swim_limit: "technique" });
      sessionsOf(p).forEach(({ s, w }) => {
        const m = swimMeters(s);
        if (s.d === "sw" && m > 850) bad.push(`${sport}/${format} S${w.num} ${m}m`);
      });
    }
  return { ok: bad.length === 0, detail: `${bad.length} séance(s) : ${bad.slice(0, 3).join(" ; ")}` };
});

test("D6", "C24 : plancher de séance piscine aussi pour le débutant", "pass", () => {
  const bad = [];
  for (const sport of ["tri", "swim"])
    for (const format of FORMATS[sport]) {
      const p = build(sport, { format, level: "debutant", swim_limit: "technique" });
      sessionsOf(p).forEach(({ s, w }) => {
        const m = swimMeters(s);
        if (s.d === "sw" && m > 0 && m < 600) bad.push(`${sport}/${format} S${w.num} ${m}m`);
      });
    }
  return { ok: bad.length === 0, detail: `${bad.length} séance(s) sous 600 m : ${bad.slice(0, 3).join(" ; ")}` };
});

test("D7", "C23 : jamais de sortie longue CAP > 3 h pour un débutant", "pass", () => {
  const bad = [];
  for (const sport of ["run", "tri"])
    for (const format of FORMATS[sport]) {
      const p = build(sport, { format, level: "debutant", vol_max: "13" });
      sessionsOf(p).forEach(({ s, w }) => {
        if (s.d === "rn" && s.min > 180) bad.push(`${sport}/${format} S${w.num} ${Math.round(s.min)}min`);
      });
    }
  return { ok: bad.length === 0, detail: bad.slice(0, 3).join(" ; ") || "ok" };
});

test("D8", "Aucune séance VO2max en affûtage", "pass", () => {
  const bad = [];
  for (const sport of Object.keys(FORMATS))
    for (const format of FORMATS[sport]) {
      const p = build(sport, { format });
      p.weeks.filter((w) => w.phase.id === "taper").forEach((w) =>
        w.days.forEach((d) => d.sessions.forEach((s) => {
          if ((s.steps || []).some((st) => /\.vo2$/.test(st.zone || "")))
            bad.push(`${sport}/${format} S${w.num}`);
        })));
    }
  return { ok: bad.length === 0, detail: bad.slice(0, 3).join(" ; ") || "ok" };
});

test("D9", "Chaque séance porte un objectif expliqué", "pass", () => {
  const bad = [];
  for (const sport of Object.keys(FORMATS))
    for (const format of FORMATS[sport])
      sessionsOf(build(sport, { format })).forEach(({ s, w }) => {
        if (!s.det || !s.det.trim()) bad.push(`${sport}/${format} S${w.num} ${s.name}`);
      });
  return { ok: bad.length === 0, detail: bad.slice(0, 3).join(" ; ") || "ok" };
});

test("D10", "Affûtage strictement décroissant", "pass", () => {
  const bad = [];
  for (const sport of Object.keys(FORMATS))
    for (const format of FORMATS[sport])
      for (const level of ["debutant", "inter", "avance"])
        for (const sessions_max of ["3", "5", "9"])
          for (const vol_max of ["7", "13", "16"])
            for (const dispo of ["quotidienne", "semaine"]) {
              const t = build(sport, { format, level, sessions_max, vol_max, dispo })
                .weeks.filter((w) => w.phase.id === "taper").map(weekMin);
              for (let i = 1; i < t.length; i++)
                if (t[i] > t[i - 1] + 1) {
                  bad.push(`${sport}/${format}/${level}/sm${sessions_max}/vm${vol_max}/${dispo} ${t.map(Math.round).join("→")}`);
                  break;
                }
            }
  return { ok: bad.length === 0, detail: `${bad.length} cas : ${bad.slice(0, 2).join(" ; ")}` };
});

// ── E. Saisies & robustesse ──────────────────────────────────────────

test("E1", "Notation d'allure française (4'50) acceptée", "pass", () => {
  const a = profile("run", { format: "10k", pace_known: "oui", pace: "4'50" });
  const p = E.buildPlan("run", a);
  const enPace = sessionsOf(p).some(({ s }) => /\d+'\d+\s*-\s*\d+'\d+\/km/.test(s.det || ""));
  return { ok: enPace, detail: enPace ? "ok" : "retombe en zones cardio sans le dire" };
});

test("E2", "Un seul parseur d'allure (plan et prédiction d'accord)", "pass", () => {
  const bad = [];
  for (const pace of ["4:50", "4'50", "4:50/km", "4.50"]) {
    const a = profile("run", { format: "10k", pace_known: "oui", pace });
    const p = E.buildPlan("run", a);
    const planOk = sessionsOf(p).some(({ s }) => /\d+'\d+\s*-\s*\d+'\d+\/km/.test(s.det || ""));
    const predOk = (E.predict("run", a, p).items || []).length > 0;
    if (planOk !== predOk) bad.push(`${pace}: plan=${planOk} prédiction=${predOk}`);
  }
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "ok" };
});

test("E3", "FTP hors bornes physiologiques rejetée", "pass", () => {
  const bad = [];
  for (const ftp of ["-100", "0", "1", "9999"]) {
    const p = build("bike", { format: "route", ftp_known: "oui", ftp });
    const neg = sessionsOf(p).some(({ s }) => /-\d+\s*-\s*-?\d+\s*W|--/.test(s.det || ""));
    const abs = sessionsOf(p).some(({ s }) => {
      const m = (s.det || "").match(/(\d{4,})\s*W/); return m && +m[1] > 600;
    });
    if (neg || abs) bad.push(`ftp=${ftp}${neg ? " (zones négatives)" : ""}${abs ? " (>600W)" : ""}`);
  }
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "ok" };
});

test("E4", "Poids invraisemblable → estimation énergétique refusée", "pass", () => {
  const a = profile("tri", { format: "70.3", weight: "35", height: "180" });
  const p = E.buildPlan("tri", a);
  const day = p.weeks[5].days.find((d) => d.sessions.some((s) => s.d !== "rs"));
  const r = E.dailyEnergy(a, day.sessions);
  return { ok: r === null, detail: r ? `IMC ≈ 10.8 → ${r.total?.join("–")} kcal affichées` : "ok" };
});

test("E5", "buildPlan ne lève jamais sur un état d'entrée dégradé", "pass", () => {
  const bad = [];
  const mutants = [
    ["injury en tableau", { injury: ["aucune"] }],
    ["injury absent", { injury: undefined }],
    ["format inconnu", { format: "ultra" }],
    ["age null", { age: null }],
    ["vol_max absent", { vol_max: undefined }],
    ["sessions_max texte", { sessions_max: "beaucoup" }],
  ];
  for (const [nom, over] of mutants) {
    try { E.buildPlan("run", { ...profile("run"), ...over }); }
    catch (e) { bad.push(`${nom}: ${e.message.slice(0, 40)}`); }
  }
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "ok" };
});

test("E6", "Parseur FIT robuste aux fichiers malformés", "pass", () => {
  const bad = [];
  const fitHeader = () => {
    const b = new Uint8Array(14);
    b[0] = 14; b[1] = 0x10;
    new DataView(b.buffer).setUint32(4, 0, true);
    b[8] = 0x2E; b[9] = 0x46; b[10] = 0x49; b[11] = 0x54;
    return b;
  };
  const cases = {
    vide: new Uint8Array(0),
    aleatoire: Uint8Array.from({ length: 256 }, (_, i) => (i * 37) % 256),
    png: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 13]),
    "entete seul": fitHeader(),
  };
  for (const [nom, buf] of Object.entries(cases)) {
    try {
      const r = E.importFit(buf);
      if (r && !Array.isArray(r.sessions)) bad.push(`${nom}: forme inattendue`);
    } catch (e) {
      if (!/FIT|court|invalide|signature/i.test(e.message)) bad.push(`${nom}: ${e.message.slice(0, 40)}`);
    }
  }
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "ok" };
});

// ── F. Qualité de séance ─────────────────────────────────────────────

test("F1", "durationMin et _min cohérents (contrat d'export)", "pass", () => {
  // Sémantique confirmée après correctif : `durationMin` = durée d'UNE répétition (exportée
  // avec `reps` par planToJSON), `_min` = minutes TOTALES du bloc (reps comprises). La
  // comparaison n'est donc légitime qu'à reps=1 — c'est là que vivait le vrai bug : le clamp
  // C13 de l'échauffement n'était écrit que dans `_min`, donc l'écran et l'export
  // décrivaient deux séances différentes. `_min` est désormais une pure dérivée.
  const bad = [];
  for (const sport of Object.keys(FORMATS))
    sessionsOf(build(sport, {})).forEach(({ s, w }) => {
      (s.steps || []).forEach((st) => {
        if ((st.reps || 1) > 1) return;
        if (st.durationMin != null && st._min != null && Math.abs(st.durationMin - st._min) > 0.5)
          bad.push(`${sport} S${w.num} ${s.name}/${st.role}: ${st.durationMin} vs ${st._min}`);
      });
    });
  return { ok: bad.length === 0, detail: `${bad.length} divergence(s) : ${bad.slice(0, 2).join(" ; ")}` };
});

test("F2", "Séance de qualité : ≥45 % du temps dans la zone cible", "fail", () => {
  const bad = [];
  for (const sport of ["run", "bike", "tri"])
    for (const format of FORMATS[sport])
      sessionsOf(build(sport, { format, vol_max: "10" })).forEach(({ s, w }) => {
        const st = s.steps || [];
        const qual = st.some((x) => x.role === "body" && /\.(vo2|thr|ss|css|speed|rp|frc)$/.test(x.zone || ""));
        if (!qual) return;
        const body = st.filter((x) => x.role === "body").reduce((t, x) => t + (x._min || 0), 0);
        const tot = st.reduce((t, x) => t + (x._min || 0), 0);
        if (tot > 0 && body / tot < 0.45)
          bad.push(`${sport}/${format} S${w.num} ${s.name} ${Math.round(100 * body / tot)}%`);
      });
  return { ok: bad.length === 0, detail: `${bad.length} séance(s) : ${bad.slice(0, 3).join(" ; ")}` };
});

test("F3", "Minutes de séance entières", "pass", () => {
  const bad = [];
  for (const sport of Object.keys(FORMATS))
    sessionsOf(build(sport, { level: "debutant", vol_max: "4", swim_limit: "technique" }))
      .forEach(({ s, w }) => {
        if (s.min != null && Math.abs(s.min - Math.round(s.min)) > 1e-6)
          bad.push(`${sport} S${w.num} ${s.name}=${s.min}`);
      });
  return { ok: bad.length === 0, detail: `${bad.length} cas : ${bad.slice(0, 2).join(" ; ")}` };
});

// ── T. Trail (SPEC_R7_TRAIL) ─────────────────────────────────────────
// Spec exécutable écrite AVANT l'implémentation : chaque test décrit le comportement
// attendu du module trail. Ils passent en expect:'pass' au fur et à mesure des lots T-1…T-8.

/** Profil trail type — l'objectif est décrit par ses DONNÉES (distance, D+), pas par un format. */
function trailProfile(over = {}) {
  return {
    intent: "competition",
    med_pain: "non", med_dizzy: "non", med_treat: "non",
    age: "35", sex: "H", weight: "72", height: "176",
    level: "inter", history: "confirme", injury: "aucune",
    sessions_max: "5", vol_max: "10", vol_recent: "6", dispo: "semaine",
    shift_ok: "oui", off_days: "non", doubles: "non",
    pace_known: "oui", pace: "4:50", vam_known: "oui", vam: "850",
    race_distance_km: "62", race_dplus_m: "3200", race_technicity: "technique",
    race_night: "partielle", train_dplus_access: "collines", poles: "a_decider",
    treadmill: "non",
    ...over,
  };
}
const buildTrail = (over) => E.buildPlan("trail", trailProfile(over));
const trailSteps = (p) => sessionsOf(p).flatMap(({ s, w, d }) => (s.steps || []).map((st) => ({ st, s, w, d })));
const weekDplus = (w) => w.days.reduce((t, d) => t + d.sessions.reduce((u, s) =>
  u + (s.steps || []).reduce((v, st) => v + (st.dplusM || 0) * (st.reps || 1), 0), 0), 0);
const weekDmoins = (w) => w.days.reduce((t, d) => t + d.sessions.reduce((u, s) =>
  u + (s.steps || []).reduce((v, st) => v + (st.dmoinsM || 0) * (st.reps || 1), 0), 0), 0);
const dayDmoins = (d) => d.sessions.reduce((u, s) => u + (s.steps || []).reduce((v, st) => v + (st.dmoinsM || 0) * (st.reps || 1), 0), 0);
const hasSession = (p, re) => sessionsOf(p).filter(({ s }) => re.test(s.name + " " + (s.det || "")));
const inPhase = (p, phase) => sessionsOf(p).filter(({ w }) => w.phase.id === phase);

test("T1", "Aucune allure en min/km sur un bloc en montée ou en descente", "pass", () => {
  const bad = [];
  for (const over of [{}, { race_dplus_m: "1200", race_distance_km: "25" }, { vam_known: "non" }]) {
    const p = buildTrail(over);
    trailSteps(p).forEach(({ st, s, w }) => {
      if (st.role !== "body" || !st.gradient) return;
      if (st.gradient !== "up" && st.gradient !== "down") return;
      if (/\d+['′]\d+\s*\/\s*km/.test(s.det || "")) bad.push(`S${w.num} ${s.name} (${st.gradient})`);
    });
  }
  return { ok: bad.length === 0, detail: bad.slice(0, 3).join(" ; ") || "ok" };
});

test("T2", "Le D+ d'une séance est porté par ses steps, pas seulement écrit dans le texte", "pass", () => {
  const p = buildTrail();
  const bad = sessionsOf(p).filter(({ s }) => {
    const mentionsDplus = /D\+/.test(s.det || "");
    if (!mentionsDplus) return false;
    return !(s.steps || []).some((st) => st.dplusM > 0);
  });
  return { ok: bad.length === 0, detail: `${bad.length} séance(s) avec un D+ non structuré` };
});

test("T3", "D+ hebdomadaire sous le plafond de la catégorie et de l'historique", "pass", () => {
  const CAPS = { long: { reprise: 1800, confirme: 3000, ancien: 4200 }, ultra: { reprise: 2500, confirme: 4000, ancien: 5500 } };
  const bad = [];
  for (const history of ["reprise", "confirme", "ancien"]) {
    const p = buildTrail({ history });
    const cat = (p._v2?.decisions || []).find((d) => d.id === "format-trail");
    const catId = /ultra/.test(String(cat?.val || "")) ? "ultra" : "long";
    const cap = CAPS[catId][history];
    p.weeks.forEach((w) => { if (!w.isRecup && weekDplus(w) > cap * 1.05) bad.push(`${history} S${w.num} ${Math.round(weekDplus(w))}m > ${cap}m`); });
  }
  return { ok: bad.length === 0, detail: bad.slice(0, 3).join(" ; ") || "ok" };
});

test("T4", "Progression D+ ≤ +12 %/sem et D− ≤ +8 %/sem entre semaines de charge", "pass", () => {
  const bad = [];
  const p = buildTrail();
  let prevUp = 0, prevDown = 0;
  for (const w of p.weeks) {
    if (w.isRecup || w.phase.id === "taper") continue;
    const up = weekDplus(w), down = weekDmoins(w);
    if (prevUp > 0 && up > prevUp * 1.12 + 50) bad.push(`S${w.num} D+ +${Math.round((up / prevUp - 1) * 100)}%`);
    if (prevDown > 0 && down > prevDown * 1.08 + 50) bad.push(`S${w.num} D− +${Math.round((down / prevDown - 1) * 100)}%`);
    prevUp = up; prevDown = down;
  }
  return { ok: bad.length === 0, detail: bad.slice(0, 3).join(" ; ") || "ok" };
});

test("T5", "Aucune qualité ni descente dans les 48h suivant une sortie à fort D−", "pass", () => {
  const p = buildTrail();
  const days = p.weeks.flatMap((w) => w.days.map((d) => ({ w, d })));
  const bad = [];
  days.forEach(({ d }, i) => {
    if (dayDmoins(d) < 1000) return;
    for (const nxt of days.slice(i + 1, i + 3)) {
      const hard = nxt.d.charge === "dur";
      const down = dayDmoins(nxt.d) > 200;
      if (hard || down) bad.push(`${d.date} (${Math.round(dayDmoins(d))}m D−) → ${nxt.d.date}`);
    }
  });
  return { ok: bad.length === 0, detail: bad.slice(0, 3).join(" ; ") || "ok" };
});

test("T6", "Sortie longue plafonnée en % du temps de course estimé, pas en absolu", "pass", () => {
  const bad = [];
  for (const [over, factor] of [[{ race_distance_km: "25", race_dplus_m: "1000" }, 1.0], [{}, 0.55], [{ race_distance_km: "110", race_dplus_m: "6000" }, 0.40]]) {
    const a = trailProfile(over);
    const p = E.buildPlan("trail", a);
    const pred = E.predict("trail", a, p);
    const hi = (pred.items || []).find((x) => /Temps estim/i.test(x.leg));
    if (!hi) { bad.push("pas de temps estimé"); continue; }
    const m = String(hi.value).match(/(\d+)h(\d+)?\D*(\d+)?h?(\d+)?/);
    if (!m) { bad.push("temps estimé illisible : " + hi.value); continue; }
    const raceMin = (+m[1]) * 60 + (+(m[2] || 0));
    const longest = Math.max(...sessionsOf(p).map(({ s }) => s.min || 0));
    if (longest > raceMin * factor * 1.1 + 15) bad.push(`longue ${Math.round(longest)}min > ${Math.round(raceMin * factor)}min`);
  }
  return { ok: bad.length === 0, detail: bad.slice(0, 3).join(" ; ") || "ok" };
});

test("T7", "Ultra et plus : au moins 3 séances « ravito réel » en phase spécifique", "pass", () => {
  const p = buildTrail();
  const n = inPhase(p, "spec").filter(({ s }) => /ravito|nutrition r|sac/i.test(s.name + " " + (s.det || ""))).length;
  return { ok: n >= 3, detail: `${n} séance(s) de répétition ravito en spécifique` };
});

test("T8", "Course de nuit annoncée → au moins 2 sorties de nuit en spec/peak", "pass", () => {
  const p = buildTrail({ race_night: "majoritaire" });
  const n = sessionsOf(p).filter(({ s, w }) => (w.phase.id === "spec" || w.phase.id === "peak") && /nuit|frontale/i.test(s.name + " " + (s.det || ""))).length;
  return { ok: n >= 2, detail: `${n} sortie(s) de nuit` };
});

test("T9", "Ultra et plus : au moins 2 back-to-back en phase spécifique", "pass", () => {
  const p = buildTrail();
  const n = inPhase(p, "spec").filter(({ s }) => /back-to-back|enchaîné|sur jambes fatigu/i.test(s.name + " " + (s.det || ""))).length;
  return { ok: n >= 2, detail: `${n} séance(s) back-to-back` };
});

test("T10", "Catégorie ≥ long : au moins une séance de marche rapide par bloc de charge", "pass", () => {
  const p = buildTrail();
  const phases = ["base", "dev", "spec"];
  const missing = phases.filter((ph) => !inPhase(p, ph).some(({ s }) => /marche/i.test(s.name + " " + (s.det || ""))));
  return { ok: missing.length === 0, detail: missing.length ? "aucune marche rapide en " + missing.join(", ") : "ok" };
});

test("T11", "Terrain plat déclaré → avertissement explicite + séances de substitution", "pass", () => {
  const p = buildTrail({ train_dplus_access: "plat", treadmill: "oui" });
  const warns = (p._v2?.warnings || []).join(" ");
  const named = /terrain|dénivelé|D\+/i.test(warns) && /week-end|montagne|substitut|compens/i.test(warns);
  const subs = hasSession(p, /tapis|escalier|côte répétée|côtes courtes|excentrique/i).length;
  return { ok: named && subs > 0, detail: `warning ${named ? "présent" : "ABSENT"}, ${subs} séance(s) de substitution` };
});

test("T12", "Séance de côtes : la charge progresse entre base, dev, spec et peak", "pass", () => {
  const p = buildTrail();
  const bodyMin = (s) => (s.steps || []).filter((x) => x.role === "body").reduce((t, x) => t + (x.reps || 1) * (x.durationMin || 0), 0);
  const per = {};
  for (const ph of ["base", "dev", "spec", "peak"]) {
    const c = inPhase(p, ph).filter(({ s }) => /côte|ascensionnel|VAM/i.test(s.name));
    if (c.length) per[ph] = Math.max(...c.map(({ s }) => bodyMin(s)));
  }
  const seq = ["base", "dev", "spec", "peak"].filter((x) => per[x] != null).map((x) => per[x]);
  const grows = seq.length >= 3 && seq.every((v, i) => i === 0 || v >= seq[i - 1]);
  return { ok: grows, detail: seq.length ? seq.map(Math.round).join("→") : "aucune séance de côtes identifiée" };
});

test("T13", "Blessure quadriceps → D− total ≤ 40 % du plan sans blessure", "pass", () => {
  const base = buildTrail();
  const inj = buildTrail({ injury: "quadriceps" });
  const tot = (p) => p.weeks.reduce((t, w) => t + weekDmoins(w), 0);
  const b = tot(base), i = tot(inj);
  return { ok: b > 0 && i <= b * 0.4, detail: `${Math.round(i)}m vs ${Math.round(b)}m (${b ? Math.round((i / b) * 100) : "?"}%)` };
});

test("T14", "Barrière horaire dépassée par l'estimation → avertissement en tête", "pass", () => {
  const a = trailProfile({ race_cutoff_h: "8" }); // objectif 62km/3200m : estimation ~9-12h
  const p = E.buildPlan("trail", a);
  const warns = p._v2?.warnings || [];
  const first = String(warns[0] || "");
  return { ok: /barrière|cutoff|temps limite/i.test(first), detail: warns.length ? "1er avertissement : " + first.slice(0, 70) : "aucun avertissement" };
});

test("T15", "Renfo excentrique présent dès la phase base", "pass", () => {
  const p = buildTrail();
  const n = inPhase(p, "base").filter(({ s }) => /excentrique/i.test(s.name + " " + (s.det || ""))).length;
  return { ok: n > 0, detail: `${n} séance(s) de renfo excentrique en base` };
});

test("T16", "Ultra long : aucune séance VO2max (ce n'est pas le limiteur)", "pass", () => {
  const p = buildTrail({ race_distance_km: "110", race_dplus_m: "6500" });
  const bad = trailSteps(p).filter(({ st }) => /\.vo2$/.test(st.zone || ""));
  return { ok: bad.length === 0, detail: `${bad.length} bloc(s) VO2max en ultra long` };
});

test("T17", "Une boucle ne descend jamais plus qu'elle ne monte (T2c)", "pass", () => {
  // Physique du terrain : sur une sortie en boucle (bloc `rolling`/`flat`), le D− ne peut pas
  // dépasser le D+ — on revient au point de départ. Seuls les blocs de DESCENTE dédiés
  // (navette, remontée mécanique) portent du D− sans D+.
  const bad = [];
  for (const opts of [{}, { race_distance_km: "45", race_dplus_m: "2000" }, { race_distance_km: "110", race_dplus_m: "6500" }]) {
    const p = buildTrail(opts);
    for (const { s, st } of trailSteps(p)) {
      if (st.gradient === "down") continue;
      if ((st.dmoinsM || 0) > (st.dplusM || 0)) bad.push(`${s.name} : D+ ${st.dplusM || 0}m / D− ${st.dmoinsM}m`);
    }
  }
  return { ok: bad.length === 0, detail: bad.slice(0, 3).join(" · ") || "aucune incohérence D+/D−" };
});

// ── G. Déterminisme & performance ────────────────────────────────────

test("G1", "Génération déterministe", "pass", () => {
  const sig = (p) => JSON.stringify(sessionsOf(p).map(({ s }) => s.name + s.min + s.det));
  const bad = [];
  for (const sport of Object.keys(FORMATS)) {
    const a = profile(sport, {});
    if (sig(E.buildPlan(sport, a)) !== sig(E.buildPlan(sport, a))) bad.push(sport);
  }
  return { ok: bad.length === 0, detail: bad.join(", ") || "ok" };
});

test("G2", "buildPlan < 60 ms sur le pire cas", "pass", () => {
  const a = profile("tri", { format: "Full", vol_max: "20", sessions_max: "12", history: "ancien" });
  const t0 = Date.now();
  for (let i = 0; i < 10; i++) E.buildPlan("tri", a);
  const ms = (Date.now() - t0) / 10;
  return { ok: ms < 60, detail: `${ms.toFixed(0)} ms/appel` };
});

test("G3", "Ajustement ORANGE : réduction effective du volume", "pass", () => {
  const ratios = [];
  for (const sport of ["run", "bike", "tri"]) {
    const a = profile(sport, {});
    const p = E.buildPlan(sport, a);
    for (const { d } of sessionsOf(p).filter((_, i) => i % 11 === 0)) {
      const r = E.adjustToday(sport, a, { date: d.date, hrvStatus: "basse" });
      if (r.adjustment.action === "reduce" && r.adjustment.originalMinutes > 0)
        ratios.push(r.adjustment.adjustedMinutes / r.adjustment.originalMinutes);
    }
  }
  const med = ratios.sort((x, y) => x - y)[Math.floor(ratios.length / 2)] ?? 1;
  return { ok: med < 0.85, detail: `médiane ${Math.round(med * 100)} % du volume initial (n=${ratios.length})` };
});

// ─────────────────────────────────────────────────────────────────────
// Exécution
// ─────────────────────────────────────────────────────────────────────

const GROUPES = {
  A: "Sécurité", B: "Blessures", C: "Contrat athlète",
  D: "Règles manifeste", E: "Saisies & robustesse",
  F: "Qualité de séance", T: "Trail (spec R7)", G: "Déterminisme & perf",
};

console.log(`\nEnduraBuild — banc de régression v6`);
console.log(`Moteur : ${E.version}   Fichier : ${path.basename(htmlPath)}\n`);

let regressions = 0, dette = 0, verts = 0, groupe = "";
const t0 = Date.now();

for (const t of TESTS) {
  if (ONLY.length && !ONLY.includes(t.id)) continue;
  const g = t.id[0];
  if (g !== groupe) { groupe = g; console.log(`  ${g}. ${GROUPES[g]}`); }

  let r;
  try { r = t.fn(); }
  catch (e) { r = { ok: false, detail: `ERREUR HARNAIS: ${e.message}`, crash: true }; }

  let icone, note = "";
  if (r.ok && t.expect === "pass") { icone = "✔"; verts++; }
  else if (r.ok && t.expect === "fail") { icone = "★"; verts++; note = "  ← CORRIGÉ : passer expect à 'pass'"; }
  else if (!r.ok && t.expect === "fail") { icone = "·"; dette++; }
  else { icone = "✖"; regressions++; note = "  ← RÉGRESSION"; }

  const ligne = `    ${icone} ${t.id.padEnd(4)} ${t.titre}`;
  console.log(ligne + note);
  if ((VERBOSE || (!r.ok && t.expect === "pass")) && r.detail)
    console.log(`         ${r.detail}`);
}

const dur = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n  ✔ ${verts} vert · · ${dette} dette connue · ✖ ${regressions} régression(s)   [${dur}s]\n`);

if (regressions) {
  console.log("  Une RÉGRESSION est un test qui devait passer et qui échoue,");
  console.log("  ou un défaut connu qui s'est aggravé. Corriger avant de merger.\n");
}
process.exit(regressions ? 1 : 0);
