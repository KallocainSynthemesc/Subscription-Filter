let map = new Map();
let keyLength = 0;
var saveObj = {};
var rerun = true;
var itemsProcessed = 0;
var pageNavigation;
var configuration;

function Channel() {
    this.channelName = '';
    this.blacklist = [];
    this.whitelist = [];
    this.isBlacklistActive = true;
    this.iconHref = '';
    this.banner = this.iconHref;
    this.isActive = false;
    this.href = '';
    this.switchedOff = false;
    this.position = null;
    this.tabPage = 0;
}

function Configuration()
{
    this.name = "Youtube-subscription-filter-configuration";
    this.tabs = [
        { name: 'General', 
        active: true, 
        index: 0,}
    ];
    this.hideWatched = false;
    this.watchedPercentage = 90;
    this.globalFilter = {
        channelName : "Youtube subscription global filter",
        blacklist : [],
        whitelist : [],
        isBlacklistActive : true,
        switchedOff : false,
        banner : ''
    }
}

(function() {
    function script() {
        var originalFetch = window.fetch;
        window.fetch = (input, init) => {
            return originalFetch(input, init).then(response => {
                return new Promise((resolve) => {
                    const url = response.url;
                    if(-1 !== url.indexOf("/youtubei/v1/")){
                        response.clone()
                            .json()
                            .then(json => {
                                if (-1 !== input.url.indexOf("/youtubei/v1/guide")) {
                                    document.querySelector("html").setAttribute("youtube-filter-data", JSON.stringify(json));
                                    console.log("youtube-filter-data is set successfully");
                                    const ytEvent = new Event('youtube-filter-data-event');
                                    window.dispatchEvent(ytEvent);
                                } else if (-1 !== input.url.indexOf('/youtubei/v1/notification/get_unseen_count')) {
                                    console.log("youtube-filter-data is not set");
                                    const ytEvent = new Event('youtube-unseen-event');
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
        const script = document.createElement('script');
        script.text = `(${fn.toString()})();`;
        document.documentElement.appendChild(script);
        console.log("proxy fetch is injected into main-page");
    }

    inject(script);
})();

window.addEventListener("youtube-filter-data-event", exec);

window.addEventListener("youtube-unseen-event", exec);

window.addEventListener('scroll', function() {
    manipulatieYoutubeHtml();
});

var interval = setInterval(checkNavigationLoad, 1000);

function checkNavigationLoad() {
    pageNavigation = document.getElementsByTagName("yt-page-navigation-progress")[0];

    if (pageNavigation !== undefined) {
        stopInterval();
        var observer = new MutationObserver(function() {
            if (pageNavigation.style.display !== 'hidden') {
                var currentLoadingProgress = pageNavigation.getAttribute('aria-valuenow');
                if (currentLoadingProgress === '100') {
                    console.log("End checkNavigationLoad: navigation done, page loaded");
                    exec();
                }
            }
        });
        observer.observe(pageNavigation, {
            attributes: true,
            childList: true
        });
    }
}

function stopInterval() {
    clearInterval(interval);
}

function exec() {
    if (window.location.href.indexOf("/feed/subscriptions") != -1) {
        console.log("start exec()");
        getOrCreateConfiguration();
        chrome.storage.local.get(null, function(items) {
            var allKeys = Object.keys(items);
            keyLength = allKeys.length;
            if (keyLength === 0) {
                fetchData();
            } else {
                allKeys.forEach(createMap);
            }
        });
    }
}

function getOrCreateConfiguration(){
    getOrCreateObjectCallback("Youtube-subscription-filter-configuration", new Configuration(), function(value) {
        configuration = value;
    })
}

function getOrCreateObjectCallback(name, templateObj, cb)
{
    chrome.storage.local.get([name], result => {
        if (result !== undefined) {
            const isNewlyCreated = result[name] === undefined;
            var storageObject = isNewlyCreated ? templateObj : result[name];
            
            var propertyWasMissing = compareOrUpdateObjects(templateObj, storageObject);
            if(propertyWasMissing || isNewlyCreated)
            {
                chrome.storage.local.set({[name]: storageObject}, function() {
                    console.log(name + " stored");
                });
            }
            cb && cb(storageObject);
        }
    });
    
    console.log("getOrCreateObjectCallback: configuration " + JSON.stringify(configuration));
}

function createMap(item) {
    chrome.storage.local.get([item], function(result) {
        itemsProcessed++;
        if (result !== null) {
            map.set(item, result[item]);
        }
        if (itemsProcessed === keyLength) {
            fetchData();
            itemsProcessed = 0;
        }
    });
}

function fetchData() {
    console.log("start fetchData(), rerun=" + rerun);
    if (rerun === true) {
        var initialData = document.querySelector("html").getAttribute("youtube-filter-data");
        console.log("initialData=" + initialData);
        if (!isEmptyArray(initialData)) {
            rerun = false;
            processInitialData(initialData);
            chrome.runtime.sendMessage({
                "message": "activate_icon"
            });
        }
    }
    manipulatieYoutubeHtml();
}

function processInitialData(initialData) {
    var jsonInitialData = JSON.parse(initialData);
    var items = jsonInitialData.items;
    items.forEach(getSubscriptionSection);
    saveChannel(saveObj);
}

function getSubscriptionSection(item) {
    if (Object.prototype.hasOwnProperty.call(item, "guideSubscriptionsSectionRenderer")) {
        var initalSubscriptions = item.guideSubscriptionsSectionRenderer.items;
        initalSubscriptions.forEach(getSubscriptionsMetaData);
    }
}

function getSubscriptionsMetaData(item) {
    if (Object.prototype.hasOwnProperty.call(item, "guideEntryRenderer")) {
        if (Object.prototype.hasOwnProperty.call(item.guideEntryRenderer, "thumbnail")) {
            var channel;
            var channelName = item.guideEntryRenderer.formattedTitle.simpleText;
            if (map.has(channelName) === false) {
                channel = new Channel();
                channel.channelName = channelName;
                channel.href = item.guideEntryRenderer.navigationEndpoint.commandMetadata.webCommandMetadata.url;
                channel.iconHref = item.guideEntryRenderer.thumbnail.thumbnails[0].url;
                saveObj[channelName] = channel;
            }
        }
    } else if (Object.prototype.hasOwnProperty.call(item, "guideCollapsibleEntryRenderer")) {
        var expandItems = item.guideCollapsibleEntryRenderer.expandableItems;
        expandItems.forEach(getSubscriptionsMetaData);
    }
}

function manipulatieYoutubeHtml() {
    console.log("start manipulatieYoutubeHtml()");
    var browseContainer = getBrowseContainer();
    var primary = browseContainer.querySelector('[id=primary]');
    var metas = primary.querySelectorAll('[id=meta]');
	var i;
	for (i = 0; i < metas.length; i++) {

		processChannelMetadata(metas[i]);
	}
}

function processChannelMetadata(meta) {
    var channelName = meta.querySelector('[id=channel-name]').querySelector('[id=text]').children[0];
    var videoTitle = meta.querySelector('[id=video-title]');
    var parentNodeElem = meta.closest("#dismissible");
    var shouldHide = false;
    
    if(configuration.globalFilter.isBlacklistActive){
        shouldHide = applyBlacklistOnChannelElement(videoTitle, configuration.globalFilter.blacklist);
    } else {
        shouldHide = applyWhitelistOnChannelElement(videoTitle, configuration.globalFilter.whitelist);
    }

    if (!shouldHide && map.has(channelName.textContent)) {
        var channel = map.get(channelName.textContent);
        const isChannelprocessingNeccessary = channel.isActive && (channel.switchedOff === undefined || channel.switchedOff === false)

        if (isChannelprocessingNeccessary) {
            if (channel.isBlacklistActive) {
                shouldHide = applyBlacklistOnChannelElement(videoTitle, channel.blacklist);
            } else {
                shouldHide = applyWhitelistOnChannelElement(videoTitle, channel.whitelist);
            }
        }
    }
    
    if(!shouldHide && configuration.hideWatched)
    {
        shouldHide = applyConfiguration(parentNodeElem);
    }
    
    setVisiblity(parentNodeElem, shouldHide);
}

function applyBlacklistOnChannelElement(videoTitle, blacklist) {
    var k;
    for (k = 0; k < blacklist.length; k++) {
        if (!isEmptyArray(blacklist) && videoTitle.textContent.toLowerCase().includes(blacklist[k].toLowerCase())) {
            return true;
        }
    }
    return false;
}

function applyWhitelistOnChannelElement(videoTitle, whitelist) {
    var isDelete = true;
    var j;
    for (j = 0; j < whitelist.length; j++) {
        if (videoTitle.textContent.toLowerCase().includes(whitelist[j].toLowerCase())) {
            isDelete = false;
            break;
        }
    }

    return isDelete;
}

function applyConfiguration(parentNodeElem) {
    var thumbnail = parentNodeElem.querySelector('[id=thumbnail]');
    var progress = thumbnail.querySelector('[id=progress]');
    
    if(progress !== null)
    {
        var elemProgress = progress.style.width.substring(0, progress.style.width.length - 1);
        if(parseInt(elemProgress) >= parseInt(configuration.watchedPercentage))
        {
            return true;
        }
    }
    
    return false;
}

function setVisiblity(parentNodeElem, shouldHide)
{
    parentNodeElem.parentNode.style.display = shouldHide ? "none" : "block";
}

function isEmptyArray(obj) {

    if (obj != null && obj.length > 0) {
        return JSON.stringify(obj) === JSON.stringify([""]);
    }
    return true;
}

function saveChannel(channelObj) {
    console.log("saveChannel: " + JSON.stringify(channelObj));
    chrome.runtime.sendMessage({
        message: 'subscriptions',
        channel: channelObj
    });
}

function compareOrUpdateObjects(templateObject, existingObject) {
    var propertyWasMissing = false;
    for (var p in templateObject) {
        if (!Object.prototype.hasOwnProperty.call(existingObject, p)) {
            propertyWasMissing = true;
            existingObject[p] = templateObject[p];
            console.log("compareOrUpdateObjects: propertyWasMissing=" + propertyWasMissing +
                ", templateObject=" + JSON.stringify(templateObject) +
                ", existingObject=" + JSON.stringify(existingObject));
        }
    }

    return propertyWasMissing;
}

function getBrowseContainer() {
    var ytBrowse = document.getElementsByTagName("ytd-browse");
    for (let i = 0; i < ytBrowse.length; i++) {
        if (ytBrowse[i].getAttribute('page-subtype') === 'subscriptions') {
            return ytBrowse[i];
        }
    }
}

chrome.runtime.onMessage.addListener(
    function(request) {
        if (request.command == "refresh") {
            exec();
        } else if (request.command == "saveDone") {
            console.log("done saving in background script");
        }
    }
);