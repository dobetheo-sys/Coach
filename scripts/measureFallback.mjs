/**
 * R15.3 / O-3 — LA MESURE QUI MANQUAIT : à quelle FRÉQUENCE le créneau facile de repli
 * (`easyFallbackSlot`) se déclenche-t-il réellement ?
 *
 * L'entrée O-3 du registre réclamait l'écart de contenu entre `facileR` et `facile2` pour le
 * trail. Le handoff R15.3 a repositionné la question, et il a raison : avant d'arbitrer QUEL
 * créneau sert de repli, il faut savoir COMBIEN de plans passent par là. Le critère de sortie
 * est chiffré d'avance, pour que le résultat décide et pas l'inverse :
 *
 *   < 5 %  → O-3 se ferme en « sans impact mesurable ». C'est une décision, pas un oubli.
 *   > 20 % → O-3 mérite son lot, avec mesure avant/après sur le golden.
 *   entre  → la zone grise : on publie le chiffre et on tranche avec lui sous les yeux.
 *
 * MÉTHODE — aucune instrumentation dans `src/`. Le repli est détecté POST-HOC en comparant le
 * plan émis au `weekSchema` que le module de sport déclare : un jour dont le créneau émis est
 * l'`easyFallbackSlot` alors que le schéma prévoyait un créneau de qualité (`dur1`, `dur2`,
 * `durLong`) EST un repli. Mesurer sans toucher au code mesuré est la seule façon d'être sûr
 * que la mesure ne déplace pas ce qu'elle observe (même principe que `npm run trace`).
 *
 * Usage : `node scripts/measureFallback.mjs [sport]` (défaut : trail ; « tous » balaie les 7).
 */
import { generateAudited } from "../src/generator/repairLoop.ts";
import { sportModule } from "../src/sports/registry.ts";
import { TrainingReasoningEngine } from "../src/engine/reasoningEngine.ts";
import "../src/generator/sessionLibrary.ts"; // enregistre les modules de sport
import { FORMATS_BY_SPORT } from "../src/engine/answerSchema.ts";

const QUALITY_SLOTS = new Set(["dur1", "dur2", "durLong"]);
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Les extras que chaque sport exige pour qu'un profil soit valide. */
const EXTRAS = {
  trail: { race_distance_km: "42", race_dplus_m: "2000", terrain: "vallonne", trail_access: "proche", poles: "oui", night: "non", technicity: "moyenne" },
  swimrun: { swim_total_m: "2000", run_total_km: "12", segments_n: "10", longest_swim_m: "600", water_temp_c: "18", team_mode: "solo", openwater_access: "saisonnier", swim_continuous: "oui", run_continuous: "oui", gear_test: "oui", css: "2:00" },
  tri: { css: "2:00", ftp: "230" },
  duathlon: { ftp: "230" },
  bike: { ftp: "230" },
  swim: { css: "2:00" },
};

function* profiles(sport) {
  // Le trail n'a PAS de format (sa catégorie d'effort est déduite des données, R7) : son
  // domaine est un tableau VIDE. Le lire tel quel produisait un balayage à zéro profil, et
  // donc un « 0 % » qui ressemblait à un résultat. Un balayage vide n'est pas une mesure.
  const dom = FORMATS_BY_SPORT[sport];
  const formats = Array.isArray(dom) && dom.length ? dom : [""];
  for (const format of formats)
    for (const level of ["debutant", "inter", "avance"])
      for (const history of ["reprise", "confirme", "ancien"])
        for (const vol_max of ["4", "8", "13"])
          for (const sessions_max of ["3", "5", "7"])
            for (const dispo of ["quotidienne", "semaine", "weekend", "partielle"]) {
              yield {
                sport, format, level, history, vol_max, sessions_max, dispo,
                intent: "finir", age: "35", sex: "H", pace: "5:00", vol_recent: "6",
                injury: "aucune", off_days: "non", doubles: "non",
                ...(EXTRAS[sport] || {}),
              };
            }
}

