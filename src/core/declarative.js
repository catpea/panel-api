// Declarative HTML support.
//
// Mirrors the popover API surface: a section can declare itself a panel via
// the `panel` attribute, and buttons can toggle that panel via
// `paneltarget="id"` / `paneltargetaction="toggle|open|close"`.
//
// Example:
//   <button paneltarget="inspector" paneltargetaction="toggle">Inspector</button>
//   <section id="inspector" panel panel-title="Inspector" panel-resizable panel-closable>
//     ...
//   </section>
//
// The declarative section's children become the panel body. The element is
// promoted in place — its id and contents are preserved — so authors can keep
// progressive-enhancement semantics.

const PLUGIN_ATTRS = [
  "draggable", "resizable", "closable", "focusable", "stackable",
  "miniaturizable", "pinnable", "rounded", "borderless", "titled", "escapable"
];

function collectPluginsFromAttributes(section) {
  const plugins = [];
  for (const attr of PLUGIN_ATTRS) {
    if (section.hasAttribute(`panel-${attr}`)) plugins.push(attr);
  }
  return plugins;
}

function readNumericAttribute(section, name) {
  const raw = section.getAttribute(name);
  if (raw == null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Turn a `<section panel>` element into an open panel managed by `manager`.
 * Returns the resulting PanelHandle, or null if no <section panel> was found.
 *
 * We mark the section with the `panel-open` attribute (not a dataset) so the
 * matching CSS rule `[panel]:not([panel-open]) { display: none; }` correctly
 * unhides it when a sibling button re-opens it. The original children are
 * moved into the panel body and restored to the section when the panel closes.
 */
export function promoteSection(section, manager) {
  if (!section || !manager) return null;
  if (section.hasAttribute("panel-open")) return manager.find(section.id);

  const url = section.getAttribute("panel-url") ?? "";
  const coordinateSpace = section.getAttribute("panel-coordinate-space") ?? undefined;
  // For URL-backed panels the iframe fills the body; existing DOM children stay in the section.
  const children = url ? [] : [...section.childNodes];

  const options = {
    title: section.getAttribute("panel-title") || section.id || "Panel",
    width: readNumericAttribute(section, "panel-width") ?? 400,
    height: readNumericAttribute(section, "panel-height") ?? 300,
    left: readNumericAttribute(section, "panel-left") ?? 96,
    top: readNumericAttribute(section, "panel-top") ?? 96,
    plugins: collectPluginsFromAttributes(section).length
      ? collectPluginsFromAttributes(section)
      : undefined
  };

  if (coordinateSpace !== undefined) options.coordinateSpace = coordinateSpace;

  // iframe attributes
  const sandbox = section.getAttribute("panel-sandbox");
  if (sandbox !== null) options.sandbox = sandbox;
  const allow = section.getAttribute("panel-allow");
  if (allow !== null) options.allow = allow;
  const referrerPolicy = section.getAttribute("panel-referrerpolicy");
  if (referrerPolicy !== null) options.referrerPolicy = referrerPolicy;

  // element-anchor attributes
  const anchorId = section.getAttribute("panel-anchor");
  if (anchorId) {
    const anchorEl = document.getElementById(anchorId);
    if (anchorEl) options.anchorElement = anchorEl;
  }
  const placement = section.getAttribute("panel-placement");
  if (placement) options.placement = placement;
  const offsetAttr = section.getAttribute("panel-offset");
  if (offsetAttr !== null) {
    const v = Number(offsetAttr);
    if (Number.isFinite(v)) options.offset = v;
  }

  // persistence
  const persist = section.getAttribute("panel-persist");
  if (persist) options.persist = persist;

  const handle = manager.open(url, options.title, options);
  if (!handle) return null;
  if (children.length) handle.body.append(...children);
  section.setAttribute("panel-open", "");
  if (section.id) handle.element.id = section.id + "--panel";

  handle.element.addEventListener("panelclose", () => {
    section.removeAttribute("panel-open");
    if (!url && handle.body.childNodes.length) section.append(...handle.body.childNodes);
  }, { once: true });

  return handle;
}

/**
 * Wire `paneltarget` buttons to their targets. Re-callable; idempotent per
 * button. Returns a function that detaches all listeners.
 */
export function wireDeclarativeButtons(manager, root = document) {
  const cleanups = [];
  for (const button of root.querySelectorAll("[paneltarget]")) {
    if (button.dataset.panelTargetWired === "true") continue;
    button.dataset.panelTargetWired = "true";

    const handler = event => {
      const id = button.getAttribute("paneltarget");
      const action = button.getAttribute("paneltargetaction") || "toggle";
      const section = root.getElementById?.(id) ?? document.getElementById(id);
      if (!section) return;

      const existing = manager.find(id) ?? (section.dataset.panelOpen === "true" ? manager.find(section.id) : null);
      if (action === "close" && existing) existing.close();
      else if (action === "open" || !existing) promoteSection(section, manager);
      else if (action === "toggle") existing.close();
    };

    button.addEventListener("click", handler);
    cleanups.push(() => {
      button.removeEventListener("click", handler);
      delete button.dataset.panelTargetWired;
    });
  }
  return () => { for (const fn of cleanups) fn(); };
}

/**
 * Install declarative support on the manager. Scans current DOM once and
 * watches for added nodes so newly-injected `[paneltarget]` buttons are wired
 * automatically. `wireDeclarativeButtons` is idempotent (skips buttons that
 * already carry the `data-panel-target-wired` marker) so re-running on every
 * mutation is safe and cannot loop.
 *
 * Returns a teardown function that disconnects the observer.
 */
export function installDeclarative(manager, root = document) {
  if (!manager || !root) return () => {};

  wireDeclarativeButtons(manager, root);

  const observer = new MutationObserver(mutations => {
    let added = false;
    for (const m of mutations) if (m.addedNodes.length) { added = true; break; }
    if (added) wireDeclarativeButtons(manager, root);
  });
  observer.observe(root.body || root, { childList: true, subtree: true });

  return () => observer.disconnect();
}
