import "../src/app/bridge.ts";
import { profiles } from "../scripts/goldenMaster.mjs";
const { a } = [...profiles()].find(x=>x.key==="REF/swim/demifond/css");
for (const spec of [["inconnu",{css_known:"non",css:""}],["2:04",{css_known:"oui",css:"2:04"}],["2:05",{css_known:"oui",css:"2:05"}],["2:07",{css_known:"oui",css:"2:07"}],["2:08",{css_known:"oui",css:"2:08"}],["2:09",{css_known:"oui",css:"2:09"}],["2:10",{css_known:"oui",css:"2:10"}],["2:15",{css_known:"oui",css:"2:15"}],["2:30",{css_known:"oui",css:"2:30"}]]) {
  const [label, over] = spec;
  const p = globalThis.EBV2.buildPlan("swim", { ...a, ...over });
  let pic=0,n=0,tot=0; for(const w of p.weeks){let t=0;for(const d of w.days)for(const s of d.sessions||[]){t+=s.min||0;if((s.min||0)>0&&s.d!=="rs")n++;}tot+=t;pic=Math.max(pic,t);}
  const st=(p._r202?.plafonds||[]).find(x=>(x.id||x.nom)==="structurel");
  console.log(label.padEnd(8)+" pic "+(pic/60).toFixed(2)+" h · total "+(tot/60).toFixed(1)+" h · "+n+" séances · structurel "+(st?(+st.brut).toFixed(2):"?"));
}
