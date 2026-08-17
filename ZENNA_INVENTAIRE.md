# ZENNA_INVENTAIRE — l'inventaire MESURÉ des décisions graphiques

**Phase 1 du prompt de merge** (14/08/2026). Tout chiffre de ce document vient d'un balayage du
code, jamais d'une spec — les specs sont traitées comme des affirmations (posture exigée §
« Posture critique »), et trois d'entre elles sont confrontées en fin de document.

**Périmètre balayé** : `endurabuild/css/zenna-today.css` (45,7 Ko · 177 blocs),
`css/zenna-tabs.css` (68,4 Ko · 337 blocs), `css/styles.css` (47,6 Ko · 321 blocs, thème papier),
`css/mobile.css` (8,9 Ko · 48 blocs), styles inline des 24 modules JS d'UI qui portent des hex.

---

## 1. Les tokens — 42 variables `--zn-*`, une seule déclaration chacune

Source : le bloc `:root`/`body.theme-zenna` de `zenna-today.css`. Aucun token n'est défini deux
fois avec deux valeurs (vérifié par comptage des définitions distinctes).

| famille | tokens | statut |
|---|---|---|
| Fonds | `--zn-bg #000` · `--zn-surface #111318` · `--zn-surface-2 #181c22` · `--zn-surface-3 #20252c` · `--zn-track-bg #20252c` | décision — `--zn-track-bg` **duplique la valeur** de `surface-3` (dette : deux noms, une valeur) |
| Encres | `--zn-ink #f5f1ea` · `--zn-text #f5f1ea` (**doublon de valeur**) · `--zn-ink-2 #d7d2c6` · `--zn-muted #b4b9c0` · `--zn-muted-2 #9aa0a8` | décision, avec un doublon nommé |
| Accents | `--zn-orange #ff3d00` · `--zn-orange-2 #ff7a3d` · `--zn-orange-tint #ffb199` · `--zn-orange-glow` · `--zn-cyan #00e0c6` · `--zn-gold #ffd23d` · `--zn-gold-dot` · `--zn-gold-text` (**trois tokens or, une valeur**) · `--zn-violet #9b72ff` | décision — la collision de RÔLE de l'orange est déjà chiffrée en **O-31** (2 sens « attention » contre 24 badges vélo sur 🗓 Plan) |
| Disciplines | `--zn-swim #3b9eff` (la seule en token !) — vélo et course vivent dans `DISC[*].ac` (config JS, V5) | **décision à cheval sur deux mondes** : 1 discipline en CSS, 3 en JS |
| Charge | `--zn-charge-{dur,facile,recup}-rgb` + variantes `-papier` | décision (opacité pilotée par le consommateur) |
| États | `--zn-good #1fb8a6` · `--zn-good-dark` · `--zn-form` (**même valeur que `good`**) · `--zn-fatigue #ff7a3d` (**même valeur qu'`orange-2`**) | deux doublons de valeur sous des noms de rôle — défendable (le rôle survit au changement de teinte), à déclarer comme tel |
| Typo | `--zn-display: 'Poppins', 'Archivo Black'` · `--zn-display-weight: 800` · `--zn-body: 'Inter', …` · `--zn-mono: 'IBM Plex Mono', …` | décision (V7, motifs écrits dans le fichier) |
| Formes / mouvement | `--cut-tile` · `--cut-hero` · `--zn-skew: -4deg` · `--zn-travel: 40px` · `--beat: 120ms` | décision |

## 2. La dette de littéraux — mesurée, fichier par fichier

| fichier | occurrences hex | distinctes |
|---|---|---|
| `zenna-today.css` | 72 | 32 |
| `zenna-tabs.css` | 72 | 53 |
| JS d'UI (24 fichiers) | ~250 | ~60 |

**Les littéraux répétés qui devraient être des tokens** (top mesuré, hors définitions) :

| valeur | occurrences | ce que c'est | verdict |
|---|---|---|---|
| `#0a0a0a` | **17** (zenna-tabs) | l'encre posée SUR un accent (texte sur tuile orange/or) | **dette n°1** — c'est un rôle (`--zn-on-accent`), écrit 17 fois |
| `420ms` | **13** (zenna-tabs) | la durée du fondu R28/R29 (`.zn-fadeview`, chorégraphie Bilan) | **dette n°2** — 3,5 × `--beat`, jamais dérivée de lui |
| `#ffd23d` | 7 | l'or, en littéral à côté de ses 3 tokens | dette (verdict-badge, stamp-layer) |
| `#ff7d92` / `#ff9d8d` / `#ffb199` | 5+4+3 | roses/saumons d'états divers | à trancher : 3 teintes voisines sans rôle nommé — **accidents probables** |
| `border-radius: 100px` | 12 | la pilule | dette (un `--r-pill` suffirait) |
| `polygon(6px 0, 100% 0, …)` | 1 (zenna-today:~1140) | un biseau HORS des deux tokens `--cut-*` | **accident nommé** : la seule forme non tokenisée |

**Les littéraux JS qui sont VOULUS, à ne pas « corriger »** : les 47 `var(--zn-x, #hex-papier)`
sont le mécanisme de repli R11.1 (sans `zenna-today.css`, rendu papier identique) ; la palette
littérale d'`avatar-tri.js` est une contrainte de CI documentée (module pur, exécutable en node) ;
le style du document exporté dans `plan-view.js` est autonome par conception.

## 3. Animations

- `--beat: 120ms` est le tempo déclaré ; consommé 20 fois (5 en tabs, 15 en today).
- **Mais la chorégraphie R28/R29 s'est écrite en littéraux** : 420 ms ×13, 360 ms ×4, 480 ms ×2,
  540/320/300/160 ms épars. La règle « toutes les durées dérivent de `--beat` » n'a tenu qu'un lot.
- `prefers-reduced-motion` : **7 blocs de neutralisation** (3 today, 2 tabs, 2 styles). Les
  compteurs/jauges du Bilan ont leur repli JS (`_reduit()`), gardé par `smoke-*`. Un balayage
  exhaustif « chaque animation déclarée a sa neutralisation » n'a PAS été fait ici — c'est le
  test Z-08 de la Phase 4, à écrire rouge d'abord.

## 4. Résidus de l'ancien thème — balayage

| résidu | où | mort ou vivant ? |
|---|---|---|
| `<meta name="theme-color" content="#f1eadb">` | `index.html:55` | **VIVANT et FAUX en app** : la barre système est beige sur une app noire. La sonde du prompt est **confirmée**. Bloqueur cosmétique n°1, correctif d'une ligne (+ gestion `media` clair/sombre si on veut bien faire) |
| `--bg:#f1eadb` + palette papier | `styles.css:12` | **VIVANT et NÉCESSAIRE** : le questionnaire (hors `theme-zenna` — `hideTabs()` retire la classe) et le repli R11.1 le consomment |
| `var(--bg, #f1eadb)` | `mobile.css` ×2 | vivant (nav du questionnaire) |
| `body:not(.theme-zenna) …` | `zenna-today.css:738` | vivant, délibéré (pastille de nav en mode papier) |
| Bebas Neue (`@font-face` + woff2) | `zenna-today.css:60` + `assets/fonts/` | **CHARGÉE MAIS PLUS AFFICHÉE** (V7 : Poppins). Conservée à la demande du brief V7 — le retour arrière est UN mot à changer. À re-trancher au merge : 1 woff2 précaché pour une police morte |
| Caveat / Archivo Black / Space Grotesk | `styles.css` | vivantes (thème papier + replis de `--zn-display`/`--zn-body`) |

**Conclusion résidus** : l'ancien thème n'est pas un cadavre, c'est le **thème du questionnaire
et du repli**. Le retirer n'est pas un nettoyage, c'est une décision produit (reskinner le
questionnaire) — hors périmètre du merge, à mettre en dette documentée.

## 5. Matrice de couverture — l'état RÉEL, qui contredit la prémisse du prompt

**La prémisse « seul Aujourd'hui est reskiné » est périmée depuis l'extension de `theme-zenna` :
la classe est posée en permanence dans la vue à onglets** (`tabs.js` — retirée seulement au
retour questionnaire). Les cinq onglets prennent la palette ; trois gestes restent propres à
Aujourd'hui (cascade d'entrée, CTA collant, parallax), délibérément.

