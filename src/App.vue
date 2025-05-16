<script setup lang="ts">
import { useStore } from "./store";
import { storeToRefs } from "pinia";
const store = useStore();
const { isDark } = storeToRefs(store);
</script>

<template>
  <van-config-provider
    :theme="isDark ? 'dark' : 'light'"
    class="w-screen h-screen overflow-hidden thin-scrollbar"
  >
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </van-config-provider>
</template>

<style scoped lang="less"></style>
