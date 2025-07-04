<template>
  <div
    v-show="visible"
    ref="overlayElement"
    class="absolute transform -translate-x-1/2 -translate-y-1/2 z-[999] origin-bottom pointer-events-none"
    :class="{
      'scale-0': isAnimating,
      'scale-100': !isAnimating,
      'transition-transform duration-500 ease-out': positionChanged,
    }"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28px"
      height="28px"
      viewBox="0 0 512 512"
    >
      <path
        fill="#bb1616"
        d="M256 0C149.3 0 64 85.3 64 192c0 36.9 11 65.4 30.1 94.3l141.7 215c4.3 6.5 11.7 10.7 20.2 10.7s16-4.3 20.2-10.7l141.7-215C437 257.4 448 228.9 448 192C448 85.3 362.7 0 256 0m0 298.6c-58.9 0-106.7-47.8-106.7-106.8S197.1 85 256 85s106.7 47.8 106.7 106.8S314.9 298.6 256 298.6m0-170.6c-35.4 0-64 28.6-64 64s28.6 64 64 64s64-28.6 64-64s-28.6-64-64-64"
      />
    </svg>
    <!-- <van-icon
      name="location"
      :size="32"
      class="bg-gradient-to-b from-red-500 to-red-800 bg-clip-text text-transparent drop-shadow-lg"
    /> -->
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import "vant/es/icon/style";
import type Map from "ol/Map";
import Overlay from "ol/Overlay";
import type { Coordinate } from "ol/coordinate";
import pWaitFor from "p-wait-for";
import { sleep } from "@/utils";
import { fromLonLat } from "ol/proj";

interface Props {
  map?: Map;
  position?: Coordinate;
  visible?: boolean;
  animate?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  animate: false,
});

const overlayElement = ref<HTMLElement | null>(null);
const overlay = ref<Overlay | null>(null);
const isAnimating = ref(true);
const positionChanged = ref(false);
const lastPosition = ref<Coordinate | undefined>(props.position);

// 初始化Overlay
onMounted(async () => {
  await nextTick();
  try {
    await pWaitFor(() => props.map !== undefined, {
      interval: 100,
      timeout: 10000,
    });
    await sleep(200);

    if (!overlayElement.value) return;

    overlay.value = new Overlay({
      element: overlayElement.value,
      position: props.position ? fromLonLat(props.position) : undefined,
      positioning: "top-center",
      offset: [0, -12],
    });

    props.map!.addOverlay(overlay.value as Overlay);

    // 初始显示动画
    setTimeout(() => {
      isAnimating.value = false;
    }, 500);
  } catch (error) {
    console.warn("等待map初始化失败", error);
  }
});

// 更新位置
watch(
  () => props.position,
  async (newPos?: Coordinate) => {
    if (!overlay.value) return;

    const isNewPosition =
      JSON.stringify(newPos) !== JSON.stringify(lastPosition.value);
    lastPosition.value = newPos;

    if (isNewPosition) {
      positionChanged.value = true;
      isAnimating.value = true;

      overlay.value.setPosition(newPos ? fromLonLat(newPos) : undefined);

      // 等待DOM更新后触发动画
      await nextTick();
      setTimeout(() => {
        isAnimating.value = false;
      }, 50);

      // 动画完成后重置状态
      setTimeout(() => {
        positionChanged.value = false;
      }, 500);
    }
  },
  { deep: true }
);

// 更新可见性
watch(
  () => props.visible,
  (isVisible) => {
    if (overlayElement.value) {
      overlayElement.value.style.display = isVisible ? "block" : "none";

      // 显示时触发动画
      if (isVisible) {
        isAnimating.value = true;
        setTimeout(() => {
          isAnimating.value = false;
        }, 500);
      }
    }
  }
);

// 清理Overlay
onUnmounted(() => {
  if (overlay.value) {
    props.map?.removeOverlay(overlay.value as Overlay);
  }
});
</script>
