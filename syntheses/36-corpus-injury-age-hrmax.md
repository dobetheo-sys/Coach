# 36 — Zones fragiles, âges extrêmes, FC max : le corpus les exerce, et il trouve trois choses

**Brief 38** · 25/08/2026 · **aucune règle modifiée**, `src/` byte-identique · corpus
**1 046 → 1 069 profils** · `golden:verify` **0 champ en écart sur les 1 046 existants** ·
batterie **12/12**

---

## 1. `injury` — les 8 zones manquantes, et deux constats

23 profils ajoutés : 8 zones fragiles, 11 âges, 4 FC max. Chaque profil est comparé à son
**témoin** — le même athlète sans la déclaration — un seul facteur variant.

### 1a. En COURSE, la contre-indication agit — clairement

| zone déclarée | plan livré (part de chaque discipline) | total |
|---|---|---|
| (aucune) | course 100 % | 58,6 h |
| `tibia` | course **51,7 %** · vélo 48,3 % | 55,5 h |
| `genou` | course **62,2 %** · vélo 37,8 % | 55,9 h |
| `pied` | course **63,5 %** · vélo 36,5 % | 56,3 h |
| `hanche` | course **63,0 %** · vélo 37,0 % | 55,8 h |
| `fascia` | course **100 %** | 51,6 h |
| `cheville` | course **100 %** | 51,6 h |
| `quadriceps` | course **100 %** | 51,6 h |

Les quatre zones qui figurent dans `R6_PAIN_CONTRAINDICATION` substituent bien du vélo à la
course. **Les trois qui n'y figurent pas ne changent aucune discipline** — elles réduisent
seulement le volume (58,6 → 51,6 h, −12 %) par le facteur `R6_INJURY_LOAD_FACTORS`.

⚠ **Constat 1 — quatre zones déclarables n'ont aucune entrée dans la table.** Le domaine
d'`injury` compte 12 zones ; la table en couvre **8**. `velo`, `quadriceps`, `cheville` et
`fascia` sont proposées à l'athlète et ne déclenchent aucune contre-indication de discipline.
Concrètement : **quelqu'un qui déclare une aponévrosite plantaire (`fascia`) garde 100 % de
course à pied**, avec 12 % de volume en moins. Signalé, non corrigé.

⚠ **Constat 1 bis — une asymétrie dans la table elle-même** : `course` y figure (elle interdit
la course à pied), `velo` non. Deux valeurs construites sur le même modèle — « j'ai mal quand
je… » — dont une seule est branchée.

### 1b. En TRIATHLON, la contre-indication de discipline est INERTE

C'est le constat le plus net du lot, et il est mesuré à la deuxième décimale :

```
injury=(aucune)   bk 30,56 %  br 14,58 %  rn 34,88 %  sw 19,99 %   · 114,9 h
injury=course     bk 24,68 %  br 16,71 %  rn 42,35 %  sw 16,26 %   ·  99,4 h   (interdit rn)
injury=velo       bk 24,69 %  br 16,59 %  rn 41,35 %  sw 17,36 %   ·  99,3 h   (aucune entrée)
injury=cou        bk 24,69 %  br 16,59 %  rn 41,35 %  sw 17,36 %   ·  99,3 h   (interdit sw ET bk)
injury=genou      bk 24,69 %  br 16,59 %  rn 41,35 %  sw 17,36 %   ·  99,3 h   (interdit rn ET bk)
injury=dos        bk 24,69 %  br 16,59 %  rn 41,35 %  sw 17,36 %   ·  99,3 h   (interdit bk)
```

**Quatre zones aux interdictions DIFFÉRENTES produisent exactement le même mix**, au centième
près. Et deux d'entre elles produisent PLUS de la discipline qu'elles interdisent : `course`
interdit la course à pied et la part de course **monte de 34,9 à 42,4 %** ; `genou` interdit
course et vélo, et la course monte aussi.

**La seule zone qui change réellement le mix en triathlon est `epaule`** (nage 19,99 → 10,09 %),
et elle passe par un autre mécanisme — la borne d'épaule O-85, hors de cette table.

⚠ **Constat 2, avec sa gravité** : en triathlon, déclarer une zone fragile réduit le volume
(−13,6 %) mais **ne retire aucune discipline**. Ce n'est pas un risque immédiat — le plan est
plus petit — mais c'est un écart entre ce que la table DÉCLARE et ce que le plan LIVRE, sur la
règle de sécurité la plus visible du questionnaire. **Non corrigé, conformément au brief.**

---

## 2. `age` — les trois garde-fous confirmés à leur seuil exact

| garde-fou | seuil documenté | mesuré |
|---|---|---|
| **mineur** (`R6_AGE_LOAD`) | ≤ 17 ans : volume ×0,7, **aucune VO2max** | ✔ frontière nette **17 \| 18** — semi : pic 4,52 h et **0 min de VO2** à 17 ans, 6,40 h et 145 min à 18 |
| **borne de format** (`AGE_MINI_FORMAT`) | 18 ans pour marathon / 70.3 / Full / PM · 50 km pour un trail | ✔ marathon **refusé** à 10, 12, 16, 17 · accepté à 18 · trail de 62 km refusé jusqu'à 17 |
| **master** (`R6_AGE_LOAD`) | ≥ 60 ans : volume ×0,85, récup toutes les 3 semaines | ✔ frontière nette **59 \| 60** — semi : pic 6,40 h à 59, **5,03 h** à 60 |
| **estimation énergétique** (O-16) | < 16 ans : refus motivé | ✔ refusée à 12 et 15, servie à 16 |

