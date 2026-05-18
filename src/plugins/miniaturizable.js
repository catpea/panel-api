// miniaturizable — adds a minimize/restore toggle to the caption.
// We toggle data-minimized on the element; CSS in styles.js hides the body
// and resize handle when the panel is minimized.

export default function miniaturizable(handle) {
  handle.element.addAction("minimize", "bi-dash-lg", "Minimize panel", button => {
    if (handle.minimized) {
      handle.restore();
      button.dataset.active = "false";
    } else {
      handle.minimize();
      button.dataset.active = "true";
    }
  });
}
