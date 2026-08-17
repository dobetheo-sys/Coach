#!/usr/bin/env node
/**
 * O-21 — L'INVERSION DE MONOTONIE SUR L'AXE ALLURE, sur un échantillon qui en est un.
 *
 * Le bloc `verify` d'O-21 épinglait « inversions d'allure : 1 » sur DEUX points (10 km,
 * `vol_recent` 0 et 5). Le lot 1 l'a fait basculer à 2 et le registre a rangé l'entrée en
 * « ne reproduit plus » — deux fois faux : elle reproduisait, et davantage.
 *
 * Élargi à 4 formats × 5 volumes récents × 4 allures = 60 couples voisins, le verdict
 * S'INVERSE : 22 → 13 inversions (moins nombreuses) et écart max 2,7 → 4,6 % (une pire).
 * Un échantillon de deux points ne mesure pas une monotonie ; il tire à pile ou face.
 *
 * Le bloc `verify` porte désormais sur la PROPRIÉTÉ (« il reste des inversions »), jamais sur
 * un compte — un compte fait basculer l'entrée à chaque lot, dans les deux sens, sans rien
 * dire de l'état du défaut (règle 17).
 */
import "/home/user/Coach/src/app/bridge.ts";
const E = globalThis.EBV2;
const P = (format, pace, vr) => ({ intent:'competition', format, med_pain:'non', med_dizzy:'non', med_treat:'non',
  age:'32', sex:'H', weight:'75', height:'178', level:'inter', history:'confirme', injury:'aucune',
  sessions_max:'4', vol_max:'6', dispo:'quotidienne', shift_ok:'oui', off_days:'non', doubles:'oui',
  pace_known:'oui', pace, vol_recent:String(vr), terrain:'route' });
const tot = (p) => p.weeks.reduce((t,w)=>t+w.days.reduce((a,d)=>a+d.sessions.reduce((u,s)=>u+(s.race?0:s.min||0),0),0),0);
const ALL = ["4:30","5:45","7:00","8:30"];
let ko = 0, n = 0, mx = 0; const cas = [];
for (const format of ["5k","10k","semi","marathon"]) for (const vr of [0,2,3,5,8]) {
  const v = ALL.map((p) => { try { return tot(E.buildPlan("run", P(format,p,vr))); } catch { return null; } });
  for (let i = 0; i < ALL.length-1; i++) {
    if (v[i]==null||v[i+1]==null) continue; n++;
    if (v[i] < v[i+1]) { ko++; const e = 100*(v[i+1]/v[i]-1); mx = Math.max(mx,e);
      if (cas.length<5) cas.push(`${format}/vr${vr} : ${ALL[i]} ${v[i]} min < ${ALL[i+1]} ${v[i+1]} min (+${e.toFixed(1)} %)`); }
  }
}
console.log(`inversions d'allure : ${ko} / ${n} couples voisins  ·  écart max ${mx.toFixed(1)} %`);
for (const c of cas) console.log("   " + c);
