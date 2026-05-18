# Panel API · Styling

Panel API ships a complete, theme-able stylesheet at first import. You override visuals via **CSS custom properties** (variables) and **shadow parts**. The host page never has to know panel internals.

Three scopes for overrides, in increasing specificity:

1. **Globally** — declare variables on `:root` or `dom-panel` to affect every panel.
2. **By class/theme** — add a class to selected panels.
3. **Inline** — `handle.element.style.setProperty("--panel-...", "...")`.

## CSS variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `--panel-radius` | `16px` | Corner radius |
| `--panel-background` | `rgba(20,22,38,0.86)` | Panel surface fill |
| `--panel-color` | `#f4f6ff` | Foreground text color |
| `--panel-caption-background` | `rgba(10,12,28,0.92)` | Title bar fill |
| `--panel-caption-color` | `inherit` | Title bar text color |
| `--panel-caption-height` | `44px` | Title bar height |
| `--panel-border` | `1px solid rgba(255,255,255,0.14)` | Panel border |
| `--panel-shadow` | `0 22px 64px rgba(0,0,0,.42), …` | Default drop shadow |
| `--panel-shadow-focused` | `0 28px 90px …` | Focus state shadow |
| `--panel-font-family` | system stack | Font family |
| `--panel-font-size` | `14px` | Base font size |
| `--panel-z` | `auto` | z-index hook (managed by `stackable`) |

Layout variables (read-only):

| Variable | Purpose |
| --- | --- |
| `--panel-left`, `--panel-top` | Position |
| `--panel-cqw`, `--panel-cqh` | 1% of body inline / block size, in px. Use as a container-query-unit fallback when scaling internal text/icons with panel size. |

Example — a global "warm" theme:

```css
dom-panel {
  --panel-background: rgba(60, 22, 12, 0.92);
  --panel-caption-background: rgba(40, 12, 6, 0.96);
  --panel-color: #fbece0;
  --panel-radius: 22px;
  --panel-font-family: "Inter", system-ui, sans-serif;
}
```

## Shadow parts

```css
dom-panel::part(caption)        { /* title bar */ }
dom-panel::part(title)          { /* the title text */ }
dom-panel::part(actions)        { /* container for action buttons */ }
dom-panel::part(action)         { /* every action button */ }
dom-panel::part(close-action)   { /* the specific close button */ }
dom-panel::part(minimize-action){ /* minimize button */ }
dom-panel::part(pin-action)     { /* pin button */ }
dom-panel::part(body)           { /* scrollable body container */ }
dom-panel::part(resize-handle)  { /* bottom-right grip */ }
```

Custom plugins can name their parts via `addAction("snap", "bi-magnet", "Snap", handler)` — the resulting button gets `part="action snap-action"`.

## Styling action buttons

```css
/* Bigger, rounded action buttons */
dom-panel::part(action) {
  inline-size: 32px;
  block-size: 32px;
  border-radius: 12px;
}

/* A custom button look for a specific plugin's button */
dom-panel::part(pin-action)[data-active="true"] {
  background: linear-gradient(135deg, #ffb27a, #ff7a59);
  color: #1c0a04;
}
```

## Theming individual panels by class

```js
const handle = panel.open("", "Warm", { width: 320, height: 240 });
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

## Styling content inside the panel body

The body is a normal container — your own page CSS applies. The Panel API only sets `[part="body"]`'s padding, overflow, and `container-type: inline-size` so authors can use container queries inside the body.

```css
/* Make a button styled by the host page, inside any panel body */
.my-styled-button {
  border: 0;
  padding: 10px 16px;
  border-radius: 999px;
  font-weight: 600;
  background: linear-gradient(135deg, #ffb27a, #ff7a59);
  color: #1c0a04;
  cursor: pointer;
}
```

```js
const button = document.createElement("button");
button.className = "my-styled-button";
button.textContent = "Save";
handle.setContent(button);
```

## Container queries on panel content

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

## Reduced motion

The stylesheet disables transitions and animations under `prefers-reduced-motion: reduce`. If you add your own motion, respect the same rule:

```css
@media (prefers-reduced-motion: reduce) {
  .my-element { animation: none !important; transition: none !important; }
}
```

## Replacing the default styles entirely

Default styles are injected once into `document.head` as a `<style data-panel-api-styles>` element. To replace them:

```js
import { injectStyles } from "panel-api";

// remove the bundled stylesheet
document.querySelector("style[data-panel-api-styles]")?.remove();

// inject your own — keep the marker attribute so re-imports don't double up
const style = document.createElement("style");
style.setAttribute("data-panel-api-styles", "");
style.textContent = `dom-panel { /* your styles */ }`;
document.head.appendChild(style);
```

You can also bring your own stylesheet *as well as* the default and rely on later-in-document rules to win.
