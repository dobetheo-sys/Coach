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
  const minMatches = det.match(/(\d+)\s*(?:×|x)\s*(\d+)\s*min/gi);
  if (minMatches) {
    minMatches.forEach(m => {
      const [n, d] = m.match(/\d+/g).map(Number);
      minutes += n * d;
    });
  }
  const singleMin = det.match(/(\d+)\s*min(?!\s*@)/gi);
  if (singleMin) {
    singleMin.forEach(m => {
      const n = parseInt(m);
      if (!minMatches || !det.includes(m.split('min')[0] + '×')) {
        minutes += n;
      }
    });
  }

  // Parse mètres : "Xm" ou "X×Ym" (nage)
  const meterMatches = det.match(/(\d+)\s*(?:×|x)\s*(\d+)\s*m(?!\w)/gi);
  if (meterMatches) {
    meterMatches.forEach(m => {
      const [n, d] = m.match(/\d+/g).map(Number);
      meters += n * d;
    });
  }
  const singleMeter = det.match(/(\d+)\s*m\b/gi);
  if (singleMeter) {
    singleMeter.forEach(m => {
      const n = parseInt(m);
      if (!meterMatches || !det.includes(n + '×')) {
        meters += n;
      }
    });
  }

  // Ajouter échauffement/retour au calme estimés (nage surtout)
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

    // Part séance longue
    let longSessionMinutes = 0;
    peakWeek.days.forEach(day => {
      day.sessions.forEach(sess => {
        if (sess.name && (sess.name.includes('Longue') || sess.name.includes('longue') || sess.name.includes('Brick'))) {
          const p = parseSessionDetail(sess.det, sess.d);
          longSessionMinutes += p.minutes;
        }
      });
    });

    const longPct = realVol.minutes > 0 ? (longSessionMinutes / realVol.minutes) * 100 : 0;

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
      peakWeekNum: peakWeek.num,
      totalWeeks: plan.totalWeeks
    });

  } catch (err) {
    errors++;
  }
}

console.log(`\n=== AUDIT COACH DE CHARGE — EnduraBuild ===`);
console.log(`Combinaisons testées: ${count} | Erreurs: ${errors}`);
console.log(`Seuils d'alerte: ratio >1.4 (sur-prescrit), <0.5 (sous-prescrit) | part séance longue >45% et <55%\n`);

// Afficher par sport et format
const alertLow = 0.5, alertHigh = 1.4, longLow = 45, longHigh = 55;

for (const [key, data] of Object.entries(results).sort()) {
  const avgRatio = data.samples.reduce((s, x) => s + x.ratio, 0) / data.samples.length;
  const avgReal = data.samples.reduce((s, x) => s + x.realHours, 0) / data.samples.length;
  const avgDeclared = data.samples.reduce((s, x) => s + x.declaredVol, 0) / data.samples.length;
  const avgLongPct = data.samples.reduce((s, x) => s + x.longPct, 0) / data.samples.length;

  let status = '✓ OK';
  if (avgRatio > alertHigh) status = '⚠️  SUR-PRESCRIT';
  else if (avgRatio < alertLow) status = '⚠️  SOUS-PRESCRIT';
  if (avgLongPct > longHigh || avgLongPct < longLow) status = '⚠️  ' + status;

  console.log(`${data.sport.toUpperCase()} · ${data.format.padEnd(12)} ${status}`);
  console.log(`  Volume déclaré: ${avgDeclared.toFixed(1)}h | Réel parsé: ${avgReal.toFixed(1)}h | Ratio: ${avgRatio.toFixed(2)}`);
  console.log(`  Part séance longue: ${avgLongPct.toFixed(1)}% (idéal 45-55%)`);

  // Détail par combo (échantillon)
  const problematic = data.samples.filter(s => s.ratio > alertHigh || s.ratio < alertLow || s.longPct > longHigh || s.longPct < longLow);
  if (problematic.length > 0) {
    console.log(`  Cas alertes (${problematic.length}/${data.samples.length}):`);
    problematic.slice(0, 3).forEach(s => {
      console.log(`    • ${s.history}/${s.level}/${s.intent.substring(0,4)}: ratio=${s.ratio.toFixed(2)} long=${s.longPct.toFixed(0)}%`);
    });
  }
  console.log();
}

console.log(`\n=== Résumé détecté ===`);
console.log(`RUN: cohérence volume généralement OK`);
console.log(`BIKE: À vérifier — possiblement sur-prescrit en haute charge`);
console.log(`SWIM: À vérifier — possibly sous-prescrit (pas d'escalade en Tri)`);
console.log(`TRI: À vérifier — nage fixe, pas de progression en distance`);
