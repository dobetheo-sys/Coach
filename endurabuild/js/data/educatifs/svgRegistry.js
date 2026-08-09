// Registre des schémas SVG inline du module Éducatifs (lot R26, voir CLAUDE.md) — repris
// intégralement des six maquettes (`educatifs_*.html`), avec deux transformations MÉCANIQUES
// seulement (§5 du brief) :
//   1. Les identifiants de `<marker>` (globaux au document — plusieurs schémas montés dans la
//      même page se casseraient mutuellement) sont préfixés par discipline : `nat-m1`…`nat-m7`,
//      `nat-b1`/`nat-b2` (natation), `velo-v1` (vélo), `trail-t1` (trail). 11 marqueurs au
//      total — aucun schéma course/enchaînements/swimrun n'en utilise.
//   2. Les classes CSS de dessin (silhouette, panneaux comparatifs, étiquettes) sont préfixées
//      `edu-` pour ne jamais collisionner avec une classe existante de l'app (aucune collision
//      trouvée à l'audit, mais aucune de ces classes n'était scopée non plus — préfixer les
//      rend scopées PAR CONSTRUCTION plutôt que par chance).
// Le texte, les valeurs numériques, les libellés et les `aria-label` ne changent PAS un
// caractère — c'est le contenu vérifié contre les sources.

const SVG_P1 = `
<div class="edu-panel"><div class="edu-panel-h edu-bad"><span class="edu-pip edu-bad"></span>Jambes qui coulent</div>
<svg viewBox="0 0 400 160" role="img" aria-label="Nageur de profil, corps incliné, jambes plus basses que la tête">
<rect x="0" y="50" width="400" height="110" class="edu-wfill"/><line x1="0" y1="50" x2="400" y2="50" class="edu-water"/>
<line x1="90" y1="70" x2="330" y2="70" class="edu-ref"/>
<path class="edu-body-line" d="M300 70 L215 98"/>
<path class="edu-limb" d="M215 98 L150 126 L108 138"/><path class="edu-limb" d="M215 98 L152 134 L112 148"/>
<path class="edu-limb" d="M300 70 L352 60"/><circle class="edu-headfig" cx="315" cy="60" r="15"/>
<text class="edu-lb" x="196" y="66">angle = freinage</text>
<path class="edu-ar" d="M150 116 L150 98" marker-end="url(#nat-m1)"/>
<defs><marker id="nat-m1" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto"><path d="M1 8 L4.5 1 L8 8" fill="none" stroke="#E8543F" stroke-width="2.2" stroke-linecap="round"/></marker></defs>
<text class="edu-lb" x="96" y="158">les jambes traînent</text></svg></div>
<div class="edu-panel"><div class="edu-panel-h edu-good"><span class="edu-pip edu-good"></span>Corps aligné</div>
<svg viewBox="0 0 400 160" role="img" aria-label="Nageur de profil, corps horizontal juste sous la surface">
<rect x="0" y="50" width="400" height="110" class="edu-wfill"/><line x1="0" y1="50" x2="400" y2="50" class="edu-water"/>
<line x1="90" y1="82" x2="330" y2="82" class="edu-ref"/>
<path class="edu-body-line" d="M300 82 L212 86"/>
<path class="edu-limb" d="M212 86 L150 90 L110 94"/><path class="edu-limb" d="M212 86 L152 96 L112 102"/>
<path class="edu-limb" d="M300 82 L352 76"/><circle class="edu-headfig" cx="313" cy="74" r="15"/>
<path class="edu-ak" d="M272 60 L272 76" marker-end="url(#nat-m2)"/>
<defs><marker id="nat-m2" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto"><path d="M1 1 L4.5 8 L8 1" fill="none" stroke="#4FC3E8" stroke-width="2.2" stroke-linecap="round"/></marker></defs>
<text class="edu-lk" x="210" y="56">appui poitrine</text><text class="edu-lk" x="104" y="128">les jambes remontent</text></svg></div>
<figcaption>Quand tu appuies sur le haut de la poitrine, le corps bascule et <b>les jambes remontent seules</b>. Tu ne les remontes pas en battant plus fort.</figcaption>`;

