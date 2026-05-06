# Yuque Theme Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome/Edge Manifest V3 extension that automatically themes Yuque reading pages with four built-in reading themes and a compact popup control panel.

**Architecture:** The extension has no build step. A statically registered content script detects supported Yuque reading pages, reads global settings from `chrome.storage.sync`, and applies stable `data-*` attributes on the document root. CSS owns all visual theme behavior, while the popup reads/writes settings and messages the current tab for immediate updates.

**Tech Stack:** Manifest V3, vanilla JavaScript, vanilla CSS, static HTML fixtures, Chrome/Edge developer mode, PowerShell verification commands, optional Playwright visual smoke checks.

---

## File Structure

- Create `manifest.json`: Manifest V3 metadata, permissions, content script registration, popup declaration.
- Create `src/content/contentScript.js`: page support detection, settings normalization, attribute application, storage/message listeners, route mutation re-check.
- Create `src/content/themes.css`: base Yuque reader overrides and four theme variable sets.
- Create `src/popup/popup.html`: popup markup for status, enable switch, theme radios, reset button.
- Create `src/popup/popup.css`: compact utility-style popup styling.
- Create `src/popup/popup.js`: settings persistence, tab status query, immediate theme update messages.
- Create `test-fixtures/yuque-reading-page.html`: local Yuque-like reading fixture that loads the theme CSS and provides controls for visual checks.
- Modify `README.md`: install, use, verify, and package instructions.

## Task 1: Extension Manifest

**Files:**
- Create: `manifest.json`

- [ ] **Step 1: Verify the manifest is missing**

Run:

```powershell
Test-Path manifest.json
```

Expected: `False`

