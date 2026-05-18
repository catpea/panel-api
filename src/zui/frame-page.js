// framePage() — turn an existing webpage into a ZUI surface in one call.
//
// The function takes whatever is currently inside `document.body` and wraps
// it in a viewport/surface pair so the user can pan and zoom the page while
// panels float on top in a sibling layer. The original DOM is preserved and
// remains live — event handlers attached to the page continue to work.
//
// Aspect ratio: because both x and y use the same `scale()` factor, the
// page content's xy ratio is preserved exactly. Setting different scaleX /
// scaleY would distort it — we intentionally do not expose that.
//
// Usage:
//   import panel from "panel-api";
//   import { framePage } from "panel-api/zui";
//   const viewport = framePage();
//   panel.attachViewport(viewport);

import { PanelViewport } from "./viewport.js";
import { wireInteractions } from "./interactions.js";

const FRAME_STYLE_MARKER = "data-panel-api-frame-styles";

const FRAME_STYLES = /* css */ `
  html, body { height: 100%; }
  body[data-panel-api-framed] { margin: 0; overflow: hidden; }
  .panel-api-viewport {
    position: fixed;
    inset: 0;
    overflow: hidden;
    container-type: size;
    touch-action: none;
    isolation: isolate;
  }
  .panel-api-surface {
    position: absolute;
    left: 0; top: 0;
    width: 100cqw;
    height: 100cqh;
    min-width: 100%;
    min-height: 100%;
    transform-origin: 0 0;
    will-change: transform;
  }
  .panel-api-surface > * { pointer-events: auto; }
`;

function injectFrameStyles(doc) {
  if (doc.head.querySelector(`style[${FRAME_STYLE_MARKER}]`)) return;
  const style = doc.createElement("style");
  style.setAttribute(FRAME_STYLE_MARKER, "");
  style.textContent = FRAME_STYLES;
  doc.head.appendChild(style);
}

/**
 * Frame the document so panels float above a zoomable copy of the page.
 *
 * @param {object} [config]
 * @param {Document} [config.document]
 * @param {HTMLElement} [config.host] — element to frame (default: body)
 * @param {boolean} [config.interactions=true] — wire default pan/zoom interactions
 * @param {boolean} [config.preservePanelLayer=true] — leave any existing .panel-layer outside the surface
 * @returns {PanelViewport}
 */
export function framePage(config = {}) {
  const doc = config.document ?? document;
  const host = config.host ?? doc.body;
  if (!host) throw new Error("framePage(): no host element available");
  if (host.dataset.panelApiFramed === "true") {
    // Idempotent: return existing viewport stored on the host.
    return host._panelApiViewport;
  }

  injectFrameStyles(doc);

  // Move all current children (except any pre-existing panel layer) into a new
  // surface element inside a new viewport container.
  const viewportEl = doc.createElement("div");
  viewportEl.className = "panel-api-viewport";

  const surfaceEl = doc.createElement("div");
  surfaceEl.className = "panel-api-surface";

  const existingPanelLayer = host.querySelector(".panel-layer");
  const childrenToMove = [...host.childNodes].filter(node => node !== existingPanelLayer);
  for (const node of childrenToMove) surfaceEl.appendChild(node);

  viewportEl.appendChild(surfaceEl);
  host.appendChild(viewportEl);
  if (existingPanelLayer) host.appendChild(existingPanelLayer);

  host.dataset.panelApiFramed = "true";

  const viewport = new PanelViewport({ root: viewportEl, surface: surfaceEl });
  host._panelApiViewport = viewport;

  if (config.interactions !== false) wireInteractions(viewport);
  return viewport;
}

/**
 * Attach a viewport using an existing root + surface pair (the manual path).
 * Use this when you have your own viewport markup and just want PanelViewport.
 */
export function attachZUI({ root, surface, interactions = true } = {}) {
  const viewport = new PanelViewport({ root, surface });
  if (interactions) wireInteractions(viewport);
  return viewport;
}