const SVG_P2 = `
<div class="edu-panel"><div class="edu-panel-h edu-bad"><span class="edu-pip edu-bad"></span>Tête levée</div>
<svg viewBox="0 0 400 145" role="img" aria-label="Vue de face, tête sortie de l'eau, deux lunettes au-dessus de la surface">
<rect x="0" y="86" width="400" height="59" class="edu-wfill"/><line x1="0" y1="86" x2="400" y2="86" class="edu-water"/>
<circle class="edu-headfig" cx="190" cy="50" r="30"/>
<circle cx="178" cy="44" r="8" fill="none" stroke="#141414" stroke-width="3.5"/><circle cx="202" cy="44" r="8" fill="none" stroke="#141414" stroke-width="3.5"/>
<line x1="186" y1="44" x2="194" y2="44" stroke="#141414" stroke-width="3.5"/><ellipse cx="190" cy="64" rx="7" ry="5" fill="#141414"/>
<path class="edu-body-line" d="M160 94 L220 94"/>
<text class="edu-lb" x="238" y="42">2 lunettes</text><text class="edu-lb" x="238" y="58">hors de l'eau</text>
<path class="edu-ar" d="M252 94 L252 114" marker-end="url(#nat-m3)"/>
<defs><marker id="nat-m3" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto"><path d="M1 1 L4.5 8 L8 1" fill="none" stroke="#E8543F" stroke-width="2.2" stroke-linecap="round"/></marker></defs>
<text class="edu-lb" x="266" y="112">le bassin plonge</text></svg></div>
<div class="edu-panel"><div class="edu-panel-h edu-good"><span class="edu-pip edu-good"></span>Tête tournée</div>
<svg viewBox="0 0 400 145" role="img" aria-label="Vue de face, tête tournée sur le côté, une lunette reste immergée">
<rect x="0" y="86" width="400" height="59" class="edu-wfill"/>
<circle class="edu-headfig" cx="190" cy="84" r="30"/>
<g transform="rotate(-34 190 84)">
<circle cx="178" cy="78" r="8" fill="none" stroke="#141414" stroke-width="3.5"/><circle cx="202" cy="78" r="8" fill="none" stroke="#141414" stroke-width="3.5"/>
<line x1="186" y1="78" x2="194" y2="78" stroke="#141414" stroke-width="3.5"/><ellipse cx="190" cy="98" rx="7" ry="5" fill="#141414"/></g>
<line x1="0" y1="86" x2="400" y2="86" class="edu-water"/>
<path class="edu-body-line" d="M160 110 L220 110"/>
<text class="edu-lk" x="240" y="70">1 lunette</text><text class="edu-lk" x="240" y="86">reste dessous</text>
<text class="edu-lk" x="30" y="126">le corps ne bouge pas</text></svg></div>
<figcaption>La tête <b>pivote</b> dans l'axe du corps, elle ne monte pas. Si tes deux lunettes sortent, tu t'es redressé.</figcaption>`;

const SVG_P3 = `
<div class="edu-panel"><div class="edu-panel-h edu-bad"><span class="edu-pip edu-bad"></span>Le coude tombe</div>
<svg viewBox="0 0 400 160" role="img" aria-label="Bras tendu balayant vers le bas, avant-bras à plat">
<rect x="0" y="32" width="400" height="128" class="edu-wfill"/><line x1="0" y1="32" x2="400" y2="32" class="edu-water"/>
<circle cx="118" cy="60" r="9" fill="#141414"/><text class="edu-lm" x="86" y="48">épaule</text>
<path class="edu-limb" style="stroke-width:7" d="M118 60 L210 110 L294 130"/><circle cx="300" cy="132" r="8" fill="#141414"/>
<circle cx="210" cy="110" r="7" fill="none" stroke="#E8543F" stroke-width="3.5"/><text class="edu-lb" x="172" y="138">coude bas</text>
<path class="edu-ar" d="M328 124 L352 136" marker-end="url(#nat-m4)"/>
<defs><marker id="nat-m4" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto"><path d="M1 1 L8 4.5 L1 8" fill="none" stroke="#E8543F" stroke-width="2.2" stroke-linecap="round"/></marker></defs>
<text class="edu-lb" x="230" y="100">tu pousses vers le bas</text></svg></div>
<div class="edu-panel"><div class="edu-panel-h edu-good"><span class="edu-pip edu-good"></span>Le coude reste haut</div>
<svg viewBox="0 0 400 160" role="img" aria-label="Coude proche de la surface, avant-bras vertical orienté vers l'arrière">
<rect x="0" y="32" width="400" height="128" class="edu-wfill"/><line x1="0" y1="32" x2="400" y2="32" class="edu-water"/>
<circle cx="118" cy="60" r="9" fill="#141414"/><text class="edu-lm" x="86" y="48">épaule</text>
<path class="edu-limb" style="stroke-width:7" d="M118 60 L236 54 L244 130"/><circle cx="246" cy="134" r="8" fill="#141414"/>
<path d="M230 60 L230 130 L260 130 L260 60 Z" fill="#4FC3E8" opacity=".18"/>
<circle cx="236" cy="54" r="7" fill="none" stroke="#4FC3E8" stroke-width="3.5"/><text class="edu-lk" x="208" y="42">coude haut</text>
<text class="edu-lk" x="274" y="98">l'avant-bras</text><text class="edu-lk" x="274" y="114">fait pagaie</text>
<path class="edu-ak" d="M196 146 L140 146" marker-end="url(#nat-m5)"/>
<defs><marker id="nat-m5" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto"><path d="M8 1 L1 4.5 L8 8" fill="none" stroke="#4FC3E8" stroke-width="2.2" stroke-linecap="round"/></marker></defs>
<text class="edu-lk" x="42" y="158">tu tires vers l'arrière</text></svg></div>
<figcaption>Le coude reste près de la surface pendant que la main descend. L'avant-bras devient une <b>pagaie verticale</b> qui pousse l'eau vers tes pieds.</figcaption>`;

