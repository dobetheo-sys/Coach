# ZENNA — spécification des tokens de design

> **CE FICHIER EST GÉNÉRÉ.** `npm run build:spec` le régénère depuis le code ;
> `npm run check:spec` refuse un fichier périmé (même motif que `check:app` / `check:sw`).
> **Ne pas l'éditer à la main** : une valeur changée ici ne changerait rien à l'application, et
> un document qu'on croit à jour est plus dangereux que pas de document du tout.
>
> La source de vérité est le CODE. Ce document en est la carte : il dit *où* modifier.

---

## Comment lire ce système

Zenna peint sur **deux surfaces**, et c'est la clé de tout le reste :

| Surface | Où | Fond | Qui la sert |
|---|---|---|---|
| **Sombre** | l'application (les 5 onglets) | `#000` → `#20252c` | les variables `--zn-*`, posées sur `body.theme-zenna` |
| **Papier** | le document exporté (imprimable) | `#f1eadb` crème | des valeurs **littérales** — ce document est autonome et ne charge aucune variable (R16.8) |

`body.theme-zenna` est posée au démarrage et **n'est jamais retirée** : dans l'app, la surface
papier n'est plus atteinte. Ses valeurs subsistent comme repli et pour le document exporté.

Un token qui doit servir les **deux** surfaces se déclare donc en deux temps : la variable pour
le sombre, et une valeur littérale interpolée depuis une table JS pour le papier. C'est le cas
de l'axe de charge ci-dessous, et c'est le seul motif qui traverse les deux.

---

## 1 · Tokens du thème sombre — `endurabuild/css/zenna-today.css`

Tout est déclaré sur `body.theme-zenna` : **66 variables**, en trois familles.

### 1a · Palette Zenna — 41 tokens

| Token | Valeur |
|---|---|
| `--zn-bg` | `#000` |
| `--zn-surface` | `#111318` |
| `--zn-surface-2` | `#181c22` |
| `--zn-surface-3` | `#20252c` |
| `--zn-border` | `#26292f` |
| `--zn-orange` | `#ff3d00` |
| `--zn-orange-2` | `#ff7a3d` |
| `--zn-orange-tint` | `#ffb199` |
| `--zn-orange-glow` | `rgba(255, 61, 0, .4)` |
| `--zn-cyan` | `#00e0c6` |
| `--zn-gold` | `#ffd23d` |
| `--zn-gold-dot` | `#ffd23d` |
| `--zn-violet` | `#9b72ff` |
| `--zn-text` | `#f5f1ea` |
| `--zn-muted` | `#b4b9c0` |
| `--zn-muted-2` | `#9aa0a8` |
| `--zn-ink` | `#f5f1ea` |
| `--zn-ink-2` | `#d7d2c6` |
| `--zn-good` | `#1fb8a6` |
| `--zn-good-dark` | `#0f8f81` |
| `--zn-track-bg` | `#20252c` |
| `--zn-sep` | `rgba(255, 255, 255, .18)` |
| `--zn-sep-line` | `rgba(255, 255, 255, .14)` |
| `--zn-swim` | `#3b9eff` |
| `--zn-fatigue` | `#ff7a3d` |
| `--zn-form` | `#1fb8a6` |
| `--zn-charge-dur-rgb` | `255 61 0` |
| `--zn-charge-facile-rgb` | `31 184 166` |
| `--zn-charge-recup-rgb` | `155 114 255` |
| `--zn-charge-dur-papier` | `#ffe3e0` |
| `--zn-charge-facile-papier` | `#d9f3e1` |
| `--zn-charge-recup-papier` | `#e9defc` |
| `--zn-bg-race` | `rgba(255, 61, 0, .14)` |
| `--zn-bg-eve` | `rgba(255, 210, 61, .10)` |
| `--zn-bg-taper` | `rgba(155, 114, 255, .14)` |
| `--zn-gold-text` | `#ffd23d` |
| `--zn-display` | `'Bebas Neue', 'Archivo Black', sans-serif` |
| `--zn-body` | `'Inter', 'Space Grotesk', -apple-system, sans-serif` |
| `--zn-mono` | `'IBM Plex Mono', ui-monospace, monospace` |
| `--zn-skew` | `-4deg` |
| `--zn-travel` | `40px` |

### 1b · Reliage du thème papier — 10 tokens

**C'est le mécanisme qui a rendu la migration possible.** Le thème sombre ne réécrit pas le CSS
historique : il REDÉFINIT les variables que ce CSS consomme déjà. Une règle écrite en 2026 avec
`var(--ink)` rend donc juste sur les deux surfaces, sans avoir été touchée.

