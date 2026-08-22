# Le lien de la PWA — et comment vérifier qu'elle est à jour

**Fiche de référence** (pas un lot — d'où le numéro `00`). Mise à jour le 22/08/2026.

---

## Le lien

```
https://dobetheo-sys.github.io/Coach/
```

**Sur téléphone, elle s'installe comme une app native** — le navigateur propose « Installer
l'application » (Android/Chrome) ou « Sur l'écran d'accueil » (iPhone/Safari). Ni APK, ni store, et
elle marche **hors ligne** une fois ouverte (service worker, 63 fichiers précachés).

---

## État au 22/08/2026

```
dernier déploiement    5437dd5   ✅ success   22/08 15:26 UTC
version du cache       eb-pwa-0917866d525c · 63 assets
gates                  batterie 11/11 · E2E 25/25
```

⚠ Le run du commit précédent (`0711262`) apparaît **cancelled**, et c'est normal : le workflow
porte `concurrency: cancel-in-progress`, et la synthèse est arrivée 8 secondes après. **Le
déploiement réussi qui suit contient les deux commits** — un `cancelled` isolé dans l'historique
Pages n'est pas un échec de livraison tant qu'un `success` postérieur existe.

---

## Comment savoir si ce qu'on voit est bien la dernière version

Le cache est **cache-first** : un navigateur qui a déjà ouvert l'app sert sa copie locale jusqu'à
ce que la `VERSION` du service worker change. Deux conséquences pratiques :

```
la VERSION est DÉRIVÉE du contenu servi (O-24) — elle change si et seulement si un fichier change
`npm run check:sw` refuse un sw.js périmé, et c'est un gate CI
```

**Donc** : si l'app semble ne pas avoir bougé après un push, ce n'est pas le déploiement — c'est le
cache du navigateur, et l'app affiche un bandeau **« ✨ Nouvelle version prête »** quand le nouveau
service worker est installé et attend (S-CACHE : il ne prend jamais le contrôle en plein milieu
d'une session). Recharger valide la bascule.

Pour forcer sans attendre : recharge complète (Ctrl-Maj-R sur ordinateur), ou fermer/rouvrir l'app
installée.

---

## Le déploiement, en trois lignes

```
push sur main            →  .github/workflows/pages.yml
source                   →  le dossier endurabuild/  (la PWA, pas le monolithe)
Coach_Pro_V1.5.html      →  N'EST PAS déployé : moteur à jour, mais UI gelée à R4
```

⚠ **L'étape de déploiement est écrite à la main et non `actions/deploy-pages@v4`**, et la raison
est consignée : le 06/08/2026, le backend Pages mettait plus de 10 min à propager ; `deploy-pages`
plafonne son timeout à 600 000 ms et **annule** le déploiement à l'échéance. L'identifiant d'un
déploiement Pages étant le SHA du commit, l'état « annulé » colle au commit qui devient
indéployable — **trois SHA condamnés dans la journée**. L'étape actuelle fait la même chose mais
**n'annule jamais**.

---

## Le fichier autonome, si tu veux tester hors ligne d'un double-clic

```
npm run build:standalone   →  EnduraBuild-standalone.html   (ignoré par git)
```

23 modules ES en `Blob` + `importmap`, CSS et polices en `data:` — zéro requête réseau. Utile pour
montrer l'app sans connexion ; ce n'est pas ce qui est déployé.