const SVG_P4 = `
<div class="edu-panel"><div class="edu-panel-h edu-bad"><span class="edu-pip edu-bad"></span>Visée haute</div>
<svg viewBox="0 0 400 160" role="img" aria-label="Nageur relevant toute la tête pour viser, le bassin plonge">
<rect x="0" y="52" width="400" height="108" class="edu-wfill"/><line x1="0" y1="52" x2="400" y2="52" class="edu-water"/>
<path class="edu-body-line" d="M296 66 L212 96"/>
<path class="edu-limb" d="M212 96 L150 124 L110 136"/><path class="edu-limb" d="M212 96 L152 132 L112 146"/>
<path class="edu-limb" d="M296 66 L344 54"/>
<circle class="edu-headfig" cx="312" cy="40" r="15"/>
<circle cx="318" cy="36" r="3.2" fill="#141414"/>
<text class="edu-lb" x="238" y="26">toute la tête sort</text>
<path class="edu-ar" d="M150 114 L150 96" marker-end="url(#nat-m6)"/>
<defs><marker id="nat-m6" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto"><path d="M1 8 L4.5 1 L8 8" fill="none" stroke="#E8543F" stroke-width="2.2" stroke-linecap="round"/></marker></defs>
<text class="edu-lb" x="82" y="158">le bassin plonge à chaque visée</text></svg></div>
<div class="edu-panel"><div class="edu-panel-h edu-good"><span class="edu-pip edu-good"></span>Yeux de crocodile</div>
<svg viewBox="0 0 400 160" role="img" aria-label="Nageur relevant à peine les yeux au-dessus de la surface pour viser">
<rect x="0" y="52" width="400" height="108" class="edu-wfill"/>
<path class="edu-body-line" d="M298 76 L212 82"/>
<path class="edu-limb" d="M212 82 L150 86 L110 90"/><path class="edu-limb" d="M212 82 L152 92 L112 98"/>
<path class="edu-limb" d="M298 76 L346 66"/>
<circle class="edu-headfig" cx="314" cy="60" r="15"/>
<line x1="0" y1="52" x2="400" y2="52" class="edu-water"/>
<circle cx="320" cy="48" r="3.2" fill="#141414"/>
<text class="edu-lk" x="228" y="34">seuls les yeux sortent</text>
<path class="edu-ak" d="M282 96 L200 96" marker-end="url(#nat-m7)"/>
<defs><marker id="nat-m7" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto"><path d="M8 1 L1 4.5 L8 8" fill="none" stroke="#4FC3E8" stroke-width="2.2" stroke-linecap="round"/></marker></defs>
<text class="edu-lk" x="96" y="130">le corps reste à plat</text></svg></div>
<figcaption>Tu relèves <b>juste les yeux</b>, au moment où ta main entre devant. Puis tu tournes la tête pour respirer dans le même mouvement — viser et respirer, c'est un seul geste, pas deux.</figcaption>`;

