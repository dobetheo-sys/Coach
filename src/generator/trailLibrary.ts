/**
 * Bibliothèque de séances TRAIL (spec R7 §5) — 14 séances, chacune chargeant explicitement
 * ses axes (temps / D+ / D−).
 *
 * Ce que l'ancien `run/trail` produisait : 28 footings plats, 20 footings récup, 7 « allure
 * spécifique » de rien, et 6 séances de côtes strictement identiques figées à 15×3min.
 * Zéro marche rapide, zéro bâton, zéro ravitaillement, zéro nuit — sur une préparation
 * d'ultra. Une séance sur huit était spécifique au trail.
 *
 * Ici, chaque bloc porte sa PENTE (`gradient`), donc son intensité se rend correctement
 * (renderer.ts) : VAM en montée, consigne technique en descente, allure seulement à plat.
 */
import type { ReasonedPlan, V1Session, V1Step } from "../engine/types.ts";
import { T5_HIKE_SHARE, T7_REHEARSAL, type TrailCategory } from "../engine/trailModel.ts";
import { intOf } from "./renderer.ts";

type Slot = "dur1" | "dur2" | "durLong" | "facileR" | "facile2" | "recup" | "off";

/** Progression EXPLICITE de la séance de côtes (spec §5.4) — corrige les 6 séances figées
 *  à 15×3min : format et récupération changent à chaque phase, et `repCap` est obligatoire
 *  comme sur les séances vélo. */
const HILL_PROGRESSION: Record<string, { reps: [number, number]; durMin: number; zone: string; rec: string; repCap: number; name: string; note: string }> = {
  base: { reps: [5, 6], durMin: 0.75, zone: "tr.vam", rec: "descente MARCHÉE, récupération complète", repCap: 6,
    name: "Côtes courtes (initiation)", note: "Premières côtes courtes : on cherche la mécanique de montée (buste droit, poussée complète), pas la performance. La descente se marche : elle sert à récupérer, pas à s'abîmer les cuisses." },
  dev: { reps: [8, 10], durMin: 1.25, zone: "tr.vam", rec: "descente souple en trottinant", repCap: 10,
    name: "Côtes courtes (VAM)", note: "Le travail de vitesse ascensionnelle : court, intense, en montée. C'est ce qui fait progresser ta VAM — la référence qui compte en trail." },
  spec: { reps: [3, 4], durMin: 9, zone: "tr.asc", rec: "descente EN CONTRÔLE (elle fait partie du travail)", repCap: 5,
    name: "Seuil ascensionnel", note: "Le seuil en montée, sur des blocs longs : c'est l'allure que tu tiendras dans les grosses côtes de ta course. La descente entre les blocs n'est pas de la récup passive, c'est de l'entraînement excentrique." },
  peak: { reps: [3, 3], durMin: 12, zone: "tr.climb", rec: "descente en contrôle", repCap: 4,
    name: "Montées à l'allure de course", note: "Blocs longs à l'allure exacte de tes montées le jour J : mémorise la sensation et la respiration. Ne pars pas plus vite que ce que tu pourras tenir après 4 heures de course." },
  taper: { reps: [3, 3], durMin: 3, zone: "tr.asc", rec: "descente très souple", repCap: 3,
    name: "Rappels de côte (affûtage)", note: "Court et vif : on réveille la mécanique de montée sans créer de fatigue. La fraîcheur passe avant tout." },
};

