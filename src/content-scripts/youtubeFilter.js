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

function observeYtData() {
  let ytInitialData = window.ytInitialData;

  Object.defineProperty(window, 'ytInitialData', {
    get: function () {
      return ytInitialData;
    },
    set: function (newValue) {
      if (newValue !== ytInitialData) {
        ytInitialData = filterInitialData(newValue);
      }
    },
  });
  
  function filterInitialData(initialData){
    const isListView = hasProperty(contentFromInitialData(initialData), "sectionListRenderer")
    let contents;
    if(isListView){
      contents = listViewFilter(contentFromInitialData(initialData).sectionListRenderer.contents);
      contentFromInitialData(initialData).sectionListRenderer.contents = contents;
    }
    else{
      contents = gridViewFilter(contentFromInitialData(initialData).richGridRenderer.contents);
      contentFromInitialData(initialData).richGridRenderer.contents = contents;
    }
    console.log('new contents',contents);
    return initialData;
  }

  function contentFromInitialData(initialData){
    return initialData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content
  }

  function gridViewFilter(contents) {
    console.log('ytInitialData contents', contents.length);
    console.log("ytinitialData local storage filter data: ", window.ytfilterStoredObjects);
    return contents.filter((content) => shouldHideGridItems(content));
  }

  function shouldHideGridItems(content){
    if (hasProperty(content, "richItemRenderer")) {
      const isAd = hasProperty(content.richItemRenderer.content, "adSlotRenderer");
      if(isAd){
        return true;
      }
      return !applyfilterRules(content.richItemRenderer.content.videoRenderer);
    } else if (hasProperty(content, "richSectionRenderer")) {
      if (hasProperty(content.richSectionRenderer.content, "richShelfRenderer")) {
        console.log("filter out whole shorts section.");
        return false;
      }
    }
    return true;
  }

  function listViewFilter(contents){
    console.log('ytInitialData contents',contents.length);
    console.log("ytinitialData local storage filter data: ", window.ytfilterStoredObjects);
    const menu = contents[0].itemSectionRenderer.contents[0].shelfRenderer.menu;
    const newContents = contents.filter((content) => !shouldHideListItems(content));
    newContents[0].itemSectionRenderer.contents[0].shelfRenderer.menu = menu;
    return newContents;
  }

  function shouldHideListItems(content){
    if(hasProperty(content, "itemSectionRenderer")){
      const section = content.itemSectionRenderer.contents[0];
      if(hasProperty(section, "reelShelfRenderer")){
        return true;
      }
      return applyfilterRules(section.shelfRenderer.content.expandedShelfContentsRenderer.items[0].videoRenderer);
    }
    return false;
  }

  var originalFetch = window.fetch;
  window.fetch = (input, init) => {
    return originalFetch(input, init).then(async (response) => {
      response.text = function() {
        return Response.prototype.text.call(this).then(processJSON);
      };
      return response;
    });
  };

  function processJSON(json) {
    const parsedJSON = JSON.parse(json);
    if (hasProperty(parsedJSON, "items")) {
      saveGuidDataInHtml(parsedJSON);
    } else if (
      hasProperty(parsedJSON, "onResponseReceivedActions") &&
      hasProperty(parsedJSON.onResponseReceivedActions[0],"appendContinuationItemsAction")
    ) {
      const result = filterScrolledNewContent(parsedJSON);
      console.log("processJSON filtering result: ", 
      );
      parsedJSON.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems =
        result;
    }
    else if(hasProperty(parsedJSON, "contents") && hasProperty(parsedJSON.contents, "twoColumnBrowseResultsRenderer")){
      parsedJSON.contents = filterInitialData(parsedJSON).contents;
    }
    const result = JSON.stringify(parsedJSON);
    return new Promise((resolve) => {
      resolve(result);
    });
  }

  function hasProperty(obj, property){
    return Object.prototype.hasOwnProperty.call(obj, property);
  }

  function totalSeconds(time) {
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

  function applyfilterRules(vidRender) {
    if(vidRender === undefined){
      //only happens on firefox on the homepage, not sure why. Debugging on firefox is hell.
      //even the Firefox developper edition does not need this check. Weird stuff.
      return false;
    }
    const channelName = vidRender.ownerText.runs[0].text;
    const videoTitle = vidRender.title.runs[0];
    const duration = (hasProperty(vidRender, "lengthText")) ? vidRender.lengthText.simpleText : null; //live videos have no duration
    const resumePlayback = vidRender.thumbnailOverlays.find(
      (thumb) => Object.hasOwnProperty.call(thumb, "thumbnailOverlayResumePlaybackRenderer")
    )
    var shouldHide = false;
    
    const storedObjects = window.ytfilterStoredObjects
    
    const channelFilter = storedObjects.filter(
      (channel) => channel.isActive && (channel.switchedOff === undefined || channel.switchedOff === false)
      );
      const configuration = storedObjects.find(element => element.name === "Youtube-subscription-filter-configuration");
      
      if(configuration !== undefined){
        shouldHide = applyConfigurationGlobalFilter(videoTitle, configuration);
      }
      if(!shouldHide){
      for(const filter of channelFilter){
        if(filter.channelName === channelName){
          if (filter.isBlacklistActive) {
            shouldHide = listContainsTitle(videoTitle, filter.blacklist);
            if (!shouldHide && filter.isTimeRangeActive && duration != null) {
              shouldHide = checkRange(totalSeconds(duration), filter.fromValue, filter.toValue);
            }
          } else{
            shouldHide = !listContainsTitle(videoTitle, filter.whitelist);
            if (!shouldHide && filter.isTimeRangeActive && duration != null) {
              shouldHide = checkRange(totalSeconds(duration), filter.fromValue, filter.toValue) === false;
            }
          }
          break;
        }
      }
  
      if (!shouldHide && configuration && configuration.hideWatched && resumePlayback) {
        const durWatched = resumePlayback.thumbnailOverlayResumePlaybackRenderer.percentDurationWatched;
        shouldHide = checkWatchedPercentage(durWatched, configuration);
      }
    }
    
    return shouldHide;
  }

  function listContainsTitle(videoTitle, list) {
    if(!isEmptyArray(list)){
      for (const item of list) {
        if (videoTitle.text.toLowerCase().includes(item.toLowerCase())){
          return true;
        }
      }
    }
    return false;
  }

  function isEmptyArray(obj) {
    if (obj != null && obj.length > 0) {
      return JSON.stringify(obj) === JSON.stringify([""]);
    }
    return true;
  }

  function checkRange(seconds, rangeStart, rangeStop) {
    const rangeStartInSeconds = rangeStart;
    const rangeStopInSeconds = rangeStop;
    const result =
    seconds >= rangeStartInSeconds && seconds <= rangeStopInSeconds;
    return result;
  }
  
  function checkWatchedPercentage(percentDurationWatched, configuration) {
    return percentDurationWatched >= parseInt(configuration.watchedPercentage);
  }
  
  function applyConfigurationGlobalFilter(videoTitle, configuration) {
    if (configuration.globalFilter.isBlacklistActive) {
      return listContainsTitle(videoTitle, configuration.globalFilter.blacklist);
    }
    return listContainsTitle(videoTitle, configuration.globalFilter.whitelist) === false;
  }
  
  function saveGuidDataInHtml(json){
    document
      .querySelector("html")
      .setAttribute("youtube-filter-data", JSON.stringify(json));
    console.log("youtube-filter-data is set successfully");
    const ytEvent = new Event("youtube-filter-data-event");
    window.dispatchEvent(ytEvent);
  }

  function filterScrolledNewContent(json){
    let newContents = new Array();
    let contents = json.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems;
    let lastItem;
    for(let i=0; i < contents.length; i++){
      let shouldHide = false;
      if(hasProperty(contents[i], "continuationItemRenderer")){
        lastItem = contents[i];
      }
      else{
        if(hasProperty(contents[i], "richItemRenderer")){
          shouldHide = applyfilterRules(contents[i].richItemRenderer.content.videoRenderer);
        }
        else if(hasProperty(contents[i], "itemSectionRenderer")){
          const shelf = contents[i].itemSectionRenderer.contents[0].shelfRenderer;
          shouldHide = applyfilterRules(shelf.content.expandedShelfContentsRenderer.items[0].videoRenderer);
        }
        if(shouldHide === false){
          newContents.push(contents[i]);
        }
      }
    }
    if(lastItem !== undefined){
      newContents.push(lastItem);
    }
    return newContents;
  }
}

function inject(fn, fnname) {
  const script = document.createElement("script");
  script.text = `(${fn.toString()})();`;
  document.documentElement.appendChild(script);
  console.log(fnname + " is injected into main-page");
}

function injectStoredObjects(){
  chrome.storage.local.get(null, items => {
    const script = document.createElement("script");
    script.text = `window.ytfilterStoredObjects = ${JSON.stringify(Object.values(items))}`;
    document.documentElement.appendChild(script);
    console.log("stored objects injected into main-page");
  });
}

injectStoredObjects();
inject(observeYtData, "observeYtData");

window.addEventListener("youtube-filter-data-event", processInitAndManip);

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

function processInitAndManip(){
  var initialData = document
    .querySelector("html")
    .getAttribute("youtube-filter-data");
  if (!isEmptyArray(initialData)) {
    processInitialData(initialData);
    getOrCreateObjectCallback("Youtube-subscription-filter-configuration", new Configuration())
    .then(value => {
      console.log("configuration" , value);
      chrome.runtime.sendMessage({
        message: "activate_icon",
      });
    })
  }
}

function isEmptyArray(obj) {
  if (obj != null && obj.length > 0) {
    return JSON.stringify(obj) === JSON.stringify([""]);
  }
  return true;
}

function processInitialData(initialData) {
  var jsonInitialData = JSON.parse(initialData);
  var items = jsonInitialData.items;
  items.forEach(getSubscriptionSection);
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