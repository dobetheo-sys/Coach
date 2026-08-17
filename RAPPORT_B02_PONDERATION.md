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

---

# Suite (14/08, après l'arbitrage `ARBITRAGES_B02_ET_SCEAU`)

## Critère 1' — mesuré PROPRE

`node scripts/mesureB02fp.mjs`, sur les **38 profils tri** que la pondération ajoute et que le
drapeau exemptait. D'où viennent leurs minutes dures pondérées :

| zone | part |
|---|---|
| `rn.mara` (allure course, classée dure PAR SA BANDE depuis `d846352`) | **56,3 %** |
| `bk.vo2` | 30,9 % |
| `rn.vo2` | 8,6 % |
| `sw.css` | 4,2 % |

**Zéro artefact** : aucune zone de repli, aucun leg de brick sans zone, aucune classe obtenue
par défaut. Les parts dures vont de **13,8 à 21,9 %** du volume hebdomadaire pour un plafond à
13,2 % (12 % × tolérance) — la morsure est réelle, pas marginale. Seuls 10 profils sur 38 ont un
excès ≤ 5 min (le bruit de quantification d'une répétition). **Le critère 1' est satisfait.**

## ⚠ ÉCRITE, MESURÉE, PUIS RETIRÉE — elle coûte deux garanties arbitrées

La pondération a été écrite en entier (plafond `clamp(12 %, 25, 60)` composé en `min()` avec
C26b pour ne jamais desserrer la protection tissu conjonctif ; minutes pondérées par la
discipline du STEP, ventilation produite **une seule fois** par le classificateur ; coupe et
mesure alignées, refs de l'athlète threadées jusqu'au cutter). **`audit:v1` 459 vert,
`audit:v2` 594 vert, `audit:v7` vert, invariants 22×54 verts.**

**Mais le banc v6 passe de 73 verts / 0 régression à 71 / 2 :**

| test | ce qu'il garde | mesuré avec B-02 |
|---|---|---|
| **C30-A** | la sortie longue des coureurs, valeurs épinglées | `10k/inter/4:30` **59 → 54** · `5k/inter/8:30` **69 → 55** · `semi/inter/4:30` **120 → 98** |
| **O-21b** | « aucune allure ne perd une séance ni ne gagne un plan » | fréquence des semaines de récup **dépendante de l'allure** : 4:30 → 3, les trois autres → 2 |

**Vérifié que ce n'est PAS mon ordonnancement** : l'ordre séquentiel (plafond avant le point
fixe) et la convergence conjointe (les deux dans la même boucle bornée) donnent **exactement les
mêmes deux régressions**. Elles viennent de la règle elle-même — un plafond proportionnel plus
serré retire de la qualité, la semaine rétrécit, et la chaîne I14b → C30b rend moins à la sortie
longue. O-21b est plus gênant encore : c'est la famille O-21 que ce chantier ferme depuis trois
lots, et B-02 la rouvre par un autre chemin.

**Je n'ai donc pas livré.** `src/` est revenu à l'état vert (73 verts, 0 régression) ; la mesure,
elle, reste — `scripts/mesureB02.mjs` et `scripts/mesureB02fp.mjs`. Trois issues, à ton
arbitrage :

- **(a) Accepter et ré-épingler** C30-A et O-21b sur leurs nouvelles valeurs. C'est défendable —
  un plafond plus juste change ce que les témoins photographient — mais C30-A porte TA décision
  sur les coureurs lents, et O-21b porte l'invariant d'indépendance à l'allure. Ré-épingler
  efface ce qu'ils gardaient.
- **(b) Tenir B-02 jusqu'à ce que la chaîne encaisse** : rendre C30b et la fréquence de récup
  insensibles au retrait de qualité, puis réécrire la pondération. C'est le chantier honnête,
  et il est plus gros que B-02.
- **(c) Renoncer au plafond proportionnel et garder la pondération SEULE** sur le plafond absolu
  actuel (C26/C26b) : la pondération corrige les 34 faux positifs duathlon sans resserrer le
  plafond, donc sans retirer de qualité. **Non mesuré** — c'est la variante que je mesurerais en
  premier si tu veux une quatrième voie.

**Le reste de ton ordre est intact** : T-27 (le sceau) reste à écrire avant la Phase 3, et
l'instrumentation de `reconcileDeclaredVolume` reste la condition de sortie d'O-35.