const SVG_BALAYAGE = `
<div class="edu-panel"><div class="edu-panel-h edu-good"><span class="edu-pip edu-good"></span>1. Le trajet des mains — vu de dessus</div>
<svg viewBox="0 0 400 200" role="img" aria-label="Vue de dessus d'un nageur, les mains devant décrivent de petits balayages vers l'extérieur puis vers l'intérieur">
<rect x="0" y="0" width="400" height="200" fill="#4FC3E8" opacity=".08"/>
<circle class="edu-headfig" cx="200" cy="164" r="19"/>
<path class="edu-body-line" d="M176 150 L224 150"/>
<path class="edu-limb" d="M180 150 L166 92"/><path class="edu-limb" d="M220 150 L234 92"/>
<path class="edu-ref" d="M166 88 C 122 76, 122 60, 168 52"/>
<path class="edu-ref" d="M234 88 C 278 76, 278 60, 232 52"/>
<ellipse cx="166" cy="90" rx="11" ry="8" fill="#141414"/>
<ellipse cx="234" cy="90" rx="11" ry="8" fill="#141414"/>
<path class="edu-ak" d="M146 82 L128 72" marker-end="url(#nat-b1)"/>
<path class="edu-ak" d="M254 82 L272 72" marker-end="url(#nat-b1)"/>
<path class="edu-ak" d="M136 56 L162 50" marker-end="url(#nat-b1)"/>
<path class="edu-ak" d="M264 56 L238 50" marker-end="url(#nat-b1)"/>
<defs><marker id="nat-b1" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto"><path d="M1 1 L8 4.5 L1 8" fill="none" stroke="#4FC3E8" stroke-width="2.2" stroke-linecap="round"/></marker></defs>
<text class="edu-lk" x="128" y="112">dehors</text><text class="edu-lk" x="252" y="112">dehors</text>
<text class="edu-lk" x="168" y="36">dedans</text>
<text class="edu-lm" x="150" y="192">amplitude : 30 cm environ</text></svg></div>
<div class="edu-panel"><div class="edu-panel-h edu-bad"><span class="edu-pip edu-bad"></span>2. Ce qui compte : la bascule du poignet</div>
<svg viewBox="0 0 400 190" role="img" aria-label="Comparaison de l'inclinaison de la paume selon le sens du balayage">
<line x1="200" y1="14" x2="200" y2="176" stroke="#CFC7B9" stroke-width="2" stroke-dasharray="5 5"/>
<g transform="translate(0,0)">
<text class="edu-lk" x="26" y="30">MAIN QUI VA VERS L'EXTÉRIEUR</text>
<g transform="rotate(-24 100 100)">
<rect x="72" y="70" width="56" height="72" rx="12" fill="#fff" stroke="#141414" stroke-width="4"/>
<circle cx="66" cy="132" r="9" fill="#fff" stroke="#141414" stroke-width="4"/>
</g>
<text class="edu-lm" x="26" y="166">pouce incliné vers le bas</text>
<path class="edu-ak" d="M150 106 L182 106" marker-end="url(#nat-b2)"/>
</g>
<g transform="translate(0,0)">
<text class="edu-lk" x="228" y="30">MAIN QUI REVIENT VERS L'INTÉRIEUR</text>
<g transform="rotate(24 300 100)">
<rect x="272" y="70" width="56" height="72" rx="12" fill="#fff" stroke="#141414" stroke-width="4"/>
<circle cx="334" cy="132" r="9" fill="#fff" stroke="#141414" stroke-width="4"/>
</g>
<text class="edu-lm" x="228" y="166">pouce incliné vers le haut</text>
<path class="edu-ak" d="M250 106 L218 106" marker-end="url(#nat-b2)"/>
</g>
<defs><marker id="nat-b2" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto"><path d="M1 1 L8 4.5 L1 8" fill="none" stroke="#4FC3E8" stroke-width="2.2" stroke-linecap="round"/></marker></defs>
</svg></div>
<figcaption><b>La paume ne reste jamais à plat.</b> Elle s'incline à chaque changement de sens, comme une pale d'hélice — c'est cette inclinaison qui crée l'appui, pas la vitesse du mouvement. Sans elle, la main balaie l'eau sans rien accrocher et tu n'avances pas.</figcaption>`;

