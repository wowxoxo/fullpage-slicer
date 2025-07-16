chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "capture") {
      chrome.tabs.captureVisibleTab(null, { format: "png" }, sendResponse);
      return true; // keep async
    }
  });
  