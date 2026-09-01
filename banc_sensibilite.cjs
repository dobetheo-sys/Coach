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
const { courseDans, courseUn } = require("./bench-dates.cjs"); // A-6 — voir bench-dates.cjs
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
 // R20.1 — LE TEXTE RENDU FAIT PARTIE DU PLAN. L'empreinte ne lisait que la structure : une
 // réponse qui change les WATTS, l'ALLURE ou la FC prescrits — c'est-à-dire ce que l'athlète
 // exécute réellement — passait pour « sans effet ». C'est le cas de `hr_max`, de la FTP, de
 // toutes les références : elles ne déplacent aucune séance, elles changent chaque chiffre
 // à l'intérieur. On hache le détail rendu de toutes les séances, pas seulement de la course.
 let det=0;
 for(const w of p.weeks)for(const d of w.days)for(const s of d.sessions){
   const t=String(s.det||"")+"|"+String(s.name||"");
   for(let i=0;i<t.length;i++){det=(det*31+t.charCodeAt(i))>>>0;}}
 return {use10:!!p.use10,peak:p.volPeak,weeks:p.totalWeeks,mins:Math.round(mins),names:j(names),zones:j(zones),slots:j(slots),raceDet,det};}
const diff=(a,b)=>["use10","peak","weeks","mins","names","zones","slots","raceDet","det"].filter(k=>a[k]!==b[k]);
// Les deux dates du cycle sont indispensables à la périodisation : sans elles, la question
// serait de nouveau une case à cocher sans effet (c'est exactement le défaut B10).
const ATTENDU=["sleep","life_load","dispo","level","history","cycle_sync","age","weight_lever","off_days",
 // R18.2 — les trois profils par discipline : ils pilotent le pacing du jour J, leg par leg.
 "leg_swim_env","leg_bike_prof","leg_run_prof"];
