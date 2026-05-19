# Panel API · Roadmap

The Panel API is designed to be a durable application-chrome API — not just a "better popup." The standard is: small core, strong lifecycle model, declarative + imperative entry points, plugin extensibility, accessibility built in, and explicit ZUI coordinate semantics.

---

## Current state (v1.x — Level 1 stable core)

**Core**
- `PanelManager`, `PanelHandle`, `PanelStack`, `PluginRegistry`
- `panel.open()` with three calling conventions
- Cancelable lifecycle events: `beforepanelopen`, `panelopen`, `beforepanelclose`, `panelclose`
- `panelmove`, `panelresize`, `panelfocus`, `panelblur`, `panelminimize`, `panelrestore`, `panelpin`, `panelunpin`
- Declarative HTML (`panel`, `paneltarget`, `panel-*` attributes)
- CSS variables, shadow parts, `container-type: inline-size` body

**Built-in plugins**
- Interaction: `focusable`, `stackable`, `draggable`, `resizable`, `body-draggable`, `keyboard`
- Chrome: `closable`, `miniaturizable`, `escapable`, `titled`, `toolbar-caption`, `captionless`, `rounded`, `borderless`
- Sizing: `autoheight` (ResizeObserver-based), `shrinkwrap`
- ZUI: `pinnable`

**ZUI module (`panel-api/zui`)**
- `PanelViewport` — zoom/pan with `screenToWorld` / `worldToScreen`
- `framePage` — wrap any page in a ZUI surface
- `wireInteractions` — pointer + wheel input with `ignoreSelector`
- `wireZuiPointerEvents` — world-space `zuipointer*` custom events
- `createViewportLock` — disable/re-enable pan+zoom for world-element drags

**Testing**
- Playwright / headless Firefox test suite (`npm test`)

---

## Level 2 — ZUI-ready (planned)

- `coordinateSpace: "world"` directly on `panel.open()` (auto-project via `worldToScreen`)
- Element-anchored panels (`coordinateSpace: "element"`, `placement`, `offset`)
- Collision avoidance — auto-reposition panels to avoid covering content or the pointer
- State persistence (`persist: "key"` + `saveState` / `restoreState`)
- Document-space panels (scroll with page)

---

## Level 3 — Application-grade (planned)

- Snap-to-edges and snap-to-panels
- Docking (sidebar, bottom bar)
- Tabbed panel groups
- Panel workspaces (save/restore named layouts)
- URL / iframe-backed panels (content isolation model)

---

## Level 4 — Web-platform polish (aspirational)

- Full declarative HTML attributes with DOM property reflection
- Formal spec algorithms (cancelable phases, event ordering)
- Accessibility authoring guide (roving tabindex, ARIA patterns)
- Security model for cross-origin panel content
- MDN-style reference pages with compatibility tables
- Formal error hierarchy: `PanelNotAllowedError`, `PanelClosedError`, `PanelPluginError`, etc.

---

## Design principles

- **Small core.** Lifecycle, identity, layer, events, coordinate conversion only.
- **Plugin model.** Every interaction is opt-in and replaceable. Third-party plugins are first-class.
- **Pointer Events.** Single input model for mouse, pen, and touch.
- **`AbortSignal` everywhere.** Plugin teardown is structural — event leaks are impossible by design.
- **No `!important` hacks.** Sizing plugins (`autoheight`, `shrinkwrap`) use ResizeObserver; plugins communicate intent via `data-*` attributes.
- **CSS variables and shadow parts.** No design lock-in. Authors control visual design.
- **ZUI is a sibling.** The core has zero compile-time dependency on the ZUI module.
