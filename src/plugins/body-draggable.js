// body-draggable — drag a panel by its body area.
//
// Designed for panels where `titled: false` (or toolbar-caption) removes the
// normal caption drag handle. Interactive elements are excluded so buttons,
// inputs, and links retain their default behavior.

import { PANEL_EVENTS, dispatchPanelEvent } from "../core/events.js";

export default function bodyDraggable(handle, _options, signal) {
  const panel = handle.element;
  const body = panel.bodyElement;
  if (!body) return;

  const IGNORE = "button, a, input, textarea, select, [contenteditable]";

  body.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    if (event.target.closest(IGNORE)) return;
    panel.focusPanel?.();
    body.setPointerCapture(event.pointerId);

    const start = {
      id:   event.pointerId,
      x:    event.clientX,
      y:    event.clientY,
      left: panel.offsetLeft,
      top:  panel.offsetTop
    };

    const ctrl = new AbortController();

    body.addEventListener("pointermove", move => {
      if (move.pointerId !== start.id) return;
      const nextLeft = start.left + move.clientX - start.x;
      const nextTop  = start.top  + move.clientY - start.y;
      panel.style.setProperty("--panel-left", `${nextLeft}px`);
      panel.style.setProperty("--panel-top",  `${nextTop}px`);
      dispatchPanelEvent(panel, PANEL_EVENTS.MOVE, { left: nextLeft, top: nextTop });
    }, { signal: ctrl.signal });

    const end = () => {
      if (body.hasPointerCapture(start.id)) body.releasePointerCapture(start.id);
      ctrl.abort();
    };

    body.addEventListener("pointerup",     end, { signal: ctrl.signal });
    body.addEventListener("pointercancel", end, { signal: ctrl.signal });
  }, { signal });
}
