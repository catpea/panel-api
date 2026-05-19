// autoheight — content-driven panel height via ResizeObserver.
//
// Marks the panel with [data-autoheight] so other plugins (notably resizable)
// know to leave height alone. Switches the body to free-flow sizing, then
// keeps panel.style.height = caption + body on every content change.
//
// Works alongside the resizable plugin: the user can still drag panel width;
// when flex-wrap content reflows the ResizeObserver fires and height updates.
//
// The initial sync is deferred to requestAnimationFrame so that the element
// is in the DOM (and offsetHeight returns real values) when first measured.
// Plugins run during element.initialize(), which is called before the element
// is appended to the panel layer.

export default function autoheight(handle, options, signal) {
  const panel = handle.element;
  const body = panel.bodyElement;
  if (!body) return;

  panel.dataset.autoheight = "";
  panel.style.minHeight = "0";

  // Let the body size itself to its content rather than filling the panel.
  body.style.height = "auto";
  body.style.overflow = "visible";
  body.style.minHeight = "0";

  const sync = () => {
    if (!panel.isConnected) return;
    const captionH = panel.captionElement ? panel.captionElement.offsetHeight : 0;
    panel.style.height = `${captionH + body.offsetHeight}px`;
  };

  // Defer first measurement to the next frame so the element is in the DOM.
  const rafId = requestAnimationFrame(sync);

  const ro = new ResizeObserver(sync);
  ro.observe(body);

  signal.addEventListener("abort", () => {
    cancelAnimationFrame(rafId);
    ro.disconnect();
    delete panel.dataset.autoheight;
    panel.style.minHeight = "";
    body.style.height = "";
    body.style.overflow = "";
    body.style.minHeight = "";
  }, { once: true });
}
