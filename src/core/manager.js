// PanelManager — the top-level object exposed as the default `panel` export.
//
// Responsibilities:
//   * Create and own the panel layer (the fixed, non-zoomed sibling that holds
//     all dom-panel elements).
//   * Hold the plugin registry so authors can extend behaviour.
//   * Track live panel handles and the stacking order.
//   * Optionally hold a reference to a PanelViewport so coordinate-space="world"
//     panels can follow ZUI transforms.
//
// The manager is intentionally small. Everything user-visible — drag, resize,
// pinning, closing — is a plugin. The manager only does lifecycle bookkeeping.

import { PanelStack } from "./stack.js";
import { PanelHandle } from "./handle.js";
import { PanelController, PANEL_TAG } from "./element.js";
import { applyDefaults, normalizeOptions, PANEL_DEFAULTS } from "./options.js";
import { PANEL_EVENTS, dispatchPanelEvent } from "./events.js";

export class PanelManager extends EventTarget {
  /**
   * @param {object} [config]
   * @param {object} [config.plugins] — PluginRegistry instance (required for plugin support)
   * @param {HTMLElement} [config.layer] — pre-existing panel layer; auto-created if omitted
   * @param {Document} [config.document] — host document (default: globalThis.document)
   * @param {object} [config.defaults] — override PANEL_DEFAULTS
   */
  constructor({ plugins, layer = null, document: doc = globalThis.document, defaults = PANEL_DEFAULTS } = {}) {
    super();
    this.plugins = plugins;
    this.stack = new PanelStack();
    this.document = doc;
    this.defaults = defaults;
    this._layer = layer;
    this._handles = new Set();
    this._viewport = null;
  }

  /**
   * The optional ZUI viewport. Plugins that depend on world coordinates
   * (`pinnable`, `world`-anchored panels) consult `manager.viewport`.
   */
  get viewport() { return this._viewport; }

  attachViewport(viewport) {
    this._viewport = viewport;
    return this;
  }

  detachViewport() {
    this._viewport = null;
    return this;
  }

  /** The DOM container all panels are mounted into. Created lazily. */
  get layer() {
    if (this._layer && this._layer.isConnected) return this._layer;
    if (!this.document) return null;
    const existing = this.document.querySelector(".panel-layer[data-panel-api-layer]");
    if (existing) {
      this._layer = existing;
      return existing;
    }
    const layer = this.document.createElement("div");
    layer.className = "panel-layer";
    layer.setAttribute("data-panel-api-layer", "");
    layer.setAttribute("aria-live", "polite");
    this.document.body.appendChild(layer);
    this._layer = layer;
    return layer;
  }

  /**
   * Override the layer. Useful when callers want panels nested in a specific
   * subtree (e.g., inside a ZUI viewport sibling).
   */
  setLayer(element) {
    this._layer = element;
    return this;
  }

  /** Iterable view of every open handle. */
  getPanels() { return Array.from(this._handles); }

  /** The currently focused panel handle (or null). */
  get focusedPanel() { return this.stack.focused; }

  /** Find a handle by element or by id. */
  find(target) {
    if (!target) return null;
    for (const handle of this._handles) {
      if (handle === target) return handle;
      if (handle.element === target) return handle;
      if (handle.element.id && handle.element.id === target) return handle;
    }
    return null;
  }

  /**
   * Open a new panel.
   *
   * Three calling conventions, all equivalent:
   *   panel.open("", "Inspector", { width: 400, plugins: [...] })
   *   panel.open("", "Inspector", "width=400,plugins=resizable;closable")
   *   panel.open({ title: "Inspector", width: 400 })
   *
   * Returns a `PanelHandle`. The optional `url` argument exists for
   * window.open() familiarity; we log a console message but do not load it —
   * iframe-backed panels are a future feature (see TODO §11).
   */
  open(url = "", title = "Panel", features = {}) {
    if (url && typeof url === "object") {
      // panel.open({ ... }) form
      features = url;
      title = features.title ?? "Panel";
      url = "";
    }
    if (url) console.info("[panel-api] URL-backed panels are not yet implemented; opening empty panel:", url);

    const merged = applyDefaults(normalizeOptions(features), this.defaults);
    if (!merged.title) merged.title = title;

    // Create the raw element and wire handle.element before initialize() runs,
    // so plugins can access handle.element during installation.
    const element = this.document.createElement(PANEL_TAG);
    Object.assign(element, PanelController);

    const handle = new PanelHandle(element, {
      manager: this,
      plugins: this.plugins,
      stack: this.stack,
      get viewport() { return this._mgr._viewport; },
      _mgr: this
    });

    element.initialize(merged, {
      manager: this,
      plugins: this.plugins,
      handle,
      stack: this.stack,
      get viewport() { return this._mgr._viewport; },
      _mgr: this
    });

    // beforepanelopen is the chance for code to mutate options or veto.
    const allowed = dispatchPanelEvent(element, PANEL_EVENTS.BEFORE_OPEN,
      { handle, options: merged }, { cancelable: true });
    if (!allowed) {
      element.destroy();
      return null;
    }

    this.layer.appendChild(element);
    this._handles.add(handle);
    this.stack.add(handle);
    this.stack.bringToFront(handle);
    element.focusPanel();

    dispatchPanelEvent(element, PANEL_EVENTS.OPEN, { handle, options: merged });
    this.dispatchEvent(new CustomEvent("paneladded", { detail: { handle } }));

    // Clean up the manager's record when the element is destroyed by any path.
    element.addEventListener(PANEL_EVENTS.CLOSE, () => {
      this._handles.delete(handle);
      this.stack.remove(handle);
      this.dispatchEvent(new CustomEvent("panelremoved", { detail: { handle } }));
    }, { once: true });

    return handle;
  }

  /** Close every open panel. Cancelable events still fire individually. */
  closeAll() {
    for (const handle of [...this._handles]) handle.close();
  }
}
