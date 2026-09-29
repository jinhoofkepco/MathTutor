import { stageFor, reviewDelay } from "./model.js";
const KEY = "MathTutor.v1";
export function createStore(
  storage = globalThis.localStorage,
  now = () => Date.now(),
) {
  let data;
  try {
    data = JSON.parse(storage.getItem(KEY));
  } catch {}
  if (!data || data.schema !== 1)
    data = {
      schema: 1,
      learner_id:
        globalThis.crypto?.randomUUID?.() ||
        "local-" + Math.random().toString(36).slice(2),
      logs: [],
      completed: { E0: 0, E1: 0 },
      seen: {},
      schedule: {},
      variationExposure: 0,
      rapid: 0,
      settings: { captions: false, muted: false },
      calibrationAt: 0,
    };
  const save = () => {
    try {
      storage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  };
  function event(session, event, fields = {}) {
    const row = {
      learner_id: data.learner_id,
      episode: session.episode,
      module: `${session.episode}-${session.phase}`,
      session_id: session.session_id,
      classroom: !!session.classroom,
      repetition: session.repetition,
      abstraction_stage: session.abstraction,
      event,
      friend_response: session.friendResponse ?? null,
      prediction_value: null,
      actual_value: null,
      confidence: null,
      response_time_ms: null,
      reconstruct_attempts: session.attempts || 0,
      timestamp: new Date(now()).toISOString(),
      ...fields,
    };
    data.logs.push(row);
    save();
    return row;
  }
  function respond(ms) {
    data.rapid = ms < 2000 ? data.rapid + 1 : 0;
    save();
    return data.rapid >= 3;
  }
  function reflect() {
    data.rapid = 0;
    save();
  }
  function complete(s) {
    if (
      s.classroom ||
      s.completed ||
      data.logs.some(
        (l) => l.session_id === s.session_id && l.event === "episode_complete",
      )
    )
      return false;
    s.completed = true;
    data.completed[s.episode]++;
    const rows = data.logs.filter(
      (l) =>
        l.session_id === s.session_id &&
        l.event === "predict" &&
        Number.isFinite(l.prediction_value) &&
        Number.isFinite(l.actual_value),
    );
    const err = rows.length
      ? rows.reduce(
          (a, l) => a + Math.abs(l.prediction_value - l.actual_value),
          0,
        ) / rows.length
      : 0;
    const rt = rows.length
      ? rows.reduce((a, l) => a + l.response_time_ms, 0) / rows.length
      : 20000;
    const delay = reviewDelay(err, rt, data.schedule[s.episode]?.interval || 1);
    data.schedule[s.episode] = {
      due: new Date(now() + delay * 86400000).toISOString(),
      interval: delay,
      speed: err > 1 ? 0.75 : 1,
    };
    event(s, "episode_complete", { mean_prediction_error: err });
    save();
    return true;
  }
  function session(episode, classroom = false) {
    const repetition = data.completed[episode] + 1;
    return {
      session_id:
        globalThis.crypto?.randomUUID?.() ||
        "session-" + now() + "-" + Math.random().toString(36).slice(2),
      episode,
      phase: episode === "E0" ? "intro" : "friend",
      round: 0,
      repetition,
      abstraction: stageFor(repetition),
      classroom,
      friendResponse: null,
      claim: null,
      predictions: [],
      confidence: null,
      touched: [],
      confidenceTouched: false,
      phaseStarted: now(),
      attempts: 0,
      generated: [0, 0, 0, 0],
      speed: data.schedule[episode]?.speed || 1,
      highwater: 0,
      progress: 0,
      discovered: false,
    };
  }
  return { data, save, event, respond, reflect, complete, session, now };
}
export function calibration(logs) {
  logs = logs.filter(
    (l) =>
      !l.classroom &&
      Number.isFinite(l.prediction_value) &&
      Number.isFinite(l.actual_value) &&
      Number.isInteger(l.confidence) &&
      l.confidence >= 1 &&
      l.confidence <= 4,
  );
  const groups = [
    logs.filter((l) => l.event === "predict" && l.confidence >= 3),
    logs.filter((l) => l.event === "predict" && l.confidence <= 2),
  ];
  return groups.map((a) => ({
    n: a.length,
    closeness: a.length
      ? a.reduce(
          (s, l) => s + 1 / (1 + Math.abs(l.prediction_value - l.actual_value)),
          0,
        ) / a.length
      : null,
  }));
}
