#!/usr/bin/env node
/* Audit "Coach de Charge" — EnduraBuild
   Lance 486 combinaisons et mesure la cohérence volume réel vs déclaré
   Parseurs réels pour somme séances (N×M min + ech/rc), pas max isolé
*/

const fs = require('fs');
const path = require('path');

// Stub minimal DOM pour eval indirect
global.document = {
  getElementById: (id) => ({ innerHTML: '', className: '', dataset: {}, innerHTML: '', textContent: '', querySelectorAll: () => [] }),
  querySelectorAll: () => [],
  body: { appendChild: () => {}, removeChild: () => {}, dataset: {} },
  createElement: (tag) => ({ href: '', download: '', click: () => {} })
};
global.window = { scrollTo: () => {} };
global.Blob = function(data) { return data; };
global.URL = { createObjectURL: () => 'blob:', revokeObjectURL: () => {} };

// Charger eb_core.js via eval indirect (retient les exports)
const coreCode = fs.readFileSync(path.join(__dirname, 'eb_core.js'), 'utf-8');
(0, eval)(`(function() { ${coreCode}; global.SPORTS = SPORTS; global.buildPlan = buildPlan; global.hrZones = hrZones; global.bikeZones = bikeZones; global.runZones = runZones; global.swimZones = swimZones; })()`);

const SPORTS = global.SPORTS;
const buildPlan = global.buildPlan;

// Parseurs réels pour séances
function parseSessionDetail(det, sportKey) {
  if (!det || typeof det !== 'string') return { minutes: 0, meters: 0 };

  let minutes = 0, meters = 0;

  // Parse minutes : "Xcmin" ou "X min" ou "X×Ymin" → somme
  // Aussi capture les PLAGES "40-50min" → moyenne

  // 1. Plages "40-50min" → moyenne
  const rangeMatches = det.match(/(\d+)\s*-\s*(\d+)\s*min/gi);
  if (rangeMatches) {
    rangeMatches.forEach(m => {
      const nums = m.match(/\d+/g).map(Number);
      if (nums.length === 2) {
        const avg = Math.round((nums[0] + nums[1]) / 2);
        minutes += avg;
      }
    });
  }

  // 2. Répétitions "N×Mmin"
  const repMatches = det.match(/(\d+)\s*(?:×|x)\s*(\d+)\s*min/gi);
  if (repMatches) {
    repMatches.forEach(m => {
      const [n, d] = m.match(/\d+/g).map(Number);
      minutes += n * d;
    });
  }

  // 3. Valeurs simples "60min", "45min" (hors plages déjà traitées)
  const singleMin = det.match(/\b(\d+)\s*min(?!\s*-|@)/gi);
  if (singleMin) {
    singleMin.forEach(m => {
      const n = parseInt(m);
      // Éviter les doubles comptes
      const isRange = det.includes(`${n}-`) || det.includes(`-${n}`);
      if (!isRange && (!repMatches || !m.match(/\d+\s*×/) && !m.match(/×\s*\d+/))) {
        minutes += n;
      }
    });
  }

  // Parse mètres : "Xm" ou "X×Ym" (nage)
  // Aussi capture les PLAGES "600-1400m" → moyenne
  // ATTENTION: ignorer les "m" dans les allures du type "1'51/100m"

  // 1. Plages "600-1400m" (hors contexte allure)
  const meterRangeMatches = det.match(/(?<!\d[/:])(\d+)\s*-\s*(\d+)\s*m\b(?!\/)/gi);
  if (meterRangeMatches) {
    meterRangeMatches.forEach(m => {
      const nums = m.match(/\d+/g).map(Number);
      if (nums.length === 2 && nums[0] < nums[1]) { // éviter inverse "51m-100m" du CSS
        const avg = Math.round((nums[0] + nums[1]) / 2);
        meters += avg;
      }
    });
  }

  // 2. Répétitions "N×Ym" (hors contexte allure)
  const meterRepMatches = det.match(/(\d+)\s*(?:×|x)\s*(\d+)\s*m\b(?!\/)/gi);
  if (meterRepMatches) {
    meterRepMatches.forEach(m => {
      const [n, d] = m.match(/\d+/g).map(Number);
      // Vérifier que ce n'est pas dans un contexte CSS ("100m/1'45")
      if (!det.includes(`${d}m/`) && !det.includes(`/${d}m`)) {
        meters += n * d;
      }
    });
  }

  // 3. Valeurs simples "Xcm" ou "X×Xcm" au début/seul:
  // "1500m @" ou "3000m et" mais JAMAIS après "/" (allure)
  const singleMeter = det.match(/\b(\d{3,})\s*m(?!\s*\/)\b/gi);
  if (singleMeter) {
    singleMeter.forEach(m => {
      const n = parseInt(m);
      const isRange = det.includes(`${n}-`) || det.includes(`-${n}`);
      const isRep = det.includes(`${n}×`) || det.includes(`×${n}`);
      const isAllure = det.includes(`/${n}m`) || det.includes(`${n}m/`);
      if (!isRange && !isRep && !isAllure) {
        meters += n;
      }
    });
  }

  // Ajouter échauffement/retour au calme estimés
  if (sportKey === 'sw' && minutes === 0 && meters > 0) {
    minutes += 3; // très court pour warm/cool
  }
  if (sportKey === 'sw' || sportKey === 'rn' || sportKey === 'bk') {
    if (det.includes('Échauffement') || det.includes('échauffement')) minutes += 5;
    if (det.includes('Retour au calme') || det.includes('retour au calme')) minutes += 5;
  }

  return { minutes, meters };
}

