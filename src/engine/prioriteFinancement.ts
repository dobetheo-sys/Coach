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

/** Un créneau PROTÉGÉ par la politique : une séance non-récupération de la discipline
 *  limitante (« Nage vitesse », « Nage seuil », les continuités B-17… — jamais « Nage récup
 *  courte », qui est précisément ce qui doit payer en premier). La course objectif n'entre
 *  pas dans le raisonnement. */
export function estCreneauProtege(
  s: { d?: string; recovery?: boolean; race?: boolean },
  sport: string,
): boolean {
  const disc = disciplineLimitante(sport);
  return !!disc && s.d === disc && !s.recovery && !s.race;
}
