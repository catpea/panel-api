// PluginRegistry — pluggable behaviours for panels.
//
// Plugins are functions (or { install } objects) registered by name. When a
// panel is opened with `plugins: ["name1", "name2"]` each named installer is
// called with `(handle, options, signal)`. Plugins should attach DOM listeners
// using the supplied AbortSignal so cleanup happens automatically on close:
//
//   panel.plugins.define("highlight", (handle, options, signal) => {
//     handle.element.addEventListener("pointerenter",
//       () => handle.element.style.outline = "2px solid #f4d35e",
//       { signal });
//   });
//
// Third parties may publish plugin packages on npm and register them at runtime.

export class PluginRegistry {
  constructor() {
    this._plugins = new Map();
  }

  /**
   * Register a plugin.
   * @param {string} name
   * @param {(handle, options, signal) => (void|Function) | { install: Function }} plugin
   * @returns {PluginRegistry}
   */
  define(name, plugin) {
    if (!name || typeof name !== "string") throw new TypeError("Plugin name must be a non-empty string");
    if (typeof plugin !== "function" && (plugin == null || typeof plugin.install !== "function")) {
      throw new TypeError(`Plugin "${name}" must be a function or have an install() method`);
    }
    this._plugins.set(name, plugin);
    return this;
  }

  /** Look up a plugin by name. Returns undefined if not registered. */
  get(name) { return this._plugins.get(name); }

  /** Check whether a plugin is registered. */
  has(name) { return this._plugins.has(name); }

  /** Unregister a plugin. Already-installed plugin instances continue to run. */
  delete(name) { return this._plugins.delete(name); }

  /** Iterable of plugin names. */
  names() { return [...this._plugins.keys()]; }
}
