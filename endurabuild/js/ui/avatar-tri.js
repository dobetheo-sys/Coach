// R25 étape 3 — L'AVATAR COMPOSITE : moteur de boucles + les deux rendus (spec validée
// par le fondateur, 07-08/08/2026 — remplace les tables §4 du brief R13).
//
// LE SYSTÈME EN BOUCLES : chaque discipline tourne en boucles de 5 niveaux ; chaque niveau
// fait passer UN item à sa génération suivante ; 6 boucles = 30 niveaux, aucun niveau vide.
// L'item en position p atteint sa génération g au niveau p + 5×(g−1).
// Roulement DIFFÉRENT par discipline (le niveau 1 débloque l'objet iconique) :
//   NATATION : bonnet → plan d'eau → lunettes → matériel → ambiance
//   VÉLO     : le vélo → maillot → parcours → équipement → ambiance
//   COURSE   : chaussures → parcours → le bas → ceinture → ambiance
// Deux MODES par item, décidés par le fondateur : « remplace » (la génération n s'affiche
// seule) ou « s'ajoute » (les générations 1..n s'affichent ensemble) — cumulatif sur
// matériel nat, parcours vélo, ambiance vélo, ambiance course. L'OR est partout le palier
// ultime (B6), le national en B5.
//
// LES 7 RÈGLES DE L'AUDIT DESIGN (invariants de rendu, une partie vérifiée par la passe
// exhaustive de demo:avatartri) :
//   1. pose en A symétrique par défaut — la silhouette montre l'équipement ;
//   2. l'aura est un CERCLE DE LUMIÈRE AU SOL (elle ancre, elle ne barre pas) ;
//   3. trois plans de profondeur : fond estompé (≤ .2) · objets pleins · athlète maximal ;
//   4. zone calme centrale — aucun décor n'y entre ;
//   5. UNE seule arche, un seul texte ; le final vélo est la flamme rouge du dernier km ;
//   6. ombres de contact sous tout ce qui est posé ;
//   7. chaque cumulatif vit dans une zone fermée.
// Plus LES TROIS MARQUEURS de niveau (décision fondateur) : le numéro sur le BONNET
// (natation, comme en eau libre), le DOSSARD DE POITRINE (vélo), la CEINTURE-DOSSARD
// (course — dossard épinglé dès le niveau 1). Or à 30.
//
// MODULE PUR, ZÉRO IMPORT : les deux rendus sont des fonctions (niveaux, options) → SVG.
// C'est ce qui permet à `npm run demo:avatartri` (node, CI) d'exécuter la passe exhaustive
// (0..30)³ sans navigateur. L'ancien `avatarSVG` (16 niveaux) n'est PAS touché : il reste
// le rendu branché tant que le câblage UI (lot suivant) n'a pas basculé.

const INK = "#16130e", CREME = "#f6efe0", OR = "#f0b429", VERT = "#00a376",
  NUIT = "#1c2340", BBR = "#2244aa", RGE = "#e63946";
const ACC = { natation: "#00b8d9", velo: "#2e6bff", course: "#ff7a1a" };

/** LE REGISTRE DES BOUCLES — source unique (R11.1) : l'ordre EST le roulement. */
export const AVATAR_TRI_ROULEMENTS = {
  natation: [
    { id: "bonnet", mode: "remplace", gens: ["Bonnet en tissu", "Bonnet coloré", "Bonnet siliconé", "Bonnet de compét'", "Bonnet national", "Bonnet doré"] },
    { id: "plan_eau", mode: "remplace", gens: ["La mare", "La piscine gonflable", "Le bassin municipal", "La mer", "Le bassin 50 m", "La piscine olympique"] },
    { id: "lunettes", mode: "remplace", gens: ["Lunettes simples", "De piscine bleues", "Teintées", "Effet miroir", "Racing profilées", "Dorées"] },
    { id: "materiel", mode: "ajoute", gens: ["La frite", "+ la planche", "+ le pull buoy", "+ les plaquettes", "+ le tuba frontal", "+ le pendule géant"] },
    { id: "ambiance", mode: "remplace", gens: ["Éclaboussures", "Vaguelettes", "Le sillage", "Les bouées de parcours", "Les drapeaux de virage", "La foule au bord"] },
  ],
  velo: [
    { id: "velo", mode: "remplace", gens: ["La draisienne", "Le vélo de ville", "Le route alu", "Le route carbone", "Le contre-la-montre", "Le CLM doré"] },
    { id: "maillot", mode: "remplace", gens: ["T-shirt", "Maillot coloré", "Maillot bicolore", "Manches longues", "Maillot national", "Maillot doré"] },
    { id: "parcours", mode: "ajoute", gens: ["Le chemin", "+ la route", "+ les collines", "+ le col (lacets, fanion)", "+ le sommet doré", "+ le vélodrome"] },
    { id: "equipement", mode: "remplace", gens: ["Le bidon", "La sacoche", "Le compteur", "Le capteur de watts", "Les roues profilées", "La plaque n°1"] },
    { id: "ambiance", mode: "ajoute", gens: ["La banderole départ", "+ les fanions", "+ les spectateurs", "+ le village", "+ la foule", "+ la flamme rouge"] },
  ],
  course: [
    { id: "chaussures", mode: "remplace", gens: ["Baskets usées", "Chaussures colorées", "Grosses semelles", "Plaque carbone", "Nationales", "Dorées"] },
    { id: "parcours", mode: "remplace", gens: ["Le parc", "La piste", "Le stade", "Les collines", "Le nocturne", "La ligne mythique"] },
    { id: "bas", mode: "remplace", gens: ["Short gris", "Short coloré", "Cuissard", "Cuissard bicolore", "Cuissard national", "Cuissard doré"] },
    { id: "ceinture", mode: "remplace", gens: ["Dossard épinglé", "Ceinture simple", "Ceinture + dossard", "Porte-gels (flasques)", "Ceinture dorée", "Dossard n°1"] },
    { id: "ambiance", mode: "ajoute", gens: ["Les plots", "+ le ruban balisage", "+ les spectateurs", "+ le village", "+ la foule + cloche", "+ l'arche ARRIVÉE"] },
  ],
};

/** Génération (0..6) de l'item en position pos (1..5) au niveau L (0..30). Fonction pure. */
export function avatarTriGen(L, pos) {
  return L >= pos ? Math.min(6, Math.floor((L - pos) / 5) + 1) : 0;
}

/** Résout les 5 slots d'une discipline au niveau L : {id, mode, gen, libelle}. */
export function avatarTriSlots(disc, L) {
  const items = AVATAR_TRI_ROULEMENTS[disc] || [];
  return items.map((it, i) => {
    const gen = avatarTriGen(L, i + 1);
    return { id: it.id, mode: it.mode, gen, libelle: gen > 0 ? it.gens[gen - 1] : null };
  });
}

const pick = (arr, g) => (g > 0 ? arr[g - 1] : "");
const pileUp = (arr, g) => arr.slice(0, g).join("");
const meneuseDe = (n, v, c) => (v >= n && v >= c ? "velo" : n >= c ? "natation" : "course");

// ───────────────────────── LE COMPOSITE CARRÉ (cartes 96-110 px) ─────────────────────────
// Même géométrie de silhouette que l'existant (viewBox 0 0 100 110, tête 50/36 r10, torse
// 46→74, sol y101) : les postures « forme du jour » de avatar.js s'y posent telles quelles.

const POSTURES = {
  // Reprises de avatar.js (canal forme du jour, R17.1) — « normal » applique la règle CD1 :
  // pose en A symétrique, le torse et ses marqueurs restent dégagés.
  // La pose est une DONNÉE (hanche, genou éventuel, pied par jambe), plus un dessin : les
  // pièces portées (chaussures, bas) et la ceinture se CALCULENT depuis les pieds et les
  // jambes de la pose RENDUE. Ma première écriture les dessinait aux coordonnées de la pose
  // normale — en « feu », les chaussures flottaient à côté des pieds. C'est le défaut que
  // smoke-avatar avait nommé sans pouvoir le voir ici : « les chaussures se posent au bout
  // des jambes ; si les jambes bougent, elles bougent ».
  feu: { arms: '<path d="M50 54 L30 28" /><path d="M50 54 L70 28" />', hip: [50, 74], L: { foot: [36, 96] }, R: { knee: [62, 90], foot: [65, 97] } },
  frais: { arms: '<path d="M50 54 L32 34" /><path d="M50 54 L68 34" />', hip: [50, 74], L: { foot: [38, 96] }, R: { knee: [62, 92], foot: [64, 98] } },
  normal: { arms: '<path d="M50 54 L36 67" /><path d="M50 54 L64 67" />', hip: [50, 74], L: { foot: [42, 97] }, R: { foot: [58, 97] } },
  fatigue: { arms: '<path d="M50 54 L36 70" /><path d="M50 54 L64 70" />', hip: [50, 74], L: { foot: [44, 98] }, R: { foot: [56, 98] } },
  vide: { arms: '<path d="M50 56 L37 74" /><path d="M50 56 L63 74" />', hip: [50, 76], L: { foot: [45, 99] }, R: { foot: [55, 99] } },
};
const n1 = (x) => String(Math.round(x * 10) / 10);
const legPath = (hip, leg) => '<path d="M' + n1(hip[0]) + " " + n1(hip[1]) + (leg.knee ? " L" + n1(leg.knee[0]) + " " + n1(leg.knee[1]) : "") + " L" + n1(leg.foot[0]) + " " + n1(leg.foot[1]) + '" />';
const legsOf = (pose) => legPath(pose.hip, pose.L) + legPath(pose.hip, pose.R);
/** Les deux pieds de la pose, avec leur signe « vers l'extérieur » (gauche −1, droite +1). */
const feetOf = (pose) => [{ x: pose.L.foot[0], y: pose.L.foot[1], s: -1 }, { x: pose.R.foot[0], y: pose.R.foot[1], s: 1 }];
const lerp = (h, d, t) => [h[0] + (d[0] - h[0]) * t, h[1] + (d[1] - h[1]) * t];
/** Un segment ancré sur un pied : offsets horizontaux SIGNÉS vers l'extérieur, verticaux absolus. */
const segAt = (f, a, ya, b, yb, attr) => '<path d="M' + n1(f.x + a * f.s) + " " + n1(f.y + ya) + " L" + n1(f.x + b * f.s) + " " + n1(f.y + yb) + '"' + (attr || "") + "/>";

