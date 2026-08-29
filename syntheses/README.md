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
| 08 | [Le pic livré maximum sur les 990 profils](08-pic-livre-maximum.md) | `56d5a9a` | aucune ligne touchée (`src/` byte-identique) |
| 09 | [Le plafond est le calendrier — les quatre points mesurés](09-plafond-calendrier.md) | `2c8a20d` | aucune ligne touchée (`src/` byte-identique) |
| 10 | [O-100 se scinde — §1b est un vrai défaut](10-o100-scinde.md) | `fd1f3dc` | aucune ligne touchée (`src/` byte-identique) |
| 11 | [Dur/facile : le cycle de 10 jours dilue le dur](11-dur-facile-cycle10.md) | `296b642` | aucune ligne touchée (`src/` byte-identique) |
| 12 | [T-61 tranche : `dur` veut dire « séance clé »](12-dur-ou-cle.md) | `2e8aaac` | aucune ligne touchée (`src/` byte-identique) |
| 13 | [Le schéma de 10 déclare cinq positions dures, en remplit une](13-cycle10-cinq-positions.md) | `1152ea0` | aucune ligne touchée (`src/` byte-identique) |
| 14 | [La dérive du cycle : 20 % des positions clés ne sont pas livrées](14-derive-du-cycle.md) | `ab5d74e` | aucune ligne touchée (`src/` byte-identique) |
| 15 | [Permanent confirmé, la spec écrite, deux gates qui dépendaient du jour](15-permanent-et-spec.md) | `76c58e8` | spec (commentaire) + 2 instruments ancrés |
| 16 | [Le cliquet T-62, le contrôle statique des dates, et O-104 localisé](16-cliquet-et-controle-statique.md) | `1627bfd` | T-62 · check:dates (12ᵉ gate) · 4 bancs ancrés |
| 17 | [Diagnostic : le plafond de 11,5 h ne vient pas de `G_PLAFOND`](17-diagnostic-plafond-11h.md) | `5f0e9c8` | aucune ligne touchée |
| 18 | [Le cycle de 10 j n'agit que sur la rotation des créneaux](18-cycle-10j-vs-calendrier-7j.md) | `7d28d03` | aucune ligne touchée |
| 19 | [Plan de chantier : l'unité de volume devient le CYCLE](19-plan-chantier-unite-de-volume.md) | `e0f3d2a` | feuille de route, aucune ligne écrite |
| 20 | [Étape 0 : le partage de la dérive O-103](20-etape0-partage-derive.md) | `6d3c0a7` | mesure seule, aucune ligne écrite |

**Récapitulatif transversal** : [`RECAP.md`](RECAP.md) — une ligne de fond par réponse, le fil
qui les relie, les fautes d'instrument publiées et ce qui reste ouvert.

**Convention** : un compte rendu par réponse, numéroté à la suite. Le fichier est écrit dans le
dépôt avant d'être envoyé — le conteneur est éphémère, un fichier non commité serait perdu.
