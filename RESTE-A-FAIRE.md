# Reste à faire — état au 28/07/2026

Avancement global : **~90 %** de la vision (`note.md` + `ROADMAP-V2.md`).
Le noyau critique (priorités 1-4 du manifeste : santé, blessures, régularité, progression)
est à **100 %**, mécanisé et gardé vert par la CI (9 contrôles sur chaque push, dont les E2E navigateur).

## ✅ Fait (rappel en une ligne chacun)

Moteur V2 complet (raisonne → génère → audite → répare) · 486/486 profils verts ·
affûtage garanti ≥40 % · promesses calibrées (sonde de capacité) · répartition 80/20
mécanisée · adaptation quotidienne (readiness + météo Open-Meteo) · boucle prévu/réel
depuis les ✓ · prédiction de course (Riegel/CSS/%FTP, fourchettes) · historique
prévu vs réel · streak + avancement + badges · UI branchée sur le moteur (bundle
auto-testé, legacy en repli) · docs (CLAUDE/ARCHITECTURE/ROADMAP) · CI 9 gardes (8 audits/specs + E2E Playwright).

## 👤 À TOI — personne d'autre ne peut le faire

| Action | Pourquoi |
|---|---|
| ~~Merger la PR #2~~ | ✅ Fait (28/07/2026) — `main` est à jour ; la suite du travail vit sur une nouvelle PR. |
| **Tester avec ton profil réel** | Générer ton plan tri avec tes vrais seuils (FTP/allure/CSS), cocher tes séances une semaine, essayer « Forme du jour ». C'est l'étape 6 de la roadmap et le seul vrai juge. |
| **Partager aux amis testeurs** | Après merge, la PWA se déploie seule sur GitHub Pages (`pages.yml`) : partage l'URL `https://dobetheo-sys.github.io/Coach/` — sur téléphone le navigateur propose « Installer l'application » (pas d'APK nécessaire ; APK possible plus tard via PWABuilder avec cette URL). Si le premier déploiement échoue : Settings → Pages → Source « GitHub Actions », une fois. |
| **Déployer le relais Strava** | Le code serveur est LIVRÉ (`server/strava-relay.js` + `server/README.md`, ≈15 min) — mais créer l'application Strava (Client ID/Secret) et le compte Cloudflare exige tes identifiants : personne d'autre ne peut le faire. Sans ça, le jeton manuel continue de marcher. |
| **Avis diététicien (conseil seulement)** | Les ESTIMATIONS sont livrées (dépense de base + entraînement + macros indicatives, décision du 28/07/2026, garde-fous en CI). Reste bloqué tant qu'un(e) pro n'a pas validé : le CONSEIL d'apport (cibles, menus) et le retrait des avertissements. |

## 📱 NOUVEAU : PWA modulaire livrée (`endurabuild/`)

Migration du monolithe en PWA zéro-build faite (brief `BRIEF_CLAUDE_CODE_MIGRATION_PWA.md`) :
modules ES, mobile-first (cibles 44px), installable + offline (manifest + service worker),
polices auto-hébergées en vrais woff2, export PNG ajouté, validée en navigateur réel et
486/486 à l'audit. Voir `endurabuild/RAPPORT-MIGRATION-PWA.md`. **À toi : la tester sur
téléphone** (étape 8 du brief) avant de retirer le monolithe.

**Refonte 4 onglets faite** (brief `BRIEF_CLAUDE_CODE_ONGLETS.md`) : 📋 Profil (réglages
éditables + journal d'évolution), 🗓 Plan (vision macro + exports), 📈 Avancement (charge,
régularité, prédiction, décisions), 📅 Semaine (défaut : semaine courante + coche + Forme
du jour). Plan généré UNE fois (`S.currentPlan`), 0 `buildPlan` au changement d'onglet
(mesuré), barre fixe en bas avec safe-area. Voir `endurabuild/RAPPORT-ONGLETS.md`.

**Écran d'accueil « Forme du jour d'abord » fait** : l'onglet 📅 Semaine s'ouvre sur le
check-in (sommeil/VFC/énergie/ressenti, VFC visible pour tous désormais) — aucune séance
visible avant d'avoir répondu, une fois par jour. Une fois validé : la séance du jour déjà
adaptée (ou la prochaine si repos) en premier, puis la semaine. Voir ARCHITECTURE.md
« Écran d'accueil ».

**Audit d'influence des paramètres fait** : chaque réponse du questionnaire vérifiée contre
le moteur réellement utilisé (V2, pas le legacy). Un vrai bug corrigé (import FIT/Strava
qui n'atteignait jamais le plan généré), `swim_limit` pleinement câblé (4 valeurs, bassin
et eau libre), 3 champs morts retirés (grille de contraintes de semaine, HRV premium
redondant, Taille, Activité hors sport), les calculateurs de test remplacés par la MÉTHODE
pour obtenir FTP/allure/CSS soi-même (protocole + renvoi vers Profil), et les conseils
personnalisés (`evalRules`) enfin visibles dans l'onglet Avancement. Détail complet dans
ARCHITECTURE.md « Audit d'influence des paramètres ».

**5e onglet 🎮 Suivi fait** : avatar évolutif (XP cumulatif — régularité/badges/charge,
jamais un chrono, jamais décroissant), checklist en direct de la séance du jour
(échauffement/corps/retour au calme), galerie de badges. Séances repliables partout
(`<details>` fermés par défaut, clic pour le détail) + glossaire éducatifs natation
détaillé (comment faire le geste, pas juste son nom). Voir ARCHITECTURE.md « 5e onglet
Suivi » et « Séances repliables ».

**Refonte R5 faite** (premier retour du fondateur, ARCHITECTURE.md « Refonte R5 ») :
check-in en diaporama coach, onglet central 🎯 Aujourd'hui (séance → prédiction → charge →
avancement → intensités), Profil identité (avatar/XP/teaser + niveaux par discipline en
tri + échéance + retest suggéré + records), Plan sans bandeau rouge avec phases cliquables
en sous-objectifs validables, onglet 🥗 Nutrition dédié, bouton ✓ redessiné, séances
partout cliquables avec affordance. E2E réécrits (109 assertions).