- [ ] **Step 2: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Yuque Theme Extension",
  "description": "Apply Obsidian-inspired reading themes to Yuque document pages.",
  "version": "0.1.0",
  "action": {
    "default_title": "Yuque Theme",
    "default_popup": "src/popup/popup.html"
  },
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["*://*.yuque.com/*"],
  "content_scripts": [
    {
      "matches": ["*://*.yuque.com/*"],
      "js": ["src/content/contentScript.js"],
      "css": ["src/content/themes.css"],
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 3: Validate manifest JSON**

Run:

```powershell
node -e "const fs=require('fs'); const m=JSON.parse(fs.readFileSync('manifest.json','utf8')); if(m.manifest_version!==3) throw new Error('Manifest V3 required'); if(!m.content_scripts?.[0]?.matches?.includes('*://*.yuque.com/*')) throw new Error('Yuque match missing'); console.log('manifest ok')"
```

Expected: `manifest ok`

- [ ] **Step 4: Commit**

```powershell
git add manifest.json
git commit -m "feat: add extension manifest"
```

## Task 2: Content Script

**Files:**
- Create: `src/content/contentScript.js`

- [ ] **Step 1: Verify the content script is missing**

Run:

```powershell
Test-Path src\content\contentScript.js
```

Expected: `False`

- [ ] **Step 2: Create `src/content/contentScript.js`**

```javascript
(function () {
  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    theme: "blue-topaz-light"
  });

  const VALID_THEMES = new Set([
    "blue-topaz-light",
    "blue-topaz-dark",
    "paper",
    "dev-docs"
  ]);

  const ROOT = document.documentElement;
  const SUPPORTED_ATTR = "data-yuque-theme-supported";
  const ENABLED_ATTR = "data-yuque-theme-enabled";
  const THEME_ATTR = "data-yuque-theme";

  let currentSettings = { ...DEFAULT_SETTINGS };
  let supported = false;
  let observerStarted = false;
  let observerTimer = 0;

  function normalizeSettings(input) {
    const enabled = typeof input?.enabled === "boolean"
      ? input.enabled
      : DEFAULT_SETTINGS.enabled;
    const theme = VALID_THEMES.has(input?.theme)
      ? input.theme
      : DEFAULT_SETTINGS.theme;

    return { enabled, theme };
  }

  function isYuqueHost() {
    return location.hostname === "yuque.com" || location.hostname.endsWith(".yuque.com");
  }

  function findReadingContainer() {
    const selectors = [
      ".lake-content",
      ".yuque-doc-content",
      ".doc-reader",
      ".ne-viewer-body",
      "article",
      "main"
    ];

    return selectors.map((selector) => document.querySelector(selector)).find(Boolean) || null;
  }

  function hasDocumentSignals(container) {
    if (!container) return false;

    const title = document.querySelector("h1") || container.querySelector("h1, h2");
    const richBlocks = container.querySelectorAll("p, pre, blockquote, table, ul, ol, h1, h2, h3");

    return Boolean(title) && richBlocks.length >= 3;
  }

  function detectSupport() {
    if (!isYuqueHost()) return false;
    return hasDocumentSignals(findReadingContainer());
  }

  function applyTheme() {
    supported = detectSupport();
    ROOT.setAttribute(SUPPORTED_ATTR, supported ? "true" : "false");

    if (!supported || !currentSettings.enabled) {
      ROOT.setAttribute(ENABLED_ATTR, "false");
      ROOT.removeAttribute(THEME_ATTR);
      return;
    }

    ROOT.setAttribute(ENABLED_ATTR, "true");
    ROOT.setAttribute(THEME_ATTR, currentSettings.theme);
  }

  function readSettings() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
      if (chrome.runtime.lastError) {
        currentSettings = { ...DEFAULT_SETTINGS };
      } else {
        currentSettings = normalizeSettings(stored);
      }
      applyTheme();
    });
  }

  function sendStatus(sendResponse) {
    sendResponse({
      supported,
      enabled: currentSettings.enabled,
      theme: currentSettings.theme
    });
  }

  function startObserver() {
    if (observerStarted || !document.body) return;
    observerStarted = true;

    const observer = new MutationObserver(() => {
      window.clearTimeout(observerTimer);
      observerTimer = window.setTimeout(applyTheme, 150);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;

    currentSettings = normalizeSettings({
      enabled: changes.enabled ? changes.enabled.newValue : currentSettings.enabled,
      theme: changes.theme ? changes.theme.newValue : currentSettings.theme
    });

    applyTheme();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "YUQUE_THEME_GET_STATUS") {
      applyTheme();
      sendStatus(sendResponse);
      return true;
    }

    if (message?.type === "YUQUE_THEME_APPLY_SETTINGS") {
      currentSettings = normalizeSettings(message.settings);
      applyTheme();
      sendStatus(sendResponse);
      return true;
    }

    return false;
  });

  readSettings();
  startObserver();
})();
```

- [ ] **Step 3: Run syntax validation**

Run:

```powershell
node --check src\content\contentScript.js
```

Expected: no output and exit code `0`

- [ ] **Step 4: Commit**

```powershell
git add src\content\contentScript.js
git commit -m "feat: add Yuque theme content script"
```

## Task 3: Theme CSS And Fixture

**Files:**
- Create: `src/content/themes.css`
- Create: `test-fixtures/yuque-reading-page.html`

- [ ] **Step 1: Verify CSS and fixture are missing**

Run:

```powershell
Test-Path src\content\themes.css; Test-Path test-fixtures\yuque-reading-page.html
```

Expected:

```text
False
False
```

- [ ] **Step 2: Create `src/content/themes.css`**

```css
html[data-yuque-theme-supported="true"][data-yuque-theme-enabled="true"] {
  --yte-page-bg: #f7f9ff;
  --yte-panel-bg: #ffffff;
  --yte-text: #26324d;
  --yte-muted: #6b7da4;
  --yte-heading: #315ca8;
  --yte-link: #2f73d8;
  --yte-border: #d9e4fb;
  --yte-quote-bg: #eaf1ff;
  --yte-quote-border: #5d8be8;
  --yte-code-bg: #18243d;
  --yte-code-text: #d9e6ff;
  --yte-inline-code-bg: #eaf1ff;
  --yte-inline-code-text: #264f91;
  --yte-table-header-bg: #edf4ff;
  --yte-font-body: "Inter", "LXGW WenKai", "Microsoft YaHei", sans-serif;
  --yte-font-mono: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
  background: var(--yte-page-bg) !important;
}

html[data-yuque-theme="blue-topaz-dark"] {
  --yte-page-bg: #101726;
  --yte-panel-bg: #151f33;
  --yte-text: #d6e3ff;
  --yte-muted: #8ea4ca;
  --yte-heading: #93c5fd;
  --yte-link: #7dd3fc;
  --yte-border: #31415f;
  --yte-quote-bg: #1e2a42;
  --yte-quote-border: #7dd3fc;
  --yte-code-bg: #07111f;
  --yte-code-text: #d1fae5;
  --yte-inline-code-bg: #22304a;
  --yte-inline-code-text: #bfdbfe;
  --yte-table-header-bg: #1c2942;
}

html[data-yuque-theme="paper"] {
  --yte-page-bg: #fbfbf8;
  --yte-panel-bg: #fffefb;
  --yte-text: #202124;
  --yte-muted: #6b7280;
  --yte-heading: #111827;
  --yte-link: #2563eb;
  --yte-border: #dedbd2;
  --yte-quote-bg: #f0f0ea;
  --yte-quote-border: #9ca3af;
  --yte-code-bg: #272822;
  --yte-code-text: #f8f8f2;
  --yte-inline-code-bg: #efede7;
  --yte-inline-code-text: #4b5563;
  --yte-table-header-bg: #f2f0e9;
  --yte-font-body: Georgia, "Times New Roman", "Microsoft YaHei", serif;
}

html[data-yuque-theme="dev-docs"] {
  --yte-page-bg: #f8fafc;
  --yte-panel-bg: #ffffff;
  --yte-text: #14213d;
  --yte-muted: #64748b;
  --yte-heading: #0f766e;
  --yte-link: #0f766e;
  --yte-border: #cbd5e1;
  --yte-quote-bg: #ecfdf5;
  --yte-quote-border: #10b981;
  --yte-code-bg: #0f172a;
  --yte-code-text: #e2e8f0;
  --yte-inline-code-bg: #dff7ed;
  --yte-inline-code-text: #065f46;
  --yte-table-header-bg: #e6fffa;
}

html[data-yuque-theme-supported="true"][data-yuque-theme-enabled="true"] body {
  background: var(--yte-page-bg) !important;
  color: var(--yte-text) !important;
  font-family: var(--yte-font-body) !important;
}

html[data-yuque-theme-supported="true"][data-yuque-theme-enabled="true"] :is(.lake-content, .yuque-doc-content, .doc-reader, .ne-viewer-body, article, main) {
  color: var(--yte-text) !important;
  max-width: 920px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.78;
}

html[data-yuque-theme-supported="true"][data-yuque-theme-enabled="true"] :is(h1, h2, h3, h4, h5, h6) {
  color: var(--yte-heading) !important;
  letter-spacing: 0;
  line-height: 1.35;
}

html[data-yuque-theme-supported="true"][data-yuque-theme-enabled="true"] :is(p, li, td, th) {
  color: var(--yte-text) !important;
}

html[data-yuque-theme-supported="true"][data-yuque-theme-enabled="true"] a {
  color: var(--yte-link) !important;
  text-decoration-color: color-mix(in srgb, var(--yte-link) 45%, transparent);
  text-underline-offset: 3px;
}

html[data-yuque-theme-supported="true"][data-yuque-theme-enabled="true"] blockquote {
  background: var(--yte-quote-bg) !important;
  border-left: 4px solid var(--yte-quote-border) !important;
  border-radius: 0 8px 8px 0;
  color: var(--yte-text) !important;
  margin: 18px 0;
  padding: 12px 16px;
}

html[data-yuque-theme-supported="true"][data-yuque-theme-enabled="true"] :is(pre, .lake-codeblock, .ne-codeblock) {
  background: var(--yte-code-bg) !important;
  border-radius: 8px;
  color: var(--yte-code-text) !important;
  font-family: var(--yte-font-mono) !important;
  line-height: 1.6;
  overflow-x: auto;
  padding: 14px 16px;
}

html[data-yuque-theme-supported="true"][data-yuque-theme-enabled="true"] :is(code, tt):not(pre code) {
  background: var(--yte-inline-code-bg) !important;
  border-radius: 4px;
  color: var(--yte-inline-code-text) !important;
  font-family: var(--yte-font-mono) !important;
  padding: 0.12em 0.35em;
}

html[data-yuque-theme-supported="true"][data-yuque-theme-enabled="true"] table {
  border-collapse: collapse;
  border-color: var(--yte-border) !important;
  width: 100%;
}

html[data-yuque-theme-supported="true"][data-yuque-theme-enabled="true"] :is(th, td) {
  border: 1px solid var(--yte-border) !important;
  padding: 9px 11px;
}

html[data-yuque-theme-supported="true"][data-yuque-theme-enabled="true"] th {
  background: var(--yte-table-header-bg) !important;
  color: var(--yte-heading) !important;
}

html[data-yuque-theme-supported="true"][data-yuque-theme-enabled="true"] hr {
  border: 0;
  border-top: 1px solid var(--yte-border);
  margin: 28px 0;
}

html[data-yuque-theme-supported="true"][data-yuque-theme-enabled="true"] img {
  border-radius: 8px;
  margin: 12px 0;
}

html[data-yuque-theme-supported="true"][data-yuque-theme-enabled="true"] :is(.toc, .catalog, .outline, aside) {
  color: var(--yte-muted) !important;
}
```

- [ ] **Step 3: Create `test-fixtures/yuque-reading-page.html`**

```html
<!doctype html>
<html lang="zh-CN" data-yuque-theme-supported="true" data-yuque-theme-enabled="true" data-yuque-theme="blue-topaz-light">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Yuque Theme Fixture</title>
    <link rel="stylesheet" href="../src/content/themes.css">
    <style>
      body {
        margin: 0;
      }
      .fixture-toolbar {
        align-items: center;
        background: #ffffff;
        border-bottom: 1px solid #dbe3ef;
        display: flex;
        gap: 8px;
        padding: 12px 18px;
        position: sticky;
        top: 0;
        z-index: 2;
      }
      .fixture-toolbar button {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        color: #334155;
        cursor: pointer;
        font: 13px system-ui, sans-serif;
        padding: 7px 10px;
      }
      .fixture-shell {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 220px;
        gap: 28px;
        margin: 0 auto;
        max-width: 1180px;
        padding: 36px 20px 80px;
      }
      .lake-content {
        background: transparent;
      }
      aside {
        border-left: 1px solid #dbe3ef;
        font: 13px system-ui, sans-serif;
        padding-left: 18px;
      }
      @media (max-width: 800px) {
        .fixture-shell {
          grid-template-columns: 1fr;
        }
        aside {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    <div class="fixture-toolbar">
      <button data-theme="blue-topaz-light">Blue Topaz Light</button>
      <button data-theme="blue-topaz-dark">Blue Topaz Dark</button>
      <button data-theme="paper">Paper</button>
      <button data-theme="dev-docs">Dev Docs</button>
      <button id="toggle">Toggle enabled</button>
    </div>
    <div class="fixture-shell">
      <main class="lake-content">
        <h1>项目复盘：知识库迁移</h1>
        <p>这是一段模拟语雀阅读页的正文，用来验证主题是否覆盖标题、正文、链接、引用、代码块和表格。访问 <a href="https://www.yuque.com">语雀</a> 时，扩展只改变视觉外观，不改变文档内容。</p>
        <h2>迁移目标</h2>
        <ul>
          <li>保留语雀原有阅读结构。</li>
          <li>让长文阅读接近 Obsidian Blue Topaz。</li>
          <li>确保代码块和表格在明暗主题下都清晰。</li>
        </ul>
        <blockquote>关键结论应该从正文里跳出来，但不破坏语雀页面原本的功能。</blockquote>
        <p>行内代码示例：<code>data-yuque-theme="blue-topaz-light"</code>。</p>
        <pre><code>const settings = {
  enabled: true,
  theme: "blue-topaz-light"
};</code></pre>
        <h2>验收表格</h2>
        <table>
          <thead>
            <tr>
              <th>模块</th>
              <th>期望</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>代码块</td>
              <td>高对比、可横向滚动</td>
              <td>待验证</td>
            </tr>
            <tr>
              <td>表格</td>
              <td>边框清晰、标题突出</td>
              <td>待验证</td>
            </tr>
          </tbody>
        </table>
        <hr>
        <h3>图片与媒体</h3>
        <p><img alt="Yuque document preview image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='720' height='220' viewBox='0 0 720 220'%3E%3Crect width='720' height='220' fill='%23dbeafe'/%3E%3Ctext x='360' y='118' text-anchor='middle' font-family='Arial' font-size='28' fill='%231e3a8a'%3EYuque Document Image%3C/text%3E%3C/svg%3E"></p>
      </main>
      <aside>
        <strong>文档目录</strong>
        <p>迁移目标</p>
        <p>验收表格</p>
        <p>图片与媒体</p>
      </aside>
    </div>
    <script>
      document.querySelectorAll("[data-theme]").forEach((button) => {
        button.addEventListener("click", () => {
          document.documentElement.dataset.yuqueTheme = button.dataset.theme;
        });
      });

      document.getElementById("toggle").addEventListener("click", () => {
        const root = document.documentElement;
        root.dataset.yuqueThemeEnabled = root.dataset.yuqueThemeEnabled === "true" ? "false" : "true";
      });
    </script>
  </body>
</html>
```

- [ ] **Step 4: Verify fixture can find the CSS path**

Run:

```powershell
Select-String -Path test-fixtures\yuque-reading-page.html -Pattern '../src/content/themes.css'
```

Expected: one matching line with the stylesheet link.

- [ ] **Step 5: Commit**

```powershell
git add src\content\themes.css test-fixtures\yuque-reading-page.html
git commit -m "feat: add Yuque reading themes"
```

## Task 4: Popup UI

**Files:**
- Create: `src/popup/popup.html`
- Create: `src/popup/popup.css`
- Create: `src/popup/popup.js`

- [ ] **Step 1: Verify popup files are missing**

Run:

```powershell
Test-Path src\popup\popup.html; Test-Path src\popup\popup.css; Test-Path src\popup\popup.js
```

Expected:

```text
False
False
False
```

- [ ] **Step 2: Create `src/popup/popup.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Yuque Theme</title>
    <link rel="stylesheet" href="popup.css">
  </head>
  <body>
    <main class="popup">
      <header class="popup__header">
        <div>
          <h1>Yuque Theme</h1>
          <p id="pageStatus">Checking page...</p>
        </div>
      </header>

      <label class="switch-row">
        <span>
          <strong>启用换肤</strong>
          <small>对支持的语雀阅读页自动生效</small>
        </span>
        <input id="enabledToggle" type="checkbox">
      </label>

      <section class="theme-list" aria-labelledby="themeTitle">
        <h2 id="themeTitle">主题</h2>
        <label class="theme-option">
          <input type="radio" name="theme" value="blue-topaz-light">
          <span class="swatch swatch--topaz-light"></span>
          <span>Blue Topaz Light</span>
        </label>
        <label class="theme-option">
          <input type="radio" name="theme" value="blue-topaz-dark">
          <span class="swatch swatch--topaz-dark"></span>
          <span>Blue Topaz Dark</span>
        </label>
        <label class="theme-option">
          <input type="radio" name="theme" value="paper">
          <span class="swatch swatch--paper"></span>
          <span>Paper</span>
        </label>
        <label class="theme-option">
          <input type="radio" name="theme" value="dev-docs">
          <span class="swatch swatch--dev-docs"></span>
          <span>Dev Docs</span>
        </label>
      </section>

      <button id="resetButton" class="reset-button" type="button">恢复默认</button>
    </main>
    <script src="popup.js"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `src/popup/popup.css`**

```css
:root {
  color-scheme: light;
  font-family: Inter, "Microsoft YaHei", system-ui, sans-serif;
}

body {
  background: #f8fafc;
  margin: 0;
  width: 320px;
}

.popup {
  color: #172033;
  padding: 16px;
}

.popup__header {
  border-bottom: 1px solid #dbe3ef;
  margin-bottom: 14px;
  padding-bottom: 12px;
}

h1 {
  font-size: 18px;
  line-height: 1.2;
  margin: 0 0 5px;
}

h2 {
  color: #475569;
  font-size: 12px;
  letter-spacing: 0.04em;
  margin: 0 0 8px;
  text-transform: uppercase;
}

p {
  color: #64748b;
  font-size: 12px;
  margin: 0;
}

.switch-row {
  align-items: center;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  margin-bottom: 14px;
  padding: 12px;
}

.switch-row strong {
  display: block;
  font-size: 14px;
  margin-bottom: 3px;
}

.switch-row small {
  color: #64748b;
  display: block;
  font-size: 12px;
}

#enabledToggle {
  height: 18px;
  width: 18px;
}

.theme-list {
  display: grid;
  gap: 8px;
}

.theme-option {
  align-items: center;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  cursor: pointer;
  display: grid;
  font-size: 13px;
  gap: 9px;
  grid-template-columns: auto auto 1fr;
  padding: 10px;
}

.theme-option:has(input:checked) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.12);
}

