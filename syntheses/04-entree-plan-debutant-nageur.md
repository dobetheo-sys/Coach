# L'entrée de plan du débutant nageur — les 22 semaines sans nage fermées, le test en S1 arrêté

**Commit** `cc8f3a2` · 21/08/2026 · **arbitrage** `ENTREE_PLAN_DEBUTANT.md`
**Livré** : le §3 (la mesure) **et son correctif** · **§2a ÉCRIT, MESURÉ, RETIRÉ** — il viole C22.
Patch conservé dans `b17-test-en-semaine-1.patch`.

Ordre demandé : 1. le test en SEMAINE 1 et en PISCINE · 2. la mesure du §3 · 3. le cliquet sur les
23 comptes. *« Le 1 avant tout : il est en production, sur une population que le ticket de sécurité
existe pour protéger. »* — **le 1 s'est révélé dépendre du 2, et le 2 a suffi à fermer la sécurité.**

---

## 1. Ta question du §2b : ni l'un ni l'autre

> *« La séance de S5 est-elle le test, ou le premier palier d'eau libre qui a absorbé le test ? »*

**Le test n'était posé NULLE PART.**

```
B17/tri/S/debutant/inconnue — toutes les nages du plan, avant le lot
  S5  Nage continue en EAU LIBRE — 500 m d'affilée      ← 1er palier, pas le test
  S6  Nage continue — 500 m d'affilée
  décision B17-paliers : « 1 test (fin de développement) + 2 palier(s) »
```

`palierLayout` posait le test à `dev.end` — une position **CALENDAIRE**. Sur ce profil, `dev.end`
est **la semaine de récup**, dont les créneaux sont trois footings : aucun créneau de nage, donc
aucun test. Le plan annonçait la mesure et ne la demandait jamais ; le S5 portait la consigne
« eau libre » parce que le test était censé le précéder.

---

## 2. Le §3 : aucune des trois hypothèses, c'en est une quatrième

Ton §3 listait trois suspects — budget serré · base généraliste · mécanisme de comptage — et
pariait sur le troisième. **Aucun des trois.** Le schéma générique de semaine POSE bien un
`facile2` (le créneau de nage) en base. Ce sont **deux passes** qui l'éteignent, et la première
porte un nom qui dit ce qu'elle fait :

```
S1  recup · dur1 · OFF(la semaine de pic reste la plus grosse) · dur2 · OFF(fréquence nage) · durLong · facileR
```

**(a) `OFF (fréquence nage)`** — la coupe qui absorbe le gonflement du plancher piscine (C24).
Quand les remontées font déborder la semaine, elle rend des mètres, puis **retire une séance
entière**, sous ce commentaire : *« une séance piscine sous le plancher ne vaut pas le
déplacement : la fréquence cède, pas la taille »*.

**(b) le repli « dev ≤ pic »** — il élit un jour à éteindre pour que le développement ne dépasse
pas le pic, et il prenait le seul créneau de nage des deux premières semaines.

### ⚠ Le fichier se contredit lui-même

```
planGenerator.ts:493    « La FRÉQUENCE n'est jamais la monnaie […] retirer une séance de nage
                          pour tenir une borne de volume serait la prédiction du 19/08 — la nage
                          est la victime par défaut — commise par la garde censée la protéger. »

planGenerator.ts:3213   « une séance piscine sous le plancher ne vaut pas le déplacement :
                          la fréquence cède, pas la taille »
```

Deux règles opposées sur la même discipline, dans le même fichier, **et c'est la seconde qui
s'exécutait**.

---

## 3. Le correctif existait déjà, dix lignes plus haut

La branche **DÉCHARGE** de la même passe porte exactement la garde qui manquait —
`if (restants <= 1) continue` — sous un commentaire qui en énonce la raison : *« un affûtage sans
une seule séance n'affûte rien, il désentraîne »*. Elle n'avait **jamais été rejouée sur la branche
de CHARGE**. La forme la plus familière de ce dépôt : une garde écrite sur une branche et absente
de sa sœur.

Les deux passes consultent désormais le niveau **ZÉRO** du plancher de fréquence
(`seancesDiscipline`, le point unique posé la veille). Dans le repli, la garde a la **même forme**
que `porteEpingle` qui la précède : *épargné tant qu'une autre victime existe ; seul candidat → on
s'arrête*. La liste des disciplines n'est pas écrite : elle est **DÉRIVÉE** de ce que la semaine
porte, donc elle vaut pour les sept sports sans qu'aucun soit nommé.

```
O-98         30 → 8 semaines de charge à zéro
la nage      22 → 0
la course     8 → 8    isolées, G/tri/Full/vol-min, jamais deux de suite — ton « accident »
```

