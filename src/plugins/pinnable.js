// pinnable — anchor a panel to ZUI world coordinates.
//
// When pinned, the panel records its current screen-position in world
// coordinates. Every viewportchange event re-projects the world point back
// to screen and updates the panel's --panel-left / --panel-top. When the
// user drags the panel further while pinned, the anchor is re-captured at
// the new screen position so the panel does not snap back.
//
// Without a viewport attached to the manager, pinning is a no-op (the button
// still appears but the panel cannot follow zoom/pan; it simply records the
// pinned state). Demos that need pinning should call `panel.attachViewport(...)`.

import { PANEL_EVENTS, dispatchPanelEvent } from "../core/events.js";

export default function pinnable(handle, _options, signal) {
  const panel = handle.element;

  const getViewport = () => handle.context?.manager?.viewport;

  const button = panel.addAction("pin", "bi-pin-angle", "Pin to page world", () => {
    const pinned = !handle.pinned;
    panel.dataset.pinned = String(pinned);
    button.dataset.active = String(pinned);
    captureAnchor();
    dispatchPanelEvent(panel, pinned ? PANEL_EVENTS.PIN : PANEL_EVENTS.UNPIN);
  });

  const captureAnchor = () => {
    const viewport = getViewport();
    if (handle.pinned && viewport) {
      panel._worldAnchor = viewport.screenToWorld(panel.offsetLeft, panel.offsetTop);
    } else {
      panel._worldAnchor = null;
    }
  };

  const sync = () => {
    if (!handle.pinned || !panel._worldAnchor) return;
    const viewport = getViewport();
    if (!viewport) return;
    const screen = viewport.worldToScreen(panel._worldAnchor.x, panel._worldAnchor.y);
    panel.style.setProperty("--panel-left", `${screen.x}px`);
    panel.style.setProperty("--panel-top", `${screen.y}px`);
  };

  const onMove = () => {
    if (handle.pinned) captureAnchor();
  };

  // Listen on window — viewports broadcast viewportchange there by default.
  window.addEventListener("viewportchange", sync, { signal });
  panel.addEventListener(PANEL_EVENTS.MOVE, onMove, { signal });
}
