// The <dom-panel> custom element.
//
// The element owns its shell DOM (caption / actions / body), the abort signal
// that scopes all plugin teardown, and a small set of imperative methods.
// We deliberately keep the element thin: behaviour lives in plugins, which
// receive the PanelHandle and an AbortSignal at install time.
//
// We use the controller-as-mixin pattern from the original demo so that hot
// module reloads — which can leave an older `dom-panel` class registered on
// `customElements` — cannot strand a panel instance without its methods.
// Every panel instance is patched on creation; if the registered class still
// matches, the patch is a no-op.

import { observeCQU, updateCQU } from "./cqu.js";

export const PANEL_TAG = "dom-panel";

/**
 * Escape a string for safe HTML interpolation. Used internally for the
 * default title rendering; user-controlled HTML should go through
 * handle.setContent(node) instead.
 */
export function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
  }[char]));
}

export const PanelController = {
  /**
   * Boot the panel: configure options, render shell, install plugins,
   * focus. Called once per element by `createPanelElement`.
   */
  initialize(options, context = {}) {
    this.tabIndex = 0;
    this.options = {};
    this.context = context;            // { manager, handle, plugins, viewport? }
    this.plugins = new Set();
    this._aborter = new AbortController();
    this._teardowns = [];

    this.dataset.ready = "false";
    this.dataset.focused = "false";
    this.dataset.borderless = "false";
    this.dataset.minimized = "false";

    this.configure(options);
    this.renderShell();
    this.installPlugins();

    this.dataset.ready = "true";
    return this;
  },

  /**
   * Tear down: abort plugin signals, run extra teardowns, remove from DOM.
   * Safe to call more than once.
   */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._aborter?.abort();
    for (const teardown of this._teardowns.splice(0)) {
      try { teardown(); } catch (error) { console.warn("Panel teardown failed:", error); }
    }
    this.remove();
  },

  /**
   * Merge in option changes. Numeric width/height/left/top translate to inline
   * styles; the panel-radius CSS variable mirrors the radius option. Plugins
   * are stored on first call only — re-configuring does not reinstall plugins
   * (use destroy + recreate for that).
   */
  configure(options = {}) {
    this.options = { ...this.options, ...options };
    if (options.plugins) this.plugins = new Set(options.plugins);

    if (Number.isFinite(options.width)) this.style.width = `${options.width}px`;
    if (Number.isFinite(options.height)) this.style.height = `${options.height}px`;
    if (Number.isFinite(options.left)) this.style.setProperty("--panel-left", `${options.left}px`);
    if (Number.isFinite(options.top)) this.style.setProperty("--panel-top", `${options.top}px`);
    if (Number.isFinite(options.radius)) this.style.setProperty("--panel-radius", `${options.radius}px`);
    if (options.borderless !== undefined) this.dataset.borderless = String(options.borderless);
    if (options.role) this.setAttribute("role", options.role);
    if (options.labelledBy) this.setAttribute("aria-labelledby", options.labelledBy);
  },

  /**
   * Render the structural shell: caption (with title + actions) and body.
   * `part="..."` attributes let consumers theme via ::part() selectors and
   * let plugins target structural children without coupling to class names.
   */
  renderShell() {
    const title = this.options.title || "Panel";
    if (!this.hasAttribute("role")) this.setAttribute("role", "dialog");
    if (!this.hasAttribute("aria-label") && !this.hasAttribute("aria-labelledby")) {
      this.setAttribute("aria-label", title);
    }
    this.replaceChildren();

    const caption = document.createElement("div");
    caption.setAttribute("part", "caption");
    caption.innerHTML = `
      <span part="title">${escapeHTML(title)}</span>
      <span part="actions" aria-label="Panel actions"></span>
    `;

    const body = document.createElement("div");
    body.setAttribute("part", "body");

    this.append(caption, body);
    this.captionElement = caption;
    this.bodyElement = body;
    this.titleElement = caption.querySelector('[part~="title"]');
    this.actionsElement = caption.querySelector('[part~="actions"]');

    observeCQU(this.bodyElement);
  },

  /**
   * Install each plugin in order. Plugins receive (handle, options, signal)
   * per the documented contract. We catch and emit panelpluginerror on
   * failures so one bad plugin cannot break the whole panel.
   */
  installPlugins() {
    const registry = this.context?.plugins;
    if (!registry) return;
    const handle = this.context?.handle ?? this;
    const signal = this._aborter.signal;

    for (const name of this.plugins) {
      const plugin = registry.get(name);
      if (!plugin) {
        console.warn(`Panel plugin not registered: ${name}`);
        continue;
      }
      try {
        const installer = typeof plugin === "function" ? plugin : plugin.install;
        if (typeof installer !== "function") continue;
        const pluginOptions = this.options.pluginOptions?.[name] ?? this.options;
        const teardown = installer(handle, pluginOptions, signal);
        if (typeof teardown === "function") this._teardowns.push(teardown);
      } catch (error) {
        console.error(`Panel plugin "${name}" failed to install:`, error);
        this.dispatchEvent(new CustomEvent("panelpluginerror", {
          detail: { plugin: name, error },
          bubbles: true,
          composed: true
        }));
      }
    }
  },

  /**
   * Add a caption action button. The handler receives the created element
   * back so plugins can toggle `data-active` etc. Buttons stop propagation
   * to avoid double-firing focus or drag handlers.
   */
  addAction(name, icon, label, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("part", `action ${name}-action`);
    button.title = label;
    button.setAttribute("aria-label", label);
    button.dataset[name] = "";
    button.innerHTML = icon ? `<i class="bi ${icon}" aria-hidden="true"></i>` : "";
    button.addEventListener("click", event => {
      event.stopPropagation();
      handler(button, event);
    });
    this.actionsElement.append(button);
    return button;
  },

  /**
   * Request focus on this panel. Dispatches `panelrequestfocus` so the stack
   * plugin can promote z-order. Calling .focus() directly works too but skips
   * the stack update.
   */
  focusPanel() {
    this.dispatchEvent(new CustomEvent("panelrequestfocus", { bubbles: true, composed: true }));
    this.focus({ preventScroll: true });
  },

  /**
   * Replace body content. Accepts a Node (preferred) or an HTML string.
   * String content uses innerHTML — callers are responsible for trust.
   */
  setContent(markupOrNode) {
    this.bodyElement.replaceChildren();
    if (markupOrNode == null) return;
    if (markupOrNode instanceof Node) this.bodyElement.append(markupOrNode);
    else this.bodyElement.innerHTML = String(markupOrNode);
    updateCQU(this.bodyElement);
  },

  /** Update the displayed title without re-rendering the shell. */
  setTitle(title) {
    this.options.title = title;
    if (this.titleElement) this.titleElement.textContent = title;
    if (!this.hasAttribute("aria-labelledby")) this.setAttribute("aria-label", title);
  }
};

class DOMPanelElement extends HTMLElement {
  connectedCallback() {
    // If the element was created without going through createPanelElement
    // (declarative usage, hot reload), patch it here so methods are present.
    if (typeof this.initialize !== "function") Object.assign(this, PanelController);
  }
}

if (!customElements.get(PANEL_TAG)) {
  customElements.define(PANEL_TAG, DOMPanelElement);
}

/**
 * Create a `dom-panel` element, install the controller mixin, and run
 * initialize(). This is the recommended construction path; declarative
 * panels go through the same controller via connectedCallback() + manager
 * setup.
 */
export function createPanelElement(options, context) {
  const element = document.createElement(PANEL_TAG);
  Object.assign(element, PanelController);
  element.initialize(options, context);
  return element;
}