**Contre-prouvé dans les deux sens, sur le corpus** : coupe piscine dé-gardée → **21** · repli
dé-gardé → **14**. Cliquet `T-60` descendu de 30 à **8** dans le même commit — *un cliquet qui ne
descend pas avec son correctif ne protège pas le gain*.

Le profil le plus exposé nage désormais **dès la semaine 1** (S1, S2, S3, puis la spec), au lieu de
quatre semaines sèches.

---

## 4. ⛔ Le §2a est ARRÊTÉ : déplacer le test en semaine 1 viole C22

Écrit intégralement — le test devient la première séance de nage du plan via un fait dérivé
(`premierDuSlot`, calculé par `weekBuilder`), `palierLayout` perd sa position calendaire, l'annonce
suit, `T-06` réécrit sur la propriété. **Et il marche** :

```
S1  Test de continuité — aussi loin que possible, sans t'arrêter    EN BASSIN
S2  Nage éducatifs          S3  Nage éducatifs
S5  Nage continue en eau libre — 600 m     S6  Nage continue — 750 m
annonce : « 1 test (première séance de nage) + 2 palier(s) en phase spécifique »
```

**Mais il casse `D3` du banc v6 — C22, violation DURE du manifeste :**

```
tri/S(8sem)  S4→S5  déclaré +22 % / prescrit +22 %  → courbe
```

Attribué par **bisection par fichier** : la cause est le couple `swimContinuity` + `tri/index`,
**pas** les gardes du plancher (celles-ci laissent la courbe plate : 7 % · 2 % · −0 % · 1 % · −0 %).
Et ce n'est **pas** la taille des paliers — la variante `nProgression = n` casse aussi (+20 %).

**La courbe DÉCLARÉE elle-même change** :

```
S3   3,80 h  →  2,40 h
S7   footings + nages  →  bricks + une journée « semaine de récupération »
```

Poser le test dans la phase de **BASE** reshape le plan bien au-delà de la natation.

### Trois issues, non tranchées

```
(a) poser le test HORS de la courbe de volume (une séance qui ne compte pas dans la semaine)
(b) le poser à la première semaine de DEV plutôt que de BASE — à mesurer, C22 peut tenir
(c) garder O-95 (fin de dev) et corriger sa SEULE faute : que la position soit un CRÉNEAU DE
    NAGE existant et non un numéro de semaine
```

**(c) est la plus petite** : elle ferme le défaut réel du §2b — le test jamais posé — sans toucher
la courbe. Elle n'a pas été essayée dans ce lot.

⚠ **Ce qui reste ouvert en production** : sur ces profils, le test annoncé n'est toujours pas posé,
et la première nage reste un palier en eau libre. **Les quatre semaines sèches, elles, sont
fermées** — c'est la moitié du §1 de l'arbitrage, celle qui touche la sécurité.

---

## 5. Trouvé au passage : la progression B-17 est fictive sur 4 profils

Découvert en mesurant le rayon du §2a sur `T-39` (blocs épinglés rabotés). Sur
`B17/tri/{70.3,Full}/debutant/{absente,inconnue}` :

```
palier annoncé   800 m  ·  1350 m  ·  2250 m
palier livré     500 m  ·   500 m  ·   500 m
```

Le plafond de séance de nage (`swimSessionCapAtWeek`, une borne de **capacité**) les rabat tous. La
progression que B-17 annonce n'est **jamais construite**, et D2 (« le dernier palier vaut
EXACTEMENT la distance de course ») est faux là aussi.

**Défaut PRÉEXISTANT** — même motif, mêmes 4 profils, avant comme après le §2a (12 nouveaux,
8 disparus, net +4). L'arbitrage : soit le plafond gagne et l'**annonce** se borne à lui, soit la
progression gagne et le plafond cède — et un plafond de sécurité ne cède pas. Donc l'annonce doit
dire ce qu'elle va livrer, et si la continuité de course est hors d'atteinte, le **dire** (O-17).
Ouvert, non tranché.

---

## Gates

`batterie` 11/11 · `lotPhysio` 31 verts · 25 rouges attendus · 0 régression · `audit:v1` 459 à 0 ·
golden **990 recapturé** (14 profils, tous débutants tri, plus grand écart numérique 14) ·
`sw.js` `eb-pwa-78d9dc04b2e8` · E2E 25/25.

**Ce qui n'a pas été fait** : le point 3 de ton ordre (le cliquet sur les 23 comptes, dérive à la
baisse tolérée). Le point 1 a consommé le lot.
