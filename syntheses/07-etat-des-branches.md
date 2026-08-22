# Pas besoin de merge — sauf une branche, et elle demande un arbitrage

**Mesure du 22/08/2026** · aucune ligne de code touchée · `main` à `eaebfd7`

---

## 1. La réponse courte : non

On travaille **directement sur `main`**. Chaque lot est un commit poussé, et pousser `main` = déployer
(GitHub Pages). Il n'y a ni PR ni branche de travail dans ce flux, donc rien à merger.

```
main …… origin/main      0 en avance · 0 en retard      tout est poussé
```

---

## 2. Un incident de mécanique, dit plutôt que tu

Le disque local de la session était en retard de **5 commits** sur `origin/main` : `e3c44a0` en local
contre `eaebfd7` sur le remote. Le conteneur redémarre entre les tours et restaure un état antérieur.

**Rien n'est perdu, et c'est structurel** : les commits survivent parce qu'ils sont **poussés
immédiatement**. C'est précisément pourquoi chaque fichier est écrit dans le dépôt et poussé dans la
foulée plutôt que laissé sur le disque. Le remote fait foi ; le local se resynchronise
(`git reset --hard origin/main`, 0 en avance donc rien à sauver).

C'est la troisième occurrence de la session — et les deux précédentes s'étaient manifestées par un
push refusé ou un rebase à faire, jamais par une perte.

---

## 3. Quatre branches distantes, trois sont vides

```
fix/moteur-physio                          0 commit non mergé   (dernier 17/08)
claude/mockup-engine-integration-ftnf7f    0 commit non mergé   (dernier 13/08)
claude/new-session-uzmfdj                  0 commit non mergé   (dernier 09/08)
design/zenna                              16 commits NON MERGÉS (dernier 10/08)
```

Les trois premières sont entièrement contenues dans `main` : elles peuvent être supprimées sans rien
perdre. **`design/zenna` est la seule qui porte du travail**, et c'est un chantier complet : R25.1 à
R25.8, **37 fichiers, +1 955 / −410**.

---

## 4. `design/zenna` : l'essentiel est REFAIT dans `main`, mais pas tout

⚠ **Attention à la numérotation** : sur cette branche, « R25.x » désigne le portage de la maquette
Zenna ; dans `main`, « R25 » désigne l'avatar composite. **Deux R25 différents** — le signe que la
branche a divergé avant que `main` ne prenne son propre chemin sur le même sujet (R-ZENNA, v8, puis
V1 à V7).

### Ce qui est déjà dans `main`

```
zenna-tokens.css · zenna-tabs.css · zenna-today.css      présents
la couche motion                                         présente, sous le nom zenna-motion.js
ibm-plex-mono-400/700.woff2                              présents
```

### Ce qui est délibérément PÉRIMÉ sur la branche

```
bebas-neue-400.woff2        main a --zn-display: 'Poppins'  →  V7 a REMPLACÉ Bebas Neue
```

Merger la branche **réintroduirait une police que `main` a explicitement abandonnée**. Ce n'est pas
un conflit technique, c'est une régression de décision.

### Ce qui n'a PAS d'équivalent nommé dans `main`

```
ZENNA_SPEC_PAR_ONGLET.md            196 lignes · main a ZENNA_SPEC_COMPLETE / EXACTITUDE / INVENTAIRE

motion.js (branche)                 bindFormRing · drawCheckOnButton · bindStickyValidate
                                    revealWeather · bindHeroParallax
zenna-motion.js (main)              znHold · znRelease · znOn · znToast · znConfetti
                                    znXpFloat · znCountUp · znPlay
```

Les deux couches motion se **recouvrent partiellement** (`floatXP` ↔ `znXpFloat`,
`xpDelta` ↔ `znCountUp`) mais **cinq primitives de la branche n'ont pas d'homonyme dans `main`**.
Je n'ai pas vérifié si `znPlay`/`znOn` les couvrent génériquement — ça demande de lire les deux
implémentations, et c'est un travail à part.

---

## 5. Ce que je recommande

```
✗  merger design/zenna        conflit sur 37 fichiers + régression V7 (la police)
✓  décider explicitement      soit récupérer les morceaux utiles à la main, soit fermer la branche
✓  supprimer les trois autres  elles sont entièrement dans main, elles ne font qu'ajouter du bruit
```

**Je n'ai rien supprimé et rien mergé** : les quatre branches sont intactes. Fermer une branche qui
porte douze jours de travail est une décision, pas une opération de ménage — et la seule question qui
la tranche est : *les cinq primitives d'animation et la spec par onglet valent-elles d'être
récupérées ?*
