# Mean physics lab — v4

Graphics-first learning apparatus for the mean section of 「중1하 프라임 1단원 개탐」. Numbers can be toggled; explanations and worked relations live under `!`. The first screen is a small, countable 2/4/6 example. The actual PDF data remain one click away.

## Lesson sequence

- **탐구 — crates:** Predict a common height, move identical crates, and preserve the total. Partial crates represent fractional values. The PDF's ten heights total 1504, mean 150.4 cm. In that dataset only, a common 120 cm base is omitted and a crate means 5 cm; the scale is always stated. The signed-difference view gathers positive and negative deviations, cancels matching amounts, then distributes the remainder. At reference 150: +42, −38, remainder 4, shared across 10.
- **1-1 — two racks:** Keep the original rack visible while changing the other through x → 3x → 3x−1. Contrast all values with one value. Illustrative positive integers are explicitly distinct from the PDF's general variables. All changed values give 3M−1; one changed value gives M+(2x₁−1)/n.
- **1-2 — single-file marble tubes:** Represent only the total score increase, never invented scores for other subjects. 71→95 and 79→82 imply 24 added points and a three-point mean increase. Initially four adjacent tubes, no future slots. Append/remove tubes as the learner changes the divisor; preserve marble size and the 24 marbles. At eight tubes, all reach the three-marble reference. Remainders remain visible. The final count includes mathematics. Practice conditions and help are generated together.
- **1-3 — rod pieces:** Begin with three illustrative rods split into halves and sent to the other two places. Then five rods split into quarters and sent to the other four places. Total length and number of places remain unchanged, so the mean is unchanged. These lengths are not the unknown original heights. After the five-person experiment, explicitly connect this invariant to the PDF's mean 158, then add 164 using the water apparatus.
- **두 집단 — equal-section tanks:** Each vessel represents one person; volume conserves the population-weighted total at every animation frame. Presets: 5×158 + 1×164 →159; reverse counts →163; equal counts →161; equal means →158. Double both group sizes to preserve the mean. Compare the unweighted midpoint, which only generally works for equal counts. The school extension uses 400/500 people and midpoint estimates 8.9/9.8; one tank represents 100 people and the resulting 9.4 is explicitly an estimated, additional question. Counts must be positive integers and multiples of the displayed vessel unit.
- **표본 — repeated samples:** Sample without replacement within a draw; random populations, editable population values, sample sizes and targets up to 3000. Save a distribution and compare with another sample size; histogram heights are proportions. Separate wheel/pinch zoom and drag pan. Explicit extension beyond the PDF mean questions.

## Physical representations

`dist/assets/mean-physics-kit-v4.glb` contains seven Blender-authored meshes. Source dimensions and a verified, baked native Bullet drop simulation are in `asset-specifications-v4.json`. Crates and marbles use Cannon-es gravity/contact in constrained vertical lanes in the browser. Transfers and rod exchange follow guided paths so the mathematical correspondence stays readable. Connected-tank water levels use an exact volume-preserving ideal model, not a fluid solver. Mathematical answers come from logical values, never noisy physical positions.

The site provides orthographic front view, orbit/pan, zoom, isometric view, fit, playback, pause, steps, reset and a 0.25–4× speed slider. Static before/after references and consistent object dimensions support comparison. Explanations distinguish PDF conditions, illustrative models, and extensions.

## Build / validation

`npm ci`, then `npm run build`. Host the static `dist` directory. Dependencies and GLB are served locally. The companion offline HTML embeds the same bundle, CSS and GLB.

Validated with a renderless interaction harness using real Three transforms, real GLB parsing and real Cannon contacts: exact and fractional mean conservation, manual crate transfer, pause/resume and speed scaling, +42/−38 cancellation, tube count and settled height at the 8×3 solution, visible remainder cases, fixed camera/object scale when tube count changes, all/one transformations, 3/5-person piece counts and mean invariance, weighted-volume conservation, group presets and count limits, practice help, sampling without replacement, saved comparison, 1000 full-population draws, optional WebMCP action validation, and default camera framing. Browser visual QA was not requested and was not performed. Live WebMCP registration is unverified.
