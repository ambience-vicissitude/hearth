/* eslint-disable no-undef */
import Globe from "globe.gl";
import * as satellite from "satellite.js";

// Go to root of the site
function goHome() {
  window.location.href = "/";
}

const EARTH_RADIUS_KM = 6371; // km
const TIME_STEP = 3 * 1000; // per frame

const timeLogger = document.getElementById("time-log");

const world = new Globe(document.getElementById("chart"))
  .globeImageUrl("//cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg")
  .particleLat("lat")
  .particleLng("lng")
  .particleAltitude("alt")
  .particlesColor(() => "palegreen");

setTimeout(() => world.pointOfView({ altitude: 3.5 }));

fetch("../datasets/space-track-leo.txt")
  .then((r) => r.text())
  .then((rawData) => {
    const tleData = rawData
      .replace(/\r/g, "")
      .split(/\n(?=[^12])/)
      .filter((d) => d)
      .map((tle) => tle.split("\n"));
    const satData = tleData
      .map(([name, ...tle]) => ({
        satrec: satellite.twoline2satrec(...tle),
        name: name.trim().replace(/^0 /, ""),
      }))
      // exclude those that can't be propagated
      .filter((d) => !!satellite.propagate(d.satrec, new Date())?.position);

    // time ticker
    let time = new Date();
    (function frameTicker() {
      requestAnimationFrame(frameTicker);

      time = new Date(+time + TIME_STEP);
      timeLogger.innerText = time.toString();

      // Update satellite positions
      const gmst = satellite.gstime(time);
      satData.forEach((d) => {
        const eci = satellite.propagate(d.satrec, time);
        if (eci?.position) {
          const gdPos = satellite.eciToGeodetic(eci.position, gmst);
          d.lat = satellite.radiansToDegrees(gdPos.latitude);
          d.lng = satellite.radiansToDegrees(gdPos.longitude);
          d.alt = gdPos.height / EARTH_RADIUS_KM;
        } else {
          // explicitly handle invalid position
          d.lat = NaN;
          d.lng = NaN;
          d.alt = NaN;
        }
      });

      console.log([satData.filter((d) => !isNaN(d.lat) && !isNaN(d.lng) && !isNaN(d.alt))]);

      world.particlesData([satData.filter((d) => !isNaN(d.lat) && !isNaN(d.lng) && !isNaN(d.alt))]);
    })();
  });
