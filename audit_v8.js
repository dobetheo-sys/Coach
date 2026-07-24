#!/usr/bin/env node
/* ============================================================================
   EnduraBuild — SUITE DE RÉGRESSION v8  (remplace v7 : ajoute C17-C19, cohérence du CONSEIL)
   Usage :  node audit_v8.js [chemin/vers/Coach_Pro_Vx_x_x.html]
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
  C10_INTENSITE_REL:   { desc:'Intensité en champ structuré (cible R3.8)',      max:0,    n:0, ex:[] },
  C11_TESTS_DATES:     { desc:'Zones résolues par date de test (cible R3.8)',   max:0,    n:0, ex:[] },
  C12_PLAFOND:         { desc:'Plafonds de séance jamais dépassés',             max:0,    n:0, ex:[] },
  C13_ECHAUFFEMENT:    { desc:'Échauffement <=25min et <= volume du corps',     max:0.02, n:0, ex:[] },
  C14_TEXTE:           { desc:'Aucune fourchette de texte corrompue',           max:0,    n:0, ex:[] },
  C15_PLAFOND_NIVEAU:  { desc:'Plafonds DÉBUTANT respectés (protection niveau)', max:0,    n:0, ex:[] },
  C16_PROGRESSION:     { desc:'La séance longue progresse (>=+25% S1→pic)',      max:0.02, n:0, ex:[] },
  C17_VO2_SPEC:        { desc:'VO2 présent en phase spéc/peak (pas seulement dev)', max:0.02, n:0, ex:[] },
  C18_RACEPACE:        { desc:'Séance à allure course en phase spéc (chaque sport visé)', max:0.02, n:0, ex:[] },
  C19_ZONE_GRISE:      { desc:'Zone grise <35% du temps (polarisation tenue)',     max:0.05, n:0, ex:[] },
};

/* Classification des zones du moteur en 3 familles (modèle polarisé). Doit rester
   synchronisée avec ZDEF dans le HTML. E=aérobie, M=seuil/tempo(grise), H=VO2.    */
const ZCAT = {
  'bk.z2':'E','bk.rp':'M','bk.frc':'E','bk.ss':'M','bk.thr':'M','bk.vo2':'H',
  'rn.easy':'E','rn.rec':'E','rn.mara':'M','rn.thr':'M','rn.vo2':'H',
  'sw.easy':'E','sw.aero':'E','sw.css':'M','sw.speed':'H'
};
const stepMinutes = (st, disc) => {
  const reps = st.reps || 1;
  if (st.durationMin != null) return reps * st.durationMin;
  if (st.distanceM != null) { const d = st.d || disc;
    return d === 'sw' ? reps*st.distanceM/100*2 : reps*st.distanceM/1000*5; }
  return 0;
};

/* Plafond spécifique au niveau débutant — défini dans sess() (distCaps beginner
   {lo:300,hi:850}) mais perdu dans blockBounds(), qui ne connaît que le format. */
const CAP_SWIM_DEBUTANT = 850;

/* Plafonds légitimes — repris des caps déjà présents dans sess(). Ce sont des
   BORNES HAUTES : une séance ne doit jamais les dépasser, quel que soit le
   budget de la semaine. Symétriques du plancher C8.                          */
const CAP_BRICK = { S:90, M:120, '70.3':180, Full:300 };
const CAP_SWIM  = { sprint:1400, demifond:2000, fond:3000, ow:4500,
                    S:750, M:1500, '70.3':1900, Full:3000 };
