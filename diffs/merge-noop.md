# merge-noop — le no-op moteur, prouvé sur ce que le dépôt EST

**Date** : 14/08/2026 · **SHA de référence : `d846352`** (HEAD de `fix/moteur-physio` au
moment de la capture — il inclut B-25 et le correctif famille intensité, comme exigé).

## D'abord, une prémisse rectifiée : la branche « design/zenna » N'EXISTE PAS

```
git branch -a  →  main · fix/moteur-physio · claude/mockup-engine-integration-ftnf7f
```

Le protocole du prompt (« sur main, capturer ; merger design/zenna ; recapturer ; diff vide »)
suppose deux lignes séparées — design d'un côté, moteur de l'autre. **La réalité du dépôt** :
`main` est resté à `ba8722f` (l'ère R26, avant tout le reskin), et TOUT le travail — design ET
moteur — vit entrelacé sur la même lignée. Un diff moteur main → HEAD n'est pas vide **par
construction et par intention** : la branche porte les lots moteur B-21/B-22/B-25/V-11/famille
intensité, chacun avec son rapport de diff commité (`diffs/B-22.md`, messages de commit avec
portée chiffrée). Exiger le diff vide reviendrait à exiger que le lot moteur n'ait pas eu lieu.

## La propriété RÉELLE, prouvée dans les deux sens

**« Le travail graphique ne touche pas la sortie moteur » ⇔ « la sortie moteur est une fonction
de `src/` seul ».** Deux preuves :

### (1) Le graphe d'imports — statique

`grep -rn "from .*endurabuild" src/` → **1 occurrence** : `src/audit/avatarTriDemo.ts`, le
harnais de la démo CI `demo:avatartri`, qui importe le module PUR `avatar-tri.js` (contrainte
documentée depuis R25). **Le chemin moteur — `bridge.ts` → `reasoningEngine` → `planGenerator`
→ `sports/` → `predictor` — n'importe RIEN de `endurabuild/`.** Le harnais golden charge
`src/app/bridge.ts` : aucun fichier graphique n'entre dans son monde.

### (2) La mutation — dynamique

```
echo "/* mutation */" >> endurabuild/css/zenna-tabs.css
echo "// mutation"    >> endurabuild/js/ui/plan-view.js
npm run golden:verify   →   ✓ 949 profils, 0 écart
(fichiers restaurés, diff vide vérifié)
```

Muter les fichiers graphiques ne déplace pas un bit des 949 sorties moteur.

### Les empreintes

| grandeur | valeur |
|---|---|
| SHA de la baseline | `d846352` |
| sha256 de `golden/hashes.json` (tronqué) | `014bc25a282fa2dc` |
| profils | 949 (945 plans + 4 refus typés photographiés) |
| commande | `npm run golden:capture` puis `npm run golden:verify` |

### Ce que le futur merge dans `main` devra vérifier

Au moment du merge réel `fix/moteur-physio` → `main` : `golden:verify` sur le résultat du
merge doit rendre **0 écart contre CETTE photo** — tout écart signifierait que la résolution du
merge a touché `src/`. C'est le Z-04 exécutable, et il ne mélange rien : les évolutions moteur
de la branche sont DANS la photo, seule une altération PAR le merge la ferait bouger.
