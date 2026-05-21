/* generate-assets.js — run once: node generate-assets.js
   Generates missing image assets for ChessKidoo:
     assets/img/og-cover.png        (1200×630 — social share preview)
     assets/img/apple-touch-icon.png (180×180 — iOS home screen icon)
   Pure Node.js, no npm install required. */

'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

/* ── CRC32 ────────────────────────────────────────────────── */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const t   = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

function buildPNG(w, h, getPixel) {
  /* build one row at a time with filter byte 0 (None) */
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.allocUnsafe(w * 3 + 1);
    row[0] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = getPixel(x, y, w, h);
      const p = 1 + x * 3;
      row[p] = r; row[p + 1] = g; row[p + 2] = b;
    }
    rows.push(row);
  }

  const raw        = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 6 });

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

/* ── Color helpers ────────────────────────────────────────── */
function lerp(a, b, t) { return Math.round(a + (b - a) * Math.min(1, Math.max(0, t))); }

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* ── OG Cover (1200 × 630) ───────────────────────────────── */
function ogPixel(x, y, W, H) {
  const BG1 = [10, 12, 22];   // top-left deep navy
  const BG2 = [22, 18, 40];   // bottom-right deep purple
  const AMBER = [217, 119, 6];
  const CREAM = [240, 217, 181];
  const BROWN = [181, 136,  99];

  const tx = x / W, ty = y / H;

  /* diagonal gradient background */
  const t = (tx + ty) * 0.5;
  let r = lerp(BG1[0], BG2[0], t);
  let g = lerp(BG1[1], BG2[1], t);
  let b = lerp(BG1[2], BG2[2], t);

  /* subtle dot-grid overlay */
  if (x % 30 === 0 && y % 30 === 0) { r += 12; g += 12; b += 18; }

  /* chess board centred */
  const BOARD = 280, SQ = BOARD / 8;
  const BX = Math.floor((W - BOARD) / 2);
  const BY = Math.floor((H - BOARD) / 2);
  const dx = x - BX, dy = y - BY;

  /* board shadow */
  if (dx >= -8 && dx < BOARD + 8 && dy >= -8 && dy < BOARD + 8) {
    const inShadowOnly = !(dx >= 0 && dx < BOARD && dy >= 0 && dy < BOARD);
    if (inShadowOnly) { r = lerp(r, 0, 0.55); g = lerp(g, 0, 0.55); b = lerp(b, 0, 0.55); }
  }

  /* board squares */
  if (dx >= 0 && dx < BOARD && dy >= 0 && dy < BOARD) {
    const col = Math.floor(dx / SQ), row = Math.floor(dy / SQ);
    if ((col + row) % 2 === 0) return CREAM;
    return BROWN;
  }

  /* 3px amber border around board */
  if (dx >= -3 && dx < BOARD + 3 && dy >= -3 && dy < BOARD + 3) {
    const inside = dx >= 0 && dx < BOARD && dy >= 0 && dy < BOARD;
    if (!inside) return AMBER;
  }

  /* top & bottom gold rule lines */
  const lineY1 = 72, lineY2 = H - 72;
  const lineW = W - 120;
  const lineX0 = 60;
  if ((Math.abs(y - lineY1) <= 1 || Math.abs(y - lineY2) <= 1) &&
      x >= lineX0 && x <= lineX0 + lineW) return AMBER;

  /* corner diamond accents (top-left, bottom-right) */
  const diamonds = [
    { cx: 60,     cy: 315 },
    { cx: W - 60, cy: 315 },
  ];
  for (const d of diamonds) {
    const mdist = Math.abs(x - d.cx) + Math.abs(y - d.cy);
    if (mdist < 18) return AMBER;
    if (mdist < 22) return [r, g, b]; // gap
  }

  /* soft golden glow behind board */
  const cx = W / 2, cy2 = H / 2;
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy2) ** 2);
  if (dist < 230) {
    const glow = (1 - dist / 230) * 0.06;
    r = Math.min(255, Math.round(r + 217 * glow));
    g = Math.min(255, Math.round(g + 119 * glow));
    b = Math.min(255, Math.round(b +   6 * glow));
  }

  return [r, g, b];
}

/* ── Apple Touch Icon (180 × 180) ────────────────────────── */
function iconPixel(x, y, W, H) {
  const AMBER  = [217, 119,  6];
  const AMBER2 = [184,  97,  2];
  const WHITE  = [255, 255, 255];

  /* rounded-rect mask (radius 36 / 180 = 20%) */
  const R = 36;
  const inRR = (px, py) => {
    const cx = Math.min(Math.max(px, R), W - R);
    const cy = Math.min(Math.max(py, R), H - R);
    return (px - cx) ** 2 + (py - cy) ** 2 <= R * R;
  };
  if (!inRR(x, y)) return [0, 0, 0]; // will be transparent edge (shown as black here — fine for PNG)

  /* diagonal gradient bg */
  const t = (x + y) / (W + H);
  const r = lerp(AMBER[0], AMBER2[0], t);
  const g = lerp(AMBER[1], AMBER2[1], t);
  const b = lerp(AMBER[2], AMBER2[2], t);

  /* mini chess board (8×8 squares, 140px, centred) */
  const BOARD = 130, SQ = BOARD / 8;
  const BX = Math.floor((W - BOARD) / 2);
  const BY = Math.floor((H - BOARD) / 2);
  const dx = x - BX, dy = y - BY;

  if (dx >= 0 && dx < BOARD && dy >= 0 && dy < BOARD) {
    const col = Math.floor(dx / SQ), row = Math.floor(dy / SQ);
    if ((col + row) % 2 === 0) return [255, 240, 210]; // cream
    return [180, 120, 30]; // dark amber square
  }

  /* 2px white border around inner board */
  if (dx >= -2 && dx < BOARD + 2 && dy >= -2 && dy < BOARD + 2) {
    const inside = dx >= 0 && dx < BOARD && dy >= 0 && dy < BOARD;
    if (!inside) return WHITE;
  }

  return [r, g, b];
}

/* ── Write files ─────────────────────────────────────────── */
const OUT = path.join(__dirname, 'assets', 'img');

console.log('Generating og-cover.png (1200×630)…');
const ogPng = buildPNG(1200, 630, ogPixel);
fs.writeFileSync(path.join(OUT, 'og-cover.png'), ogPng);
console.log(`  → ${Math.round(ogPng.length / 1024)} KB`);

console.log('Generating apple-touch-icon.png (180×180)…');
const iconPng = buildPNG(180, 180, iconPixel);
fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), iconPng);
console.log(`  → ${Math.round(iconPng.length / 1024)} KB`);

console.log('Done. ✓');
