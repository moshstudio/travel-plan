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

    <!-- 优先级标记 -->
    <div
      v-if="plan.priority !== 'medium'"
      class="priority-flag"
      :class="priorityClasses"
    >
      {{ priorityText }}
    </div>

    <div class="card-content">
      <!-- 标题和状态区域 -->
      <div class="card-header">
        <h3 class="plan-title">{{ plan.title }}</h3>
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

      <!-- 标签区域 -->
      <div
        v-if="plan.tags && plan.tags.length > 0"
        class="tags-container"
      >
        <span
          v-for="(tag, index) in plan.tags"
          :key="index"
          class="tag"
        >
          {{ tag }}
        </span>
      </div>

      <!-- 位置信息 -->
      <div
        v-if="plan.location"
        class="location-info"
      >
        <van-icon
          name="location-o"
          class="location-icon"
        />
        <span class="location-text">{{ plan.location.name }}</span>
      </div>

      <!-- 描述信息 -->
      <p
        class="plan-description"
        v-if="plan.description"
      >
        {{ plan.description }}
      </p>

      <!-- 预算信息 -->
      <div
        v-if="plan.budget"
        class="budget-info"
      >
        <van-icon
          name="balance-o"
          class="budget-icon"
        />
        <span class="budget-text"
          >预算: ¥{{ plan.budget.toLocaleString() }}</span
        >
      </div>

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
            <span
              v-if="plan.isAllDay"
              class="all-day-badge"
              >全天</span
            >
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
      :description="plan.title"
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
import { TravelPlanStatus, TravelPlanType } from "@/data/TravelPlan";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import router from "@/router";
import { showConfirmDialog } from "vant";

const props = defineProps<{
  plan: TravelPlanType;
}>();

const emit = defineEmits(["update-plan", "cancel-plan"]);

const store = useStore();
const { now } = storeToRefs(store);

const status = computed(() => getPlanStatus(props.plan, now.value));
const progress = computed(() => getProgressPercentage(props.plan, now.value));
const isCancelled = computed(() => props.plan.status === "cancelled");
const isCompleted = computed(() => status.value === "completed");

const showMarkSheet = ref(false);

const markSheetActions = computed(() => {
  const actions = [];
  if (isCancelled.value) {
    actions.push({
      name: "撤销取消",
      icon: "revoke",
      callback: () => {
        props.plan.status = TravelPlanStatus.planned;
        store.updateTravelPlan(props.plan);
      },
    });
  } else {
    if (isCompleted.value) {
      actions.push({
        name: "撤销完成",
        icon: "revoke",
        callback: () => {
          props.plan.status = TravelPlanStatus.planned;
          store.updateTravelPlan(props.plan);
        },
      });
    } else {
      actions.push({
        name: "标记完成",
        icon: "success",
        color: "#10B981",
        callback: () => {
          props.plan.status = TravelPlanStatus.completed;
          store.updateTravelPlan(props.plan);
        },
      });
      actions.push({
        name: "延长一天",
        icon: "clock-o",
        color: "#1E90FF",
        callback: () => {
          props.plan.endDateTime += 24 * 60 * 60 * 1000;
          store.updateTravelPlan(props.plan);
        },
      });
    }
    actions.push({
      name: "取消计划",
      icon: "delete-o",
      color: "#FF8C00",
      callback: () => {
        props.plan.status = TravelPlanStatus.cancelled;
        store.updateTravelPlan(props.plan);
      },
    });
    actions.push({
      name: "删除计划",
      icon: "fail",
      color: "red",
      callback: () => {
        showConfirmDialog({
          title: "确定要删除此计划吗？",
          confirmButtonText: "确定",
        }).then(() => {
          props.plan.status = TravelPlanStatus.deleted;
          store.deleteTravelPlan(props.plan);
        });
      },
    });
  }
  return actions;
});

const statusClasses = computed(() => {
  if (isCancelled.value) return "cancelled";
  return status.value.toString();
});

