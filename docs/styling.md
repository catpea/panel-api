# Panel API · Styling

Panel API ships a complete, theme-able stylesheet at first import. Override visuals via **CSS custom properties** (variables) and **shadow parts**. The host page never needs to know panel internals.

Three scopes for overrides, in increasing specificity:

1. **Globally** — declare variables on `:root` or `dom-panel` to affect every panel.
2. **By class/theme** — add a class to selected panels.
3. **Inline** — `handle.element.style.setProperty("--panel-...", "...")`.

---

## CSS variables

### Panel surface

| Variable | Default | Purpose |
| --- | --- | --- |
| `--panel-radius` | `16px` | Corner radius |
| `--panel-background` | `rgba(20,22,38,0.86)` | Panel surface fill |
| `--panel-color` | `#f4f6ff` | Foreground text color |
| `--panel-border` | `1px solid rgba(255,255,255,0.14)` | Panel border |
| `--panel-shadow` | `0 22px 64px rgba(0,0,0,.42), …` | Default drop shadow |
| `--panel-shadow-focused` | `0 28px 90px …` | Focus state shadow |
| `--panel-font-family` | system stack | Font family |
| `--panel-font-size` | `14px` | Base font size |
| `--panel-z` | `auto` | z-index (managed by `stackable`) |
| `--panel-min-width` | `184px` | Minimum width; set to `auto` or `fit-content` via `options.minWidth` |

### Caption

| Variable | Default | Purpose |
| --- | --- | --- |
| `--panel-caption-background` | `rgba(10,12,28,0.92)` | Title bar fill |
| `--panel-caption-color` | `inherit` | Title bar text color |
| `--panel-caption-height` | `44px` | Title bar height; set to `0px` by `captionless`, `22px` by `toolbar-caption` |

### Body

| Variable | Default | Purpose |
| --- | --- | --- |
| `--panel-body-padding` | `14px` | Body padding on all sides. The `autoheight` / `shrinkwrap` plugins and the `colsWidth` toolbox helper depend on this value. |

### Layout (read-only, set by the API)

| Variable | Purpose |
| --- | --- |
| `--panel-left`, `--panel-top` | Position in the panel layer |
| `--panel-cqw`, `--panel-cqh` | 1% of body inline / block size in px — container-query-unit fallback |

---

## Shadow parts

```css
dom-panel::part(caption)         { /* title bar */ }
dom-panel::part(title)           { /* title text */ }
dom-panel::part(actions)         { /* container for action buttons */ }
dom-panel::part(action)          { /* every action button */ }
dom-panel::part(close-action)    { /* close button */ }
dom-panel::part(minimize-action) { /* minimize button */ }
dom-panel::part(pin-action)      { /* pin button */ }
dom-panel::part(body)            { /* scrollable body container */ }
dom-panel::part(resize-handle)   { /* bottom-right grip */ }
```

Custom plugins name their parts via `addAction("snap", "bi-magnet", "Snap", handler)` — the button gets `part="action snap-action"`.

---

## Themes

### Global theme

```css
dom-panel {
  --panel-background: rgba(60, 22, 12, 0.92);
  --panel-caption-background: rgba(40, 12, 6, 0.96);
  --panel-color: #fbece0;
  --panel-radius: 22px;
  --panel-font-family: "Inter", system-ui, sans-serif;
}
```

### Per-panel theme by class

```js
handle.element.classList.add("theme-warm");
```

```css
.theme-warm {
  --panel-background: rgba(60, 22, 12, 0.92);
  --panel-color: #fbece0;
}
.theme-warm::part(action) {
  background: rgba(255, 220, 180, 0.08);
}
```

---

## Styling action buttons

```css
dom-panel::part(action) {
  inline-size: 32px;
  block-size: 32px;
  border-radius: 12px;
}

/* A specific plugin button in its active state */
dom-panel::part(pin-action)[data-active="true"] {
  background: linear-gradient(135deg, #ffb27a, #ff7a59);
  color: #1c0a04;
}
```

---

## Styling body content

The body is a normal container — host page CSS applies inside it. The Panel API only sets `[part="body"]`'s padding (`--panel-body-padding`), overflow, and `container-type: inline-size`.

```css
/* CSS Grid inside any panel body */
.my-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}
```

---

## Container queries

Because the body has `container-type: inline-size`, content can respond to the panel's own width:

```css
@container (width < 280px) {
  .my-card { flex-direction: column; }
}
@container (width >= 480px) {
  .my-card { padding: 24px; }
}
```

The Panel API also publishes `--panel-cqw` / `--panel-cqh` for older content patterns:

```css
.title {
  font-size: clamp(20px, calc(8 * var(--panel-cqw, 1px)), 38px);
}
```

---

## Reduced motion

The stylesheet disables transitions and animations under `prefers-reduced-motion: reduce`. Mirror this in your own panel content:

```css
@media (prefers-reduced-motion: reduce) {
  .my-element { animation: none !important; transition: none !important; }
}
```

---

## Replacing the default stylesheet

Default styles are injected once into `document.head` as `<style data-panel-api-styles>`. To replace them entirely:

```js
import { injectStyles } from "panel-api";

document.querySelector("style[data-panel-api-styles]")?.remove();

const style = document.createElement("style");
style.setAttribute("data-panel-api-styles", "");
style.textContent = `dom-panel { /* your styles */ }`;
document.head.appendChild(style);
```

You can also add a stylesheet *alongside* the default and rely on later-in-document rules or higher specificity to win.

---

## Data attributes set by the API

These are set on `<dom-panel>` by the core and plugins. Use them for CSS hooks:

| Attribute | Value | Set by |
| --- | --- | --- |
| `data-ready` | `"true"` | Core — after full initialization |
| `data-focused` | `"true"` / `"false"` | `focusable` |
| `data-minimized` | `"true"` / `"false"` | `miniaturizable` |
| `data-borderless` | `"true"` / `"false"` | `borderless` |
| `data-autoheight` | `""` | `autoheight` / `shrinkwrap` |

```css
/* Custom styling when autoheight is active */
dom-panel[data-autoheight] {
  /* height is content-driven — don't override it here */
}
```
