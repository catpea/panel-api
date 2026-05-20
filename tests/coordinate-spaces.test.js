import { test, expect } from "@playwright/test";

// Helper: fresh PanelManager avoids the default singleton, which index.html
// calls panel.setLayer(customElement) on — causing class-name mismatches and
// wrong layer origins in positioning checks.
const freshManager = `
  const { PanelManager, PluginRegistry } = await import("/index.js");
  const { registerBuiltins } = await import("/src/plugins/builtins.js");
  const registry = registerBuiltins(new PluginRegistry());
  const mgr = new PanelManager({ plugins: registry });
`;

test.describe("coordinate spaces", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
  });

  // ── document space ────────────────────────────────────────────────────────

  test("document-space panel is mounted in .panel-document-layer", async ({ page }) => {
    const parentClass = await page.evaluate(async () => {
      const { PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });
      const handle = mgr.open("", "Doc", { coordinateSpace: "document", width: 200, height: 100 });
      return handle.element.parentElement?.className;
    });
    expect(parentClass).toContain("panel-document-layer");
  });

  test("screen-space panel is mounted in .panel-layer", async ({ page }) => {
    const parentClass = await page.evaluate(async () => {
      const { PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });
      const handle = mgr.open("", "Screen");
      return handle.element.parentElement?.className;
    });
    expect(parentClass).toContain("panel-layer");
    expect(parentClass).not.toContain("document-layer");
  });

  test(".panel-document-layer has position:absolute", async ({ page }) => {
    const position = await page.evaluate(async () => {
      const { PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });
      mgr.open("", "Doc", { coordinateSpace: "document", width: 200, height: 100 });
      const layer = document.querySelector(".panel-document-layer");
      return getComputedStyle(layer).position;
    });
    expect(position).toBe("absolute");
  });

  test(".panel-layer has position:fixed", async ({ page }) => {
    const position = await page.evaluate(async () => {
      const { PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });
      mgr.open("", "Screen");
      const layer = document.querySelector(".panel-layer[data-panel-api-layer]");
      return getComputedStyle(layer).position;
    });
    expect(position).toBe("fixed");
  });

  test("document-space panel left/top are document-relative", async ({ page }) => {
    const { left, top } = await page.evaluate(async () => {
      const { PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });
      const handle = mgr.open("", "Doc", {
        coordinateSpace: "document",
        width: 200, height: 100,
        left: 300, top: 200
      });
      return { left: handle.element.offsetLeft, top: handle.element.offsetTop };
    });
    expect(left).toBe(300);
    expect(top).toBe(200);
  });

  test("document-space panel moves when page is scrolled", async ({ page }) => {
    // Place a document-space panel far down the page, verify it scrolls into
    // viewport range when we scroll there (getBoundingClientRect changes).
    const result = await page.evaluate(async () => {
      const { PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });

      document.documentElement.style.minHeight = "4000px";
      document.body.style.minHeight = "4000px";

      const handle = mgr.open("", "Doc", {
        coordinateSpace: "document",
        width: 200, height: 100,
        left: 50, top: 2500
      });

      const topBefore = handle.element.getBoundingClientRect().top;
      document.documentElement.scrollTop = 2400;
      // Allow layout to settle
      await new Promise(r => setTimeout(r, 60));
      const topAfter = handle.element.getBoundingClientRect().top;
      return { topBefore, topAfter };
    });

    // Before scroll: panel is ~2500px below viewport top
    expect(result.topBefore).toBeGreaterThan(500);
    // After scrolling to 2400, panel at doc-y=2500 should be near client-y=100
    expect(result.topAfter).toBeLessThan(result.topBefore - 100);
  });

  // ── element-anchored space ────────────────────────────────────────────────

  test("element-anchored panel is positioned near its anchor", async ({ page }) => {
    const { panelTop, anchorBottom } = await page.evaluate(async () => {
      const { PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });

      const anchor = document.createElement("button");
      anchor.style.cssText = "position:fixed;left:200px;top:200px;width:100px;height:40px;";
      document.body.appendChild(anchor);

      const handle = mgr.open("", "Anchored", {
        coordinateSpace: "element",
        anchorElement: anchor,
        placement: "bottom",
        offset: 8,
        width: 200, height: 100
      });

      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 60));

      const rect = handle.element.getBoundingClientRect();
      const ar   = anchor.getBoundingClientRect();
      return { panelTop: rect.top, anchorBottom: ar.bottom };
    });

    // Panel top should be near anchorBottom + offset (8px)
    expect(panelTop).toBeGreaterThanOrEqual(anchorBottom + 4);
    expect(panelTop).toBeLessThanOrEqual(anchorBottom + 20);
  });

  test("anchored plugin is auto-added for coordinateSpace:element", async ({ page }) => {
    const hasAnchoredPlugin = await page.evaluate(async () => {
      const { PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });

      const anchor = document.createElement("div");
      anchor.style.cssText = "position:fixed;left:100px;top:100px;width:80px;height:30px;";
      document.body.appendChild(anchor);
      const handle = mgr.open("", "Anchored", {
        coordinateSpace: "element",
        anchorElement: anchor,
        width: 200, height: 80
      });
      return handle.element.plugins.has("anchored");
    });
    expect(hasAnchoredPlugin).toBe(true);
  });

  test("placement:top positions panel above the anchor", async ({ page }) => {
    const { panelBottom, anchorTop } = await page.evaluate(async () => {
      const { PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });

      const anchor = document.createElement("button");
      anchor.style.cssText = "position:fixed;left:200px;top:400px;width:100px;height:40px;";
      document.body.appendChild(anchor);

      const handle = mgr.open("", "TopAnchor", {
        coordinateSpace: "element",
        anchorElement: anchor,
        placement: "top",
        offset: 8,
        width: 200, height: 100
      });

      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 60));

      const rect = handle.element.getBoundingClientRect();
      const ar   = anchor.getBoundingClientRect();
      return { panelBottom: rect.bottom, anchorTop: ar.top };
    });

    expect(panelBottom).toBeLessThanOrEqual(anchorTop - 4);
    expect(panelBottom).toBeGreaterThanOrEqual(anchorTop - 20);
  });

  test("collision avoidance: flip bottom→top when panel would go off-screen", async ({ page }) => {
    const actualPlacement = await page.evaluate(async () => {
      const { PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });

      // Anchor near bottom of viewport so "bottom" placement would clip
      const anchor = document.createElement("button");
      anchor.style.cssText = `position:fixed;left:200px;top:${window.innerHeight - 30}px;width:100px;height:28px;`;
      document.body.appendChild(anchor);

      let lastPlacement = null;
      const handle = mgr.open("", "Flip", {
        coordinateSpace: "element",
        anchorElement: anchor,
        placement: "bottom",
        collisionStrategy: "flip",
        width: 200, height: 150
      });
      handle.addEventListener("panelanchorchange", e => { lastPlacement = e.detail.placement; });

      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 80));

      return lastPlacement;
    });

    expect(actualPlacement).toMatch(/^top/);
  });

  test("panelanchorchange event fires with placement detail", async ({ page }) => {
    const detail = await page.evaluate(async () => {
      const { PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });

      const anchor = document.createElement("div");
      anchor.style.cssText = "position:fixed;left:100px;top:200px;width:80px;height:30px;";
      document.body.appendChild(anchor);

      return new Promise(resolve => {
        const handle = mgr.open("", "AnchorEvt", {
          coordinateSpace: "element",
          anchorElement: anchor,
          placement: "bottom",
          width: 200, height: 80
        });
        handle.addEventListener("panelanchorchange", e => resolve(e.detail));
        setTimeout(() => resolve(null), 2000);
      });
    });

    expect(detail).not.toBeNull();
    expect(typeof detail.placement).toBe("string");
  });

  test("CSS selector string is accepted as anchorElement", async ({ page }) => {
    const positioned = await page.evaluate(async () => {
      const { PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });

      const anchor = document.createElement("button");
      anchor.id = "my-anchor-btn";
      anchor.style.cssText = "position:fixed;left:150px;top:150px;width:80px;height:30px;";
      document.body.appendChild(anchor);

      const handle = mgr.open("", "CssSelector", {
        coordinateSpace: "element",
        anchorElement: "#my-anchor-btn",
        placement: "bottom",
        width: 200, height: 80
      });

      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 60));

      const rect = handle.element.getBoundingClientRect();
      return rect.top > 0;
    });
    expect(positioned).toBe(true);
  });

  test("declarative panel-anchor attribute creates anchored panel", async ({ page }) => {
    const hasPlugin = await page.evaluate(async () => {
      const { promoteSection, PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });

      const anchor = document.createElement("button");
      anchor.id = "decl-anchor";
      anchor.style.cssText = "position:fixed;left:150px;top:150px;width:80px;height:30px;";
      document.body.appendChild(anchor);

      const section = document.createElement("section");
      section.setAttribute("panel", "");
      section.setAttribute("panel-title", "Declarative Anchored");
      section.setAttribute("panel-coordinate-space", "element");
      section.setAttribute("panel-anchor", "decl-anchor");
      section.setAttribute("panel-placement", "bottom");
      section.setAttribute("panel-width", "200");
      section.setAttribute("panel-height", "80");
      document.body.appendChild(section);

      const handle = promoteSection(section, mgr);
      return handle?.element.plugins.has("anchored");
    });
    expect(hasPlugin).toBe(true);
  });

  // ── world space ──────────────────────────────────────────────────────────

  test("world-space panel auto-installs pinnable plugin", async ({ page }) => {
    const hasPinnable = await page.evaluate(async () => {
      const { PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const { PanelViewport } = await import("/src/zui/viewport.js");

      const root = document.createElement("div");
      root.style.cssText = "width:800px;height:600px;overflow:hidden;position:fixed;inset:0;";
      const surface = document.createElement("div");
      root.appendChild(surface);
      document.body.appendChild(root);

      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });
      const vp = new PanelViewport({ root, surface });
      mgr.attachViewport(vp);

      const handle = mgr.open("", "World", {
        coordinateSpace: "world",
        worldX: 100, worldY: 80,
        width: 200, height: 100
      });
      return handle.element.plugins.has("pinnable");
    });
    expect(hasPinnable).toBe(true);
  });

  test("world-space panel is automatically pinned", async ({ page }) => {
    const pinned = await page.evaluate(async () => {
      const { PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const { PanelViewport } = await import("/src/zui/viewport.js");

      const root = document.createElement("div");
      root.style.cssText = "width:800px;height:600px;overflow:hidden;position:fixed;inset:0;";
      const surface = document.createElement("div");
      root.appendChild(surface);
      document.body.appendChild(root);

      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });
      const vp = new PanelViewport({ root, surface });
      mgr.attachViewport(vp);

      const handle = mgr.open("", "World", {
        coordinateSpace: "world",
        worldX: 100, worldY: 80,
        width: 200, height: 100
      });
      return handle.pinned;
    });
    expect(pinned).toBe(true);
  });

  test("world-space panel position matches worldToScreen projection", async ({ page }) => {
    const { panelLeft, panelTop, expectedLeft, expectedTop } = await page.evaluate(async () => {
      const { PanelManager, PluginRegistry } = await import("/index.js");
      const { registerBuiltins } = await import("/src/plugins/builtins.js");
      const { PanelViewport } = await import("/src/zui/viewport.js");

      const root = document.createElement("div");
      root.style.cssText = "width:800px;height:600px;overflow:hidden;position:fixed;inset:0;";
      const surface = document.createElement("div");
      root.appendChild(surface);
      document.body.appendChild(root);

      const registry = registerBuiltins(new PluginRegistry());
      const mgr = new PanelManager({ plugins: registry });
      const vp = new PanelViewport({ root, surface });
      mgr.attachViewport(vp);

      const wx = 200, wy = 150;
      const handle = mgr.open("", "World", {
        coordinateSpace: "world",
        worldX: wx, worldY: wy,
        width: 200, height: 100
      });

      const screen = vp.worldToScreen(wx, wy);
      return {
        panelLeft: handle.element.offsetLeft,
        panelTop:  handle.element.offsetTop,
        expectedLeft: Math.round(screen.x),
        expectedTop:  Math.round(screen.y)
      };
    });
    expect(panelLeft).toBeCloseTo(expectedLeft, 0);
    expect(panelTop).toBeCloseTo(expectedTop, 0);
  });
});
