// R11.1 — un point unique pour les petites cartes icône/couleur/libellé que l'UI recopiait
// ailleurs. Audit du 07/08/2026 : la carte discipline (sw/bk/rn/br/rs → 🏊/🚴/🏃/🔁/😌) vivait
// en SIX copies indépendantes (plan-view.js, tab-week.js, session-life.js, tab-plan-general.js,
// tab-profile.js ×2), pas toutes identiques (`rs` valait 💪 ici et 😌 là, `br` manquait dans
// certaines) ; la carte verdict (verte/orange/rouge → 🟢/🟠/🔴) en trois (readiness.js,
// tab-today.js, session-life.js), celles-là identiques mais sans rien qui le garantisse. Rien
// n'est cassé aujourd'hui, mais rien ne garantit qu'un septième site les mette à jour ensemble
// — le mode de dérive silencieuse que ce principe existe pour interdire ailleurs dans le dépôt.

// Codes que le moteur émet (sw/bk/rn/br/rs), vérifiés exhaustivement par `demo:avatartri`.
// Accents repris de SPORTS[*].accent (config.js) là où un sport correspond en direct
// (rn/bk/sw) — un athlète qui a vu son avatar en vélo bleu retrouve le même bleu ici, pas une
// troisième palette ; br/rs n'ont pas d'équivalent sport et gardent leur propre couleur.
// `rs` (repos) vaut 😌 — le glyphe le plus récent et le plus juste sémantiquement pour un jour
// de repos, retenu comme référence plutôt que 💪 (qui vivait dans les copies plus anciennes).
export const DISC = {
  sw: { ic: "🏊", ac: "#00b8d9", label: "Natation" },
  bk: { ic: "🚴", ac: "#2e6bff", label: "Vélo" },
  rn: { ic: "🏃", ac: "#ff7a1a", label: "Course" },
  br: { ic: "🔁", ac: "#9b72ff", label: "Brick" },
  rs: { ic: "😌", ac: "#00a376", label: "Repos" },
};

// Verdict readiness (verte/orange/rouge, `src/readiness/`) → pastille.
export const VERDICT_ICON = { verte: "🟢", orange: "🟠", rouge: "🔴" };
