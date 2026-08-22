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
| 01 | [Alternance `facile2` — écrite, mesurée, RETIRÉE](01-alternance-facile2.md) | `f60f5f2` | byte-identique (patch conservé) |
| 02 | [Le plancher de fréquence — deux est la borne, trois est la cible](02-plancher-de-frequence.md) | `a12173c` | livré (module + décision + C3 bornée) |
| 03 | [O-98 : la gravité tranchée · audit des rouges attendus](03-O98-gravite-et-rouges-attendus.md) | `70d5ce0` | byte-identique (mesures seules) |
| 04 | [L'entrée de plan du débutant nageur](04-entree-plan-debutant-nageur.md) | `cc8f3a2` | livré (2 gardes) · §2a retiré (patch conservé) |
| 05 | [Le placement du test · la franchissabilité](05-placement-du-test-et-franchissabilite.md) | `c50de88` | livré (c) · (b) réfuté par C22 |

**Convention** : un compte rendu par réponse, numéroté à la suite. Le fichier est écrit dans le
dépôt avant d'être envoyé — le conteneur est éphémère, un fichier non commité serait perdu.
