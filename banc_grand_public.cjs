// banc_grand_public.js — le chemin de l'athlète qui ne connaît AUCUNE de ses références.
// Règle : une séance sans repère exécutable est inexécutable. Un repère = un chiffre
// (allure, watts, bpm), une échelle d'effort (RPE, x/10) ou une consigne de sensation
// explicite (souple, contrôlé, conversation, cadence). « Très souple » sur une récup est
// un repère légitime : le banc ne doit pas le compter comme un défaut.
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


const CUE = /\d+['’]\d{2}\s*\/\s*(km|100m)|\d{2,4}\s*W\b|\d{2,3}\s*-\s*\d{2,3}\s*bpm|RPE|\d\/10|souple|contrôl|conversation|rpm|ressenti|facile|relâch|@\s*allure|@\s*effort|marche|progressif|réguli|endurance/i;

const B = { intent:"finir", history:"reprise", injury:"aucune", sessions_max:"5", vol_max:"7", vol_recent:"3",
  dispo:"partielle", doubles:"non", off_days:"non", sleep:"moyen", life_load:"normale", age:"38", weight:"82",
  sex:"H", race_date:"2027-04-11", weight_lever:"non",
  ftp_known:"non", pace_known:"non", css_known:"non", vam_known:"non" };
const SPORTS = {
  run:{format:"semi",terrain:"route",treadmill:"non"}, bike:{format:"cyclo",terrain:"plat"},
  // `format: "1500"` n'existe pas dans le domaine du sport (R11 le refuse désormais) : le
  // 1500 m EST une épreuve de fond. Même correction que sur le banc amont.
  swim:{format:"fond",milieu:"bassin",swim_limit:"technique"}, tri:{format:"70.3"},
  duathlon:{format:"M",terrain:"plat"},
  trail:{race_distance_km:"45",race_dplus_m:"2200",race_technicity:"mixte",race_night:"non",
         train_dplus_access:"collines",poles:"oui"},
};

console.log("=== A · séances exécutables sans aucune référence connue ===");
console.log("sport      niveau     séances  muettes  exemples");
let fail = 0;
for (const [sp, extra] of Object.entries(SPORTS)) {
  for (const lv of ["debutant", "inter", "avance"]) {
    const p = E.buildPlan(sp, { ...B, ...extra, level: lv });
    let n = 0, mute = 0; const ex = [];
    for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions) {
      if (s.d === "rs") continue; n++;
      if (!CUE.test(s.det || "")) { mute++; if (ex.length < 2 && !ex.includes(s.name)) ex.push(s.name); }
    }
    if (mute) fail++;
    console.log(`${sp.padEnd(10)} ${lv.padEnd(10)} ${String(n).padStart(4)}   ${String(mute).padStart(5)}   ${ex.join(" · ")}`);
  }
}
console.log(fail ? `\n⚠ ${fail} configurations produisent des séances sans repère` : "\n✓ aucune séance muette");

console.log("\n=== B · ce qu'un ADJECTIF auto-déclaré pilote encore, à références inconnues ===");
// B1 — l'estimation de course. C'était le défaut : sur un 45 km / 2 200 m, le seul changement
// de « niveau » faisait varier le chrono estimé de TROIS HEURES. Un adjectif n'a pas le droit
// de piloter un chrono : cible 0 %.
// B2 — la sortie la plus longue. On compare `inter` et `avance` SEULEMENT : l'écart du débutant
// est un plafond de SÉCURITÉ nommé (C23 : sortie longue ≤ 180 min ; natation : un débutant ne
// tient pas une longue continue). Compter une règle de sécurité comme un défaut ferait supprimer
// la règle — c'est l'inverse du but.
let bFail = 0;
for (const [sp, extra] of Object.entries(SPORTS)) {
  const longs = [], mids = [];
  for (const lv of ["debutant", "inter", "avance"]) {
    const p = E.buildPlan(sp, { ...B, ...extra, level: lv });
    let long = 0;
    for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions) { if (s.d==="rs") continue; if ((s.min||0) > long) long = s.min; }
    longs.push(long);
    mids.push(sp === "trail" ? Math.round(E.trailObjective({ ...B, ...extra, level: lv }).raceMinMid) : 0);
  }
  const ampLong = Math.round(100 * (Math.max(longs[1], longs[2]) - Math.min(longs[1], longs[2])) / Math.min(longs[1], longs[2]));
  const ampMid = mids[0] ? Math.round(100 * (Math.max(...mids) - Math.min(...mids)) / Math.min(...mids)) : 0;
  if (ampLong > 15 || ampMid > 0) bFail++;
  console.log(`${sp.padEnd(10)} longue ${longs.map(x=>x+"min").join(" → ")}  |  inter↔avancé ${String(ampLong).padStart(3)}%${ampLong>15?" ⚠":""}`
    + (mids[0] ? `  |  estimation de course ${mids.map(x=>Math.floor(x/60)+"h"+String(x%60).padStart(2,"0")).join(" → ")} (${ampMid}%${ampMid>0?" ⚠":""})` : ""));
}
console.log(bFail ? `\n⚠ ${bFail} sport(s) dont le plan repose encore sur l'adjectif « niveau »` : "\n✓ le niveau ne pilote plus aucune grandeur numérique (hors plafonds de sécurité nommés)");

