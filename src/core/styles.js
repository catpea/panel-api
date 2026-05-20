// Default visual styles for dom-panel elements.
//
// The Panel API ships a minimal, theme-able stylesheet. Authors override design
// via CSS custom properties (see ::part selectors and --panel-* variables) or
// disable injection entirely by importing { defaultStyles } and providing their
// own stylesheet.
//
// We inject styles exactly once per document, keyed by a marker attribute, so
// repeated imports across modules do not accumulate copies.

const STYLE_MARKER = "data-panel-api-styles";

export const defaultStyles = /* css */ `
  /* ---------- panel layers ---------- */
  .panel-layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1000;
  }

  /* Document-space panels scroll with the page. The layer itself has no
     size so it never affects page layout; panels overflow it naturally. */
  .panel-document-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 1000;
  }

  /* ---------- panel surface ---------- */
  dom-panel {
    /* Theming hooks — override these on host page or per-panel. */
    --panel-radius: 16px;
    --panel-background: rgba(20, 22, 38, 0.86);
    --panel-color: #f4f6ff;
    --panel-caption-background: rgba(10, 12, 28, 0.92);
    --panel-caption-color: inherit;
    --panel-caption-height: 44px;
    --panel-border: 1px solid rgba(255, 255, 255, 0.14);
    --panel-shadow: 0 22px 64px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(255, 255, 255, 0.06);
    --panel-shadow-focused: 0 28px 90px rgba(0, 0, 0, 0.56), 0 0 0 1px rgba(145, 174, 255, 0.35), 0 0 0 5px rgba(122, 162, 255, 0.10);
    --panel-font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    --panel-font-size: 14px;
    --panel-z: auto;

    --panel-min-width: 184px;

    position: absolute;
    left: var(--panel-left, 80px);
    top: var(--panel-top, 80px);
    display: block;
    min-width: var(--panel-min-width);
    min-height: 64px;
    border-radius: var(--panel-radius);
    border: var(--panel-border);
    color: var(--panel-color);
    background: var(--panel-background);
    box-shadow: var(--panel-shadow);
    font-family: var(--panel-font-family);
    font-size: var(--panel-font-size);
    z-index: var(--panel-z);
    overflow: hidden;
    pointer-events: auto;
    user-select: none;
    outline: 0;
    box-sizing: border-box;
  }

  dom-panel * { box-sizing: border-box; }

  dom-panel[data-focused="true"] { box-shadow: var(--panel-shadow-focused); }
  dom-panel[data-borderless="true"] { border: 0; }
  dom-panel[data-minimized="true"] { height: auto !important; min-height: 0; }
  dom-panel[data-minimized="true"] [part~="body"],
  dom-panel[data-minimized="true"] [part~="resize-handle"] { display: none; }

  /* ---------- caption ---------- */
  dom-panel [part~="caption"] {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: var(--panel-caption-height);
    padding: 6px 10px 6px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: var(--panel-caption-background);
    color: var(--panel-caption-color);
    cursor: grab;
  }

  dom-panel [part~="caption"]:active { cursor: grabbing; }

  dom-panel [part~="title"] {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  dom-panel [part~="actions"] {
    display: inline-flex;
    gap: 4px;
  }

  dom-panel [part~="action"] {
    display: grid;
    place-items: center;
    inline-size: 28px;
    block-size: 28px;
    border: 0;
    border-radius: 8px;
    color: rgba(244, 246, 255, 0.78);
    background: transparent;
    cursor: pointer;
    font: inherit;
  }

  dom-panel [part~="action"]:hover { background: rgba(255, 255, 255, 0.10); color: white; }
  dom-panel [part~="action"][data-close]:hover { background: rgba(255, 102, 102, 0.18); color: #ffb0b0; }
  dom-panel [part~="action"][data-active="true"] { background: rgba(122, 162, 255, 0.18); color: #c7d5ff; }

  /* ---------- body ---------- */
  dom-panel [part~="body"] {
    --panel-body-padding: 14px;

    container-type: inline-size;
    position: relative;
    width: 100%;
    height: calc(100% - var(--panel-caption-height));
    min-height: 60px;
    padding: var(--panel-body-padding);
    overflow: auto;
    /* Bring back text selection inside the body — panel root disables it. */
    user-select: text;
  }

  /* ---------- resize handle ---------- */
  dom-panel [part~="resize-handle"] {
    position: absolute;
    right: 0;
    bottom: 0;
    inline-size: 20px;
    block-size: 20px;
    cursor: nwse-resize;
    color: rgba(255, 255, 255, 0.36);
    pointer-events: auto;
  }

  dom-panel [part~="resize-handle"]::after {
    content: "";
    position: absolute;
    right: 6px;
    bottom: 6px;
    width: 7px;
    height: 7px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
  }

  /* ---------- iframe body ---------- */
  /* Remove body padding and overflow scroll so the iframe fills flush. */
  dom-panel[data-url] [part~="body"] {
    padding: 0;
    overflow: hidden;
  }

  dom-panel [part~="iframe"] {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
  }

  /* ---------- reduced motion ---------- */
  @media (prefers-reduced-motion: reduce) {
    dom-panel, dom-panel * { transition: none !important; animation: none !important; }
  }

  /* ---------- autoheight ---------- */
  /* When autoheight owns height, only horizontal resize is meaningful. */
  dom-panel[data-autoheight] [part~="resize-handle"] { cursor: ew-resize; }

  /* ---------- declarative support ---------- */
  [panel]:not([panel-open]) { display: none; }
`;

/**
 * Inject the default stylesheet into the supplied document, once.
 * Returns the inserted <style> element (or the existing one if already present).
 */
export function injectStyles(targetDocument = document) {
  if (!targetDocument || typeof targetDocument.head?.appendChild !== "function") return null;
  const existing = targetDocument.head.querySelector(`style[${STYLE_MARKER}]`);
  if (existing) return existing;
  const style = targetDocument.createElement("style");
  style.setAttribute(STYLE_MARKER, "");
  style.textContent = defaultStyles;
  targetDocument.head.appendChild(style);
  return style;
}
