# 35 — Le corpus exerce enfin les deux scénarios les plus sensibles

**Brief 37** · 25/08/2026 · **aucune règle modifiée**, `src/` byte-identique · corpus
**1 016 → 1 046 profils** · `golden:verify` **0 écart sur les 1 016 existants**

---

## 1. Ce qui est ajouté

**16 profils à drapeau médical** — `med_pain`, `med_dizzy`, `med_treat` séparément puis
ensemble, sur les quatre sports où l'intensité et le volume pèsent le plus (tri 70.3, semi,
route, trail), en alternant débutant/plaisir et confirmé/compétition.

**14 profils à référence inconnue** — pour chaque sport, les clés qu'il CONSOMME réellement
(le vélo n'a pas de CSS, la natation pas de FTP), une par une puis toutes ensemble :
bike `ftp` · run et trail `pace` · swim `css` · tri les trois + toutes · duathlon `ftp`, `pace`
+ toutes · swimrun `pace`, `css` + toutes.

La valeur mesurée est **retirée** en même temps que le drapeau : laisser `ftp: 250` derrière un
`ftp_known: "non"` testerait une entrée que le questionnaire ne peut pas produire.

### Une faute de fixture corrigée avant capture

Ma première écriture alternait le couple (niveau, intention) **par variante de drapeau** : deux
profils y différaient à la fois par le drapeau et par le niveau — **aucune comparaison n'était
à facteur unique**. Le couple est désormais constant DANS un sport et varie ENTRE sports. C'est
ce qui rend le résultat du §2 lisible au lieu d'être un artefact.

## 2. Les drapeaux médicaux : le garde-fou tient, et il tient FORT

Mesuré sur les 16 profils :

```
minutes de QUALITÉ livrées (zones vo2/thr/css/rp/ss/frc/speed) : 0 sur les 16
décision « medical » présente                                   : 16 / 16
pic livré       tri 3,60 h · semi 3,22 · route 3,60 · trail 4,02
                (contre 8,7 · 6,7 · 8,9 · 8,9 pour les mêmes profils sans drapeau)
```

**Le drapeau retire toute l'intensité et divise le volume par deux à trois.** Le contournement
mentionné en fiche 34 — trouvé par `audit:v7` au moment de R16.10 — **ne reproduit pas** sur ces
seize profils : aucune séance de qualité ne passe.

**Et les quatre variantes d'un même sport donnent des plans STRICTEMENT identiques** (même pic,
même total, même nombre de séances). Ce n'est pas un défaut : le moteur agrège les trois
questions en un seul `medHold`. Mais c'est un fait à connaître — **le corpus ne peut pas
distinguer laquelle des trois questions porte le blocage**, et si l'une cessait un jour d'y
contribuer, seuls ces profils, comparés entre eux, le montreraient.

## 3. La référence inconnue : trois comportements, dont un à signaler

Chaque profil est comparé à son **témoin** — le même athlète qui déclarerait connaître sa
référence. Un seul facteur varie.

**(a) Le vélo, le tri et le duathlon ne changent pas de plan.** `ftp_known: "non"` rend des
zones identiques à la minute près (`bk.z2 2908`, `bk.vo2 120`, `bk.frc 113` — les mêmes des deux
côtés). Seules les CONSIGNES changent : le plan bascule des watts vers la fréquence cardiaque et
le ressenti. **C'est le comportement voulu** — la structure est la même, la façon de la piloter
change.

**(b) La course et le trail bougent légèrement** (`rn.thr` 213 → 226 min sur un semi) : sans
allure déclarée, l'estimation change, et les blocs prescrits en distance coûtent d'autres
minutes. Cohérent.

**(c) ⚠ UNE CELLULE S'EFFONDRE, et c'est le point d'attention de ce lot.**

```
swim / demifond / DÉBUTANT     css connu   1,63 h de pic · 11 h de total · 46 séances
                               css INCONNU 0,77 h de pic ·  6 h de total · 20 séances   −52 %
```

**Un nageur débutant sur demi-fond qui ne connaît pas son CSS reçoit la moitié du plan et 57 %
de séances en moins.** Balayé sur les 12 cellules (4 formats × 3 niveaux), **c'est la seule** :
partout ailleurs, ne pas connaître son CSS donne **+11 à +18 %** de volume — l'estimation par
défaut est plus lente, donc les mêmes mètres coûtent plus de minutes.

