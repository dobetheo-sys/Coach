# 13 — Le schéma de 10 déclare bien cinq positions dures : il n'en remplit qu'une

**Date** : 22/08/2026 · **Instrument** : `npm run mesure:cycle10` (NOUVEAU)
**Moteur** : INTACT — `src/` byte-identique.
**Méthode** : position par position, via la clé `jc` que `weekBuilder` pose sur chaque jour
livré — jamais une reconstruction (règle 21). 4 bases RÉELLES du corpus.

---

## §1 — La séquence RÉELLE du schéma de 10 positions

Lue dans `weekBuilder.ts`, `schema(use10 = true)`, et vérifiée sur le livré :

| | j1 | j2 | j3 | j4 | j5 | j6 | j7 | j8 | j9 | j10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **charge** | **dur** | facile | **dur** | facile | **dur** | facile | **dur** | facile | **dur** | recup |
| **créneau** | `dur1` | `facileR` | `dur2` | `facile2` | `facileR` | `facileR` | `dur2` | `facile2` | `durLong` | `recup` |

**Cinq positions de charge `dur`, jamais deux consécutives.** C'est exactement le compte et
l'alternance de ta séquence.

⚠ **Ta prémisse « il en porte l'équivalent d'une » est donc FAUSSE au niveau du schéma** — et
vraie au niveau du contenu. La distinction change le lot, voir §2.

**Deux écarts avec ta séquence, publiés** : le schéma ne pose **aucun `off`** et **une seule
récup** (la tienne en veut 1 et 2). En `run` et en `trail`, des `off` apparaissent quand même
— posés **en aval** par le plafond de jours d'impact (`MAX_RUN_DAYS`), pas par le schéma.

---

## §2 — Combien de positions dures livrent réellement du dur

| position | créneau | livré | |
|---|---|---|---|
| j1 | `dur1` | **DUR** | ■ |
| j3 | `dur2` | modéré | □ |
| j5 | `facileR` | facile | □ |
| j7 | `dur2` | modéré | □ |
| j9 | `durLong` | facile | □ |

**5 positions promises dures · 1 livrée · 0 enchaînement de deux dures.**
Identique sur les quatre bases (`run/marathon`, `bike/gravel`, `tri/Full`, `tri/70.3`).

### Le fait qui décide du lot

**Le schéma de 7 a exactement le même ratio : 3 positions promises, 1 livrée.**

```
cycle de 10 :  5 promises → 1 dure livrée
cycle de  7 :  3 promises → 1 dure livrée
```

**Les DEUX schémas ne délivrent qu'UN seul jour dur par cycle.** Le cycle de 10 est simplement
plus long — c'est toute l'explication de la densité plus basse, et ça n'a rien d'un défaut du
cycle.

**Donc ce n'est pas un schéma à écrire — c'est le REMPLISSAGE des positions.** Poser cinq
positions `dur` ne sert à rien : elles y sont déjà. Ce qui manque, c'est que quatre d'entre
elles soient remplies par du contenu que le classificateur appelle dur. Or `dur2` porte « Force
basse cadence » et « Sweetspot vélo », `durLong` porte la sortie longue et le brick — **aucun
des deux n'est dur, par conception**. Le levier est dans le **module de sport**, pas dans
`weekBuilder`.

C'est le point que tu identifiais toi-même comme décisif au §5 de ton document : *« poser cinq
positions `dur` ne sert à rien si trois d'entre elles sont remplies par du contenu que le
classificateur appelle facile »*. **La mesure dit que c'est déjà l'état actuel, et que c'est le
seul problème.**

---

## §3 — La séquence intentionnelle est-elle écrite dans le dépôt ?

**Non. Nulle part.** Recherche faite sur `src/` et sur les documents :

- `answerSchema.ts:620` — un message à l'athlète (« un cycle de 10 jours répartirait mieux le
  peu de créneaux disponibles ») ;
- `reasoningEngine.ts:374` — la décision « Cycle de 10 jours — activé », motif « densité mieux
  répartie qu'en semaine de 7 jours » ;
- `weekBuilder.ts:802` — « espacer les séances clés au lieu de les entasser sur 7 jours » ;
- des commentaires de **conséquence** dans `weekBuilder` et `planGenerator` (deux récups
  consécutives, deux `dur2` dans la même fenêtre calendaire, glissement des créneaux).

Aucune spec de la séquence. Aucune fourchette de séances clés. Aucune mention d'intensification.

**Verdict par ta propre règle : fonctionnalité jamais construite, pas régression.** Et les
motifs écrits disent tous *« répartir »* / *« espacer »* — **l'inverse de l'intention
d'intensification.** C'est la deuxième intention de conception de ce fil qui ne vit qu'en
conversation, après la fourchette 3-4. **Les deux entrent au dépôt avec le lot.**

---

## Ce que le lot devient

| ta formulation | ce que la mesure corrige |
|---|---|
| « cinq positions dures à écrire dans le schéma » | **elles y sont** — le schéma est conforme à ton intention |
| « le moteur espace là où tu voulais densifier » | vrai en RÉSULTAT, mais la cause n'est pas le schéma : les deux cycles livrent 1 jour dur, celui de 10 est plus long |
| « ce n'est pas un réglage, c'est un schéma à écrire » | **c'est un REMPLISSAGE à écrire** — dans le module de sport, pas dans `weekBuilder` |
| « la densité par phase, permanent ou bloc » | **question intacte, et elle devient la première** : aujourd'hui `use10` est permanent, et rien dans le dépôt ne dit ce qu'il devrait être |

Et ta remarque sur `O-102` tient et se renforce : si le lot doit densifier le dur, une étiquette
de charge qui se trompe d'un tiers sur `facile2` rendra la mesure du résultat inutilisable.

---

## Reproduire

```bash
npm run mesure:cycle10   # §1 la séquence · §2 promis vs livré, par position
npm run mesure:t61       # le vocabulaire et les contenus
```
