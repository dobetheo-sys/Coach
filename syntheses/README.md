# Synthèses de lots

Un fichier par lot livré, dans l'ordre chronologique. Chaque synthèse est **autonome** : elle porte
ses chiffres, ses contre-preuves et ses fautes d'instrument publiées, sans qu'il faille remonter au
registre.

**Ce ne sont pas des sources de vérité.** La vérité vit dans `BUGS_OUVERTS.md` (le registre, avec ses
blocs `verify` exécutables) et dans le code. Ces fichiers sont des lectures : ils racontent un lot,
ils ne le définissent pas. Si un chiffre diverge, c'est le registre qui a raison — et c'est le
registre qu'on re-mesure.

| # | lot | commit | moteur |
|---|---|---|---|
| 00 | [Le lien de la PWA · le déploiement](00-lien-pwa-et-deploiement.md) | — | fiche de référence, pas un lot |
| 01 | [Alternance `facile2` — écrite, mesurée, RETIRÉE](01-alternance-facile2.md) | `f60f5f2` | byte-identique (patch conservé) |
| 02 | [Le plancher de fréquence — deux est la borne, trois est la cible](02-plancher-de-frequence.md) | `a12173c` | livré (module + décision + C3 bornée) |
| 03 | [O-98 : la gravité tranchée · audit des rouges attendus](03-O98-gravite-et-rouges-attendus.md) | `70d5ce0` | byte-identique (mesures seules) |
| 04 | [L'entrée de plan du débutant nageur](04-entree-plan-debutant-nageur.md) | `cc8f3a2` | livré (2 gardes) · §2a retiré (patch conservé) |
| 05 | [Le placement du test · la franchissabilité](05-placement-du-test-et-franchissabilite.md) | `c50de88` | livré (c) · (b) réfuté par C22 |
| 06 | [`franchissable` — deux réfutations](06-franchissable-deux-refutations.md) | `0711262` | byte-identique (mesures seules) |
| 07 | [L'état des branches — un seul merge en question](07-etat-des-branches.md) | — | aucune ligne touchée |
| 08 | [Le pic livré maximum sur les 990 profils](08-pic-livre-maximum.md) | `mesure:picmax` | aucune ligne touchée (`src/` byte-identique) |
| 09 | [Le plafond est le calendrier — les quatre points mesurés](09-plafond-calendrier.md) | `mesure:doublage` | aucune ligne touchée (`src/` byte-identique) |
| 10 | [O-100 se scinde — §1b est un vrai défaut](10-o100-scinde.md) | `mesure:doublage` §F | aucune ligne touchée (`src/` byte-identique) |
| 11 | [Dur/facile : le cycle de 10 jours dilue le dur](11-dur-facile-cycle10.md) | `mesure:doublage` §G/§H | aucune ligne touchée (`src/` byte-identique) |
| 12 | [T-61 tranche : `dur` veut dire « séance clé »](12-dur-ou-cle.md) | `mesure:t61` | aucune ligne touchée (`src/` byte-identique) |
| 13 | [Le schéma de 10 déclare cinq positions dures, en remplit une](13-cycle10-cinq-positions.md) | `mesure:cycle10` | aucune ligne touchée (`src/` byte-identique) |
| 14 | [La dérive du cycle : 20 % des positions clés ne sont pas livrées](14-derive-du-cycle.md) | `mesure:cycle10` §4 | aucune ligne touchée (`src/` byte-identique) |

**Convention** : un compte rendu par réponse, numéroté à la suite. Le fichier est écrit dans le
dépôt avant d'être envoyé — le conteneur est éphémère, un fichier non commité serait perdu.
