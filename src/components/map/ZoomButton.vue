<template>
  <div class="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
    <van-icon
      name="plus"
      class="text-[24px] text-gray-700 bg-white rounded-full p-2 shadow-md cursor-pointer transition-all duration-300 hover:bg-gray-100 active:bg-gray-200"
      @click="zoomIn"
    />
    <van-icon
      name="minus"
      class="text-[24px] text-gray-700 bg-white rounded-full p-2 shadow-md cursor-pointer transition-all duration-300 hover:bg-gray-100 active:bg-gray-200"
      @click="zoomOut"
    />
  </div>
</template>

<script setup lang="ts">
import "vant/es/icon/style";
import type Map from "ol/Map";

interface Props {
  map?: Map;
  zoomDuration?: number;
  zoomDelta?: number;
}

const props = withDefaults(defineProps<Props>(), {
  zoomDuration: 250,
  zoomDelta: 1,
});

const zoomIn = () => {
  if (!props.map) return;
  const view = props.map.getView();
  const currentZoom = view.getZoom();
  if (currentZoom !== undefined) {
    view.animate({
      zoom: currentZoom + props.zoomDelta,
      duration: props.zoomDuration,
    });
  }
};

const zoomOut = () => {
  if (!props.map) return;
  const view = props.map.getView();
  const currentZoom = view.getZoom();
  if (currentZoom !== undefined) {
    view.animate({
      zoom: currentZoom - props.zoomDelta,
      duration: props.zoomDuration,
    });
  }
};
</script>
