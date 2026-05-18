# Panel API · ZUI module

`panel-api/zui` is a **separately importable** module that adds zooming user interface (ZUI) capabilities. Panels work fully without it; ZUI is the optional companion that lets panels respect zoom/pan transforms or float above a zoomed world.

The two are wisely separate: Panel API has no compile-time dependency on ZUI, but the `pinnable` plugin and any world-coordinate work consult `panel.viewport` if it is attached. This means you can:

* Use Panel API alone, with no ZUI on the page.
* Use Panel API + your own ZUI implementation (just provide `screenToWorld` / `worldToScreen`).
* Use the bundled `PanelViewport` for the common case.

## Imports

```js
import { PanelViewport, wireInteractions, framePage, attachZUI,
         VIEWPORT_CHANGE_EVENT } from "panel-api/zui";
```

## `PanelViewport`

```js
const viewport = new PanelViewport({
  root: document.getElementById("zuiRoot"),
  surface: document.getElementById("zuiSurface"),
  bounds: { minZoom: 0.1, maxZoom: 8 },     // optional
  broadcast: window                          // optional; pass null to disable global broadcast
});
```

### Required structure

```html
<div id="zuiRoot" style="position:fixed; inset:0; overflow:hidden;
                          container-type: size; touch-action: none;">
  <div id="zuiSurface" style="position:absolute; left:0; top:0;
                              width: 100cqw; height: 100cqh;
                              transform-origin: 0 0;
                              will-change: transform;">
    <!-- your world content -->
  </div>
</div>
```

`PanelViewport` reads/writes three CSS variables on the surface — `--viewport-x`, `--viewport-y`, `--viewport-zoom` — and consumes them via a default `translate() scale()` transform. If you don't set `surface.style.transform` yourself, one is applied for you on first `apply()`.

### Methods

| Method | Description |
| --- | --- |
| `setZoom(zoom, anchorClientX?, anchorClientY?)` | Set zoom, optionally anchored at a screen point (defaults to root center). Clamped to `[minZoom, maxZoom]`. |
| `panBy(dx, dy)` | Pan in screen-pixel deltas. |
| `panTo(x, y)` | Set absolute screen-pixel pan. |
| `reset()` | Identity (zoom = 1, x = 0, y = 0). |
| `screenToWorld(clientX, clientY)` | Pure function: convert pointer coordinates to world coordinates. |
| `worldToScreen(x, y)` | Inverse of `screenToWorld`. |
| `snapshot()` | `{ zoom, x, y }` — for persistence. |
| `restore(snapshot)` | Apply a previously saved snapshot. |

### Events

`PanelViewport` is an `EventTarget`. It dispatches `viewportchange` on itself **and** on `window` (configurable via the `broadcast` option). The detail is the snapshot.

```js
import { VIEWPORT_CHANGE_EVENT } from "panel-api/zui";

window.addEventListener(VIEWPORT_CHANGE_EVENT, event => {
  console.log("zoom:", event.detail.zoom);
});
```

The Panel API's `pinnable` plugin listens for this on `window`.

## `wireInteractions(viewport, options?)`

Attach default pointer + wheel interactions to a viewport. Returns a teardown function.

```js
wireInteractions(viewport, {
  ignoreSelector: "dom-panel, button, a, input",   // ignore these elements
  zoomStep: 0.12                                    // wheel zoom factor
});
```

Roll your own input by passing `interactions: false` to `framePage` or simply not calling `wireInteractions`.

## `framePage(config?)`

Wrap the current document body into a viewport/surface pair in one call. Returns the `PanelViewport`.

```js
import panel from "panel-api";
import { framePage } from "panel-api/zui";

const viewport = framePage();          // wraps document.body
panel.attachViewport(viewport);        // panels now know about ZUI
```

Options:

```js
framePage({
  document: doc,                       // override host document
  host: container,                     // frame just this element instead of body
  interactions: false                  // skip default pan/zoom wiring
});
```

Notes:

* `framePage` is idempotent: calling it twice on the same host returns the existing viewport.
* It injects a small set of styles to make the layout work (clipped root, scaled surface).
* It preserves any pre-existing `.panel-layer` outside the surface so panels remain unscaled.
* The page's **xy ratio is preserved** because both axes use the same scale factor. There is no `scaleX` / `scaleY` knob — that distortion is intentionally not exposed.

## `attachZUI({ root, surface, interactions })`

The manual counterpart to `framePage()`. Use when you have built your own ZUI markup.

```js
import { attachZUI } from "panel-api/zui";

const viewport = attachZUI({
  root: document.querySelector(".my-viewport"),
  surface: document.querySelector(".my-surface"),
  interactions: true
});
```

## Coordinate-space contract

The four coordinate spaces in the Panel API roadmap map to `PanelViewport` like this:

| Space | What `left`/`top` mean | Implementation |
| --- | --- | --- |
| `"screen"` | Pixels in the panel layer | Native (no viewport needed) |
| `"document"` | Pixels in the document (scrolls with page) | Reserved |
| `"world"` | Surface-local coordinates | Use `pinnable` after open OR project with `worldToScreen` |
| `"element"` | Anchored to a DOM element | Reserved |

A future release will accept `coordinateSpace: "world", worldX, worldY` directly on `panel.open()` and project automatically.

## Roll-your-own ZUI

You don't have to use `PanelViewport`. Any object with these methods is acceptable as a panel viewport for the `pinnable` plugin:

```ts
interface PanelViewportLike {
  zoom: number;
  x: number;
  y: number;
  screenToWorld(clientX: number, clientY: number): { x: number; y: number };
  worldToScreen(x: number, y: number): { x: number; y: number };
}
```

Dispatch `viewportchange` on `window` (or a custom broadcast target the plugin listens to) whenever your transform changes.
