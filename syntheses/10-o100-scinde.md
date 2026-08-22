# 10 — O-100 se scinde : §1b est un VRAI défaut, et `doubles` est posée à tout le monde

**Date** : 22/08/2026 · **Instrument** : `npm run mesure:doublage` (§F ajouté)
**Moteur** : INTACT — `src/` byte-identique, aucune ligne écrite.

---

## 1. O-100 §1b — **l'hypothèse d'artefact est RÉFUTÉE, deux fois**

Ton hypothèse : *« `quotidienne` ouvre le cycle glissant de 10 jours ; mesuré en semaines
calendaires de 7, ça produit un volume irrégulier — donc c'est l'instrument. »*
Ta règle d'arbitrage : *« l'inversion disparaît → l'instrument ; elle persiste → le moteur. »*

### 1ʳᵉ mesure — la prémisse est vraie, et sans objet

`use10` s'active bien (`reasoningEngine.ts:373` : `dispo === "quotidienne" && shift_ok ===
"oui" && offDays.length < 2`), et la décision « **Cycle de 10 jours — activé** » est publiée.

**Mais le plan LIVRÉ reste une grille de 7 jours dans les deux cas** :

```
semaine       use10 = false   cycle absente    43 semaines : 1j×1 · 7j×42
quotidienne   use10 = true    cycle publiée    43 semaines : 1j×1 · 7j×42
```

`use10` fait tourner le **cycle des CRÉNEAUX** sur 10 positions (`weekBuilder.schema()`), il ne
change pas le calendrier. **Il n'y a rien à re-fenêtrer.**

### 2ᵉ mesure — faite quand même, et l'inversion PERSISTE

`tri/70.3`, `doubles: oui`, `sessions_max: 14`, `vol_max: 20`, fenêtre glissante de 10 jours
prise entièrement dans des semaines de charge :

| | pic 7 j | **pic 10 j** | ramené à 7 j |
|---|---|---|---|
| `semaine` | 12,32 h | **18,63 h** | 13,04 h |
| `quotidienne` | 11,52 h | **16,38 h** | 11,47 h |

**Par ta propre règle : c'est le moteur.** O-100b est un vrai défaut, confirmé, et c'est lui
qui bloque la dérivation d'O-99.

### O-100a, en revanche, est reclassé

`weekend` > `quotidienne` (16,80 > 16,00 en vélo, 9,82 > 9,43 en course) : ton modèle est
correct — deux journées entières portent des séances beaucoup plus longues, l'échauffement se
paie deux fois au lieu de sept. **Ce n'est plus un défaut de monotonie, c'est un fait à DIRE.**

### ⚠ Trouvé en le mesurant

La décision annonce « **Cycle de 10 jours — activé** » sur un plan dont les 43 semaines font
7 jours. Elle n'est pas FAUSSE — le cycle des créneaux tourne bien sur 10 positions et le plan
diffère —, mais son libellé décrit un calendrier que l'athlète ne recevra pas. Famille T-40,
sur la surface décision. Enregistré dans O-100b.

---

## 2. `doubles` est-elle posée hors tri ? — **oui, à tout le monde**

La question vit dans l'étape « Ta capacité réelle » (`endurabuild/js/ui/steps.js`), **poussée
sans aucune condition de sport**. Un marathonien y répond, et sa réponse ne change rien :
`run/marathon` et `bike/gravel` rendent le même plan au centième sous `non`, `parfois` et `oui`.

**Ce n'est PAS une violation non détectée de R20.1.** `banc_sensibilite.cjs:146` porte
`doubles: true` dans sa liste d'exemptions, avec sa raison écrite : *« ne vaut que là où une
seconde séance existe (multisport) — testé en tri ci-dessus »*. Le gate couvre le **MOTEUR** ;
ce qui n'est couvert nulle part, c'est qu'une question **POSÉE** puisse être inerte sans le
dire — famille **U19** (« un bouton mort et muet n'informe ni ne bloque »).

Donc : ta dichotomie avait une réponse mixte — la clé est bien posée partout (branche 1), mais
le défaut de règle a déjà été vu et nommé côté moteur ; **ce qui reste ouvert est côté
questionnaire.** Enregistré en **O-101**.

### Et le plafond mono-sport, qui est le plus lourd

`run/marathon` ne dépassera **jamais 9,82 h** de pic livré, quelles que soient les réponses —
sept jours, sept séances, aucun doublage possible. Dix à quatorze heures est courant pour un
marathonien sérieux : **le moteur ne sait pas produire cette préparation, et rien ne le dit.**
Un plafond de DISCIPLINE jamais énoncé, plus grave que la plage du champ `vol_max`.

---

## 3-5. Pourquoi je n'ai rien écrit

| # | point | état |
|---|---|---|
| 3 | O-99 — le message, dérivé du max sur les réponses | **BLOQUÉ par ton propre ordre** : tu écrivais *« tant qu'O-100 §1b n'est pas tranché, la monotonie n'existe pas »*. §1b est maintenant **confirmé comme défaut** — donc toujours pas tranché. Écrire le message maintenant encoderait une monotonie que le moteur n'a pas. |
| 4 | le plafond mono-sport dit (9,82 h) | **prêt à écrire** — il ne dépend d'aucune monotonie (c'est un maximum sur toutes les réponses), et c'est le même canal de message qu'O-99. À livrer **avec** le 3, pas avant : deux messages sur la même carte, écrits à deux moments, divergent. |
| 5 | O-98bis — le seuil de publication écrit comme décision | **prêt** — indépendant des deux autres. |

**Ce qu'il me faut de toi** : l'arbitrage O-100b. Deux issues, et elles ne coûtent pas pareil.
Soit le moteur RÉPARE l'inversion (`quotidienne` doit livrer au moins ce que `semaine` livre —
c'est un correctif de génération, rayon inconnu), soit il l'ASSUME et la publie comme O-100a
(un message, rayon nul). Une fois tranché, 3 + 4 + 5 partent ensemble.

---

## Reproduire

```bash
npm run mesure:doublage    # §A doubles par sport · §F la fenêtre de 10 jours
npm run mesure:picmax      # §5 les muets
```
