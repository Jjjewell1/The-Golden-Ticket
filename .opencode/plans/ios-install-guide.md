# Install guide (iOS + Android) with re-trigger

**Goal:** Help members install The Golden Ticket so they can get push notifications. iOS web push requires a Home Screen install; Android installs via Chrome's native prompt or the menu.

## Hard technical limits
- **iOS: no auto-install and no programmatic Share-menu.** No WebKit API; `beforeinstallprompt` is Chromium-only. `navigator.share()` generally does NOT include "Add to Home Screen" — fallback only.
- **Android Chrome/Edge: real native install** via `beforeinstallprompt` — the guide's primary path is the Install button; visual steps are the manual fallback for when the prompt never fires (Firefox, dismissed prompt, Samsung Internet quirks).

## Changes

### 1. `web/src/lib/install.js` — new helpers
- `iosVersion()` — `OS (\d+)_` from UA (Safari toolbar moved to bottom on iOS 16+).
- `iosBrowser()` — `safari` | `chrome` | `firefox` | `other` via `CriOS` / `FxiOS`.
- `androidBrowser()` — `chrome` | `edge` | `samsung` | `firefox` | `other` via `EdgA` / `SamsungBrowser` / `Firefox`+`Android` / `Chrome`.
- `canShareSheet()` — `typeof navigator.share === 'function'`.
- `detectDevice()` — `'ios' | 'android' | 'desktop'` (single source for branching).

### 2. Global `beforeinstallprompt` capture
- New module-level capture in `web/src/lib/install.js` (or a tiny `useInstallPrompt` hook): store the latest `beforeinstallprompt` event so ANY "Install" button can fire the native prompt even after the popup was dismissed. Replace the capture currently living inside `InstallHint`'s effect.

### 2a. `web/src/components/InstallButton.jsx` — new "Add to Home Screen" button
Platform-branching button:
- **Chromium (Android/desktop):** if a captured `beforeinstallprompt` exists → label "Add to Home Screen" and `prompt.prompt()` (user confirms once in the native dialog — the only kind of "auto-add" browsers allow). If the prompt isn't available → `showInstallHint()` (falls back to manual guide).
- **iOS:** label "Add to Home Screen" → `showInstallHint()` (visual guide; iOS has no auto-add API).
Used in Guide, Sidebar, and the install popup.

### 2b. `web/src/components/InstallHint.jsx` — visual guide for both platforms
Shared `step` state (0→2, reset on open), step dots, Back / Not now / Next.

**iOS branch (`detectDevice() === 'ios'`):**
- Step 1 — tap Share: mock bottom toolbar (back/forward pills, URL pill, pulsing share glyph with animated `↑` pointer). Tapping the glyph advances. Caption mentions toolbar position per `iosBrowser()`.
- Step 2 — choose "Add to Home Screen": mock share sheet, highlighted pulsing row, tappable.
- Step 3 — open the app: 🎫 home-screen icon mock + "then tap the 🔔 bell on the Guide".
- Fallback button (Step 1, only when `canShareSheet()`): `navigator.share({...})`, honestly labeled.

**Android branch (`detectDevice() === 'android'`):**
- If `deferredPrompt` is captured → primary **Install** gold button (native Chrome prompt) shown above the guide; the visual steps sit below as "Prefer to do it by hand?"
- If no `deferredPrompt` → visual steps directly:
  - Step 1 — open the menu: mock address bar (URL pill + overflow control `⋮` for Chrome/Samsung, `⊕` for Edge) with pulsing highlight + pointer. Tappable to advance.
  - Step 2 — choose "Install app"/"Add to Home screen": mock bottom sheet with the install row highlighted (label per `androidBrowser()`).
  - Step 3 — open the app: 🎫 home-screen icon mock + "then tap the 🔔 bell on the Guide".

**Desktop/Chromium:** unchanged (existing Install button).

**Standalone nudge (both platforms):** one-time "You're in the app! 🎉 → Show me the bell" modal on first launch when `isStandalone()` and LS key `goldenticket-standalone-nudge` unset; navigates to `/guide` via `useNavigate`.

### 3. `web/src/components/InstallLink.jsx` — new
Tiny button `📲 Install the app` → uses `InstallButton` behavior (fires native prompt on Android/desktop when available, else `showInstallHint()`). Renders only when `needsInstall()`. Optional `onClick` prop (Sidebar closes itself).

### 4. `web/src/pages/Guide.jsx`
Render `<InstallButton />` under `<NotifyBell />` (plus keep `InstallLink` for the manual guide).

### 5. `web/src/components/Sidebar.jsx`
Render `<InstallButton onClick={onClose} />` in a `.sidebar-install` container below the nav (auto-hides once installed).

### 6. `web/src/styles.css`
Shared device-mock classes (theme-aware via existing vars):
- `.device-bar` (toolbar/address-bar mock), `.device-ctl`, `.device-url`, `.device-lock`, `.device-share` + `device-pulse` keyframes, `.device-pointer` + `device-bob`
- `.device-sheet` / `.device-sheet-row` / `.device-sheet-hot`
- `.device-home-mock` / `.device-home-icon` / `.device-home-label`
- `.install-steps-dots`, `.install-link`, `.sidebar-install`, `.install-guide-manual` (collapsible Android manual section)

## Verification
- `npm run build` (web); smoke both branches locally via UA emulation (Chrome DevTools device modes for iPhone Safari + Android Chrome/Firefox).
- Confirm: iOS steps 0→2, Android native Install button when installable, Android manual steps otherwise, standalone nudge on installed launch.
- Commit + push + auto-deploy via Coolify webhook; verify live bundle hash.
