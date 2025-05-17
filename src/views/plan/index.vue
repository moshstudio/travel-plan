<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import PlanCard from "@/components/travelPlan/PlanCard.vue";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

const router = useRouter();
const store = useStore();
const { plansBeforeToday, plansFromToday } = storeToRefs(store);

const showPlansBeforeToday = ref(false);
const isLoading = ref(false);

function onClickAdd() {
  router.push({ name: "AddPlan" });
}

async function handleRefresh() {
  if (showPlansBeforeToday.value) {
    isLoading.value = false;
    return;
  }

  showPlansBeforeToday.value = true;
  isLoading.value = false;

  await nextTick();

  document
    .querySelector(".current-plans-section")
    ?.scrollIntoView({ behavior: "smooth" });
}
</script>

<template>
  <div class="travel-plans-app">
    <van-nav-bar
      title="旅行计划"
      class="app-nav-bar"
      :border="false"
    />

    <div class="app-background"></div>

    <van-pull-refresh
      v-model="isLoading"
      :pulling-text="
        showPlansBeforeToday ? '没有更早的计划了' : '下拉显示已结束计划'
      "
      :loosing-text="
        showPlansBeforeToday ? '没有更早的计划了' : '释放显示已结束计划'
      "
      @refresh="handleRefresh"
      class="plans-container thin-scrollbar"
    >
      <div class="container-inner">
        <transition name="fade-slide">
          <div
            v-if="showPlansBeforeToday"
            class="expired-plans-section"
          >
            <div class="section-header">
              <van-divider class="custom-divider">
                <span
                  class="divider-text"
                  @click="showPlansBeforeToday = !showPlansBeforeToday"
                >
                  {{ plansBeforeToday.length ? "已结束计划" : "无已结束计划" }}
                </span>
              </van-divider>
            </div>
            <transition-group
              name="list"
              tag="div"
            >
              <PlanCard
                v-for="(plan, index) in plansBeforeToday"
                :key="plan.id"
                :plan="plan"
                class="expired-plan"
              />
            </transition-group>
          </div>
        </transition>

        <div class="current-plans-section">
          <div
            v-if="plansFromToday.length"
            class="section-header"
          >
            <van-divider class="custom-divider">
              <span class="divider-text">当前计划</span>
            </van-divider>
          </div>

          <transition-group
            name="list"
            tag="div"
          >
            <PlanCard
              v-for="(plan, index) in plansFromToday"
              :key="plan.id"
              :plan="plan"
              class="current-plan"
            />
          </transition-group>

          <div
            v-if="!plansFromToday.length"
            class="empty-state"
          >
            <img
              src="@/assets/images/empty-travel.png"
              alt="空状态"
              class="empty-image"
            />
            <p class="empty-text">暂无旅行计划</p>
            <p class="empty-hint">点击下方按钮创建您的第一个旅行计划</p>
          </div>
        </div>

        <div class="bottom-spacer"></div>
      </div>
    </van-pull-refresh>

    <van-floating-bubble
      icon="plus"
      @click="onClickAdd"
      class="add-button"
    />
  </div>
</template>

<style scoped>
.travel-plans-app {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #f5f7fa;
}

.app-nav-bar {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.app-nav-bar :deep(.van-nav-bar__title) {
  color: white;
  font-weight: 600;
}

.app-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  z-index: 0;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
}

.plans-container {
  position: relative;
  width: 100%;
  height: calc(100% - 46px);
  padding: 16px;
  z-index: 1;
  background: transparent;
  overflow-y: auto !important;
}

.container-inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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

.bottom-spacer {
  height: 220px;
}

.add-button {
  --van-floating-bubble-background: linear-gradient(
    135deg,
    #6a11cb 0%,
    #2575fc 100%
  );
  --van-floating-bubble-size: 56px;
  --van-floating-bubble-icon-size: 24px;
  box-shadow: 0 4px 12px rgba(106, 17, 203, 0.3);
  right: 24px;
  bottom: 24px;
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
