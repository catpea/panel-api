// Wire pointer/wheel interactions onto a viewport.
//
// This is intentionally split out so authors can compose their own input
// (e.g., trackpad-only, gamepad, touch gestures) without having to subclass
// the viewport. The defaults — drag-to-pan on background, wheel-to-zoom,
// pointer capture — match the demo and feel like every other ZUI on the web.

export function wireInteractions(viewport, options = {}) {
  const root = viewport.root;
  const ignoreSelector = options.ignoreSelector ?? "dom-panel, button, a, [contenteditable], input, textarea, select";
  const zoomStep = options.zoomStep ?? 0.12;

  const aborter = options.signal ? null : new AbortController();
  const signal = options.signal ?? aborter.signal;

  let panState = null;

  root.addEventListener("pointerdown", event => {
    if (event.target.closest(ignoreSelector)) return;
    panState = { id: event.pointerId, x: event.clientX, y: event.clientY };
    root.setPointerCapture(event.pointerId);
    root.style.userSelect = "none";
  }, { signal });

  root.addEventListener("pointermove", event => {
    if (!panState || panState.id !== event.pointerId) return;
    viewport.panBy(event.clientX - panState.x, event.clientY - panState.y);
    panState.x = event.clientX;
    panState.y = event.clientY;
  }, { signal });

  const endPan = event => {
    if (!panState || panState.id !== event.pointerId) return;
    if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
    root.style.userSelect = "";
    panState = null;
  };

  root.addEventListener("pointerup", endPan, { signal });
  root.addEventListener("pointercancel", endPan, { signal });

  root.addEventListener("wheel", event => {
    if (event.target.closest("dom-panel")) return;
    event.preventDefault();
    const delta = Math.sign(event.deltaY) * -zoomStep;
    viewport.setZoom(viewport.zoom * (1 + delta), event.clientX, event.clientY);
  }, { passive: false, signal });

  return () => aborter?.abort();
}
