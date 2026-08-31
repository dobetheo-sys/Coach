/**
 * TrainingReasoningEngine — Sprint 1 V2.
 *
 * « Le moteur réfléchit avant de générer » (manifeste) : comprendre l'athlète →
 * l'objectif → les contraintes → calculer la charge. Chaque décision est un
 * {id, what, val, why} — le format d'evalRules promu au plan entier.
 * Les nombres viennent de la matrice de contraintes (provenance V1.5 validée).
 */
import type { AthleteProfile, Decision, Phase, ReasonedPlan } from "./types.ts";
import {
  MIN_WEEKS, HISTORY_CAPS, UTIL, MARGIN, RECUP_FACTORS, PHASE_PCTS,
  BANDS, C22_MAX_WEEKLY_GROWTH, RECUP_WEEK_FACTOR, RECUP_EVERY,
  TAPER_WEEKS_BY_FORMAT, TAPER_WEEKS_BY_TRAIL_CAT,
  BEGINNER_SWIM_VOLPEAK_CAP_H, C15_BEGINNER_SWIM_SESSION_CAP_M, swimTimeFactorOf, C20_BEGINNER_SWIM_H_PER_SESSION,
  MAX_RUN_DAYS, AVG_SESSION_H, R6_INJURY_LOAD_FACTORS, R6_AGE_LOAD, R6_PAIN_CONTRAINDICATION, readInjuries, boundedOrZero,
  parsePaceSec,
} from "./constraintMatrix.ts";
import { guard, knownSports, sportModule } from "../sports/registry.ts";
import { swimrunPrereqBlock } from "../sports/swimrun/index.ts";
import { continuityGate, palierLayout, poolOnlyNotice, swimSessionCapM } from "./swimContinuity.ts";
import { T1_DPLUS_CAPS, T4_LONG_RUN_VS_RACE, T6_MIN_WEEKS, TRAIL_HISTORY_CAPS, TRAIL_UTIL, trailObjective, trailWeeklyVertical } from "./trailModel.ts";

/** « 560 » → « 9h20 » — les durées de trail se lisent en heures, pas en minutes. */
function fmtH(min: number): string {
  const t = Math.round(min);   // arrondir AVANT de séparer (famille « 1'60 »)
  const h = Math.floor(t / 60), m = t % 60;
  return h > 0 ? h + "h" + String(m).padStart(2, "0") : m + "min";
}

/** Zones cardio (Karvonen si FC repos connue, sinon %FCmax) — port V1.5. */
function hrZones(age?: string, hrMax?: string, hrRest?: string) {
  // E3 (audit v6) — hors bornes physiologiques = non renseigné (repli formule d'âge)
  const boundedAge = boundedOrZero("age", parseInt(age || "") || 0) || 35;
  const fcMax = boundedOrZero("hrMax", parseInt(hrMax || "") || 0) || Math.round(208 - 0.7 * boundedAge);
  const rest = boundedOrZero("hrRest", parseInt(hrRest || "") || 0);
  const Z = (lo: number, hi: number) => {
    if (rest) return Math.round(rest + (fcMax - rest) * lo) + "-" + Math.round(rest + (fcMax - rest) * hi) + " bpm";
    return Math.round(fcMax * lo) + "-" + Math.round(fcMax * hi) + " bpm";
  };
  return { fcMax, z1: Z(0.6, 0.7), z2: Z(0.7, 0.8), tempo: Z(0.8, 0.87), seuil: Z(0.87, 0.92), vo2: Z(0.92, 0.97) };
}

export interface ReasoningResult {
  plan: ReasonedPlan;
}

