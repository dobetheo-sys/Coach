// R9 — Avatar SVG évolutif à 16 NIVEAUX (choix utilisateur : mix « l'athlète s'équipe »
// + « le décor évolue »). Chaque niveau débloque UN paramètre visuel, cumulatif — au
// niveau 12 on VOIT ses 11 acquis. RÈGLE D'HONNÊTETÉ inchangée : tout est traçable à une
// donnée réelle :
//   · niveau (équipement + décor) → XP d'EBV2.avatar : 100% régularité (jours validés,
//     badges, semaines régulières — jamais un chrono, jamais décroissant) ;
//   · posture/dynamisme           → séances réellement faites sur les 7 derniers jours ;
//   · couleur de l'aura           → streak de semaines régulières ;
//   · couleur du maillot          → thème choisi (accents par sport de config.js).
// SVG inline léger (PWA offline, zéro image externe), dessinable sur canvas pour le partage.
import { S } from "../state.js";
import { SPORTS } from "../config.js";

export const AVATAR_THEMES = [
  ["tri", "#ff3b30"], ["run", "#ff7a1a"], ["bike", "#2e6bff"], ["swim", "#00b8d9"],
];

export function avatarTheme() {
  const t = S.answers.avatarTheme;
  const found = AVATAR_THEMES.find(([k]) => k === t);
  if (found) return found[1];
  return (SPORTS[S.sport] && SPORTS[S.sport].accent) || "#ff7a1a";
}

/** Variables visuelles depuis les données réelles — la traçabilité est le contrat. */
export function avatarDataFor(plan, todayISO) {
  const out = { accent: avatarTheme(), streak: 0, dyn: 0, level: 1, icon: "", name: "" };
  if (!globalThis.EBV2) return out;
  try {
    const pg = globalThis.EBV2.progress(plan, S.answers, todayISO);
    out.streak = pg.streakWeeks || 0;
    const av = globalThis.EBV2.avatar(plan, S.answers, todayISO);
    out.level = av.level; out.icon = av.icon; out.name = av.name;
    // Dynamisme : minutes réellement faites sur 7 jours (✓ datés du plan + FIT importés)
    const t0 = new Date(todayISO + "T00:00:00Z").getTime() - 7 * 864e5;
    let min7 = 0, n7 = 0;
    const done = S.answers.done || {};
    plan.weeks.forEach((w) => w.days.forEach((d) => {
      if (!d.date) return;
      const t = new Date(d.date + "T00:00:00Z").getTime();
      if (t < t0 || d.date > todayISO) return;
      d.sessions.forEach((s, si) => { if (s.d !== "rs" && done[w.num + "|" + d.jour + "|" + si]) { min7 += s.min || 0; n7++; } });
    }));
    (Array.isArray(S.answers.fitSessions) ? S.answers.fitSessions : []).forEach((c) => {
      const t = new Date((c.date || "") + "T00:00:00Z").getTime();
      if (isFinite(t) && t >= t0 && c.date <= todayISO) { min7 += c.minutes || 0; n7++; }
    });
    out.dyn = n7 >= 3 || min7 >= 180 ? 2 : n7 >= 1 ? 1 : 0;
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

  // ---- SILHOUETTE + ÉQUIPEMENT ----
  const arms = v.dyn === 2
    ? '<path d="M50 54 L30 30" /><path d="M50 54 L70 30" />'
    : v.dyn === 1
      ? '<path d="M50 54 L32 62" /><path d="M50 54 L68 40" />'
      : '<path d="M50 54 L36 70" /><path d="M50 54 L64 70" />';
  const legs = v.dyn >= 1
    ? '<path d="M50 74 L38 96" /><path d="M50 74 L62 92 L64 98" />'
    : '<path d="M50 74 L44 98" /><path d="M50 74 L56 98" />';
  // chaussures (L2+) : embouts à ta couleur au bout des jambes
  const shoes = L >= 2 ? (v.dyn >= 1
    ? '<g stroke="' + acc + '" stroke-width="5" stroke-linecap="round"><path d="M38 96 L34 98"/><path d="M64 98 L68 98"/></g>'
    : '<g stroke="' + acc + '" stroke-width="5" stroke-linecap="round"><path d="M44 98 L40 99"/><path d="M56 98 L60 99"/></g>') : "";
  // torse : simple → maillot bicolore (L9+)
  const torso = L >= 9
    ? '<path d="M50 46 L50 74" stroke="' + acc + '" stroke-width="9"/><path d="M50 46 L50 60" stroke="#16130e" stroke-width="9" opacity="0.35"/>'
    : '<path d="M50 46 L50 74" stroke="' + acc + '" stroke-width="9"/>';
  const bandana = L >= 4 ? '<rect x="41" y="29" width="18" height="4" rx="2" fill="' + acc + '"/><path d="M59 31 L66 27" stroke="' + acc + '" stroke-width="3" stroke-linecap="round"/>' : "";
  const glasses = L >= 7 ? '<g fill="#16130e"><rect x="42" y="34" width="7" height="4" rx="2"/><rect x="51" y="34" width="7" height="4" rx="2"/></g>' : "";
  const bib = L >= 10 ? '<rect x="44" y="58" width="12" height="9" rx="1.5" fill="#fff" stroke="#16130e" stroke-width="1.2"/><text x="50" y="65" font-size="6.5" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="#16130e">' + L + "</text>" : "";
  const medal = L >= 14 ? '<path d="M46 48 L50 55 L54 48" stroke="#e63946" stroke-width="1.5" fill="none"/><circle cx="50" cy="56" r="4" fill="#f0b429" stroke="#16130e" stroke-width="1"/>' : "";
  const stars = L >= 13 ? '<text x="70" y="24" font-size="11">⭐</text><text x="20" y="34" font-size="8">⭐</text><text x="80" y="46" font-size="7">⭐</text>' : "";
  const laurel = L >= 16 ? '<g stroke="#00734f" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M40 28 Q44 21 50 20"/><path d="M60 28 Q56 21 50 20"/><path d="M41 26 L38 24"/><path d="M43 23 L41 20"/><path d="M59 26 L62 24"/><path d="M57 23 L59 20"/></g>' : "";

  return '<svg viewBox="0 0 100 110" width="' + s + '" height="' + Math.round(s * 1.1) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar niveau ' + L + '">'
    + decor + aura + speed
    + '<g stroke="#16130e" stroke-width="5" stroke-linecap="round" fill="none">'
    + '<circle cx="50" cy="36" r="10" fill="#f6efe0"/>'
    + torso + arms + legs
    + "</g>" + shoes + bandana + glasses + bib + medal + stars + laurel
    + "</svg>";
}
