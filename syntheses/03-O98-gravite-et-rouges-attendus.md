# O-98 : la gravité tranchée · et l'audit des rouges attendus

**Commit** `70d5ce0` · 21/08/2026 · **mesures seules, moteur byte-identique**
**Questions du fondateur** : *« les 30 semaines à zéro sont-elles isolées ou consécutives ? Une
semaine sans vélo est un accident, trois de suite sans nage sur un 70.3 est un trou. C'est le seul
point qui décide de la gravité. »* · *« combien des 25 rouges attendus portent un compte non
épinglé ? T-58 a doublé en silence ; s'il n'était pas le seul, d'autres dérivent depuis leur
écriture. »*

---

## 1. O-98 — deux populations, une seule est un trou

Compté en semaines **CALENDAIRES** : une semaine de récup à zéro ne rompt pas le jeûne. C'est le
temps réellement passé sans toucher la discipline, pas un compte de semaines de charge.

```
COURSE    8 semaines · UN SEUL profil (G/tri/Full/vol-min, 3 séances/sem)
          S2, 6, 10, 12, 14, 16, 18, 20 — JAMAIS deux de suite (plus longue suite : 1)
          → un accident, au sens exact du mot

VÉLO      0 semaine de charge
          les zéros vélo du corpus sont TOUS en semaine de récup
          → n'existe pas

NAGE      22 semaines · 14 profils · TOUTES au DÉBUT (S1-S3) · tous DÉBUTANTS · formats S et M
            4 semaines d'affilée dès S1   B17/tri/S/debutant/inconnue
            4 semaines d'affilée dès S1   B17/tri/S/debutant/absente
            3 semaines d'affilée dès S1   tri/S/ancien/debutant/competition
            2 semaines d'affilée dès S1   ×2        1 semaine  ×9
          → un trou
```

**Ton critère tranche dans les deux sens, et pas là où on l'attendait.**

### Le cas nage est pire que la formulation de la question

Ce n'est pas « trois de suite sur un 70.3 » : c'est **systématiquement les trois ou quatre
PREMIÈRES semaines**, chez le débutant, sur un format court. Et la population est la pire
possible — les deux profils à 4 semaines sont ceux dont la continuité de nage est déclarée
**« inconnue »** ou **« absente »**.

Le plan livré à `B17/tri/S/debutant/inconnue` :

```
S1  Sweetspot vélo 54' · Force basse cadence 41' · Sortie longue CAP 30' · Footing facile 25'
S2  idem
S3  Tempo vélo 49' · Sweetspot vélo 58' · Sortie longue CAP 30'
S4  (récup) 3 × Footing facile 16'
S5  … · Nage continue en EAU LIBRE — 500 m d'affilée
```

**La première séance de natation que voit cet athlète est un 500 m continu en eau libre, en
semaine 5.** La décision `B17-paliers` annonce « 1 test (fin de développement) + 2 paliers en phase
spécifique » — le test est bien posé, **rien ne le précède**. Celui qui a répondu « je ne sais pas
si je sais nager » ne nage pas pendant un mois, puis part en eau libre.

### Conséquence : la gravité d'O-98 monte

Ce n'est pas une dispersion à corriger au fil de l'eau, c'est une **entrée de plan** à revoir pour
une population nommée (débutant × format court × continuité inconnue). Elle touche la priorité 2 du
manifeste (prévention) autant que la priorité 3 (régularité).

**Le correctif est en AMONT de l'allocation** — dans ce que B-17 pose AVANT son test —, donc hors
du lot plancher. Cliquet posé à 30 : le compte ne peut plus monter.

---

## 2. Les rouges attendus — deux questions qui ne se répondent pas pareil

### (a) Combien de tickets écrivent un chiffre qui pourrait être FAUX ? **Trois sur vingt-cinq**

Et ce sont les trois écrits dans les deux derniers jours : `T-58`, `T-59`, `T-60`.

Les vingt-deux autres nomment leur ticket de fermeture en prose, sans compte. Les seuls chiffres
qu'ils portent ne sont pas des comptes :

| ticket | chiffre | ce que c'est |
|---|---|---|
| `T-04` | 25-60 | les bornes du clamp de la règle |
| `T-13` | 2014 | l'année de la citation (Lauersen) |
| `T-25` | 18 min | un renvoi au DOC_UNIQUE §0 |
| `T-22` | 416 | une mesure **historique et datée** (ce que B-26 avait chiffré) |
| `T-21`, `O-39`, `T-30` | 6, 2, 3 | des renvois de section |

**`T-58` était donc bien le seul à être devenu faux, et pour une raison simple : il était le seul
ancien ticket à citer un compte.** Vérifié : `T-59` (5/104) et `T-60` (30) correspondent à leur
mesure du jour.

### (b) Combien de TESTS rendent un compte que rien ne borne ? **Vingt-trois sur vingt-cinq**

Seuls `T-58` et `T-60` portent un cliquet. Les autres publient un nombre qui peut doubler sans que
rien ne le dise — et ce ne sont pas de petits nombres :

```
T-03  146 semaines au-dessus du plafond      T-25  505 identités cassées / 986
T-05   28 semaines                           T-23   81 écrans / 214
T-13   28 plans sans renforcement            T-21   29 littéraux à unité
T-10   41/41 entrées sans sensibilité        T-22   14 steps sans zone
T-12    9/58 prédictions sans fourchette     T-14   18/921 séances
```

### Les deux problèmes n'ont pas la même gravité

```
un chiffre PÉRIMÉ     rend un document FAUX
                      → un lecteur en tire une décision
                      → c'est ce qui est arrivé avec les « 2 plans sur 68 »

un compte NON ÉPINGLÉ ne rend rien faux
                      → il rend la dérive INVISIBLE
                      → le banc ne compare que le ROUGE au ROUGE, donc T-03 pourrait
                        passer de 146 à 300 sans qu'une seule sortie change de caractère
```

### Le mécanisme qui fermerait la classe — écrit, non fait

Règle du dépôt : *« une règle qui échoue trois fois n'est pas une règle mal écrite, c'est un
MÉCANISME manquant. »*

```
chaque test attendu rouge DÉCLARE son compte      return { ok, detail, compte }
le banc le compare à une table épinglée
une dérive se RE-ÉPINGLE avec sa cause            comme SCEAU_ATTENDU ou PIC_ATTENDU
```

**Coût** : 23 retours de test à compléter, mécaniques.
**Conséquence** : tout lot qui déplace un compte de dette devra le re-épingler, c'est-à-dire
l'expliquer.

**Non fait dans ce lot** : ça change ce qui rend la CI rouge, et c'est une décision, pas un réglage.

---

## Gates

`batterie` 11/11 · `lotPhysio` 31 verts · 25 rouges attendus · 0 régression.