export class TrainingReasoningEngine {
  analyze(aIn: AthleteProfile): ReasonedPlan {
    let a = aIn;
    const decisions: Decision[] = [];
    const warnings: string[] = [];
    const D = (id: string, what: string, val: string | number, why: string) => decisions.push({ id, what, val, why });
    // D3 — `fmt` EST UN `let`, ET C'ÉTAIT UN DÉFAUT LATENT DEPUIS R4.5. Il était capté une fois
    // sur `a.format` ; les deux rabattements (swimrun R4.5, tri B-17) réassignent `a` mais `fmt`
    // gardait l'ANCIEN format, et c'est lui que lit `MIN_WEEKS[sp]?.[fmt]`. Un Full rabattu au
    // sprint recevait donc une durée de préparation de Full — mesuré, c'est la signature exacte
    // que `audit:r13` remontait (`R13.6-P1 — Full 59 sem : taper=1 peak=5`, un plan de SPRINT sur
    // l'horizon d'un FULL). Il suit désormais chaque rabattement.
    const sp = a.sport;
    let fmt = a.format;
    const history = a.history || "confirme";
    const level = a.level || "inter";
    const beginner = level === "debutant";
    const finisher = a.intent === "finir";
    const comp = a.intent === "competition";

    // ---- R7 TRAIL : l'objectif est DÉCODÉ avant tout le reste (catégorie déduite des
    // données réelles de la course, pas demandée). Tout le dimensionnement en découle. ----
    const isTrail = sp === "trail";
    const tObj = isTrail ? trailObjective(a) : undefined;
    if (tObj) {
      D("format-trail", "Catégorie d'effort", tObj.category + " (" + fmtH(tObj.raceMinLo) + "–" + fmtH(tObj.raceMinHi) + " estimées)", "Déduit de " + tObj.why);
      D("km-effort", "Ton objectif en km-effort", tObj.kmEffort + " km-effort", tObj.distanceKm + " km + " + tObj.dplusM + " m D+ ÷ 100 — la métrique qui compare des courses de relief différent");
      // R12.4 — la VAM estimée est ANNONCÉE, et l'athlète sait exactement quoi faire pour la
      // remplacer : donner la dernière montée qu'il a faite. Pas un test à programmer, pas un
      // chiffre à connaître — un souvenir. C'est la différence entre un plan qu'on affine et un
      // plan qui repose sur une case cochée.
      if (!tObj.vamKnown) warnings.push("Ta vitesse ascensionnelle est ESTIMÉE (" + Math.round(tObj.vam) + " m/h, repli prudent d'après ton niveau et ton historique) : c'est la référence d'intensité en montée ET la base de la prédiction, donc l'estimation coûte cher en précision. Le plus simple pour la corriger : au Profil, donne ta dernière grosse montée — combien de D+, en combien de temps. Pas besoin de test ni de chiffre à connaître.");
      else if (tObj.vamSource === "montee") warnings.push("Ta VAM (" + Math.round(tObj.vam) + " m/h) est déduite de la montée que tu as déclarée, avec une marge de prudence : une montée d'entraînement n'est pas un effort seuil. Elle se précisera au premier test vertical ou au premier import de montre.");
      if (tObj.cappedByProduct) warnings.push("Ton objectif dépasse 24 h d'effort estimées. Le plan construit l'endurance nécessaire, mais la stratégie propre à ce format (sommeil fractionné, assistance, ravitaillement par base-vie) dépasse ce qu'un plan automatique peut honnêtement produire : cherche l'accompagnement d'un entraîneur ou d'un finisher expérimenté pour cette partie.");
      if (tObj.altitudeMaxM && tObj.altitudeMaxM > 2500) warnings.push("Ta course monte à " + tObj.altitudeMaxM + " m : au-dessus de 2 500 m, la performance baisse et l'acclimatation compte. Un protocole d'acclimatation dépend de contraintes logistiques que l'outil ne connaît pas — si tu peux dormir en altitude quelques nuits avant, fais-le.");
    }

    // D3 — LA DURÉE DE PRÉPARATION, EXTRAITE POUR ÊTRE CALCULABLE AVANT LE CHOIX DU FORMAT.
    // Le gate B-17 doit savoir combien de semaines la progression a devant elle AVANT de décider
    // s'il rabat : c'est ce qui distingue un écart franchissable d'un écart qui ne l'est pas. Les
    // deux fonctions sont PURES (aucun avertissement, aucune décision) — la section 1 garde
    // l'émission, elle seule connaît le format final.
    const minWeeksDe = (f?: string): number =>
      tObj ? T6_MIN_WEEKS[tObj.category] : (MIN_WEEKS[sp]?.[f ?? ""] || 12);
    const semainesDe = (f?: string): number => {
      const mw = minWeeksDe(f);
      if (!a.race_date) return mw;
      const MS = 864e5;
      const mondayOf = (t: number): number => t - ((new Date(t).getUTCDay() + 6) % 7) * MS;
      const anchorT = a.plan_start ? new Date(a.plan_start + "T00:00:00Z").getTime() : Date.now();
      const span = Math.round((mondayOf(new Date(a.race_date + "T00:00:00Z").getTime()) - mondayOf(anchorT)) / (7 * MS)) + 1;
      if (span < Math.ceil(mw * 0.75)) return Math.max(1, span);
      if (span > 80) return 80;
      return span;
    };

    // R4.5 (audit v7) — PRÉREQUIS D'ENTRÉE DANS LE MOTEUR. La porte ne vivait que dans le
    // questionnaire (`valid()` du step intention) : toute autre voie — édition d'une réponse
    // depuis le Profil, état restauré, import — générait le plan long quand même. La priorité
    // n°1 du manifeste est la santé : elle doit vivre dans le moteur, pas dans l'interface.
    // On ne refuse pas de produire un plan (l'athlète resterait sans rien) : on RABAT le format
    // au plus long format autorisé et on le DIT.
    if (sp === "swimrun") {
      // R12 §0 — le module swimrun peut être absent du bundle V1 : on ne référence pas un
      // symbole qui n'existe pas (le sport, lui, est déjà refusé en amont par le registre).
      const block = typeof swimrunPrereqBlock === "function"
        ? swimrunPrereqBlock(a as { format?: string; swim_continuous?: string; run_continuous?: string }) : "";
      if (block) {
        warnings.push(block + " Ton plan a donc été construit sur le format Sprint : il te prépare aux bases, et tu passeras au format long quand elles seront acquises.");
        D("prereq-swimrun", "Format rabattu", "sprint (au lieu de " + (a.format || "?") + ")", "Les prérequis de sécurité du format long ne sont pas atteints — construire les bases d'abord n'est pas un lot de consolation, c'est l'ordre dans lequel ce sport s'apprend");
        a = { ...a, format: "sprint" };
        fmt = "sprint"; // D3 — sans quoi la durée de préparation reste celle du format demandé
      }
    }

    // B-17 — PRÉREQUIS DE NAGE CONTINUE EN TRIATHLON, ET SA CONSÉQUENCE EST GRADUÉE (D3 §3).
    //
    // ⚠ MA PREMIÈRE ÉCRITURE REPRENAIT LE PATRON S10 — « rabattre le format et le dire » — SANS
    // L'EXAMINER. Il est juste en swimrun et FAUX en triathlon, pour une raison que le fondateur a
    // nommée : **S10 rabat parce que le swimrun n'offre aucun remède ; le plan de triathlon
    // contient le sien.** En swimrun, l'épreuve EST la nage : sous 30 min de continu, le format
    // long est hors de portée et il n'y a rien à construire dans l'intervalle. En triathlon, le
    // plan porte dix mois d'entraînement, dont la progression de continuité que B-17 vient
    // d'ajouter — rabattre le format SUPPRIME EXACTEMENT LE MÉCANISME QUI CORRIGERAIT LE PROBLÈME.
    // On retirait le remède au motif que la maladie existe. Et le dommage était disproportionné :
    // une déclaration de NAGE transformait un plan de TROIS disciplines — quelqu'un qui roule
    // 180 km sans difficulté recevait un plan Sprint pour n'avoir jamais nagé 1 385 m d'affilée.
    // Mesuré avant correction : **117 profils tri du golden sur 148 rabattus, dont 56 Full → S.**
    //
    // O-17 N'EXIGE PAS ÇA. Il demande de bloquer quand l'erreur est IRRÉVERSIBLE — et l'événement
    // irréversible est LA COURSE, pas la construction du plan. Bâtir un plan ne met personne à
    // l'eau ; il met en place dix mois destinés précisément à fermer l'écart. Le levier du moteur
    // sur le jour J est le MESSAGE, pas la structure du plan.
    //
    //   gate satisfait                         → plan normal
    //   non satisfait, écart FRANCHISSABLE     → plan du format DEMANDÉ, progression incluse,
    //                                            message proéminent, AUCUN rabattement
    //   écart NON franchissable                → rabattement, patron S10, avec sa raison chiffrée
    //
    // « Franchissable » se mesure avec ce qui existe déjà (`continuityGate`) : la rampe part de la
    // continuité DÉCLARÉE et croît au plus de C22 (+10 %/semaine) jusqu'à la fin de la phase
    // spécifique. Si elle n'atteint pas la distance de course, la progression ne peut pas partir
    // d'où l'athlète est, et le rabattement redevient la bonne réponse.
    if (sp === "tri") {
      const ordre = ["Full", "70.3", "M", "S"];
      const g0 = continuityGate(a as Record<string, unknown>, semainesDe(fmt));
      if (g0 && !g0.satisfait) {
        const manque = g0.source === "mesure"
          ? "tu déclares " + Math.round(g0.declareMin!) + " min de nage en continu (" + g0.departM + " m) pour un seuil de " + Math.round(g0.seuilMin) + " min"
          : g0.source === "inconnue-assumee"
            ? "tu as répondu que tu ne sais pas quelle est ta plus longue nage en continu"
            : "ta plus longue nage en continu n'est pas renseignée";
        if (g0.franchissable === false) {
          // NON FRANCHISSABLE — et seulement là. On descend au plus long format que la rampe atteint.
          //
          // ⚠ O-57 — « ON DESCEND » N'ÉTAIT PAS GARDÉ, ET LA BOUCLE MONTAIT. `ordre` commence par
          // `Full` et on retient le PREMIER format franchissable ; or `semainesDe(f)` rend
          // l'horizon PROPRE à chaque format quand aucune date de course n'est saisie
          // (`MIN_WEEKS` : 8 pour un sprint, 36 pour un Full). Un Full disposant de 36 semaines de
          // rampe est donc franchissable AVANT un sprint qui n'en a que 8 — et un débutant qui
          // demande un SPRINT en déclarant 400 m de nage continue recevait **un plan d'Ironman**.
          // Mesuré : **9 profils sur 105**, tous sans date de course, jusqu'à `S → Full`.
          // L'inversion exacte d'une règle de sécurité, sur la population qu'elle protège — et
          // invisible avec une date, ce qui explique qu'aucun gate ne l'ait vue : les 989 profils
          // du golden en portent une.
          //
          // Le rabattement ne considère donc que les formats À OU SOUS celui demandé. C'est ce que
          // le commentaire disait déjà ; il n'était écrit nulle part dans le code.
          const rang = ordre.indexOf(String(a.format ?? ""));
          const candidats = rang >= 0 ? ordre.slice(rang) : ordre;
          let cible = candidats[candidats.length - 1];
          for (const f of candidats) {
            const g = continuityGate({ ...(a as Record<string, unknown>), format: f }, semainesDe(f));
            if (g && (g.satisfait || g.franchissable === true)) { cible = f; break; }
          }
          if (cible !== a.format) {
            warnings.push("En eau libre, le risque ne se voit pas avant d'arriver : pas de mur, pas de fond, et la panique vient vite et loin du bord. Ici, " + manque
              + ", et même en progressant au rythme maximal que ce plan s'autorise (+10 % par semaine) tu atteindrais " + g0.atteignableM + " m d'affilée avant l'épreuve, pour " + g0.courseM
              + " m à nager. L'écart ne se referme pas dans le temps disponible : ton plan a donc été construit sur le format " + cible
              + " — ce n'est pas un lot de consolation, c'est l'ordre dans lequel ce sport s'apprend.");
            D("B17-continuite", "Format rabattu", cible + " (au lieu de " + (a.format || "?") + ")",
              "La progression de continuité ne peut pas partir d'où tu es : " + g0.departM + " m → " + g0.atteignableM + " m au mieux, pour " + g0.courseM + " m à nager");
            a = { ...a, format: cible };
            fmt = cible;
          } else {
            warnings.push("En eau libre, le risque ne se voit pas avant d'arriver. Ici, " + manque
              + " : le format le plus court est déjà le tien, ton plan construit cette continuité semaine après semaine, et une nage continue à la distance de course avant le jour J n'est pas une option.");
            D("B17-continuite", "Continuité de nage à construire", Math.round(g0.seuilMin) + " min visées",
              "Le format le plus court est déjà celui-ci : on ne rabat plus, on construit — et on le dit");
          }
        } else if (g0.source !== "mesure") {
          // NON MESURÉE — L'ÉVALUATION EST EN ATTENTE, ET LE MOTEUR RÉCLAME LA MESURE.
          // « L'inconnu n'est pas une valeur par défaut : c'est une mesure manquante, et le moteur
          // sait déjà en réclamer une » (arbitrage du 16/08/2026). Même patron que la FTP et le
          // CSS : quand il manque un nombre, on prescrit le test qui le produit. Le rabattement ne
          // s'applique pas — rien n'est mesuré, donc rien n'est ÉTABLI comme infranchissable —, et
          // dès que la réponse arrive la conséquence graduée s'applique normalement.
          warnings.push("En eau libre, le risque ne se voit pas avant d'arriver : pas de mur, pas de fond, et la panique vient vite et loin du bord. Ici, " + manque
            + ", pour " + g0.courseM + " m à nager le jour J. **L'évaluation de ta natation est donc EN ATTENTE** : ton plan garde ton format, "
            + "et ta première séance de nage en phase spécifique est un TEST — nage sans t'arrêter aussi loin que tu peux, en bassin, et note la distance. "
            + "Reporte-la dans ton profil : le plan s'ajustera dessus, et c'est seulement à ce moment-là qu'on saura si ton format tient. "
            + "En attendant, la progression avance sur une hypothèse de " + g0.departM + " m.");
          D("B17-continuite", "Évaluation de la nage EN ATTENTE", "test prescrit, hypothèse " + g0.departM + " m",
            "Une continuité inconnue n'est pas une continuité nulle : c'est une mesure manquante. Le moteur prescrit le test qui la produit plutôt que de rabattre sur une valeur que personne n'a donnée — et le silence produit une tâche, jamais un laissez-passer");
        } else {
          // FRANCHISSABLE : LE PLAN GARDE LE FORMAT DEMANDÉ. C'est le cœur de D3.
          warnings.push("En eau libre, le risque ne se voit pas avant d'arriver : pas de mur, pas de fond, et la panique vient vite et loin du bord. Ici, " + manque
            + ", pour " + g0.courseM + " m à nager le jour J. Ton plan garde ton format et CONSTRUIT cette continuité — il part de " + g0.departM
            + " m et monte jusqu'à la distance de course. NE PRENDS PAS LE DÉPART avant d'avoir fait cette nage continue.");
          D("B17-continuite", "Continuité de nage à construire", g0.departM + " m → " + g0.courseM + " m",
            "Le format n'est PAS rabattu : l'écart se referme dans le temps disponible, et rabattre supprimerait justement la progression qui le referme. L'événement irréversible est la course, pas le plan (O-17)");
        }
      }
      const pool = poolOnlyNotice(a as Record<string, unknown>);
      if (pool) {
        warnings.push(pool);
        D("B17-milieu", "Milieu d'entraînement ≠ milieu de course", "bassin → eau libre",
          "C'est le seul écart que le plan ne peut pas combler : on le nomme au lieu de l'omettre");
      }
    }

    // ---- 1. Comprendre l'objectif : durée de préparation ----
    const minW = minWeeksDe(fmt);
    let weeks = minW;
    let raceBeyondPlan = false; // C3 — course au-delà de l'horizon planifiable : ancrer sur MAINTENANT
    if (a.race_date) {
      // R8 — l'entraînement commence CETTE semaine, pas la prochaine. L'ancien calcul
      // floor((course − maintenant)/7j) perdait la fraction de semaine : course dans
      // 8,5 semaines → plan de 8 semaines ancré sur la course → départ lundi SUIVANT.
      // La durée est désormais le nombre de semaines calendaires entre le lundi de
      // l'ancrage (plan_start, sinon aujourd'hui) et le lundi de course, inclus : le
      // générateur (ancré fin de course) fait alors démarrer la semaine 1 aujourd'hui.
      const MS = 864e5;
      const mondayOf = (t: number): number => t - ((new Date(t).getUTCDay() + 6) % 7) * MS;
      const anchorT = a.plan_start ? new Date(a.plan_start + "T00:00:00Z").getTime() : Date.now();
      const span = Math.round((mondayOf(new Date(a.race_date + "T00:00:00Z").getTime()) - mondayOf(anchorT)) / (7 * MS)) + 1;
      // C2/C3 (audit v6) — hors fenêtre, JAMAIS un silence : chaque branche produit une
      // décision ou un avertissement. L'ancien code laissait weeks=minW et le générateur
      // rétrodatait le plan (13 semaines dans le passé pour une course dans 2 semaines).
      if (span < Math.ceil(minW * 0.75)) {
        weeks = Math.max(1, span);
        warnings.push("Il te reste " + Math.max(1, span) + " semaine(s) avant la course — le minimum recommandé pour un " + fmt + " est de " + minW + ". Le plan couvre le temps réellement disponible : c'est une préparation partielle, pas une prépa complète comprimée. Ajuste ton objectif du jour J en conséquence.");
        D("duree-contrainte", "Préparation raccourcie", Math.max(1, span) + "/" + minW + " semaines", "Mieux vaut un plan honnête sur le temps disponible qu'un plan complet impossible à suivre — ou rétrodaté dans le passé");
      } else if (span > 80) {
        weeks = 80;
        raceBeyondPlan = true;
        warnings.push("Ta course est dans " + span + " semaines. Le plan démarre MAINTENANT et couvre les 80 prochaines : au-delà, une planification séance par séance n'a pas de valeur prédictive — régénère ton plan quand l'échéance sera à moins de 80 semaines.");
        D("duree-plafonnee", "Échéance très lointaine", "80 semaines planifiées (course à " + span + ")", "On construit la base longue dès maintenant ; la planification fine attendra que la course entre dans l'horizon");
      } else weeks = span;
    }
    D("duree", "Durée de préparation", weeks + " semaines", "Minimum " + minW + " pour " + fmt + (a.race_date ? ", ajusté à la date de course" : ""));

    // ---- 2. Comprendre l'athlète : capacité de charge ----
    const caps = tObj ? TRAIL_HISTORY_CAPS[tObj.category][history] : (HISTORY_CAPS[sp]?.[history]?.[fmt] ?? 10);
    const util = tObj ? TRAIL_UTIL[tObj.category] : (UTIL[sp]?.[fmt] ?? 12);
    const marg = comp ? MARGIN.competition : MARGIN.autres;
    D("capacite", "Plafond historique", caps + "h/sem", "Ce que l'historique « " + history + " » permet d'encaisser sur " + fmt);
    D("utile", "Volume utile du format", util + "h/sem", "Au-delà, les heures ne servent plus l'objectif " + fmt);
    if (!comp) D("marge", "Marge de sécurité", "-10%", "Hors compétition, 10% de marge sur tous les plafonds (santé d'abord)");

    // 1B — indicateurs de récupération
    const recupFactor = (a.sleep === "court" ? RECUP_FACTORS.sleepCourt : 1) * (a.life_load === "lourde" ? RECUP_FACTORS.lifeLourde : 1);
    if (recupFactor < 1) D("1B", "Récupération dégradée", "volume ×" + recupFactor.toFixed(2), "Sommeil court et/ou charge de vie lourde : le contenu baisse réellement");

    // R6.2 (audit v6, B1/B3) — une blessure déclarée réduit RÉELLEMENT le plafond de
    // volume ; plusieurs zones fragiles → approche ultra-conservatrice, comme la carte
    // de règle affichée à l'athlète le promet depuis toujours.
    // ⚠️ Le facteur s'applique APRÈS la sonde de capacité (loadFactor, planGenerator) et
    // pas via sessionScale : passé dans les tailles initiales, la quantification des
    // répétitions le rendait chaotique (un plan blessé pouvait sortir PLUS gros, mesuré +4%).
    const inj = readInjuries(a.injury);
    const injFactor = inj.count >= 2 ? R6_INJURY_LOAD_FACTORS.multiples : inj.count === 1 ? R6_INJURY_LOAD_FACTORS.une : 1;
    if (injFactor < 1) {
      D("R6.2", "Blessure déclarée", "volume ×" + injFactor.toFixed(2), inj.count >= 2
        ? "Plusieurs zones fragiles (" + inj.list.join(", ") + ") : approche ultra-conservatrice — progression ralentie, bilan médical avant montée en charge"
        : "Zone fragile (" + inj.list.join(", ") + ") : le plafond de volume baisse de 10% — « une blessure décide quoi adapter », le volume en fait partie");
      if (inj.count >= 2) warnings.push("Plusieurs blessures déclarées (" + inj.list.join(", ") + ") : un bilan médical est recommandé avant la montée en charge — le plan est volontairement conservateur (-20% de volume).");
      // ANX-GEN (R13) — LA ZONE FRAGILE QUI TOUCHE LA DISCIPLINE PRINCIPALE DU SPORT CHOISI
      // SE DIT À VOIX HAUTE. R6.1 déclare `genou → forbid [rn, bk]` ; en mono-sport vélo, la
      // génération appliquait ×0,9 sans un mot — l'athlète au genou fragile recevait un plan
      // 100 % vélo et aucun signal. En multisport, la substitution de discipline fait le
      // travail ; en mono-sport, elle est impossible : il ne reste que la franchise.
      const mainD = sportModule(sp as string).mainDiscipline;
      const conflit = inj.list.filter((loc) => (R6_PAIN_CONTRAINDICATION[loc]?.forbid || []).includes(mainD));
      if (conflit.length && sportModule(sp as string).disciplines.length < 2) {
        warnings.push("Ta zone fragile (" + conflit.join(", ") + ") est précisément celle que ce sport charge à chaque séance. Le plan réduit le volume (×" + injFactor.toFixed(2) + ") et l'ajusteur quotidien surveillera la douleur — mais un avis médical avant la montée en charge est la vraie réponse : aucune réduction de volume ne remplace un diagnostic.");
      }
    }

    // R6.3 (audit v6, A7) — l'âge module la charge : l'avertissement du Profil s'APPLIQUE.
    // R13.1 — les bornes sont celles du SCHÉMA (source unique, dérivée) : un âge de 10 à 100
    // est un âge, et les prédicats mineur/master le voient. Avant, la table physio locale
    // (14–95) écartait 10-13 et 96-100 en silence : plan adulte complet pour un enfant de
    // 10 ans. Sur le chemin validé, une valeur hors schéma a déjà LEVÉ dans validateAnswers —
    // la branche d'écart ci-dessous est le filet des appelants qui n'y passent pas
    // (`adjustTodayV2` appelle generatePlan sans validation), et elle le DIT (contrat E3 :
    // hors bornes = non renseigné + avertissement, jamais un écart muet).
    const ageRaw = parseInt(a.age || "") || 0;
    const ageN = boundedOrZero("age", ageRaw);
    if (ageRaw !== 0 && ageN === 0)
      warnings.push("Ton âge renseigné (" + ageRaw + ") est hors du domaine accepté (10 à 100 ans) : il n'a pas été utilisé, et les protections liées à l'âge (mineur, master) n'ont pas pu s'appliquer. Corrige-le au Profil.");
    const minor = ageN > 0 && ageN <= R6_AGE_LOAD.mineur.maxAge;
    const master = ageN >= R6_AGE_LOAD.master.minAge;
    let ageFactor = 1;
    if (minor) {
      ageFactor = R6_AGE_LOAD.mineur.volFactor;
      D("R6.3", "Athlète mineur (" + ageN + " ans)", "volume ×" + R6_AGE_LOAD.mineur.volFactor + ", aucune VO2max", "Ces plans sont calibrés pour des adultes : en dessous de 18 ans, la charge (surtout les VO2max répétés) doit être encadrée — le plan est réduit et sans VO2max, l'encadrement humain reste nécessaire");
      warnings.push("Ces plans sont calibrés pour des adultes. En dessous de 18 ans, la charge (surtout les VO2max répétés) doit être encadrée par un entraîneur : le plan est réduit de 30% et ne contient aucune séance VO2max — mais il ne remplace pas un encadrement humain.");
    } else if (master) {
      ageFactor = R6_AGE_LOAD.master.volFactor;
      D("R6.3", "Athlète master (" + ageN + " ans)", "volume ×" + R6_AGE_LOAD.master.volFactor + ", récup /3 semaines", "La capacité d'encaissement se maintient avec l'âge, la vitesse de récupération baisse : on récupère plus souvent, on charge un peu moins");
    }
    const loadFactor = injFactor * ageFactor;

    const volMax = parseInt(a.vol_max || "10");
    // O-35 — `SWIM_TIME_FACTOR` CONVERTIT LA DÉCLARATION DE L'ATHLÈTE, PAS LES TABLES DU MOTEUR.
    //
    // Il code « 60 % du temps déclaré en BASSIN n'est pas de la nage » (consignes, départs,
    // temps d'arrêt) : c'est une conversion d'UNITÉ sur la seule grandeur exprimée en temps de
    // piscine — `vol_max`, que l'athlète saisit. `HISTORY_CAPS` et `UTIL` sont du VOLUME
    // D'ENTRAÎNEMENT, au même titre que les lignes course et vélo qui ne subissent aucune
    // conversion ; les convertir pénalisait le nageur une seconde fois. R20.7 avait déjà posé
    // ce principe sur la rampe (elle convertit `vol_recent`, jamais une table) — on l'applique
    // ici au même endroit pour toute la chaîne.
    //
    // Le correctif était appliqué au RÉSULTAT (`volPeak × SWIM_TIME_FACTOR`, ligne suivante
    // avant O-35) : dès que `caps` ou `util` était le terme mordant, la table y passait aussi.
    // Mesuré : `swim/demifond` non-débutant recevait `peakH` = 6,00 h pour un `volPeak` de
    // 2,40 — rapport 2,50 = 1/0,4 au chiffre près, quand le témoin course rend 1,00. La courbe
    // de charge étant pilotée par `peakH` (jamais converti), LE PLAN traitait les tables comme
    // des heures d'eau depuis toujours : seule la PROMESSE mentait. Convertir `peakH` à son
    // tour (la correction symétrique, mesurée puis REFUSÉE) faisait tomber 92 profils du
    // golden jusqu'à −55 % — 3 séances de 15 min. On aligne donc la promesse sur le plan.
    const _swimTime = guard(sp as string, "swimTimeFactor") ? swimTimeFactorOf(history) : 1; // B-09 : indexé sur l'historique
    const _volMaxEau = volMax * _swimTime;
    // `sessionScale` GARDE `volMax` NON CONVERTI, ET C'EST MESURÉ, PAS OUBLIÉ.
    //
    // Le ratio compare bien deux unités différentes quand `volMax` borde (déclaration en temps
    // de piscine ÷ table en heures d'entraînement), et P11 exige de corriger un piège d'unité
    // sur TOUT le chemin — la conversion a donc été écrite, puis RÉFUTÉE par la mesure :
    // `audit:v1` remonte alors une violation DURE du manifeste sur `swim/sprint/ancien/
    // debutant` — « 1 saut >+25 % de volume réel entre semaines de charge ». Diviser l'échelle
    // des séances par 2,5 les envoie toutes sur leurs planchers (C24/C24b, 750 m et 600 m), et
    // une semaine dont le contenu est épinglé au plancher ne suit plus la courbe : la
    // progression devient un escalier. Priorité 2 du manifeste contre cohérence d'unité — la
    // sécurité gagne, l'écart est nommé (O-35) plutôt que corrigé au prix d'un saut de charge.
    const sessionScale = Math.min(1, (Math.min(volMax, caps, util) * marg) / util) * recupFactor;
    let volPeak = Math.round(Math.min(_volMaxEau, caps, util) * marg * recupFactor * 10) / 10;
    if (guard(sp as string, "swimTimeFactor") && beginner) {
      volPeak = Math.min(volPeak, BEGINNER_SWIM_VOLPEAK_CAP_H);
      D("C15", "Nageur débutant", "pic ≤" + BEGINNER_SWIM_VOLPEAK_CAP_H + "h", "La technique borne le volume, pas l'historique (risque épaule)");
    }

    // ---- 3. Comprendre les contraintes : médical, jours, budget ----
    const medHold = a.med_pain === "oui" || a.med_dizzy === "oui" || a.med_treat === "oui";
    if (medHold) {
      D("medical", "⚠️ Drapeau médical", "plan de maintien", "Aucune intensité générée sans feu vert médical ; pic allégé à 40%");
      // R4.0 (audit v7) — le drapeau médical ne produisait AUCUN avertissement : `warnings`
      // restait vide, et rien dans le plan ne mentionnait l'avis médical. Une décision dans un
      // volet dépliable ne suffit pas pour la priorité n°1 du manifeste.
      const which = [a.med_pain === "oui" ? "douleur thoracique à l'effort" : null,
        a.med_dizzy === "oui" ? "vertiges ou malaise à l'effort" : null,
        a.med_treat === "oui" ? "traitement cardiovasculaire" : null].filter(Boolean).join(", ");
      warnings.push("⚠️ Tu as signalé : " + which + ". Ce plan est un plan de MAINTIEN — aucune intensité n'y est générée, le volume est allégé, et il ne remplace pas un avis médical. Prends rendez-vous avant de reprendre l'entraînement structuré : c'est la seule chose non négociable de cet outil.");
    }
    const offDays = (a.off_which || "").split(",").filter(Boolean);
    // Le cycle de 10 jours est RETIRÉ (25/08/2026) — voir l'en-tête de `weekBuilder.ts` pour
    // le bilan mesuré et `use10-cycle-10-jours.patch` pour le diff. Le cycle est la semaine
    // pour tout le monde ; `shift_ok` n'est plus posée, et une réponse persistée est ignorée.
    const recupEvery = master ? Math.min(RECUP_EVERY[history], R6_AGE_LOAD.master.recupEvery) : RECUP_EVERY[history];
    D("recup", "Semaine de récupération", "toutes les " + recupEvery + " semaines", master ? "60+ : la récupération se rallonge avec l'âge — cadence resserrée (R6.3)" : history === "reprise" ? "Reprise : récupération plus fréquente" : "Assimilation régulière de la charge");

    const volBudget = Math.min(volMax, caps, util) * marg;
    const avgH = AVG_SESSION_H[sp];
    const volSessCap = avgH ? Math.max(3, Math.round(volBudget / avgH)) : 7;
    const budgetPerWeek = Math.min(parseInt(a.sessions_max || "7") || 7, volSessCap);
    D("budget", "Séances par semaine", budgetPerWeek, "Budget déclaré ∧ budget implicite du volume (" + volBudget.toFixed(1) + "h ÷ " + (avgH ?? "—") + "h/séance)");

    const injuries = inj.list;
    let maxRunDays: number | null = null;
    // D10-3 — le plafond de jours d'IMPACT vaut aussi pour le trail. Il ne s'appliquait qu'à
    // `run` : depuis R7 un traileur avec une périostite recevait 5 jours de course par semaine,
    // là où un coureur route avec la MÊME blessure en recevait 3. Or le trail ajoute la charge
    // excentrique de la descente à l'impact — c'est la discipline la plus exigeante pour les
    // tissus, pas la moins.
    if (guard(sp as string, "runImpactCap")) {
      maxRunDays = MAX_RUN_DAYS[history] ?? 5;
      if (inj.impact) maxRunDays = Math.max(3, maxRunDays - 1);
      // B2 (audit v6) — le tibia (périostite) est LA blessure de l'impact répété : le
      // plafond de jours de course est renforcé d'un jour supplémentaire.
      if (inj.list.includes("tibia")) maxRunDays = Math.max(3, maxRunDays - 1);
      D("impact", "Jours de course max", maxRunDays + "/semaine",
        (sp === "trail"
          ? "Le trail cumule l'impact de la course et la charge excentrique de la descente : le plafond de jours d'appui vaut ici aussi"
          : "La course est le sport à plus fort impact")
        + (inj.impact ? " — blessure d'impact déclarée, -1 jour" + (inj.list.includes("tibia") ? " (-1 de plus : le tibia est une blessure d'impact répété)" : "") : ""));
    }

    // ---- 4. Calculer la charge : phases (C19) et courbe (bands + C22) ----
    const phases: Phase[] = PHASE_PCTS.map((p) => ({ ...p, start: 0, end: 0, weeks: 0 }));
    let acc = 0;
    for (const p of phases) {
      p.start = Math.round(acc * weeks);
      acc += p.pct;
      p.end = Math.round(acc * weeks);
      p.weeks = p.end - p.start;
    }
    phases[4].end = weeks;
    {
      const pk = phases[3], spc = phases[2];
      if (pk.weeks < 1 && spc.weeks >= 2) {
        spc.end--; spc.weeks--;
        pk.start = spc.end; pk.end = pk.start + 1; pk.weeks = 1;
        D("C19", "Semaine de peak garantie", "S" + (pk.start + 1), "Les arrondis vidaient la phase peak des plans courts — la dernière semaine de spec devient le pic");
      }
      phases[4].start = phases[3].end;
      phases[4].weeks = phases[4].end - phases[4].start;
    }
    // R13.6 — LES POURCENTAGES DE PHASE PRENNENT DES PLAFONDS ABSOLUS. 10 % d'affûtage sur un
    // plan de 59 semaines = 6 semaines à un quart du pic : la littérature (méta-analyse
    // Bosquet 2007) situe l'affûtage optimal à 8-14 jours, ~3 semaines maximum pour un
    // Ironman, réduction 40-60 %. Six semaines, c'est un désentraînement organisé — l'athlète
    // le plus discipliné arrive détraîné. Même logique pour le peak (≤ 5 semaines : au-delà,
    // ce n'est plus un pic, c'est un plateau de charge maximale que personne n'encaisse).
    // L'excédent revient à la phase SPÉCIFIQUE (puis au développement) : c'est là que les
    // semaines supplémentaires d'un plan long produisent de l'adaptation. La part de base ne
    // bouge pas, C19 (peak ≥ 1) tient toujours.
    {
      const [, dev, spc, pk, tap] = phases;
      // R19.3 — la durée d'affûtage vient d'abord du FORMAT DE COURSE (ce qui décide, c'est la
      // charge accumulée et la durée de l'épreuve), et seulement ensuite de la longueur de la
      // préparation. Prendre le min des deux : un plan court ne donne pas trois semaines
      // d'affûtage à un Ironman, et un plan long n'en donne pas trois à un sprint.
      const parFormat = a.sport === "trail"
        ? (TAPER_WEEKS_BY_TRAIL_CAT[tObj?.category as string] ?? 2)
        : (TAPER_WEEKS_BY_FORMAT[sp as string]?.[String(a.format ?? "")] ?? 2);
      const parPrepa = Math.max(1, Math.min(Math.round(0.10 * weeks), weeks >= 30 ? 3 : 2));
      const tapMax = Math.max(1, Math.min(parFormat, parPrepa));
      const pkMax = 5;
      let surplus = 0;
      if (tap.weeks > tapMax) { surplus += tap.weeks - tapMax; tap.weeks = tapMax; }
      if (pk.weeks > pkMax) { surplus += pk.weeks - pkMax; pk.weeks = pkMax; }
      if (surplus > 0) {
        spc.weeks += surplus;
        // Recoudre les bornes de proche en proche (start/end sont dérivés des durées).
        spc.start = dev.end; spc.end = spc.start + spc.weeks;
        pk.start = spc.end; pk.end = pk.start + pk.weeks;
        tap.start = pk.end; tap.end = weeks;
        tap.weeks = tap.end - tap.start;
        D("R13.6", "Phases plafonnées en absolu", "affûtage " + tap.weeks + " sem · peak " + pk.weeks + " sem (excédent → spécifique)",
          "Les pourcentages explosent sur les plans longs : 6 semaines d'affûtage désentraînent (optimal 8-14 jours, ~3 semaines max — Bosquet 2007), un « pic » de 9 semaines est un plateau que personne n'encaisse");
      }
    }
    // B-17 — LA DÉCISION DES PALIERS EST ÉMISE ICI, PAS DANS LE BLOC DU GATE : elle a besoin de la
    // phase SPÉCIFIQUE, qui vient d'être construite. Émise plus haut, elle annonçait un nombre que
    // le plan ne pouvait pas porter (D3 : 4 paliers annoncés, 2 semaines de spec, dernier palier
    // jamais posé). Le générateur lit la même fonction sur le même objet `phases` — R11.1.
    let _swimCapM: number | undefined;
    let _b17Gate: ReturnType<typeof continuityGate> | null = null;
    if (sp === "tri") {
      const gp = continuityGate(a as Record<string, unknown>, weeks);
      // O-54 §2 — C15 CESSE DE LIRE UNE AUTO-ÉVALUATION GLOBALE QUAND UNE CAPACITÉ EST DÉMONTRÉE.
      // Calculé ICI parce que c'est le seul endroit qui a À LA FOIS le gate (donc la rampe partant
      // de l'athlète) et le drapeau `beginner`. Transmis par `ReasonedPlan` : les trois sites C15
      // du générateur le lisent, ils n'en refont pas le calcul (R11.1).
      _b17Gate = gp;
      if (beginner) {
        _swimCapM = swimSessionCapM(gp, C15_BEGINNER_SWIM_SESSION_CAP_M);
        if (_swimCapM > C15_BEGINNER_SWIM_SESSION_CAP_M)
          D("C15-capacite", "Plafond de séance en nage", Math.round(_swimCapM) + " m au lieu de " + C15_BEGINNER_SWIM_SESSION_CAP_M,
            "Tu es débutant en triathlon, pas en natation : tu as déclaré nager " + Math.round(gp!.departM) + " m d'affilée. Le plafond de séance suit ce que tu sais faire et la progression que ton plan peut construire, plus ton échauffement — pas une case cochée au questionnaire");
      }
      const spc = phases.find((ph) => ph.id === "spec");
      // O-84 (a/b) — L'ANNONCE SE REDÉRIVE DES CONDITIONS DE POSE, PAS D'UN COMPTE ABSTRAIT.
      // Mesuré (re-vérification B-17, 20/08/2026) : 22 profils annonçaient « N paliers » quand le
      // plan livre 1 test + N−1 continues — l'arbitrage D3 dit lui-même que le test MESURE et que
      // le palier CONSTRUIT, l'annonce les confondait ; et 1 profil épaule annonçait 3 paliers que
      // le site de pose suspend délibérément (`!inj.shoulder && !medHold`, src/sports/tri). Les
      // trois branches ci-dessous lisent les MÊMES conditions que la pose (T-06 les compare au
      // plan livré profil par profil — c'est lui qui tient les deux sites ensemble).
      if (gp && spc) {
        const lay = palierLayout(gp, spc.weeks, phases.find((ph) => ph.id === "dev")?.weeks ?? 0);
        const nP = lay.nProgression - lay.nTest;
        const val = inj.shoulder || medHold
          ? "suspendues — " + (medHold ? "drapeau médical" : "nage aménagée pour ton épaule")
          : lay.nTest
            ? (nP < 1 ? "1 test de continuité en phase spécifique"
              : "1 test" + (lay.testEnDev ? " (fin de développement)" : "") + " + " + nP + " palier(s) en phase spécifique")
            : nP + " palier(s) en phase spécifique";
        D("B17-paliers", "Nages continues prescrites", val,
          inj.shoulder || medHold
            ? "La progression de continuité attendra que la nage redevienne complète : la poser sur une nage aménagée mesurerait autre chose que ta continuité"
            : "La continuité se construit par une MONTÉE, jamais par un test unique à la fin : découvrir la distance trois semaines avant l'épreuve laisse le temps de s'inquiéter, pas celui de s'adapter — et le nombre est borné par la place réellement disponible");
      }
    }
    D("courbe", "Courbe de charge", "base " + BANDS.base[0] + "→peak 1.0→affûtage " + BANDS.taper[1], "Bandes normalisées × pic, récup ×" + RECUP_WEEK_FACTOR + ", lissage C22 ≤+" + Math.round((C22_MAX_WEEKLY_GROWTH - 1) * 100) + "%/sem");

    const medFactor = medHold ? 0.4 : 1;
    const theoPeak = Math.min(_volMaxEau, caps, util) * marg * recupFactor;
    let peakH = Math.min(theoPeak, _volMaxEau) * medFactor;
    // O-35 — `peakH` ET `volPeak` PARTENT DÉSORMAIS DE LA MÊME GRANDEUR (`_volMaxEau`), donc
    // de la même unité : des heures d'ENTRAÎNEMENT. C'est ce qui rend lisible la sonde V2.1
    // ci-dessous, qui mesure `weekMin` — des minutes réellement prescrites, la même unité.
    // Avant, elle comparait ces minutes à un `peakH` 2,5 fois trop grand : elle mordait donc
    // TOUJOURS en natation et servait de convertisseur d'unité par accident. Un garde-fou de
    // sécurité qui convertit des unités est un garde-fou qu'on ne peut plus lire.
    // C20 — nage débutant : la promesse suit la capacité réelle C15 (son plafond, 25 min par
    // séance, est déjà en heures d'entraînement : la comparaison est enfin homogène)
    let c20Cap = 0; // R20.2 (DOC_UNIQUE §2) — transmis comme plafond STRUCTUREL (nSess × durée max)
    if (guard(sp as string, "swimTimeFactor") && beginner) {
      const cap20 = (parseInt(a.sessions_max || "6") || 6) * C20_BEGINNER_SWIM_H_PER_SESSION;
      if (peakH > cap20) {
        peakH = cap20;
        c20Cap = cap20;
        D("C20", "Promesse calibrée", peakH.toFixed(1) + "h max", "Une séance C15 ≈ 25min : promettre plus serait mentir");
      }
    }
    // V2.1 — le générateur affine ensuite par SONDE DE CAPACITÉ : il génère la semaine pic,
    // mesure ce que les plafonds de séance permettent réellement, et abaisse la promesse si
    // besoin (« le moteur se vérifie et se corrige » appliqué à ses propres promesses —
    // corrige notamment la nage non-débutante que V1.5 déclare à 6.3h pour 3.6h livrables).

    // E1/E2 — parseur unique, tolérant (4'50 accepté : c'est la notation que l'app affiche)
    const thrPaceRaw = a.pace_known === "oui" ? String(a.pace ?? "").trim() : "";
    const cssRaw = a.css_known === "oui" ? String(a.css ?? "").trim() : "";
    const thrPace = parsePaceSec(thrPaceRaw, "run");
    const css = parsePaceSec(cssRaw, "swim");
    if (thrPaceRaw && !thrPace) warnings.push("Allure seuil « " + thrPaceRaw + " » illisible ou hors bornes (2:00 à 20:00 /km) : les séances de course s'affichent en zones cardio. Corrige-la au Profil (format 4:50 ou 4'50).");
    if (cssRaw && !css) warnings.push("CSS « " + cssRaw + " » illisible ou hors bornes (1:00 à 5:00 /100m) : les séances de natation s'affichent au ressenti. Corrige-le au Profil.");
    // E3 (audit v6) — FTP hors bornes physiologiques [60, 600W] = non renseignée : repli
    // zones cardio + avertissement nommé, jamais des zones négatives à l'écran.
    const ftpRaw = a.ftp_known === "oui" ? parseInt(a.ftp || "") || 0 : 0;
    const ftp = boundedOrZero("ftp", ftpRaw);
    if (ftpRaw > 0 && ftp === 0) warnings.push("FTP saisie (" + ftpRaw + "W) hors bornes plausibles [60–600W] : elle est ignorée — les séances s'affichent en zones cardio. Corrige-la au Profil.");
    const hz = hrZones(a.age, a.hr_max, a.hr_rest);

    // R12.4b — LA SOURCE DE CHAQUE RÉFÉRENCE EST DITE, TOUJOURS.
    //
    // Le banc amont l'a attrapé : effacer `pace_known` déplaçait la promesse de volume (9.7 →
    // 9.8 h) sans que rien ne le dise. Le mécanisme est légitime — sans allure déclarée, le
    // moteur calcule sur une allure de repli, donc les blocs en DISTANCE ne durent pas la même
    // chose, donc la sonde de capacité ne trouve pas le même plafond. Ce qui ne l'était pas,
    // c'est le silence : le trail annonçait déjà sa VAM estimée (R12.4), les trois autres
    // références ne disaient rien. Une référence estimée n'est pas un détail d'affichage —
    // elle change les zones affichées ET le volume promis.
    const REF_LABEL: Record<string, string> = { rn: "allure seuil", bk: "FTP", sw: "CSS" };
    const REF_HOW: Record<string, string> = {
      rn: "3 min à fond puis 10 min à fond",
      bk: "20 min à fond (FTP = 95 % de la puissance normalisée)",
      sw: "400 m puis 200 m à fond (CSS)",
    };
    const refKnown: Record<string, boolean> = { rn: thrPace > 0, bk: ftp > 0, sw: css > 0 };
    const discs = knownSports().includes(sp) ? sportModule(sp).disciplines : [];
    if (discs.length) {
      const est = discs.filter((d) => !refKnown[d]);
      const dec = discs.filter((d) => refKnown[d]);
      D(
        "R12-ref",
        "Tes références d'intensité",
        [
          dec.length ? dec.map((d) => REF_LABEL[d]).join(" · ") + " (déclarée" + (dec.length > 1 ? "s" : "") + ")" : "",
          est.length ? est.map((d) => REF_LABEL[d]).join(" · ") + " (ESTIMÉE" + (est.length > 1 ? "S" : "") + ")" : "",
        ].filter(Boolean).join(" — "),
        est.length === 0
          ? "Toutes tes références sont déclarées : les séances portent des cibles chiffrées et le volume promis est calé sur ta vraie vitesse."
          : est.map((d) => REF_LABEL[d]).join(" et ") + " : sans valeur déclarée, les séances de "
            + est.map((d) => (d === "rn" ? "course" : d === "bk" ? "vélo" : "natation")).join(" et ")
            + " s'affichent en zones cardio ou au ressenti, et le volume est calculé sur une vitesse de repli PRUDENTE — ce qui déplace légèrement la promesse d'heures. Pour la remplacer : "
            + est.map((d) => REF_HOW[d]).join(" ; ") + ", ou un simple import de montre.",
      );
    }

    // ---- R7 TRAIL : les DEUX axes verticaux et le plafond de sortie longue ----
    let tVert: { dplusPeak: number; dmoinsPeak: number; capped: boolean; accessCap: number } | undefined;
    let trailLongCapMin = 0;
    if (tObj) {
      tVert = trailWeeklyVertical(tObj, history, a.train_dplus_access || "collines");
      // T13 — blessure : la contre-indication porte sur la CIBLE verticale, pas seulement
      // sur le contenu des séances (sinon la passe de mise à l'échelle du générateur
      // ramène le dénivelé à la cible et annule la protection).
      const dFac = inj.list.includes("quadriceps") ? 0.35 : inj.list.includes("genou") || inj.list.includes("tibia") ? 0.6 : 1;
      if (dFac < 1) {
        tVert = { ...tVert, dmoinsPeak: Math.round(tVert.dmoinsPeak * dFac) };
        D("T13", "Descente plafonnée (blessure)", "D− ×" + dFac, inj.list.includes("quadriceps")
          ? "Quadriceps fragiles : la descente est LA charge qui les casse — son volume tombe à 35% et les descentes longues sont retirées du plan, remplacées par du renfo excentrique"
          : "Zone fragile : le volume de descente est réduit de 40% (la descente est le terrain le plus traumatisant du trail)");
      }
      const capCat = T1_DPLUS_CAPS[tObj.category][history];
      D("T1", "Dénivelé hebdomadaire au pic", tVert.dplusPeak + " m D+ (D− " + tVert.dmoinsPeak + " m)", "Le D+ est le second axe de charge : plafonné par la catégorie (" + capCat + " m pour un historique « " + history + " ») et par ton terrain d'entraînement");
      D("T2", "Progression du dénivelé", "D+ ≤ +12%/sem · D− ≤ +8%/sem", "La charge excentrique (descente) est le premier facteur de casse musculaire : elle progresse plus lentement que tout le reste");
      // T4 — la sortie longue plafonne en % du TEMPS DE COURSE estimé, jamais en absolu
      trailLongCapMin = Math.round(tObj.raceMinMid * T4_LONG_RUN_VS_RACE[tObj.category]);
      // R12.7 — la sortie longue est calibrée en POURCENTAGE du temps de course estimé. Un
      // athlète plus rapide a une course plus courte, donc une sortie longue plus courte : la
      // progression n'est pas monotone avec le niveau, et sans explication ça passe pour un bug.
      D("T4", "Plafond de la sortie longue", fmtH(trailLongCapMin),
        "Sur ce format, reproduire la durée de course à l'entraînement serait contre-productif : "
        + Math.round(T4_LONG_RUN_VS_RACE[tObj.category] * 100) + "% du temps estimé suffit à préparer le reste. "
        + "Ce plafond suit ton temps ESTIMÉ (" + fmtH(Math.round(tObj.raceMinMid)) + ") : plus tu es rapide, plus ta course est courte, et plus ta sortie longue l'est aussi — "
        + (tObj.vamSource === "estimee"
          ? "et comme ta vitesse ascensionnelle est encore estimée, ce plafond bougera dès que tu donneras une vraie montée"
          : "il se recalculera à chaque fois que ta référence de montée changera"));
      // T7 — répétitions ravito/matériel
      if (tObj.raceMinMid / 60 >= 6) D("T7", "Répétitions ravitaillement", "3 sorties en conditions réelles (phase spécifique)", "Au-delà de 6 h d'effort, l'estomac et le matériel provoquent autant d'abandons que les jambes : ça se teste à l'entraînement");
      // T11 — terrain plat : le dire, ne pas prescrire du dénivelé inatteignable
      if (tVert.capped) {
        warnings.push("Ton terrain d'entraînement ne permet pas d'atteindre les " + T1_DPLUS_CAPS[tObj.category][history] + " m D+/semaine que ton objectif demanderait (plafond réalisable : ~" + tVert.accessCap + " m). Le plan compense par du travail en côte répétée" + (a.treadmill === "oui" ? ", du tapis incliné" : ", des escaliers") + " et du renfo excentrique, mais ces substituts ne remplacent pas complètement une descente longue. Si tu peux caler 2 ou 3 week-ends en relief pendant la phase spécifique, c'est le meilleur investissement de ta préparation.");
        D("T11", "Terrain d'entraînement limité", "D+ plafonné à " + tVert.dplusPeak + " m/sem", "Prescrire un dénivelé inatteignable serait mentir : le plan substitue ce qu'il peut et nomme ce qui manque");
      }
      // T14 — barrière horaire : l'information la plus utile que l'outil puisse produire
      if (tObj.cutoffH && tObj.raceMinHi > tObj.cutoffH * 60) {
        warnings.unshift("⏱ Barrière horaire : ta course est limitée à " + tObj.cutoffH + " h et notre estimation haute est de " + fmtH(tObj.raceMinHi) + ". C'est jouable mais rien ne devra déraper — vise le bas de la fourchette, contrôle ton départ, et prépare une stratégie de ravitaillement rapide. Si l'écart se confirme à l'entraînement, envisage un format plus court : finir vaut mieux qu'être arrêté à un poste.");
        D("T14", "Barrière horaire serrée", tObj.cutoffH + "h pour " + fmtH(tObj.raceMinLo) + "–" + fmtH(tObj.raceMinHi) + " estimées", "Le plan reste identique, mais l'objectif du jour J devient la gestion, pas la performance");
      }
    }

    // ÉTAPE 1 DU CHANTIER « UNITÉ DE VOLUME = CYCLE » — LES BORNES EN JOURS, DÉRIVÉES.
    //
    // Posées ICI et pas à la construction des phases : `start`/`end` sont encore réécrits
    // ensuite par C19 (semaine de peak garantie) et R13.6 (plafonds absolus d'affûtage et de
    // pic). Les dériver plus haut donnerait des bornes en jours qui décrivent un état
    // intermédiaire — c'est la leçon payée douze fois dans ce dépôt (« une garantie vérifiée
    // au milieu du pipeline ne vérifie que l'avant-dernier état »), et elle vaut aussi pour un
    // DESCRIPTEUR. Aucun consommateur aujourd'hui : ces champs existent pour que les étapes
    // 2-4 lisent une phase en jours sans choisir entre « semaine » et « cycle ».
    //
    // ⚠ ET ELLES SONT UNE DÉRIVATION, PAS DES CHAMPS STOCKÉS — mesuré : les poser sur l'objet
    // `phases` produit **986 écarts sur 990** au golden, parce que les phases sont
    // PHOTOGRAPHIÉES dans le plan. Le critère d'acceptation de l'étape 1 est « 0 écart » : une
    // étape de lisibilité qui déplace la photo n'est plus une étape de lisibilité. Et c'est
    // aussi la bonne forme au sens de R11.1 : un champ stocké à côté de `start`/`end` est une
    // seconde source, libre de diverger le jour où C19 ou R13.6 réécrit l'un sans l'autre.
    // `phaseJours()` (ci-dessous) rend les bornes en jours à la demande, depuis la seule source.
    return {
      profile: a,
      decisions,
      weeks,
      phases,
      volPeak,
      volBase: Math.round(volPeak * 0.58 * 10) / 10,
      peakH,
      sessionScale,
      recupEvery,
      offDays,
      budgetPerWeek,
      maxRunDays,
      medHold,
      beginner,
      swimSessionCapM: _swimCapM,
      b17Gate: _b17Gate,
      finisher,
      comp,
      dbl: a.doubles === "oui",
      injuries,
      inj,
      warnings,
      noVo2: minor,
      raceBeyondPlan,
      loadFactor,
      trail: tObj,
      trailVert: tVert,
      trailLongCapMin,
      baseRefs: { ftp, thrPace, css },
      hz,
      // R20.2 — les maillons sont transmis, pas seulement leur produit : c'est ce qui permet
      // au générateur de nommer celui qui a le plus retiré au lieu d'annoncer un pic sans
      // explication. `load` (blessure × âge) n'est pas ici : il s'applique en aval, APRÈS la
      // sonde de capacité, et le générateur le lit dans `loadFactor`.
      volLimits: {
        declared: volMax, caps, util, marg, recup: recupFactor,
        swimTime: _swimTime,
        med: medFactor, c20: c20Cap,
        sessionsMax: parseInt(a.sessions_max || "7") || 7, budget: budgetPerWeek,
      },
    };
  }
}
