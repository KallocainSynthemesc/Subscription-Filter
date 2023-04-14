(function() {
  var channel;
  var config;
  if (window.hasRun) {
    return;
  }
  window.hasRun = true;
	
  chrome.runtime.onMessage.addListener(
  function(request) {
    if (request.command == "save") {
		channel = request.channel;
		chrome.storage.local.set({[channel.channelName]: channel}, function() {
			console.log("Channel stored");
		});
	
    }else if(request.command == "remove")
	{
		channel = request.channel;
		chrome.storage.local.remove([channel.channelName], function() {
			console.log("Channel removed");
		});
	}
    else if(request.command == "saveConfig")
	{
		config = request.config;
		chrome.storage.local.set({[config.name]: config}, function() {
			console.log("Config stored");
		});
	}
  });
  

})();
