// closable — adds a close button to the caption that invokes handle.close().
// The close action goes through PanelHandle.close() so the cancelable
// `beforepanelclose` event fires and listeners can veto.

export default function closable(handle) {
  const button = handle.element.addAction("close", "bi-x-lg", "Close panel", () => {
    handle.close({ source: "button" });
  });
  button.dataset.close = "true";
}
