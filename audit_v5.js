#!/usr/bin/env node
/* ============================================================================
   EnduraBuild — SUITE DE RÉGRESSION v5
   Usage :  node audit_v5.js [chemin/vers/Coach_Pro_Vx_x_x.html]
   Sortie :  tableau de conformité + code de sortie 1 si un critère échoue.

   Les 9 critères ci-dessous sont les CRITÈRES D'ACCEPTATION du refactor R3.
   Ils sont volontairement indépendants de l'implémentation : ils ne testent que
   le plan produit, pas la manière dont il est produit.
   ========================================================================== */
const fs = require('fs');
const path = process.argv[2] || 'Coach_Pro_V1_1_3.html';

/* ---------- chargement headless du moteur ---------- */
const html = fs.readFileSync(path, 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('Aucun bloc <script> trouvé dans ' + path); process.exit(2); }
const fake = new Proxy({}, {
  get: (t, p) => {
    if (['innerHTML','textContent','value','className'].includes(p)) return '';
    if (p === 'dataset') return {};
    if (p === 'classList') return { add(){}, remove(){}, toggle(){} };
    if (p === 'style') return {};
    return () => fake;
  }, set: () => true
});
global.document = { querySelectorAll:()=>[], querySelector:()=>fake, getElementById:()=>fake,
                    body:{dataset:{}}, createElement:()=>fake, addEventListener(){} };
global.window = { scrollTo(){}, addEventListener(){} };
global.$ = () => fake;
const ENG = {};
eval(m[1] + '\n;ENG.buildPlan=buildPlan;ENG.evalRules=evalRules;ENG.S=S;');

/* ---------- grille de test ---------- */
const FORMATS = { tri:['S','M','70.3','Full'], run:['5k','10k','semi','marathon','trail'],
                  bike:['crit','route','cyclo','clm','gravel'], swim:['sprint','demifond','fond','ow'] };
const INJ = { tri:['aucune','course','epaule'], run:['aucune','tibia','genou'],
              bike:['aucune','dos','genou'], swim:['aucune','epaule'] };
const BASE = { med_pain:'non', med_dizzy:'non', med_treat:'non', age:'30', sex:'h', weight:'75',
  ftp_known:'oui', ftp:'250', pace_known:'oui', pace:'4:30', css_known:'oui', css:'1:50',
  hr_max:'190', hr_rest:'50', hrv:'non', weight_lever:'non', daily_burn:'moyen', cycle_sync:'non',
  races:'', milieu:'bassin', terrain:'route', swim_limit:'technique', sessions_max:'7',
  dispo:'quotidienne', off_days:'non', off_which:'', doubles:'oui', sleep:'normal', life_load:'moyenne' };

const cases = [];
for (const sp of Object.keys(FORMATS))
  for (const format of FORMATS[sp])
    for (const level of ['debutant','intermediaire','avance'])
      for (const history of ['reprise','confirme','ancien'])
        for (const intent of ['competition','finir','plaisir'])
          for (const vol_max of ['4','8','12','18'])
            for (const shift_ok of ['oui','non'])
              for (const injury of INJ[sp])
                cases.push({ sp, a: Object.assign({}, BASE,
                  { format, level, history, intent, vol_max, shift_ok, injury }) });

/* ---------- critères ---------- */
const C = {
  C1_CRASH:            { desc:'Aucune exception levée',                        max:0,    n:0, ex:[] },
  C2_TOKEN:            { desc:'Aucun undefined / NaN / null dans les séances',  max:0,    n:0, ex:[] },
  C3_VOLMAX:           { desc:'vol_max déclaré jamais dépassé (+5%)',           max:0,    n:0, ex:[] },
  C4_SESSIONS:         { desc:'sessions_max jamais dépassé',                    max:0,    n:0, ex:[] },
  C5_RAMP:             { desc:'Charge croissante (2e moitié > 1re, +5% mini)',  max:0.02, n:0, ex:[] },
  C6_PEAK_HONNETE:     { desc:'volPeak annoncé atteint sur >=2 semaines',       max:0.02, n:0, ex:[] },
  C7_TAPER:            { desc:'Affûtage strictement décroissant',               max:0.02, n:0, ex:[] },
  C8_LONG_DIGNE:       { desc:'Séance "longue" >= 30min (ou >=800m en nage)',   max:0.02, n:0, ex:[] },
  C9_MEDHOLD:          { desc:'med_pain=oui => zéro intensité',                 max:0,    n:0, ex:[] },
};
const hit = (k, msg) => { C[k].n++; if (C[k].ex.length < 3) C[k].ex.push(msg); };

