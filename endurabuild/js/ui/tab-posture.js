// Sous-onglet 🧰 Outils › 🚴 Position — écran 2a du handoff `design_handoff_bilan_posture_zenna`.
//
// CE QUE CE FICHIER EST, ET CE QU'IL N'EST PAS. Le paquet reçu est une RÉFÉRENCE DE DESIGN
// (18 cadres HTML à styles inline), et son README le dit lui-même : « pas du code de
// production à copier ». Il suppose en revanche que Zenna tourne en « React + Tailwind » —
// une prémisse déduite du `src/index.css` du dépôt Bikefiting, et FAUSSE ici : la PWA sert
// 45 modules ES sans étape de construction. Les écrans sont donc RECRÉÉS dans les conventions
// du dépôt, pas transposés. Les écarts de palette et de typographie sont mesurés et écrits en
// tête de `css/zenna-posture.css`.
//
// PÉRIMÈTRE DE CE LOT : le socle (point d'entrée, état, feuille de style) et le seul écran
// 2a, dans ses TROIS états. Les 17 autres écrans du handoff ne sont pas ici — et surtout, ce
// module ne CALCULE rien : il affiche ce que la session porte. Le moteur de scoring est déjà
// dans le dépôt (`src/bikefit/`, 56 tests verts) mais il n'entre pas dans le bundle servi, et
// l'y faire entrer est une décision de bundling qui n'appartient pas à un écran de liste.
//
// L'ÉTAT SUIT LA PERSONNE, PAS LE PLAN. `posture` rejoint `SHARED_KEYS` pour la même raison
// qu'`educatifs` : un bilan de position décrit l'athlète et son vélo, et il survit à un
// changement de plan. Le handoff propose quatre clés `localStorage` distinctes ; ici l'état
// vit dans `eb_state_v2` comme tout le reste — une seconde persistance serait un second
// endroit à migrer, à sauvegarder et à restaurer.
//
// `pendingTrial` N'EST PAS PERSISTÉ : décision du dépôt d'origine (§6 de son handoff), reprise
// telle quelle. Un essai en cours de saisie n'est pas un essai.
import { S, $, esc, fmtDay, ebSave, todayISO } from "../state.js";
import { ouvrirPointage } from "./posture-pointage.js";
import { ETAPES } from "./posture-repere.js";

/** Le nombre d'essais qui rend un bilan comparable. Il vient du moteur porté
 *  (`validateSession` refuse sous 3) — on ne le redécide pas ici, on le nomme. */
const ESSAIS_CIBLE = 3;

/** L'état du bilan, créé paresseusement. Aucune écriture au rendu : lire un écran ne doit
 *  jamais modifier ce qu'il décrit (la leçon d'O-43, appliquée à l'UI). */
function postureState() {
  const p = S.answers.posture;
  return {
    session: (p && p.session) || null,
    history: (p && Array.isArray(p.history)) ? p.history : [],
  };
}

/** Trois états, et le handoff les nomme : aucun bilan · un bilan en cours · un bilan terminé.
 *  Le troisième se distingue du deuxième par le nombre d'essais, jamais par un drapeau — un
 *  drapeau et un compte finiraient par se contredire. */
function phaseDe(st) {
  if (!st.session || !st.session.trials || !st.session.trials.length) return "vide";
  return st.session.trials.length >= ESSAIS_CIBLE ? "termine" : "encours";
}

const monoLigne = (t) => '<div class="po-ligne-meta">' + esc(t) + "</div>";

/** UNE ligne de la section « Ce que le bilan sait de toi ». Le chevron n'est pas décoratif :
 *  chaque ligne mènera à son écran (souplesse 3a, profil 2b, historique 3c). Tant que ces
 *  écrans n'existent pas, la ligne est rendue en `div` et NON en bouton — un chevron qui ne
 *  mène nulle part est une promesse fausse, et un bouton mort en est une pire. */
function ligneHTML(titre, meta) {
  return '<div class="po-ligne"><div class="po-ligne-txt">'
    + '<div class="po-ligne-titre">' + esc(titre) + "</div>"
    + monoLigne(meta) + "</div></div>";
}

/** Un essai enregistré. Les angles portent le vocabulaire du moteur (hanche/tronc/genou) et
 *  le statut dit `valide` ou `écarté` — jamais un adjectif de confort. La RAISON d'un écart
 *  vit sur l'écran des résultats (`formatViolation` existe déjà côté moteur) : la répéter ici
 *  en ferait une seconde source de vérité. */
