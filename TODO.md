### Overview

## High

## Med

- the globe/globe-ar libraries seem to have different three.js versions going on, which may be outdated problems and may lead to consistencies/security issues in the future
- 4 moderate severity vulnerabilities remain `npm audit fix` doesn't resolve
- pre-process-noaa.js doesn't work on windows (the grib2json wont work on node cli in windows), so you have to use python

## Low

- fix eslint so it auto-lints on save
- globe-ar is not working because you have no webcam
- there are no map tiles available except the osm standard, so all the other ones are not working; the cyclosm and topo ones might work if your deployment was HTTPS://

### Last updated

Jan 11, 2026