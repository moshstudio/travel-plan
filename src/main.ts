import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { DatePicker, TimePicker } from "vant";

import "@/styles/index.css";
import router from "@/router";

import "@vant/touch-emulator";
import "vant/es/date-picker/style";
import "vant/es/time-picker/style";
import "vant/es/toast/style";
import "vant/es/dialog/style";
import "vant/es/notify/style";
import createDatetime from "vue-datetime3";
import RememberScrollDirective from "./utils/directives/rememberScroll";

import "vue-datetime3/style.css";
import "@fortawesome/fontawesome-free/css/all.css";

const app = createApp(App);
app
  .use(createPinia())
  .use(router)
  .use(createDatetime())
  .use(DatePicker)
  .use(TimePicker)
  // .use(installTianDiTu, {
  //   v: "4.0", //目前只支持4.0版本
  //   tk: "bea0c0310f3478b0a79d7e594f741fa6",
  // })
  .directive("remember-scroll", RememberScrollDirective)
  .mount("#app");
