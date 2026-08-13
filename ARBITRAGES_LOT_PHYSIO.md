# Arbitrages du lot `fix/moteur-physio`

Les décisions prises en cours de lot, avec **la mesure qui les a motivées**. Un chiffre sans sa
raison redevient un littéral non sourcé au premier relecteur — c'est précisément le défaut que ce
lot corrige, on ne le reproduit pas dans ses propres décisions.

Chaque entrée porte : ce que le handoff proposait · ce que la mesure a montré · ce qui est retenu.

---

## B-01 — Plafond de la sortie longue · **indexé sur le volume**

**Handoff** : `≤ 70 % du volume de la semaine pic` → `≤ 35 %` du volume hebdomadaire de la
discipline, dérogation ultra à 45 %, « si le plancher C30 devient inatteignable, ne pas relever le
plafond — remonter le volume ou allonger la préparation ».

**Ce que la mesure a montré** (30 profils de référence + calcul de `longRunSpecificityFloor`) :

- **23 profils sur 30 sont au-dessus de 35 %**, et **15 au-dessus même de la dérogation ultra à
  45 %**. Le rayon d'action est celui d'une refonte, pas d'un correctif ciblé.
- **B-01 entre en collision frontale avec C30**, votre décision du 04/08 (plancher de spécificité
  de la sortie longue). Mesuré sur les 6 profils course : **4 conflits**.

| profil | pic | longue actuelle | plafond B-01 | plancher C30 | conflit |
|---|---|---|---|---|---|
| P01 run 10k confirmé 2 h | 1,6 h | 58 min (63,8 %) | 34 min | 42 min | +8 |
| P02 run 10k débutant 2 h 30 | 1,5 h | 51 min (62,5 %) | 31 min | 59 min | +28 |
| **P03 run marathon reprise** | 4,5 h | **180 min (67,2 %)** | **95 min** | **180 min** | **+85** |
| P05 run semi genou | 3,6 h | 104 min (51,5 %) | 76 min | 105 min | +29 |

- **L'échappatoire du handoff est inutilisable sur le profil qui en aurait le plus besoin.**
  Pour que C30 tienne sous 35 % sur P03, il faudrait passer de 4,5 h à **8,6 h/semaine** — chez un
  marathonien *en reprise*. C'est la priorité n°2 du manifeste (prévention des blessures) et toute
  la raison d'être de la rampe R10 qui l'interdisent. Sur P03, C30 est d'ailleurs déjà saturé au
  plafond de sécurité C23 (180 min débutant) : les deux règles sont au contact.

**Retenu** : **plafond indexé sur le volume** — `50 %` sous 5 h/semaine, `35 %` au-dessus,
`45 %` pour les catégories trail `ultra` / `ultra_long`.

**Motif** : à bas volume, la sortie longue domine *légitimement* la semaine — on ne construit pas
un marathon dans une semaine de 4,5 h autrement, et le plafond plat punissait exactement la
population que C30 protège. Au-dessus de 5 h, la domination n'a plus d'excuse structurelle et
l'objectif du ticket tient. Le back-to-back reste préféré au dépassement partout où il est
disponible, comme le handoff le demande.

**Ce qui reste à vérifier à l'implémentation** : le plafond ne doit jamais passer devant le
plancher C30 (`max(plafond, plancherC30)`), sinon on réintroduit le conflit par une autre porte.

---

## B-02 — Plafond de temps dur · **12 %, bornes 25-60, disciplines d'impact seulement**

**Handoff** : `60 min fixes` → `clamp(0,10 × minutes_hebdo, 20, 60)`, « à 2 h 30/semaine le
plafond passe de 60 à 20 min (40 % → 13 % d'intensité) ».

**Ce que la mesure a montré** :

1. **Le plafond actuel est dormant.** Sur les 945 profils du golden, il ne mord que sur **6
   profils (0,6 %)**. Sur les 30 profils de référence : **aucun** (63 min observés au maximum pour
   66 tolérés). La règle ne protège aujourd'hui presque personne.
2. **Le ticket vise la mauvaise population.** À 2 h comme à 2 h 30, le générateur produit déjà
   **9 min de temps dur** — très loin des deux plafonds, l'ancien comme le nouveau. Le correctif
   serait **inerte sur les profils que le ticket nomme**. Les profils réellement contraints sont à
   **volume moyen et forte intensité** (semi genou 34 min, 5 km avancé 34, CLM 52, eau libre 48,
   tri M 61, duathlon M 63).
3. **Les chiffres du handoff omettent la tolérance C26c.** 60/150 = 40 % est le plafond *déclaré* ;
   66/150 = **44 %** est le plafond *appliqué*. Sur une règle dont tout l'objet est de borner le
   dur, c'est la valeur appliquée qui compte.
4. **Le calibrage proposé toucherait 45 % du catalogue, dont 64 % de la population nage.**

| calibrage | profils touchés | coupe moyenne | pire | nage/swimrun |
|---|---|---|---|---|
| 10 %, 20-60, tous sports *(handoff)* | 427 (45 %) | 12,6 min | 34 min | 165/258 |
| 12 %, 25-60, tous sports | 340 (36 %) | 8,5 min | 28 min | 154/258 |
| 15 %, 25-60, tous sports | 194 (21 %) | 7,2 min | 19 min | 95/258 |
| 10 %, 20-60, impact seulement | 132 (14 %) | 13,1 min | 34 min | 0/258 |
| **12 %, 25-60, impact seulement** ✅ | **86 (9 %)** | **11,5 min** | **28 min** | **0/258** |

**Retenu** : `clamp(0,12 × minutes_hebdo, 25, 60)`, appliqué aux **disciplines d'impact**
(`run`, `trail`, `duathlon`). Les modulations existantes (historique / débutant / blessure)
s'appliquent ensuite multiplicativement, inchangées.

**Motif** : la concentration sur la nage était un **artefact de classification**, pas une intention
physiologique. `sw.css` figure dans `HARD_SUFFIX`, donc une série au CSS compte intégralement comme
temps dur — ce qui est défendable en soi (c'est du seuil), mais 48 min de seuil en bassin ne coûtent
pas ce que coûtent 48 min de seuil en course. Un plafond discipline-aveugle traitait les deux à
l'identique. Le ticket est motivé par la contrainte mécanique ; il s'applique donc là où elle existe.

**Conséquence de conception, à assumer explicitement** : cela introduit dans C26 une notion de
**discipline d'impact** que la règle n'avait pas. Elle doit être déclarée par `rule()` avec son
`why`, et non écrite en dur dans une condition — sinon on crée exactement le littéral non documenté
que ce lot passe son temps à débusquer. Elle recoupe `runImpactCap` (déjà déclaré par `run`, `trail`
et `duathlon`) : **la lire depuis les guards existants plutôt que d'écrire une seconde liste de
sports** est la seule écriture acceptable (R11.1).

---

## Décisions de conduite du lot (13/08)

| Sujet | Retenu |
|---|---|
| Branche | `fix/moteur-physio`, créée depuis la branche design (autorisation explicite) |
| Golden master | **Figé** pendant tout le lot ; chaque ticket B produit son `diffs/B-XX.md` ; une seule recapture en fin de lot |
| B-16 (T3) | **Réduit** à la mesure du cas de bord de semaine — la règle est appliquée (V-01) |
| `capacityProbe` | **Retirer** le flag (V-02 : mort, et le câbler désactiverait la sonde pour 5 sports) |
