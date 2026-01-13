/* eslint-disable no-undef */
import Globe from "globe.gl";
import { createNoise3D } from "simplex-noise";

// Go to root of the site
function goHome() {
  window.location.href = "/";
}

// ---------------- CONFIG ----------------
const LAT = 64;
const LON = 128;
const TIME_STEP = 0.015;
const WIND_SCALE = 15;
const PARTICLE_SPEED = 0.01;

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
const globe = Globe()
  .width(window.innerWidth)
  .height(window.innerHeight)
  .globeImageUrl("//unpkg.com/three-globe/example/img/earth-dark.jpg")
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
function advectParticles() {
  windData.particles.forEach((p) => {
    const latIdx = Math.floor(((p.lat + 90) / 180) * LAT);
    const lonIdx = Math.floor(((p.lon + 180) / 360) * LON);
    const idx = latIdx * LON + lonIdx;

    const wind = windData.grid[idx];
    if (!wind) return;

    p.lat += wind.v * PARTICLE_SPEED;
    p.lon += wind.u * PARTICLE_SPEED;

    // wrap globe
    if (p.lat > 90) p.lat = -90;
    if (p.lat < -90) p.lat = 90;
    if (p.lon > 180) p.lon = -180;
    if (p.lon < -180) p.lon = 180;
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
