<template>
  <div class="modal">
    <div v-bind:class="[channel.isBlacklistActive ? 'modal-content-black' : 'modal-content' ]">
		<div :ref="channel.channelName" id="filterHeader" class="header" v-bind:style="{backgroundImage: setBackground(channel)}">
			<div>
				<h2 style="margin: 0% 0% 1%;">{{title}}</h2>
			</div>
			<input type="text" id="myInput" placeholder="Filter..." class="filter_input" v-model="selection">
			<span class="btn filterbtn" @click="addFilter()" v-bind:title="getMessage('add')">Add</span>
			<span class="btn filterbtn" @click="saveFilterModal()" v-bind:title="getMessage('save')">Save</span>
			<span class="btn filterbtn" @click="closeFilterModal()" v-bind:title="getMessage('close')">Close</span>
		</div>
        <div class="range_container">
          <div class="form_control" v-bind:class="{ 'greyscale': !timeActive }">
            <label v-bind:title="getMessage('switch_title')"><input type="checkbox" v-model="timeActive" @click="switched()"></label>
            <p style="margin: 1%;">{{this.getMessage('time_range_message')}}</p>
            <div>
                Min
                <input
                type="time"
                v-model="fromTime"
                min="00:00:00" 
                max="12:00:00"
                step='1'
                />
            </div>
            <div>
                Max
                <input
                type="time"
                v-model="toTime"
                min="00:00:00" 
                max="12:00:00"
                step='1'
                />
            </div>
          </div>
        </div>
		<ul class="removeBullets" v-for="(filter, idx) in filterList" :key="idx">
            <li>
                {{filter}}
                <span class="close" @click="deleteFromList(filter)">×</span>
            </li>
		</ul>
    </div>
  </div>
</template>

<script>
import { quantization, buildRgb, invertColor} from '@/components/colorUtils.js'

export default {
    name: 'FilterModal',
    data() {
        return {
            selection: '',
            fromTime : this.secondsToTime(this.channel.fromValue || 0),
            toTime: this.secondsToTime(this.channel.toValue || 43200),
            timeActive: this.channel.isTimeRangeActive !== undefined ? this.channel.isTimeRangeActive : false,
        }
    },    
    props: {
        channel: {
            type: Object,
            required: true
        }
    },
    watch: {
      fromTime(newVal){
        this.channel.fromValue = this.timeToSeconds(newVal);
        this.fromValue = this.secondsToTime(newVal);
        if (this.channel.fromValue >= this.toValue - 1) {
          this.toValue = this.channel.fromValue;
        }
      },
      toTime(newVal){
        this.channel.toValue = this.timeToSeconds(newVal);
        this.toValue = this.channel.toValue;
        if (this.channel.toValue <= this.fromValue + 1) {
          this.fromValue = this.channel.toValue;
        }
      }
    },
    computed: {
        filterList:{
            get () {
                if(this.channel.isBlacklistActive)
                {
                    return this.channel.blacklist;
                }
                else
                {
                    return this.channel.whitelist;
                }
            },
            set(val)
            {
                if(this.channel.isBlacklistActive)
                {
                    return this.channel.blacklist = val;
                }
                else
                {
                    return this.channel.whitelist = val;
                }
            }
        },

        title:{
            get()
            {
                if(this.channel.isBlacklistActive)
                {
                    return this.channel.channelName + " blacklist";
                }
                else
                {
                    return this.channel.channelName + " whitelist";
                }
            }
        }
    },
    
    methods: {
        secondsToTime(seconds) {
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          const remainingSeconds = seconds % 60;
          const result = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
          return result;
        },
        timeToSeconds(time) {
          const [hours, minutes, seconds] = time.split(':');
          let result = hours != undefined ? parseInt(hours, 10) * 60 * 60 : 0;
          result += minutes != undefined ? parseInt(minutes, 10) * 60 : 0;
          result += minutes != undefined ? parseInt(seconds, 10) : 0;
          return result;
        },
        extractPrimaryColors(img) {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const context = canvas.getContext("2d");
            context.drawImage(img, 0, 0);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const rgbArray  = buildRgb(data);
            const quantColors = quantization(rgbArray, 0);
            return quantColors;
        },

        setBackground(channel) {
            if(channel !== undefined && channel.iconHref !== undefined){
                this.calcBackground(channel)
                    .then((colorMap) => {
                        this.$nextTick(() => {
                            let elem = this.$refs[channel.channelName];
                            elem.style.backgroundColor = 'rgba('+colorMap[10].r+','+colorMap[10].g+','+colorMap[10].b+')';
                            const inverted = invertColor(colorMap[10].r, colorMap[10].g, colorMap[10].b);
                            elem.style.color = inverted;
                        });
                    })
                    .catch((error) => {
                        console.error("Failed to calculate background color", error);
                    });
            }
        },

        calcBackground(channel) {
            let func = this.extractPrimaryColors;
            return new Promise((resolve, reject) => {
                const img = new Image();
                let primaryColors;
                img.crossOrigin = "anonymous";  // This enables CORS
                img.onload = function () {
                    primaryColors = func(img);
                    resolve(primaryColors);
                };
                img.onerror = reject;
                img.src = channel.iconHref;
            });
        },
        
        deleteFromList(filter)
        {
            this.filterList = this.filterList.filter(item => item !== filter);
        },
        
        closeFilterModal()
        {
            this.$emit('closeFilterModal');
        },
        
        addFilter()
        {
            this.filterList.push(this.selection);
            this.selection = '';
        },
        
        saveFilterModal()
        {
            this.channel.fromValue = this.timeToSeconds(this.fromTime);
            this.channel.toValue = this.timeToSeconds(this.toTime);
            this.$emit('saveFilterModal', this.channel);
        },
        
        getMessage(msg)
        {
            return chrome.i18n.getMessage(msg);
        },
        switched()
        {
          console.log("this.channel.isTimeRangeActive" + this.channel.isTimeRangeActive);
          this.timeActive = !this.timeActive;
          this.channel.isTimeRangeActive = this.timeActive;
        },
    }
}
</script>

<style scoped>
.range_container {
  display: flex;
  flex-direction: column;
  width: 99%;
  margin-top: 1%;
}

.form_control {
  position: relative;
  display: flex;
  justify-content: space-between;
}

#fromSlider {
  height: 0;
  z-index: 1;
}

.modal {
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

/* Modal Content */
.modal-content {
  background-color: #fefefe;
  margin: auto;
  border: 1px solid #888;
  /*padding: 1%;*/
  width: 80%;
  height: 96%;
}

.modal-content-black {
  background-color: #3f3f3f;
  margin: auto;
  border: 1px solid #888;
  /*padding: 1%;*/
  width: 80%;
  height: 96%;
  color: white;
}

.header {
  background-color: white;
  padding: 0.5% 3%;
  color: #3f3f3f;
  text-align: center;
  background-position: center;
}

/* Clear floats after the header */
.header:after {
  content: "";
  display: table;
  clear: both;
}

.filter_input
{
	float: left;
	border-style: solid;
    border-width: thin;
    border-color: #3f3f3f;
	padding: 0.7%;
}

.filterbtn{
    float: right;
}

.close {
    float: right;
    padding-left: 10px;
    padding-right: 10px;
}

.close:hover {
  background-color: #CFF2F2;
}

.greyscale{
  filter : grayscale(90%);
	opacity: 0.5;
}
</style>
