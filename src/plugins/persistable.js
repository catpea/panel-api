// persistable — save and restore panel state (position, size, minimized) via
// localStorage. Activated when `persist: "storage-key"` is passed to panel.open().
//
// The storage key is namespaced under "panel-api:" to avoid collisions with
// unrelated application data. State is written on every panelmove, panelresize,
// panelminimize, and panelrestore event so closing the tab or refreshing always
// restores the last position.
//
// Callers can also trigger manual saves/restores via handle.saveState() and
// handle.restoreState() (both delegates to this plugin's storage key).

import { PANEL_EVENTS } from "../core/events.js";

export const STORAGE_PREFIX = "panel-api:";

export default function persistable(handle, options, signal) {
  const key = options.persist;
  if (!key || typeof key !== "string") return;

  const storageKey = STORAGE_PREFIX + key;

  // ── restore ──────────────────────────────────────────────────────────────
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(storageKey) ?? "null");
    if (saved) {
      if (Number.isFinite(saved.left) && Number.isFinite(saved.top))
        handle.moveTo(saved.left, saved.top);
      if (Number.isFinite(saved.width) && Number.isFinite(saved.height))
        handle.resizeTo(saved.width, saved.height);
      if (saved.minimized === true)  handle.minimize();
    }
  } catch { /* ignore corrupt or inaccessible storage */ }

  // ── save ─────────────────────────────────────────────────────────────────
  const save = () => {
    try {
      const { left, top, width, height } = handle.bounds;
      globalThis.localStorage?.setItem(storageKey, JSON.stringify({ left, top, width, height, minimized: handle.minimized }));
    } catch { /* ignore quota / security errors */ }
  };

  const el = handle.element;
  el.addEventListener(PANEL_EVENTS.MOVE,     save, { signal });
  el.addEventListener(PANEL_EVENTS.RESIZE,   save, { signal });
  el.addEventListener(PANEL_EVENTS.MINIMIZE, save, { signal });
  el.addEventListener(PANEL_EVENTS.RESTORE,  save, { signal });
}
