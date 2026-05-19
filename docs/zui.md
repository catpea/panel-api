# Panel API · ZUI module

`panel-api/zui` is a **separately importable** module that adds zooming user interface (ZUI) capabilities. Panels work fully without it; ZUI is the optional companion that lets panels respect zoom/pan transforms or float above a zoomed world.

The two are wisely separate: Panel API has no compile-time dependency on ZUI, but the `pinnable` plugin and any world-coordinate work consult `panel.viewport` if it is attached. This means you can:

* Use Panel API alone, with no ZUI on the page.
* Use Panel API + your own ZUI implementation (just provide `screenToWorld` / `worldToScreen`).
* Use the bundled `PanelViewport` for the common case.

## Imports

```js
import {
  PanelViewport,
  wireInteractions,
  framePage,
  attachZUI,
  VIEWPORT_CHANGE_EVENT,
  wireZuiPointerEvents,
  createViewportLock
} from "panel-api/zui";
```

---

## `PanelViewport`

```js
const viewport = new PanelViewport({
  root:    document.getElementById("zuiRoot"),
  surface: document.getElementById("zuiSurface"),
  bounds:  { minZoom: 0.1, maxZoom: 8 },   // optional
  broadcast: window                         // optional; pass null to disable
});
```

### Required structure

```html
<div id="zuiRoot" style="position:fixed; inset:0; overflow:hidden;
                          container-type:size; touch-action:none;">
  <div id="zuiSurface" style="position:absolute; left:0; top:0;
                              width:100cqw; height:100cqh;
                              transform-origin:0 0; will-change:transform;">
    <!-- world content -->
  </div>
</div>
```

`PanelViewport` reads/writes `--viewport-x`, `--viewport-y`, `--viewport-zoom` on the surface and applies a `translate() scale()` transform. If you don't set `surface.style.transform` yourself, one is applied for you on first `apply()`.

### Methods

| Method | Description |
| --- | --- |
| `setZoom(zoom, anchorClientX?, anchorClientY?)` | Set zoom, optionally anchored at a screen point (defaults to root center). Clamped to `[minZoom, maxZoom]`. |
| `panBy(dx, dy)` | Pan in screen-pixel deltas. |
| `panTo(x, y)` | Set absolute screen-pixel pan. |
| `reset()` | Identity — zoom = 1, x = 0, y = 0. |
| `screenToWorld(clientX, clientY)` | Convert screen coordinates to world coordinates. |
| `worldToScreen(x, y)` | Inverse of `screenToWorld`. |
| `snapshot()` | `{ zoom, x, y }` — for persistence. |
| `restore(snapshot)` | Apply a previously saved snapshot. |

### Events

`PanelViewport` is an `EventTarget`. It dispatches `viewportchange` on itself **and** on `window` (configurable via `broadcast`). The detail is the snapshot.

```js
import { VIEWPORT_CHANGE_EVENT } from "panel-api/zui";

window.addEventListener(VIEWPORT_CHANGE_EVENT, event => {
  console.log("zoom:", event.detail.zoom);
});
```

The `pinnable` plugin listens for this on `window`.

---

## `wireInteractions(viewport, options?)`

Attach default pointer + wheel interactions to a viewport. Returns a teardown function.

```js
wireInteractions(viewport, {
  // Pointer events on these elements do not start a pan.
  // Always include dom-panel. Add any world-element class you want to drag independently.
  ignoreSelector: "dom-panel, button, a, input, .my-draggable",
  zoomStep: 0.12   // wheel zoom factor
});
```

During a pan, `user-select: none` is applied to the root so text is not accidentally selected.

---

## `framePage(config?)`

Wrap the current document body into a viewport/surface pair in one call. Returns the `PanelViewport`.

```js
import panel from "panel-api";
import { framePage } from "panel-api/zui";

const viewport = framePage();
panel.attachViewport(viewport);
```

Options:

```js
framePage({
  document:     doc,       // override host document
  host:         container, // frame just this element instead of body
  interactions: false      // skip default pan/zoom wiring
});
```

