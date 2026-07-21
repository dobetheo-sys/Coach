#!/usr/bin/env node
/* Debug SWIM week parsing */

const fs = require('fs');
const path = require('path');

global.document = {
  getElementById: (id) => ({ innerHTML: '', className: '', dataset: {}, innerHTML: '', textContent: '', querySelectorAll: () => [] }),
  querySelectorAll: () => [],
  body: { appendChild: () => {}, removeChild: () => {}, dataset: {} },
  createElement: (tag) => ({ href: '', download: '', click: () => {} })
};
global.window = { scrollTo: () => {} };
global.Blob = function(data) { return data; };
global.URL = { createObjectURL: () => 'blob:', revokeObjectURL: () => {} };

const coreCode = fs.readFileSync(path.join(__dirname, 'eb_core.js'), 'utf-8');
(0, eval)(`(function() { ${coreCode}; global.SPORTS = SPORTS; global.buildPlan = buildPlan; })()`);

const SPORTS = global.SPORTS;
const buildPlan = global.buildPlan;

// Copier les parseurs d'audit
function parseSessionDetail(det, sportKey) {
  if (!det || typeof det !== 'string') return { minutes: 0, meters: 0 };

  let minutes = 0, meters = 0;

  // Plages "40-50min"
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

  // Répétitions "N×Mmin"
  const repMatches = det.match(/(\d+)\s*(?:×|x)\s*(\d+)\s*min/gi);
  if (repMatches) {
    repMatches.forEach(m => {
      const [n, d] = m.match(/\d+/g).map(Number);
      minutes += n * d;
    });
  }

  // Valeurs simples "60min"
  const singleMin = det.match(/\b(\d+)\s*min(?!\s*-|@)/gi);
  if (singleMin) {
    singleMin.forEach(m => {
      const n = parseInt(m);
      const isRange = det.includes(`${n}-`) || det.includes(`-${n}`);
      if (!isRange && (!repMatches || !m.match(/\d+\s*×/) && !m.match(/×\s*\d+/))) {
        minutes += n;
      }
    });
  }

  // Mètres : plages "600-1400m"
  const meterRangeMatches = det.match(/(?<!\d[/:])(\d+)\s*-\s*(\d+)\s*m\b(?!\/)/gi);
  if (meterRangeMatches) {
    meterRangeMatches.forEach(m => {
      const nums = m.match(/\d+/g).map(Number);
      if (nums.length === 2 && nums[0] < nums[1]) {
        const avg = Math.round((nums[0] + nums[1]) / 2);
        meters += avg;
      }
    });
  }

  // Répétitions mètres "N×Ym"
  const meterRepMatches = det.match(/(\d+)\s*(?:×|x)\s*(\d+)\s*m\b(?!\/)/gi);
  if (meterRepMatches) {
    meterRepMatches.forEach(m => {
      const [n, d] = m.match(/\d+/g).map(Number);
      if (!det.includes(`${d}m/`) && !det.includes(`/${d}m`)) {
        meters += n * d;
      }
    });
  }

  // Valeurs simples mètres
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

  // Échauffement/retour au calme
  if (sportKey === 'sw' && minutes === 0 && meters > 0) {
    minutes += 3;
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
    if (sess.d === 'rs') return;
    const p = parseSessionDetail(sess.det, sess.d);
    totalMinutes += p.minutes;
    totalMeters += p.meters;
    if (sess.name.includes('Longue') || sess.name.includes('longue')) {
      console.log(`  ${sess.name}: det="${sess.det.substring(0,60)}..." → min=${p.minutes}, meters=${p.meters}`);
    }
  });

  return { minutes: totalMinutes, meters: totalMeters };
}

function parseWeekVolume(week) {
  let totalMinutes = 0, totalMeters = 0;

  console.log(`\nWeek ${week.num} (${week.phase.nom}):`);
  week.days.forEach(day => {
    const v = parseDayVolume(day);
    totalMinutes += v.minutes;
    totalMeters += v.meters;
  });

  let swimHours = 0;
  if (totalMeters > 0) {
    swimHours = (totalMeters / 1000) / 3;
  }

  const totalHours = (totalMinutes / 60) + swimHours;
  console.log(`  Total: ${totalMinutes}min + ${totalMeters}m (${swimHours.toFixed(2)}h swim) = ${totalHours.toFixed(2)}h`);
  return { minutes: totalMinutes, meters: totalMeters, hours: totalHours };
}

// Test SWIM
const answers = {
  sport: 'swim',
  format: 'fond',
  intent: 'plaisir',
  level: 'inter',
  history: 'confirme',
  age: 35,
  sex: 'H',
  sessions_max: '7',
  vol_max: '10',
  dispo: 'semaine',
  doubles: 'non',
  off_days: 'non',
  ftp_known: 'non',
  pace_known: 'non',
  css_known: 'oui',
  css: '1:45',
  injury: 'aucune',
  med_pain: 'non',
  med_dizzy: 'non',
  med_treat: 'non',
  milieu: 'bassin',
  swim_limit: 'endurance'
};

const plan = buildPlan(answers);

console.log(`=== SWIM FOND — Week-by-week parsing ===`);
plan.weeks.forEach((w, i) => {
  if (i < 2 || i >= plan.weeks.length - 1) {
    const realVol = parseWeekVolume(w);
    console.log(`  Declared: ${w.vol}h | Parsed: ${realVol.hours.toFixed(2)}h | Ratio: ${(realVol.hours / w.vol).toFixed(2)}`);
  }
});