const accentClasses = computed(() => {
  return {
    planned: "bg-gray-400",
    upcoming: "bg-yellow-400",
    "in-progress": "bg-green-400",
    completed: "bg-blue-400",
    expired: "bg-red-400",
    cancelled: "bg-gray-400",
    deleted: "bg-gray-400",
  }[status.value];
});

const statusBadgeClasses = computed(() => {
  return {
    planned: "bg-gray-100 text-gray-800",
    upcoming: "bg-yellow-100 text-yellow-800",
    "in-progress": "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    expired: "bg-red-100 text-red-800",
    cancelled: "bg-gray-200 text-gray-700",
    deleted: "bg-gray-100 text-gray-800",
  }[status.value];
});

const statusText = computed(() => {
  return {
    planned: "未开始",
    upcoming: "即将开始",
    "in-progress": "进行中",
    completed: "已完成",
    expired: "已结束",
    cancelled: "已取消",
    deleted: "已删除",
  }[status.value];
});

const priorityClasses = computed(() => {
  return {
    low: "bg-blue-100 text-blue-800",
    high: "bg-red-100 text-red-800",
    medium: "",
  }[props.plan.priority];
});

const priorityText = computed(() => {
  return {
    low: "低优先级",
    high: "高优先级",
    medium: "",
  }[props.plan.priority];
});

const statusHint = computed(() => {
  switch (status.value) {
    case "cancelled":
      return `此计划已取消`;
    case "upcoming":
      return `计划即将在 ${timeUntilStart.value} 后开始`;
    case "planned":
      return `${timeUntilStart.value} 后开始`;
    default:
      return null;
  }
});

const hintClasses = computed(() => {
  switch (status.value) {
    case "cancelled":
      return `text-red-500 bg-red-50`;
    case "upcoming":
      return `text-yellow-600 bg-yellow-50`;
    default:
      return `text-gray-600 bg-gray-50`;
  }
});

const hintIcon = computed(() => {
  switch (status.value) {
    case "cancelled":
      return `info-o`;
    case "upcoming":
      return `warning-o`;
    default:
      return `clock-o`;
  }
});

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
};

const startTime = computed(() => formatTime(props.plan.startDateTime));
const endTime = computed(() => formatTime(props.plan.endDateTime));

const timeUntilStart = computed(() => {
  const diff = props.plan.startDateTime - now.value.getTime();
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
  router.push({
    name: "EditPlan",
    params: {
      travelPlanId: props.plan.travelPlanId,
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
  border: 1px solid #f0f0f0;
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

.priority-flag {
  position: absolute;
  bottom: 12px; /* 替换原来的 top */
  right: -22px; /* 保持原定位逻辑 */
  width: 80px;
  padding: 2px 0;
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  transform: rotate(-45deg); /* 反向旋转 */
  z-index: 2;
}

.card-content {
  position: relative;
  z-index: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.plan-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
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
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.tag {
  font-size: 12px;
  padding: 2px 8px;
  background-color: #f3f4f6;
  color: #4b5563;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
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
  font-size: 14px;
  color: #4b5563;
  margin-bottom: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.budget-info {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 12px;
}

.budget-icon {
  margin-right: 6px;
  color: #9ca3af;
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
  font-size: 13px;
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

.all-day-badge {
  font-size: 11px;
  padding: 2px 6px;
  background-color: #f3f4f6;
  color: #6b7280;
  border-radius: 4px;
  margin-left: 6px;
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
.plan-card.planned {
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

.plan-card.cancelled {
  background-color: #f3f4f6;
  color: #9ca3af;
  position: relative;
}

.plan-card.cancelled::after {
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

/* 响应式设计 */
@media (max-width: 340px) {
  .time-range {
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
  }

  .time-separator {
    display: none;
  }

  .plan-title {
    font-size: 15px;
  }

  .status-badge {
    font-size: 11px;
    padding: 3px 6px;
  }
}
</style>
