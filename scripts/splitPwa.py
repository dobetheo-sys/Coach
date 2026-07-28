#!/usr/bin/env python3
"""
splitPwa — découpe le script principal de Coach_Pro_V1.5.html en modules ES pour la PWA.

Extraction MÉCANIQUE (fidèle par construction) : les chunks top-level sont copiés
verbatim, routés vers leur fichier cible par nom, puis les imports croisés sont
calculés automatiquement (identifiants exportés référencés dans d'autres fichiers).
Le wrapper buildPlan V2 et l'IIFE d'init sont réécrits dans app.js (seuls chunks
transformés — signalés dans le rapport de migration).
"""
import re, os, json, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'Coach_Pro_V1.5.html'), encoding='utf-8').read()
code = re.search(r'<script>([\s\S]*?)</script>', html).group(1)
lines = code.splitlines(keepends=True)

# ---- 1. Chunks top-level : chaque déclaration démarre un chunk (col 0) ----
starts = []
for i, l in enumerate(lines):
    if re.match(r'^(async function |function |const |let |var |\(function)', l):
        starts.append(i)
starts.append(len(lines))
chunks = []  # (name, text, start_line)
for a, b in zip(starts, starts[1:]):
    text = ''.join(lines[a:b])
    m = re.match(r'^(?:(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*))', lines[a])
    name = (m.group(1) or m.group(2)) if m else '(iife)'
    # rattacher les commentaires qui précèdent immédiatement le chunk
    chunks.append((name, text, a + 1))

# ---- 2. Routage nom → fichier ----
FILES = {
    'config.js':   ['SPORTS', 'PREMIUM_STEPS_DEF', 'VLAB', 'QLABELS', 'RULE_CAT', 'CATS', 'HEROS', 'fieldTests'],
    'state.js':    ['S', 'esc', 'ebSave', 'ebLoad', 'ebClear', '$'],
    'legacy-fallback.js': ['bikeZones', 'runZones', 'hrZones', 'swimZones', 'buildPlan'],
    'ui/steps.js': ['opt', 'branch', 'evalRules', 'curCfg', 'buildFreeSteps', 'levelStep', 'injuryOpts',
                    'ebAvailArr', 'ebAvailSet', 'ebAvailDur', 'ebParseT', 'ebAddTest', '_fk100',
                    'buildPremiumSteps', 'curSteps', 'vlab', 'ruleTrigger', 'bindInputs', 'refreshTrail',
                    'refreshNav', 'renderSportPick', 'renderStep', 'rulesGrouped', 'renderBlueprint', 'reset'],
    'ui/plan-view.js': ['_IFZ', '_blkMin', 'estimateTSS', 'loadSeries', 'loadChartSVG', 'driverBand',
                        'renderPlan', 'downloadPlan', 'v2ExtrasHTML'],
    'ui/readiness.js': ['fetchWeather', 'applyReadiness'],
    'export.js':   ['planToJSON', '_dl', 'exportJSON', 'exportICS'],
}
route = {}
for f, names in FILES.items():
    for n in names:
        route[n] = f

SKIP = {'buildPlanLegacy'}  # wrapper V2 + IIFE réécrits dans app.js
out = {f: [] for f in FILES}
unrouted = []
for name, text, ln in chunks:
    if name in SKIP or name == '(iife)':
        continue
    f = route.get(name)
    if f is None:
        # tout chunk non listé va dans steps.js par défaut (fonctions Strava §10 etc.)
        f = 'ui/steps.js'
        unrouted.append((name, ln))
    out[f].append((name, text))

# ---- 3. Renommage : le buildPlan legacy devient buildPlanLegacy dans son module ----
lf = out['legacy-fallback.js']
for i, (name, text) in enumerate(lf):
    if name == 'buildPlan':
        lf[i] = ('buildPlanLegacy', text.replace('function buildPlan(a){', 'function buildPlanLegacy(a){', 1))

# ---- 4. Exports + imports croisés calculés ----
exported = {}   # file -> [names]
decl_re = re.compile(r'^(?:async\s+)?(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*))', re.M)
for f, items in out.items():
    names = []
    for _, t in items:
        for m in decl_re.finditer(t):
            names.append(m.group(1) or m.group(2))
    exported[f] = sorted(set(names))
# buildPlan (le wrapper V2) vivra dans app.js
exported['app.js'] = ['buildPlan']

word_re = re.compile(r'[A-Za-z_$][\w$]*')
def imports_for(f, body):
    own = set(exported[f])
    used = set(word_re.findall(body))
    imps = []
    for g, names in exported.items():
        if g == f:
            continue
        need = sorted(set(names) & used - own)
        # $ n'est pas capturé par \w mais word_re inclut $ ✓
        if need:
            depth = f.count('/')
            rel = ('../' * depth) if depth else './'
            imps.append('import { ' + ', '.join(need) + ' } from "' + rel + g + '";')
    return imps

os.makedirs(os.path.join(ROOT, 'endurabuild', 'js', 'ui'), exist_ok=True)
report = {'unrouted_to_steps': [n for n, _ in unrouted], 'files': {}}
for f, items in out.items():
    body = '\n'.join(t.rstrip('\n') for _, t in items) + '\n'
    header = ('// Module extrait de Coach_Pro_V1.5.html par scripts/splitPwa.py — extraction fidèle,\n'
              '// ne pas éditer la logique ici sans relancer les audits (npm run audit:v1 / audit:v2).\n')
    imps = imports_for(f, body)
    exp = 'export { ' + ', '.join(exported[f]) + ' };\n'
    content = header + '\n'.join(imps) + ('\n\n' if imps else '\n') + body + '\n' + exp
    path = os.path.join(ROOT, 'endurabuild', 'js', f)
    open(path, 'w', encoding='utf-8').write(content)
    report['files'][f] = {'chunks': [n for n, _ in items], 'imports': imps}

# ---- 5. CSS extrait + polices base64 → vrais woff2 (brief : assets/fonts, plus d'inline) ----
import base64
css = '\n'.join(re.findall(r'<style>([\s\S]*?)</style>', html))
os.makedirs(os.path.join(ROOT, 'endurabuild', 'css'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'endurabuild', 'assets', 'fonts'), exist_ok=True)
FACE = re.compile(r"@font-face\{font-family:'([^']+)';[^}]*?font-weight:([\d ]+);[^}]*?url\(data:font/woff2;base64,([A-Za-z0-9+/=]+)\)[^}]*\}")
def face_repl(m):
    fam, weight, b64 = m.group(1), m.group(2), m.group(3)
    fname = (fam + '-' + weight).lower().replace(' ', '-') + '.woff2'
    open(os.path.join(ROOT, 'endurabuild', 'assets', 'fonts', fname), 'wb').write(base64.b64decode(b64))
    head = m.group(0).split('src:url(')[0]
    return head + 'src:url("../assets/fonts/' + fname + '") format("woff2")}'
css = FACE.sub(face_repl, css)
open(os.path.join(ROOT, 'endurabuild', 'css', 'styles.css'), 'w', encoding='utf-8').write(css)
report_fonts = sorted(os.listdir(os.path.join(ROOT, 'endurabuild', 'assets', 'fonts')))

# ---- 6. Body HTML extrait (coquille) ----
body = re.search(r'<body>([\s\S]*?)<script>', html).group(1)
open(os.path.join(ROOT, 'endurabuild', 'body-extract.html'), 'w', encoding='utf-8').write(body)

report['fonts'] = report_fonts
print(json.dumps(report, indent=1, ensure_ascii=False))
