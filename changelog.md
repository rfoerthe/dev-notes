# Changelog

## [1.4.2] - 2026-08-18

### Fixed

- The first page load no longer waits for the app bundle before it starts loading reCAPTCHA. App Check is enforced for Firestore, so nothing can be read before a token has been exchanged, and Firebase Auth waits for the same token — but the App Check SDK only injects the reCAPTCHA Enterprise loader once the bundle has been downloaded and executed. On a throttled connection that put the whole chain (loader → 340 KB release script → widget iframe → token exchange) strictly behind the bundle and the first Firestore request only left the browser after about 11 seconds; the LCP was 14 seconds. The build now injects the loader as a `defer` script at the top of `index.html`, together with preconnects to `www.google.com` and `www.gstatic.com`, so it downloads in parallel with the bundle and is guaranteed to have run before the module entry. The SDK sees `grecaptcha.enterprise` and reuses it instead of loading a second copy. The tags are only emitted when a site key is configured and the emulator is off (`recaptchaBootstrap` in `vite.config.ts`).
- On app start the auth bootstrap only refreshes the auth user and forces a new ID token when the stored profile is not flagged `emailVerified` yet — that refresh exists so the `emailVerified` write carries the fresh `email_verified` claim the Firestore rules require. Every already-verified user used to pay both round trips (`accounts:lookup`, `securetoken`) sequentially on every start, before the profile read, before anything else could load.
- The README documents why App Check sits on the critical path and that the App Check token TTL in the Firebase Console (default 1 hour) decides how often visitors go through the full reCAPTCHA round trip; 7 days is the recommended setting.

## [1.4.1] - 2026-08-18

### Fixed

- The automatic table of contents no longer lists LaTeX fragments as headings. Heading extraction skipped fenced code blocks but not display math, and a matrix product written as `\end{pmatrix}` / `=` / `\begin{pmatrix}` on consecutive lines gave the `=` line the shape of a setext underline — so the `\end{pmatrix}` above it became an `<h1>` in the table of contents. `src/components/markdownHeadings.ts` now tracks `$$` blocks the way `src/components/markdownMath.ts` does, including the lenient `$$…$$` and `$$…` forms, and ignores every line inside one. Inline `$…$` is untouched, because it cannot span lines.

## [1.4.0] - 2026-08-17

### Added

- Math formulas in Markdown. `remark-math` recognises `$…$` for inline math and `$$…$$` for display math, and `rehype-katex` renders both to KaTeX markup at parse time, so no client-side typesetting runs after the article has loaded. This applies to article bodies as well as to the inline Markdown used for titles and teasers. Invalid LaTeX is shown as its source text instead of breaking the page.
- Display math accepts the notation GitHub, Obsidian and Pandoc use, not only the strict one. `remark-math` only recognises a display block when the opening and closing `$$` each stand alone on a line: `$$E = mc^2$$` on one line renders *inline*, and `$$\frac{a}{b}` followed by more lines and a trailing `…$$` swallows the rest of the document, because the remainder of the opening line is fence meta and no bare `$$` line ever closes the block. `src/components/markdownMath.ts` rewrites both shapes into fenced form before parsing, skipping fenced code blocks and carrying blockquote and list prefixes onto every emitted line. Heading ids are keyed by line number, so they are derived from the normalised text as well.
- Sanitising still runs before KaTeX. The default `rehype-sanitize` schema only lets `language-*` classes through on `<code>`, which would have stripped the `math-inline`/`math-display` markers `remark-math` relies on, so the schema is extended for exactly those three classes. Running the sanitiser *after* KaTeX is not an option: its output depends on class and style attributes and on inline MathML that the schema would remove.
- KaTeX is now imported eagerly and gets its own `vendor-katex` chunk. It was already part of the bundle as a Mermaid dependency behind Mermaid's async boundary; the top-level `katex` version is pinned to the `0.16` line that `rehype-katex` and Mermaid both depend on, so there is a single copy and the shipped stylesheet matches the renderer that produced the markup.

## [1.3.1] - 2026-08-16

### Fixed

