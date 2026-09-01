# 40 — Fiche 42 : les trois priorités sécurité de la Phase 2, en une passe

*Livré le 01/09/2026 · quatre commits poussés (`f0e92b1` O-111 · plafond de dur × âge · C29d ·
registre) · **batterie 12/12**, `audit:v1` 459 à 0, `audit:sensibilite` vert · golden
**1071 → 1074**, rayons publiés par tâche : **0 · 2 · 58** profils.*

---

## Tâche 1 — O-111 fermé : le `det` d'une séance `race` est un texte d'auteur

**Le correctif** : une garde en fin de `renderSess` — si la séance porte `race` ET un `det`
existant, le texte d'auteur reste (la consigne « Départ contrôlé, première moitié retenue… »,
seule consigne de pacing de sécurité du plan) ; `min` reste recalculé ; une séance race SANS
det recevrait le rendu générique. `R23.18-A` repasse à `expect: "pass"` dans le même commit —
banc v6 **75 verts · 0 régression**.

**La contre-preuve a trouvé mieux que le correctif.** Garde neutralisée, la fixture exacte du
banc rend le texte d'auteur… **intact**. Rejouée contre TROIS moteurs d'avant — `6de90de`
(avant le retrait du cycle), `85e341e` (le commit qui a posé l'expect:fail), `ec7c4d1` (la
veille) — intact les trois fois, **le 01/09**. Or le 25/08, le même code perdait le texte de
façon documentée (le registre cite le `det` écrasé verbatim). Même code, même fixture, autre
jour, autre verdict : **la reproduction dépendait du calendrier** (famille R20.7, prouvée par
élimination — le code est hors de cause sur les trois commits). Et personne ne l'a vu passer
parce qu'un `expect:"fail"` qui se met à passer s'affiche « · dette » — indiscernable d'un
défaut vivant sans re-mesure (règle 17). **La garde rend la promesse indépendante du
calendrier, et c'est son vrai titre.**

**L'ampleur, mesurée** : 135 profils du corpus portent une séance race — TOUS en priorité A, à
steps vides, jamais re-rendus. Le corpus était donc aveugle au défaut ET au correctif
(`golden:verify` : 0 écart des deux côtés — le zéro indiscernable de la vacuité, troisième fois
en trois fiches). Trois profils `RACES/run/marathon/{a-moins,b,c}` photographient désormais les
textes d'auteur des trois priorités intermédiaires : **golden 1071 → 1074, rayon T1 = 0 profil
existant modifié**.

## Tâche 2 — le plafond de temps dur suit l'âge chez le mineur

`hardTimeCapMin` applique le facteur DÉJÀ arbitré pour le volume — `R6_AGE_LOAD.mineur` ×0,7,
`mineur2` ×0,5 sous 14 ans, jamais un nombre neuf (même construction que la fiche 39). Le
master n'est PAS modulé : résolution du conseil, son levier est la cadence de récupération,
déjà servie. **L'âge entre par le ctx du point fixe (planGenerator, repairLoop) ET par
`AuditOpts` (coherenceScorer, runV1Audit)** — cinq fichiers, une seule formule : le générateur
et l'auditeur lisent la même source (O-36).

Mesuré sur les 10 profils mineurs générables :

| profil | dur max pondéré avant → après | plafond |
|---|---|---|
| `G/duathlon/PM/mineur-format-ouvert` (16) | **65′ → 42′** | = 60 × 0,7, exactement |
| `G/tri/Full/mineur-format-ouvert` (16) | 37′ → 37′ | déjà dessous ; son plancher de FACILE dérivé monte |
| marathon 38′ · trail 27′ · swim 15′ · vélo 12 ans 21′ | inchangés | déjà sous leurs paliers |

Aucun plafond nul — la qualité survit partout, la VO2 reste à zéro (R6.3). **Golden : 2 écarts
sur 1074, tous mineurs, zéro adulte** (critère §2.3 de la fiche tenu).

## Tâche 3 — C29d, le plancher de décharge

