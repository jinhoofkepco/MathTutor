import { gsap } from "gsap";
import {
  EPISODES,
  MODULES,
  mean,
  sum,
  plan,
  blockFrame,
  generationValid,
  nextFriendClaim,
  calculationTasks,
  reconstructionInterval,
  shuffledScenes,
  semanticStops,
} from "./episodes/model.js";
import { createStore, calibration } from "./episodes/storage.js";
import { Visual, thumbnail, groupThumbnail } from "./episodes/visual.js";
import { Narrator } from "./episodes/audio.js";
const $ = (s) => document.querySelector(s),
  clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
  fmt = (n) => Number(n.toFixed(1)),
  escape = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const store = createStore(),
  params = new URLSearchParams(location.search),
  classroom = params.get("classroom") === "1";
let visual,
  narrator,
  S = null,
  timeline = null,
  ready = false,
  reflectionNext = null,
  replayTimer = null,
  holdTimer = null,
  drag = null;
const names = {
  intro: "시작",
  friend: "친구",
  method: "방법",
  predict: "예상",
  develop: "관찰",
  compare: "비교",
  reconstruct: "장면",
  question: "생각",
  variation: "다시",
  generate: "만들기",
  seal: "마지막",
  calculate: "계산",
};
const groups = () =>
  S.round
    ? EPISODES[S.episode].variations[S.round - 1]
    : EPISODES[S.episode].groups;
