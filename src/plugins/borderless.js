// borderless — toggles the panel border off. Useful for toolboxes that want
// to read as part of the background rather than a discrete window. Pair with
// rounded for floating-pill panels.

export default function borderless(handle) {
  handle.element.dataset.borderless = "true";
}
