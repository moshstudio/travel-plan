<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from "vue";
import PlanCard from "@/components/travelPlan/PlanCard.vue";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

const router = useRouter();
const store = useStore();
const {
  currentTravel,
  travelPlansBeforeToday,
  travelPlansFromToday,
  travelPlans,
} = storeToRefs(store);

const showPlansBeforeToday = ref(false);
function onClickAdd() {
  router.push({ name: "CreatePlan" });
}

onMounted(async () => {
  if (!currentTravel.value) {
    router.push({ name: "CreateTravel" });
  }
});
</script>

<template>
  <van-list class="p-4 thin-scrollbar">
    <transition name="fade-slide">
      <div
        v-if="showPlansBeforeToday && travelPlansBeforeToday?.length"
        class="expired-plans-section"
      >
        <transition-group
          name="list"
          tag="div"
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
          @click="showPlansBeforeToday = !showPlansBeforeToday"
        >
          {{ !showPlansBeforeToday ? "显示更早的计划" : "隐藏更早的计划" }}
        </span>
      </van-divider>
    </div>

    <div class="current-plans-section">
      <transition-group
        name="list"
        tag="div"
      >
        <PlanCard
          v-for="(plan, index) in travelPlansFromToday"
          :key="plan.id"
          :plan="plan"
          class="current-plan"
        />
      </transition-group>
      <div
        v-if="!travelPlansFromToday?.length"
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
  </van-list>
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
  transform: scale(0.98);
  transition: all 0.3s ease;
}

.expired-plan:hover {
  opacity: 1;
  transform: scale(1);
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

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.plans-container:deep(.van-pull-refresh__head) {
  color: #666;
}

.plans-container:deep(.van-pull-refresh__loading) .van-loading__spinner {
  color: #6a11cb;
}
/* 列表项动画 */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.list-leave-active {
  position: absolute;
  width: calc(100% - 32px);
}

.list-move {
  transition-timing-function: ease-out;
}
</style>
