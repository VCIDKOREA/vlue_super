#!/usr/bin/env node
/**
 * moov atom을 mdat 앞으로 이동 — iOS Safari 스트리밍·재생 호환 (qt-faststart)
 * Usage: node scripts/faststart-mp4.mjs path/to/video.mp4
 */
import fs from "node:fs";
import path from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/faststart-mp4.mjs <file.mp4>");
  process.exit(1);
}

const abs = path.resolve(target);
if (!fs.existsSync(abs)) {
  console.error("file not found:", abs);
  process.exit(1);
}

const buf = fs.readFileSync(abs);
const atoms = [];
let offset = 0;

while (offset + 8 <= buf.length) {
  let size = buf.readUInt32BE(offset);
  const type = buf.toString("latin1", offset + 4, offset + 8);
  if (size === 0) size = buf.length - offset;
  if (size < 8) break;
  atoms.push({ type, offset, size });
  offset += size;
}

const moov = atoms.find((a) => a.type === "moov");
const mdat = atoms.find((a) => a.type === "mdat");
if (!moov || !mdat) {
  console.log("[faststart] skip — moov/mdat missing:", abs);
  process.exit(0);
}
if (moov.offset < mdat.offset) {
  console.log("[faststart] ok — already faststart:", abs);
  process.exit(0);
}

const moovBuf = Buffer.from(buf.subarray(moov.offset, moov.offset + moov.size));
const delta = moov.size;

function patchChunkOffsets(start, end, moovBase) {
  let o = start;
  while (o + 8 <= end) {
    let sz = buf.readUInt32BE(o);
    const tp = buf.toString("latin1", o + 4, o + 8);
    if (sz === 0) sz = end - o;
    if (sz < 8) return;

    if (tp === "stco") {
      const count = buf.readUInt32BE(o + 12);
      for (let i = 0; i < count; i++) {
        const pos = o + 16 + i * 4;
        const val = buf.readUInt32BE(pos);
        moovBuf.writeUInt32BE(val + delta, pos - moovBase);
      }
    } else if (tp === "co64") {
      const count = buf.readUInt32BE(o + 12);
      for (let i = 0; i < count; i++) {
        const pos = o + 16 + i * 8;
        const hi = buf.readUInt32BE(pos);
        const lo = buf.readUInt32BE(pos + 4);
        const nval = hi * 2 ** 32 + lo + delta;
        moovBuf.writeUInt32BE(Math.floor(nval / 2 ** 32), pos - moovBase);
        moovBuf.writeUInt32BE(nval >>> 0, pos - moovBase + 4);
      }
    } else if (["moov", "trak", "mdia", "minf", "stbl"].includes(tp)) {
      patchChunkOffsets(o + 8, o + sz, moovBase);
    }
    o += sz;
  }
}

patchChunkOffsets(moov.offset + 8, moov.offset + moov.size, moov.offset);

const out = Buffer.concat([buf.subarray(0, mdat.offset), moovBuf, buf.subarray(mdat.offset, moov.offset)]);
fs.writeFileSync(abs, out);
console.log("[faststart] wrote", abs, "delta", delta, "bytes");
