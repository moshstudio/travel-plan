<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import PlanCard from "@/components/travelPlan/PlanCard.vue";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import router from "@/router";

const store = useStore();
const { plansBeforeToday, plansFromToday } = storeToRefs(store);

const showPlansBeforeToday = ref(false);
const scrollContainer = ref<HTMLElement | null>(null);
const isLoading = ref(false);
let lastScrollTop = 0;

function onClickAdd() {
  router.push({ name: "AddPlan" });
}

function handleScroll() {
  if (!scrollContainer.value) return;

  const currentScrollTop = scrollContainer.value.scrollTop;

  // 向上滑动且接近顶部时加载过期计划
  if (
    currentScrollTop < 100 &&
    currentScrollTop < lastScrollTop &&
    !showPlansBeforeToday.value
  ) {
    loadExpiredPlans();
  }

  lastScrollTop = currentScrollTop;
}

async function loadExpiredPlans() {
  if (isLoading.value || showPlansBeforeToday.value) return;

  isLoading.value = true;
  await new Promise((resolve) => setTimeout(resolve, 500)); // 模拟加载延迟

  // 记录当前第一个可见的今天计划的位置
  const firstTodayPlan = scrollContainer.value?.querySelector(".today-plan");
  const originalOffset = firstTodayPlan?.getBoundingClientRect().top || 0;

  showPlansBeforeToday.value = true;

  // 等待DOM更新后调整滚动位置
  await nextTick();

  if (firstTodayPlan && scrollContainer.value) {
    const newOffset = firstTodayPlan.getBoundingClientRect().top;
    scrollContainer.value.scrollTop += newOffset - originalOffset;
  }

  isLoading.value = false;
}

onMounted(() => {
  scrollContainer.value?.addEventListener("scroll", handleScroll);
});

onUnmounted(() => {
  scrollContainer.value?.removeEventListener("scroll", handleScroll);
});
</script>

<template>
  <div class="relative w-full h-full flex flex-col overflow-hidden">
    <van-nav-bar title="旅行计划" />

    <div
      ref="scrollContainer"
      class="p-4 w-full h-full overflow-auto thin-scrollbar"
    >
      <!-- 顶部加载提示 -->
      <div
        v-if="!showPlansBeforeToday && !isLoading"
        class="py-2 text-center text-gray-500 text-sm"
      >
        向上滑动查看过期计划
      </div>

      <div
        v-if="isLoading"
        class="py-2 text-center text-gray-500 text-sm"
      >
        加载中...
      </div>

      <transition name="fade-slide-down">
        <div v-if="showPlansBeforeToday">
          <PlanCard
            v-for="(plan, index) in plansBeforeToday"
            :key="plan.id"
            :plan="plan"
          />
          <van-divider />
        </div>
      </transition>

      <!-- 今天的计划 -->
      <div class="today-plan">
        <PlanCard
          v-for="(plan, index) in plansFromToday"
          :key="plan.id"
          :plan="plan"
        />
      </div>
      <div class="shrink-0 h-[100px]"></div>
    </div>

    <van-floating-bubble
      icon="plus"
      @click="onClickAdd"
    />
  </div>
</template>

<style scoped>
.fade-slide-down-enter-active,
.fade-slide-down-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-down-enter-from,
.fade-slide-down-leave-to {
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
