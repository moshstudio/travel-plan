<script setup lang="ts">
import { ref, computed, reactive, toRaw, onMounted } from "vue";
import ExpenseItemCard from "@/components/travelPlan/ExpenseCard.vue";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import { PayMethod, TravelExpenseType } from "@/data/expense";
import { useDisplayStore } from "@/store/displayStore";
import { formatDateTime } from "@/utils/datetime";

const store = useStore();
const displayStore = useDisplayStore();
const { currentTravel, travelExpenses } = storeToRefs(store);
const { showExpenseCreatePopup, expenseGroupingMode: groupingMode } =
  storeToRefs(displayStore);

// Grouping options
const groupingOptions = [
  { value: "tag", name: "标签" },
  { value: "date", name: "日期" },
  { value: "currency", name: "货币" },
  { value: "payment", name: "支付方式" },
];
const showGroupMenu = ref(false);

// Group items by selected mode
const groupedExpenses = computed(() => {
  const items = travelExpenses.value || [];
  const grouped: Record<string, TravelExpenseType[]> = {};

  items.forEach((item) => {
    let groupKey = "";

    switch (groupingMode.value) {
      case "tag":
        groupKey = item.tags?.length ? item.tags[0] : "未分类";
        break;
      case "date":
        groupKey = formatDateTime(item.dateTime.getTime(), "yyyy/MM/dd HH:mm");
        break;
      case "currency":
        groupKey = item.currency || "未知货币";
        break;
      case "payment":
        groupKey = item.paymentMethod || "其他";
        break;
    }

    if (!grouped[groupKey]) {
      grouped[groupKey] = [];
    }
    grouped[groupKey].push(item);
  });

  // Sort groups based on mode
  const sortedGroups: Record<string, TravelExpenseType[]> = {};
  let groupKeys = Object.keys(grouped);

  switch (groupingMode.value) {
    case "date":
      groupKeys.sort((a, b) => {
        return (
          grouped[b][0].dateTime.getTime() - grouped[a][0].dateTime.getTime()
        );
      });
      break;
    case "currency":
      // 按常用货币顺序排序
      const currencyOrder = ["CNY", "USD", "EUR", "JPY", "GBP"];
      groupKeys.sort((a, b) => {
        const aIndex = currencyOrder.indexOf(a);
        const bIndex = currencyOrder.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      break;
    case "payment":
      // 按常用支付方式顺序排序
      const paymentOrder = [
        "alipay",
        "wechat_pay",
        "credit_card",
        "cash",
        "bank_transfer",
      ];
      groupKeys.sort((a, b) => {
        const aIndex = paymentOrder.indexOf(a);
        const bIndex = paymentOrder.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      break;
    case "tag":
    default:
      groupKeys.sort((a, b) => a.localeCompare(b));
  }

  // 重建排序后的分组对象
  groupKeys.forEach((key) => {
    sortedGroups[key] = grouped[key];
  });

  return sortedGroups;
});

// Calculate total amount for each group
const groupTotals = computed(() => {
  const totals: Record<string, { amount: number; currency: string }> = {};
  Object.keys(groupedExpenses.value).forEach((key) => {
    const group = groupedExpenses.value[key];
    if (groupingMode.value === "currency") {
      // 货币分组时，每组只有一种货币
      totals[key] = {
        amount: group.reduce((sum, item) => sum + item.amount, 0),
        currency: key,
      };
    } else {
      // 其他分组时，按货币分别计算
      const currencyGroups: Record<string, number> = {};
      group.forEach((item) => {
        if (!currencyGroups[item.currency]) {
          currencyGroups[item.currency] = 0;
        }
        currencyGroups[item.currency] += item.amount;
      });
      // 将多货币结果格式化为字符串
      totals[key] = {
        amount: Object.values(currencyGroups).reduce((a, b) => a + b, 0),
        currency: Object.entries(currencyGroups)
          .map(([curr, amount]) => `${Number(amount).toFixed(2)} ${curr}`)
          .join(" + "),
      };
    }
  });
  return totals;
});

// 计算总花费（按货币分组）
const totalExpenses = computed(() => {
  const totals: Record<string, number> = {};
  (travelExpenses.value || []).forEach((item) => {
    if (!totals[item.currency]) {
      totals[item.currency] = 0;
    }
    totals[item.currency] += item.amount;
  });
  return totals;
});

// 计算已报销金额（按货币分组）
const reimbursedExpenses = computed(() => {
  const totals: Record<string, number> = {};
  (travelExpenses.value || [])
    .filter((item) => item.isReimbursed)
    .forEach((item) => {
      if (!totals[item.currency]) {
        totals[item.currency] = 0;
      }
      totals[item.currency] += item.amount;
    });
  return totals;
});

// Get all categories with proper display names
const categories = computed(() => {
  return Object.keys(groupedExpenses.value).map((key) => {
    if (groupingMode.value === "payment") {
      return {
        key,
        display:
          key === "cash"
            ? "现金"
            : key === "credit_card"
            ? "信用卡"
            : key === "alipay"
            ? "支付宝"
            : key === "wechat_pay"
            ? "微信支付"
            : key === "bank_transfer"
            ? "银行转账"
            : "其他支付",
        icon:
          key === "cash"
            ? "cash-o"
            : key === "credit_card"
            ? "credit-pay"
            : key === "alipay"
            ? "alipay"
            : key === "wechat_pay"
            ? "wechat"
            : key === "bank_transfer"
            ? "balance-o"
            : "more-o",
      };
    } else if (groupingMode.value === "currency") {
      return {
        key,
        display:
          key === "CNY"
            ? "人民币"
            : key === "USD"
            ? "美元"
            : key === "EUR"
            ? "欧元"
            : key === "JPY"
            ? "日元"
            : key === "GBP"
            ? "英镑"
            : key,
        icon: "gold-coin-o",
      };
    }
    return {
      key,
      display: key,
      icon: groupingMode.value === "date" ? "calendar-o" : "label-o",
    };
  });
});
</script>

<template>
  <div
    v-remember-scroll
    class="w-full h-full p-0 flex flex-col overflow-auto thin-scrollbar"
  >
    <!-- Grouping control -->
    <div class="grouping-control">
      <van-button
        plain
        hairline
        type="primary"
        size="small"
        @click="showGroupMenu = true"
      >
        <template #icon>
          <van-icon name="apps-o" />
        </template>
        {{ groupingOptions.find((o) => o.value === groupingMode)?.name }}
      </van-button>

      <van-action-sheet
        teleport="body"
        v-model:show="showGroupMenu"
        :actions="groupingOptions"
        cancel-text="取消"
        close-on-click-action
        @select="
          (action) => {
            groupingMode = action.value;
          }
        "
      />
    </div>

    <van-list class="travel-expense-list thin-scrollbar">
      <div
        v-if="categories.length === 0"
        class="empty-state"
      >
        <img
          src="@/assets/images/empty-expense.png"
          alt="空状态"
          class="empty-image"
        />
        <p class="empty-text">暂无花费记录</p>
        <p class="empty-hint">点击下方按钮添加您的旅行花费</p>
      </div>

      <transition-group
        v-else
        name="fade-slide-y"
        tag="div"
        class="categories-container"
      >
        <!-- Summary cards -->
        <div
          class="summary-cards"
          v-if="travelExpenses && travelExpenses.length > 0"
        >
          <van-row gutter="8">
            <van-col span="12">
              <div class="summary-card total">
                <div class="summary-title">总花费</div>
                <div class="summary-amount">
                  <template v-if="Object.keys(totalExpenses).length > 1">
                    <div
                      v-for="(amount, currency) in totalExpenses"
                      :key="currency"
                    >
                      {{ Number(amount).toFixed(2) }} {{ currency }}
                    </div>
                  </template>
                  <template v-else>
                    {{ Object.values(totalExpenses)[0] || "0.00" }}
                    {{ Object.keys(totalExpenses)[0] || "CNY" }}
                  </template>
                </div>
              </div>
            </van-col>
            <van-col span="12">
              <div class="summary-card reimbursed">
                <div class="summary-title">已报销</div>
                <div class="summary-amount">
                  <template v-if="Object.keys(reimbursedExpenses).length > 1">
                    <div
                      v-for="(amount, currency) in reimbursedExpenses"
                      :key="currency"
                    >
                      {{ Number(amount).toFixed(2) }} {{ currency }}
                    </div>
                  </template>
                  <template v-else>
                    {{
                      Object.values(reimbursedExpenses)[0]?.toFixed(2) || "0.00"
                    }}
                    {{ Object.keys(reimbursedExpenses)[0] || "CNY" }}
                  </template>
                </div>
              </div>
            </van-col>
          </van-row>
        </div>
        <div
          v-for="{ key, display, icon } in categories"
          :key="key"
          class="category-section"
        >
          <div class="section-header">
            <van-icon
              :name="icon"
              class="category-icon"
            />
            <span class="category-title">{{ display }}</span>
            <span class="category-count">
              {{ groupedExpenses[key].length }}项
            </span>
            <span class="category-total">
              {{ groupTotals[key].currency }}
            </span>
          </div>

          <transition-group
            name="list"
            tag="div"
            class="item-container"
          >
            <ExpenseItemCard
              v-for="item in groupedExpenses[key]"
              :key="item.expenseId"
              :item="item"
              :class="{ 'reimbursed-item': item.isReimbursed }"
            />
          </transition-group>
        </div>
      </transition-group>
      <div class="shrink-0 h-[220px]"></div>
    </van-list>
  </div>
</template>

<style scoped>
/* 保持原有的样式不变 */

.grouping-control {
  padding: 12px 16px;
  display: flex;
  justify-content: flex-end;
}

.summary-cards {
  padding: 0 16px 12px;
}

.summary-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  height: 100%;
  transition: all 0.2s ease;
}
.summary-card:active {
  transform: scale(0.98);
}

.summary-card.total {
  border-left: 4px solid var(--van-primary-color);
}

.summary-card.reimbursed {
  border-left: 4px solid var(--van-success-color);
}

.summary-title {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.summary-amount {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
}

.summary-amount div {
  font-size: 14px;
}

.travel-expense-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;
}

.category-section {
  background-color: white;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 500;
  color: #333;
  border-bottom: 1px solid #f5f5f5;
  position: relative;
}

.category-icon {
  margin-right: 8px;
  color: var(--van-primary-color);
}

.category-title {
  flex: 1;
}

.category-count {
  font-size: 12px;
  color: #999;
  margin-right: 8px;
}

.category-total {
  font-size: 14px;
  font-weight: bold;
  color: var(--van-primary-color);
}

.item-container {
  padding: 8px 12px;
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
  animation: fadeIn 0.5s ease-out;
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

.reimbursed-item {
  opacity: 0.7;
  background-color: #f8f8f8;
}

/* 统一动画效果 */
.fade-slide-y-enter-active,
.fade-slide-y-leave-active {
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.fade-slide-y-enter-from,
.fade-slide-y-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-leave-active {
  position: absolute;
  width: calc(100% - 24px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
