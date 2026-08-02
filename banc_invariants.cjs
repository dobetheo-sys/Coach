// banc_invariants.js — invariants structurels du plan.
// Doctrine : un invariant se teste, une règle se négocie. Tout ce qui est ici doit être vrai
// pour TOUT plan, quel que soit le sport, le niveau ou l'enveloppe. Un échec = un défaut,
// pas un arbitrage.

"use strict";
/* Chargement portable du moteur (même contrat que `audit_v7.cjs` / `audit_amont.cjs`) :
 *   ENGINE=/chemin/engine.js  ou  STANDALONE=/chemin/EnduraBuild-standalone.html */
const fs = require("fs"), path = require("path");
(function loadEngine() {
  globalThis.window = globalThis;
  const direct = process.env.ENGINE || path.join(__dirname, "endurabuild/js/engine.js");
  if (fs.existsSync(direct)) { require(direct); return; }
  const html = process.env.STANDALONE || path.join(__dirname, "EnduraBuild-standalone.html");
  if (!fs.existsSync(html)) throw new Error("moteur introuvable : renseigne ENGINE= ou STANDALONE=");
  const src = fs.readFileSync(html, "utf8");
  const m = /<script type="application\/json" id="ebModules">\s*([\s\S]*?)\s*<\/script>/.exec(src);
  const raw = JSON.parse(m[1]);
  const key = Object.keys(raw).find((k) => /engine\.js$/.test(k));
  const tmp = path.join(require("os").tmpdir(), "eb_engine_" + process.pid + ".js");
  fs.writeFileSync(tmp, Buffer.from(raw[key], "base64").toString("utf8")); require(tmp); fs.unlinkSync(tmp);
})();
const E = globalThis.EBV2;
if (!E) throw new Error("globalThis.EBV2 absent après chargement du moteur");

const BASE = { intent:"competition", history:"confirme", injury:"aucune", dispo:"partielle",
  doubles:"parfois", off_days:"non", sleep:"moyen", life_load:"normale", age:"38", weight:"79",
  sex:"H", race_date:"2027-06-13", weight_lever:"non" };
const SPORTS = {
  run:{format:"marathon",terrain:"route",treadmill:"non",pace_known:"oui",pace:"4:50"},
  bike:{format:"cyclo",terrain:"plat",ftp_known:"oui",ftp:"227"},
  swim:{format:"fond",milieu:"bassin",swim_limit:"technique",css_known:"non"},
  tri:{format:"70.3",ftp_known:"oui",ftp:"227",pace_known:"oui",pace:"4:50",css_known:"non"},
  duathlon:{format:"M",terrain:"plat",ftp_known:"oui",ftp:"227",pace_known:"oui",pace:"4:50"},
  trail:{race_distance_km:"45",race_dplus_m:"2200",race_technicity:"mixte",race_night:"non",
         train_dplus_access:"collines",poles:"oui",vam_known:"non",pace_known:"oui",pace:"4:50"},
};
const ENV = [
  { lbl:"petite",  a:{ sessions_max:"3", vol_max:"4",  vol_recent:"1"  } },
  { lbl:"moyenne", a:{ sessions_max:"7", vol_max:"10", vol_recent:"5"  } },
  { lbl:"grosse",  a:{ sessions_max:"12",vol_max:"16", vol_recent:"10" } },
];
const LEVELS = ["debutant", "inter", "avance"];
const QUALITY = /seuil|vo2|intervalle|fractionn|tempo|sweetspot|côte|cote|allure spéc|spécifique|pma/i;

const fails = [];
function ko(id, ctx, msg) { fails.push({ id, ctx, msg }); }

// Sous ce seuil, une seule séance représente une fraction majeure de la semaine :
// les ratios mesurent la granularité, pas la charge. Les invariants de volume y sont suspendus.
const GRAIN_MIN = 60;

