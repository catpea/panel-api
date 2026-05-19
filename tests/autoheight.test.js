import { test, expect } from "@playwright/test";

// Wait for ResizeObserver to settle (fires after layout, slightly async in headless Firefox).
const settle = () => new Promise(r => setTimeout(r, 50));

test.describe("autoheight plugin", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
  });

  test("panel height equals caption + body after open", async ({ page }) => {
    const { panelH, captionH, bodyH } = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "Test", {
        width: 200, minWidth: "auto",
        plugins: ["captionless", "autoheight"]
      });
      const el = handle.element;
      await new Promise(r => setTimeout(r, 50));
      return {
        panelH: el.offsetHeight,
        captionH: el.captionElement.offsetHeight,
        bodyH: el.bodyElement.offsetHeight,
      };
    });

    expect(panelH).toBe(captionH + bodyH);
  });

  test("panel height updates when content is added", async ({ page }) => {
    const { initial, after } = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "Test", {
        width: 200, minWidth: "auto",
        plugins: ["captionless", "autoheight"]
      });
      const el = handle.element;
      await new Promise(r => setTimeout(r, 50));
      const initial = el.offsetHeight;

      const extra = document.createElement("div");
      extra.style.height = "100px";
      el.bodyElement.append(extra);

      await new Promise(r => setTimeout(r, 50));
      return { initial, after: el.offsetHeight };
    });

    expect(after).toBeGreaterThan(initial);
    expect(after - initial).toBe(100);
  });

  test("resizable does not write height when autoheight is active", async ({ page }) => {
    const { heightBefore, heightAfter } = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "Test", {
        width: 300, minWidth: 150,
        plugins: ["resizable", "captionless", "autoheight", "body-draggable"]
      });
      const el = handle.element;
      await new Promise(r => setTimeout(r, 50));
      const heightBefore = el.offsetHeight;

      // Change only width — autoheight should keep height unchanged
      el.style.width = "200px";

      await new Promise(r => setTimeout(r, 50));
      return { heightBefore, heightAfter: el.offsetHeight };
    });

    // Height must stay the same after a width-only change
    expect(heightAfter).toBe(heightBefore);
  });

  test("captionless toolbox is exactly content-sized", async ({ page }) => {
    // 2 cols × 48px + 1 gap × 10px + 2 × 14px body padding = 134px wide
    // 6 rows × 48px + 5 gaps × 10px + 2 × 14px body padding = 366px tall
    const CELL = 48, GAP = 10, PAD = 14;
    const expectedW = 2 * CELL + 1 * GAP + PAD * 2;   // 134
    const expectedH = 6 * CELL + 5 * GAP + PAD * 2;   // 366

    const dims = await page.evaluate(async ({ expectedW }) => {
      const panel = (await import("/index.js")).default;

      const grid = document.createElement("div");
      grid.style.cssText =
        "display:grid;grid-template-columns:repeat(2,48px);gap:10px";
      for (let i = 0; i < 12; i++) {
        const btn = document.createElement("button");
        btn.style.cssText = "width:48px;height:48px;flex-shrink:0";
        grid.appendChild(btn);
      }

      const handle = panel.open("", "", {
        width: expectedW,
        minWidth: "auto", radius: 22,
        plugins: ["captionless", "autoheight", "body-draggable", "rounded", "borderless"]
      });
      handle.setContent(grid);

      await new Promise(r => setTimeout(r, 100));

      const el = handle.element;
      return { w: el.offsetWidth, h: el.offsetHeight };
    }, { expectedW });

    expect(dims.w).toBe(expectedW);  // 134
    expect(dims.h).toBe(expectedH);  // 366
  });

  test("flex-wrap toolbox height tracks content reflow on width change", async ({ page }) => {
    const CELL = 48, GAP = 10, PAD = 14;
    const w3 = 3 * CELL + 2 * GAP + PAD * 2; // 192 — 3 cols, 4 rows
    const w2 = 2 * CELL + 1 * GAP + PAD * 2; // 134 — 2 cols, 6 rows

    const { hAt3, hAt2 } = await page.evaluate(async ({ w3, w2 }) => {
      const panel = (await import("/index.js")).default;

      const flex = document.createElement("div");
      flex.style.cssText = "display:flex;flex-wrap:wrap;gap:10px";
      for (let i = 0; i < 12; i++) {
        const btn = document.createElement("button");
        btn.style.cssText = "width:48px;height:48px;flex-shrink:0";
        flex.appendChild(btn);
      }

      const handle = panel.open("", "", {
        width: w3, minWidth: w2,
        plugins: ["resizable", "captionless", "autoheight", "borderless"]
      });
      handle.setContent(flex);

      await new Promise(r => setTimeout(r, 100));
      const hAt3 = handle.element.offsetHeight;

      // Squeeze to 2-column width — height should grow
      handle.element.style.width = `${w2}px`;
      await new Promise(r => setTimeout(r, 100));
      const hAt2 = handle.element.offsetHeight;

      return { hAt3, hAt2 };
    }, { w3, w2 });

    // 4 rows × 48 + 3 gaps × 10 + 2 × 14 = 250
    // 6 rows × 48 + 5 gaps × 10 + 2 × 14 = 366
    expect(hAt3).toBe(4 * CELL + 3 * GAP + PAD * 2);  // 250
    expect(hAt2).toBe(6 * CELL + 5 * GAP + PAD * 2);  // 366
  });
});
