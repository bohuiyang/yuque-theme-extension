# Blue Topaz Light Port Design

## Goal

Build a Chrome/Edge Manifest V3 extension that applies the upstream Obsidian Blue Topaz light theme to Yuque reading pages.

This revision intentionally removes the previous multi-theme concept. The extension should only provide Blue Topaz Light, with no Paper, Dev Docs, dark mode, or locally invented Blue Topaz-like palette.

## Source Theme

The source theme is the Obsidian Blue Topaz theme:

- Repository: `https://github.com/PKM-er/Blue-Topaz_Obsidian-css`
- CSS source: upstream `theme.css`
- License: MIT

The extension must vendor the upstream Blue Topaz CSS and license into the repository. README and source comments must credit the upstream theme. The extension may adapt selectors and scoping for Yuque, but the visual rules should come from the vendored Blue Topaz CSS instead of a hand-authored theme recreation.

## Scope

In scope:

- One built-in theme: Blue Topaz Light.
- Yuque reading pages only.
- Visual-only changes to the reading surface.
- Original Blue Topaz CSS vendored into `vendor/blue-topaz/`.
- A generated or mechanical scoped CSS file for browser-extension use.
- A thin Yuque adapter layer that maps Yuque's document DOM to Obsidian-like classes and CSS variables.
- Code block styling for Yuque `pre`, `code`, `ne-code`, and current Yuque code block containers.
- Popup simplification to enable/disable Blue Topaz Light and show page support status.

Out of scope:

- Exporting Yuque documents.
- Editing Yuque content.
- Supporting Blue Topaz Dark.
- Supporting Paper, Dev Docs, or other themes.
- Building a full Obsidian runtime inside Yuque.
- Rewriting the upstream Blue Topaz theme by hand.

## User Experience

When the user opens a supported Yuque reading page, the extension automatically applies Blue Topaz Light if enabled.

The popup contains:

- Extension title.
- Page support status.
- One enable toggle, labeled for Blue Topaz Light.
- Optional reset button only if it remains useful for restoring the default enabled setting.

There is no theme list because there is only one theme.

If the current page is not a supported Yuque reading page, the popup should clearly report that status and the extension should not visually alter the page.

## Architecture

### Files

Planned file responsibilities:

- `vendor/blue-topaz/theme.css`: vendored upstream Blue Topaz CSS.
- `vendor/blue-topaz/LICENSE`: upstream license.
- `src/content/blueTopazAdapter.css`: small hand-written adapter for Yuque-to-Obsidian DOM compatibility.
- `src/content/blueTopaz.scoped.css`: mechanically scoped CSS derived from the vendored theme.
- `src/content/contentScript.js`: detect Yuque reading pages, set root state, and add Obsidian-compatible classes to reading containers.
- `src/popup/popup.html`: simplified one-theme popup.
- `src/popup/popup.js`: simplified settings model with `enabled` only.
- `src/popup/popup.css`: simplified popup visuals.
- `test-fixtures/yuque-reading-page.html`: reading fixture with Yuque `ne-*` elements and code blocks.
- `README.md`: installation, reload, credit, and verification notes.

### Content Script

The content script keeps the existing support detection approach, with current Yuque selectors:

- `.article-content`
- `.yuque-doc-content`
- `.ne-viewer-body`
- `.lake-content`
- `.doc-reader`

On supported pages, it sets:

- `data-yuque-theme-supported="true"`
- `data-yuque-theme-enabled="true"`
- `data-yuque-theme="blue-topaz-light"`

It also adds compatibility classes inside the reading surface:

- Reading root gets Obsidian preview-like classes, such as `markdown-preview-view` and `mod-cm6` only if needed by the vendored selectors.
- Code block containers get adapter classes when Yuque does not provide equivalent selectors.
- Yuque custom elements keep their native structure; the adapter should not rewrite content or move nodes.

The adapter must be idempotent because Yuque pages can update through client-side navigation.

### CSS Strategy

The implementation should not hand-author a replacement Blue Topaz palette.

Instead:

1. Vendor upstream Blue Topaz CSS.
2. Produce a scoped extension CSS asset from the vendored CSS.
3. Scope global Obsidian selectors to the Yuque reading surface.
4. Add a small adapter CSS layer for Yuque elements that Blue Topaz cannot naturally target.

The scoped CSS should prevent Blue Topaz rules from leaking into:

- Yuque top navigation.
- Left document tree.
- Right outline.
- Share/edit buttons.
- Popup UI.

Only the reading content and its document blocks should receive the theme.

### Blue Topaz Light Only

The extension must force the light color path. If the upstream theme contains dark-mode selectors, the scoped output should either omit them or make them unreachable.

No dark-mode setting is exposed.

### Code Blocks

Code block behavior is a required acceptance area.

The adapter must cover:

- `pre`
- `pre code`
- inline `code`
- `ne-code`
- `.lake-codeblock`
- current Yuque code block wrappers found on real pages

Expected behavior:

- Block code uses Blue Topaz code background, border, font, radius, line-height, and horizontal scrolling.
- Inline code uses Blue Topaz inline-code styling.
- Existing Yuque syntax tokens remain readable.
- Long code lines do not break page width.

## Error Handling

If the content script cannot find a supported reading container, it should mark the page unsupported and avoid styling.

If storage reads fail, the default behavior remains enabled.

If adapter class application runs before the reading DOM is ready, the mutation observer retries after Yuque renders content.

## Testing

Static checks:

- `node --check src\content\contentScript.js`
- `node --check src\popup\popup.js`
- Manifest JSON parse check.
- `git diff --check`

Fixture checks:

- Supported Yuque fixture is detected as supported.
- Unsupported fixture is not detected as supported.
- Blue Topaz Light applies to headings, paragraphs, blockquotes, tables, inline code, and block code.
- Desktop layout is not narrow on a wide viewport.
- Mobile layout has no horizontal page overflow.

Real Yuque checks:

- The known page `https://www.yuque.com/lester-rilpq/staxal/7630301a119ceada0e7118ed2dda1898` is detected as supported.
- The popup status reports a supported Yuque reading page after extension reload.
- The reading content receives Blue Topaz Light styling.
- Yuque navigation and controls remain usable and are not restyled as document content.

## Acceptance Criteria

- Only Blue Topaz Light is present in the extension UI and settings model.
- The vendored upstream Blue Topaz CSS and license are committed.
- The visible reading style comes from the vendored Blue Topaz CSS plus mechanical scoping and a thin adapter layer.
- Code blocks on Yuque pages are styled through Blue Topaz-compatible selectors.
- The reading layout adapts to desktop and mobile widths.
- No Blue Topaz styling leaks into Yuque navigation or controls.
- README explains install, reload, verification, and upstream credit.
