# Panel API · Plugins

The Panel API core manages identity, lifecycle, and coordinate conversion — nothing more. Every user-visible behaviour is a plugin: drag, resize, close, minimize, pin, focus, stack order, keyboard control, even the title appearance.

This design has three consequences:

1. **You only pay for what you use.** Open a panel without `draggable` and it cannot be dragged. Open one without `closable` and it has no close button.
2. **Third parties can ship new behaviours.** Snap-to-edges, docking, magnetic anchoring, tabbed groups — all viable as standalone plugins that piggyback on the core lifecycle.
3. **Plugin code is small and testable.** Each plugin owns one concern and uses an `AbortSignal` for automatic teardown, so leaks are structurally unlikely.

## Plugin signature

```js
function plugin(handle, options, signal) {
  // ...
}
```

| Argument | What it is |
| --- | --- |
| `handle` | The `PanelHandle` for this panel |
| `options` | The merged option bag for this panel (or `pluginOptions[name]` if provided) |
| `signal` | An `AbortSignal` that fires when the panel closes |

Plugins may also be defined as objects with an `install` method of the same signature:

```js
panel.plugins.define("snap", {
  install(handle, options, signal) { ... }
});
```

A plugin may optionally return a teardown function. The signal handles event listeners automatically; the teardown is for DOM cleanup or other side-effects:

```js
panel.plugins.define("hud", (handle, options, signal) => {
  const hud = document.createElement("div");
  handle.element.append(hud);
  return () => hud.remove();      // signal also already detached listeners
});
```

## Built-in plugins

### `focusable`
Pointer interactions and DOM focus events promote this panel via `panelrequestfocus`. Emits `panelfocus` / `panelblur`.

### `stackable`
Listens for `panelrequestfocus` and asks the `PanelStack` to bring this panel to the front. Set `--panel-z` on the element.

### `draggable`
Drag the panel by its caption. Uses Pointer Events + `setPointerCapture` so drags survive cursors leaving the panel.

### `resizable`
Adds a bottom-right grip; respects `minWidth`, `minHeight`, `maxWidth`, `maxHeight` options.

### `closable`
Adds a close button to the caption. Calls `handle.close()` which dispatches the cancelable `beforepanelclose` event.

### `miniaturizable`
Adds a minimize button. Toggles `data-minimized` on the element; CSS hides the body and resize handle. Use the matching `panelminimize` / `panelrestore` events.

### `pinnable`
Adds a pin button. When pinned, the panel records its screen position in **world** coordinates (via the attached `PanelViewport`) and re-projects on every `viewportchange`. Without a viewport attached this plugin still installs but pinning is a visual-only state.

### `rounded`
Applies `options.radius` (or `24`) to `--panel-radius`. Mostly a cosmetic convenience.

### `borderless`
Sets `data-borderless="true"` to remove the panel border. Pair with `rounded` for floating-pill panels.

### `titled`
The shell always renders a title; this plugin is the explicit declaration that the panel is titled. Use `options.titled === false` to hide the title row.

### `escapable`
Press Escape while the panel is focused → close. Honors `options.closeOnEscape` (default `true`).

### `keyboard`
**Opt-in** (`keyboardMove: true`, `keyboardResize: true`). Arrow keys move the focused panel (Shift = larger step). Alt + arrows resize.

## Writing a plugin

A worked example — a `snap` plugin that snaps the panel to viewport edges after a drag:

```js
import panel, { PANEL_EVENTS } from "panel-api";

panel.plugins.define("snap", (handle, options, signal) => {
  const distance = options.snapDistance ?? 16;

  const onMove = () => {
    const { left, top, width, height } = handle.bounds;
    const right = window.innerWidth - (left + width);
    const bottom = window.innerHeight - (top + height);

    let nextLeft = left, nextTop = top;
    if (left < distance) nextLeft = 0;
    else if (right < distance) nextLeft = window.innerWidth - width;
    if (top < distance) nextTop = 0;
    else if (bottom < distance) nextTop = window.innerHeight - height;

    if (nextLeft !== left || nextTop !== top) handle.moveTo(nextLeft, nextTop);
  };

  handle.element.addEventListener(PANEL_EVENTS.MOVE, onMove, { signal });
});

panel.open("", "Snappy", { plugins: ["draggable", "closable", "titled", "snap"] });
```

Plugin authors are encouraged to:

* Use the `signal` rather than manual teardown bookkeeping.
* Use `data-*` attributes (e.g., `data-snap-edge`) for plugin state — keeps it inspectable in devtools and queryable from CSS.
* Document any new caption action via `addAction(name, icon, label, handler)`; the action element receives `[part="action <name>-action"]` so consumers can theme it.
* Avoid touching `handle.bodyElement.innerHTML` from inside a plugin unless that *is* the plugin's job (a content-area plugin). Other plugins should let users supply content via `setContent`.

## Picking a smaller default set

The default singleton ships every built-in. For a stricter app, build your own manager:

```js
import { PanelManager, PluginRegistry, PANEL_DEFAULTS } from "panel-api";
import draggable from "panel-api/plugins/draggable";
import closable from "panel-api/plugins/closable";
import titled from "panel-api/plugins/titled";

const plugins = new PluginRegistry();
plugins.define("draggable", draggable);
plugins.define("closable", closable);
plugins.define("titled", titled);

const minimal = new PanelManager({
  plugins,
  defaults: { ...PANEL_DEFAULTS, plugins: ["draggable", "closable", "titled"] }
});
```
