import "../src/app/bridge.ts";
const base = {
  intent:"competition", med_pain:"non", med_dizzy:"non", med_treat:"non",
  age:"35", sex:"H", weight:"75", history:"confirme", sessions_max:"8", vol_max:"12",
  vol_recent:"8", dispo:"quotidienne", off_days:"non", doubles:"non", level:"inter",
  race_date:"2027-06-06", ftp_known:"oui", ftp:"250", pace_known:"oui", pace:"4:30",
  css_known:"oui", css:"1:40", terrain:"vallonne", swim_continuous:"oui", longest_swim_m:"1500",
};
const cas = [
  ["tri","70.3",{format:"70.3"}],
  ["duathlon","M",{format:"M"}],
  ["swimrun","sprint",{format:"sprint", swim_total_m:"2600", run_total_km:"9.2", race_dplus_m:"100", segments_n:"6", water_temp_c:"20", team_mode:"solo", openwater_access:"saisonnier", run_continuous:"oui", gear_test:"oui", swimrun_swim_pace:"2:20", swimrun_run_pace:"5:30"}],
];
const zones = ["aucune","course","velo","genou","dos","cou","epaule","tibia","pied","hanche","cheville","fascia","quadriceps"];
for (const [sport,label,extra] of cas) {
  console.log("\n### " + sport + " / " + label);
  console.log("zone        | nage %  vélo %  course %  | heures  | R6.1b");
  for (const z of zones) {
    const a = {...base, ...extra, injury: z};
    let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch(e){ console.log(z.padEnd(11)+" | REFUS "+String(e.message||e).slice(0,50)); continue; }
    const t = {sw:0,bk:0,rn:0};
    let tot=0;
    for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions||[]) {
      const m = s.min||0; tot+=m;
      if (s.d==="br") { // legs
        let acc={}; let sum=0;
        for (const b of s.steps||[]) { const leg = b.leg==="bike"?"bk":b.leg==="swim"?"sw":b.leg==="run"?"rn":null; if(leg){acc[leg]=(acc[leg]||0)+(b._min||0); sum+=(b._min||0);} }
        if (sum>0) for (const k in acc) t[k]+= m*acc[k]/sum; else { t.bk+=m/2; t.rn+=m/2; }
      } else if (t[s.d]!==undefined) t[s.d]+=m;
    }
    const s3 = t.sw+t.bk+t.rn || 1;
    const dec = (p._v2?.decisions||[]).find(x=>x.id==="R6.1b");
    console.log(z.padEnd(11)+" | "+(100*t.sw/s3).toFixed(2).padStart(6)+" "+(100*t.bk/s3).toFixed(2).padStart(6)+" "+(100*t.rn/s3).toFixed(2).padStart(7)+"  | "+(tot/60).toFixed(1).padStart(6)+"  | "+(dec?dec.val:"—"));
  }
}
