import { test, expect } from "@playwright/test";

test.describe("snappable plugin", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
  });

  test("panel snaps to left edge when within threshold", async ({ page }) => {
    const finalLeft = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "Snap", {
        width: 200, height: 100,
        plugins: ["focusable", "stackable", "draggable", "closable", "titled", "snappable"]
      });
      // Move to 10px from left — within default threshold (16)
      handle.moveTo(10, 100);
      return handle.element.offsetLeft;
    });
    expect(finalLeft).toBe(0);
  });

  test("panel snaps to right edge when within threshold", async ({ page }) => {
    const { finalLeft, viewportWidth, panelWidth } = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "SnapRight", {
        width: 200, height: 100,
        plugins: ["focusable", "stackable", "draggable", "closable", "titled", "snappable"]
      });
      const vw = window.innerWidth;
      const pw = handle.element.offsetWidth;
      // Move to 10px from right edge — within threshold
      handle.moveTo(vw - pw - 10, 100);
      return { finalLeft: handle.element.offsetLeft, viewportWidth: vw, panelWidth: pw };
    });
    expect(finalLeft).toBe(viewportWidth - panelWidth);
  });

  test("panel does not snap when outside threshold", async ({ page }) => {
    const finalLeft = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "NoSnap", {
        width: 200, height: 100,
        plugins: ["focusable", "stackable", "draggable", "closable", "titled", "snappable"]
      });
      // Move to 30px from left — outside default threshold (16)
      handle.moveTo(30, 100);
      return handle.element.offsetLeft;
    });
    expect(finalLeft).toBe(30);
  });

  test("snapThreshold option controls snap distance", async ({ page }) => {
    const finalLeft = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "Threshold", {
        width: 200, height: 100,
        snapThreshold: 40,
        plugins: ["focusable", "stackable", "draggable", "closable", "titled", "snappable"]
      });
      // 30px from left — would not snap at default threshold but does at 40
      handle.moveTo(30, 100);
      return handle.element.offsetLeft;
    });
    expect(finalLeft).toBe(0);
  });

  test("snapEdges:false disables edge snapping", async ({ page }) => {
    const finalLeft = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "NoEdge", {
        width: 200, height: 100,
        snapEdges: false,
        plugins: ["focusable", "stackable", "draggable", "closable", "titled", "snappable"]
      });
      // Within default threshold but edges disabled
      handle.moveTo(8, 100);
      return handle.element.offsetLeft;
    });
    expect(finalLeft).toBe(8); // no snap
  });

  test("snapPanels:true snaps to other panel edges", async ({ page }) => {
    const { finalLeft, otherLeft } = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;

      // Place a reference panel at left=300
      const other = panel.open("", "Ref", {
        width: 200, height: 100, left: 300, top: 200,
        plugins: ["focusable", "stackable", "closable", "titled"]
      });

      const snap = panel.open("", "SnapPanel", {
        width: 200, height: 100,
        snapEdges: false,
        snapPanels: true,
        plugins: ["focusable", "stackable", "draggable", "closable", "titled", "snappable"]
      });

      // Move to 8px from left edge of reference panel (300 - 8 = 292)
      snap.moveTo(292, 200);
      return { finalLeft: snap.element.offsetLeft, otherLeft: other.element.offsetLeft };
    });
    // Should snap left edge to align with other panel's left
    expect(finalLeft).toBe(otherLeft);
  });

  test("top edge snapping works", async ({ page }) => {
    const finalTop = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "SnapTop", {
        width: 200, height: 100,
        plugins: ["focusable", "stackable", "draggable", "closable", "titled", "snappable"]
      });
      handle.moveTo(200, 8); // 8px from top — within threshold
      return handle.element.offsetTop;
    });
    expect(finalTop).toBe(0);
  });

  test("bottom edge snapping works", async ({ page }) => {
    const { finalTop, viewportHeight, panelHeight } = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "SnapBottom", {
        width: 200, height: 100,
        plugins: ["focusable", "stackable", "draggable", "closable", "titled", "snappable"]
      });
      const vh = window.innerHeight;
      const ph = handle.element.offsetHeight;
      handle.moveTo(200, vh - ph - 8);
      return { finalTop: handle.element.offsetTop, viewportHeight: vh, panelHeight: ph };
    });
    expect(finalTop).toBe(viewportHeight - panelHeight);
  });
});
