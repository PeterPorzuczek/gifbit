<div align="center">

<img src="src/assets/favicon.svg" width="104" alt="">

# GIFbit

**Animations that land on the beat.**<br>
Pick your GIFs, play some music, and turn your screen into a beat-driven show.

![HTML · CSS · JavaScript](https://img.shields.io/badge/HTML%20%C2%B7%20CSS%20%C2%B7%20JavaScript-342c41)
![Static app](https://img.shields.io/badge/deploy-static-ff6b3d)
![Runs in your browser](https://img.shields.io/badge/runs-in%20your%20browser-342c41)
[![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-342c41)](#github-pages)

**[Try GIFbit](https://peterporzuczek.github.io/gifbit/)** ·
**[Contribute](#contributing-gif-banks)** ·
**[Quick start](#quick-start)** ·
**[Features](#features)** ·
**[Scene layout](#scene-layout)** ·
**[GIF banks](#gif-banks)** ·
**[Single HTML](#single-html-file)** ·
**[GitHub Pages](#github-pages)** ·
**[Documentation](#project-structure)**

<br>

<a href="https://i.imgur.com/OJO2YLg.png"><img src=".github/readme/stage.svg" width="900" alt="GIFbit: an animation collage, the color panel on the right, and the beat meter in the lower-left corner."></a>

</div>

## Why GIFbit

GIFbit is inspired by [See Hear Party (2014)](https://experiments.withgoogle.com/see-hear-party), Peter Javidpour's GIF-based music visualizer.

A simple music visualizer: the microphone detects beats and GIPHY animations appear on screen. You can also control the show manually, without a microphone. The app runs in your browser with no backend or framework. A small build step prepares a static `dist/` directory for publishing; you can run the source directly without building it.

<p align="center">
<a href="https://youtube.com/shorts/NRQtr-YvMIM"><img src="https://i.ytimg.com/vi/NRQtr-YvMIM/maxresdefault.jpg" width="640" alt="Watch GIFbit in action on YouTube Shorts."></a>
<br><a href="https://youtube.com/shorts/NRQtr-YvMIM"><b>▶ Watch GIFbit in action on YouTube Shorts</b></a>
</p>

## Contributing GIF banks

Share a curated bank through a pull request to **[gif-banks/](gif-banks/)**. You do not need to change the application code or maintain an index.

<p align="center">
<a href="https://i.imgur.com/HfZ1X0z.jpeg"><img src=".github/readme/banks.svg" width="900" alt="The GIF banks panel with the hh3 bank open, animation previews, selection controls, and the Import 255 animations button."></a>
<br><sub><b>Bank preview</b> — open a community bank, preview its animations, and import your selection.</sub>
</p>

### Bank requirements

- Use JSON exported by GIFbit, with `gifbit: 1` and a nonempty list of animations. Each animation must have a unique ID within its set and a valid HTTPS image URL. Submit the JSON links, not the GIF image files.
- Give the bank a descriptive **Name** (up to 60 characters) and, when useful, a **Description** (up to 1000 characters) explaining its theme. Older banks without these fields remain supported: the app uses the filename and an empty description.
- Keep the filename format **`YYYY-MM-DD-bank-name.json`**, for example `2026-11-12-neon-city.json`. Use the export date in UTC, lowercase ASCII letters, digits, and hyphens. The date must be valid.
- **`gif-banks/sample.json`** is reserved for the app's starter bank and is the only exception to the dated filename rule. It must pass the same metadata and animation checks as other banks.
- Add a new file for a new bank. If that filename already exists, choose another name; only replace an existing file when your PR intentionally updates that bank.
- Preview the animations before submitting. Keep a bank-only PR limited to JSON files in `gif-banks/`; generated builds and dependencies do not belong in the PR.

### Submit a bank

1. In the [app](https://peterporzuczek.github.io/gifbit/), choose your animations in **Review animations** and use **Save as set**.
2. Open the saved set in Settings, click **Export**, fill in **Name** and **Description**, and download the JSON file.
3. Fork this repository, create a branch, and add the exported file to **`gif-banks/`**.
4. From the repository directory, validate the bank with Node.js 20 or newer; no package installation is needed:

   ```sh
   npm run check:banks
   ```

5. Commit the file and open a pull request against **`PeterPorzuczek/gifbit:main`**. Briefly describe the bank's theme and whether it adds a new bank or updates an existing one. The **Validate GIF banks** check must pass; fix any reported filename, metadata, or animation errors.

After the PR is merged, click **Refresh** in **Browse GIF banks** to see the bank. Its contents are downloaded when opened, and its name and description are then remembered in the list.

## From music to a show

After [starting the app](#quick-start), follow these four steps:

1. Open the app. The starter bank **`sample.json`** is added to **Your sets** and selected automatically, ready to use without a GIPHY key. The supplied bank is **my6**, with **330 animations**.
2. Choose **Review animations** to review and narrow down the set, or go straight to **Start without microphone**.
3. Press **Space** or click the stage to trigger a beat and display an animation.
4. Choose **Start** and allow microphone access to make the show react to music from your speakers. Microphone access requires HTTPS or localhost.

To try another collection, click **Browse GIF banks**, open a bank, and use **Import animations**. Import the whole bank or choose individual GIFs. You can also use **Saved set → Import from file**.

To leave part of the screen clear, open **Settings → Configure scene**, paint the cells to keep free of GIFs, and choose **Apply layout**. Painting or choosing a preset automatically enables the layout. Follow the [scene layout guide](#scene-layout) for separate wide and narrow masks, previews, and fit checks.

Each visit opens with the saved starter set selected. The app reuses one local copy without duplicating it or removing your other sets and settings. Deleting the starter set restores it from GitHub on the next visit. If GitHub is unavailable on the first visit, use **Retry starter set** or choose another source. If browser storage is unavailable, the downloaded starter still works for that visit.

## Features

<table>
<tr>
<td width="50%" valign="top">

### GIPHY animations

Search using up to **10 words or phrases**, separated by commas, semicolons, or line breaks. Duplicate phrases are ignored. Choose GIFs, stickers with transparent backgrounds, or both. The PG-13 content filter can be turned off.

Enter your own GIPHY key in Settings. Limits depend on your API plan; each search makes one request per phrase and animation type. Displaying loaded results does not make additional search requests.

### Your own sets

In **Review animations**, click or drag animations between **On screen** and **Put aside**. Filter by phrase, resize thumbnails, and move all visible items at once. **Shuffle** changes the list order, while **Add from set** merges another saved set or JSON file without duplicating animation IDs.

**Save as set** saves the active animations; using an existing name updates that set. Import multiple files, export one set or all sets, and delete sets with a second confirmation click. The `gifbit: 1` format supports a single set, an array, or an object containing a `sets` array.

The starter bank **gif-banks/sample.json** contains 330 animations and is selected automatically when the app opens. The separate **gif-banks/2026-11-05-hh3.json** bank retains the original 255 example animations, unchanged. Sets contain HTTPS image links, so playback requires an internet connection.

### Community banks

Browse banks published in the repository, search by name and description, and star your favorite **whole banks**. Opening a bank shows its description and animated thumbnails. Import the entire bank or selected GIFs into your saved sets.

Export opens a form with **Name** and **Description** fields. These details are saved in the JSON file, and the filename includes a date, such as `2026-11-12-neon-city.json`.

### Controls during a show

**Space or a click on the stage** triggers a manual beat, even without a microphone. Keyboard shortcuts open Settings, the color panel, the meter, and full screen, and let you tap the tempo or clear the stage.

Controls hide automatically. The app uses a screen wake lock when the browser supports it. Settings, saved sets, and excluded animations are stored locally for your next session.

</td>
<td width="50%" valign="top">

### Rhythm and microphone

Choose **Kick** (30–150 Hz), **Snare** (200–6000 Hz), or **Everything** (30–16000 Hz), sensitivity from 1–10, and an animation change every 1, 2, or 4 beats.

Without a BPM setting, the app reacts to detected hits. With an optional tempo of **50–220 BPM**, it aligns a beat grid and predicts repeating patterns while continuing to respond to new hits and transitions. Enter the tempo or use **Tap**: it is calculated after four taps, and a longer pause starts a new measurement.

Limit GIF changes to **1/32, 1/16, 1/8, or 1/4 notes**; faster hits still make the image bounce. **Calibrate** adjusts visual lead time from **0–250 ms**. The meter shows the signal level, detection threshold, and synchronization and prediction status.

Detection runs in an `AudioWorklet`, with a `ScriptProcessor` fallback. Audio is analyzed locally, without recording or uploading it. Leaving the page releases the microphone.

### A full-screen stage

Display a **collage of 1–12 animations** or one animation at a time across the screen. Choose random playback or **In order** to follow the list. Images are preloaded and decoded; slower downloads do not change the sequence in ordered playback.

Set a background color or use your own image, including a GIF, with **0–80%** dimming. Bounce strength from **0–10** controls how much the image reacts to beats. The system's reduced-motion preference disables bouncing.

### Live colors

The color panel stays available during a show: presets, hue, saturation, strength, brightness, contrast, and optional background tinting. Hiding the panel does not turn off the effect.

Cycle automatically through a selected palette every **0.5–30 seconds** or every **1, 2, 4, 8, or 16 beats**. Smoothness at **0%** produces a cut; **100%** produces a continuous transition. When BPM is set, colors follow the tempo and beat grid.

### Reserved screen areas

Reserve parts of the screen with painted masks, separate wide and narrow layouts, and live fit checks. Open **Configure scene** in Settings or **Scene** during playback. See the [scene layout guide](#scene-layout).

</td>
</tr>
</table>

<table>
<tr>
<td width="50%" align="center" valign="top">
<a href="https://i.imgur.com/xfoCQh5.png"><img src=".github/readme/curator.svg" width="420" alt="The animation picker with phrase filters and On screen and Put aside columns."></a>
<br><sub><b>Animation picker</b> — choose what appears on screen and save your own set.</sub>
</td>
<td width="50%" align="center" valign="top">
<a href="https://i.imgur.com/i9wk701.png"><img src=".github/readme/settings.svg" width="420" alt="GIFbit settings with the sample set of 255 animations loaded."></a>
<br><sub><b>Show settings</b> — animation sources, beat response, and stage appearance.</sub>
</td>
</tr>
<tr>
<td width="50%" align="center" valign="top">
<a href="https://i.imgur.com/OJO2YLg.png"><img src=".github/readme/stage.svg" width="420" alt="GIFbit: an animation collage, live color controls, and the beat meter."></a>
<br><sub><b>Live stage</b> — turn music into an animation collage and adjust colors during the show.</sub>
</td>
<td width="50%" align="center" valign="top">
<a href="https://i.imgur.com/HfZ1X0z.jpeg"><img src=".github/readme/banks.svg" width="420" alt="The GIF banks panel with the hh3 bank open, animation previews, and import controls."></a>
<br><sub><b>GIF banks</b> — browse community collections, preview animations, and import your selection.</sub>
</td>
</tr>
</table>

## Scene layout

Reserve parts of the screen for your background, artwork, or a clear center. For example, keep a triangle in the middle free of GIFs while animations appear around it:

1. Open **Settings → Configure scene**, or **Scene** during a show.
2. Choose **Wide** and the **Center triangle** preset. Painting or selecting a preset turns on **Use scene layout** automatically. The default **Toggle** tool blocks a free cell and unblocks a blocked cell. Drag from a blocked cell to unblock an area, or from a free cell to block one. Keyboard users can move with the arrow keys and toggle with Space or Enter. Choose **Block** or **Unblock** to keep the same action for every stroke.
3. Check **Narrow**, or use **Copy to narrow layout** as a starting point. Choose **Current window** to preview the profile that will actually play at your current window size.
4. Use **Shuffle preview** and **Test beat**, check the fit messages, and select **Apply layout**. Cancel or Escape discards the draft.

The editor includes Undo, Invert, Unblock all, Block all, and presets for an open center, center triangle, side strips, and frame. Undo restores a whole drag in one step. Toggle **Show grid** to inspect the preview without the editing overlay. The grid only appears in the editor; blocked areas leave the background visible during playback.

Wide and narrow screens have separate masks. **Current window** follows the active profile at the real viewport ratio, including when the window changes orientation.

| Profile | Reference preview | Standard grid | Fine grid | Used when |
| --- | --- | --- | --- | --- |
| Wide | 16:9 | 16 × 9 | 32 × 18 | Width is greater than or equal to height |
| Narrow | 9:16 | 9 × 16 | 18 × 32 | Height is greater than width |

Masks stretch with the viewport, so reference squares can become rectangles. Changing grid resolution or copying profiles preserves blocked areas conservatively and can enlarge their boundaries.

**Edge overlap** allows the bounding box to cross blocked edges by **0–50% of the shorter cell edge**. It starts at 25%; set it to zero for strict avoidance. **Minimum GIF height** limits shrinking to **6–35% of the shorter screen edge**, starting at 12%. Placement checks include rotation and maximum beat bounce; transparent pixels are treated as part of the image rectangle, and shadows are excluded. The preview uses your selected animations and marks possible centers for its selected example. Example shapes are used before a set is available, with size validation explicitly marked as incomplete.

Both reference layouts and the current viewport are checked before applying an enabled layout. If any selected animation cannot fit, lower the minimum height or unblock cells; animations are never silently skipped. Fit checks update while painting and adjusting sliders. **Apply layout** becomes available again as soon as all checks pass. If another profile or the current window still prevents applying, the message next to the button identifies it and explains what needs fixing. An incompatible saved layout prevents starting. If resizing or changing settings makes a running layout impossible, animations pause and a persistent message offers **Edit scene layout**. Restoring a valid configuration resumes placement on subsequent beats. Existing animations are repositioned after layout or viewport changes. In **One at a time**, a single large animation fits into an allowed region. GIFs may still overlap each other.

Layout is off until configured. Editing or copying a mask enables the draft; **Apply layout** activates it on the stage, including repositioning animations already playing. Cancel or Escape keeps playback unchanged. If a mask was saved while disabled, reopen the panel and use **Enable and apply layout** without redrawing it. To deliberately disable a mask, uncheck **Use scene layout** and select **Save with layout off**. Both masks are preserved.

Scene layouts are stored with your local settings, independently of GIF banks. Bank JSON imports and exports do not include scene masks. No server or extra build step is needed.

## Quick start

Use the [hosted app](https://peterporzuczek.github.io/gifbit/) directly in your browser, with no installation.

To run it locally, install Node.js 20 or newer. From the project directory, run:

```sh
npm ci
npm start
```

Open [localhost:4173/gifbit/](http://127.0.0.1:4173/gifbit/). `npm start` builds the app into `dist/` and starts a local preview. After installing dependencies once, you only need `npm start`.

For development, preview the source without building or installing dependencies:

```sh
npm run dev
```

The address stays the same. Refresh the page after editing files. The source uses native JavaScript modules and requires HTTP or HTTPS.

Run `npm run build` to prepare the publishing directory, or `npm run preview` to serve an existing build. `dist/` contains only HTML, CSS, the icon, and two JavaScript files. Styles and the icon go into `dist/assets/`, while the audio processor goes into `dist/audio/`. You can publish the entire `dist/` directory on any static host.

## GIF banks

The panel reads from **`gif-banks/` on the `main` branch of `PeterPorzuczek/gifbit`**. The app lists files through the GitHub Trees API and fetches a selected bank through the GitHub Blobs API using its SHA. Browsing downloads a bank only when you click it. The starter bank is the exception: when its saved set is missing, the app fetches **`sample.json`** automatically through the GitHub Contents API. This works the same way in the source preview, production build, and single HTML export. There is no local bank index or copy of bank JSON files in `dist/`. API documentation: [repository trees](https://docs.github.com/en/rest/git/trees#get-a-tree), [blobs](https://docs.github.com/en/rest/git/blobs#get-a-blob), [repository contents](https://docs.github.com/en/rest/repos/contents#get-repository-content).

The saved starter copy is reused on later visits, so startup needs no further GitHub request. Your edits to that copy are preserved. To load the latest published `sample.json`, delete its saved set and reload the app. A source or set chosen while the initial download is in progress takes priority over automatic selection.

The API file listing does not include metadata stored inside the files. An unopened bank therefore initially shows its filename without `.json` and an empty description. Once opened, the app uses its `name` and `description` fields when available and remembers them for your next visit. A changed file SHA invalidates the cached metadata. Missing or empty fields fall back to the filename and an empty description.

A star marks an entire bank as a favorite, and **Favorites only** filters the list. Search matches filenames as well as names and descriptions that have already been loaded. **Refresh** fetches the current list. After opening a bank, use **Select all** and **Clear selection** to choose animations to import. Import creates a saved set that you can then edit in **Review animations**.

The panel uses the public API without a token. Connection failures, GitHub rate limits, invalid JSON, and empty repositories produce a message and allow you to retry. New local files appear in the panel only after they are published on `main`. Before publishing, you can check them with **Import from file**.

To add or update a bank, follow the [contribution guide](#contributing-gif-banks) near the top of this README.

Banks use the app's export format: `gifbit: 1`, `name`, `description`, `created`, `updated`, `words`, and `items`. Older files without `description` still work. Exporting all sets produces a `sets` array; the panel treats that file as one bank and combines its animations without duplicates. Importing the file manually preserves the separate sets.

## Single HTML file

The optional export packages the app into a single file. Install development tools once, then run:

```sh
npm ci
npm run build:single
```

This creates **`dist/gifbit.html`** alongside the regular build. You can copy that file to another computer and open it in a browser. It includes the interface, styles, icon, application code, and audio processor. Manual playback and set management do not require neighboring files or a local server.

Browsing banks through the GitHub API, downloading animations, and searching require an internet connection. You can still import your own sets from JSON files. Microphone access depends on browser permissions and support for local files; if access is denied, serve the same HTML over HTTPS or localhost.

Fonts load from Google Fonts when online, including in the single HTML export. System fonts keep the interface usable if they cannot be downloaded.

The build uses esbuild and needs no network access after dependencies are installed. Every build recreates `dist/` from scratch; Git ignores the entire directory. Run `npm run build:single` again after changing the source to update the export.

## Keyboard shortcuts

| Key | Action during a show |
| --- | --- |
| Space / stage click | Trigger a manual beat |
| T | Tap the tempo |
| K | Show or hide the color panel |
| C | Clear the stage |
| H | Show or hide the meter |
| F | Toggle full screen |
| S | Open Settings |
| Esc | Open Settings or return to the show; close the picker, banks, export, or calibration |
| ← / → during calibration | Adjust visual lead time by 5 ms |

## GitHub Pages

The [pages.yml](.github/workflows/pages.yml) workflow installs dependencies, runs unit tests, builds the app, and publishes only `dist/`. All paths are relative and work under `/gifbit/`.

To configure publishing after pushing the code:

1. Open **PeterPorzuczek/gifbit** → **Settings** → **Pages**.
2. Under **Build and deployment** → **Source**, select **GitHub Actions**.
3. Open **Actions** → **Deploy to GitHub Pages** → **Run workflow**, select **main**, and start the workflow.
4. Once deployment finishes, the app is available at [peterporzuczek.github.io/gifbit/](https://peterporzuczek.github.io/gifbit/).

Subsequent updates to `main` publish changes automatically. Generated files do not need to be committed. See the [official GitHub Pages guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) for details.

## Project structure

Application code in **`src/`** is organized by feature. Only `index.html` and `app.js` remain at its root. Banks live separately in **`gif-banks/`**, tools in **`scripts/`**, and tests in **`tests/`**. **`dist/`** is generated automatically.

| Path | Responsibility |
| --- | --- |
| `src/index.html` | Interface and HTML entry point |
| `src/app.js` | Module creation and initialization order |
| `src/audio/` | Microphone (`microphone.js`), hit detection (`detector.js`, `worklet.js`), beat prediction (`groove.js`), tempo and beat events (`rhythm.js`), calibration (`calibration.js`) |
| `src/library/` | Loading animations from GIPHY or sets (`catalog.js`), review and selection (`curator.js`), set management (`sets.js`), import/export validation and format (`format.js`) |
| `src/banks/` | GitHub API (`api.js`), bank parsing (`format.js`), default starter set and loading recovery (`starter.js`), browsing panel, favorites, and import (`panel.js`) |
| `src/stage/` | Animation playback and layout (`playback.js`), colors (`colors.js`), shortcuts and buttons (`controls.js`), full screen and wake lock (`browser.js`), starting a show and returning to Settings (`session.js`) |
| `src/scene/` | Mask validation and placement geometry (`geometry.js`), viewport changes and playback validation (`layout.js`), scene editor and preview (`panel.js`) |
| `src/settings/` | Settings form (`form.js`), defaults and validation (`schema.js`) |
| `src/core/` | Shared state and settings persistence (`state.js`), interface element access (`dom.js`), resource loading (`resources.js`) |
| `src/assets/` | `style.css` and `favicon.svg`; no local font files |
| `gif-banks/` | JSON banks contributed through PRs; reserved `sample.json` starts the app with 330 animations, and `2026-11-05-hh3.json` contains the original 255 examples |
| `scripts/serve.mjs` | Dependency-free source or `dist/` preview |
| `scripts/build.mjs` | Build into `dist/` and optional single HTML export |
| `scripts/check-banks.mjs` | Bank filename and format validation |
| `tests/` | Audio engine, data, export, and browser behavior tests |
| `.github/workflows/pages.yml` | Automatic build and deployment to GitHub Pages |
| `.github/workflows/banks.yml` | Bank validation in PRs |
| `dist/` | Ready-to-publish app; generated files ignored by Git |

Modules use native ES imports. Add new features to the relevant directory and initialize them in `src/app.js`. Code shared across features belongs in `core/`.

Banks are fetched exclusively through the GitHub API; the local server does not serve `gif-banks/`, and the build does not copy it. README previews in `.github/readme/` have matching aspect ratios and rounded SVG frames. Clicking a preview opens the original on Imgur. The project does not store font files.

## Testing

Install development dependencies, run the data, audio, and export tests, then run the browser tests:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

On Windows, you can use an existing Edge installation without downloading Chromium:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:browser
```

Browser tests first build the app, then check it under the `/gifbit/` prefix in three forms: directly from source, as the production `dist/`, and as a single HTML file. A separate test copies only the generated HTML into an empty directory and checks bank import, playback, and the audio processor through `file://`. Bank tests use controlled GitHub API responses to check downloads on demand, metadata, favorites, selective GIF import, dated exports, changed files, delayed responses, and API errors. Other tests cover selection and dragging, saving and deleting sets, image order, rendering, colors, shortcuts, mobile layout, malformed data, GIPHY requests, microphone denial, `AudioWorklet`, the fallback detector, and stream cleanup. Test audio comes from a synthetic device; calibrate a real microphone and display on the target hardware.

Scene tests cover toggling and unblocking cells, consistent drag strokes, undo, profile copying, responsive previews, persistence, and invalid-layout recovery while editing. Geometry tests check placement against blocked cells at maximum bounce across viewport sizes and animation aspect ratios. Browser checks also exercise single-animation mode, reduced motion, and resizing a running scene into an incompatible layout and back.

## Data and assets

Settings, both scene masks, the API key, saved sets, and excluded animations are stored in this browser's `localStorage` (`gifbit.v1`, `gifbit.sets`, `gifbit.excluded`). Favorite banks use `gifbit.banks.favorites`, and cached names and descriptions use `gifbit.banks.metadata`. Older set formats remain compatible. The GIPHY key is not encrypted. A different app address, browser, or cleared site data means a separate storage area; export your sets to JSON beforehand if you want to keep them. Exported sets preserve animation collections, not scene masks or other app settings.

Animations are fetched directly from GIPHY and belong to their creators. Availability depends on the original image links. The interface loads Bricolage Grotesque, Figtree, and JetBrains Mono from Google Fonts, with system fallbacks while loading or offline. Font files are not stored in the repository or build output. Original screenshots are hosted on Imgur; the SVG frames are used only for README presentation.
