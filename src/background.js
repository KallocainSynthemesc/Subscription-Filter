var msgPort;

chrome.runtime.onMessage.addListener(
    function(request) {
    if(request.message == "subscriptions")
    {
        var channel = request.channel;
        persistChannelObjectsInLocalStore(channel, true);
    }
});


function persistChannelObjectsInLocalStore(channel, sendMessage) {
    chrome.storage.local.set(channel, function() {
        console.log('Channels stored');
        if(sendMessage)
        {
            doneSaving();
        }
    });
}

//Used to find out when popup gets closed to refresh the subscriber page.
function connected(prt) {
    msgPort = prt;
    msgPort.onDisconnect.addListener(refreshPage);
    console.log('background: Port connected');
}

function refreshPage()
{
    console.log("background: Refresh page");
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {command: 'refresh'});
    });
}

function doneSaving()
{
    console.log("background: done-saving");
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {command: 'saveDone'});
    });
}

chrome.runtime.onConnect.addListener(connected);
