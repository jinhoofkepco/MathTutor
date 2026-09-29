import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import crypto from "node:crypto";
const root = new URL("../", import.meta.url).pathname,
  read = (p) => fs.readFile(path.join(root, p)),
  json = async (p) => JSON.parse(await read(p)),
  hash = (b) => crypto.createHash("sha256").update(b).digest("hex");
const preserved = await json("versions/v0/preservation.json");
for (const [file, sha] of Object.entries(preserved.sha256))
  assert.equal(
    hash(await read("versions/v0/" + file)),
    sha,
    "v0 changed: " + file,
  );
const provenance = await json("deliverables/docs/work_order_provenance.json");
assert.equal(
  hash(await read(provenance.file)),
  provenance.sha256,
  "Review the updated work order and then update its accepted provenance hash.",
);
for (const file of [
  "deliverables/web/index.html",
  "deliverables/web/classroom/index.html",
  "deliverables/index.html",
]) {
  const text = (await read(file)).toString();
  for (const [, url] of text.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (url.startsWith("data:") || url.startsWith("?") || /^https?:/.test(url))
      continue;
    await fs.access(path.resolve(root, path.dirname(file), url.split("?")[0]));
  }
}
const glb = await read("deliverables/assets/mean-kit.glb");
assert.equal(glb.toString("ascii", 0, 4), "glTF");
assert.equal(glb.readUInt32LE(4), 2);
assert.equal(glb.readUInt32LE(8), glb.length);
const gltf = JSON.parse(glb.toString("utf8", 20, 20 + glb.readUInt32LE(12)));
for (const name of [
  "UnitCube",
  "AveragePlane",
  "TotalPlane",
  "FriendNeutral",
  "FriendSurprised",
])
  assert.ok(
    gltf.nodes.some((n) => n.name === name),
    "missing " + name,
  );
const audio = await json("deliverables/assets/audio/manifest.json");
assert.equal(audio.length, 24);
assert.equal(new Set(audio.map((v) => v.id)).size, 24);
for (const clip of audio) {
  assert.ok(clip.duration > 0 && clip.text.length > 0);
  assert.ok(
    (await read("deliverables/assets/audio/" + clip.file)).length > 1000,
  );
}
const video = await json("deliverables/docs/episode-video-validation.json");
for (const id of ["E0", "E1"]) {
  const bytes = await read("deliverables/assets/seal-" + id + ".mp4"),
    metadata = video[id],
    s = metadata.streams[0];
  assert.equal(bytes.length, Number(metadata.format.size));
  assert.equal(s.width, 1920);
  assert.equal(s.height, 1080);
  assert.equal(s.avg_frame_rate, "30/1");
  assert.equal(Number(s.duration), 5);
  assert.equal(Number(s.nb_frames), 150);
  assert.equal(metadata.streams.length, 1);
  assert.equal(metadata.verified_unit_total, id === "E0" ? 32 : 24);
}
const native = await read("deliverables/blender/mean-common-v1.blend");
assert.ok(native.length > 100000);
const source = (await read("deliverables/web/main.js")).toString();
for (const verdict of ["정답", "오답", "틀렸어요"])
  assert.ok(!source.includes(verdict), "judgment text: " + verdict);
assert.ok(!/https?:\/\//.test(source), "external runtime endpoint");
const bundled = (await read("deliverables/web/app.bundle.js")).toString();
assert.ok(bundled.length > 100000);
console.log(
  `Verified: ${Object.keys(preserved.sha256).length} frozen v0 files; original work order; static links; GLB; ${audio.length} audio clips; two 1080p/30fps/5s videos; Blender source; bundled app.`,
);
