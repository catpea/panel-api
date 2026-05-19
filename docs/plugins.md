# Panel API · Plugins

The Panel API core manages identity, lifecycle, and coordinate conversion — nothing more. Every user-visible behaviour is a plugin: drag, resize, close, minimize, pin, focus, stack order, keyboard control, even the title appearance.

This design has three consequences:

1. **You only pay for what you use.** Open a panel without `draggable` and it cannot be dragged.
2. **Third parties can ship new behaviours.** Snap-to-edges, docking, magnetic anchoring — all viable as standalone plugins that piggyback on the core lifecycle.
3. **Plugin code is small and testable.** Each plugin owns one concern and uses an `AbortSignal` for automatic teardown.

## Plugin signature

```js
function plugin(handle, options, signal) {
  // install behaviour
}
```

| Argument | What it is |
| --- | --- |
| `handle` | The `PanelHandle` for this panel |
| `options` | The merged option bag for this panel (or `pluginOptions[name]` if provided) |
| `signal` | An `AbortSignal` that fires when the panel closes |

Plugins may also be defined as objects with an `install` method:

```js
panel.plugins.define("snap", {
  install(handle, options, signal) { ... }
});
```

A plugin may optionally return a teardown function for DOM-level cleanup (the signal handles event listeners automatically):

```js
panel.plugins.define("hud", (handle, options, signal) => {
  const hud = document.createElement("div");
  handle.element.append(hud);
  return () => hud.remove();
});
```

---

## Built-in plugins

### Interaction

#### `focusable`
Pointer interactions and DOM focus events promote this panel via `panelrequestfocus`. Emits `panelfocus` / `panelblur`.

#### `stackable`
Listens for `panelrequestfocus` and asks the `PanelStack` to bring this panel to the front. Writes `--panel-z` on the element.

#### `draggable`
Drag the panel by its caption. Uses Pointer Events + `setPointerCapture` so drags survive the cursor leaving the panel.

#### `body-draggable`
Drag the panel by its body instead of (or in addition to) the caption. Ignores interactive elements (`button`, `a`, `input`, `textarea`, `select`, `[contenteditable]`). Useful with `captionless` panels.

#### `resizable`
Adds a bottom-right grip; respects `minWidth`, `minHeight`, `maxWidth`, `maxHeight` options. When the `autoheight` plugin is also active (`[data-autoheight]` is present on the panel), height writes are skipped and the grip cursor switches to `ew-resize` — only width is user-controllable.

#### `keyboard`
**Opt-in** via `keyboardMove: true` / `keyboardResize: true`. Arrow keys move the focused panel; Alt + arrows resize. Shift multiplies the step size.

### Chrome

#### `closable`
Adds a close button to the caption. Calls `handle.close()` which dispatches the cancelable `beforepanelclose` event.

#### `miniaturizable`
Adds a minimize button. Toggles `data-minimized` on the element; CSS hides the body and resize handle.

#### `pinnable`
Adds a pin button. When pinned, the panel records its position in **world** coordinates (via the attached `PanelViewport`) and re-projects on every `viewportchange`.

#### `titled`
Declares that the panel has a title. Use `options.titled === false` to hide the title text while keeping the caption strip (drag bar + action buttons) intact. To remove the entire caption, use `captionless` instead.

#### `toolbar-caption`
Reduces the caption height to `22px` (or a custom value via `options.captionHeight`). Use with `titled: false` for compact toolbox panels.

#### `captionless`
Hides the entire caption strip and sets `--panel-caption-height: 0px`. Use with `body-draggable` and `autoheight` for chrome-free panels.

#### `escapable`
Press Escape while the panel is focused to close it. Honors `options.closeOnEscape` (default `true`).

#### `rounded`
Applies `options.radius` (or `24`) to `--panel-radius`. Cosmetic shorthand.

#### `borderless`
Sets `data-borderless="true"` on the panel element, which the default stylesheet maps to `border: 0`. Pair with `rounded` for floating-pill panels.

### Sizing

