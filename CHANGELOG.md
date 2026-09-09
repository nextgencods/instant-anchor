# Changelog

All notable changes to Instant Anchor are documented here.

## [0.4.1] - 2026-09-09

### Fixed
- Anchor markers no longer float or appear detached when code blocks, snippet boxes, sticky surfaces, or other overlapping page elements pass over the original anchor point
- Marker visibility now respects visual occlusion while preserving the saved jump target

## [0.4.0] - 2026-09-08

### Added
- Persistent multi-page notebook
- Page tabs with per-page anchor counts
- Saved-page review and navigation
- SPA URL-change detection
- Whole-notebook Markdown export
- Whole-notebook JSON backup/import
- Migration from v0.3.x local storage

## [0.3.1] - 2026-09-08

### Fixed
- Marker drift and bunching while scrolling
- Marker clipping in nested scroll containers
- Independent text offsets for multiple anchors

## [0.3.0] - 2026-09-08

### Added
- Multiple anchors
- Side notes panel
- Per-anchor titles and notes
- Local persistence
- Markdown and JSON export

## [0.2.0] - 2026-09-08

### Fixed
- Nested scroll-container return behavior
- Anchors staying attached to page content instead of viewport coordinates

## [0.1.0] - 2026-09-08

### Added
- Initial single-anchor prototype
- Temporary return marker
