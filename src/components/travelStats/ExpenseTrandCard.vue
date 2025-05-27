<script setup lang="ts">
import { computed } from "vue";
import type { TravelExpenseType } from "@/data/expense";

const props = defineProps<{
  expenses: TravelExpenseType[];
}>();

const processedData = computed(() => {
  const dateMap = new Map<
    string,
    {
      date: Date;
      amount: number;
      monthKey: string; // 用于月份分组的唯一键
      monthLabel: string;
      yearLabel: string;
      showMonthLabel: boolean;
      showYearLabel: boolean;
    }
  >();

  // 处理原始数据
  props.expenses.forEach((expense) => {
    const date = new Date(expense.dateTime);
    const dateKey = date.toISOString().split("T")[0];
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, {
        date,
        amount: 0,
        monthKey,
        monthLabel: date.toLocaleDateString("zh-CN", { month: "long" }),
        yearLabel: date.getFullYear().toString(),
        showMonthLabel: false,
        showYearLabel: false,
      });
    }
    dateMap.get(dateKey)!.amount += expense.amount;
  });

  // 转换为数组并排序
  const sorted = Array.from(dateMap.values()).sort((a, b) => +a.date - +b.date);

  // 计算月份/年份变化和最大值
  let maxAmount = 0;
  let currentMonthKey = "";
  let currentYear = 0;

  sorted.forEach((item) => {
    maxAmount = Math.max(maxAmount, item.amount);

    // 检测年份变化
    if (item.date.getFullYear() !== currentYear) {
      item.showYearLabel = true;
      currentYear = item.date.getFullYear();
    }

    // 检测月份变化
    if (item.monthKey !== currentMonthKey) {
      item.showMonthLabel = true;
      currentMonthKey = item.monthKey;
    }
  });

  return {
    items: sorted,
    maxAmount,
    // 获取所有月份分隔点
    monthDividers: sorted.reduce((acc, item, index) => {
      if (item.showMonthLabel) acc.push(index);
      return acc;
    }, [] as number[]),
  };
});

const getBarHeight = (amount: number) => {
  return processedData.value.maxAmount
    ? `${(amount / processedData.value.maxAmount) * 80}%`
    : "0%";
};
</script>

<template>
  <div
    class="bg-white rounded-xl shadow-sm p-4"
    v-if="processedData.items.length > 0"
  >
    <h3 class="text-lg font-semibold text-gray-800 mb-3">每日花费趋势</h3>

    <div class="relative">
      <!-- 月份导航指示器 -->
      <div
        v-if="processedData.monthDividers.length > 1"
        class="flex justify-center space-x-2 mb-2 overflow-x-auto pb-2"
      >
        <div
          v-for="(dividerIndex, i) in processedData.monthDividers"
          :key="i"
          class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap"
        >
          {{ processedData.items[dividerIndex].monthLabel }}
          <span v-if="processedData.items[dividerIndex].showYearLabel">
            {{ processedData.items[dividerIndex].yearLabel }}年
          </span>
        </div>
      </div>

      <div
        class="overflow-x-auto pb-2 -mx-2 px-2 scroll-touch"
        style="scrollbar-width: none; -ms-overflow-style: none"
      >
        <div class="flex space-x-3 min-w-max relative">
          <!-- 月份分隔线 -->
          <div
            v-for="(dividerIndex, i) in processedData.monthDividers"
            :key="'divider-' + i"
            class="absolute bottom-0 top-7 w-px bg-gray-200/80 z-10"
            :style="{ left: `${dividerIndex * 40}px` }"
          />

          <!-- 每日数据项 -->
          <div
            v-for="(item, index) in processedData.items"
            :key="item.date.toISOString()"
            class="flex flex-col items-center px-1 relative z-0"
          >
            <!-- 年份标签 (只在1月显示) -->
            <div
              v-if="item.showYearLabel && item.date.getMonth() === 0"
              class="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-500 whitespace-nowrap"
            >
              {{ item.yearLabel }}年
            </div>

            <!-- 月份标签 (每月第一个数据点显示) -->
            <div
              v-if="item.showMonthLabel"
              class="absolute -top-7 left-1/2 -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap"
            >
              {{ item.monthLabel }}
              <span
                v-if="item.date.getMonth() === 0 && !item.showYearLabel"
                class="text-gray-400"
              >
                ({{ item.yearLabel }})
              </span>
            </div>

            <!-- 柱状图 -->
            <div class="relative h-32 w-9 flex flex-col justify-end">
              <div class="absolute inset-0 flex flex-col justify-between">
                <div class="border-t border-gray-100/50"></div>
                <div class="border-t border-gray-100/50"></div>
                <div class="border-t border-gray-100/50"></div>
                <div class="border-t border-gray-100/50"></div>
              </div>

              <div
                class="relative w-full rounded-t-lg bg-gradient-to-t from-indigo-400 to-indigo-300 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                :style="{ height: getBarHeight(item.amount) }"
              >
                <div
                  class="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-medium bg-indigo-100 text-indigo-700 px-1.5 rounded-full shadow-sm whitespace-nowrap"
                >
                  ¥{{ item.amount.toFixed(0) }}
                </div>
              </div>
            </div>

            <!-- 日期信息 -->
            <div class="mt-2 text-center space-y-0.5">
              <div class="text-xs font-medium text-gray-700">
                {{ item.date.getDate() }}日
              </div>
              <div class="text-[11px] text-gray-400">
                {{
                  item.date.toLocaleDateString("zh-CN", { weekday: "short" })
                }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent pointer-events-none"
      />
    </div>
  </div>
</template>

<style>
.scroll-touch {
  -webkit-overflow-scrolling: touch;
}
::-webkit-scrollbar {
  display: none;
}

/* 月份分隔线动画 */
.month-divider {
  position: relative;
}
.month-divider::after {
  content: "";
  position: absolute;
  left: 0;
  top: 10%;
  bottom: 10%;
  width: 1px;
  background: linear-gradient(to bottom, transparent, #e5e7eb, transparent);
  animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
