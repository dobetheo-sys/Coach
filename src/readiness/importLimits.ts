/**
 * S-8 — LES BORNES DE L'IMPORT DE FICHIERS (grille de sécurité, §8).
 *
 * ================================================================================
 * CE QUE ÇA PROTÈGE, ET CE QUE ÇA NE PROTÈGE PAS
 * ================================================================================
 *
 * Les trois parseurs du dépôt (FIT, GPX, TCX) sont écrits ici, sans dépendance :
 * il n'y a donc **aucune bibliothèque tierce à mettre en bac à sable**, et aucun
 * contenu n'est jamais évalué — le point 8.2 de la grille est réglé par
 * construction, pas par une mesure.
 *
 * Restait le point 8.1, et il manquait vraiment : **aucune borne de taille.** Un
 * GPX de 500 Mo fige l'onglet le temps que le balayage de points se termine, et
 * mon propre parseur GPX itère sur tous les points sans plafond. Ce n'est pas une
 * faille — l'app est locale, il n'y a pas de serveur à saturer, et le fichier
 * vient de l'athlète lui-même. C'est un **déni de service contre soi-même**, avec
 * le pire symptôme possible : une app qui ne répond plus, sans un mot.
 *
 * La borne est donc là pour DIRE quelque chose, pas pour se défendre d'un
 * attaquant. Le refus nomme la taille et le plafond.
 *
 * ================================================================================
 * POURQUOI 25 Mo
 * ================================================================================
 *
 * Un FIT d'activité fait quelques dizaines de kilo-octets ; une longue sortie très
 * échantillonnée, quelques centaines. Un GPX est plus verbeux (XML) : une trace
 * d'ultra à la seconde monte à quelques mégaoctets. 25 Mo laisse passer très
 * largement le pire cas légitime — un fichier au-dessus n'est pas une séance, c'est
 * une erreur de sélection ou un export de saison entière.
 *
 * La borne vit ICI et pas dans chaque appelant : trois copies d'un plafond, ce
 * sont trois plafonds qui divergeront (R11.1).
 */

/** Plafond de taille d'un fichier d'activité importé. Voir l'en-tête pour le choix. */
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

/** Erreur typée — l'athlète doit pouvoir la lire, pas un développeur. */
export class EBImportTooLarge extends Error {
  code = "IMPORT_TROP_GROS";
  human: string;
  constructor(nom: string, taille: number) {
    const mo = (n: number) => (n / (1024 * 1024)).toFixed(1).replace(".", ",");
    super("IMPORT_TROP_GROS " + nom + " = " + taille + " octets");
    this.name = "EBImportTooLarge";
    this.human = "« " + nom + " » fait " + mo(taille) + " Mo, au-delà de la limite de "
      + mo(MAX_IMPORT_BYTES) + " Mo. Un fichier d'activité en fait quelques centaines de kilo-octets : "
      + "vérifie que c'est bien une séance et pas un export complet.";
  }
}

/**
 * Lève si le fichier dépasse le plafond. Appelée AVANT toute lecture ou analyse —
 * contrôler après avoir tout parcouru ne protège de rien, c'est le parcours qui coûte.
 */
export function assertImportSize(nom: string, taille: number): void {
  if (isFinite(taille) && taille > MAX_IMPORT_BYTES) throw new EBImportTooLarge(nom, taille);
}
