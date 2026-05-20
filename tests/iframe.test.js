import { test, expect } from "@playwright/test";

const settle = () => new Promise(r => setTimeout(r, 80));

test.describe("iframe panels", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
  });

  // ── basic construction ──────────────────────────────────────────────────────

  test("URL panel creates an <iframe> in the body", async ({ page }) => {
    const tag = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("/index.html", "IFrame Test");
      await new Promise(r => setTimeout(r, 80));
      return handle.body.firstElementChild?.tagName?.toLowerCase();
    });
    expect(tag).toBe("iframe");
  });

  test("handle.iframe returns the iframe element", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("/index.html", "IFrame Test");
      await new Promise(r => setTimeout(r, 80));
      return handle.iframe?.tagName?.toLowerCase();
    });
    expect(result).toBe("iframe");
  });

  test("handle.iframe is null for a content panel", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "Content Panel");
      return handle.iframe;
    });
    expect(result).toBeNull();
  });

  test("handle.url returns the URL for a URL panel", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("/index.html", "IFrame Test");
      return handle.url;
    });
    expect(result).toBe("/index.html");
  });

  test("handle.url is null for a content panel", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "Content Panel");
      return handle.url;
    });
    expect(result).toBeNull();
  });

  test("panel element has data-url attribute when URL is set", async ({ page }) => {
    const hasAttr = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("/index.html", "IFrame Test");
      return "url" in handle.element.dataset;
    });
    expect(hasAttr).toBe(true);
  });

  // ── object-form and features-form open calls ────────────────────────────────

  test("panel.open({ url }) object-form creates an iframe", async ({ page }) => {
    const tag = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open({ url: "/index.html", title: "Obj Form" });
      await new Promise(r => setTimeout(r, 80));
      return handle.body.firstElementChild?.tagName?.toLowerCase();
    });
    expect(tag).toBe("iframe");
  });

  // ── iframe attributes ────────────────────────────────────────────────────────

  test("sandbox attribute is applied to the iframe", async ({ page }) => {
    const value = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("/index.html", "Sandboxed", {
        sandbox: "allow-scripts allow-same-origin"
      });
      await new Promise(r => setTimeout(r, 80));
      return handle.iframe?.getAttribute("sandbox");
    });
    expect(value).toBe("allow-scripts allow-same-origin");
  });

  test("sandbox is absent when not specified", async ({ page }) => {
    const value = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("/index.html", "No Sandbox");
      await new Promise(r => setTimeout(r, 80));
      return handle.iframe?.hasAttribute("sandbox");
    });
    expect(value).toBe(false);
  });

  test("allow attribute is applied to the iframe", async ({ page }) => {
    const value = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("/index.html", "Allowed", {
        allow: "fullscreen"
      });
      await new Promise(r => setTimeout(r, 80));
      return handle.iframe?.allow;
    });
    expect(value).toBe("fullscreen");
  });

  test("referrerPolicy is applied to the iframe", async ({ page }) => {
    const value = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("/index.html", "NoRef", {
        referrerPolicy: "no-referrer"
      });
      await new Promise(r => setTimeout(r, 80));
      return handle.iframe?.referrerPolicy;
    });
    expect(value).toBe("no-referrer");
  });

  test("iframeName is applied to the iframe", async ({ page }) => {
    const value = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("/index.html", "Named", {
        iframeName: "my-panel-frame"
      });
      await new Promise(r => setTimeout(r, 80));
      return handle.iframe?.name;
    });
    expect(value).toBe("my-panel-frame");
  });

  test("iframe title mirrors panel title", async ({ page }) => {
    const value = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("/index.html", "My Panel");
      await new Promise(r => setTimeout(r, 80));
      return handle.iframe?.title;
    });
    expect(value).toBe("My Panel");
  });

  // ── navigation ───────────────────────────────────────────────────────────────

  test("navigate() updates the iframe src and handle.url", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("/index.html", "Nav Test");
      await new Promise(r => setTimeout(r, 80));
      handle.navigate("/demos/index.html");
      return { url: handle.url, src: handle.iframe.getAttribute("src") };
    });
    expect(result.url).toBe("/demos/index.html");
    expect(result.src).toBe("/demos/index.html");
  });

  test("navigate() dispatches panelnavigate event", async ({ page }) => {
    const fired = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("/index.html", "Nav Event");
      await new Promise(r => setTimeout(r, 80));
      let detail = null;
      handle.addEventListener("panelnavigate", e => { detail = e.detail; });
      handle.navigate("/demos/index.html");
      return detail;
    });
    expect(fired).not.toBeNull();
    expect(fired.url).toBe("/demos/index.html");
  });

  test("navigate() is cancelable via preventDefault", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("/index.html", "Cancel Nav");
      await new Promise(r => setTimeout(r, 80));
      handle.addEventListener("panelnavigate", e => e.preventDefault());
      const returned = handle.navigate("/demos/index.html");
      return { returned, url: handle.url };
    });
    expect(result.returned).toBe(false);
    expect(result.url).toBe("/index.html");
  });

  test("navigate() returns false for a non-URL panel", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "Content");
      return handle.navigate("/index.html");
    });
    expect(result).toBe(false);
  });

  test("reload() reassigns the iframe src", async ({ page }) => {
    const same = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("/index.html", "Reload Test");
      await new Promise(r => setTimeout(r, 80));
      const before = handle.iframe.src;
      handle.reload();
      return before === handle.iframe.src;
    });
    expect(same).toBe(true);
  });

  // ── panelload event ──────────────────────────────────────────────────────────

  test("panelload fires when the iframe loads", async ({ page }) => {
    const fired = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      return new Promise(resolve => {
        const handle = panel.open("/index.html", "Load Event");
        handle.addEventListener("panelload", e => resolve(e.detail));
        setTimeout(() => resolve(null), 3000);
      });
    });
    expect(fired).not.toBeNull();
    expect(fired.url).toBe("/index.html");
  });

  // ── CSS / body styling ───────────────────────────────────────────────────────

  test("URL panel body has no padding", async ({ page }) => {
    const padding = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("/index.html", "No Padding");
      await new Promise(r => setTimeout(r, 80));
      return getComputedStyle(handle.body).padding;
    });
    expect(padding).toBe("0px");
  });

  test("content panel body retains default padding", async ({ page }) => {
    const padding = await page.evaluate(async () => {
      const panel = (await import("/index.js")).default;
      const handle = panel.open("", "Content Panel");
      await new Promise(r => setTimeout(r, 80));
      return getComputedStyle(handle.body).paddingTop;
    });
    // Default --panel-body-padding is 14px
    expect(padding).toBe("14px");
  });

  // ── declarative HTML ─────────────────────────────────────────────────────────

  test("panel-url attribute creates a URL-backed panel", async ({ page }) => {
    const tag = await page.evaluate(async () => {
      const { promoteSection } = await import("/index.js");
      const { default: panel } = await import("/index.js");

      const section = document.createElement("section");
      section.setAttribute("panel", "");
      section.setAttribute("panel-title", "Declarative IFrame");
      section.setAttribute("panel-url", "/index.html");
      document.body.appendChild(section);

      const handle = promoteSection(section, panel);
      await new Promise(r => setTimeout(r, 80));
      return handle?.body.firstElementChild?.tagName?.toLowerCase();
    });
    expect(tag).toBe("iframe");
  });

  test("panel-sandbox attribute is forwarded to the iframe", async ({ page }) => {
    const value = await page.evaluate(async () => {
      const { promoteSection } = await import("/index.js");
      const { default: panel } = await import("/index.js");

      const section = document.createElement("section");
      section.setAttribute("panel", "");
      section.setAttribute("panel-title", "Sandboxed Declarative");
      section.setAttribute("panel-url", "/index.html");
      section.setAttribute("panel-sandbox", "allow-scripts");
      document.body.appendChild(section);

      const handle = promoteSection(section, panel);
      await new Promise(r => setTimeout(r, 80));
      return handle?.iframe?.getAttribute("sandbox");
    });
    expect(value).toBe("allow-scripts");
  });
});