- Mermaid diagrams no longer paint text in colours the theme never reaches. The base theme derives a whole group of colours from the `darkMode` *theme variable*, which mermaid does not fill in from `darkMode` in the config, so in dark mode it silently took the light branch: ER attribute rows came out near white under the light attribute text, and gantt bars and section bands kept their light defaults under light task labels. `src/components/mermaidTheme.ts` now sets `rowOdd`/`rowEven` and the complete gantt palette explicitly per colour mode. Every gantt bar is dark in dark mode and light in light mode, because `taskTextDarkColor` colours both the label inside a bar and the label next to one, so a mixed palette cannot be readable in both places.
- The packet diagram was invisible in dark mode. Its renderer defaults the bit numbers, the block labels and the title to black and paints the numbers and the title straight onto the diagram surface; the diagram now brings its own `packet` theme variables. The sequence number in a sequence diagram sits on a circle filled with `signalColor` and got its ink from `invert(lineColor)`, which is unrelated to that circle — `sequenceNumberColor` is now set explicitly. Quadrant data point labels are centred on their own point, so `quadrantPointFill` is picked to work with the label ink.
- C4 diagrams label every shape white, which is unreadable on the lighter shades of the C4 palette — the grey of external systems and the blue of containers and components. The shape group is now part of the existing contrast pass in `applyMermaidLabelContrast`, so each label gets whichever ink reads better on its own shape. C4's palette itself is unchanged; its colours carry meaning in the notation.
- Boundary labels, boundary borders and relation labels are hard-coded to `#444444` in mermaid's C4 renderer, which no theme variable reaches. They are written as presentation attributes, so `withMermaidStyleOverrides` appends a stylesheet to the rendered diagram that wins over them. Every rule is scoped with the diagram id, because an SVG `<style>` is not scoped to its fragment and would otherwise leak into the other diagrams on the page. The overrides are applied at render time and are therefore part of the downloaded SVG as well.
- C4 relation labels and quadrant data point labels are positioned without regard for what is underneath them — a relation label follows its arrow across other shapes, and the colour of a data point is the diagram author's choice. Both are drawn on top of a halo in the surrounding background colour, so they stay readable on whatever they overlap.
- `gitGraph` drew every commit and every arrow in plain black in dark mode — the same `darkMode` theme variable again, which decides whether the branch colours are lightened or darkened. `git0`–`git7` are now an explicit eight-hue palette per colour mode. `gitBranchLabel0`–`gitBranchLabel7` colour the branch name on a background of its branch colour, so each one is derived from its own colour through `getReadableMermaidInk` rather than being a single fixed ink; a palette spanning all hues cannot be served by one. `gitInv0`–`gitInv7` is the ring of a highlighted commit, drawn around a disc in `primaryColor`, and is set to the ink colour so it reads on the surface.
- Sankey flows disappeared in dark mode. Mermaid draws them with `mix-blend-mode: multiply` so that crossing flows darken each other; multiplied against the near black diagram surface every flow became black and only the node bars were left. Dark mode uses `screen` instead — the same idea the other way round. Because that brightens the flows the node labels sit on, those labels get a halo too.

Both of these are shape and line colours rather than text colours, which is why the contrast audit over the article's 758 text runs had not caught them.

### Added

- `npm run audit:mermaid` renders one diagram of every supported Mermaid type in both colour modes and measures what a reader actually sees: every painted shape and line against the backdrop it sits on, and every label against its own backdrop. Contrast can only be measured where there is a layout engine, so the audit runs in the headless Chrome that `scripts/generate-pwa-icons.mjs` already relies on, with Vite serving the page so it imports the very same `src/components/mermaidTheme.ts` as the app. `--strict` adds the full WCAG 1.4.11 list, `--json` the raw data.
- The blocking rule is deliberately not an absolute ratio. A shape fails when it drops below the visibility floor of 1.5:1 in one colour mode while staying above it in the other. Mermaid paints a lot that is faint on purpose — diagram background rects, row fills that match their box, the hairline polygons roughjs draws for dividers — and an absolute 3:1 reports 300 of those, which would bury the real findings. Only the asymmetry between the two modes is a theme bug.
- Findings that already existed are recorded in `scripts/mermaid-contrast-audit/known-findings.json` so the audit fails on anything new. They are all the same thing: the shared `cScale` section palette is weaker in light mode than in dark. Removing them needs a decision about that palette rather than a bug fix.

### Fixed

- Pie charts were unreadable in dark mode, xy charts in light mode, both found by the new audit. The pie derives its slices from `primaryColor`, a dark navy here, so every slice sat at about 1.1:1 on the dark surface; the xy chart ships a fixed list of pastels that vanish on a light one. Both now use an explicit twelve-hue palette per colour mode. Mermaid offers a single colour for all pie slice labels, so the palette's lightness is chosen such that one ink clears 4.5:1 on every hue in it, and `pieOpacity` is pinned to 1 because the default of 0.7 drags every slice towards the surface and makes that unpredictable.
- The radar graticule defaulted to a fixed light grey that disappeared on a light surface.
- Nested theme objects such as `xyChart` and `radar` *replace* the derived defaults instead of merging into them, because mermaid re-applies an overridden variable after deriving the rest. Setting only `plotColorPalette` therefore left `backgroundColor` undefined and turned the plot area white. Both objects are now supplied in full.
- `cScalePeer` is pinned alongside `cScale`. Kanban and treemap paint their sections with the peer colours, and the derived offset pushes the brighter hues out of the range where a label can still be read on them. The pinned values match what was previously derived, so nothing changes visually.

