// R9 — Avatar SVG évolutif à 16 NIVEAUX (choix utilisateur : mix « l'athlète s'équipe »
// + « le décor évolue »). Chaque niveau débloque UN paramètre visuel, cumulatif — au
// niveau 12 on VOIT ses 11 acquis. RÈGLE D'HONNÊTETÉ inchangée : tout est traçable à une
// donnée réelle :
//   · niveau (équipement + décor) → XP d'EBV2.avatar : 100% régularité (jours validés,
//     badges, semaines régulières — jamais un chrono, jamais décroissant) ;
//   · posture + expression        → FORME DU JOUR, lue au check-in du matin (R17.1) ;
//   · couleur de l'aura           → streak de semaines régulières ;
//   · couleur du maillot          → thème choisi (accents par sport de config.js).
// SVG inline léger (PWA offline, zéro image externe), dessinable sur canvas pour le partage.
//
// R17.1 / R17.2 — TROIS CANAUX SÉPARÉS, et c'est le point de la refonte.
//   · le canal FORME DU JOUR : posture + expression, relus à chaque check-in du matin.
//     Il change tous les jours et ne mémorise rien.
//   · le canal PROGRESSION : équipement, décor, aura, couleur. Il ne bouge qu'avec le
//     niveau, qui est cumulatif et ne redescend jamais.
//   · le canal FORME PHYSIQUE (R17.2) : un repère gradué au sol, placé selon la marge au
//     potentiel (`EBV2.perfTier`). Il MONTE ET DESCEND — c'est pour ça qu'il est un repère
//     qui se déplace et non un équipement : il peut reculer sans rien retirer à personne.
// Les trois ne se touchent pas : à niveau égal seule la forme du jour bouge ; à forme du
// jour égale seul l'équipement bouge ; et le repère de forme physique ne touche ni l'un ni
// l'autre. C'est vérifié (`tests/e2e/smoke-avatar.mjs`).
//
// Ce que ça REMPLACE : la posture était pilotée par les séances des 7 derniers jours —
// un signal qui n'est ni la forme d'aujourd'hui ni la progression long terme, et qui
// faisait double emploi avec l'XP (lui aussi compté sur les séances faites). L'avatar ne
// disait donc pas comment tu vas AUJOURD'HUI, alors que la donnée est collectée chaque
// matin depuis R5.
import { S } from "../state.js";
import { SPORTS } from "../config.js";

/**
 * R17.1 / AV6 — POINT D'ANCRAGE DE LA TÊTE. Une seule source : le cercle du crâne et le
 * calque d'expression le lisent tous les deux ici. Le jour où plusieurs morphologies
 * arrivent, elles se calent sur ce point et les cinq expressions restent inchangées —
 * c'est tout l'intérêt de séparer le calque tête du corps.
 */
export const HEAD_ANCHOR = { cx: 50, cy: 36, r: 10 };

export const AVATAR_THEMES = [
  ["tri", "#ff3b30"], ["run", "#ff7a1a"], ["bike", "#2e6bff"], ["swim", "#00b8d9"],
];

export function avatarTheme() {
  const t = S.answers.avatarTheme;
  const found = AVATAR_THEMES.find(([k]) => k === t);
  if (found) return found[1];
  return (SPORTS[S.sport] && SPORTS[S.sport].accent) || "#ff7a1a";
}

/**
 * R17.1 — LES CINQ ÉTATS DE FORME DU JOUR. Ils viennent du check-in du matin (`readiness`),
 * une donnée déjà collectée : aucun nouveau capteur, aucune question de plus.
 *
 * L'ordre est celui d'une échelle, pas d'un jugement — « vidé » n'est pas un échec, c'est
 * une information que le moteur utilise déjà pour adapter la séance. L'avatar ne fait que
 * la MONTRER, avec le même vocabulaire que le reste de l'app.
 */
export const MOODS = [
  { id: "feu", label: "en pleine forme", min: 80 },
  { id: "frais", label: "frais", min: 65 },
  { id: "normal", label: "normal", min: 45 },
  { id: "fatigue", label: "fatigué·e", min: 25 },
  { id: "vide", label: "vidé·e", min: 0 },
];

