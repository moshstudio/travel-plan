<template>
  <div
    class="expense-item relative w-full bg-white rounded-xl shadow-sm p-4 mb-3 transition-all duration-300 border border-gray-100 active:scale-[0.98]"
    :class="{ 'bg-gray-50 opacity-80': item.isReimbursed }"
    @click="handleClickCard"
    @touchstart="startPress"
    @touchend="endPress"
    :style="{
      transform: `scale(${pressScale})`,
      'border-left': `4px solid ${amountColor}`,
    }"
  >
    <!-- 左侧主要内容和金额 -->
    <div class="item-main flex items-start">
      <div class="item-content flex-1">
        <!-- 金额和操作按钮 -->
        <div class="item-header flex justify-between items-center mb-1.5">
          <div class="amount-info flex items-baseline">
            <span class="currency text-sm font-medium text-gray-500 mr-1">
              {{ item.currency }}
            </span>
            <h3
              class="amount text-xl font-semibold text-gray-800"
              :class="{ 'line-through text-gray-500': item.isReimbursed }"
            >
              {{ item.amount }}
            </h3>
          </div>
          <van-button
            round
            size="mini"
            plain
            @click.stop="showActionSheet = true"
            class="action-button p-0 w-6 h-6 min-w-6 border border-gray-200 bg-white text-gray-500"
          >
            <van-icon
              name="ellipsis"
              size="14"
            />
          </van-button>
        </div>
        <div
          v-if="item.location"
          class="location-info flex items-center text-sm text-gray-500 mb-2.5"
        >
          <van-icon
            name="location-o"
            class="location-icon mr-1.5 text-gray-400"
          />
          <span class="location-text">{{ item.location.name }}</span>
        </div>

        <!-- 描述和日期 -->
        <div class="item-meta flex flex-col mb-1.5">
          <p
            v-if="item.description"
            class="description text-sm text-gray-700 mb-1"
          >
            {{ item.description }}
          </p>
          <div class="date-info flex items-center text-xs text-gray-500">
            <van-icon
              name="clock-o"
              size="12"
              class="mr-1"
            />
            <span>{{
              formatDateTime(item.dateTime.getTime(), "yyyy/MM/dd HH:mm")
            }}</span>
          </div>
        </div>

        <!-- 标签和支付方式 -->
        <div class="item-footer flex flex-wrap items-center">
          <van-tag
            v-if="item.paymentMethod"
            class="payment-tag mr-2 mb-1 text-xs rounded"
            plain
            type="primary"
            size="medium"
          >
            {{ formatPaymentMethod(item.paymentMethod) }}
          </van-tag>
          <van-tag
            v-for="tag in item.tags"
            :key="tag"
            class="expense-tag mr-2 mb-1 text-xs rounded"
            plain
            type="success"
            size="medium"
          >
            {{ tag }}
          </van-tag>
          <van-tag
            v-if="item.isReimbursed"
            class="reimbursed-tag mr-2 mb-1 text-xs rounded"
            plain
            type="success"
            size="medium"
          >
            已报销
          </van-tag>
        </div>
      </div>
    </div>
    <!-- 操作菜单 -->
    <van-action-sheet
      teleport="body"
      v-model:show="showActionSheet"
      :actions="actionSheetActions"
      :title="item.description || '旅行花费'"
      cancel-text="取消"
      close-on-click-action
      @select="onActionSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { TravelExpenseType } from "@/data/expense";
import router from "@/router";
import { useStore } from "@/store";
import { formatDateTime } from "@/utils/datetime";
import { format } from "date-fns";
import _ from "lodash";
import { showConfirmDialog } from "vant";
import { computed, ref } from "vue";

const props = defineProps<{
  item: TravelExpenseType;
}>();

const store = useStore();

// 根据金额大小显示不同颜色
const amountColor = computed(() => {
  if (props.item.amount > 1000) return "#ee0a24"; // 高金额红色
  if (props.item.amount > 500) return "#ff976a"; // 中金额橙色
  return "#1989fa"; // 低金额蓝色
});

// 操作菜单相关
const showActionSheet = ref(false);
const actionSheetActions = computed(() => {
  return _.reject(
    [
      { name: "编辑", value: "edit", color: "green", icon: "edit" },
      {
        name: "标记为已报销",
        value: "reimburse",
        color: "#07c160",
        icon: "passed",
      },
      {
        name: "标记为未报销",
        value: "unreimburse",
        color: "#1989fa",
        icon: "revoke",
      },
      { name: "删除", value: "delete", color: "red", icon: "delete" },
    ],
    (action) =>
      (action.value === "reimburse" && props.item.isReimbursed) ||
      (action.value === "unreimburse" && !props.item.isReimbursed)
  );
});

const onActionSelect = (action: { value: string }) => {
  switch (action.value) {
    case "edit":
      router.push({
        name: "ExpenseMap",
        query: { expenseId: props.item.expenseId },
      });
      break;
    case "delete":
      showConfirmDialog({
        title: "确定删除这笔花费吗？",
        message: "删除后无法恢复",
        confirmButtonText: "确定",
        cancelButtonText: "取消",
      }).then(() => {
        store.deleteTravelExpense(props.item);
      });
      break;
    case "reimburse":
      props.item.isReimbursed = true;
      // store.updateTravelExpense(props.item);
      break;
    case "unreimburse":
      props.item.isReimbursed = false;
      // store.updateTravelExpense(props.item);
      break;
  }
};

// 触摸反馈效果
const pressScale = ref(1);
const isPressing = ref(false);

const startPress = () => {
  isPressing.value = true;
  pressScale.value = 0.98;
};

const endPress = () => {
  isPressing.value = false;
  pressScale.value = 1;
};

const handleClickCard = () => {
  // 可以在这里添加点击卡片的处理逻辑
};

// 格式化日期
const formatDate = (timestamp: number) => {
  return format(new Date(timestamp), "yyyy/MM/dd HH:mm");
};

// 格式化支付方式
const formatPaymentMethod = (method: string) => {
  const methods: Record<string, string> = {
    cash: "现金",
    credit_card: "信用卡",
    alipay: "支付宝",
    wechat_pay: "微信支付",
    bank_transfer: "银行转账",
    other: "其他",
  };
  return methods[method] || method;
};
</script>

<style scoped>
.expense-item {
  transform-origin: center;
  will-change: transform;
}

/* 金额样式 */
.amount {
  font-family: "Arial", sans-serif;
}

/* 标签样式 */
.payment-tag {
  border-color: #1989fa;
  color: #1989fa;
}

.expense-tag {
  border-color: #07c160;
  color: #07c160;
}

.reimbursed-tag {
  border-color: #07c160;
  color: #07c160;
  background-color: rgba(7, 193, 96, 0.1);
}

/* 添加进入动画 */
.expense-item-enter-active,
.expense-item-leave-active {
  transition: all 0.3s ease;
}

.expense-item-enter-from,
.expense-item-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
