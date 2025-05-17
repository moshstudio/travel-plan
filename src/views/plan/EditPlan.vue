<script setup lang="ts">
import { ref, reactive, computed, watch, onActivated } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "@/store";
import { showToast } from "vant";
import { getAddressByCoordinate } from "@/api/tdt.ts";

const store = useStore();
const route = useRoute();
const router = useRouter();

const planId = computed(() => route.params.id as string);
const originalPlan = computed(() =>
  store.plans.find((plan) => plan.id === planId.value)
);

const form = reactive({
  name: "",
  startDate: ["", "", ""],
  startTime: ["", ""],
  endDate: ["", "", ""],
  endTime: ["", ""],
  notes: "",
});

const showStartPicker = ref(false);
const showEndPicker = ref(false);
const pickerStartDate = ref([...form.startDate]);
const pickerStartTime = ref([...form.startTime]);
const pickerEndDate = ref([...form.endDate]);
const pickerEndTime = ref([...form.endTime]);

const minDate = new Date();
const maxDate = new Date(new Date().setFullYear(new Date().getFullYear() + 10));

// Initialize or update form when planId changes
const updateForm = () => {
  if (!originalPlan.value) {
    showToast("未找到该旅行计划");
    router.back();
    return;
  }

  form.name = originalPlan.value.name || "";
  form.startDate = formatDateToArray(originalPlan.value.startTime);
  form.startTime = formatTimeToArray(originalPlan.value.startTime);
  form.endDate = formatDateToArray(originalPlan.value.endTime);
  form.endTime = formatTimeToArray(originalPlan.value.endTime);
  form.notes = originalPlan.value.description || "";

  if (originalPlan.value.location) {
    store.positionSelectAddress = originalPlan.value.location;
  }

  // Reset picker values
  pickerStartDate.value = [...form.startDate];
  pickerStartTime.value = [...form.startTime];
  pickerEndDate.value = [...form.endDate];
  pickerEndTime.value = [...form.endTime];
};

// Watch for planId changes
watch(planId, (newVal, oldVal) => {
  if (!newVal) return;
  console.log("planId changed", newVal, oldVal);

  if (newVal !== oldVal) {
    updateForm();
  }
});

// Handle component activation
onActivated(() => {
  console.log("planId changed2");
  updateForm();
});

function formatDateToArray(timestamp: number) {
  const date = new Date(timestamp);
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1),
    String(date.getDate()),
  ];
}

function formatTimeToArray(timestamp: number) {
  const date = new Date(timestamp);
  return [String(date.getHours()), String(date.getMinutes())];
}

function formatDateTime(dateArray: string[], timeArray: string[]) {
  const [year, month, day] = dateArray;
  const [hours, minutes] = timeArray;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(
    2,
    "0"
  )} ${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

function onConfirmStartDateTime() {
  form.startDate = [...pickerStartDate.value];
  form.startTime = [...pickerStartTime.value];
  showStartPicker.value = false;
  adjustEndDateTime();
}

function onConfirmEndDateTime() {
  form.endDate = [...pickerEndDate.value];
  form.endTime = [...pickerEndTime.value];
  showEndPicker.value = false;
  adjustStartDateTime();
}

function adjustEndDateTime() {
  const start = new Date(formatDateTime(form.startDate, form.startTime));
  const end = new Date(formatDateTime(form.endDate, form.endTime));

  if (start > end) {
    const newEnd = new Date(start);
    newEnd.setDate(start.getDate() + 1);
    form.endDate = formatDateToArray(newEnd.getTime());
    form.endTime = ["0", "0"];
    Object.assign(pickerEndDate.value, form.endDate);
    Object.assign(pickerEndTime.value, form.endTime);
  }
}

function adjustStartDateTime() {
  const start = new Date(formatDateTime(form.startDate, form.startTime));
  const end = new Date(formatDateTime(form.endDate, form.endTime));

  if (start > end) {
    form.startDate = formatDateToArray(end.getTime());
    form.startTime = ["0", "0"];
    Object.assign(pickerStartDate.value, form.startDate);
    Object.assign(pickerStartTime.value, form.startTime);
  }
}

function onSubmit() {
  if (!form.name || !store.positionSelectAddress) {
    showToast(form.name ? "请选择目的地" : "请填写必填信息");
    return;
  }

  const start = new Date(formatDateTime(form.startDate, form.startTime));
  const end = new Date(formatDateTime(form.endDate, form.endTime));

  if (start > end) {
    showToast("结束时间必须晚于开始时间");
    return;
  }

  if (!originalPlan.value) {
    showToast("旅行计划不存在");
    return;
  }

  const updatedPlan = {
    ...originalPlan.value,
    name: form.name,
    startTime: start.getTime(),
    endTime: end.getTime(),
    location: store.positionSelectAddress,
    description: form.notes,
    updatedAt: Date.now(),
  };

  store.updateTravelPlan(updatedPlan);
  showToast("计划更新成功");
  router.back();
}

if (!store.positionSelectAddress) {
  if (originalPlan.value?.location) {
    store.positionSelectAddress = originalPlan.value.location;
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const { longitude: lng, latitude: lat } = position.coords;
      getAddressByCoordinate(lng, lat, (address) => {
        store.positionSelectAddress = { address, lng, lat };
      });
    });
  }
}
</script>

<template>
  <div class="page-container">
    <van-nav-bar
      title="编辑旅行计划"
      left-arrow
      @click-left="router.back()"
    />

    <div class="content">
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
          <van-button
            size="small"
            @click="showStartPicker = true"
          >
            {{ formatDateTime(form.startDate, form.startTime) }}
          </van-button>
        </van-cell>

        <van-cell
          title="结束时间"
          center
        >
          <van-button
            size="small"
            @click="showEndPicker = true"
          >
            {{ formatDateTime(form.endDate, form.endTime) }}
          </van-button>
        </van-cell>

        <van-cell
          title="目的地"
          :value="store.positionSelectAddress?.address"
          clickable
          is-link
          @click="$router.push({ name: 'PositionSelect' })"
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

      <div class="submit-btn">
        <van-button
          round
          block
          type="primary"
          @click="onSubmit"
        >
          保存修改
        </van-button>
      </div>

      <van-popup
        v-model:show="showStartPicker"
        position="bottom"
        teleport="body"
      >
        <van-picker-group
          title="开始时间"
          :tabs="['选择日期', '选择时间']"
          @confirm="onConfirmStartDateTime"
          @cancel="showStartPicker = false"
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
        v-model:show="showEndPicker"
        position="bottom"
        teleport="body"
      >
        <van-picker-group
          title="结束时间"
          :tabs="['选择日期', '选择时间']"
          @confirm="onConfirmEndDateTime"
          @cancel="showEndPicker = false"
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

<style scoped>
.page-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--van-background);
}

.content {
  flex-grow: 1;
  width: 100%;
  height: 100%;
  padding: 16px; /* Replaced p-4 with actual value */
  overflow: auto;
}

.submit-btn {
  padding: 16px; /* Replaced p-4 with actual value */
}

:deep(.van-cell__title) {
  flex: none;
}
</style>
