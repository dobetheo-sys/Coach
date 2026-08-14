# PREMISSES_RECTIFIEES — chaque affirmation des documents externes, vérifiée au dépôt

**Réponse au §0 du retour de Phase 1** (14/08/2026). Règle appliquée : une prémisse non
vérifiée ne sert de base à aucun correctif. Verdicts : `confirmée` / `rectifiée` / `inexistante`.

> **⚠ RECTIFICATIF (14/08/2026, après relecture de l'historique).** Ce rapport affirmait
> « B-21 toujours gelé » et « hors course sèche le pont passe `undefined` ». **Les deux étaient
> faux au moment de l'écriture** : le commit `f2ccd7d feat(B-21)` (13/08, 23:49 — AVANT
> l'arrivée du gel, sous la décision alors en vigueur « découpler et recalibrer ») a décloisonné
> l'exposant, câblé `runHoursPerWeekOf(plan)` dans le pont (le volume de course MESURÉ sur le
> plan livré, la résolution que §7 recommandera plus tard), et — écart avec la décision de
> l'époque — **abandonné la recalibration de `TRI_RUN` après l'avoir mesurée quasi inerte**
> (89,1 % des tri et 99,3 % des duathlon vivent au plancher de la table d'ancrages) au profit
> d'un **ancrage nouveau `[1,5 h → 1,15]`**, prolongé à la pente du segment le plus bas.
> Cet ancrage est une affirmation de modèle posée SANS arbitrage du fondateur — signalée ici
> pour décision : la conserver (avec sa justification mesurée) ou la retirer. Les mesures de ce
> rapport (bandes, legs prédits) ont toutes été prises SUR l'état réel du code, B-21 compris :
> les chiffres tiennent, c'est leur CADRE qui était faux. Cause de la faute : le travail du
> tour interrompu n'était plus dans mon contexte résumé — j'ai décrit ma mémoire au lieu de
> relire le dépôt, la faute exacte que §0 m'a fait traquer chez les autres.


## Les prémisses du prompt de merge et du retour de Phase 1

| affirmation | verdict | mesure |
|---|---|---|
| Palette : orange `#FF3D00`, cyan `#00E0C6`, or `#FFD23D` | **confirmée** | `--zn-orange: #ff3d00` · `--zn-cyan: #00e0c6` · `--zn-gold: #ffd23d` (zenna-today.css, bloc `:root`) |
| Disciplines : `#3B9EFF` nage, `#FF3D00` vélo, `#FFD23D` course | **confirmée** | `DISC` dans `js/ui/icons.js:36-38` — sw/bk/rn exactement ces trois valeurs (V5) |
| Typo : Poppins Bold/800 titres, IBM Plex Mono données | **confirmée, précisée** | `--zn-display: 'Poppins'` + `--zn-display-weight: 800` (V7 embarque 700 ET 800, pas de Regular — délibéré) ; `--zn-mono: 'IBM Plex Mono'` |
| `_IFZ` recopié dans `plan-view.js` ~l.30-35, « présent en triple » | **confirmée** | `plan-view.js:30` — et le fichier le DÉCLARE lui-même (l.27) : dupliqué dans `Coach_Pro_V1.5.html` (monolithe gelé) et `scripts/splitPwa.py`. Bloqueur Phase 2.1, cas modèle, confirmé avant d'y toucher |
| Golden « 945 profils » | **rectifiée : 949** | `golden/hashes.json` compte 949 (945 était vrai avant la sous-passe O-21b, +4) — tous les critères « sur les 945 » se lisent « sur les 949 » |
| `ZENNA_SPEC_COMPLETE.md` existe | **confirmée** | à la racine, GÉNÉRÉ (`npm run build:spec`), gardé par `check:spec` |
| `ZENNA_AUDIT_10_EXPERTS.md` · `ZENNA_SPEC_PAR_ONGLET.md` | **inexistantes** | confirmé par le fondateur : issues de la mémoire d'échanges, jamais dans le dépôt |
| « dix clip-paths, liste close » | **inexistante** | la spec déclare DEUX tokens (`--cut-tile`, `--cut-hero`) ; mesuré : 6 usages CSS + 1 polygone littéral + 1 usage JS |
| « seul Aujourd'hui est reskiné » | **rectifiée** | `theme-zenna` permanente sur les cinq onglets (extension documentée dans `tabs.js`) ; cascade/CTA/parallax restent propres à Aujourd'hui |
| « le reskin a consommé ~280 ms de marge U7 » | **confirmée en substance** | dette déclarée R-ZENNA : marge quasi nulle mesurée dans le sandbox — à re-chiffrer en Phase 3 |
| « le prédicteur produisait un marathon à 1,03 × seuil » | **rectifiée : 1,068** | le 1,03 était la BORNE BASSE de la fourchette lue comme un point (ma faute, retest corrigé) ; la chaîne V-10 complète est dans `RAPPORT_PHASE0.md` |

## §1 — B-22 : la mesure exigée, et ce qui en sort

**V-10 a précédé B-22** — prouvé par l'ordre des commits : `f2d8475` (V-07→V-10) 13/08 23:07,
`1d35e32` (B-22) 13/08 23:35. La chaîne complète du champ de saisie au chrono est au
`RAPPORT_PHASE0.md`, avec les intermédiaires pour le témoin.

**La ligne exigée** (`allure_marathon_affichée / allure_seuil`, témoin 4'15/km) — le ratio
dépend du VOLUME depuis B-22, un seul chiffre ne peut plus le décrire :

| vol course/sem | bande affichée | ratios | ligne de ta grille |
|---|---|---|---|
| 3–4 h | 4'44–5'01 | 1,115–1,182 | ✅ |
| 6,5 h | 4'35–4'48 | 1,079–1,128 | reproduit l'ANCIENNE bande au caractère près |
| 10 h *(le témoin)* | 4'28–4'38 | **1,050–1,092** | « autre → à qualifier » — qualifié ci-dessous |
| 12 h | 4'28–4'32 | 1,050–1,068 | sous ta borne verte, AU plancher élite |

**Qualification.** Le scénario redouté (« le prédicteur produit 1,03 ») ne s'est pas produit :
1,03 était ma mauvaise lecture d'une borne. Le vrai état : la PRÉDICTION est volume-dépendante
depuis **R14/P5** (source citée : Vickers & Vertosick 2016) — B-22 n'a pas accéléré la
prédiction, il a aligné la prescription dessus. Ce qui reste discutable, c'est l'extrémité
rapide de `RIEGEL_ANCRES` (10 h → 1,06 ; 12 h → 1,04), une table que son propre commentaire
déclare « heuristique assumée ».

**Correctif appliqué, avec ta borne comme provenance** : la bande prescrite ne descend
jamais sous **1,05 × seuil** (`RN_MARA_RATIO_PLANCHER`, « ce que l'élite mondiale tient,
~1,05-1,08 » — REPONSE_STOP_PHASE1 §1). La dépendance au volume reste (l'objet de B-22),
son extrémité inatteignable est coupée. Une prédiction optimiste déçoit le jour J ; une
prescription impossible casse l'entraînement chaque semaine — le plancher ferme la seconde.
Gardé par T-16/T-16b (le plancher est asserté à 14 h/sem).

**Reste ouvert, pour arbitrage** : si ta position est « jamais sous 1,08 quel que soit le
volume », c'est un revert du côté rapide de B-22 (le côté lent — bandes plus lentes pour les
3-6 h, strictement prudent — mériterait alors de survivre seul). Et la vraie suite est la
recalibration de `RIEGEL_ANCRES` — c'est B-21/B-04, à traiter dans le même lot comme
l'addendum l'exige. **Diff des 949** : 56 profils marathon touchés par B-22, un seul champ
(`sessions[].det`) ; le plancher en déplace 55 de ces 56 vers des cibles plus lentes.
À noter : les 55 partagent `vol_max: 10` — c'est le DÉFAUT DU PROFIL DE BASE du golden
(famille A-2), pas une photographie de la population réelle.

## §4 — Les doublons de valeur, classés par ton critère (coexistence à l'écran)

| # | doublon | rôles | coexistence ? | classement |
|---|---|---|---|---|
| 1 | `--zn-track-bg` = `--zn-surface-3` (#20252c) | fond de jauge / fond de carte | oui (Bilan) | **redondance acceptable** — deux fonds structurels, aucun message porté ; dérivé dans zenna-tokens.css |
| 2 | `--zn-text` = `--zn-ink` (#f5f1ea) | même rôle, deux noms | — | **bénin** — dérive de nommage, fusion par dérivation |
| 3 | `--zn-gold` = `--zn-gold-dot` = `--zn-gold-text` (#ffd23d) | or d'accent / pastille « échange en attente » / texte or — **ET `DISC.rn.ac` (discipline course) ET fond « veille de course »** | **OUI** (🗓 Plan : badge course + pastille d'échange sur le même écran) | **collision de rôle réelle** — la sœur de O-31, au moins 3 sens. R27 l'avait déjà mesurée en refusant l'or légendaire `#ffd23d` « parce que c'est exactement DISC.rn.ac ». À enregistrer au registre avec O-31 |
| 4 | `--zn-form` = `--zn-good` (#1fb8a6) | courbe Forme (TSB) / état « bon » | oui (Aujourd'hui) | **redondance acceptable** — les deux disent « positif », le sens converge ; nommée |
| 5 | `--zn-fatigue` = `--zn-orange-2` (#ff7a3d) | courbe Fatigue (ATL) / nuance décorative des dégradés CTA | **oui** (Aujourd'hui : CTA dégradé + graphe de charge) | **collision possible** — une donnée (fatigue) partage sa teinte avec du décor à 200 px ; résolution = teinte propre pour la fatigue OU acceptation DA, à trancher |

**Trouvée EN CLASSANT, hors liste** : la courbe **Fitness (CTL)** du graphe de charge est
colorée `var(--zn-swim)` (`plan-view.js:74,106`, `tab-today.js:239`) — **la couleur de la
discipline natation porte un second rôle**, « fitness », sur un écran où un triathlète voit
aussi des badges natation. Même famille qu'O-31 et que le n°3. Les replis `#2e6bff`/`#ff7a1a`
de ces mêmes lignes sont l'ANCIENNE palette (pré-V5) — cohérents en mode papier, à vérifier
comme résidus en Phase 3.

**`#FF3D00` (marque · charge dure · vélo)** : la collision est déjà arbitrée — **O-31**,
« non corrigé délibérément », chiffres à l'appui. Elle reste la référence du genre.