Notes:

* `framePage` is idempotent — calling it twice on the same host returns the existing viewport.
* It injects a small set of styles to make the layout work (clipped root, scaled surface).
* It preserves any pre-existing `.panel-layer` outside the surface so panels remain unscaled.
* Both axes use the same scale factor — there is no `scaleX` / `scaleY` knob.

---

## `attachZUI({ root, surface, interactions })`

The manual counterpart to `framePage`. Use when you have built your own ZUI markup.

```js
import { attachZUI } from "panel-api/zui";

const viewport = attachZUI({
  root:         document.querySelector(".my-viewport"),
  surface:      document.querySelector(".my-surface"),
  interactions: true
});
```

---

## `wireZuiPointerEvents(viewport, options?)`

Re-dispatches standard pointer events as `zuipointer*` `CustomEvent`s carrying **world-space** coordinates in their `detail`. Use this when you have world elements that need to respond to pointer position in world coordinates rather than screen coordinates.

```js
import { wireZuiPointerEvents } from "panel-api/zui";

wireZuiPointerEvents(viewport);

viewport.root.addEventListener("zuipointermove", e => {
  console.log("world x/y:", e.detail.x, e.detail.y);
  console.log("screen event:", e.detail.original);
});
```

The four events dispatched are:
`zuipointerdown`, `zuipointermove`, `zuipointerup`, `zuipointercancel`.

Each `detail` is `{ x, y, pointerId, original }` where `x`/`y` are world coordinates and `original` is the source `PointerEvent`.

### Options

| Option | Default | Description |
| --- | --- | --- |
| `target` | `viewport.root` | Element to listen on and dispatch from |
| `prefix` | `"zui"` | Prefix for dispatched event names |
| `signal` | auto | `AbortSignal` to stop listening; if not provided, a controller is created internally |

Returns a teardown function (calls `abort()` on the internal controller if one was created).

---

## `createViewportLock(viewport, options?)`

Wraps `wireInteractions` with a lock/unlock API. Use when world-space elements need exclusive pointer ownership (e.g., drag handles inside a ZUI surface) so that a drag on a world element does not also pan the viewport.

```js
import { createViewportLock } from "panel-api/zui";

const lock = createViewportLock(viewport, {
  ignoreSelector: "dom-panel, button, a, .world-box"
});

worldBox.addEventListener("pointerdown", () => lock.lock());
document.addEventListener("pointerup",   () => lock.unlock());
```

### Methods / properties

| Member | Description |
| --- | --- |
| `lock()` | Disables pan/zoom interactions and calls `viewport.reset()`. No-op if already locked. |
| `unlock()` | Re-wires interactions and calls `viewport.reset()`. No-op if already unlocked. |
| `locked` | `true` when interactions are currently disabled. |
| `teardown()` | Permanently stops interaction wiring (call on page unload or component destroy). |

---

## Coordinate-space contract

| Space | What `left`/`top` mean | Implementation |
| --- | --- | --- |
| `"screen"` | Pixels in the panel layer (viewport-relative) | Native — no viewport needed |
| `"document"` | Pixels in the document (scrolls with page) | Reserved |
| `"world"` | Surface-local world coordinates | Use `pinnable` after open, or project with `worldToScreen` |
| `"element"` | Anchored to a DOM element | Reserved |

Recommended pattern for world-anchored panels today:

```js
const screen = viewport.worldToScreen(worldX, worldY);
const handle = panel.open("", "Note", { left: screen.x, top: screen.y });
handle.element.querySelector("[data-pin]").click();
```

---

## Roll-your-own ZUI

You don't have to use `PanelViewport`. Any object with these members is acceptable as a viewport for `panel.attachViewport()` and the `pinnable` plugin:

```ts
interface PanelViewportLike {
  zoom: number;
  x: number;
  y: number;
  screenToWorld(clientX: number, clientY: number): { x: number; y: number };
  worldToScreen(x: number, y: number): { x: number; y: number };
}
```

Dispatch `viewportchange` on `window` whenever your transform changes.
