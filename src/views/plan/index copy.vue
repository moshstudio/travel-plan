<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import PlanCard from "@/components/travelPlan/PlanCard.vue";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import router from "@/router";

const store = useStore();
const { plansBeforeToday, plansFromToday } = storeToRefs(store);

const showPlansBeforeToday = ref(false);
const isLoading = ref(false);
const pullRefreshRef = ref<HTMLElement | null>(null);
const firstTodayPlanRef = ref<HTMLElement | null>(null);
let originalScrollPosition = 0;
let firstTodayPlanOffset = 0;

function onClickAdd() {
  router.push({ name: "AddPlan" });
}

async function handleRefresh() {
  if (showPlansBeforeToday.value) {
    isLoading.value = false;
    return;
  }

  // 1. 记录当前滚动位置和第一个"今天"计划的位置
  if (pullRefreshRef.value && firstTodayPlanRef.value) {
    originalScrollPosition = pullRefreshRef.value.scrollTop;
    firstTodayPlanOffset = firstTodayPlanRef.value.offsetTop;
  }

  // 2. 显示结束计划
  showPlansBeforeToday.value = true;
  isLoading.value = false;

  // 3. 等待DOM更新后调整滚动位置
  await nextTick();

  if (pullRefreshRef.value && firstTodayPlanRef.value) {
    // 计算新的滚动位置：原始滚动位置 + 新增内容的高度
    const newScrollPosition =
      originalScrollPosition +
      (firstTodayPlanRef.value.offsetTop - firstTodayPlanOffset);
    pullRefreshRef.value.scrollTop = newScrollPosition;
  }
}

onMounted(() => {
  pullRefreshRef.value = document.querySelector(".pull-refresh-container");
});
</script>

<template>
  <div class="relative w-full h-full flex flex-col overflow-hidden">
    <van-nav-bar title="旅行计划" />
    <van-pull-refresh
      v-model="isLoading"
      :pulling-text="
        showPlansBeforeToday ? '没有更早的计划了' : '下拉显示已结束计划'
      "
      :loosing-text="
        showPlansBeforeToday ? '没有更早的计划了' : '释放显示已结束计划'
      "
      @refresh="handleRefresh"
      class="p-4 w-full h-full !overflow-auto thin-scrollbar pull-refresh-container"
    >
      <transition name="fade">
        <div v-if="showPlansBeforeToday">
          <PlanCard
            v-for="(plan, index) in plansBeforeToday"
            :key="plan.id"
            :plan="plan"
          />
          <van-divider />
        </div>
      </transition>

      <div ref="firstTodayPlanRef">
        <PlanCard
          v-for="(plan, index) in plansFromToday"
          :key="plan.id"
          :plan="plan"
        />
      </div>
      <div class="shrink-0 h-[200px]"></div>
    </van-pull-refresh>

    <van-floating-bubble
      icon="plus"
      @click="onClickAdd"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.thin-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.thin-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.thin-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}
</style>