function parseDayVolume(day) {
  let totalMinutes = 0, totalMeters = 0;

  if (!day.sessions || day.sessions.length === 0) return { minutes: 0, meters: 0 };

  day.sessions.forEach(sess => {
    if (sess.d === 'rs') return; // repos, ne compte pas
    const p = parseSessionDetail(sess.det, sess.d);
    totalMinutes += p.minutes;
    totalMeters += p.meters;
  });

  return { minutes: totalMinutes, meters: totalMeters };
}

function parseWeekVolume(week) {
  let totalMinutes = 0, totalMeters = 0;

  week.days.forEach(day => {
    const v = parseDayVolume(day);
    totalMinutes += v.minutes;
    totalMeters += v.meters;
  });

  // Convertir mètres nage en heures (vitesse moyenne ~2min/100m ≈ 3km/h)
  let swimHours = 0;
  if (totalMeters > 0) {
    swimHours = (totalMeters / 1000) / 3; // km / 3 km/h
  }

  const totalHours = (totalMinutes / 60) + swimHours;
  return { minutes: totalMinutes, meters: totalMeters, hours: totalHours };
}

function findPeakWeek(weeks) {
  if (!weeks || weeks.length === 0) return null;
  let peakIdx = 0, peakVol = 0;
  weeks.forEach((w, i) => {
    if (w.vol > peakVol) {
      peakVol = w.vol;
      peakIdx = i;
    }
  });
  return peakIdx;
}

function computeRatio(realVol, declaredVol) {
  if (declaredVol === 0) return realVol === 0 ? 1.0 : 999;
  return realVol / declaredVol;
}

// Générateur de combinaisons
function* generateCombinations() {
  const sports = ['run', 'bike', 'swim', 'tri'];

  const formats = {
    run: ['5k', '10k', 'semi', 'marathon', 'trail'],
    bike: ['crit', 'route', 'cyclo', 'clm', 'gravel'],
    swim: ['sprint', 'demifond', 'fond', 'ow'],
    tri: ['S', 'M', '70.3', 'Full']
  };

  const histories = ['reprise', 'confirme', 'ancien'];
  const levels = ['debutant', 'inter', 'avance'];
  const intents = ['competition', 'finir', 'plaisir'];

  for (const sport of sports) {
    for (const fmt of formats[sport]) {
      for (const hist of histories) {
        for (const level of levels) {
          for (const intent of intents) {
            yield { sport, format: fmt, history: hist, level, intent };
          }
        }
      }
    }
  }
}

