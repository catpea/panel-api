// keyboard — arrow keys move the focused panel; Shift+arrows resize.
// Off by default for non-interactive panels; opt in with `keyboardMove: true`
// or `keyboardResize: true`. The step size scales with the shift modifier
// (default 8px; with shift, 32px) so keyboard nudging stays useful.

import { PANEL_EVENTS, dispatchPanelEvent } from "../core/events.js";

export default function keyboard(handle, options, signal) {
  const allowMove = options.keyboardMove === true;
  const allowResize = options.keyboardResize === true;
  if (!allowMove && !allowResize) return;

  const el = handle.element;

  const onKeyDown = event => {
    if (!handle.focused) return;
    if (event.target.closest("input, textarea, select, [contenteditable]")) return;

    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const delta = arrows[event.key];
    if (!delta) return;

    const step = event.shiftKey ? 32 : 8;
    const [dx, dy] = delta;

    if (event.altKey && allowResize) {
      // Alt+arrows resize; Shift+Alt+arrows resize in larger steps
      const nextW = Math.max(96, el.offsetWidth + dx * step);
      const nextH = Math.max(48, el.offsetHeight + dy * step);
      el.style.width = `${nextW}px`;
      el.style.height = `${nextH}px`;
      dispatchPanelEvent(el, PANEL_EVENTS.RESIZE, { width: nextW, height: nextH });
    } else if (allowMove) {
      handle.moveBy(dx * step, dy * step);
    } else {
      return;
    }
    event.preventDefault();
  };

  el.addEventListener("keydown", onKeyDown, { signal });
}
