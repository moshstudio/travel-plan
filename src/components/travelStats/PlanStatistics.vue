<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import MapView from "@/components/travelStats/MapView.vue";
import { TravelPlanStatus, TravelPlanType } from "@/data/TravelPlan";

const props = defineProps<{
  plans: TravelPlanType[];
  travelId: string;
}>();

// 统计计划状态
const planStatusStats = computed(() => {
  const stats = {
    planned: 0,
    upcoming: 0,
    "in-progress": 0,
    expired: 0,
    completed: 0,
    cancelled: 0,
  };

  props.plans.forEach((plan) => {
    if (plan.status in stats) {
      stats[plan.status as keyof typeof stats]++;
    }
  });

  return stats;
});

const getStatusText = (status: any) => {
  switch (status) {
    case "planned":
      return "计划";
    case "upcoming":
      return "即将开始";
    case "in-progress":
      return "进行中";
    case "expired":
      return "已结束";
    case "completed":
      return "已完成";
    case "cancelled":
      return "已取消";
    default:
      return status;
  }
};

// 统计计划优先级
const priorityStats = computed(() => {
  return props.plans.reduce((acc, plan) => {
    acc[plan.priority] = (acc[plan.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
});
const getPriorityText = (priority: string) => {
  switch (priority) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
    default:
      return priority;
  }
};

// 统计计划标签
const tagStats = computed(() => {
  const tagMap = new Map<string, number>();

  props.plans.forEach((plan) => {
    plan.tags?.forEach((tag) => {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    });
  });

  return Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]);
});

// 获取有位置信息的计划
const plansWithLocation = computed(() => {
  return props.plans.filter(
    (plan) =>
      plan.location?.coordinates &&
      plan.startDateTime >= new Date().setHours(0, 0, 0, 0)
  );
});

// 地图相关
const mapLoaded = ref(false);
const isMapExpanded = ref(false);

onMounted(() => {
  setTimeout(() => {
    mapLoaded.value = true;
  }, 300);
});

// 状态颜色映射
const statusColors = {
  planned: "bg-indigo-100 text-indigo-800",
  upcoming: "bg-blue-100 text-blue-800",
  inProgress: "bg-amber-100 text-amber-800",
  expired: "bg-gray-100 text-gray-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

// 优先级颜色映射
const priorityColors = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

const toggleMapExpand = () => {
  isMapExpanded.value = !isMapExpanded.value;
};
</script>

<template>
  <div class="p-4">
    <h2 class="text-2xl font-bold text-gray-900 mb-2">旅行计划统计</h2>

    <button
      @click="$router.push({ name: 'RoadMap' })"
      class="px-2 py-1 bg-blue-500 hover:bg-blue-600 rounded-md transition-colors mb-4"
    >
      <span class="text-white text-sm">查看路线图</span>
    </button>

    <!-- 状态统计卡片 -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">计划状态</h3>
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="(count, status) in planStatusStats"
          :key="status"
          class="sub-card rounded-xl p-3 shadow-sm"
          :class="statusColors[status as keyof typeof statusColors]"
        >
          <div class="text-sm font-medium capitalize">
            {{ getStatusText(status) }}
          </div>
          <div class="text-2xl font-bold mt-1">{{ count }}</div>
        </div>
      </div>
    </div>

    <!-- 优先级统计卡片 -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">优先级分布</h3>
      <div class="flex space-x-3 overflow-x-auto pb-2">
        <div
          v-for="(count, priority) in priorityStats"
          :key="priority"
          class="sub-card flex-shrink-0 rounded-xl p-4 shadow-sm min-w-[120px]"
          :class="priorityColors[priority as keyof typeof priorityColors]"
        >
          <div class="text-sm font-medium capitalize">
            {{ getPriorityText(priority) }}
          </div>
          <div class="text-xl font-bold mt-1">{{ count }}</div>
        </div>
      </div>
    </div>

    <!-- 热门标签 -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">热门标签</h3>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="([tag, count], index) in tagStats.slice(0, 8)"
          :key="index"
          class="sub-card bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 text-sm px-3 py-2 rounded-lg font-medium shadow-xs"
        >
          #{{ tag }} <span class="text-purple-600">({{ count }})</span>
        </span>
      </div>
    </div>

    <!-- 地图视图 -->
    <div
      v-if="plansWithLocation.length > 0"
      class="mb-6"
    >
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-lg font-semibold text-gray-800">位置分布</h3>
        <div class="flex items-center">
          <span class="text-sm text-gray-500 mr-2">
            {{ plansWithLocation.length }} 个地点
          </span>
          <div
            @click="toggleMapExpand"
            class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none transition-colors"
          >
            {{ isMapExpanded ? "▼" : "▲" }}
          </div>
        </div>
      </div>
      <div
        class="bg-gray-50 rounded-xl overflow-hidden shadow-sm border border-gray-100 transition-all duration-300 ease-in-out"
        :class="{
          'h-60': !isMapExpanded,
          'h-[80vh]': isMapExpanded,
        }"
      >
        <MapView
          v-if="mapLoaded"
          :plans="plansWithLocation"
          :travelId="travelId"
        />
      </div>
    </div>
  </div>
</template>
<style scoped lang="less">
.sub-card {
  transition: all 0.2s ease;
}

/* 点击反馈效果 */
.sub-card:active {
  transform: scale(0.98);
}
</style>
