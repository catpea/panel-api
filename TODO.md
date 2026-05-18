The **Panel API** should become a durable application-chrome API, not just a “better popup.” The standard should be: small core, strong lifecycle model, declarative + imperative entry points, plugin extensibility, accessibility built in, and explicit ZUI coordinate semantics.

MDN’s Web API reference treats APIs as named specifications with defined interfaces, methods, properties, events, examples, and compatibility data; that is the documentation shape the Panel API should target from the start. ([MDN Web Docs][1])

## 1. Define the Panel API’s exact scope

The Panel API should sit between **Popover API**, **Dialog**, and **Window-like UI**.

Popover is already the platform’s lightweight non-modal overlay mechanism, with HTML attributes, JS methods, toggle events, and `:popover-open`; MDN also distinguishes non-modal popovers from modal `<dialog>` use cases. ([MDN Web Docs][2])

So Panel API should define itself as:

> A persistent, movable, optionally resizable UI surface that floats above page/application content and may be anchored to the screen, document, element, or ZUI world coordinate space.

That distinction matters. Panels are not tooltips, not menus, not modals, not browser windows. They are **in-page floating workspaces**.

## 2. Add a real interface model

Keep the friendly `panel.open()` style, but formalize the returned object.

Recommended interfaces:

```js
const handle = panel.open("", "Inspector", {
  width: 420,
  height: 360,
  left: 80,
  top: 80,
  plugins: ["titled", "closable", "resizable", "draggable", "stackable"]
});
```

Core interfaces:

```js
PanelManager
PanelHandle
PanelOptions
PanelState
PanelPlugin
PanelViewport
PanelAnchor
PanelBounds
PanelEvent
```

The current `newPanel.document.body.innerHTML = ...` facade is useful for `window.open()` familiarity, but the forward-looking API should prefer:

```js
handle.setContent(node);
handle.setHTML(trustedHTML);
handle.replaceChildren(...nodes);
handle.close();
handle.focus();
handle.moveTo(x, y);
handle.resizeTo(width, height);
handle.minimize();
handle.restore();
handle.pin(anchor);
handle.unpin();
```

`innerHTML` should remain possible, but not be the recommended path.

## 3. Support both imperative and declarative usage

A high-standard Web API should not require JavaScript for every common operation. Popover succeeds partly because it has both HTML attributes and JavaScript control. ([MDN Web Docs][2])

Proposed declarative form:

```html
<button paneltarget="inspector" paneltargetaction="toggle">
  Inspector
</button>

<section
  id="inspector"
  panel
  panel-title="Inspector"
  panel-resizable
  panel-draggable
  panel-closable
  panel-stackable>
  ...
</section>
```

Proposed DOM reflection:

```js
element.panel === "manual";
button.panelTargetElement === element;
button.panelTargetAction === "toggle";
```

This makes Panel API feel native, testable, accessible, and progressive.

## 4. Formalize ZUI coordinate spaces

This is the biggest design requirement. The Panel API must explicitly model coordinate spaces.

Recommended coordinate spaces:

```ts
type PanelCoordinateSpace =
  | "screen"       // fixed to viewport; does not zoom
  | "document"     // scrolls with page
  | "world"        // follows ZUI world coordinates
  | "element";     // anchored to an element
```

Example:

```js
panel.open("", "Inspector", {
  coordinateSpace: "screen",
  left: 24,
  top: 24
});

panel.open("", "Node Details", {
  coordinateSpace: "world",
  worldX: 1200,
  worldY: 640
});

panel.open("", "Selection Tools", {
  anchor: selectedElement,
  placement: "right-start",
  offset: 12
});
```

The ZUI layer should expose a formal viewport interface:

```js
const viewport = new PanelViewport(surface);

viewport.setZoom(1.5);
viewport.panBy(100, 20);
viewport.screenToWorld(x, y);
viewport.worldToScreen(x, y);

viewport.addEventListener("viewportchange", ...);
```

Internally, use `DOMMatrixReadOnly` or equivalent matrix math rather than separate `x`, `y`, `zoom` forever. That makes future rotate/skew/device-pixel-ratio support possible.

## 5. Make the plugin model first-class

Your current insight is correct: resizable, focusable, stack order, borderless, titled, closable, miniaturizable, rounded, pinnable, and draggable should be plugins. The core should only manage lifecycle, identity, layer, events, and coordinate conversion.

Recommended plugin registry:

```js
panel.plugins.define("resizable", {
  install(handle, options, signal) {
    // signal aborts automatically on panel close
  }
});
```

