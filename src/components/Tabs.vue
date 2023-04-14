<template>
    <div class="tab-container" v-bind:class="{'tab-container-shifted': isMovedToLeft}">
        <div v-show="isCollapsed && isMovedToLeft" class="arrow arrow-left" @click="moveTabsRight()">&#5130;</div>
        <li class="listtabs " id="page1"  v-for="(tab, idx) in firstFour" :key="idx"
        v-bind:class="[isActiveTab(tab) ? 'selected' : 'notselected' ]" @click="changeActiveTab(tab)" v-bind:title="tab.name">
            <div><input type="checkbox" class="checkboxInput" @click="switchChannel(tab)" v-model="tab.active"></div>
            <div class="inputContainer">	
            {{tab.name}}
            </div>
        </li>
        <div v-show="isCollapsed && isNotAtTheEnd" class="arrow arrow-right" @click="moveTabsLeft()">&#5125;</div>
    </div>
</template>

<script>
export default {
    name: 'Tabs',
    
    data() {
        return {
            startIndex: 0,
            endIndex: 3,
        }
    },
    
    props: {
        configuration: {
            type: Object,
            required: true
        },
        activeTab:{
            type: Number,
            required: true
        }
    },
    
    computed: {
        firstFour: function () {
            return this.configuration.tabs.filter((tab,idx) => idx >= this.startIndex && idx <= this.endIndex);
        },
        
        isCollapsed: function()
        {
            return this.configuration.tabs.length > 3;
        },
        
        isMovedToLeft: function()
        {
            return this.endIndex > 3;
        },
        
        isNotAtTheEnd: function()
        {
            return this.endIndex < this.configuration.tabs.length -1;
        }
    },
    
    methods: {
    
        switchChannel(tab)
        {
            this.$emit('switchChannel', tab);
            tab.active = !tab.active;
        },
        
        changeActiveTab(tab)
        {
            this.$emit('changeActiveTab', tab);
        },
        
        isActiveTab(tab)
        {
            return this.activeTab === tab.index;
        },
        
        moveTabsLeft()
        {
            this.startIndex = this.startIndex + 1;
            this.endIndex = this.endIndex + 1;
        },
        
        moveTabsRight()
        {
            this.startIndex = this.startIndex - 1;
            this.endIndex = this.endIndex - 1;
        },
    }
}
</script>

<style scoped>
.tab-container
{
    display: inline-block;
    margin-left: 26px;
}

.tab-container-shifted
{
   margin-left: 7px;
}

.listtabs
{
    display: inline-block;
    list-style-type:none;
    padding-top: 3px;
    padding-bottom: 3px;
    margin:2px;
    border-radius:0px 0px 5px 5px;
    cursor:pointer;
    width:91px;
    text-align: center;
}

.notselected
{
    background-color:#a0a0a0;
    color:#292A0A;	
}

.selected
{
    background-color: white;
    color:#292A0A;	
}

.inputContainer
{
    padding-top: 1px;
    margin-right: 5px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
}

.arrow
{
    color: white;
    display: inline-block;
    font-size: 1.7em;
    cursor: pointer;
}

.arrow-left
{
    margin-right: 0.2em;
}

.arrow-right{
    margin-left: 0.2em;
}

.arrow:hover {
  color: #CFF2F2;
}
</style>