// Lancer l'audit
const results = {};
let count = 0, errors = 0;

for (const combo of generateCombinations()) {
  count++;

  try {
    // Réponses minimales pour buildPlan
    const answers = {
      sport: combo.sport,
      format: combo.format,
      intent: combo.intent,
      level: combo.level,
      history: combo.history,
      age: 35,
      sex: 'H',
      sessions_max: '7',
      vol_max: '10',
      dispo: 'semaine',
      doubles: 'non',
      off_days: 'non',
      ftp_known: 'non',
      pace_known: 'non',
      css_known: 'non',
      injury: 'aucune',
      med_pain: 'non',
      med_dizzy: 'non',
      med_treat: 'non'
    };

    // Adapter selon le sport
    if (combo.sport === 'run') {
      answers.terrain = 'route';
    } else if (combo.sport === 'bike') {
      answers.terrain = 'plat';
      answers.epreuve = combo.format;
    } else if (combo.sport === 'swim') {
      answers.milieu = 'bassin';
      answers.swim_limit = 'endurance';
    } else if (combo.sport === 'tri') {
      answers.terrain = 'plat';
      answers.milieu = 'bassin';
    }

    const plan = buildPlan(answers);

    // Trouver semaine du pic
    const peakIdx = findPeakWeek(plan.weeks);
    const peakWeek = plan.weeks[peakIdx];

    // Parser volume réel de la semaine du pic
    const realVol = parseWeekVolume(peakWeek);
    const declaredVol = peakWeek.vol; // volume déclaré par le moteur

    // Calculer ratio
    const ratio = computeRatio(realVol.hours, declaredVol);

    // Part séance longue — détection par tag moteur (long:true), calcul en HEURES
    // (minutes + mètres nage convertis), sinon la nage était exclue du calcul.
    let longHours = 0;
    peakWeek.days.forEach(day => {
      day.sessions.forEach(sess => {
        const isLong = sess.long === true || (sess.name && (sess.name.includes('Longue') || sess.name.includes('longue') || sess.name.includes('Brick')));
        if (isLong && sess.d !== 'rs') {
          const p = parseSessionDetail(sess.det, sess.d);
          longHours += (p.minutes / 60) + (p.meters > 0 ? (p.meters / 1000) / 3 : 0);
        }
      });
    });

    const longPct = realVol.hours > 0 ? (longHours / realVol.hours) * 100 : 0;
    // Règle coaching : chez le débutant natation, la technique prime sur le volume
    // (pitch du sport) — le plancher de part longue est abaissé de 10 points.
    const swimBeginner = combo.sport === 'swim' && combo.level === 'debutant';

    // Grouper par sport × format
    const key = `${combo.sport}:${combo.format}`;
    if (!results[key]) {
      results[key] = { sport: combo.sport, format: combo.format, samples: [] };
    }

    results[key].samples.push({
      history: combo.history,
      level: combo.level,
      intent: combo.intent,
      declaredVol,
      realHours: realVol.hours,
      ratio,
      longPct,
      longFloorRelax: swimBeginner ? 10 : 0,
      peakWeekNum: peakWeek.num,
      totalWeeks: plan.totalWeeks
    });

  } catch (err) {
    errors++;
  }
}