Plugin requirements:

```js
panel.plugins.has("resizable");
panel.plugins.get("resizable");
panel.plugins.define("snap", plugin);
panel.plugins.delete("snap");
```

Every plugin should receive an `AbortSignal` so cleanup is automatic:

```js
install(panel, options, signal) {
  panel.element.addEventListener("pointerdown", onDown, { signal });
}
```

This prevents global listener leaks, which are a common failure mode in floating UI systems.

## 6. Add lifecycle events with cancelable phases

A native-grade API needs predictable events.

Recommended events:

```txt
beforepanelopen      cancelable
panelopen
beforepanelclose     cancelable
panelclose
panelfocus
panelblur
panelmove
panelresize
panelminimize
panelrestore
panelpin
panelunpin
panelanchorchange
panelpluginerror
```

Example:

```js
handle.addEventListener("beforepanelclose", event => {
  if (hasUnsavedChanges) event.preventDefault();
});
```

Use event naming that feels like DOM: state changes should have `before...` and after events where cancellation matters.

## 7. Improve focus, keyboard, and accessibility behavior

The Panel API should define keyboard semantics, not leave them to each plugin.

Minimum standard behavior:

```txt
Esc closes, unless close behavior is disabled.
Tab stays inside modal panels only.
Non-modal panels do not trap focus.
Alt/Option + drag caption moves panel.
Arrow keys can move focused panel.
Shift + Arrow resizes focused resizable panel.
Panel caption has accessible name.
Toolbox panels can use toolbar semantics.
Clock/info panels can use region/status semantics.
```

Recommended options:

```js
panel.open("", "Toolbox", {
  role: "toolbar",
  labelledBy: "toolbox-title",
  keyboardMove: true,
  keyboardResize: true,
  closeOnEscape: true
});
```

Also add accessibility-aware defaults:

```txt
prefers-reduced-motion support
high-contrast-safe outlines
minimum pointer target sizes
roving tabindex for toolboxes
ARIA state reflection for minimized/pinned states
```

## 8. Add layout constraints, snapping, docking, and collision handling

Panels need spatial discipline once users open more than one.

Recommended features:

```js
panel.open("", "Inspector", {
  minWidth: 280,
  minHeight: 180,
  maxWidth: "80vw",
  maxHeight: "80vh",
  constrainTo: "viewport",
  snap: true,
  snapDistance: 12,
  dockable: ["left", "right", "bottom"]
});
```

Useful enhancements:

```txt
snap to viewport edges
snap to other panels
dock as sidebars
tabbed panel groups
panel groups / workspaces
auto-cascade new panels
restore previous panel positions
avoid covering selected element
avoid covering pointer/caret
```

## 9. Use ResizeObserver and container sizing as core infrastructure

Your CQU direction is right. Panels need layouts based on their own size, not the viewport. ResizeObserver is the correct fallback/companion because it is designed to observe element size changes efficiently, avoiding brittle window-resize-only approaches. ([MDN Web Docs][3])

Recommended built-in variables:

```css
dom-panel {
  --panel-width: 420px;
  --panel-height: 320px;
  --panel-cqw: 4.2px;
  --panel-cqh: 3.2px;
  --panel-scale: 1;
}
```

Expose:

```js
handle.bounds;
handle.contentBoxSize;
handle.borderBoxSize;
handle.observeResize(callback);
```

This lets panel contents scale elegantly without coupling to the page viewport.

## 10. Use Pointer Events, not mouse-only events

Dragging, resizing, docking, and pinning should be implemented on Pointer Events. Pointer Events give a single input model for mouse, pen, and touch, and pointer capture keeps a drag/resize interaction routed to the right element even when the pointer moves outside the element. ([MDN Web Docs][4])

Recommended interaction rules:

```txt
Use pointerdown / pointermove / pointerup.
Use setPointerCapture during drag and resize.
Avoid document-level listeners unless necessary.
Use touch-action intentionally.
Batch layout updates in requestAnimationFrame.
```

## 11. Add safe content and isolation modes

A serious Panel API should not normalize arbitrary `innerHTML`.

Recommended content modes:

```js
handle.setContent(node);
handle.setHTML(trustedHTML);
handle.load(url, { sandbox: true });
handle.attachShadow({ mode: "open" });
```

Options:

```js
panel.open("/tools/inspector.html", "Inspector", {
  contentMode: "iframe",
  sandbox: "allow-scripts allow-forms",
  credentialless: true
});
```