/**
 * Forme du jour → un des cinq états. Deux garde-fous :
 *   · sans check-in du jour, on rend `normal` — un visage NEUTRE, jamais un visage content
 *     par défaut : l'app ne prétend pas savoir comment tu vas si elle ne t'a pas demandé ;
 *   · drapeau douleur actif → l'état ne peut pas monter au-dessus de « fatigué·e ». Un
 *     avatar souriant pendant qu'un bandeau annonce une douleur, c'est le produit qui se
 *     contredit à l'écran (priorités 1 et 2 du manifeste).
 */
export function moodOf(readiness, painFlag, todayIso) {
  const r = readiness || {};
  const repondu = r.date && (!todayIso || r.date === todayIso);
  let e = repondu && Number.isFinite(+r.energy) ? +r.energy : 55; // 55 = la bande « normal »
  if (painFlag && painFlag.active) e = Math.min(e, 40);
  return (MOODS.find((m) => e >= m.min) || MOODS[MOODS.length - 1]).id;
}

/** Variables visuelles depuis les données réelles — la traçabilité est le contrat. */
export function avatarDataFor(plan, todayISO) {
  const out = { accent: avatarTheme(), streak: 0, mood: "normal", level: 1, icon: "", name: "", perf: null };
  // Le canal forme du jour ne dépend NI du plan NI du moteur : il se lit même si tout le
  // reste échoue, parce que c'est la seule chose que l'athlète a saisie ce matin.
  out.mood = moodOf(S.answers.readiness, S.answers.painFlag, todayISO);
  if (!globalThis.EBV2) return out;
  try {
    const pg = globalThis.EBV2.progress(plan, S.answers, todayISO);
    out.streak = pg.streakWeeks || 0;
    const av = globalThis.EBV2.avatar(plan, S.answers, todayISO);
    out.level = av.level; out.icon = av.icon; out.name = av.name;
    // R17.2 — TROISIÈME CANAL. `null` si aucune référence mesurée : on ne montre pas une
    // position qu'on n'a pas. Il ne touche NI l'équipement NI la posture — c'est tout
    // l'intérêt : il peut reculer sans que l'athlète perde quoi que ce soit.
    out.perf = globalThis.EBV2.perfTier ? globalThis.EBV2.perfTier(S.sport, S.answers) : null;
  } catch (e) { /* avatar par défaut, jamais bloquant */ }
  return out;
}

// Retour utilisateur (08/08/2026) : « l'XP de l'avatar n'est pas conservé en changeant de
// plan ». `EBV2.avatarTri` lit le journal (`answers.done`) du seul plan ACTIF — l'avatar
// représente pourtant LA PERSONNE, pas le plan affiché (« XP cumulatif, jamais décroissant »).
// Pour les plans INACTIFS on n'a que leurs réponses (`p.answers`), jamais leur structure de
// séances générée : on la reconstruit ICI, UNE fois, via le moteur direct — `app.js#buildPlan`
// ne convient pas, il lit `S.sport` (le plan ACTIF) quel que soit l'argument reçu, ce qui
// générerait le plan inactif avec le MAUVAIS sport. Un plan qui échoue à se reconstruire
// (questionnaire jamais terminé, sport corrompu) est ignoré plutôt que de bloquer l'avatar —
// même principe de repli que le reste de ce fichier.
function avatarTriEntries(plan, todayISO) {
  const entries = [{ plan, answers: S.answers }];
  if (!globalThis.EBV2 || typeof globalThis.EBV2.buildPlan !== "function") return entries;
  for (const p of S.plans || []) {
    if (p.id === S.activePlanId || !p.sport) continue;
    try { entries.push({ plan: globalThis.EBV2.buildPlan(p.sport, p.answers || {}), answers: p.answers || {} }); }
    catch (e) { /* plan inactif inexploitable (questionnaire inachevé, réponses corrompues) : ignoré */ }
  }
  return entries;
}
/** R25 étape 4 — l'état du COMPOSITE (3 jauges) depuis les données réelles, même contrat de
 *  traçabilité qu'`avatarDataFor` : niveaux = XP par discipline (EBV2.avatarTriMulti, régularité
 *  pure, SOMMÉE sur tous les plans de l'athlète), mood = check-in du matin, perf = canal 3
 *  (R17.2). Repli sûr 0/0/0 : l'avatar ne bloque jamais l'écran qui le porte. */
