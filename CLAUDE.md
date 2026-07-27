# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Coach** (EnduraBuild) is a multisport training plan generator for triathlon, running, cycling, and swimming. It generates personalized training plans based on sport, event format, athlete level, and preparation duration.

- **Type**: Single-file HTML/JavaScript application (~1600 lines)
- **Primary File**: `Coach_Pro_V1.5.html` — the current version. `endurabuild-3.html` is the legacy predecessor, kept for reference/diffing; do not develop on it.
- **Language**: French (UI and code comments)
- **Dependencies**: Google Fonts only (graceful degradation if unavailable)
- **Deployment**: Fully self-contained, runs client-side in any modern browser; state persisted in `localStorage` (`eb_state_v1`)

A major V2 rewrite is planned — see [V2 Direction](#v2-direction-planned-rewrite) and `ROADMAP-V2.md`.

## V1.5 Architecture (what changed vs the legacy file)

V1.5 keeps the shared core described below (SPORTS config, `evalRules`, zone helpers, questionnaire flow) but reworks plan generation around **structured session steps** and **self-calibrating weekly volume**. Rule-ID comments (`R3.x`, `C1–C19`) mark invariants throughout — follow that convention when editing.

- **Steps model (R3.2)**: sessions carry `steps: [{role: warmup|body|cooldown, durationMin|distanceM, reps, zone, recoveryText, bnd:{floor,cap}}]` built by helpers `W/Wm/B/Bd/C/Cm` in `sess()`. `renderSess()` is the *only* place text is produced; it also computes `s.min` (the generator's own duration estimate — note it excludes inter-block recovery time). No text reparsing anywhere.
- **Volume curve pilots content (R3.3)**: normalized per-phase bands `{base:[0.50,0.68], dev:[0.68,0.92], spec:[0.94,1.0], peak:[1.0,1.0], taper:[0.55,0.30]}` × real peak hours give each week a target; an iterative pass (`scaleWeekBody`) scales body steps until the week's computed minutes match. Weeks store `vol_declared` (target) and `vol`/`vol_real` (computed). Floors/caps per block (`blockBounds`, R3.4b/R3.11/R3.12), beginner swim hard-capped at 850m/session (C15).
- **Taper actually tapers**: the decreasing `taper` band shrinks content; **R3.13** additionally converts the lightest easy days to OFF when session floors (incompressible warm-ups/cool-downs, beginner caps) prevent the week from dropping below 55% of the real peak. **C19** guarantees ≥1 peak-phase week even on short plans (6-week 5k) where rounding used to produce an empty peak phase.
- **Calibrated promises**: **C20** caps the declared curve for beginner swimmers at real capacity (~0.42h × weekly session budget — C15's 850m/session cap makes larger promises unfillable). **C21** scales brick caps ×0.8 for `history="reprise"` athletes (a full Ironman brick was 61% of their week) and gives the brick run leg a real per-format cap.
- **Acceptance spec**: the repo file `audit 2` is the user's spec for V1.5 (taper ≥40% reduction, no VO2 in taper, brick bounds per format, max week in peak phase, every session quantified). These rules are mechanized in `src/audit/coherenceScorer.ts` and all pass on 486 combinations — keep them green.

## Architecture & Key Concepts

> The flow, state object, SPORTS config, rule engine, and zone helpers below apply to both files. Session-building details (`struct()`, free-text `det`, the declared-volume formula) describe the **legacy** `endurabuild-3.html`; in V1.5 they are superseded by the steps model and R3.3 scaling described above.

### High-Level Flow

The application follows a step-by-step questionnaire UI:
1. **Sport Selection** → User picks sport (tri, run, bike, swim)
2. **Multi-Step Form** → Collects athlete profile (age, level, fitness capacity, injuries, etc.)
3. **Rule Engine** → Evaluates answers against domain rules to generate coaching guidance
4. **Plan Generation** → Builds week-by-week training schedule
5. **Rendering** → Displays plan with exercises, intensities, and pedagogical notes

### Global State Object (`S`)

```javascript
const S = {
  sport: null,              // "tri" | "run" | "bike" | "swim"
  answers: {},              // form input values keyed by question ID
  rules: [],                // computed rule objects [{id, what, val, why}]
  step: 0,                  // current form step index
  tier: "free",             // "free" | "premium"
  started: false,           // has user begun questionnaire
  prevRuleIds: new Set(),   // for animation state tracking
  showAllWeeks: false       // expanded view toggle
};
```

### Sport Configuration (`SPORTS`)

Each sport defines:
- **nom**: Display name
- **ico**: Emoji icon
- **accent**: Brand color
- **pitch**: Description
- **formats**: Array of [code, label] tuples (e.g., `["5k", "5 km"]`, `["marathon", "Marathon"]`)
- **minWeeks**: Minimum prep duration per format
- **disciplines**: Sport codes (sw=swim, bk=bike, rn=run)
- **terrains** or **milieux**: Optional terrain/environment variants

Example:
```javascript
run: {
  nom: "Course à pied",
  formats: [["5k", "5 km"], ["10k", "10 km"], ["semi", "Semi-marathon"], ["marathon", "Marathon"], ["trail", "Trail / Ultra"]],
  minWeeks: {"5k": 6, "10k": 8, semi: 12, marathon: 16, trail: 18},
  disciplines: ["rn"],
  terrains: [["route", "Route / bitume"], ["trail", "Trail / sentier"], ["piste", "Piste / mixte"]]
}
```

### Rule Engine (`evalRules()`)

Evaluates user answers and generates coaching rules. Rules encode domain knowledge:
- **Intent philosophy** (competition/finisher/pleasure)
- **Health priorities** (safety margins, injury accommodations)
- **Preparation duration** (minimum weeks per format)
- **Medical flags** (require physician clearance)
- **Sport-specific constraints** (terrain, milieu, equipment)

Each rule is a `{id, what, val, why}` object:
- **id**: Rule identifier (triggers animations/tracking)
- **what**: Category (e.g., "Philosophie", "Durée de préparation")
- **val**: Computed value or recommendation
- **why**: Pedagogical explanation

### Training Session Builder (`buildPlan()`)

Generates a complete training plan with:
- **Phase structure**: Base (30%) → Development (25%) → Specific (20%) → Peak (15%) → Taper (10%)
- **Volume progression**: Scales from `volBase` (58% of peak) to `volPeak` across phases
- **Session slots**: Called per phase/progression with `sess(slot, phase, prog)` where `prog` ranges [0, 1]
- **Slot types** (for running example):
  - `dur1`: Quality session #1 (varies by phase: threshold → race-pace → VO2)
  - `dur2`: Quality session #2 (endurance or force)
  - `durLong`: Long session (distance-capped by format and level)
  - `facileR`, `facile2`: Easy/recovery runs
  - `recup`, `off`: Rest/mobility

### Session Templates (`sess()`)

Each sport (run/bike/swim/tri) has dedicated session logic. Sessions use:
- **struct()**: Helper that formats exercise description with warm-up, main set, recovery, cool-down, and pedagogical note
- **P(lo, hi)**: Interpolation helper — scales min/max based on progression (0=start of phase, 1=end)

Example:
```javascript
struct({
  ech: "15min footing easy + 3 strides",
  corps: P(3, 4) + "×" + P(6, 10) + "min @ threshold pace",
  rec: "2min trot",
  rc: "10min cool-down",
  note: "Sustained but controlled, regular from first to last block."
})
// At phase start (prog=0): "3×6min @ threshold pace"
// At phase end (prog=1): "4×10min @ threshold pace"
```

### UI Rendering Pipeline

1. **renderStep()** → Renders current form step (sport picker or question card)
2. **refreshTrail()** → (Currently stubbed, was decision-tree display)
3. **bindInputs()** → Attaches event listeners to form controls
4. **refreshNav()** → Enables/disables "next" button based on validation
5. **renderBlueprint()** → Shows decision rules when user advances
6. **renderPlan()** → Displays week-by-week training schedule

### Intensity/Pace Calculation Helpers

Functions compute training zones from athlete data:
- **bikeZones(ftp, hz)**: Watts-based zones if FTP known, else fallback RPE descriptions
- **runZones(pace, hz)**: Min/km ranges interpolated from threshold pace
- **hrZones(age, hrMax, hrRest)**: Bpm ranges (Karvonen if resting HR known, else %hrMax)
- **swimZones(css)**: Sec/100m ranges derived from CSS (Critical Swim Speed)

## Key Data Structures & Conventions

### Answer Keys (in `S.answers`)

Each form question stores its answer with a standardized key:
- `sport`: Selected sport ID
- `format`: Event format (e.g., "marathon", "Full")
- `level`: Athlete experience ("debutant", "inter", "confirme", "ancien")
- `intent`: Training philosophy ("competition", "finir", "plaisir")
- `history`: Fitness recap ("reprise", "confirme", "ancien")
- `vol_max`: Max weekly hours (integer, typical range 5–20)
- `age`, `hr_max`, `hr_rest`: Cardio parameters
- `ftp`, `ftp_known`: FTP watts + known flag
- `pace`, `pace_known`: Threshold pace (m:ss format) + known flag
- `css`, `css_known`: Swimming CSS (sec/100m) + known flag
- `injury`: Comma-separated injury flags (e.g., "genou,cheville")
- `med_pain`, `med_dizzy`, `med_treat`: Medical flags
- `race_date`: ISO date string
- `dispo`: Availability ("quotidienne", other levels)
- `off_which`: Comma-separated rest days ("lun,mer,dim")
- Sport-specific: `terrain`, `milieu`, `epreuve`, `ow`, `doubles`, etc.

### Long-Distance Session Caps (FIX cohérence Markers)

Four "FIX cohérence" comments in the code mark validated distance/duration progressions:

1. **Running long sessions** (line ~676): Vary by format, not fixed global cap
   - 5k: 40–75 min
   - 10k: 50–90 min
   - Semi: 70–130 min
   - Marathon: 90–180 min
   - Trail: 120–270 min

2. **Cycling long sessions** (line ~697): Vary by format
   - Crit: 60–150 min
   - Route: 90–180 min
   - CLM: 75–165 min
   - Cyclo: 120–240 min
   - Gravel: 150–330 min

3. **Swimming long sessions** (line ~721): Vary by format and level
   - Beginner: 200–900m (all formats)
   - Sprint: 600–1400m
   - Demi-fond: 1000–2000m
   - Fond: 1500–3000m
   - Open Water: 1500–4500m

4. **Triathlon brick/run caps** (line ~747): Format-specific
   - Bike: S 45–90 min, M 60–120, 70.3 90–180, Full 150–300
   - Run: S 10–20 min, M 15–30, 70.3 20–45, Full 30–75

All validated by fuzzing 486 combinations (4 sports × formats × 3 historiques × 3 levels × 3 intents) with monotonic progression.

## Known Issues & TODO

### Current status (audit runs against `Coach_Pro_V1.5.html`)

Run `npm run audit:v1` — 486 combinations, 100% structured coverage, **0 hard violations anywhere**. All `audit 2` acceptance rules pass: taper reduction ≥40% everywhere, 0 VO2 in taper, 0 brick-bound violations, max week always in peak phase, 0 unquantified sessions, 0 adjacent hard days, 0 recovery weeks heavier than normal, 0 weeks out of the [0.5, 1.4] prescribed/declared band, 0 long-day >55% alerts. Peak ratio medians 1.05–1.13; minimum score 90.

The only residual soft signal: ~12 short plans (5k) with peak ratios ~1.23 — inside the acceptable band; the gap is largely the auditor counting inter-block recovery time, which the generator's own metric excludes by design. Not a defect.

### Historical: defects found in legacy `endurabuild-3.html` (all resolved in V1.5)

The Sprint 0 audit of the legacy file found: taper inoperative in 243/486 plans (no `taper` branch in `sess()`); bike over-prescribing (median peak ratio 1.25, 302 weeks out of band); swim under-prescribing (median 0.62); 90 recovery weeks heavier than normal weeks; ~42 unquantified sessions per tri plan. V1.5's steps model + R3.3 scaling fixed all of these; the last taper gaps (swim beginners, empty peak phase on 5k plans) were closed by R3.13 and C19.

**Untreated Gisement**:
- Triathlon swim doesn't use `durLong` progression — uses fixed 100m reps that never scale to race distance
- Athlete in Full Ironman should build toward 3800m, not stay at static reps

### Design Constraints to Honor

- **Beginner swimmers**: Capped at 4 units/week regardless of historical level (technique trumps experience)
- **Injury accommodations**: Impact sports (run) reduced if relevant joints flagged; non-pliance runs on soft surfaces
- **VO2max sessions**: Reserved for non-beginner, non-finisher, non-impact-injury profiles
- **Plyometric work**: Bondissements restricted to solid profiles (inter+, non-finisher, no impact injury)
- **Doubles sessions**: Tri-specific feature; doubles flag enables AM swim + PM bike/run combos
- **Medical priority**: If any med flag set (pain, dizziness, treatment), no intensity generated until physician clearance

## V2 Direction (Planned Rewrite)

`ROADMAP-V2.md` (in French) defines the target architecture for the next generation of the tool: a **reason-then-generate-then-validate** engine, replacing the current direct questionnaire→plan pipeline. Read it before starting any structural work. Key points:

### Pipeline (reason → generate → audit → adapt)

1. **Reasoning engine** — analyzes athlete profile (FTP, VMA, CSS, level), constraints (schedule, equipment, climate), calendar (races, vacations), and injury history, producing a **constraint matrix** that guides generation. The matrix imports V1's validated caps rather than re-deriving them.
2. **Coherent generation** — load/recovery week alternation plus an **80/20 intensity distribution** (the canonical number; "85/15 polarized" was dropped as contradictory with the Sweet Spot/tempo session library), sport-specific variety, easy/moderate/hard differentiation.
3. **Automatic audit** — a coherence score /100 checking volume progression (never +10%/week), acute:chronic load ratio, forbidden patterns, load/recovery alternation, 80/20 split, and injury risk. Safety rules (medical flags, forbidden patterns, injury caps) are **hard pass/fail blockers regardless of score**. **Score < 90 → targeted repair** (audit returns which checks failed and where; the generator fixes those weeks), with an iteration cap and a "best plan + explicit warnings" fallback for unsatisfiable constraints — never blind regeneration, which would loop forever with a deterministic generator. The audit must stay implementation-independent from the generator (bottom-up load computation from session texts).
4. **Daily readiness adaptation** — HRV (7-day rolling), sleep, Body Battery, Training Readiness, and actual completed sessions drive a recalculation-on-open that can replace, modify, or postpone the day's session (e.g., low HRV + bad sleep → swap VO2 for endurance). **Readiness source is pluggable**: manual entry (MVP) → FIT upload → Garmin API *if access is granted* (Garmin Health API is a gated B2B program — not guaranteed). Strava covers completed activities but not HRV/sleep.

### Hard rules (apply to V2 generation, and worth respecting in V1 fixes too)

- ❌ Never two consecutive long runs
- ❌ Never two demanding leg sessions back-to-back
- ❌ Never two >2h sessions close together
- ❌ Recovery weeks must never carry more load than normal weeks
- Run sessions capped at 2h15 generically, with per-format exceptions encoded in the constraint matrix (marathon up to 3h, trail up to 4h30 — the validated V1 caps)
- Swim sessions: 1500m minimum advised **for non-beginners only** (V1's beginner technique cap of 200–900m takes precedence), 2000–3500m ideal
- Weekly volume progression never exceeds +10%

### Target stack and structure

V2 is planned as **modular TypeScript** (not single-file HTML): `src/engine/` (reasoning, constraint matrix, progression, **`loadModel.ts`** — the shared TSS-like load metric that progression checks, acute:chronic audit, and CTL/ATL analytics all depend on), `src/generator/` (sessions, weeks, variety rules), `src/audit/` (scoring, validation, repair), `src/readiness/` (pluggable source: manual/FIT/Garmin), `src/nutrition/`, `src/analytics/`. Persistence is localStorage-first with recalc-on-open; no backend through Sprint 2.

Testing strategy: **property-based tests are central, not auxiliary** — generalize V1's 486-combination fuzz to the full input space (monotonic progression, no forbidden pattern, load within caps, audit ≥ threshold). Every constraint in the matrix carries provenance and justification, extending V1's `{id, what, val, why}` rule format.

### Sprint order (amended)

0. **Sprint 0**: Coherence auditor + load model, run **against V1's `buildPlan`** via the note.md Node harness — finishes the interrupted V1 audit (peak-week volume vs declared; suspects: BIKE over-, SWIM/TRI under-prescribed) and becomes the executable spec for the V2 generator
1. **Sprint 1**: Reasoning engine (`TrainingReasoningEngine`, constraint matrix importing V1 caps) + session generator with audit-driven repair loop
2. **Sprint 2**: Daily readiness adaptation (manual-entry MVP, Strava for completed activities, Garmin if access granted)
3. **Deferred** until generated plans consistently score ≥90: nutrition (needs nutritionist review before release), analytics dashboard, gamification, sharing

### V1 ↔ V2 relationship

The current `endurabuild-3.html` stays the working product during the transition. Domain knowledge already validated in V1 — the "FIX cohérence" distance caps, beginner-swimmer technique cap, injury accommodations, medical gating — must carry over into the V2 constraint matrix rather than being re-derived. The V1 known issues (peak-week volume audit, triathlon swim not scaling to race distance) are natural test cases for the V2 audit scorer.

## Development & Testing

### Commands (V2 / Sprint 0)

- `npm run audit:v1` — runs the coherence audit over all 486 combinations against `Coach_Pro_V1.5.html`; writes `audit-results/v1-audit.{json,md}` and prints the summary. No dependencies to install: Node ≥22.18 runs the TypeScript directly (native type stripping — keep the code to erasable syntax: no enums/namespaces, imports use explicit `.ts` extensions). **Run this after any change to the generator and keep the acceptance rules at 0 failures.**

Audit code layout (all TypeScript, `src/`):
- `src/harness/v1Harness.ts` — loads the engine from the HTML into Node (script extraction by regex; final init stripped — V1.5's localStorage-restore IIFE or the legacy bare `renderStep();`; DOM+localStorage stubs; indirect eval with explicit export line). Pass a path to `loadV1()` to audit the legacy file.
- `src/engine/loadModel.ts` — per-session prescribed-load quantification, independent of the generator. V1.5 path: sums structured steps (duration×reps, distance via athlete pace refs) **plus inter-block recovery** (which the generator's own `s.min` excludes — expected estimator delta) and cross-checks against `s.min`. Legacy path: French text parsing (never the isolated max). Reports confidence per session.
- `src/audit/coherenceScorer.ts` — bottom-up audit: prescribed/declared ratio per week (`vol_declared` is the promise), long-session share, the mechanized `audit 2` acceptance rules (taper ≥40% cut, no VO2 in taper, brick bounds, peak placement with 5% tolerance for metric noise), recovery/adjacency checks; hard violations tracked separately from the provisional /100 score.
- `src/audit/runV1Audit.ts` — the 486-combination fuzz runner and report generator.

### Modifying Session Logic

To adjust session templates or progression:
1. Locate the sport branch in `sess()` (e.g., `if(sp==="run")`)
2. Find the slot handler (e.g., `if(slot==="dur1")`)
3. Modify the `S2.push({...})` object:
   - `d`: Discipline code (rn, bk, sw, br, rs)
   - `name`: Session title
   - `det`: Description (use `struct()` for consistency)
4. Test with `buildPlan()` across level/intent/history permutations

### Testing Long-Distance Progression

When modifying distance caps:
1. Update the `durCaps` object (e.g., `const durCaps={...}[fmt]`)
2. Run through 3+ progression levels (debutant/inter/confirme/ancien)
3. Run through 3+ intents (competition/finir/plaisir)
4. Verify `P(lo, hi)` interpolation yields sensible start/end values
5. Cross-check against real-world prep norms for the discipline

### Adding New Questions

1. Add question object to `buildFreeSteps()` or `buildPremiumSteps()` with:
   - `id`: Unique identifier
   - `label`, `q`, `sub`: User-facing text
   - `type`: "radio", "text", "number", "select", "checkbox"
   - `options`: Array of [value, label] or null for freeform
   - `valid(a)`: Predicate returning true if answer is valid
2. Add corresponding rule logic to `evalRules()` if needed
3. Wire into the questionnaire flow via `curSteps()`

### Validating Rule Coverage

All questions should either:
- Be used in `buildPlan()` to affect session structure
- Feed into `evalRules()` to generate coaching rules
- Be documented if they're UI-only or stage-gating

Current rule categories: intent, sante, duree, medical, terrain, epreuve, ow, bassin, milieu.

## File Layout

```
endurabuild-3.html
├─ <head>
│  ├─ CSS (all styles, paper/collage aesthetic)
│  └─ Google Fonts link
├─ <body>
│  ├─ .wrap (main container)
│  ├─ .trail (sticky coaching guide panel, collapsible on mobile)
│  ├─ .main
│  │  ├─ .hero (title + badge)
│  │  ├─ .progress (step indicator)
│  │  └─ .card (current form step or plan output)
│  └─ Footer (download button, reset)
└─ <script>
   ├─ SPORTS configuration
   ├─ Global state (S)
   ├─ Helper functions (opt, branch, zones, etc.)
   ├─ evalRules()
   ├─ buildFreeSteps() + buildPremiumSteps()
   ├─ buildPlan()
   ├─ Rendering pipeline (render*, refresh*, bind*, download*)
   └─ Event listener setup + init call (renderStep)
```

## Notes for AI Assistants

- **Language**: Code and comments are in French. Preserve French UI text and comment intent unless explicitly asked to change.
- **Coupling**: The application tightly couples questionnaire flow, rule logic, and plan generation. Changes to one often ripple to others.
- **Validation**: Long-distance and intensity caps are domain-sensitive. Validate changes against coaching literature or consult domain expert before shipping.
- **Responsive Design**: The UI is carefully crafted with CSS Grid/Flexbox and CSS Variables. Test responsiveness (mobile/tablet/desktop) when modifying layout.
- **Performance**: With 1100 lines embedded in HTML, keep bundle size low. Avoid external dependencies beyond Google Fonts.
- **Backward Compatibility**: The tool is already deployed. User plans from earlier versions may need graceful handling if data structures change.
