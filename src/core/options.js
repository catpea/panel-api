// Option normalization for panel.open().
//
// We accept two input shapes for friendliness:
//   1. A `window.open()`-style feature string: "width=420,height=320,plugins=titled;closable"
//   2. A plain options object: { width: 420, height: 320, plugins: ["titled", "closable"] }
//
// The feature string exists for familiarity with the existing JavaScript window
// model. New code should prefer the options-object form because it is typed,
// easier to compose, and avoids the string-escaping problem.

const NUMERIC_KEYS = new Set([
  "width", "height", "left", "top", "radius",
  "minWidth", "minHeight", "maxWidth", "maxHeight",
  "worldX", "worldY", "offset"
]);

const BOOLEAN_KEYS = new Set([
  "borderless", "modal", "closeOnEscape", "keyboardMove", "keyboardResize",
  "snap", "followScroll", "followZoom",
  "followAnchor", "snapEdges", "snapPanels"
]);

/**
 * Parse a feature string into an options object.
 * Plugin lists may be separated by `;` or `|` inside the value.
 */
export function parseFeatureString(featureString = "") {
  const options = {};
  if (!featureString || typeof featureString !== "string") return options;

  for (const part of featureString.split(",").map(value => value.trim()).filter(Boolean)) {
    const [rawKey, ...rawRest] = part.split("=");
    const key = rawKey.trim();
    const value = rawRest.length ? rawRest.join("=").trim() : "true";

    if (NUMERIC_KEYS.has(key)) options[key] = Number(value);
    else if (key === "plugins") options.plugins = value.split(/[|;]/).map(v => v.trim()).filter(Boolean);
    else if (BOOLEAN_KEYS.has(key) || value === "true" || value === "false") options[key] = value === "true";
    else options[key] = value;
  }
  return options;
}

/**
 * Normalize options into a uniform shape. Accepts a feature string OR an object.
 * Returns a brand new object — callers can safely mutate it.
 */
export function normalizeOptions(input) {
  if (input == null) return {};
  if (typeof input === "string") return parseFeatureString(input);
  if (typeof input !== "object") return {};
  // Shallow copy so we never mutate the caller's object.
  return { ...input };
}

/**
 * Merge defaults under the supplied options. Caller options always win.
 * Arrays are replaced (not concatenated) so callers can override the plugin list.
 */
export function applyDefaults(options, defaults) {
  const merged = { ...defaults, ...options };
  return merged;
}

/**
 * The shipped defaults for `panel.open()`. Override via PanelManager constructor.
 */
export const PANEL_DEFAULTS = {
  title: "Panel",
  width: 400,
  height: 300,
  left: 96,
  top: 96,
  radius: 16,
  coordinateSpace: "screen",
  plugins: [
    "focusable",
    "stackable",
    "draggable",
    "resizable",
    "closable",
    "miniaturizable",
    "pinnable",
    "rounded",
    "titled",
    "escapable"
  ]
};
