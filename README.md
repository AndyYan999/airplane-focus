# Airspace

A self-contained, airplane-themed focus timer. Board a flight, settle into a window seat, and work until landing.

## AI collaboration

I chose the concept: an airplane-experience focus timer for the web. Hermes Agent (OpenAI gpt-6.1-sol) designed and implemented the website, wrote the documentation, and ran browser verification. I approved publishing it. This is AI-assisted work; I do not claim to have written the implementation by hand.

## Use

Open `index.html` in a modern browser. No installation, external assets, CDN, or internet connection is required. The GitHub Pages website serves the same file.

- Choose two different airports, enter a task, and choose 1–240 minutes (25/50/90 minute presets).
- Board to start. The flight progresses through takeoff, cruise, and landing based on elapsed focus time.
- Pause/resume without losing time, or end early and return to the gate.
- Golden-hour and night window views. Clouds move during a running session.
- Optional synthesized cabin audio and volume control; enable audio with a click. A landing chime is played when the audio context is enabled.
- Quiet view with the expand button or **F**. **Escape** exits quiet view.
- **Space** pauses/resumes when not typing or interacting with a button or dialog.
- Completed flights are recorded locally, up to the latest 100 entries.

## Timing and storage

The timer uses an absolute timestamp rather than subtracting one second per interval, so background tabs do not accumulate countdown drift. A refresh restores running or paused sessions. If the browser was closed when a flight expired, it records completion on reopening. Changing the system clock changes the countdown. Screen wake lock is attempted when supported, but is not required.

The flight log, selected theme, volume, and session state are stored in browser `localStorage`; there is no account, analytics, backend, or network request. Private mode or blocked storage may prevent persistence. Local-file and website storage are separate. Flight durations are focus durations, not actual airline travel times.

## Verification

Browser-tested at desktop width and 390px mobile width:

- 50-minute boarding, countdown, pause, resume, early ending, and rebooking.
- Paused session survives refresh with the exact remaining time.
- Landing tested with an accelerated wall clock: `00:00`, one log entry, no duplicate entries on repeated ticks.
- Same-airport routes are rejected.
- Mobile document width matches viewport width (390px), with visible buttons at least 44px high.
- Theme switching and quiet-view state transitions.

All visuals are original CSS illustrations. Cabin audio is synthesized through the Web Audio API. Browser audio requires user activation; screen wake lock and sound availability depend on browser policy.
