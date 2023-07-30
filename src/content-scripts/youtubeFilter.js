var saveObj = {};
var rerun = true;
var pageNavigation;
var configuration;

function Channel() {
  this.channelName = "";
  this.blacklist = [];
  this.whitelist = [];
  this.isBlacklistActive = true;
  this.iconHref = "";
  this.banner = this.iconHref;
  this.isActive = false;
  this.href = "";
  this.switchedOff = false;
  this.position = null;
  this.tabPage = 0;
  this.fromValue = 0;
  this.toValue = 43200;
  this.isTimeRangeActive = false;
}

function Configuration() {
  this.name = "Youtube-subscription-filter-configuration";
  this.tabs = [{ name: "General", active: true, index: 0 }];
  this.hideWatched = false;
  this.watchedPercentage = 90;
  this.globalFilter = {
    channelName: "Youtube subscription global filter",
    blacklist: [],
    whitelist: [],
    isBlacklistActive: true,
    switchedOff: false,
    banner: "",
  };
}

(function () {
  function script() {
    var originalFetch = window.fetch;
    window.fetch = (input, init) => {
      return originalFetch(input, init).then((response) => {
        return new Promise((resolve) => {
          const url = response.url;
          if (-1 !== url.indexOf("/youtubei/v1/")) {
            response
              .clone()
              .json()
              .then((json) => {
                if (-1 !== input.url.indexOf("/youtubei/v1/guide")) {
                  document
                    .querySelector("html")
                    .setAttribute("youtube-filter-data", JSON.stringify(json));
                  console.log("youtube-filter-data is set successfully");
                  const ytEvent = new Event("youtube-filter-data-event");
                  window.dispatchEvent(ytEvent);
                } else if (
                  -1 !==
                  input.url.indexOf(
                    "/youtubei/v1/notification/get_unseen_count"
                  )
                ) {
                  console.log("youtube-filter-data is not set");
                  const ytEvent = new Event("youtube-unseen-event");
                  window.dispatchEvent(ytEvent);
                }
              });
          }
          resolve(response);
        });
      });
    };
  }

  function inject(fn) {
    const script = document.createElement("script");
    script.text = `(${fn.toString()})();`;
    document.documentElement.appendChild(script);
    console.log("proxy fetch is injected into main-page");
  }

  inject(script);
})();

window.addEventListener("youtube-filter-data-event", exec);

window.addEventListener("youtube-unseen-event", exec);

window.addEventListener("scroll", function () {
  getOrCreateConfiguration(manipulatieYoutubeHtml());
});

var interval = setInterval(checkNavigationLoad, 1000);

function checkNavigationLoad() {
  pageNavigation = document.getElementsByTagName(
    "yt-page-navigation-progress"
  )[0];

  if (pageNavigation !== undefined) {
    stopInterval();
    var observer = new MutationObserver(function () {
      if (pageNavigation.style.display !== "hidden") {
        var currentLoadingProgress =
          pageNavigation.getAttribute("aria-valuenow");
        if (currentLoadingProgress === "100") {
          console.log("End checkNavigationLoad: navigation done, page loaded");
          exec();
        }
      }
    });
    observer.observe(pageNavigation, {
      attributes: true,
      childList: true,
    });
  }
}

function stopInterval() {
  clearInterval(interval);
}

async function exec() {
    if (window.location.href.indexOf("/feed/subscriptions") != -1) {
      console.log("start exec()");
      getOrCreateConfiguration(fetchData());
  }
}

function getOrCreateConfiguration(cb) {
  getOrCreateObjectCallback("Youtube-subscription-filter-configuration", new Configuration())
  .then(value => {
    configuration = value;
    cb && cb();
  })
  .catch(error => {
    console.log(error);
  });
}

async function getChannel(name){
    const item = await new Promise((resolve) => {
        chrome.storage.local.get([name], (result) => {
          resolve(result);
        });
      });
    return item;
}

function saveChannel(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        console.log(`Value for key ${key} is set to ${value}`);
        resolve();
      }
    });
  });
}

function getOrCreateObjectCallback(name, templateObj) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([name], (result) => {
      if (result !== undefined) {
        const isNewlyCreated = result[name] === undefined;
        var storageObject = isNewlyCreated ? templateObj : result[name];

        var propertyWasMissing = compareOrUpdateObjects(
          templateObj,
          storageObject
        );
        if (propertyWasMissing || isNewlyCreated) {
          chrome.storage.local.set({ [name]: storageObject }, function () {
            console.log(name + " stored");
            resolve(storageObject);
          });
        } else {
          resolve(storageObject);
        }
      } else {
        reject('Error: no result found');
      }
    });
  });
}

function fetchData() {
  console.log("start fetchData(), rerun=" + rerun);
  getOrCreateConfiguration(processInitAndManip);
}

function processInitAndManip(){
  if (rerun === true) {
    var initialData = document
      .querySelector("html")
      .getAttribute("youtube-filter-data");
    console.log("initialData=" + initialData);
    if (!isEmptyArray(initialData)) {
      rerun = false;
      processInitialData(initialData);
      chrome.runtime.sendMessage({
        message: "activate_icon",
      });
    }
  }
  manipulatieYoutubeHtml();
}