console.log("\n=== D · nature des questions (R12.6 : répondable sans test ?) ===");
// vécue = répondable de mémoire par tout le monde · mesurée = demande un test ou une montre
// · estimée = auto-déclarée, invérifiable. Une question ESTIMÉE n'a pas le droit de piloter une
// grandeur numérique (c'est la section B qui le vérifie) ; une question MESURÉE doit avoir un
// repli qui dégrade ET un chemin d'acquisition dans l'outil (section C pour les 4 références).
const SCH = E.answerSchema || {};
const byNature = {};
for (const [k, spec] of Object.entries(SCH)) (byNature[spec.nature || "non classée"] ||= []).push(k);
for (const nat of ["vecue", "mesuree", "estimee", "non classée"])
  if (byNature[nat]) console.log(String(byNature[nat].length).padStart(3) + " " + nat.padEnd(12) + byNature[nat].slice(0, 8).join(", ") + (byNature[nat].length > 8 ? "…" : ""));
let dFail = 0;
if (byNature["non classée"]) { dFail = byNature["non classée"].length; console.log("\n⚠ questions non classées : " + byNature["non classée"].join(", ")); }

console.log("\n=== C · chaîne d'acquisition des références ===");
// Le tableau n'est plus écrit à la main : il est DÉRIVÉ du moteur. Un tableau statique qu'on
// met à jour soi-même ne garde rien — c'est un commentaire, pas un garde-fou.
const REFS = [
  ["allure seuil (course)", "run",   "thrPace", "zones FC + RPE"],
  ["FTP (vélo)",            "bike",  "ftp",     "zones FC + RPE"],
  ["CSS (natation)",        "swim",  "css",     "effort relatif"],
  ["VAM (trail)",           "trail", "vam",     "montée vécue, sinon repli prudent"],
];
const fitOK = new Set(E.fitDerivedTests || []);
const chain = REFS.map(([label, disc, type, repli]) => {
  const d = (E.disciplines || {})[disc] || {};
  const src = type === "vam" ? d.verticalSource : d.zonesSource;
  const declared = ((E.sports || {})[disc] || {}).retestTypes || [];
  const retest = src && src.protocol && declared.includes(type) ? "oui — " + String(src.test).slice(0, 34) : "NON";
  return [label, retest, fitOK.has(type) ? "oui — dérivée du FIT" : "NON", repli];
});
console.log("référence".padEnd(24) + "retest intégré".padEnd(30) + "import montre".padEnd(24) + "repli si inconnue");
for (const [a,b,c,d] of chain) console.log(a.padEnd(24) + b.padEnd(30) + c.padEnd(24) + d);
const devinee = chain.filter(([, r, i]) => r === "NON" || i === "NON");
if (devinee.length) console.log(`\n⚠ ${devinee.length} référence(s) au chemin d'acquisition incomplet : ${devinee.map(x=>x[0]).join(", ")}`);
else console.log("\n✓ toute référence a un chemin d'acquisition dans l'outil");

if (fail || bFail || devinee.length || dFail) {
  console.error("\n\u2716 le chemin sans références n'est pas tenu.");
  process.exit(1);
}
console.log("\n\u2713 banc grand public : aucune séance muette, aucun adjectif pilotant un chiffre, aucune référence orpheline.");
