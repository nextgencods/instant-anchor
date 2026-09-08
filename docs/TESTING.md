# Testing checklist

## Core anchoring

- Create an anchor on a normal scrolling page.
- Scroll away and return to it.
- Create at least three anchors and verify order remains stable while scrolling both directions.
- Verify markers disappear when their anchored content is outside the relevant scroll container.

## Nested scrolling

- Test on a page whose main content scrolls inside an internal container.
- Create multiple anchors at different positions.
- Verify each return action restores the intended anchor without blank-page jumps.

## Persistence

- Create anchors and notes on two different pages.
- Reload each page and verify its page-specific notebook is restored.
- Close and reopen Chrome and verify saved notes persist.

## SPA navigation

- Navigate between multiple routes without a hard reload.
- Verify each route keeps a separate notebook page.

## Export and restore

- Export a page to Markdown.
- Export the full notebook to Markdown.
- Back up to JSON.
- Restore from the JSON backup and verify page/anchor/note structure.
