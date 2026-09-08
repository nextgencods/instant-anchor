'use strict';

async function injectIntoActiveTab(tab) {
  if (!tab || !tab.id) return;
  const url = tab.url || '';
  if (!/^https?:\/\//i.test(url)) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (_) {
    // Restricted browser pages (chrome://, Web Store, etc.) cannot be scripted.
  }
}

chrome.action.onClicked.addListener(injectIntoActiveTab);

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'activate-anchor') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await injectIntoActiveTab(tab);
});
