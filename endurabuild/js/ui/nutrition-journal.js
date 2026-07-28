// R4-1 — Journal alimentaire (onglet 📅 Semaine, carte repliable).
//
// PÉRIMÈTRE (frontière nutritionniste, inchangée) : c'est un JOURNAL — l'utilisateur
// note ce qu'il mange, l'app n'impose ni calories ni macros cibles. Le seul lien avec
// le moteur est le delta glucides autour de la séance (module ravitaillement existant,
// sessionNutrition) : « la séance vise X–Y g pendant l'effort / tu en as loggé Z ».
//
// MyFitnessPal : API privée sur candidature, portail fermé aux nouvelles demandes
// (vérifié — brief R4). On ne promet PAS de connexion directe : le pont réaliste est
// l'IMPORT CSV de l'export MFP (Compte → Export des données), parsé localement.
// Recherche d'aliments : Open Food Facts (API publique, sans clé) — équivalent ouvert.
import { $, S, ebSave, esc } from "../state.js";

const MEALS = [["petitdej", "Petit-déj"], ["dejeuner", "Déjeuner"], ["diner", "Dîner"], ["collation", "Collation"]];
const MEAL_LABEL = Object.fromEntries(MEALS);

function foodLog() {
  if (!S.answers.foodLog || typeof S.answers.foodLog !== "object") S.answers.foodLog = {};
  return S.answers.foodLog;
}
// Borne de rétention : 30 jours de journal (localStorage n'est pas infini).
function pruneLog() {
  const log = foodLog();
  const keys = Object.keys(log).sort();
  while (keys.length > 30) delete log[keys.shift()];
}

const n1 = (v) => (v == null || v === "" || !isFinite(+v) ? null : Math.round(+v * 10) / 10);

// Cible glucides PENDANT l'effort du jour, depuis le module ravitaillement existant.
function carbsTargetForDay(day) {
  if (!day || !globalThis.EBV2 || !globalThis.EBV2.sessionNutrition) return null;
  let lo = 0, hi = 0, any = false;
  for (const s of day.sessions) {
    const a = globalThis.EBV2.sessionNutrition(s, {});
    if (!a || !a.during.carbsGPerH) continue;
    const h = (s.min || 0) / 60;
    lo += Math.round(a.during.carbsGPerH[0] * h);
    hi += Math.round(a.during.carbsGPerH[1] * h);
    any = true;
  }
  return any ? { lo, hi } : null;
}

