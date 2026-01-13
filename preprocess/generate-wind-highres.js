import { createNoise3D } from "simplex-noise";
import alea from "alea";
import fs from "fs";

// ---------------- CONFIG ----------------
const LAT = 360;
const LON = 720;
const NUM_PARTICLES = 150000;
const WIND_SCALE_LARGE = 10;
const WIND_SCALE_SMALL = 2;
const LAT_BIAS = true;
const OUTPUT = "wind.json";
const SEED = "earthwind";

// ---------------- CREATE NOISE ----------------
const rng = alea(SEED);
const noiseLarge = createNoise3D(rng);

// For multi-scale small turbulence, separate instance
const rng2 = alea(SEED + "_small");
const noiseSmall = createNoise3D(rng2);

// ---------------- CURL NOISE ----------------
function multiScaleCurlNoise(lat, lon, t) {
  const e = 0.0001;
  const x = lon / 180;
  const y = lat / 90;

  // --- Large scale ---
  const uL =
    ((noiseLarge(x, y + e, t) - noiseLarge(x, y - e, t)) / (2 * e)) *
    WIND_SCALE_LARGE;
  const vL =
    ((noiseLarge(x + e, y, t) - noiseLarge(x - e, y, t)) / (2 * e)) *
    WIND_SCALE_LARGE;

  // --- Small scale ---
  const uS =
    ((noiseSmall(x * 4, y * 4 + e, t * 2) -
      noiseSmall(x * 4, y * 4 - e, t * 2)) /
      (2 * e)) *
    WIND_SCALE_SMALL;
  const vS =
    ((noiseSmall(x * 4 + e, y * 4, t * 2) -
      noiseSmall(x * 4 - e, y * 4, t * 2)) /
      (2 * e)) *
    WIND_SCALE_SMALL;

  let u = uL + uS;
  let v = -(vL + vS);

  if (LAT_BIAS) {
    const factor = Math.cos((lat * Math.PI) / 180);
    u *= factor;
    v *= factor;
  }

  return { u, v };
}

// ------- Earth-like wind curl noise -------

function earthLikeWind2(lat, lon, t) {
  const e = 0.0001;
  const x = lon / 180;
  const y = lat / 90;

  // --- Small-scale convection (dominant) ---
  const numCells = 10; // more cells -> more circular eddies
  let convU = 0,
    convV = 0;
  for (let i = 0; i < numCells; i++) {
    const centerLat = -60 + Math.random() * 120; // pseudo-random positions
    const centerLon = -180 + Math.random() * 360;
    const dx = lon - centerLon;
    const dy = lat - centerLat;
    const dist2 = dx * dx + dy * dy + 1e-6;
    const strength = 8; // higher than jet stream
    convU += (-dy / dist2) * strength;
    convV += (dx / dist2) * strength;
  }

  // --- Jet stream (secondary) ---
  const jetFactor = Math.exp(-Math.pow((Math.abs(lat) - 45) / 10, 2));
  const jetU = noiseLarge(x * 2, y * 2, t) * 4 * jetFactor; // smaller than convection
  const jetV = noiseLarge(x * 2, y * 2, t) * 1 * jetFactor;

  // --- Base global flow (minimal) ---
  const baseU = noiseLarge(x, y, t) * 2 * Math.cos((lat * Math.PI) / 180);
  const baseV = 0;

  // --- Small-scale turbulence ---
  const turbU =
    ((noiseSmall(x * 6, y * 6, t * 2) - noiseSmall(x * 6 + e, y * 6, t * 2)) /
      (2 * e)) *
    1.5;
  const turbV =
    ((noiseSmall(x * 6, y * 6, t * 2) - noiseSmall(x * 6, y * 6 + e, t * 2)) /
      (2 * e)) *
    1.5;

  // --- Combine layers ---
  const u = convU + jetU + baseU + turbU;
  const v = convV + jetV + baseV + turbV;

  return { u, v };
}

function earthLikeWind(lat, lon, t) {
  const e = 0.0001;
  const x = lon / 180;
  const y = lat / 90;

  // --- Base horizontal flow ---
  const tradeU = noiseLarge(x, y, t) * 10 * Math.cos((lat * Math.PI) / 180);
  const tradeV = 0; // mostly east-west

  // --- Jet stream ---
  const jetFactor = Math.exp(-Math.pow((Math.abs(lat) - 45) / 10, 2)); // band around 45° mid-lat
  const jetU = noiseLarge(x * 2, y * 2, t) * 20 * jetFactor;
  const jetV = noiseLarge(x * 2, y * 2, t) * 5 * jetFactor;

  // --- Circular convection (hot/cold spots) ---
  const numCells = 6;
  let convU = 0,
    convV = 0;
  for (let i = 0; i < numCells; i++) {
    const centerLat = -60 + Math.random() * 120;
    const centerLon = -180 + Math.random() * 360;
    const dx = lon - centerLon;
    const dy = lat - centerLat;
    const dist2 = dx * dx + dy * dy + 1e-6;
    convU += (-dy / dist2) * 5; // clockwise
    convV += (dx / dist2) * 5;
  }

  // --- Small-scale turbulence ---
  const turbU =
    ((noiseSmall(x * 4, y * 4, t * 2) - noiseSmall(x * 4 + e, y * 4, t * 2)) /
      (2 * e)) *
    2;
  const turbV =
    ((noiseSmall(x * 4, y * 4, t * 2) - noiseSmall(x * 4, y * 4 + e, t * 2)) /
      (2 * e)) *
    2;

  // Combine all
  const u = tradeU + jetU + convU + turbU;
  const v = tradeV + jetV + convV + turbV;

  return { u, v };
}

// ---------------- GENERATE GRID ----------------
const grid = [];
for (let i = 0; i < LAT; i++) {
  const lat = -90 + (i / (LAT - 1)) * 180;
  for (let j = 0; j < LON; j++) {
    const lon = -180 + (j / (LON - 1)) * 360;
    // const vel = multiScaleCurlNoise(lat, lon, 0);
    // const vel = earthLikeWind(lat, lon, 0);
    const vel = earthLikeWind2(lat, lon, 0);
    grid.push({ u: vel.u, v: vel.v });
  }
}

// ---------------- GENERATE PARTICLES ----------------
const particles = [];
for (let i = 0; i < NUM_PARTICLES; i++) {
  const lat = Math.random() * 180 - 90;
  const lon = Math.random() * 360 - 180;
  particles.push({ lat, lon });
}

// ---------------- WRITE JSON ----------------
fs.writeFileSync(OUTPUT, JSON.stringify({ grid, particles }, null, 2));
// eslint-disable-next-line no-undef
console.log("Generated wind.json ✅");
