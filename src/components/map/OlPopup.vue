<template>
  <div
    v-if="visible"
    ref="popup"
    class="popup-container"
    :style="popupStyle"
    @click="emit('click')"
  >
    <Icon
      v-if="icon"
      :icon="icon"
      :color="iconColor"
      :width="description ? 20 : 16"
      :height="description ? 20 : 16"
      class="shrink-0"
    />

    <div class="popup-content">
      <div class="popup-header">
        <p
          v-if="title"
          class="popup-title"
        >
          {{ title }}
        </p>
        <div
          v-if="$slots.default"
          class="popup-slot"
        >
          <slot></slot>
        </div>
        <van-icon
          v-if="clickable"
          name="arrow"
          size="13"
          class="popup-arrow"
        />
      </div>
      <p
        v-if="description"
        class="popup-description"
      >
        {{ description }}
      </p>
    </div>

    <van-icon
      v-if="closable"
      name="cross"
      class="popup-close"
      @click.stop="closePopup"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount,
  computed,
  watch,
  nextTick,
} from "vue";
import Overlay from "ol/Overlay";
import { Icon } from "@iconify/vue";

interface Props {
  position: {
    lng: number;
    lat: number;
  };
  visible: boolean;
  id: string;
  title?: string;
  description?: string;
  icon?: string;
  iconColor?: string;
  repeatOffset?: number;
  closable?: boolean;
  clickable?: boolean;
  shadowColor?: string;
  borderColor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  closable: true,
  clickable: false,
  shadowColor: "#cbd5e1", // gray-300
  borderColor: "#e2e8f0", // gray-200
  iconColor: "#3b82f6", // blue-500
});

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "close"): void;
  (e: "overlay-created", overlay: Overlay): void;
  (e: "click"): void;
}>();

const popup = ref<HTMLElement | null>(null);
let overlay: Overlay | null = null;

const verticalOffset = computed(() => {
  const baseOffset = props.description ? -44 : -30;
  const offsetStep = props.repeatOffset || 28;
  const count = getOverlappingPopupCount();
  return baseOffset - count * offsetStep;
});

const popupStyle = computed(() => ({
  boxShadow: `0 0 2px ${props.shadowColor}`,
  border: `1px solid ${props.borderColor}`,
}));

const closePopup = () => {
  emit("update:visible", false);
  emit("close");
};

const getOverlappingPopupCount = () => {
  const event = new CustomEvent("get-popup-count", {
    detail: { position: props.position, id: props.id, count: undefined },
    bubbles: true,
    composed: true,
  });
  popup.value?.dispatchEvent(event);
  return event.detail.count || 0;
};

onMounted(async () => {
  if (!popup.value) return;
  await nextTick();
  overlay = new Overlay({
    element: popup.value,
    positioning: "top-center",
    stopEvent: true,
    offset: [0, verticalOffset.value],
    // autoPan: { animation: { duration: 250 } },
  });
  emit("overlay-created", overlay);
});

watch(verticalOffset, (newOffset) => {
  overlay?.setOffset([0, newOffset]);
});

onBeforeUnmount(() => {
  overlay?.getMap()?.removeOverlay(overlay);
});
</script>

<style scoped>
.popup-container {
  position: absolute;
  background: white;
  border-radius: 0.5rem;
  min-width: 40px;
  max-width: 180px;
  z-index: 50;
  display: flex;
  align-items: center;
  padding: 0.25rem;
  cursor: default;
  user-select: none;
}

.popup-content {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  margin: 0 4px;
}

.popup-header {
  display: flex;
  align-items: center;
}

.popup-title {
  flex-grow: 1;
  font-size: 0.75rem;
  font-weight: bold;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popup-slot {
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popup-arrow {
  height: 13px;
  color: #6b7280;
}

.popup-description {
  font-size: 0.625rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popup-close {
  color: #6b7280;
  cursor: pointer;
}
</style>
