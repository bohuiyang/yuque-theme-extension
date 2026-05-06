# Yuque Theme Extension

Chrome/Edge Manifest V3 extension for applying Obsidian-inspired themes to Yuque document reading pages.

## Features

- Automatically enables theming on supported Yuque reading pages.
- Defaults to Blue Topaz Light.
- Includes Blue Topaz Light, Blue Topaz Dark, Paper, and Dev Docs themes.
- Uses a responsive reading width so long documents expand on wide screens and stay readable on smaller windows.
- Provides a compact popup for enabling/disabling themes and switching styles.
- Changes visual styling only; it does not export documents or modify Yuque content.

## Load In Chrome Or Edge

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select this repository folder.
5. Open a Yuque reading page.

After pulling updates or changing local files, click Reload on the extension card in `chrome://extensions`, then refresh the Yuque tab. Chrome does not automatically reload unpacked extension content scripts.

## Local Fixture

Open `test-fixtures/yuque-reading-page.html` in a browser for a supported document preview.
Open `test-fixtures/yuque-non-reading-page.html` for an unsupported page sanity check.

## Theme Credit

The Blue Topaz themes are an adapted visual interpretation for Yuque reading pages, inspired by the MIT-licensed Obsidian Blue Topaz theme: https://github.com/PKM-er/Blue-Topaz_Obsidian-css. The extension does not bundle the original Obsidian theme file.

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
- Open both fixture pages and inspect desktop and narrow viewport widths.

## Package

Zip only the customer-facing extension files after verification.

Include: `manifest.json`, `src/`, `test-fixtures/`, and `README.md`.

Exclude: `.git`, `.worktrees`, `.superpowers`, `docs/superpowers`, screenshots, and other local artifacts.
