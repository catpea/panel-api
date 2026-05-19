// panel-api/zui — ZUI viewport entry.
//
// Importable separately so authors who don't need ZUI never pay for it.
//
//   import { PanelViewport, framePage, wireInteractions } from "panel-api/zui";
//
// PanelViewport holds the math; framePage() is the one-call "frame my page"
// helper; wireInteractions() attaches default pan/zoom pointer + wheel input.

export { PanelViewport, VIEWPORT_CHANGE_EVENT } from "./src/zui/viewport.js";
export { wireInteractions } from "./src/zui/interactions.js";
export { framePage, attachZUI } from "./src/zui/frame-page.js";
export { wireZuiPointerEvents } from "./src/zui/zui-pointer-events.js";
export { createViewportLock } from "./src/zui/viewport-lock.js";
