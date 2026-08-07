# AVATAR_INVENTAIRE — l'existant, avant le composite 30×3 (étape 1 du brief R13)

> Livrable intermédiaire exigé par le brief (« s'arrêter et le remonter avant de
> continuer »). La spec visuelle validée par le fondateur (07-08/08/2026) remplace les
> tables §4 du brief : **système en boucles** 5 items × 6 générations par discipline,
> roulement par discipline, or en B6, cumulatif sur 4 lignes, rendu **composite carré**
> (cartes) + **triptyque story** (partage/plein écran), 3 marqueurs de niveau,
> 7 règles de l'audit design.

## 1. Les fichiers du système actuel

| Fichier | Rôle |
|---|---|
| `endurabuild/js/ui/avatar.js` (242 l.) | TOUT le rendu : `avatarSVG()`, ancrage tête, thèmes, moods, `avatarDataFor()` |
| `src/app/bridge.ts` (~l. 380-445) | Le registre `AVATAR_LEVELS` (16 niveaux : nom, icône, seuil XP, `unlock`), le calcul d'XP `avatarV2()`, exposé `EBV2.avatar` |
| `src/app/bridge.ts` (R17.2) | `perfTier` — le 3ᵉ canal (forme physique), dérivé de `margeOf` (R14.1) |
| Consommateurs | `tab-profile.js` (96 px + partage 520), `session-life.js` (110 + 520), `retest.js` (100 + 520), `export.js` (story) |
| Garde | `tests/e2e/smoke-avatar.mjs` — AV1-A/AV1-B (séparation des canaux), AV3-C (perf), AV6-A (ancrage tête) |

## 2. Signature de rendu

`avatarSVG(v, size) → string` SVG inline, viewBox `0 0 100 110`, `size` en px.
`v = avatarDataFor(plan, todayISO)` → `{ accent, streak, mood, level, icon, name, perf }`.
Trois canaux étanches (R17.1/R17.2, vérifiés par la suite E2E) :
**progression** (level, cumulatif), **forme du jour** (mood → posture + visage, relu chaque
matin), **forme physique** (perf → repère gradué au sol, réversible sans perte).

## 3. Primitives existantes (niveau actuel de déblocage · coordonnées clés)

Contrat de calques : chaque pièce est étiquetée `data-layer` / `data-piece` — les tests
lisent des calques, pas des expressions régulières. `HEAD_ANCHOR = {cx:50, cy:36, r:10}`
est exporté : le visage se dessine sur l'ancrage, jamais sur le corps.

| Primitive | Niv. | Coordonnées / notes |
|---|---|---|
| Silhouette | 1 | tête cercle ancrage r10, torse `M50 46 L50 74` sw9, membres sw5, encre `#16130e`, crème `#f6efe0` |
| Postures ×5 | — | `P{feu,frais,normal,fatigue,vide}` — bras+jambes par mood, affaissement 0-2 px |
| Visages ×5 | — | `F{...}` ancrés sur `HEAD_ANCHOR` |
| Chaussures | 2 | embouts accent sw5 au bout des jambes (position suit la posture) |
| Décor parc | 3 | sol y101 + herbe + arbre cx10 cy88 |
| Bandana | 4 | rect 41,29 18×4 — **supprimé** au nouveau système (tête = natation) |
| Décor piste | 5 | 2 lignes y101/y106 (pointillés 7 5) |
| Aura pointillée | 6 | cercle cx50 cy58 r44, dash 6 5 — couleur = streak (vert/or/orange) |
| Lunettes sport | 7 | 2 rects 42/51,34 — **supprimé** (tête = natation) |
| Décor stade | 8 | 6 rects gradins, coins hauts, opacité .22 |
| Maillot bicolore | 9 | torse accent + haut encre .35 |
| Dossard | 10 | rect 44,58 12×9 + niveau — devient le **marqueur vélo** (poitrine) |
| Décor nocturne | 11 | ciel `#1c2340` .25 + 2 faisceaux or .18 |
| Aura pleine + traînée | 12 | r44 sw4 + r48 sw1.5 + 3 traits accent |
| Étoiles | 13 | 3 `<text>⭐` (70,24 · 20,34 · 80,46) |
| Médaille | 14 | ruban `#e63946` + cercle or r4 (50,56) |
| Arche d'arrivée | 15 | `M18 30 L18 12 Q50 -4 82 12 L82 30` + bandeau ARRIVÉE |
| Laurier + piédestal | 16 | branches `#00734f` sw2.2 + rect or y99 « 1 » |
| Repère de forme (canal 3) | — | échelle 10 graduations x18-82, y105-109.5 + triangle accent |

## 4. Niveau ← XP : où et comment

`avatarV2()` (bridge) **dérive** l'XP à chaque rendu — rien n'est stocké :
`xp = jours validés × 10 + badges × 80 + semaines régulières × 120` (100 % régularité,
seules les coches ✓ du plan comptent, repos compris). Le niveau est le plus haut seuil
atteint dans `AVATAR_LEVELS` (16 seuils : 0, 10, 25, 50, 90, 150, 230, 340, 480, 660,
900, 1200, 1600, 2100, 2700, 3500 — **identiques aux 16 premiers du brief §4**).

## 5. Ce que l'inventaire remonte (à trancher avant l'étape 2)

1. **La migration peut être EXACTE, pas forfaitaire.** Le brief propose « migrer l'existant
   vers `course` ». Or l'XP n'est pas stocké : il est **recalculé** depuis `answers.done`,
   et chaque séance du plan porte sa discipline (`s.d` : `rn`/`bk`/`sw`…). On peut donc
   recompter l'XP **par discipline** sur les coches existantes — un triathlète qui a validé
   30 nages ne démarre pas nageur niveau 0. Aucune perte, aucune approximation.
   → Proposé : répartition par discipline réelle ; `course` par défaut pour l'inclassable.
2. **À qui vont les +10 du repos validé** (`d:"rs"`) et des séances de renfo ? Proposé :
   à la discipline la plus basse (le repos sert la reprise) — à valider.
3. **`answers.avatarTheme`** (couleur du maillot au choix) entre en conflit avec le
   composite où chaque zone porte la couleur de SA discipline. Proposé : le thème reste le
   choix d'ACCENT des éléments partagés (lumière au sol, étoiles) tant que la meneuse ne
   les colore pas ; le maillot suit désormais la génération vélo. À valider.
4. Badges (+80) et semaines régulières (+120) ne sont pas par discipline. Proposé : ils
   créditent la discipline de la séance qui les déclenche quand elle est identifiable,
   sinon les trois à parts égales. À valider.

Le reste de la structure est conforme à ce que le brief supposait : un seul module de
rendu, un registre de niveaux avec seuils, un calcul pur XP → niveau, des consommateurs
qui passent par `avatarDataFor`. Rien ne bloque l'étape 2 (modèle de données + migration).
