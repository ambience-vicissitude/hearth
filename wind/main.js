/* eslint-disable no-undef */
import Globe from "globe.gl";

// Go to root of the site
function goHome() {
  window.location.href = "/";
}

// Globe
const globe = new Globe(document.getElementById("globeViz"))
  .width(window.innerWidth)
  .height(window.innerHeight)
  .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-night.jpg")
  .arcColor((d) => d.color || "cyan")
  .arcAltitude((d) => d.altitude)
  .arcStroke(0.5)
  .arcDashLength(0.4)
  .arcDashGap(0.6)
  .arcDashAnimateTime(1000);

// Load your pre-generated JSON file
fetch("../datasets/wind_arcs_random_compressed_2.5.json")
  .then((res) => res.json())
  .then((arcs) => {
    globe
      .arcsData(arcs)
      .arcStartLat((d) => d.startLat)
      .arcStartLng((d) => d.startLng)
      .arcEndLat((d) => d.endLat)
      .arcEndLng((d) => d.endLng);
    console.log(`✅ Loaded ${arcs.length} wind arcs`);
  })
  .catch((err) => console.error("Failed to load wind arcs:", err));
