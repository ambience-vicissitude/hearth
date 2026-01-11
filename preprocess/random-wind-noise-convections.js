// generateWind.js
import fs from 'fs';
import { createNoise2D } from 'simplex-noise';

// Parameters
const LAT = 64;
const LON = 128;
const PARTICLES = 5000;
const TIME_STEP = 0.1; // for temporal evolution
const OUTPUT = 'wind.json';

// Create noise functions
const noise = createNoise2D();

// Function to generate smooth wind field
function generateWind(time = 0) {
  const grid = [];
  for (let i = 0; i < LAT; i++) {
    const lat = i / LAT;
    for (let j = 0; j < LON; j++) {
      const lon = j / LON;

      // Generate smooth u,v using noise
      const u = noise(lon * 5, lat * 5 + time) * 10; // east-west
      const v = noise(lon * 5 + 100, lat * 5 + time) * 10; // north-south

      grid.push({ lat: lat * 180 - 90, lon: lon * 360 - 180, u, v });
    }
  }
  return grid;
}

// Initialize particles randomly
function generateParticles() {
  const particles = [];
  for (let i = 0; i < PARTICLES; i++) {
    particles.push({
      lat: Math.random() * 180 - 90,
      lon: Math.random() * 360 - 180,
    });
  }
  return particles;
}

// Save JSON
const windField = generateWind();
const particles = generateParticles();

fs.writeFileSync(
  OUTPUT,
  JSON.stringify({ grid: windField, particles }, null, 2)
);

console.log(`Wind JSON generated: ${OUTPUT}`);