function sessionsOf(w) {
  const out = [];
  for (const d of w.days) for (const s of d.sessions) if (s.d !== "rs") out.push(s);
  return out;
}
function minutesOf(w) { return sessionsOf(w).reduce((a, s) => a + (s.min || 0), 0); }
function warmBody(s) {
  let wu = 0, body = 0;
  for (const st of (s.steps || [])) {
    const m = (st.durationMin || 0) * (st.reps || 1);
    if (st.role === "warmup") wu += m; else if (st.role === "body") body += m;
  }
  return { wu, body };
}
function recMin(t) {
  if (!t) return 0;
  let m = String(t).match(/(\d+)(?:-(\d+))?\s*min(\d{2})?/);
  if (m) return ((+m[1]) + (m[2] ? +m[2] : +m[1])) / 2 + (m[3] ? +m[3] / 60 : 0);
  m = String(t).match(/(\d+)(?:-(\d+))?\s*s\b/);
  if (m) return ((+m[1]) + (m[2] ? +m[2] : +m[1])) / 2 / 60;
  return 0;
}

for (const [sp, extra] of Object.entries(SPORTS)) {
  for (const env of ENV) for (const lv of LEVELS) {
    const ctx = `${sp}/${env.lbl}/${lv}`;
    let p; try { p = E.buildPlan(sp, { ...BASE, ...extra, ...env.a, level: lv }); }
    catch (e) { ko("I0", ctx, "génération impossible : " + e.message); continue; }

    const W = p.weeks.map((w) => ({ w, min: minutesOf(w), n: sessionsOf(w).length }));
    const byPhase = (id) => W.filter((x) => x.w.phase.id === id && !x.w.isRecup);

    // I1 — la phase de développement ne dépasse pas la phase de pic
    const dev = byPhase("dev"), peak = byPhase("peak");
    if (dev.length && peak.length) {
      const md = Math.max(...dev.map((x) => x.min)), mp = Math.max(...peak.map((x) => x.min));
      if (md > mp && md - mp > 10 && mp >= GRAIN_MIN) ko("I1", ctx, `dev ${Math.round(md)}min > peak ${Math.round(mp)}min (+${Math.round(100*(md/mp-1))}%)`);
    }
    // I2 — l'affûtage reste sous le pic
    const tap = byPhase("taper");
    if (tap.length && peak.length) {
      const mt = Math.max(...tap.map((x) => x.min)), mnp = Math.min(...peak.map((x) => x.min));
      if (mt >= mnp && mt - mnp > 10 && mnp >= GRAIN_MIN) ko("I2", ctx, `affûtage ${Math.round(mt)}min ≥ plus petite semaine de pic ${Math.round(mnp)}min`);
    }
    // I3 — une semaine de récup est plus légère que la semaine de charge qui la précède
    for (let i = 1; i < W.length; i++)
      if (W[i].w.isRecup && !W[i-1].w.isRecup && W[i].min >= W[i-1].min && W[i-1].min >= GRAIN_MIN)
        ko("I3", ctx, `sem ${W[i].w.num} (récup) ${Math.round(W[i].min)}min ≥ sem ${W[i-1].w.num} ${Math.round(W[i-1].min)}min`);
    // I19 (R18.4) — LA SPÉCIFICITÉ MULTISPORT NE DISPARAÎT PAS DE L'AFFÛTAGE.
    // Mesuré avant correction sur les 4 formats de tri et les 4 de duathlon, tous niveaux :
    // le dernier enchaînement vélo↔course tombait TROIS SEMAINES avant le jour J, parce que
    // le créneau `durLong` retombait en affûtage dans la branche générique. La transition est
    // une compétence : elle se perd, et elle ne se rattrape pas le matin de la course.
    // L'invariant ne demande pas UNE séance précise, il demande que le dernier enchaînement
    // ne soit pas plus vieux que l'affûtage lui-même.
    if (sp === "tri" || sp === "duathlon") {
      const derniereAvecBrick = Math.max(0, ...W.filter((x) => sessionsOf(x.w).some((s) => s.brick)).map((x) => x.w.num));
      // Deux semaines, pas « la longueur de l'affûtage » : la première écriture tolérait
      // `max(2, nbSemainesDAffûtage)`, et sur l'horizon de ce banc l'affûtage fait trois
      // semaines — le critère passait donc AUSSI sur le moteur d'avant R18, celui qui portait
      // le défaut. Un critère calibré sur ce qu'on observe ne mesure rien.
      const ecart = p.weeks.length - derniereAvecBrick;
      if (!derniereAvecBrick) ko("I19", ctx, "aucun enchaînement (brick) dans tout le plan");
      else if (ecart > 2) ko("I19", ctx, `dernier enchaînement en S${derniereAvecBrick}, course en S${p.weeks.length} : ${ecart} semaines sans transition avant le jour J`);
    }

    // I20 (R18.5) — LA CADENCE DE RÉCUPÉRATION CONNAÎT LES PHASES.
    // Mesuré avant correction sur 240 plans : 75 % portaient une décharge DANS la phase pic
    // (plafonnée à 5 semaines par R13.6 — on en perdait une fraction entière) et 75 %
    // ouvraient une phase sur une décharge. Deux propriétés ici, et la seconde domine la
    // première : aucune règle de placement n'a le droit de faire dépasser à l'athlète sa
    // propre cadence de récupération. C'est l'ordre du manifeste — santé, puis progression.
    //
    // HONNÊTETÉ DE CETTE GARDE : sur les 54 configurations de ce banc (toutes en historique
    // « confirme », une seule date de course), I20 était DÉJÀ vert contre le moteur d'avant
    // R18 — le défaut y était invisible. C'est `bench_r18.cjs` qui discrimine, en balayant
    // trois historiques et huit horizons. I20 est ici parce que c'est sa place doctrinale,
    // pas parce que ce banc suffirait à le prouver.
    {
      for (let i = 1; i < W.length; i++) {
        const cur = W[i].w, prev = W[i - 1].w;
        if (cur.isRecup && cur.phase.id !== prev.phase.id && cur.phase.id !== "taper")
          ko("I20", ctx, `sem ${cur.num} : la phase « ${cur.phase.id} » s'ouvre sur une semaine de récupération`);
      }
      // La décharge collée à l'affûtage et la décharge dans un pic court sont vérifiées par
      // `bench_r18.cjs`, PAS ici : sur certains gabarits (cadence 3 + pic de 2 semaines) le
      // moteur cède délibérément le placement pour ne pas dépasser la cadence, et le critère
      // n'est juste qu'accompagné de la démonstration de cet arbitrage. Un invariant de ce
      // banc doit être vrai SANS exception — l'écrire ici sans son arbitrage serait poser une
      // règle qu'on saurait fausse.
      // Jamais plus de semaines de charge consécutives que la cadence de l'athlète.
      // `confirme`/`ancien` = 4, `reprise` = 3 (RECUP_EVERY) ; un master resserre encore, on
      // prend donc la borne la plus large que ce banc puisse rencontrer avec son BASE.
      const cadence = BASE.history === "reprise" ? 3 : 4;
      let suite = 0;
      for (const x of W) {
        if (x.w.isRecup || x.w.phase.id === "taper") { suite = 0; continue; }
        suite++;
        if (suite > cadence) { ko("I20", ctx, `sem ${x.w.num} : ${suite} semaines de charge d'affilée, cadence déclarée ${cadence}`); break; }
      }
    }

    // I4 — pas de bond de plus de 35 % entre deux semaines de charge
    for (let i = 1; i < W.length; i++) {
      if (W[i].w.isRecup || W[i-1].w.isRecup || !W[i-1].min) continue;
      const j = W[i].min / W[i-1].min;
      if (j > 1.35 && W[i].min - W[i-1].min > 20 && W[i-1].min >= GRAIN_MIN) ko("I4", ctx, `sem ${W[i-1].w.num}→${W[i].w.num} : +${Math.round(100*(j-1))}%`);
    }
    for (const { w, n, min } of W) {
      // I5 — l'échauffement ne dépasse jamais le corps de séance
      for (const s of sessionsOf(w)) {
        const { wu, body } = warmBody(s);
        if (wu > 0 && body > 0 && wu > body)
          ko("I5", ctx, `sem ${w.num} « ${s.name} » échauffement ${Math.round(wu)}min > corps ${Math.round(body)}min`);
        // I6 — pas de séance vide. R20.6 : LA COURSE OBJECTIF EST EXCLUE, et c'est l'invariant
        // qui était périmé, pas le moteur. Depuis R13.4, le jour J porte `min: 0` PAR
        // CONCEPTION — c'est ce qui l'empêche d'être la victime des passes de coupe et ce qui
        // fait que la charge de la semaine ne compte pas la course comme un entraînement. Le
        // banc, lui, réclamait une durée. 54 « échecs » qui disaient tous la même chose : un
        // contrat livré, qu'aucune règle ne contredit, et que ce check ne connaissait pas.
        // Même exclusion que celle déjà posée sur I14 (`!/🏁/`), pour la même raison.
        if (!(s.min > 0) && !/🏁/.test(s.name || "")) ko("I6", ctx, `sem ${w.num} « ${s.name} » durée nulle`);
        // I7 — la somme des steps rend compte de la durée annoncée de la séance
        if ((s.steps || []).length && s.min > 15) {
          let acc = 0;
          for (const st of s.steps) {
            const reps = st.reps || 1;
            acc += (st._min != null ? st._min : (st.durationMin || 0) * reps);
            if (reps > 1) acc += recMin(st.recoveryText) * (reps - 1);
          }
          if (acc > 0 && acc < s.min * 0.90)
            ko("I7", ctx, `sem ${w.num} « ${s.name} » : ${s.min}min annoncées, ${Math.round(acc)}min comptabilisées (${Math.round(100*acc/s.min)}%)`);
        }
      }
      // I8 — le nombre de séances respecte le plafond déclaré. R20.6 : MÊME FAMILLE QUE I6.
      // `sessions_max` est un budget d'ENTRAÎNEMENT — ce que l'athlète peut caser dans sa
      // semaine. La course objectif ne s'y range pas : elle a lieu, elle n'est pas une séance
      // qu'on décide de faire ou non, et l'en exclure est déjà ce que le moteur fait
      // (R15.7-A : `sessionsMaxDeclared` protège la fréquence en semaine de course). 15
      // « échecs » qui étaient tous la semaine du jour J, sur les 7 sports.
      const nHorsCourse = sessionsOf(w).filter((s) => !/🏁/.test(s.name || "")).length;
      if (nHorsCourse > Number(env.a.sessions_max)) ko("I8", ctx, `sem ${w.num} : ${nHorsCourse} séances > plafond ${env.a.sessions_max}`);
      // I9 — le volume hebdo respecte l'enveloppe déclarée
      if (min / 60 > Number(env.a.vol_max) * 1.05)
        ko("I9", ctx, `sem ${w.num} : ${(min/60).toFixed(1)}h > enveloppe ${env.a.vol_max}h`);
      // I10 — volume annoncé et volume réel concordent
      if (w.vol_declared && w.vol_real && Math.abs(w.vol_declared - w.vol_real) / w.vol_declared > 0.10)
        ko("I10", ctx, `sem ${w.num} : annoncé ${w.vol_declared} vs réel ${w.vol_real}`);
      // I11 — le nom de la séance ne contredit pas sa dose
      for (const s of sessionsOf(w)) {
        if (/r[ée]cup|courte/i.test(s.name) && s.min > 60)
          ko("I11", ctx, `sem ${w.num} « ${s.name} » dure ${s.min}min`);
        if (/longue/i.test(s.name)) {
          // Une COURSE n'est pas une séance d'entraînement : elle a lieu, et le banc la traite
          // déjà à part (I15/I17). La comparer au rang des sorties longues ferait échouer
          // l'invariant sur toute semaine contenant une course — 15 faux positifs mesurés.
          const mx = Math.max(...sessionsOf(w).filter((y) => y.d === s.d && !/🏁/.test(y.name || "")).map((y) => y.min || 0));
          if ((s.min || 0) < mx * 0.85) ko("I14", ctx, `sem ${w.num} « ${s.name} » ${s.min}min alors que la plus longue de la semaine fait ${mx}min`);
        }
      }
      // I12 — la sortie longue ne dépasse pas la moitié du volume de la semaine.
      //
      // R20.6 — DEUX EXCLUSIONS, MESURÉES. Les 3 échecs restants étaient TOUS la SEMAINE DE
      // COURSE d'un trail à petite enveloppe : « Endurance allégée (semaine de course) » 54 min
      // sur un total de 80 (plus le jour J à 0). Il n'y a pas de sortie longue dans cette
      // semaine — `longest` y désigne simplement la plus grosse de trois séances minuscules,
      // et la dominance qu'on mesure est celle d'une structure d'affûtage voulue (R13.4 /
      // R15.7-A), pas d'un déséquilibre de charge.
      //   · les semaines de DÉCHARGE (récup, affûtage) sortent du champ — comme dans toutes les
      //     règles de volume de ce dépôt ;
      //   · la course ne compte pas dans le nombre de séances (même raison qu'en I6 et I8).
      // Vérifié après exclusion : plus aucune semaine de CHARGE ne dépasse le seuil.
      if (w.isRecup || w.phase.id === "taper") continue;
      const nEntrainement = sessionsOf(w).filter((s) => !/🏁/.test(s.name || "")).length;
      const longest = Math.max(0, ...sessionsOf(w).map((s) => s.min || 0));
      if (min > 0 && nEntrainement >= 4 && longest / min > 0.6)
        ko("I12", ctx, `sem ${w.num} : sortie longue ${longest}min = ${Math.round(100*longest/min)}% du volume (${nEntrainement} séances)`);
    }
  }
  // I15/I16/I17 — les courses : présence au calendrier, veille allégée, jour J exclusif
  {
    const withRace = { ...BASE, ...extra, ...ENV[1].a, level:"inter",
      races:"oui", race1_date:"2027-03-14", race1_prio:"A" };
    const p = E.buildPlan(sp, withRace);
    const ctx = `${sp}/courses`;
    const dayOf = (iso) => { for (const w of p.weeks) for (const d of w.days) if (d.date === iso) return d; return null; };
    const isRace = (x) => /🏁/.test(x.name || "");
    // I15 — la course objectif figure comme séance
    const objectif = dayOf(BASE.race_date);
    if (objectif && !objectif.sessions.some(isRace))
      ko("I15", ctx, `jour de la course objectif (${BASE.race_date}) : aucune séance de course — ` +
        (objectif.sessions.filter((x) => x.d !== "rs").map((x) => x.name + " " + x.min + "min").join(" + ") || "repos"));
    // I16 — la veille d'une course, rien de long
    for (const iso of [BASE.race_date, "2027-03-14"]) {
      const veille = dayOf(new Date(new Date(iso + "T12:00:00Z").getTime() - 864e5).toISOString().slice(0, 10));
      if (!veille) continue;
      const mx = Math.max(0, ...veille.sessions.filter((x) => x.d !== "rs" && !isRace(x)).map((x) => x.min || 0));
      if (mx > 60) ko("I16", ctx, `veille de la course du ${iso} : séance de ${mx}min`);
    }
    // I17 — le jour d'une course, aucune autre séance
    const jourJ = dayOf("2027-03-14");
    if (jourJ) {
      const autres = jourJ.sessions.filter((x) => x.d !== "rs" && !isRace(x));
      if (autres.length) ko("I17", ctx, `jour de course intermédiaire : ${autres.map((x) => x.name).join(", ")} en plus`);
    }
    // I18 (N2) — LE PLAN S'ARRÊTE LE JOUR DE LA COURSE, quel que soit le JOUR de la semaine.
    // La dernière semaine était la semaine calendaire de l'objectif : elle courait jusqu'au
    // dimanche. Une course un mercredi laissait quatre jours de « Repos post-course », une
    // course un lundi en laissait six. Le jour de la semaine est LA variable du défaut : un
    // seul cas testé (un dimanche) le rendait invisible. Les sept sont testés.
    for (const iso of ["2027-06-07", "2027-06-08", "2027-06-09", "2027-06-10", "2027-06-11", "2027-06-12", "2027-06-13"]) {
      const p2 = E.buildPlan(sp, { ...BASE, ...extra, ...ENV[1].a, level: "inter", race_date: iso });
      const derniere = p2.weeks[p2.weeks.length - 1];
      const apres = derniere.days.filter((d) => d.date && d.date > iso);
      if (apres.length) ko("I18", `${sp}/course ${iso}`, `${apres.length} jour(s) au plan APRÈS l'objectif (${apres.map((d) => d.date).join(", ")})`);
      const dernier = derniere.days[derniere.days.length - 1];
      if (!dernier || !dernier.sessions.some(isRace))
        ko("I18", `${sp}/course ${iso}`, `le dernier jour du plan (${dernier ? dernier.date : "—"}) n'est pas la course`);
    }
    // I21 (C28) — LES TROIS JOURS QUI PRÉCÈDENT LA COURSE SONT PLAFONNÉS, ET ÇA TIENT
    // JUSQU'À LA SORTIE. Les plafonds existaient depuis N3/N4 (J-1 ≤ 25 min, J-2/J-3 ≤ 62),
    // mais cette passe tourne pendant la construction : le plancher de semaine de course les
    // regonflait ensuite. Mesuré avant le correctif — **156 min à J-2 d'un marathon, 168 à
    // J-2 d'une cyclosportive**, et la veille elle-même à 36 min alors que R13.4 la borne à 25.
    //
    // Le JOUR DE LA SEMAINE est la variable du défaut, comme pour I18 : une course le dimanche
    // laisse six jours pour porter le plancher et ne montre rien. Les sept sont testés.
    for (const iso of ["2027-06-07", "2027-06-08", "2027-06-09", "2027-06-10", "2027-06-11", "2027-06-12", "2027-06-13"]) {
      const p3 = E.buildPlan(sp, { ...BASE, ...extra, ...ENV[1].a, level: "inter", race_date: iso });
      const jours = p3.weeks.flatMap((w) => w.days);
      const ix = jours.findIndex((d) => d.sessions.some(isRace));
      if (ix < 1) continue;
      for (let k = 1; k <= 3; k++) {
        const d = jours[ix - k];
        if (!d) continue;
        const min = d.sessions.reduce((t, x) => t + (isRace(x) ? 0 : x.min || 0), 0);
        // Tolérance de 1 min : les durées rendues sont arrondies à la minute entière (F3).
        const cap = (k === 1 ? 25 : 63) + 1;
        if (min > cap)
          ko("I21", `${sp}/course ${iso}`, `J-${k} porte ${min} min (plafond ${cap - 1}) — ` +
            d.sessions.filter((x) => !isRace(x) && (x.min || 0) > 0).map((x) => x.name + " " + x.min + "'").join(", "));
      }
    }
  }

  // I13 — monotonie du niveau déclaré : plus l'athlète est fort, plus la charge est élevée
  const byLevel = LEVELS.map((lv) => {
    const p = E.buildPlan(sp, { ...BASE, ...extra, ...ENV[1].a, level: lv });
    return Math.max(...p.weeks.map((w) => minutesOf(w)));
  });
  if (!(byLevel[0] <= byLevel[1] && byLevel[1] <= byLevel[2]))
    ko("I13", `${sp}/moyenne`, `pic hebdo non monotone : débutant ${Math.round(byLevel[0])} → inter ${Math.round(byLevel[1])} → avancé ${Math.round(byLevel[2])} min`);
}

