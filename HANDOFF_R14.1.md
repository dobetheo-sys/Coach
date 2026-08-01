# HANDOFF R14.1 — Correction du projecteur : indexer sur la distance au potentiel, pas sur l'ancienneté

**Statut :** addendum correctif au handoff R14. Il **remplace** la table P2, la règle d'incertitude P7 et l'affichage vélo de P6. Le reste de R14 (contrat `projected`, P1 adhérence, P3 mesure, P4 affûtage, P5 Riegel variable, P8 refus honnête) est inchangé et validé.

**Banc :** `bench_r14_1.js` — critères nouveaux ou modifiés. Il **périme `R14.2` et `R14.6-A/B`** du banc R14 (voir §6). Le reste de `bench_r14.js` continue de s'appliquer tel quel.

---

## 0. Pourquoi cet addendum

Écran de production, plan 70.3 sur 43 semaines, athlète réel. Rétro-ingénierie des valeurs affichées :

| | Actuel (milieu) | Projeté (milieu) | Gain réel | Borne basse | **Borne haute** |
|---|---|---|---|---|---|
| Natation 1900 m | 45'18 ±3,0 % | 43'16 ±6,2 % | **4,5 %** | −3,4 min | **−0,7 min** |
| CAP semi | 1h50 ±2,7 % | 1h45 ±6,7 % | **4,6 %** | −9,0 min | **−1,0 min** |
| Vélo | 175–191 W | 175–191 W | **0 %** | — | — |

Références déduites de l'écran : **FTP 230 W, CSS 2'15/100 m, allure seuil 4:41/km, 85 kg → 2,71 W/kg.**

Le moteur applique **fidèlement** la ligne « avancé / longue date » de la table R14 (prédit 4,6 % CAP et 5,1 % nage sur 43 semaines ; observé 4,5 % et 4,5 %). **Le code est juste, la table est fausse.** Elle indexe le plafond de gain sur `history` — et `history = "ancien"` (pratique de longue date) a été lu comme « proche du plafond physiologique ». C'est une confusion : des années de pratique auto-encadrée ne donnent pas la trainabilité résiduelle d'un athlète structuré depuis dix ans. Un athlète à 2,71 W/kg est en bas de la bande « fair » de Coggan et un CSS à 2'15/100 m est un profil limité par la technique : la marge est grande, la table dit l'inverse.

Trois défauts de forme s'ajoutent, tous visibles sur cet écran :
1. **La borne haute ne bouge pas** (−42 s en natation sur 43 semaines) : la fourchette est symétrique autour du milieu projeté, donc l'élargissement de l'incertitude annule le gain du côté pessimiste.
2. **Le vélo est immobile** alors qu'il représente ~50 % du temps de course d'un 70.3 : P6 (pacing ancré) est juste, mais l'affichage confond *cible de pacing* et *référence projetée*.
3. **Le volume n'entre pas dans le modèle** : deux athlètes de même profil à 6 h et 14 h/semaine reçoivent la même projection.

---

## 1. P2bis — Le plafond de gain s'indexe sur la distance au potentiel

`G∞(discipline) = G_plafond(discipline) × h(discipline) × k_structure × f_volume`

### a) `h` — marge disponible, depuis la référence MESURÉE

Bandes de référence, homme 30 ans (à ajuster, voir §1-d) :

| Bande | Vélo (W/kg au seuil) | CAP (allure seuil) | Nage (CSS) | `h` |
|---|---|---|---|---|
| débutant | < 2,50 | > 5:30/km | > 2:15/100 m | 1,00 |
| modéré-bas | 2,50–3,25 | 4:45–5:30 | 2:00–2:15 | 0,75 |
| modéré-haut | 3,25–4,00 | 4:00–4:45 | 1:45–2:00 | 0,50 |
| bon | 4,00–4,75 | 3:30–4:00 | 1:30–1:45 | 0,28 |
| très bon | > 4,75 | < 3:30 | < 1:30 | 0,12 |

Interpoler linéairement **à l'intérieur** de la bande (une frontière franche ferait sauter la projection de 50 % pour 1 W d'écart). Les bandes vélo suivent le profil de puissance de Coggan (publié) ; **les bandes CAP et nage sont des heuristiques convergentes de praticiens** — à écrire comme telles dans le code, et remplaçables par P3 dès que l'athlète a deux tests datés.

