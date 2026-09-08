# Security

Instant Anchor is intentionally designed as a local browser utility rather than a cloud service.

## Stored data

For pages with saved anchors, the extension may store:

- page title
- page URL
- anchor locator metadata and fallback coordinates
- anchor names
- notes explicitly typed by the user
- timestamps and ordering

The extension does not intentionally persist surrounding webpage text.

## Network isolation

The extension contains no application backend and no intentional network request code such as `fetch`, `XMLHttpRequest`, `WebSocket`, or `sendBeacon`.

It does not include analytics SDKs, AI APIs, remote scripts, or cloud sync.

## Permissions

- `activeTab`: temporary page access after explicit activation
- `scripting`: injects the bundled content script
- `storage`: persists the notebook using `chrome.storage.local`

There are no broad host permissions, cookie/history permissions, or `storage.sync` usage.

## Threat model

No browser extension can be literally zero-risk. A content script that is active on a webpage can interact with that page. Instant Anchor reduces that surface by requiring explicit activation and by avoiding a network layer that could transmit stored notebook data to an external service.

## Reporting a vulnerability

Please do not publish sensitive exploit details in a public issue. Contact the repository owner privately through GitHub first when possible.
