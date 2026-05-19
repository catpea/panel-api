// toolbar-caption — compact drag strip for toolbox-style panels.
//
// Halves the default caption height to a minimal bar (no visible title text).
// Pair with title = "" to keep the DOM clean; the strip still provides a
// pointer-capture drag target for the `draggable` plugin.
// Override height with options.captionHeight (CSS length string).

export default function toolbarCaption(handle, options) {
  const height = options?.captionHeight ?? "22px";
  const panel = handle.element;
  panel.style.setProperty("--panel-caption-height", height);
  const caption = panel.captionElement;
  if (!caption) return;
  caption.style.minHeight = height;
  caption.style.padding = "0 6px";
}
