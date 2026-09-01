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
  run: ["5k", "10k", "semi", "marathon"], // R7 : `trail` n'est plus un format de course à pied, c'est un SPORT
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

/**
 * ISO d'une date située `days` jours après le LUNDI COURANT — et non après « maintenant ».
 *
 * ⚠ SEPTIÈME OCCURRENCE DE LA FAMILLE R20.7 / A-6 : un instrument dont le verdict dépend du
 * JOUR OÙ ON LE LANCE. Ancré sur `Date.now()`, `isoIn(112)` rendait un lundi le lundi, un mardi
 * le mardi… — donc le JOUR DE SEMAINE de la course fabriquée changeait chaque jour, alors que
 * la longueur de la dernière semaine en dépend (N2) et que le schéma de 10 jours glisse sur le
 * calendrier. Mesuré le 24/08/2026 (un lundi) : `R23.18-D` rouge ce jour-là, **verte les six
 * autres** — la semaine qui précède l'A− vaut 86 min le lundi contre 220 à 543 min les autres
 * jours, sur un profil identique (ouvert en O-104). A-6 avait ancré cinq bancs par
 * `bench-dates.cjs` ; celui-ci y avait échappé, parce que ses dates ÉTAIENT déjà relatives —
 * elles l'étaient à la mauvaise origine.
 *
 * Le lundi courant est l'origine que le moteur emploie lui-même (`plan_start` par défaut) :
 * une date construite ici tombe donc toujours sur le même jour de semaine.
 */
const isoIn = (days) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // midi : aucun basculement de jour par fuseau
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + days); // recalé sur le lundi courant
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