let total = 0;
for (const c of cases) {
  ENG.S.sport = c.sp;
  const id = `${c.sp}/${c.a.format}/${c.a.level}/${c.a.history}/${c.a.intent}/vol${c.a.vol_max}/cyc${c.a.shift_ok==='oui'?10:7}/inj:${c.a.injury}`;
  let p;
  try { p = ENG.buildPlan(c.a); } catch (e) { hit('C1_CRASH', id + ' → ' + e.message); continue; }
  total++;

  const vols = p.weeks.map(w => w.vol);
  const allSess = [];
  p.weeks.forEach((w, i) => w.days.forEach(d => d.sessions.forEach(s => {
    if (s.d !== 'rs') allSess.push({ w:i+1, s });
  })));

  // C2
  allSess.forEach(({w,s}) => { if (/undefined|NaN|null/.test(s.det||'')) hit('C2_TOKEN', `${id} S${w} ${s.name} :: ${s.det}`); });

  // C3
  const cap = parseInt(c.a.vol_max) * 1.05;
  const nOver = vols.filter(v => v > cap).length;
  if (nOver) hit('C3_VOLMAX', `${id} ${nOver} sem > ${c.a.vol_max}h (max ${Math.max(...vols)}h)`);

  // C4
  const declS = parseInt(c.a.sessions_max);
  p.weeks.forEach((w,i) => {
    const act = w.days.filter(d => d.sessions.some(s => s.d !== 'rs')).length;
    if (act > declS) hit('C4_SESSIONS', `${id} S${i+1} ${act}>${declS}`);
  });

  // C5
  const charge = p.weeks.filter(w => !w.isRecup && w.phase.id !== 'taper').map(w => w.vol);
  if (charge.length > 6) {
    const h = Math.floor(charge.length/2);
    const m1 = charge.slice(0,h).reduce((s,v)=>s+v,0)/h;
    const m2 = charge.slice(h).reduce((s,v)=>s+v,0)/(charge.length-h);
    if (m2 <= m1*1.05) hit('C5_RAMP', `${id} ${m1.toFixed(1)}h → ${m2.toFixed(1)}h`);
  }

  // C6
  const near = vols.filter(v => v >= p.volPeak*0.9).length;
  if (near < 2) hit('C6_PEAK_HONNETE', `${id} volPeak=${p.volPeak}h atteint ${near}/${vols.length} sem`);

  // C7
  const tp = p.weeks.filter(w => w.phase.id === 'taper').map(w => w.vol);
  if (tp.length > 1) {
    let ok = true;
    for (let i=1;i<tp.length;i++) if (tp[i] > tp[i-1]*1.02) ok = false;
    if (!ok) hit('C7_TAPER', `${id} ${tp.join(' → ')}`);
  }

  // C8
  allSess.forEach(({w,s}) => {
    if (!s.long) return;
    const det = s.det || '';
    const mn = det.match(/\b(\d+)\s*min/);
    const mt = det.match(/\b(\d{3,})\s*m\b(?!in)/);
    if (mn && +mn[1] < 30)      hit('C8_LONG_DIGNE', `${id} S${w} ${s.name} :: ${det.slice(0,80)}`);
    else if (!mn && mt && +mt[1] < 800) hit('C8_LONG_DIGNE', `${id} S${w} ${s.name} :: ${det.slice(0,80)}`);
  });
}

// C9 — sous-grille dédiée
for (const sp of Object.keys(FORMATS)) for (const format of FORMATS[sp]) {
  ENG.S.sport = sp;
  const a = Object.assign({}, BASE, { format, level:'intermediaire', history:'confirme',
    intent:'competition', vol_max:'12', shift_ok:'non', injury:'aucune', med_pain:'oui' });
  let p; try { p = ENG.buildPlan(a); } catch(e){ hit('C9_MEDHOLD', sp+'/'+format+' crash'); continue; }
  p.weeks.forEach((w,i) => w.days.forEach(d => d.sessions.forEach(s => {
    if (/VO2|seuil|CSS|race-pace|allure cible|sweetspot/i.test(s.name + ' ' + s.det))
      hit('C9_MEDHOLD', `${sp}/${format} S${i+1} ${s.name}`);
  })));
}

/* ---------- rapport ---------- */
console.log(`\nEnduraBuild — audit v5 · ${path}`);
console.log(`${total} configurations générées\n`);
let fail = 0;
const pad = (s,n) => String(s).padEnd(n);
console.log(pad('CRITÈRE',18) + pad('ÉCHECS',10) + pad('SEUIL',10) + 'STATUT');
console.log('-'.repeat(72));
for (const [k,v] of Object.entries(C)) {
  const rate = total ? v.n/total : 0;
  const seuil = v.max === 0 ? '0' : (v.max*100)+'%';
  const ok = v.max === 0 ? v.n === 0 : rate <= v.max;
  if (!ok) fail++;
  console.log(pad(k,18) + pad(v.n,10) + pad(seuil,10) + (ok ? 'OK' : 'ÉCHEC'));
}
console.log('-'.repeat(72));
for (const [k,v] of Object.entries(C)) {
  if (!v.ex.length) continue;
  console.log(`\n${k} — ${v.desc}`);
  v.ex.forEach(e => console.log('   · ' + e));
}
console.log(`\n${fail === 0 ? 'TOUS LES CRITÈRES PASSENT' : fail + ' critère(s) en échec'}\n`);
process.exit(fail === 0 ? 0 : 1);
