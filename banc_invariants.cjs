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
  // R11 — « 1500 » n'est pas une valeur du domaine `format` en nage (sprint/demifond/fond/ow) :
  // le contrat d'entrée refuse la saisie, et le banc ne testerait rien. Troisième banc externe
  // à porter cette faute ; c'est le contrat d'entrée qui la révèle à chaque fois.
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
      if (md > mp * 1.0) ko("I1", ctx, `dev ${Math.round(md)}min > peak ${Math.round(mp)}min (+${Math.round(100*(md/mp-1))}%)`);
    }
    // I2 — l'affûtage reste sous le pic
    const tap = byPhase("taper");
    if (tap.length && peak.length) {
      const mt = Math.max(...tap.map((x) => x.min)), mnp = Math.min(...peak.map((x) => x.min));
      if (mt >= mnp) ko("I2", ctx, `affûtage ${Math.round(mt)}min ≥ plus petite semaine de pic ${Math.round(mnp)}min`);
    }
    // I3 — une semaine de récup est plus légère que la semaine de charge qui la précède
    for (let i = 1; i < W.length; i++)
      if (W[i].w.isRecup && !W[i-1].w.isRecup && W[i].min >= W[i-1].min)
        ko("I3", ctx, `sem ${W[i].w.num} (récup) ${Math.round(W[i].min)}min ≥ sem ${W[i-1].w.num} ${Math.round(W[i-1].min)}min`);
    // I4 — pas de bond de plus de 35 % entre deux semaines de charge
    for (let i = 1; i < W.length; i++) {
      if (W[i].w.isRecup || W[i-1].w.isRecup || !W[i-1].min) continue;
      const j = W[i].min / W[i-1].min;
      if (j > 1.35) ko("I4", ctx, `sem ${W[i-1].w.num}→${W[i].w.num} : +${Math.round(100*(j-1))}%`);
    }
    for (const { w, n, min } of W) {
      // I5 — l'échauffement ne dépasse jamais le corps de séance
      for (const s of sessionsOf(w)) {
        const { wu, body } = warmBody(s);
        if (wu > 0 && body > 0 && wu > body)
          ko("I5", ctx, `sem ${w.num} « ${s.name} » échauffement ${Math.round(wu)}min > corps ${Math.round(body)}min`);
        // I6 — pas de séance vide
        if (!(s.min > 0)) ko("I6", ctx, `sem ${w.num} « ${s.name} » durée nulle`);
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
      // I8 — le nombre de séances respecte le plafond déclaré
      if (n > Number(env.a.sessions_max)) ko("I8", ctx, `sem ${w.num} : ${n} séances > plafond ${env.a.sessions_max}`);
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
        // « la plus longue de sa semaine, DANS SA DISCIPLINE » — c'est l'énoncé de l'invariant.
        // Sans le filtre par discipline, la sortie longue à pied d'un triathlon est comparée à
        // la sortie longue à VÉLO, qui est légitimement plus longue : 138 faux positifs sur les
        // seuls sports multi-disciplines. On teste l'invariant tel qu'il est écrit.
        if (/longue/i.test(s.name)) {
          const mx = Math.max(...sessionsOf(w).filter((y) => y.d === s.d && !y.brick).map((y) => y.min || 0));
          if ((s.min || 0) < mx * 0.85) ko("I14", ctx, `sem ${w.num} « ${s.name} » ${s.min}min alors que la plus longue de la semaine fait ${mx}min`);
        }
      }
      // I12 — la sortie longue ne dépasse pas la moitié du volume de la semaine
      const longest = Math.max(0, ...sessionsOf(w).map((s) => s.min || 0));
      if (min > 0 && n >= 4 && longest / min > 0.6)
        ko("I12", ctx, `sem ${w.num} : sortie longue ${longest}min = ${Math.round(100*longest/min)}% du volume (${n} séances)`);
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
  I13:"monotonie du niveau",
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
