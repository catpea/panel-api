// escapable — pressing Escape while the panel is focused closes the panel.
// Honors options.closeOnEscape (default true). Modal panels and non-closable
// panels can opt out by setting closeOnEscape: false.

export default function escapable(handle, options, signal) {
  if (options && options.closeOnEscape === false) return;
  const onKeyDown = event => {
    if (event.key !== "Escape" && event.key !== "Esc") return;
    if (!handle.focused) return;
    event.stopPropagation();
    handle.close({ source: "escape" });
  };
  handle.element.addEventListener("keydown", onKeyDown, { signal });
}
