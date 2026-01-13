/* eslint-disable no-undef */
import Globe from "globe.gl";

// Go to root of the site
// eslint-disable-next-line no-unused-vars
function goHome() {
  window.location.href = "/";
}

// ---------------- CONFIG ----------------
const TIME_STEP = 0.005;
const PARTICLE_SPEED = 0.002;
const PRE_ADVANCE = 50;

let windData;
// eslint-disable-next-line no-unused-vars
let time = 0;

// ---------------- GLOBE ----------------
const globe = new Globe()
  .width(window.innerWidth)
  .height(window.innerHeight)
  .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
  .backgroundColor("#000")
  .particleLat("lat")
  .particleLng("lon")
  .particleAltitude(0.01)
  .particlesColor(() => "rgba(255,255,255,0.7)");
// .particlesRadius(0.1); // smaller radius for particle flow
globe(document.getElementById("globeViz"));

// ---------------- LOAD DATA ----------------
fetch("../datasets/wind-highres-2.json")
  .then((r) => r.json())
  .then((data) => {
    windData = data;

    // Pre-advance time
    for (let i = 0; i < PRE_ADVANCE; i++) time += TIME_STEP;

    globe.particlesData([windData.particles]);
  });

// ---------------- BILINEAR INTERPOLATION ----------------
function bilinearInterpolation(lat, lon) {
  const LAT = 180;
  const LON = 360;

  const latNorm = ((lat + 90) / 180) * (LAT - 1);
  const lonNorm = ((lon + 180) / 360) * (LON - 1);

  const i0 = Math.floor(latNorm);
  const j0 = Math.floor(lonNorm);
  const i1 = Math.min(i0 + 1, LAT - 1);
  const j1 = Math.min(j0 + 1, LON - 1);

  const di = latNorm - i0;
  const dj = lonNorm - j0;

  const idx00 = i0 * LON + j0;
  const idx01 = i0 * LON + j1;
  const idx10 = i1 * LON + j0;
  const idx11 = i1 * LON + j1;

  const u00 = windData.grid[idx00].u;
  const v00 = windData.grid[idx00].v;
  const u01 = windData.grid[idx01].u;
  const v01 = windData.grid[idx01].v;
  const u10 = windData.grid[idx10].u;
  const v10 = windData.grid[idx10].v;
  const u11 = windData.grid[idx11].u;
  const v11 = windData.grid[idx11].v;

  const u0 = u00 * (1 - dj) + u01 * dj;
  const u1 = u10 * (1 - dj) + u11 * dj;
  const u = u0 * (1 - di) + u1 * di;

  const v0 = v00 * (1 - dj) + v01 * dj;
  const v1 = v10 * (1 - dj) + v11 * dj;
  const v = v0 * (1 - di) + v1 * di;

  return { u, v };
}

// ---------------- ADVECT PARTICLES ----------------
function advectParticles() {
  for (let i = 0; i < windData.particles.length; i++) {
    const p = windData.particles[i];
    const { u, v } = bilinearInterpolation(p.lat, p.lon);

    p.lat += v * PARTICLE_SPEED;
    p.lon += u * PARTICLE_SPEED;

    // wrap globe
    if (p.lat > 90) p.lat -= 180;
    if (p.lat < -90) p.lat += 180;
    if (p.lon > 180) p.lon -= 360;
    if (p.lon < -180) p.lon += 360;
  }
}

// ---------------- ANIMATION LOOP ----------------
function animate() {
  requestAnimationFrame(animate);
  if (!windData) return;

  time += TIME_STEP;
  advectParticles();

  // Efficient update: just move existing particles
  globe.particlesData([windData.particles]);
}

animate();