Not covered by this: headless Chrome reports `mix-blend-mode: normal` for SVG geometry that the diagram's stylesheet sets to `multiply`, and the declaration is not reachable through the CSSOM of the SVG's own `<style>` either. A sankey flow is therefore measured as its own colour instead of the near black `multiply` turns it into on a dark surface, so a regression of that one kind would slip past the audit. The same reading works in a headed browser.

## [1.3.0] - 2026-08-16

### Added

- DevNotes can be installed as a Progressive Web App. `vite-plugin-pwa` generates `manifest.webmanifest` and a Workbox service worker during the build; `index.html` gained the `apple-touch-icon` and `apple-mobile-web-app-*` tags iOS needs, because Safari ignores the manifest's icons and display mode. Installed, the app starts standalone under its own icon, with the jump list entries "Neuen Beitrag schreiben", "Meine Beiträge" and "Lesezeichen".
- An installed app window is titled `<manifest name> - <document.title>`, which would print the brand twice. The manifest is therefore named just "DevNotes" and carries the tagline in `description`, and `src/services/appTitle.ts` shortens the document title to "Der Developer Blog" in every non-`browser` display mode, so the title bar reads "DevNotes - Der Developer Blog". Browser tabs, bookmarks and search results keep the full "DevNotes | Der Developer Blog".
- `npm run preview:deploy` now builds with `VITE_APP_CHANNEL=preview` and names the app "DevNotes (Preview)" in `name` and `short_name`. Production and preview can therefore be installed side by side and stay tellable apart in `chrome://apps`, in the installed window's title bar ("DevNotes (Preview) - Der Developer Blog") and in browser tabs ("DevNotes (Preview) | Der Developer Blog"). The separation itself comes from the preview channel's own Hosting domain, which Chrome already treats as a different app; the suffix only makes it visible. Manifest name and document title are derived from the same helpers in `src/services/appIdentity.ts`, which `vite.config.ts` imports too, so the suffix cannot end up in one place but not the other.
- The icon set in `public/` (64/192/512 px, a maskable 512 px variant with safe-zone padding, and a 180 px `apple-touch-icon`) is rendered from the existing `public/favicon.svg` by `npm run icons:generate`. The script drives a headless Chrome rather than adding a native rasterizer to the dependency tree; it is not part of the build, so re-run it and commit the PNGs whenever the favicon changes.
- A snackbar offers "Neu laden" once a new build has been downloaded (`src/components/PwaUpdatePrompt.tsx`). The worker is generated with `registerType: 'prompt'` and stays in "waiting" until the button is used, so an open editor is never reloaded from under the user.

### Changed

- The service worker precaches only the app shell: `index.html`, the stylesheet, the icons and the eagerly preloaded `index-*`/`rolldown-runtime-*`/`vendor-*` chunks — 19 entries, about 1.5 MB. Precaching `**/*.js` would have pushed all 13 MB of the build at install time, because the output contains one chunk per Shiki language and one per Mermaid diagram type. Those lazy chunks, plus the Google Fonts stylesheet and font files, are cached at runtime on first use instead.
- Firebase Hosting now sends `Cache-Control: no-cache` for `sw.js`, `workbox-*.js`, `manifest.webmanifest` and `index.html`, so a deployed update is not hidden behind the browser's HTTP cache. `fonts.googleapis.com` and `fonts.gstatic.com` were added to the `connect-src` CSP directive, because the service worker fetches the fonts itself when filling its runtime cache.
- Because the app reads Firestore through the REST-based lite SDK without an offline cache, an installed DevNotes loads its interface offline but not its posts. The service worker deliberately shows no "ready to work offline" message, which would promise more than it delivers.
## [1.2.2] - 2026-08-16

### Fixed

- Settings no longer get lost in Safari on iOS when the browser denies storage access. Safari answers every `window.localStorage` access with a `SecurityError` while "Alle Cookies blockieren" (Einstellungen > Apps > Safari > Erweitert) is active, and some in-app browsers behave the same way. The theme provider read `localStorage` unguarded in its state initialiser, so that error was thrown during the very first render and the app stayed blank instead of falling back to its defaults.
- Theme mode, accent colour and the analytics consent now go through `src/services/safeStorage.ts`. Each value is written to every channel that accepts it — `localStorage`, a first-party cookie (`path=/`, `max-age` one year, `SameSite=Lax`, `Secure` over HTTPS) and an in-memory map — and read back from the first channel that still has it. Where cookies are allowed but `localStorage` is not, the settings therefore survive a reload; where nothing is allowed, they at least survive the current page instead of breaking it.
- The stored theme mode is validated on read, like the accent colour already was. An unknown value falls back to `system` rather than reaching MUI's `palette.mode`.

