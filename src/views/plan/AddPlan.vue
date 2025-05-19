<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { useStore } from "@/store";
import { showFailToast, showSuccessToast } from "vant";
import { getCurrentLngLat, getLngLatAddress } from "@/api/tdt.ts";
import router from "@/router";
import { storeToRefs } from "pinia";
import { TravelPlanType } from "@/data/TravelPlan";
import PrioritySelector from "@/components/PrioritySelector.vue";

const store = useStore();
const { currentTravel } = storeToRefs(store);
const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(now.getDate() + 1);
const nextDay = tomorrow;

// 表单数据
const form = reactive({
  name: "",
  startDate: [
    String(now.getFullYear()),
    String(now.getMonth() + 1),
    String(now.getDate()),
  ],
  startTime: ["00", "00"],
  endDate: [
    String(nextDay.getFullYear()),
    String(nextDay.getMonth() + 1),
    String(nextDay.getDate()),
  ],
  endTime: ["00", "00"],
  notes: "",
  priority: "medium" as "low" | "medium" | "high",
});

// 日期时间选择器相关状态

const showStartDateTimePicker = ref(false);
const pickerStartDate = ref([...form.startDate]);
const pickerStartTime = ref([...form.startTime]);
const showEndDateTimePicker = ref(false);
const pickerEndDate = ref([...form.endDate]);
const pickerEndTime = ref([...form.endTime]);
const onConfirmStartDateTime = () => {
  form.startDate = [...pickerStartDate.value];
  form.startTime = [...pickerStartTime.value];
  showStartDateTimePicker.value = false;
  const startDateTime = new Date(
    `${formatDate(new Date(form.startDate.join("-")))} ${formatTime(
      Number(form.startTime[0]),
      Number(form.startTime[1])
    )}`
  );
  const endDateTime = new Date(
    `${formatDate(new Date(form.endDate.join("-")))} ${formatTime(
      Number(form.endTime[0]),
      Number(form.endTime[1])
    )}`
  );
  if (startDateTime > endDateTime) {
    const e = new Date(startDateTime);
    e.setDate(startDateTime.getDate() + 1);
    form.endDate = [
      String(e.getFullYear()),
      String(e.getMonth() + 1),
      String(e.getDate()),
    ];
    form.endTime = [String(e.getHours()), String(e.getMinutes())];
    pickerEndDate.value = [...form.endDate];
    pickerEndTime.value = [...form.endTime];
  }
};
const onConfirmEndDateTime = () => {
  form.endDate = [...pickerEndDate.value];
  form.endTime = [...pickerEndTime.value];
  showEndDateTimePicker.value = false;
  const startDateTime = new Date(
    `${formatDate(new Date(form.startDate.join("-")))} ${formatTime(
      Number(form.startTime[0]),
      Number(form.startTime[1])
    )}`
  );
  const endDateTime = new Date(
    `${formatDate(new Date(form.endDate.join("-")))} ${formatTime(
      Number(form.endTime[0]),
      Number(form.endTime[1])
    )}`
  );
  if (startDateTime > endDateTime) {
    form.startDate = [
      String(endDateTime.getFullYear()),
      String(endDateTime.getMonth() + 1),
      String(endDateTime.getDate()),
    ];
    form.startTime = [String(0), String(0)];
    pickerStartDate.value = [...form.startDate];
    pickerStartTime.value = [...form.startTime];
  }
};

const minDate = new Date();
const maxDate = new Date(new Date().setFullYear(new Date().getFullYear() + 10));

// 格式化日期
const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// 格式化时间
const formatTime = (hours: number, minutes: number) => {
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};

