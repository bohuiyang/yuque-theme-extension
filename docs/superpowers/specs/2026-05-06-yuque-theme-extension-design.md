# Yuque Theme Extension Design

Date: 2026-05-06

## Goal

Build a Chrome and Edge Manifest V3 browser extension that changes the visual appearance of Yuque document reading pages. The first version focuses on making Yuque documents feel closer to Obsidian Blue Topaz and related reading styles without changing document content, export behavior, or Yuque editing workflows.

## Confirmed Scope

- Browser target: Chrome and Edge, using Manifest V3.
- Site target: Yuque document reading pages on `*.yuque.com`.
- First-run behavior: automatically enable theming after installation.
- Default theme: Blue Topaz Light.
- Built-in themes:
  - Blue Topaz Light
  - Blue Topaz Dark
  - Paper
  - Dev Docs
- Configuration: global enable switch and global selected theme.
- Out of scope for version 1:
  - Yuque editor pages.
  - Yuque knowledge base directory pages.
  - Document export or conversion.
  - Per-space, per-knowledge-base, or per-document settings.
  - Rebuilding or hiding Yuque navigation, document outline, edit buttons, or layout controls.
  - Exact replication of all Obsidian Blue Topaz plugin behavior.

## Product Behavior

When a customer opens a supported Yuque reading page, the extension automatically applies the current theme. On first install, theming is enabled and the selected theme is Blue Topaz Light.

The browser action popup lets the customer:

- See whether the current tab appears to be a supported Yuque reading page.
- Enable or disable theming globally.
- Switch among the four built-in themes.
- Restore defaults, which re-enables theming and selects Blue Topaz Light.

Theme changes apply immediately to the open Yuque page without requiring a refresh.

## Architecture

The extension uses a small content script and CSS theme pack.

- `manifest.json`
  - Declares Manifest V3 metadata.
  - Registers the content script and theme stylesheet for Yuque URLs.
  - Requests `storage` and `activeTab`.
  - Declares host permissions for `*://*.yuque.com/*`.
  - Does not request `scripting` in version 1 because the content script is registered statically.
  - Defines the browser action popup.

- `src/content/contentScript.js`
  - Runs only on Yuque URLs declared by the manifest.
  - Detects whether the page is likely a Yuque reading page.
  - Reads `enabled` and `theme` from extension storage.
  - Applies state through stable attributes on the document root:
    - `data-yuque-theme-enabled="true|false"`
    - `data-yuque-theme="blue-topaz-light|blue-topaz-dark|paper|dev-docs"`
  - Listens for storage changes and popup messages so updates apply immediately.
  - Uses a light `MutationObserver` to re-check page support if Yuque swaps content client-side.

- `src/content/themes.css`
  - Defines base Yuque reading-page overrides.
  - Defines theme variables and theme-specific selectors.
  - Keeps selectors conservative so Yuque DOM changes are less likely to break the extension.

- `src/popup/popup.html`
  - Provides the extension control surface.

- `src/popup/popup.css`
  - Styles the popup as a compact utility panel.

- `src/popup/popup.js`
  - Reads and writes settings from `chrome.storage.sync`.
  - Queries the current tab for support status.
  - Sends messages to the content script after changes.

## Reading Page Detection

The content script uses two checks:

1. Host check: the page must be under `yuque.com`.
2. Feature check: the page should contain common Yuque reading-page elements, such as a document title and a document content container.

If the feature check fails, the content script does not apply theme attributes. The popup should treat the page as unsupported or inactive.

The detection should prefer multiple fallback selectors instead of depending on one fragile class name. It can use semantic containers, article-like structures, heading presence, and known Yuque content wrappers.

## Styling Strategy

The stylesheet changes only visual presentation. It does not move core Yuque controls or remove functional UI.

Base styling covers:

- Page background.
- Reading container width and spacing.
- Body text color and font stack.
- Heading hierarchy from `h1` to `h6`.
- Paragraphs, lists, and links.
- Blockquotes.
- Inline code and fenced code blocks.
- Tables.
- Horizontal rules.
- Images and media spacing.
- Basic side navigation and outline colors where safe.

The stylesheet should avoid high-risk layout rewrites in version 1. It should not hide navigation, remove edit controls, or reposition the document outline.

## Themes

### Blue Topaz Light

Default theme. Uses a soft light background, blue headings, readable body text, clear blockquotes, and high-contrast dark code blocks. This is the main Obsidian Blue Topaz-inspired experience.

### Blue Topaz Dark

Dark reading mode for night use and engineering documents. It must preserve contrast for body text, links, code, tables, and blockquotes. Images should not be inverted by default.

### Paper

Long-form reading theme inspired by paper and Typora-like documents. It uses warmer neutral backgrounds, restrained headings, serif-capable font stacks, and calm blockquotes.

### Dev Docs

Technical documentation theme. It emphasizes code blocks, table readability, links, and quote/callout structure. It should feel practical for engineering knowledge bases.

## Storage Model

Use `chrome.storage.sync` for:

```json
{
  "enabled": true,
  "theme": "blue-topaz-light"
}
```

If values are missing or invalid, the extension falls back to:

- `enabled: true`
- `theme: "blue-topaz-light"`

The first version uses global settings only.

## Popup UX

The popup is a compact control panel, not a marketing page.

It should contain:

- Extension name.
- Current page status.
- A single enable/disable toggle.
- Four theme options.
- Restore default action.

The theme options should be clear by name and include a small visual cue such as a color swatch. The popup should remain usable even when the current tab is not a supported Yuque reading page; in that case it can still let the user change global preferences, but should clearly show that the current page is unsupported.

## Error Handling

- If storage read fails, use defaults and keep the page usable.
- If the current page is unsupported, do not apply theme attributes.
- If a selected theme key is unknown, fall back to Blue Topaz Light.
- If messaging from popup to content script fails, save the setting anyway; the new setting will apply on the next supported page load.

## Testing And Verification

Version 1 should include a local static fixture page that simulates a Yuque reading page with:

- Headings.
- Paragraphs.
- Lists.
- Links.
- Blockquotes.
- Inline code.
- Code blocks.
- Tables.
- Images.

Verification should cover:

- The extension loads in Chrome or Edge developer mode.
- The fixture page renders all four themes.
- Switching themes updates the page without refresh.
- Disabling theming removes theme-specific styling.
- Popup default restore re-enables Blue Topaz Light.
- Text does not overlap in desktop or narrow viewport sizes.
- Dark theme has readable contrast for body text, links, code, and tables.

If a real Yuque document is available, perform a manual smoke test there as well. If authentication blocks automated testing, keep the fixture test and document the manual validation step.

## Delivery

The first deliverable is a browser extension folder that can be loaded from Chrome or Edge developer mode. The same folder can later be zipped for customer distribution or adapted for store submission.

Recommended first implementation layout:

```text
yuque-theme-extension/
  manifest.json
  README.md
  src/
    content/
      contentScript.js
      themes.css
    popup/
      popup.html
      popup.css
      popup.js
  test-fixtures/
    yuque-reading-page.html
  docs/
    superpowers/
      specs/
        2026-05-06-yuque-theme-extension-design.md
```

## Open Decisions For Later

- Whether to add per-space or per-document theme memory.
- Whether to support Yuque directory pages.
- Whether to package a Tampermonkey script variant for easier installation.
- Whether to add a user-customizable theme editor.
- Whether to submit to Chrome Web Store or distribute privately.