For same-page panels, recommend `DocumentFragment`, `HTMLElement`, or `TrustedHTML`. For URL-backed panels, use an iframe-like security model unless same-origin integration is explicitly requested.

## 12. Add state persistence without forcing it

Panels often need to remember size, position, minimized state, dock state, and pinned state.

Recommended API:

```js
const inspector = panel.open("", "Inspector", {
  persist: "workspace.inspector"
});

inspector.saveState();
inspector.restoreState();
inspector.clearState();
```

State should be opt-in. Default persistence can surprise users and leak workflow information.

## 13. Add top-layer and modality policy

Fullscreen API is a useful model because it exposes explicit enter/exit methods, state properties, events, and access control concepts. ([MDN Web Docs][5])

Panels should similarly define:

```js
handle.requestTopLayer();
handle.exitTopLayer();
panel.topPanel;
panel.focusedPanel;
panel.getPanels();
```

But modality should be explicit:

```js
panel.open("", "Confirm Delete", {
  modal: true
});
```

For truly modal UI, the API should either delegate to `<dialog>` semantics or implement equivalent inert/focus-trap behavior. Non-modal should remain the default.

## 14. Add CSS hooks and theming contracts

Recommended selectors and parts:

```css
dom-panel:panel-open {}
dom-panel:panel-focused {}
dom-panel:panel-minimized {}
dom-panel:panel-pinned {}

dom-panel::part(caption) {}
dom-panel::part(title) {}
dom-panel::part(actions) {}
dom-panel::part(body) {}
dom-panel::part(resize-handle) {}
```

Recommended CSS custom properties:

```css
dom-panel {
  --panel-radius: 24px;
  --panel-background: Canvas;
  --panel-color: CanvasText;
  --panel-shadow: ...;
  --panel-caption-height: 48px;
  --panel-z-index: auto;
}
```

Avoid hard-coded design assumptions. The API should provide structure and behavior; authors should control visual design.

## 15. Add panel relationships

Panels often relate to selected elements, tools, or other panels.

Recommended features:

```js
handle.anchorTo(element, {
  placement: "right-start",
  offset: 8,
  followScroll: true,
  followZoom: false
});

handle.setOwner(element);
handle.ownerElement;
handle.invokerElement;
```

This enables inspector panels, property panels, contextual toolboxes, teaching overlays, and component editors.

## 16. Add a formal error model

Do not fail silently.

Recommended errors:

```txt
PanelNotAllowedError
PanelPluginError
PanelContentSecurityError
PanelCoordinateSpaceError
PanelClosedError
PanelConstraintError
```

Example:

```js
try {
  await handle.load(crossOriginURL);
} catch (error) {
  if (error.name === "PanelContentSecurityError") ...
}
```

## 17. Add testing requirements early

Create a Web-Platform-Test-style matrix now.

Minimum tests:

```txt
panel.open() returns a PanelHandle
panel.close() dispatches beforepanelclose and panelclose
beforepanelclose can cancel close
focus brings panel to top
drag works under page zoom
drag works under ZUI zoom
resize works with pointer capture
pinned world panels follow viewport transform
screen panels do not zoom
element-anchored panels follow element movement
Esc closes closable panels
minimized panels preserve previous bounds
plugins clean up listeners on close
declarative paneltarget toggles panel
shadow DOM panel content works
RTL positioning works
touch input works
keyboard move/resize works
```

## 18. Suggested feature roadmap

**Level 1: Stable core**

```txt
panel.open()
PanelHandle
close/focus/moveTo/resizeTo
titled/closable/focusable/stackable/draggable/resizable plugins
screen coordinate panels
events
CSS parts and variables
accessibility defaults
```

**Level 2: ZUI-ready**

```txt
PanelViewport
screen/world coordinate conversion
pinned world panels
element anchoring
collision handling
container-query-unit fallback
state persistence
```

**Level 3: Application-grade**

```txt
docking
snap lines
panel groups
tabbed panels
workspaces
URL/iframe-backed panels
plugin marketplace/registry pattern
keyboard command integration
```

**Level 4: Web-platform polish**

```txt
declarative HTML attributes
DOM property reflection
formal spec algorithms
compatibility tables
accessibility authoring practices
security model
MDN-style reference pages
```

[1]: https://developer.mozilla.org/en-US/docs/Web/API "Web APIs | MDN"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/Popover_API "Popover API - Web APIs | MDN"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API "Resize Observer API - Web APIs | MDN"
[4]: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events "Pointer events - Web APIs | MDN"
[5]: https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API "Fullscreen API - Web APIs | MDN"