// Fenêtres idéales de part séance longue PAR FORMAT : imposer 45-55% à un plan
// 5k ou critérium serait une prescription dangereuse. La part attendue de la
// séance longue croît avec la distance de l'épreuve.
const LONG_WINDOWS = {
  'run:5k': [20, 40], 'run:10k': [22, 42], 'run:semi': [28, 48], 'run:marathon': [35, 55], 'run:trail': [40, 60],
  'bike:crit': [18, 38], 'bike:clm': [20, 40], 'bike:route': [25, 45], 'bike:cyclo': [32, 52], 'bike:gravel': [38, 58],
  'swim:sprint': [12, 35], 'swim:demifond': [15, 38], 'swim:fond': [20, 42], 'swim:ow': [25, 48],
  'tri:S': [22, 42], 'tri:M': [28, 48], 'tri:70.3': [35, 55], 'tri:Full': [40, 60]
};

console.log(`\n=== AUDIT COACH DE CHARGE — EnduraBuild ===`);
console.log(`Combinaisons testées: ${count} | Erreurs: ${errors}`);
console.log(`Seuils d'alerte: ratio >1.4 (sur-prescrit), <0.5 (sous-prescrit) | part séance longue hors fenêtre du format\n`);

const alertLow = 0.5, alertHigh = 1.4;
const summary = { volAlerts: 0, longAlerts: 0, formats: 0, formatsOK: 0 };

for (const [key, data] of Object.entries(results).sort()) {
  const avgRatio = data.samples.reduce((s, x) => s + x.ratio, 0) / data.samples.length;
  const avgReal = data.samples.reduce((s, x) => s + x.realHours, 0) / data.samples.length;
  const avgDeclared = data.samples.reduce((s, x) => s + x.declaredVol, 0) / data.samples.length;
  const avgLongPct = data.samples.reduce((s, x) => s + x.longPct, 0) / data.samples.length;
  const [longLow, longHigh] = LONG_WINDOWS[`${data.sport}:${data.format}`] || [30, 55];

  const volBad = avgRatio > alertHigh || avgRatio < alertLow;
  const longBad = avgLongPct > longHigh || avgLongPct < longLow;
  const status = (volBad ? '⚠️ VOLUME' : '') + (longBad ? ' ⚠️ LONGUE' : '') || '✓ OK';
  summary.formats++;
  if (!volBad && !longBad) summary.formatsOK++;

  console.log(`${data.sport.toUpperCase()} · ${data.format.padEnd(12)} ${status}`);
  console.log(`  Volume déclaré: ${avgDeclared.toFixed(1)}h | Réel parsé: ${avgReal.toFixed(1)}h | Ratio: ${avgRatio.toFixed(2)}`);
  console.log(`  Part séance longue: ${avgLongPct.toFixed(1)}% (fenêtre format: ${longLow}-${longHigh}%)`);

  // Micro-semaines (<4h au pic, ~3 séances) : fenêtre élargie des deux côtés — la longue peut
  // légitimement dominer (plafond +8) ou céder à la fréquence multi-sport (plancher -4).
  const longOut = s => s.longPct > (longHigh + (s.realHours < 4 ? 8 : 0)) || s.longPct < (longLow - (s.longFloorRelax || 0) - (s.realHours < 4 ? 4 : 0));
  const problematic = data.samples.filter(s => s.ratio > alertHigh || s.ratio < alertLow || longOut(s));
  summary.volAlerts += data.samples.filter(s => s.ratio > alertHigh || s.ratio < alertLow).length;
  summary.longAlerts += data.samples.filter(longOut).length;
  if (problematic.length > 0) {
    console.log(`  Cas alertes (${problematic.length}/${data.samples.length}):`);
    problematic.slice(0, 3).forEach(s => {
      console.log(`    • ${s.history}/${s.level}/${s.intent.substring(0,4)}: ratio=${s.ratio.toFixed(2)} long=${s.longPct.toFixed(0)}%`);
    });
  }
  console.log();
}

console.log(`\n=== Résumé (dérivé des données) ===`);
console.log(`Formats dans les clous: ${summary.formatsOK}/${summary.formats}`);
console.log(`Cas hors seuil volume (${alertLow}-${alertHigh}): ${summary.volAlerts}/${count}`);
console.log(`Cas hors fenêtre séance longue: ${summary.longAlerts}/${count}`);
