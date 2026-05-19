// createViewportLock — suspend and resume pan/zoom interactions.
//
// When a ZUI surface hosts native drag-and-drop or other operations that
// depend on pointer coordinates mapping 1:1 to the world, any active zoom or
// pan offset will corrupt the calculation. createViewportLock solves this by:
//
//   lock()   — abort interactions, reset viewport to identity (zoom=1, x=0, y=0).
//              Pointer events now map directly to world coordinates.
//   unlock() — re-wire interactions, reset viewport to identity so the user
//              starts from a clean state.
//
// Because createViewportLock owns the wireInteractions call, callers should
// set interactions: false when using framePage() / attachZUI():
//
//   const viewport = framePage({ interactions: false });
//   const lock = createViewportLock(viewport);
//   // ... later:
//   lock.lock();     // freeze before a drag operation
//   lock.unlock();   // restore interactivity when done
//
// Options forwarded to wireInteractions: ignoreSelector, zoomStep, signal.

import { wireInteractions } from "./interactions.js";

export function createViewportLock(viewport, options = {}) {
  let controller = null;

  function start() {
    controller = new AbortController();
    wireInteractions(viewport, { ...options, signal: controller.signal });
  }

  start();

  return {
    lock() {
      if (!controller || controller.signal.aborted) return;
      controller.abort();
      controller = null;
      viewport.reset();
    },

    unlock() {
      if (controller && !controller.signal.aborted) return;
      start();
      viewport.reset();
    },

    get locked() { return !controller || controller.signal.aborted; },

    teardown() {
      controller?.abort();
      controller = null;
    }
  };
}