.swatch {
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 999px;
  height: 18px;
  width: 18px;
}

.swatch--topaz-light {
  background: linear-gradient(135deg, #f7f9ff 0%, #5d8be8 100%);
}

.swatch--topaz-dark {
  background: linear-gradient(135deg, #101726 0%, #7dd3fc 100%);
}

.swatch--paper {
  background: linear-gradient(135deg, #fbfbf8 0%, #9ca3af 100%);
}

.swatch--dev-docs {
  background: linear-gradient(135deg, #f8fafc 0%, #10b981 100%);
}

.reset-button {
  background: #172033;
  border: 0;
  border-radius: 8px;
  color: #ffffff;
  cursor: pointer;
  font: 13px Inter, "Microsoft YaHei", system-ui, sans-serif;
  margin-top: 14px;
  padding: 10px 12px;
  width: 100%;
}
```

- [ ] **Step 4: Create `src/popup/popup.js`**

```javascript
const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  theme: "blue-topaz-light"
});

const THEME_VALUES = new Set([
  "blue-topaz-light",
  "blue-topaz-dark",
  "paper",
  "dev-docs"
]);

const enabledToggle = document.getElementById("enabledToggle");
const pageStatus = document.getElementById("pageStatus");
const resetButton = document.getElementById("resetButton");
const themeInputs = Array.from(document.querySelectorAll('input[name="theme"]'));

function normalizeSettings(input) {
  return {
    enabled: typeof input?.enabled === "boolean" ? input.enabled : DEFAULT_SETTINGS.enabled,
    theme: THEME_VALUES.has(input?.theme) ? input.theme : DEFAULT_SETTINGS.theme
  };
}

function render(settings) {
  enabledToggle.checked = settings.enabled;
  themeInputs.forEach((input) => {
    input.checked = input.value === settings.theme;
  });
}

function getCurrentTab() {
  return chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => tabs[0] || null);
}

async function notifyCurrentTab(settings) {
  const tab = await getCurrentTab();
  if (!tab?.id) return null;

  try {
    return await chrome.tabs.sendMessage(tab.id, {
      type: "YUQUE_THEME_APPLY_SETTINGS",
      settings
    });
  } catch (_error) {
    return null;
  }
}

async function refreshPageStatus() {
  const tab = await getCurrentTab();
  if (!tab?.id || !tab.url || !tab.url.includes("yuque.com")) {
    pageStatus.textContent = "当前页面暂不支持";
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "YUQUE_THEME_GET_STATUS"
    });
    pageStatus.textContent = response?.supported ? "当前语雀阅读页已支持" : "当前语雀页面暂未识别为阅读页";
  } catch (_error) {
    pageStatus.textContent = "刷新语雀页面后可检测状态";
  }
}