| surface | état mesuré |
|---|---|
| 🎯 Aujourd'hui | **reskiné complet** (palette + cascade + héros + check-in) |
| 🗓 Plan | reskiné : sous-onglets R28, carte de séance V3, badges V5 |
| 📅 Semaine | reskiné : sous-onglets + Bilan R29, cartes V3 |
| 📋 Profil | palette + badge-anneau R27 ; composants papier restylés par héritage |
| 🧰 Outils | palette + Éducatifs R26 + carte de vente V1/V2 |
| **Questionnaire** | **PAPIER, délibérément** (`hideTabs()` retire la classe) |
| Document exporté / partage | autonome, styles embarqués |

États non balayés ici (à faire en Phase 4, test Z-09) : hors-ligne, profil mineur, profil
blessé, état vide par onglet. La garde `smoke-zenna` couvre déjà repos/séance sur Aujourd'hui.

## 6. Confrontation : ce que le prompt affirme vs ce que le dépôt contient

| affirmation du prompt | mesure |
|---|---|
| « Trois documents de spec existent : `ZENNA_SPEC_COMPLETE.md`, `ZENNA_AUDIT_10_EXPERTS.md`, `ZENNA_SPEC_PAR_ONGLET.md` » | **Un seul existe dans le dépôt** (`ZENNA_SPEC_COMPLETE.md`, GÉNÉRÉ par `build:spec` et gardé par `check:spec`). Les deux autres n'y sont pas — s'ils existent, ils sont restés côté fondateur |
| « La spec affirme que les clip-paths sont dix et que la liste est close » | **La spec du dépôt ne dit rien de tel** : elle déclare **deux** tokens (`--cut-tile`, `--cut-hero`). Mesuré dans le code : 6 usages CSS + **1 polygone littéral hors token** (l'accident du §2) + 1 usage JS |
| « Seul Aujourd'hui était reskiné (état au 10/08) » | vrai au 10/08, **faux aujourd'hui** — voir §5 |
| « `_IFZ` recopié en triple dans `plan-view.js` » | à vérifier en Phase 2 (exactitude) — non mesuré dans cette phase |
| « le reskin a consommé ~280 ms de marge U7 » | cohérent avec la dette déclarée R-ZENNA (marge quasi nulle mesurée alors) ; à re-mesurer en Phase 3 (coûts) |
| Sonde `theme-color #f1eadb` | **confirmée**, voir §4 |

## 7. Ce qui manque à cette phase, dit plutôt que tu

- Le balayage des **états de composant** (survol/focus/désactivé/erreur) est partiel : les états
  interactifs des sous-onglets et des cartes sont stylés, mais aucun inventaire systématique
  focus-visible n'a été fait — matière pour Z-06/Z-09.
- L'iconographie est émoji + SVG inline (aucune icône réseau — cohérent CSP) ; pas de table
  exhaustive taille/couleur ici.
- `zenna-tokens.css` est livré **non branché** (voir son en-tête) : le brancher est un commit de
  Phase 4, pas un geste d'inventaire — le faire « au passage » créerait la seconde source de
  vérité que ce document est chargé de traquer.
