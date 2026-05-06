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
