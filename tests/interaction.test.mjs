import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseHTML } from "linkedom";
import { build } from "esbuild";
const root = new URL("../", import.meta.url).pathname;
test("real scene and timeline integration: gates, replay, creation lock, repeat representations and isolated modules", async () => {
  const { window, document } = parseHTML(
    await fs.readFile(root + "deliverables/web/index.html", "utf8"),
  );
  globalThis.window = window;
  globalThis.document = document;
  globalThis.self = window;
  globalThis.location = new URL("http://localhost/web/index.html");
  globalThis.devicePixelRatio = 1;
  globalThis.Element = window.Element;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.DOMParser = window.DOMParser;
  globalThis.getComputedStyle = () => ({ touchAction: "none" });
  const memory = new Map();
  globalThis.localStorage = {
    getItem: (k) => memory.get(k) || null,
    setItem: (k, v) => memory.set(k, v),
  };
  const ctx = new Proxy(
    {},
    { get: (o, k) => o[k] ?? (() => {}), set: (o, k, v) => ((o[k] = v), true) },
  );
  window.HTMLCanvasElement.prototype.getContext = () => ctx;
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      left: 0,
      top: 0,
      width: 1000,
      height: 600,
      right: 1000,
      bottom: 600,
    };
  };
  Object.defineProperties(window.HTMLElement.prototype, {
    clientWidth: {
      get() {
        return 1000;
      },
    },
    clientHeight: {
      get() {
        return 600;
      },
    },
  });
  for (const name of ["setPointerCapture", "releasePointerCapture", "pause"])
    window.HTMLElement.prototype[name] = () => {};
  window.HTMLElement.prototype.play = () => Promise.resolve();
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  for (const d of document.querySelectorAll("dialog")) {
    d.showModal = () => (d.open = true);
    d.close = () => (d.open = false);
  }
  globalThis.Audio = class {
    play() {
      return Promise.resolve();
    }
    pause() {}
  };
  globalThis.ResizeObserver = class {
    observe() {}
  };
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  window.requestAnimationFrame = globalThis.requestAnimationFrame;
  window.cancelAnimationFrame = () => {};
  window.__KIT_BYTES__ = Uint8Array.from(
    await fs.readFile(root + "deliverables/assets/mean-kit.glb"),
  );
  const out = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), "mathtutor-test-")),
      "app.mjs",
    ),
    three = root + "node_modules/three/build/three.module.js";
  await build({
    entryPoints: [root + "deliverables/web/main.js"],
    outfile: out,
    bundle: true,
    format: "esm",
    platform: "node",
    mainFields: ["module", "main"],
    plugins: [
      {
        name: "headless-scene",
        setup(b) {
          b.onResolve({ filter: /^three$/ }, () => ({
            path: "mock-three",
            namespace: "test",
          }));
          b.onLoad({ filter: /.*/, namespace: "test" }, () => ({
            contents: `export * from ${JSON.stringify(three)};export class WebGLRenderer{constructor(){this.domElement=document.createElement('canvas');this.shadowMap={};}setPixelRatio(){}setClearColor(){}setSize(){}render(s,c){s.updateMatrixWorld();c.updateMatrixWorld();}}`,
            loader: "js",
            resolveDir: root,
          }));
          b.onLoad({ filter: /episodes\/visual\.js$/ }, async (args) => ({
            contents: (await fs.readFile(args.path, "utf8")).replace(
              /loader\.loadAsync\(\s*["']\.\.\/assets\/mean-kit\.glb["']\s*\)/,
              "loader.parseAsync(window.__KIT_BYTES__.buffer,'')",
            ),
            loader: "js",
            resolveDir: path.dirname(args.path),
          }));
          b.onLoad({ filter: /web\/main\.js$/ }, async (args) => ({
            contents:
              (await fs.readFile(args.path, "utf8")) +
              `\nglobalThis.__test={ready:()=>ready,S:()=>S,visual:()=>visual,timeline:()=>timeline,store,start,enter,home,stop,gsap,setColumn,generationScene,drawCards,unlockCompare(){clearTimeout(holdTimer);document.querySelector('#continue').disabled=false;}};`,
            loader: "js",
            resolveDir: path.dirname(args.path),
          }));
        },
      },
    ],
  });
  await import(out);
  for (let i = 0; i < 100 && !globalThis.__test?.ready(); i++)
    await new Promise((r) => setTimeout(r, 10));
  const t = globalThis.__test;
  assert.ok(t.ready());
  t.gsap.ticker.sleep();
  const $ = (s) => document.querySelector(s),
    click = (s) => {
      const e = $(s);
      assert.ok(e, s);
      assert.equal(e.disabled, false, s + " should be enabled");
      e.onclick();
    },
    age = () => (t.S().phaseStarted = Date.now() - 5000);
  try {
    t.start("E0");
    assert.equal(t.S().phase, "intro");
    assert.equal($("#continue").disabled, true);
    $("#method").value = "한 사람씩 비교";
    $("#method").oninput();
    age();
    click("#continue");
    assert.equal(t.S().phase, "method");
    assert.equal(t.visual().options.reveal, undefined);
    click("#continue");
    assert.equal(t.S().phase, "predict");
    assert.equal($("#continue").disabled, true);
    $("#predict-0").oninput({ target: { value: "8" } });
    $("#predict-1").oninput({ target: { value: "7" } });
    assert.equal($("#continue").disabled, true);
    $("#confidence").oninput({ target: { value: "3" } });
    assert.equal($("#continue").disabled, false);
    age();
    click("#continue");
    assert.equal(t.S().phase, "develop");
    assert.equal($("#continue").disabled, true);
    assert.ok(t.visual().ghost.length > 0);
    const tl = t.timeline();
    tl.render(60, false, false);
    assert.ok(tl.paused(), "GSAP stops at the first semantic pause");
    assert.ok(t.S().progress < 0.21);
    assert.equal($("#continue").disabled, false);
    for (let i = 0; i < 5 && t.S().progress < 0.999; i++) {
      click("#continue");
      t.timeline().render(60, false, false);
    }
    assert.ok(t.S().progress > 0.999);
    click("#continue");
    assert.equal(t.S().phase, "compare");
    assert.equal($("#continue").disabled, true);
    t.unlockCompare();
    click("#continue");
    assert.equal(t.S().phase, "reconstruct");
    t.S().order = [2, 0, 3, 1];
    t.drawCards();
    click("#continue");
    assert.equal(t.store.data.logs.at(-1).event, "replay_segment");
    assert.deepEqual(
      [t.store.data.logs.at(-1).from, t.store.data.logs.at(-1).to],
      [0, 0.6],
    );
    t.timeline().render(4, false, false);
    t.S().order = [0, 1, 2, 3];
    t.drawCards();
    age();
    click("#continue");
    assert.equal(t.S().phase, "question");
    assert.equal(t.S().discovered, false);
    assert.equal($("#continue").disabled, true);
    $("#insight").value = "블록 수";
    $("#insight").oninput();
    age();
    click("#continue");
    assert.equal(t.S().discovered, true);
    assert.match($("#interaction").textContent, /총합은 그대로/);
    t.enter("generate");
    assert.equal($("#continue").disabled, true);
    [8, 8, 8, 8].forEach((v, i) => t.setColumn(i, v));
    age();
    click("#continue");
    assert.equal(t.S().genLocked, true);
    const before = [...t.S().generated];
    t.setColumn(0, 0);
    assert.deepEqual(t.S().generated, before);
    assert.equal(t.visual().pickables.length, 0);
    assert.equal(t.S().phase, "generate");
    t.start("E1");
    assert.equal(t.S().phase, "friend");
    assert.equal(t.visual().options.reveal, undefined);
    age();
    click("#friend-disagree");
    assert.equal(t.S().phase, "predict");
    assert.equal($("#continue").disabled, true);
    $("#predict-0").oninput({ target: { value: "5" } });
    $("#confidence").oninput({ target: { value: "4" } });
    age();
    click("#continue");
    assert.equal(t.S().phase, "develop");
    assert.equal(t.visual().plans[0].target, 5);
    t.enter("generate");
    [6, 6, 6, 6].forEach((v, i) => t.setColumn(i, v));
    age();
    click("#continue");
    assert.equal(t.S().genLocked, false);
    [3, 5, 7, 9].forEach((v, i) => t.setColumn(i, v));
    age();
    click("#continue");
    assert.equal(t.S().genLocked, true);
    t.store.data.completed.E1 = 1;
    t.start("E1");
    assert.equal(t.S().abstraction, 2);
    assert.equal($("#stage").hidden, true);
    assert.equal($("#flat").hidden, false);
    t.enter("generate");
    t.setColumn(0, 3);
    const svg = $("#flat").innerHTML;
    assert.match(svg, /#7D5BD6/);
    assert.doesNotMatch(svg, /#E04A3F/);
    t.generationScene(true);
    assert.match($("#flat").innerHTML, /#E04A3F/);
    assert.ok(t.visual().flatPoint({ clientX: 500, clientY: 300 }).units > 0);
    for (const episode of ["E0", "E1"])
      for (const phase of [
        "intro",
        "method",
        "friend",
        "predict",
        "develop",
        "compare",
        "reconstruct",
        "question",
        "variation",
        "generate",
        "seal",
      ].filter((p) =>
        episode === "E0" ? p !== "friend" : !["intro", "method"].includes(p),
      )) {
        t.start(episode);
        t.S().classroom = true;
        t.S().generated = episode === "E0" ? [8, 8, 8, 8] : [3, 5, 7, 9];
        t.enter(phase);
        assert.ok(t.visual().root.children.length > 0, episode + " " + phase);
      }
  } finally {
    t.stop();
    t.gsap.globalTimeline.clear();
    t.gsap.ticker.sleep();
    await fs.rm(path.dirname(out), { recursive: true, force: true });
  }
});
