import fs from "fs";

const latStep = 2.5;
const lonStep = 2.5;
const scale = 0.05;
const arcs = [];

for (let lat = -90; lat <= 90; lat += latStep) {
  for (let lon = -180; lon <= 180; lon += lonStep) {
    const speed = Math.random() * 20;
    const dir = Math.random() * 360;
    const rad = (dir * Math.PI) / 180;

    arcs.push({
      startLat: Math.round(lat * 100) / 100,
      startLng: Math.round(lon * 100) / 100,
      endLat: Math.round((lat + speed * Math.cos(rad) * scale) * 100) / 100,
      endLng: Math.round((lon + speed * Math.sin(rad) * scale) * 100) / 100,
      altitude: 0.02,
      color: "cyan",
    });
  }
}

fs.writeFileSync("wind_arcs_random_compressed.json", JSON.stringify(arcs));
// eslint-disable-next-line no-undef
console.log(`✅ Compressed wind map generated with ${arcs.length} arcs`);