const REF={intent:"competition",level:"inter",history:"confirme",injury:"aucune",sessions_max:"9",vol_max:"13",
 vol_recent:"7",dispo:"partielle",doubles:"parfois",off_days:"non",sleep:"moyen",life_load:"normale",age:"30",
 weight:"79",sex:"H",race_date:courseDans(45),weight_lever:"non",format:"Full",ftp_known:"oui",ftp:"227",
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
 ["sex=F + cycle_sync=oui",{sex:"F",cycle_sync:"oui",cycle_start:courseUn(2, 1),cycle_len:"30"}],
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

/* ============================================================================================
   R20.1 — LA GARDE DÉRIVÉE DU SCHÉMA : toute clé déclarée agit dans CHAQUE sport où elle
   est déclarée.
   ============================================================================================
   Ce qui précède est une liste ÉCRITE À LA MAIN, sur UN sport. Elle a une valeur propre (elle
   teste des combinaisons qu'un balayage automatique ne trouverait pas : `sex=F + cycle_sync`,
   `dispo + shift_ok`), mais elle a un angle mort structurel : elle ne couvre que ce dont on
   s'est souvenu, dans le sport où on l'a écrit.

   C'est exactement par là que R19.1 est passé. `leg_swim_env` et `leg_run_prof` agissaient en
   triathlon — le sport où le code avait été écrit — et ne faisaient RIEN en swimrun, alors que
   la question y était posée. La garde E2E vérifiait que le champ EXISTE, jamais qu'il AGIT.

   Ce balayage-ci est dérivé d'`ANSWER_SCHEMA` : pour chaque sport, pour chaque clé que le
   schéma déclare applicable à ce sport, il fabrique une valeur différente et exige que le plan
   change. Aucune liste à maintenir — une clé ajoutée au schéma est testée le jour même.

   Les EXEMPTIONS sont nommées une par une avec leur raison, jamais par silence : une clé qui
   n'agit pas sur le plan est soit un défaut, soit une décision assumée, et les deux se disent.
============================================================================================ */
const EXEMPT = {
  // ---- Ce n'est pas une réponse de l'athlète ----
  sport: true, // la clé qui choisit le plan
  format: true, // change de plan par définition — le tester reviendrait à tester que 2 ≠ 3
  race_date: true, // change la LONGUEUR du plan, couvert par R11.4 et N2
  plan_start: true, // ancre calendaire posée par l'app à la première génération, jamais saisie
  // ---- CONDITIONNELLES : elles ne valent qu'en PAIRE, et la paire est testée ----
  // Les tester seules ne mesure rien : `off_days:"oui"` sans `off_which` ne bloque aucun jour,
  // et c'est le comportement CORRECT. La liste curée ci-dessus teste les paires.
  off_which: true, off_days: true, shift_ok: true,
  cycle_start: true, cycle_len: true, cycle_sync: true,
  sex: true, // seul, il sature (mesuré dans la liste curée) ; c'est `sex=F + cycle_sync` qui agit
  vam_known: true, vam: true, // la VAM ne vaut que déclarée ENSEMBLE — paire testée plus bas
  climb_dplus_m: true, climb_min: true, // R12.1 : la VAM se déduit des DEUX, jamais d'un seul
  team_swim_gap_sec: true, // ne vaut qu'en binôme — paire testée plus bas
  treadmill: true, // substitut de montée : ne vaut que si le terrain est PLAT — paire testée plus bas
  doubles: true, // ne vaut que là où une seconde séance existe (multisport) — testé en tri ci-dessus
  // ---- PAR CONCEPTION : elles ne pilotent pas le plan, et c'est écrit ailleurs ----
  training_structure: true, // R14.1 — entrée de la PROJECTION : change ce qu'on ANNONCE, aucune séance
  weight_target: true, // R14.1 §5 — produit une SENSIBILITÉ affichée (frontière du manifeste)
  weight: true, height: true, // N8/N9 — estimation de dépense, jamais une séance (`activity` retirée du schéma, fiche 44)
  race_cutoff_h: true, // avertissement de barrière horaire dans la PRÉDICTION
  hr_max: true, // repli quand la référence principale manque : avec FTP/allure connues, elle ne sert pas
  gear_test: true, // ne vaut que si des allures EN TENUE ont été saisies — paire testée plus bas
  // D3 — B-17 : `longest_swim_known: "oui"` sans le NOMBRE ne dit rien, et `milieu` ne pèse que
  // sur la conversion du gate de continuité (surcharge eau libre) : seul, il ne mord que si la
  // déclaration est à la frontière. Les DEUX paires sont testées plus bas — et c'est le seul
  // traitement honnête, parce que `milieu` en tri n'a jamais été une clé qui pilote le volume.
  longest_swim_known: true, milieu: true,
};

/**
 * DETTE DOCUMENTÉE, pas exemption silencieuse. Une clé ici est INERTE et on le sait : elle
 * porte son entrée de registre et sa mesure. Le banc l'affiche à chaque exécution — c'est la
 * différence entre une dette et un oubli. Vider cette table est un objectif, pas une option.
 */
// R20.7 — TABLE VIDE, ET C'EST LE BUT. `swim/vol_recent` y figurait (O-13 : la rampe R10 ne
// mordait jamais en natation, erreur d'unité). Le défaut est corrigé, l'entrée est retirée :
// une dette qui reste déclarée après sa correction est un mensonge de plus, dans l'autre sens.
// La table reste, parce que la prochaine dette doit avoir où se déclarer — avec sa raison.
const DETTE = {};

const REF_SPORT = {
  run: { format: "marathon", terrain: "route", pace_known: "oui", pace: "4:50" },
  bike: { format: "cyclo", terrain: "plat", ftp_known: "oui", ftp: "230" },
  swim: { format: "fond", milieu: "bassin", css_known: "oui", css: "2:00" },
  tri: { format: "70.3", ftp_known: "oui", ftp: "230", pace_known: "oui", pace: "4:50", css_known: "oui", css: "2:00" },
  duathlon: { format: "M", terrain: "plat", ftp_known: "oui", ftp: "230", pace_known: "oui", pace: "4:50" },
  trail: { race_distance_km: "45", race_dplus_m: "2200", race_technicity: "mixte", race_night: "non",
           train_dplus_access: "collines", poles: "oui", pace_known: "oui", pace: "4:50" },
  swimrun: { format: "series", swim_total_m: "2000", run_total_km: "12", segments_n: "10", longest_swim_m: "600",
             water_temp_c: "18", team_mode: "solo", openwater_access: "saisonnier", swim_continuous: "oui",
             run_continuous: "oui", gear_test: "oui", css_known: "oui", css: "2:00", pace_known: "oui", pace: "4:50" },
};
const COMMUN = { intent: "competition", level: "inter", history: "confirme", injury: "aucune", dispo: "partielle",
  doubles: "parfois", off_days: "non", sleep: "moyen", life_load: "normale", sex: "H",
  age: "35", weight: "78", height: "180", vol_max: "10", vol_recent: "7", sessions_max: "6",
  med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "non", shift_ok: "non",
  race_date: (() => { const d = new Date(Date.now() + 40 * 7 * 864e5); d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7)); return d.toISOString().slice(0, 10); })() };

