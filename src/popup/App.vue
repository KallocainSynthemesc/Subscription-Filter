<template>
   <div v-bind:class="{'minHeight': isFilterModalActive || isCofigurationActive }">
      <canvas class="canvas" id="canvas"></canvas>
      <div class="contentDiv">
          <tabs :configuration="configurationObj" :activeTab="activeTab" @changeActiveTab="changeActiveTab" @switchChannel="switchChannel"></tabs>
          <div class="config" @click="changeConfigurationState()" v-bind:title="getMessage('config_title')">⚙</div>
          <div class="global" @click="activateFilterModal(configurationObj.globalFilter)" v-bind:title="getMessage('global_title')">
            <svg class="globalSvg" viewBox="0, 0, 420, 420">
              <g>
                <path stroke="white" fill="none" stroke-width="20" d="M209,15a195,195 0 1,0 2,0zm1,0v390m195-195H15M59,90a260,260 0 0,0 302,0 m0,240 a260,260 0 0,0-302,0M195,20a250,250 0 0,0 0,382 m30,0 a250,250 0 0,0 0-382"></path>
              </g>
            </svg>
          </div>
          <channel-table :tabledata="activeChannelForTab()" @updateChannelIndex="updateChannelIndex" @saveChanneInStore="saveChanneInStore" @saveFilterModal="saveFilterModal"
          @removeFilter="removeFilter" :key="componentKey" @forceRerender="forceRerender" @activateFilterModal="activateFilterModal"></channel-table>
          <new-button :suggestions="lookupArray" @suggestionSelected="updateDisplayStore"></new-button>
          <filter-modal :channel="currentChannel" v-if="isFilterModalActive" @closeFilterModal="closeFilterModal" @saveFilterModal="saveFilterModal"></filter-modal>
          <configuration :configuration="configurationObj" v-if="isCofigurationActive" 
          @closeConfiguration="closeConfiguration" @saveConfiguration="saveConfiguration" @newTab="newTab" @removeTab="removeTab"></configuration>
          <warning v-show="!onYoutube" @closeWarning="closeWarning" ></warning>
      </div>
   </div>
</template>

<script>
import Tabs from '@/components/Tabs.vue'
import Warning from '@/components/Warning.vue'
import ChannelTable from '@/components/ChannelTable.vue'
import NewButton from '@/components/NewButton.vue'
import FilterModal from '@/components/FilterModal.vue'
import Configuration from '@/components/Configuration.vue'

