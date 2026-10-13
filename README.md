# Airspace

An airplane-experience focus timer with an interactive 3D Earth and a bird’s-eye aircraft camera. Board a flight, pick one task, and work until landing.

**[Open the website](https://andyyan999.github.io/airplane-focus/)**

## AI collaboration

I chose the concept: an airplane-experience focus timer for the web. I then requested a realistic 3D world map and a bird’s-eye airplane view. Hermes Agent (OpenAI gpt-6.1-sol) designed and implemented the website, wrote documentation, and ran verification. I approved publishing it. This is AI-assisted work; I do not claim to have written the implementation by hand.

## Use

Open `index.html` in a modern browser, or use the website. No installation is required. **HD satellite** streams optional Sentinel-2 imagery from EOX while online; the timer, renderer, cabin sound, and NASA Earth map still work offline. No runtime JavaScript CDN is used.

The website uses compact globe-fallback textures so satellite scenery is not delayed by the old 8MB image block. For the full embedded 8K Earth map, download and open [`offline.html`](https://andyyan999.github.io/airplane-focus/offline.html). Each edition is self-contained; the full-resolution copy does not need its neighboring source files. Both can use optional streamed HD imagery when online.

1. Choose two different airports and enter the task you want to focus on.
2. Pick 1–240 minutes, or a 25/50/90 minute preset, then board.
3. **Bird’s-eye** now uses a local flight camera and streamed satellite scenery, not a magnified whole-Earth image. Switch to **Earth view** for the globe and route. Drag to orbit, scroll/pinch to zoom, and use recenter to restore the view. Toggle **HD satellite** off to use the embedded offline map.
4. Switch daylight/night, enable optional synthesized cabin sound, or enter browser fullscreen.
5. Pause/resume without losing time, or end early and return to the gate.

**F** toggles quiet view. **Escape** exits it. **Space** pauses/resumes when not typing or interacting with a button/dialog. Completed flights are logged locally, up to 100 entries.

## What is real and what is illustrated

The Earth uses imported geographic textures (land/ocean color, terrain normals, ocean specularity, and a separate cloud layer), not invented continent shapes. Airport coordinates are geographic coordinates. Flights follow the shortest great-circle path, and aircraft position comes from actual focus-session progress.

The jet is an original procedural 3D mesh, not a real aircraft model. Its size and separation from the Earth are exaggerated so it stays visible at planetary scale. The displayed climb/cruise/descent altitude is an illustrative 0–11 km profile, not live flight data. Focus durations are not real airline durations. Lighting and cloud animation are illustrative, not live weather or astronomical simulation. Imported global textures have finite resolution and do not provide street-level terrain.

A WebGL-capable browser is required for the 3D experience. If WebGL is unavailable, the original window illustration and timer remain available. Browser audio requires a click. Screen wake lock and browser fullscreen depend on browser policy.

## Timing and privacy

The timer uses an absolute timestamp rather than decrementing once per interval, avoiding accumulated background-tab drift. Refresh restores running or paused sessions. A session that expired while the browser was closed completes when reopened. Changing the system clock changes the countdown.

Session state, selected theme, volume, satellite preference, and flight log are stored in browser `localStorage`. No account, analytics, or backend is required. When HD satellite is enabled in bird’s-eye view, the browser sends requests for the visible **virtual flight area** to EOX; it does not request your device location. Disable HD satellite to avoid new imagery requests. Offline/failing imagery returns to the embedded Earth view without interrupting the countdown. Private mode or blocked storage may prevent persistence. Local-file and website storage are separate.

## Development

The build produces a lightweight `index.html` for the website and a full-resolution `offline.html` for downloading. Both are standalone HTML files. Edit the smaller sources, not the generated output:

- `src/template.html`: timer and layout markup
- `src/immersive.css`: full-screen flight-deck layout
- `src/flight-math.js`: real airport coordinates, spherical routes, progress and illustrative altitude
- `src/world.js`: Three.js Earth, aircraft, camera, and interaction renderer
- `src/satellite-math.js`: Web Mercator tile registration, bounded tile plans, local camera scale, and detail rings
- `src/satellite.js`: visible-area satellite streaming, memory cache, attribution, and offline recovery
- `assets/`: local Earth/cloud textures and download provenance
- `vendor/`: pinned Three.js renderer and MIT license

Rebuild with `python3 tools/build.py`. Run tests with `node --test tests/*.cjs`. There is no npm install, runtime CDN, or build prerequisite for using the finished HTML.

## Verification

The route tests cover endpoints, live/paused progress, distance, climb/descent, all selectable route vectors, and the polar Shenzhen–New York midpoint. Original timer browser verification covered pause/resume, refresh persistence, completion without duplicate logs, early-ending/rebooking, mobile controls, cabin audio via a trusted click, and keyboard guards.

The 3D upgrade passed six automated route tests and real WebGL browser checks: 4096px Earth and 2048px cloud textures loaded, all ten active shader programs were runnable, and hiding the aircraft changed 12,590 pixels in a paused frame. A 50%-complete flight showed 12:30, 11.0 km simulated altitude, and 1,445 km remaining on SZX–HND. Landing synchronized `00:00` with Tokyo coordinates, zero remaining distance, and zero altitude. Pausing froze both the aircraft and cloud rotation. Orbit, drag threshold, zoom, recenter, day/night switching, Sydney–London globe framing, and a 390px-wide mobile canvas were exercised, with no JavaScript errors in the final session.

## Streamed satellite imagery

The selected free provider is **EOxCloudless / Sentinel-2 cloudless 2025**, not Google Maps. Tiles are reprojected onto the 3D Earth using their real Web Mercator coordinates. Broad terrain coverage (at most four cells) loads first. A compact 3×3 detail patch then sharpens the area near the aircraft, followed by the wider background (at most 16 cells). Detail uses zoom 14 when stationary/near the ground and zoom 13 during faster flight above 1 km so streaming can keep up. Ready tiles that still cover the visible area stay displayed while new detail arrives. Requests are reprioritized as the plane moves, limited to four concurrent downloads, and spaced by at least 180ms. An in-memory cache is capped at 160 cells. Earth view does not stream satellite cells. Hidden tabs stop issuing new jobs.

The tile grid is roughly 9–10 metres per pixel at the example flight locations. This reveals roads, runway markings, building blocks, and land-use detail; it is not Google’s sub-metre aerial imagery, street view, or 3D buildings. Imagery is a 2025 mosaic, not live weather or real-time photos. Ocean imagery may be less detailed than land. The aircraft remains enlarged for visibility, even in the local view.

EOX explicitly permits direct WMTS/WMS integration for **non-commercial** use with attribution under **CC BY-NC-SA 4.0** for 2025 imagery. The required linked attribution stays visible beside the map whenever imagery is displayed. Do not remove it or monetize this imagery-based version without obtaining an appropriate commercial license. See [EOX non-commercial terms](https://cloudless.eox.at/license-non-commercial); provenance and limits are recorded in `assets/satellite-provider.json`.

Verification of this upgrade: 23 automated tests passed, including a distribution test that keeps the website below 2MB while checking that the offline copy embeds the exact full-resolution 8K image. Actual browser requests loaded 25 native-detail cells plus a 16-cell background with zero image failures; the default Shenzhen view reported about 8.8 m per tile pixel. Hiding the imagery changed 764,361 rendered pixels, verifying that satellite data was actually painted. Offline simulation switched to the embedded map and returned online without losing the paused session. Native tiles, globe switching, texture-only mode, pause behavior, and a 390px mobile canvas were exercised without JavaScript errors.

Latest loading check: in an isolated cold-browser session, first satellite terrain appeared 2.47 seconds after imagery scheduling and first sharp detail at 2.73 seconds. The initial viewport used 27 requests, with no image failures or JavaScript errors. Regression tests cover the first-frame throttle bug, coverage-first order, retained textures, adaptive nine-cell detail, and reprioritization after movement. Network/server latency still affects arrival time. The website is about 1.59 MB rather than the previous 8.18 MB; the full 8K offline copy remains available.

## Third-party credits

The sharper-view update passed eight automated tests. Browser checks confirmed the displayed Earth texture is 8192×4096, the removed text block is absent, and a 1280×720 Retina viewport renders a 2560×1440 canvas with 8× anisotropic filtering (where supported). Bird’s-eye/globe camera switching and the 390px mobile layout were checked without JavaScript errors. Global-map credits remain in this README; the streamed satellite layer additionally displays its legally required on-screen attribution.

- **EOxCloudless** https://cloudless.eox.at by **EOX IT Services GmbH** https://eox.at (Contains modified Copernicus Sentinel data 2025). Online layer `s2cloudless-2025_3857`, CC BY-NC-SA 4.0 for non-commercial use.
- **Three.js r160.1**: MIT license, reproduced in `vendor/THREE-LICENSE.txt`.
- **Earth color texture (8192×4096)**: NASA Earth Observatory / Reto Stöckli, Blue Marble Next Generation, January 2004, with topography and bathymetry. Downloaded the [21600×10800 original](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/january/world.topo.bathy.200401.3x21600x10800.jpg) from the [official NASA collection](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/), downsampled to 8K, and encoded as WebP quality 88. This contains four times the texture pixels of the previous 4K image; it is not an enlargement of that image.
- **Cloud texture (2048×1024)**: Tom Patterson / Natural Earth III, retrieved from Bjørn Sandvik’s `webgl-earth` example. Source explanation: [Creating a WebGL Earth with three.js](https://blog.mastermaps.com/2013/09/creating-webgl-earth-with-threejs.html); [Natural Earth III](https://www.shadedrelief.com/natural3/).
- **Earth normal and ocean specular maps**: Three.js r160 example planet textures. Exact download locations for every asset are recorded in `assets/sources.json`.
- Original Airspace UI, CSS window illustration, procedural airplane geometry, and synthesized cabin audio were implemented for this project.

These credits do not imply endorsement or affiliation.
