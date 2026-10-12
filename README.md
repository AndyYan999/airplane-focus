# Airspace

An airplane-experience focus timer with an interactive 3D Earth and a bird’s-eye aircraft camera. Board a flight, pick one task, and work until landing.

**[Open the website](https://andyyan999.github.io/airplane-focus/)**

## AI collaboration

I chose the concept: an airplane-experience focus timer for the web. I then requested a realistic 3D world map and a bird’s-eye airplane view. Hermes Agent (OpenAI gpt-6.1-sol) designed and implemented the website, wrote documentation, and ran verification. I approved publishing it. This is AI-assisted work; I do not claim to have written the implementation by hand.

## Use

Open `index.html` in a modern browser, or use the website. No installation or internet connection is required for the downloaded HTML: the renderer and all textures are embedded, not fetched from a CDN.

1. Choose two different airports and enter the task you want to focus on.
2. Pick 1–240 minutes, or a 25/50/90 minute preset, then board.
3. Switch between **Bird’s-eye** and **Earth view**. Drag to orbit, scroll/pinch to zoom, and use the recenter button to restore the view.
4. Switch daylight/night, enable optional synthesized cabin sound, or enter browser fullscreen.
5. Pause/resume without losing time, or end early and return to the gate.

**F** toggles quiet view. **Escape** exits it. **Space** pauses/resumes when not typing or interacting with a button/dialog. Completed flights are logged locally, up to 100 entries.

## What is real and what is illustrated

The Earth uses imported geographic textures (land/ocean color, terrain normals, ocean specularity, and a separate cloud layer), not invented continent shapes. Airport coordinates are geographic coordinates. Flights follow the shortest great-circle path, and aircraft position comes from actual focus-session progress.

The jet is an original procedural 3D mesh, not a real aircraft model. Its size and separation from the Earth are exaggerated so it stays visible at planetary scale. The displayed climb/cruise/descent altitude is an illustrative 0–11 km profile, not live flight data. Focus durations are not real airline durations. Lighting and cloud animation are illustrative, not live weather or astronomical simulation. Imported global textures have finite resolution and do not provide street-level terrain.

A WebGL-capable browser is required for the 3D experience. If WebGL is unavailable, the original window illustration and timer remain available. Browser audio requires a click. Screen wake lock and browser fullscreen depend on browser policy.

## Timing and privacy

The timer uses an absolute timestamp rather than decrementing once per interval, avoiding accumulated background-tab drift. Refresh restores running or paused sessions. A session that expired while the browser was closed completes when reopened. Changing the system clock changes the countdown.

Session state, selected theme, volume, and flight log are stored in browser `localStorage`. No account, analytics, backend, or network calls are needed during use. Private mode or blocked storage may prevent persistence. Local-file and website storage are separate.

## Development

The deliverable is one generated `index.html`. Edit the smaller sources, not the generated output:

- `src/template.html`: timer and layout markup
- `src/immersive.css`: full-screen flight-deck layout
- `src/flight-math.js`: real airport coordinates, spherical routes, progress and illustrative altitude
- `src/world.js`: Three.js Earth, aircraft, camera, and interaction renderer
- `assets/`: local Earth/cloud textures and download provenance
- `vendor/`: pinned Three.js renderer and MIT license

Rebuild with `python3 tools/build.py`. Run tests with `node --test tests/*.cjs`. There is no npm install, runtime CDN, or build prerequisite for using the finished HTML.

## Verification

The route tests cover endpoints, live/paused progress, distance, climb/descent, all selectable route vectors, and the polar Shenzhen–New York midpoint. Original timer browser verification covered pause/resume, refresh persistence, completion without duplicate logs, early-ending/rebooking, mobile controls, cabin audio via a trusted click, and keyboard guards.

The 3D upgrade passed six automated route tests and real WebGL browser checks: 4096px Earth and 2048px cloud textures loaded, all ten active shader programs were runnable, and hiding the aircraft changed 12,590 pixels in a paused frame. A 50%-complete flight showed 12:30, 11.0 km simulated altitude, and 1,445 km remaining on SZX–HND. Landing synchronized `00:00` with Tokyo coordinates, zero remaining distance, and zero altitude. Pausing froze both the aircraft and cloud rotation. Orbit, drag threshold, zoom, recenter, day/night switching, Sydney–London globe framing, and a 390px-wide mobile canvas were exercised, with no JavaScript errors in the final session.

## Third-party credits

- **Three.js r160.1**: MIT license, reproduced in `vendor/THREE-LICENSE.txt`.
- **Earth color texture (4096×2048) and cloud texture (2048×1024)**: Tom Patterson / Natural Earth III, retrieved from Bjørn Sandvik’s `webgl-earth` example. Source explanation: [Creating a WebGL Earth with three.js](https://blog.mastermaps.com/2013/09/creating-webgl-earth-with-threejs.html); [Natural Earth III](https://www.shadedrelief.com/natural3/).
- **Earth normal and ocean specular maps**: Three.js r160 example planet textures. Exact download locations for every asset are recorded in `assets/sources.json`.
- Original Airspace UI, CSS window illustration, procedural airplane geometry, and synthesized cabin audio were implemented for this project.

These credits do not imply endorsement or affiliation.
