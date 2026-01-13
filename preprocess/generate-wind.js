import fs from "fs";
import { createNoise3D } from "simplex-noise";

// ---------------- CONFIG ----------------
const LAT = 180; // higher resolution for smoother bands
const LON = 360;
const PARTICLES = 100000; // more particles for realistic flow
const WIND_SCALE_LARGE = 10;
const WIND_SCALE_SMALL = 2;
const OUTPUT = "wind.json";

// ---------------- NOISE ----------------
const noiseLarge = createNoise3D();
const noiseSmall = createNoise3D();

// ---------------- CURL NOISE WITH MULTI-SCALE ----------------
function multiScaleCurlNoise(x, y, t) {
  const e = 0.0001;

  // Large scale (slow moving, global circulation)
  const lx = x * 0.2;
  const ly = y * 0.2;
  const lt = t * 0.05;

  const largeU =
    ((noiseLarge(lx, ly + e, lt) - noiseLarge(lx, ly - e, lt)) / (2 * e)) * WIND_SCALE_LARGE;
  const largeV =
    ((noiseLarge(lx + e, ly, lt) - noiseLarge(lx - e, ly, lt)) / (2 * e)) * WIND_SCALE_LARGE;

  // Small scale (fast moving, local turbulence)
  const sx = x * 4;
  const sy = y * 4;
  const st = t * 2;

  const smallU =
    ((noiseSmall(sx, sy + e, st) - noiseSmall(sx, sy - e, st)) / (2 * e)) * WIND_SCALE_SMALL;
  const smallV =
    ((noiseSmall(sx + e, sy, st) - noiseSmall(sx - e, sy, st)) / (2 * e)) * WIND_SCALE_SMALL;

  // Combine scales
  let u = largeU + smallU;
  let v = -(largeV + smallV); // curl rotation

  return { u, v };
}

// ---------------- LATITUDINAL BIAS ----------------
function applyLatitudinalBias(lat, u, v) {
  // simulate Earth-like bands: easterlies and westerlies
  const latNorm = Math.abs(lat) / 90; // 0 at equator, 1 at poles

  // trade winds near equator: eastward
  const trade = (1 - latNorm) * 0.5;

  // westerlies mid-latitudes
  const westerlies = latNorm > 0.3 && latNorm < 0.7 ? 0.5 : 0;

  // polar easterlies near poles
  const polar = latNorm > 0.8 ? 0.3 : 0;

  const bias = trade + westerlies + polar;

  return { u: u + bias, v };
}

// ---------------- GENERATE GRID ----------------
function generateWindField(time = 0) {
  const grid = [];

  for (let i = 0; i < LAT; i++) {
    for (let j = 0; j < LON; j++) {
      const lat = (i / LAT) * 180 - 90;
      const lon = (j / LON) * 360 - 180;

      const x = (j / LON) * 4;
      const y = (i / LAT) * 2;

      let { u, v } = multiScaleCurlNoise(x, y, time);
      ({ u, v } = applyLatitudinalBias(lat, u, v));

      grid.push({ lat, lon, u, v });
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
  "wind.json generated:",
  particles.length,
  "particles,",
  windField.length,
  "grid points"
);