function essaiHTML(t, i) {
  const d = t.deltas || {};
  const a = t.angles || {};
  const cote = (v, u) => (v == null ? "—" : String(v) + (u || ""));
  const reglages = "Selle " + cote(d.saddleHeightMm) + " · reach " + cote(d.reachMm)
    + " · drop " + cote(d.dropMm);
  const ang = (o) => (o && o.mean != null ? Math.round(o.mean) + "°" : "—");
  const angles = "hanche " + ang(a.hip) + " · tronc " + ang(a.trunk) + " · genou " + ang(a.knee);
  const ecarte = t.valid === false;
  return '<div class="po-essai">'
    + '<span class="po-essai-num">' + String(i + 1).padStart(2, "0") + "</span>"
    + '<div class="po-essai-txt"><div class="po-essai-reglages">' + esc(reglages) + "</div>"
    + '<div class="po-essai-angles">' + esc(angles) + "</div></div>"
    + '<span class="po-essai-statut' + (ecarte ? " ecarte" : "") + '">'
    + (ecarte ? "écarté" : "valide") + "</span></div>";
}

/** LA CARTE EN RELIEF — le seul objet plein de l'écran (règle de hiérarchie du handoff, déjà
 *  celle du reste de Zenna). Son contenu change avec la phase ; sa forme, jamais. */
function heroHTML(st, phase) {
  const n = st.session && st.session.trials ? st.session.trials.length : 0;
  const segs = Array.from({ length: ESSAIS_CIBLE }, (_, i) =>
    '<i class="' + (i < n ? "plein" : "") + '"></i>').join("");

  if (phase === "vide") {
    // Pas de chiffre : afficher « 0 / 3 » à quelqu'un qui n'a rien commencé, c'est lui
    // reprocher de ne pas avoir commencé. C'est la leçon d'U1, sur un autre écran.
    return '<div class="po-hero">'
      + '<div class="po-hero-top"><span class="po-eyebrow">Nouveau</span>'
      + '<span class="po-eyebrow faible">10 minutes</span></div>'
      + '<div class="po-hero-titre">Position aéro<br>prolongateurs</div>'
      + '<div class="po-hero-pied">Trois essais, chacun avec un réglage différent, et le bilan '
      + "te dit lequel tient. Seul, avec ton vélo et ton téléphone.</div></div>";
  }
  if (phase === "termine") {
    return '<div class="po-hero">'
      + '<div class="po-hero-top"><span class="po-eyebrow">Bilan terminé</span>'
      + '<span class="po-eyebrow faible">' + esc(dateReprise(st)) + "</span></div>"
      + '<div class="po-hero-titre">Position aéro<br>prolongateurs</div>'
      + '<div class="po-hero-chiffre"><b>' + n + "</b><span>essais comparés</span></div>"
      + '<div class="po-seg">' + segs + "</div>"
      + '<div class="po-hero-pied">Tes essais sont comparables. Le résultat te donne trois '
      + "positions : confort, équilibrée, aéro.</div></div>";
  }
  const reste = ESSAIS_CIBLE - n;
  return '<div class="po-hero">'
    + '<div class="po-hero-top"><span class="po-eyebrow">Bilan en cours</span>'
    + '<span class="po-eyebrow faible">' + esc(dateReprise(st)) + "</span></div>"
    + '<div class="po-hero-titre">Position aéro<br>prolongateurs</div>'
    + '<div class="po-hero-chiffre"><b>' + n + "</b><span>/ " + ESSAIS_CIBLE + " essais</span></div>"
    + '<div class="po-seg">' + segs + "</div>"
    + '<div class="po-hero-pied">Il te reste ' + (reste > 1 ? reste + " essais" : "un essai")
    + " pour pouvoir comparer. Compte 3 minutes.</div></div>";
}

function dateReprise(st) {
  const d = st.session && st.session.updatedAt;
  return d ? "repris le " + fmtDay(d) : "jamais repris";
}

/** Le CTA et sa ligne d'état. Règle d'interaction du handoff, tenue ici : un bouton n'est
 *  jamais désactivé en silence — soit il agit, soit la raison est écrite dessous. */
function ctaHTML(st, phase) {
  const n = st.session && st.session.trials ? st.session.trials.length : 0;
  const label = phase === "vide" ? "Commencer le bilan"
    : phase === "termine" ? "Voir le résultat"
      : "Reprendre · essai " + (n + 1);
  const souplesse = st.session && st.session.aslrAngle != null;
  const note = phase === "vide"
    ? '<span>Aucune donnée demandée</span> <b>avant de commencer</b>'
    : souplesse
      ? '<span>Souplesse et profil</span> <b>déjà enregistrés</b>'
      : '<span>Le test de souplesse</span> <b>reste à faire</b>';
  return '<div class="po-cta-zone">'
    + '<button type="button" class="po-cta" id="poCta">' + esc(label) + "</button>"
    + '<div class="po-cta-note">' + note + "</div></div>";
}

