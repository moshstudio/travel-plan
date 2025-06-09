<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from "vue";
import PlanCard from "@/components/travelPlan/PlanCard.vue";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

const router = useRouter();
const store = useStore();
const { currentTravel, travelPlansBeforeToday, travelPlansFromToday } =
  storeToRefs(store);

const showPlansBeforeToday = ref(false);
const containerRef = ref<HTMLElement | null>(null);
const scrollPosition = ref(0);

// 格式化日期显示
const formatDate = (date: Date) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 如果是今天
  if (date.toDateString() === today.toDateString()) {
    return "今天";
  }
  // 如果是明天
  if (date.toDateString() === tomorrow.toDateString()) {
    return "明天";
  }
  // 如果是今年
  if (date.getFullYear() === today.getFullYear()) {
    return format(date, "M月d日 EEE", { locale: zhCN });
  }
  // 其他日期
  return format(date, "yyyy年M月d日 EEE", { locale: zhCN });
};

// 按日期分组计划
const groupedPlans = computed(() => {
  const groups: Record<string, typeof travelPlansFromToday.value> = {};

  travelPlansFromToday.value?.forEach((plan) => {
    const dateKey = new Date(plan.startDateTime).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(plan);
  });

  return groups;
});

const toggleShowPlansBeforeToday = async () => {
  // 保存当前滚动位置
  if (containerRef.value) {
    scrollPosition.value = containerRef.value.scrollTop;
  }

  // 切换显示状态
  showPlansBeforeToday.value = !showPlansBeforeToday.value;

  // 等待DOM更新
  await nextTick();

  // 恢复滚动位置
  if (containerRef.value) {
    if (showPlansBeforeToday.value) {
      const expiredSection = containerRef.value.querySelector(
        ".expired-plans-section"
      );
      containerRef.value.scrollTop =
        scrollPosition.value + (expiredSection?.clientHeight || 0);
      containerRef.value.scrollTo({
        top: scrollPosition.value + (expiredSection?.clientHeight || 0) - 100,
        behavior: "smooth",
      });
    }
  }
};
</script>

<template>
  <div
    ref="containerRef"
    v-remember-scroll
    class="w-full h-full flex flex-col gap-4 overflow-auto thin-scrollbar"
  >
    <transition name="fade-slide-y">
      <div
        v-if="showPlansBeforeToday && travelPlansBeforeToday?.length"
        class="expired-plans-section"
      >
        <transition-group
          name="list"
          tag="div"
          class="px-4"
        >
          <PlanCard
            v-for="(plan, index) in travelPlansBeforeToday"
            :key="plan.id"
            :plan="plan"
            class="expired-plan"
          />
        </transition-group>
      </div>
    </transition>
    <div v-show="travelPlansBeforeToday?.length">
      <van-divider class="custom-divider">
        <span
          class="divider-text"
          @click="toggleShowPlansBeforeToday"
        >
          {{ !showPlansBeforeToday ? "显示更早的计划" : "隐藏更早的计划" }}
        </span>
      </van-divider>
    </div>

    <div class="current-plans-section">
      <template v-if="travelPlansFromToday?.length">
        <div
          v-for="(plans, dateKey) in groupedPlans"
          :key="dateKey"
          class="plan-group"
        >
          <div
            class="date-header rounded sticky top-0 z-1000 bg-white px-4 py-1 backdrop-blur-sm"
          >
            <span class="text-sm font-medium text-gray-800">
              {{ formatDate(new Date(dateKey)) }}
            </span>
            <span class="ml-2 text-xs text-gray-500">
              开始{{ plans.length }}个计划
            </span>
          </div>
          <transition-group
            name="list"
            tag="div"
            class="px-4"
          >
            <PlanCard
              v-for="plan in plans"
              :key="plan.id"
              :plan="plan"
              class="current-plan"
            />
          </transition-group>
        </div>
      </template>

      <div
        v-else
        class="empty-state"
      >
        <img
          src="@/assets/images/empty-travel.png"
          alt="空状态"
          class="empty-image"
        />
        <p class="empty-text">暂无旅行计划</p>
        <p class="empty-hint">点击下方按钮创建您的旅行计划</p>
      </div>
      <div class="shrink-0 h-[220px]"></div>
    </div>
  </div>
</template>

<style scoped>
.section-header {
  margin: 8px 0;
}

.custom-divider {
  border-color: rgba(0, 0, 0, 0.1);
  margin: 16px 0;
}

.custom-divider:deep(.van-divider__content) {
  background-color: transparent;
  padding: 0 12px;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.divider-text {
  border-radius: 6px;
  background: white;
  padding: 0 12px;
}

.expired-plan {
  opacity: 0.8;
}
.expired-plan:hover {
  opacity: 1;
}

.expired-plan:active {
  opacity: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-top: 20px;
  animation: fadeIn 0.5s ease-out;
}

.empty-image {
  width: 180px;
  height: 180px;
  margin-bottom: 20px;
  opacity: 0.7;
}

.empty-text {
  font-size: 18px;
  color: #333;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  color: #888;
}

.date-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  margin-bottom: 8px;
}

/* 统一动画效果 */
.fade-slide-y-enter-active,
.fade-slide-y-leave-active {
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.fade-slide-y-enter-from,
.fade-slide-y-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-leave-active {
  position: absolute;
  width: calc(100% - 32px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 卡片悬停效果 */
.PlanCard {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.PlanCard:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
