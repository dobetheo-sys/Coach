/**
 * Sport TRIATHLON (registre R10). Extraction mécanique de la branche `sp === "tri"`.
 * C'est le sport qui portait le plus de passes gardées par un test de sport (brick, C18b,
 * lissage sur métrique nage) : elles sont désormais des garde-fous DÉCLARÉS.
 */
import type { V1Session, V1Step } from "../../engine/types.ts";
import { C21_REPRISE_BRICK_FACTOR, BRICK_TAPER_BIKE_BOUNDS, O81_FOOTING_CIBLE_PIC_MIN, O88_NB_ACCELERATIONS, PROG_DOSE_DEPART } from "../../engine/constraintMatrix.ts";
import { intOf } from "../../generator/renderer.ts";
import { registerSport, type SessionKit, type PredictKit } from "../registry.ts";
import { TRI_SWIM, TRI_BIKE, TRI_RUN, TRI_BIKE_KM, TRI_TRANSITION } from "../../engine/predictor.ts";
import { continuityGate, palierLayout, palierDistanceM, B17_ECHAUF_M, B17_RETOUR_M } from "../../engine/swimContinuity.ts";

export function buildTriSessions(kit: SessionKit): V1Session[] {
  const { r, a, fmt, slot, phase, prog, weekNum, slotIdx, lvl, finisher, beginner, medHold, dbl, sessionScale, inj, noVo2, swimDrillGlossary, semaineRecup, S2, W, Wm, C, Cm, B, Bd } = kit;
  const runInj = inj.list.includes("course");
  const PB = ({ base: [0.35, 0.55], dev: [0.55, 0.75], spec: [0.75, 0.9], peak: [0.9, 1], taper: [0.35, 0.45] } as Record<string, [number, number]>)[phase] || [0.5, 0.8];
  const PT = (lo: number, hi: number) => Math.max(1, Math.round((lo + (hi - lo) * (PB[0] + (PB[1] - PB[0]) * prog)) * sessionScale));
  // LOT PROGRESSION (pièce 2) — LA DOSE DE SEUIL NAGE A UNE TRAJECTOIRE, PAS UNE TAILLE.
  //
  // Mesuré sur le profil du fondateur : « Nage seuil » livre **1975 m au CSS = 40,2 min, soit
  // le plafond de dose `DOSE_CAP_MIN.thr` au mètre près, dès la SEMAINE 1 de base**, et y reste
  // de S1 à S38 — les seules variations sont vers le BAS (1525-1875 m les semaines où une coupe
  // passe), jamais une montée. C'est le défaut de la pièce 1 (naître à taille finale) sur la
  // nage, avec une aggravation : la taille finale y est un plafond de SÉCURITÉ, employé de fait
  // comme cible dès le premier jour.
  //
  // TROIS CHOIX, chacun tranché et écrit :
  //  · la CIBLE de pic ne bouge pas — 40 min au seuil a été arbitré en fermant O-55 ;
  //  · la MONNAIE est la MINUTE, la distance se dérive. Le bloc est prescrit en mètres, mais le
  //    CSS de l'athlète S'AMÉLIORE sur le plan (modèle de gain O-68) : une cible en mètres
  //    donnerait MOINS de dose à un nageur qui progresse — l'inverse exact de ce qu'on veut. Le
  //    plafond de dose étant déjà en minutes, la trajectoire s'y applique et la distance suit
  //    (effet secondaire vrai et lisible : la distance affichée monte quand le CSS s'améliore) ;
  //  · la POSITION court sur TOUT le plan (base → pic), là où le brick n'existe qu'en spec+peak.
  //    Une nage seuil est prescrite dès la semaine 1 : sa trajectoire doit partir de là.
  const _ORD = ["base", "dev", "spec", "peak"];
  const _iPh = _ORD.indexOf(phase);
  const _wTot = _ORD.reduce((t, id) => t + (r.phases.find((p) => p.id === id)?.weeks || 0), 0);
  const _wAvant = _ORD.slice(0, Math.max(0, _iPh)).reduce((t, id) => t + (r.phases.find((p) => p.id === id)?.weeks || 0), 0);
  const _wIci = _iPh >= 0 ? (r.phases.find((p) => p.id === phase)?.weeks || 0) : 0;
  // Hors des quatre phases de construction (affûtage), la trajectoire ne s'applique pas : la
  // décroissance de l'affûtage a ses propres règles (R3.13) et pousser y serait une seconde
  // autorité sur la même grandeur.
  const _tSw = _iPh < 0 || _wTot <= 0 ? 1
    : Math.max(0, Math.min(1, (_wAvant + prog * Math.max(1, _wIci)) / Math.max(1, _wTot)));
  const _gSw = Math.pow(PROG_DOSE_DEPART, 1 - _tSw);
  const swimDistCaps = ({ S: { lo: 300, hi: 750 }, M: { lo: 600, hi: 1500 }, "70.3": { lo: 950, hi: 1900 }, Full: { lo: 1600, hi: 3000 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 600, hi: 1500 };
  const swimDist = PT(swimDistCaps.lo, swimDistCaps.hi);
  const triSwimVolCap = ({ S: 1050, M: 2100, "70.3": 3000, Full: 4500 } as Record<string, number>)[fmt] || 2100;
  // C24 — même la nage récup tri : ≥750m pour un non-débutant
  const swShortDist = beginner ? Math.min(600, Math.max(200, Math.round((swimDist * 0.4) / 50) * 50)) : Math.min(1100, Math.max(750, Math.round((swimDist * 0.6) / 50) * 50));
  const swTechDist = Math.max(beginner ? 300 : 750, Math.round((swimDist * 0.5) / 50) * 50);
  let swMain = beginner
    ? { name: "Nage seuil technique (+dist)", note: "Technique d'abord, mais quelques 100m à allure seuil contrôlée pour préparer la course.", steps: [Wm(200, "souple"), Object.assign(Bd(1, swimDist, "sw.css", [0.33, "repos libre entre séries (~20s)"], ", fractionné en séries régulières, éducatifs entre", false, "sw"), { bnd: { floor: swimDistCaps.lo, cap: triSwimVolCap }, progCap: _gSw }), Cm(100, "relâché")] }
    // R13 — une séance de seuil nage n'est pas 100 % seuil : le corps se répartit ~70 % au CSS
    // et ~30 % en aérobie (retour actif, éducatifs entre les séries). Compter tout le corps en
    // dur surchargeait l'intensité hebdomadaire de 6-8 min — ce qui faisait passer 10
    // combinaisons tri sous le plancher de temps facile une fois la nage mono-séance branchée.
    : { name: "Nage seuil (+dist)", note: "Distance cible atteinte, allure régulière. Fractionné = réponse à intensité.", steps: [Wm(300, "+ 4×50m éducatifs"), Object.assign(Bd(1, Math.max(200, Math.round((swimDist * 0.7) / 50) * 50), "sw.css", "15-20s", ", fractionné en séries régulières si besoin", false, "sw"), { bnd: { floor: Math.max(200, Math.round((swimDistCaps.lo * 0.7) / 50) * 50), cap: Math.round(triSwimVolCap * 0.7) }, progCap: _gSw }), Object.assign(Bd(1, Math.max(150, Math.round((swimDist * 0.3) / 50) * 50), "sw.aero", "", " souple, technique relâchée entre les séries", false, "sw"), { bnd: { floor: 150, cap: Math.round(triSwimVolCap * 0.3) } }), Cm(200, "souple")] };
  let swTech = beginner
    ? { name: "Nage éducatifs", note: "Zéro chrono ici : uniquement le geste. Alterne les éducatifs, ne les enchaîne pas en force.", steps: [Wm(100, "souple"), Bd(1, swTechDist, "sw.easy", "20-30s", ", par 50m, 1 point technique à la fois — " + swimDrillGlossary, false, "sw"), Cm(100, "dos souple")] }
    // O-88 — le COMPTE d'accélérations est une constante absolue, jamais une fraction du bloc :
    // « la moitié en accélérations » donnait le plus de répétitions techniques exactement quand
    // le geste est le moins bon (bloc long = fatigue), 81 accélérations mesurées sur le livré.
    : { name: "Nage aérobie + accélérations", note: "Le gros du volume est aérobie, avec des accélérations de 50m pour tenir la fréquence : c'est du volume nagé propre, pas une séance de vitesse. Place les accélérations tôt dans le bloc, geste frais — une accélération faite sur un geste dégradé enseigne le geste dégradé.", steps: [Wm(200, "+ 4×25m accélérations progressives"), Bd(1, swTechDist, "sw.aero", "30-40s sur les 50m rapides", ", en 50m accéléré / 50m souple au début du bloc — " + O88_NB_ACCELERATIONS + " accélérations au plus, puis aérobie continu", false, "sw"), Cm(150, "souple")] };
  // B1c (audit v6) — l'épaule existait pour les triathlètes dans le QUESTIONNAIRE mais
  // pas dans le générateur (branche morte : le traitement vivait sous sp === "swim").
  // Ici : mêmes substitutions que le nageur, au budget de la séance remplacée (bnd).
  if (inj.shoulder) {
    const shoulderDist = Math.max(swimDistCaps.lo, Math.round((swimDist * 0.8) / 50) * 50);
    swMain = { name: "Nage seuil contrôlé (épaule)", note: "Volume modéré, technique soignée : on épargne l'épaule, on ne cherche pas la performance brute. Arrêt au moindre signal articulaire.", steps: [Wm(200, "souple + éducatifs doux"), Object.assign(Bd(1, shoulderDist, "sw.css", "20-30s", ", fractionné en 100m, amplitude confortable", false, "sw"), { bnd: { floor: swimDistCaps.lo, cap: shoulderDist }, progCap: _gSw }), Cm(100, "souple")] };
    swTech = { name: "Jambes + technique (épaule épargnée)", note: "Le travail passe par les jambes (battements planche) et la technique : la charge articulaire de l'épaule reste minimale.", steps: [Object.assign(Bd(1, swTechDist, null, "", " séries battements planche + éducatifs · épargne épaule", false, "sw"), { bnd: { floor: 300, cap: swTechDist } })] };
  }
  // B-17 — LA NAGE CONTINUE À LA DISTANCE DE COURSE, sur les paliers de la phase SPÉCIFIQUE.
  //
  // Elle TRANSFORME « Nage seuil (+dist) », elle n'ajoute pas de séance et surtout **elle ne marque
  // rien en `long`** : `blockBounds` rend `if (s.long) { if (s.d === "sw") … cap: CAP_SWIM[fmt] }`,
  // et `CAP_SWIM.Full` vaut 3 000 — marquer la séance écrêterait à 3 000 m exactement la continuité
  // de 3 800 que cette règle existe pour prescrire. Le marquage importerait en outre les
  // sémantiques d'impact de `s.long` (C30, exclusions de réallocation, tail O-21), écrites pour des
  // longues de COURSE, dans une discipline qui n'en a pas.
  //
  // PAS À CHAQUE SEMAINE : « Nage seuil (+dist) » est le principal véhicule du travail au seuil en
  // nage (885 occurrences mesurées) ; la transformer partout retirerait l'essentiel du seuil sur
  // toute la phase. Le nombre de paliers est proportionné à l'ÉCART (`palierCount`) — divergence
  // VOULUE avec `trailLibrary`, qui transforme dès que `rehearsalNeeded`.
  //
  // LE PREMIER PALIER PORTE LA CONSIGNE EAU LIBRE, et c'est un placement, pas une décoration : la
  // séance en conditions réelles VALIDE l'hypothèse que le gate a faite à la construction (il
  // accepte une preuve en BASSIN pour une capacité en EAU LIBRE). Découvrir trois semaines avant
  // l'épreuve que l'eau libre est bien plus dure laisse le temps de s'inquiéter, pas celui de
  // s'adapter — elle tombe donc TÔT, indépendamment du palier de distance atteint.
  // UNE SEULE PAR SEMAINE, ET LA MONTÉE EST MONOTONE. Deux défauts mesurés au rendu, chacun avec
  // sa cause propre — et la première hypothèse (« la transformation n'a pas d'ordinal ») était
  // FAUSSE : `k` dérive de `weekNum` et de `spec.start`, il est parfaitement ordonné.
  //   · D1 — le créneau `facile2` est une CATÉGORIE, pas une position : mesuré, **29 semaines
  //     sur 308** portent DEUX jours `facile2` (le gabarit de `weekBuilder` le déclare deux
  //     fois). Les deux jours recevaient donc la même nage continue, avec le même `bnd`. Le
  //     départage est EXPLICITE et écrit — `slotIdx === 0`, le premier jour du créneau en ordre
  //     calendaire —, jamais l'ordre d'itération d'une liste, qui serait déterministe par
  //     ACCIDENT et ferait revenir D1 sous forme de flake au premier tri ajouté ailleurs ;
  //   · D2 — les distances livrées n'étaient pas croissantes (Full : 1 763 → 3 295 → **2 090**),
  //     et **19 paliers sur 31** tombaient sous leur cible, jusqu'à −1 710 m. Le bloc était déjà
  //     `floor = cap = cible`, mais `blockBounds` REMPLACE le plancher déclaré d'un bloc en
  //     distance par le sien (`Math.min(bnd.floor, 750)`, cas O-26) : l'épinglage était inerte.
  //     Il porte désormais `pinned: true`, que `blockBounds` rend tel quel.
  //   · D3-b — LE VÉHICULE N'ÉTAIT PAS TOUJOURS CELUI QUE JE TRANSFORMAIS. Mesuré sur 351 plans
  //     qui ANNONÇAIENT la construction : **277 ne la contenaient pas (79 %)**, et la ventilation
  //     donne la cause — `finir` 117, `plaisir` 117, `debutant` 117 contre `competition` 43. Le
  //     créneau `facile2` route ces profils vers `swTech` (« Nage vitesse »), pas vers `swMain` :
  //     je mutais un objet qu'ils ne reçoivent jamais. Et sous DOUBLES, `swMain` part sur `dur1`,
  //     donc la transformation posée depuis `facile2` était perdue de la même façon. Le placement
  //     ne bouge pas (§4 de l'arbitrage) : c'est le créneau porteur de la nage PRINCIPALE qui est
  //     lu — `dur1` en doubles, `facile2` sinon —, et le routage par intention est court-circuité
  //     pour cette seule séance. La population la plus concernée est justement celle qui a le plus
  //     besoin de la continuité : un débutant qui vise un finish en eau libre.
  //   · D4 — LE PORTEUR ÉTAIT UN CRÉNEAU QUE LE BUDGET DE SÉANCES SUPPRIME (retour du premier
  //     usage réel, 17/08/2026). Sous DOUBLES, `swMain` part sur `dur1` en séance « (matin) »,
  //     c'est-à-dire la SECONDE séance d'une journée double — exactement ce que la coupe par
  //     `sessions_max` retire en premier. Mesuré sur un 70.3 de 40 semaines, à un seul facteur
  //     près (le budget) :
  //
  //         sessions_max ≤ 7 → véhicule « (matin) » 31 → 3 occurrences · continues 3 → 1
  //         sessions_max ≥ 8 → véhicule 31 · continues 2 (le palier du milieu manquait encore)
  //
  //     La progression était CALCULÉE juste (départ 1 000 m → 1 250 / 1 550 / 1 900, atteignable
  //     17 449 m : ni la projection ni le compte de paliers n'étaient en cause) et DÉTRUITE plus
  //     loin, sans que rien ne le signale. C'est la treizième occurrence de la famille la plus
  //     coûteuse du dépôt — « une garantie posée au milieu du pipeline ne survit pas aux passes
  //     suivantes » —, cette fois dans le sens où la garantie est SUPPRIMÉE avec son support.
  //
  //     Le porteur devient donc `facile2` DANS TOUS LES CAS. Ce n'est pas revenir sur D3-b : ce
  //     que D3-b corrigeait, c'est que le routage par intention envoyait le créneau vers
  //     `swTech` — et il est court-circuité depuis, par le `if (b17Pose)` qui passe DEVANT tout
  //     le routage du créneau, y compris devant la « Nage récup courte » des doubles. La prémisse
  //     « sous doubles, `facile2` ne porte pas la nage principale » était vraie du ROUTAGE et
  //     fausse de la SÉANCE CONTINUE, qui ne passe plus par ce routage.
  //
  //     Ça ne coûte AUCUNE séance : mesuré, 5,0 · 5,8 · 6,5 · 7,3 séances/semaine avant comme
  //     après, aux neuf budgets balayés — la continue REMPLACE la récup courte de ces 3 semaines
  //     au lieu de s'ajouter. Et les trois paliers sont livrés à TOUS les budgets, y compris les
  //     plus serrés, là où l'ancien porteur n'en livrait qu'un.
  const b17Slot = "facile2";
  let b17Pose = false;
  if ((phase === "spec" || phase === "dev") && slot === b17Slot && slotIdx === 0 && !inj.shoulder && !medHold) {
    // D3 §3b — LA PROGRESSION PART DE L'ATHLÈTE. Le gate reçoit la durée RÉELLE du plan (`r.weeks`),
    // sans quoi son point de départ et sa franchissabilité seraient calculés sur un horizon par
    // défaut — et la séance prescrite ne correspondrait pas à la décision affichée (R11.1).
    //
    // ⚠ MA PREMIÈRE ÉCRITURE LISAIT `r.totalWeeks`, QUI N'EXISTE PAS sur `ReasonedPlan` (le champ
    // s'appelle `weeks` ; `totalWeeks` est celui du PLAN GÉNÉRÉ). `undefined` traversait sans bruit
    // jusqu'à `weeks ?? 0`, la travée tombait à 1 semaine, et le Full « je ne sais pas » prescrivait
    // **3 600 → 3 800 m** au lieu de 551 → 1 048 → 1 993 → 3 800 : une « progression » qui commence
    // à 95 % de la distance de course, c'est-à-dire l'inverse d'une progression.
    const g = continuityGate(a as Record<string, unknown>, r.weeks);
    const spec = (r.phases || []).find((ph) => ph.id === "spec");
    const dev = (r.phases || []).find((ph) => ph.id === "dev");
    if (g && spec) {
      const len = Math.max(1, spec.end - spec.start);
      // O-95 — LA DISPOSITION VIENT DU POINT UNIQUE `palierLayout` (l'annonce `B17-paliers` lit
      // la même fonction — c'est le calcul dupliqué qui avait produit O-84a, l'annonce comptant
      // le test comme un palier). Quand la spec ne peut porter que 2 créneaux, le TEST glisse en
      // fin de développement : la mesure se prend le plus tôt possible (l'argument de D3
      // lui-même), et la spec garde ses deux paliers — l'eau libre en PREMIÈRE semaine au lieu
      // de la dernière, la distance finale en dernière.
      const lay = palierLayout(g, len, dev ? Math.max(0, dev.end - dev.start) : 0);
      // D3 — BORNÉ PAR LA PLACE. Sans cette borne, `positions` collapse plusieurs paliers sur la
      // même semaine et `indexOf` ne rend que le premier de chaque groupe : le DERNIER palier,
      // celui qui vaut la distance de course, n'était jamais posé.
      const n = lay.nSpec;
      const idx = Math.max(0, Math.min(len - 1, weekNum - 1 - spec.start));
      const positions = Array.from({ length: n }, (_, i) => (n <= 1 ? 0 : Math.round((i * (len - 1)) / (n - 1))));
      const kSpec = phase === "spec" ? positions.indexOf(idx) : -1;
      const testEnDevIci = phase === "dev" && lay.testEnDev && !!dev && weekNum === dev.end;
      if (kSpec >= 0 || testEnDevIci) {
        // `step` est l'index dans la PROGRESSION COMPLÈTE (test compris) : le test vaut 0, les
        // paliers de spec suivent — avec `testEnDev`, le k-ième créneau de spec est le pas k+1.
        const step = testEnDevIci ? 0 : lay.testEnDev ? kSpec + 1 : kSpec;
        const cible = Math.max(200, Math.round(palierDistanceM(g, step, lay.nProgression) / 50) * 50);
        // D3 (arbitrage « je ne sais pas n'est pas une valeur », 16/08/2026) — QUAND LA CONTINUITÉ
        // N'EST PAS MESURÉE, LA PREMIÈRE SÉANCE EST UN TEST, PAS UN PALIER.
        //
        // « L'inconnu n'est pas une valeur par défaut : c'est une mesure manquante, et le moteur
        // sait déjà en réclamer une. » C'est le mécanisme qui existe pour la FTP et le CSS —
        // quand le moteur a besoin d'un nombre qu'il n'a pas, il PRESCRIT LE TEST QUI LE PRODUIT.
        // Ça referme l'inversion sans punir personne : celui qui déclare 400 m reçoit la même
        // chose que celui qui ne sait pas, PLUS une évaluation que l'autre attend encore ; et le
        // silence ne fait plus gagner, il produit une TÂCHE, pas un laissez-passer.
        //
        // LE TEST EST EN BASSIN, ET C'EST LE POINT DE SÉCURITÉ. Un effort « aussi loin que tu
        // peux » chez quelqu'un dont personne ne connaît la continuité est exactement le scénario
        // que B-17 existe pour empêcher en eau libre — le mur tous les 25 m est ce qui rend ce
        // test acceptable. La consigne eau libre se décale donc au palier SUIVANT.
        const test = lay.nTest === 1 && step === 0;
        const ow = step === lay.nTest;
        b17Pose = true;
        swMain = test ? {
          name: "Test de continuité — aussi loin que possible, sans t'arrêter",
          note: "Tu as répondu que tu ne connais pas ta plus longue nage en continu : cette séance est là pour "
            + "la mesurer, et ton plan de nage s'ajustera dessus. EN BASSIN, où tu peux t'arrêter à chaque mur. "
            + "Nage sans t'arrêter aussi loin que tu peux, à une allure que tu tiendrais une heure — ce n'est ni "
            + "un chrono ni une séance de volume. NOTE LA DISTANCE et reporte-la dans ton profil : tant qu'elle "
            + "manque, l'évaluation de ta natation reste en attente et le plan avance sur une hypothèse.",
          steps: [Wm(B17_ECHAUF_M, "souple, montée progressive"),
            // NON ÉPINGLÉ, délibérément : la distance est ce qu'on MESURE, pas ce qu'on impose.
            // `cible` n'est que le budget que le plan réserve à la séance.
            Bd(1, cible, "sw.aero", "", ", SANS ARRÊT — va au bout de ce que tu tiens", false, "sw"),
            Cm(B17_RETOUR_M, "relâché")],
        } : {
          name: "Nage continue" + (ow ? " en eau libre" : "") + " — " + cible + " m d'affilée",
          note: (ow
            ? "En conditions RÉELLES si tu le peux : eau libre, et en combinaison si ta course l'est. "
            : "")
            + "Sans arrêt, sans mur, allure régulière que tu tiendrais une heure. Ce n'est pas une séance de volume : "
            + "c'est la continuité qu'on construit, et elle ne s'obtient pas en additionnant des séries. "
            + "Lève la tête tous les 6 à 10 cycles pour te repérer — ça casse la position, ça s'apprend en le faisant.",
          // Le bloc est ÉPINGLÉ (floor = cap) : dans une nage continue, la distance EST le
          // stimulus, exactement comme la durée d'une répétition l'est dans un intervalle (I14).
          // La réduire ne rend pas la séance plus facile, elle lui retire son objet.
          steps: [Wm(B17_ECHAUF_M, "souple, montée progressive"),
            Object.assign(Bd(1, cible, "sw.aero", "", ", SANS ARRÊT", false, "sw"), { bnd: { floor: cible, cap: cible, pinned: true } }),
            Cm(B17_RETOUR_M, "relâché")],
        };
      }
    }
  }

  const swShort = { recovery: true, name: "Nage récup", note: "Récupération dans l'eau : relâchement total, respiration ample — le corps absorbe le travail de la semaine.", steps: [Bd(1, swShortDist, "sw.easy", "", " souple, en blocs de 50m, respiration 3 temps · relâchement total", false, "sw")] };
  if (slot === "dur1") {
    if (dbl) S2.push({ d: "sw", name: swMain.name + " (matin)", note: swMain.note, det: "", steps: swMain.steps });
    if (phase === "base") S2.push({ d: "bk", name: "Sweetspot vélo", note: "Cadence 85-95 rpm, soutenu mais maîtrisé.", det: "", steps: [W(15, "montée progressive"), Object.assign(B(PT(2, 3), PT(12, 18), "bk.ss", "5min souple"), { repCap: 4 }), C(10, "décrassage")] });
    else if ((phase === "spec" || phase === "peak") && !noVo2) S2.push({ d: "bk", name: "VO2max vélo", note: "Puissance aérobie maximale, maintenue jusqu'au pic — pas abandonnée en spécifique (la race-pace vélo est travaillée dans le brick).", det: "", steps: [W(20, "progressif + 3 sprints"), Object.assign(B(PT(4, 6), 4, "bk.vo2", "4min récup"), { repCap: 8 }), C(10, "souple")] });
    else if (phase === "taper") S2.push({ d: "bk", name: "Rappel race-pace", note: "Affûtage : on réveille l'allure course sans générer de fatigue. Court et précis.", det: "", steps: [W(10, "progressif"), Object.assign(B(PT(2, 3), PT(6, 10), "bk.rp", "3min souple"), { repCap: 4 }), C(5, "décrassage")] });
    else if (lvl === "debutant" || finisher) S2.push({ d: "bk", name: "Tempo vélo", note: "Confortablement soutenu, jamais dans le rouge.", det: "", steps: [W(15, "souple"), Object.assign(B(PT(2, 3), PT(8, 15), "bk.ss", "4min souple"), { repCap: 4 }), C(10, "décrassage")] });
    else if (!noVo2) S2.push({ d: "bk", name: "VO2max vélo", note: "Intensité max tenable 4min, récup quasi complète entre.", det: "", steps: [W(20, "progressif + 3 sprints"), Object.assign(B(PT(4, 6), 4, "bk.vo2", "4min récup"), { repCap: 8 }), C(10, "souple")] });
    else S2.push({ d: "bk", name: "Tempo vélo", note: "Confortablement soutenu, jamais dans le rouge — la VO2max attendra la majorité (R6.3).", det: "", steps: [W(15, "souple"), Object.assign(B(PT(2, 3), PT(8, 15), "bk.ss", "4min souple"), { repCap: 4 }), C(10, "décrassage")] });
  } else if (slot === "dur2") {
    // B2 (LOT VOLUME + RÉPARTITION, 20/08/2026) — LE DOUBLAGE ALTERNE SA DISCIPLINE.
    //
    // *« Le doublage devrait ajouter dans la discipline qui en a besoin, pas toujours dans la
    // même »* (fondateur). Mesuré : `doubles: oui` ajoutait deux séances par semaine, **toutes
    // les deux en natation**, sur une épreuve dont la nage fait 12 % du temps de course — c'est
    // la quatrième occurrence de la prédiction « tout mécanisme qui sélectionne par POSITION,
    // TAILLE ou ORDRE frappe la natation par défaut », ici dans l'autre sens (elle en reçoit
    // trop). Le créneau `dur1` garde son doublage nage : c'est la séance de qualité de la
    // discipline limitante. Celui-ci ALTERNE — semaines impaires en vélo.
    //
    // ⚠ LA PHASE COMPTE AUTANT QUE LA FRÉQUENCE (§4 du fondateur, mesuré au lot vélo) : cette
    // pièce et le créneau long vélo (B1) tombaient d'abord la MÊME semaine et EMPILAIENT la
    // charge (nage 37 %, vélo 43 %) ; décalées — long vélo en semaines PAIRES, doublage vélo en
    // semaines IMPAIRES — la charge se répartit (nage 29 %, vélo 47 %). Personne n'aurait prédit
    // cette interaction calendaire ; c'est la mesure qui l'a montrée.
    //
    // ⚠ EXCLUSIONS, TOUTES SUR DES RÈGLES EXISTANTES (jamais un périmètre ad hoc) :
    //   · blessure ou drapeau médical → jamais (B1 du banc v6 : « déclarer une blessure ne doit
    //     JAMAIS augmenter la charge » ; le module remplace déjà la discipline touchée par du
    //     vélo, et la pièce s'empilait dessus — mesuré +6 à +10 %) ;
    //   · préparations de moins de 12 semaines → jamais (C22 : ajouter un type sur un tri/S de
    //     8 semaines faisait passer un saut de charge à +11 %).
    const _alterneOK = dbl && !inj.count && !medHold && r.weeks >= 12;
    if (dbl && _alterneOK && weekNum % 2 === 1 && phase !== "taper") S2.push({ d: "bk", name: "Endurance vélo", note: "Endurance pure sur le vélo : la discipline qui pèse la moitié de ta course, et celle qui se construit avec le moins de casse. Cadence libre, aucune intensité — c'est du foncier, pas une séance de plus à réussir.", det: "", steps: [W(10, "montée progressive"), Object.assign(B(1, PT(40, 75), "bk.z2", "", " · cadence libre, souple"), { bnd: { floor: 30, cap: 90 } }), C(10, "décrassage")] });
    else if (dbl) S2.push({ d: "sw", name: swTech.name, note: swTech.note, det: "", steps: swTech.steps });
    if (phase === "spec" || phase === "peak") S2.push({ d: "rn", name: "Allure course (tri)", note: "L'allure de course du jour J : mémorise la sensation, jambes déjà entamées par le vélo.", det: "", steps: [W(15, "footing progressif"), Object.assign(B(1, PT(20, 40), "rn.mara"), { bnd: { floor: 20, cap: 45 } }), C(8, "retour au calme")] });
    // R13.4 — L'AFFÛTAGE EST BRANCHÉ EXPLICITEMENT, plus jamais par un `else` attrape-tout.
    // Le fall-through envoyait la FORCE basse cadence (bk.frc) en plein affûtage : 6 blocs de
    // gros braquet sur le Full, dont un à J-3 de l'Ironman. La force à 50-60 rpm laisse la
    // même fatigue résiduelle que la VO2max (48-72 h de courbatures profondes) — le manifeste
    // interdit l'une, l'autre y était par accident de branchement. À la place : un rappel
    // d'allure course à pied, court et précis, le miroir exact du « Rappel race-pace » vélo.
    else if (phase === "taper") S2.push({ d: "rn", name: "Rappel allure course CAP", note: "Affûtage : on réveille l'allure du jour J sans générer de fatigue. Deux blocs courts, précis, puis on range les chaussures.", det: "", steps: [W(10, "footing progressif"), Object.assign(B(2, 8, "rn.mara", "3min trot"), { repCap: 2, bnd: { floor: 6, cap: 8, hard: true } }), C(5, "footing souple")] });
    // C2 / B-10 (LOT VOLUME + RÉPARTITION, 20/08/2026) — QUAND ON DOUBLE LES HEURES DE VÉLO, CE
    // QU'ON Y MET DEVIENT LA QUESTION PRINCIPALE.
    //
    // Mesuré sur le profil réel : **18 « Force basse cadence » contre 8 « Sweetspot vélo »** —
    // le rapport est inversé pour l'épreuve visée. Le sweetspot (88-94 % de la FTP à
    // l'entraînement) est la séance qui construit l'allure d'un 70.3, dont le jour J se roule à
    // 76-83 % ; la force basse cadence est un travail de force-endurance, utile pour POSER le
    // foncier musculaire, pas pour construire la durabilité à l'allure de course.
    //
    // Le créneau garde donc la force en phase de BASE — c'est sa phase — et passe au sweetspot
    // en DÉVELOPPEMENT, où `dur1` porte déjà la VO2max : la semaine de dev devient VO2max +
    // sweetspot, ce qu'un entraîneur prescrit pour cette épreuve. Aucune séance n'est supprimée,
    // c'est une question de PHASE — la même forme que R13.4 (« l'affûtage est branché
    // explicitement, plus jamais par un `else` attrape-tout »).
    else if (phase === "dev") S2.push({ d: "bk", name: "Sweetspot vélo", note: "L'allure qui construit un long : soutenu mais tenable, cadence 85-95 rpm. C'est le cœur de la préparation vélo d'un triathlon longue distance — le jour J se roule plus bas, mais c'est ici que le plafond se construit.", det: "", steps: [W(15, "montée progressive"), Object.assign(B(PT(2, 3), PT(12, 20), "bk.ss", "5min souple"), { repCap: 4 }), C(10, "décrassage")] });
    else S2.push({ d: "bk", name: "Force basse cadence", note: "Gros braquet, cadence basse : musculaire, pas cardio. Sans forcer sur les genoux.", det: "", steps: [W(15, "+ montée en intensité"), Object.assign(B(PT(4, 6), ({ S: 5, M: 5, "70.3": 6, Full: 7 } as Record<string, number>)[fmt] || 5, "bk.frc", "3min souple", " à 50-60 rpm"), { repCap: 8 }), C(10, "moulinage")] });
  } else if (slot === "durLong") {
    // O-91 (relecture REEL, 19/08/2026) — LA DÉCISION QUE PERSONNE N'AVAIT ÉCRITE : en spécifique
    // et en pic, le créneau long EST le brick — la « Sortie longue CAP » n'existe qu'en base/dev,
    // et s'arrête donc à la fin du dev (S22 sur le plan réel : 20 semaines sans course > 68 min
    // avant un semi, la CAP longue ne survivant que dans les 23-30 min de fin de brick). C'est un
    // choix de construction (la séance la plus spécifique du tri est l'enchaînement, pas la
    // course sèche), pas un oubli — mais SA CONSÉQUENCE (aucune sortie longue course sèche en
    // 2ᵉ moitié de prépa) n'a jamais été arbitrée : c'est la pièce « sortie longue » du lot
    // progression (O-91), qui devra inclure la PRÉSENCE, pas seulement la taille.
    if (phase === "spec" || phase === "peak") {
      // C21 — brick borné par format, ×0.8 en reprise (appliqué aussi dans blockBounds)
      const rf = a.history === "reprise" ? C21_REPRISE_BRICK_FACTOR : 1;
      const bb = ({ S: { lo: 45, hi: 90 }, M: { lo: 60, hi: 120 }, "70.3": { lo: 90, hi: 180 }, Full: { lo: 150, hi: 300 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 60, hi: 180 };
      const br = ({ S: { lo: 10, hi: 20 }, M: { lo: 12, hi: 24 }, "70.3": { lo: 16, hi: 32 }, Full: { lo: 35, hi: 70 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 15, hi: 30 };
      // Répartition des intensités (manifeste) : le brick roule en Z2, le DERNIER TIERS
      // passe à l'allure course — la spécificité (transition, jambes entamées) est gardée
      // sans transformer 2 à 5h hebdo en zone grise (tri mesuré à 54-67% de temps facile).
      // R19.5 — LA PROSE NE PROMET PLUS CE QUE LA STRUCTURE NE PORTE PAS.
      //
      // La note disait « vélo en endurance, dernier tiers @ allure course » et le step portait
      // `bk.z2` sur la TOTALITÉ du vélo. Mesuré sur un plan 70.3 : **881 min (14,7 h) d'allure
      // course annoncées à l'athlète, portées par aucun step et comptées 100 % facile** par la
      // répartition d'intensité. Un commentaire l'assumait pour ne pas faire tomber la part de
      // temps facile — c'est-à-dire qu'on protégeait la MÉTRIQUE, pas le plan. Le dépôt a déjà
      // payé cette leçon en R7 TRAIL : une intensité portée par une phrase n'existe pas.
      //
      // R20.5 — LE TIERS À ALLURE COURSE EXISTE ENFIN, PARCE QUE O-11 EST FERMÉ.
      //
      // R19.5 avait fermé le trou de PROSE (la note ne promet plus une intensité qu'aucun step
      // ne porte) et laissé la structure de côté, avec deux motifs mesurés : le tiers en
      // `bk.rp` mettait 58 combinaisons de tri sous le plancher de temps facile, et surtout
      // `bk.rp` valait 0,80-0,88 de la FTP quand le jour J d'un 70.3 se roule à 0,76-0,83 —
      // construire dessus aurait fait rouler plus dur que la course elle-même.
      //
      // Les deux motifs sont levés dans ce lot : `bk.rp` EST désormais l'allure course de
      // l'épreuve (relief compris), et le plancher de temps facile n'est plus la règle qui
      // gouverne l'intensité — C26c borne le temps DUR, or l'allure course vélo est MODÉRÉE.
      // C'était la vraie raison de l'ordre de ces cinq lots.
      //
      // Deux blocs, un seul leg vélo pour l'auditeur (il somme) : les deux tiers en endurance,
      // le dernier à l'allure exacte du jour J. Chaque bloc porte sa PART des bornes du format,
      // sinon un brick coupé en deux hériterait deux fois du plancher.
      // UN SEUL CRITÈRE, POUR DEUX DÉCISIONS. La bande d'allure course de l'épreuve décide à la
      // fois de la CLASSE de l'effort (dur au-dessus de 0,85 × FTP — bas de la zone seuil de
      // Coggan) et de l'EXISTENCE du tiers. Ce n'est pas une commodité : sur un sprint, la cible
      // du jour J vaut 0,85–0,93 × FTP, c'est-à-dire du seuil, et le segment vélo de l'épreuve
      // dure vingt minutes. Y ajouter un bloc de seuil DANS le brick, sur une enveloppe de 3 h,
      // c'est charger de l'intensité que les séances de qualité portent déjà — mesuré : 30
      // combinaisons de tri/S sous le plancher de temps facile, à 66-70 %. Sur un 70.3 ou un
      // Ironman, l'allure course est au contraire une allure qu'on TIENT (0,70–0,83), et
      // l'apprendre pendant des heures est précisément l'objet de la séance.
      //
      // Le brick d'un sprint garde donc son rôle : la transition. Celui d'un long y ajoute le
      // pacing. C'est ce qu'un entraîneur ferait, et c'est ce que la mesure dit.
      const rpBand = TRI_BIKE[fmt || ""];
      const tiersRp = !!rpBand && rpBand.hi < 0.85;
      // LOT PROGRESSION (pièce 1) — LE BRICK A UNE TRAJECTOIRE, PAS UNE TAILLE. Mesuré
      // (`mesure:progression`, profil fondateur) : dix bricks IDENTIQUES à 212 min de S25 à
      // S38 — saturés à leurs bornes hautes dès la première occurrence, parce que la boucle de
      // volume amène chaque semaine au même point fixe et qu'aucune borne ne varie avec la
      // position. Le gabarit portait une progression de phase (PT/prog) que la boucle
      // DÉTRUISAIT. La trajectoire vit donc dans les BORNES (note de conception B-17 :
      // `borne(type, semaine) = f(départ, cible du format, position)`) : le PLAFOND des legs
      // interpole GÉOMÉTRIQUEMENT (C22 est un rapport) du bas audité du format (C21b — la
      // taille d'entrée conçue) au haut audité, sur la position dérivée des PHASES spec+peak
      // (jamais du calendrier absolu). À volume hebdomadaire constant (O-69), la progression
      // du brick est une RECOMPOSITION : les minutes viennent des séances faciles — « maintien
      // de volume, changement de contenu », le fond physiologique d'O-69 lui-même.
      const _phS = r.phases.find((p) => p.id === "spec"), _phP = r.phases.find((p) => p.id === "peak");
      const _wS = _phS ? _phS.weeks : 0, _wP = _phP ? _phP.weeks : 0;
      const _tBr = Math.max(0, Math.min(1, phase === "peak"
        ? (_wS + prog * Math.max(1, _wP)) / Math.max(1, _wS + _wP)
        : (prog * _wS) / Math.max(1, _wS + _wP)));
      const _gBike = Math.pow(bb.lo / bb.hi, 1 - _tBr);
      const _gRun = Math.pow(br.lo / br.hi, 1 - _tBr);
      const bikeTot = PT(bb.lo, Math.round(bb.hi * rf));
      const bikeZ2 = tiersRp ? Math.max(1, Math.round(bikeTot * 2 / 3)) : bikeTot;
      const bikeRp = Math.max(0, bikeTot - bikeZ2);
      S2.push({ d: "br", long: true, brick: true, name: "Brick vélo+CAP", note: "Le brick simule la course : sortie longue à vélo en endurance, "
        + (tiersRp
          ? "DERNIER TIERS à l'allure exacte de ton jour J (c'est là qu'on apprend le chiffre à tenir), "
          : "")
        + "puis enchaînement rapide vélo→course pour habituer tes jambes à la sensation «de coton» du début de CAP. C'est la transition qu'on entraîne ici — la séance la plus spécifique de ta semaine.", det: "", steps: [
        Object.assign({ role: "body", leg: "bike", durationMin: bikeZ2, zone: "bk.z2", intensity: intOf("bk.z2") as unknown as string, progCap: _gBike } as V1Step, { share: tiersRp ? 2 / 3 : 1 }),
        // `rpBand` accompagne le step : c'est la bande réelle de CETTE épreuve, et c'est elle
        // qui décide si l'effort compte dur ou modéré (R20.5).
        ...(tiersRp ? [Object.assign({ role: "body", leg: "bike", durationMin: bikeRp, zone: "bk.rp", intensity: intOf("bk.rp") as unknown as string, suffix: " à l'allure de ton jour J", progCap: _gBike } as V1Step, { share: 1 / 3, rpBand })] : []),
        { role: "body", leg: "run", durationMin: PT(br.lo, Math.round(br.hi * rf)), d: "rn", progCap: _gRun } as V1Step,
      ], ...( { runInj } as object) });
    } else if (phase === "taper" && !medHold && kit.weekNum < kit.r.weeks) {
      // R18.4 — L'AFFÛTAGE GARDAIT LE VOLUME BAS ET PERDAIT LA SPÉCIFICITÉ.
      // Mesuré sur les 4 formats × 2 niveaux : le dernier enchaînement vélo→course tombait
      // TROIS SEMAINES avant le jour J, sur toutes les combinaisons. R13.4 avait branché
      // l'affûtage explicitement sur `dur1` et `dur2` — `durLong`, lui, retombait encore
      // dans le `else` générique et rendait une sortie longue à pied. Le triathlète arrivait
      // donc au départ sans avoir posé le pied par terre après le vélo depuis 21 jours, sur
      // la transition qui est précisément la difficulté propre du sport.
      // Le swimrun, lui, garde sa séance pivot en affûtage (sa `durLong` n'a jamais eu de
      // garde de phase) : le modèle existait déjà dans le dépôt, il n'était pas appliqué ici.
      //
      // Ce que l'affûtage change, ce n'est pas la NATURE de la séance, c'est sa DOSE : même
      // motif, un tiers du volume du pic, allure course des deux côtés. Bosquet 2007 —
      // l'affûtage réduit le volume, PAS l'intensité ni la spécificité.
      const rf = a.history === "reprise" ? C21_REPRISE_BRICK_FACTOR : 1;
      // C21c — la bande vient de la matrice, pas d'une table recopiée ici : c'est elle que
      // l'auditeur relit, et deux tables qui disent la même chose finissent par diverger.
      const tbb = BRICK_TAPER_BIKE_BOUNDS[fmt] || [25, 45];
      const tb = { lo: tbb[0], hi: tbb[1] };
      const tr = ({ S: { lo: 6, hi: 10 }, M: { lo: 8, hi: 12 }, "70.3": { lo: 10, hi: 16 }, Full: { lo: 12, hi: 20 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 8, hi: 12 };
      // LE LEG VÉLO ROULE EN Z2, PAS À L'ALLURE COURSE. Première écriture : `bk.rp` sur tout
      // le bloc — mesuré par le banc v7, 158 profils de duathlon en violation de dose (48 min
      // continues en zone haute). C'était juste, et pas seulement pour l'auditeur : 45 min à
      // allure course EST une séance dure, c'est-à-dire l'exact contraire d'un affûtage.
      // Même structure que le brick de pic : le corps en endurance, l'allure course rappelée
      // sur la fin et portée par la consigne, jamais par la zone du bloc entier.
      S2.push({ d: "br", long: true, brick: true, name: "Brick d'affûtage (rappel de transition)", note: "Court : on ne construit plus rien, on entretient. Vélo en endurance, les DIX dernières minutes à l'allure du jour J, puis on enchaîne vite. Les jambes ont besoin de se rappeler la sensation « de coton » des premières foulées après le vélo — c'est une compétence, elle se perd, et elle ne se rattrape pas le matin de la course. Un tiers du volume du brick de pic, zéro fatigue résiduelle.", det: "", steps: [
        // Le PLANCHER du leg vélo est la borne basse AUDITÉE (C21c), pas une fraction d'elle :
        // sinon la décroissance d'affûtage descend la séance sous ce que la spec exige, et le
        // générateur produit ce que l'auditeur refuse. Même discipline que C21b en charge.
        { role: "body", leg: "bike", durationMin: PT(tb.lo, Math.round(tb.hi * rf)), zone: "bk.z2", intensity: intOf("bk.z2") as unknown as string, bnd: { floor: tb.lo, cap: tb.hi } } as V1Step,
        { role: "body", leg: "run", durationMin: PT(tr.lo, Math.round(tr.hi * rf)), d: "rn", bnd: { floor: Math.max(5, Math.round(tr.lo * 0.6)), cap: tr.hi } } as V1Step,
      ], ...( { runInj } as object) });
    } else {
      const longRunCaps = ({ S: { lo: 30, hi: 60 }, M: { lo: 40, hi: 75 }, "70.3": { lo: 50, hi: 100 }, Full: { lo: 60, hi: 140 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 50, hi: 100 };
      // B1 (LOT VOLUME + RÉPARTITION, 20/08/2026) — LE CRÉNEAU LONG N'APPARTIENT PLUS À LA SEULE
      // COURSE HORS SPÉCIFIQUE.
      //
      // *« Le créneau long est monopolisé par la course pendant les deux tiers du plan »*
      // (fondateur). Mesuré sur le profil réel : **aucune sortie longue à vélo n'existe en base
      // ni en développement** — le seul vélo long du plan est le leg du brick, qui n'apparaît
      // qu'en spécifique. Sur une épreuve dont le vélo fait 52 % du temps de course, les vingt
      // premières semaines n'en construisent pas le foncier.
      //
      // Le créneau ALTERNE donc, en semaines PAIRES (le décalage avec B2 est mesuré, voir sa
      // note). Les bornes sont celles du leg vélo du brick pour le même format — une seule
      // table pour « ce que dure un long vélo sur cette épreuve », jamais une seconde (R11.1).
      //
      // ⚠ PAS DE MARQUEUR `long: true`, et c'est une mesure qui l'a décidé : I14 demande qu'une
      // séance marquée `long` soit la plus longue de sa DISCIPLINE dans sa semaine ; sans le
      // marqueur, le sceau S4 descend de 349 à 342 — sept violations de MOINS qu'avant la pièce.
      // Mêmes exclusions que B2, mêmes raisons (blessure/drapeau médical, prépas < 12 semaines).
      // ⚠ JAMAIS EN SEMAINE DE RÉCUP — trouvé au rendu, pas à la relecture : sans cette garde,
      // S22 (une décharge) portait une sortie longue vélo de 201 min. La passe O-93 ne pouvait
      // pas la rattraper, faute de charge VOISINE portant le même type (elle compare un type à
      // ses semaines de charge adjacentes, et celui-ci n'y existe pas encore).
      const _lbOK = !inj.count && !medHold && !kit.isRecup && !semaineRecup && r.weeks >= 12 && lvl !== "debutant";
      const lbCaps = ({ S: { lo: 45, hi: 90 }, M: { lo: 60, hi: 120 }, "70.3": { lo: 90, hi: 180 }, Full: { lo: 150, hi: 300 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 60, hi: 180 };
      if (_lbOK && weekNum % 2 === 0) S2.push({ d: "bk", name: "Sortie longue vélo", note: "La sortie foncière du vélo : longue, régulière, en endurance. C'est la discipline qui pèse le plus lourd le jour J et celle qui se construit avec le moins de casse — le foncier vélo se pose en base, il ne se rattrape pas en spécifique. Ravitaille-toi comme le jour J, c'est aussi une séance de nutrition.", det: "", steps: [W(15, "montée progressive"), Object.assign(B(1, PT(lbCaps.lo, lbCaps.hi), "bk.z2", "", " · cadence libre, ravitaillement toutes les 30 min"), { bnd: { floor: lbCaps.lo, cap: lbCaps.hi } }), C(10, "décrassage")] });
      else S2.push({ d: "rn", long: true, name: "Sortie longue CAP", note: "Endurance fondamentale, allure facile et conversationnelle.", det: "", steps: [Object.assign(B(1, PT(longRunCaps.lo, longRunCaps.hi), "rn.easy", "", runInj ? " sur surface souple" : ""), { bnd: { floor: longRunCaps.lo, cap: longRunCaps.hi } })], ...( { plainBody: true } as object) });
    }
  } else if (slot === "facileR") {
    const ftCaps = ({ S: { lo: 25, hi: 45 }, M: { lo: 15, hi: 26 }, "70.3": { lo: 14, hi: 22 }, Full: { lo: 50, hi: 100 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 25, hi: 45 };
    // C18 — le créneau course de qualité garanti en tri. Il portait « VO2max course » en peak :
    // O-70 (arbitrage fondateur, 18/08/2026) l'a retourné. Le VO2max est un stimulus de phase de
    // DÉVELOPPEMENT ; en phase spécifique, l'adaptation recherchée est la puissance soutenue
    // sous le seuil, la durabilité à allure de course, le ravitaillement, les transitions. Une
    // séance de MAINTIEN par semaine suffit à empêcher le plafond aérobie de décliner — c'est le
    // « VO2max vélo » de R13.4 (dur1), en attente de l'arbitrage fondateur sur sa moitié. Deux
    // serait une dose de développement, en concurrence avec le spécifique pour la récupération.
    // Mesuré sur son 70.3 : 19 séances de VO2max contre 10 bricks — rapport inversé pour
    // l'épreuve visée. Le créneau libéré revient donc au SPÉCIFIQUE (allure course).
    // Et JAMAIS en semaine de récup (kit.isRecup) : la branche lisait la PHASE, pas la CHARGE —
    // la semaine de décharge du pic portait la séance la plus intense de sa semaine, annulant
    // sa raison d'être. En récup, ce créneau retombe sur le footing (0 VO2, décision O-70).
    // Dose de RAPPEL, pas de développement : 2 × 7-10 min d'allure course, ~40 min porte-à-porte
    // — la taille du « VO2max course » qu'elle remplace. La forme RÉPÉTÉE + `hard` est celle du
    // rappel d'affûtage de R13.4 (2×8), et elle est nécessaire : un bloc SIMPLE en durée reçoit
    // le « plancher digne » de 30 min de `blockBounds` (D3-D7/D10) — mes deux premières doses
    // (18-28 puis 12-18 min) rendaient 30 quoi qu'il arrive, et la semaine de pic des profils
    // vol_max 4 débordait à 248 min pour 240 demandées (C4, banc v6). Un bloc répété garde ses
    // bornes ; `hard` interdit à la sonde de capacité de l'élargir.
    if (phase === "peak" && !kit.isRecup && !runInj && !medHold && lvl !== "debutant" && !finisher) S2.push({ d: "rn", name: "Allure course (tri)", note: "L'allure du jour J, jambes fraîches cette fois : mémorise la sensation, elle doit devenir automatique.", det: "", steps: [W(10, "footing progressif + gammes"), Object.assign(B(2, PT(7, 10), "rn.mara", "2min trot"), { repCap: 2, bnd: { floor: 6, cap: 10, hard: true } }), C(8, "footing très facile")] });
    else if (phase === "peak" && !kit.isRecup && runInj && !medHold) S2.push({ d: "rn", name: "Allure course (tri, surface souple)", note: "Course blessé : allure cible en contrôle, sur surface souple, jamais dans la douleur.", det: "", steps: [W(12, "footing progressif"), B(1, PT(18, 28), "rn.mara", "", ", sur surface souple"), C(8, "footing très facile")] });
    // A2 / O-91 (LOT VOLUME + RÉPARTITION, 20/08/2026) — LA SORTIE LONGUE À PIED EXISTE AUSSI EN
    // SPÉCIFIQUE ET EN PIC. La décision O-91 (« le créneau long CONSTRUIT le brick en spec/pic »)
    // est RESPECTÉE — le brick garde `durLong` et reste le pivot de sa semaine. Ce qui n'avait
    // jamais été arbitré est sa CONSÉQUENCE, mesurée à la relecture du plan réel : la « Sortie
    // longue CAP » s'arrêtait à la fin du développement (S22), soit **vingt semaines sans une
    // seule course sèche de plus de 68 min avant un semi-marathon d'enchaînement**, la CAP longue
    // ne survivant que dans les 26-49 min de fin de brick.
    //
    // Elle reprend donc le SECOND créneau facile course de la semaine (`slotIdx === 1`) — celui
    // qui rendait un deuxième footing de 30 min, la séance la moins spécifique de la semaine la
    // plus spécifique du plan. Le premier créneau garde le footing (et, en pic, le rappel
    // d'allure course) : on remplace une redondance, on ne retire aucun type.
    //
    // ⚠ ELLE NE PORTE PAS `long: true`, DÉLIBÉRÉMENT : ce drapeau désigne le PIVOT de la semaine
    // (I14 : « la sortie longue est la plus longue de sa semaine »), et en spec/pic le pivot est
    // le brick. Deux pivots dans une semaine, ce serait demander à I14 de trancher entre deux
    // séances qui ne se comparent pas. Le type garde son NOM (une seule ligne dans les mesures
    // par type, comparable d'un bout à l'autre du plan) et ses bornes de format.
    else if ((phase === "spec" || phase === "peak") && slotIdx === 1 && !kit.isRecup && !medHold) {
      const lrc = ({ S: { lo: 30, hi: 60 }, M: { lo: 40, hi: 75 }, "70.3": { lo: 50, hi: 100 }, Full: { lo: 60, hi: 140 } } as Record<string, { lo: number; hi: number }>)[fmt] || { lo: 50, hi: 100 };
      S2.push({ d: "rn", name: "Sortie longue CAP", note: "Endurance fondamentale à pied, allure facile et conversationnelle. Le brick t'apprend à courir SUR des jambes fatiguées ; celle-ci construit la distance elle-même — les deux ne se remplacent pas, et c'est la seconde qui décide de tes derniers kilomètres le jour J.", det: "", steps: [Object.assign(B(1, PT(lrc.lo, lrc.hi), "rn.easy", "", runInj ? " sur surface souple" : ""), { bnd: { floor: lrc.lo, cap: lrc.hi } })], ...( { plainBody: true } as object) });
    }
    // R13 — le footing porte ses BORNES (`ftCaps` existait, jamais posé en bnd) : c'était le
    // seul bloc sans plafond de la semaine, donc le déversoir de toutes les passes de
    // remplissage — mesuré : « Footing facile 213 min » en semaine de peak (D7, banc v6).
    // Un footing de 3 h 33 est une seconde sortie longue déguisée, pas un footing.
    // O-81 (arbitrage du fondateur, 19/08/2026) — LE PLAFOND MONTE, LE PLANCHER NE CÈDE PAS,
    // ET LA PIÈCE N'EST PAS UNIFORME.
    //
    // Mesuré (T-52) : sur un 70.3, la table du format donne un plafond de `22 × 1,3 = 29` min
    // face au plancher de dignité de 30 — `blockBounds` tranche par `Math.max` EN SILENCE, et
    // le footing vaut exactement 30 min sur tout le plan, pour tout athlète. Aucune pièce de
    // progression ne pouvait rien y faire.
    //
    // Le plafond monte donc à la sortie facile de référence (`O81_FOOTING_CIBLE_PIC_MIN`) —
    // **et SEULEMENT là où la table le laissait au ras** : `Math.max` ne touche pas les formats
    // dont le plafond dégage déjà (S 58 min, Full 130). C'est le §3 de l'arbitrage, et il est
    // la conclusion d'une mesure : borner le footing là où il est LIBRE coûte −28 % sur tout un
    // plan `tri/S`, parce que ce type y est le seul qui absorbe (receveur R4.1) — *on ne borne
    // un type que si quelqu'un d'autre peut absorber*. La condition est donc DÉRIVÉE (le
    // plafond dégage-t-il ?), jamais une liste de formats.
    //
    // La TRAJECTOIRE ne vit que sur les formats levés : elle interpole géométriquement du
    // plancher de dignité à la cible, sur la position uniforme par SEMAINE (jamais par phase :
    // une phase de 2 semaines fait Δt double, +21 % de plafond en une semaine — mesuré, saut de
    // courbe +17 % au banc v6 D3), avec la pente bornée par C22 et le plafond de DÉPART gardé
    // en décharge (une récup en position de pic héritait des plus hauts plafonds).
    else {
      const _capFtR13 = Math.round(ftCaps.hi * 1.3);          // R13 — le déversoir reste fermé
      const _capFtPic = Math.max(_capFtR13, O81_FOOTING_CIBLE_PIC_MIN);
      // A1 (LOT VOLUME + RÉPARTITION, 20/08/2026) — LA TRAJECTOIRE DU FOOTING EST RETIRÉE, ET
      // C'EST UNE MESURE QUI L'A DÉCIDÉ, PAS UN CHANGEMENT D'AVIS.
      //
      // O-81 l'a livrée (interpolation géométrique du plancher de dignité à la cible), O-82 l'a
      // rendue VIVANTE en réparant `progCap` sur la branche C8/C16 — et personne n'a re-mesuré ce
      // que la rendre vivante COÛTE. Expérience à un facteur sur le profil réel, quatre départs :
      //
      //     départ 0,60 (livré)  pic 9,4 h · total 300 h · footing 25'→46'
      //     sans trajectoire     pic 9,9 h · total 328 h · footing 38'→50'
      //     départ 0,80          pic 9,6 h · total 313 h · footing 33'→48'
      //     départ 0,90          pic 9,6 h · total 317 h · footing 35'→49'
      //
      // **La trajectoire coûte 28 h de préparation et 0,5 h de pic pour une progression que la
      // COURBE fournit déjà** : sans elle, le footing va quand même de 38' à 50' — c'est le
      // volume hebdomadaire qui monte, pas une borne qui s'ouvre. Un plafond qui commence bas
      // sur un plan déjà borné par ses plafonds ne fabrique pas de progression, il retire du
      // volume ; et le lot dont c'est l'objet est précisément celui qui cherche à en rendre.
      // L'amplitude des semaines de charge ne bouge dans AUCUNE variante (2,8-2,9 h) : le piège
      // O-69 (« relever un plancher aplatit le plan ») ne se déclenche pas ici.
      //
      // Ce qui RESTE est la moitié qui avait été mesurée utile : le PLAFOND relevé d'O-81
      // (`O81_FOOTING_CIBLE_PIC_MIN`), là où la table du format laissait le type au ras de son
      // plancher de dignité. Le départ progressif du VOLUME, lui, appartient à la rampe R10/O-69
      // et à C22 — au niveau de la SEMAINE, qui est le bon niveau pour une charge.
      S2.push({ d: "rn", name: "Footing facile", note: "Course facile : les jambes apprennent à courir « propre » sans fatigue ajoutée.", det: "", steps: [Object.assign(B(1, PT(ftCaps.lo, ftCaps.hi), "rn.easy", "", runInj ? " · surface souple" : ""), { bnd: { floor: ftCaps.lo, cap: _capFtPic } })], ...( { plainBody: true } as object) });
    }
  } else if (slot === "facile2") {
    // R13.3 — EN MONO-SÉANCE, LA NAGE DU TRI EXISTE. `swMain` et `swTech` n'étaient poussées
    // que sous `dbl` (doubles séances) : pour la majorité des athlètes (`doubles` non/parfois),
    // l'unique nage hebdomadaire était « Nage récup courte » en sw.easy — zéro seuil CSS sur
    // 59 semaines d'un plan Full, et AUCUNE nage sur les 6 semaines d'affûtage. Les sensations
    // d'eau se perdent en 10-14 jours : se présenter à un départ de 3,8 km sans avoir nagé
    // depuis un mois et demi n'est pas une contre-performance, c'est un risque (eau libre).
    // Le créneau facile2 route donc PAR PHASE quand l'athlète ne double pas ; en doubles, la
    // nage principale et la technique vivent déjà sur dur1/dur2 — la récup courte reste.
    // D3-b — la nage continue passe DEVANT le routage par phase et par intention : c'est elle qui
    // porte le prérequis de sécurité, et le routage l'envoyait sur « Nage vitesse ».
    //
    // C3 (arbitrage « LA RÈGLE D'ALTERNANCE, PAS LA TABLE », 20/08/2026) — LE SEUL CRÉNEAU QUI
    // NE VARIE JAMAIS PAR PHASE ALTERNE ENFIN SA DISCIPLINE.
    //
    // La carte du livré (188 profils tri) dit où vit la rigidité de l'allocation : `dur2` bascule
    // vélo → course avec la phase, `durLong` course → brick, mais `dur1` (vélo 99 %) et `facile2`
    // (nage 100 %) ne bougent JAMAIS. `facile2` est celui qui porte la discipline en EXCÈS —
    // d'où l'alternance ici, et nulle part ailleurs.
    //
    // ⚠ ELLE NE TOUCHE QU'UNE BRANCHE, ET LA MESURE A DÉCIDÉ LAQUELLE. Ce que `facile2` contient
    // n'est pas le même selon que l'athlète double ou non :
    //
    //     profil qui DOUBLE     92 % « Nage récup courte » (51' en moyenne)
    //     corpus non doublé     35 % nage aérobie · 30 % nage seuil · 18 % éducatifs
    //
    // Sans doublage, ce créneau porte la QUALITÉ de nage (R13.3 : c'est la seule nage de la
    // semaine) — y toucher retirerait au triathlète sa seule séance de nage construite. Avec
    // doublage, la qualité vit déjà sur `dur1`/`dur2` et `facile2` ne porte qu'une récup : c'est
    // l'échange le moins cher du plan. La condition est donc DÉRIVÉE de ce que le créneau
    // CONTIENT (la branche `dbl`), jamais d'une liste de profils.
    //
    // Et le palier B-17 passe AVANT (`b17Pose`) : une continuité annoncée n'est jamais convertie.
    // Mêmes exclusions que B1/B2, mêmes raisons (blessure, drapeau médical, prépa < 12 semaines).
    //
    // PARITÉ : vélo en semaines PAIRES. Le décalage a été MESURÉ contre l'autre parité (le §4 du
    // fondateur — « deux pièces qui ajoutent de la charge déclarent leur phase, pas seulement
    // leur fréquence ») ; le résultat est publié au registre.
    if (b17Pose) S2.push({ d: "sw", name: swMain.name, note: swMain.note, det: "", steps: swMain.steps });
    // ⚠ UN SEUL CRÉNEAU PAR SEMAINE (`slotIdx === 0`), ET LA MESURE A TRANCHÉ. Le créneau
    // `facile2` apparaît DEUX fois dans la semaine livrée d'un athlète qui double : convertir les
    // deux n'est plus une alternance, c'est la conversion totale — mesuré, nage 20,0 % / vélo
    // 51,1 % contre 24,8 / 45,7 en n'en convertissant qu'un. Le second chiffre est celui que
    // l'arbitrage appelle « l'alternance », et il préserve la fréquence de nage (2,4 séances par
    // semaine de charge contre 2,0). La conversion totale reste une DÉCISION à prendre, pas un
    // réglage à glisser — elle atteint la cible d'allocation et coûte 0,4 séance de nage.
    else if (dbl && slotIdx === 0 && !inj.count && !medHold && r.weeks >= 12 && weekNum % 2 === 0 && phase !== "taper" && kit.creneauxDuSlot >= 2)
      S2.push({ d: "bk", name: "Endurance vélo", note: "Endurance pure sur le vélo, à la place d'une nage de récupération : le vélo pèse la moitié de ta course et se construit avec le moins de casse. Ta nage garde ses séances construites — celle-ci n'échange qu'une récupération contre du foncier.", det: "", steps: [W(10, "montée progressive"), Object.assign(B(1, PT(40, 75), "bk.z2", "", " · cadence libre, souple"), { bnd: { floor: 30, cap: 90 } }), C(10, "décrassage")] });
    else if (dbl) S2.push({ d: "sw", recovery: true, name: swShort.name + " courte", note: swShort.note, det: "", steps: swShort.steps, ...( { plainBody: true } as object) });
    else if (phase === "taper") S2.push({ d: "sw", name: "Rappel nage course", note: "Affûtage : on entretient les sensations d'eau sans fatigue — elles se perdent en 10 à 14 jours, et le jour J commence par la natation. Court, précis, à l'allure de course.", det: "", steps: [
      Wm(300, "souple"), Object.assign(Bd(beginner ? 4 : 6, 100, "sw.css", "20-30s", ", à l'allure de course, technique impeccable", false, "sw"), { repCap: 6 }), Cm(100, "souple")] });
    else if (phase === "base") S2.push({ d: "sw", name: swTech.name, note: swTech.note, det: "", steps: swTech.steps });
    // dev/spec/peak : la nage principale (sw.css) — SAUF pour l'intention plaisir/finir ET le
    // débutant (sa priorité est le geste, et sa version « technique+seuil » à 100 % de corps
    // dur faisait passer un plan S à 2,8 h/sem sous le plancher de temps facile), qui
    // garde la technique : ajouter du seuil hebdomadaire à quelqu'un qui vient chercher du
    // plaisir faisait passer la part facile sous le plancher C26 (mesuré : 70 % pile, violé
    // sur 3 combinaisons 70.3). L'intensité suit l'intention, pas l'inverse.
    else if (finisher || a.intent === "plaisir" || beginner) S2.push({ d: "sw", name: swTech.name, note: swTech.note, det: "", steps: swTech.steps });
    else S2.push({ d: "sw", name: swMain.name, note: swMain.note, det: "", steps: swMain.steps });
  }
  else if (slot === "recup") S2.push({ d: "rs", name: "Récup active", det: "mobilité", steps: [] });
  else if (slot === "off") S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  return S2;
}


/** Prédiction tri — extraction mécanique de la branche correspondante de `predictRace`. */
export function predictTri(kit: PredictKit): void {
  const { refs, format, items, advice, D, runRange, swimRange, riegelSec, profWhy, swimWhy, bikeIF, bikeWhy,
    bikeTime, totalOf, fmtRange, athleteKg } = kit;
  const sw = TRI_SWIM[format], bk = TRI_BIKE[format], rn = TRI_RUN[format];
  // PW — les bornes de chaque segment, gardées pour le TOTAL. `null` = segment non estimé, et
  // le total ne s'affiche alors pas : mieux vaut trois lignes sur quatre qu'un total faux.
  const bornes: Record<"swim" | "bike" | "run", [number, number] | null> = { swim: null, bike: null, run: null };
  const capte = (lo: number, hi: number, k: "swim" | "bike" | "run") => { bornes[k] = [lo, hi]; };

  if (refs.css > 0 && sw) {
    const t = (sw.dist / 100) * refs.css * sw.factor;
    // R18.2 — la fourchette natation suit le MILIEU de la course. Le facteur `sw.factor` est
    // calibré sur de l'eau libre calme : c'est le lac qui vaut 1, pas le bassin.
    const v = swimRange(t);
    const b = kit.legBands.swim;
    capte(t * (b ? b[0] : 1) * 0.97, t * (b ? b[1] : 1) * 1.03, "swim");
    items.push({ leg: "Natation " + sw.dist + "m", value: v, why: "CSS × " + sw.factor + " — peloton, combinaison et navigation compris" + swimWhy });
  } else advice.push("CSS manquant → pas de projection natation (test 400/200m).");

  if (refs.ftp > 0 && bk) {
    // R15.2 — la bande passe par `bikeIF` : le relief du parcours l'abaisse, une seule fois,
    // au même endroit que pour le vélo seul et le duathlon.
    const [blo, bhi] = bikeIF(bk.lo, bk.hi);
    items.push({ leg: "Vélo — intensité", value: Math.round(refs.ftp * blo) + "–" + Math.round(refs.ftp * bhi) + "W", why: "puissance normalisée qui laisse des jambes pour courir — dépasser cette bande se paie sur la CAP" + bikeWhy });
    // PW — ET LE CHRONO QUI VA AVEC. La puissance est une consigne, pas une réponse : le vélo
    // pèse 45 à 55 % du temps total selon le format, et l'athlète ne pouvait pas le lire.
    const est = bikeTime(TRI_BIKE_KM[format], bk.lo, bk.hi);
    if (est) {
      capte(est.lo, est.hi, "bike");
      items.push({
        leg: "Vélo " + TRI_BIKE_KM[format] + "km",
        value: fmtRange(est.lo, est.hi),
        why: "converti depuis la puissance par le modèle de Martin (1998) : " + est.kmhLo.toFixed(1).replace(".", ",")
          + "–" + est.kmhHi.toFixed(1).replace(".", ",") + " km/h de moyenne. Hypothèses — " + est.hypothese
          + ". Si tu roules dans une autre position, lis ce chrono de travers : l'aérodynamique pèse plus que les watts au-delà de 30 km/h.",
      });
    } else if (!(athleteKg && athleteKg > 0)) {
      advice.push("Poids manquant → pas de chrono vélo, seulement la puissance cible. Renseigne-le au Profil : sans lui, impossible de convertir des watts en vitesse (le poids entre dans le roulement ET dans la pente).");
    }
  } else advice.push("FTP manquante → pas de puissance cible vélo (test 20min × 0.95).");

  if (refs.thrPace > 0 && rn) {
    const t = riegelSec(refs.thrPace, rn.km) * rn.fatigue;
    const v = runRange(t);
    const b = kit.legBands.run;
    capte(t * (b ? b[0] : 1) * 0.97, t * (b ? b[1] : 1) * 1.03, "run");
    items.push({ leg: "CAP " + (rn.km >= 21 ? (rn.km > 22 ? "marathon" : "semi") : rn.km + "km"), value: v, why: "Riegel × " + rn.fatigue + " de fatigue post-vélo (facteur " + format + ")" + profWhy });
  } else advice.push("Allure seuil manquante → pas de projection CAP (test 30min).");

  // PW — LE TOTAL, TRANSITIONS COMPRISES. Il n'existait pas, au motif qu'« un total
  // additionnerait les incertitudes ». C'est vrai, et l'athlète l'additionne quand même — de
  // tête, sans les transitions, donc plus mal. Il ne sort QUE si les trois segments sont
  // estimés : un total à deux tiers serait faux de la valeur du tiers manquant.
  const tr = TRI_TRANSITION[format];
  if (bornes.swim && bornes.bike && bornes.run && tr) {
    const [lo, hi] = totalOf([bornes.swim, bornes.bike, bornes.run], tr.t1 + tr.t2);
    items.push({
      leg: "🏁 Total estimé",
      value: fmtRange(lo, hi),
      why: "natation + T1 + vélo + T2 + course à pied. Transitions comptées "
        + Math.round(tr.t1 / 60) + " min et " + Math.round(tr.t2 / 60)
        + " min (médianes d'âge-groupe — un premier " + format + " avec sac de transition fait plus long). "
        + "La fourchette est la SOMME des bornes et non leur composition en quadrature : le jour J, "
        + "la forme est bonne ou elle ne l'est pas sur les trois segments à la fois.",
    });
    D("PW-total", "Total avec transitions", fmtRange(lo, hi).replace(/–.*/, "") + " au mieux",
      "Le vélo pèse " + Math.round(100 * (bornes.bike[0] + bornes.bike[1]) / (lo + hi)) + " % du total sur ce format : "
      + "sans son chrono, la prédiction laissait de côté son plus gros poste.");
  }
  if (items.length) D("PRED-tri", "Méthode tri", "legs séparés puis total",
    "Chaque leg garde SA méthode et SA fourchette — nage au CSS, vélo par la physique, course par Riegel. "
    + "Le total les additionne à la fin ; il ne les remplace pas par une moyenne qui masquerait le segment faible.");
}

registerSport({
  id: "tri",
  mainDiscipline: "rn", // la CAP finit la course : c'est la discipline de référence du tri
  disciplines: ["sw", "bk", "rn"],
  easyFallbackSlot: "facileR",
  weekSchema: null,
  buildSessions: buildTriSessions,
  predict: predictTri,
  retestTypes: ["css", "ftp", "thrPace"],
    // Le tri NAGE : il hérite des planchers de séance en mètres (C24/C24b), comme la natation.
  // C'est précisément ce que `sport !== "run"` disait de façon détournée.
  guards: { stripLongOnMedHold: true, singleRunVo2PerWeek: true, smoothOnAuditMetric: true, capacityProbe: true, swimSessionFloors: true, swimRacePrepFrequency: true, doublesAddVolume: true },
});