function processInitialData(initialData) {
  var jsonInitialData = JSON.parse(initialData);
  var items = jsonInitialData.items;
  items.forEach(getSubscriptionSection);
  saveChannels(saveObj);
}

function getSubscriptionSection(item) {
  if (
    Object.prototype.hasOwnProperty.call(
      item,
      "guideSubscriptionsSectionRenderer"
    )
  ) {
    var initalSubscriptions = item.guideSubscriptionsSectionRenderer.items;
    initalSubscriptions.forEach(getSubscriptionsMetaData);
  }
}

function getSubscriptionsMetaData(item) {
  if (Object.prototype.hasOwnProperty.call(item, "guideEntryRenderer")) {
    if (
      Object.prototype.hasOwnProperty.call(item.guideEntryRenderer, "thumbnail")
    ) {
      var channelName = item.guideEntryRenderer.formattedTitle.simpleText;
      getChannel(channelName).then((result) => {
        let channel = result[channelName];
        if (channel === undefined || channel === null) {
          channel = new Channel();
          channel.channelName = channelName;
          channel.href =
            item.guideEntryRenderer.navigationEndpoint.commandMetadata.webCommandMetadata.url;
          channel.iconHref = item.guideEntryRenderer.thumbnail.thumbnails[0].url;
          saveChannel(channelName, channel);
          saveObj[channelName] = channel;
        }
      }).catch((error) => {
        console.error(error);
      });
    }
  } else if (
    Object.prototype.hasOwnProperty.call(item, "guideCollapsibleEntryRenderer")
  ) {
    var expandItems = item.guideCollapsibleEntryRenderer.expandableItems;
    expandItems.forEach(getSubscriptionsMetaData);
  }
}

function manipulatieYoutubeHtml() {
  console.log("start manipulatieYoutubeHtml()");
  var browseContainer = getBrowseContainer();
  var primary = browseContainer.querySelector("[id=primary]");
  var items = primary.querySelectorAll("[id=items]");
  if(items == undefined || items.length === 0){
    let shorts = primary.getElementsByTagName("ytd-rich-section-renderer");
    console.log(shorts);
    for(let section of shorts){
      section.remove();
    }
    items = primary.getElementsByTagName("ytd-rich-grid-row");
    const rich_item = primary.getElementsByTagName("ytd-rich-item-renderer");
    for(const item of rich_item){
      const dismissible = item.querySelector("[id=dismissible]");
      processChannelMetadata(dismissible);
    }

  }else{ //legacy youtube
    for(let item of items){
      let itemsChildren = item.children;
      var i;
      for (i = 0; i < itemsChildren.length; i++) {
        const dismissible = itemsChildren[i].querySelector("[id=dismissible]");
        processChannelMetadata(dismissible);
      }
    }
  }
}

function processChannelMetadata(dismissible) {
  var meta = dismissible.querySelector("[id=meta]");
  var channelName = meta
    .querySelector("[id=channel-name]")
    .querySelector("[id=text]").children[0];
  var videoTitle = meta.querySelector("[id=video-title]");
  var shouldHide = false;

  shouldHide = applyConfigurationGlobalFilter(videoTitle);
  getChannel(channelName.textContent).then((result) => {
    const channel = result[channelName.textContent];
    if (!shouldHide && channel !== undefined ) {
      const isChannelprocessingNeccessary = channel.isActive && (channel.switchedOff === undefined || channel.switchedOff === false);
      
      if (isChannelprocessingNeccessary) {
        if (channel.isBlacklistActive) {
          shouldHide = applyBlacklistOnChannelElement(videoTitle,channel.blacklist);
          if (!shouldHide && channel.isTimeRangeActive) {
            let seconds = extractSecondsFromElement(dismissible);
            if(seconds !== null){
              shouldHide = checkRange(seconds, channel.fromValue, channel.toValue);
            }
          }
        } else {
          shouldHide = applyWhitelistOnChannelElement(videoTitle,channel.whitelist);
          if (!shouldHide && channel.isTimeRangeActive) {
            let seconds = extractSecondsFromElement(dismissible);
            if(seconds !== null){
              shouldHide = checkRange(seconds, channel.fromValue, channel.toValue) === false;
            }
          }
        }
      }
    }
  
    if (!shouldHide && configuration.hideWatched) {
      shouldHide = applyConfiguration(dismissible);
    }

    if(!shouldHide && channel.shortsActive !== undefined && channel.shortsActive){
      shouldHide = isShortsVideo(videoTitle);
    }
  
    setVisiblity(dismissible, shouldHide);
  }).catch((error) => {
    console.error("Error retrieving channel from storage:" + error);
  });

}

function applyConfigurationGlobalFilter(videoTitle) {
  let shouldHide = false;
  if (configuration.globalFilter.isBlacklistActive) {
    shouldHide = applyBlacklistOnChannelElement(
      videoTitle,
      configuration.globalFilter.blacklist
    );
  } else {
    shouldHide = applyWhitelistOnChannelElement(
      videoTitle,
      configuration.globalFilter.whitelist
    );
  }
  return shouldHide;
}