function sectionHTML(titre, compte) {
  return '<div class="po-sec' + (compte === undefined ? "" : " espace") + '">'
    + "<span>" + esc(titre) + "</span><i></i>"
    + (compte === undefined ? "" : '<span class="compte">' + esc(compte) + "</span>")
    + "</div>";
}

export function renderTabPosture() {
  // Le sous-onglet porte plusieurs écrans ; la vue vit sur `S` et NON dans l'état persisté —
  // revenir sur l'outil doit ramener à son accueil, pas rouvrir l'écran qu'on avait quitté.
  if (S.postureVue === "preparatif") return renderPreparatif();
  const st = postureState();
  const phase = phaseDe(st);
  const s = st.session || {};
  const trials = s.trials || [];

  let html = heroHTML(st, phase) + ctaHTML(st, phase);

  html += sectionHTML("Ce que le bilan sait de toi");
  html += '<div class="po-liste">'
    + ligneHTML("Souplesse de hanche",
      s.aslrAngle != null
        ? "test du " + fmtDay(s.aslrTestedAt || s.updatedAt) + " · " + Math.round(s.aslrAngle) + "°"
        : "pas encore mesurée")
    + ligneHTML("Ton objectif de position",
      s.profile && s.profile.goal ? String(s.profile.goal) : "pas encore choisi")
    + ligneHTML("Bilans précédents",
      st.history.length
        ? st.history.length + (st.history.length > 1 ? " bilans" : " bilan")
          + " · dernier le " + fmtDay(st.history[st.history.length - 1].date)
        : "aucun pour l’instant")
    + "</div>";

  // La section « Tes essais » n'existe QUE s'il y en a. Un creux vide sous une étiquette qui
  // annonce « 0 enregistré » occupe un écran pour dire qu'il n'a rien à dire.
  if (trials.length) {
    html += sectionHTML("Tes essais", trials.length + " enregistré" + (trials.length > 1 ? "s" : ""));
    html += '<div class="po-creux">' + trials.map(essaiHTML).join("") + "</div>";
  }
  html += '<div class="po-espaceur"></div>';

  $("screen").innerHTML = html;

  // Le CTA ne mène nulle part tant que 2b n'existe pas — et il le DIT plutôt que de ne rien
  // faire. Un bouton qui absorbe le tap en silence est le défaut que le handoff interdit.
  const b = $("poCta");
  if (b) b.onclick = () => {
    // Un bilan terminé n'a pas encore son écran de résultats (2e) : on le DIT, on n'avale pas
    // le tap. La règle d'interaction du handoff vaut aussi pour un bouton qui n'agit pas.
    if (phase === "termine") {
      const n = b.nextElementSibling;
      if (n) n.innerHTML = '<span>L’écran de résultats arrive au prochain lot —</span> '
        + "<b>tes essais sont enregistrés</b>";
      return;
    }
    S.postureVue = "preparatif";
    renderTabPosture();
  };
}

/* ============================================================
   2b — LE PRÉPARATIF
   ============================================================
   Le mur de texte devient cinq lignes à cocher. La checklist est ÉPHÉMÈRE et non persistée
   (le handoff le précise) : elle sert à préparer la séance de mesure, pas à décrire l'athlète.
   Le mode de guidage, lui, EST persisté — il pilote le pointage à chaque essai. */
const PREPARATIF = [
  ["Un support pour poser le téléphone", "Trépied, étagère, pile de livres. Mains libres obligatoire."],
  ["Le vélo stable", "Home-trainer de préférence, sinon calé à l’arrêt."],
  ["Un repère de longueur connue", "La largeur de ton cintre suffit. Il servira à convertir les pixels en centimètres."],
  ["3 à 4 m de recul, lumière correcte", "De quoi te voir en entier de profil. Pas de contre-jour."],
  ["De la place au sol pour t’allonger", "Pour le test de souplesse, avant de monter sur le vélo."],
];

let _coches = [];

const COCHE_SVG = '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" '
  + 'stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" '
  + 'aria-hidden="true"><path d="M4 10.5l4 4 8-9"></path></svg>';