function measure(sport) {
  const mod = sportModule(sport);
  const fb = mod.easyFallbackSlot;
  // Tous les sports ne DÉCLARENT pas leur schéma hebdomadaire : certains prennent celui du
  // générateur. Sans schéma déclaré, il n'y a pas de « créneau prévu » à comparer, donc pas
  // de mesure possible ici — on le dit au lieu de rendre un zéro qui ressemble à un résultat.
  if (typeof mod.weekSchema !== "function") return { sport, fb, sansSchema: true };
  let plans = 0, plansAvecRepli = 0, jours = 0, joursReplies = 0, refus = 0, erreurs = 0, desordre = 0;
  const engine = new TrainingReasoningEngine();
  for (const a of profiles(sport)) {
    let plan, r;
    try {
      plan = generateAudited(a).plan;
      // `weekSchema` prend le raisonnement en 3e argument (le trail y lit sa catégorie
      // d'effort déduite) : on le rejoue à l'identique pour lire le schéma ATTENDU.
      r = engine.analyze(a);
    }
    catch (e) { if (e && e.code === "ENTREE_INVALIDE") refus++; else erreurs++; continue; }
    plans++;
    let vu = false;
    for (const w of plan.weeks) {
      const schema = mod.weekSchema(w.phase && w.phase.id, !!w.isRecup, r);
      jours += w.days.length;
      // La correspondance créneau-prévu ↔ jour-rendu se fait par POSITION. Elle n'est valide
      // que si les jours ne sont pas réordonnés : on le VÉRIFIE (les jours portent leur nom
      // canonique Lun→Dim), on ne le suppose pas. Une mesure dont l'hypothèse n'est pas
      // testée est une mesure qui peut mentir sans qu'on le sache.
      if (w.days.length === JOURS.length && w.days.some((d, i) => d.jour !== JOURS[i])) desordre++;
      w.days.forEach((d, i) => {
        const prevu = schema[i] && schema[i].slot;
        // Un repli = un créneau de QUALITÉ prévu, rendu sur le créneau facile de repli, et
        // qui porte encore une vraie séance. Un créneau prévu dur devenu `off` n'est pas un
        // repli : c'est le budget de séances, une autre passe, une autre décision.
        const porteSeance = (d.sessions || []).some((x) => x.d !== "rs");
        // R20.9 — LE DÉTECTEUR REGARDE CE QUE LE PLAN FAIT, PAS CE QUE LE MODULE DÉCLARE.
        //
        // Il testait `d.slot === easyFallbackSlot`. Son verdict dépendait donc de la VALEUR
        // déclarée par le module, pas du comportement mesuré : en changeant le repli du trail
        // de `facileR` à `facile2` (R20.9), le taux affiché est tombé de 25,0 % à **0,0 %** et
        // la ligne de verdict allait fermer O-3 sur ce chiffre. Vérifié en comptant sur
        // N'IMPORTE QUEL créneau facile : **25,0 % avant, 25,0 % après, 1 287 jours dans les
        // deux cas** — la fréquence n'avait pas bougé d'un jour, seule la séance produite avait
        // changé. Un instrument qui suit la déclaration au lieu du plan mesure la déclaration.
        const surCreneauFacile = /^facile/.test(String(d.slot || ""));
        if (surCreneauFacile && porteSeance && prevu && QUALITY_SLOTS.has(prevu)) { joursReplies++; vu = true; }
      });
    }
    if (vu) plansAvecRepli++;
  }
  return { sport, fb, plans, plansAvecRepli, jours, joursReplies, refus, erreurs, desordre };
}

const arg = process.argv[2] || "trail";
const sports = arg === "tous" ? ["run", "bike", "swim", "tri", "trail", "duathlon", "swimrun"] : [arg];

console.log("R15.3 — fréquence de déclenchement du créneau facile de repli\n");
console.log("sport      repli    plans   avec repli        jours   replies");
console.log("─".repeat(66));
let verdictTrail = null;
let vide = false;
let desordreGlobal = false;
for (const s of sports) {
  const r = measure(s);
  if (r.sansSchema) { console.log(s.padEnd(10) + String(r.fb).padEnd(9) + "    — (pas de weekSchema déclaré : non mesurable par cette méthode)"); continue; }
  const pctPlans = r.plans ? (r.plansAvecRepli / r.plans) * 100 : 0;
  const pctJours = r.jours ? (r.joursReplies / r.jours) * 100 : 0;
  console.log(
    s.padEnd(10) + String(r.fb).padEnd(9) + String(r.plans).padStart(6)
    + String(r.plansAvecRepli).padStart(9) + " (" + pctPlans.toFixed(1).padStart(5) + " %)"
    + String(r.jours).padStart(9) + String(r.joursReplies).padStart(7) + " (" + pctJours.toFixed(1) + " %)"
    + (r.refus ? "  · " + r.refus + " refus" : "") + (r.erreurs ? "  · ⚠ " + r.erreurs + " erreurs" : "")
  );
  if (r.desordre) {
    console.error("  ⚠ " + r.desordre + " semaine(s) aux jours RÉORDONNÉS : la correspondance par position ne tient plus, ce chiffre est faux.");
    desordreGlobal = true;
  }
  if (!r.plans) vide = true;
  if (s === "trail") verdictTrail = pctPlans;
}

if (desordreGlobal) {
  console.error("\n✖ L'hypothèse de la mesure (jours non réordonnés) est fausse quelque part : ne pas publier ce taux.");
  process.exit(1);
}
if (vide) {
  console.error("\n✖ Au moins un sport n'a produit AUCUN plan : le balayage est vide, pas propre.");
  process.exit(1);
}
if (verdictTrail !== null) {
  console.log("\n── Verdict O-3 (critère posé AVANT la mesure) ──");
  const v = verdictTrail;
  if (v < 5) console.log("  " + v.toFixed(1) + " % < 5 % → O-3 se FERME : « sans impact mesurable ». C'est une décision.");
  else if (v > 20) console.log("  " + v.toFixed(1) + " % > 20 % → O-3 mérite son LOT, avec mesure avant/après sur le golden.");
  else console.log("  " + v.toFixed(1) + " % — zone grise [5 %, 20 %] : le chiffre est publié, l'arbitrage se fait avec lui sous les yeux.");
}
