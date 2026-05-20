// snappable — snap the panel to viewport edges and/or other panels while dragging.
//
// Works by listening to `panelmove` and overriding the CSS position variables
// when the panel is within `snapThreshold` px of a snap target. Because
// `panelmove` is dispatched synchronously inside the same drag tick that sets
// the variables, the override lands before the browser paints — no visual jitter.
//
// Options:
//   snapThreshold  distance in px that triggers a snap (default 16)
//   snapEdges      snap to viewport edges (default true)
//   snapPanels     snap to other panel edges (default false)

import { PANEL_EVENTS } from "../core/events.js";

export default function snappable(handle, options, signal) {
  const panel = handle.element;
  const threshold   = Number.isFinite(options.snapThreshold) ? options.snapThreshold : 16;
  const snapEdges   = options.snapEdges  !== false;  // default true
  const snapPanels  = options.snapPanels === true;   // default false

  const nearestSnap = (value, targets) => {
    let best = value;
    let bestDist = threshold + 1;
    for (const t of targets) {
      const d = Math.abs(value - t);
      if (d < bestDist) { bestDist = d; best = t; }
    }
    return best;
  };

  const onMove = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;
    const left = panel.offsetLeft;
    const top  = panel.offsetTop;

    const targetsX = snapEdges ? [0, vw - pw] : [];
    const targetsY = snapEdges ? [0, vh - ph] : [];

    if (snapPanels) {
      const mgr = handle.context?.manager;
      if (mgr) {
        for (const other of mgr.getPanels()) {
          if (other === handle) continue;
          const { left: ol, top: ot, width: ow, height: oh } = other.bounds;
          // Align left edges, right edge to left edge, left edge to right edge
          targetsX.push(ol, ol + ow, ol + ow - pw);
          // Align top edges, bottom edge to top edge, top edge to bottom edge
          targetsY.push(ot, ot + oh, ot + oh - ph);
        }
      }
    }

    const snappedLeft = nearestSnap(left, targetsX);
    const snappedTop  = nearestSnap(top,  targetsY);

    if (snappedLeft !== left || snappedTop !== top) {
      panel.style.setProperty("--panel-left", `${snappedLeft}px`);
      panel.style.setProperty("--panel-top",  `${snappedTop}px`);
    }
  };

  panel.addEventListener(PANEL_EVENTS.MOVE, onMove, { signal });
}