**Lot améliorations fait** (ARCHITECTURE.md « Lot améliorations ») : ancrage `plan_start`
(fin du bug « semaine 1 éternelle »), état partagé entre plans (douleur/maladie/readiness
suivent la personne), sauvegarde/restauration JSON, auto-✓ depuis un FIT, échange de jours
⇄ persistant, journal des verdicts, chrono de course réel vs prédiction, modales
accessibles (focus/Échap/aria), monolithe gelé, **E2E Playwright en CI** (`tests/e2e/`,
4 suites, 74 assertions).

## 🔧 Reste côté code — par ordre recommandé

| # | Chantier | Effort | Bloqué par | Détail |
|---|---|---|---|---|
| ~~1~~ | ~~Export PNG / partage~~ | — | — | ✅ Fait (PWA : `js/export.js`, bouton 🖼 PNG dans le plan). |
| ~~2~~ | ~~Import Strava automatique (OAuth)~~ | — | déploiement (toi) | ✅ Code livré : relais `server/strava-relay.js` (Cloudflare Worker zéro dépendance, sans état, secret jamais côté client) + `js/strava.js` + bouton « Se connecter avec Strava » au Profil (refresh auto, repli jeton manuel conservé). Reste l'étape humaine : créer l'app Strava + déployer le worker (`server/README.md`, ≈15 min). |
| ~~3~~ | ~~Source FIT (upload fichier)~~ | — | — | ✅ Fait : parseur FIT zéro-dépendance (`src/readiness/fitParser.ts`, spec `npm run demo:fit` en CI), bouton « 📂 Importer un fichier .FIT » dans l'onglet Profil — références (FTP/allure/CSS) au journal + séances réelles dans la fatigue de l'ajusteur (`fitSessions`, dédoublonnées avec les ✓). Sommeil/HRV restent en saisie manuelle (absents des FIT d'activité). |
| ~~4~~ | ~~Nutrition (ravitaillement d'effort)~~ | — | — | ✅ Fait : `src/nutrition/nutritionCalculator.ts` (règles N1–N7 sourcées ACSM/ISSN/Jeukendrup, spec `npm run demo:nutrition` en CI), carte « 🥤 Ravitaillement d'aujourd'hui » dans l'onglet 📅 Semaine. **Étendu le 28/07/2026 (ta décision)** : `energyEstimator.ts` N8–N10 — estimation dépense de base (Mifflin-St Jeor) + entraînement + macros INDICATIVES, carte « 🔥 Dépense estimée », taille optionnelle au Profil. Toujours AUCUNE cible d'apport ni menu ; **reste bloqué avis diététicien** : le conseil d'apport et le retrait des avertissements. |
| ~~5~~ | ~~API Garmin (HRV/sommeil auto)~~ | — | — | ⛔ Abandonné (décision utilisateur : « reste sur Strava ») — l'accès Garmin Health est B2B sous agrément, non garanti. La logique readiness reste agnostique de la source : si la décision change un jour, c'est un adaptateur à écrire, rien d'autre. Sommeil/HRV : saisie manuelle. |
| ~~6~~ | ~~Célébrations « moment »~~ | — | — | ✅ Fait (PWA : bannières jour de course / veille de course / entrée en affûtage dans l'onglet 📅 Semaine, `momentHTML`). |
| ~~7~~ | ~~Vue 10 jours (cycles use10)~~ | — | — | ✅ Vérifié en navigateur réel (profil `dispo quotidienne` : marqueurs C×J×, case « aujourd'hui », coche, semaine courante — 11/11 assertions vertes). |

## 🎓 Backlog du protocole « analyse d'athlète » (retour ami entraîneur, R10)

Couvert aujourd'hui : âge/taille/poids, blessures, dispo réelle, FTP/allure/CSS + méthode
de test, objectif A + profil de parcours, échéance, **volume récent 3-6 mois (rampe de
départ)**, **courses B/C datées**, %FTP expliqué (NP). Reste, par valeur décroissante :

- **FC max / FC repos → zones FC** : utile pour qui n'a ni capteur de puissance ni GPS
  précis — demande un rendu des séances en zones FC en plus des allures/watts.
- **Préférence de régulation par discipline** (Watts / FC / RPE) : changer l'UNITÉ
  d'affichage des consignes, pas le moteur.
- **VDOT** (à partir d'un chrono récent) : redondant avec l'allure seuil déjà collectée —
  n'ajouter que si un utilisateur réel le demande.
- **Profil aérobie « diesel / explosif »** : influencerait le dosage VO2 vs seuil ;
  demande un test ou un historique de courses pour être honnête.
- **Plan strict vs flexible** : l'app est déjà flexible (⇄, readiness, gel) — poser la
  question ne changerait que le ton des messages.
- **Créneaux des sorties longues + inventaire matériel** (home-trainer, capteurs) :
  affinage de placement, à traiter avec un vrai retour d'usage.

## 🧹 Dettes techniques assumées (documentées, pas urgentes)

- **Générateur legacy dans le HTML** : gelé, sert de repli si le bundle manque. Ne plus le
  faire évoluer ; le supprimer un jour quand le moteur V2 aura tourné en réel sans accroc.
- **Écart de métrique récup inter-blocs** : l'auditeur compte la récup entre répétitions,
  le générateur non — documenté dans ARCHITECTURE.md, ne PAS « corriger ».
- **Prédiction vélo sans chrono** : choix assumé (le chrono dépend du parcours) ; si un jour
  on collecte distance + D+ du parcours, un chrono devient possible.

## 📏 Règles d'entretien (pour toute session future)

1. Toute modification de `src/` → `npm run build:app` (sinon `check:app` rouge en CI).
2. Toute modification du générateur → les 9 contrôles CI doivent rester verts.
3. Tout invariant nouveau → identifiant `Cn`/`R3.x`/`V2.x` + scorer + registre ARCHITECTURE.md.
4. Mesurer avant de corriger — l'auditeur dit qui viole quoi.
5. `note.md` prime sur tout, y compris ce fichier.