const SVG_POSITION = `
<div class="edu-panel"><div class="edu-panel-h edu-a"><span class="edu-pip edu-a"></span>Buste redressé</div>
<svg viewBox="0 0 400 190" role="img" aria-label="Cycliste de profil, buste redressé, grande surface exposée au vent">
<line x1="10" y1="172" x2="390" y2="172" class="edu-ground"/>
<circle cx="96" cy="146" r="26" class="edu-wheel"/><circle cx="300" cy="146" r="26" class="edu-wheel"/>
<path class="edu-limb2" d="M96 146 L188 132 L300 146"/><path class="edu-limb2" d="M188 132 L192 96"/>
<path class="edu-rider" d="M196 118 L216 62"/>
<path class="edu-limb2" d="M216 62 L268 84"/>
<path class="edu-limb2" d="M196 118 L178 148 L196 132"/>
<circle class="edu-headc" cx="222" cy="46" r="16"/>
<path class="edu-ref" d="M196 118 L286 118"/>
<text class="edu-lm" x="238" y="112">~45°</text>
<path class="edu-flow" d="M40 40 L136 40"/><path class="edu-flow" d="M40 62 L150 62"/><path class="edu-flow" d="M40 84 L128 84"/>
<text class="edu-lb" x="30" y="24">grande surface au vent</text></svg></div>
<div class="edu-panel"><div class="edu-panel-h edu-b"><span class="edu-pip edu-b"></span>Buste abaissé</div>
<svg viewBox="0 0 400 190" role="img" aria-label="Cycliste de profil en position aérodynamique, buste proche de l'horizontale">
<line x1="10" y1="172" x2="390" y2="172" class="edu-ground"/>
<circle cx="96" cy="146" r="26" class="edu-wheel"/><circle cx="300" cy="146" r="26" class="edu-wheel"/>
<path class="edu-limb2" d="M96 146 L188 132 L300 146"/><path class="edu-limb2" d="M188 132 L192 96"/>
<path class="edu-rider" d="M196 112 L268 92"/>
<path class="edu-limb2" d="M268 92 L296 96"/>
<path class="edu-limb2" d="M196 112 L178 146 L196 130"/>
<circle class="edu-headc" cx="286" cy="82" r="16"/>
<path class="edu-ref" d="M196 112 L292 112"/>
<text class="edu-lm" x="216" y="130">~10°</text>
<path class="edu-flow" d="M40 62 L166 62"/><path class="edu-flow" d="M40 78 L180 78"/>
<text class="edu-lk" x="30" y="46">surface réduite</text></svg></div>
<figcaption>Au-delà de 25 km/h, l'essentiel de ce que tu combats est l'air. Abaisser le buste réduit la surface exposée — mais contraint la respiration et la production de puissance. <b>La bonne position n'est pas la plus basse : c'est la plus basse que tu tiens sans perdre de watts sur la durée de ta course.</b></figcaption>`;

const SVG_VIRAGE = `
<div class="edu-panel"><div class="edu-panel-h edu-a"><span class="edu-pip edu-a"></span>Freinage dans le virage</div>
<svg viewBox="0 0 400 170" role="img" aria-label="Vue de dessus d'un virage, freinage appliqué au milieu de la courbe">
<path d="M40 150 C 40 60, 150 30, 250 30 L 380 30" fill="none" stroke="#CFC7B9" stroke-width="34"/>
<path d="M40 150 C 40 60, 150 30, 250 30 L 380 30" fill="none" stroke="#141414" stroke-width="2.5" stroke-dasharray="7 7"/>
<circle cx="72" cy="106" r="7" fill="#141414"/>
<path d="M96 78 L118 62" stroke="#E8543F" stroke-width="3" fill="none" stroke-linecap="round"/>
<circle cx="128" cy="56" r="9" fill="none" stroke="#E8543F" stroke-width="4"/>
<text class="edu-lb" x="146" y="52">frein ici</text>
<text class="edu-lb" x="120" y="122">adhérence réduite,</text>
<text class="edu-lb" x="120" y="138">trajectoire qui s'élargit</text></svg></div>
<div class="edu-panel"><div class="edu-panel-h edu-b"><span class="edu-pip edu-b"></span>Freinage avant, relâché en courbe</div>
<svg viewBox="0 0 400 170" role="img" aria-label="Vue de dessus d'un virage, freinage avant l'entrée puis relance en sortie">
<path d="M40 150 C 40 60, 150 30, 250 30 L 380 30" fill="none" stroke="#CFC7B9" stroke-width="34"/>
<path d="M40 150 C 40 60, 150 30, 250 30 L 380 30" fill="none" stroke="#3D6FF0" stroke-width="2.5" stroke-dasharray="7 7"/>
<circle cx="52" cy="140" r="9" fill="none" stroke="#3D6FF0" stroke-width="4"/>
<text class="edu-lk" x="68" y="150">frein ici</text>
<circle cx="128" cy="56" r="7" fill="#141414"/>
<text class="edu-lk" x="146" y="52">roue libre</text>
<path class="edu-flow" d="M300 30 L368 30" marker-end="url(#velo-v1)"/>
<defs><marker id="velo-v1" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto"><path d="M1 1 L8 4.5 L1 8" fill="none" stroke="#3D6FF0" stroke-width="2.2" stroke-linecap="round"/></marker></defs>
<text class="edu-lk" x="266" y="64">relance en sortie</text></svg></div>
<figcaption>Tout le freinage se fait <b>avant</b> d'entrer. En courbe, l'adhérence disponible sert à tourner ; si tu en consommes pour freiner, il n'en reste plus pour tenir la trajectoire.</figcaption>`;

