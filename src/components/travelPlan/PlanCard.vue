<template>
  <div
    class="plan-card"
    :class="statusClasses"
    @click="handleCardClick"
  >
    <!-- 卡片顶部装饰条 -->
    <div
      class="card-accent"
      :class="accentClasses"
    ></div>

    <div class="card-content">
      <!-- 标题和状态区域 -->
      <div class="card-header">
        <h3 class="plan-title">{{ plan.name }}</h3>
        <div class="header-right">
          <div
            class="status-badge"
            :class="statusBadgeClasses"
          >
            {{ statusText }}
          </div>
          <van-button
            round
            size="mini"
            plain
            @click.stop="showMarkSheet = true"
            class="action-button"
          >
            <van-icon
              name="ellipsis"
              size="14"
            />
          </van-button>
        </div>
      </div>

      <!-- 位置信息 -->
      <div class="location-info">
        <van-icon
          name="location-o"
          class="location-icon"
        />
        <span class="location-text">{{ plan.location.address }}</span>
      </div>

      <!-- 描述信息 -->
      <p
        class="plan-description"
        v-if="plan.description"
      >
        {{ plan.description }}
      </p>

      <!-- 进度条 -->
      <div
        v-if="status === 'in-progress'"
        class="progress-container"
      >
        <div
          class="progress-bar"
          :style="{ width: `${progress}%` }"
        ></div>
        <span class="progress-text">{{ progress }}%</span>
      </div>

      <!-- 时间信息 -->
      <div class="time-info">
        <div class="time-item">
          <van-icon
            name="calendar-o"
            class="time-icon"
          />
          <div class="time-details">
            <span class="time-range">
              {{ startTime.date }} {{ startTime.time }}
              <span class="time-separator">→</span>
              {{ endTime.date }} {{ endTime.time }}
            </span>
          </div>
        </div>
      </div>

      <!-- 状态提示 -->
      <div
        v-if="statusHint"
        class="status-hint"
        :class="hintClasses"
      >
        <van-icon
          :name="hintIcon"
          class="hint-icon"
        />
        <span>{{ statusHint }}</span>
      </div>
    </div>

    <!-- 操作菜单 -->
    <van-action-sheet
      teleport="body"
      v-model:show="showMarkSheet"
      :description="plan.name"
      :actions="markSheetActions"
      cancel-text="取消"
      close-on-click-action
      class="action-sheet"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { getPlanStatus, getProgressPercentage } from "@/utils/planUtils";
import { TravelPlanType } from "@/data/TravelPlan";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import router from "@/router";

const props = defineProps<{
  plan: TravelPlanType;
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
        color: "#10B981",
        callback: () => {
          props.plan.isManuallyCompleted = true;
        },
      });
      actions.push({
        name: "延长一天",
        icon: "clock-o",
        color: "#1E90FF",
        callback: () => {
          props.plan.endTime += 24 * 60 * 60 * 1000;
          store.refreshPlans();
        },
      });
    }
    actions.push({
      name: "取消计划",
      icon: "delete-o",
      color: "#FF8C00",
      callback: () => {
        props.plan.isCancelled = true;
      },
    });
    actions.push({
      name: "删除计划",
      icon: "fail",
      color: "red",
      callback: () => {
        store.removePlan(props.plan.id);
      },
    });
  }
  return actions;
});

const statusClasses = computed(() => {
  if (isCanceled.value) return "canceled";

  return {
    "not-started": "not-started",
    upcoming: "upcoming",
    "in-progress": "in-progress",
    completed: "completed",
    expired: "expired",
  }[status.value];
});

const accentClasses = computed(() => {
  if (isCanceled.value) return "bg-gray-400";

  return {
    "not-started": "bg-gray-400",
    upcoming: "bg-yellow-400",
    "in-progress": "bg-green-400",
    completed: "bg-blue-400",
    expired: "bg-red-400",
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
    expired: "已结束",
  }[status.value];
});