export function buildTrailSessions(r: ReasonedPlan, slot: Slot, phase: string, prog: number, weekNum: number): V1Session[] {
  const a = r.profile;
  const obj = r.trail!;
  const vert = r.trailVert!;
  const cat = obj.category;
  const S2: V1Session[] = [];
  const inj = r.inj;
  const beginner = r.beginner;
  const scale = r.sessionScale;
  const P = (lo: number, hi: number) => Math.max(1, Math.round((lo + (hi - lo) * prog) * scale));
  // Part de la cible verticale hebdo allouée à CETTE séance (le générateur ajuste ensuite)
  const upShare = (f: number) => Math.max(50, Math.round((vert.dplusPeak * f * (0.55 + 0.45 * prog)) / 10) * 10);
  const downShare = (f: number) => Math.max(50, Math.round((vert.dmoinsPeak * f * (0.5 + 0.5 * prog)) / 10) * 10);

  // --- Contre-indications spécifiques trail (spec §5.3) : la descente est le terrain à risque
  const quadInj = inj.list.includes("quadriceps");
  const ankleInj = inj.list.includes("cheville");
  const shinInj = inj.list.includes("tibia");
  const kneeInj = inj.list.includes("genou");
  const fasciaInj = inj.list.includes("fascia");
  const noHardDown = quadInj || shinInj; // descente rapide/longue supprimée
  const downFactor = quadInj ? 0.4 : kneeInj || shinInj ? 0.6 : 1;
  const technicalOk = !ankleInj; // terrain technique interdit sur cheville fragile
  const poles = a.poles === "oui" || (a.poles === "a_decider" && obj.dplusM >= 1500);
  const flatAccess = a.train_dplus_access === "plat";
  const treadmill = a.treadmill === "oui";
  const hikeShare = T5_HIKE_SHARE[cat] ?? 0.15;
  const ultra = cat === "ultra" || cat === "ultra_long" || cat === "ultra_xl";
  const rehearsalNeeded = obj.raceMinMid / 60 >= T7_REHEARSAL.minRaceHours;

  const W = (min: number, txt?: string): V1Step => ({ role: "warmup", durationMin: min, text: txt || "", gradient: "flat" });
  const C = (min: number, txt?: string): V1Step => ({ role: "cooldown", durationMin: min, text: txt || "", gradient: "flat" });
  const B = (o: Partial<V1Step> & { durationMin: number }): V1Step =>
    ({ role: "body", reps: 1, intensity: intOf(o.zone ?? null) as unknown as string, ...o }) as V1Step;

  if (slot === "durLong") {
    // 1. SORTIE LONGUE TRAIL — temps + D+ + D−, en `rolling` : jamais une allure au sol.
    const durMin = P(Math.round(60 + 40 * (ultra ? 1.6 : 1)), r.trailLongCapMin || 240);
    const up = upShare(0.55), down = Math.round(upShare(0.55) * downFactor);
    const hikeMin = hikeShare > 0.1 ? Math.round(durMin * hikeShare) : 0;
    // T7 — au-delà de 6h d'effort, TOUTES les longues de la phase spécifique sont des
    // répétitions générales (sac, eau, glucides réels) : l'estomac et le matériel se
    // préparent comme les jambes, et ça ne se teste pas le jour J.
    const isRehearsal = rehearsalNeeded && (phase === "spec" || phase === "peak");
    S2.push({
      d: "rn", long: true,
      name: isRehearsal ? "Longue trail + ravito réel" : "Sortie longue trail",
      note: isRehearsal
        ? "Répétition GÉNÉRALE : sac de course, réserve d'eau complète, et 60 à 90 g de glucides par heure — exactement ce que tu prendras le jour J. Au-delà de 6 h d'effort, l'estomac et le matériel font autant d'abandons que les jambes : ça se teste à l'entraînement, jamais en course."
        : "La séance qui construit ta course : on compte le TEMPS et le dénivelé, jamais les kilomètres. Monte au train (tu dois pouvoir parler), descends en contrôle" + (hikeMin ? ", et marche franchement dans les pentes raides — c'est ce que tu feras en course" : "") + ".",
      det: "",
      steps: [
        B({ durationMin: durMin - (hikeMin ? Math.round(hikeMin / 2) : 0), gradient: "rolling", zone: "tr.flat", dplusM: up, dmoinsM: down,
          mode: hikeMin ? "run_hike" : "run", poles: poles && hikeMin > 0, surface: technicalOk ? "sentier" : "piste",
          bnd: { floor: 60, cap: r.trailLongCapMin || 240 } } as Partial<V1Step> as V1Step),
      ],
      ...({ plainBody: true } as object),
    } as V1Session);
  } else if (slot === "dur1") {
    // 3/4. CÔTES COURTES → SEUIL ASCENSIONNEL → ALLURE DE COURSE EN MONTÉE (progression §5.4)
    const hp = HILL_PROGRESSION[phase] || HILL_PROGRESSION.dev;
    // Ultra long : pas de VO2 (ce n'est pas le limiteur) — on reste sur du seuil ascensionnel
    const noVam = r.noVo2 || cat === "ultra_long" || cat === "ultra_xl";
    const zone = noVam && hp.zone === "tr.vam" ? "tr.asc" : hp.zone;
    const reps = Math.max(2, Math.min(hp.repCap, P(hp.reps[0], hp.reps[1])));
    const durEach = hp.durMin;
    const upPer = Math.max(20, Math.round((durEach / 60) * obj.vam * 0.9 / 5) * 5);
    if (flatAccess && !treadmill) {
      // 14. ESCALIERS — substitut de D+ quand le terrain ne permet pas la montée longue
      S2.push({ d: "rn", name: "Escaliers (substitut de dénivelé)", note: "Ton terrain ne donne pas accès à de vraies montées : les escaliers reproduisent la contrainte verticale. Monte en poussée complète, redescends TOUJOURS en marchant — la descente d'escalier est traumatisante pour les genoux.", det: "",
        steps: [W(15, "footing plat progressif"), B({ durationMin: durEach, reps, zone, gradient: "up", dplusM: upPer, mode: "run", surface: "escalier", recoveryText: "redescente MARCHÉE", repCap: hp.repCap }), C(10, "footing très souple")] });
    } else if (flatAccess && treadmill) {
      // 13. TAPIS INCLINÉ
      S2.push({ d: "rn", name: "Tapis incliné (substitut de dénivelé)", note: "Tapis à 10-15 % d'inclinaison : c'est le meilleur substitut de montée quand le terrain manque. Aucune descente, donc aucune casse musculaire — mais aussi aucune préparation à la descente : garde tes week-ends en relief pour ça.", det: "",
        steps: [W(12, "à plat, progressif"), B({ durationMin: durEach, reps, zone, gradient: "up", dplusM: upPer, mode: "run", surface: "tapis", recoveryText: "2min à plat, inclinaison à 0", repCap: hp.repCap }), C(8, "à plat souple")] });
    } else {
      S2.push({ d: "rn", name: hp.name, note: hp.note, det: "",
        steps: [W(15, "footing progressif jusqu'au pied de la côte"),
          // `bnd` verrouille la durée UNITAIRE du bloc : sans lui, R3.3 ramenait toutes les
          // phases à la même valeur et la progression base→dev→spec→peak disparaissait
          // (le défaut mesuré par l'audit : 6 séances identiques à 15×3min).
          B({ durationMin: durEach, reps, zone, gradient: "up", dplusM: upPer, mode: "run", poles: poles && phase === "spec", recoveryText: hp.rec, repCap: hp.repCap, bnd: { floor: Math.max(1, Math.round(durEach * 0.9)), cap: Math.round(durEach * 1.15) } }),
          C(10, "footing souple sur plat")] });
    }
  } else if (slot === "dur2") {
    // 5/6. DESCENTE TECHNIQUE puis DESCENTE EN CHARGE — le vaccin excentrique
    if (noHardDown) {
      // 10. RENFO EXCENTRIQUE renforcé à la place (spec §5.3)
      S2.push({ d: "rn", name: "Renfo excentrique (protection)", note: (quadInj ? "Quadriceps fragiles" : "Tibias fragiles") + " : la descente rapide est retirée du plan. Le renfo excentrique construit la même résistance sans le traumatisme — squats descendants très lents (5 s), fentes contrôlées, mollets sur marche. C'est le meilleur investissement quand la descente est interdite.", det: "",
        steps: [W(12, "footing plat très souple"), B({ durationMin: P(18, 25), gradient: "flat", zone: "tr.easyup", mode: "run" }), C(8, "étirements doux")] });
    } else if (phase === "spec" || phase === "peak") {
      const down = Math.round(downShare(0.5) * downFactor);
      S2.push({ d: "rn", name: "Descente en charge", note: "LA séance qui décide de ta fin de course. Les descentes longues abîment les cuisses ; s'y exposer progressivement crée une protection durable (c'est prouvé et ça s'appelle l'effet de répétition). Monte tranquillement ou marche, et descends " + (technicalOk ? "sur ton terrain le plus roulant au début, puis plus technique" : "sur sentier ROULANT uniquement — ta cheville n'est pas prête pour du technique") + ".", det: "",
        steps: [W(15, "footing plat"), B({ durationMin: P(12, 20), reps: 1, gradient: "up", zone: "tr.easyup", dplusM: Math.round(down / 2), mode: poles ? "hike" : "run_hike", poles }),
          B({ durationMin: P(20, 34), reps: Math.max(2, P(2, 4)), gradient: "down", dmoinsM: Math.round(down / Math.max(2, P(2, 4))), surface: technicalOk ? "sentier" : "piste", recoveryText: "remontée en marche active" }), C(10, "footing plat souple")] });
    } else {
      const down = Math.round(downShare(0.35) * downFactor);
      S2.push({ d: "rn", name: "Descente technique", note: "La descente est une COMPÉTENCE, pas une récupération. Objectif : le geste, pas la vitesse. Buste relâché, bras écartés pour l'équilibre, petits pas rapides, regard 4-5 m devant. On répète 3 à 6 fois la même descente pour sentir la progression.", det: "",
        steps: [W(12, "footing plat"), B({ durationMin: P(8, 14), gradient: "up", zone: "tr.easyup", dplusM: Math.round(down / 2), mode: "hike", poles }),
          B({ durationMin: P(4, 7), reps: Math.max(3, P(3, 6)), gradient: "down", dmoinsM: Math.round(down / Math.max(3, P(3, 6))), surface: technicalOk ? "sentier" : "piste", recoveryText: "remontée marchée, souffle repris" }), C(8, "footing souple")] });
    }
  } else if (slot === "facileR") {
    // 7. MARCHE RAPIDE EN CÔTE (base/dev) · 9. SORTIE DE NUIT (spec/peak si course de nuit)
    const nightNeeded = (a.race_night === "partielle" || a.race_night === "majoritaire") && (phase === "spec" || phase === "peak");
    if (nightNeeded && weekNum % 2 === 1) {
      S2.push({ d: "rn", name: "Sortie de nuit (frontale)", note: "Courir de nuit change tout : la perception du relief, l'équilibre, la vigilance, le moral. Terrain CONNU, frontale chargée (+ une réserve), rythme facile. L'objectif est de s'habituer, pas de performer — et de vérifier ton matériel avant qu'il te lâche en course.", det: "",
        steps: [B({ durationMin: P(55, 100), gradient: "rolling", zone: "tr.flat", dplusM: upShare(0.2), dmoinsM: Math.round(upShare(0.2) * downFactor), mode: "run_hike", poles, surface: "sentier" })],
        ...({ plainBody: true } as object) } as V1Session);
    } else if (hikeShare >= 0.1 && (phase === "base" || phase === "dev" || phase === "spec")) {
      S2.push({ d: "rn", name: "Marche rapide en montée" + (poles ? " (bâtons)" : ""), note: "Sur ta course, la marche représentera environ " + Math.round(hikeShare * 100) + " % du temps : c'est une compétence, pas un aveu d'échec. Marche vite, mains sur les cuisses ou " + (poles ? "avec les bâtons (poussée complète, buste légèrement penché)" : "bras actifs") + ", rythme cardiaque soutenu. Tu iras plus vite en marchant bien qu'en courant mal. Termine par 20 min de renfo EXCENTRIQUE (squats descendants lents 5 s, fentes, mollets sur une marche) : c'est la protection n°1 des cuisses contre la descente.", det: "",
        steps: [B({ durationMin: P(40, 85), gradient: "up", zone: "tr.hike", dplusM: upShare(0.3), mode: "hike", poles })],
        ...({ plainBody: true } as object) } as V1Session);
    } else {
      // 12. FOOTING PLAT RÉCUP — aucun D+ assumé
      S2.push({ d: "rn", name: "Footing plat + renfo excentrique", note: "Volume facile sur terrain PLAT et souple : aucun dénivelé, aucune technique. C'est le volume qui construit l'aérobie sans ajouter de casse musculaire" + (fasciaInj ? " — et sur terrain souple, ton fascia a besoin de ça" : "") + ". Puis 20 min de renfo EXCENTRIQUE (squats descendants lents 5 s, fentes contrôlées, mollets sur une marche) : c'est la protection n°1 des cuisses contre la descente, et elle se construit dès maintenant.", det: "",
        steps: [B({ durationMin: P(35, 65), gradient: "flat", zone: "tr.flat", mode: "run", surface: fasciaInj ? "sentier" : "route" })],
        ...({ plainBody: true } as object) } as V1Session);
    }
  } else if (slot === "facile2") {
    // 2. BACK-TO-BACK (ultra, spec/peak) sinon footing récup + 11. proprioception
    if (ultra && (phase === "spec" || phase === "peak")) {
      S2.push({ d: "rn", name: "Back-to-back (sur jambes fatiguées)", note: "Le lendemain de ta longue, 60 à 70 % de sa durée, sur des jambes qui n'ont pas récupéré. C'est la séance qui reproduit le plus fidèlement les dernières heures d'un ultra — et la plus utile mentalement. Rythme très facile, marche assumée.", det: "",
        steps: [B({ durationMin: P(45, 90), gradient: "rolling", zone: "tr.easyup", dplusM: upShare(0.25), dmoinsM: Math.round(upShare(0.25) * downFactor), mode: "run_hike", poles })],
        ...({ plainBody: true } as object) } as V1Session);
    } else {
      S2.push({ d: "rn", name: "Footing récup" + (ankleInj ? " + proprioception" : ""), note: "Récupération active à plat : les jambes tournent, zéro intensité, zéro dénivelé. Puis 15-20 min de renfo excentrique si tu ne l'as pas fait cette semaine." + (ankleInj ? " Puis 15 min de proprioception (équilibre sur une jambe, yeux fermés, coussin instable) : c'est ce qui protège ta cheville sur terrain technique." : ""), det: "",
        steps: [B({ durationMin: P(22, 35), gradient: "flat", zone: "tr.easyup", mode: "run", surface: "route" })],
        ...({ plainBody: true } as object) } as V1Session);
    }
  } else if (slot === "recup") {
    // 10/11. RENFO EXCENTRIQUE + proprioception — greffés, jamais une journée en plus
    S2.push({ d: "rs", name: "Repos + renfo excentrique",
      det: "20-25min : squats descendants LENTS (5s à la descente), fentes contrôlées, mollets sur une marche" + (ankleInj ? ", puis 15min de proprioception de cheville" : "") + " — 💡 Objectif : préparer les cuisses à encaisser la descente. C'est la protection la plus efficace contre la casse musculaire du jour J, et ça se construit dès la phase de base.",
      steps: [] });
  } else if (slot === "off") {
    S2.push({ d: "rs", name: "OFF", det: "repos total", steps: [] });
  }
  return S2;
}

/** Slots d'une semaine trail : la structure diffère de la route (descente et marche sont
 *  des séances à part entière, la longue est le pivot). */
export function trailWeekSchema(phase: string, isRecup: boolean, cat: TrailCategory): { charge: string; slot: string }[] {
  if (isRecup) return [
    { charge: "recup", slot: "recup" }, { charge: "facile", slot: "facile2" }, { charge: "off", slot: "off" },
    { charge: "facile", slot: "facileR" }, { charge: "off", slot: "off" }, { charge: "facile", slot: "facileR" }, { charge: "recup", slot: "recup" },
  ];
  const ultra = cat === "ultra" || cat === "ultra_long" || cat === "ultra_xl";
  // Lun repos+renfo · Mar côtes/VAM · Mer footing plat · Jeu descente · Ven OFF · Sam LONGUE · Dim back-to-back ou récup
  return [
    { charge: "recup", slot: "recup" },
    { charge: "dur", slot: "dur1" },
    { charge: "facile", slot: "facileR" },
    { charge: "dur", slot: "dur2" },
    { charge: "off", slot: "off" },
    { charge: "dur", slot: "durLong" },
    { charge: ultra ? "facile" : "facile", slot: "facile2" },
  ];
}