Not covered by this: Safari's Intelligent Tracking Prevention deletes all script-writable storage — `localStorage`, IndexedDB and cookies written from JavaScript alike — after seven days without a visit to the site. Settings can disappear after a longer break for that reason, and so can the Firebase Auth session, which the SDK keeps in IndexedDB. Signed-in users get their theme back from their profile in Firestore.

## [1.2.1] - 2026-08-16

### Changed

- Text left in the tag field is now adopted as a tag when the post is saved, published or stored as a draft. Previously it was silently dropped unless it had been confirmed with Enter or the plus button beforehand. The same splitting rules as before apply: commas and semicolons separate several tags, duplicates and existing tags are ignored. The adopted tags appear as chips and the input field is cleared, so the editor shows what was actually saved.

## [1.2.0] - 2026-08-16

### Changed

- The back link at the top of the reading and editing views now returns to the page the post was opened from, and names it accordingly: "Zurück zur Merkliste" when coming from the bookmarks page, "Zurück zu meinen Beiträgen" from "Meine Beiträge", "Zurück zur Übersicht" from the home page. Previously it always led to "Meine Beiträge" for drafts and to the home page otherwise, so anyone arriving from the bookmarks page ended up on the home page.
- The origin survives several steps: opening an article from the bookmarks page, editing it and publishing it still leaves "Zurück zur Merkliste" on the article instead of a link pointing at the article itself.
- "Abbrechen" in the editor and in the "Neuer Beitrag" form follows the same target as the back link. Opening "Beitrag schreiben" from "Meine Beiträge" therefore makes "Abbrechen" return there, and the published post then shows "Zurück zu meinen Beiträgen".
- "Beitrag löschen" in the editor goes to "Meine Beiträge" when the user came from there, and to the overview of all articles otherwise — never to the deleted post.

Direct links, shared links and reloads keep the previous behaviour unchanged: drafts lead to "Meine Beiträge", published posts to the overview. The browser's back button is unaffected.

Internally the origin travels as a list of keys in the router state (`src/navigation/backNavigation.ts`) rather than through `navigate(-1)`: a history entry carries no label to display, and for direct entries or `replace` navigations it does not point at the right page. Because that state can be tampered with through the history, it is strictly validated on read; invalid data silently falls back to the previous behaviour.

## [1.1.10] - 2026-08-15

### Added

- In "Meine Beiträge", clicking a post's title opens its reading view (`/blog/:id`) — the same target as the existing arrow button, which stays. The title is a button inside the heading, so it can be focused and triggered by keyboard as well, and it takes on the accent color on hover.

### Changed

- The arrow button for reading on the bookmarks page now looks exactly like the one in "Meine Beiträge": secondary green with a matching border, and the tooltip "Artikel lesen" instead of "Artikel öffnen". The corner rounding stays aligned with the adjacent delete button as before.

## [1.1.9] - 2026-08-15

### Added

- `npm run clean` removes build and tool artifacts with `rimraf`: `dist/`, `coverage/`, the TypeScript build info in `node_modules/.tmp`, the Vite/Vitest cache in `node_modules/.vite`, the Firebase Hosting deploy cache (`.firebase/hosting.*.cache`) and emulator `*-debug.log` files. `npm run clean:emulator-data` separately deletes the persisted local emulator database in `.firebase/emulator-data`, because that discards local development data.

### Fixed

- Sporadic 10–20 second stalls of Firestore requests in Safari (and occasionally Chrome), where a request that had just completed in well under a second suddenly hung. The browser app only ever performs one-time reads and writes, yet the full `firebase/firestore` SDK tunnels even `getDoc`/`getDocs` through a long-lived WebChannel `Listen` session (`Listen/channel` with `SID`/`AID` and a streaming GET backchannel). When that session silently dies – background tab, network change, sleep, proxy – the SDK's online-state tracker waits 10 seconds ("Backend didn't respond within 10 seconds"), then reconnects with exponential backoff, and one-time reads either sit in that window or (with the in-memory cache Safari was using) fail as "client is offline" and render empty lists. The app now uses the REST-based `firebase/firestore/lite` entry point everywhere: every read and write is an independent HTTPS request (`documents:runQuery`, `documents:batchGet`, `documents:commit`) with no session, no backchannel and no offline state machine, so a dead connection cannot stall the next call.
- Removed the Safari-specific in-memory-cache workaround and the IndexedDB multi-tab persistence; both only existed to soften the symptoms above and neither has an effect on the lite SDK. Offline reads from cache are not supported anymore, which the app never relied on (one-time reads always waited for the server).

### Changed

