// Register every built-in plugin onto a registry. Called by index.js so the
// default panel manager ships with everything pre-installed; callers can also
// build a custom registry with a subset of plugins for smaller surface area.

import focusable from "./focusable.js";
import stackable from "./stackable.js";
import draggable from "./draggable.js";
import resizable from "./resizable.js";
import closable from "./closable.js";
import miniaturizable from "./miniaturizable.js";
import pinnable from "./pinnable.js";
import rounded from "./rounded.js";
import borderless from "./borderless.js";
import titled from "./titled.js";
import escapable from "./escapable.js";
import keyboard from "./keyboard.js";
import toolbarCaption from "./toolbar-caption.js";
import bodyDraggable from "./body-draggable.js";
import captionless from "./captionless.js";
import shrinkwrap from "./shrinkwrap.js";
import autoheight from "./autoheight.js";
import anchored from "./anchored.js";
import persistable from "./persistable.js";
import snappable from "./snappable.js";

export const BUILTIN_PLUGINS = {
  focusable,
  stackable,
  draggable,
  resizable,
  closable,
  miniaturizable,
  pinnable,
  rounded,
  borderless,
  titled,
  escapable,
  keyboard,
  "toolbar-caption": toolbarCaption,
  "body-draggable":  bodyDraggable,
  captionless,
  shrinkwrap,
  autoheight,
  anchored,
  persistable,
  snappable
};

export function registerBuiltins(registry) {
  for (const [name, plugin] of Object.entries(BUILTIN_PLUGINS)) {
    registry.define(name, plugin);
  }
  return registry;
}
