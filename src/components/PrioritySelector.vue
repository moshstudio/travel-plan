<template>
  <van-cell
    title="优先级"
    center
  >
    <template #value>
      <van-button
        size="small"
        :color="priorityColor"
        plain
        round
        @click="showPrioritySheet = true"
      >
        <van-icon :name="priorityIcon" />
        {{ priorityText }}
      </van-button>
    </template>
  </van-cell>

  <van-action-sheet
    teleport="body"
    v-model:show="showPrioritySheet"
    :actions="priorityActions"
    cancel-text="取消"
    close-on-click-action
    title="选择优先级"
  />
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

type PriorityLevel = "high" | "medium" | "low";

interface Props {
  modelValue: PriorityLevel;
}

interface Emits {
  (e: "update:modelValue", value: PriorityLevel): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showPrioritySheet = ref(false);

// 优先级选项配置
const priorityActions = computed(() => [
  {
    name: "高优先级",
    color: props.modelValue === "high" ? "#ee0a24" : "",
    icon: "warning-o",
    className: props.modelValue === "high" ? "priority-high-active" : "",
    callback: () => updatePriority("high"),
  },
  {
    name: "中优先级",
    color: props.modelValue === "medium" ? "#ff976a" : "",
    icon: "flag-o",
    className: props.modelValue === "medium" ? "priority-medium-active" : "",
    callback: () => updatePriority("medium"),
  },
  {
    name: "低优先级",
    color: props.modelValue === "low" ? "#1989fa" : "",
    icon: "more-o",
    className: props.modelValue === "low" ? "priority-low-active" : "",
    callback: () => updatePriority("low"),
  },
]);

// 当前优先级的显示文本
const priorityText = computed(() => {
  const texts: Record<PriorityLevel, string> = {
    high: "高优先级",
    medium: "中优先级",
    low: "低优先级",
  };
  return texts[props.modelValue] || "选择优先级";
});

// 当前优先级的图标
const priorityIcon = computed(() => {
  const icons: Record<PriorityLevel, string> = {
    high: "warning-o",
    medium: "flag-o",
    low: "more-o",
  };
  return icons[props.modelValue] || "more-o";
});

// 当前优先级的颜色
const priorityColor = computed(() => {
  const colors: Record<PriorityLevel, string> = {
    high: "#ee0a24",
    medium: "#ff976a",
    low: "#1989fa",
  };
  return colors[props.modelValue] || "#1989fa";
});

// 更新优先级
const updatePriority = (priority: PriorityLevel) => {
  emit("update:modelValue", priority);
};
</script>

<style scoped>
.van-button {
  min-width: 100px;
}

.van-icon {
  margin-right: 4px;
  vertical-align: middle;
}
</style>

<style>
/* 全局样式，因为 ActionSheet 是挂载在 body 上的 */
.priority-high-active {
  font-weight: bold;
  background-color: #ffeeee !important;
}

.priority-medium-active {
  font-weight: bold;
  background-color: #fff6e9 !important;
}

.priority-low-active {
  font-weight: bold;
  background-color: #f0f9ff !important;
}

.van-action-sheet__item .van-icon {
  margin-right: 10px;
  vertical-align: middle;
}
</style>
