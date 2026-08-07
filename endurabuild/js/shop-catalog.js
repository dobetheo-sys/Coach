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