// ---- pièces portées (générations 1..6) ----
const bon = (fill, extra) => '<path d="M40 33 A10 10 0 0 1 60 33 Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="1.5"/>' + (extra || "");
const P_BONNET = [
  bon("#e8dfc8"), bon(ACC.natation),
  bon(ACC.natation, '<path d="M43 28 Q50 24 57 28" stroke="#fff" stroke-width="1.4" fill="none" opacity="0.85"/>'),
  bon(ACC.natation, '<path d="M42 30 Q50 26.5 58 30" stroke="#fff" stroke-width="1.8" fill="none"/><path d="M40 33 L60 33" stroke="#fff" stroke-width="1.6"/>'),
  bon(BBR, '<path d="M42 30 Q50 26.5 58 30" stroke="#fff" stroke-width="2.2" fill="none"/><path d="M41 32 Q50 28.5 59 32" stroke="' + RGE + '" stroke-width="2.2" fill="none"/>'),
  bon(OR, '<path d="M43 28 Q50 24 57 28" stroke="#fff" stroke-width="1.2" fill="none" opacity="0.7"/>'),
];
const lun = (fill, extra) => '<circle cx="46" cy="34.5" r="3" fill="' + fill + '" stroke="' + INK + '" stroke-width="1.3"/><circle cx="54" cy="34.5" r="3" fill="' + fill + '" stroke="' + INK + '" stroke-width="1.3"/><path d="M49 34.5 L51 34.5" stroke="' + INK + '" stroke-width="1.3"/>' + (extra || "");
const P_LUNETTES = [
  lun(CREME), lun("#9fd8ea"), lun(NUIT),
  lun("#9fd8ea", '<path d="M44.5 33.5 L47 35.5 M52.5 33.5 L55 35.5" stroke="#fff" stroke-width="0.9"/>'),
  '<ellipse cx="46" cy="34.5" rx="3.2" ry="2.3" fill="' + NUIT + '" stroke="' + INK + '" stroke-width="1.2"/><ellipse cx="54" cy="34.5" rx="3.2" ry="2.3" fill="' + NUIT + '" stroke="' + INK + '" stroke-width="1.2"/><path d="M49 34.5 L51 34.5" stroke="' + INK + '" stroke-width="1.2"/>',
  '<circle cx="46" cy="34.5" r="3" fill="#ffe9b0" stroke="' + OR + '" stroke-width="1.5"/><circle cx="54" cy="34.5" r="3" fill="#ffe9b0" stroke="' + OR + '" stroke-width="1.5"/><path d="M49 34.5 L51 34.5" stroke="' + OR + '" stroke-width="1.5"/>',
];
const torse = (c) => '<path d="M50 46 L50 74" stroke="' + c + '" stroke-width="9"/>';
const manches = (c, pose) => '<g stroke="' + c + '" stroke-width="5" stroke-linecap="round">' + pose.arms + "</g>";
const P_MAILLOT_COL = ["#e8dfc8", ACC.velo, ACC.velo, ACC.velo, BBR, OR];
const shoeSVG = (c, pose, extra) => '<g stroke="' + c + '" stroke-width="5" stroke-linecap="round">' + feetOf(pose).map((f) => segAt(f, -2, 1, 2, 2)).join("") + "</g>" + (extra || "");
const carboneSVG = (pose) => '<g stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round">' + feetOf(pose).map((f) => segAt(f, -2, 3, 2.5, 4)).join("") + "</g>";
const chaussuresSVG = (gen, pose) => {
  if (gen <= 0) return "";
  if (gen === 1) return shoeSVG("#b9ac8f", pose);
  if (gen === 2) return shoeSVG(ACC.course, pose);
  if (gen === 3) return shoeSVG(ACC.course, pose, '<g stroke="#fff" stroke-width="2.2" stroke-linecap="round">' + feetOf(pose).map((f) => segAt(f, -2, 2.6, 2, 3.6)).join("") + "</g>");
  if (gen === 4) return shoeSVG(ACC.course, pose, carboneSVG(pose));
  if (gen === 5) return shoeSVG(BBR, pose, carboneSVG(pose) + '<g stroke-width="1.6" stroke-linecap="round">' + feetOf(pose).map((f) => segAt(f, -1, 0.5, 1.5, 1.2, ' stroke="' + (f.s < 0 ? "#fff" : RGE) + '"')).join("") + "</g>");
  return shoeSVG(OR, pose, carboneSVG(pose));
};
// Le bas suit la JAMBE de la pose (hanche → genou s'il existe, sinon le pied) : short à
// t≈0,39, cuissard à t≈0,57 — les valeurs qui reproduisent le dessin de la pose normale.
const basSVG = (gen, pose) => {
  if (gen <= 0) return "";
  const cols = ["#b9ac8f", ACC.course, NUIT, NUIT, BBR, OR];
  const t = gen >= 3 ? 0.565 : 0.391;
  const seg = (leg, ta, tb, attr) => {
    const d = leg.knee || leg.foot;
    const a = lerp(pose.hip, d, ta), b = lerp(pose.hip, d, tb);
    return '<path d="M' + n1(a[0]) + " " + n1(a[1]) + " L" + n1(b[0]) + " " + n1(b[1]) + '"' + (attr || "") + "/>";
  };
  let s = '<g stroke="' + cols[gen - 1] + '" stroke-width="6" stroke-linecap="round">' + seg(pose.L, 0, t) + seg(pose.R, 0, t) + "</g>";
  if (gen === 4) s += '<g stroke="' + ACC.course + '" stroke-width="2" stroke-linecap="round">' + seg(pose.L, 0.413, 0.522) + seg(pose.R, 0.413, 0.522) + "</g>";
  if (gen === 5) s += '<g stroke-width="2" stroke-linecap="round">' + seg(pose.L, 0.413, 0.522, ' stroke="#fff"') + seg(pose.R, 0.413, 0.522, ' stroke="' + RGE + '"') + "</g>";
  return s;
};
const ceintureSVG = (gen, niveau, dy) => {
  if (gen <= 0) return "";
  const d = dy || 0; // la ceinture est à la hanche : elle suit la pose (« vide » descend de 2)
  const cc = gen >= 5 ? OR : ACC.course;
  if (gen === 1) return '<rect x="46.5" y="' + n1(68 + d) + '" width="7" height="5.5" rx="1" fill="#fff" stroke="' + INK + '" stroke-width="1"/><text x="50" y="' + n1(72.4 + d) + '" font-size="3.6" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + INK + '">' + niveau + "</text>";
  let s = '<path d="M45.8 ' + n1(73 + d) + " L54.2 " + n1(73 + d) + '" stroke="' + cc + '" stroke-width="2.6" stroke-linecap="round"/>';
  if (gen >= 3) s += '<rect x="47" y="' + n1(74 + d) + '" width="6" height="4.5" rx="1" fill="' + (gen === 6 ? OR : "#fff") + '" stroke="' + INK + '" stroke-width="1"/><text x="50" y="' + n1(77.8 + d) + '" font-size="3.4" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + INK + '">' + (gen === 6 ? "1" : niveau) + "</text>";
  if (gen === 4) s += '<rect x="43.6" y="' + n1(72 + d) + '" width="2.4" height="5" rx="1.1" fill="' + ACC.natation + '" stroke="' + INK + '" stroke-width="0.8"/><rect x="54" y="' + n1(72 + d) + '" width="2.4" height="5" rx="1.1" fill="' + ACC.natation + '" stroke="' + INK + '" stroke-width="0.8"/>';
  return s;
};