async function saveSettings(nextSettings) {
  const settings = normalizeSettings(nextSettings);
  await chrome.storage.sync.set(settings);
  render(settings);
  await notifyCurrentTab(settings);
  await refreshPageStatus();
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const settings = normalizeSettings(stored);
  render(settings);
  await refreshPageStatus();
}

enabledToggle.addEventListener("change", () => {
  const selectedTheme = themeInputs.find((input) => input.checked)?.value || DEFAULT_SETTINGS.theme;
  saveSettings({
    enabled: enabledToggle.checked,
    theme: selectedTheme
  });
});

themeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    saveSettings({
      enabled: enabledToggle.checked,
      theme: input.value
    });
  });
});

resetButton.addEventListener("click", () => {
  saveSettings(DEFAULT_SETTINGS);
});

loadSettings();
```

- [ ] **Step 5: Run syntax validation**

Run:

```powershell
node --check src\popup\popup.js
```

Expected: no output and exit code `0`

- [ ] **Step 6: Commit**

```powershell
git add src\popup\popup.html src\popup\popup.css src\popup\popup.js
git commit -m "feat: add extension popup controls"
```

## Task 5: Documentation And Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Verify README still contains only the initial title**

Run:

```powershell
Get-Content -Raw README.md
```

Expected:

```text
# yuque-theme-extension
```

- [ ] **Step 2: Replace `README.md`**

```markdown
# Yuque Theme Extension

