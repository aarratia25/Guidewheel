import Vue from 'vue'
import Vuesax from 'vuesax'
import 'vuesax/dist/vuesax.css'
Vue.use(Vuesax)
import App from './App.vue'
import './assets/tailwind.css'
import './assets/styles.scss'

Vue.config.productionTip = false
new Vue({
  render: h => h(App)
}).$mount('#app')
