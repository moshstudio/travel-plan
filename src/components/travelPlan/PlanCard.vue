<template>
  <div
    class="plan-card relative w-full bg-white rounded-xl shadow-sm p-4 mb-4 overflow-hidden transition-all duration-300 active:scale-[0.98] border border-gray-100"
    :class="statusClasses"
    @click="handleCardClick"
  >
    <!-- 卡片顶部装饰条 -->
    <div
      class="card-accent absolute top-0 left-0 w-1 h-full"
      :class="accentClasses"
    ></div>

    <!-- 优先级标记 -->
    <div
      v-if="plan.priority !== 'medium'"
      class="priority-flag absolute bottom-3 -right-5 w-20 py-0.5 text-center text-xs font-medium transform -rotate-45 z-100"
      :class="priorityClasses"
    >
      {{ priorityText }}
    </div>

    <div class="card-content relative z-10">
      <!-- 标题和状态区域 -->
      <div class="card-header flex justify-between items-start mb-3 gap-2">
        <h3
          class="plan-title flex-1 text-base font-semibold text-gray-800 truncate mr-2"
        >
          {{ plan.title || plan.location.name }}
        </h3>
        <div class="header-right flex items-center gap-1.5">
          <div
            class="status-badge text-xs px-2 py-1 rounded-xl font-medium whitespace-nowrap ml-2"
            :class="statusBadgeClasses"
          >
            {{ statusText }}
          </div>
          <van-button
            round
            size="mini"
            plain
            @click.stop="showMarkSheet = true"
            class="action-button p-0 w-6 h-6 min-w-6 border border-gray-200 bg-white text-gray-500"
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
        class="tags-container flex flex-wrap gap-1.5 mb-2.5"
      >
        <span
          v-for="(tag, index) in plan.tags"
          :key="index"
          class="tag text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-xl inline-flex items-center"
        >
          {{ tag }}
        </span>
      </div>

      <!-- 位置信息 -->
      <div
        v-if="plan.location"
        class="location-info flex items-center text-sm text-gray-500 mb-2.5"
      >
        <van-icon
          name="location-o"
          class="location-icon mr-1.5 text-gray-400"
        />
        <span class="location-text">{{ plan.location.address }}</span>
      </div>

      <!-- 描述信息 -->
      <p
        class="plan-description text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed"
        v-if="plan.description"
      >
        {{ plan.description }}
      </p>

      <!-- 预算信息 -->
      <div
        v-if="plan.budget"
        class="budget-info flex items-center text-sm text-gray-500 mb-3"
      >
        <van-icon
          name="balance-o"
          class="budget-icon mr-1.5 text-gray-400"
        />
        <span class="budget-text"
          >预算: ¥{{ plan.budget.toLocaleString() }}</span
        >
      </div>

      <!-- 进度条 -->
      <div
        v-if="status === 'in-progress'"
        class="progress-container h-2 bg-gray-200 rounded mb-3 mt-4 relative"
      >
        <div
          class="progress-bar h-full rounded bg-gradient-to-r from-green-400 to-green-600 transition-all duration-600 ease-in-out"
          :style="{ width: `${progress}%` }"
        ></div>
        <span
          class="progress-text absolute right-0 -top-4 text-xs text-green-500 font-medium"
        >
          {{ progress }}%
        </span>
      </div>

      <!-- 时间信息 -->
      <div class="time-info flex mt-2">
        <div class="time-item flex items-center w-full">
          <van-icon
            name="calendar-o"
            class="time-icon mr-2 text-gray-400 text-sm flex-shrink-0"
          />
          <div class="time-details flex-1">
            <span
              class="time-range text-xs text-gray-600 inline-flex items-center gap-1 flex-wrap"
            >
              <span class="font-bold">{{ startTime.date }}</span>
              {{ startTime.time }}
              <span class="time-separator text-gray-400 mx-1 font-normal"
                >→</span
              >
              <span class="font-bold">{{ endTime.date }}</span>
              {{ endTime.time }}
            </span>
          </div>
        </div>
      </div>

      <!-- 状态提示 -->
      <div
        v-if="statusHint"
        class="status-hint flex items-center text-xs px-2.5 py-1.5 rounded mt-2.5"
        :class="hintClasses"
      >
        <van-icon
          :name="hintIcon"
          class="hint-icon mr-1.5 text-sm"
        />
        <span>{{ statusHint }}</span>
      </div>
    </div>

    <!-- 操作菜单 -->
    <van-action-sheet
      teleport="body"
      v-model:show="showMarkSheet"
      :title="plan.title"
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
        name: "编辑",
        icon: "edit",
        color: "var(--plan-in-progress)",
        callback: handleCardClick,
      });
      actions.push({
        name: "标记完成",
        icon: "success",
        color: "var(--plan-completed)",
        callback: () => {
          props.plan.status = TravelPlanStatus.completed;
          store.updateTravelPlan(props.plan);
        },
      });
      actions.push({
        name: "延后一天",
        icon: "clock-o",
        color: "var(--plan-in-progress)",
        callback: () => {
          props.plan.startDateTime += 24 * 60 * 60 * 1000;
          props.plan.endDateTime += 24 * 60 * 60 * 1000;
          store.updateTravelPlan(props.plan);
        },
      });
    }
    actions.push({
      name: "取消计划",
      icon: "delete-o",
      color: "var(--plan-cancelled)",
      callback: () => {
        props.plan.status = TravelPlanStatus.cancelled;
        store.updateTravelPlan(props.plan);
      },
    });
    actions.push({
      name: "删除计划",
      icon: "fail",
      color: "var(--plan-expired)",
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
  if (isCancelled.value) return "bg-gray-50";
  return "";
});

const accentClasses = computed(() => {
  return {
    planned: "bg-plan-planned",
    upcoming: "bg-plan-upcoming",
    "in-progress": "bg-plan-in-progress",
    completed: "bg-plan-completed",
    expired: "bg-plan-expired",
    cancelled: "bg-plan-cancelled",
    deleted: "bg-plan-deleted",
  }[status.value];
});

const statusBadgeClasses = computed(() => {
  return {
    planned: "text-plan-planned",
    upcoming: "text-plan-upcoming",
    "in-progress": "text-plan-in-progress",
    completed: "text-plan-completed",
    expired: "text-plan-expired",
    cancelled: "text-plan-cancelled",
    deleted: "text-plan-deleted",
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
    low: "text-plan-priority-low bg-plan-priority-low/10",
    high: "text-plan-priority-medium bg-plan-priority-medium/10",
    medium: "text-plan-priority-high bg-plan-priority-high/10",
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
      return "text-plan-cancelled bg-red-50";
    case "upcoming":
      return "text-plan-upcoming bg-yellow-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
});

const hintIcon = computed(() => {
  switch (status.value) {
    case "cancelled":
      return "info-o";
    case "upcoming":
      return "warning-o";
    default:
      return "clock-o";
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
    name: "PlanMap",
    query: {
      travelPlanId: props.plan.travelPlanId,
    },
  });
};
</script>

<style scoped>
/* 取消状态的特殊样式 */
.plan-card.cancelled {
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
</style>
