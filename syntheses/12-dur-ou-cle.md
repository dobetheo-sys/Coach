# 12 — T-61 a tranché : `dur` veut dire « séance CLÉ », et le cycle fait ce qu'il promet

**Date** : 22/08/2026 · **Instrument** : `npm run mesure:t61` (NOUVEAU)
**Moteur** : INTACT — `src/` byte-identique.
**Population** : **986 plans · 80 242 jours de charge**, 7 sports (hors `off` et `recup`).

---

## 1. Le verdict de vocabulaire — sans ambiguïté

Part des jours étiquetés `dur` par le schéma qui livrent **réellement** du dur, au
classificateur du moteur (`intensitySplit().hardMin > 0`) :

| créneau | jours étiquetés `dur` | livrent du dur |
|---|---|---|
| `dur1` | 14 399 | **76,2 %** |
| `dur2` | 14 102 | **45,9 %** |
| `durLong` | 13 763 | **0,0 %** |
| `facileR` | 30 | 0,0 % |

**`durLong` : 0,0 % sur les SEPT sports, sans une exception.** Contenu : « Sortie longue »
×4 244, « Sortie longue vélo » ×2 157, « Brick vélo+CAP » ×1 486, « Sortie longue CAP » ×1 318.
`dur2` : « Force basse cadence » ×3 011, « Sweetspot vélo » ×868 — modéré **par conception**.

**Ta seconde hypothèse est confirmée : `dur` signifie « séance clé ».** Et T-61 dans la forme
que tu proposais — « la charge déclarée correspond à l'intensité livrée » — est donc **refusée
comme spécification** : elle serait rouge sur 3 créneaux sur 4 **par conception**, ce qui en
ferait un test qui mesure le vocabulaire et l'appelle un défaut.

---

## 2. L'intention du cycle est ÉCRITE dans le moteur — et elle est tenue

`weekBuilder.ts:802`, un avertissement adressé à l'athlète :

> *« passer sur un cycle de 10 jours (Profil → disponibilité) pour **espacer les séances clés**
> au lieu de les entasser sur 7 jours »*

Compté sur le livré (`tri/70.3`, `doubles: oui`), une journée étant CLÉ si son créneau est
`dur1`, `dur2` ou `durLong` — la définition que le §1 valide :

| | jours clés | **/ 10 j** | / 7 j | espacement médian |
|---|---|---|---|---|
| `semaine` | 93 / 217 | **4,29** | 3,00 | 7 j |
| `quotidienne` | 76 / 217 | **3,50** | 2,45 | 10 j |

**Le cycle fait exactement ce que le moteur promet qu'il fait.** Ton arithmétique était juste
au centième.

⚠ **Une rectification sur ta fourchette** : « 3 à 4 séances clés par cycle » est **ta**
fourchette — je l'ai cherchée, **elle n'est écrite nulle part dans le dépôt**. Si elle fait
foi, alors le verdict s'inverse : **`quotidienne` (3,50) est DANS la cible, et c'est le schéma
de 7 (4,29) qui est au-dessus.** Ce n'est plus « le cycle dégrade », c'est « la semaine de 7
est plus dense que l'intention ».

---

## 3. Ce que ça fait à O-100b

**O-100b change de nature.** Ce n'est pas un défaut de génération : c'est un **mécanisme
documenté** dont la conséquence n'est publiée nulle part.

```
ce que le moteur PROMET   :  espacer les séances clés
ce qu'il FAIT             :  7 j → 10 j d'espacement médian, 4,29 → 3,50 clés / 10 j   ✓
ce qu'il NE DIT PAS       :  −6 % de volume au pic, −31 % de minutes dures
```

Et il s'applique à qui a coché la réponse **la plus permissive**, sans un mot.

**Donc (b), avec ta formulation, et elle est exacte** :

> « Sur 10 jours, tes séances clés reviennent tous les 3 jours environ au lieu de tous les
> 2,3 — mieux espacées, un peu moins nombreuses par mois. »

**(a) n'a plus d'objet** : préserver la densité de `dur1` reviendrait à défaire l'espacement,
c'est-à-dire à annuler la seule chose que le cycle existe pour faire.

Reste le point que tu soulignes et que je garde ouvert : **le minimum à 4 jours**. La médiane
passe bien de 7 à 10, mais le minimum tombe de 7 à 4 — deux séances clés à 4 jours d'écart ne
sont pas le même stimulus que deux à 10. Le cycle espace **en moyenne** et **irrégularise**.
C'est la seule moitié d'O-100b qui reste un vrai candidat de défaut.

---

## 4. ⚠ Le §4 de la mesure — ce que personne n'avait regardé

L'inverse de ta question : des créneaux étiquetés **`facile`** qui livrent du **DUR**.

```
tri|facile2/facile   1 181 jours durs sur 3 424   (34,5 %)
tri|facileR/facile      56 jours durs sur 6 735   ( 0,8 %)
```

`facile2` est le créneau typé **nage à 100 %** — c'est la nage seuil qui y tombe. La charge
déclarée dit `facile`, **et c'est elle qui alimente la courbe de volume**, pendant que le
contenu est dur **un jour sur trois**.

**L'écart est quarante fois plus gros que `facileR/dur`** — 1 181 jours contre 30 — et il va
dans le sens qui compte : **la semaine est comptée plus facile qu'elle n'est**. Ouvert en
**O-102**.

Et c'est encore `facile2` : le créneau que le plancher de fréquence protège, celui que les
coupes visent, celui qui ne peut pas doubler. La prédiction « la nage est la victime par
défaut de tout mécanisme qui choisit » tient une cinquième fois — ici par l'étiquette.

---

## 5. `facileR/dur` — ta lecture tient, avec son ordre de grandeur

30 jours sur 80 242 (`run` 8, `tri` 22), 0 dur livré. **C'est un vrai défaut de cohérence**,
et il est **marginal** face à O-102. À traiter dans le même geste, pas avant.

---

## Ordre révisé

| # | point | état |
|---|---|---|
| 1 | T-61 tranche le §2 | **fait** — `dur` = clé, et la garde « charge == intensité » est refusée comme spec |
| 2 | O-100b arbitré | **prêt pour (b)** — reste à trancher le **minimum à 4 jours**, la seule moitié qui soit encore un défaut |
| 3 | O-99 + plafond mono-sport + O-98bis | **débloqués** dès que (b) est acté |
| — | **O-102** (nouveau) | `facile2/facile` livre du dur 34,5 % du temps — quarante fois `facileR/dur` |

---

## Reproduire

```bash
npm run mesure:t61   # §1 vocabulaire · §3 contenus · §4 l'inverse · §5 séances clés par cycle
```