export function nutritionJournalHTML(day, todayISO) {
  const entries = foodLog()[todayISO] || [];
  const totals = entries.reduce((t, e) => ({ carbs: t.carbs + (e.carbs || 0), prot: t.prot + (e.prot || 0), fat: t.fat + (e.fat || 0), kcal: t.kcal + (e.kcal || 0) }), { carbs: 0, prot: 0, fat: 0, kcal: 0 });
  const target = carbsTargetForDay(day);
  let h = '<details class="load-card" id="njCard"><summary class="load-title">🍽 Journal alimentaire du jour' + (entries.length ? " (" + entries.length + ")" : "") + "</summary>";
  // Delta ravito — le SEUL croisement moteur/journal (jamais de cible calorique)
  if (target) h += '<div class="load-sub" style="margin-top:6px"><b>Glucides pendant l’effort du jour : ' + target.lo + "–" + target.hi + " g visés</b> (module ravitaillement) · " + Math.round(totals.carbs) + " g loggés au total aujourd’hui.</div>";
  if (entries.length) {
    MEALS.forEach(([mid, mlab]) => {
      const es = entries.filter((e) => e.meal === mid);
      if (!es.length) return;
      h += '<div style="margin-top:8px;font-weight:700;font-size:12px">' + mlab + "</div>";
      es.forEach((e) => {
        const idx = entries.indexOf(e);
        h += '<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;margin:3px 0;align-items:baseline"><span>' + esc(e.name) + (e.qty ? ' <span style="color:#999">(' + esc(e.qty) + "g)</span>" : "") + "</span>"
          + '<span style="white-space:nowrap">' + (e.carbs != null ? "G " + e.carbs + " · " : "") + (e.prot != null ? "P " + e.prot + " · " : "") + (e.fat != null ? "L " + e.fat + " · " : "") + (e.kcal != null ? e.kcal + " kcal " : "")
          + '<button class="doneBtn" data-nj-del="' + idx + '" type="button" title="Retirer">✕</button></span></div>';
      });
    });
    h += '<div style="margin-top:6px;font-size:12px;border-top:2px dashed #0003;padding-top:4px"><b>Total : ' + Math.round(totals.carbs) + " g glucides · " + Math.round(totals.prot) + " g protéines · " + Math.round(totals.fat) + " g lipides" + (totals.kcal ? " · " + Math.round(totals.kcal) + " kcal" : "") + "</b></div>";
  } else {
    h += '<div class="load-sub" style="margin-top:6px">Rien de noté aujourd’hui. Ajoute un repas ci-dessous, cherche un produit, ou importe ton export CSV MyFitnessPal.</div>';
  }
  // — Saisie manuelle + recherche Open Food Facts
  h += '<div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap"><input type="text" id="njSearch" placeholder="Chercher un aliment ou code-barres (Open Food Facts)" style="flex:1;min-width:150px"><button class="btn" id="njSearchBtn" type="button">🔍</button></div>'
    + '<div id="njResults" style="font-size:12px"></div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">'
    + '<select id="njMeal" class="opt" style="padding:6px 8px">' + MEALS.map(([v, l]) => '<option value="' + v + '">' + l + "</option>").join("") + "</select>"
    + '<input type="text" id="njName" placeholder="Aliment / repas" style="flex:1;min-width:110px">'
    + '<input type="number" id="njQty" placeholder="g" title="Quantité (g)" style="width:64px"></div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap"><input type="number" id="njCarbs" placeholder="Gluc. g" style="width:76px"><input type="number" id="njProt" placeholder="Prot. g" style="width:76px"><input type="number" id="njFat" placeholder="Lip. g" style="width:76px"><input type="number" id="njKcal" placeholder="kcal" style="width:76px"><button class="btn primary" id="njAdd" type="button">Ajouter</button></div>'
    + '<div id="njMsg" class="load-sub"></div></div>';
  // — Import CSV MyFitnessPal (le chemin réaliste : pas d'API publique MFP)
  h += '<div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    + '<label class="btn" style="cursor:pointer;margin:0">📥 Importer un export CSV MyFitnessPal<input type="file" id="njCsv" accept=".csv,text/csv" style="display:none"></label>'
    + '<span class="load-sub" style="margin:0">Compte → Réglages → Export des données. Lu ici, jamais envoyé.</span></div>'
    + '<div id="njCsvMsg" class="load-sub" style="margin-top:4px"></div>';
  h += '<div class="load-sub" style="margin-top:8px">Journal personnel : l’app ne fixe AUCUNE cible calorique ni macro — seul le ravitaillement d’effort est conseillé. Pour un plan alimentaire complet, vois un(e) nutritionniste.</div></details>';
  return h;
}

// Parse CSV minimal avec guillemets (l'export MFP en contient) — zéro dépendance.
function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (cell !== "" || row.length) { row.push(cell); rows.push(row); row = []; cell = ""; } }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function importMfpCsv(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return { days: 0, entries: 0, err: "CSV vide ou illisible." };
  const head = rows[0].map((c) => c.toLowerCase());
  const col = (rx) => head.findIndex((c) => rx.test(c));
  const iDate = col(/^date/), iMeal = col(/^meal/), iKcal = col(/calor/), iCarb = col(/carbo/), iProt = col(/^protein/), iFat = col(/^fat/);
  const iName = col(/^(food|name|note)/);
  if (iDate < 0) return { days: 0, entries: 0, err: "Colonne Date introuvable — est-ce bien l'export MFP ?" };
  const log = foodLog();
  const mealMap = { breakfast: "petitdej", lunch: "dejeuner", dinner: "diner", snacks: "collation", snack: "collation" };
  const days = new Set();
  let entries = 0;
  for (const r of rows.slice(1)) {
    const rawDate = (r[iDate] || "").trim();
    if (!rawDate) continue;
    // MFP exporte en YYYY-MM-DD (réglages récents) ou MM/DD/YYYY — normaliser
    let d = rawDate;
    const us = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (us) d = us[3] + "-" + us[1].padStart(2, "0") + "-" + us[2].padStart(2, "0");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    if (!log[d]) log[d] = [];
    const meal = mealMap[(r[iMeal] || "").trim().toLowerCase()] || "collation";
    const entry = {
      meal,
      name: iName >= 0 && r[iName] ? r[iName].trim() : "Import MFP (" + (MEAL_LABEL[meal] || meal) + ")",
      carbs: iCarb >= 0 ? n1(r[iCarb]) : null,
      prot: iProt >= 0 ? n1(r[iProt]) : null,
      fat: iFat >= 0 ? n1(r[iFat]) : null,
      kcal: iKcal >= 0 ? n1(r[iKcal]) : null,
      src: "mfp-csv",
    };
    // idempotent : ne pas dupliquer une ligne identique déjà importée
    if (!log[d].some((e) => e.src === "mfp-csv" && e.name === entry.name && e.kcal === entry.kcal && e.carbs === entry.carbs && e.meal === entry.meal)) {
      log[d].push(entry);
      entries++;
    }
    days.add(d);
  }
  pruneLog();
  return { days: days.size, entries };
}

