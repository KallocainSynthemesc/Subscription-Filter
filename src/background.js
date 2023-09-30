var msgPort;

//Used to find out when popup gets closed to refresh the subscriber page.
function connected(prt) {
    msgPort = prt;
    msgPort.onDisconnect.addListener(refreshPage);
    console.log('background: Port connected');
}

function refreshPage()
{
    console.log("background: Refresh page");
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0]) {
          const tabId = tabs[0].id;
          chrome.tabs.reload(tabId, { bypassCache: false });
          console.log(`Background: Reloading tab ${tabId}`);
        } else {
          console.error('Background: Unable to find the current active tab.');
        }
    });
}

chrome.runtime.onConnect.addListener(connected);
