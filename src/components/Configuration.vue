<template>
  <div class="config-container">
    <div class="config-content"> 
        <strong class="config-header">{{this.getMessage('config_header')}}</strong><span class="closebtn" @click="closeConfiguration()">&times;</span>
        <div class="section-container">
            <strong class="config-subheader">{{this.getMessage('tabs_section')}}</strong>
            <li v-for="(tab, idx) in configuration.tabs" :key="idx" class="removeBullets">
                <input type="text" class="subscriber " v-model="tab.name">
                <div class="trash trashConfig" v-bind:title="getMessage('trash_title')" @click="removeTab(idx)">&#x1f5d1;</div>
            </li>
            <span class="btn config-btn" @click="newTab()" v-bind:title="getMessage('add')">Add</span>
        </div>
        <div class="section-container">
            <strong class="config-subheader">{{this.getMessage('filters_section')}}</strong>
            <div class="config-subsection">
                <div class="hideWatched"><input  class="checkboxInput" type="checkbox" @click="switchHideAndWatched()" v-model="configuration.hideWatched"></div>
                <div class="inputContainer hideWatched">	
                {{this.getMessage('hide_watched')}}
                </div>
                <div v-if="configuration.hideWatched">
                    <input type="range" id="volume" name="volume"
                        min="0" max="100" v-model="configuration.watchedPercentage">
                    <label for="volume">{{this.getMessage('hide_watched_percentage', configuration.watchedPercentage)}}</label>
                </div>
            </div>
            <div class="config-subsection">
                <div class="inputContainer hideWatched">	
                    <input class="checkboxInput" type="checkbox" v-model="configuration.globalFilter.isBlacklistActive">
                    {{this.getMessage('global_filter_blacklist_active')}}
                </div>
                <div class="inputContainer hideWatched">	
                    <input  class="checkboxInput" type="checkbox" v-model="isWhitelistActive"  >
                    {{this.getMessage('global_filter_whitelist_active')}}
                </div>
            </div>
        </div>
        <span class="btn config-btn" v-bind:title="getMessage('save')" @click="saveConfiguration()">Save</span>
    </div>
  </div>
</template>

<script>
export default {
    name: 'Configuration',
    
    props: {
        configuration: {
            type: Object,
            required: true
        }
    },
    
    computed: {

       isWhitelistActive:{
            get () {
                return !this.configuration.globalFilter.isBlacklistActive;
            },
            set()
            {
                this.configuration.globalFilter.isBlacklistActive = !this.configuration.globalFilter.isBlacklistActive;
            }
        },

    },

    methods: {
    
        switchHideAndWatched()
        {
            this.configuration.hideWatched = !this.configuration.hideWatched;
        },
        
        newTab()
        {
            this.$emit('newTab');
        },
        
        saveConfiguration()
        {
            this.$emit('saveConfiguration', this.configuration);
        },
        
        closeConfiguration()
        {
            this.$emit('closeConfiguration');
        },
        
        removeTab(idx)
        {
            this.$emit('removeTab', idx);
        },
        
        getMessage(msg, percentage)
        {
            if(typeof percentage !== "undefined") {
                return chrome.i18n.getMessage(msg, percentage);
            }
            else
            {
                return chrome.i18n.getMessage(msg);
            }
        },
    }
}
</script>

<style scoped>
.config-container {
  position: fixed; /* Stay in place */
  z-index: 1; /* Sit on top */
  /*padding-top: 1%; /* Location of the box */
  left: 0;
  top: 0;
  width: 100%; /* Full width */
  height: 100%; /* Full height */
  overflow: auto; /* Enable scroll if needed */
  background-color: rgb(0,0,0); /* Fallback color */
  background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
}

.config-content {
  background-color: #fefefe;
  margin: auto;
  border: 1px solid #888;
  /*padding: 1%;*/
  width: 80%;
  height: 96%;
  overflow: scroll;
}

.hideWatched
{
    display: inline-block;
}

.config-btn
{
    display:block;
    width: 30px;
    height: 18px;
    margin-top: 0.5%;
}

.removeBullets{
    list-style-type: none;
    padding-left: 1%;
}

.trashConfig{
    padding: 0;
    display: inline-block;
    margin-left: 1%;
}

.closebtn {
  color: black;
  font-weight: bold;
  float: right;
  font-size: 22px;
  line-height: 20px;
  cursor: pointer;
  transition: 0.3s;
}

.config-header{
    font-size: 18px;
    margin-left: 35%;
}

.config-subheader{
    font-size: 14px;
    margin-left: 35%;
}
.section-container{
    border-style: solid;
    margin: 1%;
    padding: 1%;
}

.config-subsection{
    border-style: solid;
    border-width: thin;
    margin: 1%;
}

</style>
