// wireZuiPointerEvents — re-emit pointer events with world-space coordinates.
//
// The default PointerEvent carries client-space (screen) coordinates. When the
// viewport is zoomed or panned, anything doing hit-testing or drag logic on
// the surface needs world-space coordinates instead.
//
// This module listens for standard pointer events on a target element and
// re-dispatches them as CustomEvents whose `detail` contains world-space
// { x, y } coordinates (and the original PointerEvent for other fields).
//
// Event names follow a configurable prefix, default "zui":
//   zuipointerdown   zuipointermove   zuipointerup   zuipointercancel
//
// Usage:
//   import { wireZuiPointerEvents } from "panel-api/zui";
//   const cleanup = wireZuiPointerEvents(viewport, { signal });
//
//   surface.addEventListener("zuipointerdown", e => {
//     console.log("world x:", e.detail.x, "y:", e.detail.y);
//   });

export function wireZuiPointerEvents(viewport, options = {}) {
  const target  = options.target  ?? viewport.root;
  const prefix  = options.prefix  ?? "zui";
  const aborter = options.signal ? null : new AbortController();
  const signal  = options.signal ?? aborter.signal;

  const emit = (original, type) => {
    const world = viewport.screenToWorld(original.clientX, original.clientY);
    target.dispatchEvent(new CustomEvent(`${prefix}${type}`, {
      bubbles: true,
      detail: { x: world.x, y: world.y, pointerId: original.pointerId, original }
    }));
  };

  for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel"]) {
    target.addEventListener(type, e => emit(e, type), { signal });
  }

  return () => aborter?.abort();
}
