// banc_sensibilite.cjs — chaque réponse du questionnaire doit changer le plan. Sinon on ment à
// l'athlète (banc externe R11.8).
//
// CRITÈRE DE SORTIE : toute clé listée dans ATTENDU doit avoir au moins une valeur qui modifie
// l'empreinte du plan (volumes, noms de séances, zones, placement des jours). Une clé inerte
// fait échouer le banc — c'est ce qui empêche B10 (`cycle_sync`) et B11 (`dispo`) de revenir.
// Les SATURATIONS assumées (`sleep=bon`, `life_load=legere` : les valeurs hautes n'ajoutent
// rien à la valeur normale) ne sont pas des défauts et ne sont pas comptées.
"use strict";
/* Chargement portable du moteur (même contrat que `audit_v7.cjs`) :
 *   ENGINE=/chemin/engine.js  ou  STANDALONE=/chemin/EnduraBuild-standalone.html
 * Par défaut : le bundle de la PWA de ce dépôt. */
const fs = require("fs"), path = require("path");
(function loadEngine() {
  globalThis.window = globalThis;
  const direct = process.env.ENGINE || path.join(__dirname, "endurabuild/js/engine.js");
  if (fs.existsSync(direct)) { require(direct); return; }
  const html = process.env.STANDALONE || path.join(__dirname, "EnduraBuild-standalone.html");
  if (!fs.existsSync(html)) throw new Error("moteur introuvable : renseigne ENGINE= ou STANDALONE=");
  const src = fs.readFileSync(html, "utf8");
  const m = /<script type="application\/json" id="ebModules">\s*([\s\S]*?)\s*<\/script>/.exec(src);
  if (!m) throw new Error("bloc #ebModules absent de " + html);
  const raw = JSON.parse(m[1]);
  const key = Object.keys(raw).find((k) => /engine\.js$/.test(k));
  const code = Buffer.from(raw[key], "base64").toString("utf8");
  const tmp = path.join(require("os").tmpdir(), "eb_engine_" + process.pid + ".js");
  fs.writeFileSync(tmp, code); require(tmp); fs.unlinkSync(tmp);
})();
const E = globalThis.EBV2;
if (!E) throw new Error("globalThis.EBV2 absent après chargement du moteur");

function fp(p){const names=new Map(),zones=new Map(),slots=new Map();let mins=0;
 for(const w of p.weeks)for(const d of w.days){const dow=new Date(d.date+"T12:00:00").getDay();
   for(const s of d.sessions){if(s.d==="rs")continue;names.set(s.name,(names.get(s.name)||0)+1);mins+=s.min||0;
     slots.set(dow+"/"+s.d,(slots.get(dow+"/"+s.d)||0)+1);
     for(const st of (s.steps||[]))if(st.zone)zones.set(st.zone,(zones.get(st.zone)||0)+1);}}
 const j=m=>[...m.entries()].sort().map(x=>x.join(":")).join("|");
 // R18.2 — LE TEXTE DU JOUR J FAIT PARTIE DU PLAN. L'empreinte ne lisait que la structure
 // (volumes, noms, zones, créneaux) : une réponse qui change les temps prescrits pour la
 // course — donc ce que l'athlète va réellement exécuter — passait pour « sans effet ».
 // C'est le cas des trois profils par discipline : ils ne déplacent aucune séance, ils
 // changent le pacing du seul jour qui compte.
 let raceDet="";
 for(const w of p.weeks)for(const d of w.days)for(const s of d.sessions)if(s.race)raceDet+=String(s.det||"");
 return {use10:!!p.use10,peak:p.volPeak,weeks:p.totalWeeks,mins:Math.round(mins),names:j(names),zones:j(zones),slots:j(slots),raceDet};}
const diff=(a,b)=>["use10","peak","weeks","mins","names","zones","slots","raceDet"].filter(k=>a[k]!==b[k]);
// Les deux dates du cycle sont indispensables à la périodisation : sans elles, la question
// serait de nouveau une case à cocher sans effet (c'est exactement le défaut B10).
const ATTENDU=["sleep","life_load","dispo","level","history","cycle_sync","age","weight_lever","off_days",
 // R18.2 — les trois profils par discipline : ils pilotent le pacing du jour J, leg par leg.
 "leg_swim_env","leg_bike_prof","leg_run_prof"];