export default {
  name: 'App',
    components: {
        'tabs' : Tabs,
        'warning' : Warning,
        'channel-table': ChannelTable,
        'new-button' : NewButton,
        'filter-modal' : FilterModal,
        'configuration' : Configuration
    },
    
    mounted() {
        var canvas = document.getElementById("canvas");
        this.vueCanvas = canvas;
    },

    data() {
        return {
            lookupArray: [],
            allChannelObj: new Map(),
            displayActiveChannel: [],
            componentKey: 0,
            currentChannel: null,
            isFilterModalActive: false,
            isCofigurationActive: false,
            msgPort: null,
            activeTab: 0,
            configurationObj: {
                tabs : [
                    { name: 'General', active: true, index: 0 }
                ]
            },
            onYoutube: true,
            vueCanvas:null,
        }
    },
    
    created()
    {
        this.init();
    },
    
    methods: { 
        init()
        {
            chrome.storage.local.get(null, items => {
                const allObjects = Object.values(items);
                for(const channel of allObjects){
                    this.verifyChannelAttributes(channel);
                }
                var config = allObjects.find(element => element.name === "Youtube-subscription-filter-configuration");
                if(config !== undefined)
                {
                    this.configurationObj = config;
                    this.activeTab = this.lowestTab();
                }

                this.displayActiveChannel = allObjects.filter(channel => channel.isActive === true);
                this.lookupArray = allObjects.filter(channel => channel.isActive === false);
                this.transformBackground();
            });
               
            this.makePortAvailableForConnection();
            chrome.tabs.query({
                active: true,
                currentWindow: true
            },(tabs) => {
                var tabURL = tabs[0].url;
                this.onYoutube = tabURL.includes('subscription')
                console.log("init: onYoutube=" + this.onYoutube);
            });
        },
        
        updateDisplayStore(channel)
        {
            channel.position = this.activeChannelForTab().length;
            console.log("updateDisplayStore: position=" + channel.position);
            channel.isActive = true;
            channel.tabPage = this.activeTab;
            this.displayActiveChannel.push(channel);
            this.lookupArray = this.lookupArray.filter(lookupChannel => lookupChannel.channelName !== channel.channelName);
            this.saveChanneInStore(channel);
        },
        
        updateChannelIndex(item, index)
        {
            var channel = this.displayActiveChannel.find(element => element.channelName === item.children[0].id);
            channel.position = index;
            this.saveChanneInStore(channel);
        },
        
        forceRerender() {
          console.log("forceRerender called");
          this.componentKey += 1;
        },
        
        saveChanneInStore(channel)
        {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {  
              chrome.tabs.sendMessage(tabs[0].id, {command: 'save', channel: channel});  
            });
        },
        
        saveConfigurationInStore(configuration)
        {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {  
              chrome.tabs.sendMessage(tabs[0].id, {command: 'saveConfig', config: configuration});  
            });
        },
        
        activateFilterModal(channel)
        {
            this.currentChannel = channel;
            this.isFilterModalActive = true;
        },
        
        closeFilterModal()
        {
            this.isFilterModalActive = false;
        },
        
        saveFilterModal(saveObj)
        {
            if(saveObj.channelName === "Youtube subscription global filter")
            {
                this.configurationObj.globalFilter = saveObj;
                this.saveConfiguration(this.configurationObj);
            }
            else
            {
                this.currentChannel = saveObj;
                this.saveChanneInStore(saveObj);
            }
            this.isFilterModalActive = false;
        },
        
        removeFilter(channel)
        {
            channel.blacklist =[];
			channel.whitelist =[];
			channel.position = null;
            channel.isActive = false;
            channel.tabPage = 0;
            channel.switchedOff = false;
            this.lookupArray.push(channel);
            this.displayActiveChannel = this.displayActiveChannel.filter(item => item.channelName !== channel.channelName);
            this.saveChanneInStore(channel);
        },
        
        makePortAvailableForConnection(){ //used to refresh page after popup is closed
            console.log('\tcontent: Making message port available for connection');
            if(this.msgPort && typeof this.msgPort.disconnect === 'function'){
                this.msgPort.disconnect();
            }
            this.msgPort = chrome.runtime.connect({name:"msgPort"});

        },
        
        changeActiveTab(tab)
        {
            this.activeTab = tab.index;
            this.transformBackground();
        },
        
        activeChannelForTab()
        {
            return this.displayActiveChannel.filter(channel => channel.tabPage === this.activeTab);
        },
        
        switchChannel(tab)
        {
            this.displayActiveChannel.forEach((channel) => {
                if(channel.tabPage === tab.index)
                {
                    console.log("switchChannel: channel="+ channel.channelName + ", active=" + tab.active);
                    channel.switchedOff = tab.active;
                    this.saveChanneInStore(channel);
                }
            });
            
            this.saveConfigurationInStore(this.configurationObj);
            
        },
        
        changeConfigurationState()
        {
            this.isCofigurationActive = !this.isCofigurationActive;
        },
        
        closeConfiguration()
        {
            this.isCofigurationActive = false;
        },
        
        saveConfiguration(config)
        {
            this.isCofigurationActive = false;
            this.configurationObj = config;
            console.log("save configuration: "+ JSON.stringify(this.configurationObj));
            this.saveConfigurationInStore(config);
        },
        
        newTab()
        {
            var highestTab = this.configurationObj.tabs[this.configurationObj.tabs.length -1];
            var newIndex = highestTab.index + 1;
            var tab = { name: '', active: true, index: newIndex };
            console.log("newTab: tab=" + JSON.stringify(tab));
            this.configurationObj.tabs.push(tab);
        },
        
        removeTab(idx)
        {
            var tab = this.configurationObj.tabs[idx];
            console.log("removeTab: index=" + tab.index);
            this.displayActiveChannel.forEach((channel) => {
                if(channel.tabPage === tab.index)
                {
                    this.removeFilter(channel);
                }
            });
            this.configurationObj.tabs = this.configurationObj.tabs.filter((tab,index) => index !== idx ); 
            this.saveConfigurationInStore(this.configurationObj);
        },
        
        lowestTab()
        {
            var lowestTab = this.configurationObj.tabs[0];
            console.log("lowestTab = " + lowestTab.index + "tabs=" + JSON.stringify(this.configurationObj.tabs));
            return lowestTab.index
        },
        
        closeWarning()
        {
            this.onYoutube = !this.onYoutube;
        },
        
        transformBackground()
        {
            var firstChannel = this.displayActiveChannel.find(element => element.tabPage === this.activeTab && element.position === 0);
            if(firstChannel !== undefined){
                var ctx = this.vueCanvas.getContext("2d");  
                var width = this.vueCanvas.offsetWidth ;
                var height = 500;
                var img = new Image();
                img.src = firstChannel.iconHref; 
                var icvs = document.createElement('canvas');
                icvs.width = width;
                icvs.height = height;

                img.onload = function(){
                        var ictx = icvs.getContext('2d');
                        ictx.drawImage(img, 0, 0);

                        var gradient = ictx.createLinearGradient(0, 0, icvs.width, 0);
                        gradient.addColorStop(0, "rgba(2,0,36,1)"); 
                        gradient.addColorStop(0.46, "rgba(119,74,74,0.5)");
                        gradient.addColorStop(0.49, "rgba(128,93,93,1)");
                        gradient.addColorStop(0.62, "rgba(160,160,160,1)");
                        ictx.fillStyle = gradient;
                        ictx.fillRect(0, -10, icvs.width, icvs.height);
                        ctx.filter = 'blur(1px)';
                        ctx.drawImage(icvs, -10, 0, width, height);
                };
            }
        },
        
        getMessage(msg)
        {
            return chrome.i18n.getMessage(msg);
        },

        verifyChannelAttributes(channel) {
            const Channel = {
                channelName: "",
                blacklist: [],
                whitelist: [],
                isBlacklistActive: true,
                iconHref: "",
                get banner() {
                    return this.iconHref;
                },
                isActive: false,
                href: "",
                switchedOff: false,
                position: null,
                tabPage: 0,
                fromValue: 0,
                toValue: 43200,
                isTimeRangeActive: false,
                shortsActive: false

            };
            
            for (const key in Channel) {
                if (!(key in channel)) {
                    console.log("verifyChannelAttributes" + JSON.stringify(channel));
                    channel[key] = Channel[key];
                }
            }
            return channel;
        }
    },
}
</script>

