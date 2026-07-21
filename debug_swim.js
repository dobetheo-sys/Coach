#!/usr/bin/env node
/* Debug SWIM — voir les descriptions générées */

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

console.log('\n=== SWIM FOND — Descriptions des séances ===\n');

// Afficher week 1 et week pic
[1, Math.floor(plan.totalWeeks / 2)].forEach(wNum => {
  const w = plan.weeks.find(x => x.num === wNum);
  if (!w) return;

  console.log(`\n--- Semaine ${w.num} (${w.phase.nom}) vol=${w.vol}h ---`);
  w.days.forEach(d => {
    console.log(`\n${d.jour}:`);
    d.sessions.forEach(s => {
      console.log(`  ${s.name}: "${s.det}"`);
    });
  });
});

// Analyser une séance "durLong"
console.log('\n=== Analyse PARSING séance "durLong" ===\n');
const peakW = plan.weeks[Math.floor(plan.weeks.length / 2)];
peakW.days.forEach(d => {
  d.sessions.forEach(s => {
    if (s.name.includes('Longue')) {
      console.log(`Séance: ${s.name}`);
      console.log(`Texte: "${s.det}"`);

      // Tester le parseur
      const rangeMatch = s.det.match(/(\d+)\s*-\s*(\d+)\s*m\b/i);
      const singleMatch = s.det.match(/\b(\d+)\s*m\b/i);
      const repMatch = s.det.match(/(\d+)\s*(?:×|x)\s*(\d+)\s*m\b/i);

      console.log(`  Range match ("XXX-XXXm"): ${rangeMatch ? rangeMatch[0] : 'none'}`);
      console.log(`  Single match ("XXXm"): ${singleMatch ? singleMatch[0] : 'none'}`);
      console.log(`  Rep match ("NxMm"): ${repMatch ? repMatch[0] : 'none'}`);
    }
  });
});
