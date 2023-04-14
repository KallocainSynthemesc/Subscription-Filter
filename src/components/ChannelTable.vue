<template>
    <div class="table-list">
        <div v-bind:class="{'draggable': dragStarted(), 'dragging' : isDragging(channel.position)}" v-for="channel in orderedTableData" :key="channel.position">
            <table class="table" v-bind:id="channel.channelName">
                <tr class="tablerow" v-bind:id="channel.position">
                    <td class="draggable" @mousedown='mouseDownHandler(channel.position, $event)'><img v-bind:src="calcIcon(channel)" class="icon " v-bind:class="{'greyscale': channel.switchedOff}"></td>
                    <td><input :ref="channel.channelName" type="text" class="banner " v-bind:value="channel.channelName" v-bind:style="{backgroundImage: setBackground(channel)}"
                    v-bind:class="{'greyscale': channel.switchedOff}" readonly="readonly" @click="goTo(channel)"
                    v-bind:title="getMessage('banner_title')" placeholder="search..."></td>
                    <td v-show="channel.isBlacklistActive" @click="activateFilterModal(channel)">
                        <div class="button beast blacklist" v-bind:title="getMessage('blacklist_title')">blacklist</div>
                    </td>
                    <td v-show="!channel.isBlacklistActive" @click="activateFilterModal(channel)">
                        <div class="button whitelist" v-bind:title="getMessage('whitelist_title')">whitelist</div>
                    </td>
                    <td>
                        <div class="button dot" v-bind:title="getMessage('dot_title')" @click="changeActiveFilterList(channel)">🞇</div>
                    </td>
                    <td><div class="button trash" v-bind:title="getMessage('trash_title')" @click="removeFilter(channel)">&#x1f5d1;</div></td>
                    <td><label class="switch" v-bind:title="getMessage('switch_title')"><input class="square" type="checkbox" v-model="channel.switchedOff" @click="switched(channel)"><span class="slider round"></span></label></td>
                </tr>
            </table>
        </div>
    </div>
</template>

<script>
import _ from 'lodash';
import { quantization, buildRgb, invertColor} from '@/components/colorUtils.js'