<style>
html {
  background: rgb(2,0,36);
  background: linear-gradient(90deg, rgba(2,0,36,1) 30%, rgba(119,74,74,1) 64%, rgba(128,93,93,1) 71%, rgba(160,160,160,1) 98%);
}

body{
    margin-left:0;
    margin-top: 0;
    width: 500px;
    font-family: "Segoe UI", Tahoma, sans-serif;
    font-size: 75%;
}

.canvas{
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: -1;
}

.contentDiv
{
    z-index: 1;
    margin-left: 0.5%;
}

.minHeight{
    min-height: 250px;
}

.button {
  text-align: center;
  cursor: pointer;
  padding: 0;
}

.trash
{
	width: 23px;
	height: 100%;
	border-radius: 50%;
	background: #3f3f3f;
	color: white;/*#E5F2F2;*/
	text-align: center;
	font-size: 1.3em;
	cursor: pointer;
	padding-bottom: 7%;
    -webkit-backface-visibility: hidden;
    transition: border-radius 0.5s linear, background 0.5s linear, color 0.5s linear;
}

.trash:hover {
    transition: border-radius 0.5s linear, background 0.5s linear, color 0.5s linear;
    color: #CFF2F2;
    background: black;
    border-radius: 15%;
}

.checkboxInput{
    transform: scale(0.8);
    float: left;
}


.config{
    margin-top: 0.5%;
    display: inline-block;
    padding: 0;
    height: 23px;
    width: 23px;
    border-radius: 50%;
    background: #3f3f3f;
    color: white;
    text-align: center;
    font-size: 1.3em;
    cursor: pointer;
    float: right;
    margin-right: 2.4%;
    -webkit-backface-visibility: hidden;
    transition: border-radius 0.5s linear, background 0.5s linear, color 0.5s linear;
}

.config:hover {
    color: #CFF2F2;
    transition: border-radius 0.5s linear, background 0.5s linear, color 0.5s linear;
    background: black;
    border-radius: 15%;
}

.global{
    margin-top: 0.5%;
    display: inline-block;
    padding: 0;
    height: 23px;
    width: 23px;
    border-radius: 50%;
    background: #3f3f3f;
    text-align: center;
    font-size: 1.3em;
    cursor: pointer;
    float: right;
    margin-right: 1%;
    -webkit-backface-visibility: hidden;
    transition: border-radius 0.5s linear, background 0.5s linear, color 0.5s linear;
}

.global:hover {
    color: #CFF2F2;
    transition: border-radius 0.5s linear, background 0.5s linear, color 0.5s linear;
    background: black;
    border-radius: 15%;
}

.globalSvg{
    width: 80%;
    height: 80%;
    padding-top: 8%;
}

.btn {
  background: white;
  color: #555;
  text-align: center;
  font-size: 1.12em;
  cursor: pointer;
  transition: 0.3s;
  border-radius: 0;
  padding: 0 2% 0.7%;
  margin-left: 1%;
  color: #3f3f3f;
  border-style: solid;
  border-width: thin;
  border-color: #3f3f3f;
}

.btn:hover {
  background-color: #CFF2F2;
}

@supports (-moz-appearance:none) {
	
    .globalSvg {
		width: 82%;
        height: 81%;
	}
}

</style>
