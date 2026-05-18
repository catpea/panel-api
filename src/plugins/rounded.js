// rounded — sets the --panel-radius CSS variable to options.radius.
// Pure styling sugar; you can achieve the same by setting `radius:` in options
// directly. Useful when toggling at runtime: handle.element.classList toggling
// can swap rounded styles without removing the plugin.

export default function rounded(handle, options) {
  const radius = Number.isFinite(options.radius) ? options.radius : 24;
  handle.element.style.setProperty("--panel-radius", `${radius}px`);
}
