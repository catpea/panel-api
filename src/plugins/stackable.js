// stackable — listens for panelrequestfocus and uses the manager's PanelStack
// to raise this panel's --panel-z above all others.

export default function stackable(handle, _options, signal) {
  const stack = handle.context?.stack;
  if (!stack) return;
  const onRequest = event => {
    if (event.target !== handle.element) return;
    stack.bringToFront(handle);
  };
  handle.element.addEventListener("panelrequestfocus", onRequest, { signal });
}
