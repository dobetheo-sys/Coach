/**
 * QUI PAIE — LA POLITIQUE DE FINANCEMENT, ÉCRITE UNE FOIS (arbitrage fondateur, 18/08/2026,
 * QUI_PAIE_LA_CROISSANCE §2).
 *
 * Trois mécanismes d'arbitrage ont tapé la nage du triathlète sans qu'aucune règle ne l'ait
 * décidé : la coupe par `sessions_max` (O-66), le routage `doubles` qui remplit `facile2` de
 * récup, et l'équilibre des semaines à brick (mesuré : le brick porte un plancher audité haut,
 * la qualité nage n'a que des répétitions et des mètres compressibles — à cible fixe, c'est
 * TOUJOURS elle qui paie ; une politique de financement ACCIDENTELLE, « qui a un plancher ne
 * paie pas, qui n'en a pas paie tout »).
 *
 * La politique se pose donc UNE fois, ici, et s'applique en deux points étagés par rayon
 * d'explosion : le financement de la croissance et l'orientation des coupes (maintenant,
 * périmètre étroit), puis la coupe par `sessions_max` (O-66, 98 % des retraits sur sept
 * sports). Contrainte de fond, verbatim : *« la croissance d'un type ne se finance jamais sur
 * un créneau de qualité de la discipline limitante. Si le brick doit grandir et que seule la
 * nage peut payer, c'est que le volume total est trop bas — et c'est le plafond structurel
 * qu'il faut lever, pas la nage qu'il faut vider. »*
 *
 * L'ordre du fondateur (déjà au registre, O-66) : *ne se coupe jamais* — séance principale de
 * la discipline limitante, séances spécifiques de course, paliers B-17 ; *se coupe en
 * premier* — récupération, mobilité, complément dans une discipline non limitante.
 */

/** La discipline LIMITANTE d'un sport multi-discipline — celle dont la faiblesse coûte le plus
 *  cher en risque, pas en chrono (ALLOCATION_PAR_SPORT §3 : les deux sens de « limitant »).
 *  tri : la nage — la discipline de la CONTINUITÉ (B-17) et du risque en eau libre, celle où
 *  « une mauvaise nage ne coûte pas trois minutes, elle peut coûter la course ».
 *  duathlon : la course — l'épreuve commence et finit à pied (R5.2, D-DISC).
 *  swimrun : NULL, mesuré — ma première écriture disait « sw » et le banc v7 l'a réfutée en
 *  naissant (S-RUN-STARVED 5 → 8 : protéger la nage y affame la course). En swimrun la
 *  répartition suit l'ÉPREUVE (S13 : 45 à 94 % de course selon la course visée), une constante
 *  de discipline y est la faute exacte que S13 a corrigée. Le jour où la politique doit y
 *  exister, elle se dérive de `raceRunShare`, jamais d'une table.
 *  Mono-sport : null — « limitante » n'a de sens qu'en multi-discipline ; la protection des
 *  séances d'un mono-sport passe par d'autres règles (C13d, planchers de séance). */
export function disciplineLimitante(sport: string): string | null {
  return sport === "tri" ? "sw" : sport === "duathlon" ? "rn" : null;
}

/** LE CANAL — sur QUEL AXE un type doit être protégé (arbitrage fondateur « DEUX CANAUX »,
 *  18/08/2026). L'inventaire des planchers (O-73) a montré qu'un plancher de MINUTES ne protège
 *  pas : il change la MONNAIE du paiement — « Footing facile » garde 100 % de sa taille et perd
 *  83 % de ses occurrences, parce qu'un type qui ne peut plus rétrécir ne peut plus que
 *  disparaître. Protéger « la qualité de la discipline limitante » sans dire SUR QUEL AXE laisse
 *  donc le mécanisme choisir, et il choisira celui qui l'arrange.
 *
 *      la valeur du type est sa DURÉE      → protéger la TAILLE
 *        brick, sortie longue, continuité B-17 — une simulation de course amputée
 *        ne simule plus rien
 *
 *      la valeur du type est sa FRÉQUENCE  → protéger l'OCCURRENCE
 *        qualité nage, éducatifs, renforcement — une compétence se construit par la
 *        répétition : quatre séances de vingt minutes valent mieux que deux de quarante
 *
 *  La sortie longue de la course est protégée sur les DEUX axes, et c'est cohérent : sa valeur
 *  est sa durée ET elle doit avoir lieu. */
export type CanalProtection = "taille" | "occurrence";

/** ⚠ UN ENSEMBLE, PAS UN CHOIX — et c'est une mesure qui l'a imposé. Ma première écriture
 *  rendait UN canal et testait la taille d'abord : une continuité de nage devenait « taille » et
 *  PERDAIT du même coup sa protection d'occurrence — **84 profils du golden déplacés**. Le
 *  modèle du fondateur le disait déjà : la sortie longue est protégée sur les DEUX axes, « sa
 *  valeur est sa durée ET elle doit avoir lieu ». Un type peut donc porter les deux, et les
 *  deux tests sont indépendants. */
