# Panel API · Reference

The Panel API is a small interface model for **persistent, movable, optionally resizable UI surfaces** that float above page content. It sits between the platform's Popover API (lightweight transient overlays), `<dialog>` (modal), and `window.open()` (a separate browser window).

This document defines the runtime interfaces. See:

* [`plugins.md`](./plugins.md) — built-in plugins and how to write your own
* [`zui.md`](./zui.md) — the ZUI (zooming user interface) companion module
* [`styling.md`](./styling.md) — theming via CSS variables and shadow parts

## Entry points

```js
import panel from "panel-api";                              // default singleton
import { PanelManager, PanelHandle, PluginRegistry,
         PANEL_EVENTS, installDeclarative } from "panel-api";
import { PanelViewport, framePage } from "panel-api/zui";   // ZUI module
```

The default singleton ships pre-configured: all built-in plugins are registered, default styles are injected, and declarative HTML support is installed.

---

## `panel.open(url, title, options)`

Open a new panel. Returns a [`PanelHandle`](#panelhandle).

```js
const handle = panel.open("", "Inspector", {
  width: 420, height: 360,
  left: 80, top: 80,
  plugins: ["focusable", "stackable", "draggable", "resizable", "closable", "titled", "escapable"]
});
```

Calling conventions (all equivalent):

```js
panel.open("", "Inspector", { width: 400 });
panel.open("", "Inspector", "width=400,plugins=resizable;closable");
panel.open({ title: "Inspector", width: 400 });
```

When `url` is non-empty the panel body is replaced with an `<iframe>` loaded from that URL. All
other panel features (drag, resize, minimize, close) work normally. `handle.iframe` gives access
to the element; `handle.navigate(url)` and `handle.reload()` control navigation.

```js
// Open a URL-backed panel
const handle = panel.open("https://example.com", "Example", { width: 700, height: 480 });

// Listen for load / navigate events
handle.addEventListener("panelload",     e => console.log("loaded", e.detail.url));
handle.addEventListener("panelnavigate", e => console.log("navigating to", e.detail.url));

// Navigate after open
handle.navigate("https://example.com/other");

// Reload (cross-origin safe)
handle.reload();

// Access the iframe element directly (same-origin messaging, etc.)
handle.iframe.contentWindow.postMessage({ type: "ping" }, "*");
```

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | string | `"Panel"` | Caption text |
| `width` | number | `400` | Initial pixel width |
| `height` | number | `300` | Initial pixel height |
| `left` | number | `96` | Initial left offset in panel-layer coordinates |
| `top` | number | `96` | Initial top offset |
| `radius` | number | `16` | Corner radius (px) — also settable via `--panel-radius` |
| `minWidth` | number \| `"auto"` \| `"fit-content"` | `184` | Minimum width. Pass `"auto"` to remove the constraint, `"fit-content"` to match content. Writes `--panel-min-width`. |
| `minHeight` | number | `96` | Resize lower bound. Ignored when `autoheight` / `shrinkwrap` is active. |
| `maxWidth` / `maxHeight` | number | `Infinity` | Resize upper bound |
| `borderless` | boolean | `false` | Remove the panel border |
| `role` | string | `"dialog"` | ARIA role on the panel element |
| `labelledBy` | string | — | Sets `aria-labelledby` on the panel |
| `closeOnEscape` | boolean | `true` | Whether the `escapable` plugin closes on Esc |
| `keyboardMove` / `keyboardResize` | boolean | `false` | Arrow keys move/resize via `keyboard` plugin |
| `titled` | boolean | — | When `false`, the `titled` plugin hides the title text (caption strip remains). |
| `captionHeight` | string | `"22px"` | Custom caption height for `toolbar-caption`. |
| `plugins` | string[] | see [`PANEL_DEFAULTS`](#panel_defaults) | Plugin names to install. Built-ins: `focusable`, `stackable`, `draggable`, `resizable`, `closable`, `miniaturizable`, `pinnable`, `rounded`, `borderless`, `titled`, `escapable`, `keyboard`, `toolbar-caption`, `body-draggable`, `captionless`, `shrinkwrap`, `autoheight`, `anchored`, `persistable`, `snappable`. |
| `pluginOptions` | object | — | Per-plugin overrides (keyed by plugin name) |
| `coordinateSpace` | `"screen" \| "document" \| "world" \| "element"` | `"screen"` | Coordinate space the position is interpreted in (see [Coordinate spaces](#coordinate-spaces)) |
| `worldX` / `worldY` | number | — | World-space coordinates for `coordinateSpace: "world"`. If omitted, `left`/`top` are treated as world coords. |
| `anchorElement` | `HTMLElement \| string` | — | Element (or CSS selector) to anchor the panel to. Required for `coordinateSpace: "element"`. |
| `placement` | string | `"bottom"` | Placement relative to the anchor: `"top"` \| `"bottom"` \| `"left"` \| `"right"` + optional `"-start"` / `"-end"` suffix. |
| `offset` | number | `8` | Gap in px between anchor edge and panel (element-anchored panels). |
| `collisionStrategy` | `"flip" \| "shift" \| "none"` | `"flip"` | How to handle anchor-based placement overflow. `"flip"` tries the opposite side; `"shift"` clamps to viewport. |
| `followAnchor` | boolean | `true` | Whether to reposition the panel when the anchor moves (scroll, resize). |
| `persist` | string | — | localStorage key (namespaced `"panel-api:<key>"`). Auto-adds the `persistable` plugin; saves position, size, and minimized state on every change. |
| `snapThreshold` | number | `16` | Pixel distance that triggers a snap (`snappable` plugin). |
| `snapEdges` | boolean | `true` | Snap to viewport edges (`snappable` plugin). |
| `snapPanels` | boolean | `false` | Snap to other open panels' edges (`snappable` plugin). |
| `sandbox` | string | — | Value for the `<iframe sandbox>` attribute (e.g. `"allow-scripts allow-same-origin"`). Omit to leave unrestricted. |
| `allow` | string | — | Permissions policy for the iframe (`allow` attribute), e.g. `"fullscreen; clipboard-write"`. |
| `referrerPolicy` | string | — | `referrerpolicy` attribute on the iframe (e.g. `"no-referrer"`). |
| `loading` | `"eager" \| "lazy"` | `"eager"` | Controls whether the iframe loads immediately or defers until visible. |
| `iframeName` | string | — | `name` attribute on the iframe, allowing it to be targeted by `<a target>` or `window.open()`. |

---

## `PanelHandle`

The object returned from `panel.open()`. It is the stable API surface for everything you do with a panel after opening.

```js
handle.element       // the <dom-panel> custom element
handle.caption       // the caption row
handle.body          // the scrollable body container
handle.actions       // the caption actions container
handle.options       // the merged options the panel was opened with
handle.bounds        // { left, top, width, height }
handle.focused       // true while this panel is the focused panel in its stack
handle.minimized     // true if minimized
handle.pinned        // true if pinned to ZUI world coordinates
handle.closed        // true after close() has run

handle.setContent(node | string)   // replace the body
handle.setHTML(string)             // alias for setContent with a string
handle.setTitle(string)            // update the caption text
handle.replaceChildren(...nodes)   // replace body children

handle.focus()                     // request focus and bring to front
handle.moveTo(left, top)           // set absolute position
handle.moveBy(dx, dy)              // relative move
handle.resizeTo(width, height)     // set size
handle.minimize()                  // collapse to caption
handle.restore()                   // un-minimize
handle.close([detail])             // cancelable; returns true if actually closed

// IFrame API (URL-backed panels only)
handle.iframe                      // the <iframe> element, or null for content panels
handle.url                         // current URL (options.url), or null for content panels
handle.navigate(url)               // navigate to a new URL; fires cancelable panelnavigate; returns false if canceled
handle.reload()                    // reload the iframe (cross-origin safe)

// State persistence (requires persist: "key" in options)
handle.saveState()                 // write bounds + minimized to localStorage
handle.restoreState()              // read and apply saved state from localStorage

// EventTarget surface — forwards to handle.element
handle.addEventListener(type, listener[, options])
handle.removeEventListener(type, listener[, options])
handle.dispatchEvent(event)

// Legacy window.open() shim
handle.document.body               // === handle.body
```

---

## Events

All events are dispatched on the panel element (which bubbles + composes), and so are observable on `handle` as well.

| Event | Cancelable | Detail | When |
| --- | --- | --- | --- |
| `beforepanelopen` | yes | `{ handle, options }` | Before the panel is appended to the layer |
| `panelopen` | no  | `{ handle, options }` | After the panel is appended and focused |
| `beforepanelclose` | yes | `{ source? }` | Before the panel is removed |
| `panelclose` | no  | `{ source? }` | After the panel is removed |
| `panelfocus` | no  | — | When the panel gains focus |
| `panelblur` | no  | — | When the panel loses focus |
| `panelmove` | no  | `{ left, top }` | After a drag/move |
| `panelresize` | no  | `{ width, height }` | After a resize |
| `panelminimize` | no  | — | After minimize |
| `panelrestore` | no  | — | After restore |
| `panelpin` | no  | — | After pin |
| `panelunpin` | no  | — | After unpin |
| `panelanchorchange` | no  | `{ anchor }` | Reserved for element-anchored panels |
| `panelpluginerror` | no  | `{ plugin, error }` | A plugin install threw |
| `panelnavigate` | yes | `{ url }` | Before the iframe navigates to a new URL; `preventDefault()` cancels the navigation |
| `panelload` | no  | `{ url }` | The iframe `load` event fired (URL-backed panels only) |
| `panelerror` | no  | `{ url, error }` | The iframe `error` event fired (URL-backed panels only) |

Listen with `preventDefault()` on cancelable phases to veto a state change:

```js
handle.addEventListener("beforepanelclose", event => {
  if (hasUnsavedChanges) event.preventDefault();
});
```

The constants live on `PANEL_EVENTS`:

```js
import { PANEL_EVENTS } from "panel-api";
handle.addEventListener(PANEL_EVENTS.MOVE, ...);
handle.addEventListener(PANEL_EVENTS.LOAD, e => console.log("iframe loaded", e.detail.url));
handle.addEventListener(PANEL_EVENTS.NAVIGATE, e => { /* e.preventDefault() to block */ });
```

---

## New built-in plugins

### `anchored`

Positions a panel relative to a DOM element. Auto-added when `coordinateSpace: "element"` is used. Uses `computeAnchorPosition` + `applyCollisionAvoidance` from `src/core/anchor.js`.

```js
panel.open("", "Tooltip", {
  coordinateSpace: "element",
  anchorElement: document.getElementById("info-icon"),
  placement: "top",
  offset: 6,
  collisionStrategy: "flip",
  width: 260, height: 120
});
```

### `persistable`

Saves and restores panel bounds and minimized state via `localStorage`. Auto-added when `persist: "key"` is set.

```js
const handle = panel.open("", "Inspector", { persist: "inspector-v1" });
// Position/size/minimized are saved automatically on every change.

// Explicit save / restore
handle.saveState();
handle.restoreState();

// Clear programmatically
localStorage.removeItem("panel-api:inspector-v1");
```

### `snappable`

Snaps panel edges to viewport edges (and optionally other panels) while dragging. Must be listed in `plugins` manually.

```js
import { PANEL_DEFAULTS } from "panel-api";

panel.open("", "Snap me", {
  plugins: [...PANEL_DEFAULTS.plugins, "snappable"],
  snapThreshold: 16,   // px
  snapEdges: true,     // default
  snapPanels: false    // opt-in
});
```

---

## `PanelManager`

The class behind the default singleton. Construct your own if you want a separate plugin registry, a non-default panel layer, or multiple isolated managers.

```js
import { PanelManager, PluginRegistry } from "panel-api";

const registry = new PluginRegistry();
// register only what you need...
const customPanel = new PanelManager({ plugins: registry });
```

| Property / Method | Description |
| --- | --- |
| `plugins` | The `PluginRegistry` used for new panels |
| `stack` | The `PanelStack` (z-order) |
| `defaults` | Merged into options on each `open()` |
| `viewport` | The attached `PanelViewport` (or `null`) |
| `attachViewport(vp)` | Attach a ZUI viewport |
| `detachViewport()` | Remove the viewport |
| `layer` | The DOM container for screen-space panels (`position: fixed`) |
| `documentLayer` | The DOM container for document-space panels (`position: absolute` at origin) |
| `setLayer(el)` | Override the screen-space layer |
| `open(url, title, options)` | Open a panel |
| `getPanels()` | Array of open handles |
| `focusedPanel` | The currently focused handle |
| `find(target)` | Find a handle by element or id |
| `closeAll()` | Close every open panel |

The manager itself is an `EventTarget` and emits `paneladded` / `panelremoved` events with `{ detail: { handle } }`.

---

## `PluginRegistry`

```js
import { PluginRegistry } from "panel-api";

panel.plugins.has("resizable");      // boolean
panel.plugins.get("resizable");      // function | object
panel.plugins.names();               // string[]
panel.plugins.define("snap", install);
panel.plugins.delete("snap");
```

A plugin is either a function `(handle, options, signal) => teardownFn?` or an object `{ install(handle, options, signal) }`. The `signal` aborts automatically on close — use it to detach listeners:

```js
panel.plugins.define("highlight", (handle, options, signal) => {
  handle.element.addEventListener("pointerenter",
    () => handle.element.style.outline = "2px solid #f4d35e",
    { signal });
});
```

See [plugins.md](./plugins.md) for built-ins.

---

## `PANEL_DEFAULTS`

```js
import { PANEL_DEFAULTS } from "panel-api";
console.log(PANEL_DEFAULTS.plugins);
// → ["focusable","stackable","draggable","resizable","closable",
//    "miniaturizable","pinnable","rounded","titled","escapable"]
```

You can build your own manager with a tighter default set, e.g. for a strict toolbox app:

```js
const manager = new PanelManager({
  plugins: registry,
  defaults: { ...PANEL_DEFAULTS, plugins: ["focusable", "draggable", "closable", "titled"] }
});
```

---

## Declarative HTML

When `panel-api` is imported into a page, two HTML conventions activate automatically:

```html
<button paneltarget="inspector" paneltargetaction="toggle">Inspector</button>

<section id="inspector" panel
         panel-title="Inspector"
         panel-width="320" panel-height="280"
         panel-draggable panel-resizable panel-closable
         panel-focusable panel-stackable panel-titled panel-escapable>
  Anything in here becomes the panel body.
</section>
```

Actions: `open`, `close`, `toggle` (default).

Plugin attributes: `panel-draggable`, `panel-resizable`, `panel-closable`, `panel-focusable`, `panel-stackable`, `panel-miniaturizable`, `panel-pinnable`, `panel-rounded`, `panel-borderless`, `panel-titled`, `panel-escapable`.

Numeric attributes: `panel-width`, `panel-height`, `panel-left`, `panel-top`.

**Coordinate space and anchor attributes:**

```html
<!-- Element-anchored panel -->
<button id="opts-btn">Options</button>
<section id="opts-panel" panel
         panel-title="Options"
         panel-coordinate-space="element"
         panel-anchor="opts-btn"
         panel-placement="bottom"
         panel-offset="8"
         panel-draggable panel-resizable panel-closable panel-titled panel-escapable
         panel-width="300" panel-height="220">
  ...
</section>

<!-- Document-space panel -->
<section id="note" panel
         panel-title="Note"
         panel-coordinate-space="document"
         panel-top="1200"
         panel-draggable panel-closable panel-titled>
  ...
</section>
```

| Attribute | Forwards to | Notes |
| --- | --- | --- |
| `panel-coordinate-space` | `options.coordinateSpace` | `"screen"`, `"document"`, `"element"`, `"world"` |
| `panel-anchor` | `options.anchorElement` | `id` of the anchor element |
| `panel-placement` | `options.placement` | e.g. `"bottom"`, `"top-start"` |
| `panel-offset` | `options.offset` | gap in px (numeric string) |
| `panel-persist` | `options.persist` | localStorage key for state persistence |

**IFrame attributes** (URL-backed declarative panels):

```html
<section id="my-frame" panel
         panel-title="External Page"
         panel-url="https://example.com"
         panel-sandbox="allow-scripts allow-same-origin"
         panel-allow="fullscreen"
         panel-referrerpolicy="no-referrer"
         panel-draggable panel-resizable panel-closable panel-titled panel-escapable
         panel-width="700" panel-height="480">
</section>
```

| Attribute | Forwards to | Notes |
| --- | --- | --- |
| `panel-url` | `options.url` | Makes the panel URL-backed; body becomes an `<iframe>` |
| `panel-sandbox` | `options.sandbox` | Sets `<iframe sandbox>`. Empty string = all restrictions on. |
| `panel-allow` | `options.allow` | Sets `<iframe allow>` (Permissions Policy). |
| `panel-referrerpolicy` | `options.referrerPolicy` | Sets `<iframe referrerpolicy>`. |

When `panel-url` is set the section's existing DOM children are left in the `<section>` rather than moved into the panel body (which is occupied by the iframe).

When the panel closes, content panels return their children to the original `<section>` so progressive-enhancement readers still see the content.

---

## Coordinate spaces

| Space | When to use | Position interpretation |
| --- | --- | --- |
| `"screen"` | Fixed-screen panels (default) | `left`/`top` are pixel offsets from the viewport top-left |
| `"document"` | Panels that scroll with the page | `left`/`top` are pixel offsets from the document origin |
| `"world"` | Panels pinned to ZUI world coords | `worldX`/`worldY` (or `left`/`top`) are ZUI world coords; auto-pinned |
| `"element"` | Panels anchored to a DOM element | Panel positions itself via the `anchored` plugin relative to `anchorElement` |

### `coordinateSpace: "document"`

Panels are mounted in a separate `position: absolute` layer at the document origin, so they scroll with the page:

```js
panel.open("", "Note", {
  coordinateSpace: "document",
  left: 200,   // px from left edge of document
  top:  1200,  // px from top of document
  width: 300, height: 180
});

// Position next to a DOM element
const el = document.getElementById("section-heading");
panel.open("", "Annotation", {
  coordinateSpace: "document",
  left: el.offsetLeft + el.offsetWidth + 16,
  top:  el.offsetTop,
  width: 240, height: 140
});
```

### `coordinateSpace: "world"`

Panels are auto-projected from ZUI world coordinates to screen coordinates and automatically pinned. The `pinnable` plugin is added automatically.

```js
const viewport = new PanelViewport({ root, surface });
panel.attachViewport(viewport);

panel.open("", "World note", {
  coordinateSpace: "world",
  worldX: 400, worldY: 250,   // world-space coordinates
  width: 280, height: 160
});
// Panel follows the viewport as the user zooms and pans.
```

### `coordinateSpace: "element"`

Panels anchor to a DOM element via the `anchored` built-in plugin, which is added automatically.

```js
const btn = document.getElementById("settings-btn");

panel.open("", "Settings", {
  coordinateSpace: "element",
  anchorElement: btn,           // HTMLElement or CSS selector string
  placement: "bottom",          // "top"|"bottom"|"left"|"right" (+ "-start"/"-end")
  offset: 8,                    // gap in px
  collisionStrategy: "flip",    // "flip"|"shift"|"none"
  followAnchor: true,           // re-position when anchor moves
  width: 320, height: 240
});
```

Placement suffixes control cross-axis alignment:

| Placement | Panel aligns to |
| --- | --- |
| `"bottom"` | Centered below the anchor |
| `"bottom-start"` | Left-aligned below the anchor |
| `"bottom-end"` | Right-aligned below the anchor |
| `"top"`, `"top-start"`, `"top-end"` | Above the anchor (same alignment variants) |
| `"left"`, `"left-start"`, `"left-end"` | To the left (vertically centered, top- or bottom-aligned) |
| `"right"`, `"right-start"`, `"right-end"` | To the right |

Collision strategies:

| Strategy | Behaviour |
| --- | --- |
| `"flip"` (default) | Try the opposite side if preferred side clips; then shift |
| `"shift"` | Clamp to viewport without flipping |
| `"none"` | No adjustment |

---

## Errors

Plugin installation errors are caught and emitted as `panelpluginerror` events on the panel element; the rest of the panel continues to work. Programmatic errors thrown from public methods follow normal DOM semantics (uncaught exceptions).

The formal error class hierarchy from the [roadmap](../ROADMAP.md) (`PanelNotAllowedError`, `PanelClosedError`, etc.) is **not yet implemented** — using these names will be a future addition.
