# RELECTURE COMPLÈTE DU PLAN REEL — le livrable d'O88_ET_RELECTURE §3

**Date : 19/08/2026 · moteur : celui du commit O-88 · profil : `REEL/tri/70.3/nage-limitante`**

> **P.S. (même jour, lot O-89/O-93)** — les chiffres de ce rapport décrivent le moteur AU MOMENT
> de la relecture ; le lot suivant (O-89 : la borne d'épaule cliquette sur le livré · O-93 :
> l'inversion des décharges fermée) a changé quatre d'entre eux, et les annexes `relecture/`
> sont régénérées sur le moteur courant : répartition nage 44,3 → 45,5 % · vélo 28,6 → 27,4 %
> (couvertures de récup clampées) · semaines assises sur la borne 27 → 16 · couverture vélo en
> récup 225' → 112' · sortie longue de récup 85' → 66'. Les §3.B (inversions récup/charge) sont
> FERMÉS par O-93 ; le §3.F est FERMÉ par O-89. Détail : `BUGS_OUVERTS.md`.

> **P.S. n°2 (même jour, « V2.1 reçoit la borne »)** — la sonde de construction compte désormais
> la borne d'épaule : la cible de boucle descend de 13,0 à 9,7 h et le manque de 3,4 h/sem que ce
> rapport documentait N'EXISTE PLUS (il a servi : c'est sa déclaration qui a permis l'arbitrage).
> Les annexes `relecture/` sont régénérées sur le moteur courant : total 310,7 → **300,0 h** ·
> volPeak 9,6 → **9,4** · répartition nage 45,5 → **42,4 %** · vélo **28,6 %** · course
> **29,0 %** · semaines assises sur la borne 16 → **4**. Un fait nouveau, rapporté sans ajustement
> (§2 de l'arbitrage) : le max de charge quitte la dernière semaine (S40 9,4 → S37 9,1 h).
> Détail : `BUGS_OUVERTS.md` « V2.1 REÇOIT LA BORNE ».

> **P.S. n°3 (20/08/2026, LOT VOLUME + RÉPARTITION)** — le lot A·B·C a changé la FORME du plan que
> ce rapport décrit, et les annexes `relecture/` sont régénérées dessus. Ce qui bouge : total
> **300 → 357 h** · pic **9,4 → 11,2 h** · répartition **vélo 28,6 → 40,3 % · course 29,0 → 31,8 %
> · nage 42,4 → 27,9 %** · une **sortie longue vélo** existe enfin hors brick (5 × 201', §3 de ce
> rapport) · la **sortie longue à pied** ne s'arrête plus à S22 (O-91, la conséquence est fermée) ·
> le sweetspot passe devant la force basse cadence (16 contre 10). Ce qui NE bouge pas : le maillon
> qui borne reste « le nombre de séances ». Détail et critères de sortie :
> `BUGS_OUVERTS.md` « LOT VOLUME + RÉPARTITION ».

Le plan complet est en annexe, dans les deux formes demandées :

```
relecture/REEL-plan.json         le plan tel que le moteur le rend (43 semaines, séances, steps)
relecture/REEL-plan-rendu.txt    le rendu texte intégral, semaine par semaine, avec les det
```

**Méthode.** Le plan est généré depuis la fixture golden `REEL` (bridge → `EBV2.buildPlan`),
lu INTÉGRALEMENT — par moi et par quatre lecteurs indépendants (un quadrant de semaines chacun,
consigne « défendre chaque séance comme un entraîneur ») — puis **chaque constat d'un lecteur a
été contre-vérifié sur le texte livré avant d'entrer ici**. Un constat a été REJETÉ à cette
étape : « le jour J ne porte ni temps prédits ni pacing » — faux, la ligne `⏱ Prévu : … Total
estimé 5h33–6h04` est présente et le pacing aussi (l'agent avait lu un det tronqué). Deux
détails d'agents corrigés : « seule semaine sans repos » (il y en a 9) et « 575/675 m non
réalisables » (multiples de 25, réalisables — seuls 738 et 894 ne le sont pas).

**⚠ La réserve du §4 d'O88_ET_RELECTURE tient toujours, et elle s'est ÉLARGIE.** La fixture est
reconstituée, pas relevée. `longest_swim_m` (1 000 m) et `milieu` restent à relever — et la
relecture a trouvé une TROISIÈME clé à relever : **`history`** (voir §5 : les deux exports du
fondateur divergent exactement comme `confirme` ↔ `ancien`, et cette clé décide du plafond de
secours 13 h ↔ 15 h, le budget de l'allocation).

---

## §1 — Le plan en chiffres

**310,7 h sur 43 semaines · volPeak 9,6 h · 20 types de séance.**

Répartition par discipline, legs de brick attribués à leur discipline :

```
            livré      épreuve (part du temps de course d'un 70.3)
  nage      44,3 %     ~12 %
  vélo      28,6 %     ~52 %
  course    27,1 %     ~36 %
```

Le constat d'allocation de la dernière lecture intégrale (« vélo à 22 % pour 52 % de la
course ») **tient toujours** : le vélo a gagné ~6 points (bricks R20.5, VO2 maintenu au pic),
la nage en a gagné autant — l'inversion nage ↔ vélo est intacte. C'est le chantier « allocation »
de la file (§5 d'O88_ET_RELECTURE, étape 4), à statuer dans le budget du §5 ci-dessous.

Comptage par type (durées et distances = bornes observées sur le livré) :

```
 94× Footing facile                    19-46 min            semaines 1-41
 61× Nage récup courte                 22-60 min · 950-2625 m   semaines 1-42
 43× Nage aérobie + accélérations      16-181 min · 750-8425 m  semaines 1-40
 29× Nage seuil (+dist)                41-68 min · 2000-3275 m  semaines 1-42
 18× Force basse cadence               76-94 min            semaines 1-24
 15× Allure course (tri)               38-68 min            semaines 25-40
 14× VO2max vélo                       49-70 min            semaines 15-39
 12× Sortie longue CAP                 62-85 min            semaines 2-22   ← s'arrête à S22
 11× Brick vélo+CAP                    106-201 min          semaines 25-40
  8× Sweetspot vélo                    77-96 min            semaines 1-13
  3× Endurance vélo (couverture)       156-225 min          semaines 5-28   ← toutes en récup
  3× Nage continue (paliers B-17)      1250 · 1550 · 1900 m d'affilée   S25 · S31 · S36
  6× affûtage + jour J                 (détail en annexe)
```

---

## §2 — B-17 sur REEL : les trois cases du document

```
[✓] combien de nages continues ?             TROIS — annoncées 3 (décision B17-paliers),
                                             livrées 3 : REEL n'est PAS dans les 29 d'O-84
[✓] montent-elles vers 1 900 m ?             1 250 → 1 550 → 1 900 : la montée atteint la
                                             distance de course (S36, à 7 semaines du départ)
[✓] une continue en EAU LIBRE, placée TÔT ?  OUI — la PREMIÈRE (S25) est en eau libre, et
                                             S25 est la première semaine de phase spécifique
```

Le message « ton plan peut construire la distance, pas le milieu » est dans les warnings
(gardé par T-54), et l'avertissement « NE PRENDS PAS LE DÉPART avant d'avoir fait cette nage
continue » aussi. L'export `_2` (plus ancien) ne montrait que 2 continues : c'était le moteur
d'avant — le moteur actuel en livre 3 sur ce profil. **O-84 reste ouvert pour les 29 profils
qui livrent N−1.**

---

## §3 — Ce que la relecture trouve (chaque ligne vérifiée sur le livré)

### A. La nage est ASSISE sur sa borne O-85, et le surplus a coulé sa qualité

**27 semaines sur 43 livrent la nage exactement à la borne de charge d'épaule** (7 588 m pour
7 600 en S1-S4, puis 11 375-11 400 m pour 11 400 dès S8). La borne tient — c'est le surplus
structurel (O-43 §2 : le volume non plaçable) qui appuie dessus en continu. Conséquences :

- **La plus grosse séance du plan est une nage « aérobie » de 181 min / 8 425 m** (S33 J7),
  soit ×4,4 la distance de course — suivie le MÊME JOUR de 65 min d'allure course : une
  journée à 4 h 06. Le même motif (nage 2 h + allure course le même jour) revient en S25, S26,
  S30, S36, S40. C'est le déversoir d'O-78 au niveau séance, intact — les bornes de séance
  sont APRÈS le plafond structurel dans la file, par décision explicite.
- **Six semaines de CHARGE n'ont AUCUNE nage au seuil** (S10, S16, S20, S30, S33, S40 — dont
  les deux dernières grosses semaines avant l'affûtage), pendant que la nage y est au plafond
  (237-252 min). S10 : 252 min de natation sans un mètre au CSS. **La discipline limitante
  sature son volume et perd sa qualité** — O-74 (vu en `reprise`) vaut aussi chez `confirme`.
- **« Nage récup courte » vaut 2 625 m / 60 min** (61 occurrences, builder ≤ 1 100 m — ×2,4),
  identique en charge, en récup ET en affûtage (2 425 m en S42) : le nom ment (famille O-79)
  et la « récup » est plus longue que la nage seuil de la même semaine. S28 et S34 en portent
  DEUX à TROIS chacune.
- Le créneau « aérobie + accélérations » oscille sans logique : 400 m (S7) → 4 700 (S8) →
  400 (S14 J3, à côté d'un 2 500 le J7 de la même semaine) → 8 075 (S33). Et sa forme 400 m =
  16 min dont 450 m d'enrobage : **l'échauffement + retour dépasse le corps** — un déplacement
  à la piscine pour 400 m utiles (S1, S4×2, S7×2, S14, S24, S27, S37).

### B. Les DÉCHARGES portent des doses plus grosses que les charges (inversion mesurée)

```
  VO2max vélo      6×4 min en RÉCUP (S23, S29)   ·   5×4 min en charge (S25, S31)
  Nage seuil       1 625 m au CSS en RÉCUP (S29) ·   1 275-1 575 m dans les charges voisines
  Sweetspot        4×14 min en RÉCUP (S6)        ·   4×13 min en charge (S3)
  Sortie longue    85 min en RÉCUP (S22)         ·   ≤ 82 min dans toutes les charges
  Nage totale      S34 (récup) : 180 min — plus que S38 et S39, semaines de PIC
```

Mécanisme probable (à confirmer par expérience contrôlée avant tout correctif) : les semaines
de charge sont COMPRIMÉES par le budget de séances + le déversoir, les décharges ont moins de
séances donc moins de compression — les doses de qualité y restent à leur taille de naissance.
S28-S29 : deux récups CONSÉCUTIVES en pleine phase spécifique, la seconde portant nage seuil +
VO2max + allure course — quatre séances de qualité dans une semaine étiquetée récup.

### C. Le vélo n'a de volume qu'en DÉCHARGE, et la couverture tire au mauvais endroit

- Les trois seules sorties d'endurance vélo du plan (156, 200, 225 min — les plus longues
  séances vélo du plan hors brick) vivent **toutes dans des semaines de RÉCUP** (S5, S22,
  S28). En S28, la sortie de 225 min = 56 % du volume de la semaine de « récup ».
- La garantie R4.6 (« au moins une séance de vélo par semaine ») se déclenche en récup avec
  une séance démesurée — et **ne se déclenche PAS** dans les semaines de charge S27, S30, S33,
  S37, S40 livrées à 0 min de vélo dédié, parce que le brick y compte comme séance vélo. La
  garantie protège la lettre (une séance existe), le plan perd l'esprit (le vélo n'existe pas
  en charge hors brick).
- S41 (récup) + S42 (affûtage) : entre le dernier brick (S40) et la course, **52 min de vélo
  au total** pour un segment de 90 km.

### D. La course à pied longue S'ARRÊTE à la semaine 22

- **La dernière « Sortie longue CAP » du plan est en S22 (85 min).** Sur les 20 dernières
  semaines — spécifique, pic, affûtage — aucune course ne dépasse 68 min (45 utiles), hors les
  23-30 min de CAP en fin de brick. Pour une épreuve qui FINIT par un semi-marathon. En base,
  elle plafonne à 82-85 min sans progression (82·82·70·76·62·82) et manque des semaines 1, 4,
  6, 8. C30/C30b ne couvrent que la course SÈCHE — le leg course du tri n'a pas d'équivalent.
- La qualité course n'existe qu'à partir de S25 (« Allure course (tri) », phase spec) : **24
  semaines sans une minute de course au-dessus de 5'27/km** pour un seuil déclaré à 4'42.
- Un footing de **19 min** est livré en S39 (semaine de PIC), sous le plancher de dignité de
  30 min que `blockBounds` impose partout — quelque chose coupe APRÈS lui.
- L'« allure course » (5'19-5'34/km) chevauche la bande du footing (5'27-5'55) : cohérent avec
  la prédiction (semi en 1h50-2h00), mais la séance clé se distingue à peine du footing à l'œil.

### E. La structure des JOURS concentre au lieu de répartir

- **9 semaines de charge sans AUCUN jour OFF** : S1 (la semaine de REPRISE de la rampe O-69 —
  l'inverse de la prudence), S4, S7, S14, S21, S24, S27, S31, S37 (10 séances en S1, S21, S31).
- **S38 (pic) : trois jours durs consécutifs** — J1 nage seuil + VO2max vélo, J2 allure
  course, J3 brick de 181 min. Aucun jour d'absorption.
- S33 : 9 h tenues en 6 séances — un jour à 4 h, un brick de 152, puis DEUX OFF consécutifs.
- Doublons systématiques : 4 footings identiques au caractère près dans la même semaine (S1,
  S21, S24, S31…), « Nage récup courte » ×2-3 par semaine, souvent sur jours consécutifs.
- J-2 de la course porte 92 min en deux séances (58' nage + 34' rappel CAP). C28b plafonne PAR
  SÉANCE (62 min) — conforme à la règle écrite ; **question** : sous `doubles`, le plafond
  d'approche doit-il compter par JOUR ?

### F. O-89 — la borne O-85 lit une PROJECTION que le même plan contredit (ticket ouvert)

Le multiplicateur d'expérience de la borne d'épaule se lève avec `C22^semaine` : la continuité
PROJETÉE atteint 1 900 m dès la semaine 6, donc la bande passe de ×4 (7 600 m) à ×6 (11 400 m)
dès S8 — pendant que **les paliers B-17 du même plan prescrivent la première continue de
1 250 m en… S25**, et que la continuité MESURÉE de l'athlète est 1 000 m. Deux courbes pour la
même grandeur (famille R11.1), et la seconde moitié de la sensibilité de T-53 ne mord que sur
les premières semaines. Le plateau livré (11,4 km/sem dès S8) est à 6 % des 12,1 km que
l'arbitrage O-85 jugeait « au-dessus de la bande large ». Décision de VALEURS → fondateur
(détails et chiffres dans `BUGS_OUVERTS.md` « O-89 »).

### G. Trois textes faux corrigés en chemin (famille U9 — libellé en dur), et le cosmétique

Corrigés dans ce commit, texte seul, moteur inchangé :

1. **O-88** (§4 ci-dessous) — « la moitié en accélérations » → compte absolu.
2. La note de la couverture vélo parlait d'un plan de **DUATHLON** sur le plan de triathlon du
   fondateur, avec une causale (« ton enveloppe de jours ») qui n'est qu'un des déclencheurs.
3. La note de la veille de course disait « on réveille les JAMBES… on range les CHAUSSURES »
   sur une veille en **NATATION** (3×2 min @ 2'17/100 m) — le défaut exact que R13.4 avait
   corrigé pour la ZONE trois lignes plus haut, jamais rejoué sur la NOTE. La chute suit
   désormais la discipline.

Restent nommés, non corrigés (cosmétique ou mécanisme à part) :
- Des distances non réalisables en bassin : **738 m** (8 occurrences), **894 m** — non
  multiples de 25 ; un arrondi d'étape affiché comme consigne.
- Rendu doublé : « récup **4min récup** entre les blocs », « Retour au calme **8min retour au
  calme** » (27 occurrences) — le renderer compose le préfixe avec un texte qui le répète.
- La note d'« Allure course (tri) » promet des « jambes déjà entamées par le vélo » sur des
  jours SANS vélo (toutes les occurrences du créneau dur2 : S25, S26, S30, S33, S35, S36,
  S39, S40) — le routage des doubles ne garantit plus le contexte que la note suppose.
- La note du VO2max vélo renvoie au brick dans une semaine qui n'en porte pas (S35).
- Le jour J d'un TRIATHLON est étiqueté `d:"rn"` — sans conséquence visible ici, à garder en
  tête pour tout affichage qui dériverait un badge de discipline de ce champ.

---

## §4 — O-88 FERMÉ : le compte d'accélérations est borné en absolu

Mesuré AVANT sur ce plan : la fraction « la moitié en accélérations de 50 m » donnait **4 à 81
accélérations** selon la taille du bloc (8 075 m → 81 — pire que les 32 du constat), le maximum
tombant sur les blocs les plus longs, donc le geste le plus dégradé. Corrigé :
`O88_NB_ACCELERATIONS = 10` (fourchette 8-12 du fondateur, posée comme ordre de grandeur,
révocable), le texte devient « en 50 m accéléré / 50 m souple au début du bloc — 10
accélérations au plus, puis aérobie continu » — le début de bloc et le « au plus » viennent du
même arbitrage (geste frais, jamais sur geste dégradé) et gardent le texte cohérent sur les
blocs livrés de 400 m comme de 8 000. **Garde T-55** (banc `lotPhysio`) : aucune promesse
d'accélérations par fraction, tout compte ≤ 12, population épinglée (4 449 séances porteuses
sur 986 plans, blocs de 100 à 8 075 m — la borne est PROUVÉE exercée là où le défaut vivait).
**Contre-prouvée : fraction réintroduite → rouge · constante à 60 → rouge.**

**Balayage de la famille demandé (« d'autres comptes dérivés d'une longueur ? ») :**
- `swimrun` « Seuil CSS + plaquettes » porte la même FORME textuelle (« dont ~N % avec
  plaquettes ») mais la série est un bloc répété `repCap: 11` — **vérifié borné, pas un
  défaut**.
- Les vrais membres restants sont ceux d'O-78 : `P`/`PT` multiplient un COMPTE par
  `sessionScale` (4 copies : sessionLibrary, tri, duathlon, trailLibrary) ; sites nés sans
  `repCap` relevés en duathlon (l.41, l.44) et trail (« Descente en charge » l.153, bornée en
  aval seulement). C'est le lot « bornes de séance », APRÈS le plafond structurel — ordre
  inchangé.
- Les « en blocs de 50 m » / « par 50 m » des nages sont des consignes de FRAGMENTATION (comment
  découper), pas des comptes de répétitions techniques — hors famille.

---

## §5 — Les deux exports divergent par UNE réponse, et c'est le plafond de l'allocation

`plantri70.3_2.html` disait « physio 13 » (secours : historique 13 h) ; `plantri70.3_3.html`
dit « physio 15 ». Mesuré sur le moteur actuel : `history: "confirme"` → 13 h · volPeak 9,6 ;
`history: "ancien"` → **15 h** · volPeak 9,5 — les chiffres de `_3` au dixième près.
`vol_recent` (13/15/16) ne change PAS ce plafond (vérifié). **Entre les deux exports, la
réponse `history` a changé.** Conséquence directe sur CARTE §2 : le plafond visé après le lot
progression est **13 h si `confirme`, 15 h si `ancien`** — la fixture porte `confirme`, le
dernier export ressemble à `ancien`. C'est la troisième clé à RELEVER dans l'app (avec
`longest_swim_m` et `milieu`) avant la prochaine mesure sur REEL — et avant de rebaser
l'allocation.

---

## §6 — Ce que ça change à la file (proposition, rien d'engagé)

L'ordre du §5 d'O88_ET_RELECTURE tient. La relecture le PRÉCISE :

1. **re-vérification B-17** — REEL est propre (3/3), O-84 reste la cible (29 profils).
2. **lot progression** — la relecture chiffre ses cibles : Force basse cadence figée 9/10
   semaines, sortie longue CAP figée puis ABSENTE après S22 (§3.D), footing à trajectoire
   inerte. Le §3.B (inversions récup/charge) devrait entrer dans son périmètre : lever le
   plafond structurel sans corriger la compression des charges agrandirait l'écart.
3. **les deux pièces** sur le socle O-85 — avec O-89 arbitré d'abord, sinon elles se mesurent
   contre une borne dont la rampe est en question.
4. **l'allocation** — budget 13 OU 15 h selon `history` relevé (§5) ; l'inversion nage↔vélo
   (§1) est la cible, le §3.C (couverture) son mécanisme le plus visible.

O-88 est fermé. Les tickets ouverts par cette relecture : **O-89** (rampe de la borne O-85),
**O-90** (la qualité coule où le volume sature + inversions récup/charge), **O-91** (la course
longue s'arrête à S22), **O-92** (structure des jours : 0 OFF, jours durs consécutifs) — détail
et blocs `verify` dans `BUGS_OUVERTS.md`.