- The eagerly loaded Firestore vendor chunk shrinks from 553 kB to 124 kB (gzip 163 kB → 38 kB) because the lite SDK does not ship the realtime listener, cache and WebChannel machinery.
- A new test guards the transport choice: any `from 'firebase/firestore'` import under `src/` fails the suite, so the WebChannel transport cannot be re-introduced by accident.
- `scripts/smoke-blog-workflow.mjs` exercises the Firestore rules through the same `firebase/firestore/lite` client the app uses, and silences the SDK's error logging for the rule rejections it deliberately provokes.

## [1.1.8] - 2026-08-15

### Added

- `npm run preview:deploy` builds the app and publishes it to a Firebase Hosting preview channel, so a change can be reviewed under a temporary URL without touching the live site. The build is identical to `npm run deploy`, meaning the preview runs against the production database.
- The preview defaults to the fixed channel `preview`, which keeps its URL stable across deploys; a channel name can be passed explicitly (`npm run preview:deploy -- my-channel`) when several previews are needed side by side.
- `engines` now declares the supported Node versions (`^22.22.2 || ^24.15.0 || >=26.0.0`), matching what the dependency tree already requires.

### Changed

- Updated the toolchain to current releases: `firebase-admin` 14, `firebase-tools` 15.27, `jsdom` 30, `@types/node` 26, `eslint` 10.8, `typescript-eslint` 8.67, `vite` 8.2 and `vitest` 4.1.10. The `firebase-admin` major drops the legacy namespace API, which the admin scripts never used; all of them were verified against the emulators.
- TypeScript 7 now performs the type checking, installed side by side with the TypeScript 6 API via npm aliases (`@typescript/native` and `typescript`), because `typescript-eslint` refuses to run against TypeScript 7. This can collapse back to a plain `typescript` dependency once `typescript-eslint` supports it.
- The app depends on the `@shikijs/*` packages it actually imports instead of the `shiki` umbrella package, which was never imported. This also drops the unused Oniguruma WebAssembly engine.

### Fixed

- Mermaid is no longer loaded on first paint. The catch-all vendor group in the bundler configuration pulled every `node_modules` package into the eagerly loaded chunk, including Mermaid and everything it exclusively needs (d3, cytoscape, katex, roughjs, dagre), which made the deliberate dynamic import in the Markdown renderer ineffective. The initially loaded JavaScript drops from 5074 kB to 1799 kB.
- Mermaid loads one chunk per diagram type again instead of a single bundle. The same vendor group had flattened Mermaid's internal splitting, so opening any article paid for every diagram type at once.
- The `vendor-shiki-core` group no longer matches the `shiki` umbrella package, which is no longer a dependency. The rule was inert; the resulting chunk is unchanged.
- Removed the npm deprecation warnings for `glob` and `node-domexception`: `glob` is pinned to the maintained version 13 through an override, and `node-domexception`, whose every published version is deprecated, is replaced by a local shim that re-exports the platform-native `DOMException`.

### Security

- Pinned `re2` to 1.26.1 through an override, resolving four advisories in the `firebase-tools` dependency chain (out-of-bounds heap reads and uncatchable process crashes). Without the override the dependency resolves to a vulnerable 1.24.1.

## [1.1.7] - 2026-08-08

### Added

- Mermaid labels now render inline HTML, so `<b>` and `<i>` appear as bold and italic text instead of visible tags.

### Fixed

- Mermaid diagrams use a dedicated color palette per theme mode for nodes, subgraphs, edges and labels instead of the low-contrast Mermaid default themes, which were especially hard to read in dark mode.
- Section colors of scale-based diagrams (timeline, journey) are defined explicitly per theme mode: sections no longer collapse into black blocks in dark mode and are distinguishable instead of uniformly gray in light mode.
- Labels of nodes and subgraphs are recolored after rendering based on the contrast against their own shape fill, which keeps them readable when the diagram source overrides that fill (`style`, `classDef`). A label color set in the diagram itself is kept as is. The same correction is applied to the downloaded SVG.

### Security

- Resolved all npm audit findings in the production dependency chain by updating the lockfile to patched releases of `mermaid`, `dompurify`, `react-router`/`react-router-dom` and `websocket-driver`.

## [1.1.6] - 2026-07-13

### Changed

- Successful publication from the edit workflow now opens the article reader and reports whether the article or its changes were published through the global snackbar.

### Fixed

- Mermaid zoom popups now batch macOS trackpad pinch and two-finger wheel input once per animation frame instead of restarting the zoom easing for every event, resulting in smoother and more immediate zooming.

## [1.1.5] - 2026-07-13

### Changed

- Draft and publish confirmations now appear as visible bottom-of-window snackbars instead of success alerts at the top of long editor pages.
- Creation confirmations survive navigation to the saved draft or published article and are consumed after being displayed once.

