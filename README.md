# Instant Anchor

A privacy-first Chrome/Edge extension for dropping persistent anchors on webpages, attaching notes, and organizing research across multiple pages without losing your place.

## Why it exists

Long webpages, documentation, articles, and AI conversations are easy to lose your place in. Instant Anchor lets you drop multiple anchors directly onto a page, jump back instantly, attach notes, and keep separate page workspaces for later.

## Features

- Multiple anchors per webpage
- Reliable return-to-anchor behavior on normal and nested scrolling layouts
- Per-anchor titles and notes
- Persistent multi-page notebook stored locally in Chrome
- Separate page tabs for different URLs and SPA routes
- Markdown export for a page or the whole notebook
- JSON backup and restore
- Migration support for earlier v0.3.x data
- No backend, analytics, accounts, AI API, or cloud sync

## Privacy model

Instant Anchor is designed to minimize data exposure.

Permissions:

- `activeTab` — temporary access after you explicitly activate the extension
- `scripting` — injects the local content script into the active page
- `storage` — saves anchors and notes in `chrome.storage.local`

The extension has no broad host permissions and contains no network request layer. See [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md).

## Install from source

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome or Edge.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder.
6. Pin Instant Anchor to the toolbar.
7. Activate it on a normal `http://` or `https://` page using the toolbar icon or `Cmd/Ctrl + Shift + Y`.

## Usage

1. Drag `⌖` onto a point in the page to create an anchor.
2. Add more anchors anywhere on the page.
3. Use `↩` to return to the active anchor.
4. Open the notebook panel to rename anchors and add notes.
5. Move across pages; each URL keeps its own page tab and anchors.
6. Export notes as Markdown or back up the complete notebook as JSON.

## Architecture

```text
Web page
  │
  ├─ DOM-aware anchor engine
  ├─ nested scroll-container detection
  ├─ multiple marker manager
  └─ SPA URL watcher
          │
          ▼
chrome.storage.local
          │
    ┌─────┼─────┐
    │     │     │
  pages anchors notes
          │
          ▼
Markdown / JSON export
```

## Current release

**v0.4.0** — persistent multi-page notebook, page tabs, SPA navigation handling, Markdown export, and JSON backup/import.

See [CHANGELOG.md](CHANGELOG.md).

## Development

Run the static security audit:

```bash
./audit.sh
```

Run syntax validation:

```bash
node --check background.js
node --check content.js
```

## Browser support

Built for Chromium-based browsers using Manifest V3. Tested primarily with Chrome.

## Contributing

Bug reports and focused pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## License

MIT — see [LICENSE](LICENSE).