// ---- décors (plan 1 fond estompé · plan 2 objets), zones fermées ----
const D_PLAN_EAU = [
  '<ellipse cx="15" cy="97.5" rx="11" ry="3.8" fill="#4aa89e" opacity="0.45"/><g stroke="#00734f" stroke-width="1.3" stroke-linecap="round"><line x1="7" y1="98" x2="6" y2="90"/><line x1="24" y1="98" x2="25" y2="91.5"/></g><ellipse cx="6" cy="89.5" rx="1.1" ry="1.9" fill="#6b4f2a"/><ellipse cx="18" cy="96.5" rx="2.4" ry="1" fill="' + VERT + '" opacity="0.7"/>',
  '<rect x="5" y="92" width="23" height="9" rx="4.4" fill="#9fd8ea" opacity="0.9"/><rect x="5" y="92" width="23" height="9" rx="4.4" fill="none" stroke="' + RGE + '" stroke-width="2.4"/><g stroke="' + ACC.natation + '" fill="none" stroke-width="1.1" opacity="0.8"><path d="M9 96.8 Q11 95.4 13 96.8 T17 96.8"/></g>',
  '<rect x="2" y="90.5" width="30" height="11.5" rx="1" fill="' + ACC.natation + '" opacity="0.22"/><line x1="3" y1="96.3" x2="31" y2="96.3" stroke="' + ACC.natation + '" stroke-width="1.5" stroke-dasharray="2.6 2.2" opacity="0.8"/><rect x="4" y="87.6" width="4.2" height="2.9" rx="0.6" fill="' + INK + '" opacity="0.5"/>',
  '<path d="M0 92.5 Q8 90 16 92.5 T33 93 L33 110 L0 110 Z" fill="' + ACC.natation + '" opacity="0.24"/><g stroke="' + ACC.natation + '" fill="none" stroke-width="1.4" opacity="0.65"><path d="M3 96.5 Q6.5 94 10 96.5 T17 96.5 T24 96.5"/></g><path d="M14.5 90 L14.5 85.5 L17.7 89.1 Z" fill="#fff" stroke="' + INK + '" stroke-width="0.85" opacity="0.9"/><g stroke="' + INK + '" stroke-width="0.9" fill="none" opacity="0.8"><path d="M24 85 Q25.4 83.6 26.8 85"/><path d="M26.8 85 Q28.2 83.6 29.6 85"/></g>',
  '<rect x="2" y="89.5" width="31" height="12.5" rx="1" fill="' + ACC.velo + '" opacity="0.25"/><g stroke="#fff" stroke-width="1" stroke-dasharray="2.4 2" opacity="0.85"><line x1="3" y1="93.3" x2="32" y2="93.3"/><line x1="3" y1="97.2" x2="32" y2="97.2"/></g>',
  '<rect x="6" y="88.5" width="27" height="14" rx="1" fill="' + ACC.velo + '" opacity="0.3"/>'
    + [92, 95.3, 98.6].map((y) => Array.from({ length: 12 }, (_, i) => '<circle cx="' + (7.5 + i * 2.2) + '" cy="' + y + '" r="0.7" fill="' + (i % 2 ? RGE : OR) + '"/>').join("")).join("")
    + '<rect x="1" y="87.5" width="4.6" height="16" fill="#e8dfc8" opacity="0.9"/>'
    + [92, 95.3, 98.6].map((y, i) => '<rect x="1.3" y="' + (y - 1.8) + '" width="4" height="2.9" rx="0.7" fill="#fff" stroke="' + INK + '" stroke-width="0.85"/><text x="3.3" y="' + (y + 0.5) + '" font-size="2.3" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + INK + '">' + (i + 1) + "</text>").join("")
    + '<line x1="6" y1="85.3" x2="33" y2="85.3" stroke="' + INK + '" stroke-width="0.8" opacity="0.5"/>' + [10, 17, 24, 30].map((x) => '<path d="M' + x + " 85.3 L" + (x + 2.2) + " 85.3 L" + (x + 1.1) + ' 87.6 Z" fill="' + ACC.course + '" opacity="0.9"/>').join(""),
];
const D_MATERIEL = [
  '<path d="M4 98 Q7 91 10 95.5 Q13 100 16 93.5" stroke="' + RGE + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
  '<rect x="17" y="88" width="10" height="8" rx="3" fill="#9fd8ea" stroke="' + INK + '" stroke-width="1.3" transform="rotate(-8 22 92)"/>',
  '<g transform="rotate(-10 31.5 93.5)"><ellipse cx="29" cy="93.5" rx="3" ry="4" fill="#f0e6cf" stroke="' + INK + '" stroke-width="1.2"/><ellipse cx="34.5" cy="93.5" rx="3" ry="4" fill="#f0e6cf" stroke="' + INK + '" stroke-width="1.2"/><rect x="30" y="91.8" width="3.6" height="3.4" fill="#f0e6cf"/></g>',
  '<rect x="39" y="88.5" width="5.6" height="7.5" rx="1.8" fill="' + ACC.natation + '" stroke="' + INK + '" stroke-width="1.2"/><rect x="46" y="90" width="5.6" height="7.5" rx="1.8" fill="' + ACC.natation + '" stroke="' + INK + '" stroke-width="1.2"/>',
  '<path d="M55.5 98 L55.5 86 Q55.5 82 59 82" stroke="' + RGE + '" stroke-width="2.6" fill="none" stroke-linecap="round"/><rect x="53" y="93" width="5" height="3.2" rx="1.2" fill="' + INK + '"/>',
  '<circle cx="66" cy="88" r="7.5" fill="#fff" stroke="' + INK + '" stroke-width="1.8"/><line x1="66" y1="88" x2="66" y2="83" stroke="' + RGE + '" stroke-width="1.4"/><line x1="66" y1="88" x2="70.2" y2="90" stroke="' + INK + '" stroke-width="1.1"/><line x1="66" y1="95.5" x2="66" y2="101" stroke="' + INK + '" stroke-width="1.8"/>',
];
const D_AMB_N = [
  '<g fill="' + ACC.natation + '" opacity="0.75"><circle cx="7" cy="84" r="1.2"/><circle cx="12" cy="82" r="0.85"/></g>',
  '<g stroke="' + ACC.natation + '" fill="none" stroke-width="1.4" opacity="0.6" stroke-linecap="round"><path d="M2 83.5 Q5 81.5 8 83.5 T14 83.5"/></g>',
  '<g stroke="' + ACC.natation + '" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.55"><path d="M18 80 Q23 78 28 80"/></g>',
  '<circle cx="6" cy="80.5" r="1.8" fill="' + ACC.course + '" stroke="' + INK + '" stroke-width="0.9" opacity="0.9"/><circle cx="24" cy="79" r="1.8" fill="' + ACC.course + '" stroke="' + INK + '" stroke-width="0.9" opacity="0.9"/>',
  '<line x1="1" y1="76.5" x2="33" y2="76.5" stroke="' + OR + '" stroke-width="0.9" opacity="0.85"/>' + [5, 14, 23, 30].map((x) => '<path d="M' + x + " 76.5 L" + (x + 2.2) + " 76.5 L" + (x + 1.1) + ' 78.9 Z" fill="' + ACC.course + '" opacity="0.85"/>').join(""),
  '<g fill="' + INK + '" opacity="0.25"><circle cx="4" cy="72" r="1.8"/><circle cx="10" cy="70.3" r="1.8"/><circle cx="17" cy="72.3" r="1.8"/></g>',
];
const D_PARC_V = [
  '<line x1="4" y1="31" x2="36" y2="31" stroke="' + INK + '" stroke-width="1.4" stroke-dasharray="4 4" opacity="0.3"/>',
  '<g opacity="0.32"><line x1="2" y1="28" x2="37" y2="28" stroke="' + INK + '" stroke-width="1.8"/><line x1="5" y1="29.7" x2="34" y2="29.7" stroke="' + INK + '" stroke-width="0.9" stroke-dasharray="4 4"/></g>',
  '<g fill="' + INK + '"><path d="M-2 27 L8 17 L18 27 Z" opacity="0.09"/><path d="M6 27 L14 20 L22 27 Z" opacity="0.08"/></g>',
  '<path d="M14 27 L27 11 L40 27 Z" fill="' + INK + '" opacity="0.13"/><path d="M31.5 25 Q25 22.5 30.5 19 Q36 15.5 30.5 12.8" stroke="' + CREME + '" stroke-width="1.3" fill="none"/><line x1="27" y1="11" x2="27" y2="6.5" stroke="' + INK + '" stroke-width="1" opacity="0.7"/><path d="M27 6.5 L31.5 7.7 L27 8.9 Z" fill="' + ACC.course + '" opacity="0.9"/>',
  '<path d="M23 15.7 L27 11 L31 15.7 Z" fill="' + OR + '" opacity="0.75"/>',
  '<path d="M2 33 Q19 26.5 36 32" stroke="' + OR + '" stroke-width="3.4" fill="none" opacity="0.28"/>',
];
const roue = (x, extra) => '<circle cx="' + x + '" cy="96.5" r="4.5" fill="none" stroke="' + INK + '" stroke-width="1.5"/>' + (extra || "");
const cadre = (c, w) => '<g stroke="' + c + '" stroke-width="' + w + '" fill="none" stroke-linecap="round"><path d="M69 96.5 L75 89.7 L83 96.5"/><path d="M75 89.7 L73.5 87.5"/><path d="M81.5 90.5 L83 88.1"/></g>';
const D_VELO = [
  '<g stroke="' + INK + '" stroke-width="1.3" fill="none" opacity="0.85"><circle cx="70.5" cy="97.5" r="3.5"/><circle cx="82" cy="97.5" r="3.5"/><path d="M70.5 97.5 L75.5 92.5 L82 97.5"/><path d="M75.5 92.5 L74.5 90.8 L73 90.8"/><path d="M79.8 94 L81 91.2 L82.5 91.2"/></g>',
  roue(69) + roue(83) + '<g stroke="' + INK + '" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M69 96.5 L75 90 L83 96.5"/><path d="M75 90 L74 87.3 L72 87.3"/><path d="M81.5 90.8 L83 87.6 L85 87.6"/></g><rect x="64.5" y="90" width="5" height="3.4" rx="1" fill="none" stroke="' + INK + '" stroke-width="1.2"/>',
  roue(69) + roue(83) + cadre(ACC.velo, 1.7) + '<path d="M83 88.1 q2.2 0 2.2 2.2" stroke="' + INK + '" stroke-width="1.3" fill="none"/><path d="M72.2 87.4 L74.6 87.4" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"/>',
  roue(69, '<circle cx="69" cy="96.5" r="2.6" fill="none" stroke="' + INK + '" stroke-width="1.8" opacity="0.5"/>') + roue(83, '<circle cx="83" cy="96.5" r="2.6" fill="none" stroke="' + INK + '" stroke-width="1.8" opacity="0.5"/>') + cadre(ACC.velo, 2.2) + '<path d="M83 88.1 q2.2 0 2.2 2.2" stroke="' + INK + '" stroke-width="1.4" fill="none"/><path d="M72 87.2 L74.8 87.2" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>',
  '<circle cx="69" cy="96.5" r="4.5" fill="' + INK + '" opacity="0.85"/>' + roue(83, '<circle cx="83" cy="96.5" r="2.6" fill="none" stroke="' + INK + '" stroke-width="1.8" opacity="0.55"/>') + cadre(ACC.velo, 2.2) + '<g stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"><path d="M82.5 87.8 L88 87.8"/><path d="M82.5 89.2 L87 89.2"/></g>',
  '<circle cx="69" cy="96.5" r="4.5" fill="' + INK + '" opacity="0.85"/><circle cx="69" cy="96.5" r="2" fill="' + OR + '"/>' + roue(83, '<circle cx="83" cy="96.5" r="2.6" fill="none" stroke="' + OR + '" stroke-width="1.8"/>') + cadre(OR, 2.2) + '<g stroke="' + OR + '" stroke-width="1.6" stroke-linecap="round"><path d="M82.5 87.8 L88 87.8"/><path d="M82.5 89.2 L87 89.2"/></g>',
];
const D_EQUIP = [
  '<rect x="76" y="91.5" width="2.2" height="4" rx="1" fill="' + ACC.course + '" stroke="' + INK + '" stroke-width="0.8"/>',
  '<path d="M74.6 90.3 L79.4 90.3 L78.6 93.3 L75.4 93.3 Z" fill="' + INK + '" opacity="0.75"/>',
  '<rect x="81" y="84.6" width="5.4" height="3.6" rx="0.9" fill="' + INK + '"/><rect x="81.9" y="85.4" width="3.6" height="2" fill="#9fd8ea"/>',
  '<circle cx="76" cy="95" r="2.6" fill="' + INK + '"/><text x="76" y="96.3" font-size="3.4" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + OR + '">W</text>',
  '<circle cx="69" cy="96.5" r="3.1" fill="' + ACC.velo + '" opacity="0.45"/><circle cx="83" cy="96.5" r="3.1" fill="' + ACC.velo + '" opacity="0.45"/>',
  '<rect x="73.3" y="90.6" width="5.4" height="4" rx="0.8" fill="' + OR + '" stroke="' + INK + '" stroke-width="1"/><text x="76" y="93.8" font-size="3.2" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + INK + '">1</text>',
];
const D_AMB_V = [
  '<rect x="4" y="4" width="26" height="5.4" rx="1.4" fill="#fff" stroke="' + INK + '" stroke-width="1.1" opacity="0.9"/><text x="17" y="8" font-size="3.2" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + INK + '" opacity="0.85">DÉPART</text>',
  '<path d="M32 6 Q49 10.5 66 5" stroke="' + INK + '" stroke-width="0.9" fill="none" opacity="0.4"/>' + [36, 45, 54, 62].map((x, i) => '<path d="M' + x + " " + (6.6 + Math.round(2 * Math.sin(((x - 30) / 38) * Math.PI))) + " l3 0 l-1.5 3 Z\" fill=\"" + (i % 2 ? ACC.velo : OR) + '" opacity="0.85"/>').join(""),
  '<g fill="' + INK + '" opacity="0.28"><circle cx="88" cy="80" r="2.1"/><circle cx="94" cy="77.8" r="2.1"/></g>',
  '<path d="M86 84 L91 77 L96 84 Z" fill="' + ACC.velo + '" opacity="0.5" stroke="' + INK + '" stroke-width="0.9"/>',
  '<g stroke="' + INK + '" stroke-width="1" opacity="0.4"><line x1="64" y1="86" x2="84" y2="86"/><line x1="68" y1="86" x2="68" y2="90"/><line x1="80" y1="86" x2="80" y2="90"/></g><g fill="' + INK + '" opacity="0.28"><circle cx="70" cy="82.8" r="1.9"/><circle cx="77" cy="81.8" r="1.9"/></g>',
  '<line x1="88" y1="2" x2="88" y2="12" stroke="' + INK + '" stroke-width="1.1" opacity="0.8"/><path d="M88 2 L97 2 L94.5 5 L97 8 L88 8 Z" fill="' + RGE + '"/><text x="91.8" y="6.2" font-size="2.6" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="#fff">1km</text>',
];
const D_STADE = '<path d="M64 25 A15 10 0 0 1 94 25" stroke="#fff" stroke-width="7" fill="none" opacity="0.45"/>'
  + '<path d="M62.5 25 A16.5 11.5 0 0 1 95.5 25" stroke="' + INK + '" stroke-width="1.1" fill="none" opacity="0.35"/>'
  + '<g fill="' + INK + '" opacity="0.3"><circle cx="91" cy="22.4" r="1.15"/><circle cx="87.2" cy="19" r="1.15"/><circle cx="81.5" cy="17.2" r="1.15"/><circle cx="75" cy="17.8" r="1.15"/><circle cx="69.5" cy="20.4" r="1.15"/><circle cx="66" cy="23.4" r="1.15"/></g>'
  + '<path d="M76.8 13.4 L79 11.7 L81.2 13.4 Z" fill="' + ACC.course + '" opacity="0.85"/>';
const D_PARC_C = [
  '<circle cx="92" cy="87" r="5.5" fill="' + VERT + '" opacity="0.4"/><rect x="91.2" y="90.5" width="1.6" height="9.5" fill="' + INK + '" opacity="0.35"/>',
  '<g stroke="' + INK + '" opacity="0.3"><line x1="64" y1="101" x2="98" y2="101" stroke-width="1.8"/><line x1="68" y1="105" x2="98" y2="105" stroke-width="1.2" stroke-dasharray="6 5"/></g>',
  D_STADE,
  '<g fill="' + VERT + '"><path d="M60 27 L72 16 L84 27 Z" opacity="0.14"/><path d="M76 27 L89 12 L102 27 Z" opacity="0.18"/></g>',
  '<rect x="60" y="0" width="40" height="24" rx="5" fill="' + NUIT + '" opacity="0.14"/><polygon points="68,1 75,1 84,28" fill="' + OR + '" opacity="0.14"/><polygon points="94,2 89,0.5 78,26" fill="' + OR + '" opacity="0.14"/>',
  Array.from({ length: 8 }, (_, i) => '<rect x="' + (64 + i * 4.2) + '" y="98.7" width="4.2" height="2.2" fill="' + (i % 2 ? INK : "#fff") + '" opacity="0.7"/>').join("") + Array.from({ length: 8 }, (_, i) => '<rect x="' + (64 + i * 4.2) + '" y="100.9" width="4.2" height="2.2" fill="' + (i % 2 ? "#fff" : INK) + '" opacity="0.7"/>').join(""),
];
const D_AMB_C = [
  [24, 74].map((x) => '<path d="M' + x + " 101 L" + (x + 2.2) + " 94.5 L" + (x + 4.4) + ' 101 Z" fill="' + ACC.course + '" stroke="' + INK + '" stroke-width="0.9" opacity="0.9"/>').join(""),
  '<line x1="4" y1="92" x2="22" y2="92" stroke="' + RGE + '" stroke-width="1.3" stroke-dasharray="5 3" opacity="0.85"/><g stroke="' + INK + '" stroke-width="0.9" opacity="0.4"><line x1="7" y1="92" x2="7" y2="101"/><line x1="19" y1="92" x2="19" y2="101"/></g>',
  '<g fill="' + INK + '" opacity="0.26"><circle cx="6" cy="66" r="2"/><circle cx="13" cy="64" r="2"/><circle cx="10" cy="70" r="2"/></g>',
  '<path d="M2 62 L7 55 L12 62 Z" fill="' + ACC.course + '" opacity="0.5" stroke="' + INK + '" stroke-width="0.9"/>',
  '<g fill="' + INK + '" opacity="0.26"><circle cx="20" cy="60" r="1.9"/><circle cx="27" cy="58.5" r="1.9"/></g><path d="M18 48 L21.6 48 L20.7 52 L18.9 52 Z" fill="' + OR + '" stroke="' + INK + '" stroke-width="0.85" opacity="0.9"/>',
  '<path d="M32 24 L32 13 Q50 4.5 68 13 L68 24" fill="none" stroke="' + INK + '" stroke-width="2.2"/><rect x="38" y="8" width="24" height="5.6" rx="1.4" fill="' + ACC.course + '"/><text x="50" y="12.2" font-size="3.6" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="bold">ARRIVÉE</text>',
];

/**
 * LE COMPOSITE CARRÉ. `v = { natation, velo, course, mood, perf }` (niveaux 0..30 ;
 * `mood` = canal forme du jour de avatar.js, `normal` par défaut). `size` en px.
 */
export function avatarTriSVG(v, size) {
  const s = size || 120;
  const nat = Math.max(0, Math.min(30, v.natation | 0));
  const velo = Math.max(0, Math.min(30, v.velo | 0));
  const course = Math.max(0, Math.min(30, v.course | 0));
  const pose = POSTURES[v.mood] || POSTURES.normal;
  const gN = (p) => avatarTriGen(nat, p), gV = (p) => avatarTriGen(velo, p), gC = (p) => avatarTriGen(course, p);
  const lead = Math.max(nat, velo, course);
  const boucle = Math.ceil(lead / 5);
  const legende = nat >= 30 && velo >= 30 && course >= 30;
  const meneuse = meneuseDe(nat, velo, course);
  const acc = ACC[meneuse];

  // plan 1 : le fond (parcours vélo cumulatif à gauche, parcours course à droite)
  const fond = pileUp(D_PARC_V, gV(3)) + pick(D_PARC_C, gC(2));
  const sol = '<line x1="2" y1="101" x2="98" y2="101" stroke="' + INK + '" stroke-width="2" opacity="0.3"/>';
  // la lumière au sol (l'aura de l'audit design) — elle ancre, elle ne barre pas
  let lumiere = "";
  if (boucle >= 5) lumiere = '<ellipse cx="50" cy="100.6" rx="26" ry="4.6" fill="' + OR + '" opacity="0.14"/><ellipse cx="50" cy="100.6" rx="26" ry="4.6" fill="none" stroke="' + OR + '" stroke-width="2.6" opacity="0.75"/><ellipse cx="50" cy="100.6" rx="30" ry="5.6" fill="none" stroke="' + OR + '" stroke-width="1" opacity="0.35"/>';
  else if (boucle >= 3) lumiere = '<ellipse cx="50" cy="100.6" rx="25" ry="4.4" fill="' + acc + '" opacity="0.1"/><ellipse cx="50" cy="100.6" rx="25" ry="4.4" fill="none" stroke="' + acc + '" stroke-width="2.2" opacity="0.7"/>';
  else if (boucle >= 2) lumiere = '<ellipse cx="50" cy="100.6" rx="24" ry="4.2" fill="none" stroke="' + acc + '" stroke-width="1.7" stroke-dasharray="5 4" opacity="0.65"/>';
  const ombres = '<ellipse cx="50" cy="101.4" rx="13" ry="1.8" fill="' + INK + '" opacity="0.08"/>'
    + (gV(1) > 0 ? '<ellipse cx="76" cy="101.2" rx="11" ry="1.5" fill="' + INK + '" opacity="0.07"/>' : "");

  // plan 2 : les objets — chaque cumulatif dans SA zone fermée
  const planEau = pick(D_PLAN_EAU, gN(2));
  const materiel = gN(4) > 0 ? '<g transform="translate(1,58.6) scale(0.42)">' + pileUp(D_MATERIEL, gN(4)) + "</g>" : "";
  const ambN = pick(D_AMB_N, gN(5));
  const bike = pick(D_VELO, gV(1));
  const equip = gV(1) > 0 ? pick(D_EQUIP, gV(4)) : "";
  const archePresente = gC(5) >= 6;
  let ambV = pileUp(D_AMB_V, gV(5));
  if (archePresente) ambV = ambV.replace(D_AMB_V[0], ""); // une scène, un seul texte : DÉPART s'efface
  const ambC = pileUp(D_AMB_C, gC(5));

  // l'athlète (plan 3) — le maillot suit la génération VÉLO (décision n°3, l'accent choisi
  // reste celui des partagés) ; postures = canal forme du jour, inchangé
  const gMail = gV(2);
  const mailCol = gMail > 0 ? P_MAILLOT_COL[gMail - 1] : INK;
  let corps = '<g stroke="' + INK + '" stroke-width="5" stroke-linecap="round" fill="none">'
    + '<circle cx="50" cy="36" r="10" fill="' + CREME + '"/>'
    + '<g>' + torse(mailCol)
    + (gMail === 3 ? '<path d="M50 46 L50 60" stroke="' + INK + '" stroke-width="9" opacity="0.35"/>' : "")
    + (gMail === 5 ? '<path d="M50 55 L50 62" stroke="#fff" stroke-width="9"/><path d="M50 62 L50 69" stroke="' + RGE + '" stroke-width="9"/>' : "")
    + "</g>"
    + '<g>' + pose.arms + legsOf(pose) + "</g>"
    + "</g>";
  if (gMail >= 4) corps += manches(gMail === 5 ? BBR : mailCol, pose);
  const gLun = gN(3);
  const visage = gLun > 0
    ? '<path d="M47 40 L53 40" stroke="' + INK + '" stroke-width="1.3" stroke-linecap="round"/>' + pick(P_LUNETTES, gLun)
    : '<circle cx="46.5" cy="35" r="1.2" fill="' + INK + '"/><circle cx="53.5" cy="35" r="1.2" fill="' + INK + '"/><path d="M47 40 L53 40" stroke="' + INK + '" stroke-width="1.3" stroke-linecap="round"/>';
  const bonnet = pick(P_BONNET, gN(1));
  // les trois MARQUEURS (dès le niveau 1 chacun, or à 30)
  const mkNat = gN(1) > 0 ? '<text x="50" y="30.6" font-size="4.4" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + (gN(1) === 5 ? "#fff" : INK) + '">' + nat + "</text>" : "";
  const mkVelo = velo >= 1 ? '<rect x="45.4" y="49.5" width="9.2" height="6.4" rx="1.2" fill="' + (velo >= 30 ? OR : "#fff") + '" stroke="' + INK + '" stroke-width="1.1"/><text x="50" y="54.6" font-size="4.4" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + INK + '">' + velo + "</text>" : "";
  const bas = basSVG(gC(3), pose);
  const dyHanche = pose.hip[1] - 74;
  const ceinture = gC(4) > 0 ? ceintureSVG(gC(4), course >= 30 && gC(4) < 6 ? course : gC(4) === 6 ? 6 : course, dyHanche)
    : course >= 1 ? ceintureSVG(1, course, dyHanche) : "";
  const shoes = chaussuresSVG(gC(1), pose);
  const laurier = legende ? '<g stroke="#00734f" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M40 28 Q44 21 50 20"/><path d="M60 28 Q56 21 50 20"/><path d="M41 26 L38 24"/><path d="M43 23 L41 20"/><path d="M59 26 L62 24"/><path d="M57 23 L59 20"/></g>' : "";
  const podium = legende ? '<rect x="36" y="99" width="28" height="7.5" rx="2" fill="' + OR + '" stroke="' + INK + '" stroke-width="1.6"/><text x="50" y="105" font-size="5.4" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + INK + '">1</text>' : "";
  const rayons = legende ? '<g stroke="' + OR + '" stroke-width="1.8" opacity="0.5" stroke-linecap="round"><path d="M50 4 L50 0.5"/><path d="M32 7.5 L29.5 4"/><path d="M68 7.5 L70.5 4"/></g>' : "";

  // CANAL 3 (R17.2) — la forme physique, repris tel quel de avatar.js : un repère qui se
  // DÉPLACE, jamais rouge, absent sans référence mesurée. Le composite ne le perd pas.
  let perf = "";
  if (v.perf && Number.isFinite(v.perf.tier)) {
    const t = Math.max(1, Math.min(10, v.perf.tier));
    const x = 18 + ((t - 1) / 9) * 64;
    let grad = "";
    for (let i = 0; i < 10; i++) {
      const gx = 18 + (i / 9) * 64;
      grad += '<line x1="' + gx.toFixed(1) + '" y1="109.5" x2="' + gx.toFixed(1) + '" y2="' + (i === t - 1 ? 105 : 107.5) + '" stroke="' + INK + '" stroke-width="' + (i === t - 1 ? 1.6 : 0.8) + '" opacity="' + (i === t - 1 ? 0.9 : 0.3) + '"/>';
    }
    perf = '<g data-layer="perf" data-tier="' + t + '">' + grad
      + '<path d="M' + x.toFixed(1) + ' 103 l-2.6 -3.4 h5.2 z" fill="' + acc + '" stroke="' + INK + '" stroke-width="0.8"/></g>';
  }

  const label = "Avatar triathlète — natation " + nat + ", vélo " + velo + ", course " + course + (legende ? ", LÉGENDE" : "");
  return '<svg viewBox="0 0 100 110" width="' + s + '" height="' + Math.round(s * 1.1) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + label + '">'
    + fond + sol + lumiere + ombres
    + planEau + materiel + ambN + ambV + ambC + rayons
    + corps + visage + bonnet + mkNat + mkVelo + bas + shoes + ceinture
    + bike + equip
    + laurier + podium + perf
    + "</svg>";
}

/** Libellé de ce que débloque le niveau L (1..30) d'une discipline — dérivé du roulement,
 *  jamais une seconde table (R11.1) : position ((L−1) mod 5)+1, génération ⌈L/5⌉. */
export function avatarTriUnlock(disc, L) {
  if (L < 1 || L > 30) return null;
  const items = AVATAR_TRI_ROULEMENTS[disc];
  if (!items) return null;
  const it = items[(L - 1) % 5];
  return { item: it.id, libelle: it.gens[Math.floor((L - 1) / 5)] };
}

// ───────────────────────── LE TRIPTYQUE STORY (partage / plein écran) ─────────────────────────
// L'écran en trois bandes, une discipline par tiers — le personnage les TRAVERSE : la tête
// dans le monde de la natation, le torse dans celui du vélo, les jambes dans celui de la
// course. Le 2×3 : deux colonnes de décor par bande, la colonne centrale reste calme.

// Les cinq poses du canal forme du jour, à l'échelle du triptyque (épaule 62, hanche 106,
// jambes ~2× plus longues que le composite) — mêmes proportions, mêmes règles d'attache.
const STORY_POSTURES = {
  feu: { arms: '<path d="M50 62 L23 22"/><path d="M50 62 L77 22"/>', hip: [50, 106], L: { foot: [31, 148] }, R: { knee: [66, 137], foot: [71, 150] } },
  frais: { arms: '<path d="M50 62 L26 31"/><path d="M50 62 L74 31"/>', hip: [50, 106], L: { foot: [34, 148] }, R: { knee: [66, 140], foot: [69, 152] } },
  normal: { arms: '<path d="M50 62 L31 82"/><path d="M50 62 L69 82"/>', hip: [50, 106], L: { foot: [39, 150] }, R: { foot: [61, 150] } },
  fatigue: { arms: '<path d="M50 62 L31 87"/><path d="M50 62 L69 87"/>', hip: [50, 106], L: { foot: [42, 152] }, R: { foot: [58, 152] } },
  vide: { arms: '<path d="M50 65 L32 93"/><path d="M50 65 L68 93"/>', hip: [50, 109], L: { foot: [43, 153] }, R: { foot: [57, 153] } },
};
// Le bas du triptyque commence 3 sous la hanche (t≈0,07) : short t=0,273, cuissard t=0,5.
const storyBasSVG = (gen, pose) => {
  if (gen <= 0) return "";
  const cols = ["#b9ac8f", ACC.course, NUIT, NUIT, BBR, OR];
  const t = gen >= 3 ? 0.5 : 0.273;
  const seg = (leg, ta, tb, attr) => {
    const d = leg.knee || leg.foot;
    const a = lerp(pose.hip, d, ta), b = lerp(pose.hip, d, tb);
    return '<path d="M' + n1(a[0]) + " " + n1(a[1]) + " L" + n1(b[0]) + " " + n1(b[1]) + '"' + (attr || "") + "/>";
  };
  let s = '<g stroke="' + cols[gen - 1] + '" stroke-width="7.4" stroke-linecap="round">' + seg(pose.L, 0.068, t) + seg(pose.R, 0.068, t) + "</g>";
  if (gen === 4) s += '<g stroke="' + ACC.course + '" stroke-width="2.4" stroke-linecap="round">' + seg(pose.L, 0.386, 0.477) + seg(pose.R, 0.386, 0.477) + "</g>";
  if (gen === 5) s += '<g stroke-width="2.4" stroke-linecap="round">' + seg(pose.L, 0.386, 0.477, ' stroke="#fff"') + seg(pose.R, 0.386, 0.477, ' stroke="' + RGE + '"') + "</g>";
  return s;
};
const storyShoeSVG = (gen, pose) => {
  if (gen <= 0) return "";
  const scol = ["#b9ac8f", ACC.course, ACC.course, ACC.course, BBR, OR][gen - 1];
  const F = feetOf(pose);
  let s = '<g stroke="' + scol + '" stroke-width="6.2" stroke-linecap="round">' + F.map((f) => segAt(f, -1, 1.5, 4, 2.8)).join("") + "</g>";
  if (gen === 3) s += '<g stroke="#fff" stroke-width="2.6" stroke-linecap="round">' + F.map((f) => segAt(f, -1, 3.4, 3.6, 4.6)).join("") + "</g>";
  if (gen >= 4) s += '<g stroke="' + INK + '" stroke-width="1.9" stroke-linecap="round">' + F.map((f) => segAt(f, -1, 4, 4.4, 5.4)).join("") + "</g>";
  if (gen === 5) s += '<g stroke-width="1.9" stroke-linecap="round">' + F.map((f) => segAt(f, 0.4, -0.4, 3, 0.3, ' stroke="' + (f.s < 0 ? "#fff" : RGE) + '"')).join("") + "</g>";
  return s;
};

export function avatarTriStorySVG(v, size) {
  const sz = size || 300;
  const nat = Math.max(0, Math.min(30, v.natation | 0));
  const velo = Math.max(0, Math.min(30, v.velo | 0));
  const course = Math.max(0, Math.min(30, v.course | 0));
  const gN = (p) => avatarTriGen(nat, p), gV = (p) => avatarTriGen(velo, p), gC = (p) => avatarTriGen(course, p);
  const lead = Math.max(nat, velo, course);
  const boucle = Math.ceil(lead / 5);
  const legende = nat >= 30 && velo >= 30 && course >= 30;
  const acc = ACC[meneuseDe(nat, velo, course)];
  const pose = STORY_POSTURES[v.mood] || STORY_POSTURES.normal;

  let s = '<rect x="0" y="0" width="100" height="59" fill="' + ACC.natation + '" opacity="0.07"/>'
    + '<rect x="0" y="59" width="100" height="59" fill="' + ACC.velo + '" opacity="0.05"/>'
    + '<rect x="0" y="118" width="100" height="60" fill="' + ACC.course + '" opacity="0.06"/>'
    + '<line x1="0" y1="59" x2="100" y2="59" stroke="' + INK + '" stroke-width="0.7" opacity="0.15"/>'
    + '<line x1="0" y1="118" x2="100" y2="118" stroke="' + INK + '" stroke-width="0.7" opacity="0.15"/>';

  // ---- bande NATATION : la tête émerge de la ligne d'eau ----
  if (gN(2) >= 1) {
    const wOp = 0.12 + gN(2) * 0.02;
    s += '<path d="M0 48 Q8 45.5 16 48 T33 48 L33 59 L0 59 Z" fill="' + ACC.natation + '" opacity="' + wOp + '"/>'
      + '<path d="M67 48 Q75 45.5 83 48 T100 48 L100 59 L67 59 Z" fill="' + ACC.natation + '" opacity="' + wOp + '"/>'
      + '<g stroke="' + ACC.natation + '" fill="none" stroke-width="1.3" opacity="0.55" stroke-linecap="round"><path d="M4 52 Q8 49.8 12 52 T20 52"/><path d="M74 52 Q78 49.8 82 52 T90 52"/></g>';
  }
  if (gN(2) >= 2) s += '<circle cx="10" cy="47" r="2.2" fill="' + ACC.course + '" stroke="' + INK + '" stroke-width="1" opacity="0.95"/><circle cx="88" cy="47.5" r="2.2" fill="' + ACC.course + '" stroke="' + INK + '" stroke-width="1" opacity="0.95"/>';
  if (gN(2) >= 3) s += '<line x1="2" y1="55" x2="31" y2="55" stroke="' + ACC.natation + '" stroke-width="1.4" stroke-dasharray="2.6 2.2" opacity="0.6"/><line x1="69" y1="55" x2="98" y2="55" stroke="' + ACC.natation + '" stroke-width="1.4" stroke-dasharray="2.6 2.2" opacity="0.6"/>';
  if (gN(2) >= 4) s += '<path d="M14 43 L14 38.5 L17.4 42.4 Z" fill="#fff" stroke="' + INK + '" stroke-width="0.9" opacity="0.9"/><g stroke="' + INK + '" stroke-width="0.95" fill="none" opacity="0.75"><path d="M80 12 Q81.5 10.5 83 12"/><path d="M83 12 Q84.5 10.5 86 12"/></g>';
  if (gN(2) >= 5) s += [51.2, 54.8].map((y) => Array.from({ length: 8 }, (_, i) => '<circle cx="' + (3.5 + i * 3.6) + '" cy="' + y + '" r="0.75" fill="' + (i % 2 ? RGE : OR) + '" opacity="0.85"/>').join("") + Array.from({ length: 8 }, (_, i) => '<circle cx="' + (71.5 + i * 3.6) + '" cy="' + y + '" r="0.75" fill="' + (i % 2 ? RGE : OR) + '" opacity="0.85"/>').join("")).join("");
  if (gN(2) >= 6) s += '<line x1="2" y1="40" x2="32" y2="40" stroke="' + INK + '" stroke-width="0.8" opacity="0.5"/>' + [6, 15, 24].map((x) => '<path d="M' + x + " 40 L" + (x + 2.4) + " 40 L" + (x + 1.2) + ' 42.6 Z" fill="' + ACC.course + '" opacity="0.9"/>').join("")
    + [1, 2, 3].map((n, i) => '<rect x="' + (70 + i * 10) + '" y="41.5" width="4.6" height="3.2" rx="0.8" fill="#fff" stroke="' + INK + '" stroke-width="0.9"/><text x="' + (72.3 + i * 10) + '" y="44.1" font-size="2.5" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + INK + '">' + n + "</text>").join("");
  if (gN(4) >= 1) s += '<path d="M3 12 Q5 7.5 7 10.5 Q9 13.5 11 9.5" stroke="' + RGE + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
  if (gN(4) >= 2) s += '<rect x="13" y="7" width="7" height="5.6" rx="2.1" fill="#9fd8ea" stroke="' + INK + '" stroke-width="1.1" transform="rotate(-8 16.5 9.8)"/>';
  if (gN(4) >= 3) s += '<g transform="rotate(-10 25.5 10.4)"><ellipse cx="24" cy="10.4" rx="2.1" ry="2.8" fill="#f0e6cf" stroke="' + INK + '" stroke-width="1"/><ellipse cx="27.5" cy="10.4" rx="2.1" ry="2.8" fill="#f0e6cf" stroke="' + INK + '" stroke-width="1"/></g>';
  if (gN(4) >= 4) s += '<rect x="31" y="7.5" width="4" height="5.4" rx="1.3" fill="' + ACC.natation + '" stroke="' + INK + '" stroke-width="1"/>';
  if (gN(4) >= 5) s += '<path d="M4 22 L4 15.5 Q4 13.5 6 13.5" stroke="' + RGE + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
  if (gN(4) >= 6) s += '<circle cx="90" cy="9" r="5.2" fill="#fff" stroke="' + INK + '" stroke-width="1.4"/><line x1="90" y1="9" x2="90" y2="5.4" stroke="' + RGE + '" stroke-width="1.1"/><line x1="90" y1="9" x2="92.8" y2="10.4" stroke="' + INK + '" stroke-width="0.9"/>';
  if (gN(5) >= 1) s += '<g fill="' + ACC.natation + '" opacity="0.7"><circle cx="40" cy="12" r="1"/><circle cx="60" cy="10" r="0.8"/></g>';

  // ---- bande VÉLO ----
  const roadY = 114;
  if (gV(3) >= 1) s += '<line x1="2" y1="' + roadY + '" x2="98" y2="' + roadY + '" stroke="' + INK + '" stroke-width="1.4" stroke-dasharray="4 4" opacity="0.3"/>';
  if (gV(3) >= 2) s += '<line x1="2" y1="' + (roadY - 2) + '" x2="98" y2="' + (roadY - 2) + '" stroke="' + INK + '" stroke-width="1.7" opacity="0.32"/>';
  if (gV(3) >= 3) s += '<g fill="' + INK + '"><path d="M-2 112 L8 102 L18 112 Z" opacity="0.09"/><path d="M6 112 L14 105 L22 112 Z" opacity="0.08"/></g>';
  if (gV(3) >= 4) s += '<path d="M10 112 L23 96 L36 112 Z" fill="' + INK + '" opacity="0.13"/><path d="M27.5 110 Q21 107.5 26.5 104 Q32 100.5 26.5 97.8" stroke="' + CREME + '" stroke-width="1.2" fill="none"/><line x1="23" y1="96" x2="23" y2="91.5" stroke="' + INK + '" stroke-width="1" opacity="0.7"/><path d="M23 91.5 L27.5 92.7 L23 93.9 Z" fill="' + ACC.course + '" opacity="0.9"/>';
  if (gV(3) >= 5) s += '<path d="M19 100.7 L23 96 L27 100.7 Z" fill="' + OR + '" opacity="0.75"/>';
  if (gV(3) >= 6) s += '<path d="M64 117 Q81 111 98 116.5" stroke="' + OR + '" stroke-width="3" fill="none" opacity="0.28"/>';
  const STORY_BIKES = [
    '<g stroke="' + INK + '" stroke-width="1.3" fill="none" opacity="0.85"><circle cx="73.5" cy="110.5" r="3.5"/><circle cx="85" cy="110.5" r="3.5"/><path d="M73.5 110.5 L78.5 105.5 L85 110.5"/><path d="M78.5 105.5 L77.5 103.8 L76 103.8"/><path d="M82.8 107 L84 104.2 L85.5 104.2"/></g>',
    '<g stroke="' + INK + '" stroke-width="1.5" fill="none"><circle cx="72" cy="109.5" r="4.5"/><circle cx="86" cy="109.5" r="4.5"/><path d="M72 109.5 L78 103 L86 109.5" stroke-linecap="round"/><path d="M78 103 L77 100.3 L75 100.3" stroke-linecap="round"/><path d="M84.5 103.8 L86 100.6 L88 100.6" stroke-linecap="round"/></g><rect x="67.5" y="103" width="5" height="3.4" rx="1" fill="none" stroke="' + INK + '" stroke-width="1.1"/>',
    '<g stroke="' + INK + '" stroke-width="1.4" fill="none"><circle cx="72" cy="109.5" r="4.5"/><circle cx="86" cy="109.5" r="4.5"/></g><g stroke="' + ACC.velo + '" stroke-width="1.7" fill="none" stroke-linecap="round"><path d="M72 109.5 L78 102.7 L86 109.5"/><path d="M78 102.7 L76.5 100.5"/><path d="M84.5 103.5 L86 101.1"/></g><path d="M86 101.1 q2.2 0 2.2 2.2" stroke="' + INK + '" stroke-width="1.2" fill="none"/>',
    '<g stroke="' + INK + '" stroke-width="1.5" fill="none"><circle cx="72" cy="109.5" r="4.5"/><circle cx="86" cy="109.5" r="4.5"/></g><g stroke="' + INK + '" stroke-width="1.7" fill="none" opacity="0.5"><circle cx="72" cy="109.5" r="2.6"/><circle cx="86" cy="109.5" r="2.6"/></g><g stroke="' + ACC.velo + '" stroke-width="2.1" fill="none" stroke-linecap="round"><path d="M72 109.5 L78 102.7 L86 109.5"/><path d="M78 102.7 L76.5 100.5"/><path d="M84.5 103.5 L86 101.1"/></g><path d="M86 101.1 q2.2 0 2.2 2.2" stroke="' + INK + '" stroke-width="1.3" fill="none"/>',
    '<circle cx="72" cy="109.5" r="4.5" fill="' + INK + '" opacity="0.85"/><circle cx="86" cy="109.5" r="4.5" fill="none" stroke="' + INK + '" stroke-width="1.5"/><circle cx="86" cy="109.5" r="2.6" fill="none" stroke="' + INK + '" stroke-width="1.7" opacity="0.55"/><g stroke="' + ACC.velo + '" stroke-width="2.1" fill="none" stroke-linecap="round"><path d="M72 109.5 L78 102.7 L86 109.5"/><path d="M78 102.7 L76.5 100.5"/><path d="M84.5 103.5 L86 101.1"/></g><g stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"><path d="M85.5 100.8 L91 100.8"/><path d="M85.5 102.2 L90 102.2"/></g>',
    '<circle cx="72" cy="109.5" r="4.5" fill="' + INK + '" opacity="0.85"/><circle cx="72" cy="109.5" r="2" fill="' + OR + '"/><circle cx="86" cy="109.5" r="4.5" fill="none" stroke="' + INK + '" stroke-width="1.5"/><circle cx="86" cy="109.5" r="2.6" fill="none" stroke="' + OR + '" stroke-width="1.7"/><g stroke="' + OR + '" stroke-width="2.1" fill="none" stroke-linecap="round"><path d="M72 109.5 L78 102.7 L86 109.5"/><path d="M78 102.7 L76.5 100.5"/><path d="M84.5 103.5 L86 101.1"/></g><g stroke="' + OR + '" stroke-width="1.5" stroke-linecap="round"><path d="M85.5 100.8 L91 100.8"/><path d="M85.5 102.2 L90 102.2"/></g>',
  ];
  if (gV(1) >= 1) s += STORY_BIKES[gV(1) - 1];
  if (gV(1) >= 1 && gV(4) >= 3) s += '<rect x="84" y="97.4" width="5" height="3.3" rx="0.85" fill="' + INK + '"/><rect x="84.8" y="98.1" width="3.4" height="1.9" fill="#9fd8ea"/>';
  if (gV(1) >= 1 && gV(4) >= 4) s += '<circle cx="79" cy="108" r="2.3" fill="' + INK + '"/><text x="79" y="109.2" font-size="3" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + OR + '">W</text>';
  if (gV(1) >= 1 && gV(4) >= 6) s += '<rect x="75.6" y="103.6" width="4.8" height="3.6" rx="0.8" fill="' + OR + '" stroke="' + INK + '" stroke-width="0.9"/><text x="78" y="106.5" font-size="2.9" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + INK + '">1</text>';
  const archeStory = gC(5) >= 6;
  if (gV(5) >= 1 && !archeStory) s += '<rect x="4" y="63" width="24" height="5" rx="1.3" fill="#fff" stroke="' + INK + '" stroke-width="1" opacity="0.9"/><text x="16" y="66.7" font-size="3" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + INK + '" opacity="0.85">DÉPART</text>';
  if (gV(5) >= 2) s += '<path d="M30 65 Q50 69 70 64" stroke="' + INK + '" stroke-width="0.85" fill="none" opacity="0.4"/>' + [34, 44, 54, 63].map((x, i) => '<path d="M' + x + " " + (65.5 + Math.round(1.8 * Math.sin(((x - 30) / 42) * Math.PI))) + " l2.8 0 l-1.4 2.8 Z\" fill=\"" + (i % 2 ? ACC.velo : OR) + '" opacity="0.85"/>').join("");
  if (gV(5) >= 3) s += '<g fill="' + INK + '" opacity="0.26"><circle cx="7" cy="109" r="1.9"/><circle cx="13" cy="107.2" r="1.9"/></g>';
  if (gV(5) >= 5) s += '<g stroke="' + INK + '" stroke-width="0.9" opacity="0.4"><line x1="3" y1="104" x2="19" y2="104"/><line x1="6" y1="104" x2="6" y2="108"/><line x1="16" y1="104" x2="16" y2="108"/></g>';
  if (gV(5) >= 6) s += '<line x1="93" y1="62" x2="93" y2="71" stroke="' + INK + '" stroke-width="1" opacity="0.8"/><path d="M93 62 L100 62 L98 64.6 L100 67.2 L93 67.2 Z" fill="' + RGE + '"/>';

  // ---- bande COURSE ----
  const solY = 156;
  s += '<line x1="2" y1="' + solY + '" x2="98" y2="' + solY + '" stroke="' + INK + '" stroke-width="1.8" opacity="0.3"/>';
  if (gC(2) >= 1) s += '<circle cx="91" cy="146" r="5" fill="' + VERT + '" opacity="0.4"/><rect x="90.2" y="149" width="1.6" height="7" fill="' + INK + '" opacity="0.35"/>';
  if (gC(2) >= 2) s += '<line x1="60" y1="161" x2="98" y2="161" stroke="' + INK + '" stroke-width="1.2" stroke-dasharray="6 5" opacity="0.3"/>';
  if (gC(2) >= 3) s += '<path d="M8 136 A11 8 0 0 1 30 136" stroke="#fff" stroke-width="5.5" fill="none" opacity="0.45"/><path d="M7 136 A12 9 0 0 1 31 136" stroke="' + INK + '" stroke-width="0.95" fill="none" opacity="0.35"/>'
    + '<g fill="' + INK + '" opacity="0.3"><circle cx="27" cy="133.8" r="0.95"/><circle cx="24" cy="131.2" r="0.95"/><circle cx="19" cy="130.2" r="0.95"/><circle cx="14" cy="131.4" r="0.95"/><circle cx="11" cy="133.9" r="0.95"/></g>';
  if (gC(2) >= 4) s += '<g fill="' + VERT + '"><path d="M64 156 L73 148 L82 156 Z" opacity="0.13"/><path d="M76 156 L86 145 L96 156 Z" opacity="0.16"/></g>';
  if (gC(2) >= 5) s += '<rect x="2" y="120" width="30" height="14" rx="4" fill="' + NUIT + '" opacity="0.13"/><polygon points="7,121 12,121 18,140" fill="' + OR + '" opacity="0.13"/>';
  if (gC(2) >= 6) s += Array.from({ length: 8 }, (_, i) => '<rect x="' + (62 + i * 4.4) + '" y="153.8" width="4.4" height="2.1" fill="' + (i % 2 ? INK : "#fff") + '" opacity="0.7"/>').join("") + Array.from({ length: 8 }, (_, i) => '<rect x="' + (62 + i * 4.4) + '" y="155.9" width="4.4" height="2.1" fill="' + (i % 2 ? "#fff" : INK) + '" opacity="0.7"/>').join("");
  if (gC(5) >= 1) s += '<path d="M14 156 L16 150.5 L18 156 Z" fill="' + ACC.course + '" stroke="' + INK + '" stroke-width="0.85" opacity="0.9"/>';
  if (gC(5) >= 2) s += '<line x1="3" y1="149" x2="20" y2="149" stroke="' + RGE + '" stroke-width="1.2" stroke-dasharray="4.5 3" opacity="0.8"/>';
  if (gC(5) >= 3) s += '<g fill="' + INK + '" opacity="0.26"><circle cx="6" cy="142" r="1.9"/><circle cx="12" cy="140.4" r="1.9"/></g>';
  if (gC(5) >= 4) s += '<path d="M22 148 L26 142.5 L30 148 Z" fill="' + ACC.course + '" opacity="0.45" stroke="' + INK + '" stroke-width="0.85"/>';
  if (gC(5) >= 5) s += '<path d="M4 132 L7.2 132 L6.4 135.6 L4.8 135.6 Z" fill="' + OR + '" stroke="' + INK + '" stroke-width="0.8" opacity="0.9"/>';
  if (gC(5) >= 6) s += '<path d="M64 140 L64 130 Q79 122.5 94 130 L94 140" fill="none" stroke="' + INK + '" stroke-width="2"/><rect x="69" y="126" width="20" height="5" rx="1.3" fill="' + ACC.course + '"/><text x="79" y="129.8" font-size="3.2" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="bold">ARRIVÉE</text>';

  // ---- lumière au sol + ombres ----
  if (boucle >= 5) s += '<ellipse cx="50" cy="155.6" rx="24" ry="4" fill="' + OR + '" opacity="0.13"/><ellipse cx="50" cy="155.6" rx="24" ry="4" fill="none" stroke="' + OR + '" stroke-width="2.2" opacity="0.7"/>';
  else if (boucle >= 3) s += '<ellipse cx="50" cy="155.6" rx="23" ry="3.8" fill="' + acc + '" opacity="0.09"/><ellipse cx="50" cy="155.6" rx="23" ry="3.8" fill="none" stroke="' + acc + '" stroke-width="1.9" opacity="0.65"/>';
  else if (boucle >= 2) s += '<ellipse cx="50" cy="155.6" rx="22" ry="3.6" fill="none" stroke="' + acc + '" stroke-width="1.5" stroke-dasharray="4.5 3.6" opacity="0.6"/>';
  s += '<ellipse cx="50" cy="156.3" rx="13" ry="1.7" fill="' + INK + '" opacity="0.08"/>'
    + (gV(1) > 0 ? '<ellipse cx="79" cy="114.4" rx="10" ry="1.3" fill="' + INK + '" opacity="0.07"/>' : "");

  // ---- le personnage, à travers les trois bandes ----
  const gBonnet = gN(1), gLun = gN(3), gMail = gV(2), gShoe = gC(1), gBas = gC(3), gCeint = gC(4);
  const mailCols = ["#e8dfc8", ACC.velo, ACC.velo, ACC.velo, BBR, OR];
  const mailCol = gMail > 0 ? mailCols[gMail - 1] : INK;
  s += '<g stroke="' + INK + '" stroke-width="6" stroke-linecap="round" fill="none">'
    + '<circle cx="50" cy="34" r="13" fill="' + CREME + '"/>'
    + '<path d="M50 48 L50 106" stroke="' + mailCol + '" stroke-width="11"/>'
    + (gMail === 3 ? '<path d="M50 48 L50 66" stroke="' + INK + '" stroke-width="11" opacity="0.35"/>' : "")
    + (gMail === 5 ? '<path d="M50 60 L50 70" stroke="#fff" stroke-width="11"/><path d="M50 70 L50 80" stroke="' + RGE + '" stroke-width="11"/>' : "")
    + pose.arms
    + legsOf(pose)
    + "</g>";
  if (gMail >= 4) s += '<g stroke="' + (gMail === 5 ? BBR : mailCol) + '" stroke-width="6" stroke-linecap="round">' + pose.arms + "</g>";
  s += gLun > 0 ? '<path d="M46 42 L54 42" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>'
    : '<circle cx="45.5" cy="32.5" r="1.5" fill="' + INK + '"/><circle cx="54.5" cy="32.5" r="1.5" fill="' + INK + '"/><path d="M46 42 L54 42" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>';
  if (gLun > 0) {
    const lf = [CREME, "#9fd8ea", NUIT, "#9fd8ea", NUIT, "#ffe9b0"][gLun - 1];
    const ls = gLun === 6 ? OR : INK;
    s += '<circle cx="45" cy="32" r="3.9" fill="' + lf + '" stroke="' + ls + '" stroke-width="1.6"/><circle cx="55" cy="32" r="3.9" fill="' + lf + '" stroke="' + ls + '" stroke-width="1.6"/><path d="M48.8 32 L51.2 32" stroke="' + ls + '" stroke-width="1.6"/>'
      + (gLun === 4 ? '<path d="M43 30 L46.2 32.6 M53 30 L56.2 32.6" stroke="#fff" stroke-width="1.1"/>' : "");
  }
  if (gBonnet > 0) {
    const bf = ["#e8dfc8", ACC.natation, ACC.natation, ACC.natation, BBR, OR][gBonnet - 1];
    s += '<path d="M37 30 A13 13 0 0 1 63 30 Z" fill="' + bf + '" stroke="' + INK + '" stroke-width="1.8"/>';
    if (gBonnet === 3) s += '<path d="M41 23 Q50 18.5 59 23" stroke="#fff" stroke-width="1.7" fill="none" opacity="0.85"/>';
    if (gBonnet === 4) s += '<path d="M40 24 Q50 19.5 60 24" stroke="#fff" stroke-width="2.1" fill="none"/>';
    if (gBonnet === 5) s += '<path d="M40 23 Q50 18.5 60 23" stroke="#fff" stroke-width="2.2" fill="none"/><path d="M38.8 25.5 Q50 21 61.2 25.5" stroke="' + RGE + '" stroke-width="2.2" fill="none"/>';
    if (gBonnet === 6) s += '<path d="M41 22.5 Q50 17.5 59 22.5" stroke="#fff" stroke-width="1.4" fill="none" opacity="0.7"/>';
    s += '<text x="50" y="29.6" font-size="5.6" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + (gBonnet === 5 ? "#fff" : INK) + '">' + nat + "</text>";
  }
  if (velo >= 1) {
    s += '<rect x="44.6" y="52.8" width="10.8" height="7.6" rx="1.4" fill="' + (velo >= 30 ? OR : "#fff") + '" stroke="' + INK + '" stroke-width="1.25"/>'
      + '<circle cx="46.2" cy="54.1" r="0.55" fill="' + INK + '"/><circle cx="53.8" cy="54.1" r="0.55" fill="' + INK + '"/>'
      + '<text x="50" y="59.2" font-size="5" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + INK + '">' + velo + "</text>";
  }
  s += storyBasSVG(gBas, pose);
  const dyH = pose.hip[1] - 106; // la ceinture est à la hanche : elle suit la pose
  if (gCeint > 0) {
    const cc = gCeint >= 5 ? OR : ACC.course;
    s += '<path d="M44.6 ' + n1(100 + dyH) + " L55.4 " + n1(100 + dyH) + '" stroke="' + cc + '" stroke-width="3.2" stroke-linecap="round"/>'
      + '<rect x="45.4" y="' + n1(101.5 + dyH) + '" width="9.2" height="7" rx="1.3" fill="' + (course >= 30 ? OR : "#fff") + '" stroke="' + INK + '" stroke-width="1.25"/>'
      + '<text x="50" y="' + n1(106.8 + dyH) + '" font-size="4.8" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + INK + '">' + course + "</text>";
    if (gCeint === 4) s += '<rect x="41.2" y="' + n1(98.6 + dyH) + '" width="3" height="6.4" rx="1.4" fill="' + ACC.natation + '" stroke="' + INK + '" stroke-width="0.95"/><rect x="55.8" y="' + n1(98.6 + dyH) + '" width="3" height="6.4" rx="1.4" fill="' + ACC.natation + '" stroke="' + INK + '" stroke-width="0.95"/>';
  } else if (course >= 1) {
    s += '<rect x="45.4" y="' + n1(99.5 + dyH) + '" width="9.2" height="7" rx="1.3" fill="#fff" stroke="' + INK + '" stroke-width="1.25"/>'
      + '<circle cx="46.8" cy="' + n1(100.7 + dyH) + '" r="0.5" fill="' + INK + '"/><circle cx="53.2" cy="' + n1(100.7 + dyH) + '" r="0.5" fill="' + INK + '"/>'
      + '<text x="50" y="' + n1(104.8 + dyH) + '" font-size="4.8" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + INK + '">' + course + "</text>";
  }
  s += storyShoeSVG(gShoe, pose);
  if (legende) s += '<g stroke="#00734f" stroke-width="2.6" fill="none" stroke-linecap="round"><path d="M37 22 Q42 13.5 50 12.5"/><path d="M63 22 Q58 13.5 50 12.5"/><path d="M38.4 19.5 L34.8 17"/><path d="M41 15.6 L38.6 11.8"/><path d="M61.6 19.5 L65.2 17"/><path d="M59 15.6 L61.4 11.8"/></g>'
    + '<rect x="36" y="155" width="28" height="7" rx="2" fill="' + OR + '" stroke="' + INK + '" stroke-width="1.6"/><text x="50" y="160.4" font-size="5" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' + INK + '">1</text>'
    + '<g stroke="' + OR + '" stroke-width="1.8" opacity="0.5" stroke-linecap="round"><path d="M50 3.6 L50 0.6"/><path d="M32 6.5 L29.8 3.4"/><path d="M68 6.5 L70.2 3.4"/></g>';

  const label = "Avatar triathlète (story) — natation " + nat + ", vélo " + velo + ", course " + course + (legende ? ", LÉGENDE" : "");
  return '<svg viewBox="0 0 100 178" width="' + sz + '" height="' + Math.round(sz * 1.78) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + label + '">' + s + "</svg>";
}