// 3a — LE GARDE PORTE SUR TOUS LES SPORTS, TOUS LES DRAPEAUX, ET TOUTES LES ZONES.
// Il s'est rouvert deux fois parce qu'il ne regardait qu'un sport et quatre suffixes : le trail
// a apporté ses zones `tr.*`, l'insertion de course a écrit un `.thr` hors bibliothèque. On
// n'énumère plus ce qui est interdit — on énumère ce qui est PERMIS (l'endurance), et tout le
// reste est une violation. Un garde qui liste les interdits rate le prochain producteur.
test("A1", "Drapeau médical → aucune zone au-dessus de l'endurance, 6 sports, 3 drapeaux", "pass", () => {
  const EASY = new Set(["rn.easy", "rn.rec", "bk.z2", "sw.easy", "sw.aero", "tr.flat", "tr.hike", "tr.easyup"]);
  const bad = [];
  for (const flag of ["med_pain", "med_dizzy", "med_treat"])
    for (const sport of Object.keys(FORMATS))
      for (const format of FORMATS[sport]) {
        const p = build(sport, { [flag]: "oui", format, race_date: isoIn(400), races: "oui", race1_date: isoIn(120), race1_prio: "A" });
        sessionsOf(p).forEach(({ s, w }) => (s.steps || []).forEach((st) => {
          if (st.role !== "body") return;
          const z = st.zone || "";
          if (z && !EASY.has(z)) bad.push(`${flag}/${sport}/${format} S${w.num} « ${s.name} » ${z}`);
        }));
      }
  return { ok: bad.length === 0, detail: `${bad.length} zone(s) interdite(s) : ${bad.slice(0, 3).join(" ; ")}` };
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

// H-1 — LA FIXTURE D'A4 A ÉTÉ CORRIGÉE, ET IL FAUT DIRE POURQUOI.
//
// Le critère s'appelle « signal OBJECTIF non annulable par le déclaratif subjectif », et sa
// fixture passait une VFC SANS valeur ni base — c'est-à-dire une case cochée à l'œil. Elle
// utilisait donc un déclaratif comme signal objectif : exactement la confusion que H-1
// corrige, et que le titre du critère dénonce.
//
// Ce n'est pas « ré-ancrer un témoin pour qu'il passe » (ce que l'arbitrage d'O-21 interdit) :
// l'intention du critère est conservée mot pour mot, on lui donne enfin une entrée qui
// correspond à son titre. Et rien n'est perdu — A4b, ci-dessous, épingle la MOITIÉ NOUVELLE :
// une VFC déclarée ne doit PAS peser comme une VFC mesurée. Le banc couvre désormais les deux
// faces au lieu de les confondre.
test("A4", "Signal objectif non annulable par le déclaratif subjectif", "pass", () => {
  const v = E.assessReadiness({
    date: isoIn(0), hrvStatus: "basse", hrvSource: "mesure", hrvBaselineMs: 60,
    sleepQuality: "bon", energy: 75,
  });
  return { ok: v.level !== "verte", detail: `VFC basse MESURÉE + sommeil bon + énergie 75 → ${v.level}` };
});

test("A4b", "Une VFC DÉCLARÉE ne pèse pas comme une VFC mesurée", "pass", () => {
  const base = { date: isoIn(0), sleepQuality: "bon", energy: 75 };
  const mes = E.assessReadiness({ ...base, hrvStatus: "basse", hrvSource: "mesure", hrvBaselineMs: 60 });
  const dec = E.assessReadiness({ ...base, hrvStatus: "basse", hrvSource: "declare" });
  const rang = (l) => (l === "rouge" ? 2 : l === "orange" ? 1 : 0);
  const ditQuElleEstDeclaree = dec.drivers.some((d) => /déclarée|jugée/.test(d));
  return {
    ok: rang(mes.level) > rang(dec.level) && ditQuElleEstDeclaree,
    detail: `mesurée → ${mes.level} · déclarée → ${dec.level} (et le driver l'annonce : ${ditQuElleEstDeclaree})`,
  };
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

// R11.4 — CONTRAT DURCI. Ce test acceptait « un avertissement suffit ». L'audit amont a montré
// qu'un marathon en 2 semaines sortait comme un plan normal : la constante `minWeeks` existait
// et personne ne la lisait. Un outil qui accepte de préparer un Ironman en 4 semaines cautionne
// la blessure. La préparation trop courte est désormais REFUSÉE — avec ses deux issues
// concrètes (format plus court, ou date compatible), pour que l'athlète puisse arbitrer.
test("C2", "Préparation trop courte pour le format → REFUS motivé, jamais un plan dégradé", "pass", () => {
  let refus = null;
  try { build("run", { format: "marathon", level: "debutant", history: "reprise", race_date: isoIn(14) }); }
  catch (e) { refus = e; }
  if (!refus) return { ok: false, detail: "marathon en 2 semaines : plan produit sans refus" };
  const ok = refus.code === "ENTREE_INVALIDE" && refus.key === "race_date"
    && /format plus court/.test(refus.human || "") && /à partir du \d{4}-\d{2}-\d{2}/.test(refus.human || "");
  return { ok, detail: ok ? "refus typé + deux issues proposées" : String(refus.human || refus.message).slice(0, 90) };
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

// D3 — DETTE PAYÉE PAR LE LOT PROGRESSION (18/08/2026), pièce 1 : la trajectoire du brick.
// La dette venait des plans SATURÉS : chaque brick naissait à ses bornes hautes, donc la
// première semaine de spécifique sautait de plus de +10 % sur la précédente. Le plafond du
// brick interpole désormais du bas audité au haut audité (C21b) sur la position de phase —
// la première occurrence est la taille d'ENTRÉE du format, et le saut disparaît. `expect`
// passe à 'pass' dans le même commit : garde-fou permanent, comme O17 avant elle.
test("D3", "C22 : progression ≤ +10 % entre semaines de charge", "pass", () => {
  const bad = [];
  for (const sport of Object.keys(FORMATS))
    for (const format of FORMATS[sport]) {
      const p = build(sport, { format });
      let prev = null, prevDecl = null, prevW = null;
      for (const w of p.weeks) {
        if (w.isRecup || w.phase.id === "taper") continue;
        const m = weekMin(w);
        const decl = (w.vol || 0) * 60; // la courbe PROMISE, à distinguer du prescrit
        if (prev && m > prev * 1.1 + 1) {
          // R15.4 — le détail dit désormais QUELLE configuration saute, de combien, et
          // surtout si c'est la COURBE ou la DISCRÉTISATION : `7 sauts` ne permettait pas
          // de choisir le correctif. Déclaré conforme + prescrit qui saute = la semaine ne
          // se divise pas plus fin (planchers de séance). Les deux qui sautent = la courbe.
          const dPct = prevDecl > 0 ? Math.round((decl / prevDecl - 1) * 100) : NaN;
          const pPct = Math.round((m / prev - 1) * 100);
          const cause = Number.isFinite(dPct) && dPct <= 10 ? "discrétisation" : "courbe";
          bad.push(`${sport}/${format}(${p.totalWeeks}sem) S${prevW.num}→S${w.num} `
            + `déclaré +${dPct}% / prescrit +${pPct}% → ${cause}`);
        }
        prev = m; prevDecl = decl; prevW = w;
      }
    }
  return { ok: bad.length === 0, detail: `${bad.length} saut(s) — ` + bad.join(" · ") };
});

// La règle porte sur la semaine que la récup ASSIMILE, donc sur la dernière semaine de CHARGE
// qui la précède — c'est la formulation de la spec interne (`coherenceScorer`, qui exclut
// explicitement `weeks[i-1].isRecup`). Comparer deux semaines de récupération CONSÉCUTIVES
// (dérive du cycle de 10 jours) n'ajoute rien et entre en collision frontale avec le plancher
// de séance : un plan de nage débutant saturé n'a plus qu'une séance de 600 m (C24b), qui ne
// peut ni maigrir ni disparaître. Deux règles qui se contredisent sur toutes les séances
// courtes : celle-ci était mal formée, elle est reformulée plutôt qu'arbitrée.
test("D4", "Semaine de récup jamais plus chargée que la dernière semaine de charge", "pass", () => {
  const bad = [];
  for (const sport of Object.keys(FORMATS))
    for (const format of FORMATS[sport])
      for (const level of ["debutant", "inter"]) {
        const p = build(sport, { format, level, sessions_max: "3", vol_max: "7" });
        let lastCharge = 0;
        p.weeks.forEach((w) => {
          const m = weekMin(w);
          if (w.isRecup) {
            if (lastCharge > 0 && m > lastCharge) bad.push(`${sport}/${format}/${level} S${w.num}`);
          } else if (w.phase.id !== "taper") lastCharge = m;
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

// A3 — le plancher est une règle de semaine de CHARGE (voir `coherenceScorer`) : une semaine de
// décharge retire au lieu de remonter, et une séance sous le plancher y est légitime.
test("D6", "C24 : plancher de séance piscine aussi pour le débutant (semaines de charge)", "pass", () => {
  const bad = [];
  for (const sport of ["tri", "swim"])
    for (const format of FORMATS[sport]) {
      const p = build(sport, { format, level: "debutant", swim_limit: "technique" });
      sessionsOf(p).forEach(({ s, w }) => {
        if (w.isRecup || w.phase.id === "taper") return; // A3 — plancher = règle de semaine de charge
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

// R11.3 — CONTRAT DURCI : une FTP hors bornes n'est plus « rattrapée pour que les zones
// restent lisibles », elle est REFUSÉE. Rattraper en silence laissait l'athlète croire que sa
// saisie avait été prise en compte ; le refus lui dit quoi corriger.
test("E3", "FTP hors bornes physiologiques → refus typé (jamais des zones rattrapées en silence)", "pass", () => {
  const bad = [];
  for (const ftp of ["-100", "0", "1", "9999"]) {
    let refus = null;
    try { build("bike", { format: "route", ftp_known: "oui", ftp }); } catch (e) { refus = e; }
    if (!refus) { bad.push(`ftp=${ftp} accepté sans un mot`); continue; }
    if (refus.code !== "ENTREE_INVALIDE" || refus.key !== "ftp") bad.push(`ftp=${ftp} : refus non typé`);
  }
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "ok" };
});

// R23.1 — E3 NE COUVRAIT QUE LES CLÉS NUMÉRIQUES DU SCHÉMA, donc jamais l'allure seuil ni le CSS.
//
// Remonté par le fondateur (06/08/2026) : « il note un seuil à moins d'une minute au kilomètre,
// sans doute l'artefact d'une course ». `PHYSIO_BOUNDS` bornait `ftp`, `hrMax`, `hrRest`,
// `weight`, `height`, `age` — pas `thrPace` ni `css`, saisies en `min:s` donc sans `min`/`max`
// dans `ANSWER_SCHEMA`. Or ce sont les DEUX références qui pilotent toutes les zones de course
// et de nage, et la valeur importée est promue en référence vivante.
//
// Même famille que R20.1 (la garde couvre le sport où le code a été écrit, pas celui où il sert)
// et O-16 (borne d'âge fermée côté format, jamais rejouée sur l'écran arrivé après).
//
// Le critère tient les DEUX moitiés : l'artefact est refusé, ET la mesure vraie passe. La
// première seule serait satisfaite en refusant tout.
test("R23.1", "allure seuil et CSS : un artefact est refusé, une mesure vraie passe", "pass", () => {
  const bad = [];
  if (typeof E.testDansBornes !== "function") return { ok: false, detail: "point unique absent du bundle" };
  // ce qui doit être REFUSÉ — dont le 55 s/km exact du symptôme
  for (const [t, v, quoi] of [["thrPace", 55, "le seuil < 1 min/km du symptôme"],
    ["thrPace", 20, "trace en véhicule"], ["thrPace", 1500, "25 min/km"],
    ["css", 30, "sous le record du monde du 100 m"], ["css", 600, "10 min/100m"],
    ["ftp", 9999, "FTP absurde"]])
    if (E.testDansBornes(t, v) != null) bad.push(t + "=" + v + " ACCEPTÉ (" + quoi + ")");
  // ce qui doit PASSER — sans quoi le critère serait satisfait en refusant tout
  for (const [t, v, quoi] of [["thrPace", 150, "2'30/km, record du monde 10 km"],
    ["thrPace", 270, "4'30/km"], ["thrPace", 900, "15'/km, marche"],
    ["css", 50, "record du monde 100 m NL"], ["css", 115, "1'55/100m"],
    ["ftp", 250, "FTP courante"]])
    if (E.testDansBornes(t, v) == null) bad.push(t + "=" + v + " REFUSÉ à tort (" + quoi + ")");
  // un type non borné n'est pas inventé : la fonction ne prétend pas être un validateur universel
  if (E.testDansBornes("vma", 18) == null) bad.push("un type sans borne déclarée devrait passer");
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "6 artefacts refusés, 6 mesures vraies acceptées" };
});

test("E4", "Poids invraisemblable → estimation énergétique refusée", "pass", () => {
  const a = profile("tri", { format: "70.3", weight: "35", height: "180" });
  const p = E.buildPlan("tri", a);
  const day = p.weeks[5].days.find((d) => d.sessions.some((s) => s.d !== "rs"));
  const r = E.dailyEnergy(a, day.sessions);
  return { ok: r === null, detail: r ? `IMC ≈ 10.8 → ${r.total?.join("–")} kcal affichées` : "ok" };
});

// R11 — CE TEST A CHANGÉ DE CONTRAT, volontairement. Il assertait « buildPlan ne lève JAMAIS
// sur une entrée dégradée » : c'était l'exact contraire de ce qu'il faut. L'audit amont a
// montré où ça menait — `vol_max: "abc"` produisait un Ironman à 30 min hebdo de pic, sans un
// mot. Le principe du projet est l'inverse : « un plan faux est plus dangereux que pas de
// plan ». Une entrée fausse doit donc être REFUSÉE, et le refus doit être TYPÉ (clé, valeur,
// attendu) pour que l'athlète puisse le réparer lui-même.
// O-17 — LA CAPACITÉ QUI DÉPASSE L'HISTORIQUE DE CHARGE : on INFORME, on ne bride pas.
//
// Décision du fondateur (02/08/2026) : « notre rôle est d'informer au mieux et de laisser
// l'athlète choisir entre son besoin de résultats ou de sécurité ; le but n'est jamais de
// bloquer mais d'accompagner au mieux, sauf si réelle mise en danger. »
//
// Ce critère garde les DEUX moitiés de cette phrase, et la seconde compte autant que la
// première : l'avertissement existe pour qui en a besoin, ET le plan n'est pas bridé pour
// autant. Un correctif qui aurait rabaissé l'intensité aurait été un blocage déguisé.
// O17 — DETTE DÉCLARÉE DEPUIS O-20 (03/08/2026), ET C'EST SA SECONDE MOITIÉ QUI L'EST.
//
// La première moitié (le moteur AVERTIT, sans ordonner) tient et continue d'être vérifiée ici.
// La seconde — « le plan n'est pas bridé » — compare le plan de l'athlète capable à celui d'un
// ATHLÈTE DIFFÉRENT (7:00/km). Ce témoin a bougé quand I14b a rendu aux séances faciles ce que
// le plafond de libellé leur prenait, et le critère est passé rouge SANS QUE LE SUJET RÉTRÉCISSE :
// le plan de l'athlète capable fait **107 min avant comme après**, au caractère près ; c'est le
// témoin qui est passé de 92 à 120, parce qu'il livre enfin sa propre courbe.
//
// Ce que le critère expose est néanmoins un VRAI défaut, et il PRÉEXISTE : à `vol_recent: 5`,
// avant comme après I14b, le coureur à 5:45/km reçoit **100 min** et celui à 7:00/km **106** —
// chiffres identiques dans les deux états. C'est une inversion de monotonie sur l'axe ALLURE,
// cousine d'I13 (niveau) que ce lot vient de fermer. O17 ne la voyait que sur une cellule, et
// seulement parce que son témoin était lui-même sous-servi.
//
// Décision du fondateur (03/08/2026) : **dette déclarée plutôt que témoin réécrit.** Ré-ancrer
// le témoin sur l'athlète lui-même effacerait ce que le banc vient de trouver — et les deux
// candidats mesurés étaient instables (la rampe R10 fait légitimement baisser un plan à faible
// `vol_recent`). Le critère reste donc AFFICHÉ, avec son chiffre, comme D2/D3/F2.
//
// ── DETTE PAYÉE (O-21, 05/08/2026) : `expect` repasse à `"pass"`, dans le commit de la
// correction, comme le protocole l'exige. Le témoin n'a PAS été réécrit — c'est le moteur qui a
// changé. Deux causes, mesurées : (1) sur une semaine PLATE, le remplissage d'I14b était
// structurellement mort (son plafond de receveuse, `0,80 × longue`, tombe SOUS la valeur que
// I14 vient d'imposer) et les minutes retirées disparaissaient ; elles reviennent désormais à
// la sortie longue elle-même. (2) La garantie A2/I1 se rabattait sur une semaine de pic en
// RÉCUPÉRATION quand il n'y avait pas de pic en charge, et rabotait tout le plan à ce
// plafond-là — deux fois, le second passage repartant d'un plafond encore abaissé par D4.
// L'auditeur, lui, avait déjà tranché ce cas en AVERTISSEMENT (O-21, première moitié) : le
// générateur dit maintenant la même chose que lui.
test("O17", "capacité > historique de charge : le moteur AVERTIT, et ne bride pas", "pass", () => {
  const bad = [];
  const base = { format: "10k", vol_max: "6", sessions_max: "4", pace_known: "oui" };
  const plan = (pace, volRecent) => E.buildPlan("run", { ...profile("run"), ...base, pace, vol_recent: volRecent });
  const avert = (p) => ((p._v2 && p._v2.warnings) || []).some((w) => /tendons/i.test(w));
  const minutes = (p) => p.weeks[0].days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.d !== "rs" ? (s.min || 0) : 0), 0), 0);

  const capable = plan("5:45", "0");
  if (!avert(capable)) bad.push("capacité réelle + 0 h/sem : AUCUN avertissement");
  // … et il ne se déclenche pas à tort
  if (avert(plan("7:00", "0"))) bad.push("vrai débutant : avertissement à tort");
  if (avert(plan("5:45", "5"))) bad.push("coureur régulier : avertissement à tort");

  // LE PLAN N'EST PAS BRIDÉ — c'est la moitié qu'on oublierait en premier.
  //
  // Ma première écriture assertait l'ÉGALITÉ des volumes, et elle était fausse : 107 min contre
  // 92 min pour le témoin. Les deux plans diffèrent légitimement, parce que les bornes de séance
  // se calculent depuis l'allure et que les deux profils n'ont pas la même. Le risque à garder
  // n'est pas « le plan change », c'est « le plan RÉTRÉCIT » — un avertissement qui coûterait du
  // volume serait un blocage déguisé, et c'est exactement ce que la décision produit exclut.
  const temoin = plan("7:00", "0");
  if (minutes(capable) < minutes(temoin))
    bad.push(`le plan a RÉTRÉCI : ${minutes(capable)} min contre ${minutes(temoin)} min pour le témoin`);

  // Le message informe sans culpabiliser ni ordonner.
  const w = ((capable._v2 && capable._v2.warnings) || []).find((x) => /tendons/i.test(x)) || "";
  if (!/c'est toi qui décides/i.test(w)) bad.push("le message ne rend pas la décision à l'athlète");
  if (/tu dois|il faut que tu ralentisses|interdit/i.test(w)) bad.push("le message ordonne au lieu d'informer");
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "avertit, n'ordonne pas, ne bride pas" };
});

// O-21b — LA BORNE « RÉCUP ≤ SEMAINE PRÉCÉDENTE » SE PAIE EN VOLUME, PAS EN FRÉQUENCE.
//
// Ce que le critère épingle est le MÉCANISME du résidu d'O-21, pas un total. La règle sautait
// directement à `cutSmallestSessionIn` : mesuré, une semaine de récup à 198 min dont la voisine
// en délivre 192 est SIX minutes au-dessus de sa borne, et elle les payait avec une séance de
// 55 min — un dépassement de 3 % réglé par une coupe de 25 %.
//
// La coupe est TOUT-OU-RIEN, donc une minute de différence chez la voisine bascule une séance
// entière hors de la semaine : à `vol_max` identique, un coureur à 5:45/km franchissait la borne
// là où un coureur à 4:30/km ne la franchissait pas, et recevait un plan 20 % PLUS PETIT. Aucune
// règle ne « penchait » — c'est le seuil qui était brutal.
//
// Deux moitiés, et la seconde est celle qu'on oublierait : la fréquence doit rester COMPARABLE
// entre allures (le mécanisme), ET le plan ne doit pas grossir quand l'allure ralentit
// (l'inversion elle-même, mesurée sur les quatre allures deux à deux).
test("O-21b", "récup : la borne se paie en volume — aucune allure ne perd une séance ni ne gagne un plan", "pass", () => {
  const bad = [];
  const ALL = ["4:30", "5:45", "7:00", "8:30"];
  const base = { format: "10k", level: "debutant", history: "confirme",
    sessions_max: "3", vol_max: "6", vol_recent: "5", pace_known: "oui" };
  const nSess = (w) => w.days.reduce((t, d) => t + d.sessions.filter((s) => s.d !== "rs").length, 0);
  const tot = (p) => p.weeks.reduce((t, w) => t + w.days.reduce((a, d) =>
    a + d.sessions.reduce((u, s) => u + (s.race ? 0 : s.min || 0), 0), 0), 0);

  const plans = ALL.map((pace) => E.buildPlan("run", { ...profile("run"), ...base, pace }));

  // (1) LE MÉCANISME — les semaines de récup gardent le même nombre de séances d'une allure à
  // l'autre. Avant : 3 séances à 4:30 et 7:00, 2 à 5:45 et 8:30.
  const freq = plans.map((p) => p.weeks.filter((w) => w.isRecup).map(nSess).join("+"));
  if (new Set(freq).size > 1)
    bad.push("la fréquence des semaines de récup dépend de l'allure : " + ALL.map((a, i) => a + "→" + freq[i]).join(" "));

  // (2) L'INVERSION — un athlète qui déclare une allure PLUS LENTE ne reçoit pas un plan plus
  // gros. Tolérance 6 % : les bornes de séance se calculent depuis l'allure, donc les plans
  // diffèrent légitimement un peu (c'est l'arbitrage déjà écrit dans O17). Avant : +24,3 %.
  const t = plans.map(tot);
  for (let i = 1; i < t.length; i++)
    if (t[i] > t[i - 1] * 1.06)
      bad.push(`${ALL[i]} reçoit +${(100 * (t[i] / t[i - 1] - 1)).toFixed(1)} % vs ${ALL[i - 1]} (${t[i - 1]}→${t[i]} min)`);

  return { ok: bad.length === 0, detail: bad.join(" ; ")
    || `récup ${freq[0]} séances aux 4 allures · totaux ${t.join(" ")} min` };
});

// U9 — LE REFUS NOMME CE QUE L'ATHLÈTE A DEMANDÉ.
//
// La dernière phrase du refus « course trop proche » était écrite en dur : « Te vendre une
// préparation d'Ironman en un mois serait te mentir ». Mesuré avant correction : **9 refus sur
// 9**, sur les SEPT sports — un nageur qui prépare un 1500 m et un coureur qui prépare un 10 km
// s'entendaient parler d'Ironman. C'est le moment le plus honnête du produit (il refuse une
// préparation pour ne pas blesser) et il montrait qu'il ne lisait pas la réponse saisie.
//
// Second volet : ne pas proposer « un format plus court » à qui a déjà le plus court du sport.
// U14 — LE DÉFAUT D'UNE RÉPONSE ABSENTE VA VERS LA PRUDENCE, ET IL EST DIT.
//
// Mesuré en préparant le questionnaire court : un plan construit SANS réponse à « ta
// disponibilité » était identique, au caractère près, à `dispo: "quotidienne"` — la valeur qui
// autorise le PLUS de jours d'entraînement. Sauter la question donnait donc le plan de
// quelqu'un qui peut s'entraîner tous les jours, et rien ne le disait. Un défaut se choisit
// dans le sens de la sécurité (priorité n°2) et R11.2 exige qu'il soit journalisé : « un défaut
// tacite est un mensonge par omission ».
test("U14", "un défaut tacite va vers la prudence, et il est journalisé", "pass", () => {
  const bad = [];
  const base = { format: "10k", vol_max: "6", sessions_max: "5", vol_recent: "3",
    med_pain: "non", med_dizzy: "non", med_treat: "non", age: "38", sex: "H", weight: "75" };
  const emp = (a) => JSON.stringify(E.buildPlan("run", a).weeks
    .map((w) => [w.vol, w.days.map((d) => d.sessions.map((x) => [x.d, x.name, x.min]))]));
  const sans = emp(base);
  if (sans === emp({ ...base, dispo: "quotidienne" }))
    bad.push("l'absence de `dispo` équivaut encore à « quotidienne » — le plus permissif du domaine");
  if (sans !== emp({ ...base, dispo: "partielle" }))
    bad.push("l'absence de `dispo` n'équivaut pas au défaut DÉCLARÉ (« partielle »)");
  const dec = ((E.buildPlan("run", base)._v2 || {}).decisions || [])
    .filter((d) => /^R11-defaut-/.test(d.id)).map((d) => d.id.replace("R11-defaut-", ""));
  for (const k of ["dispo", "doubles", "intent", "level", "history"])
    if (!dec.includes(k)) bad.push("défaut non journalisé : " + k);
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "défaut prudent (« partielle ») et journalisé : " + dec.join(", ") };
});

test("U9", "le refus « course trop proche » ne parle jamais d'une autre épreuve que la sienne", "pass", () => {
  const bad = [];
  const course = isoIn(14); // ancré au lundi courant (check:dates) — le jour de semaine ne décide plus
  const cas = [["run", "10k"], ["run", "marathon"], ["bike", "cyclo"], ["swim", "fond"],
    ["tri", "S"], ["tri", "Full"], ["duathlon", "M"], ["trail", "?"], ["swimrun", "sprint"]];
  let vus = 0;
  for (const [sp, fmt] of cas) {
    let h = null;
    try { E.buildPlan(sp, { ...profile(sp), format: fmt, race_date: course }); }
    catch (e) { h = e.human || ""; }
    if (!h || !/semaine\(s\) avant ta course/.test(h)) continue;
    vus++;
    if (/Ironman/.test(h)) bad.push(`${sp}/${fmt} : parle d'Ironman`);
    // « un format plus court » sans en nommer aucun = une issue qui n'existe pas
    if (/format plus court(?!\s*\()/.test(h)) bad.push(`${sp}/${fmt} : propose un format plus court sans en nommer un`);
    if (!/serait te mentir/.test(h)) bad.push(`${sp}/${fmt} : la phrase de refus a disparu`);
  }
  if (vus < 5) bad.push(`seulement ${vus} refus observés — l'échantillon ne prouve rien`);
  return { ok: bad.length === 0, detail: bad.join(" ; ") || `${vus} refus, tous nomment la bonne épreuve` };
});

// ── PW — LE VÉLO A ENFIN UN CHRONO, ET LE TRIATHLON UN TOTAL ───────────────────────────
//
// Trois faces, parce que le risque est différent sur chacune : le chrono existe et il est
// PLAUSIBLE ; il RÉAGIT à ce dont il dépend (relief, position, poids) ; et il REFUSE quand la
// matière manque, au lieu d'inventer une masse.
const triPred = (over) => E.predict("tri", { ...profile("tri"), format: "70.3", ftp_known: "oui", ftp: "250",
  pace_known: "oui", pace: "4:30", css_known: "oui", css: "1:40", weight: "75", terrain: "plat", ...over });
const legOf = (p, re) => (p.items || []).find((i) => re.test(i.leg)) || null;
const secOf = (v) => { const m = String(v).split(/[–-]/)[0].trim();
  const a = m.match(/^(\d+)h(\d+)$/), b = m.match(/^(\d+)'(\d+)$/);
  return a ? +a[1] * 3600 + +a[2] * 60 : b ? +b[1] * 60 + +b[2] : NaN; };

test("PW-A", "le chrono vélo existe sur les 4 formats de tri, et il est plausible", "pass", () => {
  // Les bornes sont larges À DESSEIN : ce critère garde l'ORDRE DE GRANDEUR, pas une
  // calibration. Une garde serrée sur des valeurs exactes se casserait à chaque retouche de
  // CdA sans rien dire de plus — et ce qu'on veut savoir, c'est « ce chrono est-il celui d'un
  // triathlète ou celui d'un bug ». Vitesses attendues : 30-42 km/h selon le format.
  const bad = [];
  for (const [format, km] of [["S", 20], ["M", 40], ["70.3", 90], ["Full", 180]]) {
    const it = legOf(triPred({ format }), new RegExp("Vélo " + km + "km"));
    if (!it) { bad.push(format + " : aucun chrono vélo"); continue; }
    const kmh = km / (secOf(it.value) / 3600);
    if (!(kmh > 28 && kmh < 45)) bad.push(`${format} : ${kmh.toFixed(1)} km/h hors [28, 45]`);
    if (!/Martin/.test(it.why)) bad.push(format + " : le chrono ne dit pas d'où il vient");
    if (!/CdA/.test(it.why)) bad.push(format + " : les hypothèses ne sont pas affichées");
  }
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "4 formats, vitesses dans la plage d'un triathlète" };
});

test("PW-B", "le total inclut les transitions, et il est la somme de ses parts", "pass", () => {
  const bad = [];
  for (const format of ["S", "M", "70.3", "Full"]) {
    const p = triPred({ format });
    const tot = legOf(p, /Total/);
    if (!tot) { bad.push(format + " : pas de total"); continue; }
    const parts = ["Natation", "Vélo \\d+km", "CAP"].map((re) => legOf(p, new RegExp(re)));
    if (parts.some((x) => !x)) { bad.push(format + " : un segment manque alors que le total sort"); continue; }
    const somme = parts.reduce((t, x) => t + secOf(x.value), 0);
    const total = secOf(tot.value);
    // Le total DOIT dépasser la somme des trois segments — de la valeur des transitions.
    const trans = total - somme;
    if (trans <= 0) bad.push(`${format} : total ${total}s ≤ somme des segments ${somme}s — les transitions ne sont pas comptées`);
    else if (trans < 120 || trans > 900) bad.push(`${format} : ${Math.round(trans / 60)} min de transitions, hors [2, 15]`);
    if (!/T1/.test(tot.why) || !/T2/.test(tot.why)) bad.push(format + " : le total ne dit pas qu'il compte les transitions");
  }
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "4 formats : total = segments + T1 + T2" };
});

test("PW-C", "le chrono RÉAGIT au relief et au poids, et REFUSE sans poids", "pass", () => {
  const bad = [];
  const t = (over) => { const it = legOf(triPred(over), /Vélo 90km/); return it ? secOf(it.value) : null; };
  const plat = t({ terrain: "plat" }), vall = t({ terrain: "vallonne" }), mont = t({ terrain: "montagne" });
  if (!(plat && vall && mont)) bad.push("un des trois reliefs ne rend pas de chrono");
  else {
    if (!(vall > plat)) bad.push(`vallonné (${vall}s) pas plus lent que plat (${plat}s)`);
    if (!(mont > vall)) bad.push(`montagne (${mont}s) pas plus lent que vallonné (${vall}s)`);
    // Ordres de grandeur visés à la calibration : +5 à +15 % en vallonné, +18 à +40 % en montagne.
    const pv = 100 * (vall / plat - 1), pm = 100 * (mont / plat - 1);
    if (pv < 5 || pv > 15) bad.push(`vallonné +${pv.toFixed(0)} % hors [5, 15]`);
    if (pm < 18 || pm > 40) bad.push(`montagne +${pm.toFixed(0)} % hors [18, 40]`);
  }
  // Le poids : plus lourd = plus lent (roulement et pente). S'il n'agissait pas, l'entrée
  // serait décorative — c'est exactement ce que R20.1 a mesuré ailleurs.
  const l60 = t({ weight: "60" }), l95 = t({ weight: "95" });
  if (!(l60 && l95 && l95 > l60)) bad.push("le poids n'agit pas sur le chrono vélo");
  // …et sans poids, on REFUSE en le disant (P7/P8), on n'invente pas une masse.
  const sans = triPred({ weight: "" });
  if (legOf(sans, /Vélo 90km/)) bad.push("un chrono vélo est produit SANS poids déclaré");
  if (legOf(sans, /Total/)) bad.push("un total est produit alors que le vélo n'est pas estimé");
  if (!(sans.advice || []).some((a) => /[Pp]oids manquant/.test(a))) bad.push("le refus n'est pas expliqué à l'athlète");
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "relief et poids agissent ; sans poids, refus motivé" };
});

// ── C30 — LA SORTIE LONGUE CONNAÎT L'ÉPREUVE (décision du fondateur, 04/08/2026) ────────
//
// « se rapprocher du temps visé sur l'épreuve a minima, et au moins 70 % de la distance ».
//
// ⚠ PORTÉE MESURÉE, ET ELLE EST PETITE : sur 180 profils de course (4 formats × 3 niveaux ×
// 5 allures × 3 enveloppes), C30 en déplace **7**, de 2 à 6 minutes. La règle est juste ;
// ce qui la borne est en aval et c'est documenté en O-26 — `blockBounds` remplace le plancher
// déclaré par un « plancher digne » de 30 min, et le vrai facteur limitant est le volume
// hebdomadaire d'une prépa de format court. Ces critères gardent donc ce que C30 fait
// VRAIMENT, pas ce qu'on aimerait qu'il fasse : un critère écrit sur l'intention serait vert
// avant le correctif comme après. (Première écriture : trois cassures, trois verts.)
const c30Long = (over) => {
  const p = E.buildPlan("run", { ...profile("run"), intent: "competition", med_pain: "non", med_dizzy: "non",
    med_treat: "non", injury: "aucune", sessions_max: "5", dispo: "quotidienne", doubles: "oui",
    pace_known: "oui", vol_recent: "3", terrain: "route", ...over });
  let sl = 0;
  p.weeks.forEach((w) => w.days.forEach((d) => d.sessions.forEach((x) => { if (x.long && (x.min || 0) > sl) sl = x.min; })));
  return sl;
};

test("C30-A", "C30 + C30b allongent la sortie longue des coureurs LENTS — les profils déplacés", "pass", () => {
  // Un test d'égalité et non d'inégalité : c'est ce qui le rend rouge dans les deux sens.
  //
  // TROIS ÉTATS SUCCESSIFS, gardés écrits parce que c'est la seule façon de voir ce que chaque
  // règle a payé. Sur `10k/inter/8:30/8h` : **47** min sans rien, **47** avec C30 seul (le
  // plancher était calculé puis annulé en aval — O-26), **76** avec C30b. Sur
  // `semi/inter/7:00/8h` : 122 → 124 → **130**, le plafond de format.
  //
  // C30b a élargi la population de 7 profils à **28 sur 96** (4 formats × 3 niveaux ×
  // 4 allures × 2 enveloppes) — tous en 10 km et en semi, tous chez des coureurs à 5:45 et
  // plus lents. Aucun à 4:30 (le rapide atteignait déjà sa cible), aucun sur marathon (la
  // longue y est au plafond C23 depuis toujours, et c'est C31 qui prend le relais).
  // QUATRIÈME ÉTAT — B-02, la réallocation du plafond de temps dur (14/08/2026).
  //
  // `enforceHardTimeCap` rend désormais en FACILE ce qu'il retire en DUR, et la restitution
  // remonte jusqu'à la sortie longue par le tail O-21. Quatre profils bougent, trois vers le
  // haut : `10k/debutant/7:00/6h` **64 → 81**, soit le profil qui gagne le plus de tout ce
  // chapitre, et c'est exactement la population que C30 existe pour servir (un coureur lent
  // dont la longue ne préparait pas la durée de sa course). Les deux `10k/debutant/8:30`
  // passent de 79 à 81 — ils étaient déjà déplacés par C30b, la réallocation ajoute 2 min.
  //
  // Le quatrième descend d'une minute (`semi/inter/4:30` **120 → 119**) et il est gardé tel
  // quel : c'est le COUREUR RAPIDE, celui dont la cible de spécificité est déjà atteinte. Sa
  // longue ne doit rien à C30 ; elle suit le volume de sa semaine, qui se recompose quand du
  // dur devient du facile. Une baisse d'une minute sur un témoin qui ne dépend pas de la règle
  // est le comportement attendu d'une redistribution, pas une régression — l'épingler à 119
  // plutôt que l'exempter garde la propriété mesurable dans les deux sens.
  //
  // CINQUIÈME ÉTAT — O-42, la conversion unique (15/08/2026). Un bloc prescrit en MÈTRES coûte
  // désormais les minutes de l'allure de sa ZONE et non celles de l'ancre brute : `rn.thr` +2,5 %,
  // `rn.mara` +10,5 %. Ces minutes-là sont du DUR, donc `enforceHardTimeCap` en rend davantage en
  // facile, et le tail O-21 les fait remonter à la sortie longue — le mécanisme exact du
  // quatrième état, réactivé par une cause nouvelle. **Deux témoins bougent, les deux vers le
  // haut** : `10k/avance/5:45/8h` **59 → 61** et `semi/inter/4:30/8h` **119 → 120**. Les deux
  // sont des coureurs dont la cible de spécificité est déjà atteinte : ils ne doivent rien à C30,
  // ils suivent la recomposition de leur semaine. Ré-épinglés avec leur raison, jamais exemptés.
  // HUITIÈME ÉTAT — LE RETRAIT DU CYCLE DE 10 JOURS (25/08/2026). La fixture de base de ce banc
  // déclare `dispo: "quotidienne"` + `shift_ok: "oui"` : **tous ces témoins tournaient donc sous
  // le cycle de 10 jours**, et ils passent au cycle de 7 comme tout le monde. Sept témoins
  // bougent, **six vers le HAUT** — `10k/debutant` 81 → 90 (×3), `10k/inter/7:00` 64 → 69,
  // `10k/avance/5:45` 61 → 69, `10k/inter/4:30` 59 → 69 — et un vers le bas
  // (`5k/inter/8:30` 70 → 66). La sortie longue des coureurs LENTS de 10 km s'allonge, ce qui
  // est exactement ce que C30 existe pour faire : le cycle de 10 diluait `durLong` de 30 % par
  // jour (fiches 29-31), et le retirer rend cette densité. Ré-épinglés avec leur raison.
  const attendu = [
    // les 7 profils que C30 déplaçait déjà
    ["10k", "debutant", "8:30", "6", 90], ["10k", "debutant", "8:30", "8", 90],
    ["semi", "debutant", "8:30", "8", 130], ["semi", "inter", "7:00", "8", 130],
    ["semi", "inter", "8:30", "8", 130], ["semi", "avance", "7:00", "8", 130],
    ["semi", "avance", "8:30", "8", 130],
    // ceux que C30b ajoute — la moitié du gain de ce chapitre est là
    ["10k", "debutant", "7:00", "6", 90], ["10k", "inter", "7:00", "8", 69],
    ["10k", "inter", "8:30", "8", 79], ["10k", "avance", "5:45", "8", 69],
    ["semi", "debutant", "7:00", "6", 130], ["semi", "debutant", "8:30", "6", 130],
    // …et LE COUREUR RAPIDE, qui n'est plus un témoin immobile — O-21 l'a bougé, pas C30b.
    // Ces trois-là ne doivent RIEN à la spécificité (leur cible est déjà atteinte) : ils
    // montent parce que le remplissage d'I14b rend enfin à la sortie longue les minutes que
    // le plafond de libellé lui avait prises. Gardés ici, avec cette raison, plutôt que
    // retirés — c'est la seule façon de voir qu'un même chiffre a DEUX causes possibles.
    ["10k", "inter", "4:30", "8", 69], ["5k", "inter", "8:30", "8", 66],
    ["semi", "inter", "4:30", "8", 130], ["marathon", "inter", "4:30", "8", 180],
  ];
  // SEPTIÈME ÉTAT — O-69, le volume récent devient un PLANCHER (18/08/2026). Le départ du
  // plan est ancré à 0,85 × vol_recent : les premières semaines de `5k/inter/8:30/8h`
  // montent, et sa longue suit la recomposition de sa semaine — **un seul témoin bouge,
  // 69 → 70**, une minute. Même doctrine que les états 4 à 6 : ré-épinglé avec sa raison,
  // jamais exempté, et même rattachement à O-51 (ce témoin suit l'état du moteur).
  // SIXIÈME ÉTAT — lot 1, le plafond de dose lit les blocs prescrits en MÈTRES (17/08/2026).
  // `rn.thr` est prescrit en mètres sur ces profils : le plafond de 40 min y mord désormais, ces
  // minutes de DUR deviennent du FACILE, et le tail O-21 les fait remonter à la sortie longue.
  // **Un seul témoin bouge : `semi/inter/4:30/8h`, 120 → 130**, le plafond de format.
  //
  // C'est la TROISIÈME fois que ce même témoin bouge — B-02, puis O-42, puis ici — par trois
  // causes différentes et un mécanisme identique : « une quantité de dur change quelque part ».
  // Ré-épinglé selon la doctrine du banc (« avec leur raison, jamais exemptés »), et le fondateur
  // l'a tranché ainsi le 17/08/2026 ; mais il note en même temps ce que trois occurrences
  // établissent — **un témoin qui bouge à chaque variation de dur n'épingle pas une propriété,
  // il épingle un état incident**. Rattaché à O-51 comme second candidat à la reformulation sur
  // la propriété : `C30b-A` teste un déclenchement, celui-ci teste une valeur, et dans les deux
  // cas la propriété est ailleurs.
  //
  // ⚠ CETTE VALEUR SUIT L'ÉTAT DU MOTEUR, PAS UNE DÉCISION INDÉPENDANTE. L'arbitrage Q1 qui
  // maintient le plafond de dose sur les mètres a été rendu sur des chiffres que j'avais publiés
  // FAUX (voir RAPPORT_LOT1.md §9) et il est rouvert. S'il est révoqué, ce 130 redevient 120 —
  // c'est écrit ici pour que personne n'ait à s'en souvenir.
  const bad = [];
  for (const [format, level, pace, vol_max, min] of attendu) {
    const sl = c30Long({ format, level, pace, vol_max });
    if (sl !== min) bad.push(`${format}/${level}/${pace}/${vol_max}h : ${sl} au lieu de ${min}`);
  }
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "les 7 profils déplacés par C30 tiennent leur valeur" };
});

test("C30b-A", "la sortie longue ATTEINT sa cible de spécificité — et C30b, quand elle agit, redistribue", "pass", () => {
  // La permission du fondateur (05/08/2026) est « jusqu'à 70 % du volume de semaine SI
  // NÉCESSAIRE ». Deux moitiés, et la seconde est celle qui compte : c'est une redistribution,
  // pas une charge en plus. Si un jour quelqu'un fait monter la longue sans prendre les minutes
  // ailleurs, ce critère le voit — et il verrait aussi bien l'inverse, une longue qu'on
  // laisserait dépasser la borne.
  //
  // O-51 (17/08/2026) — CE CRITÈRE MESURAIT LE DÉCLENCHEMENT D'UNE PASSE, PAS LA PROPRIÉTÉ
  // QU'ELLE SERT, ET IL EST DEVENU ROUGE POUR LA MEILLEURE DES RAISONS.
  //
  // Il exigeait qu'une décision `C30b` soit émise sur ses 4 profils. Le lot 1 (plafond de dose)
  // a fait qu'un de ces profils atteint sa cible SANS la passe — mesuré, expérience contrôlée,
  // profil exact du banc, `semi@7:00/6h` :
  //
  //        S9 spécifique   S10 pic   S11 pic   décisions C30b
  //   avant   106 min       129 min   130 min        1
  //   après   115 min       129 min   130 min        0
  //
  // La longue est IDENTIQUE au pic et PLUS LONGUE de 9 min en spécifique. Le critère annonçait
  // « aucune décision C30b alors que la longue devrait monter » — elle est montée, et davantage.
  // Il punissait une amélioration.
  //
  // La propriété est « la longue atteint sa cible » ; « C30b se déclenche » n'en est qu'un des
  // chemins. Le critère porte désormais sur la cible, et le mécanisme n'est vérifié que QUAND la
  // décision existe — les trois moitiés (borne 70 %, chiffre annoncé = chiffre livré, neutralité
  // en volume) sont inchangées, elles étaient justes.
  //
  // ⚠ Le correctif le moins coûteux qui aurait fait passer ce test était d'abaisser `vus < 4` à
  // `vus < 3` (règle 19). Il ne résout rien : le critère ne mesurerait toujours pas la bonne
  // grandeur, et il rougirait de nouveau au profil suivant qui s'améliore. La contre-preuve
  // exigée par l'arbitrage — ROUGE sur un état où la longue N'ATTEINT PAS sa cible — est ce qui
  // distingue une reformulation d'un moyen de faire disparaître un rouge ; elle se fabrique en
  // MUTANT la cible, pas en attendant qu'un profil la rate.
  //   EB_C30B_MUTE=x  multiplie la longue LUE par x — un moteur qui sous-livre. `0.9` doit
  //                   rendre ce critère ROUGE ; c'est la contre-preuve, elle est reproductible.
  const mut = Number(process.env.EB_C30B_MUTE || 1) || 1;
  const bad = [];
  let vus = 0, partMax = 0, ciblesVues = 0, ciblesTenues = 0, cibleMord = 0;
  for (const [format, pace, vol_max] of [["10k", "8:30", "8"], ["10k", "7:00", "6"], ["semi", "8:30", "8"], ["semi", "7:00", "6"]]) {
    const p = E.buildPlan("run", { ...profile("run"), intent: "competition", med_pain: "non", med_dizzy: "non",
      med_treat: "non", injury: "aucune", sessions_max: "5", dispo: "quotidienne", doubles: "oui",
      pace_known: "oui", vol_recent: "3", terrain: "route", format, pace, vol_max });

    // ── VOLET 1 — LA PROPRIÉTÉ : la longue livrée atteint sa cible, ou son plafond de séance.
    //
    // Les DEUX grandeurs viennent du moteur, jamais d'une seconde écriture dans le banc (R11.1) :
    //   · la cible, par `EBV2.longRunSpecTarget` (exposée pour ça, O-51) ;
    //   · le plafond, LU SUR LE PLAN LIVRÉ — c'est le `bnd.cap` du bloc de corps de la longue,
    //     exactement la valeur que la passe emploie. Le lire plutôt que le déclarer est ce qui
    //     empêche ce critère de redevenir une liste de valeurs épinglées (règle 15).
    //
    // ⚠ MA PREMIÈRE ÉCRITURE UTILISAIT `E.parseChronoSec(pace)` : c'est le parseur de CHRONO, il
    // lit « 8:30 » comme 8 h 30 et rend 30 600. Les cibles sortaient à **6 466 min** et les quatre
    // profils étaient rouges — un critère peut échouer parce que le moteur a tort ou parce que
    // l'instrument a tort, et l'échec a exactement la même tête. `parsePaceSec` est désormais
    // exposé à côté (O-51) : le banc n'a plus le choix entre deux parseurs dont un est faux ici.
    const thr = E.parsePaceSec(pace);
    const spec = E.longRunSpecTarget(format, thr, Number(vol_max));
    let lg0 = null;
    p.weeks.forEach((w) => w.days.forEach((d) => d.sessions.forEach((x) => { if (x.long && !x.race && (x.min || 0) > (lg0 ? lg0.min : 0)) lg0 = x; })));
    const corps0 = lg0 ? (lg0.steps || []).filter((st) => st.role === "body" && st.durationMin != null) : [];
    const capSeance = corps0.length === 1 && corps0[0].bnd ? corps0[0].bnd.cap : Infinity;
    if (spec && spec.target > 0 && lg0) {
      ciblesVues++;
      if (spec.target <= capSeance) cibleMord++;   // ici la CIBLE décide, pas le plafond
      const attendu = Math.min(spec.target, capSeance);
      const livre = Math.round((lg0.min || 0) * mut);
      // Tolérance de 2 min : les donneuses peuvent être à leur plancher (mesuré, 2 profils sur 96
      // manquent de 2 min — publié en livrant C30b, ce n'est pas une dérive nouvelle).
      if (livre + 2 >= attendu) ciblesTenues++;
      else bad.push(`${format}@${pace}/${vol_max}h : longue ${livre} min pour ${Math.round(attendu)} attendus (cible ${spec.target}, plafond de séance ${capSeance === Infinity ? "—" : capSeance})`);
    }

    // ── VOLET 2 — LE MÉCANISME, uniquement quand la décision existe.
    const dec = ((p._v2 || {}).decisions || []).filter((d) => d.id === "C30b");
    vus += dec.length;
    for (const d of dec) {
      const num = Number((/sem\. (\d+)/.exec(String(d.what)) || [])[1]);
      const wk = p.weeks.find((w) => w.num === num);
      if (!wk) { bad.push(`${format}@${pace} : la décision cite la semaine ${num}, qui n'existe pas`); continue; }
      const ss = wk.days.flatMap((x) => x.sessions).filter((x) => x.d !== "rs");
      const tot = ss.reduce((t, x) => t + (x.min || 0), 0);
      const lg = ss.find((x) => x.long && !x.race);
      if (!lg || !tot) { bad.push(`${format}@${pace} S${num} : pas de sortie longue dans la semaine citée`); continue; }
      const part = (100 * (lg.min || 0)) / tot;
      partMax = Math.max(partMax, part);
      // (a) la borne du fondateur
      if (part > 70) bad.push(`${format}@${pace} S${num} : la longue pèse ${Math.round(part)} % de la semaine (> 70 %)`);
      // (b) LE CHIFFRE ANNONCÉ EST CELUI DU PLAN LIVRÉ — pas celui de l'instant où la passe a agi.
      const attendu = `${Math.round(lg.min || 0)} min, soit ${Math.round(part)} % de la semaine`;
      if (String(d.val) !== attendu) bad.push(`${format}@${pace} S${num} : la décision annonce « ${d.val} », le plan porte « ${attendu} »`);
      // (c) LA NEUTRALITÉ EN VOLUME, VUE DU DEHORS. C30b tourne APRÈS le point fixe : si elle
      // ajoutait des minutes au lieu d'en déplacer, plus aucune passe ne le corrigerait et la
      // semaine dépasserait la courbe annoncée. Mesuré, les semaines touchées tiennent entre
      // 0,90 et 1,01 fois leur courbe ; la borne est à 1,05 pour ne pas transformer ce critère
      // en photographie du comportement actuel.
      const decl = (wk.vol || 0) * 60;
      if (decl > 0 && tot > 1.05 * decl) bad.push(`${format}@${pace} S${num} : ${Math.round(tot)} min prescrites pour ${Math.round(decl)} annoncées — C30b a AJOUTÉ au lieu de déplacer`);
    }
  }
  // NON-VACUITÉ — déplacée sur une propriété de l'ATHLÈTE et non sur le chemin du moteur.
  // L'ancienne version comptait les DÉCISIONS : elle devenait donc vacue (et rouge) dès que le
  // moteur atteignait la cible autrement. Ce qu'il faut garantir, c'est que l'échantillon pose
  // de vraies questions — c'est-à-dire que ces coureurs ONT une cible de spécificité, ce qui ne
  // dépend que de leur allure et de leur format.
  if (ciblesVues < 4) bad.push(`seulement ${ciblesVues} cible(s) de spécificité sur 4 profils — l'échantillon ne prouve rien`);
  // …et il faut qu'au moins deux profils soient décidés par la CIBLE et non par le plafond, sans
  // quoi le critère ne testerait jamais que `C30-B` sous un autre nom. Mesuré : les deux 10 km
  // (cible 79 et 64 pour un plafond de 90) contre les deux semis (cible 176 et 145 pour un
  // plafond de 130). C'est une propriété de l'athlète et du format — elle ne dépend d'aucun
  // chemin du moteur, donc elle ne peut pas devenir vacue parce que le moteur s'améliore.
  if (cibleMord < 2) bad.push(`seulement ${cibleMord} profil(s) où la cible mord avant le plafond — le critère ne testerait que C30-B`);
  return {
    ok: bad.length === 0,
    detail: bad.join(" ; ")
      || `${ciblesTenues}/${ciblesVues} atteintes (dont ${cibleMord} décidées par la cible) · ${vus} décision(s) C30b · part max ${Math.round(partMax)} % (permission 70 %)`,
  };
});

test("C30-B", "un plancher de spécificité ne passe JAMAIS devant un plafond de sécurité", "pass", () => {
  // NON-RÉGRESSION, et il faut le dire : ce critère était déjà vert avant C30, parce que le
  // plafond tenait déjà. Il existe pour le jour où quelqu'un décidera de faire gagner le
  // plancher (c'est la suite naturelle d'O-26) — sur marathon, « se rapprocher du temps de
  // course » voudrait dire 3h20 à 5h25 de sortie longue, et C23 plafonne à 180.
  const bad = [];
  for (const pace of ["4:30", "5:45", "7:00", "8:30"]) {
    const sl = c30Long({ format: "marathon", pace, level: "debutant", history: "reprise", vol_max: "8" });
    if (sl > 180) bad.push(`marathon débutant @${pace} : ${sl}min > 180 (C23)`);
  }
  const slPied = c30Long({ format: "semi", pace: "8:30", injury: "pied", vol_max: "8" });
  if (slPied > Math.round(130 * 0.85)) bad.push(`semi + pied fragile : ${slPied}min > plafond ×0,85`);
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "C23 et le plafond blessure tiennent, le plancher cède" };
});

// ── C31 — LE BACK-TO-BACK MARATHON (décision du fondateur, 04/08/2026) ──────────────────
//
// « Couper une sortie longue trop longue en deux jours d'affilée ». Le déclencheur est
// MESURÉ : C30 capped sur marathon, manque ≥ 45 min. Trois critères pour les trois faces :
// il se pose là où il doit (et JAMAIS ailleurs — quatre exclusions sourcées), sa dose est
// celle du manque, et la longue reste la plus longue de sa semaine.
const c31Scan = (over) => {
  const p = E.buildPlan("run", { ...profile("run"), format: "marathon", intent: "competition",
    med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune", sessions_max: "5",
    vol_max: "8", dispo: "quotidienne", doubles: "oui", pace_known: "oui", pace: "7:00",
    vol_recent: "6", terrain: "route", level: "inter", history: "confirme", ...over });
  const b2b = [];
  let slMax = 0;
  p.weeks.forEach((w) => w.days.forEach((d) => d.sessions.forEach((x) => {
    if (/Back-to-back \(jour 2/.test(x.name)) b2b.push({ sem: w.num, phase: w.phase.id, min: x.min || 0 });
    if (x.long && (x.min || 0) > slMax) slMax = x.min || 0;
  })));
  return { b2b, slMax };
};

test("C31-A", "le back-to-back se pose en PIC quand le manque le justifie, à la dose du manque", "pass", () => {
  const bad = [];
  // marathon @7:00 : manque ~154 → jour 2 à min(154, 108) = 108 min, en phase de pic.
  const g = c31Scan({});
  if (!g.b2b.length) bad.push("7:00 : aucun back-to-back posé");
  else {
    if (g.b2b.some((x) => x.phase !== "peak")) bad.push("posé hors phase de pic : " + JSON.stringify(g.b2b));
    if (g.b2b.length > 3) bad.push(g.b2b.length + " week-ends — la source borne à 2-3 par prépa");
    if (g.b2b.some((x) => x.min < 45)) bad.push("jour 2 sous 45 min (le filet aurait dû déclasser) : " + JSON.stringify(g.b2b));
    if (g.b2b.some((x) => x.min > 108 + 2)) bad.push("jour 2 au-dessus de 0,6 × longue : " + JSON.stringify(g.b2b));
    if (g.b2b.some((x) => x.min >= g.slMax)) bad.push("le jour 2 dispute son titre à la longue (I14)");
  }
  // et la dose SUIT le manque : à 5:45 (manque ~90), le jour 2 est plus court qu'à 7:00.
  const h = c31Scan({ pace: "5:45" });
  if (h.b2b.length && g.b2b.length && !(h.b2b[0].min < g.b2b[0].min)) bad.push("la dose ne suit pas le manque (5:45 → " + (h.b2b[0] || {}).min + " vs 7:00 → " + g.b2b[0].min + ")");
  return { ok: bad.length === 0, detail: bad.join(" ; ") || g.b2b.length + " week-end(s), jour 2 à " + g.b2b.map((x) => x.min).join("/") + " min, longue " + g.slMax + " intacte" };
});

test("C31-B", "les quatre exclusions tiennent : débutant, médical, blessure d'impact, autre format", "pass", () => {
  const bad = [];
  const cas = [
    ["débutant", { level: "debutant", history: "reprise" }],
    ["drapeau médical", { med_treat: "oui" }],
    ["blessure d'impact (pied)", { injury: "pied" }],
    ["semi (mécanisme absent sous ~2h30)", { format: "semi" }],
    ["manque < 45 min (4:50)", { pace: "4:50" }],
  ];
  for (const [nom, over] of cas) {
    const g = c31Scan(over);
    if (g.b2b.length) bad.push(nom + " reçoit un back-to-back : " + JSON.stringify(g.b2b));
  }
  return { ok: bad.length === 0, detail: bad.join(" ; ") || "5 profils exclus, 0 back-to-back — la population de la méthode est celle de ses sources" };
});

test("E5", "buildPlan REFUSE une entrée invalide, avec un refus typé et réparable", "pass", () => {
  const bad = [];
  const mutants = [
    ["format inconnu", { format: "ultra" }],
    ["age null", { age: "zéro" }],
    ["vol_max absent", { vol_max: undefined }],
    ["sessions_max texte", { sessions_max: "beaucoup" }],
    ["niveau renommé", { level: "expert" }],
  ];
  for (const [nom, over] of mutants) {
    let refus = null;
    try { E.buildPlan("run", { ...profile("run"), ...over }); }
    catch (e) { refus = e; }
    if (!refus) { bad.push(`${nom}: aucun refus (plan produit sur une entrée fausse)`); continue; }
    if (refus.code !== "ENTREE_INVALIDE") { bad.push(`${nom}: refus non typé (${String(refus.message).slice(0, 40)})`); continue; }
    if (!refus.key || !refus.expected || !refus.human) bad.push(`${nom}: refus typé mais incomplet (clé/attendu/message)`);
  }
  // Les entrées TOLÉRABLES doivent, elles, continuer de passer : un refus trop large est
  // aussi un défaut. `injury` absent ou en tableau est un état d'app légitime.
  for (const [nom, over] of [["injury absent", { injury: undefined }], ["injury en tableau", { injury: ["aucune"] }]]) {
    try { E.buildPlan("run", { ...profile("run"), ...over }); }
    catch (e) { bad.push(`${nom}: refusé à tort (${String(e.message).slice(0, 40)})`); }
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

// C13e — L'INVARIANT DUR, sur les six sports et dans les deux unités. Le banc `build()` couvre
// tri/run/bike/swim ; le trail et le duathlon passent par leurs propres fabriques de profils.
test("F6", "C13e : jamais d'échauffement plus long que le corps de séance", "pass", () => {
  const bad = [];
  const scan = (p, tag) => sessionsOf(p).forEach(({ s, w }) => {
    const st = s.steps || [];
    const wu = st.find((x) => x.role === "warmup");
    if (!wu) return;
    const body = st.filter((x) => x.role === "body").reduce((t, x) => t + (x._min || 0), 0);
    if ((wu._min || 0) > body + 0.01)
      bad.push(`${tag} S${w.num} ${s.name} : éch ${(wu._min || 0).toFixed(1)} > corps ${body.toFixed(1)}`);
  });
  for (const sport of Object.keys(FORMATS))
    for (const format of FORMATS[sport])
      for (const level of ["debutant", "inter", "avance"])
        for (const vol of ["4", "10", "16"])
          scan(build(sport, { format, level, vol_max: vol }), `${sport}/${format}/${level}/${vol}h`);
  for (const level of ["debutant", "inter", "avance"])
    for (const vol of ["4", "10", "16"])
      scan(buildTrail({ level, vol_max: vol }), `trail/${level}/${vol}h`);
  return { ok: bad.length === 0, detail: `${bad.length} séance(s) : ${bad.slice(0, 3).join(" ; ")}` };
});

// C13c s'énonce « 10 min, SAUF si le corps est plus court » (C13e prime — cf. F6). Le test
// mesure donc la règle telle qu'elle est, pas telle qu'on l'a d'abord formulée.
test("F4", "C13c : aucun échauffement chiffré sous 10 min (sauf corps plus court)", "pass", () => {
  const bad = [];
  for (const sport of Object.keys(FORMATS))
    for (const format of FORMATS[sport])
      for (const vol of ["4", "10", "16"])
        sessionsOf(build(sport, { format, vol_max: vol })).forEach(({ s, w }) => {
          const st = s.steps || [];
          const wu = st.find((x) => x.role === "warmup" && x.durationMin != null);
          if (!wu) return;
          // Le corps se mesure en TRAVAIL, récup exclue — même lecture que C13e (le banc
          // d'invariants a tranché : 10 min d'échauffement devant 6 min de travail déséquilibre
          // la séance, quel que soit le temps passé debout entre les répétitions).
          const body = st.filter((x) => x.role === "body")
            .reduce((t, x) => t + (x.durationMin ? (x.reps || 1) * x.durationMin : Math.max(0, (x._min || 0) - ((x.reps || 1) > 1 ? ((x.reps || 1) - 1) * (x.recoveryMin || 0) : 0))), 0);
          const seuil = Math.min(10, body);
          if ((wu._min ?? wu.durationMin) < seuil - 0.5)
            bad.push(`${sport}/${format} S${w.num} ${s.name} : ${wu._min}min (corps ${body.toFixed(0)})`);
        });
  return { ok: bad.length === 0, detail: `${bad.length} séance(s) : ${bad.slice(0, 3).join(" ; ")}` };
});

// C13d ne gouverne que les doses exprimées en MINUTES : en bassin, la dose minimale est tenue
// par C24/C15 (mètres), et un 8×50 m VO2 ne pèse que 7,7 min de « corps » sans être sous-dosé
// pour autant. Le garde-fou mesure donc exactement ce que la règle promet — ni plus, ni moins.
test("F5", "C13d : aucune séance de qualité EN TEMPS sous 8 min de dose", "pass", () => {
  const QZ = /\.(vo2|thr|ss|css|speed|rp|frc|mara)$/;
  const bad = [];
  for (const sport of Object.keys(FORMATS))
    for (const format of FORMATS[sport])
      for (const vol of ["4", "10", "16"])
        sessionsOf(build(sport, { format, vol_max: vol })).forEach(({ s, w }) => {
          const st = s.steps || [];
          const bodies = st.filter((x) => x.role === "body");
          if (!bodies.some((x) => QZ.test(x.zone || "")) || bodies.some((x) => x.gradient || x.leg || x.distanceM != null)) return;
          const body = bodies.reduce((t, x) => t + (x._min || 0), 0);
          if (body < 8) bad.push(`${sport}/${format} S${w.num} ${s.name} : ${Math.round(body)}min de travail`);
        });
  return { ok: bad.length === 0, detail: `${bad.length} séance(s) : ${bad.slice(0, 3).join(" ; ")}` };
});

// F2 — LA CAUSE PRINCIPALE EST CORRIGÉE, IL RESTE UN RÉSIDU ASSUMÉ.
// Diagnostic du 30/07/2026 : le ratio corps/total plafonnait à ~43 % parce que `_min` ne
// comptait PAS la récupération entre répétitions. R5.6a l'a mise dans le `_min` du bloc qui la
// porte : une VO2 « 10min éch + 4×3min (récup 2min30) + 6min retour » vaut désormais 19,5 min de
// corps sur 35,5, soit 55 %. Mesure avant/après : 28 séances sous le seuil → **7**.
// Ce qui reste, après C13c (plancher d'échauffement à 10 min) et C13d (une séance de qualité
// sous-dosée est déclassée, plus rabotée) : SEPT séances de sweetspot de 10 à 14 min de travail,
// précédées des 10 minutes d'échauffement que le projet vient d'ériger en règle de sécurité.
// Atteindre 45 % y demanderait précisément ce que C13c interdit — raccourcir l'échauffement.
// Les deux règles se contredisent sur ces sept séances ; la priorité n°2 du manifeste (prévention
// des blessures) tranche. La dette est conservée sciemment, et le test la garde sous les yeux.
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

// ── R23.18 — le double objectif A/A− ────────────────────────────────
// Décision du fondateur (06/08/2026) : la course déclarée est l'objectif A, l'intermédiaire
// peut être un A− — un VRAI objectif, à 4 semaines minimum de l'A. La « taille » d'un format
// se lit dans MIN_WEEKS (la table existante, R11.1) : un A− plus long que l'A coûte une
// fenêtre +7 j et un jour de récupération de plus. Sous la fenêtre : traitement dégradé en B,
// AVEC une décision nommée — la course reste à sa date (O-17 : informer, pas bloquer).
const _r2318 = (raceOffset, over) => {
  const p = build("run", Object.assign({ format: "marathon", race_date: isoIn(16 * 7), plan_start: undefined,
    races: "oui", race1_date: isoIn(16 * 7 - raceOffset), race1_prio: "A-" }, over || {}));
  const dec = (p._v2 && p._v2.decisions || []).filter((d) => /^R23\.18/.test(d.id));
  let day = null;
  p.weeks.forEach((w) => w.days.forEach((d) => d.sessions.forEach((sx) => {
    if (sx.race && !/Course A$/.test((sx.name || "").trim())) day = { w, sx };
  })));
  const all = p.weeks.flatMap((w) => w.days);
  const idx = all.findIndex((d) => day && d.sessions.includes(day.sx));
  let repos = 0;
  for (let k = idx + 1; k < all.length && idx >= 0; k++) {
    if (all[k].sessions.some((sx) => /Repos post-course/.test(sx.name))) repos++; else break;
  }
  return { p, dec, day, repos };
};
// DETTE DÉCLARÉE (O-111, 25/08/2026) — `expect: "fail"`, et le défaut est PRÉEXISTANT.
// Ce critère exige que le `det` de la course A− porte « POUR DE VRAI ». Il ne le porte plus :
// un re-rendu aval (`renderSess`) RÉÉCRIT le `det` de la séance de course à partir de ses steps
// et de sa `note` — livré : « 36min — 💡 Course A- placée à sa vraie date… », le texte écrit à
// la main est perdu. **Vérifié PRÉEXISTANT par expérience à facteur unique** : la même fixture
// en `dispo: "semaine"` perd déjà le texte sur le moteur d'AVANT le retrait du cycle. Ce test
// était vert par ACCIDENT DE COUVERTURE — la fixture de base du banc active `dispo:
// quotidienne` + `shift_ok: oui`, donc il tournait sous le cycle de 10 jours, le seul régime
// où ce jour n'était pas re-rendu. Le défaut touche donc les profils 7 jours, c'est-à-dire
// aujourd'hui tout le monde. Correctif proposé au ticket : `renderSess` ne réécrit jamais le
// `det` d'une séance `race` — le code dit déjà deux lignes plus bas qu'une course « n'est pas
// une séance dosée, c'est un événement ». À passer à "pass" DANS LE COMMIT qui le corrige.
// O-111 FERMÉ (fiche 42, 01/09/2026) — `renderSess` ne réécrit plus le `det` d'une séance
// `race` : le texte d'auteur (« POUR DE VRAI… ») arrive désormais jusqu'à l'athlète, et ce
// critère redevient un garde-fou permanent (expect basculé DANS le commit du correctif).
test("R23.18-A", "A− à ≥4 semaines : vraie course A−, 2 jours de récup, décision nommée", "pass", () => {
  const r = _r2318(42, { race1_format: "semi" });
  const okNom = r.day && /Course A−/.test(r.day.sx.name);
  const okDet = r.day && /POUR DE VRAI/i.test(r.day.sx.det || "");
  const okDec = r.dec.some((d) => d.id === "R23.18");
  return { ok: !!(okNom && okDet && okDec && r.repos === 2),
    detail: `nom=${r.day && r.day.sx.name} · repos=${r.repos} · décisions=${r.dec.map((d) => d.id).join(",") || "aucune"}` };
});
test("R23.18-B", "A− à <4 semaines : dégradée en B, décision R23.18-fenetre (jamais un silence)", "pass", () => {
  const r = _r2318(14, { race1_format: "semi" });
  const okNom = r.day && /Course B/.test(r.day.sx.name);
  const okDec = r.dec.some((d) => d.id === "R23.18-fenetre");
  return { ok: !!(okNom && okDec), detail: `nom=${r.day && r.day.sx.name} · décisions=${r.dec.map((d) => d.id).join(",") || "aucune"}` };
});
test("R23.18-C", "A− d'un format PLUS LONG que l'A : acceptée, récupération élargie (3 jours)", "pass", () => {
  // marathon (16 sem requises) avec un A− « trail » (18) : plus long → 3 jours de repos après.
  const r = _r2318(42, { race1_format: "trail" });
  const okDec = r.dec.some((d) => d.id === "R23.18" && /plus long/.test(d.val));
  return { ok: !!(r.day && /Course A−/.test(r.day.sx.name) && okDec && r.repos === 3),
    detail: `nom=${r.day && r.day.sx.name} · repos=${r.repos} · ${r.dec.map((d) => d.val).join(" ; ") || "aucune décision"}` };
});
test("R23.18-D", "Le mini-affûtage A− MORD sur le livré : semaine A− ≤ 60 % de la précédente", "pass", () => {
  // NOTE D'INSTRUMENT — ma première écriture comparait wk.vol A− contre wk.vol B : elle est
  // restée VERTE avec le facteur cassé, parce que le point de convergence recalcule wk.vol
  // depuis les minutes livrées (201 min dans les trois états mesurés — facteur 0,6, 0,75, B).
  // La garantie vit donc au POINT FIXE, et on la mesure là où elle mord : une course en
  // MILIEU DE SEMAINE (mercredi), qui laisse assez de jours pleins pour dépasser 60 % sans
  // le bloc (mesuré : 69 % sans, 60 % avec).
  // ⚠ LA COURSE EST POSÉE UN MERCREDI, EXPLICITEMENT (`+ 2` sur un lundi d'origine). Elle
  // l'était par accident tant qu'`isoIn` partait de « maintenant » — et l'accident tombait un
  // jour sur sept sur un lundi, où la semaine qui précède l'A− vaut 86 min au lieu de 220-543
  // (O-104). Le mercredi est la fixture que ce critère DÉCRIT depuis son écriture ; la
  // rendre explicite ne déplace pas le poteau, elle cesse de le laisser bouger.
  const p = build("run", { format: "marathon", race_date: isoIn(16 * 7 + 2), vol_max: "10", vol_recent: "8",
    sessions_max: "6", dispo: "quotidienne", races: "oui", race1_date: isoIn(16 * 7 + 2 - 39), race1_prio: "A-", race1_format: "semi" });
  let wi = -1;
  p.weeks.forEach((w, k) => w.days.forEach((d) => d.sessions.forEach((sx) => { if (sx.race && !/Course A$/.test((sx.name || "").trim())) wi = k; })));
  if (wi < 1) return { ok: false, detail: "semaine A− introuvable" };
  const mins = (w) => w.days.reduce((t, d) => t + d.sessions.reduce((u, sx) => u + (sx.race ? 0 : sx.min || 0), 0), 0);
  const ratio = mins(p.weeks[wi]) / Math.max(1, mins(p.weeks[wi - 1]));
  return { ok: ratio <= 0.62, detail: `semaine A− ${mins(p.weeks[wi])} min · précédente ${mins(p.weeks[wi - 1])} min · ratio ${Math.round(ratio * 100)} % (cap 60 %)` };
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
