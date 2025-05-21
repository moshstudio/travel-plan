<template>
  <div class="fixed right-4 bottom-4 z-10">
    <button
      class="flex items-center justify-center rounded-full shadow-lg transition-all active:scale-95 focus:outline-none"
      :class="[sizeClasses, colorClasses, disabledClasses]"
      :disabled="disabled"
      @click="handleClick"
    >
      <vant-icon
        :name="icon"
        :size="iconSize"
      />
    </button>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

interface Props {
  icon: string;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "success" | "warning" | "danger";
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  color: "primary",
  disabled: false,
});

const emit = defineEmits(["click"]);

const sizeClasses = computed(() => {
  const sizes = {
    sm: "h-12 w-12",
    md: "h-14 w-14",
    lg: "h-16 w-16",
  };
  return sizes[props.size];
});

const iconSize = computed(() => {
  const sizes = {
    sm: "20px",
    md: "24px",
    lg: "28px",
  };
  return sizes[props.size];
});

const colorClasses = computed(() => {
  const colors = {
    primary: "bg-blue-500 text-white hover:bg-blue-600",
    success: "bg-green-500 text-white hover:bg-green-600",
    warning: "bg-yellow-500 text-white hover:bg-yellow-600",
    danger: "bg-red-500 text-white hover:bg-red-600",
  };
  return colors[props.color];
});

const disabledClasses = computed(() =>
  props.disabled ? "opacity-50 cursor-not-allowed" : ""
);

const handleClick = (e: MouseEvent) => {
  if (!props.disabled) {
    emit("click", e);
  }
};
</script>
