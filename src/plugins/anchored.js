// anchored — position a panel relative to a DOM element.
//
// Activated automatically when `coordinateSpace: "element"` is passed to
// panel.open(). The panel is placed next to `anchorElement` according to
// `placement` and stays there even if the anchor moves due to scrolling,
// resizing, or viewport changes.
//
// Options (read from the merged panel options):
//   anchorElement      HTMLElement | CSS selector string (required)
//   placement          "bottom" (default) | "top" | "left" | "right"
//                      | "bottom-start" | "bottom-end" | "top-start" | "top-end"
//                      | "left-start"  | "left-end"  | "right-start" | "right-end"
//   offset             gap in px between anchor edge and panel (default 8)
//   collisionStrategy  "flip" (default) | "shift" | "none"
//   followAnchor       true (default) — update position when anchor moves

import { PANEL_EVENTS, dispatchPanelEvent } from "../core/events.js";
import { computeAnchorPosition, applyCollisionAvoidance } from "../core/anchor.js";

export default function anchored(handle, options, signal) {
  const {
    anchorElement,
    placement = "bottom",
    offset = 8,
    collisionStrategy = "flip",
    followAnchor = true,
  } = options;

  if (!anchorElement) return;

  const anchor = typeof anchorElement === "string"
    ? document.querySelector(anchorElement)
    : anchorElement;
  if (!anchor) { console.warn("[panel-api] anchored: anchorElement not found", anchorElement); return; }

  const panel = handle.element;

  const position = () => {
    if (!panel.isConnected) return;
    const anchorRect = anchor.getBoundingClientRect();
    // Use offsetWidth/Height for accuracy (zero before first layout → fall back to options)
    const fw = panel.offsetWidth || options.width || 400;
    const fh = panel.offsetHeight || options.height || 300;
    const viewport = { width: window.innerWidth, height: window.innerHeight };

    let pos = computeAnchorPosition(anchorRect, { width: fw, height: fh }, placement, offset);
    pos = applyCollisionAvoidance(pos, anchorRect, { width: fw, height: fh }, offset, collisionStrategy, viewport);

    panel.style.setProperty("--panel-left", `${Math.round(pos.left)}px`);
    panel.style.setProperty("--panel-top", `${Math.round(pos.top)}px`);
    dispatchPanelEvent(panel, PANEL_EVENTS.ANCHOR_CHANGE, { anchor, placement: pos.actualPlacement });
  };

  // Initial position using declared dimensions (synchronous so panel opens at right spot).
  position();
  // Re-position after first layout for accurate offsetWidth/Height.
  const rafId = requestAnimationFrame(position);
  signal.addEventListener("abort", () => cancelAnimationFrame(rafId), { once: true });

  if (!followAnchor) return;

  // Track anchor and panel size changes.
  const ro = new ResizeObserver(position);
  ro.observe(anchor);
  ro.observe(panel);
  signal.addEventListener("abort", () => ro.disconnect(), { once: true });

  // Track scroll (any ancestor) and global resize.
  window.addEventListener("scroll", position, { signal, passive: true, capture: true });
  window.addEventListener("resize", position, { signal, passive: true });
  // ZUI viewport changes.
  window.addEventListener("viewportchange", position, { signal });
}
