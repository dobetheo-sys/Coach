// Hors classement (audit 05) — servi UNIQUEMENT aux navigateurs sans modules ES (attribut
// `nomodule`) : iOS < 14, Chrome < 85, Safari < 14. Pour eux l'app est une page blanche, sans
// un mot ; ce fichier est en ES5 volontairement (pas de flèche, pas de `let`) pour être lu par
// ces mêmes navigateurs. Il n'est jamais exécuté ailleurs.
(function () {
  var s = document.getElementById("screen");
  var msg = "Zenna a besoin d\u2019un navigateur plus r\u00e9cent (iOS 14, Chrome 85 ou \u00e9quivalent). Ton plan n\u2019est pas perdu : mets ton navigateur \u00e0 jour, puis rouvre cette page.";
  if (s) { s.textContent = msg; s.style.padding = "24px"; }
  else { document.body.insertAdjacentHTML("afterbegin", "<p style=\"padding:24px;font-family:sans-serif\">" + msg + "</p>"); }
})();
