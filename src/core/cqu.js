// Container Query Unit (CQU) observer for panel bodies.
//
// Modern browsers support `cqw`/`cqh` natively. We expose a `--panel-cqw`
// CSS variable (1% of inline size as `px`) so content authors can size
// children relative to the panel itself, not the viewport. This is critical
// for panels because they zoom under ZUI yet must read their own dimensions
// for layout. A single shared ResizeObserver avoids per-panel observers.

let sharedObserver = null;

function ensureObserver() {
  if (sharedObserver) return sharedObserver;
  sharedObserver = new ResizeObserver(entries => {
    for (const entry of entries) updateCQU(entry.target);
  });
  return sharedObserver;
}

/** Push --panel-cqw/h variables onto the element based on its current size. */
export function updateCQU(element) {
  if (!element) return;
  const inline = element.clientWidth || 1;
  const block = element.clientHeight || 1;
  element.style.setProperty("--panel-cqw", `${inline / 100}px`);
  element.style.setProperty("--panel-cqh", `${block / 100}px`);
}

/** Start observing CQU on the element. Idempotent. */
export function observeCQU(element) {
  if (!element || element.dataset.cquObserved === "true") return;
  element.dataset.cquObserved = "true";
  updateCQU(element);
  ensureObserver().observe(element);
}

/** Stop observing. Mostly used in tests. */
export function unobserveCQU(element) {
  if (!element || element.dataset.cquObserved !== "true") return;
  delete element.dataset.cquObserved;
  sharedObserver?.unobserve(element);
}
