# MathTutor revision workflow

1. Read `mean_concept_video_work_order.md` and `deliverables/docs/implementation.md` before changing the app. The user's latest requested scope controls which episodes to implement. After accepting a revised work order, update `deliverables/docs/work_order_provenance.json` to its reviewed SHA-256; never modify the work order merely to pass verification.
2. `versions/v0/` and the `v0` Git tag are frozen. Never rebuild or modify that snapshot as part of v1 revisions. Verify its `preservation.json` hashes.
3. Current editable source is `deliverables/web/main.js` and `deliverables/web/episodes/`. Built `app.bundle.js` is committed for static hosting; regenerate with `npm run build` after source changes.
4. Keep the work order's visual grammar, prediction-before-result gates, response-before-principle gates, and nonjudgmental feedback. Only the friend response is categorical. Generation validators must accept all solutions to the stated conditions.
5. E0 has no friend. Keep E0's original team A distinct from its variation. E1's friend means the middle value after sorting, not the screen's middle column.
6. No external runtime network services. Bundle dependencies, models, prerecorded audio and video. Keep personal and classroom learning histories separate. Export logs locally.
7. New modules must start cleanly through the classroom module selector or the documented query URL. A learner cannot bypass a first-view input gate by linking directly to a result module.
8. Run `npm test`, `npm run build`, and `npm run verify`. Tests intentionally exercise real Three transformations and GSAP timelines without browser screenshots. Report whether visual/touch browser testing was actually performed; do not claim it based on these tests.
9. Keep delivery documentation and Korean narration scripts aligned with changes. Do not silently edit the user's work order to make an implementation discrepancy disappear.
10. Do not publish or overwrite the preserved Sites v0 when the requested destination is this GitHub repository.