const statusHint = computed(() => {
  if (isCanceled.value) return "此计划已取消";
  if (status.value === "upcoming")
    return `计划即将在 ${timeUntilStart.value} 后开始`;
  if (status.value === "not-started") return `${timeUntilStart.value} 后开始`;
  return null;
});

const hintClasses = computed(() => {
  if (isCanceled.value) return "text-red-500 bg-red-50";
  if (status.value === "upcoming") return "text-yellow-600 bg-yellow-50";
  return "text-gray-600 bg-gray-50";
});

const hintIcon = computed(() => {
  if (isCanceled.value) return "info-o";
  if (status.value === "upcoming") return "warning-o";
  return "clock-o";
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

const handleCardClick = () => {
  // 可以在这里添加卡片点击事件处理
  router.push({
    name: "EditPlan",
    params: {
      id: props.plan.id,
    },
  });
};
</script>

<style scoped>
.plan-card {
  position: relative;
  width: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 16px;
  margin-bottom: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.plan-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.card-accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
}

.card-content {
  position: relative;
  z-index: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start; /* 改为顶部对齐 */
  margin-bottom: 12px;
  gap: 8px; /* 添加间隙 */
}

.header-right {
  display: flex;
  align-items: center;
  gap: 6px; /* 按钮和状态标签之间的间隙 */
}

.plan-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px; /* 标题和右侧内容保持间距 */
}

.action-button {
  padding: 0 6px;
  min-width: 24px;
  height: 24px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #6b7280;
}

.status-badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
  white-space: nowrap;
  margin-left: 8px;
  align-self: center; /* 垂直居中 */
}

.location-info {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 10px;
}

.location-icon {
  margin-right: 6px;
  color: #9ca3af;
}

.plan-description {
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.progress-container {
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  margin-bottom: 12px;
  margin-top: 16px;
  position: relative;
}

.progress-bar {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  transition: width 0.6s ease;
}

.progress-text {
  position: absolute;
  right: 0;
  top: -18px;
  font-size: 11px;
  color: #10b981;
  font-weight: 500;
}

.time-info {
  display: flex;
  margin-top: 8px;
}

.time-item {
  display: flex;
  align-items: center;
  width: 100%;
}

.time-icon {
  margin-right: 8px;
  color: #9ca3af;
  font-size: 14px;
  flex-shrink: 0;
}

.time-details {
  flex: 1;
}

.time-range {
  font-size: 12px;
  color: #4b5563;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.time-separator {
  color: #9ca3af;
  margin: 0 4px;
  font-weight: normal;
}

/* 小屏幕适配 */
@media (max-width: 340px) {
  .time-range {
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
  }

  .time-separator {
    display: none;
  }
}

.status-hint {
  display: flex;
  align-items: center;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  margin-top: 10px;
}

.hint-icon {
  margin-right: 6px;
  font-size: 14px;
}

/* 不同状态下的卡片样式 */
.plan-card.not-started {
  border-left: 4px solid #9ca3af;
}

.plan-card.upcoming {
  border-left: 4px solid #f59e0b;
}

.plan-card.in-progress {
  border-left: 4px solid #10b981;
}

.plan-card.completed {
  border-left: 4px solid #3b82f6;
}

.plan-card.expired {
  border-left: 4px solid #ef4444;
}

.plan-card.canceled {
  background-color: #f3f4f6;
  color: #9ca3af;
  position: relative;
}

.plan-card.canceled::after {
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
    rgba(0, 0, 0, 0.03) 45%,
    rgba(0, 0, 0, 0.03) 55%,
    transparent 55%,
    transparent 100%
  );
  background-size: 6px 6px;
  pointer-events: none;
  border-radius: 12px;
}

.action-sheet :deep(.van-action-sheet__description) {
  text-align: center;
  font-weight: 500;
  color: #1f2937;
  padding: 12px 16px;
}
</style>