Aucun crash sur les onze âges balayés, de 10 à 100, sur quatre couples (sport, format).

⚠ **Constat 3 — les deux facteurs sont PLATS sur tout leur domaine.** Un athlète de **100 ans
reçoit exactement le même plan qu'un de 60** (pic 5,03 h, 40 h de total, 114 min de VO2max), et
un enfant de **10 ans exactement le même qu'un de 17** (pic 4,52 h, 36 h). Le schéma accepte de
10 à 100 ; le moteur ne distingue que deux frontières.

⚠ **Constat 3 bis** : `AGE_MINI_FORMAT` ne borne que marathon, 70.3, Full et PM. **Un enfant de
10 ans peut donc générer un plan de semi-marathon** — 12 semaines, 4,52 h de pic, 36 h au total.
C'est un fait mesuré ; savoir s'il est acceptable est une question de Phase 2, pas de code.

---

## 3. `hr_max` — le repli du repli, documenté

Le moteur estime la FC max par **`208 − 0,7 × âge`** (`reasoningEngine.ts:34`) — la formule de
Tanaka, pas le `220 − âge` habituel. À 35 ans : **183,5 bpm**.

| situation | bandes de FC livrées | volume |
|---|---|---|
| allure inconnue, **pas de FC max** | 110-129 · 129-147 · 160-169 | 53,6 h |
| allure inconnue, **`hr_max = 185`** | 111-130 · 130-148 · 161-170 | 53,6 h |
| allure inconnue, **`hr_max = 160`** | 96-112 · 112-128 · 139-147 | 53,6 h |
| **allure connue**, `hr_max` déclarée ou non | *aucune bande en bpm* | 53,6 h |

Trois faits :

1. **La FC max déclarée pilote bien les bandes** — un athlète à 160 bpm reçoit des consignes
   décalées de ~25 bpm vers le bas.
2. **Elle ne change JAMAIS le volume ni la structure** — 53,6 h dans les quatre cas. C'est une
   consigne, pas un paramètre de charge. Comportement attendu, désormais photographié.
3. **Quand la référence sportive est connue, aucune bande en bpm n'apparaît** — `hr_max` est
   alors inerte, ce qui confirme son statut de repli.

---

## 4. Couverture — et un avertissement sur le chiffre

| clé | avant (fiche 35) | après |
|---|---|---|
| `injury` | 5 valeurs (`tibia`, `genou`, `epaule`, `dos`, `tibia,genou`) | **13 valeurs — les 12 zones du domaine + une combinaison** |
| `age` | 3 valeurs (16, 35, 62) | **9 valeurs** : 12, 16, 17, 18, 35, 60, 62, 80, 100 |
| `hr_max` | **absente** | 1 valeur (185) sur 4 profils |

⚠ **Le pourcentage global de `couverture:golden` n'est PAS comparable d'une exécution à
l'autre, et il faut le dire** : il affiche **57 % avant (3 292/5 815) et 57 % après
(3 250/5 720)** — numérateur ET dénominateur ont BAISSÉ. La cause n'est pas une perte de
couverture : l'outil **dérive les couples décisionnels par co-occurrence**, donc ajouter des
profils change l'ensemble des couples qu'il considère. Mesuré : `run` perd 12 couples
(105 → 93), `bike` en gagne 6 (123 → 129). **Le pourcentage mesure une population qui bouge sous
lui ; seuls les comptes par clé ci-dessus sont comparables.**

---

## 5. Deux cliquets ré-épinglés

`T-27` (sceau) `S4` 342 → **346**, `S5` 216 → **231** · `T-48` population tri 203 → **206**,
VO2 8 688 → **8 868** min, nage seuil 432 376 → **444 251** m.

Les deux comptent sur tout le corpus, qui vient de grandir de 23 profils. **La preuve que c'est
la population et non le moteur est la plus forte possible : `src/` est byte-identique**
(`git diff --stat src/` vide).

---

## 6. Vérifications

```
corpus              1 046 → 1 069 (+8 INJ, +11 AGE, +4 HRMAX)
golden:verify       23 écarts, TOUS « profil NOUVEAU » · 0 champ en écart sur les 1 046 existants
génération          23/23 générés · 0 crash · 8 refus typés attendus (mineur × format long)
npm run batterie    12/12 verts
src/                0 ligne modifiée
```

## 7. Ce qui reste de la liste de la fiche 35

Traitée : priorité haute (les trois familles de ce lot). **Restent, non ajoutées** :
`sleep` et `life_load` (absents des 1 069, alors qu'ils multiplient le volume par 0,85 et 0,9),
les bornes de la garde IMC (`weight`/`height`), `swim_limit` (4 valeurs, absente), puis la
priorité basse : `race_cutoff_h`, `treadmill: oui`, `train_dplus_access: plat`,
`doubles: non/parfois`, `races: oui`.