## [1.1.4] - 2026-07-13

### Removed

- Removed automatic editor saves, automatic restoration, and their Firestore permissions from the create and edit workflows.
- Drafts remain available through explicit manual saving, and the protected revision history remains unchanged.

## [1.1.3] - 2026-07-13

### Fixed

- Preserve the raw Firestore `publishedAt` timestamp during published-post updates instead of writing its UI-normalized ISO string back to Firestore.
- Restored atomic post-and-revision saves from the real editor flow while keeping the original publication date unchanged.

## [1.1.2] - 2026-07-13

### Fixed

- Compacted each Firestore tag validation into one equivalent bounded regular expression, keeping atomic post-and-revision updates with the maximum ten tags below the 1,000-expression evaluation limit.
- Expanded the emulator workflow smoke test to cover ten tags, full editor update payloads, and admins editing posts owned by another author.

## [1.1.1] - 2026-07-13

### Fixed

- Reduced revision documents to the editorial fields required for restore to lower Firestore rules evaluation cost.
- Cached repeated user-profile lookups inside Firestore rule helpers to further reduce authorization evaluation cost.

### Added

- Added a reproducible emulator smoke test covering authentication, post creation, atomic revision writes, reads, and cleanup through the client SDK.

## [1.1.0] - 2026-07-12

### Added

- Authors can save incomplete posts as private drafts, publish them later, or withdraw published posts back into draft status.
- Create and edit forms now persist debounced per-user Firestore autosaves and restore newer unsaved work when the editor is reopened.
- Every manual update archives the previous post state in a protected revision history with Markdown preview and lossless restore support.
- Added a guarded Admin SDK migration for existing blog posts and a composite Firestore index for the published feed.

### Changed

- Public feeds, bookmarks, and article reads now expose published posts only, while authors and admins retain access to draft previews.
- The personal posts page now displays draft and published counts and marks each post with its workflow status.
- Firestore rules now validate workflow timestamps, protect draft visibility, and scope autosaves and revisions to their authorized owners.

## [1.0.20] - 2026-07-12

### Changed

- Completed Mermaid zoom gestures now settle the SVG at the selected layout scale for a sharp rendering while preserving the current zoom position.
- Settled Mermaid SVG dimensions now remain responsive when the popup or browser window is resized.
- Mermaid diagrams can now be zoomed up to 800% instead of 400%.

## [1.0.19] - 2026-07-11

### Added

- Mermaid zoom popups now support smooth two-finger pinch-to-zoom on touch devices while keeping the gesture midpoint anchored to the diagram.

### Changed

- Releasing one finger after a Mermaid pinch gesture now transitions directly into one-finger panning without interrupting navigation.

## [1.0.18] - 2026-07-11

### Changed

- Updated the npm install-script allowlist to match the currently resolved package versions.

### Security

- Resolved the moderate npm audit findings in the `firebase-tools` dependency chain by applying Firebase's patched `@opentelemetry/core` override at the project root.

## [1.0.17] - 2026-07-10

### Added

- Mermaid zoom popups can now be maximized to the available browser window and restored to their original responsive size with a dedicated icon toggle.

### Changed

- Mermaid popup controls now use clearly distinct icons for fit-to-view and window maximization, with additional spacing before the SVG download action.

## [1.0.16] - 2026-07-10

### Changed

- Mermaid zoom popups now process mouse-wheel and trackpad input continuously with a short GPU-accelerated animation, without rebuilding the SVG DOM on every frame.

### Fixed

- Zooming into Mermaid diagrams now keeps the exact diagram point beneath the mouse cursor stable throughout the animation.
- Mermaid zoom no longer competes with native dialog scrolling or delayed stale scroll corrections during rapid wheel input.
- Popup scrollbars, drag-to-pan navigation, resize handling, and fit-to-view reset now stay synchronized with the zoom transform.

## [1.0.15] - 2026-07-09

### Added

- Markdown blog content now supports Mermaid fenced code blocks that render as diagrams in article details and create/edit previews.
- Mermaid diagrams can be opened in a zoom popup with mouse-wheel zooming, drag-to-pan navigation, zoom controls, zoom percentage display, and a fit-to-view reset.
- Rendered Mermaid diagrams can be downloaded as SVG files from the diagram toolbar or zoom popup.

### Changed

- Mermaid SVG downloads are always rendered with the light Mermaid theme, regardless of the active application theme.
- Mermaid diagram rendering is cached so unchanged diagrams are not re-rendered during normal article scrolling or parent rerenders.

### Fixed

- Invalid Mermaid syntax now shows a compact fallback with the original code instead of breaking the page.
- Mermaid zooming now preserves the viewport around the mouse position and keeps scrollbars visible in the zoom popup.

