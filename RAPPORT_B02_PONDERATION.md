# B-02 — la pondération, MESURÉE avant d'être écrite (14/08/2026)

**Commande** : `node scripts/mesureB02.mjs` · **population** : les 945 profils construits du
golden · **plafond testé** : `clamp(0,12 × minutes_hebdo, 25, 60) × tolérance C26c (1,1)`,
discipline-aveugle · **critères en vigueur** : 1 (< 10 % des profils) et 2 (≥ 70 % des touchés
sous 5 h/sem). Le 3ᵉ est caduc depuis la clôture de B-02a, comme le §2 l'établit.

**Rien n'est écrit dans `src/`.** Le livrable d'un ticket de calibrage est d'abord une mesure.

## Le tableau

| variante | touchés | crit. 1 (< 10 %) | sous 5 h/sem | crit. 2 (≥ 70 %) | populations |
|---|---|---|---|---|---|
| **pondération proposée ×1 / ×0,75 / ×0,5** | **118 (12,5 %)** | **✖** | **69,5 %** | **✖** | run 57 · tri 38 · dua 15 · swimrun 8 |
| ×1 / ×0,6 / ×0,4 | 110 (11,6 %) | ✖ | 73,6 % | ✓ | run 57 · tri 34 · dua 15 · swimrun 4 |
| ×1 / ×0,5 / ×0,33 | 104 (11,0 %) | ✖ | 74,0 % | ✓ | run 57 · tri 32 · dua 13 · swimrun 2 |
| ×1 / ×0,4 / ×0,25 | 81 (8,6 %) | ✓ | 76,5 % | ✓ | run 57 · tri 22 · swimrun 2 |
| brute (aucune pondération) | 335 (35,4 %) | ✖ | 59,4 % | ✖ | les 6 sports |
| **drapeau « disciplines d'impact » (13/08)** | **91 (9,6 %)** | **✓** | **70,3 %** | **✓** | run 57 · dua 34 |

## Ce que la mesure dit, et qui n'était pas prévisible

**1. La pondération telle que spécifiée échoue les DEUX critères** — 12,5 % contre < 10 %, et
69,5 % contre ≥ 70 % (à un demi-point, mais du mauvais côté). Le §2 la désigne comme la réponse ;
le §2 maintient aussi les critères 1 et 2 en vigueur. Les deux ne peuvent pas tenir ensemble
sur ces chiffres. **Je n'ai donc rien écrit** — c'est la même situation que `sw.aero` ce matin :
la décision est rendue, sa prémisse mesurée ne tient pas, et l'exécuter en silence serait
transformer un arbitrage en fait accompli.

**2. Le seul jeu de poids qui passe les deux critères (×0,4 / ×0,25) est celui qui ressemble
le plus au drapeau binaire.** À ce niveau, vélo et nage ne contribuent presque plus : la
pondération n'obtient sa recevabilité qu'en s'approchant de la règle qu'elle devait remplacer.
C'est l'argument le plus dur contre elle, et il est arithmétique, pas rhétorique.

**3. Mais les deux variantes ne touchent PAS la même population, et c'est ce qui plaide pour
la pondération.** Le drapeau punit **34 profils de duathlon** ; la pondération à 0,4/0,25 n'en
touche **aucun** — parce que les minutes dures d'un duathlon sont pour bonne part du VÉLO, et
que la pondération leur donne leur vrai coût là où le drapeau les compte plein tarif. En
échange, elle touche **22 à 38 profils de triathlon** que le drapeau exempte entièrement. Ce
n'est pas un même ensemble plus ou moins large : ce sont deux jugements différents sur qui
paie. Sur le fond, celui de la pondération est le plus défendable — un duathlonien puni pour
son intensité vélo est exactement ce que « discipline d'impact » avait pour but d'éviter.

**4. Les 57 profils de course sont touchés dans TOUTES les variantes** — leur poids vaut 1
partout. La pondération ne décide donc de rien pour eux : elle décide seulement combien de
non-coureurs les rejoignent. Un critère de recevabilité global masque ce fait ; la colonne
« populations » le montre.

## Ce que ça demande comme décision

Trois issues, toutes cohérentes, aucune n'étant mienne :

- **(a) Garder le drapeau du 13/08.** C'est la seule variante mesurée qui passe les deux
  critères tels qu'écrits. Coût assumé : 34 profils de duathlon payent leur intensité vélo au
  prix de la course, ce que le §2 reproche à juste titre au binaire.
- **(b) Adopter la pondération ×1/0,75/0,5 et RELÂCHER explicitement le critère 1**, avec sa
  raison : une règle discipline-aveugle touche mécaniquement plus de profils qu'une règle qui
  en exempte trois sports. Le critère < 10 % a été écrit pour un ticket de CALIBRAGE ; la
  pondération est un changement de structure. Relâcher un critère est légitime — le faire sans
  le dire ne l'est pas.
- **(c) Adopter la pondération à ×0,4 / ×0,25**, qui passe les deux critères. Mais ce sont
  **deux constantes nouvelles**, donc un arbitrage, et le §2 lui-même en fournit l'objection :
  à ce niveau la pondération dit presque « la nage ne compte pas ».

**Ma recommandation : (b).** La mesure du point 3 est la plus informative du lot — la
pondération répare un mauvais ciblage (le duathlon) que le drapeau crée, et c'est exactement
l'argument de coût du §2. Le prix est 2,5 points au-dessus d'un seuil écrit pour un autre type
de ticket. Mais la décision est au fondateur, avec ces chiffres.

## Ce que mon premier instrument a fait de faux, et c'est écrit

Il **recopiait** l'arithmétique de `intensitySplit` (distance ÷ allure) et portait **ses propres
constantes d'allure de repli** — dans la sonde même qui devait mesurer une faute d'unité. Les
chiffres publiés à la première exécution étaient donc légèrement faux : pondérée 122 (12,9 %) et
concentration 80,3 %, contre **118 (12,5 %) et 69,5 %** une fois le classificateur du moteur
importé au lieu d'être réécrit. Le verdict du critère 2 en dépendait entièrement — 80,3 % le
donnait pour acquis, la mesure fidèle le refuse. R11.1 vaut aussi pour l'instrument qui juge.
