// Custom event types dispatched on panel elements and panel handles.
//
// We follow DOM convention: state changes have a cancelable `before*` phase
// followed by an after phase. Listeners that want to veto a state change call
// `event.preventDefault()` on the `before*` event; if preventDefault was
// called, the after event is not dispatched and the state change is rolled
// back by the caller.
//
// Naming convention: lowercase, no separator, matching the popover and dialog
// patterns ("beforetoggle", "toggle", etc.).

export const PANEL_EVENTS = Object.freeze({
  BEFORE_OPEN: "beforepanelopen",
  OPEN: "panelopen",
  BEFORE_CLOSE: "beforepanelclose",
  CLOSE: "panelclose",
  FOCUS: "panelfocus",
  BLUR: "panelblur",
  MOVE: "panelmove",
  RESIZE: "panelresize",
  MINIMIZE: "panelminimize",
  RESTORE: "panelrestore",
  PIN: "panelpin",
  UNPIN: "panelunpin",
  ANCHOR_CHANGE: "panelanchorchange",
  PLUGIN_ERROR: "panelpluginerror",
  LOAD: "panelload",
  ERROR: "panelerror",
  NAVIGATE: "panelnavigate"
});

/**
 * Dispatch a panel event on `target`. Returns `true` if the event was not
 * canceled (default behaviour was allowed), `false` if a listener called
 * `event.preventDefault()` on a cancelable event.
 */
export function dispatchPanelEvent(target, type, detail = {}, options = {}) {
  const event = new CustomEvent(type, {
    detail,
    bubbles: options.bubbles ?? true,
    composed: options.composed ?? true,
    cancelable: options.cancelable ?? false
  });
  return target.dispatchEvent(event);
}
