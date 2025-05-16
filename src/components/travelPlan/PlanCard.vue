<template>
  <div
    class="plan-item w-full rounded-lg p-4 mb-3 shadow-sm select-none"
    :class="statusClasses"
  >
    <div class="flex justify-between items-center mb-2">
      <h3 class="font-medium text-gray-900">{{ plan.name }}</h3>
      <div class="flex items-center gap-2">
        <span
          class="text-xs px-2 py-1 rounded-full"
          :class="statusBadgeClasses"
        >
          {{ statusText }}
        </span>
        <van-button
          round
          size="small"
          @click="showMarkSheet = true"
          class="text-gray-500"
        >
          操作
        </van-button>
      </div>
    </div>

    <!-- 位置信息 -->
    <div class="flex items-center text-sm text-gray-600 mb-2">
      <van-icon
        name="location-o"
        size="14"
        class="mr-1"
      />
      <span>{{ plan.location.address }}</span>
    </div>

    <p class="text-sm text-gray-600 mb-2">{{ plan.description }}</p>

    <!-- 进度条 -->
    <div
      v-if="status === 'in-progress'"
      class="progress-bar-container h-2 bg-gray-200 rounded-full"
    >
      <div
        class="progress-bar h-full rounded-full"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>

    <!-- 时间显示 -->
    <div class="flex justify-between text-xs text-gray-500 mt-2">
      <div class="flex items-center">
        <van-icon
          name="clock-o"
          size="12"
          class="mr-1"
        />
        <span>{{ startTime.date }}</span>
        <span class="ml-1 font-medium">{{ startTime.time }}</span>
      </div>
      <div class="flex items-center">
        <van-icon
          name="clock-o"
          size="12"
          class="mr-1"
        />
        <span>{{ endTime.date }}</span>
        <span class="ml-1 font-medium">{{ endTime.time }}</span>
      </div>
    </div>

    <!-- 状态提示 -->
    <div
      v-if="status === 'upcoming'"
      class="mt-2 text-xs text-yellow-600 flex items-center"
    >
      <van-icon
        name="warning-o"
        size="12"
        class="mr-1"
      />
      计划即将在 {{ timeUntilStart }} 后开始
    </div>
    <div
      v-else-if="status === 'not-started'"
      class="mt-2 text-xs flex items-center"
    >
      <van-icon
        name="clock-o"
        size="12"
        class="mr-1"
      />
      {{ timeUntilStart }} 后开始
    </div>

    <div
      v-if="isCanceled"
      class="mt-2 text-xs text-red-600 flex items-center"
    >
      <van-icon
        name="info-o"
        size="12"
        class="mr-1"
      />
      此计划已取消
    </div>
    <van-action-sheet
      teleport="body"
      v-model:show="showMarkSheet"
      :description="plan.name"
      :actions="markSheetActions"
      cancel-text="取消"
      close-on-click-action
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, triggerRef } from "vue";

import { getPlanStatus, getProgressPercentage } from "@/utils/planUtils";

import { TravelPlan } from "@/data/TravelPlan";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";

const props = defineProps<{
  plan: TravelPlan;
}>();

const emit = defineEmits(["update-plan", "cancel-plan"]);

const store = useStore();
const { now } = storeToRefs(store);

const status = computed(() => getPlanStatus(props.plan, now.value.getTime()));
const progress = computed(() =>
  getProgressPercentage(props.plan, now.value.getTime())
);
const isCanceled = computed(() => props.plan.isCancelled);

const showMarkSheet = ref(false);
const markSheetActions = computed(() => {
  const actions = [];
  if (props.plan.isCancelled) {
    actions.push({
      name: "撤销取消",
      icon: "revoke",
      callback: () => {
        props.plan.isCancelled = false;
      },
    });
  } else {
    if (props.plan.isManuallyCompleted) {
      actions.push({
        name: "撤销完成",
        icon: "revoke",
        callback: () => {
          props.plan.isManuallyCompleted = false;
        },
      });
    } else {
      actions.push({
        name: "标记完成",
        icon: "success",
        color: "green",
        callback: () => {
          props.plan.isManuallyCompleted = true;
        },
      });
      actions.push({
        name: "延长一天",
        icon: "clock-o",
        color: "var(--color-yellow-600)",
        callback: () => {
          props.plan.endTime += 24 * 60 * 60 * 1000;
          store.refreshPlans();
        },
      });
    }
    actions.push({
      name: "取消计划",
      icon: "delete-o",
      color: "red",
      callback: () => {
        props.plan.isCancelled = true;
      },
    });
  }
  return actions;
});

const statusClasses = computed(() => {
  if (isCanceled.value) return "bg-gray-100 border border-gray-300 opacity-60";

  return {
    "not-started": "bg-gray-50 border border-gray-200",
    upcoming: "bg-yellow-50 border border-yellow-200",
    "in-progress": "bg-green-50 border border-green-200",
    completed: "bg-blue-50 border border-blue-200",
    expired: "bg-red-50 border border-red-200",
  }[status.value];
});

const statusBadgeClasses = computed(() => {
  if (isCanceled.value) return "bg-gray-200 text-gray-700";

  return {
    "not-started": "bg-gray-100 text-gray-800",
    upcoming: "bg-yellow-100 text-yellow-800",
    "in-progress": "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    expired: "bg-red-100 text-red-800",
  }[status.value];
});

const statusText = computed(() => {
  if (isCanceled.value) return "已取消";

  return {
    "not-started": "未开始",
    upcoming: "即将开始",
    "in-progress": "进行中",
    completed: "已完成",
    expired: "已过期",
  }[status.value];
});

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
};

const startTime = computed(() => formatTime(props.plan.startTime));
const endTime = computed(() => formatTime(props.plan.endTime));

const timeUntilStart = computed(() => {
  const diff = props.plan.startTime - now.value.getTime();

  if (diff <= 0) return "";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}天`;
  } else if (hours >= 1) {
    return `${hours}小时${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
});
</script>

<style scoped>
.progress-bar {
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  transition: width 1s ease;
  will-change: width;
}

.plan-item.canceled {
  position: relative;
}

.plan-item.canceled::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    transparent 0%,
    transparent 45%,
    rgba(0, 0, 0, 0.05) 45%,
    rgba(0, 0, 0, 0.05) 55%,
    transparent 55%,
    transparent 100%
  );
  background-size: 6px 6px;
  pointer-events: none;
}
</style>