/** Valeurs candidates pour une clé — on en essaie plusieurs : la première peut être refusée
 *  (un mineur sur un Ironman, une température hors saison…) et un refus n'est pas une inertie. */
function candidats(cle, spec, actuelle) {
  const cur = String(actuelle ?? "");
  if (spec.type === "enum" || spec.type === "csv") return (spec.domain || []).filter((v) => v !== cur);
  if (spec.type === "number") {
    const lo = spec.min ?? 0, hi = spec.max ?? 100;
    const n = parseFloat(cur);
    const cands = [lo + (hi - lo) * 0.25, lo + (hi - lo) * 0.75, lo, hi].map((x) => Math.round(x * 10) / 10);
    return cands.filter((x) => !isFinite(n) || Math.abs(x - n) > 1e-6).map(String);
  }
  return [];
}

const SPORTS_ALL = ["run", "bike", "swim", "tri", "duathlon", "trail", "swimrun"];
const SCHEMA = E.answerSchema || {};
const inertesDerives = [];
const nonTestables = [];
const dettes = [];
let testees = 0;
console.log("\n── R20.1 — balayage DÉRIVÉ DU SCHÉMA : chaque clé, dans chaque sport où elle est déclarée ──");
for (const sp of SPORTS_ALL) {
  const ref = { ...COMMUN, ...REF_SPORT[sp] };
  let base;
  try { base = fp(E.buildPlan(sp, ref)); }
  catch (e) { console.error("  ✖ " + sp + " : profil de référence REFUSÉ (" + (e.human || e.message).slice(0, 80) + ")"); process.exitCode = 1; continue; }
  const cles = Object.keys(SCHEMA).filter((k) => {
    const sc = SCHEMA[k];
    if (EXEMPT[k]) return false;
    return !sc.sports || sc.sports.includes(sp);
  });
  const inertesSp = [];
  for (const cle of cles) {
    let agi = false, refuse = 0;
    for (const v of candidats(cle, SCHEMA[cle], ref[cle]).slice(0, 4)) {
      let f;
      try { f = fp(E.buildPlan(sp, { ...ref, [cle]: v })); }
      catch (e) { refuse++; continue; }
      if (diff(base, f).length) { agi = true; break; }
    }
    testees++;
    if (agi) continue;
    if (refuse && refuse === Math.min(4, candidats(cle, SCHEMA[cle], ref[cle]).length)) { nonTestables.push(sp + "/" + cle); continue; }
    if (DETTE[sp + "/" + cle]) { dettes.push(sp + "/" + cle); continue; }
    inertesSp.push(cle);
  }
  console.log("  " + sp.padEnd(10) + cles.length + " clés déclarées · "
    + (inertesSp.length ? "✖ INERTES : " + inertesSp.join(", ") : "✔ toutes agissent"));
  for (const c of inertesSp) inertesDerives.push(sp + "/" + c);
}
console.log("  " + testees + " couples (sport × clé) mesurés · " + nonTestables.length + " non testables (toutes les valeurs refusées par la validation)");
if (dettes.length) { console.log("  DETTE CONNUE (inerte, documentée, non bloquante) :"); for (const d of dettes) console.log("    · " + d + " — " + DETTE[d]); }

/* ---- Les PAIRES : une clé conditionnelle ne se mesure qu'avec sa compagne ---------------- */
// Chaque exemption « conditionnelle » ci-dessus doit avoir sa paire ICI, sinon l'exemption
// devient une porte de sortie silencieuse — exactement ce que ce banc existe pour empêcher.
const PAIRES = [
  ["trail", "VAM déclarée", { vam_known: "oui", vam: "1400" }],
  ["trail", "montée vécue (R12.1)", { climb_dplus_m: "800", climb_min: "75" }],
  ["trail", "tapis quand le terrain est PLAT", { train_dplus_access: "plat", treadmill: "oui" }],
  ["swimrun", "écart de nage en binôme", { team_mode: "binome", team_swim_gap_sec: "20" }],
  ["swimrun", "test en tenue NON fait, allures saisies", { swimrun_swim_pace: "2:30", swimrun_run_pace: "6:30", gear_test: "non" }],
  // D3 — la continuité DÉCLARÉE change le plan (paliers prescrits, et le format si l'écart ne se
  // referme pas dans le temps disponible).
  ["tri", "continuité de nage déclarée (B-17)", { longest_swim_known: "oui", longest_swim_m: "300" }],
  // …et le MILIEU change la conversion du gate : une continuité prouvée en EAU LIBRE n'a pas à
  // payer la surcharge du facteur `TRI_SWIM`. Mesuré à la frontière, là où la surcharge décide.
  ["tri", "milieu de la preuve de continuité (B-17)", { longest_swim_known: "oui", longest_swim_m: "1450", milieu: "ow" }],
];
const pairesKo = [];
for (const [sp, lbl, mut] of PAIRES) {
  const ref = { ...COMMUN, ...REF_SPORT[sp] };
  let a, b;
  try { a = fp(E.buildPlan(sp, ref)); b = fp(E.buildPlan(sp, { ...ref, ...mut })); }
  catch (e) { pairesKo.push(sp + "/" + lbl + " : REFUS — " + (e.human || e.message).slice(0, 60)); continue; }
  const d = diff(a, b);
  console.log("  paire " + (sp + " · " + lbl).padEnd(38) + (d.length ? "✔ agit (" + d.join("+") + ")" : "✖ INERTE"));
  if (!d.length) pairesKo.push(sp + "/" + lbl);
}