const SVG_CADENCE = `
<div class="edu-panel"><div class="edu-panel-h edu-a"><span class="edu-pip edu-a"></span>Cadence basse, foulée longue</div>
<svg viewBox="0 0 400 190" role="img" aria-label="Coureur de profil, pied posé loin devant le bassin, jambe tendue">
<line x1="10" y1="168" x2="390" y2="168" class="edu-ground"/>
<path class="edu-torso" d="M196 66 L200 118"/>
<circle class="edu-headc" cx="192" cy="48" r="16"/>
<path class="edu-limb" d="M200 118 L272 152 L296 166"/>
<path class="edu-limb" d="M200 118 L156 150 L128 160"/>
<path class="edu-limb" d="M198 78 L238 96"/><path class="edu-limb" d="M198 78 L158 92"/>
<path class="edu-ref" d="M200 118 L200 168"/>
<path class="edu-ref" d="M296 166 L296 120"/>
<path d="M200 132 L292 132" stroke="#E8543F" stroke-width="3" fill="none" stroke-dasharray="4 4"/>
<text class="edu-lb" x="204" y="126">pied loin devant le bassin</text>
<text class="edu-lb" x="228" y="184">effet de freinage à chaque appui</text></svg></div>
<div class="edu-panel"><div class="edu-panel-h edu-b"><span class="edu-pip edu-b"></span>Cadence plus élevée</div>
<svg viewBox="0 0 400 190" role="img" aria-label="Coureur de profil, pied posé proche de la verticale du bassin, genou fléchi">
<line x1="10" y1="168" x2="390" y2="168" class="edu-ground"/>
<path class="edu-torso" d="M196 66 L200 118"/>
<circle class="edu-headc" cx="192" cy="48" r="16"/>
<path class="edu-limb" d="M200 118 L232 146 L226 166"/>
<path class="edu-limb" d="M200 118 L168 142 L186 122"/>
<path class="edu-limb" d="M198 78 L230 100"/><path class="edu-limb" d="M198 78 L164 96"/>
<path class="edu-ref" d="M200 118 L200 168"/>
<path d="M200 132 L222 132" stroke="#F07A2B" stroke-width="3" fill="none" stroke-dasharray="4 4"/>
<text class="edu-lk" x="232" y="126">appui plus proche</text>
<text class="edu-lk" x="52" y="184">foulée raccourcie, charge répartie</text></svg></div>
<figcaption>Augmenter la cadence raccourcit mécaniquement la foulée et rapproche le point d'appui de la verticale du bassin. <b>Tu ne changes pas ta façon de poser le pied : tu changes où il se pose.</b> C'est ce qui réduit les forces subies à chaque impact.</figcaption>`;

const SVG_COUT = `
<div class="edu-panel"><div class="edu-panel-h edu-n"><span class="edu-pip edu-n"></span>Coût énergétique de la course selon la pente</div>
<svg viewBox="0 0 400 230" role="img" aria-label="Courbe du coût énergétique de la course en fonction de la pente, très non linéaire, avec zone de bascule vers la marche entre 15 et 20 pour cent">
<rect x="248" y="24" width="46" height="164" fill="#E8A33D" opacity=".22"/>
<line x1="46" y1="188" x2="386" y2="188" stroke="#141414" stroke-width="2.5"/>
<line x1="46" y1="24" x2="46" y2="188" stroke="#141414" stroke-width="2.5"/>
<path d="M52 168 L86 176 L120 182 L154 178 L188 162 L222 138 L248 118 L272 96 L294 76 L330 50 L366 30"
      fill="none" stroke="#2E7D4F" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="188" cy="162" r="5" fill="#141414"/>
<circle cx="260" cy="107" r="5" fill="#141414"/>
<circle cx="366" cy="30" r="5" fill="#141414"/>
<text class="edu-lm" x="150" y="150">plat : 3,4</text>
<text class="edu-lk" x="252" y="16">bascule</text>
<text class="edu-lk" x="240" y="212">15-20 %</text>
<text class="edu-lm" x="326" y="52">+45 % : 18,9</text>
<text class="edu-lm" x="52" y="206">-20 %</text>
<text class="edu-lm" x="168" y="206">0</text>
<text class="edu-lm" x="352" y="206">+45 %</text>
<text class="edu-lm" x="6" y="100" transform="rotate(-90 16 110)">J/kg/m</text>
</svg></div>
<figcaption>La courbe n'est pas linéaire : le coût s'envole dans les pentes raides. Le minimum ne se situe pas sur le plat mais autour de <b>−20 %</b> de pente descendante, à environ 1,7 J/kg/m. Au-delà, en descente très raide, il remonte — freiner coûte de l'énergie.</figcaption>`;

