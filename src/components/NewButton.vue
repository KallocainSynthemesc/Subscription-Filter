<template>
   <div>
      <div style="position:relative">
         <input class="subscriber" type="text" v-bind:title="getMessage('new_input')" @blur="toggleClass()"
         placeholder="search..." v-model="selection" v-show="isInputActive"
         @keydown.enter = 'enter'
         @keydown.down = 'down'
         @keydown.up = 'up'
         @input = 'change'
         />
         <ul class="autocomplete" v-show="openSuggestion">
            <li v-for="(channel, idx) in matches" :key="idx"
               @click="suggestionClick(idx)"
               >
               <div class="selection_container" v-bind:style="{ backgroundImage: calcBackground(channel) }"
               @mouseover="current = idx"
               @mouseleave="current = null"
               @mousedown="enter"
               v-bind:class="{'active': isActive(idx)}">
                   <img class="selection_img" v-bind:src="calcIcon(channel)">
                   <div class="selection_font" >{{ channel.channelName }}</div>
               </div>
            </li>
         </ul>
      </div>
      <div class="button new" v-bind:title="getMessage('new_title')" @click="toggleClass()">New</div>
   </div>
</template>

<script>
export default {
    name: 'NewButton',
    data() {
        return {
            isInputActive: false,
            open: false,
            current: null,
            selection: '',
            hover: false
        }
    },
    
    props: {
        suggestions: {
            type: Array,
            required: true
        }
    },
    
    computed: {
        
        matches() {
            return this.suggestions.filter((channel) => {
                return channel.channelName.substr(0, this.selection.length).toUpperCase() == this.selection.toUpperCase();
            });
        },

        openSuggestion() {
                        
            return this.selection !== "" &&
                   this.matches.length != 0 &&
                   this.open === true;
        }
    },
    
    methods: {
        enter() {
            this.toggleClass()
            this.$emit('suggestionSelected', this.matches[this.current])
            this.selection = "";
            this.current = null;
            this.open = false;
            this.toggleClass();
        },

        up() {
            if(this.current === 0)
                this.current = null;
            else if(this.current > 0)
                this.current--;
        },

        down() {
            if(this.current === null)
                this.current = 0;
            else if(this.current < this.matches.length - 1)
                this.current++;
        },

        isActive(index) {
            return index === this.current;
        },

        change() {
            if (this.open == false) {
                this.open = true;
                this.current = 0;
            }
        },

        suggestionClick(index) {
            this.selection = this.matches[index];
            this.open = false;
            this.toggleClass();
        },
        
        toggleClass() {
            this.open = false;
            this.isInputActive = !this.isInputActive;
        },
        
        calcBackground(channel)
        {
            var urlString = 'url(' + channel.banner + ')';
			return "linear-gradient(to left, rgba(255,255,255,0.2) 6%,rgba(255,255,255,1))," + urlString;
        },
        
        calcIcon(channel)
        {
			return channel.iconHref;
        },
        
        getMessage(msg)
        {
            return chrome.i18n.getMessage(msg);
        }
    }
}
</script>

<style scoped>

.new{
    width: 73.8%;
    height: 15px;
    margin-left: 5.8%;
    margin-top: 0.5%;
    background-color: white;
    padding: 1%;
}
.new:hover {
  background-color: #CFF2F2;
}

.subscriber {
    text-align: center;
    cursor: pointer;
    padding: 0.56% 0% 0.56% 0%;
    border: none;
    width: 75.8%;
    margin-left: 5.8%;
    margin-top: 0.5%;
    margin-bottom: 0.3%;
    height: 21px;
    text-align: left;
    text-indent:3%;
    /*background: transparent;*/
    background-image: linear-gradient(to left, rgba(255,255,255,0) 5%,rgba(255,255,255,1)), url(https://yt3.ggpht.com/mnEtRpxaNh82gT-035ihaE-qnmxufhEA-XChoAwCpImVLycpMe0WOQgoW37CdWnMz-UZBTKRLo0=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj);
    background-size: 100%;
    background-color: rgba(255,255,255,0.1);
    background-blend-mode: lighten;
    background-position: center;
    text-shadow: 7px 7px 7px AliceBlue, 0 0 25px #CFF2F2, 0 0 5px #F5F5DC;
    /*background: -moz-linear-gradient(top,  rgba(30,87,153,1) 0%, rgba(53,111,172,1) 24%, rgba(86,145,200,0.7) 59%, rgba(125,185,232,0) 100%); /* FF3.6-15
    background: -webkit-linear-gradient(top,  rgba(30,87,153,1) 0%,rgba(53,111,172,1) 24%,rgba(86,145,200,0.7) 59%,rgba(125,185,232,0) 100%); /* Chrome10-25,Safari5.1-6
    background: linear-gradient(to bottom,  rgba(30,87,153,1) 0%,rgba(53,111,172,1) 24%,rgba(86,145,200,0.7) 59%,rgba(125,185,232,0) 100%); /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */
}

.open
{
    display: block;
}

.active
{
    background: DodgerBlue !important;
}

.selection_img
{
	max-width: 7%;
    display: block;
    margin-left: auto;
    margin-right: auto;
    border-radius: 50%;
    float: left;

}

.autocomplete {
    width: 75.8%;
    padding-left: 5.8%;
    margin-block-start: 0;
    margin-bottom: 1%;
}

.selection_container
{
    padding: 1% 1% 1% 1%;
    height: 2em;
}

.selection_font
{
	font: 400 13.3333px Arial;
    padding-top: 1.5%;
    padding-left: 8%;
}

@supports (-moz-appearance:none) {
	
    .new {
		width: 73.4%;
	}
	
	.subscriber{
        width: 75.3%;
    }
    
    .autocomplete{
        width: 75.3%;
    }
}

</style>
