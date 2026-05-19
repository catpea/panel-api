// captionless — remove the caption strip entirely.
//
// Hides the caption element and sets --panel-caption-height to 0px so the
// body fills the full panel height. Use this instead of `titled: false` when
// you want zero chrome — no drag strip, no action buttons.
//
// Pair with `body-draggable` when the panel still needs to be moveable.

export default function captionless(handle) {
  const panel = handle.element;
  if (panel.captionElement) panel.captionElement.style.display = "none";
  panel.style.setProperty("--panel-caption-height", "0px");
}