| Token papier | Valeur en sombre |
|---|---|
| `--text` | `#f5f1ea` |
| `--text2` | `#b4b9c0` |
| `--muted` | `#9aa0a8` |
| `--ink` | `#f5f1ea` |
| `--bg` | `#000` |
| `--bg2` | `#181c22` |
| `--bg3` | `#111318` |
| `--acc` | `#ff3d00` |
| `--gold` | `#ffd23d` |
| `--line` | `#26292f` |

### 1c · Mouvement — 8 tokens

| Token | Valeur |
|---|---|
| `--beat` | `160ms` |
| `--dur-tap` | `calc(var(--beat) * 0.75)` |
| `--dur-trans` | `calc(var(--beat) * 2.5)` |
| `--dur-rise` | `calc(var(--beat) * 6)` |
| `--stagger` | `calc(var(--beat) * 1.1)` |
| `--ease-enter` | `cubic-bezier(.34, .06, .20, 1)` |
| `--ease` | `cubic-bezier(.2, 0, 0, 1)` |
| `--ease-spring` | `cubic-bezier(.34, 1.18, .64, 1)` |

### 1d · Formes et plans — 7 tokens

| Token | Valeur |
|---|---|
| `--z1` | `#3a3f46` |
| `--z2` | `#1fb8a6` |
| `--z3` | `#ffb199` |
| `--z4` | `#ff4b12` |
| `--z5` | `#ff1f4a` |
| `--cut-tile` | `polygon(0 0, 100% 0, 100% 78%, 78% 100%, 0 100%)` |
| `--cut-hero` | `polygon(0 0, 100% 0, 100% 82%, 55% 96%, 0 100%)` |

---

## 2 · Axe de CHARGE — `endurabuild/js/ui/icons.js` → `CHARGE`

La lecture « d'un coup d'œil » de la semaine : dur / facile / récup. **C'est le seul token qui
existe sur les deux surfaces**, donc le seul qui porte deux valeurs.

| Charge | Champs (source JS) |
|---|---|
| `dur` | `rgb: "255 61 0", papier: "#ffe3e0", label: "Dur"` |
| `facile` | `rgb: "31 184 166", papier: "#d9f3e1", label: "Facile"` |
| `recup` | `rgb: "155 114 255", papier: "#e9defc", label: "Récup"` |

Le jumeau CSS (`--zn-charge-*-rgb`, `--zn-charge-*-papier`) est déclaré dans `zenna-today.css`
et **ne peut pas diverger** : `tests/e2e/smoke-charge.mjs` compare les deux sur le rendu réel,
vérifie que les bordures descendent bien du token, que le document exporté porte les valeurs
papier, et qu'aucune règle de charge ne porte de littéral.

*Le triplet (`255 61 0`) plutôt qu'une couleur finie : le sombre l'emploie à plusieurs
opacités, une couleur figée obligerait à en déclarer une par opacité.*

---

## 3 · Accents de DISCIPLINE — `endurabuild/js/ui/icons.js` → `DISC`

Un athlète qui a vu son vélo en bleu doit le retrouver bleu partout : avatar, cartes de sport,
badge de la carte de séance, anneaux de la semaine.

| Code | Champs |
|---|---|
| `sw` | `ic: "🏊", ac: "#00b8d9", label: "Natation"` |
| `bk` | `ic: "🚴", ac: "#2e6bff", label: "Vélo"` |
| `rn` | `ic: "🏃", ac: "#ff7a1a", label: "Course"` |
| `br` | `ic: "🔁", ac: "#9b72ff", label: "Brick"` |
| `rs` | `ic: "😌", ac: "#00a376", label: "Repos"` |

*`trail` et `swimrun` n'ont pas de code propre — le moteur les émet en `rn`/`sw` — et héritent
donc de ces accents.*

**Contrainte mesurée** : sur le fond de carte sombre (`--zn-surface-3`), un badge qui porte de
l'information doit atteindre **3:1** (WCAG 1.4.11). Aucune dilution n'y arrive — le bleu du vélo
plafonne à 3,33:1 **en plein**. Les badges sont donc des tuiles pleines, jamais des teintes.

---

## 4 · Échelle typographique — `endurabuild/css/styles.css`

Sept paliers, **un par rôle**. L'échelle gouverne le TEXTE ; un glyphe décoratif se dimensionne
en `em` relativement à son porteur (R16.8). Plancher de lisibilité : **9 px**, gardé par
`smoke-typo.mjs` sur les cinq onglets.