const elapsed = () => Math.max(0, Date.now() - S.phaseStarted);
const opts = (extra = {}) => ({
  abstraction: S.abstraction,
  numbers: S.abstraction >= 3,
  ...extra,
});
function record(event, fields = {}) {
  return store.event(S, event, { round: S.round, ...fields });
}
function renderScene(extra = {}) {
  visual.configure(groups(), opts(extra));
}
function stop() {
  timeline?.kill();
  timeline = null;
  clearTimeout(replayTimer);
  clearTimeout(holdTimer);
  narrator?.stop();
  $("#seal-video").pause();
  $("#seal-video").hidden = true;
  $("#seal-equation").hidden = true;
  $("#legend").hidden = true;
  $("#pause").disabled = true;
  $("#scrub").disabled = true;
  $("#scrub").max = 0;
  $("#scrub").value = 0;
}
function button(
  text,
  fn,
  { disabled = false, id = "continue", secondary = false } = {},
) {
  const b = document.createElement("button");
  b.id = id;
  b.textContent = text;
  b.className = secondary ? "secondary" : "primary";
  b.disabled = disabled;
  b.onclick = fn;
  return b;
}
function surface(title, content = "") {
  const e = $("#interaction");
  e.innerHTML = `${title ? `<h1>${escape(title)}</h1>` : ""}${content}`;
  return e;
}
function advanceGate(next, event, fields = {}) {
  const ms = elapsed();
  record(event, { response_time_ms: ms, ...fields });
  const rapid = !S.classroom && store.respond(ms);
  if (rapid) {
    reflectionNext = next;
    $("#reflection").value = "";
    $("#reflection-submit").disabled = true;
    $("#reflection-dialog").showModal();
    narrator.play("common-bypass");
  } else next();
}
function enter(phase) {
  stop();
  S.phase = phase;
  S.phaseStarted = Date.now();
  S.progress = 0;
  S.highwater = 0;
  $("#phase-label").textContent = names[phase] || "";
  $("#scene-labels").textContent =
    S.episode === "E0"
      ? S.round
        ? "개수"
        : "점수"
      : S.round === 1
        ? "물건 · kg"
        : "개수";
  $("#steps").innerHTML = EPISODES[S.episode].modules
    .map(
      (p) =>
        `<span class="${p === phase ? "current" : ""}" title="${names[p]}" aria-label="${names[p]}"></span>`,
    )
    .join("");
  $("#episode-label").textContent =
    S.episode + (S.round ? " · " + S.round : "");
  record("module_enter");
  store.data.seen[`${S.episode}-${phase}`] = true;
  store.save();
  if (phase === "intro") {
    renderScene();
    const box = surface(
      "어느 팀?",
      `<label for="method">비교 방법</label><textarea id="method" rows="2" placeholder="내 방법을 적어 보세요"></textarea>`,
    );
    narrator.play("E0-intro");
    const go = button(
      S.classroom ? "반 전체 투표 후 진행" : "방법 정하기",
      () => {
        S.method = $("#method").value.trim();
        advanceGate(() => enter("method"), "method", {
          text: S.method || null,
        });
      },
      { disabled: !S.classroom },
    );
    box.append(go);
    $("#method").oninput = () =>
      (go.disabled = !S.classroom && $("#method").value.trim().length < 2);
  }
  if (phase === "method") {
    renderScene({ totals: true });
    narrator.play("E0-method");
    const box = surface(
      "A · B",
      S.method ? `<p class="learner-note">${escape(S.method)}</p>` : "",
    );
    box.append(button("다른 방법도 보기", () => enter("predict")));
  }
  if (phase === "friend") friend();
  if (phase === "predict") predict();
  if (phase === "develop") develop();
  if (phase === "compare") compare();
  if (phase === "reconstruct") reconstruct();
  if (phase === "question") question();
  if (phase === "variation") {
    S.round++;
    S.predictions = [];
    S.touched = [];
    S.confidence = null;
    S.confidenceTouched = false;
    S.friendResponse = null;
    if (S.episode === "E1") {
      const exposureKey = S.classroom
        ? "classroomVariationExposure"
        : "variationExposure";
      store.data[exposureKey] ||= 0;
      S.claim = nextFriendClaim(S.round - 1, store.data[exposureKey]++);
      store.save();
      enter("friend");
    } else enter("predict");
  }
  if (phase === "generate") generate();
  if (phase === "seal") seal();
  if (phase === "calculate") calculate();
}
function friend() {
  const claim = S.round
    ? S.claim
    : { value: 4, correct: false, audio: "E1-friend" };
  S.claim = claim;
  renderScene({ claim: claim.value, friend: true });
  narrator.play(claim.audio);
  const box = surface(
    "너의 생각은?",
    '<div class="choices" id="friend-choices"></div>',
  );
  for (const [value, label] of [
    ["agree", "동의"],
    ["disagree", "반대"],
    ["unsure", "모르겠다"],
  ])
    $("#friend-choices").append(
      button(
        label,
        () => {
          S.friendResponse = value;
          advanceGate(() => enter("predict"), "friend_response", {
            friend_response: value,
          });
        },
        { id: "friend-" + value, secondary: true },
      ),
    );
  if (S.classroom) {
    $("#friend-choices").hidden = true;
    box.append(
      button("반 전체 투표 후 진행", () => {
        S.friendResponse = null;
        record("class_vote");
        enter("predict");
      }),
    );
  }
}
function predict() {
  const gg = groups();
  S.predictions = gg.map(() => 4);
  S.touched = gg.map(() => false);
  S.confidence = 2;
  S.confidenceTouched = false;
  renderScene({
    predictions: S.predictions,
    claim: S.claim?.value,
    friend: S.episode === "E1",
  });
  narrator.play(S.episode + "-predict");
  const box = surface(
    "예상 높이",
    `<div class="prediction-controls">${gg.map((g, i) => `<label class="predict-control" for="predict-${i}"><span>◇ ${g.id || ""}</span><input id="predict-${i}" type="range" min="0" max="12" step=".1" value="4" aria-label="${g.id || ""} 예상 높이"><output id="predict-out-${i}">4</output></label>`).join("")}</div><label class="confidence" for="confidence"><span>확신</span><span>1</span><input id="confidence" type="range" min="1" max="4" step="1" value="2" aria-label="확신도 1부터 4"><span>4</span><output id="confidence-out">—</output></label>`,
  );
  const go = button(
    S.classroom ? "반 전체 투표 후 진행" : "이어서 보기",
    () => {
      const ms = elapsed();
      gg.forEach((g, i) =>
        record(S.classroom ? "class_prediction" : "predict", {
          group: g.id || null,
          prediction_value: S.touched[i] ? S.predictions[i] : null,
          actual_value: mean(g.values),
          confidence: S.confidenceTouched ? S.confidence : null,
          response_time_ms: ms,
        }),
      );
      if (S.classroom) {
        S.predictions = S.predictions.map((v, i) => (S.touched[i] ? v : null));
        enter("develop");
      } else if (store.respond(ms)) {
        reflectionNext = () => enter("develop");
        $("#reflection").value = "";
        $("#reflection-submit").disabled = true;
        $("#reflection-dialog").showModal();
        narrator.play("common-bypass");
      } else enter("develop");
    },
    { disabled: !S.classroom },
  );
  box.append(go);
  const validate = () =>
    (go.disabled =
      !S.classroom && (!S.touched.every(Boolean) || !S.confidenceTouched));
  gg.forEach(
    (_, i) =>
      ($("#predict-" + i).oninput = (e) => {
        S.predictions[i] = +e.target.value;
        S.touched[i] = true;
        $("#predict-out-" + i).textContent = fmt(S.predictions[i]);
        renderScene({
          predictions: S.predictions,
          claim: S.claim?.value,
          friend: S.episode === "E1",
        });
        validate();
      }),
  );
  $("#confidence").oninput = (e) => {
    S.confidence = +e.target.value;
    S.confidenceTouched = true;
    $("#confidence-out").textContent = S.confidence;
    validate();
  };
  for (const el of [
    ...gg.map((_, i) => $("#predict-" + i)),
    $("#confidence"),
  ]) {
    el.onpointerup = (e) => el.oninput({ target: el });
    el.onkeydown = (e) => {
      if (e.key === "Enter") el.oninput({ target: el });
    };
  }
}
function makeTimeline(
  duration,
  onDone,
  progressStart = 0,
  progressEnd = 1,
  pauses = true,
) {
  const watchKey = `${S.classroom ? "classroom" : "learner"}:${S.episode}-${S.phase}-${S.round}`;
  store.data.watched ||= {};
  S.highwater = pauses ? store.data.watched[watchKey] || 0 : 0;
  const driver = { p: progressStart };
  let stoppedAt = 0;
  timeline = gsap
    .timeline({
      paused: true,
      onUpdate() {
        S.progress = driver.p;
        S.highwater = Math.max(S.highwater, driver.p);
        visual.update(driver.p);
        $("#scrub").max = S.highwater;
        $("#scrub").value = driver.p;
      },
      onComplete() {
        if (pauses) {
          store.data.watched[watchKey] = 1;
          store.save();
        }
        record("segment_end", { progress: progressEnd });
        onDone?.();
      },
    })
    .to(driver, { p: progressEnd, duration, ease: "none" });
  if (pauses)
    for (const p of semanticStops(visual.plans))
      timeline.addPause(duration * p, () => {
        stoppedAt = p;
        store.data.watched[watchKey] = S.highwater;
        store.save();
        record("auto_pause", { progress: driver.p });
        $("#continue").disabled = false;
        $("#continue").textContent = S.classroom
          ? "반 전체 확인 후 계속"
          : "계속";
        $("#pause").textContent = "▶";
      });
  timeline.timeScale(S.speed);
  $("#scrub").disabled = !pauses;
  $("#pause").disabled = false;
  $("#pause").textContent = "Ⅱ";
  timeline.play();
  return driver;
}
function develop() {
  renderScene({
    ghost: true,
    reveal: true,
    predictions: S.predictions,
    claim: S.claim?.value,
  });
  narrator.play(S.episode + "-develop");
  const box = surface("");
  const go = button(
    "관찰 중",
    () => {
      if (S.progress >= 0.999) enter("compare");
      else {
        go.disabled = true;
        go.textContent = "관찰 중";
        timeline.resume();
        $("#pause").textContent = "Ⅱ";
      }
    },
    { disabled: true },
  );
  box.append(go);
  makeTimeline(S.round ? 16 : 60, () => {
    go.disabled = false;
    go.textContent = "비교";
    $("#pause").disabled = true;
  });
}
function compare() {
  renderScene({
    ghost: true,
    reveal: true,
    predictions: S.predictions,
    claim: S.claim?.value,
    progress: 1,
    friend: S.episode === "E1",
    surprised: true,
  });
  $("#legend").hidden = false;
  $("#legend").innerHTML =
    '<span class="prediction">◇ 예상</span>' +
    (S.episode === "E1" ? '<span class="friend">▱ 친구</span>' : "") +
    '<span class="actual">● 실제</span>';
  narrator.play(S.episode === "E1" ? "E1-compare" : "E0-method");
  const box = surface("");
  const go = button(
    S.round ? "이어가기" : "장면 놓기",
    () => {
      record("comparison_viewed");
      if (S.round) {
        if (S.round < EPISODES[S.episode].variations.length) enter("variation");
        else enter("generate");
      } else enter("reconstruct");
    },
    { disabled: true },
  );
  box.append(go);
  box.append(
    button("↶", () => enter("develop"), { id: "rewatch", secondary: true }),
  );
  holdTimer = setTimeout(
    () => (go.disabled = false),
    (S.round ? 3 : 10) * 1000,
  );
}
function reconstruct() {
  S.order = shuffledScenes();
  S.attempts = 0;
  renderScene({ ghost: true, progress: 0 });
  narrator.play("common-reconstruct");
  drawCards();
}
function drawCards() {
  const box = surface(
    "장면 순서",
    `<div id="cards" class="cards">${S.order.map((frame, index) => `<div class="card" data-index="${index}" tabindex="0" aria-label="장면 ${index + 1}. 좌우 방향키로 순서 이동">${groupThumbnail(groups(), [0, 0.2, 0.6, 1][frame])}<div class="card-arrows"><button data-card="${index}" data-direction="-1" aria-label="앞으로">‹</button><span>${index + 1}</span><button data-card="${index}" data-direction="1" aria-label="뒤로">›</button></div></div>`).join("")}</div>`,
  );
  const go = button(
    S.classroom ? "반 전체 투표 후 진행" : "다시 이어 보기",
    () => {
      S.attempts++;
      record("reconstruct", {
        order: [...S.order],
        reconstruct_attempts: S.attempts,
        response_time_ms: elapsed(),
      });
      if (S.classroom || S.order.every((v, i) => v === i))
        advanceGate(() => enter("question"), "reconstruct_complete");
      else replaySegment();
    },
  );
  box.append(go);
  function swap(i, j) {
    if (j < 0 || j >= 4) return;
    [S.order[i], S.order[j]] = [S.order[j], S.order[i]];
    drawCards();
  }
  document
    .querySelectorAll("[data-card]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          swap(+b.dataset.card, +b.dataset.card + +b.dataset.direction)),
    );
  document.querySelectorAll(".card").forEach((card) => {
    card.onkeydown = (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        swap(
          +card.dataset.index,
          +card.dataset.index + (e.key === "ArrowLeft" ? -1 : 1),
        );
      }
    };
    card.onpointerdown = (e) => {
      if (e.target.tagName === "BUTTON") return;
      card.setPointerCapture(e.pointerId);
      drag = { type: "card", index: +card.dataset.index, x: e.clientX };
      card.classList.add("dragging");
    };
    card.onpointerup = (e) => {
      if (drag?.type !== "card") return;
      const dx = e.clientX - drag.x,
        rect = card.getBoundingClientRect(),
        j = clamp(drag.index + Math.round(dx / (rect.width + 10)), 0, 3),
        i = drag.index;
      drag = null;
      swap(i, j);
    };
    card.onpointercancel = () => {
      drag = null;
      card.classList.remove("dragging");
    };
  });
}
function replaySegment() {
  const [lo, hi] = reconstructionInterval(S.order) || [0, 0.2];
  surface("");
  narrator.play("common-replay");
  renderScene({ ghost: true, reveal: true, progress: lo });
  record("replay_segment", { from: lo, to: hi });
  makeTimeline(
    4,
    () => {
      timeline.kill();
      timeline = null;
      $("#pause").disabled = true;
      $("#scrub").disabled = true;
      drawCards();
    },
    lo,
    hi,
    false,
  );
}
function question() {
  renderScene({ ghost: true, reveal: true, progress: 1 });
  narrator.play(S.episode + "-question");
  const box = surface(
    S.episode === "E0" ? "그대로인 것은?" : "새로 생긴 높이?",
    `<label class="sr-only" for="insight">내 생각</label><input id="insight" type="text" placeholder="짧게 적어 보세요" autocomplete="off">`,
  );
  const go = button(
    S.classroom ? "반 전체 투표 후 진행" : "생각 남기기",
    () => {
      const text = $("#insight").value.trim();
      advanceGate(
        () => {
          S.discovered = true;
          record("principle_revealed", { text });
          const e = surface(EPISODES[S.episode].principle);
          narrator.play(S.episode + "-discover");
          e.append(button("다른 자료", () => enter("variation")));
        },
        "insight",
        { text: text || null },
      );
    },
    { disabled: !S.classroom },
  );
  box.append(go);
  $("#insight").oninput = () =>
    (go.disabled = !S.classroom && $("#insight").value.trim().length < 1);
}
function generationScene(showActual = false) {
  visual.configure(
    [{ id: "", values: S.generated }],
    opts({
      creation: true,
      target: EPISODES[S.episode].target,
      reveal: showActual,
    }),
  );
}
function generate() {
  S.genLocked = false;
  S.generated = [0, 0, 0, 0];
  generationScene();
  narrator.play(S.episode + "-generate");
  drawGenerator();
}
function drawGenerator() {
  const target = EPISODES[S.episode].target,
    box = surface(
      S.episode === "E0"
        ? "4명 · 처음 A와 같은 몫"
        : "4개 · 평균 6 · 높이 6 없이",
      `<div class="build-controls">${S.generated.map((v, i) => `<label for="build-${i}"><span>${i + 1}</span><input type="range" id="build-${i}" min="0" max="${S.episode === "E0" ? 32 : 24}" step="1" value="${v}" aria-label="${i + 1}번째 기둥 높이"><output id="build-out-${i}">${v}</output></label>`).join("")}</div>`,
    );
  const check = button(
    S.classroom ? "반 전체 투표 후 확인" : "나란히 보기",
    () => {
      const ok = generationValid(S.episode, S.generated);
      record("generate", {
        values: [...S.generated],
        conditions_met: ok,
        response_time_ms: elapsed(),
      });
      generationScene(true);
      if (ok) {
        S.genLocked = true;
        visual.configure(
          [{ id: "", values: S.generated }],
          opts({
            target: EPISODES[S.episode].target,
            reveal: true,
            progress: 0,
          }),
        );
        advanceGate(
          () => {
            const end = surface("");
            end.append(button("이어가기", () => enter("seal")));
          },
          "generate_complete",
          { values: [...S.generated] },
        );
      } else narrator.play("common-generate-retry");
    },
    { disabled: !S.classroom && !S.generated.some((v) => v > 0) },
  );
  box.append(check);
  S.generated.forEach(
    (_, i) => ($("#build-" + i).oninput = (e) => setColumn(i, +e.target.value)),
  );
}
function setColumn(i, v) {
  if (S.genLocked || S.phase !== "generate") return;
  S.generated[i] = clamp(Math.round(v), 0, S.episode === "E0" ? 32 : 24);
  generationScene();
  $("#build-" + i).value = S.generated[i];
  $("#build-out-" + i).textContent = S.generated[i];
  $("#continue").disabled = !S.classroom && !S.generated.some((v) => v > 0);
}
function seal() {
  if (!generationValid(S.episode, S.generated)) {
    record("generation_recheck");
    enter("generate");
    return;
  }
  const data = S.generated.some((v) => v)
    ? S.generated
    : S.episode === "E0"
      ? [8, 8, 8, 8]
      : [3, 5, 7, 9];
  visual.configure(
    [{ id: "", values: data }],
    opts({ ghost: true, reveal: true, progress: 0 }),
  );
  surface("");
  makeTimeline(
    2,
    () => {
      stop();
      $("#seal-video").hidden = false;
      $("#seal-equation").hidden = false;
      $("#seal-equation").innerHTML =
        `<span class="seal-symbol">▭</span><strong>개수 × 평균 = 총합</strong><span>4 × ${EPISODES[S.episode].target} = ${sum(data)}</span>`;
      narrator.play("common-seal");
      const video = $("#seal-video");
      video.src = "../assets/seal-" + S.episode + ".mp4";
      video.currentTime = 0;
      video.playbackRate = 1;
      let completed = false;
      const done = () => {
        if (completed) return;
        completed = true;
        video.pause();
        record("seal_complete");
        if (S.abstraction >= 4) enter("calculate");
        else complete();
      };
      video.onended = done;
      video.play().catch(() => {
        video.hidden = true;
        visual.update(1);
      });
      holdTimer = setTimeout(done, 5100);
    },
    0,
    1,
    false,
  );
}
function calculate() {
  const tasks = calculationTasks(S.episode),
    box = surface(
      "숫자로 이어 보기",
      tasks
        .map(
          (t, i) =>
            `<label class="calculation">${t.values.join(" , ")}<input type="number" step=".1" id="calc-${i}" aria-label="${i + 1}번 평균"></label>`,
        )
        .join(""),
    );
  box.append(
    button(
      "나란히 보기",
      () => {
        const inputs = tasks.map((_, i) => +$("#calc-" + i).value);
        record("calculate", { inputs, expected: tasks.map((t) => t.answer) });
        const e = surface("");
        tasks.forEach((t, i) => {
          const p = document.createElement("p");
          p.textContent = `${inputs[i]}   ↔   ${sum(t.values)} ÷ ${t.values.length} = ${t.answer}`;
          e.append(p);
        });
        e.append(button("마치기", complete));
      },
      { disabled: !S.classroom },
    ),
  );
  tasks.forEach(
    (_, i) =>
      ($("#calc-" + i).oninput = () =>
        ($("#continue").disabled = tasks.some(
          (_, j) => $("#calc-" + j).value === "",
        ))),
  );
}
function complete() {
  if (!S.classroom) store.complete(S);
  const total = store.data.completed.E0 + store.data.completed.E1;
  if (!S.classroom && total % 3 === 0 && total > store.data.calibrationAt) {
    store.data.calibrationAt = total;
    store.save();
    const stats = calibration(store.data.logs);
    const box = surface(
      "어떤 차이가 보여?",
      `<div class="calibration">${stats.map((g, i) => `<div><div class="calibration-track"><span style="height:${(g.closeness || 0) * 100}%"></span></div><small>${i ? "헷갈렸던" : "확신했던"}</small>${g.n ? "" : "<small>기록 없음</small>"}</div>`).join("")}</div>`,
    );
    box.append(button("마치기", home));
  } else {
    const box = surface("");
    box.append(
      button(S.episode === "E0" ? "E1 이어 보기" : "시작 화면", () =>
        S.episode === "E0" ? start("E1") : home(),
      ),
    );
  }
}
function home() {
  stop();
  S = null;
  $("#lesson").hidden = true;
  $("#hub").hidden = false;
  $("#episode-label").textContent = classroom ? "교실 모드" : "";
  $("#steps").innerHTML = "";
  $("#hub").innerHTML =
    `<div class="hub-heading"><span>평균</span><h1>보고, 네 손으로.</h1></div><div class="episode-cards">${Object.entries(
      EPISODES,
    )
      .map(([id, e]) => {
        const schedule = store.data.schedule[id],
          seen = store.data.completed[id];
        return `<button class="episode-card" data-episode="${id}"><span>${id}</span>${thumbnail(e.groups[0].values, 0)}<strong>${e.title}</strong><small>${seen ? seen + "회 · 다시 보기" : "3–5분"}${schedule ? " · " + new Date(schedule.due).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : ""}</small></button>`;
      })
      .join(
        "",
      )}</div>${classroom ? `<section class="module-picker"><h2>모듈</h2>${MODULES.map((m) => `<button data-module="${m.id}">${m.id}</button>`).join("")}</section>` : '<a class="classroom-link" href="?classroom=1">교실 모드</a>'}`;
  document
    .querySelectorAll("[data-episode]")
    .forEach((b) => (b.onclick = () => start(b.dataset.episode)));
  document.querySelectorAll("[data-module]").forEach(
    (b) =>
      (b.onclick = () => {
        const [id, phase] = b.dataset.module.split("-");
        start(id, phase);
      }),
  );
}
function start(episode, phase) {
  if (!ready || !EPISODES[episode]) return;
  S = store.session(episode, classroom);
  $("#hub").hidden = true;
  $("#lesson").hidden = false;
  $("#speed").value = S.speed;
  $("#speed-out").textContent = S.speed + "×";
  if (phase && classroom) {
    S.predictions = EPISODES[episode].groups.map(() => null);
    S.claim =
      episode === "E1"
        ? { value: 4, correct: false, audio: "E1-friend" }
        : null;
    if (phase === "seal")
      S.generated = episode === "E0" ? [8, 8, 8, 8] : [3, 5, 7, 9];
  }
  enter(phase && classroom ? phase : S.phase);
}
function creationDown(e) {
  if (S?.phase !== "generate" || S.genLocked || e.button > 0) return;
  const hit = visual.pick(e);
  if (!hit) return;
  const data = hit.userData;
  if (!["column", "supply"].includes(data.kind)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  visual.orbit.enabled = false;
  visual.renderer.domElement.setPointerCapture(e.pointerId);
  drag = {
    type: "build",
    kind: data.kind,
    col: data.col,
    startX: e.clientX,
    startY: e.clientY,
    startHeight: S.generated[data.col] || 0,
    units: visual.h / (visual.host.clientHeight || 600) / visual.camera.zoom,
  };
}
function creationMove(e) {
  if (drag?.type !== "build" || drag.kind !== "column") return;
  const p = visual.point(e);
  if (p && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 5)
    setColumn(
      drag.col,
      drag.startHeight + (drag.startY - e.clientY) * drag.units,
    );
}
function creationUp(e) {
  if (drag?.type !== "build") return;
  const d = drag,
    p = visual.point(e);
  drag = null;
  visual.orbit.enabled = true;
  if (p) {
    const col = visual.columnAt(p.x);
    if (d.kind === "supply" && col !== null)
      setColumn(col, S.generated[col] + 1);
    else if (d.kind === "column" && col === null)
      setColumn(d.col, S.generated[d.col] - 1);
  }
  record("build_drag", { values: [...S.generated] });
}
function flatDown(e) {
  if (
    S?.phase !== "generate" ||
    S.genLocked ||
    S.abstraction === 4 ||
    e.button > 0
  )
    return;
  const p = visual.flatPoint(e),
    col = visual.columnAt(p.x);
  if (col === null) return;
  e.preventDefault();
  $("#flat").setPointerCapture(e.pointerId);
  drag = {
    type: "flat-build",
    col,
    startY: e.clientY,
    startHeight: S.generated[col],
    units: p.units,
  };
}
function flatMove(e) {
  if (drag?.type === "flat-build")
    setColumn(
      drag.col,
      drag.startHeight + (drag.startY - e.clientY) * drag.units,
    );
}
function flatUp() {
  if (drag?.type !== "flat-build") return;
  drag = null;
  record("build_drag", { values: [...S.generated] });
}
function bind() {
  $("#home").onclick = home;
  $("#settings").onclick = () => $("#settings-dialog").showModal();
  $("#captions-setting").checked = store.data.settings.captions;
  $("#mute-setting").checked = store.data.settings.muted;
  $("#captions-setting").onchange = (e) => {
    store.data.settings.captions = e.target.checked;
    store.save();
    narrator.caption.hidden = !e.target.checked;
  };
  $("#mute-setting").onchange = (e) => {
    store.data.settings.muted = e.target.checked;
    store.save();
    if (e.target.checked) narrator.audio.pause();
  };
  $("#export-log").onclick = () => {
    const blob = new Blob(
        [
          JSON.stringify(
            {
              schema: 1,
              learner_id: store.data.learner_id,
              events: store.data.logs,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "MathTutor-learning-log.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $("#reflection").oninput = (e) =>
    ($("#reflection-submit").disabled = e.target.value.trim().length < 2);
  $("#reflection-submit").onclick = () => {
    record("rapid_response_reflection", {
      text: $("#reflection").value.trim(),
    });
    store.reflect();
    $("#reflection-dialog").close();
    const next = reflectionNext;
    reflectionNext = null;
    next?.();
  };
  $("#reflection-dialog").oncancel = (e) => e.preventDefault();
  $("#audio").onclick = () => narrator.repeat();
  $("#speed").oninput = (e) => {
    if (!S) return;
    S.speed = +e.target.value;
    $("#speed-out").textContent = S.speed + "×";
    timeline?.timeScale(S.speed);
    record("speed_change", { speed: S.speed });
  };
  $("#pause").onclick = () => {
    if (!timeline) return;
    const paused = timeline.paused();
    timeline.paused(!paused);
    $("#pause").textContent = paused ? "Ⅱ" : "▶";
    if ($("#continue") && S.phase === "develop")
      $("#continue").disabled = paused;
  };
  $("#scrub").oninput = (e) => {
    if (!timeline || !S) return;
    const p = Math.min(+e.target.value, S.highwater);
    timeline.pause().progress(p, true);
    visual.update(p);
    S.progress = p;
    $("#pause").textContent = "▶";
    if ($("#continue") && S.phase === "develop")
      $("#continue").disabled = false;
    record("rewind", { progress: p });
  };
  $("#zoom-in").onclick = () => visual.zoom(1.2);
  $("#zoom-out").onclick = () => visual.zoom(1 / 1.2);
  $("#front").onclick = () => visual.front();
  $("#fit").onclick = () => visual.fit();
  $("#flat").addEventListener("pointerdown", flatDown);
  $("#flat").addEventListener("pointermove", flatMove);
  $("#flat").addEventListener("pointerup", flatUp);
  $("#flat").addEventListener("pointercancel", () => (drag = null));
  const canvas = visual.renderer.domElement;
  canvas.addEventListener("pointerdown", creationDown, true);
  canvas.addEventListener("pointermove", creationMove, true);
  canvas.addEventListener("pointerup", creationUp, true);
  canvas.addEventListener(
    "pointercancel",
    () => {
      drag = null;
      visual.orbit.enabled = true;
    },
    true,
  );
}
async function init() {
  try {
    visual = new Visual($("#stage"), $("#flat"));
    narrator = new Narrator(
      $("#caption"),
      $("#audio-status"),
      store.data.settings,
    );
    await visual.load();
    bind();
    ready = true;
    $("#loading").hidden = true;
    home();
    const id = params.get("episode"),
      module = params.get("module");
    if (id && EPISODES[id]) start(id, module?.replace(id + "-", ""));
    requestAnimationFrame(function frame() {
      visual.render();
      requestAnimationFrame(frame);
    });
  } catch (e) {
    console.error(e);
    $("#hub").innerHTML =
      "<h1>장면을 열지 못했습니다.</h1><p>정적 서버에서 열고 브라우저의 그래픽 가속을 확인해 주세요.</p>";
    $("#loading").hidden = true;
  }
}
init();
