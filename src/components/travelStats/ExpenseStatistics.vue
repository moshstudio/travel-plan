<script setup lang="ts">
import { TravelExpenseType } from "@/data/expense";
import { computed } from "vue";
import ExpenseTrandCard from "./ExpenseTrandCard.vue";

const props = defineProps<{
  expenses: TravelExpenseType[];
}>();

// 总花费
const totalExpense = computed(() => {
  return props.expenses.reduce((sum, expense) => sum + expense.amount, 0);
});

// 按标签统计花费
const expenseByTag = computed(() => {
  const tagMap = new Map<string, number>();

  props.expenses.forEach((expense) => {
    expense.tags?.forEach((tag) => {
      tagMap.set(tag, (tagMap.get(tag) || 0) + expense.amount);
    });

    // 如果没有标签，归类为"其他"
    if (!expense.tags || expense.tags.length === 0) {
      tagMap.set("其他", (tagMap.get("其他") || 0) + expense.amount);
    }
  });

  return Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]);
});

// 按支付方式统计
const expenseByPayment = computed(() => {
  return props.expenses.reduce((acc, expense) => {
    acc[expense.paymentMethod] =
      (acc[expense.paymentMethod] || 0) + expense.amount;
    return acc;
  }, {} as Record<TravelExpenseType["paymentMethod"], number>);
});

const getExpenseMethodText = (
  paymentMethod: TravelExpenseType["paymentMethod"]
) => {
  switch (paymentMethod) {
    case "cash":
      return "现金";
    case "credit_card":
      return "信用卡";
    case "alipay":
      return "支付宝";
    case "wechat_pay":
      return "微信支付";
    case "bank_transfer":
      return "银行转账";
    case "other":
      return "其他";
    default:
      return paymentMethod;
  }
};
</script>

<template>
  <div class="p-4">
    <h2 class="text-2xl font-bold text-gray-800 mb-6">旅行花费统计</h2>

    <!-- 总花费卡片 -->
    <div
      class="mb-6 bg-white rounded-xl shadow-sm p-5 active:scale-[0.98] transition-transform"
    >
      <h3 class="text-sm font-medium text-gray-500 mb-1">总花费</h3>
      <div class="flex items-end">
        <p class="text-3xl font-bold text-indigo-600">
          {{ totalExpense.toFixed(2) }}
        </p>
        <span class="text-sm text-gray-500 ml-1 mb-1">元</span>
      </div>
    </div>

    <!-- 分类统计卡片 -->
    <div class="grid grid-cols-1 gap-4 mb-6">
      <div
        class="bg-white rounded-xl shadow-sm p-5"
        v-if="expenseByTag.length > 0"
      >
        <h3 class="text-lg font-semibold text-gray-700 mb-3">分类统计</h3>
        <ul class="space-y-4">
          <li
            v-for="([tag, amount], index) in expenseByTag"
            :key="index"
            class="active:scale-[0.98] transition-transform"
          >
            <div class="flex justify-between text-base mb-1">
              <span class="text-gray-700 font-medium">{{ tag }}</span>
              <span class="font-medium">{{ amount.toFixed(2) }} 元</span>
            </div>
            <div class="flex items-center">
              <div class="w-full bg-gray-100 rounded-full h-2.5 mr-2">
                <div
                  class="bg-gradient-to-r from-indigo-400 to-purple-400 h-2.5 rounded-full"
                  :style="{ width: `${(amount / totalExpense) * 100}%` }"
                ></div>
              </div>
              <span class="text-xs text-gray-400"
                >{{ ((amount / totalExpense) * 100).toFixed(1) }}%</span
              >
            </div>
          </li>
        </ul>
      </div>

      <!-- 支付方式卡片 -->
      <div
        class="bg-white rounded-xl shadow-sm p-5"
        v-if="Object.keys(expenseByPayment).length > 0"
      >
        <h3 class="text-lg font-semibold text-gray-700 mb-3">支付方式</h3>
        <ul class="space-y-4">
          <li
            v-for="(amount, method) in expenseByPayment"
            :key="method"
            class="active:scale-[0.98] transition-transform"
          >
            <div class="flex justify-between text-base mb-1">
              <span class="text-gray-700 font-medium capitalize">
                {{ getExpenseMethodText(method) }}
              </span>
              <span class="font-medium">{{ amount.toFixed(2) }} 元</span>
            </div>
            <div class="flex items-center">
              <div class="w-full bg-gray-100 rounded-full h-2.5 mr-2">
                <div
                  class="bg-gradient-to-r from-amber-400 to-orange-400 h-2.5 rounded-full"
                  :style="{ width: `${(amount / totalExpense) * 100}%` }"
                ></div>
              </div>
              <span class="text-xs text-gray-400"
                >{{ ((amount / totalExpense) * 100).toFixed(1) }}%</span
              >
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- 每日趋势卡片 -->
    <ExpenseTrandCard :expenses="props.expenses"></ExpenseTrandCard>
  </div>
</template>
