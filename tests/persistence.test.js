import { test, expect } from "@playwright/test";

const STORAGE_KEY = k => `panel-api:${k}`;

test.describe("state persistence (persistable plugin)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
    // Clear any leftover storage before each test.
    await page.evaluate(() => localStorage.clear());
  });

  test("panel with persist key saves position to localStorage on move", async ({ page }) => {
    const saved = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "Persist", {
        persist: "test-pos",
        left: 100, top: 80,
        plugins: ["focusable", "stackable", "draggable", "resizable", "closable", "titled", "persistable"]
      });
      handle.moveTo(300, 200);
      const raw = localStorage.getItem("panel-api:test-pos");
      return raw ? JSON.parse(raw) : null;
    });

    expect(saved).not.toBeNull();
    expect(saved.left).toBe(300);
    expect(saved.top).toBe(200);
  });

  test("panel with persist key saves size to localStorage on resize", async ({ page }) => {
    const saved = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "PersistSize", {
        persist: "test-size",
        plugins: ["focusable", "stackable", "draggable", "resizable", "closable", "titled", "persistable"]
      });
      handle.resizeTo(500, 350);
      const raw = localStorage.getItem("panel-api:test-size");
      return raw ? JSON.parse(raw) : null;
    });

    expect(saved).not.toBeNull();
    expect(saved.width).toBe(500);
    expect(saved.height).toBe(350);
  });

  test("panel with persist key saves minimized state", async ({ page }) => {
    const saved = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "PersistMin", {
        persist: "test-min",
        plugins: ["focusable", "stackable", "draggable", "resizable", "closable", "miniaturizable", "titled", "persistable"]
      });
      handle.minimize();
      const raw = localStorage.getItem("panel-api:test-min");
      return raw ? JSON.parse(raw) : null;
    });

    expect(saved).not.toBeNull();
    expect(saved.minimized).toBe(true);
  });

  test("panel auto-restores position from localStorage on open", async ({ page }) => {
    const restored = await page.evaluate(async () => {
      localStorage.setItem("panel-api:restore-test", JSON.stringify({
        left: 450, top: 300, width: 380, height: 260, minimized: false
      }));

      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "Restored", {
        persist: "restore-test",
        plugins: ["focusable", "stackable", "draggable", "resizable", "closable", "titled", "persistable"]
      });

      await new Promise(r => setTimeout(r, 30));
      return { left: handle.element.offsetLeft, top: handle.element.offsetTop };
    });

    expect(restored.left).toBe(450);
    expect(restored.top).toBe(300);
  });

  test("panel auto-restores size from localStorage on open", async ({ page }) => {
    const restored = await page.evaluate(async () => {
      localStorage.setItem("panel-api:restore-size", JSON.stringify({
        left: 100, top: 100, width: 520, height: 310, minimized: false
      }));

      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "RestoredSize", {
        persist: "restore-size",
        plugins: ["focusable", "stackable", "draggable", "resizable", "closable", "titled", "persistable"]
      });

      await new Promise(r => setTimeout(r, 30));
      return { width: handle.element.offsetWidth, height: handle.element.offsetHeight };
    });

    expect(restored.width).toBe(520);
    expect(restored.height).toBe(310);
  });

  test("panel auto-restores minimized state from localStorage on open", async ({ page }) => {
    const minimized = await page.evaluate(async () => {
      localStorage.setItem("panel-api:restore-min", JSON.stringify({
        left: 100, top: 100, width: 400, height: 300, minimized: true
      }));

      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "RestoredMin", {
        persist: "restore-min",
        plugins: ["focusable", "stackable", "draggable", "resizable", "closable", "miniaturizable", "titled", "persistable"]
      });

      await new Promise(r => setTimeout(r, 30));
      return handle.minimized;
    });

    expect(minimized).toBe(true);
  });

  test("persist option auto-installs persistable plugin", async ({ page }) => {
    const hasPlugin = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "AutoPersist", { persist: "auto-key" });
      return handle.element.plugins.has("persistable");
    });
    expect(hasPlugin).toBe(true);
  });

  test("handle.saveState() writes to localStorage", async ({ page }) => {
    const saved = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "ManualSave", {
        persist: "manual-save",
        left: 150, top: 120,
        plugins: ["focusable", "stackable", "draggable", "resizable", "closable", "titled", "persistable"]
      });
      handle.moveTo(220, 180);
      handle.saveState();
      const raw = localStorage.getItem("panel-api:manual-save");
      return raw ? JSON.parse(raw) : null;
    });

    expect(saved).not.toBeNull();
    expect(saved.left).toBe(220);
    expect(saved.top).toBe(180);
  });

  test("handle.restoreState() reads from localStorage", async ({ page }) => {
    const result = await page.evaluate(async () => {
      localStorage.setItem("panel-api:manual-restore", JSON.stringify({
        left: 600, top: 400, width: 350, height: 220, minimized: false
      }));

      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "ManualRestore", {
        persist: "manual-restore",
        plugins: ["focusable", "stackable", "draggable", "resizable", "closable", "titled"]
        // Note: persistable NOT in list — restoreState() works independently
      });

      handle.restoreState();
      await new Promise(r => setTimeout(r, 30));

      return { left: handle.element.offsetLeft, top: handle.element.offsetTop };
    });

    expect(result.left).toBe(600);
    expect(result.top).toBe(400);
  });

  test("corrupt storage does not throw", async ({ page }) => {
    const ok = await page.evaluate(async () => {
      localStorage.setItem("panel-api:corrupt-key", "{bad json{{");
      try {
        const panel = (await import("/index.js")).default;
        panel.open("", "Corrupt", {
          persist: "corrupt-key",
          plugins: ["focusable", "stackable", "draggable", "resizable", "closable", "titled", "persistable"]
        });
        return true;
      } catch {
        return false;
      }
    });
    expect(ok).toBe(true);
  });

  test("declarative panel-persist attribute enables persistence", async ({ page }) => {
    const saved = await page.evaluate(async () => {
      const { promoteSection } = await import("/index.js");
      const { default: panel } = await import("/index.js");

      const section = document.createElement("section");
      section.setAttribute("panel", "");
      section.setAttribute("panel-title", "Declarative Persist");
      section.setAttribute("panel-persist", "decl-persist-key");
      section.setAttribute("panel-draggable", "");
      section.setAttribute("panel-resizable", "");
      section.setAttribute("panel-closable", "");
      section.setAttribute("panel-titled", "");
      document.body.appendChild(section);

      const handle = promoteSection(section, panel);
      handle.moveTo(350, 250);
      const raw = localStorage.getItem("panel-api:decl-persist-key");
      return raw ? JSON.parse(raw) : null;
    });

    expect(saved).not.toBeNull();
    expect(saved.left).toBe(350);
  });
});
