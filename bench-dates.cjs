/**
 * LES DATES DES BANCS — POINT UNIQUE (A-6).
 *
 * ================================================================================
 * POURQUOI CE FICHIER EXISTE
 * ================================================================================
 *
 * Une date en dur dans un banc est une bombe à retardement, et ce dépôt l'a payée
 * **six fois** avant d'en faire un chantier :
 *
 *   · `audit:r14` était rouge du lundi au jeudi et vert du vendredi au dimanche, à
 *     moteur inchangé (R20.7) ;
 *   · mon balayage de fréquence de C29 a vu sa médiane tomber de 75 % à 0 % parce
 *     que la course était passée du dimanche au lundi en franchissant minuit ;
 *   · l'assertion « le pourquoi est visible » de `smoke-r4` supposait que le jour
 *     courant portait une séance — un jour sur trois est un jour de repos ;
 *   · `audit:invariants` I13 était vert en CI le 02/08 et rouge en local le 03/08,
 *     à code identique (O-20) ;
 *   · `measure:fallback` suivait la déclaration et non le plan (R20.9) ;
 *   · la commande de vérification d'O-19 renvoyait 12/12 contre 30 % annoncés.
 *
 * Deux mécanismes distincts, souvent confondus :
 *
 *   1. **date RELATIVE** (`Date.now() + N jours`) → le JOUR DE LA SEMAINE dérive
 *      avec aujourd'hui. Or le jour de la course pilote la longueur de la dernière
 *      semaine (N2), donc la structure entière du plan.
 *   2. **date ABSOLUE** (`"2027-06-13"`) → le jour de la semaine est figé, mais
 *      l'HORIZON raccourcit d'une semaine toutes les semaines. L'allocation de
 *      phases bascule avec lui, et **le banc finit par LEVER** : mesuré, une fois
 *      l'horizon passé sous le minimum du format, `buildPlan` refuse l'entrée et
 *      le banc sort en exception non rattrapée. Un gate rouge pour une raison de
 *      calendrier, avec une trace de pile à la place d'un verdict.
 *
 * Échéances mesurées le 03/08/2026, avant ce lot :
 *
 *   | banc                     | horizon | marge avant la panne |
 *   |--------------------------|---------|----------------------|
 *   | `banc_invariants.cjs`    | 31 sem  | **9 semaines**       |
 *   | `banc_grand_public.cjs`  | 35 sem  | 13 semaines          |
 *   | `audit_amont.cjs`        | 44 sem  | 22 semaines          |
 *   | `scripts/goldenMaster`   | 44 sem  | 22 semaines          |
 *   | `bench_r14.cjs`          | 57 sem  | 35 semaines          |
 *
 * ================================================================================
 * LA RECETTE — elle règle les DEUX mécanismes d'un coup
 * ================================================================================
 *
 * `courseDans(N)` rend le dimanche qui tombe **exactement N semaines entières**
 * après le lundi de la semaine courante. Donc :
 *   · le jour de la semaine ne bouge JAMAIS (toujours un dimanche) — mécanisme 1 ;
 *   · l'horizon vaut TOUJOURS N semaines — mécanisme 2.
 *
 * C'est l'ancrage que R20.7 a posé sur `audit:r14` et qui l'a rendu vert les sept
 * jours ; il devient ici la règle du dépôt plutôt qu'un correctif local.
 *
 * `courseUn(N, jour)` sert aux bancs qui doivent EXERCER un jour de semaine précis
 * (la passe « course datée » du golden balaie les sept) : l'horizon reste ancré,
 * seul le jour varie, et il varie parce qu'on le demande — pas parce que le
 * calendrier a tourné.
 *
 * ================================================================================
 * CE QUE CE FICHIER N'EST PAS
 * ================================================================================
 *
 * Ce n'est pas une dépendance : les bancs restent des harnais INDÉPENDANTS du
 * moteur (c'est leur raison d'être — ils comparent le plan aux PROMESSES, pas à
 * l'auditeur interne). Ils partagent seulement la façon de dater, parce que la
 * dater deux fois c'est la dater deux fois FAUX (R11.1).
 */

/** Le lundi 00:00 UTC de la semaine courante — l'ancre de tout le reste. */
function lundiCourant() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

/** ISO du dimanche situé exactement `semaines` semaines après le lundi courant. */
function courseDans(semaines) {
  const d = lundiCourant();
  d.setUTCDate(d.getUTCDate() + semaines * 7 - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * ISO d'un jour CHOISI de la semaine, `semaines` semaines après le lundi courant.
 * `jour` : 1 = lundi … 7 = dimanche. Sert aux passes qui balaient volontairement
 * les sept jours (la longueur de la dernière semaine en dépend — N2).
 */
function courseUn(semaines, jour) {
  const d = lundiCourant();
  d.setUTCDate(d.getUTCDate() + (semaines - 1) * 7 + (jour - 1));
  return d.toISOString().slice(0, 10);
}

/** ISO du lundi courant — pour les bancs qui ont besoin d'un `plan_start` explicite. */
function departPlan() {
  return lundiCourant().toISOString().slice(0, 10);
}

module.exports = { lundiCourant, courseDans, courseUn, departPlan };
