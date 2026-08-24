# 15 — La vérification du §2 confirme « permanent », la spec est écrite, et deux gates dépendaient du jour

**Date** : 24/08/2026 · **Instruments** : `npm run mesure:cycle10` §5 (nouveau) + sonde VO2/phase
**Écrit dans le moteur** : la spec du cycle (COMMENTAIRE, aucune ligne de comportement).
**Gates** : `npm run batterie` **11/11 verts**.

---

## 1. Ta vérification du §2 — décision CONFIRMÉE, et plus fortement que tu ne l'espérais

Tu posais : *« si la base porte du dur au-dessus du seuil sur plusieurs créneaux, l'argument par
phase revient »*. Mesuré sur **986 plans · 14 499 semaines de charge** — pas sur quatre
fixtures :

| phase | semaines qui portent du VO2max | VO2 en % du volume | part de dur |
|---|---|---|---|
| **base** | **0,0 %** | **0,00 %** | **3,9 %** |
| dev | 70,2 % | 6,29 % | 6,6 % |
| spec | 77,0 % | 5,11 % | 7,9 % |
| peak | 58,9 % | 3,82 % | 7,1 % |

**Aucune semaine de base ne porte un seul VO2max, sur tout le corpus.** Et la part de dur
double de la base au spécifique. **La périodisation de l'intensité existe déjà et elle est
propre** — donc `permanent + contenu par phase` tient, et la borne que tu proposais d'écrire
(*« aucun créneau clé de la base ne porte d'intensité au-dessus du seuil »*) **est déjà tenue,
sans être écrite**. Je ne l'ai pas ajoutée : une règle qui n'a rien à corriger est une règle
qui ment sur son utilité.

### ⚠ Une lecture par créneau aurait dit l'inverse

La même mesure, comptée **par créneau clé** au lieu d'en minutes, donne « base : 35 à 40 % de
créneaux DUR » sur trois des quatre bases — et le contenu est « Seuil progressif » et « Nage
seuil ». **Deux unités, deux lectures** : 36 % des créneaux, 3,9 % des minutes. Ce que la base
porte est du **seuil**, pas du VO2max — c'est-à-dire exactement ce qu'une base doit porter.
C'est le corollaire du dénominateur, et j'ai failli publier le mauvais chiffre.

---

## 2. Point 6 — la spec est écrite dans le moteur

Un bloc de 56 lignes au-dessus de `schema()` dans `weekBuilder.ts`. Il porte, dans l'ordre :

- **l'avertissement** : les trois motifs qui entourent ce cycle disent *« répartir »* et
  *« espacer »*, l'inverse de son intention — c'est la raison d'être du bloc ;
- **l'intention** : structure d'**intensification**, cinq clés sans jamais deux consécutives,
  et pourquoi sept jours ne le permettent pas ;
- **la densité permanente + le contenu par phase**, avec les chiffres du §1 ci-dessus ;
- **la séquence visée contre la séquence déclarée**, position par position, et les trois écarts
  (`j5`, l'OFF, la seconde récup) ;
- **l'écart mesuré**, pour qu'il n'ait pas à être re-diagnostiqué : 4,00 déclarés / 3,50 livrés,
  77-82 % de livraison contre 100 % pour le schéma de 7 ;
- **le sens de `dur`** : séance CLÉ, avec les 76,2 / 45,9 / 0,0 % — et la consigne explicite que
  `dur2` et `durLong` **ne doivent pas** livrer du VO2max ;
- **l'ordre du lot arbitré**.

**Ce que je n'ai PAS touché, délibérément** : les trois motifs visibles par l'athlète
(`answerSchema`, la décision `cycle`, l'avertissement de couverture). Les corriger aujourd'hui
écrirait que le cycle intensifie — **et il ne le fait pas encore** (3,50 clés/10 j contre 4,29
pour le schéma de 7). Ils deviennent vrais quand le lot atterrit, pas avant. Le bloc de spec dit
qu'ils sont faux et pourquoi : le prochain lecteur ne peut plus s'y tromper.

---

## 3. ⚠ Deux gates étaient rouges sur `main` AVANT ce lot — et pour la même raison

Ma modification est un **commentaire** (`git diff` : 56 insertions, zéro ligne de comportement).
La batterie est pourtant sortie à **3 rouges**. Attribution par expérience contrôlée — remisé,
rebuild, re-run : **les rouges sont sur `main` pur.** Aujourd'hui est un **lundi**.

**a) `golden:verify` — 1 écart sur 990, le profil `REEL`.** Sa course est absolue
(`2027-06-07`) mais **son départ ne l'était pas** : sans `plan_start`, le moteur démarre au
lundi courant, donc la préparation raccourcit d'une semaine **chaque lundi** et le plan change.
C'est le défaut que la passe « course datée » avait fermé pour les autres (N2) et que cette
fixture, ajoutée après (O-85 §2), n'avait jamais reçu. `plan_start` épinglé au 17/08/2026 :
**990/990, 0 écart — sans aucune recapture.** La photo était juste ; c'est la fixture qui
dérivait. `lotPhysio` T-60 tombait avec elle, pour la même cause.

**b) `audit:v6` `R23.18-D` — septième occurrence de la famille R20.7 / A-6.** `isoIn(days)`
partait de `Date.now()` : le JOUR DE SEMAINE de la course fabriquée changeait donc chaque jour.
A-6 avait ancré cinq bancs par `bench-dates.cjs` ; celui-ci y avait échappé **parce que ses
dates étaient déjà relatives — à la mauvaise origine.** `isoIn` part désormais du lundi courant,
et le critère pose sa course **explicitement un mercredi** — la fixture qu'il DÉCRIT depuis son
écriture. Ce n'est pas déplacer le poteau : c'est cesser de le laisser bouger.

### Et le lundi cachait un vrai défaut — O-104

Balayé sur les sept jours, profil identique, `use10 = true` :

```
course lundi     semaine avant l'A−   86 min      ✖
course mardi                         220 min      ✔
course samedi                        543 min      ✔
```

**Un facteur six sur le volume d'une semaine, pour un athlète identique, selon le seul jour de
course.** Même cause qu'O-103 : un cycle de 10 découpé en semaines de 7 rend des semaines dont
le contenu dépend de la phase du cycle au moment de la coupe — et le jour J fixe cette phase,
puisque le plan s'arrête au soir de la course (N2). La « semaine » étant l'unité que l'athlète
voit et que C22 mesure, une semaine à 86 min n'est pas une récupération décidée : c'est un
résidu de découpe. **Ouvert en O-104, à traiter AVEC O-103.**

---

## 4. Où en est le lot

| # | pièce | état |
|---|---|---|
| 1 | permanent + contenu par phase | **tranché et VÉRIFIÉ** — la base est à 0,0 % de VO2max |
| **6** | la séquence et son intention au dépôt | **✅ LIVRÉ** (spec dans `weekBuilder.ts`) |
| 2 | **O-103** — le cycle livre ce qu'il déclare | **prêt à écrire**, et O-104 s'y rattache |
| 3 | `j5` → `dur1` | après O-103 |
| 4 | l'OFF du schéma de 10 | après |
| 5 | la condition d'activation lit le niveau | après |

**Prochaine pièce : O-103 + O-104**, la cause commune étant le chevauchement cycle/calendrier.
Ton avertissement est retenu : *« le correctif ne peut pas être local à `j7` »*.

---

## Vérifications

```
npm run batterie      11/11 verts (audit:v1 · invariants · v6 74 verts 0 régression · v7 ·
                      r13 · r14 · r14.1 · r18 · golden:verify 990/990 0 écart ·
                      golden:bundle · lotPhysio)
build:app + build:sw  refaits — sw.js eb-pwa-55d6cb74fa9d
src/                  56 lignes de COMMENTAIRE, zéro ligne de comportement
```
