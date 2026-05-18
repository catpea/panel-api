// draggable — drag the panel by its caption.
//
// We use Pointer Events with pointer capture so the drag follows the pointer
// even when it leaves the caption (a Mouse Events drag would lose the panel
// the moment the pointer escaped the strip).

import { PANEL_EVENTS, dispatchPanelEvent } from "../core/events.js";

export default function draggable(handle, _options, signal) {
  const panel = handle.element;
  const caption = panel.captionElement;
  if (!caption) return;

  const onPointerDown = event => {
    if (event.button !== 0 || event.target.closest("button")) return;
    panel.focusPanel();
    caption.setPointerCapture(event.pointerId);

    const start = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: panel.offsetLeft,
      top: panel.offsetTop
    };

    const moveSignal = new AbortController();

    const onMove = move => {
      const nextLeft = start.left + move.clientX - start.x;
      const nextTop = start.top + move.clientY - start.y;
      panel.style.setProperty("--panel-left", `${nextLeft}px`);
      panel.style.setProperty("--panel-top", `${nextTop}px`);
      dispatchPanelEvent(panel, PANEL_EVENTS.MOVE, { left: nextLeft, top: nextTop });
    };

    const onUp = () => {
      if (caption.hasPointerCapture(start.pointerId)) caption.releasePointerCapture(start.pointerId);
      moveSignal.abort();
    };

    caption.addEventListener("pointermove", onMove, { signal: moveSignal.signal });
    caption.addEventListener("pointerup", onUp, { signal: moveSignal.signal });
    caption.addEventListener("pointercancel", onUp, { signal: moveSignal.signal });
  };

  caption.addEventListener("pointerdown", onPointerDown, { signal });
}
