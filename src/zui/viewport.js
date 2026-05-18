// PanelViewport — the zooming/panning surface companion to Panel API.
//
// A viewport pairs a fixed "root" element (the bounding window into the
// world) with a "surface" element that contains the world content. The
// surface is transformed via CSS variables `--viewport-x`, `--viewport-y`,
// `--viewport-zoom` which are read by a 2-D translate+scale transform.
//
// Panels live *outside* the surface — usually in a sibling layer — so they
// remain crisp and unaffected by the world transform. Plugins like `pinnable`
// project panel positions into world space so they can follow the viewport.
//
// The viewport dispatches `viewportchange` on `window` (configurable) every
// time the transform updates. Listeners receive the current snapshot in
// `event.detail`.
//
// We keep math straightforward (scale + translate) — no rotation/skew — but
// the screenToWorld / worldToScreen helpers are pure functions so a future
// matrix-based implementation can be swapped in without breaking callers.

export const VIEWPORT_CHANGE_EVENT = "viewportchange";

export class PanelViewport extends EventTarget {
  /**
   * @param {object} config
   * @param {HTMLElement} config.root — the bounding viewport (clipped)
   * @param {HTMLElement} config.surface — the transformed surface inside root
   * @param {object} [config.bounds] — { minZoom, maxZoom }
   * @param {EventTarget} [config.broadcast] — defaults to window; pass null to disable global broadcast
   */
  constructor({ root, surface, bounds = {}, broadcast = globalThis.window } = {}) {
    super();
    if (!root || !surface) throw new TypeError("PanelViewport requires { root, surface }");
    this.root = root;
    this.surface = surface;
    this.minZoom = bounds.minZoom ?? 0.1;
    this.maxZoom = bounds.maxZoom ?? 8;
    this.broadcast = broadcast;

    this.zoom = 1;
    this.x = 0;
    this.y = 0;
    this.apply();
  }

  /**
   * Set the zoom, anchored at a screen position. The world point currently
   * under the anchor stays fixed under the anchor after zooming — the standard
   * mousewheel-zoom feel.
   */
  setZoom(zoom, anchorClientX = this.root.clientWidth / 2, anchorClientY = this.root.clientHeight / 2) {
    const nextZoom = Math.max(this.minZoom, Math.min(zoom, this.maxZoom));
    const before = this.screenToWorld(anchorClientX, anchorClientY);
    this.zoom = nextZoom;
    this.x = anchorClientX - before.x * this.zoom;
    this.y = anchorClientY - before.y * this.zoom;
    this.apply();
    this.emitChange();
  }

  /** Pan by a screen-space delta. */
  panBy(dx, dy) {
    this.x += dx;
    this.y += dy;
    this.apply();
    this.emitChange();
  }

  /** Set absolute pan in screen-space coordinates. */
  panTo(x, y) {
    this.x = x;
    this.y = y;
    this.apply();
    this.emitChange();
  }

  /** Reset zoom and pan to identity. */
  reset() {
    this.zoom = 1;
    this.x = 0;
    this.y = 0;
    this.apply();
    this.emitChange();
  }

  // ---------- coordinate conversion ----------

  /**
   * Convert client-space coordinates (clientX / clientY from a pointer event)
   * into world coordinates inside the surface.
   */
  screenToWorld(clientX, clientY) {
    const rect = this.root.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.x) / this.zoom,
      y: (clientY - rect.top - this.y) / this.zoom
    };
  }

  /**
   * Convert world coordinates back to client-space.
   */
  worldToScreen(x, y) {
    const rect = this.root.getBoundingClientRect();
    return {
      x: rect.left + this.x + x * this.zoom,
      y: rect.top + this.y + y * this.zoom
    };
  }

  /** Snapshot the current viewport state. Useful for persistence. */
  snapshot() {
    return { zoom: this.zoom, x: this.x, y: this.y };
  }

  /** Restore a previous snapshot. */
  restore(snapshot) {
    if (!snapshot) return;
    if (Number.isFinite(snapshot.zoom)) this.zoom = snapshot.zoom;
    if (Number.isFinite(snapshot.x)) this.x = snapshot.x;
    if (Number.isFinite(snapshot.y)) this.y = snapshot.y;
    this.apply();
    this.emitChange();
  }

  // ---------- internals ----------

  apply() {
    this.surface.style.setProperty("--viewport-zoom", this.zoom);
    this.surface.style.setProperty("--viewport-x", `${this.x}px`);
    this.surface.style.setProperty("--viewport-y", `${this.y}px`);
    if (!this.surface.style.transform) {
      // Ensure the transform actually consumes the variables when the user
      // has not set their own CSS. Idempotent: subsequent applies leave the
      // user-supplied transform untouched.
      this.surface.style.transform =
        "translate(var(--viewport-x, 0px), var(--viewport-y, 0px)) scale(var(--viewport-zoom, 1))";
      this.surface.style.transformOrigin = "0 0";
      this.surface.style.willChange = "transform";
    }
  }

  emitChange() {
    const snapshot = this.snapshot();
    const event = new CustomEvent(VIEWPORT_CHANGE_EVENT, { detail: snapshot });
    this.dispatchEvent(event);
    if (this.broadcast && this.broadcast !== this) {
      this.broadcast.dispatchEvent(new CustomEvent(VIEWPORT_CHANGE_EVENT, { detail: snapshot }));
    }
  }
}