export function avatarTriDataFor(plan, todayISO) {
  const out = {
    natation: 0, velo: 0, course: 0, meneuse: "course", legende: false,
    mood: moodOf(S.answers.readiness, S.answers.painFlag, todayISO), perf: null, tri: null,
  };
  if (!globalThis.EBV2 || !globalThis.EBV2.avatarTriMulti) return out;
  try {
    const t = globalThis.EBV2.avatarTriMulti(avatarTriEntries(plan, todayISO), todayISO);
    out.natation = t.natation.level; out.velo = t.velo.level; out.course = t.course.level;
    out.meneuse = t.meneuse; out.legende = t.legende; out.tri = t;
    out.perf = globalThis.EBV2.perfTier ? globalThis.EBV2.perfTier(S.sport, S.answers) : null;
  } catch (e) { /* avatar par défaut, jamais bloquant */ }
  return out;
}

/** Silhouette SVG évolutive. `size` en px. Chaque niveau AJOUTE une couche (équipement de
 *  l'athlète en alternance avec le décor) — voir AVATAR_LEVELS (bridge) pour le registre. */
export function avatarSVG(v, size) {
  const s = size || 120;
  const L = v.level || 1;
  const acc = v.accent || "#ff7a1a";
  const auraCol = v.streak >= 6 ? "#ff7a1a" : v.streak >= 3 ? "#f0b429" : "#00a376";

  // ---- DÉCOR (derrière la silhouette), du fond vers l'avant ----
  let decor = "";
  if (L >= 11) // nocturne : ciel sombre + deux faisceaux de projecteurs
    decor += '<rect x="0" y="0" width="100" height="34" rx="6" fill="#1c2340" opacity="0.25"/>'
      + '<polygon points="8,2 26,2 44,60" fill="#f0b429" opacity="0.18"/>'
      + '<polygon points="92,2 74,2 56,60" fill="#f0b429" opacity="0.18"/>';
  if (L >= 8) // stade : gradins stylisés dans les coins hauts
    decor += '<g fill="#16130e" opacity="0.22"><rect x="2" y="10" width="24" height="3" rx="1.5"/><rect x="4" y="16" width="22" height="3" rx="1.5"/><rect x="6" y="22" width="20" height="3" rx="1.5"/>'
      + '<rect x="74" y="10" width="24" height="3" rx="1.5"/><rect x="74" y="16" width="22" height="3" rx="1.5"/><rect x="74" y="22" width="20" height="3" rx="1.5"/></g>';
  if (L >= 15) // arche d'arrivée au-dessus de la silhouette
    decor += '<path d="M18 30 L18 12 Q50 -4 82 12 L82 30" fill="none" stroke="#16130e" stroke-width="3"/>'
      + '<rect x="30" y="4" width="40" height="7" rx="2" fill="' + acc + '"/><text x="50" y="10" font-size="6" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="bold">ARRIVÉE</text>';
  // sol : parc (L3+) → piste (L5+) ; piédestal doré au sommet (L16)
  if (L >= 5)
    decor += '<g stroke="#16130e" opacity="0.35"><line x1="4" y1="101" x2="96" y2="101" stroke-width="2"/><line x1="4" y1="106" x2="96" y2="106" stroke-width="1.5" stroke-dasharray="7 5"/></g>';
  else if (L >= 3)
    decor += '<line x1="6" y1="101" x2="94" y2="101" stroke="#16130e" stroke-width="2" opacity="0.4"/>'
      + '<g stroke="#00a376" stroke-width="2" stroke-linecap="round"><path d="M14 101 L12 95"/><path d="M18 101 L18 94"/><path d="M84 101 L86 95"/><path d="M80 101 L80 96"/></g>'
      + '<circle cx="10" cy="88" r="7" fill="#00a376" opacity="0.5"/><rect x="9" y="92" width="2" height="9" fill="#16130e" opacity="0.5"/>';
  if (L >= 16)
    decor += '<rect x="30" y="99" width="40" height="9" rx="2" fill="#f0b429" stroke="#16130e" stroke-width="2"/><text x="50" y="107" font-size="7" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="#16130e">1</text>';

  // ---- AURA (L6 fine · L12 pleine) — couleur = streak réel ----
  let aura = "";
  if (L >= 12) aura = '<circle cx="50" cy="58" r="44" fill="none" stroke="' + auraCol + '" stroke-width="4" opacity="0.85"/><circle cx="50" cy="58" r="48" fill="none" stroke="' + auraCol + '" stroke-width="1.5" opacity="0.4"/>';
  else if (L >= 6) aura = '<circle cx="50" cy="58" r="44" fill="none" stroke="' + auraCol + '" stroke-width="3" stroke-dasharray="6 5" opacity="0.8"/>';
  // traînée de vitesse (L12+)
  const speed = L >= 12 ? '<g stroke="' + acc + '" stroke-width="2.5" stroke-linecap="round" opacity="0.7"><path d="M12 52 L26 52"/><path d="M8 62 L24 62"/><path d="M13 72 L27 72"/></g>' : "";

  // ---- SILHOUETTE : POSTURE = FORME DU JOUR (R17.1, canal 1) ----
  // Cinq postures, une par état. Elles ne lisent QUE `mood` : à niveau égal, c'est la seule
  // chose qui bouge — et à forme égale, elles ne bougent pas d'un pixel quel que soit le
  // niveau. C'est ce que vérifient AV1-A et AV1-B.
  const P = {
    feu:     { arms: '<path d="M50 54 L30 28" /><path d="M50 54 L70 28" />', legs: '<path d="M50 74 L36 96" /><path d="M50 74 L62 90 L65 97" />' },
    frais:   { arms: '<path d="M50 54 L32 34" /><path d="M50 54 L68 34" />', legs: '<path d="M50 74 L38 96" /><path d="M50 74 L62 92 L64 98" />' },
    normal:  { arms: '<path d="M50 54 L34 62" /><path d="M50 54 L66 46" />', legs: '<path d="M50 74 L42 97" /><path d="M50 74 L58 97" />' },
    fatigue: { arms: '<path d="M50 54 L36 70" /><path d="M50 54 L64 70" />', legs: '<path d="M50 74 L44 98" /><path d="M50 74 L56 98" />' },
    vide:    { arms: '<path d="M50 56 L37 74" /><path d="M50 56 L63 74" />', legs: '<path d="M50 76 L45 99" /><path d="M50 76 L55 99" />' },
  };
  const pose = P[v.mood] || P.normal;
  const arms = pose.arms, legs = pose.legs;
  // Épaules affaissées quand la forme est basse : un décalage vertical du buste, pas une
  // silhouette différente — le corps reste le même, c'est sa tenue qui parle.
  const affaissement = v.mood === "vide" ? 2 : v.mood === "fatigue" ? 1 : 0;
  // chaussures (L2+) : embouts à ta couleur au bout des jambes
  // Les chaussures sont de l'ÉQUIPEMENT (canal progression, L2+) mais elles se posent au
  // bout des jambes : leur PRÉSENCE suit le niveau, leur POSITION suit la posture.
  const enMouvement = v.mood === "feu" || v.mood === "frais";
  const _shoes = L >= 2 ? (enMouvement
    ? '<g stroke="' + acc + '" stroke-width="5" stroke-linecap="round"><path d="M38 96 L34 98"/><path d="M64 98 L68 98"/></g>'
    : '<g stroke="' + acc + '" stroke-width="5" stroke-linecap="round"><path d="M44 98 L40 99"/><path d="M56 98 L60 99"/></g>') : "";
  // torse : simple → maillot bicolore (L9+)
  const y0 = 46 + affaissement, y1 = 74 + (affaissement ? 1 : 0);
  const torso = L >= 9
    ? '<path d="M50 ' + y0 + ' L50 ' + y1 + '" stroke="' + acc + '" stroke-width="9"/><path d="M50 ' + y0 + ' L50 ' + (y0 + 14) + '" stroke="#16130e" stroke-width="9" opacity="0.35"/>'
    : '<path d="M50 ' + y0 + ' L50 ' + y1 + '" stroke="' + acc + '" stroke-width="9"/>';
  const _bandana = L >= 4 ? '<rect x="41" y="29" width="18" height="4" rx="2" fill="' + acc + '"/><path d="M59 31 L66 27" stroke="' + acc + '" stroke-width="3" stroke-linecap="round"/>' : "";
  const _glasses = L >= 7 ? '<g fill="#16130e"><rect x="42" y="34" width="7" height="4" rx="2"/><rect x="51" y="34" width="7" height="4" rx="2"/></g>' : "";
  const _bib = L >= 10 ? '<rect x="44" y="58" width="12" height="9" rx="1.5" fill="#fff" stroke="#16130e" stroke-width="1.2"/><text x="50" y="65" font-size="6.5" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="#16130e">' + L + "</text>" : "";
  const _medal = L >= 14 ? '<path d="M46 48 L50 55 L54 48" stroke="#e63946" stroke-width="1.5" fill="none"/><circle cx="50" cy="56" r="4" fill="#f0b429" stroke="#16130e" stroke-width="1"/>' : "";
  const _stars = L >= 13 ? '<text x="70" y="24" font-size="11">⭐</text><text x="20" y="34" font-size="8">⭐</text><text x="80" y="46" font-size="7">⭐</text>' : "";
  const _laurel = L >= 16 ? '<g stroke="#00734f" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M40 28 Q44 21 50 20"/><path d="M60 28 Q56 21 50 20"/><path d="M41 26 L38 24"/><path d="M43 23 L41 20"/><path d="M59 26 L62 24"/><path d="M57 23 L59 20"/></g>' : "";

  // ---- TÊTE : CALQUE INDÉPENDANT, ANCRAGE FIXE (R17.1 / AV6) ----
  // Le visage se dessine TOUJOURS au même point, quelle que soit la silhouette. C'est ce
  // qui permettra d'ajouter des morphologies plus tard sans redessiner les cinq
  // expressions : elles se posent sur l'ancrage, pas sur le corps. Le contrat est exporté
  // (`HEAD_ANCHOR`) pour qu'un test puisse le vérifier au lieu de le supposer.
  const A = HEAD_ANCHOR;
  const oeil = (dx, dy, r) => '<circle cx="' + (A.cx + dx) + '" cy="' + (A.cy + dy) + '" r="' + r + '" fill="#16130e"/>';
  const F = {
    // bouche large, yeux ouverts, sourcils relevés
    feu: oeil(-3.5, -1.5, 1.3) + oeil(3.5, -1.5, 1.3)
      + '<path d="M' + (A.cx - 4) + ' ' + (A.cy + 3) + ' Q' + A.cx + ' ' + (A.cy + 7) + ' ' + (A.cx + 4) + ' ' + (A.cy + 3) + '" stroke="#16130e" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
    // sourire discret
    frais: oeil(-3.5, -1, 1.2) + oeil(3.5, -1, 1.2)
      + '<path d="M' + (A.cx - 3) + ' ' + (A.cy + 3.5) + ' Q' + A.cx + ' ' + (A.cy + 6) + ' ' + (A.cx + 3) + ' ' + (A.cy + 3.5) + '" stroke="#16130e" stroke-width="1.3" fill="none" stroke-linecap="round"/>',
    // neutre : bouche droite — c'est aussi l'état SANS check-in, jamais un sourire par défaut
    normal: oeil(-3.5, -1, 1.2) + oeil(3.5, -1, 1.2)
      + '<path d="M' + (A.cx - 3) + ' ' + (A.cy + 4) + ' L' + (A.cx + 3) + ' ' + (A.cy + 4) + '" stroke="#16130e" stroke-width="1.3" stroke-linecap="round"/>',
    // yeux mi-clos (traits), bouche légèrement tombante
    fatigue: '<path d="M' + (A.cx - 5) + ' ' + (A.cy - 1) + ' L' + (A.cx - 2) + ' ' + (A.cy - 1) + '" stroke="#16130e" stroke-width="1.4" stroke-linecap="round"/>'
      + '<path d="M' + (A.cx + 2) + ' ' + (A.cy - 1) + ' L' + (A.cx + 5) + ' ' + (A.cy - 1) + '" stroke="#16130e" stroke-width="1.4" stroke-linecap="round"/>'
      + '<path d="M' + (A.cx - 3) + ' ' + (A.cy + 5) + ' Q' + A.cx + ' ' + (A.cy + 3) + ' ' + (A.cx + 3) + ' ' + (A.cy + 5) + '" stroke="#16130e" stroke-width="1.3" fill="none" stroke-linecap="round"/>',
    // yeux fermés, bouche tombante — l'état que le moteur traduit par « repos conseillé »
    vide: '<path d="M' + (A.cx - 5) + ' ' + A.cy + ' Q' + (A.cx - 3.5) + ' ' + (A.cy + 1.5) + ' ' + (A.cx - 2) + ' ' + A.cy + '" stroke="#16130e" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
      + '<path d="M' + (A.cx + 2) + ' ' + A.cy + ' Q' + (A.cx + 3.5) + ' ' + (A.cy + 1.5) + ' ' + (A.cx + 5) + ' ' + A.cy + '" stroke="#16130e" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
      + '<path d="M' + (A.cx - 3) + ' ' + (A.cy + 5.5) + ' Q' + A.cx + ' ' + (A.cy + 3) + ' ' + (A.cx + 3) + ' ' + (A.cy + 5.5) + '" stroke="#16130e" stroke-width="1.3" fill="none" stroke-linecap="round"/>',
  };
  const visage = '<g data-mood="' + (v.mood || "normal") + '">' + (F[v.mood] || F.normal) + "</g>";
  const moodLabel = (MOODS.find((m) => m.id === v.mood) || MOODS[2]).label;
  const perfLabel = v.perf && Number.isFinite(v.perf.tier) ? ", repère de forme " + v.perf.tier + " sur 10" : "";

  // ---- CANAL 3 : LA FORME PHYSIQUE (R17.2) ----
  // Une échelle graduée au sol et un repère qui s'y place. Le repère se DÉPLACE : il peut
  // reculer sans que rien ne disparaisse de l'avatar. C'est la différence entre « tu es ici
  // aujourd'hui » et « on te retire ce que tu avais gagné ».
  // Absent tant qu'aucune référence n'est mesurée — pas de repère au minimum par défaut.
  let perf = "";
  if (v.perf && Number.isFinite(v.perf.tier)) {
    const t = Math.max(1, Math.min(10, v.perf.tier));
    const x = 18 + ((t - 1) / 9) * 64; // 10 graduations de x=18 à x=82
    let grad = "";
    for (let i = 0; i < 10; i++) {
      const gx = 18 + (i / 9) * 64;
      grad += '<line x1="' + gx.toFixed(1) + '" y1="109.5" x2="' + gx.toFixed(1) + '" y2="' + (i === t - 1 ? 105 : 107.5) + '" stroke="#16130e" stroke-width="' + (i === t - 1 ? 1.6 : 0.8) + '" opacity="' + (i === t - 1 ? 0.9 : 0.3) + '"/>';
    }
    // Le repère n'est JAMAIS rouge et ne porte aucun mot d'échec : c'est un constat, pas
    // une note. Il utilise l'accent du sport, comme le reste de l'équipement.
    perf = '<g data-layer="perf" data-tier="' + t + '">' + grad
      + '<path d="M' + x.toFixed(1) + ' 103 l-2.6 -3.4 h5.2 z" fill="' + acc + '" stroke="#16130e" stroke-width="0.8"/></g>';
  }

  // R17.1 — CONTRAT DE CALQUES. Chaque pièce est étiquetée : c'est ce qui permet à un test
  // de vérifier la séparation des canaux sans deviner au moyen d'expressions régulières, et
  // c'est la même structure qu'attendrait une bibliothèque de composants illustrés.
  const piece = (nom, svgTxt) => (svgTxt ? '<g data-piece="' + nom + '">' + svgTxt + "</g>" : "");
  const gear = '<g data-layer="gear">'
    + piece("chaussures", _shoes) + piece("bandana", _bandana) + piece("lunettes", _glasses)
    + piece("dossard", _bib) + piece("medaille", _medal) + piece("etoiles", _stars)
    + piece("laurier", _laurel) + "</g>";

  return '<svg viewBox="0 0 100 110" width="' + s + '" height="' + Math.round(s * 1.1) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar niveau ' + L + ', ' + moodLabel + perfLabel + '">'
    + decor + aura + speed
    + '<g stroke="#16130e" stroke-width="5" stroke-linecap="round" fill="none">'
    + '<circle cx="' + A.cx + '" cy="' + A.cy + '" r="' + A.r + '" fill="#f6efe0"/>'
    + '<g data-layer="maillot">' + torso + "</g>"
    + '<g data-layer="posture">' + arms + legs + "</g>"
    + "</g>" + visage + gear + perf
    + "</svg>";
}
