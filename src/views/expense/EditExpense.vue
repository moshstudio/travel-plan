<script setup lang="ts">
import { reactive, onMounted, ref, watch, onActivated, toRaw } from "vue";
import { useStore } from "@/store";
import { showFailToast, showSuccessToast } from "vant";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { Icon } from "@iconify/vue";
import { TravelExpenseType } from "@/data/expense";
import { Datetime } from "vue-datetime3";

const store = useStore();
const route = useRoute();
const router = useRouter();
const { currentTravel } = storeToRefs(store);

const expenseId = ref<string>(route.params.expenseId as string);
const expense = ref<TravelExpenseType>();
const isLoading = ref(true);

const form = reactive({
  amount: 0,
  currency: "CNY" as "CNY" | "USD" | "EUR",
  description: "",
  dateTime: new Date().toISOString(),
  paymentMethod: "alipay" as
    | "cash"
    | "credit_card"
    | "alipay"
    | "wechat_pay"
    | "bank_transfer"
    | "other",
  tags: [] as string[],
  location: expense.value?.location,
});
const showDatetimePopup = ref(false);

// 常用金额快捷按钮
const quickAmounts = [1, 2, 5, 8, 10, 20, 50, 100];

const paymentMethods = [
  { text: "支付宝", value: "alipay" },
  { text: "微信支付", value: "wechat_pay" },
  { text: "现金", value: "cash" },
  { text: "信用卡", value: "credit_card" },
  { text: "银行转账", value: "bank_transfer" },
  { text: "其他", value: "other" },
];
const showPaymentPicker = ref(false);

// 加载花费数据
const loadExpenseData = async () => {
  expenseId.value = route.params.expenseId as string;
  if (!expenseId.value || !currentTravel.value) return;

  try {
    expense.value = await store.getTravelExpenseById(expenseId.value);

    if (expense.value) {
      form.amount = expense.value.amount;
      form.currency = expense.value.currency;
      form.description = expense.value.description || "";
      form.dateTime = new Date(expense.value.dateTime).toISOString();
      form.paymentMethod = expense.value.paymentMethod;
      form.tags = [...(expense.value.tags || [])];
      form.location = expense.value.location;
    }
  } catch (error) {
    showFailToast("加载花费数据失败");
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};

// 提交表单
const onSubmit = async () => {
  if (!form.amount) {
    showFailToast("请输入有效金额");
    return;
  }

  if (!currentTravel.value) {
    showFailToast("旅行数据不存在");
    router.push({ name: "Travel" });
    return;
  }
  if (!expense.value) {
    showFailToast("花费数据不存在");
    router.push({ name: "Travel" });
    return;
  }

  try {
    const now = new Date();
    const expenseData: TravelExpenseType = {
      id: expense.value.id,
      travelId: currentTravel.value.travelId,
      expenseId: expenseId.value,
      amount: Number(form.amount),
      currency: form.currency,
      description: form.description,
      dateTime: new Date(form.dateTime).getTime(),
      paymentMethod: form.paymentMethod,
      tags: toRaw(form.tags),
      isReimbursed: false,
      location: toRaw(form.location),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await store.updateTravelExpense(toRaw(expenseData));
    showSuccessToast("花费记录更新成功");
    back();
  } catch (error) {
    showFailToast("更新花费记录失败");
    console.error(error);
  }
};

const back = () => {
  router.back();
};

// 常用标签
const commonTags = ["餐饮", "交通", "住宿", "门票", "购物", "娱乐", "其他"];

onActivated(async () => {
  await loadExpenseData();
});
</script>

<template>
  <div class="w-screen h-screen flex flex-col bg-[var(--van-background)]">
    <van-nav-bar
      title="编辑花费记录"
      left-arrow
      @click-left="back"
    />

    <van-loading
      v-if="isLoading"
      class="flex-grow flex items-center justify-center"
    />

    <div
      v-else
      class="flex-grow w-full p-4 overflow-auto"
    >
      <!-- 金额输入区域 -->
      <van-cell-group
        inset
        class="mb-4"
      >
        <van-field
          v-model:model-value="form.amount"
          label="金额"
          type="number"
          placeholder="0.00"
          required
          clearable
          class="text-2xl font-bold"
        >
          <template #right-icon>
            <Icon
              icon="mingcute:currency-cny-2-fill"
              width="18"
              height="18"
            />
          </template>
        </van-field>

        <!-- 快捷金额按钮 -->
        <div class="p-2 flex flex-wrap gap-2">
          <van-button
            v-for="amount in quickAmounts"
            :key="amount"
            size="small"
            plain
            type="primary"
            @click="form.amount = amount"
          >
            {{ amount }}
          </van-button>
        </div>
      </van-cell-group>

      <!-- 支付方式和时间 -->
      <van-cell-group
        inset
        class="mb-4"
      >
        <van-cell
          center
          is-link
          title="支付方式"
          :value="
            paymentMethods.find((p) => p.value === form.paymentMethod)?.text
          "
          @click="showPaymentPicker = true"
        ></van-cell>
        <van-cell
          center
          is-link
          title="时间"
          @click="showDatetimePopup = !showDatetimePopup"
          class="datetime-cell"
        >
          <template #value>
            <div
              @click.stop
              class="flex items-center justify-end"
            >
              <Datetime
                v-model="form.dateTime"
                v-model:is-open="showDatetimePopup"
                type="datetime"
                class="max-w-[160px]"
              ></Datetime>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 分类标签 -->
      <van-cell-group
        inset
        class="mb-4"
      >
        <van-cell
          title="位置"
          :value="form.location?.name || '未设置位置'"
          clickable
          is-link
          @click="
            () =>
              router.push({ name: 'ExpensePosition', params: { expenseId } })
          "
        />
        <van-field
          v-model="form.description"
          label="描述"
          placeholder="可选：输入消费描述"
          clearable
        />

        <van-field
          name="tags"
          label="分类"
        >
          <template #input>
            <van-checkbox-group
              v-model="form.tags"
              direction="horizontal"
            >
              <van-checkbox
                v-for="tag in commonTags"
                :key="tag"
                :name="tag"
                shape="square"
                class="mr-2 mb-2"
              >
                {{ tag }}
              </van-checkbox>
            </van-checkbox-group>
          </template>
        </van-field>
      </van-cell-group>

      <!-- 提交按钮 -->
      <div class="mt-6 p-2">
        <van-button
          round
          block
          type="primary"
          size="large"
          @click="onSubmit"
          :disabled="!form.amount"
        >
          更新花费记录
        </van-button>
      </div>
    </div>
    <van-popup
      v-model:show="showPaymentPicker"
      position="bottom"
      round
    >
      <van-picker
        v-model:value="form.paymentMethod"
        :columns="paymentMethods"
        @confirm="
          (val) => {
            form.paymentMethod = val.selectedValues[0];
            showPaymentPicker = false;
          }
        "
        @cancel="showPaymentPicker = false"
      />
    </van-popup>
  </div>
</template>

<style scoped lang="less">
.van-field :deep(.van-field__control) {
  @apply text-right text-2xl;
}

.van-checkbox-group {
  @apply flex flex-wrap;
}

.van-checkbox {
  @apply mr-3 mb-2;
}
:deep(.van-cell__title) {
  flex: none;
}
</style>
