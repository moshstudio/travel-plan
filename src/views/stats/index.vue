<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import TravelBasicInfo from "@/components/travelStats/TravelBasicInfo.vue";
import PlanStatistics from "@/components/travelStats/PlanStatistics.vue";
import ChecklistStatistics from "@/components/travelStats/ChecklistStatistics.vue";
import ExpenseStatistics from "@/components/travelStats/ExpenseStatistics.vue";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";

const route = useRoute();
const store = useStore();
const {
  currentTravel: travel,
  travelPlans: plans,
  travelChecklists: checklistItems,
  travelExpenses: expenses,
} = storeToRefs(store);

// 计算旅行天数
const travelDays = computed(() => {
  if (!travel.value) return 0;
  if (!travel.value.startDateTime || !travel.value.endDateTime) return 0;
  const diff = travel.value.endDateTime - travel.value.startDateTime;
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
});

// 加载数据函数 - 实际项目中替换为API调用
const loadData = async () => {
  // 这里应该是API调用
  console.log(`Loading data for travel`);
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div
    v-if="!travel"
    class="text-center text-gray-600"
  >
    请先创建旅行
  </div>
  <div
    v-else
    class="w-full h-full p-2 flex gap-4 flex-col overflow-auto thin-scrollbar"
  >
    <!-- 基本信息部分 -->
    <TravelBasicInfo
      :travel="travel"
      :travelDays="travelDays"
    />

    <!-- 计划统计 -->
    <PlanStatistics
      v-if="plans"
      :plans="plans"
      :travelId="travel.travelId"
      class="bg-white rounded-lg shadow p-6"
    />

    <!-- 清单统计 -->
    <ChecklistStatistics
      v-if="checklistItems"
      :items="checklistItems"
      class="bg-white rounded-lg shadow p-6"
    />

    <!-- 花费统计 -->
    <ExpenseStatistics
      v-if="expenses"
      :expenses="expenses"
      class="bg-white rounded-lg shadow p-6 mb-8"
    />
    <div class="shrink-0 h-[220px]"></div>
  </div>
</template>