const NAMES = {
  I0:"génération", I1:"dev ≤ peak", I2:"affûtage < peak", I3:"récup < charge précédente",
  I4:"saut hebdo ≤ 35 %", I5:"échauffement ≤ corps", I6:"séance non vide",
  I7:"durée comptabilisée", I8:"plafond de séances", I9:"enveloppe de volume",
  I10:"annoncé = réel", I11:"le nom colle à la dose", I12:"sortie longue ≤ 60 %", I14:"la sortie longue est la plus longue",
  I13:"monotonie du niveau", I15:"la course est au calendrier", I16:"veille de course allégée", I17:"jour J exclusif",
  I18:"le plan s'arrête le jour J",
  I19:"la transition survit à l'affûtage", I20:"la récup connaît les phases",
  I21:"les 3 jours avant la course sont plafonnés",
};
const G = {};
for (const f of fails) (G[f.id] ||= []).push(f);
console.log(`54 configurations testées (6 sports × 3 enveloppes × 3 niveaux)\n`);
for (const id of Object.keys(NAMES)) {
  const n = G[id] ? G[id].length : 0;
  console.log(`${n ? "✗" : "✓"} ${id.padEnd(4)} ${NAMES[id].padEnd(34)} ${n ? n + " échecs" : ""}`);
}
for (const id of Object.keys(NAMES)) {
  if (!G[id]) continue;
  console.log(`\n=== ${id} · ${NAMES[id]} — ${G[id].length} échecs ===`);
  const seen = new Set();
  for (const f of G[id]) {
    const k = f.ctx.split("/")[0] + f.msg.replace(/\d+/g, "#");
    if (seen.has(k) && seen.size > 2) continue; seen.add(k);
    console.log(`  ${f.ctx.padEnd(24)} ${f.msg}`);
    if (seen.size >= 8) { console.log(`  … et ${G[id].length - 8} autres`); break; }
  }
}

