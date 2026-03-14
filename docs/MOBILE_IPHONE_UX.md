# Mobile & iPhone UX

Improvements and notes for a good experience on iPhone and small screens.

---

## Implemented

### Viewport & safe area

- **`layout.tsx`** – `viewport` export: `width: device-width`, `initialScale: 1`, `maximumScale: 5`, `viewportFit: "cover"`, `themeColor` for status bar. Ensures correct scaling and use of safe area on notched iPhones.
- **`globals.css`** – Body uses `min-height: 100dvh` (dynamic viewport height so the bar doesn’t cause jump), `padding-left/right/bottom: env(safe-area-inset-*)`, `overflow-x: hidden`, `-webkit-tap-highlight-color: transparent`. Utility classes: `safe-area-inset-bottom`, `min-h-screen-ios`.

### Header

- **`SiteHeader`** – On viewports below `md`:
  - Desktop nav is hidden.
  - Hamburger button (44×44px tap target) opens a slide-in drawer from the right with all nav links.
  - Drawer respects `safe-area-inset-top` and `safe-area-inset-bottom`.
  - Tapping overlay or a link closes the menu.
- Nav links use a minimum height of 44px for touch (Apple HIG).

### Touch

- Buttons used for menu open/close use `touch-manipulation` to reduce the 300ms tap delay on iOS where applicable.

---

## Recommendations (not yet done)

### Practice / camera on iOS

- **getUserMedia** on iOS Safari often requires a **user gesture** (e.g. tap). In `PracticeCapture`, the webcam is currently started in `useEffect` on mount, which can fail or be blocked on iPhone.
- **Suggestion:** Start the camera only after the user taps “Start practice” (e.g. request stream inside `handleStart` or when countdown reaches 0), so the permission request runs in a user-gesture context and is more reliable on iOS.

### Optional enhancements

- **Overscroll:** If any page still scrolls horizontally on swipe, ensure main containers use `overflow-x-hidden` or `max-w-full`.
- **Input zoom:** If you want to prevent iOS from zooming on input focus (e.g. in forms), you can set `maximumScale: 1` in the viewport export; this reduces accessibility, so use only if needed.
- **PWA:** For “Add to Home Screen”, consider `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style` in a custom `<head>` if you add a manifest.

---

## Testing on iPhone

- Use Safari (real device or Simulator); Chrome on iOS uses WebKit and behaves like Safari.
- Check: notch/home indicator don’t cover content; no horizontal scroll; nav opens and closes; camera permission after tap if you implement lazy camera start.
- HTTPS is required for `getUserMedia` on iOS (and in production in general).