Chrome/Edge Manifest V3 extension for applying Obsidian-inspired themes to Yuque document reading pages.

## Features

- Automatically enables theming on supported Yuque reading pages.
- Defaults to Blue Topaz Light.
- Includes Blue Topaz Light, Blue Topaz Dark, Paper, and Dev Docs themes.
- Provides a compact popup for enabling/disabling themes and switching styles.
- Changes visual styling only; it does not export documents or modify Yuque content.

## Load In Chrome Or Edge

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select this repository folder.
5. Open a Yuque reading page.

## Local Fixture

Open `test-fixtures/yuque-reading-page.html` in a browser to preview the four themes without a Yuque account.

## Verify

Run syntax checks:

```powershell
node --check src\content\contentScript.js
node --check src\popup\popup.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest ok')"
```

Manual browser checks:

- Load the extension in developer mode.
- Open a supported Yuque document page.
- Confirm Blue Topaz Light applies automatically.
- Use the popup to switch to Blue Topaz Dark, Paper, and Dev Docs.
- Disable theming and confirm the page returns to Yuque styling.
- Open the fixture and inspect desktop and narrow viewport widths.

## Package

Zip the repository contents after verification. Do not include `.git`, `.superpowers`, or local screenshots in the customer package.
```

- [ ] **Step 3: Run full static verification**

Run:

```powershell
node --check src\content\contentScript.js; node --check src\popup\popup.js; node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest ok')"; Select-String -Path test-fixtures\yuque-reading-page.html -Pattern '../src/content/themes.css'
```

Expected:

```text
manifest ok
```

And one `Select-String` match for `../src/content/themes.css`.

- [ ] **Step 4: Manual visual verification**

Open `test-fixtures/yuque-reading-page.html` in a browser and check:

- Blue Topaz Light has a soft light background and blue headings.
- Blue Topaz Dark keeps body text, code, tables, and links readable.
- Paper feels calmer and long-form oriented.
- Dev Docs emphasizes links, table headers, and code blocks.
- Narrow viewport does not overlap text or controls.

- [ ] **Step 5: Commit**

```powershell
git add README.md
git commit -m "docs: add usage and verification instructions"
```

## Task 6: Final Repository Check

**Files:**
- Read-only check across all implementation files.

- [ ] **Step 1: Check git status**

Run:

```powershell
git status --short --branch
```

Expected: clean working tree on `main`, ahead of `origin/main` by the number of local commits if pushing is still blocked.

- [ ] **Step 2: Review final file list**

Run:

```powershell
Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch '\\.git\\' } | Select-Object -ExpandProperty FullName
```

Expected files include:

```text
manifest.json
README.md
src\content\contentScript.js
src\content\themes.css
src\popup\popup.html
src\popup\popup.css
src\popup\popup.js
test-fixtures\yuque-reading-page.html
docs\superpowers\specs\2026-05-06-yuque-theme-extension-design.md
docs\superpowers\plans\2026-05-06-yuque-theme-extension-implementation.md
```

- [ ] **Step 3: Attempt push if network is available**

Run:

```powershell
git push origin main
```

Expected: push succeeds. If it fails with `Recv failure: Connection was reset`, keep the local commits and ask the user to push from a terminal with working GitHub connectivity.
