# Panel API

> Open panels in websites with minimal code.

Floating, draggable, resizable, focusable, stackable panels for the web — and an optional ZUI (zooming user interface) layer for panning/zooming worlds. Plain ESM, no build step, no dependencies.

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

## Three integration paths

| Need | Use |
| --- | --- |
| Floating panels on an existing page | [`tutorials/01-cdn-no-zui.html`](./tutorials/01-cdn-no-zui.html) |
| Panels + a sibling ZUI surface you own | [`tutorials/02-cdn-with-zui.html`](./tutorials/02-cdn-with-zui.html) |
| Wrap an existing page into a ZUI surface | [`tutorials/03-cdn-zui-framing.html`](./tutorials/03-cdn-zui-framing.html) |

## File map

```
panel-api/
├── index.js                     # default singleton + named exports
├── zui.js                       # PanelViewport, framePage, attachZUI
├── src/
│   ├── core/                    # manager, handle, element, stack,
│   │                              options, events, declarative, cqu, styles
│   ├── plugins/                 # focusable, stackable, draggable, resizable,
│   │                              closable, miniaturizable, pinnable, rounded,
│   │                              borderless, titled, escapable, keyboard
│   └── zui/                     # viewport, interactions, frame-page
├── demos/                       # local demos (open via http-server)
├── tutorials/                   # CDN-based copy/paste integration tutorials
├── docs/
│   ├── api.md                   # Manager, Handle, options, events
│   ├── plugins.md               # Built-in plugins, writing your own
│   ├── zui.md                   # PanelViewport, framePage, coordinate spaces
│   └── styling.md               # Theming via variables and parts
├── demo.html                    # legacy single-file demo (kept for reference)
└── TODO.md                      # full design roadmap (MDN-style spec target)
```

## Quick reference

```js
import panel from "panel-api";

// open a panel
const handle = panel.open("", "Inspector", {
  width: 420, height: 360, left: 80, top: 80,
  plugins: ["focusable", "stackable", "draggable", "resizable",
            "closable", "miniaturizable", "titled", "escapable"]
});

// imperative surface
handle.setContent(node);
handle.setHTML("<p>...</p>");
handle.setTitle("Renamed");
handle.moveTo(x, y);
handle.resizeTo(w, h);
handle.minimize(); handle.restore();
handle.close();

// events
handle.addEventListener("beforepanelclose", e => { if (dirty) e.preventDefault(); });
handle.addEventListener("panelmove", e => console.log(e.detail));
```

## ZUI

```js
import panel from "panel-api";
import { framePage } from "panel-api/zui";

const viewport = framePage();      // wraps document.body content
panel.attachViewport(viewport);    // panels now know about ZUI

panel.open("", "Hello", { width: 320 }).setHTML("Hi!");
```

See [`docs/zui.md`](./docs/zui.md) for the manual root/surface pattern and coordinate spaces.

## Plugins

Every behaviour is a plugin. Define your own:

```js
import panel from "panel-api";

panel.plugins.define("highlight", (handle, options, signal) => {
  handle.element.addEventListener("pointerenter",
    () => handle.element.style.outline = "2px solid #f4d35e",
    { signal });
});

panel.open("", "Highlighted", { plugins: [
  "focusable", "stackable", "draggable", "closable", "titled", "highlight"
]});
```

See [`docs/plugins.md`](./docs/plugins.md).

## Styling

Theme everything via CSS variables and shadow parts:

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

## Design

This is an implementation of a *standards-leaning* Panel API. The full design rationale lives in [`TODO.md`](./TODO.md). Highlights:

* Small core (lifecycle, identity, layer, events, coordinate conversion).
* First-class plugin model — every interaction is opt-in and replaceable.
* Pointer Events (works for mouse, pen, touch).
* `AbortSignal` for plugin cleanup — leak-free by construction.
* Cancelable lifecycle events (`beforepanelopen`, `beforepanelclose`).
* CSS variables and shadow parts — no design lock-in.
* ZUI is a wisely-separate sibling module, with a documented contract panels respect.

## License

MIT