/* ---- R20.6 — LE BANC GARDE, IL NE SE CONTENTE PLUS DE RAPPORTER ------------------------- */
//
// O-9 : ce banc sortait en code 0 quoi qu'il trouve. Il a donc porté QUATRE familles d'échecs
// pendant que `CLAUDE.md` annonçait « vert sur ses 19 tests » — et personne ne l'a vu, parce
// qu'un rapport que rien ne lit vaut zéro. C'est la forme la plus coûteuse de dette : elle ne
// se signale pas, et elle rend fausse la documentation qui la cite.
//
// Les 20 invariants sont verts (I6/I8/I12 étaient PÉRIMÉS — la course objectif n'est pas une
// séance d'entraînement ; I14 était un VRAI défaut, corrigé côté moteur). Le banc bloque donc
// désormais, et il entre en CI : à partir d'ici, un invariant qui casse arrête la chaîne.
if (fails.length) {
  console.error(`\n✖ ${fails.length} échec(s) d'invariant sur ${Object.keys(NAMES).length} règles.`);
  console.error("Un invariant est une propriété que le plan tient TOUJOURS. S'il casse, c'est le moteur qu'on corrige — ou l'invariant qu'on démontre périmé, avec sa mesure.");
  process.exit(1);
}
console.log("\n✓ les " + Object.keys(NAMES).length + " invariants tiennent sur les 54 configurations.");
