// Z-order management for the panel stack.
//
// Panels are stacked by setting --panel-z on the element. The PanelStack
// hands out monotonically increasing z values when a panel is brought to the
// front, and tracks the currently focused panel so plugins (and tests) can
// query it without scanning the DOM.

export class PanelStack {
  /** @param {number} base — starting z-index (default 1000) */
  constructor(base = 1000) {
    this.base = base;
    this.next = base;
    this.focused = null;
    this.panels = new Set();
  }

  add(handle) {
    this.panels.add(handle);
  }

  remove(handle) {
    this.panels.delete(handle);
    if (this.focused === handle) this.focused = null;
  }

  bringToFront(handle) {
    if (!handle || !handle.element) return;
    handle.element.style.setProperty("--panel-z", String(++this.next));
    for (const other of this.panels) {
      if (other !== handle) other.element.dataset.focused = "false";
    }
    handle.element.dataset.focused = "true";
    this.focused = handle;
  }

  reset() {
    this.next = this.base;
    for (const handle of this.panels) handle.element.style.removeProperty("--panel-z");
  }
}
