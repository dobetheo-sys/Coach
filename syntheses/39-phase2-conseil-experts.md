# 39 — Fiche 41 : Phase 2 — le conseil d'experts simulé

*Livré le 01/09/2026 · **document d'avis, `src/` byte-identique** (vérifié : le diff est vide) ·
livrable : `AUDIT_PHASE2_CONSEIL_EXPERTS.md` (540 lignes) · photo golden vérifiée
`1071/1071 · 0 écart` AVANT toute mesure.*

---

## Ce qui a été fait

Les huit rôles du brief ont été incarnés sur le corpus ENTIER, par un balayage d'agrégats
(un script unique joint `profiles()` × `golden/plans.full.json` et calcule, pour chacun des
1 071 profils : pic, parts facile/modéré/dur au classificateur du MOTEUR, disciplines avec legs
de brick ventilés, ratio de chaque récup à ses voisines, ratio d'affûtage au pic, sauts de
croissance à la définition de l'AUDITEUR, VO2, extrêmes). La méthode est déclarée dans le
document (§0) : exhaustif par agrégats + tous les extrêmes extraits nominativement — pas une
lecture ligne à ligne prétendue.

**Trois fautes de mes instruments, publiées avant tout verdict** (§0 du livrable) : un compteur
de croissance qui mesurait MA définition (39-78 « violations ») au lieu de celle de l'auditeur
(**0 saut dur, 9 doux** sur tout le corpus) ; une lecture de `phase.id` sur une photo qui porte
`phase.nom` (tous les ratios d'affûtage sortaient vides) ; un compteur du repli FC vélo qui
cherchait « FC » quand la consigne écrit « bpm » (11/69 → **45/69**, le verdict du rôle vélo
s'inverse avec l'instrument).

## Les verdicts en une ligne chacun

- **Médecin** : drapeaux médicaux 16/16 à zéro dur et zéro VO2 ✓ · mineurs 7/7 sans VO2 ✓ ·
  masters cadence ≤ 4 ✓ · les 3 correctifs Phase 1 suffisants · MAIS le plafond de temps dur
  n'est pas modulé par l'âge (65′ pondérées/sem à 16 ans, plafond adulte 66′) et **O-111 est le
  ticket le plus proche d'un enjeu de sécurité** (la consigne « départ contrôlé » d'une course B
  est effacée par le re-rendu).
- **Physiologiste** : les 11 constantes non sourcées jugées une à une (7 conformes, 4 à
  surveiller, aucune indéfendable) · progression tenue sur le livré (0 saut > 25 %) · **NOUVEAU :
  la décharge n'a pas de plancher** — 30 profils tri livrent des récups à 0,12-0,25 des voisines
  (30′ entre deux semaines de 250′).
- **Entraîneur tri** : `ALLOC_CIBLE` 50/30/20 plausible mais le corpus livre **médiane
  nage 15 / vélo 42 / course 45** — l'écart est publié partout, la cible devrait être fonction
  de l'enveloppe (débat §2.4, désaccord assumé) · O-102 et le déversoir nage hissés à
  PROBLÉMATIQUE côté entraînement.
- **Entraîneur course/trail** : vocabulaire conforme · O-112 bien fermé (et proposition : la
  borne trail en km-EFFORT, à l'état d'idée) · **NOUVEAU : un affûtage trail à 0,78 du pic**
  (`G/trail/-/measured-bas` S27, borne Bosquet 0,55 — un profil sur 1 071).
- **Entraîneur vélo** : zones Coggan ✓ · **le repli FC est conforme, mesuré** : 45/69 séances
  avec bandes bpm, 0 watt affiché quand la FTP est inconnue.
- **Entraîneur natation** : le −52 % du débutant demi-fond sans CSS **remesuré à −56 %**
  (12,6 h → 5,5 h, 47 → 20 séances) — priorité précision n° 1, recommandation de correction
  écrite (les bornes en mètres se convertissent en temps au CSS estimé, règle 14) · la fenêtre
  [600 ; 850] m confirmée sur **1 819 séances** (p10 600 · méd 700 · p90 850).
- **Duathlon/swimrun** : pas d'`ALLOC_CIBLE` nécessaire — duathlon déjà sur cible (méd 56/44),
  swimrun mieux servi par `swimrunObjective` + `S-MIX` à budget 0 · **NOUVEAU : une séance de
  443 min sur un PM** (×1,8 la durée d'épreuve) — borner par la durée de course, patron trail
  T4/T5.
- **Nutritionniste** : `activity` a zéro lecteur, bande NAP constante 1,35-1,55 pour tous —
  brancher sur les paliers FAO/WHO (déjà cités dans le fichier) ou retirer la question ;
  attention à l'interaction N9/N11 (libellé « hors entraînement »).

## Les débats (contradictoire exigé)

Cinq débats écrits avec résolution : âge (accord : modulation du dur, pas de fausse source) ·
55-60 % de facile au pic (accord : conforme — c'est le modéré spécifique, le choix C26 montre sa
valeur) · plancher de décharge (désaccord partiel, **mesure requise** : la décharge par le
contenu est-elle constructible sur les 30 profils ?) · `ALLOC_CIBLE` (désaccord ASSUMÉ, deux
positions au fondateur) · O-101/doublage course (accord : informer maintenant, ouvrir seulement
après O-100b).

## Les cinq trouvailles NEUVES du balayage (aucune n'était en Phase 1)

1. récups à 0,12-0,25 des voisines — 30 profils tri nommés ;
2. affûtage trail à 0,78 du pic sur `G/trail/-/measured-bas` ;
3. pas de modulation d'âge sur le plafond de temps dur (65′ pondérées à 16 ans) ;
4. séance de 443 min sur `G/duathlon/PM/vol-max` ;
5. quantification corpus entier de l'écart à `ALLOC_CIBLE` (42/45/15 livré pour 50/30/20).

## Recommandations priorisées (§4 du livrable)

Sécurité : **O-111** → **plafond de dur × âge** → **plancher de décharge (mesure d'abord)**.
Précision : **nageur débutant −56 %** → `activity` → informer sur les plafonds structurels
(O-99/O-101) → O-102 → affûtage trail. Performance : longue duathlon bornée → `ALLOC_CIBLE`
(arbitrage) → O-100b puis doublage course. Chaque ligne est écrite pour devenir une fiche.

## Les dix tickets jugés (§5)

O-111 et fiche 35 §3c en tête · O-102 avant O-100b (l'étiquette décide du sens de la
réparation) · O-101 en deux temps · O-99 = informer, pas brider · O-100a = conforme une fois
dit · O-97 = honnêteté, pas sécurité · O-105 = hygiène R11.1 en lot calme · O-77 = à mesurer
avant correctif.

## Ce que la fiche ne tranche pas

Macros N10 (avis diététicien HUMAIN requis — un conseil simulé ne s'y substitue pas), forme
d'`ALLOC_CIBLE`, plancher de décharge (mesure d'entrée), validité externe des paliers d'âge
(méthode validée, valeurs révocables).
