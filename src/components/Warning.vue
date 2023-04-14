<template>
    <div class="alert">
        <span class="closebtn" @click="closeWarning()">&times;</span> 
        <strong>{{this.getMessage('warning')}}</strong> {{this.getMessage('warning_message')}}
    </div>
</template>

<script>
export default {
    name: 'Warning',
    
    methods: {
        
        closeWarning()
        {
            this.$emit('closeWarning');
        },
        
        getMessage(msg)
        {
            return chrome.i18n.getMessage(msg);
        }
    }
}
</script>

<style scoped>
.alert {
  padding: 20px;
  background-color: #f44336;
  color: white;
  margin-top: 1%;
  margin-left: 0.8%;
}

.closebtn {
  margin-left: 15px;
  color: white;
  font-weight: bold;
  float: right;
  font-size: 22px;
  line-height: 20px;
  cursor: pointer;
  transition: 0.3s;
}

.closebtn:hover {
  color: black;
}
</style>
