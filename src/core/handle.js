// PanelHandle — the user-facing object returned from `panel.open()`.
//
// The handle is the stable interface for everything callers want to do with a
// panel: read state, listen for events, change content, move/resize, close.
// It wraps the element (so the element can be swapped for a different DOM
// representation in the future) and forwards event subscriptions to it.
//
// A note on `document.body`: window.open() returns a Window whose `document`
// can be written to. Some legacy panel APIs imitate that surface. We expose a
// minimal `handle.document.body` shim so code adapted from window.open() can
// keep working, but new code should use `handle.setContent(node)`.

import { PANEL_EVENTS, dispatchPanelEvent } from "./events.js";

export class PanelHandle {
  /**
   * @param {HTMLElement} element — the dom-panel element backing this handle
   * @param {object} context — { manager, plugins, viewport, stack }
   */
  constructor(element, context) {
    this.element = element;
    this.context = context;
    this.closed = false;
  }

  /**
   * window.open() compatibility shim — exposes `handle.document.body` so code
   * migrated from window.open() keeps working. New code should prefer
   * `handle.body` or `handle.setContent(...)` directly.
   */
  get document() {
    const handle = this;
    return { get body() { return handle.element?.bodyElement; } };
  }

  // -------- structural accessors --------

  /** The caption row (drag target). */
  get caption() { return this.element.captionElement; }

  /** The scrollable body container. */
  get body() { return this.element.bodyElement; }

  /** The container that holds caption action buttons. */
  get actions() { return this.element.actionsElement; }

  /** Plain bounds in panel-layer coordinates (screen-space for default panels). */
  get bounds() {
    const el = this.element;
    return {
      left: el.offsetLeft,
      top: el.offsetTop,
      width: el.offsetWidth,
      height: el.offsetHeight
    };
  }

  /** Frozen view of the options the panel was opened with (plus runtime mutations). */
  get options() { return this.element.options; }

  /** True while the panel is the focused panel in its stack. */
  get focused() { return this.element.dataset.focused === "true"; }

  /** Minimization state. */
  get minimized() { return this.element.dataset.minimized === "true"; }

  /** Pinned-to-world state. */
  get pinned() { return this.element.dataset.pinned === "true"; }

  // -------- imperative operations --------

  setContent(markupOrNode) { this.element.setContent(markupOrNode); return this; }
  setHTML(html) { this.element.setContent(String(html)); return this; }
  setTitle(title) { this.element.setTitle(title); return this; }
  replaceChildren(...nodes) { this.element.bodyElement.replaceChildren(...nodes); return this; }

  focus() { this.element.focusPanel(); return this; }

  // -------- iframe API --------

  /** The <iframe> element, or null if this is not a URL-backed panel. */
  get iframe() { return this.element.iframeElement ?? null; }

  /** The current URL of the panel (options.url), or null for content panels. */
  get url() { return this.element.options?.url ?? null; }

  /**
   * Navigate the iframe to a new URL. Dispatches cancelable `panelnavigate`
   * first; returns false if canceled, true otherwise. No-op for non-URL panels.
   */
  navigate(url) { return this.element.navigate(url); }

  /** Reload the iframe. Cross-origin safe. No-op for non-URL panels. */
  reload() { this.element.reload(); return this; }

  // -------- state persistence --------

  /**
   * Manually save current position, size, and minimized state to localStorage.
   * Requires `persist: "key"` in options (set via `persistable` plugin).
   */
  saveState() {
    const key = this.element.options?.persist;
    if (!key) return this;
    try {
      const { left, top, width, height } = this.bounds;
      globalThis.localStorage?.setItem(
        `panel-api:${key}`,
        JSON.stringify({ left, top, width, height, minimized: this.minimized })
      );
    } catch { /* ignore storage errors */ }
    return this;
  }

  /**
   * Manually restore state from localStorage for the panel's `persist` key.
   */
  restoreState() {
    const key = this.element.options?.persist;
    if (!key) return this;
    try {
      const saved = JSON.parse(globalThis.localStorage?.getItem(`panel-api:${key}`) ?? "null");
      if (saved) {
        if (Number.isFinite(saved.left) && Number.isFinite(saved.top))
          this.moveTo(saved.left, saved.top);
        if (Number.isFinite(saved.width) && Number.isFinite(saved.height))
          this.resizeTo(saved.width, saved.height);
        if (saved.minimized === true)  this.minimize();
        if (saved.minimized === false) this.restore();
      }
    } catch { /* ignore corrupt storage */ }
    return this;
  }

  moveTo(left, top) {
    this.element.style.setProperty("--panel-left", `${left}px`);
    this.element.style.setProperty("--panel-top", `${top}px`);
    dispatchPanelEvent(this.element, PANEL_EVENTS.MOVE, { left, top });
    return this;
  }

  moveBy(dx, dy) {
    const { left, top } = this.bounds;
    return this.moveTo(left + dx, top + dy);
  }

  resizeTo(width, height) {
    if (Number.isFinite(width)) this.element.style.width = `${width}px`;
    if (Number.isFinite(height)) this.element.style.height = `${height}px`;
    dispatchPanelEvent(this.element, PANEL_EVENTS.RESIZE, { width, height });
    return this;
  }

  minimize() {
    if (this.minimized) return this;
    this.element.dataset.minimized = "true";
    dispatchPanelEvent(this.element, PANEL_EVENTS.MINIMIZE);
    return this;
  }

  restore() {
    if (!this.minimized) return this;
    this.element.dataset.minimized = "false";
    dispatchPanelEvent(this.element, PANEL_EVENTS.RESTORE);
    return this;
  }

  /**
   * Close the panel. Dispatches `beforepanelclose` first; if a listener calls
   * preventDefault() the close is aborted. Returns `true` if the panel was
   * actually closed.
   */
  close(detail = {}) {
    if (this.closed) return true;
    const allowed = dispatchPanelEvent(this.element, PANEL_EVENTS.BEFORE_CLOSE, detail, { cancelable: true });
    if (!allowed) return false;
    this.closed = true;
    dispatchPanelEvent(this.element, PANEL_EVENTS.CLOSE, detail);
    this.context?.stack?.remove(this);
    this.context?.manager?._handles?.delete(this);
    this.element.destroy();
    return true;
  }

  // -------- event subscriptions (forwarded to element) --------

  addEventListener(type, listener, options) {
    this.element.addEventListener(type, listener, options);
    return this;
  }

  removeEventListener(type, listener, options) {
    this.element.removeEventListener(type, listener, options);
    return this;
  }

  dispatchEvent(event) { return this.element.dispatchEvent(event); }
}
