// Canal de vente — catégorisation générique + catalogue produit.
// Frontière : ce module ne touche JAMAIS engine.js et n'est jamais importé par lui.
// engine.js produit un besoin (g/h, ml/h) ; ce module décide quelle CATÉGORIE
// générique correspond, puis quel produit réel (ou aucun) y répond.

/**
 * Catégorise un besoin de ravitaillement en catégorie produit générique.
 * Entrée : `during` tel que rendu par sessionNutrition() — { carbsGPerH, drinkMlPerH, ... }.
 * Fonction PURE : mêmes entrées → même sortie, aucun effet de bord, jamais de I/O.
 */
export function productCategoryFor(during) {
  if (!during || !Array.isArray(during.carbsGPerH)) return null;
  const g = during.carbsGPerH[1] ?? during.carbsGPerH[0] ?? 0;
  if (g >= 60) return "gel_renforce";
  if (g >= 30) return "gel_standard";
  return null; // sous 30 g/h : l'eau suffit, aucune reco produit
}

/**
 * Le SEUL endroit où un produit réel (nom, lien, prix) existe dans toute l'app.
 * Toute entrée à `null` = catégorie identifiée mais pas encore de produit à vendre :
 * le rendu doit alors proposer la liste d'attente, jamais un lien cassé.
 */
export const CATALOG = {
  gel_standard: null, // { name, url, priceEUR } une fois le fournisseur validé
  gel_renforce: null,
};

export const CATEGORY_LABELS = {
  gel_standard: "gel énergétique",
  gel_renforce: "gel énergétique renforcé",
};

/**
 * LE GEL ZENNA — l'identité du produit, telle que les maquettes du fondateur la fixent
 * (12/08/2026). C'est ici et nulle part ailleurs : le dessin du sachet, les puces de choix, le
 * devis et les arguments de la carte lisent TOUS cette table (R11.1). Une saveur ajoutée
 * demain se dessine, se choisit et se chiffre sans qu'aucun autre fichier ne bouge.
 *
 * CE QUE CETTE TABLE N'EST PAS : une mise en vente. `CATALOG` reste à `null` — il n'y a ni
 * fournisseur, ni prix ferme, ni expédition, et `submitOrder` ne fait toujours aucune requête.
 * On décrit un produit DESSINÉ, pas un produit DISPONIBLE ; la carte continue de le dire.
 *
 * DEUX ENCRES PAR SAVEUR, et ce n'est pas de la coquetterie : `bloc` est la couleur vive de la
 * maquette (le pan diagonal, la pastille de saveur), `texte` est sa version assombrie pour
 * écrire SUR le crème du sachet. Mesuré : l'olive du citron (#b4c223) rend 3,08:1 sur le crème,
 * sous le seuil AA de 4,5. Garder une seule couleur obligeait à choisir entre la maquette et la
 * lisibilité — les séparer permet de tenir les deux.
 */
export const GEL_ZENNA = {
  nom: "Zenna gel glucide",
  glucidesG: 30,
  poidsNetG: 40,
  kcal: 120,
  creme: "#f2ece1",   // le corps du sachet
  encreSombre: "#14140f", // le bandeau bas
  saveurs: {
    "citron":        { libelle: "Citron",        arome: "Arôme naturel", bloc: "#b4c223", texte: "#5f6a0c" },
    "cola":          { libelle: "Cola",          arome: "Arôme naturel", bloc: "#6b3a1c", texte: "#5c3317" },
    "fruits rouges": { libelle: "Fruits rouges", arome: "Arôme naturel", bloc: "#d81f4a", texte: "#a81234" },
    "neutre":        { libelle: "Neutre",        arome: "Sans arôme",    bloc: "#8c8c8c", texte: "#5a5a5a" },
  },
};

/** La saveur dessinable, ou `null`. « peu d'importance » est un choix VALIDE du questionnaire
 *  mais ne correspond à aucun sachet : on ne fabrique pas un visuel pour une non-préférence. */
export function saveurGel(nom) {
  return (GEL_ZENNA.saveurs && GEL_ZENNA.saveurs[nom]) || null;
}