const CAP_LONG  = { '5k':74, '10k':90, semi:130, marathon:180, trail:255,
                    crit:150, route:180, clm:165, cyclo:240, gravel:360 };
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

  // C12 / C13 / C14
  allSess.forEach(({w,s}) => {
    const det = s.det || '';
    const bk = (det.match(/(\d+)\s*min\s*vélo/) || [])[1];
    if (s.d === 'br' && bk && CAP_BRICK[c.a.format] && +bk > CAP_BRICK[c.a.format])
      hit('C12_PLAFOND', `${id} S${w} brick ${bk}min vélo (max ${CAP_BRICK[c.a.format]})`);
    if (s.d === 'sw' && s.long) {
      const mm = det.match(/\b(\d{3,})\s*m\b(?!\/|in)/), cap = CAP_SWIM[c.a.format];
      if (mm && cap && +mm[1] > cap*1.15) hit('C12_PLAFOND', `${id} S${w} nage ${mm[1]}m (max ${cap})`);
    }
    if (s.long && (s.d === 'rn' || s.d === 'bk')) {
      const mm = det.match(/\b(\d+)\s*min/), cap = CAP_LONG[c.a.format];
      if (mm && cap && +mm[1] > cap*1.15) hit('C12_PLAFOND', `${id} S${w} longue ${mm[1]}min (max ${cap})`);
    }
    const e = det.match(/[ÉE]chauffement\s*(\d+)\s*min/);
    if (e) {
      const body = [...det.matchAll(/(\d+)\s*×\s*(\d+)\s*min/g)].reduce((t,x)=>t + +x[1]* +x[2], 0);
      if (+e[1] > 25) hit('C13_ECHAUFFEMENT', `${id} S${w} échauffement ${e[1]}min`);
      else if (body > 0 && +e[1] > body) hit('C13_ECHAUFFEMENT', `${id} S${w} échauffement ${e[1]}min > corps ${body}min`);
    }
    [...det.matchAll(/(\d+)\s*-\s*(\d+)\s*(m|min)\b/g)].forEach(x => {
      if (+x[2] > +x[1]*4) hit('C14_TEXTE', `${id} S${w} «${x[0]}» dans : ${det.slice(0,60)}`);
    });
  });

  // C15 — la protection débutant doit survivre au scaling
  if (c.a.level === 'debutant') {
    allSess.forEach(({w,s}) => {
      if (s.d !== 'sw') return;
      const mm = (s.det||'').match(/\b(\d{3,})\s*m\b(?!\/|in)/);
      if (mm && +mm[1] > CAP_SWIM_DEBUTANT*1.15)
        hit('C15_PLAFOND_NIVEAU', `${id} S${w} ${mm[1]}m (plafond débutant ${CAP_SWIM_DEBUTANT})`);
    });
  }

  // C16 — la séance longue doit progresser sur le plan, pas être collée au plafond
  {
    const serie = [];
    p.weeks.forEach(w => { if (w.isRecup || w.phase.id === 'taper') return;
      w.days.forEach(d => d.sessions.forEach(s => {
        if (!s.long) return;
        const mm = (s.det||'').match(/\b(\d{2,})\s*(m\b|min)/);
        if (mm) serie.push(+mm[1]);
      }));
    });
    if (serie.length >= 6) {
      const debut = serie.slice(0,2).reduce((a2,b)=>a2+b,0)/2;
      const pic   = Math.max(...serie);
      if (debut > 0 && pic/debut < 1.25)
        hit('C16_PROGRESSION', `${id} longue S1≈${Math.round(debut)} → pic ${pic} (×${(pic/debut).toFixed(2)})`);
    }
  }

  // C17 / C18 / C19 — cohérence de la périodisation de l'intensité
  {
    const disciplines = c.sp === 'tri' ? ['sw','bk','rn'] : [{run:'rn',bike:'bk',swim:'sw'}[c.sp]];
    const specWeeks = p.weeks.filter(w => (w.phase.id === 'spec' || w.phase.id === 'peak') && !w.isRecup);

    // C17 : du VO2 doit exister en spéc/peak (au moins un bloc, tous sports confondus)
    if (specWeeks.length >= 2) {
      let vo2 = 0;
      specWeeks.forEach(w => w.days.forEach(d => d.sessions.forEach(sn =>
        (sn.steps||[]).forEach(st => { if (/vo2|speed/.test(st.zone||'')) vo2 += stepMinutes(st, sn.d); }))));
      if (vo2 === 0) hit('C17_VO2_SPEC', `${id} 0min VO2 en spéc/peak (${specWeeks.length} sem)`);
    }

    // C18 : chaque discipline visée doit avoir >=1 séance de qualité en spéc/peak
    if (specWeeks.length >= 2) {
      disciplines.forEach(disc => {
        let q = 0;
        specWeeks.forEach(w => w.days.forEach(d => d.sessions.forEach(sn => {
          if (sn.d !== disc || sn.plainBody) return;
          if ((sn.steps||[]).some(st => st.role==='body' && /ss|thr|rp|vo2|css|speed|mara/.test(st.zone||''))) q++;
        })));
        if (q === 0) hit('C18_RACEPACE', `${id} ${disc} : 0 séance qualité en spéc/peak`);
      });
    }

    // C19 : zone grise (M) ne domine pas le temps de corps
    let mM=0, tot=0;
    p.weeks.forEach(w => w.days.forEach(d => d.sessions.forEach(sn =>
      (sn.steps||[]).forEach(st => { if (st.role!=='body') return;
        const min = stepMinutes(st, sn.d); tot += min; if (ZCAT[st.zone]==='M') mM += min; }))));
    if (tot > 0 && mM/tot > 0.35) hit('C19_ZONE_GRISE', `${id} zone grise ${Math.round(mM/tot*100)}% du temps de corps`);
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

/* ---------- C10 / C11 — critères CIBLE (R3.8) ----------
   Ils échouent tant que le refactor n'est pas fait. C'est voulu :
   ils décrivent l'état "terminé", pas l'état actuel.                       */
{
  const mk = extra => Object.assign({}, BASE, { format:'70.3', level:'intermediaire',
    history:'confirme', intent:'competition', vol_max:'12', shift_ok:'non',
    injury:'aucune', race_date:'2027-05-16' }, extra);

  // --- C10 : la séance porte-t-elle une intensité structurée ?
  ENG.S.sport = 'tri';
  const p10 = ENG.buildPlan(mk({}));
  const sample = [];
  p10.weeks.forEach(w => w.days.forEach(d => d.sessions.forEach(s => { if (s.d !== 'rs') sample.push(s); })));
  const withSteps = sample.filter(s => Array.isArray(s.steps));
  const withIntensity = withSteps.filter(s => s.steps.some(st => st && typeof st.intensity === 'object'));
  if (!withSteps.length)
    hit('C10_INTENSITE_REL', `modèle non structuré : 0/${sample.length} séances exposent steps[] (R3.1/R3.2 non fait)`);
  else if (withIntensity.length < withSteps.length)
    hit('C10_INTENSITE_REL', `${withSteps.length - withIntensity.length}/${withSteps.length} séances sans intensity{} structurée`);
  const absolus = sample.filter(s => /\d+\s*-\s*\d+\s*W|\d+'\d+\s*-\s*\d+'\d+\/km/.test(s.det || ''));
  if (withSteps.length && absolus.length && !withIntensity.length)
    hit('C10_INTENSITE_REL', `valeurs absolues figées dans det sans intensity{} : ${absolus.length} séances`);

  // --- C11 : résolution par date + non-destructivité du retest
  const sig = pl => pl.weeks.map(w =>
    w.phase.id + ':' + w.days.map(d => d.sessions.map(s => s.name).join('+')).join('|')).join('//');
  const dated = pl => { let ok = false;
    pl.weeks.forEach(w => w.days.forEach(d => { if (d.date || d.iso) ok = true; })); return ok; };

  ENG.S.sport = 'tri';
  const pAvant = ENG.buildPlan(mk({ ftp:'227', tests:[{type:'ftp', value:227, date:'2026-07-01'}] }));
  const pApres = ENG.buildPlan(mk({ ftp:'227', tests:[
      {type:'ftp', value:227, date:'2026-07-01'},
      {type:'ftp', value:245, date:'2026-10-13'}] }));

  if (!dated(pAvant))
    hit('C11_TESTS_DATES', 'les jours ne portent pas de date absolue — résolution par date impossible');
  if (sig(pAvant) !== sig(pApres))
    hit('C11_TESTS_DATES', 'un retest modifie la STRUCTURE du plan (doit être identique)');
  const wattsAvant = JSON.stringify(pAvant.weeks.map(w => w.days.map(d => d.sessions.map(s => s.det))));
  const wattsApres = JSON.stringify(pApres.weeks.map(w => w.days.map(d => d.sessions.map(s => s.det))));
  if (wattsAvant === wattsApres)
    hit('C11_TESTS_DATES', 'a.tests ignoré — aucune différence de rendu après ajout du retest 245W');
}

/* ---------- rapport ---------- */
console.log(`\nEnduraBuild — audit v8 · ${path}`);
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