export function bindNutritionJournal(day, todayISO, rerender) {
  const card = $("njCard");
  if (!card) return;
  // Garde l'état ouvert/refermé au re-rendu (le rerender reconstruit tout l'écran)
  if (S._njOpen) card.open = true;
  card.addEventListener("toggle", () => { S._njOpen = card.open; });

  document.querySelectorAll("#screen [data-nj-del]").forEach((b) => {
    b.onclick = () => {
      const entries = foodLog()[todayISO] || [];
      entries.splice(+b.dataset.njDel, 1);
      ebSave();
      rerender();
    };
  });
  const addBtn = $("njAdd");
  if (addBtn) addBtn.onclick = () => {
    const name = ($("njName").value || "").trim();
    if (!name) { $("njMsg").textContent = "Donne au moins un nom à ce que tu as mangé."; return; }
    const log = foodLog();
    if (!log[todayISO]) log[todayISO] = [];
    log[todayISO].push({ meal: $("njMeal").value, name, qty: n1($("njQty").value), carbs: n1($("njCarbs").value), prot: n1($("njProt").value), fat: n1($("njFat").value), kcal: n1($("njKcal").value) });
    pruneLog();
    ebSave();
    rerender();
  };
  const sBtn = $("njSearchBtn");
  if (sBtn) sBtn.onclick = async () => {
    const q = ($("njSearch").value || "").trim();
    const out = $("njResults");
    if (!q) return;
    out.innerHTML = "Recherche Open Food Facts…";
    try {
      let products = [];
      if (/^\d{8,13}$/.test(q)) { // code-barres
        const r = await fetch("https://world.openfoodfacts.org/api/v2/product/" + q + "?fields=product_name,brands,nutriments");
        const j = await r.json();
        if (j && j.product) products = [j.product];
      } else {
        const r = await fetch("https://world.openfoodfacts.org/cgi/search.pl?search_terms=" + encodeURIComponent(q) + "&search_simple=1&action=process&json=1&page_size=5&fields=product_name,brands,nutriments");
        const j = await r.json();
        products = (j && j.products) || [];
      }
      if (!products.length) { out.innerHTML = "Aucun produit trouvé — saisis les valeurs à la main."; return; }
      out.innerHTML = products.map((p, i) => {
        const nm = (p.product_name || "?") + (p.brands ? " · " + p.brands : "");
        const nu = p.nutriments || {};
        return '<button class="btn" data-nj-pick="' + i + '" type="button" style="display:block;width:100%;text-align:left;margin:3px 0;font-size:12px">' + esc(nm)
          + ' <span style="color:#777">(' + (nu["carbohydrates_100g"] != null ? "G " + Math.round(nu["carbohydrates_100g"]) : "?") + " / 100g)</span></button>";
      }).join("");
      document.querySelectorAll("[data-nj-pick]").forEach((b) => {
        b.onclick = () => {
          const p = products[+b.dataset.njPick];
          const nu = p.nutriments || {};
          const qty = parseFloat($("njQty").value) || 100;
          const per = (k) => (nu[k] != null && isFinite(+nu[k]) ? Math.round((+nu[k] * qty) / 100 * 10) / 10 : "");
          $("njName").value = p.product_name || "";
          if (!$("njQty").value) $("njQty").value = "100";
          $("njCarbs").value = per("carbohydrates_100g");
          $("njProt").value = per("proteins_100g");
          $("njFat").value = per("fat_100g");
          $("njKcal").value = per("energy-kcal_100g");
          $("njMsg").textContent = "Valeurs pré-remplies pour " + qty + " g — ajuste si besoin, puis Ajouter.";
        };
      });
    } catch (e) {
      out.innerHTML = "Open Food Facts injoignable (hors-ligne ?) — saisis les valeurs à la main.";
    }
  };
  const csv = $("njCsv");
  if (csv) csv.onchange = async () => {
    const f = csv.files && csv.files[0];
    if (!f) return;
    const msg = $("njCsvMsg");
    try {
      const res = importMfpCsv(await f.text());
      if (res.err) { msg.textContent = "⚠ " + res.err; return; }
      ebSave();
      msg.textContent = "✓ " + res.entries + " ligne(s) importée(s) sur " + res.days + " jour(s).";
      rerender();
    } catch (e) { msg.textContent = "⚠ Fichier illisible."; }
  };
}
