/* eslint-disable no-undef */
import Globe from "globe.gl";
import { createNoise3D } from "simplex-noise";

// Go to root of the site
function goHome() {
  window.location.href = "/";
}

// ---------------- CONFIG ----------------
// const LAT = 64;
// const LON = 128;
const LAT = 360; // 0.5° per row
const LON = 720; // 0.5° per column
const TIME_STEP = 0.005;
const WIND_SCALE = 15;
const PARTICLE_SPEED = 0.002;
const PRE_ADVANCE = 50; // pre-advance time to start with motion

// ---------------- STATE ----------------
let windData;
let time = 0;

const noise = new createNoise3D();

// ---------------- CURL NOISE ----------------
function curlNoise(x, y, t) {
  const e = 0.0001;

  const n1 = noise(x, y + e, t);
  const n2 = noise(x, y - e, t);
  const a = (n1 - n2) / (2 * e);

  const n3 = noise(x + e, y, t);
  const n4 = noise(x - e, y, t);
  const b = (n3 - n4) / (2 * e);

  return { u: a, v: -b };
}

// ---------------- GLOBE ----------------
const globe = Globe({
  antialias: true, // smoother edges
  devicePixelRatio: window.devicePixelRatio, // full HD / Retina
})
  .width(window.innerWidth)
  .height(window.innerHeight)
  .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
  .backgroundColor("#000")
  .pointRadius(0.15)
  .pointAltitude(0.01)
  .pointColor(() => "rgba(255,255,255,0.7)");

globe(document.getElementById("globeViz"));

// Camera
const camera = globe.camera();
camera.position.z = 300;

// ---------------- LOAD DATA ----------------
// fetch("../datasets/wind_noise_convections.json")
fetch("../datasets/wind.json")
  .then((r) => r.json())
  .then((data) => {
    windData = data;

    // Pre-advance time to avoid initial stutter
    for (let i = 0; i < PRE_ADVANCE; i++) time += TIME_STEP;

    globe
      .pointsData(windData.particles)
      .pointLat((d) => d.lat)
      .pointLng((d) => d.lon);
  });

// ---------------- UPDATE WIND FIELD ----------------
function updateWindField(t) {
  windData.grid.forEach((cell) => {
    const x = ((cell.lon + 180) / 360) * 4;
    const y = ((cell.lat + 90) / 180) * 2;

    const w = curlNoise(x, y, t);
    cell.u = w.u * WIND_SCALE;
    cell.v = w.v * WIND_SCALE;
  });
}

// ---------------- ADVECT PARTICLES ----------------

// ---------------- UTILS ----------------
function bilinearInterpolation(lat, lon) {
  const latNorm = ((lat + 90) / 180) * (180 - 1); // LAT assumed 180
  const lonNorm = ((lon + 180) / 360) * (360 - 1); // LON assumed 360

  const i0 = Math.floor(latNorm);
  const j0 = Math.floor(lonNorm);
  const i1 = Math.min(i0 + 1, 179);
  const j1 = Math.min(j0 + 1, 359);

  const di = latNorm - i0;
  const dj = lonNorm - j0;

  const idx00 = i0 * 360 + j0;
  const idx01 = i0 * 360 + j1;
  const idx10 = i1 * 360 + j0;
  const idx11 = i1 * 360 + j1;

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
function advectParticles() {
  windData.particles.forEach((p) => {
    const { u, v } = bilinearInterpolation(p.lat, p.lon);

    p.lat += v * PARTICLE_SPEED;
    p.lon += u * PARTICLE_SPEED;

    // wrap globe
    if (p.lat > 90) p.lat -= 180;
    if (p.lat < -90) p.lat += 180;
    if (p.lon > 180) p.lon -= 360;
    if (p.lon < -180) p.lon += 360;
    //   const latIdx = Math.floor(((p.lat + 90) / 180) * LAT);
    //   const lonIdx = Math.floor(((p.lon + 180) / 360) * LON);
    //   const idx = latIdx * LON + lonIdx;

    //   const wind = windData.grid[idx];
    //   if (!wind) return;

    //   p.lat += wind.v * PARTICLE_SPEED;
    //   p.lon += wind.u * PARTICLE_SPEED;

    //   // wrap globe
    //   if (p.lat > 90) p.lat = -90;
    //   if (p.lat < -90) p.lat = 90;
    //   if (p.lon > 180) p.lon = -180;
    //   if (p.lon < -180) p.lon = 180;
  });
}

// ---------------- ANIMATION LOOP ----------------
function animate() {
  requestAnimationFrame(animate); // window.requestAnimationFrame

  if (!windData) return;

  time += TIME_STEP;
  updateWindField(time); // evolving fronts
  advectParticles(); // particle flow

  globe.pointsData(windData.particles);
}

animate();

// --------------- HANDLE WINDOW RE-SIZE ---------------
window.addEventListener("resize", () => {
  GlobeInstance.renderer().setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
