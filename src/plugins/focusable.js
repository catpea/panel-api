// focusable — pointerdown anywhere on the panel or DOM focus event raises a
// focus request. Pair with `stackable` to actually promote z-order.

import { PANEL_EVENTS, dispatchPanelEvent } from "../core/events.js";

export default function focusable(handle, _options, signal) {
  const el = handle.element;
  const requestFocus = () => el.focusPanel();
  el.addEventListener("pointerdown", requestFocus, { signal });
  el.addEventListener("focus", () => {
    requestFocus();
    dispatchPanelEvent(el, PANEL_EVENTS.FOCUS);
  }, { signal });
  el.addEventListener("blur", () => dispatchPanelEvent(el, PANEL_EVENTS.BLUR), { signal });
}
