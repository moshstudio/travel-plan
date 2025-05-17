<script setup lang="ts">
import { useStore } from "./store";
import { storeToRefs } from "pinia";
const store = useStore();
const { isDark } = storeToRefs(store);
</script>

<template>
  <van-config-provider
    :theme="isDark ? 'dark' : 'light'"
    class="router-container w-screen h-screen overflow-hidden thin-scrollbar"
  >
    <router-view v-slot="{ Component, route }">
      <transition :name="(route.meta as any).transitionName">
        <keep-alive>
          <component
            :is="Component"
            :key="route.path"
          />
        </keep-alive>
      </transition>
    </router-view>
  </van-config-provider>
</template>

<style scoped lang="less">
.router-container {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.5s ease;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.slide-left-enter-from {
  transform: translateX(100%);
}

.slide-left-leave-to {
  transform: translateX(-100%);
}

.slide-right-enter-from {
  transform: translateX(-100%);
}

.slide-right-leave-to {
  transform: translateX(100%);
}
</style>
