(() => {
  'use strict';

  const OLD_KEYS = ['__instantAnchorPrivate_v010__', '__instantAnchorPrivate_v020__', '__instantAnchorPrivate_v031__'];
  for (const key of OLD_KEYS) {
    if (window[key] && typeof window[key].destroy === 'function') {
      try { window[key].destroy(); } catch (_) {}
    }
  }

  const INSTANCE_KEY = '__instantAnchorPrivate_v040__';
  if (window[INSTANCE_KEY] && typeof window[INSTANCE_KEY].show === 'function') {
    window[INSTANCE_KEY].show();
    return;
  }

  function pageKeyNow() { return `${location.origin}${location.pathname}${location.search}`; }
  let PAGE_KEY = pageKeyNow();
  const WORKSPACE_KEY = 'instantAnchorPrivate:v040:workspace';
  const LEGACY_PREFIX = 'instantAnchorPrivate:v030:';
  const COLORS = ['#19b84a', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

  const state = {
    anchors: [],
    activeId: null,
    dragging: false,
    didDrag: false,
    destroyed: false,
    markerFrame: 0,
    panelOpen: true,
    saveTimer: 0,
    tipTimer: 0,
    clearArmedUntil: 0,
    pages: {},
    selectedPageKey: PAGE_KEY,
    workspaceSaveTimer: 0,
    pageDeleteArmedUntil: 0,
    livePageMeta: { pageKey: PAGE_KEY, pageTitle: document.title || 'Untitled page', pageUrl: location.href.split('#')[0] },
    urlWatchTimer: 0
  };

  const host = document.createElement('div');
  host.id = 'instant-anchor-private-host';
  host.style.position = 'fixed';
  host.style.top = '14px';
  host.style.right = '14px';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'auto';
  host.style.contain = 'layout style';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; }
      .dock {
        position: relative;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 7px;
        border-radius: 16px;
        background: rgba(24,24,27,.95);
        border: 1px solid rgba(255,255,255,.16);
        box-shadow: 0 8px 24px rgba(0,0,0,.24);
        font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        user-select: none;
        -webkit-user-select: none;
      }
      button {
        appearance: none;
        border: 0;
        display: inline-grid;
        place-items: center;
        cursor: pointer;
        color: #fff;
        background: rgba(255,255,255,.10);
        font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        transition: transform 120ms ease, background 120ms ease, opacity 120ms ease, box-shadow 120ms ease;
      }
      button:hover { background: rgba(255,255,255,.17); }
      button:active { transform: scale(.96); }
      button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
      .dock-btn { width: 42px; height: 42px; border-radius: 12px; font: 700 19px/1 sans-serif; touch-action: none; }
      #pin { cursor: grab; }
      #pin.dragging { cursor: grabbing; background: rgba(255,255,255,.22); }
      #go { opacity: .45; cursor: default; background: rgba(255,255,255,.09); }
      #go.ready {
        opacity: 1;
        cursor: pointer;
        background: #19b84a;
        box-shadow: 0 0 0 3px rgba(25,184,74,.22), 0 0 16px rgba(25,184,74,.5);
      }
      #notesToggle { position: relative; }
      .count {
        position: absolute;
        right: -4px;
        top: -4px;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 999px;
        background: #fff;
        color: #18181b;
        font: 800 10px/18px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      .count:empty { display: none; }
      .tip {
        position: absolute;
        right: 0;
        top: 61px;
        width: max-content;
        max-width: 290px;
        padding: 8px 10px;
        border-radius: 10px;
        color: #fff;
        background: rgba(24,24,27,.97);
        border: 1px solid rgba(255,255,255,.14);
        font: 600 12px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        box-shadow: 0 8px 20px rgba(0,0,0,.22);
        pointer-events: none;
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 120ms ease, transform 120ms ease;
      }
      .tip.show { opacity: 1; transform: translateY(0); }
      .drag-ghost {
        position: fixed;
        width: 32px;
        height: 32px;
        margin: -16px 0 0 -16px;
        border-radius: 50% 50% 50% 8px;
        transform: rotate(-45deg);
        background: #fff;
        box-shadow: 0 5px 16px rgba(0,0,0,.28);
        display: none;
        pointer-events: none;
        z-index: 2147483647;
      }
      .drag-ghost::after {
        content: '';
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #18181b;
        left: 11px;
        top: 11px;
      }
      .drag-ghost.show { display: block; }

      .panel {
        position: fixed;
        top: 72px;
        right: 14px;
        width: min(430px, calc(100vw - 28px));
        max-height: calc(100vh - 90px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 18px;
        background: rgba(24,24,27,.975);
        color: #fff;
        border: 1px solid rgba(255,255,255,.15);
        box-shadow: 0 18px 48px rgba(0,0,0,.34);
        font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        opacity: 0;
        transform: translateX(18px) scale(.985);
        pointer-events: none;
        transition: opacity 170ms ease, transform 170ms ease;
      }
      .panel.open { opacity: 1; transform: translateX(0) scale(1); pointer-events: auto; }
      .panel-head {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 14px 11px;
        border-bottom: 1px solid rgba(255,255,255,.11);
      }
      .panel-title { flex: 1; min-width: 0; }
      .panel-title strong { display: block; font-size: 14px; line-height: 1.2; }
      .panel-title span { display: block; margin-top: 3px; color: rgba(255,255,255,.56); font-size: 11px; }
      .close-panel { width: 31px; height: 31px; border-radius: 9px; font-size: 16px; }
      .page-strip-wrap {
        border-bottom: 1px solid rgba(255,255,255,.11);
        background: rgba(255,255,255,.025);
      }
      .page-strip {
        display: flex;
        gap: 7px;
        overflow-x: auto;
        padding: 9px 10px 8px;
        scrollbar-width: thin;
      }
      .page-tab {
        display: flex;
        align-items: center;
        gap: 7px;
        flex: 0 0 auto;
        max-width: 190px;
        min-height: 34px;
        padding: 0 9px;
        border-radius: 10px;
        background: rgba(255,255,255,.065);
        border: 1px solid transparent;
        color: rgba(255,255,255,.78);
        font-size: 11px;
        font-weight: 650;
      }
      .page-tab.selected {
        background: rgba(255,255,255,.13);
        border-color: rgba(255,255,255,.24);
        color: #fff;
      }
      .page-tab.current::before {
        content: '';
        width: 7px;
        height: 7px;
        flex: 0 0 7px;
        border-radius: 999px;
        background: #19b84a;
        box-shadow: 0 0 8px rgba(25,184,74,.6);
      }
      .page-tab-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .page-tab-count {
        flex: 0 0 auto;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: rgba(255,255,255,.12);
        font-size: 9px;
        font-weight: 800;
      }
      .page-context {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }
      .page-context-copy { flex: 1; min-width: 0; }
      .page-context-copy strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
      .page-context-copy span { display: block; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(255,255,255,.43); font-size: 9px; }
      .context-btn { width: auto; min-height: 30px; padding: 0 9px; border-radius: 8px; font-size: 10px; font-weight: 750; }
      .list { overflow: auto; padding: 10px; min-height: 80px; }
      .empty {
        padding: 30px 18px;
        text-align: center;
        color: rgba(255,255,255,.58);
        font-size: 12px;
        line-height: 1.5;
      }
      .card {
        border: 1px solid rgba(255,255,255,.11);
        border-radius: 14px;
        background: rgba(255,255,255,.055);
        padding: 10px;
        margin-bottom: 9px;
        transition: border-color 120ms ease, background 120ms ease;
      }
      .card.active { border-color: rgba(255,255,255,.35); background: rgba(255,255,255,.085); }
      .card.archived { border-color: rgba(255,255,255,.08); }
      .card-head { display: flex; align-items: center; gap: 8px; }
      .badge {
        width: 25px;
        height: 25px;
        flex: 0 0 25px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        box-shadow: inset 0 0 0 2px rgba(255,255,255,.18);
      }
      .title-input {
        flex: 1;
        min-width: 0;
        height: 32px;
        border: 1px solid transparent;
        border-radius: 8px;
        padding: 0 7px;
        background: transparent;
        color: #fff;
        font: 650 12px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      .title-input:hover, .title-input:focus { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.13); }
      .mini-actions { display: flex; gap: 5px; }
      .mini { width: 29px; height: 29px; border-radius: 8px; font-size: 12px; }
      textarea {
        width: 100%;
        min-height: 72px;
        max-height: 210px;
        resize: vertical;
        margin-top: 8px;
        padding: 9px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.11);
        background: rgba(0,0,0,.18);
        color: #fff;
        font: 12px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      textarea::placeholder { color: rgba(255,255,255,.34); }
      .meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 7px;
        color: rgba(255,255,255,.43);
        font-size: 10px;
      }
      .jump-link {
        width: auto;
        min-width: 62px;
        height: 28px;
        padding: 0 9px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
      }
      .panel-foot {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        padding: 10px;
        border-top: 1px solid rgba(255,255,255,.11);
      }
      .foot-btn {
        width: auto;
        height: 34px;
        padding: 0 11px;
        border-radius: 9px;
        font-size: 11px;
        font-weight: 700;
      }
      .danger { color: #fecaca; }
      .saved {
        flex: 1 1 100%;
        color: rgba(255,255,255,.46);
        font-size: 10px;
        padding: 1px 2px 0;
      }
    </style>
    <div class="dock" role="toolbar" aria-label="Instant Anchor">
      <button id="pin" class="dock-btn" type="button" title="Drag onto the page to add an anchor" aria-label="Drag to add anchor">⌖</button>
      <button id="go" class="dock-btn" type="button" title="Return to active anchor" aria-label="Return to active anchor" disabled>↩</button>
      <button id="notesToggle" class="dock-btn" type="button" title="Open anchors and notes" aria-label="Open anchors and notes">☰<span id="count" class="count"></span></button>
      <div id="ghost" class="drag-ghost" aria-hidden="true"></div>
      <div id="tip" class="tip" role="status" aria-live="polite"></div>
    </div>
    <section id="panel" class="panel" aria-label="Anchors and notes">
      <div class="panel-head">
        <div class="panel-title"><strong>Anchor Notebook</strong><span>Pages, anchors & notes · local only</span></div>
        <button id="closePanel" class="close-panel" type="button" aria-label="Close notes panel">×</button>
      </div>
      <div class="page-strip-wrap"><div id="pageStrip" class="page-strip"></div></div>
      <div id="pageContext" class="page-context"></div>
      <div id="list" class="list"></div>
      <div class="panel-foot">
        <button id="exportMd" class="foot-btn" type="button">Export page</button>
        <button id="exportNotebook" class="foot-btn" type="button">Export notebook</button>
        <button id="exportJson" class="foot-btn" type="button">Backup all</button>
        <button id="importJson" class="foot-btn" type="button">Import backup</button>
        <input id="importFile" type="file" accept=".json,application/json" style="display:none">
        <button id="clearAll" class="foot-btn danger" type="button">Delete page</button>
        <div id="saved" class="saved">Local only · no cloud sync</div>
      </div>
    </section>`;

  const pin = shadow.getElementById('pin');
  const go = shadow.getElementById('go');
  const notesToggle = shadow.getElementById('notesToggle');
  const count = shadow.getElementById('count');
  const ghost = shadow.getElementById('ghost');
  const tip = shadow.getElementById('tip');
  const panel = shadow.getElementById('panel');
  const closePanel = shadow.getElementById('closePanel');
  const pageStrip = shadow.getElementById('pageStrip');
  const pageContext = shadow.getElementById('pageContext');
  const list = shadow.getElementById('list');
  const exportMd = shadow.getElementById('exportMd');
  const exportNotebook = shadow.getElementById('exportNotebook');
  const exportJson = shadow.getElementById('exportJson');
  const importJson = shadow.getElementById('importJson');
  const importFile = shadow.getElementById('importFile');
  const clearAll = shadow.getElementById('clearAll');
  const saved = shadow.getElementById('saved');

  function announce(message) {
    tip.textContent = message;
    tip.classList.add('show');
    clearTimeout(state.tipTimer);
    state.tipTimer = setTimeout(() => tip.classList.remove('show'), 1700);
  }

  function colorForIndex(index) {
    return COLORS[index % COLORS.length];
  }

  function makeId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
    return `a-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function safeCssEscape(value) {
    if (globalThis.CSS && typeof globalThis.CSS.escape === 'function') return globalThis.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
  }

  function selectorFor(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';
    if (element.id) {
      const selector = `#${safeCssEscape(element.id)}`;
      try { if (document.querySelectorAll(selector).length === 1) return selector; } catch (_) {}
    }

    const parts = [];
    let current = element;
    let depth = 0;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement && depth < 12) {
      if (current.id) {
        const idSelector = `#${safeCssEscape(current.id)}`;
        try {
          if (document.querySelectorAll(idSelector).length === 1) {
            parts.unshift(idSelector);
            break;
          }
        } catch (_) {}
      }
      const tag = current.localName || 'div';
      let nth = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.localName === tag) nth += 1;
        sibling = sibling.previousElementSibling;
      }
      parts.unshift(`${tag}:nth-of-type(${nth})`);
      current = current.parentElement;
      depth += 1;
    }
    return parts.join(' > ');
  }

  function nodePathFrom(root, node) {
    if (!root || !node) return [];
    const path = [];
    let current = node;
    while (current && current !== root) {
      const parent = current.parentNode;
      if (!parent) return [];
      const index = Array.prototype.indexOf.call(parent.childNodes, current);
      if (index < 0) return [];
      path.unshift(index);
      current = parent;
    }
    return current === root ? path : [];
  }

  function nodeFromPath(root, path) {
    let current = root;
    for (const index of Array.isArray(path) ? path : []) {
      if (!current || !current.childNodes || !current.childNodes[index]) return null;
      current = current.childNodes[index];
    }
    return current;
  }

  function rangeAtPoint(clientX, clientY) {
    if (typeof document.caretPositionFromPoint === 'function') {
      const pos = document.caretPositionFromPoint(clientX, clientY);
      if (pos && pos.offsetNode) {
        const range = document.createRange();
        try {
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
          return range;
        } catch (_) {}
      }
    }
    if (typeof document.caretRangeFromPoint === 'function') {
      try {
        const range = document.caretRangeFromPoint(clientX, clientY);
        if (range) {
          range.collapse(true);
          return range;
        }
      } catch (_) {}
    }
    return null;
  }

  function targetFromRange(range) {
    if (!range || !range.startContainer) return null;
    const node = range.startContainer;
    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  }

  function isUsableTarget(element) {
    return element && element.isConnected && element !== document.documentElement && element !== document.body && element !== host && !String(element.id || '').startsWith('instant-anchor-private-marker-');
  }

  function createMarker(anchor) {
    const marker = document.createElement('div');
    marker.id = `instant-anchor-private-marker-${anchor.id}`;
    marker.setAttribute('aria-hidden', 'true');
    marker.style.position = 'fixed';
    marker.style.width = '24px';
    marker.style.height = '24px';
    marker.style.borderRadius = '50% 50% 50% 5px';
    marker.style.transform = 'rotate(-45deg)';
    marker.style.background = colorForIndex(anchor.order);
    marker.style.boxShadow = '0 0 0 3px rgba(255,255,255,.72), 0 3px 10px rgba(0,0,0,.28)';
    marker.style.zIndex = '2147483645';
    marker.style.pointerEvents = 'none';
    marker.style.display = 'none';

    const label = document.createElement('span');
    label.textContent = String(anchor.order + 1);
    label.style.position = 'absolute';
    label.style.inset = '0';
    label.style.display = 'grid';
    label.style.placeItems = 'center';
    label.style.transform = 'rotate(45deg)';
    label.style.color = '#fff';
    label.style.font = '800 10px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    marker.appendChild(label);

    document.documentElement.appendChild(marker);
    anchor.marker = marker;
    anchor.markerLabel = label;
  }

  function removeMarker(anchor) {
    if (anchor && anchor.marker) anchor.marker.remove();
    if (anchor) {
      anchor.marker = null;
      anchor.markerLabel = null;
    }
  }

  function restoreReference(anchor) {
    if (isUsableTarget(anchor.target)) return true;
    anchor.target = null;
    anchor.pointRange = null;
    if (!anchor.selector) return false;

    let element = null;
    try { element = document.querySelector(anchor.selector); } catch (_) {}
    if (!isUsableTarget(element)) return false;

    anchor.target = element;
    const rect = element.getBoundingClientRect();
    anchor.relativeX = Math.max(0, Math.min((anchor.relativeXRatio || 0) * rect.width, Math.max(0, rect.width)));
    anchor.relativeY = Math.max(0, Math.min((anchor.relativeYRatio || 0) * rect.height, Math.max(0, rect.height)));

    const node = nodeFromPath(element, anchor.nodePath);
    if (node) {
      const range = document.createRange();
      try {
        const maxOffset = node.nodeType === Node.TEXT_NODE ? node.data.length : node.childNodes.length;
        const safeOffset = Math.max(0, Math.min(Number(anchor.nodeOffset) || 0, maxOffset));
        range.setStart(node, safeOffset);
        range.collapse(true);
        anchor.pointRange = range;
        if (!Number.isFinite(anchor.textOffset)) {
          anchor.textOffset = textOffsetWithin(element, node, safeOffset);
        }
      } catch (_) {}
    }
    return true;
  }

  function textOffsetWithin(root, node, offset) {
    if (!root || !node || !root.contains(node)) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let total = 0;
    let current;
    while ((current = walker.nextNode())) {
      if (current === node) return total + Math.max(0, Math.min(Number(offset) || 0, current.data.length));
      total += current.data.length;
    }
    return null;
  }

  function rangeFromTextOffset(root, textOffset) {
    if (!root || !Number.isFinite(textOffset)) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let remaining = Math.max(0, textOffset);
    let current;
    let last = null;
    while ((current = walker.nextNode())) {
      last = current;
      if (remaining <= current.data.length) {
        const range = document.createRange();
        range.setStart(current, remaining);
        range.collapse(true);
        return range;
      }
      remaining -= current.data.length;
    }
    if (last) {
      const range = document.createRange();
      range.setStart(last, last.data.length);
      range.collapse(true);
      return range;
    }
    return null;
  }

  function freshPointRange(anchor) {
    restoreReference(anchor);
    if (!isUsableTarget(anchor.target)) return null;

    if (Number.isFinite(anchor.textOffset)) {
      try {
        const range = rangeFromTextOffset(anchor.target, anchor.textOffset);
        if (range) return range;
      } catch (_) {}
    }

    const node = nodeFromPath(anchor.target, anchor.nodePath);
    if (node) {
      try {
        const range = document.createRange();
        const maxOffset = node.nodeType === Node.TEXT_NODE ? node.data.length : node.childNodes.length;
        range.setStart(node, Math.max(0, Math.min(Number(anchor.nodeOffset) || 0, maxOffset)));
        range.collapse(true);
        return range;
      } catch (_) {}
    }

    return anchor.pointRange || null;
  }

  function clippingRectFor(element) {
    let left = 0;
    let top = 0;
    let right = window.innerWidth;
    let bottom = window.innerHeight;
    let current = element && element.parentElement;

    while (current && current !== document.documentElement) {
      const style = getComputedStyle(current);
      const clipsX = /(auto|scroll|hidden|clip|overlay)/.test(style.overflowX);
      const clipsY = /(auto|scroll|hidden|clip|overlay)/.test(style.overflowY);
      if (clipsX || clipsY) {
        const rect = current.getBoundingClientRect();
        if (clipsX) {
          left = Math.max(left, rect.left);
          right = Math.min(right, rect.right);
        }
        if (clipsY) {
          top = Math.max(top, rect.top);
          bottom = Math.min(bottom, rect.bottom);
        }
      }
      current = current.parentElement;
    }
    return { left, top, right, bottom };
  }

  function markerIsActuallyVisible(anchor, rect) {
    if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top)) return false;
    const clip = clippingRectFor(anchor.target || targetFromRange(anchor.pointRange));
    const pad = 2;
    return rect.left >= clip.left - pad && rect.left <= clip.right + pad &&
      rect.top >= clip.top - pad && rect.top <= clip.bottom + pad;
  }

  function anchorRect(anchor) {
    restoreReference(anchor);
    const freshRange = freshPointRange(anchor);
    if (freshRange && isUsableTarget(targetFromRange(freshRange))) {
      try {
        const rect = freshRange.getBoundingClientRect();
        if (Number.isFinite(rect.left) && Number.isFinite(rect.top)) {
          anchor.pointRange = freshRange;
          return { left: rect.left, top: rect.top };
        }
      } catch (_) {}
    }

    if (isUsableTarget(anchor.target)) {
      const rect = anchor.target.getBoundingClientRect();
      return { left: rect.left + anchor.relativeX, top: rect.top + anchor.relativeY };
    }

    return {
      left: (anchor.fallbackDocX || 0) - window.scrollX,
      top: (anchor.fallbackDocY || 0) - window.scrollY
    };
  }

  function scheduleMarkerUpdate() {
    if (state.markerFrame) return;
    state.markerFrame = requestAnimationFrame(() => {
      state.markerFrame = 0;
      updateMarkers();
    });
  }

  function updateMarkers() {
    for (const anchor of state.anchors) {
      if (!anchor.marker) createMarker(anchor);
      const rect = anchorRect(anchor);
      const visible = markerIsActuallyVisible(anchor, rect);
      anchor.marker.style.display = visible ? 'block' : 'none';
      anchor.marker.style.left = `${Math.round(rect.left - 12)}px`;
      anchor.marker.style.top = `${Math.round(rect.top - 25)}px`;
    }
  }

  function updateDock() {
    const hasAnchors = state.anchors.length > 0;
    go.disabled = !hasAnchors;
    go.classList.toggle('ready', hasAnchors);
    count.textContent = hasAnchors ? String(state.anchors.length) : '';
    const active = state.anchors.find((a) => a.id === state.activeId);
    go.title = active ? `Return to ${active.title || `Anchor ${active.order + 1}`}` : 'Return to active anchor';
    notesToggle.setAttribute('aria-expanded', state.panelOpen ? 'true' : 'false');
    panel.classList.toggle('open', state.panelOpen);
  }

  function setPanelOpen(open) {
    state.panelOpen = Boolean(open);
    updateDock();
  }

  function activeAnchor() {
    return state.anchors.find((a) => a.id === state.activeId) || state.anchors[state.anchors.length - 1] || null;
  }

  function setActive(id, rerender = true) {
    if (!state.anchors.some((a) => a.id === id)) return;
    state.activeId = id;
    if (rerender) {
      renderList();
    } else {
      for (const card of list.querySelectorAll('.card')) card.classList.toggle('active', card.dataset.id === id);
    }
    updateDock();
  }

  function serializeAnchor(anchor) {
    return {
      id: anchor.id,
      order: anchor.order,
      title: anchor.title,
      note: anchor.note,
      createdAt: anchor.createdAt,
      updatedAt: anchor.updatedAt,
      selector: anchor.selector,
      nodePath: anchor.nodePath,
      nodeOffset: anchor.nodeOffset,
      textOffset: anchor.textOffset,
      relativeXRatio: anchor.relativeXRatio,
      relativeYRatio: anchor.relativeYRatio,
      fallbackDocX: anchor.fallbackDocX,
      fallbackDocY: anchor.fallbackDocY
    };
  }

  function currentPageRecord() {
    if (pageKeyNow() === PAGE_KEY) {
      state.livePageMeta.pageTitle = document.title || state.livePageMeta.pageTitle || 'Untitled page';
      state.livePageMeta.pageUrl = location.href.split('#')[0];
    }
    return {
      pageKey: PAGE_KEY,
      pageTitle: state.livePageMeta.pageTitle || 'Untitled page',
      pageUrl: state.livePageMeta.pageUrl || PAGE_KEY,
      updatedAt: new Date().toISOString(),
      anchors: state.anchors.map(serializeAnchor)
    };
  }

  function pageRecord(pageKey) {
    if (pageKey === PAGE_KEY) return currentPageRecord();
    return state.pages[pageKey] || null;
  }

  function sortedPageRecords() {
    const pages = Object.values(state.pages || {}).filter((page) => page && Array.isArray(page.anchors));
    const currentExists = pages.some((page) => page.pageKey === PAGE_KEY);
    if (!currentExists) pages.unshift(currentPageRecord());
    return pages.sort((a, b) => {
      if (a.pageKey === PAGE_KEY && b.pageKey !== PAGE_KEY) return -1;
      if (b.pageKey === PAGE_KEY && a.pageKey !== PAGE_KEY) return 1;
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    });
  }

  function persistSoon() {
    saved.textContent = 'Saving locally…';
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(persistNow, 320);
  }

  async function persistNow() {
    if (state.destroyed) return;
    clearTimeout(state.saveTimer);
    if (state.anchors.length) state.pages[PAGE_KEY] = currentPageRecord();
    else delete state.pages[PAGE_KEY];
    const payload = {
      version: 2,
      updatedAt: new Date().toISOString(),
      pages: state.pages
    };
    try {
      await chrome.storage.local.set({ [WORKSPACE_KEY]: payload });
      saved.textContent = `${Object.keys(state.pages).length} page${Object.keys(state.pages).length === 1 ? '' : 's'} saved locally · no cloud sync`;
      renderPageTabs();
      renderPageContext();
    } catch (_) {
      saved.textContent = 'Could not save locally';
    }
  }

  async function persistWorkspaceOnly() {
    if (state.destroyed) return;
    clearTimeout(state.workspaceSaveTimer);
    if (state.anchors.length) state.pages[PAGE_KEY] = currentPageRecord();
    const payload = {
      version: 2,
      updatedAt: new Date().toISOString(),
      pages: state.pages
    };
    try {
      await chrome.storage.local.set({ [WORKSPACE_KEY]: payload });
      saved.textContent = `${Object.keys(state.pages).length} page${Object.keys(state.pages).length === 1 ? '' : 's'} saved locally · no cloud sync`;
      renderPageTabs();
      renderPageContext();
    } catch (_) {
      saved.textContent = 'Could not save locally';
    }
  }

  function persistWorkspaceSoon() {
    saved.textContent = 'Saving notebook locally…';
    clearTimeout(state.workspaceSaveTimer);
    state.workspaceSaveTimer = setTimeout(persistWorkspaceOnly, 320);
  }

  function hydrateLiveAnchors(rawAnchors) {
    state.anchors = (Array.isArray(rawAnchors) ? rawAnchors : []).map((raw, index) => ({
      id: String(raw.id || makeId()),
      order: index,
      title: String(raw.title || `Anchor ${index + 1}`),
      note: String(raw.note || ''),
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
      selector: String(raw.selector || ''),
      nodePath: Array.isArray(raw.nodePath) ? raw.nodePath : [],
      nodeOffset: Number(raw.nodeOffset) || 0,
      textOffset: Number.isFinite(Number(raw.textOffset)) ? Number(raw.textOffset) : null,
      relativeXRatio: Number(raw.relativeXRatio) || 0,
      relativeYRatio: Number(raw.relativeYRatio) || 0,
      fallbackDocX: Number(raw.fallbackDocX) || 0,
      fallbackDocY: Number(raw.fallbackDocY) || 0,
      relativeX: 0,
      relativeY: 0,
      pointRange: null,
      target: null,
      marker: null,
      markerLabel: null
    }));
  }

  async function loadSaved() {
    try {
      const all = await chrome.storage.local.get(null);
      const workspace = all && all[WORKSPACE_KEY];
      state.pages = workspace && workspace.pages && typeof workspace.pages === 'object' ? workspace.pages : {};

      let migrated = false;
      const legacyKeys = [];
      for (const [key, payload] of Object.entries(all || {})) {
        if (!key.startsWith(LEGACY_PREFIX) || !payload || !Array.isArray(payload.anchors)) continue;
        legacyKeys.push(key);
        const legacyPageKey = key.slice(LEGACY_PREFIX.length);
        if (!state.pages[legacyPageKey] && payload.anchors.length) {
          state.pages[legacyPageKey] = {
            pageKey: legacyPageKey,
            pageTitle: String(payload.pageTitle || 'Saved page'),
            pageUrl: String(payload.pageUrl || legacyPageKey),
            updatedAt: payload.updatedAt || new Date().toISOString(),
            anchors: payload.anchors
          };
          migrated = true;
        }
      }

      state.livePageMeta = { pageKey: PAGE_KEY, pageTitle: document.title || 'Untitled page', pageUrl: location.href.split('#')[0] };
      const current = state.pages[PAGE_KEY];
      hydrateLiveAnchors(current && current.anchors);
      for (const anchor of state.anchors) {
        restoreReference(anchor);
        createMarker(anchor);
      }
      state.activeId = state.anchors.length ? state.anchors[state.anchors.length - 1].id : null;
      state.selectedPageKey = PAGE_KEY;
      if (migrated) await persistWorkspaceOnly();
      for (const legacyKey of legacyKeys) {
        try { await chrome.storage.local.remove(legacyKey); } catch (_) {}
      }
    } catch (_) {
      state.pages = {};
      hydrateLiveAnchors([]);
    }
  }

  async function handlePageChangeIfNeeded() {
    const nextKey = pageKeyNow();
    if (nextKey === PAGE_KEY || state.destroyed) return;

    clearTimeout(state.saveTimer);
    clearTimeout(state.workspaceSaveTimer);
    if (state.anchors.length) state.pages[PAGE_KEY] = currentPageRecord();
    else delete state.pages[PAGE_KEY];

    for (const anchor of state.anchors) removeMarker(anchor);

    PAGE_KEY = nextKey;
    state.livePageMeta = {
      pageKey: PAGE_KEY,
      pageTitle: document.title || 'Untitled page',
      pageUrl: location.href.split('#')[0]
    };
    const nextPage = state.pages[PAGE_KEY];
    hydrateLiveAnchors(nextPage && nextPage.anchors);
    for (const anchor of state.anchors) {
      restoreReference(anchor);
      createMarker(anchor);
    }
    state.activeId = state.anchors.length ? state.anchors[state.anchors.length - 1].id : null;
    state.selectedPageKey = PAGE_KEY;
    renderPageTabs();
    renderPageContext();
    renderList();
    updateDock();
    updateMarkers();
    await persistWorkspaceOnly();
    announce(state.anchors.length ? `${state.anchors.length} saved anchor${state.anchors.length === 1 ? '' : 's'} loaded for this page` : 'New page · drag the pin to add an anchor');
    setTimeout(() => {
      for (const anchor of state.anchors) restoreReference(anchor);
      updateMarkers();
    }, 650);
  }

  function makeAnchorAt(clientX, clientY) {
    state.selectedPageKey = PAGE_KEY;
    const oldPointerEvents = host.style.pointerEvents;
    host.style.pointerEvents = 'none';

    const pointRange = rangeAtPoint(clientX, clientY);
    let element = pointRange ? targetFromRange(pointRange) : document.elementFromPoint(clientX, clientY);
    if (!isUsableTarget(element)) element = null;

    host.style.pointerEvents = oldPointerEvents || 'auto';

    const order = state.anchors.length;
    const anchor = {
      id: makeId(),
      order,
      title: `Anchor ${order + 1}`,
      note: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pointRange,
      target: element,
      relativeX: 0,
      relativeY: 0,
      relativeXRatio: 0,
      relativeYRatio: 0,
      selector: element ? selectorFor(element) : '',
      nodePath: [],
      nodeOffset: 0,
      textOffset: null,
      fallbackDocX: clientX + window.scrollX,
      fallbackDocY: clientY + window.scrollY,
      marker: null,
      markerLabel: null
    };

    if (element) {
      const rect = element.getBoundingClientRect();
      anchor.relativeX = Math.max(0, Math.min(clientX - rect.left, Math.max(0, rect.width)));
      anchor.relativeY = Math.max(0, Math.min(clientY - rect.top, Math.max(0, rect.height)));
      anchor.relativeXRatio = rect.width > 0 ? anchor.relativeX / rect.width : 0;
      anchor.relativeYRatio = rect.height > 0 ? anchor.relativeY / rect.height : 0;
      if (pointRange && pointRange.startContainer) {
        anchor.nodePath = nodePathFrom(element, pointRange.startContainer);
        anchor.nodeOffset = pointRange.startOffset || 0;
        anchor.textOffset = textOffsetWithin(element, pointRange.startContainer, pointRange.startOffset || 0);
      }
    }

    state.anchors.push(anchor);
    state.activeId = anchor.id;
    createMarker(anchor);
    updateMarkers();
    renderList();
    updateDock();
    setPanelOpen(true);
    persistSoon();
    announce(`Anchor ${order + 1} set`);
  }

  function scrollReferenceIntoView(anchor) {
    restoreReference(anchor);
    const currentRange = freshPointRange(anchor);
    if (currentRange) anchor.pointRange = currentRange;
    let element = targetFromRange(currentRange);
    if (!isUsableTarget(element)) element = anchor.target;
    if (isUsableTarget(element)) {
      try {
        element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
        return true;
      } catch (_) {}
    }
    if (Number.isFinite(anchor.fallbackDocY)) {
      window.scrollTo({ top: anchor.fallbackDocY, left: anchor.fallbackDocX || 0, behavior: 'auto' });
    }
    return false;
  }

  function correctionScroll(anchor) {
    const rect = anchorRect(anchor);
    const desiredY = Math.max(90, Math.min(window.innerHeight * 0.33, 260));
    const desiredX = Math.max(35, Math.min(window.innerWidth * 0.25, 220));
    const deltaY = rect.top - desiredY;
    const deltaX = rect.left - desiredX;

    restoreReference(anchor);
    const currentRange = freshPointRange(anchor);
    if (currentRange) anchor.pointRange = currentRange;
    let element = targetFromRange(currentRange);
    if (!isUsableTarget(element)) element = anchor.target;

    let scroller = element ? element.parentElement : null;
    while (scroller && scroller !== document.body && scroller !== document.documentElement) {
      const style = getComputedStyle(scroller);
      const canY = /(auto|scroll|overlay)/.test(style.overflowY) && scroller.scrollHeight > scroller.clientHeight + 1;
      const canX = /(auto|scroll|overlay)/.test(style.overflowX) && scroller.scrollWidth > scroller.clientWidth + 1;
      if (canY || canX) {
        if (canY && Math.abs(deltaY) > 2) scroller.scrollTop += deltaY;
        if (canX && Math.abs(deltaX) > 2) scroller.scrollLeft += deltaX;
        return;
      }
      scroller = scroller.parentElement;
    }

    if (Math.abs(deltaY) > 2 || Math.abs(deltaX) > 2) window.scrollBy({ top: deltaY, left: deltaX, behavior: 'auto' });
  }

  function pulseMarker(anchor) {
    if (!anchor.marker) return;
    anchor.marker.style.display = 'block';
    if (typeof anchor.marker.animate === 'function') {
      anchor.marker.animate(
        [
          { transform: 'rotate(-45deg) scale(1)' },
          { transform: 'rotate(-45deg) scale(1.6)' },
          { transform: 'rotate(-45deg) scale(1)' }
        ],
        { duration: 430, easing: 'ease-out' }
      );
    }
  }

  function jumpToAnchor(anchor) {
    if (!anchor) return;
    setActive(anchor.id, true);
    const usedReference = scrollReferenceIntoView(anchor);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (usedReference) correctionScroll(anchor);
        updateMarkers();
        pulseMarker(anchor);
        announce(`Returned to ${anchor.title || `Anchor ${anchor.order + 1}`}`);
      });
    });
  }

  function deleteAnchor(id) {
    const index = state.anchors.findIndex((a) => a.id === id);
    if (index < 0) return;
    const [anchor] = state.anchors.splice(index, 1);
    removeMarker(anchor);
    state.anchors.forEach((item, order) => { item.order = order; });
    if (state.activeId === id) state.activeId = state.anchors[index]?.id || state.anchors[index - 1]?.id || null;
    refreshMarkerLabels();
    renderList();
    updateDock();
    persistSoon();
    announce('Anchor deleted');
  }

  function moveAnchor(id, direction) {
    const index = state.anchors.findIndex((a) => a.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= state.anchors.length) return;
    [state.anchors[index], state.anchors[next]] = [state.anchors[next], state.anchors[index]];
    state.anchors.forEach((item, order) => { item.order = order; });
    refreshMarkerLabels();
    renderList();
    persistSoon();
  }

  function refreshMarkerLabels() {
    for (const anchor of state.anchors) {
      if (anchor.marker) anchor.marker.style.background = colorForIndex(anchor.order);
      if (anchor.markerLabel) anchor.markerLabel.textContent = String(anchor.order + 1);
    }
  }

  function formatTime(iso) {
    try { return new Date(iso).toLocaleString(); } catch (_) { return ''; }
  }

  function titleForPage(page) {
    const title = String(page && page.pageTitle || 'Untitled page').trim();
    return title || 'Untitled page';
  }

  function renderPageTabs() {
    pageStrip.replaceChildren();
    for (const page of sortedPageRecords()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `page-tab${page.pageKey === state.selectedPageKey ? ' selected' : ''}${page.pageKey === PAGE_KEY ? ' current' : ''}`;
      button.title = `${titleForPage(page)}\n${page.pageUrl || ''}`;
      const name = document.createElement('span');
      name.className = 'page-tab-name';
      name.textContent = titleForPage(page);
      const badge = document.createElement('span');
      badge.className = 'page-tab-count';
      badge.textContent = String(Array.isArray(page.anchors) ? page.anchors.length : 0);
      button.append(name, badge);
      button.addEventListener('click', () => {
        state.selectedPageKey = page.pageKey;
        renderPageTabs();
        renderPageContext();
        renderList();
      });
      pageStrip.appendChild(button);
    }
  }

  function selectedPage() {
    return pageRecord(state.selectedPageKey) || currentPageRecord();
  }

  function renderPageContext() {
    pageContext.replaceChildren();
    const page = selectedPage();
    const copy = document.createElement('div');
    copy.className = 'page-context-copy';
    const title = document.createElement('strong');
    title.textContent = titleForPage(page);
    const sub = document.createElement('span');
    const count = Array.isArray(page.anchors) ? page.anchors.length : 0;
    sub.textContent = `${page.pageKey === PAGE_KEY ? 'Current page' : 'Saved page'} · ${count} anchor${count === 1 ? '' : 's'}`;
    copy.append(title, sub);
    pageContext.appendChild(copy);

    if (page.pageKey !== PAGE_KEY) {
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'context-btn';
      open.textContent = 'Open page ↗';
      open.title = page.pageUrl || '';
      open.addEventListener('click', () => {
        if (page.pageUrl) location.href = page.pageUrl;
      });
      pageContext.appendChild(open);
    }
  }

  function archivedPageAnchors(page) {
    return Array.isArray(page && page.anchors) ? page.anchors : [];
  }

  function renderList() {
    list.replaceChildren();
    const isCurrent = state.selectedPageKey === PAGE_KEY;
    const page = selectedPage();
    const anchors = isCurrent ? state.anchors : archivedPageAnchors(page);

    if (!anchors.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = isCurrent
        ? 'Drag the ⌖ pin onto any point on this page. This page will then be added to your notebook.'
        : 'This saved page has no anchors.';
      list.appendChild(empty);
      return;
    }

    anchors.forEach((anchor, index) => {
      if (!Number.isFinite(anchor.order)) anchor.order = index;
      const card = document.createElement('article');
      card.className = `card${isCurrent && anchor.id === state.activeId ? ' active' : ''}${isCurrent ? '' : ' archived'}`;
      card.dataset.id = anchor.id;

      const head = document.createElement('div');
      head.className = 'card-head';

      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.style.background = colorForIndex(index);
      badge.textContent = String(index + 1);
      if (isCurrent) {
        badge.title = 'Click to make this the active return anchor';
        badge.addEventListener('click', () => setActive(anchor.id, true));
      }

      const title = document.createElement('input');
      title.className = 'title-input';
      title.type = 'text';
      title.value = String(anchor.title || `Anchor ${index + 1}`);
      title.maxLength = 120;
      title.setAttribute('aria-label', `Title for anchor ${index + 1}`);
      if (isCurrent) title.addEventListener('focus', () => setActive(anchor.id, false));
      title.addEventListener('input', () => {
        anchor.title = title.value.slice(0, 120);
        anchor.updatedAt = new Date().toISOString();
        if (isCurrent) {
          updateDock();
          persistSoon();
        } else {
          page.updatedAt = new Date().toISOString();
          persistWorkspaceSoon();
        }
      });

      const actions = document.createElement('div');
      actions.className = 'mini-actions';
      if (isCurrent) {
        const up = document.createElement('button');
        up.className = 'mini';
        up.type = 'button';
        up.textContent = '↑';
        up.title = 'Move up';
        up.disabled = index === 0;
        up.addEventListener('click', () => moveAnchor(anchor.id, -1));
        const down = document.createElement('button');
        down.className = 'mini';
        down.type = 'button';
        down.textContent = '↓';
        down.title = 'Move down';
        down.disabled = index === anchors.length - 1;
        down.addEventListener('click', () => moveAnchor(anchor.id, 1));
        const del = document.createElement('button');
        del.className = 'mini';
        del.type = 'button';
        del.textContent = '×';
        del.title = 'Delete anchor';
        del.addEventListener('click', () => deleteAnchor(anchor.id));
        actions.append(up, down, del);
      }

      head.append(badge, title, actions);

      const note = document.createElement('textarea');
      note.value = String(anchor.note || '');
      note.placeholder = 'Write a comment, thought, question, or note about this point…';
      note.maxLength = 20000;
      note.setAttribute('aria-label', `Note for anchor ${index + 1}`);
      if (isCurrent) note.addEventListener('focus', () => setActive(anchor.id, false));
      note.addEventListener('input', () => {
        anchor.note = note.value.slice(0, 20000);
        anchor.updatedAt = new Date().toISOString();
        if (isCurrent) persistSoon();
        else {
          page.updatedAt = new Date().toISOString();
          persistWorkspaceSoon();
        }
      });

      const meta = document.createElement('div');
      meta.className = 'meta';
      const time = document.createElement('span');
      time.textContent = formatTime(anchor.createdAt);
      const action = document.createElement('button');
      action.className = 'jump-link';
      action.type = 'button';
      if (isCurrent) {
        action.textContent = '↩ Jump';
        action.addEventListener('click', () => jumpToAnchor(anchor));
      } else {
        action.textContent = 'Open page ↗';
        action.addEventListener('click', () => { if (page.pageUrl) location.href = page.pageUrl; });
      }
      meta.append(time, action);

      card.append(head, note, meta);
      list.appendChild(card);
    });
  }

  function markdownForPage(page) {
    const anchors = page.pageKey === PAGE_KEY ? state.anchors : archivedPageAnchors(page);
    const lines = [
      `# ${titleForPage(page)}`,
      '',
      `- Source: ${page.pageUrl || ''}`,
      `- Exported: ${new Date().toISOString()}`,
      `- Anchors: ${anchors.length}`,
      ''
    ];
    anchors.forEach((anchor, index) => {
      lines.push(`## ${index + 1}. ${anchor.title || `Anchor ${index + 1}`}`);
      lines.push('');
      lines.push(`Created: ${anchor.createdAt || ''}`);
      lines.push('');
      if (String(anchor.note || '').trim()) lines.push(String(anchor.note).trim());
      else lines.push('_No note added._');
      lines.push('');
    });
    return lines.join('\n');
  }

  function markdownForNotebook() {
    const pages = sortedPageRecords().filter((page) => Array.isArray(page.anchors) && page.anchors.length);
    const lines = [
      '# Instant Anchor Notebook',
      '',
      `Exported: ${new Date().toISOString()}`,
      `Pages: ${pages.length}`,
      ''
    ];
    pages.forEach((page, pageIndex) => {
      lines.push(`# ${pageIndex + 1}. ${titleForPage(page)}`);
      lines.push('');
      lines.push(`Source: ${page.pageUrl || ''}`);
      lines.push(`Anchors: ${page.anchors.length}`);
      lines.push('');
      page.anchors.forEach((anchor, index) => {
        lines.push(`## ${pageIndex + 1}.${index + 1} ${anchor.title || `Anchor ${index + 1}`}`);
        lines.push('');
        if (String(anchor.note || '').trim()) lines.push(String(anchor.note).trim());
        else lines.push('_No note added._');
        lines.push('');
      });
      lines.push('---');
      lines.push('');
    });
    return lines.join('\n');
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.documentElement.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function safeFilenameFromTitle(title, suffix = 'Anchors') {
    const base = String(title || 'page-notes').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'page-notes';
    const day = new Date().toISOString().slice(0, 10);
    return `${base} - ${suffix} ${day}`;
  }

  function exportMarkdown() {
    const page = selectedPage();
    downloadText(`${safeFilenameFromTitle(titleForPage(page))}.md`, markdownForPage(page), 'text/markdown;charset=utf-8');
    announce('Selected page note exported');
  }

  function exportWholeNotebook() {
    downloadText(`${safeFilenameFromTitle('Instant Anchor Notebook', 'Export')}.md`, markdownForNotebook(), 'text/markdown;charset=utf-8');
    announce('Whole notebook exported');
  }

  function exportBackup() {
    if (state.anchors.length) state.pages[PAGE_KEY] = currentPageRecord();
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      pages: state.pages
    };
    downloadText(`${safeFilenameFromTitle('Instant Anchor Notebook', 'Backup')}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    announce('Notebook JSON backup exported');
  }

  function pageKeyFromUrl(url) {
    try {
      const parsed = new URL(String(url || ''), location.href);
      return `${parsed.origin}${parsed.pathname}${parsed.search}`;
    } catch (_) {
      return '';
    }
  }

  async function importBackupFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      let imported = 0;

      if (payload && payload.pages && typeof payload.pages === 'object') {
        for (const [key, page] of Object.entries(payload.pages)) {
          if (!page || !Array.isArray(page.anchors)) continue;
          const pageKey = String(page.pageKey || key || pageKeyFromUrl(page.pageUrl));
          if (!pageKey) continue;
          state.pages[pageKey] = {
            pageKey,
            pageTitle: String(page.pageTitle || 'Imported page'),
            pageUrl: String(page.pageUrl || pageKey),
            updatedAt: page.updatedAt || new Date().toISOString(),
            anchors: page.anchors
          };
          imported += 1;
        }
      } else if (payload && Array.isArray(payload.anchors)) {
        const pageKey = pageKeyFromUrl(payload.pageUrl) || String(payload.pageUrl || '');
        if (!pageKey) throw new Error('Missing page URL');
        state.pages[pageKey] = {
          pageKey,
          pageTitle: String(payload.pageTitle || 'Imported page'),
          pageUrl: String(payload.pageUrl || pageKey),
          updatedAt: payload.updatedAt || payload.exportedAt || new Date().toISOString(),
          anchors: payload.anchors
        };
        imported = 1;
      } else {
        throw new Error('Unrecognized backup');
      }

      if (state.pages[PAGE_KEY]) {
        for (const anchor of state.anchors) removeMarker(anchor);
        hydrateLiveAnchors(state.pages[PAGE_KEY].anchors);
        for (const anchor of state.anchors) {
          restoreReference(anchor);
          createMarker(anchor);
        }
        state.activeId = state.anchors.length ? state.anchors[state.anchors.length - 1].id : null;
      }
      state.selectedPageKey = PAGE_KEY;
      await persistWorkspaceOnly();
      renderPageTabs();
      renderPageContext();
      renderList();
      updateDock();
      updateMarkers();
      announce(`${imported} page${imported === 1 ? '' : 's'} imported locally`);
    } catch (_) {
      announce('Could not import this backup');
    }
  }

  async function clearEverything() {
    const selectedKey = state.selectedPageKey;
    const page = selectedPage();
    const now = Date.now();
    if (now > state.pageDeleteArmedUntil) {
      state.pageDeleteArmedUntil = now + 3500;
      clearAll.textContent = 'Confirm delete page';
      announce(`Click again to delete ${titleForPage(page)}`);
      setTimeout(() => {
        if (Date.now() > state.pageDeleteArmedUntil) clearAll.textContent = 'Delete page';
      }, 3600);
      return;
    }

    state.pageDeleteArmedUntil = 0;
    clearAll.textContent = 'Delete page';
    if (selectedKey === PAGE_KEY) {
      for (const anchor of state.anchors) removeMarker(anchor);
      state.anchors = [];
      state.activeId = null;
    }
    delete state.pages[selectedKey];
    state.selectedPageKey = PAGE_KEY;
    renderPageTabs();
    renderPageContext();
    renderList();
    updateDock();
    await persistWorkspaceOnly();
    announce('Saved page deleted from notebook');
  }

  function startDrag(event) {
    if (event.button !== 0) return;
    if (state.selectedPageKey !== PAGE_KEY) {
      state.selectedPageKey = PAGE_KEY;
      renderPageTabs();
      renderPageContext();
      renderList();
    }
    state.dragging = true;
    state.didDrag = false;
    pin.classList.add('dragging');
    ghost.classList.add('show');
    ghost.style.left = `${event.clientX}px`;
    ghost.style.top = `${event.clientY}px`;
    try { pin.setPointerCapture(event.pointerId); } catch (_) {}
    event.preventDefault();
  }

  function moveDrag(event) {
    if (!state.dragging) return;
    state.didDrag = true;
    ghost.style.left = `${event.clientX}px`;
    ghost.style.top = `${event.clientY}px`;
    event.preventDefault();
  }

  function finishDrag(event) {
    if (!state.dragging) return;
    state.dragging = false;
    pin.classList.remove('dragging');
    ghost.classList.remove('show');
    try { pin.releasePointerCapture(event.pointerId); } catch (_) {}

    const dockRect = shadow.querySelector('.dock').getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const inRect = (rect) => event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    const droppedOnUi = inRect(dockRect) || (state.panelOpen && inRect(panelRect));
    if (!droppedOnUi && state.didDrag) makeAnchorAt(event.clientX, event.clientY);
    event.preventDefault();
  }

  pin.addEventListener('pointerdown', startDrag);
  pin.addEventListener('pointermove', moveDrag);
  pin.addEventListener('pointerup', finishDrag);
  pin.addEventListener('pointercancel', finishDrag);
  pin.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      makeAnchorAt(window.innerWidth / 2, window.innerHeight / 2);
    }
  });

  go.addEventListener('click', () => jumpToAnchor(activeAnchor()));
  notesToggle.addEventListener('click', () => setPanelOpen(!state.panelOpen));
  closePanel.addEventListener('click', () => setPanelOpen(false));
  exportMd.addEventListener('click', exportMarkdown);
  exportNotebook.addEventListener('click', exportWholeNotebook);
  exportJson.addEventListener('click', exportBackup);
  importJson.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', () => {
    const file = importFile.files && importFile.files[0];
    importBackupFile(file);
    importFile.value = '';
  });
  clearAll.addEventListener('click', clearEverything);

  window.addEventListener('resize', scheduleMarkerUpdate, { passive: true });
  window.addEventListener('scroll', scheduleMarkerUpdate, { passive: true, capture: true });
  document.addEventListener('scroll', scheduleMarkerUpdate, { passive: true, capture: true });

  const api = {
    show() {
      host.style.display = '';
      setPanelOpen(true);
      announce(state.anchors.length ? `${state.anchors.length} anchor${state.anchors.length === 1 ? '' : 's'} loaded` : 'Drag the pin onto the page');
    },
    destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      clearTimeout(state.tipTimer);
      clearTimeout(state.saveTimer);
      clearTimeout(state.workspaceSaveTimer);
      if (state.urlWatchTimer) clearInterval(state.urlWatchTimer);
      if (state.markerFrame) cancelAnimationFrame(state.markerFrame);
      window.removeEventListener('resize', scheduleMarkerUpdate);
      window.removeEventListener('scroll', scheduleMarkerUpdate, true);
      document.removeEventListener('scroll', scheduleMarkerUpdate, true);
      for (const anchor of state.anchors) removeMarker(anchor);
      host.remove();
      delete window[INSTANCE_KEY];
    }
  };

  window[INSTANCE_KEY] = api;

  (async () => {
    await loadSaved();
    state.urlWatchTimer = setInterval(handlePageChangeIfNeeded, 650);
    renderPageTabs();
    renderPageContext();
    renderList();
    updateDock();
    updateMarkers();
    if (state.anchors.length) announce(`${state.anchors.length} saved anchor${state.anchors.length === 1 ? '' : 's'} loaded`);
    else announce('Drag the pin onto the page');
    setTimeout(() => {
      for (const anchor of state.anchors) restoreReference(anchor);
      updateMarkers();
    }, 700);
    setTimeout(() => {
      for (const anchor of state.anchors) restoreReference(anchor);
      updateMarkers();
    }, 1800);
  })();
})();