export default {
  name: 'ChannelTable',
  data() {
        return {
            draggingRowIndex: 0,
            mousePositionX: 0,
            mousePositiony: 0,
            isDraggingStarted: false,
            placeholder: null,
            draggingEle: null
        }
  },
  props: {
        tabledata: {
            type: Array,
            required: true
        }
  },
  
  computed: {
      orderedTableData: function () {
        return _.orderBy(this.tabledata, 'position')
      }
  },

  methods:{
        calcIcon(channel)
        {
            if(channel.iconHref === undefined)
            {
                return "https://yt3.ggpht.com/a/AATXAJx1YDDrq3XsfwU5f5Mh-JqNp0JKz9gnZB2p=s100-c-k-c0xffffffff-no-rj-mo"
            }
            else
            {
                return channel.iconHref;
            }
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
            this.calcBackground(channel)
                .then((colorMap) => {
                    this.$nextTick(() => {
                        let elem = this.$refs[channel.channelName][0];
                        if(elem !== undefined ){
                            const inverted = invertColor(colorMap[10].r, colorMap[10].g, colorMap[10].b);
                            elem.style.backgroundColor = 'rgba('+colorMap[10].r+','+colorMap[10].g+','+colorMap[10].b+')';
                            elem.style.color = inverted;
                        }
                    });
                })
                .catch((error) => {
                    console.error("Failed to calculate background color", error);
                });
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

        changeActiveFilterList(channel)
        {
            channel.isBlacklistActive = !channel.isBlacklistActive //send event to parent;
            this.$emit('saveChanneInStore', channel);
            return channel.isBlacklistActive;
        },
        
        isAbove(nodeA, nodeB) {
            const rectA = nodeA.getBoundingClientRect();
            const rectB = nodeB.getBoundingClientRect();

            return (rectA.top + rectA.height / 2 < rectB.top + rectB.height / 2);
        },
        
        swap(nodeA, nodeB) {
            const parentA = nodeA.parentNode;
            const siblingA = nodeA.nextSibling === nodeB ? nodeA : nodeA.nextSibling;
            
            nodeB.parentNode.insertBefore(nodeA, nodeB);
            parentA.insertBefore(nodeB, siblingA);
        },
        
        mouseDownHandler(index, event) {
            this.draggingRowIndex = index;

            this.mousePositionX = event.clientX;
            this.mousePositiony = event.clientY;
            document.addEventListener('mousemove', this.mouseMoveHandler, event);
            document.addEventListener('mouseup', this.mouseUpHandler);
        },
        
        mouseMoveHandler(event) {
            if (!this.isDraggingStarted) {
                this.isDraggingStarted = true;
                this.draggingEle = [].slice.call(this.$el.children)[this.draggingRowIndex];
                this.placeholder = document.createElement('div');
                this.draggingEle.parentNode.insertBefore(this.placeholder, this.draggingEle.nextSibling);
                this.placeholder.style.height = `${this.draggingEle.offsetHeight}px`;
                this.placeholder.style.backgroundColor = "#edf2f7"
                this.placeholder.style.border = "1px dashed #cbd5e0";
            }

            this.draggingEle.style.position = 'absolute';
            this.draggingEle.style.top = `${this.draggingEle.offsetTop + event.clientY - this.mousePositiony}px`;
            this.draggingEle.style.left = `${this.draggingEle.offsetLeft + event.clientX - this.mousePositionX}px`;

            this.mousePositionX = event.clientX;
            this.mousePositiony = event.clientY;

            const prevEle = this.draggingEle.previousElementSibling;
            const nextEle = this.placeholder.nextElementSibling;
            
            if (prevEle && this.isAbove(this.draggingEle, prevEle)) {
                this.swap(this.placeholder, this.draggingEle);
                this.swap(this.placeholder, prevEle);
                return;
            }

            if (nextEle && this.isAbove(nextEle, this.draggingEle)) {
                this.swap(nextEle, this.placeholder);
                this.swap(nextEle, this.draggingEle);
            }
        },
        
        mouseUpHandler() {
            if (this.isDraggingStarted) {
                document.removeEventListener('mousemove', this.mouseMoveHandler);
                document.removeEventListener('mouseup', this.mouseUpHandler);
                document.removeEventListener('movedown', this.mouseUpHandler);
                this.placeholder && this.placeholder.parentNode.removeChild(this.placeholder);
                this.draggingEle.style.removeProperty('top');
                this.draggingEle.style.removeProperty('left');
                this.draggingEle.style.removeProperty('position');
                
                this.isDraggingStarted = false;
                this.draggingRowIndex = 0;
                this.reIndexTable();
            }
        },
            
        dragStarted()
        {
            return this.isDraggingStarted;
        },
        
        isDragging(idx)
        {
            if(idx === this.draggingRowIndex && this.isDraggingStarted)
            {
                return true;
            }
            return false;
        },
        
        reIndexTable()
        {
            var rows;
            rows = this.$el.children;
            Array.from(rows).forEach((item, index) => {
              this.$emit('updateChannelIndex', item, index);
            })
            this.$emit('forceRerender');
        },
        
        activateFilterModal(channel)
        {
            this.$emit('activateFilterModal', channel);
        },
        
        removeFilter(channel)
        {
            this.$emit('removeFilter', channel);
        },
        
        switched(channel)
        {
            channel.switchedOff = !channel.switchedOff;
            this.$emit('saveFilterModal', channel);
        },
        
        goTo(channel)
        {
            window.open("https://www.youtube.com" + channel.href + "/videos");
        },
        
        getMessage(msg)
        {
            return chrome.i18n.getMessage(msg);
        }
    }
}
</script>

<style scoped>
.table{
  width:97%;
  border-spacing:1px;
}

.draggable {
	cursor: move;
	user-select: none;
}

.dragging {
	background: #fff;
	border-top: 1px solid #ccc;
	z-index: 999;
}

.placeholder {
	background-color: #edf2f7;
	border: 1px dashed #cbd5e0;
}

.icon {
    height:23px;
	display: block;
	border-radius: 50%;
	width: 23px;
    margin: auto;
    -webkit-backface-visibility: hidden;
    transition: border-radius 0.5s linear;
}

.icon:hover {
    transition: border-radius 0.5s linear;
    border-radius: 15%;
}

.banner {
  text-align: center;
  background-size: 100%;
  cursor: pointer;
  border: none;
  height: 23px;
  width: 237px;
  text-align: left;
  text-indent:3%;
}

.banner:hover
{
  animation-name: expand;
  animation-duration: 4s;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}

@keyframes expand {
    from {background-size: 100%;}
    to {background-size: 300%;}
}

.blacklist:hover {
  background-color: #0F3B3D;
}

.blacklist {
  background-color: #181818;
  color: white;
  height: 20px;
  width: 133px;
  padding-top: 3.5%;
}

.whitelist:hover {
  background-color: #CFF2F2;
}

.whitelist {
  padding-top: 3.5%;
  background-color: white;
  height: 20px;
  width: 133px;
}

.dot {
	width: 23px;
	height: 100%;
	border-radius: 50%;
	background: #3f3f3f;
	color: white;
	text-align: center;
	font-size: 1.3em;
	cursor: pointer;
	padding-bottom: 6%;
    padding-left: 1%;
    -webkit-backface-visibility: hidden;
    transition: border-radius 0.5s linear, background 0.5s linear, color 0.5s linear;
}

.dot:hover {
    color: #CFF2F2;
    transition: border-radius 0.5s linear, background 0.5s linear, color 0.5s linear;
    color: #CFF2F2;
    background: black;
    border-radius: 15%;
}

.switch {
  position: relative;
  display: inline-block;
  width: 2.3em;
  height: 1.4em;
}

.switch .square {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 75%;
  width: 42%;
  left: 7%;
  bottom: 12%;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

.square:checked + .slider {
  background-color: rgba(2,0,36,1);
}

.square:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

.square:checked + .slider:before {
  -webkit-transform: translateX(1em);
  -ms-transform: translateX(1em);
  transform: translateX(1em);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

.greyscale{
    filter : grayscale(90%);
	opacity: 0.7;
}
</style>
