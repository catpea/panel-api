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

The `url` argument exists for `window.open()` familiarity. URL-backed (iframe) panels are a planned future feature; for now any non-empty `url` is logged and ignored.

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
| `plugins` | string[] | see [`PANEL_DEFAULTS`](#panel_defaults) | Plugin names to install. Built-ins: `focusable`, `stackable`, `draggable`, `resizable`, `closable`, `miniaturizable`, `pinnable`, `rounded`, `borderless`, `titled`, `escapable`, `keyboard`, `toolbar-caption`, `body-draggable`, `captionless`, `shrinkwrap`, `autoheight`. |
| `coordinateSpace` | `"screen" \| "document" \| "world" \| "element"` | `"screen"` | Coordinate space the position is interpreted in |
| `pluginOptions` | object | — | Per-plugin overrides (keyed by plugin name) |

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
| `layer` | The DOM container for panels (auto-created) |
| `setLayer(el)` | Override the layer |
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

When the panel closes, its children are returned to the original `<section>` so progressive-enhancement readers still see the content.

---

## Coordinate spaces

| Space | When to use | Position interpretation |
| --- | --- | --- |
| `"screen"` | Fixed-screen panels (default) | `left`/`top` are pixel offsets in the panel layer (viewport-relative) |
| `"document"` | Panels that scroll with the page | reserved — not yet implemented |
| `"world"` | Panels pinned to ZUI world coords | Use the `pinnable` plugin to opt in at runtime |
| `"element"` | Panels anchored to a DOM element | reserved — not yet implemented |

For now, the recommended pattern for world-anchored panels is:

```js
const screen = viewport.worldToScreen(worldX, worldY);
const handle = panel.open("", "Note", { left: screen.x, top: screen.y });
handle.actions.querySelector("[data-pin]").click();
```

---

## Errors

Plugin installation errors are caught and emitted as `panelpluginerror` events on the panel element; the rest of the panel continues to work. Programmatic errors thrown from public methods follow normal DOM semantics (uncaught exceptions).

The formal error class hierarchy from the [roadmap](../ROADMAP.md) (`PanelNotAllowedError`, `PanelClosedError`, etc.) is **not yet implemented** — using these names will be a future addition.