### b) `G_plafond` — plafond littérature du débutant complet

| Discipline | `G_plafond` | Justification |
|---|---|---|
| Vélo (FTP) | 0,25 | 20–30 %/an chez le non-entraîné (heuristique convergente) |
| Nage (CSS) | 0,22 | forte composante technique : la marge du nageur lent est technique, pas aérobie |
| CAP (allure seuil) | 0,15 | l'économie de course ne gagne que 2–4 % (Barnes & Kilding, *Sports Med Open* 2015) et progresse lentement |

### c) `k_structure` — l'ancienneté redevient un simple modificateur

| Entraînement des 12 derniers mois | `k` |
|---|---|
| au feeling, sans plan | 1,00 |
| plan structuré par intermittence | 0,85 |
| plan structuré suivi | 0,65 |

C'est **le stimulus de la structure** qu'on mesure, pas les années de pratique. Cela demande **une question au Profil** (pas dans le questionnaire d'entrée, pour ne pas alourdir le tunnel). Sans réponse : `k = 0,85` et `confidence` plafonnée à `"moyenne"`. `history` ne sert plus qu'à ce repli.

### d) Ajustements de bandes (heuristiques, à documenter dans le code)

- **Femme** : bandes vélo −0,45 W/kg ; bandes CAP et nage +10 % sur les allures.
- **Après 35 ans** : bandes décalées de −5 % par décennie (déclin aérobie de l'athlète qui maintient l'intensité). On décale **la référence**, jamais la marge de l'athlète.

### e) Plafonds absolus, non négociables

Après tout calcul : gain ≤ **30 %** par discipline et par an, et la saturation `gain(w) = G∞ × (1 − exp(−w/20))` reste en vigueur (R14 P2).

### f) Contrôle sur le cas réel

FTP 230 W / 85 kg = 2,71 W/kg → bande modéré-bas, `h ≈ 0,72` · CSS 2'15 → frontière débutant/modéré-bas, `h ≈ 0,98` · seuil 4:41/km → modéré-haut, `h ≈ 0,52`. Avec `k = 0,85` et `f_volume ≈ 0,95`, sur 43 semaines (saturation 0,88) :

| | Gain de référence | Effet |
|---|---|---|
| FTP | ~13 % | 230 → **~260 W** |
| CSS | ~16 % | 2'15 → **~1'57/100 m** |
| Allure seuil | ~5 % + affûtage | 4:41 → **~4:25/km** |

Soit natation ~39', semi ~1h41, et une cible vélo qui passerait à ~197–216 W après retest. Un athlète qui voit ça comprend pourquoi il s'entraîne 43 semaines — et rien dans ces chiffres ne dépasse les bornes de la littérature.

---

## 2. P7bis — La fourchette devient asymétrique

La règle symétrique produit une borne haute absurde (−42 s en 43 semaines). Elle est remplacée par une **fourchette sur le gain** :

```
g_ref  = gain calculé (§1)
g_lo   = 0,15 × g_ref        // cas « je n'ai presque pas progressé »
g_hi   = min(1,30 × g_ref, plafond absolu)
temps projeté ∈ [ M × (1 − g_hi) , M × (1 − g_lo) ]   où M = temps actuel (milieu)
```

Justification : **HERITAGE** (Bouchard, 483 sujets, 20 semaines) montre que pour un programme identique, 7 % des sujets gagnent ≤ 0,1 L/min de VO2max et 8 % ≥ 0,7 L/min. Le pire cas d'un plan suivi, ce n'est pas de régresser — c'est de ne presque rien gagner. **La borne haute doit donc être ta forme d'aujourd'hui**, et le texte doit le dire : *« au pire, ta forme actuelle : le plan ne te rend pas plus lent »*.

`spreadPct` disparaît du contrat. `projected` expose désormais :

```js
gainPct  : { ftp: 0.131, thrPace: 0.052, css: 0.163 },        // g_ref, inchangé
gainBand : { ftp: [0.020, 0.170], thrPace: [0.008, 0.068], css: [0.024, 0.212] },
```

Le seuil de refus de R14 P7 est conservé sous une autre forme : si `g_hi − g_lo > 0,25` (fourchette ingérable), `applicable = false` et l'UI affiche la forme actuelle seule avec le motif.

---

## 3. P6bis — Le vélo affiche deux lignes, pas une

P6 reste la règle de sécurité : **la cible de pacing du jour J ne se projette jamais.** Ce qui change, c'est qu'on cesse de la faire passer pour une projection. `projected.items` porte deux entrées vélo :

```
Vélo — cible jour J : 175–191 W
  ancrée sur ta FTP mesurée (230 W) : elle ne bougera qu'à ton prochain test.
  Partir à l'intensité qu'on espère avoir se paie toujours dans le dernier tiers.

Vélo — FTP projetée : 252–269 W
  à ce niveau, la cible deviendrait 192–223 W. Teste-toi pour la débloquer.
```

Sans ça, la moitié du temps de course d'un 70.3 est invisible dans la projection, et l'athlète en conclut — à raison — que l'outil ne prévoit aucun progrès.

---

## 4. P10 — Facteur volume (dose-réponse)

`r = volume hebdomadaire moyen prescrit en dev+spec+peak / vol_recent déclaré`

| `r` | `f_volume` |
|---|---|
| ≤ 1,00 | 0,75 (maintien : peu de stimulus nouveau) |
| 1,20 | 1,00 |
| ≥ 1,50 | 1,15 (plafond) |

Interpolation linéaire, borné `[0,75 ; 1,15]`. Le plafond à 1,15 est délibéré : au-delà, le volume supplémentaire ne se convertit pas proportionnellement en performance et fait monter le risque de blessure — le moteur ne doit pas récompenser la surcharge.

---

## 5. P9 — Le poids comme levier optionnel, sous garde stricte

**Ne s'active que si** `weight_lever === "oui"` **et** que l'athlète a lui-même renseigné un poids cible au Profil. Jamais proposé, jamais suggéré, jamais affiché autrement.

- **Effet modélisé, CAP** : ~0,8 % de temps par 1 % de masse corporelle (fourchette 0,7–1,0 %, littérature sur le coût énergétique de la course).
- **Effet modélisé, vélo** : uniquement W/kg à FTP constante — donc uniquement sur parcours vallonné/montagneux ; aucun effet sur le plat.
- **Présentation obligatoire en sensibilité, jamais en objectif** : *« à 79 kg et FTP identique, tu passerais de 2,71 à 2,91 W/kg »*. Le module ne produit **ni calendrier, ni rythme de perte, ni apport calorique** — ces sujets restent hors du périmètre du moteur, comme la frontière nutrition l'a déjà établi.
- **Gardes durs, refus silencieux du levier** : IMC cible < 18,5 ; perte impliquée > 0,5 kg/semaine sur l'horizon ; athlète mineur ; drapeau médical actif. Dans ces cas, `weightLever = null` et rien ne s'affiche.
- **Contrôle de texte** : aucune chaîne du module ne contient d'injonction (« perds », « tu dois », « il faut », « objectif poids »). Le banc le vérifie.

---

## 6. Ce que cet addendum périme dans le banc R14

| Critère R14 | Statut |
|---|---|
| `R14.2` (leg vélo projeté identique à l'actuel) | **périmé** → remplacé par `R14.1-F` (deux lignes : cible identique + FTP projetée supérieure) |
| `R14.6-A/B` (spreadPct symétrique, seuil ±12 %) | **périmé** → remplacés par `R14.1-D/E` (fourchette asymétrique, borne haute ≈ forme actuelle) |
| Tous les autres | inchangés, à faire passer |

---

## 7. Ordre d'exécution

1. **§1 table de marge** (`h`, `G_plafond`, `k_structure`) + question Profil « entraînement des 12 derniers mois » — c'est le cœur, tout le reste en dépend.
2. **§2 fourchette asymétrique** — change le contrat (`gainBand` remplace `spreadPct`), donc à faire avant l'UI.
3. **§3 vélo deux lignes** — purement affichage, gain de lisibilité immédiat.
4. **§4 facteur volume**.
5. **§5 levier poids** — en dernier, et seulement si les gardes sont écrites et testées d'abord.
6. Relancer `bench_r14_1.js`, puis `bench_r14.js` (moins les trois critères périmés), puis `bench_r13.js`, puis `audit:v1 / audit:v2`.

**Point de vigilance transversal :** `confidence` doit valoir `"faible"` tant qu'aucune semaine n'est écoulée. L'écran de production affiche « confiance moyenne » sur un plan jamais commencé — c'est une promesse que rien ne soutient encore.
