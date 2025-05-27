<script setup lang="ts">
import { TravelChecklistType } from "@/data/checklist";
import { computed } from "vue";

const props = defineProps<{
  items: TravelChecklistType[];
}>();

// 统计完成情况
const completionStats = computed(() => {
  const total = props.items.length;
  const completed = props.items.filter((item) => item.isPacked).length;
  const remaining = total - completed;

  return {
    total,
    completed,
    remaining,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
});

// 按标签统计
const tagStats = computed(() => {
  const tagMap = new Map<string, { total: number; completed: number }>();

  props.items.forEach((item) => {
    if (!tagMap.has(item.tag)) {
      tagMap.set(item.tag, { total: 0, completed: 0 });
    }

    const tagData = tagMap.get(item.tag)!;
    tagData.total++;
    if (item.isPacked) tagData.completed++;
  });

  return Array.from(tagMap.entries()).sort((a, b) => b[1].total - a[1].total);
});

// 按重要性统计
const importanceStats = computed(() => {
  return props.items.reduce((acc, item) => {
    if (!acc[item.importance]) {
      acc[item.importance] = { total: 0, completed: 0 };
    }

    acc[item.importance].total++;
    if (item.isPacked) acc[item.importance].completed++;

    return acc;
  }, {} as Record<string, { total: number; completed: number }>);
});

// 获取重要性对应的颜色
const getImportanceColor = (importance: string) => {
  const colors: Record<string, string> = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };
  return colors[importance.toLowerCase()] || "bg-purple-500";
};
const getImportantanceText = (importance: string) => {
  const texts: Record<string, string> = {
    high: "高",
    medium: "中",
    low: "低",
  };
  return texts[importance.toLowerCase()] || "未知";
};
</script>

<template>
  <div class="px-4 py-6">
    <h2 class="text-2xl font-bold text-gray-800 mb-6">旅行清单统计</h2>

    <!-- 完成情况卡片 -->
    <div class="bg-white rounded-xl shadow-sm p-5 mb-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">完成进度</h3>
      <div class="flex items-center justify-between mb-2">
        <span class="text-gray-600 text-sm"
          >{{ completionStats.completed }} /
          {{ completionStats.total }} 已完成</span
        >
        <span class="font-bold text-primary-600"
          >{{ completionStats.percentage }}%</span
        >
      </div>
      <div class="relative pt-1">
        <div
          class="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-gray-200"
        >
          <div
            :style="{ width: `${completionStats.percentage}%` }"
            class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-teal-400"
          ></div>
        </div>
      </div>
      <p class="text-xs text-gray-500 mt-1">
        {{ completionStats.remaining }} 项待完成
      </p>
    </div>

    <!-- 分类统计卡片 -->
    <div
      class="bg-white rounded-xl shadow-sm p-5 mb-6"
      v-if="tagStats.length > 0"
    >
      <h3 class="text-lg font-semibold text-gray-800 mb-4">分类统计</h3>
      <ul class="space-y-4">
        <li
          v-for="([tag, stats], index) in tagStats"
          :key="index"
          class="flex flex-col"
        >
          <div class="flex justify-between items-center mb-1">
            <span class="text-gray-700 font-medium">{{ tag }}</span>
            <span class="text-sm font-semibold"
              ><span class="text-primary-600">{{ stats.completed }}</span> /
              {{ stats.total }}</span
            >
          </div>
          <div class="w-full bg-gray-100 rounded-full h-2">
            <div
              class="h-2 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
              :style="{ width: `${(stats.completed / stats.total) * 100}%` }"
            ></div>
          </div>
        </li>
      </ul>
    </div>

    <!-- 重要性统计卡片 -->
    <div
      class="bg-white rounded-xl shadow-sm p-5"
      v-if="Object.keys(importanceStats).length > 0"
    >
      <h3 class="text-lg font-semibold text-gray-800 mb-4">优先级统计</h3>
      <ul class="space-y-4">
        <li
          v-for="(stats, importance) in importanceStats"
          :key="importance"
          class="flex flex-col"
        >
          <div class="flex justify-between items-center mb-1">
            <div class="flex items-center">
              <span
                class="w-3 h-3 rounded-full mr-2"
                :class="getImportanceColor(importance)"
              ></span>
              <span class="text-gray-700 font-medium capitalize">
                {{ getImportantanceText(importance) }}
              </span>
            </div>
            <span class="text-sm font-semibold"
              ><span class="text-primary-600">{{ stats.completed }}</span> /
              {{ stats.total }}</span
            >
          </div>
          <div class="w-full bg-gray-100 rounded-full h-2">
            <div
              class="h-2 rounded-full"
              :class="getImportanceColor(importance)"
              :style="{ width: `${(stats.completed / stats.total) * 100}%` }"
            ></div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* 添加一些动画效果 */
.bg-gradient-to-r {
  transition: width 0.5s ease-in-out;
}

/* 卡片悬停效果 */
.bg-white {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.bg-white:active {
  transform: scale(0.98);
}

/* 圆点颜色定义 */
.bg-red-500 {
  background-color: #ef4444;
}
.bg-yellow-500 {
  background-color: #eab308;
}
.bg-green-500 {
  background-color: #22c55e;
}
.bg-purple-500 {
  background-color: #a855f7;
}
</style>
