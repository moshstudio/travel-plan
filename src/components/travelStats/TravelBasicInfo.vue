<script setup lang="ts">
import { TravelType } from "@/data/TravelPlan";
import { computed } from "vue";

const props = defineProps<{
  travel: TravelType;
  travelDays: number;
}>();

const formattedDateRange = computed(() => {
  if (!props.travel.startDateTime || !props.travel.endDateTime) return "";

  const startDate = new Date(props.travel.startDateTime);
  const endDate = new Date(props.travel.endDateTime);

  return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
});

const hasDescription = computed(() => {
  return props.travel.description && props.travel.description.trim().length > 0;
});
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
    <!-- 标题部分 -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-gray-800">旅行基本信息</h2>
      <p
        class="text-blue-500 text-sm van-haptics-feedback"
        @click.stop="$router.push({ name: 'ShareRoad' })"
      >
        分享
      </p>
    </div>

    <!-- 主要内容 -->
    <div class="space-y-4">
      <!-- 旅行名称和描述 -->
      <div class="bg-blue-50 p-4 rounded-lg">
        <h3 class="text-base font-medium text-gray-800 mb-1">
          {{ travel.name }}
        </h3>
        <p
          v-if="hasDescription"
          class="text-sm text-gray-600"
        >
          {{ travel.description }}
        </p>
      </div>

      <!-- 时间和天数信息 -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-gray-50 p-3 rounded-lg">
          <p class="text-xs text-gray-500 mb-1">旅行时间</p>
          <p class="text-sm font-medium text-gray-700">
            {{ formattedDateRange }}
          </p>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
          <p class="text-xs text-gray-500 mb-1">旅行天数</p>
          <p class="text-sm font-medium text-gray-700">{{ travelDays }} 天</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 添加一些微妙的动画效果 */
div {
  transition: all 0.2s ease;
}

/* 点击反馈效果 */
div:active {
  transform: scale(0.98);
}
</style>
