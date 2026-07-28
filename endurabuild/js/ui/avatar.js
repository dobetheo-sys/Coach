// R4-2 — Avatar SVG évolutif et personnalisable. RÈGLE D'HONNÊTETÉ (brief) : chaque
// variable visuelle est TRAÇABLE à une donnée réelle du plan/journal — jamais un état
// cosmétique arbitraire :
//   · couleur du maillot  → thème choisi (base = accents par sport de config.js) ;
//   · posture/dynamisme   → séances réellement faites sur les 7 derniers jours (✓ + FIT) ;
//   · aura                → streak de semaines régulières (progressV2) ;
//   · accessoires         → badges réellement gagnés (badgesV2 : bandeau/médaille/étoile) ;
//   · gabarit (niveau)    → paliers d'EBV2.avatar (XP dérivé régularité/charge, jamais un chrono).
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
  const out = { accent: avatarTheme(), streak: 0, dyn: 0, accessories: [], level: 1, icon: "", name: "" };
  if (!globalThis.EBV2) return out;
  try {
    const pg = globalThis.EBV2.progress(plan, S.answers, todayISO);
    out.streak = pg.streakWeeks || 0;
    const badges = globalThis.EBV2.badges(plan, S.answers, todayISO);
    if (badges.some((b) => b.id === "premiere")) out.accessories.push("bandeau");
    if (badges.some((b) => b.id === "record")) out.accessories.push("medaille");
    if (badges.some((b) => b.id === "bloc-base")) out.accessories.push("etoile");
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

/** Silhouette SVG. `size` en px. Postures : 0 = debout (repos), 1 = en marche, 2 = bras en V. */
export function avatarSVG(v, size) {
  const s = size || 120;
  const acc = v.accent || "#ff7a1a";
  const aura = v.streak >= 6 ? "#ff7a1a" : v.streak >= 3 ? "#f0b429" : v.streak >= 1 ? "#00a376" : null;
  // bras selon dynamisme (coordonnées épaule ~ (50,52))
  const arms = v.dyn === 2
    ? '<path d="M50 54 L30 30" /><path d="M50 54 L70 30" />'
    : v.dyn === 1
      ? '<path d="M50 54 L32 62" /><path d="M50 54 L68 40" />'
      : '<path d="M50 54 L36 70" /><path d="M50 54 L64 70" />';
  // jambes : marche si dyn>=1
  const legs = v.dyn >= 1
    ? '<path d="M50 74 L38 96" /><path d="M50 74 L62 92 L64 98" />'
    : '<path d="M50 74 L44 98" /><path d="M50 74 L56 98" />';
  const bandeau = v.accessories.includes("bandeau") ? '<rect x="41" y="30" width="18" height="4" rx="2" fill="' + acc + '"/>' : "";
  const medaille = v.accessories.includes("medaille") ? '<circle cx="50" cy="60" r="4" fill="#f0b429" stroke="#16130e" stroke-width="1"/>' : "";
  const etoile = v.accessories.includes("etoile") ? '<text x="72" y="26" font-size="12">⭐</text>' : "";
  const auraEl = aura ? '<circle cx="50" cy="58" r="44" fill="none" stroke="' + aura + '" stroke-width="3" stroke-dasharray="6 5" opacity="0.8"/>' : "";
  return '<svg viewBox="0 0 100 110" width="' + s + '" height="' + Math.round(s * 1.1) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar niveau ' + v.level + '">'
    + auraEl
    + '<g stroke="#16130e" stroke-width="5" stroke-linecap="round" fill="none">'
    + '<circle cx="50" cy="36" r="10" fill="#f6efe0"/>'
    + '<path d="M50 46 L50 74" stroke="' + acc + '" stroke-width="9"/>'
    + arms + legs
    + "</g>" + bandeau + medaille + etoile
    + "</svg>";
}
