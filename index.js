// panel-api — main entry.
//
// The default export is a ready-to-use `panel` singleton. Authors who want
// multiple managers, a custom plugin registry, or to host panels in a
// non-default layer can import the classes directly and build their own.
//
// Usage:
//   import panel from "panel-api";              // default singleton
//   panel.open("", "Hello").setHTML("<h1>Hi</h1>");
//
//   import { PanelManager, PluginRegistry } from "panel-api";
//   const custom = new PanelManager({ plugins: new PluginRegistry() });
//
//   import { PanelViewport, framePage } from "panel-api/zui";
//   panel.attachViewport(framePage());

import { PanelManager } from "./src/core/manager.js";
import { PanelHandle } from "./src/core/handle.js";
import { PluginRegistry } from "./src/plugins/registry.js";
import { registerBuiltins, BUILTIN_PLUGINS } from "./src/plugins/builtins.js";
import { injectStyles, defaultStyles } from "./src/core/styles.js";
import { installDeclarative, promoteSection } from "./src/core/declarative.js";
import { PANEL_EVENTS } from "./src/core/events.js";
import { PANEL_DEFAULTS } from "./src/core/options.js";

// Inject default styles on first import. Authors who don't want this can
// remove the style element after import or import the source files directly.
if (typeof document !== "undefined") injectStyles(document);

// Build the default registry pre-populated with built-in plugins.
const defaultRegistry = registerBuiltins(new PluginRegistry());

// The shared default manager. Declarative HTML support is installed when the
// document is ready so `<button paneltarget>` / `<section panel>` work without
// extra wiring from the author.
const panel = new PanelManager({ plugins: defaultRegistry });

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => installDeclarative(panel, document), { once: true });
  } else {
    installDeclarative(panel, document);
  }
}

export default panel;

// Named exports for power users.
export {
  PanelManager,
  PanelHandle,
  PluginRegistry,
  BUILTIN_PLUGINS,
  PANEL_EVENTS,
  PANEL_DEFAULTS,
  injectStyles,
  defaultStyles,
  installDeclarative,
  promoteSection
};
