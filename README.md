# Panel API

> Floating, draggable, resizable, stackable panels for the web. Optional ZUI (zoom/pan) layer. Plain ESM — no build step, no dependencies.

## Install

```html
<script type="module">
  import panel from 'https://cdn.jsdelivr.net/npm/panel-api/+esm';

  panel.open("", "Hello", { width: 360, height: 220 })
       .setHTML("<p>Hello, world.</p>");
</script>
```

Or `npm i panel-api` and import the ESM directly:

```js
import panel from "panel-api";
```

## Quick start

```js
import panel from "panel-api";

const handle = panel.open("", "Inspector", {
  width: 420, height: 360, left: 80, top: 80,
  plugins: ["focusable", "stackable", "draggable", "resizable",
            "closable", "miniaturizable", "titled", "escapable"]
});

handle.setContent(node);         // replace body with a DOM node
handle.setHTML("<p>...</p>");    // replace body with HTML string
handle.setTitle("Renamed");
handle.moveTo(x, y);
handle.resizeTo(w, h);
handle.minimize(); handle.restore();
handle.close();

handle.addEventListener("beforepanelclose", e => { if (dirty) e.preventDefault(); });
handle.addEventListener("panelmove", e => console.log(e.detail));
```

## Three integration paths

| Need | Tutorial |
| --- | --- |
| Floating panels on an existing page | [`tutorials/01-cdn-no-zui.html`](./tutorials/01-cdn-no-zui.html) |
| Panels + a sibling ZUI surface you own | [`tutorials/02-cdn-with-zui.html`](./tutorials/02-cdn-with-zui.html) |
| Wrap an existing page into a ZUI surface | [`tutorials/03-cdn-zui-framing.html`](./tutorials/03-cdn-zui-framing.html) |

## Plugins

Every behaviour is a plugin. Pass a `plugins` array to opt in to exactly what you need.

### Interaction

| Plugin | What it does |
| --- | --- |
| `draggable` | Drag panel by caption |
| `resizable` | Bottom-right resize grip. Respects `minWidth`, `minHeight`, `maxWidth`, `maxHeight`. Skips height when `autoheight` is active. |
| `body-draggable` | Drag panel by its body (for captionless panels) |
| `focusable` | Pointer / focus events promote the panel |
| `stackable` | Maintains z-order; brings focused panel to front |
| `keyboard` | Arrow-key move/resize (opt-in via `keyboardMove`, `keyboardResize`) |

### Chrome

| Plugin | What it does |
| --- | --- |
| `closable` | Adds a close button to the caption |
| `miniaturizable` | Adds a minimize button; collapses to caption |
| `pinnable` | Pins panel to ZUI world coordinates |
| `escapable` | Closes on Escape |
| `titled` | Declares the panel has a title; `titled: false` hides the text while keeping the caption strip |
| `toolbar-caption` | Reduces caption height to `22px` (configurable via `captionHeight` option) for compact toolboxes |
| `captionless` | Hides the entire caption strip |
| `rounded` | Applies `options.radius` (or `24`) to `--panel-radius` |
| `borderless` | Removes the panel border |

### Sizing

| Plugin | What it does |
| --- | --- |
| `autoheight` | **ResizeObserver-based** content-driven height. Sets `[data-autoheight]`; `resizable` respects this and skips height writes so only width is user-controllable. |
| `shrinkwrap` | Same as `autoheight` plus sets `--panel-min-width: fit-content` when no explicit `minWidth` is given. |

### Custom plugins

```js
panel.plugins.define("highlight", (handle, options, signal) => {
  handle.element.addEventListener("pointerenter",
    () => handle.element.style.outline = "2px solid #f4d35e",
    { signal });
});

panel.open("", "Highlighted", { plugins: [
  "focusable", "stackable", "draggable", "closable", "titled", "highlight"
]});
```

The `signal` aborts automatically on close — no teardown bookkeeping needed.

See [`docs/plugins.md`](./docs/plugins.md) for the full reference and the toolbox demo for real-world usage.

## ZUI

```js
import panel from "panel-api";
import { framePage } from "panel-api/zui";

const viewport = framePage();      // wraps document.body into a zoom/pan surface
panel.attachViewport(viewport);    // panels now know about ZUI

panel.open("", "Hello", { width: 320 }).setHTML("Hi!");
```

```js
// ZUI pointer events — world-space CustomEvents on top of standard pointer events
import { wireZuiPointerEvents } from "panel-api/zui";

wireZuiPointerEvents(viewport);
viewport.root.addEventListener("zuipointermove", e => {
  console.log("world coords:", e.detail.x, e.detail.y);
});
```

```js
// Viewport lock — disable/re-enable pan+zoom (e.g. while dragging world elements)
import { createViewportLock } from "panel-api/zui";

const lock = createViewportLock(viewport);
lock.lock();    // pauses interactions, resets viewport
lock.unlock();  // re-wires interactions
```

See [`docs/zui.md`](./docs/zui.md) for the full reference.

## Styling

```css
dom-panel {
  --panel-background: rgba(60, 22, 12, 0.92);
  --panel-color: #fbece0;
  --panel-radius: 22px;
}
dom-panel::part(action) {
  inline-size: 32px;
  block-size: 32px;
}
```

See [`docs/styling.md`](./docs/styling.md).

## Testing

Tests run in headless Firefox via Playwright:

```sh
npm test
```

## File map

```
panel-api/
├── index.js                     # default singleton + named exports
├── zui.js                       # PanelViewport, framePage, wireZuiPointerEvents,
│                                  createViewportLock, attachZUI, wireInteractions
├── src/
│   ├── core/                    # manager, handle, element, stack,
│   │                              options, events, declarative, cqu, styles
│   ├── plugins/                 # focusable, stackable, draggable, resizable,
│   │                              closable, miniaturizable, pinnable, rounded,
│   │                              borderless, titled, escapable, keyboard,
│   │                              toolbar-caption, body-draggable, captionless,
│   │                              shrinkwrap, autoheight
│   └── zui/                     # viewport, interactions, frame-page,
│                                  zui-pointer-events, viewport-lock
├── demos/                       # local demos (open with http-server)
│   └── bookmarklets/            # drag-to-bookmark-bar tools built on panel-api
├── tutorials/                   # CDN-based copy/paste integration tutorials
├── tests/                       # Playwright (headless Firefox) tests
├── docs/
│   ├── api.md                   # Manager, Handle, options, events
│   ├── plugins.md               # Built-in plugins, writing your own
│   ├── zui.md                   # PanelViewport, ZUI helpers, coordinate spaces
│   └── styling.md               # Theming via variables and parts
└── ROADMAP.md                   # feature roadmap
```

## Design

* Small core — lifecycle, identity, layer, events, coordinate conversion.
* First-class plugin model — every interaction is opt-in and replaceable.
* Pointer Events — single input model for mouse, pen, and touch.
* `AbortSignal` on every plugin — leak-free by construction.
* Cancelable lifecycle events (`beforepanelopen`, `beforepanelclose`).
* CSS variables and shadow parts — no design lock-in.
* `autoheight` / `shrinkwrap` via ResizeObserver — no `!important` hacks.
* ZUI is a separate sibling module with a documented contract.

## License

MIT