## [1.0.14] - 2026-06-14

### Added

- Blog titles and teaser summaries now support Markdown in create/edit forms, previews, article detail headers, article lists, personal posts, and bookmarks.

### Changed

- Article detail pages now use a 1280px desktop reading layout and allocate the additional width to the table-of-contents column.

### Fixed

- Desktop article table-of-contents links now wrap long headings instead of requiring horizontal scrolling.
- App settings now load with one-time Firestore reads instead of a global realtime listener, avoiding a persistent `Listen/channel` request on every page.
- Safari now uses Firestore's in-memory cache instead of IndexedDB multi-tab persistence to reduce browser-specific Firestore stalls.

## [1.0.13] - 2026-06-07

### Added

- Admins can now manage application settings from a new admin dashboard tab.
- Added a closed user group mode that redirects unauthenticated visitors to login before they can open the home feed or read articles.
- Firestore rules now protect article reads dynamically when closed user group mode is enabled.

### Changed

- Article reading views now align their maximum desktop content width with the existing top navigation width.
- The sticky article title row now spans the full desktop reading layout, including the table-of-contents column.

### Fixed

- Anonymous theme selections now persist from browser local storage instead of being reset by profile synchronization when no user is signed in.
- Signing out now resets the accent color to the default violet theme.
- App settings loading now falls back to default public settings if Firestore does not respond quickly enough, avoiding an indefinite loading state.

## [1.0.12] - 2026-06-07

### Added

- Profile settings now let approved users choose between five accent themes: violet, blue, green, rose, and orange.
- The new orange accent theme uses `#FF6200` as its primary accent color.

### Changed

- App-wide accent styling now uses shared theme tokens so navigation, article cards, markdown accents, and profile surfaces follow the selected accent color.
- Article detail titles now use a more restrained desktop size for a calmer reading view.
- User profile persistence and Firestore rules now support the selected accent theme alongside the existing light, dark, and system mode preference.
- The top-bar light/dark/system theme selector now synchronizes the selected theme mode to the signed-in user's profile.
- Profile settings no longer collect or persist a user's operating system, and profile updates remove the legacy field from existing Firestore profiles.

### Fixed

- Accent color labels in the profile settings now wrap the color choices onto additional rows when needed instead of truncating labels.
- The mobile article table-of-contents menu now shows only one scrollbar in Chrome.

## [1.0.11] - 2026-06-07

### Changed

- Article detail pages now place the title, teaser, and author metadata in a clearer reading order.
- Article detail pages now keep a compact sticky article title visible while scrolling.
- Desktop article table-of-contents panels now align closer to the sticky header while scrolling.
- Dark mode article surfaces are now slightly lighter for better contrast against the page background.

### Fixed

- Narrow article views now keep the table-of-contents control visible without covering the selected heading in the article.
- Table-of-contents heading clicks now account for the sticky header and sticky article title when positioning the target section.
- Table-of-contents heading jumps now use native smooth scrolling again.

## [1.0.10] - 2026-06-06

### Added

- The navigation now links to the GitHub repository from a GitHub icon in the top bar and mobile drawer.

### Changed

- The Home page introduction is now more compact, leaving more room for filters and article cards above the fold.
- Long article table-of-contents navigation now tracks the currently scrolled section automatically.
- Long desktop table-of-contents panels now scroll themselves to keep the active marker visible.

### Fixed

- Route changes now reset the window scroll position, so Home and newly opened articles start at the top instead of inheriting the previous page scroll.
- Table-of-contents markers no longer jump to the last entry after Markdown headings are remounted.
- Table-of-contents markers stay stable while smooth scrolling to a clicked heading is in progress.

## [1.0.9] - 2026-06-05

### Added

- New user registrations now send a Firebase email verification link and persist an explicit `emailVerified` status.
- The admin dashboard now shows email verification status for pending, approved, and rejected users.

### Changed

- Admin approval and email verification are now independent requirements for new users before write access is granted.
- Existing approved users without an `emailVerified` field are treated as legacy accounts and keep their write access.

### Fixed

- Email verification status now refreshes from Firebase Auth after users confirm their email link, so approved users can gain write access without manual profile edits.

## [1.0.8] - 2026-06-03

### Added

- Long article detail pages now generate an automatic table of contents from Markdown headings.
- Desktop article views show the table of contents as sticky side navigation with section anchor links.
- Narrow article views now expose the table of contents through a sticky menu button instead of hiding navigation entirely.

### Fixed

- The article table of contents now keeps its sticky position after jumping directly to deep heading anchors.
- Table-of-contents heading IDs now stay aligned with rendered Markdown headings, including duplicate headings, umlauts, Setext headings, and headings around fenced code blocks.

