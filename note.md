1. Vision
Cette application n'est PAS un générateur de séances.

Elle est un coach sportif intelligent.

Chaque décision doit être prise comme le ferait un entraîneur humain expérimenté.

Le moteur doit toujours privilégier :

- la cohérence
- la progression
- la santé
- la personnalisation

avant toute autre considération.
2. Philosophie
Une séance n'existe jamais seule.

Chaque séance appartient :

→ à une semaine
→ à un cycle
→ à une saison
→ à un objectif.

Toute modification doit préserver la cohérence globale.
3. Hiérarchie des priorités
Toujours respecter cet ordre.

1 Santé
2 Prévention des blessures
3 Régularité
4 Progression
5 Performance
6 Esthétique de l'interface
7 Nouvelles fonctionnalités
Une fonctionnalité ne doit jamais dégrader les quatre premiers points.
4. Règles du moteur
Le moteur réfléchit avant de générer.
Étapes :
Comprendre l'athlète

↓

Comprendre l'objectif

↓

Comprendre les contraintes

↓

Calculer la charge

↓

Construire les cycles

↓

Construire les semaines

↓

Construire les séances

↓

Vérifier

↓

Corriger

↓

Afficher
L'affichage est toujours la dernière étape.
5. Auto-validation
Le moteur doit contrôler son travail.
Checklist obligatoire :
□ progression du volume

□ répartition des intensités

□ récupération suffisante

□ alternance des charges

□ cohérence des disciplines

□ risque de blessure

□ objectif respecté

□ semaines équilibrées

□ fatigue acceptable
Si un point échoue :
Le moteur corrige.

Il ne demande jamais à l'utilisateur de corriger.
6. Intelligence
Le moteur ne doit jamais être statique.
Chaque jour il peut modifier :
les séances
le volume
les intensités
les récupérations
selon :
Garmin
météo
calendrier
fatigue
blessures
séances réellement réalisées.
7. Les règles interdites
Exemple :
Interdit :

deux longues sorties CAP consécutives

deux séances jambes très lourdes

une progression de volume incohérente

une semaine récupération plus dure que la précédente

une séance impossible à réaliser

une sortie piscine de 600 m

une sortie longue CAP de 3 h pour un débutant

une séance dont l'objectif n'est pas expliqué
Les règles doivent être nombreuses.
8. UX
Toujours répondre à trois questions.
Pourquoi ?

Comment ?

Quel bénéfice ?
Chaque séance doit expliquer :
Pourquoi je fais ça.

Pourquoi aujourd'hui.

Ce que ça améliore.
9. Architecture
Très important.
Séparer complètement :

Moteur

Base de données

Calculs

IA

Interface

Exports

API Garmin

API météo

API calendrier
Aucune logique métier dans les composants UI.
Toute logique est centralisée dans le moteur.
10. Règles de développement
Chaque nouvelle fonctionnalité doit :

être testable

être indépendante

être documentée

ne jamais casser le moteur

respecter toutes les règles précédentes.
Les principes d'or
Je terminerais par une dizaine de principes très courts, que Claude devra toujours respecter :
Le moteur réfléchit avant d'agir.

Chaque séance a un objectif.

Chaque décision est justifiable.

Le volume n'est jamais une finalité.

La récupération est un entraînement.

La personnalisation est obligatoire.

La santé passe avant la performance.

Le moteur apprend de l'athlète.

Le moteur contrôle son propre travail.

Un mauvais plan vaut mieux qu'un plan dangereux.

Une fonctionnalité qui diminue la cohérence est refusée.

Le moteur doit produire un plan qu'un entraîneur de haut niveau signerait sans hésiter.
Une recommandation supplémentaire
Je créerais deux fichiers distincts :
CLAUDE.md : la vision, les principes, les règles immuables et la philosophie du projet.
ARCHITECTURE.md : les choix techniques (structure des dossiers, moteur de planification, API Garmin, météo, calendrier, base de données, conventions de code, etc.).