const REF={intent:"competition",level:"inter",history:"confirme",injury:"aucune",sessions_max:"9",vol_max:"13",
 vol_recent:"7",dispo:"partielle",doubles:"parfois",off_days:"non",sleep:"moyen",life_load:"normale",age:"30",
 weight:"79",sex:"H",race_date:"2027-06-13",weight_lever:"non",format:"Full",ftp_known:"oui",ftp:"227",
 pace_known:"oui",pace:"4:50",css_known:"non"};
const base=fp(E.buildPlan("tri",REF));
const T=[
 ["sleep=court",{sleep:"court"}],["sleep=bon",{sleep:"bon"}],
 ["life_load=lourde",{life_load:"lourde"}],["life_load=legere",{life_load:"legere"}],
 ["dispo=quotidienne",{dispo:"quotidienne"}],
 ["dispo=quotidienne + shift_ok=oui",{dispo:"quotidienne",shift_ok:"oui"}],
 ["dispo=quotidienne + shift_ok=non",{dispo:"quotidienne",shift_ok:"non"}],
 ["dispo=weekend",{dispo:"weekend"}],["dispo=semaine",{dispo:"semaine"}],
 ["level=avance",{level:"avance"}],["level=debutant",{level:"debutant"}],
 ["history=ancien",{history:"ancien"}],["history=reprise",{history:"reprise"}],
 ["sex=F",{sex:"F"}],// Date choisie pour que la fenêtre prémenstruelle NE tombe PAS sur les semaines de décharge :
 // avec un cycle de 28 jours et un plan démarrant un jour 1, les deux coïncident toutes les
 // quatre semaines et il n'y a alors rien à déplacer (comportement correct, mais qui ne teste
 // rien).
 ["sex=F + cycle_sync=oui",{sex:"F",cycle_sync:"oui",cycle_start:"2026-08-10",cycle_len:"30"}],
 ["age=18",{age:"18"}],["age=55",{age:"55"}],["age=70",{age:"70"}],
 ["weight_lever=oui",{weight_lever:"oui",weight:"85"}],
 ["off_days=oui (Lun+Ven)",{off_days:"oui",off_which:"Lun,Ven"}],
 // R18.2 — chaque leg SÉPARÉMENT : c'est l'indépendance qui est la propriété, pas l'effet.
 // Les tester ensemble aurait laissé passer un câblage où un seul des trois agit.
 // (Le milieu de nage est mesuré plus bas, en PAIRE : voir le commentaire là-bas.)
 ["leg_bike_prof=montagne",{leg_bike_prof:"montagne"}],
 ["leg_run_prof=plat",{leg_run_prof:"plat",terrain:"montagne"}],
];
const agit=new Set();
for(const [lbl,mut] of T){const a={...REF,...mut};let f;try{f=fp(E.buildPlan("tri",a));}catch(e){console.log(lbl.padEnd(34),"CRASH");continue;}
 const d=diff(base,f);console.log(lbl.padEnd(34), d.length?d.join("+"):"∅  AUCUN EFFET SUR LE PLAN", d.includes("peak")?`(pic ${base.peak}→${f.peak}h)`:"");
 if(d.length)for(const k of ATTENDU)if(lbl.startsWith(k+"=")||lbl.startsWith(k+" ")||lbl.includes(k))agit.add(k);}
// R18.2 — LE MILIEU DE NAGE SE MESURE EN PAIRE, et il faut le dire.
// La référence de ce banc déclare `css_known:"non"` — délibérément, pour exercer le chemin
// « aucune référence connue ». Or sans CSS, aucun leg natation n'est prédit : ajouter le CSS
// dans la variante aurait fait bouger le plan pour une AUTRE raison que celle mesurée, et le
// critère serait devenu vert sans rien prouver. On compare donc deux profils qui ne diffèrent
// QUE par le milieu de nage, tous deux avec CSS.
{
 const avecCss={...REF,css_known:"oui",css:"2:00"};
 const a=fp(E.buildPlan("tri",avecCss));
 const b=fp(E.buildPlan("tri",{...avecCss,leg_swim_env:"eau_vive"}));
 const d=diff(a,b);
 console.log("leg_swim_env=eau_vive".padEnd(34), d.length?d.join("+"):"∅  AUCUN EFFET SUR LE PLAN", "(à CSS identique)");
 if(d.length)agit.add("leg_swim_env");
}
const inertes=ATTENDU.filter(k=>!agit.has(k));
if(inertes.length){
  console.error("\n\u2716 clé(s) INERTE(S) : "+inertes.join(", "));
  console.error("Une question posée à l'athlète doit agir sur son plan, ou disparaître du questionnaire.");
  process.exit(1);
}
console.log("\n\u2713 toutes les réponses attendues agissent sur le plan.");
