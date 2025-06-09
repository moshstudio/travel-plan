<template>
  <div class="flex items-center">
    <p
      class="text-xs text-nowrap text-[var(--van-text-color-2)]"
      :style="labelStyle"
    >
      {{ label }}
    </p>
    <div class="flex-grow flex w-full items-center justify-end">
      <div
        class="relative flex gap-1 items-center bg-gray-100 rounded-full p-1 shadow-inner"
      >
        <div
          class="absolute h-6 bg-white rounded-full shadow-md transition-all duration-300 ease-in-out"
          :style="sliderStyle"
        ></div>
        <p
          v-for="option in options"
          :key="option.value"
          @click="selectOption(option.value)"
          class="relative z-10 flex-1 py-1 px-3 rounded-full text-xs transition-colors focus:outline-none cursor-pointer"
          :class="getOptionClasses(option.value)"
        >
          {{ option.label }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from "vue";
import type { CSSProperties } from "vue"; // 添加这行导入

interface Option {
  label: string;
  labelClass: string;
  value: string;
}

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    default: "优先级",
  },
  labelStyle: {
    type: Object as () => CSSProperties,
    default: () => ({}),
  },
  options: {
    type: Array as () => Option[],
    default: () => [
      { label: "低", value: "low" },
      { label: "中", value: "medium" },
      { label: "高", value: "high" },
    ],
  },
});

const emit = defineEmits(["update:modelValue"]);

const sliderStyle = computed(() => {
  const index = props.options.findIndex(
    (opt) => opt.value === props.modelValue
  );
  const width = 100 / props.options.length;
  return {
    width: `${width}%`,
    left: `${index * width}%`,
  };
});

function selectOption(value: string) {
  emit("update:modelValue", value);
}

function getOptionClasses(value: string): Record<string, boolean> {
  const isActive = props.modelValue === value;
  return {
    "text-gray-500": !isActive,
    "hover:text-gray-700": !isActive,
    [{
      low: `text-plan-priority-low`,
      medium: `text-plan-priority-medium`,
      high: `text-plan-priority-high`,
    }[value] || ""]: isActive,
  };
}
</script>

<style scoped>
/* 添加点击动画 */
button:active {
  transform: scale(0.95);
  transition: transform 0.1s ease;
}
</style>
