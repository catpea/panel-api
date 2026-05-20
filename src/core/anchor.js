// Anchor placement geometry — pure functions, no DOM side effects.
//
// Used by the `anchored` plugin to compute where to place a floating element
// (the panel) relative to a reference element (the anchor). All coordinates
// are in client/screen space so callers can feed in getBoundingClientRect()
// values directly.

const OPPOSITE_SIDE = { top: "bottom", bottom: "top", left: "right", right: "left" };

/**
 * Compute the screen-space position for placing `floatingRect` relative to
 * `anchorRect` using `placement` and `offset`.
 *
 * placement: "top" | "bottom" | "left" | "right"
 *          | "top-start" | "top-end"
 *          | "bottom-start" | "bottom-end"
 *          | "left-start" | "left-end"
 *          | "right-start" | "right-end"
 *
 * Returns { left, top, side, align, actualPlacement }.
 */
export function computeAnchorPosition(anchorRect, floatingRect, placement = "bottom", offset = 8) {
  const { left: ax, top: ay, right: ar, bottom: ab, width: aw, height: ah } = anchorRect;
  const fw = floatingRect.width;
  const fh = floatingRect.height;

  const [side, align = "center"] = placement.split("-");

  // Center position for each side
  const base = {
    top:    { left: ax + (aw - fw) / 2, top: ay - fh - offset },
    bottom: { left: ax + (aw - fw) / 2, top: ab + offset },
    left:   { left: ax - fw - offset,   top: ay + (ah - fh) / 2 },
    right:  { left: ar + offset,        top: ay + (ah - fh) / 2 },
  };

  let { left, top } = base[side] ?? base.bottom;

  // Alignment adjustments for the cross axis
  if (side === "top" || side === "bottom") {
    if (align === "start") left = ax;
    else if (align === "end") left = ar - fw;
  } else {
    if (align === "start") top = ay;
    else if (align === "end") top = ab - fh;
  }

  return { left, top, side, align, actualPlacement: `${side}${align !== "center" ? `-${align}` : ""}` };
}

/**
 * Apply collision avoidance to a computed anchor position.
 *
 * strategy: "flip"  — try the opposite side if the preferred one clips
 *           "shift" — clamp to viewport without flipping
 *           "none"  — no adjustment
 *
 * Returns a (possibly adjusted) position object.
 */
export function applyCollisionAvoidance(position, anchorRect, floatingRect, offset, strategy, viewport) {
  if (strategy === "none") return position;

  const { left, top, side, align } = position;
  const fw = floatingRect.width;
  const fh = floatingRect.height;
  const vw = viewport.width;
  const vh = viewport.height;

  if (strategy === "shift") {
    return { ...position, left: clamp(left, 0, vw - fw), top: clamp(top, 0, vh - fh) };
  }

  // "flip": try opposite side if current side clips, then shift remainder
  if (strategy === "flip") {
    const clipsOnSide = {
      top: top < 0, bottom: top + fh > vh,
      left: left < 0, right: left + fw > vw,
    };

    if (clipsOnSide[side]) {
      const flippedSide = OPPOSITE_SIDE[side];
      const flippedPlacement = align === "center" ? flippedSide : `${flippedSide}-${align}`;
      const flipped = computeAnchorPosition(anchorRect, floatingRect, flippedPlacement, offset);
      const flippedClips = (side === "top" || side === "bottom")
        ? (flipped.top < 0 || flipped.top + fh > vh)
        : (flipped.left < 0 || flipped.left + fw > vw);
      if (!flippedClips) {
        // Flipped side fits — also shift cross axis if needed
        return { ...flipped, left: clamp(flipped.left, 0, vw - fw), top: clamp(flipped.top, 0, vh - fh) };
      }
    }

    // Can't flip, or flip also clips — shift to fit
    return { ...position, left: clamp(left, 0, vw - fw), top: clamp(top, 0, vh - fh) };
  }

  return position;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(v, hi)); }
