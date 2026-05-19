// shrinkwrap — content-driven height with fit-content width guard.
//
// Combines autoheight (ResizeObserver-based height tracking) with a
// --panel-min-width: fit-content guard so the panel never shrinks narrower
// than its content when no explicit minWidth was provided.
//
// For toolboxes and cases where width is managed explicitly, prefer the
// autoheight plugin directly and pass minWidth yourself.

import autoheight from "./autoheight.js";

export default function shrinkwrap(handle, options, signal) {
  const el = handle.element;

  if (options.minWidth == null) {
    el.style.setProperty("--panel-min-width", "fit-content");
    signal.addEventListener("abort", () => {
      el.style.removeProperty("--panel-min-width");
    }, { once: true });
  }

  autoheight(handle, options, signal);
}
