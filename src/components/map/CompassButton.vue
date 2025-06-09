<template>
  <div
    v-if="showCompass"
    class="absolute top-4 left-4 z-[1000]"
  >
    <button
      class="flex items-center justify-center w-[32px] h-[32px] p-2 bg-white rounded-full shadow-md cursor-pointer transition-all duration-300 hover:bg-gray-100 active:bg-gray-200 focus:outline-none"
      @click="resetNorth"
      aria-label="重置正北方向"
    >
      <svg
        t="1749264394384"
        class="icon"
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        p-id="8036"
        width="32"
        height="32"
        :style="{ transform: `rotate(${rotation}deg)` }"
      >
        <path
          d="M 864 64 l 0 128 l -128 -128 L 704 64 l -32 0 l 0 256 l 64 0 L 736 192 l 128 128 L 896 320 l 32 0 L 928 64 L 864 64 Z M 96 1024 l 384 -149.376 l 384 149.376 L 518.4 128 L 96 1024 Z"
          fill="#8a8a8a"
          p-id="8037"
        ></path>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import "vant/es/icon/style";
import type Map from "ol/Map";
import pWaitFor from "p-wait-for";
import { sleep } from "@/utils";

const props = defineProps<{
  map?: Map;
  rotationThreshold?: number; // 显示指南针的旋转角度阈值(度)
}>();

const rotation = ref(0);
const showCompass = ref(false);
const rotationThreshold = props.rotationThreshold ?? 1; // 默认1度阈值

const updateRotation = () => {
  const currentRotation =
    ((props.map?.getView().getRotation() || 0) * 180) / Math.PI;
  rotation.value = currentRotation;
  showCompass.value = Math.abs(currentRotation) >= rotationThreshold;
};

const resetNorth = () => {
  props.map?.getView().animate({
    rotation: 0,
    duration: 300,
  });
};

onMounted(async () => {
  try {
    await pWaitFor(() => props.map !== undefined, {
      interval: 100,
      timeout: 10000,
    });
    await sleep(200);
    // 初始更新
    updateRotation();
    // 监听视图旋转变化
    props.map?.getView().on("change:rotation", updateRotation);
  } catch (error) {
    console.warn("等待map初始化失败", error);
  }
});
</script>