// 提交表单
const onSubmit = () => {
  if (
    !form.name ||
    !form.startDate ||
    !form.startTime ||
    !form.endDate ||
    !form.endTime
  ) {
    showFailToast("请填写必填信息");
    return;
  }
  if (!store.positionSelectAddress) {
    showFailToast("请选择目的地");
    return;
  }

  const startDateTime = new Date(
    `${formatDate(new Date(form.startDate.join("-")))} ${formatTime(
      Number(form.startTime[0]),
      Number(form.startTime[1])
    )}`
  );
  const endDateTime = new Date(
    `${formatDate(new Date(form.endDate.join("-")))} ${formatTime(
      Number(form.endTime[0]),
      Number(form.endTime[1])
    )}`
  );

  if (startDateTime > endDateTime) {
    showFailToast("结束时间必须晚于开始时间");
    return;
  }
  if (!currentTravel.value) {
    showFailToast("请先创建旅行");
    return;
  }

  // 这里可以调用store的action来保存计划
  const planData: Omit<TravelPlanType, "id" | "travelPlanId"> = {
    travelId: currentTravel.value.travelId,
    title: form.name,
    description: form.notes,
    startDateTime: startDateTime.getTime(),
    endDateTime: endDateTime.getTime(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    status: "planned",
    priority: "medium",
    version: 1,
    location: store.positionSelectAddress,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  store.addTravelPlan(planData);
  showSuccessToast("计划创建成功");
  back();
};

const back = () => {
  router.push({ name: "Plan" });
};

onMounted(async () => {
  if (!store.positionSelectAddress) {
    const lonlat = await getCurrentLngLat();
    if (lonlat) {
      const address = await getLngLatAddress(lonlat);
      store.positionSelectAddress = {
        name: address,
        coordinates: {
          lng: lonlat.lng,
          lat: lonlat.lat,
        },
      };
    }
  }
});
</script>

<template>
  <div
    class="w-screen h-screen flex flex-col overflow-hidden bg-[var(--van-background)]"
  >
    <van-nav-bar
      title="添加旅行计划"
      left-arrow
      @click-left="back"
    />

    <div class="flex-grow w-full h-full p-2 overflow-auto">
      <van-cell-group inset>
        <van-field
          v-model="form.name"
          label="计划名称"
          placeholder="请输入计划名称"
          clearable
          required
        />
        <van-cell
          title="开始时间"
          center
        >
          <template #value>
            <van-button
              size="small"
              @click="showStartDateTimePicker = true"
            >
              <span class="text-nowrap text-sm">
                {{
                  `${formatDate(
                    new Date(form.startDate.join("-"))
                  )} ${formatTime(
                    Number(form.startTime[0]),
                    Number(form.startTime[1])
                  )}`
                }}
              </span>
            </van-button>
          </template>
        </van-cell>
        <van-cell
          title="结束时间"
          center
        >
          <template #value>
            <van-button
              size="small"
              @click="showEndDateTimePicker = true"
            >
              <span class="text-nowrap text-sm">
                {{
                  `${formatDate(new Date(form.endDate.join("-")))} ${formatTime(
                    Number(form.endTime[0]),
                    Number(form.endTime[1])
                  )}`
                }}
              </span>
            </van-button>
          </template>
        </van-cell>
        <PrioritySelector v-model="form.priority" />
        <van-cell
          title="目的地"
          :value="store.positionSelectAddress?.name || ''"
          clickable
          is-link
          @click="() => $router.push({ name: 'PositionSelect' })"
        />
        <van-field
          v-model="form.notes"
          rows="3"
          autosize
          label="备注"
          type="textarea"
          placeholder="请输入备注信息"
          show-word-limit
          maxlength="200"
        />
      </van-cell-group>

      <!-- 提交按钮 -->
      <div class="p-4">
        <van-button
          round
          block
          type="primary"
          class="bg-blue-500"
          @click="onSubmit"
        >
          创建计划
        </van-button>
      </div>

      <!-- 开始日期选择器 -->
      <van-popup
        v-model:show="showStartDateTimePicker"
        teleport="body"
        position="bottom"
      >
        <van-picker-group
          title="开始时间"
          :tabs="['选择日期', '选择时间']"
          @confirm="onConfirmStartDateTime"
          @cancel="showStartDateTimePicker = false"
        >
          <van-date-picker
            v-model="pickerStartDate"
            :min-date="minDate"
            :max-date="maxDate"
          />
          <van-time-picker v-model="pickerStartTime" />
        </van-picker-group>
      </van-popup>

      <van-popup
        v-model:show="showEndDateTimePicker"
        teleport="body"
        position="bottom"
      >
        <van-picker-group
          title="结束时间"
          :tabs="['选择日期', '选择时间']"
          @confirm="onConfirmEndDateTime"
          @cancel="showEndDateTimePicker = false"
        >
          <van-date-picker
            v-model="pickerEndDate"
            :min-date="minDate"
            :max-date="maxDate"
          />
          <van-time-picker v-model="pickerEndTime" />
        </van-picker-group>
      </van-popup>
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.van-cell__title) {
  flex: none;
}
:deep(.van-dropdown-menu__bar) {
  box-shadow: none;
}
:deep(.van-dropdown-item__content) {
  max-height: 200px;
}
</style>