**La mesure d'entrée exigée par le débat (fiche 41 §2.3), corpus entier** : la classe est plus
large que le constat — **70 semaines sur 58 profils** à 0,12-0,25 de leurs voisines (tri 30,
**natation débutante 29**, swimrun 8, duathlon 2, trail 1), et la décharge par le contenu
(≥ 0,5 × voisines, 100 % facile) est **constructible 70/70** : la capacité calendaire de chaque
semaine tient 1,5 à 2 fois la cible. Le correctif est donc dû, et il est livré.

**La passe** (patron C29c, « on rend des jours au point fixe »), bornée par les références
T-56 **par construction** : grossir les séances faciles sous la dose du même TYPE chez les
voisines ET sous le total de leur DISCIPLINE · ajouter des jours faciles sur les OFF non
forcés, sans dépasser la FRÉQUENCE des voisines · **convertir** un jour minuscule vers la
discipline en marge quand tout est au taquet (patron R6.1b — mesuré : la récup tri colle à ses
références rn/sw pendant que le vélo a 204′ de marge et zéro séance). Le couple C29d/T-56 se
rejoue une fois, re-rabotage **conditionnel** à une pose effective.

**Trois défauts de ma propre écriture, trouvés à la mesure et publiés** :
1. une tolérance ABSOLUE de 10′ sur des cibles de 36′ — 28 % du chemin (règle 14) : devenue
   proportionnelle ;
2. une croissance légale sur l'axe TYPE et illégale sur l'axe DISCIPLINE — T-56 rabotait
   derrière (90′ de course pour une référence à 30′) ;
3. le déclencheur aveugle à l'état MID-pipeline (`PW/tri/M` S39 : 133′ au passage de C29d, 85′
   après la coupe T-56) — d'où la paire rejouée ; et le premier re-rabotage, INCONDITIONNEL,
   changeait **23 plans que C29d n'a jamais touchés** (T-56 n'est pas idempotent sur les longs
   tri/Full) — rayon mesuré 81 → **58** écarts en le conditionnant.

**Livré, sur les 70 semaines** : **58 remontent à ≥ 0,40** des voisines · 12 restent entre 0,25
et 0,40 — bornées par la capacité LÉGALE T-56 et la structure weekend, listées une à une dans le
commit · **ZÉRO reste sous 0,25 : la classe interruption est fermée.** Contre-prouvé dans les
deux sens : passe neutralisée → 0,12 / 0,18 / 0,24 reviennent ; active → 0,39 / 0,52 / 0,50.

**Ce qui reste au fondateur, chiffré** : le déclencheur (0,25) attrape la classe du constat et
rien d'autre — la distribution est CONTINUE au-dessus (médiane tri 0,49) : un plancher général à
0,5 toucherait **462 profils**, à 0,40 : 216, à 0,35 : **138**. Où le plancher doit vivre sur ce
continuum est un arbitrage produit, pas un correctif — les chiffres sont écrits à côté de la
constante (`C29D_DECHARGE_DECLENCHEUR`, `constraintMatrix.ts`).

## Critères d'acceptation de la fiche

- avant/après par tâche, sections séparées ✓ · rayons golden par tâche : **0 · 2 · 58**, diffs
  publiés, zéro écart hors population ✓
- `audit:v1` 459 à 0 ✓ · `npm run batterie` **12/12** ✓ (cliquets T-27/T-48 immobiles — rien à
  ré-épingler) · `R23.18-A` passe ✓
- l'implémentation T3 est PARTIELLE là où T-56 la borne (12 semaines à 0,25-0,40), et c'est dit
  profil par profil plutôt que présenté comme uniforme ✓

## Registre

**O-111 fermé** (avec la dépendance calendaire documentée). Restent ouverts : O-77, O-97,
O-99, O-100a/b, O-101, O-102, O-105 — plus les recommandations de la Phase 2 non traitées
(nageur débutant −56 %, `activity`, affûtage trail 0,78, longue duathlon, ALLOC_CIBLE).
