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
// troisième palette ; br n'a pas d'équivalent sport et garde sa propre couleur.
// `rs` (repos) vaut 😌 — le glyphe le plus récent et le plus juste sémantiquement pour un jour
// de repos, retenu comme référence plutôt que 💪 (qui vivait dans les copies plus anciennes).
// R25.2 — `rs` est aligné sur le token Zenna `--rest` (#3A3F46, styles.css) : l'ancien vert
// disait « positif », pas « repos ». Les trois disciplines sw/bk/rn gardent les valeurs
// partagées avec l'avatar composite (validé sur maquettes par le fondateur, R25) — les
// aligner sur --swim/--bike/--run toucherait un système validé séparément : arbitrage nommé
// dans le rapport R25.2, pas tranché en marge d'une passe de résidus.
export const DISC = {
  sw: { ic: "🏊", ac: "#00b8d9", label: "Natation" },
  bk: { ic: "🚴", ac: "#2e6bff", label: "Vélo" },
  rn: { ic: "🏃", ac: "#ff7a1a", label: "Course" },
  br: { ic: "🔁", ac: "#9b72ff", label: "Brick" },
  rs: { ic: "😌", ac: "#3A3F46", label: "Repos" },
};

// Verdict readiness (verte/orange/rouge, `src/readiness/`) → pastille.
export const VERDICT_ICON = { verte: "🟢", orange: "🟠", rouge: "🔴" };

// R25.2 — icônes SVG trait de la barre d'onglets (maquette Zenna), remplaçant les emojis.
// Point unique (R11.1) : clés alignées sur les identifiants de `TABS` (tabs.js), tracé
// copié de la maquette. `currentColor` — la couleur suit `.tabbtn`/`.tabbtn.active` en CSS,
// jamais une couleur figée ici.
export const NAV_ICONS = {
  profile: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="10" cy="6.5" r="3.2"/><path d="M4 17a6 6 0 0 1 12 0"/></svg>',
  general: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><line x1="3" y1="8" x2="17" y2="8"/><line x1="7" y1="2" x2="7" y2="5.5"/><line x1="13" y1="2" x2="13" y2="5.5"/></svg>',
  today: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="10" cy="10" r="7.2"/><circle cx="10" cy="10" r="3.6"/><circle cx="10" cy="10" r="1" fill="currentColor" stroke="none"/></svg>',
  week: '<svg viewBox="0 0 20 20" fill="currentColor"><rect x="3" y="11" width="3" height="7" rx="1"/><rect x="8.5" y="7" width="3" height="11" rx="1"/><rect x="14" y="3" width="3" height="15" rx="1"/></svg>',
  outils: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5"/></svg>',
};
