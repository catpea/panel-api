// titled — explicitly opt-in to showing the title. The shell renders a title
// by default; this plugin exists for symmetry with the design language ("a
// titled panel") and as a hook for future custom captions. Setting
// options.titled = false hides the title row.

export default function titled(handle, options) {
  if (options && options.titled === false) {
    handle.element.captionElement?.querySelector('[part~="title"]')?.style.setProperty("display", "none");
  }
}