#### `autoheight`
**ResizeObserver-based content-driven height.** Sets `[data-autoheight]` on the panel and switches the body to `height: auto; overflow: visible`. A `ResizeObserver` on the body keeps `panel.style.height` in sync with `captionH + body.offsetHeight` on every layout change (including flex-wrap reflow). The `resizable` plugin respects `[data-autoheight]` and skips height writes, so width remains user-controllable.

```js
panel.open("", "", {
  width: 192, minWidth: 134,
  plugins: ["resizable", "captionless", "autoheight", "body-draggable"]
});
```

#### `shrinkwrap`
Identical to `autoheight`, with one addition: when no explicit `minWidth` option is given, `--panel-min-width` is set to `fit-content` so the panel never collapses narrower than its content. Use `autoheight` when you manage `minWidth` yourself (e.g., toolboxes).

---

## Writing a plugin

A worked example — a `snap` plugin that snaps the panel to viewport edges after a drag:

```js
import panel, { PANEL_EVENTS } from "panel-api";

panel.plugins.define("snap", (handle, options, signal) => {
  const distance = options.snapDistance ?? 16;

  const onMove = () => {
    const { left, top, width, height } = handle.bounds;
    const right  = window.innerWidth  - (left + width);
    const bottom = window.innerHeight - (top + height);

    let nextLeft = left, nextTop = top;
    if (left   < distance) nextLeft = 0;
    else if (right  < distance) nextLeft = window.innerWidth  - width;
    if (top    < distance) nextTop  = 0;
    else if (bottom < distance) nextTop  = window.innerHeight - height;

    if (nextLeft !== left || nextTop !== top) handle.moveTo(nextLeft, nextTop);
  };

  handle.element.addEventListener(PANEL_EVENTS.MOVE, onMove, { signal });
});

panel.open("", "Snappy", { plugins: ["draggable", "closable", "titled", "snap"] });
```

Plugin best practices:

* Use `{ signal }` on every `addEventListener` call — it's your teardown for free.
* Use `data-*` attributes for plugin state — inspectable in devtools, queryable from CSS.
* Add caption buttons via `handle.element.addAction(name, icon, label, handler)` — the button gets `part="action <name>-action"` for consumer theming.
* Check `[data-autoheight]` in sizing plugins that would otherwise write `panel.style.height` directly.

---

## Picking a smaller default set

The default singleton ships every built-in. For a stricter app, build your own manager:

```js
import { PanelManager, PluginRegistry, PANEL_DEFAULTS } from "panel-api";
import draggable from "panel-api/plugins/draggable";
import closable  from "panel-api/plugins/closable";
import titled    from "panel-api/plugins/titled";

const plugins = new PluginRegistry();
plugins.define("draggable", draggable);
plugins.define("closable",  closable);
plugins.define("titled",    titled);

const minimal = new PanelManager({
  plugins,
  defaults: { ...PANEL_DEFAULTS, plugins: ["draggable", "closable", "titled"] }
});
```

---

## Toolbox patterns

See `demos/04-toolbox.html` for three production-grade variants:

```js
const CELL = 48, GAP = 10, PAD = 14; // PAD = --panel-body-padding
function colsWidth(n) { return n * CELL + (n - 1) * GAP + PAD * 2; }

// A — compact caption, fixed grid, autoheight drives height
panel.open("", "", {
  width: colsWidth(2), minWidth: "auto", radius: 22,
  plugins: ["draggable", "rounded", "borderless",
            "titled", "toolbar-caption", "autoheight"],
  titled: false
});

// B — captionless, body-draggable
panel.open("", "", {
  width: colsWidth(2), minWidth: "auto", radius: 22,
  plugins: ["rounded", "borderless", "captionless",
            "autoheight", "body-draggable"]
});

// C — flex-wrap, resizable width, autoheight tracks reflow
panel.open("", "", {
  width: colsWidth(3), minWidth: colsWidth(2), radius: 22,
  plugins: ["resizable", "rounded", "borderless",
            "captionless", "autoheight", "body-draggable"]
});
```
