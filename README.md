# Instant Anchor

Privacy-first Chrome extension for dropping persistent anchors anywhere on a webpage, returning to them instantly, attaching notes, organizing anchors by page, and exporting structured research notes.

## Highlights

- Multiple anchors per page
- Reliable return across normal and nested scroll containers
- Persistent per-page notebooks
- Notes and comments for every anchor
- SPA navigation support for apps such as ChatGPT
- Markdown export and JSON backup/import
- Local-only storage (`chrome.storage.local`)
- No backend, analytics, telemetry, AI API, or cloud sync
- Minimal permissions: `activeTab`, `scripting`, `storage`

## Install from source

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome or Chromium.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder.
6. Pin **Instant Anchor Private** to the toolbar.

## How it works

Activate the extension on the current page, drag the anchor control to a point in the page, then use the return control or the notebook panel to jump back later. Each page has its own saved workspace. Notes remain local to the browser profile unless you explicitly export them.

## Privacy

Instant Anchor is intentionally local-first. It has no server and performs no network requests. See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## Development

Run the static isolation audit:

```bash
./audit.sh
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/TESTING.md](docs/TESTING.md) for development guidance.

## Version

Current release: **v0.4.0**

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).