/* ---- R20.2 — LE LEVIER PROPOSÉ DOIT EXISTER -------------------------------------------- */
// Quand `vol_max` n'est pas atteint et que c'est la STRUCTURE de la semaine qui borne, le
// moteur propose les doubles séances — mais SEULEMENT dans les sports où le garde
// `doublesAddVolume` est déclaré. Une proposition qui ne changerait rien serait pire qu'un
// silence : elle enverrait l'athlète modifier une réponse pour rien, et il n'aurait aucun
// moyen de savoir que le moteur s'est trompé.
//
// Le garde est donc MESURÉ, dans les deux sens : déclaré ⟺ le pic monte réellement. C'est la
// leçon R12 appliquée à un drapeau de module — une déclaration que rien ne vérifie finit par
// décrire le code d'hier. Profil calibré pour que le nombre de séances soit le limiteur :
// plafonds larges (vol_max haut, historique ancien, disponibilité quotidienne).
const SEUIL_LEVIER = 1.05; // +5 % de pic : en dessous, ce n'est pas un levier, c'est du bruit
const levierKo = [];
for (const sp of SPORTS_ALL) {
  const ref = { ...COMMUN, ...REF_SPORT[sp], vol_max: "14", sessions_max: "7", history: "ancien",
    level: "avance", dispo: "quotidienne" };
  let sans, avec;
  try {
    sans = E.buildPlan(sp, { ...ref, doubles: "non" }).volPeak;
    avec = E.buildPlan(sp, { ...ref, doubles: "oui" }).volPeak;
  } catch (e) { levierKo.push(sp + " : profil REFUSÉ — " + (e.human || e.message).slice(0, 60)); continue; }
  const monte = sans > 0 && avec / sans >= SEUIL_LEVIER;
  const declare = !!(E.sports?.[sp]?.guards || {}).doublesAddVolume;
  const ok = monte === declare;
  console.log("  levier doubles " + sp.padEnd(10) + (declare ? "déclaré" : "non déclaré").padEnd(12)
    + "· pic " + sans.toFixed(1) + "h → " + avec.toFixed(1) + "h  " + (ok ? "✔" : "✖ la déclaration ne dit pas la mesure"));
  if (!ok) levierKo.push(sp + " : " + (declare ? "déclaré mais le pic ne monte pas" : "non déclaré alors que le pic monte de "
    + Math.round((avec / sans - 1) * 100) + " %"));
}

if(levierKo.length){
  console.error("\n✖ garde `doublesAddVolume` : " + levierKo.join(" · "));
  console.error("Le moteur ne doit JAMAIS proposer un levier qui ne bouge rien (R20.2). Corriger la déclaration du module, ou le module.");
  process.exit(1);
}
if(inertes.length||inertesDerives.length||pairesKo.length){
  if(pairesKo.length) console.error("\n\u2716 paire(s) conditionnelle(s) INERTE(S) : "+pairesKo.join(", "));
  if(inertes.length) console.error("\n\u2716 clé(s) INERTE(S) dans la liste curée : "+inertes.join(", "));
  if(inertesDerives.length) console.error("\n\u2716 clé(s) INERTE(S) au balayage dérivé : "+inertesDerives.join(", "));
  console.error("Une question posée à l'athlète doit agir sur son plan, ou être exemptée avec sa raison dans EXEMPT.");
  process.exit(1);
}
console.log("\n\u2713 toutes les réponses attendues agissent sur le plan, dans tous les sports où elles sont posées.");
