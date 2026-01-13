import fs from "fs";
import { createNoise3D } from "simplex-noise";

// ---------------- CONFIG ----------------
const LAT = 64; // number of latitude points
const LON = 128; // number of longitude points
const PARTICLES = 6000; // number of advected particles
const WIND_SCALE = 15; // how strong the vectors are
const OUTPUT = "wind.json";

// ---------------- NOISE ----------------
const noise3D = createNoise3D();

// ---------------- CURL NOISE ----------------
function curlNoise(x, y, t) {
  const e = 0.0001;

  // finite differences for curl
  const n1 = noise3D(x, y + e, t);
  const n2 = noise3D(x, y - e, t);
  const a = (n1 - n2) / (2 * e);

  const n3 = noise3D(x + e, y, t);
  const n4 = noise3D(x - e, y, t);
  const b = (n3 - n4) / (2 * e);

  return { u: a, v: -b };
}

// ---------------- GENERATE GRID ----------------
function generateWindField(time = 0) {
  const grid = [];

  for (let i = 0; i < LAT; i++) {
    for (let j = 0; j < LON; j++) {
      const lat = (i / LAT) * 180 - 90;
      const lon = (j / LON) * 360 - 180;

      // scale coordinates for noise space
      const x = (j / LON) * 4;
      const y = (i / LAT) * 2;

      const w = curlNoise(x, y, time);

      grid.push({
        lat,
        lon,
        u: w.u * WIND_SCALE,
        v: w.v * WIND_SCALE,
      });
    }
  }

  return grid;
}

// ---------------- GENERATE PARTICLES ----------------
function generateParticles(count = PARTICLES) {
  return Array.from({ length: count }, () => ({
    lat: Math.random() * 180 - 90,
    lon: Math.random() * 360 - 180,
  }));
}

// ---------------- WRITE JSON ----------------
const windField = generateWindField(0);
const particles = generateParticles();

fs.writeFileSync(OUTPUT, JSON.stringify({ grid: windField, particles }, null, 2));

// eslint-disable-next-line no-undef
console.log(
  "wind.json generated with",
  particles.length,
  "particles and",
  windField.length,
  "grid points"
);