**Gravité, dite franchement** : ce n'est pas un risque de blessure — le plan est plus PETIT, pas
plus dur. C'est un défaut de **précision et de service** : la population concernée est
exactement celle que le produit dit servir en premier (le débutant qui n'a jamais fait de test),
et elle reçoit deux fois moins que ce que son enveloppe permet. **Non corrigé ici**, conformément
au brief.

⚠ Et par hasard, ma passe `REF` pour la natation utilise `demifond` : le profil
`REF/swim/demifond/css` **est** la cellule anomale. Elle est donc photographiée — un futur
correctif la fera bouger visiblement.

## 4. La couverture, avec sa base

```
avant   2 297 / 4 192 cellules décisionnelles peuplées  (55 %)
après   3 292 / 5 815                                    (57 %)
```

⚠ **Le pourcentage ne dit presque rien ici, et il faut le dire** : le DÉNOMINATEUR a grandi de
1 623 cellules parce que des clés qui n'apparaissaient nulle part apparaissent maintenant — elles
créent des couples décisionnels qui n'existaient pas comme mesurables. **Le nombre qui compte est
+995 cellules peuplées** pour +30 profils.

Sur les six clés visées, le passage est net :

| clé | avant | après |
|---|---|---|
| `med_pain` · `med_dizzy` · `med_treat` | **absentes des 1 016** | 2 valeurs · 8 « oui » chacune |
| `ftp_known` | oui × 1 016 | oui 1 041 · **non 5** |
| `pace_known` | oui × 1 016 | oui 1 038 · **non 8** |
| `css_known` | oui × 1 016 | oui 1 041 · **non 5** |

## 5. Ce que je propose d'ajouter ensuite — sans le faire (tâche 5)

Classé par valeur de sécurité, à trancher par le fondateur.

**Priorité haute — des branches de sécurité encore non photographiées :**

1. **`injury` : 8 zones sur 13 ne sont couvertes par aucun profil** — `pied`, `hanche`, `cou`,
   `course`, `velo`, `quadriceps`, `cheville`, `fascia`. Or `R6_PAIN_CONTRAINDICATION` associe à
   chaque zone une liste de disciplines INTERDITES : chaque zone non couverte est une règle de
   contre-indication qu'aucune photo ne fige. C'est le trou le plus proche de celui qu'on vient
   de combler.
2. **`age` aux extrêmes** : le corpus porte 16, 35 et 62. Le domaine va de 10 à 100. Trois
   garde-fous distincts s'y jouent — la borne de format du mineur (R15.7-C), la borne de
   l'estimation énergétique (16 ans, O-16) et le facteur master 60+ — et un âge de **12 ans**
   comme un âge de **80** n'est photographié nulle part.
3. **`hr_max`** : absent des 1 046 profils. C'est la référence sur laquelle le moteur bascule
   quand la mesure est inconnue — **les 14 profils `REF` que je viens d'ajouter n'ont pas de FC
   max déclarée**. Le repli du repli n'est donc pas photographié.

**Priorité moyenne — des leviers qui modulent le volume sans être vus :**

4. **`sleep` et `life_load`** : absents des 1 046, alors qu'ils multiplient le volume par 0,85
   et 0,9 (`RECUP_FACTORS`). Deux profils suffiraient.
5. **`weight` et `height` aux bornes de la garde IMC** : le corpus porte 75/82/85 kg et une
   seule taille.
6. **`swim_limit`** (4 valeurs, déclarée pour la natation) : absente, alors que R20.1 l'a
   explicitement câblée sur ses quatre valeurs.

**Priorité basse — de la couverture de complétude :**

7. `race_cutoff_h` (barrière horaire en ultra), `treadmill: oui` en trail, `train_dplus_access:
   plat` (la branche « terrain plat → substituts nommés »), `doubles: non/parfois`,
   `races: oui` sur plus d'un profil.

## 5 bis. Deux cliquets ré-épinglés — et la preuve que c'est la population

`T-27` (sceau) et `T-48` (composition du pic tri) comptent **sur tout le corpus**. Ils montent
donc mécaniquement quand le corpus grandit :

```
T-27  S4 340 → 342 · S5 211 → 216      (1 042 plans scellés au lieu de 1 012)
T-48  population tri 195 → 203 · VO2 8 400 → 8 688 min
```

**La preuve que c'est la population et non le moteur est la plus forte possible : `src/` est
byte-identique dans ce lot** (`git diff --stat src/` vide). Le dépôt exige normalement de
rejouer le nouveau corpus contre le moteur inchangé pour trancher — ici le moteur n'a
littéralement pas bougé.

Détail qui confirme la lecture : les **+8 profils tri** de `T-48` sont 4 `MED/tri` et 4
`REF/tri`, et les **288 minutes de VO2** viennent uniquement des quatre `REF` (~72 chacun) —
les quatre `MED` n'en apportent aucune, puisque le drapeau médical retire toute la qualité.

## 6. Vérifications

```
corpus                1 016 → 1 046 profils (+16 MED, +14 REF)
golden:verify         30 écarts, TOUS « profil NOUVEAU » · 0 champ en écart sur les 1 016
                      existants — l'enrichissement n'a touché aucun plan
golden:capture        1 046 profils · POPULATION épinglée à 1 046 dans les deux gates
génération            30/30 profils générés, 0 crash, 0 exception
couverture:golden     2 297/4 192 (55 %) → 3 292/5 815 (57 %) · +995 cellules peuplées
audit:v1              459 combinaisons · 0 violation dure
npm run batterie      12/12 verts — après ré-épinglage de DEUX cliquets de POPULATION
```
