// resizable — adds a bottom-right grip and lets the user resize via drag.
// Min/max constraints come from options (minWidth, minHeight, maxWidth,
// maxHeight) when set, with sensible defaults.

import { PANEL_EVENTS, dispatchPanelEvent } from "../core/events.js";
import { updateCQU } from "../core/cqu.js";

export default function resizable(handle, options, signal) {
  const panel = handle.element;

  const grip = document.createElement("div");
  grip.setAttribute("part", "resize-handle");
  grip.setAttribute("aria-hidden", "true");
  panel.append(grip);

  // Remove the grip if the plugin is uninstalled mid-life (e.g., for a future
  // hot-swap API). The abort signal handles event cleanup; this removes DOM.
  signal.addEventListener("abort", () => grip.remove(), { once: true });

  const minW = Number.isFinite(options.minWidth) ? options.minWidth : 184;
  const minH = Number.isFinite(options.minHeight) ? options.minHeight : 96;
  const maxW = Number.isFinite(options.maxWidth) ? options.maxWidth : Infinity;
  const maxH = Number.isFinite(options.maxHeight) ? options.maxHeight : Infinity;

  const onPointerDown = event => {
    event.preventDefault();
    event.stopPropagation();
    panel.focusPanel();
    grip.setPointerCapture(event.pointerId);

    const start = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      width: panel.offsetWidth,
      height: panel.offsetHeight
    };

    const moveSignal = new AbortController();

    const onMove = move => {
      const nextW = Math.max(minW, Math.min(maxW, start.width + move.clientX - start.x));
      const nextH = Math.max(minH, Math.min(maxH, start.height + move.clientY - start.y));
      panel.style.width = `${nextW}px`;
      panel.style.height = `${nextH}px`;
      updateCQU(panel.bodyElement);
      dispatchPanelEvent(panel, PANEL_EVENTS.RESIZE, { width: nextW, height: nextH });
    };

    const onUp = () => {
      if (grip.hasPointerCapture(start.pointerId)) grip.releasePointerCapture(start.pointerId);
      moveSignal.abort();
    };

    grip.addEventListener("pointermove", onMove, { signal: moveSignal.signal });
    grip.addEventListener("pointerup", onUp, { signal: moveSignal.signal });
    grip.addEventListener("pointercancel", onUp, { signal: moveSignal.signal });
  };

  grip.addEventListener("pointerdown", onPointerDown, { signal });
}