function extractSecondsFromElement(dismissible) {
  let time = dismissible.querySelector(
    "ytd-thumbnail-overlay-time-status-renderer"
  );
  if(time !== null){
    let timeText = time.querySelector("span").textContent;
    let seconds = calculateTotalSeconds(timeText);
    return seconds;
  }
  return null
}

function applyBlacklistOnChannelElement(videoTitle, blacklist) {
  var k;
  for (k = 0; k < blacklist.length; k++) {
    if (
      !isEmptyArray(blacklist) &&
      videoTitle.textContent.toLowerCase().includes(blacklist[k].toLowerCase())
    ) {
      return true;
    }
  }
  return false;
}

function calculateTotalSeconds(time) {
  const timeArr = time.split(":");
  let totalSeconds = 0;

  if (timeArr.length === 3) {
    totalSeconds += parseInt(timeArr[0]) * 3600;
    totalSeconds += parseInt(timeArr[1]) * 60;
    totalSeconds += parseInt(timeArr[2]);
  } else if (timeArr.length === 2) {
    totalSeconds += parseInt(timeArr[0]) * 60;
    totalSeconds += parseInt(timeArr[1]);
  } else if(timeArr.length === 1){
    totalSeconds += parseInt(timeArr[0]);
  }
  else{
    throw new Error("Invalid time format. Expected hh:mm:ss or mm:ss.");
  }

  return totalSeconds;
}

function checkRange(seconds, rangeStart, rangeStop) {
  const rangeStartInSeconds = rangeStart;
  const rangeStopInSeconds = rangeStop;
  const result =
    seconds >= rangeStartInSeconds && seconds <= rangeStopInSeconds;
  return result;
}

function applyWhitelistOnChannelElement(videoTitle, whitelist) {
  var isDelete = true;
  var j;
  for (j = 0; j < whitelist.length; j++) {
    if (
      videoTitle.textContent.toLowerCase().includes(whitelist[j].toLowerCase())
    ) {
      isDelete = false;
      break;
    }
  }

  return isDelete;
}

function applyConfiguration(parentNodeElem) {
  var thumbnail = parentNodeElem.querySelector("[id=thumbnail]");
  var progress = thumbnail.querySelector("[id=progress]");

  if (progress !== null) {
    var elemProgress = progress.style.width.substring(
      0,
      progress.style.width.length - 1
    );
    if (parseInt(elemProgress) >= parseInt(configuration.watchedPercentage)) {
      return true;
    }
  }

  return false;
}

function isShortsVideo(linkelement){
  if(linkelement.href === undefined){
    return linkelement.parentElement.href.includes('/shorts/');
  }
  return linkelement.href.includes('/shorts/');
}

function setVisiblity(dismissible, shouldHide) {
  const parentNode = dismissible.parentNode;
  if(parentNode.nodeName === "YTD-GRID-VIDEO-RENDERER"){
    dismissible.parentNode.style.display = shouldHide ? "none" : "block";
  }
  else{
    const parent = getParentByTagName(dismissible, "ytd-rich-item-renderer");
    parent.style.display = shouldHide ? "none" : "block";
  }
}

function getParentByTagName(node, tagname) {
	var parent;
	if (node === null || tagname === '') return;
	parent  = node.parentNode;
	tagname = tagname.toUpperCase();

	while (parent.tagName !== "HTML") {
		if (parent.tagName === tagname) {
			return parent;
		}
		parent = parent.parentNode;
	}

	return parent;
}

function isEmptyArray(obj) {
  if (obj != null && obj.length > 0) {
    return JSON.stringify(obj) === JSON.stringify([""]);
  }
  return true;
}

function saveChannels(channelObj) {
  console.log("saveChannel: " + JSON.stringify(channelObj));
  chrome.runtime.sendMessage({
    message: "subscriptions",
    channel: channelObj,
  });
}

function compareOrUpdateObjects(templateObject, existingObject) {
  var propertyWasMissing = false;
  for (var p in templateObject) {
    if (!Object.prototype.hasOwnProperty.call(existingObject, p)) {
      propertyWasMissing = true;
      existingObject[p] = templateObject[p];
      console.log(
        "compareOrUpdateObjects: propertyWasMissing=" +
          propertyWasMissing +
          ", templateObject=" +
          JSON.stringify(templateObject) +
          ", existingObject=" +
          JSON.stringify(existingObject)
      );
    }
  }

  return propertyWasMissing;
}

function getBrowseContainer() {
  var ytBrowse = document.getElementsByTagName("ytd-browse");
  for (let i = 0; i < ytBrowse.length; i++) {
    if (ytBrowse[i].getAttribute("page-subtype") === "subscriptions") {
      return ytBrowse[i];
    }
  }
}

chrome.runtime.onMessage.addListener(function (request) {
  if (request.command == "refresh") {
    exec();
  } else if (request.command == "saveDone") {
    console.log("done saving in background script");
  }
});