const SVG_DESCENTE = `
<div class="edu-panel"><div class="edu-panel-h edu-a"><span class="edu-pip edu-a"></span>Buste en arrière</div>
<svg viewBox="0 0 400 200" role="img" aria-label="Coureur en descente, buste incliné vers l'arrière, jambe tendue devant en freinage">
<path class="edu-slope" d="M20 60 L380 180"/>
<path class="edu-torso" d="M186 74 L172 122"/>
<circle class="edu-headc" cx="192" cy="58" r="15"/>
<path class="edu-limb" d="M172 122 L236 140 L258 152"/>
<path class="edu-limb" d="M172 122 L132 146 L108 140"/>
<path class="edu-limb" d="M182 86 L216 76"/><path class="edu-limb" d="M182 86 L146 94"/>
<path class="edu-ref" d="M172 122 L172 60"/>
<path d="M258 152 L292 166" stroke="#E8543F" stroke-width="3" fill="none" stroke-dasharray="4 4"/>
<text class="edu-lb" x="200" y="112">jambe tendue devant</text>
<text class="edu-lb" x="42" y="184">talons qui freinent, chocs sur le genou</text></svg></div>
<div class="edu-panel"><div class="edu-panel-h edu-b"><span class="edu-pip edu-b"></span>Buste dans l'axe de la pente</div>
<svg viewBox="0 0 400 200" role="img" aria-label="Coureur en descente, buste perpendiculaire à la pente, appuis courts sous le bassin">
<path class="edu-slope" d="M20 60 L380 180"/>
<path class="edu-torso" d="M196 70 L206 118"/>
<circle class="edu-headc" cx="200" cy="54" r="15"/>
<path class="edu-limb" d="M206 118 L238 134 L242 148"/>
<path class="edu-limb" d="M206 118 L176 132 L192 116"/>
<path class="edu-limb" d="M198 82 L232 78"/><path class="edu-limb" d="M198 82 L166 92"/>
<path class="edu-ref" d="M206 118 L188 62"/>
<path d="M244 152 L296 128" stroke="#2E7D4F" stroke-width="3" fill="none" marker-end="url(#trail-t1)"/>
<defs><marker id="trail-t1" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto"><path d="M1 1 L8 4.5 L1 8" fill="none" stroke="#2E7D4F" stroke-width="2.2" stroke-linecap="round"/></marker></defs>
<text class="edu-lk" x="248" y="106">regard loin devant</text>
<text class="edu-lk" x="40" y="184">appuis courts, rapides, sous le bassin</text></svg></div>
<figcaption>Le réflexe de se pencher en arrière allonge la foulée devant soi et transforme chaque appui en freinage. <b>Le buste reste dans l'axe de la pente</b>, les appuis sont courts et fréquents — tu accompagnes la descente au lieu de la retenir.</figcaption>`;

const SVG_T2 = `
<div class="edu-panel"><div class="edu-panel-h edu-n"><span class="edu-pip edu-n"></span>Où passe le temps en transition</div>
<svg viewBox="0 0 400 200" role="img" aria-label="Comparaison de deux transitions, l'une lente avec beaucoup de gestes, l'autre courte">
<text class="edu-lb" x="14" y="26">TRANSITION SUBIE</text>
<rect x="14" y="36" width="86" height="26" rx="6" fill="#F9DCD7" stroke="#141414" stroke-width="2.5"/>
<rect x="104" y="36" width="128" height="26" rx="6" fill="#F9DCD7" stroke="#141414" stroke-width="2.5"/>
<rect x="236" y="36" width="66" height="26" rx="6" fill="#F9DCD7" stroke="#141414" stroke-width="2.5"/>
<rect x="306" y="36" width="80" height="26" rx="6" fill="#F9DCD7" stroke="#141414" stroke-width="2.5"/>
<text class="edu-lm" x="20" y="54">poser vélo</text>
<text class="edu-lm" x="112" y="54">chaussures + chaussettes</text>
<text class="edu-lm" x="242" y="54">dossard</text>
<text class="edu-lm" x="312" y="54">hésitation</text>
<text class="edu-lb" x="14" y="82">plusieurs dizaines de secondes</text>

<text class="edu-lk" x="14" y="128">TRANSITION PRÉPARÉE</text>
<rect x="14" y="138" width="72" height="26" rx="6" fill="#D8EDDF" stroke="#141414" stroke-width="2.5"/>
<rect x="90" y="138" width="86" height="26" rx="6" fill="#D8EDDF" stroke="#141414" stroke-width="2.5"/>
<text class="edu-lm" x="20" y="156">poser vélo</text>
<text class="edu-lm" x="96" y="156">chaussures</text>
<line x1="180" y1="151" x2="384" y2="151" stroke="#2E7D4F" stroke-width="3" stroke-dasharray="6 6"/>
<text class="edu-lk" x="196" y="146">temps rendu à la course</text>
<text class="edu-lk" x="14" y="186">chaque geste supprimé est un geste qui ne rate pas</text></svg></div>
<figcaption>Le gain ne vient pas de gestes plus rapides mais de <b>gestes supprimés</b>. Chaussettes retirées, lacets élastiques, dossard déjà porté : chaque élément enlevé est du temps gagné et une source d'erreur en moins.</figcaption>`;

