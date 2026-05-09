# Speed Sketcher

Speed Sketcher is a small browser-only practice tool for gesture drawing and timed reference study.

It lets a user select a local folder of images, choose how many references to use, choose a per-image duration, and run a sketching session where images rotate automatically or manually. Nothing is uploaded to a server. Images are processed locally in the browser, and lifetime stats are stored in browser `localStorage`.

## What It Does

- Loads image files from a local folder using the browser file picker.
- Builds a session from a seeded shuffle, so the same seed reproduces the same image order.
- Supports timed sessions such as `30s`, `60s`, `90s`, and `120s` per image.
- Supports an `Unlimited` mode where the user advances manually.
- Allows skipping to the next image with `Right Arrow` or `Space`.
- Uses a hidden 1 second debounce on skip input to avoid accidental double-advances.
- Tracks lifetime stats across sessions:
  - total sessions
  - total images shown
  - total real elapsed time
  - last used seed
- Shows a results screen with the session gallery and session stats.
- Supports previewing the current seeded image set from the home screen with `T`.

## How To Use

1. Open `index.html` in a browser.
2. Click `Select Image Folder` and choose a folder containing image files.
3. Pick:
   - images per session
   - seconds per image, or `Unlimited`
   - random seed or user-provided seed
   - optional UI toggles for progress bar, numeric timer, and sound
4. Click `START SESSION`.
5. During a session:
   - timed mode advances automatically when the timer reaches zero
   - unlimited mode advances manually
   - `Right Arrow` or `Space` skips to the next image in any session mode
6. Review the gallery and stats on the results screen.

## Controls

- `T`: Preview the images for the current folder, image count, and seed
- `Right Arrow`: Skip to next image during an active session
- `Space`: Skip to next image during an active session

## Persistence

The app stores lifetime stats in browser `localStorage` under:

```text
sketchStats
```

Stored fields:

- `sessions`
- `images`
- `time`
- `lastSeed`

This is local to the browser profile on the current machine.

## Project Structure

This is a minimal static web app with no build step and no backend.

```text
speed-sketcher/
|- index.html   # app structure and all views
|- style.css    # layout, colors, responsive styles
|- script.js    # all session logic, seed logic, keyboard controls, stats
|- ping.wav     # optional sound played on timed image change
```

## App Structure

`index.html` contains four main views:

- `view-index`: home/configuration screen
- `view-countdown`: 3-second pre-session countdown
- `view-timer`: active drawing session
- `view-results`: session summary and gallery
- `view-preview`: preview of the current seeded selection

`style.css` handles:

- overall app layout
- configuration panel styling
- timer footer UI
- gallery layouts
- mobile adjustments

`script.js` handles:

- folder loading and image filtering
- deterministic seeded shuffling
- session creation
- countdown and timed rotation
- unlimited/manual progression
- keyboard shortcuts
- session timing and elapsed-time tracking
- results rendering
- lifetime stat persistence

## Important Implementation Notes

- The app uses the browser `File` API and `webkitdirectory` folder selection.
- Session images are selected deterministically by sorting image metadata and then applying a seeded shuffle.
- Session time recorded in stats is real wall-clock elapsed time, not theoretical total duration. This matters when images are skipped early.
- Skip input is debounced for 1 second after each image load.
- Images are shown via `URL.createObjectURL(file)`.
- Lifetime stats are stored locally; there is no remote storage layer.

## Behavior Summary For LLMs / Contributors

If you need the high-level model of the app quickly:

- This is a single-page static app.
- There is no framework, bundler, backend, or module system.
- All behavior lives in `script.js`.
- State is kept in top-level variables, not in classes or stores.
- Views are switched by adding/removing the `active` class.
- The session pipeline is:
  - select folder
  - choose options
  - derive seed
  - pick seeded image subset
  - countdown
  - run session
  - collect real elapsed time
  - render results
  - persist updated lifetime stats
- The main behavior pivots around:
  - `startTimerSession()`
  - `loadNextImage()`
  - `runTimer()`
  - `advanceToNextImage()`
  - `endSession()`

## Development Notes

- Open `index.html` directly in a browser for local use.
- There are currently no automated tests.
- Because the app is framework-free and file-based, most changes involve editing `index.html`, `style.css`, and `script.js` together.
- If you add features that create object URLs heavily, consider revoking old object URLs to reduce memory usage.

## Limitations

- Folder selection behavior depends on browser support for directory picking.
- Lifetime stats are browser-local and can be cleared by clearing site data.
- There is no export/import for stats or seeds beyond manual copy/paste.
- The project currently uses a single script file, so behavior is simple but not strongly modularized.