## [1.0.7] - 2026-06-03

### Added

- Approved users can save articles to a private Merkliste and manage saved posts from the new `/bookmarks` page.
- Article cards and article detail pages now expose a bookmark toggle with saved/unsaved states.
- Firestore rules now protect per-user bookmark subcollections under `users/{uid}/bookmarks/{blogId}`.

### Fixed

- Featured article card tags now reserve space for the bookmark button so long tag rows no longer overlap the action.

## [1.0.6] - 2026-06-02

### Changed

- Markdown heading levels now use a clearer visual hierarchy, with `h3` headings gaining a subtle underline while `h2` headings remain unaccented.

### Fixed

- CamelCase Markdown headings now generate word-separated IDs so table-of-contents links like `#scoped-elements-mixin-im-detail` jump to `ScopedElementsMixin im Detail`.

## [1.0.5] - 2026-06-01

### Added

- Article detail pages now offer a public raw Markdown download that is available without signing in.
- Markdown downloads include the article title as a level 1 heading, the teaser as italic text, and the original article body.
- Markdown download filenames are generated from safe title slugs capped at 30 characters, preferring word-boundary truncation.

## [1.0.4] - 2026-05-31

### Changed

- Blog teaser summaries now support up to 600 characters across the editor, validation, and Firestore security rules.
- Markdown tables of contents are now styled as compact navigation panels instead of plain lists.

### Fixed

- Markdown headings now receive stable linkable IDs so table-of-contents hash links jump to the matching section.
- Hash links with German umlauts and URL-encoded characters now scroll correctly in rendered blog posts.

## [1.0.3] - 2026-05-28

### Changed

- The home page now renders recent blog posts first and loads the complete post index in the background.
- Firestore now uses a persistent browser cache so repeat visits can reuse cached data.
- Blog list filtering now memoizes the final sorted result to avoid extra sorting work during re-renders.

## [1.0.2] - 2026-05-28

### Added

- Local Firebase Emulator Suite workflow for Firebase Authentication and Firestore development.
- Emulator scripts for starting local services, bootstrapping the local admin, seeding posts, and deleting local emulator posts.
- Visible `FIREBASE EMULATOR` development indicator in the navigation.

### Changed

- Replaced the browser `localStorage` mock mode with Firebase Auth and Firestore emulator support.
- Authentication, blog, and admin service paths now use the Firebase-backed implementation in both production and local emulator development.
- Removed the development-only mock admin setup page and route.
- Local and production sign-in now consistently use Firebase email/password authentication.
- Post maintenance scripts now target Firestore directly, including the local emulator when emulator environment variables are set.
- README and privacy copy now describe the Firebase emulator workflow, local admin credentials, script overview, and email-based sign-in instead of the old local mock store.

### Fixed

- Local admin bootstrap now repairs stale emulator username reservations when Auth and Firestore emulator data get out of sync.

## [1.0.1] - 2026-05-28

### Added

- MIT open source license.
- Admins can reassign blog posts to another active, approved author from the edit form.
- The edit form now keeps orphaned original authors selectable as a clear legacy state.
- Tests cover active author profile loading, blog author reassignment, and the removal of legacy `authorId` handling for new posts.

### Changed

- New blog posts no longer store the legacy Firebase Auth UID field `authorId`; ownership is defined by `authorUsername`.
- Firestore rules validate admin author reassignment against active, approved user profiles.
- Firestore rules reject `authorId` on newly created blog posts.
- Example and mock posts no longer include legacy `authorId` values.
- README documentation now reflects restore repair flows, version display, App Check setup, and current app routes.

### Security

- Deleting a regular user now preserves a username tombstone when authored posts exist, preventing later username reuse from taking over old posts.
- Blog identity rules keep normal user ownership tied to the original `authorUsername` while allowing controlled admin reassignment.

## [1.0.0]

### Added

- Public DevNotes blog with article listing, featured posts, tag filtering, search, archive view, and pagination.
- Article detail pages with Markdown rendering, GFM support, syntax highlighting, copy-to-clipboard code blocks, and sanitized HTML output.
- Registration flow with unique username reservation and admin approval.
- Protected author workflows for creating, editing, deleting, and listing own posts.
- Admin workflows for approving users, assigning roles, managing posts, and repairing admin/user restore states.
- Mock mode with localStorage-backed data, mock authentication, mock admin setup, and visible mock-mode indicator.
- Profile and settings screens with theme preference, account details, and author name propagation.
- Version display in the app navigation tooltip and footer.
- Firebase integration for Authentication, Firestore, optional Analytics consent, and optional App Check.
- Admin SDK scripts for bootstrap, backup, restore, post seeding/deletion, user deletion, and restore repair.
- Firestore security rules for user profiles, username reservations, and blog ownership.