export function canauxProteges(
  s: { d?: string; recovery?: boolean; race?: boolean; long?: boolean; brick?: boolean; name?: string },
  sport: string,
): CanalProtection[] {
  const out: CanalProtection[] = [];
  // la durée EST le stimulus (I14) · une continuité amputée n'est plus une continuité (B-17)
  if (s.long || s.brick || /continu/i.test(s.name || "")) out.push("taille");
  const disc = disciplineLimitante(sport);
  if (disc && s.d === disc && !s.recovery && !s.race) out.push("occurrence");
  return out;
}

/** Un créneau PROTÉGÉ par la politique : une séance non-récupération de la discipline
 *  limitante (« Nage vitesse », « Nage seuil », les continuités B-17… — jamais « Nage récup
 *  courte », qui est précisément ce qui doit payer en premier). La course objectif n'entre
 *  pas dans le raisonnement. */
export function estCreneauProtege(
  s: { d?: string; recovery?: boolean; race?: boolean; long?: boolean; brick?: boolean; name?: string },
  sport: string,
): boolean {
  // Les passes qui l'appellent retirent des SÉANCES : c'est le canal OCCURRENCE, et il se lit
  // désormais sur `canalProtege` au lieu d'être réécrit ici — un seul point, une seule règle.
  return canauxProteges(s, sport).includes("occurrence");
}

/** CE QUI N'EST JAMAIS UNE VICTIME — le PLANCHER ABSOLU de la politique, en UN endroit.
 *
 *  Écrit le 18/08/2026 après le balayage demandé par le fondateur (« INVENTAIRE DES PLANCHERS »
 *  §3 : *« qu'est-ce qui protège la semaine de course, l'affûtage et la veille — et est-ce une
 *  borne, ou un ordre de passage ? »*). Réponse mesurée : **DIX sites élisent une victime par
 *  minimum de minutes, et chacun portait SA PROPRE liste d'exclusions.** Deux d'entre eux
 *  pouvaient encore supprimer le déverrouillage de la veille (`repairLoop`, passes « saut de
 *  charge lissé » et « l'affûtage ne remonte jamais ») — dont un que j'avais annoncé fermé la
 *  veille : mon `replace(…, 1)` n'avait patché que la première de deux chaînes IDENTIQUES.
 *
 *  C'est la protection PAR LE CHEMIN que le fondateur nomme : elle tient tant que les dix
 *  chemins pensent à la même chose, et un lot sans rapport suffit à en désaligner un. Le
 *  correctif n'est donc pas un onzième patch, c'est de retirer la duplication — même
 *  raisonnement que `npm run casser` : ne pas compter sur la discipline là où un mécanisme
 *  suffit.
 *
 *  Le prédicat porte le plancher ABSOLU (repos · course · veille), pas les orientations : les
 *  exclusions `s.long`/`s.brick` restent locales, parce qu'elles ne valent pas partout (une
 *  passe d'affûtage qui coupe des JOURS n'a pas les mêmes victimes qu'une passe qui coupe des
 *  SÉANCES). Ajouter ici ce qui n'est pas universel changerait le comportement de sept sites
 *  corrects pour en réparer deux.
 *
 *  Pourquoi ces trois-là et pas d'autres : leur point commun est d'être COURTS PAR CONCEPTION —
 *  la course vaut `min: 0` (R13.4), la veille ≤ 25 min (R13.4-C2), le repos 0 — donc toute règle
 *  « retirer la plus petite » les élit en premier. Ce sont aussi les trois dont l'erreur ne se
 *  rattrape pas : une séance perdue en semaine 5 se rattrape sur trente-cinq semaines, une
 *  séance perdue la veille du départ, jamais.
 *
 *  ⚠ BORNÉ À CE QUE LE DÉFAUT RÉCLAME, et c'est une mesure qui l'a décidé. Ma première
 *  écriture couvrait aussi « Endurance allégée (avant course) » (la séance de J-2/J-3), par
 *  symétrie apparente avec la veille. Mesuré : la grandeur qui compte — le nombre de plans
 *  arrivant au départ après un trou ≥ 3 jours — est **IDENTIQUE avant et après (1 sur 132,
 *  le même profil)**, tandis que le golden bougeait de **28 profils**. Une règle qu'aucun
 *  défaut mesuré ne réclame est une règle qui en crée un (leçon R16.10, où la règle miroir a
 *  été écrite, mesurée, puis RETIRÉE). Le site qui protégeait déjà « avant course » le fait
 *  toujours, localement — on ne retire rien à personne. */
export function estIntouchable(s: { d?: string; race?: boolean; name?: string }): boolean {
  return s.d === "rs" || !!s.race || /Déverrouillage/i.test(s.name || "");
}

/** La même chose au niveau du JOUR : un jour qui porte la course ou la veille n'est pas une
 *  victime. Le repos en est volontairement absent — les passes qui coupent des jours filtrent
 *  déjà les jours vides (`d.sessions.some((s) => s.d !== "rs")`), et l'inclure ici a été
 *  MESURÉ : il déplaçait 28 profils du golden en excluant des jours mixtes. Deux formes pour un
 *  seul prédicat, parce que les passes travaillent à deux granularités — pas deux règles. */
export function jourIntouchable(d: { sessions?: { d?: string; race?: boolean; name?: string }[] }): boolean {
  return (d.sessions || []).some((s) => s.d !== "rs" && estIntouchable(s));
}