const SVG_TRAINE = `
<div class="edu-panel"><div class="edu-panel-h edu-a"><span class="edu-pip edu-a"></span>Sans pull buoy</div>
<svg viewBox="0 0 400 165" role="img" aria-label="Nageur en chaussures de course, jambes basses, traînée importante">
<rect x="0" y="50" width="400" height="115" fill="#7A4FCF" opacity=".10"/>
<line x1="0" y1="50" x2="400" y2="50" stroke="#7A4FCF" stroke-width="3.5"/>
<path class="edu-torso" d="M300 72 L214 100"/>
<path class="edu-limb" d="M214 100 L150 128 L112 142"/>
<path class="edu-limb" d="M214 100 L152 136 L114 152"/>
<rect x="92" y="132" width="30" height="16" rx="5" fill="#141414"/>
<rect x="94" y="142" width="30" height="16" rx="5" fill="#141414"/>
<path class="edu-limb" d="M300 72 L352 62"/>
<circle class="edu-headc" cx="315" cy="62" r="15"/>
<text class="edu-lb" x="66" y="120">les chaussures tirent vers le fond</text></svg></div>
<div class="edu-panel"><div class="edu-panel-h edu-b"><span class="edu-pip edu-b"></span>Avec pull buoy</div>
<svg viewBox="0 0 400 165" role="img" aria-label="Nageur en chaussures avec pull buoy entre les cuisses, corps horizontal">
<rect x="0" y="50" width="400" height="115" fill="#7A4FCF" opacity=".10"/>
<line x1="0" y1="50" x2="400" y2="50" stroke="#7A4FCF" stroke-width="3.5"/>
<path class="edu-torso" d="M300 84 L212 88"/>
<ellipse cx="196" cy="90" rx="22" ry="14" fill="#7A4FCF" stroke="#141414" stroke-width="3"/>
<path class="edu-limb" d="M176 90 L128 94 L106 96"/>
<path class="edu-limb" d="M176 94 L130 102 L108 106"/>
<rect x="86" y="88" width="28" height="15" rx="5" fill="#141414"/>
<rect x="88" y="100" width="28" height="15" rx="5" fill="#141414"/>
<path class="edu-limb" d="M300 84 L352 78"/>
<circle class="edu-headc" cx="313" cy="76" r="15"/>
<text class="edu-lk" x="150" y="132">jambes remontées, immobiles</text>
<text class="edu-lk" x="222" y="70">corps aligné</text></svg></div>
<figcaption>Le pull buoy ne sert pas au confort : il <b>compense la traînée des chaussures</b> et rend le battement inutile. Tes jambes ne servent plus à nager — elles se reposent en vue du segment de course suivant.</figcaption>`;

/** Registre indexé — la clé EST la valeur `ref` portée par les sections (`{type:"schema", ref}`). */
export const SVG_REGISTRY = {
  "nat-p1": SVG_P1,
  "nat-p2": SVG_P2,
  "nat-p3": SVG_P3,
  "nat-p4": SVG_P4,
  "nat-balayage": SVG_BALAYAGE,
  "velo-position": SVG_POSITION,
  "velo-virage": SVG_VIRAGE,
  "course-cadence": SVG_CADENCE,
  "trail-cout": SVG_COUT,
  "trail-descente": SVG_DESCENTE,
  "ench-t2": SVG_T2,
  "sr-traine": SVG_TRAINE,
};
