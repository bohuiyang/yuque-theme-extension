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
    pageStatus.textContent = "褰撳墠椤甸潰鏆備笉鏀寔";
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "YUQUE_THEME_GET_STATUS"
    });
    pageStatus.textContent = response?.supported ? "褰撳墠璇泙闃呰椤靛凡鏀寔" : "褰撳墠璇泙椤甸潰鏆傛湭璇嗗埆涓洪槄璇婚〉";
  } catch (_error) {
    pageStatus.textContent = "鍒锋柊璇泙椤甸潰鍚庡彲妫€娴嬬姸鎬?";
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
