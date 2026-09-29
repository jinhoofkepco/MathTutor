import test from "node:test";
import assert from "node:assert/strict";
import {
  plan,
  blockFrame,
  mean,
  sum,
  generationValid,
  nextFriendClaim,
  reconstructionInterval,
  EPISODES,
  groupProgress,
  semanticStops,
} from "../deliverables/web/episodes/model.js";
import {
  createStore,
  calibration,
} from "../deliverables/web/episodes/storage.js";
const memory = () => {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) || null,
    setItem: (k, v) => data.set(k, v),
  };
};
test("specified means and all intermediate block identities/totals are preserved", () => {
  for (const e of Object.values(EPISODES))
    for (const g of [...e.groups, ...e.variations.flat()]) {
      const p = plan(g.values);
      assert.equal(p.total, sum(g.values));
      for (let step = 0; step <= 100; step++) {
        const blocks = blockFrame(p, step / 100);
        assert.equal(blocks.length, p.total);
        assert.equal(new Set(blocks.map((b) => b.id)).size, p.total);
        assert.ok(blocks.every((b) => Number.isFinite(b.x) && b.y >= 0));
      }
      const end = blockFrame(p, 1);
      for (let col = 0; col < g.values.length; col++)
        assert.equal(end.filter((b) => b.col === col).length, mean(g.values));
    }
  assert.equal(mean(EPISODES.E0.groups[0].values), 8);
  assert.equal(mean(EPISODES.E0.groups[1].values), 7);
  assert.equal(mean(EPISODES.E1.groups[0].values), 5);
});
test("generation accepts every nonnegative integer solution, including extreme and repeated values", () => {
  assert.ok(generationValid("E0", [8, 8, 8, 8]));
  assert.ok(generationValid("E0", [0, 0, 0, 32]));
  assert.ok(generationValid("E1", [0, 0, 0, 24]));
  assert.ok(generationValid("E1", [3, 5, 7, 9]));
  assert.ok(!generationValid("E1", [6, 6, 6, 6]));
  assert.ok(!generationValid("E1", [6, 0, 0, 18]));
  assert.ok(!generationValid("E1", [4.5, 4.5, 7, 8]));
  for (let a = 0; a <= 24; a++)
    for (let b = 0; b <= 24 - a; b++)
      for (let c = 0; c <= 24 - a - b; c++) {
        const values = [a, b, c, 24 - a - b - c];
        assert.equal(generationValid("E1", values), !values.includes(6));
      }
});
test("one true friend claim per four new variation exposures; a true case can already contain its mean", () => {
  for (let i = 0; i < 20; i += 4) {
    const claims = Array.from({ length: 4 }, (_, j) =>
      nextFriendClaim(j % 2, i + j),
    );
    assert.equal(claims.filter((c) => c.correct).length, 1);
  }
  assert.equal(nextFriendClaim(0, 0).value, 6);
  assert.ok(EPISODES.E1.variations[0][0].values.includes(6));
  assert.deepEqual(reconstructionInterval([2, 0, 3, 1]), [0, 0.6]);
  assert.equal(reconstructionInterval([0, 1, 2, 3]), null);
});
test("completion is idempotent and discarded sessions cannot pollute adaptive scheduling", () => {
  const st = createStore(memory(), () => 1700000000000),
    abandoned = st.session("E1");
  st.event(abandoned, "predict", {
    prediction_value: 0,
    actual_value: 5,
    confidence: 4,
    response_time_ms: 3000,
  });
  const current = st.session("E1");
  st.event(current, "predict", {
    prediction_value: 5,
    actual_value: 5,
    confidence: 4,
    response_time_ms: 5000,
  });
  assert.equal(st.complete(current), true);
  assert.equal(st.complete(current), false);
  assert.equal(st.data.completed.E1, 1);
  assert.equal(st.data.schedule.E1.speed, 1);
  assert.equal(st.data.schedule.E1.interval, 2);
  assert.equal(st.session("E1").abstraction, 2);
  assert.equal(st.data.logs.at(-1).mean_prediction_error, 0);
});
test("classroom does not count as personal completion and incomplete confidence does not enter calibration", () => {
  const st = createStore(memory());
  assert.equal(st.complete(st.session("E0", true)), false);
  assert.equal(st.data.completed.E0, 0);
  const logs = [
    {
      event: "predict",
      confidence: null,
      prediction_value: null,
      actual_value: 8,
    },
    { event: "predict", confidence: 4, prediction_value: 5, actual_value: 5 },
    { event: "predict", confidence: 1, prediction_value: 4, actual_value: 5 },
  ];
  assert.deepEqual(
    calibration(logs).map((x) => x.n),
    [1, 1],
  );
});
test("rapid responses require a reflection after three, reset afterward, schema retains session and module", () => {
  const st = createStore(memory());
  assert.equal(st.respond(500), false);
  assert.equal(st.respond(900), false);
  assert.equal(st.respond(1900), true);
  st.reflect();
  assert.equal(st.respond(500), false);
  const s = st.session("E0");
  const e = st.event(s, "method", {
    text: "한 사람씩",
    response_time_ms: 2500,
  });
  for (const k of [
    "learner_id",
    "session_id",
    "episode",
    "module",
    "repetition",
    "abstraction_stage",
    "event",
    "friend_response",
    "prediction_value",
    "actual_value",
    "confidence",
    "response_time_ms",
    "reconstruct_attempts",
    "timestamp",
  ])
    assert.ok(k in e, k);
});

test('semantic pause boundaries leave no block in transit, including two-team development',()=>{for(const e of Object.values(EPISODES)){const plans=e.groups.map(g=>plan(g.values));for(const stop of semanticStops(plans)){const ps=groupProgress(plans,stop);plans.forEach((p,i)=>{for(const b of blockFrame(p,ps[i])){assert.ok(Math.abs(b.x-Math.round(b.x))<1e-8);assert.ok(Math.abs(b.y-Math.round(b.y))<1e-8);}});}}});