| Token | Valeur | Rôle |
|---|---|---|
| `--fs-micro` | `9px` | étiquette capitale très espacée : eyebrow, question du fil, date de case |
| `--fs-xs` | `11px` | métadonnée dense : détail de séance, badge, légende, contenu de grille |
| `--fs-sm` | `12px` | corps d'interface — le palier de travail |
| `--fs-md` | `13px` | corps mis en avant : titre de carte, option, avertissement |
| `--fs-lg` | `15px` | saisie, libellé de question, en-tête de semaine, paragraphe d'intro |
| `--fs-hand` | `18px` | Caveat (manuscrit) + grandes valeurs — la cursive a une petite hauteur d'x |
| `--fs-xl` | `22px` | titre de section |
| `--fs-field` | `16px` | saisie sur écran TACTILE — plancher iOS, voir R18.1 en fin de feuille |

---

## 5 · Palette papier — `endurabuild/css/styles.css`

Sert le document exporté et le repli. 6 variables.

| Token | Valeur |
|---|---|
| `--bg` | `#f1eadb` |
| `--ink` | `#16130e` |
| `--text` | `#16130e` |
| `--acc` | `#ff3b30` |
| `--paper-shadow` | `7px 7px 0 var(--ink)` |
| `--cut` | `255px 18px 225px 14px/16px 225px 16px 255px` |

---

## 6 · Marque — `endurabuild/js/ui/brand.js`

| Élément | Valeur |
|---|---|
| mot-marque | `ZENNA` |
| encre du logo | `#f04808` — échantillonnée sur le logo fourni |
| fond d'icône | `#08090a` |
| géométrie | `MARQUE.contours` — deux contours (0-100), lus par le SVG de l'app **et** le générateur d'icônes PNG |

*La géométrie ne vit qu'ici. Elle a existé en trois endroits (SVG, icônes, favicone en data-URI
de 21,6 Ko) — c'est ce que R-ZENNA v8 a corrigé.*

---

## 7 · Produit — `endurabuild/js/shop-catalog.js` → `GEL_ZENNA`

| Saveur | Champs |
|---|---|
| `saveurs` | `"citron": { libelle: "Citron", arome: "Arôme naturel", bloc: "#b4c223", texte: "#5f6a0c"` |
| `cola` | `libelle: "Cola", arome: "Arôme naturel", bloc: "#6b3a1c", texte: "#5c3317"` |
| `fruits rouges` | `libelle: "Fruits rouges", arome: "Arôme naturel", bloc: "#d81f4a", texte: "#a81234"` |
| `neutre` | `libelle: "Neutre", arome: "Sans arôme", bloc: "#8c8c8c", texte: "#5a5a5a"` |

**Deux encres par saveur, et ce n'est pas de la coquetterie** : `bloc` est la couleur vive de la
maquette (le pan diagonal), `texte` sa version assombrie pour écrire sur le crème du sachet.
Mesuré : l'olive du citron rend **3,08:1** sur le crème, sous le seuil AA de 4,5.

---

## Ce qui N'EXISTE PAS — à savoir avant d'en chercher

| Famille | État |
|---|---|
| Espacement (`--zn-space-*`) | **aucun token.** Tout `padding`/`margin` du dépôt est littéral. |
| Rayon (`--zn-radius-*`) | **aucun token.** Idem pour `border-radius`. |
| Ombre, élévation | aucun token ; les ombres sont littérales. |
| Durées d'animation | **elles existent** — voir §1c. |

*Le dire explicitement évite la question suivante : « où est le token d'espacement ? » — il n'y
en a pas, et poser une échelle d'espacement est un chantier à part entière.*

---

## Les gardes qui tiennent ces tokens

| Garde | Ce qu'elle tient |
|---|---|
| `npm run check:spec` | ce document est à jour avec le code |
| `tests/e2e/smoke-charge.mjs` | l'axe de charge : table ≡ tokens ≡ rendu ≡ export, et zéro littéral |
| `tests/e2e/smoke-carte-seance.mjs` | les badges de discipline atteignent 3:1 sur le fond sombre |
| `tests/e2e/smoke-typo.mjs` | l'échelle typographique et son plancher de 9 px |
| `tests/e2e/smoke-zenna.mjs` | aucun texte sous le seuil AA sur les cinq onglets |
| `tests/e2e/smoke-shop.mjs` | les saveurs produit et leurs illustrations |
