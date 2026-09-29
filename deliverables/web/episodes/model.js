export const sum = (a) => a.reduce((s, v) => s + v, 0);
export const mean = (a) => sum(a) / a.length;
export const median = (a) => {
  const s = [...a].sort((x, y) => x - y),
    n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
export const C = {
  data: 0x5b7a99,
  average: 0xe04a3f,
  excess: 0xf29a38,
  total: 0xf5d04c,
  reference: 0x3fa36b,
  ghost: 0x899198,
  predict: 0x7d5bd6,
  friend: 0x778872,
};
export const EPISODES = {
  E0: {
    title: "두 팀",
    groups: [
      { id: "A", values: [6, 9, 9] },
      { id: "B", values: [7, 8, 6, 9, 5] },
    ],
    target: 8,
    variations: [
      [
        { id: "A", values: [3, 6, 6] },
        { id: "B", values: [4, 3, 5, 4] },
      ],
    ],
    principle: "총합은 그대로 · 한 사람당 같은 몫",
    modules: [
      "intro",
      "method",
      "predict",
      "develop",
      "compare",
      "reconstruct",
      "question",
      "variation",
      "generate",
      "seal",
    ],
  },
  E1: {
    title: "다섯 기둥",
    groups: [{ id: "", values: [4, 7, 3, 8, 3] }],
    claim: 4,
    target: 6,
    variations: [
      [{ id: "", values: [2, 5, 8, 9, 6] }],
      [{ id: "", values: [1, 2, 3, 4, 6, 8] }],
    ],
    principle: "자료에 없던 값도 평균",
    modules: [
      "friend",
      "predict",
      "develop",
      "compare",
      "reconstruct",
      "question",
      "variation",
      "generate",
      "seal",
    ],
  },
};
export const MODULES = Object.entries(EPISODES).flatMap(([id, e]) =>
  e.modules.map((part) => ({ id: `${id}-${part}`, episode: id, part })),
);
export function plan(values) {
  if (!values.length || values.some((v) => !Number.isInteger(v) || v < 0))
    throw Error("Nonnegative integer columns required");
  const target = mean(values);
  if (!Number.isInteger(target)) throw Error("E0/E1 use integer means");
  const work = [...values],
    blocks = values.flatMap((v, col) =>
      Array.from({ length: v }, (_, level) => ({
        id: `${col}-${level}`,
        col,
        level,
        originCol: col,
        originLevel: level,
      })),
    ),
    moves = [];
  for (let safety = 0; safety < sum(values) + 1; safety++) {
    const from = work.indexOf(Math.max(...work)),
      to = work.indexOf(Math.min(...work));
    if (work[from] === target) break;
    const b = blocks.find((b) => b.col === from && b.level === work[from] - 1);
    const move = { id: b.id, from, to, fromLevel: b.level, toLevel: work[to] };
    moves.push(move);
    work[from]--;
    work[to]++;
    b.col = to;
    b.level = move.toLevel;
  }
  return {
    values: [...values],
    target,
    total: sum(values),
    moves,
    blocks: values.flatMap((v, col) =>
      Array.from({ length: v }, (_, level) => ({
        id: `${col}-${level}`,
        col,
        level,
      })),
    ),
  };
}
export function blockFrame(p, progress) {
  const t = Math.max(0, Math.min(1, progress)),
    moves = p.moves.length,
    at = t * moves,
    done = Math.floor(at),
    fraction = at - done,
    result = p.blocks.map((b) => ({
      ...b,
      x: b.col,
      y: b.level,
      moving: false,
    })),
    byId = new Map(result.map((b) => [b.id, b]));
  for (let i = 0; i < Math.min(done, moves); i++) {
    const m = p.moves[i],
      b = byId.get(m.id);
    b.col = m.to;
    b.level = m.toLevel;
    b.x = m.to;
    b.y = m.toLevel;
  }
  if (done < moves) {
    const m = p.moves[done],
      b = byId.get(m.id),
      u = fraction * fraction * (3 - 2 * fraction);
    b.x = m.from + (m.to - m.from) * u;
    b.y =
      m.fromLevel + (m.toLevel - m.fromLevel) * u + Math.sin(Math.PI * u) * 2;
    b.moving = fraction > 0;
  }
  return result;
}
export function generationValid(episode, values) {
  return (
    values.length === 4 &&
    values.every((v) => Number.isInteger(v) && v >= 0) &&
    sum(values) === (episode === "E0" ? 32 : 24) &&
    (episode !== "E1" || values.every((v) => v !== 6))
  );
}
export function nextFriendClaim(variationIndex, exposure) {
  const correct = exposure % 4 === 0,
    actual = variationIndex === 0 ? 6 : 4;
  return {
    value: correct ? actual : variationIndex === 0 ? 5.5 : 4.5,
    correct,
    audio: `variation${variationIndex + 1}-${correct ? "true" : "false"}`,
  };
}
export const stageFor = (repetition) => Math.min(4, Math.max(1, repetition));
export function reviewDelay(error, responseMs, previous = 1) {
  return error <= 0.3 && responseMs >= 2000 && responseMs < 12000
    ? Math.min(30, previous * 2)
    : error > 1
      ? 1
      : Math.max(1, previous);
}
export function calculationTasks(episode) {
  return episode === "E0"
    ? [
        { values: [2, 4, 6], answer: 4 },
        { values: [3, 7, 8], answer: 6 },
      ]
    : [
        { values: [1, 5, 9], answer: 5 },
        { values: [2, 3, 7, 8], answer: 5 },
      ];
}

export function reconstructionInterval(order) {
  const times = [0, 0.2, 0.6, 1];
  for (let i = 0; i < order.length - 1; i++)
    if (order[i] > order[i + 1]) return [times[order[i + 1]], times[order[i]]];
  return null;
}

export function shuffledScenes(rng = Math.random) {
  const a = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (a.every((v, i) => v === i)) [a[0], a[1]] = [a[1], a[0]];
  return a;
}

export function groupProgress(plans, p) {
  const total = plans.reduce((s, v) => s + v.moves.length, 0);
  let offset = 0;
  return plans.map((v) => {
    const progress = v.moves.length
      ? Math.max(0, Math.min(1, (p * total - offset) / v.moves.length))
      : 1;
    offset += v.moves.length;
    return progress;
  });
}
export function semanticStops(plans) {
  const count = plans.reduce((s, p) => s + p.moves.length, 0);
  return [
    ...new Set(
      [1, Math.ceil(count * 0.6), count - 1]
        .filter((i) => i > 0 && i < count)
        .map((i) => i / count),
    ),
  ].sort((a, b) => a - b);
}
