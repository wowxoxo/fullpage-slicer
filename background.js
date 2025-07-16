chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  });
  
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "capture") {
      chrome.tabs.captureVisibleTab(null, { format: "png" }, sendResponse);
      return true;
    }
  });
  