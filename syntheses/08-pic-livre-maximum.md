# 08 — Le pic livré maximum sur les 990 profils

**Date** : 22/08/2026 · **Instrument** : `npm run mesure:picmax` (`scripts/mesurePicMax.mjs`)
**Moteur** : INTACT — `src/` byte-identique, aucune ligne écrite. Le §4 se joue par
`npm run casser` (mutation possédée, restaurée dans un `finally`).

**Population assertée** : 990 profils balayés · **986 plans mesurés** · 4 refus typés
(les `mineur`, R15.7-C). Le pic est **LIVRÉ** : maximum, sur les semaines de CHARGE, des
minutes réellement présentes dans le plan — jamais `volPeak`, qui est l'annonce.

---

## §1 — Le maximum absolu

| pic livré | créneaux | semaine | profil | annoncé |
|---|---|---|---|---|
| **16,00 h** (960 min) | 6 | S14 | `G/bike/gravel/vol-max` | 16 h |
| 14,73 h | 6 | S21 | `G/duathlon/PM/vol-max` | 14,7 h |
| 14,18 h | 5 | S24 | `G/trail/-/vol-max` | 14,2 h |
| 12,95 h | 6 | S33 | `G/tri/Full/vol-max` | 13 h |
| 11,93 h | 6 | S33 | `G/tri/Full/vol-recent-bas` | 11,9 h |
| 11,52 h | **9** | S37 | `REEL/tri/70.3/nage-limitante` | 11,5 h |

**Distribution : médiane 7,00 h · p90 9,95 h · p99 10,20 h · max 16,00 h.**

Le maximum absolu est un **vélo seul** (gravel), pas un triathlon : une discipline, aucun
temps d'eau à convertir, des séances longues autorisées. Le premier tri arrive à **12,95 h**,
et il faut un Full à `vol-max` pour l'atteindre.

---

## §2 — Les profils qui atteignent leur `vol_max` déclaré (à 10 % près)

**231 / 986 (23,4 %).** Par valeur déclarée :

| `vol_max` déclaré | atteints | ratio livré/déclaré **médian** |
|---|---|---|
| 3 h | 7/8 | **101 %** |
| 6 h | 0/8 | 74 % |
| 10 h | 223/954 | 70 % |
| 12 h | 1/7 | **47 %** |
| 20 h | 0/9 | **58 %** |

La lecture est nette et elle répond à la question du fondateur : **plus la déclaration est
haute, moins elle est honorée.** À 3 h le moteur livre ce qu'on lui demande ; à 20 h il en
livre 58 %, soit ~11,6 h. Le champ propose bien une plage dont le haut n'est pas honorable.

⚠ **Faute d'instrument publiée** : ma première écriture testait `typeof a.vol_max === "number"`
et rendait **0/0** — un zéro saturé, donc l'instrument. Le corpus déclare `vol_max` en CHAÎNE
(`"10"`), comme le questionnaire le collecte. Corrigé, pas contourné.

---

## §3 — Les créneaux réellement livrés au pic

| créneaux | profils |
|---|---|
| 2 | 1 |
| 3 | 29 |
| 4 | 68 |
| 5 | 310 |
| **6** | **577** |
| 9 | 1 (`REEL`, le seul qui double) |

**Médiane 6 · moyenne 5,46 · maximum 9.** La semaine de pic est donc, pour 58 % du corpus,
une semaine à **six créneaux** — six jours actifs sur sept. Le seul profil au-dessus est celui
qui déclare `doubles`, et il plafonne à 9 pour 12 séances annoncées (O-97).

---

## §4 — Tous les plafonds de durée de séance neutralisés

Expérience contrôlée à **facteur unique** : `blockBounds` — la SEULE source de bornes du
moteur — rend `cap: 999999`, le plancher inchangé. Un seul facteur varie, et on OBSERVE la
sortie livrée (règle 15). La mutation MORD (le max bouge), donc la mesure n'est pas vacueuse.

| grandeur | courant | plafonds neutralisés | écart |
|---|---|---|---|
| **max absolu** | 16,00 h | **17,00 h** | **+1,00 h (+6 %)** |
| médiane | 7,00 h | 7,73 h | +0,73 h |
| **p90** | 9,95 h | **9,98 h** | **+0,03 h** |
| p99 | 10,20 h | 10,20 h | **0,00 h** |
| `REEL/tri/70.3` | 11,52 h | 13,00 h | +1,48 h |
| minutes **par séance** au pic (médiane) | 76,8 | 84,2 | +9,6 % |
| **créneaux au pic (moyenne)** | **5,46** | **5,47** | **+0,01** |
| profils atteignant `vol_max` | 231 | 257 | +26 |

### La réponse

**Le critère littéral du fondateur n'est pas rempli — et il testait la mauvaise statistique.**

(4) ne reste pas sous 12 h : le maximum monte à **17,00 h** (`G/tri/Full/vol-max`, qui déclare
20 h). Mais ce maximum est porté par **quatre profils construits à `vol_max: 20 h`**. Sur le
corpus, la neutralisation ne déplace **rien** : p90 +0,03 h, p99 **immobile**, et surtout
**le nombre de créneaux ne bouge pas d'un centième** (5,46 → 5,47).

Ce que la mesure dit, à la lettre :

1. **Le plafond EST structurel pour la quasi-totalité du corpus** — retirer TOUS les plafonds
   de durée laisse 90 % des profils là où ils étaient. Ce qui les borne est le **calendrier** :
   7 jours, ≤ 3 doublés, une médiane de 6 créneaux livrés.
2. **Les durées ne sont pas dormantes pour autant** : elles rendent +9,6 % de minutes par
   séance et +26 profils qui atteignent leur déclaration. C'est réel, et c'est **petit**.
3. **Le champ `vol_max` propose bien une plage que le moteur ne peut pas honorer** — et le
   §4 le prouve dans le sens fort : même **sans aucun plafond de séance**, `vol_max: 20 h`
   reste à **65 %** de médiane. Ce n'est donc pas une question de bornes à desserrer.
4. **Le levier restant est le CRÉNEAU, confirmé une troisième fois** (après M2 et le §2 du lot
   volume) — et il est adossé au calendrier, pas à une constante. La seule voie qui ajoute des
   créneaux est le doublage, et un seul profil du corpus en bénéficie.

### Ce que la mesure ne dit pas

Elle ne dit pas où le moteur DEVRAIT plafonner. Elle dit que déplacer les bornes de séance ne
changera pas la réponse, et que la moyenne de créneaux est immobile sous un facteur qui
augmente les minutes — donc que les deux grandeurs sont indépendantes, ce que le lot volume
supposait sans l'avoir mesuré à facteur unique.

---

## Reproduire

```bash
npm run mesure:picmax                    # §1 · §2 · §3
npm run casser -- --fichier src/generator/planGenerator.ts \
  --avant '  function blockBounds(b: V1Step, s: BoundedSession): { floor: number; cap: number } {' \
  --apres '  function blockBounds(b: V1Step, s: BoundedSession): { floor: number; cap: number } { const _r = _bbReel(b, s); return { floor: _r.floor, cap: 999999 }; }
  function _bbReel(b: V1Step, s: BoundedSession): { floor: number; cap: number } {' \
  -- node scripts/mesurePicMax.mjs      # §4
```
