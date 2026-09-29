import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { C, plan, blockFrame, mean, sum, groupProgress } from "./model.js";
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z),
  f = (v) => Number(v.toFixed(1));
export class Visual {
  constructor(host, flat) {
    this.host = host;
    this.flat = flat;
    this.root = new THREE.Group();
    this.objects = [];
    this.options = {};
    this.progress = 0;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0xf4f5f4);
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    host.append(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.add(this.root);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8b9baa, 2.5));
    const sun = new THREE.DirectionalLight(0xfff6e8, 3);
    sun.position.set(-6, 15, 12);
    this.scene.add(sun);
    this.camera = new THREE.OrthographicCamera(-8, 8, 6, -6, 0.1, 100);
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.enableRotate = false;
    this.orbit.minZoom = 0.5;
    this.orbit.maxZoom = 3;
    this.ray = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.rayPlane = new THREE.Plane(V(0, 0, 1), 0);
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
  }
  async load() {
    const loader = new GLTFLoader();
    this.kit = (await loader.loadAsync("../assets/mean-kit.glb")).scene;
  }
  resize() {
    this.aspect =
      (this.host.clientWidth || 1000) / (this.host.clientHeight || 600);
    this.renderer.setSize(
      this.host.clientWidth || 1000,
      this.host.clientHeight || 600,
    );
    this.fit();
  }
  fit() {
    const width = this.width || 12,
      height = this.height || 11;
    this.h = Math.max(height + 2, (width + 2) / this.aspect);
    this.camera.left = (-this.h * this.aspect) / 2;
    this.camera.right = (this.h * this.aspect) / 2;
    this.camera.top = this.h / 2;
    this.camera.bottom = -this.h / 2;
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.front();
  }
  front() {
    const y = (this.height || 11) / 2;
    this.camera.position.set(0, y + 0.35, 35);
    this.orbit.target.set(0, y, 0);
    this.camera.lookAt(this.orbit.target);
    this.orbit.update();
  }
  zoom(factor) {
    this.camera.zoom = Math.min(3, Math.max(0.5, this.camera.zoom * factor));
    this.camera.updateProjectionMatrix();
  }
  clear() {
    this.root.traverse((o) => {
      if (o.userData?.owned) o.geometry?.dispose();
      if (o.material) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (o.isSprite) m.map?.dispose();
          m.dispose();
        }
      }
    });
    this.root.clear();
    this.objects = [];
    this.pickables = [];
    this.planes = [];
    this.ghost = [];
  }
  material(color, opacity = 1) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.62,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity === 1,
    });
  }
  cube(pos, color = C.data, meta = {}) {
    const src = this.kit.getObjectByName("UnitCube");
    const m = new THREE.Mesh(src.geometry, this.material(color));
    m.position.copy(pos);
    m.userData = { ...meta };
    this.root.add(m);
    return m;
  }
  line(x0, x1, y, color, style = "solid", opacity = 1) {
    const geo = new THREE.BufferGeometry().setFromPoints([
        V(x0, y, 0.62),
        V(x1, y, 0.62),
      ]),
      mat =
        style === "dash"
          ? new THREE.LineDashedMaterial({
              color,
              dashSize: 0.16,
              gapSize: 0.1,
              transparent: true,
              opacity,
            })
          : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const l = new THREE.Line(geo, mat);
    l.userData.owned = true;
    l.computeLineDistances();
    this.root.add(l);
    return l;
  }
  label(text, pos, color = "#5b6a77", size = 0.33) {
    const cv = document.createElement("canvas");
    cv.width = 512;
    cv.height = 128;
    const c = cv.getContext("2d");
    c.font = "500 45px system-ui";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = color;
    c.fillText(text, 256, 64);
    const m = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(cv),
        depthTest: false,
      }),
    );
    m.position.copy(pos);
    m.scale.set(size * 4, size, 1);
    this.root.add(m);
    return m;
  }
  outline(pos, color = C.ghost, opacity = 0.2, dashed = false) {
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    const l = new THREE.LineSegments(
      edges,
      dashed
        ? new THREE.LineDashedMaterial({
            color,
            transparent: true,
            opacity,
            dashSize: 0.13,
            gapSize: 0.08,
          })
        : new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
    );
    l.computeLineDistances();
    l.position.copy(pos);
    l.userData.owned = true;
    this.root.add(l);
    return l;
  }
  plane(y, layout, color, alpha = 0.45) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(layout.n * 1.25, 0.04, 1.4),
      this.material(color, alpha),
    );
    m.position.set(layout.center, y, 0);
    m.userData.owned = true;
    this.root.add(m);
    return m;
  }
  configure(groups, options = {}) {
    this.clear();
    this.options = options;
    this.groups = groups.map((g) => ({ ...g, values: [...g.values] }));
    this.plans = groups.map((g) =>
      options.creation
        ? {
            values: [...g.values],
            target: mean(g.values),
            total: sum(g.values),
            moves: [],
            blocks: g.values.flatMap((v, col) =>
              Array.from({ length: v }, (_, level) => ({
                id: `${col}-${level}`,
                col,
                level,
              })),
            ),
          }
        : plan(g.values),
    );
    const gap = 2,
      totalWidth =
        groups.reduce((s, g) => s + g.values.length * 1.25, 0) +
        (groups.length - 1) * gap;
    let x = -totalWidth / 2;
    this.layouts = groups.map((g) => {
      const w = g.values.length * 1.25,
        layout = { n: g.values.length, center: x + w / 2, x0: x + 0.625 };
      x += w + gap;
      return layout;
    });
    this.width = totalWidth + (options.friend ? 3 : 0);
    this.height = Math.max(10, ...groups.flatMap((g) => g.values)) + 1.2;
    this.plans.forEach((p, gi) => {
      const l = this.layouts[gi];
      p.blocks.forEach((b) => {
        const pos = V(l.x0 + b.col * 1.25, b.level + 0.5, 0),
          mesh = this.cube(pos, C.data, { col: b.col, group: gi });
        this.objects.push({ mesh, id: b.id, group: gi });
        if (options.ghost) this.ghost.push(this.outline(pos));
      });
      for (let i = 0; i < l.n; i++) {
        this.line(l.x0 + i * 1.25 - 0.5, l.x0 + i * 1.25 + 0.5, 0, 0xa8b1b6);
        if (options.creation) {
          const plate = this.cube(V(l.x0 + i * 1.25, -0.12, 0), 0xc5cbd0, {
            col: i,
            kind: "column",
          });
          plate.scale.set(1, 0.15, 1);
          this.pickables.push(plate);
        }
        if (options.numbers)
          this.label(String(p.values[i]), V(l.x0 + i * 1.25, -0.45, 0));
      }
      if (groups[gi].id) this.label(groups[gi].id, V(l.center, -0.75, 0));
      if (options.totals)
        this.label(
          `${l.n}명 · Σ ${p.total}`,
          V(l.center, this.height - 0.2, 0),
          "#5b6a77",
          0.4,
        );
      if (options.reveal) {
        this.planes.push(this.plane(p.target, l, C.average));
        this.label(
          "● " + p.target,
          V(l.x0 + l.n * 1.25 - 0.1, p.target, 0.8),
          "#b83e35",
          0.32,
        );
        if (!options.creation)
          p.values.forEach((v, i) => {
            for (let j = v; j < p.target; j++)
              this.outline(V(l.x0 + i * 1.25, j + 0.5, 0), C.data, 0.75, true);
          });
      }
      if (options.target !== undefined) {
        this.line(
          l.x0 - 0.5,
          l.x0 + (l.n - 1) * 1.25 + 0.5,
          options.target,
          C.predict,
          "dash",
        );
        this.label(
          "◇ " + options.target,
          V(l.x0 + l.n * 1.25 - 0.1, options.target, 0.8),
          "#7D5BD6",
        );
      }
      if (
        options.predictions?.[gi] !== undefined &&
        options.predictions[gi] !== null
      ) {
        const v = options.predictions[gi];
        this.line(l.x0 - 0.5, l.x0 + (l.n - 1) * 1.25 + 0.5, v, C.predict);
        this.label("◇ " + f(v), V(l.x0 - 0.7, v, 0.8), "#7D5BD6");
      }
      if (options.claim !== undefined && options.claim !== null) {
        this.line(
          l.x0 - 0.5,
          l.x0 + (l.n - 1) * 1.25 + 0.5,
          options.claim,
          C.friend,
          "dash",
        );
        this.label(
          "▱ " + f(options.claim),
          V(l.x0 + (l.n - 1) * 1.25 + 1, options.claim, 0.8),
          "#778872",
        );
      }
    });
    if (options.friend) {
      const src = this.kit.getObjectByName(
        options.surprised ? "FriendSurprised" : "FriendNeutral",
      );
      if (src) {
        this.friend = src.clone(true);
        this.friend.traverse((o) => {
          if (o.material) o.material = o.material.clone();
        });
        this.friend.position.set(-totalWidth / 2 - 1.5, 0.996, 0);
        this.friend.scale.setScalar(1.2);
        this.root.add(this.friend);
      }
    }
    if (options.creation) {
      this.tray = this.cube(V(totalWidth / 2 + 1.7, 0.5, 0), C.data, {
        kind: "supply",
      });
      this.pickables.push(this.tray);
      this.width += 4;
      this.label("+", V(totalWidth / 2 + 1.7, 1.4, 0));
      this.objects.forEach((o) => {
        o.mesh.userData.kind = "column";
        this.pickables.push(o.mesh);
      });
    }
    this.progress = options.progress || 0;
    this.update(this.progress);
    this.fit();
  }
  update(progress) {
    this.progress = progress;
    const perGroup = groupProgress(this.plans, progress),
      frames = this.plans.map((p, i) => blockFrame(p, perGroup[i]));
    for (const o of this.objects) {
      const b = frames[o.group].find((b) => b.id === o.id),
        l = this.layouts[o.group];
      o.mesh.position.set(l.x0 + b.x * 1.25, b.y + 0.5, 0);
      o.mesh.material.color.setHex(
        this.options.reveal && (b.moving || b.y >= this.plans[o.group].target)
          ? C.excess
          : C.data,
      );
    }
    this.host.hidden = (this.options.abstraction || 1) > 1;
    this.flat.hidden = !this.host.hidden;
    if (this.host.hidden) this.drawFlat(frames);
  }
  drawFlat(frames) {
    const width = this.width + 2,
      height = this.height + 2,
      x = (v) => v + width / 2,
      y = (v) => height - 1 - v;
    let svg = "";
    const opts = this.options;
    if (opts.abstraction === 4) {
      svg = this.groups
        .map(
          (g, i) =>
            `<text x="${width / 2}" y="${2 + i * 3}" text-anchor="middle" font-size=".5" fill="#526879">${g.id} ${g.values.join(" , ")}</text>${opts.reveal ? `<text x="${width / 2}" y="${3 + i * 3}" text-anchor="middle" font-size=".45" fill="#E04A3F">${sum(g.values)} ÷ ${g.values.length} = ${mean(g.values)}</text>` : ""}`,
        )
        .join("");
    } else
      this.groups.forEach((g, gi) => {
        const l = this.layouts[gi];
        if (opts.ghost)
          g.values.forEach(
            (v, col) =>
              (svg += `<rect x="${x(l.x0 + col * 1.25 - 0.5)}" y="${y(v)}" width="1" height="${v}" fill="none" stroke="#899198" stroke-width=".03" opacity=".2"/>`),
          );
        for (let col = 0; col < l.n; col++) {
          const count = frames[gi].filter(
            (b) => !b.moving && Math.abs(b.x - col) < 1e-6,
          ).length;
          svg += `<rect x="${x(l.x0 + col * 1.25 - 0.5)}" y="${y(count)}" width="1" height="${count}" fill="#5B7A99"/>`;
          if (opts.reveal && count > this.plans[gi].target)
            svg += `<rect x="${x(l.x0 + col * 1.25 - 0.5)}" y="${y(count)}" width="1" height="${count - this.plans[gi].target}" fill="#F29A38"/>`;
        }
        frames[gi]
          .filter((b) => b.moving)
          .forEach(
            (b) =>
              (svg += `<rect x="${x(l.x0 + b.x * 1.25 - 0.5)}" y="${y(b.y + 1)}" width="1" height="1" fill="#F29A38"/>`),
          );
        if (opts.abstraction === 3)
          g.values.forEach(
            (v, col) =>
              (svg += `<text x="${x(l.x0 + col * 1.25)}" y="${y(-0.45)}" font-size=".33" text-anchor="middle" fill="#526879">${v}</text>`),
          );
        svg += `<text x="${x(l.center)}" y="${y(-0.9)}" font-size=".38" text-anchor="middle" fill="#526879">${g.id}</text>`;
      });
    if (opts.abstraction !== 4)
      this.layouts.forEach((l, gi) => {
        const lines = [
          [opts.predictions?.[gi], "#7D5BD6", "", "◇"],
          [opts.claim, "#778872", 'stroke-dasharray=".16 .10"', "▱"],
          [opts.target, "#7D5BD6", 'stroke-dasharray=".16 .10"', "◇"],
          [opts.reveal ? this.plans[gi].target : undefined, "#E04A3F", "", "●"],
        ];
        for (const [v, color, dash, icon] of lines)
          if (v !== undefined && v !== null)
            svg += `<path d="M${x(l.x0 - 0.5)} ${y(v)} H${x(l.x0 + (l.n - 1) * 1.25 + 0.5)}" stroke="${color}" stroke-width="${icon === "●" ? ".09" : ".035"}" ${dash}/><text x="${x(l.x0 - 0.95)}" y="${y(v) + 0.1}" fill="${color}" font-size=".3">${icon}</text>`;
      });
    this.flat.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.flat.innerHTML = svg;
  }
  pick(event) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - r.left) / r.width) * 2 - 1,
      (-(event.clientY - r.top) / r.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    return this.ray.intersectObjects(this.pickables || [], false)[0]?.object;
  }
  point(event) {
    this.pick(event);
    return this.ray.ray.intersectPlane(this.rayPlane, V());
  }
  columnAt(x) {
    const l = this.layouts[0];
    const i = Math.round((x - l.x0) / 1.25);
    return i >= 0 && i < l.n ? i : null;
  }

  flatPoint(event) {
    const r = this.flat.getBoundingClientRect(),
      w = this.width + 2,
      h = this.height + 2,
      scale = Math.min(r.width / w, r.height / h),
      ox = (r.width - w * scale) / 2,
      oy = (r.height - h * scale) / 2;
    return {
      x: (event.clientX - r.left - ox) / scale - w / 2,
      y: h - 1 - (event.clientY - r.top - oy) / scale,
      units: 1 / scale,
    };
  }
  render() {
    this.orbit.update();
    this.renderer.render(this.scene, this.camera);
  }
}
export function thumbnail(values, p) {
  const planData = plan(values),
    frame = blockFrame(planData, p),
    max = Math.max(...values) + 2,
    w = values.length * 16 + 16,
    h = max * 8 + 16;
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">${frame.map((b) => `<rect x="${8 + b.x * 16}" y="${h - 8 - (b.y + 1) * 8}" width="12" height="7.7" rx=".7" fill="${b.moving ? "#F29A38" : "#5B7A99"}"/>`).join("")}</svg>`;
}

export function groupThumbnail(groups, progress) {
  const plans = groups.map((g) => plan(g.values)),
    ps = groupProgress(plans, progress),
    w = groups.reduce((s, g) => s + g.values.length * 16 + 20, 0),
    h = (Math.max(...groups.flatMap((g) => g.values)) + 3) * 8;
  let offset = 0;
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">${groups
    .map((g, i) => {
      const x0 = offset + 10;
      offset += g.values.length * 16 + 20;
      return (
        blockFrame(plans[i], ps[i])
          .map(
            (b) =>
              `<rect x="${x0 + b.x * 16}" y="${h - 12 - (b.y + 1) * 8}" width="12" height="7.7" rx=".7" fill="${b.moving ? "#F29A38" : "#5B7A99"}"/>`,
          )
          .join("") +
        `<text x="${x0 + g.values.length * 8 - 2}" y="${h - 2}" text-anchor="middle" font-size="6" fill="#899198">${g.id}</text>`
      );
    })
    .join("")}</svg>`;
}