function renderPreparatif() {
  const st = postureState();
  const mode = (S.answers.posture && S.answers.posture.guidanceMode) || "beginner";
  let html = '<div class="po-head">'
    + '<button type="button" class="po-retour" id="poRetour">‹ Outils · Position</button>'
    + '<span class="po-etape">étape 0 / 3</span></div>'
    + '<div class="po-hero-nu"><div class="po-eyebrow" style="color:var(--zn-faint)">Avant de commencer</div>'
    + "<h2>Dix minutes,<br>seul avec ton vélo</h2>"
    + "<p>Un test de souplesse au sol, puis trois réglages de vélo filmés. À la fin, tu sais "
    + "lequel te fait gagner de l’aéro sans te coûter du confort.</p></div>";

  html += sectionHTML("Coche ce que tu as sous la main");
  html += '<div class="po-liste">' + PREPARATIF.map((it, k) =>
    '<button type="button" class="po-check" data-coche="' + k + '" aria-pressed="'
    + (_coches[k] ? "true" : "false") + '">'
    + '<span class="po-case">' + COCHE_SVG + "</span>"
    + '<span class="po-check-txt"><span class="po-check-lab">' + esc(it[0]) + "</span>"
    + '<span class="po-check-exp">' + esc(it[1]) + "</span></span></button>").join("") + "</div>";

  html += sectionHTML("Combien on te guide", "");
  html += '<div class="po-modes">'
    + '<button type="button" class="po-mode" data-mode="beginner" aria-pressed="' + (mode === "beginner") + '">'
    + "<b>Première fois</b><span>Chaque point d’articulation est montré et expliqué avant d’être placé.</span></button>"
    + '<button type="button" class="po-mode" data-mode="expert" aria-pressed="' + (mode === "expert") + '">'
    + "<b>J’ai l’habitude</b><span>Six points d’un coup, consignes repliées.</span></button></div>";

  html += '<div class="po-mentions">Tout est calculé sur ton téléphone, aucune image n’est '
    + "envoyée. Le bilan ne remplace pas un bikefitter : arrête un mouvement s’il tire ou fait mal.</div>";

  // Le pied : le CTA n'est JAMAIS désactivé — cocher est une aide, pas une condition. Ce qui
  // manque est écrit dessous, et le compte se dérive des cases, jamais d'un texte figé.
  const manque = PREPARATIF.length - _coches.filter(Boolean).length;
  html += '<div class="po-cta-zone" style="margin-top:22px">'
    + '<button type="button" class="po-cta" id="poCta2">Commencer par la souplesse</button>'
    + '<div class="po-cta-note">' + (manque === 0
      ? "<b>Tout est prêt</b>"
      : "<span>" + manque + " case" + (manque > 1 ? "s" : "") + " non cochée"
        + (manque > 1 ? "s" : "") + " —</span> <b>tu peux commencer quand même</b>")
    + "</div></div>";
  html += '<div class="po-espaceur"></div>';

  $("screen").innerHTML = html;

  $("screen").querySelectorAll("[data-coche]").forEach((b) => {
    b.onclick = () => { const k = +b.dataset.coche; _coches[k] = !_coches[k]; renderPreparatif(); };
  });
  $("screen").querySelectorAll("[data-mode]").forEach((b) => {
    b.onclick = () => {
      const p = S.answers.posture || (S.answers.posture = { session: null, history: [] });
      p.guidanceMode = b.dataset.mode;
      ebSave();
      renderPreparatif();
    };
  });
  $("poRetour").onclick = () => { S.postureVue = "accueil"; renderTabPosture(); };
  $("poCta2").onclick = () => demanderImage("aslr", st);
}

/* ============================================================
   L'IMAGE À POINTER
   ============================================================
   Le parcours complet du handoff passe par une VIDÉO dont on choisit deux images (le sélecteur
   d'image est son propre écran, absent de ce lot). En attendant, on demande une image fixe —
   et on le DIT, plutôt que d'ouvrir un sélecteur de vidéo qui ne saurait pas en extraire une
   image. L'URL est révoquée quand le pointage se termine ou s'annule : c'est le cycle de vie
   des blob URLs que le dépôt d'origine documente (§6e de son handoff), et le point où il a
   déjà cassé une fois. */
function demanderImage(etape, st) {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    lancerPointage(etape, url, st);
  };
  inp.click();
}

function lancerPointage(etape, url, st) {
  const mode = (S.answers.posture && S.answers.posture.guidanceMode) || "beginner";
  const fermer = () => { URL.revokeObjectURL(url); S.postureVue = "accueil"; renderTabPosture(); };
  ouvrirPointage({
    hote: $("screen"),
    imageUrl: url,
    etape,
    titreRetour: "Position",
    expert: mode === "expert",
    onAnnuler: fermer,
    onTermine: (r) => {
      // Le moteur peut être absent (bundle non chargé) : on le dit plutôt que de ranger une
      // mesure vide sous un nom qui promet un angle.
      if (r.angles && r.angles.angle != null) {
        const p = S.answers.posture || (S.answers.posture = { session: null, history: [] });
        p.session = p.session || { trials: [] };
        p.session.aslrAngle = r.angles.angle;
        p.session.aslrTestedAt = todayISO();
        p.session.updatedAt = todayISO();
        ebSave();
      }
      fermer();
    },
  });
}
