import Globe from 'globe.gl';
import * as THREE from 'three';

// Go to root of the site
function goHome() {
    window.location.href = '/';
}

const globeContainer = document.getElementById('globeViz');

// --- Globe instance ---
const GlobeInstance = Globe()
  .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
  .backgroundColor('black')
  .pointAltitude(0.01)
  .pointRadius(0.2)
  .pointColor(() => 'orange');

// **Attach to container**
GlobeInstance(globeContainer);

// --- Camera ---
const camera = GlobeInstance.camera();
camera.position.z = 300;

// --- Wind data ---
let windData = null;

fetch('../datasets/wind_noise_convections.json')
  .then(res => {
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  })
  .then(data => {
    windData = data;

    // Initial particle display
    GlobeInstance.pointsData(windData.particles)
      .pointLat(d => d.lat)
      .pointLng(d => d.lon);
  })
  .catch(err => console.error('Failed to load wind.json:', err));

// --- Animation loop ---
function animate() {
  requestAnimationFrame(animate);

  if (windData) {
    const LAT = 64;   // must match your Node.js generator
    const LON = 128;  // must match your Node.js generator

    windData.particles.forEach(p => {
      // Nearest grid point
      const latIdx = Math.floor(((p.lat + 90)/180) * LAT);
      const lonIdx = Math.floor(((p.lon + 180)/360) * LON);
      const idx = Math.min(latIdx * LON + lonIdx, windData.grid.length - 1);
      const wind = windData.grid[idx];

      if (wind) {
        p.lat += wind.v * 0.01; // particle speed scaling
        p.lon += wind.u * 0.01;

        // Wrap edges
        if (p.lat > 90) p.lat = -90;
        if (p.lat < -90) p.lat = 90;
        if (p.lon > 180) p.lon = -180;
        if (p.lon < -180) p.lon = 180;
      }
    });

    // Update Globe with new particle positions
    GlobeInstance.pointsData(windData.particles);
  }

  GlobeInstance.renderer().render(GlobeInstance.scene(), camera);
}

animate();

// --- Handle window resize ---
window.addEventListener('resize', () => {
  GlobeInstance.renderer().setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
