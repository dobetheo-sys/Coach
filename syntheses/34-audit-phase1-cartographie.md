# 34 — Audit du moteur, Phase 1 : la cartographie est livrée

**Brief 36** · 25/08/2026 · **aucune ligne de code modifiée**, `src/` byte-identique ·
livrable : **`AUDIT_PHASE1_CARTOGRAPHIE.md`** (627 lignes)

---

## Ce que le document contient

Une carte **réponse → paramètre → contrainte → séance**, lisible sans lire le code, en sept
parties : les six étages du moteur · les 64 questions une par une (nature, domaine, défaut,
lecteurs réels, couverture) · les six chaînes de décision qui portent l'essentiel · le
vocabulaire de séances **mesuré** sport par sport · une table de correspondance de 20 entrées ·
les points d'attention · la couverture du corpus.

**Rien n'y est affirmé par lecture.** Les tableaux de questions, de vocabulaire et de couverture
sont produits en exécutant le moteur sur les **1 016 profils** ; les constantes sont importées
du module, pas recopiées.

## Les cinq faits qui ressortent de la mesure

1. **`activity` est posée à l'athlète et n'a AUCUN lecteur** — 0 occurrence dans les deux
   fichiers de nutrition. Le banc de sensibilité l'exempte au motif « N8/N9 — estimation de
   dépense » ; or l'estimateur applique une bande d'activité **constante** (1,35-1,55),
   identique pour un sédentaire et pour un actif. **L'exemption dit ce que la clé devrait faire,
   pas ce que le code fait.**
2. **`level` est déclarée `estimee`** — le contrat pose qu'une `estimee` ne pilote pas une
   grandeur numérique — **et elle pilote trois constantes chiffrées** (temps dur 25 min, séance
   nage 850 m, longue 180 min). La règle et l'usage divergent ; l'arbitrage est peut-être bon
   (un plafond vers le bas n'est pas une promesse de performance) mais il n'est écrit nulle part.
3. **Onze constantes structurantes portent leur justification sans référence externe** —
   `C22` (+10 %/sem), `RECUP_WEEK_FACTOR` (0,62), le plafond de dur (60/25 min), les poids de
   discipline (1 / 0,75 / 0,5), `SWIM_TIME_FACTOR`, `ALLOC_CIBLE`… Ce sont les nombres à faire
   relire en priorité en Phase 2. Celles qui SONT sourcées le sont bien (Bosquet, Riegel,
   Coggan, Martin, Nielsen, Barnes & Kilding, Plews, ACSM/ISSN/Jeukendrup, FAO/WHO).
4. **`ALLOC_CIBLE` n'existe que pour le triathlon.** Duathlon et swimrun sont multi-disciplines
   et n'ont aucune cible de répartition : ce qu'ils livrent (duathlon 42/41/17, swimrun
   42/33/25) est une conséquence du schéma, pas une intention.
5. **La couverture du corpus est de 55 %** (2 297 cellules décisionnelles sur 4 192).
   **19 clés n'apparaissent dans aucun profil** et **24 n'ont qu'une seule valeur** — dont
   `ftp_known`, `pace_known` et `css_known`, tous à « oui » sur les 1 016 : **le chemin « je ne
   connais pas ma référence », celui qui bascule tout le moteur sur la fréquence cardiaque et le
   ressenti, n'est photographié par aucun plan du golden.**

## Une affirmation écrite puis RÉFUTÉE avant publication

J'avais noté que `C26_EASY_SHARE_MIN` (60 %) et `C26d_MOD_SHARE_MAX` (40 %) « sommaient à 100 %
et ne laissaient rien au dur ». **C'est faux** : l'un est un plancher sur le facile, l'autre un
plafond sur le modéré — 60 / 0 / 40 les satisfait tous les deux. Elle reste écrite dans le
document, réfutée, parce qu'un relecteur externe produira le même faux positif et qu'il vaut
mieux qu'il soit déjà traité. Même chose pour la fenêtre de nage du débutant : ma première
version disait 100 m, la vraie est **250 m** (le plancher débutant vaut 600, pas 750).

## Ce qui n'y est pas, volontairement

Aucun jugement physiologique — le brief l'interdit et c'est l'objet de la Phase 2. Aucun
correctif. Et une limite déclarée : le détail **bloc par bloc** d'une séance (échauffement,
corps, retour au calme, récupération inter-blocs) n'est pas cartographié ; il mérite sa propre
carte si la Phase 2 la demande.

## Vérifications

```
src/                  0 ligne modifiée
mesures               1 016 profils · 64 clés du contrat · 61 constantes importées
                      couverture:golden 2 297/4 192 cellules
outils utilisés       exécution du moteur (jamais la lecture seule) · couverture:golden
```
