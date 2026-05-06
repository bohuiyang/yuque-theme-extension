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
let lastRenderedSettings = { ...DEFAULT_SETTINGS };

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
  lastRenderedSettings = { ...settings };
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
    pageStatus.textContent = "Current page is not supported";
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "YUQUE_THEME_GET_STATUS"
    });
    pageStatus.textContent = response?.supported ? "Supported Yuque reading page" : "Yuque page is not recognized as a reading page";
  } catch (_error) {
    pageStatus.textContent = "Refresh the Yuque page to check status";
  }
}

async function saveSettings(nextSettings) {
  const settings = normalizeSettings(nextSettings);
  const previousSettings = { ...lastRenderedSettings };

  try {
    await chrome.storage.sync.set(settings);
  } catch (_error) {
    render(previousSettings);
    pageStatus.textContent = "Unable to save settings";
    return;
  }

  render(settings);
  await notifyCurrentTab(settings);
  await refreshPageStatus();
}

async function loadSettings() {
  try {
    const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    const settings = normalizeSettings(stored);
    render(settings);
    await refreshPageStatus();
  } catch (_error) {
    render(DEFAULT_SETTINGS);
    pageStatus.textContent = "Unable to save settings";
  }
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
